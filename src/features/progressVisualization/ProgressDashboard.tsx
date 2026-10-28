/**
 * Feature 8 & 15: Progress Visualization — Dashboard Component
 *
 * Tabbed interface showing:
 * - Volume (per-routine individual charts — one card per routine)
 * - Weight trend (links to WeightTrendChart)
 * - Per-session volume comparison
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  computeRoutineVolumeSeries,
  computeWeeklyRoutineComparison,
  type RoutineVolumeSeries,
  type RoutineComparison,
} from './volumeUtils'
import WeightTrendChart from '../weightAveraging/WeightTrendChart'

type Tab = 'volume' | 'weight' | 'comparison'

// ─── Individual Routine Volume Card ──────────────────────────────────────────

function RoutineVolumeCard({ series }: { series: RoutineVolumeSeries }) {
  const tooltipStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: 4,
    color: 'var(--color-ink-soft)',
  }

  const gradId = `grad-${series.routineName.replace(/\s+/g, '-')}`

  return (
    <div className="bg-surface border border-line rounded-2xl p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[15px] font-semibold text-ink">{series.routineName}</p>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-lg"
          style={{ background: `${series.color}20`, color: series.color }}
        >
          {series.points.length} sessions
        </span>
      </div>
      <div style={{ height: 140, minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series.points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={series.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: string) => v.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [`${Number(v ?? 0).toLocaleString()} kg`, 'Volume']}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke={series.color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={series.points.length <= 10 ? { fill: series.color, r: 3, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: series.color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Volume Tab ───────────────────────────────────────────────────────────────

function VolumeTab({ series }: { series: RoutineVolumeSeries[] }) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted text-[15px]">
        Log your first workout to see volume trends.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {series.map(s => (
        <RoutineVolumeCard key={s.routineName} series={s} />
      ))}
    </div>
  )
}

// ─── Comparison Cards ─────────────────────────────────────────────────────────

function ComparisonCards({ comparisons }: { comparisons: RoutineComparison[] }) {
  if (comparisons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted text-[15px]">No data for this week yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {comparisons.map(c => {
        const up = c.delta >= 0
        const DeltaIcon = up ? TrendingUp : TrendingDown
        const color = up ? 'var(--color-success)' : 'var(--color-danger)'
        return (
          <div
            key={c.routineName}
            className="bg-surface border border-line rounded-2xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-semibold text-ink">{c.routineName}</span>
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
                <span className="text-[11px] text-muted">This Week</span>
                <span className="text-[16px] font-semibold text-ink">
                  {c.thisWeekVolume.toLocaleString()} kg
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted">Last Week</span>
                <span className="text-[16px] font-semibold text-muted">
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
    <div className="min-h-screen bg-ground pb-32">
      <header className="sticky top-0 z-50 bg-ground/90 backdrop-blur-md border-b border-line flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[20px] font-semibold text-ink absolute left-1/2 -translate-x-1/2">
          Progress
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-3 pt-4 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Tab bar */}
        <div className="flex bg-surface rounded-2xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-[14px] font-semibold transition-colors ${
                tab === t.key ? 'bg-accent text-ink' : 'text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'volume' && <VolumeTab series={series} />}
        {tab === 'weight' && <WeightTrendChart />}
        {tab === 'comparison' && <ComparisonCards comparisons={comparisons} />}
      </main>
    </div>
  )
}
