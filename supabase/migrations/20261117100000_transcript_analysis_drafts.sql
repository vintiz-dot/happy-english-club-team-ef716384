-- Transcript analysis: drafts for the class's staff, published only when a
-- teacher approves (D-26, docs/evidence/FIX-analyze-transcript.md).
--
-- THE DEFECT. analyze-transcript (service role) matched each speaker to a
-- child by name - labels the model itself produced, for a room recording -
-- and at once wrote, for every child it matched:
--   transcript_speaker_metrics.student_id   the child's own login reads it
--   student_error_log (+ srs_cards)         the child reads it
--   cefr_assessments                        the family and the child read it
--   lesson_overviews                        every enrolled child and family
-- with no teacher in between, and a CEFR level from the model's own answer.
--
-- WHAT THIS ADDS
--   transcript_speaker_suggestions  per speaker: the child the analysis
--                                   SUGGESTS, with low / medium / high
--                                   confidence (low carries no child - it
--                                   stays "unknown"), and the drafted errors
--                                   and CEFR estimate. Staff of the class
--                                   read it; nobody writes it but the
--                                   function (service role).
--   class_transcripts.overview_draft  the draft lesson overview. The table
--                                   is admin + teacher of the class only.
--   transcript_approvals            one row per transcript: who approved,
--                                   what they chose per speaker, and the id
--                                   of every row the approval published.
--   approve_transcript_analysis     the only way a line, an error or a level
--                                   lands on a child: the TEACHER's choices,
--                                   never the suggestion; one transaction;
--                                   re-approving replaces what it wrote.
--   withdraw_transcript_approval    removes exactly what the approval wrote.
--   transcript_metrics_link_guard   no API role (anon, authenticated,
--                                   service_role) may link a metric row to a
--                                   child, or add / remove the rows of a
--                                   transcript whose approval stands.
--
-- WHAT IT DOES NOT DO
--   No existing row is changed by THIS file. What the old pipeline already
--   published is taken back by the next file,
--   20261117100100_transcript_legacy_unpublish.sql (pasted after the new
--   analyze-transcript is deployed). Approving a lesson that still holds
--   such rows is refused unless the teacher says to replace them
--   (p_replace_legacy), and then they are copied into the approval row
--   before they go.
--   No policy on the published tables is added, dropped or loosened.
--   No family or student policy on either new table.
--
-- Safe to paste twice.

BEGIN;

-- ---------------------------------------------------------------- 0
-- Preflight. Fail closed: refuse to install over a database this file does
-- not know, because a policy it has not seen could open the drafts.
DO $preflight$
DECLARE
  t text;
  v_left text;
BEGIN
  IF to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: is_teacher_of_class / has_role missing';
  END IF;
  FOREACH t IN ARRAY ARRAY['class_transcripts', 'transcript_speaker_metrics', 'student_error_log', 'srs_cards',
                           'cefr_assessments', 'lesson_overviews', 'class_speaker_aliases', 'enrollments'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Refusing to install: public.% is missing or has row level security off', t;
    END IF;
  END LOOP;
  -- The drafts live in transcript_speaker_metrics (rows with no child) and
  -- class_transcripts (overview_draft). Every policy on those two must be
  -- one of these; any other could hand a draft to a family.
  SELECT string_agg(tablename || '.' || quote_ident(policyname), ', ' ORDER BY tablename, policyname) INTO v_left
    FROM pg_policies
   WHERE schemaname = 'public'
     AND ((tablename = 'transcript_speaker_metrics'
           AND policyname NOT IN ('admins_all_tsm', 'teachers_read_class_tsm', 'students_read_own_tsm', 'teachers_update_class_tsm'))
       OR (tablename = 'class_transcripts'
           AND policyname NOT IN ('admins_all_transcripts', 'teachers_manage_class_transcripts')));
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to install: policies this file does not know are on the draft tables: %', v_left;
  END IF;
  -- students_read_own_tsm must still be keyed on the row's own child: a NULL
  -- student_id (every draft row) then matches nobody.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transcript_speaker_metrics'
                AND policyname = 'students_read_own_tsm'
                AND (cmd <> 'SELECT' OR qual IS NULL OR position('student_id' in qual) = 0)) THEN
    RAISE EXCEPTION 'Refusing to install: students_read_own_tsm is not the child''s-own-row read this file expects';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------- 1
-- The draft overview.
ALTER TABLE public.class_transcripts ADD COLUMN IF NOT EXISTS overview_draft jsonb;

