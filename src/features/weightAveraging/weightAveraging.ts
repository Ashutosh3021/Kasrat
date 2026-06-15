/**
 * Feature 4: Weight Averaging Functionality
 *
 * Pure computation helpers for:
 * - Weekly average body weight (Mon–Sun)
 * - 3-day moving average for spike smoothing
 * - Week-over-week trend indicator
 */

import { db, type BodyMeasurement } from '../../db/database'

export interface WeeklyWeightAverage {
  weekStart: string      // ISO date: Monday of that week
  avgWeight: number      // Mean of available daily weights
  dataPoints: number     // How many days had data
  isPartial: boolean     // true when week has < 7 data points
}

export interface WeightTrendResult {
  currentWeekAvg: number | null
  previousWeekAvg: number | null
  /** Positive = gaining, negative = losing */
  delta: number | null
  /** Smoothed 3-day moving average, newest last */
  smoothedSeries: Array<{ date: string; value: number }>
  weeklyAverages: WeeklyWeightAverage[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the Monday ISO date string for a given date */
function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/**
 * Applies a 3-point moving average to smooth out daily weight spikes.
 * Returns an array aligned to the original input.
 */
function threePointMovingAverage(
  points: Array<{ date: string; value: number }>,
): Array<{ date: string; value: number }> {
  return points.map((p, i) => {
    if (i === 0) return p
    if (i === 1) {
      const avg = (points[0].value + p.value) / 2
      return { date: p.date, value: Math.round(avg * 10) / 10 }
    }
    const avg = (points[i - 2].value + points[i - 1].value + p.value) / 3
    return { date: p.date, value: Math.round(avg * 10) / 10 }
  })
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Loads all body_weight entries from Dexie and computes:
 * - Per-week averages
 * - 3-day smoothed series
 * - Current vs previous week delta
 */
export async function computeWeightTrend(): Promise<WeightTrendResult> {
  const measurements: BodyMeasurement[] = await db.body_measurements
    .orderBy('created')
    .toArray()

  const withWeight = measurements.filter(m => m.bodyWeight != null)

  if (withWeight.length === 0) {
    return {
      currentWeekAvg: null,
      previousWeekAvg: null,
      delta: null,
      smoothedSeries: [],
      weeklyAverages: [],
    }
  }

  // Build daily map (latest entry per day wins)
  const dailyMap = new Map<string, number>()
  for (const m of withWeight) {
    const day = m.created.slice(0, 10)
    dailyMap.set(day, m.bodyWeight as number)
  }

  // Sort days chronologically
  const sortedDays = Array.from(dailyMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  )

  // 3-day moving average
  const rawPoints = sortedDays.map(([date, value]) => ({ date, value }))
  const smoothedSeries = threePointMovingAverage(rawPoints)

  // Weekly averages
  const weeklyMap = new Map<string, number[]>()
  for (const [date, weight] of sortedDays) {
    const weekKey = getMondayOf(new Date(date))
    if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, [])
    weeklyMap.get(weekKey)!.push(weight)
  }

  const weeklyAverages: WeeklyWeightAverage[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weights]) => ({
      weekStart,
      avgWeight: Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
      dataPoints: weights.length,
      isPartial: weights.length < 7,
    }))

  const n = weeklyAverages.length
  const currentWeekAvg = n > 0 ? weeklyAverages[n - 1].avgWeight : null
  const previousWeekAvg = n > 1 ? weeklyAverages[n - 2].avgWeight : null
  const delta =
    currentWeekAvg !== null && previousWeekAvg !== null
      ? Math.round((currentWeekAvg - previousWeekAvg) * 10) / 10
      : null

  return { currentWeekAvg, previousWeekAvg, delta, smoothedSeries, weeklyAverages }
}
