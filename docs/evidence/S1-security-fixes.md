# S1 security fixes (F-01, F-14, F-15, F-16, F-21, F-02)

**Where I am / next step:** 13 Nov 2026. COMPLETE for this batch: F-01, F-14, F-15, F-16, F-21 (five migrations) and F-02 (nine functions) are built, tested and written up below. `node scripts/pgtest/run.mjs`: 4198 assertions across 47 suites, 0 failed (it includes the app type check, `tsc --noEmit -p tsconfig.app.json`, and the edge-function type check). The exact steps for applying are in `docs/evidence/S1-live-apply-brief.md`. Next step is the owner's: the decisions table at the end. Then the conductor applies each migration and deploys the nine functions.

Build and test only. **Nothing here has been applied to live, deployed or pushed.** The live database was read read-only (catalog, aggregate counts). No row about a person was selected; no secret was read.

Each fix is its own migration so the owner can approve, and the conductor apply, one at a time. They do not depend on each other and can be pasted in any order; the recommended order is the order below.

| Finding | Migration | Suite (`node scripts/pgtest/run.mjs`) | Code that ships with it |
|---|---|---|---|
| F-01 | `supabase/migrations/20261113100000_signup_role_from_server_only.sql` | `signup-role.test.mjs` (86) | `src/pages/Auth.tsx` (form offers Student / Family only); `student-create-migration-account` (upsert; needs a deploy) |
| F-14 | `supabase/migrations/20261113110000_homework_bucket_scope.sql` | `homework-bucket-scope.test.mjs` (141) | none |
| F-15 | `supabase/migrations/20261113120000_pause_enrollment_admin_only.sql` | `pause-enrollment.test.mjs` (37) | none |
| F-16 | `supabase/migrations/20261113130000_classmate_rows_private.sql` | `classmate-rows.test.mjs` (77) | `src/lib/classSkillPoints.ts`, `RadarChartTab`, `PerformanceHeatmapTab`, `StudentAnalyticsModal` |
| F-21 | `supabase/migrations/20261113140000_creator_rows_need_class_staff.sql` | `creator-rows.test.mjs` (123) | `src/lib/safeUrl.ts` and the five places a stored link is rendered |
| F-02 | none (edge functions) | `ai-gate.test.mjs` (250) | `_lib/ai-gate.ts`, the nine functions, `supabase/config.toml` |

Rollbacks: F-01 and F-15 are the fenced blocks marked `<!-- rollback F-0x -->` in this file; F-14, F-16, F-21 are `docs/evidence/S1-F14-rollback.sql`, `S1-F16-rollback.sql`, `S1-F21-rollback.sql`. Every one is executed by its suite. Where a suite needs "production as it is", it gets it from that same rollback text, and the function bodies involved are checked against md5 sums read from the live catalog.

Browser and database can ship in either order for every item: the browser changes work against the old database (they fall back or only narrow what is shown), and the migrations do not need the new browser - except that F-16 without the browser change leaves the classmate pop-up's tabs open and empty rather than replaced by the "private" line.

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
| `admin` | student (downgraded) | student - unchanged (round 2) |
| `family` | **family** | student |
| `student`, nothing, `null` | student | student |
| a value that is not a role (`"headmaster"`, a number, an object) | the sign-up fails with a database error | student |

- **`teacher` and `admin` are never granted by a sign-up.** A request for `teacher` leaves the account with no role: it exists, can sign in and passes no `has_role` test; an admin grants the role in Admin > Users, or the admin function that created the account inserts it a moment later. A request for `admin` is answered with `student`, exactly as live answers it today (round 2, after review: real parents pick "Admin" on the form; see "Round 2" below).
- **Why no row for `teacher` rather than `student`:** `create-teacher` and `create-teaching-assistant` send `teacher` as metadata and then insert the role themselves. With no row from the trigger they end with exactly `teacher` - byte-for-byte today's end state; `student` there would leave every new teacher and TA holding both. `manage-admin-users create` sends `admin` and inserts `admin`: it ends `{admin, student}`, as on live today. **No edge function has to be redeployed for the migration, in either order.**
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
| An admin made by an admin | `{admin, student}` | `{admin, student}` |
| A parent who picks "Admin" on the old form or a stale page | student | student |
| A front-desk card account | `{student}` | `{student}` |
| 17 accounts with legacy `users.role = admin` | may write `custom_quests` | may not |

### What could break, and the test for each

