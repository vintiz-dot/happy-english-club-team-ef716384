# D5 - Money invariant audit

**Where I am / next step:** DONE on branch `claude/d5-money-audit` (from conductor efcb3a64). Built: this audit, `scripts/CHECK-money-invariants.sql` (40 checks), `scripts/CHECK-past-cancellations-with-evidence.sql`, and four suites registered in `scripts/pgtest/run.mjs` (money invariants check 94, past cancellations check 20, money write paths 19, sibling hold 18). Next step is the conductor's: run the two CHECK scripts on live (read-only) and read the numbers against section 4. No product code, migration or function was changed.

Scope: everything live on 17 Nov 2026 (MASTER_PLAN log to "D4 STEP 2 DATABASE LIVE") plus D4 steps 3A / 3B, which are in this tree but NOT live. Method: read the plan, D0, D1, D2, D4, root and `supabase/` AGENTS.md; read every write path (section 3, found by a scan that is now a test); for each invariant, name the enforcing object and the test that proves it; write a data check where the data can show a violation.

Legend: **ENFORCED** = a trigger, function or single rule makes it true; **TESTED** = a suite in `run.mjs` (or a bun suite) fails if it breaks; **GAP** = not enforced, or enforced but untested. New in D5 = added by this task.

---

## 1. The invariants

