-- ═══════════════════════════════════════════════════════════════════════
-- Data-Driven Instruction Pipelines
-- ═══════════════════════════════════════════════════════════════════════
-- Adds the storage + tables behind:
--   • OCR student-work routing (Google Cloud Vision)         → student_work
--   • Transcript ingestion + immediate analysis              → class_transcripts,
--                                                               transcript_speaker_metrics
--   • Error-logged spaced repetition (SM-2)                  → student_error_log,
--                                                               srs_cards, srs_reviews
--   • CEFR trajectory tracking                               → cefr_assessments
--   • AI report generation                                   → student_reports
--
-- Access model (matches existing helpers):
--   admins   → has_role(auth.uid(), 'admin')          full access
--   teachers → is_teacher_of_class(auth.uid(), class) class-scoped
--   students → students.linked_user_id = auth.uid()   own rows, read-only,
--              and only teacher-approved/published content where relevant.
-- Edge functions write with the service role and bypass RLS.

-- ──────────────────────────────────────────────────────────────────────
-- Helper: current user's student ids (a user may be linked to one student)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_linked_student(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = _student_id AND s.linked_user_id = _user_id
  );
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 1. student_work — uploaded photos of physical work, OCR'd and routed
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,                    -- auth.users.id of teacher
  storage_path TEXT NOT NULL,                   -- student-work bucket path
  original_filename TEXT,
  mime_type TEXT,
  workflow TEXT NOT NULL DEFAULT 'general'
    CHECK (workflow IN ('general', 'vocab')),
  ocr_text TEXT,
  ocr_confidence NUMERIC,
  detected_student_name TEXT,                   -- name Vision found on the page
  match_confidence NUMERIC,                     -- 0..1 roster fuzzy-match score
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'needs_review', 'approved', 'rejected', 'failed')),
  teacher_notes TEXT,                           -- shown to the student once approved
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_work_student
  ON public.student_work(student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_work_class
  ON public.student_work(class_id, created_at DESC) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_work_review
  ON public.student_work(status, created_at DESC);

ALTER TABLE public.student_work ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_student_work" ON public.student_work
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_student_work" ON public.student_work
  FOR ALL TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  );

CREATE POLICY "students_read_approved_work" ON public.student_work
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND student_id IS NOT NULL
    AND public.is_linked_student(auth.uid(), student_id)
  );

-- ──────────────────────────────────────────────────────────────────────
-- 2. class_transcripts — end-of-lesson transcripts, analyzed on upload
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL,
  title TEXT,
  transcript_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_format TEXT NOT NULL DEFAULT 'txt'
    CHECK (source_format IN ('vtt', 'srt', 'txt', 'paste')),
  raw_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'analyzed', 'failed')),
  summary TEXT,                                 -- LLM lesson summary
  analysis JSONB,                               -- full structured LLM output
  error_message TEXT,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transcripts_class
  ON public.class_transcripts(class_id, transcript_date DESC);

ALTER TABLE public.class_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_transcripts" ON public.class_transcripts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_transcripts" ON public.class_transcripts
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

-- ──────────────────────────────────────────────────────────────────────
-- 3. transcript_speaker_metrics — per-student engagement per transcript
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transcript_speaker_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  speaker_label TEXT NOT NULL,                  -- raw name in the transcript
  is_teacher BOOLEAN NOT NULL DEFAULT false,
  utterance_count INT NOT NULL DEFAULT 0,
  word_count INT NOT NULL DEFAULT 0,
  avg_utterance_length NUMERIC,
  questions_asked INT NOT NULL DEFAULT 0,
  participation_share NUMERIC,                  -- 0..1 of student talk
  vocabulary_richness NUMERIC,                  -- distinct/total word ratio
  errors_count INT NOT NULL DEFAULT 0,
  cefr_estimate TEXT,
  highlights JSONB,                             -- notable quotes / breakthroughs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsm_transcript ON public.transcript_speaker_metrics(transcript_id);
CREATE INDEX IF NOT EXISTS idx_tsm_student
  ON public.transcript_speaker_metrics(student_id, created_at DESC) WHERE student_id IS NOT NULL;

ALTER TABLE public.transcript_speaker_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_tsm" ON public.transcript_speaker_metrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_read_class_tsm" ON public.transcript_speaker_metrics
  FOR SELECT TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id));

CREATE POLICY "students_read_own_tsm" ON public.transcript_speaker_metrics
  FOR SELECT TO authenticated
  USING (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id));

-- ──────────────────────────────────────────────────────────────────────
-- 4. student_error_log — flagged errors from transcripts / work / live class
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'live_flag'
    CHECK (source IN ('transcript', 'student_work', 'live_flag', 'homework', 'vocab')),
  source_id UUID,                               -- transcript/work row when applicable
  error_text TEXT NOT NULL,                     -- what the student said/wrote
  corrected_text TEXT,                          -- the corrected form
  error_type TEXT NOT NULL DEFAULT 'grammar'
    CHECK (error_type IN ('grammar', 'vocabulary', 'pronunciation', 'spelling', 'syntax', 'other')),
  cefr_topic TEXT,                              -- e.g. "past simple", "articles"
  severity SMALLINT NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
  notes TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,                              -- teacher user id; NULL = pipeline
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sel_student
  ON public.student_error_log(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sel_class
  ON public.student_error_log(class_id, created_at DESC) WHERE class_id IS NOT NULL;

ALTER TABLE public.student_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_error_log" ON public.student_error_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_error_log" ON public.student_error_log
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  );