| Risk | Test in `signup-role.test.mjs` |
|---|---|
| create-teacher / create-TA leave the account without a role | replays `createUser(role teacher)` + the function's insert -> exactly `{teacher}`, no error |
| manage-admin-users create / bootstrap | `{admin, student}` both, and that admin can write custom quests |
| a parent who picked "Admin", before and after `linkToFamily` | `{student}`, not an admin, cannot write quests |
| a stale page asking for `teacher`, then `linkToFamily` | no role - the one case left for Admin > Users |
| front-desk card (`upsert`) | `{student}`, upsert does not fail |
| demo student | delete + insert + users upsert -> `{student}` |
| form + linkToFamily, form + link-student-user | `{student}` |
| an account that asked for teacher, later linked by an admin to a child / to a teacher record / role changed in Admin > Users | `{student}` / `{teacher}` / `{teacher}` |
| the "claim" account | its plain insert conflicts - recorded as broken before and after (not a regression); the code fix is an upsert |
| sign-up with odd metadata (number, object, array, null, homoglyph, `"student,teacher"`, role in app_metadata, other spellings of the key) | never more than `student`; spellings of `teacher` give no role, spellings of `admin` give `student` |
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
SELECT prosrc ~ 'IF v_requested = ''teacher'' THEN' AS new_body,
       NOT has_function_privilege('authenticated', oid, 'EXECUTE') AS not_callable
  FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure;
