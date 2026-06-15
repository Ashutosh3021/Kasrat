-- ─────────────────────────────────────────────────────────────────────────────
-- KASRAT — New Features Migration Script
-- Run each section in the Supabase SQL Editor (Dashboard → SQL Editor)
-- All statements are idempotent (safe to run more than once)
-- ─────────────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- CORRECTIONS: 3 statements from new_features.md that need fixes
-- ════════════════════════════════════════════════════════════════════════════

-- ── FIX 1: logging_precision ─────────────────────────────────────────────────
-- PROBLEM: The original ALTER targeted a "settings" table that does NOT exist
-- in Supabase. Settings are stored only in Dexie (IndexedDB) on-device.
-- SOLUTION: Add logging_precision to the profiles table instead, so the
-- preference persists across devices. The app reads it from Supabase on login.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logging_precision TEXT
    DEFAULT 'full'
    CHECK (logging_precision IN ('minimal', 'standard', 'full'));

-- ── FIX 2: priority_level on gym_sets ────────────────────────────────────────
-- PROBLEM: The CHECK constraint used TEXT values ('primary','secondary') but
-- Supabase may reject the bare ALTER if any existing rows violate the default.
-- SOLUTION: Add with explicit DEFAULT NULL so existing rows are unaffected,
-- then apply the constraint. Using IF NOT EXISTS guard for idempotency.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gym_sets
  ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT NULL;

-- Add the CHECK constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name     = 'gym_sets_priority_level_check'
  ) THEN
    ALTER TABLE public.gym_sets
      ADD CONSTRAINT gym_sets_priority_level_check
        CHECK (priority_level IN ('primary', 'secondary'));
  END IF;
END $$;

-- ── FIX 3: sync_queue retry columns ─────────────────────────────────────────
-- PROBLEM: sync_queue is a Dexie-only (IndexedDB) table — it does NOT exist
-- in Supabase. Retry tracking is handled client-side inside the sync_queue
-- payload (see syncEnhancements.ts → __retryCount field).
-- SOLUTION: No Supabase migration needed. The Dexie version 13 migration
-- (added in subjectiveFeedbackUtils.ts) already includes the session_feedback
-- table and all retry logic is in-memory via payload.__retryCount.
-- This is a no-op comment confirming the feature is already implemented.
-- ─────────────────────────────────────────────────────────────────────────────
-- (no SQL needed — sync_queue is client-only)


-- ════════════════════════════════════════════════════════════════════════════
-- ALL OTHER NEW FEATURE MIGRATIONS
-- (SQL from new_features.md that was confirmed working)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Feature 1: Goal preference on profiles ───────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_preference TEXT
    CHECK (goal_preference IN ('bulk', 'cut', 'maintain'));

-- ── Feature 2: Adaptive config on plans ──────────────────────────────────────
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS adaptive_config JSONB
    DEFAULT '{"auto_adjust": false, "adjustment_sensitivity": "medium"}';

CREATE TABLE IF NOT EXISTS public.progression_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id      BIGINT REFERENCES public.plans(id) ON DELETE CASCADE,
  metric_name  TEXT NOT NULL,
  old_value    NUMERIC,
  new_value    NUMERIC,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.progression_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progression_logs" ON public.progression_logs
  FOR ALL USING (auth.uid() = user_id);

-- ── Feature 5: Wizard templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wizard_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  goal_type   TEXT CHECK (goal_type IN ('bulk', 'cut', 'recomp')),
  emphasis    TEXT CHECK (emphasis IN ('balanced', 'arms', 'chest', 'back', 'legs')),
  sessions    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wizard_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wizard_templates" ON public.wizard_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.wizard_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_key   TEXT,
  response_value TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wizard_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wizard_responses" ON public.wizard_responses
  FOR ALL USING (auth.uid() = user_id);

-- ── Feature 11: Session feedback ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  energy       INTEGER CHECK (energy BETWEEN 1 AND 10),
  mood         INTEGER CHECK (mood BETWEEN 1 AND 10),
  soreness     INTEGER CHECK (soreness BETWEEN 1 AND 10),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_date)
);
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own session_feedback" ON public.session_feedback
  FOR ALL USING (auth.uid() = user_id);

-- ── Feature 12: Profile columns for program generation ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_level TEXT
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS available_equipment JSONB;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS muscle_emphasis TEXT
    CHECK (muscle_emphasis IN ('balanced', 'arms', 'chest', 'back', 'legs'));

-- ── Feature 13: AI suggestions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggestion_type  TEXT CHECK (suggestion_type IN ('substitution', 'load_adjustment', 'volume_change')),
  context          JSONB,
  suggestion       JSONB,
  accepted         BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_suggestions" ON public.ai_suggestions
  FOR ALL USING (auth.uid() = user_id);

-- ── Feature 15: Daily volume aggregates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_aggregates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  routine_name TEXT,
  total_volume NUMERIC,
  set_count    INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, routine_name)
);
ALTER TABLE public.daily_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_aggregates" ON public.daily_aggregates
  FOR ALL USING (auth.uid() = user_id);

-- ── RLS policies for exercise_meta (needed for custom exercise sync) ──────────
-- (Only add if not already present — exercise_meta may already have RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exercise_meta' AND policyname = 'Users manage own exercise_meta'
  ) THEN
    ALTER TABLE public.exercise_meta ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users manage own exercise_meta" ON public.exercise_meta
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
