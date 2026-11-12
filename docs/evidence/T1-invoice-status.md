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

---

# Round 2 - after the review (docs/evidence/T1-review.md) and the conductor's ruling

**Where I am / next step:** round 2 complete and tested; waiting for the reviewer. Nothing deployed, applied or pushed. Supersedes round-1 rule 2 ("`status` is not this function's to change") and round-1 owner question 2.

Ruling: the fix is not deployed alone. With labels now sticking, the three cumulative-`paid_amount` rules would show (M-1), so M-1, M-2 and the T3 response fields ship in the same release.

## The label rule (M-1) - ONE rule, `supabase/functions/_lib/invoice-status.ts` (`monthPayable`, `paidLabel`, `invoicePaidLabel`)

```
payable = this month's charge (total_amount) + debt carried in - credit carried in
paid     when recorded_payment >= payable AND payable > 0
partial  when recorded_payment > 0 otherwise
issued   when nothing is recorded for the month
```

`recorded_payment` is the money recorded IN that month. Cumulative `paid_amount` is never compared with anything.

It is not a new rule: it is the one `RecordPaymentDialog.tsx:89-97`, `QuickPayPanel.tsx:127-128`, `BatchPaymentDialog.tsx:98-99` and `ai_action_apply` / `ai_action_undo` (`20261107090000:571-574`, `:726-729`) already used; the suite asserts each of those sources still states it and that PostgreSQL evaluating the SQL `CASE` agrees with the helper on a grid. **No browser dialog disagrees with the rule; none was edited.**

