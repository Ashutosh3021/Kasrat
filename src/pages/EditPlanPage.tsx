import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical, Minus, ChevronDown, LayoutTemplate, Trash2 } from 'lucide-react'
import { db, type Plan, type PlanExercise, type SetType } from '../db/database'
import Toggle from '../components/Toggle'
import { useUIStore } from '../store/uiStore'
import ExerciseModal from '../overlays/ExerciseModal'
import DeleteConfirmation from '../overlays/DeleteConfirmation'
import TemplatePicker from '../overlays/TemplatePicker'
import { useDragToReorder } from '../hooks/useDragToReorder'
import { updatePlan, deletePlan as deletePlanSync, updatePlanExercise, deletePlanExercise } from '../supabase/writeSync'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const SET_TYPE_OPTIONS: { value: SetType; label: string; color: string }[] = [
  { value: 'normal',    label: 'Normal',    color: 'text-muted' },
  { value: 'warmup',    label: 'Warm-up',   color: 'text-amber-400' },
  { value: 'superset',  label: 'Superset',  color: 'text-warning' },
  { value: 'giant',     label: 'Giant Set', color: 'text-purple-400' },
  { value: 'circuit',   label: 'Circuit',   color: 'text-emerald-400' },
]

const SUPERSET_COLORS = [
  '#E07A5F', '#8FAE8B', 'var(--color-info)', '#A3B58A', '#E8CB8B',
  '#C4A0C0', '#93B8AE', '#E3C878', '#B79AC9', '#8FB2CF'
]

