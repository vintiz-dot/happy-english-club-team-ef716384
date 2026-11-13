# S1 live apply (F-14, F-15) - project aswgmbefikhsnhogtryv

Source: commit 9ad0a53a. Authority: ledger D-18, D-9. F-01 is out of scope.

**Where I am / next step:** COMPLETE. F-14 LIVE AND VERIFIED. F-15 LIVE AND VERIFIED. No rollback was run. Nothing deployed, nothing pushed. Next step is a person's: the hand checks on the live app (a teacher uploads and opens a submission, a child hands work in, a family opens an assignment sheet, an admin opens the Pause tab).

Note: the run was interrupted once by the usage limit after A1's first read; A1 was then redone from the start (the figures below are the second read, 21:52 UTC 12 Nov = 04:52 13 Nov Hanoi).

## A1 - F-14 pre-checks (read-only) - PASS

Policies on `storage.objects` reaching bucket `homework` (the migration guard's own regex): **36**, all PERMISSIVE. 87 policies on the table in all; 39 mention "homework" in any form = these 36 + 3 for bucket `homework-videos` (not touched).

Name, command, roles, first 8 of md5(qual), first 8 of md5(with_check) (`d41d8cd9` = none):

```
Admins can delete any homework files|DELETE|authenticated|a5a4b16b|d41d8cd9
Admins can select homework files|SELECT|public|d011b7ef|d41d8cd9
Admins can update any homework files|UPDATE|authenticated|a5a4b16b|d41d8cd9
Admins can upload any homework files|INSERT|authenticated|d41d8cd9|a5a4b16b
Admins can view all homework files|SELECT|authenticated|a5a4b16b|d41d8cd9
Admins manage all homework files|ALL|authenticated|a5a4b16b|a5a4b16b
Admins view all homework|SELECT|authenticated|d011b7ef|d41d8cd9
Families read student homework submissions|SELECT|authenticated|ca188d5c|d41d8cd9
Family can view all homework files|SELECT|authenticated|ab7aeaae|d41d8cd9
Students can read their homework files|SELECT|authenticated|81947c2d|d41d8cd9
Students can upload homework files|INSERT|authenticated|d41d8cd9|c059b517
Students can upload homework submissions|INSERT|authenticated|d41d8cd9|8ddd163e
Students can view all homework files|SELECT|authenticated|87596c38|d41d8cd9
Students can view homework files|SELECT|public|af63cf2b|d41d8cd9
Students read own homework submissions|SELECT|authenticated|f7b5940d|d41d8cd9
Students upload own homework submissions|INSERT|authenticated|d41d8cd9|1ad491b3
Students view enrolled class assignments|SELECT|authenticated|6ade98e5|d41d8cd9
Students view own submissions|SELECT|authenticated|d77052ee|d41d8cd9
Teachers and admins can update homework files|UPDATE|public|85984c8a|d41d8cd9
Teachers and admins can upload homework files|INSERT|public|d41d8cd9|85984c8a
Teachers and students can read homework files|SELECT|authenticated|a9807801|d41d8cd9
Teachers can update homework files|UPDATE|authenticated|8303c81d|d41d8cd9
Teachers can upload homework assignments|INSERT|authenticated|d41d8cd9|7b65fd13
Teachers can upload homework files|INSERT|public|d41d8cd9|cda5ac00
Teachers can view all homework files|SELECT|authenticated|8db4db6d|d41d8cd9
Teachers read homework materials|SELECT|authenticated|fa6b116a|d41d8cd9
Teachers read homework submissions|SELECT|authenticated|f50bdf99|d41d8cd9
Teachers upload homework materials|INSERT|authenticated|d41d8cd9|fa6b116a
Teachers view all homework|SELECT|authenticated|ba42fd1b|d41d8cd9
Teaching assistants update homework files|UPDATE|authenticated|09d08fd9|d41d8cd9
Teaching assistants upload homework files|INSERT|authenticated|d41d8cd9|de15d83e
hw_admin_delete|DELETE|authenticated|a5a4b16b|d41d8cd9
hw_admin_insert|INSERT|authenticated|d41d8cd9|a5a4b16b
hw_admin_update|UPDATE|authenticated|a5a4b16b|a5a4b16b
hw_student_insert|INSERT|authenticated|d41d8cd9|cabc9e0c
hw_teacher_insert|INSERT|authenticated|d41d8cd9|d7b3fb57
```

Fingerprints of the whole set (md5 over `name|cmd|roles|md5(qual)|md5(with_check)` per policy, ordered by name, C collation):

| | exact text | whitespace removed |
|---|---|---|
| live | `0aed364a0c23c8a237791e9902a036eb` | `3703218929322ed594b7791f71fb56b0` |
| saved file `C:\Users\Dell\hec-tools\s1-rollback\homework-policies-before.sql` (36 CREATE POLICY, LF) | `0aed364a0c23c8a237791e9902a036eb` | `3703218929322ed594b7791f71fb56b0` |
| `docs/evidence/S1-F14-rollback.sql` at 9ad0a53a (36 CREATE POLICY) | (written on one line each) | `3703218929322ed594b7791f71fb56b0` |

So: the saved file is live byte for byte (qual / with_check), and the rollback file recreates live name by name, command, roles and expression. The migration's 36 quoted DROP names are the same set as both. Nothing on live that the rollback lacks; nothing in the rollback that live lacks.

Objects in the bucket: **99**. Fingerprint of (id, name) over all 99: `6e38afa9f6e4f34c5084a90e049bce39` (an aggregate; no name read). Path shapes: `<uuid>/<file>` 33 (30 + the 3 whose homework is gone), `assignments/<uuid>/<file>` 11, `submissions/<uuid>/<uuid>/<file>` 53, `homework-submissions/<uuid>/<file>` 2, anything else 0. Probe P3 (objects only an admin will be able to open) = 3, as the brief expects. Bucket `public` = false. RLS on `storage.objects` = on.

Helpers the new policies call, on live:

| function | returns | definer | search_path | md5(prosrc, CR removed) |
|---|---|---|---|---|
| `has_role(uuid, app_role)` | boolean | yes | public | `dcfc17cfff0b246634d5df8bf8ceb915` |
| `is_teacher_of_class(uuid, uuid)` | boolean | yes | public | `bac42052f79017f627b2d5dfc9585958` |
| `can_view_student(uuid, uuid)` | boolean | yes | public | `53f2d32704abbb600bf5eefa09130c12` |
| `auth.uid()` | uuid | no | - | - |

All executable by `authenticated`. Tables `homeworks`, `homework_submissions`, `enrollments` exist. The three `homework_object_*` helpers and the six new policy names do not exist yet (0, 0).

Storage policies that name no bucket (any kind): **0**. Policies whose bucket test is not a plain `bucket_id = '<literal>'::text`: 0. RESTRICTIVE policies: 0.

## A2 - apply `homework_bucket_scope` - DONE

`apply_migration` name `homework_bucket_scope`, query = the LF blob of `supabase/migrations/20261113110000_homework_bucket_scope.sql` at 9ad0a53a. Result: `{"success":true}`. Applied between 21:53 and 21:55 UTC 12 Nov (04:53-04:55 13 Nov, Hanoi). The file's own guard did not raise.

## A3 - verify - PASS

Policies reaching bucket `homework` now: exactly six, all PERMISSIVE, all TO authenticated. Of the 36 old names: 0 left. `storage.objects` has 57 policies in all (87 - 36 + 6). Policies naming no bucket: 0.

| policy | cmd | live `qual` / `with_check` (pg_policies) | the file |
|---|---|---|---|
| `homework_admin_all` | ALL | USING and CHECK both `((bucket_id = 'homework'::text) AND has_role(auth.uid(), 'admin'::app_role))` | `bucket_id = 'homework' AND public.has_role(auth.uid(), 'admin'::public.app_role)` (both) |
| `homework_read` | SELECT | USING `((bucket_id = 'homework'::text) AND homework_object_can_read(name))` | `bucket_id = 'homework' AND public.homework_object_can_read(name)` |
| `homework_staff_insert` | INSERT | CHECK `((bucket_id = 'homework'::text) AND homework_object_staff_can(name))` | `bucket_id = 'homework' AND public.homework_object_staff_can(name)` |
| `homework_staff_update` | UPDATE | USING and CHECK both `((bucket_id = 'homework'::text) AND homework_object_staff_can(name))` | the same expression in both |
| `homework_staff_delete` | DELETE | USING `((bucket_id = 'homework'::text) AND homework_object_staff_can(name))` | `bucket_id = 'homework' AND public.homework_object_staff_can(name)` |
| `homework_family_insert` | INSERT | CHECK `((bucket_id = 'homework'::text) AND homework_object_family_can_upload(name))` | `bucket_id = 'homework' AND public.homework_object_family_can_upload(name)` |

Same in meaning: Postgres adds the `::text` cast and drops the `public.` prefix (the schema is on the search path when it prints).

Functions the migration creates: md5(prosrc), live against local. Local = the suite `homework-bucket-scope.test.mjs` run as far as its first `db.exec(fixText)` (prelude, 20261111110000, the 36 as the starting state, then the fix), with both migration files taken as LF blobs from 9ad0a53a; the fix loaded without error.

| function | live md5 | local md5 | length | equal |
|---|---|---|---|---|
| `homework_object_can_read(text)` | `6d57dfe5cefa89bd050f6ad456b0a712` | `6d57dfe5cefa89bd050f6ad456b0a712` | 2434 / 2434 | yes |
| `homework_object_staff_can(text)` | `49733aa1fe474bd7676fcc632c1a9318` | `49733aa1fe474bd7676fcc632c1a9318` | 738 / 738 | yes |
| `homework_object_family_can_upload(text)` | `276bb3b6c44f1a3889f5df0dbab376c2` | `276bb3b6c44f1a3889f5df0dbab376c2` | 660 / 660 | yes |

No CR in any of the three on live (raw md5 = CR-stripped md5). Each: SECURITY DEFINER, STABLE, `search_path=public`; EXECUTE anon no, PUBLIC no, authenticated yes (probe P4).

Objects: 99 before, **99** after; fingerprint of (id, name) `6e38afa9f6e4f34c5084a90e049bce39` before and after, so no file was added, moved, renamed or deleted. P3 = 3 (the orphans), as expected.

The `node_modules` junction was made with `mklink /J` and removed with `cmd //c rmdir node_modules`; the two throw-away runner files are deleted; `git status` clean.

## A4 - outside probes, publishable key only, no session - PASS (all refused)

Made-up file names under all-zero uuids, in each path shape that exists. Status is the HTTP code; the code in brackets is the one in the Storage error body.

| request | result |
|---|---|
| list bucket `homework`, prefix `""`, `submissions`, `assignments`, `homework-submissions`, `submissions/<zero uuid>` | 400 (403 AccessDenied) each; no array returned |
| GET `object/authenticated/homework/` + `submissions/<u>/<u>/x`, `assignments/<u>/x`, `<u>/x` | 400 (403 AccessDenied) each |
| GET `object/public/homework/...` (same three) | 400 (404 Bucket not found: the bucket is private) each |
| POST `object/sign/homework/...` (same three) | 400 (403 AccessDenied) each |
| list with no key at all | 400 (authorization header required) |

The 403's message is `permission denied for function is_teacher_of_class`. Explained, and not from this migration: `anon` has no EXECUTE on `is_teacher_of_class`, and an older policy that is TO public, "Teachers view exam-reports files for their classes" (bucket `exam-reports`), calls it, so any SELECT on `storage.objects` by `anon` fails outright. The six homework policies are TO authenticated and never apply to `anon`. `authenticated` has EXECUTE on all of `has_role`, `is_teacher_of_class`, `can_view_student`, so this does not touch a signed-in user. Worth a line in the ledger as a wart on that exam-reports policy; nothing done about it here.

A5 (rollback): not needed, not run.

**F-14 LIVE AND VERIFIED.** Not verified by me, and it needs a person on the live app: a signed-in teacher uploading an assignment and opening a submission, a child handing work in, a family opening an assignment sheet. The rollback, if a screen breaks: `docs/evidence/S1-F14-rollback.sql`; what was there before, read from live: `C:\Users\Dell\hec-tools\s1-rollback\homework-policies-before.sql`.

## B1 - F-15 pre-checks (read-only) - PASS

`public.pause_enrollment(uuid, uuid, date, date, text)` on live, 21:59 UTC 12 Nov: one overload, returns jsonb, owner postgres, SECURITY DEFINER, `search_path=public`, no caller check in the body.

| md5(prosrc) | value | length |
|---|---|---|
| CR removed (the form the brief, the review and the suite use) | `37437aad7f6524d3d2ea9a57f7304660` = the brief's and the review's value | 1879 |
| raw (the live body has CRLF line endings) | `6c867f18c0b1e11ef3a0767eb673596e` = the value the conductor read | 1957 |

The two md5s are the same body; 78 CR characters are the whole difference.

Grants: `{postgres=X, service_role=X, authenticated=X}`; anon no, PUBLIC no. `pause_windows`: **8** rows, newest created 2026-08-09 07:18 UTC.

Saved definition: `C:\Users\Dell\hec-tools\s1-rollback\pause_enrollment-before.sql`. From its CREATE line to the end it has md5 `b4f5df390914d58868928f7b25bf75e2`, 2214 chars = md5 and length of `pg_get_functiondef` on live (the script wrote the file only on equality, then re-read it).

## B2 - apply `pause_enrollment_admin_only` - DONE

`apply_migration` name `pause_enrollment_admin_only`, query = the LF blob of `supabase/migrations/20261113120000_pause_enrollment_admin_only.sql` at 9ad0a53a. Result: `{"success":true}`, recorded on live as version 20261112220018 (22:00:18 UTC 12 Nov = 05:00 13 Nov, Hanoi). `homework_bucket_scope` is recorded as 20261112215455.

## B3 - verify - PASS

| | live | local (suite `pause-enrollment.test.mjs` run to its first `db.exec(fixText)`, LF blob) | review's expected |
|---|---|---|---|
| md5(prosrc) | `fd2186eff3f49bb91602e7bc182bece0` | `fd2186eff3f49bb91602e7bc182bece0` | `fd2186eff3f49bb91602e7bc182bece0` |
| length | 2217 | 2217 | 2217 |

No CR in the new body. The suite's own assertion that its "before" body is production's (md5 from the live catalog) passed in the same run. Still SECURITY DEFINER, `search_path=public`, owner postgres, one overload, arguments `p_student_id uuid, p_class_id uuid, p_from_date date, p_to_date date, p_memo text DEFAULT NULL::text`, returns jsonb: unchanged. The body contains "Only administrators can pause enrollments". Grants `{postgres=X, service_role=X, authenticated=X}`; anon no, PUBLIC no: as the migration states and as before. `pause_windows`: 8 before, **8** after, newest still 2026-08-09.

Rollback: not needed, not run. If ever needed: `C:\Users\Dell\hec-tools\s1-rollback\pause_enrollment-before.sql` (live, byte for byte) or the fenced block under "rollback F-15" in `S1-security-fixes.md` (the same body with LF endings).

## B4 - outside probe - PASS (refused)

`POST /rest/v1/rpc/pause_enrollment` with all-zero uuids and dates in 2000: publishable key, no session -> **401** (`42501 permission denied for function pause_enrollment`: `anon` has no EXECUTE, so the body never ran). No key at all -> 401.

**F-15 LIVE AND VERIFIED.** Not verified by me: an admin pausing a real enrollment from the Pause tab, and a signed-in non-admin being refused with "Only administrators can pause enrollments" (that needs a session; I made no account). The suite covers both against the same body (md5 equal).

## Part C - nothing else broke (read-only)

Counts at 22:00:46 UTC: homework policies 6 (the six names), storage policies 57, objects in the bucket 99 with the same fingerprint `6e38afa9f6e4f34c5084a90e049bce39`, pause windows 8, function md5s as above.

Logs from the F-14 apply (21:54:55 UTC) to 22:01:
- API gateway, storage: 15 requests, all 4xx = my 15 probes (21:56:44-47). No other storage request yet: it is 5 am in Hanoi, so the logs cannot show a real upload or download either way.
- API gateway, REST: 46 x 2xx; 2 x 4xx on rpc = my two probes; 10 x 4xx on REST = the standing error below. No 5xx anywhere.
- Postgres: `permission denied for function is_teacher_of_class` x 11 and `permission denied for function pause_enrollment` x 1 = my probes, by time and count.
- Standing, and not from these changes (both run at the same rate for hours before): `null value in column "date" of relation "point_transactions" violates not-null constraint`, 5 every five minutes (235 between 18:00 and 21:50, 10 since) - some scheduled job is failing on every run; and PostgREST `Warp server error: Thread killed by timeout manager` about two every five minutes (82 before, 4 since). Neither touched. The first deserves a look by the conductor.

## Not verified by me (needs a person on the live app)

- A signed-in teacher uploading an assignment file and opening a child's submission.
- A child / family handing work in, and opening an assignment sheet and their own submission.
- An admin opening an orphaned or any other file, and using the Pause tab.

If a homework screen fails for a real user: `docs/evidence/S1-F14-rollback.sql` (reopens F-14).

---

# Part D - F-01, `20261113100000_signup_role_from_server_only.sql`

Source: commit 42cf0dd4 (the migration corrected after the review: only a request for `teacher` gets no role; `admin` gets `student`). Asked for by the conductor after F-14 / F-15; owner approval D-18.

**Part D, where I am / next step:** started. Next: D1 pre-checks (read-only). F-01 not applied yet.

Conditions of the review, as I could check them: (1) the diff 9ad0a53a -> 42cf0dd4 of the migration is exactly review Change 1 (`IF v_requested IN ('teacher', 'admin')` became `IF v_requested = 'teacher'`, a WARNING for `admin`, header reworded); (2) `src/pages/Auth.tsx` at 6707d97d offers Student and Family only. That 6707d97d is what is deployed is the conductor's statement; I did not check the deploy.

## D1 - F-01 pre-checks (read-only, 22:43 UTC 12 Nov = 05:43 13 Nov Hanoi) - PASS, with one difference from the write-up, explained

`public.handle_new_user()`: returns trigger, SECURITY DEFINER, `search_path=public`, owner postgres; EXECUTE postgres and service_role only (anon, authenticated, PUBLIC: no).

| md5(prosrc) | value | length |
|---|---|---|
| CR removed | `b2979d905a52445265d16091df7111b2` = the brief's and the review's value | 562 |
| as stored (CRLF body) | `34791d30cc008922180015eb1a9674f2` | 582 |

Trigger on `auth.users`: one, `on_auth_user_created AFTER INSERT ... FOR EACH ROW EXECUTE FUNCTION handle_new_user()`, enabled (`O`). No other trigger calls the function.

What the file relies on: `user_roles` has `UNIQUE (user_id, role)`; `users` has `PRIMARY KEY (id)`; `has_role(uuid, app_role)` exists (md5 `dcfc17cf...`); `app_role` = admin, teacher, family, student.

`custom_quests` policies on live (RLS on, 0 rows in the table):
- `"Only admins can manage custom_quests"` ALL, TO public, USING `(EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::app_role))))`, no WITH CHECK - the one the migration drops (legacy column).
- `"Only admins can modify custom_quests"` ALL, TO authenticated, USING and WITH CHECK `has_role(auth.uid(), 'admin'::app_role)` - stays.

**Difference from the write-up:** `S1-security-fixes.md` probe P3 (and the suite's prelude) expect a third policy, "Signed-in users can read custom_quests". It is not on live. Explained: `20261110140000_scope_staff_quest_and_homework_reads.sql` dropped it on purpose. It is not something the migration reads, checks or changes, and the migration's effect is the same either way: after it the table is admin-only through `has_role`. The only screen that uses the table is the admin `XPSettingsManager`. I went on; the write-up's P3 line is stale and should say one policy.

Counts (aggregates):

| | before |
|---|---|
| `auth.users` | 76 (newest created 2026-11-10) |
| `public.users` | 76 - by legacy `role`: admin 18, family 14, student 37, teacher 7 |
| `user_roles` rows | 75 - admin 3, student 64, teacher 8 |
| accounts with no `user_roles` row | 2 |
| accounts with no `users` row | 0 |
| fingerprint of every (user, role) in `user_roles` and every (id, role) in `users` | `05beb3b8dc8439d8b267d0242d904568` |

Saved, each written only after its md5 equalled live:
- `C:\Users\Dell\hec-tools\s1-rollback\handle_new_user-before.sql` - `pg_get_functiondef`, md5 `a5552534cfd400dad594a3d16043c448`, 740 chars.
- `C:\Users\Dell\hec-tools\s1-rollback\custom_quests-policy-before.sql` - the dropped policy, md5(qual) `d1ea70dc084d0a1b9453c120b5e53e35`.
The tested rollback is the fenced block under "rollback F-01" in `S1-security-fixes.md` (same body, LF endings; same policy).

Expected after apply, computed before applying: suite `signup-role.test.mjs` at 42cf0dd4 run to its first `db.exec(fixText)` with the LF blobs (its own check that the "before" function is production's passed): md5(prosrc) `bd45aa3de0f1b6fb6a613cf9f3901f52`, 1122 chars. Junction made and removed as before; `git status` clean.

## D2 - apply `signup_role_from_server_only` - NOT DONE: STOPPED

The `apply_migration` call was refused before it reached Supabase, by the session's own permission check ("Production Deploy"), not by the database. I did not try another route (no DDL through `execute_sql`): that would be going round the refusal.

Confirmed read-only at 22:45 UTC that nothing changed: `handle_new_user` md5 (CR removed) still `b2979d905a52445265d16091df7111b2`; both `custom_quests` policies still there; no `signup_role_from_server_only` row in `schema_migrations`; 76 accounts; account fingerprint still `05beb3b8dc8439d8b267d0242d904568`.

**Part D: STOPPED AT D2. F-01 is NOT live.** D3-D5 not run. No rollback needed. F-14 and F-15 are untouched and still live.

To finish: the owner allows `apply_migration` for this session (or pastes the LF blob `git show 42cf0dd4:supabase/migrations/20261113100000_signup_role_from_server_only.sql` into the SQL editor). Then D3 expects md5(prosrc) of `handle_new_user` = `bd45aa3de0f1b6fb6a613cf9f3901f52` (1122 chars), the trigger still attached, one `custom_quests` policy left ("Only admins can modify custom_quests", `has_role`), and every count in D1 unchanged.
