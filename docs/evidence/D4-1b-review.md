# D4 step 1b review (money guard core and register)

Independent reviewer. Reviewing branch `worktree-agent-a8fa73ee4063a7b1b` at 0617d940 (detached; the builder's final tip a80d45b1 is reviewed in the last section). Read-only: no product code changed, nothing pushed, nothing applied. Live probes are catalog-only (project `aswgmbefikhsnhogtryv`, 2026-11-13 ~09:30 Hanoi).

**Where I am / next step:** ROUND 3 COMPLETE (90a059c9): APPLY. The live apply is logged in `docs/evidence/D4-1b-live-apply.md`.

## Round 3 (delta 32d3ee21..90a059c9): APPLY

Only `_money_enrollment_rpc_call()` changed in the migration (`:399-436`): it reads `PG_CONTEXT`, takes the LAST line (the outermost frame), requires it to be exactly `PL/pgSQL function <one of the six live signatures> line N at SQL statement`, and requires that name to exist once in `pg_proc` (any schema), in `public`, plpgsql, SECURITY DEFINER. This is R2-1's fix, tighter than mine.

Executed (scratch `probe6.mjs`, real files in pglite, as an admin on an old confirmed paid month), 9/9:
- my three round-2 forgeries (quoted alias `"end_enrollment("`, literal `'pause_enrollment ('`, comment `/* ai_action_undo( */`) -> HC025;
- legitimate `end_enrollment`, plain and called PostgREST-style inside a LATERAL subquery -> passes, mark removed, one `enrollment_rpc_mark`;
- own 1, a forged frame: a definer function running client text whose last line is a fake `PL/pgSQL function end_enrollment(uuid,uuid,date) line 37 at SQL statement` (dynamic SQL, the line inside a comment) -> HC025: the real outermost frame (`run_text ... at EXECUTE`) is last, so the quoted text never is;
- own 2, a legitimate RPC reached through a wrapper (not outermost) -> HC025: closed, not open. On live no function calls any of the six (checked: no body outside the six names them) and each of the six writes `attendance` in its own body (`att_writes` 1, 2, 1, 2, 0 for apply, 1 for resolve; apply's register rows come from the enrolment seed trigger at depth 2), so "outermost, at SQL statement" fits every live path;
- own 3, a write made by a trigger fired inside `end_enrollment` (depth 2) -> passes unjudged with no event, as every trigger-made write does since round 1 (`:422`); not new;
- own 4, a `pg_temp.end_enrollment` namesake -> the real one is judged (HC025), closed.

Live (read-only): the six exist once each, all `public`, plpgsql, SECURITY DEFINER, with the six signatures. Builder's suite on 90a059c9: `d4-register` 140/140, `d4-functions-register` 34/34, fingerprint up to date, `--check-unchanged --after-rollback` 66/66, mutant C32 (puts `current_query()` back) caught. The `src` side did not change since round 2.

**Verdict: APPLY.** Applied per the brief at 90a059c9: see `docs/evidence/D4-1b-live-apply.md`.

## Round 2 (delta a80d45b1..32d3ee21)

Verdict: **APPLY WITH CHANGES** - one change, R2-1. Everything else in the delta is right.

**R2-1 (must change): the enrolment-RPC exemption can be forged.** `_money_enrollment_rpc_call()` (`20261114091000:403-407`) decides "this write is end/pause/transfer/undo/apply/resolve" from `current_query()`, i.e. the TEXT the client sent. That text is the client's, not the server's: any statement that contains `end_enrollment(` (or one of the other five names followed by `(`) anywhere - a quoted column alias, a string literal, a comment - is treated as that RPC. Executed (scratch `probe5.mjs`, pglite, real files, as an admin on an old confirmed paid month): the plain `UPDATE attendance SET status='Excused'` is HC025; the SAME update wrapped the way PostgREST renders `PATCH ...&select="end_enrollment(":status` (`... AS "end_enrollment(" FROM pgrst_source`) PASSES, status now Excused, one `enrollment_rpc_mark` event; a DELETE of the seeded Present carrying the literal `'pause_enrollment ('` PASSES; an UPDATE preceded by `/* ai_action_undo( */` PASSES. Reach: the exemption sits inside the admin branch (rule 5), so it lets an ADMIN un-bill an old billed month without the reason dialog (recorded, not refused) - exactly the bypass. Through PostgREST the route is a client-chosen select alias or embedded name (PostgREST accepts quoted field names and writes them into the statement; I did not drive live PostgREST, and filter values are parameters as the builder says). Raw SQL text is owner-lane anyway; the hole is the PostgREST text.

Smallest robust replacement, executed: read the server's own call stack instead of the client's text. Only the helper's body changes; the six live RPCs (all `plpgsql`, `SECURITY DEFINER`, checked on live) are NOT touched:

```sql
CREATE OR REPLACE FUNCTION public._money_enrollment_rpc_call()
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $fn$
DECLARE c text;
BEGIN
  GET DIAGNOSTICS c = PG_CONTEXT;   -- one line per executing frame: "PL/pgSQL function name(argtypes) line N at ..."
  RETURN substring(c from '(?:^|\n)PL/pgSQL function (?:public\.)?(end_enrollment|pause_enrollment|modify_enrollment_transfer|ai_action_undo|ai_action_apply|stars_sync_resolve_conflict)\([^)]*\) line [0-9]+ at ');
END $fn$;
```

A frame line exists only while that function is really executing; nothing a PostgREST caller sends is written into one. With this body (scratch copy `core-ctx.sql`): `d4-register` 133/133 (all the builder's end / pause / transfer / resolve / raw cases, payload `rpc` still the bare name) and `probe5` 5/5 - the legitimate `end_enrollment` passes and records, the alias, literal and comment forgeries are all HC025. Residual: the "SQL statement ..." lines of the stack quote function-body text, so a person-callable function that EXECUTEs client-supplied SQL containing a newline and that frame text could still forge; none exists that writes `attendance`. A transaction-local setting (`set_config('hec.lane', ...)`) would also be robust but needs all six live RPC bodies replaced - more surface, no gain. After the change: regenerate the fingerprint (the helper's md5 and the brief's table row), add the three forgery cases to `d4-register` (alias, literal, comment -> HC025) and a mutant that puts `current_query()` back.

The rest of the delta, checked:
- Required change 1 (CR-stripped md5): the brief's new section and both fingerprint files now compute `md5(replace(prosrc, E'\r',''))`. The D-release `.sql` changed (one expression and a comment) while its expected JSON did not - right, since the D bodies are LF; `--check-unchanged --after-rollback` 66/66. Step 5 now "at least one `guard_installed`".
- Change 2 (preflight): `:77-87` requires the LF md5 of `_caller_lane` (66001c3b) and `_floor_mark_level` (ed25e62b), CR stripped, and the six `invoice_state_floor` columns (`:98`). Matches live (section 9).
- Change 3 (rollback): script header and brief step 2 make the redeploy of the previous `repair-attendance` / `mark-attendance` REQUIRED; the live v3 texts are saved LF under `docs/evidence/D4-1b-rollback-v3/`.
- Change 4 (R-1): the conductor's ruling - recorded (`enrollment_rpc_mark`), not refused, only for the rows those RPCs write (unsigned delete / insert, Excused, the resolve's own signed mark); `ModifyEnrollmentModal` words any refusal through `rpcErrorText`. Right in intent; R2-1 is about HOW the RPC is recognised.
- Change 5 (cases): X01, X07, F01 added and, with C26-C31, caught (builder's 77/77).
- R-2: rule 1 now `PERFORM ... FOR UPDATE; IF FOUND` (`:449-456`) - the fix I proposed; a self-deleted or concurrently deleted row is judged as an insert.
- S-1: both drawers read the 409 body through `functionRefusalText` (reason plus "Open the class's Past Attendance"). PastAttendanceEditor keeps the dialog lesson's edits until confirmed (`editsAfterSave`).
- Runs on 32d3ee21 (mine): `d4-register` 133/133, `d4-functions-register` 34/34, `money-guard-lib` 45/45, `edge-functions` 5/5, fingerprint "up to date", `--check-unchanged` only the two replaced functions, `--after-rollback` 66/66, `tsc --noEmit -p tsconfig.app.json` exit 0; `probe.mjs` 28/28 (one run missed the 2 ms/row perf line at 2.2 under machine load, the next was under). Full `run.mjs` not repeated (builder: 5930/62/0).
- Live, 12:51 Hanoi: still no 1b object (`money_change_overrides` NULL, no `zz_attendance_money_guard`). Not applied by me (verdict not APPLY).

## Verdict (round 1): APPLY WITH CHANGES

Must change before the live apply:
1. **Brief, md5 comparisons (section 9).** Live 1a was pasted with CRLF; every raw `md5(prosrc)` of 1a differs from the expected JSON, so brief steps 1.1, 3.1 and 3.2 STOP on a healthy database. Compare `md5(replace(prosrc, E'\r', ''))` (18/18 equal today), and send 1b with LF via `apply_migration` as the brief says. Step 5: "at least one `guard_installed` row" (a re-apply adds one, `:1162`).
2. **Preflight requires the 1a bodies it depends on** (section 5a): LF md5 of `_caller_lane` (66001c3b...) and `_floor_mark_level` (ed25e62b...) and the four `invoice_state_floor` columns, compared CR-stripped; refuse otherwise. Then regenerate nothing else (the preflight is a DO block, not a fingerprinted body).
3. **Rollback 2 wording** (section 6): script header and brief rollback step 2 - after rollback 2 the new `repair-attendance` refuses EVERY repair (HC050); redeploying the previous `repair-attendance` is part of the rollback, not optional.
4. **Day-one note for R-1** (section 1): until step 3B, ending, pausing or transferring an enrolment backdated more than a week into a month with a bill is refused (`HC025 retro_mark`, toasted raw by `ModifyEnrollmentModal`); the way through is to set those lessons' marks to Excused in Past Attendance with a reason first. Put it in the brief's "expected" list and tell the owner; a one-line mapping of HC025 in `ModifyEnrollmentModal` is better still.
5. **Three missing cases** (section 8, current code behaves correctly - probe4 - but nothing pins it): a cover re-saving an old mark unchanged passes (X01); `record_money_change_event` as a teacher -> 42501 (X07); `mark-attendance` teacher, current month, lesson > 7 days, a person's Present -> Excused -> 409 (F01).

Recommended (can follow in 3A/3B): R-2 rule-1 race fix (`PERFORM ... FOR UPDATE`); S-1 the two class drawers read the 409 body; PastAttendanceEditor keeps the paused lesson's edits.

## Final tip a80d45b1

Reviewed: `MoneyChangesReview` mounted in `AutomationTab` under "Money changes" (existing components untouched); one-line note that recorded entries cannot be signed off until step 4; `[functions.guarded-change-refresh] verify_jwt = true`. On this tip: `tsc --noEmit -p tsconfig.app.json` exit 0, `money-guard-lib` 33/33. Full `node scripts/pgtest/run.mjs` on 0617d940 (a80d45b1 changes no SQL, function or test): **5903 assertions across 62 suites, 0 failed** (d4 register 119, d4 functions register 33, money guard lib 33, edge functions typecheck 5, app typecheck green).

Reviewer probes (scratchpad, not committed): `probe.mjs` (28 cases, 28 pass), `probe2.mjs` (rule 1, delete + insert), `probe3.mjs` (live `end_enrollment` under the guard), `mut.mjs` (15 mutants). All run the real migration files in pglite with the d4 prelude.

## 1. The register keeps working

Executed (probe.mjs, all PASS): today's lesson with every child's bill confirmed and paid - a teacher's PostgREST-shaped bulk upsert of 15 (re-save, 15 crossings Present->Excused/Absent, and back), a one-off cover lowering all 15, an admin bulk, a service bulk; a lesson 5 days old with a frozen + confirmed bill - Absent->Present and a person's Present->Excused by the teacher. The builder's suite adds the R-4 cases for an unchanged register of a past PAID month (teacher and admin) and the seed trigger at depth 2.

Cost: bulk upsert of 15 in pglite 151 ms with the guard vs 127 ms with it disabled, i.e. about 1.6 ms per row in WASM (each row: one indexed EXISTS, one sessions PK read, `_caller_lane`; for a person's UPDATE also `has_role` + `is_teacher_of_class`; the bill is read only after the week). On native Postgres this is tens of microseconds per row. No lock is added: the live `guard_cancelled_session_attendance` (BEFORE I/U) already takes `sessions ... FOR UPDATE` on the first row of every register save, before any attendance row is locked, so saves of one lesson serialise there; `_money_change_apply` takes the same session lock first (`20261114091000:882-891`), then writes attendance - same order, no deadlock. The 1a trigger sorts before this one ('e' < 'm'); `guard_attendance_enrollment` (which rewrites `NEW.status`) sorts before, so the money guard judges the final row. Recursion: the trigger writes only `money_change_events` (no trigger back to attendance); `pg_trigger_depth() > 1` skips trigger-made writes.

TA marking: live `is_teacher_of_class` counts `class_teaching_assistants` and TA participants within -7..+60 days, so standing assistants are exempt from DQ-1 (the prelude's stand-in has no TAs; not executed). Cover marking today's lesson: free week, passes (executed).

**Finding R-1 (not the register, but a regression the brief does not mention).** Live `end_enrollment`, `modify_enrollment_transfer` (both `DELETE FROM attendance ... marked_by IS NULL`) and `pause_enrollment` (`ON CONFLICT ... DO UPDATE SET status='Excused'`) write attendance directly at trigger depth 1 (live trigger `excuse_attendance_outside_enrollment` is gone, checked). After 1b, ending an enrolment backdated past a week into a month with any bill is refused: probe3 - `end_enrollment` dated 35 days back, seeded Present on a lesson 30 days ago, October bill issued and unpaid: without 1b ok (row deleted); with 1b `HC025 kind=retro_mark; tier=1`, nothing changed. There is no checked op for enrolments until step 3B, and `ModifyEnrollmentModal.tsx:179,217,252` toasts the raw message "attendance_requires_checked_path". Workaround exists (set those marks to Excused in Past Attendance with a reason - they then carry `marked_by` and the RPC keeps them - then end the enrolment) but nobody is told. Same for a backdated pause or transfer, and `ai_action_undo` of an enrolment with old billed seeded marks.

**Finding R-2 (theoretical race in rule 1, `:426-429`).** Rule 1 passes an INSERT when the (lesson, child) row is visible. If another transaction has deleted that row but not committed, the INSERT is passed, waits on the unique index, and lands as a NEW row unjudged once the delete commits (BEFORE ROW triggers do not re-fire on the ON CONFLICT retry). Example: an admin or the lesson's teacher deletes a seeded Excused row of an old paid lesson (allowed: no crossing) and, concurrently, inserts Present. Not executable in single-connection pglite; the same thing inside ONE statement is caught (probe2: writable CTE delete + insert -> HC025, because the volatile trigger sees its own statement's delete). Needs two racing requests and is in `audit_log`; cheap fix: `PERFORM 1 FROM attendance WHERE ... FOR UPDATE; IF FOUND THEN RETURN NEW;` (waits for the deleter and re-reads; the upsert locks that row anyway, so no new contention).

## 2. G-11's rules and DQ-1, attacked

Each rule has a failing-without-it case in the builder's 25 mutants (C01-C25, re-run by me through `d4-register`: see 8). My attacks (probe.mjs, all refused as they should be): admin and teacher raw DELETE of a seeded Present on an old paid lesson (HC025); delete a free Excused row then insert Present (insert HC025); re-date the lesson into the free week raw (refused by D2); a teacher UPDATE of a whole old register (HC025); forged override row by the service role (insert guard) and by an admin (42501); re-arming `hec.money_change_ack` in the same transaction for another child, or the same child with another status (HC025); 51 items (HC016). A 51 split into 50 + 1 is two batches and two sets of rows - there is no threshold in 1b to dodge (approval is step 4). `repair-attendance` with the service key: refused by `requireRole(..., { allowServiceRole: false })` (`repair-attendance/index.ts:54`, tested in d4-functions-register). The service lane on `attendance` is recorded, never refused, by design (R-7); `admin-data-import` (service key, `attendance` still whitelisted, `:74`) is such a writer until step 3B.

DQ-1 (`:439-447`): a person who is neither admin nor `is_teacher_of_class` lowering `_floor_mark_level` on a lesson older than the week -> HC025 `cover_staff`. Through `mark-attendance` the same callers are already 403 (`mark-attendance/index.ts:123-134` requires `is_teacher_of_class`), so DQ-1 only binds the raw PostgREST path, which the live RLS (`teacher_attendance_update`: the lesson's `teacher_id` or a TA participant) opens to a one-off cover. Note: `is_teacher_of_class` also counts anyone with a lesson of the class in the last 7 / next 60 days, so a cover booked for next month is "regular" for DQ-1 - over-permissive at the edge, matches the app's one definition.

## 3. The checked path

Preview writes nothing: `money_change_preview` and every plan function are STABLE (Postgres refuses a write in them) and probe.mjs counted overrides, events and attendance before and after a repair and a set_marks preview: unchanged. `repair-attendance` with `preview: true` returns before `moneyConfirm` (`:79-81`); the old function had no preview flag and the screen's Preview called the writing function (origin/main `AttendanceRepairTool.tsx:67-91`) - confirmed. Token (`:832-834`) = sha256 over entity, op, the exact args, caller, tier, md5(row_before), reach fp (fp = change incl. old marks + the bills + their states, `:685`); confirm re-plans under the advisory lock and the session row locks and compares (`:894-906`); the trigger re-judges each row and refuses an ack stored at a lower tier (HC011, `:380-383`). Refusals carry the next step (b.8 texts in `_lib/session-guard.ts` and `src/lib/moneyGuard.ts:77-95`). Identity: every RPC calls `_session_require_admin()` on `auth.uid()`; `money_change_checked` has no service_role grant; the functions use `callerClient(...Authorization)` for every write (`mark-attendance:202-204`, `repair-attendance:56,92`).

## 4. `tuition_month_state`

Reads `invoices` and `invoice_state_floor` (`ever_frozen > ever_signed > ever_paid`) in the same statement (`:241-252`), computed in the database from stored facts; the trigger calls it in the writing transaction (`:463`). Fail closed: any exception, a malformed month, or a NULL tier -> T3 (`:265-270`; probe: a renamed floor table -> T3). `tuition_reach` widens to the family (R-8a). Design question 3 (register changes never set `closed_payroll`) is right: pay follows the lesson's status, not marks.

## 5. Nothing of D1, D2 or 1a replaced

`d4-register` "install" proves in pglite that no existing function (md5, secdef, config, grant) or trigger changes, the file applies twice as a no-op on functions and triggers, and no row is rewritten. Grants: tables RLS on, authenticated SELECT (admin policy), service_role ALL as the house rule, anon nothing; views `security_invoker` (probe: a teacher reads 0 rows of both); RPCs authenticated only, `log_money_automation_refused` service_role only, the rest nobody; `search_path=public` on every function; `SET LOCAL lock_timeout = '5s'`; no partial unique index. Append-only: owner UPDATE / DELETE / TRUNCATE refused (probe). Rollback 2 tested (`d4-register` section "rollback 2"; `d4 rollback` 26/26 with `--after-rollback` -> 66/66).

Gaps: (a) the preflight checks only that the 1a objects EXIST (`:52-76`), not their bodies; 1b relies on `_caller_lane`, `_floor_mark_level` and the `invoice_state_floor` columns, and the task asked for the live 1a bodies to be required. Add md5 literals of the LF bodies of those two functions (and the four floor columns) to the preflight, compared with `md5(replace(prosrc, E'\r',''))` because live 1a is CRLF (section 9). (b) A second paste writes a second `guard_installed` row (`:1162`), so brief step 5's "exactly one row" fails after the brief's own "re-apply once" in step 3.

## 6. Edge functions

`repair-attendance`: admin only, service key refused, writes only through the RPC on the caller's client. `mark-attendance`: admin -> upsert and Held flip on the caller's client, HC025/HC024 -> 409 with the set_marks preview, no service retry; teacher -> rule 6 in the function from the lesson's date and stored marks (`:173-200`), no bill read, then the service write. `guarded-change-refresh`: refresh admin only (`:42`), reads as the caller, refreshes at most 25 pairs with the service client, records as the caller; log-refused service only. `edge-functions.test.mjs` green (5/5, 104 files). Deployed live versions = origin/main (section 9): the deploy undoes nobody's change.

Note: after rollback 2, `money_change_checked` refuses everything with HC050 (by design), and the new `repair-attendance` sends EVERY repair (T0 included) through it - so the repair tool stops working entirely, not only its old-month path as the brief (rollback step 2) and the rollback script header ("their checked path still works but refuses nothing") say. The previous `repair-attendance` must be redeployed with the rollback, not optionally.

## 7. Screens

`PastAttendanceEditor`: logic only, classes untouched; one batch per lesson; 409 with a preview opens the dialog; no decision in the browser (`needsMoneyDialog` keys off the server's code and preview). Small: the paused lesson's edits are cleared from the screen when the dialog opens (`saved.push` on `r.dialog`), so a cancelled dialog loses them. `AttendanceRepairTool`: Preview reads, the second press repairs; 409 opens the dialog; errors through `moneyErrorText`. `MoneyChangesReview` (a80d45b1): mounted in `AutomationTab` under "Money changes", reads the two admin-RLS relations, read-only, one line that recorded entries cannot be signed off until step 4. `config.toml` block `[functions.guarded-change-refresh] verify_jwt = true` (a80d45b1).

**Finding S-1.** Two other admin screens call `mark-attendance` and do not read the new 409: `class/AttendanceDrawer.tsx:126-129` and `class/SessionDetailDrawer.tsx:134-141` (`if (error) throw error` -> toast "Edge Function returned a non-2xx status code"). An admin correcting an old billed lesson there gets no reason and no dialog. (`StudentActionPopover` is today-only.)

## 8. Runs and my mutants

My 15 mutants (`mut.mjs`; migration mutants as a scratch copy in the suites' file list, function mutants applied to the worktree file and restored byte for byte - `git status` clean afterwards):

| Mutant | Breaks | Verdict |
|---|---|---|
| X01 | DQ-1 refuses an equal level too (`<` -> `<=`) | SURVIVED - no case for a cover re-saving an old mark unchanged |
| X02 | the free week is 8 days | CAUGHT (register) |
| X03 | `tuition_month_state` fails open (error -> tier 0) | CAUGHT (register) |
| X04 | the ack ignores the child | SURVIVED - equivalent: the op check (`:474-479`) re-checks the child for set_marks, and repair's exec writes one child only |
| X05 | `tuition_reach` not widened to the family | CAUGHT (register) |
| X06 | a T3 change not reviewed | CAUGHT (register) |
| X07 | `record_money_change_event` open to any signed-in user | SURVIVED - no non-admin case for this RPC |
| X08 | service lane, old past-month mark at tier 0 not recorded | SURVIVED - near-equivalent (tier 0 in a past month only for a child not enrolled in the class) |
| X09 | token does not cover the bills (reach fp dropped) | CAUGHT (register) |
| X10 | bulk cap 51 | CAUGHT (register, probe) |
| F01 | `mark-attendance`: teacher may un-bill a person's Present after the week in the current month | SURVIVED - the functions suite has no current-month un-bill case |
| F02 | `mark-attendance`: admin writes with the service key | CAUGHT (fnreg) |
| F03 | `repair-attendance` accepts the service key | SURVIVED - equivalent: the RPC refuses a uid-less caller (42501) |
| F04 | `repair-attendance` ignores `preview` | CAUGHT (fnreg) |
| F05 | refresh open to any signed-in user | CAUGHT (fnreg) |

9 caught, 6 survived (3 equivalent or near; 3 real gaps: X01, X07, F01).

## 9. Live catalog today (read-only)

| Check | Value |
|---|---|
| 1b objects | `money_change_overrides`/`_events`/review view: NULL; `money_change_checked`, `tuition_month_state`, `_money_ack`, `change_approval_needed`, `_change_request_claim`: 0 of 5; `zz_attendance_money_guard`: 0 |
| Triggers on `attendance` | `audit_attendance` (AFTER I/U/D), `guard_attendance_enrollment` (BEFORE I/U), `guard_cancelled_session_attendance` (BEFORE I/U, takes `sessions ... FOR UPDATE`), `update_attendance_updated_at` (BEFORE U), `zz_attendance_evidence_guard` (BEFORE U/D) - all `O`. The new trigger sorts last among BEFORE triggers. |
| What the file reads | all 16 functions present; `invoice_state_floor` present with `ever_paid, ever_signed, ever_frozen, max_recorded_payment`; the 8 columns present |
| Counts | attendance 6289, invoices 708, sessions 876; session_evidence_floor 0, invoice_state_floor 0 |
| cron | `rebuild-upcoming-sessions` active, `stars-sync` active |
| `schema_migrations` | NO `d4_floors` row: 1a was pasted outside `apply_migration` |
| **1a bodies on live carry CR (CRLF)** | raw `md5(prosrc)` of every 1a function differs from the expected JSON; with `\r` removed they match exactly: `_session_change_assess` raw 7bec7ce2... / LF 6c1b8c86...; `_session_erased_recently` raw 895058d5... / LF 5f589166...; `_caller_lane` ad886610 / 66001c3b; `_floor_mark_level` a9861a37 / ed25e62b; `invoice_floor_state` 7d043d7f / 84301619; `session_effective_level` 94bb24a5 / b66e757e; `_attendance_evidence_guard` 252fa52b / 0348195c; `_invoice_state_floor` d44463b5 / 3eb44221. D2 bodies (`session_change_guard`, `_session_change_apply`, `session_held_evidence`, `session_change_kind`) have no CR. |

Consequence for the brief: step 3.1 ("the 18 functions of 1a must still match exactly") and 3.2 (the two replaced D2 functions "at the 1a md5 6c1b8c86 / 5f589166") FAIL on a raw md5 today, before 1b is even applied, and the brief says STOP. The comparison must be `md5(replace(prosrc, E'\r', ''))`, or the expected values for 1a must be the live raw ones.

Deployed functions: `repair-attendance` v3 and `mark-attendance` v3 (verify_jwt true) are, CR aside, the text of origin/main (f5987804); `_lib/auth.ts`, `_lib/rate-limit.ts`, `_lib/attendance-effects.ts` are identical between origin/main and the branch. Origin/main has 4 commits not in the branch base, none touching these files. Deploying the branch versions undoes nobody's change.

All 18 1a functions on live, CR removed, equal the expected JSON (md5, secdef, volatility, EXECUTE f/f/f) - 18/18. In pglite: `guard-fingerprint.mjs --release d4 --check` "up to date"; `--check-unchanged` 66 compared, only the two replaced functions differ; `--check-unchanged --after-rollback` 66 of 66.

The brief otherwise: order is right and must be kept - migration first (the new `repair-attendance` sends every repair through `money_change_checked`, so before the paste it answers 503 `guard_not_installed`), functions second, screens last (the new repair screen sends `preview: true`, which the OLD function's `z.object` strips, so Preview against the old function writes, as it does today). The rollback trigger sentence is right. Probes are read-only and sound.
