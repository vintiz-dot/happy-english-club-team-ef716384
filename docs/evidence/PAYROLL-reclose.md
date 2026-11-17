# Payroll re-close (D5 gap G-7)

Branch `payroll-reclose`, from `origin/main` at 04ccc58f. **Money: staff pay.** Nothing applied, deployed or pushed.

## The gap

`close-payroll-month` only ever upserted. Close a month, reopen it, correct it so that someone earns nothing there any more, close it again: their `payroll_lines` row and their `source_kind = 'payroll'` expenditure from the first close stayed. The closed month then paid and booked a person it no longer owed (overpay). Live on 17 Nov: M33 (payroll cost of a closed month with no line) = 0, 2 months locked, 1 ever reopened - this is prevention, there is nothing to repair.

## Decision: a new SQL function, because the old order was not all-or-nothing

The old close was five PostgREST requests - period upsert, teacher lines upsert, assistant lines upsert, cost upsert, lock update - and each is its own transaction. Adding two DELETE requests to that would not have been "the same all-or-nothing unit as the rest of the close", because there was no such unit. Proved in the suite (section 5): main's function, given a cost write that the closed-payroll guard refuses, returns 500 **after** it has already rewritten the month's lines (Mai 3,000,000 -> 3,300,000) and leaves the month open with lines and costs disagreeing.

So `supabase/migrations/20261117153000_payroll_reclose_reconcile.sql` adds `public.close_payroll_month_apply(p_month, p_lines, p_costs, p_actor, p_note)`. An RPC call is one transaction: any RAISE (its own checks, or any trigger) rolls back all of it. In order:

