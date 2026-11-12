# T1 - invoice status reset on recalculation

**Where I am / next step:** Part 1 facts a-d written. Next: reproduction test (e) in `scripts/pgtest/invoice-status.test.mjs`, run it against the UNCHANGED function, record the output here.

Branch `worktree-agent-ab1ade20b08d798c9`, reset to `claude/hec-conductor-setup-efbaa5` @ 736264c. Decision D-14 (docs/MASTER_PLAN.md:316), item (9).

---

## Part 1 - the facts (read from the code, before any change)

### a. The values

| column | type | values | default | where |
|---|---|---|---|---|
| `invoices.status` | enum `invoice_status`, NOT NULL | `draft`, `issued`, `paid`, `partial`, `credit` | `draft` | `supabase/migrations/20251012022746_...sql:2` and `:41`; `src/integrations/supabase/types.ts:6661`, `:6806` |
| `invoices.confirmation_status` | TEXT, nullable, CHECK | `auto_approved`, `needs_review`, `confirmed`, `adjusted` | `needs_review` | `supabase/migrations/20251117061416_...sql:10-11` (the only definition; no later migration alters it); `types.ts:1985` (`string | null`) |
| companions | | `review_flags JSONB DEFAULT '[]'`, `confirmation_notes`, `confirmed_at`, `confirmed_by` | | `20251117061416:12-15` |

The column comment (`20251117061416:20-24`) is the only written design: auto_approved = simple case, no review; needs_review = has discounts or anomalies; confirmed = admin reviewed and confirmed; adjusted = admin made adjustments.

### b. The writers

`confirmation_status`:

| writer | what it writes | where |
|---|---|---|
| calculate-tuition | `auto_approved` / `needs_review`, on EVERY call that saves, by upsert on (student_id, month) | `supabase/functions/calculate-tuition/index.ts:576`, `:590`, `:605-607` |
| confirm-tuition (admin only) | `confirmed` / `adjusted` + `confirmed_at`, `confirmed_by`, `confirmation_notes`; it calls calculate-tuition FIRST, then updates | `supabase/functions/confirm-tuition/index.ts:44-50`, `:53-62` |
| column default | `needs_review` on rows inserted by anything else (payment dialogs, smart-family-payment, ai_action_apply) | `20251117061416:10` |
| nothing else | no browser code, no trigger, no RPC writes it (grep of `src/`, `supabase/functions`, `supabase/migrations`) | |

`status`:

| writer | rule it uses | where |
|---|---|---|
| calculate-tuition | always `issued`, both the full and the fallback upsert | `calculate-tuition/index.ts:593`, `:626` |
| family-payment | `recorded_payment >= total_amount ? paid : partial`; then invokes calculate-tuition | `family-payment/index.ts:259-264`, `:269-275` |
| smart-family-payment | cumulative `paid_amount >= total_amount ? paid : partial`; new row `applied >= total` | `smart-family-payment/index.ts:274-281`, `:286-295` |
| settle-bill | `total_amount <= paid_amount + settled ? paid : partial` | `settle-bill/index.ts:182-189` |
| delete-payment | `paid_amount` 0 -> `draft`; `>= total` -> `paid`; else `partial` | `delete-payment/index.ts:122-143` |
| RecordPaymentDialog / QuickPayPanel / BatchPaymentDialog (browser) | `recorded >= payable && payable > 0 ? paid : recorded > 0 ? partial : issued`, where payable includes carry-in | `src/components/admin/RecordPaymentDialog.tsx:89-97`, `:102-124`; `QuickPayPanel.tsx:127-150`; `BatchPaymentDialog.tsx:98-121` |
| InvoiceStatusManager (browser, admin override with a reason) | any value | `src/components/admin/InvoiceStatusManager.tsx:70-77` |
| PaymentIntegrityRepair (browser) | from `paid_amount`: 0 -> `draft`, owed <= 0 -> `paid`, else `partial` | `src/components/admin/PaymentIntegrityRepair.tsx:134-152` |
| ai_action_apply / ai_action_undo (SQL) | `v_total >= payable AND payable > 0 -> paid; > 0 -> partial; else issued` (payable includes carry-in); new row `partial` | `supabase/migrations/20261107090000_ai_assisted_admin_actions.sql:559-576`, `:726-731` |
| RecordedPaymentManager (browser) | changes `recorded_payment` only, leaves status | `src/components/admin/RecordedPaymentManager.tsx:107-113`, `:163-169` |

