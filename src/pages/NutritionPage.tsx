import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Trash2, Droplet, Check } from 'lucide-react'
import { db, type DailyNutrition, type SupplementLog } from '../db/database'
import { useSettingsStore } from '../store/settingsStore'
import { putDailyNutrition, deleteDailyNutrition, addSupplementLog, updateSupplementLog } from '../supabase/writeSync'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function weekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() - d.getDay())
  return weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByWeek(items: DailyNutrition[]): Record<string, DailyNutrition[]> {
  const groups: Record<string, DailyNutrition[]> = {}
  items.forEach(item => {
    const key = weekLabel(item.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return groups
}

// â”€â”€â”€ Macro arc (small SVG circle progress) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MacroArcProps {
  label: string
  value: number
  goal: number
  color: string
  unit?: string
}

function MacroArc({ label, value, goal, color, unit = 'g' }: MacroArcProps) {
  const R = 22
  const C = 2 * Math.PI * R
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const dash = C * pct

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={R} fill="none" stroke="var(--color-line)" strokeWidth="4" />
          <circle
            cx="28" cy="28" r={R}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={C}
            strokeDashoffset={C - dash}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[13px] font-semibold text-ink z-10">{value}</span>
      </div>
      <span className="text-[11px] font-medium text-muted">{label}</span>
      {goal > 0 && <span className="text-[10px] text-muted-dim">/{goal}{unit}</span>}
    </div>
  )
}

// â”€â”€â”€ Log / Edit form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FormState {
  date: string
  calories: string
  protein: string
  carbs: string
  fats: string
  water: string
  notes: string
}

function emptyForm(date = todayStr()): FormState {
  return { date, calories: '', protein: '', carbs: '', fats: '', water: '', notes: '' }
}

function entryToForm(e: DailyNutrition): FormState {
  return {
    date: e.date,
    calories: e.calories != null ? String(e.calories) : '',
    protein:  e.protein  != null ? String(e.protein)  : '',
    carbs:    e.carbs    != null ? String(e.carbs)    : '',
    fats:     e.fats     != null ? String(e.fats)     : '',
    water:    e.water    != null ? String(e.water)    : '',
    notes:    e.notes ?? '',
  }
}

function formToEntry(f: FormState): DailyNutrition {
  const num = (v: string) => v.trim() !== '' ? parseFloat(v) : undefined
  return {
    date:     f.date,
    calories: num(f.calories),
    protein:  num(f.protein),
    carbs:    num(f.carbs),
    fats:     num(f.fats),
    water:    num(f.water),
    notes:    f.notes.trim() || undefined,
  }
}

interface NutritionFormProps {
  initial: FormState
  onSave: (f: FormState) => void
  onClose: () => void
  onDelete?: () => void
}

