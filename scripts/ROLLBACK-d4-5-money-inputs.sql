-- ROLLBACK of D4 step 3B (supabase/migrations/20261114094000_d4_money_inputs_guard.sql).
--
-- WHEN (release-note sentence): an ordinary enrolment, discount, pay-rate or
-- family change of THIS month cannot be saved, or one fails with an error
-- that names one of the triggers below, money_change_requires_checked_path
-- or guard_broken where the screen offers no reason dialog. Nothing is lost
-- by rolling back; tell the conductor.
--
-- TWO STEPS, BOTH REQUIRED:
--   1. Paste this file: it drops the nine money-input guard triggers (on
--      twelve tables) and nothing else.
--   2. At once, redeploy the PREVIOUS update-enrollment-rate and
--      create-family (the versions live before step 3B) and publish the
--      previous screens. NOT optional: with the triggers gone
--      money_change_checked refuses every money-input change (HC050
--      guard_broken, nothing written) - closed - and the step 3B screens
--      and those two functions send their changes through it.
--      manage-demo-student and admin-data-import may stay as they are.
--
-- WHAT STAYS, on purpose (scripts/pgtest/d4-money-inputs.test.mjs checks it):
--   * money_change_overrides / money_change_events with their rows: the
--     record of who changed what with which reason. Never dropped.
--   * audit_families (an audit trigger, not a guard).
--   * every function of the file, change_enrollment_terms included (it is
--     an ordinary dated RPC like change_enrollment_days).
--   * the step 3B body of _money_enrollment_rpc_call(). With the enrolment
--     guard gone it answers exactly as step 1b's did (a direct
--     end / pause / transfer RPC's register writes are recorded, not
--     refused). To put the step 1b text itself back, paste
--     20261114091000_d4_core_register.sql again (idempotent) - only AFTER
--     this script, never while the step 3B triggers are installed.
-- Steps 1a and 1b are not touched; roll them back separately, after this
-- one (scripts/ROLLBACK-d4-2-register.sql, then ROLLBACK-d4-1-floors.sql).

BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS zz_enrollment_money_guard    ON public.enrollments;
DROP TRIGGER IF EXISTS zz_discount_money_guard      ON public.discount_assignments;
DROP TRIGGER IF EXISTS zz_discount_money_guard      ON public.referral_bonuses;
DROP TRIGGER IF EXISTS zz_discount_definition_guard ON public.discount_definitions;
DROP TRIGGER IF EXISTS zz_pay_rate_money_guard      ON public.staff_pay_rates;
DROP TRIGGER IF EXISTS zz_staff_pay_mirror_guard    ON public.teachers;
DROP TRIGGER IF EXISTS zz_staff_pay_mirror_guard    ON public.teaching_assistants;
DROP TRIGGER IF EXISTS zz_invoice_unfreeze_guard    ON public.invoices;
DROP TRIGGER IF EXISTS zz_family_link_guard         ON public.students;
DROP TRIGGER IF EXISTS zz_family_link_guard         ON public.families;
DROP TRIGGER IF EXISTS zz_student_delete_guard      ON public.students;
DROP TRIGGER IF EXISTS zz_class_delete_guard        ON public.classes;
COMMIT;

SELECT count(*) AS d4_money_input_triggers_left
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgname IN ('zz_enrollment_money_guard', 'zz_discount_money_guard', 'zz_discount_definition_guard',
                  'zz_pay_rate_money_guard', 'zz_staff_pay_mirror_guard', 'zz_invoice_unfreeze_guard',
                  'zz_family_link_guard', 'zz_student_delete_guard', 'zz_class_delete_guard');