1. Checks the plan: month format; actor is an admin (`has_role`, 42501 otherwise); every line of this month, one subject, nobody twice; the costs are exactly the lines' costs (one per line, key `month:teacher|assistant:id`, same amount) - otherwise HC148.
2. `INSERT payroll_periods ... ON CONFLICT DO NOTHING`, then `SELECT ... FOR UPDATE`; a closed month is refused (HC147). Two closes at once take turns; the second finds the month closed. (The old upsert could flip a just-locked month back to open.)
3. Sets the period open with the note - what the old upsert did to an existing row.
4. **Removes** this month's `payroll_lines` whose person is not in the new lines, and this month's payroll expenditures (`source_kind = 'payroll'`, key `^<month>:(teacher|assistant):<uuid>$`) whose key is not in the new costs. The month is open here, so `refuse_write_to_locked_payroll` and `refuse_payroll_expenditure_write_to_locked_month` allow it - and they still run on every row (a stale cost dated in a closed month is refused, and the whole close with it).
5. Upserts the lines (two conflict targets) and the costs exactly as PostgREST did: same columns, same `DO UPDATE SET` list, `jsonb_populate_recordset(NULL::table)` for the types.
6. Locks the period last, `locked_at = now()` (the transaction's time, so no line or audit row is later than the lock - M31's rule; the old lock time came from the function's clock).
7. If anything was removed, one `audit_log` entry `payroll_close_removed_not_owed` with `actor_user_id` = the closing admin, entity `payroll_periods` / the month, the removed lines (name, amount) and costs, and why. The row trigger also logs each DELETE (actor NULL: service role, as for every write of the close).

SECURITY INVOKER, EXECUTE for `service_role` only (revoked from PUBLIC, anon, authenticated). Preflight fails closed - nothing created - unless the tables and columns, the three plain unique conflict targets, both enabled closed-payroll guard triggers, `payroll_month_is_locked` and `has_role` exist. Checked read-only against live: all present, the name is free. Wrapped in BEGIN/COMMIT; safe to paste twice; updates no row.

`close-payroll-month` keeps everything up to the write (admin gate with `allowServiceRole: false`, the pre-check on a locked month, calculate-payroll over the service role, the `earning` filter, the line and cost objects - unchanged), then makes the one rpc. Errors: function missing (PGRST202/42883) -> **503, nothing written** (fail closed: not the old path); HC147 -> 409; a guard (23514) or HC148 -> 409 with the database's words and "Nothing was changed."; else 500. Response: the old fields, plus `removedLines` and `removedCosts`; `lockedAt` is the stored one.

## What the screen shows (PayrollMonthLock)

Checked: the drift panel walked calculate-payroll's live rows only. calculate-payroll leaves out an assistant with no paid minutes and an archived teacher with no lessons, so for a CLOSED month where such a person still has a line, the panel showed nothing for them - their minus-what-was-paid correction was silently lost. Now `src/lib/payrollDrift.ts` (pure, no pricing) also reports a line with no live row as `paid X, now computes 0 (no longer earns in this month)`, offered for carrying like any other drift. No drift is shown until the live figures have loaded (`liveReady`, passed by PayrollTab), so a closed month does not flash "everyone overpaid" while loading or after a failed read. Everyone the live rows do cover gets exactly the rows the old code gave.

After a re-close that removed someone, the close toast says who and how much ("Removed 1 line(s) from the earlier close of staff who earn nothing in the month now: Colleague (500,000 ₫).") and stays until dismissed. After the re-close the month records 0 for them, so the panel correctly shows no drift for them: the correction is the re-close itself, recorded in audit_log. Carry-forward (payroll_adjustments, the D4 approval trigger on it) is untouched.

## Tests - `scripts/pgtest/payroll-reclose.test.mjs` (registered as "payroll re-close"): 89 passed at 4f41f003, 127 after fix round 1

The real close-payroll-month and main's (04ccc58f) bundled, over a PostgREST stand-in that runs every select/upsert/update/rpc as real SQL as service_role, on the real migration chain in paste order (audit 20261009130000, 092000, 093000, 095000, 096000, 097000-099000 class overhead with a rent template so the freeze writes rows, 20261022091000, 20261117111000, then the new file).

| Asked for | Section | Holds |
|---|---|---|
| install / grants / fail-closed preflight | 1 | applies twice; only service_role; SECURITY INVOKER; refuses (creates nothing) without each guard or the plain index |
| first close unchanged byte-for-byte vs today | 2 | every row of payroll_periods, payroll_lines, expenditures, class_overhead_allocations, audit_log identical to main's (ids/clock times aside); response = main's + empty removed lists; also with Payroll-tab bookings already there, and a re-close where nobody dropped |
| teacher dropped between two closes -> line and cost removed | 3 | main leaves line + cost (month books 4,300,000); new removes both (3,800,000 = owed); response and one named audit entry say who; row audit has both DELETEs; M31/M32/M33 = 0 |
| teacher still owed -> unchanged | 3, 4 | their rows keep id and created_at; values only as the close always wrote |
| TA case | 4 | assistant_id line and `assistant:` cost removed |
| re-close refused by a guard -> nothing changed | 5 | stale cost dated in closed July: 409 with the guard's words, every table byte-identical before/after; the same for a refused cost upsert (where main half-writes); HC147 closed meanwhile; HC148 x6 bad plans; 42501 non-admin / no actor; migration missing -> 503 and not even the period row |
| never a closed month / other months / other rows | 6 | July (closed) lines and cost, September cost, odd-key and hand-entered payroll costs all stay |
| PayrollMonthLock drift | 7 | dropped TA shows -450,000 (main's panel: nothing); no drift until loaded; carried netted; rows the live figures cover identical to main's logic |

M31/M32/M33 are run from `scripts/CHECK-money-invariants.sql` itself (the `locked` CTE and the three SELECTs cut out of the file at run time).

Other suites touched: `teacher-payroll.test.mjs` - its stand-in now answers the `close_payroll_month_apply` rpc and `closeWrites` reads the lines/costs from it (same comparison as before); its "books nothing" check also refuses the rpc. `money-write-paths.test.mjs` - the four close-payroll-month upsert/update pins become one reopen update and a pinned rpc.

## Harness

main's `run.mjs` lacks the teacher/TA payroll suites. I brought `teacher-payroll.test.mjs`, `ta-payroll.test.mjs`, `teacher-payroll-view.test.mjs` from **`calc-fix`, not conductor/work**: conductor's copies predate main's calculate-payroll (they fail 21 and 30 on main because main's TA read filters `sessions.date`, commit 268e0700); calc-fix's calculate-payroll is byte-identical to main's and its copies pass (164/261/94). Registered them, `payroll re-close` and `money invariants check` in run.mjs. Nothing else from conductor/work was brought.

## Gates (at 4f41f003)

Full `node scripts/pgtest/run.mjs` (real clock, ~17:00 Hanoi): **4732 assertions across 51 suites, 2 failed** (invoice status 32 failed, stars sync core crash). main at 04ccc58f, same harness minus the five suites registered here: 3999 across 46, the same 2 failed. `tsc --noEmit -p tsconfig.app.json`: clean. `npm run test:bun`: 142 pass, 3 fail, 2 errors - all on main already (functionError.test.ts reads the removed SettleBillModal.tsx; richTextEditor/richTextReview miss ./fixtures/rich-text/dom). Known on main and unchanged by this branch: `invoice status` (32 failed) and `stars sync core` (crashes) - the harness-lag failures the brief names; `money-write-paths` is not registered on main and crashes there on a missing `scripts/CREDIT-past-unapplied-cash.sql` after 6 unrelated failures (none mention close-payroll-month after this change).

## Fix round 1 (review REVIEW-payroll-reclose.md, SHIP WITH CHANGES)

| Item | Change | Proved by (payroll-reclose.test.mjs) |
|---|---|---|
| M-1 (ruling: fail closed in the database AND show it) | `close_payroll_month_apply` refuses with **HC149** to remove the line of anyone with `payroll_adjustments` carried out of this month (`origin_month = p_month`): message names each person, their line, the carried sum and the months it went into, says to undo the carry first (if unpaid) or leave the month, and "Nothing was changed". Checked before any write that matters (after the period lock; the refusal rolls everything back). close-payroll-month passes it through as 409. `payrollDrift` also emits a row for any carried id in neither the live rows nor the lines (paid 0, now 0, delta = minus what was carried, `carriedOnly`), named from `payroll_adjustments -> teachers / teaching_assistants (full_name)`; the panel labels it "(no line and no lessons in this month; only a carried correction remains)". The close/reopen toast now shows the function's own sentence (`functionErrorMessage`) for 20 s instead of "non-2xx". | section 8: the reviewer's underpay scenario (Hoa TA 450,000 closed, -450,000 carried into October, re-close without her) -> 409 HC149 naming her, every table (adjustments included) identical before/after; direct rpc code HC149; a re-close that keeps a carried person (line updated) closes as before; someone else without a carry is still removed. Section 7: the reviewer's drift probe as assertions (carried-only row +500,000 by name; active-at-0 not doubled; netted-to-0 no row; unnamed TA). |
| M-2 | `removedCostsText` beside `removedLinesText`; the close toast shows both (memo + amount). | section 7 (text, and PayrollMonthLock uses both), R1 (a first close that removes only a Payroll-tab booking now produces the cost sentence). |
| N-1 | Chose a transaction **advisory lock** over FOR SHARE on the period row, because on a first close the period row is the close's own uncommitted insert and FOR SHARE would find nothing to wait on. The close takes `pg_advisory_xact_lock(1902, hashtext(month))` first and holds it to commit; `refuse_payroll_expenditure_write_to_locked_month` is replaced by the same body plus `pg_advisory_xact_lock_shared(1902, hashtext(m))` on each month the payroll row names (key and date, old and new, sorted), taken BEFORE it checks. A Payroll-tab booking during a close waits, then (fresh snapshot) finds the month closed and is refused; one in flight makes the close wait and its DELETE then sees it. Bookings do not block each other. The preflight refuses to replace the guard unless its body md5 is 20261022091000's (`32dc7c68...`, = live) or this file's (`8d4df0f0...`). | section 8: a payroll booking holds the lock shared until commit; a non-payroll cost takes none; the close holds it exclusively (its own cost writes do not self-block); the installed guard locks before it checks. Section 1: a changed guard body refuses the install. The waiting itself needs two connections - pglite has one; reasoned, not run. |
| N-4 | When calculate-payroll fails, close-payroll-month re-reads the period; locked now -> 409 "already closed", else the 500 as before. | section 8: a close that lost the race (the month locked during its calculate-payroll call) -> 409, nothing written by it; a failure on a still-open month stays 500. |
| N-5 | The audit `why` lists per item: "`<name>`: line (X) and booked cost (Y)", "line (X) only, no booked cost", or "`<memo>`: booked cost (Y) only, no line". | section 8: first close (cost only) and re-close (both). |
| N-2 | Left as is: a mis-dated keyed cost in a closed month blocks the whole close with the guard's own words naming that month and "Nothing was changed" - fails safe; live has 0 such rows. | R2 (BASE 200, new 409 naming July). |

The reviewer's probes are in the suite, not as separate files: `probe-reclose-appendix.mjs` R1-R5 is section 9 (each printed NOTE now an assertion), `probe-drift-carried.mts` is the M-1 block of section 7 (it imported from the reviewer's deleted export, so it could not run as copied). Registered through the suite.

