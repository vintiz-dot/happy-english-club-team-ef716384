# T3 - prior balance on the admin tuition list (D-15)

**Where I am / next step:** COMPLETE, awaiting review. Nothing pushed or deployed. Not done by design: one figure (Payable) is still added in the browser from the calculator's own figures, because the calculator returns none - see "Stopped on".

## Summary

- The two sources CAN disagree (1c): the browser used the SAVED charge for the month (0 when there was no bill row), read the whole school's history in one request, and never knew a debt was settled in a later month.
- Fix: `/tuition` now shows `calculate-tuition-bulk`'s figures, fetched through the same code as the Finance tab. It reads no invoice row and does no arithmetic on money.
- Stopped on: neither calculator returns a payable. Field wanted: `carry.payable` in both responses.

Branch `worktree-agent-a34c3c84114092f37`, reset to `claude/hec-conductor-setup-efbaa5` (304bfd9) and merged with the R09 restyle branch `worktree-agent-a7ffca465dcc98572` (no conflict). Line numbers below are as of that merge (6765613).

## 1a. What AdminTuitionList computes today

`src/components/admin/AdminTuitionList.tsx`, used only by `src/pages/Tuition.tsx:38` when `role === "admin"`. Routes: `/tuition` (`src/App.tsx:166`, any signed-in role; admins get this list, teachers "Access denied", students/families their own bill) and `/students/:id/tuition` (`src/App.tsx:131`, admin only; same page, the `:id` is ignored, so it is the same whole-school list).

It never calls the calculator. Five PostgREST reads as the admin, then arithmetic:

| Quantity | Code (line) | From |
|---|---|---|
| roster | `fetchStudentsInMonth(month)` (43) | every student on the roster in the month, enrolled or not |
| this month's charge | `currentCharges = invoice?.total_amount \|\| 0` (107) | STORED `invoices.total_amount` for the month; 0 when there is no row |
| paid this month | `recordedPayment = invoice?.recorded_payment \|\| 0` (108) | stored `invoices.recorded_payment` |
| priorBalance | `priorBalanceMap.set(id, cur + (inv.recorded_payment \|\| 0) - (inv.total_amount \|\| 0))` (99-103) over `invoices ... .lt("month", month).in("student_id", allStudentIds)` (93-97) | ONE unpaged, unordered query for the whole school's history |
| credit / debt | `carryInCredit = priorBalance > 0 ? priorBalance : 0; carryInDebt = priorBalance < 0 ? -priorBalance : 0` (124-125) | split in the browser |
| Payable | `finalPayable = currentCharges + carryInDebt - carryInCredit` (127) | sum in the browser |
| carry-out | `Math.max(0, recordedPayment - finalPayable)` / `Math.max(0, finalPayable - recordedPayment)` (128-129) | clamp in the browser |
| Balance | `balance: finalPayable - recordedPayment` (146) | difference in the browser |
| Prior Bal. cell | `priorNet = (item.carry_in_debt \|\| 0) - (item.carry_in_credit \|\| 0)` (321), shown at 407 | difference in the browser |
| status badge | `getPaymentStatus({carryOutDebt, carryOutCredit, totalAmount, monthPayments, settledInMonth: item.settled_in_month})` (233-242) | browser carry-out; `settled_in_month` is never set on these rows, so "Settled in <month>" can never show |
| filter chips / filters | same `getPaymentStatus` without `settledInMonth` (164-173, 189-210) | browser carry-out |
| sort by balance | `Math.abs(b.balance) - Math.abs(a.balance)` (222) | browser balance |
| Review Queue count, confirmation filter | `item.confirmation_status` (213-215, 266-268) | NOT on the row at all (the row is built at 131-155 without it): the badge never shows and choosing any confirmation filter empties the list. Not money; reported, not changed. |
| Record Pay | passes the row to `RecordPaymentDialog` (339-344) | the dialog reads `item.finalPayable`, `carry_in_*`, `total_amount` and WRITES the invoice from them (`RecordPaymentDialog.tsx:36-43, 90-128`); it then refreshes only the `["admin-tuition-live", month]` cache (154-176), which this list does not use, so `/tuition` does not update after a payment |

There are no totals rows on this screen.

