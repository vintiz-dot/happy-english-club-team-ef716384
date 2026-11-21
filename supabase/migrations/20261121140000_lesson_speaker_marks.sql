-- Who's speaking (21 Nov 2026): a TA or the teacher taps who is talking during a
-- recorded lesson. Each tap is one row: which children (or the teacher, or the
-- whole class in chorus, or nobody) started speaking at that moment. Later the
-- lesson monitor / lesson report lines these marks up with transcript lines.
--
-- Staff of that lesson only (lesson_report_staff_can: admin, a teacher of the
-- class, a TA on the session). No family or student policy: children's names
-- appear only on staff screens, and nothing here reaches a family.
--
-- The server decides everything but the tap itself (a BEFORE INSERT trigger):
-- who made it, when (server clock), the class, the recording of that session
-- that is under way, and the offset into that recording's audio timeline
-- (started_at - pre_start_ms, the first captured sample). A TA cannot read
-- class_recordings, so the trigger looks the recording up for them.
-- Every child named must be enrolled in the lesson's class on the lesson's date.
--
-- Needs 20261112100000_class_recorder.sql and 20261121130000_lesson_reports.sql.
-- Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regprocedure('public.lesson_report_staff_can(uuid)') IS NULL
     OR to_regclass('public.class_recordings') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs lesson_report_staff_can (20261121130000) and class_recordings (20261112100000)';
  END IF;
END
$pre$;

CREATE TABLE IF NOT EXISTS public.lesson_speaker_marks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id     uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  recording_id uuid REFERENCES public.class_recordings(id) ON DELETE SET NULL,
  kind         text NOT NULL CHECK (kind IN ('student', 'teacher', 'chorus', 'stop')),
  -- Who is speaking from this moment on (all of them, when several speak at once).
  -- Empty for teacher / chorus / stop.
  student_ids  uuid[] NOT NULL DEFAULT '{}',
  at           timestamptz NOT NULL DEFAULT now(),
  -- Milliseconds into the recording's audio (started_at - pre_start_ms). NULL when
  -- no recording of this lesson had started.
  offset_ms    bigint,
  -- The phone's own clock at the tap, kept as a claim (the server's `at` is the truth).
  client_at    timestamptz,
  made_by      uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_speaker_marks_students CHECK (
    (kind = 'student') = (cardinality(student_ids) > 0))
);
CREATE INDEX IF NOT EXISTS lesson_speaker_marks_session_at ON public.lesson_speaker_marks (session_id, at);

CREATE OR REPLACE FUNCTION public.lesson_speaker_marks_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s   record;
  r   record;
  bad int;
BEGIN
  SELECT id, class_id, date INTO s FROM public.sessions WHERE id = NEW.session_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'No such lesson'; END IF;
  IF auth.uid() IS NOT NULL THEN NEW.made_by := auth.uid(); END IF;
  IF NEW.made_by IS NULL THEN RAISE EXCEPTION 'A mark needs the person who made it'; END IF;
  NEW.class_id := s.class_id;
  NEW.at := now();
  NEW.created_at := now();
  NEW.student_ids := COALESCE(ARRAY(SELECT DISTINCT x FROM unnest(NEW.student_ids) x WHERE x IS NOT NULL), '{}');
  SELECT count(*) INTO bad FROM unnest(NEW.student_ids) x
  WHERE NOT EXISTS (SELECT 1 FROM public.enrollments en
                    WHERE en.class_id = s.class_id AND en.student_id = x
                      AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date));
  IF bad > 0 THEN
    RAISE EXCEPTION 'Only children enrolled in this class on the lesson''s date can be marked';
  END IF;
  -- The recording of this lesson that is under way (else the latest that started).
  SELECT id, started_at, pre_start_ms INTO r FROM public.class_recordings
  WHERE COALESCE(session_id, armed_session_id) = s.id AND started_at IS NOT NULL
  ORDER BY (status = 'recording') DESC, started_at DESC LIMIT 1;
  NEW.recording_id := r.id;
  NEW.offset_ms := CASE WHEN r.id IS NULL THEN NULL
    ELSE GREATEST(0, (extract(epoch FROM (NEW.at - r.started_at)) * 1000)::bigint + r.pre_start_ms) END;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS lesson_speaker_marks_fill ON public.lesson_speaker_marks;
