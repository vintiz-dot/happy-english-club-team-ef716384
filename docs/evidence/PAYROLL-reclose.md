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

## Tests - `scripts/pgtest/payroll-reclose.test.mjs` (registered as "payroll re-close"): 90 passed, 0 failed

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

## Gates

See the hand-back for the numbers of this run. Known on main and unchanged by this branch: `invoice status` (32 failed) and `stars sync core` (crashes) - the harness-lag failures the brief names; `money-write-paths` is not registered on main and crashes there on a missing `scripts/CREDIT-past-unapplied-cash.sql` after 6 unrelated failures (none mention close-payroll-month after this change).

## Files to apply / deploy (LF md5, CR stripped)

1. Paste `supabase/migrations/20261117153000_payroll_reclose_reconcile.sql` - `fe129dba87374a15951d15b7d6944318`.
2. Then deploy `close-payroll-month`: `supabase/functions/close-payroll-month/index.ts` `8208c0197fbb7cee0a055cc8605f9ec4`, `supabase/functions/_lib/auth.ts` `92b44db93cd2614a2fb3011e3a9063ba` (unchanged).
3. Push the screen (Cloudflare): `src/lib/payrollDrift.ts`, `src/components/admin/payroll/PayrollMonthLock.tsx`, `src/components/admin/tabs/PayrollTab.tsx`. Works with either function version (the removed list is optional).

Order matters for 1 -> 2: the new function refuses to close (503, nothing written) until the migration is in. The old function keeps working after the migration (nothing it uses changed). Rollback: redeploy the previous close-payroll-month, then `DROP FUNCTION public.close_payroll_month_apply(text, jsonb, jsonb, uuid, text);`.

## What a reviewer should attack

- The removal set is "not in this close's lines", i.e. calculate-payroll's `totalAmountActual > 0` set. A person in the result at 0 who had a line is removed (they are owed nothing). If calculate-payroll ever answered short without failing, a re-close would remove a real line. Today every staff read in it throws (FOLLOWUP 268e0700), and the edge function refuses a month with nobody earning.
- A FIRST close also removes this month's keyed payroll costs of people not earning (e.g. a Payroll-tab booking for someone whose lessons were then cancelled). Same overpay, same rule; live October 2026 (open) has 6 such bookings - their people will be checked against calculate-payroll when October is closed. Payroll-tab bookings of people who do earn are overwritten exactly as before (tested byte-for-byte).
- Concurrency with the Payroll tab's "Add to Expenditures": it does not lock the period row, so an insert committed between this transaction's DELETE and its COMMIT can leave a stale cost (window: one transaction, was five HTTP round trips). Two closes at once are serialised by FOR UPDATE (not exercisable in single-connection pglite; reasoned, not tested).
- `payroll_summaries` (calculate-payroll's cache) is not cleaned for a dropped person - not a payment record; out of scope.
- Hand-entered payroll costs (`source_kind` NULL) and payroll costs with another key shape are left alone on purpose.
- M33 could become 'must be 0' once this is live; I did not change the check script.

## What I could not check

- The real PostgREST rpc path (named jsonb args, error codes PGRST202 / 23514 / HC147 / HC148 as supabase-js reports them) - stand-in only.
- Live Supabase editor paste of the migration (preflight conditions checked read-only on live: all pass).
- The toast in a browser (not run).
