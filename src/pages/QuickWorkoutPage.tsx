import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, CheckCircle, X, GripVertical,
  Camera, FileText, Flag, Trash2, Info, ChevronDown,
  TrendingUp, TrendingDown, Minus, Repeat,
} from 'lucide-react'
import { db, type PlanExercise, type GymSet } from '../db/database'
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'
import { useUIStore } from '../store/uiStore'
import ExerciseModal from '../overlays/ExerciseModal'
import { useDragToReorder } from '../hooks/useDragToReorder'
import { addGymSet, addPlan, addPlanExercise, deletePlanExercise, updatePlanExercise } from '../supabase/writeSync'

// ─── Brzycki 1RM ──────────────────────────────────────────────────────────────
function brzycki(w: number, r: number): number | null {
  if (w <= 0 || r <= 0 || r >= 37) return null
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
    if (cw > prev.weight) indicator = <TrendingUp size={14} className="text-emerald-400" />
    else if (cw < prev.weight) indicator = <TrendingDown size={14} className="text-red-400" />
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
// We use planId = -1 as the sentinel for a quick/empty workout in workoutStore.
const QUICK_PLAN_ID = -1

export default function QuickWorkoutPage() {
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const { start: startTimer } = useTimerStore()
  const workout = useWorkoutStore()
  const { openExerciseModal, exerciseModalOpen, closeExerciseModal } = useUIStore()

  // Local exercise list (not backed by a real plan)
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [showSavePlan, setShowSavePlan] = useState(false)
  const [prevSets, setPrevSets] = useState<Record<string, PrevSet | null>>({})
  const [expandedSet, setExpandedSet] = useState<Set<number>>(() => new Set([0]))
  const [inputMap, setInputMap] = useState<Record<string, ExInput>>({})

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

  // Load prev sets whenever exercises change
  useEffect(() => {
    exercises.forEach(ex => {
      db.gym_sets
        .where('name').equals(ex.exercise)
        .filter(s => !s.hidden && s.reps > 0)
        .toArray()
        .then(rows => {
          const last = rows.sort((a, b) => b.created.localeCompare(a.created))[0]
          setPrevSets(prev => ({ ...prev, [ex.exercise]: last ? { weight: last.weight, reps: last.reps } : null }))
        })
    })
  }, [exercises])

  const loggedSets = workout.loggedSets
  const completedSet = new Set(workout.completedExercises)

  // ── Add exercise from modal ───────────────────────────────────────────────
  // We use a temporary planId = -1 in plan_exercises; clean up on finish/discard
  async function handleExerciseAdded() {
    closeExerciseModal()
    const rows = await db.plan_exercises.where('planId').equals(QUICK_PLAN_ID).toArray()
    const sorted = rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    setExercises(sorted)
    // Auto-expand the newly added exercise
    setExpandedSet(prev => { const n = new Set(prev); n.add(sorted.length - 1); return n })
  }

  // ── Log a set ─────────────────────────────────────────────────────────────
  async function logSet(ex: PlanExercise, exIdx: number) {
    const inp = getInput(ex.exercise)
    if (!inp.weight || !inp.reps) return
    const w = parseFloat(inp.weight), r = parseInt(inp.reps)
    const set: Omit<GymSet, 'id'> = {
      name: ex.exercise, weight: w, reps: r,
      unit: settings.strengthUnit,
      created: new Date().toISOString(),
      hidden: false, bodyWeight: false, duration: 0, distance: 0, cardio: false,
      restMs: settings.timerDuration * 1000,
      planId: undefined, // quick workout sets have no planId
      rpe: inp.rpe !== '' ? parseFloat(inp.rpe) : undefined,
      rir: inp.rir !== '' ? parseFloat(inp.rir) : undefined,
    }
    await addGymSet(set)
    workout.addLoggedSet(ex.exercise, { exercise: ex.exercise, weight: w, reps: r, rpe: set.rpe, rir: set.rir })
    patchInput(ex.exercise, { reps: '', rpe: '', rir: '' })
    if (settings.restTimers) startTimer(settings.timerDuration)
    const setsForEx = [...(loggedSets[ex.exercise] ?? []), { exercise: ex.exercise, weight: w, reps: r }]
    if (setsForEx.length >= ex.maxSets) workout.markExerciseDone(ex.exercise)
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  async function handleFinish() {
    setShowSavePlan(true)
  }

  async function finishAndSave(planTitle: string) {
    // Create a real plan with the exercises
    const count = await db.plans.count()
    const planId = await addPlan({ sequence: count, title: planTitle, exercises: exercises.map(e => e.exercise).join(','), days: '' })
    // Move the temp plan_exercises to the real plan
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
    // Delete any sets logged in this session
    if (workout.startedAt) {
      const since = workout.startedAt
      await db.gym_sets.filter(s => s.planId == null && s.created >= since).delete()
    }
    await cleanupTempExercises()
    workout.finishSession()
    navigate('/', { replace: true })
  }

  async function cleanupTempExercises() {
    await db.plan_exercises.where('planId').equals(QUICK_PLAN_ID).delete()
  }

  // ── Delete exercise from session ──────────────────────────────────────────
  async function deleteExercise(ex: PlanExercise) {
    await deletePlanExercise(ex.id!)
    setExercises(prev => prev.filter(e => e.id !== ex.id))
  }

  // ── Drag to reorder ───────────────────────────────────────────────────────
  async function handleReorder(newItems: PlanExercise[]) {
    setExercises(newItems)
    await Promise.all(newItems.map((ex, i) => updatePlanExercise(ex.id!, { sortOrder: i })))
  }

  function toggleExpanded(idx: number) {
    setExpandedSet(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

  // ─── Render exercise card ─────────────────────────────────────────────────
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

              <div className="flex gap-2">
                <button onClick={() => logSet(ex, i)}
                  className="flex-1 bg-[#93032E] text-white font-medium text-[15px] py-2.5 flex items-center justify-center gap-2"
                  style={{ borderRadius: '2px' }}>
                  <Plus size={18} strokeWidth={1.5} />
                  Log Set
                </button>
                <button className="w-10 h-10 bg-[#2C2C2E] flex items-center justify-center text-white" style={{ borderRadius: '2px' }}>
                  <Camera size={18} strokeWidth={1.5} />
                </button>
                <button className="w-10 h-10 bg-[#2C2C2E] flex items-center justify-center text-white" style={{ borderRadius: '2px' }}>
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

      <main className="flex-1 px-3 pt-28 pb-8 flex flex-col gap-4">
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
          className="w-full bg-[#1C1C1E] border border-[#93032E] text-[#93032E] font-medium text-[15px] h-12 flex items-center justify-center gap-2"
          style={{ borderRadius: '2px' }}
        >
          <Flag size={18} strokeWidth={1.5} />
          Finish & Save
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
