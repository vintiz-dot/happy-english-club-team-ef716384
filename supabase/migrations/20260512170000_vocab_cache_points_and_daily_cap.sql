-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║ Vocabulary platform — DB cache, points routing, daily cap              ║
-- ╚════════════════════════════════════════════════════════════════════════╝
--
-- This migration backfills three pieces of infrastructure that the
-- vocabulary product depends on:
--
-- 1. `vocab_cache`         — community word definitions / enrichment payload.
--                            Already referenced by the word-enrichment and
--                            save-word edge functions, but no migration ever
--                            created it. Defining it here makes the schema
--                            reproducible on a fresh DB.
--
-- 2. `vocab_image_cache`   — per-search image bundle. Lets the image-search
--                            edge function answer repeat queries from Postgres
--                            instead of fanning out to Pixabay/Pexels/etc.
--
-- 3. Points routing        — adds a `vocabulary_quiz_points` bucket on
--                            `student_points` (mirroring `reading_theory_points`)
--                            and an `'vocabulary_quiz'` type on
--                            `point_transactions`. Save = +10, correct
--                            practice = +20, both flow through
--                            `point_transactions` so the existing aggregation
--                            trigger keeps `total_points` and the leaderboard
--                            in sync.
--
-- 4. Daily cap helper      — `count_vocab_saves_today(user_id)` SECURITY
--                            DEFINER RPC the save-word edge function calls
--                            before accepting a new save.
--
-- All changes are idempotent (IF NOT EXISTS / DO …).

-- ════════════════════════════════════════════════════════════════════════
-- 1. vocab_cache  — community-validated word enrichment payloads
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vocab_cache (
  word         TEXT PRIMARY KEY,
  root_word    TEXT,
  payload      JSONB NOT NULL,
  image_urls   JSONB,
  hit_count    INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vocab_cache_root_word
  ON public.vocab_cache(root_word)
  WHERE root_word IS NOT NULL;

ALTER TABLE public.vocab_cache ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated may read; only the service role writes (edge functions).
DROP POLICY IF EXISTS "vocab_cache_read_all" ON public.vocab_cache;
CREATE POLICY "vocab_cache_read_all"
  ON public.vocab_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.touch_vocab_cache()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vocab_cache_touch ON public.vocab_cache;
CREATE TRIGGER trg_vocab_cache_touch
  BEFORE UPDATE ON public.vocab_cache
  FOR EACH ROW EXECUTE FUNCTION public.touch_vocab_cache();

-- ════════════════════════════════════════════════════════════════════════
-- 2. vocab_image_cache — per-search image bundle
-- ════════════════════════════════════════════════════════════════════════
--
-- The key is the normalized (trim+lowercase) query string. `images` is the
-- final merged + de-duped list the image-search function returns to clients.
-- We keep `counts` (per-provider sizes) for cheap analytics and stamp
-- `expires_at` so callers can decide whether to re-run the providers.
CREATE TABLE IF NOT EXISTS public.vocab_image_cache (
  query        TEXT PRIMARY KEY,
  images       JSONB NOT NULL,
  counts       JSONB,
  hit_count    INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_vocab_image_cache_expires
  ON public.vocab_image_cache(expires_at);

ALTER TABLE public.vocab_image_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vocab_image_cache_read_all" ON public.vocab_image_cache;
CREATE POLICY "vocab_image_cache_read_all"
  ON public.vocab_image_cache FOR SELECT
  TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS trg_vocab_image_cache_touch ON public.vocab_image_cache;
CREATE TRIGGER trg_vocab_image_cache_touch
  BEFORE UPDATE ON public.vocab_image_cache
  FOR EACH ROW EXECUTE FUNCTION public.touch_vocab_cache();

-- ════════════════════════════════════════════════════════════════════════
-- 3. Points routing — vocabulary_quiz bucket
-- ════════════════════════════════════════════════════════════════════════

-- 3a. New column on student_points (mirrors reading_theory_points).
ALTER TABLE public.student_points
  ADD COLUMN IF NOT EXISTS vocabulary_quiz_points INTEGER NOT NULL DEFAULT 0;

-- Regenerate total_points so it includes the new bucket.
ALTER TABLE public.student_points DROP COLUMN IF EXISTS total_points;
ALTER TABLE public.student_points
  ADD COLUMN total_points INTEGER GENERATED ALWAYS AS
    (homework_points + participation_points + reading_theory_points + vocabulary_quiz_points) STORED;

-- 3b. Expand the allowed `type` set on point_transactions.
ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('homework', 'participation', 'adjustment', 'correction', 'reading_theory', 'vocabulary_quiz'));

-- 3c. Update the aggregation trigger so vocabulary_quiz transactions update
--     the new bucket. Keeps the existing buckets behaving identically.
CREATE OR REPLACE FUNCTION public.update_student_points_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
  v_homework_points INTEGER;
  v_participation_points INTEGER;
  v_reading_theory_points INTEGER;
  v_vocabulary_quiz_points INTEGER;
BEGIN
  v_month := to_char(NEW.date, 'YYYY-MM');

  SELECT
    COALESCE(SUM(CASE WHEN type = 'homework' THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('participation', 'adjustment', 'correction') THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'reading_theory' THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'vocabulary_quiz' THEN points ELSE 0 END), 0)
  INTO v_homework_points, v_participation_points, v_reading_theory_points, v_vocabulary_quiz_points
  FROM point_transactions
  WHERE student_id = NEW.student_id
    AND class_id = NEW.class_id
    AND to_char(date, 'YYYY-MM') = v_month;

  INSERT INTO student_points (
    student_id, class_id, month,
    homework_points, participation_points, reading_theory_points, vocabulary_quiz_points
  )
  VALUES (
    NEW.student_id, NEW.class_id, v_month,
    v_homework_points, v_participation_points, v_reading_theory_points, v_vocabulary_quiz_points
  )
  ON CONFLICT (student_id, class_id, month)
  DO UPDATE SET
    homework_points        = v_homework_points,
    participation_points   = v_participation_points,
    reading_theory_points  = v_reading_theory_points,
    vocabulary_quiz_points = v_vocabulary_quiz_points,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- 4. Daily-cap RPC — number of words saved today by a given user
-- ════════════════════════════════════════════════════════════════════════
--
-- Counts the 'save' rows in vocab_activity_log for the user since the start
-- of the current UTC day. The save-word edge function uses this to enforce
-- the 10-words-per-day cap. Edge writes /reads pass user_id explicitly, so
-- the function is SECURITY DEFINER (the service role token does not have a
-- session-scoped auth.uid()).
CREATE OR REPLACE FUNCTION public.count_vocab_saves_today(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM vocab_activity_log
  WHERE user_id = p_user_id
    AND activity_type = 'save'
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_vocab_saves_today(UUID)
  TO authenticated, service_role;
