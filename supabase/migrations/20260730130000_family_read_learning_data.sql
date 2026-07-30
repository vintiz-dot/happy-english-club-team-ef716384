-- Family read access to their children's LEARNING data.
-- ======================================================
-- Parents could already see students/enrollments/invoices/payments, but had
-- ZERO access to the learning side: attendance, points, lesson overviews,
-- learning profiles, CEFR history. The family dashboard and the assistant
-- chatbot both read through the parent's OWN JWT (RLS enforced — the chatbot
-- deliberately has no service-role data path), so these SELECT-only policies
-- are what make a parent able to see their child and ONLY their child.
--
-- All policies are FOR SELECT only — nothing here grants a write.
-- Scoping uses the existing SECURITY DEFINER helper can_view_student(
-- student_id, user_id), the same gate already protecting public.students
-- for family users.

-- Attendance history for their children.
DROP POLICY IF EXISTS "family_read_children_attendance" ON public.attendance;
CREATE POLICY "family_read_children_attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

-- Points earned by their children.
DROP POLICY IF EXISTS "family_read_children_points" ON public.point_transactions;
CREATE POLICY "family_read_children_points" ON public.point_transactions
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

DROP POLICY IF EXISTS "family_read_children_student_points" ON public.student_points;
CREATE POLICY "family_read_children_student_points" ON public.student_points
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

-- The AI-maintained learning journey (summary, strengths, struggles, CEFR).
DROP POLICY IF EXISTS "family_read_children_learning_profiles" ON public.student_learning_profiles;
CREATE POLICY "family_read_children_learning_profiles" ON public.student_learning_profiles
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

-- CEFR assessment history (feeds the growth story).
DROP POLICY IF EXISTS "family_read_children_cefr" ON public.cefr_assessments;
CREATE POLICY "family_read_children_cefr" ON public.cefr_assessments
  FOR SELECT TO authenticated
  USING (public.can_view_student(student_id, auth.uid()));

-- Lesson overviews for classes their children are enrolled in. These are
-- the STUDENT-SAFE summaries (never raw transcripts, never other children's
-- error analyses) — the same content enrolled students already see.
DROP POLICY IF EXISTS "family_read_children_lesson_overviews" ON public.lesson_overviews;
CREATE POLICY "family_read_children_lesson_overviews" ON public.lesson_overviews
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    JOIN public.families f ON f.id = s.family_id
    WHERE e.class_id = lesson_overviews.class_id
      AND f.primary_user_id = auth.uid()
  ));
