-- Stars sync: eight defects found in review of 20261027100000, fixed.
--
-- 20261027100000 is applied in production, so it stays as history and
-- everything below replaces it in place. Each fix is named where it lands.
--
--  1. "Use Pixel Pal's" on a conflict wrote the register first and checked
--     afterwards whether the conflict was still open - in a separate
--     request. If Pixel Pal had withdrawn the mark in the meantime, or a
--     second admin had settled it, a teacher's mark was overwritten with a
--     value nobody wanted. stars_sync_resolve_conflict now does the whole
--     thing in one transaction, and refuses unless the conflict is open,
--     Pixel Pal still stands by its mark, and the register still shows
--     what it showed when the conflict was raised.
--  2. (admin page only - the start-date field saved every keystroke.)
--  3. Withdrawing a points award posted a compensating entry even when the
--     award had since been deleted or edited in HEC, taking points the
--     child no longer had. It now checks the award first.
--  4. A withdrawal was put through the lesson-date checks before it could
--     withdraw anything, so one with a missing date left its target
--     waiting - and the target could then apply later. Withdrawals are now
--     handled before any date check.
--  5. Withdrawing every synced mark on a lesson left it Held - paid - with
--     nothing on its register. The sync now records the lessons it flipped
--     to Held, and puts one back to Scheduled when its own marks are gone
--     and nobody else has marked it.
--  6. A register mark that waited on set-up (a child not yet matched, a
--     lesson not yet generated) was judged against the 24-hour window at
--     the time of the RETRY, and refused once fixed. Worse, the very first
--     run would have refused every historical mark after the start date.
--     The window is now judged at the time the mark was made: Pixel Pal's
--     occurred_at where it is plausible, otherwise when HEC first received
--     it.
--  7. Any register row with marked_by NULL was treated as a seeded
--     placeholder. repair-attendance writes an admin's chosen status that
--     way too, so an admin's "Excused" could be overwritten. A placeholder
--     is now marked_by NULL AND Present - anything else is a decision.
--  8. Tuition recalculation and streaks ran after the page committed, in
--     the edge function, best effort. calculate-tuition allows 30 calls a
--     minute and refusals were only logged, so a large run could leave
--     children's tuition stale with the run reporting success; and a
--     function killed between the commit and the after-effects lost them
--     for good. They are now queued in stars_sync_effects in the same
--     transaction as the mark - so they cannot be lost - and the edge
--     function drains the queue a bounded amount per run, keeping anything
--     refused for the next one.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.stars_sync__apply_event(jsonb,timestamp with time zone)') IS NULL THEN
    RAISE EXCEPTION 'apply 20261027100000_stars_sync_engine.sql first';
  END IF;
END $$;

-- ---------------------------------------------------------------- 8
-- The after-effects outbox. One row per thing still to do; the dedupe
-- key makes a second request for the same thing a no-op - one tuition
-- recalculation per child per month, one streak step per child per lesson.

CREATE TABLE IF NOT EXISTS public.stars_sync_effects (
  id          bigserial PRIMARY KEY,
  kind        text NOT NULL CHECK (kind IN ('tuition', 'streak')),
  dedupe_key  text NOT NULL UNIQUE,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id  uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  lesson_date date,
  month       text,
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  queued_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stars_sync_effects_shape CHECK (
    (kind = 'tuition' AND month ~ '^[0-9]{4}-[0-9]{2}$')
    OR (kind = 'streak' AND class_id IS NOT NULL AND session_id IS NOT NULL))
);

-- ---------------------------------------------------------------- 5
-- Lessons the sync itself turned from Scheduled to Held.
CREATE TABLE IF NOT EXISTS public.stars_sync_held_flips (
  session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_id   uuid NOT NULL,
  flipped_at timestamptz NOT NULL DEFAULT now()
);

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stars_sync_effects', 'stars_sync_held_flips'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_read', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (public.has_role(auth.uid(), ''admin''::public.app_role))', t || '_admin_read', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
  GRANT USAGE, SELECT ON SEQUENCE public.stars_sync_effects_id_seq TO service_role;
END
$do$;

