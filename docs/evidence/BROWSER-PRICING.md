# BROWSER-PRICING - the last screens that priced pay or lost tuition in the browser

**DONE - waiting for the conductor's review.**

Branch `browser-pricing` (from `origin/pc2/browser-pricing` 3a679306, merged
with `claude/hec-conductor-setup-efbaa5` at efcb3a64). MONEY: YES. Nothing
deployed, pushed or run against a live database.

## Who did what

The second laptop (dead) did commits b9414c64, 30870327, c93e6e32, 3a679306:
the inventory, the two new calculate-tuition-bulk fields, the mappers
(`src/lib/lostLessonsView.ts`, `classPayFrom` in `src/lib/finance/classPayroll.ts`,
`src/lib/tuitionFigures.ts`) and all eight screen changes, plus the payroll-side
tests in `scripts/pgtest/teacher-payroll.test.mjs` (Saved Payroll, the class
calendar card). Its evidence file still said "next step: new fields" - it
was never brought up to date.

Finished here:

- Merge with the conductor: clean, no conflicts. Two files changed on both
  sides and auto-merged: `supabase/functions/calculate-tuition-bulk/index.ts`
  (S2 F-04 admin-only gate and D4 step 2 dated fees from the conductor; the
  two new fields from the laptop - all kept) and
  `scripts/pgtest/teacher-payroll.test.mjs`.
- **A defect the merge exposed, fixed:** the laptop priced each cancelled
  lesson at `classes.session_rate_vnd` (the mirror of the fee NOW). After the
  merge the charged and the excused lessons are priced with `classFeeOn` (the
  fee on the lesson's date), so a cancelled October lesson would have shown
  November's fee as Lost Tuition. `cancelledLessons` now uses `classFeeOn`
  too. The d4-class-fee case fails on the laptop's line (checked by putting
  it back: 177 passed, 1 failed) and passes on the fix.
- Tests for the tuition side (none existed): the new bulk fields, the
  mappers against the functions' figures, and static checks that the screens
  price nothing (below).
- The repeat grep of `src/` (below) and this file.

## Rules followed

- Pay comes only from `calculate-payroll`; tuition only from `calculate-tuition` /
  `calculate-tuition-bulk`. Nothing new is priced in `src/`.
- A figure a screen needs that a function lacks is a NEW response field;
  no existing amount is computed differently (the golden file is unchanged and
  its 36 assertions pass). Until the function is redeployed the screen shows
  "figure unavailable" (a dash plus screen-reader text), never a browser
  price and never a confident 0.
- `classes.session_rate_vnd` prices nothing new: the only use in the new
  fields is as `classFeeOn`'s fallback, exactly as for a charged lesson.
- classNames kept; behaviour only.

## Each screen, before / after