| situation | label | why |
|---|---|---|
| 400,000 charged, 400,000 recorded | paid | |
| 400,000 charged, 100,000 recorded (family with paid earlier months) | partial | was `paid` under the cumulative rule |
| debt of 300,000 carried in, 400,000 recorded | partial | the month asks for 700,000; `paid` at 700,000 |
| 100,000 credit carried in, 300,000 recorded | paid | payable is 300,000 |
| credit carried in covers the whole month, nothing recorded | issued | nothing was paid IN the month; that nothing is owed is read from the carry balances (`carry_out_debt` 0), not from this label. Owner question R2-1 |
| a month with no charge | issued; partial if money was recorded on it | never `paid` for a month that asks for nothing (the dialogs' `payable > 0`) |
| frozen bill | the same rule on the SAVED total | 400,000 of a frozen 810,000 is partial although the live figure is 400,000 |
| `credit` set by an admin | left alone | not one of the three derived values |
| `draft` | derived (issued when nothing recorded) | as before |

## Design chosen for re-deriving: calculate-tuition re-derives the label on every recalculation

Round 1 left `status` untouched on an existing bill. That cannot be right after a payment is edited down, reversed or moved in Recorded Payment Manager (`RecordedPaymentManager.tsx:107-113`, `:163-169`: it writes `recorded_payment` only), after modify-payment (writes no invoice at all), or for a label written by the old cumulative rule: nothing would ever correct it. calculate-tuition runs after every one of those paths and holds the month's recorded payment, total and carry-in, so it now passes `paidLabel(monthPayments, payable)` to `invoiceLabelFields`, which:

- writes that label on a new bill (issued when nothing is recorded - what it wrote before);
- on an existing bill writes it ONLY when it differs from the stored one, and never over `credit`.

"Only when it differs" is what keeps the round-1 property: a calculation that agrees with the stored label says nothing about the column, so the audit trail shows no churn and a label saved by a payment while the calculation was running is not overwritten by it (tested).

Consequences, stated plainly:
- A bill's label is right after ANY payment path followed by the standard recalculation.
- Bills paid before the deploy (all labelled `issued` by the old reset) get `paid` / `partial` at their next ordinary calculation. That is the same lazy write the function always made, with the true value; no back-fill, no figure touched. The owner SQL query 3 lists them.
- An admin override in Invoice Status Manager to `paid` / `partial` / `issued` / `draft` that disagrees with the money lasts until the next calculation (as before T1, when it lasted until the next calculation and became `issued`). Only `credit` sticks. For the conductor: that screen and `PaymentIntegrityRepair.tsx:46-70`, `:134-152` (judges by cumulative `paid_amount`, writes `draft`) DISAGREE with the rule. Not edited (src/ is out of scope); listed.

## M-2 closed: calculate-tuition no longer writes `recorded_payment`

Owner of the column: the payment paths (family-payment, smart-family-payment, the three payment dialogs, Recorded Payment Manager, ai_action_apply/undo). No trigger writes it. calculate-tuition only ever wrote back the value it read at the start. It is now absent from both upserts (`calculate-tuition/index.ts:604-623` and the fallback `:646-658`); a new bill gets the column default 0 (`20251015053836`), which is what was written before, so the golden's saved figures are byte-identical. The carry columns the function writes from its older reading are recomputed from the real rows by the `invoices_carry_sync` trigger in the same statement.

Proof (real carry trigger): a payment recorded between the calculation's read and its save survives with `recorded_payment` 400,000, carry-out 0 and its `paid` label; a payment that CREATES the bill in that gap survives with 200,000 and carry-out debt 200,000 - its label is written `issued` by the calculation that never saw it and is `partial` after the next one (label only; every payment path recalculates afterwards).

Also fail-closed (review m-4): an unreadable read of the earlier months now fails the call (`:162`) instead of pricing the carry as "no earlier payments".

## T3 additions (additive response fields; no existing field or figure changed)

- `carry.payable` in calculate-tuition (`index.ts:500`, `:684`) and in every calculate-tuition-bulk result (`calculate-tuition-bulk/index.ts:394`; flag at `:398`), both from `monthPayable`: **charge for the month + carry-in debt - carry-in credit, BEFORE this month's payment; may be negative when the credit is larger; not clamped.** It is exactly what `useLiveTuitionData.ts:142` and the dialogs add up today, and exactly the figure the label is judged against (one helper). `payable - payments.monthPayments = carryOutDebt - carryOutCredit` is asserted. On a frozen bill it uses the saved total.
- `siblingUnresolved` per student in calculate-tuition-bulk (`:399`): true when the family's discount state is `unresolved`, the same test as the single function's `siblingUnresolved`; its figures are unchanged (still the provisional charge).
- Readers must treat both as optional (a function not yet redeployed does not send them).
- Tested on the 18 golden fixtures (payable = total + carry-in debt - carry-in credit, single = bulk) and on the T3 cases where the browser was wrong: no bill row with arrears (payable 700,000, browser 300,000), saved total out of date (payable follows the register), credit larger than the month (-250,000), unresolved family (flag true), resolved (false, 360,000).
- **For the conductor:** T3's own suite (`tuition-prior-balance.test.mjs` on `worktree-agent-a34c3c84114092f37`) asserts that neither response HAS a payable or a `siblingUnresolved`. Those assertions will fail once this branch is merged with it and must be turned round there; I did not touch that branch.

## Functions changed (file:line at the final commit)

| function | change |
|---|---|
| `_lib/invoice-status.ts` | `monthPayable`, `paidLabel`, `invoicePaidLabel` (the rule); `invoiceLabelFields` takes the derived label and writes `status` only when it differs, never over `credit` |
| `calculate-tuition/index.ts` | `:9` import; `:158`, `:162` fail closed on either invoice read; `:500` payable; `:595-602` label fields with `paidLabel(monthPayments, payable)`; `:604-623` payload without `recorded_payment` (fallback `:646-658`); `:684` `carry.payable` |
| `calculate-tuition-bulk/index.ts` | `:7` import; `:390-398` `carry.payable`, `siblingUnresolved`. Still writes nothing |
| `smart-family-payment/index.ts` | `:4` import; `:268` reads carry-in; `:283` `invoicePaidLabel(invoice, newRecorded)` (was cumulative `paid_amount + applied >= total`); `:300` new-row branch `paidLabel(applied, sibling.debt - sibling.credit)` |
| `family-payment/index.ts` | `:4` import; `:92-107` the open bills are chosen by `invoicePaidLabel(inv) !== 'paid'` instead of the stored `.neq('status','paid')`; `:270` label by the rule (was recorded vs total without carry) |
| `settle-bill/index.ts` | `:3` import; `:79` reads `recorded_payment`; `:194` `invoicePaidLabel(invoice)` (was cumulative) |
| `delete-payment/index.ts` | `:2` import; `:124-131` `invoicePaidLabel(invoice)` (was cumulative, and `draft` at zero) |
| `confirm-tuition/index.ts` | `:4` import; `:66-81` takes the `changed_after_confirmation` flag off the bills it confirms (review m-2) |
| `modify-payment` | NOT changed: it writes no invoice; its recalculation now corrects the labels |
| `src/components/admin/TuitionReviewQueue.tsx:146` | heading "Changed after it was confirmed" for the flag group (the one src edit allowed) |

family-payment `.neq('status','paid')`: the review suggested dropping it because "the owed arithmetic already applies 0 to a paid bill". Tested first, and that is FALSE for a bill paid with credit carried in (300,000 recorded on a 400,000 charge with 100,000 credit is paid, while `total - recorded` still reads 100,000 - family-payment would take another 100,000). So the selection is kept, but judged from the bill's money with the helper instead of the stored label: a bill wrongly labelled paid is paid into (tested), a bill that is paid is left out (tested), and no zero-amount allocation rows are created.

## The seven minors

| | done? | |
|---|---|---|
| m-1 raw key as heading | fixed | label added (step 4). Showing the before/after amounts on the card is a second src edit - not allowed here; left for the conductor |
| m-2 flag outlives re-confirmation | fixed | confirm-tuition removes it; tested |
| m-3 "compare only total" mutant | test added | base and discount both +100,000, total unchanged -> needs_review with the flag |
| m-4 `priorInvoicesRes.error` | fixed | fail closed; tested (400, zero writes) |
| m-5 stand-in in `session-guard-functions.test.mjs` imitates the old reset | left | not a correctness issue: the stand-in exists to prove the preview never calls the function; that suite is unchanged and passing |
| m-6 owner SQL wording | fixed | query 3 says to expect a long list and uses the one rule; queries 5 and 6 say what post-fix rows mean and that 6 also catches the M-2 race |
| m-7 queue's Confirmed list omits `adjusted` | left | a src edit beyond the one allowed; one-line filter (`TuitionReviewQueue.tsx:67-70`), listed for the conductor |

## Stopped on / found, NOT changed (each would move money or is outside the allowed files)

1. **settle-bill works out the balance it may write off from cumulative `paid_amount`** (`settle-bill/index.ts:86-88`): for a family with paid earlier months it finds "No outstanding debt to discount (balance: 0)" and refuses a real debt (executed: 400 with 400,000 owed). The honest balance is the bill's carry-out. Changing it changes which write-offs are accepted, so it is the conductor's call.
2. **A settle-bill write-off never reaches the bill**: it posts ledger entries and a `settlements` row, and `paid_amount += settled` (overwritten by the recalculation that follows). `recorded_payment`, `total_amount` and the carry balances are unchanged, so every tuition screen still shows the debt. By the label rule the bill therefore stays issued / partial after a settlement "in full" (before T1 it was reset to `issued` as well; under the cumulative rule it briefly read `paid`). Making a settlement count needs a decision about where a write-off lives on the bill - an amount change.
3. **delete-payment never lowers `recorded_payment`** and only finds ledger entries whose key starts `payment-<id>` (the family payment functions use `family-payment-...` / `smart-family-...`, so deleting one of those changes no invoice). The label after a delete follows what the bill still records: issued when nothing is, partial / paid when the money is still on the bill. To take the money off the bill an admin uses Recorded Payment Manager; the recalculation then corrects the label (tested).
4. `PaymentIntegrityRepair` and `InvoiceStatusManager` (browser) disagree with the rule, as above; `TuitionReviewQueue` m-7; the before/after on the review card.
5. T3's assertions that the new fields are absent (above).

## Tests

`scripts/pgtest/invoice-status.test.mjs`, real handlers: calculate-tuition, calculate-tuition-bulk, confirm-tuition, family-payment, smart-family-payment, settle-bill, delete-payment, modify-payment; `invoices` in PostgreSQL with the real CHECK, carry, audit and freeze migrations.

| path, then the standard recalculation | label |
|---|---|
| smart-family-payment, full | paid |
| smart-family-payment, part, family WITH earlier paid months (M-1) | partial (was paid); paid once the rest is paid |
| smart-family-payment creating the bill (discount unresolved, no row) | partial / paid |
| family-payment part / rest / on a paid bill | partial / paid / not selected, no write |
| family-payment on a bill wrongly labelled paid | paid into |
| debt carried in: month paid / debt paid too | partial / paid |
| credit carried in covers the month | issued, nothing owed, payable 0 |
| zero-charge month / money recorded on it | issued / partial |
| frozen bill 400,000 of 810,000 / 810,000 | partial / paid |
| settle-bill in full / in part | issued / partial - bill's money unchanged (finding 2) |
| delete-payment, nothing recorded on the bill / 150,000 still recorded | issued / partial |
| payment reversed on the bill (recorded 0) | issued |
| payment edited down to 100,000 / to 0 | partial / issued |
| payment moved to another month (+ real modify-payment) | old month issued with the debt; new month paid |
| dialogs / ai_action_apply writing paid, partial | unchanged, and the recalculation does not touch the column |
| admin `credit` / `draft` | kept / issued |
| a bill paid before the fix | paid at its next calculation |

Round-1 assertions changed, on purpose: "settled by discount (status paid, no recorded payment) ... still settled by status" is now "a `paid` label with nothing recorded is corrected to issued" (the label follows the money; the guard still sees paid and part-paid bills as settled, by payment and by status - asserted). Nothing else from round 1 was weakened; the golden file is untouched (`git log --oneline -- scripts/pgtest/fixtures/tuition-figures.golden.json`: one commit, 4cbe742).

Totals: see "Round 2 verification" below.

## What the cancellation guard sees now

Unchanged SQL. A bill counts as settled when `recorded_payment > 0`, or the label is paid / partial, or it is confirmed / adjusted, or frozen. With the label derived from `recorded_payment`, "settled by label" and "settled by payment" now agree, except a zero-payment `paid` (impossible by the rule). Confirmed bills behave as in round 1. A bill written off through settle-bill is not settled for the guard unless money is recorded on it or it is confirmed - the same as in production today.

## Redeploy together (no migration; one publish for the queue heading)

All seven have `verify_jwt = true` in `supabase/config.toml` (calculate-tuition `:6-7`, confirm-tuition `:39-40`, smart-family-payment `:48-49`, calculate-tuition-bulk `:52-53`, delete-payment `:186-187`, family-payment `:189-190`, settle-bill `:216-217`).

None of the `_lib` files below imports another local file (`auth.ts` imports only the remote supabase-js).

| function | files |
|---|---|
| calculate-tuition | `calculate-tuition/index.ts`, `_lib/rate-limit.ts`, `_lib/auth.ts`, `_lib/sibling-state.ts`, `_lib/tuition-session.ts`, `_lib/enrollment-discounts.ts`, `_lib/invoice-status.ts` |
| calculate-tuition-bulk | `calculate-tuition-bulk/index.ts`, `_lib/auth.ts`, `_lib/sibling-state.ts`, `_lib/tuition-session.ts`, `_lib/enrollment-discounts.ts`, `_lib/invoice-status.ts` (NEW import) |
| smart-family-payment | `smart-family-payment/index.ts`, `_lib/rate-limit.ts`, `_lib/invoice-status.ts` (NEW import) |
| family-payment | `family-payment/index.ts`, `_lib/rate-limit.ts`, `_lib/invoice-status.ts` (NEW import) |
| settle-bill | `settle-bill/index.ts`, `_lib/invoice-status.ts` (NEW import) |
| delete-payment | `delete-payment/index.ts`, `_lib/invoice-status.ts` (NEW import) |
| confirm-tuition | `confirm-tuition/index.ts`, `_lib/auth.ts`, `_lib/invoice-status.ts` (NEW import) |

Order does not matter for safety: each function is correct on its own, and readers treat the new response fields as optional. calculate-tuition first is the natural order (it is the one that corrects labels). A function deployed without `_lib/invoice-status.ts` fails at boot.

P0 from the review still applies before deploying calculate-tuition (the five label columns must exist; the read now fails the call). settle-bill's read now also selects `recorded_payment`, and smart-family-payment's `carry_in_debt, carry_in_credit` - all in `types.ts`.

## What admins will notice (round 2 on top of the review's list)

- Status badges say paid / partial / issued by one rule everywhere. A part payment through Smart Family Payment reads partial (it would have read paid). A bill whose payment is reversed, edited down or moved goes back to partial / issued at its next calculation.
- Bills paid before the release turn from issued to paid / partial as their tuition screens are opened; no amount changes.
- A month paid for entirely by credit carried in reads issued with nothing owed; a month with debt carried in reads partial until the debt is paid too.
- A write-off in Settle Bill does not turn the bill paid (it never changed the bill's balance). For a family with earlier paid months Settle Bill still refuses, as it does today (finding 1).
- A status set by hand in Invoice Status Manager lasts until the next calculation unless it is `credit`.
- The review queue heads the group "Changed after it was confirmed"; a re-confirmed bill no longer carries that badge.
- Rarely: "Unable to read the earlier tuition invoices" on a tuition screen; reloading fixes it.
- The Finance tab and `/tuition` can show "Being calculated" for a family whose discount is being decided once the T3 screens read `siblingUnresolved`.

## Owner questions (policy), round 2

- R2-1. **A month covered entirely by credit carried in is labelled issued**, not paid (nothing was paid in that month; nothing is owed). Recommended default: keep - it is what the payment dialogs have always written, and the amount owed is shown from the carry balance.
- R2-2. **Should a Settle Bill write-off count on the bill** (reduce what is owed and be able to make it paid), and should Settle Bill work for families with history? Recommended default: yes to both, as its own change with its own review, because it moves balances.
- R2-3. **Should deleting a payment take the money off the bill's recorded payment?** Recommended default: yes, as its own change; until then admins reverse it in Recorded Payment Manager.
- Round-1 question 2 is answered by this round (the label is re-derived).

## Round 2 verification

| command | result |
|---|---|
| `node scripts/pgtest/invoice-status.test.mjs <4 migrations>` | **187 passed, 0 failed** (108 in round 1; golden comparison unchanged and passing, golden file untouched) |
| `node scripts/pgtest/edge-functions.test.mjs` | 5 passed, 0 failed (100 files loaded of 100) |
| `node scripts/pgtest/run.mjs` (full, run on the final code; only docs committed after it started) | **3148 assertions across 39 suites, 0 suite(s) failed** |

In that full run: family payment month 6, dated enrollment discounts 22, invoice status 187, cancelled lessons 25, session held evidence 143, session cancel guard 266, session guard functions 135, shared-module mirrors 13, edge functions typecheck 5, app typecheck 3. No other suite's file was edited in either round.

Not done: no run against the live database or deployed functions; no mutation run in round 2 (the review's surviving mutant M3 now has its test, m-3); the T3 branch was not merged here.
