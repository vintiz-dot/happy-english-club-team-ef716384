-- Richer lesson context: did the lesson cover its stated title, what
-- resources were used (as images students can see), and a memory of manual
-- speaker→student corrections so the same mis-heard name resolves itself
-- next time.

-- ── 1. Lesson-title evidence ─────────────────────────────────────────
-- analyze-transcript now checks the transcript against the lesson title
-- and records whether the topic was actually taught, with quotes.
ALTER TABLE public.class_transcripts
  ADD COLUMN IF NOT EXISTS title_covered BOOLEAN,
  ADD COLUMN IF NOT EXISTS title_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS title_note TEXT;

-- ── 2. Lesson resources (images of materials used in class) ──────────
-- Attached to a transcript/lesson by the teacher and surfaced to every
-- enrolled student inside the lesson content.
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,          -- lesson-resources bucket: <class_id>/<uuid>.<ext>
  caption TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_resources_transcript
  ON public.lesson_resources(transcript_id, created_at);

ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_lesson_resources" ON public.lesson_resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_lesson_resources" ON public.lesson_resources
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

CREATE POLICY "students_read_class_lesson_resources" ON public.lesson_resources
  FOR SELECT TO authenticated
  USING (public.is_enrolled_in_class(auth.uid(), class_id));

-- Private bucket; students read via signed URLs, gated by the storage
-- policy below. Paths are <class_id>/<uuid>.<ext> so the policy can map an
-- object back to its class.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-resources', 'lesson-resources', false,
  10485760,                                     -- 10 MB per image
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "staff_manage_lesson_resource_files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'lesson-resources'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  )
  WITH CHECK (
    bucket_id = 'lesson-resources'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  );

CREATE POLICY "students_read_lesson_resource_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-resources'
    AND public.is_enrolled_in_class(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ── 3. Speaker alias memory ──────────────────────────────────────────
-- When a teacher manually assigns an unmatched speaker to a student, the
-- normalized label is remembered for that class so the same mis-heard name
-- ("Kiwi" for "Kiki") resolves automatically in later transcripts.
CREATE TABLE IF NOT EXISTS public.class_speaker_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,        -- lowercased, diacritics stripped
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, speaker_label)
);

ALTER TABLE public.class_speaker_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_speaker_aliases" ON public.class_speaker_aliases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_speaker_aliases" ON public.class_speaker_aliases
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
