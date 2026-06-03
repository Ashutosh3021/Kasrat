import { db, type DayStatus, type StreakMeta } from '../db/database'
import { useStreakStore } from '../store/streakStore'
import { addCalendarDays, compareCalendarDays, toLocalDayKey } from '../utils/calendarDay'
import { getScheduledWeekdays, isDayScheduled, plansForDay } from '../utils/schedule'
import { buildWorkoutSessions, countSessions } from '../utils/sessions'
import {
  buildEvaluationsForRange,
  canUserResolveDay,
  computeCurrentStreakFromEvaluations,
  computeLongestStreakFromEvaluations,
  evaluateDay,
  type DayEvaluation,
} from '../utils/streakEvaluation'

export const STREAK_META_ID = 'meta' as const

const EVAL_LOOKBACK_DAYS = 120

async function loadStreakInputs() {
  const [sets, plans, dayStatuses] = await Promise.all([
    db.gym_sets.toArray(),
    db.plans.toArray(),
    db.day_status.toArray(),
  ])

  const planTitles = new Map(plans.map(p => [p.id!, p.title]))
  const sessions = buildWorkoutSessions(sets, planTitles)
  const { total, thisMonth, sessionDates } = countSessions(sessions)
  const scheduledWeekdays = getScheduledWeekdays(plans)
  const dayStatusByDate = new Map(dayStatuses.map(d => [d.date, d]))

  return {
    plans,
    sessions,
    total,
    thisMonth,
    sessionDates,
    scheduledWeekdays,
    dayStatusByDate,
  }
}

function evaluationRange(todayKey: string, sessionDates: Set<string>): { from: string; to: string } {
  let from = addCalendarDays(todayKey, -EVAL_LOOKBACK_DAYS)
  const sorted = Array.from(sessionDates).sort()
  if (sorted.length > 0 && compareCalendarDays(sorted[0], from) < 0) {
    from = sorted[0]
  }
  return { from, to: todayKey }
}

/** Persist auto rest (Sundays) and auto missed (past grace) rows */
async function syncAutoDayStatus(
  evaluations: Map<string, DayEvaluation>,
  dayStatusByDate: Map<string, DayStatus>,
  todayKey: string,
) {
  const writes: DayStatus[] = []

  for (const [date, ev] of evaluations) {
    if (compareCalendarDays(date, todayKey) > 0) continue
    const existing = dayStatusByDate.get(date)
    if (existing?.source === 'user') continue

    if (ev.implicitSundayRest && ev.effective === 'rest') {
      writes.push({
        date,
        resolution: 'rest',
        source: 'auto',
        scheduled: ev.scheduled,
        hadSession: ev.hadSession,
        updatedAt: new Date().toISOString(),
      })
    } else if (ev.effective === 'missed' && !ev.hadSession) {
      writes.push({
        date,
        resolution: 'missed',
        source: 'auto',
        scheduled: ev.scheduled,
        hadSession: false,
        updatedAt: new Date().toISOString(),
      })
    } else if (existing?.source === 'auto' && ev.effective === 'completed') {
      await db.day_status.delete(date)
    }
  }

  if (writes.length > 0) {
    await db.day_status.bulkPut(writes)
  }
}

function applyStore(meta: StreakMeta, pendingCount: number, activeToday: boolean) {
  useStreakStore.getState().setSnapshot({
    currentStreak: meta.currentStreak,
    previousStreak: meta.previousStreak,
    longestStreak: meta.longestStreak,
    sessionsThisMonth: meta.sessionsThisMonth,
    totalSessions: meta.totalSessions,
    pendingCount,
    activeToday,
  })
}

function maybeAnnounce(previousStreak: number, meta: StreakMeta) {
  const { setToast } = useStreakStore.getState()

  if (meta.currentStreak === 0 && previousStreak > 0) {
    setToast({
      type: 'reset',
      message:
        meta.previousStreak > 0
          ? `Streak ended after ${meta.previousStreak} days. Log a session or mark a rest day.`
          : 'Streak ended. Log a session or mark a rest day to start again.',
    })
    meta.lastNotifiedStreak = 0
    return true
  }

  if (meta.currentStreak > previousStreak) {
    setToast({
      type: 'increased',
      message:
        meta.currentStreak === 1
          ? 'Day 1 — streak started! Come back tomorrow to build it.'
          : `${meta.currentStreak}-day streak! You're on a roll.`,
    })
    meta.lastNotifiedStreak = meta.currentStreak
    return true
  }

  return false
}

