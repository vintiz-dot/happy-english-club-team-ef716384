-- Stars sync: homework and grades.
--
-- Pixel Pal's feed carried register marks, points and withdrawals, so
-- `homework` and `grade` records had nothing to land on: the engine kept any
-- that arrived as skipped_unsupported, and stars_homework_map sat empty.
-- This is HEC's half of closing that. Pixel Pal's half is in
-- docs/PIXEL_PAL_NEXT_STEPS.md, and the two can ship in either order: until
-- Pixel Pal sends them this does nothing, and records kept as unsupported
-- apply by themselves on the next run after this is pasted.
--
-- THE CONTRACT. Set out in docs/STARS_SYNC_SPEC.md. In short:
--   homework  { homework_ref, title, body?, due_date? }, for a class.
--             Sending the same homework_ref again replaces what it said.
--   grade     { homework_ref, grade, points?, feedback? }, for a child.
--   A withdrawal of either goes through `retraction`, like any other record.
--
-- THE SAME RULES AS A REGISTER MARK. It acts as the class's chosen teacher
-- and asks is_teacher_of_class before every write. It never overwrites what
-- a person did in HEC: a teacher's grade that differs is a conflict for an
-- admin, and a homework somebody edited stays as they left it. Records are
-- ordered by seq, so one that arrives late does not undo a newer one. A
-- child must be matched and enrolled, and anything it cannot place waits.
--
-- POINTS GO THROUGH award_homework_points, never a bare insert: it is the one
-- place that knows a homework pays one award per child, so a corrected grade
-- replaces the award rather than paying twice.
--
-- stars_sync__apply_event IS LEFT ALONE on purpose. It is the 600 lines that
-- decide registers and points, already live and tested; homework has nothing
-- to share with it but the checks at the top. stars_sync__run_one now sends
-- homework, grades and withdrawals of those here, and everything else on as
-- before. One thing that split costs: a points record does not count grade
-- points toward the daily limit, though a grade counts both.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.stars_sync_effects') IS NULL THEN
    RAISE EXCEPTION 'apply 20261028090000_stars_sync_review_fixes.sql first';
  END IF;
  IF to_regprocedure('public.award_homework_points(uuid,uuid,integer,text)') IS NULL THEN
    RAISE EXCEPTION 'apply 20261023090000_homework_grading_integrity.sql first';
  END IF;
END $$;

-- ---------------------------------------------------------------- tables

-- What the sync last wrote on a homework: how an edit made in HEC is told
-- from its own earlier write, and how a late record is told from a new one.
ALTER TABLE public.stars_homework_map
  ADD COLUMN IF NOT EXISTS seq   bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrote jsonb;

-- "This grade is one the sync wrote, and nobody has changed it since."
-- The grading twin of stars_sync_attendance_state, compared by value at the
-- next write. prev is what HEC held before the sync first wrote it, so a
-- withdrawal can put that back. points is what the sync awarded, if anything.
CREATE TABLE IF NOT EXISTS public.stars_sync_grade_state (
  homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  grade       text NOT NULL,
  points      integer,
  event_id    uuid NOT NULL,
  seq         bigint NOT NULL,
  prev        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (homework_id, student_id)
);
ALTER TABLE public.stars_sync_grade_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stars_sync_grade_state_admin_read ON public.stars_sync_grade_state;
CREATE POLICY stars_sync_grade_state_admin_read ON public.stars_sync_grade_state
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT ON public.stars_sync_grade_state TO authenticated;
GRANT ALL ON public.stars_sync_grade_state TO service_role;

-- ---------------------------------------------------------------- helpers

