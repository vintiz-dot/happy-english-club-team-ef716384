-- ROLLBACK of D4 step 3A (supabase/migrations/20261114093000_d4_lesson_pay_guard.sql).
--
-- WHEN (release-note sentence): an admin or teacher cannot mark today's
-- lesson Held, change today's teacher or assistants, or create a lesson for
-- today or later, with an error that names zz2_session_pay_guard,
-- zz_session_insert_guard, zz_session_staff_guard or kind=unhold / hold /
-- reteach / retime / restaff / create_past; or the Stars sync reports a page
-- that failed on sessions. Nothing is lost by rolling back; tell the
-- conductor.
--
-- THREE STEPS, ALL REQUIRED, in this order, in one sitting
-- (docs/evidence/D4-3a-live-apply-brief.md "Rollback" has the exact files):
--   1. Paste this file: it drops the three lesson-pay triggers and nothing
--      else.
--   2. At once, redeploy the PREVIOUS functions - the versions before step
--      3A, saved in docs/evidence/D4-3a-rollback-before/: manage-session,
--      and every other one that went out with 3A (bulk-cancel-sessions,
--      schedule-sessions, mark-attendance v4). NOT optional: with the
--      triggers gone money_change_checked refuses every 'session' change
--      (HC050 guard_broken), and the step 3A manage-session sends the new
--      actions set-teacher / set-time / set-staff and every acknowledged
--      status change through it.
--   3. Revert the step 3A SCREENS (git revert of the 3A src/ files, then
--      the normal Cloudflare deploy). NOT optional either: the 3A screens
--      open the lesson-pay check (PayGuardDialog) straight away for a Held
--      -> Scheduled change (SessionActionsModal) and a Held lesson's time
--      edit (EditSessionModal), and its first call is manage-session
--      `pay-preview`, which the previous manage-session does not have (400
--      bad_request): taking a lesson off Held, or changing a held lesson's
--      time, would have no working route in the app.
--   Steps 2 and 3 keep each other honest: the old screens against the new
--   function would hit HC050; the new screens against the old function
--   would hit 400. Only all three together are the behaviour of before 3A.
--
-- WHAT STAYS, on purpose (scripts/pgtest/d4-lesson-pay.test.mjs checks it):
--   * every money_change_overrides / money_change_events row: the record of
--     who changed which lesson's pay, with which reason. Never dropped.
--   * every function of the file (the plan / exec pair of the 'session'
--     entity, the classifier). money_change_checked keeps refusing to work
--     without the trigger (HC050, nothing written): closed.
-- D2's guard on sessions (zz_session_change_guard_upd / _del), step 1a and
-- step 1b are not touched.

BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS zz2_session_pay_guard ON public.sessions;
DROP TRIGGER IF EXISTS zz_session_insert_guard ON public.sessions;
DROP TRIGGER IF EXISTS zz_session_staff_guard ON public.session_participants;
COMMIT;

SELECT count(*) AS d4_lesson_pay_triggers_left
  FROM pg_trigger WHERE NOT tgisinternal
   AND tgname IN ('zz2_session_pay_guard', 'zz_session_insert_guard', 'zz_session_staff_guard');