So "paid / partial" has at least FOUR different rules (monthly recorded vs total; cumulative paid vs total; recorded vs total-plus-carry; paid_amount with `draft` at zero). There is no single payment rule to reuse.

Triggers on `invoices` (all of them):

| trigger | does | touches the two columns? |
|---|---|---|
| `update_invoices_updated_at` BEFORE UPDATE | sets `updated_at` | no (`20251012022746:98-101`) |
| `invoices_carry_sync` AFTER INSERT/UPDATE/DELETE | rewrites the four `carry_*` columns from the rows | no (`20261009120000:35-83`, `:113-141`) |
| `keep_frozen_invoice_amounts` BEFORE UPDATE | on a frozen row keeps `tuition_frozen`, `frozen_reason`, `base_amount`, `discount_amount`, `total_amount`, `class_breakdown` | NO - it does not keep `status` or `confirmation_status` (`20261106120000:4-22`) |
| `audit_invoices` AFTER INSERT/UPDATE/DELETE | one `audit_log` row per change with `changed_fields`, `diff.old`, `diff.new`, `actor_user_id = auth.uid()` (NULL for the service role); skips trigger-made writes and updates touching only `updated_at`/`updated_by` | reads only (`20261009130000:60-139`, `:148-166`) |

**Answer to "does something put the values back?": no.** No trigger derives `status` from payments, none preserves `confirmation_status`, and no function restores either after calculate-tuition has run. `calculate-tuition-bulk` does not write invoices at all (it only reads `confirmation_status`, `status` at `calculate-tuition-bulk/index.ts:222` and reports them at `:392-393`).

### c. The readers that branch on them

| reader | branches on | where |
|---|---|---|
| TuitionReviewQueue | `needs_review` / `confirmed` / `auto_approved` lists; `review_flags` grouping | `src/components/admin/TuitionReviewQueue.tsx:35`, `:63-73`, `:82`, `:104` |
| StudentTuitionReviewCard | badge; Confirm button only when `needs_review`; one badge per `review_flags[].label` | `src/components/admin/StudentTuitionReviewCard.tsx:129`, `:142`, `:167-171` |
| AdminTuitionList / AdminTuitionListEnhanced | confirmation filter; needs_review counter | `AdminTuitionList.tsx:211`, `:263-265`; `AdminTuitionListEnhanced.tsx:153`, `:178` |
| GenerateTuition | counts `needs_review` | `src/components/admin/GenerateTuition.tsx:70-72` |
| useLiveTuitionData (admin live list) | `status: invoiceStatus`, `confirmation_status: confirmationStatus || "needs_review"` from the bulk function | `src/hooks/useLiveTuitionData.ts:150-151` |
| TuitionStudentCard | `review_flags` | `src/components/admin/tuition/TuitionStudentCard.tsx:196-199` |
| RecordedPaymentManager, CancelOverridesReview | show `status` | `RecordedPaymentManager.tsx:328`; `session-guard/CancelOverridesReview.tsx:285` |
| PaymentIntegrityRepair | flags `status` that disagrees with `paid_amount` | `PaymentIntegrityRepair.tsx:46-70` |
| student-audit | reports both | `supabase/functions/student-audit/index.ts:128`, `:433-434` |
| Session cancellation guard | a bill is "settled" when `recorded_payment > 0` OR `status IN (paid, partial)` OR `confirmation_status IN (confirmed, adjusted)` OR `tuition_frozen` | `supabase/migrations/20261112091000_session_cancel_guard.sql:307-319`, `:611`; `20261112090000_session_held_evidence.sql:622`; `supabase/functions/_lib/session-guard.ts:228-262`; `src/lib/sessionGuard.ts:493-529` |
| chat assistant `get_invoices` | reads invoices; reports `recorded_payment` and carry, not these two columns | `supabase/functions/chat/index.ts:793-850` |

