import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { db, type GymSet } from '../db/database'

export default function GlobalProgressPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'strength' | 'cardio'>('strength')
  const [volumeData, setVolumeData] = useState<{ week: string; volume: number }[]>([])
  const [topMovements, setTopMovements] = useState<{ name: string; best: string; cardio: boolean }[]>([])

  useEffect(() => {
    async function load() {
      const sets = await db.gym_sets.toArray()
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

  return (
    <div className="min-h-screen bg-black pb-24 pt-14">
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800 flex items-center px-4 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} />
        </button>
        <span className="text-xl font-black tracking-tighter text-[#3B82F6] absolute left-1/2 -translate-x-1/2">KASRAT</span>
      </header>

      <main className="px-4 py-3">
        <div className="mb-8">
          <h2 className="text-[22px] font-semibold text-white mb-4">Progress</h2>
          <div className="flex border-b border-[#424754] mb-4">
            {(['strength', 'cardio'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 pb-2 border-b-2 font-semibold text-[15px] text-center transition-colors ${
                  tab === t ? 'border-[#adc6ff] text-[#adc6ff]' : 'border-transparent text-[#c6c6cb]'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-[#1f1f21] rounded-lg p-3 mb-8 border border-[#424754]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[17px] text-white">Aggregated Volume</h3>
            <span className="text-[13px] font-medium text-[#c6c6cb]">Total {tab === 'cardio' ? 'km' : 'kg'}</span>
          </div>
          <div className="h-48 w-full">
            {volumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#adc6ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#adc6ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                  <XAxis dataKey="week" tick={{ fill: '#8c909f', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8c909f', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 8, color: '#e4e2e4' }} />
                  <Area type="monotone" dataKey="volume" stroke="#adc6ff" strokeWidth={2} fill="url(#vGrad)" dot={{ fill: '#adc6ff', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#8c909f]">No data yet</div>
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
                className="bg-[#1f1f21] rounded-lg p-3 border border-[#424754] flex items-center justify-between group hover:border-[#adc6ff] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#353437] flex items-center justify-center text-[#adc6ff]">
                    {m.cardio ? '🏃' : '🏋️'}
                  </div>
                  <div className="text-left">
                    <h4 className="text-[17px] text-white">{m.name}</h4>
                    <p className="text-[13px] font-medium text-[#c6c6cb]">Best: {m.best}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[#c6c6cb] group-hover:text-[#adc6ff] transition-colors" />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
