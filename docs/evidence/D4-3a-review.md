# D4 step 3A (lessons: P1-P7, G-1..G-7) - independent review

Independent reviewer. Reviewed branch `d4-3a-lessons` at 856e493d (cut from the conductor branch at c132bf7b), checked out here as `review-3a`. pglite only: nothing applied, deployed or pushed; the live database was not touched. Probes: `docs/evidence/D4-3a-review-probes.mjs` (run with `node docs/evidence/D4-3a-review-probes.mjs`; 25 probes, real migration files over the d4 prelude, plus the LIVE teacher UPDATE policy on `sessions` from 20251012020423:79-86).

**Where I am / next step:** COMPLETE. Verdict below. Next step is not mine: the conductor rules on the changes, then the live apply.

## Verdict: APPLY WITH CHANGES

Blocker (cheap, documentation only):
- **B-1 Rollback 4 does not restore today's behaviour as written.** After the rollback script plus the required redeploy of the previous `manage-session`, the 3A SCREENS (which `D4-build-3a.md` "Rollback" step 3 says "may stay") make taking a lesson off Held impossible and break a Held lesson's time edit: `SessionActionsModal` (Held -> Scheduled) and `EditSessionModal` (Held + time change) open `PayGuardDialog` straight away, whose first call is `pay-preview` (`useGuardedChange.ts:245`); the previous function's `SessionActionSchema` has no such action -> 400, the dialog shows the error, and there is no other route in the UI. Fix: rollback 4 = script + previous `manage-session` (and `bulk-cancel-sessions`, `schedule-sessions` if sent) + **revert the 3A screens** (git revert of the `src/` part and the normal deploy). Put it in the script header, the build doc and the apply brief.

