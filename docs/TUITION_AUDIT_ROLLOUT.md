# Tuition audit (Oct 2025 - May 2026): review and rollout

The audit report of 16 Nov 2026 (kept outside the repo; it names children)
compared the fee spreadsheet with the app. This file records what was checked
against the live database and the code on 21 Nov 2026, and the plan for
closing the gap. No children are named here.

## 1. Review of the report

### Verified (read-only queries on live, 21 Nov 2026)
- Per-month `sum(recorded_payment)` and `sum(total_amount)` for all eight
  months match the report to the đồng (549,685,501 recorded; 546,021,300 billed).
- 14 `payments` rows and 217 `ledger_entries` before the report date. 19
  frozen bills in the period.
- Since row logging began (10 Oct 2026) only two `recorded_payment` changes
  touch an Oct-May bill: +1,680,000 on a March bill (28 Oct) and +1,050,000 on
  a May bill (26 Oct). So the Oct/Dec/Jan "App" figures in the sheet were read
  before 10 Oct 2026, or from somewhere other than these bills.
- The fee spreadsheet (`Tution fee 2025-2026.xlsx`, read 21 Nov) agrees with
  the report. Every month's "Real" (the sum of the family rows) and the
  Summaries sheet's Real, App and Difference figures match it; the totals are
  535,511,500 / 531,869,101 / +3,642,399. The App figures are typed in by hand
  (T3 holds "88.398.600" as text), not linked to the app. Summaries' Total
  Difference is `=SUM(D2:D10)`, a circular reference to its own cell; the value
  is right, the formula is not.
- The arithmetic holds: the six patterns sum to -14,174,001. Pattern A totals
  8,287,000 over 6 family-months, and pattern B totals 21,094,504.
- The calculator's reply did label the running total `recorded_payment`
  (now line ~728, not 752).

### Wrong or stale in the report
1. **Section 4 headings E and F use first-draft figures.** E says -1.18M where
   the table says -588,400. F says -4.38M where the table says -1,858,000. The
   table includes the 16 Nov confirmations; the headings do not.
2. **"payments ... almost all from Oct 2025" is wrong for payments.** The 14
   payment rows run from Feb to Aug 2026. It is the ledger that is mostly Oct
   2025 (151 of 217).
3. **"Nearly all of the 14.17M falls into six patterns."** Pattern F is the
   remainder, so the six patterns are all of it by construction. About 14.9M
   gross (F) is still unexplained.
4. **Several root causes were fixed after 16 Nov.** The report did not know:
   - Payments are now real rows. Since 17 Nov (`20261117121000`,
     `record-payment` v1 deployed 17 Nov), QuickPay, Batch, Record Payment and
     the Recorded Payment manager all go through `record_admin_payment`. It
     writes the payment row (receipt date, method), both ledger legs and the
     bill in one transaction.
   - Lost updates (5b.2): compare-and-set since 13 Nov.
   - `delete-payment` (5b.3): it now takes the payment off `recorded_payment`.
   - Family leftovers (5b.4): voluntary contributions were removed (D-23). A
     leftover now goes on a bill as credit, with explicit consent.
5. **Recommendation 8 ("default the month from the receipt date") would make
   pattern D worse.** A February debt paid in March has a March receipt date.
   Defaulting to it books the cash on March, which is exactly pattern D. The
   month a payment is FOR must be chosen separately. The app already forces an
   explicit month confirmation (`useTuitionMonthConfirmation`). What is missing
   is a suggestion of the oldest month that still owes (phase 1).
6. **The old path was still in use the day the report was written.** On 16 Nov,
   8 bills (7 for Oct 2026, 1 for Nov 2026) gained 9,175,500 of
   `recorded_payment` with 12 ledger legs and no `payments` rows. These months
   are outside the audit, but the payments are just as untraceable.

### Open questions for the owner
- The 21.1M of pattern B and the 14.9M gross of pattern F can only be settled
  from the bank statement and cash book. The app cannot tell a real payment
  from a click before 17 Nov.
- The five pattern-A children (8.29M paid, no student in the app): are they
  app children under other names?
- The three tentative matches in report §7.

## 2. Rollout

The phases are ordered so that new discrepancies stop first, then the old
ones are corrected. Each phase ships on its own.

### Phase 0 - stop new ones at the screen (this change)
- QuickPay pre-ticks nothing and pre-fills nothing. A child is recorded only
  once the cash is typed. "Select all" is gone.
