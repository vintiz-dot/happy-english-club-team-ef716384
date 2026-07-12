-- =====================================================================
-- Fix 500 errors on homework and homework_submissions for student users
-- These policies replace existing ones that may be crashing during evaluation.
--
-- Root cause: RLS policy evaluation hits a 500 when a referenced table
-- or function doesn't exist, or when there's a circular dependency.
-- This migration uses simple, flat subqueries that avoid cross-table
-- RLS evaluation issues.
-- =====================================================================

-- ----------------------------------------------------------------
-- 1. Fix: homeworks student read policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "hw_student_read" ON public.homeworks;
DROP POLICY IF EXISTS hw_student_read ON public.homeworks;

CREATE POLICY hw_student_read ON public.homeworks
  FOR SELECT
  USING (
    class_id IN (
      SELECT e.class_id
      FROM public.enrollments e
      WHERE e.end_date IS NULL
        AND e.student_id IN (
          SELECT s.id FROM public.students s
          WHERE s.linked_user_id = auth.uid()
        )
    )
    OR
    class_id IN (
      SELECT e.class_id
      FROM public.enrollments e
      WHERE e.end_date IS NULL
        AND e.student_id IN (
          SELECT s.id FROM public.students s
          WHERE s.family_id IN (
            SELECT f.id FROM public.families f
            WHERE f.primary_user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_teacher_of_class(auth.uid(), class_id)
  );

-- ----------------------------------------------------------------
-- 2. Fix: homework_submissions student read policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own submissions" ON public.homework_submissions;

CREATE POLICY "Students can view own submissions" ON public.homework_submissions
  FOR SELECT
  USING (
    -- Direct student login
    student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.linked_user_id = auth.uid()
    )
    -- Family login
    OR student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.family_id IN (
        SELECT f.id FROM public.families f
        WHERE f.primary_user_id = auth.uid()
      )
    )
    -- Admin / teacher fallback
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ----------------------------------------------------------------
-- 3. Fix: homework_submissions student insert policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.homework_submissions;

CREATE POLICY "Students can insert own submissions" ON public.homework_submissions
  FOR INSERT
  WITH CHECK (
    student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.linked_user_id = auth.uid()
    )
    OR student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.family_id IN (
        SELECT f.id FROM public.families f
        WHERE f.primary_user_id = auth.uid()
      )
    )
  );

-- ----------------------------------------------------------------
-- 4. Fix: homework_submissions student update policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Students can update own submissions" ON public.homework_submissions;

CREATE POLICY "Students can update own submissions" ON public.homework_submissions
  FOR UPDATE
  USING (
    student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.linked_user_id = auth.uid()
    )
    OR student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.family_id IN (
        SELECT f.id FROM public.families f
        WHERE f.primary_user_id = auth.uid()
      )
    )
  );

-- ----------------------------------------------------------------
-- 5. Fix: homework_files student read policy
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "hwf_student_read" ON public.homework_files;
DROP POLICY IF EXISTS hwf_student_read ON public.homework_files;

CREATE POLICY hwf_student_read ON public.homework_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homeworks h
      WHERE h.id = homework_files.homework_id
        AND h.class_id IN (
          SELECT e.class_id
          FROM public.enrollments e
          WHERE e.end_date IS NULL
            AND e.student_id IN (
              SELECT s.id FROM public.students s
              WHERE s.linked_user_id = auth.uid()
                 OR s.family_id IN (
                   SELECT f.id FROM public.families f
                   WHERE f.primary_user_id = auth.uid()
                 )
            )
        )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
