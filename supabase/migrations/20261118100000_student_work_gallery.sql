-- Student work gallery: admin (everything), teacher ("My Student Works"),
-- and a class gallery that children choose to share into and teachers approve.
--
-- WHAT COUNTS AS "STUDENT WORK" (owner's answer, 18 Nov 2026): every record a
-- child's work lives in - student_work (Smart Upload scans, photos, links),
-- homework_submissions that carry a file, and video_submissions.
-- ONE place lists them, `_work_items()`; the three screens read it through the
-- functions below and nothing else, so who sees what is decided here.
--
-- ADMIN     admin_work_gallery(): every item, every status, teamwork once with
--           all member names. Admin only.
-- TEACHER   teacher_work_gallery(): only items of a class the teacher holds,
--           only children enrolled in that class today and active, and only
--           work whose own date (Hanoi) falls in the teacher's window:
--             - default teacher of the class (classes.default_teacher_id, or a
--               weekly slot in force today): work dated on or after their FIRST
--               non-cancelled assigned session of that class, open-ended while
--               they are the default;
--             - anyone else (cover): only work dated on a day they had a
--               non-cancelled session of that class.
--           So no past work (before they taught it) and no future work (after
--           they stop being default or cover). The class has no history of its
--           default teacher, only session rows do - that is why "default" means
--           "default today".
-- SHARING   A child who owns an item (their own login, or second login - not a
--           family login) asks to share it (request_work_share). It is
--           `pending` until a teacher who may see that work, or an admin,
--           approves it (decide_work_share). Only then do the children of that
--           class, and their families, see it (class_work_gallery), with the
--           children's full names and nothing else: no notes, no marks.
--           student_work needs the teacher's own approval first (status
--           'approved'). Videos are not part of this flow: they already have
--           their own class wall (get_class_video_wall, share_with_class).
--
-- FILES. Nothing is added to any storage policy. A classmate cannot read
-- another child's file through Storage, and must not be able to; the class
-- gallery gets a file only through the edge function `work-gallery-file`,
-- which asks work_share_file() AS THE CALLER and only then reads the file with
-- the service key.
--
-- Idempotent. Rows changed: none. Rollback: drop the objects named here.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regclass('public.student_work') IS NULL OR to_regclass('public.homework_submissions') IS NULL
     OR to_regclass('public.video_submissions') IS NULL OR to_regclass('public.homeworks') IS NULL
     OR to_regclass('public.enrollments') IS NULL OR to_regclass('public.families') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: student_work / homework_submissions / video_submissions / homeworks / enrollments / families missing';
  END IF;
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL
     OR to_regprocedure('public.class_slots_on(uuid, date)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: has_role / can_view_student / class_slots_on missing';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------- shares
CREATE TABLE IF NOT EXISTS public.work_shares (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source               text NOT NULL CHECK (source IN ('student_work', 'homework')),
  source_id            uuid NOT NULL,
  class_id             uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  requested_by_student uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requested_by         uuid NOT NULL,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at         timestamptz NOT NULL DEFAULT now(),
  decided_by           uuid,
  decided_at           timestamptz,
  -- Plain UNIQUE (not partial): one share decision per piece of work.
  CONSTRAINT work_shares_one_per_work UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_work_shares_class_status ON public.work_shares (class_id, status);

ALTER TABLE public.work_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_shares_admin_all ON public.work_shares;
CREATE POLICY work_shares_admin_all ON public.work_shares FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- A child (or their family) reads the status of their own requests. Every
-- write goes through the functions below.
DROP POLICY IF EXISTS work_shares_own_read ON public.work_shares;
CREATE POLICY work_shares_own_read ON public.work_shares FOR SELECT TO authenticated
  USING (public.can_view_student(requested_by_student, auth.uid()));

REVOKE ALL ON public.work_shares FROM anon, PUBLIC;
GRANT SELECT ON public.work_shares TO authenticated;
GRANT ALL ON public.work_shares TO service_role;

-- ---------------------------------------------------------------- the one list
CREATE OR REPLACE FUNCTION public._work_items()
RETURNS TABLE (
  source text, source_id uuid, class_id uuid, class_name text, student_ids uuid[], students jsonb,
  title text, bucket text, file_path text, external_url text, kind text, workflow text,
  status text, work_at timestamptz, is_teamwork boolean, share_id uuid, share_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH raw AS (
    SELECT 'student_work'::text AS source, w.id AS source_id, w.class_id AS class_id,
           array_remove(CASE WHEN w.is_teamwork AND cardinality(w.member_student_ids) > 0
                             THEN w.member_student_ids ELSE ARRAY[w.student_id] END, NULL) AS student_ids,
           coalesce(nullif(w.original_filename, ''), 'Classwork') AS title,
           'student-work'::text AS bucket, w.storage_path AS file_path, w.external_url AS external_url,
           (CASE WHEN w.storage_path IS NULL THEN 'link' ELSE 'file' END)::text AS kind,
           w.workflow::text AS workflow, w.status::text AS status, w.created_at AS work_at,
           w.is_teamwork AS is_teamwork
      FROM public.student_work w
    UNION ALL
    SELECT 'homework', hs.id, h.class_id, ARRAY[hs.student_id], h.title, 'homework', hs.storage_key, NULL, 'file',
           'homework', hs.status::text, coalesce(hs.submitted_at, hs.created_at), false
      FROM public.homework_submissions hs JOIN public.homeworks h ON h.id = hs.homework_id
     WHERE hs.storage_key IS NOT NULL
    UNION ALL
    SELECT 'video', v.id, v.class_id, ARRAY[v.student_id], h.title, 'homework-videos', v.video_path, NULL, 'video',
           'video', v.status::text, v.submitted_at, false
      FROM public.video_submissions v JOIN public.homeworks h ON h.id = v.homework_id
  )
  SELECT r.source, r.source_id, r.class_id, c.name::text, r.student_ids,
         (SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.full_name, 'family_id', s.family_id,
                                                        'family_name', f.name, 'active', s.is_active)
                                    ORDER BY s.full_name), '[]'::jsonb)
            FROM public.students s LEFT JOIN public.families f ON f.id = s.family_id
           WHERE s.id = ANY (r.student_ids)),
         r.title, r.bucket, r.file_path, r.external_url, r.kind, r.workflow, r.status, r.work_at, r.is_teamwork,
         ws.id, ws.status
    FROM raw r
    LEFT JOIN public.classes c ON c.id = r.class_id
    LEFT JOIN public.work_shares ws ON ws.source = r.source AND ws.source_id = r.source_id
   WHERE cardinality(r.student_ids) > 0
