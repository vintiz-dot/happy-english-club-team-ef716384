-- Lesson overviews pushed to students.
-- After a transcript is analyzed, the safe-to-share slice (summary,
-- materials used + pages, assigned homework) is published here for every
-- student enrolled in the class. Kept OUT of class_transcripts on purpose:
-- students must never see raw transcripts or classmates' error analyses,
-- and RLS is row-level, not column-level.

-- Helper: is this auth user an actively-enrolled student of the class?
CREATE OR REPLACE FUNCTION public.is_enrolled_in_class(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE s.linked_user_id = _user_id
      AND e.class_id = _class_id
      AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
  );
$$;

CREATE TABLE IF NOT EXISTS public.lesson_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID UNIQUE REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  title TEXT,
  summary TEXT,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name, pages}]
  homework TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_overviews_class
  ON public.lesson_overviews(class_id, lesson_date DESC);

ALTER TABLE public.lesson_overviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_lesson_overviews" ON public.lesson_overviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_lesson_overviews" ON public.lesson_overviews
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

CREATE POLICY "students_read_class_lesson_overviews" ON public.lesson_overviews
  FOR SELECT TO authenticated
  USING (public.is_enrolled_in_class(auth.uid(), class_id));
