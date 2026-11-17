-- Take back what the OLD transcript pipeline published on its own
-- (D-26 fix round 1, review M-1; docs/evidence/FIX-analyze-transcript.md).
--
-- WHY. Before 20261117100000 the analysis linked each speaker to a child by
-- a fuzzy name match and published at once, with no teacher in between:
-- the metric row (the child's "How you did" text), error-log rows and their
-- practice cards, a CEFR point, and the lesson overview. In production that
-- is every analysed lesson (24): 57 linked metric rows for 32 children, 100
-- error rows + 100 cards (none reviewed), 54 CEFR points, 24 overviews. A
-- child the matcher picked wrongly keeps another child's errors and level
-- in their family's view.
--
-- WHAT THIS DOES, per lesson that has NO approval row:
--   1. copies every row it takes down, whole, into transcript_legacy_holds
--      (staff of the class only) - nothing is lost;
--   2. turns the lesson into a draft the teacher can approve WITHOUT a paid
--      re-analysis: one suggestion row per linked speaker, naming the child
--      the old pipeline picked (basis 'legacy_auto', never pre-selected; a
--      teacher's own saved label for that child is 'teacher_alias'), with
--      that speaker's published errors (de-duplicated) and CEFR point as the
--      drafted ones; the published overview becomes overview_draft;
--   3. unlinks the metric rows (student_id NULL; the old link is the
--      suggestion and the held copy);
--   4. deletes the error rows (their cards go with them, ON DELETE CASCADE),
--      the CEFR points and the overviews it copied.
--
-- WHICH ROWS. Only what the old analysis wrote:
--   student_error_log  source = 'transcript' AND source_id = the lesson AND created_by IS NULL
--   cefr_assessments   source = 'transcript' AND source_id = the lesson AND created_by IS NULL
--   srs_cards          the cards of those error rows
--   lesson_overviews   transcript_id = the lesson AND NOT edited_by_teacher
--   transcript_speaker_metrics  student_id set on a lesson with no approval
-- created_by IS NULL is the pipeline's mark (20260712090000: "NULL =
-- pipeline"): the old analysis never set it; the old screen's hand picker,
-- the approval, video homework (its own source) and every person's write
-- set it. Rows of other sources (live_flag, student_work, homework, vocab,
-- ai_report, manual, exam) are never read. A lesson with an approval row
-- (approved or withdrawn) is left alone: its rows are the approval's.
--
-- KEPT AS THEY ARE. A lesson overview a teacher edited by hand
-- (edited_by_teacher, 2 in production) stays published - it is the
-- teacher's own text - and becomes the draft too, marked as the teacher's,
-- so neither a re-analysis nor the approval replaces it with AI text
-- (review N-9). Cards are copied before they go (none had been reviewed).
--
-- NOT TOUCHED. student_learning_profiles: an AI summary refreshed from the
-- published rows; it is refreshed for each child when a teacher approves.
-- The owner may refresh the 32 children's profiles after this paste.
--
-- Paste AFTER 20261117100000 and after the new analyze-transcript is
-- deployed (the old one would publish again on the next analysis). Safe to
-- paste twice: a second paste finds nothing left and holds nothing more.
-- Preflight fails closed. Prints its counts (NOTICE and the last SELECT).

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0
DO $preflight$
DECLARE
  t text;
BEGIN
  IF to_regclass('public.transcript_approvals') IS NULL
     OR to_regclass('public.transcript_speaker_suggestions') IS NULL
     OR to_regprocedure('public.approve_transcript_analysis(uuid, jsonb, jsonb, boolean)') IS NULL
     OR to_regprocedure('public._transcript_alias_revert(uuid, jsonb)') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.transcript_speaker_metrics'::regclass
                     AND tgname = 'transcript_metrics_link_guard' AND tgenabled <> 'D') THEN
    RAISE EXCEPTION 'Refusing to run: paste 20261117100000_transcript_analysis_drafts.sql (fix round 1) first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transcript_speaker_suggestions_basis_check'
                    AND pg_get_constraintdef(oid) LIKE '%legacy_auto%') THEN
    RAISE EXCEPTION 'Refusing to run: transcript_speaker_suggestions does not accept basis legacy_auto - paste 20261117100000 (fix round 1) again first';
  END IF;
  FOREACH t IN ARRAY ARRAY['class_transcripts', 'transcript_speaker_metrics', 'transcript_speaker_suggestions', 'transcript_approvals',
                           'student_error_log', 'srs_cards', 'cefr_assessments', 'lesson_overviews', 'class_speaker_aliases'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Refusing to run: public.% is missing or has row level security off', t;
    END IF;
  END LOOP;
  -- Only these policies may read the drafts this file writes (as 20261117100000 checks).
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transcript_speaker_suggestions'
                AND policyname <> 'transcript_speaker_suggestions_staff_read')
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                   AND ((tablename = 'transcript_speaker_metrics'
                         AND policyname NOT IN ('admins_all_tsm', 'teachers_read_class_tsm', 'students_read_own_tsm', 'teachers_update_class_tsm'))
                     OR (tablename = 'class_transcripts'
                         AND policyname NOT IN ('admins_all_transcripts', 'teachers_manage_class_transcripts')))) THEN
    RAISE EXCEPTION 'Refusing to run: a policy this file does not know is on a draft table';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------- 1
