# D5 - Money invariant audit

**Where I am / next step:** FIX ROUND 1 DONE (17 Nov) on branch `claude/d5-money-audit`; see section 6 for what the live run showed and what changed. Built in round 0: this audit, `scripts/CHECK-money-invariants.sql` (now 42 checks), `scripts/CHECK-past-cancellations-with-evidence.sql`, suites in `run.mjs`. Round 1 added two migrations (NOT applied: 20261117110000 G-4, 20261117111000 G-11), the G-10 and G-9 code fixes, `scripts/CHECK-label-relabel-impact.sql`. Next: the conductor reviews, pastes the two migrations, redeploys compute-sibling-discounts and watch-sibling-threshold (G-10), pushes the G-9 deletion; G-1, G-2, G-7 are scheduled by the conductor (section 6.4).

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
**Fix round 1: FIXED (not applied)** by `supabase/migrations/20261117110000_carry_refresh_relabels.sql` (section 6.2).

**G-5 (closed - not a gap).** The R09/T4 note that InvoiceStatusManager hand-sets labels is out of date: it offers only `credit` and "follow the payments" (`invoicePaidLabel`). `money-write-paths` section 5 now holds that.

**G-6 (closed in D5) - write paths had no inventory.** `money-write-paths` pins 86 file/table/operation writers and 51 RPCs; a new one fails the suite until read and added to section 3.

**G-7 - Re-closing a payroll month leaves stale lines and booked cost.** `close-payroll-month` upserts lines and payroll expenditures for the people who earn on the close; it never deletes the lines / costs of someone who earned at an earlier close and no longer does (reopen, correct, close). The month then pays and books a person it should not. Risk: low (reopen is rare) but it overpays, the direction this code has drifted in before. Fix: on close, while the month is still open, delete that month's `payroll_lines` and `source_kind = 'payroll'` expenditures whose subject is not in the new set, in the same request, before the lock. Pinned: M33 counts a cost without a line on live.

**G-8 - Browser pricing still on some screens.** `OperationalReports.tsx` prices lost tuition / payroll with `sessionPayVnd` and `splitPayrollByClass`; per the unfinished browser-pricing task (`origin/pc2/browser-pricing` 3a679306, not in this tree) also `FinanceSummary` (Excused Loss), `ClassCalendarEnhanced` (cost card), `StudentTuitionTab` (sibling line, Final Payable), `useFinanceOverview`, `useFinanceSummary`, `useStudentMonthFinance`. Display only (nothing is billed or paid from them) but against the money rule. Fix: that branch (functions report `excusedLessons` / `cancelledLessons`; screens read them). Pinned: `money-write-paths` section 6 is a RATCHET - no new importer of a pricing function outside `src/lib`; it does NOT catch inline arithmetic such as `rate * count` in a hook, which is why the hooks are listed here by hand.

**G-9 - Dead generic importer in the browser.** `src/components/admin/DataImportExport.tsx` upserts CSV rows into students, teachers, families, classes or enrollments from the browser (RLS: admins). It is not mounted. The edge-function import has the D4 G-20 whitelist; this file has none. Fix: delete it. Pinned: `money-write-paths` (dynamic writers).
**Fix round 1: FIXED** - the file is deleted (nothing imported it: grep of src, supabase, scripts, docs; app typecheck clean).

**G-10 - The sibling-hold read fails OPEN on some errors.** `_lib/sibling-hold.ts` returns "nobody on hold" for 42703 (column missing - the column is live now) AND for any error whose message mentions `sibling_discount_from`, e.g. a permission error on that column. A held child's family would then get the discount. Risk: low (no such policy today). Fix: keep only `error.code === '42703'`, or drop the fallback (the column is live). Pinned: `sibling-hold` asserts today's behaviour on a 42501 and is labelled KNOWN GAP.
**Fix round 1: FIXED** - only code 42703 means "column missing"; every other error throws (42501, PGRST204, a message naming the column, 42P01 - all in `sibling-hold`). Not mirrored (no src copy). Needs a redeploy of compute-sibling-discounts and watch-sibling-threshold.

