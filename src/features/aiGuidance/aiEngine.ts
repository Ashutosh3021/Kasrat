/**
 * Feature 13: Artificial Intelligence Guidance — Rule-Based Engine
 *
 * Generates exercise substitutions, load adjustments, and volume change
 * suggestions based on recent performance trends. Fully rule-based (no
 * external API required) — deterministic and offline-capable.
 */

import { db, type GymSet } from '../../db/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuggestionType = 'substitution' | 'load_adjustment' | 'volume_change'

export interface AISuggestion {
  id: string
  type: SuggestionType
  exerciseName: string
  message: string
  /** Specific action to apply, e.g. { loadDelta: 0.05 } */
  action: Record<string, unknown>
  /** Optional alternative exercise name */
  alternativeExercise?: string
  createdAt: string
}

// ─── Exercise Substitution Map ────────────────────────────────────────────────

/** Maps primary exercises to suitable alternatives */
const SUBSTITUTION_MAP: Record<string, string[]> = {
  'Flat bench press (Barbell)': ['Flat bench press (Dumbbell)', 'Push-ups', 'Machine pec deck'],
  'Incline bench press (Barbell)': ['Incline bench press (Dumbbell)', 'Incline bench press (Smith machine)', 'Cable fly'],
  'Overhead press (Barbell)': ['Overhead press (Dumbbell)', 'Lateral raise (Machine)'],
  'Barbell row': ['Chest supported row (machine)', 'Lat pull downs', 'Meadows row'],
  'Pull-ups': ['Lat pull downs', 'Dumbbell pullover'],
  'Squat (Regular)': ['Hack squat', 'Leg extensions', 'Bulgarian split squat'],
  'Conventional deadlift': ['Romanian deadlift', 'Good morning', '45-degree back extension'],
  'Barbell curl': ['Dumbbell curl', 'EZ bar curl', 'Cable push down'],
  'Skull crusher': ['Dumbbell overhead extension', 'Cable overhead extension'],
}

// ─── Recent Performance Analysis ─────────────────────────────────────────────

interface PerformanceTrend {
  exerciseName: string
  sessions: Array<{ date: string; maxWeight: number; avgRpe: number | null }>
  consecutiveSameWeight: number
  avgRpe: number | null
}

async function getPerformanceTrend(
  exerciseName: string,
  lookback = 5,
): Promise<PerformanceTrend | null> {
  const sets: GymSet[] = await db.gym_sets
    .where('name')
    .equals(exerciseName)
    .toArray()

  if (sets.length === 0) return null

  // Group by day, get max weight per session
  const byDay = new Map<string, GymSet[]>()
  for (const s of sets) {
    if (s.isWarmup || s.hidden) continue
    const day = s.created.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(s)
  }

  const sessions = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-lookback)
    .map(([date, daySets]) => {
      const maxWeight = Math.max(...daySets.map(s => s.weight))
      const rpeSets = daySets.filter(s => s.rpe != null)
      const avgRpe =
        rpeSets.length > 0
          ? rpeSets.reduce((a, s) => a + (s.rpe ?? 0), 0) / rpeSets.length
          : null
      return { date, maxWeight, avgRpe }
    })

  if (sessions.length < 2) {
    return { exerciseName, sessions, consecutiveSameWeight: 0, avgRpe: null }
  }

  // Count consecutive sessions at same top weight
  const last = sessions[sessions.length - 1].maxWeight
  let consecutive = 1
  for (let i = sessions.length - 2; i >= 0; i--) {
    if (sessions[i].maxWeight >= last) consecutive++
    else break
  }

  const allRpe = sessions.filter(s => s.avgRpe !== null)
  const avgRpe =
    allRpe.length > 0
      ? allRpe.reduce((a, s) => a + (s.avgRpe ?? 0), 0) / allRpe.length
      : null

  return { exerciseName, sessions, consecutiveSameWeight: consecutive, avgRpe }
}

// ─── Suggestion Generators ────────────────────────────────────────────────────

function makeId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Checks a single exercise for load adjustment opportunities.
 */
async function checkLoadAdjustment(
  exerciseName: string,
): Promise<AISuggestion | null> {
  const trend = await getPerformanceTrend(exerciseName)
  if (!trend) return null

  // RPE too high for 3+ sessions → deload suggestion
  if (
    trend.avgRpe !== null &&
    trend.avgRpe > 8 &&
    trend.consecutiveSameWeight >= 3
  ) {
    return {
      id: makeId(),
      type: 'load_adjustment',
      exerciseName,
      message: `${exerciseName}: RPE has averaged ${trend.avgRpe.toFixed(1)} over ${trend.consecutiveSameWeight} sessions. Consider reducing load by 5%.`,
      action: { loadDelta: -0.05 },
      createdAt: new Date().toISOString(),
    }
  }

  // Low RPE (< 7) for 5+ sessions → increase load
  if (
    trend.avgRpe !== null &&
    trend.avgRpe < 7 &&
    trend.consecutiveSameWeight >= 5
  ) {
    return {
      id: makeId(),
      type: 'load_adjustment',
      exerciseName,
      message: `${exerciseName}: RPE has been easy (avg ${trend.avgRpe.toFixed(1)}) for ${trend.consecutiveSameWeight} sessions. Try adding 5% load.`,
      action: { loadDelta: 0.05 },
      createdAt: new Date().toISOString(),
    }
  }

  return null
}

/**
 * Suggests a substitution when the exercise has not been performed recently
 * (potential equipment issue) or user explicitly requests an alternative.
 */
export function suggestSubstitution(exerciseName: string): AISuggestion | null {
  const alternatives = SUBSTITUTION_MAP[exerciseName]
  if (!alternatives || alternatives.length === 0) return null

  const alt = alternatives[0]
  return {
    id: makeId(),
    type: 'substitution',
    exerciseName,
    message: `Can't do ${exerciseName}? Try ${alt} as a substitute.`,
    action: { substitute: alt },
    alternativeExercise: alt,
    createdAt: new Date().toISOString(),
  }
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Generates up to `limit` AI suggestions across all recently used exercises.
 */
export async function generateAISuggestions(limit = 3): Promise<AISuggestion[]> {
  // Find most recently used exercises
  const recent = await db.gym_sets
    .orderBy('created')
    .reverse()
    .limit(50)
    .toArray()

  const recentExercises = Array.from(new Set(recent.map(s => s.name))).slice(0, 8)

  const suggestions: AISuggestion[] = []

  for (const name of recentExercises) {
    if (suggestions.length >= limit) break
    const s = await checkLoadAdjustment(name)
    if (s) suggestions.push(s)
  }

  return suggestions
}