-- P2  the trigger is still there: expect 1 row, on_auth_user_created, enabled 'O'
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- P3  custom_quests: expect exactly "Only admins can modify custom_quests" and "Signed-in users can read custom_quests"
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_quests' ORDER BY 1;
-- P4  no account changed: expect the same numbers as before the paste (13 Nov: teacher 8, admin 3, family 0)
SELECT role, count(*) FROM public.user_roles GROUP BY 1 ORDER BY 1;
```
Then, by hand (the owner or the conductor with a throw-away mailbox): join on the form, confirm the mail, and check in Admin > Users that the account shows `student`; by a direct sign-up request with `role: "admin"` -> `student`, with `role: "teacher"` -> no role; create a teacher in Admin > Teachers and check it shows `teacher` only. Remove the test accounts afterwards.

### Round 2 (after the review, 13 Nov): what changed, and family self-registration walked end to end

Owner fact: **new families do register themselves in the app, and public sign-up stays on.** So `handle_new_user` is the only control over what a self-made account holds, and its answer for each requested value has to be exactly right. My earlier recommendation to switch sign-ups off is withdrawn.

Change made (review, change 1): a request for `admin` gets `student`, as the live function gives today; only a request for `teacher` gets no role. As first built, a parent who picked "Admin" (17 live non-admin accounts carry that metadata, 14 of them linked) would have held no role, seen a blank page, and stayed on it after being linked to a family, because `linkToFamily` grants nothing. Suite: 86 assertions, including that parent before and after linking.

Order (review, change 2): the build with the new form must be live BEFORE this migration - branch `release/s1-signup-form`. After it the only way to ask for `teacher` is a stale page or a hand-made request.

**The walk, against the corrected migration** (code re-read on this branch; the database half is asserted by the suite):

| Step | Code | What the parent meets |
|---|---|---|
| 1. Register | `Auth.tsx` "Join the club": email, password, "I am a" Student / Family -> `signUp({ options: { data: { role } } })` | "Account created!". Email confirmation is on, so no session yet; the confirmation mail arrives. Unchanged. |
| 2. In the database | `handle_new_user` | `users` row (`student`) and one `user_roles` row: `student` - whether they chose Student or Family (or Admin from an old page). |
| 3. First sign-in | `Dashboard.tsx:19-28` -> `/student/dashboard`; `StudentDashboard.tsx:350-361` (role student, no child) | The "new student" demo dashboard: a welcome page and the class catalogue. A page with content, not a blank one. |
| 4. Unlinked, what they can read | every policy asks for a link (measured on live by the reviewer as an unlinked `student`) | 8 classes, avatars, announcements, 2 teacher rows, the payroll month list, their own account rows. No child, family, bill, payment, attendance, points or report. Homework files: 0 once F-14 is applied (being applied now). |
| 5. Linking | the school, in Admin > Users: "link to family" (`linkToFamily` sets `families.primary_user_id`) or "link to student" (`link-student-user` sets `students.linked_user_id`) | Nothing for the parent to do. There is no self-service link for a self-made account (so today, not caused by this fix). |
| 6. Children appear | `useShellQueries.ts:44-72`: the family whose `primary_user_id` is this account -> its active children; else children with this `linked_user_id`. Row access by `can_view_student`. | Next page load: the child's dashboard; with two or more children, the profile picker. Tuition, homework, attendance, lessons as for every existing family. |

**What a newly registered parent sees, plainly, and what is lost compared with today.**

- A parent who chooses **Student** (the form's default): nothing changes. `student` before, `student` after.
- A parent who chooses **Family**: today they get the role `family` and land on `/family/dashboard` - before linking a line saying no students are linked yet, please contact the school; after linking, a parents' page listing their children. After the fix they get `student` and land on the student dashboard instead (step 3), then the same screens as the 31 active family logins, **all of which hold `student`; no live account holds `family`**. So no existing family loses anything, and a new one gets what every existing one has.
- What that new "Family" parent does lose, compared with a new "Family" parent today:
  1. the parents' page `/family/dashboard` as a landing (still reachable only by role `family`);
  2. announcements addressed to "families" (`useAnnouncements.ts:121` shows them to role `family` only) - 0 such announcements are active on live;
  3. the school's bank details: `bank_info` is readable by an admin, by role `family`, or by an account that is some child's `linked_user_id`. A parent linked as a family's primary login and holding `student` reads none. **This is already the state of 26 of the 31 active family primary logins** (counted on live): they cannot read the bank details row the tuition / invoice screens use (`StudentAccountInfo.tsx:53`, `fetchInvoiceData.ts:39`). Not caused by this fix, but a new "Family" parent now joins them rather than escaping it.
- If the school wants the parents' page or the bank details for a family, the safe way is an admin setting the role to Family in Admin > Users **after** linking - never the form: an unlinked `family` account reads the bank details, and homework files until F-14 is in.
- The better fix for item 3, for the owner to decide (not built here): let `bank_info` be read by any account that can view at least one child (`can_view_student`), which covers all 31 family logins at once and no unlinked account.

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

Was the hole used? Checked on live with aggregates: 8 pause windows exist (4 Jul - 9 Aug 2026), each with its audit row, all made by ONE account, never the paused child's own family. That account holds only `student` today, but its 792 audit-log rows are admin work from Oct 2025 to 9 Oct 2026 (confirm tuition, record payments, create admins, end and transfer enrollments): it is the school's former admin login, demoted when the separate admin logins were made. So: no sign that a parent or stranger has called `pause_enrollment`.

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

---

## F-16 - classmates' rows

### The policies (live, 13 Nov 2026)

| Table | Policy | What it handed to every family in the class |
|---|---|---|
| `students` | "Students can view classmates for leaderboard" (`can_view_classmate`) | the whole row: date of birth, phone, email, the school's notes, family id, linked user id, cash, sibling-discount date |
| `attendance` | "Classmates can view attendance" | every classmate's status and note, per lesson |
| `skill_assessments` | "Students can view class skill assessments" | every score and the teacher's comment |
| `point_transactions` | "Students can view class transactions" | every award with its note |
| `student_points` | "Students can view class leaderboard" | month totals per child - **kept**: numbers only, and the board needs them |

### What the screens really read (traced in `src/` and the edge functions)

| Screen | Where classmates' data comes from | Affected? |
|---|---|---|
| The class board a family sees (`StudentClassLeaderboard` -> Star Board / High Scores / Night League / podium) | edge function `class-leaderboard`: service role, checks the caller's enrollment, returns id, name, avatar, points. `canReadLedger={false}`. | no |
| Staff boards (`ClassLeaderboardShared`, `ProjectedBoard`, `TeacherLeaderboards`, `ClassBoardWindow`) and their ledger (`useBoardExtras`) | the staff's own policies (`is_teacher_of_class`, admin) | no |
| Video wall | `get_class_video_wall` | no |
| Calendar (`GlobalCalendar`, `StudentScheduleCalendar`, `calendar-events`, `assignment-calendar`) | own enrollments; `sessions` through `is_student_enrolled_in_class` | no |
| Family / student dashboards, attendance heat-map, points chart, lesson detail | every query filters by the child's own id | no |
| The assistant (`chat`) | `_lib/chat-context` reads the caller's own children; `studentFor` / `classFor` refuse anyone else before a query runs. Narrower row policies only add a second wall behind it. `chat-assistant.test.mjs` stays green (201). | no |
| **The pop-up opened by tapping a child on the board** (`StudentAnalyticsModal`: Attributes, Performance, Quest Log, History) | direct reads of `skill_assessments`, `attendance`, `point_transactions` by that child's id - for a classmate this is exactly the leak | **yes - see below** |
| The same pop-up for one's own child: "class best", class average and the top three per skill | class-wide `skill_assessments` rows (with `students!inner(full_name)`) | **yes - now a function** |

### The fix

Each of the four policies keeps its old test and gains one more, `is_family_student(<child>, auth.uid())`: the row's child must be in the caller's own family (the child's login, second login, the family's primary login, or a login linked to a brother or sister). The new policy is literally `is_family_student(...) AND <the old expression>` - the suite asserts that word for word - so it can only return a subset of what the old one did. Why not just drop them: `skill_assessments` has no other family read policy (dropping it would hide a child's own scores from their parent), and 5 live accounts are linked to one child and read a sibling only through these policies (counted: 5 accounts, 5 children; they keep exactly that).

`get_class_skill_points(class, from, to)` returns student id, name, skill and summed score - no comment, no date, no row id - to the class's current families, its staff and admins. `src/lib/classSkillPoints.ts` calls it for the two class panels and falls back to the old query, so browser and database can ship in either order.

The pop-up, for a classmate, now shows its header (name, avatar, level, points by category - what the board already shows) and one line: "...Skills, attendance and history are private to each student and their family." It decides by asking the database for that child's `students` row, so staff, admins and the child's own family see the tabs as before.

**This is the one visible change in the whole batch, and it is the owner's call** (decision 3 below): until now a parent or child could open a classmate's skills chart, attendance and point history. The brief for this fix says a classmate is a name and points; the pop-up now matches that.

### Before / after

| Who | Before | After |
|---|---|---|
| A family, about a classmate | the full `students` row; attendance + notes; skill scores + teacher comments; every award + note | nothing in those four tables; the month's point totals; name / avatar / points through the board; per-skill totals with names through the function |
| A family, about its own children | everything | everything, unchanged (asserted row for row) |
| A login linked to one child, about that child's sibling | what the classmate policies happened to give | exactly the same |
| Teacher / TA of the class, admin | unchanged | unchanged (asserted) |
| Unlinked account, no role, anon | nothing | nothing |

### What could break, and the test (`classmate-rows.test.mjs`, 77 assertions)

- the five helper functions in the test are production's, checked by md5 against the live catalog; the four old policies come from the rollback file, verbatim; every other policy on the tables is copied from `pg_policies`.
- before: a parent reads a classmate's phone, email, date of birth and notes; a child reads the teacher's comments on a classmate; a classmate's parent reads another child's register note.
- after, per login and per table: whose rows are visible; then three general statements over every login and table - **no login reads a row it could not read before; no family login reads a row about a child outside its family; no family login lost a row about its own family**.
- each screen's query as the caller (the SQL PostgREST runs): the service-role roster of `class-leaderboard`; the family's `student_points` read; staff rosters with names, the ledger, the economy cash column; admin; the pop-up's four tabs for an own child (rows and the teacher's comment still there) and for a classmate (nothing; the row probe says no); the two dashboards; the calendar (own class and the sibling's); the assistant's context, `find_students` and a teacher's roster.
- `get_class_skill_points` equals, figure for figure, what the panel added up from rows before; 0 rows for a teacher of another class, a family of another class, an unlinked account, a role-less account, no uid; anon cannot call it.
- a stray policy under an old name is dropped; an unknown policy still calling `can_view_classmate` stops the install; pasted twice; rollback file run (policies byte-identical to the start, every login's reach identical to before), fix re-pasted.

Not covered: the browser itself. After applying, open a class board as a parent, tap own child (four tabs with data), tap a classmate (header and the private line), and check "Class best" on the Attributes tab still shows a number.

### Post-apply probes (read-only)

```sql
-- P1  the four old names are gone, the four new ones are there: expect 4 rows, all "Family logins ..."
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
   AND (policyname LIKE 'Family logins can view %' OR policyname IN ('Students can view classmates for leaderboard',
        'Classmates can view attendance', 'Students can view class skill assessments', 'Students can view class transactions')) ORDER BY 1;
