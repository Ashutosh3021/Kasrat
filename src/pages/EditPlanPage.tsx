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
  { value: 'normal',    label: 'Normal',    color: 'text-[#A1A1A6]' },
  { value: 'warmup',    label: 'Warm-up',   color: 'text-amber-400' },
  { value: 'superset',  label: 'Superset',  color: 'text-[#60A5FA]' },
  { value: 'giant',     label: 'Giant Set', color: 'text-purple-400' },
  { value: 'circuit',   label: 'Circuit',   color: 'text-emerald-400' },
]

const SUPERSET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

function SetTypeBadge({ type }: { type: SetType }) {
  const opt = SET_TYPE_OPTIONS.find(o => o.value === type)
  if (!opt || type === 'normal') return null
  return (
    <span className={`text-[11px] font-medium px-1.5 py-0.5 bg-[#2C2C2E] ${opt.color}`} style={{ borderRadius: '2px' }}>
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
        className="flex items-center gap-1 bg-[#2C2C2E] px-2 py-1 text-[11px] font-medium text-[#A1A1A6]"
        style={{ borderRadius: '2px' }}
      >
        <span className={current.color}>{current.label}</span>
        <ChevronDown size={10} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden min-w-[120px]" style={{ borderRadius: '4px' }}>
          {SET_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-[#2C2C2E] transition-colors ${opt.color} ${value === opt.value ? 'bg-[#2C2C2E]' : ''}`}
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
        className="flex items-center gap-1 bg-[#2C2C2E] px-2 py-1 text-[11px] font-medium text-[#A1A1A6]"
        style={{ borderRadius: '2px' }}
      >
        <span>Link to...</span>
        <ChevronDown size={10} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-[#1C1C1E] border border-[#2C2C2E] overflow-hidden min-w-[160px] max-h-[200px] overflow-y-auto" style={{ borderRadius: '4px' }}>
          <button
            onClick={() => { onLink(-1); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-[#2C2C2E] transition-colors text-[#A1A1A6]"
          >
            None
          </button>
          {partners.map(ex => (
            <button
              key={ex.id}
              onClick={() => { onLink(ex.id!); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-[13px] font-medium hover:bg-[#2C2C2E] transition-colors text-white flex items-center gap-2"
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
    // If changing away from superset, clear group
    if (setType !== 'superset' && ex.supersetGroup) {
      await clearSupersetGroup(ex)
    }
    await db.plan_exercises.update(ex.id!, { setType })
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, setType } : e))
  }

  async function clearSupersetGroup(ex: PlanExercise) {
    if (!ex.supersetGroup) return
    const groupId = ex.supersetGroup
    // Clear this exercise
    await db.plan_exercises.update(ex.id!, { supersetGroup: undefined, supersetColor: undefined })
    // Check if any other exercises remain in the group
    const remaining = exercises.filter(e => e.id !== ex.id && e.supersetGroup === groupId)
    // If only one remains, clear it too (no solo supersets)
    if (remaining.length === 1) {
      await db.plan_exercises.update(remaining[0].id!, { supersetGroup: undefined, supersetColor: undefined })
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
      // Partner already in a group, join it
      groupId = partner.supersetGroup
      color = partner.supersetColor
    } else {
      // Create new group
      groupId = `ss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      color = getUnusedColor()
      // Update partner
      await db.plan_exercises.update(partner.id!, { supersetGroup: groupId, supersetColor: color })
    }

    // Update current exercise
    await db.plan_exercises.update(currentEx.id!, { supersetGroup: groupId, supersetColor: color })

    // Reorder so they're consecutive
    await reorderSupersetGroup(groupId)
    load()
  }

  async function reorderSupersetGroup(groupId: string) {
    const groupMembers = exercises.filter(e => e.supersetGroup === groupId)
    if (groupMembers.length < 2) return

    // Find the first member's position
    const firstIdx = exercises.findIndex(e => e.id === groupMembers[0].id)
    
    // Remove all group members from their current positions
    const withoutGroup = exercises.filter(e => e.supersetGroup !== groupId)
    
    // Insert all group members at the first position
    const reordered = [
      ...withoutGroup.slice(0, firstIdx),
      ...groupMembers,
      ...withoutGroup.slice(firstIdx)
    ]

    // Update sort orders
    await Promise.all(reordered.map((ex, i) => db.plan_exercises.update(ex.id!, { sortOrder: i })))
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
      <div key={ex.id} className="bg-[#1C1C1E] p-3 flex items-center gap-3" {...getItemProps(idx)} style={{ borderRadius: '4px' }}>
        <span {...getHandleProps(idx)}>
          <GripVertical size={20} strokeWidth={1.5} className="text-[#A1A1A6]" />
        </span>
        <div className="flex-1 flex flex-col min-w-0 gap-1">
          <span className="text-[17px] text-white truncate">{ex.exercise}</span>
          <SetTypeBadge type={ex.setType ?? 'normal'} />
        </div>
        {/* Set type picker */}
        <SetTypePicker value={ex.setType ?? 'normal'} onChange={v => updateSetType(ex, v)} />
        {/* Partner picker (only show if superset) */}
        {isSuperset && (
          <PartnerPicker currentExercise={ex} allExercises={exercises} onLink={partnerId => linkSuperset(ex, partnerId)} />
        )}
        {/* Set count stepper */}
        <div className="flex items-center gap-1.5 bg-[#2C2C2E] px-2 py-1 shrink-0" style={{ borderRadius: '2px' }}>
          <button onClick={() => updateSets(ex, -1)} className="w-6 h-6 flex items-center justify-center text-[#3B82F6] active:opacity-60">
            <Minus size={14} strokeWidth={1.5} />
          </button>
          <span className="text-[15px] font-medium text-white w-4 text-center tabular-nums">{ex.maxSets}</span>
          <button onClick={() => updateSets(ex, 1)} className="w-6 h-6 flex items-center justify-center text-[#3B82F6] active:opacity-60">
            <Plus size={14} strokeWidth={1.5} />
          </button>
        </div>
        <Toggle checked={ex.enabled} onChange={() => toggleExercise(ex)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-md flex justify-between items-center px-3 h-14 border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1C1C1E]" style={{ borderRadius: '2px' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-medium text-white absolute left-1/2 -translate-x-1/2">Edit Plan</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-3 py-3 gap-8">
        <section className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#A1A1A6] px-1">Plan Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-[#1C1C1E] text-white text-[17px] p-3 w-full border border-transparent focus:border-[#3B82F6] focus:outline-none placeholder-[#A1A1A6]"
            style={{ borderRadius: '2px' }}
          />
        </section>

        <section className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-[#A1A1A6] px-1">Active Days</span>
          <div className="flex justify-between items-center bg-[#1C1C1E] p-3" style={{ borderRadius: '4px' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((d, idx) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`w-9 h-9 flex items-center justify-center font-medium text-[15px] transition-all ${
                  activeDays.includes(d) ? 'bg-[#3B82F6] text-white' : 'bg-[#2C2C2E] text-[#A1A1A6]'
                }`}
                style={{ borderRadius: '2px' }}
              >
                {DAYS[idx]}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[22px] font-medium text-white">Exercises</h2>
          {/* Scrollable exercise list */}
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto" data-drag-list>
            {visualGroups.map((g, gi) => {
              if (g.type === 'single') return renderExRow(g.ex, g.idx)
              // Superset group with colored border
              return (
                <div key={`group-${gi}`} className="border-l-[3px] pl-2 flex flex-col gap-2" style={{ borderColor: g.color, borderRadius: '0 4px 4px 0' }}>
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
            className="border border-[#2C2C2E] text-[#3B82F6] min-h-[48px] py-3 flex items-center justify-center gap-2 font-medium text-[15px] w-full"
            style={{ borderRadius: '2px' }}
          >
            <Plus size={20} strokeWidth={1.5} />
            Add Exercise
          </button>
          {exercises.length === 0 && (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="border border-[#3B82F6]/40 text-[#3B82F6] min-h-[48px] py-3 flex items-center justify-center gap-2 font-medium text-[15px] w-full"
              style={{ borderRadius: '2px' }}
            >
              <LayoutTemplate size={20} strokeWidth={1.5} />
              Start from a template
            </button>
          )}
        </section>

        <div className="flex-1" />

        <section className="mt-8 flex flex-col gap-4 pb-8">
          <button onClick={save} className="bg-[#3B82F6] text-white min-h-[48px] flex justify-center items-center font-medium text-[15px] w-full" style={{ borderRadius: '2px' }}>
            Save
          </button>
          <button
            onClick={() => plan?.id && openDeleteConfirm({ type: 'plan', id: plan.id, name: plan.title })}
            className="text-[#FF453A] font-medium text-[15px] w-full flex justify-center py-3"
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