-- The holding place: staff of the class only, written by nobody but this
-- file (no write policy).
CREATE TABLE IF NOT EXISTS public.transcript_legacy_holds (
  transcript_id uuid PRIMARY KEY REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id      uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  held_at       timestamptz NOT NULL DEFAULT now(),
  -- [{ "table": ..., "row": <the whole row> }], as transcript_approvals.replaced_legacy
  held_rows     jsonb NOT NULL DEFAULT '[]'::jsonb,
  counts        jsonb NOT NULL DEFAULT '{}'::jsonb,
  history       jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.transcript_legacy_holds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transcript_legacy_holds_staff_read ON public.transcript_legacy_holds;
CREATE POLICY transcript_legacy_holds_staff_read ON public.transcript_legacy_holds
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL
         AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.is_teacher_of_class(auth.uid(), class_id)));
REVOKE ALL ON public.transcript_legacy_holds FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_legacy_holds TO authenticated;
GRANT ALL ON public.transcript_legacy_holds TO service_role;

-- ---------------------------------------------------------------- 2
-- Which lessons, and which rows (the identification rule above).
CREATE TEMP TABLE _tlu_lesson ON COMMIT DROP AS
SELECT t.id AS transcript_id, t.class_id,
       EXISTS (SELECT 1 FROM public.transcript_speaker_suggestions s WHERE s.transcript_id = t.id) AS has_drafts
  FROM public.class_transcripts t
 WHERE NOT EXISTS (SELECT 1 FROM public.transcript_approvals a WHERE a.transcript_id = t.id)
   AND (EXISTS (SELECT 1 FROM public.transcript_speaker_metrics m WHERE m.transcript_id = t.id AND m.student_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.student_error_log e WHERE e.source = 'transcript' AND e.source_id = t.id AND e.created_by IS NULL)
        OR EXISTS (SELECT 1 FROM public.cefr_assessments c WHERE c.source = 'transcript' AND c.source_id = t.id AND c.created_by IS NULL)
        OR EXISTS (SELECT 1 FROM public.lesson_overviews o WHERE o.transcript_id = t.id AND NOT o.edited_by_teacher)
        -- a teacher-edited overview whose draft is not yet the teacher's text (N-9)
        OR EXISTS (SELECT 1 FROM public.lesson_overviews o WHERE o.transcript_id = t.id AND o.edited_by_teacher
                      AND COALESCE(t.overview_draft->>'edited_by_teacher', '') <> 'true'));

CREATE TEMP TABLE _tlu_metric ON COMMIT DROP AS
SELECT m.*, l.has_drafts FROM public.transcript_speaker_metrics m JOIN _tlu_lesson l ON l.transcript_id = m.transcript_id
 WHERE m.student_id IS NOT NULL;
