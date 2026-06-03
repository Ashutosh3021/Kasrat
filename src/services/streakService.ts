import { db, type StreakMeta } from '../db/database'
import { useStreakStore } from '../store/streakStore'
import { toLocalDayKey } from '../utils/calendarDay'
import {
  computeCurrentStreak,
  computeLongestStreak,
  gymSetActivityDay,
  hasNutritionActivity,
  isCountableGymSet,
  measurementActivityDay,
} from '../utils/streak'

export const STREAK_META_ID = 'meta' as const

export async function collectActivityDays(): Promise<Set<string>> {
  const days = new Set<string>()

  const [sets, measurements, nutrition] = await Promise.all([
    db.gym_sets.toArray(),
    db.body_measurements.toArray(),
    db.daily_nutrition.toArray(),
  ])

  sets.filter(isCountableGymSet).forEach(s => days.add(gymSetActivityDay(s)))
  measurements.forEach(m => days.add(measurementActivityDay(m)))
  nutrition.filter(hasNutritionActivity).forEach(n => days.add(n.date))

  return days
}

function latestActivityDay(activityDays: Set<string>): string | undefined {
  if (activityDays.size === 0) return undefined
  return Array.from(activityDays).sort().at(-1)
}

function applyStreakToStore(currentStreak: number, longestStreak: number) {
  useStreakStore.getState().setStreak(currentStreak, longestStreak)
}

function maybeAnnounce(previousStreak: number, currentStreak: number, meta: StreakMeta) {
  const { setToast } = useStreakStore.getState()

  if (currentStreak === 0 && previousStreak > 0) {
    setToast({
      type: 'reset',
      message: 'Streak ended. Log a workout or nutrition entry to start a new run.',
    })
    meta.lastNotifiedStreak = 0
    return true
  }

  if (currentStreak > previousStreak) {
    setToast({
      type: 'increased',
      message:
        currentStreak === 1
          ? 'Day 1 — streak started! Come back tomorrow to build it.'
          : `${currentStreak}-day streak! You're on a roll.`,
    })
    meta.lastNotifiedStreak = currentStreak
    return true
  }

  return false
}

async function computeAndPersist(): Promise<{ meta: StreakMeta; previousStreak: number }> {
  const activityDays = await collectActivityDays()
  const todayKey = toLocalDayKey()
  const currentStreak = computeCurrentStreak(activityDays, todayKey)
  const computedLongest = computeLongestStreak(activityDays)

  const prev = await db.streak_meta.get(STREAK_META_ID)
  const previousStreak = prev?.currentStreak ?? 0
  const longestStreak = Math.max(computedLongest, prev?.longestStreak ?? 0, currentStreak)

  const meta: StreakMeta = {
    id: STREAK_META_ID,
    currentStreak,
    longestStreak,
    lastComputedAt: new Date().toISOString(),
    lastNotifiedStreak: prev?.lastNotifiedStreak ?? 0,
    lastActivityDay: latestActivityDay(activityDays),
  }

  await db.streak_meta.put(meta)
  applyStreakToStore(currentStreak, longestStreak)
  return { meta, previousStreak }
}

/**
 * Recompute streak from activity in Dexie and update the UI store.
 * @param announce — toast when streak increased or reset to 0 after a miss
 */
export async function refreshStreak(options?: { announce?: boolean }): Promise<StreakMeta> {
  const { meta, previousStreak } = await computeAndPersist()

  if (options?.announce) {
    const updated = { ...meta }
    if (maybeAnnounce(previousStreak, meta.currentStreak, updated)) {
      await db.streak_meta.put(updated)
    }
  }

  return meta
}

/** Call after logging a set, body measurement, or nutrition entry */
export async function onActivityLogged(): Promise<void> {
  const { meta, previousStreak: before } = await computeAndPersist()
  const updated = { ...meta }
  if (maybeAnnounce(before, meta.currentStreak, updated)) {
    await db.streak_meta.put(updated)
  }
}
