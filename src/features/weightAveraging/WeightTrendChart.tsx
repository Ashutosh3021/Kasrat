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
      <div className="h-48 flex items-center justify-center text-[#A1A1A6]">
        Loading…
      </div>
    )
  }

  if (trend.smoothedSeries.length === 0) {
    return (
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-4 text-center">
        <p className="text-[#A1A1A6] text-[15px]">Log your weight to see trends here.</p>
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
      ? '#A1A1A6'
      : trend.delta > 0
      ? '#FF453A'
      : '#30D158'

  return (
    <div className="flex flex-col gap-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[#A1A1A6] uppercase tracking-widest">This Week</span>
          <span className="text-[22px] font-semibold text-white">
            {trend.currentWeekAvg != null ? `${trend.currentWeekAvg} kg` : '—'}
          </span>
        </div>
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[#A1A1A6] uppercase tracking-widest">Last Week</span>
          <span className="text-[22px] font-semibold text-white">
            {trend.previousWeekAvg != null ? `${trend.previousWeekAvg} kg` : '—'}
          </span>
        </div>
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[#A1A1A6] uppercase tracking-widest">Trend</span>
          <div className="flex items-center gap-1">
            <DeltaIcon size={16} strokeWidth={1.5} style={{ color: deltaColor }} />
            <span className="text-[22px] font-semibold" style={{ color: deltaColor }}>
              {trend.delta != null
                ? `${trend.delta > 0 ? '+' : ''}${trend.delta} kg`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3">
        <p className="text-[13px] font-medium text-[#A1A1A6] mb-3">
          3-Day Smoothed Weight (kg)
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
              <XAxis dataKey="date" tick={{ fill: '#A1A1A6', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#A1A1A6', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }}
                labelStyle={{ color: '#93032E' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#A1A1A6' }} />
              <Line
                type="monotone"
                dataKey="smoothed"
                name="Smoothed"
                stroke="#93032E"
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
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#2C2C2E]">
            <span className="text-[13px] font-medium text-[#A1A1A6]">Weekly Averages</span>
          </div>
          {trend.weeklyAverages
            .slice(-8)
            .reverse()
            .map((w, i) => (
              <div
                key={w.weekStart}
                className={`flex items-center justify-between px-3 py-2 ${
                  i > 0 ? 'border-t border-[#2C2C2E]' : ''
                }`}
              >
                <span className="text-[15px] text-white">
                  Week of {w.weekStart}
                  {w.isPartial && (
                    <span className="text-[11px] text-[#FF9F0A] ml-1">(partial)</span>
                  )}
                </span>
                <span className="text-[15px] font-semibold text-white">{w.avgWeight} kg</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
