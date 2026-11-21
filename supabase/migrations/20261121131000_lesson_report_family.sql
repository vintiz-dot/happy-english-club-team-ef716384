-- Lesson reports, stage B: what a parent and a child read.
-- Builds on the contract (20261121130000_lesson_reports.sql; read its WHO SEES WHAT).
--
-- WHO SEES WHAT
--   get_lesson_reports_for_student(child)
--       Only when can_view_student(child, caller): that child's parent, the
--       child's own login, staff. One row per APPROVED report of a lesson of a
--       class the child was enrolled in ON THE LESSON'S DATE (a child who
--       joined later, or a class they were never in, gives nothing). Each row
--       carries the class part and THAT child's own part (or null), the photos
--       the teacher ticked to share (ids and the approved captions only) and
--       the review homework id. NEVER staff_part, never another child's part,
--       never a draft. The class part is also stripped of the staff-only keys
--       the contract says it never holds, in case a writer slips one in.
--   lesson_report_file(kind, id, child) -> {bucket, path} or null
--       'photo': a photo listed in an approved report's photo_ids, for a
--                lesson of a class the child was enrolled in that day, and
--                can_view_student. Staff of the lesson may fetch any of its
--                photos (the child is then ignored).
--       'work':  a student_work id listed in THAT child's own part work_ids,
--                and owned by that child (student_id, or a teamwork member),
--                and can_view_student.
--       The edge function `lesson-report-file` asks this AS THE CALLER and
--       only then reads the object with the service key. No storage policy
--       is added for families.
--
-- Idempotent. Rows changed: none. Rollback: drop the two functions.

DO $pre$
BEGIN
  IF to_regclass('public.lesson_reports') IS NULL
     OR to_regclass('public.lesson_report_students') IS NULL
     OR to_regclass('public.lesson_report_photos') IS NULL
     OR to_regprocedure('public.lesson_report_staff_can(uuid)') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs the lesson reports contract (20261121130000) and can_view_student';
  END IF;
END
$pre$;

-- Keys a family must never receive, whichever part they turn up in.
CREATE OR REPLACE FUNCTION public._lesson_report_family_clean(p jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(p) = 'object'
    THEN p - 'gaps' - 'name_moments' - 'name_moments_accepted' - 'sources' - 'students'
           - 'quiz' - 'model' - 'usage' - 'staff_part' - 'evidence'
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.get_lesson_reports_for_student(p_student uuid, p_limit integer DEFAULT 20,
  p_before date DEFAULT NULL)
RETURNS TABLE (
  report_id uuid, session_id uuid, session_date date, start_time time, class_id uuid, class_name text,
  class_part jsonb, part jsonb, photos jsonb, review_homework_id uuid, approved_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL OR p_student IS NULL
     OR NOT coalesce(public.can_view_student(p_student, auth.uid()), false) THEN
    RAISE EXCEPTION 'Not your child' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, s.id, s.date, s.start_time, s.class_id, c.name::text,
         -- objectives reach a family as text and met state only, never the evidence
         CASE WHEN jsonb_typeof(r.class_part -> 'objectives') = 'array'
              THEN jsonb_set(public._lesson_report_family_clean(r.class_part), '{objectives}',
                     (SELECT coalesce(jsonb_agg(CASE WHEN jsonb_typeof(o) = 'object' THEN o - 'evidence' ELSE o END
                                                ORDER BY n), '[]'::jsonb)
                        FROM jsonb_array_elements(r.class_part -> 'objectives') WITH ORDINALITY AS x(o, n)))
              ELSE public._lesson_report_family_clean(r.class_part) END,
         public._lesson_report_family_clean(ls.part),
         (SELECT coalesce(jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'caption', r.class_part -> 'photo_captions' -> (p.id::text) ->> 'caption',
                    'caption_vi', r.class_part -> 'photo_captions' -> (p.id::text) ->> 'caption_vi')
                  ORDER BY u.n), '[]'::jsonb)
            FROM unnest(r.photo_ids) WITH ORDINALITY AS u(pid, n)
            JOIN public.lesson_report_photos p ON p.id = u.pid AND p.session_id = r.session_id),
         r.review_homework_id, r.approved_at
    FROM public.lesson_reports r
    JOIN public.sessions s ON s.id = r.session_id
    LEFT JOIN public.classes c ON c.id = s.class_id
    LEFT JOIN public.lesson_report_students ls ON ls.report_id = r.id AND ls.student_id = p_student
   WHERE EXISTS (SELECT 1 FROM public.enrollments e
                  WHERE e.student_id = p_student AND e.class_id = s.class_id
                    AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date))
     AND (p_before IS NULL OR s.date < p_before)
   ORDER BY s.date DESC, s.start_time DESC
   LIMIT greatest(1, least(coalesce(p_limit, 20), 60));
