/** Rep increase above previous session that counts as progressive overload */
export const REP_OVERLOAD_DELTA = 3

export type OverloadTrend = 'up' | 'down' | 'neutral'

export interface SessionSet {
  weight: number
  reps: number
}

/**
 * Compares current input against the last logged set for an exercise.
 * Progressive overload (up): weight increased OR reps increased by more than 3.
 * Down: weight decreased (reps-only changes do not mark a regression).
 */
export function getOverloadTrend(
  prev: SessionSet | null,
  curWeight: number,
  curReps: number,
): OverloadTrend | null {
  if (!prev || curWeight <= 0 || curReps <= 0) return null

  const weightIncreased = curWeight > prev.weight
  // More than 3 extra reps vs last session (e.g. 8 → 12)
  const repsOverload = curReps > prev.reps + REP_OVERLOAD_DELTA

  if (weightIncreased || repsOverload) return 'up'
  if (curWeight < prev.weight) return 'down'
  return 'neutral'
}

export function isProgressiveOverload(
  prev: SessionSet | null,
  curWeight: number,
  curReps: number,
): boolean {
  return getOverloadTrend(prev, curWeight, curReps) === 'up'
}
