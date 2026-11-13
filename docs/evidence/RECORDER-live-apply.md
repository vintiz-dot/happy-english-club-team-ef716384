# RECORDER live apply - the class recorder's database objects and `recorder-retention` on live

Project `aswgmbefikhsnhogtryv`. Authority: owner decision D-22 (the recorder goes to live for the owner's hardware tests once this round passes review; review 5 + Round 6: PASS), with D-9 / D-19 (SQL pushed directly). Manifest: `docs/evidence/RECORDER-release.md` section 3, followed in order. Branch `release/recorder-1` (main f5987804 + the recorder, round 6). Not done here: the push to main (the conductor's). No secret is printed anywhere in this file.

**Where I am / next step:** see the last section.

## Step 1 - pre-checks (read-only), 2026-11-13 06:46 UTC (13:46 Hanoi), repeated before step 2

| Check | Live | Expected |
|---|---|---|
| `public.class_recordings` / bucket `class-recorder-audio` / `public.recorder%` functions / the two triggers | none / none / none / none | none |
| RLS on `storage.objects` | true | true |
| bucket `class-recordings` | exists, private | exists, private |
| policies naming `class-recordings` | `class_recordings_admin_all` ALL, `class_recordings_staff_delete` DELETE, `_staff_insert` INSERT, `_staff_select` SELECT, `_staff_update` UPDATE (5) | the five T2 left |
| permissive storage policies not scoped by `bucket_id` | 0 | 0 (else the preflight refuses) |
| policies naming `class-recorder-audio` | 0 | 0 |
| pg_cron / pg_net / runner token row 1 present (value not read) | 1.6.4 / 0.20.0 / true | true |
| `cron.job` named `recorder-%` | 0 | 0 |
| columns the migration reads (`classes.default_teacher_id`, `schedule_template`; `sessions.teacher_id`, `date`, `start_time`, `end_time`, `status`; `enrollments.start_date`, `end_date`; `teachers.user_id`, `is_active`; `session_participants.teaching_assistant_id`, `participant_type`) | all present | present |
| `session_status` enum | Scheduled, Held, Canceled | includes Canceled |
| `has_role(uuid, app_role)`, `is_teacher_of_class(uuid, uuid)` | present | present |
| Postgres | 17.6 | - |

Baseline for "nothing else changed": 14 buckets; cron jobs `rebuild-upcoming-sessions`, `stars-sync`; 57 storage policies; 392 public functions; triggers on `sessions` (10) and `enrollments` (3) listed; last migration 20261113020551.

