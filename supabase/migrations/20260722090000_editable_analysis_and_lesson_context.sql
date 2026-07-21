-- Editable AI analysis + lesson content as transcription context.

-- ── 1. Teachers can correct the AI's per-speaker analysis ────────────
-- transcript_speaker_metrics was SELECT-only for teachers, which also
-- meant the manual speaker→student assignment shipped in the previous
-- migration silently failed for anyone who wasn't an admin. Teachers own
-- their classes' analysis: let them update it (assignment + corrections to
-- contribution / teacher_feedback / recommendation / CEFR).
CREATE POLICY "teachers_update_class_tsm" ON public.transcript_speaker_metrics
  FOR UPDATE TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

-- ── 2. Lesson content as context ─────────────────────────────────────
-- The teacher's plan/notes/target vocabulary for the lesson. Fed to
-- Whisper as a recognition prompt (so domain terms and names transcribe
-- correctly), and to the analyzer so it judges the lesson against what was
-- actually planned.
ALTER TABLE public.class_transcripts
  ADD COLUMN IF NOT EXISTS lesson_context TEXT;

-- Track whether a human has corrected the AI output, so re-analysis can
-- warn before overwriting edited text.
ALTER TABLE public.transcript_speaker_metrics
  ADD COLUMN IF NOT EXISTS edited_by_teacher BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.lesson_overviews
  ADD COLUMN IF NOT EXISTS edited_by_teacher BOOLEAN NOT NULL DEFAULT false;
