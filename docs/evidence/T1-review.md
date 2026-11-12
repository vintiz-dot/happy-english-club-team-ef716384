VERDICT: PASS WITH CHANGES

Deploy `calculate-tuition`. No code change has to land before the deploy; one read-only probe should (P0 below). Four changes should follow, two of them soon (M-1, M-2).

Reviewed: `git diff 736264c HEAD` for `supabase/functions/calculate-tuition`, `_lib/invoice-status.ts`, `AGENTS.md`, `scripts/pgtest/invoice-status.test.mjs`, `scripts/CHECK-invoice-status-resets.sql`, `scripts/pgtest/run.mjs`, at c5405ab. Fresh context; nothing but this file was changed. Probes lived in `.probe/` (untracked, removed).

Counts: 0 BLOCKER, 2 MAJOR, 7 MINOR.

---

## Findings

### MAJOR

**M-1. `status` now keeps whatever the payment paths wrote, and three of them write `paid` by a rule that is wrong for any family with history.** May follow the deploy; do it soon.
- Before T1 every payment function's label was erased by the calculate-tuition it invokes straight afterwards (family-payment/index.ts:271, smart-family-payment/index.ts:357, settle-bill/index.ts:271, modify-payment/index.ts:235), so `status` was `issued` in practice everywhere. T1 makes those labels stick for the first time.
- `smart-family-payment/index.ts:273-279`: `paid_amount + applied >= total_amount ? 'paid' : 'partial'`. `paid_amount` is the CUMULATIVE figure calculate-tuition saves (`calculate-tuition/index.ts:562`, `:599`: prior months + this month). For a child with earlier paid months it is already larger than one month's total, so ANY payment, however small, is labelled `paid`. This is the mounted family payment screen (`FinanceTab.tsx:32`, `pages/Tuition.tsx:40`).
- `settle-bill/index.ts:182-189`: same cumulative comparison.
- `delete-payment/index.ts:122-143`: `paid_amount - credited`; `>= total` -> `paid`. For the same reason a bill can stay `paid` after its payment is deleted. It does not recalculate and never lowers `recorded_payment` (pre-existing, not T1).
- `modify-payment`: writes no label at all (only recalculates), `RecordedPaymentManager.tsx:107-113`, `:163-169` edits `recorded_payment` and leaves `status`. A payment moved away or edited to 0 leaves `paid` / `partial` behind.
- Who reads it: the cancellation guard (errs to "settled", i.e. more caution - and those bills are settled by `recorded_payment > 0` anyway); badges in `RecordedPaymentManager.tsx:328`, `session-guard/CancelOverridesReview.tsx:285`, student-audit; `PaymentIntegrityRepair.tsx:46-70`; and `family-payment/index.ts:96`, which picks the bills to pay with `.neq('status','paid')` - a bill wrongly labelled `paid` would be left out of the allocation while the ledger entry is still posted (`:240-266`). `FamilyPaymentModal` is not mounted anywhere (grep for `<FamilyPaymentModal` in `src`: none), so that last one is latent, not live.
- No amount owed is read from `status` on any screen (balances come from `recorded_payment` and `carry_*`), so no family is shown a wrong figure. It is a wrong label, where before it was a different wrong label (`issued` on a paid bill).
- Fix (separate change, each function redeployed): one helper `paidLabel(recorded_payment, total_amount)` = monthly `recorded_payment >= total ? paid : partial`, used at smart-family-payment:279 and :294, settle-bill:187 (with the settled amount), delete-payment:125-131; drop `.neq('status','paid')` at family-payment:96 (the `owed` arithmetic at :254 already applies 0 to a bill that is really paid). Until then: do not branch on `status` for money - add that sentence to AGENTS.md (see item 8).

**M-2. Pre-existing, unchanged by T1: calculate-tuition writes back the `recorded_payment` it read at the start (`index.ts:402`, `:600`).** A payment that lands between the read (`:139-147`) and the upsert (`:618-620`) is overwritten with the older value; on a bill that did not exist at the read, with 0. That is money, not a label, and it is the same before and after this fix (the new fail-closed guard removes only the read-FAILED variant). Rare: it needs a calculation of the same child and month in flight while the payment is saved. Query 6 of the owner SQL would show past cases (payment lowered by the service role).
- Smallest fix, follow-up, same function: leave `recorded_payment` out of both upserts. The function only ever writes back what it read, a new row gets the column default 0, and an existing row keeps what the payment path stored. Needs the golden comparison re-run (saved figures must stay identical) and one new race case. Not a reason to hold T1: T1 does not widen it.

