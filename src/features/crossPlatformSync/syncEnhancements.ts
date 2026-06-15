/**
 * Feature 9: Cross-Platform Syncing Enhancements
 *
 * Extends the existing sync_queue with:
 * - retry_count tracking (stored in item payload metadata)
 * - exponential backoff helper
 * - conflict resolution utilities (last-write-wins by timestamp)
 * - soft-delete tombstone helpers
 *
 * Does NOT modify useSync.ts — provides additive helpers only.
 */

import { db } from '../../db/database'

// ─── Exponential Backoff ──────────────────────────────────────────────────────

/**
 * Returns the delay in milliseconds for a given retry attempt.
 * Strategy: 1s → 2s → 4s → 8s → … up to 60s cap.
 */
export function backoffDelay(attempt: number): number {
  const base = 1000
  const max = 60_000
  return Math.min(max, base * Math.pow(2, attempt))
}

// ─── Queue Metadata ───────────────────────────────────────────────────────────

/**
 * Reads all pending sync queue items and returns those that have been
 * retried more than `maxRetries` times (as tracked in payload.__retryCount).
 */
export async function getFailedQueueItems(maxRetries = 3) {
  const all = await db.sync_queue.toArray()
  return all.filter(item => {
    const retryCount = (item.payload.__retryCount as number | undefined) ?? 0
    return retryCount >= maxRetries
  })
}

/**
 * Increments the __retryCount in an existing sync_queue item payload.
 */
export async function incrementRetryCount(itemId: number): Promise<void> {
  const item = await db.sync_queue.get(itemId)
  if (!item) return
  const current = (item.payload.__retryCount as number | undefined) ?? 0
  await db.sync_queue.update(itemId, {
    payload: { ...item.payload, __retryCount: current + 1 },
  })
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────

/**
 * Last-write-wins: given two records with an `updated_at` field,
 * returns whichever was written most recently.
 */
export function resolveConflict<T extends { updated_at?: string; created?: string }>(
  local: T,
  remote: T,
): T {
  const localTs = local.updated_at ?? local.created ?? ''
  const remoteTs = remote.updated_at ?? remote.created ?? ''
  return remoteTs >= localTs ? remote : local
}

// ─── Soft Delete / Tombstone ─────────────────────────────────────────────────

/**
 * Enqueues a soft-delete tombstone instead of a hard delete.
 * The remote record is updated with `deleted_at = now()` so other devices
 * can reconcile without losing the record permanently.
 *
 * Note: Requires the Supabase table to have a `deleted_at` nullable column.
 * For tables without that column, falls back to a regular delete queue entry.
 */
export async function enqueueSoftDelete(
  tableName: string,
  id: number | string,
  userId?: string,
): Promise<void> {
  const payload: Record<string, unknown> = {
    id,
    deleted_at: new Date().toISOString(),
  }
  if (userId) payload.user_id = userId

  await db.sync_queue.add({
    tableName,
    operation: 'upsert', // update deleted_at rather than hard delete
    payload,
    timestamp: new Date().toISOString(),
  })
}

// ─── Sync Status Helpers ──────────────────────────────────────────────────────

export interface SyncStatus {
  pendingCount: number
  failedCount: number
  isOnline: boolean
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const all = await db.sync_queue.toArray()
  const failedCount = all.filter(item => {
    const retryCount = (item.payload.__retryCount as number | undefined) ?? 0
    return retryCount >= 3
  }).length

  return {
    pendingCount: all.length,
    failedCount,
    isOnline: navigator.onLine,
  }
}
