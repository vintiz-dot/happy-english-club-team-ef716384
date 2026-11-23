-- Un-cancelling a lesson puts the register marks back as they were.
--
--   SELECT public.admin_restore_uncancelled_marks();           -- dry run (the default): writes nothing
--   SELECT public.admin_restore_uncancelled_marks(false);      -- does it
--   SELECT public.admin_restore_uncancelled_marks(false,
--     '[{"student_id":"<child id>","month":"2026-09"}]');       -- also puts back the months you decided on
--
-- WHAT WENT WRONG. Cancelling a lesson sets every child's mark to Excused
-- (set_attendance_excused_on_cancel, 20261027090000). Un-cancelling brings the
-- lesson back (as Scheduled, 20261112091000) but left the marks Excused. Tuition
-- bills a lesson only for Present, Absent or Late, so nobody was billed for a
-- lesson that was taught, and the teacher is paid for it. Production, 23 Nov
-- 2026: 3 lessons of September 2026 cancelled on 9 Oct and later un-cancelled
-- still carry 23 Excused marks (22 made by a teacher), and one April lesson has 5.
--
-- WHAT THIS FILE DOES.
--  A. From now on. Cancelling a lesson first writes down every mark as it stands
--     (attendance_cancel_snapshots). Un-cancelling, by any route, puts each mark
--     back from that note and then deletes the note.
--     A lesson cancelled BEFORE this file has no note. For it, an Excused mark
--     that nobody made (marked_by empty) goes back to Present when the child was
--     enrolled that day (the register seeder's own rule), and a mark a person made
--     is left alone. An un-cancel is never blocked by any of this: if a mark cannot
--     be put back it stays as it is and the database logs a WARNING.
--  B. The past. admin_restore_uncancelled_marks() finds the marks that are still
--     Excused on lessons that were un-cancelled, and per child and month puts them
--     back as Present only when the register then prices the month at exactly the
--     bill that was saved. Otherwise it reports and writes nothing. SQL editor
--     (the owner) only. Same method as admin_restore_transfer_deleted_marks.
--
-- THE TRIGGERS. The cancel trigger and the new un-cancel trigger are AFTER UPDATE
-- on sessions. The new one fires only on a lesson leaving Canceled, so it cannot
-- fire itself or the cancel trigger (they write attendance, never sessions).
--
-- WHAT THE TRIGGERS ON attendance DO WITH OUR UPDATE (read, not guessed):
--   guard_cancelled_session_attendance  only Excused on a Canceled lesson. The
--                                       lesson has left Canceled when we write, so
--                                       it lets the new status in.
--   guard_attendance_enrollment         a mark outside the child's enrolment can
--                                       only be Excused. A seeded mark is kept as it
--                                       is (silently); a mark a person made raises.
--                                       We only write for children enrolled that day,
--                                       and a raise is caught per mark (WARNING).
--   zz_attendance_evidence_guard (D4)   UPDATE: the new status is never lower than
--                                       the old one (Excused is the floor), so nothing
--                                       is kept as evidence; marked_by is not changed.
--                                       At depth 2 (our trigger) it skips the person
--                                       rule; from the SQL editor (owner lane) the
--                                       person rule only applies to a marked_by cleared.
--   zz_attendance_money_guard (D4)      returns at once when pg_trigger_depth() > 1,
--                                       which is our un-cancel trigger. From the SQL
--                                       editor (admin function) it is the owner lane:
--                                       the write passes and, when the month's bill is
--                                       above tier 0, one 'owner_lane' line goes to
--                                       money_change_events per mark. A record, not a
--                                       refusal. Not run in the test (the D4 files are
--                                       too large for the in-process test database).
--   zz_attendance_proof_guard           (20261123100000) only looks at writes that set
--                                       Absent or Excused. Putting back a teacher's
--                                       Absent in our trigger is depth 2: a child with
--                                       proof of being there is skipped and logged, the
--                                       mark stays Excused, and the proof job later
--                                       makes it Present. Present is never guarded.
--   update_attendance_updated_at        UPDATE: sets updated_at. This is why the admin
--                                       function tells "changed by the cancel" from
--                                       "changed by a person afterwards" by updated_at.
--   audit_attendance                    AFTER: writes its audit row.
--
-- SAFE BY DESIGN (the admin function). The dry run does every write, reads the
-- result, and rolls all of it back. A real run is all or nothing and a second run
-- restores nothing. It changes the status and the notes of a mark only; it never
-- touches a bill (a bill is saved only by calculate-tuition) and it writes one
-- audit_log row (action 'restore_uncancelled_marks') in a real run, none in a dry
-- run. EXECUTE is revoked from everyone but the database owner.
--
-- Safe to run twice. Paste after 20261123090000 (tuition_bill_expected).

DO $pre$
BEGIN
  IF to_regprocedure('public.tuition_bill_expected(text)') IS NULL THEN
    RAISE EXCEPTION 'Un-cancel restore: public.tuition_bill_expected(text) (20261123090000) is missing. Paste that file first. Nothing was changed.';
  END IF;
  IF to_regclass('public.audit_log') IS NULL OR to_regclass('public.attendance') IS NULL
     OR to_regclass('public.sessions') IS NULL OR to_regclass('public.students') IS NULL
     OR to_regclass('public.enrollments') IS NULL THEN
    RAISE EXCEPTION 'Un-cancel restore: audit_log, attendance, sessions, students or enrollments is missing. Nothing was changed.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'canceled_at') THEN
    RAISE EXCEPTION 'Un-cancel restore: sessions.canceled_at is missing. Nothing was changed.';
  END IF;
  IF to_regprocedure('public.set_attendance_excused_on_cancel()') IS NULL THEN
    RAISE EXCEPTION 'Un-cancel restore: set_attendance_excused_on_cancel() (20261027090000) is missing. Paste that file first. Nothing was changed.';
  END IF;
END
$pre$;

-- ----------------------------------------------------------- A1. the note
CREATE TABLE IF NOT EXISTS public.attendance_cancel_snapshots (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status     text NOT NULL,
  taken_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, student_id)
);
COMMENT ON TABLE public.attendance_cancel_snapshots IS
  'Every child''s mark as it stood when the lesson was cancelled. Used to put the marks back when the lesson is un-cancelled, then deleted. A row left here means a mark could not be put back.';