-- P2  the board's numbers are still class-wide: expect 1 row
SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_points' AND policyname = 'Students can view class leaderboard';
-- P3  the two functions: definer t, anon f, authenticated t
SELECT proname, prosecdef, has_function_privilege('anon', oid, 'EXECUTE') anon, has_function_privilege('authenticated', oid, 'EXECUTE') authenticated
  FROM pg_proc WHERE proname IN ('is_family_student', 'get_class_skill_points');
-- P4  sibling reach kept (the 5 accounts): expect the same number before and after the paste (13 Nov: 5)
WITH linked AS (SELECT DISTINCT family_id, u FROM (SELECT family_id, linked_user_id u FROM public.students WHERE linked_user_id IS NOT NULL AND family_id IS NOT NULL
                 UNION ALL SELECT family_id, secondary_user_id FROM public.students WHERE secondary_user_id IS NOT NULL AND family_id IS NOT NULL) x)
SELECT count(*) FROM public.students s JOIN linked l ON l.family_id = s.family_id
 WHERE NOT public.can_view_student(s.id, l.u) AND public.can_view_classmate(s.id, l.u);
```

Rollback: `docs/evidence/S1-F16-rollback.sql` (the four policies verbatim; drops the two functions). Run by the suite. Reopens F-16.

---

## F-21 - creator-owned rows, and links

### The policies (live) and who really writes these tables

One `FOR ALL` policy each on `student_work`, `student_reports`, `cefr_assessments`, `student_error_log`: `<creator column> = auth.uid() OR (class_id IS NOT NULL AND is_teacher_of_class(...))`. The first half has no role and no class. `resources` had insert / update / delete on `uploaded_by = auth.uid()` for anyone, and its UPDATE had no WITH CHECK.

| Writer | As | Sets |
|---|---|---|
| `TeacherSmartUpload` (photo, team work, link, approve) | a teacher / TA of the class | `uploaded_by = me`, `class_id` = the class open |
| `BulkReportExport` from a class page; publish toggle | a teacher / TA of the class | `generated_by = me`, `class_id` |
| `AIReportDialog`, `BulkReportExport` in admin reports | an admin (`class_id` may be null) | admin policy |
| `TeacherTranscripts` backfill, live "flag" (`StudentActionPopover`) | a teacher / TA of the class | `created_by = me`, `class_id` |
| `ocr-student-work`, `ocr-vocab-scan`, `generate-work-feedback`, `generate-student-report`, `analyze-transcript`, `cefr-defense`, `approve_video_feedback` | service role / SECURITY DEFINER | not subject to these policies |
| `useResources` (teacher library) | a teacher or admin | `uploaded_by = me` |

No feature here is self-service for a child: the child's account only reads (approved work, published reports, own CEFR, own errors).

Live rows (aggregates): `student_work` 253 (246 uploaded by the class's current staff, 7 by an account holding no role today, 28 with no child yet, 10 whose child never had an enrollment in that class - 3 of those not reachable by the uploader's current classes either); `student_reports` 9 and `cefr_assessments` 9 with a creator, all 18 made on 30-31 Jul 2026 by one account that is neither teacher nor admin today - the same account as those 7 work items and the 8 pause windows in F-15: the school's former admin login (admin work in the audit log until 9 Oct 2026; holds `student` now). Genuine rows, made by an admin at the time; `student_error_log` 170 with a creator, all by class staff; `resources` 8, all by teachers / admins. 41 links stored (`student_work` 37, `resources` 4): all `http(s)://`, none with whitespace.

