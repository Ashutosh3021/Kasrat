import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line,
} from 'recharts'
import { db, type GymSet } from '../db/database'

// ─── Brzycki 1RM ─────────────────────────────────────────────────────────────
function brzycki(w: number, r: number): number | null {
  if (w <= 0 || r <= 0 || r >= 37) return null
  return Math.round(w * (36 / (37 - r)))
}

// ─── ISO week key ─────────────────────────────────────────────────────────────
function isoWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + 1)
  return mon.toISOString().slice(0, 10)
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const
type MuscleGroup = typeof MUSCLE_GROUPS[number]

// ─── By Muscle tab ────────────────────────────────────────────────────────────

function ByMuscleTab({ allSets }: { allSets: GymSet[] }) {
  const [muscle, setMuscle] = useState<MuscleGroup>('Chest')

  const { ormData, volumeData } = useMemo(() => {
    const real = allSets.filter(s => !s.hidden && !s.cardio && s.reps > 0 && s.weight > 0)
    const forMuscle = real.filter(s => (s.primaryMuscle ?? 'Other') === muscle)

    // Best 1RM per exercise
    const ormMap: Record<string, number> = {}
    forMuscle.forEach(s => {
      const orm = brzycki(s.weight, s.reps)
      if (orm != null) {
        ormMap[s.name] = Math.max(ormMap[s.name] ?? 0, orm)
      }
    })
    const ormData = Object.entries(ormMap)
      .map(([name, orm]) => ({ name, orm }))
      .sort((a, b) => b.orm - a.orm)

    // Weekly volume (last 8 weeks)
    const weekMap: Record<string, number> = {}
    forMuscle.forEach(s => {
      const wk = isoWeek(s.created)
      weekMap[wk] = (weekMap[wk] ?? 0) + s.weight * s.reps
    })
    const volumeData = Object.keys(weekMap)
      .sort()
      .slice(-8)
      .map(wk => ({
        week: wk.slice(5),   // "MM-DD"
        volume: Math.round(weekMap[wk]),
      }))

    return { ormData, volumeData }
  }, [allSets, muscle])

  const tooltipStyle = { background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }

  return (
    <div className="flex flex-col gap-6">
      {/* Muscle selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MUSCLE_GROUPS.map(m => (
          <button
            key={m}
            onClick={() => setMuscle(m)}
            className={`shrink-0 px-3 py-2 rounded-[2px] font-semibold text-[15px] transition-colors ${
              muscle === m
                ? 'bg-[#93032E] text-white'
                : 'bg-[#1C1C1E] border border-[#2C2C2E] text-[#A1A1A6]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {ormData.length === 0 && volumeData.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#A1A1A6] text-[15px]">No exercises for {muscle} yet</p>
        </div>
      ) : (
        <>
          {/* Best 1RM bar chart */}
          {ormData.length > 0 && (
            <section className="bg-[#1C1C1E] rounded-[4px] p-3 border border-[#2C2C2E]">
              <p className="text-[15px] font-semibold text-white mb-1">Best Estimated 1RM</p>
              <p className="text-[13px] text-[#A1A1A6] mb-4">Per exercise in {muscle}</p>
              <div style={{ height: Math.max(ormData.length * 44, 120) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ormData} layout="vertical" margin={{ left: 8, right: 32 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"   stopColor="#93032E" />
                        <stop offset="100%" stopColor="#BE1755" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#A1A1A6', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#A1A1A6', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} kg`, '1RM']} />
                    <Bar dataKey="orm" radius={[0, 4, 4, 0]} fill="url(#barGrad)">
                      {ormData.map((_, i) => (
                        <Cell key={i} fill="url(#barGrad)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Weekly volume line chart */}
          {volumeData.length > 0 && (
            <section className="bg-[#1C1C1E] rounded-[4px] p-3 border border-[#2C2C2E]">
              <p className="text-[15px] font-semibold text-white mb-1">Weekly Volume</p>
              <p className="text-[13px] text-[#A1A1A6] mb-4">Last 8 weeks · {muscle}</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                    <XAxis dataKey="week" tick={{ fill: '#A1A1A6', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#A1A1A6', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toLocaleString()} kg`, 'Volume']} />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="#93032E"
                      strokeWidth={2}
                      dot={{ fill: '#000', stroke: '#93032E', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'strength' | 'cardio' | 'muscle'

export default function GlobalProgressPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('strength')
  const [allSets, setAllSets] = useState<GymSet[]>([])
  const [volumeData, setVolumeData] = useState<{ week: string; volume: number }[]>([])
  const [topMovements, setTopMovements] = useState<{ name: string; best: string; cardio: boolean }[]>([])

  useEffect(() => {
    async function load() {
      const sets = await db.gym_sets.toArray()
      setAllSets(sets)

      if (tab === 'muscle') return  // handled by ByMuscleTab

      const filtered = sets.filter(s => tab === 'cardio' ? s.cardio : !s.cardio)
      const weekMap: Record<string, number> = {}
      filtered.forEach(s => {
        const d = new Date(s.created)
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        const key = `W${Math.ceil(weekStart.getDate() / 7)}`
        weekMap[key] = (weekMap[key] ?? 0) + (s.cardio ? s.distance : s.weight * s.reps)
      })
      setVolumeData(Object.entries(weekMap).map(([week, volume]) => ({ week, volume })))

      const nameMap: Record<string, GymSet[]> = {}
      filtered.forEach(s => {
        if (!nameMap[s.name]) nameMap[s.name] = []
        nameMap[s.name].push(s)
      })
      const top = Object.entries(nameMap)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .map(([name, items]) => {
          const best = items.reduce((a, b) => (b.weight > a.weight ? b : a), items[0])
          return { name, best: `${best.weight} kg`, cardio: items[0].cardio }
        })
      setTopMovements(top)
    }
    load()
  }, [tab])

  const tooltipStyle = { background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }

  return (
    <div className="min-h-screen bg-[#151515] pb-24 pt-14">
      <header className="fixed top-0 w-full z-50 bg-[#151515]/80 backdrop-blur-md border-b border-zinc-800 flex items-center px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <span className="text-xl font-black tracking-tighter text-[#93032E] absolute left-1/2 -translate-x-1/2">KASRAT</span>
      </header>

      <main className="px-3 py-3">
        <div className="mb-6">
          <h2 className="text-[22px] font-semibold text-white mb-4">Progress</h2>
          <div className="flex border-b border-[#2C2C2E] mb-4">
            {(['strength', 'cardio', 'muscle'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 pb-2 border-b-2 font-semibold text-[15px] text-center transition-colors capitalize ${
                  tab === t ? 'border-[#93032E] text-[#93032E]' : 'border-transparent text-[#A1A1A6]'
                }`}
              >
                {t === 'muscle' ? 'By Muscle' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {tab === 'muscle' ? (
          <ByMuscleTab allSets={allSets} />
        ) : (
          <>
            <section className="bg-[#1C1C1E] rounded-[4px] p-3 mb-8 border border-[#2C2C2E]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[17px] text-white">Aggregated Volume</h3>
                <span className="text-[13px] font-medium text-[#A1A1A6]">Total {tab === 'cardio' ? 'km' : 'kg'}</span>
              </div>
              <div className="h-48 w-full">
                {volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeData}>
                      <defs>
                        <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#93032E" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#93032E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                      <XAxis dataKey="week" tick={{ fill: '#A1A1A6', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#A1A1A6', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="volume" stroke="#93032E" strokeWidth={2} fill="url(#vGrad)" dot={{ fill: '#93032E', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#A1A1A6]">No data yet</div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[22px] font-semibold text-white mb-4">Top Movements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topMovements.map(m => (
                  <button
                    key={m.name}
                    onClick={() => navigate(m.cardio ? `/cardio-graph/${encodeURIComponent(m.name)}` : `/graphs/${encodeURIComponent(m.name)}`)}
                    className="bg-[#1C1C1E] rounded-[4px] p-3 border border-[#2C2C2E] flex items-center justify-between group hover:border-[#93032E] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <h4 className="text-[17px] text-white">{m.name}</h4>
                        <p className="text-[13px] font-medium text-[#A1A1A6]">Best: {m.best}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} strokeWidth={1.5} className="text-[#A1A1A6] group-hover:text-[#93032E] transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
