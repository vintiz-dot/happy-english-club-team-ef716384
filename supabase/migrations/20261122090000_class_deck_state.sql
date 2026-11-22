-- Lesson decks round 2 (22 Nov 2026): where each class left off, and which
-- edition a flipbook is.
--
-- class_deck_state: one row per class. The last flipbook page shown, the last
-- lesson deck and slide, and the class's homework interest groups (an interest
-- such as "football" -> the ids of the children who get that edition of the
-- creative homework). Ids only: names stay on the roster. Read and written only by
-- an admin or staff of that class (is_teacher_of_class); the person and time of
-- each change are the server's.
--
-- teacher_flipbooks.edition / page_offset: whether a flipbook is the 1st or 2nd
-- edition of the course book (decks cite 2nd-edition pages and map them for a 1st-
-- edition book), and the flipbook's page index minus the printed page. Staff of a
-- class may now also READ the flipbook linked to that class, so whoever teaches it
-- opens the same book; only its owner (or an admin) still changes it.
--
-- Safe to run twice.

ALTER TABLE public.teacher_flipbooks ADD COLUMN IF NOT EXISTS edition text;
ALTER TABLE public.teacher_flipbooks ADD COLUMN IF NOT EXISTS page_offset int NOT NULL DEFAULT 0;
ALTER TABLE public.teacher_flipbooks DROP CONSTRAINT IF EXISTS teacher_flipbooks_edition;
ALTER TABLE public.teacher_flipbooks ADD CONSTRAINT teacher_flipbooks_edition CHECK (edition IS NULL OR edition IN ('1e', '2e'));
ALTER TABLE public.teacher_flipbooks DROP CONSTRAINT IF EXISTS teacher_flipbooks_page_offset;
ALTER TABLE public.teacher_flipbooks ADD CONSTRAINT teacher_flipbooks_page_offset CHECK (page_offset BETWEEN -100 AND 100);

DROP POLICY IF EXISTS tf_class_staff_read ON public.teacher_flipbooks;
CREATE POLICY tf_class_staff_read ON public.teacher_flipbooks FOR SELECT TO authenticated
  USING (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id));

CREATE TABLE IF NOT EXISTS public.class_deck_state (
  class_id      uuid PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
  flipbook_id   uuid REFERENCES public.teacher_flipbooks(id) ON DELETE SET NULL,
  flipbook_page int,
  deck_id       text,
  slide_index   int,
  interests     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid,
  CONSTRAINT class_deck_state_page CHECK (flipbook_page IS NULL OR flipbook_page BETWEEN 1 AND 2000),
  CONSTRAINT class_deck_state_deck CHECK (deck_id IS NULL OR deck_id ~ '^[a-z0-9-]{1,80}$'),
  CONSTRAINT class_deck_state_slide CHECK (slide_index IS NULL OR slide_index BETWEEN 0 AND 500),
  CONSTRAINT class_deck_state_interests CHECK (jsonb_typeof(interests) = 'object')
);

-- Who changed it and when come from the server. An interest group may hold only
-- children who are, or were, enrolled in this class: a typo or another class's
-- child is refused rather than kept.
CREATE OR REPLACE FUNCTION public.class_deck_state_fill()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k text;
  v jsonb;
  bad int;
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  IF jsonb_typeof(NEW.interests) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Interests must be an object of interest -> student ids' USING ERRCODE = '22023';
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(NEW.interests) LOOP
    IF k !~ '^[a-z][a-z0-9-]{0,30}$' THEN
      RAISE EXCEPTION 'Interest name % is not allowed', k USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(v) <> 'array' THEN
      RAISE EXCEPTION 'Interest % must be a list of student ids', k USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO bad FROM jsonb_array_elements(v) e
     WHERE jsonb_typeof(e) <> 'string'
        OR (e #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        OR NOT EXISTS (SELECT 1 FROM public.enrollments en
                        WHERE en.class_id = NEW.class_id AND en.student_id = (e #>> '{}')::uuid);
    IF bad > 0 THEN
      RAISE EXCEPTION 'Interest % lists a child who is not in this class', k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.class_deck_state_fill() FROM PUBLIC, anon;
DROP TRIGGER IF EXISTS class_deck_state_fill ON public.class_deck_state;
CREATE TRIGGER class_deck_state_fill BEFORE INSERT OR UPDATE ON public.class_deck_state
  FOR EACH ROW EXECUTE FUNCTION public.class_deck_state_fill();

ALTER TABLE public.class_deck_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_deck_state_staff ON public.class_deck_state;
CREATE POLICY class_deck_state_staff ON public.class_deck_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_teacher_of_class(auth.uid(), class_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_teacher_of_class(auth.uid(), class_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_deck_state TO authenticated;
GRANT ALL ON public.class_deck_state TO service_role;
REVOKE ALL ON public.class_deck_state FROM anon;
