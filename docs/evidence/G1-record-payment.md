# G1 - one admin record-payment function (D5 gap G-1)

Branch `pc2/record-payment`, from `origin/claude/d5-money-audit` f3ee41db. MONEY: YES.
Build and test only: nothing deployed, no live database touched.

**Where I am / next step:** design fixed (below). Next: build `supabase/functions/record-payment`.

## The gap

RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog, RecordedPaymentManager
(through `src/lib/recordedPaymentWrite.ts`) and `ai_action_apply` put money on
`invoices.recorded_payment` with no `payments` row and no ledger legs
(D5-audit G-1; M03 counts it on live: 495 bills / 761.7M VND - history, NOT
touched or backfilled here).

## Design

- `record-payment`: admin only (`requireRole(["admin"])`, no service role).
  One child, one invoice month the screen confirmed, `kind` payment (adds) or
  correction (takes off; note required, never below 0), amount > 0, method as
  the screen labels it (the CASH/BANK leg is chosen case-insensitively:
  'Cash' / 'cash' -> CASH, anything else -> BANK, as family-payment now does),
  receipt date, note, `idempotencyKey`, optional `expectedRecorded` (the value
  the screen showed; RecordedPaymentManager's edits are made against it).
- Order: read the bill (create it through calculate-tuition if there is none;
  refuse before writing anything if it still is not there) -> `payments` row
  (id = idempotencyKey) -> both ledger legs in ONE insert, keyed
  `record-payment-<payment_id>-<student_id>` (payment: DR CASH/BANK, CR AR;
  correction: DR AR, CR CASH/BANK) -> compare-and-set on `recorded_payment`
  (re-read and retry once, `addToRecordedPayment`), label by
  `labelAfterPayment` (an admin's 'credit' kept).
- Never half-done: if the bill write fails after the payment and legs, the
  legs are reversed by NEW legs (`payment-reversal-<payment_id>-<leg_id>`: the
  ledger is append-only under G-11, nothing is deleted from it) and the
  payments row is deleted; the answer says so. If that undo itself fails the
  answer names the payment so it can be deleted with delete-payment.
- Double click: the payments row's id is the screen's key; a second request
  with it is refused (409) before anything is written. A key that already has
  ledger entries (an earlier attempt that was undone) is refused too.
- Locked / closed months: not refused (the family paths do not refuse them).
  Frozen bills: not refused (a freeze locks charges, not payments).
