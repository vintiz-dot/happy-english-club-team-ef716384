-- READ-ONLY. Did 20260904090000_student_deactivated_at.sql apply COMPLETELY?
--
-- The column existing is not proof the whole migration ran. The migration has
-- four parts, and the backfill is the one that matters most:
--
--   an inactive student whose deactivated_at is still NULL is filtered OUT of
--   every month, because `deactivated_at >= <month start>` is false for NULL.
--
-- That is exactly the original bug. If part 4 below returns anything above
-- zero, the finances are still hidden and the fix is not live.

-- 1) The column.
SELECT 'column' AS part,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='students'
                           AND column_name='deactivated_at')
            THEN 'present' ELSE 'MISSING' END AS state;

-- 2) The trigger + its function. Without these, future deactivations write
--    is_active=false with a NULL deactivated_at and silently vanish again.
SELECT 'trigger' AS part,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                         WHERE tgrelid='public.students'::regclass
                           AND tgname='sync_students_deactivated_at'
                           AND NOT tgisinternal)
            THEN 'present' ELSE 'MISSING' END AS state
UNION ALL
SELECT 'function',
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                         WHERE n.nspname='public' AND p.proname='sync_student_deactivated_at')
            THEN 'present' ELSE 'MISSING' END
UNION ALL
SELECT 'index',
       CASE WHEN to_regclass('public.idx_students_deactivated_at') IS NOT NULL
            THEN 'present' ELSE 'MISSING' END;

-- 3) THE CRITICAL CHECK. Must be 0. Anything higher means the backfill did
--    not run and those students' finances are still invisible.
SELECT COUNT(*) AS inactive_students_still_null
FROM public.students
WHERE is_active = false AND deactivated_at IS NULL;

-- 4) Sanity: the backfill should have stamped roughly 26 students, matching
--    the 26 rows the impact script reported.
SELECT
  COUNT(*) FILTER (WHERE is_active = false)                            AS inactive_total,
  COUNT(*) FILTER (WHERE is_active = false AND deactivated_at IS NOT NULL) AS backfilled,
  COUNT(*) FILTER (WHERE is_active = true  AND deactivated_at IS NOT NULL) AS active_but_stamped_should_be_0,
  MIN(deactivated_at)::date AS earliest,
  MAX(deactivated_at)::date AS latest
FROM public.students;
