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
    <div className="min-h-screen bg-ground pb-32">
      <header className="fixed top-0 w-full z-50 bg-ground/80 backdrop-blur-md border-b border-zinc-800 flex items-center px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-semibold text-ink ml-2 flex items-center gap-2">
          {decodeURIComponent(name ?? '')}
          <button onClick={() => navigate(`/edit-graph/${name}`)} className="p-1 text-muted hover:text-ink">
            <Edit2 size={18} strokeWidth={1.5} />
          </button>
        </h1>
      </header>

      <main className="pt-20 px-3 max-w-3xl mx-auto space-y-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['duration', 'distance', 'pace', 'incline'] as CardioMetric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-2 rounded-lg text-[15px] font-semibold whitespace-nowrap transition-all ${
                metric === m ? 'bg-accent text-ink' : 'bg-surface border border-line text-muted'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-2xl p-3 border border-line h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-muted-dim)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 4, color: 'var(--color-ink-soft)' }}
                />
                <Bar dataKey="value" fill="var(--color-accent-soft)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted">No data yet</div>
          )}
        </div>

        <section className="px-0">
          <h3 className="text-[24px] font-semibold text-ink mb-3">Recent Runs</h3>
          <div className="flex flex-col gap-2">
            {sets.slice(0, 10).map(s => (
              <div key={s.id} className="bg-surface rounded-2xl p-3 border border-line flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[16px] text-ink">{formatDate(s.created)}</p>
                    <p className="text-[13px] font-medium text-muted">{s.notes ?? 'Run'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[16px] text-ink">{s.distance} {settings.cardioUnit}</p>
                  <p className="text-[13px] font-medium text-muted">{Math.floor(s.duration / 60)}m {s.duration % 60}s</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