### MINOR

- **m-1. Raw key as a heading.** `TuitionReviewQueue.tsx:143-148` (`labels[flagType] || flagType`) will head the group `changed_after_confirmation`. The card badge is fine (`StudentTuitionReviewCard.tsx:91-104` prints `flag.label`); `TuitionStudentCard.tsx:199-210` ignores unknown types. Nothing crashes. Nothing shows the before/after amounts although the flag carries them. Fix (browser, needs a publish, may follow): add `changed_after_confirmation: "Changed after confirmation"` to that `labels` map, and in the review card's details print `details.confirmed.total_amount -> details.current.total_amount`.
- **m-2. The flag outlives the re-confirmation** until the next calculation (acknowledged in the evidence). A confirmed bill can show the badge for a while. Fix, may follow: confirm-tuition filters that flag out of `review_flags` in its update (`confirm-tuition/index.ts:53-62`).
- **m-3. Test gap (mutation M3 survived).** No case changes base and discount while the total stays, so "compare only total" passes the suite. Add one: e.g. confirmed bill, then a rate override raising base by X with a fixed discount raised by X -> must go to `needs_review`.
- **m-4. `priorInvoicesRes.error` is still not looked at** (`index.ts:397`). A failed read of the other months gives prior payments 0, so that one response and the saved `paid_amount` are wrong until the next call (the carry columns are trigger-kept and heal). Same fail-closed line as the new guard; pre-existing; may follow.
- **m-5. `session-guard-functions.test.mjs:192-196`** still imitates the old reset in its calculate-tuition stand-in, so no executed test runs the guard functions against the new label behaviour end to end. Update the stand-in when that file is next touched.
- **m-6. Owner SQL wording.** Query 3 will list nearly EVERY bill that has a payment (all of them were reset); say so in its comment so the count does not alarm. Query 6's comment "no other edge function lowers recorded_payment" is true by grep (only family-payment and smart-family-payment write it, both upward) but it will also catch the M-2 race, not only the failed read - say that.
- **m-7. `TuitionReviewQueue.tsx:67-70`** lists only `confirmed`, so an `adjusted` bill, which now survives, appears in no list of the queue. Pre-existing blind spot made visible; one-line filter change with m-1.

---

## 1. Figures

- **Golden really is the old function.** I wrote `git show 736264c:supabase/functions/calculate-tuition/index.ts` to a probe file and ran the suite with `T1_HANDLER_SOURCE=<that> T1_WRITE_GOLDEN=1`. The regenerated `tuition-figures.golden.json` equals the committed one (`git diff --ignore-cr-at-eol`: empty; the only difference is LF/CRLF). Old function on the suite: 77 passed, 31 failed, 0 failures in the Figures section. Fixed function: **108 passed, 0 failed**.
- Each of the 18 fixtures compares the whole response (first call and repeat) and the saved `base_amount, discount_amount, total_amount, paid_amount, recorded_payment, carry_in/out_credit/debt, class_breakdown` of the month and of every other month.
- Diff read line by line: the import, five extra columns in the read, the guard, the payload's label columns, `updated_at` taken from one timestamp. No line that computes a figure is touched.

Covered: plain month; enrollment discount (percent); Excused/Late/Absent + a Canceled lesson; rate override; special discount + referral; two classes with sibling winner; family where another child wins; debt carried in + part payment + later settling month; credit carried in; frozen bill; zero-charge month; the seven dated-enrollment split registers (percent, fixed monthly, fixed once, differing second term, second term without discount).

NOT covered by the golden (figures):
- sibling discount **pending / unresolved** and the `siblingPreview` call - they are in the label section (nothing written, row byte-identical) but not in the golden comparison;
- a **confirmed or paid** bill among the 18 (the fixtures never confirm) - the "figures are the ones confirmed" assertions in the label section cover it for the plain and the 10% case only;
- manual / make-up sessions and `allowed_days` outside the split register; a fully paid month and an overpaid month; more than two classes; a rate override ABOVE the class rate; a sibling percent override on the family; a frozen bill that is also discounted by sibling;
- any month boundary other than Sep-Nov 2026.
None of these is a path the diff touches, so I do not ask for them before deploy.

Other suites: full `node scripts/pgtest/run.mjs` - see "Executed" at the end.

## 2. The rule - state table