### The fix

Per table: SELECT - class staff as before, the creator only while holding role `teacher`; INSERT - role `teacher`, staff of the row's class, the creator column is the caller, and the child has an enrollment in that class (any date) or is currently in one of the caller's classes; UPDATE - staff of the row's class before and after, same child test on the new row (being the creator is no longer enough); DELETE - staff of the row's class. `student_work` checks every team member the same way. `resources`: own rows only while holding `teacher` or `admin`; an update cannot hand the row away.

Links: `external_url` on `student_work` and `resources`, and `resources.thumbnail_url`, must match `^https?://` with no whitespace or control characters (CHECK, NOT VALID - existing rows are not re-checked at paste time; all 41 pass anyway, so no existing row is blocked from later updates). In the browser `src/lib/safeUrl.ts` applies the same rule at the five places a stored link is rendered or opened.

### Before / after

| Who | Before | After |
|---|---|---|
| Any signed-in account (parent, child, new, role-less) | plants approved work with notes and a link, a published report, a CEFR level, error-log entries on ANY child; adds resources | none of it |
| A teacher of another class | the same, about any child | not for a class they do not teach, nor a child who is not theirs |
| A teacher / TA of the class | everything on the class's rows | the same writes; cannot move a row to another class, re-point it at another class's child, or sign it as someone else |
| The creator who is not class staff | full control of "their" rows forever | reads them while a teacher; cannot change or delete |
| An account that made rows and is no longer staff (live: the former admin login, 18 + 7 rows) | reads and edits them | neither. The rows themselves are untouched; class staff, admins and the child still read them |
| Admin, service role | everything | everything |
| Anyone, a non-http(s) link | accepted, rendered into `<a href>` | refused by the table; not rendered by the browser |

### What could break, and the test (`creator-rows.test.mjs`, 123 assertions)

- before: five kinds of account each plant all five; the targeted child's own login then reads the forged work (with its link), report, level and error entry; a `javascript:` link is stored.
- after: the same attempts by a parent, a child, a new account, a role-less account, a self-made teacher, a former-staff account, no uid, anon - nothing; a parent cannot write these about their own child either; teacher B cannot write about class A; teacher A cannot file class-A rows about a class-B child, a child enrolled nowhere, or with no class, or under another person's id.
- what staff really do, statement by statement, as a teacher and as a TA: photo upload with no child yet (and the id comes back), team work, an https link, approve with a child assigned, start a report, publish it, transcript backfill, live flag, CEFR point; work for a child who has left the class; editing rows the service role created; reject and delete; admin with no class; the service role's writes.
- updates and moves: a creator from another class reads but cannot change; the class's staff can; the role-less creator reads nothing and the child still reads the report; no move to another class, no re-pointing at another class's child, no foreign team member, no column-free UPDATE across classes.
- no login reads a row it could not read before; the child's and family's reads are unchanged.
- links: four ordinary URLs accepted; sixteen bad ones refused for all three columns (`javascript:` in several spellings, `data:`, `vbscript:`, `file:`, scheme-relative, bare host, whitespace, newline, NUL, empty string, `ftp:`); refused for the service role too; a bad link planted before the paste survives it and can be cleared; the browser rule exists and all five render sites use it.
- an unknown creator-owned policy stops the install; pasted twice; rollback file run (policies byte-identical to the start, forgeries possible again), fix re-pasted.

