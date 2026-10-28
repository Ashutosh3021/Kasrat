import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, ChevronRight } from 'lucide-react'
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
      type="button"
      onClick={() => navigate(activePlanId === -1 ? '/quick-workout' : `/start-plan/${activePlanId}`)}
      className="fixed right-4 z-[200] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-accent/35 bg-surface/95 p-2 pr-3.5 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-all hover:border-accent/60 active:scale-[0.98]"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label={`Resume ${activePlanTitle}`}
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent">
        <Activity size={18} strokeWidth={1.9} />
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-soft opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-ground bg-accent-soft" />
        </span>
      </span>

      <span className="min-w-0 flex flex-col leading-none">
        <span className="max-w-[9rem] truncate text-[13px] font-semibold text-ink">{activePlanTitle}</span>
        <span className="mono mt-1 text-[9px] uppercase tracking-[0.1em] text-muted">
          {doneCount} done · {totalSets} sets
        </span>
      </span>

      <ChevronRight size={15} className="shrink-0 text-muted-dim" />
    </button>
  )
}