`invoiceLabelFields` (`_lib/invoice-status.ts:62-114`), called once at `index.ts:586-591`; spread into the full upsert at `:606`; the fallback upsert takes only its `status` (`:639`). "not written" = the key is absent, the upsert leaves the column alone.

| stored bill | figures (base, discount, total) | `status` saved | `confirmation_status` saved | `review_flags` saved |
|---|---|---|---|---|
| read FAILED (any state) | - | nothing: 400 `Unable to read the current tuition invoice`, zero writes (`:158`) | | |
| sibling unresolved / preview (any state) | - | nothing written (`:612-616`), as before | | |
| no bill | new | `issued` | `auto_approved` if no flag, else `needs_review` | computed |
| `draft` | any | `issued` | by the rows below | by the rows below |
| `issued` / `paid` / `partial` / `credit` | any | not written | by the rows below | by the rows below |
| `auto_approved`, `needs_review` without the flag, or NULL | unchanged or changed | (above) | recomputed `auto_approved` / `needs_review` | computed |
| `confirmed` / `adjusted` | unchanged | (above) | not written - stays | computed (a leftover changed-flag is dropped here) |
| `confirmed` / `adjusted` | changed | (above) | `needs_review` | computed + `changed_after_confirmation` {previousStatus, confirmedAt, confirmedBy, confirmed{3}, current{3}, difference, changedAt} |
| `needs_review` WITH the flag | changed again | (above) | `needs_review` | computed + the flag, `confirmed` kept from the first change, `current` / `difference` updated |
| `needs_review` WITH the flag | back to the confirmed figures | (above) | `needs_review` (stays until an admin confirms) | computed + the flag, `difference: 0` |
| frozen (`tuition_frozen`), any label | always "unchanged" (the function passes the stored figures, `:378-385`) | not written | confirmed/adjusted stays; others recomputed | computed |

All rows match the stated rule. Answers:

- **(a) What is compared:** base, discount, total, each through `Number()` on both sides. The columns are `INTEGER` (20251012022746:42-44) and every computed discount is `Math.round`ed (`index.ts:337, 346, 369`; `enrollment-discounts.ts:26-27`), so the comparison is exact; PostgREST returns integers as JSON numbers and `Number()` covers a string anyway. `class_breakdown`, carry and `recorded_payment` are NOT compared and still saved. That is right for carry and payments (they move when another month is paid; an admin did not confirm them). A breakdown-only change with identical base/discount/total (child moved between equal-priced classes) stays confirmed: acceptable, and stated as owner question 4.
- **(b)** The flag carries enough for a before/after (three figures each, difference, who, when). A second recalculation keeps the ORIGINAL confirmed figures (mutation M8 caught). Figures returning to the confirmed value stay `needs_review` (tested: "figures back to 400,000"; mutation M9/M15 caught). That is the right choice: only an admin sets `confirmed`.
- **(c)** see the payment table below and M-1.
- **(d)** see "Callers" below. The second defect (read failed -> saved `recorded_payment: 0`) is tested: 400, zero writes, payment / paid / confirmed stand; mutation M6 (guard removed) is caught by two assertions.

### 2c. Payment paths - what `status` ends as after the fix

| path | its rule (file:line) | recalculates after? | `status` before T1 | `status` now |
|---|---|---|---|---|
| RecordPaymentDialog / QuickPayPanel / BatchPaymentDialog (browser) | recorded vs total + carry-in: `paid` / `partial` / `issued` (`RecordPaymentDialog.tsx:89-124`, `QuickPayPanel.tsx:127-150`, `BatchPaymentDialog.tsx:98-121`) | on the next screen refresh | `issued` | what the dialog wrote; right when written, stale if the total changes later |
| smart-family-payment (mounted) | CUMULATIVE `paid_amount + applied >= total` (`:273-279`); new row `applied >= total` (`:286-295`) | yes (`:357`) | `issued` | `paid` for almost any payment by a family with history - **wrong on a part payment** (M-1) |
| family-payment (no mounted screen) | monthly `recorded_payment >= total` (`:259-264`); selects with `.neq('status','paid')` (`:96`) | yes (`:271`) | `issued` | `paid` / `partial`, correct when written |
| settle-bill | CUMULATIVE `total <= paid_amount + settled` (`:182-189`) | yes (`:271`) | `issued` | `paid` nearly always (intended for a settlement; wrong for a part settlement) |
| delete-payment | `paid_amount - credited`: 0 -> `draft`, `>= total` -> `paid`, else `partial` (`:122-143`) | no | its label until the next view, then `issued` | `draft` -> `issued` at the next view; **`paid` / `partial` stays** even though the payment is gone |
| modify-payment | writes no label | yes (`:235`) | `issued` | unchanged from before the modification - stale if the payment was moved or reduced |
| RecordedPaymentManager (browser) | edits `recorded_payment` only (`:107-113`, `:163-169`) | - | `issued` at next view | stale `paid` / `partial` after an edit down |
| InvoiceStatusManager (admin override) | any value (`:70-77`) | - | wiped at the next view | **sticks** (an improvement: the override now works) |
| PaymentIntegrityRepair | from cumulative `paid_amount` (`:134-152`) | - | wiped | sticks; `draft` becomes `issued` at the next view |
| ai_action_apply / undo | recorded vs total + carry-in, re-derived on undo (20261107090000:559-576, :726-731) | - | wiped | correct, and re-derived on undo |

