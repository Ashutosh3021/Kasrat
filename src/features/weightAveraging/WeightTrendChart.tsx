/**
 * Feature 4: Weight Averaging — Trend Chart Component
 *
 * Renders a smoothed trend line overlaid on raw daily weight points.
 * Drop into BodyMeasurementsPage charts tab or a dedicated weight page.
 */

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { computeWeightTrend, type WeightTrendResult } from './weightAveraging'

export default function WeightTrendChart() {
  const [trend, setTrend] = useState<WeightTrendResult | null>(null)

  useEffect(() => {
    computeWeightTrend().then(setTrend)
  }, [])

  if (!trend) {
    return (
      <div className="h-48 flex items-center justify-center text-muted">
        Loading…
      </div>
    )
  }

  if (trend.smoothedSeries.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-2xl p-4 text-center">
        <p className="text-muted text-[15px]">Log your weight to see trends here.</p>
      </div>
    )
  }

  // Merge raw + smoothed for the chart
  const chartData = trend.smoothedSeries.map(p => ({
    date: p.date.slice(5), // MM-DD display
    smoothed: p.value,
  }))

  const DeltaIcon =
    trend.delta === null
      ? Minus
      : trend.delta > 0
      ? TrendingUp
      : trend.delta < 0
      ? TrendingDown
      : Minus

  const deltaColor =
    trend.delta === null || trend.delta === 0
      ? 'var(--color-muted)'
      : trend.delta > 0
      ? 'var(--color-danger)'
      : 'var(--color-success)'

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface border border-line rounded-2xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-widest">This Week</span>
          <span className="text-[24px] font-semibold text-ink">
            {trend.currentWeekAvg != null ? `${trend.currentWeekAvg} kg` : '—'}
          </span>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-widest">Last Week</span>
          <span className="text-[24px] font-semibold text-ink">
            {trend.previousWeekAvg != null ? `${trend.previousWeekAvg} kg` : '—'}
          </span>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-3 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-muted uppercase tracking-widest">Trend</span>
          <div className="flex items-center gap-1">
            <DeltaIcon size={16} strokeWidth={1.5} style={{ color: deltaColor }} />
            <span className="text-[24px] font-semibold" style={{ color: deltaColor }}>
              {trend.delta != null
                ? `${trend.delta > 0 ? '+' : ''}${trend.delta} kg`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-surface border border-line rounded-2xl p-3">
        <p className="text-[13px] font-medium text-muted mb-3">
          3-Day Smoothed Weight (kg)
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 4, color: 'var(--color-ink-soft)' }}
                labelStyle={{ color: 'var(--color-accent-soft)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-muted)' }} />
              <Line
                type="monotone"
                dataKey="smoothed"
                name="Smoothed"
                stroke="var(--color-accent-soft)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly averages table */}
      {trend.weeklyAverages.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-line">
            <span className="text-[13px] font-medium text-muted">Weekly Averages</span>
          </div>
          {trend.weeklyAverages
            .slice(-8)
            .reverse()
            .map((w, i) => (
              <div
                key={w.weekStart}
                className={`flex items-center justify-between px-3 py-2 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <span className="text-[15px] text-ink">
                  Week of {w.weekStart}
                  {w.isPartial && (
                    <span className="text-[11px] text-warning ml-1">(partial)</span>
                  )}
                </span>
                <span className="text-[15px] font-semibold text-ink">{w.avgWeight} kg</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