$$;

-- Hanoi calendar date of a moment.
CREATE OR REPLACE FUNCTION public._hanoi_date(p_at timestamptz)
RETURNS date LANGUAGE sql IMMUTABLE AS $$ SELECT (p_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date $$;

-- Is this work inside the teacher's window for the class? See the header.
CREATE OR REPLACE FUNCTION public._teacher_sees_work(p_uid uuid, p_class uuid, p_work_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (SELECT id FROM public.teachers WHERE user_id = p_uid LIMIT 1),
       d AS (SELECT public._hanoi_date(p_work_at) AS day, public._hanoi_date(now()) AS today)
  SELECT p_uid IS NOT NULL AND p_class IS NOT NULL AND EXISTS (SELECT 1 FROM t) AND (
    -- Default teacher: from their first lesson of the class onward.
    (
      (
        EXISTS (SELECT 1 FROM public.classes c, t WHERE c.id = p_class AND c.default_teacher_id = t.id)
        OR EXISTS (
          SELECT 1 FROM t, d,
                 LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(public.class_slots_on(p_class, d.today)) = 'array'
                                                   THEN public.class_slots_on(p_class, d.today) ELSE '[]'::jsonb END) slot
           WHERE slot ->> 'teacherId' = t.id::text)
      )
      AND (SELECT d.day FROM d) >= (
        SELECT min(s.date) FROM public.sessions s, t
         WHERE s.class_id = p_class AND s.teacher_id = t.id AND s.status <> 'Canceled'::public.session_status)
    )
    -- Cover (or any lesson of theirs): the day of a lesson they held.
    OR EXISTS (
      SELECT 1 FROM public.sessions s, t, d
       WHERE s.class_id = p_class AND s.teacher_id = t.id AND s.status <> 'Canceled'::public.session_status
         AND s.date = d.day)
  )
$$;

-- A child of the item is enrolled in its class today and active.
CREATE OR REPLACE FUNCTION public._work_has_active_student(p_class uuid, p_student_ids uuid[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e JOIN public.students st ON st.id = e.student_id
     WHERE e.class_id = p_class AND e.student_id = ANY (p_student_ids) AND st.is_active
       AND e.start_date <= public._hanoi_date(now())
       AND (e.end_date IS NULL OR e.end_date >= public._hanoi_date(now())))
$$;

REVOKE EXECUTE ON FUNCTION public._work_items(), public._hanoi_date(timestamptz),
  public._teacher_sees_work(uuid, uuid, timestamptz), public._work_has_active_student(uuid, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._work_items(), public._hanoi_date(timestamptz),
  public._teacher_sees_work(uuid, uuid, timestamptz), public._work_has_active_student(uuid, uuid[]) TO service_role;

-- ---------------------------------------------------------------- admin
CREATE OR REPLACE FUNCTION public.admin_work_gallery(p_limit integer DEFAULT 1500)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false) THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.work_at DESC), '[]'::jsonb)
            FROM (SELECT * FROM public._work_items() ORDER BY work_at DESC
                   LIMIT greatest(1, least(coalesce(p_limit, 1500), 5000))) i);
