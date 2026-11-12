# T4 - payment paths agree with the one label rule

**Where I am / next step:** round 2 complete (section "Round 2" at the end supersedes the deploy steps above it).

Build and test only: nothing pushed, nothing deployed, no database touched. Branch `worktree-agent-aafcbedf13a50d197`, reset to `claude/hec-conductor-setup-efbaa5` @ 6465f08.

## 1. The faults, verified in the code before any change (file:line at 6465f08)

| # | fault | where | confirmed |
|---|---|---|---|
| 1 | delete-payment never lowers `recorded_payment` | `supabase/functions/delete-payment/index.ts:135-143` updates `paid_amount` and `status` only | yes |
| 1a | ...and for every family payment it finds nothing to undo on the bill | `:91-95` looks for `tx_key LIKE 'payment-<id>%'`; family-payment writes `family-payment-<id>-...` (`family-payment/index.ts:236`), smart-family-payment `smart-family-<id>-...` (`smart-family-payment/index.ts:244`) | yes |
| 1b | ...and even where the key matches, only the keyed leg is found | every payment path puts `tx_key` on the CASH/BANK leg only; the AR leg has no key (`family-payment:233-254`, `smart-family-payment:241-262`). `:117-120` then filters the found legs for `code === 'AR'` -> 0, and `:153-163` reverses the CASH leg alone: an unbalanced reversal | yes |
| 2a | settle-bill's balance from cumulative `paid_amount` | `settle-bill/index.ts:85-88`: `(total_amount - paid_amount) + carry_in_debt - carry_in_credit` | yes |
| 2b | a write-off never reaches the bill | `:182-196` writes `paid_amount += settled` and a label; `total_amount`, `recorded_payment` and so the trigger-kept carry (`20261009120000:41-81`, computed from those two columns only) never move | yes |
| 3 | browser writers of `invoices.status` restate the rule | `RecordPaymentDialog.tsx:93-100` (writes `:113`, `:126`; cache `:163-164`), `QuickPayPanel.tsx:128-131` (`:143`, `:155`; cache `:200-201`), `BatchPaymentDialog.tsx:99-102` (`:114`, `:126`; cache `:172-173`), `PaymentIntegrityRepair.tsx:134-152`, `InvoiceStatusManager.tsx:70-77`. `RecordedPaymentManager.tsx:107-113`, `:163-169` change `recorded_payment` and leave the label as it was (it prints it, `:328`). No other `src/` writer of `invoices` touches money or labels (`BillFreezePanel.tsx:56` writes the freeze columns only) | yes |
| 4 | PaymentIntegrityRepair / InvoiceStatusManager disagree with the rule | `PaymentIntegrityRepair.tsx:46-70`, `:134-152` (cumulative `paid_amount`, `draft` at 0); `InvoiceStatusManager.tsx:151-156` offers draft / issued / partial / paid, which the next calculation replaces; it does not offer `credit` at all | yes |
| 5 | covered/overpaid with money reads `partial`; covered by credit reads `issued` | `_lib/invoice-status.ts:82-88` (`due > 0` required for paid) | yes |
| 6 | family-payment `owed` ignores carry-in | `family-payment/index.ts:134`, `:169`, `:262`: `total_amount - recorded_payment` | yes |
| 6a | ...and manual mode posts more to the ledger than reaches the bill | `:113-128` allocates the typed amount; `:262-263` applies at most `owed` to the bill | yes (found here) |
| 7 | `referral_bonuses` read errors swallowed | `calculate-tuition-bulk/index.ts:209-217` (`catch {}`); the single function does the same silently: `calculate-tuition/index.ts:167-168` never looks at `referralBonusesRes.error` or `discountAssignmentsRes.error` | yes |

## 2. Design (written before the code)

The month's own money is the truth: `total_amount` (what the month charges) and `recorded_payment` (what was paid in it). The carry columns are computed from those two by the trigger. `paid_amount` is cumulative and is not used to judge any month.

### Fault 5 - the rule (decided first: every other fix uses it)

