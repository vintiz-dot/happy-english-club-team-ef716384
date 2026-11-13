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
--
-- WHAT A FAMILY IS HELD TO (S1 phase 2 review; staff of the class and admins
-- are held to neither - they read the rows themselves):
--   1. THREE OTHER CHILDREN PER SKILL. A skill's row is returned only when
--      at least three children who are NOT in the caller's own family have a
--      total in that skill in the range. The caller knows their own child's
--      totals, so they do not count towards the three: in a class of three
--      that includes their child, "best", the sum and the top list would be
--      the other two children's scores. And the count is per skill, not per
--      class: a skill only one child was assessed in would otherwise come
--      back as best = total = that child's score (on live, 11 of the 48
--      class-month-skill cells since August hold one or two children).
--   2. WHOLE PERIODS ONLY. The range must be all time (both dates NULL) or
--      exactly one calendar month - the two the panels ask for. Any other
--      range returns nothing: with free dates, two overlapping ranges
--      subtract to a single lesson, which is one child's score.
-- What is still knowable, on purpose: the three highest totals of a skill
-- are exact numbers belonging to unnamed children out of at least three
-- the caller cannot tell apart; and someone who asks every day sees the
-- current month's sums grow.
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
           coalesce(public.is_student_enrolled_in_class(auth.uid(), p_class), false) AS family,
           -- All time, or exactly one calendar month.
           (p_from IS NULL AND p_to IS NULL)
             OR coalesce(p_from = date_trunc('month', p_from)::date
                         AND p_to = (date_trunc('month', p_from) + interval '1 month' - interval '1 day')::date, false) AS whole_period
  ),
  per AS (
    -- One total per child and skill. The child's id stops here.
    SELECT sa.student_id, sa.skill::text AS skill, sum(sa.score)::integer AS t
      FROM public.skill_assessments sa, who
     WHERE sa.class_id = p_class
       AND who.uid IS NOT NULL
       AND (who.staff OR (who.family AND who.whole_period))
       AND (p_from IS NULL OR sa.date >= p_from)
       AND (p_to IS NULL OR sa.date <= p_to)
     GROUP BY sa.student_id, sa.skill
  ),
  kids AS (
    -- Which of them the caller already knows: their own family's children.
    SELECT k.student_id, public.is_family_student(k.student_id, who.uid) AS own
      FROM (SELECT DISTINCT student_id FROM per) k, who
  ),
  size AS (SELECT count(*)::integer AS n FROM kids)
  SELECT per.skill,
         max(per.t)::integer,
         sum(per.t)::integer,
         count(*)::integer,
         size.n,
         (array_agg(per.t ORDER BY per.t DESC))[1:3]
    FROM per JOIN kids ON kids.student_id = per.student_id, size, who
   GROUP BY per.skill, size.n, who.staff
  HAVING who.staff OR count(*) FILTER (WHERE NOT kids.own) >= 3
$function$;

REVOKE EXECUTE ON FUNCTION public.get_class_skill_summary(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_skill_summary(uuid, date, date) TO authenticated;

DROP FUNCTION IF EXISTS public.get_class_skill_points(uuid, date, date);

COMMIT;