**Stale-status answer:** yes. Screens that print `invoices.status` will now show a `paid` that survives a deleted, moved or edited-down payment, and a `paid` on a part payment made through Smart Family Payment; and every bill paid BEFORE the deploy stays `issued` for good (nothing rewrites history). The old reset did not make these right - it made every bill `issued` - but it did hide the disagreement between the four rules. No balance, no amount owed and no guard decision gets less safe from it; the guard only errs towards "settled".

### 2d. Callers of calculate-tuition and the new 400

| caller | on an error | effect of the new 400 |
|---|---|---|
| `_lib/refresh-cancelled-tuition.ts:15-16` | throws "Lesson cancelled, but tuition refresh failed. Retry..." | same message as for any other failure; right |
| `_lib/session-guard.ts:182-190` (`refreshPairs`) | records `ok:false` for the pair; override not marked refreshed | right |
| `confirm-tuition/index.ts:45-48` | refuses to confirm | right |
| `_lib/attendance-effects.ts:56-61` | counts a failure, attendance is still saved | as before |
| family-payment :271, smart-family-payment :357, settle-bill :271, modify-payment :235 | swallowed, payment already saved | as before |
| smart-family-payment :143 (pricing before the payment) | error for that sibling | better than pricing with payment 0 |
| compute-sibling-discounts, update-enrollment-rate, stars-sync, explain-family-tuition, chat tools | treat as an error | as for any other 400 |
| browser screens (`useStudentMonthFinance`, `StudentTuitionOverview`, `TuitionCard`, `fetchInvoiceData`, ...) | show an error / retry | a transient read failure now shows an error instead of silently saving 0 |

Before, the same failure returned 200 with a payment of 0 in the response AND saved it. Failing is the right behaviour.

## 3. The cancellation guard

`session_month_tuition_settled` (20261112091000:307-319): a month is settled when a child with a billable row has `recorded_payment > 0` OR `status IN ('paid','partial')` OR `confirmation_status IN ('confirmed','adjusted')` OR `tuition_frozen`. T1 does not touch it. With labels now surviving, bills that are confirmed-but-unpaid, or `paid` by settlement/discount without a recorded payment, count as settled where before they stopped counting at the next page view. That is the intended behaviour. After a tier-3 cancellation's refresh changes a confirmed bill, that bill becomes `needs_review` and is no longer settled by confirmation (still settled if paid).

## 4. Concurrency

- Label race: calculation A reads a bill that is `needs_review` / `auto_approved`; an admin confirms; A's upsert writes `needs_review` / `auto_approved` over the fresh `confirmed` (`confirmed_at` stays). Worst outcome: the bill returns to the queue and needs one more click; figures are the freshly computed ones either way. If A read `confirmed` it does not write the column at all, so a confirmed, unchanged bill is immune by construction. Window: one calculation (several round trips), and only against a confirm of the same child and month. Before the fix the same loss happened at EVERY later calculation, so this is strictly better.
- Bill absent at the read, created by a payment before the upsert: `status: issued` and `recorded_payment: 0` over the payment - the money half is M-2, identical before the fix.
- Smallest SQL fix for the labels (not required for this deploy): a `BEFORE UPDATE` trigger beside `keep_frozen_invoice_amounts` that, when `OLD.confirmation_status IN ('confirmed','adjusted')`, `NEW.confirmation_status IN ('auto_approved','needs_review')`, the three charged figures are unchanged and `auth.uid() IS NULL`, keeps `OLD.confirmation_status`. For money, the M-2 change (stop writing `recorded_payment`) is smaller and needs no migration.
- Should it block? No. The race is narrower than today's certainty and the fix adds no new one.

