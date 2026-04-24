import { useNavigate, useLocation } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { useWorkoutStore } from '../store/workoutStore'

/**
 * Floating bubble that appears on every page (except StartPlanPage itself)
 * when a workout session is active. Tapping it returns to the session.
 */
export default function WorkoutBubble() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activePlanId, activePlanTitle, completedExercises, loggedSets } = useWorkoutStore()

  // Don't show on the active session page itself
  if (!activePlanId || location.pathname.startsWith('/start-plan/')) return null

  const totalSets = Object.values(loggedSets).reduce((n, arr) => n + arr.length, 0)
  const doneCount = completedExercises.length

  return (
    <button
      onClick={() => navigate(`/start-plan/${activePlanId}`)}
      className="fixed bottom-20 right-4 z-[200] flex items-center gap-2 bg-[#3B82F6] text-white rounded-full pl-3 pr-4 py-2.5 shadow-[0_4px_20px_rgba(59,130,246,0.45)] active:scale-95 transition-transform"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
      </span>

      <Dumbbell size={16} className="shrink-0" />

      <div className="flex flex-col items-start leading-none">
        <span className="text-[13px] font-bold truncate max-w-[120px]">{activePlanTitle}</span>
        <span className="text-[11px] opacity-80 mt-0.5">
          {doneCount} done · {totalSets} sets
        </span>
      </div>
    </button>
  )
}
