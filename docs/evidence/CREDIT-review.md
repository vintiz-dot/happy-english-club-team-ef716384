# CREDIT review (independent): past unapplied cash onto bills, and delete-payment

Where I am / next step: done. Verdicts, findings and counts below; nothing deployed, nothing pushed.

Reviewed: branch `worktree-agent-ad03528fde8502451` @ 6918f0d0 (commits 06eff23c, 62a9030b, 6918f0d0 over 94aaf83d), checked out here as `review-credit`. Probes: `docs/evidence/CREDIT-review-probes.mjs` (`node docs/evidence/CREDIT-review-probes.mjs`).

## Verdicts

| piece | verdict |
|---|---|
| `scripts/CREDIT-past-unapplied-cash.sql` | **SHIP WITH CHANGES** - one refusal missing (F1). Everything else asked for holds in pglite with the real D4 1a + 1b installed. |
| `supabase/functions/delete-payment/index.ts` (keyKind) | **SHIP** - reverses exactly what the script wrote; every other path proved identical to origin/main by running both. |

## Findings (one line each)

- **F1 (script, must fix)** `scripts/CREDIT-past-unapplied-cash.sql:91-131` - the preflight treats a leftover as untouched unless a `payment-reversal-<id>-` key exists; it does not see a payment that **modify-payment** rewrote (`supabase/functions/modify-payment/index.ts:83-139` writes child payments with `parent_payment_id = <id>`, and `reversal-<id>-<ms>` / `modified-<id>-<ms>` keys). Such a payment is credited anyway: probe R7a - script returns 3 / 708000 / 0 and A's bill goes 400,000 -> 600,000, although modify-payment had already reversed the whole original amount and re-posted a corrected one (often exactly the fix for an overpayment). And delete-payment refuses a modified payment (R7b, 409), so the credit could not be taken back with it. Fix: in the preflight, for every leftover not yet credited, refuse when `EXISTS (SELECT 1 FROM payments c WHERE c.parent_payment_id::text = p.payment_id)` or a `reversal-<id>-%` / `modified-<id>-%` key exists. Tested patch (inserted before the `-- credit` section; with it the probes go 52/1 -> 53/0, R7a refuses with nothing changed, every other probe unchanged):

```sql
  IF EXISTS (SELECT 1 FROM _plc p WHERE NOT p.reversed AND NOT p.credited AND (
       EXISTS (SELECT 1 FROM public.payments c WHERE c.parent_payment_id::text = p.payment_id)
    OR EXISTS (SELECT 1 FROM public.ledger_entries e
                WHERE e.tx_key LIKE 'reversal-' || p.payment_id || '-%' OR e.tx_key LIKE 'modified-' || p.payment_id || '-%'))) THEN
    RAISE EXCEPTION 'a leftover''s payment was modified since. Nothing was changed.';
  END IF;
```

