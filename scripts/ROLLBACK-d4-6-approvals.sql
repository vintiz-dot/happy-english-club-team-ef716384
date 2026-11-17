-- ROLLBACK of D4 step 4 (supabase/migrations/20261114095000_d4_change_approvals.sql).
--
-- WHEN (release-note sentence): with approval switched ON, ordinary work
-- stops on "approval_required" / "guard_broken" errors that a second
-- administrator cannot clear, or an approval does the wrong thing. While it
-- is switched OFF (as shipped) there is nothing to roll back. Nothing is lost
-- by rolling back; tell the conductor.
--
-- ONE STEP: paste this file. It drops the three approval triggers and
-- nothing else. Approvals then READ AS OFF: change_approval_needed answers
-- "not required" for everything (it reads "installed" from the first
-- trigger below), requests are refused as "approval_not_needed", and a
-- waiting request can no longer be approved (guard_broken: rolled back).
-- Every checked change works as before step 4. No function or screen needs
-- redeploying (the step 4 screens say "rolled back" on the settings card).
--
-- WHAT STAYS, on purpose (scripts/pgtest/d4-approvals.test.mjs checks it):
--   * change_approval_settings / _requests / _events with their rows: the
--     record of who asked and who decided. Never dropped.
--   * every function of the file, including change_approval_needed and
--     _change_request_claim (1b creates its stubs only if missing, so a
--     re-paste of 1b does not put them back) and the step 4 body of
--     _money_change_full_plan (identical to 1b's apart from the impact it
--     hands the approval rule). To put 1b's text of _money_change_full_plan
--     back, paste 20261114091000_d4_core_register.sql again (idempotent),
--     only AFTER this script.
-- Steps 1a to 3B are not touched; roll them back separately, after this one.

BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS zz_session_override_approval ON public.session_cancel_overrides;
DROP TRIGGER IF EXISTS zz_admin_grant_guard         ON public.user_roles;
DROP TRIGGER IF EXISTS zz_pay_adjustment_approval   ON public.payroll_adjustments;
COMMIT;

SELECT count(*) AS d4_approval_triggers_left
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgname IN ('zz_session_override_approval', 'zz_admin_grant_guard', 'zz_pay_adjustment_approval');
