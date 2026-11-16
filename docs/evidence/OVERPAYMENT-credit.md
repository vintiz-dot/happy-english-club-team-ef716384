# OVERPAYMENT: leftover family payment becomes credit on the next bill

Owner's decision (MONEY: YES): money a family pays beyond what the chosen bills owe shows as CREDIT on the family's next bill, instead of being recorded only in the ledger as "unapplied cash" that never appears on any bill.

**Where I am / next step:** BUILT AND TESTED, all checks green. Nothing deployed, pushed or applied; no database touched; no migration. Next (conductor): deploy `family-payment` and `smart-family-payment` (section 6), push, and add the AGENTS.md text in section 7.

Branch `worktree-agent-ad03528fde8502451`, fast-forwarded to `claude/hec-conductor-setup-efbaa5` @ 4cd6151e before the first commit.

## 1. What it does now

The leftover is FOLDED into one child's allocation, exactly as a Manual split amount above what is owed already was (T4 fault 6): the same allocation row, the same ledger transaction, the same compare-and-set on the bill. Nothing new was invented.

| | before (D-23) | now |
|---|---|---|
| which child | family-payment: first selected student; smart-family-payment: the sibling listed first (highest debt) | the same child |
| `payment_allocations` | allocation only (the leftover had no row) | that child's row includes the extra |
| ledger | allocation DR CASH/BANK / CR AR, plus a separate DR AR / CR CREDIT pair keyed `family-credit-` / `smart-family-credit-` | ONE pair, DR CASH/BANK / CR AR for allocation + extra, keyed `family-payment-<payment>-<child>-` / `smart-family-<payment>-<child>-`; memo says "including X beyond what the bills owe, kept on the bill as credit". No CREDIT or REVENUE leg. |
| the bill (payment month) | `recorded_payment` += allocation | += allocation + extra, through `addToRecordedPayment` (compare-and-set, re-read and retry once); label from `labelAfterPayment` (the `paidLabel` rule); smart also adds to `paid_amount`, as before |
| carry | unchanged; no screen showed it | the trigger makes the extra `carry_out_credit`; the next month's bill opens with it as `carry_in_credit` and its payable is lower by it |
| response | `leftoverAmount`, `leftoverHandling: 'unapplied_cash'` / `leftover: { type: 'unapplied_cash' }` | family-payment: `leftoverAmount`, `leftoverHandling: 'credit_next_bill'`, `creditOnBill: { studentId, month, amount }`; smart: `leftover: { type: 'credit_next_bill', amount, studentId, studentName, month }`, each allocation's `creditOnBill` |
| delete-payment | reversed the leftover pair, took only the allocation off the bill | unchanged file: the extra is in the allocation's AR credit, so the whole amount comes off the bill and the credit with it (tested) |

### The wire value

`leftoverHandling` is now `'credit_next_bill'` (both functions: `z.enum(['credit_next_bill', 'unapplied_cash']).optional()`). Decided before the first write, every refusal is 400 with nothing written:

- `'voluntary_contribution'`: refused as before (D-23), message now says the extra goes on a bill as credit.
- `'unapplied_cash'` **with** a leftover: refused - a screen opened before this change told the admin "not put on any bill", which is no longer what happens ("...now shows as credit on the next bill... reload the page, check where the extra goes, and post the payment again"). **Without** a leftover it is accepted, so an old Batch tab paying a debt exactly still works.
- no `leftoverHandling` with a leftover: family-payment refused as before; **smart-family-payment now refuses too** (before, it silently made unapplied cash). The screens send the value only when they showed the "extra" line, so an extra the screen did not show (balances moved since it loaded) is refused, not placed.

### The no-bill case (decision)

- **family-payment, the first selected student has no bill for the month: REFUSED** before anything is written: "The X beyond what the bills owe goes on the first selected student's <month> bill as credit, but they have no bill for <month>. Nothing was recorded: open their tuition for <month> first, or put a student who has one first." Why: a bill is priced only by calculate-tuition; this function has no tuition figures, and making a zero bill to hold the money would invent a charge the calculator then rewrites. Opening the child's tuition (calculate-tuition saves the bill) is the existing way to make one. Same rule the function already applied to an allocation with no bill.
- **smart-family-payment**: it calls calculate-tuition for every sibling first, and calculate-tuition saves the bill; when it returned figures without saving (family discount unresolved), the function's existing branch creates the bill from calculate-tuition's own figures (`base_amount`, `discount_amount`, `total_amount`) and the extra goes on it. That is "the path calculate-tuition uses"; no price comes from anywhere else. New guard: if any active sibling's balance could not be worked out (the calculation failed), a payment WITH an extra is refused - that sibling may owe part of it. (Without an extra the old behaviour stands: the others are paid.) With no balances at all the payment is refused.

### Other guards added (fail closed)

