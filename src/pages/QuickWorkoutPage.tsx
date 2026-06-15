import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, CheckCircle, X, GripVertical,
  Camera, FileText, Flag, Trash2, ChevronDown,
  TrendingUp, TrendingDown, Minus, Info
} from 'lucide-react'
// ── New feature toolbar (Features 2, 6, 7, 11, 13, 14) ────────────────────
import WorkoutFeatureToolbar from '../features/workoutToolbar/WorkoutFeatureToolbar'
import { db, type PlanExercise, type GymSet } from '../db/database'
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'
import { useUIStore } from '../store/uiStore'
import ExerciseModal from '../overlays/ExerciseModal'
import { useDragToReorder } from '../hooks/useDragToReorder'
import { addGymSet, addPlan, addPlanExercise, deletePlanExercise, updatePlanExercise, deleteGymSet, upsertExerciseMeta } from '../supabase/writeSync'
import { getOverloadTrend } from '../utils/progressiveOverload'

// ─── Brzycki 1RM ──────────────────────────────────────────────────────────────
function brzycki(w: number, r: number): number | null {
  if (w <= 0 || r <= 0 || r > 10) return null
  return Math.round(w * (36 / (37 - r)))
}

// ─── Diff bar ─────────────────────────────────────────────────────────────────
interface PrevSet { weight: number; reps: number }