function NutritionForm({ initial, onSave, onClose, onDelete }: NutritionFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  function set(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      setErrors(err => ({ ...err, [k]: undefined }))
    }
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    const numFields: (keyof FormState)[] = ['calories', 'protein', 'carbs', 'fats', 'water']
    numFields.forEach(k => {
      const v = form[k] as string
      if (v.trim() !== '' && (isNaN(parseFloat(v)) || parseFloat(v) < 0)) {
        errs[k] = 'Must be â‰¥ 0'
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (validate()) onSave(form)
  }

  const numInput = (label: string, key: keyof FormState, unit: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-[13px] font-medium text-muted">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={form[key] as string}
          onChange={set(key)}
          placeholder="â€”"
          className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[16px] text-ink focus:border-accent-hover focus:outline-none pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">{unit}</span>
      </div>
      {errors[key] && <p className="text-danger text-[12px]">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-ground/80 z-[60] flex flex-col justify-end animate-fadeIn">
      <div className="bg-surface w-full max-h-[92dvh] rounded-t-[4px] border-t border-line flex flex-col overflow-hidden animate-slideUp">
        <div className="w-12 h-1 bg-line-strong rounded-full mx-auto mt-3 shrink-0" />
        <div className="px-3 flex items-center justify-between py-3 shrink-0">
          <h2 className="text-[24px] font-semibold text-ink">
            {onDelete ? 'Edit Entry' : 'Log Nutrition'}
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
            {numInput('Calories', 'calories', 'kcal')}
            {numInput('Water', 'water', 'L')}
            {numInput('Protein', 'protein', 'g')}
            {numInput('Carbs', 'carbs', 'g')}
            {numInput('Fats', 'fats', 'g')}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-muted">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Optional notesâ€¦"
              className="w-full bg-line border border-line rounded-2xl px-3 py-2 text-[15px] text-ink focus:border-accent-hover focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSave}
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

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function NutritionPage() {
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const [entries, setEntries] = useState<DailyNutrition[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<DailyNutrition | null>(null)
  const [supplements, setSupplements] = useState<SupplementLog[]>([])

  const calGoal   = settings.nutritionCaloriesGoal ?? 2000
  const protGoal  = settings.nutritionProteinGoal  ?? 150
  const carbGoal  = settings.nutritionCarbsGoal    ?? 250
  const fatGoal   = settings.nutritionFatsGoal     ?? 70
  const waterGoal = settings.nutritionWaterGoal    ?? 3
  const suppList: string[] = JSON.parse(settings.supplementsList ?? '[]')

  async function load() {
    const all = await db.daily_nutrition.orderBy('date').reverse().toArray()
    setEntries(all)
  }

  async function loadSupplements() {
    const today = todayStr()
    let logs = await db.supplement_logs.where('date').equals(today).toArray()
    const existing = new Set(logs.map(l => l.name))
    const toAdd = suppList.filter(n => !existing.has(n))
    if (toAdd.length > 0) {
      const newLogs: SupplementLog[] = []
      for (const name of toAdd) {
        const id = await addSupplementLog({ date: today, name, taken: false })
        newLogs.push({ id, date: today, name, taken: false })
      }
      logs = [...logs, ...newLogs]
    }
    setSupplements(logs.filter(l => suppList.includes(l.name)))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadSupplements() }, [settings.supplementsList])

  async function handleSave(form: FormState) {
    const entry = formToEntry(form)
    await putDailyNutrition(entry)
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  async function handleDelete() {
    if (editTarget) await deleteDailyNutrition(editTarget.date)
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  async function toggleSupplement(log: SupplementLog) {
    await updateSupplementLog(log.id!, !log.taken)
    setSupplements(prev => prev.map(s => s.id === log.id ? { ...s, taken: !s.taken } : s))
  }

  const today = todayStr()
  const todayEntry = entries.find(e => e.date === today)

  const grouped = groupByWeek(entries)

  return (
    <div className="min-h-screen bg-ground pb-32">
      <header className="sticky top-0 z-50 bg-ground/90 backdrop-blur-md border-b border-line flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-ink">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-semibold text-ink absolute left-1/2 -translate-x-1/2">Nutrition</h1>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="p-2 -mr-2 text-accent-soft"
        >
          <Plus size={22} strokeWidth={1.5} />
        </button>
      </header>

      <main className="px-3 pt-3 max-w-2xl mx-auto flex flex-col gap-6">

        {/* Today's summary */}
        <section className="bg-surface rounded-2xl border border-line p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[16px] font-semibold text-ink">Today</p>
            <button
              onClick={() => {
                setEditTarget(todayEntry ?? null)
                setShowForm(true)
              }}
              className="text-[13px] font-medium text-accent-soft"
            >
              {todayEntry ? 'Edit' : 'Log'}
            </button>
          </div>

          {todayEntry ? (
            <>
              {/* Calories large display */}
              <div className="flex items-end gap-2">
                <span className="text-[40px] font-semibold text-ink leading-none">
                  {todayEntry.calories ?? 0}
                </span>
                <span className="text-[16px] text-muted mb-1">kcal</span>
                {calGoal > 0 && (
                  <span className="text-[13px] text-muted mb-1">/ {calGoal}</span>
                )}
              </div>

              {/* Calorie progress bar */}
              {calGoal > 0 && (
                <div className="h-2 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(((todayEntry.calories ?? 0) / calGoal) * 100, 100)}%` }}
                  />
                </div>
              )}

              {/* Macro arcs */}
              <div className="flex justify-around">
                <MacroArc label="Protein" value={todayEntry.protein ?? 0} goal={protGoal} color="var(--color-accent-soft)" />
                <MacroArc label="Carbs"   value={todayEntry.carbs   ?? 0} goal={carbGoal} color="var(--color-warning)" />
                <MacroArc label="Fats"    value={todayEntry.fats    ?? 0} goal={fatGoal}  color="#C98A9A" />
              </div>

              {/* Water bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Droplet size={14} strokeWidth={1.5} className="text-muted" />
                    <span className="text-[13px] font-medium text-muted">Water</span>
                  </div>
                  <span className="text-[13px] font-medium text-ink">
                    {todayEntry.water ?? 0} L{waterGoal > 0 ? ` / ${waterGoal} L` : ''}
                  </span>
                </div>
                <div className="h-2 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-info rounded-full transition-all"
                    style={{
                      width: waterGoal > 0
                        ? `${Math.min(((todayEntry.water ?? 0) / waterGoal) * 100, 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted text-[15px] mb-3">No entry for today</p>
              <button
                onClick={() => { setEditTarget(null); setShowForm(true) }}
                className="bg-accent text-ink font-semibold text-[15px] px-6 h-10 rounded-lg"
              >
                Log today's nutrition
              </button>
            </div>
          )}
        </section>

        {/* Supplements */}
        {suppList.length > 0 && (
          <section className="bg-surface rounded-2xl border border-line">
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <p className="text-[16px] font-semibold text-ink">Supplements</p>
              <span className="text-[13px] font-medium text-muted">
                {supplements.filter(s => s.taken).length}/{supplements.length} done
              </span>
            </div>
            {supplements.map((log, i) => (
              <button
                key={log.id}
                onClick={() => toggleSupplement(log)}
                className={`w-full flex items-center justify-between px-3 py-3 text-left transition-colors hover:bg-surface-high ${i < supplements.length - 1 ? 'border-b border-line' : ''}`}
              >
                <span className={`text-[16px] ${log.taken ? 'text-muted line-through' : 'text-ink'}`}>{log.name}</span>
                <div className={`w-6 h-6 flex items-center justify-center border ${log.taken ? 'bg-accent border-accent-hover' : 'border-line'}`} style={{ borderRadius: '10px' }}>
                  {log.taken && <Check size={14} strokeWidth={2} className="text-ink" />}
                </div>
              </button>
            ))}
          </section>
        )}

        {/* History grouped by week */}
        {entries.length > 0 && (
          <section className="flex flex-col gap-6">
            {Object.entries(grouped).map(([week, items]) => (
              <div key={week}>
                <p className="text-[13px] font-medium text-muted uppercase tracking-widest mb-3">
                  Week of {week}
                </p>
                <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                  {items.map((entry, i) => (
                    <button
                      key={entry.date}
                      onClick={() => { setEditTarget(entry); setShowForm(true) }}
                      className={`w-full flex items-center justify-between p-3 text-left hover:bg-surface-high transition-colors ${
                        i < items.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-semibold text-ink">
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[13px] text-muted">
                          {[
                            entry.calories != null && `${entry.calories} kcal`,
                            entry.protein  != null && `P: ${entry.protein}g`,
                            entry.water    != null && `${entry.water}L water`,
                          ].filter(Boolean).join(' Â· ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {showForm && (
        <NutritionForm
          initial={editTarget ? entryToForm(editTarget) : emptyForm()}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onDelete={editTarget ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
