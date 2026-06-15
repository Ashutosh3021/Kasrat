/**
 * Feature 6: Estimation Tools
 *
 * Pure computation functions for:
 * - 1RM estimation (Brzycki formula for reps ≤ 15, Epley for reps > 15)
 * - RPE-based rep projection
 * - Load estimation from a target rep range percentage
 */

// ─── 1RM Estimation ───────────────────────────────────────────────────────────

/**
 * Brzycki formula: 1RM = weight × 36 / (37 - reps)
 * Valid for reps ≤ 15.
 */
function brzycki(weight: number, reps: number): number {
  if (reps <= 0 || reps > 36) return weight
  return weight * 36 / (37 - reps)
}

/**
 * Epley formula: 1RM = weight × (1 + reps / 30)
 * Recommended for reps > 15.
 */
function epley(weight: number, reps: number): number {
  if (reps <= 0) return weight
  return weight * (1 + reps / 30)
}

/**
 * Estimate 1RM. Automatically selects formula based on rep count.
 * Returns rounded to nearest 0.5 kg.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  const raw = reps <= 15 ? brzycki(weight, reps) : epley(weight, reps)
  return Math.round(raw * 2) / 2  // nearest 0.5
}

// ─── Rep Projection from RPE ──────────────────────────────────────────────────

/**
 * Given a set where the user was at RPE `currentRpe` for `reps` reps,
 * estimate how many reps they could do at a target RPE.
 *
 * RIR (Reps In Reserve) = 10 - RPE
 * Estimated total reps = reps + RIR
 *
 * Returns projected rep count at the target RPE.
 */
export function projectRepsFromRPE(
  reps: number,
  currentRpe: number,
  targetRpe: number = 10,
): number {
  const currentRIR = Math.max(0, 10 - currentRpe)
  const totalReps = reps + currentRIR
  const targetRIR = Math.max(0, 10 - targetRpe)
  return Math.max(1, totalReps - targetRIR)
}

// ─── Load from Rep Percentage ─────────────────────────────────────────────────

/**
 * Standard % of 1RM → rep ranges table.
 * Returns the suggested load for a target rep range given a known 1RM.
 */
const PERCENT_TABLE: Array<{ min: number; max: number; pct: number }> = [
  { min: 1,  max: 1,  pct: 1.00 },
  { min: 2,  max: 3,  pct: 0.95 },
  { min: 4,  max: 5,  pct: 0.90 },
  { min: 6,  max: 8,  pct: 0.82 },
  { min: 8,  max: 10, pct: 0.75 },
  { min: 10, max: 12, pct: 0.70 },
  { min: 12, max: 15, pct: 0.65 },
  { min: 15, max: 20, pct: 0.55 },
]

/**
 * Returns the recommended weight for a target rep range given a known 1RM.
 * Rounds to nearest 0.5 kg.
 */
export function estimateLoadForRepRange(
  oneRepMax: number,
  targetReps: number,
): number {
  const entry =
    PERCENT_TABLE.find(r => targetReps >= r.min && targetReps <= r.max) ??
    PERCENT_TABLE[PERCENT_TABLE.length - 1]
  return Math.round(oneRepMax * entry.pct * 2) / 2
}

// ─── Quick Summary ────────────────────────────────────────────────────────────

export interface EstimationResult {
  estimated1RM: number
  /** Recommended load for 6-8 rep range (strength) */
  load68: number
  /** Recommended load for 8-10 rep range (hypertrophy) */
  load810: number
  /** Recommended load for 10-12 rep range (volume) */
  load1012: number
}

/**
 * Convenience: compute all common estimates from one set entry.
 */
export function computeEstimates(weight: number, reps: number): EstimationResult {
  const estimated1RM = estimate1RM(weight, reps)
  return {
    estimated1RM,
    load68: estimateLoadForRepRange(estimated1RM, 7),
    load810: estimateLoadForRepRange(estimated1RM, 9),
    load1012: estimateLoadForRepRange(estimated1RM, 11),
  }
}
