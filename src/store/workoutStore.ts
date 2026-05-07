import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LoggedSet {
  exercise: string
  weight: number
  reps: number
  rpe?: number
  rir?: number
}

interface WorkoutState {
  activePlanId: number | null
  activePlanTitle: string
  completedExercises: string[]
  loggedSets: Record<string, LoggedSet[]>
  currentExerciseIdx: number
  startedAt: string | null       // ISO timestamp
  sessionId: string | null       // UUID — unique per quick-workout session

  startSession: (planId: number, planTitle: string) => void
  finishSession: () => void
  markExerciseDone: (name: string) => void
  addLoggedSet: (exercise: string, set: LoggedSet) => void
  setCurrentIdx: (idx: number) => void
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      activePlanId: null,
      activePlanTitle: '',
      completedExercises: [],
      loggedSets: {},
      currentExerciseIdx: 0,
      startedAt: null,
      sessionId: null,

      startSession: (planId, planTitle) =>
        set({
          activePlanId: planId,
          activePlanTitle: planTitle,
          completedExercises: [],
          loggedSets: {},
          currentExerciseIdx: 0,
          startedAt: new Date().toISOString(),
          // Generate a unique sessionId for quick workouts (planId = -1)
          // For plan-based workouts it's unused but harmless
          sessionId: crypto.randomUUID(),
        }),

      finishSession: () =>
        set({
          activePlanId: null,
          activePlanTitle: '',
          completedExercises: [],
          loggedSets: {},
          currentExerciseIdx: 0,
          startedAt: null,
          sessionId: null,
        }),

      markExerciseDone: (name) =>
        set(s => ({
          completedExercises: s.completedExercises.includes(name)
            ? s.completedExercises
            : [...s.completedExercises, name],
        })),

      addLoggedSet: (exercise, loggedSet) =>
        set(s => ({
          loggedSets: {
            ...s.loggedSets,
            [exercise]: [...(s.loggedSets[exercise] ?? []), loggedSet],
          },
        })),

      setCurrentIdx: (idx) => set({ currentExerciseIdx: idx }),
    }),
    {
      name: 'kasrat-active-workout',
    }
  )
)

// ─── Stale session guard (SESSION-005) ────────────────────────────────────────
// Call once on app boot. Clears persisted session state if it's older than
// SESSION_TTL_MS to prevent stale startedAt from corrupting discard logic.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export function clearStaleSession(): void {
  const { startedAt, finishSession } = useWorkoutStore.getState()
  if (!startedAt) return
  const age = Date.now() - new Date(startedAt).getTime()
  if (age > SESSION_TTL_MS) {
    console.warn('[workoutStore] stale session cleared on boot (age:', Math.round(age / 3600000), 'h)')
    finishSession()
  }
}
