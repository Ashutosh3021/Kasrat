/**
 * Feature 14: Training-Specific Precision Levels — Store
 *
 * Manages the logging precision mode (minimal / standard / full).
 * Persisted to localStorage for immediate read on next session.
 * Does NOT modify the settings Dexie table or settingsStore.
 */

import { create } from 'zustand'

export type PrecisionMode = 'minimal' | 'standard' | 'full'

const STORAGE_KEY = 'kasrat_precision_mode'

interface PrecisionState {
  mode: PrecisionMode
  setMode: (mode: PrecisionMode) => void
  /** Returns true if the exercise should be shown in current mode */
  shouldShowExercise: (priorityLevel: 'primary' | 'secondary' | undefined) => boolean
}

export const usePrecisionStore = create<PrecisionState>((set, get) => ({
  mode: (localStorage.getItem(STORAGE_KEY) as PrecisionMode | null) ?? 'full',

  setMode: (mode: PrecisionMode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    set({ mode })
  },

  shouldShowExercise: (priorityLevel) => {
    const { mode } = get()
    if (mode === 'full') return true
    if (mode === 'standard') return priorityLevel !== 'secondary' || priorityLevel === undefined
    // minimal: only primary exercises
    return priorityLevel === 'primary' || priorityLevel === undefined
  },
}))
