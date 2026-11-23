-- Put back the attendance marks that a class transfer deleted by mistake.
--
--   SELECT public.admin_restore_transfer_deleted_marks();           -- dry run (the default): writes nothing
--   SELECT public.admin_restore_transfer_deleted_marks(false);      -- does it
--   SELECT public.admin_restore_transfer_deleted_marks(false,
--     '[{"student_id":"<child id>","month":"2026-08"}]');            -- also puts back the months you decided on
--
-- WHAT WENT WRONG. Until 6 Nov 2026, moving a child to another class
-- (modify_enrollment_transfer, 20251023141128) deleted EVERY attendance mark of
-- that child in the class they left, past lessons included. 20261106100001 fixed
-- the function. The marks that had already gone were never put back. Tuition
-- bills a lesson only when the child has a mark of Present, Absent or Late for
-- it, so a lesson with no mark is not billed, and the next time a bill is
-- recalculated it drops. (One child's August 2026 bill of 1,680,000 VND, already
-- paid, went to 0 this way.)
--
-- WHAT THIS DOES. It finds every lesson that was Held, is before today, falls
-- inside an enrolment the child had in the class they left, and has no mark.
-- That is a "hole". It works one child and one month at a time:
--   * It asks: if every hole of this child in this month came back as Present,
--     would the register price the month at exactly the bill saved at the time?
--     (It uses tuition_bill_expected, the same pricing the bill check uses.)
--   * Yes -> "restore". The marks go back as Present, signed by nobody, with a
--     note saying where they came from.
--   * No (or there is no bill) -> "decide". Nothing is written. The row says what
--     the bill holds, what the register would give, what was paid and why it
--     does not match. We cannot know what each deleted mark was (it may have been
--     Excused or Absent); the saved bill is the only evidence there is.
--   * You may list child-months in the second argument. Those are put back in
--     full even without a match. That is your decision after reading a dry run.
--
-- SAFE BY DESIGN.
--   * The dry run is the default. It does every write, reads the result, and
--     rolls all of it back, so what it reports is exactly what a real run does.
--   * A real run is all or nothing, and a second run restores nothing.
--   * It only ADDS marks. It never changes or deletes a mark that exists, and it
--     never touches a bill. A bill is saved only by calculate-tuition.
--   * It writes one audit_log row (entity 'attendance', action
--     'restore_transfer_deleted_marks') in a real run, and none in a dry run.
--   * Run it from the SQL editor (the owner). Nobody signed in to the app can
--     run it: EXECUTE is revoked from everyone but the database owner, and an
--     app user who got through would still be refused unless an admin.
--
-- WHAT THE TRIGGERS ON attendance DO WITH THE NEW ROWS (read, not guessed):
--   guard_cancelled_session_attendance  only Excused on a cancelled lesson. Our
--                                       lessons are Held, so it lets them in.
--   guard_attendance_enrollment         turns a mark outside the child's
--                                       enrolment into Excused. Our lessons are
--                                       inside an enrolment and an allowed day,
--                                       so it lets them in. If it ever changed
--                                       one, that month would not match and
--                                       would be left to you.
--   zz_attendance_money_guard (D4)      a new Present on an old lesson crosses
--                                       the "billable" line. From the SQL editor
--                                       (owner lane) it lets the row in and, when
--                                       the month's bill has a tier above 0,
--                                       writes one 'owner_lane' line to
--                                       money_change_events for each mark. That
--                                       is a record, not a refusal. Not tested
--                                       here: the D4 migrations are too large for
--                                       the in-process test database.
--   zz_attendance_evidence_guard (D4)   acts on UPDATE and DELETE only.
--   update_attendance_updated_at        UPDATE only.
--   Streaks, points and notifications are NOT started by a trigger on attendance.
--   They are started by the mark-attendance function and the Pixel Pal sync
--   (attendance-effects.ts), neither of which runs here. So restoring awards
--   nothing and tells nobody.
--
-- NOTE. A mark signed by nobody (marked_by NULL, Present) looks like a seeded
-- placeholder to the Pixel Pal sync, which may change such a row. The note on
-- each restored mark says where it came from.

