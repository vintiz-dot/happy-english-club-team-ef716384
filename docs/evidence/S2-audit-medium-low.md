# S2 - medium and low audit findings

Where I am / next step: edge-function fixes committed (F-04, F-03, F-07, F-08, F-10, F-11, F-12, F-13); now writing the migrations (F-06 first) and their suites.

Branch: worktree-agent-a52234cf99a76ae26 (from claude/hec-conductor-setup-efbaa5 at 5594ca32).
Build and test only: nothing here was applied to the live database, deployed or pushed. The live catalog was NOT read in S2 (brief: no connection); every "before" below is production as the audit (13 Nov) and the repository describe it, and every migration refuses to install if production holds a policy it does not know.

## Rollbacks

Each block is executed by its suite (install it as the "before", paste the fix, run the block, paste the fix again).

<!-- rollback F-06 -->
```sql
-- Puts back the three role-only policies as 20260715090000, 20260507120000
-- and 20260711235255 created them. THIS REOPENS F-06.
BEGIN;
DROP POLICY IF EXISTS "teachers_read_class_learning_profiles" ON public.student_learning_profiles;
DROP POLICY IF EXISTS "teachers_read_learning_profiles" ON public.student_learning_profiles;
CREATE POLICY "teachers_read_learning_profiles" ON public.student_learning_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
DROP POLICY IF EXISTS "Teachers can read all monthly snapshots" ON public.monthly_finance_snapshots;
CREATE POLICY "Teachers can read all monthly snapshots" ON public.monthly_finance_snapshots
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role));
DROP POLICY IF EXISTS "Admins and class staff view monthly leaders" ON public.monthly_leaders;
DROP POLICY IF EXISTS "Admins and teachers view monthly leaders" ON public.monthly_leaders;
CREATE POLICY "Admins and teachers view monthly leaders" ON public.monthly_leaders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));
COMMIT;
```

<!-- rollback F-17 -->
```sql
-- can_view_teacher exactly as 20261110140000 defines it, the rate functions'
-- grants as 20261021090000 left them, and no catalogue function.
-- THIS REOPENS F-17. Ship the ClassCatalog fallback first (it reads the table
-- again when the function is missing).
BEGIN;
CREATE OR REPLACE FUNCTION public.can_view_teacher(_teacher_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_staff_member(_uid)
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.default_teacher_id = _teacher_id AND c.is_active)
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.enrollments e ON e.class_id = s.class_id
      WHERE s.teacher_id = _teacher_id AND public.can_view_student(e.student_id, _uid)
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_rate_on(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assistant_rate_on(uuid, date) TO authenticated, service_role;
DROP FUNCTION IF EXISTS public.get_class_catalog_teachers(uuid[]);
COMMIT;
```
