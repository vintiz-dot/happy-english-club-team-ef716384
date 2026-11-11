-- Two things for teaching assistants.
--
-- 1. THEY COULD NOT ATTACH A FILE TO HOMEWORK.
--    The app inserts the homeworks row (allowed: hw_teacher_all runs
--    is_teacher_of_class, which knows TAs) and then uploads the file to the
--    `homework` bucket at `<homework id>/<file>`. The only storage INSERT policy
--    that matches that path is "Teachers and admins can upload homework files",
--    which asks for a row in `teachers`. A TA is in `teaching_assistants`, not
--    `teachers`, so the upload was refused. Teachers were never affected.
--    The new policies let a TA write only files that belong to a homework of a
--    class they are on (is_teacher_of_class).
--
-- 2. A TA'S ACCESS ENDED WITH THE SESSIONS THEY WERE MAPPED TO.
--    Assigning "recurring" mapped them to ~3 months of sessions, and the class
--    check only honours sessions from 7 days ago to 60 days ahead. A STANDING
--    assignment says "until I remove them": a row in class_teaching_assistants.
--    It is permanent in is_teacher_of_class, and triggers keep the TA on every
--    future session of the class (new ones as they are generated, existing ones
--    when the row is added) and take them off the future ones when it is removed.
--    Past sessions are never touched, so what was paid or marked stays.

CREATE TABLE IF NOT EXISTS public.class_teaching_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teaching_assistant_id uuid NOT NULL REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT uq_class_ta UNIQUE (class_id, teaching_assistant_id)
);

ALTER TABLE public.class_teaching_assistants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cta_admin_all ON public.class_teaching_assistants;
CREATE POLICY cta_admin_all ON public.class_teaching_assistants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS cta_ta_read_own ON public.class_teaching_assistants;
CREATE POLICY cta_ta_read_own ON public.class_teaching_assistants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teaching_assistants ta
    WHERE ta.id = class_teaching_assistants.teaching_assistant_id
      AND ta.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_teaching_assistants TO authenticated;
GRANT ALL ON public.class_teaching_assistants TO service_role;

CREATE INDEX IF NOT EXISTS idx_cta_ta ON public.class_teaching_assistants (teaching_assistant_id);

-- is_teacher_of_class: the 7-day / 60-day version of 20261007140000 plus a
-- permanent tier for standing TA assignments.
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.default_teacher_id
    WHERE c.id = is_teacher_of_class.class_id
      AND t.user_id = is_teacher_of_class.user_id
  )

  OR EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.teachers t ON t.id = s.teacher_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND t.user_id  = is_teacher_of_class.user_id
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  )

  OR EXISTS (
    SELECT 1
    FROM public.classes c
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(c.schedule_template -> 'weeklySlots') = 'array'
        THEN c.schedule_template -> 'weeklySlots'
        ELSE '[]'::jsonb
      END
    ) AS slot
    JOIN public.teachers t
      ON t.id = (slot ->> 'teacherId')::uuid
    WHERE c.id = is_teacher_of_class.class_id
      AND (slot ->> 'teacherId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND t.user_id = is_teacher_of_class.user_id
  )

  OR EXISTS (
    SELECT 1
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    JOIN public.teaching_assistants ta ON ta.id = sp.teaching_assistant_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND ta.user_id = is_teacher_of_class.user_id
      AND sp.participant_type = 'teaching_assistant'
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  )

  -- Standing assignment: permanent until an admin removes it.
  OR EXISTS (
    SELECT 1
    FROM public.class_teaching_assistants cta
    JOIN public.teaching_assistants ta ON ta.id = cta.teaching_assistant_id
    WHERE cta.class_id = is_teacher_of_class.class_id
      AND ta.user_id = is_teacher_of_class.user_id
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;

-- Keep a standing TA on every session of the class.
CREATE OR REPLACE FUNCTION public.cta_add_to_new_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'Canceled'::public.session_status THEN
    INSERT INTO public.session_participants (session_id, participant_type, teaching_assistant_id)
    SELECT NEW.id, 'teaching_assistant', cta.teaching_assistant_id
    FROM public.class_teaching_assistants cta
    JOIN public.teaching_assistants ta ON ta.id = cta.teaching_assistant_id
    WHERE cta.class_id = NEW.class_id AND ta.is_active
    ON CONFLICT (session_id, teaching_assistant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cta_add_to_new_session() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS cta_new_session ON public.sessions;
CREATE TRIGGER cta_new_session
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.cta_add_to_new_session();

CREATE OR REPLACE FUNCTION public.cta_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.session_participants (session_id, participant_type, teaching_assistant_id)
    SELECT s.id, 'teaching_assistant', NEW.teaching_assistant_id
    FROM public.sessions s
    WHERE s.class_id = NEW.class_id
      AND s.date >= CURRENT_DATE
      AND s.status <> 'Canceled'::public.session_status
    ON CONFLICT (session_id, teaching_assistant_id) DO NOTHING;
    RETURN NEW;
  ELSE
    DELETE FROM public.session_participants sp
    USING public.sessions s
    WHERE sp.session_id = s.id
      AND s.class_id = OLD.class_id
      AND sp.teaching_assistant_id = OLD.teaching_assistant_id
      AND sp.participant_type = 'teaching_assistant'
      AND s.date >= CURRENT_DATE
      AND s.status = 'Scheduled'::public.session_status;
    RETURN OLD;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cta_on_change() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS cta_changed ON public.class_teaching_assistants;
CREATE TRIGGER cta_changed
  AFTER INSERT OR DELETE ON public.class_teaching_assistants
  FOR EACH ROW EXECUTE FUNCTION public.cta_on_change();

-- Homework files for TAs. Path is `<homework id>/<file>` (or assignments/<id>/..).
DROP POLICY IF EXISTS "Teaching assistants upload homework files" ON storage.objects;
CREATE POLICY "Teaching assistants upload homework files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework'
  AND EXISTS (
    SELECT 1 FROM public.teaching_assistants ta
    WHERE ta.user_id = auth.uid() AND ta.is_active
  )
  AND EXISTS (
    SELECT 1 FROM public.homeworks h
    WHERE h.id::text IN ((storage.foldername(name))[1], (storage.foldername(name))[2])
      AND public.is_teacher_of_class(auth.uid(), h.class_id)
  )
);

DROP POLICY IF EXISTS "Teaching assistants update homework files" ON storage.objects;
CREATE POLICY "Teaching assistants update homework files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'homework'
  AND EXISTS (
    SELECT 1 FROM public.homeworks h
    WHERE h.id::text IN ((storage.foldername(name))[1], (storage.foldername(name))[2])
      AND public.is_teacher_of_class(auth.uid(), h.class_id)
  )
  AND EXISTS (SELECT 1 FROM public.teaching_assistants ta WHERE ta.user_id = auth.uid() AND ta.is_active)
);
