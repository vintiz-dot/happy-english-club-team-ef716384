# Brief: apply D4 step 3A (who is paid for a lesson) on the LIVE project (exact steps; stop on anything unexpected)

**SUPERSEDED by `D4-2-3A-3B-live-apply-brief.md` (D4 integration, 16 Nov).** Two things here are stale: mark-attendance is live v5 (the streak fix, 8a4b0e4e), not v4 - its rollback copy is `docs/evidence/D4-int-rollback-before/mark-attendance/index.ts.txt` and the 3A file to deploy is f1b5067c (v5 + N-2); and the screens revert to `eaa9a050^1`, not `c132bf7b` (`StarsSyncTab.tsx` changed in between). Use the new brief.

Not authorised by this file. The conductor runs this only after the owner's go-ahead, from the commit that carries fix round 1 of 3A (branch `d4-3a-fix`, merged with steps 2 / 3B as "Merge note" below says), and only once steps 1a and 1b are live and verified (they are: `D4-1b-live-apply.md`, 16 Nov). Live project id: `aswgmbefikhsnhogtryv`. Production database, real children, real money: lessons drive tuition and teacher pay. Do EXACTLY these steps, in this order, and nothing else. If any check differs from what is expected, STOP immediately, change nothing further, and report.

What step 3A is (`docs/evidence/D4-build-3a.md`, review `D4-3a-review.md`, fix round 1 at the end of the build doc):
- ONE migration, `supabase/migrations/20261114093000_d4_lesson_pay_guard.sql`: nine new functions, three triggers (`sessions.zz2_session_pay_guard`, `sessions.zz_session_insert_guard`, `session_participants.zz_session_staff_guard`), the `session` entity of 1b's checked path, and ONE replaced 1b function, `d4_guard_status()` (the same body with the three trigger names added to its list; the preflight refuses unless the live body is 1b's). It changes no row.
- FOUR edge functions: `manage-session` (lesson writes on the admin's own JWT; new actions `set-teacher`, `set-time`, `set-staff`, `pay-preview`), `bulk-cancel-sessions` (HC060 -> one approval request; dormant until step 4), `schedule-sessions` (include-held refusals reported and logged), `mark-attendance` (fix round 1, N-2: the RESPONSE also says when an admin's Held flip was refused; nothing else in it changed from live v4). None of their `_lib` imports changed in 3A.
- The screens (list under "Rollback" step 3) ship with the next Cloudflare deploy.

Order, in one sitting OUTSIDE teaching hours (design h): migration, then the four functions straight away, then the screens. Between the migration and the functions: an admin's change through the OLD `manage-session` that the guard asks about (un-hold, a hold without a register, the teacher / times / assistants of a held lesson or of one more than a week old, a lesson created after it started) is refused by the database with HC020 and the old screen shows a raw error; nothing is written. Today's lessons, a register save, the Stars sync and the nightly generator keep working (the service lane may hold; the free week covers today). That is why the functions follow at once.

## md5: always of the body with CR removed

As in the 1b brief: every md5 of a function body here, and in both fingerprint files, is `md5(replace(prosrc, E'\r', ''))`. 3A itself is sent with LF through `apply_migration`. Edge function files: the LF blob md5 (CR removed).

## Rules

- First action: create `docs/evidence/D4-3a-live-apply.md` with a "Where I am / next step" line and commit; append each step's result and commit after each step.
- Every file sent comes from the reviewed commit, byte for byte, LF line endings. Record the LF md5 of each file sent.
- Supabase MCP tools: `execute_sql`, `apply_migration`, `deploy_edge_function`, `get_edge_function`, `list_edge_functions`. Never print or read a secret. Only catalog queries and counts; never a row about a child.
- No push. Nothing else touched.

## Step 1 - pre-checks (read-only)

1. Steps 1a and 1b are live: `docs/evidence/D4-release-fingerprint.sql` matches the expected JSON for every 1a and 1b object (41 functions, 19 triggers, 6 relations as after 1b; the 3A objects absent). In particular the six bodies 3A's preflight pins, and `d4_guard_status()`:

| function | md5 (CR removed) |
|---|---|
| `_caller_lane()` | 66001c3b6eb716a6380e4155fba75409 |
| `_lesson_in_free_week(date, time, time)` | 4e8eac6021039710f90d12805c2c041d |
| `_money_ack(text[], uuid, uuid, date, date, integer)` | 471a55638387068f1279a2d7c669c4c4 |
| `_money_change_plan(text, text, jsonb, uuid)` | 3efa9ebcb79c47c65947f2636e07edd0 |
| `_money_change_exec(text, jsonb, uuid)` | b5efef0f546d40e397daa3fd0648db06 |
| `payroll_reach(uuid, uuid, date, date)` | 5ccecd82b3d859cb5ec37f4b0ac7973f |
| `d4_guard_status()` (replaced by 3A) | df2b7052707d4a8d06bdc307e6fe96a9 |

2. Nothing of 3A exists: `select count(*) from pg_trigger where tgname in ('zz2_session_pay_guard','zz_session_insert_guard','zz_session_staff_guard')` = 0; `select to_regprocedure('public._money_plan__session(text, jsonb, uuid)')` NULL.
3. D2's `zz_session_change_guard_upd` on `sessions` exists and is enabled. Triggers on `sessions` and `session_participants` (name, enabled): record.
4. The functions as live NOW equal the "before" copies this brief rolls back to (`get_edge_function`, CR removed, md5 of `index.ts`):

| function | live version (record) | expected LF md5 of index.ts | saved copy |
|---|---|---|---|
| manage-session | ? | 42044d90e6f6ec755f81dd3fa569ceb3 (25516 bytes) | `docs/evidence/D4-3a-rollback-before/manage-session/index.ts.txt` |
| bulk-cancel-sessions | ? | 7c25bb2228b66f42eefd02e381431600 (9215 bytes) | `.../bulk-cancel-sessions/index.ts.txt` |
| schedule-sessions | ? | 3fea72e9cd3ad6d7883a2424e9c448c8 (30971 bytes) | `.../schedule-sessions/index.ts.txt` |
| mark-attendance | v4 | 3963244db9fe8839a2c1acb525e83132 (12020 bytes; = `D4-1b-live-apply.md`) | `.../mark-attendance/index.ts.txt` |

   The saved copies are the text at c132bf7b (the commit 3A was cut from). If a live `index.ts` differs: STOP - the rollback copy would not be what is live; save the live text instead and report before going on.
5. Counts (numbers only): `sessions`, `session_participants`, `attendance`, `money_change_overrides`, `money_change_events`.
6. `select jobname, active from cron.job`: record. Start step 2 just after a `stars-sync` tick.

## Step 2 - apply

`apply_migration` name `d4_lesson_pay_guard`, query = the exact LF content of `supabase/migrations/20261114093000_d4_lesson_pay_guard.sql`. It starts with `SET LOCAL lock_timeout = '5s'`: if a register save or a sync page holds `sessions`, the paste fails within 5 seconds with `canceling statement due to lock timeout` and installs nothing; wait a minute and apply again. A preflight refusal (`d4_lesson_pay_guard cannot be installed; missing: ...`) installs nothing: STOP and report it verbatim. The result set prints `lesson_pay_guard_triggers` = the three triggers `=O` and `installs` >= 1.

## Step 3 - fingerprint

