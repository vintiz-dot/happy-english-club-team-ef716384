-- Month-aware student status for finance queries.
--
-- Problem: every finance query filtered students with `is_active = true`,
-- which asks "is this student here today?" — the wrong question when the
-- UI is rendering July. Deactivating a student therefore erased their
-- revenue, payments and outstanding debt from every month that had not
-- already been snapshotted, retroactively shrinking historical totals.
--
-- Fix: `is_active` stays the current-state flag (rosters, dropdowns,
-- leaderboards all still want it). `deactivated_at` adds the timeline
-- fact, so finance queries can ask the right question:
--
--     is_active = true OR deactivated_at >= <first day of the month>
--
-- A student deactivated 2026-07-15 passes for July and every earlier
-- month, and fails from August on. History is preserved; future months
-- stop billing them. See src/lib/finance/studentsInMonth.ts.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.students.deactivated_at IS
  'When the student was deactivated; NULL while active. Finance queries use this to decide whether a student counts toward a given month. Maintained automatically by sync_student_deactivated_at().';

-- Backfill students who were already inactive before this column existed.
--
-- Direction matters. Guessing too EARLY truncates real history — the exact
-- bug being fixed here. Guessing too LATE only includes a student in a few
-- recent months where they had no sessions, so tuition computes to ~0 and
-- any genuine unpaid balance surfaces instead of staying hidden. We
-- therefore err late: take the later of `updated_at` (the deactivation was
-- almost always the last write to the row) and the end of the last month
-- they were actually invoiced for, so no billed month is ever cut off.
-- `update_students_updated_at` would stamp every row we touch with now(),
-- destroying the very signal this backfill reads and shoving all inactive
-- students to the top of the "recently updated" sort in the students list.
-- Suspend it for the two statements below; a failure rolls the whole
-- migration back, trigger state included.
-- Guarded: if the live database names this trigger differently, or lacks it,
-- updated_at is not auto-stamped anyway and there is nothing to suspend.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.students'::regclass
      AND tgname = 'update_students_updated_at'
      AND NOT tgisinternal
  ) THEN
    ALTER TABLE public.students DISABLE TRIGGER update_students_updated_at;
  END IF;
END
$guard$;

UPDATE public.students s
SET deactivated_at = GREATEST(
  s.updated_at,
  COALESCE(last_billed.month_end, s.updated_at)
)
FROM (
  SELECT
    i.student_id,
    ((MAX(i.month) || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::timestamptz AS month_end
  FROM public.invoices i
  GROUP BY i.student_id
) AS last_billed
WHERE s.id = last_billed.student_id
  AND s.is_active = false
  AND s.deactivated_at IS NULL;

-- Inactive students who were never invoiced at all.
UPDATE public.students
SET deactivated_at = updated_at
WHERE is_active = false
  AND deactivated_at IS NULL;

DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.students'::regclass
      AND tgname = 'update_students_updated_at'
      AND NOT tgisinternal
  ) THEN
    ALTER TABLE public.students ENABLE TRIGGER update_students_updated_at;
  END IF;
END
$guard$;

-- Keep the flag and the timestamp in lockstep, so no call site has to
-- remember to write both. This covers the admin students list, the student
-- edit drawer, and the bulk data-import path — including any future one.
CREATE OR REPLACE FUNCTION public.sync_student_deactivated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NEW.is_active = false THEN
      -- NULL means the caller did not supply an explicit date. A caller
      -- that does (backdating a departure) is left alone.
      IF NEW.deactivated_at IS NULL THEN
        NEW.deactivated_at := now();
      END IF;
    ELSE
      -- Reactivated: the student is current again, so no cut-off applies.
      NEW.deactivated_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_students_deactivated_at ON public.students;
CREATE TRIGGER sync_students_deactivated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_deactivated_at();

CREATE INDEX IF NOT EXISTS idx_students_deactivated_at
  ON public.students (deactivated_at)
  WHERE deactivated_at IS NOT NULL;
