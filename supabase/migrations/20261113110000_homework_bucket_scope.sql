-- F-14: homework files - the child's own family, the class's own staff, admins.
--
-- THE DEFECT. The private bucket `homework` (assignment sheets, and children's
-- submitted work: photos of handwriting, sometimes of the child) carried 36
-- policies in production. Storage policies are OR-ed, and three of them were
--   "Students can view all homework files"  has_role(auth.uid(), 'student')
--   "Family can view all homework files"    has_role(auth.uid(), 'family')
--   "Teachers can view all homework files"  has_role(auth.uid(), 'teacher')
-- (20251026083002), plus "Teachers view all homework" (any teachers row) and
-- "Students can read their homework files" (which says yes to any teachers
-- row as well). So every account holding a role - including one self-made on
-- the sign-up form a minute ago - could list and download every child's
-- homework. The careful per-child policies beside them decided nothing.
-- Writes were as loose: any teacher could overwrite any file (three UPDATE
-- policies with no WITH CHECK), any `student` could upload anywhere under
-- submissions/.
--
-- WHAT THE APP WRITES (every upload call in src/, and the 99 live objects):
--   <homework id>/<file>                              teacher, AssignmentUpload.tsx:201      (30 live)
--   assignments/<homework id>/<file>                  admin, ClassHomework.tsx:94            (11 live)
--   submissions/<homework id>/<student id>/<file>     family, HomeworkSubmission.tsx:116     (53 live)
--   homework-submissions/<student id>/<file>          older submissions; nothing writes it   ( 2 live)
-- 3 live objects sit under the id of a homework that no longer exists.
-- Reads are always by the storage_key saved in homework_files /
-- homework_submissions (createSignedUrl / download). No code moves or removes.
--
-- WHAT REPLACES THE 36. Six policies, each `bucket_id = 'homework' AND ...`:
--   homework_admin_all       admins: everything.
--   homework_read            SELECT when homework_object_can_read(name):
--     an assignment file (first two shapes) - staff of the homework's class
--       (role teacher AND is_teacher_of_class: teachers and TAs), or the login
--       of a child enrolled in that class now (can_view_student: the child's
--       own login, second login, or the family's primary login);
--     a submission (third shape) - that child's logins, or staff of the
--       homework's class;
--     an old submission (fourth shape) - that child's logins, or staff of the
--       class of the homework_submissions row that points at the file.
--   homework_staff_insert / _update / _delete   assignment files only, staff of
--     the homework's class. UPDATE checks the old AND the new name.
--   homework_family_insert   a submission, by that child's login, for a
--     homework of a class the child is or was enrolled in.
-- Everything else is admin only: no uid, no link, another family's child, a
-- teacher of another class, a path of any other shape, a homework that does
-- not exist. A family cannot overwrite or delete a submitted file and staff
-- cannot touch a child's submission file (the app does neither).
--
-- NOT TOUCHED: any object (nothing is moved or deleted), the bucket row, the
-- tables homework_files / homework_submissions and their policies, any other
-- bucket. Idempotent. Rollback: docs/evidence/S1-F14-rollback.sql recreates
-- the 36 verbatim.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = 'storage' AND c.relname = 'objects' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'Refusing to install: row level security is not enabled on storage.objects';
  END IF;
  IF to_regclass('public.homeworks') IS NULL OR to_regclass('public.homework_submissions') IS NULL
     OR to_regclass('public.enrollments') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: homeworks / homework_submissions / enrollments missing';
  END IF;
  IF to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: is_teacher_of_class / can_view_student / has_role missing';
  END IF;
END
$preflight$;

-- ------------------------------------------------------------------ helpers
-- All three: the signed-in caller, one object name. NULL-safe, and false for
-- every name that is not one of the shapes above. SECURITY DEFINER because
-- they read homeworks / enrollments / homework_submissions regardless of the
-- caller's own row access; each answers only yes or no about the caller.

CREATE OR REPLACE FUNCTION public.homework_object_can_read(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_seg text[];
  v_class uuid;
  v_student uuid;
  c_uuid constant text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
BEGIN
  IF v_uid IS NULL OR _name IS NULL THEN
    RETURN false;
  END IF;
  v_seg := string_to_array(_name, '/');

  -- An assignment file: <homework>/<file> or assignments/<homework>/<file>.
  IF _name ~ ('^(assignments/)?' || c_uuid || '/[^/]+$') THEN
    SELECT h.class_id INTO v_class FROM public.homeworks h
     WHERE h.id = (CASE WHEN v_seg[1] = 'assignments' THEN v_seg[2] ELSE v_seg[1] END)::uuid;
    IF v_class IS NULL THEN
      RETURN false;
    END IF;
    RETURN (coalesce(public.has_role(v_uid, 'teacher'::public.app_role), false)
            AND coalesce(public.is_teacher_of_class(v_uid, v_class), false))
        OR EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.class_id = v_class
                      AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
                      AND public.can_view_student(e.student_id, v_uid));
  END IF;

  -- A submission: submissions/<homework>/<student>/<file>.
  IF _name ~ ('^submissions/' || c_uuid || '/' || c_uuid || '/[^/]+$') THEN
    v_student := v_seg[3]::uuid;
    IF coalesce(public.can_view_student(v_student, v_uid), false) THEN
      RETURN true;
    END IF;
    SELECT h.class_id INTO v_class FROM public.homeworks h WHERE h.id = v_seg[2]::uuid;
    RETURN v_class IS NOT NULL
       AND coalesce(public.has_role(v_uid, 'teacher'::public.app_role), false)
       AND coalesce(public.is_teacher_of_class(v_uid, v_class), false);
  END IF;

  -- An old submission: homework-submissions/<student>/<file>. The path names
  -- no homework, so staff are let in through the submission row that points
  -- at this exact file.
  IF _name ~ ('^homework-submissions/' || c_uuid || '/[^/]+$') THEN
    v_student := v_seg[2]::uuid;
    IF coalesce(public.can_view_student(v_student, v_uid), false) THEN
      RETURN true;
    END IF;
    RETURN coalesce(public.has_role(v_uid, 'teacher'::public.app_role), false)
       AND EXISTS (SELECT 1 FROM public.homework_submissions hs
                     JOIN public.homeworks h ON h.id = hs.homework_id
                    WHERE hs.storage_key = _name
                      AND hs.student_id = v_student
                      AND public.is_teacher_of_class(v_uid, h.class_id));
  END IF;

  RETURN false;
END;
$function$;

-- Staff writing: assignment files of a class they are on. Nothing else.
CREATE OR REPLACE FUNCTION public.homework_object_staff_can(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_seg text[];
  v_class uuid;
  c_uuid constant text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
BEGIN
  IF v_uid IS NULL OR _name IS NULL THEN
    RETURN false;
  END IF;
  IF NOT coalesce(public.has_role(v_uid, 'teacher'::public.app_role), false) THEN
    RETURN false;
  END IF;
  IF _name !~ ('^(assignments/)?' || c_uuid || '/[^/]+$') THEN
    RETURN false;
  END IF;
  v_seg := string_to_array(_name, '/');
  SELECT h.class_id INTO v_class FROM public.homeworks h
   WHERE h.id = (CASE WHEN v_seg[1] = 'assignments' THEN v_seg[2] ELSE v_seg[1] END)::uuid;
  RETURN v_class IS NOT NULL AND coalesce(public.is_teacher_of_class(v_uid, v_class), false);
END;
$function$;

-- A family handing work in: the child is theirs, and the homework belongs to
-- a class that child is or was enrolled in.
CREATE OR REPLACE FUNCTION public.homework_object_family_can_upload(_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_seg text[];
  c_uuid constant text := '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
BEGIN
  IF v_uid IS NULL OR _name IS NULL THEN
    RETURN false;
  END IF;
  IF _name !~ ('^submissions/' || c_uuid || '/' || c_uuid || '/[^/]+$') THEN
    RETURN false;
  END IF;
  v_seg := string_to_array(_name, '/');
  RETURN coalesce(public.can_view_student(v_seg[3]::uuid, v_uid), false)
     AND EXISTS (SELECT 1 FROM public.homeworks h
                   JOIN public.enrollments e ON e.class_id = h.class_id
                  WHERE h.id = v_seg[2]::uuid AND e.student_id = v_seg[3]::uuid);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.homework_object_can_read(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.homework_object_staff_can(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.homework_object_family_can_upload(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.homework_object_can_read(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homework_object_staff_can(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.homework_object_family_can_upload(text) TO authenticated;

-- ------------------------------------------------------------------ the 36
-- By name, as pg_policies listed them on 13 Nov 2026.
DROP POLICY IF EXISTS "Admins manage all homework files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any homework files" ON storage.objects;
DROP POLICY IF EXISTS "hw_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload any homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload homework submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students upload own homework submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload homework assignments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers upload homework materials" ON storage.objects;
DROP POLICY IF EXISTS "Teaching assistants upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "hw_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "hw_student_insert" ON storage.objects;
DROP POLICY IF EXISTS "hw_teacher_insert" ON storage.objects;
DROP POLICY IF EXISTS "Admins can select homework files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all homework files" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all homework" ON storage.objects;
DROP POLICY IF EXISTS "Families read student homework submissions" ON storage.objects;
DROP POLICY IF EXISTS "Family can view all homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students can read their homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view all homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students can view homework files" ON storage.objects;
DROP POLICY IF EXISTS "Students read own homework submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students view enrolled class assignments" ON storage.objects;
DROP POLICY IF EXISTS "Students view own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and students can read homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view all homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers read homework materials" ON storage.objects;
DROP POLICY IF EXISTS "Teachers read homework submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers view all homework" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers and admins can update homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update homework files" ON storage.objects;
DROP POLICY IF EXISTS "Teaching assistants update homework files" ON storage.objects;
DROP POLICY IF EXISTS "hw_admin_update" ON storage.objects;

DROP POLICY IF EXISTS homework_admin_all ON storage.objects;
DROP POLICY IF EXISTS homework_read ON storage.objects;
DROP POLICY IF EXISTS homework_staff_insert ON storage.objects;
DROP POLICY IF EXISTS homework_staff_update ON storage.objects;
DROP POLICY IF EXISTS homework_staff_delete ON storage.objects;
DROP POLICY IF EXISTS homework_family_insert ON storage.objects;

-- Storage policies are OR-ed: one policy this file does not know about, left
-- standing, would keep the bucket open while this migration reports success.
-- So refuse - and roll everything back - if any other policy still reaches
-- the bucket, or reaches every bucket.
DO $guard$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(quote_ident(policyname), ', ' ORDER BY policyname) INTO v_left
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND (concat_ws(' ', qual, with_check) ~ 'bucket_id = ''homework''(::text)?[ )]'
          OR concat_ws(' ', qual, with_check) !~ 'bucket_id');
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to install: storage.objects still has policies reaching bucket homework that this migration does not know: %. Add them to the DROP list (and to docs/evidence/S1-F14-rollback.sql) first.', v_left;
  END IF;
END
$guard$;

CREATE POLICY homework_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'homework' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'homework' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY homework_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'homework' AND public.homework_object_can_read(name));

CREATE POLICY homework_staff_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework' AND public.homework_object_staff_can(name));

CREATE POLICY homework_staff_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'homework' AND public.homework_object_staff_can(name))
  WITH CHECK (bucket_id = 'homework' AND public.homework_object_staff_can(name));

CREATE POLICY homework_staff_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'homework' AND public.homework_object_staff_can(name));

CREATE POLICY homework_family_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework' AND public.homework_object_family_can_upload(name));

COMMIT;