END $$;

-- ---------------------------------------------------------------- teacher
CREATE OR REPLACE FUNCTION public.teacher_work_gallery(p_limit integer DEFAULT 1000)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT coalesce(public.has_role(v_uid, 'teacher'::public.app_role), false) THEN
    RAISE EXCEPTION 'Teachers only' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.work_at DESC), '[]'::jsonb)
            FROM (SELECT x.* FROM public._work_items() x
                   WHERE x.class_id IS NOT NULL
                     AND public._work_has_active_student(x.class_id, x.student_ids)
                     AND public._teacher_sees_work(v_uid, x.class_id, x.work_at)
                   ORDER BY x.work_at DESC
                   LIMIT greatest(1, least(coalesce(p_limit, 1000), 3000))) i);
END $$;

-- ---------------------------------------------------------------- a child asks
CREATE OR REPLACE FUNCTION public.request_work_share(p_source text, p_source_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  i record;
  v_student uuid;
  v_share public.work_shares;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501'; END IF;
  IF p_source NOT IN ('student_work', 'homework') THEN
    RAISE EXCEPTION 'This kind of work cannot be shared' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO i FROM public._work_items() x WHERE x.source = p_source AND x.source_id = p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work not found' USING ERRCODE = 'P0002'; END IF;
  IF i.class_id IS NULL THEN RAISE EXCEPTION 'This work has no class yet' USING ERRCODE = '22023'; END IF;
  IF i.file_path IS NULL AND i.external_url IS NULL THEN
    RAISE EXCEPTION 'Nothing to show' USING ERRCODE = '22023';
  END IF;
  IF p_source = 'student_work' AND i.status <> 'approved' THEN
    RAISE EXCEPTION 'Your teacher has not approved this work yet' USING ERRCODE = '22023';
  END IF;
  -- The child's own login, never a family login.
  SELECT st.id INTO v_student FROM public.students st
   WHERE st.id = ANY (i.student_ids) AND (st.linked_user_id = v_uid OR st.secondary_user_id = v_uid)
   LIMIT 1;
  IF v_student IS NULL THEN RAISE EXCEPTION 'Only the child who made this can share it' USING ERRCODE = '42501'; END IF;
  IF NOT public._work_has_active_student(i.class_id, ARRAY[v_student]) THEN
    RAISE EXCEPTION 'You are not in this class now' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.work_shares (source, source_id, class_id, requested_by_student, requested_by)
  VALUES (p_source, p_source_id, i.class_id, v_student, v_uid)
  ON CONFLICT ON CONSTRAINT work_shares_one_per_work DO UPDATE
     SET status = 'pending', requested_by_student = EXCLUDED.requested_by_student,
         requested_by = EXCLUDED.requested_by, requested_at = now(), decided_by = NULL, decided_at = NULL
   WHERE public.work_shares.status = 'declined'
  RETURNING * INTO v_share;
  IF v_share.id IS NULL THEN
    SELECT * INTO v_share FROM public.work_shares WHERE source = p_source AND source_id = p_source_id;
  END IF;
  RETURN jsonb_build_object('id', v_share.id, 'status', v_share.status);
END $$;

CREATE OR REPLACE FUNCTION public.withdraw_work_share(p_share_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_share public.work_shares; i record;
BEGIN
  SELECT * INTO v_share FROM public.work_shares WHERE id = p_share_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO i FROM public._work_items() x WHERE x.source = v_share.source AND x.source_id = v_share.source_id;
  IF v_uid IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.students st
        WHERE st.id = ANY (coalesce(i.student_ids, ARRAY[v_share.requested_by_student]))
          AND (st.linked_user_id = v_uid OR st.secondary_user_id = v_uid)) THEN
    RAISE EXCEPTION 'Only the child who made this can take it back' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.work_shares WHERE id = p_share_id;
END $$;

-- ---------------------------------------------------------------- a teacher decides
CREATE OR REPLACE FUNCTION public.decide_work_share(p_share_id uuid, p_approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_share public.work_shares;
  i record;
  v_new text := CASE WHEN p_approve THEN 'approved' ELSE 'declined' END;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501'; END IF;
  v_admin := coalesce(public.has_role(v_uid, 'admin'::public.app_role), false);
  IF NOT v_admin AND NOT coalesce(public.has_role(v_uid, 'teacher'::public.app_role), false) THEN
    RAISE EXCEPTION 'Staff only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_share FROM public.work_shares WHERE id = p_share_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO i FROM public._work_items() x WHERE x.source = v_share.source AND x.source_id = v_share.source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Work not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT v_admin AND NOT (
       i.class_id = v_share.class_id
       AND public._work_has_active_student(i.class_id, i.student_ids)
       AND public._teacher_sees_work(v_uid, i.class_id, i.work_at)) THEN
    RAISE EXCEPTION 'This work is not one you may decide on' USING ERRCODE = '42501';
  END IF;
  -- pending -> approved | declined; approved -> declined (take it down).
  IF NOT ((v_share.status = 'pending') OR (v_share.status = 'approved' AND NOT p_approve)) THEN
    RAISE EXCEPTION 'This request is already %', v_share.status USING ERRCODE = '22023';
  END IF;
  UPDATE public.work_shares SET status = v_new, decided_by = v_uid, decided_at = now() WHERE id = p_share_id;
  RETURN jsonb_build_object('id', p_share_id, 'status', v_new);
END $$;

-- ---------------------------------------------------------------- class gallery
-- For a child (or their family): approved shares of the classes that child is
-- in now. Names in full; no notes, no marks, no bucket or path.
CREATE OR REPLACE FUNCTION public.class_work_gallery(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT coalesce(public.can_view_student(p_student_id, v_uid), false) THEN
    RAISE EXCEPTION 'Not your child' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT coalesce(jsonb_agg(q.o ORDER BY q.work_at DESC), '[]'::jsonb) FROM (
    SELECT jsonb_build_object(
             'share_id', ws.id, 'class_id', ws.class_id, 'class_name', i.class_name, 'title', i.title,
             'kind', i.kind, 'file_name', i.file_path, 'external_url', i.external_url,
             'students', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', e ->> 'id', 'name', e ->> 'name')), '[]'::jsonb)
                            FROM jsonb_array_elements(i.students) e),
             'work_at', i.work_at, 'is_teamwork', i.is_teamwork) AS o,
           i.work_at AS work_at
      FROM public.work_shares ws
      JOIN public._work_items() i ON i.source = ws.source AND i.source_id = ws.source_id
     WHERE ws.status = 'approved'
       AND EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = p_student_id AND e.class_id = ws.class_id
                      AND e.start_date <= public._hanoi_date(now())
                      AND (e.end_date IS NULL OR e.end_date >= public._hanoi_date(now())))
     ORDER BY i.work_at DESC
     LIMIT 300) q);
