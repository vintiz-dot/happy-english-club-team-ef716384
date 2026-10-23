-- Homework grading: four faults in one path, and one place to award from.
--
-- Found while specifying the Stars sync, which needs to assign and grade
-- homework as a teacher. All four are live.
--
-- 1. RE-GRADING PAYS TWICE. HomeworkGrading, HomeworkGradingList and
--    GradeOfflineDialog each end with a blind
--    `point_transactions.insert(... type: 'homework' ...)`. Nothing is
--    unique, nothing is checked. Correct a grade from 6 to 8 and the
--    child keeps the 6 and gains the 8. Three copies of the same code,
--    so the mistake is in triplicate.
--
-- 2. DELETING A POINT ENTRY DOES NOT GIVE THE POINTS BACK. The rollup
--    trigger is AFTER INSERT OR UPDATE - there is no DELETE branch. So
--    PointHistoryDialog deletes the row, reports "The leaderboard has
--    been updated", and student_points keeps the points for ever. That
--    rollup feeds the class leaderboard, both dashboards and the chat
--    function. reset-points deletes rows too.
--
--    The same gap is in UPDATE: moving a transaction to another month,
--    class or student recomputes only where it landed, and leaves the
--    bucket it came from overstated.
--
-- 3. THE EARLY BIRD BONUS HAS NEVER BEEN AWARDED. All three call sites
--    insert `reason: "..."`, and point_transactions has no `reason`
--    column - it is `notes`. The insert is rejected, the error is not
--    checked, an early_submission_rewards row is written with a null
--    point_transaction_id, and the student is shown
--    "Early Bird Bonus! +5 XP". They got nothing.
--
-- 4. `early_submission` IS NOT AN ALLOWED TYPE. The check constraint
--    lists six and that is not one, so even with `notes` fixed the
--    insert would fail. Added here, and counted into participation.
--
-- WHAT THIS MIGRATION DOES NOT DECIDE. If early_submission rows already
-- exist - possible, if the constraint was widened by hand - they have
-- been invisible to student_points until now, and the rebuild at the end
-- will credit them. The notice below says how many, before anything
-- moves. If that number is not zero, read it before continuing.

BEGIN;

-- ---------------------------------------------------------------- 0
-- What is in there now, said out loud before anything changes.

DO $$
DECLARE
  v_early      bigint;
  v_early_kids bigint;
  v_dupes      bigint;
  v_dupe_kids  bigint;
BEGIN
  SELECT count(*), count(DISTINCT student_id) INTO v_early, v_early_kids
  FROM public.point_transactions WHERE type = 'early_submission';

  SELECT COALESCE(sum(n - 1), 0), count(*) INTO v_dupes, v_dupe_kids
  FROM (
    SELECT count(*) AS n
    FROM public.point_transactions
    WHERE type = 'homework' AND homework_id IS NOT NULL
    GROUP BY student_id, homework_id
    HAVING count(*) > 1
  ) d;

  RAISE NOTICE 'early_submission rows: % across % student(s) - these start counting toward participation now', v_early, v_early_kids;
  RAISE NOTICE 'duplicate homework awards: % extra row(s) across % student/homework pair(s) - the newest is kept', v_dupes, v_dupe_kids;
END $$;

-- ---------------------------------------------------------------- 1
-- `early_submission` becomes a real type.

ALTER TABLE public.point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;
ALTER TABLE public.point_transactions
  ADD CONSTRAINT point_transactions_type_check
  CHECK (type IN ('homework', 'participation', 'adjustment', 'correction',
                  'reading_theory', 'vocabulary_quiz', 'early_submission'));

-- ---------------------------------------------------------------- 2
-- The rollup, for every way a row can move.
--
-- Recomputes the bucket a row left as well as the one it arrived in.
-- Deleting the last transaction of a month leaves the row at zero rather
-- than removing it: reading_theory_points and vocabulary_quiz_points are
-- written by other paths and are not this function's to discard.

CREATE OR REPLACE FUNCTION public.recompute_student_points(
  p_student uuid, p_class uuid, p_month text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_homework   integer;
  v_participation integer;
  v_reading    integer;
  v_vocab      integer;
BEGIN
  IF p_student IS NULL OR p_class IS NULL OR p_month IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'homework' THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type IN ('participation', 'adjustment', 'correction',
                                    'early_submission') THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'reading_theory' THEN points ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'vocabulary_quiz' THEN points ELSE 0 END), 0)
  INTO v_homework, v_participation, v_reading, v_vocab
  FROM public.point_transactions
  WHERE student_id = p_student
    AND class_id = p_class
    AND to_char(date, 'YYYY-MM') = p_month;

  INSERT INTO public.student_points (
    student_id, class_id, month,
    homework_points, participation_points, reading_theory_points, vocabulary_quiz_points)
  VALUES (p_student, p_class, p_month, v_homework, v_participation, v_reading, v_vocab)
  ON CONFLICT (student_id, class_id, month) DO UPDATE SET
    homework_points        = EXCLUDED.homework_points,
    participation_points   = EXCLUDED.participation_points,
    reading_theory_points  = EXCLUDED.reading_theory_points,
    vocabulary_quiz_points = EXCLUDED.vocabulary_quiz_points,
    updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.update_student_points_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Where it was. Skipped on INSERT, and on an UPDATE that did not move it.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recompute_student_points(
      OLD.student_id, OLD.class_id, to_char(OLD.date, 'YYYY-MM'));
  END IF;

  -- Where it is now.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recompute_student_points(
      NEW.student_id, NEW.class_id, to_char(NEW.date, 'YYYY-MM'));
  END IF;

  RETURN NULL;  -- AFTER trigger; the return value is discarded.
