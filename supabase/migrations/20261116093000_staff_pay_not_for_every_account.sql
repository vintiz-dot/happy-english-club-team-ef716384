-- F-17 (S2): a staff member's pay rate is not readable by every signed-in
-- account.
--
-- THE DEFECT (audit F-17).
--   1. teacher_rate_on(teacher, date) and assistant_rate_on(ta, date) are
--      SECURITY DEFINER, EXECUTE to authenticated, no check
--      (20261021090000): any account - a parent, a child, a sign-up made a
--      minute ago - gets any teacher's or TA's dated pay rate by id.
--   2. can_view_teacher (20261110140000) returns true for ANY signed-in
--      account when the teacher is the default teacher of an active class,
--      and the teachers row it opens carries hourly_rate_vnd,
--      per_session_rate_vnd and pay_rate_type.
--
-- WHAT THIS DOES
--   1. EXECUTE on the two *_rate_on functions is taken from authenticated
--      (and PUBLIC / anon). Nothing in src/ calls them; calculate-payroll
--      prices on the service role through _lib/pay-history.ts, which keeps
--      its grant. SQL functions that call them run as their owner.
--   2. The "any signed-in account" branch of can_view_teacher becomes "an
--      account that can view a child with an enrollment in a class this
--      teacher leads" - the class's own families keep the row exactly as
--      they had it. The one screen that needed the open branch, the class
--      catalogue a new or inactive child browses (ClassCatalog.tsx), reads
--      name and bio through get_class_catalog_teachers instead: id,
--      full_name, bio of default teachers of ACTIVE classes, and nothing
--      else (no pay, phone or email).
--
-- WHAT THIS DOES NOT DO (deferred, in the evidence): a family of the class
-- still reads its teacher's full row, pay columns included, and every
-- teacher / TA still reads every TA's row (TAs visible to staff). Closing
-- those needs the ~38 family screens that embed teachers(...) moved to a
-- name-and-avatar view first; a column REVOKE would break the admin and
-- staff screens that select those columns as `authenticated`.
--
-- Rows: none changed. Idempotent. Rollback: <!-- rollback F-17 --> in
-- docs/evidence/S2-audit-medium-low.md.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.teacher_rate_on(uuid, date)') IS NULL
     OR to_regprocedure('public.assistant_rate_on(uuid, date)') IS NULL
     OR to_regprocedure('public.can_view_teacher(uuid, uuid)') IS NULL
     OR to_regprocedure('public.is_staff_member(uuid)') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: teacher_rate_on / assistant_rate_on / can_view_teacher / is_staff_member / can_view_student missing';
  END IF;
  -- The teachers row must be guarded by can_view_teacher and nothing wider:
  -- another OR-ed SELECT policy would keep the door open behind this fix.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teachers'
               AND cmd IN ('SELECT', 'ALL')
               AND coalesce(qual, '') !~ '(can_view_teacher|has_role\(auth\.uid\(\), ''admin''|user_id = auth\.uid\(\))') THEN
    RAISE EXCEPTION 'Refusing to install: public.teachers has a SELECT policy this file does not know: %',
      (SELECT string_agg(policyname, ', ') FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teachers'
         AND cmd IN ('SELECT', 'ALL')
         AND coalesce(qual, '') !~ '(can_view_teacher|has_role\(auth\.uid\(\), ''admin''|user_id = auth\.uid\(\))');
  END IF;
END
$preflight$;

-- 1. The rate functions: service role only.
REVOKE EXECUTE ON FUNCTION public.teacher_rate_on(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assistant_rate_on(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_rate_on(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.assistant_rate_on(uuid, date) TO service_role;

-- 2. Who may read a teacher's row.
-- Driven from the caller's own children (a handful of rows: the child's
-- login, second login, the family's primary login - can_view_student's
-- test, written out), then the classes they are or were enrolled in: this
-- teacher leads one of them, or taught a lesson of one. Same answer as
-- "lessons x enrollments, can_view_student per pair", without walking every
-- lesson for every teacher row a family has no class with (S2 review R-2:
-- ~8x slower that way for a family's unfiltered teachers read).
CREATE OR REPLACE FUNCTION public.can_view_teacher(_teacher_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_staff_member(_uid)
    OR EXISTS (
      SELECT 1
        FROM public.students s
        JOIN public.enrollments e ON e.student_id = s.id
       WHERE (s.linked_user_id = _uid OR s.secondary_user_id = _uid
              OR s.family_id IN (SELECT f.id FROM public.families f WHERE f.primary_user_id = _uid))
         AND (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = e.class_id AND c.default_teacher_id = _teacher_id)
              OR EXISTS (SELECT 1 FROM public.sessions x WHERE x.class_id = e.class_id AND x.teacher_id = _teacher_id))
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) TO authenticated, service_role;

-- The class catalogue: name and bio of the teacher who leads each active
-- class, to any signed-in account. Nothing else of the row.
CREATE OR REPLACE FUNCTION public.get_class_catalog_teachers(p_teacher_ids uuid[])
RETURNS TABLE (id uuid, full_name text, bio text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.full_name, t.bio
    FROM public.teachers t
   WHERE auth.uid() IS NOT NULL
     AND t.id = ANY (p_teacher_ids)
     AND EXISTS (SELECT 1 FROM public.classes c WHERE c.default_teacher_id = t.id AND c.is_active)
$$;
REVOKE EXECUTE ON FUNCTION public.get_class_catalog_teachers(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_catalog_teachers(uuid[]) TO authenticated, service_role;

COMMIT;
