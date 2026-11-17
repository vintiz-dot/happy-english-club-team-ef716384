-- A CEFR level a model made is a staff-only DRAFT until a teacher approves it
-- (privacy follow-ups; docs/evidence/PRIVACY-followups.md).
--
-- OWNER'S RULE: nothing derived from a lesson or an AI reaches a family
-- before a teacher approves. 20261117100000 made the transcript analysis
-- follow it; this does the same for the two other functions that wrote a
-- model's answer straight into public.cefr_assessments, which the child
-- (students_read_own_cefr) and the family (family_read_children_cefr) read:
--   generate-student-report  source 'ai_report', source_id = the student_reports row,
--                            the model's CEFR estimate for the report
--                            (the report itself stays unpublished until a
--                            teacher publishes it - student_reports.published);
--   cefr-defense             source 'level_defense_evidence' (the evidence
--                            audit's recommended level) and 'level_defense_test'
--                            (the adaptive test's estimate). Both were refused
--                            by the source CHECK until now (the function never
--                            looked at the error), so none exist.
--
-- DESIGN. The smallest change that keeps every reader right: cefr_assessments
-- keeps its meaning - everything in it is published - and model points stop
-- going there. Every reader (the growth chart, the chat assistant,
-- refresh-student-profile, generate-student-report's and cefr-defense's own
-- prompts, family and child policies) therefore sees only approved or
-- person-made points without being changed, and a reader added later cannot
-- leak a draft by forgetting a filter.
--   cefr_assessment_drafts (new)  the model's point, staff of the child only:
--                                 one SELECT policy (admin, or a teacher/TA of
--                                 the row's class or of a class the child is
--                                 in), no write policy; the functions write it
--                                 as the service role. status draft ->
--                                 approved | discarded, once.
--   approve_cefr_draft(id, level)  SECURITY DEFINER. The teacher's choice of
--                                 level (the model's by default) is published
--                                 into cefr_assessments under the draft's id,
--                                 signed by the teacher (created_by).
--   discard_cefr_draft(id)        same checks; nothing is published.
--   cefr_model_point_guard        trigger on cefr_assessments: an API role
--                                 (anon, authenticated, service_role) may not
--                                 insert a model-made point, or turn a row into
--                                 one. Only the approval (running as the owner)
--                                 writes them. This also stops the functions as
--                                 deployed today the moment this is pasted, so
--                                 the deploy order does not matter.
--   source CHECK                  widened by the two level-defense sources, so
--                                 an approved defense point can be published.
--
-- WHICH ROWS ARE MODEL-MADE (cefr_point_is_model_made):
--   source IN ('level_defense_evidence', 'level_defense_test'), or
--   source = 'ai_report' AND source_id is a student_reports row.
-- Video homework also writes source 'ai_report', but only from the teacher's
-- approval (approve_video_feedback) and with source_id = the video
-- submission, never a report: untouched. Transcript points are the
-- transcript approval's (20261117100000 / 100100): untouched. created_by
-- does not tell model from person here: generate-student-report signed its
-- point with the report's generator, cefr-defense with the caller.
--
-- EXISTING ROWS. Live on 17 Nov (read-only count): 9 'ai_report' points, every
-- one from a student_reports row (none of the 9 reports is published), 0
-- level-defense points. Each is copied whole into cefr_assessment_drafts
-- (held_row, same id) as a draft, then deleted from cefr_assessments, so the
-- child and the family stop seeing it and a teacher can approve it (the
-- approval re-publishes it under the same id). Nothing is lost.
--
-- NOT TOUCHED: any other row; the policies on cefr_assessments;
-- student_learning_profiles (an AI summary with its own cefr_estimate,
-- family-readable - see the evidence file, open question). Idempotent: a
-- second paste finds nothing to hold and changes nothing. Preflight fails
-- closed. Prints its counts.

BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------- 0 preflight
DO $preflight$
DECLARE
  t text;
  v_vals text[];
  v_n int;
  p record;
BEGIN
  IF to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL
     OR to_regprocedure('public.staff_may_write_for(uuid, uuid)') IS NULL
     OR to_regprocedure('public.can_view_student_in_class(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: is_teacher_of_class / has_role / staff_may_write_for (20261113140000) / can_view_student_in_class missing';
  END IF;
  FOREACH t IN ARRAY ARRAY['cefr_assessments', 'student_reports', 'students', 'classes'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Refusing to install: public.% is missing', t;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['cefr_assessments', 'student_reports'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Refusing to install: public.% has row level security off', t;
    END IF;
  END LOOP;

  -- The source CHECK must be the one 20260712090000 made, or this file's.
  SELECT count(*) INTO v_n FROM pg_constraint
   WHERE conrelid = 'public.cefr_assessments'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ~ '\msource\M';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'Refusing to install: expected exactly one CHECK on cefr_assessments.source, found %', v_n;
  END IF;
  SELECT array_agg(m[1] ORDER BY m[1]) INTO v_vals
    FROM pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') AS m
   WHERE c.conrelid = 'public.cefr_assessments'::regclass AND c.conname = 'cefr_assessments_source_check';
  IF v_vals IS DISTINCT FROM ARRAY['ai_report', 'exam', 'manual', 'transcript', 'vocab_analysis']
     AND v_vals IS DISTINCT FROM ARRAY['ai_report', 'exam', 'level_defense_evidence', 'level_defense_test', 'manual', 'transcript', 'vocab_analysis'] THEN
    RAISE EXCEPTION 'Refusing to install: cefr_assessments_source_check allows % - not the list this file knows', coalesce(v_vals::text, '(no such constraint)');
  END IF;

  -- On a second paste the drafts table carries only its own policy.
  IF to_regclass('public.cefr_assessment_drafts') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cefr_assessment_drafts' LOOP
      IF p.policyname <> 'cefr_assessment_drafts_staff_select' THEN
        RAISE EXCEPTION 'Refusing to install: unknown policy % on cefr_assessment_drafts', p.policyname;
      END IF;
    END LOOP;
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------- 1 the source CHECK
ALTER TABLE public.cefr_assessments DROP CONSTRAINT cefr_assessments_source_check;
ALTER TABLE public.cefr_assessments ADD CONSTRAINT cefr_assessments_source_check
  CHECK (source IN ('ai_report', 'transcript', 'manual', 'vocab_analysis', 'exam', 'level_defense_evidence', 'level_defense_test'));

-- ---------------------------------------------------------------- 2 the drafts
CREATE TABLE IF NOT EXISTS public.cefr_assessment_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),     -- also the id the approval publishes under
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('ai_report', 'level_defense_evidence', 'level_defense_test')),
  source_id uuid,                                    -- the report / claim / test
  level text NOT NULL CHECK (level IN ('Pre-A1', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
  level_score numeric NOT NULL,
  sub_scores jsonb,
  confidence numeric,
  evidence text,                                     -- the model's rationale
  assessed_at date NOT NULL DEFAULT CURRENT_DATE,
  requested_by uuid,                                 -- who ran the function (staff, or the child taking a test)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'discarded')),
  decided_by uuid,
  decided_at timestamptz,
  approved_level text CHECK (approved_level IN ('Pre-A1', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
  held_row jsonb,                                    -- the published row this draft took down (whole), if any
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cefr_assessment_drafts_decision_check CHECK (
    (status = 'draft' AND decided_by IS NULL AND decided_at IS NULL AND approved_level IS NULL)
    OR (status = 'approved' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND approved_level IS NOT NULL)
    OR (status = 'discarded' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND approved_level IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_cefr_drafts_student ON public.cefr_assessment_drafts (student_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cefr_drafts_class ON public.cefr_assessment_drafts (class_id, status, created_at DESC);

ALTER TABLE public.cefr_assessment_drafts ENABLE ROW LEVEL SECURITY;
-- 20260712023825 revoked the defaults on public: grant explicitly. RLS
-- refuses every write from a person (no write policy).
REVOKE ALL ON public.cefr_assessment_drafts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cefr_assessment_drafts TO authenticated;
GRANT ALL ON public.cefr_assessment_drafts TO service_role;

-- ---------------------------------------------------------------- 3 helpers
-- Is this (source, source_id) a point a model made? The one rule.
CREATE OR REPLACE FUNCTION public.cefr_point_is_model_made(_source text, _source_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT coalesce(_source IN ('level_defense_evidence', 'level_defense_test'), false)
      OR (_source = 'ai_report' AND _source_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.student_reports r WHERE r.id = _source_id))
$function$;

-- May the signed-in caller see / decide a draft about this child?
-- An admin; or a teacher (TAs hold the role) who may write for the row's
-- class (staff_may_write_for: staff of the class, the child belongs with it
-- or with the caller's classes), or - for a draft with no class - who
-- teaches a class the child is in now.
CREATE OR REPLACE FUNCTION public.cefr_draft_staff_can(_class_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND _student_id IS NOT NULL
     AND (   coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)
          OR (    coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false)
              AND CASE WHEN _class_id IS NOT NULL
                       THEN coalesce(public.staff_may_write_for(_class_id, _student_id), false)
                       ELSE coalesce(public.can_view_student_in_class(_student_id, auth.uid()), false) END))
$function$;

REVOKE EXECUTE ON FUNCTION public.cefr_point_is_model_made(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cefr_draft_staff_can(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cefr_point_is_model_made(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cefr_draft_staff_can(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS cefr_assessment_drafts_staff_select ON public.cefr_assessment_drafts;
CREATE POLICY cefr_assessment_drafts_staff_select ON public.cefr_assessment_drafts
  FOR SELECT TO authenticated
  USING (public.cefr_draft_staff_can(class_id, student_id));

-- ---------------------------------------------------------------- 4 guards
-- cefr_assessments: no API role writes a model-made point; only the approval
-- (running as the owner) does. Runs as the caller, so current_user is the
-- API role; inside a SECURITY DEFINER function it is the owner.
CREATE OR REPLACE FUNCTION public.cefr_model_point_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated', 'service_role')
     AND (TG_OP = 'INSERT' OR NEW.source IS DISTINCT FROM OLD.source OR NEW.source_id IS DISTINCT FROM OLD.source_id)
     AND public.cefr_point_is_model_made(NEW.source, NEW.source_id) THEN
    RAISE EXCEPTION 'A CEFR level a model made is a draft until a teacher approves it (cefr_assessment_drafts, approve_cefr_draft)'
      USING ERRCODE = '42501', HINT = 'CEFR_MODEL_DRAFT';
  END IF;
  RETURN NEW;
END
$function$;
DROP TRIGGER IF EXISTS cefr_model_point_guard ON public.cefr_assessments;
CREATE TRIGGER cefr_model_point_guard
  BEFORE INSERT OR UPDATE ON public.cefr_assessments
  FOR EACH ROW EXECUTE FUNCTION public.cefr_model_point_guard();

-- cefr_assessment_drafts: an API role (the functions, as the service role)
-- only ever inserts an undecided draft; the decision is the RPCs'.
CREATE OR REPLACE FUNCTION public.cefr_draft_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated', 'service_role') THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'A CEFR draft is decided only by approve_cefr_draft / discard_cefr_draft' USING ERRCODE = '42501';
    END IF;
    IF NEW.status <> 'draft' OR NEW.held_row IS NOT NULL THEN
      RAISE EXCEPTION 'A new CEFR draft starts undecided, holding nothing' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;
DROP TRIGGER IF EXISTS cefr_draft_write_guard ON public.cefr_assessment_drafts;
CREATE TRIGGER cefr_draft_write_guard
  BEFORE INSERT OR UPDATE ON public.cefr_assessment_drafts
  FOR EACH ROW EXECUTE FUNCTION public.cefr_draft_write_guard();

-- ---------------------------------------------------------------- 5 approve / discard
CREATE OR REPLACE FUNCTION public.approve_cefr_draft(p_draft uuid, p_level text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  d public.cefr_assessment_drafts%ROWTYPE;
  v_level text;
  v_score numeric;
  v_evidence text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to approve a CEFR level' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.cefr_assessment_drafts WHERE id = p_draft FOR UPDATE;
  IF NOT FOUND OR NOT public.cefr_draft_staff_can(d.class_id, d.student_id) THEN
    RAISE EXCEPTION 'No such CEFR draft, or it is not about a child you teach' USING ERRCODE = '42501';
  END IF;
  IF d.status <> 'draft' THEN
    RAISE EXCEPTION 'This CEFR draft was already %', d.status USING ERRCODE = '55000';
  END IF;
  v_level := coalesce(nullif(btrim(p_level), ''), d.level);
  v_score := CASE v_level
    WHEN 'Pre-A1' THEN 0 WHEN 'A1' THEN 1 WHEN 'A1+' THEN 1.5 WHEN 'A2' THEN 2 WHEN 'A2+' THEN 2.5
    WHEN 'B1' THEN 3 WHEN 'B1+' THEN 3.5 WHEN 'B2' THEN 4 WHEN 'B2+' THEN 4.5 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 END;
  IF v_score IS NULL THEN
    RAISE EXCEPTION '% is not a CEFR level', v_level USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cefr_assessments WHERE id = d.id) THEN
    RAISE EXCEPTION 'This CEFR level is already published' USING ERRCODE = '55000';
  END IF;
  v_evidence := CASE WHEN v_level = d.level THEN d.evidence
                     ELSE left('Set by the teacher (the AI suggested ' || d.level || ')' || coalesce(': ' || d.evidence, ''), 1000) END;

  INSERT INTO public.cefr_assessments
    (id, student_id, class_id, source, level, level_score, sub_scores, confidence, evidence, assessed_at, created_by, source_id)
  VALUES
    (d.id, d.student_id, d.class_id, d.source, v_level, v_score, d.sub_scores,
     CASE WHEN v_level = d.level THEN d.confidence END, v_evidence, d.assessed_at, v_uid, d.source_id);

  UPDATE public.cefr_assessment_drafts
     SET status = 'approved', decided_by = v_uid, decided_at = now(), approved_level = v_level
   WHERE id = d.id;
  RETURN d.id;
END
$function$;

CREATE OR REPLACE FUNCTION public.discard_cefr_draft(p_draft uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  d public.cefr_assessment_drafts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to discard a CEFR draft' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.cefr_assessment_drafts WHERE id = p_draft FOR UPDATE;
  IF NOT FOUND OR NOT public.cefr_draft_staff_can(d.class_id, d.student_id) THEN
    RAISE EXCEPTION 'No such CEFR draft, or it is not about a child you teach' USING ERRCODE = '42501';
  END IF;
  IF d.status <> 'draft' THEN
    RAISE EXCEPTION 'This CEFR draft was already %', d.status USING ERRCODE = '55000';
  END IF;
  UPDATE public.cefr_assessment_drafts
     SET status = 'discarded', decided_by = v_uid, decided_at = now()
   WHERE id = d.id;
END
$function$;

REVOKE EXECUTE ON FUNCTION public.approve_cefr_draft(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.discard_cefr_draft(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cefr_model_point_guard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cefr_draft_write_guard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_cefr_draft(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_cefr_draft(uuid) TO authenticated;

-- ---------------------------------------------------------------- 6 take back
-- Model-made points already published, with no draft yet: copy whole, then
-- delete. A point whose draft is approved is the approval's and stays.
CREATE TEMP TABLE _cmd_take ON COMMIT DROP AS
  SELECT c.* FROM public.cefr_assessments c
   WHERE public.cefr_point_is_model_made(c.source, c.source_id)
     AND NOT EXISTS (SELECT 1 FROM public.cefr_assessment_drafts d WHERE d.id = c.id);

DO $shape$
DECLARE
  v_bad int;
BEGIN
  -- A published model point whose draft is NOT approved should not exist.
  SELECT count(*) INTO v_bad
    FROM public.cefr_assessments c JOIN public.cefr_assessment_drafts d ON d.id = c.id
   WHERE d.status <> 'approved';
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'Refusing to run: % published CEFR row(s) share an id with an undecided or discarded draft', v_bad;
  END IF;
END
$shape$;

INSERT INTO public.cefr_assessment_drafts
  (id, student_id, class_id, source, source_id, level, level_score, sub_scores, confidence, evidence, assessed_at,
   requested_by, held_row, created_at)
SELECT t.id, t.student_id, t.class_id, t.source, t.source_id, t.level, t.level_score, t.sub_scores, t.confidence, t.evidence, t.assessed_at,
       t.created_by, to_jsonb(t), t.created_at
  FROM _cmd_take t;

DELETE FROM public.cefr_assessments c USING _cmd_take t WHERE t.id = c.id;

DO $counts$
DECLARE
  v_taken int; v_students int; v_drafts int; v_left int;
BEGIN
  SELECT count(*), count(DISTINCT student_id) INTO v_taken, v_students FROM _cmd_take;
  SELECT count(*) INTO v_drafts FROM public.cefr_assessment_drafts WHERE status = 'draft';
  SELECT count(*) INTO v_left FROM public.cefr_assessments c
   WHERE public.cefr_point_is_model_made(c.source, c.source_id)
     AND NOT EXISTS (SELECT 1 FROM public.cefr_assessment_drafts d WHERE d.id = c.id AND d.status = 'approved');
  IF v_left > 0 THEN
    RAISE EXCEPTION 'Refusing to commit: % model-made CEFR point(s) are still published without an approval', v_left;
  END IF;
  RAISE NOTICE 'cefr model drafts: held % point(s) for % child(ren) this paste; % draft(s) waiting for a teacher; 0 model-made points published without approval',
    v_taken, v_students, v_drafts;
END
$counts$;

SELECT (SELECT count(*) FROM _cmd_take) AS held_this_paste,
       (SELECT count(DISTINCT student_id) FROM _cmd_take) AS children,
       (SELECT count(*) FROM public.cefr_assessment_drafts WHERE status = 'draft') AS drafts_waiting,
       (SELECT count(*) FROM public.cefr_assessment_drafts WHERE held_row IS NOT NULL) AS held_total;

COMMIT;