Should change (not blocking; conductor's call, each with a probe):
- **S-1 (medium) G-5 guards only a HELD lesson's times, so an old lesson that is still Scheduled can be lengthened and then held, paying the longer time with no reason and no override row** (probes P1b, P1c). Asymmetric with G-4, which A-5 extends to "started more than 7 days ago" (P1e). Fix below.
- **S-2 (low) Add probe P8 to `d4-lesson-pay` and record mutant L36 as killed.** The builder's reason for the survivor ("the apply's token already covers the row and the tier") is not right: the token is checked before the lesson is locked; P8 drives the window and kills L36.

Nice to have (wording / operability; none changes what is paid):
- N-1 Stars conflict "take theirs" in a locked month (decision 16): fail-closed is right, but the admin is not told why - `StarsSyncTab.tsx:161,393-403` toasts `e.message`, i.e. "session_change_requires_checked_path".
- N-2 `mark-attendance` (decision 17): an admin's register save whose Held flip is refused leaves the lesson Scheduled silently (`mark-attendance/index.ts:233-237` ignores the error).
- N-3 `ta/TAClassAssignment.tsx:139-160` (design P5 names it; not in 3A's file list, not adapted): assigning an assistant to, or removing them from, a Held lesson more than a week old (the list starts at any chosen date, `:44-72`) now fails as a whole with the raw message "session_change_requires_checked_path".
- N-4 A D2-checked move of a Held lesson into the future now fails at confirm with HC022 "kinds=unhold,move" (P3): `validate_session_status_trigger` (runs first) turns Held into Scheduled, so zz2 sees an un-hold beside the move. Fail-closed and arguably right (un-paying needs its own check), but the D2 move preview cannot predict it; `manage-session move` could answer `use_action: change-status` first for a Held lesson moved to a time that has not started.
- N-5 Stars withdrawal in a LOCKED month (P4): the un-hold is kept Held with an `automation_refused` event and no raise (correct), but the engine's next statement deletes the `stars_sync_held_flips` row and its note says "...so it is Scheduled again" unconditionally (`20261028090000:609-611`). The engine is out of D4's scope; say it in the release note (the money review screen's event is the true record).
- N-6 `PAY_COPY.meaning.hold` (`lessonPayGuard.ts`) says "Nobody has taken the register" also when the hold is asked for because the month is locked or after a checked un-hold (the server's sentence already says "(or the payroll month is closed)").
- N-7 `TeacherScheduleTransfer.tsx:174-182`: "Reload the list and transfer the rest" - reloading shows the same old Scheduled lessons, which fail again (A-5); the sentence should say "start the date range within the last week".
- N-8 Decision 18: the count of 0 is not vacuous - `d4-functions-lessons.test.mjs:196-198` asserts the create's insert IS on the user client (`sessionWrites('user').length === 1`). Optional: the same positive assertion inside `session-guard-functions` itself.
- N-9 `_session_insert_guard`'s slot match (decision 7) also passes a lesson born `Canceled` at a taken slot without HC023 or an event (P2b, P2c). No money (a cancelled lesson is neither paid nor billed; on live the seed writes Excused). Tighten to `s.id = NEW.id OR (slot AND NEW.status IS DISTINCT FROM 'Canceled')` if wanted.
- N-10 Design residual, stated: on the service lane a hold is always allowed (b.1 G-2), so a teacher's register through `mark-attendance` holds a lesson with no register at all in a LOCKED payroll month and nothing is recorded in `money_change_events` (P7). The Payroll screen's `live` drift is the only trace. An event (`service_hold_locked`) would make it reviewable.

## Findings, each with its probe

### B-1 rollback 4 (blocker, doc)

Read, not executed against the old function: `SessionActionsModal.tsx` (diff `+114-117`) sets `pay = {op:'unhold'}` for Held -> Scheduled and renders `PayGuardDialog`; `useGuardedChange.ts:241-253` previews through `payPreview` -> `manageSession("pay-preview")`; the previous `manage-session` (c132bf7b) validates `action` with `z.enum(['preview','update','move','cancel','force-cancel','change-status','uncancel','bulk-delete','delete','refresh-tuition','create'])` -> 400 `bad_request`, which the dialog shows as its error with no way forward. Same for `EditSessionModal.tsx` (diff `+129-133`, `op:'retime'`). With the new `manage-session` left deployed instead, every checked op raises HC050 after the rollback (the builder says so). So the only consistent rollback is all three: triggers, functions, screens.

### S-1 old Scheduled lessons: time edited, then held (medium)

```
PROBE P1a OK   control: admin raw lengthening of a Held lesson 10 days old  :: {"code":"HC020","detail":"kind=retime; ..."}
PROBE P1b GAP  admin: old Scheduled lesson lengthened 17:30-19:00 -> 17:30-20:30 raw, register taken, Held - no reason, no override row
               :: {"lengthen":"passed","mark":"passed","hold":"passed","status":"Held","end":"20:30:00","overrides":0}
PROBE P1c GAP  teacher (live RLS): own Scheduled lesson 10 days old lengthened to 21:00, then held by the service-lane register flip
               :: {"lengthen":"passed rows=1","mark":"passed","hold":"passed","status":"Held","end":"21:00:00"}
PROBE P1e OK   control: teacher change of an old Scheduled lesson (A-5) is guarded - asymmetric with P1b  :: {"code":"HC020","detail":"kind=reteach; ..."}
```

Why it matters: on live, a lesson nobody took the register for stays Scheduled and is exactly the unpaid one (pay counts Held only, `_lib/payroll-sessions.ts` `ACTUAL_SESSION_STATUSES`). Holding it later with a register is free by design (G-2), and its times are free because G-5 says "on a Held lesson". The live policy "Teachers can update their sessions" (USING teacher's own AND status = 'Scheduled', no WITH CHECK) lets the lesson's own teacher do the first step; `mark-attendance` (teacher -> service lane, rule 6 allows a current-month lesson after the week when no billable line is crossed) does the second. The amount is bounded by the lesson's own minutes (hourly staff), but it is the P4 misuse in two steps, and nothing records it as a money change. Pre-existing, not made worse by 3A; it is the design's scope (G-5 "start or end changes on a Held lesson"), so this is a design gap rather than a builder deviation.

Proposed fix (same shape as A-5 for the teacher): in `session_pay_change_kind`, `:177`, make the retime condition
`(o.status = 'Held' OR NOT COALESCE(public._lesson_in_free_week(o.date, o.start_time, o.end_time), false)) AND NOT v_free AND (times differ) AND public.session_change_kind(o, n) IS NULL`.
Executed: that one-line change (scratch copy of the file) against the builder's `d4-lesson-pay` -> 129 passed, 1 failed, and the one is the builder's own pin of this gap as intended: `d4-lesson-pay.test.mjs:424-426` "a Scheduled (unpaid) old lesson: not this guard's (D2 judges it as before)" - D2 does NOT judge a same-day time change of a not-moved lesson, so "as before" means "free". Everything else stays green, so the fix is local; that case would be re-stated as HC020 kind=retime. The build doc does not list this as a decision; the conductor should rule.
Knock-on to check: `manage-session move` same-day path already maps HC020 kind=retime to 409 + `set-time`, but `EditSessionModal` sends a non-Held lesson's time change to D2's Move dialog, which would then receive that 409 - it needs the same `payDialogFrom` hand-off as the Held branch. The rebuild only touches future lessons; `schedule-sessions include-held` only Held ones. Cases: P1b/P1c refused (HC020 retime), inside the week free, the checked retime of an old Scheduled lesson.

### S-2 the exec's tier re-check (L36) is load-bearing; the token does not cover it

`_money_change_apply` (1b, `20261114091000:953-1024`) takes the advisory lock, plans, checks the token, inserts the override, sets the flag and only then calls `_money_exec__session`, which is where the lesson row is locked (`:737`) - for the `session` entity the apply locks no row first (it does for `attendance`, `:960-970`). A change committed by another transaction between the apply's plan and that lock is invisible to the token. The zz2 trigger calls `_money_ack(..., 0)`, i.e. it re-checks no tier. So the exec's re-plan (`:743-751`) is the only thing that sees it. P8 simulates the window in one connection: an AFTER INSERT trigger on `money_change_overrides` (it fires after the token check, before the exec) locks the lesson's payroll month, as a concurrent month close committing at that moment would.

```
PROBE P8a OK   race, real file   :: {"previewTier":1,"result":"HC011","teacherChanged":false,"overrides":[],"monthLockedNow":false}
PROBE P8b L36-KILLED-BY-THIS-PROBE  same race, mutant L36 (the tier comparison removed)
               :: {"previewTier":1,"result":"committed","teacherChanged":true,"overrides":[{"tier":1,"review_required":false,"correction_reason":null}],"monthLockedNow":true}
```

With the mutant, a teacher change in a month that is now LOCKED commits as a T1 override: one reason, no correction reason, not reviewed. The real code refuses it (HC011). So the code is right; the suite should carry P8 (the trigger trick is enough) and the mutant table should say L36 is killed. A real two-connection race was not run (pglite is one connection).

### N-4 D2's checked move of a Held lesson into the future

```
PROBE P3 CHANGED  D2 checked move of a Held lesson 10 days old to next fortnight  :: {"tier":2,"code":"HC022","detail":"kinds=unhold,move","status":"Held"}
```

Before 3A the same call succeeded and `validate_session_status_trigger` silently took the lesson off Held (the teacher stopped being paid, under D2's reason only). After 3A it is refused; the admin un-holds first (the T2 lesson-pay check), then moves. Closed in the right direction; the message is the only problem.

### N-5 Stars withdrawal in a locked month

```
PROBE P4 GAP(minor)  :: {"raised":null,"rowsUpdated":1,"status":"Held","flipsLeft":0,"events":1,"noteUnconditional":true}
```

The sync page completes (no raise), the lesson stays Held, one `automation_refused` event carries `payroll_month_locked: true` - nothing is silently lost from the money record. Two side effects of the engine's own code after the kept write: the flips row is gone (the lesson is now an ordinary Held lesson: `d4-stars-interplay` asserts this on purpose, case 161) and the engine's note to the admin says "Scheduled again". The engine only un-holds within 24 hours of the lesson (`:531`), so this needs a month locked within a day of the lesson's end - rare.

### Everything else probed held

```
P2a OK   born-Held duplicate at a taken past slot: the guard passes it, the partial unique index refuses (23505)
P2d OK   born-Held at a free past slot -> HC023
P2e OK   PostgREST-shaped upsert un-hold (ON CONFLICT (id) DO UPDATE SET status) -> HC020 kind=unhold
P2f OK   upsert teacher change of a Held old lesson -> HC020
P5a OK   flag set to another transaction's override id, raw reteach -> HC020
P5b OK   same transaction: a real checked reteach of lesson A, the flag re-armed with A's override, raw reteach of B -> HC020
P5c OK   checked op at T1 without a token -> HC011
P5d OK   a signed-in non-admin replays the admin's token -> 42501;  P5e service role -> 42501;  P5f admin calls the exec directly -> 42501
P6  OK   Held lesson 10 days old, admin raw: type -> teacher, ta id -> NULL, attended -> false, re-point, delete, add, upsert attended=false: all HC020, the assistant still paid
P6b INFO a participant_type='teacher' row is not judged - calculate-payroll pays no such row (participationIsPayable)
P7b OK   the admin cannot take a service-held lesson off Held raw
```

## 1. Fail closed

Read every branch of the three trigger functions and the plan/exec:
- `session_pay_change_kind`: a NULL lock answer is "locked" (`COALESCE(..., true)`, `:160`), a NULL free-week answer is "not free"; HC022 for two kinds or one with a D2 kind. A raise inside it (any helper missing or failing) refuses the write - no EXCEPTION handler. `_caller_lane` 'unknown' (an API role with no user) falls through to the person raise in all three triggers.
- `_session_pay_tier`: any error -> T3; out-of-range -> T3 (`:239-243`). `tuition_month_state` and `payroll_reach` (1b) are fail-closed already.
- The ack: requires a row of THIS txid named by the flag, entity `session`, target = the lesson (or the class for `create`), and the exact acknowledged values (`:287-291`, `:382-384`, `:467-481`); a NULL teacher / time compares to NULL -> not acknowledged. The flag is cleared after the exec (1b `:1025`), and HC050 if the named trigger is missing or disabled (tested per trigger by the builder).
- Order on `sessions` (decision 2), confirmed in pglite: `update_sessions_updated_at`, `validate_session_status_trigger`, `zz0_session_evidence_keep`, `zz2_session_pay_guard`, `zz_session_change_guard_upd` ('2' sorts before '_'). Each later trigger's WHEN sees the NEW the earlier ones left. Every trigger that rewrites NEW runs before zz2; D2's never rewrites it. Consequence N-4 above.
- `_session_staff_guard` skips `pg_trigger_depth() > 1`. Trigger-made writers of `session_participants` on live: `cta_add_to_new_session` (a new lesson: born Scheduled, never judged anyway), `cta_on_change` (standing assistant added: lessons `date >= CURRENT_DATE` - today only, inside the free week unless the month is already locked; removed: Scheduled only), FK cascades (a lesson delete is D2's; a TA delete is RESTRICTed by `payroll_lines.assistant_id` once they have a locked line). No person-reachable bypass.

No fail-open path found.

## 2. Bypasses, by caller

| Caller | Un-hold | Hold | Teacher | Time | Assistants | Backdated / born Held |
|---|---|---|---|---|---|---|
| admin (PostgREST, RLS FOR ALL) | HC020 (P2e) | HC020 without register / locked / after un-hold | HC020 outside the free week (P2f, P1e) | HC020 on Held (P1a); **old Scheduled: free (S-1)** | HC020 (P6) | HC023 / HC020 create_past (P2d) |
| teacher (live RLS: own Scheduled only) | RLS: 0 rows (P1d) | RLS check refuses the new row | RLS check (own teacher_id) | **own old Scheduled: free (S-1)** | no write policy | no insert policy |
| cover / assistant / family / student / anon | no UPDATE / INSERT policy on sessions or participants (live: admin FOR ALL, teacher UPDATE only) | | | | | |
| service role | kept Held + event unless open month AND (not started OR sync flip with no person's Present/Late) | allowed (N-10) | HC020 | HC020 (schedule-sessions include-held -> `attention`) | HC020 | HC023; started and before today -> HC020 |
| owner (SQL editor / cron SQL) | passes + `owner_lane` event | same | same | same | same | same |

Paths the task named:
- Upserts (decisions 6, 7): both R-4 passes lock the existing row and hand the change to the UPDATE branch (P2e, P2f, P6 "upsert attended=false"). Residual N-9.
- Old manage-session actions (decision 1): a T0 change through them (only possible inside the free week, or a hold with a register in an open month) leaves `audit_log` rows - `audit_sessions` (AFTER UPDATE, 20261009130000:173-175) and `audit_session_participants` (20261022090000:68-69), plus manage-session's own named entry - but no `money_change_overrides` row. Not a money audit gap that matters: by construction no tier was crossed, and the actor, old and new values are in `audit_log`. It does depart from design (g) ("a T0 row when done from the admin screens"); say it in the release note.
- `bulk-cancel-sessions`: Held -> Canceled is D2's kind; zz2 classifies nothing (tested by the builder: D2's checked cancel of a Held lesson works). The new HC060 branch is unreachable until step 4.
- `schedule-sessions`: inserts only `date >= today` (`:592-600` refuses the past) with status Scheduled; teacher re-sync only on future Scheduled lessons; include-held time updates -> HC020 -> `attention.heldTimeRefused` + D2's `log_session_automation_refused`.
- `mark-attendance`: admin -> the flip on the caller's client (decision 17 / N-2); teacher -> service lane, hold allowed (N-10, S-1).
- The Stars engine on the service lane: the hold after a mark is allowed; the un-hold after a withdrawal passes in an open month (the engine's own condition is stricter than zz2's: no marked_by at all); locked month -> kept Held, no raise (P4). The engine never changes a teacher, a time or an assistant. `stars-sync` and `stars_sync_tick` both reach the engine with the service key (no impersonation: `stars-sync/index.ts:82`).
- `ai_action_apply` / `ai_action_undo` (`docs/sql/ai_action_apply_undo.installed.sql`): no write to `sessions` or `session_participants` (only `attendance` reads/deletes at `:288-299`), so 3A cannot bind or break it.
- `normalize_session_statuses` (definer, un-holds): EXECUTE revoked from authenticated (20260711235319:25), no caller.
- Tokens, the flag, PG_CONTEXT: 3A does not use PG_CONTEXT. Flag forgery and reuse: P5a-P5f. A PostgREST client cannot set an arbitrary GUC or run two statements in one transaction, so reuse needs the owner lane, which passes anyway.

## 3. Nothing existing weakened

`d4-lesson-pay` "install" proves no existing function (md5, definer, config, grant) or trigger changed and no row was rewritten; I re-read the file: it creates nine functions and three triggers, inserts one `guard_installed` event, nothing else. The cancelled-lesson attendance trigger (parent-row lock), the fail-closed session eligibility helper, the closed-payroll expenditure trigger, frozen bills, D2, 1a and 1b are not touched (full run below: their suites green). Behaviour change on D2: N-4 (closed direction).

Stars sync: no guard raises on the sync's lane (the only raises there are reteach / retime / restaff / born status / backdated insert, none of which the engine does). Nothing is silently lost from the money record: every kept un-hold writes `automation_refused`. Decision 16: acceptable - a conflict in a locked payroll month cannot be settled with Pixel Pal's mark until the lesson is held through the check, which is the point of a locked month - but the admin is not told why (N-1).

## 4. Decision 18 and every change to existing tests

Changes to existing files under `scripts/pgtest/` (diff c132bf7b..856e493d):
1. `session-guard-functions.test.mjs:1052-1058` - the one assertion, `ins.length === 1` -> `=== 0`, with a comment. Right per design (d) step 3A ("`create`: ... the service key leaves this action") and the house rule. Not vacuous today: the same suite's "create is unchanged" (`:941-947`) still asserts a 200 with a new lesson, so a create runs and its insert is on the user client. Nothing else in the file changed; F21 (`:883-899`, anon key missing -> 503) does not exercise `create`, so the removal of create's exemption from that check (`manage-session` `if (!anonKey)`) is covered by `d4-functions-lessons` (which also asserts the create's insert is on the user client, `:196-198`).
2. `run.mjs` - three new entries with pinned counts (130 / 57 / 19); no existing entry changed.
3. `d4-mutants.mjs` - 41 mutants added; existing entries unchanged.
4. `guard-fingerprint.mjs` - file 4 appended to `D4_FILES`; rollback 4 prepended to the after-rollback list.
5. `docs/evidence/D4-release-fingerprint.{sql,expected.json}` regenerated (additions only).

## 5. History

The migration changes no row (tested: digests of attendance, sessions, participants before and after; and pasted twice). The exec writes only the lesson acknowledged; `reteach` also sets `is_manual` / `manual_reason` on that lesson. Only `create` refreshes tuition, and only the reached (child, month) of the new lesson, through 1b's `refreshMoneyChange`. Nothing touches invoices, payments or payroll lines.

## 6. Payroll computed once

The file prices nothing (the builder's static check plus my read): the pay tier is `payroll_reach` (locked month -> 3, a Held lesson in reach -> 1), never a figure. `manage-session` never calls calculate-payroll in the 3A paths; the screens show stored tuition figures from the preview (`paid_vnd`, the bills before) and the sentence "Pay is worked out by Payroll after the change; no figure is shown here". `git diff` of `src/` shows no rate, minute or amount arithmetic.

## 7. Apply-ability on live

- Preflight pins (CR-stripped md5) equal `D4-1b-live-apply-brief.md` and the expected fingerprint for all six: `_caller_lane` 66001c3b, `_lesson_in_free_week` 4e8eac60, `_money_ack` 471a5563, `_money_change_plan` 3efa9ebc, `_money_change_exec` b5efef0f, `payroll_reach` 5ccecd82. 1b is live (applied by the conductor, functions verified 16 Nov 09:01-09:09). D1/D2 objects are checked for existence only (`_session_change_assess`, `session_change_kind` not pinned) - acceptable, they are fingerprinted by the release checks.
- `SET LOCAL lock_timeout = '5s'` right after BEGIN; one transaction; `DROP TRIGGER IF EXISTS` + `CREATE`; second paste a no-op (tested); `NOTIFY pgrst`; the result set prints the three triggers with `tgenabled`.
- Grants: nine functions, all `REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role`, no GRANT (the checked path is 1b's `money_change_*`); trigger functions need no EXECUTE grant to fire.
- Rollback 4 + the manage-session redeploy: B-1 - the screens must go back too.

## 8. Functions

- `manage-session`: admin only (`user_roles` read for the JWT's user from `auth.getUser(token)`); every lesson write on `asCaller` (the admin's JWT); the service client reads, writes `audit_log` and refreshes tuition. `create` now needs `SUPABASE_ANON_KEY` (Supabase sets it in deployed functions). Who creates lessons today and still can: admins through `manage-session create` (now on their own client: RLS "Admins can manage all sessions" FOR ALL; the seed and standing-assistant triggers are definer, so they still write); the generator through `schedule-sessions` (service key, future only - unchanged). Teachers have no insert path today (no INSERT policy); nothing breaks for them.
- `bulk-cancel-sessions`: HC060 branch only. `schedule-sessions`: include-held refusal reported and logged.
- Edge-function typecheck: green in the full run (section 10).

## 9. Screens

No pay or tuition computed in the browser. Wording checked against the SQL: the closed-month sentence is true (PayrollMonthLock reads `live` against the frozen lines); "Every child enrolled that day is marked Present and billed" is the seed's rule (an off-day enrolment is seeded Excused - slightly over-stated, harmless); N-6 and N-7 are the two inaccurate sentences; N-1, N-2, N-3 are the screens that show a raw code.

## 10. Runs

- `d4-lesson-pay` alone on 856e493d: 130 passed, 0 failed (42 s).
- Probes: 25 run; outputs above.
- Full `node scripts/pgtest/run.mjs` on 856e493d (one run): **6319 assertions across 65 suites, 0 failed** - d4 lesson pay 130, d4 functions lessons 57, d4 stars interplay 19, session guard functions 135, d4 floors 213, d4 D2 carry-over 275, d4 deployed functions 37, d4 rollback 26 (fingerprint `--check`, `--check-unchanged`, `--after-rollback` 66/66 with rollback 4), d4 register 140, d4 functions register 34, shared-module mirrors 19, edge functions typecheck 5, app typecheck 3 (`tsc -p tsconfig.app.json` loaded the source). Matches the builder's count.
- S-1 fix trial: `d4-lesson-pay` on the patched copy 129/1 (the one is the gap's own pin, see S-1).

## 11. Merge risk

Shared with the other three branches (from each branch's merge-base with 856e493d):
- step 2 (`worktree-agent-a36ad2752b190053b`, d3cd451f): `scripts/pgtest/run.mjs`, `scripts/pgtest/guard-fingerprint.mjs` (`D4_FILES` and the after-rollback list - both branches edit the same two lines), `scripts/pgtest/d4-mutants.mjs`, `docs/evidence/D4-release-fingerprint.sql` and `.expected.json` (both regenerated).
- step 3B (`origin/pc2/d4-3b`, 3b09300f; merge-base 02b571e6, OLDER than c132bf7b): `scripts/pgtest/run.mjs` only. Its file does not replace any of the six bodies 3A pins (grep), so 3A's preflight stays valid whatever the order.
- Settle Bill removal (`worktree-agent-a691e69d8dce8ffe6`, bbb23ecc): `scripts/pgtest/run.mjs` only.
After the merge: `D4_FILES` in migration order (09000, 91000, 92000, 93000, 94000), the after-rollback list newest first (5, 4, 3, 2, 1), then regenerate with `node scripts/pgtest/guard-fingerprint.mjs --release d4` and re-run `--check`, `--check-unchanged`, `--check-unchanged --after-rollback` (66/66). `d4_guard_status()` (1b) still lists none of 3A's triggers (builder's note) - step 4 or the conductor.

## Rulings on the 18 decisions

| # | Decision | Ruling |
|---|---|---|
| 1 | plain write first; T0 through old actions leaves no override row | **Accept.** No tier is crossed; `audit_sessions` and `audit_session_participants` record actor and values. State the departure from (g) in the release note. |
| 2 | zz2 sorts before D2 | **Accept.** Verified; every NEW-rewriting trigger runs first. Its consequence N-4 is closed-direction. |
| 3 | a kept un-hold leaves a floor | **Accept.** Raises later tiers only. |
| 4 | A-8 re-check in the exec, not the trigger; L36 survives | **Accept the placement; change the survivor's explanation and add P8 (S-2)** - the token does not cover the window, the re-check does. |
| 5 | owner lane on G-3 passes with an event | **Accept** (b.0's owner rule). |
| 6 | G-6 scope; TA cascade not guarded | **Accept.** A TA with a locked payroll line cannot be deleted (RESTRICT). |
| 7 | the two R-4 passes | **Accept**; N-9 optional tightening. |
| 8 | pay tier = max(1, payroll_reach of everyone moved) | **Accept.** |
| 9 | refresh pairs only for `create` | **Accept** (calculate-tuition counts Scheduled and Held alike, `:218`; times and teachers are not priced). |
| 10 | hold of a not-started lesson / retime that is a D2 move -> bad_change | **Accept.** |
| 11 | no free week for un-hold | **Accept** (design). |
| 12 | `update` no longer writes status; class EditSessionModal adapted | **Accept.** |
| 13 | `create` needs SUPABASE_ANON_KEY | **Accept.** |
| 14 | bulk HC060 -> one request | **Accept** (dormant until step 4). |
| 15 | include-held kept in the schema, retired from the screen; D2's logger | **Accept.** |
| 16 | Stars "take theirs" in a locked month refused until held through the check | **Accept the behaviour; word it (N-1).** |
| 17 | admin register save in a locked month leaves the lesson Scheduled silently | **Accept fail-closed; follow-up message (N-2).** |
| 18 | `session-guard-functions` assertion 1 -> 0 | **Accept.** Right per design (d); not vacuous (N-8). |

## What I could not check

The live database (not to be touched). Real concurrency (P8 is a one-connection simulation of the window). The screens were read, not rendered. PostgREST's HC020 error shape on live (as 1b, assumed). The real Stars engine end to end (its statements, as the builder's suite extracts them, plus P4). `npm run test:bun` was not re-run (3A changes no `scripts/*.test.ts` input).
