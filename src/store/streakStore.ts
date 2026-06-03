import { create } from 'zustand'

export type StreakToastType = 'increased' | 'reset'

export interface StreakToast {
  type: StreakToastType
  message: string
}

interface StreakState {
  currentStreak: number
  previousStreak: number
  longestStreak: number
  sessionsThisMonth: number
  totalSessions: number
  pendingCount: number
  activeToday: boolean
  toast: StreakToast | null
  setSnapshot: (data: {
    currentStreak: number
    previousStreak: number
    longestStreak: number
    sessionsThisMonth: number
    totalSessions: number
    pendingCount: number
    activeToday: boolean
  }) => void
  setToast: (toast: StreakToast) => void
  dismissToast: () => void
}

export const useStreakStore = create<StreakState>((set) => ({
  currentStreak: 0,
  previousStreak: 0,
  longestStreak: 0,
  sessionsThisMonth: 0,
  totalSessions: 0,
  pendingCount: 0,
  activeToday: false,
  toast: null,
  setSnapshot: (data) => set(data),
  setToast: (toast) => set({ toast }),
  dismissToast: () => set({ toast: null }),
}))