**G-11 - The ledger is neither append-only nor audited.** `ledger_entries` has an admin `FOR ALL` policy (20251012023454:134), no immutability trigger and no audit trigger; so do `ledger_accounts`. An admin token can edit or delete a leg through PostgREST and nothing records it. Also not audited: hand-entered `expenditures`, `settlements`, `sibling_discount_state`, `discount_definitions`, `monthly_finance_snapshots`. Fix (migration, owner): BEFORE UPDATE/DELETE trigger on `ledger_entries` refusing every lane but the owner (corrections are new reversing rows - what every function already does), plus `audit_row_change` on the listed tables. Pinned: M01/M02 catch an unbalanced edit, not a balanced one.
**Fix round 1: FIXED (not applied)** by `supabase/migrations/20261117111000_ledger_append_only_and_audit.sql` (section 6.3).

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
| `close-payroll-month` (lines upsert, period upsert + 2 updates, payroll cost upsert; on branch payroll-reclose: ONE rpc `close_payroll_month_apply` + the reopen update) | service, admin-gated | lines refused once locked; status set last; payroll cost refused once locked; **G-7** (built, not applied: docs/evidence/PAYROLL-reclose.md) |
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
| M01 | ledger_transactions_unbalanced | must be 0 | a tx_id whose debits and credits differ, except the pre-key history counted in M41 |
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
| M13 | frozen_figures_changed_while_frozen | must be 0 | audit shows a frozen bill's figures moving (the one 9 Nov restore is in M42) |
| M14 | frozen_bill_differs_from_when_frozen | must be 0 | a frozen bill now differs from its freeze record (or from the exempt restore after it) |
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
| M41 | ledger_unbalanced_before_keys | report | the 3 unbalanced transactions of Oct 2025 from before the first keyed ledger write, pinned by tx_id and amount (round 1; pinned in round 2) |
| M42 | frozen_bill_restored_to_pre_wipe_total | report | the 9 Nov no-actor restore of a frozen bill to its pre-28-Oct total (round 1) |

Expected on live: every `must be 0` at 0; M40 = 1; M05 = 3 (708,000); M03 and M11 above 0 (history and G-1 / G-4). The "payroll_lines of closed months unchanged vs snapshots" item of the brief is M31 + M32: `payroll_lines` IS the snapshot taken at the close (there is no other copy), so the check is that nothing wrote it after the close and that it equals the cost booked with it.

Proof (`scripts/pgtest/money-invariants-check.test.mjs`, 99 assertions): one statement, no write keyword, runs inside `BEGIN READ ONLY`, no uuid in the output; every fixture column exists in `types.ts` (or the creating migration); a consistent world gives 0 everywhere; 53 cases each break one thing and exactly the named checks move (10 of them near-misses that must NOT be counted), and every one of the 40 checks has a case that moves it; everything broken at once leaves no `must be 0` at 0; on the real carry, audit, freeze, cancelled-lesson and label objects ordinary writes keep every `must be 0` at 0, a raw cancel is caught by M20, and G-4 shows in M11. Mutation run (the suite reads a mutated copy through `D5_CHECK_SQL`): 12 hand-written mutants of the script (lock time dropped, pairing by any action, chain including the current row, credit counted, only Present, weekdays ignored, wrong cut-off, admins counted, future deletes counted, reversals ignored, baseline instead of today, `>=` for `>`) - first run 10/12, the two survivors killed by five new cases, second run 12/12.

