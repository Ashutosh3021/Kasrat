import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { db } from '../db/database'

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_AXES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const
type MuscleAxis = typeof MUSCLE_AXES[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekBounds(offset: number): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay() // 0 = Sun
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

  const { start, end } = weekBounds(weekOffset)

  useEffect(() => {
    async function load() {
      const allSets = await db.gym_sets.toArray()
      const inWeek = allSets.filter(s => {
        const d = new Date(s.created)
        return d >= start && d <= end && !s.hidden
      })

      const setsMap: Record<string, number> = {}
      const volMap: Record<string, number> = {}
      MUSCLE_AXES.forEach(m => { setsMap[m] = 0; volMap[m] = 0 })

      inWeek.forEach(s => {
        const muscle = (s.primaryMuscle ?? 'Other') as string
        if (MUSCLE_AXES.includes(muscle as MuscleAxis)) {
          setsMap[muscle as MuscleAxis] += 1
          volMap[muscle as MuscleAxis] += s.weight * s.reps
        }
      })

      const points: RadarPoint[] = MUSCLE_AXES.map(m => ({
        muscle: m,
        sets: setsMap[m],
        volume: Math.round(volMap[m]),
      }))

      setData(points)
      setHasData(inWeek.length > 0)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const dateRange = `${fmtDate(start)} – ${fmtDate(end)}`

  return (
    <div className="min-h-screen bg-[#151515] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#151515]/90 backdrop-blur-md border-b border-[#2C2C2E] flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">
          Weekly Stats
        </h1>
        <div className="w-10" />
      </header>

      <main className="px-3 pt-6 max-w-2xl mx-auto flex flex-col gap-6">

        {/* Week selector */}
        <div className="flex items-center justify-between bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] px-3 py-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 text-[#93032E] hover:opacity-80"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <span className="text-[15px] font-semibold text-white">{dateRange}</span>
          <button
            onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
            disabled={weekOffset === 0}
            className="p-2 text-[#93032E] disabled:opacity-30"
          >
            <ChevronRight size={20} strokeWidth={1.5} />
          </button>
        </div>

        {!hasData ? (
          <div className="text-center py-20">
            <p className="text-[17px] font-semibold text-white">No workouts this week</p>
            <p className="text-[13px] text-[#A1A1A6] mt-2">Log some sets to see your muscle balance.</p>
          </div>
        ) : (
          <>
            {/* Sets radar */}
            <section className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] p-3 flex flex-col gap-2">
              <p className="text-[15px] font-semibold text-white">Sets per Muscle Group</p>
              <p className="text-[13px] text-[#A1A1A6]">Total sets performed this week</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#2C2C2E" />
                    <PolarAngleAxis
                      dataKey="muscle"
                      tick={{ fill: '#A1A1A6', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }}
                      formatter={(v) => [`${v ?? 0} sets`, 'Sets']}
                    />
                    <Radar
                      name="Sets"
                      dataKey="sets"
                      stroke="#93032E"
                      fill="#93032E"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Volume radar */}
            <section className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] p-3 flex flex-col gap-2">
              <p className="text-[15px] font-semibold text-white">Volume per Muscle Group</p>
              <p className="text-[13px] text-[#A1A1A6]">Total kg lifted (reps × weight)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#2C2C2E" />
                    <PolarAngleAxis
                      dataKey="muscle"
                      tick={{ fill: '#A1A1A6', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }}
                      formatter={(v) => [`${Number(v ?? 0).toLocaleString()} kg`, 'Volume']}
                    />
                    <Radar
                      name="Volume"
                      dataKey="volume"
                      stroke="#93032E"
                      fill="#93032E"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Breakdown table */}
            <section className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#2C2C2E]">
                <p className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">Breakdown</p>
              </div>
              {data.filter(d => d.sets > 0).map((d, i, arr) => (
                <div
                  key={d.muscle}
                  className={`flex items-center justify-between px-3 py-3 ${i < arr.length - 1 ? 'border-b border-[#2C2C2E]' : ''}`}
                >
                  <span className="text-[15px] text-white">{d.muscle}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] text-[#A1A1A6]">{d.sets} sets</span>
                    <span className="text-[13px] font-semibold text-[#93032E]">{d.volume.toLocaleString()} kg</span>
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
