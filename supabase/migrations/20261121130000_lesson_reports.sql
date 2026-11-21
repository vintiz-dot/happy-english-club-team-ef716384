-- Lesson reports: what happened in a lesson, drafted by AI from everything the
-- lesson left behind, checked and approved by its teacher, then shown to each
-- family (their own child's part plus the class part) with a review quiz set as
-- homework.
--
-- OWNER'S RULINGS (21 Nov 2026)
--   - The lesson monitor transcript (in-class pseudo-names included) may go to
--     Claude to write the draft, together with the lesson's photos (screen,
--     whiteboard, worksheets, materials) a teacher or TA took, the student work
--     uploaded from the lesson's start to 30 minutes after its end, attendance,
--     points given in the lesson and the homework.
--   - A child's part comes from the app's records plus the teacher's line; the
--     AI MAY suggest moments where the teacher names a child, shown to staff
--     only, each accepted or deleted by the teacher.
--   - The AI proposes 2-4 objectives; the teacher confirms them.
--   - Approval sets an auto-marked review quiz as homework.
--
-- WHO SEES WHAT
--   lesson_report_photos   staff of the session (admin, a teacher of the class,
--                          a TA on the session) read, add, remove. No family or
--                          student policy: a family gets a photo only once the
--                          teacher put it in an approved report, through a
--                          function that asks the database as the caller
--                          (stage B), never through a storage policy.
--   lesson_report_drafts   staff of the session only. The AI's whole draft,
--                          misconceptions, name suggestions and quiz answers.
--   lesson_reports,
--   lesson_report_students staff of the session only. Families read their own
--                          child's report through a SECURITY DEFINER function
--                          (stage B) that returns class_part plus THAT child's
--                          part; never staff_part, never another child's part.
--   lesson_review_quizzes  holds the answers: staff only. Children get the
--                          questions without answers through a function (stage C).
--
-- Approval is a teacher of the class or an admin, never a TA and never the AI:
-- approve_lesson_report is the only writer of lesson_reports.

DO $pre$
BEGIN
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL
     OR to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL
     OR to_regprocedure('public.award_homework_points(uuid, uuid, integer, text)') IS NULL
     OR to_regclass('public.lesson_monitor_reports') IS NULL
     OR to_regclass('public.session_participants') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs has_role, is_teacher_of_class, can_view_student, award_homework_points, the lesson monitor pilot and session_participants';
  END IF;
END
$pre$;

-- ------------------------------------------------------------------ who is staff of a lesson

CREATE OR REPLACE FUNCTION public.lesson_report_staff_can(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sessions s
               WHERE s.id = p_session AND public.is_teacher_of_class(auth.uid(), s.class_id))
    OR EXISTS (SELECT 1 FROM public.session_participants sp
               JOIN public.teaching_assistants ta ON ta.id = sp.teaching_assistant_id
               WHERE sp.session_id = p_session AND ta.user_id = auth.uid()))
$$;

-- Teacher or admin: may build a draft (it reads the transcript) and approve.
-- is_teacher_of_class also answers yes for a class's teaching assistants, so this
-- names the teachers themselves: the lesson's own teacher or the class's default teacher.
CREATE OR REPLACE FUNCTION public.lesson_report_teacher_can(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.sessions s
               JOIN public.teachers t ON t.id = s.teacher_id
               WHERE s.id = p_session AND t.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.sessions s
               JOIN public.classes c ON c.id = s.class_id
               JOIN public.teachers t ON t.id = c.default_teacher_id
               WHERE s.id = p_session AND t.user_id = auth.uid()))
$$;

-- ------------------------------------------------------------------ photos the staff took

CREATE TABLE IF NOT EXISTS public.lesson_report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('screen', 'whiteboard', 'worksheet', 'material', 'class', 'other')),
  caption text CHECK (caption IS NULL OR length(caption) <= 300),
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_report_photos_path CHECK (
    storage_path LIKE class_id::text || '/' || session_id::text || '/%' AND storage_path NOT LIKE '%..%')
);
CREATE INDEX IF NOT EXISTS lesson_report_photos_session ON public.lesson_report_photos(session_id);

CREATE OR REPLACE FUNCTION public.lesson_report_photos__class()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT s.class_id INTO NEW.class_id FROM public.sessions s WHERE s.id = NEW.session_id;
  IF NEW.class_id IS NULL THEN RAISE EXCEPTION 'No such lesson'; END IF;
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN NEW.uploaded_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lesson_report_photos__class ON public.lesson_report_photos;
CREATE TRIGGER lesson_report_photos__class BEFORE INSERT OR UPDATE OF session_id, class_id
  ON public.lesson_report_photos FOR EACH ROW EXECUTE FUNCTION public.lesson_report_photos__class();

