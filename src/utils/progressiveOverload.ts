export type OverloadTrend = 'up' | 'down' | 'neutral'

export interface SessionSet {
  weight: number
  reps: number
}

/**
 * Compares current input against the last logged set for an exercise.
 * Progressive overload (up): weight increased by any amount OR reps increased
 * by any amount compared to the previous session.
 * Down: weight decreased (reps-only decreases do not mark a regression).
 */
export function getOverloadTrend(
  prev: SessionSet | null,
  curWeight: number,
  curReps: number,
): OverloadTrend | null {
  if (!prev || curWeight <= 0 || curReps <= 0) return null

  const weightIncreased = curWeight > prev.weight
  const repsIncreased = curReps > prev.reps

  if (weightIncreased || repsIncreased) return 'up'
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
