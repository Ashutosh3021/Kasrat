import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { db, type GymSet } from '../db/database'
import { formatDate } from '../utils/dateUtils'
import { useSettingsStore } from '../store/settingsStore'

type CardioMetric = 'duration' | 'distance' | 'pace' | 'incline'

export default function CardioGraphPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const [sets, setSets] = useState<GymSet[]>([])
  const [metric, setMetric] = useState<CardioMetric>('distance')

  useEffect(() => {
    if (!name) return
    db.gym_sets.where('name').equals(decodeURIComponent(name)).toArray().then(s => {
      setSets(s.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()))
    })
  }, [name])

  const chartData = sets.slice(0, 10).map(s => ({
    date: formatDate(s.created),
    value: metric === 'duration' ? s.duration
      : metric === 'distance' ? s.distance
      : metric === 'pace' ? (s.duration / 60 / s.distance)
      : (s.incline ?? 0)
  })).reverse()

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800 flex items-center px-4 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[32px] font-bold leading-10 tracking-tight text-white ml-2 flex items-center gap-2">
          {decodeURIComponent(name ?? '')}
          <button onClick={() => navigate(`/edit-graph/${name}`)} className="p-1 text-[#8c909f] hover:text-white">
            <Edit2 size={18} />
          </button>
        </h1>
      </header>

      <main className="pt-20 px-4 max-w-3xl mx-auto space-y-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['duration', 'distance', 'pace', 'incline'] as CardioMetric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-5 py-2.5 rounded-full text-[15px] font-semibold whitespace-nowrap transition-all ${
                metric === m ? 'bg-[#adc6ff] text-[#002e6a]' : 'bg-[#1f1f21] border border-[#353437] text-[#c2c6d6]'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-[#1f1f21] rounded-lg p-3 border border-[#353437] h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                <XAxis dataKey="date" tick={{ fill: '#8c909f', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8c909f', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 8, color: '#e4e2e4' }}
                />
                <Bar dataKey="value" fill="#adc6ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#8c909f]">No data yet</div>
          )}
        </div>

        <section className="px-0">
          <h3 className="text-[22px] font-semibold text-white mb-4">Recent Runs</h3>
          <div className="flex flex-col gap-2">
            {sets.slice(0, 10).map(s => (
              <div key={s.id} className="bg-[#1f1f21] rounded-lg p-3 border border-[#353437] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center text-white">
                    🏃
                  </div>
                  <div>
                    <p className="text-[17px] text-white">{formatDate(s.created)}</p>
                    <p className="text-[13px] font-medium text-[#c2c6d6]">{s.notes ?? 'Run'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[17px] text-white">{s.distance} {settings.cardioUnit}</p>
                  <p className="text-[13px] font-medium text-[#c2c6d6]">{Math.floor(s.duration / 60)}m {s.duration % 60}s</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
