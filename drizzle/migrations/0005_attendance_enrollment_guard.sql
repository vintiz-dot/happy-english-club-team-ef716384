CREATE OR REPLACE FUNCTION public.student_enrolled_on(p_student uuid, p_class uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = p_student AND e.class_id = p_class
      AND e.start_date <= p_date
      AND (e.end_date IS NULL OR e.end_date >= p_date)
      AND (e.allowed_days IS NULL OR cardinality(e.allowed_days) = 0
           OR EXTRACT(DOW FROM p_date)::int = ANY (e.allowed_days)))
$$;
REVOKE ALL ON FUNCTION public.student_enrolled_on(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_enrolled_on(uuid, uuid, date) TO authenticated, service_role;

UPDATE public.attendance a SET status = 'Excused', updated_at = now()
FROM public.sessions s
WHERE a.session_id = s.id AND a.status IS DISTINCT FROM 'Excused'
  AND NOT public.student_enrolled_on(a.student_id, s.class_id, s.date);

CREATE OR REPLACE FUNCTION public.guard_attendance_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class uuid; v_date date;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM 'Excused' THEN RETURN NEW; END IF;
  SELECT class_id, date INTO v_class, v_date FROM public.sessions WHERE id = NEW.session_id;
  IF v_class IS NULL OR public.student_enrolled_on(NEW.student_id, v_class, v_date) THEN RETURN NEW; END IF;
  IF NEW.marked_by IS NULL THEN NEW.status := 'Excused'; RETURN NEW; END IF;
  RAISE EXCEPTION 'This student is not enrolled for this lesson (class, dates or weekday). Attendance must be Excused.'
    USING ERRCODE = '23514';
END $$;
REVOKE ALL ON FUNCTION public.guard_attendance_enrollment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_attendance_enrollment ON public.attendance;
CREATE TRIGGER guard_attendance_enrollment BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.guard_attendance_enrollment();

CREATE OR REPLACE FUNCTION public.excuse_attendance_outside_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  UPDATE public.attendance a SET status = 'Excused', updated_at = now()
  FROM public.sessions s
  WHERE a.session_id = s.id AND s.class_id = r.class_id AND a.student_id = r.student_id
    AND a.status IS DISTINCT FROM 'Excused'
    AND NOT public.student_enrolled_on(r.student_id, r.class_id, s.date);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.excuse_attendance_outside_enrollment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS excuse_attendance_outside_enrollment ON public.enrollments;
CREATE TRIGGER excuse_attendance_outside_enrollment
AFTER UPDATE OF start_date, end_date, allowed_days OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.excuse_attendance_outside_enrollment();