## 5. The flag in the UI

No crash anywhere. Badge with the readable label on the review card; raw key as the group heading in the queue (m-1); the "confirmed" list omits `adjusted` (m-7). The before/after is in the data, not on screen.

## 6. Mutations (throwaway copies in `.probe/mut`, tracked files untouched)

| # | mutation | result |
|---|---|---|
| M1 | always preserve (changed figures stay confirmed) | caught (12 fail) |
| M2 | never preserve | caught (21) |
| M3 | compare only total | **survived** (m-3) |
| M4 | drop the flag | caught (9) |
| M5 | write `status: issued` again | caught (11) |
| M6 | remove the read-failed guard | caught (2) |
| M7 | `adjusted` treated like `auto_approved` | caught (2) |
| M8 | second recalculation overwrites the confirmed figures in the flag | caught (2) |
| M9 | waiting flag not carried forward | caught (3) |
| M10 | fallback upsert writes `issued` again | caught (1) |
| M11 | `draft` no longer issued | caught (1) |
| M12 | `difference` sign flipped | caught (1) |
| M13 | flag loses confirmedBy / confirmedAt | caught (2) |
| M14 | waiting flag's `current` not updated | caught (1) |
| M15 | changed bill -> `auto_approved` instead of `needs_review` | caught (5) |
| M16 | the read no longer selects `confirmation_status` | caught (21) |
| M17 | stored figures not coerced with `Number()` | survived - equivalent here (integer columns) |

15 of 17 caught; one real gap.

## 7. Owner SQL

Read-only for certain: 11 statements, each a plain `SELECT` over `invoices`, `audit_log`, `information_schema.columns`, `pg_trigger`; only aggregates, casts and `COALESCE`; no function call with side effects, no CTE with DML, no `INTO`, no locking clause. The suite also checks a before/after hash of both tables. No names: ids, months, amounts, labels, timestamps (`confirmed_by` is a user id). Queries 4-6 fail harmlessly if the audit columns are absent, and query 0 says so first.

Definitions are sound and say what they cannot know (query 2 cannot tell "reset with nothing changed" from "figures changed since"; the audit queries see only changes after 20261009130000 was applied). Two wording points in m-6.

## 8. AGENTS.md "Bill status labels"

Accurate against the code (three bullets; every claim checked). **Keep.** Trim nothing; add one sentence to the first bullet: "`status` is a label written by payment paths whose rules disagree (some compare against cumulative `paid_amount`) - never branch on it for money." That is the trap M-1 describes and it belongs next to the rule that made the labels permanent.

## 9. Deploy

Only `calculate-tuition`. Files to upload:
- `supabase/functions/calculate-tuition/index.ts`
- `supabase/functions/_lib/rate-limit.ts`
- `supabase/functions/_lib/auth.ts` (its only import is the remote supabase-js)
- `supabase/functions/_lib/sibling-state.ts`
- `supabase/functions/_lib/tuition-session.ts`
- `supabase/functions/_lib/enrollment-discounts.ts`
- `supabase/functions/_lib/invoice-status.ts` (NEW - a deploy without it fails at boot)

None of the `_lib` files imports another local file. Nothing else imports `_lib/invoice-status.ts` (grep: the function, the test, run.mjs). `calculate-tuition-bulk` has its own copy of the pricing, imports auth / sibling-state / tuition-session / enrollment-discounts, writes no invoice and only reports the stored labels (`:392-393`): unaffected, no redeploy. No migration. The response shape is unchanged, so no client is ahead of or behind the deploy; no publish is needed.

**P0, before deploying (read-only):** the read now selects `status, confirmation_status, review_flags, confirmed_at, confirmed_by` and FAILS the call if the read errors, where before a failed read was ignored. If any of those columns were missing in production every tuition call would return 400. They are in `types.ts:1985-2002` (generated from the live schema) and from the same year-old migration as `confirmation_status`, so this is expected to pass - but check: `GET /rest/v1/invoices?select=status,confirmation_status,review_flags,confirmed_at,confirmed_by,tuition_frozen&limit=1` with the publishable key must answer 200 (an empty list is fine), not 400 / 42703.

