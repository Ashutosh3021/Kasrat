import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle, Lock, MoreHorizontal, Camera, FileText, Flag } from 'lucide-react'
import { db, type Plan, type PlanExercise, type GymSet } from '../db/database'
import { useTimerStore } from '../store/timerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'

export default function StartPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings } = useSettingsStore()
  const { start: startTimer } = useTimerStore()
  const workout = useWorkoutStore()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  // Local weight/reps inputs — one pair shared for the active exercise
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

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

      // Start a new session only if there isn't already one for this plan
      if (workout.activePlanId !== planId) {
        workout.startSession(planId, p.title)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Derive state from the persistent store
  const completedSet = new Set(workout.completedExercises)
  const loggedSets = workout.loggedSets
  const currentIdx = workout.currentExerciseIdx
  const currentEx = exercises[currentIdx]
  const totalDone = completedSet.size
  const progress = exercises.length > 0 ? totalDone / exercises.length : 0

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
    }
    // Persist to DB immediately (crash-safe)
    await db.gym_sets.add(set)
    // Mirror into store for bubble display
    workout.addLoggedSet(currentEx.exercise, { exercise: currentEx.exercise, weight: w, reps: r })
    setReps('')
    if (settings.restTimers) startTimer(settings.timerDuration)

    // Auto-complete exercise when max sets reached
    const setsForEx = [...(loggedSets[currentEx.exercise] ?? []), { exercise: currentEx.exercise, weight: w, reps: r }]
    if (setsForEx.length >= currentEx.maxSets) {
      workout.markExerciseDone(currentEx.exercise)
    }
  }

  function advanceExercise() {
    workout.markExerciseDone(currentEx.exercise)
    if (currentIdx < exercises.length - 1) {
      workout.setCurrentIdx(currentIdx + 1)
    } else {
      handleFinish()
    }
  }

  function handleFinish() {
    workout.finishSession()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="fixed top-0 w-full z-40 bg-black/90 backdrop-blur-md flex flex-col">
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#2C2C2E]">
          {/* Back — minimises session (bubble appears) */}
          <button
            onClick={() => navigate(-1)}
            className="text-white p-2 -ml-2 rounded-full hover:bg-[#1C1C1E]"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[22px] font-semibold text-white">{plan?.title}</h1>
          {/* Finish session */}
          <button
            onClick={handleFinish}
            className="flex items-center gap-1 text-[#3B82F6] font-semibold text-[15px] p-2 -mr-1"
          >
            <Flag size={18} />
            <span className="hidden sm:inline">Finish</span>
          </button>
        </div>

        {/* Progress bar */}
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

          // Completed (not current)
          if (done && !isCurrent) {
            return (
              <article key={ex.id} className="bg-[#1C1C1E] rounded-lg p-3 opacity-50 flex items-center justify-between border border-[#2C2C2E]">
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
              <article key={ex.id} className="bg-[#1C1C1E] rounded-lg p-3 opacity-70 border border-[#2C2C2E] flex justify-between items-center">
                <div>
                  <h2 className="text-[17px] text-white">{ex.exercise}</h2>
                  <p className="text-[13px] font-medium text-[#A1A1A6]">Next: {ex.maxSets} sets</p>
                </div>
                <Lock size={18} className="text-[#A1A1A6]" />
              </article>
            )
          }

          // Future exercises (not current, not next)
          if (!isCurrent) return null

          // Active exercise card
          return (
            <article key={ex.id} className="bg-[#1C1C1E] rounded-lg p-4 flex flex-col gap-4 relative overflow-hidden border border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-[22px] font-semibold text-white mb-2">{ex.exercise}</h2>
                  <div className="flex gap-2">
                    <span className="bg-[#2C2C2E] text-white px-3 py-1 rounded-full text-[13px] font-medium">Strength</span>
                    <span className="bg-[#2C2C2E] text-white px-3 py-1 rounded-full text-[13px] font-medium">{ex.maxSets} sets target</span>
                  </div>
                </div>
                <button className="text-[#A1A1A6] hover:text-white p-1"><MoreHorizontal size={20} /></button>
              </div>

              <div className="w-full h-px bg-[#2C2C2E]" />

              {/* Logged sets */}
              <div className="flex flex-col gap-3">
                {sets.map((s, si) => (
                  <div key={si} className="flex items-center justify-between py-2 border-b border-[#2C2C2E]">
                    <div className="flex items-center gap-4">
                      <span className="text-[15px] font-semibold text-[#A1A1A6] w-12">Set {si + 1}</span>
                      <span className="text-[17px] text-white font-semibold">{s.weight} {settings.strengthUnit}</span>
                      <span className="text-[#A1A1A6] text-sm">×</span>
                      <span className="text-[17px] text-white font-semibold">{s.reps} reps</span>
                    </div>
                    <CheckCircle size={20} className="text-[#3B82F6]" fill="#3B82F6" />
                  </div>
                ))}
              </div>

              {/* Input row */}
              <div className="mt-2 bg-black/50 p-4 rounded-lg border border-[#2C2C2E] flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-semibold text-[#3B82F6] w-12">Set {sets.length + 1}</span>
                  <div className="flex-1 flex gap-3">
                    <div className="relative flex-1">
                      <label className="absolute -top-2 left-3 bg-[#131315] px-1 text-[10px] text-[#A1A1A6]">
                        Weight ({settings.strengthUnit})
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        className="w-full bg-transparent border border-white/30 rounded-lg px-3 py-3 text-white text-[17px] text-center focus:border-[#3B82F6] focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="relative flex-1">
                      <label className="absolute -top-2 left-3 bg-[#131315] px-1 text-[10px] text-[#A1A1A6]">Reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={reps}
                        onChange={e => setReps(e.target.value)}
                        className="w-full bg-transparent border border-white/30 rounded-lg px-3 py-3 text-white text-[17px] text-center focus:border-[#3B82F6] focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
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
                {currentIdx < exercises.length - 1 ? 'Next Exercise' : 'Finish Workout'}
              </button>
            </article>
          )
        })}

        {/* Bottom finish button */}
        <button
          onClick={handleFinish}
          className="w-full mt-4 bg-[#1C1C1E] border border-[#3B82F6] text-[#3B82F6] font-semibold text-[15px] h-12 rounded-lg flex items-center justify-center gap-2"
        >
          <Flag size={18} />
          Finish Session
        </button>
      </main>
    </div>
  )
}