### `scripts/CHECK-past-cancellations-with-evidence.sql`
Asked for by D1 7.4 and D2 7.4. One SELECT; for each cancelled lesson it reads the last mark a PERSON made before the cancel from `audit_log` (the cancel's rewrite to Excused is not logged), and calls `session_held_evidence` for what is left (points, transcripts, homework). Rows by period (`before_guard`, `checked`, `unchecked_after_guard`) and month: lessons, `person_marked_present` (the ones to look at: probably taught), children behind them, any logged mark, cancelled before the audit trigger (unknowable), D1 level now, settled now, payroll month closed, STRONG at cancel (checked ones). Expected on live: `unchecked_after_guard` absent. Proof (`past-cancellations-check.test.mjs`, 20): on the real audit / cancel guard / D1 / D2, a Present or Late by the teacher is counted though the register says Excused; a placeholder, a mark corrected to Absent, a lesson never cancelled are not; an admin's Excused after the cancel does not hide the mark; a checked cancel lands in `checked` with STRONG; a cancel past the guard (triggers off) lands in `unchecked_after_guard`; D1 columns equal the function lesson by lesson; read-only; no uuid; and the M20 pairing (audit row and override share `now()`) holds on the real `cancel_session_checked`.

---

## 5. Not verified

- Neither CHECK script has been run on live (by rule). Live may lack an object the scripts read: they assume `invoice_paid_label`, the D2 tables, the D4 1a/1b tables and `class_fee_history` exist (all logged live by 17 Nov). If any is missing the script fails as a whole, with the missing name, and changes nothing.
- M20-M22 assume an audited session change and its override are written in one transaction (proven on the real RPC in pglite, not on live). M12 assumes `invoices.updated_at` moves on every write (a trigger on live, not in the fixture).
- The D4 step 2 function deploy (calculate-tuition, -bulk, watch-sibling-threshold reading `class_fee_history`) is not confirmed in the log at efcb3a64; I-17's enforcement in the calculators is proven in pglite only.
- The browser-pricing remnants (G-8) other than OperationalReports are taken from the unfinished branch's commit list, not re-read file by file here.
- MCP tools (`src/lib/mcp/`) are inside the scan; the generated `supabase/functions/mcp` is not (it is regenerated by Lovable).
- Full `node scripts/pgtest/run.mjs` (clock moved back 8 h, run at 649da826): 8329 assertions across 89 suites, 0 failed. Added after that run and run alone: `sibling hold` 18/0 and five more cases in `money invariants check` (99/0); the full run was not repeated with them.

---

## 6. Fix round 1 (17 Nov 2026)

### 6.1 What the live run showed (conductor, read-only, counts only)

Every `must be 0` check was 0 except **M01 = 3 (920,000)** and **M13 = 1 / M14 = 1 (1,620,000)**. Expected rows as expected: M05 = 3 / 708,000, M40 = 1. Report rows: M03 495 / 761,659,602; M04 18 / 19,289,200; M11 449; M12 0; M18 34; M19 4; every other 0.

- **M01 explained:** three single-leg AR credits (500,000, 220,000, 200,000), month 2025-10, created 13-14 Oct 2025, no tx_key - history from before keyed ledger writes existed (tx_key arrived with 20251024050029, 24 Oct 2025).
- **M13 / M14 explained:** one July 2026 bill. 28 Oct a service-key reprice took it 1,620,000 -> 0 (the bulk-cancel wipe); 6 Nov frozen at 0; 9 Nov 01:22 UTC the owner's July restore in the SQL editor (no actor) put 1,620,000 back while frozen. The intended restore, not a bypass.
- M12 = 0 says no writer since T4 labels by a rule of its own; M11 = 449 is G-4 plus old labels.

### 6.2 Changes to the check script (step 1)

- **M01 / M41.** A transaction is "before keys" only if EVERY leg is unkeyed AND every leg was created before the first keyed ledger write (`min(created_at) WHERE tx_key IS NOT NULL`; with no keyed row at all that time is -infinity, so everything counts in M01 - fails closed). Why this rule and not "tx_key IS NULL": every writer since 24 Oct 2025 keys at least one leg, but a future unkeyed writer must not hide in the history row - the time bound catches it (an unkeyed unbalanced transaction made today is M01, tested). The "every leg unkeyed" part is implied by the time bound (a keyed leg is never older than the first keyed write) and is kept as a second statement of the rule; its mutant survives as an equivalent. New report row **M41** counts the history (expected on live: 3 / 920,000).
- **M13 / M14 / M42.** Exempt exactly: an audit row where the bill stayed frozen and a figure moved, written with NO actor, between 2026-11-09 00:00 and 2026-11-10 00:00 Hanoi, whose new total equals the total the bill's LAST audit image before 2026-10-28 00:00 Hanoi showed. M13 counts every other such row; M14 compares a frozen bill with the latest of its freeze record and any exempt restore after it. New report row **M42** counts the exempt restores (expected: 1 / 1,620,000). Also fixed: M14 compares the class breakdown with jsonb_strip_nulls applied, as the audit image stores it.
- Cases added (suite 120): an old single-leg AR credit reports in M41 and not M01; a new unkeyed unbalanced transaction alarms; an old-dated transaction that carries a key alarms; an old leg completed by a new leg alarms; with no keyed row at all an old one alarms; the restore pattern does not alarm; the same restore by a person, on 11 Nov, an hour before the window, or to 1,700,000 alarms; a later change after the restore alarms.
- Mutation pass on the changed checks: 12 mutants, final pass 10/12 caught, the 2 survivors equivalent (below). The first pass survivors were "no key -> -infinity" (killed by the new no-keys case) and two equivalent mutants (the redundant every-leg-unkeyed test; the restore-after-freeze join condition, redundant because the latest image wins).

### 6.3 The two migrations (NOT applied; the owner pastes)

**`20261117110000_carry_refresh_relabels.sql` (G-4).** `refresh_invoice_carry` is replaced by the same carry arithmetic (character for character) plus `status = invoice_paid_label(recorded, total + new debt in - new credit in, base, total)` in the same UPDATE; `credit` and `draft` are never touched; a row is written only when its carry or its label differs. No figure column is in the SET list. Preflight fails closed without invoice_paid_label, the function, the trigger or the enum. It updates no row on install. Proof: `invoice-status` runs twice now - as live, and with 20261113090000 + this file loaded (`invoice status + G-4`, 317/0, every figure equal to fixtures/tuition-figures.golden.json; the three history fixtures that write an old stale label now do so with the carry trigger off, the audit trigger on); `money-invariants-check` section 6: install changes no row, the next write for the child relabels the stale December, no figure of any bill moves (md5 over every money column), credit and draft kept.
**How many of the 449 it relabels:** none when pasted. It relabels a child's stale bills the next time ANY bill of that child is written (payment, calculation, freeze, an earlier month's carry refresh). Because live M09 = 0 (stored carry = recomputed carry), the bills it would relabel are exactly M11's 449; `scripts/CHECK-label-relabel-impact.sql` (READ-ONLY, one SELECT) gives them by transition (from -> to), children and past / current month, and is tested to predict exactly what the trigger then relabels (section 7 of the suite). A one-off relabel is NOT needed for money (labels are labels; every amount owed reads recorded_payment and the carry) - it is the owner's choice for the screens and for the D2/D4 "settled" tiers, which read labels; none is written here.

