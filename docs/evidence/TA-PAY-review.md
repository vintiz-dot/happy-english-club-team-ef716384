# TA-PAY review (independent)

Where I am / next step: complete. Verdict below.

Reviewed `origin/pc2/ta-pay` 18004f6a (from 2e88891a), merged with `claude/hec-conductor-setup-efbaa5` 21c8c82a on `review-ta-pay`. The merge had no conflicts (`run.mjs` merged cleanly). Review only: no product code changed, nothing deployed, no push, no database access, pglite only.

## Verdict: SHIP

No blocker. No amount computation changed. A TA gets their own row and nothing else. Screens show only the function's figures. The minors below are optional. Two pre-existing items in the function's TA loop are follow-ups, not regressions.

Deploy: `calculate-payroll` only, no migration. Either order is safe. The admin drawer already works against the deployed function. Until the redeploy, a TA's dashboard and page show "figure unavailable" / "Unable to load", where they used to show 0K / "Not a teacher".

## 1. Payroll computed only in calculate-payroll
- PASS. Grep over `src/` for `sessionPayVnd|totalPayVnd|effectiveRateVnd|durationMinutes|rateOnDate|datedPayrollTotal`: no TA screen hits. Remaining hits are `OperationalReports.tsx:114,304` and `ClassCalendarEnhanced.tsx:120`, both teacher-only and already open from T5. `ExpendituresManager` / `RecurringExpendituresManager` only list TA names for manual amounts.
- TAProfileDrawer: its own `session_participants` query and `totalPayVnd(ta row today)` are gone. It calls the function with `{month, teacherId: ta.id}` and renders `teacherPayrollView` by id. "Figure unavailable" appears when there is no answer, 0 only when the function answered with no row (drawer:73).
- Closed month: frozen totals, and per-lesson amount/rate withheld when the live figures differ from the frozen ones (view:246, 275, 279). The page and the drawer both say the month is closed. Test: "CLOSED month" section of `ta-payroll.test.mjs`, per-lesson `[null,null]`.

## 2. calculate-payroll (diff vs origin/main = vs 2e88891a; the base and main are identical for index.ts, pay-rate, pay-history, payroll-sessions)
- The diff touches the scoping block only (index.ts:523-588) and the TA-loop gate/filter (:911, :925-926). No pricing, totals, freeze (:1013-1046) or body (:1048-1065) line changed.
- TA identity comes from the JWT: `teaching_assistants.user_id = gate.userId`, `maybeSingle`. Zero rows, two rows, or an error give 403. A throw gives 500. Either way the refusal comes before any lesson read. The body's `teacherId` is ignored for a TA (:925). For a TA, the teachers query is never run (:585), so no teacher lessons are read and no `payroll_summaries` are written.
- Admin, teacher, service role, no-row, parent and student answers are byte-identical to the base, with identical writes. That covers 15 cases in `ta-payroll.test.mjs` and 9 in `teacher-payroll.test.mjs`.
- `close-payroll-month`, `useFinanceSummary`, `useFinanceOverview`, `PayrollTab`, `payrollRows` are not in the diff (`git diff --stat origin/main HEAD` on them: empty). Service-role calls are unchanged, so finance figures and payroll_lines are unaffected.
- Changes to the existing T5 tests are the intended difference only: the TA 403 case became "own row, nothing of T_A". Nothing was weakened.
- My mutants (index.ts copies passed by path to `ta-payroll.test.mjs`):

| Mutant | Result |
|---|---|
| M1 body teacherId wins over own TA id | caught (12) |
| M2 no 403 when no TA row | caught (5) |
| M3 teachers query run for a TA | caught (15) |
| M4 two TA rows: take the first | caught (31) |
| M6 TA loop unscoped for a TA | caught (15) |
| M5 `ownTaErr` check removed | survives, equivalent (an error always has data null, which is refused anyway); the builder found the same |

## 3. Attendance (`attended = false`)
- Function rule: `participationIsPayable` (absent rows unpaid). `attended` is NOT NULL DEFAULT true (20261022090000), so null is not a case.
- Absent case (fixture): screen = function = 450,000, 2 held. The old drawer showed 750,000 and 3 held: it paid the absent lesson, and priced it at today's rate.
- Present case (my probe: the fixture's absent row flipped to `attended: true`, temp copy of the suite, deleted after): every "screen = function" equality still passes (earned 600,000 = `totalAmountActual`, per-lesson amounts = the function's). Only the literal 450,000 fixture assertions fail, as expected.
- Before this change, on screen only: the admin drawer OVERSTATED a TA who was marked absent (absences counted, cancelled rows in "Total Sessions"). It also re-priced past months at today's rate, upward after a raise. The TA's own dashboard UNDERSTATED: 0K, because the function answered 403. Nothing was paid from either: payroll_lines come from close-payroll-month, which reads the function, and that path is unchanged.

