-- CHECK-unlinked-accounts.sql  (F-01)                       READ ONLY
--
-- Which sign-in accounts hold a role with nothing behind it? Until
-- 20261113100000 the public "Join the club" form could hand out `teacher`
-- (and, earlier, write 'admin' into the legacy users.role column), so some of
-- these may be people who registered themselves.
--
-- Paste into the Supabase SQL editor. It changes nothing. It prints no name,
-- no email and no phone number: counts first, then account ids with the day
-- they were created and last signed in. Look each id up in
-- Authentication > Users and decide: link it (Admin > Users), leave it, or
-- remove its role. Nothing here deletes or demotes anyone.
--
-- "Linked" means: a teachers or teaching_assistants row with this user_id, a
-- families row with this primary_user_id, or a students row with this
-- linked_user_id / secondary_user_id.

WITH acct AS (
  SELECT u.id,
         u.created_at,
         u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now())                     AS banned,
         u.email_confirmed_at IS NOT NULL                                              AS confirmed,
         lower(btrim(coalesce(u.raw_user_meta_data ->> 'role', '')))                  AS asked_for,
         coalesce((SELECT array_agg(r.role::text ORDER BY r.role::text)
                     FROM public.user_roles r WHERE r.user_id = u.id), '{}')           AS roles,
         (SELECT pu.role::text FROM public.users pu WHERE pu.id = u.id)                AS legacy_role,
         EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = u.id)               AS is_teacher_row,
         EXISTS (SELECT 1 FROM public.teaching_assistants a WHERE a.user_id = u.id)    AS is_ta_row,
         EXISTS (SELECT 1 FROM public.families f WHERE f.primary_user_id = u.id)       AS has_family,
         EXISTS (SELECT 1 FROM public.students s
                  WHERE s.linked_user_id = u.id OR s.secondary_user_id = u.id)         AS has_student
    FROM auth.users u
), flagged AS (
  SELECT a.*,
         CASE
           WHEN 'teacher' = ANY (roles) AND NOT is_teacher_row AND NOT is_ta_row
             THEN '1 teacher role, no teacher or assistant record'
           WHEN 'family' = ANY (roles) AND NOT has_family AND NOT has_student
             THEN '2 family role, no family and no child'
           WHEN 'admin' = ANY (roles)
             THEN NULL                       -- admins are not expected to be linked
           WHEN roles = '{}' AND NOT (is_teacher_row OR is_ta_row OR has_family OR has_student)
             THEN '5 no role and linked to nothing'
           WHEN NOT (is_teacher_row OR is_ta_row OR has_family OR has_student)
             THEN '3 student role, linked to nothing'
         END AS finding,
         -- Separate question: the legacy column says admin, user_roles does not.
         (legacy_role = 'admin' AND NOT ('admin' = ANY (roles))) AS legacy_admin_only
    FROM acct a
)
-- ---------------------------------------------------------------- 1. counts
SELECT 'COUNT' AS kind, finding AS what, count(*)::text AS n, NULL::uuid AS account_id,
       NULL::date AS created, NULL::date AS last_sign_in, NULL::text AS detail
  FROM flagged WHERE finding IS NOT NULL GROUP BY finding
UNION ALL
SELECT 'COUNT', '4 legacy users.role = admin without the admin role', count(*)::text, NULL, NULL, NULL, NULL
  FROM flagged WHERE legacy_admin_only
UNION ALL
SELECT 'COUNT', '0 all accounts', count(*)::text, NULL, NULL, NULL, NULL FROM flagged
-- ---------------------------------------------------------------- 2. the accounts
UNION ALL
SELECT 'ACCOUNT', finding, NULL, id, created_at::date, last_sign_in_at::date,
       'roles=' || array_to_string(roles, '+') || CASE WHEN roles = '{}' THEN '(none)' ELSE '' END
       || ' asked_for=' || CASE WHEN asked_for IN ('student', 'teacher', 'family', 'admin') THEN asked_for
                                WHEN asked_for = '' THEN '(nothing)' ELSE '(other)' END
       || CASE WHEN banned THEN ' BANNED' ELSE '' END
       || CASE WHEN NOT confirmed THEN ' email-unconfirmed' ELSE '' END
  FROM flagged WHERE finding IS NOT NULL
UNION ALL
SELECT 'ACCOUNT', '4 legacy users.role = admin without the admin role', NULL, id, created_at::date, last_sign_in_at::date,
       'roles=' || array_to_string(roles, '+') || CASE WHEN roles = '{}' THEN '(none)' ELSE '' END
       || CASE WHEN has_family OR has_student THEN ' linked-to-a-family-or-child' ELSE ' linked-to-nothing' END
  FROM flagged WHERE legacy_admin_only
ORDER BY 1 DESC, 2, 5;
