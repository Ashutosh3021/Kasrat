import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, CheckCircle, MoreHorizontal, X, GripVertical,
  Camera, FileText, Flag, Trash2, Info, ChevronDown, TrendingUp, TrendingDown, Minus, Repeat,
} from 'lucide-react'
import { db, type Plan, type PlanExercise, type GymSet } from '../db/database'
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'
import { useDragToReorder } from '../hooks/useDragToReorder'
import { addGymSet, deleteGymSet, updatePlanExercise } from '../supabase/writeSync'

// ─── Brzycki 1RM ─────────────────────────────────────────────────────────────
function brzycki(w: number, r: number): number | null {
  if (w <= 0 || r <= 0 || r > 10) return null
  return Math.round(w * (36 / (37 - r)))
}

// ─── Previous-session diff bar ────────────────────────────────────────────────
interface PrevSet { weight: number; reps: number }

function DiffBar({ prev, curWeight, curReps, unit }: { prev: PrevSet | null; curWeight: string; curReps: string; unit: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const cw = parseFloat(curWeight)
  const cr = parseInt(curReps)
  const hasInput = !isNaN(cw) && cw > 0 && !isNaN(cr) && cr > 0

  let indicator: React.ReactNode = null
  if (prev && hasInput) {
    if (cw > prev.weight) indicator = <TrendingUp size={14} className="text-emerald-400" />
    else if (cw < prev.weight) indicator = <TrendingDown size={14} className="text-red-400" />
    else indicator = <Minus size={14} className="text-[#A1A1A6]" />
  }

  return (
    <div className="flex items-center justify-between bg-[#1C1C1E] border border-[#2C2C2E] px-3 py-2 text-[13px]" style={{ borderRadius: '2px' }}>
      {prev ? (
        <>
          <span className="text-[#A1A1A6]">
            Last: <span className="text-white font-medium">{prev.weight} {unit} × {prev.reps}</span>
          </span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StartPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const { start: startTimer } = useTimerStore()
  const workout = useWorkoutStore()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [prevSets, setPrevSets] = useState<Record<string, PrevSet | null>>({})
  const [cuesMap, setCuesMap] = useState<Record<string, string>>({})
  const [expandedSet, setExpandedSet] = useState<Set<number>>(() => new Set([workout.currentExerciseIdx]))

  // ── Per-exercise inputs (weight, reps, rpe, rir, showMore) ──────────────────
  interface ExInput { weight: string; reps: string; rpe: string; rir: string; showMore: boolean }
  const defaultInput = (): ExInput => ({ weight: '', reps: '', rpe: '', rir: '', showMore: false })
  const [inputMap, setInputMap] = useState<Record<string, ExInput>>({})
  function getInput(name: string): ExInput { return inputMap[name] ?? defaultInput() }
  function patchInput(name: string, patch: Partial<ExInput>) {
    setInputMap(prev => ({ ...prev, [name]: { ...(prev[name] ?? defaultInput()), ...patch } }))
  }

  const planId = Number(id)

  async function loadExercises() {
    if (!id) return
    const exs = await db.plan_exercises
      .where('planId').equals(planId)
      .filter(e => e.enabled)
      .toArray()
    setExercises(exs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
  }

  useEffect(() => {
    async function load() {
      if (!id) return
      const p = await db.plans.get(planId)
      if (!p) return
      setPlan(p)
      await loadExercises()
      if (workout.activePlanId !== planId) {
        workout.startSession(planId, p.title)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const completedSet = new Set(workout.completedExercises)
  const loggedSets = workout.loggedSets
  const currentIdx = workout.currentExerciseIdx
  const currentEx = exercises[currentIdx]
  const totalDone = completedSet.size
  const progress = exercises.length > 0 ? totalDone / exercises.length : 0

  // Load previous sets and cues for all exercises — batched to avoid N re-renders (PERF-002)
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
      // Single state update for all exercises — one re-render instead of 2N
      const newPrevSets: Record<string, { weight: number; reps: number } | null> = {}
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

  function isInGroup(idx: number): boolean {
    const st = exercises[idx]?.setType ?? 'normal'
    return st === 'superset' || st === 'giant' || st === 'circuit'
  }

  function groupEnd(startIdx: number): number {
    const st = exercises[startIdx]?.setType ?? 'normal'
    let end = startIdx
    while (end + 1 < exercises.length && (exercises[end + 1]?.setType ?? 'normal') === st) end++
    return end
  }

  async function logSet(ex: PlanExercise, exIdx: number) {
    const inp = getInput(ex.exercise)
    const w = parseFloat(inp.weight)
    const r = parseInt(inp.reps)
    // SESSION-001: validate parsed numbers, not string truthiness
    if (isNaN(w) || w <= 0 || isNaN(r) || r <= 0) return
    const set: Omit<GymSet, 'id'> = {
      name: ex.exercise,
      weight: w,
      reps: r,
      unit: settings.strengthUnit,
      created: new Date().toISOString(),
      hidden: false,
      bodyWeight: false,
      duration: 0,
      distance: 0,
      cardio: false,
      restMs: settings.timerDuration * 1000,
      planId,
      rpe: inp.rpe !== '' ? parseFloat(inp.rpe) : undefined,
      rir: inp.rir !== '' ? parseFloat(inp.rir) : undefined,
    }
    const id = await addGymSet(set)
    workout.addLoggedSet(ex.exercise, { exercise: ex.exercise, weight: w, reps: r, rpe: set.rpe, rir: set.rir })
    patchInput(ex.exercise, { reps: '', rpe: '', rir: '' })

    const inGroup = isInGroup(exIdx)
    const atGroupEnd = !inGroup || exIdx === groupEnd(exIdx)
    if (settings.restTimers && atGroupEnd) startTimer(settings.timerDuration)

    const setsForEx = [...(loggedSets[ex.exercise] ?? []), { exercise: ex.exercise, weight: w, reps: r }]
    if (setsForEx.length >= ex.maxSets) {
      workout.markExerciseDone(ex.exercise)
    }
  }

  function advanceExercise() {
    if (!currentEx) return
    workout.markExerciseDone(currentEx.exercise)
    if (currentIdx < exercises.length - 1) {
      const nextIdx = currentIdx + 1
      workout.setCurrentIdx(nextIdx)
      setExpandedSet(prev => { const n = new Set(prev); n.add(nextIdx); return n })
    } else {
      handleFinish()
    }
  }

  function handleFinish() {
    workout.finishSession()
    navigate('/', { replace: true })
  }

  async function handleDiscard() {
    if (workout.startedAt && workout.activePlanId) {
      const since = workout.startedAt
      const pid = workout.activePlanId
      const toDelete = await db.gym_sets.where('planId').equals(pid).filter(s => s.created >= since).toArray()
      await Promise.all(toDelete.map(s => deleteGymSet(s.id!)))
    }
    workout.finishSession()
    navigate('/', { replace: true })
  }

  function groupBorderClass(st: string) {
    if (st === 'superset') return 'border-l-[3px] border-[#BE1755]'
    if (st === 'giant')    return 'border-l-[3px] border-purple-400'
    if (st === 'circuit')  return 'border-l-[3px] border-emerald-400'
    return ''
  }

  async function handleReorder(newItems: PlanExercise[]) {
    setExercises(newItems)
    await Promise.all(newItems.map((ex, i) => updatePlanExercise(ex.id!, { sortOrder: i })))
  }

  async function deleteExercise(ex: PlanExercise, idx: number) {
    await updatePlanExercise(ex.id!, { enabled: false })
    // Reload first so we know the new array length
    await loadExercises()
    // EDGE-002: clamp currentIdx to the new valid range after reload
    // We read the updated exercises from Dexie directly to avoid stale closure
    const updated = await db.plan_exercises
      .where('planId').equals(planId)
      .filter(e => e.enabled)
      .toArray()
    const newMax = updated.length - 1
    if (newMax < 0) {
      // No exercises left — finish the session
      workout.finishSession()
      navigate('/', { replace: true })
      return
    }
    const safeIdx = Math.min(currentIdx, newMax)
    workout.setCurrentIdx(safeIdx)
  }

  function toggleExpanded(idx: number) {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const { getHandleProps, getItemProps } = useDragToReorder(exercises, handleReorder)

  const inGroup = currentEx ? isInGroup(currentIdx) : false
  const atGroupEnd = !inGroup || currentIdx === (currentEx ? groupEnd(currentIdx) : currentIdx)
  const advanceLabel = inGroup && !atGroupEnd
    ? 'Next in Group'
    : currentIdx < exercises.length - 1
      ? 'Next Exercise'
      : 'Finish Workout'

  function renderExerciseRow(ex: PlanExercise, i: number) {
    const done = completedSet.has(ex.exercise)
    const isCurrent = i === currentIdx
    const sets = loggedSets[ex.exercise] ?? []
    const st = ex.setType ?? 'normal'
    const isExpanded = expandedSet.has(i)
    const prevSet = prevSets[ex.exercise]
    const cues = cuesMap[ex.exercise] ?? ''
    const inp = getInput(ex.exercise)
    const orm = brzycki(parseFloat(inp.weight), parseInt(inp.reps))

    // Current exercise highlight
    const currentBorder = isCurrent ? 'border-[#93032E]' : 'border-[#2C2C2E]'
    const warmupBorder = st === 'warmup' ? 'border-l-[3px] border-amber-400' : ''
    return (
      <article
        key={ex.id}
        className={`bg-[#1C1C1E] p-3 flex flex-col gap-3 relative border ${currentBorder} ${warmupBorder || groupBorderClass(st)} ${done && !isCurrent ? 'opacity-50' : ''}`}
        {...getItemProps(i)}
        style={{ borderRadius: '4px' }}
      >
        {/* Warmup pill */}
        {st === 'warmup' && (
          <span className="absolute top-3 right-3 text-[11px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5" style={{ borderRadius: '2px' }}>Warm-up</span>
        )}

        {/* Header row - clickable to expand/collapse */}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={(e) => {
            // Check if click is on a button or drag handle
            const target = e.target as HTMLElement
            const isButton = target.closest('button')
            const isDragHandle = target.closest('[data-drag-handle]')
            
            // Only toggle if not clicking a button or drag handle
            if (!isButton && !isDragHandle) {
              toggleExpanded(i)
            }
          }}
        >
          <span {...getHandleProps(i)} data-drag-handle>
            <GripVertical size={20} strokeWidth={1.5} className="text-[#A1A1A6] shrink-0" />
          </span>
          
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {done && <CheckCircle size={18} strokeWidth={1.5} className="text-[#93032E] shrink-0" fill="#93032E" />}
            <h2 className={`text-[17px] font-medium text-white truncate ${done ? 'line-through' : ''}`}>
              {ex.exercise}
            </h2>
            {cues && isCurrent && <CuesPopover cues={cues} />}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/swap/${planId}/${encodeURIComponent(ex.exercise)}`) }}
              className="text-[#A1A1A6] hover:text-[#93032E] p-1"
              aria-label="Swap exercise"
            >
              <Repeat size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteExercise(ex, i) }}
              className="text-[#A1A1A6] hover:text-[#FF453A] p-1"
              aria-label="Delete exercise"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpanded(i) }}
              className="text-[#A1A1A6] hover:text-white p-1"
            >
              <ChevronDown size={18} strokeWidth={1.5} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Exercise info */}
        <div className="flex gap-2 flex-wrap pl-8">
          <span className="bg-[#2C2C2E] text-white px-2 py-1 text-[11px] font-medium" style={{ borderRadius: '2px' }}>
            {sets.length}/{ex.maxSets} sets
          </span>
          {isCurrent && (
            <span className="bg-[#93032E]/20 text-[#93032E] px-2 py-1 text-[11px] font-medium" style={{ borderRadius: '2px' }}>
              CURRENT
            </span>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <>
            <div className="w-full h-px bg-[#2C2C2E]" />

            {/* Logged sets */}
            {sets.length > 0 && (
              <div className="flex flex-col gap-2 pl-8">
                {sets.map((s, si) => (
                  <div key={si} className="flex items-center justify-between py-1.5 border-b border-[#2C2C2E]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-medium text-[#A1A1A6] w-10">Set {si + 1}</span>
                        <span className="text-[15px] text-white font-medium">{s.weight} {settings.strengthUnit}</span>
                        <span className="text-[#A1A1A6] text-sm">×</span>
                        <span className="text-[15px] text-white font-medium">{s.reps} reps</span>
                      </div>
                      {(s.rpe != null || s.rir != null) && (
                        <span className="text-[11px] text-[#A1A1A6] pl-10">
                          {s.rpe != null && `RPE ${s.rpe}`}{s.rpe != null && s.rir != null && ', '}{s.rir != null && `RIR ${s.rir}`}
                        </span>
                      )}
                    </div>
                    <CheckCircle size={18} strokeWidth={1.5} className="text-[#93032E]" fill="#93032E" />
                  </div>
                ))}
              </div>
            )}

            {/* Input area — shown for ALL expanded exercises */}
            <div className="mt-2 bg-[#151515]/50 p-3 border border-[#2C2C2E] flex flex-col gap-3 ml-8" style={{ borderRadius: '4px' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-[#93032E] w-10 shrink-0">Set {sets.length + 1}</span>
                    <div className="flex-1 flex gap-3">
                      <div className="relative flex-1">
                        <label className="absolute -top-2 left-3 bg-[#151515] px-1 text-[10px] text-[#A1A1A6]">
                          Weight ({settings.strengthUnit})
                        </label>
                        <input
                          type="number" inputMode="decimal" value={inp.weight}
                          onChange={e => patchInput(ex.exercise, { weight: e.target.value })}
                          className="w-full bg-transparent border border-white/30 px-3 py-2.5 text-white text-[15px] text-center focus:border-[#93032E] focus:outline-none"
                          style={{ borderRadius: '2px' }}
                          placeholder="0"
                        />
                      </div>
                      <div className="relative flex-1">
                        <label className="absolute -top-2 left-3 bg-[#151515] px-1 text-[10px] text-[#A1A1A6]">Reps</label>
                        <input
                          type="number" inputMode="numeric" value={inp.reps}
                          onChange={e => patchInput(ex.exercise, { reps: e.target.value })}
                          className="w-full bg-transparent border border-white/30 px-3 py-2.5 text-white text-[15px] text-center focus:border-[#93032E] focus:outline-none"
                          style={{ borderRadius: '2px' }}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live 1RM chip */}
                  {orm != null && (
                    <div className="flex justify-end">
                      <span className="text-[11px] font-medium bg-[#1C1C1E]/80 text-[#93032E] border border-[#93032E]/30 px-2 py-0.5" style={{ borderRadius: '2px' }}>
                        ≈ 1RM: {orm} {settings.strengthUnit}
                      </span>
                    </div>
                  )}

                  {/* Previous session diff bar */}
                  {prevSet !== undefined && (
                    <DiffBar prev={prevSet ?? null} curWeight={inp.weight} curReps={inp.reps} unit={settings.strengthUnit} />
                  )}

                  {/* RPE / RIR (progressive disclosure) */}
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
                        <input
                          type="number" inputMode="numeric" value={inp.rpe}
                          onChange={e => patchInput(ex.exercise, { rpe: e.target.value })}
                          min={1} max={10} placeholder="1-10"
                          className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] text-[15px] text-white text-center focus:outline-none focus:border-[#93032E]"
                          style={{ borderRadius: '2px' }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-medium text-[#A1A1A6]">RIR</span>
                        <input
                          type="number" inputMode="numeric" value={inp.rir}
                          onChange={e => patchInput(ex.exercise, { rir: e.target.value })}
                          min={0} max={5} placeholder="0-5"
                          className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] text-[15px] text-white text-center focus:outline-none focus:border-[#93032E]"
                          style={{ borderRadius: '2px' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => logSet(ex, i)}
                      className="flex-1 bg-[#93032E] text-white font-medium text-[15px] py-2.5 flex items-center justify-center gap-2"
                      style={{ borderRadius: '2px' }}
                    >
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

            {/* "Next Exercise" only for the current exercise */}
            {isCurrent && (
              <button
                onClick={advanceExercise}
                className="w-full mt-2 ml-8 border border-[#2C2C2E] text-white font-medium text-[15px] py-2.5 bg-transparent hover:bg-[#2C2C2E] transition-colors"
                style={{ borderRadius: '2px' }}
              >
                {advanceLabel}
              </button>
            )}
          </>
        )}
      </article>
    )
  }

  return (
    <div className="min-h-screen bg-[#151515] pb-8">
      <header className="fixed top-0 w-full z-40 bg-[#151515]/90 backdrop-blur-md flex flex-col">
        <div className="flex items-center justify-between px-3 h-14 border-b border-[#2C2C2E]">
          <button onClick={() => navigate(-1)} className="text-white p-2 -ml-2 hover:bg-[#1C1C1E]" style={{ borderRadius: '2px' }}>
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="text-[22px] font-medium text-white">{plan?.title}</h1>
          <button onClick={handleFinish} className="flex items-center gap-1 text-[#93032E] font-medium text-[15px] p-2 -mr-1">
            <Flag size={18} strokeWidth={1.5} />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>
        <div className="w-full bg-[#2C2C2E] h-1.5">
          <div className="bg-[#93032E] h-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="px-3 py-2 text-center bg-[#151515]">
          <span className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">
            {totalDone}/{exercises.length} exercises done
          </span>
        </div>
      </header>

      <main className="flex-1 px-3 pt-28 pb-8 flex flex-col gap-4">
        {/* Scrollable exercise list */}
        <div className="flex flex-col gap-3 max-h-[calc(100vh-300px)] overflow-y-auto" data-drag-list>
          {(() => {
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

            return visualGroups.map((g, gi) => {
              if (g.type === 'single') {
                return renderExerciseRow(g.ex, g.idx)
              }
              // Superset group with colored border
              return (
                <div key={`group-${gi}`} className="border-l-[3px] pl-2 flex flex-col gap-2" style={{ borderColor: g.color, borderRadius: '0 4px 4px 0' }}>
                  <span className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: g.color }}>
                    SUPERSET
                  </span>
                  {g.items.map(({ ex, idx }) => renderExerciseRow(ex, idx))}
                </div>
              )
            })
          })()}
        </div>

        {/* Finish */}
        <button
          onClick={handleFinish}
          className="w-full mt-4 bg-[#1C1C1E] border border-[#93032E] text-[#93032E] font-medium text-[15px] h-12 flex items-center justify-center gap-2"
          style={{ borderRadius: '2px' }}
        >
          <Flag size={18} strokeWidth={1.5} />
          Finish Session
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
            <p className="text-[13px] text-[#A1A1A6] text-center">All sets logged in this session will be permanently deleted.</p>
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
    </div>
  )
}
