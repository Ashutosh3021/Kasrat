import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LoggedSet {
  exercise: string
  weight: number
  reps: number
}

interface WorkoutState {
  activePlanId: number | null
  activePlanTitle: string
  completedExercises: string[]   // exercise names
  loggedSets: Record<string, LoggedSet[]>  // keyed by exercise name
  currentExerciseIdx: number
  startedAt: string | null       // ISO timestamp

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

      startSession: (planId, planTitle) =>
        set({
          activePlanId: planId,
          activePlanTitle: planTitle,
          completedExercises: [],
          loggedSets: {},
          currentExerciseIdx: 0,
          startedAt: new Date().toISOString(),
        }),

      finishSession: () =>
        set({
          activePlanId: null,
          activePlanTitle: '',
          completedExercises: [],
          loggedSets: {},
          currentExerciseIdx: 0,
          startedAt: null,
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
      name: 'kasrat-active-workout',   // localStorage key
    }
  )
)
