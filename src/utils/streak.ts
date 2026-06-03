import type { BodyMeasurement, DailyNutrition, GymSet } from '../db/database'
import { addCalendarDays, isNextCalendarDay, toLocalDayKey } from './calendarDay'

/** Logged set that counts as a workout (not a hidden template row) */
export function isCountableGymSet(s: GymSet): boolean {
  if (s.hidden) return false
  return s.weight > 0 || s.reps > 0 || s.distance > 0 || s.duration > 0
}

export function hasNutritionActivity(entry: DailyNutrition): boolean {
  return (
    (entry.calories ?? 0) > 0
    || (entry.protein ?? 0) > 0
    || (entry.carbs ?? 0) > 0
    || (entry.fats ?? 0) > 0
    || (entry.water ?? 0) > 0
    || Boolean(entry.notes?.trim())
  )
}

export function gymSetActivityDay(s: GymSet): string {
  return toLocalDayKey(s.created)
}

export function measurementActivityDay(m: BodyMeasurement): string {
  return toLocalDayKey(m.created)
}

/**
 * Current consecutive-day streak.
 * Active today → count back from today.
 * Not yet active today but was yesterday → streak still counts through yesterday.
 * Otherwise → 0 (at least one full calendar day missed).
 */
export function computeCurrentStreak(
  activityDays: Set<string>,
  todayKey: string = toLocalDayKey(),
): number {
  let anchor = todayKey
  if (!activityDays.has(anchor)) {
    anchor = addCalendarDays(todayKey, -1)
    if (!activityDays.has(anchor)) return 0
  }

  let streak = 0
  let cursor = anchor
  while (activityDays.has(cursor)) {
    streak += 1
    cursor = addCalendarDays(cursor, -1)
  }
  return streak
}

/** Longest run of consecutive calendar days in history */
export function computeLongestStreak(activityDays: Set<string>): number {
  const sorted = Array.from(activityDays).sort()
  if (sorted.length === 0) return 0

  let max = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    if (isNextCalendarDay(sorted[i - 1], sorted[i])) run += 1
    else run = 1
    max = Math.max(max, run)
  }
  return max
}
