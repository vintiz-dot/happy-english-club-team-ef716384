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

---

## Part 2 - what was done

### Files changed

| file | change |
|---|---|
| `supabase/functions/_lib/invoice-status.ts` (new) | `invoiceLabelFields(existing, figures, computedFlags, nowIso)`: pure, imports nothing; returns `review_flags` always, `status` / `confirmation_status` only when the save may set them (rules 1-6). Not a mirrored pair: nothing in `src/` needs it. |
| `supabase/functions/calculate-tuition/index.ts` | (1) the current-bill read also selects `status, confirmation_status, review_flags, confirmed_at, confirmed_by`; (2) a failed read of that bill throws (rule 7); (3) the payload takes its three label columns from `invoiceLabelFields` instead of hard-coding `issued` and `auto_approved | needs_review`; (4) the fallback minimal upsert writes `status` only when the helper returned one. No line that computes a figure was touched (`git diff 736264c -- supabase/functions/calculate-tuition/index.ts`: the import, the read, the guard and the payload). |
| `scripts/pgtest/invoice-status.test.mjs` (new), `scripts/pgtest/fixtures/tuition-figures.golden.json` (new), `scripts/pgtest/run.mjs` (suite registered) | the suite, below |
| `scripts/CHECK-invoice-status-resets.sql` (new) | read-only owner query |
| `AGENTS.md` | section "Bill status labels" |

### What was NOT changed

- No figure: base, discount, total, `paid_amount`, `recorded_payment`, carry, class breakdown and the whole response are byte-identical (below).
- No migration, no new status value, no new column, no trigger.
- No historical row: nothing back-fills or repairs; past damage is only listed by the owner SQL.
- calculate-tuition-bulk (it writes no invoice), confirm-tuition, every payment function, the browser dialogs, the freeze trigger, the sibling paths, the session guard (SQL and `_lib/session-guard.ts` / `src/lib/sessionGuard.ts`).
- The comment at `supabase/functions/_lib/session-guard.ts:229-232` still says calculate-tuition un-confirms bills. That reason is now out of date; the other two it gives (a preview would create bills for months that had none, and spend the 30-a-minute budget) still hold, so the preview stays read-only. Left alone on purpose: touching that file means redeploying manage-session and bulk-cancel-sessions for a comment.
- The calculate-tuition stand-in in `session-guard-functions.test.mjs:192-194` still imitates the old reset. It is a stand-in used to prove the preview never calls the function; unchanged, still passing.

### The suite (`scripts/pgtest/invoice-status.test.mjs`)

Real handlers (calculate-tuition, calculate-tuition-bulk, confirm-tuition), `invoices` in pglite with the real CHECK, carry, audit and freeze migrations.

| case | result after the fix |
|---|---|
| new bill, no discount / with 10% discount | `issued` + `auto_approved` / `issued` + `needs_review` + `tuition_adjustment` - as before |
| confirmed (from auto_approved and from needs_review), recalculated x4 | `confirmed`; `confirmed_at` / `confirmed_by` untouched; audit trail shows 0 changes to either column |
| adjusted, recalculated | `adjusted` |
| paid / partial, recalculated | `paid` / `partial`, payment and carry intact |
| payment recorded before the first calculation | figures filled in, stays `partial` |
| draft / admin-set credit | `issued` (as before) / stays `credit` |
| fallback minimal upsert on a paid bill | stays `paid` |
| confirmed, one lesson then excused (400,000 -> 300,000) | `needs_review`, flag `{"type":"changed_after_confirmation","label":"Changed after confirmation","details":{"previousStatus":"confirmed","confirmedAt":...,"confirmedBy":<admin>,"confirmed":{"base_amount":400000,"discount_amount":0,"total_amount":400000},"current":{...300000},"difference":-100000,"changedAt":...}}` |
| ...recalculated again / changed again / figures back to 400,000 | stays `needs_review`; `confirmed` in the flag stays 400,000, `current` follows |
| ...admin confirms again, recalculated, later change | `confirmed`, old flag gone; the later change is measured against the second confirmation |
| adjusted + paid + discount, then a change | `needs_review`, both flags, `previousStatus: adjusted`, status still `paid`, 360,000 payment and 90,000 credit on the row |
| frozen, confirmed, paid | saved figures reported and kept, still `confirmed` and `paid` |
| bulk | same base / discount / total as single, reports the stored labels, makes zero invoice writes, row byte-identical |
| family discount unresolved / sibling preview | nothing written, row byte-identical |
| current bill unreadable | 400 `Unable to read the current tuition invoice`, zero writes, payment / paid / confirmed stand |
| guard predicate (`20261112091000:316-319`) | confirmed-unpaid bill still settled by confirmation after two recalculations; status-paid bill still settled by status |
| owner SQL | runs (11 statements), SELECT-only, finds a manufactured victim in every query, reports a healthy bill in none, changes nothing |
| FIGURES, 18 fixtures x (first call, repeat) | response and saved figure columns byte-identical to the function at 736264c |

The 18 figure fixtures: plain month; 10% enrollment discount; Excused + Late + Absent + a Canceled lesson; rate override; special discount + referral; sibling winner over two classes; family where another child wins; debt carried in with a part payment and a later settling month; credit carried in; frozen bill; a month with no lessons; and the seven registers of `enrollment-discounts.test.mjs` (weekday split in Sep / Oct / Nov, fixed allowance monthly and once, differing second-term discount, second term without one). The golden file was written by running this same suite with `T1_HANDLER_SOURCE` pointing at a copy of `git show 736264c:supabase/functions/calculate-tuition/index.ts` and `T1_WRITE_GOLDEN=1`; the fixed function is compared with it on every run.

