-- A cancelled lesson is Excused for everybody, and cannot be anything
-- else.
--
-- PORTED FROM drizzle/migrations/0004_cancelled_lesson_guard.sql, which
-- the Lovable side added on 27 Oct 2026. That file is tested but has
-- never been applied and never will be: supabase/migrations/ is the
-- authoritative tree - the owner pastes these into the SQL editor - and
-- nothing reads drizzle/. This is the same gap 20261022091000 was
-- written to close. The drizzle copy is left where it is because it is
-- Lovable's own bookkeeping; THIS file is the one that runs.
--
-- Three things come across unchanged in substance:
--
--   guard_cancelled_session_attendance   refuses any attendance row on a
--                                        cancelled lesson that is not
--                                        Excused, on insert or update.
--   set_attendance_excused_on_cancel     cancelling a lesson excuses
--                                        everybody already marked on it.
--   _attendance_seed_for_class_dates     the 20260906024727 body with one
--                                        branch added: a cancelled lesson
--                                        seeds Excused, not Present.
--
-- TWO THINGS ARE ADDED, because the port is where they become visible.
--
-- 1. THE BACKFILL. The triggers only govern writes from now on. Lessons
--    cancelled BEFORE this lands keep whatever attendance they had, and
--    those rows are then un-editable: the new guard rejects any update
--    that does not set Excused, so a teacher correcting one gets a
--    constraint error with no way forward. They also charge families for
--    lessons that did not happen, which is the fault this whole change
--    exists to fix. The count is reported before and after.
--
-- 2. A WHEN CLAUSE on the session trigger. Lovable's fires on every
--    update to every session row and re-runs the UPDATE whenever the
--    status is already Canceled. This one fires only on the transition
--    INTO Canceled, which is the only moment anything needs doing.
--
-- WHAT THE BACKFILL MAY MOVE. Attendance drives tuition. Turning a
-- Present on a cancelled lesson into an Excused reduces what that month
-- is billable for, and a month already invoiced and confirmed will no
-- longer agree with its invoice. That is the correct direction - nobody
-- should be charged for a lesson that did not happen - but it is a
-- change to money, so the count is printed before anything moves.

BEGIN;

-- ---------------------------------------------------------------- 0
-- Refuse to install against a schema this does not fit, rather than
-- failing quietly at somebody's first register.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'session_status' AND e.enumlabel = 'Canceled'
  ) THEN
    RAISE EXCEPTION 'session_status has no Canceled label; refusing to install a guard that filters on it';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments'
      AND column_name = 'allowed_days'
  ) THEN
    RAISE EXCEPTION 'public.enrollments.allowed_days is missing; the seed function reads it';
  END IF;

  -- ON CONFLICT (session_id, student_id) in the seed needs this.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.attendance'::regclass
      AND c.contype IN ('p', 'u')
      -- attname is `name`, which has no equality operator against
      -- text[]; cast before aggregating or this raises 42883.
      AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text)
             FROM unnest(c.conkey) k JOIN pg_attribute a
               ON a.attrelid = c.conrelid AND a.attnum = k)
          = ARRAY['session_id', 'student_id']
  ) THEN
    RAISE EXCEPTION 'public.attendance has no unique (session_id, student_id); the seed upsert needs one';
  END IF;
END $$;

-- ---------------------------------------------------------------- 1
-- What is wrong today, before anything is touched.

DO $$
DECLARE v_rows bigint; v_sessions bigint;
BEGIN
  SELECT count(*), count(DISTINCT a.session_id) INTO v_rows, v_sessions
  FROM public.attendance a
  JOIN public.sessions s ON s.id = a.session_id
  WHERE s.status = 'Canceled' AND a.status IS DISTINCT FROM 'Excused';

  RAISE NOTICE 'attendance rows on cancelled lessons that are not Excused: % across % lesson(s)',
    v_rows, v_sessions;
END $$;

-- ---------------------------------------------------------------- 2
-- The backfill, before the guard exists - so it is one statement rather
-- than one trigger call per row.

UPDATE public.attendance a
SET status = 'Excused',
    updated_at = now()