1. Run `docs/evidence/D4-release-fingerprint.sql`; compare with `D4-release-fingerprint.expected.json` object by object (CR-stripped md5). Every 1a / 1b object unchanged EXCEPT `d4_guard_status` (new md5 below); the new objects of 3A:

   Totals after 3A: 50 functions, 22 triggers, 6 relations (fix round 1 regenerated; the diff against the build's file is exactly the three md5s marked "fix round 1").

| kind | object | md5 (prosrc CR removed / triggerdef) | secdef | vol | EXECUTE anon/auth/service |
|---|---|---|---|---|---|
| function | session_pay_change_kind(sessions, sessions) | a67936d64bff4c046159768b4718ceef (fix round 1, S-1) | true | s | f/f/f |
| function | _session_ta_rows(uuid) | dc0e044990548a79d45ff64718abb5d8 | true | s | f/f/f |
| function | _session_pay_tier(text, sessions, sessions) | 13dfc790cfafffbffc108ab656e00e24 | true | s | f/f/f |
| function | _session_pay_sentence(text) | 37a9f2460683b1837d99355f483734f8 (fix round 1, retime sentence) | false | i | f/f/f |
| function | session_pay_guard() | f69bcfb3f69fc7206f8aaabe62db09ac | true | v | f/f/f |
| function | _session_insert_guard() | ede7f558c2e089a3acdd214d550bfbf2 | true | v | f/f/f |
| function | _session_staff_guard() | 19a597ce8b0fd93c159f7c43d27689b2 | true | v | f/f/f |
| function | _money_plan__session(text, jsonb, uuid) | e21f34e1392c0dd6f34f21b133271b87 | true | s | f/f/f |
| function | _money_exec__session(jsonb, uuid) | cabd2db1f4023cba61bf8d38780d4e34 | true | v | f/f/f |
| function (REPLACED, 1b) | d4_guard_status() | 932bc6aa9eded89d1faa16bdb3f54577 (was df2b7052...; fix round 1) | true | s | f/t/f (unchanged) |
| trigger | sessions.zz2_session_pay_guard | 627eb5d6e28b91e44f5d997cc30f4686 | | | enabled O |
| trigger | sessions.zz_session_insert_guard | c33edb0a689b2c4fe1a351bf27c74a56 | | | enabled O |
| trigger | session_participants.zz_session_staff_guard | fe26026f304672fe4cc8682e35ebdf96 | | | enabled O |

   If only a trigger's `md5_def` differs, print its `pg_get_triggerdef` and compare with the file by eye; report, do not repair. Any body md5 or privilege different: re-apply once (idempotent), compare again; still different: STOP.
2. `docs/evidence/D-release-fingerprint.sql`: still 64 of 66 identical, the same two as after 1a. 3A touches no D-release object.

## Step 4 - deploy the four functions

For each of `manage-session`, `bulk-cancel-sessions`, `schedule-sessions`, `mark-attendance`: its `index.ts` and every relative import, recursively (`../_lib/*`, unchanged by 3A), `verify_jwt` from `supabase/config.toml`. LF md5 of each `index.ts` sent:

| function | LF md5 of index.ts (fix round 1 head) | bytes | verify_jwt |
|---|---|---|---|
| manage-session | f242a0ba65e94b095c504a233e54ad56 | 36542 | true |
| bulk-cancel-sessions | be930e4c68dc7af3c8bb4a45390b9b79 | 10038 | true |
| schedule-sessions | 1f82785e457f0bf6d6e32a4067759f9c | 32162 | true |
| mark-attendance | 82b4aace2b308c7919a3adb462c848fa | 12969 | true |

If the merged commit changed any of these files after fix round 1, recompute the md5 from that commit and record it; do not deploy from this table blindly.

`get_edge_function` read-back: identical to the repo's LF blobs; otherwise redeploy once, then STOP. Probes (publishable key from `.env`, not printed): POST each with the publishable key as bearer -> 401 / 403; with no Authorization -> 401.

## Step 5 - read-only probes

- `money_change_events`: one more `guard_installed` row naming `20261114093000_d4_lesson_pay_guard`; `money_change_overrides`: count unchanged (no row written by the paste).
- Counts of step 1.5 otherwise unchanged (no row rewritten).
- `has_function_privilege` for each of the nine new functions: anon / authenticated / service_role all false. `d4_guard_status()`: authenticated true, anon and service_role false (as 1b).
- Not runnable from here (an admin session in the app, on the day): `select public.d4_guard_status()` as an admin -> `ok: true` and the three 3A triggers listed `O`; open a lesson of today and mark it Held, change its teacher (no dialog: the free week); open a held lesson of last month, Actions -> Change status to Scheduled -> the "Check before taking this lesson off Held" window opens (Keep it Held - nothing is written).
- The morning after (numbers only): `select kind, count(*) from money_change_events where created_at > <apply time> group by kind`. `automation_refused` with `entity = session` in the tens means the Stars sync or the rebuild is trying to un-hold old lessons: look before it accumulates.

## The first day: what is expected, and what means roll back

Expected, not a reason to roll back: an admin asked for a reason to take a lesson off Held, to mark a lesson Held when nobody took the register, or to change the teacher, the times or the assistants of a lesson that ended more than a week ago (held or not) or is in a closed payroll month; an admin adding a lesson that has already started is shown the children who will be billed and asked for a reason; a register saved by an admin in a closed payroll month says the lesson was not marked Held; Teacher Schedule Transfer stops on a lesson more than a week old and says to start the range within the last week; Generate Sessions offers only "Future sessions only".

Roll back (release-note sentence): "If an admin or teacher cannot mark today's lesson Held, change today's teacher or assistants, or add a lesson for today or later, with an error naming zz2_session_pay_guard, zz_session_insert_guard, zz_session_staff_guard or kind=unhold / hold / reteach / retime / restaff / create_past; or the Stars sync reports a page that failed on sessions: roll back step 3A (all three steps below). Nothing is lost; tell the conductor."

## Rollback (all three steps, in this order, in one sitting)

1. Paste the exact LF content of `scripts/ROLLBACK-d4-4-lesson-pay.sql` (5-second lock timeout; drops the three triggers and nothing else). Its result set must print `d4_lesson_pay_triggers_left = 0`.
2. REQUIRED, straight after step 1: redeploy the PREVIOUS functions from the saved copies (each as `index.ts`, its `../_lib` imports unchanged, `verify_jwt` as in `supabase/config.toml`), and read each back with `get_edge_function`:
   - `manage-session` <- `docs/evidence/D4-3a-rollback-before/manage-session/index.ts.txt` (LF md5 `42044d90e6f6ec755f81dd3fa569ceb3`)
   - `bulk-cancel-sessions` <- `.../bulk-cancel-sessions/index.ts.txt` (`7c25bb2228b66f42eefd02e381431600`)
   - `schedule-sessions` <- `.../schedule-sessions/index.ts.txt` (`3fea72e9cd3ad6d7883a2424e9c448c8`)
   - `mark-attendance` <- `.../mark-attendance/index.ts.txt` (`3963244db9fe8839a2c1acb525e83132`, live v4 of 1b)
   Why it is not optional: with the triggers gone `money_change_checked('session', ...)` refuses everything (HC050 `guard_broken`), and the 3A `manage-session` sends `set-teacher` / `set-time` / `set-staff` and every acknowledged status change through it.
3. REQUIRED as well (review B-1): revert the 3A SCREENS and deploy them (the normal Cloudflare deploy from main). The 3A screens open the lesson-pay check (`PayGuardDialog`) straight away for a Held -> Scheduled change (`SessionActionsModal`) and a held lesson's time edit (`EditSessionModal`); its first call is `manage-session pay-preview`, which the previous `manage-session` does not have (400 `bad_request`) - taking a lesson off Held would have no route left in the app. The files to put back to their pre-3A text (`git checkout c132bf7b -- <file>` for each, one commit; or `git revert` of the 3A commits' `src/` part):
   - `src/lib/lessonPayGuard.ts` (new in 3A: delete it)
   - `src/components/admin/session-guard/api.ts`, `useGuardedChange.ts`, `GuardDialog.tsx`
   - `src/components/admin/SessionActionsModal.tsx`, `EditSessionModal.tsx`, `AddSessionModal.tsx`, `TeacherScheduleTransfer.tsx`, `SessionGenerator.tsx`, `SessionGeneratorConfirm.tsx`, `PastAttendanceEditor.tsx`
   - `src/components/admin/class/AttendanceDrawer.tsx`, `class/SessionDetailDrawer.tsx`, `class/EditSessionModal.tsx`
   - `src/components/admin/ta/TAClassAssignment.tsx`, `src/components/admin/tabs/StarsSyncTab.tsx`, `src/components/schedule/GlobalCalendar.tsx`, `src/components/shared/StudentActionPopover.tsx`
   That is every `src/` file in `git diff --name-only c132bf7b <3A commit> -- src` (18). If steps 2 / 3B / 4 changed one of these files after 3A, revert only 3A's hunks, by hand, and run `tsc --noEmit -p tsconfig.app.json`.
4. What stays, on purpose (checked by `d4-lesson-pay` "rollback 4"): every `money_change_overrides` / `money_change_events` row (who changed which lesson's pay, with which reason), every function of the file, and `d4_guard_status` as 3A left it (the three names simply absent from its answer; `ok` reads the triggers that exist). Steps 1a and 1b are not touched; roll them back separately, AFTER this one.
5. Proof after the rollback: `guard-fingerprint.mjs --check-unchanged --after-rollback` (66/66) runs exactly this in pglite; on live, `D-release-fingerprint.sql` 64 of 66 as after 1a.

## Report (under 250 words)

Each step's result; the fingerprint verdicts; deployed versions and read-back; probes; counts before and after; anything that differed; one line: "LIVE AND VERIFIED" or "STOPPED AT STEP n: <why>" or "ROLLED BACK: <why>".