**`20261117111000_ledger_append_only_and_audit.sql` (G-11).** BEFORE UPDATE / DELETE (row) and BEFORE TRUNCATE (statement) triggers on ledger_entries refuse for every role with HC130; no escape inside the trigger (no live path updates or deletes the ledger: every TypeScript use is insert or select, no SQL file in the repo updates / deletes / truncates it, delete-payment reverses by inserting); the only way past is the table owner disabling the trigger in plain sight. Side effect on purpose: deleting a student or ledger account that HAS ledger rows is refused (the ON DELETE CASCADE meets the trigger); one with none deletes as before. Plus audit_row_change on ledger_accounts, expenditures, settlements, sibling_discount_state, discount_definitions, monthly_finance_snapshots. Preflight fails closed if audit_row_change or any of the seven tables is missing, or if any installed function's body updates / deletes / truncates ledger_entries (names it). Updates no row. Suite `ledger-append-only` (26).

md5 (LF line endings, as committed): 20261117110000 `7c089526f8303f7c30ead8515712da8a`; 20261117111000 `3498f7688712cfd7f9760824f4d3b457`.

### 6.4 Not this round - what each needs (for the conductor to schedule)

- **G-1 (money on a bill with no payment row / ledger):** a new admin-only edge function `record-payment` (single child): validate month + amount, insert the payments row, post DR CASH|BANK / CR AR (case-insensitive method), then the compare-and-set bill write with `labelAfterPayment`, conflict -> 409; point RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog and the correction mode of RecordedPaymentManager at it (a correction = reversal legs + CAS down, refusing below 0); ai_action_apply's payment step either calls the same SQL in-transaction or is documented as bill-only. Tests: invoice-status case per screen path, concurrency, M03 stops growing; delete-payment must then accept these payments. Needs a deploy + screen release together.
- **G-2 (modify-payment):** decide delete vs rebuild. Recommended: delete the function and the unmounted ModifyPaymentModal (no caller); if kept, rebuild as delete-payment + a new payment through the payment paths so the bill moves with the ledger, with `method.toLowerCase()` and every insert checked. With G-11 applied it already cannot edit ledger rows (it only inserts).
- **G-7 (re-close leaves stale lines / costs):** in close-payroll-month, while the month is still open and before the lock: delete that month's payroll_lines and `source_kind = 'payroll'` expenditures whose subject is not in the new earning set (the triggers allow it because the month is open), in the same request, with an audit entry naming who was removed and why. Tests in paylock / class-overhead: close, reopen, drop a person, close -> no line, no cost for them; M33 = 0. **Built 17 Nov on branch `payroll-reclose` (migration 20261117153000, close-payroll-month, PayrollMonthLock drift; suite `payroll re-close`); not applied or deployed - docs/evidence/PAYROLL-reclose.md.**

