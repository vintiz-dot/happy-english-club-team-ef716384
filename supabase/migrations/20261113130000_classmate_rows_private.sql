-- F-16: a classmate is a name and a score on the board, not a readable record.
--
-- THE DEFECT. Four row policies let any child's or family's login read whole
-- rows about every child who shares a class with one of theirs:
--   students           "Students can view classmates for leaderboard"
--                      (can_view_classmate) - the full row: date of birth,
--                      phone, email, the school's notes, family_id,
--                      linked_user_id, cash_on_hand, sibling_discount_from;
--   attendance         "Classmates can view attendance" - status and notes;
--   skill_assessments  "Students can view class skill assessments" - scores
--                      and the teacher's comment;
--   point_transactions "Students can view class transactions" - every award,
--                      with its note.
-- Row policies cannot hide columns, and the screens only ever showed a name,
-- an avatar and points.
--
-- WHAT THE BOARDS REALLY USE. The class board a family sees is the edge
-- function class-leaderboard (service role; checks the caller's enrollment;
-- returns id, full_name, avatar_url and the month's points). The display
-- boards and the classic board are staff screens. The video wall is
-- get_class_video_wall. None of them reads through these four policies.
-- student_points stays readable class-wide ("Students can view class
-- leaderboard": numbers only) and is not touched.
--
-- WHAT REPLACES THEM. Each policy keeps its old test and gains one more:
-- the row's child must belong to the caller's own family
-- (is_family_student: the child's login, second login, the family's primary
-- login, or a login linked to a brother or sister). So each new policy is
-- the old one AND a family test - it can only ever return a subset of what
-- the old one returned. Classmates outside the family drop out; a login
-- linked to one child keeps what it could already read about a sibling
-- (5 live accounts rely on exactly that).
--   skill_assessments had no other family read policy at all: its class-wide
--   one was also how a parent read their own child's scores. That is why it
--   is narrowed rather than dropped.
--
-- AND ONE FUNCTION for the two panels that showed class figures to a family:
-- get_class_skill_points(class, from, to) returns student id, name, skill and
-- summed score - no comment, no date, no row id - to the class's current
-- families, its staff and admins. src/lib/classSkillPoints.ts calls it and
-- falls back to the old query, so browser and database can ship in either
-- order.
--
-- WHAT A FAMILY NO LONGER GETS: a classmate's students row, attendance,
-- assessment rows and point history. In the app that is the four tabs of the
-- pop-up opened by tapping a classmate on the board; the pop-up now shows the
-- header (name, avatar, points - what the board already shows) and a line
-- saying the rest is private. Staff and admins: unchanged.
--
-- NOT TOUCHED: any row; can_view_classmate (still used, inside the new
-- students policy); the staff and admin policies; student_points; enrollments;
-- sessions. Idempotent. Rollback: docs/evidence/S1-F16-rollback.sql.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
BEGIN
  IF to_regprocedure('public.can_view_classmate(uuid, uuid)') IS NULL
     OR to_regprocedure('public.is_teacher_of_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.is_student_enrolled_in_class(uuid, uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: can_view_classmate / is_teacher_of_class / is_student_enrolled_in_class / has_role missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'secondary_user_id') THEN
    RAISE EXCEPTION 'Refusing to install: students.secondary_user_id missing';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relname IN ('students', 'attendance', 'skill_assessments', 'point_transactions')
                AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Refusing to install: row level security is off on one of students / attendance / skill_assessments / point_transactions';
  END IF;
END
$preflight$;

-- Is this child in the caller's own family? The family part of
-- can_view_enrollment, on its own. NULL-safe: no uid or no child -> false.
CREATE OR REPLACE FUNCTION public.is_family_student(_student_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT _student_id IS NOT NULL AND _user_id IS NOT NULL AND EXISTS (
    SELECT 1
      FROM public.students s
     WHERE s.id = _student_id
       AND (   s.linked_user_id = _user_id
            OR s.secondary_user_id = _user_id
            OR EXISTS (SELECT 1 FROM public.families f
                        WHERE f.id = s.family_id AND f.primary_user_id = _user_id)
            OR (s.family_id IS NOT NULL
                AND EXISTS (SELECT 1 FROM public.students sibling
                             WHERE sibling.family_id = s.family_id
                               AND (sibling.linked_user_id = _user_id OR sibling.secondary_user_id = _user_id))))
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.is_family_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_family_student(uuid, uuid) TO authenticated;

-- ------------------------------------------------------------------ students
DROP POLICY IF EXISTS "Students can view classmates for leaderboard" ON public.students;
DROP POLICY IF EXISTS "Family logins can view siblings in their classes" ON public.students;
CREATE POLICY "Family logins can view siblings in their classes" ON public.students
  FOR SELECT TO authenticated
  USING (public.is_family_student(id, auth.uid())
         AND public.can_view_classmate(id, auth.uid()));

-- ------------------------------------------------------------------ attendance
DROP POLICY IF EXISTS "Classmates can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Family logins can view siblings attendance" ON public.attendance;
CREATE POLICY "Family logins can view siblings attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.is_family_student(student_id, auth.uid())
         AND (EXISTS ( SELECT 1 FROM ((sessions sess JOIN enrollments viewer_enroll ON ((viewer_enroll.class_id = sess.class_id))) JOIN students viewer ON ((viewer.id = viewer_enroll.student_id))) WHERE ((sess.id = attendance.session_id) AND ((viewer_enroll.end_date IS NULL) OR (viewer_enroll.end_date > CURRENT_DATE)) AND ((viewer.linked_user_id = auth.uid()) OR (viewer.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid()))) OR (viewer.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))))))));