- Both functions: an allocation whose ledger accounts are missing, or whose ledger insert fails, now throws BEFORE the bill is written ("Payment recorded, but ... was not posted to the ledger or their <month> bill"). Before, the insert's error was never checked, so a bill could record money the ledger did not. (This replaces the D-23 check that guarded the leftover pair, which no longer exists.) The payment row and allocation row are already inserted at that point, as before for any later failure; the message says so.
- smart-family-payment: the audit row `family_payment_initiated` is now written after the plan is checked (straight before the payment row), so a refusal leaves nothing behind.

Not changed: compare-and-set (`_lib/recorded-payment-write.ts`), payment-month confirmation (`useTuitionMonthConfirmation`, the month in both functions), frozen bills (recorded payment is not a frozen figure; the trigger keeps the charged ones), D4 1a/1b, `_lib/*`, calculate-tuition(-bulk), delete-payment, migrations, the golden file. `git diff --stat 4cd6151e -- scripts/pgtest/fixtures supabase/functions/_lib supabase/functions/delete-payment supabase/functions/calculate-tuition supabase/migrations src/lib` is empty. Service role: both functions already used it for every write after the admin check; nothing new uses it.

## 2. Screens

| file | change |
|---|---|
| `src/components/admin/SmartFamilyPaymentModal.tsx` (mounted) | leftover alert: "The extra X will show as credit on <child>'s next bill." and "It is recorded on <child>'s <month> bill (the child listed first), and their next bill starts with it as credit." Sends `credit_next_bill` only when it shows a leftover. Success toast adds "; X will show as credit on <child>'s next bill" from the function's answer. |
| `src/components/admin/FamilyPaymentModal.tsx` (not mounted, changed as asked) | same sentence naming the first selected student, plus "They need a <month> bill: open their tuition for that month first if they have none." The leftover preview in Manual split mode is now amount minus the typed split (what the function computes), not amount minus the balance. |
| `src/components/admin/BatchFamilyPaymentModal.tsx` | per family, when the amount typed is above the family's debt: "The extra X will show as credit on <first child>'s next bill." (siblings sorted by debt, as the function sorts them). Sends `credit_next_bill` only then (it always sent `unapplied_cash` before). |

Not opened in a browser (see section 8).

## 3. Past unapplied-cash rows

Not touched: no payment, ledger row or invoice written before this change is read, rewritten or deleted (tested: an old `smart-family-credit-` pair is byte-identical after a new overpayment, and no ledger write other than an insert happens). delete-payment still recognises `family-credit-` / `smart-family-credit-` keys, so a payment made before this change is still deleted whole.

**How many exist on live is unknown to me** (no live access in this task). The owner can count them, read-only:

```sql
SELECT split_part(tx_key, '-credit-', 1) AS path, count(*) AS rows, sum(debit) AS amount
FROM ledger_entries
WHERE tx_key LIKE 'family-credit-%' OR tx_key LIKE 'smart-family-credit-%'
GROUP BY 1;
```

Each such row is a DR AR leg; its CR CREDIT partner has no key and shares the `tx_id`. Note what they are: the cash for that leftover was never debited to CASH/BANK (only the allocation was), and nothing on any bill shows it - so each is money the family paid that no bill and no cash account shows.

What the owner could do later (a separate decision, not done here): for each row, put the amount on that child's bill for the row's month in Recorded Payment Manager (it then carries as credit, like a new overpayment), and post a new, dated correction that reverses the DR AR / CR CREDIT pair and posts DR CASH/BANK / CR AR - forward entries only, never an edit of the old rows. Or leave them, as the conductor's D-23 record already describes them. Either way it needs the count first.

## 4. Tests

`scripts/pgtest/invoice-status.test.mjs` (real family-payment, smart-family-payment, delete-payment and calculate-tuition handlers over the real carry / audit / freeze migrations):

- D-23 section: the voluntary refusals kept as they were; its two "unapplied cash" cases and the "leftover with no ledger account" case replaced by the new section.
- New section "OVERPAYMENT", 24 assertions (274 - 4 replaced + 24 = 294): Family Payment 500,000 against 400,000 owed - 500,000 recorded, `carry_out_credit` 100,000, nothing owed, label `paid` and equal to `invoicePaidLabel` (the helper), response names child and month, ONE ledger transaction DR cash/bank 500,000 / CR AR 500,000, no CREDIT / REVENUE / `*-credit-` leg, one allocation of 500,000; November seeded at 400,000 opens with 100,000 `carry_in_credit` and `monthPayable` 300,000; bill, ledger pair and allocation identical to a Manual split of 500,000; the same for Smart Family Payment; nothing owed - all 150,000 is credit; **a concurrent payment on the same bill** (a 100,000 payment landing between read and write) - 600,000 recorded, 200,000 credit, neither lost, for both functions; refusals with nothing written: stale `unapplied_cash` (both), no handling (both), first selected student with no bill (no bill made), a sibling whose calculation failed, ledger accounts missing (bill unchanged); the old value with no extra still pays; an old unapplied-cash pair untouched.
- T4 r2 "d2" (delete a payment with a leftover) now asserts the new shape: all 500,000 and the credit come off the bill, both legs reversed, balanced (was: 400,000 off, four legs).
- The golden comparison runs as before; `fixtures/tuition-figures.golden.json` not regenerated, not changed.