### 6.5 Gates (fix round 1)

Full `node scripts/pgtest/run.mjs` with the clock moved back 8 h (at 0fb8adf5): **8721 assertions across 92 suites, 0 failed** - it includes `app typecheck` (= `tsc --noEmit -p tsconfig.app.json`, asserting it loaded the source; clean after the G-9 deletion) and `edge functions typecheck` (clean after G-10). `npm run test:bun`: **250 pass, 0 fail** (18 files).

---

## 7. Fix round 2 (17 Nov 2026)

Review of round 1 (verdict SHIP WITH CHANGES): M-1, M-2, M-3, N-1 fixed here; N-2 and N-3 said in the migration headers. Neither migration is applied; nothing deployed, nothing pushed. Live was read with SELECTs only (counts, sums, shapes; no names).

### 7.1 M-1 - the July restore exemption now matches live

- **Why round 1 missed it.** The bill's FIRST audit row on live is 28 Oct 03:58 UTC (10:58 Hanoi), on the wipe day, not before it. Its four rows (read-only, 17 Nov): 28 Oct 03:58 changes paid_amount, status only (total 1,620,000 both sides); 28 Oct 04:04 base, carry_out_credit, class_breakdown, total 1,620,000 -> 0 (no actor); 6 Nov 08:57 frozen at 0 (no actor); 9 Nov 01:22 0 -> 1,620,000 while frozen (no actor). `pre_wipe` looked only BEFORE 28 Oct 00:00 Hanoi, so it was empty for this bill. The suite passed because its fixture invented a 5 Jul INSERT that live does not have.
- **Change (`scripts/CHECK-money-invariants.sql`).** The pre-wipe total is the last audit image before the wipe day, as before. When a bill has no row before that day, it is the `old` image of its first UPDATE row ON the wipe day (28 Oct 00:00 - 29 Oct 00:00 Hanoi). Nothing else about the exemption changed: no actor, the 9 Nov window, the restored total equal to that figure.
- **Fixture.** It now has the live shape, row for row, with no July row. Proven: the round-1 script fails the new fixture exactly as live did (M13 1, M14 1, no M42), and the fixed script passes. Cases added: the older shape with a row before the wipe still exempts; first rows on 29 Oct (the day after) alarm.

### 7.2 M-3 - M01 cannot be dodged by a backdated created_at

Both fixes were made.

- **The check (`CHECK-money-invariants.sql`).** M41 is pinned to the three known transactions by tx_id AND amount (`known_pre_key`: 2c519f69... -500,000; fafc4363... -200,000; ecd66a3d... -220,000; read-only on live, the only unbalanced transactions there). The time and unkeyed conditions stay as well. Anything else unbalanced is M01, whatever its created_at:
  - a new backdated single leg;
  - a fourth transaction beside the three;
  - a further leg on a pinned one, which moves its amount.

  Cases added for each of those.
- **The database (`20261117111000`).** A BEFORE INSERT trigger `ledger_entries_stamp_created_at` sets `created_at := now()` for every role. `occurred_at` (when the money moved) stays the writer's.
  - No writer sets created_at. Checked in family-payment, smart-family-payment, modify-payment and delete-payment (its reversal rows are built fresh, with no created_at), in `scripts/CREDIT-past-unapplied-cash.sql`, and in `post_sibling_retro_credit`.
  - On live, the only database function that inserts a ledger leg is `post_sibling_retro_credit`, and it does not name created_at.
  - Suite `ledger-append-only`: a backdated insert gets now(), as an admin, as the service role and as the owner. The function cannot be called by anon or authenticated.

### 7.3 M-2 - refresh_invoice_carry is no longer callable by a signed-in account