## 4. Design
- PASS. Every className removed in the diff is re-added on the replacement element (`text-2xl`, `STAT_VALUE`, `whitespace-nowrap tabular-nums`, `text-hec-small font-normal text-hec-ink-soft`). The new notes use `text-xs text-muted-foreground`, already used three times in the drawer.

## Findings (one line each)
- m1 `src/pages/TeacherDashboard.tsx:355`: the hero rate now shows "figure unavailable" for a TA with no paid lessons this month (function answered with no row, so `rateVnd` is null). Before, it showed the rate on record. Display only. It also changes teachers' hero rate to the month-end dated rate (builder's 6.2): owner's choice.
- m2 `src/pages/TeacherPayroll.tsx:98`: a TA's live refresh listens on `session_participants` only. Marking the lesson Held (a `sessions` change) does not refresh. Neither table is added to `supabase_realtime` in any repo migration (could not check live). Display only.
- m3 `src/components/admin/ta/TAProfileDrawer.tsx:209`: "Total Sessions" now means paid lessons (held + still to come), not rostered rows. Correct, but the label is unchanged.
- m4 (design): a login that has both a teachers row and a TA row gets the teacher row only, in both the function (:560) and the page. Their TA pay is visible only to an admin. Pre-existing scoping, consistent on both sides.
- F1 PRE-EXISTING, money, follow-up: `calculate-payroll/index.ts:934-960`. The TA loop's participations/held/projected reads ignore `error` (the teachers' reads throw). A failed read gives that TA no row: 0 on screens, and nothing booked by close-payroll-month. The builder flagged it too.
- F2 PRE-EXISTING, money, could not check: `index.ts:934-949`. Participations are read for all time, then `.in("id", sessionIds)` goes into a GET URL. A long-serving TA's id list (~37 bytes per lesson) may exceed the gateway URL limit. Combined with F1, that silently drops the TA. Probe: count each TA's participations live (owner), or filter participations by the month's sessions.

## Counts (merged tree)
- `node scripts/pgtest/run.mjs`: 7056 assertions, 78 suites, 2 suites failed, neither from TA-PAY:
  - `d4 lesson pay` 142/1, "a time change that makes a started lesson 'not started'…". The case uses `clock(0,1)` / `clock(0,2)` (now +1h/+2h) and the run was late evening Hanoi, so it is the same time-of-day family as the known "C-1" flake. TA-PAY touches no d4 file.
  - `ai spend gate (F-02)` 249/1: `reception-feed` has `verify_jwt = false` in `supabase/config.toml`, from the Reception commits c44b2461 and present at 2e88891a. TA-PAY does not touch config.toml. The builder reported it too. Conductor / Reception owner to settle.
  - Payroll suites: TA payroll function 108/0, teacher payroll function 124/0, teacher payroll view 94/0, payroll screen rows 69/0, payroll session rules 27/0, payroll month locking 55/0, shared-module mirrors 19/0, edge functions typecheck 5/0, app typecheck 3/0.
- Standalone: `ta-payroll` 108/0, `teacher-payroll` 124/0, `teacher-payroll-view` 94/0, `payroll-rows` 69/0.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0 (1940 files listed). `npx tsc` fails on this path (the `&` in the folder name), not on the code.
- `npm run test:bun`: 250 pass, 0 fail, 18 files.

## Release list
- src: `src/components/admin/ta/TAProfileDrawer.tsx`, `src/lib/teacherPayrollView.ts`, `src/pages/TeacherDashboard.tsx`, `src/pages/TeacherPayroll.tsx`.
- calculate-payroll: `supabase/functions/calculate-payroll/index.ts` and its `_lib` imports `_lib/pay-rate.ts`, `_lib/pay-history.ts`, `_lib/auth.ts`, `_lib/payroll-sessions.ts`. Note: on the merged tree, `_lib/auth.ts` carries S2's `keysMatch` (F-08), which is not on origin/main. Deploying from the merged tree ships it. It is S2-reviewed and the same file the S2 function deploys use, so deploy after or alongside S2, from the same tree.
- Tests (not deployed): `scripts/pgtest/ta-payroll.test.mjs`, `teacher-payroll.test.mjs`, `teacher-payroll-view.test.mjs`, `run.mjs`.

## Could not check
- The screens rendered (no TA preview login). Covered through `teacherPayrollView` and source checks only.
- The deployed function, Deno type-check (edge typecheck stands in), and realtime publication membership.
- Live TA participation counts, which F2 depends on.
- node_modules junction to be removed with `cmd /c rmdir node_modules` at the end.
