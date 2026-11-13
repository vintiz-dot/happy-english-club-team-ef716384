# Brief: apply D4 step 1b (the money guard's core and the register) on the LIVE project (exact steps; stop on anything unexpected)

Not authorised by this file. The conductor runs this only after the independent review of step 1b and the owner's go-ahead, and only once step 1a (`20261114090000_d4_floors.sql`) is live and verified. Live project id: `aswgmbefikhsnhogtryv`. Production database, real children, real money. Do EXACTLY these steps, in this order, and nothing else. If any check differs from what is expected, STOP immediately, change nothing further, and report.

What step 1b is (docs/evidence/D4-build-1b.md):
- ONE migration, `supabase/migrations/20261114091000_d4_core_register.sql`: two append-only tables, two views, 23 functions, the trigger `attendance.zz_attendance_money_guard`. It replaces nothing of D1, D2 or 1a and changes no row.
- THREE edge functions: `repair-attendance` (now writes through the checked path on the admin's own JWT), `mark-attendance` (an admin's write on the admin's own JWT; a teacher's old mark refused in the function), `guarded-change-refresh` (new). Their shared files `_lib/session-guard.ts` (new codes only; `manage-session` / `bulk-cancel-sessions` keep working with it, proven by `session-guard-functions`) and `_lib/money-guard.ts` (new).
- The screens (`PastAttendanceEditor`, the Attendance Repair tool, the money guard dialog) ship with the next Cloudflare deploy.

Order, in one sitting OUTSIDE teaching hours (design h): migration, then the three functions straight away, then the screens. Between the migration and the functions: an admin's old-month mark through the OLD `mark-attendance` (service key) goes through and is RECORDED (`service_retro_mark`), not refused; an admin's old billed repair through the OLD `repair-attendance` (service key) is recorded the same way. That is why the functions follow at once.

## md5: always of the body with CR removed

Live step 1a was pasted with CRLF and is not in `supabase_migrations.schema_migrations`: every raw `md5(prosrc)` of a 1a function differs from the expected JSON while the body is the same (review section 9: 18 of 18 equal with CR removed). A raw comparison would STOP a healthy database. So EVERY md5 of a function body in this brief, and in both fingerprint files (regenerated in round 2 to compute `md5(replace(f.prosrc, E'\r', ''))`), is `md5(replace(prosrc, E'\r', ''))`. If you read a body by hand, strip CR before comparing. 1b itself is sent with LF through `apply_migration`.

## Rules