END $$;

-- Where a file of a report is, for the edge function that serves it. plpgsql so
-- it installs before student_work is known to the planner.
CREATE OR REPLACE FUNCTION public.lesson_report_file(p_kind text, p_id uuid, p_student uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_path text;
BEGIN
  IF v_uid IS NULL OR p_id IS NULL THEN RETURN NULL; END IF;

  IF p_kind = 'photo' THEN
    SELECT p.storage_path INTO v_path
      FROM public.lesson_report_photos p
     WHERE p.id = p_id
       AND (
         public.lesson_report_staff_can(p.session_id)
         OR (p_student IS NOT NULL
             AND coalesce(public.can_view_student(p_student, v_uid), false)
             AND EXISTS (SELECT 1 FROM public.lesson_reports r
                          JOIN public.sessions s ON s.id = r.session_id
                         WHERE r.session_id = p.session_id AND p.id = ANY (r.photo_ids)
                           AND EXISTS (SELECT 1 FROM public.enrollments e
                                        WHERE e.student_id = p_student AND e.class_id = s.class_id
                                          AND e.start_date <= s.date
                                          AND (e.end_date IS NULL OR e.end_date >= s.date)))));
    RETURN CASE WHEN v_path IS NULL THEN NULL ELSE jsonb_build_object('bucket', 'lesson-photos', 'path', v_path) END;
  END IF;

  IF p_kind = 'work' THEN
    IF p_student IS NULL OR NOT coalesce(public.can_view_student(p_student, v_uid), false) THEN RETURN NULL; END IF;
    SELECT w.storage_path INTO v_path
      FROM public.student_work w
     WHERE w.id = p_id AND w.storage_path IS NOT NULL
       AND (w.student_id = p_student OR (w.is_teamwork AND p_student = ANY (w.member_student_ids)))
       AND EXISTS (SELECT 1 FROM public.lesson_report_students ls
                    JOIN public.lesson_reports r ON r.id = ls.report_id
                    JOIN public.sessions s ON s.id = r.session_id
                   WHERE ls.student_id = p_student
                     AND jsonb_typeof(ls.part -> 'work_ids') = 'array'
                     AND (ls.part -> 'work_ids') ? (p_id::text)
                     AND EXISTS (SELECT 1 FROM public.enrollments e
                                  WHERE e.student_id = p_student AND e.class_id = s.class_id
                                    AND e.start_date <= s.date
                                    AND (e.end_date IS NULL OR e.end_date >= s.date)));
    RETURN CASE WHEN v_path IS NULL THEN NULL ELSE jsonb_build_object('bucket', 'student-work', 'path', v_path) END;
  END IF;

  RETURN NULL;
END $$;

DO $g$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.get_lesson_reports_for_student(uuid, integer, date)',
    'public.lesson_report_file(text, uuid, uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END
$g$;
REVOKE ALL ON FUNCTION public._lesson_report_family_clean(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._lesson_report_family_clean(jsonb) TO authenticated, service_role;