-- What a register mark owes, queued. Mirrors what mark-attendance runs
-- inline: tuition for Absent or Excused, a streak step for Present. A
-- mark that stops being Present before its streak is drained takes the
-- streak back out, so a child is never credited for a lesson they ended
-- up missing.
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
  IF p_status = 'Present' THEN
    INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, class_id, session_id, lesson_date)
    VALUES ('streak', v_streak_key, p_student, p_class, p_session, p_date)
    ON CONFLICT (dedupe_key) DO NOTHING;
  ELSE
    DELETE FROM public.stars_sync_effects WHERE dedupe_key = v_streak_key;
  END IF;

  IF p_status IN ('Absent', 'Excused') THEN
    PERFORM public.stars_sync__queue_tuition(p_student, to_char(p_date, 'YYYY-MM'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.stars_sync__queue_tuition(p_student uuid, p_month text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.stars_sync_effects (kind, dedupe_key, student_id, month)
  VALUES ('tuition', 'tuition:' || p_student || ':' || p_month, p_student, p_month)
  ON CONFLICT (dedupe_key) DO NOTHING;
$$;

-- A queued job that was tried and refused: counted, with the reason, and
-- left in the queue for the next run.
CREATE OR REPLACE FUNCTION public.stars_sync_effect_failed(p_ids bigint[], p_error text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stars_sync_effects
     SET attempts = attempts + 1, last_error = left(p_error, 500)
   WHERE id = ANY (p_ids);
$$;

CREATE INDEX IF NOT EXISTS stars_sync_effects_drain_idx ON public.stars_sync_effects (attempts, id);

-- ---------------------------------------------------------------- 6
-- When a record was made, for the 24-hour window. Pixel Pal's own
-- occurred_at when it is a timestamp no later than HEC received the
-- record and no more than 60 days before; otherwise when HEC received it.
-- A record waiting on set-up keeps the time it was made, so fixing the
-- set-up late does not turn an on-time mark into a late one.
CREATE OR REPLACE FUNCTION public.stars_sync__made_at(p_event jsonb, p_received timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
-- STABLE, not IMMUTABLE: a timestamp without an offset is read in the
-- session's time zone.
STABLE
AS $$
DECLARE
  v_occ timestamptz;
BEGIN
  IF (p_event ->> 'occurred_at') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}' THEN
    BEGIN
      v_occ := (p_event ->> 'occurred_at')::timestamptz;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format OR invalid_text_representation THEN
      v_occ := NULL;
    END;
  END IF;
  IF v_occ IS NOT NULL AND v_occ <= p_received AND v_occ >= p_received - interval '60 days' THEN
    RETURN v_occ;
  END IF;
  RETURN p_received;
END $$;

-- ---------------------------------------------------------------- 1-8
-- One event. Same contract as before - {outcome, note, effects} - but
-- effects is now always empty: they are queued, not returned.

CREATE OR REPLACE FUNCTION public.stars_sync__apply_event(p_event jsonb, p_now timestamptz)
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
  v_date        date;
  v_today       date := public.stars_sync__today(p_now);
  v_made_at     timestamptz;

  v_outcome     text;
  v_note        text;
  v_ref         jsonb;
  v_conflict    jsonb;

  v_map         public.stars_class_map%ROWTYPE;
  v_class_name  text;
  v_teacher_id  uuid;
  v_teacher     record;
  v_student_id  uuid;
  v_student_nm  text;

  v_status      text;
  v_live        integer;
  v_cancelled   integer;
  v_session     public.sessions%ROWTYPE;
  v_start       timestamptz;
  v_end         timestamptz;
  v_row         public.attendance%ROWTYPE;
  v_has_row     boolean;
  v_state       public.stars_sync_attendance_state%ROWTYPE;
  v_has_state   boolean;
  v_prev        jsonb;
  v_flipped     integer;

  v_points      integer;
  v_category    text;
  v_day_total   integer;
  v_session_id  uuid;
  v_tx          uuid;
  v_orig        public.point_transactions%ROWTYPE;

  v_target_id   uuid;
  v_target      public.stars_sync_events%ROWTYPE;
  v_tref        jsonb;
BEGIN
  v_event_id := public.stars_sync__event_id(p_event);

  SELECT * INTO v_existing FROM public.stars_sync_events WHERE event_id = v_event_id;
  IF FOUND AND NOT public.stars_sync_is_pending(v_existing.outcome) THEN
    RETURN jsonb_build_object('outcome', 'already_done');
  END IF;
  -- (6) the time this record was made, fixed at first receipt
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
      -- ------------------------------------- (4) withdrawals come first
      -- Before any date check: a withdrawal points at another record and
      -- needs nothing of its own date to withdraw it.
      IF (v_payload ->> 'retracts_event_id') IS NULL
         OR (v_payload ->> 'retracts_event_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_outcome := 'rejected';
        v_note := 'The retraction does not name a valid record.';
        EXIT decide;
      END IF;
      v_target_id := (v_payload ->> 'retracts_event_id')::uuid;

      SELECT * INTO v_target FROM public.stars_sync_events WHERE event_id = v_target_id FOR UPDATE;
      IF NOT FOUND THEN
        v_outcome := 'rejected';
        v_note := 'This withdraws a record HEC never received.';
        EXIT decide;
      END IF;
      IF v_target.kind = 'retraction' THEN
        v_outcome := 'rejected';
        v_note := 'Withdrawing a withdrawal is not supported.';
        EXIT decide;
      END IF;
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
        UPDATE public.stars_sync_events
           SET outcome = 'retracted',
               outcome_note = 'Withdrawn in Pixel Pal; HEC''s own mark was left as it is.',
               processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'Withdrew a mark HEC already had. Nothing in HEC changed.';
        v_ref := jsonb_build_object('withdrew', v_target_id);
        EXIT decide;
      END IF;

      -- Undoing a write changes a child's record, so it needs the same
      -- permission the write did - in the class it was written to.
      SELECT * INTO v_map FROM public.stars_class_map WHERE class_id = (v_tref ->> 'class_id')::uuid;
    ELSE
      -- ------------------------------------- shape and date
      IF (p_event ->> 'lesson_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        BEGIN
          v_date := (p_event ->> 'lesson_date')::date;
        EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
          v_date := NULL;
        END;
      END IF;
      IF v_date IS NULL THEN
        v_outcome := 'rejected';
        v_note := 'The lesson date is missing or is not a date.';
        EXIT decide;
      END IF;
      IF v_date < c.sync_from THEN
        v_outcome := 'skipped_before_start';
        v_note := format('The lesson (%s) is before the sync start date (%s).', v_date, c.sync_from);
        EXIT decide;
      END IF;
      IF v_date > v_today THEN
        v_outcome := 'rejected';
        v_note := format('The lesson date %s is in the future.', v_date);
        EXIT decide;
      END IF;
      IF v_date < v_today - 60 THEN
        v_outcome := 'rejected';
        v_note := format('The lesson (%s) is more than 60 days old.', v_date);
        EXIT decide;
      END IF;
      IF v_kind IS NULL OR v_kind NOT IN ('attendance', 'points') THEN
        v_outcome := 'skipped_unsupported';
        v_note := format('Pixel Pal sent a "%s" record. HEC does not take these yet; it is kept and will apply when it does.',
                         COALESCE(v_kind, '?'));
        EXIT decide;
      END IF;
      SELECT * INTO v_map FROM public.stars_class_map WHERE stars_class_id = v_class_ref;
    END IF;

    -- ------------------------------------------------ class and teacher
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

    v_teacher_id := COALESCE(v_map.teacher_id, c.default_teacher_id);
    IF v_teacher_id IS NULL THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('No teacher is chosen for %s.', v_class_name);
      EXIT decide;
    END IF;
    SELECT t.id, t.full_name, t.is_active, t.user_id,
           EXISTS (SELECT 1 FROM public.user_roles r
                    WHERE r.user_id = t.user_id
                      AND r.role IN ('teacher'::public.app_role, 'admin'::public.app_role)) AS has_role
      INTO v_teacher
      FROM public.teachers t WHERE t.id = v_teacher_id;
    IF NOT FOUND THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('The teacher chosen for %s no longer exists.', v_class_name);
      EXIT decide;
    END IF;
    IF NOT v_teacher.is_active THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('%s is archived.', v_teacher.full_name);
      EXIT decide;
    END IF;
    IF v_teacher.user_id IS NULL THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('%s has no login, so nothing can be recorded as them.', v_teacher.full_name);
      EXIT decide;
    END IF;
    IF NOT v_teacher.has_role THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('%s does not hold the teacher role.', v_teacher.full_name);
      EXIT decide;
    END IF;
    IF NOT COALESCE(public.is_teacher_of_class(v_teacher.user_id, v_map.class_id), false) THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('%s does not teach %s in HEC, so cannot record this.', v_teacher.full_name, v_class_name);
      EXIT decide;
    END IF;

    -- ------------------------------------------------ retraction, part 2
    IF v_kind = 'retraction' THEN
      IF v_target.kind = 'points' THEN
        -- (3) Only undo what is still there as the sync left it.
        SELECT * INTO v_orig FROM public.point_transactions
         WHERE id = (v_tref ->> 'id')::uuid FOR UPDATE;
        IF NOT FOUND
           OR v_orig.points IS DISTINCT FROM (v_tref ->> 'points')::integer
           OR v_orig.student_id IS DISTINCT FROM (v_tref ->> 'student_id')::uuid
           OR v_orig.class_id IS DISTINCT FROM (v_tref ->> 'class_id')::uuid THEN
          UPDATE public.stars_sync_events
             SET outcome = 'retracted',
                 outcome_note = 'Withdrawn in Pixel Pal; the award had already been removed or changed in HEC, so it was left.',
                 processed_at = p_now
           WHERE event_id = v_target_id;
          v_outcome := 'applied';
          v_note := 'The award had been removed or changed in HEC already; nothing more was taken.';
          v_ref := jsonb_build_object('withdrew', v_target_id);
          EXIT decide;
        END IF;

        INSERT INTO public.point_transactions
          (student_id, class_id, points, type, date, month, notes, created_by)
        VALUES (v_orig.student_id, v_orig.class_id, -v_orig.points, v_orig.type, v_orig.date,
                to_char(v_orig.date, 'YYYY-MM'),
                left('[Pixel Pal] withdrawn: ' || COALESCE(v_payload ->> 'reason', ''), 500),
                v_teacher.user_id)
        RETURNING id INTO v_tx;

        UPDATE public.stars_sync_events
           SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; compensated.', processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := format('Withdrew %s points with a compensating entry.', v_orig.points);
        v_ref := jsonb_build_object('table', 'point_transactions', 'id', v_tx,
                                    'compensates', v_orig.id, 'withdrew', v_target_id);
        EXIT decide;
      END IF;

      -- attendance
      SELECT * INTO v_session FROM public.sessions WHERE id = (v_tref ->> 'session_id')::uuid FOR UPDATE;
      IF NOT FOUND THEN
        UPDATE public.stars_sync_events
           SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; the lesson no longer exists in HEC.', processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'Withdrew a mark on a lesson HEC no longer has.';
        EXIT decide;
      END IF;

      v_end := (v_session.date + COALESCE(v_session.end_time, time '23:59')) AT TIME ZONE 'Asia/Bangkok';
      IF COALESCE(v_session.end_time, time '23:59') <= COALESCE(v_session.start_time, time '00:00') THEN
        v_end := v_end + interval '1 day';
      END IF;
      IF v_made_at > v_end + interval '24 hours' THEN
        v_outcome := 'rejected';
        v_note := 'This would change a register more than 24 hours after the lesson ended. A teacher could not do that in HEC either; an admin can.';
        EXIT decide;
      END IF;

      v_student_id := (v_tref ->> 'student_id')::uuid;
      SELECT * INTO v_row FROM public.attendance
       WHERE session_id = v_session.id AND student_id = v_student_id FOR UPDATE;
      v_has_row := FOUND;

      IF NOT v_has_row OR v_row.status IS DISTINCT FROM (v_tref ->> 'wrote') THEN
        DELETE FROM public.stars_sync_attendance_state
         WHERE session_id = v_session.id AND student_id = v_student_id;
        UPDATE public.stars_sync_events
           SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; the mark had already been changed in HEC, so it was left.', processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := 'The register had been changed in HEC since; HEC''s value was kept.';
        EXIT decide;
      END IF;

      v_prev := v_tref -> 'prev';
      IF COALESCE((v_prev ->> 'existed')::boolean, false) THEN
        UPDATE public.attendance
           SET status    = v_prev ->> 'status',
               marked_by = (v_prev ->> 'marked_by')::uuid,
               marked_at = COALESCE((v_prev ->> 'marked_at')::timestamptz, marked_at),
               notes     = v_prev ->> 'notes'
         WHERE session_id = v_session.id AND student_id = v_student_id;
        IF v_prev ->> 'marked_by' IS NULL THEN
          DELETE FROM public.stars_sync_attendance_state
           WHERE session_id = v_session.id AND student_id = v_student_id;
          DELETE FROM public.stars_sync_effects
           WHERE dedupe_key = 'streak:' || v_session.id || ':' || v_student_id;
        ELSE
          INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
          VALUES (v_session.id, v_student_id, v_prev ->> 'status', v_target_id, p_now)
          ON CONFLICT (session_id, student_id) DO UPDATE
            SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;
          PERFORM public.stars_sync__queue_mark_effects(
            v_session.id, v_session.class_id, v_session.date, v_student_id, v_prev ->> 'status');
        END IF;
        v_note := format('Restored the register to %s.', v_prev ->> 'status');
      ELSE
        DELETE FROM public.attendance WHERE session_id = v_session.id AND student_id = v_student_id;
        DELETE FROM public.stars_sync_attendance_state
         WHERE session_id = v_session.id AND student_id = v_student_id;
        DELETE FROM public.stars_sync_effects
         WHERE dedupe_key = 'streak:' || v_session.id || ':' || v_student_id;
        v_note := 'Removed the mark; there was none before it.';
      END IF;
      -- The status changed, so this child's month is recalculated.
      PERFORM public.stars_sync__queue_tuition(v_student_id, to_char(v_session.date, 'YYYY-MM'));

      -- (5) If the sync made this lesson Held and no marks are left on it -
      -- nobody's, and no admin decision either - put it back.
      IF v_session.status = 'Held'
         AND EXISTS (SELECT 1 FROM public.stars_sync_held_flips f WHERE f.session_id = v_session.id)
         AND NOT EXISTS (SELECT 1 FROM public.attendance a
                          WHERE a.session_id = v_session.id
                            AND (a.marked_by IS NOT NULL OR a.status <> 'Present')) THEN
        UPDATE public.sessions SET status = 'Scheduled' WHERE id = v_session.id AND status = 'Held';
        DELETE FROM public.stars_sync_held_flips WHERE session_id = v_session.id;
        v_note := v_note || ' The sync had marked this lesson Held and no marks remain, so it is Scheduled again.';
      END IF;

      UPDATE public.stars_sync_events
         SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; restored.', processed_at = p_now
       WHERE event_id = v_target_id;
      v_outcome := 'applied';
      v_ref := jsonb_build_object('table', 'attendance', 'session_id', v_session.id,
                                  'student_id', v_student_id, 'withdrew', v_target_id);
      EXIT decide;
    END IF;

    -- ------------------------------------------------ the child
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

    -- ------------------------------------------------ attendance
    IF v_kind = 'attendance' THEN
      v_status := v_payload ->> 'status';
      IF v_status IS NULL OR v_status NOT IN ('Present', 'Absent', 'Excused', 'Late') THEN
        v_outcome := 'rejected';
        v_note := format('"%s" is not an attendance status HEC knows.', COALESCE(v_status, ''));
        EXIT decide;
      END IF;

      SELECT count(*) FILTER (WHERE s.status <> 'Canceled'),
             count(*) FILTER (WHERE s.status = 'Canceled')
        INTO v_live, v_cancelled
        FROM public.sessions s
       WHERE s.class_id = v_map.class_id AND s.date = v_date;
      IF v_live = 0 AND v_cancelled > 0 THEN
        v_outcome := 'rejected';
        v_note := format('The %s lesson on %s is cancelled in HEC. Everybody on it is Excused.', v_class_name, v_date);
        EXIT decide;
      END IF;
      IF v_live = 0 THEN
        v_outcome := 'skipped_no_session';
        v_note := format('HEC has no %s lesson on %s yet.', v_class_name, v_date);
        EXIT decide;
      END IF;
      IF v_live > 1 THEN
        v_outcome := 'rejected';
        v_note := format('HEC has %s %s lessons on %s and Pixel Pal does not say which this is.', v_live, v_class_name, v_date);
        EXIT decide;
      END IF;

      SELECT * INTO v_session FROM public.sessions s
       WHERE s.class_id = v_map.class_id AND s.date = v_date AND s.status <> 'Canceled'
       FOR UPDATE;

      v_start := (v_session.date + COALESCE(v_session.start_time, time '00:00')) AT TIME ZONE 'Asia/Bangkok';
      v_end   := (v_session.date + COALESCE(v_session.end_time,   time '23:59')) AT TIME ZONE 'Asia/Bangkok';
      IF COALESCE(v_session.end_time, time '23:59') <= COALESCE(v_session.start_time, time '00:00') THEN
        v_end := v_end + interval '1 day';
      END IF;
      -- Has the lesson started? Asked of now: it is about the lesson.
      IF p_now < v_start + interval '5 minutes' THEN
        v_outcome := 'skipped_not_permitted';
        v_note := 'The lesson has not started in HEC yet. This will apply five minutes after it does.';
        EXIT decide;
      END IF;
      -- (6) Was the mark made in time? Asked of when it was made.
      IF v_made_at > v_end + interval '24 hours' THEN
        v_outcome := 'rejected';
        v_note := 'This was recorded more than 24 hours after the lesson ended. A teacher could not change it in HEC either; an admin can.';
        EXIT decide;
      END IF;

      SELECT * INTO v_row FROM public.attendance
       WHERE session_id = v_session.id AND student_id = v_student_id FOR UPDATE;
      v_has_row := FOUND;
      SELECT * INTO v_state FROM public.stars_sync_attendance_state
       WHERE session_id = v_session.id AND student_id = v_student_id;
      v_has_state := FOUND;

      -- (7) A seeded placeholder is Present with nobody's name on it.
      -- Anything else is a decision somebody made - a teacher's mark, or an
      -- admin's repair - unless the sync wrote it and it is unchanged.
      IF v_has_row
         AND NOT (v_row.marked_by IS NULL AND v_row.status = 'Present')
         AND NOT (v_has_state AND v_state.status = v_row.status AND v_row.marked_by IS NOT NULL) THEN
        IF v_row.status = v_status THEN
          INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
          VALUES (v_session.id, v_student_id, v_status, v_event_id, p_now)
          ON CONFLICT (session_id, student_id) DO UPDATE
            SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;
          v_outcome := 'applied';
          v_note := format('HEC already had %s.', v_status);
          v_ref := jsonb_build_object('table', 'attendance', 'adopted', true,
                                      'session_id', v_session.id, 'student_id', v_student_id,
                                      'class_id', v_map.class_id, 'wrote', v_status);
        ELSE
          v_conflict := jsonb_build_object(
            'student_id', v_student_id, 'session_id', v_session.id,
            'ours', jsonb_build_object('status', v_row.status, 'marked_by', v_row.marked_by, 'marked_at', v_row.marked_at),
            'theirs', jsonb_build_object('status', v_status));
          v_outcome := 'conflict';
          v_note := format('HEC has %s, Pixel Pal says %s. HEC kept its mark.', v_row.status, v_status);
        END IF;
        EXIT decide;
      END IF;

      IF v_has_row AND v_row.marked_by IS NOT NULL AND v_row.status = v_status THEN
        UPDATE public.stars_sync_attendance_state
           SET event_id = v_event_id, updated_at = p_now
         WHERE session_id = v_session.id AND student_id = v_student_id;
        v_outcome := 'applied';
        v_note := format('Already %s.', v_status);
        v_ref := jsonb_build_object('table', 'attendance', 'session_id', v_session.id,
                                    'student_id', v_student_id, 'class_id', v_map.class_id,
                                    'wrote', v_status,
                                    'prev', jsonb_build_object('existed', true, 'status', v_row.status,
                                                               'marked_by', v_row.marked_by,
                                                               'marked_at', v_row.marked_at,
                                                               'notes', v_row.notes));
        EXIT decide;
      END IF;

      v_prev := CASE WHEN v_has_row
        THEN jsonb_build_object('existed', true, 'status', v_row.status, 'marked_by', v_row.marked_by,
                                'marked_at', v_row.marked_at, 'notes', v_row.notes)
        ELSE jsonb_build_object('existed', false) END;

      INSERT INTO public.attendance (session_id, student_id, status, notes, marked_by, marked_at)
      VALUES (v_session.id, v_student_id, v_status, 'Pixel Pal', v_teacher.user_id, p_now)
      ON CONFLICT (session_id, student_id) DO UPDATE
        SET status    = EXCLUDED.status,
            notes     = EXCLUDED.notes,
            marked_by = EXCLUDED.marked_by,
            marked_at = EXCLUDED.marked_at;

      UPDATE public.sessions SET status = 'Held'
       WHERE id = v_session.id AND status = 'Scheduled';
      GET DIAGNOSTICS v_flipped = ROW_COUNT;
      IF v_flipped > 0 THEN
        INSERT INTO public.stars_sync_held_flips (session_id, event_id, flipped_at)
        VALUES (v_session.id, v_event_id, p_now)
        ON CONFLICT (session_id) DO NOTHING;
      END IF;

      INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
      VALUES (v_session.id, v_student_id, v_status, v_event_id, p_now)
      ON CONFLICT (session_id, student_id) DO UPDATE
        SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;

      -- (8) queued with the mark, so it cannot be lost after the commit
      PERFORM public.stars_sync__queue_mark_effects(
        v_session.id, v_map.class_id, v_session.date, v_student_id, v_status);

      v_outcome := 'applied';
      v_note := format('Marked %s.', v_status);
      v_ref := jsonb_build_object('table', 'attendance', 'session_id', v_session.id,
                                  'student_id', v_student_id, 'class_id', v_map.class_id,
                                  'wrote', v_status, 'prev', v_prev);
      EXIT decide;
    END IF;

    -- ------------------------------------------------ points
    IF jsonb_typeof(v_payload -> 'points') IS DISTINCT FROM 'number'
       OR (v_payload ->> 'points') !~ '^-?[0-9]{1,6}$' THEN
      v_outcome := 'rejected';
      v_note := 'The points value is not a whole number.';
      EXIT decide;
    END IF;
    v_points := (v_payload ->> 'points')::integer;
    v_category := v_payload ->> 'category';
    IF v_points = 0 THEN
      v_outcome := 'rejected';
      v_note := 'An award of zero points changes nothing.';
      EXIT decide;
    END IF;
    IF v_category IS NULL OR v_category NOT IN
       ('homework', 'participation', 'adjustment', 'reading_theory', 'vocabulary_quiz') THEN
      v_outcome := 'rejected';
      v_note := format('"%s" is not a points category HEC knows.', COALESCE(v_category, ''));
      EXIT decide;
    END IF;
    IF abs(v_points) > c.max_points_per_event THEN
      v_outcome := 'rejected';
      v_note := format('%s points is over the limit of %s for one award. Raise the limit on the Stars Sync page if it was meant.',
                       v_points, c.max_points_per_event);
      EXIT decide;
    END IF;
    IF v_points > 0 THEN
      SELECT COALESCE(sum((e.applied_ref ->> 'points')::integer), 0) INTO v_day_total
        FROM public.stars_sync_events e
       WHERE e.kind = 'points' AND e.outcome = 'applied'
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

    SELECT CASE WHEN count(*) = 1 THEN min(s.id::text)::uuid END INTO v_session_id
      FROM public.sessions s
     WHERE s.class_id = v_map.class_id AND s.date = v_date AND s.status <> 'Canceled';

    INSERT INTO public.point_transactions
      (student_id, class_id, session_id, points, type, date, month, notes, created_by)
    VALUES (v_student_id, v_map.class_id, v_session_id, v_points, v_category, v_date,
            to_char(v_date, 'YYYY-MM'),
            left('[Pixel Pal] ' || COALESCE(v_payload ->> 'reason', ''), 500),
            v_teacher.user_id)
    RETURNING id INTO v_tx;

    v_outcome := 'applied';
    v_note := format('%s%s points (%s).', CASE WHEN v_points > 0 THEN '+' ELSE '' END, v_points, v_category);
    v_ref := jsonb_build_object('table', 'point_transactions', 'id', v_tx,
                                'student_id', v_student_id, 'class_id', v_map.class_id,
                                'date', v_date, 'points', v_points, 'type', v_category);
  END decide;

  PERFORM public.stars_sync__record(p_event, v_outcome, v_note, v_ref, p_now);

  IF v_conflict IS NOT NULL THEN
    INSERT INTO public.stars_sync_conflicts (event_id, student_id, session_id, ours, theirs, detected_at)
    VALUES (v_event_id, (v_conflict ->> 'student_id')::uuid, (v_conflict ->> 'session_id')::uuid,
            v_conflict -> 'ours', v_conflict -> 'theirs', p_now);
  END IF;

  RETURN jsonb_build_object('outcome', v_outcome, 'note', v_note, 'effects', '[]'::jsonb);
END $$;

-- ---------------------------------------------------------------- 1
-- Settling a conflict: checks and write in one transaction.
--
-- "Use Pixel Pal's" no longer calls mark-attendance from the browser and
-- then records the resolution in a second request. It is refused, with
-- nothing written, unless: the conflict is still open; Pixel Pal still
-- stands by its mark (the record was not withdrawn); and the register
-- still shows exactly what it showed when the conflict was raised. Then
-- it writes the register as the admin, does what a mark does (Held,
-- queued tuition and streak), and records the resolution - all or none.
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

  UPDATE public.stars_sync_conflicts
     SET resolved_at = now(), resolved_by = auth.uid(), resolution = p_resolution
   WHERE id = p_conflict_id;
END $$;

-- ---------------------------------------------------------------- status
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
    'effects_failing', (SELECT count(*) FROM public.stars_sync_effects WHERE attempts > 0)
  );
END $$;

-- ---------------------------------------------------------------- grants
DO $do$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.stars_sync__queue_mark_effects(uuid, uuid, date, uuid, text)',
    'public.stars_sync__queue_tuition(uuid, text)',
    'public.stars_sync__made_at(jsonb, timestamp with time zone)',
    'public.stars_sync__apply_event(jsonb, timestamp with time zone)',
    -- helpers from 20261027100000 that were left executable by PUBLIC
    'public.stars_sync__today(timestamp with time zone)',
    'public.stars_sync__tally(jsonb, text)',
    'public.stars_sync_is_pending(text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;

  EXECUTE 'REVOKE ALL ON FUNCTION public.stars_sync_effect_failed(bigint[], text) FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.stars_sync_effect_failed(bigint[], text) TO service_role';
  EXECUTE 'REVOKE ALL ON FUNCTION public.stars_sync_resolve_conflict(uuid, text) FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.stars_sync_resolve_conflict(uuid, text) TO authenticated';
  EXECUTE 'REVOKE ALL ON FUNCTION public.stars_sync_status() FROM PUBLIC, anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.stars_sync_status() TO authenticated';
END
$do$;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT
  to_regclass('public.stars_sync_effects') IS NOT NULL        AS effects_queue,
  to_regclass('public.stars_sync_held_flips') IS NOT NULL     AS held_flips,
  to_regprocedure('public.stars_sync__made_at(jsonb,timestamp with time zone)') IS NOT NULL AS window_fix;
