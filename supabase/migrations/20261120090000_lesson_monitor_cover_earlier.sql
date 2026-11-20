-- Lesson monitor pilot: also cover lessons recorded BEFORE the class was switched on.
--
-- The owner's ruling, 20 Nov 2026: "cover all available recordings". Switching
-- on (lesson_monitor_set_class) starts the pilot on the day it is pressed, so a
-- lesson recorded the day before is never processed. This adds one admin-only
-- step, run right after switching on, that moves the class's start date back.
--
-- What it keeps from the pilot's rules:
--   * admins only, and only for a class that is switched ON;
--   * no further back than the report window (30 days): an older report would
--     be deleted the moment it was saved, and the recorder deletes the audio then;
--   * the pilot still spans at most 42 days (the table's own CHECK);
--   * EVERY earlier lesson it would cover must have the monitor consent of every
--     child in it on that date (enrolled, or marked present); otherwise it
--     refuses and says how many lessons lack it. The overnight job checks each
--     lesson again (lesson_monitor_begin), and a lesson a cover teacher taught
--     is still refused there.
--   * it is logged in the audit as a switch_on with the new start date.
--
-- A separate function, not a new argument to lesson_monitor_set_class: pasting
-- 20261117090000 again (it is safe to run twice) would otherwise bring the old
-- six-argument version back beside a new one and make every call ambiguous.
-- Safe to run twice.

DO $pre$
BEGIN
  IF to_regclass('public.lesson_monitor_classes') IS NULL
     OR to_regprocedure('public.lesson_monitor__children_without_consent(uuid,date)') IS NULL
     OR to_regprocedure('public.lesson_monitor__audit(text,uuid,uuid,uuid,uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: the lesson monitor pilot (20261117090000) is not installed';
  END IF;
END
$pre$;

CREATE OR REPLACE FUNCTION public.lesson_monitor_cover_from(p_class uuid, p_from date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := public.lesson_monitor__today();
  v_days integer := COALESCE((SELECT report_days FROM public.lesson_monitor_settings WHERE id = 1), 30);
  m public.lesson_monitor_classes%ROWTYPE;
  v_lessons integer;
  v_lacking integer;
BEGIN
  IF v_uid IS NULL OR NOT COALESCE(public.has_role(v_uid, 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Only an admin can change when the lesson monitor starts' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_class IS NULL OR p_from IS NULL THEN RAISE EXCEPTION 'Say which class and from which date'; END IF;
  SELECT * INTO m FROM public.lesson_monitor_classes WHERE class_id = p_class FOR UPDATE;
  IF NOT FOUND OR NOT m.enabled THEN
    RAISE EXCEPTION 'Switch the lesson monitor on for this class first';
  END IF;
  IF p_from >= m.starts_on THEN
    RETURN jsonb_build_object('starts_on', m.starts_on, 'lessons_added', 0);
  END IF;
  IF p_from < v_today - v_days THEN
    RAISE EXCEPTION 'At most % days back (from %): an older report would be deleted as soon as it was made', v_days, v_today - v_days;
  END IF;
  IF m.ends_on > p_from + 42 THEN
    RAISE EXCEPTION 'A pilot spans at most 42 days: from % it must end by %; switch on again with fewer days', p_from, p_from + 42;
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE COALESCE(public.lesson_monitor__children_without_consent(p_class, d.session_date), 1) > 0)::integer
    INTO v_lessons, v_lacking
    FROM (SELECT DISTINCT r.session_date FROM public.class_recordings r
           WHERE r.class_id = p_class AND r.purpose = 'lesson' AND r.status = 'complete'
             AND r.audio_deleted_at IS NULL
             AND r.session_date >= p_from AND r.session_date < m.starts_on) d;
  IF v_lacking > 0 THEN
    RAISE EXCEPTION 'Not moved: % of the % earlier lesson day(s) have a child without the monitor consent', v_lacking, v_lessons;
  END IF;

  UPDATE public.lesson_monitor_classes SET starts_on = p_from, updated_at = now() WHERE class_id = p_class;
  PERFORM public.lesson_monitor__audit('switch_on', p_class, NULL, NULL, NULL,
    jsonb_build_object('cover_from', p_from, 'was_from', m.starts_on, 'earlier_lesson_days', v_lessons));
  RETURN jsonb_build_object('starts_on', p_from, 'lessons_added', v_lessons);
END;
$$;
REVOKE ALL ON FUNCTION public.lesson_monitor_cover_from(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lesson_monitor_cover_from(uuid, date) TO authenticated;