DO $pre$
BEGIN
  IF to_regprocedure('public.tuition_bill_expected(text)') IS NULL THEN
    RAISE EXCEPTION 'Restore transfer marks: public.tuition_bill_expected(text) (20261123090000) is missing. Paste that file first. Nothing was changed.';
  END IF;
  IF to_regclass('public.audit_log') IS NULL OR to_regclass('public.attendance') IS NULL THEN
    RAISE EXCEPTION 'Restore transfer marks: audit_log or attendance is missing. Nothing was changed.';
  END IF;
END
$pre$;

-- ---------------------------------------------------------------- the holes
-- Internal. One row per lesson a transfer wiped out and nobody has marked since.
CREATE OR REPLACE FUNCTION public._restore_marks_holes()
RETURNS TABLE (student_id uuid, session_id uuid, class_id uuid, lesson_date date, month text, transfer_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH t AS (
    SELECT CASE WHEN l.entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN l.entity_id::uuid END AS old_enrollment_id,
           CASE WHEN l.diff ->> 'old_class_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN (l.diff ->> 'old_class_id')::uuid END AS class_id,
           CASE WHEN l.diff ->> 'effective_date' ~ '^\d{4}-\d{2}-\d{2}'
                THEN left(l.diff ->> 'effective_date', 10)::date END AS eff
      FROM public.audit_log l
     WHERE l.entity = 'enrollment' AND l.action = 'transfer'
       AND l.occurred_at < timestamptz '2026-11-06 12:00+00'
       AND CASE WHEN l.diff ->> 'deleted_attendance' ~ '^\d{1,9}$' THEN (l.diff ->> 'deleted_attendance')::integer ELSE 0 END > 0
  ),
  tr AS (
    SELECT en.student_id, t.class_id, t.eff
      FROM t JOIN public.enrollments en ON en.id = t.old_enrollment_id
     WHERE t.class_id IS NOT NULL AND t.eff IS NOT NULL
  )
  SELECT DISTINCT ON (tr.student_id, s.id)
         tr.student_id, s.id, s.class_id, s.date, to_char(s.date, 'YYYY-MM'), tr.eff
    FROM tr
    JOIN public.sessions s
      ON s.class_id = tr.class_id AND s.status::text = 'Held'
     AND s.date < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     AND s.date < tr.eff
   WHERE NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = s.id AND a.student_id = tr.student_id)
     AND EXISTS (
       SELECT 1 FROM public.enrollments e
        WHERE e.student_id = tr.student_id AND e.class_id = s.class_id
          AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date)
          AND (e.allowed_days IS NULL OR cardinality(e.allowed_days) = 0
               OR extract(dow FROM s.date)::integer = ANY (e.allowed_days)))
   ORDER BY tr.student_id, s.id, tr.eff
$fn$;
REVOKE ALL ON FUNCTION public._restore_marks_holes() FROM PUBLIC, anon, authenticated, service_role;

