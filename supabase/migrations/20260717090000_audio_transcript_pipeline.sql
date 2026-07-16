-- Audio-sourced transcripts: upload the raw class recording and let Whisper
-- transcribe it (with real timestamps), then the existing diarization/
-- analysis/point-award pipeline runs unchanged on the result.

-- 'audio' joins the existing source formats; class_transcripts.raw_text
-- stays NOT NULL — the frontend inserts a placeholder until transcription
-- fills it in with the labeled, timestamped VTT.
ALTER TABLE public.class_transcripts
  DROP CONSTRAINT IF EXISTS class_transcripts_source_format_check;
ALTER TABLE public.class_transcripts
  ADD CONSTRAINT class_transcripts_source_format_check
  CHECK (source_format IN ('vtt', 'srt', 'txt', 'paste', 'audio'));

ALTER TABLE public.class_transcripts
  ADD COLUMN IF NOT EXISTS audio_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS audio_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds NUMERIC;

-- Storage bucket for uploaded class recordings (private). The bucket limit
-- is a generous backstop — the real ~25MB Whisper ceiling is enforced with
-- a clear, actionable error inside transcribe-lesson-audio before it ever
-- calls OpenAI, so a near-boundary file gets a helpful message instead of a
-- silent storage-level rejection.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-recordings', 'class-recordings', false,
  52428800,                                     -- 50 MB backstop
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm',
        'audio/m4a', 'audio/x-m4a', 'audio/mp3', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "staff_manage_class_recordings" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'class-recordings'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  )
  WITH CHECK (
    bucket_id = 'class-recordings'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
