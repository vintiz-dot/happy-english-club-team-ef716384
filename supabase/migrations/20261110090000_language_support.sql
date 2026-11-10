-- Language Support: picture sets for ESL readers (Grades 1-3), switched on per class.
--
-- A teacher types sentences, checks the pictures over the words, saves the
-- set, and chooses WHICH OF THEIR CLASSES may read it. Children in those
-- classes (and their families) see it under "Picture Reader". A class with no
-- active set sees nothing at all.
--
-- WHAT THIS ADDS
--   language_support_sets         one set: a title and its approved sentences
--                                 (frozen strips - which pictogram sits over
--                                 which words - so a later change to the
--                                 picture lexicon cannot alter a set a teacher
--                                 already approved).
--   language_support_set_classes  the activation: set x class, with an
--                                 `active` switch so a teacher can pause a
--                                 class without losing the choice.
--   language_support_overrides    a teacher's own pictogram for a concept, so
--                                 fixing "light" once fixes it in every set.
--
-- RULES IT HOLDS
--   1. Only a set's owner (or an admin) edits it.
--   2. A teacher can switch a set on only for a class they teach; the check
--      is the same is_teacher_of_class the rest of the app uses.
--   3. A child or family sees a set only while it is ACTIVE for a class the
--      child is currently enrolled in.
--   4. Pictograms are ARASAAC's (CC BY-NC-SA); the sentences are the
--      teacher's. Nothing here stores a picture, only its ARASAAC id.
--
-- Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS public.language_support_sets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  description    text,
  sentences      jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sentences) = 'array'),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS language_support_sets_owner_idx ON public.language_support_sets (owner_user_id);

CREATE TABLE IF NOT EXISTS public.language_support_set_classes (
  set_id      uuid NOT NULL REFERENCES public.language_support_sets(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (set_id, class_id)
);
CREATE INDEX IF NOT EXISTS language_support_set_classes_class_idx ON public.language_support_set_classes (class_id);

CREATE TABLE IF NOT EXISTS public.language_support_overrides (
  owner_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept        text NOT NULL CHECK (length(btrim(concept)) BETWEEN 1 AND 80),
  pictogram      integer NOT NULL CHECK (pictogram > 0),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_user_id, concept)
);

-- ---------------------------------------------------------------- helpers

-- Is the signed-in person staff for the class (a teacher of it, or an admin)?
CREATE OR REPLACE FUNCTION public.language_support_staff_for_class(p_class uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_teacher_of_class(auth.uid(), p_class)
  );
$$;

-- May the signed-in person read this set as a child or family? Yes while it is
-- active for a class one of their children is enrolled in right now.
CREATE OR REPLACE FUNCTION public.language_support_family_can_read(p_set uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.language_support_set_classes sc
    JOIN public.enrollments e ON e.class_id = sc.class_id AND e.end_date IS NULL
    WHERE sc.set_id = p_set
      AND sc.active
      AND public.can_view_student(e.student_id, auth.uid())
  );
$$;

-- May the signed-in person read this set as staff? The owner, an admin, or a
-- teacher of a class it is switched on for.
CREATE OR REPLACE FUNCTION public.language_support_staff_can_read(p_set uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.language_support_sets s WHERE s.id = p_set AND s.owner_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.language_support_set_classes sc
               WHERE sc.set_id = p_set AND public.is_teacher_of_class(auth.uid(), sc.class_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.language_support_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS language_support_sets_touch ON public.language_support_sets;
CREATE TRIGGER language_support_sets_touch
  BEFORE UPDATE ON public.language_support_sets
  FOR EACH ROW EXECUTE FUNCTION public.language_support_touch();

DROP TRIGGER IF EXISTS language_support_overrides_touch ON public.language_support_overrides;
CREATE TRIGGER language_support_overrides_touch
  BEFORE UPDATE ON public.language_support_overrides
  FOR EACH ROW EXECUTE FUNCTION public.language_support_touch();

-- ---------------------------------------------------------------- policies

ALTER TABLE public.language_support_sets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_support_set_classes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_support_overrides    ENABLE ROW LEVEL SECURITY;

-- Sets: the owner and admins do everything; other teachers of an activated
-- class and families of an enrolled child may read.
DROP POLICY IF EXISTS language_support_sets_owner ON public.language_support_sets;
CREATE POLICY language_support_sets_owner ON public.language_support_sets
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    (owner_user_id = auth.uid()
       AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS language_support_sets_staff_read ON public.language_support_sets;
CREATE POLICY language_support_sets_staff_read ON public.language_support_sets
  FOR SELECT TO authenticated
  USING (public.language_support_staff_can_read(id));

DROP POLICY IF EXISTS language_support_sets_family_read ON public.language_support_sets;
CREATE POLICY language_support_sets_family_read ON public.language_support_sets
  FOR SELECT TO authenticated
  USING (public.language_support_family_can_read(id));

-- Activation: the set's owner may switch it on only for a class they teach
-- (an admin: any class).
DROP POLICY IF EXISTS language_support_set_classes_write ON public.language_support_set_classes;
CREATE POLICY language_support_set_classes_write ON public.language_support_set_classes
  FOR ALL TO authenticated
  USING (
    public.language_support_staff_for_class(class_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.language_support_sets s WHERE s.id = set_id AND s.owner_user_id = auth.uid()))
  )
  WITH CHECK (
    public.language_support_staff_for_class(class_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.language_support_sets s WHERE s.id = set_id AND s.owner_user_id = auth.uid()))
  );

DROP POLICY IF EXISTS language_support_set_classes_staff_read ON public.language_support_set_classes;
CREATE POLICY language_support_set_classes_staff_read ON public.language_support_set_classes
  FOR SELECT TO authenticated
  USING (public.language_support_staff_for_class(class_id));

DROP POLICY IF EXISTS language_support_set_classes_family_read ON public.language_support_set_classes;
CREATE POLICY language_support_set_classes_family_read ON public.language_support_set_classes
  FOR SELECT TO authenticated
  USING (
    active AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.class_id = language_support_set_classes.class_id
        AND e.end_date IS NULL
        AND public.can_view_student(e.student_id, auth.uid())
    )
  );

-- Overrides are private to the teacher who chose them.
DROP POLICY IF EXISTS language_support_overrides_owner ON public.language_support_overrides;
CREATE POLICY language_support_overrides_owner ON public.language_support_overrides
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid()
              AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));

-- ---------------------------------------------------------------- grants
-- 20260712023825 revoked the defaults on public: without these PostgREST
-- reports the tables as missing from the schema cache.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_support_sets        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_support_set_classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_support_overrides   TO authenticated;
GRANT ALL ON public.language_support_sets        TO service_role;
GRANT ALL ON public.language_support_set_classes TO service_role;
GRANT ALL ON public.language_support_overrides   TO service_role;

GRANT EXECUTE ON FUNCTION public.language_support_staff_for_class(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.language_support_family_can_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.language_support_staff_can_read(uuid)  TO authenticated, service_role;

COMMIT;
