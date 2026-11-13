-- ROLLBACK of D4 step 1b (supabase/migrations/20261114091000_d4_core_register.sql).
--
-- WHEN (release-note sentence): teachers or admins cannot save today's
-- register, or a register / repair save fails with an error that names
-- zz_attendance_money_guard or attendance_requires_checked_path for a lesson
-- of this week. Nothing is lost by rolling back; tell the conductor.
--
-- ONE PASTE: this file drops the register's money guard trigger and nothing
-- else. Then redeploy the previous mark-attendance and repair-attendance
-- (git: the commit before step 1b), or leave the step 1b versions: with the
-- trigger gone their checked path still works but refuses nothing.
--
-- WHAT STAYS, on purpose (scripts/pgtest/d4-register.test.mjs checks it):
--   * money_change_overrides and money_change_events with their rows,
--     append-only guards and admin-read policies: the record of who changed
--     what with which reason. Never dropped.
--   * the views money_change_review_queue and money_change_tuition_pending.
--   * every function of the file. money_change_checked keeps refusing to
--     work without its trigger (HC050 guard_broken, nothing written): closed.
--     The other RPCs only read.
-- Step 1a (the floors) is not touched; roll it back separately with
-- scripts/ROLLBACK-d4-1-floors.sql (after this one).

BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS zz_attendance_money_guard ON public.attendance;
COMMIT;

SELECT count(*) AS d4_register_triggers_left
  FROM pg_trigger WHERE NOT tgisinternal AND tgname = 'zz_attendance_money_guard';
