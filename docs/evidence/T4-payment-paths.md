# T4 - payment paths agree with the one label rule

**Where I am / next step:** faults verified and the design written (below). Next: the failing tests (section "Tests"), run against the unchanged code, then the fixes one fault at a time.

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

(next)
