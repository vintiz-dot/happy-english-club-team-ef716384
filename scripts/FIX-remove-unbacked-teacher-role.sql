-- FIX-remove-unbacked-teacher-role.sql  (F-01, existing accounts)        WRITES ONE ROW
--
-- Two live accounts hold the role `teacher` with no teachers and no
-- teaching_assistants record behind them (created 2025-10-16 and 2026-03-23).
-- No migration changes an existing account, so each of them can still read
-- what any teacher-role account can: 41 learning profiles, 217 student-work
-- files, the lesson-resources and resources buckets, the staff list (and the
-- 99 homework files until F-14 is applied).
--
-- The owner decides, per account:
--   1. run scripts/CHECK-unlinked-accounts.sql and take an id from the rows
--      marked "1 teacher role, no teacher or assistant record";
--   2. look the id up in Supabase > Authentication > Users;
--   3. if it is not a member of staff, paste ONE of the statements below with
--      that id in place of the zeros.
-- If it IS staff, do neither: create or link their teacher record instead
-- (Admin > Users > link to teacher).
--
-- Each statement can only ever touch that one account, and only while it has
-- no teacher and no assistant record: for a real teacher it changes 0 rows.
-- It returns the row it changed; "0 rows" means nothing was done. The change
-- is recorded by the audit trigger on user_roles.
--
-- To undo: Admin > Users > change role, or
--   INSERT INTO public.user_roles (user_id, role) VALUES ('<the id>', 'teacher');

-- A (recommended when the account is not known to the school): take the role
-- away. The account can still sign in and sees a blank page; it reads nothing.
DELETE FROM public.user_roles ur
 WHERE ur.user_id = '00000000-0000-0000-0000-000000000000'
   AND ur.role = 'teacher'
   AND NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = ur.user_id)
   AND NOT EXISTS (SELECT 1 FROM public.teaching_assistants a WHERE a.user_id = ur.user_id)
RETURNING ur.user_id, ur.role AS removed_role;

-- B (when it is a parent or pupil the school knows, who picked "Teacher" on
-- the form): make it a student. It then sees the new-student page and nothing
-- about any child until the school links it. Fails with a duplicate-key error,
-- changing nothing, if the account already holds `student` too - use A then.
-- UPDATE public.user_roles ur
--    SET role = 'student'
--  WHERE ur.user_id = '00000000-0000-0000-0000-000000000000'
--    AND ur.role = 'teacher'
--    AND NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = ur.user_id)
--    AND NOT EXISTS (SELECT 1 FROM public.teaching_assistants a WHERE a.user_id = ur.user_id)
-- RETURNING ur.user_id, ur.role AS new_role;
