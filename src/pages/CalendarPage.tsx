import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { db, type GymSet } from '../db/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay() // 0=Sun
}

/** Interpolate between var(--color-surface) (no volume) and var(--color-accent-soft) (max volume) */
function heatColor(volume: number, max: number): string {
  if (max === 0 || volume === 0) return 'var(--color-surface)'
  const t = Math.min(volume / max, 1)
  // Lerp from rgb(28,28,30) → rgb(59,130,246)
  const r = Math.round(28  + (59  - 28)  * t)
  const g = Math.round(28  + (130 - 28)  * t)
  const b = Math.round(30  + (246 - 30)  * t)
  return `rgb(${r},${g},${b})`
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa']

// ─── Day detail bottom sheet ──────────────────────────────────────────────────

interface DaySheetProps {
  date: string
  sets: GymSet[]
  onClose: () => void
  onViewAll: () => void
}

function DaySheet({ date, sets, onClose, onViewAll }: DaySheetProps) {
  const d = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Group by exercise name
  const byEx: Record<string, number> = {}
  sets.forEach(s => { byEx[s.name] = (byEx[s.name] ?? 0) + 1 })
  const exercises = Object.entries(byEx).sort((a, b) => b[1] - a[1])

  const totalVol = sets.reduce((acc, s) => acc + s.weight * s.reps, 0)

  return (
    <div className="fixed inset-0 bg-ground/70 z-[80] flex flex-col justify-end animate-fadeIn" onClick={onClose}>
      <div
        className="bg-surface rounded-t-[4px] border-t border-line p-3 flex flex-col gap-3 animate-slideUp max-h-[70dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-line-strong rounded-full mx-auto" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[16px] font-semibold text-ink">{label}</p>
            <p className="text-[13px] text-muted">{sets.length} sets · {Math.round(totalVol).toLocaleString()} kg volume</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:text-ink">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {exercises.length === 0 ? (
          <p className="text-muted text-[15px] text-center py-4">Rest day</p>
        ) : (
          <div className="flex flex-col gap-2">
            {exercises.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between bg-ground-deep rounded-2xl px-3 py-2">
                <span className="text-[15px] text-ink">{name}</span>
                <span className="text-[13px] font-medium text-muted">{count} {count === 1 ? 'set' : 'sets'}</span>
              </div>
            ))}
          </div>
        )}

        {exercises.length > 0 && (
          <button
            onClick={onViewAll}
            className="w-full h-11 bg-accent text-ink rounded-lg font-semibold text-[15px]"
          >
            View in History
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [allSets, setAllSets] = useState<GymSet[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    db.gym_sets.toArray().then(sets => {
      setAllSets(sets.filter(s => !s.hidden || s.reps > 0 || s.weight > 0))
    })
  }, [])

  // Volume per day for the visible month — memoised
  const { volumeByDay, maxVolume } = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay  = new Date(year, month + 1, 0)
    const first = isoDate(firstDay)
    const last  = isoDate(lastDay)

    const vol: Record<string, number> = {}
    allSets.forEach(s => {
      const d = s.created.slice(0, 10)
      if (d >= first && d <= last) {
        vol[d] = (vol[d] ?? 0) + s.weight * s.reps
      }
    })
    const max = Math.max(0, ...Object.values(vol))
    return { volumeByDay: vol, maxVolume: max }
  }, [allSets, year, month])

  // Recent workout days (last 10 distinct days with sets)
  const recentDays = useMemo(() => {
    const days = new Set<string>()
    allSets.forEach(s => days.add(s.created.slice(0, 10)))
    return Array.from(days).sort().reverse().slice(0, 10)
  }, [allSets])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const totalDays = daysInMonth(year, month)
  const startDay  = firstDayOfMonth(year, month)
  // Build grid cells: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedSets = selectedDate
    ? allSets.filter(s => s.created.slice(0, 10) === selectedDate)
    : []

  return (
    <div className="min-h-screen bg-ground pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-ground/90 backdrop-blur-md border-b border-line flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-semibold text-ink absolute left-1/2 -translate-x-1/2">
          Workout Calendar
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-3 pt-3 max-w-lg mx-auto flex flex-col gap-6">

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 text-accent-soft hover:opacity-80">
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[24px] font-semibold text-ink">
              {MONTH_NAMES[month]} {year}
            </span>
            {/* Heat-map legend */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-muted">Low</span>
              <div
                className="w-16 h-2 rounded-full"
                style={{ background: 'linear-gradient(to right, var(--color-surface), var(--color-accent-soft))' }}
              />
              <span className="text-[11px] text-muted">High</span>
            </div>
          </div>
          <button
            onClick={nextMonth}
            disabled={year === today.getFullYear() && month === today.getMonth()}
            className="p-2 text-accent-soft disabled:opacity-30"
          >
            <ChevronRight size={22} strokeWidth={1.5} />
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[11px] font-medium text-muted py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`blank-${idx}`} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const vol = volumeByDay[dateStr] ?? 0
            const bg  = heatColor(vol, maxVolume)
            const isToday = dateStr === isoDate(today)
            const isSelected = dateStr === selectedDate
            const hasData = vol > 0

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                style={{ backgroundColor: bg }}
                className={`
                  aspect-square rounded-2xl flex items-center justify-center text-[13px] font-semibold
                  transition-all active:scale-90 min-h-[44px]
                  ${isToday ? 'ring-2 ring-accent-soft ring-offset-1 ring-offset-black' : ''}
                  ${isSelected ? 'ring-2 ring-ink ring-offset-1 ring-offset-black' : ''}
                  ${hasData ? 'text-ink' : 'text-muted-dim'}
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Recent workout days strip */}
        {recentDays.length > 0 && (
          <section>
            <p className="text-[13px] font-medium text-muted uppercase tracking-widest mb-3">Recent Workouts</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentDays.map(d => {
                const date = new Date(d + 'T00:00:00')
                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const sets = allSets.filter(s => s.created.slice(0, 10) === d)
                const exCount = new Set(sets.map(s => s.name)).size
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setYear(date.getFullYear())
                      setMonth(date.getMonth())
                      setSelectedDate(d)
                    }}
                    className="shrink-0 bg-surface border border-line rounded-2xl px-3 py-2 flex flex-col items-center gap-0.5 hover:border-accent-hover/50 transition-colors"
                  >
                    <span className="text-[13px] font-semibold text-ink">{label}</span>
                    <span className="text-[11px] text-muted">{exCount} ex</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* Day detail sheet */}
      {selectedDate && (
        <DaySheet
          date={selectedDate}
          sets={selectedSets}
          onClose={() => setSelectedDate(null)}
          onViewAll={() => navigate('/history')}
        />
      )}
    </div>
  )
}
