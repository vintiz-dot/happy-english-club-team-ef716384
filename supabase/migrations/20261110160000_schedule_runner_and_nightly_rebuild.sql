-- The nightly rebuild of upcoming sessions.
--
-- The `schedule_runner` table and the `rebuild-upcoming-sessions` job were made by
-- hand in the old Lovable-managed database, so they never reached this migration
-- tree and did not come across when the project moved to its own Supabase account
-- (10 Nov 2026). The schedule-sessions function reads its shared token from this
-- table (see runnerSecretMatches in supabase/functions/schedule-sessions).
--
-- The table holds a secret, so row-level security is on with NO policies and only
-- service_role is granted: no signed-in account can read it. (This is deliberately
-- NOT given to `authenticated`, unlike an ordinary new table.)

CREATE TABLE IF NOT EXISTS public.schedule_runner (
  id         integer PRIMARY KEY CHECK (id = 1),
  token      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_runner ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schedule_runner FROM anon, authenticated;
GRANT ALL ON public.schedule_runner TO service_role;

INSERT INTO public.schedule_runner (id, token)
VALUES (1, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (id) DO NOTHING;

-- Every night at 02:00 (database time, UTC): rebuild this month's and next month's
-- future sessions. The apikey/Authorization below is this project's PUBLIC anon key
-- (the function is deployed with verify_jwt = true); the real gate is the runner
-- token, which is read from the table at run time so it never sits in the schedule.
-- Skipped silently where pg_cron or pg_net is absent (e.g. the in-process test DB).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL THEN
    PERFORM cron.schedule(
      'rebuild-upcoming-sessions',
      '0 2 * * *',
      $cmd$
      select
        net.http_post(
          url := 'https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/schedule-sessions',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
            'x-schedule-runner-secret', (select token from public.schedule_runner where id = 1)
          ),
          body := jsonb_build_object('month', to_char(now(), 'YYYY-MM'), 'mode', 'future-only'),
          timeout_milliseconds := 300000
        ),
        net.http_post(
          url := 'https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/schedule-sessions',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
            'x-schedule-runner-secret', (select token from public.schedule_runner where id = 1)
          ),
          body := jsonb_build_object('month', to_char(now() + interval '1 month', 'YYYY-MM'), 'mode', 'future-only'),
          timeout_milliseconds := 300000
        );
      $cmd$
    );
  END IF;
END
$do$;
