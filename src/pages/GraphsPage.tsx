import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, SlidersHorizontal } from 'lucide-react'
import TopBar from '../components/TopBar'
import { db, type GymSet } from '../db/database'
import { useUIStore } from '../store/uiStore'
import GraphsFilter from '../overlays/GraphsFilter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExerciseSummary {
  name: string
  category: string
  primaryMuscle: string
  lastUsed: string
  cardio: boolean
  totalSessions: number
  bestWeight: number
  /** best value per calendar day, last 6 days, chronological */
  bestPerDay: number[]
}

interface SessionPoint {
  date: string   // "MM-DD" for display
  volume: number // total kg moved across ALL exercises that day
}

type SortMode = 'recent' | 'name' | 'best' | 'sessions'

const SORT_LABELS: Record<SortMode, string> = {
  recent:   'Recent',
  name:     'Name',
  best:     'Best Weight',
  sessions: 'Sessions',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Best value (max weight or max distance) per calendar day, last 6 days, chronological */
function bestPerDayFor(sets: GymSet[]): number[] {
  const byDay: Record<string, number> = {}
  sets.forEach(s => {
    const day = s.created.slice(0, 10)
    const val = s.cardio ? s.distance : s.weight
    byDay[day] = Math.max(byDay[day] ?? 0, val)
  })
  return Object.keys(byDay).sort().slice(-6).map(d => byDay[d])
}

/**
 * Plan-session volume: group ALL real sets by calendar day,
 * sum weight×reps (or distance) for every set that day.
 * Returns last 8 days that had activity, chronological.
 */
function planSessionPoints(sets: GymSet[]): SessionPoint[] {
  const byDay: Record<string, number> = {}
  sets.forEach(s => {
    // skip hidden placeholder rows (weight=0, reps=0)
    if (s.hidden && s.weight === 0 && s.reps === 0 && s.distance === 0) return
    const day = s.created.slice(0, 10)
    const vol = s.cardio ? s.distance : s.weight * s.reps
    byDay[day] = (byDay[day] ?? 0) + vol
  })
  return Object.keys(byDay)
    .sort()
    .slice(-8)
    .map(d => ({ date: d.slice(5), volume: byDay[d] })) // "MM-DD"
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
// Matches the demo: path-based, always renders even with 1 point (flat line)

function Sparkline({ values, color = '#3B82F6' }: { values?: number[]; color?: string }) {
  if (!values || values.length === 0) return null

  const W = 60, H = 30
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  // Build SVG path string — works for 1 or more points
  const points = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : (i / (values.length - 1)) * W
    const y = H - 4 - ((v - min) / range) * (H - 8)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  })

  // For a single point draw a small horizontal tick so it's visible
  const d = values.length === 1
    ? `M${W / 2 - 4},${H / 2} L${W / 2 + 4},${H / 2}`
    : points.join(' ')

  return (
    <div className="w-16 h-8 flex items-center justify-center opacity-90 shrink-0">
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${W} ${H}`}>
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ─── Sessions bar chart ───────────────────────────────────────────────────────

function SessionsChart({ points }: { points: SessionPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="w-full bg-[#1C1C1E] rounded-xl p-4 border border-[#2C2C2E] text-center">
        <p className="text-[13px] text-[#8c909f]">No session data yet — log some sets first!</p>
      </div>
    )
  }

  const max = Math.max(...points.map(p => p.volume))

  return (
    <div className="w-full bg-[#1C1C1E] rounded-xl p-4 border border-[#2C2C2E] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[#8c909f] uppercase tracking-widest">
          Total volume per session
        </p>
        <p className="text-[13px] text-[#a78bfa] font-semibold">
          Peak {max.toLocaleString()} kg
        </p>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1.5 h-24">
        {points.map(p => {
          const pct = max > 0 ? (p.volume / max) * 100 : 4
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-[#a78bfa] font-semibold leading-none">
                {p.volume >= 1000 ? `${(p.volume / 1000).toFixed(1)}k` : p.volume}
              </p>
              <div className="w-full flex flex-col justify-end" style={{ height: '60px' }}>
                <div
                  className="w-full rounded-t-[3px] bg-[#a78bfa] transition-all duration-300"
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <p className="text-[9px] text-[#8c909f] font-medium leading-none">{p.date}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GraphsPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<ExerciseSummary[]>([])
  const [sessionPoints, setSessionPoints] = useState<SessionPoint[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const { graphsFilterOpen, openGraphsFilter, closeGraphsFilter } = useUIStore()

  useEffect(() => {
    async function load() {
      const allSets = await db.gym_sets.toArray()

      // Sessions chart — plan-level daily volume
      setSessionPoints(planSessionPoints(allSets))

      // Per-exercise summaries
      const map: Record<string, GymSet[]> = {}
      allSets.forEach(s => {
        if (!map[s.name]) map[s.name] = []
        map[s.name].push(s)
      })

      const summaries: ExerciseSummary[] = Object.entries(map)
        .filter(([, items]) => items.some(
          s => !s.hidden || s.reps > 0 || s.weight > 0 || s.distance > 0
        ))
        .map(([name, items]) => {
          const real = items.filter(s => !s.hidden || s.reps > 0 || s.weight > 0 || s.distance > 0)
          const sorted = [...real].sort(
            (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
          )
          return {
            name,
            category: items[0].cardio ? 'Cardio' : (items[0].bodyWeight ? 'Bodyweight' : 'Strength'),
            primaryMuscle: items[0].primaryMuscle || 'Other',
            lastUsed: sorted[0]?.created ?? items[0].created,
            cardio: items[0].cardio,
            totalSessions: new Set(real.map(s => s.created.slice(0, 10))).size,
            bestWeight: Math.max(...real.map(s => s.cardio ? s.distance : s.weight), 0),
            bestPerDay: bestPerDayFor(real),
          }
        })

      setExercises(summaries)
    }
    load()
  }, [])

  const filtered = exercises
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name')     return a.name.localeCompare(b.name)
      if (sort === 'recent')   return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      if (sort === 'best')     return b.bestWeight - a.bestWeight
      if (sort === 'sessions') return b.totalSessions - a.totalSessions
      return 0
    })

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)  return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  }

  return (
    <div className="min-h-screen bg-black pb-24 pt-14">
      <TopBar />
      <main className="px-4 pt-6 max-w-3xl mx-auto flex flex-col gap-6">

        {/* Search */}
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-12 bg-[#1C1C1E] border border-white/20 rounded-lg pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-[#3B82F6] text-[17px]"
            placeholder="Search exercises..."
          />
        </div>

        {/* Sort pills */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {(Object.keys(SORT_LABELS) as SortMode[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold text-[15px] transition-colors ${
                sort === s
                  ? 'bg-[#3B82F6]/10 border border-[#3B82F6] text-[#3B82F6]'
                  : 'bg-[#1C1C1E] border border-[#2C2C2E] text-zinc-400'
              }`}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Sessions view — chart replaces the exercise list */}
        {sort === 'sessions' ? (
          <SessionsChart points={sessionPoints} />
        ) : (
          /* Exercise list for all other sort modes */
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#c6c6cb] text-[15px]">No exercises yet. Log some sets first!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((ex, i) => (
                <button
                  key={ex.name}
                  onClick={() => navigate(
                    ex.cardio
                      ? `/cardio-graph/${encodeURIComponent(ex.name)}`
                      : `/graphs/${encodeURIComponent(ex.name)}`
                  )}
                  className={`flex items-center justify-between py-4 hover:bg-zinc-900/30 transition-colors px-2 -mx-2 rounded-lg group ${
                    i < filtered.length - 1 ? 'border-b border-[#2C2C2E]' : ''
                  }`}
                >
                  {/* Left: name + muscle chip */}
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-[17px] text-white font-medium group-hover:text-[#3B82F6] transition-colors">
                      {ex.name}
                    </span>
                    <span className="inline-block px-2 py-0.5 bg-[#2C2C2E] text-white rounded-full text-[11px] w-fit">
                      {ex.primaryMuscle}
                    </span>
                  </div>

                  {/* Right: sparkline + trailing label */}
                  <div className="flex items-center gap-4">
                    <Sparkline values={ex.bestPerDay} color="#3B82F6" />
                    <span className="text-[13px] font-medium text-zinc-500 w-20 text-right">
                      {timeAgo(ex.lastUsed)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </main>

      <button
        onClick={() => navigate('/add-exercise')}
        className="fixed bottom-20 right-6 w-14 h-14 bg-[#3B82F6] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95 transition-transform z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      <button
        onClick={openGraphsFilter}
        className="fixed bottom-20 right-24 w-12 h-12 bg-[#1C1C1E] border border-[#2C2C2E] rounded-full flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <SlidersHorizontal size={20} className="text-zinc-400" />
      </button>

      {graphsFilterOpen && <GraphsFilter onClose={closeGraphsFilter} />}
    </div>
  )
}
