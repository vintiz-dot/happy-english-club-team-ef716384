# S1 review (independent)

Reviewed commit: e3c039f (`worktree-agent-ab290c3d49fd33671`) against `claude/hec-conductor-setup-efbaa5`. Review only: no product code changed, nothing applied, deployed or pushed. Live (`aswgmbefikhsnhogtryv`) was read read-only: catalog, md5 of function bodies, aggregate counts. No row about a person, no secret.

**Where I am / next step:** COMPLETE. All six fixes and the live-apply brief are written up; the verdict table is at the end. F-01 was revised after the owner said family self-registration stays. Nothing was applied, deployed or pushed; the `node_modules` link used for the suites has been removed.

Method used throughout for "what can this kind of account read on live": one read-only transaction, `set_config('request.jwt.claims', ...)` with the id of an account of that kind picked inside the query (never printed), `SET LOCAL ROLE authenticated`, then `count(*)` of every table / view in `public` the role may select and of `storage.objects` per bucket. Counts only.

---

## F-01 - `20261113100000_signup_role_from_server_only.sql` - verdict: APPLY WITH CHANGES (two, listed here; do not paste the file as it stands)

The owner has since said that families registering themselves on the app is a real, needed flow and public sign-up stays on. Judged against that, the fix as built closes the hole but degrades that flow in one case, so:

**Change 1 (migration, one condition).** Withhold a role only for a request of `teacher`. A request of `admin` must get `student`, exactly as the live function does today.
- `supabase/migrations/20261113100000_signup_role_from_server_only.sql:86`: `IF v_requested IN ('teacher', 'admin') THEN` becomes `IF v_requested = 'teacher' THEN`; reword the header (:14-19, :28-37) and the WARNING to match.
- Why: on live, 24 of 76 accounts were created with metadata `admin` and only 3 accounts are admins; 17 non-admin accounts carry it, 14 of them linked to a family or child; 9 accounts with that metadata were created since March 2026 (4 in July), of which at most 3 can be the admins. Real parents pick "Admin" on the form. Today they get `student` and everything works. As built they would get no role: a blank page after sign-in (`Dashboard.tsx:19-28` and `ProtectedRoute.tsx:24,63` render nothing without a role), and it stays blank after the admin links them with "link to family", because `manage-admin-users` `linkToFamily` (:597-612) grants no role.
- Security is unchanged by this: `admin` is still never granted by a sign-up, and `student` on an unlinked account opens nothing (measured below). It also makes `manage-admin-users create` end as `{admin, student}`, which is what it produces on live today, so the change removes a behaviour difference rather than adding one.
- `teacher` stays "no row": granting `student` there would leave every admin-created teacher and TA with `{student, teacher}`, a state no live staff account has.
- With it: update `scripts/pgtest/signup-role.test.mjs` (the "asks for admin" cases expect `{student}`; `manage-admin-users create` expects `{admin, student}`; add "form says Admin, then linkToFamily -> `{student}`") and the tables in `S1-security-fixes.md`. The function md5 changes; the brief's pre-check md5 (`b2979d90...`) does not.

**Change 2 (order).** Deploy the browser build that carries `src/pages/Auth.tsx` from commit `a51434f` (the form offers Student and Family only) and confirm it is live BEFORE pasting. It is harmless against the old database. After it, the only way to ask for `teacher` is a stale page or a hand-made request.

Not blocking, but do soon: `linkToFamily` should give `student` to an account that holds no role (as `link-student-user:304-314` already does), and a signed-in account with no role should see a sentence ("the school has not finished setting up this account") instead of a blank page. Until then an admin clears such an account in one click in Admin > Users (set role).

### Family self-registration, end to end, after the fix (with the two changes)

| Step | Code | What happens |
|---|---|---|
| 1. "Join the club" | `Auth.tsx:172-183` | `signUp({ data: { role } })`, role = `student` (default, `:55`) or `family`. Email confirmation is on (76 of 76 confirmed), so there is no session yet and `/dashboard` sends them back to sign-in. Unchanged. |
| 2. Database | `handle_new_user` | `user_roles`: `student`, whichever of Student / Family / Admin was asked for. Nothing in the flow reads the role back from metadata except `assignment-calendar` (branch choice only, RLS-bounded). |
| 3. First sign-in | `Dashboard.tsx:23` -> `StudentDashboard.tsx:350-361` | role `student`, no child: the "new student" demo dashboard (welcome tour, class catalogue). This is the designed landing for a self-made account. |
| 4. What they can read before linking | measured on live as an unlinked `student` account | 8 classes, 10 avatars, 4 announcements, 2 teacher rows (F-17), the payroll month list (F-20), their own account rows. No student, family, enrollment, invoice, payment, attendance, points, report or profile row. Homework files: 99 today, 0 once F-14 is applied. |
| 5. Linking | Admin > Users: `FamilyLinkDialog` -> `linkToFamily` (sets `families.primary_user_id`), or `StudentLinkDialog` -> `link-student-user` (sets `students.linked_user_id`) | There is no self-service link for a self-made account: access codes belong to front-desk accounts, and the catalogue's "request to join" needs a student record that does not exist yet (the insert fails on an empty id - so today, not caused by this fix). The school links. Unchanged. |
| 6. After linking | `useShellQueries.ts:47-68`, `can_view_student` | The children appear through `primary_user_id` / `linked_user_id`; with two or more, the profile picker. This is how families exist on live: 32 family logins, 31 holding `student` and 1 banned with none; **0 accounts hold `family`**. |

