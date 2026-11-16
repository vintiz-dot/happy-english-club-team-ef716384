# T5 independent money review

Reviewed: `worktree-agent-ac4c6ea6c6844f5e3` at b1b8a9d against `claude/hec-conductor-setup-efbaa5`. Review only: no product code changed, nothing deployed or pushed, no database access.

**Where I am / next step:** complete - verdict PASS at the end.

`fn` = `supabase/functions/calculate-payroll/index.ts`, `view` = `src/lib/teacherPayrollView.ts`.

## 1. Existing figures and readers

The handler diff is additive only: a constant and type (fn:86-100), `payRateType`/`rateVnd` on each per-session entry (fn:363-364, 428-429), `lostIncomeFor` (fn:731-747), one extra `sessions` read per staff member for `Canceled` lessons (fn:774-782, 902-908), `lostIncome` on each row (fn:827, 949), and the TA-loop narrowing (fn:866). No existing expression, total, freeze step (fn:959-992) or body field (fn:994-1011) is touched. The handler test replays 9 caller/month cases against the function at 6465f08 and compares the whole JSON after stripping the new fields, and the writes; my mutation M6 (lost income added into `totalAmountActual`) fails 7 of those checks, so the comparison is live.

Callers and what they read:

| Caller | Sends `teacherId`? | Reads |
|---|---|---|
| `close-payroll-month/index.ts:123-128` (service key) | no | `payrollData[]`: totalAmountActual, sessionsCountActual, totalMinutesActual, payRateType, hourlyRate, perSessionRate, teacherName, staffType -> payroll_lines, expenditures |
| `schedule-sessions/index.ts:300` (service key) | no | nothing (refresh of payroll_summaries) |
| `useFinanceSummary.ts:45`, `useFinanceOverview.ts:237` | no | grandTotalActual, grandTotalProjected, totalDiscrepancies, grandTotalVariance |
| `OperationalReports.tsx:205` -> `finance/classPayroll.ts` (per-class) | no | per-session details |
| `PayrollTab.tsx:74` -> `payrollRows.ts` -> `PayrollMonthLock` | no | rows incl. `live` |
| `PayrollManager.tsx:35` | no | payrollData, totalTeachers |
| `ClassSettings.tsx:184` | yes, a teacher id | nothing - side effect only (payroll_summaries upsert, teachers loop only; the TA loop never wrote summaries) |
| `TeacherDashboard.tsx:193` | yes, own id | `payrollData[0]` |
| `TeacherProfileOverview.tsx:17` | yes | `payrollData[0]` |
| `TeacherProfilePayroll.tsx:37`, `TeacherPayroll.tsx:58` | yes | by id through `view` |

No caller that needs everyone passes a `teacherId`: close-payroll-month, both finance hooks, OperationalReports, PayrollTab (so PayrollMonthLock) and schedule-sessions all send `{ month }` only. The narrowing cannot under-report payroll. **No blocker.** The four callers that do name a person either read `[0]`/by id (and are made more correct) or read nothing.

Minor (m1): the cancelled read in the teacher loop throws on error (fn:782), so a display-only figure is a new way for a close or the finance dashboard to fail. Same table and column list as the two reads above it, so in practice it fails only when they would. The TA loop's copy does not throw. Also one more query per staff member per call.

## 2. Closed month

- `payrollRows.ts`, `PayrollTab.tsx`, `PayrollMonthLock.tsx` are not in the diff. The freeze block and `live` are unchanged (fn:959-982). The handler test asserts the admin row for closed September is still the live 600,000 against a frozen 300,000.
- Teacher screens: `earned`, `heldSessions`, `totalHours` are the frozen figures (view:202-203, 278-285). `closed` requires `locked` and a live figure on the row (view:211-212). Per-lesson and per-day amounts are shown only when live amount and count both equal the frozen ones (view:215), otherwise null (view:244, 253) -> a dash and "Figure unavailable". "Still to come" is live projected minus live actual (view:221-225). The page states the month is closed (`TeacherPayroll.tsx:214-219`, `TeacherProfilePayroll.tsx:92-96`).
- So no recomputed amount is presented as paid. Three residues, all minor:
  - m2: in a withheld closed month the CSV still prints the per-lesson `rateVnd` (view:245 is not gated) - a recomputed rate beside a blank amount.
  - m3: a person with no frozen line in a locked month (earned nothing at the close, lesson marked Held afterwards) is shown the live figure as "Amount Earned" with no closed note (view:212; tested as intended at "a locked month in which this person has no frozen line"). Pre-existing behaviour of the function and the old page; the money is genuinely a correction owed, but the label could say so.
  - m4: equal total and count with different lessons (one removed, one added at the same price) passes the view:215 test. Edge case; amounts still add up to what was paid.