The comment at 110-122 says the stored `carry_*` columns are stale snapshots. That stopped being true with `supabase/migrations/20261009120000_keep_invoice_carry_balances_correct.sql` (see 1b); whether that migration is applied on the live database cannot be told from the repo.

### Every tuition screen: where prior balance / payable / balance come from

| Screen (file) | Reached by | Source of the figures | Own arithmetic on money |
|---|---|---|---|
| `admin/AdminTuitionList.tsx` | admin `/tuition`, `/students/:id/tuition` | raw `invoices` rows | ALL of it (table above) - the defect |
| `hooks/useLiveTuitionData.ts` (feeds the four below + QuickPayPanel) | admin Finance tab | `calculate-tuition-bulk` | `finalPayable: totalAmount + carryInDebt - carryInCredit` (142); `balance: carryOutDebt - carryOutCredit` (143); `priorBalance: carryInCredit - carryInDebt` (148). Over the calculator's own figures, but sums/differences in the browser |
| `admin/AdminTuitionListEnhanced.tsx` | Finance tab > Tuition | the hook | totals: `totalBilled = sum finalPayable` (67), `totalCollected = sum recorded_payment` (68), `totalOutstanding = sum Math.max(0, balance)` (69), `collectionRate` (70); sort `Math.abs(b.balance) - Math.abs(a.balance)` (165) |
| `admin/tuition/TuitionStudentCard.tsx` | Finance tab (card view) | the hook's row | `priorNet = carry_in_debt - carry_in_credit` (57); "Adjusted" diff (223) |
| `admin/tuition/TuitionStudentTable.tsx` | Finance tab (table view) | the hook's row | none (displays `finalPayable`, `balance`) |
| `admin/tuition/TuitionSummaryCards.tsx` | Finance tab | `stats` prop | none (formats the totals above) |
| `admin/QuickPayPanel.tsx` | Finance tab | the hook | `Math.max(0, finalPayable - recorded_payment)` (61, 77), sums (86, 330), and it writes invoices + patches carry-out in cache (193-204) |
| `admin/RecordPaymentDialog.tsx`, `BatchPaymentDialog.tsx` | from both lists | the row handed to them | outstanding / new balance / carry-out (`RecordPaymentDialog.tsx:36-43, 156-158`; `BatchPaymentDialog.tsx:43, 165-171, 330-334`); they WRITE invoices |
| `admin/FinanceSummary.tsx` via `hooks/useFinanceOverview.ts` | Finance tab header | `calculate-tuition-bulk` (live) and `monthly_finance_snapshots` (closed) | `finalPayable = totalAmount + carryInDebt - carryInCredit` (113), school totals (115-128) |
| `hooks/useFinanceSummary.ts` (`admin/OverviewStats.tsx`) | admin overview | raw `invoices` rows for the month | sums of base/discount/total/recorded_payment (39-42); no carry |
| `admin/StudentTuitionOverview.tsx` | NOT imported anywhere (dead) | `calculate-tuition` per student, bounded sibling retry | none (displays `carry.carryOutDebt/Credit`) |
| `student/StudentTuitionTab.tsx` via `hooks/useStudentMonthFinance.ts` | admin `/students/:id` (StudentDetail), and the family `/tuition` page reads the same hook | `calculate-tuition`, bounded sibling retry (`useStudentMonthFinance.ts:202`) | "Total payable" `totalAmount + (carryInDebt - carryInCredit)` (`StudentTuitionTab.tsx:427`); signed balance `-(carryOutCredit)` (536-538, hook 163-166). Family `/tuition` (`pages/Tuition.tsx:82-100`) only displays |
| `student/PriorBalanceBreakdown.tsx` | inside StudentTuitionTab | calculator's `priorBalanceBreakdown` merged with `monthly_finance_snapshots` | re-derives per-month net and the summary (72-76, 112-, 156) |
| `student/StudentLedger.tsx` | StudentWallet | points/cash ledger | not tuition |
| `student/TuitionCard.tsx` | student home (`pages/Index.tsx`) | `calculate-tuition` | none |
| `pages/StudentDashboard.tsx:530-541` | student | `useStudentMonthFinance` | none (displays carry-out) |
| `admin/reports/StudentAuditPanel.tsx` via `useStudentAudit` | admin reports | audit hook | `payable = charged + carryInDebt - carryInCredit` (172), signed carry (313, 322) |
| `lib/invoice/adapter.ts` (PDF invoice) | downloads | `calculate-tuition` | `final_payable_vnd: totalAmount + carryInDebt - carryInCredit` (51), signed paid-to-date (50), balance (52) |
| `admin/FamilyPaymentModal.tsx`, `SmartFamilyPaymentModal.tsx`, `BatchFamilyPaymentModal.tsx` | admin payment modals | `calculate-tuition` per child | allocation arithmetic on the admin's entered amount; balances are the calculator's carry-out |