ALTER TABLE public.lesson_report_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_report_photos_staff_read ON public.lesson_report_photos;
CREATE POLICY lesson_report_photos_staff_read ON public.lesson_report_photos FOR SELECT TO authenticated
  USING (public.lesson_report_staff_can(session_id));
DROP POLICY IF EXISTS lesson_report_photos_staff_add ON public.lesson_report_photos;
CREATE POLICY lesson_report_photos_staff_add ON public.lesson_report_photos FOR INSERT TO authenticated
  WITH CHECK (public.lesson_report_staff_can(session_id));
DROP POLICY IF EXISTS lesson_report_photos_staff_edit ON public.lesson_report_photos;
CREATE POLICY lesson_report_photos_staff_edit ON public.lesson_report_photos FOR UPDATE TO authenticated
  USING (public.lesson_report_staff_can(session_id)) WITH CHECK (public.lesson_report_staff_can(session_id));
DROP POLICY IF EXISTS lesson_report_photos_staff_remove ON public.lesson_report_photos;
CREATE POLICY lesson_report_photos_staff_remove ON public.lesson_report_photos FOR DELETE TO authenticated
  USING (public.lesson_report_staff_can(session_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_report_photos TO authenticated;
GRANT ALL ON public.lesson_report_photos TO service_role;

-- The private bucket. Path {class_id}/{session_id}/{file}; staff of that session only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lesson-photos', 'lesson-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.lesson_photo_object_staff_can(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
     AND EXISTS (SELECT 1 FROM public.sessions s
                 WHERE s.id::text = split_part(p_name, '/', 2) AND s.class_id::text = split_part(p_name, '/', 1))
     AND public.lesson_report_staff_can(split_part(p_name, '/', 2)::uuid)
$$;

DROP POLICY IF EXISTS lesson_photos_staff_read ON storage.objects;
CREATE POLICY lesson_photos_staff_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-photos' AND public.lesson_photo_object_staff_can(name));
DROP POLICY IF EXISTS lesson_photos_staff_add ON storage.objects;
CREATE POLICY lesson_photos_staff_add ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-photos' AND public.lesson_photo_object_staff_can(name));
DROP POLICY IF EXISTS lesson_photos_staff_remove ON storage.objects;
CREATE POLICY lesson_photos_staff_remove ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-photos' AND public.lesson_photo_object_staff_can(name));

-- ------------------------------------------------------------------ the AI's draft (staff only)

CREATE TABLE IF NOT EXISTS public.lesson_report_drafts (
  session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'ready', 'failed')),
  run integer NOT NULL DEFAULT 1,
  runs_today integer NOT NULL DEFAULT 1,
  runs_day date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  body jsonb,
  model text,
  usage jsonb,
  error text CHECK (error IS NULL OR length(error) <= 200),
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.lesson_report_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_report_drafts_staff_read ON public.lesson_report_drafts;
CREATE POLICY lesson_report_drafts_staff_read ON public.lesson_report_drafts FOR SELECT TO authenticated
  USING (public.lesson_report_staff_can(session_id));
GRANT SELECT ON public.lesson_report_drafts TO authenticated;
GRANT ALL ON public.lesson_report_drafts TO service_role;

-- Starts a draft run for the caller (teacher or admin). Returns the run number the
-- function must quote when it saves or fails. Refuses while another run is fresh
-- (under 10 minutes), after 6 runs in a Hanoi day, and once the report is approved
-- unless p_redo (an approved report is replaced only by a new approval).
CREATE OR REPLACE FUNCTION public.lesson_report_claim(p_session uuid, p_redo boolean DEFAULT false)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class uuid; d public.lesson_report_drafts; v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF NOT public.lesson_report_teacher_can(p_session) THEN
    RAISE EXCEPTION 'Only a teacher of this class or an admin can build its lesson report' USING ERRCODE = '42501';
  END IF;
  SELECT class_id INTO v_class FROM public.sessions WHERE id = p_session;
  IF EXISTS (SELECT 1 FROM public.lesson_reports r WHERE r.session_id = p_session) AND NOT p_redo THEN
    RAISE EXCEPTION 'This lesson''s report is already approved' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO d FROM public.lesson_report_drafts WHERE session_id = p_session FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.lesson_report_drafts (session_id, class_id, started_by) VALUES (p_session, v_class, auth.uid());
    RETURN 1;
  END IF;
  IF d.status = 'building' AND d.started_at > now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'A draft is already being built for this lesson' USING ERRCODE = 'P0001';
  END IF;
  IF d.runs_day = v_today AND d.runs_today >= 6 THEN
    RAISE EXCEPTION 'This lesson''s draft has been built 6 times today' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.lesson_report_drafts SET
    status = 'building', run = d.run + 1, error = NULL, started_by = auth.uid(), started_at = now(), finished_at = NULL,
    runs_today = CASE WHEN d.runs_day = v_today THEN d.runs_today + 1 ELSE 1 END, runs_day = v_today
  WHERE session_id = p_session;
  RETURN d.run + 1;
END $$;

-- Saves the run's draft (or its failure). Only the run that is still building.
CREATE OR REPLACE FUNCTION public.lesson_report_finish(p_session uuid, p_run integer, p_body jsonb,
  p_model text DEFAULT NULL, p_usage jsonb DEFAULT NULL, p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.lesson_report_teacher_can(p_session) THEN
    RAISE EXCEPTION 'Only a teacher of this class or an admin' USING ERRCODE = '42501';
  END IF;
  IF p_error IS NULL AND (p_body IS NULL OR jsonb_typeof(p_body) <> 'object') THEN
    RAISE EXCEPTION 'A draft is a JSON object' USING ERRCODE = '22023';
  END IF;
  UPDATE public.lesson_report_drafts SET
    status = CASE WHEN p_error IS NULL THEN 'ready' ELSE 'failed' END,
    body = CASE WHEN p_error IS NULL THEN p_body ELSE body END,
    model = coalesce(p_model, model), usage = coalesce(p_usage, usage),
    error = left(p_error, 200), finished_at = now()
  WHERE session_id = p_session AND run = p_run AND status = 'building';
  RETURN FOUND;
END $$;

-- ------------------------------------------------------------------ the approved report

CREATE TABLE IF NOT EXISTS public.lesson_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_part jsonb NOT NULL CHECK (jsonb_typeof(class_part) = 'object'),
  staff_part jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(staff_part) = 'object'),
  photo_ids uuid[] NOT NULL DEFAULT '{}',
  review_homework_id uuid REFERENCES public.homeworks(id) ON DELETE SET NULL,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lesson_report_students (
  report_id uuid NOT NULL REFERENCES public.lesson_reports(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  part jsonb NOT NULL CHECK (jsonb_typeof(part) = 'object'),
  PRIMARY KEY (report_id, student_id)
);
CREATE INDEX IF NOT EXISTS lesson_report_students_student ON public.lesson_report_students(student_id);

ALTER TABLE public.lesson_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_report_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_reports_staff_read ON public.lesson_reports;
CREATE POLICY lesson_reports_staff_read ON public.lesson_reports FOR SELECT TO authenticated
  USING (public.lesson_report_staff_can(session_id));
DROP POLICY IF EXISTS lesson_report_students_staff_read ON public.lesson_report_students;
CREATE POLICY lesson_report_students_staff_read ON public.lesson_report_students FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_reports r WHERE r.id = report_id AND public.lesson_report_staff_can(r.session_id)));
GRANT SELECT ON public.lesson_reports, public.lesson_report_students TO authenticated;
GRANT ALL ON public.lesson_reports, public.lesson_report_students TO service_role;

-- ------------------------------------------------------------------ the review quiz

ALTER TABLE public.homeworks DROP CONSTRAINT IF EXISTS homeworks_submission_type_check;
ALTER TABLE public.homeworks ADD CONSTRAINT homeworks_submission_type_check
  CHECK (submission_type IN ('standard', 'video', 'quiz'));

-- questions: [{id, kind: 'choice'|'gap'|'order', prompt, prompt_vi?, options?: [..], answer, explain?, objective?}]
CREATE TABLE IF NOT EXISTS public.lesson_review_quizzes (
  homework_id uuid PRIMARY KEY REFERENCES public.homeworks(id) ON DELETE CASCADE,
  report_id uuid NOT NULL UNIQUE REFERENCES public.lesson_reports(id) ON DELETE CASCADE,
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions) = 'array'
    AND jsonb_array_length(questions) BETWEEN 1 AND 15),
  points integer NOT NULL DEFAULT 10 CHECK (points BETWEEN 0 AND 50),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_review_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_review_quizzes_staff_read ON public.lesson_review_quizzes;
