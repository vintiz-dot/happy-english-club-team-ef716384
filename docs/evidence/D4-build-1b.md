# D4 build - step 1b (the money guard's core and the register)

**Where I am / next step:** COMPLETE: built and tested; mutation run and full suite run green (25/25 mutants caught; 5903 assertions, 0 failed). Next step is not mine: the independent review of 1b, then the conductor's live apply with `D4-1b-live-apply-brief.md` (after 1a is live).

Implementer only: nothing pushed, nothing deployed, nothing applied to any database. Merged `claude/hec-conductor-setup-efbaa5` (9841c6aa) first.

## What was built (only the files (h) lists for 1b, plus the shared test tooling)

| File | What |
|---|---|
| `supabase/migrations/20261114091000_d4_core_register.sql` | tables `money_change_overrides`, `money_change_events` (append-only, owner-only inserts, admin read, house-rule grants); views `money_change_review_queue`, `money_change_tuition_pending`; `tuition_month_state`, `tuition_reach` (widened to the family, R-8a), `payroll_reach`, `_money_ack`; the dispatcher `_money_change_plan` / `_money_change_exec` (plpgsql CASE statements, every entity branch written now, an uninstalled entity answers HC015 `not_installed`); entity `attendance` ops `set_marks` and `repair`; RPCs `money_change_preview`, `money_change_checked`, `money_changes_checked_bulk` (50), `record_money_change_event`, `d4_guard_status`, `log_money_automation_refused` (service only); approval stubs created only if missing; trigger `attendance.zz_attendance_money_guard` (G-11's seven rules + DQ-1). `SET LOCAL lock_timeout = '5s'`. Replaces nothing; changes no row. |
| `scripts/ROLLBACK-d4-2-register.sql` | drops the one trigger; states what stays and why. |
| `supabase/functions/_lib/session-guard.ts` | every new code of b.8 once (HC023, HC024, HC025, HC060-HC065, HC120, HC121) and the new HC015 refuse codes; `attendanceRefusalKind`. |
| `supabase/functions/_lib/money-guard.ts` (new) | `moneyPreview`, `moneyConfirm`, `readAck`, `refreshMoneyChange` (25 pairs a call, resumable, recorded as the caller), the teacher rule's clock (`lessonEndedMoreThanAWeekAgo`, `monthIsPast`). |
| `supabase/functions/guarded-change-refresh/index.ts` (new) | admin `{action:'refresh', override_id}`; service-only `{action:'log-refused'}`. |
| `supabase/functions/repair-attendance/index.ts` | lane: the admin's own JWT only (a service-key caller is refused). `preview: true` reads only (the old "Preview" button wrote the rows). The rows are written by `money_change_checked('attendance','repair')` as the caller: T0 directly (still one override row), T1+ without `ack` -> 409 `attendance_requires_checked_path` with the preview and NOTHING written. Same rows as before (`marked_by NULL`, the note; Excused outside the enrolment). |
| `supabase/functions/mark-attendance/index.ts` | an admin's upsert and Held flip on the admin's own client; HC025 -> 409 with the `set_marks` preview, never retried on the service key. A teacher: G-11 rule 6 in the function from the lesson's date and the stored marks (no bill read), then the service write as before. |
| `src/lib/moneyGuard.ts` (new) | wording, what the dialog asks for (from the preview), the ack body, the reach rows, `needsMoneyDialog`. Pure. |
| `src/components/admin/money-guard/{api.ts, useMoneyChange.ts, MoneyGuardDialog.tsx, ReachTable.tsx, MoneyChangesReview.tsx}` (new) | the dialog (reuses `session-guard/Fields.tsx` unchanged), the stored bills it reaches, the hook (preview -> confirm -> refresh), the review list (not mounted: `tabs/AutomationTab.tsx` is the conductor's). |
| `src/components/admin/PastAttendanceEditor.tsx` | logic only (R11 classes kept): one batch per lesson; a 409 with a preview opens the dialog; the other lessons' edits stay on screen. |
| `src/components/admin/AttendanceRepairTool.tsx` | "Preview" reads only; "Repair Attendance" writes; a 409 opens the dialog. |
| tests | `scripts/pgtest/d4-register.test.mjs`, `d4-functions-register.test.mjs`, `money-guard-lib.test.mjs`; `d4-functions-harness.mjs` gains `upsert`; `d4-mutants.mjs` gains 25 mutants of file 2; `guard-fingerprint.mjs` lists file 2 (and the enrolment-guard migration it reads) and runs rollback 2 in `--after-rollback`; `run.mjs` registers the three suites with pinned counts. |
| `docs/evidence/D4-release-fingerprint.*` | regenerated: 40 functions, 19 triggers, 6 relations; 1a's 18 functions unchanged. |
| `docs/evidence/D4-1b-live-apply-brief.md` | pre-checks, apply, md5 of every new object, deploy, probes, rollback. |

## The register rule as built (G-11, in trigger order)

1. INSERT while the (lesson, child) row exists -> pass (a PostgREST upsert's BEFORE INSERT fires before ON CONFLICT; its UPDATE is judged with the real old row, R-4).
DQ-1. A person who is neither an admin nor `is_teacher_of_class` (a one-off cover teacher or assistant) lowering a person's mark (`_floor_mark_level` down) of a lesson that ended more than 7 days ago -> HC025 `cover_staff`, "ask an administrator". The class's regular teacher and standing assistants pass at any date.
2. No crossing of the billable line (Present / Absent / Late against Excused or no row), or a cancelled lesson -> pass.
3. The lesson ended 7 days ago or less (or has not ended) -> pass, every lane, whatever the bill.
4. An acknowledgement of this transaction for this lesson (`set_marks`) or class (`repair`), this child, this date, at a tier not lower than the trigger's, and the exact status written (and, for repair, an unsigned INSERT) -> pass. The owner lane passes and writes `owner_lane` when the tier is above 0.
5. An admin: the tier of `tuition_month_state` (raised to T1 when a person's Present / Late is un-billed, A-6); T0 passes, else HC025 `retro_mark` with the tier.
6. Anyone else signed in: HC025 `retro_mark_staff` when the lesson's month is past or a person's Present / Late is un-billed - from the lesson and the old mark only (A-3: no bill fact in the error).
7. The service lane: through; one `service_retro_mark` event when 5 or 6 would have asked (R-7).
Trigger-made writes (depth > 1: the seeds, the cancel's excuse-all, a cascade) are not judged.

## Suites

| Suite | Assertions | Covers |
|---|---|---|
| `d4-register` | 119 | preflight; install (no row rewritten, idempotent, nothing of D1/D2/1a replaced or re-granted, only the listed triggers added, search_path on every function, grants, RLS, lock timeout, no partial unique index); `tuition_month_state` over the b.0 table and the bill floor; `tuition_reach` (family-wide) and `payroll_reach`; R-4 bulk upserts of an unchanged register in a paid past month (teacher and admin) and a non-crossing upsert pass, a crossing upsert is judged; the free week on every lane with a confirmed bill; rules 5 / 6 / A-6 / A-3; rule 7 and the owner lane with their events; D2's cancel in a paid past month; DQ-1 (cover refused after the week, free inside it, the regular teacher free, a rise not refused); the acknowledgement (forged, other child, other status, lower tier -> HC011, a replay from an earlier transaction); the checked path's order (42501 for teacher / parent / service role, HC010 / HC011 / HC012 / HC013, a bill recalculated between preview and confirm, T3 in the review queue, T0 with no reason still one row, a token always checked when sent, refuse codes, `not_installed`, `bad_entity`); HC050 with the trigger disabled and the status card; bulk (HC017, review of T2 bulk, HC016); G-12 repair (raw refused, preview, reason, rows as before, nothing left, Excused outside the enrolment, this week T0 with a confirmed bill, `no_enrollment`, `bad_args`); events, review note, automation log, append-only; rollback 2 (trigger gone, tables stay, raw passes, checked path HC050, safe twice, re-paste). |
| `d4-functions-register` | 33 | repair-attendance per caller (no auth, teacher, parent, the service key itself), preview writes nothing, 409 with the preview and nothing written, short reason, stale token, acknowledged repair as the admin (RPC on the caller's client, no service write), nothing missing, this week T0, `no_enrollment`, bad body; mark-attendance admin on the admin's client (attendance and Held flip), admin old billed -> 409 with the `set_marks` preview and no service retry, a non-crossing old change passes; teacher today / old past month (409, nothing written, no bill read) / non-crossing; cover teacher, parent, no auth; guarded-change-refresh 25 then 5 with the events, teacher 403, unknown 404, log-refused admin 403 / service ok, bad action. |
| `money-guard-lib` | 33 | the dialog's requirements and button, the ack body, the reach rows, the mark lines, which 409 opens the dialog, every refusal's wording says what to do next; the function side's Hanoi clock (the 7-day line, an overnight lesson, an unreadable time counted as old), the past month, the refresh resume, `readAck`. |

Full run: `node scripts/pgtest/run.mjs` -> 5903 assertions across 62 suites, 0 failed (d4 register 119, d4 functions register 33, money guard lib 33; d4 floors 213, d4 D2 carry-over 275, d4 deployed functions 37, d4 rollback 26 unchanged; session guard functions green with the extended `_lib/session-guard.ts`). App typecheck: clean (`tsc --noEmit -p tsconfig.app.json`, exit 0, and the suite "app typecheck"). `edge-functions.test.mjs`: 104 files type-check (the three new / changed functions included).

## Mutations (file 2; `node scripts/pgtest/d4-mutants.mjs C01 ... C25`)

| Mutant | Breaks | Verdict |
|---|---|---|
| C01 | G-11 rule 1 dropped (an upsert's BEFORE INSERT judged as a new row) | CAUGHT by register: FAIL R-4 a PostgREST-shaped bulk upsert re-saving an unchanged register of a past PAID month (T2): passes |
| C02 | G-11 rule 3 dropped (no free week) | CAUGHT by register: FAIL   the admin puts it back: allowed |
| C03 | teacher rule ignores a past month | CAUGHT by register: FAIL teacher, lesson in a past month: HC025 "ask an administrator", with nothing about the bill in the error |
| C04 | A-6 dropped (a person's Present un-billed in an unbilled month passes) | CAUGHT by register: FAIL A-6: a PERSON's Present un-billed after the week, nothing billed: the admin still needs a reason (T1) |
| C05 | the service lane is refused like a person | CAUGHT by register: FAIL service lane, old lesson, billed month: the write goes through AND one service_retro_mark event names it |
| C06 | service_retro_mark not written | CAUGHT by register: FAIL service lane, old lesson, billed month: the write goes through AND one service_retro_mark event names it |
| C07 | owner_lane event not written | CAUGHT by register: FAIL owner lane (SQL editor): passes, and one owner_lane event (A-1) |
| C08 | DQ-1 dropped (one-off cover lowers an old mark) | CAUGHT by register: FAIL a cover teacher (not a teacher of the class) lowering a person's Present to Absent, lesson 40 days old: HC025 cover_staff, "ask an administrator" |
| C09 | DQ-1 also refuses the class's regular teacher | CAUGHT by register: FAIL R-4 an upsert Present -> Absent (both charged, no crossing): passes |
| C10 | the acknowledgement does not check the status written | SURVIVED the first run (the case also changed the child); a same-child case added; re-run: CAUGHT by register (an acknowledgement for this child with another status) |
| C11 | the acknowledgement does not compare tiers (A-8) | CAUGHT by register: FAIL A-8: an acknowledgement stored at T1 against a T2 write -> HC011 token_stale |
| C12 | the acknowledgement accepts a row of another transaction (replay) | CAUGHT by register: FAIL a replay: the flag names a real override of an earlier transaction -> HC025 |
| C13 | tuition_month_state ignores the bill floor's signature | CAUGHT by register: FAIL the bill floor: a payment reset and an un-confirm leave the past month at T3 (signed), state from the floor |
| C14 | a past month with no bill but a lesson is T0 | CAUGHT by register: FAIL past month, no bill, the child's class taught that month -> T1 |
| C15 | a confirmed current month is T0 | CAUGHT by register: FAIL tuition_month_state current month, confirmed -> T2 |
| C16 | no confirmation needed | CAUGHT by register: FAIL no confirmation -> HC012 |
| C17 | the token is not checked | CAUGHT by register: FAIL a wrong token -> HC011 |
| C18 | HC050 dropped (writes with the trigger disabled) | CAUGHT by register: FAIL trigger disabled: money_change_checked -> HC050, nothing written |
| C19 | bulk: a T2 item rides on the batch reason | CAUGHT by register: FAIL bulk: a T2 item with only the batch reason -> refused HC017; the T1 item done (via bulk) |
| C20 | a T2 bulk change is not reviewed | CAUGHT by register: FAIL bulk: with its own reason, done; a T2 change made in bulk goes to review |
| C21 | the plan ignores the free week | CAUGHT by register: FAIL set_marks preview for TODAY's lesson with a confirmed bill: T0 (the week is free in the plan too) |
| C22 | repair ignores the enrollment (Present outside it) | CAUGHT by register: FAIL a lesson outside the enrollment is repaired as Excused, and that is T0 |
| C23 | the service role may run the checked path | CAUGHT by register: FAIL RPCs: authenticated only (not anon, not service_role); log_money_automation_refused: service_role only; the rest: nobody |
| C24 | trigger-made writes are judged | SURVIVED the first run (the cancel's excuse-all is also passed by "cancelled lesson"); a case with the live seed trigger added; re-run: CAUGHT by register (the seed of a new lesson, depth 2) |
| C25 | an admin's old billed mark passes raw (rule 5 dropped) | CAUGHT by register: FAIL admin, lesson 40 days old, paid past month, raw Present -> Excused: HC025 retro_mark (tier 2) |

25 mutants of file 2: 23 caught on the first run, 2 survivors (C10, C24) each caught after a new case; 25/25 caught.

## Design questions (each built the fail-closed way)

1. **T4 is live (b.6 checked against the merged code).** `invoices.status` is now derived by `paidLabel` / `invoice_paid_label` (`20261113090000`): 'paid' also for a month covered by credit carried in with nothing recorded, and an admin's 'credit' label is kept. `tuition_month_state` reads `status IN ('paid','partial')` as paid, so a month covered by credit is T2 when past - fail closed, consistent with D1/D2's settled test. `recorded_payment` writes are compare-and-set: a lowering still goes through the 1a bill floor; nothing here writes a label. No change to the build was needed; b.6's assumptions hold.
2. **A-13** ("when the lesson's month is past and the D4 status RPC is missing: 503"): the teacher rule in `mark-attendance` needs no RPC (lesson date and stored marks only), and an admin's write is judged by the database, so there is no RPC whose absence changes the answer. Not built as a separate 503; noted. Before the migration is pasted, an admin's old mark through the NEW `mark-attendance` simply passes (no trigger), exactly as today.
3. **Attendance and payroll.** A register change does not change what staff are paid (pay follows the lesson's status), so `impact.closed_payroll` is false for the attendance entity and a locked payroll month does not put a register change into review. A wrong reading here would only reduce reviews; flagged for the reviewer.
4. **The acknowledgement for `set_marks`** also requires `marked_by` to be set on the written row and the exact status; for `repair` an unsigned INSERT with the status of that lesson in the plan. A delete is never acknowledged (neither op deletes).
5. **The plan's tier** reaches a T0 for a crossing inside the free week and uses `tuition_month_state` outside it, as the trigger does; the trigger re-judges at write time and refuses an acknowledgement stored at a lower tier (A-8, HC011).
6. **Cancelled lessons:** `set_marks` refuses (`lesson_canceled`); `repair` skips them (as the function did). The trigger's "cancelled lesson -> pass" clause is equivalent today because the cancelled-lesson guard only allows Excused there; kept as the design states.
7. **`MoneyChangesReview`** is built and not mounted (`tabs/AutomationTab.tsx` is the conductor's file); `supabase/config.toml` needs a `guarded-change-refresh` block (`verify_jwt = true`), also the conductor's file.
8. **Reviewing `service_retro_mark` / `owner_lane` events:** they have no override row, so `record_money_change_event(... 'reviewed')` cannot sign them off; the review list shows the last 100 read-only. A sign-off for events is left to step 4's review screen.
9. **Repair of a lesson the child was not enrolled on** writes Excused (as before) and is T0; a repair over more than 400 days or 200 lessons is refused (`bad_args` / `too_many`) - the old function had no cap.

## Not verified

The live database. The real Stars engine against the register guard (its writes are service-lane and recorded, never refused; `d4-stars-interplay` is step 3A). The screens were type-checked, not rendered (the dialog reuses the session guard's fields). The bun suite `scripts/sessionGuard.test.ts` was not run (no bun here).
