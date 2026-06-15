/**
 * Feature 2: Adaptive Program Adjustments — Engine
 *
 * Analyses recent set history and returns adjustment recommendations.
 * Pure functions — no React, no Zustand — so they can run anywhere.
 */

import { db, type GymSet } from '../../db/database'

export type AdjustmentType = 'increase_load' | 'decrease_volume' | 'deload' | 'none'

export interface AdjustmentRecommendation {
  type: AdjustmentType
  reason: string
  /** Suggested load change as a fraction: 0.05 = +5%, -0.10 = -10% */
  loadDelta: number
  /** Suggested set count change: -1, 0, +1 etc. */
  setsDelta: number
}

export interface AdherenceResult {
  completedSessions: number
  scheduledSessions: number
  score: number  // 0–100
}

// ─── Plateau Detection ────────────────────────────────────────────────────────

/**
 * Simple linear regression slope on an array of numbers.
 * Returns the slope coefficient (Δy per step).
 */
function linearSlope(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const sumX = (n * (n - 1)) / 2
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

/**
 * Returns true when the last `windowSize` sessions show near-zero
 * load progression (slope < 0.05 kg per session).
 */
export function detectPlateau(
  volumePerSession: number[],
  windowSize = 4,
): boolean {
  if (volumePerSession.length < windowSize) return false
  const window = volumePerSession.slice(-windowSize)
  const slope = linearSlope(window)
  return slope < 0.05
}

// ─── Adherence Calculation ────────────────────────────────────────────────────

/**
 * Calculates adherence for the past `lookbackDays` days by counting
 * distinct days with at least one non-warmup set.
 */
export async function calculateAdherence(
  scheduledDaysPerWeek: number,
  lookbackDays = 14,
): Promise<AdherenceResult> {
  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)
  const sinceIso = since.toISOString()

  const sets: GymSet[] = await db.gym_sets
    .where('created')
    .aboveOrEqual(sinceIso)
    .toArray()

  const activeDays = new Set(
    sets.filter(s => !s.isWarmup).map(s => s.created.slice(0, 10)),
  ).size

  const scheduledSessions = Math.round(
    (scheduledDaysPerWeek / 7) * lookbackDays,
  )
  const score =
    scheduledSessions > 0
      ? Math.min(100, Math.round((activeDays / scheduledSessions) * 100))
      : 0

  return { completedSessions: activeDays, scheduledSessions, score }
}

// ─── Volume Trend ─────────────────────────────────────────────────────────────

/**
 * Returns an array of total session volumes (weight × reps) for the last
 * `maxSessions` distinct workout days, newest last.
 */
export async function getSessionVolumeHistory(
  maxSessions = 8,
): Promise<number[]> {
  const sets: GymSet[] = await db.gym_sets.orderBy('created').toArray()

  const byDay = new Map<string, number>()
  for (const s of sets) {
    if (s.isWarmup || s.hidden) continue
    const day = s.created.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + s.weight * s.reps)
  }

  return Array.from(byDay.values()).slice(-maxSessions)
}

// ─── Main Recommendation ──────────────────────────────────────────────────────

/**
 * Given recent data, returns a single highest-priority recommendation.
 * Requires at least 6 sessions worth of data before yielding any result.
 */
export async function getAdjustmentRecommendation(
  scheduledDaysPerWeek: number,
  totalSessionsLogged: number,
): Promise<AdjustmentRecommendation> {
  const noAction: AdjustmentRecommendation = {
    type: 'none',
    reason: 'No adjustment needed.',
    loadDelta: 0,
    setsDelta: 0,
  }

  // Require minimum data
  if (totalSessionsLogged < 6) {
    return { ...noAction, reason: 'Keep logging — need 6 sessions for analysis.' }
  }

  const [adherence, volumes] = await Promise.all([
    calculateAdherence(scheduledDaysPerWeek),
    getSessionVolumeHistory(),
  ])

  // Deload every 4th week approximation: check if volume dropped naturally
  if (adherence.score < 70) {
    return {
      type: 'decrease_volume',
      reason: `Adherence is ${adherence.score}% — reducing volume by 10% to ease recovery.`,
      loadDelta: 0,
      setsDelta: -1,
    }
  }

  if (detectPlateau(volumes)) {
    return {
      type: 'increase_load',
      reason: 'Volume plateau detected over last 4 sessions — adding 5% load.',
      loadDelta: 0.05,
      setsDelta: 0,
    }
  }

  return noAction
}
