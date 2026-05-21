/**
 * src/supabase/sync.ts
 *
 * Re-exports from the canonical sync implementation in src/hooks/useSync.ts.
 * Kept for backwards compatibility with any existing imports.
 */

export {
  pullRemoteData,
  pullRemoteData as pullFromSupabase,
  processSyncQueue,
  processSyncQueue as processQueue,
  setupOnlineListener,
  enqueue,
} from '../hooks/useSync'

import { supabase } from './client'
import { processSyncQueue, pullRemoteData } from '../hooks/useSync'

/** Legacy: syncToSupabase = processQueue + pull */
export async function syncToSupabase(userId: string): Promise<void> {
  if (!navigator.onLine) return

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token || session.user.id !== userId) {
    console.warn('[sync] syncToSupabase: no valid session, skipping')
    return
  }

  await processSyncQueue(userId)
  await pullRemoteData(userId)
}

import { db } from '../db/database'

/** Clear all user-generated local data on logout */
export async function clearLocalUserData(): Promise<void> {
  await db.gym_sets.clear()
  await db.plans.clear()
  await db.plan_exercises.clear()
  await db.body_measurements.clear()
  await db.daily_nutrition.clear()
  await db.supplement_logs.clear()
  await db.exercise_meta.clear()
  await db.sync_queue.clear()
}
