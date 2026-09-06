-- READ-ONLY companion to 20260906024727 ("Marked unenrolled days excused").
-- Nothing here writes.
--
-- Run it BEFORE the migration to preview the impact, or AFTER to confirm it
-- landed: once applied, query 1 returns no rows, because every row it would
-- have flipped is already 'Excused'.
--
-- Tuition does not move: calculate-tuition-bulk already skips sessions outside
-- allowed_days before reading attendance. What moves is the Excused Loss card,
-- because useFinanceOverview sums every 'Excused' row's session rate with no
-- allowed_days filter.

-- 1) How many rows flip, and what they add to excused loss, per month.
SELECT
  to_char(s.date, 'YYYY-MM')                                   AS month,
  COUNT(*)                                                     AS rows_flipping,
  COUNT(DISTINCT a.student_id)                                 AS students,
  SUM(COALESCE(e.rate_override_vnd, c.session_rate_vnd))       AS added_to_excused_loss
FROM public.attendance a
JOIN public.sessions s     ON s.id = a.session_id
JOIN public.classes c      ON c.id = s.class_id
JOIN public.enrollments e  ON e.class_id = s.class_id AND e.student_id = a.student_id
WHERE a.marked_by IS NULL
  AND a.status = 'Present'
  AND e.start_date <= s.date
  AND (e.end_date IS NULL OR s.date <= e.end_date)
  AND e.allowed_days IS NOT NULL
  AND array_length(e.allowed_days, 1) > 0
  AND NOT (EXTRACT(DOW FROM s.date)::int = ANY (e.allowed_days))
GROUP BY 1
ORDER BY 1 DESC;

-- 2) Safety check: confirm nothing a human marked is being overwritten.
--    Both counts describe the same out-of-allowed-days sessions; only the
--    first is touched. A large second number is worth a look before running,
--    since it means teachers have been marking students Present on days the
--    enrollment says they do not attend - which is either a wrong
--    allowed_days value or genuine attendance the restriction contradicts.
SELECT
  COUNT(*) FILTER (WHERE a.marked_by IS NULL)     AS auto_seeded_will_change,
  COUNT(*) FILTER (WHERE a.marked_by IS NOT NULL) AS human_marked_left_alone
FROM public.attendance a
JOIN public.sessions s     ON s.id = a.session_id
JOIN public.enrollments e  ON e.class_id = s.class_id AND e.student_id = a.student_id
WHERE a.status = 'Present'
  AND e.start_date <= s.date
  AND (e.end_date IS NULL OR s.date <= e.end_date)
  AND e.allowed_days IS NOT NULL
  AND array_length(e.allowed_days, 1) > 0
  AND NOT (EXTRACT(DOW FROM s.date)::int = ANY (e.allowed_days));
