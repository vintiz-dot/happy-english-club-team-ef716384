-- Attendance streaks: one bonus per child per lesson, and Late counts.
-- docs/evidence/FIX-streaks-bank-uploads.md, item 1.
--
-- The streak rule itself lives in supabase/functions/_lib/attendance-effects.ts
-- (`streakRun`): the run of attended lessons of a child in a class, read from
-- the register, Present and Late count, Absent breaks it, Excused and
-- cancelled lessons are passed over. This migration carries the two pieces
-- of it the database has to hold. Neither is needed for the new functions to
-- work - they check before paying, and a sync Late simply waits for the next
-- Present - so it may be pasted before or after the redeploy.
--
-- 1. point_transactions_one_streak_bonus. The functions look for an existing
--    streak bonus for the child and lesson before paying one; this turns a
--    race between two of them (mark-attendance and the sync's drain on the
--    same lesson) into a refused second row (23505, which the code treats as
--    "already paid") instead of a double payment. It ADDS an index and
--    changes no existing constraint. PARTIAL on purpose, like
--    point_transactions_one_homework_award: it only concerns rows written by
--    the streak code (type 'participation', linked to a lesson, notes in the
--    streak wording), and nothing upserts against it (AGENTS.md, 42P10).
--    Before 16 Nov 2026 no streak bonus was ever written (`date` is NOT NULL
--    with no default and the code left it out), so no existing row can
--    collide; if one did, CREATE fails and nothing else here applies.
--
-- 2. stars_sync__queue_mark_effects queues a streak step for a Late mark as
--    well as a Present one, because Late now extends a streak. Same body as
--    20261028090000 otherwise; CREATE OR REPLACE keeps its owner and its
--    grants (revoked from PUBLIC, anon and authenticated there).
--
-- Re-runnable.

CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_one_streak_bonus
  ON public.point_transactions (student_id, session_id)
  WHERE type = 'participation'
    AND session_id IS NOT NULL
    AND notes LIKE 'Attendance streak bonus:%';

-- What a register mark owes, queued. Mirrors what mark-attendance runs
-- inline: tuition for Absent or Excused, a streak step for Present or
-- Late. A mark that stops being attended before its streak is drained
-- takes the streak back out (the drain reads the register anyway, so a
-- step for a lesson the child missed would pay nothing).
CREATE OR REPLACE FUNCTION public.stars_sync__queue_mark_effects(
  p_session uuid, p_class uuid, p_date date, p_student uuid, p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_key text := 'streak:' || p_session || ':' || p_student;
BEGIN
  IF p_status IN ('Present', 'Late') THEN
    INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, class_id, session_id, lesson_date)
    VALUES ('streak', v_streak_key, p_student, p_class, p_session, p_date)
    ON CONFLICT (dedupe_key) DO UPDATE SET generation = public.stars_sync_effects.generation + 1;
  ELSE
    DELETE FROM public.stars_sync_effects WHERE dedupe_key = v_streak_key;
  END IF;

  IF p_status IN ('Absent', 'Excused') THEN
    PERFORM public.stars_sync__queue_tuition(p_student, to_char(p_date, 'YYYY-MM'));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.stars_sync__queue_mark_effects(uuid, uuid, date, uuid, text) FROM PUBLIC, anon, authenticated;
