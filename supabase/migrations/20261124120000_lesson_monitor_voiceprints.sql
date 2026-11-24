-- The lesson monitor's voice step (owner, 24 Nov 2026: "build it ... include voice
-- biometrics"; design docs/LESSON_MONITOR_DESIGN.md, Option B).
--
-- What lives where:
--   * The VOICEPRINTS themselves never reach this database. They are numbers made
--     from a child's voice and stay on the school laptop, encrypted
--     (scripts/lesson-monitor/voiceprints.py). Nothing here can rebuild a voice.
--   * Here: (1) a child's OWN voiceprint consent, separate from the monitor
--     consent (a parent can refuse one and keep the other), recorded by an admin;
--     (2) the voice groups of a lesson's report, with the computer's suggestion
--     and the teacher's answer. A suggestion is only ever a suggestion: the
--     teacher confirms or corrects it, and only a confirmed answer teaches the
--     laptop that child's voice.
--
-- Who may do what:
--   lesson_monitor_record_voiceprint_consent  admin only. A withdrawal clears the
--       child from every suggestion and answer at once; the laptop deletes the
--       child's voiceprint on its next start (lesson_monitor_voiceprint_allowed).
--   lesson_monitor_voiceprint_allowed         admin only (the laptop signs in as one):
--       the children whose voiceprint consent stands.
--   lesson_monitor_save_voice_groups          admin only, right after the report is
--       saved. A suggestion may name only a child enrolled in the class on the
--       lesson's date WITH voiceprint consent; anything else is dropped.
--   lesson_monitor_name_voice_group           the report's own teacher (the same rule
--       that lets them read the report). Any enrolled child may be named: naming a
--       voice in a transcript is not a voiceprint; the laptop learns only from a
--       child with consent.
--   lesson_monitor_voice_answers / _voice_learned   admin only: the laptop reads the
--       answers it has not learned from yet, and marks them learned.
-- The groups are deleted with their report (FK cascade), so every rule that
-- deletes reports (30 days, monitor consent withdrawn, the teacher's delete,
-- delete everything) deletes them too.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.lesson_monitor_reports') IS NULL
     OR to_regprocedure('public.lesson_monitor_can_read_report(uuid,uuid,uuid,date)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the lesson monitor pilot (20261117090000) is not installed';
  END IF;
END
$pre$;

-- ================================================================ tables
CREATE TABLE IF NOT EXISTS public.lesson_monitor_voiceprint_consents (
  student_id   uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  note         text NOT NULL CHECK (btrim(note) <> '' AND char_length(note) <= 300),
  recorded_by  uuid NOT NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_monitor_voice_groups (
  report_id          uuid NOT NULL REFERENCES public.lesson_monitor_reports(id) ON DELETE CASCADE,
  group_key          text NOT NULL CHECK (group_key ~ '^G[0-9]{1,3}$'),
  recording_id       uuid NOT NULL,
  class_id           uuid NOT NULL,
  session_date       date NOT NULL,
  seconds            numeric(7,1) NOT NULL CHECK (seconds >= 0 AND seconds <= 30000),
  line_count         integer NOT NULL CHECK (line_count BETWEEN 0 AND 5000),
  suggested_student  uuid REFERENCES public.students(id) ON DELETE SET NULL,
  suggested_score    real CHECK (suggested_score IS NULL OR suggested_score BETWEEN -1 AND 1),
  answer             text CHECK (answer IS NULL OR answer IN ('child', 'several', 'teacher', 'unknown')),
  student_id         uuid REFERENCES public.students(id) ON DELETE SET NULL,
  answered_by        uuid,
  answered_at        timestamptz,
  learned_at         timestamptz,
  PRIMARY KEY (report_id, group_key),
  CONSTRAINT lesson_monitor_voice_groups_child CHECK ((answer = 'child') = (student_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS lesson_monitor_voice_groups_learn_idx
  ON public.lesson_monitor_voice_groups (answered_at) WHERE answered_at IS NOT NULL AND learned_at IS NULL;

-- New audit actions (the pilot's list is a CHECK; this widens it, keeping every old one).
ALTER TABLE public.lesson_monitor_audit DROP CONSTRAINT IF EXISTS lesson_monitor_audit_action_check;
ALTER TABLE public.lesson_monitor_audit ADD CONSTRAINT lesson_monitor_audit_action_check CHECK (action IN (
  'switch_on', 'switch_off', 'switch_off_auto', 'consent_granted', 'consent_withdrawn',
  'audio_download', 'report_saved', 'run_recorded', 'report_opened', 'report_feedback',
  'report_deleted', 'reports_expired', 'targets_set', 'delete_everything', 'settings_changed',
  'voiceprint_consent_granted', 'voiceprint_consent_withdrawn', 'voice_groups_saved', 'voice_group_named',
  'voice_groups_learned'));

-- ================================================================ helpers
-- Enrolled in the class on that date AND voiceprint consent granted.
CREATE OR REPLACE FUNCTION public.lesson_monitor__voiceprint_ok(p_student uuid, p_class uuid, p_on date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT p_student IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.lesson_monitor_voiceprint_consents c
                  WHERE c.student_id = p_student AND c.status = 'granted')
     AND EXISTS (SELECT 1 FROM public.enrollments e
                  WHERE e.student_id = p_student AND e.class_id = p_class
                    AND e.start_date <= p_on AND (e.end_date IS NULL OR e.end_date >= p_on));
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__voiceprint_ok(uuid, uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lesson_monitor__is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT auth.uid() IS NOT NULL AND COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false);
$function$;
REVOKE ALL ON FUNCTION public.lesson_monitor__is_admin() FROM PUBLIC, anon, authenticated;

-- ================================================================ consent
CREATE OR REPLACE FUNCTION public.lesson_monitor_record_voiceprint_consent(p_student uuid, p_status text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cleared integer := 0;
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Only an admin can record a child''s voiceprint consent' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('granted', 'withdrawn') THEN RAISE EXCEPTION 'Consent is either granted or withdrawn'; END IF;
  IF btrim(COALESCE(p_note, '')) = '' THEN RAISE EXCEPTION 'Say how the parents answered (for example "signed voiceprint line, 24 Nov")'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student) THEN RAISE EXCEPTION 'No such student'; END IF;

  INSERT INTO public.lesson_monitor_voiceprint_consents (student_id, status, note, recorded_by, recorded_at)
  VALUES (p_student, p_status, left(btrim(p_note), 300), auth.uid(), now())
  ON CONFLICT (student_id) DO UPDATE
    SET status = EXCLUDED.status, note = EXCLUDED.note, recorded_by = EXCLUDED.recorded_by, recorded_at = EXCLUDED.recorded_at;

  IF p_status = 'withdrawn' THEN
    -- No suggestion may stand on a voiceprint that is being deleted, and nothing is
    -- left for the laptop to learn about this child.
    UPDATE public.lesson_monitor_voice_groups
       SET suggested_student = NULL, suggested_score = NULL
     WHERE suggested_student = p_student;
    GET DIAGNOSTICS v_cleared = ROW_COUNT;
    UPDATE public.lesson_monitor_voice_groups SET learned_at = COALESCE(learned_at, now())
     WHERE student_id = p_student;
  END IF;
  PERFORM public.lesson_monitor__audit(
    CASE p_status WHEN 'granted' THEN 'voiceprint_consent_granted' ELSE 'voiceprint_consent_withdrawn' END,
    NULL, NULL, NULL, p_student, jsonb_build_object('suggestions_cleared', v_cleared));
  RETURN jsonb_build_object('status', p_status, 'suggestions_cleared', v_cleared);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_record_voiceprint_consent(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_record_voiceprint_consent(uuid, text, text) TO authenticated;

-- The laptop's list: a voiceprint of any child NOT returned here is deleted on its next start.
CREATE OR REPLACE FUNCTION public.lesson_monitor_voiceprint_allowed()
RETURNS TABLE (student_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY SELECT c.student_id FROM public.lesson_monitor_voiceprint_consents c WHERE c.status = 'granted';
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_voiceprint_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_voiceprint_allowed() TO authenticated;

-- ================================================================ the laptop saves a report's groups
-- p_groups: [{"key":"G1","seconds":12.5,"lines":4,"suggested":"<uuid>|null","score":0.71|null}, ...]
CREATE OR REPLACE FUNCTION public.lesson_monitor_save_voice_groups(p_recording uuid, p_groups jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.lesson_monitor_reports%ROWTYPE;
  g jsonb;
  v_sug uuid;
  v_saved integer := 0;
  v_dropped integer := 0;
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO r FROM public.lesson_monitor_reports WHERE recording_id = p_recording;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Save the report first'; END IF;
  IF p_groups IS NULL OR jsonb_typeof(p_groups) <> 'array' OR jsonb_array_length(p_groups) > 200 THEN
    RAISE EXCEPTION 'Groups are a list of at most 200';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lesson_monitor_voice_groups WHERE report_id = r.id) THEN
    RAISE EXCEPTION 'This report''s voice groups are already saved';
  END IF;
  FOR g IN SELECT * FROM jsonb_array_elements(p_groups) LOOP
    v_sug := NULL;
    IF jsonb_typeof(g->'suggested') = 'string' AND (g->>'suggested') ~* '^[0-9a-f-]{36}$' THEN
      v_sug := (g->>'suggested')::uuid;
      IF NOT public.lesson_monitor__voiceprint_ok(v_sug, r.class_id, r.session_date) THEN
        v_sug := NULL;
        v_dropped := v_dropped + 1;
      END IF;
    END IF;
    INSERT INTO public.lesson_monitor_voice_groups
      (report_id, group_key, recording_id, class_id, session_date, seconds, line_count, suggested_student, suggested_score)
    VALUES (r.id, g->>'key', r.recording_id, r.class_id, r.session_date,
            round(COALESCE((g->>'seconds')::numeric, 0), 1), COALESCE((g->>'lines')::integer, 0),
            v_sug, CASE WHEN v_sug IS NULL THEN NULL ELSE (g->>'score')::real END);
    v_saved := v_saved + 1;
  END LOOP;
  PERFORM public.lesson_monitor__audit('voice_groups_saved', r.class_id, r.recording_id, r.id, NULL,
    jsonb_build_object('groups', v_saved, 'suggestions_dropped', v_dropped));
  RETURN jsonb_build_object('groups', v_saved, 'suggestions_dropped', v_dropped);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_save_voice_groups(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_save_voice_groups(uuid, jsonb) TO authenticated;

-- ================================================================ the teacher names a group
CREATE OR REPLACE FUNCTION public.lesson_monitor_name_voice_group(
  p_report uuid, p_group text, p_answer text, p_student uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.lesson_monitor_reports%ROWTYPE;
  v public.lesson_monitor_voice_groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = 'insufficient_privilege'; END IF;
  SELECT * INTO r FROM public.lesson_monitor_reports WHERE id = p_report;
  IF r.id IS NULL OR NOT public.lesson_monitor_can_read_report(r.teacher_user_id, r.class_id, r.session_id, r.session_date) THEN
    RAISE EXCEPTION 'Only the lesson''s teacher can name its voices' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v FROM public.lesson_monitor_voice_groups WHERE report_id = r.id AND group_key = p_group FOR UPDATE;
  IF v.report_id IS NULL THEN RAISE EXCEPTION 'No such voice group'; END IF;
  IF p_answer IS NOT NULL AND p_answer NOT IN ('child', 'several', 'teacher', 'unknown') THEN
    RAISE EXCEPTION 'The answer is a child, several voices, the teacher or unknown';
  END IF;
  IF p_answer = 'child' THEN
    IF p_student IS NULL OR NOT EXISTS (
         SELECT 1 FROM public.enrollments e WHERE e.student_id = p_student AND e.class_id = r.class_id
            AND e.start_date <= r.session_date AND (e.end_date IS NULL OR e.end_date >= r.session_date)) THEN
      RAISE EXCEPTION 'Only a child enrolled in this class on the lesson''s date can be named';
    END IF;
  ELSIF p_student IS NOT NULL THEN
    RAISE EXCEPTION 'A child is named only with the answer "child"';
  END IF;
  -- NULL clears the answer (the teacher's undo). An answer the laptop already
  -- learned from is learned again only if it changed.
  UPDATE public.lesson_monitor_voice_groups
     SET answer = p_answer,
         student_id = CASE WHEN p_answer = 'child' THEN p_student END,
         answered_by = CASE WHEN p_answer IS NULL THEN NULL ELSE auth.uid() END,
         answered_at = CASE WHEN p_answer IS NULL THEN NULL ELSE now() END,
         learned_at = CASE WHEN p_answer IS NOT DISTINCT FROM v.answer AND p_student IS NOT DISTINCT FROM v.student_id
                           THEN v.learned_at END
   WHERE report_id = r.id AND group_key = p_group;
  PERFORM public.lesson_monitor__audit('voice_group_named', r.class_id, r.recording_id, r.id, NULL,
    jsonb_build_object('group', p_group, 'answer', p_answer,
                       'matches_suggestion', p_answer = 'child' AND p_student = v.suggested_student));
  RETURN jsonb_build_object('group', p_group, 'answer', p_answer);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_name_voice_group(uuid, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_name_voice_group(uuid, text, text, uuid) TO authenticated;

-- ================================================================ the laptop learns from the answers
CREATE OR REPLACE FUNCTION public.lesson_monitor_voice_answers(p_limit integer DEFAULT 500)
RETURNS TABLE (recording_id uuid, group_key text, answer text, student_id uuid, may_learn boolean,
               suggested_student uuid, suggested_score real, answered_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT g.recording_id, g.group_key, g.answer, g.student_id,
         -- may_learn: only a named child whose voiceprint consent stands today.
         (g.answer = 'child' AND public.lesson_monitor__voiceprint_ok(g.student_id, g.class_id, g.session_date)),
         g.suggested_student, g.suggested_score, g.answered_at
    FROM public.lesson_monitor_voice_groups g
   WHERE g.answered_at IS NOT NULL AND g.learned_at IS NULL
   ORDER BY g.answered_at
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 2000);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_voice_answers(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_voice_answers(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.lesson_monitor_voice_learned(p_recording uuid, p_groups text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n integer;
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.lesson_monitor_voice_groups SET learned_at = now()
   WHERE recording_id = p_recording AND group_key = ANY (COALESCE(p_groups, '{}')) AND answered_at IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 0 THEN
    PERFORM public.lesson_monitor__audit('voice_groups_learned', NULL, p_recording, NULL, NULL, jsonb_build_object('groups', v_n));
  END IF;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_voice_learned(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_voice_learned(uuid, text[]) TO authenticated;

-- ================================================================ delete everything, now including voices
-- As in 20261117090000, plus the voice groups, and (with p_consents) the voiceprint consents.
CREATE OR REPLACE FUNCTION public.lesson_monitor_delete_everything(p_confirm text, p_consents boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reports integer; v_targets integer; v_runs integer; v_classes integer; v_consents integer := 0; v_scrubbed integer;
        v_groups integer; v_vconsents integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_confirm IS DISTINCT FROM 'DELETE ALL PILOT DATA' THEN
    RAISE EXCEPTION 'Type DELETE ALL PILOT DATA to confirm';
  END IF;
  DELETE FROM public.lesson_monitor_voice_groups; GET DIAGNOSTICS v_groups = ROW_COUNT;
  DELETE FROM public.lesson_monitor_reports; GET DIAGNOSTICS v_reports = ROW_COUNT;
  DELETE FROM public.lesson_monitor_targets; GET DIAGNOSTICS v_targets = ROW_COUNT;
  DELETE FROM public.lesson_monitor_runs;    GET DIAGNOSTICS v_runs = ROW_COUNT;
  DELETE FROM public.lesson_monitor_classes; GET DIAGNOSTICS v_classes = ROW_COUNT;
  IF COALESCE(p_consents, false) THEN
    DELETE FROM public.lesson_monitor_child_consents; GET DIAGNOSTICS v_consents = ROW_COUNT;
    DELETE FROM public.lesson_monitor_voiceprint_consents; GET DIAGNOSTICS v_vconsents = ROW_COUNT;
  END IF;
  PERFORM set_config('lesson_monitor.scrub', 'on', true);
  UPDATE public.lesson_monitor_audit SET student_id = NULL WHERE student_id IS NOT NULL;
  GET DIAGNOSTICS v_scrubbed = ROW_COUNT;
  PERFORM set_config('lesson_monitor.scrub', 'off', true);
  PERFORM public.lesson_monitor__audit('delete_everything', NULL, NULL, NULL, NULL,
    jsonb_build_object('reports', v_reports, 'targets', v_targets, 'runs', v_runs, 'classes', v_classes, 'consents', v_consents,
                       'voice_groups', v_groups, 'voiceprint_consents', v_vconsents, 'student_ids_cleared', v_scrubbed));
  RETURN jsonb_build_object('reports', v_reports, 'targets', v_targets, 'runs', v_runs, 'classes', v_classes, 'consents', v_consents,
    'voice_groups', v_groups, 'voiceprint_consents', v_vconsents,
    'left', (SELECT count(*) FROM public.lesson_monitor_reports) + (SELECT count(*) FROM public.lesson_monitor_targets)
          + (SELECT count(*) FROM public.lesson_monitor_runs) + (SELECT count(*) FROM public.lesson_monitor_classes)
          + (SELECT count(*) FROM public.lesson_monitor_voice_groups));
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_delete_everything(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_delete_everything(text, boolean) TO authenticated;

-- ================================================================ policies and grants
ALTER TABLE public.lesson_monitor_voiceprint_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_monitor_voice_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_monitor_voiceprint_consents_admin_read ON public.lesson_monitor_voiceprint_consents;
CREATE POLICY lesson_monitor_voiceprint_consents_admin_read ON public.lesson_monitor_voiceprint_consents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- The groups are read by whoever may read their report: the lesson's own teacher.
DROP POLICY IF EXISTS lesson_monitor_voice_groups_teacher_read ON public.lesson_monitor_voice_groups;
CREATE POLICY lesson_monitor_voice_groups_teacher_read ON public.lesson_monitor_voice_groups
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.lesson_monitor_reports r
     WHERE r.id = report_id
       AND public.lesson_monitor_can_read_report(r.teacher_user_id, r.class_id, r.session_id, r.session_date)));

-- Read only; every write is a function above.
REVOKE ALL ON public.lesson_monitor_voiceprint_consents, public.lesson_monitor_voice_groups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lesson_monitor_voiceprint_consents, public.lesson_monitor_voice_groups TO authenticated;
GRANT ALL ON public.lesson_monitor_voiceprint_consents, public.lesson_monitor_voice_groups TO service_role;

COMMIT;