function DiffBar({ prev, curWeight, curReps, unit }: { prev: PrevSet | null; curWeight: string; curReps: string; unit: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  const cw = parseFloat(curWeight), cr = parseInt(curReps)
  const hasInput = !isNaN(cw) && cw > 0 && !isNaN(cr) && cr > 0
  let indicator = null
  if (prev && hasInput) {
    const trend = getOverloadTrend(prev, cw, cr)
    if (trend === 'up') indicator = <TrendingUp size={14} className="text-emerald-400" />
    else if (trend === 'down') indicator = <TrendingDown size={14} className="text-red-400" />
    else indicator = <Minus size={14} className="text-[#A1A1A6]" />
  }
  return (
    <div className="flex items-center justify-between bg-[#1C1C1E] border border-[#2C2C2E] px-3 py-2 text-[13px]" style={{ borderRadius: '2px' }}>
      {prev ? (
        <>
          <span className="text-[#A1A1A6]">Last: <span className="text-white font-medium">{prev.weight} {unit} × {prev.reps}</span></span>
          <div className="flex items-center gap-1.5">
            {indicator}
            <button onClick={() => setDismissed(true)} className="text-[#A1A1A6] hover:text-white ml-1 text-[11px]">×</button>
          </div>
        </>
      ) : (
        <span className="text-[#A1A1A6] italic">First time — set a baseline!</span>
      )}
    </div>
  )
}

// ─── Cues popover ─────────────────────────────────────────────────────────────
function CuesPopover({ cues }: { cues: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-1 transition-colors ${open ? 'text-[#93032E]' : 'text-[#A1A1A6] hover:text-[#93032E]'}`}
        style={{ borderRadius: '2px' }}
        aria-label="Coach's cues"
      >
        <Info size={16} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-64 bg-[#1C1C1E] border border-[#2C2C2E] p-3 animate-fadeIn" style={{ borderRadius: '4px' }}>
          <p className="text-[13px] text-[#A1A1A6] leading-relaxed">{cues}</p>
        </div>
      )}
    </div>
  )
}

// ─── Per-exercise input state ─────────────────────────────────────────────────
interface ExInput { weight: string; reps: string; rpe: string; rir: string; showMore: boolean }
const defaultInput = (): ExInput => ({ weight: '', reps: '', rpe: '', rir: '', showMore: false })

// ─── Save as Plan dialog ──────────────────────────────────────────────────────
interface SavePlanDialogProps {
  exerciseNames: string[]
  onSave: (title: string) => void
  onSkip: () => void
}
function SavePlanDialog({ exerciseNames, onSave, onSkip }: SavePlanDialogProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#151515]/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#1C1C1E] border border-[#2C2C2E] p-4 flex flex-col gap-4" style={{ borderRadius: '4px' }}>
        <h3 className="text-[17px] font-semibold text-white">Save as Plan?</h3>
        <p className="text-[13px] text-[#A1A1A6]">
          Save this workout ({exerciseNames.length} exercise{exerciseNames.length !== 1 ? 's' : ''}) as a reusable plan.
        </p>
        <input
          autoFocus
          value={title}
          onChange={e => { setTitle(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && title.trim() && onSave(title.trim())}
          placeholder="Plan name (e.g. Push Day)"
          className="w-full bg-[#151515] border border-[#2C2C2E] px-3 py-2.5 text-[15px] text-white placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none"
          style={{ borderRadius: '2px' }}
        />
        {error && <p className="text-[#FF453A] text-[13px]">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onSkip} className="flex-1 h-11 border border-[#2C2C2E] text-[#A1A1A6] font-medium text-[15px]" style={{ borderRadius: '2px' }}>
            Skip
          </button>
          <button
            onClick={() => {
              if (!title.trim()) { setError('Name required'); return }
              onSave(title.trim())
            }}
            className="flex-1 h-11 bg-[#93032E] text-white font-medium text-[15px]"
            style={{ borderRadius: '2px' }}
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// planId = -1 is the sentinel for a quick/empty workout in workoutStore.
const QUICK_PLAN_ID = -1

export default function QuickWorkoutPage() {
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const { start: startTimer } = useTimerStore()
  const workout = useWorkoutStore()
  const { openExerciseModal, exerciseModalOpen, closeExerciseModal } = useUIStore()

  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [showSavePlan, setShowSavePlan] = useState(false)
  const [prevSets, setPrevSets] = useState<Record<string, PrevSet | null>>({})
  const [cuesMap, setCuesMap] = useState<Record<string, string>>({})
  const [expandedSet, setExpandedSet] = useState<Set<number>>(() => new Set([0]))
  const [inputMap, setInputMap] = useState<Record<string, ExInput>>({})

  // Fix 4: Camera + coaching notes state
  const [pendingImages, setPendingImages] = useState<Record<string, string>>({})
  const [showNoteField, setShowNoteField] = useState<Record<string, boolean>>({})
  const [coachingNoteInputs, setCoachingNoteInputs] = useState<Record<string, string>>({})
  const [cameraForExercise, setCameraForExercise] = useState<string | null>(null)

  // Fix 4: Refs (double-tap guard already existed, camera input new)
  const isLogging = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function getInput(name: string): ExInput { return inputMap[name] ?? defaultInput() }
  function patchInput(name: string, patch: Partial<ExInput>) {
    setInputMap(prev => ({ ...prev, [name]: { ...(prev[name] ?? defaultInput()), ...patch } }))
  }

  // Start session on mount (planId = -1 = quick workout)
  useEffect(() => {
    if (workout.activePlanId !== QUICK_PLAN_ID) {
      workout.startSession(QUICK_PLAN_ID, 'Quick Workout')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PERF-002 fix: batch all prev-set queries into a single Promise.all → one re-render
  useEffect(() => {
    if (exercises.length === 0) return
    async function loadAll() {
      const results = await Promise.all(
        exercises.map(async ex => {
          const [rows, meta] = await Promise.all([
            db.gym_sets
              .where('name').equals(ex.exercise)
              .filter(s => !s.hidden && s.reps > 0)
              .toArray(),
            db.exercise_meta.get(ex.exercise),
          ])
          const last = rows.sort((a, b) => b.created.localeCompare(a.created))[0]
          return {
            name: ex.exercise,
            prev: last ? { weight: last.weight, reps: last.reps } : null,
            cue: meta?.cues ?? '',
          }
        })
      )
      const newPrevSets: Record<string, PrevSet | null> = {}
      const newCuesMap: Record<string, string> = {}
      for (const r of results) {
        newPrevSets[r.name] = r.prev
        newCuesMap[r.name] = r.cue
      }
      setPrevSets(newPrevSets)
      setCuesMap(newCuesMap)
    }
    loadAll()
  }, [exercises])

  const loggedSets = workout.loggedSets
  const completedSet = new Set(workout.completedExercises)

  // ── Add exercise from modal ────────────────────────────────────────────────
  async function handleExerciseAdded() {
    closeExerciseModal()
    const rows = await db.plan_exercises.where('planId').equals(QUICK_PLAN_ID).toArray()
    const sorted = rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    setExercises(sorted)
    // Auto-expand the newly added exercise
    setExpandedSet(prev => { const n = new Set(prev); n.add(sorted.length - 1); return n })
  }

  async function saveCoachingNote(exerciseName: string, noteText: string) {
    await upsertExerciseMeta({ name: exerciseName, cues: noteText.trim() || undefined })
    setCuesMap(prev => ({ ...prev, [exerciseName]: noteText.trim() }))
    setShowNoteField(prev => ({ ...prev, [exerciseName]: false }))
  }

  // ── Log a set ──────────────────────────────────────────────────────────────
  async function logSet(ex: PlanExercise, exIdx: number) {
    if (isLogging.current) return  // SESSION-002: double-tap guard
    const inp = getInput(ex.exercise)
    const w = parseFloat(inp.weight)
    const r = parseInt(inp.reps)
    // SESSION-001: validate parsed numbers, not string truthiness
    if (isNaN(w) || w <= 0 || isNaN(r) || r <= 0) return
    isLogging.current = true
    try {
      patchInput(ex.exercise, { reps: '', rpe: '', rir: '' }) // clear immediately (optimistic)
      const set: Omit<GymSet, 'id'> = {
        name: ex.exercise, weight: w, reps: r,
        unit: settings.strengthUnit,
        created: new Date().toISOString(),
        hidden: false, bodyWeight: false, duration: 0, distance: 0, cardio: false,
        restMs: settings.timerDuration * 1000,
        planId: undefined,
        sessionId: workout.sessionId ?? undefined, // SESSION-004: stamp sessionId
        rpe: inp.rpe !== '' ? parseFloat(inp.rpe) : undefined,
        rir: inp.rir !== '' ? parseFloat(inp.rir) : undefined,
        // Fix 4: attach photo when present
        notes: undefined,
        image: pendingImages[ex.exercise] || undefined,
      }
      // Fix 4 (and Fix 1 parity): stamp the Dexie id on the logged set
      const gymSetId = await addGymSet(set) as number
      workout.addLoggedSet(ex.exercise, {
        exercise: ex.exercise, weight: w, reps: r,
        rpe: set.rpe, rir: set.rir,
        id: gymSetId,
      })

      // Clear per-set image
      setPendingImages(prev => { const n = { ...prev }; delete n[ex.exercise]; return n })

      if (settings.restTimers) startTimer(settings.timerDuration)
      const setsForEx = [...(loggedSets[ex.exercise] ?? []), { exercise: ex.exercise, weight: w, reps: r }]
      if (setsForEx.length >= ex.maxSets) workout.markExerciseDone(ex.exercise)
    } finally {
      isLogging.current = false
    }
  }

  // ── Finish ──────────────────────────────────────────────────────────────────
  async function handleFinish() {
    setShowSavePlan(true)
  }

  async function finishAndSave(planTitle: string) {
    const count = await db.plans.count()
    const planId = await addPlan({ sequence: count, title: planTitle, exercises: exercises.map(e => e.exercise).join(','), days: '' })
    await Promise.all(exercises.map((ex, i) =>
      addPlanExercise({ planId: planId as number, exercise: ex.exercise, enabled: true, maxSets: ex.maxSets, sortOrder: i })
    ))
    await cleanupTempExercises()
    workout.finishSession()
    navigate('/', { replace: true })
  }

  async function finishWithoutSaving() {
    await cleanupTempExercises()
    workout.finishSession()
    navigate('/', { replace: true })
  }

  async function handleDiscard() {
    // SESSION-004 + SYNC-003: use sessionId for precise, indexed, sync-aware delete
    if (workout.sessionId) {
      const setsToDelete = await db.gym_sets
        .where('sessionId').equals(workout.sessionId)
        .toArray()
      for (const s of setsToDelete) {
        await deleteGymSet(s.id!)
      }
    }
    await cleanupTempExercises()
    workout.finishSession()
    navigate('/', { replace: true })
  }

  async function cleanupTempExercises() {
    await db.plan_exercises.where('planId').equals(QUICK_PLAN_ID).delete()
  }

  // ── Delete exercise from session ───────────────────────────────────────────
  async function deleteExercise(ex: PlanExercise) {
    await deletePlanExercise(ex.id!)
    setExercises(prev => prev.filter(e => e.id !== ex.id))
  }

  // ── Drag to reorder ────────────────────────────────────────────────────────
  async function handleReorder(newItems: PlanExercise[]) {
    setExercises(newItems)
    await Promise.all(newItems.map((ex, i) => updatePlanExercise(ex.id!, { sortOrder: i })))
  }

  function toggleExpanded(idx: number) {
    setExpandedSet(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  // Fix 4: Camera handlers
  function handleCameraClick(exerciseName: string) {
    setCameraForExercise(exerciseName)
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !cameraForExercise) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setPendingImages(prev => ({ ...prev, [cameraForExercise]: dataUrl }))
      setCameraForExercise(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

  // ─── Render exercise card ──────────────────────────────────────────────────
  function renderExerciseRow(ex: PlanExercise, i: number) {
    const done = completedSet.has(ex.exercise)
    const sets = loggedSets[ex.exercise] ?? []
    const isExpanded = expandedSet.has(i)
    const prevSet = prevSets[ex.exercise]
    const inp = getInput(ex.exercise)
    const orm = brzycki(parseFloat(inp.weight), parseInt(inp.reps))

    return (
      <article
        key={ex.id}
        className={`bg-[#1C1C1E] p-3 flex flex-col gap-3 relative border border-[#2C2C2E] ${done ? 'opacity-60' : ''}`}
        {...getItemProps(i)}
        style={{ borderRadius: '4px' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={e => {
            if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[data-drag-handle]'))
              toggleExpanded(i)
          }}
        >
          <span {...getHandleProps(i)} data-drag-handle>
            <GripVertical size={20} strokeWidth={1.5} className="text-[#A1A1A6] shrink-0" />
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {done && <CheckCircle size={18} strokeWidth={1.5} className="text-[#93032E] shrink-0" fill="#93032E" />}
            <h2 className={`text-[17px] font-medium text-white truncate ${done ? 'line-through' : ''}`}>{ex.exercise}</h2>
            {cuesMap[ex.exercise] && <CuesPopover cues={cuesMap[ex.exercise]} />}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={e => { e.stopPropagation(); deleteExercise(ex) }} className="text-[#A1A1A6] hover:text-[#FF453A] p-1">
              <X size={18} strokeWidth={1.5} />
            </button>
            <button onClick={e => { e.stopPropagation(); toggleExpanded(i) }} className="text-[#A1A1A6] hover:text-white p-1">
              <ChevronDown size={18} strokeWidth={1.5} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap pl-8">
          <span className="bg-[#2C2C2E] text-white px-2 py-1 text-[11px] font-medium" style={{ borderRadius: '2px' }}>
            {sets.length}/{ex.maxSets} sets
          </span>
        </div>

        {/* Expanded */}
        {isExpanded && (
          <>
            <div className="w-full h-px bg-[#2C2C2E]" />
            {sets.length > 0 && (
              <div className="flex flex-col gap-2 pl-8">
                {sets.map((s, si) => (
                  <div key={si} className="flex items-center justify-between py-1.5 border-b border-[#2C2C2E]">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-medium text-[#A1A1A6] w-10">Set {si + 1}</span>
                      <span className="text-[15px] text-white font-medium">{s.weight} {settings.strengthUnit}</span>
                      <span className="text-[#A1A1A6] text-sm">×</span>
                      <span className="text-[15px] text-white font-medium">{s.reps} reps</span>
                    </div>
                    <CheckCircle size={18} strokeWidth={1.5} className="text-[#93032E]" fill="#93032E" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-2 bg-[#151515]/50 p-3 border border-[#2C2C2E] flex flex-col gap-3 ml-8" style={{ borderRadius: '4px' }}>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[#93032E] w-10 shrink-0">Set {sets.length + 1}</span>
                <div className="flex-1 flex gap-3">
                  <div className="relative flex-1">
                    <label className="absolute -top-2 left-3 bg-[#151515] px-1 text-[10px] text-[#A1A1A6]">Weight ({settings.strengthUnit})</label>
                    <input type="number" inputMode="decimal" value={inp.weight}
                      onChange={e => patchInput(ex.exercise, { weight: e.target.value })}
                      className="w-full bg-transparent border border-white/30 px-3 py-2.5 text-white text-[15px] text-center focus:border-[#93032E] focus:outline-none"
                      style={{ borderRadius: '2px' }} placeholder="0" />
                  </div>
                  <div className="relative flex-1">
                    <label className="absolute -top-2 left-3 bg-[#151515] px-1 text-[10px] text-[#A1A1A6]">Reps</label>
                    <input type="number" inputMode="numeric" value={inp.reps}
                      onChange={e => patchInput(ex.exercise, { reps: e.target.value })}
                      className="w-full bg-transparent border border-white/30 px-3 py-2.5 text-white text-[15px] text-center focus:border-[#93032E] focus:outline-none"
                      style={{ borderRadius: '2px' }} placeholder="0" />
                  </div>
                </div>
              </div>

              {orm != null && (
                <div className="flex justify-end">
                  <span className="text-[11px] font-medium bg-[#1C1C1E]/80 text-[#93032E] border border-[#93032E]/30 px-2 py-0.5" style={{ borderRadius: '2px' }}>
                    ≈ 1RM: {orm} {settings.strengthUnit}
                  </span>
                </div>
              )}

              {prevSet !== undefined && (
                <DiffBar prev={prevSet ?? null} curWeight={inp.weight} curReps={inp.reps} unit={settings.strengthUnit} />
              )}

              <button
                onClick={() => patchInput(ex.exercise, { showMore: !inp.showMore })}
                className="flex items-center gap-1 text-[11px] font-medium text-[#A1A1A6] hover:text-white transition-colors self-start"
              >
                <ChevronDown size={12} strokeWidth={1.5} className={`transition-transform duration-150 ${inp.showMore ? 'rotate-180' : ''}`} />
                {inp.showMore ? 'Less' : 'RPE / RIR'}
              </button>
              {inp.showMore && (
                <div className="flex items-center gap-4 animate-fadeIn">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-medium text-[#A1A1A6]">RPE</span>
                    <input type="number" inputMode="numeric" value={inp.rpe}
                      onChange={e => patchInput(ex.exercise, { rpe: e.target.value })}
                      min={1} max={10} placeholder="1-10"
                      className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] text-[15px] text-white text-center focus:outline-none focus:border-[#93032E]"
                      style={{ borderRadius: '2px' }} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-medium text-[#A1A1A6]">RIR</span>
                    <input type="number" inputMode="numeric" value={inp.rir}
                      onChange={e => patchInput(ex.exercise, { rir: e.target.value })}
                      min={0} max={5} placeholder="0-5"
                      className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] text-[15px] text-white text-center focus:outline-none focus:border-[#93032E]"
                      style={{ borderRadius: '2px' }} />
                  </div>
                </div>
              )}

              {/* Coaching notes textarea (toggled by the FileText button below) */}
              {showNoteField[ex.exercise] && (
                <div className="flex flex-col gap-2 w-full mt-1">
                  <textarea
                    value={coachingNoteInputs[ex.exercise] ?? ''}
                    onChange={e => setCoachingNoteInputs(prev => ({ ...prev, [ex.exercise]: e.target.value }))}
                    placeholder="e.g., tucking elbows gives more impact on upper chest"
                    rows={2}
                    className="w-full bg-[#2C2C2E] border border-[#2C2C2E] px-3 py-2 text-[13px] text-white placeholder-[#A1A1A6] focus:border-[#93032E] focus:outline-none resize-none"
                    style={{ borderRadius: '2px' }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowNoteField(prev => ({ ...prev, [ex.exercise]: false }))}
                      className="px-3 py-1.5 text-[12px] bg-[#2C2C2E] text-white hover:bg-opacity-80 transition-all font-medium"
                      style={{ borderRadius: '2px' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveCoachingNote(ex.exercise, coachingNoteInputs[ex.exercise] ?? '')}
                      className="px-3 py-1.5 text-[12px] bg-[#93032E] text-white hover:bg-opacity-80 transition-all font-medium"
                      style={{ borderRadius: '2px' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Fix 4: Camera image indicator */}
              {pendingImages[ex.exercise] && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#93032E]">📷 Photo attached</span>
                  <button
                    onClick={() => setPendingImages(prev => { const n = { ...prev }; delete n[ex.exercise]; return n })}
                    className="text-[11px] text-[#A1A1A6] hover:text-[#FF453A]"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => logSet(ex, i)}
                  className="flex-1 bg-[#93032E] text-white font-medium text-[15px] py-2.5 flex items-center justify-center gap-2"
                  style={{ borderRadius: '2px' }}>
                  <Plus size={18} strokeWidth={1.5} />
                  Log Set
                </button>
                {/* Fix 4: Camera button — opens device camera/file picker */}
                <button
                  onClick={() => handleCameraClick(ex.exercise)}
                  className={`w-10 h-10 flex items-center justify-center transition-colors ${pendingImages[ex.exercise] ? 'bg-[#93032E]' : 'bg-[#2C2C2E]'} text-white`}
                  style={{ borderRadius: '2px' }}
                  title={pendingImages[ex.exercise] ? 'Photo selected — tap to change' : 'Attach photo'}
                >
                  <Camera size={18} strokeWidth={1.5} />
                </button>
                {/* FileText button — toggles coaching note editor */}
                <button
                  onClick={() => {
                    const isOpening = !showNoteField[ex.exercise]
                    setShowNoteField(prev => ({ ...prev, [ex.exercise]: isOpening }))
                    if (isOpening) {
                      setCoachingNoteInputs(prev => ({ ...prev, [ex.exercise]: cuesMap[ex.exercise] ?? '' }))
                    }
                  }}
                  className={`w-10 h-10 flex items-center justify-center transition-colors ${showNoteField[ex.exercise] ? 'bg-[#93032E]' : 'bg-[#2C2C2E]'} text-white`}
                  style={{ borderRadius: '2px' }}
                  title="Toggle coaching notes"
                >
                  <FileText size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </>
        )}
      </article>
    )
  }

  const totalSets = Object.values(loggedSets).reduce((n, arr) => n + arr.length, 0)
  const canFinish = totalSets > 0

  return (
    <div className="min-h-screen bg-[#151515] pb-8">
      <header className="fixed top-0 w-full z-40 bg-[#151515]/90 backdrop-blur-md flex flex-col">
        <div className="flex items-center justify-between px-3 h-14 border-b border-[#2C2C2E]">
          <button onClick={() => navigate(-1)} className="text-white p-2 -ml-2 hover:bg-[#1C1C1E]" style={{ borderRadius: '2px' }}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="text-[22px] font-medium text-white">Quick Workout</h1>
          <button onClick={handleFinish} className="flex items-center gap-1 text-[#93032E] font-medium text-[15px] p-2 -mr-1">
            <Flag size={18} strokeWidth={1.5} />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>
        <div className="px-3 py-2 text-center bg-[#151515]">
          <span className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {totalSets} sets logged
          </span>
        </div>
      </header>

      {/* ── New feature toolbar: Precision / 1RM Calc / Custom Ex / AI / Feedback ── */}
      <div className="fixed top-[calc(3.5rem+2.5rem)] w-full z-30">
        <WorkoutFeatureToolbar
          sessionDate={new Date().toISOString().slice(0, 10)}
          showAI
        />
      </div>

      <main className="flex-1 px-3 pt-44 pb-8 flex flex-col gap-4">
        {exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-[#A1A1A6] text-[15px]">No exercises yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-drag-list>
            {exercises.map((ex, i) => renderExerciseRow(ex, i))}
          </div>
        )}

        {/* Add exercise */}
        <button
          onClick={() => openExerciseModal(QUICK_PLAN_ID)}
          className="w-full border border-[#2C2C2E] text-[#93032E] font-medium text-[15px] h-12 flex items-center justify-center gap-2 hover:border-[#93032E]/40 transition-colors"
          style={{ borderRadius: '2px' }}
        >
          <Plus size={18} strokeWidth={1.5} />
          Add Exercise
        </button>

        {/* Finish */}
        <button
          onClick={handleFinish}
          disabled={!canFinish}
          className="w-full bg-[#1C1C1E] border border-[#93032E] text-[#93032E] font-medium text-[15px] h-12 flex items-center justify-center gap-2 disabled:opacity-40 disabled:border-[#2C2C2E] disabled:text-[#A1A1A6] transition-opacity"
          style={{ borderRadius: '2px' }}
          title={!canFinish ? 'Log at least one set to finish' : undefined}
        >
          <Flag size={18} strokeWidth={1.5} />
          Finish &amp; Save
        </button>

        {/* Discard */}
        {!confirmDiscard ? (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="w-full border border-[#2C2C2E] text-[#A1A1A6] font-medium text-[15px] h-12 flex items-center justify-center gap-2 hover:border-[#FF453A] hover:text-[#FF453A] transition-colors"
            style={{ borderRadius: '2px' }}
          >
            <Trash2 size={18} strokeWidth={1.5} />
            Discard Workout
          </button>
        ) : (
          <div className="w-full bg-[#1C1C1E] border border-[#FF453A]/40 p-3 flex flex-col gap-3" style={{ borderRadius: '4px' }}>
            <p className="text-[15px] text-white font-medium text-center">Discard this workout?</p>
            <p className="text-[13px] text-[#A1A1A6] text-center">All sets logged in this session will be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDiscard(false)} className="flex-1 h-11 border border-[#2C2C2E] text-white font-medium text-[15px]" style={{ borderRadius: '2px' }}>
                Cancel
              </button>
              <button onClick={handleDiscard} className="flex-1 h-11 bg-[#FF453A] text-white font-medium text-[15px] flex items-center justify-center gap-2" style={{ borderRadius: '2px' }}>
                <Trash2 size={16} strokeWidth={1.5} />
                Discard
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fix 4: Hidden camera file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        aria-hidden="true"
      />

      {exerciseModalOpen && (
        <ExerciseModal planId={QUICK_PLAN_ID} onClose={handleExerciseAdded} />
      )}

      {showSavePlan && (
        <SavePlanDialog
          exerciseNames={exercises.map(e => e.exercise)}
          onSave={finishAndSave}
          onSkip={finishWithoutSaving}
        />
      )}
    </div>
  )
}