Local reference (pglite, PG 17, the LF files from `release/recorder-1` on the recorder suite's prelude): 32 functions with per-function md5 of the CR-stripped body, 19 policies, the view; kept in the reviewer's worktree `.rel/local-fp.json` and compared below.

## Step 2 - `20261112100000_class_recorder.sql` applied, 14:37 Hanoi (07:37 UTC)

Re-checked at 14:32 Hanoi just before: still not installed, 0 unscoped storage policies, 5 old `class-recordings` policies. `apply_migration` name `class_recorder`, query = the LF text of the file (2222 lines, 112857 bytes, pure ASCII). Result `{"success":true}`; recorded as version `20261113073752`.

Verification (read-only):

| Check | Live | Local load / expected | |
|---|---|---|---|
| stored migration text: length, md5 | 112857, `e61e5f5a238d7efd166900fb09a7e9ca` | the file: 112857, `e61e5f5a238d7efd166900fb09a7e9ca` | byte-identical |
| functions `public.recorder%`: per-function md5 of the CR-stripped body, SECURITY DEFINER flag, `proconfig` | 32 | 32, all equal (32 / 32, 0 mismatches) | same |
| view `recorder_session_evidence` (md5 of `pg_get_viewdef`, CR-stripped) | `303533a3ebedba932de4a26ca20c19db` | `303533a3ebedba932de4a26ca20c19db` | same |
| policies (table.name:cmd:roles) | 19: 17 on the nine tables + `class_recorder_audio_insert` INSERT, `class_recorder_audio_select` SELECT on `storage.objects`, all `authenticated` | the same 19 | same |
| tables | 9 tables, RLS on every one + the view | the same | same |
| triggers | 10: the 8 on the recorder's tables + `enrollments.recorder_enrollment_consent` + `sessions.recorder_session_canceled` | the same 10 | same |
| bucket `class-recorder-audio` | private, 8388608, `{audio/webm,audio/flac,audio/x-flac,audio/wav,audio/x-wav,application/json}`, 0 objects | the same | same |
| old `class-recordings` policies | the same 5 | unchanged | same |
| storage policies total / buckets total | 59 / 15 | 57 + 2 / 14 + 1 | as expected |
| classes switched on / settings rows | 0 / 1 | 0 / 1 | nothing records |
| `anon`: table grants on the recorder's tables / EXECUTE on recorder functions | 0 / 1: `recorder__audit_is_append_only()`, a trigger function (returns `trigger`; Postgres refuses to call it outside a trigger), not revoked in the file and given to `anon` by the project's default privileges | - | explained, harmless |

No difference left unexplained. Step 2 done.

## Step 3 - `20261112101000_recorder_retention_cron.sql` applied, 14:40 Hanoi (07:40 UTC)

Before: the existing nightly job `rebuild-upcoming-sessions` uses the same public anon key and reads the runner token at run time, and `net._http_response` holds only 200s over the last 3 days (74), so the gateway accepts that key. `apply_migration` name `recorder_retention_cron`, query = the LF text (79 lines). Result `{"success":true}`; version `20261113074019`.

| Check | Live | Expected |
|---|---|---|
| stored text: length, md5 | 4633, `c2fc2e172a7a265b04670037bfed53e3` | the file: 4633, `c2fc2e172a7a265b04670037bfed53e3` |
| `recorder-retention` | `0 20 * * *`, active; command md5 `6d84f6db2f8bd566da08bd3102cb37bc`; reads the token with `select token from public.schedule_runner where id = 1` at run time | the `$cmd$` text of the file: md5 `6d84f6db2f8bd566da08bd3102cb37bc` |
| `recorder-expire-stale` | `17 * * * *`, active; command md5 `082a2a18cb14821c7091e3e3aa42eafe` | the file: `082a2a18cb14821c7091e3e3aa42eafe` |
| all cron jobs | `rebuild-upcoming-sessions`, `recorder-expire-stale`, `recorder-retention`, `stars-sync` | the two before + these two |

Nothing for the owner to set: the runner token already exists (`schedule_runner` row 1, from 20261110160000; its value was never read here) and the anon key in the job is the public one. Step 3 done.

## Step 4 - `recorder-retention` deployed, 14:42 Hanoi (07:42 UTC)

`recorder-retention` did not exist before (function list checked). `deploy_edge_function` name `recorder-retention`, `verify_jwt: true`, entrypoint `recorder-retention/index.ts`, files `recorder-retention/index.ts` (LF, md5 `11c1dd787a0919cc28b7c80a2cecfb64`, from `release/recorder-1`) and `_lib/auth.ts` (main's, LF, md5 `879142b6783effc17089a3688b4e5ca7`). Result: ACTIVE, version 1, verify_jwt true, ezbr_sha256 `e7073892bedd91cfe62e54ec62b1283d670c24c2cfe0130c111fd10c3b39d12c`. It uses only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which the platform sets.

- Script compare: `get_edge_function` returned both files; written out and compared byte for byte with the local LF files by a script (`.rel/cmpfn.mjs`): both IDENTICAL (same md5s as above).
- Boot probes (no secret used: the public publishable key only): POST with no Authorization -> 401 (gateway); POST with the public key -> 401 `{"error":"Unauthorized"}` (the function's own `requireRole`, so it booted and imported `_lib/auth.ts`); the public key plus a wrong runner token -> 401; GET -> 405 (the function's own). Never 200.

## Post-apply probes (public key, no sign-in)

`class_recordings`, `recorder_child_consents`, `class_recording_chunks`, `recorder_audit_log`, `recorder_settings`, the view `recorder_session_evidence`: all 401 / 42501 permission denied. `rpc/recorder_server_time`, `rpc/recorder_expire_stale`: 401 / 42501. Storage list of `class-recorder-audio`: refused (400, AccessDenied; the message names `is_teacher_of_class`, from the existing `class-recordings` policies being evaluated for an anonymous caller, the same as for any bucket).

## Result

**RECORDER DATABASE AND FUNCTION LIVE.** Nothing records yet: 0 classes switched on, and recording needs an admin to switch a class on (every enrolled child with consent) and a teacher to press Ready in the app, which reaches teachers only with the push. Rollbacks were not needed and not run. Not done here: step 5, the push of `release/recorder-1` to main (the conductor's). The first nightly run is at 20:00 UTC tonight (03:00 Hanoi): hardware check 15 reads `net._http_response` for it tomorrow.
