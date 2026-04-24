import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical, Minus, ChevronDown, LayoutTemplate } from 'lucide-react'
import { db, type Plan, type PlanExercise, type SetType } from '../db/database'
import Toggle from '../components/Toggle'
import { useUIStore } from '../store/uiStore'
import ExerciseModal from '../overlays/ExerciseModal'
import DeleteConfirmation from '../overlays/DeleteConfirmation'
import TemplatePicker from '../overlays/TemplatePicker'
import { useDragToReorder } from '../hooks/useDragToReorder'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const SET_TYPE_OPTIONS: { value: SetType; label: string; color: string }[] = [
  { value: 'normal',    label: 'Normal',    color: 'text-[#c2c6d6]' },
  { value: 'warmup',    label: 'Warm-up',   color: 'text-amber-400' },
  { value: 'superset',  label: 'Superset',  color: 'text-[#60A5FA]' },
  { value: 'giant',     label: 'Giant Set', color: 'text-purple-400' },
  { value: 'circuit',   label: 'Circuit',   color: 'text-emerald-400' },
]

function SetTypeBadge({ type }: { type: SetType }) {
  const opt = SET_TYPE_OPTIONS.find(o => o.value === type)
  if (!opt || type === 'normal') return null
  return (
    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#131315] ${opt.color}`}>
      {opt.label}
    </span>
  )
}

