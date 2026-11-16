# OVERPAYMENT credit-next-bill - independent review

**Verdict: SHIP WITH CHANGES - nice-to-have only, no blocker.** The money is right in every case I could build: the whole payment lands once (payment row = allocations = cash/bank debits = what the bills gained), the ledger pair balances, `carry_out_credit` equals the extra, the label is `paidLabel`'s, the next bill's payable falls by the extra, frozen and confirmed bills keep their charged figures and their confirmation, and delete-payment reverses new payments with an extra and old payments with an unapplied-cash pair. The nice-to-haves are wording that is untrue in two corner cases, one test case the builder replaced that should come back, and pre-existing issues this change did not cause.

**Where I am / next step:** review done. Next (conductor): run the read-only SQL in section 5 on live, deploy as the builder's section 6 says, and decide on the nice-to-haves.

Reviewer only: nothing deployed, pushed or applied; pglite only; no live database; no real user data.

## 0. Tree

`git checkout -B review-overpay b0c8f862 && git merge --no-edit claude/hec-conductor-setup-efbaa5` merged `af5fcf81` with **no conflict** (merge commit 954146ef). While I reviewed, the conductor branch moved on to `16c90330` (the rich-text editor rebuild). Those commits touch none of this change's files (`git diff --name-only af5fcf81 16c90330` has no payment, invoice, `supabase/` or `run.mjs` path), and `git merge-tree` merges them cleanly. Everything below ran on the af5fcf81 merge.

Scope check: `git diff 4cd6151e b0c8f862 --stat` is 9 files: the two functions, the three screens, `invoice-status.test.mjs`, `removed-money-features.test.mjs`, `run.mjs` (expect 35 -> 37) and the evidence file. Nothing under `supabase/functions/_lib`, `calculate-tuition(-bulk)`, `delete-payment`, `settle-bill` (still the 410 stub), `supabase/migrations` or `scripts/pgtest/fixtures` (golden) changed.

## 1. Findings (one line each)

Money (all hold):

