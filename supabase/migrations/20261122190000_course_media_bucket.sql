-- Course media: the course books' own class videos and audio (Reach Higher's
-- unit videos first), kept in the school's private Cloudflare R2 bucket
-- `hec-files` under the key prefix `course-media/`, instead of being played
-- from a Google Drive folder that anyone could move, unshare or delete.
-- Google Drive stays the backup: a slide falls back to the Drive copy when
-- the R2 copy cannot be read.
--
-- WHO MAY DO WHAT (the hec-files Worker asks public.file_access_can, which
-- evaluates these storage.objects policies as installed, as the caller):
--   read    admin, or role teacher (staff present the decks). Course-book
--           media hold nothing about a child, so the role is the scope here;
--           families and children read none of it.
--   write / replace / delete   admin only. The files are uploaded by the
--           owner's machine (scripts/upload-course-media.mjs), never by the app.
--
-- The bucket row exists so Storage and file_access_can agree on it (private,
-- 300 MB a file, video and audio only). Supabase Storage itself holds none of
-- these files: they are in R2 only, larger than its free 1 GB allows.
--
-- PREFLIGHT / POSTFLIGHT: any other policy that names this bucket stops the
-- paste, because storage policies are OR-ed and one loose policy would open
-- it. Idempotent. Rows / files: none changed.
-- Rollback: DROP POLICY course_media_staff_read, course_media_admin_all ON
-- storage.objects; DELETE FROM storage.buckets WHERE id = 'course-media'.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL
     OR to_regprocedure('public.file_access_can(text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'course media: needs has_role and file_access_can (20261118090000) installed first';
  END IF;
END
$preflight$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-media', 'course-media', false, 314572800, ARRAY['video/mp4', 'audio/mpeg', 'audio/mp4'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS course_media_staff_read ON storage.objects;
CREATE POLICY course_media_staff_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'course-media'
         AND (public.has_role(auth.uid(), 'admin'::public.app_role)
              OR public.has_role(auth.uid(), 'teacher'::public.app_role)));

DROP POLICY IF EXISTS course_media_admin_all ON storage.objects;
CREATE POLICY course_media_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'course-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DO $postflight$
DECLARE
  _odd text;
BEGIN
  SELECT string_agg(policyname, ', ') INTO _odd
    FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname NOT IN ('course_media_staff_read', 'course_media_admin_all')
     AND (coalesce(qual, '') LIKE '%course-media%' OR coalesce(with_check, '') LIKE '%course-media%');
  IF _odd IS NOT NULL THEN
    RAISE EXCEPTION 'course media: other storage policies name the bucket (%); they would widen who may read it', _odd;
  END IF;
END
$postflight$;

COMMIT;