CREATE TEMP TABLE _tlu_err ON COMMIT DROP AS
SELECT e.* FROM public.student_error_log e JOIN _tlu_lesson l ON l.transcript_id = e.source_id
 WHERE e.source = 'transcript' AND e.created_by IS NULL;
CREATE TEMP TABLE _tlu_card ON COMMIT DROP AS
SELECT s.* FROM public.srs_cards s JOIN _tlu_err e ON e.id = s.error_log_id;
CREATE TEMP TABLE _tlu_cefr ON COMMIT DROP AS
SELECT c.* FROM public.cefr_assessments c JOIN _tlu_lesson l ON l.transcript_id = c.source_id
 WHERE c.source = 'transcript' AND c.created_by IS NULL;
CREATE TEMP TABLE _tlu_ov ON COMMIT DROP AS
SELECT o.* FROM public.lesson_overviews o JOIN _tlu_lesson l ON l.transcript_id = o.transcript_id;

-- The data must look as this file expects, or nothing moves.
DO $shape$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM _tlu_metric WHERE is_teacher OR lower(btrim(speaker_label)) = 'unknown';
  IF n > 0 THEN
    RAISE EXCEPTION 'Refusing to run: % linked metric row(s) are the teacher or the "Unknown" bucket', n;
  END IF;
  SELECT count(*) INTO n FROM (SELECT 1 FROM _tlu_metric GROUP BY transcript_id, student_id HAVING count(*) > 1) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'Refusing to run: % lesson(s) link two speakers to one child; their errors could not be placed', n;
  END IF;
  -- A lesson with no drafts yet gets its draft from the published rows:
  -- every one of them must belong to a speaker linked to that child.
  SELECT count(*) INTO n FROM (
    SELECT e.source_id, e.student_id FROM _tlu_err e
     WHERE NOT EXISTS (SELECT 1 FROM _tlu_metric m WHERE m.transcript_id = e.source_id AND m.student_id = e.student_id)
       AND EXISTS (SELECT 1 FROM _tlu_lesson l WHERE l.transcript_id = e.source_id AND NOT l.has_drafts)
    UNION ALL
    SELECT c.source_id, c.student_id FROM _tlu_cefr c
     WHERE NOT EXISTS (SELECT 1 FROM _tlu_metric m WHERE m.transcript_id = c.source_id AND m.student_id = c.student_id)
       AND EXISTS (SELECT 1 FROM _tlu_lesson l WHERE l.transcript_id = c.source_id AND NOT l.has_drafts)) x;
  IF n > 0 THEN
    RAISE EXCEPTION 'Refusing to run: % published error / CEFR row(s) belong to no linked speaker of their lesson', n;
  END IF;
END
$shape$;

-- ---------------------------------------------------------------- 3
-- Copy first.
INSERT INTO public.transcript_legacy_holds AS h (transcript_id, class_id, held_rows, counts, history)
SELECT l.transcript_id, l.class_id,
       COALESCE((SELECT jsonb_agg(x) FROM (
         SELECT jsonb_build_object('table', 'transcript_speaker_metrics', 'row', to_jsonb(m) - 'has_drafts') AS x
           FROM _tlu_metric m WHERE m.transcript_id = l.transcript_id
         UNION ALL SELECT jsonb_build_object('table', 'student_error_log', 'row', to_jsonb(e)) FROM _tlu_err e WHERE e.source_id = l.transcript_id
         UNION ALL SELECT jsonb_build_object('table', 'srs_cards', 'row', to_jsonb(s)) FROM _tlu_card s JOIN _tlu_err e ON e.id = s.error_log_id WHERE e.source_id = l.transcript_id
         UNION ALL SELECT jsonb_build_object('table', 'cefr_assessments', 'row', to_jsonb(c)) FROM _tlu_cefr c WHERE c.source_id = l.transcript_id
         UNION ALL SELECT jsonb_build_object('table', 'lesson_overviews', 'row', to_jsonb(o), 'kept_published', o.edited_by_teacher)
           FROM _tlu_ov o WHERE o.transcript_id = l.transcript_id) s), '[]'::jsonb),
       jsonb_build_object(
         'metric_links', (SELECT count(*) FROM _tlu_metric m WHERE m.transcript_id = l.transcript_id),
         'errors', (SELECT count(*) FROM _tlu_err e WHERE e.source_id = l.transcript_id),
         'cards', (SELECT count(*) FROM _tlu_card s JOIN _tlu_err e ON e.id = s.error_log_id WHERE e.source_id = l.transcript_id),
         'cefr', (SELECT count(*) FROM _tlu_cefr c WHERE c.source_id = l.transcript_id),
         'overviews_removed', (SELECT count(*) FROM _tlu_ov o WHERE o.transcript_id = l.transcript_id AND NOT o.edited_by_teacher),
         'overviews_kept', (SELECT count(*) FROM _tlu_ov o WHERE o.transcript_id = l.transcript_id AND o.edited_by_teacher)),
       '[]'::jsonb
  FROM _tlu_lesson l
