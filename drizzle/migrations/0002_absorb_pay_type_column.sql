-- Fold teachers.pay_type into pay_rate_type / per_session_rate_vnd.
--
-- WHY THIS MIGRATION EXISTS. The per-hour / per-session option was built
-- twice in parallel. A `teachers.pay_type` column was added to the live
-- database and read by calculate-payroll; 20261016091000 added
-- `pay_rate_type` + `per_session_rate_vnd` to both staff tables. Leaving
-- both gives the same question two answers in one row, which is worse than
-- either design on its own - the first screen to read the wrong one pays
-- somebody the wrong amount.
--
-- WHY THE TWO-COLUMN SHAPE WINS, rather than simply keeping pay_type:
--
--   1. pay_type leaves the session fee in `hourly_rate_vnd`. Four screens
--      print that column with the literal suffix "VND/hour" or "/hour"
--      (TeachersList, TeacherProfile, TeacherDashboard, TAProfileDrawer),
--      so a teacher on 250,000 a lesson reads as 250,000 an hour on their
--      own dashboard. A separate column cannot be mislabelled that way.
--
--   2. pay_type was only ever added to `teachers`. Teaching assistants are
--      paid out of the same payroll run and had no way to be put on a
--      per-session rate.
--
--   3. A column called hourly_rate_vnd holding a per-session amount is a
--      trap for every future query, including ones written by someone who
--      never reads this file.
--
-- ------------------------------------------------------------------------
-- THIS RUNS LATE, AND THAT CHANGES THE SAFE LOGIC
-- ------------------------------------------------------------------------
--
-- 20261016090000 and ...091000 were applied on 2026-10-17; this one was not
-- packaged with them, so it is landing days later against a database where
-- BOTH column sets have been live and the new edit screen has been in use.
--
-- The first draft of this migration also forced `pay_rate_type = 'hourly'`
-- wherever `pay_type` was not 'per_session'. That is now actively
-- dangerous. ...091000 defaulted every existing row to pay_rate_type
-- 'hourly', and the new drawer writes pay_rate_type/per_session_rate_vnd
-- WITHOUT touching pay_type. So an admin who has since put someone on a
-- per-session rate has a row reading pay_rate_type='per_session',
-- per_session_rate_vnd=250000, hourly_rate_vnd=0, pay_type='hourly' - and
-- that statement would have reset them to hourly on a rate of 0, paying
-- them nothing. It is gone.
--
-- What is left converts only rows where the intent is UNAMBIGUOUS:
--
--     pay_type = 'per_session'          -- the old column says per-session
-- AND pay_rate_type <> 'per_session'    -- and the new UI has not said otherwise
-- AND per_session_rate_vnd = 0          -- and no new rate has been entered
--
-- Every other row is left exactly as it is, because the new columns are
-- the ones every screen and calculate-payroll now read, and a row the new
-- UI has written is already correct.
--
-- ONE CASE THIS CANNOT RESOLVE, stated plainly rather than guessed at: a
-- teacher Lovable had on per_session whose fee an admin has since re-saved
-- through the new drawer (which would have shown them as hourly) is
-- indistinguishable from a genuinely hourly teacher. The NOTICE below
-- lists every row this migration converts so the result can be checked
-- against the Payroll tab afterwards.
--
-- Safe to run when pay_type never existed - a fresh database, or one where
-- only ...091000 has been applied: every statement is guarded.

DO $do$
DECLARE
  converted text;
  n integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'pay_type'
  ) THEN
    RAISE NOTICE 'public.teachers.pay_type is not present; nothing to absorb.';
    RETURN;
  END IF;

  -- GREATEST(..., 1) rather than a bare copy: a per-session teacher whose
  -- rate was left at 0 would fail teachers_per_session_rate_set_check and
  -- abort the whole migration. 1 VND is visibly wrong on the payroll
  -- screen, which is the point - it asks to be corrected, where a 0 would
  -- have gone on quietly paying nothing.
  WITH moved AS (
    UPDATE public.teachers
       SET pay_rate_type        = 'per_session',
           per_session_rate_vnd = GREATEST(hourly_rate_vnd, 1),
           hourly_rate_vnd      = 0
     WHERE pay_type = 'per_session'
       AND pay_rate_type <> 'per_session'
       AND per_session_rate_vnd = 0
    RETURNING full_name, per_session_rate_vnd
  )
  SELECT count(*), string_agg(full_name || ' (' || per_session_rate_vnd || ' VND/session)', ', ')
    INTO n, converted
    FROM moved;

  IF COALESCE(n, 0) > 0 THEN
    RAISE NOTICE 'Moved % teacher(s) onto a per-session rate: %. Check these against the Payroll tab.', n, converted;
  ELSE
    RAISE NOTICE 'No teacher rows needed converting; the new columns were already authoritative.';
  END IF;

  ALTER TABLE public.teachers DROP COLUMN pay_type;
  RAISE NOTICE 'Dropped public.teachers.pay_type.';
END
$do$;
