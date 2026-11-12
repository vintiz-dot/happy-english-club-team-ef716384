# T5 - Teacher payroll screens read calculate-payroll

MONEY: yes. Base `claude/hec-conductor-setup-efbaa5` (6465f08). Build and test only: nothing pushed, nothing deployed, no database touched.

**Where I am / next step:** DONE. Next: independent review, then redeploy calculate-payroll. Nothing pushed, nothing deployed.

## 1. What the browser prices today (file:line at 6465f08)

Line numbers in `calculate-payroll` are `supabase/functions/calculate-payroll/index.ts`.

### `src/components/teacher/TeacherPayrollCalendar.tsx` (teacher, `/teacher/payroll`)

| Where | What | From |
|---|---|---|
| :8, :46-47 | `calculateSessionAmount = sessionPayVnd(payRate, durationMinutes(start_time, end_time))` | `payRate` = the teacher row as it stands TODAY (`TeacherPayroll.tsx:47-51`, passed at :310); sessions = the function's `sessionDetailsProjected` (:309) |
| :100-101 | day total = sum of that over the day's sessions whose *displayed* status is Held | :55-64 shows any session whose start is after the browser's clock as "Scheduled" |

Where it can disagree with calculate-payroll:
- **Effective-dated rates.** The function prices each session at the rate in force on its own date (`rateOnDate`, :355). The calendar prices every session at today's rate, so a raise, a backdated correction or a scheduled change re-prices every past month on the calendar while the headline beside it does not.
- **The figure already exists.** Every session in the response carries the function's own `amount` (:357, :403), and the Session Details table on the same page prints it (`TeacherPayroll.tsx:356`). The calendar and the table on one page can show two different amounts for the same lesson.
- **Closed month.** The function freezes the totals to `payroll_lines` (:871-894) but leaves the per-session detail live; the calendar sums the live detail, so its days need not add up to the frozen "Amount Earned".
- **Which lessons count.** The function pays every `Held` session (`ACTUAL_SESSION_STATUSES`). A Held session dated after "now" (clock skew, a lesson marked early) is paid by the function but shown as Scheduled and left out of the day total.
- Cancelled sessions, duration variances: not shown on the calendar (cancelled are not in `sessionDetailsProjected`; the variance is the function's). Cross-midnight: `durationMinutes` mirrors the function. TA vs teacher: the page is teacher-only (a TA gets 403 from the function, see 2).

### `src/pages/TeacherPayroll.tsx` (teacher)

| Where | What | From |
|---|---|---|
| :47-51 | reads `hourly_rate_vnd, pay_rate_type, per_session_rate_vnd` off the teacher row (today's rate) | `teachers` under RLS |
| :72-108 | **Lost Income** = `totalPayVnd(today's rate, minutes of each Canceled session)` (:100), label `describeQuantity(today's basis)` (:102) | own `sessions` query, `status = 'Canceled'` |
| :156-182 | CSV "Paid" column = `rateUnit(today)` (:174), "Rate" = `effectiveRateVnd(today)` (:175), beside the function's `s.amount` (:176) | teacher row |
| :204-209 | headline figures from the function (correct); but in a CLOSED month `totalAmountActual`/`sessionsCountActual` are frozen while `totalAmountProjected`/`sessionsCountProjected` are live, so "+X from N scheduled" (:208-209) subtracts a frozen figure from a live one | function |

Disagreements: lost income and the CSV rate are at today's rate, not the dated one; a per-session/hourly switch mid-month shows one basis for the whole month; a closed month with corrections since shows a wrong "still to come".

### `src/components/admin/teacher/TeacherProfilePayroll.tsx` (admin, `/teachers/:id` Payroll tab)

| Where | What | From |
|---|---|---|
| :88-107 | per-session Amount = `sessionPayVnd(teacher row today, minutes)`; if `sessions.rate_override_vnd` is set, that number is used AS the rate (hourly or per-session) | `payRate={teacher}` (`pages/TeacherProfile.tsx:179`) |
| :236, :248 | the table iterates `payrollData.sessions` | **not a field of the response** - the function returns `sessionDetailsActual` / `sessionDetailsProjected`. So on the live function this table always says "No sessions this month"; :257 reads `session.durationMinutes`, also absent (the response has `minutes`) |
| :42-86 | class breakdown: its own `sessions` query, counting `Held` / `Scheduled` | restates `payrollSessions` instead of importing it |
| :37 | `payrollData[0]` | see below |

Disagreements: today's rate instead of the dated one; `rate_override_vnd` is applied here and ignored by the function (so an override shows a figure nobody is paid); and `payrollData[0]` is not necessarily this teacher: with `teacherId` from an admin the function still appends EVERY assistant (:782, the TA loop ignores `teacherId`), and an archived teacher with no sessions that month is dropped (:722) - so `[0]` is the first TA alphabetically and the profile shows a TA's pay under the teacher's name. Same `[0]` read at `TeacherProfileOverview.tsx:21`.

### Other `src/` files that price sessions (recorded, not changed by T5)

- `src/components/admin/ta/TAProfileDrawer.tsx:59-95` - TA month "Earnings" = `totalPayVnd(TA row today, Held minutes)`. Ignores `attended = false` (`participationIsPayable`), so it shows pay for lessons the TA was marked absent from (the overpayment direction), ignores rate history, and reads to `lte` month end. The admin Payroll tab (function) is right; this drawer is not.
- `src/components/admin/reports/OperationalReports.tsx:114` - "saved payroll" for cancelled lessons at the teacher row's rate (no TA, no history). `:300-305` - fallback that prices the class's sessions itself when calculate-payroll did not answer.
- `src/components/admin/class/ClassCalendarEnhanced.tsx:120` - class "cost" = sum of `rate_override_vnd` (a third reading of that column).
- Not pricing: `PayRateFields.tsx:55` (preview of the rate being typed), `TeacherDashboard.tsx:350` (prints today's rate, which is what it says), `PayRateHistory.tsx:104,133` (which record is in force).

## 2. Who may call calculate-payroll

Read at 6465f08, unchanged by T5 (only a comment added): `requireRole(req, sb, ["admin", "teacher"])` decodes the JWT (service-role key passes as an internal call). A caller who is a teacher and not an admin is scoped to the `teachers` row whose `user_id` is the JWT's user; the body's `teacherId` is ignored for them, and the assistants loop runs for admins only. A TA holds the `teacher` role but has no `teachers` row, so `.single()` finds nothing and the function answers 403 before reading any lesson. Families and pupils fail `requireRole` (403). So the gate already met the rule; nothing was widened.

It runs on the service role for everything (teachers, sessions, rates, periods, lines), as it always has: close-payroll-month and schedule-sessions call it with the service key, and the teacher's own path reads `staff_pay_rates` for everyone into memory but returns only their row. A teacher's call also upserts their own `payroll_summaries` row for an open month (existing behaviour).

One change, admin-only: an admin naming one person (`teacherId`) now gets that person only. At 6465f08 every TA was appended after the named teacher, and an archived teacher with no lessons that month was dropped, so `payrollData[0]` was the first TA - the admin profile showed a TA's pay under the teacher's name. `teacherId` may now also name a TA. Admin with no `teacherId`, and the service role, are unchanged.

`scripts/pgtest/teacher-payroll.test.mjs` (real function bundled, in-memory tables): no sign-in / forged token 401; parent, student 403; TA and a teacher-role login with no staff row 403 whether they name T_A or their own TA id - no lesson read, nothing written, nothing of T_A in the body; teacher A naming B gets A only, no lesson of B read, no B id/name/lesson id in the body; B naming A likewise; admin gets anyone; service role everyone. Mutation runs: disabling the teacher scoping fails 8 checks; removing the TA narrowing fails 3.

## 3-4. The screens read the function; browser pricing deleted

- `src/lib/teacherPayrollView.ts` (new): maps one person's row - picked by id, never `[0]` - to what the two screens draw. Renaming, grouping by day and class, adding up; imports only `payrollSessions` (fallback for "which lessons are paid" when `sessionDetailsActual` is absent).
- `TeacherPayrollCalendar.tsx`: takes the view's sessions and `earnedByDate`; `sessionPayVnd`/`durationMinutes`/`payRate` gone. A day whose figure is unavailable shows a dash with "Figure unavailable" for screen readers. Dates compared as `yyyy-MM-dd` text. R12 classes kept.
- `TeacherPayroll.tsx`: teacher row read for `id` only; Lost Income query and `totalPayVnd` gone (now `lostIncome` from the function); CSV rate/basis per lesson from the function; headline from the view; a closed month says so.
- `TeacherProfilePayroll.tsx`: `calculateSessionAmount` (incl. `rate_override_vnd`) and the class-breakdown query gone; table reads the function's lessons (it was always empty: it read a `sessions` field the function never returned); `payRate` prop removed (`TeacherProfile.tsx`).
- Closed month: the teacher (and the profile) see the frozen totals. Per-lesson/day amounts are shown when the recomputed figures still equal the frozen ones, and withheld ("figure unavailable") when lessons changed after the close. "Still to come" is set against the live actuals. `payrollRows.ts`/`PayrollTab`/`PayrollMonthLock` untouched; the test asserts the admin screen still gets the live figure for a closed month.
- `datedPayrollTotal` and every mirrored module untouched.

### Response fields added (calculate-payroll)

- per lesson in `sessionDetailsActual` / `sessionDetailsProjected` / `discrepancies`: `payRateType`, `rateVnd` - the rate that lesson was priced at.
- per row: `lostIncome { sessionsCount, totalMinutes, totalAmount, quantityLabel }` - the month's `Canceled` lessons through the same `computeTotals` (dated rate, per-session = one fee). For TAs it counts cancelled lessons they were rostered on. In no total.
- Proven otherwise identical to 6465f08 for 9 callers/months (admin open/closed/Nov, teacher open/closed, teacher naming another, service role, TA, parent): same status, same figures, same writes, once the new fields are stripped.

Fallbacks (browser ahead of the deploy): Lost Income and the CSV rate column show "Figure unavailable" / blank. Per-lesson amounts were already in the deployed response, so the calendar works before the redeploy.

## 5. Before / after on fixture data

From `teacher-payroll.test.mjs` (fixture: teacher A raised 200,000 -> 300,000/h on 15 Oct; B per-session 250,000; TA on two of A's lessons, absent from one; September closed at 300,000 for one lesson, a second marked Held after; browser clock 13 Nov). Old browser = the 6465f08 code reproduced over the same rows with the real `payRate.ts` / `sessionDuration.ts`.

| Screen | Figure | Old browser | Function (now shown) | Why |
|---|---|---|---|---|
| calendar (A, Oct) | 6 Oct, two 90-min lessons before the raise | 900,000 | 600,000 | browser used today's 300,000/h; function the 6 Oct rate 200,000/h |
| calendar (A, Oct) | 20 Oct, 120 min after the raise | 600,000 | 600,000 | same rate either way |
| calendar (A, Oct) | sum of the days vs Amount Earned 1,200,000 | 1,500,000 | 1,200,000 | old days added up to 1,500,000 beside a headline of 1,200,000 |
| Lost Income (A, Oct) | 13 Oct cancellation, 90 min | 450,000 | 300,000 | today's rate vs the 13 Oct rate |
| Lost Income (B, Oct) | per-session teacher, one cancellation | 250,000 | 250,000 | no rate change: agrees |
| CSV (A, Oct) | Rate column on the 6 Oct lines | 300,000 | 200,000 | printed today's rate beside the function's amount |
| admin profile (A, Oct) | 20 Oct lesson with rate_override_vnd 400,000 | 800,000 | 600,000 | override applied as the hourly rate; the function ignores it, so nobody is paid that |
| admin profile (A, Oct) | 6 Oct lesson, Amount column | 450,000 | 300,000 | today's rate vs the dated one |
| admin profile (A, Oct) | rows in the Session Details table | 0 | 4 | old table read payrollData[0].sessions, which the function never returns: always empty |
| admin profile (archived, Oct) | Current (Actual) for an archived teacher with no lessons | 350,000 | 0 | old [0] was the TA's row (Chi Le's pay under Zed's name) |
| calendar (A, Sep CLOSED) | 15 Sep, marked Held after the close | 450,000 | unavailable | old: a recomputed figure at today's rate; now withheld - the month was paid at 300,000 |
| calendar (A, Sep CLOSED) | what the days add up to, beside Amount Earned (frozen 300,000) | 900,000 | unavailable | only the paid total is shown |
| headline (A, Sep CLOSED) | Amount Earned | 300,000 | 300,000 | both the frozen figure |
| headline (A, Sep CLOSED) | "+X from N scheduled": X | 300,000 | 0 | old subtracted the frozen actual from the live projection |
| calendar (A, Nov) | 30 Nov, status Held but dated after today | 0 | 450,000 | function pays it (Held); old calendar showed it Scheduled and left it out of the day |

Every old disagreement on a rate change is upward (the overpaying direction) whenever the rate went up.

## Acceptance

- `node scripts/pgtest/run.mjs`: 3630 assertions, 43 suites, 0 failed (teacher payroll view 59/0, teacher payroll function 81/0, payroll screen rows 69/0, mirrors 13/0, edge functions typecheck 5/0, app typecheck 3/0, payroll month locking 55/0).
- `npx --yes bun test scripts/payrollCalculation.test.ts`: 6 pass, 0 fail.
- `tsc --noEmit -p tsconfig.app.json`: clean.

## To redeploy

`calculate-payroll` only (no migration). Either order is safe: a browser ahead shows Lost Income "Figure unavailable" and a blank CSV rate until the redeploy; the old browser ignores the new fields.

## For the owner

1. Closed month with lessons corrected after the close: the teacher sees the paid totals and per-lesson amounts are withheld. Alternative: show the recomputed per-lesson figures labelled as such.
2. `sessions.rate_override_vnd` is ignored by calculate-payroll (so by actual pay); the admin profile used to show it applied. If overrides are meant to pay, that is a function change to decide.
3. Not fixed here (recorded in 1): `TAProfileDrawer` earnings (counts lessons a TA was absent from, today's rate), `OperationalReports` saved-payroll and fallback pricing, `ClassCalendarEnhanced` cost.
4. TAs have no own pay page; the function answers them 403.
