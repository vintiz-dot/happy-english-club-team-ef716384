-- Background audio pipeline: the transcribe/analyze chain no longer runs
-- inside one synchronous HTTP request (long recordings outlived the request
-- window and were killed mid-flight). Functions now respond immediately and
-- work in the background; the client polls these columns for progress.

ALTER TABLE public.class_transcripts
  ADD COLUMN IF NOT EXISTS processing_stage TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.class_transcripts.processing_stage IS
  'Granular pipeline stage: transcribing | diarizing | analyzing | completed | failed';
