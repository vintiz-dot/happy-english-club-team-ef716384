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
| delete-payment (section 10) | `supabase/functions/delete-payment/index.ts` | `_lib/invoice-status.ts`, `_lib/recorded-payment-write.ts` |

All three before `scripts/CREDIT-past-unapplied-cash.sql` is pasted. Both payment functions also carry S2's F-11 admin check (merged from 21c8c82a).

Probes after deploy (counts only): unauthenticated POST to each is 401; the `SELECT` in section 3 returns the same count as before the deploy and never grows (no new `*-credit-` keys); `sum(recorded_payment)` unchanged by the deploy itself; edge logs 10 minutes after: no 5xx, no boot error. First real overpayment: the bill's `carry_out_credit` equals the extra, and the next month's bill opens with it.

Rollback: redeploy both from 4cd6151e (`git show 4cd6151e:supabase/functions/<name>/index.ts`) and revert the screen commit. An overpayment made in between stays on its bill as credit (correct under the owner's rule); delete-payment removes it whole if needed.

## 7. Proposed AGENTS.md text (conductor edits)

In "# Payment month", replace the D-23 paragraph about unapplied cash (if added) with:

> - Money a family pays beyond what the chosen bills owe goes ON A BILL as credit (owner, OVERPAYMENT): `family-payment` (first selected student) and `smart-family-payment` (the sibling listed first, highest debt) fold it into that child's allocation for the payment month, exactly as a Manual split amount above what is owed: one allocation row, one DR CASH/BANK / CR AR pair, one compare-and-set on `recorded_payment`; the carry makes it credit on the child's next bill. The wire value is `leftoverHandling: 'credit_next_bill'`, sent only when the screen showed "The extra X will show as credit on <child>'s next bill"; an extra with no value, or with the old `'unapplied_cash'`, is refused with a 400 before anything is written, and `'voluntary_contribution'` stays refused. No bill for that child in the month: family-payment refuses (bills are made and priced only by calculate-tuition). Nothing posts `family-credit-` / `smart-family-credit-` pairs any more; the past ones stay as they are.

## 9. Review fix round (review: `docs/evidence/OVERPAYMENT-review.md`, SHIP WITH CHANGES)

Merged `review-overpay` (6d2a8cd6), then the conductor branch twice (the editor work; then S2 @ 21c8c82a, which edits the admin check of both payment functions - F-11, role rows without `.single()`). Both merges were clean; both functions carry F-11 and every change below.

| finding | change | proof |
|---|---|---|
| N1 pro-rata rounding taken for an overpayment | family-payment, pro-rata: after the shares, the rounding remainder goes to a bill that still owes (in order, up to what each owes), so only `amount - totalOwed` can be left over | invoice-status "OVERPAYMENT review fixes": 1,000,000 over three children owing 400,000 each, no instruction - 200, all 1,000,000 on bills (333,334 / 333,333 / 333,333), no credit, `leftoverAmount` 0, `creditOnBill` null, no "beyond what" memo, payment = allocations; the same from an old tab (`unapplied_cash`) - pays; 1,200,000 exact - 200, each 400,000 paid, nothing left over; 1,300,000 - exactly 100,000 credit on the first child. Reviewer's P5a-c flipped to assert the fix and green |
| N5 (pre-existing) `method === 'cash'` | family-payment compares `method.toLowerCase() === 'cash'`, as smart-family-payment already did; the Batch screen goes through smart-family-payment. Past rows debited to BANK stay as they are (a cash Family Payment made before the deploy sits on BANK; read-only count, not run: `SELECT count(*), sum(e.debit) FROM ledger_entries e JOIN ledger_accounts a ON a.id = e.account_id JOIN payments p ON e.tx_key LIKE 'family-payment-' || p.id::text || '-%' WHERE a.code = 'BANK' AND p.method ILIKE 'cash';`) | 10 assertions: both functions x `Cash` / `cash` / `CASH` -> CASH, `Bank Transfer` / `Card` -> BANK; reviewer's P9 flipped and green |
| N3 old-style delete test lost | the reviewer's P6 is back in the suite: an OLD payment (400,000 allocation + 100,000 `smart-family-credit-` / `family-credit-` pair) deleted - 400,000 off the bill, all four legs reversed including the CREDIT leg, balanced | 2 assertions |
| N2 Manual-split wording | family-payment: `creditOnBill.amount` is now only the part of the money not split out that lands above what the first selected student's bill owed (null when none); the ledger memo says "including X not split out (Y of it beyond what the bill owes, kept as credit)" or "(all of it towards what the bill owes)". FamilyPaymentModal (not mounted) says the same in Manual mode: "The X not split out goes on <child>'s bill: Y of it is more than they owe and will show as credit on their next bill." / "it pays what they still owe; none of it becomes credit." Money unchanged | 0 / 450,000 of 900,000: Child One 450,000 recorded, 50,000 credit; response `leftoverAmount` 450,000, `creditOnBill` 50,000; memo checked; 200,000 not split out against 400,000 owed - no credit, `creditOnBill` null. Reviewer's P3m-wording flipped and green |
| N4 Smart / Batch name the child from balances read at load | not changed (note only). If a payment lands between loading and posting, the function may credit a different child or amount than the screen named; the money is still on a family bill, Smart's toast reports what was done, Batch reports nothing. A later fix could send the expected child and refuse a mismatch |
| N6 (pre-existing) smart's no-bill insert ignores `siblingUnresolved` | not changed (note only). The interim figures it saves are corrected by the next calculate-tuition save, which keeps `recorded_payment`; an extra can now reach this branch for a child who owes nothing |
| N7 (pre-existing) payment / allocation inserts unchecked, not one transaction | not changed (note only). A failure on the second child leaves the first child's part recorded (the message says so); the extra is on the first child written |

## 10. Crediting the past leftovers (owner: "Yes, credit them")

Live, read-only by the conductor: 3 payments through smart-family-payment, 708,000 VND, 3 children, months 2026-02..2026-08, none reversed; each a `smart-family-credit-<payment>-<ms>` DR AR / CR CREDIT pair with no cash leg.

**Script:** `scripts/CREDIT-past-unapplied-cash.sql`. Paste ONCE in the SQL editor, AFTER family-payment, smart-family-payment AND delete-payment from this branch are live (delete-payment must know the script's keys before anyone can delete one of these payments).

**Expected result row:** `leftovers_credited 3 | total_vnd 708000 | still_to_credit 0` (the same on any later run). A NOTICE says how many were credited by that run.

What it does, in one DO block (all or nothing), for each leftover not reversed and not yet credited:

| step | what |
|---|---|
| bill | the child's bill for the CURRENT month (Hanoi); if none, their latest earlier bill. Rule chosen because the credit must appear on the next bill the family sees: the current bill's carry-out feeds the next one directly; for a child with no current bill (left, or not billed yet this month) the latest bill is where their chain ends, and the next bill made for them opens with the credit. A frozen bill is used like any other: recording money on a frozen bill is allowed today, and the freeze trigger keeps base/discount/total (tested). No bill at all: the whole script refuses. |
| money | `recorded_payment = value read + amount`, `WHERE recorded_payment = value read` (compare-and-set; the row is also locked), label `public.invoice_paid_label(new, total + carry_in_debt - carry_in_credit, base, total)`, an admin's `credit` label kept; `paid_amount` + amount for smart-family rows (as smart-family-payment does). The carry trigger makes the part above the payable credit on the next bill. |
| ledger (new rows, dated now) | reclass in the old pair's month: DR CREDIT x / CR AR x, key `past-leftover-credit-<payment>-reclass`; cash leg on the bill's month: DR CASH or BANK x / CR AR x, key `past-leftover-credit-<payment>` (the marker). CASH when the payment's method is 'cash' in any case, else BANK (smart-family-payment's rule). The old pair is never edited or deleted. |

Why these legs: the new code posts DR CASH|BANK (a + x) / CR AR (a + x) and nothing on CREDIT. The old code posted DR CASH|BANK a / CR AR a plus DR AR x / CR CREDIT x. Difference: CASH|BANK +x, CREDIT +x (debit), AR -2x (credit) = the two transactions above. Proven per child: after the script each child's AR / CASH|BANK / CREDIT nets equal what the real new smart-family-payment leaves for the same money (AR -600,000, CASH 600,000, CREDIT 0 in the test), and the current month closes with the same carry-out credit; the whole ledger still balances.

Safe again: a leftover whose marker exists is skipped (second run: not one row changes). Preflight (refuses, nothing changed): `invoice_paid_label` installed; exactly 3 leftovers totalling 708,000 counted over all such rows (constants at the top; change only after counting again); every leftover a two-leg pair - keyed DR AR, unkeyed CR CREDIT of the same amount on the same child; one per payment; the payment row present for each still to credit; a bill for each child.

**delete-payment changed** (so it must be redeployed): `keyKind` knows `past-leftover-credit-<id>` (allocation: it put money on the bill of its month) and `past-leftover-credit-<id>-reclass` (ledger-only). Deleting one of the three payments after the credit reverses all 8 legs in 4 transactions, takes 400,000-style allocation off the source bill AND the credited amount off the bill the script used; every account nets to 0, the ledger balances, the script run again does nothing. Without the change (tested by running the old file) the delete left the correction standing and the credit on the bill.

D4: the invoice floor (`zz_invoice_state_floor`, 1a) records only lowerings; this raises `recorded_payment`, so nothing is recorded. Not installed in the test (read from the trigger); the freeze, carry, audit and confirmation migrations are.

Tests: `scripts/pgtest/past-leftover-credit.test.mjs` (registered, expect 29): pglite with live's ledger/payment tables, the real carry/freeze/audit/confirmation migrations and `invoice_paid_label`; the real smart-family-payment and delete-payment over a PostgREST stand-in on the same database. Fixture shaped like live (3 children, 200,000 + 258,000 + 250,000 = 708,000; one current bill paid, one current bill FROZEN, one child with no current bill). Before/after per child (ledger nets, bills, carry, next bill), old rows byte-identical, 12 new legs, idempotency, equivalence with the new code, delete-after-credit, delete-before-credit (skipped: 2 / 450,000), four refusals with not one row changed.

The owner must know: run it once after the deploy, check the result row reads 3 / 708000 / 0; the three families each get the amount as credit on their next bill; their bills for the old months do not change; the ledger's cash/bank accounts rise by 708,000 in total in this month (that money was received back then but never posted to them).

## 8. Not verified

- No call through deployed functions (nothing deployed); the live count of past unapplied-cash rows.
- The screens were not opened in a browser; checked by the app type check, the source assertions and the bun suites only.
- Pro-rata mode with an extra is covered by the same code path (fold into the first selected student) but has no dedicated test case; oldest-first and manual are tested.
- A family of two in Smart Family Payment receiving the extra on the second-named but highest-debt child is not tested directly (the fixture has one priced child); the order is the existing `siblingBalances` sort, unchanged.
