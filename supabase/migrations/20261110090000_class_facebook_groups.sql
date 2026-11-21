-- Each class's private Facebook group, for the "Open our class group" link
-- beside an approved homework video's Share to Facebook button.
--
-- Its own table, not a column on classes: "Everyone can view active
-- classes" lets anyone read a class row, and the link to a group full of
-- children's videos is for that class's families and teachers only.
--
-- Admins set it (Class Settings). Readable by admins, the class's teachers
-- and families with a child currently enrolled in the class. Nothing here
-- posts to Facebook - Meta closed its Groups API in 2024; people post
-- themselves from the phone's share sheet.

CREATE TABLE IF NOT EXISTS public.class_facebook_groups (
  class_id   uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  group_url  text NOT NULL
    CONSTRAINT class_facebook_groups_url_check
    CHECK (group_url ~ '^https://(www\.|m\.|web\.)?facebook\.com/groups/[A-Za-z0-9._-]+/?$'),
  updated_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_facebook_groups ENABLE ROW LEVEL SECURITY;

-- 20260712023825 revoked the defaults on public; without these PostgREST
-- reports the table as missing.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_facebook_groups TO authenticated;
GRANT ALL ON public.class_facebook_groups TO service_role;

-- SECURITY DEFINER so the family check does not depend on what the
-- caller may read in enrollments.
CREATE OR REPLACE FUNCTION public.can_view_class_facebook_group(p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_teacher_of_class(auth.uid(), p_class)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = p_class
        AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
        AND public.can_view_student(e.student_id, auth.uid())
    )
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_class_facebook_group(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_class_facebook_group(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_class_facebook_group(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage class Facebook groups" ON public.class_facebook_groups;
CREATE POLICY "Admins manage class Facebook groups"
  ON public.class_facebook_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Class members read their Facebook group" ON public.class_facebook_groups;
CREATE POLICY "Class members read their Facebook group"
  ON public.class_facebook_groups FOR SELECT TO authenticated
  USING (public.can_view_class_facebook_group(class_id));
