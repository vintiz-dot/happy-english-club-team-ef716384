DROP TRIGGER IF EXISTS excuse_attendance_outside_enrollment ON public.enrollments;

CREATE OR REPLACE FUNCTION public.guard_attendance_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class uuid; v_date date;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM 'Excused' THEN RETURN NEW; END IF;
  IF current_setting('hec.attendance_restore', true) = 'on' THEN RETURN NEW; END IF;
  SELECT class_id, date INTO v_class, v_date FROM public.sessions WHERE id = NEW.session_id;
  IF v_class IS NULL OR public.student_enrolled_on(NEW.student_id, v_class, v_date) THEN RETURN NEW; END IF;
  IF NEW.marked_by IS NULL THEN
    IF TG_OP = 'INSERT' THEN NEW.status := 'Excused'; RETURN NEW; END IF;
    -- never rewrite an existing record automatically
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    NEW.status := OLD.status; RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'This student is not enrolled for this lesson (class, dates or weekday). Attendance must be Excused.'
    USING ERRCODE = '23514';
END $$;
REVOKE ALL ON FUNCTION public.guard_attendance_enrollment() FROM PUBLIC, anon, authenticated;