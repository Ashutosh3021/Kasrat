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

const PULL_TIMEOUT_MS = 30_000

/** Postgres gym_sets.body_weight is numeric; Dexie stores a boolean flag */
export function bodyWeightForSupabase(v: boolean | number | undefined | null): number {
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  return 0
}

function bodyWeightFromSupabase(v: number | boolean | null | undefined): boolean {
  if (typeof v === 'boolean') return v
  return Number(v) > 0
}

/** Push parent rows before children so RLS checks pass */
const QUEUE_TABLE_ORDER = [
  'plans',
  'plan_exercises',
  'gym_sets',
  'body_measurements',
  'daily_nutrition',
  'supplement_logs',
  'exercise_meta',
] as const

const PERMANENT_SYNC_ERROR_CODES = new Set(['42501', '22P02', 'PGRST205', '42P01'])

let _pullInFlight: Promise<void> | null = null

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

// ─── Pull (full replace) ──────────────────────────────────────────────────────

export async function pullRemoteData(userId: string): Promise<void> {
  if (!userId) return

  const { hasPulled } = useSyncStore.getState()

  if (hasPulled) {
    console.log('[sync] pullRemoteData: already pulled in this session, skipping.')
    return
  }

  if (_pullInFlight) {
    console.log('[sync] pullRemoteData: pull already in flight, awaiting…')
    return _pullInFlight
  }

  _pullInFlight = executePull(userId).finally(() => {
    _pullInFlight = null
  })

  return _pullInFlight
}

async function executePull(userId: string): Promise<void> {
  const { setHasPulled, setIsInitialPulling, setLastSyncedAt } = useSyncStore.getState()

  // Full-screen overlay only when local DB looks empty (typical first mobile open)
  const localPlanCount = await db.plans.count()
  const showOverlay = localPlanCount === 0
  if (showOverlay) setIsInitialPulling(true)

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
    ] = await withTimeout(
      Promise.all([
        supabase.from('gym_sets').select('*').eq('user_id', userId),
        supabase.from('plans').select('*').eq('user_id', userId),
        supabase.from('body_measurements').select('*').eq('user_id', userId),
        supabase.from('daily_nutrition').select('*').eq('user_id', userId),
        supabase.from('supplement_logs').select('*').eq('user_id', userId),
        supabase.from('exercise_meta').select('*').eq('user_id', userId),
      ]),
      PULL_TIMEOUT_MS,
      'pullRemoteData fetch',
    )

    if (setsErr || plansErr || measErr || nutrErr || suppsErr || metaErr) {
      console.error('[sync] pullRemoteData: fetch failed — local data preserved', { setsErr, plansErr, measErr, nutrErr, suppsErr, metaErr })
      throw new Error('One or more tables failed to fetch')
    }

    console.log('[sync] pullRemoteData: fetched', {
      plans: plans?.length ?? 0,
      sets: sets?.length ?? 0,
    })

    // Fetch plan_exercises only if we have plans (avoids empty .in() query)
    let exs: Record<string, unknown>[] | null = null
    if (plans?.length) {
      const planIds = plans.map(p => p.id)
      const { data: exData, error: exErr } = await supabase
        .from('plan_exercises').select('*').in('plan_id', planIds)
      if (exErr) {
        console.error('[sync] pullRemoteData: plan_exercises fetch failed — local data preserved', exErr)
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
            bodyWeight: bodyWeightFromSupabase(r.body_weight),
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
            cues: r.cues ?? '',
          })))
        }
      }
    )

    setHasPulled(true)
    setLastSyncedAt(new Date().toISOString())
    console.log('[sync] pullRemoteData complete for', userId)
  } catch (err) {
    // Network error, timeout, etc. — local data still intact
    console.error('[sync] pullRemoteData: unexpected error — local data preserved', err)
    setHasPulled(false)
    throw err
  } finally {
    setIsInitialPulling(false)
  }
}


// ─── Process sync queue ───────────────────────────────────────────────────────

let _queueRunning = false

function queueSortKey(tableName: string): number {
  const idx = QUEUE_TABLE_ORDER.indexOf(tableName as (typeof QUEUE_TABLE_ORDER)[number])
  return idx === -1 ? QUEUE_TABLE_ORDER.length : idx
}

function normalizeQueueRecord(
  tableName: string,
  payload: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  const tablesWithoutUserId = new Set(['plan_exercises'])
  const record = tablesWithoutUserId.has(tableName)
    ? { ...payload }
    : { ...payload, user_id: (payload.user_id as string | undefined) ?? userId }

  if (tableName === 'gym_sets' && 'body_weight' in record) {
    record.body_weight = bodyWeightForSupabase(
      record.body_weight as boolean | number | undefined | null,
    )
  }

  return record
}

function isPermanentSyncError(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  return !!code && PERMANENT_SYNC_ERROR_CODES.has(code)
}

export async function processSyncQueue(userId: string): Promise<void> {
  if (!userId || !navigator.onLine || _queueRunning) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token || session.user.id !== userId) {
    console.warn('[sync] processSyncQueue: JWT not ready, skipping')
    return
  }

  _queueRunning = true
  try {
    const items = (await db.sync_queue.orderBy('timestamp').toArray()).sort((a, b) => {
      const order = queueSortKey(a.tableName) - queueSortKey(b.tableName)
      return order !== 0 ? order : a.timestamp.localeCompare(b.timestamp)
    })
    if (!items.length) return

    for (const item of items) {
      try {
        const record = normalizeQueueRecord(item.tableName, item.payload, userId)

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
            exercise_meta: 'name',
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
        if (isPermanentSyncError(err)) {
          console.warn('[sync] dropping poison queue item:', item.tableName, item.operation, err)
          await db.sync_queue.delete(item.id!)
        } else {
          console.warn('[sync] queue item failed, will retry later:', err)
        }
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