```
payable = total_amount + carry_in_debt - carry_in_credit        (unchanged)
paid     when recorded_payment >= payable, and the month charged something
         (base_amount or total_amount > 0) or money was recorded in it
partial  when recorded_payment > 0 otherwise
issued   otherwise
```

i.e. "nothing left to pay" is `paid`, except a month that neither charged nor received anything (no lessons, nothing paid), which stays `issued`.

| case | before | after |
|---|---|---|
| covered or overpaid, money recorded (payable <= 0, recorded > 0) | partial | **paid** |
| credit carried in covers the month, nothing recorded | issued | **paid** |
| charge written off in full (Settle Bill, below), nothing recorded | issued | **paid** |
| a month with lessons fully discounted (base > 0, total 0) | issued | **paid** |
| no lessons, nothing recorded | issued | issued |
| everything with payable > 0 | as before | as before |

No new status value. Every writer moves together:
- edge functions: `_lib/invoice-status.ts` (`paidLabel(recorded, payable, charged)`);
- browser: `src/lib/invoiceStatus.ts`, a registered mirror of that file (`mirrors.test.mjs`);
- `ai_action_apply` / `ai_action_undo`: migration `20261113090000_invoice_paid_label.sql` adds `public.invoice_paid_label(...)` and swaps ONLY the two label `CASE` expressions inside whichever version of those functions is installed (it edits the live definition, so it cannot roll back an unrelated fix applied to them from another branch). It refuses (raises, changes nothing) if it finds neither the old expression nor its own. Idempotent. Updates no row.
- The cancellation guard reads `status IN ('paid','partial')`: both settled, so `partial -> paid` changes nothing; `issued -> paid` for a credit-covered month makes the guard MORE cautious there.
- `ai_action_apply`'s insert of a bill that does not exist yet keeps writing `partial` (an unpriced row; the next calculation prices and labels it).

### Fault 2 - Settle Bill (the smallest correct design)

A write-off is a reduction of what a month charges. The bill's balance is computed by the trigger from `total_amount` and `recorded_payment` only, and `recorded_payment` is money received - so a write-off can only reach the balance as a lower `total_amount`. calculate-tuition re-prices `total_amount` on every call, so it must know about the write-off, or the next page view undoes it.

- **Balance** (2a): settle-bill first runs calculate-tuition for the month (as confirm-tuition does), then reads that month's bill: balance = `carry_out_debt - carry_out_credit`. That is exactly the figure the Settle Bill dialog shows (`StudentTuitionTab.tsx:550-557`). It refuses (409) when the bill could not be saved (family discount still being decided) and 404 when there is no bill.
- **A discount write-off counts on the bill** (2b): calculate-tuition and calculate-tuition-bulk read `settlements` of type `discount` for the student and month and apply their sum as one more discount line, "Settle Bill write-off", after every other discount. `total_amount` falls, the trigger moves the carry, the label follows (fault 5 makes a full write-off `paid`). The bill gets the ordinary `tuition_adjustment` review flag; a confirmed bill goes to review with the before/after flag (T1 rule 4), which is right: its charge changed.
- **Cap**: one month's write-off cannot exceed that month's charge (`total_amount` before write-offs), so `total_amount` never goes below 0. settle-bill caps `amount` at `min(balance, charge - already written off)`. Debt carried in from an earlier month is written off on that earlier month.
- **Frozen bill**: its charged figures are pinned (`keep_frozen_invoice_amounts`), so a write-off could not count; settle-bill refuses it with a message instead of posting a write-off that would never show.
- **Old settlements**: only settlements created from `SETTLEMENTS_ON_BILL_FROM` (2026-11-12T00:00Z - changed from the planned 14 Nov during coding: the test clock reads 12 Nov UTC, and any date after the last live settlement (7 Oct) serves; in `_lib/invoice-status.ts`, one constant for both calculators) count. The four made so far (last 7 Oct 2026) had their balance worked out from cumulative `paid_amount`; letting them change four old bills on their next view is the owner's decision, not a side effect of a deploy. `scripts/CHECK-payment-paths.sql` lists them by count.
- **Voluntary contribution / unapplied cash**: balance from the carry as above (no more phantom credit from cumulative `paid_amount`); still ledger-only. A contribution does not consume the bill's credit - owner decision (it needs a charge line on the bill).
- A read error on `settlements` fails the calculation (fail closed), like every other pricing read after fault 7.

