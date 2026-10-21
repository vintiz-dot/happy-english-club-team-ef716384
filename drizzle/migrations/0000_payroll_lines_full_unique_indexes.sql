-- close-payroll-month upserts payroll_lines with ON CONFLICT (month, teacher_id)
-- and ON CONFLICT (month, assistant_id). The existing unique indexes on those
-- pairs are PARTIAL (WHERE <col> IS NOT NULL), and Postgres cannot use a partial
-- index as an ON CONFLICT arbiter, so the upsert fails with 42P10. Replace them
-- with full unique indexes. Nulls remain distinct in a btree unique index, so
-- teacher rows (assistant_id NULL) and assistant rows (teacher_id NULL) behave
-- exactly as before.
DROP INDEX IF EXISTS public.payroll_lines_month_teacher_key;
DROP INDEX IF EXISTS public.payroll_lines_month_assistant_key;

CREATE UNIQUE INDEX payroll_lines_month_teacher_key
  ON public.payroll_lines USING btree (month, teacher_id);

CREATE UNIQUE INDEX payroll_lines_month_assistant_key
  ON public.payroll_lines USING btree (month, assistant_id);