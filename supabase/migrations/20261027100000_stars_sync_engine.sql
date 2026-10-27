-- Stars sync: the engine. Reads what Pixel Pal recorded and applies it
-- to HEC as the chosen teacher.
--
-- Builds on 20261023100000 (the tables and the admin tab) and needs
-- 20261023090000 (the points rollup) and 20261027090000 (the
-- cancelled-lesson guard). The edge function stars-sync fetches the feed
-- and calls stars_sync_apply_page; everything that decides what happens
-- to a child's record is here, in one transaction per page, so it can be
-- tested against the real schema and cannot half-happen.
--
-- HOW "ONLY WHAT THAT TEACHER CAN DO" IS ENFORCED. Not by impersonating
-- the teacher through row-level security. HEC's own attendance path,
-- mark-attendance, does not do that either: it runs on the service key
-- and asks is_teacher_of_class(user, class) - roster permanently, or
-- cover within 7 days of a lesson - and refuses if the answer is no. The
-- sync asks exactly that function, for the chosen teacher, before every
-- write. One definition of "your class", and it lives in the database.
--
-- WHAT A SYNCED MARK DOES. The same as a teacher pressing save in HEC:
-- the register row, and the lesson flipped from Scheduled to Held -
-- which is what calculate-payroll pays the teacher for. A sync that wrote
-- only the row would leave every Pixel Pal lesson unpaid. Tuition
-- recalculation and attendance streaks run after commit, in the edge
-- function, through the module mark-attendance itself now uses.
--
-- A TEACHER'S MARK IS NEVER OVERWRITTEN. HEC seeds every register with
-- placeholder rows - Present, marked_by NULL - so "a row exists" means
-- nothing. The sync may write over:
--   * no row, or a placeholder (marked_by IS NULL);
--   * a row it wrote itself and nobody has changed since - tracked in
--     stars_sync_attendance_state, compared by value.
-- Anything else that differs is a conflict for an admin, and HEC keeps
-- what it has. Anything else that agrees is adopted, so the next change
-- from Pixel Pal flows through.
--
-- A RETRACTION RESTORES, IT DOES NOT DELETE. Pixel Pal sends a changed
-- register as a retraction followed by a new mark. Deleting on the
-- retraction would leave a blank register in between, and a blank one for
-- good if the replacement were then refused. Restoring the value the sync
-- overwrote leaves a valid register at every step.
--
-- NOTHING IS LOST. A record for an unmatched child, an unmapped class, a
-- lesson HEC has not generated yet or a teacher not yet on the roster is
-- kept and retried every run, until it applies or turns 60 days old. A
-- retraction withdraws a record that never applied without touching
-- anything, so a withdrawn record can never apply later.
--
-- Also: drops trigger_recalculate_points_on_delete. See section 1.

BEGIN;