### d. The life of a bill, as the code has it

1. A bill row first appears when calculate-tuition saves it (`issued`, `auto_approved` when the total equals the class-rate total, otherwise `needs_review` with one `tuition_adjustment` flag - `calculate-tuition/index.ts:558-576`), or when a payment is recorded before any calculation (payment dialogs, smart-family-payment, ai_action_apply insert a row with `paid`/`partial` and the default `needs_review`).
2. An admin confirms in the review queue: confirm-tuition recalculates first (so cancellations are in), refuses while the family discount is unresolved, then writes `confirmed` (or `adjusted`) with who and when, plus a named `confirm_tuition` audit entry (`confirm-tuition/index.ts:39-79`).
3. Payments set `paid` / `partial` by the rules in (b). What a family owes is NOT read from `status`: it is `recorded_payment` (paid in that month) and the trigger-kept `carry_*` balances (AGENTS.md "Money"; `20261009120000`). `status` is a label; `paid_amount` is cumulative and not a balance.
4. What should happen to a confirmed bill whose figures later change (attendance edit, cancellation, discount) is written nowhere. The code's actual behaviour is the defect: it is silently set back to `auto_approved` / `needs_review` on the next calculation whether or not anything changed, and the fact that it was confirmed survives only in `confirmed_at` / `confirmed_by`, which no screen reads.
5. A frozen bill (`tuition_frozen`) keeps base / discount / total / class breakdown through the trigger and the function reports the saved figures (`calculate-tuition/index.ts:378-385`) - but its `status` and `confirmation_status` are overwritten like any other bill's.

### e. Reproduction - THE DEFECT REPRODUCES

`scripts/pgtest/invoice-status.test.mjs` drives the real calculate-tuition, calculate-tuition-bulk and confirm-tuition handlers; `invoices` is a real PostgreSQL table (pglite) carrying the real migrations 20251117061416 (CHECK), 20261009120000 (carry trigger), 20261009130000 (audit trigger), 20261106120000 (freeze trigger). Run against the UNCHANGED function (working copy identical to 736264c, `git diff --stat 736264c -- supabase/functions/calculate-tuition/index.ts` empty):

```
node scripts/pgtest/invoice-status.test.mjs <the four migrations>      => 66 passed, 29 failed
```

Real output, nothing changed between the confirm / payment and the recalculation:

```
auto_approved bill: confirm-tuition -> 200, the bill is confirmed by the admin            PASS
  after recalculation => {"status":"issued","confirmation_status":"auto_approved","total_amount":400000,"recorded_payment":0,"confirmed_at":"set","flags":[]}
  FAIL recalculated with nothing changed: STILL confirmed
needs_review bill (10% discount), confirmed, after recalculation
  => {"status":"issued","confirmation_status":"needs_review","total_amount":360000,"recorded_payment":0,"confirmed_at":"set","flags":["tuition_adjustment"]}
adjusted, after recalculation => {"status":"issued","confirmation_status":"needs_review",...}            FAIL adjusted stays adjusted
paid, after recalculation    => {"status":"issued","confirmation_status":"auto_approved","total_amount":400000,"recorded_payment":400000,...}   FAIL STILL paid
partial, after recalculation => {"status":"issued",...,"recorded_payment":150000,...}                    FAIL STILL partial
frozen (confirmed, paid), after recalculation => {"status":"issued","confirmation_status":"needs_review","total_amount":810000,"recorded_payment":810000,...}
cancellation guard predicate after two recalculations of a confirmed, unpaid bill
  => {"paid_in":false,"by_status":false,"by_confirmation":false,"frozen":false}
```

