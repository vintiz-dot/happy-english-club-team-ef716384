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
