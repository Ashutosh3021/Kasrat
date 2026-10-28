import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { db, type BodyMeasurement } from '../db/database'
import { formatDate } from '../utils/dateUtils'
import { addBodyMeasurement, updateBodyMeasurement, deleteBodyMeasurement } from '../supabase/writeSync'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewTab = 'history' | 'charts'
type ChartMetric = 'bodyWeight' | 'fatPercentage' | 'arms' | 'chest' | 'thigh' | 'calves' | 'waist'

const METRIC_LABELS: Record<ChartMetric, string> = {
  bodyWeight: 'Body Weight (kg)',
  fatPercentage: 'Fat %',
  arms: 'Arms (cm)',
  chest: 'Chest (cm)',
  thigh: 'Thigh (cm)',
  calves: 'Calves (cm)',
  waist: 'Waist (cm)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function summaryLine(m: BodyMeasurement): string {
  const parts: string[] = []
  if (m.bodyWeight != null) parts.push(`Weight: ${m.bodyWeight} kg`)
  if (m.fatPercentage != null) parts.push(`Fat: ${m.fatPercentage}%`)
  if (m.arms != null) parts.push(`Arms: ${m.arms} cm`)
  if (m.chest != null) parts.push(`Chest: ${m.chest} cm`)
  if (m.thigh != null) parts.push(`Thigh: ${m.thigh} cm`)
  if (m.calves != null) parts.push(`Calves: ${m.calves} cm`)
  if (m.waist != null) parts.push(`Waist: ${m.waist} cm`)
  return parts.join(' · ') || 'No data'
}

function monthKey(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ─── Log / Edit form (bottom sheet) ──────────────────────────────────────────

interface FormState {
  date: string
  bodyWeight: string
  fatPercentage: string
  arms: string
  chest: string
  thigh: string
  calves: string
  waist: string
  notes: string
}

function emptyForm(): FormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    bodyWeight: '', fatPercentage: '',
    arms: '', chest: '', thigh: '', calves: '', waist: '',
    notes: '',
  }
}

function measurementToForm(m: BodyMeasurement): FormState {
  return {
    date: m.created.slice(0, 10),
    bodyWeight: m.bodyWeight != null ? String(m.bodyWeight) : '',
    fatPercentage: m.fatPercentage != null ? String(m.fatPercentage) : '',
    arms: m.arms != null ? String(m.arms) : '',
    chest: m.chest != null ? String(m.chest) : '',
    thigh: m.thigh != null ? String(m.thigh) : '',
    calves: m.calves != null ? String(m.calves) : '',
    waist: m.waist != null ? String(m.waist) : '',
    notes: m.notes ?? '',
  }
}

function formToMeasurement(f: FormState): Omit<BodyMeasurement, 'id'> {
  const parse = (v: string) => v.trim() !== '' ? parseFloat(v) : undefined
  return {
    created: new Date(f.date).toISOString(),
    bodyWeight: parse(f.bodyWeight),
    fatPercentage: parse(f.fatPercentage),
    arms: parse(f.arms),
    chest: parse(f.chest),
    thigh: parse(f.thigh),
    calves: parse(f.calves),
    waist: parse(f.waist),
    notes: f.notes.trim() || undefined,
  }
}

interface MeasurementFormProps {
  initial: FormState
  onSave: (f: FormState) => void
  onClose: () => void
  onDelete?: () => void
}

