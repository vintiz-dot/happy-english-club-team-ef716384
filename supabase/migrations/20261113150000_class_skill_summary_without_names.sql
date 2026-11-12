-- Class skill figures for a family: a summary, with no child named.
--
-- WHAT THIS CLOSES (S1 review, F-16 a). 20261113130000 took classmates'
-- skill_assessments rows away from families and, so that a child's own panels
-- could still show "class best", "class average" and the top three, added
-- get_class_skill_points(class, from, to). That function returns EVERY
-- classmate's per-skill total with their id and name to every family of the
-- class: the same figures the classmate pop-up's skills chart used to draw,
-- one RPC call away, while the pop-up now says skills are private.
--
-- WHAT REPLACES IT. get_class_skill_summary(class, from, to): one row per
-- skill - the best total, the sum and the number of children it is over (for
-- the average), the number of children in the class with any assessment in
-- the range, and the three highest totals as bare numbers. No id, no name,
-- and nothing that ties one skill's figures to another's, so a classmate's
-- profile cannot be put back together from it.
--   A class where fewer than three children have assessments in the range
--   returns nothing to a family: a "best" or an "average" over one or two
--   children is that child's own score. Staff of the class and admins are
--   not held to that (they read the rows themselves).
-- Same door as before: admins, staff of the class, families with a child
-- enrolled in it now. Everyone else gets no rows.
--
-- get_class_skill_points is DROPPED. The browser (src/lib/classSkillPoints.ts)
-- asks for the summary first and falls back, so it works before and after
-- this file. A child's own totals were never read through either function:
-- the panels read the child's own rows, which the family may.
--
-- ORDER. After 20261113130000 (the preflight insists). Paste the two
-- together: between them a family can still call get_class_skill_points.
-- Do not paste 20261113130000 again after this file - it would bring the
-- named function back; if that happens, paste this file again.
-- NOT TOUCHED: any row, any policy. Idempotent.
-- Rollback: the fenced block marked "rollback class-skill-summary" in
-- docs/evidence/S1-security-fixes.md (recreates get_class_skill_points
-- exactly as 20261113130000 defines it and drops the summary).

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.is_family_student(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: 20261113130000 (classmate rows private) is not applied - is_family_student is missing';
  END IF;
  IF to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.is_student_enrolled_in_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: is_teacher_of_class / is_student_enrolled_in_class / has_role missing';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.get_class_skill_summary(p_class uuid, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE (skill text, best integer, total integer, students integer, class_students integer, top integer[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH who AS (
    SELECT auth.uid() AS uid,
           coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)
             OR coalesce(public.is_teacher_of_class(auth.uid(), p_class), false) AS staff,
           coalesce(public.is_student_enrolled_in_class(auth.uid(), p_class), false) AS family
  ),
  per AS (
    -- One total per child and skill. The child's id stops here.
    SELECT sa.student_id, sa.skill::text AS skill, sum(sa.score)::integer AS t
      FROM public.skill_assessments sa, who
     WHERE sa.class_id = p_class
       AND who.uid IS NOT NULL
       AND (who.staff OR who.family)
       AND (p_from IS NULL OR sa.date >= p_from)
       AND (p_to IS NULL OR sa.date <= p_to)
     GROUP BY sa.student_id, sa.skill
  ),
  size AS (SELECT count(DISTINCT student_id)::integer AS n FROM per)
  SELECT per.skill,
         max(per.t)::integer,
         sum(per.t)::integer,
         count(*)::integer,
         size.n,
         (array_agg(per.t ORDER BY per.t DESC))[1:3]
    FROM per, size, who
   WHERE who.staff OR size.n >= 3
   GROUP BY per.skill, size.n
$function$;

REVOKE EXECUTE ON FUNCTION public.get_class_skill_summary(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_skill_summary(uuid, date, date) TO authenticated;

DROP FUNCTION IF EXISTS public.get_class_skill_points(uuid, date, date);

COMMIT;
