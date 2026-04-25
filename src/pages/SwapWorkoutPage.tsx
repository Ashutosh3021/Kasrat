import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { db, type PlanExercise } from '../db/database'
import { useWorkoutStore } from '../store/workoutStore'

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
      await db.plan_exercises.update(ex.id!, { exercise: newExerciseName })
    }

    // Update the plan's exercises list
    const plan = await db.plans.get(Number(planId))
    if (plan) {
      const exercises = plan.exercises.split(',')
      const idx = exercises.indexOf(decodeURIComponent(exerciseName))
      if (idx !== -1) {
        exercises[idx] = newExerciseName
        await db.plans.update(Number(planId), { exercises: exercises.join(',') })
      }
    }

    // Navigate back to workout
    navigate(`/start-plan/${planId}`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-black pb-8">
      <header className="sticky top-0 w-full z-50 bg-black/90 backdrop-blur-md flex justify-between items-center px-3 h-14 border-b border-[#2C2C2E]">
        <button onClick={() => navigate(-1)} className="w-10 h-10 -ml-2 flex items-center justify-center text-white hover:bg-[#1C1C1E]" style={{ borderRadius: '2px' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-[22px] font-medium text-white absolute left-1/2 -translate-x-1/2">Swap Exercise</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-3 py-3 gap-4">
        <div className="bg-[#1C1C1E] p-3 border border-[#2C2C2E]" style={{ borderRadius: '4px' }}>
          <p className="text-[13px] text-[#A1A1A6] mb-2">Replacing:</p>
          <p className="text-[17px] text-white font-medium">{decodeURIComponent(exerciseName || '')}</p>
        </div>

        <div className="relative">
          <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A6]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full bg-[#1C1C1E] text-white text-[17px] pl-10 pr-3 py-3 border border-[#2C2C2E] focus:border-[#3B82F6] focus:outline-none placeholder-[#A1A1A6]"
            style={{ borderRadius: '2px' }}
          />
        </div>

        <div className="flex flex-col gap-2 max-h-[calc(100vh-250px)] overflow-y-auto">
          {allOptions.length === 0 && (
            <p className="text-[15px] text-[#A1A1A6] text-center py-8">No exercises found</p>
          )}
          {allOptions.map(name => (
            <button
              key={name}
              onClick={() => handleSwap(name)}
              className="bg-[#1C1C1E] p-3 text-left text-white text-[17px] border border-[#2C2C2E] hover:border-[#3B82F6] transition-colors"
              style={{ borderRadius: '4px' }}
            >
              {name}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