-- ------------------------------------------------------------------ skill_assessments
DROP POLICY IF EXISTS "Students can view class skill assessments" ON public.skill_assessments;
DROP POLICY IF EXISTS "Family logins can view own children skill assessments" ON public.skill_assessments;
CREATE POLICY "Family logins can view own children skill assessments" ON public.skill_assessments
  FOR SELECT TO authenticated
  USING (public.is_family_student(student_id, auth.uid())
         AND (class_id IN ( SELECT DISTINCT e.class_id FROM (enrollments e JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))) OR (s.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));

-- ------------------------------------------------------------------ point_transactions
DROP POLICY IF EXISTS "Students can view class transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Family logins can view own children class transactions" ON public.point_transactions;
CREATE POLICY "Family logins can view own children class transactions" ON public.point_transactions
  FOR SELECT TO authenticated
  USING (public.is_family_student(student_id, auth.uid())
         AND (class_id IN ( SELECT DISTINCT e.class_id FROM (enrollments e JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))) OR (s.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));

-- A policy this file does not know, still handing out classmates' rows, would
-- leave the door open behind a "success". Refuse and roll back if one of the
-- four old ones survives under its name, or if anything on students still
-- calls can_view_classmate without the family test.
DO $guard$
DECLARE
  v_left text;
BEGIN
  SELECT string_agg(tablename || '.' || quote_ident(policyname), ', ' ORDER BY tablename, policyname) INTO v_left
    FROM pg_policies
   WHERE schemaname = 'public'
     AND (   (tablename = 'students' AND policyname = 'Students can view classmates for leaderboard')
          OR (tablename = 'attendance' AND policyname = 'Classmates can view attendance')
          OR (tablename = 'skill_assessments' AND policyname = 'Students can view class skill assessments')
          OR (tablename = 'point_transactions' AND policyname = 'Students can view class transactions')
          OR (tablename IN ('students', 'attendance', 'skill_assessments', 'point_transactions')
              AND concat_ws(' ', qual, with_check) ~ 'can_view_classmate'
              AND concat_ws(' ', qual, with_check) !~ 'is_family_student'));
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to install: classmate row policies still present: %', v_left;
  END IF;
END
$guard$;

-- ------------------------------------------------------------------ class skill figures
-- Name, skill, summed score. Nothing else leaves skill_assessments this way.
CREATE OR REPLACE FUNCTION public.get_class_skill_points(p_class uuid, p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS TABLE (student_id uuid, student_name text, skill text, total integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT sa.student_id, s.full_name, sa.skill::text, sum(sa.score)::integer
    FROM public.skill_assessments sa
    JOIN public.students s ON s.id = sa.student_id
   WHERE sa.class_id = p_class
     AND (p_from IS NULL OR sa.date >= p_from)
     AND (p_to IS NULL OR sa.date <= p_to)
     AND auth.uid() IS NOT NULL
     AND (   coalesce(public.has_role(auth.uid(), 'admin'::public.app_role), false)
          OR coalesce(public.is_teacher_of_class(auth.uid(), p_class), false)
          OR coalesce(public.is_student_enrolled_in_class(auth.uid(), p_class), false))
   GROUP BY sa.student_id, s.full_name, sa.skill
$function$;

REVOKE EXECUTE ON FUNCTION public.get_class_skill_points(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_class_skill_points(uuid, date, date) TO authenticated;

COMMIT;
