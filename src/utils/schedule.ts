import type { Plan } from '../db/database'
import { weekdayFromDayKey } from './calendarDay'

/** Weekdays (0=Sun … 6=Sat) that appear on any plan */
export function getScheduledWeekdays(plans: Plan[]): Set<number> {
  const days = new Set<number>()
  for (const plan of plans) {
    plan.days.split(',').forEach(d => {
      const n = Number(d.trim())
      if (!Number.isNaN(n) && n >= 0 && n <= 6) days.add(n)
    })
  }
  return days
}

export function isDayScheduled(dayKey: string, scheduledWeekdays: Set<number>): boolean {
  return scheduledWeekdays.has(weekdayFromDayKey(dayKey))
}

/** Plan titles scheduled on a given calendar day */
export function plansForDay(dayKey: string, plans: Plan[]): string[] {
  const wd = weekdayFromDayKey(dayKey)
  return plans
    .filter(p => p.days.split(',').map(Number).includes(wd))
    .map(p => p.title)
}