## 3. Auth

- `requireRole(req, supabase, ["admin","teacher"])` (fn:491) -> `_lib/auth.ts:96-119`: token verified with `auth.getUser`, roles from `user_roles`; exact service key passes as internal.
- Non-admin teacher: own `teachers` row by `user_id = JWT user` (fn:544-556); body `teacherId` is only reached in the `else` (fn:557). TA loop is `isAdmin` only (fn:853). `.single()` fails closed on zero or duplicate rows -> 403.
- No parameter reaches another person's pay for a non-admin. Service-role client reads all rates into memory (fn:580-584) but the response is built only from the scoped `teachers` list.
- TA: 403 "Teacher profile not found", before any lesson is read. This is unchanged from 6465f08, and TAs have no pay screen to lose: `/teacher/payroll` (`App.tsx:138`) throws "Not a teacher" before calling (`TeacherPayroll.tsx:56`). **Major-follow-up (not T5's, not a regression):** `TeacherDashboard.tsx:189-198` does call the function for a TA, gets the 403, and the dashboard cards at :448/:465 then show a TA "0K" earned and projected. TAs are paid; they are shown zero. Needs an owner decision (a TA self-view in the function, or hide the cards for TAs).
- Tests exercise each case against the real bundled handler with a recording client: 401 none/forged; 403 parent, student, TA, teacher-role-with-no-row (also when naming their own TA id), with "no lesson read, nothing written, nothing of T_A in the body"; A naming B / naming a TA -> A only and no B lesson read; B naming A; admin all / one teacher / one TA / archived; service role all.

## 4. New fields

- `rateVnd: effectiveRateVnd(rate)` and `payRateType: payRateTypeOf(rate)` where `rate = rateOnDate(ratesDesc, s.date, fallbackRate)` (fn:379, 428-429) - the same object `amount` is priced from (fn:381). Dated, not today's. Mutation M3 (today's rate) caught.
- `lostIncome` = `computeTotals` over the month's `Canceled` lessons with the person's rate history (fn:737); teachers by `teacher_id`, TAs by payable participations (fn:902-908, same `sessionIds` as held/projected). In no total (M6 caught). Mutation M4 (today's rate) caught. No new pricing rule: per-session staff lose one fee per cancelled lesson, which is `sessionPayVnd` and what the old browser code did.
- `"Canceled"` is a literal in the handler (fn:92), not in `payroll-sessions`; correct for that module's purpose (which lessons are paid) and it keeps the mirrors untouched. `_lib/pay-rate.ts`, `pay-history.ts`, `payroll-sessions.ts` and their `src/lib` twins are not in the diff; mirror suite result in section 7.

## 5. The browser

- Grep of the three screens and `view` for `sessionPayVnd|totalPayVnd|effectiveRateVnd|durationMinutes|hourly_rate_vnd|per_session_rate_vnd|rateUnit` returns nothing outside comments. The teacher row is read for `id` only (`TeacherPayroll.tsx:50-54`).
- Arithmetic that remains is over the function's own figures: minutes/60 for display (`TeacherPayroll.tsx:127`, `TeacherProfilePayroll.tsx:199`), day sums of `amount` (view:249-254), projected minus actual (view:221-225), class counts (view:256-267, `TeacherProfilePayroll.tsx:46-47,71,124`). No rate multiplies anything.
- Missing fields: `lostIncome` absent -> null -> "—" and "Figure unavailable" (`TeacherPayroll.tsx:268-274`); `amount` absent -> null -> dash with "Figure unavailable" (page :327-329, profile :207-209, calendar :164-169); `rateVnd` absent -> blank CSV cell (:135-136). None falls back to a computed number.
- CSV: every money cell is `s.amount`, `s.rateVnd`, `view.earned`, `view.stillToCome`, `view.projectedTotal` (`TeacherPayroll.tsx:124-143`).
- m5 (cosmetic): the calendar badge still relabels a Held lesson dated after now as "Scheduled" (`TeacherPayrollCalendar.tsx:66-75`) while the day total now includes it.

## 6. The six disagreements - real? fixed? shown or paid?

Checked against the 6465f08 sources.

| # | Disagreement | Real at base | Fixed | Shown or paid |
|---|---|---|---|---|
| 1 | Today's rate instead of the dated rate (calendar days, Lost Income, CSV rate) | yes: `TeacherPayrollCalendar.tsx:46-47`, `TeacherPayroll.tsx:100,174-175` at base | yes | SHOWN only, to teachers whose rate had changed. Upward after a raise |
| 2 | Closed month: calendar summed live detail; "+X scheduled" = live projected minus frozen actual | yes: base `TeacherPayroll.tsx:208-209` | yes | SHOWN only |
| 3 | Held lesson dated in the future left out of its day | yes: base calendar :55-64, :100-101 | yes for the money; badge still says Scheduled (m5) | SHOWN only (under-shown) |
| 4 | `rate_override_vnd` applied on the admin profile, ignored by the function | yes in code: base `TeacherProfilePayroll.tsx:88-107` | yes (deleted) | Never even shown: see 5. PAID figures never used the override |
| 5 | Admin profile Session Details always empty | yes: base read `payrollData.sessions`, which the function does not return | yes | SHOWN (an empty table) - which also means the wrong amounts of 1 and 4 on that admin table never rendered |
| 6 | `payrollData[0]` = a TA's pay under an archived teacher's name | yes: handler test reproduces it on the base function | yes, twice (by-id pick + narrowing). `TeacherProfileOverview.tsx:21` still reads `[0]` and is fixed only by the redeploy | SHOWN to admins only |

None of the six touched what anyone was PAID: payroll_lines are written by close-payroll-month from calculate-payroll's totals, which are byte-for-byte unchanged. The one place where pay may differ from what an admin intended is item 4 seen from the other side: admins can type an override on a lesson (`AddSessionModal.tsx:120`, `EditSessionModal.tsx:62`) and it has never paid. That is not caused or changed by T5; it is owner question 2.

## 7. Suites and mutations (run by the reviewer)

- `node scripts/pgtest/run.mjs`: 3630 assertions, 43 suites, 0 failed (teacher payroll view 59/0, teacher payroll function 81/0, payroll screen rows 69/0, shared-module mirrors 13/0, payroll month locking 55/0, edge functions typecheck 5/0, app typecheck 3/0).
- `npx --yes bun test scripts/payrollCalculation.test.ts`: 6 pass, 0 fail.
- `tsc --noEmit -p tsconfig.app.json`: exit 0.
- node_modules junction removed with `cmd //c rmdir`; the real folder is intact; working tree clean.

Mutations, all mine (the implementer's two not repeated). Handler mutants were written outside the repo and passed to the test by path; view mutants were written in place and the original bytes restored and verified.

| Mutant | Result |
|---|---|
| M1 gate: body `teacherId` wins over the JWT's teacher | caught (8) |
| M2 gate: a teacher also gets the TA loop | caught (4) |
| M5 gate: teacher role with no teachers row falls through to everyone | caught (10) |
| M7 gate: admin TA narrowing inverted | caught (5) |
| M3 `rateVnd` from today's rate | caught (2) |
| M4 lost income at today's rate | caught (2) |
| M6 lost income added into `totalAmountActual` | caught (7) |
| V1 view: fall back to `payrollData[0]` | caught (2) |
| V2 view: recomputed amounts shown in a drifted closed month | caught (5) |
| V3 view: missing amount becomes 0 | caught (2) |
| V4 view: still-to-come against the frozen actual | caught (3) |
| V5 view: missing lost income becomes 0 | caught (1) |
| V6 view: closed month shows live as earned | caught (3) |
| V7 view: day totals include unpaid lessons | caught (4) |
| V8 view: partial day sum when an amount is missing | caught (3) |

15 of 15 caught, 0 survived.

## 8. Owner questions - recommended defaults

1. Closed month corrected after closing: keep what T5 does - show the paid totals, withhold per-lesson amounts, say why. A teacher's page should never carry two answers; the correction reaches them as an adjustment in a later month. Does not block.
2. `rate_override_vnd`: default NO, it does not affect pay (unchanged, and what has always been paid). But admins can still type it on a lesson, so either remove/relabel that input or decide it should pay and change the function with tests. Before deciding, the owner should count lessons with an override set. Does not block T5; it is the only item where PAID could differ from what an admin intended.
3. `TAProfileDrawer`, `OperationalReports`, `ClassCalendarEnhanced`: a follow-up task, admin-facing display only, none writes pay. Do `TAProfileDrawer` first - it counts lessons the TA was absent from. Does not block.

Added by this review: a TA's dashboard shows 0K earned/projected because the function answers TAs 403 (section 3). Pre-existing; follow-up.

## Verdict: PASS

No blockers, no majors inside T5. Minors m1-m5 are optional. Deploy: `calculate-payroll` only, no migration. Either order is safe; function FIRST is better - the old screens ignore the new fields, the new screens then never show "Figure unavailable", and `TeacherProfileOverview`'s `[0]` is corrected by the function alone.