ON CONFLICT (transcript_id) DO UPDATE
   SET held_rows = h.held_rows || EXCLUDED.held_rows,
       counts = EXCLUDED.counts;
-- counts: what the latest paste that found something held; history: every paste.
UPDATE public.transcript_legacy_holds h
   SET history = h.history || jsonb_build_array(jsonb_build_object('at', now(), 'what', 'held', 'by', '20261117100100', 'counts', h.counts))
  FROM _tlu_lesson l WHERE l.transcript_id = h.transcript_id;

-- ---------------------------------------------------------------- 4
-- The draft the teacher approves. One suggestion per linked speaker that
-- has none: the old pipeline's child, as a suggestion only.
INSERT INTO public.transcript_speaker_suggestions
  (metric_id, transcript_id, class_id, speaker_key, suggested_student_id, confidence, basis, labels_from_model,
   draft_errors, cefr_estimate, cefr_confidence, cefr_evidence)
SELECT m.id, m.transcript_id, m.class_id, k.key, m.student_id, 'medium',
       CASE WHEN EXISTS (SELECT 1 FROM public.class_speaker_aliases a
                          WHERE a.class_id = m.class_id AND a.student_id = m.student_id AND a.created_by IS NOT NULL
                            AND (a.speaker_label = k.key OR lower(btrim(a.speaker_label)) = lower(btrim(m.speaker_label))))
            THEN 'teacher_alias' ELSE 'legacy_auto' END,
       -- Whether a model made this label is not recorded for these lessons: say it did.
       true,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('error_text', d.error_text, 'corrected_text', d.corrected_text,
                                                     'error_type', d.error_type, 'cefr_topic', d.cefr_topic) ORDER BY d.first_at)
                   FROM (SELECT e.error_text, e.corrected_text, min(e.error_type) AS error_type, min(e.cefr_topic) AS cefr_topic,
                                min(e.created_at) AS first_at
                           FROM _tlu_err e WHERE e.source_id = m.transcript_id AND e.student_id = m.student_id
                          GROUP BY e.error_text, e.corrected_text
                          ORDER BY min(e.created_at) LIMIT 10) d), '[]'::jsonb),
       COALESCE(c.level, m.cefr_estimate), c.confidence, c.evidence
  FROM _tlu_metric m
  CROSS JOIN LATERAL (SELECT btrim(regexp_replace(regexp_replace(lower(translate(m.speaker_label,
           'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
           'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydaaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')),
           '[^a-z\s]', ' ', 'g'), '\s+', ' ', 'g')) AS key) k
  LEFT JOIN LATERAL (SELECT c.level, c.confidence, c.evidence FROM _tlu_cefr c
                      WHERE c.source_id = m.transcript_id AND c.student_id = m.student_id
                      ORDER BY c.created_at DESC LIMIT 1) c ON true
 WHERE NOT m.has_drafts
ON CONFLICT (metric_id) DO NOTHING;

