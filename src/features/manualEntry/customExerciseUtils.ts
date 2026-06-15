/**
 * Feature 7: Manual Entry Features — Custom Exercise Utilities
 *
 * Helpers for creating and deduplicating custom exercises in the
 * existing `exercise_meta` Dexie table. No schema changes needed.
 */

import { db } from '../../db/database'
import { supabase } from '../../supabase/client'
import { enqueue } from '../../hooks/useSync'

export interface CustomExerciseInput {
  name: string
  primaryMuscle: string
  secondaryMuscle?: string
  notes?: string
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Adds a new custom exercise to exercise_meta.
 * Warns if a similar name already exists (case-insensitive) to prevent duplicates.
 * Returns 'created' | 'duplicate_warning' | 'merged'
 */
export async function addCustomExercise(
  input: CustomExerciseInput,
  userId?: string,
): Promise<'created' | 'duplicate_warning'> {
  const normalised = input.name.trim()
  if (!normalised) throw new Error('Exercise name is required')

  // Duplicate check (case-insensitive)
  const all = await db.exercise_meta.toArray()
  const existing = all.find(
    e => e.name.toLowerCase() === normalised.toLowerCase(),
  )
  if (existing) return 'duplicate_warning'

  // Write to local DB
  await db.exercise_meta.put({
    name: normalised,
    cues: input.notes ?? '',
  })

  // Persist to exercise_presets for search visibility (client-only)
  await db.exercise_presets.put({
    name: normalised,
    primaryMuscle: input.primaryMuscle as import('../../data/exercisePresets').MuscleGroup,
    secondaryMuscle: input.secondaryMuscle ?? null,
    type: 'strength',
  })

  // Sync to Supabase if authenticated
  if (userId) {
    const payload = {
      name: normalised,
      cues: input.notes ?? '',
      user_id: userId,
    }
    try {
      const { error } = await supabase.from('exercise_meta').upsert(payload)
      if (error) await enqueue('exercise_meta', 'upsert', payload)
    } catch {
      await enqueue('exercise_meta', 'upsert', payload)
    }
  }

  return 'created'
}

// ─── Fetch Recent Custom Exercises ───────────────────────────────────────────

/**
 * Returns the N most recently used custom exercises by scanning gym_sets.
 * "Custom" = exercises not in the base exercise_presets list.
 */
export async function getRecentCustomExercises(limit = 5): Promise<string[]> {
  const [sets, presets] = await Promise.all([
    db.gym_sets.orderBy('created').reverse().limit(100).toArray(),
    db.exercise_presets.toArray(),
  ])

  const presetNames = new Set(presets.map(p => p.name.toLowerCase()))

  const seen = new Set<string>()
  const custom: string[] = []
  for (const s of sets) {
    if (!presetNames.has(s.name.toLowerCase()) && !seen.has(s.name)) {
      seen.add(s.name)
      custom.push(s.name)
      if (custom.length >= limit) break
    }
  }
  return custom
}
