# D4 - other tuition-affecting actions: design (Revision 2)

**Where I am / next step:** Revision 2 in progress - header, change log and (a) written. Next: (b).

Designer: Fable 5.2. Design only: nothing under `src/` or `supabase/` changed, nothing run against a database, nothing pushed. No SQL in this file has been executed; names, signatures and conditions are a specification that the implementer's suites prove. The LIVE database was not looked at.

Revision 1 of this file is in git (0f7a3cf). It was reviewed (`docs/evidence/D4-design-review.md`, BUILD WITH THE REQUIRED CHANGES) and the conductor adopted all 14 required changes. This revision replaces it.

Read IN FULL for this revision (revision 1 had read them only through the review findings, and it showed): `D1-evidence-model.md`, `D2-guard-design.md`, `D2-threat-model.md`, `D2-build.md`, `D3-dialogs.md`, `D4-design-review.md`. Re-read: `_lib/invoice-status.ts` (the tuition release now live), `repair-attendance`, `create-family`, `manage-demo-student`, the deactivation trigger `20260403051502`, every reader of `classes.session_rate_vnd` in `supabase/functions`. Not found in this checkout: any T4 document (section b.6 states what D4 assumes of T4), and `scripts/ROLLBACK-session-cancel-guard.sql`, which D2 section 12 names (D4 writes its own, section f.7).

## Revision 2 change log

| Finding | What changed | Where |
|---|---|---|
| **R-1** bill-state floor | New `invoice_state_floor`: a trigger on `invoices` records, on every lane, the strongest state a bill ever had before any write lowers it. `tuition_month_state` and the lesson guard's "settled" read `max(now, floor)`. Refuses nothing. What D4 needs from T4 is listed. | b.2 G-9, b.6, c.1 |
| **R-2** repair-attendance | Writes with the admin's own JWT; the register guard binds it; old billed lessons go through the checked op `('attendance','repair')`. The service lane on `attendance` is an allow-list of four named writers. | b.3 G-11, G-12, d |
| **R-3** writers that would break | Each one listed with its lane and its change: `create-family`, `manage-demo-student`, student deactivation, the four staff forms, `ai_action_apply`, class creation, the family screens. | b.5 table, d |
| **R-4** upserts | The register guard's INSERT branch passes when the row already exists (the UPDATE branch then judges the real change). An honest re-save is never refused. | b.3 G-11, c.2 |
| **R-5** discount identity | A discount or bonus row cannot change child: HC121 `discount_identity`. | b.4 G-15 |
| **R-6** evidence floor | The keep never asks D1 as a caller D1 would refuse: such a caller sets NO floor. A D1 error stores only what the removed row itself proves. No floor is written at a cancel. A cancelled lesson is deletable exactly as D2 section 5.3 step 9 says. | b.2 G-8, c.1 |
| **R-7** service-lane record | A service-lane register write that crosses the billable line on an old lesson in a billed month is let through AND written to `money_change_events` (`service_retro_mark`), listed in the review screen. The "closed" claim of revision 1 is corrected. | b.3 G-11, h |
| **R-8** daily register | A register mark is free for 7 days after the lesson ended, on every lane, whatever the bill's state. Teachers are judged by the lesson's age and month, never by the bill. **R-8a**: reach of enrolment and discount changes is the whole family. | b.0, b.3 |
| **R-9** class fee | Dated class fees are BUILT in D4 (`class_fee_history`, first-of-month rows, one resolver, golden-figure gate). A rise from next month is T0. D4 never refreshes a month before the row's date. | b.4 G-16, c.3, d |
| **R-10** live objects | D4 replaces TWO live D2 functions (`_session_change_assess`, `_session_erased_recently`) and no table, trigger, signature or grant of D1/D2. New lesson kinds get a second trigger and their rows go in the new table. Preflight compares md5 of what it replaces with the D-release fingerprint. `NOTIFY pgrst`. The deployed functions are driven against the new SQL. | c.0, c.1, f.3 |
| **R-11** test plan | No existing suite is edited or given a D4 migration (D2 section 11). New suites carry their own preludes; the prelude work found by D2-build B-9 is budgeted; each suite pins an expected assertion count. | f |
| **R-12** approval splitting | Impact is per batch, plus the same person's T2+ changes of the last 24 hours. One request per batch. | e |
| **R-13** rollback | One script per migration, a test that the D-release fingerprint is 66/66 again, and the symptom that means "roll back". | f.7 |
| **R-14** family and sibling fields | Guarded with an over-inclusive reach (every child of the old and new family). | b.4 G-19 |