ALTER TABLE public.attendance_cancel_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read cancel snapshots" ON public.attendance_cancel_snapshots;
CREATE POLICY "Admins read cancel snapshots" ON public.attendance_cancel_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- 20260712023825 revoked the defaults on public: say what is allowed.
REVOKE ALL ON public.attendance_cancel_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.attendance_cancel_snapshots TO authenticated;
GRANT ALL ON public.attendance_cancel_snapshots TO service_role;

-- ------------------------------------------- A2. cancelling writes the note
-- The live body (20261027090000), with the note written first. The note must
-- never stop a cancellation, so a failure in it is a WARNING and the cancel goes on.
CREATE OR REPLACE FUNCTION public.set_attendance_excused_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.attendance_cancel_snapshots (session_id, student_id, status, taken_at)
    SELECT a.session_id, a.student_id, a.status::text, now()
      FROM public.attendance a
     WHERE a.session_id = NEW.id
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET status = EXCLUDED.status, taken_at = EXCLUDED.taken_at;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not write down the marks of lesson % before cancelling it (%). They will not be put back automatically.', NEW.id, SQLERRM;
  END;

  UPDATE public.attendance
     SET status = 'Excused'
   WHERE session_id = NEW.id
     AND status IS DISTINCT FROM 'Excused';
  RETURN NULL;  -- AFTER trigger; the return value is discarded.
END $function$;
REVOKE ALL ON FUNCTION public.set_attendance_excused_on_cancel() FROM PUBLIC, anon, authenticated;
-- The trigger trg_cancel_session_excused is NOT touched: same firing condition.

-- --------------------------------------- A3. un-cancelling puts the marks back
CREATE OR REPLACE FUNCTION public.restore_attendance_on_uncancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_target text;
  v_failed integer := 0;
