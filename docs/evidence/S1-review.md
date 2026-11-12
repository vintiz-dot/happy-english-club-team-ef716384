# S1 review (independent)

Reviewed commit: e3c039f (`worktree-agent-ab290c3d49fd33671`) against `claude/hec-conductor-setup-efbaa5`. Review only: no product code changed, nothing applied, deployed or pushed. Live (`aswgmbefikhsnhogtryv`) was read read-only: catalog, md5 of function bodies, aggregate counts. No row about a person, no secret.

**Where I am / next step:** F-01 written up. Next: F-14.

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
