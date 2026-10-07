-- Scope the spaced-repetition cards to students the teacher actually teaches.
--
-- THE HOLE
-- srs_cards carried these two policies, from 20260712090000:
--
--   CREATE POLICY "teachers_insert_srs" ON public.srs_cards
--     FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'));
--   CREATE POLICY "teachers_read_srs" ON public.srs_cards
--     FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
--
-- They test the ROLE and nothing else. Not the class, not the student, not
-- even an enrolment. So any teacher could read every flashcard belonging to
-- every child in the school, and write new ones onto any child's deck. A
-- card's front and back are the student's own recorded errors and vocabulary,
-- so this is a child's learning record, not a setting.
--
-- Every other table in that migration is scoped. These two look like they
-- were meant to be and were not.
--
-- THE FIX
-- Route them through can_view_student_in_class, the helper the rest of the
-- schema already uses for exactly this question (20260712024156). It checks
-- for a live enrolment in a class the caller teaches, and it goes through
-- is_teacher_of_class, so these policies inherit the roster/cover time bound
-- from 20261007120000 rather than needing their own copy of it.
--
-- srs_cards has no class_id, only student_id, so the student is the only
-- thing there is to scope on - which is the right scope anyway: the question
-- is whether this child is yours to teach.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'can_view_student_in_class'
  ) THEN
    RAISE EXCEPTION
      'public.can_view_student_in_class is missing; refusing to install policies that depend on it';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'srs_cards'
  ) THEN
    RAISE EXCEPTION 'public.srs_cards does not exist; nothing to scope';
  END IF;
END $$;

DROP POLICY IF EXISTS "teachers_read_srs" ON public.srs_cards;
DROP POLICY IF EXISTS "teachers_insert_srs" ON public.srs_cards;

-- Same two operations as before - teachers seed cards from flagged errors and
-- review class decks - now limited to their own students.
CREATE POLICY "teachers_read_srs" ON public.srs_cards
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    AND public.can_view_student_in_class(student_id, auth.uid())
  );

CREATE POLICY "teachers_insert_srs" ON public.srs_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher')
    AND public.can_view_student_in_class(student_id, auth.uid())
  );

COMMENT ON TABLE public.srs_cards IS
  'Spaced-repetition cards built from a student''s own errors and vocabulary. Teacher access is scoped to students currently enrolled in a class they teach (can_view_student_in_class); it was role-only until 20261007130000, which let any teacher read or write any child''s deck.';