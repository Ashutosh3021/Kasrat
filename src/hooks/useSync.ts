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
import { useSyncStore } from '../store/syncStore'

// ─── Pull (full replace) ──────────────────────────────────────────────────────

export async function pullRemoteData(userId: string): Promise<void> {
  if (!userId) return

  const { hasPulled, setHasPulled, setIsInitialPulling, setLastSyncedAt } = useSyncStore.getState()

  // FEATURE 1: hasPulled gate
  if (hasPulled) {
    console.log('[sync] pullRemoteData: already pulled in this session, skipping.')
    return
  }

  // Set isInitialPulling only for the very first pull
  setIsInitialPulling(true)
  // Set hasPulled immediately to prevent concurrent duplicate pulls
  setHasPulled(true)

  try {
    // ── FETCH FIRST — local data is untouched until all fetches succeed ──
    // FEATURE 2: Audit and fetch ALL tables
    const [
      { data: sets,         error: setsErr },
      { data: plans,        error: plansErr },
      { data: measurements, error: measErr },
      { data: nutrition,    error: nutrErr },
      { data: supps,        error: suppsErr },
      { data: meta,         error: metaErr },
    ] = await Promise.all([
      supabase.from('gym_sets').select('*').eq('user_id', userId),
      supabase.from('plans').select('*').eq('user_id', userId),
      supabase.from('body_measurements').select('*').eq('user_id', userId),
      supabase.from('daily_nutrition').select('*').eq('user_id', userId),
      supabase.from('supplement_logs').select('*').eq('user_id', userId),
      supabase.from('exercise_meta').select('*').eq('user_id', userId),
    ])

    if (setsErr || plansErr || measErr || nutrErr || suppsErr || metaErr) {
      console.error('[sync] pullRemoteData: fetch failed — local data preserved', { setsErr, plansErr, measErr, nutrErr, suppsErr, metaErr })
      setHasPulled(false) // Allow retry
      setIsInitialPulling(false)
      throw new Error('One or more tables failed to fetch')
    }

    // Fetch plan_exercises only if we have plans (avoids empty .in() query)
    let exs: Record<string, unknown>[] | null = null
    if (plans?.length) {
      const planIds = plans.map(p => p.id)
      const { data: exData, error: exErr } = await supabase
        .from('plan_exercises').select('*').in('plan_id', planIds)
      if (exErr) {
        console.error('[sync] pullRemoteData: plan_exercises fetch failed — local data preserved', exErr)
        setHasPulled(false)
        setIsInitialPulling(false)
        throw new Error('plan_exercises fetch failed')
      }
      exs = exData
    }

    // ── REPLACE ATOMICALLY — only runs if ALL fetches succeeded ──────────
    await db.transaction('rw',
      [db.gym_sets, db.plans, db.plan_exercises, db.body_measurements, db.daily_nutrition, db.supplement_logs, db.exercise_meta],
      async () => {
        // gym_sets
        await db.gym_sets.clear()
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

        // plans
        await db.plans.clear()
        if (plans?.length) {
          await db.plans.bulkPut(plans.map(r => ({
            id: r.id,
            sequence: r.sequence ?? 0,
            title: r.title ?? '',
            days: r.days ?? '',
            exercises: r.exercises ?? '',
          })))
        }

        // plan_exercises
        await db.plan_exercises.clear()
        if (exs?.length) {
          await db.plan_exercises.bulkPut(exs.map((r: Record<string, unknown>) => ({
            id: r.id as number,
            planId: r.plan_id as number,
            exercise: r.exercise as string,
            enabled: (r.enabled as boolean) ?? true,
            maxSets: (r.max_sets as number) ?? 3,
            sortOrder: (r.sort_order as number) ?? 0,
            setType: (r.set_type as string ?? 'normal') as import('../db/database').SetType,
            supersetGroup: r.superset_group as string | undefined,
            supersetColor: r.superset_color as string | undefined,
          })))
        }

        // body_measurements
        await db.body_measurements.clear()
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

        // daily_nutrition
        await db.daily_nutrition.clear()
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

        // supplement_logs
        await db.supplement_logs.clear()
        if (supps?.length) {
          await db.supplement_logs.bulkPut(supps.map(r => ({
            id: r.id,
            date: r.date,
            name: r.name,
            taken: r.taken,
          })))
        }

        // exercise_meta
        await db.exercise_meta.clear()
        if (meta?.length) {
          await db.exercise_meta.bulkPut(meta.map(r => ({
            name: r.name,
            cues: r.cues,
          })))
        }
      }
    )

    setLastSyncedAt(new Date().toISOString())
    console.log('[sync] pullRemoteData complete for', userId)
  } catch (err) {
    // Network error, timeout, etc. — local data still intact
    console.error('[sync] pullRemoteData: unexpected error — local data preserved', err)
    setHasPulled(false) // Allow retry on failure
    throw err // Re-throw for manual sync button to catch
  } finally {
    setIsInitialPulling(false)
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
          // Table-specific primary key lookup (not all tables use 'id')
          const PK: Record<string, string> = {
            daily_nutrition: 'date',
          }
          const pkField = PK[item.tableName] ?? 'id'
          const pkValue = (item.payload as Record<string, unknown>)[pkField]

          // For plan_exercises, delete by id only (no user_id column)
          if (item.tableName === 'plan_exercises') {
            const { error } = await supabase
              .from(item.tableName)
              .delete()
              .eq('id', pkValue as number)
            if (error) throw error
          } else {
            const { error } = await supabase
              .from(item.tableName)
              .delete()
              .eq(pkField, pkValue)
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