### What the cancellation guard's "settled" check sees now

`session_month_tuition_settled` (`20261112091000:307-319`) and the D1 evidence (`20261112090000:622`) read `recorded_payment > 0 OR status IN (paid, partial) OR confirmation_status IN (confirmed, adjusted) OR tuition_frozen`.

- Before: two of the four were erased by any page view, so a taught lesson whose bills were confirmed but unpaid was judged tier 2 instead of 3 (D-review-3 F-1), and a bill settled by discount (`status: paid`, no recorded payment) was not seen as settled at all.
- Now: `confirmed` / `adjusted` and `paid` / `partial` survive recalculation, so those bills count as settled until something really changes them.
- After a guarded cancellation is confirmed, its refresh changes the figures of the affected bills; a bill that was confirmed becomes `needs_review` with the before/after flag. It is then no longer "settled by confirmation" (correct: its new figure is unconfirmed) but still settled by payment or status if it was paid. The guard itself is untouched.
- `status` can now stay `paid` on a bill whose total later rose above what was paid. For the guard that errs towards "settled" (more caution, not less). Whether the label should follow is owner question 2.

### Known limits (not fixed here, by design)

- Read-then-write: the function reads the bill, computes, then upserts. An admin confirming, or a payment landing, in the short gap between the two can still be overwritten (`needs_review` over a fresh `confirmed`; on a bill that did not exist at the read, `issued` over a fresh `partial`). The gap existed before and is far narrower than "every page view"; closing it needs a compare-and-set in SQL (a trigger or RPC = a migration), which this task was told not to add. confirm-tuition itself is safe: it recalculates first and confirms after.
- After an admin re-confirms a changed bill, the `changed_after_confirmation` flag stays in `review_flags` until the next calculation of that bill (any tuition screen), then drops. In between, a confirmed bill can show the badge.
- `class_breakdown` is not compared: a child moved between two classes at the same price, with base / discount / total identical, stays confirmed.

### Edge functions to redeploy

- **`calculate-tuition`** - the only one. It bundles the new `_lib/invoice-status.ts`.
- Nothing else imports the new module; no migration; no browser change, so no publish is needed for the fix (the review card already prints every flag's label).

### Owner SQL

`scripts/CHECK-invoice-status-resets.sql` - read-only, not run by the agent against anything but the test database. Counts first, then rows by invoice id / student id / month, no names.

- 0: can the audit queries run (columns + trigger present), and since when.
- 1, 1b, 2: bills with `confirmed_at` set that are no longer `confirmed` / `adjusted` (works without the audit trail: `confirmed_at` is only written by confirm-tuition and never cleared).
- 3: bills with a recorded payment whose status says `issued` / `draft`.
- 4, 4b: audit trail - each `confirmed|adjusted -> auto_approved|needs_review`, with whether the figures changed in that same save. `audit_log` does record this: the generic trigger of `20261009130000` logs every invoices UPDATE with `changed_fields` and old/new values, actor NULL for the service role - but only from the day that migration was applied.
- 5, 5b: audit trail - `paid|partial|credit -> issued` by the service role.
- 6, 6b: audit trail - a recorded payment LOWERED by the service role (the failed-read fault). Expected to be empty.

### Open questions for the owner (policy only)

1. **Bills already reset.** Should the admins re-confirm the bills query 2 lists, or leave them? Recommended default: leave the rows alone; re-confirm in the review queue only the months still being collected. Nothing was mis-charged.
2. **A paid bill whose total later changes** keeps the label `paid` (or `partial`). Should the label be re-derived? Recommended default: no - the amount owed is read from the recorded payment and the carry balances, never from this label, and the four payment paths disagree on the rule; unifying them is a separate decision.
3. **Figures that return to exactly what was confirmed** (a lesson cancelled, then restored): the bill stays in review until an admin confirms. Recommended default: keep it that way - one click, and nobody is told "confirmed" by a machine.
4. **A change in class breakdown only** (same totals) does not un-confirm. Recommended default: keep.
5. **Query 6 rows, if any**: a payment that an edge function lowered. Recommended default: look at each by hand against the family's receipts before touching anything; no automatic repair.

### Verification (commands and totals)

**Where I am / next step:** done; waiting for the reviewer. Nothing deployed, applied or pushed.

| command | result |
|---|---|
| `node scripts/pgtest/invoice-status.test.mjs <4 migrations>` on the function at 736264c | 66 passed, 29 failed (the reproduction) |
| the same, on the fixed function, final suite | **108 passed, 0 failed** |
| `node scripts/pgtest/edge-functions.test.mjs` | 5 passed, 0 failed (100 files loaded of 100) |
| `node scripts/pgtest/run.mjs` (full) | **2860 assertions across 37 suites, 0 suite(s) failed** |

The full run was started at commit b358c3c (the fix), when the new suite had 95 assertions. The 13 assertions added afterwards (the owner-SQL section) changed only `invoice-status.test.mjs` and `scripts/CHECK-invoice-status-resets.sql`; that suite was re-run on its own at 108. The full run was NOT repeated after that, so the expected full total now is 2873, of which 2860 were observed in one run and 108 (replacing 95) separately.

Existing suites in that run, unchanged and passing: family payment month 6, dated enrollment discounts 22, cancelled lessons 25, session held evidence 143, session cancel guard 266, session guard functions 135, shared-module mirrors 13, edge functions typecheck 5, app typecheck 3, and the rest. No existing test file was edited; `run.mjs` only gained the new suite's entry.
