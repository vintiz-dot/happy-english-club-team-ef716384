CREATE OR REPLACE FUNCTION public.guard_cancelled_session_attendance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.session_status;
BEGIN
 SELECT status INTO v_status FROM public.sessions WHERE id=NEW.session_id FOR UPDATE;
 IF v_status='Canceled' AND NEW.status IS DISTINCT FROM 'Excused' THEN
  RAISE EXCEPTION 'Cancelled lessons cannot be marked Present, Absent or Late. Attendance must be Excused.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_cancelled_session_attendance() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER guard_cancelled_session_attendance BEFORE INSERT OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.guard_cancelled_session_attendance();
CREATE OR REPLACE FUNCTION public.set_attendance_excused_on_cancel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.status='Canceled' THEN
  UPDATE public.attendance SET status='Excused' WHERE session_id=NEW.id AND status IS DISTINCT FROM 'Excused';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.set_attendance_excused_on_cancel() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER trg_cancel_session_excused AFTER UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_attendance_excused_on_cancel();
CREATE OR REPLACE FUNCTION public._attendance_seed_for_class_dates(p_class uuid,p_from date,p_to date)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 INSERT INTO public.attendance(session_id,student_id,status,marked_by)
 SELECT s.id,e.student_id,CASE WHEN s.status='Canceled' THEN 'Excused'
 WHEN e.allowed_days IS NOT NULL AND array_length(e.allowed_days,1)>0 AND NOT(EXTRACT(DOW FROM s.date)::int=ANY(e.allowed_days)) THEN 'Excused' ELSE 'Present' END,NULL
 FROM public.sessions s JOIN public.enrollments e ON e.class_id=s.class_id
 WHERE s.class_id=p_class AND s.date BETWEEN p_from AND p_to AND e.start_date<=s.date AND(e.end_date IS NULL OR s.date<=e.end_date)
 ON CONFLICT(session_id,student_id) DO NOTHING;
$$;