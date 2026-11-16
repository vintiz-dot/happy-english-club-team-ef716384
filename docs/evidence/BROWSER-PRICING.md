# BROWSER-PRICING - the last screens that priced pay or lost tuition in the browser

Branch `pc2/browser-pricing`, from `origin/conductor/work` 38f9864a. MONEY: YES.

**Where I am / next step:** inventory done (below). Next: new fields in
calculate-tuition-bulk, then the mapper, then each screen.

## Rules followed

- Pay comes only from `calculate-payroll`; tuition only from `calculate-tuition` /
  `calculate-tuition-bulk`. Nothing new is priced in `src/`.
- A figure a screen needs that a function lacks goes in as a NEW response field,
  without changing how any existing amount is computed. Until the function is
  redeployed the screen says "figure unavailable" (a dash plus screen-reader text),
  never a browser price and never a confident 0.
- classNames kept; behaviour only. No database, deploy or vendor tool used.

## Inventory - every place in `src/` found pricing money in the browser

Search: `session_rate_vnd`, `hourly_rate_vnd`, `per_session_rate_vnd`,
`rate_override_vnd`, `sessionPayVnd`, `rateOnDate`, `* rate`, `/ 60 *`,
`percent / 100`, "lost tuition", "excused loss".

| # | Where | What it computes today | Shown as |
|---|---|---|---|
| 1 | `admin/reports/OperationalReports.tsx` ~l.97-115, "Lost Profit" card | Lost tuition = `classes.session_rate_vnd` x students enrolled on each cancelled lesson's date; saved payroll = `sessionPayVnd(session teacher's rate of TODAY, minutes)`; lost profit = the difference | Lost Profit, Lost Tuition, Saved Payroll |
| 2 | same file ~l.144-153, "Excused Absences" | Each excused attendance mark priced at `classes.session_rate_vnd` (today's list fee, ignoring the student's override, enrollment dates and weekdays) | Tuition Lost per row and total |
| 3 | same file ~l.297-306, Class Finance Report | When calculate-payroll cannot be read, Payroll per class = `sessionPayVnd(teacher row rate, minutes)` over the month's lessons (no TAs, today's rate) | Payroll, Profit, break-even, CSV |
| 4 | `admin/class/ClassCalendarEnhanced.tsx` l.120 | "cost" = sum of `sessions.rate_override_vnd`, a column calculate-payroll ignores, so it is no one's pay | the $ card in the month header |
| 5 | `hooks/useFinanceOverview.ts` l.257-271 -> `admin/FinanceSummary.tsx` "Excused Loss" | each excused mark at `classes.session_rate_vnd` | Excused Loss card |
| 6 | `hooks/useFinanceSummary.ts` l.67-81 | the same excused-loss sum | returned as `excusedLoss`; no screen reads it (OverviewStats uses other fields) |
| 7 | `student/StudentTuitionTab.tsx` l.356-359 | the sibling discount re-priced as `amount_vnd x siblingState.percent / 100` (calculate-tuition returns the amount in `discounts`) | "-X (5%) = Y" under the winner class |
| 8 | `student/StudentTuitionTab.tsx` l.415 | "Final Payable" added up as `totalAmount + carryInDebt - carryInCredit` (calculate-tuition returns `carry.payable`) | Final Payable |

Found and left, with the reason:

- `admin/SiblingDiscountCompute.tsx` l.272: a preview of the discount at the
  percent the admin is typing (`winner_base x percent`), before Apply. The saved
  discount is priced by compute-sibling-discounts / calculate-tuition; this is a
  what-if for an input not yet saved. Moving it means a function call per
  keystroke - left for the conductor to decide.
- `admin/reports/StudentAuditPanel.tsx` l.173: `charged + carryInDebt -
  carryInCredit` over stored invoice columns (addition, no rate). Not a rate
  price; noted because AGENTS.md prefers `carry.payable`.
- Rates shown as the rate on record, not as an amount: `ClassesList`,
  `ClassesTab`, `TeacherProfileClasses`, `StudentOverviewTab` (class fee),
  `EnrollmentRateEditor` / `ModifyEnrollmentModal` / `AddSessionModal` /
  `ClassSettings` (forms and placeholders), `TeachersList`,
  `TeachingAssistantsList`, `TeacherProfile`, `PayrollManager` (rate labels).
  These become dated with D4 step 2 (class fee) but price nothing.
- `TeacherPayroll`, `TeacherDashboard`, `TAProfileDrawer`,
  `TeacherProfilePayroll`, `TeacherPayrollCalendar`, `PayrollTab`: already read
  calculate-payroll (T5, TA-PAY).
- `StudentTuitionTab` l.380 "N sessions x rate": both numbers are the
  function's (`breakdown.classes`), printed, not multiplied.