async function computeAndPersist(): Promise<{ meta: StreakMeta; previousStreak: number; pendingDays: DayEvaluation[] }> {
  const todayKey = toLocalDayKey()
  const inputs = await loadStreakInputs()
  const { from, to } = evaluationRange(todayKey, inputs.sessionDates)

  let evaluations = buildEvaluationsForRange(
    from,
    to,
    inputs.sessionDates,
    inputs.scheduledWeekdays,
    inputs.dayStatusByDate,
    inputs.plans,
    todayKey,
  )

  await syncAutoDayStatus(evaluations, inputs.dayStatusByDate, todayKey)

  const refreshedStatuses = await db.day_status.toArray()
  const dayStatusByDate = new Map(refreshedStatuses.map(d => [d.date, d]))
  evaluations = buildEvaluationsForRange(
    from,
    to,
    inputs.sessionDates,
    inputs.scheduledWeekdays,
    dayStatusByDate,
    inputs.plans,
    todayKey,
  )

  const currentStreak = computeCurrentStreakFromEvaluations(evaluations, todayKey)
  const computedLongest = computeLongestStreakFromEvaluations(evaluations)

  const prev = await db.streak_meta.get(STREAK_META_ID)
  const previousStreak = prev?.currentStreak ?? 0
  let previousStreakStored = prev?.previousStreak ?? 0

  if (previousStreak > 0 && currentStreak === 0) {
    previousStreakStored = previousStreak
  }

  const longestStreak = Math.max(
    computedLongest,
    prev?.longestStreak ?? 0,
    currentStreak,
  )

  const todayEval = evaluations.get(todayKey)
  const activeToday = todayEval ? todayEval.effective === 'completed' || todayEval.effective === 'rest' : false

  const pendingDays = Array.from(evaluations.values()).filter(e => e.effective === 'pending')

  const meta: StreakMeta = {
    id: STREAK_META_ID,
    currentStreak,
    previousStreak: previousStreakStored,
    longestStreak,
    sessionsThisMonth: inputs.thisMonth,
    totalSessions: inputs.total,
    lastComputedAt: new Date().toISOString(),
    lastNotifiedStreak: prev?.lastNotifiedStreak ?? 0,
    lastActivityDay: inputs.sessionDates.size > 0
      ? Array.from(inputs.sessionDates).sort().at(-1)
      : undefined,
    lastBrokenAt:
      previousStreak > 0 && currentStreak === 0
        ? todayKey
        : prev?.lastBrokenAt,
  }

  await db.streak_meta.put(meta)
  applyStore(meta, pendingDays.length, activeToday)

  return { meta, previousStreak, pendingDays }
}

export async function refreshStreak(options?: { announce?: boolean }): Promise<StreakMeta> {
  const { meta, previousStreak } = await computeAndPersist()

  if (options?.announce) {
    const updated = { ...meta }
    if (maybeAnnounce(previousStreak, updated)) {
      await db.streak_meta.put(updated)
    }
  }

  return meta
}

export async function onActivityLogged(): Promise<void> {
  const before = (await db.streak_meta.get(STREAK_META_ID))?.currentStreak ?? 0
  const { meta } = await computeAndPersist()
  const updated = { ...meta }
  if (maybeAnnounce(before, updated)) {
    await db.streak_meta.put(updated)
  }
}

export async function getPendingDayEvaluations(): Promise<DayEvaluation[]> {
  const todayKey = toLocalDayKey()
  const inputs = await loadStreakInputs()
  const { from, to } = evaluationRange(todayKey, inputs.sessionDates)
  const evaluations = buildEvaluationsForRange(
    from,
    to,
    inputs.sessionDates,
    inputs.scheduledWeekdays,
    inputs.dayStatusByDate,
    inputs.plans,
    todayKey,
  )
  return Array.from(evaluations.values())
    .filter(e => e.effective === 'pending' && canUserResolveDay(e.date, todayKey))
    .sort((a, b) => compareCalendarDays(b.date, a.date))
}

export async function getDayEvaluation(date: string): Promise<DayEvaluation> {
  const todayKey = toLocalDayKey()
  const inputs = await loadStreakInputs()
  const dayStatus = await db.day_status.get(date)
  const scheduled = isDayScheduled(date, inputs.scheduledWeekdays)
  const scheduledPlanTitles = plansForDay(date, inputs.plans)

  return evaluateDay(date, {
    todayKey,
    scheduled,
    hadSession: inputs.sessionDates.has(date),
    dayStatus,
    scheduledPlanTitles,
  })
}

export async function resolveDay(
  date: string,
  resolution: 'rest' | 'missed',
): Promise<void> {
  if (!canUserResolveDay(date)) {
    throw new Error('This day is too far in the past to change.')
  }

  const evaluation = await getDayEvaluation(date)
  if (evaluation.hadSession) {
    throw new Error('A session was logged this day — it counts as complete.')
  }

  const row: DayStatus = {
    date,
    resolution,
    source: 'user',
    scheduled: evaluation.scheduled,
    hadSession: false,
    updatedAt: new Date().toISOString(),
  }
  await db.day_status.put(row)
  await refreshStreak({ announce: true })
}

/** Optional: mark an unscheduled day as rest (extends streak) */
export async function markRestDay(date: string): Promise<void> {
  return resolveDay(date, 'rest')
}

export async function markMissedDay(date: string): Promise<void> {
  return resolveDay(date, 'missed')
}
