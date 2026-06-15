/**
 * Feature 1: Goal-Specific Targeting Store
 *
 * Manages user goal preferences (bulk / cut / maintain) and applies
 * volume/intensity modifiers to training parameters. Stored in Dexie
 * settings and synced with Supabase profiles.
 */

import { create } from 'zustand'
import { supabase } from '../../supabase/client'

export type GoalType = 'bulk' | 'cut' | 'maintain'

export interface GoalModifiers {
  volumeMultiplier: number   // bulk=1.15, cut=0.85, maintain=1.0
  intensityFactor: number    // bulk=0.75, cut=0.85, maintain=0.80  (RPE ceiling)
  exercisePriority: 'compound_priority' | 'circuit_focus' | 'balanced'
}

const GOAL_MODIFIERS: Record<GoalType, GoalModifiers> = {
  bulk: {
    volumeMultiplier: 1.15,
    intensityFactor: 0.75,
    exercisePriority: 'compound_priority',
  },
  cut: {
    volumeMultiplier: 0.85,
    intensityFactor: 0.85,
    exercisePriority: 'circuit_focus',
  },
  maintain: {
    volumeMultiplier: 1.0,
    intensityFactor: 0.80,
    exercisePriority: 'balanced',
  },
}

interface GoalTargetingState {
  goal: GoalType
  modifiers: GoalModifiers
  loaded: boolean
  /** Load goal from Supabase profile */
  loadGoal: (userId: string) => Promise<void>
  /** Persist goal to Supabase and update local state */
  setGoal: (userId: string, goal: GoalType) => Promise<void>
  /** Apply volume multiplier to a given set count */
  applyVolumeMultiplier: (baseSets: number) => number
}

export const useGoalTargetingStore = create<GoalTargetingState>((set, get) => ({
  goal: 'maintain',
  modifiers: GOAL_MODIFIERS.maintain,
  loaded: false,

  loadGoal: async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('goal_preference')
        .eq('id', userId)
        .maybeSingle()

      const goal: GoalType = (data?.goal_preference as GoalType) ?? 'maintain'
      set({ goal, modifiers: GOAL_MODIFIERS[goal], loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  setGoal: async (userId: string, goal: GoalType) => {
    set({ goal, modifiers: GOAL_MODIFIERS[goal] })
    try {
      await supabase
        .from('profiles')
        .update({ goal_preference: goal })
        .eq('id', userId)
    } catch (err) {
      console.warn('[goalTargeting] setGoal failed to persist:', err)
    }
  },

  /**
   * Returns the adjusted set count by applying the current goal's
   * volume multiplier and rounding to the nearest integer.
   */
  applyVolumeMultiplier: (baseSets: number) => {
    const { modifiers } = get()
    return Math.max(1, Math.round(baseSets * modifiers.volumeMultiplier))
  },
}))

/**
 * Pure utility — apply modifiers to a volume value without the store.
 * Useful in non-component contexts.
 */
export function applyGoalModifiers(
  baseVolume: number,
  goal: GoalType,
): number {
  return baseVolume * GOAL_MODIFIERS[goal].volumeMultiplier
}

export { GOAL_MODIFIERS }