| # | Screen / figure | Before (browser) | After (function, through the mapper) | Until redeployed |
|---|---|---|---|---|
| 1 | Reports, Lost Profit card: **Lost Tuition** | `classes.session_rate_vnd` (fee of today) x students enrolled on each cancelled lesson's date | calculate-tuition-bulk `cancelledLessons` summed over the month's billed roster (`forgoneTuition`) - each lesson on the student's own enrolled dates, weekdays, rate override and the fee on its date | figure unavailable |
| 1 | Reports: **Saved Payroll** | `sessionPayVnd(cancelled lesson's teacher row, rate of TODAY, minutes)`, never the assistant | calculate-payroll `lostIncome.totalAmount` summed over every staff row (`cancelledPayTotal`) - rate in force on each date, teachers and TAs | (already deployed) |
| 1 | Reports: **Lost Profit** | the difference of the two above | `difference(lostTuition, savedPayroll)`; unknown if either is | figure unavailable |
| 2 | Reports, Excused Absences: **Tuition Lost** per row and total | each Excused mark at `classes.session_rate_vnd`, enrolled or not | calculate-tuition-bulk `excusedLessons` (`forgoneByLesson` per row, `forgoneTuition` total); a mark outside the student's enrolment reads "not charged" | figure unavailable |
| 3 | Reports, Class Finance: **Payroll / Profit / break-even / CSV** when calculate-payroll cannot be read | fallback `sessionPayVnd(teacher row rate, minutes)` (no TAs, today's rate) | no fallback: figure unavailable (pay per class otherwise from calculate-payroll, as before) | - |
| 4 | Class calendar: **$ card** | sum of `sessions.rate_override_vnd` - a column calculate-payroll ignores, so nobody's pay | calculate-payroll split by class (`classPayFrom`): projected while open, paid totals once closed | figure unavailable if payroll does not answer |
| 5 | Finance tab: **Excused Loss** | each Excused mark at `classes.session_rate_vnd` | `excusedLessons` from the same calculate-tuition-bulk answer as the revenue | figure unavailable |
| 6 | `useFinanceSummary.excusedLoss` | the same browser sum | removed (no screen read it) | - |
| 7 | Student Tuition tab: **sibling line** under the winner class | `amount_vnd x siblingState.percent / 100` | calculate-tuition's own `discounts` line (`isSiblingWinner`, `appliedToClass`) via `siblingDiscountFor` | 0 (no line) |
| 8 | Student Tuition tab: **Final Payable** | `totalAmount + carryInDebt - carryInCredit` | calculate-tuition `carry.payable` via `payableFrom` | figure unavailable |

Before / after on the test fixtures (`invoice-status.test.mjs`, BROWSER-PRICING section;
`teacher-payroll.test.mjs` for pay):

| Fixture | Figure | Old browser | Function (now shown) |
|---|---|---|---|
| register (list fee, no override) | Excused Loss | 100000 | 100000 |
| register (list fee, no override) | Lost Tuition | 100000 | 100000 |
| rate override 80,000 | Excused Loss | 100000 | 80000 |
| weekday-limited enrolment | Lost Tuition | 200000 | 100000 |
| dated fee, October lesson (d4-class-fee) | Excused / Lost Tuition per lesson | 120000 (fee now) | 100000 (October fee) |
| sibling winner 10%, two classes | sibling line (class A) | 40000 | 40000 |
| debt carried in | Final Payable | 700000 | 700000 |
| credit carried in | Final Payable | 150000 | 150000 |
| class calendar, class 1, Oct | $ card | sum of rate_override_vnd | calculate-payroll projected for the class |
| Reports, Oct | Saved Payroll | teacher row rate of today | 550000 (lostIncome, rate in force on 13 Oct; TA included) |

Two meanings changed on purpose and are worth the conductor's eye:

- Excused Loss / Lost Tuition now count only lessons the student would have
  been charged for (enrolled on that date, on an allowed weekday, at their own
  rate and the fee on that date), and only students on the month's billed
  roster (`fetchBilledStudentIds`, the same roster as the revenue). The figure
  is before the month-level discounts (enrolment terms, special, referral,
  sibling): what the lesson adds to the base less its rate-adjustment saving.
- A figure is null (dash) when any student on the roster is unanswered or
  errored, rather than a partial sum that reads as the whole.

## New response fields

`calculate-tuition-bulk`, each entry of `results` (appended after
`confirmationStatus`; no existing field moved or changed):

- `excusedLessons: Array<{ session_id, date, class_id, rate_vnd }>` - the
  month's Scheduled/Held lessons the student is enrolled for and marked
  Excused; `rate_vnd` = what marking it Present would add to the month before
  month-level discounts (`lessonCharge(classFeeOn(...), rate_override_vnd)`).
  Always present.
- `cancelledLessons: Array<{ session_id, date, class_id, rate_vnd }>` - the
  month's Canceled lessons of the student's classes on their enrolled dates
  and weekdays, priced the same way. Read in a separate query; if that read
  fails the field is left out (the screens show figure unavailable) and the
  call still answers with the same totals.

No other function changed. calculate-payroll's `lostIncome` and
calculate-tuition's `carry.payable` / `discounts` already existed.

## Functions to redeploy

Only **calculate-tuition-bulk**. Full import list:

- `supabase/functions/calculate-tuition-bulk/index.ts`
  - `https://esm.sh/@supabase/supabase-js@2.75.0`
  - `https://deno.land/x/zod@v3.22.4/mod.ts`
  - `../_lib/auth.ts` (imports `https://esm.sh/@supabase/supabase-js@2.75.0`)
  - `../_lib/sibling-state.ts` (imports nothing)
  - `../_lib/tuition-session.ts` (imports nothing)
  - `../_lib/enrollment-discounts.ts` (imports nothing)
  - `../_lib/invoice-status.ts` (imports nothing)
  - `../_lib/class-fee.ts` (imports nothing)

It carries S2 F-04 (admin-only) and D4 step 2 from the conductor's branch as
well; the version on live must already have those, or this deploy brings
them. The screens degrade (dash) until it is deployed, and the browser can
ship first.

## Tests

- `invoice-status.test.mjs`, new BROWSER-PRICING section (35 assertions): the
  register fixture's excused / cancelled lesson; bulk totals = calculate-tuition;
  `rate_vnd` = what marking the lesson Present adds (list fee, override below,
  override above); weekday and start-date limits; empty lists = 0; the
  cancelled read failing (200, same totals, field left out, Lost Tuition null);
  the mapper's nulls (old function, unanswered / errored student, lesson
  without a figure); the sibling line and Final Payable against
  calculate-tuition; static checks that Reports, both finance hooks, the class
  calendar and the Tuition tab no longer price. The existing "bulk fields
  unchanged" assertion now lists the two new fields at the end.