| # | Invariant | Where it is enforced | Test that proves it | Data check | Status |
|---|---|---|---|---|---|
| I-1 | Tuition is priced in ONE place: `calculate-tuition` / `calculate-tuition-bulk` (shared `_lib` helpers), never in the browser | the two calculators; T3 moved AdminTuitionList onto calculate-tuition-bulk (`src/lib/tuitionRows.ts`) | `invoice-status` (every figure vs `fixtures/tuition-figures.golden.json`), `tuition-prior-balance`, `enrollment-order`, `enrollment-discounts`, bun `tuitionRows` | - | ENFORCED+TESTED for the calculators; **GAP G-8** for the browser remnants |
| I-2 | Payroll is computed ONE place: `calculate-payroll`; screens map, never price | the function; `payrollRows.ts`, `teacherPayrollView.ts`; T5 + TA PAY moved the teacher and TA screens | `payroll-rows`, `teacher-payroll`, `teacher-payroll-view`, `ta-payroll`, `payroll-sessions`, bun `payrollCalculation`; New in D5: `money-write-paths` section 6 (no NEW importer of a pricing function outside `src/lib`) | - | ENFORCED+TESTED except **GAP G-8** (OperationalReports) |
| I-3 | `invoices.recorded_payment` is written only by compare-and-set on the value read (or under a row lock) | `_lib/recorded-payment-write.ts` + mirror `src/lib/recordedPaymentWrite.ts`; `ai_action_apply/undo` read the bill `FOR UPDATE`; CREDIT script compares; calculate-tuition does not write it | `invoice-status` "T4 r2" (two payments at once, each path), `mirrors`; New in D5: `money-write-paths` section 4 - repo-wide, every TS payload and every SQL `SET recorded_payment` | M08 | ENFORCED+TESTED |
| I-4 | The money a bill records is money the ledger received (bill `recorded_payment` = CASH/BANK legs for that child and month) | only the family payment paths post both | `invoice-status` (payment paths), `past-leftover-credit` | M03, M04 | **GAP G-1, G-2** (not enforced) |
| I-5 | Every ledger transaction balances (debits = credits per `tx_id`) | each writer inserts both legs in ONE insert (atomic) | `past-leftover-credit`, `invoice-status` (delete-payment reverses both legs) | M01, M02 | enforced by writers only; **GAP G-11** (ledger editable, not audited) |
| I-6 | A family payment's allocations add up to the payment; money beyond the bills is credit on the first child's bill (no unapplied cash) | smart-family-payment / family-payment (v8, overpayment-as-credit) | `invoice-status` D-23 + overpayment cases, `past-leftover-credit` | M05, M06, M07 | ENFORCED+TESTED (old rows: M05 history) |
| I-7 | `invoices.status` comes from ONE rule, `paidLabel` (recorded vs payable); only an admin's `credit` is kept | `_lib/invoice-status.ts` + mirror + `public.invoice_paid_label`; every writer uses it; InvoiceStatusManager offers only `credit` or "follow the payments" | `invoice-status`, `mirrors`, `ai-actions`; New in D5: `money-write-paths` section 5 | M11, M12 | ENFORCED+TESTED at write time; **GAP G-4** (not re-derived when the carry moves) |
| I-8 | The carry chain: a bill's carry-in is the sum of every earlier month; carry_out of month N = carry_in of the child's next bill | `invoices_carry_sync` AFTER trigger -> `refresh_invoice_carry` (20261009120000) | `invoice-status` (loads the migration); New in D5: `money-invariants-check` section 6 (real trigger, many writes, chain holds) | M09, M10 | ENFORCED+TESTED (residual R-1) |
| I-9 | A frozen bill keeps its charged figures (base, discount, total, class breakdown); only an admin unfreezes | `keep_frozen_invoice_amounts` BEFORE UPDATE (20261106120000); calculators report saved figures; D4 G-9 bill floor remembers `ever_frozen` | `invoice-status` (frozen cases), `d4-floors`; New in D5: `money-invariants-check` section 6 (an upsert-style overwrite is kept out) | M13, M14, M15, M16 | ENFORCED+TESTED; **GAP G-12** (delete + re-create) until 3B |
| I-10 | A payment names its tuition month, confirmed separately from the receipt date | `useTuitionMonthConfirmation` (all payment forms); `family-payment` requires and filters by month | `family-payment-month`, bun `paymentMonth` | not checkable on data (month and receipt date may differ on purpose) | ENFORCED (client rule for the single-child screens) +TESTED |
| I-11 | A child on a sibling-discount hold is left out of the family until the month of `sibling_discount_from` | `_lib/sibling-hold.ts`, used by compute-sibling-discounts and projected-per-class (watch-sibling-threshold) | New in D5: `sibling-hold` (the month rule, fail-closed read, both callers, no second copy); `ai-actions` (setting a hold) | - | ENFORCED+TESTED (New); **GAP G-10** |
| I-12 | A cancelled lesson bills nobody: its register is Excused, cannot be set otherwise (parent-row lock), and both readers fail closed on any unknown status | `guard_cancelled_session_attendance` + `trg_cancel_session_excused` (20261027090000); `_lib/tuition-session.ts` `isBillableTuitionSession` | `cancelled-lessons`, `session-cancel-guard`; New in D5: `money-invariants-check` section 6 | M17 | ENFORCED+TESTED |
| I-13 | A child is billed only for lessons inside an enrolment (class, dates, weekday) | `guard_attendance_enrollment` (20261106090000); `end_enrollment` / `change_enrollment_days` remove only placeholders | `d4-register`, `d4-money-inputs` (load it), `enrollment-discounts` | M18 | ENFORCED for new marks; old marks after an enrolment edit are reported |
| I-14 | D2: no person cancels, un-cancels, deletes or moves a started / evidenced lesson except through the checked RPC (evidence read first, reason, tier, review, bills refreshed); never a raw cancel | `session_cancel_guard` trigger + `cancel_session_checked` & co. (20261112091000); manage-session / bulk-cancel-sessions on the admin's JWT | `session-cancel-guard`, `session-guard-functions`, `d4-d2-carryover`; New in D5: `past-cancellations-check` (the M20 pairing proven on the real RPC) | M20-M24, M40; CHECK-past-cancellations | ENFORCED+TESTED |
| I-15 | D4 floors: removing evidence or lowering a bill never lowers the tier the next change meets | `session_evidence_floor`, `invoice_state_floor` (20261114090000, live) | `d4-floors`, `d4-rollback` | M38 | ENFORCED+TESTED |
| I-16 | D4 register: an old billed mark changes only with a reason (admin) or not at all (teacher); a service writer is recorded; marks keep their lesson and child | `zz_attendance_money_guard`, G-10/G-11/G-12 (20261114091000, live with repair-attendance / mark-attendance / guarded-change-refresh) | `d4-register`, `d4-functions-register`, `d4-stars-interplay`, `money-guard-lib` | M25-M28 | ENFORCED+TESTED |
| I-17 | D4 class fees are dated: a lesson is priced at the fee in force on its date; `classes.session_rate_vnd` mirrors "the fee now" | `class_fee_history` + 3 triggers (20261114092000, DB live 17 Nov); calculators read it (`_lib/class-fee.ts`) | `d4-class-fee` (golden byte-identical with and without the table), `d4-apply-chain` | M29, M30 | ENFORCED+TESTED; function deploy NOT VERIFIED here (log: "running") |
| I-18 | D4 lesson pay (3A): un-hold, hold without register, teacher / time / assistant changes of paid lessons go through the checked path | `zz2_session_pay_guard` (20261114093000) | `d4-lesson-pay`, `d4-functions-lessons` | none (not live) | TESTED, **NOT LIVE** |
| I-19 | D4 money inputs (3B): enrolments, discounts, pay rates, unfreeze, family links, imports, deletes reach bills only with a reason | `zz_*_money_guard` (20261114094000) | `d4-money-inputs`, `d4-functions-inputs`, `d4-reach-oracle`, `money-inputs-lib` | none (not live) | TESTED, **NOT LIVE** |
| I-20 | Past unapplied cash is credited once onto a bill; the old pair taken out, the cash leg posted | `scripts/CREDIT-past-unapplied-cash.sql` (run 17 Nov), delete-payment v7 (`keyKind`) | `past-leftover-credit` | M34, M35 | ENFORCED+TESTED |
| I-21 | No voluntary contribution or Settle Bill can be made; a write-off counts only if keyed `settlement-writeoff-` (none exists) | settle-bill v6 is a 410 stub; options removed from the payment functions and screens | `removed-money-features` | M36, M37 | ENFORCED+TESTED |
| I-22 | A closed payroll month is frozen: its lines, summaries and booked payroll cost cannot change until it is reopened (with a reason); the screen re-reads the period before booking | `refuse_write_to_locked_payroll` (20261021093000); `refuse_payroll_expenditure_write_to_locked_month` (20261022091000); `canBookPayroll` + fresh read in PayrollTab | `payroll month locking` (paylock), `class overhead` (loads 20261022091000), `recurring expenditures`, bun `payrollCalculation` | M31, M32, M33 | ENFORCED+TESTED; **GAP G-7** (re-close leaves stale lines) |
| I-23 | A recalculation never un-confirms or un-pays a bill; a changed figure on a confirmed bill goes to needs_review with a flag | calculate-tuition label rule (T1) | `invoice-status` | - | ENFORCED+TESTED |
| I-24 | delete-payment takes the payment off the bill and reverses both ledger legs; refuses when the bill holds less than the payment put there | delete-payment v7 | `invoice-status`, `past-leftover-credit` | M08, M34 | ENFORCED+TESTED |
| I-25 | Every money-affecting admin write leaves an append-only audit row (who, when, before/after) | `audit_row_change` on invoices, payments, payment_allocations, attendance, enrollments, classes, students, user_roles, discount_assignments, sessions (U/D), payroll_*, staff_pay_rates, session_participants, teachers, TAs, class_overhead_*, class_fee_history; D2/D4 override + event tables | `session-cancel-guard`, `d4-*` (append-only checks of their tables) | - | **GAP G-11** (ledger_entries, ledger_accounts, expenditures, settlements, sibling_discount_state, discount_definitions, monthly_finance_snapshots not audited) |
| I-26 | No money table is written from the browser that the browser must not write (payments, allocations, ledger, payroll lines/periods/summaries, settlements, snapshots, attendance, enrolments) and no browser code holds a service key | RLS + routing through functions / checked RPCs | New in D5: `money-write-paths` sections 1-3 (every writer pinned) | - | ENFORCED+TESTED (New); **G-9** dead generic importer |

