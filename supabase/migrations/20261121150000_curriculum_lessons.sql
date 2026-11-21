-- What a lesson set out to teach (21 Nov 2026): the course book's own lesson
-- objectives, so the lesson report draft starts from what was planned instead
-- of guessing it from the transcript.
--
--   curriculum_lessons    one row per lesson of a course level, from the
--                         school's own Teacher's Guide (seeded by
--                         scripts/build-curriculum-seed.mjs): Student Book page,
--                         objectives, words, reading strategy, grammar point,
--                         listening / speaking / word study / writing focus and
--                         the unit pair's Big Question. Teaching content, not
--                         about any child: every staff member may read it
--                         (admin, teacher, active TA). Only admins change it.
--   session_lesson_plans  which of those lessons a session covered (one or
--                         more, in order). Staff of that session only
--                         (lesson_report_staff_can), like the rest of the
--                         lesson report. Who set it and when are the server's.
--
-- lesson-report-draft reads the session's plan as the calling teacher and gives
-- the model the planned objectives as context; the teacher still confirms the
-- report's objectives on the review screen.
--
-- Needs 20261121130000_lesson_reports.sql. Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regprocedure('public.lesson_report_staff_can(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs lesson_report_staff_can (20261121130000_lesson_reports.sql)';
  END IF;
END
$pre$;

CREATE TABLE IF NOT EXISTS public.curriculum_lessons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum       text NOT NULL,              -- 'oxford-discover-2e'
  level            int  NOT NULL CHECK (level BETWEEN 1 AND 12),
  unit_from        int  NOT NULL CHECK (unit_from >= 1),
  unit_to          int  NOT NULL,               -- = unit_from, or the pair's second unit for Big Question / Wrap Up
  lesson           text NOT NULL,               -- 'Get Ready', 'Read', 'Understand', 'Communicate', 'Big Question', 'Wrap Up'
  sb_page          int,
  objectives       text[] NOT NULL DEFAULT '{}',
  vocabulary       text[] NOT NULL DEFAULT '{}',
  words_in_context text[] NOT NULL DEFAULT '{}',
  reading_strategy text,
  grammar          text,
  focus            jsonb NOT NULL DEFAULT '{}'::jsonb,
  big_question     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT curriculum_lessons_units CHECK (unit_to >= unit_from),
  -- A plain UNIQUE so the seed can ON CONFLICT against it.
  CONSTRAINT curriculum_lessons_one UNIQUE (curriculum, level, unit_from, lesson)
);

CREATE OR REPLACE FUNCTION public.curriculum_staff_can()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
    OR EXISTS (SELECT 1 FROM public.teaching_assistants ta WHERE ta.user_id = auth.uid() AND ta.is_active IS NOT FALSE))
$$;
REVOKE ALL ON FUNCTION public.curriculum_staff_can() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.curriculum_staff_can() TO authenticated, service_role;

ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS curriculum_lessons_staff_read ON public.curriculum_lessons;
CREATE POLICY curriculum_lessons_staff_read ON public.curriculum_lessons FOR SELECT TO authenticated
  USING (public.curriculum_staff_can());
DROP POLICY IF EXISTS curriculum_lessons_admin_write ON public.curriculum_lessons;
CREATE POLICY curriculum_lessons_admin_write ON public.curriculum_lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_lessons TO authenticated;
GRANT ALL ON public.curriculum_lessons TO service_role;

CREATE TABLE IF NOT EXISTS public.session_lesson_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  lesson_id  uuid NOT NULL REFERENCES public.curriculum_lessons(id) ON DELETE CASCADE,
  position   int  NOT NULL DEFAULT 1,
  set_by     uuid NOT NULL,
  set_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_lesson_plans_one UNIQUE (session_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS session_lesson_plans_session ON public.session_lesson_plans (session_id, position);

CREATE OR REPLACE FUNCTION public.session_lesson_plans_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN NEW.set_by := auth.uid(); END IF;
  IF NEW.set_by IS NULL THEN RAISE EXCEPTION 'A lesson plan needs the person who set it'; END IF;
  NEW.set_at := now();
  RETURN NEW;
END
$$;
DROP TRIGGER IF EXISTS session_lesson_plans_fill ON public.session_lesson_plans;
CREATE TRIGGER session_lesson_plans_fill BEFORE INSERT OR UPDATE ON public.session_lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.session_lesson_plans_fill();

ALTER TABLE public.session_lesson_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_lesson_plans_staff ON public.session_lesson_plans;
CREATE POLICY session_lesson_plans_staff ON public.session_lesson_plans FOR ALL TO authenticated
  USING (public.lesson_report_staff_can(session_id)) WITH CHECK (public.lesson_report_staff_can(session_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_lesson_plans TO authenticated;
GRANT ALL ON public.session_lesson_plans TO service_role;

-- Nothing here is for a signed-out visitor. Supabase's default privileges can
-- hand anon full table grants; RLS already refused it, this removes the grants.
REVOKE ALL ON public.curriculum_lessons FROM anon;
REVOKE ALL ON public.session_lesson_plans FROM anon;

COMMIT;
