# TA-PAY - Teaching-assistant pay screens read calculate-payroll

MONEY: yes. Branch `pc2/ta-pay` from `origin/conductor/work` (2e88891a). Build and test only: nothing deployed, no database touched.

**Where I am / next step:** screens found (below). Next: let a TA call calculate-payroll for their own row, then move the three screens onto `teacherPayrollView`.

## 1. Screens that show a TA's pay (at 2e88891a)

| Screen | Who | What it computes today |
|---|---|---|
| `src/components/admin/ta/TAProfileDrawer.tsx` (admin, Teaching Assistants list -> drawer, Payroll tab) | admin | Its own `session_participants` query; Earnings = `totalPayVnd(TA row TODAY, minutes of every Held lesson)`. Counts lessons the TA was marked absent from (`attended = false`), ignores rate history, "Total Sessions" counts every rostered lesson of any status (cancelled included). |
| `src/pages/TeacherDashboard.tsx` (TA signed in) | TA | Calls calculate-payroll, which answers a TA 403; the error is swallowed by react-query and Earned / Projected print `0K` - a false figure, not "unavailable". Reads `payrollData[0]`. |
| `src/pages/TeacherPayroll.tsx` + `TeacherPayrollCalendar.tsx` (`/teacher/payroll`, in a TA's menu) | TA | Looks up a `teachers` row only; a TA gets "Not a teacher" and the page says "Unable to load payroll data". No figure, but no page either. |
