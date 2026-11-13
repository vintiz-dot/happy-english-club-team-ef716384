-- ROLLBACK of D4 step 1b (supabase/migrations/20261114091000_d4_core_register.sql).
--
-- WHEN (release-note sentence): teachers or admins cannot save today's
-- register, or a register / repair save fails with an error that names
-- zz_attendance_money_guard or attendance_requires_checked_path for a lesson
-- of this week. Nothing is lost by rolling back; tell the conductor.
--
-- TWO STEPS, BOTH REQUIRED:
--   1. Paste this file: it drops the register's money guard trigger and
--      nothing else.
--   2. At once, redeploy the PREVIOUS repair-attendance and mark-attendance
--      (live v3 before step 1b = origin/main f5987804; saved, LF, in
--      docs/evidence/D4-1b-rollback-v3/<name>/index.ts.txt - deploy each as
--      index.ts with its unchanged ../_lib imports, verify_jwt = true).
--      NOT optional: with the trigger gone money_change_checked refuses
--      everything (HC050), and the step 1b repair-attendance sends EVERY
--      repair through it, so the repair tool stops working entirely; the
--      step 1b mark-attendance's old-lesson dialog stops the same way.
--      guarded-change-refresh may stay (it only refreshes bills).
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
