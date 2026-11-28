-- Admin > Voices: the snapshot may carry a "health" part (owner, 28 Nov 2026, the four Lark mics).
--
-- Why: the Lark speaker engine (scripts/lesson-monitor/multimic.py) needs watching: which engine ran and when,
-- which mic tracks each recent lesson had and how well each lined up (residual ms), how long a lesson took, and the
-- shown model's precision by utterance length. voice_admin.py publish now sends that as stats.health:
--   { engine, last_run, lessons: [{date, at, tracks, residual_ms: {mic: ms}, rejected: {mic: code}, processing_s}],
--     precision: {basis, model, chosen: {...}, buckets: {"<1.2 s": {...}, ...}, best, min_precision} }
-- Same rule as the rest of the snapshot: numbers, dates, track names and codes; no child, no name, no audio.
-- Everything else in lesson_monitor_publish_voice_stats is exactly as in 20261126090000.
--
-- PASTE: after 20261126090000_voice_admin_overview.sql. Safe to paste twice. Without it the job publishes the
-- snapshot without its health part.

BEGIN;

DO $pre$
BEGIN
  IF to_regprocedure('public.lesson_monitor_publish_voice_stats(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: Admin > Voices (20261126090000) is not installed';
  END IF;
END
$pre$;

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
    IF v_key NOT IN ('accuracy', 'enrolment', 'settings', 'health') THEN
      RAISE EXCEPTION 'A snapshot holds accuracy, enrolment, settings and health only (got %)', v_key;
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
  IF p_stats ? 'health' THEN
    IF jsonb_typeof(p_stats->'health') <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_stats->'health') k WHERE k NOT IN ('engine', 'last_run', 'lessons', 'precision')) THEN
      RAISE EXCEPTION 'Health holds engine, last_run, lessons and precision only';
    END IF;
    -- numbers about the engine: no child, no name, no lesson text, no voice data
    IF (p_stats->'health')::text ~* '"(student_id|student_name|child_id|child_name|full_name|name|children|text|vec|vecs|embedding|embeddings)"' THEN
      RAISE EXCEPTION 'Health may not name a child or carry voice data';
    END IF;
  END IF;
  INSERT INTO public.lesson_monitor_voice_stats (published_by, stats) VALUES (auth.uid(), p_stats) RETURNING id INTO v_id;
  DELETE FROM public.lesson_monitor_voice_stats WHERE id <= v_id - 60;
  RETURN jsonb_build_object('id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_publish_voice_stats(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_publish_voice_stats(jsonb) TO authenticated;

COMMIT;
