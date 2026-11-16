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
--   No existing row is changed. Rows the old pipeline published stay as they
--   are; approving such a transcript is refused unless the teacher says to
--   replace them (p_replace_legacy), and then they are copied into the
--   approval row before they go.
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
    CHECK (basis IN ('teacher_alias', 'exact_name', 'name_contains', 'name_tokens', 'none')),
  -- Low confidence stays "unknown": it names no child at all.
  CONSTRAINT transcript_speaker_suggestions_low_is_unknown CHECK (confidence <> 'low' OR suggested_student_id IS NULL),
  CONSTRAINT transcript_speaker_suggestions_errors_array CHECK (jsonb_typeof(draft_errors) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_tss_transcript ON public.transcript_speaker_suggestions(transcript_id);

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
  assignments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  replaced_legacy jsonb NOT NULL DEFAULT '[]'::jsonb,
  history         jsonb NOT NULL DEFAULT '[]'::jsonb
);

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
-- the caller, who may not be able to read the approvals table.)
CREATE OR REPLACE FUNCTION public.transcript_approval_active(p_transcript uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.transcript_approvals a
                  WHERE a.transcript_id = p_transcript AND a.withdrawn_at IS NULL);
$$;

-- Only the approval links a metric row to a child. Runs as the caller (NOT
-- a definer) so current_user is the API role of a direct write, and the
-- owner inside approve_transcript_analysis / a cascade.
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
  IF TG_OP = 'INSERT' AND NEW.student_id IS NOT NULL THEN
    RAISE EXCEPTION 'A speaker is linked to a child only when a teacher approves the lesson (approve_transcript_analysis).'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.student_id IS NOT NULL AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'A speaker is linked to a child only when a teacher approves the lesson (approve_transcript_analysis).'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
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
--                   "errors": [{ error_text, corrected_text, error_type, cefr_topic }] }]
--   A speaker left out, or sent with student_id null, stays unknown. Errors
--   and the level are published only as sent: nothing is taken from the
--   suggestion row except the CEFR estimate's confidence and evidence text.
-- p_overview: { summary, materials: [{ name, pages }], homework } - null uses
--   the draft (overview_draft, else the analysis).
-- p_replace_legacy: the old pipeline already published rows for this lesson;
--   true replaces them (copied into replaced_legacy first), else refused.
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
  v_seen    uuid[] := '{}';
  v_errs    uuid[] := '{}';
  v_cefrs   uuid[] := '{}';
  v_kids    uuid[] := '{}';
  v_chosen  jsonb := '[]'::jsonb;
  v_legacy  jsonb := '[]'::jsonb;
  v_prev_e  uuid[] := '{}';
  v_prev_c  uuid[] := '{}';
  v_unknown integer := 0;
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
  ) s;
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
  -- with their error rows: srs_cards.error_log_id ON DELETE CASCADE).
  DELETE FROM public.student_error_log e
   WHERE e.id = ANY (v_prev_e) AND e.source = 'transcript' AND e.source_id = tr.id;
  DELETE FROM public.cefr_assessments c
   WHERE c.id = ANY (v_prev_c) AND c.source = 'transcript' AND c.source_id = tr.id;
  UPDATE public.transcript_speaker_metrics SET student_id = NULL
   WHERE transcript_id = tr.id AND student_id IS NOT NULL;

  -- The teacher's choices, speaker by speaker.
  FOR el IN SELECT * FROM jsonb_array_elements(p_assignments) LOOP
    IF jsonb_typeof(el) <> 'object' OR NULLIF(el->>'metric_id', '') IS NULL THEN
      RAISE EXCEPTION 'each assignment needs a metric_id';
    END IF;
    SELECT * INTO m FROM public.transcript_speaker_metrics
     WHERE id = (el->>'metric_id')::uuid AND transcript_id = tr.id;
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
    IF NOT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = v_sid AND e.class_id = tr.class_id) THEN
      RAISE EXCEPTION 'that child is not in this class';
    END IF;

    v_level := NULLIF(btrim(el->>'cefr_level'), '');
    v_score := CASE v_level
      WHEN 'Pre-A1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A1+' THEN 1.5 WHEN 'A2' THEN 2 WHEN 'A2+' THEN 2.5
      WHEN 'B1' THEN 3 WHEN 'B1+' THEN 3.5 WHEN 'B2' THEN 4 WHEN 'B2+' THEN 4.5 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END;
    IF v_level IS NOT NULL AND v_score IS NULL THEN
      RAISE EXCEPTION 'unknown CEFR level %', v_level;
    END IF;

    UPDATE public.transcript_speaker_metrics
       SET student_id = v_sid,
           cefr_estimate = v_level
     WHERE id = m.id;

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
    -- only ever read back as a suggestion.
    IF sg.metric_id IS NOT NULL AND COALESCE(sg.speaker_key, '') NOT IN ('', 'unknown', 'teacher') THEN
      INSERT INTO public.class_speaker_aliases (class_id, speaker_label, student_id, created_by)
      VALUES (tr.class_id, sg.speaker_key, v_sid, v_uid)
      ON CONFLICT (class_id, speaker_label) DO UPDATE SET student_id = EXCLUDED.student_id, created_by = EXCLUDED.created_by;
    END IF;

    IF NOT (v_sid = ANY (v_kids)) THEN v_kids := v_kids || v_sid; END IF;
    v_chosen := v_chosen || jsonb_build_object('metric_id', m.id, 'speaker_label', m.speaker_label, 'student_id', v_sid,
      'cefr_level', v_level, 'errors', COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(el->'errors') = 'array' THEN el->'errors' END), 0),
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
     error_log_ids, cefr_ids, overview_id, assignments, replaced_legacy, history)
  VALUES
    (tr.id, tr.class_id, v_uid, now(), tr.analyzed_at, NULL, NULL, v_errs, v_cefrs, v_ovid, v_chosen, v_legacy,
     jsonb_build_array(jsonb_build_object('at', now(), 'by', v_uid, 'what', 'approved')))
  ON CONFLICT (transcript_id) DO UPDATE
     SET class_id = EXCLUDED.class_id, approved_by = EXCLUDED.approved_by, approved_at = EXCLUDED.approved_at,
         analyzed_at = EXCLUDED.analyzed_at, withdrawn_by = NULL, withdrawn_at = NULL,
         error_log_ids = EXCLUDED.error_log_ids, cefr_ids = EXCLUDED.cefr_ids, overview_id = EXCLUDED.overview_id,
         assignments = EXCLUDED.assignments,
         replaced_legacy = a.replaced_legacy || EXCLUDED.replaced_legacy,
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
-- Withdraw: take back exactly what the approval published.
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

  UPDATE public.transcript_approvals
     SET withdrawn_by = v_uid, withdrawn_at = now(),
         error_log_ids = '{}', cefr_ids = '{}', overview_id = NULL,
         history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', v_uid, 'what', 'withdrawn',
                     'errors', v_e, 'cefr', v_c, 'overview', v_o))
   WHERE transcript_id = tr.id;

  RETURN jsonb_build_object('errors_removed', v_e, 'cefr_removed', v_c, 'overview_removed', v_o);
END;
$$;

-- ---------------------------------------------------------------- 7
-- Execute rights.
REVOKE ALL ON FUNCTION public.transcript_approval_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transcript_metrics_link_guard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_transcript_analysis(uuid, jsonb, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.withdraw_transcript_approval(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transcript_approval_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_transcript_analysis(uuid, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_transcript_approval(uuid) TO authenticated;

COMMIT;
