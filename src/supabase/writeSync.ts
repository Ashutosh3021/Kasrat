/**
 * writeSync.ts — write-through helpers
 *
 * Every function:
 *   1. Writes to local Dexie (offline-first, instant)
 *   2. If online → pushes directly to Supabase
 *      If offline → enqueues for later push
 *
 * Usage: import these instead of calling db.* directly for tables
 * that are mirrored in Supabase.
 */

import { supabase } from './client'
import { db, type Plan, type PlanExercise, type GymSet, type BodyMeasurement, type DailyNutrition, type SupplementLog } from '../db/database'
import { enqueue } from '../hooks/useSync'

// ─── Get current user id (null if not logged in) ──────────────────────────────
async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ─── Generic push helper ──────────────────────────────────────────────────────
async function push(
  tableName: string,
  operation: 'upsert' | 'delete',
  payload: Record<string, unknown>,
  userId: string,
  includeUserId = true,   // set false for tables without a user_id column (e.g. plan_exercises)
) {
  if (!navigator.onLine) {
    await enqueue(tableName, operation, payload)
    return
  }
  // Only attach user_id when the table actually has that column
  const record = includeUserId ? { ...payload, user_id: userId } : { ...payload }
  const { error } = operation === 'upsert'
    ? await supabase.from(tableName).upsert(record)
    : await supabase.from(tableName).delete().eq('id', payload.id as number).eq('user_id', userId)

  if (error) {
    console.warn(`[writeSync] ${tableName} ${operation} failed, queuing:`, error.message)
    await enqueue(tableName, operation, payload)
  }
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function addPlan(plan: Omit<Plan, 'id'>): Promise<number> {
  const id = await db.plans.add(plan) as number
  const userId = await getUserId()
  if (userId) {
    await push('plans', 'upsert', {
      id,
      title: plan.title,
      days: plan.days,
      exercises: plan.exercises,
      sequence: plan.sequence,
    }, userId)
  }
  return id
}

export async function updatePlan(id: number, changes: Partial<Plan>): Promise<void> {
  await db.plans.update(id, changes)
  const userId = await getUserId()
  if (userId) {
    const plan = await db.plans.get(id)
    if (plan) {
      await push('plans', 'upsert', {
        id,
        title: plan.title,
        days: plan.days,
        exercises: plan.exercises,
        sequence: plan.sequence,
      }, userId)
    }
  }
}

export async function deletePlan(id: number): Promise<void> {
  await db.plans.delete(id)
  await db.plan_exercises.where('planId').equals(id).delete()
  const userId = await getUserId()
  if (userId) {
    await push('plans', 'delete', { id }, userId)
  }
}

// ─── Plan exercises ───────────────────────────────────────────────────────────

export async function addPlanExercise(ex: Omit<PlanExercise, 'id'>): Promise<number> {
  const id = await db.plan_exercises.add(ex) as number
  const userId = await getUserId()
  if (userId) {
    await push('plan_exercises', 'upsert', {
      id,
      plan_id: ex.planId,
      exercise: ex.exercise,
      enabled: ex.enabled,
      max_sets: ex.maxSets,
      sort_order: ex.sortOrder ?? 0,
      set_type: ex.setType ?? 'normal',
      superset_group: ex.supersetGroup ?? null,
      superset_color: ex.supersetColor ?? null,
    }, userId, false)   // plan_exercises has no user_id column
  }
  return id
}

export async function updatePlanExercise(id: number, changes: Partial<PlanExercise>): Promise<void> {
  await db.plan_exercises.update(id, changes)
  const userId = await getUserId()
  if (userId) {
    const ex = await db.plan_exercises.get(id)
    if (ex) {
      await push('plan_exercises', 'upsert', {
        id,
        plan_id: ex.planId,
        exercise: ex.exercise,
        enabled: ex.enabled,
        max_sets: ex.maxSets,
        sort_order: ex.sortOrder ?? 0,
        set_type: ex.setType ?? 'normal',
        superset_group: ex.supersetGroup ?? null,
        superset_color: ex.supersetColor ?? null,
      }, userId, false)   // plan_exercises has no user_id column
    }
  }
}

export async function deletePlanExercise(id: number): Promise<void> {
  await db.plan_exercises.delete(id)
  // plan_exercises has no user_id column — RLS derives ownership via plan_id
  if (navigator.onLine) {
    await supabase.from('plan_exercises').delete().eq('id', id)
  } else {
    await enqueue('plan_exercises', 'delete', { id })
  }
}

// ─── Gym sets ─────────────────────────────────────────────────────────────────

export async function addGymSet(set: Omit<GymSet, 'id'>): Promise<number> {
  const id = await db.gym_sets.add(set) as number
  const userId = await getUserId()
  if (userId) {
    await push('gym_sets', 'upsert', {
      id,
      name: set.name,
      reps: set.reps,
      weight: set.weight,
      unit: set.unit,
      created: set.created,
      hidden: set.hidden,
      body_weight: set.bodyWeight,
      duration: set.duration,
      distance: set.distance,
      cardio: set.cardio,
      rest_ms: set.restMs,
      incline: set.incline ?? null,
      plan_id: set.planId ?? null,
      notes: set.notes ?? null,
      primary_muscle: set.primaryMuscle ?? null,
      secondary_muscle: set.secondaryMuscle ?? null,
      rpe: set.rpe ?? null,
      rir: set.rir ?? null,
    }, userId)
  }
  return id
}

export async function updateGymSet(id: number, changes: Partial<GymSet>): Promise<void> {
  await db.gym_sets.update(id, changes)
  const userId = await getUserId()
  if (userId) {
    const updated = await db.gym_sets.get(id)
    if (updated) {
      await push('gym_sets', 'upsert', {
        id,
        name: updated.name,
        reps: updated.reps,
        weight: updated.weight,
        unit: updated.unit,
        created: updated.created,
        hidden: updated.hidden,
        body_weight: updated.bodyWeight,
        duration: updated.duration,
        distance: updated.distance,
        cardio: updated.cardio,
        rest_ms: updated.restMs,
        incline: updated.incline ?? null,
        plan_id: updated.planId ?? null,
        notes: updated.notes ?? null,
        primary_muscle: updated.primaryMuscle ?? null,
        secondary_muscle: updated.secondaryMuscle ?? null,
        rpe: updated.rpe ?? null,
        rir: updated.rir ?? null,
      }, userId)
    }
  }
}

export async function deleteGymSet(id: number): Promise<void> {
  await db.gym_sets.delete(id)
  const userId = await getUserId()
  if (userId) {
    await push('gym_sets', 'delete', { id }, userId)
  }
}

// ─── Body measurements ────────────────────────────────────────────────────────

export async function addBodyMeasurement(m: Omit<BodyMeasurement, 'id'>): Promise<number> {
  const id = await db.body_measurements.add(m) as number
  const userId = await getUserId()
  if (userId) {
    await push('body_measurements', 'upsert', {
      id,
      created: m.created,
      body_weight: m.bodyWeight ?? null,
      fat_percentage: m.fatPercentage ?? null,
      arms: m.arms ?? null,
      chest: m.chest ?? null,
      thigh: m.thigh ?? null,
      calves: m.calves ?? null,
      waist: m.waist ?? null,
      notes: m.notes ?? null,
    }, userId)
  }
  return id
}

export async function updateBodyMeasurement(id: number, changes: Partial<BodyMeasurement>): Promise<void> {
  await db.body_measurements.update(id, changes)
  const userId = await getUserId()
  if (userId) {
    const m = await db.body_measurements.get(id)
    if (m) {
      await push('body_measurements', 'upsert', {
        id,
        created: m.created,
        body_weight: m.bodyWeight ?? null,
        fat_percentage: m.fatPercentage ?? null,
        arms: m.arms ?? null,
        chest: m.chest ?? null,
        thigh: m.thigh ?? null,
        calves: m.calves ?? null,
        waist: m.waist ?? null,
        notes: m.notes ?? null,
      }, userId)
    }
  }
}

export async function deleteBodyMeasurement(id: number): Promise<void> {
  await db.body_measurements.delete(id)
  const userId = await getUserId()
  if (userId) {
    await push('body_measurements', 'delete', { id }, userId)
  }
}

// ─── Daily nutrition ──────────────────────────────────────────────────────────

export async function putDailyNutrition(entry: DailyNutrition): Promise<void> {
  await db.daily_nutrition.put(entry)
  const userId = await getUserId()
  if (!userId) return

  const record = {
    user_id: userId,
    date: entry.date,
    calories: entry.calories ?? null,
    protein: entry.protein ?? null,
    carbs: entry.carbs ?? null,
    fats: entry.fats ?? null,
    water: entry.water ?? null,
    notes: entry.notes ?? null,
  }

  if (!navigator.onLine) {
    await enqueue('daily_nutrition', 'upsert', record as Record<string, unknown>)
    return
  }

  const { error } = await supabase
    .from('daily_nutrition')
    .upsert(record, { onConflict: 'user_id,date' })

  if (error) {
    console.warn('[writeSync] daily_nutrition upsert failed, queuing:', error.message)
    await enqueue('daily_nutrition', 'upsert', record as Record<string, unknown>)
  }
}

export async function deleteDailyNutrition(date: string): Promise<void> {
  await db.daily_nutrition.delete(date)
  const userId = await getUserId()
  if (!userId) return

  if (navigator.onLine) {
    await supabase
      .from('daily_nutrition')
      .delete()
      .eq('date', date)
      .eq('user_id', userId)
  } else {
    await enqueue('daily_nutrition', 'delete', { date, user_id: userId })
  }
}

// ─── Supplement logs ──────────────────────────────────────────────────────────

export async function addSupplementLog(log: Omit<SupplementLog, 'id'>): Promise<number> {
  const id = await db.supplement_logs.add(log) as number
  const userId = await getUserId()
  if (userId) {
    await push('supplement_logs', 'upsert', {
      id,
      date: log.date,
      name: log.name,
      taken: log.taken,
    }, userId)
  }
  return id
}

export async function updateSupplementLog(id: number, taken: boolean): Promise<void> {
  await db.supplement_logs.update(id, { taken })
  const userId = await getUserId()
  if (userId) {
    const log = await db.supplement_logs.get(id)
    if (log) {
      await push('supplement_logs', 'upsert', {
        id,
        date: log.date,
        name: log.name,
        taken,
      }, userId)
    }
  }
}
