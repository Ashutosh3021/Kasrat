/**
 * useSync — offline-first sync hook
 *
 * pullRemoteData(userId)
 *   Clears all user-generated local tables, then bulk-inserts fresh data
 *   from Supabase. Called after login and after onboarding completion.
 *
 * processSyncQueue(userId)
 *   Reads the sync_queue table and pushes each pending operation to Supabase.
 *   Duplicate-key errors (23505) are silently ignored.
 *   Called on reconnect and on app start when online.
 *
 * setupOnlineListener(userId)
 *   Registers window 'online' event to auto-process the queue.
 *   Returns a cleanup function.
 */

import { supabase } from '../supabase/client'
import { db } from '../db/database'

// ─── Pull (full replace) ──────────────────────────────────────────────────────

export async function pullRemoteData(userId: string): Promise<void> {
  if (!userId) return
  try {
    // Clear user-generated tables first (full replace strategy)
    await db.gym_sets.clear()
    await db.plans.clear()
    await db.plan_exercises.clear()
    await db.body_measurements.clear()
    await db.daily_nutrition.clear()
    await db.supplement_logs.clear()

    // ── gym_sets ──────────────────────────────────────────────────────────
    const { data: sets } = await supabase
      .from('gym_sets').select('*').eq('user_id', userId)
    if (sets?.length) {
      await db.gym_sets.bulkPut(sets.map(r => ({
        id: r.id,
        name: r.name,
        reps: r.reps,
        weight: r.weight,
        unit: r.unit,
        created: r.created,
        hidden: r.hidden,
        bodyWeight: r.body_weight ?? 0,
        duration: r.duration ?? 0,
        distance: r.distance ?? 0,
        cardio: r.cardio,
        restMs: r.rest_ms ?? 0,
        incline: r.incline,
        planId: r.plan_id,
        notes: r.notes,
        primaryMuscle: r.primary_muscle,
        secondaryMuscle: r.secondary_muscle,
        rpe: r.rpe,
        rir: r.rir,
      })))
    }

    // ── plans ─────────────────────────────────────────────────────────────
    const { data: plans } = await supabase
      .from('plans').select('*').eq('user_id', userId)
    if (plans?.length) {
      await db.plans.bulkPut(plans.map(r => ({
        id: r.id,
        sequence: r.sequence ?? 0,
        title: r.title ?? '',
        days: r.days ?? '',
        exercises: r.exercises ?? '',
      })))

      // ── plan_exercises ──────────────────────────────────────────────────
      const planIds = plans.map(p => p.id)
      const { data: exs } = await supabase
        .from('plan_exercises').select('*').in('plan_id', planIds)
      if (exs?.length) {
        await db.plan_exercises.bulkPut(exs.map(r => ({
          id: r.id,
          planId: r.plan_id,
          exercise: r.exercise,
          enabled: r.enabled ?? true,
          maxSets: r.max_sets ?? 3,
          sortOrder: r.sort_order ?? 0,
          setType: r.set_type ?? 'normal',
          supersetGroup: r.superset_group,
          supersetColor: r.superset_color,
        })))
      }
    }

    // ── body_measurements ─────────────────────────────────────────────────
    const { data: measurements } = await supabase
      .from('body_measurements').select('*').eq('user_id', userId)
    if (measurements?.length) {
      await db.body_measurements.bulkPut(measurements.map(r => ({
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
      })))
    }

    // ── daily_nutrition ───────────────────────────────────────────────────
    const { data: nutrition } = await supabase
      .from('daily_nutrition').select('*').eq('user_id', userId)
    if (nutrition?.length) {
      await db.daily_nutrition.bulkPut(nutrition.map(r => ({
        date: r.date,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fats: r.fats,
        water: r.water,
        notes: r.notes,
      })))
    }

    // ── supplement_logs ───────────────────────────────────────────────────
    const { data: supps } = await supabase
      .from('supplement_logs').select('*').eq('user_id', userId)
    if (supps?.length) {
      await db.supplement_logs.bulkPut(supps.map(r => ({
        id: r.id,
        date: r.date,
        name: r.name,
        taken: r.taken,
      })))
    }

    console.log('[sync] pullRemoteData complete for', userId)
  } catch (err) {
    console.warn('[sync] pullRemoteData failed:', err)
  }
}

// ─── Process sync queue ───────────────────────────────────────────────────────

let _queueRunning = false

export async function processSyncQueue(userId: string): Promise<void> {
  if (!userId || !navigator.onLine || _queueRunning) return
  _queueRunning = true
  try {
    const items = await db.sync_queue.orderBy('timestamp').toArray()
    if (!items.length) return

    for (const item of items) {
      try {
        // plan_exercises has no user_id column — its payload already omits it.
        // For all other tables the payload was stored without user_id (to keep
        // it generic), so we inject it here. But if the payload already has
        // user_id (e.g. daily_nutrition delete), don't overwrite it.
        const tablesWithoutUserId = new Set(['plan_exercises'])
        const record = tablesWithoutUserId.has(item.tableName)
          ? { ...item.payload }
          : { ...item.payload, user_id: (item.payload.user_id as string | undefined) ?? userId }

        if (item.operation === 'upsert') {
          const { error } = await supabase.from(item.tableName).upsert(record)
          if (error) {
            if ((error as { code?: string }).code === '23505') {
              await db.sync_queue.delete(item.id!)
              continue
            }
            throw error
          }
        } else if (item.operation === 'delete') {
          // For plan_exercises, delete by id only (no user_id column)
          if (item.tableName === 'plan_exercises') {
            const { error } = await supabase
              .from(item.tableName)
              .delete()
              .eq('id', (item.payload as { id: number }).id)
            if (error) throw error
          } else {
            const { error } = await supabase
              .from(item.tableName)
              .delete()
              .eq('id', (item.payload as { id: number }).id)
              .eq('user_id', userId)
            if (error) throw error
          }
        }

        await db.sync_queue.delete(item.id!)
      } catch (err) {
        console.warn('[sync] queue item failed, will retry later:', err)
      }
    }
    console.log('[sync] processSyncQueue complete, processed', items.length, 'items')
  } finally {
    _queueRunning = false
  }
}

// ─── Online listener ──────────────────────────────────────────────────────────

export function setupOnlineListener(userId: string): () => void {
  async function handleOnline() {
    console.log('[sync] device came online — processing queue')
    await processSyncQueue(userId)
  }
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}

// ─── Enqueue a write for later sync ──────────────────────────────────────────

export async function enqueue(
  tableName: string,
  operation: 'upsert' | 'delete',
  payload: Record<string, unknown>,
): Promise<void> {
  await db.sync_queue.add({
    tableName,
    operation,
    payload,
    timestamp: new Date().toISOString(),
  })
}
