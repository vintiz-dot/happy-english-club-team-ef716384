-- A class costs more than its teacher.
--
-- The per-class finance table reports profit = net tuition - teacher pay.
-- Rent, electricity and the rest of the standing costs are real and are
-- nowhere in it, so every class reads better than it is and the ones that
-- barely cover their teacher read as profitable when they are not.
--
-- This spreads the standing costs over the classes that ran that month.
--
-- WHAT IS IN THE POOL. Only expenditures generated from a recurring
-- template flagged allocate_to_classes. Not hand-entered one-offs - an
-- interactive whiteboard bought for one room is not everyone's cost - and
-- never payroll, which the class table already charges per class from the
-- sessions themselves. Charging payroll again here is the same double
-- count that 20261021092000 and the expenditureSplit change were written
-- to stop.
--
-- WHAT THE SHARE IS. Each class's count of sessions in the month that
-- were not cancelled, over that same count for every class. Deliberately
-- NOT "sessions marked Held": Held in this database means a teacher
-- opened the attendance screen, a past lesson can sit at Scheduled
-- indefinitely, and nothing reports that it has. A Held denominator would
-- quietly move rent off the classes whose teachers are slow on that
-- screen and onto the ones whose teachers are not. The calendar is the
-- honest record of what ran.
--
-- WHICH CLASSES. Every class that ran a session, including ones since
-- archived. The class table filters to is_active, but an archived class's
-- lessons still happened and still used the room; leaving it out of the
-- divisor would hand its share to the classes still running. The shares
-- sum to the pool exactly, so the report's total ties to the Expenditures
-- page.
--
-- NOTHING IS WRITTEN TO expenditures PER CLASS. The pool is already a row
-- in the ledger and is already subtracted from school-wide net profit.
-- Writing a per-class child row for the same money would subtract it
-- twice. The split redistributes a cost that is already counted, which is
-- why it is computed and not booked.
--
-- WHY THE ARITHMETIC LIVES IN SQL. Two callers need the same answer: the
-- class report, for an open month, and the freeze below, when a month is
-- closed. A second copy in TypeScript would become a second answer the
-- first time either one changed.

-- The pool is defined by joining expenditures to recurring templates, so
-- the templates have to exist. Failing here with a sentence beats failing
-- later inside a month-close with a missing-relation error.
DO $do$
BEGIN
  IF to_regclass('public.recurring_expenditures') IS NULL THEN
    RAISE EXCEPTION
      'public.recurring_expenditures is missing. Run 20261021095000_recurring_expenditures_in_production first, then this file.';
  END IF;
END
$do$;

-- ------------------------------------------------- which costs are shared
--
-- Default true because rent, internet and utilities - what templates are
-- for - are all shared. A template for something that belongs to one room
-- gets the switch turned off.
ALTER TABLE public.recurring_expenditures
  ADD COLUMN IF NOT EXISTS allocate_to_classes boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.recurring_expenditures.allocate_to_classes IS
  'Whether this standing cost is spread across the classes that ran in the month. Off for a cost that belongs to one class, or to none. Changing it restates OPEN months only; a closed month keeps the split it was closed at.';

-- --------------------------------------- a template with history is kept
--
-- 20260418100000 made expenditures.source_template_id ON DELETE SET NULL.
-- That is quietly destructive now: the pool below is defined by that
-- link, so deleting a template would detach every cost it ever generated
-- and the whole standing cost would disappear from every open month's
-- split - while the expenditure rows, and school-wide net profit, stayed
-- exactly as they were. The class table and the finance summary would
-- then disagree by that amount with nothing on screen to explain it.
--
-- RESTRICT instead. A template that has booked money is a historical
-- record; to stop it, switch it off or give it an end month.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'expenditures'
       AND column_name = 'source_template_id'
  ) THEN
    ALTER TABLE public.expenditures
      DROP CONSTRAINT IF EXISTS expenditures_source_template_id_fkey;
    ALTER TABLE public.expenditures
      ADD CONSTRAINT expenditures_source_template_id_fkey
      FOREIGN KEY (source_template_id)
      REFERENCES public.recurring_expenditures(id) ON DELETE RESTRICT;
  END IF;
END
$do$;