Advised items adopted: A-1 (owner-lane passes leave an event), A-2 (`session_effective_level`), A-3, A-5, A-6, A-8, A-9, A-10, A-12, A-13, A-14, A-15, A-16, A-17, A-18, A-19, A-20, A-21, plus removing the money tables from the import whitelist outright. A-4 adopted inside approvals. A-11 (backfill of floors from `audit_log`) is offered as an owner-run, insert-only script, not in a migration. Not adopted: A-7 (a move into the past is already reasoned and reviewed by D2; raising its tier would mean replacing a third live function) and A-22 (dated fees remove the fee-typo case it was for).

Corrections of fact in revision 1: `excuse_attendance_outside_enrollment` was dropped by `20261106100000:1` - a date edit rewrites no marks, it only changes which lessons the calculator bills; D2's trigger "exempts no role" (its automation lane is "no `auth.uid()`"), so "the owner lane passes, as it does in D2" was wrong - the owner lane is new in D4 and is recorded (A-1); `status` on a bill is now derived from the month's own money by `paidLabel` (`_lib/invoice-status.ts`).

Operability rule applied throughout (conductor): an ordinary honest correction costs at most one extra confirmation with a reason; every refusal says what to do next; nobody is stuck at 8 pm. Section b.7 walks the common corrections against it.

