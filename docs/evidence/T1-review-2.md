# T1 review, round 2 (independent money reviewer)

Reviewed commit: 36c6af1 (`worktree-agent-ab1ade20b08d798c9`) against `claude/hec-conductor-setup-efbaa5`. Review only: no product code changed, nothing deployed or pushed. Live database read with aggregates only (no names, no rows).

Where this file lives: my session runs in the conductor's own worktree, so I did NOT detach its HEAD. The reviewed commit was read and tested in a separate checkout (`.claude/worktrees/t1r2`, detached at 36c6af1); this file is committed on `claude/hec-conductor-setup-efbaa5`, one file, nothing else staged.

**Where I am / next step:** sections 1-3 written. Next: 4 (M-2), 5 (family-payment), 6, 7 (suites), 8.

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
