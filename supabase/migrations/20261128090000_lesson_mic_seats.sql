-- Mic map (28 Nov 2026): who sits at which Lark transmitter (mic 1-4) during a
-- lesson. One row = "this child is at mic N from `at`"; the latest row per child
-- at or before a moment wins. A child with no row is an UNKNOWN seat: the voice
-- engine then searches the whole class. The map is a HINT, never a restriction.
--
-- The class's teacher (is_teacher_of_class) and admins read and add rows; nobody
-- edits one; the teacher who made a row may delete it within 10 minutes (undo).
-- The VM (signed in as an admin job account) reads the map through
-- lesson_monitor_mic_map. Needs 20261124120000 (lesson_monitor__is_admin) and
-- 20261111110000 (is_teacher_of_class). Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regprocedure('public.lesson_monitor__is_admin()') IS NULL
     OR to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs lesson_monitor__is_admin (20261124120000) and is_teacher_of_class (20261111110000)';
  END IF;
END
$pre$;

CREATE TABLE IF NOT EXISTS public.lesson_mic_seats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  mic         smallint NOT NULL CHECK (mic BETWEEN 1 AND 4),
  at          timestamptz NOT NULL DEFAULT now(),
  set_by      uuid NOT NULL DEFAULT auth.uid(),
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_mic_seats_session_at ON public.lesson_mic_seats (session_id, at);

-- The server decides the class (from the lesson), the maker and the time; a
-- client cannot name another class or back-date a seat by more than the lesson.
CREATE OR REPLACE FUNCTION public.lesson_mic_seats_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_class uuid;
BEGIN
  SELECT class_id INTO v_class FROM public.sessions WHERE id = NEW.session_id;
  IF v_class IS NULL THEN RAISE EXCEPTION 'No such lesson'; END IF;
  NEW.class_id := v_class;
  IF auth.uid() IS NOT NULL THEN NEW.set_by := auth.uid(); END IF;
  NEW.at := now();
  NEW.created_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lesson_mic_seats_fill() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lesson_mic_seats_fill ON public.lesson_mic_seats;
CREATE TRIGGER lesson_mic_seats_fill BEFORE INSERT ON public.lesson_mic_seats
  FOR EACH ROW EXECUTE FUNCTION public.lesson_mic_seats_fill();

ALTER TABLE public.lesson_mic_seats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_mic_seats_read ON public.lesson_mic_seats;
CREATE POLICY lesson_mic_seats_read ON public.lesson_mic_seats FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_teacher_of_class(auth.uid(), class_id));
DROP POLICY IF EXISTS lesson_mic_seats_add ON public.lesson_mic_seats;
CREATE POLICY lesson_mic_seats_add ON public.lesson_mic_seats FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_teacher_of_class(auth.uid(),
         (SELECT s.class_id FROM public.sessions s WHERE s.id = session_id)));
DROP POLICY IF EXISTS lesson_mic_seats_undo ON public.lesson_mic_seats;
CREATE POLICY lesson_mic_seats_undo ON public.lesson_mic_seats FOR DELETE TO authenticated
  USING (set_by = auth.uid() AND created_at > now() - interval '10 minutes'
         AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_teacher_of_class(auth.uid(), class_id)));

GRANT SELECT, INSERT, DELETE ON public.lesson_mic_seats TO authenticated;
GRANT ALL ON public.lesson_mic_seats TO service_role;

-- The VM's read: [{student_id, mic, at}] in time order.
CREATE OR REPLACE FUNCTION public.lesson_monitor_mic_map(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Only an admin can read the mic map' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('student_id', m.student_id, 'mic', m.mic, 'at', m.at)
                          ORDER BY m.at, m.created_at)
                     FROM public.lesson_mic_seats m WHERE m.session_id = p_session), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.lesson_monitor_mic_map(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_mic_map(uuid) TO authenticated, service_role;

COMMIT;
