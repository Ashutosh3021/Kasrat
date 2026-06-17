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

// ─── Volume Change Suggestions (no RPE required) ─────────────────────────────

/**
 * Suggests adding sets if an exercise has been performed consistently
 * but set count hasn't grown in a while. Works without any RPE data.
 */
async function checkVolumeChange(exerciseName: string): Promise<AISuggestion | null> {
  const sets: GymSet[] = await db.gym_sets
    .where('name')
    .equals(exerciseName)
    .toArray()

  if (sets.length < 6) return null

  // Group by day, count sets per session
  const byDay = new Map<string, number>()
  for (const s of sets) {
    if (s.isWarmup || s.hidden) continue
    const day = s.created.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  const sessions = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)

  if (sessions.length < 4) return null

  const avgSets = sessions.reduce((a, [, c]) => a + c, 0) / sessions.length

  // If consistently hitting ≥3 sets per session for 4+ sessions, suggest progressive overload
  if (avgSets >= 3 && sessions.length >= 4) {
    const last3 = sessions.slice(-3)
    const stable = last3.every(([, c]) => c >= 3)
    if (stable) {
      return {
        id: makeId(),
        type: 'volume_change',
        exerciseName,
        message: `${exerciseName}: You've been consistently logging ${Math.round(avgSets)} sets/session for ${sessions.length} sessions. Consider adding a progressive overload set.`,
        action: { addSet: 1 },
        createdAt: new Date().toISOString(),
      }
    }
  }

  return null
}

/**
 * Suggests a substitution based on exercise frequency drop-off (may indicate
 * equipment unavailability or stagnation).
 */
async function checkFrequencyDropSub(exerciseName: string): Promise<AISuggestion | null> {
  const alternatives = SUBSTITUTION_MAP[exerciseName]
  if (!alternatives || alternatives.length === 0) return null

  const sets: GymSet[] = await db.gym_sets
    .where('name')
    .equals(exerciseName)
    .toArray()

  if (sets.length < 4) return null

  // Group by day
  const byDay = new Map<string, number>()
  for (const s of sets) {
    if (s.hidden) continue
    const day = s.created.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }

  const sessions = Array.from(byDay.keys()).sort()
  if (sessions.length < 4) return null

  // Check if frequency dropped in second half vs first half
  const mid = Math.floor(sessions.length / 2)
  const firstHalf = sessions.slice(0, mid).length
  const secondHalf = sessions.slice(mid).length

  // If sessions dropped by more than 50% in second half, suggest variety
  if (secondHalf < firstHalf * 0.5) {
    const alt = alternatives[0]
    return {
      id: makeId(),
      type: 'substitution',
      exerciseName,
      message: `${exerciseName}: Training frequency dropped recently. Try ${alt} for a fresh stimulus.`,
      action: { substitute: alt },
      alternativeExercise: alt,
      createdAt: new Date().toISOString(),
    }
  }

  return null
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Generates up to `limit` AI suggestions across all recently used exercises.
 * Works without RPE data — uses set count trends and frequency analysis.
 */
export async function generateAISuggestions(limit = 3): Promise<AISuggestion[]> {
  // Find most recently used exercises
  const recent = await db.gym_sets
    .orderBy('created')
    .reverse()
    .limit(100)
    .toArray()

  const recentExercises = Array.from(new Set(recent.map(s => s.name))).slice(0, 10)

  const suggestions: AISuggestion[] = []

  // Priority 1: RPE-based load adjustments (if RPE data exists)
  for (const name of recentExercises) {
    if (suggestions.length >= limit) break
    const s = await checkLoadAdjustment(name)
    if (s) suggestions.push(s)
  }

  // Priority 2: Volume progression suggestions (no RPE needed)
  for (const name of recentExercises) {
    if (suggestions.length >= limit) break
    const already = suggestions.some(s => s.exerciseName === name)
    if (already) continue
    const s = await checkVolumeChange(name)
    if (s) suggestions.push(s)
  }

  // Priority 3: Frequency drop → substitution suggestions
  for (const name of recentExercises) {
    if (suggestions.length >= limit) break
    const already = suggestions.some(s => s.exerciseName === name)
    if (already) continue
    const s = await checkFrequencyDropSub(name)
    if (s) suggestions.push(s)
  }

  // Priority 4: Generic substitution for well-known exercises with no recent variety
  if (suggestions.length < limit) {
    for (const name of recentExercises) {
      if (suggestions.length >= limit) break
      const already = suggestions.some(s => s.exerciseName === name)
      if (already) continue
      if (SUBSTITUTION_MAP[name]) {
        const sub = suggestSubstitution(name)
        if (sub) suggestions.push(sub)
      }
    }
  }

  return suggestions
}