Suite now **127 passed, 0 failed** (was 89). Re-run in the fix round: teacher-payroll 164/0, ta-payroll 261/0, teacher-payroll-view 94/0, payroll-rows 69/0, money-invariants-check 125/0, edge-functions typecheck 5/0, `tsc --noEmit -p tsconfig.app.json` exit 0, `npm run test:bun` 142 pass / 3 fail / 2 errors (unchanged, all on main). money-write-paths: no failure mentions the close. The full run.mjs was not repeated in this round.

## Files to apply / deploy (LF md5, CR stripped) - fix round 1

1. Paste `supabase/migrations/20261117153000_payroll_reclose_reconcile.sql` - `f55e77a920bfe7bddedd7a14174a6511` (same file name; replaces `fe129dba...`, never applied).
2. Then deploy `close-payroll-month`: `supabase/functions/close-payroll-month/index.ts` `9a20158cc2a283464784a7019d97b2aa`, `supabase/functions/_lib/auth.ts` `92b44db93cd2614a2fb3011e3a9063ba` (unchanged).
3. Push the screen (Cloudflare): `src/lib/payrollDrift.ts` `d7ebea490f5343352b96766ae9f3d2ba`, `src/components/admin/payroll/PayrollMonthLock.tsx` `cfa4d1fdda7b29bf6aa17afa921731a6`, `src/components/admin/tabs/PayrollTab.tsx` (one prop). Works with either function version (the removed lists are optional).