Known edges, on purpose: 3 live `student_work` rows name a child who was never in that class and is not in the uploader's classes today - class staff can no longer re-save those three (an admin can). A self-made `teacher` account can still add a resource of its own; that is closed by F-01 and by looking at the two unexplained teacher accounts, not here. `resource_class_access` is unchanged (any teacher can share a resource with any class - with F-18). `TeacherBooks` opens a teacher's own flip-book URL without the helper (their own data, their own session).

### Post-apply probes (read-only)

```sql
-- P1  no creator-only write policy left: expect 0 rows
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
   AND tablename IN ('student_work','student_reports','cefr_assessments','student_error_log','resources') AND cmd IN ('ALL','INSERT','UPDATE')
   AND concat_ws(' ', qual, with_check) ~ '(uploaded_by|generated_by|created_by) = auth\.uid\(\)'
   AND concat_ws(' ', qual, with_check) !~ 'staff_may_write_for|has_role';
-- P2  the new set: expect 4, 4, 4, 4 and resources 3 (+ the admin / read policies already there)
SELECT tablename, count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname ~ '_staff_(select|insert|update|delete)' GROUP BY 1 ORDER BY 1;
-- P3  the three link constraints: expect 3 rows, convalidated f
SELECT conrelid::regclass, conname, convalidated FROM pg_constraint WHERE conname LIKE '%_url_http';
-- P4  no stored link fails them: expect 0, 0 (13 Nov: 0, 0). A non-zero count names rows that can no longer be updated until fixed.
SELECT (SELECT count(*) FROM public.student_work WHERE external_url IS NOT NULL AND external_url !~* '^https?://[^[:space:][:cntrl:]]+$') work,
       (SELECT count(*) FROM public.resources WHERE (external_url IS NOT NULL AND external_url !~* '^https?://[^[:space:][:cntrl:]]+$')
                                                 OR (thumbnail_url IS NOT NULL AND thumbnail_url !~* '^https?://[^[:space:][:cntrl:]]+$')) resources;
```
Then a teacher uploads one photo in Smart Upload, approves it, and flags one error in class.

Nothing in these four tables looks planted: every row with a creator was made by the class's staff or by the former admin login (above). Rows with no creator (154) come from the service role.

Rollback: `docs/evidence/S1-F21-rollback.sql` (the seven policies verbatim; drops the new policies, helpers and constraints). Run by the suite. Reopens F-21.

---

## F-02 - the nine AI / speech / image functions

No migration. Code in `supabase/functions/` (needs a deploy of the nine, with `verify_jwt = true`) and `supabase/config.toml`.

### What each is, who calls it, and the gate it now stands behind

All nine: `requireSpender` (`_lib/ai-gate.ts`) straight after the CORS preflight, before the body is read - a real session verified with Supabase Auth (`authenticateUser`; the public key alone is 401), a role from `user_roles` (`requireRole`; an account with no role is 403; the service-role key is 403 - nothing calls these internally), then the existing in-memory limiter keyed by function + user id from the token.

| Function | Vendor | Caller in `src/` | Roles | Limit per account | Live `verify_jwt` -> now |
|---|---|---|---|---|---|
| `word-enrichment` | OpenAI | `WordExplorer.tsx:227` (Vocabulary page) | any role | 40 / 5 min | off -> on |
| `image-search` | Pixabay, Pexels, Google CSE, Unsplash | `ImageCarousel.tsx:83, 294`, `VocabularyCreator.tsx:200` | any role; `provider` / `skip_cache` staff only | 90 / 5 min | off -> on |
| `pronounce-syllables` | Azure TTS | `WordExplorer.tsx:284` | any role | 60 / 5 min | off -> on |
| `pronounce-viseme` | Azure Speech SDK | `VisemePlayer.tsx:251` (only inside `VocabularyCreator`, which nothing mounts) | any role | 60 / 5 min | off -> on |
| `smart-dictation` | OpenAI | `VocabularyCreator.tsx:224` (unmounted) | any role | 40 / 5 min | on |
| `smart-dictionary` | OpenAI + dictionaries | `VocabularyCreator.tsx:117` (unmounted) | any role | 40 / 5 min | on |
| `sapling-grammar` | Sapling | `grammarChecker.ts:416` (from `WordExplorer`) | any role | 90 / 5 min | on |
| `get-speech-token` | Azure Speech token | `video/livePronunciation.ts:27` (the video recorder) | any role | 30 / 10 min | on |
| `image-generate` | OpenAI DALL-E 3 | none | teacher, admin | 10 / 10 min | on |

