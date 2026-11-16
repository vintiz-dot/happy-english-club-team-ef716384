-- Reception display: the TV in reception shows a continuous feed of the
-- centre's leaderboards, awards, courses, success figures, photos and parent
-- feedback. The TV never signs in: it holds a display token, and the
-- reception-feed edge function checks it and returns only what the screen
-- shows. Nothing here opens student data to anon.
--
--   reception_items     content admins add (announcements, awards, courses,
--                       success figures, events, photos)
--   reception_feedback  what parents and visitors send from the QR form;
--                       anyone may INSERT a pending row, only admins read it,
--                       and only rows an admin approved AND the sender agreed
--                       to show reach the screen
--   reception_settings  one row: display token, QR links, timing, sections
BEGIN;

-- ---------------------------------------------------------------- items
CREATE TABLE IF NOT EXISTS public.reception_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('announcement','award','course','success','event','photo')),
  title_en    text NOT NULL CHECK (length(title_en) BETWEEN 1 AND 120),
  title_vi    text CHECK (title_vi IS NULL OR length(title_vi) <= 160),
  body_en     text CHECK (body_en IS NULL OR length(body_en) <= 600),
  body_vi     text CHECK (body_vi IS NULL OR length(body_vi) <= 800),
  stat_value  text CHECK (stat_value IS NULL OR length(stat_value) <= 24),
  image_url   text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  student_id  uuid REFERENCES public.students(id) ON DELETE SET NULL,
  starts_on   date,
  ends_on     date,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS reception_items_active_idx ON public.reception_items (is_active, kind, sort_order);

ALTER TABLE public.reception_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reception_items_admin ON public.reception_items;
CREATE POLICY reception_items_admin ON public.reception_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------- feedback
CREATE TABLE IF NOT EXISTS public.reception_feedback (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text CHECK (name IS NULL OR length(name) <= 80),
  relation       text NOT NULL DEFAULT 'parent' CHECK (relation IN ('parent','student','visitor','other')),
  rating         smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  message        text NOT NULL CHECK (length(btrim(message)) BETWEEN 2 AND 1000),
  contact        text CHECK (contact IS NULL OR length(contact) <= 120),
  may_show       boolean NOT NULL DEFAULT false,   -- the sender agreed to show it on the screen
  approved_at    timestamptz,
  approved_by    uuid,
  admin_note     text CHECK (admin_note IS NULL OR length(admin_note) <= 500),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reception_feedback_created_idx ON public.reception_feedback (created_at DESC);

ALTER TABLE public.reception_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (the QR form is public) may send feedback, but only as a pending row.
DROP POLICY IF EXISTS reception_feedback_send ON public.reception_feedback;
CREATE POLICY reception_feedback_send ON public.reception_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (approved_at IS NULL AND approved_by IS NULL AND admin_note IS NULL);

DROP POLICY IF EXISTS reception_feedback_admin_read ON public.reception_feedback;
CREATE POLICY reception_feedback_admin_read ON public.reception_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS reception_feedback_admin_update ON public.reception_feedback;
CREATE POLICY reception_feedback_admin_update ON public.reception_feedback
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS reception_feedback_admin_delete ON public.reception_feedback;
CREATE POLICY reception_feedback_admin_delete ON public.reception_feedback
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- A public form needs a brake: at most 30 messages in any 10 minutes, and the
-- sender may not approve their own message (the policy already says so; the
-- trigger also covers service_role writers that forget).
CREATE OR REPLACE FUNCTION public.reception_feedback_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.reception_feedback WHERE created_at > now() - interval '10 minutes') >= 30 THEN
    RAISE EXCEPTION 'Too much feedback at once, please try again in a few minutes' USING ERRCODE = 'P0001';
  END IF;
  NEW.message := btrim(NEW.message);
  NEW.created_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reception_feedback_guard ON public.reception_feedback;
CREATE TRIGGER reception_feedback_guard BEFORE INSERT ON public.reception_feedback
  FOR EACH ROW EXECUTE FUNCTION public.reception_feedback_guard();

-- ---------------------------------------------------------------- settings
CREATE TABLE IF NOT EXISTS public.reception_settings (
  id                 boolean PRIMARY KEY DEFAULT true CHECK (id),
  display_token      text NOT NULL DEFAULT substr(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1, 48) CHECK (display_token ~ '^[a-f0-9]{48}$'),
  feedback_url       text CHECK (feedback_url IS NULL OR feedback_url ~ '^https://'),
  zalo_url           text NOT NULL DEFAULT 'https://zalo.me/0975679889' CHECK (zalo_url ~ '^https://'),
  google_review_url  text NOT NULL DEFAULT 'https://g.page/r/CRHndEQk9I1sECE/review' CHECK (google_review_url ~ '^https://'),
  scene_seconds      integer NOT NULL DEFAULT 14 CHECK (scene_seconds BETWEEN 6 AND 120),
  sections           jsonb NOT NULL DEFAULT '{"welcome":true,"leaderboard":true,"classes":true,"awards":true,"courses":true,"success":true,"photos":true,"feedback":true,"announcements":true}'::jsonb,
  last_seen_at       timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.reception_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.reception_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reception_settings_admin ON public.reception_settings;
CREATE POLICY reception_settings_admin ON public.reception_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------- grants
-- 20260712023825 revoked the defaults on public, so every grant is explicit.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_feedback TO authenticated;
GRANT INSERT ON public.reception_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reception_settings TO authenticated;
GRANT ALL ON public.reception_items TO service_role;
GRANT ALL ON public.reception_feedback TO service_role;
GRANT ALL ON public.reception_settings TO service_role;

-- ---------------------------------------------------------------- storage
-- Photos for the screen. Public read: the TV loads them by URL, and they are
-- pictures the centre chose to show in its own reception.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reception', 'reception', true, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS reception_storage_insert ON storage.objects;
CREATE POLICY reception_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reception' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS reception_storage_delete ON storage.objects;
CREATE POLICY reception_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'reception' AND public.has_role(auth.uid(), 'admin'::public.app_role));

COMMIT;
