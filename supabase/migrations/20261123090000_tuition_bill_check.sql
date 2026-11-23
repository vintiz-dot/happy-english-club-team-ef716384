-- Every child with lessons to pay for has a bill, and the bill matches the lessons.
--
-- WHY (23 Nov 2026). November had no bill at all for Peter, Anna, Phuc, Tuan Anh,
-- Đỗ Tường Minh and Bùi Ngọc Phương Ngân Anna, and a bill of 0 for Thien Kim (Lạc),
-- so those families were not charged and their prepaid credit was never used.
--
-- The cause: nothing in the app ever saved the month's bills on a schedule. A bill
-- (an `invoices` row) is written only by calculate-tuition, and calculate-tuition
-- ran only when somebody happened to touch that child (opened their tuition, paid,
-- marked them absent, changed their enrollment, recalculated a family discount).
-- The nightly timetable job (schedule-sessions) did call calculate-tuition-bulk
-- "to keep invoices in step with the timetable", and reported "ok" every night -
-- but calculate-tuition-bulk only READS: it has never saved a bill. A child nobody
-- touched in November had no November bill. Lạc's bill was saved on 5 Oct, three
-- seconds after her move to Stars 2, before November's register existed, so it
-- priced no lessons; nothing ever priced it again.
--
-- WHAT THIS ADDS
--   1. public.tuition_bill_gaps(month): every child whose saved bill for that month
--      is missing or does not match the lessons the register says they owe for.
--      The lesson rule is calculate-tuition's own (scripts/pgtest/
--      tuition-bill-check.test.mjs runs the real function beside it on the same
--      lessons and fails if they ever disagree):
--        a lesson of the month that is Scheduled or Held, with this child marked
--        Present, Absent or Late; under the enrollment of that class covering the
--        date (the one created first, as enrollmentOn); on one of its allowed days;
--        priced at the class fee in force on the date (class_fee_history, else
--        classes.session_rate_vnd); not counted when the child's rate (override,
--        else that fee) is 0. The bill's base_amount is the sum of those fees.
--      A frozen bill is never reported as different: it is meant to keep its figures.
--      Admins and the service role only.
--   2. public.tuition_bill_check_runs: one row per run of the refresh-month-bills
--      function - what it found, what it recalculated, what failed and what is
--      still wrong afterwards. Finance > Tuition shows the latest.
--   3. A job every hour (refresh-month-bills): it asks tuition_bill_gaps for the
--      current month (and, in the first five days, the month before) and runs
--      calculate-tuition for each child listed, so bills appear and follow the
--      register on their own. Earlier months are never repriced by the timer:
--      they are listed, and an admin decides.
--
-- Read-only on the data that exists: this file creates two functions, one table
-- and one scheduled job. It changes no bill.

DO $pre$
BEGIN
  IF to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Tuition bill check: public.has_role(uuid, app_role) is missing. Nothing was changed.';
  END IF;
  IF to_regclass('public.class_fee_history') IS NULL THEN
    RAISE EXCEPTION 'Tuition bill check: public.class_fee_history (20261114092000) is missing. Nothing was changed.';
  END IF;
END
$pre$;

