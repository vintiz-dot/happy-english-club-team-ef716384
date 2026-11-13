-- The class recorder's retention schedule (C2 review M7, "the cron gap").
--
-- Without this nothing calls the recorder-retention function: no recording is
-- ever deleted when its delete_after passes, and rows left armed / recording /
-- uploading are never abandoned. Two jobs, the house pattern of
-- 20261110160000_schedule_runner_and_nightly_rebuild.sql:
--
--   recorder-retention    every night at 20:00 UTC (03:00 Hanoi): POST to the
--                         edge function, which deletes due audio. The gate is
--                         the runner token, READ FROM public.schedule_runner AT
--                         RUN TIME - it never sits in the job text. The
--                         apikey / Authorization below is this project's PUBLIC
--                         anon key (the function is deployed with
--                         verify_jwt = true, so the gateway needs a JWT it
--                         accepts; the function itself refuses it without the
--                         token). It is the same key 20261110160000 uses.
--   recorder-expire-stale every hour: recorder_expire_stale() in SQL, so a row
--                         left open (a laptop that never came back) is
--                         abandoned on time even if the function is not
--                         deployed or pg_net is missing. It abandons only rows
--                         whose lesson ended more than stale_upload_days (14)
--                         ago - a tab reopened late can still send its audio
--                         before that (ruling (b)).
--
-- Tolerant: where pg_cron (or pg_net, or the runner table) is absent - the
-- in-process test database, a branch without the extensions - each job is
-- skipped with a NOTICE that says what is missing; nothing fails. Whether the
-- edge function is deployed cannot be seen from SQL: an undeployed function
-- shows as a 404 in net._http_response after the first run.
-- Idempotent: each job is unscheduled by name first, then scheduled again.
-- No table, no grant: nothing here is readable by anyone new.

DO $do$
DECLARE
  v_cron boolean := to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL;
  v_net boolean := to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL;
  v_runner boolean := to_regclass('public.schedule_runner') IS NOT NULL;
  v_expire boolean := to_regprocedure('public.recorder_expire_stale(timestamptz)') IS NOT NULL;
BEGIN
  IF NOT v_cron THEN
    RAISE NOTICE 'recorder retention: pg_cron is not installed here - no job scheduled. Run recorder-retention by hand (an admin POST) until it is.';
    RETURN;
  END IF;

  -- 1. The nightly deletion run (needs pg_net and the runner token).
  BEGIN PERFORM cron.unschedule('recorder-retention'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_net AND v_runner THEN
    PERFORM cron.schedule(
      'recorder-retention',
      '0 20 * * *',
      $cmd$
      select
        net.http_post(
          url := 'https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/recorder-retention',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
            'x-schedule-runner-secret', (select token from public.schedule_runner where id = 1)
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 300000
        );
      $cmd$
    );
  ELSE
    RAISE NOTICE 'recorder retention: % missing - the nightly deletion run is NOT scheduled. Run recorder-retention by hand (an admin POST) until it is.',
      concat_ws(' and ', CASE WHEN NOT v_net THEN 'pg_net (net.http_post)' END, CASE WHEN NOT v_runner THEN 'public.schedule_runner' END);
  END IF;

  -- 2. The hourly sweep of rows left open (no network needed).
  BEGIN PERFORM cron.unschedule('recorder-expire-stale'); EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_expire THEN
    PERFORM cron.schedule('recorder-expire-stale', '17 * * * *', $cmd$ select public.recorder_expire_stale(); $cmd$);
  ELSE
    RAISE NOTICE 'recorder retention: public.recorder_expire_stale is missing (apply 20261112100000_class_recorder.sql first) - the stale sweep is NOT scheduled';
  END IF;
END
$do$;
