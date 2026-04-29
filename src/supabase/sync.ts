/**
 * Offline-first sync strategy
 * ─────────────────────────────────────────────────────────────────────────────
 * WRITE PATH  (offline or online)
 *   Every Dexie write goes through normally.  A lightweight entry is appended
 *   to the `sync_queue` table so we know what to push later.
 *
 * PUSH PATH  (when online)
 *   processQueue() reads the queue, upserts each record into the matching
 *   Supabase table, then deletes the queue entry on success.
 *
 * PULL PATH  (after login / on reconnect)
 *   pullFromSupabase() fetches all rows for the authenticated user from every
 *   Supabase table and bulk-puts them into Dexie (last-write-wins by
 *   Supabase's updated_at / created timestamp).
 *
 * LOGOUT
 *   clearLocalUserData() wipes all user-generated Dexie tables so a different
 *   user logging in on the same device starts fresh.
 */

import { supabase } from './client'
import { db } from '../db/database'

// ─── Queue helpers ────────────────────────────────────────────────────────────

export async function enqueue(
  tableName: string,
  operation: 'upsert' | 'delete',
  payload: Record<string, unknown>,
) {
  await db.sync_queue.add({
    tableName,
    operation,
    payload,
    timestamp: new Date().toISOString(),
  })
}

// ─── Push local queue to Supabase ─────────────────────────────────────────────

export async function processQueue(userId: string) {
  const items = await db.sync_queue.orderBy('timestamp').toArray()
  for (const item of items) {
    try {
      const record = { ...item.payload, user_id: userId }
      if (item.operation === 'upsert') {
        const { error } = await supabase.from(item.tableName).upsert(record)
        if (error) throw error
      } else if (item.operation === 'delete') {
        const { error } = await supabase
          .from(item.tableName)
          .delete()
          .eq('id', (item.payload as { id: number }).id)
          .eq('user_id', userId)
        if (error) throw error
      }
      await db.sync_queue.delete(item.id!)
    } catch (err) {
      console.warn('[sync] queue item failed, will retry later', err)
    }
  }
}

// ─── Pull remote data into Dexie ──────────────────────────────────────────────

export async function pullFromSupabase(userId: string) {
  try {
    // gym_sets
    const { data: sets } = await supabase
      .from('gym_sets')
      .select('*')
      .eq('user_id', userId)
    if (sets?.length) {
      const mapped = sets.map(r => ({
        id: r.id,
        name: r.name,
        reps: r.reps,
        weight: r.weight,
        unit: r.unit,
        created: r.created,
        hidden: r.hidden,
        bodyWeight: r.body_weight,
        duration: r.duration,
        distance: r.distance,
        cardio: r.cardio,
        restMs: r.rest_ms,
        incline: r.incline,
        planId: r.plan_id,
        notes: r.notes,
        primaryMuscle: r.primary_muscle,
        secondaryMuscle: r.secondary_muscle,
        rpe: r.rpe,
        rir: r.rir,
      }))
      await db.gym_sets.bulkPut(mapped)
    }

    // plans
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
    if (plans?.length) {
      const mapped = plans.map(r => ({
        id: r.id,
        sequence: r.sequence,
        title: r.title,
        days: r.days ?? '',
        exercises: r.exercises ?? '',
      }))
      await db.plans.bulkPut(mapped)
    }

    // plan_exercises
    if (plans?.length) {
      const planIds = plans.map(p => p.id)
      const { data: exs } = await supabase
        .from('plan_exercises')
        .select('*')
        .in('plan_id', planIds)
      if (exs?.length) {
        const mapped = exs.map(r => ({
          id: r.id,
          planId: r.plan_id,
          exercise: r.exercise,
          enabled: r.enabled,
          maxSets: r.max_sets,
          sortOrder: r.sort_order,
          setType: r.set_type,
          supersetGroup: r.superset_group,
          supersetColor: r.superset_color,
        }))
        await db.plan_exercises.bulkPut(mapped)
      }
    }

    // body_measurements
    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
    if (measurements?.length) {
      const mapped = measurements.map(r => ({
        id: r.id,
        created: r.created,
        bodyWeight: r.body_weight,
        fatPercentage: r.fat_percentage,
        arms: r.arms,
        chest: r.chest,
        thigh: r.thigh,
        calves: r.calves,
        waist: r.waist,
        notes: r.notes,
      }))
      await db.body_measurements.bulkPut(mapped)
    }

    // daily_nutrition
    const { data: nutrition } = await supabase
      .from('daily_nutrition')
      .select('*')
      .eq('user_id', userId)
    if (nutrition?.length) {
      const mapped = nutrition.map(r => ({
        date: r.date,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        water: r.water,
        notes: r.notes,
      }))
      await db.daily_nutrition.bulkPut(mapped)
    }

    // supplement_logs
    const { data: supps } = await supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', userId)
    if (supps?.length) {
      const mapped = supps.map(r => ({
        id: r.id,
        date: r.date,
        name: r.name,
        taken: r.taken,
      }))
      await db.supplement_logs.bulkPut(mapped)
    }
  } catch (err) {
    console.warn('[sync] pull failed', err)
  }
}

// ─── Full sync (push then pull) ───────────────────────────────────────────────

export async function syncToSupabase(userId: string) {
  if (!navigator.onLine) return
  await processQueue(userId)
  await pullFromSupabase(userId)
}

// ─── Clear local user data on logout ─────────────────────────────────────────

export async function clearLocalUserData() {
  await db.gym_sets.clear()
  await db.plans.clear()
  await db.plan_exercises.clear()
  await db.body_measurements.clear()
  await db.daily_nutrition.clear()
  await db.supplement_logs.clear()
  await db.sync_queue.clear()
  // Keep settings, exercise_meta, exercise_presets — they are device-level
}
