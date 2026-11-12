# T1 review, round 2 (independent money reviewer)

Reviewed commit: 36c6af1 (`worktree-agent-ab1ade20b08d798c9`) against `claude/hec-conductor-setup-efbaa5`. Review only: no product code changed, nothing deployed or pushed. Live database read with aggregates only (no names, no rows).

Where this file lives: my session runs in the conductor's own worktree, so I did NOT detach its HEAD. The reviewed commit was read and tested in a separate checkout (`.claude/worktrees/t1r2`, detached at 36c6af1); this file is committed on `claude/hec-conductor-setup-efbaa5`, one file, nothing else staged.

**Where I am / next step:** complete - verdict at the end (PASS WITH CHANGES, no blocker). Section 7 sits after section 8 because the suites finished last.

## 1. History risk - measured on LIVE (12 Nov 2026, read-only, counts only)

What is live today: neither round is deployed (MASTER_PLAN.md:327 "NOT deployed", :337). The live calculate-tuition still writes `status: 'issued'` on every save, so today every bill that anyone opens is ALREADY relabelled `issued`. The `paid` / `partial` labels in the table are bills nobody has recalculated since a payment path labelled them.

Rule applied in SQL exactly as `paidLabel` (`_lib/invoice-status.ts:82-88`) with payable = `total_amount + carry_in_debt - carry_in_credit` on the stored row. Checked that the stored carry equals what the function computes itself (sum of earlier months' `recorded_payment - total_amount`, `calculate-tuition/index.ts:404-405, 487-489`): 0 of 708 bills differ, and the label is the same on both bases for all 708. Limit of the estimate: for a non-frozen bill the function reprices `total_amount` from the register at the moment it is opened; I can only use the stored total.

708 bills. `credit` label: **0**. 445 would get a different label at their next ordinary calculation:

| stored -> new | bills | before Nov 2026 | frozen | confirmed/adjusted |
|---|---|---|---|---|
| issued -> paid | 349 | 349 | 41 | 89 |
| issued -> partial | 64 | 64 | 3 | 32 |
| draft -> paid | 6 | 6 | 0 | 2 |
| draft -> partial | 2 | 2 | 0 | 1 |
| draft -> issued | 2 | 2 | 0 | 2 |
| partial -> paid | 13 | 13 | 0 | 0 |
| **paid -> issued** | **6** | 6 | 0 | 0 |
| **paid -> partial** | **3** | 3 | 0 | 0 |
| unchanged (issued 144, paid 106, partial 13) | 263 | 232 | 34 | 30 |

All 445 are in months before the current one (Nov 2026: 30 bills, 0 changes; Dec 2026: 1, 0). 44 of the 445 are `tuition_frozen` (all issued -> paid/partial). 126 are confirmed/adjusted (`confirmation_status` is not touched by this).

By month (changes / bills; then issued->paid, issued->partial, draft->any, partial->paid, paid->issued, paid->partial):

| month | changes/bills | i->paid | i->part | draft | part->paid | paid->i | paid->part |
|---|---|---|---|---|---|---|---|
| 2025-08 | 0/1 | | | | | | |
| 2025-10 | 27/53 | 10 | 8 | 5 | 4 | 0 | 0 |
| 2025-11 | 49/53 | 38 | 6 | 4 | 0 | 1 | 0 |
| 2025-12 | 25/51 | 16 | 6 | 1 | 0 | 2 | 0 |
| 2026-01 | 46/51 | 36 | 7 | 0 | 0 | 3 | 0 |
| 2026-02 | 36/50 | 31 | 5 | 0 | 0 | 0 | 0 |
| 2026-03 | 40/56 | 31 | 4 | 0 | 4 | 0 | 1 |
| 2026-04 | 43/58 | 38 | 5 | 0 | 0 | 0 | 0 |
| 2026-05 | 15/53 | 7 | 2 | 0 | 4 | 0 | 2 |
| 2026-06 | 0/11 | | | | | | |
| 2026-07 | 37/57 | 36 | 1 | 0 | 0 | 0 | 0 |
| 2026-08 | 50/58 | 48 | 2 | 0 | 0 | 0 | 0 |
| 2026-09 | 49/55 | 37 | 12 | 0 | 0 | 0 | 0 |
| 2026-10 | 28/70 | 21 | 6 | 0 | 1 | 0 | 0 |
| 2026-11 | 0/30 | | | | | | |
| 2026-12 | 0/1 | | | | | | |

The nine downgrades, looked at closely:
- **paid -> issued, 6** (2025-11: 1, 2025-12: 2, 2026-01: 3). Every one is a **zero-charge bill**: `total_amount` 0, payable <= 0, nothing recorded, `carry_out_debt` 0. Nothing is owed and no screen will say otherwise. None is confirmed or frozen. None has a Present/Absent/Late mark in its month, so no lesson's cancellation guard changes (section 3).
- **paid -> partial, 3** (2026-03: 1, 2026-05: 2). Each has money recorded but less than payable, and a `carry_out_debt` > 0 already stored: the tuition screens already show these as owing (their badge comes from the carry balance, `src/lib/tuitionStatus.tsx:14`, not from `status`). `paid` here was the cumulative-rule mistake of M-1. They stay "settled" for the guard (`partial`).
- **`paid` with a real charge and NOTHING recorded** (the case the brief fears: a hand-set `paid`, a write-off, a month covered by credit): **0** on live. Settlements ever made: 4 (2 discount, 2 voluntary contribution, 3 bills); all three bills are `issued` today and stay `issued`; none shows debt.

Who reads `status`: no screen takes an amount owed, a badge shown to a family, or a filter of who to chase from it. The tuition badges come from carry-out (`tuitionStatus.tsx`); `status` is printed only in `RecordedPaymentManager.tsx:328`, the cancel-override review and student audit (admin), judged in `PaymentIntegrityRepair.tsx:63`, and read by the guard SQL. No edge function branches on the stored label any more (grep for `'paid'` in `supabase/functions`: only `family-payment/index.ts:107`, which applies the helper to the bill's money).

**Verdict on the rule as built: safe to deploy on today's data. No narrowing is required before release; one narrowing is recommended (not blocking).**
- It is not a rewrite of history in the sense of the hard rule: no figure, payment, carry or confirmation changes; and it replaces a live behaviour that rewrites every opened bill's label to `issued`. 436 of the 445 changes move a label TOWARDS the money (349 fully paid bills stop reading `issued`).
- The dangerous class (settled bill with nothing recorded flipped to issued, family chased) has zero members on live.
- What remains true and should be told to the owner: after this release a `paid` set by hand in Invoice Status Manager lasts only until the bill is next opened - as it does today. If the owner wants a hand-set `paid` to stick, that needs a marker of who set it, not this release.
- Recommended narrowing, cheap and optional: a zero-charge month with nothing owed should not go `paid -> issued` (6 bills) - simplest is to leave `status` alone when `total_amount = 0` and nothing is recorded. Label only; no guard or money effect either way.
- Audit trail: 445 one-off `status` updates will appear in `audit_log` as bills are opened. Expected, not drift.

## 2. "A month fully covered by carried-in credit reads issued"

It matches what every existing writer does, so the helper is consistent, not new:
- `RecordPaymentDialog.tsx:91-97`: `if (newTotalPaid >= payable && payable > 0) { newStatus = "paid"; } else if (newTotalPaid > 0) { newStatus = "partial"; } else { newStatus = "issued"; }`
- `QuickPayPanel.tsx:126-128` and `BatchPaymentDialog.tsx:98-100`: `if (newTotalPaid >= payable && payable > 0) newStatus = "paid"; else if (newTotalPaid > 0) newStatus = "partial"; else newStatus = "issued";`
- `ai_action_apply` (`20261107090000:573-574`): `CASE WHEN v_total >= v_payable AND v_payable > 0 THEN 'paid' WHEN v_total > 0 THEN 'partial' ELSE 'issued' END`; undo `:728-729` the same with `v_left`.

So with payable <= 0 and nothing recorded all four say `issued`. Is it CORRECT? As a label for "money was recorded in this month": yes. As a label a person reads as "this family still owes": no - and there is a second, worse corner the evidence does not mention: **payable <= 0 with money recorded reads `partial`** (credit covers the month and the family paid again; an overpaid bill). On live: credit-covered-reads-issued 4 bills (2026-09: 1, 2026-10: 2, 2026-11: 1); covered-or-overpaid-reads-partial **11** bills (2025-10: 2, 2025-11: 1, 2026-02: 1, 2026-08: 1, 2026-09: 2, 2026-10: 2, and 2 more; all 11 have `carry_out_debt` 0). `partial` on a bill in credit is the more misleading of the two.

Judgement: keep for this release (one rule everywhere beats a fifth variant; the dialogs would have to change with it, and src is out of scope). Not a blocker because nothing owed is read from the label. Owner question R2-1 should be widened: "a bill with nothing left to pay (carry-out debt 0) reads `paid`" is what a person expects; it is one change in `paidLabel` plus the three dialogs and the SQL `CASE`, as its own release.

## 3. Cancellation guard under the new labels

Guard (unchanged SQL, `20261112091000:307-319`, and the un-cancel twin `:608-611`): settled when `recorded_payment > 0 OR status IN ('paid','partial') OR confirmation_status IN ('confirmed','adjusted') OR tuition_frozen`.

- By construction the new label can lower the guard only where `status` was `paid`/`partial` with `recorded_payment = 0` on a bill neither confirmed nor frozen: `paidLabel` returns `issued` only when nothing is recorded (`invoice-status.ts:85-87`), and a bill with money recorded is settled by the first clause whatever the label. `paid -> partial` never lowers it.
- Measured on live: settled today 612 bills, settled after 606. The 6 lowered are the zero-charge `paid -> issued` bills; **0 of them has a Present/Absent/Late mark in its month**, so `session_month_tuition_settled` answers the same for every lesson before and after. Raised: 0 (every `issued -> paid/partial` bill already has `recorded_payment > 0`).
- Against what is live today the guard gets STRONGER: the live function resets `status` to `issued` and `confirmation_status` to auto/needs_review at each view; after the release a confirmed bill stays confirmed.
- Going forward, the one weakening relative to round 1: a `paid` set by hand (Invoice Status Manager) or left by a settle-bill write-off with nothing recorded no longer holds the guard after the next calculation. Under round 1 it would have; on live it does not. To protect such a bill the admin confirms or freezes it - both survive. Acceptable; say so in the admin notes.
- The implementer's changed assertion ("a paid label with nothing recorded is corrected to issued") is accurate about the code and harmless on live data.

## 4. M-2 - can a payment still be lost or zeroed?

Writers of `invoices.recorded_payment` in `supabase/functions` at 36c6af1 (grep): `family-payment/index.ts:269`, `smart-family-payment/index.ts:284` and `:297` - all three add to it. calculate-tuition no longer names the column in either save: full payload `calculate-tuition/index.ts:609-623`, fallback `:647-658`. (`:712` is a field of the JSON answer, not a write.) PostgREST's upsert sets only the columns in the payload, so on conflict the stored payment is left alone.

- New bill: the column default applies. Checked on LIVE, not only in the migration: `recorded_payment` default `0`, and 0 of 708 bills hold NULL. Same value as was written before.
- Race, payment lands between read (`:139-147`) and save (`:635`): the save carries stale `carry_out_*` and `paid_amount`, but `invoices_carry_sync` is an AFTER INSERT OR UPDATE row trigger that recomputes the student's whole carry chain from the rows themselves (`20261009120000`, `refresh_invoice_carry`); it is present and enabled on live. So the carry is right when the statement ends. `paid_amount` stays stale until the next calculation; nothing owed is read from it (but see 8.1: settle-bill reads it).
- Race, payment creates the bill in the gap: the payment survives; the calculation, having read "no bill", writes `status: issued` and a fresh `confirmation_status` (`invoice-status.ts:133`). Label only, corrected by the recalculation every payment path runs afterwards; the guard holds anyway through `recorded_payment > 0`.
- Label race the evidence does not list: a calculation that read `issued` with 100,000 recorded (every part-paid bill, the first time it is opened after the deploy) will write `partial`; if a payment completes that bill in the gap, `partial` lands over the payment's `paid`. Money intact, guard intact (`partial` counts), next calculation corrects. MINOR.
- Fail closed still holds: `:158` (the month's bill) and now `:162` (earlier months) throw before any write; unresolved sibling state and `siblingPreview` still skip the save (`:628`).
- Executed: suite cases at `invoice-status.test.mjs:955-990` (no save mentions the column, fallback included; payment mid-calculation survives with carry-out 0; payment creating the bill survives with carry-out debt 200,000).
- NOT closed, and not claimed closed: the payment functions themselves read `recorded_payment` and write back read + applied (`family-payment:264-269`, `smart-family-payment:275-284`), so two payments for one child and month at the same instant can lose one. Pre-existing, unrelated to calculate-tuition, needs an atomic increment (SQL). Follow-up, not a blocker.

Verdict: M-2 is closed for calculate-tuition. No path in this diff lowers or zeroes a payment.

## 5. family-payment selection

`family-payment/index.ts:92-107`: reads the bills of the selected children for exactly the posted month (`.eq('month', month)`; `month` is required by the schema, `:58`), then keeps those where `invoicePaidLabel(inv) !== 'paid'` - monthly `recorded_payment` against `total_amount + carry_in_debt - carry_in_credit`. Cumulative `paid_amount` is not read anywhere in the function (grep: no occurrence).

| bill | selected? | right? |
|---|---|---|
| 400,000 charge, 100,000 credit in, 300,000 recorded | no | yes - this is the case the review's "drop the filter" would have overcharged |
| stored label `paid` but only part recorded | yes | yes (was skipped while the ledger entry was still posted) |
| frozen, saved total 810,000, 400,000 recorded | yes, against the saved total | yes |
| confirmed target month | only that month is read | yes; the client side (`FamilyPaymentModal.tsx:64`, `useTuitionMonthConfirmation`) is unchanged |
| credit in covers the month, nothing recorded | **yes** | no: `owed = total - recorded` (`:134, :169, :262`) ignores the credit, so the full charge is taken again and becomes credit carried out |
| 300,000 debt in, the month's 400,000 recorded | **yes**, with `owed` 0 | no: nothing can be applied to carried-in debt; a zero allocation row and zero ledger pair are written, the money falls to "leftover" |

The last two rows are the `owed` arithmetic, which this round did not touch and which behaved the same under the old filter (those bills read `issued`). Money is not lost in either (it ends as credit or leftover) but it is put in the wrong place. The implementer's "no zero-amount allocation rows are created" is true for a paid bill, not for the debt-carried-in row. `FamilyPaymentModal` is not mounted (grep `<FamilyPaymentModal` in `src`: none; the mounted family screen is `BatchFamilyPaymentModal.tsx:273` -> smart-family-payment), so this is latent. Fix before anyone mounts it: `owed = max(0, monthPayable(inv) - recorded)` in the three places. Not a blocker.

smart-family-payment (the mounted one): allocates from calculate-tuition's carry-out (`:153-154`), labels with `invoicePaidLabel(invoice, newRecorded)` (`:283`) and, on a missing row, `paidLabel(applied, debt - credit)` (`:300`) - correct: with no row nothing is recorded, so carry-out is the payable.

Small inconsistency: calculate-tuition never replaces an admin's `credit`; the four payment functions write the derived label over it (`family-payment:270`, `smart-family-payment:283`, `settle-bill:194`, `delete-payment:139`). Live bills labelled `credit`: 0. MINOR.

## 6. Pricing, confirmation, frozen figures, golden

- Browser: the only `src` change in `git diff claude/hec-conductor-setup-efbaa5...36c6af1` is one string in `TuitionReviewQueue.tsx:146`. No arithmetic.
- `confirmed`: the only writer of `confirmation_status` outside the helper is `confirm-tuition/index.ts:57`; the helper can only produce `auto_approved` / `needs_review` (`invoice-status.ts:100, 133, 147, 172, 180`). The new block in confirm-tuition (`:66-81`) updates `review_flags` only, after the confirmation, and a failure there is logged, not thrown.
- Frozen: calculate-tuition still takes the saved base, discount and total (`:393-397`), the label is judged on that saved total, and `keep_frozen_invoice_amounts` (enabled on live) pins the four figure columns regardless. `status` is not one of the pinned columns, so a frozen bill's label follows its payment - intended; 44 frozen bills on live go issued -> paid/partial.
- Golden: `git diff claude/hec-conductor-setup-efbaa5...36c6af1 -- scripts/pgtest/fixtures` is empty; `git log -- scripts/pgtest/fixtures/tuition-figures.golden.json` shows one commit, 4cbe742 (round 1, generated from the old function).
- No migration in the diff.

## 8. The implementer's "stopped on" list - does each block this release?

| # | item | blocks? | why |
|---|---|---|---|
| 1 | settle-bill takes the balance it may write off from cumulative `paid_amount` (`settle-bill/index.ts:85-88`) | **No** | Pre-existing and byte-identical in this diff (only the select list `:79` and the label `:194` changed). It refuses a real debt for a family with history, and for the same reason can read a phantom credit for "voluntary contribution" (`:201-205`). Both post to the ledger only; no bill figure moves. Live use: 4 settlements ever, last 7 Oct 2026. Its own change, soon: balance = the bill's carry-out. |
| 2 | a write-off never changes the bill's balance, so the bill is never `paid` | **No** | Same as live (the live function resets the label to `issued` right after settle-bill's own recalculation, `:276`). The new label is the honest one: the bill's carry columns still show the debt. Owner decision R2-2 (where a write-off lives on the bill) - it moves balances, so it must not ride in this release. |
| 3 | delete-payment never lowers `recorded_payment`; finds only `payment-<id>` ledger keys | **No**, but tell the owner | Pre-existing. After a delete the bill still shows the money as paid. The label is now truthful about the bill (`paid` while the money is still recorded) where the old code said `draft`/`paid` by the cumulative figure - so the one visible hint that something was deleted is gone. Mounted in `LedgerBalanceInspector.tsx:182`. Until R2-3 is built: a payment is taken off a bill in Recorded Payment Manager, not by deleting it here. |
| 4a | `PaymentIntegrityRepair` judges and rewrites `status` by cumulative `paid_amount`, writes `draft` (`:46-70`, `:134-152`), mounted in `AutomationTab.tsx:178` | **No** for the functions; **do not press Repair** | It already lists nearly every bill today (it never expects `issued`, and live is nearly all `issued`). After the release it lists a different large set. Pressing Repair writes labels only (no amount), which the next calculation re-derives; in between, a `draft` on a paid bill is still settled for the guard through `recorded_payment`. Fix in the next publish: use the helper's rule or remove the status check. |
| 4b | `InvoiceStatusManager` sets any label by hand | **No** | A hand-set `paid` / `partial` / `issued` / `draft` lasts until the next calculation (as on live); `credit` sticks. Live has 0 `paid` bills that depend on a hand-set label (section 1). Add one line of help text in the next publish. |
| 4c | review queue omits `adjusted`; before/after amounts not shown on the card | **No** | Display only; m-7 / m-1 remainder. |
| 5 | T3's suite asserts the new fields absent | **No - already resolved** | `worktree-agent-a34c3c84114092f37` is now built ON this commit (36c6af1 is its ancestor; 132c0fd "suite updated to the new calculator answers") and asserts `carry.payable` and `siblingUnresolved` present (`tuition-prior-balance.test.mjs:218-232`). Merge T1 r2 first, then T3. Note T3 r2 changes `calculate-tuition-bulk/index.ts` again (paging): if T3 ships in the same release, deploy the bulk function from the T3 commit, once. |

None of the five blocks. Items 1-3 are real money-handling defects that predate T1 and deserve their own reviewed change each; this release neither widens nor hides them, except the lost hint in item 3.

## 7. Suites, run by me at 36c6af1 (separate checkout, node_modules linked by junction and the link removed with `cmd /c rmdir` afterwards; the real folder is intact)

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **3148 assertions across 39 suites, 0 suite(s) failed** - the implementer's total exactly |
| in that run | invoice status 187/0, family payment month 6/0, dated enrollment discounts 22/0, cancelled lessons 25/0, session held evidence 143/0, session cancel guard 266/0, session guard functions 135/0, shared-module mirrors 13/0, edge functions typecheck 5/0, app typecheck 3/0 |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json --listFiles` | exit 0, 0 `error TS`, 877 files under `src/` loaded (not an empty check) |

Not run: a mutation pass (round 1's surviving mutant has its test now, `invoice-status.test.mjs` m-3 case); nothing against the deployed functions.

Live reads made (all aggregates, `SELECT` only): label transition counts, by month; carry consistency; settlements by type; guard before/after; column defaults and trigger list of `invoices`.

---

# VERDICT: PASS WITH CHANGES

No blocker. The changes are conditions on the release and follow-ups, not code that must change first.

## Findings

MAJOR: none.

MINOR
- R2-m1. `payable <= 0` with money recorded reads `partial`, and with nothing recorded reads `issued` (section 2). 11 + 4 live bills. Consistent with every other writer; misleading to a person. Own change with the dialogs.
- R2-m2. Six zero-charge bills go `paid -> issued` (section 1). Harmless; optional one-line narrowing.
- R2-m3. family-payment's `owed` ignores carry-in (section 5): credit-covered bill charged again, carried-in debt cannot be paid, zero allocation rows. Pre-existing, function not mounted. Fix before mounting.
- R2-m4. Payment functions overwrite an admin's `credit` label; calculate-tuition does not (section 5). 0 live.
- R2-m5. Label race: a concurrent calculation can write `partial` over a just-saved `paid` (section 4). Self-heals.
- R2-m6. Payment functions read-then-write `recorded_payment` (section 4): two simultaneous payments on one bill can lose one. Pre-existing; needs an atomic increment.
- R2-m7. `PaymentIntegrityRepair` is mounted and rewrites labels by the cumulative rule (section 8, 4a). Do not press Repair until it is changed.
- R2-m8. Evidence wording: "no zero-amount allocation rows are created" holds for a paid bill only; and the AGENTS.md sentence "the payment dialogs and `ai_action_apply` state the same rule" is accurate.

## Conditions on the release
1. Deploy all seven functions in one sitting, calculate-tuition first: **calculate-tuition, smart-family-payment, family-payment, settle-bill, delete-payment, confirm-tuition, calculate-tuition-bulk**. Each needs `_lib/invoice-status.ts` uploaded with it (a function deployed without it fails at boot). delete-payment matters most after calculate-tuition: it does not recalculate, so the old copy would leave a cumulative-rule label standing. If T3 ships in the same release, take calculate-tuition-bulk from the T3 commit.
2. One publish for the queue heading (`TuitionReviewQueue.tsx:146`); order relative to the functions does not matter.
3. No migration.
4. Tell the owner before the deploy: about 445 old bills will change label as they are opened (413 issued -> paid/partial, 13 partial -> paid, 10 drafts, 9 downgrades of which 6 are zero-charge bills and 3 already show a debt); no amount changes; do not use Payment Integrity Repair; a hand-set `paid` still does not stick; deleting a payment does not take it off the bill.
5. After the deploy, read-only: re-run the section 1 transition count once a few tuition screens have been opened - `paid -> issued` must stay at 6 or fall, never rise; `audit_log` must show no `recorded_payment` lowered by the service role.

**Where I am / next step:** review complete; nothing left to do.
