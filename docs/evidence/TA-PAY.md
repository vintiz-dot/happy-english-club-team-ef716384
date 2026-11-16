# TA-PAY - Teaching-assistant pay screens read calculate-payroll

MONEY: yes. Branch `pc2/ta-pay` from `origin/conductor/work` (2e88891a). Build and test only: nothing deployed, no migration, no database touched, no Supabase/Lovable/Cloudflare tool used.

**Where I am / next step:** code, tests and evidence written; final checks running. Next: record the counts, then mark DONE.

## 1. Screens that show a TA's pay (at 2e88891a)

Searched `src/` for `teaching_assistant`, `assistant`, `TAProfile`, `TAPay`, `assistant_rate`, `rateVnd`, `payroll`, `sessionPayVnd`, `totalPayVnd`, `effectiveRateVnd`, `rateUnit`, `describeRate`, `hourly_rate_vnd`, `per_session_rate_vnd`.

| Screen | Who sees it | What it did at 2e88891a |
|---|---|---|
| `src/components/admin/ta/TAProfileDrawer.tsx` (Teaching Assistants list -> drawer -> Payroll tab) | admin | Priced the month itself: its own `session_participants` query, Earnings = `totalPayVnd(TA row TODAY, minutes of every Held lesson)` (:59-95). Paid lessons the TA was marked absent from (`attended = false`, which `participationIsPayable` excludes), ignored rate history (today's rate for every month, closed ones too), "Held Sessions" counted the absences, "Total Sessions" counted every rostered row of any status (cancelled included). Hours/Lessons label from the TA row's basis today. |
| `src/pages/TeacherDashboard.tsx` (a TA signed in; the same page as teachers) | TA | Called calculate-payroll, which answered a TA 403; the query errored and the cards printed `(undefined \|\| 0)/1000` = **0K** Earned and 0K Projected - a false figure, not "unavailable". Read `payrollData?.[0]`. Hero rate = `effectiveRateVnd(TA row today)` / `rateUnit(row)`. |
| `src/pages/TeacherPayroll.tsx` + `TeacherPayrollCalendar.tsx` (`/teacher/payroll`, in a TA's menu) | TA | Looked up a `teachers` row only; a TA hit "Not a teacher" and the page said "Unable to load payroll data". No figure, no page. |

Checked and not a TA pay screen (unchanged):
- `src/components/admin/tabs/PayrollTab.tsx` - admin payroll, TAs included, already reads calculate-payroll through `payrollRows.ts` (`effectiveRateVnd(p.staff)` at :138 is the CSV's "rate on record" column and `describeRate` at :392 the row's caption; neither prices a lesson).
- `src/lib/finance/classPayroll.ts` - per-class staff cost from the function's rows (TAs flagged `isAssistant`), no pricing.
- `TeachingAssistantsList.tsx:81` - `describeRate(ta)`: the rate on record in the list, as `TeachersList.tsx` does for teachers.
- `PayRateHistory.tsx`, `PayRateFields.tsx` - editing the dated rate itself (T5 left these the same way).
- `AttendanceDrawer.tsx`, `lessonPayGuard.ts`, `SessionTASelector.tsx`, `TAClassAssignment.tsx` - who is on a lesson; no amounts.
- `OperationalReports.tsx:114,:304` and `ClassCalendarEnhanced.tsx:120` - teacher-only pricing (no TA), already recorded by T5 as open items; out of this task.

## 2. Before / after per screen

| Screen | Before | After |
|---|---|---|
| TAProfileDrawer (admin) | Prices in the browser (above). | Calls `calculate-payroll { month, teacherId: ta.id }` (an admin naming one person gets that person only since T5) and renders `teacherPayrollView`, picked by id. Earnings = the function's `totalAmountActual`; Held = `sessionsCountActual`; Total Sessions = the lessons the TA is paid for, held + still to come (the function's projected set); Hours/Lessons on the month's basis from the function (`payRateType`, the frozen line's when closed). Closed month: frozen totals and a line saying so; locked month without a frozen line: says the figures are calculated now. No answer: "Figure unavailable" (a dash with screen-reader text) and a line saying the figures could not be loaded - never 0. A TA the function answered for with no row (no lessons) shows 0, which is then true. Header "rate on record" (`describeRate(ta)`) kept: it is the staff record being edited in the same drawer. `totalPayVnd`, `describeQuantity`, `payRateTypeOf`, `durationMinutes` and the lesson query are gone. |
| TeacherDashboard (TA and teacher) | 0K for a TA; `payrollData[0]`; today's row rate. | `teacherPayrollView(response, own id)`. Earned / Projected / progress / duration variance from the view; "Figure unavailable" when the function did not answer (including an older deploy that still answers a TA 403). The hero rate is now the function's `hourlyRate` / `payRateType` for this month (in force on the month's last day) - "figure unavailable" when missing. `payRate` no longer imported. For a teacher the Earned/Projected figures are unchanged in an open month (same fields); see 6.2 for the rate. |
| `/teacher/payroll` (TA) | "Not a teacher". | Finds the signed-in person's `teachers` row, else their `teaching_assistants` row (by `user_id`), and asks the function; the function decides whose row it is from the JWT. Everything below is T5's page unchanged: headline, Lost Income, calendar days, Session Details and the CSV are the function's per-lesson figures; closed month = frozen totals with per-lesson amounts withheld when lessons changed after the close. Banking card shown only for a teacher (`teacher_banking_info` is keyed by `teacher_id`). Live updates for a TA listen on `session_participants` for their id. A month with no lessons now says "No paid lessons for you in ..." when the function answered with nothing, and "Unable to load" only when it did not answer. |

Fixture before/after, printed by `ta-payroll.test.mjs` (TA_1 raised 100,000 -> 150,000/h on 15 Oct and marked absent from one 6 Oct lesson; September closed with one of TA_1's two lessons booked at 150,000; TA_2 per-session 80,000):

| Screen | Figure | Old | Function (now shown) | Why |
|---|---|---|---|---|
| admin TA drawer (TA_1, Oct) | Earnings | 750,000 | 450,000 | old: today's 150,000/h over every Held lesson, the one the TA was absent from included; function: dated rate, attended lessons only |
| admin TA drawer (TA_1, Oct) | Held Sessions | 3 | 2 | old counted the 6 Oct lesson the TA was marked absent from |
| admin TA drawer (TA_1, Oct) | Total Sessions | 4 | 2 | old counted every rostered row, the cancellation and the absence included |
| admin TA drawer (TA_1, Sep CLOSED) | Earnings | 450,000 | 150,000 | old: both lessons at today's 150,000/h; now the frozen 150,000 the month was paid at |
| admin TA drawer (TA_2, Oct) | Earnings (per-session, no rate change) | 80,000 | 80,000 | agrees |
| TA dashboard (TA_1, Oct) | Earned | 0 | 450,000 | old: the function refused a TA and the card printed 0K |
| TA dashboard (TA_1, Oct) | Rate | 150,000 | 150,000 | today's row and the month-end rate agree here |
| TA /teacher/payroll (TA_1, Oct) | page | Not a teacher | the TA's own month | old page looked up a teachers row only |

The drawer's old error ran in the overpaying direction twice (absences paid; a raise re-priced past months upward).

## 3. calculate-payroll: who may read a TA's pay

`supabase/functions/calculate-payroll/index.ts`, the scoping block only. No pricing line changed.

- A caller holding `teacher` but not `admin`, with no `teachers` row, is looked up in `teaching_assistants` by the verified JWT's user id (`maybeSingle`). Exactly one row -> `ownAssistantId`. No row, two rows for one login, or a lookup error -> **403 before any lesson is read** (a thrown lookup -> 500, also before any read). Fails closed.
- For `ownAssistantId`: the teachers query is not run at all (so no teacher's lessons are read and no `payroll_summaries` row is written); the assistants loop - the same one that builds an admin's TA rows - runs narrowed to `id = ownAssistantId`; the body's `teacherId` is ignored, exactly as for a teacher.
- Unchanged: teacher scoping, admin, service role, families/pupils (role gate), a staff login with no staff row (403). A TA row whose login lacks the `teacher` role still fails the role gate.

### New response fields

None. A TA's row already carried everything the screens need (per-lesson `amount`, `rateVnd`, `payRateType`, `lostIncome`, headline `hourlyRate` / `payRateType`, frozen totals with `live` for a closed month) - it was only unreachable for a TA. `teacherPayrollView` now also reads two fields that were always in every row (`payRateType`, `hourlyRate`) and reports `answered` (the function sent a list) so "nothing this month" and "no answer" read differently.

### Fallbacks (browser ahead of the redeploy)

An old deploy answers a TA 403: the dashboard cards and rate show "Figure unavailable" (not 0K), `/teacher/payroll` says "Unable to load". The admin drawer works on the deployed function today (admin naming one TA has been answered since T5). A field missing from a row shows "figure unavailable" (`lostIncome`, `rateVnd`, `hourlyRate`, per-lesson `amount` - all tested).

## 4. Tests

- `scripts/pgtest/ta-payroll.test.mjs` (new, registered in `run.mjs` as "TA payroll function"): the real function bundled, in-memory tables, every read and write logged.
  - A TA gets exactly their own row; naming another TA, a teacher or the archived teacher returns the identical own-row answer; nothing of anyone else (id, name, lesson id) in it; only their own participations, their own TA row and their own lessons are read; no teacher's lessons read, nothing written.
  - 403 with no lesson read: two TA rows for one login, a staff login with no staff row, a TA row without the `teacher` role, the lookup erroring (403) or throwing (500).
  - Nothing else moved since 2e88891a: 15 callers/months (admin open/closed/Nov, admin naming a TA open and closed, admin naming a teacher, teachers, a teacher naming a TA, service role open and closed, no-row, two-TA-rows, parent, student) give **byte-identical** answers and identical writes. The TA's own call: 403 at BASE, now 200 with rows byte-identical to what an admin got for that TA at BASE (Oct, Sep closed, Nov).
  - Screen figures = the function's: open month (earned, projected, counts, hours, every per-lesson amount and rate, day totals = earned, Lost Income, rate/basis, plus the literal figures) and closed month (frozen line totals, `live` kept, per-lesson amounts and days withheld, the frozen rate); the admin's row for the TA equals the TA's own row and the service-role (close-payroll-month) row.
  - Missing fields -> "figure unavailable"; an old deploy's 403 -> not found and not answered.
  - Mutants of the new block: TA gets every TA (15 failures), TA's `teacherId` honoured (15), teachers query run for a TA (15 - it returns every teacher's pay), the lookup replaced by the old 403 (26). Removing the `ownTaErr` check survives: equivalent, since an error answer always has `data: null`, which is refused anyway; kept as belt and braces.
- `scripts/pgtest/teacher-payroll.test.mjs`: the TA-403 expectations replaced by "a TA gets their own row, nothing of T_A"; the TA case moved out of the BASE (6465f08) equality list into the stated intended difference; the no-staff-row login added to that list.
- `scripts/pgtest/teacher-payroll-view.test.mjs`: a TA's row by id, basis and rate, missing `hourlyRate` / `payRateType`, empty answer vs no answer vs a 403 body, another TA's row never shown; source checks that TAProfileDrawer and TeacherDashboard use no pricing helper, no `payrollData[0]`, no `|| 0` on money, the drawer runs no lesson query, the dashboard imports nothing from payRate, and `/teacher/payroll` looks a TA up by their own sign-in (each check confirmed to fail on the 2e88891a files).

## 5. Checks

(filled in below when run)

## 6. For the reviewer / owner

1. **To redeploy: `calculate-payroll` only.** No migration. Either order is safe (see Fallbacks). Until the redeploy a TA's dashboard says "Figure unavailable" where it used to say 0K, and the admin drawer already shows the function's figures.
2. Dashboard hero rate, teachers included, is now the function's rate for the current month (in force on its last day), not the staff row. They differ only when a rate change is dated later this month; T5 had left this line on the row as "today's rate". Revert that one line if the owner prefers today's rate there.
3. Not changed, found while reading (calculate-payroll's TA loop): the `session_participants` and held/projected `sessions` reads ignore their `error`, so a failed read gives that TA 0 / no row instead of failing the call - and close-payroll-month, which reads through here, would book them nothing. Teachers' reads throw. Making the TA reads throw is a behaviour change to the admin path and the month close, so it is left for a decision rather than slipped in here.
4. A TA has no banking-details card (the table is keyed by `teacher_id`).
5. Out of scope, still open from T5: `OperationalReports` (teacher-only lost payroll and fallback pricing) and `ClassCalendarEnhanced` cost.

## 7. What I could not verify

- The screens in a browser against a real or fake backend (no preview login for a TA here); the behaviour is covered through `teacherPayrollView` and the source checks, not by rendering.
- The deployed function: Deno is not on this machine and nothing was deployed; the edge typecheck in `run.mjs` stands in for the deploy's type check.
- Realtime: the `session_participants` subscription filter for a TA (`teaching_assistant_id=eq.<id>`) is not exercised by any test, and whether the table is in the realtime publication was not checked (no DB access); without it the page simply refreshes on navigation as before.