So: a new parent can register, sign in, see nothing about any child, be linked by the school, and then reach their children. Nothing in that path depends on the role coming from sign-up metadata.

One visible difference, for the owner to know: a parent who picks "Family" used to get the role `family` and land on `/family/dashboard` ("No students are linked to your family account yet - please contact the school", and after linking a parents' page listing all children). Now they get `student` and the same screens every existing family login uses. No live account is on the `family` path, so nothing anyone uses today changes; but that page is no longer reached by new sign-ups. If the school wants it, the safe way is for an admin to set the role to Family in Admin > Users after linking - not to grant it from the form (an unlinked `family` account also reads the school's bank details, and homework files until F-14).

### a. Does it close the finding

Yes for every new account. `handle_new_user` (migration :71-97) no longer casts or stores the requested role: `teacher` / `admin` (lower-cased, whitespace removed) get no `user_roles` row, everything else gets exactly `student`; `users.role` is always `student`.

Live catalog, 13 Nov:
- `handle_new_user()` md5 `b2979d905a52445265d16091df7111b2` = the body the fix and its rollback were built against. One trigger on `auth.users`: `on_auth_user_created`, enabled. EXECUTE: postgres, service_role only.
- `user_roles_user_id_role_key UNIQUE (user_id, role)` and `users_pkey (id)` exist (plain constraints), so both `ON CONFLICT` targets are valid and the preflight passes.
- `has_role` reads `user_roles` only (md5 `dcfc17cf...`).

Everything on live that still reads the legacy `users.role` (asked: list every one):

| Reader | What it decides | After the fix |
|---|---|---|
| policy `custom_quests` "Only admins can manage custom_quests" (ALL, public) | write access for the 17 legacy-admin accounts (count confirmed: 17) | dropped by this migration (`IF EXISTS`); "Only admins can modify custom_quests" (has_role) stays |
| function `get_user_role(uuid)` (definer, EXECUTE authenticated) -> policy `classes` "Teachers can view active classes" | nothing: "Everyone can view active classes" already grants the same rows to everybody | untouched. The implementer's list names the function but not that it reads `users.role`. Harmless today; it is an oracle for any account's legacy role (F-20 class) and should go, with that policy, in a later batch |
| policy `users` "Users can update own record" WITH CHECK `role = own role` | stops an account changing its own legacy role | untouched, correct |
| edge function `calendar-events` (`index.ts:35-39`) | which branch it takes; all reads go through the caller's client | not called from `src/`; RLS still bounds it |
| edge functions `manage-admin-users` (:403), `manage-demo-student` (:130, :161) | write the column, never read it for access | - |

Not `users.role` but the same family: `assignment-calendar/index.ts:120` picks its branch from `user.user_metadata.role`, which the account itself can set. It reads through the caller's client, so RLS bounds it; not an escalation. Worth replacing with `user_roles` later.

No other policy or function in `public` / `storage` reads `users` (searched `pg_policies` and `pg_proc.prosrc`).

What a brand-new unlinked `student` account can read, measured on live with a real unlinked student-role account (counts): `classes` 8, `avatars` 10, `site_announcements` 4, `payroll_periods` 4 (F-20), `teachers` 2 (F-17), its own `users` 1 / `user_roles` 1 / `notifications` 6, and **bucket `homework` 99**. Every other table and view: 0; every other bucket: 0. So the implementer's statement is right: nothing about a child or family in any table, no tuition figures - and the one leak is the homework bucket, which is F-14. **F-01 delivers "nothing about any child" only once F-14 is also applied.** After both: classes, avatars, announcements, the payroll month list, two teacher rows.

What is NOT closed, by design, and the owner must act on: the migration changes no account. The same measurement for one of the two live `teacher` accounts that have no teacher / TA record: `student_learning_profiles` 41, `teachers` 7, `teaching_assistants` 3, `resources` 8, buckets `student-work` 217, `homework` 99, `lesson-resources` 5, `resources` 7. If either of those two is not a real member of staff, F-01 stays open for that account until its role is removed (Admin > Users). Confirmed unchanged by the migration: no statement writes `users` or `user_roles`; role counts on live now are admin 3, teacher 8, student 64, 76 accounts - the brief's pre-check numbers.

### b. Does it lock anyone out