- `d4-class-fee.test.mjs`, new section (4 assertions): excused and cancelled
  lessons at the fee on their date (October 100,000 / November 120,000, mirror
  120,000), and at the mirror with no history table. `run.mjs` expect 174 -> 178.
- `teacher-payroll.test.mjs` (the laptop's): Saved Payroll and the class card
  = calculate-payroll's figures, open and closed month, nulls.
- `fixtures/tuition-figures.golden.json`: not regenerated; its 36 assertions
  pass (invoice-status and the d4-class-fee golden gate).

## Repeat grep of `src/` (after the merge)

Searched: `session_rate_vnd`, `hourly_rate_vnd`, `per_session_rate_vnd`,
`rate_override_vnd`, `sessionPayVnd`, `totalPayVnd`, `rateOnDate`,
`effectiveRateVnd`, `/ 60`, `* minutes`, `percent / 100`, `x` / `×` with a
count, every `a * b` on a line naming vnd / rate / fee / amount / pay / cost /
tuition / discount, "lost" / "excused loss" / "saved payroll".

No browser price of pay or lost tuition is left on a screen. Found and left,
with the reason:

| Where | What | Why left |
|---|---|---|
| `admin/staff/PayRateFields.tsx` l.55 (used by TeacherForm, TeachingAssistantForm, PayRateHistory) | `sessionPayVnd(typed rate, 90 min)` - "X ₫ for a 90 min lesson" under the rate box | Explains the rate being typed before it is saved; nobody's pay. calculate-payroll cannot price an unsaved rate. Conductor to decide. |
| `admin/SiblingDiscountCompute.tsx` l.283 | `winner_base x typed percent / 100` before Apply | What-if for an input not yet saved; the saved discount is priced by compute-sibling-discounts / calculate-tuition. Conductor to decide. |
| `admin/reports/StudentAuditPanel.tsx` | `charged + carryInDebt - carryInCredit` over stored invoice columns | Addition over stored figures, no rate. AGENTS.md prefers `carry.payable`; the panel reads stored rows, not calculate-tuition. |
| `EnrollmentRateEditor` ("Default rate", "Difference"), `ModifyEnrollmentModal`, `AddSessionModal` (placeholders), `StudentOverviewTab`, `ClassesList`, `ClassesTab`, `TeacherProfileClasses` | `classes.session_rate_vnd` printed as the class fee | The fee NOW as a label; with D4 step 2 the column is the mirror of `class_fee_on(class, today)` kept by the migration. Prices no amount. |
| `GlobalCalendar.tsx`, `ScheduleCalendar.tsx` | select `rate_override_vnd` / `session_rate_vnd` | Fetched, never shown or summed. |
| `AddSessionModal`, `EditSessionModal` | write `sessions.rate_override_vnd` | A form field; no calculator reads that column (the calendar card that summed it is gone). |
| `PayrollTab` CSV `effectiveRateVnd(p.staff)` | the rate column | `p.staff` is built by `payrollRows.ts` from the function's own rate fields. |
| `StudentTuitionTab` "N sessions x rate" | both numbers from `breakdown.classes` | Printed, not multiplied. |
| `TeacherProfileOverview`, `TeacherDashboard`, `TeacherPayroll` | percentages, hours from minutes | Not money. |

## Not verified

- No screen was opened in a browser (no preview with the fake client); the
  screens are checked by type-check and by the static assertions only.
- The functions on live were not probed; whether live calculate-tuition-bulk
  already has S2 / D4 step 2 is the conductor's to confirm before deploying.