Post-deploy, read-only:
1. The deployed source of `calculate-tuition` contains `invoice-status` and the string `Unable to read the current tuition invoice`.
2. Open any tuition screen for a child, then: `SELECT status, confirmation_status, updated_at FROM invoices WHERE student_id = ... AND month = ...` twice around a reload - `updated_at` moves, the two labels do not.
3. Owner SQL query 4 restricted to `occurred_at > <deploy time>`: `resets_with_no_figure_change` must be 0. Query 5 restricted the same way: 0 rows.
4. Function logs: no burst of 400 `Unable to read the current tuition invoice`.

Behavioural check for the owner: in Tuition review, confirm one child's bill; open that child's tuition page, come back and reload the queue. The bill is still under Confirmed (before: it was back under Auto-approved / Needs review).

---

## What admins will notice

- Confirmed bills stay confirmed; the review queue stops refilling with bills already dealt with.
- When a confirmed bill's figures really change (a cancellation, an attendance edit, a discount), it comes back to review with a "Changed after confirmation" badge - and, until m-1 is published, under a group headed `changed_after_confirmation`. The old and new amounts are not shown on screen yet.
- **More cancellations of taught lessons will ask for a correction reason**, because a confirmed or paid bill now stays "settled" for the guard.
- Status badges (Recorded Payment Manager, cancel-override review, student audit) start to say `paid` / `partial` instead of always `issued`; a part payment through Smart Family Payment can read `paid`; a bill can keep `paid` after its payment is deleted or edited; bills paid before the deploy keep saying `issued`. Amounts owed are unaffected.
- An admin-set status in Invoice Status Manager now sticks.
- Payment Integrity Repair will list a different set of "incorrect status" rows.
- Rarely: a tuition screen shows "Unable to read the current tuition invoice"; reloading fixes it. Before, that moment silently saved a payment of 0.

## Checked and found sound

- No figure line touched; golden regenerated from 736264c by me and identical; 18 fixtures x (first, repeat) byte-identical, other months' rows included.
- Frozen bills: figures kept by the function and the trigger; labels now kept too. Sibling unresolved / preview: still no write. Payment-month confirmation, cancelled-lesson rules, the guard SQL: untouched by the diff.
- No historical row is rewritten: `status` is never set on an existing bill except `draft -> issued` (as before), `confirmation_status` only for bills that are not confirmed, or whose figures changed.
- Fail closed on the unreadable bill, tested and mutation-proof; every internal caller already handles the error.
- Numeric comparison exact (integer columns, rounded discounts).
- The flag keeps the first confirmed figures across recalculations and never re-confirms by itself.
- Owner SQL is SELECT-only and nameless. AGENTS.md text accurate.
- Bulk function unaffected; nothing else imports the new module.

## Not checked

- Anything against the live database or the deployed function (no Supabase access by instruction): whether production has the five columns (P0), how many bills query 1-6 return, and which role the function's client writes as in production.
- PostgREST's real upsert (columns omitted from the payload are left alone on conflict) - the suite's stand-in builds `ON CONFLICT ... DO UPDATE SET` from the payload keys, which is what PostgREST does, but it is a stand-in.
- The guard functions end to end against the new label behaviour (m-5): their stand-in still imitates the old reset.
- Deno type-check of the real remote imports (the local check stubs them).
- The browser payment dialogs beyond reading their status rule; `ai_action_apply` beyond the cited lines.
- The owner questions (policy) - not mine to decide; my view: defaults 1-5 as recommended in the evidence file are reasonable, and question 2 ("should `paid` be re-derived") should be answered together with M-1.

## Executed

| command | result |
|---|---|
| `node scripts/pgtest/invoice-status.test.mjs <4 migrations>` (fixed function) | 108 passed, 0 failed |
| the same with `T1_HANDLER_SOURCE=<736264c copy> T1_WRITE_GOLDEN=1` | 77 passed, 31 failed; Figures section 0 failed; golden rewritten = committed golden (line endings only) |
| `node .probe/mutate.mjs` (17 mutations + control) | 15 caught, 2 survived (table in 6) |
| `node scripts/pgtest/run.mjs` (full), suites that touch tuition | family payment month 6/0, dated enrollment discounts 22/0, invoice status 108/0, cancelled lessons 25/0, session held evidence 143/0, session cancel guard 266/0, session guard functions 135/0, shared-module mirrors 13/0, edge functions typecheck 5/0 - the same totals the author recorded |
| the rest of that full run | all passing: **2873 assertions across 37 suites, 0 suite(s) failed** (the total the author predicted but had not observed in one run) |

**Where I am / next step:** review complete; nothing left to do.
