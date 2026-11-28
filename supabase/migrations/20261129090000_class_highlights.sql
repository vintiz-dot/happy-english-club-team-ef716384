-- Class highlights: short videos of children from a lesson, uploaded by the
-- class's teacher or TA, approved one by one by an admin, then shown on the
-- reception TV (reception-feed reads status = 'approved' and skips any clip
-- naming a child whose family said no: students.reception_video_opt_out).
--
-- Who may do what
--   admin                      everything
--   teacher / TA of the class  insert a PENDING row for that class, read the
--                              class's rows, delete their own still-pending row
--   nobody else                (students and families read nothing)
-- Only an admin updates a row (approve / reject). The teacher/TA link is the
-- one rule public.is_teacher_of_class already holds (default teacher, cover
-- sessions, TA on a session or a standing TA assignment); is_staff_of_class
-- is its name for this feature.
BEGIN;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS reception_video_opt_out boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_staff_of_class(uid uuid, class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL AND public.is_teacher_of_class(uid, class);
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff_of_class(uuid, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_of_class(uuid, uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.class_highlights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id         uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id       uuid NULL REFERENCES public.sessions(id) ON DELETE SET NULL,
  storage_path     text NOT NULL,
  title            text NULL CHECK (title IS NULL OR length(title) <= 120),
  caption_vi       text NULL CHECK (caption_vi IS NULL OR length(caption_vi) <= 300),
  caption_en       text NULL CHECK (caption_en IS NULL OR length(caption_en) <= 300),
  student_ids      uuid[] NOT NULL DEFAULT '{}',
  duration_seconds integer NULL CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 600),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason    text NULL,
  uploaded_by      uuid NOT NULL DEFAULT auth.uid(),
  approved_by      uuid NULL,
  approved_at      timestamptz NULL,
  show_until       date NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_highlights_status_class ON public.class_highlights (status, class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_highlights TO authenticated;
GRANT ALL ON public.class_highlights TO service_role;

-- Tagged children must be enrolled in the clip's class (now).
CREATE OR REPLACE FUNCTION public.class_highlights_check_students()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.student_ids IS NOT DISTINCT FROM OLD.student_ids
     AND NEW.class_id = OLD.class_id THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.student_ids) AS sid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = sid AND e.class_id = NEW.class_id
        AND e.start_date <= CURRENT_DATE
        AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE))
  ) THEN
    RAISE EXCEPTION 'CLASS_HIGHLIGHT: every tagged child must be enrolled in the class'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS class_highlights_check_students ON public.class_highlights;
CREATE TRIGGER class_highlights_check_students
  BEFORE INSERT OR UPDATE ON public.class_highlights
  FOR EACH ROW EXECUTE FUNCTION public.class_highlights_check_students();

-- Who approved and when is set here, never by the client.
CREATE OR REPLACE FUNCTION public.class_highlights_set_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved' THEN
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    ELSE
      NEW.approved_by := OLD.approved_by;
      NEW.approved_at := OLD.approved_at;
    END IF;
  ELSE
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS class_highlights_set_approval ON public.class_highlights;
CREATE TRIGGER class_highlights_set_approval
  BEFORE UPDATE ON public.class_highlights
  FOR EACH ROW EXECUTE FUNCTION public.class_highlights_set_approval();

ALTER TABLE public.class_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_highlights_admin_all ON public.class_highlights;
CREATE POLICY class_highlights_admin_all ON public.class_highlights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS class_highlights_staff_read ON public.class_highlights;
CREATE POLICY class_highlights_staff_read ON public.class_highlights
  FOR SELECT TO authenticated
  USING (public.is_staff_of_class(auth.uid(), class_id));

DROP POLICY IF EXISTS class_highlights_staff_insert ON public.class_highlights;
CREATE POLICY class_highlights_staff_insert ON public.class_highlights
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff_of_class(auth.uid(), class_id)
    AND status = 'pending'
    AND approved_by IS NULL AND approved_at IS NULL
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS class_highlights_staff_delete_pending ON public.class_highlights;
CREATE POLICY class_highlights_staff_delete_pending ON public.class_highlights
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() AND status = 'pending');

-- Private bucket, 40 MB a clip.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('class-highlights', 'class-highlights', false, 41943040, ARRAY['video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Object path: <class_id>/<file>. The first segment is the class.
DROP POLICY IF EXISTS class_highlights_obj_insert ON storage.objects;
CREATE POLICY class_highlights_obj_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'class-highlights'
    AND split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_staff_of_class(auth.uid(), split_part(name, '/', 1)::uuid)
    )
  );

DROP POLICY IF EXISTS class_highlights_obj_select ON storage.objects;
CREATE POLICY class_highlights_obj_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'class-highlights'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        split_part(name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        AND public.is_staff_of_class(auth.uid(), split_part(name, '/', 1)::uuid)
      )
    )
  );

DROP POLICY IF EXISTS class_highlights_obj_delete ON storage.objects;
CREATE POLICY class_highlights_obj_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'class-highlights'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.class_highlights h
        WHERE h.storage_path = storage.objects.name
          AND h.uploaded_by = auth.uid() AND h.status = 'pending')
    )
  );

COMMIT;
