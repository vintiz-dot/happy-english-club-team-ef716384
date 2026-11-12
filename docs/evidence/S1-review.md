# S1 review (independent)

Reviewed commit: e3c039f (`worktree-agent-ab290c3d49fd33671`) against `claude/hec-conductor-setup-efbaa5`. Review only: no product code changed, nothing applied, deployed or pushed. Live (`aswgmbefikhsnhogtryv`) was read read-only: catalog, md5 of function bodies, aggregate counts. No row about a person, no secret.

**Where I am / next step:** F-01, F-14, F-15 written up (all three: APPLY). Next: F-16.

Method used throughout for "what can this kind of account read on live": one read-only transaction, `set_config('request.jwt.claims', ...)` with the id of an account of that kind picked inside the query (never printed), `SET LOCAL ROLE authenticated`, then `count(*)` of every table / view in `public` the role may select and of `storage.objects` per bucket. Counts only.

---

## F-01 - `20261113100000_signup_role_from_server_only.sql` - verdict: APPLY

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

One real gap, small: an account that asked for `teacher` or `admin` on the form now holds NO role, and `ProtectedRoute.tsx:24,63` renders nothing for a role-less account (blank page, no message). `link-student-user:304-314` gives such an account `student` when an admin links it to a child, but `manage-admin-users` `linkToFamily` (:597-612) sets `families.primary_user_id` and grants nothing, so that parent stays on a blank page until an admin sets the role in Admin > Users. The new form no longer offers those choices, so this needs a stale cached form; historically 24 of 76 accounts were created with metadata `admin` and 9 with `teacher`, so parents did pick them. The form was last used in May. Turning public sign-up off (owner decision) removes the path. Not a reason to hold the migration.

`student-create-migration-account`: claim verified. The function creates the account with metadata `student`, the trigger inserts `student`, the function's plain insert then violates `UNIQUE (user_id, role)` and the function deletes the account it made. Live: 0 accounts carry `migrated_from_user_id`. The change is one line, an upsert on `user_id,role` (a plain constraint, so the upsert is valid). It makes a dormant feature start working: deploy it separately and deliberately, not as part of "F-01 applied".

### c. The migration

- Idempotent (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`); one transaction; preflight raises before any change; `SECURITY DEFINER`, `search_path = public`; EXECUTE revoked from PUBLIC / anon / authenticated explicitly. No data written.
- Fails closed: a failed insert aborts the sign-up; an unrecognised value gets `student`, never more.
- Suite run by me: 80 passed. Mutations (scratch copies, repo untouched): `IN ('teacher','admin')` -> `IN ('admin')`: 8+ assertions fail; `DROP POLICY` removed: 2 fail. The suite asserts the "before" body equals the live md5.
- Rollback block restores the 20260312152157 body (the suite checks md5 = live) and the dropped policy.

### Notes for the owner

1. Look at the two record-less `teacher` accounts first (`scripts/CHECK-unlinked-accounts.sql`, read-only, ids and dates only). They are the only accounts through which F-01 may already have been used.
2. Apply F-14 the same day; until then a new sign-up still reads 99 homework files.
3. Turn public sign-up off, or accept the blank-page case above.

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
