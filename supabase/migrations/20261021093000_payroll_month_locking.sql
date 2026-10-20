-- Closing a payroll month, so what was paid stops moving.
--
-- ------------------------------------------------------------------------
-- WHAT IS WRONG TODAY
-- ------------------------------------------------------------------------
--
-- Nothing records that anyone was paid. payroll_summaries is the only
-- staff-side row and has no notion of paid or final; there is no staff
-- payment table at all. Worse, calculate-payroll upserts that table
-- unconditionally and useFinanceSummary / useFinanceOverview invoke
-- calculate-payroll as part of a READ - so simply opening the finance
-- dashboard rewrites every teacher's stored total for the selected month.
-- It is not a record, it is a cache, and nothing trusts it: the screens
-- recompute their own figures anyway.
--
-- effective-dated rates (20261021090000) stopped a raise from silently
-- re-pricing a paid month. They do not stop someone deliberately amending
-- a baseline, or an attendance correction landing on a month that has
-- already gone out the door.
--
-- ------------------------------------------------------------------------
-- WHAT LOCKING MEANS HERE, AND WHAT IT DOES NOT
-- ------------------------------------------------------------------------
--
-- It freezes the FIGURES, not the INPUTS.
--
-- A locked month keeps the numbers it was locked with. Sessions and
-- attendance in that month stay editable, because correcting attendance
-- after the fact is normal work - repair-attendance exists for exactly
-- that - and a lock that turned a routine correction into an
-- administrative appeal would be worked around rather than used. What
-- changes is that the correction no longer silently restates the month:
-- it shows as a variance against the locked figures, and is carried into
-- the next open month as an adjustment.
--
-- That is the ordinary payroll answer to a late correction. It keeps the
-- record of what was actually paid true, which a retrospective edit does
-- not.
--
-- ------------------------------------------------------------------------
-- WHY A TRIGGER AND NOT A POLICY
-- ------------------------------------------------------------------------
--
-- calculate-payroll runs on the service-role key, which bypasses RLS
-- entirely. The write this has to stop is precisely that one. A lock
-- expressed as a row-level policy would stop nobody.

-- --------------------------------------------------------------- periods

CREATE TABLE IF NOT EXISTS public.payroll_periods (
  -- YYYY-MM. The same string calculate-payroll already takes as `month`.
  month text PRIMARY KEY CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),

  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Kept on the row as well as in audit_log so the Payroll tab can say
  -- "reopened on the 3rd by X because Y" without a second query.
  reopened_at timestamptz,
  reopened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reopen_reason text,

  note text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payroll_periods_locked_has_when
    CHECK (status <> 'locked' OR locked_at IS NOT NULL)
);

COMMENT ON TABLE public.payroll_periods IS
  'One row per payroll month. A locked month keeps the figures in payroll_lines; later input changes surface as a variance and are carried into the next open month as an adjustment.';

-- ----------------------------------------------------------------- lines
--
-- What was actually paid, per person, snapshotted at the moment of lock.
-- This is the thing that did not exist before.
--
-- It records the RATE as well as the amount, which payroll_summaries never
-- did, so a line explains itself years later without having to resolve
-- staff_pay_rates all over again. And it covers teaching assistants, which
-- payroll_summaries also never did - its only foreign key is to teachers,
-- while the expenditure booking has always included TAs, so the two
-- staff-side records disagreed about who exists.

