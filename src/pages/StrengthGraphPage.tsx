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
    <div className="min-h-screen bg-ground pb-32">
      <header className="fixed top-0 w-full z-50 bg-ground/80 backdrop-blur-md border-b border-line flex items-center px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[40px] font-semibold leading-10 tracking-tight text-ink ml-2 flex items-center gap-2">
          {decodeURIComponent(name ?? '')}
          <button onClick={() => navigate(`/edit-graph/${name}`)} className="p-1 text-muted hover:text-ink">
            <Edit2 size={18} strokeWidth={1.5} />
          </button>
        </h1>
      </header>

      <main className="pt-20 px-3 max-w-3xl mx-auto space-y-8">
        <div className="bg-surface border border-line p-3 relative overflow-hidden" style={{ borderRadius: '16px' }}>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent-soft)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent-soft)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--color-muted-dim)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--color-muted-dim)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 4, color: 'var(--color-ink-soft)' }}
                    labelStyle={{ color: 'var(--color-accent-soft)' }}
                  />
                  <Area
                    type={settings.curveLines ? 'monotone' : 'linear'}
                    dataKey="value"
                    stroke="var(--color-accent-soft)"
                    strokeWidth={2}
                    fill="url(#grad)"
                    dot={{ fill: '#000', stroke: 'var(--color-accent-soft)', strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted">No data yet</div>
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
                  metric === m ? 'bg-accent/20 border border-accent-hover text-accent-soft' : 'bg-line text-ink'
                }`}
                style={{ borderRadius: '10px' }}
              >
                {m === 'orm' ? 'ORM' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 bg-surface p-1 w-full" style={{ borderRadius: '16px' }}>
            {(['day', 'week', 'month', 'year'] as Agg[]).map(a => (
              <button
                key={a}
                onClick={() => setAgg(a)}
                className={`flex-1 py-1.5 text-[13px] font-medium text-center transition-colors ${
                  agg === a ? 'bg-line text-ink' : 'text-muted'
                }`}
                style={{ borderRadius: '10px' }}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-line p-3" style={{ borderRadius: '16px' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[24px] font-medium text-ink">Recent Sets</h2>
            <span className="text-[13px] font-medium text-muted">Last {limit}</span>
          </div>
          <div className="space-y-0">
            {Object.entries(byDay)
              .sort(([a], [b]) => b.localeCompare(a)) // newest first
              .map(([, s], i, arr) => (
              <div key={s.id} className={`py-3 flex justify-between items-center ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-[16px] text-ink">{formatDate(s.created)}</span>
                </div>
                <span className="text-[15px] font-medium text-ink">
                  {s.weight} {settings.strengthUnit} × {s.reps} reps
                  <span className="text-muted text-[13px] font-normal ml-1">({metricLabel})</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-line">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-medium text-muted">Show sets</span>
              <span className="text-[15px] font-medium text-ink">{limit}</span>
            </div>
            <input
              type="range" min={5} max={100} value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="w-full accent-accent-soft"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
