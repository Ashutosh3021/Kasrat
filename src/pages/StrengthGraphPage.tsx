import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { db, type GymSet } from '../db/database'
import { formatDate } from '../utils/dateUtils'
import { useSettingsStore } from '../store/settingsStore'

type Metric = 'weight' | 'reps' | 'volume' | 'orm'
type Agg = 'day' | 'week' | 'month' | 'year'

export default function StrengthGraphPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const [sets, setSets] = useState<GymSet[]>([])
  const [metric, setMetric] = useState<Metric>('weight')
  const [agg, setAgg] = useState<Agg>('week')
  const [limit, setLimit] = useState(20)

  useEffect(() => {
    if (!name) return
    db.gym_sets.where('name').equals(decodeURIComponent(name)).toArray().then(s => {
      setSets(s.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()))
    })
  }, [name])

  const displaySets = sets.slice(0, limit)

  // Group by calendar day → keep only the best set per day (highest weight)
  // Then compute the chosen metric from that best set.
  const byDay = displaySets.reduce<Record<string, GymSet>>((acc, s) => {
    const day = s.created.slice(0, 10)
    if (!acc[day] || s.weight > acc[day].weight) acc[day] = s
    return acc
  }, {})

  const chartData = Object.keys(byDay)
    .sort() // chronological
    .map(day => {
      const s = byDay[day]
      return {
        date: formatDate(s.created),
        value:
          metric === 'weight' ? s.weight
          : metric === 'reps'   ? s.reps
          : metric === 'volume' ? s.weight * s.reps
          : Math.round(s.weight * (1 + s.reps / 30)), // Epley 1RM
      }
    })

  const metricLabel = metric === 'weight' ? settings.strengthUnit
    : metric === 'reps' ? 'reps'
    : metric === 'volume' ? `${settings.strengthUnit} total`
    : `${settings.strengthUnit} 1RM`

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-[#2C2C2E] flex items-center px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-white ml-2 flex items-center gap-2">
          {decodeURIComponent(name ?? '')}
          <button onClick={() => navigate(`/edit-graph/${name}`)} className="p-1 text-[#A1A1A6] hover:text-white">
            <Edit2 size={18} strokeWidth={1.5} />
          </button>
        </h1>
      </header>

      <main className="pt-20 px-3 max-w-3xl mx-auto space-y-8">
        <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3 relative overflow-hidden" style={{ borderRadius: '4px' }}>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2E" />
                  <XAxis dataKey="date" tick={{ fill: '#8c909f', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8c909f', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 4, color: '#e4e2e4' }}
                    labelStyle={{ color: '#3B82F6' }}
                  />
                  <Area
                    type={settings.curveLines ? 'monotone' : 'linear'}
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#grad)"
                    dot={{ fill: '#000', stroke: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#A1A1A6]">No data yet</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['weight', 'reps', 'volume', 'orm'] as Metric[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                  metric === m ? 'bg-[#3B82F6]/20 border border-[#3B82F6] text-[#3B82F6]' : 'bg-[#2C2C2E] text-white'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {m === 'orm' ? 'ORM' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-[#1C1C1E] p-1 w-full" style={{ borderRadius: '4px' }}>
            {(['day', 'week', 'month', 'year'] as Agg[]).map(a => (
              <button
                key={a}
                onClick={() => setAgg(a)}
                className={`flex-1 py-1.5 text-[13px] font-medium text-center transition-colors ${
                  agg === a ? 'bg-[#2C2C2E] text-white' : 'text-[#A1A1A6]'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1C1C1E] border border-[#2C2C2E] p-3" style={{ borderRadius: '4px' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[22px] font-medium text-white">Recent Sets</h2>
            <span className="text-[13px] font-medium text-[#A1A1A6]">Last {limit}</span>
          </div>
          <div className="space-y-0">
            {Object.entries(byDay)
              .sort(([a], [b]) => b.localeCompare(a)) // newest first
              .map(([, s], i, arr) => (
              <div key={s.id} className={`py-3 flex justify-between items-center ${i < arr.length - 1 ? 'border-b border-[#2C2C2E]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                  <span className="text-[17px] text-white">{formatDate(s.created)}</span>
                </div>
                <span className="text-[15px] font-medium text-white">
                  {s.weight} {settings.strengthUnit} × {s.reps} reps
                  <span className="text-[#A1A1A6] text-[13px] font-normal ml-1">({metricLabel})</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-[#2C2C2E]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-medium text-[#A1A1A6]">Show sets</span>
              <span className="text-[15px] font-medium text-white">{limit}</span>
            </div>
            <input
              type="range" min={5} max={100} value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="w-full accent-[#3B82F6]"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