- Batch payment loses "Pay Full All" and the per-row "Full" button.
- Both screens read amounts as staff type them (`1.600.000`, `1,600,000`) and
  warn when a figure is not a round thousand. They say "exact balance" when it
  equals the balance to the đồng, which is the fingerprint of pattern B
  (`src/lib/cashEntry.ts`, `cash-entry.test.mjs`).
- The calculator's reply `invoice.recorded_payment` is now this month's figure,
  not the running total. Checked in `invoice-status.test.mjs` against the
  saved bill. **Redeploy calculate-tuition.**

### Phase 1 - make the database refuse a paid figure with no receipt
- A trigger on `invoices`: `recorded_payment` may change only inside a
  sanctioned writer. The writer sets a transaction-local flag (`record_admin_payment`,
  `delete-payment`'s reversal, `ai_action_apply/undo`, `settle-bill`). Anything
  else is refused with a message that points to Record Payment.
- Before the trigger, `family-payment` and `smart-family-payment` must stop
  writing the payment row and the bill in separate PostgREST calls. Move them
  onto `record_admin_payment`, one call per child bill, under one family
  idempotency key.
- The payment screens suggest the oldest month that still owes as the target,
  still confirmed by hand (fixes pattern D at the source).
- Tests: a direct PostgREST update of `recorded_payment` is refused. Every
  sanctioned path still passes `invoice-status.test.mjs` and `ai-actions.test.mjs`.

### Phase 2 - reconciliation register (owner works the B and F lists)
- A new table `tuition_reconciliation_items`: one row per family-month
  discrepancy, holding the audit's sheet amount, app recorded amount, pattern
  and evidence. A loader reads the audit's `data/categories.tsv` (those files
  are not on this machine; the owner must supply them).
- An admin screen lists the items. For each one the owner records a decision:
  - **sheet missed it**: the app is right; record the receipt as a back-dated
    payment row, amount unchanged.
  - **never paid**: a correction through `record_admin_payment` (negative,
    memo "audit: not received"), which reopens the debt.
  - **wrong month**: a correction on one month and a payment on the other.
  - **rounding**: accepted, no change.
- Every decision is a payment or correction row, so the ledger and
  `recorded_payment` follow from it. Nothing edits a bill directly.

### Phase 3 - rebuild Oct 2025 - May 2026 as payment rows
- For every bill whose `recorded_payment` has no payment rows behind it, write
  one "opening balance" payment row (method `historical`, memo with the audit
  date, the month as the receipt date). This involves no ledger change and
  changes no money. After this phase every recorded đồng has a row, and phase-2
  corrections net against it.
- Dry run by default, then `--apply`. The script refuses a bill that already
  has payment rows summing to something else.

### Phase 4 - data hygiene
- Bills for the pattern-A children, or a decision that they are outside the app.
- Merge the duplicate students, and link "Cat" and the nine newer children to
  their families. This is needed for the sibling discount and family statements.
- Clean up the 1- and 2-đồng leftovers on the 100%-discount account.

Built (21 Nov 2026, not applied; the findings with names are in the owner's
private folder, not here):
- `public.admin_merge_students(keep, drop, dry_run default true)`
  (`20261121120000`). It moves every row of every `student_id` column and
  every foreign key to students, read from the catalog at run time. Register
  rows and enrolments are copied, because their guards refuse a change of
  child. Of two same-month bills only an empty one gives way; if both hold
  money the merge refuses. The ledger is append-only, so a clashing account
  with entries stays on the dropped record. The dropped child is deactivated
  with a note, and one audit row is written. The dry run performs every write
  and rolls it back. It runs in the SQL editor only (owner lane).
  `merge-students.test.mjs`.
- Family links: the admin UI already sets them (student drawer and family
  members, through the checked `family_link` path). Nothing new was needed.
- `scripts/audit-leftover-dong.mjs`: dry run by default; `--write` produces a
  dry-run SQL (ROLLBACK) and an apply SQL. Each correction goes through
  `record_admin_payment` (memo `audit: edit leftover`) with compare-and-set and
  a fixed key per bill. `leftover-dong.test.mjs` runs it against the real
  function. Live has 4 bills holding 4 đồng in all.
- Pattern A: a checklist for the owner. Nothing in the app guesses.

### Process (owner, from now on)
- Record each payment on the day it arrives, with the cash amount and the month
  it pays for.
- Stop treating the spreadsheet as the record. Reconcile the app against the
  bank statement monthly; the payment rows now make that possible.