| Who | Path (read from live where it matters) | After |
|---|---|---|
| existing accounts, every role | nothing rewritten | unchanged |
| teacher created by an admin | LIVE `create-teacher` v3 (fetched): `createUser({user_metadata:{role:"teacher"}})` then its own `user_roles` insert of `teacher` | `{teacher}` - the insert that used to be a swallowed duplicate is now the one that grants. No dependence on the metadata. |
| TA created by an admin | LIVE `create-teaching-assistant` v3 (fetched): same shape | `{teacher}` |
| admin created by an admin | repo `manage-admin-users:318-336` inserts `admin` itself (live copy not fetched; were it older, the account would show no role and `updateRole` fixes it) | `{admin}` |
| front-desk card account, not yet linked / redeemed | `manage-student-access` sends no role | `{student}` as today |
| family primary login, child with own login, shared family login | existing accounts | unchanged |
| demo student | `manage-demo-student` deletes and inserts `student` | unchanged |
| "claim" second login | see below | unchanged by the migration |

One real gap, small: an account that asked for `teacher` or `admin` on the form now holds NO role, and `ProtectedRoute.tsx:24,63` renders nothing for a role-less account (blank page, no message). `link-student-user:304-314` gives such an account `student` when an admin links it to a child, but `manage-admin-users` `linkToFamily` (:597-612) sets `families.primary_user_id` and grants nothing, so that parent stays on a blank page until an admin sets the role in Admin > Users. Historically 24 of 76 accounts were created with metadata `admin` and 9 with `teacher`, so people did pick them. With sign-up staying on, this is the reason for Change 1 and Change 2 at the top of this section: after them the gap is left only for a request of `teacher` from a stale page.

`student-create-migration-account`: claim verified. The function creates the account with metadata `student`, the trigger inserts `student`, the function's plain insert then violates `UNIQUE (user_id, role)` and the function deletes the account it made. Live: 0 accounts carry `migrated_from_user_id`. The change is one line, an upsert on `user_id,role` (a plain constraint, so the upsert is valid). It makes a dormant feature start working: deploy it separately and deliberately, not as part of "F-01 applied".

### c. The migration