A case for it belongs in `past-leftover-credit.test.mjs` (expect 29 -> 30). Read-only check the owner can run on live first: `SELECT count(*) FROM public.payments c JOIN public.ledger_entries k ON k.tx_key LIKE 'smart-family-credit-' || c.parent_payment_id::text || '-%';` (expect 0).
- **F2 (script, note)** deploy order is load-bearing and cannot be checked from SQL. Probe R9a: with origin/main's delete-payment, deleting a credited payment reverses the old pair but not the reclass or the cash leg - child ends AR -400,000, CASH +200,000, CREDIT +200,000 (a debit balance on the liability) and the current bill keeps 600,000. The header (`:4-5`) and evidence section 10 already say "after delete-payment is live"; the owner must deploy delete-payment and confirm it before pasting.
- **F3 (script, note)** per account per child the ledger equals the new code (R1, builder's equivalence case); per MONTH it does not: x is credited to AR in the bill's month (`:180-184`), where the new code would credit it in the payment's month. This is the owner's choice (credit on the current bill) and nothing in the app reads AR by month for money (calculators read only settlement legs: `calculate-tuition/index.ts:192`, `calculate-tuition-bulk/index.ts:229`). R1h shows the split.
- **F4 (both, pre-existing, note)** delete-payment always lowers `paid_amount` by what it takes (`delete-payment/index.ts:239`); the script raises `paid_amount` only for `smart-family-credit-` rows (`:152`, as family-payment never touches it). A credited `family-credit-` leftover deleted later would lower `paid_amount` by x more than it was raised. Live has none (all 3 are smart-family), and `paid_amount` is the cumulative column nothing should read for money.
- **F5 (script, note)** the compare-and-set (`:157`) can never fail: the row is `FOR UPDATE` locked two statements earlier (`:144`) in the same transaction. Harmless belt-and-braces; the lock is what protects against a concurrent payment. Not probed (pglite is one connection).
- **F6 (script, note)** when a child has no current bill the credit lands on their latest bill, which may be the source month itself (R3c: August, 400,000 -> 650,000). That edits a past bill's label/carry by design; delete-payment then takes both amounts off that one bill correctly (R3d).

Everything else asked for, held:

| check | result | probe |
|---|---|---|
| all-or-nothing | every refusal leaves every row (bills, ledger, accounts, payments, floor tables) identical | R6a-j |
| preflight refuses the unexpected | 4th leftover; 4th leftover already reversed (still counted - the constant must be recounted); one payment with pairs on two children; CREDIT leg on another child; unkeyed leg CASH not CREDIT; unbalanced pair; third leg; child with only a later bill; payment row gone; `invoice_paid_label` missing | R6a-j (+ builder's 4) |
| refusal messages | no id, no name | R6 (10) |
| compare-and-set on recorded_payment | present (`:150-161`), see F5 | inspection |
| label | `invoice_paid_label` on the read figures; partial on an unpaid bill; an admin's `credit` kept | R4a-b |
| frozen bill | base 400,000 / discount 50,000 / total 350,000 kept, `confirmation_status` confirmed kept, 358,000 recorded, paid | R1d |
| D4 1a floor + 1b register (REAL 20261114090000 + 20261114091000 installed over live-shaped invoices) | credit: nothing refused, floor records nothing, no register event; delete after: refuses nothing, floor records both lowerings (Feb 400,000, current 600,000) | R1a-c, R2c |
| idempotent | second run: same row, not one row changed (floor tables included); after a delete: no re-credit | R1f, R2e |
| ledger = new smart-family-payment, per account per child | A: AR -600,000 / CASH 600,000 / CREDIT 0 either way (builder's case, re-run); every child CREDIT 0; ledger balances | builder suite, R1g |
| no names in output | the result row is three numbers; NOTICE is counts | R10b, inspection |
| no historical row edited or deleted | old ledger rows, payments and source-month bills byte-identical | R10a |
| two-child payment (legit: allocations to two siblings, leftover on one) | credited on the one; delete after: both children 0 on every account, both bills restored | R5a-b |
| delete after credit | 200; every account 0, per account AND per month; Feb 0, current back to 400,000, carry-out 0, paid_amount restored | R2a-d |
| delete after credit, bill holds less | 409, nothing changed; holds enough: takes only the credit; a later 70,000 kept | R3a, R3b, R3e |
| delete before credit | skipped by the script (builder's case) | builder suite |
| delete-payment, every other path | origin/main's file and this branch's, bundled with the same `_lib` (identical to origin/main) and run on identical databases: a NEW smart-family payment with an extra, an old payment with its pair, an old allocation-only payment, a `payment-<id>` single payment, an already-reversed one (409), a modified one (409) - same status, same response, same bills and ledger | R8a-f |
| delete-payment diff | exactly the 7 added lines in `keyKind` (`git diff origin/main..6918f0d0`); both new branches match only on exact equality with keys no earlier prefix matches (`own()` uses `startsWith('<prefix>-<id>')`; none of the prefixes starts with `past-`) | inspection |

## Counts

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` (once, on review-credit @ 6918f0d0) | **6994 assertions across 78 suites, 2 suites failed, both the known ones**: `d4 lesson pay` 142/1 ("a time change that makes a started lesson not started" - run at 00:4x Hanoi, the clock-edge flake); `ai spend gate (F-02)` 249/1, its only failure `reception-feed` in the opt-out list (fixed on the conductor branch). Same totals as the builder's section 11. Of note: past leftover credit 29/0, invoice status 317/0, d4 floors 213/0, d4 register 140/0, edge functions typecheck 5/0, app typecheck 3/0, mirrors 19/0 |
| `node scripts/pgtest/past-leftover-credit.test.mjs` (alone) | 29 passed, 0 failed |
| edge-function typecheck (`edge-functions.test.mjs`, inside run.mjs) | 5 passed, 0 failed |
| `node docs/evidence/CREDIT-review-probes.mjs` (script as built) | **52 passed, 1 failed** - the failure is R7a = F1 |
| `CREDIT_SCRIPT=<script + F1 patch> node docs/evidence/CREDIT-review-probes.mjs` | **53 passed, 0 failed** |

(Two earlier probe runs had failures that were mine, not the code's: R8a compared ledger keys holding a per-run payment id and `Date.now()`, R9a expected the wrong residue, R1c counted the register's own `guard_installed` row. Fixed in the probe; the figures quoted above are from the final run.)

## Could not check

- Live: the three rows themselves, and whether any of the three payments has been modified (F1's count query is for the owner).
- Concurrency between two real connections (pglite is single-connection); the lock argument is by inspection.
- The SQL editor's own transaction handling of a two-statement paste (the DO block alone is atomic either way; the trailing SELECT is read-only).
- The deployed delete-payment (nothing deployed); F2 depends on it.