Vocabulary (D1/D2's): **level** NONE / SOFT / STRONG; **tier** T0-T3; **checked path** = a definer RPC on the admin's own JWT that writes an append-only row and sets a transaction-local flag naming it; **lane** = `person` (auth.uid() set), `service` (no uid, JWT role `service_role`), `owner` (no uid, no JWT role, not an API role: SQL editor, cron SQL, the harness); anything else is a person with no rights.

---

## (a) Verified list of open paths

**OPEN** = no guard today. **REVIEWED ONLY** = allowed, a later cancel is reviewed. All file:line read in this checkout.

| # | Path | Status | Concrete misuse |
|---|---|---|---|
| P1 | **Held -> Scheduled by a person**: `manage-session/index.ts:244` (reason optional, `:247`), `:316` (`update` writes any status but the Canceled boundary), raw PostgREST. D2 4.1 leaves it out on purpose; threat A-13. | OPEN (F-13) | Four taught lessons un-held on the 30th; the teacher is paid four short; the only trace is `audit_log` with no reason. |
| P2 | **Held with no register; a lesson born Held or Canceled**: `manage-session/index.ts:244`, `:430-438` (service key, caller's `status`). No INSERT trigger. Threat A-37. | OPEN | Three "make-up" lessons created last week already Held: three lessons of pay, no register. |
| P3 | **Teacher change on a Held lesson**: `AttendanceDrawer.tsx:144-151`, `SessionDetailDrawer.tsx:114-118`, `manage-session/index.ts:313-314`, raw. `TeacherScheduleTransfer.tsx:142-158` is filtered to Scheduled in the UI only (`:71`). Threat A-16. | OPEN | Pay for a lesson moved to another teacher inside a closed month, no reason. |
| P4 | **Time edit of a Held lesson**: `manage-session/index.ts:262-273` (`plain_update`), `schedule-sessions/index.ts:698-706` (`include-held`, service key). | OPEN | An hourly teacher's Held lessons lengthened from 60 to 120 minutes. |
| P5 | **Assistant roster / attended on a Held lesson**: `AttendanceDrawer.tsx:246`, `EditSessionModal.tsx:164,181`, `ta/TAClassAssignment.tsx:143,158`. | OPEN | An assistant added to twelve Held lessons of a closed month. |
| P6 | **Backdated lesson**: `manage-session/index.ts:430-438`; the seed gives every enrolled child a billable Present (`tuition-session.ts`; D1 1.6). | OPEN | A lesson created three weeks back in a class of twelve: twelve bills rise. |
| P7 | **Automation un-hold**: stars withdrawal `20261028090000:602-611`; `normalizeFutureHeld` `schedule-sessions/index.ts:427-430` (never ran, Q9). | needs a lane | - |
| P8 | **Points re-dated / deleted; transcript unlinked / deleted** (F-11; threat A-12): policies `20251107052426:25-35`, `20260712090000:123-128`; UI `PointHistoryDialog.tsx:100,118`; neither table audited (`20261009130000:150-154`). | OPEN | Review-3 probe V7: tier 3 becomes tier 1, unreviewed. |
| P9 | **Register row re-pointed** at another lesson or child (no writer in the repo). | REVIEWED ONLY (`20261112091000:561-575`) | A paying child's mark moved to a child who left; the first child's bill is not in `refresh_pairs` (`:489-493`). |
| P10 | **A person's mark deleted or un-signed** (`marked_by -> NULL`): policies `20251012063108:27-29`, `20260403050441:57`. | REVIEWED ONLY | Delete three Present marks, then cancel at T1. |
| P11 | **Old register marks switched across the billable line**: `PastAttendanceEditor.tsx:60` -> `mark-attendance/index.ts:160-162` (service key); `AttendanceMarking.tsx:199-205`; raw. | OPEN | Eight marks of last term switched to Excused for one family. |
| P12 | **`repair-attendance`** (D0 S22): `repair-attendance/index.ts:96-107` inserts one billable row per lesson that has none, service key, any date range, no reason. | OPEN | Present rows inserted across last term: each paid month rises at its next calculation. |
| P13 | **Enrolment start date in place**: `BulkEnrollmentDateSetter.tsx:69-72`, `class/ClassEnrollments.tsx:51-54`. | OPEN | A class's start date set a month later: a month of lessons stops being billed for every child. |
| P14 | **Rate, discount, weekdays in place** (none dated): `ModifyEnrollmentModal.tsx:268-274`, `discount/EditEnrollmentDiscountModal.tsx:82-85`, `EnrollmentRateEditor.tsx:99-102`, `update-enrollment-rate/index.ts:57` (service key). | OPEN | 30% typed onto an enrolment begun in January: every unfrozen month since re-prices. |
| P15 | **Backdated enrol / end / transfer / weekdays**: inserts `ClassEnrollments.tsx:220`, `EnrollStudentDialog.tsx:70`, `StudentForm.tsx:95`, `EnrollmentRequestsManager.tsx:49`, `create-family/index.ts:140-156`; RPCs `20261106100001:1,106,158` (any date; `end_enrollment` deletes placeholder marks after it, `:140`). | OPEN | An enrolment ended two months back: two paid months un-billed. |
| P16 | **Discount assignments, bonuses, definitions**: `AssignDiscountModal.tsx:97`, `StudentDiscountsTab.tsx:91,123`, `EditDiscountModal.tsx:77-78,109-110`, `DiscountManager.tsx:178,211,247`. | OPEN | A discount assigned from six months ago; or re-pointed at another child. |
| P17 | **Class fee** `class/ClassSettings.tsx:114`; every lesson of every month is priced at the class's CURRENT fee (`calculate-tuition/index.ts:252`, `calculate-tuition-bulk/index.ts:306`, `_lib/projected-per-class.ts:61`). | OPEN, and an honest rise does the damage | The fee rises from January; last October's unconfirmed bill is 20,000 a lesson dearer when next opened. |
| P18 | **Pay-rate history**: `staff/PayRateHistory.tsx:124-127` (also an upsert on a PARTIAL unique index, `20261021090000:99-102`, which root `AGENTS.md` says fails with 42P10); admin FOR ALL (`:275-279`); mirror columns written by `TeacherEditDrawer.tsx:67`, `ta/TAProfileDrawer.tsx:108` and the two staff forms. | OPEN | A rate dated the 1st of last month added the day before closing. |
| P19 | **Bill labels lowered raw**: `RecordedPaymentManager.tsx:106-112,165-170` (`recorded_payment`, including "reset to 0"), `InvoiceStatusManager.tsx:70-76` (`status`), `confirmation_status` under the admin policy; unfreeze `student/BillFreezePanel.tsx:55-56` stores no reason. | OPEN - and it lowers the tier of every other guard, D2's `settled` included | Reset March's recorded payment to 0, then end the enrolment in February at T1. |
| P20 | **Family and sibling fields**: `SiblingDiscountCompute.tsx:129` (`families.sibling_percent_override`, read at calculation time: `calculate-tuition/index.ts:113`), `FamilyDetail.tsx:231`, `FamilyMembersManager.tsx:40` (`students.family_id`), `students.sibling_discount_from`. | OPEN | The sibling percentage changed for a family with two paid years. |
| P21 | **`admin-data-import`**: `:72-76` whitelist with `enrollments`, `attendance`, `discount_*`, `classes`; `:94-97` service-key upsert. Threat A-38. | OPEN | Last year's register imported over this year's. |
| P22 | **Hard delete of a student** (raw only): cascades to attendance, enrolments and the money tables (`20251012062405:5`, `20251012022746:10,38,57`). | OPEN, no UI | One DELETE removes a child's bills and payments. |

Already guarded (checked): deleting a class with lessons (`ON DELETE RESTRICT`, `20251012020423:21`; D2 section 0); the rebuild's deletes and inserts (D2 lane); `TeacherScheduleTransfer` on Scheduled lessons; `sessions.rate_override_vnd` (read by neither calculator); closed payroll rows, frozen figures, cancelled-lesson attendance, payment deletion.

**Count: 21 open (P1-P6, P8-P22) plus one lane to define (P7).** Worst three: **P19** (lowering a bill's labels lowers every tier, in D2 as well); **P8** (F-11); **P14 / P17** (in-place rate, discount and class-fee edits re-price paid months - P17 even when the admin is honest).

<!-- END -->