-- ---------------------------------------------------------------- 0
DO $$
BEGIN
  IF to_regclass('public.stars_sync_connection') IS NULL THEN
    RAISE EXCEPTION 'apply 20261023100000_stars_sync_foundation.sql first';
  END IF;
  IF to_regprocedure('public.recompute_student_points(uuid,uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'apply 20261023090000_homework_grading_integrity.sql first';
  END IF;
  IF to_regprocedure('public.guard_cancelled_session_attendance()') IS NULL THEN
    RAISE EXCEPTION 'apply 20261027090000_cancelled_lesson_attendance_guard.sql first';
  END IF;
  IF to_regprocedure('public.is_teacher_of_class(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'public.is_teacher_of_class(uuid, uuid) is missing; the sync asks it before every write';
  END IF;
END $$;

-- ---------------------------------------------------------------- 1
-- trigger_recalculate_points_on_delete (20251226104556) recomputes
-- homework and participation on delete, with a participation bucket of
-- participation + adjustment only - no correction, no early_submission -
-- and never touches reading_theory or vocabulary_quiz. Since
-- 20261023090000, trigger_update_points_from_transaction also fires on
-- DELETE and recomputes all four buckets correctly. Both ran; the right
-- answer won only because AFTER triggers fire in name order and "u"
-- sorts after "r". Correct by alphabet is not correct.

DROP TRIGGER IF EXISTS trigger_recalculate_points_on_delete ON public.point_transactions;

-- ---------------------------------------------------------------- 2
-- What an event can come to. The skipped_* outcomes other than
-- skipped_before_start are PENDING: kept, and retried every run.

ALTER TABLE public.stars_sync_events DROP CONSTRAINT IF EXISTS stars_sync_events_outcome_check;
ALTER TABLE public.stars_sync_events ADD CONSTRAINT stars_sync_events_outcome_check
  CHECK (outcome IN (
    'applied', 'duplicate', 'conflict', 'retracted', 'rejected',
    'skipped_unmapped', 'skipped_no_session', 'skipped_no_homework',
    'skipped_disabled', 'skipped_not_permitted', 'skipped_not_enrolled',
    'skipped_unsupported', 'skipped_before_start'));

ALTER TABLE public.stars_sync_events
  ADD COLUMN IF NOT EXISTS attempts         integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS processed_at     timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lesson_date      date,
  ADD COLUMN IF NOT EXISTS stars_class_id   text,
  ADD COLUMN IF NOT EXISTS stars_student_id text;

-- Retries go least-recently-tried first, so a record that can never
-- apply (a class nobody maps) cannot starve the ones behind it.
CREATE INDEX IF NOT EXISTS stars_sync_events_pending_idx
  ON public.stars_sync_events (processed_at)
  WHERE outcome IN ('skipped_unmapped', 'skipped_no_session', 'skipped_no_homework',
                    'skipped_disabled', 'skipped_not_permitted', 'skipped_not_enrolled',
                    'skipped_unsupported');

CREATE OR REPLACE FUNCTION public.stars_sync_is_pending(p_outcome text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_outcome IN ('skipped_unmapped', 'skipped_no_session', 'skipped_no_homework',
                       'skipped_disabled', 'skipped_not_permitted', 'skipped_not_enrolled',
                       'skipped_unsupported');
$$;

-- ---------------------------------------------------------------- 3
-- Connection settings the admin decides.

ALTER TABLE public.stars_sync_connection
  -- Nothing for a lesson before this date is imported. NULL means not
  -- chosen yet, and the sync refuses to run: importing history that a
  -- teacher already typed into HEC by hand would add those points twice,
  -- so it has to be a decision somebody made.
  ADD COLUMN IF NOT EXISTS sync_from            date,
  -- A blast radius, not a judgement about how many points a child
  -- deserves. A fault in another school's app must not be able to award
  -- four thousand points overnight.
  ADD COLUMN IF NOT EXISTS max_points_per_event integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_points_per_day   integer NOT NULL DEFAULT 300;

ALTER TABLE public.stars_sync_connection DROP CONSTRAINT IF EXISTS stars_sync_connection_caps_check;
ALTER TABLE public.stars_sync_connection ADD CONSTRAINT stars_sync_connection_caps_check
  CHECK (max_points_per_event BETWEEN 1 AND 1000 AND max_points_per_day BETWEEN 1 AND 5000);

ALTER TABLE public.stars_sync_cursor
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS last_summary jsonb,
  ADD COLUMN IF NOT EXISTS last_run_by  text;

-- ---------------------------------------------------------------- 4
-- What only the server may know: the token the schedule presents, where
-- the function lives, and the key that gets the schedule's request past
-- the gateway. RLS on with no policies - no browser can read this, admins
-- included. The token is generated here and never shown to anybody. The
-- URL and key are recorded by the function itself, from its own
-- environment, the first time an admin runs it - so the schedule cannot
-- start until a person has run the sync once.
--
-- The key is the project's ANON key. It is public by design - it ships in
-- the app's JavaScript - and all it does here is satisfy the gateway's JWT
-- check, which stays ON for this function as for every other. The token
-- is what the function itself checks.

CREATE TABLE IF NOT EXISTS public.stars_sync_secrets (
  id           boolean PRIMARY KEY DEFAULT true CHECK (id),
  cron_token   text NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  function_url text,
  function_key text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stars_sync_secrets ADD COLUMN IF NOT EXISTS function_key text;
INSERT INTO public.stars_sync_secrets (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.stars_sync_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stars_sync_secrets FROM anon, authenticated;
GRANT ALL ON public.stars_sync_secrets TO service_role;

-- "This register row holds a value the sync wrote, and nobody has
-- changed it since." Compared by value at the next write, which is what
-- tells a teacher's correction apart from the sync's own earlier mark.
CREATE TABLE IF NOT EXISTS public.stars_sync_attendance_state (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status     text NOT NULL,
  event_id   uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, student_id)
);
ALTER TABLE public.stars_sync_attendance_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS stars_sync_attendance_state_admin_read ON public.stars_sync_attendance_state;
CREATE POLICY stars_sync_attendance_state_admin_read ON public.stars_sync_attendance_state
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT ON public.stars_sync_attendance_state TO authenticated;
GRANT ALL ON public.stars_sync_attendance_state TO service_role;

-- ---------------------------------------------------------------- 5
-- Small helpers.

-- Lesson dates are Vietnamese calendar dates; the database runs in UTC.
CREATE OR REPLACE FUNCTION public.stars_sync__today(p_now timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$ SELECT (p_now AT TIME ZONE 'Asia/Bangkok')::date; $$;

-- The id an event is recorded under. Pixel Pal's own event_id when it is
-- a uuid; otherwise one derived from seq, so even a malformed event is
-- recorded once and only once.
CREATE OR REPLACE FUNCTION public.stars_sync__event_id(p_event jsonb)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF (p_event ->> 'event_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN (p_event ->> 'event_id')::uuid;
  END IF;
  IF (p_event ->> 'seq') ~ '^[0-9]{1,18}$' THEN
    RETURN md5('pixelpal:seq:' || (p_event ->> 'seq'))::uuid;
  END IF;
  -- No id and no order: there is no way to record it once, and skipping
  -- it silently would lose it. Stop the page; the run reports why.
  RAISE EXCEPTION 'stars sync: Pixel Pal sent an event with neither an event_id nor a seq';
END $$;

CREATE OR REPLACE FUNCTION public.stars_sync__record(
  p_event jsonb, p_outcome text, p_note text, p_ref jsonb, p_now timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
BEGIN
  IF (p_event ->> 'lesson_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    BEGIN
      v_date := (p_event ->> 'lesson_date')::date;
    EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN
      v_date := NULL;
    END;
  END IF;

  INSERT INTO public.stars_sync_events AS e (
    event_id, seq, kind, raw, outcome, outcome_note, applied_ref,
    received_at, processed_at, attempts, lesson_date, stars_class_id, stars_student_id)
  VALUES (
    public.stars_sync__event_id(p_event),
    CASE WHEN (p_event ->> 'seq') ~ '^[0-9]{1,18}$' THEN (p_event ->> 'seq')::bigint ELSE 0 END,
    left(COALESCE(p_event ->> 'kind', ''), 40),
    p_event, p_outcome, left(p_note, 500), p_ref,
    p_now, p_now, 1, v_date,
    left(p_event ->> 'class_ref', 64), left(p_event ->> 'student_ref', 64))
  ON CONFLICT (event_id) DO UPDATE
    SET outcome      = EXCLUDED.outcome,
        outcome_note = EXCLUDED.outcome_note,
        applied_ref  = EXCLUDED.applied_ref,
        processed_at = EXCLUDED.processed_at,
        attempts     = e.attempts + 1;
END $$;

-- ---------------------------------------------------------------- 6
-- One event.
--
-- Returns {outcome, note, effects}. Raises only for something that means
-- the page itself cannot be trusted; every refusal about a child's
-- record is an outcome, recorded and visible on the admin screen.

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

  v_outcome     text;
  v_note        text;
  v_ref         jsonb;
  v_effects     jsonb := '[]'::jsonb;
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

  v_points      integer;
  v_category    text;
  v_day_total   integer;
  v_session_id  uuid;
  v_tx          uuid;

  v_target_id   uuid;
  v_target      public.stars_sync_events%ROWTYPE;
  v_tref        jsonb;
BEGIN
  v_event_id := public.stars_sync__event_id(p_event);

  SELECT * INTO v_existing FROM public.stars_sync_events WHERE event_id = v_event_id;
  IF FOUND AND NOT public.stars_sync_is_pending(v_existing.outcome) THEN
    RETURN jsonb_build_object('outcome', 'already_done');
  END IF;

  SELECT * INTO c FROM public.stars_sync_connection WHERE id;

  <<decide>>
  BEGIN
    -- ------------------------------------------------ shape and date
    -- Not a CASE inside the IF: plpgsql reads an IF condition up to the
    -- first THEN, including one that belongs to a CASE.
    IF NOT COALESCE((p_event ->> 'event_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false) THEN
      v_outcome := 'rejected';
      v_note := 'Pixel Pal sent this record without a valid event_id.';
      EXIT decide;
    END IF;

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

    IF v_kind IS NULL OR v_kind NOT IN ('attendance', 'points', 'retraction') THEN
      v_outcome := 'skipped_unsupported';
      v_note := format('Pixel Pal sent a "%s" record. HEC does not take these yet; it is kept and will apply when it does.',
                       COALESCE(v_kind, '?'));
      EXIT decide;
    END IF;

    -- ------------------------------------------------ retraction, part 1
    -- Withdrawing a record that never wrote anything needs no permission
    -- and changes nothing about a child. It is done first and
    -- unconditionally, so a withdrawn record can never apply later -
    -- including when its class is mapped after the withdrawal arrived.
    IF v_kind = 'retraction' THEN
      IF (v_payload ->> 'retracts_event_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         OR (v_payload ->> 'retracts_event_id') IS NULL THEN
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

      -- The target wrote something, so undoing it changes a child's
      -- record and needs the same permission writing it did. Undo it in
      -- the class it was written to, whatever the retraction itself says.
      SELECT * INTO v_map FROM public.stars_class_map WHERE class_id = (v_tref ->> 'class_id')::uuid;
    ELSE
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
    -- The same question mark-attendance asks, of the same function.
    IF NOT COALESCE(public.is_teacher_of_class(v_teacher.user_id, v_map.class_id), false) THEN
      v_outcome := 'skipped_not_permitted';
      v_note := format('%s does not teach %s in HEC, so cannot record this.', v_teacher.full_name, v_class_name);
      EXIT decide;
    END IF;

    -- ------------------------------------------------ retraction, part 2
    IF v_kind = 'retraction' THEN
      IF v_target.kind = 'points' THEN
        INSERT INTO public.point_transactions
          (student_id, class_id, points, type, date, month, notes, created_by)
        VALUES (
          (v_tref ->> 'student_id')::uuid,
          (v_tref ->> 'class_id')::uuid,
          -((v_tref ->> 'points')::integer),
          v_tref ->> 'type',
          (v_tref ->> 'date')::date,
          to_char((v_tref ->> 'date')::date, 'YYYY-MM'),
          left('[Pixel Pal] withdrawn: ' || COALESCE(v_payload ->> 'reason', ''), 500),
          v_teacher.user_id)
        RETURNING id INTO v_tx;

        UPDATE public.stars_sync_events
           SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; compensated.', processed_at = p_now
         WHERE event_id = v_target_id;
        v_outcome := 'applied';
        v_note := format('Withdrew %s points with a compensating entry.', v_tref ->> 'points');
        v_ref := jsonb_build_object('table', 'point_transactions', 'id', v_tx,
                                    'compensates', v_tref ->> 'id', 'withdrew', v_target_id);
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
      IF p_now > v_end + interval '24 hours' THEN
        v_outcome := 'rejected';
        v_note := 'This would change a register more than 24 hours after the lesson ended. A teacher could not do that in HEC either; an admin can.';
        EXIT decide;
      END IF;

      v_student_id := (v_tref ->> 'student_id')::uuid;
      SELECT * INTO v_row FROM public.attendance
       WHERE session_id = v_session.id AND student_id = v_student_id FOR UPDATE;
      v_has_row := FOUND;

      IF NOT v_has_row OR v_row.status IS DISTINCT FROM (v_tref ->> 'wrote') THEN
        -- Somebody changed or removed it since. Theirs stands.
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
        ELSE
          INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
          VALUES (v_session.id, v_student_id, v_prev ->> 'status', v_target_id, p_now)
          ON CONFLICT (session_id, student_id) DO UPDATE
            SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;
        END IF;
        v_note := format('Restored the register to %s.', v_prev ->> 'status');
      ELSE
        DELETE FROM public.attendance WHERE session_id = v_session.id AND student_id = v_student_id;
        DELETE FROM public.stars_sync_attendance_state
         WHERE session_id = v_session.id AND student_id = v_student_id;
        v_note := 'Removed the mark; there was none before it.';
      END IF;

      UPDATE public.stars_sync_events
         SET outcome = 'retracted', outcome_note = 'Withdrawn in Pixel Pal; restored.', processed_at = p_now
       WHERE event_id = v_target_id;
      v_outcome := 'applied';
      v_ref := jsonb_build_object('table', 'attendance', 'session_id', v_session.id,
                                  'student_id', v_student_id, 'withdrew', v_target_id);
      v_effects := jsonb_build_array(jsonb_build_object(
        'type', 'restore', 'session_id', v_session.id, 'student_id', v_student_id,
        'month', to_char(v_session.date, 'YYYY-MM')));
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

      -- The editing window a teacher has in HEC: from five minutes after
      -- the lesson starts until 24 hours after it ends.
      v_start := (v_session.date + COALESCE(v_session.start_time, time '00:00')) AT TIME ZONE 'Asia/Bangkok';
      v_end   := (v_session.date + COALESCE(v_session.end_time,   time '23:59')) AT TIME ZONE 'Asia/Bangkok';
      IF COALESCE(v_session.end_time, time '23:59') <= COALESCE(v_session.start_time, time '00:00') THEN
        v_end := v_end + interval '1 day';
      END IF;
      IF p_now < v_start + interval '5 minutes' THEN
        v_outcome := 'skipped_not_permitted';
        v_note := 'The lesson has not started in HEC yet. This will apply five minutes after it does.';
        EXIT decide;
      END IF;
      IF p_now > v_end + interval '24 hours' THEN
        v_outcome := 'rejected';
        v_note := 'This arrived more than 24 hours after the lesson ended. A teacher could not change it in HEC either; an admin can.';
        EXIT decide;
      END IF;

      SELECT * INTO v_row FROM public.attendance
       WHERE session_id = v_session.id AND student_id = v_student_id FOR UPDATE;
      v_has_row := FOUND;
      SELECT * INTO v_state FROM public.stars_sync_attendance_state
       WHERE session_id = v_session.id AND student_id = v_student_id;
      v_has_state := FOUND;

      IF v_has_row AND v_row.marked_by IS NOT NULL
         AND NOT (v_has_state AND v_state.status = v_row.status) THEN
        -- A person marked this, or changed what the sync wrote.
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
          -- Written after the event is recorded, below: the conflict
          -- references the event row, and inserting it first fails the
          -- foreign key - which the caller would then report as a
          -- refusal, and no admin would ever see the conflict.
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
        -- The sync's own mark, already this value.
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

      -- What mark-attendance does next, and what pays the teacher.
      UPDATE public.sessions SET status = 'Held'
       WHERE id = v_session.id AND status = 'Scheduled';

      INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
      VALUES (v_session.id, v_student_id, v_status, v_event_id, p_now)
      ON CONFLICT (session_id, student_id) DO UPDATE
        SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;

      v_outcome := 'applied';
      v_note := format('Marked %s.', v_status);
      v_ref := jsonb_build_object('table', 'attendance', 'session_id', v_session.id,
                                  'student_id', v_student_id, 'class_id', v_map.class_id,
                                  'wrote', v_status, 'prev', v_prev);
      v_effects := jsonb_build_array(jsonb_build_object(
        'type', 'attendance', 'session_id', v_session.id, 'class_id', v_map.class_id,
        'date', v_session.date, 'student_id', v_student_id, 'status', v_status));
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

    -- Attach the lesson when there is exactly one; points do not need one.
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

  RETURN jsonb_build_object('outcome', v_outcome, 'note', v_note, 'effects', v_effects);
END $$;

-- ---------------------------------------------------------------- 7
-- A page, and the retry pass. Both are one transaction: every event in
-- them, the cursor, and the record of what happened commit together or
-- not at all.

CREATE OR REPLACE FUNCTION public.stars_sync__run_one(p_event jsonb, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res jsonb;
  v_msg text;
BEGIN
  BEGIN
    v_res := public.stars_sync__apply_event(p_event, p_now);
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

CREATE OR REPLACE FUNCTION public.stars_sync__tally(p_counts jsonb, p_outcome text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_set(p_counts, ARRAY[p_outcome], to_jsonb(COALESCE((p_counts ->> p_outcome)::integer, 0) + 1));
$$;

CREATE OR REPLACE FUNCTION public.stars_sync_apply_page(
  p_events jsonb, p_next_cursor bigint, p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from    date;
  v_ev      jsonb;
  v_res     jsonb;
  v_counts  jsonb := '{}'::jsonb;
  v_effects jsonb := '[]'::jsonb;
  v_cursor  bigint;
BEGIN
  SELECT sync_from INTO v_from FROM public.stars_sync_connection WHERE id;
  IF v_from IS NULL THEN
    RAISE EXCEPTION 'stars sync: choose the date to sync from on the Stars Sync page first';
  END IF;
  IF jsonb_typeof(p_events) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'stars sync: the page of events is not a list';
  END IF;

  FOR v_ev IN
    SELECT e.value
      FROM jsonb_array_elements(p_events) WITH ORDINALITY AS e(value, ord)
     ORDER BY CASE WHEN e.value ->> 'seq' ~ '^[0-9]{1,18}$' THEN (e.value ->> 'seq')::bigint END NULLS LAST, e.ord
  LOOP
    v_res := public.stars_sync__run_one(v_ev, p_now);
    v_counts := public.stars_sync__tally(v_counts, v_res ->> 'outcome');
    v_effects := v_effects || COALESCE(v_res -> 'effects', '[]'::jsonb);
  END LOOP;

  -- Forward only. The feed is append-only; a cursor that went backwards
  -- would only re-read records already held, but there is no reason to.
  UPDATE public.stars_sync_cursor
     SET last_seq = p_next_cursor
   WHERE id AND p_next_cursor IS NOT NULL AND p_next_cursor > last_seq;
  SELECT last_seq INTO v_cursor FROM public.stars_sync_cursor WHERE id;

  RETURN jsonb_build_object('counts', v_counts, 'effects', v_effects, 'cursor', v_cursor);
END $$;

CREATE OR REPLACE FUNCTION public.stars_sync_retry_pending(
  p_limit integer DEFAULT 200, p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw     jsonb;
  v_res     jsonb;
  v_counts  jsonb := '{}'::jsonb;
  v_effects jsonb := '[]'::jsonb;
BEGIN
  IF (SELECT sync_from FROM public.stars_sync_connection WHERE id) IS NULL THEN
    RETURN jsonb_build_object('counts', v_counts, 'effects', v_effects);
  END IF;

  -- Oldest feed order within each batch, least-recently-tried batches
  -- first: a record that can never apply cannot starve the rest, and a
  -- retraction is still retried after the record it withdraws.
  FOR v_raw IN
    SELECT p.raw FROM (
      SELECT e.raw, e.seq FROM public.stars_sync_events e
       WHERE public.stars_sync_is_pending(e.outcome)
       ORDER BY e.processed_at, e.seq
       LIMIT GREATEST(p_limit, 0)
    ) p ORDER BY p.seq
  LOOP
    v_res := public.stars_sync__run_one(v_raw, p_now);
    v_counts := public.stars_sync__tally(v_counts, v_res ->> 'outcome');
    v_effects := v_effects || COALESCE(v_res -> 'effects', '[]'::jsonb);
  END LOOP;

  RETURN jsonb_build_object('counts', v_counts, 'effects', v_effects);
END $$;

-- ---------------------------------------------------------------- 8
-- One run at a time. A lease rather than a flag: an edge function killed
-- mid-run never reaches its finally block, and a flag would then lock the
-- sync for good. A lease simply expires.

CREATE OR REPLACE FUNCTION public.stars_sync_try_lock(p_ttl_seconds integer DEFAULT 600)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  UPDATE public.stars_sync_cursor
     SET locked_until = now() + make_interval(secs => GREATEST(p_ttl_seconds, 30))
   WHERE id AND (locked_until IS NULL OR locked_until < now())
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END $$;

CREATE OR REPLACE FUNCTION public.stars_sync_finish_run(p_summary jsonb, p_error text, p_by text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stars_sync_cursor
     SET last_run_at  = now(),
         last_summary = p_summary,
         last_error   = left(p_error, 1000),
         last_run_by  = left(p_by, 20),
         locked_until = NULL
   WHERE id;
$$;

-- ---------------------------------------------------------------- 9
-- The schedule. pg_cron calls stars_sync_tick every five minutes; the
-- tick asks pg_net to POST the edge function with the server-only token.
-- It does nothing while the connection is off, before a start date is
-- chosen, or before an admin has run the sync once by hand.

CREATE OR REPLACE FUNCTION public.stars_sync_tick()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_on   boolean;
  v_from date;
  v_url  text;
  v_key  text;
  v_tok  text;
  v_id   bigint;
BEGIN
  SELECT enabled, sync_from INTO v_on, v_from FROM public.stars_sync_connection WHERE id;
  IF NOT COALESCE(v_on, false) OR v_from IS NULL THEN RETURN NULL; END IF;

  SELECT function_url, function_key, cron_token INTO v_url, v_key, v_tok FROM public.stars_sync_secrets WHERE id;
  IF v_url IS NULL OR v_url !~ '^https://[^/?#]+/functions/v1/stars-sync$' THEN RETURN NULL; END IF;
  IF v_key IS NULL OR v_key = '' THEN RETURN NULL; END IF;
  IF to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NULL THEN RETURN NULL; END IF;

  EXECUTE 'SELECT net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := $4)'
     INTO v_id
    USING v_url, '{}'::jsonb,
          jsonb_build_object('Content-Type', 'application/json',
                             'Authorization', 'Bearer ' || v_key,
                             'apikey', v_key,
                             'x-stars-cron', v_tok),
          300000;
  RETURN v_id;
END $$;

-- Try to make the schedule exist. Supabase lets the database owner
-- enable these two; anything else is reported and the migration carries
-- on - the page says whether the schedule is installed, and "Run now"
-- works without it.
DO $do$
BEGIN
  -- WHEN OTHERS, deliberately and only here: these are optional, the
  -- error for "pg_cron is not preloaded" is not one fixed SQLSTATE, and a
  -- missing scheduler must not undo the rest of this migration.
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net could not be enabled here (%). Enable it under Database -> Extensions and re-run this migration.', SQLERRM;
  END;
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron could not be enabled here (%). Enable it under Database -> Extensions and re-run this migration.', SQLERRM;
  END;

  IF to_regclass('cron.job') IS NOT NULL THEN
    BEGIN
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stars-sync') THEN
        PERFORM cron.unschedule('stars-sync');
      END IF;
      PERFORM cron.schedule('stars-sync', '*/5 * * * *', 'SELECT public.stars_sync_tick();');
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'The stars-sync schedule could not be created (%). "Run now" still works.', SQLERRM;
    END;
  END IF;
END
$do$;

-- ---------------------------------------------------------------- 10
-- For the admin screen.

DROP FUNCTION IF EXISTS public.stars_sync_readiness();
CREATE FUNCTION public.stars_sync_readiness()
RETURNS TABLE (
  stars_class_id    text,
  class_id          uuid,
  class_name        text,
  teacher_id        uuid,
  teacher_name      text,
  teacher_is_active boolean,
  teacher_has_login boolean,
  teacher_has_role  boolean,
  map_enabled       boolean,
  can_sync          boolean,
  via_roster        boolean,
  status            text,
  detail            text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Stars sync settings are for admins' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH mapped AS (
    SELECT m.stars_class_id, m.class_id, m.enabled AS map_enabled,
           COALESCE(m.teacher_id, conn.default_teacher_id) AS teacher_id
      FROM public.stars_class_map m
     CROSS JOIN public.stars_sync_connection conn
  ),
  judged AS (
    SELECT mp.*,
           c.name AS class_name,
           t.full_name AS teacher_name,
           COALESCE(t.is_active, false) AS t_active,
           (t.user_id IS NOT NULL) AS t_login,
           EXISTS (SELECT 1 FROM public.user_roles r
                    WHERE r.user_id = t.user_id
                      AND r.role IN ('teacher'::public.app_role, 'admin'::public.app_role)) AS t_role,
           (t.user_id IS NOT NULL
            AND COALESCE(public.is_teacher_of_class(t.user_id, mp.class_id), false)) AS t_can,
           (c.default_teacher_id = mp.teacher_id
            OR EXISTS (SELECT 1
                         FROM jsonb_array_elements(COALESCE(public.class_slots_on(mp.class_id, CURRENT_DATE), '[]'::jsonb)) AS slot
                        WHERE slot ->> 'teacherId' = mp.teacher_id::text)) AS t_roster
      FROM mapped mp
      JOIN public.classes c ON c.id = mp.class_id
      LEFT JOIN public.teachers t ON t.id = mp.teacher_id
  )
  SELECT j.stars_class_id, j.class_id, j.class_name, j.teacher_id, j.teacher_name,
         j.t_active, j.t_login, j.t_role, j.map_enabled, j.t_can, COALESCE(j.t_roster, false),
         CASE
           WHEN j.teacher_id IS NULL OR NOT j.t_active OR NOT j.t_login OR NOT j.t_role THEN 'blocked'
           WHEN NOT j.map_enabled THEN 'paused'
           WHEN NOT j.t_can THEN 'blocked'
           WHEN COALESCE(j.t_roster, false) THEN 'ready'
           ELSE 'partial'
         END,
         CASE
           WHEN j.teacher_id IS NULL
             THEN 'No teacher. Set one on this class, or a default on the connection.'
           WHEN NOT j.t_active
             THEN j.teacher_name || ' is archived. Nothing will sync until another teacher is chosen.'
           WHEN NOT j.t_login
             THEN j.teacher_name || ' has no login, so nothing can be recorded as them.'
           WHEN NOT j.t_role
             THEN j.teacher_name || ' does not hold the teacher role.'
           WHEN NOT j.map_enabled
             THEN 'Paused for this class. Records wait until it is switched back on.'
           WHEN NOT j.t_can
             THEN j.teacher_name || ' does not teach ' || j.class_name || ' in HEC, so nothing will sync. Records wait until that changes.'
           WHEN COALESCE(j.t_roster, false)
             THEN 'Ready. ' || j.teacher_name || ' is on the ' || j.class_name || ' roster.'
           ELSE j.teacher_name || ' is only covering ' || j.class_name
                || '. Access ends 7 days after their last lesson in it; then records will wait.'
         END
    FROM judged j
   ORDER BY j.class_name;
END $$;

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
    'open_conflicts', (SELECT count(*) FROM public.stars_sync_conflicts WHERE resolved_at IS NULL)
  );
END $$;

-- Resolving a conflict. "Take theirs" is two steps on purpose: the admin
-- screen writes the register through mark-attendance first - the normal
-- path, as the admin, with the Held flip, tuition and streaks - and only
-- then records the resolution here. This refuses to record "took theirs"
-- unless the register really shows Pixel Pal's value, so the two cannot
-- disagree.
CREATE OR REPLACE FUNCTION public.stars_sync_resolve_conflict(p_conflict_id uuid, p_resolution text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v record;
  v_now_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only an admin can resolve a sync conflict' USING ERRCODE = '42501';
  END IF;
  IF p_resolution NOT IN ('kept_ours', 'took_theirs') THEN
    RAISE EXCEPTION 'Unknown resolution %', p_resolution;
  END IF;

  SELECT * INTO v FROM public.stars_sync_conflicts WHERE id = p_conflict_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That conflict does not exist'; END IF;
  IF v.resolved_at IS NOT NULL THEN RAISE EXCEPTION 'That conflict is already resolved'; END IF;

  IF p_resolution = 'took_theirs' THEN
    SELECT status INTO v_now_status FROM public.attendance
     WHERE session_id = v.session_id AND student_id = v.student_id;
    IF v_now_status IS DISTINCT FROM (v.theirs ->> 'status') THEN
      RAISE EXCEPTION 'The register does not show Pixel Pal''s value yet; nothing was recorded';
    END IF;
    -- The row now holds Pixel Pal's value, so the next change from Pixel
    -- Pal for this child and lesson may flow through.
    INSERT INTO public.stars_sync_attendance_state (session_id, student_id, status, event_id, updated_at)
    VALUES (v.session_id, v.student_id, v_now_status, v.event_id, now())
    ON CONFLICT (session_id, student_id) DO UPDATE
      SET status = EXCLUDED.status, event_id = EXCLUDED.event_id, updated_at = EXCLUDED.updated_at;
    UPDATE public.stars_sync_events e
       SET outcome = 'applied',
           outcome_note = 'Applied by an admin after a conflict.',
           processed_at = now(),
           applied_ref = jsonb_build_object(
             'table', 'attendance', 'adopted', true,
             'session_id', v.session_id, 'student_id', v.student_id,
             'class_id', (SELECT s.class_id FROM public.sessions s WHERE s.id = v.session_id),
             'wrote', v_now_status)
     WHERE e.event_id = v.event_id;
  END IF;

  UPDATE public.stars_sync_conflicts
     SET resolved_at = now(), resolved_by = auth.uid(), resolution = p_resolution
   WHERE id = p_conflict_id;
END $$;

-- ---------------------------------------------------------------- 11
-- Who may call what. The engine is service_role only: it writes
-- children's records as somebody else, so no browser may reach it.

DO $do$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.stars_sync__event_id(jsonb)',
    'public.stars_sync__record(jsonb, text, text, jsonb, timestamp with time zone)',
    'public.stars_sync__apply_event(jsonb, timestamp with time zone)',
    'public.stars_sync__run_one(jsonb, timestamp with time zone)',
    'public.stars_sync_apply_page(jsonb, bigint, timestamp with time zone)',
    'public.stars_sync_retry_pending(integer, timestamp with time zone)',
    'public.stars_sync_try_lock(integer)',
    'public.stars_sync_finish_run(jsonb, text, text)',
    'public.stars_sync_tick()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;

  FOREACH f IN ARRAY ARRAY[
    'public.stars_sync_apply_page(jsonb, bigint, timestamp with time zone)',
    'public.stars_sync_retry_pending(integer, timestamp with time zone)',
    'public.stars_sync_try_lock(integer)',
    'public.stars_sync_finish_run(jsonb, text, text)'
  ] LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;

  FOREACH f IN ARRAY ARRAY[
    'public.stars_sync_readiness()',
    'public.stars_sync_status()',
    'public.stars_sync_resolve_conflict(uuid, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT
  (SELECT count(*) FROM pg_proc WHERE proname = 'stars_sync_apply_page')            AS engine_installed,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'trigger_recalculate_points_on_delete') AS old_delete_trigger_left,
  to_regclass('cron.job') IS NOT NULL                                               AS cron_available,
  to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL      AS http_available;
