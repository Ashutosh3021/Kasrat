/**
 * Feature 11: Subjective Feedback Integration — Data Layer
 *
 * Stores and retrieves session-level energy/mood/soreness ratings in
 * a new IndexedDB table `session_feedback`. Synced to Supabase.
 *
 * Note: The `session_feedback` table is added via a new Dexie version
 * in the companion dbExtension.ts file.
 */

import Dexie from 'dexie'
import { supabase } from '../../supabase/client'
import { enqueue } from '../../hooks/useSync'

// ─── Type ─────────────────────────────────────────────────────────────────────

export interface SessionFeedback {
  id?: number
  sessionDate: string  // YYYY-MM-DD
  energy: number       // 1–10
  mood: number         // 1–10
  soreness: number     // 1–10
  notes: string
  createdAt: string    // ISO
}

export interface RecoveryScore {
  score: number        // 0–10
  label: 'low' | 'medium' | 'high'
}

// ─── Dexie Extension ──────────────────────────────────────────────────────────

/**
 * We extend the existing KasratDB using Dexie's open() method on the same
 * database name so we don't modify the original database.ts.
 */
class FeedbackDB extends Dexie {
  session_feedback!: Dexie.Table<SessionFeedback, number>

  constructor() {
    super('KasratDB')
    // Version 13 adds session_feedback table.
    // All previous versions' stores are re-declared to keep Dexie happy.
    this.version(13).stores({
      gym_sets: '++id, name, created, cardio, planId, sessionId',
      plans: '++id, sequence, title',
      plan_exercises: '++id, planId, exercise',
      settings: '++id',
      body_measurements: '++id, created',
      exercise_meta: '&name',
      daily_nutrition: '&date',
      exercise_presets: '&name',
      supplement_logs: '++id, [date+name], date',
      sync_queue: '++id, tableName, timestamp',
      streak_meta: '&id',
      day_status: '&date',
      // New
      session_feedback: '++id, sessionDate',
    })
  }
}

/** Shared singleton — opens the same underlying IndexedDB database */
const feedbackDB = new FeedbackDB()

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveFeedback(
  feedback: Omit<SessionFeedback, 'id' | 'createdAt'>,
  userId?: string,
): Promise<void> {
  const record: SessionFeedback = {
    ...feedback,
    createdAt: new Date().toISOString(),
  }

  // Upsert by date (replace existing entry for today)
  const existing = await feedbackDB.session_feedback
    .where('sessionDate')
    .equals(feedback.sessionDate)
    .first()

  if (existing?.id) {
    await feedbackDB.session_feedback.update(existing.id, record)
  } else {
    await feedbackDB.session_feedback.add(record)
  }

  // Sync to Supabase
  if (userId) {
    const payload = {
      session_date: feedback.sessionDate,
      energy: feedback.energy,
      mood: feedback.mood,
      soreness: feedback.soreness,
      notes: feedback.notes,
      user_id: userId,
      created_at: record.createdAt,
    }
    try {
      const { error } = await supabase.from('session_feedback').upsert(payload)
      if (error) await enqueue('session_feedback', 'upsert', payload)
    } catch {
      await enqueue('session_feedback', 'upsert', payload)
    }
  }
}

export async function getFeedbackForDate(date: string): Promise<SessionFeedback | undefined> {
  return feedbackDB.session_feedback.where('sessionDate').equals(date).first()
}

export async function getRecentFeedback(limit = 7): Promise<SessionFeedback[]> {
  return feedbackDB.session_feedback.orderBy('sessionDate').reverse().limit(limit).toArray()
}

// ─── Recovery Score ───────────────────────────────────────────────────────────

/**
 * Recovery Score = (energy + mood + (10 - soreness)) / 3
 * Range: 0–10
 */
export function computeRecoveryScore(feedback: SessionFeedback): RecoveryScore {
  const raw = (feedback.energy + feedback.mood + (10 - feedback.soreness)) / 3
  const score = Math.round(raw * 10) / 10
  const label = score < 4 ? 'low' : score < 7 ? 'medium' : 'high'
  return { score, label }
}

/**
 * Returns true if the user has had 3 consecutive sessions with low recovery,
 * suggesting a deload is needed.
 */
export async function shouldSuggestDeload(): Promise<boolean> {
  const recent = await getRecentFeedback(3)
  if (recent.length < 3) return false
  return recent.every(f => computeRecoveryScore(f).label === 'low')
}
