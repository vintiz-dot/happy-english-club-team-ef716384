-- ROLLBACK of D4 step 2 (supabase/migrations/20261114092000_d4_class_fee_history.sql).
-- (Named "-3-" after its place in the design's list, docs/evidence/D4-design.md f.7.)
--
-- WHEN (release-note sentence): saving a class's settings, or a new fee in a
-- class's Fee history, fails with an error naming zz_class_fee_money_guard,
-- zz_class_fee_mirror_guard or money_change_requires_checked_path when it
-- should not; or a bill is priced at a fee the history does not show. Nothing
-- is lost by rolling back; tell the conductor.
--
-- WHAT IT DOES, in one transaction:
--   1. brings the mirror level FIRST: classes.session_rate_vnd :=
--      class_fee_on(id, today in Hanoi), for every class whose history has a
--      fee for today. A calculator of before step 2 (which reads the mirror)
--      then prices as the history does today - this month's lessons at
--      today's fee. Past months were dated in the history only: a calculator
--      of before step 2 prices them at today's fee again, which is exactly
--      the behaviour before step 2 (the reason it was built).
--   2. drops the two fee guard triggers and nothing else.
--
-- AFTER IT (review F-2): with the step-2 functions deployed the fee is the
-- history: change it by inserting a class_fee_history row (the SQL editor;
-- classes.session_rate_vnd then prices NO bill - updating it alone changes
-- nothing, silently). Putting the old class screen back requires putting the
-- old calculators back in the same sitting.
--
-- THEN: redeploy the previous calculate-tuition / calculate-tuition-bulk (and
-- the functions that import _lib/projected-per-class.ts:
-- watch-sibling-threshold) ONLY if the resolver itself is at fault. The step 2
-- functions keep reading class_fee_history, which stays.
--
-- WHAT STAYS, on purpose (scripts/pgtest/d4-class-fee.test.mjs checks it):
--   * class_fee_history with its rows, RLS, staff-read policy, its no-truncate
--     and audit triggers: the record of which fee held from when. Never dropped.
--   * classes.class_fee_baseline (new classes still get their 1900 row, so a
--     re-paste of the migration finds every class covered).
--   * every function of the file. money_change_checked('class_fee', ...)
--     refuses to work without its triggers (HC050 guard_broken, nothing
--     written): closed.
-- Steps 1b and 1a are not touched; roll them back separately, after this one
-- (scripts/ROLLBACK-d4-2-register.sql, then scripts/ROLLBACK-d4-1-floors.sql).

BEGIN;
SET LOCAL lock_timeout = '5s';

UPDATE public.classes c
   SET session_rate_vnd = public.class_fee_on(c.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
 WHERE public.class_fee_on(c.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) IS NOT NULL
   AND c.session_rate_vnd IS DISTINCT FROM public.class_fee_on(c.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);

DROP TRIGGER IF EXISTS zz_class_fee_money_guard ON public.class_fee_history;
DROP TRIGGER IF EXISTS zz_class_fee_mirror_guard ON public.classes;
COMMIT;

SELECT
  (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal
      AND tgname IN ('zz_class_fee_money_guard', 'zz_class_fee_mirror_guard'))                       AS d4_class_fee_guards_left,
  (SELECT count(*) FROM public.classes c
    WHERE c.session_rate_vnd IS DISTINCT FROM
          COALESCE(public.class_fee_on(c.id, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), c.session_rate_vnd)) AS mirror_differs;
