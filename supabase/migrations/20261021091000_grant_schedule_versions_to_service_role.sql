-- class_schedule_versions was granted to authenticated and nothing else.
--
-- 20261020090000 created the table with
--
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule_versions
--     TO authenticated;
--
-- and stopped there, because at the time the only reader was the admin
-- drawer and the only other path in was class_slots_on, which is SECURITY
-- DEFINER and therefore runs as its owner.
--
-- That is no longer true. schedule-sessions now reads the table directly to
-- resolve the timetable in force on each date it generates, and it runs on
-- the service role. Table privileges in this database are explicit, not
-- inherited: 20260712023825 revoked the defaults in the public schema and
-- re-granted every table one at a time, to authenticated AND service_role.
-- A table created afterwards gets whatever its own migration says and
-- nothing more.
--
-- WHY THIS IS WORTH ITS OWN FILE RATHER THAN A LINE IN A BIGGER ONE. The
-- generator treats a failed version query as fatal - it throws rather than
-- falling back to classes.schedule_template, because carrying on with the
-- current template would silently generate the wrong timetable for every
-- class with a pending change and report success. That is the right choice
-- and it means a missing grant does not degrade session generation, it
-- stops it. This has to land before schedule-sessions is redeployed, and it
-- has to be applicable on its own by someone who is not taking the pay-rate
-- work.
--
-- Supabase's project bootstrap may well have left a default privilege in
-- place that covers this already, in which case the GRANT is a no-op. That
-- is not a reason to leave it out. It is the same argument as
-- 20261020092000: an authorization that happens to work through an implicit
-- grant is one restore or one tightened default away from an outage whose
-- cause is two layers down in a log line.

DO $do$
BEGIN
  IF to_regclass('public.class_schedule_versions') IS NULL THEN
    RAISE NOTICE 'public.class_schedule_versions is not present; nothing to grant.';
    RETURN;
  END IF;
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule_versions TO authenticated';
  EXECUTE 'GRANT ALL ON public.class_schedule_versions TO service_role';
  RAISE NOTICE 'Granted public.class_schedule_versions to authenticated and service_role.';
END
$do$;