interface SetTypePickerProps {
  value: SetType
  onChange: (v: SetType) => void
}
function SetTypePicker({ value, onChange }: SetTypePickerProps) {
  const [open, setOpen] = useState(false)
  const current = SET_TYPE_OPTIONS.find(o => o.value === value) ?? SET_TYPE_OPTIONS[0]
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 bg-[#131315] rounded-full px-2 py-1 text-[11px] font-semibold text-[#c2c6d6]"
      >
        <span className={current.color}>{current.label}</span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[#1C1C1E] border border-[#353437] rounded-lg overflow-hidden shadow-xl min-w-[120px]">
          {SET_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-[#353437] transition-colors ${opt.color} ${value === opt.value ? 'bg-[#353437]' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [title, setTitle] = useState('')
  const [activeDays, setActiveDays] = useState<number[]>([])
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const { openExerciseModal, exerciseModalOpen, closeExerciseModal, openDeleteConfirm, deleteConfirmOpen, deleteConfirmTarget, closeDeleteConfirm } = useUIStore()

  async function load() {
    if (!id) return
    const p = await db.plans.get(Number(id))
    if (!p) return
    setPlan(p)
    setTitle(p.title)
    setActiveDays(p.days.split(',').map(Number).filter(n => !isNaN(n)))
    const exs = await db.plan_exercises.where('planId').equals(Number(id)).toArray()
    setExercises(exs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  }

  useEffect(() => { load() }, [id])

  async function save() {
    if (!plan?.id) return
    await db.plans.update(plan.id, {
      title,
      days: activeDays.join(','),
      exercises: exercises.filter(e => e.enabled).map(e => e.exercise).join(','),
    })
    navigate(-1)
  }

  async function deletePlan() {
    if (!plan?.id) return
    await db.plans.delete(plan.id)
    await db.plan_exercises.where('planId').equals(plan.id).delete()
    navigate('/plans')
  }

  function toggleDay(d: number) {
    setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function toggleExercise(ex: PlanExercise) {
    await db.plan_exercises.update(ex.id!, { enabled: !ex.enabled })
    load()
  }

  async function handleExerciseAdded() {
    closeExerciseModal()
    load()
  }

  async function handleReorder(newItems: PlanExercise[]) {
    setExercises(newItems)
    await Promise.all(newItems.map((ex, i) => db.plan_exercises.update(ex.id!, { sortOrder: i })))
  }

  async function updateSets(ex: PlanExercise, delta: number) {
    const next = Math.max(1, ex.maxSets + delta)
    await db.plan_exercises.update(ex.id!, { maxSets: next })
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, maxSets: next } : e))
  }

  async function updateSetType(ex: PlanExercise, setType: SetType) {
    await db.plan_exercises.update(ex.id!, { setType })
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, setType } : e))
  }

  const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

  async function handleDeleteConfirm() {
    if (deleteConfirmTarget?.type === 'plan') await deletePlan()
    closeDeleteConfirm()
  }

  // Group consecutive superset/giant/circuit exercises for visual grouping
  type Group = { type: 'single'; ex: PlanExercise; idx: number } | { type: 'group'; label: string; items: { ex: PlanExercise; idx: number }[] }
  const groups: Group[] = []
  let i = 0
  while (i < exercises.length) {
    const ex = exercises[i]
    const st = ex.setType ?? 'normal'
    if (st === 'superset' || st === 'giant' || st === 'circuit') {
      const groupItems: { ex: PlanExercise; idx: number }[] = []
      const groupType = st
      while (i < exercises.length && (exercises[i].setType ?? 'normal') === groupType) {
        groupItems.push({ ex: exercises[i], idx: i })
        i++
      }
      const label = groupType === 'superset' ? 'Superset' : groupType === 'giant' ? 'Giant Set' : 'Circuit'
      groups.push({ type: 'group', label, items: groupItems })
    } else {
      groups.push({ type: 'single', ex, idx: i })
      i++
    }
  }

  function renderExRow(ex: PlanExercise, idx: number) {
    return (
      <div key={ex.id} className="bg-[#1b1b1d] p-3 rounded-lg flex items-center gap-3" {...getItemProps(idx)}>
        <span {...getHandleProps(idx)}>
          <GripVertical size={20} className="text-[#424754]" />
        </span>
        <div className="flex-1 flex flex-col min-w-0 gap-1">
          <span className="text-[17px] text-white truncate">{ex.exercise}</span>
          <SetTypeBadge type={ex.setType ?? 'normal'} />
        </div>
        {/* Set type picker */}
        <SetTypePicker value={ex.setType ?? 'normal'} onChange={v => updateSetType(ex, v)} />
        {/* Set count stepper */}
        <div className="flex items-center gap-1.5 bg-[#131315] rounded-full px-2 py-1 shrink-0">
          <button onClick={() => updateSets(ex, -1)} className="w-6 h-6 flex items-center justify-center text-[#adc6ff] active:opacity-60">
            <Minus size={14} />
          </button>
          <span className="text-[15px] font-semibold text-white w-4 text-center tabular-nums">{ex.maxSets}</span>
          <button onClick={() => updateSets(ex, 1)} className="w-6 h-6 flex items-center justify-center text-[#adc6ff] active:opacity-60">
            <Plus size={14} />
          </button>
        </div>
        <Toggle checked={ex.enabled} onChange={() => toggleExercise(ex)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-md flex justify-between items-center px-4 h-14 border-b border-[#353437]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1b1b1d] rounded-full">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[22px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Edit Plan</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 gap-8">
        <section className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#c2c6d6] px-1">Plan Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-[#1b1b1d] text-white text-[17px] rounded-lg p-3 w-full border border-transparent focus:border-[#adc6ff] focus:outline-none placeholder-[#8c909f]"
          />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#c2c6d6] px-1">Active Days</span>
          <div className="flex justify-between items-center bg-[#1b1b1d] p-3 rounded-lg">
            {[0, 1, 2, 3, 4, 5, 6].map((d, idx) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[15px] transition-all ${
                  activeDays.includes(d) ? 'bg-[#adc6ff] text-[#002e6a]' : 'bg-[#131315] text-[#c2c6d6]'
                }`}
              >
                {DAYS[idx]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-semibold text-white">Exercises</h2>
          <div className="flex flex-col gap-3" data-drag-list>
            {groups.map((g, gi) => {
              if (g.type === 'single') return renderExRow(g.ex, g.idx)
              // Grouped superset/giant/circuit
              const borderColor = g.label === 'Superset' ? 'border-[#60A5FA]' : g.label === 'Giant Set' ? 'border-purple-400' : 'border-emerald-400'
              const labelColor  = g.label === 'Superset' ? 'text-[#60A5FA]'  : g.label === 'Giant Set' ? 'text-purple-400'  : 'text-emerald-400'
              return (
                <div key={`group-${gi}`} className={`border-l-[3px] ${borderColor} pl-2 flex flex-col gap-2 rounded-r-lg`}>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${labelColor} px-1`}>{g.label}</span>
                  {g.items.map(({ ex, idx }) => renderExRow(ex, idx))}
                </div>
              )
            })}
          </div>
          <button
            onClick={() => plan?.id && openExerciseModal(plan.id)}
            className="border border-[#424754] text-[#adc6ff] rounded-lg min-h-[48px] py-3 flex items-center justify-center gap-2 font-semibold text-[15px] w-full"
          >
            <Plus size={20} />
            Add Exercise
          </button>
          {exercises.length === 0 && (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="border border-[#3B82F6]/40 text-[#3B82F6] rounded-lg min-h-[48px] py-3 flex items-center justify-center gap-2 font-semibold text-[15px] w-full"
            >
              <LayoutTemplate size={20} />
              Start from a template
            </button>
          )}
        </section>

        <div className="flex-1" />

        <section className="mt-8 flex flex-col gap-4 pb-8">
          <button onClick={save} className="bg-[#adc6ff] text-[#002e6a] rounded-lg min-h-[48px] flex justify-center items-center font-semibold text-[15px] w-full">
            Save
          </button>
          <button
            onClick={() => plan?.id && openDeleteConfirm({ type: 'plan', id: plan.id, name: plan.title })}
            className="text-[#ffb4ab] font-semibold text-[15px] w-full flex justify-center py-3"
          >
            Delete Plan
          </button>
        </section>
      </main>

      {exerciseModalOpen && plan?.id && (
        <ExerciseModal planId={plan.id} onClose={handleExerciseAdded} />
      )}
      {deleteConfirmOpen && (
        <DeleteConfirmation target={deleteConfirmTarget!} onConfirm={handleDeleteConfirm} onCancel={closeDeleteConfirm} />
      )}
      {showTemplatePicker && (
        <TemplatePicker onClose={() => setShowTemplatePicker(false)} />
      )}
    </div>
  )
}