END $$;

DROP TRIGGER IF EXISTS trigger_update_points_from_transaction ON public.point_transactions;
CREATE TRIGGER trigger_update_points_from_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.point_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_student_points_from_transaction();

-- ---------------------------------------------------------------- 3
-- One homework award per child per homework.
--
-- Collapse what is already there first, keeping the most recent: a
-- re-grade was the teacher correcting themselves, so the last one is the
-- one they meant.

DELETE FROM public.point_transactions p
WHERE p.type = 'homework'
  AND p.homework_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.point_transactions q
    WHERE q.type = 'homework'
      AND q.homework_id = p.homework_id
      AND q.student_id = p.student_id
      AND (q.created_at, q.id) > (p.created_at, p.id)
  );

-- PARTIAL on purpose, and so NOT usable as an ON CONFLICT target - see
-- AGENTS.md on 42P10. Awarding goes through award_homework_points below,
-- which does not need one. The index is here for integrity and to turn a
-- race between two graders into an error rather than a double payment.
CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_one_homework_award
  ON public.point_transactions (student_id, homework_id)
  WHERE type = 'homework' AND homework_id IS NOT NULL;

-- ---------------------------------------------------------------- 4
-- The only way homework points should be awarded.
--
-- SECURITY INVOKER deliberately. The caller's row policies apply exactly
-- as they would to a direct insert, so a teacher may award for their own
-- classes and nobody else's, and this cannot become a way around that.
-- It is also what lets the Stars sync call it while acting as a teacher.

CREATE OR REPLACE FUNCTION public.award_homework_points(
  p_student  uuid,
  p_homework uuid,
  p_points   integer,
  p_grade    text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_class uuid;
  v_title text;
  v_due   date;
  v_date  date;
  v_id    uuid;
BEGIN
  IF p_student IS NULL OR p_homework IS NULL THEN
    RAISE EXCEPTION 'award_homework_points needs a student and a homework';
  END IF;

  SELECT class_id, title, due_date INTO v_class, v_title, v_due
  FROM public.homeworks WHERE id = p_homework;
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'homework % does not exist', p_homework;
  END IF;

  -- Attributed to the due date, not to when it was marked: a homework
  -- set in March and marked in April belongs to March's leaderboard.
  v_date := COALESCE(v_due, CURRENT_DATE);

  UPDATE public.point_transactions
     SET points = p_points,
         notes = COALESCE('Homework graded: ' || p_grade, 'Homework graded'),
         homework_title = v_title,
         class_id = v_class,
         date = v_date,
         month = to_char(v_date, 'YYYY-MM')
   WHERE type = 'homework' AND homework_id = p_homework AND student_id = p_student
   RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.point_transactions
    (student_id, class_id, homework_id, homework_title, points, type, date, month, notes)
  VALUES
    (p_student, v_class, p_homework, v_title, p_points, 'homework', v_date,
     to_char(v_date, 'YYYY-MM'),
     COALESCE('Homework graded: ' || p_grade, 'Homework graded'))
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  -- Two graders at once. The index held; take the row the other one won.
  WHEN unique_violation THEN
    UPDATE public.point_transactions
       SET points = p_points,
           notes = COALESCE('Homework graded: ' || p_grade, 'Homework graded')
     WHERE type = 'homework' AND homework_id = p_homework AND student_id = p_student
     RETURNING id INTO v_id;
    RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.award_homework_points(uuid, uuid, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.award_homework_points(uuid, uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_homework_points(uuid, uuid, integer, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.recompute_student_points(uuid, uuid, text) TO service_role;

-- ---------------------------------------------------------------- 5
-- Teachers may grade. Written down here because it was not written down
-- anywhere.
--
-- homework_submissions carries three student policies and no teacher or
-- admin policy anywhere in this tree, yet GradeOfflineDialog and
-- HomeworkGrading write it from a teacher's browser - so a policy was
-- applied by hand and is not in the repository. Declaring it here makes
-- the tree the truth, and is what lets the Stars sync write a grade
-- while acting as a teacher. Idempotent: if an equivalent policy exists
-- it is replaced by this one.

ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hw_sub_teacher_all ON public.homework_submissions;
CREATE POLICY hw_sub_teacher_all ON public.homework_submissions
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.homeworks h
          WHERE h.id = homework_submissions.homework_id
            AND public.is_teacher_of_class(auth.uid(), h.class_id))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.homeworks h
          WHERE h.id = homework_submissions.homework_id
            AND public.is_teacher_of_class(auth.uid(), h.class_id))
);

DROP POLICY IF EXISTS hw_sub_admin_all ON public.homework_submissions;
CREATE POLICY hw_sub_admin_all ON public.homework_submissions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
GRANT ALL ON public.homework_submissions TO service_role;

-- ---------------------------------------------------------------- 6
-- Rebuild every month the above could have moved.
--
-- The UNION is the whole point. Walking point_transactions alone misses
-- exactly the rows this migration exists to repair: where every
-- transaction for a month was deleted, there is nothing left to iterate
-- and the overstated student_points row sits there untouched. Those are
-- the children whose leaderboard total has been wrong the longest.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT student_id, class_id, to_char(date, 'YYYY-MM') AS m
      FROM public.point_transactions
    UNION
    SELECT student_id, class_id, month FROM public.student_points
  LOOP
    PERFORM public.recompute_student_points(r.student_id, r.class_id, r.m);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
