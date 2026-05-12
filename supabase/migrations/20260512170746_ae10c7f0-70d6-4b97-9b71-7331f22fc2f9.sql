-- 1. vocab_cache
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

DROP POLICY IF EXISTS "vocab_cache_read_all" ON public.vocab_cache;
CREATE POLICY "vocab_cache_read_all"
  ON public.vocab_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.touch_vocab_cache()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vocab_cache_touch ON public.vocab_cache;
CREATE TRIGGER trg_vocab_cache_touch
  BEFORE UPDATE ON public.vocab_cache
  FOR EACH ROW EXECUTE FUNCTION public.touch_vocab_cache();

-- 2. vocab_image_cache
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

-- 3. Points routing
ALTER TABLE public.student_points
  ADD COLUMN IF NOT EXISTS vocabulary_quiz_points INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.student_points DROP COLUMN IF EXISTS total_points;
ALTER TABLE public.student_points
  ADD COLUMN total_points INTEGER GENERATED ALWAYS AS
    (homework_points + participation_points + reading_theory_points + vocabulary_quiz_points) STORED;

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('homework', 'participation', 'adjustment', 'correction', 'reading_theory', 'vocabulary_quiz'));

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

-- 4. Daily-cap RPC
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