**Count: 26 invariants. 14 enforced and tested with no open gap (I-3, I-6, I-8, I-10, I-12 - I-17, I-20, I-21, I-23, I-24); 2 tested but not live (I-18, I-19); 10 with an open gap (I-1, I-2 G-8; I-4 G-1/G-2; I-5, I-25 G-11; I-7 G-4; I-9 G-12; I-11 G-10; I-22 G-7; I-26 G-9).** Section 2 numbers twelve items: 9 open gaps that need a code change (G-1, G-2, G-4, G-7, G-8, G-9, G-10, G-11, G-12 - proposed, not built; G-12 is already fixed in the unapplied 3B), 2 closed by D5 tests alone (G-3 carry chain had no data check, G-6 write paths had no inventory), 1 that turned out not to be a gap (G-5). Of the open ones, five are pinned by a D5 test so that today's behaviour cannot get worse unseen (G-2, G-4, G-8, G-9, G-10), and the data checks size G-1, G-4, G-7, G-11 on live.

---

## 2. Gaps

Each gap: what, evidence, risk, proposed fix (NOT built), and the test that pins it today.

**G-1 - Money recorded on a bill with no payment row and no ledger leg.** RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog, RecordedPaymentManager (`src/lib/recordedPaymentWrite.ts`) and `ai_action_apply` add to `invoices.recorded_payment` and write an `audit_log` entry, nothing else. No `payments` row, no CASH/BANK leg. So the ledger is not the record of money received; delete-payment cannot take such a payment back (there is nothing to delete); reports from `payments` miss it. Risk: medium (amounts owed are right - they read `recorded_payment` and the carry - but the two money records disagree, and a correction is a hand edit). Fix: one `record-payment` edge function (single child) that posts the payment row, the two legs and the CAS bill write in that order, as smart-family-payment does, and point the four screens and the AI action at it; afterwards M03 stops growing. Pinned: M03 counts it on live; `money-write-paths` pins the four screens as the only browser writers of the column.

