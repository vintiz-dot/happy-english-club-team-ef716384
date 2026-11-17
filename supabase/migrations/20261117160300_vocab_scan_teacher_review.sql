-- Review N-8 (owner rule): words a model reads off a child's vocabulary
-- page reach the child's word bank only after a teacher approves them.
--
-- THE GAP. ocr-vocab-scan ran Vision + an LLM over a photographed page and
-- put every word it extracted straight into student_vocabulary_entries (the
-- child's word bank), awarded +10 points a word, logged grammar slips into
-- the error log and SRS deck, and marked the page 'approved' itself. Live:
-- 302 words for 3 children from 32 pages. Those stay as they are (history;
-- a teacher did upload each page) - this migration changes no existing row.
--
-- NOW
--   student_work_vocab_drafts: one pending set per page - the words the
--     model proposed (with meaning, example, grammar note and the images
--     already found), staff-only exactly like student_work_ai_drafts
--     (student_work_draft_staff_can, 20261117160000), written by the service
--     role alone. No student or family policy.
--   ocr-vocab-scan (scan) writes the pending set and leaves the page in
--     needs_review; (approve, a teacher's click in Smart Upload) takes the
--     set - deleting it is the claim, so two approvals cannot both commit -
--     and only then writes the words, points, activity, error log and cards
--     for the words the teacher kept.
--   A word the scan writes into the bank carries enrichment.approved_by.
--     An ocr_scan word without it is refused, so the function as deployed
--     before this change cannot keep writing unreviewed words in the window
--     before it is redeployed (its words come back "rejected", no points).
--
-- Fails closed: refuses to install without 20261117160000 and the word
-- bank. Safe to run twice.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.student_work') IS NULL OR to_regclass('public.student_vocabulary_entries') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: student_work / student_vocabulary_entries missing';
  END IF;
  IF to_regprocedure('public.student_work_draft_staff_can(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: student_work_draft_staff_can missing (paste 20261117160000 first)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'student_vocabulary_entries' AND column_name = 'enrichment') THEN
    RAISE EXCEPTION 'Refusing to install: student_vocabulary_entries.enrichment missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'student_work_vocab_drafts'
                AND policyname <> 'student_work_vocab_drafts_staff_read') THEN
    RAISE EXCEPTION 'Refusing to install: student_work_vocab_drafts has a policy this migration does not know';
  END IF;
END
$pre$;

CREATE TABLE IF NOT EXISTS public.student_work_vocab_drafts (
  work_id      uuid PRIMARY KEY REFERENCES public.student_work(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL,
  class_id     uuid,
  -- [{word, meaning, example, is_grammatical, corrected_example, images, status: 'new'|'duplicate'}]
  entries      jsonb NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT student_work_vocab_drafts_entries_array CHECK (jsonb_typeof(entries) = 'array'),
  ocr_text     text,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_work_vocab_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_work_vocab_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_work_vocab_drafts TO authenticated;
GRANT ALL ON public.student_work_vocab_drafts TO service_role;

DROP POLICY IF EXISTS student_work_vocab_drafts_staff_read ON public.student_work_vocab_drafts;
CREATE POLICY student_work_vocab_drafts_staff_read ON public.student_work_vocab_drafts
  FOR SELECT TO authenticated
  USING (public.student_work_draft_staff_can(work_id));

-- An OCR word enters a word bank only with a teacher's approval on it.
CREATE OR REPLACE FUNCTION public.vocab_ocr_words_need_a_teacher()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.enrichment->>'source' = 'ocr_scan'
     AND COALESCE(NEW.enrichment->>'approved_by', '') = '' THEN
    RAISE EXCEPTION 'A scanned word goes into a word bank only after a teacher approves it (Smart Upload review)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vocab_ocr_words_need_a_teacher ON public.student_vocabulary_entries;
CREATE TRIGGER vocab_ocr_words_need_a_teacher
  BEFORE INSERT ON public.student_vocabulary_entries
  FOR EACH ROW EXECUTE FUNCTION public.vocab_ocr_words_need_a_teacher();

REVOKE ALL ON FUNCTION public.vocab_ocr_words_need_a_teacher() FROM PUBLIC, anon, authenticated;

COMMIT;
