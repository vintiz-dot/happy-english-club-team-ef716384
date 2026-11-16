-- F-20 (S2): hardening - the parts that change nothing a person sees.
--
-- THE DEFECT (audit F-20), the four items taken here:
--   a. video_staff_for_class(class) answers TRUE whenever auth.uid() is NULL
--      (meant for the service role). anon cannot execute it today, but a
--      future grant or a `TO public` policy using it would make an anonymous
--      caller "staff" on every video table.
--   b. is_enrolled_in_class, is_linked_student and the three
--      language_support_* helpers are executable by anon (PUBLIC's default
--      EXECUTE): yes/no answers about any account, with no sign-in.
--   c. recompute_student_points(student, class, month) is SECURITY DEFINER
--      and executable by anon and authenticated with no check. It only
--      re-sums point_transactions (no wrong figure possible), but anyone can
--      make the database do it in a loop.
--   d. payroll_periods "Staff can see which months are closed" is USING
--      (true): every signed-in account - a parent, a child - reads which
--      months are closed, by which admin, with the note and reopen reason.
--
-- WHAT THIS DOES
--   a. NULL uid counts as the service role only when the request is not
--      anon's or a signed-in user's (auth.role() is neither): the service
--      role, cron and SQL run by the owner keep passing.
--   b. EXECUTE taken from PUBLIC and anon; authenticated and service_role
--      keep it (every policy that calls them is TO authenticated).
--   c. EXECUTE taken from PUBLIC, anon and authenticated; service_role keeps
--      it. The points trigger (update_student_points_from_transaction) is
--      SECURITY DEFINER and calls it as the owner; nothing in src/ or
--      supabase/functions calls it over RPC.
--   d. Readable by admins and role teacher (the policy's own name: staff).
--      Every reader is an admin screen (PayrollTab, PayrollMonthLock,
--      RecurringExpendituresManager, OperationalReports) or runs on the
--      service role (calculate-payroll, close-payroll-month); the definer
--      functions that read it (payroll_month_is_locked, the locks, the
--      overhead freeze, session_held_evidence, D4's register) run as owner.
--
-- NOT TAKEN HERE (in the evidence, with why): revoking anon's table
-- privileges (needs the anon-reachable policies read on live first), the
-- user-id oracle helpers for authenticated (policies need them; wrappers are
-- a larger change), refresh_invoice_carry (money path), public avatar
-- buckets and the dead avatar-policy branch (owner / live text needed).
-- Rows: none changed. Idempotent. Rollback: <!-- rollback F-20 -->.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.video_staff_for_class(uuid)') IS NULL
     OR to_regprocedure('public.recompute_student_points(uuid, uuid, text)') IS NULL
     OR to_regprocedure('public.is_enrolled_in_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.is_linked_student(uuid, uuid)') IS NULL
     OR to_regclass('public.payroll_periods') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: video_staff_for_class / recompute_student_points / is_enrolled_in_class / is_linked_student / payroll_periods missing';
  END IF;
  -- The points trigger must call recompute as the owner, or (c) would stop
  -- a teacher's award from updating the leaderboard.
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_student_points_from_transaction' AND NOT prosecdef) THEN
    RAISE EXCEPTION 'Refusing to install: update_student_points_from_transaction is not SECURITY DEFINER';
  END IF;
END
$preflight$;

-- a.
CREATE OR REPLACE FUNCTION public.video_staff_for_class(p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.uid() IS NULL AND coalesce(auth.role(), '') NOT IN ('anon', 'authenticated'))
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_teacher_of_class(auth.uid(), p_class);
$$;
REVOKE ALL ON FUNCTION public.video_staff_for_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.video_staff_for_class(uuid) TO authenticated, service_role;

-- b.
REVOKE EXECUTE ON FUNCTION public.is_enrolled_in_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_linked_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_class(uuid, uuid), public.is_linked_student(uuid, uuid) TO authenticated, service_role;
DO $ls$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.language_support_staff_for_class(uuid)', 'public.language_support_family_can_read(uuid)',
                           'public.language_support_staff_can_read(uuid)'] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
    END IF;
  END LOOP;
END
$ls$;

-- c.
REVOKE EXECUTE ON FUNCTION public.recompute_student_points(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_student_points(uuid, uuid, text) TO service_role;

-- d.
DROP POLICY IF EXISTS "Staff can see which months are closed" ON public.payroll_periods;
CREATE POLICY "Staff can see which months are closed"
  ON public.payroll_periods FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

DO $postflight$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_periods'
               AND cmd IN ('SELECT', 'ALL') AND coalesce(qual, '') ~ '^\(?true\)?$') THEN
    RAISE EXCEPTION 'Refusing to install: payroll_periods still has a USING (true) read policy';
  END IF;
END
$postflight$;

COMMIT;
