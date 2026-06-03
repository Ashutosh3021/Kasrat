/**
 * Calendar-day helpers using the device local timezone.
 * Streaks are keyed as YYYY-MM-DD so midnight crossings and TZ changes
 * align with the user's perceived "day", not UTC.
 */

/** Local calendar date key (YYYY-MM-DD) for a Date or ISO string */
export function toLocalDayKey(input: Date | string = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add whole calendar days to a YYYY-MM-DD key (local, no DST surprises on keys) */
export function addCalendarDays(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return toLocalDayKey(date)
}

/** True when b is exactly one calendar day after a */
export function isNextCalendarDay(a: string, b: string): boolean {
  return addCalendarDays(a, 1) === b
}
