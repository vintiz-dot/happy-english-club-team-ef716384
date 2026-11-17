-- ROLLBACK of supabase/migrations/20261117151000_cefr_model_drafts.sql
-- (privacy follow-ups; docs/evidence/PRIVACY-followups.md).
--
-- Run ROLLBACK-family-reads-without-ai.sql first if 20261117152000 is in.
--
-- What it does, in one transaction:
--   1. drops the three triggers (the guard on cefr_assessments, the unpublish
--      trigger, the drafts' write guard);
--   2. puts back every point the take-back held, exactly as it was
--      (held_row, same id), unless that id is published already (a teacher
--      approved it: the teacher's row stays);
--   3. keeps every draft: copies the whole table into
--      cefr_assessment_drafts_rolled_back (no API role can read it), then
--      drops cefr_assessment_drafts with its policy;
--   4. drops the approve / discard / guard / helper functions;
--   5. puts the source CHECK back to production's five values - unless an
--      approved level-defense point exists, which the narrow CHECK would
--      refuse: then the wider CHECK stays and it says so.
-- Nothing a teacher approved is deleted. Model output that was never
-- published (undecided drafts) is NOT published by this: it stays in the
-- copy. The functions as deployed after this branch then fail to save a draft
-- (logged, nothing shared) until either the migration is pasted again or the
-- old functions are redeployed.
--
-- Pasting the migration again afterwards holds the restored points again
-- (and any model point a teacher had approved, whose approval record is now
-- in the copy): they go back to the teachers' queue. Safe to run twice.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS cefr_model_point_guard ON public.cefr_assessments;
DROP TRIGGER IF EXISTS cefr_published_point_removed ON public.cefr_assessments;

DO $rollback$
DECLARE
  v_restored int := 0;
  v_copied int := 0;
BEGIN
  IF to_regclass('public.cefr_assessment_drafts') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS cefr_draft_write_guard ON public.cefr_assessment_drafts';

    INSERT INTO public.cefr_assessments
    SELECT (jsonb_populate_record(NULL::public.cefr_assessments, d.held_row)).*
      FROM public.cefr_assessment_drafts d
     WHERE d.held_row IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.cefr_assessments c WHERE c.id = d.id);
    GET DIAGNOSTICS v_restored = ROW_COUNT;

    IF to_regclass('public.cefr_assessment_drafts_rolled_back') IS NULL THEN
      CREATE TABLE public.cefr_assessment_drafts_rolled_back (LIKE public.cefr_assessment_drafts);
      ALTER TABLE public.cefr_assessment_drafts_rolled_back ADD COLUMN rolled_back_at timestamptz NOT NULL DEFAULT now();
      ALTER TABLE public.cefr_assessment_drafts_rolled_back ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.cefr_assessment_drafts_rolled_back FROM PUBLIC, anon, authenticated, service_role;
    END IF;
    INSERT INTO public.cefr_assessment_drafts_rolled_back
      SELECT d.*, now() FROM public.cefr_assessment_drafts d;
    GET DIAGNOSTICS v_copied = ROW_COUNT;

    DROP TABLE public.cefr_assessment_drafts;
  END IF;
  RAISE NOTICE 'cefr model drafts rollback: % held point(s) put back, % draft(s) kept in cefr_assessment_drafts_rolled_back', v_restored, v_copied;
END
$rollback$;

DROP FUNCTION IF EXISTS public.approve_cefr_draft(uuid, text);
DROP FUNCTION IF EXISTS public.discard_cefr_draft(uuid);
DROP FUNCTION IF EXISTS public.cefr_model_point_guard();
DROP FUNCTION IF EXISTS public.cefr_published_point_removed();
DROP FUNCTION IF EXISTS public.cefr_draft_write_guard();
DROP FUNCTION IF EXISTS public.cefr_draft_staff_can(uuid, uuid);
DROP FUNCTION IF EXISTS public.cefr_point_is_model_made(text, uuid);

DO $check$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cefr_assessments WHERE source IN ('level_defense_evidence', 'level_defense_test')) THEN
    RAISE NOTICE 'cefr model drafts rollback: approved level-defense points exist; the wider source CHECK stays';
  ELSE
    ALTER TABLE public.cefr_assessments DROP CONSTRAINT IF EXISTS cefr_assessments_source_check;
    ALTER TABLE public.cefr_assessments ADD CONSTRAINT cefr_assessments_source_check
      CHECK (source IN ('ai_report', 'transcript', 'manual', 'vocab_analysis', 'exam'));
  END IF;
END
$check$;

COMMIT;
