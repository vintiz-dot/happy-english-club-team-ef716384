-- Parent share links: a secret link that shows one child's APPROVED video homework, without signing in.
-- Only staff of the child, or the child's own family, can create or revoke a link.
-- The public read goes through the edge function `parent-video-page` (service role), which
-- returns only approved videos and the teacher's final words - never AI drafts.
CREATE TABLE IF NOT EXISTS public.video_parent_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_video_parent_links_student ON public.video_parent_links (student_id);

CREATE OR REPLACE FUNCTION public.can_manage_video_parent_link(p_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_student(p_student, auth.uid())
      OR EXISTS (SELECT 1 FROM public.enrollments e
                 WHERE e.student_id = p_student AND e.end_date IS NULL
                   AND public.video_staff_for_class(e.class_id));
$$;
REVOKE ALL ON FUNCTION public.can_manage_video_parent_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_video_parent_link(uuid) TO authenticated, service_role;

ALTER TABLE public.video_parent_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS video_parent_links_manage ON public.video_parent_links;
CREATE POLICY video_parent_links_manage ON public.video_parent_links
  FOR ALL TO authenticated
  USING (public.can_manage_video_parent_link(student_id))
  WITH CHECK (public.can_manage_video_parent_link(student_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_parent_links TO authenticated;
GRANT ALL ON public.video_parent_links TO service_role;