**G-2 - `modify-payment` changes the ledger but never the bill.** `supabase/functions/modify-payment/index.ts` inserts a reversal payment and legs and a new payment and legs, but no write to `invoices.recorded_payment` (calculate-tuition no longer writes it, by design). It also books `method === 'cash'` case-sensitively (`'Cash'` goes to BANK, the fault fixed in family-payment), ignores every insert error, and has no compare-and-set. Its screen `ModifyPaymentModal.tsx` is not mounted anywhere, so it is reachable only by a direct call with an admin token. Risk: low today. Fix: delete the function and the modal, or rebuild it on delete-payment + a new payment through the payment paths. Pinned: `money-write-paths` (its six writes are listed); M04 would count a use.

**G-3 (closed in D5, was "untested") - the carry chain had no data check.** M09/M10 now recompute it on live. Residual R-1: `invoices_carry_sync` returns early at `pg_trigger_depth() > 1`, so an invoices write made from inside another trigger would leave the chain stale. No such writer exists today (checked: the freeze and floor triggers do not write invoices rows); M09 would show one.

**G-4 - A bill's label is not re-derived when the carry moves its payable.** The carry trigger rewrites carry_in of every later month when an earlier month changes, but `status` is re-derived only when that later bill is itself written (payment, calculate-tuition). Example proven on the real triggers (`money-invariants-check` section 6): November is overpaid by 700,000; December's payable becomes -100,000 with 200,000 recorded, the rule says "paid", the bill still says "partial". Money is right (amounts owed read recorded_payment and the carry); the label is wrong, and the D2/D4 settled tests read labels. Risk: low-medium. Fix (migration, owner): in `refresh_invoice_carry`, also set `status = invoice_paid_label(...)` on rows whose carry changed, leaving `credit` and `draft` alone. Pinned: the section-6 case asserts the stale label (it will fail when fixed - then flip it); M11/M12 count it on live.

**G-5 (closed - not a gap).** The R09/T4 note that InvoiceStatusManager hand-sets labels is out of date: it offers only `credit` and "follow the payments" (`invoicePaidLabel`). `money-write-paths` section 5 now holds that.

**G-6 (closed in D5) - write paths had no inventory.** `money-write-paths` pins 86 file/table/operation writers and 51 RPCs; a new one fails the suite until read and added to section 3.

**G-7 - Re-closing a payroll month leaves stale lines and booked cost.** `close-payroll-month` upserts lines and payroll expenditures for the people who earn on the close; it never deletes the lines / costs of someone who earned at an earlier close and no longer does (reopen, correct, close). The month then pays and books a person it should not. Risk: low (reopen is rare) but it overpays, the direction this code has drifted in before. Fix: on close, while the month is still open, delete that month's `payroll_lines` and `source_kind = 'payroll'` expenditures whose subject is not in the new set, in the same request, before the lock. Pinned: M33 counts a cost without a line on live.

