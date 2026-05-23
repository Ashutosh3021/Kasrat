-- Create exercise_meta table for per-user exercise notes/cues
CREATE TABLE IF NOT EXISTS public.exercise_meta (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  cues text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Enable RLS
ALTER TABLE public.exercise_meta ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own exercise_meta"
  ON public.exercise_meta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise_meta"
  ON public.exercise_meta FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise_meta"
  ON public.exercise_meta FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise_meta"
  ON public.exercise_meta FOR DELETE
  USING (auth.uid() = user_id);
