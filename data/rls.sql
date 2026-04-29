-- ─────────────────────────────────────────────────────────────────────────────
-- KASRAT – Row Level Security Policies
-- Run AFTER schema.sql in the Supabase SQL editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: delete own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ── plans ─────────────────────────────────────────────────────────────────────
CREATE POLICY "plans: select own"
  ON public.plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "plans: insert own"
  ON public.plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans: update own"
  ON public.plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans: delete own"
  ON public.plans FOR DELETE
  USING (auth.uid() = user_id);

-- ── plan_exercises ────────────────────────────────────────────────────────────
-- plan_exercises has no user_id column; ownership is derived through plans.
CREATE POLICY "plan_exercises: select own"
  ON public.plan_exercises FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.plans WHERE plans.id = plan_id
    )
  );

CREATE POLICY "plan_exercises: insert own"
  ON public.plan_exercises FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.plans WHERE plans.id = plan_id
    )
  );

CREATE POLICY "plan_exercises: update own"
  ON public.plan_exercises FOR UPDATE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.plans WHERE plans.id = plan_id
    )
  )
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.plans WHERE plans.id = plan_id
    )
  );

CREATE POLICY "plan_exercises: delete own"
  ON public.plan_exercises FOR DELETE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.plans WHERE plans.id = plan_id
    )
  );

-- ── custom_exercises ──────────────────────────────────────────────────────────
CREATE POLICY "custom_exercises: select own"
  ON public.custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "custom_exercises: insert own"
  ON public.custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_exercises: update own"
  ON public.custom_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_exercises: delete own"
  ON public.custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- ── gym_sets ──────────────────────────────────────────────────────────────────
CREATE POLICY "gym_sets: select own"
  ON public.gym_sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gym_sets: insert own"
  ON public.gym_sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_sets: update own"
  ON public.gym_sets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gym_sets: delete own"
  ON public.gym_sets FOR DELETE
  USING (auth.uid() = user_id);

-- ── body_measurements ─────────────────────────────────────────────────────────
CREATE POLICY "body_measurements: select own"
  ON public.body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "body_measurements: insert own"
  ON public.body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_measurements: update own"
  ON public.body_measurements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_measurements: delete own"
  ON public.body_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- ── daily_nutrition ───────────────────────────────────────────────────────────
CREATE POLICY "daily_nutrition: select own"
  ON public.daily_nutrition FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "daily_nutrition: insert own"
  ON public.daily_nutrition FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_nutrition: update own"
  ON public.daily_nutrition FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_nutrition: delete own"
  ON public.daily_nutrition FOR DELETE
  USING (auth.uid() = user_id);

-- ── supplement_logs ───────────────────────────────────────────────────────────
CREATE POLICY "supplement_logs: select own"
  ON public.supplement_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "supplement_logs: insert own"
  ON public.supplement_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "supplement_logs: update own"
  ON public.supplement_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "supplement_logs: delete own"
  ON public.supplement_logs FOR DELETE
  USING (auth.uid() = user_id);
