import { create } from 'zustand'

interface TimerState {
  duration: number
  remaining: number
  running: boolean
  startTime: number | null
  setDuration: (d: number) => void
  start: (d?: number) => void
  pause: () => void
  stop: () => void
  addMinute: () => void
  tick: () => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  duration: 210,
  remaining: 210,
  running: false,
  startTime: null,

  setDuration: (d) => set({ duration: d, remaining: d }),

  start: (d) => {
    const dur = d ?? get().duration
    set({ duration: dur, remaining: dur, running: true, startTime: Date.now() })
  },

  pause: () => {
    set({ running: false })
  },

  stop: () => {
    const { duration } = get()
    set({ running: false, remaining: duration, startTime: null })
  },

  addMinute: () => {
    set((s) => ({ remaining: s.remaining + 60, duration: s.duration + 60 }))
  },

  tick: () => {
    const { remaining, running, startTime, duration } = get()
    if (!running || startTime === null) return
    // TIMER-001: derive remaining from wall-clock elapsed time, not tick count
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    const next = Math.max(0, duration - elapsed)
    if (next === 0) {
      set({ running: false, remaining: 0 })
      return
    }
    set({ remaining: next })
  }
}))
