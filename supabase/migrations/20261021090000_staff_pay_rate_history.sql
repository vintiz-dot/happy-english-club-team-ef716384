-- Pay rates become effective-dated, so a raise stops re-pricing the past.
--
-- ------------------------------------------------------------------------
-- WHAT IS WRONG TODAY
-- ------------------------------------------------------------------------
--
-- A teacher's rate lives in three columns on their own row:
-- pay_rate_type, hourly_rate_vnd, per_session_rate_vnd. calculate-payroll
-- reads those columns once per teacher and prices every session in the
-- requested month with them, whatever date the session ran on.
--
-- So a rate is not a fact about a period of work. It is a fact about right
-- now, applied backwards over everything. Give a teacher a raise today and
-- every month they have ever worked is quietly re-priced the next time
-- anyone opens it - including months that have already been paid. The
-- payroll_summaries row for that month is upserted by the same run, so the
-- stored total is overwritten with the new number too. There is then no
-- record anywhere of what the teacher was actually paid.
--
-- The same mechanism makes the honest correction impossible to express.
-- "This teacher has always been per-session and we recorded it as hourly"
-- and "this teacher is getting a raise from Monday" are the same edit
-- today, and both of them rewrite history.
--
-- ------------------------------------------------------------------------
-- THE SHAPE, AND WHY THIS ONE
-- ------------------------------------------------------------------------
--
-- One row per (member of staff, date the rate starts). The rate in force
-- on a date is the row with the greatest effective_from at or before it.
-- Changing a rate adds a row; it never edits an old one, so what a month
-- cost stays answerable after the rate moves on.
--
-- This is how payroll is modelled in systems that have to survive an
-- audit, and the reason is not elegance: a pay rate is evidence. Somebody
-- will eventually ask what this person was paid per lesson in March, and
-- the only acceptable answer is the one that does not depend on nobody
-- having touched the rate since.
--
-- It is deliberately the same shape as class_schedule_versions
-- (20261020090000), which solved the same problem for timetables. Two
-- different answers to "what was true on this date" in one codebase is one
-- too many.
--
-- WHY THE COLUMNS ON teachers STAY. They become the rate in force NOW -
-- the mirror, not the record. useStaffProfile, TeacherProfile,
-- TeachersList and the dashboards all read them with select("*") to show
-- "what is this person on", which is the right question for those screens
-- and is cheap to answer from the row. The same split as
-- classes.schedule_template against class_schedule_versions.
--
-- ------------------------------------------------------------------------
-- THIS MIGRATION CHANGES NO NUMBER
-- ------------------------------------------------------------------------
--
-- The backfill writes each member of staff's CURRENT rate as a baseline
-- effective 1900-01-01. Every historical month therefore resolves to
-- exactly the rate it resolves to today, and re-running payroll for any
-- past month produces the figure it produces now. The behaviour change is
-- entirely in what happens to the NEXT rate change.
--
-- 1900-01-01 rather than the teacher's created_at, for the same reason the
-- schedule baseline uses it: sessions have been backdated before now, and
-- a baseline that starts after a session leaves that session unpriced.

-- ---------------------------------------------------------------- table

CREATE TABLE IF NOT EXISTS public.staff_pay_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Exactly one of these. Two nullable columns with real foreign keys
  -- rather than a (staff_type, staff_id) pair: pay history is money
  -- evidence, and a polymorphic id cannot be checked by the database. The
  -- CHECK below is what makes it a tagged union.
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
  assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,

  -- Inclusive. Runs until the next row for the same person starts.
  effective_from date NOT NULL,

  pay_rate_type text NOT NULL DEFAULT 'hourly',
  hourly_rate_vnd integer NOT NULL DEFAULT 0,
  per_session_rate_vnd integer NOT NULL DEFAULT 0,

  -- Why the rate changed. Shown in the history list.
  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT staff_pay_rates_one_subject_check
    CHECK ((teacher_id IS NOT NULL) <> (assistant_id IS NOT NULL)),
  CONSTRAINT staff_pay_rates_type_check
    CHECK (pay_rate_type IN ('hourly', 'per_session')),
  -- The rate that is going to be used has to be a real number. The other
  -- one is held at 0 on purpose, so nothing can read the unused column and
  -- get a plausible-looking figure out of it.
  CONSTRAINT staff_pay_rates_rate_set_check CHECK (
    (pay_rate_type = 'hourly'      AND hourly_rate_vnd > 0      AND per_session_rate_vnd = 0) OR
    (pay_rate_type = 'per_session' AND per_session_rate_vnd > 0 AND hourly_rate_vnd = 0)
  )
);