`scripts/pgtest/removed-money-features.test.mjs`: the screen and enum assertions now check the credit wording on all three screens, `z.enum(['credit_next_bill', 'unapplied_cash'])`, the stale refusal before the first write, and that neither function posts a `*-credit-` key or a CREDIT leg. `run.mjs` expect 35 -> 37.

### Results

| command | result |
|---|---|
| `node scripts/pgtest/invoice-status.test.mjs <4 migrations>` | 294 passed, 0 failed (274 before) |
| `node scripts/pgtest/removed-money-features.test.mjs` | 37 passed, 0 failed |
| `node scripts/pgtest/edge-functions.test.mjs` | 5 passed (106 function files loaded and type-checked) |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npm run test:bun` | 190 pass, 0 fail, 808 expect() calls, 16 files |
| `node scripts/pgtest/run.mjs` | **6295 assertions across 65 suites, 0 suite(s) failed**, exit 0. Invoice status 294 (golden compared, golden file unchanged), removed money features 37, family payment month 6, shared-module mirrors 19, edge functions typecheck 5, app typecheck 3 |

## 5. Deploy order

Functions and push in one sitting. Either order is safe - every mismatch is a 400 with nothing written:
- new screens + old functions: the old zod enum rejects `credit_next_bill` (raw zod message) when there is an extra; no extra, nothing sent, works.
- old screens + new functions: an extra sent as `unapplied_cash` is refused with the readable "reload" sentence; no extra, works.
Functions first is better (the refusal an admin may see is the readable one).

## 6. Functions to redeploy

Imports are `../_lib/<name>.ts`; none of these `_lib` files imports another file, so each list is the full closure. The `_lib` files are unchanged by this branch. `verify_jwt = true` for both in `supabase/config.toml`; keep it. No migration, secret or config change.

| function | entrypoint | `_lib` files to upload with it |
|---|---|---|
| family-payment | `supabase/functions/family-payment/index.ts` | `_lib/rate-limit.ts`, `_lib/invoice-status.ts`, `_lib/recorded-payment-write.ts` |
| smart-family-payment | `supabase/functions/smart-family-payment/index.ts` | `_lib/rate-limit.ts`, `_lib/invoice-status.ts`, `_lib/recorded-payment-write.ts` |

Probes after deploy (counts only): unauthenticated POST to each is 401; the `SELECT` in section 3 returns the same count as before the deploy and never grows (no new `*-credit-` keys); `sum(recorded_payment)` unchanged by the deploy itself; edge logs 10 minutes after: no 5xx, no boot error. First real overpayment: the bill's `carry_out_credit` equals the extra, and the next month's bill opens with it.

Rollback: redeploy both from 4cd6151e (`git show 4cd6151e:supabase/functions/<name>/index.ts`) and revert the screen commit. An overpayment made in between stays on its bill as credit (correct under the owner's rule); delete-payment removes it whole if needed.

## 7. Proposed AGENTS.md text (conductor edits)

In "# Payment month", replace the D-23 paragraph about unapplied cash (if added) with:

> - Money a family pays beyond what the chosen bills owe goes ON A BILL as credit (owner, OVERPAYMENT): `family-payment` (first selected student) and `smart-family-payment` (the sibling listed first, highest debt) fold it into that child's allocation for the payment month, exactly as a Manual split amount above what is owed: one allocation row, one DR CASH/BANK / CR AR pair, one compare-and-set on `recorded_payment`; the carry makes it credit on the child's next bill. The wire value is `leftoverHandling: 'credit_next_bill'`, sent only when the screen showed "The extra X will show as credit on <child>'s next bill"; an extra with no value, or with the old `'unapplied_cash'`, is refused with a 400 before anything is written, and `'voluntary_contribution'` stays refused. No bill for that child in the month: family-payment refuses (bills are made and priced only by calculate-tuition). Nothing posts `family-credit-` / `smart-family-credit-` pairs any more; the past ones stay as they are.

## 8. Not verified

- No call through deployed functions (nothing deployed); the live count of past unapplied-cash rows.
- The screens were not opened in a browser; checked by the app type check, the source assertions and the bun suites only.
- Pro-rata mode with an extra is covered by the same code path (fold into the first selected student) but has no dedicated test case; oldest-first and manual are tested.
- A family of two in Smart Family Payment receiving the extra on the second-named but highest-debt child is not tested directly (the fixture has one priced child); the order is the existing `siblingBalances` sort, unchanged.