- Idempotent (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`); one transaction; preflight raises before any change; `SECURITY DEFINER`, `search_path = public`; EXECUTE revoked from PUBLIC / anon / authenticated explicitly. No data written.
- Fails closed: a failed insert aborts the sign-up; an unrecognised value gets `student`, never more.
- Suite run by me: 80 passed. Mutations (scratch copies, repo untouched): `IN ('teacher','admin')` -> `IN ('admin')`: 8+ assertions fail; `DROP POLICY` removed: 2 fail. The suite asserts the "before" body equals the live md5.
- Rollback block restores the 20260312152157 body (the suite checks md5 = live) and the dropped policy.

### Notes for the owner

1. Look at the two record-less `teacher` accounts first (`scripts/CHECK-unlinked-accounts.sql`, read-only, ids and dates only). They are the only accounts through which F-01 may already have been used.
2. Apply F-14 the same day; until then a new sign-up still reads 99 homework files.
3. Public sign-up stays on (owner). The implementer's recommendation to switch it off, and step 4 of the brief's F-01 item, no longer apply; `handle_new_user` is then the only control, which is why its behaviour for each requested value has to be exactly right.

### Migration timestamp

`20261113100000_d4_floors.sql` (commit 1235215, another task) carries the same 14 digits. The file names differ, so nothing overwrites anything in git; `run.mjs` lists files by full name; and live versions are assigned by `apply_migration` at apply time (live shows 20261111083108, 20261112101734 ..., not the file stamps), so `schema_migrations` cannot collide. It matters only to a tool that keys on the 14 digits (`supabase db push`), which this project does not use. Rename whichever merges second if tidiness is wanted; not a blocker.

---

## F-14 - `20261113110000_homework_bucket_scope.sql` - verdict: APPLY

### a. Does it close the finding

Yes. After it, the only policies on `storage.objects` that can say yes for bucket `homework` are the six it creates, and each asks a question about the caller and the object's own path.

Other ways in, looked for on live:
- Policies naming the bucket: exactly 36, and the set of names equals the migration's DROP list (0 live names missing from it; 0 names in it missing from live).
- A policy that mentions `homework` in another form (`IN (...)`, `ANY`, `LIKE`): none. A policy with no bucket test at all: none. A policy whose bucket test is not a plain `bucket_id = '<literal>'::text`: none (87 policies on the table in total). So the migration's guard has nothing to trip on today, and its regex is not hiding a differently-written policy.
- All 36 are PERMISSIVE; there is no RESTRICTIVE policy whose loss would matter.
- Bucket row: `public = false`. No size or type limit (F-19, not this batch).
- Edge functions: none touches the bucket (searched every `storage.from(` in `supabase/functions`); no service-role read on a caller-supplied key.
- RPC: `get_student_homeworks` returns keys, never bytes; a key without a policy pass opens nothing.
- Signed URLs: made by `createSignedUrl(key, 3600)` (`HomeworkDetailDialog.tsx:82`, `ClassHomework.tsx:137`, `AssignmentUpload.tsx:269`), which needs SELECT on the object, so after the fix only a permitted reader can mint one. A URL minted before the paste stays valid for up to one hour. Accepted.
- The three helpers are EXECUTE for `authenticated` only and answer about the caller alone; they return false for a missing homework and for a wrong shape alike, so they are not an existence oracle.

The cross-family and cross-class refusals asked for: a classmate's family fails `can_view_student(<student in path>, uid)` and is not staff, so a submission is refused (migration :114-123); a teacher of another class fails `is_teacher_of_class(uid, <homework's class>)` (:105-106, :119-122); a self-made `teacher` with no classes fails the same test; an unlinked `student` passes nothing. The suite asserts each (15 people x 9 objects).

### Path shapes on live (aggregate; first segment classified, no name read) - 99 objects

| First segment / depth | Objects | Homework exists | Referenced by | New rule |
|---|---|---|---|---|
| `<uuid>/<file>` | 30 | yes | `homework_files` 30 | class staff + families enrolled now |
| `assignments/<uuid>/<file>` | 11 | yes | `homework_files` 11 | same |
| `submissions/<uuid>/<uuid>/<file>` | 53 | yes; student exists; an enrollment of that child in that class exists: 53 of 53 | `homework_submissions` 50, 3 unreferenced | that child's logins + class staff |
| `homework-submissions/<uuid>/<file>` | 2 | - | `homework_submissions` 2 | that child's logins + staff via the row |
| `<uuid>/<file>`, homework gone | 3 | no | nothing | admin only (the 3 orphans; probe P3 = 3) |
| anything else | 0 | | | |

Every stored key agrees with its row: 41 of 41 `homework_files.storage_key` carry their own `homework_id`; 50 of 50 `submissions/` keys carry their row's `homework_id` and `student_id`; no stored key lacks its object. So "decided by path" and "decided by row" give the same answer for every file the app can list.

### b. Does it lock anyone out

Paths the code writes or reads (all ten calls in `src/`, re-read): `AssignmentUpload.tsx:201-205` `<hw>/<ts>.<ext>`; `ClassHomework.tsx:94-100` `assignments/<hw>/<ts>-<name>`; `HomeworkSubmission.tsx:116-120` `submissions/<hw>/<student>/<ts>-<name>` (`upsert: false`); reads by stored key at `AssignmentUpload:269`, `ClassHomework:136`, `SessionDrawer:120`, `HomeworkSubmission:238`, `HomeworkDetailDialog:82`, `HomeworkGrading:236`, `HomeworkGradingList:198`. No move, copy, remove or upsert anywhere.

| Who | Flow | Why it still works |
|---|---|---|
| teacher, 4 pm, uploads an assignment | inserts `homeworks` (table policy `hw_teacher_all` = `is_teacher_of_class`), then uploads `<hw>/<file>` | the storage rule asks the same `is_teacher_of_class` for the same class, plus role `teacher`. A teacher who can create the homework can upload its file. |
| teacher / TA opens a submission to grade | lists rows through `hw_sub_teacher_all` (= `is_teacher_of_class`), downloads the key | same function, same class |
| TA | account holds `teacher` (live `create-teaching-assistant` grants it); `is_teacher_of_class` covers TAs by lesson and by standing assignment | allowed |
| staff record whose account lacks role `teacher` | live: 1 - an inactive teacher record on a banned, role-less account | correctly refused; nobody real |
| child with own login / family primary login / child picked on a shared family login | `can_view_student`: `linked_user_id`, `secondary_user_id`, family `primary_user_id` | this is a superset of the table policies that let the same login insert and read the `homework_submissions` row ("Students can insert / view own submissions": linked or primary). Anyone who can save the row can upload and re-open the file. |
| family opens the assignment sheet | child enrolled in the class now | superset of `hwf_student_read` (which lists the file only for `end_date IS NULL`) |
| child who left the class | own submissions still readable; late hand-in still allowed (an enrollment existed) | - |
| admin | `homework_admin_all` | everything, including the 3 orphans |
| front-desk account not yet linked; brand-new sign-up; demo student outside its class | - | nothing, as intended |

Two things that are not lock-outs but worth knowing: (1) 5 active children have a sibling whose login cannot reach them through `can_view_student` (linked to one child, not the family's primary login). That login cannot save a submission row for them today either, so nothing changes; if the school expects a shared login to cover those siblings, the fix is the family's `primary_user_id`, not this migration. (2) Staff reach follows `is_teacher_of_class`'s window (default teacher, timetable slot, a lesson in the last 7 / next 60 days, TA assignment): a one-off cover teacher from more than a week ago cannot open the files, and equally cannot see the rows. Consistent with every homework table.

The Storage API: an upload without upsert is an INSERT under the caller's role; the suite's flow tests use `INSERT ... RETURNING`, the stricter form, and every uploader can read what it uploads. The stand-in is `storage.objects` with RLS, not the API, so the brief's same-day hand check (teacher upload + open, parent open + hand in) is the right last proof. Do it before 4 pm, not at it.

### c. The migration

- One transaction; preflight; helpers `SECURITY DEFINER`, `STABLE`, `search_path = public`, EXECUTE revoked from PUBLIC / anon and granted to `authenticated` explicitly; every object schema-qualified; no object moved or deleted; idempotent (drops its own six first).
- Fails closed: unknown shape, missing homework, NULL uid or name -> false; the guard raises and rolls everything back if any policy it does not know still reaches the bucket.
- Applies to live as it is: all 36 names exist (and are `IF EXISTS` anyway); `is_teacher_of_class(uuid,uuid)`, `can_view_student(uuid,uuid)`, `has_role(uuid,app_role)` exist; storage policies were created by a migration on this project two days ago (20261111083108), so the role can.
- Rollback `docs/evidence/S1-F14-rollback.sql`: I fingerprinted each of its 36 `CREATE POLICY` statements (name, command, roles, USING, WITH CHECK, whitespace removed) and compared with `pg_policies` on live: 36 of 36 identical. It restores exactly what is there now.
- Suite run by me: 141 passed. Four mutations, all caught: submission read without the family test (22 fail); UPDATE / INSERT `WITH CHECK` without the staff test (30); "enrolled now" removed (1); staff write without `is_teacher_of_class` (4).

Note kept from the implementer, and it matters: do not paste `20261111110000_ta_standing_assignments_and_homework_upload.sql` again after this one - it recreates two of the 36.

---

## F-15 - `20261113120000_pause_enrollment_admin_only.sql` - verdict: APPLY

- Only the role check was added. Live body md5 `37437aad7f6524d3d2ea9a57f7304660` (1879 chars) is the brief's pre-check value. Independently: the migration's body with the five-line check removed has md5 `033084194b1c0d31856174fa8174f017` (1873 chars), and the live body with trailing spaces at line ends removed has the same md5 and length. So the difference from live is the check plus six trailing blanks. Same signature, one overload, owner postgres, `SECURITY DEFINER`, `search_path = public`.
- The check is the first statement: no uid, or not `has_role(uid,'admin')`, raises 42501 before any write. Its three siblings (`end_enrollment`, `change_enrollment_days`, `modify_enrollment_transfer`) already carry a `has_role` check on live.
- Callers: `src/components/admin/ModifyEnrollmentModal.tsx:186` only; no edge function, no other database function (searched `pg_proc`), no cron job. The modal is opened from the admin class screen and from `StudentEnrollmentsTab.tsx`, where the button needs `role === "admin"` (:57). **The Pause tab works for an admin exactly as before**; nobody else had a screen for it.
- The service role (no uid) is now refused. Nothing calls it that way.
- Was it used by a non-admin: 8 pause windows on live, all by one account (4 Jul - 9 Aug), which holds only `student` today. Its 792 audit rows (40 kinds of action, 12 Oct 2025 - 10 Oct 2026) are admin work: the former shared admin login. I agree with the implementer's reading. Note for the owner: that login can no longer pause - correct, it is not an admin - so whoever pauses now must use a real admin login.
- Migration: one transaction, preflight, `CREATE OR REPLACE`, grants restated (anon / PUBLIC revoked, authenticated granted), no row written. Suite run by me: 37 passed. Mutations caught: check reduced to "has a uid" (9 fail); `admin` -> `teacher` (7); one line of the body changed (3, including "the only difference from the live body").
- Rollback block: the live body; the suite asserts its md5 equals live.

Full run by me on e3c039f: `node scripts/pgtest/run.mjs` -> 4198 assertions across 47 suites, 0 failed (includes `app typecheck` 3/0, i.e. `tsc --noEmit -p tsconfig.app.json`, and `edge functions typecheck` 5/0). Same numbers as the implementer reports.

---

## F-16 - `20261113130000_classmate_rows_private.sql` - verdict: APPLY, browser build first

### a. Does it close the finding

Yes for rows. Measured on live as a real family primary login (two children; counts only), rows it can read today about children outside its family: `students` 12 full rows, `attendance` 1260, `skill_assessments` 604, `point_transactions` 1480 - and, in every other table with a `student_id` column, only `student_points` 135 (month totals, kept on purpose) and `class_monitors` 1 (who the monitor is). Nothing else: invoices, payments, enrollments, learning profiles, CEFR, homework submissions all 0. So the four tables the migration narrows are the whole leak, and each new policy is `is_family_student(<child>, auth.uid()) AND <the old test>`, which cannot return a row the old one did not.

Other ways to the same rows after the fix:
- Other policies on the four tables (all listed from live): admin, staff of class, `can_view_student` family policies, own record. None is class-wide for a family. The only live policy calling `can_view_classmate` is the one being replaced, so the guard passes.
- `enrollments` "Users can view permitted enrollments" (`can_view_enrollment`): admin, class staff, own family (incl. sibling path). No classmates. Confirmed by the measurement (0).
- `class-leaderboard` (LIVE copy fetched, v4): service role, checks the caller, returns id, name, avatar and point totals only. That is the intended board.
- New `get_class_skill_points`: **returns every classmate's per-skill total with id and name to every family of the class.** No comments, dates or rows - but it is the same figure the classmate pop-up's skills chart drew, one RPC call away. The panels use it only for "class best", "class average" and the top three. It is narrower than today, so it does not block applying, but it does not match the line the pop-up now shows ("Skills ... are private"). Owner decision below; a later version should return only best / average / top-three.

### b. Does anyone lose something they should keep (name and points on every board)

| Screen | Source, verified | After |
|---|---|---|
| Family / child class board (Star Board, High Scores, Night League, podium): `StudentClassLeaderboard.tsx:101`, mounted in `StudentDashboard.tsx:664` and `StudentOverviewTab.tsx:153` | edge function `class-leaderboard`; `canReadLedger={false}` (:204) so no `point_transactions` read | names, avatars, points unchanged |
| Staff boards: `ClassLeaderboardShared` (teacher pages, admin `StudentDetail` - route admin only), `ProjectedBoard`, `/board-window/:classId` (teacher / admin route), `LeaderboardTool` | staff policies (`can_view_student_in_class`, `is_teacher_of_class`, admin) | unchanged |
| Calendar (`GlobalCalendar.tsx:150-170`, `StudentScheduleCalendar`) | own child's enrollments and attendance, by `student_id` | unchanged |
| Student dashboard, parent dashboard (`StudentDashboard.tsx:164,293`, `FamilyDashboard.tsx:54-111`), heat-map, points chart | every query filters by the own child's id; family policies (`can_view_student`) still cover them | unchanged |
| In-app assistant | `studentFor` / `classFor` refuse other children before any query; `chat-assistant` suite green in my run | unchanged |
| Classmate pop-up (`StudentAnalyticsModal`) | reads the four tables by the tapped child's id | header only (name, avatar, level, points from the board's own data) and the private line |
| Own child's pop-up: class best / average / top three | `get_class_skill_points` | same figures (suite compares figure for figure) |

No family-facing query embeds `students(...)` on a class-wide read except the two panels that were converted; I searched every `students(` embed and every `.from("students" | "attendance" | "point_transactions" | "skill_assessments" | "student_points")` outside the admin and teacher trees. The compare picker in `PerformanceHeatmapTab.tsx:90` lists classmates from `enrollments`, which a family could never read for other families, so it already offered only siblings.

### What ships with it, and the order

Browser build: commit `0123c4f` - `src/lib/classSkillPoints.ts` (new), `src/components/student/analytics/RadarChartTab.tsx`, `src/components/student/analytics/PerformanceHeatmapTab.tsx`, `src/components/student/StudentAnalyticsModal.tsx`.

- Browser first, database old: the RPC is missing, `fetchClassSkillPoints` falls back to the old query; the pop-up's row probe finds the classmate's row (old policy), so the tabs show as today. Nothing visible changes. **This is the order to use.**
- Database first, browser old: a classmate's pop-up opens four empty tabs, and - worse, because it looks right - the own-child pop-up computes "class best", "class average" and "top three" from the only rows it can still read, the family's own, so a child is shown as best in class. Wrong figures, no error. It lasts until the new build is deployed and each open tab is reloaded (navigation is network-first in `public/service-worker.js`, so a reload is enough).

The implementer's "either order" is true for errors but not for what the screen says; the brief's "ship the browser build with it" should read "deploy the browser build, confirm it is live, then paste".

### c. The migration

- One transaction, preflight, guard, idempotent, no row written; both functions `SECURITY DEFINER`, `STABLE`, `search_path = public`, EXECUTE revoked from PUBLIC / anon, granted to `authenticated`.
- Live pre-checks hold: the four old policies exist under their names; md5 of `can_view_classmate` `ffe7e1f8...`, `can_view_student` `53f2d327...`, `can_view_enrollment` `3bbba012...`, `is_student_enrolled_in_class` `e8d7b359...` equal the brief's values.
- Rollback `S1-F16-rollback.sql`: its four policies fingerprinted against live `pg_policies` (name, command, roles, USING): 4 of 4 identical.
- Suite run by me: 77 passed. Mutations caught: family test removed from the three `student_id` policies (11 fail); `is_family_student` made always true (10); `get_class_skill_points` opened to anyone (4).

---

## F-21 - `20261113140000_creator_rows_need_class_staff.sql` - verdict: APPLY (browser build first, as F-16)

### a. Does it close the finding

Yes. On live each of `student_work`, `student_reports`, `cefr_assessments`, `student_error_log` has one staff policy, `FOR ALL`, `<creator> = auth.uid() OR (class_id IS NOT NULL AND is_teacher_of_class(...))`, and `resources` has insert / update / delete on `uploaded_by = auth.uid()` for role `public`: any signed-in account could write rows about any child. After the migration every write needs role `teacher`, staff of the row's class, the caller as creator on insert, and a child who belongs to that class (or to one of the caller's classes); `resources` needs `teacher` or `admin`. The other policies on the five tables (listed from live) are admin, own-child reads and class-shared reads; none writes. The guard finds nothing else on live.

Left open on purpose, and correctly labelled by the implementer: a self-made `teacher` account can still add its own `resources` row (closed by F-01 plus the owner looking at the two record-less teacher accounts); `resource_class_access` (F-18).

### b. Staff-of-class rule against live rows (aggregates) - does any teacher lose work in progress

| Table | Rows with a creator | Creator is staff of the row's class today | Other |
|---|---|---|---|
| `student_work` | 253 | 246 (3 teachers) | 7 by the former admin login |
| `student_error_log` | 170 | 170 (1 teacher) | - |
| `student_reports` | 9 | 0 | 9 by the former admin login |
| `cefr_assessments` | 9 | 0 | 9 by the former admin login |
| `resources` | 8 | all 8 by accounts holding `teacher` | - |

- No row has `class_id` NULL. 6 `student_work` rows are pending review; all 6 were uploaded by a teacher who is staff of that class now, so every item in a review queue can still be approved.
- 3 `student_work` rows name a child who never had an enrollment in that class and is not in the uploader's classes: all 3 are already `approved`, so nothing is waiting on them; only an admin can re-save them. Error log: 0 such rows.
- **"The former admin login loses access (25 rows)": confirmed.** 7 + 9 + 9 = 25 rows were created by one account, the same one that made the 8 pause windows; it holds only `student` today and its 792 audit rows are admin work (12 Oct 2025 - 10 Oct 2026). Today it can still read and edit those 25 rows as a non-staff account, which is the defect. After: it cannot; class staff, admins and the children's own families read them as before. Every one of the 25 has a class.
- The writers in `src/`, re-read: `TeacherSmartUpload.tsx:331-345, 439-451, 478-488, 532-544`; `BulkReportExport.tsx:164-176` (from `TeacherClassDetail`, class set); `AIReportDialog.tsx:66-78` (mounted only in the admin `StudentDetail`); `StudentActionPopover.tsx:196-207`; `TeacherTranscripts.tsx:588-632`; `useResources.ts:237, 334, 375`. Each sets the creator to the caller and the class to the class open. Each insert that asks for the row back passes the new SELECT policy (creator holding `teacher`).
- Links: 0 stored links fail the new CHECK (probe P4 = 0, 0 now). Smart Upload already refuses a non-http(s) link before saving (`:471`). `ResourceUploadDialog.tsx:186` does not: a teacher who types `docs.google.com/...` without `https://` used to save a dead link and will now get the database's constraint message. Correct outcome, poor wording; worth a friendly check in that dialog later.

Role by role: admin unchanged; teacher / TA of the class unchanged for every screen above; a teacher keeps reading rows they created in a class they have left but cannot edit them; children and families: reads unchanged (their policies are not touched); unlinked / new / demo accounts: could write, now cannot.

### c. The migration

- One transaction, preflight, guard, idempotent; three helpers `SECURITY DEFINER`, `STABLE`, `search_path = public`, grants explicit; constraints `NOT VALID` (no table scan, no existing row touched). No trigger on the four tables; `resources` has only its `updated_at` trigger.
- Rollback `S1-F21-rollback.sql`: its seven policies fingerprinted against live: 7 of 7 identical.
- Suite run by me: 123 passed. Mutations caught: `is_teacher_of_class` removed from `staff_may_write_for` (4 fail); creator test removed from the reports insert (1); thumbnail constraint loosened (2).
- Browser files: commit `371a628` - `src/lib/safeUrl.ts` (new), `ResourceCard.tsx`, `MyWorkGallery.tsx`, `StudentLessonDetail.tsx`, `TeacherResources.tsx`, `TeacherSmartUpload.tsx`. They only stop a non-http(s) link being rendered, so they are safe to ship first and independent of the paste.

---

## F-02 - nine functions behind `requireSpender` - verdict: APPLY WITH CHANGES (to the deploy steps, not the code)

### a. Does it close the finding

Yes. Each of the nine calls `requireSpender` straight after the CORS preflight: a real session (the public key alone is 401), a role in `user_roles` (none is 403, the service key is 403), then the per-account limiter. `_lib/auth.ts` and `_lib/rate-limit.ts` are unchanged from the base branch. Live `verify_jwt` today: `word-enrichment`, `image-search`, `pronounce-syllables`, `pronounce-viseme` false; the other five true - as the implementer states. Known limit, stated by the implementer: the limiter is per instance and in memory.

### b. Who is locked out

- Every caller in `src/` uses `supabase.functions.invoke` (`WordExplorer.tsx:227, 284`, `ImageCarousel.tsx:83, 294`, `VisemePlayer.tsx:251`, `VocabularyCreator.tsx:117, 200, 224`, `grammarChecker.ts:416`, `livePronunciation.ts:27`), which sends the signed-in session's token. No raw `fetch`, no other function calls them.
- A signed-in child, parent, teacher or admin holds a role: on live the only accounts with no role are 2, both banned. So no real account meets the 403.
- The video recorder (`get-speech-token`): `startLivePronunciation` returns null on any error and recording carries on without the pronunciation summary, so even a 429 or 403 here cannot stop a child handing in a video. The recorder is mounted only in the signed-in homework screen; the parents' shared-link page (`/watch/:token`) does not use it.
- Grammar check and pictures are best-effort in the same way (`grammarChecker.ts:413-437`, `ImageCarousel.tsx:92-96`).
- Signed-out visitors: `/vocabulary` and `/student/vocabulary` have no route guard (`App.tsx:169-170`), so a visitor with the address gets "Could not look up word" afterwards. Who uses it signed out today: the gateway log for the last 24 hours (the whole window kept) shows 9 calls to the nine functions in total, each an empty-body probe answered 400 / 401 - no lookup by anyone, signed in or not, and no recorder start. Nobody will notice; I could not look further back than a day.
- A shared family login used on several devices shares one allowance (40 words / 5 min). Acceptable.

### c. Deploy list, and what to change in the brief's F-02 item

Each function: its own `index.ts` plus `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts`. Checked: each `index.ts` has exactly one relative import (`../_lib/ai-gate.ts`); `ai-gate.ts` imports `./auth.ts` and `./rate-limit.ts`; those import nothing relative. Functions: `word-enrichment`, `image-search`, `pronounce-syllables`, `pronounce-viseme` (verify_jwt false -> true), `smart-dictation`, `smart-dictionary`, `sapling-grammar`, `get-speech-token`, `image-generate` (already true).

Changes to the brief:
1. Before deploying each function, `get_edge_function` it, keep the returned source in the evidence folder, and compare it with `git show claude/hec-conductor-setup-efbaa5:supabase/functions/<name>/index.ts` ignoring line endings. If they differ, stop: the deploy would silently change something else. (I did this for `get-speech-token`: identical. The other eight are not checked.) The saved copy, not `origin/main`, is the rollback.
2. State the file names and entry point for the deploy: `<name>/index.ts` with `_lib/...` beside it, so `../_lib/ai-gate.ts` resolves (live functions deployed in bulk sit at `source/supabase/functions/<name>/index.ts`; the ones redeployed through the tool sit at `source/<name>/index.ts`).
3. Deploy `get-speech-token` last and not during lesson or homework hours; it is the one a child's recorder touches.
4. The suite has no migration to mutate; its own contrast is the pre-gate source from git, driven with the same requests (no header, public key) and shown to reach the vendor. I did not add a mutation of my own to the function sources.

---

## The live-apply brief (`S1-live-apply-brief.md`)

Sound in shape: one item at a time, stop on any difference, LF blobs from the commit (the working copies here are CRLF: `i/lf w/crlf`), md5 of every created function after each paste, counts before and after, a rollback per item. Every pre-check value in it matches live now: `handle_new_user` `b2979d90...`, `pause_enrollment` `37437aad...`, the four F-16 helper md5s, role counts admin 3 / student 64 / teacher 8, 76 accounts, 99 homework objects, 8 pause windows, 36 homework policies (same names as the DROP list), F-21 P4 = 0, 0. All three rollback files reproduce live exactly (36 + 4 + 7 policies fingerprinted).

Changes needed:
1. **F-01**: do not apply until the migration carries Change 1 (above); deploy the browser build first; delete step 4 (switching sign-up off - the owner keeps it on). In the hand check, also join choosing each option the old form had, by a direct request if the form no longer offers it: `admin` -> shows Student; `teacher` -> shows no role.
2. **F-16 and F-21**: "ship the browser build with it" must read "deploy the browser build, confirm it is live, then paste". For F-16 the other order shows wrong "class best / average" figures, not an error.
3. **F-02**: the four points in the F-02 section above.
4. **Rollbacks**: say where each one is in the item itself - F-01 and F-15 are the fenced blocks in `S1-security-fixes.md`, F-14 / F-16 / F-21 the three `.sql` files, F-02 the saved pre-deploy sources.
5. **Expected md5 after apply** can be written into the brief now for F-15 instead of being recomputed: `pause_enrollment` -> `fd2186eff3f49bb91602e7bc182bece0` (2217 chars), which is the body between the `$function$` markers of the LF file.
6. **Probes with the public key only** exist for F-02. For the SQL items the probes are catalog reads, which is right; two cheap outside probes are worth adding: with the publishable key and no session, `POST /rest/v1/rpc/pause_enrollment` is refused, and listing bucket `homework` returns nothing.
7. **Order today**: F-14 and F-15 first (both APPLY as they stand), F-01 after its change. F-14 is the one that removes what a just-registered account can read about children right now, so it should not wait for F-01.
8. `apply_migration` is given files that carry their own `BEGIN` / `COMMIT`; that is how 20261112101734 and the others went in, so it works, but the preflight / guard "nothing has changed" promise rests on the file's own transaction - do not strip it.

---

## Verdicts

| Fix | Verdict |
|---|---|
| F-14 homework bucket | **APPLY** |
| F-15 pause_enrollment | **APPLY** |
| F-01 sign-up role | **APPLY WITH CHANGES**: `admin` request -> `student` as today (only `teacher` gets no role), suite and write-up updated; browser build with the new form live first |
| F-16 classmates' rows | **APPLY**, browser build (`0123c4f`) live first |
| F-21 creator rows | **APPLY**, browser build (`371a628`) live first |
| F-02 nine functions | **APPLY WITH CHANGES** to the deploy steps: snapshot and compare live source first; `get-speech-token` last, outside lesson hours |

Owner decisions: (1) the two `teacher` accounts with no teacher record still read 41 learning profiles and 217 student-work files - no migration here removes that; (2) whether families of a class should still get every classmate's per-skill totals by name (`get_class_skill_points`) or only best / average / top three; (3) whether new parents should ever get the parents' page (`family` role) - if so an admin sets it after linking; (4) F-16's visible change: a classmate's pop-up shows name and points only.