CREATE TABLE IF NOT EXISTS public.payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL REFERENCES public.payroll_periods(month) ON DELETE CASCADE,

  -- RESTRICT, not SET NULL: a paid line is history, and history is the
  -- thing archive-not-delete exists to protect. It also keeps the XOR
  -- below satisfiable, which SET NULL would not.
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE RESTRICT,
  assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE RESTRICT,

  -- Snapshotted rather than joined. Someone may be renamed, and a payslip
  -- that silently changes whose it was is not a record.
  staff_name text NOT NULL,

  pay_rate_type text NOT NULL CHECK (pay_rate_type IN ('hourly', 'per_session')),
  hourly_rate_vnd integer NOT NULL DEFAULT 0,
  per_session_rate_vnd integer NOT NULL DEFAULT 0,

  sessions_count integer NOT NULL DEFAULT 0,
  total_minutes integer NOT NULL DEFAULT 0,
  total_amount_vnd integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT payroll_lines_one_subject_check
    CHECK ((teacher_id IS NOT NULL) <> (assistant_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS payroll_lines_month_teacher_key
  ON public.payroll_lines (month, teacher_id) WHERE teacher_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payroll_lines_month_assistant_key
  ON public.payroll_lines (month, assistant_id) WHERE assistant_id IS NOT NULL;

COMMENT ON TABLE public.payroll_lines IS
  'What each member of staff was paid for a month, with the rate as it stood. Written when the month is closed; refused while it is locked.';

-- ----------------------------------------------------------- adjustments
--
-- A correction found after a month was paid does not reach back into it.
-- It lands here, against the next OPEN month, carrying the month it came
-- from so the Payroll tab can say "+120,000 - September, three lessons
-- marked Held late".

CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /** The open month this is paid in. */
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  /** The locked month it is correcting. */
  origin_month text NOT NULL CHECK (origin_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),

  teacher_id uuid REFERENCES public.teachers(id) ON DELETE RESTRICT,
  assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE RESTRICT,

  /** Signed. An overpayment carried forward is negative. */
  amount_vnd integer NOT NULL,
  reason text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT payroll_adjustments_one_subject_check
    CHECK ((teacher_id IS NOT NULL) <> (assistant_id IS NOT NULL)),
  -- An adjustment that corrects nothing is a mistake, not a zero.
  CONSTRAINT payroll_adjustments_nonzero_check CHECK (amount_vnd <> 0),
  CONSTRAINT payroll_adjustments_not_self_check CHECK (month <> origin_month)
);

CREATE INDEX IF NOT EXISTS payroll_adjustments_month_idx
  ON public.payroll_adjustments (month);

COMMENT ON TABLE public.payroll_adjustments IS
  'A correction to a locked month, paid in a later open one. The locked month keeps the figures it was paid on.';

-- --------------------------------------------------------------- the lock

CREATE OR REPLACE FUNCTION public.payroll_month_is_locked(p_month text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.payroll_periods
    WHERE month = substring(p_month from 1 for 7) AND status = 'locked'
  );
$fn$;

REVOKE EXECUTE ON FUNCTION public.payroll_month_is_locked(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.payroll_month_is_locked(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refuse_write_to_locked_payroll()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  target text;
BEGIN
  -- month is text 'YYYY-MM' on payroll_lines and may be either text or a
  -- date on payroll_summaries depending on how it was created; substring
  -- of the text form answers both.
  target := substring(COALESCE(NEW.month, OLD.month)::text from 1 for 7);

  IF public.payroll_month_is_locked(target) THEN
    RAISE EXCEPTION
      'Payroll for % is locked. Reopen the month, or record an adjustment against a later one.', target
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END
$fn$;

-- payroll_lines: written by the close action itself, so the trigger must
-- not fire on the insert that accompanies the lock. It does not: the close
-- action writes the lines FIRST and sets status last.
DROP TRIGGER IF EXISTS refuse_locked_payroll_lines ON public.payroll_lines;
CREATE TRIGGER refuse_locked_payroll_lines
  BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_lines
  FOR EACH ROW EXECUTE FUNCTION public.refuse_write_to_locked_payroll();

-- payroll_summaries: the one that matters. This is the write that happens
-- on a dashboard load, on the service role, with RLS not consulted.
DROP TRIGGER IF EXISTS refuse_locked_payroll_summaries ON public.payroll_summaries;
CREATE TRIGGER refuse_locked_payroll_summaries
  BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_summaries
  FOR EACH ROW EXECUTE FUNCTION public.refuse_write_to_locked_payroll();

-- ------------------------------------------------------------------ RLS
--
-- Reads: admins see everything. Staff see their own lines and their own
-- adjustments - it is their pay - and the period rows, which carry no
-- money and let a teacher's own payroll screen say "September is closed".
--
-- Writes: admins only, everywhere. Closing a month is an admin act and
-- reopening one is more so.

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage payroll periods" ON public.payroll_periods;
CREATE POLICY "Admins manage payroll periods"
  ON public.payroll_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can see which months are closed" ON public.payroll_periods;
CREATE POLICY "Staff can see which months are closed"
  ON public.payroll_periods FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage payroll lines" ON public.payroll_lines;
CREATE POLICY "Admins manage payroll lines"
  ON public.payroll_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read their own payroll lines" ON public.payroll_lines;
CREATE POLICY "Staff read their own payroll lines"
  ON public.payroll_lines FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers t
            WHERE t.id = payroll_lines.teacher_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teaching_assistants a
               WHERE a.id = payroll_lines.assistant_id AND a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Admins manage payroll adjustments"
  ON public.payroll_adjustments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read their own adjustments" ON public.payroll_adjustments;
CREATE POLICY "Staff read their own adjustments"
  ON public.payroll_adjustments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers t
            WHERE t.id = payroll_adjustments.teacher_id AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teaching_assistants a
               WHERE a.id = payroll_adjustments.assistant_id AND a.user_id = auth.uid())
  );

-- Table privileges are explicit in this database - 20260712023825 revoked
-- the defaults and re-granted every table by hand. Without these, RLS
-- never gets a chance to run.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_adjustments TO authenticated;
GRANT ALL ON public.payroll_periods TO service_role;
GRANT ALL ON public.payroll_lines TO service_role;
GRANT ALL ON public.payroll_adjustments TO service_role;

-- ---------------------------------------------------------------- audit
--
-- Closing, reopening, and every line and adjustment. Reopening a paid
-- month is the act most worth being able to reconstruct afterwards.
DO $do$
DECLARE
  t text;
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE NOTICE 'public.audit_row_change() not present; payroll locking will not be audited.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['payroll_periods', 'payroll_lines', 'payroll_adjustments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END
$do$;
