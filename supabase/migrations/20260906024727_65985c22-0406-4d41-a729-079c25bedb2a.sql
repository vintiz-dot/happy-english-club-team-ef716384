CREATE OR REPLACE FUNCTION public._attendance_seed_for_class_dates(p_class uuid, p_from date, p_to date)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.attendance(session_id, student_id, status, marked_by)
  SELECT s.id,
         e.student_id,
         CASE
           WHEN e.allowed_days IS NOT NULL
                AND array_length(e.allowed_days, 1) > 0
                AND NOT (EXTRACT(DOW FROM s.date)::int = ANY (e.allowed_days))
             THEN 'Excused'
           ELSE 'Present'
         END,
         NULL
  FROM public.sessions s
  JOIN public.enrollments e ON e.class_id = s.class_id
  WHERE s.class_id = p_class
    AND s.date BETWEEN p_from AND p_to
    AND e.start_date <= s.date
    AND (e.end_date IS NULL OR s.date <= e.end_date)
  ON CONFLICT (session_id, student_id) DO NOTHING;
$function$;

UPDATE public.attendance a
SET status = 'Excused'
FROM public.sessions s, public.enrollments e
WHERE a.session_id = s.id
  AND e.class_id = s.class_id
  AND e.student_id = a.student_id
  AND a.marked_by IS NULL
  AND a.status = 'Present'
  AND e.start_date <= s.date
  AND (e.end_date IS NULL OR s.date <= e.end_date)
  AND e.allowed_days IS NOT NULL
  AND array_length(e.allowed_days, 1) > 0
  AND NOT (EXTRACT(DOW FROM s.date)::int = ANY (e.allowed_days));