function MeasurementForm({ initial, onSave, onClose, onDelete }: MeasurementFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const numField = (label: string, key: keyof FormState, unit: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-medium text-muted">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={form[key] as string}
          onChange={set(key)}
          placeholder="—"
          className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[16px] text-ink focus:border-accent-hover focus:outline-none pr-12"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">{unit}</span>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-ground/80 z-[60] flex flex-col justify-end animate-fadeIn">
      <div className="bg-surface w-full max-h-[92dvh] rounded-t-[4px] border-t border-line flex flex-col overflow-hidden animate-slideUp">
        {/* Handle */}
        <div className="w-full flex justify-center py-3 shrink-0">
          <div className="w-12 h-1 bg-line-strong rounded-full" />
        </div>
        {/* Header */}
        <div className="px-3 flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-[24px] font-semibold text-ink">
            {onDelete ? 'Edit Measurement' : 'Log Measurement'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-line rounded-lg">
            <X size={20} strokeWidth={1.5} className="text-ink" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-3">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-muted">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[16px] text-ink focus:border-accent-hover focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {numField('Body Weight', 'bodyWeight', 'kg')}
            {numField('Fat %', 'fatPercentage', '%')}
            {numField('Arms', 'arms', 'cm')}
            {numField('Chest', 'chest', 'cm')}
            {numField('Thigh', 'thigh', 'cm')}
            {numField('Calves', 'calves', 'cm')}
            {numField('Waist', 'waist', 'cm')}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-muted">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Optional notes…"
              className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[16px] text-ink focus:border-accent-hover focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={() => onSave(form)}
            className="w-full h-12 bg-accent text-ink rounded-lg font-semibold text-[15px]"
          >
            Save
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full h-12 flex items-center justify-center gap-2 text-danger font-semibold text-[15px]"
            >
              <Trash2 size={18} strokeWidth={1.5} />
              Delete Entry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BodyMeasurementsPage() {
  const navigate = useNavigate()
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [tab, setTab] = useState<ViewTab>('history')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('bodyWeight')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<BodyMeasurement | null>(null)

  async function load() {
    const all = await db.body_measurements.orderBy('created').reverse().toArray()
    setMeasurements(all)
  }

  useEffect(() => { load() }, [])

  async function handleSave(form: FormState) {
    const data = formToMeasurement(form)
    if (editTarget?.id) {
      await updateBodyMeasurement(editTarget.id, data)
    } else {
      await addBodyMeasurement(data)
    }
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  async function handleDelete() {
    if (editTarget?.id) {
      await deleteBodyMeasurement(editTarget.id)
    }
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  function openEdit(m: BodyMeasurement) {
    setEditTarget(m)
    setShowForm(true)
  }

  // Latest entry for the hero section
  const latest = measurements[0]

  // Group by month for history list
  const byMonth: Record<string, BodyMeasurement[]> = {}
  measurements.forEach(m => {
    const k = monthKey(m.created)
    if (!byMonth[k]) byMonth[k] = []
    byMonth[k].push(m)
  })

  // Chart data
  const chartData = [...measurements]
    .reverse()
    .filter(m => m[chartMetric] != null)
    .map(m => ({ date: formatDate(m.created), value: m[chartMetric] as number }))

  return (
    <div className="min-h-screen bg-ground pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-ground/90 backdrop-blur-md border-b border-line flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-semibold text-ink absolute left-1/2 -translate-x-1/2">
          Body Measurements
        </h1>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="p-2 -mr-2 text-accent-soft"
        >
          <Plus size={22} strokeWidth={1.5} />
        </button>
      </header>

      <main className="px-3 pt-3 max-w-2xl mx-auto flex flex-col gap-6">

        {/* Latest snapshot */}
        {latest && (
          <section className="bg-surface rounded-2xl border border-line p-3 flex flex-col gap-3">
            <p className="text-[13px] font-medium text-muted">Latest — {formatDate(latest.created)}</p>
            <div className="flex items-end gap-3">
              {latest.bodyWeight != null && (
                <div>
                  <span className="text-[40px] font-semibold text-ink leading-none">{latest.bodyWeight}</span>
                  <span className="text-[16px] text-muted ml-1">kg</span>
                </div>
              )}
              {latest.fatPercentage != null && (
                <div className="mb-1">
                  <span className="text-[24px] font-semibold text-accent-soft">{latest.fatPercentage}</span>
                  <span className="text-[13px] text-muted ml-0.5">% fat</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(['arms', 'chest', 'thigh', 'calves', 'waist'] as const).map(k =>
                latest[k] != null ? (
                  <span key={k} className="text-[13px] text-muted capitalize">
                    {k}: <span className="text-ink font-medium">{latest[k]} cm</span>
                  </span>
                ) : null
              )}
            </div>
          </section>
        )}

        {/* Tab bar */}
        <div className="flex bg-surface rounded-2xl p-1 gap-1">
          {(['history', 'charts'] as ViewTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-[15px] font-semibold transition-colors capitalize ${
                tab === t ? 'bg-accent text-ink' : 'text-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* History view */}
        {tab === 'history' && (
          measurements.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted text-[15px]">No measurements yet. Tap + to log one.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(byMonth).map(([month, items]) => (
                <section key={month}>
                  <h2 className="text-[13px] font-medium text-muted uppercase tracking-widest mb-3">{month}</h2>
                  <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                    {items.map((m, i) => (
                      <button
                        key={m.id}
                        onClick={() => openEdit(m)}
                        className={`w-full flex flex-col gap-1 p-3 text-left hover:bg-surface-high transition-colors ${
                          i < items.length - 1 ? 'border-b border-line' : ''
                        }`}
                      >
                        <span className="text-[15px] font-semibold text-ink">{formatDate(m.created)}</span>
                        <span className="text-[13px] text-muted">{summaryLine(m)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        )}

        {/* Charts view */}
        {tab === 'charts' && (
          <div className="flex flex-col gap-4">
            {/* Metric selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(Object.keys(METRIC_LABELS) as ChartMetric[]).map(m => (
                <button
                  key={m}
                  onClick={() => setChartMetric(m)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
                    chartMetric === m
                      ? 'bg-accent/20 border border-accent-hover text-accent-soft'
                      : 'bg-surface border border-line text-muted'
                  }`}
                >
                  {METRIC_LABELS[m].split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="bg-surface rounded-2xl border border-line p-3">
              <p className="text-[13px] font-medium text-muted mb-3">{METRIC_LABELS[chartMetric]}</p>
              {chartData.length < 2 ? (
                <div className="h-48 flex items-center justify-center text-muted text-[15px]">
                  Not enough data yet
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 4, color: 'var(--color-ink-soft)' }}
                        labelStyle={{ color: 'var(--color-accent-soft)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-accent-soft)"
                        strokeWidth={2}
                        dot={{ fill: '#000', stroke: 'var(--color-accent-soft)', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => { setEditTarget(null); setShowForm(true) }}
        className="fixed bottom-6 right-4 w-14 h-14 bg-accent rounded-full flex items-center justify-center active:scale-95 transition-transform z-40"
      >
        <Plus size={24} strokeWidth={1.5} className="text-ink" />
      </button>

      {/* Form sheet */}
      {showForm && (
        <MeasurementForm
          initial={editTarget ? measurementToForm(editTarget) : emptyForm()}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onDelete={editTarget ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
