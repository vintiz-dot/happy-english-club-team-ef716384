-- Point transactions deciphered from lesson transcripts.
-- When the teacher announces awards in class ("5 stars Kiki!", "minus one
-- point Tom"), analyze-transcript extracts them from TEACHER utterances and
-- stores them here as SUGGESTIONS. Nothing lands in point_transactions until
-- the teacher applies a suggestion in the Transcript Insights review UI.
-- Each suggestion records the day's attendance status for the matched
-- student so awards only go to students who were actually in class.

CREATE TABLE IF NOT EXISTS public.transcript_point_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,  -- NULL = name didn't match roster
  speaker_label TEXT NOT NULL,               -- the name as heard in the transcript
  points INT NOT NULL,                       -- negative = deduction
  quote TEXT NOT NULL,                       -- verbatim teacher utterance
  reason TEXT,                               -- short paraphrase ("reading aloud")
  -- Present / Late / Absent / Excused / unmarked (no attendance record) /
  -- no_session (no session found for the transcript date)
  attendance_status TEXT NOT NULL DEFAULT 'unmarked',
  status TEXT NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'applied', 'dismissed')),
  applied_by UUID,
  applied_at TIMESTAMPTZ,
  point_transaction_ref UUID,                -- the created point_transactions row
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tps_transcript
  ON public.transcript_point_suggestions(transcript_id, status);

ALTER TABLE public.transcript_point_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_point_suggestions" ON public.transcript_point_suggestions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers_manage_class_point_suggestions" ON public.transcript_point_suggestions
  FOR ALL TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