So: `confirmed` and `adjusted` are lost on the next call (the row keeps `confirmed_at` / `confirmed_by`, which is how victims can be found), `paid` and `partial` become `issued`, a frozen bill keeps its figures but loses both labels, and an admin-set `credit` becomes `issued`. Money columns are NOT damaged by this: `recorded_payment`, the totals and the carry balances are the same before and after.

**A second defect found by the same suite (worse, rarer).** The current bill is read at `calculate-tuition/index.ts:139-144` and the error is never looked at. If that one read fails (timeout, connection), the function carries on with "no bill", and saves `recorded_payment: 0`:

```
invoice read fails => 200 {...}
writes: [{"mode":"upsert","payload":{...,"paid_amount":0,"recorded_payment":0,...,"carry_out_debt":400000,"confirmation_status":"auto_approved",...,"status":"issued"}}]
```

That erases the month's recorded payment on a bill that was paid 400,000. Fixed below by failing the call (fail closed); listed for the owner because past damage of this kind would look like a payment that vanished.

---

## Part 2 - the rule (written before the code)

**Where I am / next step:** rule written; next: `_lib/invoice-status.ts` + the call in calculate-tuition, then the suite.

calculate-tuition keeps deciding every FIGURE exactly as before. What changes is only which of three label columns it writes when a bill row already exists: `status`, `confirmation_status`, `review_flags`.

1. **No bill yet** (first calculation): unchanged. `status: issued`, `confirmation_status: auto_approved | needs_review`, `review_flags` as computed.
2. **`status` on an existing bill is not this function's to change.** It is left out of the save, so whatever a payment function, the settle flow or an admin stored (`paid`, `partial`, `credit`, `issued`) stands. One exception, kept from today: a `draft` (or empty) status still becomes `issued`, because calculating a bill is what issues it. No status is derived from payments here: the payment paths use four different rules (facts, b), so there is no single rule to reuse, and writing a fifth would be a second calculation.
3. **`confirmed` / `adjusted`, figures unchanged** (base, discount and total all equal to the stored ones): `confirmation_status` is left out of the save. Confirmed stays confirmed; `confirmed_at`, `confirmed_by`, `confirmation_notes` are never written by this function.
4. **`confirmed` / `adjusted`, a charged figure changed**: the new figures are saved (as today), `confirmation_status` becomes `needs_review` (existing vocabulary; no new value, no migration), and `review_flags` gains one entry
   `{ type: "changed_after_confirmation", label: "Changed after confirmation", details: { previousStatus, confirmedAt, confirmedBy, confirmed: {base_amount, discount_amount, total_amount}, current: {...}, difference, changedAt } }`.
   The review card already prints one badge per flag label, so the admin sees it without a screen change; `confirmed_at` / `confirmed_by` stay on the row.
5. **While that bill waits for the admin** (`needs_review` carrying that flag): it stays `needs_review` and the flag is carried forward, `confirmed` still the figures the admin confirmed, `current` following the bill. It does not go back to `auto_approved`, and the figures returning to the confirmed ones does not re-confirm it: only confirm-tuition (an admin) sets `confirmed`.
6. **Every other existing bill** (`auto_approved`, `needs_review` without that flag, empty): recomputed exactly as today.
7. **Fail closed.** If the current bill cannot be read, the call fails and nothing is saved (before: it saved `recorded_payment: 0`).
8. Frozen bills: the function reports the saved figures, so rule 3 applies - a frozen confirmed bill stays confirmed, and the trigger still keeps its figures. Sibling-preview and unresolved-discount calls still write nothing. calculate-tuition-bulk writes no invoice and needs no change.

"Charged figure" means `base_amount`, `discount_amount`, `total_amount`. Payments and carry balances are not what an admin confirms and move for other reasons (a payment in an earlier month), so they do not un-confirm a bill.