BEGIN
  BEGIN
    FOR r IN
      SELECT a.id, a.student_id, a.marked_by, sn.status AS snap_status,
             EXISTS (
               SELECT 1 FROM public.enrollments e
                WHERE e.student_id = a.student_id AND e.class_id = NEW.class_id
                  AND e.start_date <= NEW.date AND (e.end_date IS NULL OR e.end_date >= NEW.date)
                  -- As billing reads it: NULL = every day; an empty list = no day.
                  AND (e.allowed_days IS NULL OR extract(dow FROM NEW.date)::integer = ANY (e.allowed_days))
             ) AS enrolled
        FROM public.attendance a
        LEFT JOIN public.attendance_cancel_snapshots sn
               ON sn.session_id = a.session_id AND sn.student_id = a.student_id
       WHERE a.session_id = NEW.id AND a.status = 'Excused'
    LOOP
      v_target := CASE
        WHEN r.snap_status IS NOT NULL THEN r.snap_status          -- as it was before the cancel
        WHEN r.marked_by IS NULL AND r.enrolled THEN 'Present'     -- cancelled before the notes existed: a placeholder
        ELSE NULL                                                  -- a person's mark with no note: leave it
      END;
      IF v_target IS NULL OR v_target = 'Excused' THEN CONTINUE; END IF;
      BEGIN
        UPDATE public.attendance SET status = v_target WHERE id = r.id AND status = 'Excused';
      EXCEPTION WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE WARNING 'Could not put back the mark of child % on lesson % (%). It stays Excused.', r.student_id, NEW.id, SQLERRM;
      END;
    END LOOP;

    -- Keep the notes when anything could not be put back, so it can be looked at.
    IF v_failed = 0 THEN
      DELETE FROM public.attendance_cancel_snapshots WHERE session_id = NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not put back the marks of lesson % (%). The lesson was un-cancelled; its marks were left as they are.', NEW.id, SQLERRM;
  END;
  RETURN NULL;  -- AFTER trigger
END $function$;
REVOKE ALL ON FUNCTION public.restore_attendance_on_uncancel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_uncancel_session_restore_marks ON public.sessions;
CREATE TRIGGER trg_uncancel_session_restore_marks
AFTER UPDATE ON public.sessions
FOR EACH ROW
WHEN (OLD.status = 'Canceled' AND NEW.status IS DISTINCT FROM 'Canceled')
EXECUTE FUNCTION public.restore_attendance_on_uncancel();

-- ------------------------------------------------------ B. the past: helper
DROP FUNCTION IF EXISTS public.admin_restore_uncancelled_marks(boolean, jsonb);
DROP FUNCTION IF EXISTS public._uncancelled_marks_candidates();

-- Internal. Every Excused mark on a past lesson that was cancelled and has left
-- Canceled, for a child enrolled that day, sorted by what put it there:
--   candidate              the cancel changed it (updated_at within a minute of the
--                          cancel), or nobody ever made or touched it (a seeded row).
--   remarked_since         a person changed it after the cancel (updated_at later).
--   excused_before_cancel  it was already Excused and a person made it so before the
--                          cancel (the cancel did not touch it): not ours to change.
CREATE OR REPLACE FUNCTION public._uncancelled_marks_candidates()
RETURNS TABLE (attendance_id uuid, student_id uuid, session_id uuid, class_id uuid, lesson_date date,
               month text, session_status text, canceled_at timestamptz, marked_by uuid, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT a.id, a.student_id, s.id, s.class_id, s.date, to_char(s.date, 'YYYY-MM'), s.status::text, s.canceled_at, a.marked_by,
         CASE
           WHEN a.updated_at BETWEEN s.canceled_at - interval '1 minute' AND s.canceled_at + interval '1 minute' THEN 'candidate'
           WHEN a.marked_by IS NULL AND a.updated_at <= coalesce(a.created_at, a.updated_at) + interval '1 second' THEN 'candidate'
           WHEN a.updated_at > s.canceled_at + interval '1 minute' THEN 'remarked_since'
           ELSE 'excused_before_cancel'
         END
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a.session_id
   WHERE a.status = 'Excused'
     AND s.canceled_at IS NOT NULL
     AND s.status::text <> 'Canceled'
     AND s.date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     AND EXISTS (
       SELECT 1 FROM public.enrollments e
        WHERE e.student_id = a.student_id AND e.class_id = s.class_id
          AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date)
          -- As billing reads it: NULL = every day; an empty list = no day.
          AND (e.allowed_days IS NULL OR extract(dow FROM s.date)::integer = ANY (e.allowed_days)))