`20261117110000` revokes EXECUTE on `public.refresh_invoice_carry(uuid)` from PUBLIC, anon and authenticated, and grants it to service_role. It was proven first that nothing calls it except the trigger:
- **The repo.** grep over supabase/functions, src (types.ts lists it, nothing calls it), docs/sql, scripts, drizzle and every migration. It is named only by the trigger function `invoices_carry_sync` and by the one-off backfill in 20261009120000.
- **Live (read-only).** The only function whose body mentions it is `invoices_carry_sync()`: SECURITY DEFINER, owned by postgres. Live today: authenticated = true, service_role = true, anon = false.

Because the trigger runs as the owner, every writer keeps its carry refresh. Probe D, now in run.mjs:
- a role-less signed-in account calling the RPC is refused with 42501;
- that call leaves the bill, its floor and the audit untouched;
- an admin's ordinary write still relabels through the trigger.

### 7.4 N-1 - header corrected (the audit row on every upsert stays)

The G-11 header now says that every sibling_discount_state upsert writes an audit row, because compute-sibling-discounts and watch-sibling-threshold send `computed_at = now()`. Skipping those rows was not chosen, for three reasons:
- **It would mean new shapes.** Either a second trigger shape (an UPDATE trigger with a WHEN clause, split from INSERT/DELETE, since a WHEN on OLD cannot sit on an INSERT trigger), or a per-table noise list in the shared `audit_row_change` that every audited table runs.
- **A recompute is a fact worth keeping.** It records when, and as whom.
- **The volume is small.** 7 states were recomputed in the 7 days to 17 Nov, against 3,789 audit rows.

N-2 (the relabel leaves no audit row: depth 2) and N-3 (the preflight does not see cascade or dynamic SQL paths; none on live) are now one paragraph each in the headers.

### 7.5 Live results of the changed checks (read-only SELECT, 17 Nov, counts only)

The changed CTEs (`params`, `known_pre_key`, `unbalanced`, `pre_wipe_*`, `frozen_moves`, `freeze_rec`, `freeze_ref`) and the five checks, verbatim from the script, were run through the Supabase MCP as one SELECT:

| Check | Violations | Total VND |
|---|---|---|
| M01 | 0 | 0 |
| M13 | 0 | - |
| M14 | 0 | 0 |
| M41 | 3 | 920,000 |
| M42 | 1 | 1,620,000 |

That is what round 1 expected and did not get.

### 7.6 Files to paste (LF md5, CR stripped)

- `supabase/migrations/20261117110000_carry_refresh_relabels.sql`: `2e0c17b226209dc3ee56351e0f836281`. It replaces round 1's `7c089526...`.
- `supabase/migrations/20261117111000_ledger_append_only_and_audit.sql`: `a2f6c7019885395374a71e6b13a37988`. It replaces round 1's `3498f768...`.
- Read-only scripts:
  - `scripts/CHECK-money-invariants.sql`: `da690a637db4beb957996b2b2e404df6`
  - `scripts/CHECK-label-relabel-impact.sql`: `cc2f6db9f5a10cb000ae9bbc2721e406` (unchanged)

Paste order and independence are as in the round-1 review: either file after 3B, and each pastes twice.

### 7.7 Gates (fix round 2)

Full `node scripts/pgtest/run.mjs`, on the real clock (run at 08:16 Hanoi), at e24ad719: **8748 assertions across 93 suites, 0 failed**. That is round 1's 8721, plus 5 in money invariants, 4 in ledger append-only, and the 18 of the new suite. Per suite:

| Suite | Result |
|---|---|
| `money invariants check` | 125/0 (pinned 125) |
| `ledger append-only` | 30/0 (pinned 30) |
| `D5 review probes` (`scripts/pgtest/review-d5-probes.test.mjs`, the reviewer's 16 with D, M-3 and N-1 turned to the safe behaviour, plus 2) | 18/0 (pinned 18) |
| `invoice status` | 317/0 |
| `invoice status + G-4` | 317/0 |
| `app typecheck` | clean |
| `edge functions typecheck` | clean |

Both invoice status runs are against `fixtures/tuition-figures.golden.json`, which is unchanged.

`node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0. `npm run test:bun`: **250 pass, 0 fail** (18 files).

