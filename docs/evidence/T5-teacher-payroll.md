# T5 - Teacher payroll screens read calculate-payroll

MONEY: yes. Base `claude/hec-conductor-setup-efbaa5` (6465f08). Build and test only: nothing pushed, nothing deployed, no database touched.

**Where I am / next step:** step 1 (facts) written. Next: step 2, the auth gate.

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