**G-8 - Browser pricing still on some screens.** `OperationalReports.tsx` prices lost tuition / payroll with `sessionPayVnd` and `splitPayrollByClass`; per the unfinished browser-pricing task (`origin/pc2/browser-pricing` 3a679306, not in this tree) also `FinanceSummary` (Excused Loss), `ClassCalendarEnhanced` (cost card), `StudentTuitionTab` (sibling line, Final Payable), `useFinanceOverview`, `useFinanceSummary`, `useStudentMonthFinance`. Display only (nothing is billed or paid from them) but against the money rule. Fix: that branch (functions report `excusedLessons` / `cancelledLessons`; screens read them). Pinned: `money-write-paths` section 6 is a RATCHET - no new importer of a pricing function outside `src/lib`; it does NOT catch inline arithmetic such as `rate * count` in a hook, which is why the hooks are listed here by hand.

**G-9 - Dead generic importer in the browser.** `src/components/admin/DataImportExport.tsx` upserts CSV rows into students, teachers, families, classes or enrollments from the browser (RLS: admins). It is not mounted. The edge-function import has the D4 G-20 whitelist; this file has none. Fix: delete it. Pinned: `money-write-paths` (dynamic writers).

**G-10 - The sibling-hold read fails OPEN on some errors.** `_lib/sibling-hold.ts` returns "nobody on hold" for 42703 (column missing - the column is live now) AND for any error whose message mentions `sibling_discount_from`, e.g. a permission error on that column. A held child's family would then get the discount. Risk: low (no such policy today). Fix: keep only `error.code === '42703'`, or drop the fallback (the column is live). Pinned: `sibling-hold` asserts today's behaviour on a 42501 and is labelled KNOWN GAP.

**G-11 - The ledger is neither append-only nor audited.** `ledger_entries` has an admin `FOR ALL` policy (20251012023454:134), no immutability trigger and no audit trigger; so do `ledger_accounts`. An admin token can edit or delete a leg through PostgREST and nothing records it. Also not audited: hand-entered `expenditures`, `settlements`, `sibling_discount_state`, `discount_definitions`, `monthly_finance_snapshots`. Fix (migration, owner): BEFORE UPDATE/DELETE trigger on `ledger_entries` refusing every lane but the owner (corrections are new reversing rows - what every function already does), plus `audit_row_change` on the listed tables. Pinned: M01/M02 catch an unbalanced edit, not a balanced one.

**G-12 - A frozen bill can be deleted and re-created unfrozen.** The freeze trigger is BEFORE UPDATE only. D4 3B review B-2 found it; the fix is in 3B (not live). Also 3B B-1 (`enrollments.created_at` / `id` unguarded though "created first prices the lesson"). Both close when 3B is applied. Pinned: M15 (a frozen bill with no freeze record) and the bill floor (`ever_frozen`) remember it; `d4-money-inputs` holds the fix.

Not gaps but worth knowing: `FamilyDetail.tsx` restates the hold rule for a badge (display only); `payroll_summaries` is still written on dashboard loads for open months (refused for closed ones); the past-credit leftovers (3) stay visible in M05 by design.

---

## 3. Write paths

Found by the scan in `scripts/pgtest/money-write-paths.test.mjs` (every `.from("<table>").insert|update|upsert|delete` in `src/` and `supabase/functions/`, plus writes through a table variable, plus every `.rpc(...)`); that suite fails on any new or vanished entry. Lane: **person** = the caller's own JWT under RLS; **service** = the service-role key. "Guards met" = what a write meets on live today (3A/3B: when applied).

### invoices
| Writer | Lane | Guards met |
|---|---|---|
| `_lib/recorded-payment-write.ts` (insert, 2 updates) via smart-family-payment, family-payment, delete-payment | service | compare-and-set on recorded_payment; label by `labelAfterPayment`; carry trigger; freeze trigger; bill floor; audit |
| `src/lib/recordedPaymentWrite.ts` via RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog, RecordedPaymentManager | person (admin) | same CAS and label rule; **no payment row / ledger (G-1)** |
| `smart-family-payment` insert of a new bill (23505 -> CAS) | service | label by `paidLabel`; carry; audit |
| `calculate-tuition` upsert x2 | service | never writes recorded_payment; T1 label rule; freeze trigger keeps frozen figures; floor; audit |
| `confirm-tuition` update x2 | service | admin only; confirmation fields, review flag |
| `PaymentIntegrityRepair` update | person | label re-read and `labelAfterPayment` |
| `InvoiceStatusManager` update | person | only `credit` or the rule |
| `BillFreezePanel` update (freeze) | person | freeze trigger: only an admin can set false; 3B G-18 unfreeze checked (not live) |
| `ai_action_apply` / `ai_action_undo` (SQL, definer) | person RPC | row lock + `invoice_paid_label`; D4 triggers bind it; **no ledger (G-1)** |
| `scripts/CREDIT-past-unapplied-cash.sql` (owner, once) | owner | CAS, all or nothing |

