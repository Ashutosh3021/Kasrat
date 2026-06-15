/**
 * Feature 8 & 15: Progress Visualization — Dashboard Component
 *
 * Tabbed interface showing:
 * - Volume (per-routine multi-line chart)
 * - Weight trend (links to WeightTrendChart)
 * - Per-session volume comparison
 *
 * This is a standalone page/component — wire it up via a new route.
 * It does NOT modify any existing page.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  computeRoutineVolumeSeries,
  computeWeeklyRoutineComparison,
  type RoutineVolumeSeries,
  type RoutineComparison,
} from './volumeUtils'
import WeightTrendChart from '../weightAveraging/WeightTrendChart'

type Tab = 'volume' | 'weight' | 'comparison'

// ─── Volume Chart ─────────────────────────────────────────────────────────────

function VolumeChart({ series }: { series: RoutineVolumeSeries[] }) {
  if (series.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-[#A1A1A6] text-[15px]">
        Log your first workout to see volume trends.
      </div>
    )
  }

  // Merge all dates into one dataset for recharts
  const allDates = Array.from(
    new Set(series.flatMap(s => s.points.map(p => p.date))),
  ).sort()

  const chartData = allDates.map(date => {
    const row: Record<string, unknown> = { date: date.slice(5) }
    series.forEach(s => {
      const pt = s.points.find(p => p.date === date)
      if (pt) row[s.routineName] = pt.volume
    })
    return row
  })

  return (
    <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3">
      <p className="text-[13px] font-medium text-[#A1A1A6] mb-3">
        Volume per Session (kg lifted)
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
            <XAxis dataKey="date" tick={{ fill: '#A1A1A6', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#A1A1A6', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#A1A1A6' }} />
            {series.map(s => (
              <Line
                key={s.routineName}
                type="monotone"
                dataKey={s.routineName}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Comparison Cards ─────────────────────────────────────────────────────────

function ComparisonCards({ comparisons }: { comparisons: RoutineComparison[] }) {
  if (comparisons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#A1A1A6] text-[15px]">No data for this week yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {comparisons.map(c => {
        const up = c.delta >= 0
        const DeltaIcon = up ? TrendingUp : TrendingDown
        const color = up ? '#30D158' : '#FF453A'
        return (
          <div
            key={c.routineName}
            className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-[4px] p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-semibold text-white">{c.routineName}</span>
              <div className="flex items-center gap-1">
                <DeltaIcon size={14} strokeWidth={1.5} style={{ color }} />
                <span className="text-[13px] font-semibold" style={{ color }}>
                  {c.delta > 0 ? '+' : ''}{c.delta.toLocaleString()} kg
                  {c.deltaPercent !== 0 && ` (${c.deltaPercent > 0 ? '+' : ''}${c.deltaPercent}%)`}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-[#A1A1A6]">This Week</span>
                <span className="text-[17px] font-semibold text-white">
                  {c.thisWeekVolume.toLocaleString()} kg
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-[#A1A1A6]">Last Week</span>
                <span className="text-[17px] font-semibold text-[#A1A1A6]">
                  {c.lastWeekVolume > 0 ? `${c.lastWeekVolume.toLocaleString()} kg` : '—'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('volume')
  const [series, setSeries] = useState<RoutineVolumeSeries[]>([])
  const [comparisons, setComparisons] = useState<RoutineComparison[]>([])

  useEffect(() => {
    computeRoutineVolumeSeries().then(setSeries)
    computeWeeklyRoutineComparison().then(setComparisons)
  }, [])

  const TABS: { key: Tab; label: string }[] = [
    { key: 'volume', label: 'Volume' },
    { key: 'weight', label: 'Weight' },
    { key: 'comparison', label: 'Compare' },
  ]

  return (
    <div className="min-h-screen bg-[#151515] pb-24">
      <header className="sticky top-0 z-50 bg-[#151515]/90 backdrop-blur-md border-b border-[#2C2C2E] flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[20px] font-semibold text-white absolute left-1/2 -translate-x-1/2">
          Progress
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-3 pt-4 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Tab bar */}
        <div className="flex bg-[#1C1C1E] rounded-[4px] p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-[2px] text-[14px] font-semibold transition-colors ${
                tab === t.key ? 'bg-[#93032E] text-white' : 'text-[#A1A1A6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'volume' && <VolumeChart series={series} />}
        {tab === 'weight' && <WeightTrendChart />}
        {tab === 'comparison' && <ComparisonCards comparisons={comparisons} />}
      </main>
    </div>
  )
}