CREATE POLICY "students_read_own_errors" ON public.student_error_log
  FOR SELECT TO authenticated
  USING (public.is_linked_student(auth.uid(), student_id));

-- ──────────────────────────────────────────────────────────────────────
-- 5. srs_cards + srs_reviews — SM-2 spaced repetition
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.srs_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'error' CHECK (source IN ('error', 'vocab')),
  error_log_id UUID REFERENCES public.student_error_log(id) ON DELETE CASCADE,
  vocab_entry_id UUID REFERENCES public.student_vocabulary_entries(id) ON DELETE CASCADE,
  front TEXT NOT NULL,                          -- prompt side
  back TEXT NOT NULL,                           -- answer side
  hint TEXT,
  -- SM-2 state
  ease_factor NUMERIC NOT NULL DEFAULT 2.5,
  interval_days NUMERIC NOT NULL DEFAULT 0,
  repetitions INT NOT NULL DEFAULT 0,
  lapses INT NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, error_log_id),
  UNIQUE (student_id, vocab_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_srs_due
  ON public.srs_cards(student_id, due_date) WHERE NOT suspended;

ALTER TABLE public.srs_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_srs" ON public.srs_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "students_manage_own_srs" ON public.srs_cards
  FOR ALL TO authenticated
  USING (public.is_linked_student(auth.uid(), student_id))
  WITH CHECK (public.is_linked_student(auth.uid(), student_id));

-- Teachers seed cards from live-flagged errors and can see class decks.
CREATE POLICY "teachers_insert_srs" ON public.srs_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "teachers_read_srs" ON public.srs_cards
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

CREATE TABLE IF NOT EXISTS public.srs_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.srs_cards(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 5),
  interval_before NUMERIC,
  interval_after NUMERIC,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srs_reviews_student
  ON public.srs_reviews(student_id, reviewed_at DESC);

ALTER TABLE public.srs_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_srs_reviews" ON public.srs_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "students_manage_own_srs_reviews" ON public.srs_reviews
  FOR ALL TO authenticated
  USING (public.is_linked_student(auth.uid(), student_id))
  WITH CHECK (public.is_linked_student(auth.uid(), student_id));

-- ──────────────────────────────────────────────────────────────────────
-- 6. cefr_assessments — the CEFR trajectory over time
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cefr_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('ai_report', 'transcript', 'manual', 'vocab_analysis', 'exam')),
  level TEXT NOT NULL
    CHECK (level IN ('Pre-A1', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
  -- numeric position for charting: Pre-A1=0, A1=1, A1+=1.5, A2=2 … C2=6
  level_score NUMERIC NOT NULL,
  sub_scores JSONB,                             -- {speaking, listening, reading, writing, grammar, vocabulary}
  confidence NUMERIC,                           -- 0..1 model confidence
  evidence TEXT,
  assessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,                              -- NULL = pipeline
  source_id UUID,                               -- transcript / report id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cefr_student
  ON public.cefr_assessments(student_id, assessed_at);

ALTER TABLE public.cefr_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_cefr" ON public.cefr_assessments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_cefr" ON public.cefr_assessments
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  );

CREATE POLICY "students_read_own_cefr" ON public.cefr_assessments
  FOR SELECT TO authenticated
  USING (public.is_linked_student(auth.uid(), student_id));

-- ──────────────────────────────────────────────────────────────────────
-- 7. student_reports — AI-generated professional reports
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  generated_by UUID NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'ready', 'failed')),
  model TEXT,
  source_counts JSONB,                          -- what went into the prompt
  report JSONB,                                 -- {cefr, strengths, weaknesses, learning_styles, recommendations, ...}
  narrative TEXT,                               -- polished prose report
  published BOOLEAN NOT NULL DEFAULT false,     -- student/parent visible when true
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_student
  ON public.student_reports(student_id, created_at DESC);

ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_reports" ON public.student_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_reports" ON public.student_reports
  FOR ALL TO authenticated
  USING (
    generated_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  )
  WITH CHECK (
    generated_by = auth.uid()
    OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id))
  );

CREATE POLICY "students_read_published_reports" ON public.student_reports
  FOR SELECT TO authenticated
  USING (published AND public.is_linked_student(auth.uid(), student_id));

-- ──────────────────────────────────────────────────────────────────────
-- 8. Storage bucket for uploaded work photos (private)
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-work', 'student-work', false,
  10485760,                                     -- 10 MB per photo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Teachers/admins manage everything in the bucket.
CREATE POLICY "staff_manage_student_work_files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'student-work'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  )
  WITH CHECK (
    bucket_id = 'student-work'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );

-- Students read files routed into their own folder: students/<student_id>/…
CREATE POLICY "students_read_own_work_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-work'
    AND (storage.foldername(name))[1] = 'students'
    AND public.is_linked_student(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );

-- ──────────────────────────────────────────────────────────────────────
-- 9. Realtime for the live-classroom HUD and instant transcript status
-- ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.class_transcripts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_work;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