-- ------------------------------------------- what has already been booked
--
-- Which template was applied to which month, recorded independently of
-- the expenditure row it produced. Two faults come from inferring this
-- from the ledger instead:
--
--   Deleting the booked cost - because the landlord waived it, or because
--   it was a duplicate - removes the only evidence the month was handled,
--   and the automatic booking puts it straight back on the next load.
--
--   Correcting the row's DATE, because the real invoice fell in the
--   previous month, moves it outside the month's date window, so the same
--   thing happens and the correction is silently reverted.
--
-- A row here says "this month was dealt with", and it survives both.
CREATE TABLE IF NOT EXISTS public.recurring_applications (
  template_id uuid NOT NULL REFERENCES public.recurring_expenditures(id) ON DELETE CASCADE,
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- False when an admin pressed the button, true when the page did it.
  automatic boolean NOT NULL DEFAULT true,
  PRIMARY KEY (template_id, month)
);

COMMENT ON TABLE public.recurring_applications IS
  'One row per recurring template per month it has been booked into. The record that stops the automatic booking running twice, or undoing an admin who deleted or re-dated the cost on purpose.';

-- ------------------------------ a closed month is not booked into, at all
--
-- The client checks this before booking, but a client check is a courtesy
-- and this is money entering a month that has been paid and signed off.
-- Scoped to recurring rows on purpose: close-payroll-month books the wage
-- bill into expenditures while the period is still open, and hand-entered
-- corrections to a closed month are an existing freedom. Neither is what
-- this is guarding.
CREATE OR REPLACE FUNCTION public.refuse_recurring_write_to_locked_month()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  blocked text;
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.source_kind IS NOT DISTINCT FROM 'recurring'
     AND public.payroll_month_is_locked(to_char(NEW.date, 'YYYY-MM')) THEN
    blocked := to_char(NEW.date, 'YYYY-MM');
  ELSIF TG_OP <> 'INSERT' AND OLD.source_kind IS NOT DISTINCT FROM 'recurring'
     AND public.payroll_month_is_locked(to_char(OLD.date, 'YYYY-MM')) THEN
    -- Also the way OUT: moving a standing cost off a closed month would
    -- change what that month reported just as surely as adding one.
    blocked := to_char(OLD.date, 'YYYY-MM');
  END IF;

  IF blocked IS NOT NULL THEN
    RAISE EXCEPTION
      'Payroll for % is closed, so a standing cost cannot be booked into or out of it. Reopen the month, or book the cost in an open one.', blocked
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END
$fn$;

DROP TRIGGER IF EXISTS refuse_recurring_in_locked_month ON public.expenditures;
CREATE TRIGGER refuse_recurring_in_locked_month
  BEFORE INSERT OR UPDATE OR DELETE ON public.expenditures
  FOR EACH ROW EXECUTE FUNCTION public.refuse_recurring_write_to_locked_month();

-- ------------------------------------------------------- frozen snapshots
--
-- Written when a payroll month is closed, so a class P&L printed today
-- reproduces next year. An open month is computed live.
CREATE TABLE IF NOT EXISTS public.class_overhead_allocations (
  -- YYYY-MM, the same string payroll_periods uses. Deliberately NOT a
  -- foreign key to payroll_periods: the freeze below runs BEFORE that row
  -- is written, so an FK would refuse the snapshot of the very month
  -- being closed.
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,

  -- The name as it stood, for the same reason payroll_lines keeps
  -- staff_name: a record of what a class was charged should still read
  -- correctly after the class is renamed.
  class_name text NOT NULL,

  -- The two inputs, kept so the figure can be explained a year later
  -- without recomputing anything.
  sessions_count integer NOT NULL CHECK (sessions_count >= 0),
  pool_vnd bigint NOT NULL CHECK (pool_vnd >= 0),

  share_vnd bigint NOT NULL CHECK (share_vnd >= 0),

  frozen_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (month, class_id)
);

COMMENT ON TABLE public.class_overhead_allocations IS
  'What each class was charged for standing costs in a closed month. Written by the freeze trigger on payroll_periods, not by hand. An open month is not in here - it is computed live by class_overhead_for_month.';

-- ------------------------------------------------------- who may read it
--
-- The functions below read expenditures as the definer, bypassing the row
-- policies that would otherwise keep a teacher out. One predicate, so the
-- answers cannot drift apart.
--
-- Deliberately no escape hatch for a superuser session: session_user is
-- 'postgres' in the SQL editor, and letting that through would be a hole
-- that is invisible from the application. To call these by hand there,
-- take the service role for the statement first:
--
--   SET LOCAL ROLE service_role;
--   SELECT * FROM public.class_overhead_for_month('2026-07');
CREATE OR REPLACE FUNCTION public.class_overhead_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(current_setting('role', true), '') = 'service_role'
      OR public.has_role(auth.uid(), 'admin'::app_role);
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_reader() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_reader() TO authenticated, service_role;

