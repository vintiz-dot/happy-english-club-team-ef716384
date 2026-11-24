-- Free trial lessons (owner, 24 Nov 2026).
--
-- The school sometimes gives a child a lesson as a free trial. Until now the
-- app had no way to say so: every lesson a child was enrolled for was billed
-- (unless cancelled or Excused), so a month with trial lessons priced higher
-- than the family was asked for.
--
-- 1. public.free_trial_lessons: one row per child and lesson, ticked by an
--    admin on the child's tuition, with a reason. A lesson in it is not
--    billed for that child, whatever its mark. The rule is in
--    supabase/functions/_lib/tuition-pricing.ts (lesson state "trial");
--    calculate-tuition and calculate-tuition-bulk read the rows through
--    _lib/free-trial.ts.
-- 2. public.tuition_bill_expected (the hourly bill check's copy of the lesson
--    rule, last set by 20261123150000) leaves those lessons out too, so the
--    check and calculate-tuition keep agreeing. Same name, arguments and
--    columns: tuition_bill_gaps is not touched.
--
-- ORDER: the calculators deployed with this change work without the table
-- (no table = no free trials). Paste this before ticking the first lesson;
-- until then the tick on the screen answers that the table is missing.
-- Safe to paste twice.
--
-- Rollback: DROP TABLE public.free_trial_lessons; then paste the
-- tuition_bill_expected block of 20261123150000 again.

-- ------------------------------------------------------------- 1. the table
CREATE TABLE IF NOT EXISTS public.free_trial_lessons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (length(btrim(reason)) > 0 AND length(reason) <= 300),
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- A plain UNIQUE (not partial): one free trial per child and lesson.
  UNIQUE (student_id, session_id)
);
CREATE INDEX IF NOT EXISTS free_trial_lessons_session_idx ON public.free_trial_lessons (session_id);

ALTER TABLE public.free_trial_lessons ENABLE ROW LEVEL SECURITY;
-- Admins only. Families and children read their bill through calculate-tuition,
-- which says which lessons were free; nobody else reads or writes the table.
DROP POLICY IF EXISTS free_trial_lessons_admin_all ON public.free_trial_lessons;
CREATE POLICY free_trial_lessons_admin_all ON public.free_trial_lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- 20260712023825 revoked the defaults on public: without these PostgREST
-- reports the table as missing from the schema cache.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.free_trial_lessons TO authenticated;
GRANT ALL ON public.free_trial_lessons TO service_role;

-- Who gave or took back a free trial, in the audit log like every money table.
DO $do$
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_free_trial_lessons ON public.free_trial_lessons;
    CREATE TRIGGER audit_free_trial_lessons
      AFTER INSERT OR UPDATE OR DELETE ON public.free_trial_lessons
      FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
  END IF;
END
$do$;

-- ------------------------------------------- 2. the bill check's lesson rule
-- As 20261123150000, plus: a free trial lesson is not billed.
CREATE OR REPLACE FUNCTION public.tuition_bill_expected(p_month text)
RETURNS TABLE (student_id uuid, billable_lessons integer, expected_base bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH m AS (
    SELECT to_date(p_month || '-01', 'YYYY-MM-DD') AS d0,
           (to_date(p_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date AS d1
  ),
  -- Every child with an enrollment of the class that touches the month.
  pupil AS (
    SELECT DISTINCT en.student_id, en.class_id
      FROM m
      JOIN public.enrollments en
        ON en.start_date < m.d1 AND (en.end_date IS NULL OR en.end_date >= m.d0)
  ),
  lesson AS (
    SELECT p.student_id, s.date,
           coalesce((SELECT h.session_rate_vnd FROM public.class_fee_history h
                      WHERE h.class_id = s.class_id AND h.effective_from <= s.date
                      ORDER BY h.effective_from DESC LIMIT 1),
                    c.session_rate_vnd, 0)::bigint AS fee,
           e.rate_override_vnd, e.allowed_days,
           EXISTS (SELECT 1 FROM public.attendance a
                    WHERE a.session_id = s.id AND a.student_id = p.student_id
                      AND a.status::text = 'Excused') AS excused,
           EXISTS (SELECT 1 FROM public.free_trial_lessons f
                    WHERE f.session_id = s.id AND f.student_id = p.student_id) AS trial
      FROM m
      JOIN public.sessions s ON s.date >= m.d0 AND s.date < m.d1 AND s.status::text IN ('Scheduled', 'Held')
      JOIN public.classes c ON c.id = s.class_id
      JOIN pupil p ON p.class_id = s.class_id
      -- The enrollment the lesson is billed under: of this class, covering the
      -- date, created first (enrollment-discounts.ts inCreationOrder).
      CROSS JOIN LATERAL (
        SELECT en.rate_override_vnd, en.allowed_days
          FROM public.enrollments en
         WHERE en.student_id = p.student_id AND en.class_id = s.class_id
           AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date)
         ORDER BY en.created_at ASC NULLS LAST, en.created_at::text ASC, en.id::text ASC
         LIMIT 1
      ) e
  )
  SELECT l.student_id, count(*)::integer, sum(coalesce(l.rate_override_vnd, l.fee))::bigint
    FROM lesson l
   WHERE NOT l.excused
     AND NOT l.trial
     AND (l.allowed_days IS NULL OR extract(dow FROM l.date)::integer = ANY (l.allowed_days))
     AND coalesce(l.rate_override_vnd, l.fee) > 0
   GROUP BY l.student_id
$fn$;
REVOKE ALL ON FUNCTION public.tuition_bill_expected(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tuition_bill_expected(text) TO service_role;