-- Who the sync acts as for this class, or why it cannot act at all. The
-- same checks, in the same words, as stars_sync__apply_event.
CREATE OR REPLACE FUNCTION public.stars_sync__acting_teacher(
  p_map public.stars_class_map, p_default_teacher uuid, p_class_name text,
  OUT user_id uuid, OUT problem text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid := COALESCE(p_map.teacher_id, p_default_teacher);
  v_teacher    record;
BEGIN
  IF v_teacher_id IS NULL THEN
    problem := format('No teacher is chosen for %s.', p_class_name);
    RETURN;
  END IF;
  SELECT t.id, t.full_name, t.is_active, t.user_id AS uid,
         EXISTS (SELECT 1 FROM public.user_roles r
                  WHERE r.user_id = t.user_id
                    AND r.role IN ('teacher'::public.app_role, 'admin'::public.app_role)) AS has_role
    INTO v_teacher
    FROM public.teachers t WHERE t.id = v_teacher_id;
  IF NOT FOUND THEN
    problem := format('The teacher chosen for %s no longer exists.', p_class_name);
  ELSIF NOT v_teacher.is_active THEN
    problem := format('%s is archived.', v_teacher.full_name);
  ELSIF v_teacher.uid IS NULL THEN
    problem := format('%s has no login, so nothing can be recorded as them.', v_teacher.full_name);
  ELSIF NOT v_teacher.has_role THEN
    problem := format('%s does not hold the teacher role.', v_teacher.full_name);
  ELSIF NOT COALESCE(public.is_teacher_of_class(v_teacher.uid, p_map.class_id), false) THEN
    problem := format('%s does not teach %s in HEC, so cannot record this.', v_teacher.full_name, p_class_name);
  ELSE
    user_id := v_teacher.uid;
  END IF;
END $$;

-- A grade's award: through the one function that knows a homework pays once,
-- then marked as coming from Pixel Pal, like every point the sync writes.
CREATE OR REPLACE FUNCTION public.stars_sync__award_grade(
  p_student uuid, p_homework uuid, p_points integer, p_grade text, p_teacher uuid, p_date date
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx  uuid;
  v_due date;
BEGIN
  v_tx := public.award_homework_points(p_student, p_homework, p_points, p_grade);
  SELECT due_date INTO v_due FROM public.homeworks WHERE id = p_homework;
  -- A homework with no due date is dated by the grade. award_homework_points
  -- would say "today", which for a record retried later is the wrong month.
  UPDATE public.point_transactions
     SET notes      = left('[Pixel Pal] Homework graded: ' || p_grade, 500),
         created_by = p_teacher,
         date       = COALESCE(v_due, p_date),
         month      = to_char(COALESCE(v_due, p_date), 'YYYY-MM')
   WHERE id = v_tx;
  RETURN v_tx;
END $$;

-- ---------------------------------------------------------------- one record
-- Same contract as stars_sync__apply_event: {outcome, note, effects}, and
-- every refusal about a child's record is an outcome rather than an error.

CREATE OR REPLACE FUNCTION public.stars_sync__apply_homework_event(p_event jsonb, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c             public.stars_sync_connection%ROWTYPE;
  v_event_id    uuid;
  v_existing    public.stars_sync_events%ROWTYPE;
  v_kind        text := p_event ->> 'kind';
  v_class_ref   text := p_event ->> 'class_ref';
  v_student_ref text := p_event ->> 'student_ref';
  v_payload     jsonb := COALESCE(p_event -> 'payload', '{}'::jsonb);
  v_seq         bigint := CASE WHEN (p_event ->> 'seq') ~ '^[0-9]{1,18}$' THEN (p_event ->> 'seq')::bigint ELSE 0 END;
  v_date        date;
  v_today       date := public.stars_sync__today(p_now);
  v_made_at     timestamptz;

  v_outcome     text;
  v_note        text;
  v_ref         jsonb;
  v_conflict    jsonb;

  v_map         public.stars_class_map%ROWTYPE;
  v_class_name  text;
  v_acting      record;
  v_student_id  uuid;
  v_student_nm  text;

  v_hw_ref      text := btrim(v_payload ->> 'homework_ref');
  v_title       text := btrim(v_payload ->> 'title');
  v_body        text := NULLIF(btrim(v_payload ->> 'body'), '');
  v_due         date;
  v_hwmap       public.stars_homework_map%ROWTYPE;
  v_hw          public.homeworks%ROWTYPE;
  v_wrote       jsonb;
  v_homework_id uuid;

  v_grade       text := btrim(v_payload ->> 'grade');
  v_feedback    text := NULLIF(btrim(v_payload ->> 'feedback'), '');
  v_points      integer;
  v_day_total   integer;
  v_row         public.homework_submissions%ROWTYPE;
  v_has_row     boolean;
  v_state       public.stars_sync_grade_state%ROWTYPE;
  v_has_state   boolean;
  v_prev        jsonb;
  v_tx          uuid;
  v_prev_award  integer;

  v_target_id   uuid;
  v_target      public.stars_sync_events%ROWTYPE;
  v_tref        jsonb;
BEGIN
  v_event_id := public.stars_sync__event_id(p_event);

  SELECT * INTO v_existing FROM public.stars_sync_events WHERE event_id = v_event_id;
  IF FOUND AND NOT public.stars_sync_is_pending(v_existing.outcome) THEN
    RETURN jsonb_build_object('outcome', 'already_done');
  END IF;
  v_made_at := public.stars_sync__made_at(p_event, COALESCE(v_existing.received_at, p_now));

  SELECT * INTO c FROM public.stars_sync_connection WHERE id;

  <<decide>>
  BEGIN
    IF NOT COALESCE((p_event ->> 'event_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false) THEN
      v_outcome := 'rejected';
      v_note := 'Pixel Pal sent this record without a valid event_id.';
      EXIT decide;
    END IF;

    IF v_kind = 'retraction' THEN
      -- ---------------------------------- a withdrawal, part 1
      -- Before any date check: it points at another record and needs nothing
      -- of its own date. A record that never wrote anything is withdrawn
      -- here, so it can never apply later.
      v_target_id := (v_payload ->> 'retracts_event_id')::uuid;
      SELECT * INTO v_target FROM public.stars_sync_events WHERE event_id = v_target_id FOR UPDATE;
      IF v_target.outcome = 'retracted' THEN
        v_outcome := 'applied';
        v_note := 'Already withdrawn.';
        EXIT decide;
      END IF;
      IF v_target.outcome <> 'applied' THEN
        UPDATE public.stars_sync_conflicts
           SET resolved_at = p_now, resolution = 'dismissed'
         WHERE event_id = v_target_id AND resolved_at IS NULL;
        UPDATE public.stars_sync_events
           SET outcome = 'retracted',
               outcome_note = 'Withdrawn in Pixel Pal before it applied in HEC.',
               processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'Withdrew a record that had not applied. Nothing in HEC changed.';
        v_ref := jsonb_build_object('withdrew', v_target_id);
        EXIT decide;
      END IF;
      v_tref := v_target.applied_ref;
      IF COALESCE((v_tref ->> 'adopted')::boolean, false) THEN
        -- The grade was a person's all along. With Pixel Pal no longer
        -- standing by it, the next record has to raise a conflict again
        -- rather than treat it as the sync's own to replace.
        DELETE FROM public.stars_sync_grade_state
         WHERE event_id = v_target_id;
        UPDATE public.stars_sync_events
           SET outcome = 'retracted',
               outcome_note = 'Withdrawn in Pixel Pal; HEC already held this, so it was left.',
               processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'Withdrew something HEC already had. Nothing in HEC changed.';
        v_ref := jsonb_build_object('withdrew', v_target_id);
        EXIT decide;
      END IF;
      -- Undoing a write needs the permission writing it did, in that class.
      SELECT * INTO v_map FROM public.stars_class_map WHERE class_id = (v_tref ->> 'class_id')::uuid;
    ELSE
      -- ---------------------------------- shape and date
      IF (p_event ->> 'lesson_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        BEGIN
          v_date := (p_event ->> 'lesson_date')::date;
        EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
          v_date := NULL;
        END;
      END IF;
      IF v_date IS NULL THEN
        v_outcome := 'rejected';
        v_note := 'The date is missing or is not a date.';
        EXIT decide;
      END IF;
      IF (v_payload ->> 'due_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        BEGIN
          v_due := (v_payload ->> 'due_date')::date;
        EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
          v_due := NULL;
        END;
      END IF;
      IF v_kind = 'homework' AND NULLIF(v_payload ->> 'due_date', '') IS NOT NULL AND v_due IS NULL THEN
        v_outcome := 'rejected';
        v_note := format('"%s" is not a due date HEC can read.', v_payload ->> 'due_date');
        EXIT decide;
      END IF;
      -- Homework set before the start date but due after it is current work,
      -- and its grades will need it. Anything else before then stays out,
      -- as for every other record.
      IF COALESCE(CASE WHEN v_kind = 'homework' THEN GREATEST(v_due, v_date) END, v_date) < c.sync_from THEN
        v_outcome := 'skipped_before_start';
        v_note := format('This (%s) is before the sync start date (%s).', v_date, c.sync_from);
        EXIT decide;
      END IF;
      IF v_date > v_today THEN
        v_outcome := 'rejected';
        v_note := format('The date %s is in the future.', v_date);
        EXIT decide;
      END IF;
      IF v_date < v_today - 60 THEN
        v_outcome := 'rejected';
        v_note := format('This (%s) is more than 60 days old.', v_date);
        EXIT decide;
      END IF;
      IF v_hw_ref IS NULL OR v_hw_ref = '' OR length(v_hw_ref) > 200 THEN
        v_outcome := 'rejected';
        v_note := 'The record does not say which homework it is about (homework_ref).';
        EXIT decide;
      END IF;
      SELECT * INTO v_map FROM public.stars_class_map WHERE stars_class_id = v_class_ref;
    END IF;

    -- ------------------------------------ class and teacher
    IF v_map.stars_class_id IS NULL THEN
      v_outcome := 'skipped_unmapped';
      v_note := format('Pixel Pal class %s is not mapped to an HEC class.', COALESCE(v_class_ref, '?'));
      EXIT decide;
    END IF;
    SELECT name INTO v_class_name FROM public.classes WHERE id = v_map.class_id;
    IF NOT v_map.enabled THEN
      v_outcome := 'skipped_disabled';
      v_note := format('Sync is paused for %s.', v_class_name);
      EXIT decide;
    END IF;
    SELECT * INTO v_acting FROM public.stars_sync__acting_teacher(v_map, c.default_teacher_id, v_class_name);
    IF v_acting.problem IS NOT NULL THEN
      v_outcome := 'skipped_not_permitted';
      v_note := v_acting.problem;
      EXIT decide;
    END IF;

    -- ------------------------------------ a withdrawal, part 2
    IF v_kind = 'retraction' THEN
      v_homework_id := (v_tref ->> 'homework_id')::uuid;

      IF v_target.kind = 'homework' THEN
        SELECT * INTO v_hw FROM public.homeworks WHERE id = v_homework_id FOR UPDATE;
        IF NOT FOUND THEN
          v_note := 'The homework was already gone from HEC.';
        ELSIF EXISTS (SELECT 1 FROM public.homework_submissions s WHERE s.homework_id = v_homework_id)
           OR EXISTS (SELECT 1 FROM public.point_transactions p WHERE p.homework_id = v_homework_id) THEN
          -- Deleting it would take children's grades and points with it.
          v_note := 'Children already have work or grades on this homework in HEC, so it was kept.';
        ELSE
          SELECT * INTO v_hwmap FROM public.stars_homework_map WHERE homework_id = v_homework_id;
          IF jsonb_build_object('title', v_hw.title, 'body', v_hw.body, 'due_date', v_hw.due_date)
             IS DISTINCT FROM v_hwmap.wrote THEN
            v_note := 'Somebody changed this homework in HEC since, so it was kept.';
          ELSE
            DELETE FROM public.homeworks WHERE id = v_homework_id;
            v_note := 'Removed the homework; nothing had been done on it yet.';
          END IF;
        END IF;
        UPDATE public.stars_sync_events
           SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal. ' || v_note, processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_ref := jsonb_build_object('withdrew', v_target_id);
        EXIT decide;
      END IF;

      -- A grade.
      v_student_id := (v_tref ->> 'student_id')::uuid;
      SELECT * INTO v_state FROM public.stars_sync_grade_state
       WHERE homework_id = v_homework_id AND student_id = v_student_id FOR UPDATE;
      v_has_state := FOUND;
      -- A newer record replaced this one, so the grade shows that, not this.
      IF v_has_state AND v_state.event_id IS DISTINCT FROM v_target_id THEN
        UPDATE public.stars_sync_events
           SET outcome = 'retracted',
               outcome_note = 'Withdrawn in Pixel Pal; a newer Pixel Pal record had already replaced it, so the grade was left.',
               processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'A newer Pixel Pal record had already replaced this one; nothing in HEC changed.';
        v_ref := jsonb_build_object('withdrew', v_target_id);
        EXIT decide;
      END IF;

      SELECT * INTO v_row FROM public.homework_submissions
       WHERE homework_id = v_homework_id AND student_id = v_student_id FOR UPDATE;
      v_has_row := FOUND;
      IF NOT v_has_state OR NOT v_has_row OR v_row.grade IS DISTINCT FROM v_state.grade THEN
        DELETE FROM public.stars_sync_grade_state WHERE homework_id = v_homework_id AND student_id = v_student_id;
        UPDATE public.stars_sync_events
           SET outcome = 'retracted',
               outcome_note = 'Withdrawn in Pixel Pal; the grade had already been changed in HEC, so it was left.',
               processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'The grade had been changed in HEC since; HEC''s was kept.';
        v_ref := jsonb_build_object('withdrew', v_target_id);
        EXIT decide;
      END IF;

      v_prev := v_state.prev;
      IF COALESCE((v_prev ->> 'existed')::boolean, false) THEN
        UPDATE public.homework_submissions
           SET grade = v_prev ->> 'grade',
               teacher_feedback = v_prev ->> 'teacher_feedback',
               status = v_prev ->> 'status',
               graded_at = (v_prev ->> 'graded_at')::timestamptz
         WHERE homework_id = v_homework_id AND student_id = v_student_id;
      ELSE
        DELETE FROM public.homework_submissions WHERE homework_id = v_homework_id AND student_id = v_student_id;
      END IF;

      -- Its award, only if it is still the sync's own. Points HEC gave for
      -- this homework before the sync's grade are put back.
      IF v_state.points IS NOT NULL THEN
        v_prev_award := (v_prev ->> 'award_points')::integer;
        IF v_prev_award IS NOT NULL THEN
          PERFORM public.award_homework_points(v_student_id, v_homework_id, v_prev_award, v_prev ->> 'grade');
        ELSE
          DELETE FROM public.point_transactions
           WHERE type = 'homework' AND homework_id = v_homework_id AND student_id = v_student_id
             AND points = v_state.points;
        END IF;
      END IF;

      DELETE FROM public.stars_sync_grade_state WHERE homework_id = v_homework_id AND student_id = v_student_id;
      UPDATE public.stars_sync_events
         SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; restored.', processed_at = p_now
       WHERE event_id = v_target_id;
      v_outcome := 'applied';
      v_note := 'Withdrew the grade and put back what HEC had before it.';
      v_ref := jsonb_build_object('table', 'homework_submissions', 'homework_id', v_homework_id,
                                  'student_id', v_student_id, 'withdrew', v_target_id);
      EXIT decide;
    END IF;

    -- ------------------------------------ homework
    IF v_kind = 'homework' THEN
      IF v_title IS NULL OR v_title = '' THEN
        v_outcome := 'rejected';
        v_note := 'The homework has no title.';
        EXIT decide;
      END IF;
      v_title := left(v_title, 500);
      v_wrote := jsonb_build_object('title', v_title, 'body', v_body, 'due_date', v_due);

      SELECT * INTO v_hwmap FROM public.stars_homework_map WHERE stars_homework_ref = v_hw_ref FOR UPDATE;
      IF FOUND THEN
        -- Pixel Pal's order decides: a late record does not undo a newer one.
        IF v_hwmap.seq > v_seq THEN
          v_outcome := 'duplicate';
          v_note := 'A newer Pixel Pal record for this homework has already applied.';
          EXIT decide;
        END IF;
        SELECT * INTO v_hw FROM public.homeworks WHERE id = v_hwmap.homework_id FOR UPDATE;
        IF v_hw.class_id IS DISTINCT FROM v_map.class_id THEN
          v_outcome := 'rejected';
          v_note := 'Pixel Pal has this homework in a different class from the one it first came in.';
          EXIT decide;
        END IF;
        IF jsonb_build_object('title', v_hw.title, 'body', v_hw.body, 'due_date', v_hw.due_date)
           IS DISTINCT FROM v_hwmap.wrote THEN
          v_outcome := 'rejected';
          v_note := 'Somebody changed this homework in HEC since it came across, so HEC''s version stands.';
          EXIT decide;
        END IF;
        UPDATE public.homeworks SET title = v_title, body = v_body, due_date = v_due WHERE id = v_hwmap.homework_id;
        UPDATE public.stars_homework_map SET seq = v_seq, wrote = v_wrote WHERE stars_homework_ref = v_hw_ref;
        v_outcome := 'applied';
        v_note := 'Updated the homework.';
        v_ref := jsonb_build_object('table', 'homeworks', 'homework_id', v_hwmap.homework_id,
                                    'class_id', v_map.class_id, 'updated', true);
        EXIT decide;
      END IF;

      -- A teacher may have set the same homework in HEC by hand. Adopting it
      -- keeps grades from landing on a second copy nobody is looking at.
      SELECT h.* INTO v_hw FROM public.homeworks h
       WHERE h.class_id = v_map.class_id
         AND lower(btrim(h.title)) = lower(v_title)
         AND h.due_date IS NOT DISTINCT FROM v_due
         AND NOT EXISTS (SELECT 1 FROM public.stars_homework_map m WHERE m.homework_id = h.id)
       ORDER BY h.created_at NULLS LAST
       LIMIT 1;
      IF FOUND THEN
        INSERT INTO public.stars_homework_map (stars_homework_ref, homework_id, seq, wrote)
        VALUES (v_hw_ref, v_hw.id, v_seq,
                jsonb_build_object('title', v_hw.title, 'body', v_hw.body, 'due_date', v_hw.due_date));
        v_outcome := 'applied';
        v_note := 'HEC already had this homework, so the two are now linked.';
        v_ref := jsonb_build_object('table', 'homeworks', 'homework_id', v_hw.id,
                                    'class_id', v_map.class_id, 'adopted', true);
        EXIT decide;
      END IF;

      INSERT INTO public.homeworks (class_id, title, body, due_date, created_by)
      VALUES (v_map.class_id, v_title, v_body, v_due, v_acting.user_id)
      RETURNING id INTO v_homework_id;
      INSERT INTO public.stars_homework_map (stars_homework_ref, homework_id, seq, wrote)
      VALUES (v_hw_ref, v_homework_id, v_seq, v_wrote);

      -- Inserting a homework tells every child in the class. For history
      -- coming across, that is a morning of notifications about work that
      -- was due weeks ago, so anything no longer news goes unannounced.
      IF COALESCE(v_due, v_date) < v_today OR v_date < v_today - 3 THEN
        DELETE FROM public.notifications
         WHERE type = 'homework_assigned' AND metadata ->> 'homework_id' = v_homework_id::text;
      END IF;

      v_outcome := 'applied';
      v_note := format('Set the homework in %s.', v_class_name);
      v_ref := jsonb_build_object('table', 'homeworks', 'homework_id', v_homework_id, 'class_id', v_map.class_id);
      EXIT decide;
    END IF;

    -- ------------------------------------ a grade: the child
    SELECT m.student_id, s.full_name INTO v_student_id, v_student_nm
      FROM public.stars_student_map m
      JOIN public.students s ON s.id = m.student_id
     WHERE m.stars_student_id = v_student_ref;
    IF v_student_id IS NULL THEN
      v_outcome := 'skipped_unmapped';
      v_note := format('Pixel Pal child %s is not matched to an HEC child.', COALESCE(v_student_ref, '?'));
      EXIT decide;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.enrollments e
       WHERE e.student_id = v_student_id AND e.class_id = v_map.class_id
         AND e.start_date <= v_date AND (e.end_date IS NULL OR e.end_date >= v_date)
    ) THEN
      v_outcome := 'skipped_not_enrolled';
      v_note := format('%s is not enrolled in %s on %s.', v_student_nm, v_class_name, v_date);
      EXIT decide;
    END IF;

    -- ------------------------------------ a grade: what it says
    IF v_grade IS NULL OR v_grade = '' THEN
      v_outcome := 'rejected';
      v_note := 'The grade is empty.';
      EXIT decide;
    END IF;
    IF length(v_grade) > 100 THEN
      v_outcome := 'rejected';
      v_note := 'The grade is too long to be a grade.';
      EXIT decide;
    END IF;
    IF v_payload ? 'points' AND jsonb_typeof(v_payload -> 'points') <> 'null' THEN
      IF jsonb_typeof(v_payload -> 'points') <> 'number' OR (v_payload ->> 'points') !~ '^-?[0-9]{1,6}$' THEN
        v_outcome := 'rejected';
        v_note := 'The points on this grade are not a whole number.';
        EXIT decide;
      END IF;
      v_points := (v_payload ->> 'points')::integer;
      IF abs(v_points) > c.max_points_per_event THEN
        v_outcome := 'rejected';
        v_note := format('%s points is over the limit of %s for one award. Raise the limit on the Stars Sync page if it was meant.',
                         v_points, c.max_points_per_event);
        EXIT decide;
      END IF;
      IF v_points > 0 THEN
        SELECT COALESCE(sum((e.applied_ref ->> 'points')::integer), 0) INTO v_day_total
          FROM public.stars_sync_events e
         WHERE e.kind IN ('points', 'grade') AND e.outcome = 'applied'
           AND e.applied_ref ->> 'student_id' = v_student_id::text
           AND e.applied_ref ->> 'date' = v_date::text
           AND (e.applied_ref ->> 'points')::integer > 0;
        IF v_day_total + v_points > c.max_points_per_day THEN
          v_outcome := 'rejected';
          v_note := format('This would bring %s to %s points from Pixel Pal on %s, over the daily limit of %s.',
                           v_student_nm, v_day_total + v_points, v_date, c.max_points_per_day);
          EXIT decide;
        END IF;
      END IF;
    END IF;

    -- ------------------------------------ a grade: its homework
    SELECT * INTO v_hwmap FROM public.stars_homework_map WHERE stars_homework_ref = v_hw_ref;
    IF NOT FOUND THEN
      v_outcome := 'skipped_no_homework';
      v_note := 'Waiting for the homework this grade belongs to.';
      EXIT decide;
    END IF;
    SELECT * INTO v_hw FROM public.homeworks WHERE id = v_hwmap.homework_id;
    IF v_hw.class_id IS DISTINCT FROM v_map.class_id THEN
      v_outcome := 'rejected';
      v_note := 'This grade is for a homework in a different class.';
      EXIT decide;
    END IF;

    SELECT * INTO v_state FROM public.stars_sync_grade_state
     WHERE homework_id = v_hw.id AND student_id = v_student_id FOR UPDATE;
    v_has_state := FOUND;
    IF v_has_state AND v_state.seq > v_seq THEN
      v_outcome := 'duplicate';
      v_note := 'A newer Pixel Pal grade for this child and homework has already applied.';
      EXIT decide;
    END IF;

    -- This record replaces any older one still waiting for an admin to settle.
    UPDATE public.stars_sync_conflicts k
       SET resolved_at = p_now, resolution = 'dismissed'
     WHERE k.student_id = v_student_id
       AND k.resolved_at IS NULL
       AND k.theirs ->> 'homework_id' = v_hw.id::text
       AND EXISTS (SELECT 1 FROM public.stars_sync_events e
                    WHERE e.event_id = k.event_id AND e.seq < v_seq);

    SELECT * INTO v_row FROM public.homework_submissions
     WHERE homework_id = v_hw.id AND student_id = v_student_id FOR UPDATE;
    v_has_row := FOUND;

    -- What HEC held before the sync, however this record ends up being used.
    SELECT p.points INTO v_prev_award FROM public.point_transactions p
     WHERE p.type = 'homework' AND p.homework_id = v_hw.id AND p.student_id = v_student_id;
    v_prev := CASE WHEN v_has_row
      THEN jsonb_build_object('existed', true, 'status', v_row.status, 'grade', v_row.grade,
                              'teacher_feedback', v_row.teacher_feedback, 'graded_at', v_row.graded_at,
                              'award_points', v_prev_award)
      ELSE jsonb_build_object('existed', false, 'award_points', v_prev_award) END;

    -- ------------------------------------ a grade: a person's stands
    IF v_has_row AND v_row.grade IS NOT NULL AND NOT (v_has_state AND v_state.grade = v_row.grade) THEN
      IF v_row.grade = v_grade THEN
        INSERT INTO public.stars_sync_grade_state (homework_id, student_id, grade, points, event_id, seq, prev, updated_at)
        VALUES (v_hw.id, v_student_id, v_grade, NULL, v_event_id, v_seq, v_prev, p_now)
        ON CONFLICT (homework_id, student_id) DO UPDATE
          SET grade = EXCLUDED.grade, points = NULL, event_id = EXCLUDED.event_id, seq = EXCLUDED.seq,
              prev = EXCLUDED.prev, updated_at = EXCLUDED.updated_at;
        v_outcome := 'applied';
        v_note := format('HEC already had the grade %s.', v_grade);
        v_ref := jsonb_build_object('table', 'homework_submissions', 'adopted', true, 'homework_id', v_hw.id,
                                    'student_id', v_student_id, 'class_id', v_map.class_id, 'wrote', v_grade);
      ELSE
        -- Written after the event is recorded, below: it references it.
        v_conflict := jsonb_build_object(
          'student_id', v_student_id,
          'ours', jsonb_build_object('status', v_row.grade, 'grade', v_row.grade, 'graded_at', v_row.graded_at,
                                     'homework_title', v_hw.title),
          'theirs', jsonb_build_object('status', v_grade, 'grade', v_grade, 'points', v_points,
                                       'feedback', v_feedback, 'homework_id', v_hw.id, 'homework_title', v_hw.title));
        v_outcome := 'conflict';
        v_note := format('HEC has the grade %s, Pixel Pal says %s. HEC kept its grade.', v_row.grade, v_grade);
      END IF;
      EXIT decide;
    END IF;

    -- ------------------------------------ a grade: write it
    -- A record replacing the sync's own earlier one inherits what HEC had
    -- before that, so withdrawing it restores HEC's and not the sync's.
    IF v_has_state THEN
      v_prev := v_state.prev;
    END IF;

    IF v_has_row THEN
      UPDATE public.homework_submissions
         SET grade = v_grade,
             teacher_feedback = COALESCE(v_feedback, teacher_feedback),
             status = 'graded',
             graded_at = v_made_at
       WHERE id = v_row.id;
    ELSE
      INSERT INTO public.homework_submissions
        (homework_id, student_id, status, grade, teacher_feedback, graded_at, submission_text)
      VALUES (v_hw.id, v_student_id, 'graded', v_grade, v_feedback, v_made_at, 'Graded in Pixel Pal');
    END IF;

    IF v_points IS NOT NULL THEN
      v_tx := public.stars_sync__award_grade(v_student_id, v_hw.id, v_points, v_grade, v_acting.user_id, v_date);
    END IF;

    INSERT INTO public.stars_sync_grade_state (homework_id, student_id, grade, points, event_id, seq, prev, updated_at)
    VALUES (v_hw.id, v_student_id, v_grade, COALESCE(v_points, v_state.points), v_event_id, v_seq, v_prev, p_now)
    ON CONFLICT (homework_id, student_id) DO UPDATE
      SET grade = EXCLUDED.grade, points = EXCLUDED.points, event_id = EXCLUDED.event_id,
          seq = EXCLUDED.seq, updated_at = EXCLUDED.updated_at;

    v_outcome := 'applied';
    v_note := format('Graded %s%s.', v_grade,
                     CASE WHEN v_points IS NULL THEN ''
                          ELSE format(', %s%s points', CASE WHEN v_points > 0 THEN '+' ELSE '' END, v_points) END);
    v_ref := jsonb_build_object('table', 'homework_submissions', 'homework_id', v_hw.id,
                                'student_id', v_student_id, 'class_id', v_map.class_id,
                                'wrote', v_grade, 'points', v_points, 'date', v_date, 'award_id', v_tx);
  END decide;

  PERFORM public.stars_sync__record(p_event, v_outcome, v_note, v_ref, p_now);

  IF v_conflict IS NOT NULL THEN
    INSERT INTO public.stars_sync_conflicts (event_id, student_id, session_id, ours, theirs, detected_at)
    VALUES (v_event_id, (v_conflict ->> 'student_id')::uuid, NULL, v_conflict -> 'ours', v_conflict -> 'theirs', p_now);
  END IF;

  RETURN jsonb_build_object('outcome', v_outcome, 'note', v_note, 'effects', '[]'::jsonb);
END $$;

-- ---------------------------------------------------------------- dispatch
-- Homework, grades and withdrawals of those go to the function above;
-- everything else goes where it always went.

CREATE OR REPLACE FUNCTION public.stars_sync__run_one(p_event jsonb, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res      jsonb;
  v_msg      text;
  v_kind     text := p_event ->> 'kind';
  v_target   text := p_event -> 'payload' ->> 'retracts_event_id';
  v_homework boolean := v_kind IN ('homework', 'grade');
BEGIN
  IF v_kind = 'retraction' AND v_target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT e.kind IN ('homework', 'grade') INTO v_homework
      FROM public.stars_sync_events e WHERE e.event_id = v_target::uuid;
  END IF;

  BEGIN
    IF COALESCE(v_homework, false) THEN
      v_res := public.stars_sync__apply_homework_event(p_event, p_now);
    ELSE
      v_res := public.stars_sync__apply_event(p_event, p_now);
    END IF;
  EXCEPTION
    -- HEC's own constraints refusing a write: the record is refused, and
    -- everything this event had done so far is rolled back with it.
    -- Anything else is not caught: it means something is wrong with the
    -- sync rather than with one record, and the page should stop.
    WHEN check_violation OR foreign_key_violation OR not_null_violation
      OR string_data_right_truncation OR numeric_value_out_of_range THEN
      GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
      PERFORM public.stars_sync__record(p_event, 'rejected', 'HEC refused this: ' || v_msg, NULL, p_now);
      v_res := jsonb_build_object('outcome', 'rejected', 'note', v_msg, 'effects', '[]'::jsonb);
  END;
  RETURN v_res;
END $$;

-- ---------------------------------------------------------------- settling
-- Same function, with a branch for a grade. A register conflict goes on
-- exactly as it did: everything from "the register" down is unchanged.

CREATE OR REPLACE FUNCTION public.stars_sync_resolve_conflict(p_conflict_id uuid, p_resolution text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        public.stars_sync_conflicts%ROWTYPE;
  v_event  public.stars_sync_events%ROWTYPE;
  v_row    public.attendance%ROWTYPE;
  v_sess   public.sessions%ROWTYPE;
  v_theirs text;
  v_sub    public.homework_submissions%ROWTYPE;
  v_hw     uuid;
  v_ref    text;
  v_points integer;
  v_prior  integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only an admin can resolve a sync conflict' USING ERRCODE = '42501';
  END IF;
  IF p_resolution IS NULL OR p_resolution NOT IN ('kept_ours', 'took_theirs') THEN
    RAISE EXCEPTION 'Unknown resolution %', p_resolution;
  END IF;

  SELECT * INTO v FROM public.stars_sync_conflicts WHERE id = p_conflict_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That conflict does not exist'; END IF;
  IF v.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'That conflict has already been settled - by another admin, or because Pixel Pal withdrew its mark. Nothing was changed.';
  END IF;

  IF p_resolution = 'took_theirs' THEN
    SELECT * INTO v_event FROM public.stars_sync_events WHERE event_id = v.event_id FOR UPDATE;
    IF NOT FOUND OR v_event.outcome <> 'conflict' THEN
      RAISE EXCEPTION 'Pixel Pal no longer stands by this mark. Nothing was changed.';
    END IF;

    IF v.theirs ? 'grade' THEN
      -- ---------------------------------- a grade
      v_theirs := v.theirs ->> 'grade';
      v_hw := (v.theirs ->> 'homework_id')::uuid;
      v_ref := v_event.raw -> 'payload' ->> 'homework_ref';
      IF EXISTS (SELECT 1 FROM public.stars_sync_events n
                  WHERE n.kind = 'grade'
                    AND n.stars_student_id = v_event.stars_student_id
                    AND n.raw -> 'payload' ->> 'homework_ref' = v_ref
                    AND n.seq > v_event.seq
                    AND n.outcome NOT IN ('retracted', 'duplicate')) THEN
        RAISE EXCEPTION 'Pixel Pal has sent a newer grade for this child and homework since. Nothing was changed.';
      END IF;
      SELECT * INTO v_sub FROM public.homework_submissions
       WHERE homework_id = v_hw AND student_id = v.student_id FOR UPDATE;
      IF NOT FOUND OR v_sub.grade IS DISTINCT FROM (v.ours ->> 'grade') THEN
        RAISE EXCEPTION 'The grade has changed since this was raised. Nothing was changed - reload and look again.';
      END IF;

      SELECT p.points INTO v_prior FROM public.point_transactions p
       WHERE p.type = 'homework' AND p.homework_id = v_hw AND p.student_id = v.student_id;

      UPDATE public.homework_submissions
         SET grade = v_theirs,
             teacher_feedback = COALESCE(v.theirs ->> 'feedback', teacher_feedback),
             status = 'graded',
             graded_at = now()
       WHERE id = v_sub.id;

      IF v.theirs ->> 'points' IS NOT NULL THEN
        v_points := (v.theirs ->> 'points')::integer;
        PERFORM public.stars_sync__award_grade(v.student_id, v_hw, v_points, v_theirs, auth.uid(),
                                               COALESCE(v_event.lesson_date, public.stars_sync__today(now())));
      END IF;

      INSERT INTO public.stars_sync_grade_state (homework_id, student_id, grade, points, event_id, seq, prev, updated_at)
      VALUES (v_hw, v.student_id, v_theirs, v_points, v.event_id, v_event.seq,
              jsonb_build_object('existed', true, 'status', v_sub.status, 'grade', v_sub.grade,
                                 'teacher_feedback', v_sub.teacher_feedback, 'graded_at', v_sub.graded_at,
                                 'award_points', v_prior),
              now())
      ON CONFLICT (homework_id, student_id) DO UPDATE
        SET grade = EXCLUDED.grade, points = EXCLUDED.points, event_id = EXCLUDED.event_id,
            seq = EXCLUDED.seq, prev = EXCLUDED.prev, updated_at = EXCLUDED.updated_at;

      UPDATE public.stars_sync_events
         SET outcome = 'applied',
             outcome_note = 'Applied by an admin after a conflict.',
             processed_at = now(),
             applied_ref = jsonb_build_object(
               'table', 'homework_submissions', 'homework_id', v_hw, 'student_id', v.student_id,
               'class_id', (SELECT h.class_id FROM public.homeworks h WHERE h.id = v_hw),
               'wrote', v_theirs, 'points', v_points, 'date', v_event.lesson_date)
       WHERE event_id = v.event_id;
    ELSE
      -- ---------------------------------- the register
      -- (10) Settles conflicts raised before a newer record could dismiss them.
      IF public.stars_sync__newer_mark_exists(v_event) THEN
        RAISE EXCEPTION 'Pixel Pal has sent a newer mark for this child and lesson since. Nothing was changed.';
      END IF;
      v_theirs := v.theirs ->> 'status';

      SELECT * INTO v_sess FROM public.sessions WHERE id = v.session_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'That lesson no longer exists. Nothing was changed.'; END IF;
      IF v_sess.status = 'Canceled' THEN
        RAISE EXCEPTION 'That lesson has been cancelled since; everybody on it is Excused. Nothing was changed.';
      END IF;

      SELECT * INTO v_row FROM public.attendance
       WHERE session_id = v.session_id AND student_id = v.student_id FOR UPDATE;
      IF NOT FOUND
         OR v_row.status IS DISTINCT FROM (v.ours ->> 'status')
         OR v_row.marked_by IS DISTINCT FROM (v.ours ->> 'marked_by')::uuid THEN
        RAISE EXCEPTION 'The register has changed since this was raised. Nothing was changed - reload and look again.';
      END IF;

      UPDATE public.attendance
         SET status = v_theirs, marked_by = auth.uid(), marked_at = now()
       WHERE session_id = v.session_id AND student_id = v.student_id;
      UPDATE public.sessions SET status = 'Held' WHERE id = v.session_id AND status = 'Scheduled';
      PERFORM public.stars_sync__queue_mark_effects(v.session_id, v_sess.class_id, v_sess.date, v.student_id, v_theirs);

      INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
      VALUES (v.session_id, v.student_id, v_theirs, v.event_id, now())
      ON CONFLICT (session_id, student_id) DO UPDATE
        SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;

      UPDATE public.stars_sync_events
         SET outcome = 'applied',
             outcome_note = 'Applied by an admin after a conflict.',
             processed_at = now(),
             applied_ref = jsonb_build_object(
               'table', 'attendance', 'adopted', true,
               'session_id', v.session_id, 'student_id', v.student_id,
               'class_id', v_sess.class_id, 'wrote', v_theirs)
       WHERE event_id = v.event_id;
    END IF;
  END IF;

  UPDATE public.stars_sync_conflicts
     SET resolved_at = now(), resolved_by = auth.uid(), resolution = p_resolution
   WHERE id = p_conflict_id;
END $$;

-- ---------------------------------------------------------------- status
-- homework_engine is how the admin page knows this has been applied: it
-- reads what the database reports, because the page ships separately.

CREATE OR REPLACE FUNCTION public.stars_sync_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule boolean := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Stars sync settings are for admins' USING ERRCODE = '42501';
  END IF;
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)' INTO v_schedule USING 'stars-sync';
  END IF;

  RETURN jsonb_build_object(
    'schedule_installed', v_schedule,
    'http_installed', to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL,
    'function_known', (SELECT function_url IS NOT NULL AND function_key IS NOT NULL
                         FROM public.stars_sync_secrets WHERE id),
    'running', (SELECT locked_until IS NOT NULL AND locked_until > now() FROM public.stars_sync_cursor WHERE id),
    'pending', (SELECT count(*) FROM public.stars_sync_events e WHERE public.stars_sync_is_pending(e.outcome)),
    'open_conflicts', (SELECT count(*) FROM public.stars_sync_conflicts WHERE resolved_at IS NULL),
    'effects_queued', (SELECT count(*) FROM public.stars_sync_effects),
    'effects_failing', (SELECT count(*) FROM public.stars_sync_effects WHERE attempts > 0),
    'homework_engine', true
  );
END $$;

-- ---------------------------------------------------------------- grants
-- Everything new writes children's records as somebody else, or helps to, so
-- no browser may reach it. stars_sync__run_one keeps the grants it has.

DO $do$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.stars_sync__acting_teacher(public.stars_class_map, uuid, text)',
    'public.stars_sync__award_grade(uuid, uuid, integer, text, uuid, date)',
    'public.stars_sync__apply_homework_event(jsonb, timestamp with time zone)',
    'public.stars_sync__run_one(jsonb, timestamp with time zone)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
  EXECUTE 'REVOKE ALL ON FUNCTION public.stars_sync_resolve_conflict(uuid, text) FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.stars_sync_resolve_conflict(uuid, text) TO authenticated';
  EXECUTE 'REVOKE ALL ON FUNCTION public.stars_sync_status() FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.stars_sync_status() TO authenticated';
END
$do$;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT
  to_regprocedure('public.stars_sync__apply_homework_event(jsonb,timestamp with time zone)') IS NOT NULL AS homework_engine,
  to_regclass('public.stars_sync_grade_state') IS NOT NULL AS grade_state,
  -- Records Pixel Pal already sent, waiting to apply on the next run.
  (SELECT count(*) FROM public.stars_sync_events
    WHERE kind IN ('homework', 'grade') AND outcome = 'skipped_unsupported') AS waiting_to_apply;
