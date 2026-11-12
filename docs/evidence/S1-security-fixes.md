# S1 security fixes (F-01, F-14, F-15, F-16, F-21, F-02)

**Where I am / next step:** 13 Nov 2026. F-01, F-14 and F-15 are built, tested and written up below (three migrations, three suites). Next: F-16 (classmates' rows), then F-21, then F-02.

Build and test only. **Nothing here has been applied to live, deployed or pushed.** The live database was read read-only (catalog, aggregate counts). No row about a person was selected; no secret was read.

Each fix is its own migration so the owner can approve, and the conductor apply, one at a time. They do not depend on each other and can be pasted in any order; the recommended order is the order below.

| Finding | Migration | Suite (`node scripts/pgtest/run.mjs`) | Code that ships with it |
|---|---|---|---|
| F-01 | `supabase/migrations/20261113100000_signup_role_from_server_only.sql` | `signup-role.test.mjs` (77) | `src/pages/Auth.tsx` (form offers Student / Family only); `student-create-migration-account` (upsert) |
| F-14 | `supabase/migrations/20261113110000_homework_bucket_scope.sql` | `homework-bucket-scope.test.mjs` (141) | none |
| F-15 | `supabase/migrations/20261113120000_pause_enrollment_admin_only.sql` | `pause-enrollment.test.mjs` | none |

---

## F-01 - a sign-up never gets a role because the browser asked for it

### How real accounts get their roles today (read from the code)

| Flow | Where | What it sends to Auth | What gives the role |
|---|---|---|---|
| "Join the club" form | `src/pages/Auth.tsx:172-176` | `signUp({ options: { data: { role } } })`, role picked from Student / Teacher / Family / Admin | the trigger `on_auth_user_created -> handle_new_user`, from that metadata |
| Admin creates a teacher | `create-teacher/index.ts:72-92` | `admin.createUser({ user_metadata: { role: "teacher" } })` | the trigger (teacher); the function's own `user_roles` insert then hits the unique key and is ignored ("Continue anyway") |
| Admin creates a TA | `create-teaching-assistant/index.ts:68-82` | the same, `teacher` | the same |
| Admin creates an admin | `manage-admin-users/index.ts:318-336` | `user_metadata: { role: "admin" }` | trigger downgrades to `student`; the function inserts `admin` -> `{admin, student}` |
| First admin (bootstrap) | `manage-admin-users/index.ts:97-120` | no metadata | trigger `student`; function inserts `admin` |
| Front-desk access card | `manage-student-access/index.ts:155-163, 372-406` | `user_metadata: { created_by_front_desk, student_name }` (no role) | trigger `student`; function upserts `student`; links `students.linked_user_id` for every active sibling (the shared family login) |
| Card redeemed | `redeem-access-code` | sets a password on that account | no role change |
| Admin links an existing account to a child | `link-student-user/index.ts:304-314` | - | inserts `student` only if the account has no role at all |
| Admin links an account to a teacher record / family | `manage-admin-users` `linkToTeacher` (:574, upserts `teacher`), `linkToFamily` (:600, no role change) | - | as stated |
| Admin changes a role | `manage-admin-users` `updateRole` (:640-652) | - | delete all, insert one |
| Child makes a second login ("claim") | `student-create-migration-account/index.ts:137-186` | `user_metadata: { role: "student", ... }` | trigger `student`; then a PLAIN insert of `student` -> unique violation -> the function deletes the account. **Broken today, before any change here** (0 live accounts carry `migrated_from_user_id`). Fixed in code as an upsert; needs a deploy to take effect. |
| Demo student | `manage-demo-student/index.ts:138-161` | `role: "student"` | deletes the roles, inserts `student` |

The trigger cannot tell a public sign-up from `auth.admin.createUser`: GoTrue performs both inserts as the same database role, and at insert time nothing on the row is server-only except `raw_app_meta_data`, which no function here sets. So the rule has to be one that is right for both.

### Live counts (13 Nov 2026, aggregates only)

- 76 accounts. Roles held in `user_roles`: `teacher` 8, `admin` 3, **`family` 0**, the rest `student` (2 banned accounts hold none).
- **2** accounts hold `teacher` with no `teachers` and no `teaching_assistants` row (created 2025-10-16 and 2026-03-23; the audit's two).
- **0** accounts hold `family` with no family - because nobody holds `family` at all. Every family login in production holds `student` and reaches its children through `families.primary_user_id` / `students.linked_user_id`.
- **15** accounts hold `student` and are linked to nothing (no teacher/TA record, no family, no child).
- **17** accounts carry the legacy column `public.users.role = 'admin'` without holding the admin role (an earlier trigger copied the form's value there). 14 of them are linked to a family or child, 3 to nothing. That column decided one live policy: see below.
- Email confirmation is on; all 76 are confirmed.

`scripts/CHECK-unlinked-accounts.sql` gives the owner the same counts and then the account ids with creation and last sign-in dates (no email, name or phone). Read-only. The suite runs it.

### What an unlinked `student` / `family` account can read today

Read from every policy in `public` (323) and on `storage.objects` (87):

- About a child: **nothing in any table.** Every policy on a table that holds child data asks for a link: `can_view_student` / `linked_user_id` / `families.primary_user_id`, an enrollment of the caller's own child (`can_view_classmate`, `is_student_enrolled_in_class`, `is_enrolled_in_class`), or staff of the class.
- About a child, in storage: **every file in the `homework` bucket** (`has_role(.., 'student')` / `'family'`). This is F-14 and its migration closes it. No other bucket has a policy an unlinked account passes (the `resources` bucket lets any account use its own folder).
- Not about children: active classes (name, timetable template, rates) - `"Everyone can view active classes"`; active avatars; active announcements; a teacher's row when they are the default teacher of an active class (`can_view_teacher`, F-17: includes pay rate); `payroll_periods` (F-20); its own `users` / `profiles` / `user_roles` rows; `xp_settings`, `custom_quests`. With the `family` role also `bank_info` (the school's payment details).
- Through functions: nothing about a child. The SECURITY DEFINER readers each check (`get_student_homeworks`, `get_video_*`, `get_class_video_wall`, `session_held_evidence`); the unchecked ones are yes/no helpers and timetable slots (F-20, F-17 - table in F-15 below).

So after F-14 a just-registered account sees no child's data. Nothing else needed closing for F-01 except the `custom_quests` policy below. (F-17's teacher row and F-20's items are open and not part of this batch.)

### The decision

`handle_new_user` no longer treats client metadata as an authority:

| The sign-up asked for | Before | After |
|---|---|---|
| `teacher` (any case / padding) | `user_roles`: **teacher**; `users.role`: teacher | **no role row**; `users.role`: student |
| `admin` | student (downgraded) | **no role row** |
| `family` | **family** | student |
| `student`, nothing, `null` | student | student |
| a value that is not a role (`"headmaster"`, a number, an object) | the sign-up fails with a database error | student |

- **`teacher` and `admin` are never granted by a sign-up.** The account exists, can sign in, holds no role and passes no `has_role` test; an admin grants the role in Admin > Users, or the admin function that created the account inserts it a moment later.
- **Why no row rather than `student`:** `create-teacher`, `create-teaching-assistant` and `manage-admin-users create` send the staff role as metadata and then insert the role themselves. With no row from the trigger they end with exactly the role they insert - for teachers and TAs that is byte-for-byte today's end state - and **no edge function has to be redeployed for the migration, in either order**.
- **`family` from the form becomes `student`.** Safe, and the tested path: no live account holds `family`, and the app treats the two alike (`ProtectedRoute`, `ivoryScope`, `Dashboard`). `student` from the form is safe because an unlinked `student` reads no child's rows (above) once F-14 is applied. Until F-14 is applied, a new sign-up can still read homework files - F-14 is the fix for that, and the reason both are in this batch.
- `public.users.role` (legacy, NOT NULL) is always `student` for a new account. Nothing in `src/` reads it; `calendar-events` reads it but is not called by the browser.
- **Same root cause, same migration:** policy `"Only admins can manage custom_quests"` is `FOR ALL TO public USING (users.role = 'admin')` - the legacy column. 20260312152157 meant to replace it but dropped a policy named "...modify..." instead, so both stand. The 17 accounts above can insert, change and delete custom quests through it (0 rows live; quests are shown to children). The migration drops it; `"Only admins can modify custom_quests"` (has_role) stays.
- **No account is changed.** No row of `user_roles` or `users` is written by the migration. The 2 + 15 + 17 accounts are for the owner to look at with the CHECK script.

Also changed in the browser: the form's picker offers Student and Family only, with a line saying the school links the account and creates staff logins. It is a courtesy; the database is the control (the suite sends `teacher` straight to the trigger).

### Before / after, by who is asking

| Who | Before | After |
|---|---|---|
| A stranger signing up as "Teacher" | teacher role: all learning profiles, finance snapshots, homework files, student-work and lesson-resources buckets, staff edge functions | no role; reads nothing about any child |
| A stranger signing up as "Family" / "Student" | that role; reads every homework file (F-14) | student; reads nothing about any child once F-14 is applied |
| A real parent signing up, then linked by an admin | student (or family) + link | student + link - the same as every family login today |
| A teacher made by an admin | `{teacher}` | `{teacher}` |
| An admin made by an admin | `{admin, student}` | `{admin}` (2 live admins already hold `admin` alone) |
| A front-desk card account | `{student}` | `{student}` |
| 17 accounts with legacy `users.role = admin` | may write `custom_quests` | may not |

### What could break, and the test for each

| Risk | Test in `signup-role.test.mjs` |
|---|---|
| create-teacher / create-TA leave the account without a role | replays `createUser(role teacher)` + the function's insert -> exactly `{teacher}`, no error |
| manage-admin-users create / bootstrap | `{admin}` / `{admin, student}`, and that admin can write custom quests |
| front-desk card (`upsert`) | `{student}`, upsert does not fail |
| demo student | delete + insert + users upsert -> `{student}` |
| form + linkToFamily, form + link-student-user | `{student}` |
| an account that asked for teacher, later linked by an admin to a child / to a teacher record / role changed in Admin > Users | `{student}` / `{teacher}` / `{teacher}` |
| the "claim" account | its plain insert conflicts - recorded as broken before and after (not a regression); the code fix is an upsert |
| sign-up with odd metadata (number, object, array, null, homoglyph, `"student,teacher"`, role in app_metadata, other spellings of the key) | never more than `student`; staff spellings give no role |
| a role-less account grants itself a role | refused by RLS on `user_roles` |
| existing accounts rewritten | every `users` / `user_roles` row compared before and after the paste |
| legacy-admin account loses reading of quests | still reads; can no longer write; a real admin can |
| the CHECK script leaks or writes | runs; columns are ids and dates; no `@` in any text; no write statement in the file; row counts unchanged |
| not idempotent / rollback wrong | pasted twice (function and policies byte-identical); rollback block executed, old behaviour back, fix pasted again |

Tests that fail before the fix: the "before" section asserts the defect on the real 20260312152157 (a sign-up asking for teacher IS a teacher; legacy-admin writes quests); the "after" section's assertions are the same calls with the opposite outcome.

Not tested here, and why: GoTrue itself (the suite inserts into `auth.users` as GoTrue does); the edge functions' own code paths (their SQL statements are replayed, the functions are not run).

### Post-apply probes (read-only)

```sql
-- P1  the function is the new one: expect t, t
SELECT prosrc ~ 'v_requested IN \(''teacher'', ''admin''\)' AS new_body,
       NOT has_function_privilege('authenticated', oid, 'EXECUTE') AS not_callable
  FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure;
-- P2  the trigger is still there: expect 1 row, on_auth_user_created, enabled 'O'
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- P3  custom_quests: expect exactly "Only admins can modify custom_quests" and "Signed-in users can read custom_quests"
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_quests' ORDER BY 1;
-- P4  no account changed: expect the same numbers as before the paste (13 Nov: teacher 8, admin 3, family 0)
SELECT role, count(*) FROM public.user_roles GROUP BY 1 ORDER BY 1;
```
Then, by hand (the owner or the conductor with a throw-away mailbox): join on the form, confirm the mail, and check in Admin > Users that the account shows `student`; create a teacher in Admin > Teachers and check it shows `teacher` only.

### The dashboard setting to consider: turn public sign-ups off

Supabase dashboard > Authentication > Sign In / Providers > "Allow new users to sign up" -> off (`disable_signup: true`).

- What it stops: `supabase.auth.signUp` - the "Join the club" form answers "Signups not allowed for this instance". A parent can no longer make an account alone and wait to be linked. That path was last used on 2026-05-13; since October new families get a front-desk card (6 accounts).
- What keeps working: everything an admin does - `auth.admin.createUser` is not affected - so create-teacher, create-teaching-assistant, manage-admin-users, front-desk cards and their redemption, the demo student, the "claim" account; signing in; password reset.
- Also remove the "Join the club" tab then, or it only shows an error.
- **Recommended default: turn it off**, after this migration is applied (the migration is still needed: the setting can be switched back on by anyone with dashboard access, and the trigger is what decides the role).

### Rollback

<!-- rollback F-01 -->
```sql
-- Puts handle_new_user back exactly as 20260312152157 left it (the live
-- function on 13 Nov 2026) and recreates the dropped custom_quests policy.
-- THIS REOPENS F-01. No account is changed by it.
BEGIN;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.app_role,
    'student'::public.app_role
  );

  -- Block admin role from self-service signup in BOTH tables
  IF v_role = 'admin'::public.app_role THEN
    RAISE WARNING 'Blocked attempt to create admin account via signup for user %', NEW.id;
    v_role := 'student'::public.app_role;
  END IF;

  INSERT INTO public.users (id, role) VALUES (NEW.id, v_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$function$;
DROP POLICY IF EXISTS "Only admins can manage custom_quests" ON public.custom_quests;
CREATE POLICY "Only admins can manage custom_quests" ON public.custom_quests FOR ALL TO public
  USING (EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::app_role))));
COMMIT;
```

---

## F-14 - the `homework` bucket

### What uses the bucket today (every call in `src/`; no edge function touches it)

| Call | File | Path |
|---|---|---|
| upload (teacher / TA) | `src/components/teacher/AssignmentUpload.tsx:201-205` | `<homework id>/<timestamp>.<ext>` |
| signed URL | `AssignmentUpload.tsx:269` | `homework_files.storage_key` |
| upload (admin) | `src/components/admin/class/ClassHomework.tsx:94-100` | `assignments/<homework id>/<timestamp>-<name>` |
| signed URL / download (admin) | `ClassHomework.tsx:136`, `SessionDrawer.tsx:120` | a stored key |
| upload (child / family), `upsert: false` | `src/components/student/HomeworkSubmission.tsx:116-120` | `submissions/<homework id>/<student id>/<timestamp>-<name>` |
| download own submission | `HomeworkSubmission.tsx:238` | `homework_submissions.storage_key` |
| signed URL, assignment file | `src/components/student/HomeworkDetailDialog.tsx:82` | `homework_files.storage_key` |
| download to grade | `src/components/teacher/HomeworkGrading.tsx:236`, `HomeworkGradingList.tsx:198` | `homework_submissions.storage_key` |

Nothing moves, overwrites or removes a file. Video homework is a different bucket (`homework-videos`), untouched.

### The 99 live objects, by shape (aggregate; first segments classified, no name read)

| Shape | Objects | Referenced by |
|---|---|---|
| `submissions/<homework>/<student>/<file>` | 53 | `homework_submissions` (50); 3 unreferenced |
| `<homework>/<file>` | 30 | `homework_files` (30) |
| `assignments/<homework>/<file>` | 11 | `homework_files` (11) |
| `homework-submissions/<student>/<file>` (older) | 2 | `homework_submissions` (2) |
| `<uuid of a homework that no longer exists>/<file>` | 3 | nothing |
| `homework/...`, a class id as first folder, anything else | 0 | - |

### The policy set

36 policies named this bucket on live (the conductor's "about 40"). All 36 are replaced by six, each `bucket_id = 'homework' AND ...`, through three SECURITY DEFINER helpers (STABLE, `search_path` pinned, no EXECUTE for anon / PUBLIC):

| Policy | Command | Rule |
|---|---|---|
| `homework_admin_all` | ALL | admin |
| `homework_read` | SELECT | `homework_object_can_read(name)` |
| `homework_staff_insert` / `_update` / `_delete` | INSERT / UPDATE / DELETE | `homework_object_staff_can(name)`; UPDATE checks the old and the new name |
| `homework_family_insert` | INSERT | `homework_object_family_can_upload(name)` |

- An assignment file (`<homework>/<file>` or `assignments/<homework>/<file>`) is read by staff of the homework's class (role `teacher` AND `is_teacher_of_class` - teachers and TAs) and by a login of a child enrolled in that class now (`can_view_student`: the child's login, second login, the family's primary login). Staff of that class may also upload, replace and delete it.
- A submission (`submissions/<homework>/<student>/<file>`) is read by that child's logins and by staff of the homework's class. It is uploaded by that child's logins, for a homework of a class the child is or was enrolled in. Nobody but an admin may overwrite or delete it.
- An old submission (`homework-submissions/<student>/<file>`) is read by that child's logins and by staff of the class of the `homework_submissions` row whose `storage_key` is that file. No new uploads.
- Every other name, a homework that does not exist, no uid, no link: admin only.

The migration ends its drops with a guard: if any policy it does not know still reaches the bucket (or has no bucket test at all), it raises and rolls back, because one surviving OR-ed policy would leave the bucket open behind a "success".

### Before / after

| Who | Before | After |
|---|---|---|
| Account registered a minute ago (`student`, linked to nothing) | reads and lists all 99; uploads anywhere under `submissions/` | nothing |
| Unlinked `family`-role account | reads all | nothing |
| Self-made `teacher` (role, no teacher record) | reads all; uploads under `assignments/` and `homework/` | nothing |
| A family | reads all (other families' children included) | its class's assignment files; its own child's submissions; uploads its own child's submission |
| A classmate's family | reads all | the class's assignment files; never another child's submission |
| A family whose child left the class | reads all | the child's own submissions; not the class's sheets |
| Teacher / TA of the class | reads all; overwrites any file in the bucket (teachers row) | reads the class's sheets and submissions; uploads / replaces / deletes the class's sheets; cannot touch a submission |
| Teacher / TA of another class | reads all; overwrites any file | nothing of this class |
| Admin | everything | everything |
| anon, no uid | nothing | nothing |
| service role | everything | everything |

### What could break, and the test for each (`homework-bucket-scope.test.mjs`, 141 assertions)

| Risk | Test |
|---|---|
| a teacher / TA cannot upload an assignment or open a submission to grade | "the app's flows": upload `<homework>/<ts>.docx` and read it back (teacher, TA); open child's submission; open the old-shape file through its row |
| a child / parent cannot hand in or re-open their work, or open the assignment | upload `submissions/<hw>/<child>/..` and read back (primary login, child's login, second login); both assignment shapes open |
| admin screens | upload `assignments/<hw>/..`; opens any file |
| a child who has left hands in late | allowed (an enrollment existed) |
| access follows staffing with no migration | reassign the class's teacher: the new teacher reads at once |
| each role's full read / write / upload matrix | 15 people x 9 objects x (read, update, delete) and x 10 upload paths |
| planting and moving | rename across homeworks, into a submission folder, upsert over a file, column-free UPDATE (WITH CHECK alone), other bucket |
| 16 odd shapes incl. the 3 live orphans' shape | nobody but admin |
| an unknown policy left behind | the migration refuses, names it, changes nothing; `homework-videos` policies are not mistaken for it |
| idempotence, rollback | pasted twice (policies byte-identical); rollback file run: 36 back, old behaviour back, helpers gone; pasted twice; fix again |

Fails before the fix: the "before" section runs on the 36 production policies and asserts the leak (the new account reads all nine objects and lists the bucket; family 2 reads family 1's submission; teacher B overwrites class A's files).

Limits of the proof: the stand-in is `storage.objects` with RLS, not the Storage API. The API's upload is an INSERT whose new row the uploader must also be able to SELECT - every uploader here can read what it uploads, and the flow tests use `RETURNING` to prove it. A real upload and a real signed URL by a teacher and by a parent on live after applying is still the proof.

One thing a family loses that was real: nothing the app shows. A family login reaches a child's files through `can_view_student` (linked, second login, primary login) - the same reach as the `homework_submissions` rows it lists - plus the second login, which the old scoped policies left out.

### Post-apply probes (read-only)

```sql
-- P1  exactly the six: expect homework_admin_all, homework_family_insert, homework_read,
--     homework_staff_delete, homework_staff_insert, homework_staff_update
SELECT policyname, cmd FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND concat_ws(' ', qual, with_check) ~ 'bucket_id = ''homework''(::text)?[ )]' ORDER BY 1;
-- P2  nothing moved or deleted: expect >= 99 (13 Nov: 99)
SELECT count(*) FROM storage.objects WHERE bucket_id = 'homework';
-- P3  objects only an admin can now open: expect 3 (the orphans). A larger number means a
--     shape this file does not know - stop and look before telling staff.
SELECT count(*) FROM storage.objects o
 WHERE o.bucket_id = 'homework'
   AND NOT (   (o.name ~ '^(assignments/)?[0-9a-fA-F-]{36}/[^/]+$'
                AND EXISTS (SELECT 1 FROM public.homeworks h
                             WHERE h.id::text = lower(CASE WHEN o.name LIKE 'assignments/%' THEN split_part(o.name, '/', 2) ELSE split_part(o.name, '/', 1) END)))
            OR o.name ~ '^submissions/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[^/]+$'
            OR o.name ~ '^homework-submissions/[0-9a-fA-F-]{36}/[^/]+$');
-- P4  helpers: expect 3 rows, definer t, anon f, authenticated t
SELECT proname, prosecdef, has_function_privilege('anon', oid, 'EXECUTE') anon,
       has_function_privilege('authenticated', oid, 'EXECUTE') authenticated
  FROM pg_proc WHERE proname LIKE 'homework_object_%' ORDER BY 1;
```

### Rollback

`docs/evidence/S1-F14-rollback.sql`: drops the six and the helpers and recreates the 36 policies verbatim from `pg_policies` as read on 13 Nov 2026 (name, command, roles, USING, WITH CHECK). The suite uses that file as its "before" and runs it again as the rollback, so it is known to execute. Running it reopens F-14.

Note for later: `20261111110000_ta_standing_assignments_and_homework_upload.sql` creates two of the 36 ("Teaching assistants upload / update homework files"). Do not paste that file again after this one; if it is, paste this one after it (it drops them again).

---

## F-15 - `pause_enrollment`, and every other SECURITY DEFINER function a signed-in account can call

### The fix

`pause_enrollment` gets the admin check its siblings have, as its first statement: no uid or not an admin -> `42501 Only administrators can pause enrollments`. The rest of the body is the live function word for word (the suite compares the two bodies and asserts the check is the only difference).

Who calls it: `src/components/admin/ModifyEnrollmentModal.tsx:186` (the Pause tab) and nothing else - no teacher screen, no edge function, no trigger, no cron. The modal opens from `ClassEnrollments` (admin area) and from `StudentEnrollmentsTab`, which shows the button only when `role === "admin"`. So: admin only; no staff role calls it.

| Who | Before | After |
|---|---|---|
| A parent / child / just-registered / role-less account | pauses any child in any class for any range: lessons become Excused (not charged), teacher's marks overwritten | 42501, nothing written |
| A teacher / TA | the same | 42501 |
| Admin | works | works, identical result |
| anon | no EXECUTE | no EXECUTE |
| service role (no uid) | works (nothing calls it so) | 42501 |

Tests (`pause-enrollment.test.mjs`): before - five kinds of non-admin each pause a child on the live body and a teacher's "Absent" becomes "Excused" marked by the parent; after - the same calls are refused with 42501 and the register, pause windows and audit log are compared row for row with the snapshot; the admin's call excuses the three live lessons, skips the cancelled one, leaves the other child's mark, writes one window and one audit row; an admin who also holds `student` still passes; reversed dates still give the old message; pasted twice; rollback block run and fix re-pasted.

### Post-apply probes (read-only)

```sql
-- P1  expect t (checked), t (definer), f (anon), t (authenticated)
SELECT prosrc ~ 'Only administrators can pause enrollments' AS checked, prosecdef,
       has_function_privilege('anon', oid, 'EXECUTE') anon, has_function_privilege('authenticated', oid, 'EXECUTE') authenticated
  FROM pg_proc WHERE oid = 'public.pause_enrollment(uuid, uuid, date, date, text)'::regprocedure;
-- P2  nothing was written by the paste: the newest pause window is older than the paste
SELECT count(*), max(created_at) FROM public.pause_windows;
```
Then an admin opens Students > a student > Enrollments > Modify > Pause on a test enrollment (or simply opens the tab: the check runs only on Confirm).

Worth a look by the owner (not done here - it needs rows): `SELECT count(*) FROM public.pause_windows pw WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = pw.created_by AND r.role = 'admin')` - pause windows made by a non-admin. Expect 0.

### Every SECURITY DEFINER function executable by `authenticated` or `anon` (live catalog, 13 Nov: 79), with a verdict

Functions that WRITE (volatile, callable):

| Function | Writes | Its own check | Verdict |
|---|---|---|---|
| `pause_enrollment` | pause_windows, attendance, audit_log | **none** | **HIGH - fixed here** |
| `end_enrollment`, `change_enrollment_days`, `modify_enrollment_transfer` | enrollments, attendance, points, audit_log | admin, first statement | ok |
| `cancel_session_checked`, `cancel_sessions_checked_bulk`, `move_session_checked`, `uncancel_session_checked`, `record_session_override_event` | sessions and all that follows | `_session_require_admin()` (in `_session_change_apply` for the single-lesson ones) | ok |
| `ai_action_apply`, `ai_action_undo`, `ai_action_mark_reviewed` | students, enrollments, invoices, discounts, attendance, points | admin | ok |
| `approve_video_feedback`, `return_video_for_rerecord` | video rows, homework_submissions, points, error log, CEFR, skills | staff of the submission's class | ok |
| `stars_sync_resolve_conflict` | attendance, sessions, homework_submissions | admin | ok |
| `toggle_video_heart` | video_reactions | the caller's own child, and may see the wall | ok |
| `audit_clip_enrol`, `audit_eval_reserve`, `audit_eval_finish` (also `anon`) | audit tables | admin inside | ok; revoke `anon` at teardown (F-20) |
| `refresh_invoice_carry(student)` | invoices.carry_* | none | LOW (F-20): only recomputes the carry columns from the stored bills and payments; calling it cannot change a figure, only spend time. Not changed here. |
| `recompute_student_points(student, class, month)` (also `anon`) | student_points | none | LOW (F-20): only re-sums `point_transactions`; cannot invent points. Should lose `anon` and `authenticated` (the triggers and the service role do not need the grant) - not in this batch. |
| `rls_auto_enable()` | - | event-trigger function | harmless when called directly (it errors outside an event trigger); revoke for tidiness |

Trigger functions (`audit_row_change`, `block_delete_of_staff_with_history`, `enforce_class_update_column_scope`, `enforce_ta_self_update_scope`, `enforce_teacher_self_update_scope`, `freeze_class_overhead_on_close`, `invoices_carry_sync`, `refuse_recurring_write_to_locked_month`, `refuse_write_to_locked_payroll`, `video_submissions_guard`, `video_submissions_rerecorded`, `audit_eval_runs_guard`): return `trigger`, cannot be called through the API. ok.

Functions that only READ:

| Function | Check | Verdict |
|---|---|---|
| `ai_action_preview`, `ai_actions_list`, `stars_sync_status`, `stars_sync_readiness`, `session_change_preview`, `session_cancel_guard_status`, `class_overhead_pool` / `_for_month` / `_breakdown` (via `class_overhead_reader`) | admin | ok |
| `session_held_evidence` | admin or staff of the class | ok |
| `get_class_video_wall`, `get_video_homework_for_student`, `get_video_progress`, `can_view_class_video_wall`, `can_view_homework_video`, `can_upload_homework_video`, `can_manage_video_parent_link`, `can_read_student_work_file`, `class_recordings_staff_can`, `language_support_*`, `video_staff_for_class` | about the caller only | ok (`video_staff_for_class` null-uid note: F-20) |
| `get_student_homeworks(student)` | admin / own child / family / a teacher with ANY lesson ever in a class of the child | ok for families; the teacher branch is wider than `is_teacher_of_class` (a former teacher still passes). LOW-MEDIUM, belongs with F-04. |
| `teacher_rate_on`, `assistant_rate_on` | none | MEDIUM (F-17): any account reads any staff pay rate by id. Not in this batch. |
| `has_role`, `get_user_role`, `is_staff_member`, `can_view_student`, `can_view_family`, `can_view_classmate`, `can_view_enrollment`, `can_view_student_in_class`, `can_view_teacher`, `is_teacher_of_class`, `is_enrolled_in_class`, `is_linked_student`, `is_student_enrolled_in_class`, `is_journal_member`, `is_journal_owner` | none - they take the user id as a parameter | LOW (F-20): yes/no oracles about any account. Policies need the grant; closing them means wrappers. Not in this batch. |
| `class_slots_on`, `student_enrolled_on`, `payroll_month_is_locked` | none | LOW: a class's timetable slots, a yes/no, a yes/no |

SECURITY DEFINER functions that write these tables and are NOT executable by `authenticated` / `anon` (so not reachable): `_session_change_apply`, `_attendance_seed_for_class_dates`, `archive_and_reset_monthly_leaderboard`, `normalize_session_statuses`, `revert_invalid_held_sessions`, `post_sibling_retro_credit`, `stars_sync__*`. `award_homework_points` is SECURITY INVOKER: it writes as the caller, under the caller's row policies.

The audit ranks one of these high: `pause_enrollment`. It is the only one changed.

### Rollback

<!-- rollback F-15 -->
```sql
-- pause_enrollment exactly as the live catalog had it on 13 Nov 2026 (no
-- caller check). THIS REOPENS F-15. No row is changed by it.
CREATE OR REPLACE FUNCTION public.pause_enrollment(p_student_id uuid, p_class_id uuid, p_from_date date, p_to_date date, p_memo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pause_window_id UUID;
  v_excused_count INT := 0;
  v_actor_id UUID := auth.uid();
  v_effective_month TEXT;
BEGIN
  -- Validate dates
  IF p_to_date < p_from_date THEN
    RAISE EXCEPTION 'to_date must be >= from_date';
  END IF;

  v_effective_month := to_char(p_from_date, 'YYYY-MM');

  -- 1. Create pause window record
  INSERT INTO pause_windows (
    student_id,
    class_id,
    from_date,
    to_date,
    memo,
    created_by
  ) VALUES (
    p_student_id,
    p_class_id,
    p_from_date,
    p_to_date,
    p_memo,
    v_actor_id
  )
  RETURNING id INTO v_pause_window_id;

  -- 2. Mark attendance as Excused for sessions in pause window
  WITH excused AS (
    INSERT INTO attendance (session_id, student_id, status, marked_by, notes)
    SELECT 
      s.id, 
      p_student_id, 
      'Excused', 
      v_actor_id,
      'Pause: ' || COALESCE(p_memo, 'Student paused')
    FROM sessions s
    WHERE s.class_id = p_class_id
      AND s.date BETWEEN p_from_date AND p_to_date
      AND s.status != 'Canceled'
    ON CONFLICT (session_id, student_id) 
    DO UPDATE SET 
      status = 'Excused',
      marked_by = v_actor_id,
      notes = 'Pause: ' || COALESCE(p_memo, 'Student paused'),
      updated_at = now()
    RETURNING id
  )
  SELECT count(*) INTO v_excused_count FROM excused;

  -- 3. Audit log
  INSERT INTO audit_log (actor_user_id, action, entity, entity_id, diff)
  VALUES (
    v_actor_id,
    'pause',
    'enrollment',
    v_pause_window_id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'class_id', p_class_id,
      'from_date', p_from_date,
      'to_date', p_to_date,
      'excused_count', v_excused_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'pause_window_id', v_pause_window_id,
    'excused_attendance', v_excused_count,
    'effective_month', v_effective_month
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.pause_enrollment(uuid, uuid, date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_enrollment(uuid, uuid, date, date, text) TO authenticated;
```