CREATE TRIGGER lesson_speaker_marks_fill BEFORE INSERT ON public.lesson_speaker_marks
  FOR EACH ROW EXECUTE FUNCTION public.lesson_speaker_marks_fill();

-- A mark is a fact about a moment: it can be undone (deleted), never rewritten.
CREATE OR REPLACE FUNCTION public.lesson_speaker_marks_no_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'A speaker mark cannot be changed; undo it instead';
END
$$;
DROP TRIGGER IF EXISTS lesson_speaker_marks_no_edit ON public.lesson_speaker_marks;
CREATE TRIGGER lesson_speaker_marks_no_edit BEFORE UPDATE ON public.lesson_speaker_marks
  FOR EACH ROW EXECUTE FUNCTION public.lesson_speaker_marks_no_edit();

ALTER TABLE public.lesson_speaker_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_speaker_marks_staff_read ON public.lesson_speaker_marks;
CREATE POLICY lesson_speaker_marks_staff_read ON public.lesson_speaker_marks FOR SELECT TO authenticated
  USING (public.lesson_report_staff_can(session_id));
DROP POLICY IF EXISTS lesson_speaker_marks_staff_add ON public.lesson_speaker_marks;
CREATE POLICY lesson_speaker_marks_staff_add ON public.lesson_speaker_marks FOR INSERT TO authenticated
  WITH CHECK (public.lesson_report_staff_can(session_id));
DROP POLICY IF EXISTS lesson_speaker_marks_staff_undo ON public.lesson_speaker_marks;
CREATE POLICY lesson_speaker_marks_staff_undo ON public.lesson_speaker_marks FOR DELETE TO authenticated
  USING (public.lesson_report_staff_can(session_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_speaker_marks TO authenticated;
GRANT ALL ON public.lesson_speaker_marks TO service_role;

-- The tiles: children enrolled in the lesson's class on its date, for that lesson's staff.
CREATE OR REPLACE FUNCTION public.lesson_speaker_roster(p_session uuid)
RETURNS TABLE (student_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.lesson_report_staff_can(p_session) THEN
    RAISE EXCEPTION 'Only the staff of this lesson can see who is in it';
  END IF;
  RETURN QUERY
  SELECT DISTINCT st.id, st.full_name, st.avatar_url
  FROM public.sessions s
  JOIN public.enrollments en ON en.class_id = s.class_id
    AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date)
  JOIN public.students st ON st.id = en.student_id
  WHERE s.id = p_session
  ORDER BY st.full_name;
END
$$;
REVOKE ALL ON FUNCTION public.lesson_speaker_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_speaker_roster(uuid) TO authenticated, service_role;

-- Is a recording of this lesson under way? (A TA cannot read class_recordings.)
CREATE OR REPLACE FUNCTION public.lesson_speaker_recording(p_session uuid)
RETURNS TABLE (recording_id uuid, status text, started_at timestamptz, pre_start_ms bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.lesson_report_staff_can(p_session) THEN
    RAISE EXCEPTION 'Only the staff of this lesson can see its recording';
  END IF;
  RETURN QUERY
  SELECT r.id, r.status, r.started_at, r.pre_start_ms FROM public.class_recordings r
  WHERE COALESCE(r.session_id, r.armed_session_id) = p_session AND r.status <> 'deleted'
  ORDER BY (r.status = 'recording') DESC, r.armed_at DESC LIMIT 1;
END
$$;
REVOKE ALL ON FUNCTION public.lesson_speaker_recording(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_speaker_recording(uuid) TO authenticated, service_role;

COMMIT;
