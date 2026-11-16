-- Reception display: picture albums and videos.
--
--   album   a slideshow of pictures (images: [{url, caption}]) with one title
--   video   an uploaded video, a Google Drive video copied into HEC storage
--           (video_source 'upload' / 'drive', video_url), or a YouTube link
--           (video_source 'youtube', youtube_id). The TV's 2016 browser cannot
--           run YouTube's player, so the helper on the centre's PC plays
--           YouTube items in the TV's own YouTube app every
--           reception_settings.youtube_every_minutes, then brings the display
--           back. play_seconds: how long it plays (blank = to the end; a
--           YouTube item needs it, nothing reports when one ends). sound: plays
--           with sound, otherwise muted.
BEGIN;

ALTER TABLE public.reception_items DROP CONSTRAINT IF EXISTS reception_items_kind_check;
ALTER TABLE public.reception_items ADD CONSTRAINT reception_items_kind_check
  CHECK (kind IN ('announcement','award','course','success','event','photo','album','video'));

ALTER TABLE public.reception_items
  ADD COLUMN IF NOT EXISTS images       jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_source text,
  ADD COLUMN IF NOT EXISTS video_url    text,
  ADD COLUMN IF NOT EXISTS youtube_id   text,
  ADD COLUMN IF NOT EXISTS source_url   text,
  ADD COLUMN IF NOT EXISTS play_seconds integer,
  ADD COLUMN IF NOT EXISTS sound        boolean NOT NULL DEFAULT false;

ALTER TABLE public.reception_items DROP CONSTRAINT IF EXISTS reception_items_media_check;
ALTER TABLE public.reception_items ADD CONSTRAINT reception_items_media_check CHECK (
  jsonb_typeof(images) = 'array' AND jsonb_array_length(images) <= 80
  AND (video_source IS NULL OR video_source IN ('upload','drive','youtube'))
  AND (video_url IS NULL OR video_url ~ '^https://')
  AND (youtube_id IS NULL OR youtube_id ~ '^[A-Za-z0-9_-]{11}$')
  AND (source_url IS NULL OR length(source_url) <= 500)
  AND (play_seconds IS NULL OR play_seconds BETWEEN 5 AND 3600)
  -- what each kind needs
  AND (kind <> 'album' OR jsonb_array_length(images) >= 1)
  AND (kind <> 'video' OR (
        (video_source IN ('upload','drive') AND video_url IS NOT NULL)
     OR (video_source = 'youtube' AND youtube_id IS NOT NULL AND play_seconds IS NOT NULL)))
);

ALTER TABLE public.reception_settings
  ADD COLUMN IF NOT EXISTS youtube_every_minutes integer NOT NULL DEFAULT 10;
ALTER TABLE public.reception_settings DROP CONSTRAINT IF EXISTS reception_settings_youtube_every_check;
ALTER TABLE public.reception_settings ADD CONSTRAINT reception_settings_youtube_every_check
  CHECK (youtube_every_minutes BETWEEN 2 AND 240);

-- Videos: public read (the TV streams them by URL), admins write. 250 MB a file.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reception-video', 'reception-video', true, 262144000, ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS reception_video_insert ON storage.objects;
CREATE POLICY reception_video_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reception-video' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS reception_video_delete ON storage.objects;
CREATE POLICY reception_video_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reception-video' AND public.has_role(auth.uid(), 'admin'::public.app_role));

COMMIT;