### Fault 1 - delete-payment

- Find the payment's ledger transactions by its id in any key the payment paths write (`payment-<id>`, `family-payment-<id>-`, `smart-family-<id>-`, and their `-credit-` / `-contribution-` leftovers), then read BOTH legs of each transaction by `tx_id`.
- What the payment put on a bill: per student and month, the AR credits of its allocation transactions (leftover transactions are not on any bill). That amount comes off `recorded_payment` (and `paid_amount`); the label is the rule's; then calculate-tuition runs for that month, as every payment path does.
- (Changed while coding, from "capped at what the bill still records": if a bill records LESS than the payment put there it was edited since, and taking even the smaller amount could remove another payment's money. delete-payment now refuses (409) before writing anything; the admin corrects the bill in Recorded Payment Manager. Same for a payment with no ledger entries, or one already reversed.)
- Every leg of every transaction is reversed (balanced), in one insert, BEFORE the bills are lowered: a retry after a part failure finds the reversal and refuses, so a bill is never lowered twice.
- A payment that was modified (has children in `payments.parent_payment_id`) or that a modification created is refused with a message: modify-payment writes no invoice, so which bill holds that money cannot be known from the ledger.

### Fault 3 / 4 - browser writers

- The preferred design (dialogs stop writing `status`, the server decides) does not hold here: after a dialog saves, the screen refreshes through calculate-tuition-bulk, which writes nothing, so the stored label would stay stale until someone opens that child's own tuition page; and running calculate-tuition per row from QuickPay/Batch would hit its 30-a-minute limit. So the dialogs keep writing it, through the SAME rule: `src/lib/invoiceStatus.ts` (mirror). Their optimistic cache patch uses it too.
- RecordedPaymentManager now writes the rule's label with the payment it changes (it was leaving a stale one, which it prints).
- `credit` set by an admin is kept by every writer (`labelAfterPayment` returns nothing for it), including the payment functions that used to overwrite it (T1 review 2, R2-m4).
- PaymentIntegrityRepair judges and repairs by the rule (mirror), skips `credit`.
- InvoiceStatusManager offers what can stick: "Credit (kept)" and "Follow the payments" (the rule). Hand-setting draft / issued / partial / paid is removed with a line saying why.

### Fault 6 - family-payment

`owed = max(0, payable - recorded)` with the bill's carry-in, in all three places; a bill with nothing owed is not selected (no zero allocation rows); manual mode puts the whole allocation on the student's bill (any excess becomes credit through the carry) instead of posting more to the ledger than reaches the bill. Found while coding and also fixed: a remainder with no `leftoverHandling` was dropped silently (the payment row kept the full amount, the ledger and bills got less), and an allocation for a child with no bill was posted to the ledger only. Both are now refused (400) before anything is written; so is a contribution without consent (it used to be refused only after the allocations were written).

### Fault 7

Both calculators fail on a `referral_bonuses` or `discount_assignments` read error (the single function also had both unchecked).

## Tests

All in `scripts/pgtest/invoice-status.test.mjs` (real handlers, `invoices` in PostgreSQL with the real carry, audit, freeze and CHECK migrations), sections "T4 fault 1/2/3-4/5/6/7" and the check-SQL case; the SQL label in `ai-actions.test.mjs`. Against the functions at 6465f08: **195 passed, 44 failed** - every T4 case listed in `docs/evidence/T4-before.txt` failed except invariants ("the other payment's ledger is untouched", "an old write-off does not reprice", "no lessons stays issued", bulk already failing on discount_assignments).

Round-2 assertions turned round on purpose (each says "T4" in its name): credit-covered month issued -> paid; zero-charge month with money partial -> paid; settle-bill in full "bill unchanged, issued" -> charge 0, paid; settle-bill refusing a family with history -> accepted; delete-payment on a bill holding less than the ledger says -> refused; family-payment of money nobody owes -> refused instead of 200 with the money dropped; the old dialog-regex checks replaced by the mirror checks; the old SQL CASE grid now compared only where something is owed. Golden file untouched (`git diff 6465f08 -- scripts/pgtest/fixtures` empty) and passing.

## Results

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **3557 assertions across 41 suites, 0 failed** (invoice status 247, AI admin actions 76, mirrors 16, edge functions typecheck 5, app typecheck 3, family payment month 6) |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npx bun test` over the 11 `scripts/*.test.ts` | 155 pass, 0 fail |

## Faults - outcome

| # | outcome |
|---|---|
| 1 | fixed: both legs reversed; payment taken off `recorded_payment`; refusals for modified / unledgered / already-reversed / bill-holds-less |
| 2 | fixed: balance = refreshed bill's carry-out; discount write-off is a discount line in both calculators (from 2026-11-12); capped at the month's charge; frozen refused. Contributions still ledger-only (owner) |
| 3 | fixed: dialogs + RecordedPaymentManager write `labelForPayment` / `labelAfterPayment` from the mirror; credit kept |
| 4 | fixed: Repair uses the rule and skips credit; Status Manager offers credit / follow only |
| 5 | rule changed (nothing left to pay = paid); every reader moved together incl. ai_action_apply/undo via 20261113090000 |
| 6 | fixed (owed with carry); plus remainder/no-bill/consent refused before writes |
| 7 | fixed in both calculators (single also checked discount_assignments) |

## To deploy (not done here)

Migration `20261113090000_invoice_paid_label.sql` (paste; idempotent; stops with an error and changes nothing if the live functions hold neither expression). Functions, each with `_lib/invoice-status.ts`: calculate-tuition, calculate-tuition-bulk, smart-family-payment, family-payment, settle-bill, delete-payment (confirm-tuition imports the lib too - redeploy it so all copies match). One publish for the browser (dialogs, RecordedPaymentManager, PaymentIntegrityRepair, InvoiceStatusManager, `src/lib/invoiceStatus.ts`). Functions first: settle-bill's write-off counts only once BOTH calculators are new.

## Owner decisions

1. The 4 settlements made before 2026-11-12 (2 discount, 2 contribution) stay ledger-only; count them in on their bills? (CHECK query 2b.)
2. Voluntary contribution: should it consume the bill's credit (a charge line)? Today it is revenue in the ledger while the family keeps the credit.
3. Fault 5 relabels on the next write: CHECK query 4 counts them (review 2 saw 11 + 4).
4. Not fixed: payment functions still read-then-write `recorded_payment` (R2-m6); delete-payment has the same window.

**Where I am / next step:** round 1 complete; review in `T4-review.md` (PASS WITH CHANGES).

---

# Round 2 (after `T4-review.md` and the conductor's ruling)

| item | done | where |
|---|---|---|
| 1. T4-M1 refusals hidden as "non-2xx" | `src/lib/functionError.ts` reads the function's body; used by all five callers of the changed functions (LedgerBalanceInspector, SettleBillModal, FamilyPaymentModal, SmartFamilyPaymentModal, BatchFamilyPaymentModal - the last three swallowed it too). Settle Bill now says the amount actually settled and when the bill could not be refreshed (m6) | `scripts/functionError.test.ts` |
| 2. T4-M2 date cutoff | Removed. A write-off counts only when its ledger transaction is keyed `settlement-writeoff-`, which only the new settle-bill writes (the old one wrote `settlement-discount-`). So no old-function write-off can count whenever it is made, and the 4 old settlements stay ledger-only (owner default). One filter, in `settledWriteOff`; the calculators read settlements and their legs unfiltered, and fail on a read error | cases "OLD settle-bill ... made on 7 Oct / made TODAY" (both calculators), "the same row with the T4 key counts", legs unreadable |
| 3. R2-m6 lost payments | Compare-and-set everywhere `recorded_payment` is written: `_lib/recorded-payment-write.ts` mirrored as `src/lib/recordedPaymentWrite.ts` (registered). Dialogs (Record / QuickPay / Batch) and Recorded Payment Manager: `setRecordedPayment` writes only if the bill still holds what the screen showed, else nothing is written, the admin is told and the list reloads; a bill created meanwhile (placeholder path) is the same conflict, no longer an upsert overwrite. QuickPay / Batch patch the cache only for rows really saved. smart-family-payment, family-payment, delete-payment: `addToRecordedPayment` re-reads and retries once, then fails loudly; smart-family-payment now checks its bill errors | "T4 r2 - two payments on one bill at the same moment": dialogs A/B (bill exists, and no bill yet), two smart payments, two family payments, delete while a payment lands, settle-bill while a payment lands (writes no recorded_payment, payment kept). 9 failed before the callers used it |
| 4. surviving mutations | d2 delete with a leftover (4 legs reversed, only the allocation off the bill); d4 retry after success with other money on the bill (refused as already reversed; the stand-in now has the UNIQUE `tx_key`); h4 gone (single filter) and asserted; plus m2 refused (allocation naming no bill) | "T4 r2 - the mutations the review left alive" |
| 5. `bun test scripts` hangs | Cause: it also collects `scripts/pgtest/*.test.mjs`, node scripts for `run.mjs`. Under bun, run one by one with a 40 s limit: four exit 2 at once (they need migration arguments) and four do not finish in time - `app-typecheck` runs the full tsc (minutes), `audit-clips`, `stars-sync`, `stars-sync-homework`. Fix: `node scripts/run-bun-tests.mjs` (`npm run test:bun`) runs every `scripts/*.test.ts` in one bun call, listing them from the folder; AGENTS.md says so | - |
| 6. installed source | `docs/sql/ai_action_apply_undo.installed.sql` (generated from the patched functions); ai-actions suite asserts the installed definitions equal it, and that no later migration re-creates either without `invoice_paid_label`. AGENTS.md line. The patch also keeps an admin's `credit` now (m1) | ai-actions T4 cases |

Not done (minors left as reviewed): m3 delete-payment not one transaction; m5 `payment_deletions` error; m7 double write-off; m8 charge later below the write-off; m10 smart-family-payment drops a sibling whose calculation failed; m11 pro-rata rounding. The `ai_action_apply` insert of a missing bill still writes `partial`.

## Suites (final)

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **3584 assertions across 41 suites, 0 failed** (invoice status 268, AI admin actions 79, mirrors 19) |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `node scripts/run-bun-tests.mjs` | 159 pass, 0 fail (12 files) |

Golden file untouched.

## Deploy steps (supersede the ones above)

1. **Pre-check, read-only:** `scripts/CHECK-payment-paths.sql` - query 2b `counts_on_bill_after_t4` must be 0 (it can only become non-zero after the new settle-bill is live); the review's section-2 query: the label pattern matches 1 in `ai_action_apply` and 1 in `ai_action_undo`.
2. **Migration** `20261113090000_invoice_paid_label.sql` (paste once). Expect two "now uses the rule" notices; check both functions are still SECURITY DEFINER, `search_path=public`, ACL authenticated + service_role. If it stops with "expected exactly one label expression", nothing changed: compare the live function with `docs/sql/ai_action_apply_undo.installed.sql`.
3. **Functions, one sitting, in this order**, each uploaded with `_lib/invoice-status.ts` AND `_lib/recorded-payment-write.ts` where it imports it: calculate-tuition, calculate-tuition-bulk, settle-bill, delete-payment (+ recorded-payment-write), smart-family-payment (+ recorded-payment-write), family-payment (+ recorded-payment-write), confirm-tuition. The calculators before settle-bill.
4. **Publish** the browser (functionError, recordedPaymentWrite, invoiceStatus, the dialogs, Recorded Payment Manager, Repair, Status Manager, the four family/settle/ledger screens).
5. Tell the owner: labels change as bills are next written (review section 1: 461, no downgrade from the rule; three child-months newly count as settled for the cancellation guard); the four old settlements do not show on their bills; an admin saving a payment on a bill another admin changed since the screen loaded now sees "This bill changed since the screen was loaded ..." and re-enters it.

**Where I am / next step:** round 2 complete.