function SetTypeBadge({ type }: { type: SetType }) {
  const opt = SET_TYPE_OPTIONS.find(o => o.value === type)
  if (!opt || type === 'normal') return null
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 bg-line ${opt.color}`} style={{ borderRadius: '10px' }}>
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
        className="flex items-center gap-1 bg-line px-2 py-1 text-[11px] font-medium text-muted"
        style={{ borderRadius: '10px' }}
      >
        <span className={current.color}>{current.label}</span>
        <ChevronDown size={10} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-surface border border-line overflow-hidden min-w-[120px]" style={{ borderRadius: '16px' }}>
          {SET_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-line transition-colors ${opt.color} ${value === opt.value ? 'bg-line' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface PartnerPickerProps {
  currentExercise: PlanExercise
  allExercises: PlanExercise[]
  onLink: (partnerId: number) => void
}
function PartnerPicker({ currentExercise, allExercises, onLink }: PartnerPickerProps) {
  const [open, setOpen] = useState(false)
  const partners = allExercises.filter(ex => ex.id !== currentExercise.id)
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 bg-line px-2 py-1 text-[11px] font-medium text-muted"
        style={{ borderRadius: '10px' }}
      >
        <span>Link to...</span>
        <ChevronDown size={10} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-surface border border-line overflow-hidden min-w-[160px] max-h-[200px] overflow-y-auto" style={{ borderRadius: '16px' }}>
          <button
            onClick={() => { onLink(-1); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-line transition-colors text-muted"
          >
            None
          </button>
          {partners.map(ex => (
            <button
              key={ex.id}
              onClick={() => { onLink(ex.id!); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-line transition-colors text-ink flex items-center gap-2"
            >
              {ex.supersetGroup && ex.supersetColor && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ex.supersetColor }} />
              )}
              <span className="truncate">{ex.exercise}</span>
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
  const [deleteExConfirm, setDeleteExConfirm] = useState<PlanExercise | null>(null)
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
    const changes = {
      title,
      days: activeDays.join(','),
      exercises: exercises.filter(e => e.enabled).map(e => e.exercise).join(','),
    }
    await updatePlan(plan.id, changes)
    navigate(-1)
  }

  async function deletePlan() {
    if (!plan?.id) return
    await deletePlanSync(plan.id)
    navigate('/plans')
  }

  function toggleDay(d: number) {
    setActiveDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function toggleExercise(ex: PlanExercise) {
    await updatePlanExercise(ex.id!, { enabled: !ex.enabled })
    load()
  }

  async function deleteExercisePermanently(ex: PlanExercise) {
    await deletePlanExercise(ex.id!)
    if (plan?.id) {
      const remaining = exercises.filter(e => e.id !== ex.id && e.enabled).map(e => e.exercise)
      await updatePlan(plan.id, { exercises: remaining.join(',') })
    }
    setDeleteExConfirm(null)
    load()
  }

  async function handleExerciseAdded() {
    closeExerciseModal()
    load()
  }

  async function handleReorder(newItems: PlanExercise[]) {
    setExercises(newItems)
    await Promise.all(newItems.map((ex, i) => updatePlanExercise(ex.id!, { sortOrder: i })))
  }

  async function updateSets(ex: PlanExercise, delta: number) {
    const next = Math.max(1, ex.maxSets + delta)
    await updatePlanExercise(ex.id!, { maxSets: next })
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, maxSets: next } : e))
  }

  async function updateSetType(ex: PlanExercise, setType: SetType) {
    if (setType !== 'superset' && ex.supersetGroup) {
      await clearSupersetGroup(ex)
    }
    await updatePlanExercise(ex.id!, { setType })
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, setType } : e))
  }

  async function clearSupersetGroup(ex: PlanExercise) {
    if (!ex.supersetGroup) return
    const groupId = ex.supersetGroup
    await updatePlanExercise(ex.id!, { supersetGroup: undefined, supersetColor: undefined })
    const remaining = exercises.filter(e => e.id !== ex.id && e.supersetGroup === groupId)
    if (remaining.length === 1) {
      await updatePlanExercise(remaining[0].id!, { supersetGroup: undefined, supersetColor: undefined })
    }
    load()
  }

  function getUnusedColor(): string {
    const usedColors = new Set(exercises.map(e => e.supersetColor).filter(Boolean))
    const available = SUPERSET_COLORS.filter(c => !usedColors.has(c))
    if (available.length > 0) return available[0]
    // All colors used, pick random
    return SUPERSET_COLORS[Math.floor(Math.random() * SUPERSET_COLORS.length)]
  }

  async function linkSuperset(currentEx: PlanExercise, partnerId: number) {
    if (partnerId === -1) {
      // Clear link
      await clearSupersetGroup(currentEx)
      return
    }

    const partner = exercises.find(e => e.id === partnerId)
    if (!partner) return

    let groupId: string
    let color: string

    if (partner.supersetGroup && partner.supersetColor) {
      groupId = partner.supersetGroup
      color = partner.supersetColor
    } else {
      groupId = `ss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      color = getUnusedColor()
      await updatePlanExercise(partner.id!, { supersetGroup: groupId, supersetColor: color })
    }
    await updatePlanExercise(currentEx.id!, { supersetGroup: groupId, supersetColor: color })

    // Reorder so they're consecutive
    await reorderSupersetGroup(groupId)
    load()
  }

  async function reorderSupersetGroup(groupId: string) {
    const groupMembers = exercises.filter(e => e.supersetGroup === groupId)
    if (groupMembers.length < 2) return
    const firstIdx = exercises.findIndex(e => e.id === groupMembers[0].id)
    const withoutGroup = exercises.filter(e => e.supersetGroup !== groupId)
    const reordered = [
      ...withoutGroup.slice(0, firstIdx),
      ...groupMembers,
      ...withoutGroup.slice(firstIdx)
    ]
    await Promise.all(reordered.map((ex, i) => updatePlanExercise(ex.id!, { sortOrder: i })))
  }

  const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

  async function handleDeleteConfirm() {
    if (deleteConfirmTarget?.type === 'plan') await deletePlan()
    closeDeleteConfirm()
  }

  // Group exercises by supersetGroup for visual rendering
  type VisualGroup = { 
    type: 'single'; 
    ex: PlanExercise; 
    idx: number 
  } | { 
    type: 'group'; 
    groupId: string;
    color: string;
    items: { ex: PlanExercise; idx: number }[] 
  }

  const visualGroups: VisualGroup[] = []
  let i = 0
  while (i < exercises.length) {
    const ex = exercises[i]
    if (ex.supersetGroup && ex.supersetColor) {
      // Start of a superset group
      const groupId = ex.supersetGroup
      const groupItems: { ex: PlanExercise; idx: number }[] = []
      while (i < exercises.length && exercises[i].supersetGroup === groupId) {
        groupItems.push({ ex: exercises[i], idx: i })
        i++
      }
      visualGroups.push({ type: 'group', groupId, color: ex.supersetColor, items: groupItems })
    } else {
      visualGroups.push({ type: 'single', ex, idx: i })
      i++
    }
  }

  function renderExRow(ex: PlanExercise, idx: number) {
    const isSuperset = ex.setType === 'superset'
    
    return (
      <div key={ex.id} className="bg-surface p-3 flex flex-col gap-3" {...getItemProps(idx)} style={{ borderRadius: '16px' }}>
        {/* Top row: drag handle, exercise name, remove button */}
        <div className="flex items-center gap-3">
          <span {...getHandleProps(idx)}>
            <GripVertical size={20} strokeWidth={1.5} className="text-muted" />
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[16px] text-ink truncate">{ex.exercise}</span>
            <SetTypeBadge type={ex.setType ?? 'normal'} />
          </div>
          <button
            onClick={() => setDeleteExConfirm(ex)}
            className="p-1 text-muted hover:text-danger transition-colors"
            aria-label="Delete exercise"
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
          <Toggle checked={ex.enabled} onChange={() => toggleExercise(ex)} />
        </div>

        {/* Second row: set count stepper */}
        <div className="flex items-center justify-between pl-8">
          <span className="text-[13px] font-medium text-muted">Sets</span>
          <div className="flex items-center gap-1.5 bg-line px-2 py-1" style={{ borderRadius: '10px' }}>
            <button onClick={() => updateSets(ex, -1)} className="w-6 h-6 flex items-center justify-center text-accent-soft active:opacity-60">
              <Minus size={14} strokeWidth={1.5} />
            </button>
            <span className="text-[15px] font-medium text-ink w-4 text-center tabular-nums">{ex.maxSets}</span>
            <button onClick={() => updateSets(ex, 1)} className="w-6 h-6 flex items-center justify-center text-accent-soft active:opacity-60">
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Third row: set type picker and partner picker */}
        <div className="flex items-center gap-2 pl-8">
          <span className="text-[13px] font-medium text-muted">Type</span>
          <SetTypePicker value={ex.setType ?? 'normal'} onChange={v => updateSetType(ex, v)} />
          {isSuperset && (
            <PartnerPicker currentExercise={ex} allExercises={exercises} onLink={partnerId => linkSuperset(ex, partnerId)} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ground pb-8">
      <header className="sticky top-0 w-full z-50 bg-ground/90 backdrop-blur-md flex justify-between items-center px-3 h-14 border-b border-line">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-ink hover:bg-surface" style={{ borderRadius: '10px' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-medium text-ink absolute left-1/2 -translate-x-1/2">Edit Plan</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-3 py-3 gap-8">
        <section className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-muted px-1">Plan Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-surface text-ink text-[16px] p-3 w-full border border-transparent focus:border-accent-hover focus:outline-none placeholder-muted"
            style={{ borderRadius: '10px' }}
          />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted px-1">Active Days</span>
          <div className="flex justify-between items-center bg-surface p-3" style={{ borderRadius: '16px' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((d, idx) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`w-9 h-9 flex items-center justify-center font-medium text-[15px] transition-all ${
                  activeDays.includes(d) ? 'bg-accent text-ink' : 'bg-line text-muted'
                }`}
                style={{ borderRadius: '10px' }}
              >
                {DAYS[idx]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[24px] font-medium text-ink">Exercises</h2>
          {/* Scrollable exercise list */}
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto" data-drag-list>
            {visualGroups.map((g, gi) => {
              if (g.type === 'single') return renderExRow(g.ex, g.idx)
              // Superset group with colored border
              return (
                <div key={`group-${gi}`} className="border-l-[3px] pl-2 flex flex-col gap-2" style={{ borderColor: g.color, borderRadius: '0 16px 16px 0' }}>
                  <span className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: g.color }}>
                    SUPERSET
                  </span>
                  {g.items.map(({ ex, idx }) => renderExRow(ex, idx))}
                </div>
              )
            })}
          </div>
          <button
            onClick={() => plan?.id && openExerciseModal(plan.id)}
            className="border border-line text-accent-soft min-h-[48px] py-3 flex items-center justify-center gap-2 font-medium text-[15px] w-full"
            style={{ borderRadius: '10px' }}
          >
            <Plus size={20} strokeWidth={1.5} />
            Add Exercise
          </button>
          {exercises.length === 0 && (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="border border-accent-hover/40 text-accent-soft min-h-[48px] py-3 flex items-center justify-center gap-2 font-medium text-[15px] w-full"
              style={{ borderRadius: '10px' }}
            >
              <LayoutTemplate size={20} strokeWidth={1.5} />
              Start from a template
            </button>
          )}
        </section>

        <div className="flex-1" />

        <section className="mt-8 flex flex-col gap-4 pb-8">
          <button onClick={save} className="bg-accent text-ink min-h-[48px] flex justify-center items-center font-medium text-[15px] w-full" style={{ borderRadius: '10px' }}>
            Save
          </button>
          <button
            onClick={() => plan?.id && openDeleteConfirm({ type: 'plan', id: plan.id, name: plan.title })}
            className="text-danger font-medium text-[15px] w-full flex justify-center py-3"
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

      {/* Permanent exercise delete confirmation */}
      {deleteExConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ground/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-surface border border-line p-4 flex flex-col gap-4" style={{ borderRadius: '16px' }}>
            <h3 className="text-[16px] font-semibold text-ink">Delete Exercise</h3>
            <p className="text-[15px] text-muted">
              Delete <span className="text-ink font-medium">"{deleteExConfirm.exercise}"</span> from this plan? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteExConfirm(null)}
                className="flex-1 h-11 border border-line text-ink font-medium text-[15px]"
                style={{ borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteExercisePermanently(deleteExConfirm)}
                className="flex-1 h-11 bg-danger-fill text-ink font-medium text-[15px] flex items-center justify-center gap-2"
                style={{ borderRadius: '10px' }}
              >
                <Trash2 size={16} strokeWidth={1.5} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