-- ---------------------------------------------------------------- 2
-- Suggestions: who the analysis thinks a speaker is. Never a decision.
CREATE TABLE IF NOT EXISTS public.transcript_speaker_suggestions (
  metric_id            uuid PRIMARY KEY REFERENCES public.transcript_speaker_metrics(id) ON DELETE CASCADE,
  transcript_id        uuid NOT NULL REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id             uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  speaker_key          text NOT NULL,
  suggested_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  confidence           text NOT NULL,
  basis                text NOT NULL,
  labels_from_model    boolean NOT NULL DEFAULT false,
  draft_errors         jsonb NOT NULL DEFAULT '[]'::jsonb,
  cefr_estimate        text,
  cefr_confidence      numeric,
  cefr_evidence        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transcript_speaker_suggestions_confidence_check CHECK (confidence IN ('low', 'medium', 'high')),
  CONSTRAINT transcript_speaker_suggestions_basis_check
    -- legacy_auto: the old pipeline's own fuzzy match, kept as a suggestion
    -- when 20261117100100 took its link back (never pre-selected).
    CHECK (basis IN ('teacher_alias', 'exact_name', 'name_contains', 'name_tokens', 'none', 'legacy_auto')),
  -- Low confidence stays "unknown": it names no child at all.
  CONSTRAINT transcript_speaker_suggestions_low_is_unknown CHECK (confidence <> 'low' OR suggested_student_id IS NULL),
  CONSTRAINT transcript_speaker_suggestions_errors_array CHECK (jsonb_typeof(draft_errors) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_tss_transcript ON public.transcript_speaker_suggestions(transcript_id);
-- The basis list again, so a paste over an earlier copy of this file gets it too.
ALTER TABLE public.transcript_speaker_suggestions DROP CONSTRAINT IF EXISTS transcript_speaker_suggestions_basis_check;
ALTER TABLE public.transcript_speaker_suggestions ADD CONSTRAINT transcript_speaker_suggestions_basis_check
  CHECK (basis IN ('teacher_alias', 'exact_name', 'name_contains', 'name_tokens', 'none', 'legacy_auto'));

ALTER TABLE public.transcript_speaker_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transcript_speaker_suggestions_staff_read ON public.transcript_speaker_suggestions;
CREATE POLICY transcript_speaker_suggestions_staff_read ON public.transcript_speaker_suggestions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL
         AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.is_teacher_of_class(auth.uid(), class_id)));

-- ---------------------------------------------------------------- 3
-- Approvals: the record of what a teacher published, and so the list of
-- exactly what a re-approval or a withdrawal may remove.
CREATE TABLE IF NOT EXISTS public.transcript_approvals (
  transcript_id   uuid PRIMARY KEY REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
  class_id        uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  approved_by     uuid NOT NULL,
  approved_at     timestamptz NOT NULL DEFAULT now(),
  analyzed_at     timestamptz,
  withdrawn_by    uuid,
  withdrawn_at    timestamptz,
  error_log_ids   uuid[] NOT NULL DEFAULT '{}',
  cefr_ids        uuid[] NOT NULL DEFAULT '{}',
  overview_id     uuid,
  -- Per speaker: the teacher's choice, the errors KEPT (as published), the
  -- text published on the metric row and what it said before.
  assignments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  replaced_legacy jsonb NOT NULL DEFAULT '[]'::jsonb,
  history         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Every class_speaker_aliases write this approval made, with the value it
  -- replaced, so a withdrawal or a re-approval can put it back.
  alias_writes    jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE public.transcript_approvals ADD COLUMN IF NOT EXISTS alias_writes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.transcript_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transcript_approvals_staff_read ON public.transcript_approvals;
CREATE POLICY transcript_approvals_staff_read ON public.transcript_approvals
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL
         AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.is_teacher_of_class(auth.uid(), class_id)));

-- 20260712023825 revoked the defaults on public: say it explicitly. RLS
-- (no write policy) still refuses every write from a person.
REVOKE ALL ON public.transcript_speaker_suggestions FROM PUBLIC, anon;
REVOKE ALL ON public.transcript_approvals FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_speaker_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_approvals TO authenticated;
GRANT ALL ON public.transcript_speaker_suggestions TO service_role;
GRANT ALL ON public.transcript_approvals TO service_role;

-- ---------------------------------------------------------------- 4
-- Is this transcript's approval standing? (Definer: the guard below runs as
-- the caller, who may not be able to read the approvals table.) It answers
-- only the class's staff, an admin, or a caller with no user session (the
-- service role, the owner); anyone else gets false for every id, so it is
-- no oracle for a family or a role-less login (review N-6).
CREATE OR REPLACE FUNCTION public.transcript_approval_active(p_transcript uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.transcript_approvals a
                  WHERE a.transcript_id = p_transcript AND a.withdrawn_at IS NULL
                    AND (auth.uid() IS NULL
                         OR COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
                         OR COALESCE(public.is_teacher_of_class(auth.uid(), a.class_id), false)));