-- ------------------------------------------------------------- the maths
--
-- Internal. Always computes; never consults the snapshot. The freeze needs
-- a live answer at the moment of closing, and the public wrapper needs one
-- for an open month.
CREATE OR REPLACE FUNCTION public.class_overhead_compute(p_month text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  sessions_count integer,
  share_vnd bigint,
  pool_vnd bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_month text := substring(p_month from 1 for 7);
  v_start date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_next  date := (to_date(v_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
  v_pool  bigint;
BEGIN
  SELECT COALESCE(SUM(e.amount), 0)::bigint
    INTO v_pool
    FROM public.expenditures e
    JOIN public.recurring_expenditures t ON t.id = e.source_template_id
   WHERE t.allocate_to_classes
     AND e.date >= v_start
     AND e.date <  v_next;

  IF v_pool <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ran AS (
    SELECT s.class_id AS cid, COUNT(*)::integer AS cnt
      FROM public.sessions s
     WHERE s.date >= v_start
       AND s.date <  v_next
       AND s.status <> 'Canceled'
       AND s.class_id IS NOT NULL
     GROUP BY s.class_id
  ),
  denom AS (
    SELECT COALESCE(SUM(cnt), 0)::bigint AS total FROM ran
  ),
  -- Integer division first, then the leftover dong handed out one at a
  -- time to the largest fractional parts. Rounding each share on its own
  -- would leave the column not adding up to the bill, which is the first
  -- thing anyone checks.
  split AS (
    SELECT r.cid,
           r.cnt,
           (v_pool * r.cnt) / d.total AS base,
           (v_pool * r.cnt) % d.total AS rem
      FROM ran r CROSS JOIN denom d
     WHERE d.total > 0
  ),
  leftover AS (
    SELECT v_pool - COALESCE(SUM(base), 0) AS n FROM split
  ),
  ranked AS (
    SELECT s.*,
           ROW_NUMBER() OVER (ORDER BY s.rem DESC, s.cnt DESC, s.cid) AS rn
      FROM split s
  )
  SELECT r.cid,
         COALESCE(c.name, 'Deleted class'),
         r.cnt,
         (r.base + CASE WHEN r.rn <= l.n THEN 1 ELSE 0 END)::bigint,
         v_pool
    FROM ranked r
    CROSS JOIN leftover l
    LEFT JOIN public.classes c ON c.id = r.cid;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_compute(text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_compute(text) TO service_role;

COMMENT ON FUNCTION public.class_overhead_compute(text) IS
  'Live split of a month''s shared standing costs across the classes that ran. Internal - call class_overhead_for_month instead, which honours a closed month''s frozen figures.';

-- ------------------------------------------------------ what the UI calls
--
-- A closed month reports what it was closed at - including reporting
-- NOTHING, when nothing was shared at the time it closed. Frozen-ness is
-- decided by the lock alone, never by "is there a snapshot": a month
-- closed while no template was shared has an empty snapshot, and if an
-- empty snapshot fell through to the live branch then switching a
-- template on in November would retroactively charge a closed October.
--
-- Reopening deliberately returns to live figures. The snapshot stays as
-- the record of what the month was closed at, and re-closing replaces it.
CREATE OR REPLACE FUNCTION public.class_overhead_for_month(p_month text)
RETURNS TABLE (
  class_id uuid,
  class_name text,
  sessions_count integer,
  share_vnd bigint,
  pool_vnd bigint,
  frozen boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_month text := substring(p_month from 1 for 7);
BEGIN
  -- What the school pays in rent is not a teacher's business, and this
  -- reads expenditures as the definer. The check is explicit rather than
  -- left to the row policies it bypasses.
  IF NOT public.class_overhead_reader() THEN
    RAISE EXCEPTION 'Only an admin can read class overhead.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF public.payroll_month_is_locked(v_month) THEN
    RETURN QUERY
      SELECT a.class_id, a.class_name, a.sessions_count, a.share_vnd, a.pool_vnd, true
        FROM public.class_overhead_allocations a
       WHERE a.month = v_month;
  ELSE
    RETURN QUERY
      SELECT c.class_id, c.class_name, c.sessions_count, c.share_vnd, c.pool_vnd, false
        FROM public.class_overhead_compute(v_month) c;
  END IF;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_for_month(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_for_month(text) TO authenticated, service_role;

-- The pool on its own, so the report can say "this much could not be
-- allocated" rather than quietly dropping it in a month that has standing
-- costs but no sessions at all.
--
-- Gated on the lock in exactly the same way as class_overhead_for_month.
-- The report subtracts one from the other, and two functions answering
-- from different versions of the truth would invent a shortfall that is
-- not there.
CREATE OR REPLACE FUNCTION public.class_overhead_pool(p_month text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_month text := substring(p_month from 1 for 7);
  v_start date := to_date(v_month || '-01', 'YYYY-MM-DD');
  v_next  date := (to_date(v_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date;
  v_pool  bigint;
BEGIN
  IF NOT public.class_overhead_reader() THEN
    RAISE EXCEPTION 'Only an admin can read class overhead.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF public.payroll_month_is_locked(v_month) THEN
    -- Every snapshot row carries the same pool, so one of them is the
    -- answer; no rows means nothing was shared when the month closed.
    SELECT COALESCE(MAX(a.pool_vnd), 0) INTO v_pool
      FROM public.class_overhead_allocations a
     WHERE a.month = v_month;
    RETURN v_pool;
  END IF;

  SELECT COALESCE(SUM(e.amount), 0)::bigint
    INTO v_pool
    FROM public.expenditures e
    JOIN public.recurring_expenditures t ON t.id = e.source_template_id
   WHERE t.allocate_to_classes
     AND e.date >= v_start
     AND e.date <  v_next;

  RETURN v_pool;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_overhead_pool(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_overhead_pool(text) TO authenticated, service_role;

-- ---------------------------------------------------------------- freeze
--
-- BEFORE, not AFTER, and that is load-bearing. class_overhead_allocations
-- carries refuse_write_to_locked_payroll below, so a snapshot written
-- after payroll_periods had flipped to locked would be refused by the very
-- lock it is recording. Writing it first mirrors close-payroll-month's own
-- order: the record goes in while the month is still open, and the lock is
-- the last thing that happens.
--
-- DELETE THEN INSERT, not an upsert. A re-close after a correction can
-- drop a class out of the split entirely - its lessons turned out to be
-- cancelled, or the last shared template was switched off - and an upsert
-- would leave that class's old share standing beside the new ones. The
-- month would then report more overhead than the ledger holds, which is
-- precisely the guarantee this file opens by making.
CREATE OR REPLACE FUNCTION public.freeze_class_overhead_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.status = 'locked'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'locked') THEN
    DELETE FROM public.class_overhead_allocations WHERE month = NEW.month;

    INSERT INTO public.class_overhead_allocations
      (month, class_id, class_name, sessions_count, pool_vnd, share_vnd, frozen_at)
    SELECT NEW.month, c.class_id, c.class_name, c.sessions_count, c.pool_vnd, c.share_vnd, now()
      FROM public.class_overhead_compute(NEW.month) c;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS freeze_class_overhead ON public.payroll_periods;
CREATE TRIGGER freeze_class_overhead
  BEFORE INSERT OR UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.freeze_class_overhead_on_close();

-- Once a month is closed its shares stop moving, the same way its payroll
-- lines do.
DROP TRIGGER IF EXISTS refuse_locked_class_overhead ON public.class_overhead_allocations;
CREATE TRIGGER refuse_locked_class_overhead
  BEFORE INSERT OR UPDATE OR DELETE ON public.class_overhead_allocations
  FOR EACH ROW EXECUTE FUNCTION public.refuse_write_to_locked_payroll();

-- ------------------------------------------------------------------- RLS
ALTER TABLE public.class_overhead_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage class overhead" ON public.class_overhead_allocations;
CREATE POLICY "Admins manage class overhead"
ON public.class_overhead_allocations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage recurring applications" ON public.recurring_applications;
CREATE POLICY "Admins manage recurring applications"
ON public.recurring_applications
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------- grants
--
-- Explicit, because 20260712023825 revoked the defaults on public: a new
-- table arrives with no privileges, and PostgREST reports a table it
-- cannot reach as missing from the schema cache rather than as forbidden.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_overhead_allocations TO authenticated;
GRANT ALL ON public.class_overhead_allocations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_applications TO authenticated;
GRANT ALL ON public.recurring_applications TO service_role;

-- ----------------------------------------------------------------- audit
--
-- WHAT THIS CATCHES AND WHAT IT DOES NOT. audit_row_change() returns early
-- at pg_trigger_depth() > 1 (20261009130000), and the freeze writes its
-- rows from inside a trigger on payroll_periods - depth 2 - so the
-- snapshot itself is not logged here. It does not need to be: the close
-- and the reopen that cause it ARE logged, by the audit trigger payroll
-- locking put on payroll_periods, and every snapshot row carries its own
-- frozen_at. What this covers is the case that would otherwise be
-- invisible - someone writing these rows directly, while the month is
-- open and the refusal trigger above is not watching.
DO $do$
DECLARE
  t text;
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE NOTICE 'public.audit_row_change() not present; class overhead will not be audited.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['class_overhead_allocations', 'recurring_applications'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';