"Any role" = student, family, teacher or admin. Every caller goes through `supabase.functions.invoke`, which sends the signed-in session's token; none uses a raw `fetch`; no sign-in, reset, claim, consent or shared-video page calls any of them (all asserted by the suite).

### Before / after

| Caller | Before | After |
|---|---|---|
| Nobody at all (no header) | reaches the vendor on 4 functions | 401 at the gateway (once deployed with `verify_jwt = true`) and 401 in the function |
| The public key from the web page | reaches the vendor on all 9 | 401 |
| A signed-in account with no role | reaches the vendor | 403 |
| The service-role key | reaches the vendor | 403 |
| Student / family | reaches the vendor | let through on 8, limited per account; 403 on `image-generate` and on `image-search`'s diagnostic switches |
| Teacher / TA / admin | reaches the vendor | let through on 9, limited per account |

### Tests (`ai-gate.test.mjs`, 250 assertions; each real function bundled and driven)

Per function: the version before the gate (from git) spends for a caller with no header and for the public key - the defect; then no header, the public key, a non-session token, an empty bearer -> 401; service key, role-less account, an account whose role lookup errors -> 403; all with **no vendor call and no table read**; a role-less account naming an admin in the body and headers -> 403; each of the four roles let through (or 403 on the staff-only one) with the vendor actually called; an admin who also holds `student`; exactly N calls per account pass and call N+1 is 429 with Retry-After and no spend; another account unaffected; changing IP headers does not escape; unauthenticated is still 401, not 429; the gate is the first awaited thing after the preflight and its settings are the ones tested. `edge-functions.test.mjs` (type check) stays green.

### What could break

- **The Vocabulary page for a visitor who is not signed in.** `/vocabulary` and `/student/vocabulary` are not behind `ProtectedRoute`, so today anyone with the address can look words up at the school's expense. After this they get "Could not look up word". Nothing links there before sign-in. (Decision 5.)
- A child who looks up more than 40 words in five minutes waits for the window. The limits are per account and generous for one child; a shared family login used on several devices at once shares one allowance.
- The limiter is in memory: it resets on a cold start and is per instance (audit F-12). It stops a loop, not a determined account. A durable daily cap per account belongs in `_lib/ai-gate.ts`; not built here.
- Not addressed here: F-03 (a signed-in caller's `context` still shapes the cached definition; the anonymous half is closed by the gate), input length caps, `voice` going into SSML unescaped (F-13).

### Deploying it (the conductor, after the owner agrees)

Deploy the nine functions from this branch with `verify_jwt = true` each (the four that were off are the permission change). `_lib/ai-gate.ts`, `_lib/auth.ts` and `_lib/rate-limit.ts` go with each. The browser needs no change. Post-deploy probes, no payload that reaches a vendor:

- `curl -s -o /dev/null -w "%{http_code}" -X POST https://<project>.supabase.co/functions/v1/word-enrichment -d '{}'` -> 401 (was 400: it reached the handler). Same for `image-search`, `pronounce-syllables`, `pronounce-viseme`.
- the same with `-H "Authorization: Bearer <public key>" -H "apikey: <public key>"` on all nine -> 401 (was 400 / 200).
- signed in as a child: look up one word on the Vocabulary page (definition, pictures, the syllable audio) and start the video recorder once.

Rollback: redeploy the nine from `origin/main` with their previous `verify_jwt` (off for `word-enrichment`, `image-search`, `pronounce-syllables`, `pronounce-viseme`). No data is involved.

---

## Owner decisions

| # | Decision | Recommended default |
|---|---|---|
| 1 | Apply F-01, F-14, F-15 (three pastes) | Yes, today, in that order. No real family or teacher sees a difference. |
| 2 | (withdrawn) Public sign-ups stay on - owner. The sign-up form build (`release/s1-signup-form`) goes live before the F-01 paste. | - |
| 2b | 26 of 31 family primary logins cannot read the school's bank details (`bank_info` asks for role `family` or a child's own login). Let any account that can view a child read it? | Yes, as a small separate migration. |
| 3 | F-16: a family can no longer open a classmate's skills, attendance and point history in the board pop-up (name and points stay) | Yes. Ship the browser change with the paste. |
| 4 | F-21: creators lose control of rows outside their classes (live: only the former admin login is affected - 25 rows it can no longer read as a `student`) | Yes. |
| 5 | F-02: the Vocabulary page stops working for visitors who are not signed in; four functions go behind the gateway check | Yes. |
| 6 | The 2 teacher-role accounts with no teacher record; the 15 student accounts linked to nothing; the 17 with legacy `users.role = admin` | Run `scripts/CHECK-unlinked-accounts.sql`, look each up in Authentication > Users; remove the teacher role from the two unless you know them. Nothing here changes them. |