$$;

-- Only the approval links a metric row to a child. Runs as the caller (NOT
-- a definer) so current_user is the API role of a direct write, and the
-- owner inside approve_transcript_analysis / a cascade / a migration.
-- For an API role (anon, authenticated, service_role) it refuses:
--   - linking a row to a child (INSERT with a child, UPDATE to a child);
--   - moving a row to another lesson or class (review N-1): the approval
--     takes rows only from its own lesson, and a moved row would carry its
--     text, or its child, somewhere nobody approved;
--   - deleting a row that is linked to a child (review N-5): a re-analysis
--     must not silently take down what an approval published;
--   - adding or removing rows of a lesson whose approval stands.
-- Clearing a link stays allowed.
CREATE OR REPLACE FUNCTION public.transcript_metrics_link_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tr uuid;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated', 'service_role') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  v_tr := CASE WHEN TG_OP = 'DELETE' THEN OLD.transcript_id ELSE NEW.transcript_id END;
  IF TG_OP IN ('INSERT', 'DELETE') AND public.transcript_approval_active(v_tr) THEN
    RAISE EXCEPTION 'This lesson''s analysis is approved and shared. Withdraw the approval before analysing it again.'
      USING ERRCODE = 'P0001', HINT = 'TRANSCRIPT_APPROVED';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.student_id IS NOT NULL THEN
    RAISE EXCEPTION 'This speaker is linked to a child: only the lesson''s approval (or its withdrawal) takes it back.'
      USING ERRCODE = '42501', HINT = 'TRANSCRIPT_LINKED';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.student_id IS NOT NULL THEN
    RAISE EXCEPTION 'A speaker is linked to a child only when a teacher approves the lesson (approve_transcript_analysis).'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.student_id IS NOT NULL AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'A speaker is linked to a child only when a teacher approves the lesson (approve_transcript_analysis).'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.transcript_id IS DISTINCT FROM OLD.transcript_id OR NEW.class_id IS DISTINCT FROM OLD.class_id) THEN
    RAISE EXCEPTION 'A speaker row stays with its own lesson and class.'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Put back the class_speaker_aliases an approval wrote (review M-3), newest
-- first: an alias that still holds the approval's child goes back to the
-- child it held before, or is removed if the approval created it. One that
-- somebody changed since is left alone. Internal: called by the two
-- definers below (as the owner); nobody else may execute it.
CREATE OR REPLACE FUNCTION public._transcript_alias_revert(p_class uuid, p_writes jsonb)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  w   jsonb;
  n   integer := 0;
  k   integer;
BEGIN
  IF p_writes IS NULL OR jsonb_typeof(p_writes) <> 'array' THEN RETURN 0; END IF;
  FOR w IN SELECT x FROM jsonb_array_elements(p_writes) WITH ORDINALITY AS a(x, i) ORDER BY i DESC LOOP
    IF COALESCE((w->>'existed')::boolean, false) AND NULLIF(w->>'before', '') IS NOT NULL THEN
      UPDATE public.class_speaker_aliases
         SET student_id = (w->>'before')::uuid
       WHERE class_id = p_class AND speaker_label = w->>'speaker_label' AND student_id = (w->>'after')::uuid;
    ELSE
      DELETE FROM public.class_speaker_aliases
       WHERE class_id = p_class AND speaker_label = w->>'speaker_label' AND student_id = (w->>'after')::uuid;
    END IF;
    GET DIAGNOSTICS k = ROW_COUNT;
    n := n + k;
  END LOOP;
  RETURN n;
END;
$$;

DROP TRIGGER IF EXISTS transcript_metrics_link_guard ON public.transcript_speaker_metrics;
CREATE TRIGGER transcript_metrics_link_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.transcript_speaker_metrics
  FOR EACH ROW EXECUTE FUNCTION public.transcript_metrics_link_guard();

