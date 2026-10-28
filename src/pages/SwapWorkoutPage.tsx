import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { db, type PlanExercise } from '../db/database'
import { useWorkoutStore } from '../store/workoutStore'
import { updatePlanExercise, updatePlan } from '../supabase/writeSync'

export default function SwapWorkoutPage() {
  const { planId, exerciseName } = useParams<{ planId: string; exerciseName: string }>()
  const navigate = useNavigate()
  const workout = useWorkoutStore()
  
  const [search, setSearch] = useState('')
  const [allExercises, setAllExercises] = useState<string[]>([])
  const [presets, setPresets] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      // Get all exercises from history
      const sets = await db.gym_sets.toArray()
      const uniqueExercises = Array.from(new Set(sets.map(s => s.name)))
      setAllExercises(uniqueExercises)

      // Get exercise presets
      const presetData = await db.exercise_presets.toArray()
      setPresets(presetData.map(p => p.name))
    }
    load()
  }, [])

  const allOptions = Array.from(new Set([...allExercises, ...presets]))
    .filter(name => name.toLowerCase().includes(search.toLowerCase()))
    .sort()

  async function handleSwap(newExerciseName: string) {
    if (!planId || !exerciseName) return

    // Update the plan_exercises table
    const planExercises = await db.plan_exercises
      .where('planId').equals(Number(planId))
      .filter(e => e.exercise === decodeURIComponent(exerciseName))
      .toArray()

    if (planExercises.length > 0) {
      const ex = planExercises[0]
      await updatePlanExercise(ex.id!, { exercise: newExerciseName })
    }

    const plan = await db.plans.get(Number(planId))
    if (plan) {
      const exercises = plan.exercises.split(',')
      const idx = exercises.indexOf(decodeURIComponent(exerciseName))
      if (idx !== -1) {
        exercises[idx] = newExerciseName
        await updatePlan(Number(planId), { exercises: exercises.join(',') })
      }
    }

    // Navigate back to workout
    navigate(`/start-plan/${planId}`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-ground pb-8">
      <header className="sticky top-0 w-full z-50 bg-ground/90 backdrop-blur-md flex justify-between items-center px-3 h-14 border-b border-line">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-ink hover:bg-surface" style={{ borderRadius: '10px' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[24px] font-medium text-ink absolute left-1/2 -translate-x-1/2">Swap Exercise</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-3 py-3 gap-4">
        <div className="bg-surface p-3 border border-line" style={{ borderRadius: '16px' }}>
          <p className="text-[13px] text-muted mb-2">Replacing:</p>
          <p className="text-[16px] text-ink font-medium">{decodeURIComponent(exerciseName || '')}</p>
        </div>

        <div className="relative">
          <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full bg-surface text-ink text-[16px] pl-10 pr-3 py-3 border border-line focus:border-accent-hover focus:outline-none placeholder-muted"
            style={{ borderRadius: '10px' }}
          />
        </div>

        <div className="flex flex-col gap-2 max-h-[calc(100vh-250px)] overflow-y-auto">
          {allOptions.length === 0 && (
            <p className="text-[15px] text-muted text-center py-8">No exercises found</p>
          )}
          {allOptions.map(name => (
            <button
              key={name}
              onClick={() => handleSwap(name)}
              className="bg-surface p-3 text-left text-ink text-[16px] border border-line hover:border-accent-hover transition-colors"
              style={{ borderRadius: '16px' }}
            >
              {name}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
