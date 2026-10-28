import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { db } from '../db/database'
import { RADAR_MUSCLE_AXES, toRadarMuscleAxis, type RadarMuscleAxis } from '../utils/muscleMapping'

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_AXES = RADAR_MUSCLE_AXES
type MuscleAxis = RadarMuscleAxis

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekBounds(offset: number): { start: Date; end: Date } {
  const now = new Date()
  // STATS-004: Monday-start week (getDay() 0=Sun → shift so Mon=0, Sun=6)
  const day = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setDate(now.getDate() - day + offset * 7)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface RadarPoint { muscle: MuscleAxis; sets: number; volume: number }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const navigate = useNavigate()
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<RadarPoint[]>([])
  const [hasData, setHasData] = useState(false)

  const loadWeekStats = useCallback(async (offset: number) => {
    const { start, end } = weekBounds(offset)
    const allSets = await db.gym_sets.toArray()
    const inWeek = allSets.filter(s => {
      const d = new Date(s.created)
      // Include both strength and cardio sets; exclude hidden placeholder rows
      return d >= start && d <= end && !s.hidden
    })

    const setsMap: Record<MuscleAxis, number> = {} as Record<MuscleAxis, number>
    const volMap: Record<MuscleAxis, number> = {} as Record<MuscleAxis, number>
    MUSCLE_AXES.forEach(m => { setsMap[m] = 0; volMap[m] = 0 })

    inWeek.forEach(s => {
      const axis = toRadarMuscleAxis(s.primaryMuscle)
      if (axis) {
        setsMap[axis] += 1
        volMap[axis] += s.weight * s.reps
      }
    })

    const points: RadarPoint[] = MUSCLE_AXES.map(m => ({
      muscle: m,
      sets: setsMap[m],
      volume: Math.round(volMap[m]),
    }))

    setData(points)
    // hasData is true when there are ANY non-hidden sets in the week,
    // regardless of whether their primaryMuscle maps to a radar axis.
    // This prevents "No workouts this week" when exercises like "Other"
    // or unmapped muscle groups exist but don't appear on the radar axes.
    setHasData(inWeek.length > 0)
  }, [])

  const { start, end } = weekBounds(weekOffset)

  useEffect(() => {
    loadWeekStats(weekOffset)
  }, [weekOffset, loadWeekStats])

  const dateRange = `${fmtDate(start)} – ${fmtDate(end)}`

  return (
    <div className="min-h-screen bg-ground pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-ground/90 backdrop-blur-md border-b border-line flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-semibold text-ink absolute left-1/2 -translate-x-1/2">
          Weekly Stats
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-3 pt-6 max-w-2xl mx-auto flex flex-col gap-6">

        {/* Week selector */}
        <div className="flex items-center justify-between bg-surface rounded-2xl border border-line px-3 py-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 text-accent-soft hover:opacity-80"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <span className="text-[15px] font-semibold text-ink">{dateRange}</span>
          <button
            onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
            disabled={weekOffset === 0}
            className="p-2 text-accent-soft disabled:opacity-30"
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>

        {!hasData ? (
          <div className="text-center py-20">
            <p className="text-[16px] font-semibold text-ink">No workouts this week</p>
            <p className="text-[13px] text-muted mt-2">Log some sets to see your muscle balance.</p>
          </div>
        ) : (
          <>
            {/* Sets radar */}
            <section className="bg-surface rounded-2xl border border-line p-3 flex flex-col gap-2">
              <p className="text-[15px] font-semibold text-ink">Sets per Muscle Group</p>
              <p className="text-[13px] text-muted">Total sets performed this week</p>
              {/* Fixed pixel height avoids Recharts -1 width/height error */}
              <div style={{ width: '100%', height: 256 }}>
                <ResponsiveContainer width="100%" height={256}>
                  <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="var(--color-line)" />
                    <PolarAngleAxis
                      dataKey="muscle"
                      tick={{ fill: 'var(--color-muted)', fontSize: 12, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 4, color: 'var(--color-ink-soft)' }}
                      formatter={(v) => [`${v ?? 0} sets`, 'Sets']}
                    />
                    <Radar
                      name="Sets"
                      dataKey="sets"
                      stroke="var(--color-accent-soft)"
                      fill="var(--color-accent-soft)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Volume radar */}
            <section className="bg-surface rounded-2xl border border-line p-3 flex flex-col gap-2">
              <p className="text-[15px] font-semibold text-ink">Volume per Muscle Group</p>
              <p className="text-[13px] text-muted">Total kg lifted (reps × weight)</p>
              {/* Fixed pixel height avoids Recharts -1 width/height error */}
              <div style={{ width: '100%', height: 256 }}>
                <ResponsiveContainer width="100%" height={256}>
                  <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="var(--color-line)" />
                    <PolarAngleAxis
                      dataKey="muscle"
                      tick={{ fill: 'var(--color-muted)', fontSize: 12, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 4, color: 'var(--color-ink-soft)' }}
                      formatter={(v) => [`${Number(v ?? 0).toLocaleString()} kg`, 'Volume']}
                    />
                    <Radar
                      name="Volume"
                      dataKey="volume"
                      stroke="var(--color-accent-soft)"
                      fill="var(--color-accent-soft)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Breakdown table */}
            <section className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="px-3 py-2 border-b border-line">
                <p className="text-[13px] font-medium text-muted uppercase tracking-widest">Breakdown</p>
              </div>
              {data.filter(d => d.sets > 0).map((d, i, arr) => (
                <div
                  key={d.muscle}
                  className={`flex items-center justify-between px-3 py-3 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}
                >
                  <span className="text-[15px] text-ink">{d.muscle}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] text-muted">{d.sets} sets</span>
                    <span className="text-[13px] font-semibold text-accent-soft">{d.volume.toLocaleString()} kg</span>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