$fn$;
REVOKE ALL ON FUNCTION public._uncancelled_marks_candidates() FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------- B. the past: the restore
CREATE OR REPLACE FUNCTION public.admin_restore_uncancelled_marks(
  p_dry_run boolean DEFAULT true,
  p_force jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_candidates integer;
  v_lessons integer;
  v_remarked integer;
  v_before integer;
  v_restored integer := 0;
  v_cm_restored integer := 0;
  v_cm_decide integer := 0;
  r record;
  inv record;
  v_rows jsonb := '[]'::jsonb;
  v_not_held jsonb := '[]'::jsonb;
  v_force_ignored jsonb := '[]'::jsonb;
  v_steps jsonb := '[]'::jsonb;
  v_result jsonb;
  v_ids uuid[];
  v_reg bigint;
  v_err text;
  v_forced boolean;
  v_match boolean;
  v_verdict text;
  v_reason text;
  v_saved bigint;
  v_paid bigint;
  v_n integer;
  f jsonb;
  v_months_done text[] := ARRAY[]::text[];
  v_months_open text[] := ARRAY[]::text[];
BEGIN
  IF v_uid IS NOT NULL AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Only the owner or an admin can restore these marks.' USING ERRCODE = '42501';
  END IF;
  IF p_dry_run IS NULL THEN
    RAISE EXCEPTION 'Say true (dry run) or false (do it).' USING ERRCODE = '22023';
  END IF;
  IF p_force IS NULL OR jsonb_typeof(p_force) <> 'array' THEN
    RAISE EXCEPTION 'The second argument must be a list like [{"student_id":"...","month":"2026-09"}].' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) FILTER (WHERE kind = 'candidate'),
         count(DISTINCT session_id) FILTER (WHERE kind = 'candidate'),
         count(*) FILTER (WHERE kind = 'remarked_since'),
         count(*) FILTER (WHERE kind = 'excused_before_cancel')
    INTO v_candidates, v_lessons, v_remarked, v_before
    FROM public._uncancelled_marks_candidates();

  BEGIN
    FOR r IN
      SELECT c.student_id, c.month, st.full_name::text AS student_name,
             string_agg(DISTINCT cl.name::text, ', ' ORDER BY cl.name::text) AS class_name,
             bool_or(c.is_forced) AS forced,
             array_agg(c.attendance_id) FILTER (WHERE c.session_status = 'Held' OR c.is_forced) AS ids
        FROM (
          SELECT k.*, EXISTS (SELECT 1 FROM jsonb_array_elements(p_force) e
                               WHERE e ->> 'student_id' = k.student_id::text AND e ->> 'month' = k.month) AS is_forced
            FROM public._uncancelled_marks_candidates() k
           WHERE k.kind = 'candidate'
        ) c
        JOIN public.students st ON st.id = c.student_id
        LEFT JOIN public.classes cl ON cl.id = c.class_id
       GROUP BY c.student_id, c.month, st.full_name
       ORDER BY st.full_name, c.month, c.student_id
    LOOP
      v_ids := r.ids;
      IF v_ids IS NULL THEN CONTINUE; END IF;   -- only lessons not yet Held: reported below
      v_forced := r.forced;

      SELECT i.base_amount::bigint AS base, i.recorded_payment::bigint AS paid,
             coalesce(i.tuition_frozen, false) AS frozen, i.confirmation_status::text AS conf
        INTO inv
        FROM public.invoices i WHERE i.student_id = r.student_id AND i.month = r.month;
      v_saved := CASE WHEN FOUND THEN coalesce(inv.base, 0) END;
      v_paid := coalesce(inv.paid, 0);

      -- Trial: put every mark of this child-month back as Present, price the month, undo it.
      v_reg := NULL; v_err := NULL;
      BEGIN
        UPDATE public.attendance SET status = 'Present' WHERE id = ANY (v_ids) AND status = 'Excused';
        SELECT coalesce((SELECT x.expected_base FROM public.tuition_bill_expected(r.month) x WHERE x.student_id = r.student_id), 0)
          INTO v_reg;
        RAISE EXCEPTION 'trial over' USING ERRCODE = 'HCR00';
      EXCEPTION
        WHEN SQLSTATE 'HCR00' THEN NULL;
        WHEN OTHERS THEN v_err := SQLERRM;
      END;

      v_match := v_saved IS NOT NULL AND v_err IS NULL AND v_reg = v_saved;
      IF v_match THEN
        v_verdict := 'restore';
        v_reason := 'The bill that was saved counts exactly these lessons.';
      ELSIF v_forced AND v_err IS NULL THEN
        v_verdict := 'restore';
        v_reason := 'Restored in full because you chose this child and month.';
      ELSE
        v_verdict := 'decide';
        v_reason := CASE
          WHEN v_err IS NOT NULL THEN 'A register rule refused the marks (' || v_err || '). Nothing was written.'
          WHEN v_saved IS NULL THEN 'There is no bill for this month. With every lesson put back as Present the register would price it at '
               || to_char(v_reg, 'FM999,999,999,999') || '.'
          WHEN v_saved = 0 THEN 'The saved bill is 0; ' || to_char(v_paid, 'FM999,999,999,999') || ' was paid for this month. Putting every lesson back as Present gives '
               || to_char(v_reg, 'FM999,999,999,999') || '.'
          WHEN v_reg > v_saved THEN 'The saved bill is ' || to_char(v_saved, 'FM999,999,999,999') || ' but putting every lesson back as Present gives '
               || to_char(v_reg, 'FM999,999,999,999') || ': some of these lessons may really have been Excused or Absent.'
          ELSE 'The saved bill is ' || to_char(v_saved, 'FM999,999,999,999') || ' but putting every lesson back as Present gives only '
               || to_char(v_reg, 'FM999,999,999,999') || ': the bill was changed after it was saved.'
        END || CASE WHEN coalesce(inv.frozen, false) THEN ' The bill is frozen.' ELSE '' END;
      END IF;

      IF v_verdict = 'restore' THEN
        UPDATE public.attendance a
           SET status = 'Present',
               notes = CASE WHEN a.notes IS NULL OR a.notes = '' THEN '' ELSE a.notes || E'\n' END
                       || 'Restored ' || to_char(v_today, 'YYYY-MM-DD') || ': set to Excused by a cancellation on '
                       || to_char(s.canceled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') || '; the lesson was un-cancelled.'
          FROM public.sessions s
         WHERE s.id = a.session_id AND a.id = ANY (v_ids) AND a.status = 'Excused';
        GET DIAGNOSTICS v_n = ROW_COUNT;
        v_restored := v_restored + v_n;
        IF v_n > 0 THEN v_cm_restored := v_cm_restored + 1; END IF;
        v_months_done := v_months_done || r.month;
      ELSE
        v_cm_decide := v_cm_decide + 1;
        v_months_open := v_months_open || r.month;
      END IF;

      v_rows := v_rows || jsonb_build_object(
        'student_id', r.student_id, 'student_name', r.student_name, 'class_name', r.class_name,
        'month', r.month, 'marks', cardinality(v_ids), 'verdict', v_verdict, 'forced', v_forced AND NOT v_match,
        'saved_base', v_saved, 'register_base_if_restored', v_reg,
        'recorded_payment', CASE WHEN v_saved IS NULL THEN NULL ELSE v_paid END,
        'frozen', CASE WHEN v_saved IS NULL THEN NULL ELSE inv.frozen END,
        'confirmation_status', inv.conf, 'reason', v_reason);
    END LOOP;

    -- Lessons that are past but were never marked Held again: not restored unless you choose the child and month.
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'session_id', x.session_id, 'class_name', x.class_name, 'lesson_date', x.lesson_date,
             'status', x.session_status, 'marks', x.marks,
             'reason', 'The lesson is in the past but is still ' || x.session_status
                       || ', not Held. Nothing was restored. If it was taught, set it to Held and run this again, or list the child and month in the second argument.')
             ORDER BY x.lesson_date, x.session_id), '[]'::jsonb)
      INTO v_not_held
      FROM (
        SELECT c.session_id, cl.name::text AS class_name, c.lesson_date, c.session_status, count(*)::integer AS marks
          FROM public._uncancelled_marks_candidates() c
          LEFT JOIN public.classes cl ON cl.id = c.class_id
         WHERE c.kind = 'candidate' AND c.session_status <> 'Held'
           AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_force) e
                            WHERE e ->> 'student_id' = c.student_id::text AND e ->> 'month' = c.month)
         GROUP BY c.session_id, cl.name, c.lesson_date, c.session_status
      ) x;

    -- A forced child-month with nothing to restore is reported, not an error.
    FOR f IN SELECT e FROM jsonb_array_elements(p_force) e LOOP
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) x
                      WHERE x ->> 'student_id' = f ->> 'student_id' AND x ->> 'month' = f ->> 'month') THEN
        v_force_ignored := v_force_ignored || jsonb_build_array(f || jsonb_build_object(
          'reason', 'This child has no Excused marks left from a cancelled lesson in that month, so there was nothing to restore.'));
      END IF;
    END LOOP;

    IF p_dry_run THEN
      v_steps := v_steps || to_jsonb('This was a dry run. Nothing was written. Run the same line with false to do it.'::text);
    END IF;
    IF v_candidates = 0 THEN
      v_steps := v_steps || to_jsonb('There are no Excused marks left on un-cancelled lessons. Nothing to do.'::text);
    END IF;
    IF v_cm_restored > 0 THEN
      v_steps := v_steps || to_jsonb(
        CASE WHEN p_dry_run THEN 'These ' ELSE 'These were put back: ' END || v_cm_restored
        || ' child-months (' || v_restored || ' marks) match the bill that was saved. No bill is changed by this. '
        || 'Open Finance > Tuition for the months ' || array_to_string(ARRAY(SELECT DISTINCT m FROM unnest(v_months_done) m ORDER BY m), ', ')
        || ' and recalculate those children so the saved bill and the register agree again. The figure should stay the same.'::text);
    END IF;
    IF v_cm_decide > 0 THEN
      v_steps := v_steps || to_jsonb(v_cm_decide || ' child-months need your decision (months '
        || array_to_string(ARRAY(SELECT DISTINCT m FROM unnest(v_months_open) m ORDER BY m), ', ')
        || '). Nothing was written for them. Read each reason. If you know the lessons were taught and the child was there, run again with the second argument listing the child and month, for example [{"student_id":"<child id>","month":"2026-09"}]. If a lesson was really Excused, leave it.'::text);
    END IF;
    IF jsonb_array_length(v_not_held) > 0 THEN
      v_steps := v_steps || to_jsonb(jsonb_array_length(v_not_held) || ' lesson(s) are in the past but not Held (see lessons_not_held). Nothing was restored for them.'::text);
    END IF;
    IF v_remarked > 0 THEN
      v_steps := v_steps || to_jsonb(v_remarked || ' Excused mark(s) were changed by a person after the cancellation and were left alone.'::text);
    END IF;
    IF v_before > 0 THEN
      v_steps := v_steps || to_jsonb(v_before || ' Excused mark(s) were already Excused, made by a person, before the lesson was cancelled and were left alone.'::text);
    END IF;
    IF jsonb_array_length(v_force_ignored) > 0 THEN
      v_steps := v_steps || to_jsonb(jsonb_array_length(v_force_ignored) || ' child-month(s) you listed have nothing to restore and were skipped.'::text);
    END IF;

    v_result := jsonb_build_object(
      'dry_run', p_dry_run, 'lessons', v_lessons, 'candidates', v_candidates, 'restored', v_restored,
      'remarked_since', v_remarked, 'excused_before_cancel', v_before,
      'child_months_restored', v_cm_restored, 'child_months_to_decide', v_cm_decide,
      'child_months', v_rows, 'lessons_not_held', v_not_held, 'force_ignored', v_force_ignored, 'next_steps', v_steps);

    INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
    VALUES ('attendance', 'uncancelled-marks', 'restore_uncancelled_marks', v_uid,
            jsonb_build_object('lessons', v_lessons, 'candidates', v_candidates, 'restored', v_restored,
                               'remarked_since', v_remarked, 'excused_before_cancel', v_before,
                               'child_months_restored', v_cm_restored, 'child_months_to_decide', v_cm_decide,
                               'forced', p_force, 'lessons_not_held', v_not_held, 'child_months', v_rows));

    IF p_dry_run THEN
      RAISE EXCEPTION 'restore dry run' USING ERRCODE = 'HCR01';
    END IF;
  EXCEPTION WHEN SQLSTATE 'HCR01' THEN
    RETURN v_result;   -- every write above has been rolled back
  END;
  RETURN v_result;
END
$fn$;
REVOKE ALL ON FUNCTION public.admin_restore_uncancelled_marks(boolean, jsonb) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.admin_restore_uncancelled_marks(boolean, jsonb) IS
  'Puts back Excused marks left on lessons that were cancelled and then un-cancelled. Per child and month: sets them to Present only when the register then prices the month at the bill that was saved; otherwise reports and writes nothing. p_force lists child-months to restore anyway. Dry run by default (does every write, then rolls back). Changes the status and notes of a mark only; never a bill. SQL editor (owner) only.';

NOTIFY pgrst, 'reload schema';
