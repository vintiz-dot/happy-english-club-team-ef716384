# RECORDER live apply - the class recorder's database objects and `recorder-retention` on live

Project `aswgmbefikhsnhogtryv`. Authority: owner decision D-22 (the recorder goes to live for the owner's hardware tests once this round passes review; review 5 + Round 6: PASS), with D-9 / D-19 (SQL pushed directly). Manifest: `docs/evidence/RECORDER-release.md` section 3, followed in order. Branch `release/recorder-1` (main f5987804 + the recorder, round 6). Not done here: the push to main (the conductor's). No secret is printed anywhere in this file.

**Where I am / next step:** step 1 (pre-checks) done. Next: step 2, apply `20261112100000_class_recorder.sql`.

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
