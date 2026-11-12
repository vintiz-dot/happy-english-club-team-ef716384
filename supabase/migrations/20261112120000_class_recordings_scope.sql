-- Teacher Transcripts' lesson audio: only the class's own staff and admins.
--
-- THE DEFECT. 20260717090000 created the private bucket `class-recordings`
-- with ONE policy, "staff_manage_class_recordings": FOR ALL to anyone holding
-- role admin OR role teacher, for the whole bucket. Teaching assistants hold
-- role teacher too, so every teacher and TA could read, overwrite and delete
-- the uploaded lesson audio (children's voices) of every class.
--
-- WHAT REPLACES IT.
--   * admins: everything in the bucket (class_recordings_admin_all);
--   * a teacher or TA (role teacher) may select / insert / update / delete an
--     object only when its path is `<class uuid>/<file>` and
--     is_teacher_of_class says they are on that class - the same predicate
--     the class_transcripts row they create next is checked against
--     (20260712090000 "teachers_manage_class_transcripts"). UPDATE checks the
--     old AND the new name, so an object cannot be moved into, or planted
--     under, another class's folder;
--   * anything else - no uid, no role, a family, a student, a path whose
--     first segment is not a uuid, or that is not exactly two segments -
--     is admin only. Fails closed.
-- The app has always uploaded `${classId}/${crypto.randomUUID()}.${ext}`
-- (src/pages/TeacherTranscripts.tsx:317, unchanged since 9ef15f9), so every
-- object it ever wrote resolves to its class.
--
-- AND ONE CONSTRAINT. transcribe-lesson-audio downloads the row's
-- audio_storage_path with the service role and writes the transcript into
-- that row. Without a link between the path and the row's class, a teacher
-- of class A could point a class-A row at a class-B file and read class B's
-- lesson as text. class_transcripts_audio_path_in_class requires the path's
-- first segment to be the row's class. NOT VALID: rows already there are not
-- re-checked at paste time (the app only ever wrote matching ones; the
-- post-apply probe counts any that do not); every new or changed row is.
--
-- NOT TOUCHED: the bucket row itself (size, types), `class-recorder-audio`,
-- `audit-clips`, any other policy. Idempotent: paste it twice.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = 'storage' AND c.relname = 'objects' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'Refusing to install: row level security is not enabled on storage.objects';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'class_transcripts'
                   AND column_name = 'audio_storage_path') THEN
    RAISE EXCEPTION 'Refusing to install: class_transcripts.audio_storage_path is missing (20260717090000 not applied?)';
  END IF;
END
$preflight$;

-- Is the signed-in caller class staff for this object name? Only for the
-- one shape the app writes; anything else is no. NULL-safe: no uid -> false.
CREATE OR REPLACE FUNCTION public.class_recordings_staff_can(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _name IS NULL THEN false
    WHEN NOT coalesce(public.has_role(auth.uid(), 'teacher'::public.app_role), false) THEN false
    WHEN _name !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[^/]+$' THEN false
    ELSE coalesce(public.is_teacher_of_class(auth.uid(), split_part(_name, '/', 1)::uuid), false)
  END
$function$;

REVOKE EXECUTE ON FUNCTION public.class_recordings_staff_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.class_recordings_staff_can(text) TO authenticated;

DROP POLICY IF EXISTS "staff_manage_class_recordings" ON storage.objects;
DROP POLICY IF EXISTS class_recordings_admin_all ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_select ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_insert ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_update ON storage.objects;
DROP POLICY IF EXISTS class_recordings_staff_delete ON storage.objects;

CREATE POLICY class_recordings_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'class-recordings' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'class-recordings' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY class_recordings_staff_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'class-recordings' AND public.class_recordings_staff_can(name));

CREATE POLICY class_recordings_staff_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-recordings' AND public.class_recordings_staff_can(name));

CREATE POLICY class_recordings_staff_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'class-recordings' AND public.class_recordings_staff_can(name))
  WITH CHECK (bucket_id = 'class-recordings' AND public.class_recordings_staff_can(name));

CREATE POLICY class_recordings_staff_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'class-recordings' AND public.class_recordings_staff_can(name));

ALTER TABLE public.class_transcripts
  DROP CONSTRAINT IF EXISTS class_transcripts_audio_path_in_class;
ALTER TABLE public.class_transcripts
  ADD CONSTRAINT class_transcripts_audio_path_in_class
  CHECK (audio_storage_path IS NULL
         OR (lower(split_part(audio_storage_path, '/', 1)) = class_id::text
             -- exactly <class>/<file>: no further slash or backslash, so
             -- 'A/../B/x.mp3' cannot name another class's file.
             AND audio_storage_path ~ '^[^/\\]+/[^/\\]+$'))
  NOT VALID;

COMMIT;