-- The draft overview: the published one. A teacher's own text stays the
-- teacher's (edited_by_teacher), so a re-analysis keeps it and the approval
-- republishes it. A draft a teacher already edited is never overwritten.
UPDATE public.class_transcripts t
   SET overview_draft = jsonb_build_object('summary', o.summary, 'materials', o.materials, 'homework', o.homework,
                                           'edited_by_teacher', o.edited_by_teacher, 'from_published', true)
  FROM _tlu_ov o
 WHERE o.transcript_id = t.id
   AND COALESCE(t.overview_draft->>'edited_by_teacher', '') <> 'true'
   AND (t.overview_draft IS NULL OR o.edited_by_teacher);

-- An analysed lesson is now a draft for the approval panel.
UPDATE public.class_transcripts t
   SET analysis = COALESCE(t.analysis, '{}'::jsonb) || jsonb_build_object('drafted_for_review', true, 'legacy_held_at', now())
  FROM _tlu_lesson l
 WHERE l.transcript_id = t.id AND t.status = 'analyzed'
   AND COALESCE(t.analysis->>'drafted_for_review', '') <> 'true';

-- ---------------------------------------------------------------- 5
-- Take them off families' and children's view.
UPDATE public.transcript_speaker_metrics m SET student_id = NULL
  FROM _tlu_metric x WHERE x.id = m.id;
DELETE FROM public.student_error_log e USING _tlu_err x WHERE x.id = e.id;   -- cards cascade
DELETE FROM public.srs_cards s USING _tlu_card x WHERE x.id = s.id;          -- none left; belt and braces
DELETE FROM public.cefr_assessments c USING _tlu_cefr x WHERE x.id = c.id;
DELETE FROM public.lesson_overviews o USING _tlu_ov x WHERE x.id = o.id AND NOT x.edited_by_teacher;

DO $counts$
BEGIN
  RAISE NOTICE 'transcript legacy unpublish: % lesson(s); % metric link(s) for % child(ren) unlinked; % error row(s), % card(s), % CEFR point(s), % overview(s) taken down; % teacher-edited overview(s) kept; % suggestion row(s) drafted',
    (SELECT count(*) FROM _tlu_lesson), (SELECT count(*) FROM _tlu_metric), (SELECT count(DISTINCT student_id) FROM _tlu_metric),
    (SELECT count(*) FROM _tlu_err), (SELECT count(*) FROM _tlu_card), (SELECT count(*) FROM _tlu_cefr),
    (SELECT count(*) FROM _tlu_ov WHERE NOT edited_by_teacher), (SELECT count(*) FROM _tlu_ov WHERE edited_by_teacher),
    (SELECT count(*) FROM public.transcript_speaker_suggestions s JOIN _tlu_metric m ON m.id = s.metric_id WHERE s.basis IN ('legacy_auto', 'teacher_alias'));
END
$counts$;

SELECT (SELECT count(*) FROM _tlu_lesson) AS lessons,
       (SELECT count(*) FROM _tlu_metric) AS metric_links_unlinked,
       (SELECT count(DISTINCT student_id) FROM _tlu_metric) AS children,
       (SELECT count(*) FROM _tlu_err) AS error_rows_removed,
       (SELECT count(*) FROM _tlu_card) AS cards_removed,
       (SELECT count(*) FROM _tlu_cefr) AS cefr_removed,
       (SELECT count(*) FROM _tlu_ov WHERE NOT edited_by_teacher) AS overviews_removed,
       (SELECT count(*) FROM _tlu_ov WHERE edited_by_teacher) AS overviews_kept,
       (SELECT count(*) FROM public.transcript_legacy_holds) AS lessons_held_in_total;

COMMIT;

-- Everything held so far, by table (also after a second paste).
SELECT x->>'table' AS held_table, count(*) AS held_rows, count(DISTINCT h.transcript_id) AS lessons
  FROM public.transcript_legacy_holds h, jsonb_array_elements(h.held_rows) x
 GROUP BY 1 ORDER BY 1;
