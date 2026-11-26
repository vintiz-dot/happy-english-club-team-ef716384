-- Admin > Voices page (owner, 26 Nov 2026: "build admin voice biometric page").
--
-- What the page shows and where it comes from:
--   * Everything the DATABASE knows, as numbers: who has voiceprint consent, how many voice
--     groups the overnight job made, how many a teacher answered, how often the shown
--     guess matched the teacher's answer. lesson_monitor_voice_overview() reads it for an
--     admin only (the groups table itself is readable only by the lesson's own teacher).
--   * What only the LAPTOP knows: each child's seconds of voice on file and each model's
--     accuracy against the teachers' answers. The laptop publishes those as one small
--     snapshot (voice_admin.py publish; the overnight job does it at the end of a run).
--     The snapshot holds counts, rates, thresholds and per-child SECONDS. It never holds a
--     voiceprint, an embedding, audio, a name or a line of a lesson, and the function
--     refuses a snapshot that carries any key it does not know.
-- Admin only on both sides. Nothing here can write anything the voice step reads back.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.lesson_monitor_voice_groups') IS NULL
     OR to_regprocedure('public.lesson_monitor__is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the voice step (20261124120000) is not installed';
  END IF;
END
$pre$;

CREATE TABLE IF NOT EXISTS public.lesson_monitor_voice_stats (
  id            bigserial PRIMARY KEY,
  published_at  timestamptz NOT NULL DEFAULT now(),
  published_by  uuid NOT NULL,
  stats         jsonb NOT NULL CHECK (jsonb_typeof(stats) = 'object')
);

ALTER TABLE public.lesson_monitor_voice_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lesson_monitor_voice_stats_admin_read ON public.lesson_monitor_voice_stats;
CREATE POLICY lesson_monitor_voice_stats_admin_read ON public.lesson_monitor_voice_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.lesson_monitor_voice_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lesson_monitor_voice_stats TO authenticated;
GRANT ALL ON public.lesson_monitor_voice_stats TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.lesson_monitor_voice_stats_id_seq TO service_role;

-- The laptop publishes its snapshot. Known keys only; the last 60 are kept.
--   accuracy   {model: {n, threshold, named_correct, named_wrong, not_sure, *_pct, sweep:[...], shown_vs_blind?}}
--   enrolment  [{student_id, seconds, samples}]       (seconds of voice on file, ECAPA)
--   settings   {shown_model, thresholds, margin, group_min_s, enrol_min_s, models}
CREATE OR REPLACE FUNCTION public.lesson_monitor_publish_voice_stats(p_stats jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_key text; v_id bigint;
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_stats IS NULL OR jsonb_typeof(p_stats) <> 'object' THEN RAISE EXCEPTION 'A snapshot is an object'; END IF;
  IF octet_length(p_stats::text) > 300000 THEN RAISE EXCEPTION 'That snapshot is too large'; END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_stats) LOOP
    IF v_key NOT IN ('accuracy', 'enrolment', 'settings') THEN
      RAISE EXCEPTION 'A snapshot holds accuracy, enrolment and settings only (got %)', v_key;
    END IF;
  END LOOP;
  IF p_stats ? 'enrolment' THEN
    IF jsonb_typeof(p_stats->'enrolment') <> 'array'
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_stats->'enrolment') e
                   WHERE jsonb_typeof(e) <> 'object'
                      OR EXISTS (SELECT 1 FROM jsonb_object_keys(e) k WHERE k NOT IN ('student_id', 'seconds', 'samples'))) THEN
      RAISE EXCEPTION 'Enrolment is a list of student_id, seconds and samples only';
    END IF;
  END IF;
  INSERT INTO public.lesson_monitor_voice_stats (published_by, stats) VALUES (auth.uid(), p_stats) RETURNING id INTO v_id;
  DELETE FROM public.lesson_monitor_voice_stats WHERE id <= v_id - 60;
  RETURN jsonb_build_object('id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_publish_voice_stats(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_publish_voice_stats(jsonb) TO authenticated;

-- The page's one read. Admin only. Numbers and the consent list (names, because an admin already
-- reads names in voice_admin.py list); no lesson text, no voice data.
CREATE OR REPLACE FUNCTION public.lesson_monitor_voice_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.lesson_monitor__is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT jsonb_build_object(
    'children', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'student_id', c.student_id, 'name', s.full_name, 'status', c.status, 'recorded_at', c.recorded_at)
        ORDER BY s.full_name)
      FROM public.lesson_monitor_voiceprint_consents c JOIN public.students s ON s.id = c.student_id), '[]'::jsonb),
    'reports', jsonb_build_object(
      'total', (SELECT count(*) FROM public.lesson_monitor_reports),
      'with_voice_groups', (SELECT count(DISTINCT report_id) FROM public.lesson_monitor_voice_groups)),
    'groups', (SELECT jsonb_build_object(
        'total', count(*),
        'answered', count(*) FILTER (WHERE answered_at IS NOT NULL),
        'child', count(*) FILTER (WHERE answer = 'child'),
        'several', count(*) FILTER (WHERE answer = 'several'),
        'teacher', count(*) FILTER (WHERE answer = 'teacher'),
        'unknown', count(*) FILTER (WHERE answer = 'unknown'),
        'suggested', count(*) FILTER (WHERE suggested_student IS NOT NULL),
        'suggested_answered_child', count(*) FILTER (WHERE suggested_student IS NOT NULL AND answer = 'child'),
        'suggested_right', count(*) FILTER (WHERE suggested_student IS NOT NULL AND answer = 'child' AND student_id = suggested_student),
        'learned', count(*) FILTER (WHERE learned_at IS NOT NULL),
        'waiting_to_learn', count(*) FILTER (WHERE answered_at IS NOT NULL AND learned_at IS NULL))
      FROM public.lesson_monitor_voice_groups),
    'by_class', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'last_lesson' DESC) FROM (
        SELECT jsonb_build_object('class_id', g.class_id, 'class_name', cl.name, 'groups', count(*),
               'answered', count(*) FILTER (WHERE g.answered_at IS NOT NULL),
               'suggested_answered_child', count(*) FILTER (WHERE g.suggested_student IS NOT NULL AND g.answer = 'child'),
               'suggested_right', count(*) FILTER (WHERE g.suggested_student IS NOT NULL AND g.answer = 'child' AND g.student_id = g.suggested_student),
               'last_lesson', max(g.session_date)) AS x
          FROM public.lesson_monitor_voice_groups g LEFT JOIN public.classes cl ON cl.id = g.class_id
         GROUP BY g.class_id, cl.name) t), '[]'::jsonb),
    'by_week', COALESCE((SELECT jsonb_agg(x ORDER BY x->>'week') FROM (
        SELECT jsonb_build_object('week', date_trunc('week', session_date)::date, 'groups', count(*),
               'answered', count(*) FILTER (WHERE answered_at IS NOT NULL)) AS x
          FROM public.lesson_monitor_voice_groups
         WHERE session_date >= CURRENT_DATE - 84
         GROUP BY date_trunc('week', session_date)) t), '[]'::jsonb),
    'snapshot', (SELECT jsonb_build_object('published_at', published_at, 'stats', stats)
                   FROM public.lesson_monitor_voice_stats ORDER BY id DESC LIMIT 1)
  ) INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_voice_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_voice_overview() TO authenticated;

COMMIT;