-- ---------------------------------------------------------------- 5
-- Approve: publish the teacher's choices.
--
-- p_assignments: [{ "metric_id": uuid, "student_id": uuid | null,
--                   "cefr_level": text | null,
--                   "errors": [{ error_text, corrected_text, error_type, cefr_topic }],
--                   "text": { contribution, teacher_feedback, recommendation,
--                             highlights: [text] } }]
--   A speaker left out, or sent with student_id null, stays unknown. Errors,
--   the level and the speaker's text are published only as sent: nothing is
--   taken from the suggestion row except the CEFR estimate's confidence and
--   evidence text.
--   "text" is REQUIRED for a speaker given a child (review M-4). It is what
--   the child's lesson page shows from the metric row ("How you did", "Your
--   teacher says", "Try next") and what the profile summary reads; the
--   screen shows it to the teacher to keep, edit or drop. A field sent empty
--   is published empty. A request without it is refused, so nothing the
--   teacher was not shown is published.
--   The child must be enrolled in the class on the lesson's date (review
--   N-3); the speaker must be a child of THIS lesson and class (N-2), not
--   the teacher and not the mixed "Unknown" bucket (N-4).
-- p_overview: { summary, materials: [{ name, pages }], homework } - null uses
--   the draft (overview_draft, else the analysis).
-- p_replace_legacy: the old pipeline already published rows for this lesson;
--   true replaces them (copied into replaced_legacy first), else refused.
--   A published overview a teacher edited by hand does not count while the
--   draft is the teacher's text too (20261117100100 seeds it so, review
--   N-9): the approval republishes that text. It is still copied.
CREATE OR REPLACE FUNCTION public.approve_transcript_analysis(
  p_transcript     uuid,
  p_assignments    jsonb,
  p_overview       jsonb DEFAULT NULL,
  p_replace_legacy boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  tr        record;
  ap        record;
  m         record;
  sg        record;
  el        jsonb;
  er        jsonb;
  v_ov      jsonb;
  v_sid     uuid;
  v_level   text;
  v_score   numeric;
  v_type    text;
  v_err     uuid;
  v_cefr    uuid;
  v_ovid    uuid;
  v_text    jsonb;
  v_hl      jsonb;
  v_contrib text;
  v_fb      text;
  v_rec     text;
  v_kept    jsonb;
  v_before  uuid;
  v_existed boolean;
  v_seen    uuid[] := '{}';
  v_errs    uuid[] := '{}';
  v_cefrs   uuid[] := '{}';
  v_kids    uuid[] := '{}';
  v_chosen  jsonb := '[]'::jsonb;
  v_legacy  jsonb := '[]'::jsonb;
  v_kept_ov jsonb := '[]'::jsonb;
  v_aliases jsonb := '[]'::jsonb;
  v_prev_e  uuid[] := '{}';
  v_prev_c  uuid[] := '{}';
  v_unknown integer := 0;
  v_teacher_draft boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in as a teacher of this class to approve a lesson' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO tr FROM public.class_transcripts WHERE id = p_transcript FOR UPDATE;
  IF tr.id IS NULL THEN
    RAISE EXCEPTION 'transcript % does not exist', p_transcript;
  END IF;
  IF NOT (COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false)
          OR COALESCE(public.is_teacher_of_class(v_uid, tr.class_id), false)) THEN
    RAISE EXCEPTION 'Only a teacher of this class can approve this lesson' USING ERRCODE = '42501';
  END IF;
  IF tr.status IS DISTINCT FROM 'analyzed' THEN
    RAISE EXCEPTION 'This lesson has not finished analysing (status %)', tr.status;
  END IF;
  IF p_assignments IS NULL THEN p_assignments := '[]'::jsonb; END IF;
  IF jsonb_typeof(p_assignments) <> 'array' THEN
    RAISE EXCEPTION 'assignments must be a list';
  END IF;
  v_teacher_draft := COALESCE(tr.overview_draft->>'edited_by_teacher', '') = 'true';

  SELECT * INTO ap FROM public.transcript_approvals WHERE transcript_id = tr.id FOR UPDATE;
  IF ap.transcript_id IS NOT NULL THEN
    v_prev_e := ap.error_log_ids;
    v_prev_c := ap.cefr_ids;
  END IF;

  -- What the old pipeline published for this lesson, that no approval wrote.
  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_legacy FROM (
    SELECT jsonb_build_object('table', 'student_error_log', 'row', to_jsonb(e)) AS x
      FROM public.student_error_log e
     WHERE e.source = 'transcript' AND e.source_id = tr.id AND NOT (e.id = ANY (v_prev_e))
    UNION ALL
    SELECT jsonb_build_object('table', 'cefr_assessments', 'row', to_jsonb(c))
      FROM public.cefr_assessments c
     WHERE c.source = 'transcript' AND c.source_id = tr.id AND NOT (c.id = ANY (v_prev_c))
    UNION ALL
    SELECT jsonb_build_object('table', 'transcript_speaker_metrics', 'row',
                              jsonb_build_object('id', t.id, 'speaker_label', t.speaker_label, 'student_id', t.student_id))
      FROM public.transcript_speaker_metrics t
     WHERE t.transcript_id = tr.id AND t.student_id IS NOT NULL
       AND NOT public.transcript_approval_active(tr.id)
    UNION ALL
    SELECT jsonb_build_object('table', 'lesson_overviews', 'row', to_jsonb(o))
      FROM public.lesson_overviews o
     WHERE o.transcript_id = tr.id AND (ap.overview_id IS NULL OR o.id <> ap.overview_id OR ap.withdrawn_at IS NOT NULL)
       AND NOT (o.edited_by_teacher AND v_teacher_draft)
  ) s;
  -- A teacher-edited overview republished from the teacher's own draft: kept on record, not a refusal.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('table', 'lesson_overviews', 'row', to_jsonb(o), 'teacher_edited', true)), '[]'::jsonb)
    INTO v_kept_ov
    FROM public.lesson_overviews o
   WHERE o.transcript_id = tr.id AND (ap.overview_id IS NULL OR o.id <> ap.overview_id OR ap.withdrawn_at IS NOT NULL)
     AND o.edited_by_teacher AND v_teacher_draft;
  IF jsonb_array_length(v_legacy) > 0 AND NOT COALESCE(p_replace_legacy, false) THEN
    RAISE EXCEPTION 'This lesson was shared by the earlier automatic analysis (% item(s)). Approve again choosing to replace them.',
      jsonb_array_length(v_legacy)
      USING ERRCODE = 'P0001', HINT = 'TRANSCRIPT_LEGACY_ROWS';
  END IF;
  IF jsonb_array_length(v_legacy) > 0 THEN
    DELETE FROM public.student_error_log e
     WHERE e.source = 'transcript' AND e.source_id = tr.id AND NOT (e.id = ANY (v_prev_e));
    DELETE FROM public.cefr_assessments c
     WHERE c.source = 'transcript' AND c.source_id = tr.id AND NOT (c.id = ANY (v_prev_c));
  END IF;

  -- Replace what an earlier approval of this lesson wrote (SRS cards go
  -- with their error rows: srs_cards.error_log_id ON DELETE CASCADE), and
  -- put back the speaker aliases it wrote before writing this one's.
  DELETE FROM public.student_error_log e
   WHERE e.id = ANY (v_prev_e) AND e.source = 'transcript' AND e.source_id = tr.id;
  DELETE FROM public.cefr_assessments c
   WHERE c.id = ANY (v_prev_c) AND c.source = 'transcript' AND c.source_id = tr.id;
  IF ap.transcript_id IS NOT NULL AND ap.withdrawn_at IS NULL THEN
    PERFORM public._transcript_alias_revert(tr.class_id, ap.alias_writes);
  END IF;
  UPDATE public.transcript_speaker_metrics SET student_id = NULL
   WHERE transcript_id = tr.id AND student_id IS NOT NULL;

  -- The teacher's choices, speaker by speaker.
  FOR el IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    IF jsonb_typeof(el) <> 'object' OR NULLIF(el->>'metric_id', '') IS NULL THEN
      RAISE EXCEPTION 'each assignment needs a metric_id';
    END IF;
    SELECT * INTO m FROM public.transcript_speaker_metrics
     WHERE id = (el->>'metric_id')::uuid AND transcript_id = tr.id AND class_id = tr.class_id;
    IF m.id IS NULL THEN
      RAISE EXCEPTION 'speaker % is not part of this lesson', el->>'metric_id';
    END IF;
    IF m.id = ANY (v_seen) THEN
      RAISE EXCEPTION 'speaker % is listed twice', m.id;
    END IF;
    v_seen := v_seen || m.id;
    SELECT * INTO sg FROM public.transcript_speaker_suggestions WHERE metric_id = m.id;

    v_sid := NULLIF(el->>'student_id', '')::uuid;
    IF v_sid IS NULL THEN
      v_unknown := v_unknown + 1;
      v_chosen := v_chosen || jsonb_build_object('metric_id', m.id, 'speaker_label', m.speaker_label, 'student_id', NULL,
        'suggested_student_id', sg.suggested_student_id, 'confidence', sg.confidence);
      CONTINUE;
    END IF;
    IF m.is_teacher THEN
      RAISE EXCEPTION 'speaker "%" is the teacher, not a child', m.speaker_label;
    END IF;
    IF lower(btrim(m.speaker_label)) = 'unknown' THEN
      RAISE EXCEPTION 'the "Unknown" speaker mixes several voices and cannot be given to one child';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = v_sid AND e.class_id = tr.class_id
                      AND (e.start_date IS NULL OR e.start_date <= tr.transcript_date)
                      AND (e.end_date IS NULL OR e.end_date >= tr.transcript_date)) THEN
      RAISE EXCEPTION 'that child was not in this class on the lesson''s date';
    END IF;
    v_text := el->'text';
    IF v_text IS NULL OR jsonb_typeof(v_text) <> 'object' THEN
      RAISE EXCEPTION 'speaker "%": send the text the child''s page will show (contribution, teacher_feedback, recommendation, highlights)', m.speaker_label;
    END IF;

    v_level := NULLIF(btrim(el->>'cefr_level'), '');
    v_score := CASE v_level
      WHEN 'Pre-A1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A1+' THEN 1.5 WHEN 'A2' THEN 2 WHEN 'A2+' THEN 2.5
      WHEN 'B1' THEN 3 WHEN 'B1+' THEN 3.5 WHEN 'B2' THEN 4 WHEN 'B2+' THEN 4.5 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END;
    IF v_level IS NOT NULL AND v_score IS NULL THEN
      RAISE EXCEPTION 'unknown CEFR level %', v_level;
    END IF;

    v_contrib := left(NULLIF(btrim(v_text->>'contribution'), ''), 600);
    v_fb      := left(NULLIF(btrim(v_text->>'teacher_feedback'), ''), 800);
    v_rec     := left(NULLIF(btrim(v_text->>'recommendation'), ''), 400);
    v_hl := CASE WHEN jsonb_typeof(v_text->'highlights') = 'array' THEN
              (SELECT jsonb_agg(to_jsonb(left(btrim(x #>> '{}'), 300)) ORDER BY i)
                 FROM jsonb_array_elements(v_text->'highlights') WITH ORDINALITY AS a(x, i)
                WHERE i <= 5 AND jsonb_typeof(x) = 'string' AND btrim(x #>> '{}') <> '') END;

    UPDATE public.transcript_speaker_metrics
       SET student_id       = v_sid,
           cefr_estimate    = v_level,
           contribution     = v_contrib,
           teacher_feedback = v_fb,
           recommendation   = v_rec,
           highlights       = v_hl,
           edited_by_teacher = edited_by_teacher
             OR v_contrib IS DISTINCT FROM m.contribution OR v_fb IS DISTINCT FROM m.teacher_feedback
             OR v_rec IS DISTINCT FROM m.recommendation
     WHERE id = m.id;

    v_kept := '[]'::jsonb;
    IF el ? 'errors' AND jsonb_typeof(el->'errors') = 'array' THEN
      FOR er IN SELECT * FROM jsonb_array_elements(el->'errors') LOOP
        CONTINUE WHEN jsonb_typeof(er) <> 'object' OR COALESCE(btrim(er->>'error_text'), '') = '';
        v_type := CASE WHEN er->>'error_type' IN ('grammar', 'vocabulary', 'pronunciation', 'spelling', 'syntax', 'other')
                       THEN er->>'error_type' ELSE 'grammar' END;
        INSERT INTO public.student_error_log
          (student_id, class_id, source, source_id, error_text, corrected_text, error_type, cefr_topic, notes, created_by)
        VALUES
          (v_sid, tr.class_id, 'transcript', tr.id, left(er->>'error_text', 500),
           left(NULLIF(btrim(er->>'corrected_text'), ''), 500), v_type, left(NULLIF(btrim(er->>'cefr_topic'), ''), 80),
           left('Lesson: ' || COALESCE(tr.title, to_char(tr.transcript_date, 'YYYY-MM-DD')), 200), v_uid)
        RETURNING id INTO v_err;
        v_errs := v_errs || v_err;
        -- What was kept, as the draft wrote it, so "Approve again" starts from it (review M-2).
        v_kept := v_kept || jsonb_build_array(jsonb_build_object(
          'error_text', er->>'error_text', 'corrected_text', er->>'corrected_text',
          'error_type', er->>'error_type', 'cefr_topic', er->>'cefr_topic'));
        IF NULLIF(btrim(er->>'corrected_text'), '') IS NOT NULL THEN
          INSERT INTO public.srs_cards (student_id, source, error_log_id, front, back, hint)
          VALUES (v_sid, 'error', v_err,
                  'Fix this sentence:' || chr(10) || '“' || left(er->>'error_text', 300) || '”',
                  left(er->>'corrected_text', 300),
                  CASE WHEN NULLIF(btrim(er->>'cefr_topic'), '') IS NOT NULL THEN 'Topic: ' || left(er->>'cefr_topic', 80) END)
          ON CONFLICT DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    IF v_level IS NOT NULL THEN
      INSERT INTO public.cefr_assessments
        (student_id, class_id, source, level, level_score, confidence, evidence, assessed_at, source_id, created_by)
      VALUES
        (v_sid, tr.class_id, 'transcript', v_level, v_score,
         CASE WHEN sg.cefr_estimate = v_level THEN sg.cefr_confidence END,
         left(COALESCE(CASE WHEN sg.cefr_estimate = v_level THEN sg.cefr_evidence END, 'Set by the teacher on approving the lesson'), 500),
         tr.transcript_date, tr.id, v_uid)
      RETURNING id INTO v_cefr;
      v_cefrs := v_cefrs || v_cefr;
    END IF;

    -- Remember the teacher's choice for this class's later lessons. It is
    -- only ever read back as a suggestion, and the value it replaced is
    -- recorded so a withdrawal puts it back (review M-3).
    IF sg.metric_id IS NOT NULL AND COALESCE(sg.speaker_key, '') NOT IN ('', 'unknown', 'teacher') THEN
      v_before := NULL;
      SELECT student_id INTO v_before FROM public.class_speaker_aliases
       WHERE class_id = tr.class_id AND speaker_label = sg.speaker_key;
      v_existed := FOUND;
      INSERT INTO public.class_speaker_aliases (class_id, speaker_label, student_id, created_by)
      VALUES (tr.class_id, sg.speaker_key, v_sid, v_uid)
      ON CONFLICT (class_id, speaker_label) DO UPDATE SET student_id = EXCLUDED.student_id, created_by = EXCLUDED.created_by;
      v_aliases := v_aliases || jsonb_build_array(jsonb_build_object(
        'speaker_label', sg.speaker_key, 'existed', v_existed, 'before', v_before, 'after', v_sid));
    END IF;

    IF NOT (v_sid = ANY (v_kids)) THEN v_kids := v_kids || v_sid; END IF;
    v_chosen := v_chosen || jsonb_build_object('metric_id', m.id, 'speaker_label', m.speaker_label, 'student_id', v_sid,
      'cefr_level', v_level, 'errors', jsonb_array_length(v_kept), 'kept_errors', v_kept,
      'draft_error_count', CASE WHEN jsonb_typeof(sg.draft_errors) = 'array' THEN jsonb_array_length(sg.draft_errors) END,
      'text', jsonb_build_object('contribution', v_contrib, 'teacher_feedback', v_fb, 'recommendation', v_rec, 'highlights', v_hl),
      'text_before', jsonb_build_object('contribution', m.contribution, 'teacher_feedback', m.teacher_feedback,
                                        'recommendation', m.recommendation, 'highlights', m.highlights),
      'suggested_student_id', sg.suggested_student_id, 'confidence', sg.confidence);
  END LOOP;

  -- The lesson overview families and children read.
  v_ov := COALESCE(p_overview, tr.overview_draft,
                   jsonb_build_object('summary', tr.summary, 'materials', tr.analysis->'materials', 'homework', tr.analysis->>'homework'));
  INSERT INTO public.lesson_overviews (transcript_id, class_id, lesson_date, title, summary, materials, homework, edited_by_teacher, updated_at)
  VALUES (tr.id, tr.class_id, tr.transcript_date, tr.title,
          left(NULLIF(btrim(v_ov->>'summary'), ''), 4000),
          CASE WHEN jsonb_typeof(v_ov->'materials') = 'array'
               THEN (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
                       SELECT x FROM jsonb_array_elements(v_ov->'materials') WITH ORDINALITY AS a(x, i)
                        WHERE i <= 10 ORDER BY i) s)
               ELSE '[]'::jsonb END,
          left(NULLIF(btrim(v_ov->>'homework'), ''), 1000),
          true, now())
  ON CONFLICT (transcript_id) DO UPDATE
     SET class_id = EXCLUDED.class_id, lesson_date = EXCLUDED.lesson_date, title = EXCLUDED.title,
         summary = EXCLUDED.summary, materials = EXCLUDED.materials, homework = EXCLUDED.homework,
         edited_by_teacher = true, updated_at = now()
  RETURNING id INTO v_ovid;

  INSERT INTO public.transcript_approvals AS a
    (transcript_id, class_id, approved_by, approved_at, analyzed_at, withdrawn_by, withdrawn_at,
     error_log_ids, cefr_ids, overview_id, assignments, replaced_legacy, history, alias_writes)
  VALUES
    (tr.id, tr.class_id, v_uid, now(), tr.analyzed_at, NULL, NULL, v_errs, v_cefrs, v_ovid, v_chosen, v_legacy || v_kept_ov,
     jsonb_build_array(jsonb_build_object('at', now(), 'by', v_uid, 'what', 'approved')), v_aliases)
  ON CONFLICT (transcript_id) DO UPDATE
     SET class_id = EXCLUDED.class_id, approved_by = EXCLUDED.approved_by, approved_at = EXCLUDED.approved_at,
         analyzed_at = EXCLUDED.analyzed_at, withdrawn_by = NULL, withdrawn_at = NULL,
         error_log_ids = EXCLUDED.error_log_ids, cefr_ids = EXCLUDED.cefr_ids, overview_id = EXCLUDED.overview_id,
         assignments = EXCLUDED.assignments,
         replaced_legacy = a.replaced_legacy || EXCLUDED.replaced_legacy,
         alias_writes = EXCLUDED.alias_writes,
         history = a.history || jsonb_build_array(jsonb_build_object('at', now(), 'by', v_uid, 'what', 'approved'));

  RETURN jsonb_build_object(
    'transcript_id', tr.id,
    'students', to_jsonb(v_kids),
    'unknown_speakers', v_unknown,
    'errors_published', COALESCE(array_length(v_errs, 1), 0),
    'cefr_points', COALESCE(array_length(v_cefrs, 1), 0),
    'overview_id', v_ovid,
    'replaced_legacy', jsonb_array_length(v_legacy));
END;
$$;

-- ---------------------------------------------------------------- 6
-- Withdraw: take back exactly what the approval published, and put back
-- the speaker aliases it wrote (review M-3).
CREATE OR REPLACE FUNCTION public.withdraw_transcript_approval(p_transcript uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  tr    record;
  ap    record;
  v_e   integer;
  v_c   integer;
  v_o   integer;
  v_a   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in as a teacher of this class to withdraw an approval' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO tr FROM public.class_transcripts WHERE id = p_transcript FOR UPDATE;
  IF tr.id IS NULL THEN
    RAISE EXCEPTION 'transcript % does not exist', p_transcript;
  END IF;
  IF NOT (COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false)
          OR COALESCE(public.is_teacher_of_class(v_uid, tr.class_id), false)) THEN
    RAISE EXCEPTION 'Only a teacher of this class can withdraw this approval' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO ap FROM public.transcript_approvals WHERE transcript_id = tr.id FOR UPDATE;
  IF ap.transcript_id IS NULL OR ap.withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'This lesson is not approved';
  END IF;

  DELETE FROM public.student_error_log e
   WHERE e.id = ANY (ap.error_log_ids) AND e.source = 'transcript' AND e.source_id = tr.id;
  GET DIAGNOSTICS v_e = ROW_COUNT;
  DELETE FROM public.cefr_assessments c
   WHERE c.id = ANY (ap.cefr_ids) AND c.source = 'transcript' AND c.source_id = tr.id;
  GET DIAGNOSTICS v_c = ROW_COUNT;
  DELETE FROM public.lesson_overviews o WHERE o.id = ap.overview_id AND o.transcript_id = tr.id;
  GET DIAGNOSTICS v_o = ROW_COUNT;
  UPDATE public.transcript_speaker_metrics SET student_id = NULL
   WHERE transcript_id = tr.id AND student_id IS NOT NULL;
  v_a := public._transcript_alias_revert(tr.class_id, ap.alias_writes);

  UPDATE public.transcript_approvals
     SET withdrawn_by = v_uid, withdrawn_at = now(),
         error_log_ids = '{}', cefr_ids = '{}', overview_id = NULL, alias_writes = '[]'::jsonb,
         history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', v_uid, 'what', 'withdrawn',
                     'errors', v_e, 'cefr', v_c, 'overview', v_o, 'aliases', v_a))
   WHERE transcript_id = tr.id;

  RETURN jsonb_build_object('errors_removed', v_e, 'cefr_removed', v_c, 'overview_removed', v_o, 'aliases_reverted', v_a);
END;
$$;

-- ---------------------------------------------------------------- 7
-- Execute rights.
REVOKE ALL ON FUNCTION public.transcript_approval_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transcript_metrics_link_guard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._transcript_alias_revert(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.approve_transcript_analysis(uuid, jsonb, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_transcript_approval(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transcript_approval_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_transcript_analysis(uuid, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_transcript_approval(uuid) TO authenticated;

COMMIT;