-- ------------------------------------------------------------ the restore
CREATE OR REPLACE FUNCTION public.admin_restore_transfer_deleted_marks(
  p_dry_run boolean DEFAULT true,
  p_force jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_transfers integer;
  v_holes integer := 0;
  v_restored integer := 0;
  v_cm_restored integer := 0;
  v_cm_decide integer := 0;
  r record;
  inv record;
  v_rows jsonb := '[]'::jsonb;
  v_force_ignored jsonb := '[]'::jsonb;
  v_steps jsonb := '[]'::jsonb;
  v_result jsonb;
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
    RAISE EXCEPTION 'The second argument must be a list like [{"student_id":"...","month":"2026-08"}].' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_transfers
    FROM public.audit_log l
   WHERE l.entity = 'enrollment' AND l.action = 'transfer'
     AND l.occurred_at < timestamptz '2026-11-06 12:00+00'
     AND CASE WHEN l.diff ->> 'deleted_attendance' ~ '^\d{1,9}$' THEN (l.diff ->> 'deleted_attendance')::integer ELSE 0 END > 0;

  BEGIN
    FOR r IN
      SELECT h.student_id, h.month, count(*)::integer AS holes,
             string_agg(DISTINCT c.name::text, ', ' ORDER BY c.name::text) AS class_name,
             st.full_name::text AS student_name
        FROM public._restore_marks_holes() h
        JOIN public.students st ON st.id = h.student_id
        LEFT JOIN public.classes c ON c.id = h.class_id
       GROUP BY h.student_id, h.month, st.full_name
       ORDER BY st.full_name, h.month, h.student_id
    LOOP
      v_holes := v_holes + r.holes;
      v_forced := EXISTS (SELECT 1 FROM jsonb_array_elements(p_force) e
                           WHERE e ->> 'student_id' = r.student_id::text AND e ->> 'month' = r.month);

      SELECT i.base_amount::bigint AS base, i.recorded_payment::bigint AS paid,
             coalesce(i.tuition_frozen, false) AS frozen, i.confirmation_status::text AS conf
        INTO inv
        FROM public.invoices i WHERE i.student_id = r.student_id AND i.month = r.month;
      v_saved := CASE WHEN FOUND THEN coalesce(inv.base, 0) END;
      v_paid := coalesce(inv.paid, 0);

      -- Trial: put every hole back as Present, price the month, undo it.
      v_reg := NULL; v_err := NULL;
      BEGIN
        INSERT INTO public.attendance (session_id, student_id, status, marked_by, marked_at, notes)
        SELECT h.session_id, h.student_id, 'Present', NULL, now(), 'trial'
          FROM public._restore_marks_holes() h WHERE h.student_id = r.student_id AND h.month = r.month;
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
        v_reason := 'The bill charged at the time counts exactly these lessons.';
      ELSIF v_forced AND v_err IS NULL THEN
        v_verdict := 'restore';
        v_reason := 'Restored in full because you chose this child and month.';
      ELSE
        v_verdict := 'decide';
        v_reason := CASE
          WHEN v_err IS NOT NULL THEN 'A register rule refused the marks (' || v_err || '). Nothing was written.'
          WHEN v_saved IS NULL THEN 'There is no bill for this month. With every lesson put back as Present the register would price it at '
               || to_char(v_reg, 'FM999,999,999,999') || '.'
          WHEN v_saved = 0 THEN 'The bill was already recalculated to 0; ' || to_char(v_paid, 'FM999,999,999,999') || ' was paid for this month.'
          WHEN v_reg > v_saved THEN 'The bill charged ' || to_char(v_saved, 'FM999,999,999,999') || ' but putting every lesson back as Present gives '
               || to_char(v_reg, 'FM999,999,999,999') || ': some of these lessons were probably Excused.'
          ELSE 'The bill charged ' || to_char(v_saved, 'FM999,999,999,999') || ' but putting every lesson back as Present gives only '
               || to_char(v_reg, 'FM999,999,999,999') || ': the bill was changed after it was charged.'
        END || CASE WHEN coalesce(inv.frozen, false) THEN ' The bill is frozen.' ELSE '' END;
      END IF;

      IF v_verdict = 'restore' THEN
        INSERT INTO public.attendance (session_id, student_id, status, marked_by, marked_at, notes)
        SELECT h.session_id, h.student_id, 'Present', NULL, now(),
               'Restored ' || to_char(v_today, 'YYYY-MM-DD') || ': deleted by the class transfer of '
               || to_char(h.transfer_date, 'YYYY-MM-DD') || '; the bill charged at the time counts these lessons.'
          FROM public._restore_marks_holes() h WHERE h.student_id = r.student_id AND h.month = r.month;
        GET DIAGNOSTICS v_n = ROW_COUNT;
        v_restored := v_restored + v_n;
        v_cm_restored := v_cm_restored + 1;
        v_months_done := v_months_done || r.month;
      ELSE
        v_cm_decide := v_cm_decide + 1;
        v_months_open := v_months_open || r.month;
      END IF;

      v_rows := v_rows || jsonb_build_object(
        'student_id', r.student_id, 'student_name', r.student_name, 'class_name', r.class_name,
        'month', r.month, 'holes', r.holes, 'verdict', v_verdict, 'forced', v_forced AND NOT v_match,
        'saved_base', v_saved, 'register_base_if_restored', v_reg,
        'recorded_payment', CASE WHEN v_saved IS NULL THEN NULL ELSE v_paid END,
        'frozen', CASE WHEN v_saved IS NULL THEN NULL ELSE inv.frozen END,
        'confirmation_status', inv.conf, 'reason', v_reason);
    END LOOP;

    -- A forced child-month with no hole is reported, not an error.
    FOR f IN SELECT e FROM jsonb_array_elements(p_force) e LOOP
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) x
                      WHERE x ->> 'student_id' = f ->> 'student_id' AND x ->> 'month' = f ->> 'month') THEN
        v_force_ignored := v_force_ignored || jsonb_build_array(f || jsonb_build_object(
          'reason', 'This child has no missing marks left from a transfer in that month, so there was nothing to restore.'));
      END IF;
    END LOOP;

    IF p_dry_run THEN
      v_steps := v_steps || to_jsonb('This was a dry run. Nothing was written. Run the same line with false to do it.'::text);
    END IF;
    IF v_holes = 0 THEN
      v_steps := v_steps || to_jsonb('There are no missing marks from transfers. Nothing to do.'::text);
    END IF;
    IF v_cm_restored > 0 THEN
      v_steps := v_steps || to_jsonb(
        CASE WHEN p_dry_run THEN 'These ' ELSE 'These were put back: ' END || v_cm_restored
        || ' child-months (' || v_restored || ' marks) match the bill charged at the time. No bill is changed by this. '
        || 'Open Finance > Tuition for the months ' || array_to_string(ARRAY(SELECT DISTINCT m FROM unnest(v_months_done) m ORDER BY m), ', ')
        || ' and recalculate those children so the saved bill and the register agree again. The figure should stay the same.'::text);
    END IF;
    IF v_cm_decide > 0 THEN
      v_steps := v_steps || to_jsonb(v_cm_decide || ' child-months need your decision (months '
        || array_to_string(ARRAY(SELECT DISTINCT m FROM unnest(v_months_open) m ORDER BY m), ', ')
        || '). Nothing was written for them. Read each reason. If you know the lessons were held and the child was there, run again with the second argument listing the child and month, for example [{"student_id":"<child id>","month":"2026-08"}]. If a lesson was really Excused, leave it.'::text);
    END IF;
    IF jsonb_array_length(v_force_ignored) > 0 THEN
      v_steps := v_steps || to_jsonb(jsonb_array_length(v_force_ignored) || ' child-month(s) you listed have no missing marks and were skipped.'::text);
    END IF;

    v_result := jsonb_build_object(
      'dry_run', p_dry_run, 'transfers', v_transfers, 'holes', v_holes, 'restored', v_restored,
      'child_months_restored', v_cm_restored, 'child_months_to_decide', v_cm_decide,
      'child_months', v_rows, 'force_ignored', v_force_ignored, 'next_steps', v_steps);

    INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
    VALUES ('attendance', 'transfer-deleted-marks', 'restore_transfer_deleted_marks', v_uid,
            jsonb_build_object('transfers', v_transfers, 'holes', v_holes, 'restored', v_restored,
                               'child_months_restored', v_cm_restored, 'child_months_to_decide', v_cm_decide,
                               'forced', p_force, 'child_months', v_rows));

    IF p_dry_run THEN
      RAISE EXCEPTION 'restore dry run' USING ERRCODE = 'HCR01';
    END IF;
  EXCEPTION WHEN SQLSTATE 'HCR01' THEN
    RETURN v_result;   -- every write above has been rolled back
  END;
  RETURN v_result;
END
$fn$;
REVOKE ALL ON FUNCTION public.admin_restore_transfer_deleted_marks(boolean, jsonb) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.admin_restore_transfer_deleted_marks(boolean, jsonb) IS
  'Puts back attendance marks that modify_enrollment_transfer deleted before 6 Nov 2026. Per child and month: restores them as Present only when the register then prices the month at the bill saved at the time; otherwise reports and writes nothing. p_force lists child-months to restore anyway. Dry run by default (does every write, then rolls back). Adds marks only; never changes a mark or a bill. SQL editor (owner) only.';
