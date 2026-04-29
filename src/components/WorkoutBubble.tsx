import { useNavigate, useLocation } from 'react-router-dom'
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
  if (!activePlanId || location.pathname.startsWith('/start-plan/') || location.pathname === '/quick-workout') return null

  const totalSets = Object.values(loggedSets).reduce((n, arr) => n + arr.length, 0)
  const doneCount = completedExercises.length

  return (
    <button
      onClick={() => navigate(activePlanId === -1 ? '/quick-workout' : `/start-plan/${activePlanId}`)}
      className="fixed bottom-20 right-4 z-[200] flex items-center gap-2 bg-[#93032E] text-white px-3 py-2 border border-[#93032E] active:opacity-80 transition-opacity"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)', borderRadius: '2px' }}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full bg-white opacity-60" style={{ borderRadius: '50%' }} />
        <span className="relative inline-flex h-2 w-2 bg-white" style={{ borderRadius: '50%' }} />
      </span>

      <div className="flex flex-col items-start leading-none">
        <span className="text-[13px] font-medium truncate max-w-[120px]">{activePlanTitle}</span>
        <span className="text-[11px] opacity-80 mt-0.5">
          {doneCount} done · {totalSets} sets
        </span>
      </div>
    </button>
  )
}