FROM public.sessions s
WHERE a.session_id = s.id
  AND s.status = 'Canceled'
  AND a.status IS DISTINCT FROM 'Excused';

-- ---------------------------------------------------------------- 3
-- Nothing but Excused on a cancelled lesson, ever again.
--
-- FOR UPDATE on the session is deliberate: without it a lesson can be
-- cancelled between this read and the write, and the row it was
-- guarding slips through. It costs a row lock per attendance write,
-- which a class register takes once per child inside one transaction.

CREATE OR REPLACE FUNCTION public.guard_cancelled_session_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.session_status;
BEGIN
  SELECT status INTO v_status FROM public.sessions WHERE id = NEW.session_id FOR UPDATE;

  IF v_status = 'Canceled' AND NEW.status IS DISTINCT FROM 'Excused' THEN
    RAISE EXCEPTION
      'Cancelled lessons cannot be marked Present, Absent or Late. Attendance must be Excused.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.guard_cancelled_session_attendance()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_cancelled_session_attendance ON public.attendance;
CREATE TRIGGER guard_cancelled_session_attendance
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.guard_cancelled_session_attendance();

-- ---------------------------------------------------------------- 4
-- Cancelling a lesson excuses everybody already marked on it.

CREATE OR REPLACE FUNCTION public.set_attendance_excused_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.attendance
     SET status = 'Excused'
   WHERE session_id = NEW.id
     AND status IS DISTINCT FROM 'Excused';
  RETURN NULL;  -- AFTER trigger; the return value is discarded.
END $$;

REVOKE ALL ON FUNCTION public.set_attendance_excused_on_cancel()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cancel_session_excused ON public.sessions;
CREATE TRIGGER trg_cancel_session_excused
AFTER UPDATE ON public.sessions
FOR EACH ROW
WHEN (NEW.status = 'Canceled' AND OLD.status IS DISTINCT FROM 'Canceled')
EXECUTE FUNCTION public.set_attendance_excused_on_cancel();

-- ---------------------------------------------------------------- 5
-- Seeding a register: a cancelled lesson seeds Excused.
--
-- This is the 20260906024727 body with one CASE branch added in front.
-- The allowed_days branch and everything else below it are unchanged,
-- so a child enrolled on Tuesdays only still gets Excused on a Thursday.

CREATE OR REPLACE FUNCTION public._attendance_seed_for_class_dates(
  p_class uuid, p_from date, p_to date
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.attendance(session_id, student_id, status, marked_by)
  SELECT s.id,
         e.student_id,
         CASE
           WHEN s.status = 'Canceled' THEN 'Excused'
           WHEN e.allowed_days IS NOT NULL
                AND array_length(e.allowed_days, 1) > 0
                AND NOT (EXTRACT(DOW FROM s.date)::int = ANY (e.allowed_days))
             THEN 'Excused'
           ELSE 'Present'
         END,
         NULL
  FROM public.sessions s
  JOIN public.enrollments e ON e.class_id = s.class_id
  WHERE s.class_id = p_class
    AND s.date BETWEEN p_from AND p_to
    AND e.start_date <= s.date
    AND (e.end_date IS NULL OR s.date <= e.end_date)
  ON CONFLICT (session_id, student_id) DO NOTHING;
$$;

-- 20260711235255 revoked this from anon and authenticated; a replace
-- keeps the grants, but say it again so a fresh database matches.
REVOKE EXECUTE ON FUNCTION public._attendance_seed_for_class_dates(uuid, date, date)
  FROM anon, authenticated, PUBLIC;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT count(*) FROM public.attendance a
     JOIN public.sessions s ON s.id = a.session_id
    WHERE s.status = 'Canceled' AND a.status IS DISTINCT FROM 'Excused')  AS still_wrong,
  (SELECT count(*) FROM public.attendance a
     JOIN public.sessions s ON s.id = a.session_id
    WHERE s.status = 'Canceled')                                          AS on_cancelled_lessons,
  (SELECT count(*) FROM pg_trigger
    WHERE tgname = 'guard_cancelled_session_attendance')                  AS guard_installed,
  (SELECT count(*) FROM pg_trigger
    WHERE tgname = 'trg_cancel_session_excused')                          AS cancel_trigger_installed;