| # | What | Where | Evidence |
|---|---|---|---|
| M1 | The leftover is folded into one child's allocation before the first write: one allocation row, one DR CASH/BANK / CR AR pair, one compare-and-set; payment = allocations = debits | `family-payment/index.ts:221-248,313-366`; `smart-family-payment/index.ts:196-229,260-383` | builder's suite; probes P3, P4 |
| M2 | Frozen bill (saved total 350,000 vs live 400,000), 500,000 paid: base/discount/total unchanged, `recorded_payment` 500,000, `carry_out_credit` 150,000, `paid`; next month payable 400,000 -> 250,000 - both functions | freeze trigger `20261106120000` keeps only charged figures | P1, P1b |
| M3 | Confirmed bill overpaid: stays `confirmed`, no `changed_after_confirmation` flag after two recalculations, charged figures unchanged; a confirmed NEXT-month bill only gains `carry_in_credit` | `_lib/invoice-status.ts` (charged figures compared only) | P2 (both functions), P2c |
| M4 | Two children, pro-rata and oldest-first, 1,000,000 against 800,000: first selected child 600,000 / credit 200,000, the other 400,000; deleting it restores both bills and reverses 4 legs, balanced | | P3, P3d |
| M5 | Manual split with money not split out: it goes on the first selected child (on top of their own typed amount) - money right | `family-payment/index.ts:240-247` | P3m |
| M6 | Smart, two children: the extra goes to the highest-debt child, who is also the child the screen names (same sort, same name order) | `smart-family-payment/index.ts:189,227`; `SmartFamilyPaymentModal.tsx:189,547`; `BatchFamilyPaymentModal.tsx:203,535` | P4 |
| M7 | Old payments: an allocation plus a `family-credit-` / `smart-family-credit-` pair is still deleted whole: 400,000 off the bill, all four legs reversed including the CREDIT leg | `delete-payment/index.ts:41-45` (unchanged) | P6 (both key families) |
| M8 | Deleting a payment with an extra takes the next month's carry-in credit away again | | P8 |
| M9 | Ledger: the new pair is balanced and identical to a Manual split of the same money (builder's assertion); in the OLD rows the leftover was DR AR / CR CREDIT with no cash leg, so CASH/BANK was short by every past leftover - not changed here, counted by the SQL in section 5 | | builder's suite; `git show 03cc9ec0` shows the same old keys |
| M10 | Compare-and-set under concurrency (a second payment landing between read and write): neither lost, both functions | `_lib/recorded-payment-write.ts` (unchanged) | builder's suite |
| M11 | Payment month still enforced: both functions refuse a body with no `month`, nothing written; the three screens still gate on `useTuitionMonthConfirmation` | `SmartFamilyPaymentModal.tsx:80,230`; `FamilyPaymentModal.tsx:68`; `BatchFamilyPaymentModal.tsx:87,260`; `FamilyPaymentModal.tsx:198` | P7b |
| M12 | D4 guards: `zz_invoice_state_floor` (1a) records only lowerings (confirmation lost, recorded down, status leaving paid/partial, unfrozen); an overpayment raises `recorded_payment` and the carry trigger writes only carry columns, so nothing is recorded; a delete records as any delete does. 1b/3A put no trigger on invoices | `20261114090000_d4_floors.sql:640-695,727-729` | reading (no pglite probe with the floors installed) |
| M13 | No-bill case: family-payment refuses (no bill invented); smart-family-payment's insert takes base/discount/total only from the calculate-tuition response it already read - it prices nothing | `family-payment/index.ts:236-239`; `smart-family-payment/index.ts:152-176,359-374` | builder's suite |

Refusals (all before the first money write; P7a/P7c and the builder's cases): `voluntary_contribution` 400 before parse; `unapplied_cash` with an extra 400; no value with an extra 400; an old tab's `unapplied_cash` with no extra still pays (family: builder; smart: P7a). smart's `family_payment_initiated` audit row now comes after every refusal (`smart-family-payment/index.ts:233-247`). The only writes before a smart refusal are calculate-tuition's normal re-saves of each sibling's bill (as when a tuition screen opens; it does not write `recorded_payment`) - unchanged.

Nice-to-have (none blocks the deploy):

| # | What | Where | Probe |
|---|---|---|---|
| N1 | Pro-rata rounding: 1,000,000 over three children owing 400,000 each leaves a 1 VND rounding remainder that the function treats as "beyond what the bills owe": money right (all 1,000,000 on bills), but the response's `creditOnBill` and the ledger memo say 1 VND was kept as credit; with no value it is refused with "1 is more than the selected bills owe" (untrue); an old tab's `unapplied_cash` is refused as if it overpaid. Fix: leftover = amount minus total owed, and give the rounding remainder to a child who still owes | `family-payment/index.ts:176-188,221` | P5a, P5b, P5c |
| N2 | Manual split: money not split out is reported as "credit on the next bill" (response, memo, FamilyPaymentModal's sentence) even where the first selected child owes it; only the part above their bill becomes credit. FamilyPaymentModal is not mounted, so low impact | `family-payment/index.ts:221,313-325`; `FamilyPaymentModal.tsx:183-187,500-509` | P3m-wording |
| N3 | Test lost: the builder replaced T4 r2 "d2" (delete a payment WITH an unapplied-cash pair) with the new shape, so no suite now deletes an OLD-style payment. delete-payment is unchanged and works (P6), but put P6 back into `invoice-status.test.mjs` so a later delete-payment change cannot break the past rows silently | `invoice-status.test.mjs:1584-1598` | P6 |
| N4 | Smart / Batch name the child and the extra from balances read when the screen loaded; if a payment lands meanwhile, the function may credit a different child or amount than the screen said (money still on a family bill, Smart's toast reports what was done, Batch reports nothing). Could send the expected child and refuse a mismatch | `smart-family-payment/index.ts:189,227`; `BatchFamilyPaymentModal.tsx:286` | reading |
| N5 | (pre-existing) family-payment compares `method === 'cash'` but the screen sends `'Cash'`, so every Family Payment's cash debit goes to BANK; smart lower-cases | `family-payment/index.ts:306` | P9 |
| N6 | (pre-existing) smart's no-bill insert does not look at calculate-tuition's `siblingUnresolved`; when the family discount is unresolved it saves the calculator's interim figures (the next calculate-tuition save corrects them, and `recorded_payment` is kept). The extra can now reach this branch for a child who owes nothing | `smart-family-payment/index.ts:359-374` | reading |
| N7 | (pre-existing) payment and allocation inserts are unchecked and the paths are not one transaction: a failure on the second child leaves the first child's part recorded (the message says so); the extra is on the first child written | both functions | reading |

## 2. Probes

`docs/evidence/OVERPAYMENT-review-probes.mjs` (run: `node docs/evidence/OVERPAYMENT-review-probes.mjs`). It reuses the invoice-status harness unchanged (real family-payment, smart-family-payment, delete-payment, calculate-tuition, confirm-tuition; invoices a pglite table with the real confirmation, carry, audit and freeze migrations), adds a second and third priced child, and prints PROBE lines. A PASS on P3m-wording / P5b / P5c / P9 means the defect described is present.

Result: **24 passed, 0 failed** (P1 x2, P1b x2, P2 x2, P2c, P3 x2, P3d x2, P3m, P3m-wording, P4, P5a-c, P6 x2, P7a-c, P8, P9).

## 3. Counts

RUNCOUNTS

## 4. Old tab / new tab

| screen | function | extra | result |
|---|---|---|---|
| old (sends `unapplied_cash` always, Batch included) | new | none | pays (P7a, builder) |
| old | new | yes | 400 "...no longer kept as unapplied cash... reload", nothing written |
| new (`credit_next_bill` only when it showed the extra) | old | yes | old zod enum refuses, nothing written |
| new | new | the screen saw none, the function finds one | 400 "did not say where it goes", nothing written |

## 5. Read-only SQL for the owner (not run)

Counts and totals only - no names, no ids printed. Each past leftover is one transaction: a keyed DR AR leg (`family-credit-<payment>-<ms>` from family-payment, `smart-family-credit-<payment>-<ms>` from smart-family-payment) and an unkeyed CR CREDIT leg with the same `tx_id`. A leftover whose payment was later deleted has a `payment-reversal-<payment>-...` reversal.

```sql
-- READ-ONLY: past unapplied-cash leftovers. SELECT only; changes nothing.
WITH keyed AS (
  SELECT e.tx_id,
         e.debit::numeric AS amount,
         e.month,
         a.student_id,
         CASE WHEN e.tx_key LIKE 'smart-family-credit-%' THEN 'smart-family-payment' ELSE 'family-payment' END AS path,
         substring(e.tx_key FROM '^(?:smart-)?family-credit-([0-9a-fA-F-]{36})-') AS payment_id
  FROM public.ledger_entries e
  JOIN public.ledger_accounts a ON a.id = e.account_id
  WHERE e.tx_key LIKE 'family-credit-%' OR e.tx_key LIKE 'smart-family-credit-%'
),
flagged AS (
  SELECT k.*,
         EXISTS (SELECT 1 FROM public.ledger_entries r
                 WHERE r.tx_key LIKE 'payment-reversal-' || k.payment_id || '-%') AS reversed,
         EXISTS (SELECT 1 FROM public.payments p WHERE p.id::text = k.payment_id) AS payment_still_exists
  FROM keyed k
)
SELECT path,
       count(*)                                         AS leftover_rows,
       sum(amount)                                      AS total_vnd,
       count(DISTINCT payment_id)                       AS payments,
       count(DISTINCT student_id)                       AS children,
       min(month)                                       AS first_month,
       max(month)                                       AS last_month,
       count(*)    FILTER (WHERE reversed)              AS rows_reversed_by_delete,
       sum(amount) FILTER (WHERE NOT reversed)          AS total_vnd_still_standing,
       count(*)    FILTER (WHERE NOT payment_still_exists AND NOT reversed) AS rows_payment_gone_not_reversed
FROM flagged
GROUP BY path
ORDER BY path;

-- READ-ONLY: is every leftover transaction the expected balanced pair (DR AR / CR CREDIT)?
SELECT count(*)                                              AS transactions,
       count(*) FILTER (WHERE legs <> 2)                     AS not_two_legs,
       count(*) FILTER (WHERE total_debit <> total_credit)   AS unbalanced,
       count(*) FILTER (WHERE credit_codes <> 'CREDIT')      AS other_credit_account
FROM (
  SELECT e.tx_id, count(*) AS legs, sum(e.debit) AS total_debit, sum(e.credit) AS total_credit,
         string_agg(DISTINCT a.code, ',') FILTER (WHERE e.credit > 0) AS credit_codes
  FROM public.ledger_entries e
  JOIN public.ledger_accounts a ON a.id = e.account_id
  WHERE e.tx_id IN (SELECT tx_id FROM public.ledger_entries
                    WHERE tx_key LIKE 'family-credit-%' OR tx_key LIKE 'smart-family-credit-%')
  GROUP BY e.tx_id
) t;
```

`total_vnd_still_standing` is the money families paid that no bill and no CASH/BANK account shows. After the deploy the first query must not grow (nothing writes these keys any more).

## 6. Not checked

- Nothing against live or deployed functions; the live count of past leftovers (section 5 is for the conductor).
- The screens were not opened in a browser (type check, source assertions and reading only).
- The D4 invoice floor was checked by reading its trigger, not with the floors installed under the payment functions.
- The edge functions' Deno runtime itself (the harness bundles them for node, with the remote imports stubbed).