-- ------------------------------------------------------------------ 1. the check
-- The month's lessons per child, priced, as calculate-tuition prices them.
CREATE OR REPLACE FUNCTION public.tuition_bill_expected(p_month text)
RETURNS TABLE (student_id uuid, billable_lessons integer, expected_base bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH m AS (
    SELECT to_date(p_month || '-01', 'YYYY-MM-DD') AS d0,
           (to_date(p_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date AS d1
  ),
  lesson AS (
    SELECT a.student_id, s.date,
           coalesce((SELECT h.session_rate_vnd FROM public.class_fee_history h
                      WHERE h.class_id = s.class_id AND h.effective_from <= s.date
                      ORDER BY h.effective_from DESC LIMIT 1),
                    c.session_rate_vnd, 0)::bigint AS fee,
           e.rate_override_vnd, e.allowed_days
      FROM m
      JOIN public.sessions s ON s.date >= m.d0 AND s.date < m.d1 AND s.status::text IN ('Scheduled', 'Held')
      JOIN public.classes c ON c.id = s.class_id
      JOIN public.attendance a ON a.session_id = s.id AND a.status::text IN ('Present', 'Absent', 'Late')
      -- The enrollment the lesson is billed under: of this class, covering the
      -- date, created first (enrollment-discounts.ts enrollmentOn / inCreationOrder).
      CROSS JOIN LATERAL (
        SELECT en.rate_override_vnd, en.allowed_days
          FROM public.enrollments en
         WHERE en.student_id = a.student_id AND en.class_id = s.class_id
           AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date)
         ORDER BY en.created_at ASC NULLS LAST, en.created_at::text ASC, en.id::text ASC
         LIMIT 1
      ) e
  )
  SELECT l.student_id, count(*)::integer, sum(l.fee)::bigint
    FROM lesson l
   WHERE (l.allowed_days IS NULL OR extract(dow FROM l.date)::integer = ANY (l.allowed_days))
     AND coalesce(l.rate_override_vnd, l.fee) > 0
   GROUP BY l.student_id
$fn$;
REVOKE ALL ON FUNCTION public.tuition_bill_expected(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tuition_bill_expected(text) TO service_role;

-- problem: 'missing' (no bill), 'zero' (a bill of 0 while lessons are owed),
-- 'differs' (the bill's lessons are not the register's).
CREATE OR REPLACE FUNCTION public.tuition_bill_gaps(p_month text)
RETURNS TABLE (
  student_id uuid, full_name text, is_active boolean, problem text,
  billable_lessons integer, expected_base bigint, saved_base bigint, saved_total bigint,
  confirmation_status text, invoice_updated_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an admin can check the month''s bills.' USING ERRCODE = '42501';
  END IF;
  IF p_month IS NULL OR p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Month must be YYYY-MM, not %', coalesce(p_month, 'empty') USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH x AS (SELECT * FROM public.tuition_bill_expected(p_month)),
  k AS (
    SELECT x.student_id FROM x
    UNION
    SELECT i.student_id FROM public.invoices i WHERE i.month = p_month
  )
  SELECT st.id, st.full_name::text, st.is_active,
         CASE WHEN i.id IS NULL THEN 'missing'
              WHEN coalesce(i.base_amount, 0) = 0 THEN 'zero'
              ELSE 'differs' END,
         coalesce(x.billable_lessons, 0), coalesce(x.expected_base, 0)::bigint,
         i.base_amount::bigint, i.total_amount::bigint, i.confirmation_status::text, i.updated_at
    FROM k
    JOIN public.students st ON st.id = k.student_id
    LEFT JOIN x ON x.student_id = k.student_id
    LEFT JOIN public.invoices i ON i.student_id = k.student_id AND i.month = p_month
   WHERE (i.id IS NULL AND coalesce(x.expected_base, 0) > 0)
      OR (i.id IS NOT NULL AND NOT coalesce(i.tuition_frozen, false)
          AND coalesce(i.base_amount, 0) <> coalesce(x.expected_base, 0))
   ORDER BY st.full_name, st.id;
END
$fn$;
REVOKE ALL ON FUNCTION public.tuition_bill_gaps(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tuition_bill_gaps(text) TO authenticated, service_role;

-- --------------------------------------------------------------- 2. the run log
CREATE TABLE IF NOT EXISTS public.tuition_bill_check_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at        timestamptz NOT NULL DEFAULT now(),
  month         text NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  started_by    text NOT NULL CHECK (started_by IN ('timer', 'admin')),
  actor_user_id uuid,
  found         integer NOT NULL DEFAULT 0,   -- children listed before the run
  recalculated  integer NOT NULL DEFAULT 0,   -- calculate-tuition saved their bill
  failed        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{student_id, name, error}]
  still_open    jsonb NOT NULL DEFAULT '[]'::jsonb   -- the check's rows after the run
);
CREATE INDEX IF NOT EXISTS tuition_bill_check_runs_month_idx ON public.tuition_bill_check_runs (month, ran_at DESC);
ALTER TABLE public.tuition_bill_check_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tuition_bill_check_runs_admin_read ON public.tuition_bill_check_runs;
CREATE POLICY tuition_bill_check_runs_admin_read ON public.tuition_bill_check_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Written only by refresh-month-bills (service role); admins read.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tuition_bill_check_runs TO authenticated;
GRANT ALL ON public.tuition_bill_check_runs TO service_role;

-- --------------------------------------------------------------- 3. the timer
-- Every hour at :20 (after stars-sync's :15 tick, away from the 02:00 rebuild).
-- The apikey is this project's PUBLIC anon key, as in 20261110160000; the gate is
-- the schedule_runner token, read at run time. Skipped where pg_cron or pg_net is
-- absent (the in-process test database).
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-month-bills') THEN
      PERFORM cron.unschedule('refresh-month-bills');
    END IF;
    PERFORM cron.schedule(
      'refresh-month-bills',
      '20 * * * *',
      $cmd$
      select net.http_post(
        url := 'https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/refresh-month-bills',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzd2dtYmVmaWtoc25ob2d0cnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzQwNTYsImV4cCI6MjA5MzMxMDA1Nn0.ELWucKWBlB-SSW5XfewHiNeHWpIkzHe2W_gQYlJc2Gw',
          'x-schedule-runner-secret', (select token from public.schedule_runner where id = 1)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 150000
      );
      $cmd$
    );
  END IF;
END
$do$;
