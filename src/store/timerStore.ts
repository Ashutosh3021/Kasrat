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
    const { remaining, running } = get()
    if (!running) return
    if (remaining <= 0) {
      set({ running: false, remaining: 0 })
      return
    }
    set({ remaining: remaining - 1 })
  }
}))