CREATE POLICY lesson_review_quizzes_staff_read ON public.lesson_review_quizzes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_reports r WHERE r.id = report_id AND public.lesson_report_staff_can(r.session_id)));
GRANT SELECT ON public.lesson_review_quizzes TO authenticated;
GRANT ALL ON public.lesson_review_quizzes TO service_role;

-- ------------------------------------------------------------------ approval: the one writer

-- p_class_part: what every family of the class sees (summary, objectives, taught,
--   words, homework, tips, next, all in English with Vietnamese).
-- p_staff_part: the misconceptions and gaps in full, accepted name moments; staff only.
-- p_students:   [{student_id, part}] - each child's own part. Only children enrolled
--               in the class on the lesson's date.
-- p_photo_ids:  the photos the teacher chose to share; each must be this lesson's.
-- p_quiz:       NULL, or {title, body?, due_date?, points?, questions:[...]}. Creates the
--               review homework on the first approval; a re-approval replaces the
--               questions only while nobody has submitted it.
CREATE OR REPLACE FUNCTION public.approve_lesson_report(p_session uuid, p_class_part jsonb, p_staff_part jsonb,
  p_students jsonb, p_photo_ids uuid[], p_quiz jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.sessions; v_report uuid; v_hw uuid; v_bad int; el jsonb;
BEGIN
  IF NOT public.lesson_report_teacher_can(p_session) THEN
    RAISE EXCEPTION 'Only a teacher of this class or an admin can approve its lesson report' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session;
  IF p_class_part IS NULL OR jsonb_typeof(p_class_part) <> 'object' THEN
    RAISE EXCEPTION 'The class part is a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_students IS NULL OR jsonb_typeof(p_students) <> 'array' THEN
    RAISE EXCEPTION 'Students is a JSON array' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_bad FROM jsonb_array_elements(p_students) e
  WHERE NOT EXISTS (SELECT 1 FROM public.enrollments en
                    WHERE en.class_id = s.class_id AND en.student_id::text = e->>'student_id'
                      AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date))
     OR jsonb_typeof(e->'part') IS DISTINCT FROM 'object';
  IF v_bad > 0 THEN
    RAISE EXCEPTION '% child part(s) are for a child not in this class on the lesson''s date', v_bad USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_bad FROM unnest(coalesce(p_photo_ids, '{}')) pid
  WHERE NOT EXISTS (SELECT 1 FROM public.lesson_report_photos p WHERE p.id = pid AND p.session_id = p_session);
  IF v_bad > 0 THEN
    RAISE EXCEPTION '% photo(s) are not this lesson''s', v_bad USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.lesson_reports AS r (session_id, class_id, class_part, staff_part, photo_ids, approved_by, approved_at)
  VALUES (p_session, s.class_id, p_class_part, coalesce(p_staff_part, '{}'::jsonb), coalesce(p_photo_ids, '{}'), auth.uid(), now())
  ON CONFLICT (session_id) DO UPDATE SET class_part = EXCLUDED.class_part, staff_part = EXCLUDED.staff_part,
    photo_ids = EXCLUDED.photo_ids, approved_by = EXCLUDED.approved_by, approved_at = now()
  RETURNING r.id, r.review_homework_id INTO v_report, v_hw;

  DELETE FROM public.lesson_report_students WHERE report_id = v_report;
  FOR el IN SELECT * FROM jsonb_array_elements(p_students) LOOP
    INSERT INTO public.lesson_report_students (report_id, student_id, part)
    VALUES (v_report, (el->>'student_id')::uuid, el->'part')
    ON CONFLICT (report_id, student_id) DO UPDATE SET part = EXCLUDED.part;
  END LOOP;

  IF p_quiz IS NOT NULL THEN
    IF jsonb_typeof(p_quiz->'questions') IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_quiz->'questions') NOT BETWEEN 1 AND 15 THEN
      RAISE EXCEPTION 'A review quiz has 1 to 15 questions' USING ERRCODE = '22023';
    END IF;
    IF v_hw IS NULL THEN
      INSERT INTO public.homeworks (class_id, title, body, due_date, created_by, submission_type)
      VALUES (s.class_id, left(coalesce(nullif(p_quiz->>'title', ''), 'Lesson review'), 200), p_quiz->>'body',
              coalesce((p_quiz->>'due_date')::date, s.date + 7), auth.uid(), 'quiz')
      RETURNING id INTO v_hw;
      INSERT INTO public.lesson_review_quizzes (homework_id, report_id, questions, points)
      VALUES (v_hw, v_report, p_quiz->'questions', coalesce((p_quiz->>'points')::int, 10));
      UPDATE public.lesson_reports SET review_homework_id = v_hw WHERE id = v_report;
    ELSIF NOT EXISTS (SELECT 1 FROM public.homework_submissions hs WHERE hs.homework_id = v_hw) THEN
      UPDATE public.lesson_review_quizzes SET questions = p_quiz->'questions',
        points = coalesce((p_quiz->>'points')::int, points) WHERE homework_id = v_hw;
    END IF;
  END IF;
  RETURN jsonb_build_object('report_id', v_report, 'homework_id', v_hw);
END $$;

DO $g$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.lesson_report_staff_can(uuid)', 'public.lesson_report_teacher_can(uuid)',
    'public.lesson_photo_object_staff_can(text)', 'public.lesson_report_claim(uuid, boolean)',
    'public.lesson_report_finish(uuid, integer, jsonb, text, jsonb, text)',
    'public.approve_lesson_report(uuid, jsonb, jsonb, jsonb, uuid[], jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END
$g$;
REVOKE ALL ON FUNCTION public.lesson_report_photos__class() FROM PUBLIC, anon, authenticated;
