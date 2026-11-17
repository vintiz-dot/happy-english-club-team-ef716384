# CALC-fix round 1 - the review findings on browser-pricing + followups

Branch `calc-fix`, from `review-calc` c9e96bab (browser-pricing fe709de3 merged
with followups a959747a). Findings from the independent review REVIEW-calc
(M-1, M-2, N-3). MONEY: report figures only. Nothing deployed, pushed or run
against a live database.

No charged or paid figure moves:
- `calculate-tuition/index.ts` is untouched (same LF md5 as the review's tree).
- `scripts/pgtest/fixtures/tuition-figures.golden.json` is unchanged
  (`git diff c9e96bab -- scripts/pgtest/fixtures` is empty).
- No `_lib` file changed, so every mirror pair is as it was (mirrors suite).
- Every payroll row is byte-identical; only two new top-level fields follow
  `payrollData` (proof under M-1).

## M-1 Saved Payroll missed staff whose month was all cancelled

**Was:** `cancelledPayTotal` summed `lostIncome` over calculate-payroll's
`payrollData`. There is no row for an archived teacher with no held or
scheduled lesson, or for a TA with no paid minutes, so their cancelled lessons
were missing while the card still showed a number.

**Changed** (`supabase/functions/calculate-payroll/index.ts`):
- Both skip paths (the archived teacher's `continue`, the TA's
  `totalMinutes > 0` test) now call `noteLostIncomeOnly`. It prices the
  cancelled lessons through the same `lostIncomeFor` / `computeTotals` and
  the same `ratesByStaff` pay-rate resolver as every row's `lostIncome`. The
  cancelled read was already made before those skips, so there are no new
  reads.
- Two new response fields go after `payrollData`:
  - `lostIncomeOnly`: one entry per person with no row and at least one
    cancelled lesson: `{ teacherId, teacherName, staffName, isActive,
    staffType, lostIncome }`.
  - `lostIncomeTotal`: every row's `lostIncome.totalAmount` plus
    `lostIncomeOnly`. It is `null` when anyone's cancelled lessons could not
    be read or priced, because a part would read as the whole.
- **No payroll row is added.** close-payroll-month books one `payroll_lines`
  row per `payrollData` entry, so a 0-pay row would change a closed month's
  lines. A teacher's or TA's own call is narrowed as before, so
  `lostIncomeOnly` names nobody else.

**Screen** (`src/lib/lostLessonsView.ts`): `cancelledPayTotal` returns
`lostIncomeTotal` and nothing else. If the answer has no such field (function
not redeployed yet), or the field is null, the result is `null`, which the
screen shows as a dash with "Figure unavailable". It no longer sums the rows.
Reports' Saved Payroll and Lost Profit therefore show a dash until
calculate-payroll is redeployed. That is the intended degradation: the old
sum is the incomplete figure.

**Proved by:**
- `review-calc-probe-payroll.test.mjs` (registered, expect 182), section
  "REVIEW PROBE: staff whose month is all cancelled":
  - **Archived teacher.** Add one cancelled 90-minute October lesson for the
    archived teacher (150,000/h).
    - Saved Payroll goes 550,000 -> 775,000 (+225,000). This was the
      reviewer's FAIL.
    - `payrollData` is byte-identical to the run without that lesson, and
      the five grand totals are equal.
    - The teacher appears in `lostIncomeOnly` as "Zed Archived (archived)",
      with 225,000 for 1.5 h.
    - `lostIncomeTotal` = the rows' `lostIncome` + `lostIncomeOnly`.
    - close-payroll-month books the same `payroll_lines` and `expenditures`
      with or without the lesson. No line names the archived teacher.
    - Teacher A's own call has an empty `lostIncomeOnly` and a total of
      300,000, which is only A's own lessons.
  - **TA.** TA_1's only December lesson is cancelled.
    - There is still no TA row: the rows are the two active teachers, as
      before.
    - `lostIncomeOnly` = [TA_1, 150,000, 1 lesson].
    - Saved Payroll = 450,000 (A) + 150,000 = 600,000. This was the
      reviewer's FAIL. The probe had asserted a TA *row*, which is the shape
      this fix refuses, so that assertion was rewritten to check the figure
      and the absence of a row.
  - **Client ahead of the deploy.** An answer without `lostIncomeTotal` gives
    null (a dash). `lostIncomeTotal: null` gives null. `0` with no rows
    gives 0.
- `teacher-payroll.test.mjs` (164, was 156):
  - "nothing else moved since 6465f08": every case is byte-identical to the
    function before T5, apart from the stripped Lost Income keys. The new
    top-level keys were added to the strip list, and nothing else was
    loosened.
  - The cancelled-read failure cases: every pay figure is identical, the
    writes are identical, close-payroll-month books the same lines and
    totals, and `lostIncomeTotal` is null in all 8 failure runs (8 new
    assertions).
- `ta-payroll.test.mjs` (261, unchanged count): its two "byte-identical
  answer" sections (against 2e88891a and efcb3a64, 15 + 29 callers) now use
  `sameAnswer`. That requires every byte of the old answer up to its closing
  brace to be identical, followed only by `,"lostIncomeTotal":...` and
  `"lostIncomeOnly":[...]` (exactly two extra keys, last). An answer without
  payrollData, such as an error or a 403, must still be identical outright.
  Before that change the first full run failed these 38 comparisons on the
  appended keys alone. The writes comparisons beside them are untouched.
- `payroll-rows.test.mjs` (69) and `teacher-payroll-view.test.mjs` (94) are
  untouched and pass.

## M-2 Excused / cancelled "lost tuition" ignored a frozen bill

**Was:** calculate-tuition-bulk built `excusedLessons` / `cancelledLessons`
from today's register. On a frozen bill (`invoices.tuition_frozen`) the charge
is the saved figure. A lesson charged at the freeze and later marked Excused
was therefore listed as forgone tuition that the bill actually charged.

**Changed** (`supabase/functions/calculate-tuition-bulk/index.ts`): for a
frozen bill, both fields are left out of that student's entry. They are not
`[]`, which would read as "nothing forgone". `forgoneTuition` already treats a
student without the field as unanswered, so:
- the month's Excused Loss and Lost Tuition are null (dash);
- that student's Excused rows show a dash, not "not charged".

No total, carry or other field changes. The frozen block itself is unchanged.

**Proved by:** `review-calc-probe-frozen.test.mjs` (registered, expect 368;
all 352 inherited invoice-status assertions pass, plus the reviewer's 2 and 14 added here):
- **Frozen bill.** An October bill frozen at 400,000, with one mark changed
  to Excused afterwards.
  - It still charges 400,000.
  - `excusedLessons` and `cancelledLessons` are both absent. This was the
    reviewer's FAIL.
  - Excused Loss is null, the row has no figure and is not "not charged",
    and Lost Tuition is null.
- **No frozen bill.** With the same register and no frozen bill, the lesson
  is listed at 100,000 and the total is today's 300,000. Only the freeze
  drops the lists.
- **Frozen and unfrozen students in one call.** Only the frozen student
  loses the lists, and the month's Excused Loss is null.

Live note from the review: 77 frozen bills, 2025-10 to 2026-08. After the
redeploy, Excused Loss and Lost Tuition for those months read "figure
unavailable" whenever a frozen bill is on the roster. This is deliberate: what
those bills charged for each lesson is not recorded.

## N-3 "0 ₫" while loading or when the query failed

**Changed** (`src/components/admin/reports/OperationalReports.tsx`): Lost
Profit, Lost Tuition, Saved Payroll and the Excused header's total now render
`vnd(x ?? null)`. While the data is loading or after its query throws, they
show the dash with "Figure unavailable" for screen readers, never `formatVND(0)`.
When there is no cancelled lesson at all, the card still shows a real 0,
because that is an answer.

**Proved by:** `review-calc-probe-frozen.test.mjs`, section "CALC-fix N-3"
(6 static assertions):
- no `formatVND(0)` fallback is left on either card;
- each figure goes through `vnd(... ?? null)`;
- `vnd(null)` is the Unavailable dash.

These are static checks only. No screen was opened in a browser.

## The 8 screens (BROWSER-PRICING table), after this round

| # | Screen / figure | Reads | This round |
|---|---|---|---|
| 1 | Reports, Lost Profit card: Lost Tuition | calculate-tuition-bulk `cancelledLessons` via `forgoneTuition` | dash when a frozen bill is on the roster (M-2); dash while loading or on error (N-3) |
| 1 | Reports: Saved Payroll | calculate-payroll `lostIncomeTotal` via `cancelledPayTotal` | now covers staff with no row (M-1); dash until calculate-payroll is redeployed; dash while loading (N-3) |
| 1 | Reports: Lost Profit | `difference(lostTuition, savedPayroll)` | follows the two above |
| 2 | Reports, Excused Absences: per row and total | `excusedLessons` via `forgoneByLesson` / `forgoneTuition` | frozen bill: rows and total dash (M-2); header dash while loading (N-3) |
| 3 | Reports, Class Finance: Payroll / Profit / break-even / CSV | calculate-payroll split by class | unchanged |
| 4 | Class calendar: $ card | calculate-payroll `classPayFrom` | unchanged |
| 5 | Finance tab: Excused Loss | `excusedLessons` via `forgoneTuition` | frozen bill on the roster: dash (M-2) |
| 6 | `useFinanceSummary.excusedLoss` | removed | unchanged |
| 7 | Student Tuition tab: sibling line | calculate-tuition `discounts` | unchanged |
| 8 | Student Tuition tab: Final Payable | calculate-tuition `carry.payable` | unchanged |

## Gates

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` (11:35-12:15 Hanoi; inside 08:00-20:00, so no clock shim) | EXIT 0: **8978 assertions across 88 suites, 0 failed** |
| ... of which | invoice status 352 (unchanged), calc probe: frozen 368 (pinned), calc probe: payroll 182 (pinned), teacher payroll function 164 (was 156), TA payroll function 261, payroll screen rows 69, teacher payroll view 94, d4 class fee 178, shared-module mirrors 19, edge functions typecheck 5, app typecheck 3, S2 edge functions 107 |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 (and app typecheck 3/3 in the suite, which asserts the source was loaded) |
| `npm run test:bun` | 250 pass, 0 fail, 1801 expect() calls, 18 files |

The review's run was 8420 across 86 suites. The 558 added assertions are the
two registered probes (368 + 182) and the 8 added to teacher-payroll.

`git diff c9e96bab -- scripts/pgtest/fixtures supabase/functions/_lib supabase/functions/calculate-tuition src/lib/invoiceStatus.ts`
is empty.

## Deploy file lists (LF md5, CR stripped, from this tree)

Deploy all three from `git show calc-fix:<path>`. The checked-out tree is
CRLF.

| function | file | LF md5 | vs review-calc tree |
|---|---|---|---|
| calculate-tuition | calculate-tuition/index.ts | e5de8c28c1818c437b9c678b9ecff427 | same |
| calculate-tuition | _lib/rate-limit.ts | aad3d996bc38a83848e33bd1cb88415e | same |
| calculate-tuition | _lib/auth.ts | 92b44db93cd2614a2fb3011e3a9063ba | same |
| calculate-tuition | _lib/sibling-state.ts | 46aa65d578527c106d620ca70a581044 | same |
| calculate-tuition | _lib/tuition-session.ts | d0d010933236809ea150a04311ca18a0 | same |
| calculate-tuition | _lib/enrollment-discounts.ts | b92966a926695c219226ca69e60e8de2 | same |
| calculate-tuition | _lib/class-fee.ts | 6a6d2167918057c6dc9c8c96e108cf1b | same |
| calculate-tuition | _lib/invoice-status.ts | 5ac8106a2a42fa68cb6baecd4131074c | same |
| calculate-tuition-bulk | calculate-tuition-bulk/index.ts | d2a258c20b309536603b8649930203c6 | **changed (M-2)**; was 2b8342808a12d40c9dfca9c56f57bdb7 |
| calculate-tuition-bulk | _lib/auth.ts | 92b44db93cd2614a2fb3011e3a9063ba | same |
| calculate-tuition-bulk | _lib/sibling-state.ts | 46aa65d578527c106d620ca70a581044 | same |
| calculate-tuition-bulk | _lib/tuition-session.ts | d0d010933236809ea150a04311ca18a0 | same |
| calculate-tuition-bulk | _lib/enrollment-discounts.ts | b92966a926695c219226ca69e60e8de2 | same |
| calculate-tuition-bulk | _lib/invoice-status.ts | 5ac8106a2a42fa68cb6baecd4131074c | same |
| calculate-tuition-bulk | _lib/class-fee.ts | 6a6d2167918057c6dc9c8c96e108cf1b | same |
| calculate-payroll | calculate-payroll/index.ts | 2e5da6fa1609a2a77a1ca8bfb19aeeff | **changed (M-1)**; was c9998fa2918d3ef74cf9dea9cc2b6db7 |
| calculate-payroll | _lib/pay-rate.ts | 4a7bfd96f9f269344c964d4da147eb97 | same |
| calculate-payroll | _lib/pay-history.ts | f391982f23b0fd8ad764703fb9ce5f2a | same |
| calculate-payroll | _lib/auth.ts | 92b44db93cd2614a2fb3011e3a9063ba | same |
| calculate-payroll | _lib/payroll-sessions.ts | eb6117158d0855da053993e62ec7b17c | same |

Import closure:
- `calculate-tuition`: `index.ts` + `_lib/{rate-limit, auth, sibling-state,
  tuition-session, enrollment-discounts, class-fee, invoice-status}.ts`.
- `calculate-tuition-bulk`: `index.ts` + `_lib/{auth, sibling-state,
  tuition-session, enrollment-discounts, invoice-status, class-fee}.ts`.
- `calculate-payroll`: `index.ts` + `_lib/{pay-rate, pay-history, auth,
  payroll-sessions}.ts`.

No `_lib` file imports another local file.

Order: the browser can ship before or after. Until calculate-payroll is
redeployed, Saved Payroll and Lost Profit show "figure unavailable". Until
calculate-tuition-bulk is redeployed, the frozen-bill case still shows the
old (overstated) figure.

## Not verified

- No screen was opened in a browser.
- Live was not probed. The one archived-teacher month the review counted
  (2026-06, 8 cancelled lessons) should show a higher Saved Payroll after the
  redeploy than the rows' sum. Check that post-deploy.
- The teacher's own payroll page for an archived teacher whose month was all
  cancelled still has no row to show. `lostIncomeOnly` carries their figure
  if that page ever needs it. This is not changed here.
