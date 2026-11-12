# T3 - prior balance on the admin tuition list (D-15)

**Where I am / next step:** Part 1 done and committed. Done: executed test (`scripts/pgtest/tuition-prior-balance.test.mjs`, 135 pass), mapper `src/lib/tuitionRows.ts` + `scripts/tuitionRows.test.ts` (25 pass), hook refactor (`fetchBulkTuition`, `liveTuitionItem`), AdminTuitionList rewritten to read the calculator (committed WIP, `tsc -p tsconfig.app.json` was still running - re-run it), owner SQL written (`scripts/CHECK-prior-balance-differences.sql`, not yet syntax-checked against pglite). BEFORE harness output is saved at `C:\Users\Dell\hec-tools\t3-out\before.json` / `before.log` (harness: `C:\Users\Dell\hec-tools\t3-harness\t3.mjs <repo> <out.json> <label>`, port 5373). Next: tsc exit 0; AFTER harness run (`after.json`) and the before/after table; bun tests; static-counts; arithmetic grep; write the fix / files / what admins see / stopped-on / open questions sections below; remove the node_modules junction with `cmd //c rmdir node_modules` only.

Decisions already taken (to be written up): single source = `calculate-tuition-bulk` through the Finance tab's own fetch; `/tuition` keeps its wider roster (everyone on the roster, enrolled or not); rows the calculator could not answer show "Not available" and Record Pay is disabled for them. STOPPED ON: neither calculator returns a `payable` (charge + carry-in debt - carry-in credit), so `useLiveTuitionData.liveTuitionItem` still adds it from the calculator's own figures (the payment dialogs write the invoice status from it); exact field wanted: `carry.payable` in both functions' responses. Also the bulk response has no `siblingUnresolved` / `siblingState`.

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
