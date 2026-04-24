import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, CheckCircle, Lock, MoreHorizontal,
  Camera, FileText, Flag, Trash2, Info, ChevronDown, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { db, type Plan, type PlanExercise, type GymSet } from '../db/database'
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'

// ─── Brzycki 1RM ─────────────────────────────────────────────────────────────
function brzycki(w: number, r: number): number | null {
  if (w <= 0 || r <= 0 || r >= 37) return null
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
    <div className="flex items-center justify-between bg-[#131315] border border-[#2C2C2E] rounded-lg px-3 py-2 text-[13px]">
      {prev ? (
        <>
          <span className="text-[#A1A1A6]">
            Last: <span className="text-white font-medium">{prev.weight} {unit} × {prev.reps}</span>
          </span>
          <div className="flex items-center gap-1.5">
            {indicator}
            <button onClick={() => setDismissed(true)} className="text-[#424754] hover:text-[#A1A1A6] ml-1 text-[11px]">✕</button>
          </div>
        </>
      ) : (
        <span className="text-[#424754] italic">First time — set a baseline!</span>
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
        className={`p-1 rounded-full transition-colors ${open ? 'text-[#3B82F6]' : 'text-[#A1A1A6] hover:text-[#3B82F6]'}`}
        aria-label="Coach's cues"
      >
        <Info size={16} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-64 bg-[#1C1C1E] border border-[#353437] rounded-xl p-3 shadow-2xl animate-fadeIn">
          {/* Triangle pointer */}
          <div className="absolute -top-1.5 left-3 w-3 h-3 bg-[#1C1C1E] border-l border-t border-[#353437] rotate-45" />
          <p className="text-[13px] text-[#c2c6d6] leading-relaxed">{cues}</p>
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
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')
  const [rir, setRir] = useState('')
  const [showMore, setShowMore] = useState(false)   // F1 progressive disclosure
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [prevSet, setPrevSet] = useState<PrevSet | null | undefined>(undefined) // undefined = loading
  const [cues, setCues] = useState<string>('')

  const planId = Number(id)

  useEffect(() => {
    async function load() {
      if (!id) return
      const p = await db.plans.get(planId)
      if (!p) return
      setPlan(p)
      const exs = await db.plan_exercises
        .where('planId').equals(planId)
        .filter(e => e.enabled)
        .toArray()
      setExercises(exs)
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

  // F4 – fetch previous set when active exercise changes
  useEffect(() => {
    if (!currentEx) return
    setPrevSet(undefined)
    setCues('')
    db.gym_sets
      .where('name').equals(currentEx.exercise)
      .filter(s => !s.hidden && s.reps > 0)
      .toArray()
      .then(rows => {
        const last = rows.sort((a, b) => b.created.localeCompare(a.created))[0]
        setPrevSet(last ? { weight: last.weight, reps: last.reps } : null)
      })
    // F5 – fetch cues
    db.exercise_meta.get(currentEx.exercise).then(meta => {
      setCues(meta?.cues ?? '')
    })
  }, [currentIdx, currentEx?.exercise])

  // F2 – determine if current exercise is in a superset group
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

  async function logSet() {
    if (!currentEx || !weight || !reps) return
    const w = parseFloat(weight)
    const r = parseInt(reps)
    const set: Omit<GymSet, 'id'> = {
      name: currentEx.exercise,
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
      rpe: rpe !== '' ? parseFloat(rpe) : undefined,
      rir: rir !== '' ? parseFloat(rir) : undefined,
    }
    await db.gym_sets.add(set)
    workout.addLoggedSet(currentEx.exercise, { exercise: currentEx.exercise, weight: w, reps: r, rpe: rpe !== '' ? parseFloat(rpe) : undefined, rir: rir !== '' ? parseFloat(rir) : undefined })
    setReps('')
    setRpe('')
    setRir('')

    // F2 – only start timer after last exercise in a superset group
    const inGroup = isInGroup(currentIdx)
    const atGroupEnd = !inGroup || currentIdx === groupEnd(currentIdx)
    if (settings.restTimers && atGroupEnd) startTimer(settings.timerDuration)

    const setsForEx = [...(loggedSets[currentEx.exercise] ?? []), { exercise: currentEx.exercise, weight: w, reps: r }]
    if (setsForEx.length >= currentEx.maxSets) {
      workout.markExerciseDone(currentEx.exercise)
    }
  }

  function advanceExercise() {
    workout.markExerciseDone(currentEx.exercise)
    if (currentIdx < exercises.length - 1) {
      workout.setCurrentIdx(currentIdx + 1)
      setWeight('')
      setReps('')
      setRpe('')
      setRir('')
      setShowMore(false)
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
      await db.gym_sets.where('planId').equals(pid).filter(s => s.created >= since).delete()
    }
    workout.finishSession()
    navigate('/', { replace: true })
  }

  // F2 – superset border color
  function groupBorderClass(st: string) {
    if (st === 'superset') return 'border-l-[3px] border-[#60A5FA]'
    if (st === 'giant')    return 'border-l-[3px] border-purple-400'
    if (st === 'circuit')  return 'border-l-[3px] border-emerald-400'
    return ''
  }

  // F3 – live 1RM
  const orm = brzycki(parseFloat(weight), parseInt(reps))

  // Advance button label
  const inGroup = currentEx ? isInGroup(currentIdx) : false
  const atGroupEnd = !inGroup || currentIdx === (currentEx ? groupEnd(currentIdx) : currentIdx)
  const advanceLabel = inGroup && !atGroupEnd
    ? 'Next in Group'
    : currentIdx < exercises.length - 1
      ? 'Next Exercise'
      : 'Finish Workout'

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="fixed top-0 w-full z-40 bg-black/90 backdrop-blur-md flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2C2C2E]">
          <button onClick={() => navigate(-1)} className="text-white p-2 -ml-2 rounded-full hover:bg-[#1C1C1E]">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[22px] font-semibold text-white">{plan?.title}</h1>
          <button onClick={handleFinish} className="flex items-center gap-1 text-[#3B82F6] font-semibold text-[15px] p-2 -mr-1">
            <Flag size={18} />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>
        <div className="w-full bg-[#2C2C2E] h-1.5">
          <div className="bg-[#3B82F6] h-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="px-4 py-2 text-center bg-black">
          <span className="text-[13px] font-medium text-[#A1A1A6] uppercase tracking-widest">
            {totalDone}/{exercises.length} exercises done
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 pt-28 pb-8 flex flex-col gap-4">
        {exercises.map((ex, i) => {
          const done = completedSet.has(ex.exercise)
          const isCurrent = i === currentIdx
          const isNext = i === currentIdx + 1
          const sets = loggedSets[ex.exercise] ?? []
          const st = ex.setType ?? 'normal'

          // Completed
          if (done && !isCurrent) {
            return (
              <article key={ex.id} className={`bg-[#1C1C1E] rounded-lg p-3 opacity-50 flex items-center justify-between border border-[#2C2C2E] ${groupBorderClass(st)}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center text-[#3B82F6]">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <h2 className="text-[17px] text-white line-through">{ex.exercise}</h2>
                    <p className="text-[13px] font-medium text-[#A1A1A6]">{sets.length} sets completed</p>
                  </div>
                </div>
              </article>
            )
          }

          // Next up
          if (isNext) {
            return (
              <article key={ex.id} className={`bg-[#1C1C1E] rounded-lg p-3 opacity-70 border border-[#2C2C2E] flex justify-between items-center ${groupBorderClass(st)}`}>
                <div>
                  <h2 className="text-[17px] text-white">{ex.exercise}</h2>
                  <p className="text-[13px] font-medium text-[#A1A1A6]">Next: {ex.maxSets} sets</p>
                </div>
                <Lock size={18} className="text-[#A1A1A6]" />
              </article>
            )
          }

          if (!isCurrent) return null

          // F2 – warmup left border
          const warmupBorder = st === 'warmup' ? 'border-l-[3px] border-amber-400' : ''

          return (
            <article
              key={ex.id}
              className={`bg-[#1C1C1E] rounded-lg p-4 flex flex-col gap-4 relative overflow-hidden border border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)] ${warmupBorder || groupBorderClass(st)}`}
            >
              {/* F2 – warmup pill */}
              {st === 'warmup' && (
                <span className="absolute top-3 right-3 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Warm-up</span>
              )}

              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-[22px] font-semibold text-white truncate">{ex.exercise}</h2>
                    {/* F5 – cues icon */}
                    {cues && <CuesPopover cues={cues} />}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-[#2C2C2E] text-white px-3 py-1 rounded-full text-[13px] font-medium">Strength</span>
                    <span className="bg-[#2C2C2E] text-white px-3 py-1 rounded-full text-[13px] font-medium">{ex.maxSets} sets target</span>
                  </div>
                </div>
                <button className="text-[#A1A1A6] hover:text-white p-1 shrink-0"><MoreHorizontal size={20} /></button>
              </div>

              <div className="w-full h-px bg-[#2C2C2E]" />

              {/* Logged sets */}
              <div className="flex flex-col gap-3">
                {sets.map((s, si) => (
                  <div key={si} className="flex items-center justify-between py-2 border-b border-[#2C2C2E]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[15px] font-semibold text-[#A1A1A6] w-12">Set {si + 1}</span>
                        <span className="text-[17px] text-white font-semibold">{s.weight} {settings.strengthUnit}</span>
                        <span className="text-[#A1A1A6] text-sm">×</span>
                        <span className="text-[17px] text-white font-semibold">{s.reps} reps</span>
                      </div>
                      {(s.rpe != null || s.rir != null) && (
                        <span className="text-[12px] text-[#A1A1A6] pl-12">
                          {s.rpe != null && `RPE ${s.rpe}`}{s.rpe != null && s.rir != null && ', '}{s.rir != null && `RIR ${s.rir}`}
                        </span>
                      )}
                    </div>
                    <CheckCircle size={20} className="text-[#3B82F6]" fill="#3B82F6" />
                  </div>
                ))}
              </div>

              {/* Input area */}
              <div className="mt-2 bg-black/50 p-4 rounded-lg border border-[#2C2C2E] flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-semibold text-[#3B82F6] w-12 shrink-0">Set {sets.length + 1}</span>
                  <div className="flex-1 flex gap-3">
                    <div className="relative flex-1">
                      <label className="absolute -top-2 left-3 bg-[#131315] px-1 text-[10px] text-[#A1A1A6]">
                        Weight ({settings.strengthUnit})
                      </label>
                      <input
                        type="number" inputMode="decimal" value={weight}
                        onChange={e => setWeight(e.target.value)}
                        className="w-full bg-transparent border border-white/30 rounded-lg px-3 py-3 text-white text-[17px] text-center focus:border-[#3B82F6] focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="relative flex-1">
                      <label className="absolute -top-2 left-3 bg-[#131315] px-1 text-[10px] text-[#A1A1A6]">Reps</label>
                      <input
                        type="number" inputMode="numeric" value={reps}
                        onChange={e => setReps(e.target.value)}
                        className="w-full bg-transparent border border-white/30 rounded-lg px-3 py-3 text-white text-[17px] text-center focus:border-[#3B82F6] focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* F3 – live 1RM chip */}
                {orm != null && (
                  <div className="flex justify-end">
                    <span className="text-[12px] font-medium bg-[#1C1C1E]/80 text-[#3B82F6] border border-[#3B82F6]/30 px-2 py-0.5 rounded-full transition-opacity duration-200">
                      ≈ 1RM: {orm} {settings.strengthUnit}
                    </span>
                  </div>
                )}

                {/* F4 – previous session diff bar */}
                {prevSet !== undefined && (
                  <DiffBar prev={prevSet} curWeight={weight} curReps={reps} unit={settings.strengthUnit} />
                )}

                {/* F1 – RPE / RIR (progressive disclosure) */}
                <button
                  onClick={() => setShowMore(o => !o)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#A1A1A6] hover:text-white transition-colors self-start"
                >
                  <ChevronDown size={12} className={`transition-transform duration-150 ${showMore ? 'rotate-180' : ''}`} />
                  {showMore ? 'Less' : 'RPE / RIR'}
                </button>
                {showMore && (
                  <div className="flex items-center gap-4 animate-fadeIn">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-medium text-[#A1A1A6]">RPE</span>
                      <input
                        type="number" inputMode="numeric" value={rpe}
                        onChange={e => setRpe(e.target.value)}
                        min={1} max={10} placeholder="1-10"
                        className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg text-[15px] text-white text-center focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-medium text-[#A1A1A6]">RIR</span>
                      <input
                        type="number" inputMode="numeric" value={rir}
                        onChange={e => setRir(e.target.value)}
                        min={0} max={5} placeholder="0-5"
                        className="w-12 h-10 bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg text-[15px] text-white text-center focus:outline-none focus:border-[#3B82F6]"
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={logSet}
                    className="flex-1 bg-[#3B82F6] text-white font-semibold text-[15px] py-3 rounded-lg flex items-center justify-center gap-2 h-12"
                  >
                    <Plus size={18} />
                    Log Set
                  </button>
                  <button className="w-12 h-12 bg-[#2C2C2E] rounded-lg flex items-center justify-center text-white">
                    <Camera size={18} />
                  </button>
                  <button className="w-12 h-12 bg-[#2C2C2E] rounded-lg flex items-center justify-center text-white">
                    <FileText size={18} />
                  </button>
                </div>
              </div>

              <button
                onClick={advanceExercise}
                className="w-full mt-2 border border-[#2C2C2E] text-white font-semibold text-[15px] py-3 rounded-lg bg-transparent hover:bg-[#2C2C2E] transition-colors h-12"
              >
                {advanceLabel}
              </button>
            </article>
          )
        })}

        {/* Finish */}
        <button
          onClick={handleFinish}
          className="w-full mt-4 bg-[#1C1C1E] border border-[#3B82F6] text-[#3B82F6] font-semibold text-[15px] h-12 rounded-lg flex items-center justify-center gap-2"
        >
          <Flag size={18} />
          Finish Session
        </button>

        {/* Discard */}
        {!confirmDiscard ? (
          <button
            onClick={() => setConfirmDiscard(true)}
            className="w-full border border-[#2C2C2E] text-[#8c909f] font-semibold text-[15px] h-12 rounded-lg flex items-center justify-center gap-2 hover:border-[#ffb4ab] hover:text-[#ffb4ab] transition-colors"
          >
            <Trash2 size={18} />
            Discard Workout
          </button>
        ) : (
          <div className="w-full bg-[#1C1C1E] border border-[#ffb4ab]/40 rounded-lg p-4 flex flex-col gap-3">
            <p className="text-[15px] text-white font-semibold text-center">Discard this workout?</p>
            <p className="text-[13px] text-[#c6c6cb] text-center">All sets logged in this session will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDiscard(false)} className="flex-1 h-11 border border-[#2C2C2E] text-white rounded-lg font-semibold text-[15px]">
                Cancel
              </button>
              <button onClick={handleDiscard} className="flex-1 h-11 bg-[#ffb4ab] text-[#690005] rounded-lg font-semibold text-[15px] flex items-center justify-center gap-2">
                <Trash2 size={16} />
                Discard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