### payments, payment_allocations, ledger_entries, ledger_accounts, payment_deletions, payment_modifications
Only edge functions write them (never `src/`, held by the suite): smart-family-payment and family-payment (payment, allocations, both legs, accounts), delete-payment (reversal legs, payment delete, deletion record), modify-payment (G-2), the CREDIT script. RLS: admins. Guards: none in the database beyond RLS (G-11); payments / allocations audited, ledger not.

### payroll_lines, payroll_periods, payroll_summaries, payroll_adjustments, expenditures
| Writer | Lane | Guards met |
|---|---|---|
| `close-payroll-month` (lines upsert, period upsert + 2 updates, payroll cost upsert) | service, admin-gated | lines refused once locked; status set last; payroll cost refused once locked; **G-7** |
| `calculate-payroll` (payroll_summaries upsert) | service | refused for a locked month |
| `PayrollTab` (payroll cost upsert from the function's figures) | person | fresh period read + `canBookPayroll`; DB trigger refuses a locked month |
| `PayrollMonthLock` (payroll_adjustments insert) | person | admin RLS; a correction lands in an open month; audited |
| `ExpendituresManager` (insert/update/delete), `RecurringExpendituresManager` (upsert) | person | payroll-kind rows of a locked month refused by trigger; not audited (G-11) |

### attendance
`mark-attendance` upsert (teacher: service with rule 6 applied first; admin: own JWT), `auto-mark-attendance` insert (service, today's lessons), Stars engine (`stars_sync_apply_page`, service), `repair-attendance` (caller's JWT, 409 -> checked path), `stars_sync_resolve_conflict` (person RPC), the seed / cancel triggers. Guards: cancelled-lesson guard (lock), enrolment guard, D4 register G-10/G-11/G-12, evidence floor, audit. Never written from `src/` directly (held by the suite).

### sessions, session_participants
| Writer | Lane | Guards met |
|---|---|---|
| `manage-session` (insert, 3 updates), `bulk-cancel-sessions` (via `cancel_sessions_checked_bulk`) | person (admin JWT) through D2 RPCs; service for create | D2 guard; D4 lesson pay (3A, not live); audit |
| `schedule-sessions` (insert, delete, 3 updates) | service (automation lane) | D2: raw delete only of not-started Scheduled lessons with no evidence; refusals logged (`automation_refused`) |
| `mark-attendance` (Scheduled -> Held) | service / admin JWT | D2 allows; 3A G-2 hold-without-register (not live) |
| `AttendanceMarking` (teacher's Held flip), `AttendanceDrawer`, `SessionDetailDrawer`, `TeacherScheduleTransfer` x2 | person | D2 allows (proved by the D3 review probe); 3A G-4/G-5 when live |
| `AddSessionModal`, `EditSessionModal` x2, `TAClassAssignment` x3, `AttendanceDrawer` (session_participants) | person | audited; 3A G-6 assistants when live |

### enrollments, classes, class_fee_history, discounts, families, students, sibling state
Enrolments: no direct `src/` write; the dated RPCs (`change_enrollment_days`, `end_enrollment`, `modify_enrollment_transfer`, `pause_enrollment`) and `money_change_checked` (3B); `create-family` and `manage-demo-student` (service). Classes: ClassForm (insert + baseline fee trigger), ClassAdminActions x4, ClassSettings, RecurringSessionsManager, useClassBoardStyle, ClassEconomySettings, manage-demo-student - the fee column is mirrored from `class_fee_history` (step 2 live; a raw change of it refused by step 2's trigger). Families / students: StudentForm, StudentEditDrawer, FamilyLinkDialog, EconomyActions, StudentProfileEdit, create-family, link-student-user (x9), manage-admin-users, manage-student-access, student-create-migration-account, update-student-avatar, manage-demo-student - family / sibling fields reach bills through 3B G-19 (not live). `AssignDiscountModal` inserts discount definitions; assignments go through 3B G-15. `compute-sibling-discounts` (3 upserts) and `watch-sibling-threshold` (admin / cron secret since Q7) write `sibling_discount_state`; `post_sibling_retro_credit` (RPC) posts retro credit. `DataImportExport.tsx` is a dead generic browser upsert (G-9); `admin-data-import` has the G-20 whitelist.

### RPCs
51 pinned in `money-write-paths` with their money effect: the checked paths (`cancel_session_checked`, `cancel_sessions_checked_bulk`, `money_change_checked`, `money_changes_checked_bulk`), events (`record_*_event`, `log_*_automation_refused`), `post_sibling_retro_credit`, `award_homework_points` / `approve_video_feedback` / `archive_and_reset_monthly_leaderboard` (points, not money), the Stars queue, the recorder evidence RPCs, and reads.

---

## 4. The owner's read-only SQL

### `scripts/CHECK-money-invariants.sql`
One SELECT, 40 rows: `check_id, check_name, kind, violations, total_vnd, meaning`. `must be 0` = a guard says it cannot happen (above 0 is a finding); `report` = a known gap or history (watch that it does not grow). No names, no ids.

| Id | Check | Kind | Means |
|---|---|---|---|
| M01 | ledger_transactions_unbalanced | must be 0 | a tx_id whose debits and credits differ |
| M02 | ledger_entries_malformed | must be 0 | a leg negative, two-sided or empty |
| M03 | bill_shows_more_than_ledger_cash | report | G-1: bill money with no CASH/BANK leg (expected > 0: screens, AI action, pre-ledger history) |
| M04 | ledger_cash_not_on_bill | report | ledger received money the bill does not show (G-2, a hand-lowered bill) |
| M05 | family_payment_allocations_differ_before_17_nov | report | old unapplied cash (3 expected) |
| M06 | family_payment_allocations_differ_since_17_nov | must be 0 | overpayment-as-credit broken |
| M07 | allocation_without_ledger_leg | report | an allocation whose keyed leg is missing |
| M08 | recorded_payment_negative | must be 0 | more taken off a bill than it held |
| M09 | carry_differs_from_chain | must be 0 | stored carry is not the chain recomputed |
| M10 | carry_out_is_not_next_carry_in | must be 0 | the chain breaks between two bills |
| M11 | label_disagrees_with_rule | report | stored label is not `invoice_paid_label` (G-4, old labels) |
| M12 | label_disagrees_written_since_t4 | report | of M11, written after 13 Nov 08:00 |
| M13 | frozen_figures_changed_while_frozen | must be 0 | audit shows a frozen bill's figures moving |
| M14 | frozen_bill_differs_from_when_frozen | must be 0 | a frozen bill now differs from its freeze record |
| M15 | frozen_bill_without_freeze_record | report | frozen with no audit of the freeze (M14 cannot check it) |
| M16 | bill_unfrozen_not_by_admin | must be 0 | unfrozen by a non-admin (the SQL editor counts) |
| M17 | billable_mark_on_cancelled_lesson | must be 0 | a cancelled lesson still bills someone |
| M18 | billable_mark_outside_enrolment | report | a billed mark outside the child's enrolment |
| M19 | held_lesson_without_register | report | teacher paid, nobody marked by a person |
| M20 | cancel_without_checked_row | must be 0 | a cancel after the guard without its override (bypass or SQL editor) |
| M21 | uncancel_without_checked_row | must be 0 | the same for un-cancel |
| M22 | started_lesson_deleted_or_moved_unchecked | must be 0 | the same for delete / move of a started lesson |
| M23 | cancel_bills_not_refreshed | must be 0 | a checked change whose bills were never refreshed |
| M24 | cancel_corrections_unreviewed | report | the D2 review queue |
| M25 | money_changes_unreviewed | report | the D4 review queue |
| M26 | money_change_bills_not_refreshed | must be 0 | a checked money change never refreshed |
| M27 | service_retro_marks | report | old billed marks changed by a service writer |
| M28 | automation_refused | report | the rebuild / sync stopped by a guard |
| M29 | class_without_fee_baseline | must be 0 | a class with no 1900-01-01 fee row |
| M30 | class_fee_differs_from_history | must be 0 | the class fee is not the history row in force today |
| M31 | payroll_written_after_lock | must be 0 | a closed month's lines / summaries changed after the close |
| M32 | payroll_line_differs_from_booked_cost | must be 0 | a closed month's line and its booked cost differ |
| M33 | payroll_cost_without_line | report | G-7 |
| M34 | leftover_cash_not_credited | must be 0 | an old leftover neither credited nor reversed |
| M35 | past_credit_half_done | must be 0 | a credit marker without its reclass, or the reverse |
| M36 | settlements_after_removal | must be 0 | a settlement made on or after 16 Nov |
| M37 | counted_writeoffs | must be 0 | a `settlement-writeoff-` leg |
| M38 | bills_lowered_from_floor | report | recorded payment below the highest ever recorded |
| M39 | finance_snapshot_differs_from_bill | report | a closed-month snapshot no longer matches its bill |
| M40 | guard_installed | report | 1 = the D2 guard event exists (0: M20-M22 checked nothing) |

Expected on live: every `must be 0` at 0; M40 = 1; M05 = 3 (708,000); M03 and M11 above 0 (history and G-1 / G-4). The "payroll_lines of closed months unchanged vs snapshots" item of the brief is M31 + M32: `payroll_lines` IS the snapshot taken at the close (there is no other copy), so the check is that nothing wrote it after the close and that it equals the cost booked with it.

Proof (`scripts/pgtest/money-invariants-check.test.mjs`, 94 assertions): one statement, no write keyword, runs inside `BEGIN READ ONLY`, no uuid in the output; every fixture column exists in `types.ts` (or the creating migration); a consistent world gives 0 everywhere; 48 cases each break one thing and exactly the named checks move (8 of them near-misses that must NOT be counted), and every one of the 40 checks has a case that moves it; everything broken at once leaves no `must be 0` at 0; on the real carry, audit, freeze, cancelled-lesson and label objects ordinary writes keep every `must be 0` at 0, a raw cancel is caught by M20, and G-4 shows in M11.

### `scripts/CHECK-past-cancellations-with-evidence.sql`
Asked for by D1 7.4 and D2 7.4. One SELECT; for each cancelled lesson it reads the last mark a PERSON made before the cancel from `audit_log` (the cancel's rewrite to Excused is not logged), and calls `session_held_evidence` for what is left (points, transcripts, homework). Rows by period (`before_guard`, `checked`, `unchecked_after_guard`) and month: lessons, `person_marked_present` (the ones to look at: probably taught), children behind them, any logged mark, cancelled before the audit trigger (unknowable), D1 level now, settled now, payroll month closed, STRONG at cancel (checked ones). Expected on live: `unchecked_after_guard` absent. Proof (`past-cancellations-check.test.mjs`, 20): on the real audit / cancel guard / D1 / D2, a Present or Late by the teacher is counted though the register says Excused; a placeholder, a mark corrected to Absent, a lesson never cancelled are not; an admin's Excused after the cancel does not hide the mark; a checked cancel lands in `checked` with STRONG; a cancel past the guard (triggers off) lands in `unchecked_after_guard`; D1 columns equal the function lesson by lesson; read-only; no uuid; and the M20 pairing (audit row and override share `now()`) holds on the real `cancel_session_checked`.

---

## 5. Not verified

- Neither CHECK script has been run on live (by rule). Live may lack an object the scripts read: they assume `invoice_paid_label`, the D2 tables, the D4 1a/1b tables and `class_fee_history` exist (all logged live by 17 Nov). If any is missing the script fails as a whole, with the missing name, and changes nothing.
- M20-M22 assume an audited session change and its override are written in one transaction (proven on the real RPC in pglite, not on live). M12 assumes `invoices.updated_at` moves on every write (a trigger on live, not in the fixture).
- The D4 step 2 function deploy (calculate-tuition, -bulk, watch-sibling-threshold reading `class_fee_history`) is not confirmed in the log at efcb3a64; I-17's enforcement in the calculators is proven in pglite only.
- The browser-pricing remnants (G-8) other than OperationalReports are taken from the unfinished branch's commit list, not re-read file by file here.
- MCP tools (`src/lib/mcp/`) are inside the scan; the generated `supabase/functions/mcp` is not (it is regenerated by Lovable).
- Full `node scripts/pgtest/run.mjs` result: see the hand-back report.