-- ON DELETE CASCADE above, and these are deliberately NOT added to
-- block_delete_of_staff_with_history (20261020091000). A rate row exists
-- for everyone from the moment of the backfill, so counting it as history
-- would make every member of staff undeletable and turn the archive flow's
-- "created by mistake, no sessions, remove it" path into dead code. Real
-- history - sessions, payroll, attendance - still blocks the delete.

-- Partial unique indexes rather than one UNIQUE(teacher_id, assistant_id,
-- effective_from): NULLs do not collide in a unique constraint, so the
-- single-constraint form would permit two baselines for the same teacher.
CREATE UNIQUE INDEX IF NOT EXISTS staff_pay_rates_teacher_from_key
  ON public.staff_pay_rates (teacher_id, effective_from) WHERE teacher_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS staff_pay_rates_assistant_from_key
  ON public.staff_pay_rates (assistant_id, effective_from) WHERE assistant_id IS NOT NULL;

-- Payroll resolves a whole month for every member of staff at once, newest
-- row at or before each date. Descending so the planner can stop at the
-- first match.
CREATE INDEX IF NOT EXISTS staff_pay_rates_teacher_lookup
  ON public.staff_pay_rates (teacher_id, effective_from DESC) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_pay_rates_assistant_lookup
  ON public.staff_pay_rates (assistant_id, effective_from DESC) WHERE assistant_id IS NOT NULL;

COMMENT ON TABLE public.staff_pay_rates IS
  'Effective-dated pay rates. The rate in force on a date is the row with the greatest effective_from at or before it. Rows are added, never edited, so what a past month cost stays answerable.';

-- Table privileges are explicit in this database, not inherited. 20260712023825
-- revoked the defaults and re-granted every table one by one, and every
-- table-creating migration since has done the same. Without these two lines
-- RLS never gets a chance to run: the admin drawer and calculate-payroll both
-- fail with "permission denied for table staff_pay_rates".
--
-- service_role as well as authenticated, because calculate-payroll reads this
-- table on the service role. RLS does not apply to it, but the table grant
-- still does.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_pay_rates TO authenticated;
GRANT ALL ON public.staff_pay_rates TO service_role;

-- -------------------------------------------------------------- backfill
--
-- Idempotent on purpose: re-running this file must not add a second
-- baseline or disturb a rate change made since it first ran.

INSERT INTO public.staff_pay_rates
  (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, note)
SELECT
  t.id,
  DATE '1900-01-01',
  CASE WHEN t.pay_rate_type = 'per_session' THEN 'per_session' ELSE 'hourly' END,
  -- GREATEST(..., 1) keeps staff_pay_rates_rate_set_check satisfied for a
  -- row whose rate was never filled in. 1 VND is visibly wrong on the
  -- payroll screen, which is the point: it asks to be corrected, where a 0
  -- would have aborted this migration for the whole school.
  CASE WHEN t.pay_rate_type = 'per_session' THEN 0 ELSE GREATEST(COALESCE(t.hourly_rate_vnd, 0), 1) END,
  CASE WHEN t.pay_rate_type = 'per_session' THEN GREATEST(COALESCE(t.per_session_rate_vnd, 0), 1) ELSE 0 END,
  'Baseline captured when pay history was introduced.'
FROM public.teachers t
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_pay_rates r WHERE r.teacher_id = t.id
);

INSERT INTO public.staff_pay_rates
  (assistant_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, note)
SELECT
  a.id,
  DATE '1900-01-01',
  CASE WHEN a.pay_rate_type = 'per_session' THEN 'per_session' ELSE 'hourly' END,
  CASE WHEN a.pay_rate_type = 'per_session' THEN 0 ELSE GREATEST(COALESCE(a.hourly_rate_vnd, 0), 1) END,
  CASE WHEN a.pay_rate_type = 'per_session' THEN GREATEST(COALESCE(a.per_session_rate_vnd, 0), 1) ELSE 0 END,
  'Baseline captured when pay history was introduced.'
FROM public.teaching_assistants a
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff_pay_rates r WHERE r.assistant_id = a.id
);