END $$;

-- Where the file of an approved share is, for the edge function that serves it.
-- Asks as the caller: the same test as class_work_gallery.
CREATE OR REPLACE FUNCTION public.work_share_file(p_share_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('bucket', i.bucket, 'path', i.file_path)
    FROM public.work_shares ws
    JOIN public._work_items() i ON i.source = ws.source AND i.source_id = ws.source_id
   WHERE ws.id = p_share_id AND ws.status = 'approved' AND i.file_path IS NOT NULL AND auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.enrollments e
                  WHERE e.class_id = ws.class_id
                    AND e.start_date <= public._hanoi_date(now())
                    AND (e.end_date IS NULL OR e.end_date >= public._hanoi_date(now()))
                    AND public.can_view_student(e.student_id, auth.uid()))
$$;

DO $grants$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.admin_work_gallery(integer)', 'public.teacher_work_gallery(integer)',
    'public.request_work_share(text, uuid)', 'public.withdraw_work_share(uuid)',
    'public.decide_work_share(uuid, boolean)', 'public.class_work_gallery(uuid)', 'public.work_share_file(uuid)']
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END
$grants$;

COMMENT ON TABLE public.work_shares IS
  'A child''s request to show one piece of work in the class gallery. pending until a teacher who may see that work (or an admin) approves; only approved ones reach classmates and their families.';

COMMIT;
