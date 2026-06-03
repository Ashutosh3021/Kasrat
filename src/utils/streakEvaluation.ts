import type { DayStatus } from '../db/database'
import {
  addCalendarDays,
  compareCalendarDays,
  toLocalDayKey,
  weekdayFromDayKey,
} from './calendarDay'
import { isDayScheduled } from './schedule'

export type EffectiveDayStatus = 'completed' | 'rest' | 'missed' | 'pending' | 'neutral'

export interface DayEvaluation {
  date: string
  scheduled: boolean
  hadSession: boolean
  effective: EffectiveDayStatus
  implicitSundayRest: boolean
  scheduledPlanTitles: string[]
}

export function isStreakDay(e: DayEvaluation): boolean {
  return e.effective === 'completed' || e.effective === 'rest'
}

const RESOLVE_LOOKBACK_DAYS = 30

/** Scheduled past days stay pending until the day after next (D+2) */
function isPastGraceDeadline(date: string, todayKey: string): boolean {
  return compareCalendarDays(todayKey, addCalendarDays(date, 2)) >= 0
}

export function evaluateDay(
  date: string,
  opts: {
    todayKey?: string
    scheduled: boolean
    hadSession: boolean
    dayStatus?: DayStatus
    scheduledPlanTitles: string[]
  },
): DayEvaluation {
  const todayKey = opts.todayKey ?? toLocalDayKey()
  const { scheduled, hadSession, dayStatus, scheduledPlanTitles } = opts
  const implicitSundayRest =
    weekdayFromDayKey(date) === 0 && !scheduled && !hadSession

  if (hadSession) {
    return {
      date,
      scheduled,
      hadSession: true,
      effective: 'completed',
      implicitSundayRest: false,
      scheduledPlanTitles,
    }
  }

  if (dayStatus?.source === 'user') {
    if (dayStatus.resolution === 'rest') {
      return {
        date,
        scheduled,
        hadSession: false,
        effective: 'rest',
        implicitSundayRest: false,
        scheduledPlanTitles,
      }
    }
    if (dayStatus.resolution === 'missed') {
      return {
        date,
        scheduled,
        hadSession: false,
        effective: 'missed',
        implicitSundayRest: false,
        scheduledPlanTitles,
      }
    }
  }

  if (implicitSundayRest) {
    return {
      date,
      scheduled,
      hadSession: false,
      effective: 'rest',
      implicitSundayRest: true,
      scheduledPlanTitles,
    }
  }

  if (dayStatus?.source === 'auto' && dayStatus.resolution === 'rest') {
    return {
      date,
      scheduled,
      hadSession: false,
      effective: 'rest',
      implicitSundayRest: false,
      scheduledPlanTitles,
    }
  }

  if (scheduled && compareCalendarDays(date, todayKey) <= 0) {
    if (isPastGraceDeadline(date, todayKey)) {
      return {
        date,
        scheduled,
        hadSession: false,
        effective: 'missed',
        implicitSundayRest: false,
        scheduledPlanTitles,
      }
    }
    return {
      date,
      scheduled,
      hadSession: false,
      effective: 'pending',
      implicitSundayRest: false,
      scheduledPlanTitles,
    }
  }

  return {
    date,
    scheduled,
    hadSession: false,
    effective: 'neutral',
    implicitSundayRest: false,
    scheduledPlanTitles,
  }
}

export function canUserResolveDay(date: string, todayKey: string = toLocalDayKey()): boolean {
  if (compareCalendarDays(date, todayKey) > 0) return false
  const oldest = addCalendarDays(todayKey, -RESOLVE_LOOKBACK_DAYS)
  return compareCalendarDays(date, oldest) >= 0
}

/**
 * Current streak: consecutive calendar days ending today/yesterday where each day
 * is completed or rest. Neutral days break the chain. Missed/pending stop the walk.
 */
export function computeCurrentStreakFromEvaluations(
  evaluations: Map<string, DayEvaluation>,
  todayKey: string = toLocalDayKey(),
): number {
  let anchor = todayKey
  const anchorEval = evaluations.get(anchor)
  if (!anchorEval || !isStreakDay(anchorEval)) {
    anchor = addCalendarDays(todayKey, -1)
    if (!evaluations.get(anchor) || !isStreakDay(evaluations.get(anchor)!)) return 0
  }

  let streak = 0
  let cursor = anchor
  for (let guard = 0; guard < 4000; guard++) {
    const ev = evaluations.get(cursor)
    if (!ev) break
    if (ev.effective === 'completed' || ev.effective === 'rest') {
      streak += 1
      cursor = addCalendarDays(cursor, -1)
      continue
    }
    if (ev.effective === 'neutral') break
    break
  }
  return streak
}

export function computeLongestStreakFromEvaluations(
  evaluations: Map<string, DayEvaluation>,
): number {
  const dates = Array.from(evaluations.keys()).sort()
  if (dates.length === 0) return 0

  let max = 0
  let run = 0
  let prev: string | null = null

  for (const date of dates) {
    const ev = evaluations.get(date)!
    if (!isStreakDay(ev)) {
      run = 0
      prev = null
      continue
    }
    if (prev && addCalendarDays(prev, 1) === date) run += 1
    else run = 1
    max = Math.max(max, run)
    prev = date
  }
  return max
}

export function buildEvaluationsForRange(
  from: string,
  to: string,
  sessionDates: Set<string>,
  scheduledWeekdays: Set<number>,
  dayStatusByDate: Map<string, DayStatus>,
  plans: { title: string; days: string }[],
  todayKey: string = toLocalDayKey(),
): Map<string, DayEvaluation> {
  const map = new Map<string, DayEvaluation>()
  let cursor = from
  while (compareCalendarDays(cursor, to) <= 0) {
    const scheduled = isDayScheduled(cursor, scheduledWeekdays)
    const hadSession = sessionDates.has(cursor)
    const dayStatus = dayStatusByDate.get(cursor)
    const scheduledPlanTitles = plans
      .filter(p => p.days.split(',').map(Number).includes(weekdayFromDayKey(cursor)))
      .map(p => p.title)

    map.set(
      cursor,
      evaluateDay(cursor, {
        todayKey,
        scheduled,
        hadSession,
        dayStatus,
        scheduledPlanTitles,
      }),
    )
    cursor = addCalendarDays(cursor, 1)
  }
  return map
}
