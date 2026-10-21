-- Closing a month would have failed with 42P10. Same mistake as
-- 20261021094000, made one file later in the same sitting.
--
-- 20261021093000 protected one line per person per month with two PARTIAL
-- unique indexes:
--
--   CREATE UNIQUE INDEX ... ON payroll_lines (month, teacher_id)
--     WHERE teacher_id IS NOT NULL;
--
-- close-payroll-month writes them with
--
--   .upsert(subset, { onConflict: "month,teacher_id" })
--
-- and PostgreSQL will only match that conflict target to a partial index
-- if the statement repeats the index predicate, which PostgREST's upsert
-- has no way to express. The planner finds no matching index and the
-- statement fails before it looks for a conflicting row:
--
--   42P10: there is no unique or exclusion constraint matching the
--          ON CONFLICT specification
--
-- The predicate was never needed, for the reason written out at length in
-- 20261021094000: a UNIQUE index treats NULLs as distinct, so assistant
-- rows (teacher_id NULL) are exempt from (month, teacher_id) without one.
-- Dropping it changes nothing about what the index refuses and makes it
-- usable as a conflict target.
--
-- Found by the Lovable agent, which hit it from the other direction while
-- the lock was still unexercised here - the harness covering payroll_lines
-- had only ever used a plain INSERT, which a partial index serves
-- perfectly well. That gap is now closed in both places.

DROP INDEX IF EXISTS public.payroll_lines_month_teacher_key;
DROP INDEX IF EXISTS public.payroll_lines_month_assistant_key;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_lines_month_teacher_key
  ON public.payroll_lines (month, teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_lines_month_assistant_key
  ON public.payroll_lines (month, assistant_id);

COMMENT ON INDEX public.payroll_lines_month_teacher_key IS
  'One line per teacher per month. Not partial: assistant rows hold teacher_id NULL and a UNIQUE index treats NULLs as distinct, so they are exempt without a predicate - and an ordinary index can serve as an ON CONFLICT target, which a partial one cannot.';
COMMENT ON INDEX public.payroll_lines_month_assistant_key IS
  'One line per assistant per month. Not partial, for the same reason as payroll_lines_month_teacher_key.';