-- ------------------------------------------------------------- resolvers
--
-- The SQL counterpart to _lib/pay-history.ts, for anything that cannot run
-- code - an RLS predicate, a report, an admin checking a figure in the SQL
-- editor. The fallback is the staff row itself, matching what
-- class_slots_on does with classes.schedule_template, so a member of staff
-- created after the backfill still prices correctly before their first
-- rate row exists.

CREATE OR REPLACE FUNCTION public.teacher_rate_on(p_teacher_id uuid, p_date date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
               'pay_rate_type', r.pay_rate_type,
               'hourly_rate_vnd', r.hourly_rate_vnd,
               'per_session_rate_vnd', r.per_session_rate_vnd,
               'effective_from', r.effective_from
             )
      FROM public.staff_pay_rates r
      WHERE r.teacher_id = p_teacher_id
        AND r.effective_from <= p_date
      ORDER BY r.effective_from DESC
      LIMIT 1
    ),
    jsonb_build_object(
      'pay_rate_type', COALESCE(t.pay_rate_type, 'hourly'),
      'hourly_rate_vnd', COALESCE(t.hourly_rate_vnd, 0),
      'per_session_rate_vnd', COALESCE(t.per_session_rate_vnd, 0),
      'effective_from', NULL
    )
  )
  FROM public.teachers t
  WHERE t.id = p_teacher_id;
$fn$;

CREATE OR REPLACE FUNCTION public.assistant_rate_on(p_assistant_id uuid, p_date date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
               'pay_rate_type', r.pay_rate_type,
               'hourly_rate_vnd', r.hourly_rate_vnd,
               'per_session_rate_vnd', r.per_session_rate_vnd,
               'effective_from', r.effective_from
             )
      FROM public.staff_pay_rates r
      WHERE r.assistant_id = p_assistant_id
        AND r.effective_from <= p_date
      ORDER BY r.effective_from DESC
      LIMIT 1
    ),
    jsonb_build_object(
      'pay_rate_type', COALESCE(a.pay_rate_type, 'hourly'),
      'hourly_rate_vnd', COALESCE(a.hourly_rate_vnd, 0),
      'per_session_rate_vnd', COALESCE(a.per_session_rate_vnd, 0),
      'effective_from', NULL
    )
  )
  FROM public.teaching_assistants a
  WHERE a.id = p_assistant_id;
$fn$;

REVOKE EXECUTE ON FUNCTION public.teacher_rate_on(uuid, date) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assistant_rate_on(uuid, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_rate_on(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assistant_rate_on(uuid, date) TO authenticated, service_role;

COMMENT ON FUNCTION public.teacher_rate_on(uuid, date) IS
  'The pay rate in force for a teacher on a given date. Falls back to the teachers row when no rate record covers the date.';
COMMENT ON FUNCTION public.assistant_rate_on(uuid, date) IS
  'The pay rate in force for a teaching assistant on a given date. Falls back to the teaching_assistants row when no rate record covers the date.';

-- ------------------------------------------------------------------ RLS
--
-- Reads: admins, and the member of staff the row is about. Someone's pay
-- history is theirs to see and nobody else's - a teacher must not be able
-- to read a colleague's rate, which is why this is not simply
-- "authenticated".
--
-- Writes: admins only. A teacher may edit their own email and bio
-- (enforce_teacher_self_update_scope, 20261016091000) and must not be able
-- to give themselves a raise.

ALTER TABLE public.staff_pay_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage pay rates" ON public.staff_pay_rates;
CREATE POLICY "Admins manage pay rates"
  ON public.staff_pay_rates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read their own pay history" ON public.staff_pay_rates;
CREATE POLICY "Staff read their own pay history"
  ON public.staff_pay_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = staff_pay_rates.teacher_id AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.teaching_assistants a
      WHERE a.id = staff_pay_rates.assistant_id AND a.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------- audit
--
-- Money. Guarded because audit_row_change is created by 20261009130000; a
-- file pasted into a database without it should say so rather than abort.
DO $do$
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE NOTICE 'public.audit_row_change() not present; staff_pay_rates will not be audited.';
    RETURN;
  END IF;
  DROP TRIGGER IF EXISTS audit_staff_pay_rates ON public.staff_pay_rates;
  CREATE TRIGGER audit_staff_pay_rates
    AFTER INSERT OR UPDATE OR DELETE ON public.staff_pay_rates
    FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
END
$do$;