## What is not done

- Nothing is applied, deployed or pushed.
- No real browser run: every screen claim above is from reading the code and from SQL / handler tests. The post-apply hand checks are listed per finding.
- Out of this batch, noted on the way: `get_student_homeworks` lets a teacher with any lesson ever in a class read that child's homework (F-04); `teacher_rate_on` / `assistant_rate_on` (F-17); `recompute_student_points` / `refresh_invoice_carry` unchecked (F-20); `resource_class_access` any-teacher (F-18); the `homework` bucket has no size or type limit (F-19); `calendar-events` reads the legacy `users.role` (unused by the browser); new staff accounts get `users.role = student` in that legacy column.

---

## Round 2 (after `docs/evidence/S1-review.md`)

**Where this stands:** F-14 and F-15 were approved as built and are being applied by another agent; their files are untouched since. F-01 is corrected (above, "Round 2" inside the F-01 section). Below: the class skill summary (the review's open point on F-16), the browser release branches, the F-02 deploy steps, and the two teacher accounts with no teacher record.

### Class skill figures without names - `20261113150000_class_skill_summary_without_names.sql`

The review's finding: `get_class_skill_points` (added by the F-16 migration) hands every family of a class every classmate's per-skill total with id and name - the figures the classmate pop-up no longer shows, one RPC call away.

Choice made, of the two offered: **the child's own totals plus a class summary with no names** (not "names with total points", which the board already gives through `class-leaderboard`). Reason: the two panels need exactly three class figures - best, average, top three - and none of them needs to say whose they are.

- `get_class_skill_summary(class, from, to)` returns one row per skill: `best`, `total` and `students` (for the average), `class_students`, and `top` = the three highest totals as bare integers. No id, no name, and nothing linking one skill's figures to another's.
- A family gets nothing for a class where fewer than three children have assessments in the range: a best or average over two children is the other child's score. Staff of the class and admins are not held to that.
- `get_class_skill_points` is dropped by the same file.
- The child's own totals never went through either function: the panels read the child's own rows.

In the browser (`src/lib/classSkillPoints.ts`, `RadarChartTab`, `PerformanceHeatmapTab`): class best and class average are unchanged figures; "Top 3 in <skill>" shows three medals with points and "#1 / #2 / #3" in place of first names, with "You" on the child's own entry. Teachers and admins opening the same pop-up from their boards still see names (they read the rows). The lib asks for the summary, then the named function, then rows, so it works against every state of the database.

| Who | `get_class_skill_points` (F-16 as built) | After `20261113150000` |
|---|---|---|
| A family of the class | every classmate: id, name, total per skill | per skill: best, sum, counts, top three numbers |
| A family, class with fewer than 3 assessed children | the other children's totals by name | nothing |
| Teacher / TA of the class, admin | the same named rows | the summary (and the rows themselves, as always) |
| Family of another class, unlinked, role-less, anon | nothing | nothing |

Tests: `classmate-rows.test.mjs` run with the third migration (suite "class skill summary" in `run.mjs`): before - a parent gets classmates' per-skill totals by name; after - the function is gone, the summary's result type has no uuid or name column, its figures equal what the panel used to add up from rows (best, rounded average, top three), nothing in the answer matches an id or a surname; 0 rows for a teacher of another class, another class's family, an unlinked account, a role-less account, no uid; anon cannot call; a class of two returns nothing to a family and everything to its teacher, three returns figures, a month with fewer than three assessed returns nothing; classmates' rows still closed and the child's own totals still readable; pasted twice; refused before `20261113130000`; rollback block run and the old function restored byte for byte (md5), then re-pasted.

Order: paste right after `20261113130000` (its preflight insists on it). Between the two a family can call the named function. Do not paste `20261113130000` again afterwards (it recreates the named function); if it happens, paste this file again. Browser first, as for F-16.

Probes (read-only):
```sql
-- expect one row: get_class_skill_summary, definer t, anon f, authenticated t - and no get_class_skill_points
SELECT proname, prosecdef, has_function_privilege('anon', oid, 'EXECUTE') anon, has_function_privilege('authenticated', oid, 'EXECUTE') authenticated
  FROM pg_proc WHERE proname IN ('get_class_skill_summary', 'get_class_skill_points');
```

<!-- rollback class-skill-summary -->
```sql
-- Brings back get_class_skill_points exactly as 20261113130000 defines it and
-- drops the summary. THIS REOPENS the review's point: classmates' per-skill
-- totals by name for every family of the class.
BEGIN;
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
DROP FUNCTION IF EXISTS public.get_class_skill_summary(uuid, date, date);
COMMIT;
```
