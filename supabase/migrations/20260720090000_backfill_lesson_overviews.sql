-- Backfill lesson_overviews from transcripts that were already analyzed
-- before analyze-transcript learned to publish them. Without this, every
-- pre-existing lesson shows "No lessons yet" on the student side until the
-- teacher re-analyzes it one by one.
--
-- summary comes from the class_transcripts column (always present once
-- analyzed); materials/homework come from the stored analysis JSONB when
-- the analyzing function was new enough to extract them (older analyses
-- simply get an empty materials list and no homework — the teacher can
-- re-analyze to enrich those). Idempotent: ON CONFLICT keeps any row the
-- live function has already written.

INSERT INTO public.lesson_overviews
  (transcript_id, class_id, lesson_date, title, summary, materials, homework)
SELECT
  ct.id,
  ct.class_id,
  ct.transcript_date,
  ct.title,
  ct.summary,
  CASE
    WHEN jsonb_typeof(ct.analysis -> 'materials') = 'array'
      THEN ct.analysis -> 'materials'
    ELSE '[]'::jsonb
  END,
  ct.analysis ->> 'homework'
FROM public.class_transcripts ct
WHERE ct.status = 'analyzed'
  AND ct.summary IS NOT NULL
ON CONFLICT (transcript_id) DO NOTHING;