Order matters for 1 -> 2: the new function refuses to close (503, nothing written) until the migration is in. The old function keeps working after the migration (the guard only gains a lock it never contends: the old close takes none). Rollback: redeploy the previous close-payroll-month; `DROP FUNCTION public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text);`; re-run the `CREATE OR REPLACE FUNCTION public.refuse_payroll_expenditure_write_to_locked_month()` block of 20261022091000.

## What a reviewer should attack

- The removal set is "not in this close's lines", i.e. calculate-payroll's `totalAmountActual > 0` set. A person in the result at 0 who had a line is removed (they are owed nothing). If calculate-payroll ever answered short without failing, a re-close would remove a real line. Today every staff read in it throws (FOLLOWUP 268e0700), and the edge function refuses a month with nobody earning.
- A FIRST close also removes this month's keyed payroll costs of people not earning (e.g. a Payroll-tab booking for someone whose lessons were then cancelled). Same overpay, same rule; live October 2026 (open) has 6 such bookings - their people will be checked against calculate-payroll when October is closed. Payroll-tab bookings of people who do earn are overwritten exactly as before (tested byte-for-byte).
- Concurrency (fix round N-1): the Payroll tab's booking and the close now take turns on the month's advisory lock (shared / exclusive). Two closes at once are serialised by the same lock and FOR UPDATE; the loser answers 409 (N-4). The waiting is not exercisable in single-connection pglite; reasoned, plus lock-held assertions.
- A re-close that KEEPS a person with a carried correction but changes their line (e.g. 500,000 -> 300,000 with -200,000 carried) still upserts as main always did; the panel then shows the +200,000 to carry back (not silent). Refusing that too would be a wider rule than the ruling; open question for the conductor.
- `payroll_summaries` (calculate-payroll's cache) is not cleaned for a dropped person - not a payment record; out of scope.
- Hand-entered payroll costs (`source_kind` NULL) and payroll costs with another key shape are left alone on purpose.
- M33 could become 'must be 0' once this is live; I did not change the check script.

## What I could not check

- The real PostgREST rpc path (named jsonb args, error codes PGRST202 / 23514 / HC147 / HC148 / HC149 as supabase-js reports them) - stand-in only.
- Two real connections contending for the advisory lock (N-1, N-4).
- The embedded `teachers(full_name), teaching_assistants(full_name)` read of payroll_adjustments on live PostgREST (typed by types.ts; tsc clean).
- Live Supabase editor paste of the migration (preflight conditions checked read-only on live: all pass).
- The toast in a browser (not run).
