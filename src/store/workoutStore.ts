import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LoggedSet {
  exercise: string
  weight: number
  reps: number
  rpe?: number
  rir?: number
  /** Dexie gym_set id — stored on log so inline editing can target the exact row (Fix 1) */
  id?: number
}

interface WorkoutState {
  activePlanId: number | null
  activePlanTitle: string
  completedExercises: string[]
  loggedSets: Record<string, LoggedSet[]>
  currentExerciseIdx: number
  startedAt: string | null
  sessionId: string | null

  startSession: (planId: number, planTitle: string) => void
  finishSession: () => void
  markExerciseDone: (name: string) => void
  addLoggedSet: (exercise: string, set: LoggedSet) => void
  setCurrentIdx: (idx: number) => void
  /** Fix 1: replace a logged set by index (for inline weight/reps editing) */
  updateLoggedSet: (exercise: string, index: number, set: LoggedSet) => void
  /** Fix 1: remove a logged set by index (for inline delete) */
  removeLoggedSet: (exercise: string, index: number) => void
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

      updateLoggedSet: (exercise, index, updatedSet) =>
        set(s => {
          const existing = s.loggedSets[exercise] ?? []
          const updated = existing.map((ls, i) => (i === index ? updatedSet : ls))
          return { loggedSets: { ...s.loggedSets, [exercise]: updated } }
        }),

      removeLoggedSet: (exercise, index) =>
        set(s => {
          const existing = s.loggedSets[exercise] ?? []
          const updated = existing.filter((_, i) => i !== index)
          return { loggedSets: { ...s.loggedSets, [exercise]: updated } }
        }),
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
