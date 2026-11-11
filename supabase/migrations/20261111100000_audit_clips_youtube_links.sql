-- Audit clips: a clip can now be a link to a public YouTube video instead of
-- an uploaded file. A link stores only the 11-character video id; nothing is
-- downloaded from YouTube and no file is kept.
--
--   source_kind   'file' (as before) or 'youtube'
--   youtube_id    the 11-character id; checked, so a bad value cannot be saved
--   youtube_url   the address the admin pasted, for reference
--   storage_path  now empty for a link
--
-- A row is exactly one of the two: a file has a path and no id, a link has an
-- id and no path. The consent trigger from 20261111090000 covers both.
--
-- Safe to run twice.

BEGIN;

ALTER TABLE public.audit_clips
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS youtube_id  text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

ALTER TABLE public.audit_clips ALTER COLUMN storage_path DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_clips_source_check') THEN
    ALTER TABLE public.audit_clips ADD CONSTRAINT audit_clips_source_check CHECK (
      (source_kind = 'file'    AND storage_path IS NOT NULL AND youtube_id IS NULL)
      OR
      (source_kind = 'youtube' AND storage_path IS NULL
         AND youtube_id ~ '^[A-Za-z0-9_-]{11}$')
    );
  END IF;
  -- Plain, not partial: NULLs are distinct, so files are unaffected.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_clips_one_link_per_child') THEN
    ALTER TABLE public.audit_clips
      ADD CONSTRAINT audit_clips_one_link_per_child UNIQUE (student_id, youtube_id);
  END IF;
END $$;

COMMIT;