- First action: create `docs/evidence/D4-1b-live-apply.md` with a "Where I am / next step" line and commit; append each step's result and commit after each step.
- Every file sent comes from the reviewed commit, byte for byte, with LF line endings (normalise CRLF to LF when reading; nothing else). Record the LF blob md5 of each file sent.
- Supabase MCP tools: `execute_sql`, `apply_migration`, `deploy_edge_function`, `get_edge_function`, `list_edge_functions`. Never print or read a secret. Only catalog queries and counts; never a row about a child.
- `supabase/config.toml` has no block for `guarded-change-refresh` yet (the conductor's file): deploy it with `verify_jwt = true`, and add the block on the conductor branch.
- No push. Nothing else touched.

## Step 1 - pre-checks (read-only)

1. Step 1a is live: `docs/evidence/D4-release-fingerprint.sql` (CR-stripped md5, see above) matches the 1a brief's table for the 18 functions, 12 triggers and 2 relations of 1a; `select count(*) from pg_trigger where tgname = 'zz_attendance_evidence_guard'` = 1, enabled.
2. Nothing of 1b exists: `select to_regclass('public.money_change_overrides'), to_regclass('public.money_change_events')` -> both NULL; `select count(*) from pg_proc where proname in ('money_change_checked','tuition_month_state','_money_ack')` -> 0; `select count(*) from pg_trigger where tgname = 'zz_attendance_money_guard'` -> 0. `change_approval_needed` / `_change_request_claim`: record whether they exist (they should not; if they do, they are step 4's and the file keeps them).
3. What the file reads exists (its preflight checks, check first): functions `student_enrolled_on(uuid,uuid,date)`, `session_change_reason_ok(text)`, `session_cancel_audit_append_only()`, `session_cancel_audit_insert_guard()`, `_session_require_admin()`, `_floor_mark_level(text,uuid)`; the step 1a BODIES the register relies on, which the preflight now requires and names if different: `select md5(replace(prosrc, E'\r', '')) from pg_proc where oid = 'public._caller_lane()'::regprocedure` = `66001c3b6eb716a6380e4155fba75409`, and for `public._floor_mark_level(text, uuid)` = `ed25e62b64c592f1ee6a026596eb11d0`; the `invoice_state_floor` columns `student_id, month, ever_paid, ever_signed, ever_frozen, max_recorded_payment`; columns `attendance.notes`, `students.family_id`, `session_participants.participant_type`, `payroll_periods.status`.
4. Triggers on `attendance` (name, enabled) - record. `zz_attendance_money_guard` sorts after `zz_attendance_evidence_guard` and after every other BEFORE trigger there.
5. Counts (numbers only): `attendance`, `invoices`, `sessions`.
6. Nobody can make a function with the name of one of the six enrolment RPCs (round 3: the guard recognises them from the call stack). `select r, n.nspname from unnest(array['authenticated','anon','service_role']) r, pg_namespace n where has_schema_privilege(r, n.oid, 'CREATE')` -> 0 rows, and `has_database_privilege(r, current_database(), 'CREATE')` false for all three (both true of live on 13 Nov 2026; TEMP is granted, and the guard refuses a pg_temp namesake). `select count(*) from pg_proc where proname in ('end_enrollment','pause_enrollment','modify_enrollment_transfer','ai_action_undo','ai_action_apply','stars_sync_resolve_conflict')` = 6, each in `public`, plpgsql, SECURITY DEFINER, signatures `end_enrollment(uuid,uuid,date)`, `pause_enrollment(uuid,uuid,date,date,text)`, `modify_enrollment_transfer(uuid,uuid,uuid,date)`, `ai_action_undo(uuid)`, `ai_action_apply(uuid,text,jsonb)`, `stars_sync_resolve_conflict(uuid,text)` (`oid::regprocedure`). Any difference: STOP - the ruling would fall back to refusing those RPCs, or worse.
7. `select jobname, active from cron.job`: record. Note the time of the last `stars-sync` run and start step 2 just after a tick.

## Step 2 - apply

`apply_migration` name `d4_core_register`, query = the exact LF content of `supabase/migrations/20261114091000_d4_core_register.sql`. It starts with `SET LOCAL lock_timeout = '5s'`: if a register save or a sync page holds `attendance`, the paste fails within 5 seconds with `canceling statement due to lock timeout` and installs nothing; wait a minute and apply again. Any other error: STOP, report verbatim (the preflight installs nothing when it refuses).

## Step 3 - fingerprint

1. Run `docs/evidence/D4-release-fingerprint.sql` (it now covers 1a AND 1b); compare with `D4-release-fingerprint.expected.json`, object by object (CR-stripped md5): 41 functions, 19 triggers, 6 relations. The 18 functions, 12 triggers and 2 relations of 1a must still match exactly (the 1a brief's table); the new ones of 1b:

| kind | object | md5 (prosrc / triggerdef) | secdef | vol | EXECUTE anon/auth/service |
|---|---|---|---|---|---|
| function | _attendance_billable | 64f04a93a4a49a44f66eb6895bbe58af | false | i | f/f/f |
| function | _attendance_money_guard | 1fdb26b35d8efba25f5b253952be83b4 | true | v | f/f/f |
| function | _change_request_claim (stub, created only if missing) | 7c84af305cfb366c6a8bb20e6f1bc6d8 | true | s | f/f/f |
| function | _lesson_in_free_week | 4e8eac6021039710f90d12805c2c041d | false | s | f/f/f |
| function | _money_ack | 471a55638387068f1279a2d7c669c4c4 | true | s | f/f/f |
| function | _money_change_apply | 7f03dfffb2532174d6d8ed9733f5fd7f | true | v | f/f/f |
| function | _money_change_exec | b5efef0f546d40e397daa3fd0648db06 | true | v | f/f/f |
| function | _money_change_full_plan | 8f8b9abdec600f4365979c8798ec801c | true | s | f/f/f |
| function | _money_change_plan | 3efa9ebcb79c47c65947f2636e07edd0 | true | s | f/f/f |
| function | _money_enrollment_rpc_call (the conductor's ruling; round 3: read from the call stack) | 8796eb026e4187149b639f7efa82e81d | false | s | f/f/f |
| function | _money_exec__attendance | 06892532e541e2228c377bcddd54c390 | true | v | f/f/f |
| function | _money_month_is_past | c7c81434cf2d4519f0252a8a4887d338 | false | s | f/f/f |
| function | _money_plan__attendance | 2a0bbcd0f17ba5a75dcda1baa3947021 | true | s | f/f/f |
| function | change_approval_needed (stub, created only if missing) | 4b477e5155181f35119d0f7a225ec7ce | true | s | f/f/f |
| function | d4_guard_status | df2b7052707d4a8d06bdc307e6fe96a9 | true | s | f/t/f |
| function | log_money_automation_refused | f2c13e67c03d8ee934368127b8027ea4 | true | v | f/f/t |
| function | money_change_checked | fcf5a03f8f07a6a2ab40080737aec3ab | true | v | f/t/f |
| function | money_change_preview | d19e2ff603ab7cf7f02c2b5b3c918df0 | true | s | f/t/f |
| function | money_changes_checked_bulk | 96596fa8e6df104c9a587f84aadaa620 | true | v | f/t/f |
| function | payroll_reach | 5ccecd82b3d859cb5ec37f4b0ac7973f | true | s | f/f/f |
| function | record_money_change_event | 79551a87ded2424d7839067ec555393b | true | v | f/t/f |
| function | tuition_month_state | 733840210ed1f3360fb9c3122d5466b9 | true | s | f/f/f |
| function | tuition_reach | d48607bb917eb05de1acd586e0c83b4f | true | s | f/f/f |
| trigger | attendance.zz_attendance_money_guard | 6efdc5cf3206b0ab707d6c2c33828882 | | | enabled O |
| trigger | money_change_events.money_change_events_append_only | 058f5c88ad2bdec9851defb768a8d803 | | | O |
| trigger | money_change_events.money_change_events_insert_guard | 0c26cfb3541426a38ac02ae574e342c8 | | | O |
| trigger | money_change_events.money_change_events_no_truncate | c4a62985ecbd8f6c6db2ffdd46a668e5 | | | O |
| trigger | money_change_overrides.money_change_overrides_append_only | b1575eda3811fa9308088f76478fb1c5 | | | O |
| trigger | money_change_overrides.money_change_overrides_insert_guard | b17bf813d735956c50c3bed33cbe2986 | | | O |
| trigger | money_change_overrides.money_change_overrides_no_truncate | dfb9216dab73d54d0fd1d96c6ee0750a | | | O |
| relation | money_change_overrides, money_change_events | `money_change_events_kind_check` md5_def `0ffdb5ec9b3755a17186cf1dde9decc4` (adds `enrollment_rpc_mark`); RLS on; authenticated SELECT only; anon none; service_role all 7; one admin-read policy each | | | |
| relation | money_change_review_queue, money_change_tuition_pending (views) | security_invoker; authenticated and service_role SELECT; anon none | | | |

   If only a trigger's `md5_def` differs, print its `pg_get_triggerdef` and compare with the file by eye; report, do not repair. Any `md5_prosrc` or privilege different: re-apply once from a fresh read (idempotent), compare again; still different: STOP.
2. Run `docs/evidence/D-release-fingerprint.sql` (also CR-stripped now; its expected JSON is unchanged, the D bodies being LF): still 64 of 66 identical, exactly `_session_change_assess` / `_session_erased_recently` different at the 1a md5 (`6c1b8c86...`, `5f589166...`). 1b touches no D-release object.

## Step 4 - deploy the three functions

For each of `repair-attendance`, `mark-attendance`, `guarded-change-refresh`: its `index.ts` and every relative import, recursively (`../_lib/auth.ts`, `../_lib/session-guard.ts`, `../_lib/money-guard.ts`, `../_lib/rate-limit.ts`, `../_lib/attendance-effects.ts` and whatever those import); `verify_jwt` from `supabase/config.toml` (true for all three; `guarded-change-refresh` has no entry yet: true). `get_edge_function` read-back: identical to the repo's LF blobs; otherwise redeploy once, then STOP. Probes (publishable key from `.env`, not printed): POST each function with the publishable key as bearer -> 401 or 403; with no Authorization -> 401.

## Step 5 - read-only probes

- `money_change_events`: at least one row of kind `guard_installed` (a re-apply in step 3 adds one each time) and no row of any other kind yet; `money_change_overrides`: 0 rows.
- Counts of step 1.5 unchanged (no row rewritten).
- `has_function_privilege`: `money_change_checked` authenticated true, service_role false, anon false; `log_money_automation_refused` service_role true, authenticated false; `tuition_month_state` nobody.
- Owner of both tables = owner of `_money_change_apply` (postgres).
- Publishable key: `POST /rest/v1/rpc/money_change_preview` -> 401 / 42501 (not PGRST202); `GET /rest/v1/money_change_overrides?limit=1` -> 401 / permission denied (not PGRST205).
- Not runnable from here (an admin session in the app, for the conductor or owner on the day): open the Attendance Repair tool, Preview a range of this week (nothing is written by Preview any more); save today's register as a teacher; `select public.d4_guard_status()` as an admin -> `ok: true`.
- The morning after (numbers only): `select kind, count(*) from money_change_events group by kind`. `service_retro_mark` in the tens on day one means some service-key writer changes old billed marks (the Stars sync, or an old function still deployed): look before it accumulates. `enrollment_rpc_mark` is expected: one row per register row that an admin's end / pause / transfer of an enrolment, an AI action undo, or a Stars conflict settled with Pixel Pal's mark, wrote into an old billed month (the conductor's ruling: recorded and queued for review, not refused, until step 3B); a count in the hundreds after one enrolment change means a long backdate - look at it on the review screen.

## The first day: what is expected, and what means roll back

Expected, not a reason to roll back: an admin changing a mark of a lesson more than a week old in a billed month is asked for a reason (the dialog); a teacher doing the same is told "This lesson is more than a week old. Please ask an administrator to change it."; a one-off cover teacher lowering an old mark is told the same; the Attendance Repair tool asks for a reason for old billed months. Ending, pausing or transferring an enrolment back into a billed month is NOT refused: it goes through and leaves `enrollment_rpc_mark` events on the review screen (the conductor's ruling until step 3B); `ModifyEnrollmentModal` shows the server's sentence for any refusal, never a raw code.

Roll back (release-note sentence): "If teachers or admins cannot save TODAY's register, or a register / repair save fails naming `zz_attendance_money_guard` for a lesson of this week, paste `scripts/ROLLBACK-d4-2-register.sql`. Nothing is lost; tell the conductor."

## Rollback

1. Paste the exact LF content of `scripts/ROLLBACK-d4-2-register.sql` (5-second lock timeout; drops the one trigger). Its result set must print `d4_register_triggers_left = 0`.
2. REQUIRED, straight after step 1: redeploy the PREVIOUS `repair-attendance` and `mark-attendance` - live v3 before step 1b, which is the text of origin/main `f5987804` (review section 9; the branch merge base `9841c6aa` has the same two files). Saved with LF in this repo: `docs/evidence/D4-1b-rollback-v3/repair-attendance/index.ts.txt` (LF md5 `a7ac2292bdbfa6ce9327a98ebd108c89`) and `docs/evidence/D4-1b-rollback-v3/mark-attendance/index.ts.txt` (LF md5 `530e8b865023debcd5756d7d0c302561`); deploy each as `index.ts` with its unchanged `../_lib` imports (`auth.ts` for repair; `rate-limit.ts`, `attendance-effects.ts` for mark - identical on origin/main and this branch), `verify_jwt = true`; read back with `get_edge_function`. Why it is not optional: with the trigger gone `money_change_checked` refuses everything with HC050 `guard_broken` (closed, by design), and the step 1b `repair-attendance` sends EVERY repair - this week's included - through it, so the repair tool stops working entirely; the step 1b `mark-attendance` keeps today's marks working but its old-lesson dialog fails the same way. `guarded-change-refresh` may stay deployed (it only refreshes bills).
3. What stays, on purpose (checked by `d4-register`): the two tables with their rows and guards (the record of who changed what with which reason), the two views, every function. Step 1a is not touched; roll it back separately AFTER this one (`scripts/ROLLBACK-d4-1-floors.sql`, then the D2 file again). `guard-fingerprint.mjs --check-unchanged --after-rollback` proves the D release is 66 of 66 after both.

## Report (under 250 words)

Each step's result; the fingerprint verdicts (41/41 functions, 19/19 triggers, 6/6 relations; D release 64/66 as after 1a); deployed function versions and read-back; probes; counts before and after; anything that differed; one line: "LIVE AND VERIFIED" or "STOPPED AT STEP n: <why>" or "ROLLED BACK: <why>".
