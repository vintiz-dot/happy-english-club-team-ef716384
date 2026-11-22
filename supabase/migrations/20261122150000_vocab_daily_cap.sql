-- Vocabulary: the 10-new-words-a-day cap, held by the database (22 Nov 2026).
--
-- WHY. The cap lived only in save-word as "count, then save": the count read
-- vocab_activity_log, which the function wrote AFTER the save and without
-- waiting for it. So:
--   1. ten taps at once all counted 0..9 and all saved (no lock);
--   2. a log insert that failed or was cut off never counted;
--   3. the day was UTC, so it reset at 07:00 in Hanoi (10 before, 10 after);
--   4. the word bank itself was writable from the browser: vocab_insert_own
--      let a student INSERT rows past save-word (no cap, no checks), and
--      vocab_update_own_or_linked let them rename a saved word into another
--      and save the first one again, or rewrite the checked sentences;
--   5. the counter on the page called count_vocab_saves_today, which is
--      revoked from authenticated (20260712014511), so it always read 0.
--
-- WHAT THIS ADDS
--   vocab_daily_saves             one row per (account, Hanoi day, word) a new
--                                 save claimed. Kept when the word is deleted,
--                                 so delete-and-save-again does not free a slot.
--   vocab_claim_daily_save(...)   service role only. Locks the account, counts
--                                 the day's claims, claims one if under the
--                                 limit. The same word again the same day reuses
--                                 its claim. Returns {ok, saves_today, limit}.
--   vocab_release_daily_save(...) service role only: gives a claim back when the
--                                 save that took it then failed.
--   vocab_saves_today()           the caller's own count, for the page.
--   count_vocab_saves_today(uuid) kept (older save-word copies call it), now
--                                 reads the claims on the Hanoi day.
--   Two triggers on student_vocabulary_entries: a signed-in person (role
--   authenticated / anon) cannot INSERT a word, and on UPDATE may change only
--   their own notes and practice fields (image, Vietnamese meaning, mastery and
--   review dates). Words, levels, definitions and sentences are written by
--   save-word / ocr-vocab-scan (service role) and claim_vocab_for_student
--   (SECURITY DEFINER), which pass.
--
-- Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vocab_daily_saves (
  user_id    uuid NOT NULL,
  hanoi_day  date NOT NULL,
  word       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hanoi_day, word)
);

ALTER TABLE public.vocab_daily_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vocab_daily_saves_read_own" ON public.vocab_daily_saves;
CREATE POLICY "vocab_daily_saves_read_own" ON public.vocab_daily_saves
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.vocab_daily_saves FROM anon, authenticated;
GRANT SELECT ON public.vocab_daily_saves TO authenticated;
GRANT ALL ON public.vocab_daily_saves TO service_role;

CREATE OR REPLACE FUNCTION public.vocab_hanoi_today()
RETURNS date LANGUAGE sql STABLE SET search_path = public
AS $$ SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date $$;

CREATE OR REPLACE FUNCTION public.vocab_claim_daily_save(p_user_id uuid, p_word text, p_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day   date := public.vocab_hanoi_today();
  v_word  text := lower(btrim(coalesce(p_word, '')));
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR v_word = '' OR p_limit IS NULL OR p_limit < 1 THEN
    RAISE EXCEPTION 'vocab_claim_daily_save: user, word and a positive limit are required' USING ERRCODE = '22023';
  END IF;
  -- One account's saves are claimed one at a time: ten parallel taps queue here.
  PERFORM pg_advisory_xact_lock(hashtextextended('vocab_daily_saves:' || p_user_id::text, 0));

  SELECT count(*) INTO v_count FROM public.vocab_daily_saves WHERE user_id = p_user_id AND hanoi_day = v_day;
  IF EXISTS (SELECT 1 FROM public.vocab_daily_saves WHERE user_id = p_user_id AND hanoi_day = v_day AND word = v_word) THEN
    RETURN jsonb_build_object('ok', true, 'saves_today', v_count, 'limit', p_limit, 'reused', true);
  END IF;
  IF v_count >= p_limit THEN
    RETURN jsonb_build_object('ok', false, 'saves_today', v_count, 'limit', p_limit);
  END IF;
  INSERT INTO public.vocab_daily_saves(user_id, hanoi_day, word) VALUES (p_user_id, v_day, v_word);
  RETURN jsonb_build_object('ok', true, 'saves_today', v_count + 1, 'limit', p_limit, 'reused', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_release_daily_save(p_user_id uuid, p_word text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.vocab_daily_saves
   WHERE user_id = p_user_id AND hanoi_day = public.vocab_hanoi_today() AND word = lower(btrim(coalesce(p_word, '')))
     AND NOT EXISTS (SELECT 1 FROM public.student_vocabulary_entries e
                      WHERE e.user_id = p_user_id AND e.word = lower(btrim(coalesce(p_word, ''))));
$$;

CREATE OR REPLACE FUNCTION public.vocab_saves_today()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.vocab_daily_saves
   WHERE user_id = auth.uid() AND hanoi_day = public.vocab_hanoi_today();
$$;

CREATE OR REPLACE FUNCTION public.count_vocab_saves_today(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.vocab_daily_saves
   WHERE user_id = p_user_id AND hanoi_day = public.vocab_hanoi_today();
$$;

REVOKE ALL ON FUNCTION public.vocab_claim_daily_save(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_release_daily_save(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_vocab_saves_today(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_saves_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vocab_claim_daily_save(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.vocab_release_daily_save(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_vocab_saves_today(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.vocab_saves_today() TO authenticated;

-- Today's saves made before this migration count against today's cap.
INSERT INTO public.vocab_daily_saves(user_id, hanoi_day, word, created_at)
SELECT DISTINCT ON (l.user_id, l.word) l.user_id, public.vocab_hanoi_today(), lower(btrim(l.word)), l.created_at
  FROM public.vocab_activity_log l
 WHERE l.activity_type = 'save' AND l.user_id IS NOT NULL AND coalesce(btrim(l.word), '') <> ''
   AND (l.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = public.vocab_hanoi_today()
ON CONFLICT DO NOTHING;

-- ── The word bank: a signed-in person cannot add words or rewrite checked fields ──
CREATE OR REPLACE FUNCTION public.vocab_entry_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Words are added through Save word, which checks them (vocab_entry_write_guard)' USING ERRCODE = '42501';
  END IF;
  IF NEW.word IS DISTINCT FROM OLD.word
     OR NEW.root_word IS DISTINCT FROM OLD.root_word
     OR NEW.cefr IS DISTINCT FROM OLD.cefr
     OR NEW.definition_en IS DISTINCT FROM OLD.definition_en
     OR NEW.enrichment IS DISTINCT FROM OLD.enrichment
     OR NEW.user_examples IS DISTINCT FROM OLD.user_examples
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.class_id IS DISTINCT FROM OLD.class_id THEN
    RAISE EXCEPTION 'A saved word, its level, definition and sentences change only through Save word (vocab_entry_write_guard)' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vocab_entry_write_guard ON public.student_vocabulary_entries;
CREATE TRIGGER vocab_entry_write_guard
  BEFORE INSERT OR UPDATE ON public.student_vocabulary_entries
  FOR EACH ROW EXECUTE FUNCTION public.vocab_entry_write_guard();

REVOKE ALL ON FUNCTION public.vocab_entry_write_guard() FROM PUBLIC, anon, authenticated;

COMMIT;
