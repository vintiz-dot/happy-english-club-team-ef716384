-- Fold teachers.pay_type into pay_rate_type / per_session_rate_vnd.
--
-- WHY THIS MIGRATION EXISTS. The per-hour / per-session option was built
-- twice in parallel. A `teachers.pay_type` column was added to the live
-- database and read by calculate-payroll; 20261016091000 added
-- `pay_rate_type` + `per_session_rate_vnd` to both staff tables. Leaving
-- both would give the same question two answers in one row, which is worse
-- than either design on its own - the first screen to read the wrong one
-- pays somebody the wrong amount.
--
-- WHY THE TWO-COLUMN SHAPE WINS, rather than simply keeping pay_type:
--
--   1. pay_type leaves the session fee in `hourly_rate_vnd`. Four screens
--      print that column with the literal suffix "VND/hour" or "/hour"
--      (TeachersList, TeacherProfile, TeacherDashboard, TAProfileDrawer),
--      so a teacher on 250,000 a lesson reads as 250,000 an hour on their
--      own dashboard. A separate column cannot be mislabelled that way,
--      because the name says what it is.
--
--   2. pay_type was only ever added to `teachers`. Teaching assistants are
--      paid out of the same payroll run and had no way to be put on a
--      per-session rate.
--
--   3. A column called hourly_rate_vnd holding a per-session amount is a
--      trap for every future query, including ones written by someone who
--      never reads this file.
--
-- WHAT THIS DOES TO EXISTING DATA. Any teacher already switched to
-- per_session has their fee moved out of hourly_rate_vnd into
-- per_session_rate_vnd, and hourly_rate_vnd zeroed - the same shape the
-- edit screen now writes. Teachers on hourly are untouched. The pay each
-- teacher actually receives does not change: calculate-payroll read
-- hourly_rate_vnd as the session fee when pay_type was per_session, and now
-- reads per_session_rate_vnd for the same rows.
--
-- Safe to run when pay_type never existed (a fresh database, or one where
-- only 20261016091000 has been applied): every statement is guarded.

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'pay_type'
  ) THEN
    RAISE NOTICE 'public.teachers.pay_type is not present; nothing to absorb.';
    RETURN;
  END IF;

  -- Carry the basis across. Anything that is not exactly 'per_session'
  -- means hourly, matching how both implementations read it.
  UPDATE public.teachers
     SET pay_rate_type        = 'per_session',
         per_session_rate_vnd = GREATEST(hourly_rate_vnd, 1),
         hourly_rate_vnd      = 0
   WHERE pay_type = 'per_session'
     AND pay_rate_type <> 'per_session';

  -- GREATEST(..., 1) above rather than a bare copy: a per-session teacher
  -- whose rate was left at 0 would fail teachers_per_session_rate_set_check
  -- and abort the whole migration. 1 VND is visibly wrong on the payroll
  -- screen, which is the point - it asks to be corrected, where a 0 would
  -- have gone on quietly paying nothing.

  UPDATE public.teachers
     SET pay_rate_type = 'hourly'
   WHERE pay_type IS DISTINCT FROM 'per_session'
     AND pay_rate_type <> 'hourly';

  ALTER TABLE public.teachers DROP COLUMN pay_type;
  RAISE NOTICE 'Absorbed public.teachers.pay_type into pay_rate_type / per_session_rate_vnd.';
END
$do$;