So AdminTuitionList is the only screen that prices the carried balance from raw invoice rows. Every other screen starts from the calculator; several of them still add `total + carry-in debt - carry-in credit` themselves because the calculator returns no such figure (1b).

## 1b. What the calculator returns, and what the table stores

`supabase/functions/calculate-tuition/index.ts` (per student; rate limit 30/min per IP, line 62; WRITES the invoice, 599-635, unless the family discount is unresolved):
- `totalAmount` (this month's charge, live from sessions/attendance/discounts; the saved figures when `tuition_frozen`, 378-385), `baseAmount`, `totalDiscount`
- `payments: { priorPayments, monthPayments, cumulativePaidAmount }` (646-650); `monthPayments` is the month's `recorded_payment`
- `carry: { carryInCredit, carryInDebt, carryOutCredit, carryOutDebt, settledInMonth, status: 'credit'|'debt'|'settled', message }` (651-659)
- `siblingState`, `siblingUnresolved`, `invoiceSaved`, `tuitionFrozen` (660-663), `priorBalanceBreakdown` (685)
- carry-in is `sum(recorded_payment) - sum(total_amount)` over the student's invoices with `month < M` (389-393, 475-477); closing is `totalAmount - carryIn - monthPayments` (484-486)

`supabase/functions/calculate-tuition-bulk/index.ts` (up to 200 students; no rate limit; never writes):
- per student: `studentId, baseAmount, totalDiscount, totalAmount, payments: { priorPayments, monthPayments }, carry: { carryInCredit, carryInDebt, carryOutCredit, carryOutDebt, settledInMonth }, breakdown.classes, invoiceId, invoiceStatus, confirmationStatus` (383-394), or `{ studentId, error: true }` (397)
- same carry arithmetic (340-366); frozen bills report the saved figures (330-336)

**Neither function returns a "payable" (charge + carry-in debt - carry-in credit) and neither returns a signed balance.** The bulk response also has no `siblingState` / `siblingUnresolved` and no `tuitionFrozen`.

`invoices` stores `carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt` (`src/integrations/supabase/types.ts`). Since `supabase/migrations/20261009120000_keep_invoice_carry_balances_correct.sql` they are maintained by the `invoices_carry_sync` AFTER INSERT/UPDATE/DELETE trigger, which calls `refresh_invoice_carry(student_id)` and recomputes the whole chain with the same formula over the stored rows. calculate-tuition also writes them (586-589) and the trigger then overwrites with its own result.

Source of truth for "what the family owes now": the calculator's `carry.carryOutDebt` / `carry.carryOutCredit` for the month. The stored `carry_out_*` equal it only while (a) an invoice row exists for the month and (b) its stored `total_amount` equals what the calculator would charge now. A month with no row has no stored carry at all. So the stored columns cannot be the single source for a list that also shows students with no bill yet; the calculator can.

## 1d. How the Finance tab gets the same figures

`src/components/admin/tabs/FinanceTab.tsx` renders `AdminTuitionListEnhanced`, which calls `useLiveTuitionData(month)` (`src/hooks/useLiveTuitionData.ts`): query key `["admin-tuition-live", month]`, `staleTime` 30 s, no refetch on focus, no retry of its own; roster = `fetchStudentsInMonth` narrowed to students with an enrolment in an active class that month; `calculate-tuition-bulk` in batches of 150 ids in parallel (107-122); a student whose result is missing or `error` is dropped from the list (132). The payment dialogs patch and invalidate that same key.

## 1c. Can the browser sum and the calculator disagree? Yes

Executed: `node scripts/pgtest/tuition-prior-balance.test.mjs` (in `scripts/pgtest/run.mjs` as "tuition prior balance") bundles the REAL `calculate-tuition` and `calculate-tuition-bulk` handlers, runs them over one made-up school, and sets them beside the removed browser arithmetic (kept in the test as `legacyBrowserRows`, the record of what lines 93-155 did). The two calculators agree with each other on every figure in every case.

The carry-IN is the same sum in both (payments minus charges over the stored earlier rows), so it agrees whenever the browser manages to read every earlier row. They part on three things: the browser used the STORED charge for the month (0 when there is no row), it read the whole school's history in one request, and it never knew `settledInMonth`.

Month viewed: 2026-11. Amounts in VND. "owed" = carry-out debt.

| # | Case | Browser (before) | Calculator | Verdict |
|---|---|---|---|---|
| 1 | bill saved and current, no history | charge 1,440,000; owed 1,440,000; unpaid | same | equal |
| 2 | October short by 1,000,000 | prior debt 1,000,000; payable 2,440,000; owed 2,440,000 | same | equal |
| 3 | October overpaid by 560,000 | prior credit 560,000; owed 880,000 | same | equal |
| 4 | **no November invoice row yet**, October short 1,000,000 | charge 0; payable 1,000,000; owed 1,000,000 | charge 1,440,000; owed 2,440,000 | **DIFFERS** by the month's whole charge |
| 5 | **no November row**, no history | everything 0; "Open" | charge 1,440,000; owed 1,440,000; "Unpaid" | **DIFFERS** |
| 6 | **saved total out of date** (saved at 7 lessons and paid; an 8th marked since) | charge 1,260,000; owed 0; "Settled" | charge 1,440,000; owed 180,000; "Underpaid" | **DIFFERS** |
| 7 | frozen bill (810,000; register says 1,440,000) | 810,000 | 810,000 | equal - the freeze holds in both |
| 8 | November's money recorded on the October bill | prior credit 1,440,000; owed 0; "Settled" | same | equal |
| 9 | **November's money recorded on a December bill** | owed 1,440,000; "Unpaid" | owed 1,440,000; **"Settled in 2026-12"** | figures equal, **status differs** |
| 10 | October payment corrected down by 500,000 (refund / edited / deleted payment) | prior debt 500,000; owed 1,940,000 | same | equal - both read `recorded_payment` |
| 11 | a zero-charge month in the history | owed 1,440,000 | same | equal |
| 12 | left on 31 October owing 700,000, no November row | owed 700,000 | charge 0; owed 700,000 | equal (the Finance tab does not LIST this child; `/tuition` does) |
| 13 | October re-billed after November was computed; November row still stores carry-in 0 | prior credit 180,000 | prior credit 180,000 | equal - neither reads the stored column |
| 14 | **family discount unresolved** (being re-decided), saved bill has the 10% | charge 1,296,000 (the saved bill) | bulk: charge **1,440,000, with no sign that it is provisional**; single: `siblingUnresolved: true`, nothing saved | **DIFFERS, and here the bulk answer is the provisional one** |
| 15 | the other child of that family | 1,440,000 | 1,440,000 | equal |
| - | **whole-school history past the row cap** (60 students x 20 months = 1,200 rows, PostgREST default 1,000 per request) | 10 of 60 students read as owing NOTHING instead of 2,000,000 | per-student calculator: 2,000,000 | **DIFFERS** (test-only; depends on the project's max-rows) |

Not constructible as a disagreement: a carry "capped or reset by a settlement/correction". Neither reader has such a concept; a correction is a changed `recorded_payment` or `total_amount` on a stored row and both read it (cases 10, 13).

Three things the test shows about the calculator itself (I did not touch `supabase/functions`):
- **Neither response has a payable or a signed balance** (asserted). See "Stopped on".
- **The bulk response does not say when a family discount is unresolved** (asserted: no `siblingState`, no `siblingUnresolved`), while its `totalAmount` leaves the discount out. The Finance tab has always shown that provisional figure as if final for as long as `compute-sibling-discounts` is busy; after this fix `/tuition` does too.
- The bulk function reads "all other invoices" for up to 200 students in one unpaged request (`calculate-tuition-bulk/index.ts:199-204` via `fetchChunked`, 40-58). With the Finance tab's batches of 150, that passes 1,000 rows once the average student has 7 earlier bills. If the project's PostgREST `max-rows` is still the default 1,000, the bulk carry would be short for the LATEST months of the last students in a batch (rows are ordered by month). I cannot see the live setting from here; the owner SQL below shows whether the stored carry and a full sum agree.

## 2. The fix and the single source chosen

**Source: `calculate-tuition-bulk`, through the Finance tab's own fetch.** Not the stored `carry_*` columns: they exist only where a bill row exists and are right only while the saved total is current (1b), and `/tuition` lists students with no bill yet. Not `calculate-tuition` per student: it is limited to 30 calls a minute and writes an invoice on every call.

- `src/lib/tuitionRows.ts` (new, imports nothing): `tuitionFigures(answer)` hands over the function's figures or null; `carriedIn` / `carriedOut` word the carry as owed / credit / none; `tuitionStatusInput` feeds `getPaymentStatus`; `largestFirst` sorts by comparison. No sum, difference, clamp or sign flip. A missing figure makes the whole row "Not available"; an answer marked unresolved makes it "Being calculated".
- `src/hooks/useLiveTuitionData.ts`: the batching (150 ids) moved into exported `fetchBulkTuition`, the row literal into exported `liveTuitionItem`. The Finance tab's rows are unchanged (harness: Finance tab before == after, byte-equal).
- `src/components/admin/AdminTuitionList.tsx`: the two `invoices` reads and all the arithmetic are gone. Roster, class names and the Discount/Sibling badges are obtained as before. Prior Bal., Balance, the status badge, the status filters and both sorts come from the mapper. Query key is now `["admin-tuition-live", month, "everyone"]`, so a payment recorded from this page refreshes it (it did not before). Bounded sibling retry (`siblingRetryDelayMs`) is wired for rows the function marks unresolved. A failed fetch says "Tuition could not be calculated" instead of "No tuition records found". No class or layout change.
- Record Pay: a row with figures is handed to `RecordPaymentDialog` as exactly the Finance tab's row (`liveTuitionItem`), so the dialog behaves as it does there. A row without figures has Record Pay disabled - otherwise the dialog would read the gaps as 0 and write that.

Files changed: `src/components/admin/AdminTuitionList.tsx`, `src/hooks/useLiveTuitionData.ts`, `src/lib/tuitionRows.ts` (new), `scripts/tuitionRows.test.ts` (new), `scripts/pgtest/tuition-prior-balance.test.mjs` (new), `scripts/pgtest/run.mjs` (suite added), `scripts/CHECK-prior-balance-differences.sql` (new), this file. Nothing under `supabase/`.

## Stopped on (needs the calculator, which I may not touch)

1. **No payable in either response.** Exact field wanted: `carry.payable` (number; charge + carry-in debt - carry-in credit; can be negative) in each `calculate-tuition-bulk` result and in `calculate-tuition`'s response. Until it exists, `liveTuitionItem` (`src/hooks/useLiveTuitionData.ts:95`) still adds it from the function's own three figures, as the Finance tab always did, and `/tuition` shows that same number. I kept it rather than show "Not available" because the payment dialogs decide the invoice status they WRITE from it (`RecordPaymentDialog.tsx:36, 90-97`); blanking it would change a write. The line already prefers `carry.payable` when the function sends it, so the addition stops being used the day the field ships.
2. **The bulk response does not flag an unresolved family discount.** Wanted: `siblingUnresolved: true` (or `siblingState`) per result. The mapper and the retry already act on either; today they can never fire for the bulk function.

## 3. Proof

**Figure table.** Harness `C:\Users\Dell\hec-tools\t3-harness\t3.mjs` (fake Supabase client, port 5373, made-up people). Its bulk answers are the REAL handler's output for the case school (`T3_DUMP` of the executed test); Case 16 is a forced error row. Raw output: `C:\Users\Dell\hec-tools\t3-out\before.json|log`, `after.json|log`. `/tuition` as admin, every row opened. "A -> **B**" is before -> after.

| Family | Prior Bal. | Payable | Balance | Status | Verdict | = Finance tab (same run) |
|---|---|---|---|---|---|---|
| Case 01 Bill in step | — | 1.440.000 ₫ | 1.440.000 ₫ | Unpaid | equal | text-equal |
| Case 02 Arrears | 1.000.000 ₫ | 2.440.000 ₫ | 2.440.000 ₫ | Unpaid | equal | text-equal |
| Case 03 Credit | +560.000 ₫ | 880.000 ₫ | 880.000 ₫ | Unpaid | equal | text-equal |
| Case 04 No bill yet, arrears | 1.000.000 ₫ | 1.000.000 ₫ -> **2.440.000 ₫** | 1.000.000 ₫ -> **2.440.000 ₫** | Unpaid | DIFFERS (no bill row) | text-equal |
| Case 05 No bill yet | — | 0 ₫ -> **1.440.000 ₫** | 0 ₫ -> **1.440.000 ₫** | Open -> **Unpaid** | DIFFERS (no bill row) | text-equal |
| Case 06 Bill out of date | — | 1.260.000 ₫ -> **1.440.000 ₫** | 0 ₫ -> **180.000 ₫** | Settled -> **Underpaid** | DIFFERS (saved total stale) | text-equal |
| Case 07 Frozen bill | — | 810.000 ₫ | 810.000 ₫ | Unpaid | equal | text-equal |
| Case 08 Paid on October | +1.440.000 ₫ | 0 ₫ | 0 ₫ | Settled | equal | text-equal |
| Case 09 Paid on December | — | 1.440.000 ₫ | 1.440.000 ₫ | Unpaid -> **Settled in 2026-12** | DIFFERS (status only) | text-equal |
| Case 10 Payment corrected | 500.000 ₫ | 1.940.000 ₫ | 1.940.000 ₫ | Unpaid | equal | text-equal |
| Case 11 Zero-charge month | — | 1.440.000 ₫ | 1.440.000 ₫ | Unpaid | equal | text-equal |
| Case 12 Left owing | 700.000 ₫ | 700.000 ₫ | 700.000 ₫ | Unpaid | equal | not listed on the Finance tab |
| Case 13 October re-billed | +180.000 ₫ | 1.260.000 ₫ | 1.260.000 ₫ | Unpaid | equal | text-equal |
| Case 14 Sibling (discount unresolved) | — | 1.296.000 ₫ -> **1.440.000 ₫** | 1.296.000 ₫ -> **1.440.000 ₫** | Unpaid | DIFFERS (bulk gives the provisional charge, unflagged) | text-equal |
| Case 15 Sibling (full price) | — | 1.440.000 ₫ | 1.440.000 ₫ | Unpaid | equal | text-equal |
| Case 16 Calculator error | — -> **Not available** | 1.440.000 ₫ -> **Not available** | 1.440.000 ₫ -> **Not available** | Unpaid -> **Not available** | DIFFERS (Record Pay disabled) | not listed on the Finance tab |

All 14 families the Finance tab lists are text-equal to `/tuition` after the fix (Base, Discount, Prior Bal., Payable, Paid, Balance, header balance, status). The Finance tab's own rows are identical before and after. Requests on `/tuition`: before `invoices` select x2, no calculator call; after `calculate-tuition-bulk` x1, no `invoices` read.

**Checks (final tree, 33875b0 + this file):**
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npx --yes bun test scripts/*.test.ts`: 111 pass, 0 fail (10 files; `tuitionRows.test.ts` is 25 of them).
- `node scripts/pgtest/tuition-prior-balance.test.mjs`: 212 passed, 0 failed. Also run: enrollment-discounts 22, family-payment-month 6, mirrors 13, ivory-scope 33, all pass. I did not run the whole of `run.mjs`.
- `static-counts.mjs`: before vs after, one difference: `selectStar_src` 68 -> 67 (better). Nothing worse.
- Owner SQL executed on an in-process Postgres (pglite) with made-up rows: runs, returns the expected rows, contains no write keyword. Not run on the live database.

**Arithmetic on money in the files I touched** (grep for `Math.`, `.reduce(`, `+ - * /` beside a money name):
- `src/lib/tuitionRows.ts`: none (also asserted by a unit test).
- `src/components/admin/AdminTuitionList.tsx`: none. The two hits are not money: `dataUpdateCount - 1` (retry attempt count) and `settled + overpaid` (a count of rows).
- `src/hooks/useLiveTuitionData.ts`: three lines, all pre-existing, moved not written: `finalPayable` (95, see "Stopped on"), `balance` (96), `priorBalance` (101). `/tuition` displays only the first.

**Left elsewhere, for the conductor** (all over the calculator's own figures, none from raw invoice rows; all blocked on the same missing payable or on totals the function does not return): `AdminTuitionListEnhanced.tsx:67-70, 165`; `tuition/TuitionStudentCard.tsx:57, 223`; `QuickPayPanel.tsx:61, 77, 86, 193-204, 330`; `RecordPaymentDialog.tsx:36-43, 156-158`; `BatchPaymentDialog.tsx:43, 65, 165-171, 330-334`; `useFinanceOverview.ts:113-128`; `useFinanceSummary.ts:39-42` (raw invoice rows, month totals, no carry); `student/StudentTuitionTab.tsx:427, 536-538`; `useStudentMonthFinance.ts:163-166`; `student/PriorBalanceBreakdown.tsx:72-76, 112, 156`; `reports/StudentAuditPanel.tsx:172, 313, 322`; `lib/invoice/adapter.ts:50-52`.

## What an admin will see change on the live site

On `/tuition` (and `/students/:id/tuition`), the numbers become the Finance tab's numbers. For most families nothing moves. They move for:
- **A student with no bill saved yet for the month.** The page used to show a charge of 0 for the month (and "Open" or just the old arrears). It now shows the month's charge and the full amount owed.
- **A student whose saved bill is out of date** (lessons marked or changed since it was last calculated). Payable, Balance and the badge follow the register: a "Settled" can become "Underpaid", or the reverse.
- **A month whose debt was paid off in a later month.** The badge reads "Settled in <month>" instead of "Unpaid" / "Underpaid". The figures do not change.
- **A family whose sibling discount is being re-decided at that moment.** The page briefly shows the charge without the discount, as the Finance tab does. This is the calculator's gap (Stopped on, 2), not new arithmetic.
- **A student the calculator could not answer for.** "Not available" in every cell and no Record Pay, instead of figures from saved rows.
- If the school's history is past the row cap, some students who read as owing nothing for earlier months will now show their arrears.

Also, not money: the page takes a little longer to load (one calculator call instead of two table reads); it refreshes after a payment is recorded from it; and the Review Queue count and the confirmation filter now work on it (the row carries the bill's confirmation status, as on the Finance tab - before, that filter emptied the list).

One thing to know about Record Pay: for a student with no bill row, the dialog creates the bill with the calculator's base, discount and total, where it used to create it with 0. That is what it already does from the Finance tab. I added no write.

## Owner SQL

`scripts/CHECK-prior-balance-differences.sql` - read-only, one SELECT, student ids only. For this month and the two before: counts first (bills checked and bills whose stored carry-in differs from the sum over earlier bills; enrolled students with no bill row), then each differing bill with both numbers, then each student with no bill row. Not run on the live database.

## Open questions (policy)

1. **Payable while the calculator returns none.** Recommended default: ship as is (the Finance tab's figure on both screens), add `carry.payable` to both functions next, then delete the fallback at `useLiveTuitionData.ts:95`. The alternative, showing "Not available" for Payable on both screens until then, would also change what the payment dialogs write.
2. **School totals on the Finance tab** (Total Billed / Collected / Outstanding) are browser sums across students of the calculator's per-student figures; the function is called in batches and returns no totals. Recommended default: leave them, and treat "no arithmetic" as applying to one family's bill, not to adding families up.
3. **Students with arrears but no enrolment this month** are on `/tuition` and absent from the Finance tab. Recommended default: keep them on `/tuition` (that is where arrears are chased); decide separately whether the Finance tab should list them.
4. **Unresolved sibling discount in the bulk answer.** Recommended default: have the bulk function send the flag; both screens then show "Being calculated" and retry instead of a provisional charge.
