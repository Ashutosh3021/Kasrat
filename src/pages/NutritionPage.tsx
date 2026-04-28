import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Trash2, Droplet, Check } from 'lucide-react'
import { db, type DailyNutrition, type SupplementLog } from '../db/database'
import { useSettingsStore } from '../store/settingsStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Macro arc (small SVG circle progress) ───────────────────────────────────

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
          <circle cx="28" cy="28" r={R} fill="none" stroke="#2C2C2E" strokeWidth="4" />
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
        <span className="text-[13px] font-semibold text-white z-10">{value}</span>
      </div>
      <span className="text-[11px] font-medium text-[#A1A1A6]">{label}</span>
      {goal > 0 && <span className="text-[10px] text-[#424754]">/{goal}{unit}</span>}
    </div>
  )
}

// ─── Log / Edit form ──────────────────────────────────────────────────────────

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
        errs[k] = 'Must be ≥ 0'
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
      <label className="text-[13px] font-medium text-[#A1A1A6]">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={form[key] as string}
          onChange={set(key)}
          placeholder="—"
          className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#3B82F6] focus:outline-none pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#A1A1A6]">{unit}</span>
      </div>
      {errors[key] && <p className="text-[#FF453A] text-[12px]">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col justify-end animate-fadeIn">
      <div className="bg-[#1C1C1E] w-full max-h-[92dvh] rounded-t-[4px] border-t border-[#2C2C2E] flex flex-col overflow-hidden animate-slideUp">
        <div className="w-12 h-1 bg-[#353437] rounded-full mx-auto mt-3 shrink-0" />
        <div className="px-3 flex items-center justify-between py-3 shrink-0">
          <h2 className="text-[22px] font-semibold text-white">
            {onDelete ? 'Edit Entry' : 'Log Nutrition'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#2C2C2E] rounded-[2px]">
            <X size={20} strokeWidth={1.5} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 flex flex-col gap-3">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#A1A1A6]">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[17px] text-white focus:border-[#3B82F6] focus:outline-none"
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
            <label className="text-[13px] font-medium text-[#A1A1A6]">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              placeholder="Optional notes…"
              className="w-full bg-[#2C2C2E] border border-[#2C2C2E] rounded-[4px] px-3 py-2 text-[15px] text-white focus:border-[#3B82F6] focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full h-12 bg-[#3B82F6] text-white rounded-[2px] font-semibold text-[15px]"
          >
            Save
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="w-full h-12 flex items-center justify-center gap-2 text-[#FF453A] font-semibold text-[15px]"
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
    // Seed missing entries from settings list
    const existing = new Set(logs.map(l => l.name))
    const toAdd = suppList.filter(n => !existing.has(n))
    if (toAdd.length > 0) {
      const ids = await db.supplement_logs.bulkAdd(
        toAdd.map(name => ({ date: today, name, taken: false })),
        { allKeys: true }
      ) as number[]
      const newLogs = toAdd.map((name, i) => ({ id: ids[i], date: today, name, taken: false }))
      logs = [...logs, ...newLogs]
    }
    // Only show supplements that are in the current settings list
    setSupplements(logs.filter(l => suppList.includes(l.name)))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadSupplements() }, [settings.supplementsList])

  async function handleSave(form: FormState) {
    const entry = formToEntry(form)
    await db.daily_nutrition.put(entry)
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  async function handleDelete() {
    if (editTarget) await db.daily_nutrition.delete(editTarget.date)
    setShowForm(false)
    setEditTarget(null)
    load()
  }

  async function toggleSupplement(log: SupplementLog) {
    await db.supplement_logs.update(log.id!, { taken: !log.taken })
    setSupplements(prev => prev.map(s => s.id === log.id ? { ...s, taken: !s.taken } : s))
  }

  const today = todayStr()
  const todayEntry = entries.find(e => e.date === today)

  const grouped = groupByWeek(entries)

  return (
    <div className="min-h-screen bg-black pb-24">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-[#2C2C2E] flex items-center justify-between px-3 h-14">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white">
          <ArrowLeft size={22} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Nutrition</h1>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="p-2 -mr-2 text-[#3B82F6]"
        >
          <Plus size={22} strokeWidth={1.5} />
        </button>
      </header>

      <main className="px-3 pt-3 max-w-2xl mx-auto flex flex-col gap-6">

        {/* Today's summary */}
        <section className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[17px] font-semibold text-white">Today</p>
            <button
              onClick={() => {
                setEditTarget(todayEntry ?? null)
                setShowForm(true)
              }}
              className="text-[13px] font-medium text-[#3B82F6]"
            >
              {todayEntry ? 'Edit' : 'Log'}
            </button>
          </div>

          {todayEntry ? (
            <>
              {/* Calories large display */}
              <div className="flex items-end gap-2">
                <span className="text-[40px] font-semibold text-white leading-none">
                  {todayEntry.calories ?? 0}
                </span>
                <span className="text-[17px] text-[#A1A1A6] mb-1">kcal</span>
                {calGoal > 0 && (
                  <span className="text-[13px] text-[#A1A1A6] mb-1">/ {calGoal}</span>
                )}
              </div>

              {/* Calorie progress bar */}
              {calGoal > 0 && (
                <div className="h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3B82F6] rounded-full transition-all"
                    style={{ width: `${Math.min(((todayEntry.calories ?? 0) / calGoal) * 100, 100)}%` }}
                  />
                </div>
              )}

              {/* Macro arcs */}
              <div className="flex justify-around">
                <MacroArc label="Protein" value={todayEntry.protein ?? 0} goal={protGoal} color="#3B82F6" />
                <MacroArc label="Carbs"   value={todayEntry.carbs   ?? 0} goal={carbGoal} color="#60A5FA" />
                <MacroArc label="Fats"    value={todayEntry.fats    ?? 0} goal={fatGoal}  color="#93C5FD" />
              </div>

              {/* Water bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Droplet size={14} strokeWidth={1.5} className="text-[#A1A1A6]" />
                    <span className="text-[13px] font-medium text-[#A1A1A6]">Water</span>
                  </div>
                  <span className="text-[13px] font-medium text-white">
                    {todayEntry.water ?? 0} L{waterGoal > 0 ? ` / ${waterGoal} L` : ''}
                  </span>
                </div>
                <div className="h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#60A5FA] rounded-full transition-all"
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
              <p className="text-[#A1A1A6] text-[15px] mb-3">No entry for today</p>
              <button
                onClick={() => { setEditTarget(null); setShowForm(true) }}
                className="bg-[#3B82F6] text-white font-semibold text-[15px] px-6 h-10 rounded-[2px]"
              >
                Log today's nutrition
              </button>
            </div>
          )}
        </section>

        {/* Supplements */}
        {suppList.length > 0 && (
          <section className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E]">
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <p className="text-[17px] font-semibold text-white">Supplements</p>
              <span className="text-[13px] font-medium text-[#A1A1A6]">
                {supplements.filter(s => s.taken).length}/{supplements.length} done
              </span>
            </div>
            {supplements.map((log, i) => (
              <button
                key={log.id}
                onClick={() => toggleSupplement(log)}
                className={`w-full flex items-center justify-between px-3 py-3 text-left transition-colors hover:bg-[#2a2a2c] ${i < supplements.length - 1 ? 'border-b border-[#2C2C2E]' : ''}`}
              >
                <span className={`text-[17px] ${log.taken ? 'text-[#A1A1A6] line-through' : 'text-white'}`}>{log.name}</span>
                <div className={`w-6 h-6 flex items-center justify-center border ${log.taken ? 'bg-[#3B82F6] border-[#3B82F6]' : 'border-[#2C2C2E]'}`} style={{ borderRadius: '2px' }}>
                  {log.taken && <Check size={14} strokeWidth={2} className="text-white" />}
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
                <p className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest mb-3">
                  Week of {week}
                </p>
                <div className="bg-[#1C1C1E] rounded-[4px] border border-[#2C2C2E] overflow-hidden">
                  {items.map((entry, i) => (
                    <button
                      key={entry.date}
                      onClick={() => { setEditTarget(entry); setShowForm(true) }}
                      className={`w-full flex items-center justify-between p-3 text-left hover:bg-[#2a2a2c] transition-colors ${
                        i < items.length - 1 ? 'border-b border-[#2C2C2E]' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-semibold text-white">
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[13px] text-[#A1A1A6]">
                          {[
                            entry.calories != null && `${entry.calories} kcal`,
                            entry.protein  != null && `P: ${entry.protein}g`,
                            entry.water    != null && `${entry.water}L water`,
                          ].filter(Boolean).join(' · ')}
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
