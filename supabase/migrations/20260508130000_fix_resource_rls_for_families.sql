-- Fix resource hub RLS policies to support family users
-- Family users have auth.uid() = families.primary_user_id, not students.linked_user_id
-- This migration updates the student SELECT policies to check both paths.

-- ----------------------------------------------------------------
-- Drop existing student policies
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view shared resources for their classes" ON public.resources;
DROP POLICY IF EXISTS "Students can view resource access for their classes" ON public.resource_class_access;

-- ----------------------------------------------------------------
-- Recreate: Students/Family users can view SHARED resources
-- ----------------------------------------------------------------
CREATE POLICY "Students can view shared resources for their classes"
  ON public.resources FOR SELECT
  USING (
    visibility = 'shared'
    AND EXISTS (
      SELECT 1 FROM public.resource_class_access rca
      JOIN public.enrollments e ON e.class_id = rca.class_id
      JOIN public.students s ON s.id = e.student_id
      WHERE rca.resource_id = resources.id
        AND e.end_date IS NULL
        AND (
          -- Direct student login
          s.linked_user_id = auth.uid()
          -- Family login
          OR s.family_id IN (
            SELECT f.id FROM public.families f
            WHERE f.primary_user_id = auth.uid()
          )
        )
    )
  );

-- ----------------------------------------------------------------
-- Recreate: Students/Family users can read resource_class_access
-- ----------------------------------------------------------------
CREATE POLICY "Students can view resource access for their classes"
  ON public.resource_class_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      WHERE e.class_id = resource_class_access.class_id
        AND e.end_date IS NULL
        AND (
          s.linked_user_id = auth.uid()
          OR s.family_id IN (
            SELECT f.id FROM public.families f
            WHERE f.primary_user_id = auth.uid()
          )
        )
    )
  );
