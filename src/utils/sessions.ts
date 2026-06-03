import type { GymSet } from '../db/database'
import { currentMonthPrefix } from './calendarDay'
import { isCountableGymSet } from './streak'

export interface WorkoutSession {
  key: string
  planId: number | null
  planTitle: string
  date: string
  latestCreated: string
}

/** Build unique workout sessions from logged sets (v2 streak uses sessions only) */
export function buildWorkoutSessions(
  sets: GymSet[],
  planTitles: Map<number, string>,
): WorkoutSession[] {
  const sessionMap = new Map<string, WorkoutSession>()

  for (const s of sets.filter(isCountableGymSet)) {
    const day = s.created.slice(0, 10)
    const sessionKey = s.planId != null ? `${s.planId}_${day}` : `quick_${day}`

    if (!sessionMap.has(sessionKey)) {
      sessionMap.set(sessionKey, {
        key: sessionKey,
        planId: s.planId ?? null,
        planTitle:
          s.planId != null
            ? (planTitles.get(s.planId) ?? 'Workout')
            : 'Quick Workout',
        date: day,
        latestCreated: s.created,
      })
    } else {
      const session = sessionMap.get(sessionKey)!
      if (s.created > session.latestCreated) session.latestCreated = s.created
    }
  }

  return Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.latestCreated).getTime() - new Date(a.latestCreated).getTime(),
  )
}

export function countSessions(sessions: WorkoutSession[], monthPrefix = currentMonthPrefix()) {
  return {
    total: sessions.length,
    thisMonth: sessions.filter(s => s.date.startsWith(monthPrefix)).length,
    sessionDates: new Set(sessions.map(s => s.date)),
  }
}
