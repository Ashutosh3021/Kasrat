/**
 * Feature 8 & 15: Progress Visualization + Per-Session Volume Tracking
 *
 * Pure functions that compute per-session and per-routine volumes
 * from raw gym_sets data. Zero schema changes — uses existing tables.
 */

import { db, type GymSet } from '../../db/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionVolumePoint {
  date: string           // YYYY-MM-DD
  sessionKey: string     // '<planId|quick>_<date>'
  routineName: string    // Plan title or 'Quick Workout'
  totalVolume: number    // Σ(weight × reps), warmups excluded
  setCount: number
  planId: number | null
}

export interface RoutineVolumeSeries {
  routineName: string
  color: string
  points: Array<{ date: string; volume: number }>
}

export interface PersonalBestPoint {
  date: string
  exerciseName: string
  estimated1RM: number
  weight: number
  reps: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROUTINE_COLORS = [
  '#93032E', '#0A84FF', '#30D158', '#FF9F0A',
  '#BF5AF2', '#FF375F', '#5AC8FA', '#FFD60A',
]

function colorForRoutine(name: string, index: number): string {
  // Stable color per routine name using simple hash
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return ROUTINE_COLORS[Math.abs(hash + index) % ROUTINE_COLORS.length]
}

/** Brzycki 1RM estimate */
function quick1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return Math.round((weight * 36 / (37 - Math.min(reps, 36))) * 2) / 2
}

// ─── Core Computation ─────────────────────────────────────────────────────────

/**
 * Builds a flat list of session volume points from all sets.
 * One point per (planId, date) combination.
 */
export async function computeSessionVolumes(): Promise<SessionVolumePoint[]> {
  const [sets, plans] = await Promise.all([
    db.gym_sets.orderBy('created').toArray(),
    db.plans.toArray(),
  ])

  const planTitles = new Map<number, string>(plans.map(p => [p.id!, p.title]))

  const sessionMap = new Map<string, SessionVolumePoint>()

  for (const s of sets) {
    if (s.hidden || s.isWarmup) continue
    const day = s.created.slice(0, 10)
    const key = s.planId != null ? `${s.planId}_${day}` : `quick_${day}`

    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        date: day,
        sessionKey: key,
        routineName: s.planId != null
          ? (planTitles.get(s.planId) ?? 'Workout')
          : 'Quick Workout',
        totalVolume: 0,
        setCount: 0,
        planId: s.planId ?? null,
      })
    }

    const point = sessionMap.get(key)!
    point.totalVolume += s.weight * s.reps
    point.setCount += 1
  }

  return Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Groups session volumes by routine, returning one series per routine.
 * Useful for a multi-line chart.
 */
export async function computeRoutineVolumeSeries(): Promise<RoutineVolumeSeries[]> {
  const sessions = await computeSessionVolumes()

  const routineMap = new Map<string, Array<{ date: string; volume: number }>>()
  for (const s of sessions) {
    if (!routineMap.has(s.routineName)) routineMap.set(s.routineName, [])
    routineMap.get(s.routineName)!.push({ date: s.date, volume: Math.round(s.totalVolume) })
  }

  let index = 0
  return Array.from(routineMap.entries()).map(([routineName, points]) => ({
    routineName,
    color: colorForRoutine(routineName, index++),
    points,
  }))
}

/**
 * Computes estimated 1RM personal bests per exercise over time.
 */
export async function computePersonalBests(
  exerciseName: string,
): Promise<PersonalBestPoint[]> {
  const sets: GymSet[] = await db.gym_sets
    .where('name')
    .equals(exerciseName)
    .toArray()

  let currentBest = 0
  const bests: PersonalBestPoint[] = []

  const sorted = sets
    .filter(s => !s.hidden && !s.isWarmup && s.weight > 0 && s.reps > 0)
    .sort((a, b) => a.created.localeCompare(b.created))

  for (const s of sorted) {
    const est = quick1RM(s.weight, s.reps)
    if (est > currentBest) {
      currentBest = est
      bests.push({
        date: s.created.slice(0, 10),
        exerciseName: s.name,
        estimated1RM: est,
        weight: s.weight,
        reps: s.reps,
      })
    }
  }

  return bests
}

/**
 * Returns current week vs previous week volume comparison per routine.
 */
export interface RoutineComparison {
  routineName: string
  thisWeekVolume: number
  lastWeekVolume: number
  delta: number
  deltaPercent: number
}

export async function computeWeeklyRoutineComparison(): Promise<RoutineComparison[]> {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  const sessions = await computeSessionVolumes()

  const thisWeek = sessions.filter(s => new Date(s.date) >= weekStart)
  const lastWeek = sessions.filter(
    s => new Date(s.date) >= prevWeekStart && new Date(s.date) < weekStart,
  )

  const routines = new Set([
    ...thisWeek.map(s => s.routineName),
    ...lastWeek.map(s => s.routineName),
  ])

  return Array.from(routines).map(name => {
    const thisVol = thisWeek
      .filter(s => s.routineName === name)
      .reduce((a, s) => a + s.totalVolume, 0)
    const lastVol = lastWeek
      .filter(s => s.routineName === name)
      .reduce((a, s) => a + s.totalVolume, 0)
    const delta = Math.round(thisVol - lastVol)
    const deltaPercent = lastVol > 0 ? Math.round((delta / lastVol) * 100) : 0
    return { routineName: name, thisWeekVolume: Math.round(thisVol), lastWeekVolume: Math.round(lastVol), delta, deltaPercent }
  })
}
