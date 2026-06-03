import { create } from 'zustand'

export type StreakToastType = 'increased' | 'reset'

export interface StreakToast {
  type: StreakToastType
  message: string
}

interface StreakState {
  currentStreak: number
  longestStreak: number
  toast: StreakToast | null
  setStreak: (current: number, longest: number) => void
  setToast: (toast: StreakToast) => void
  dismissToast: () => void
}

export const useStreakStore = create<StreakState>((set) => ({
  currentStreak: 0,
  longestStreak: 0,
  toast: null,
  setStreak: (currentStreak, longestStreak) => set({ currentStreak, longestStreak }),
  setToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}))
