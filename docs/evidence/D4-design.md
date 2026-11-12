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

---

## (b) The design

### b.0 Building blocks

1. **Two floors (recorders, they refuse nothing).** `session_evidence_floor` remembers the strongest evidence level a started lesson showed just before someone lowered it; `invoice_state_floor` remembers the strongest state a bill had just before a write lowered it. Every tier is computed from `max(now, floor)`. Removing evidence or lowering a label stays possible - honest corrections need it - but no longer lowers the check the next change meets.
2. **The money-change guard.** Every guarded write has a **reach** (which children or member of staff, which dates). One function turns the reach into a tier from stored facts. T0 passes as it does today; T1-T3 need the checked path: `money_change_preview` -> `money_change_checked`, one append-only row in `money_change_overrides`, the same flag-names-a-row-of-this-transaction technique, token over a snapshot, reason rule and bulk cap as D2. One table serves every new kind, lesson-side ones included, so **no D2 table is altered**.
3. **The lesson guard is extended beside D2, not inside it.** D2's classifier, trigger, apply function, wrappers, table and views are untouched. A second trigger on `sessions` handles the pay-side kinds D2 deliberately left out. The only live functions replaced are the two that compute what the admin is shown (c.1).
4. **Two-admin approval** inside the only code that can write an override row. Built OFF (e).

**Tuition tier of one (child, month)** - `tuition_month_state`, over `max(bill now, bill floor)`:

| Month | no bill | billed, nothing paid | paid / part-paid | confirmed / adjusted | frozen |
|---|---|---|---|---|---|
| current or later | T0 | T0 | T0 | T2 | T2 |
| past | T1 if the child's class has a non-cancelled lesson in it, else T0 | T1 | T2 | T3 | T3 |

"Past" = before the month of (now in Hanoi - 7 days): the first week of a month still counts the month before as current. The current month is T0 even when paid because families pay in advance; a paid current month is the normal state of every child.

**Pay tier** - `payroll_reach(staff, from, to)`: T3 if a month in reach is locked; T1 if the person has a Held lesson in reach dated before today; else T0.

**One number for staff to learn: a week.** For 7 days after a lesson ended, register marks, the assistant list and the lesson's teacher can be corrected with no question, on every lane, whatever the bill or payroll state (the existing audit triggers record them; the floors record what was lowered). After that the tiers apply.

Tier of a change = the highest over everything it reaches; for an enrolment, discount or family change the reach is **every child of the family** (a sibling's bill can move with it; R-8a). T0: no dialog, but the screens still call the checked RPC so a row is written (money rule: every money-affecting admin write leaves a row). T1: reason + confirm. T2: the same, reviewed when bulk. T3: correction mode (second reason, always reviewed).

**Lanes.** `person`: checked path or refused. `service`: refused wherever a person would need a reason, except the register (b.3) and un-hold (G-1), which are recorded instead. `owner`: passes, and each pass a person would have needed a reason for writes one `owner_lane` event, so the review screen shows it. No setting turns a guard off.

### b.1 Lessons: who is paid (trigger `zz2_session_pay_guard`, checked ops of entity `session`)

| Guard | Kind and rule | Person | Service | What the preview shows |
|---|---|---|---|---|
| **G-1 Un-hold** (P1, P7) | `Held -> Scheduled` | `('session','unhold')`. Tier by D2's rule over the effective level (Held is at least SOFT, so T2; STRONG and settled T3). Reviewed when the payroll month is locked. | Allowed iff the payroll month is not locked AND (the lesson has not started, OR a `stars_sync_held_flips` row exists and no mark by a person with status Present / Late remains). Otherwise the trigger keeps `Held` (`NEW.status := OLD.status`), writes an `automation_refused` event and does NOT raise: a raise inside `stars_sync__apply_event` aborts the sync page for ever. This trigger is not D2's (which never modifies `NEW`); it runs last by name, and `audit_row_change` writes no row for a write that changed nothing. | D1 evidence cards, "the teacher is no longer paid for this lesson", closed month or not, "if the lesson did not happen, cancel it instead". |
| **G-2 Hold without a register** (P2) | `Scheduled -> Held` when no row has `marked_by IS NOT NULL`, or the lesson has an `unhold` row, or the payroll month is locked | `('session','hold')`, T1; T3 in a locked month | allowed (both automatic flippers write marks first) | "Nobody has taken the register. Marking it Held pays the teacher." |
| **G-3 Born Scheduled** (P2) | INSERT with another status | refused, HC023. "Create it, then take the register." | refused | - |
| **G-4 Teacher** (P3) | `teacher_id` changes and the lesson is Held, or has started more than 7 days ago | Free while the payroll month is open and the lesson ended 7 days ago or less. Otherwise `('session','reteach')`: T1; T3 in a locked month. | refused (the rebuild only re-assigns future lessons) | From whom to whom, minutes, closed month or not. No pay figure (the preview may not call calculate-payroll: review-3 F-1 ruling). |
| **G-5 Time** (P4) | start or end changes on a Held lesson and D2 does not call it a move | `('session','retime')`, same free week and tiers as G-4 | refused; `include-held` reports the lesson under `attention` and is retired from the screen | old and new minutes |
| **G-6 Assistants** (P5) | pay-relevant change to a teaching-assistant row of a Held lesson | same free week; else `('session','restaff')` with the whole list | refused | before / after list |
| **G-7 Backdated lesson** (P6) | INSERT of a lesson that has already started | `('session','create')`: tier = highest `tuition_month_state` over the children enrolled that day, at least T1 | allowed iff `date >= today` (Hanoi) | the children who will be marked Present and billed, their stored bills, "take the register afterwards" |

One change at a time: a write that D2 classifies (cancel, move, ...) AND that carries one of these kinds is HC022, as D2 does for its own kinds.

### b.2 The floors and the register row

**G-8 Evidence floor (P8, P10; F-11).** `_session_evidence_keep(lesson, cause, own_level, own_family)` is called from BEFORE triggers on `attendance`, `point_transactions`, `class_transcripts`, `homeworks`, `homework_submissions` (when a qualifying row is about to be changed or removed) and on `sessions` (un-hold, date move). It reads `session_held_evidence` WHILE THE ROW IS STILL THERE and stores that level. Rules, fixed by R-6:
- Only lessons that have started. Skipped when the floor is already STRONG.
- **Who is asking is decided before D1 is called.** Service and owner lanes: D1 answers them. A person: only an admin or `is_teacher_of_class` for that lesson's class - the two D1 accepts. Anyone else (a child, a parent, a signed-in user with no role): **no floor is written, ever.** They cannot remove register, points or transcript rows under RLS; the only evidence they can touch is their own homework row, which is auxiliary.
- If D1 still raises (for example the recorder helper is VOLATILE, 55000), the floor is what the removed row proves ON ITS OWN: a person's Present / Late or a linked transcript -> STRONG; a person's Absent, the Held status, a participation point, an unlinked transcript, homework -> SOFT. True by construction, never more.
- Trigger-made writes do not keep (`pg_trigger_depth() > 1`): the cancel's excuse-all writes no floor. A lesson that is cancelled has its evidence in D2's override row already.
- Lessons are processed in ascending id (two deletes on one class-day cannot deadlock).

Use: `session_effective_level(lesson, d1 json)` = `max(D1 level, floor)` - ONE function (D1 4.7 "one copy" is kept: D1 answers "what is there now", this answers "what has been there"). `_session_change_assess` takes the tier from it; when a floor exists, "settled" is judged over every child on the register, with G-9's bill floor. **Delete:** for a lesson that is not cancelled, `use_cancel` reads the effective level; for a lesson that is ALREADY `Canceled` it reads D1's level now, exactly as D2 5.3 step 9 and owner default OQ-1 decided - cancel, then delete, still works in two calls. The floor's causes of the last 30 days are returned by `_session_erased_recently`, so such a change is always reviewed. The dialog shows them as "Recorded, and later removed by <name> on <date>".
The floor is history, not an accusation: a register saved on the wrong lesson and corrected leaves STRONG on that lesson, and cancelling it costs exactly what it would have cost before the correction (D2's own T2 / T3). Nothing is refused by G-8; a teacher deleting a point never meets a dialog.
`point_transactions` gets the generic audit trigger for UPDATE and DELETE. `class_transcripts` does not (it would copy `raw_text`, children's speech, into `audit_log`); the floor's cause entry is its record.

**G-9 Bill-state floor (P19; R-1).** BEFORE UPDATE / DELETE on `invoices`, every lane, never changes `NEW`, never raises: when a write lowers the bill - `confirmation_status` leaves confirmed / adjusted, `recorded_payment` goes down from above 0, `status` leaves paid / partial, `tuition_frozen` goes false, or the row is deleted - one row per (child, month) keeps `ever_paid`, `ever_signed`, `ever_frozen` and the highest `recorded_payment` seen. `tuition_month_state` reads `now OR floor`; the lesson guard's settled test reads it too. So resetting a recorded payment, un-confirming, or the calculator's own `confirmed -> needs_review` after a correction leaves the month at the tier it had. Nothing in the payment paths is refused or changed; `_lib/invoice-status.ts` goes on deciding the labels.

**G-10 A register row keeps its lesson, its child and its signature (P9, P10).** `session_id` or `student_id` changed -> HC024, every lane, no checked path. On the person lane, direct statement, started lesson: DELETE of a row a person marked, or `marked_by -> NULL` -> HC025 (`delete_mark` / `unmark`), "change the mark instead". For marks re-pointed before D4, `_session_change_assess` adds the children named in the audit trail to `refresh_pairs`.

### b.3 The register and the bill

**G-11 Old register marks (P11) - trigger `zz_attendance_money_guard`, BEFORE INSERT / UPDATE / DELETE, direct statements only.** In this order:
1. INSERT while a row for that (lesson, child) already exists -> pass. (A PostgREST upsert fires BEFORE INSERT before it finds the conflict; the UPDATE branch then sees the real old row. R-4.)
2. No crossing of the billable line (billable = Present / Absent / Late; a row appearing or disappearing counts), or the lesson is cancelled -> pass.
3. **The lesson ended 7 days ago or less -> pass, every lane, whatever the bill's state** (R-8). Today's register always saves.
4. Owner lane -> pass (event). A money acknowledgement of this transaction covering the child -> pass.
5. Person who is an admin: tier = `tuition_month_state(child, lesson month)`, raised to at least T1 when a mark a PERSON made as Present / Late is being un-billed (A-6). T0 -> pass. Else HC025 `retro_mark` -> the screen opens the dialog -> `('attendance','set_marks')`.
6. Person who is not an admin (a teacher): refused, HC025, when the lesson's month is past, or when un-billing a person's Present / Late - decided from the lesson's date and the old mark only. A teacher never learns anything about a bill (A-3). Otherwise pass.
7. Service lane: if rule 5 or 6 would have asked, the write goes through and one `service_retro_mark` event is written (lesson, child, old and new status, `marked_by`); the review screen lists them (R-7). Never a raise: the sync must not be aborted.

**The service lane on `attendance`, precisely (R-2).** Four writers may be there: the seed triggers (trigger depth, not judged); `auto-mark-attendance` (inserts for today's lessons: always inside the week); the Stars engine (marks within 24 hours of the lesson by its own rule; a late withdrawal is the recorded case); `mark-attendance` for a TEACHER (it applies rule 6 itself, from the lesson date, before writing). Anything else that writes `attendance` with the service key fails the static scan (f.5). `mark-attendance` for an ADMIN and `repair-attendance` write with the admin's own JWT, so the database binds them.

**G-12 `repair-attendance` (P12).** The insert is made with the caller's client. Lessons inside the week, and lessons of an unbilled current month, are inserted as today. When any lesson in the range would be refused (HC025), the function inserts NOTHING and answers `409 attendance_requires_checked_path` with the `money_change_preview('attendance','repair', ...)` result; the Attendance Repair screen shows the dialog (which lessons, which months, the stored bills) and confirms with `money_change_checked`. Same rows as today (`marked_by NULL`, the note), now with a reason and a row.

### b.4 Money inputs (one `zz_*_money_guard` trigger per table; checked ops per entity)

Each trigger: work out the reach of the write -> tier -> T0 pass -> otherwise pass only with an acknowledgement of this transaction covering the target, the children and the window, whose stored tier is not lower than the trigger's own (else HC011: a payment landed in between, A-8) -> else HC120.

| Guard | Reach and rule | Checked ops |
|---|---|---|
| **G-13 Enrolments** (P13-P15) | INSERT / DELETE: the row's span. Date-only UPDATE: the days entering or leaving. `allowed_days`, `rate_override_vnd`, `discount_*`: the whole span (they are not dated). `student_id` / `class_id` changed: refused, HC121. | `enroll`, `enroll_new` (a child created in the same request, b.5), `set_start_date`, `end`, `end_all` (deactivation), `set_days`, `transfer`, `pause` - these delegate to the existing dated RPCs, which are not rewritten - `set_rate`, `set_discount`, `delete`; bulk of 50 for BulkEnrollmentDateSetter |
| **G-14 "From this date"** | New `change_enrollment_terms(enrollment, terms, effective_date)`, modelled on `change_enrollment_days`: ends the row the day before and starts one with the new rate / discount. From this month it is T0. The screens offer THIS by default; the whole-span edit is a second button, "Correct a mistake for the whole enrolment" (A-14). | `set_terms_from` |
| **G-15 Discounts** (P16) | Assignments and bonuses: `[effective_from, effective_to]`, or the days that change. **The child of a row cannot change: HC121 `discount_identity`** (R-5). A definition's pricing columns cannot change, nor can it be deleted, while an assignment of it reaches T1+: HC121 `definition_in_use` ("create a new discount and assign it from a date"). | `assign`, `set_end`, `edit`, `remove` |
| **G-16 Class fee, dated** (P17; R-9) | New `class_fee_history(class_id, effective_from, session_rate_vnd)`; `effective_from` is the first day of a month. The calculators price each lesson at the fee in force on its date. Baseline row dated 1900-01-01 with today's fee, so no figure moves. Reach of a row = children with a billable mark in that class from its date to the next row's. **A rise from next month reaches nothing: T0.** A row dated in a past month is a correction: T1-T3 by the bills it reaches. `classes.session_rate_vnd` becomes the mirror ("the fee now"), written only by the checked op; a raw change is HC120 with "Change the fee from the class's fee history, from a date". | `('class_fee','set')`, `('class_fee','remove')` (never the baseline) |
| **G-17 Pay rates** (P18) | Row's `effective_from` to the day before the person's next row; `payroll_reach`. Mirror columns on `teachers` / `teaching_assistants`: reach only the dates NO history row covers (where a history row exists, the mirror pays nobody), so a staff-form save is T0 for everyone who has a baseline. | `('pay_rate','set')` - plain INSERT or same-date UPDATE (no ON CONFLICT on the partial index) plus the mirror, in one transaction; `remove` |
| **G-18 Unfreeze** (P19) | `tuition_frozen` true -> false | `('invoice_freeze','unfreeze')`: T2; T3 when paid or confirmed. Service refused (the calculator never unfreezes). |
| **G-19 Family and sibling fields** (P20; R-14) | `students.family_id`, `students.sibling_discount_from`: every child of the old and the new family, from the moved child's earliest enrolment start. `families.sibling_percent_override`: every child, every month. T0 while none of that is past or signed off - linking a new child is free. | `('family_link','set_family' \| 'set_sibling_from' \| 'set_sibling_percent')` |
| **G-20 Import** (P21) | `sessions`, `attendance`, `enrollments`, `discount_assignments`, `discount_definitions` leave the whitelist outright (a dry run still counts them); `classes.session_rate_vnd` is dropped from imported class rows. | - |
| **G-21 Deletes** (P22) | A student with a payment, a bill with money on it, or a mark by a person; a class with an enrolment: HC121 ("deactivate" / "archive" instead - what the screens do). | - |

**No refresh re-prices paid past months by itself.** `refresh_pairs` of a checked change are the (child, month) pairs inside its reach - the months the admin was shown and gave a reason for. A T0 fee row dated next month has none. Nothing D4 does runs the calculator over a month outside the reach.

### b.5 Every writer the guards touch, and its lane (R-3)

| Writer | Lane today | After D4 |
|---|---|---|
| `create-family/index.ts:140-156` (enrolment insert, caller's `startDate`) | service | Before ANYTHING is created the function previews `('enrollment','enroll_new')` per enrolment as the caller. T0: as today, but the insert is on the caller's client. T1+ without `ack {reason, confirm, token}` in the body: `409 preview_required` with the preview, nothing created. With it: family and child are created, then `money_change_checked`. One dialog on the Create Family screen. |
| `manage-demo-student/index.ts:198-205` | service | Unchanged. Its insert is dated today (T0). Its delete of the demo child's other enrolments is T0 unless they reach a billed past month; then it is refused and the function reports `demo_reset_needs_owner`. Nothing is exempted for it. |
| Student deactivation: `StudentsList.tsx:102-106` -> trigger `auto_end_enrollments_on_deactivation` (`20260403051502`) | person, trigger-made | The button previews `('enrollment','end_all', today)`. T0 (the usual case): as today. T1+ (the current bill is confirmed or frozen): the dialog runs the checked op, then deactivates. A raw deactivate at T1+ gets HC120 with that sentence. |
| `TeacherForm` / `TeachingAssistantForm` (`create-teacher`, `create-teaching-assistant`), `TeacherEditDrawer.tsx:67`, `ta/TAProfileDrawer.tsx:108` | service (create), person (edit) | Create: a new person has no lessons, T0. Edit: a changed rate goes through `('pay_rate','set')` from today (T0) or a chosen date; the mirror guard no longer fires for anyone with a baseline row. |
| `ai_action_apply` / `ai_action_undo` | person (definer RPC) | **Not re-created** (A-21; another branch has a fix waiting). The triggers bind it: a plan that reaches a billed past month fails as a whole (all or none, as today) and `src/lib/aiActions.ts` words HC120: "This reaches months already billed. Do it from the enrolment screen, with a reason." A new child, a hold from a future date, a discount from this month: T0, unchanged. The chat function gets nothing. |
| `ClassForm.tsx:94` (new class), `manage-demo-student:173` | person / service | An AFTER INSERT trigger writes the class's baseline fee row. |
| `update-enrollment-rate/index.ts:57` | service | The caller's JWT and `('enrollment','set_rate' \| 'set_terms_from')`. |
| `SiblingDiscountCompute.tsx:129`, `FamilyDetail.tsx:231`, `FamilyMembersManager.tsx:40` | person | `('family_link', ...)`; T0 in the ordinary case. |
| `stars_sync_resolve_conflict` | person (RPC) | Inside the week: unchanged. Later: G-11 rule 5 applies; the admin changes the mark with a reason, then settles the conflict as "keep HEC's". |
| `pause_enrollment`, `end_enrollment`, `change_enrollment_days`, `modify_enrollment_transfer` | person (RPC) | Unchanged bodies; T0 direct, T1+ through the checked op that calls them. |
| MCP tools `src/lib/mcp/**` | caller's OAuth, RLS | Not swept by the review or by me beyond a grep for writes to the guarded tables (the build's first task repeats it); any hit meets the trigger as that person. |

### b.6 What D4 assumes of T4, and needs from it

The tuition release made `invoices.status` a derived label (`paidLabel`: this month's recorded payment against charge plus debt less credit carried in). T4 is removing the browser writers of `status`. D4's floor is designed for the state AFTER T4 and does not depend on its order:
1. The floor reads facts, not who wrote them: it fires on every lane for any lowering of `recorded_payment`, `status`, `confirmation_status`, `tuition_frozen`. Whether T4 routes `RecordedPaymentManager` / `InvoiceStatusManager` through functions or deletes them, the lowering is recorded.
2. Needed from T4: (a) it adds no BEFORE trigger on `invoices` named after `zz_invoice_state_floor` that rewrites those four columns (the floor must see the final `NEW`); (b) it never "corrects" a bill by DELETE and re-INSERT without knowing the floor is keyed by (child, month) and survives that; (c) it defines no second meaning of "settled" - `tuition_month_state` is exposed for it; (d) if it keeps a tool that lowers a recorded payment, that tool asks for a reason (D4 does not guard it; the floor only makes it harmless to the tiers).
3. If T4 lands after D4, nothing in D4 changes.

### b.7 The common honest corrections, walked (operability rule)

| Correction | Cost after D4 |
|---|---|
| Wrong mark last week (any direction), bill confirmed or not | none |
| Present instead of Excused, six weeks ago, same or past month | admin: one dialog (T1-T2; a confirmed past month adds the second reason). Teacher: told "ask an administrator - this lesson is more than a week old" |
| Moving a lesson | D2's rule, unchanged |
| Cover teacher recorded within the week | none; later: one dialog |
| Child joined mid-month | none |
| Child started on the 28th, entered on the 13th | one dialog, from the enrolment screen or from Create Family |
| Fee for next month typed wrong | fix the row: none |
| Fee rise from next month | none |
| Discount from this month | none ("from this date") |
| Deactivating a child | none; one dialog when this month's bill is confirmed |
| Staff rate from today | none |
| Re-saving today's register after bills were confirmed | none |

### b.8 Codes and messages

D2's codes keep their meaning for both guards: HC010, HC011, HC012, HC013, HC015 (refuse codes), HC016, HC017, HC020 (`DETAIL kind=unhold|hold|reteach|retime|restaff|create_past`), HC022, HC040 / HC041, HC050.

| SQLSTATE | Message / DETAIL | HTTP, code | What the person reads (always with the next step) |
|---|---|---|---|
| HC020, new kinds | `kind=...` | 409 `requires_checked_path` | "Change the teacher / time / assistants / status of a held lesson from the lesson's Actions menu, with a reason." |
| HC023 | `session_born_status` | 409 `born_status` | "A lesson is created as Scheduled. Create it, then take the register." |
| HC024 | `attendance_identity` | 409 | "A register mark cannot be moved to another lesson or child. Change the mark instead." |
| HC025 | `attendance_requires_checked_path`; `kind=delete_mark\|unmark\|retro_mark` | 409 | delete / unmark: "A mark made by a person is changed, not removed." Admin: "This lesson is more than a week old and its month is billed. Change the mark with a reason." Teacher: "This lesson is more than a week old. Please ask an administrator to change it." |
| HC120 | `money_change_requires_checked_path`; `entity=..; tier=..` | 409 `money_requires_checked_path` | per entity: "Change this from the enrolment screen / discount screen / fee history / pay-rate history, with a reason." |
| HC121 | `money_change_refused`; `code=enrollment_identity\|discount_identity\|definition_in_use\|student_has_history\|class_has_history` | 409, the code | "End it and start a new one." / "Remove it and assign it to the other child." / "Create a new discount and assign it from a date." / "Deactivate instead." / "Archive instead." |
| HC060 | `approval_required`; `reasons=...` | 409 | "This needs a second administrator (<names>). Send it for approval?" |
| HC061 | `self_approval` | 403 | "You asked for this. <names> can approve it." |
| HC062 | `request_not_pending` | 409 | "Already dealt with. Open the Approvals list." |
| HC063 | `approval_already_pending` | 409 | "A request for this is waiting. Open it to approve or reject it, or ask <name> to withdraw it." |
| HC064 | `request_expired` | 410 | "More than <n> days old. Press Ask again." |
| HC065 | `approval_setting_locked` | 409 | "Approval needs two administrators." / "Loosening it needs the other administrator." |

---

## (c) Migration objects

### c.0 Rules for all six files (R-10)

- Under `supabase/migrations/`, one `BEGIN ... COMMIT`, a preflight `DO` block that refuses loudly and installs nothing, `CREATE OR REPLACE` / `IF NOT EXISTS` / `DROP TRIGGER IF EXISTS`, safe to paste twice, no existing row changed. Each ends with `NOTIFY pgrst, 'reload schema';` and a result set the SQL editor prints (trigger names with `tgenabled`).
- New tables: RLS on; `REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role`; `GRANT SELECT ... TO authenticated` (policy: admins) and `GRANT ALL ... TO service_role` (house rule; the triggers refuse its writes, as in the live D2 file `:233-236`). New views: `security_invoker = true`, the same REVOKE, `GRANT SELECT TO authenticated, service_role`. Every new function: `REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role` in one block, then `GRANT EXECUTE ... TO authenticated` for the public RPCs only (not `service_role`), as D2 section 5.
- No partial unique index is a conflict target; the upserts below name a PRIMARY KEY or a plain UNIQUE.
- **What D4 does to live D1/D2 objects - the whole list:** file 1 replaces the bodies of `_session_change_assess(public.sessions, text, jsonb, uuid)` and `_session_erased_recently(uuid)`, same signatures, same grants (none). Nothing else of D1 or D2 is replaced, altered, dropped or re-granted: not `session_held_evidence`, not `session_change_kind`, not `session_change_guard`, not `_session_change_apply`, not the five public RPCs, not the two tables, three triggers, two views. File 6 ADDS one trigger to `session_cancel_overrides`.
- **Preflight of file 1:** `md5(prosrc)` of the two functions it replaces must equal the values in `docs/evidence/D-release-fingerprint.expected.json` (pasted into the file as literals) or D4's own; anything else -> "the live function is not the one D4 was designed against; nothing was changed".

### c.1 `20261113090000_d4_floors.sql` - the two floors (ships alone: step 1a)

```sql
CREATE OR REPLACE FUNCTION public._caller_lane() RETURNS text LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL THEN 'person'
    WHEN NULLIF(auth.role(), '') = 'service_role' THEN 'service'
    WHEN NULLIF(auth.role(), '') IS NULL
     AND session_user::text NOT IN ('authenticator','authenticated','anon')
     AND COALESCE(NULLIF(current_setting('role', true), ''), 'none') NOT IN ('authenticator','authenticated','anon') THEN 'owner'
    ELSE 'unknown' END
$fn$;   -- D1's own positive test (20261112090000:249-256), split in two. 'unknown' = a person with no rights.

CREATE TABLE IF NOT EXISTS public.session_evidence_floor (
  session_id uuid PRIMARY KEY,                       -- no FK: must never block a lesson delete
  level text NOT NULL CHECK (level IN ('SOFT','STRONG')),
  families jsonb NOT NULL, first_at timestamptz NOT NULL DEFAULT now(), last_at timestamptz NOT NULL DEFAULT now(),
  causes jsonb NOT NULL DEFAULT '[]'::jsonb,         -- newest 20: {at, table, op, row_id, actor_user_id, lane, source: 'd1'|'row'}
  CONSTRAINT session_evidence_floor_causes_size CHECK (pg_column_size(causes) < 32768));
CREATE TABLE IF NOT EXISTS public.invoice_state_floor (
  student_id uuid NOT NULL, month text NOT NULL, PRIMARY KEY (student_id, month),   -- no FK: outlives a deleted bill
  ever_paid boolean NOT NULL DEFAULT false, ever_signed boolean NOT NULL DEFAULT false, ever_frozen boolean NOT NULL DEFAULT false,
  max_recorded_payment numeric NOT NULL DEFAULT 0,
  first_at timestamptz NOT NULL DEFAULT now(), last_at timestamptz NOT NULL DEFAULT now(),
  causes jsonb NOT NULL DEFAULT '[]'::jsonb);        -- newest 20: {at, what, old, new, actor_user_id, lane}
-- Both: a BEFORE UPDATE/DELETE trigger that refuses DELETE and any UPDATE lowering level / clearing a flag /
-- lowering max_recorded_payment (HC040); writes only by the table owner (the body of
-- session_cancel_audit_insert_guard, reused); BEFORE TRUNCATE refused.
```

```sql
_session_evidence_keep(p_session_id uuid, p_cause jsonb, p_own_level text, p_own_family text) RETURNS void   -- definer, VOLATILE
  -- 1 lesson not found, or NOT session_has_started(date, start_time)          -> RETURN
  -- 2 pg_trigger_depth() > 1 AND p_cause ->> 'table' = 'attendance'           -> RETURN  (the cancel's excuse-all)
  -- 3 lane := _caller_lane(); IF lane IN ('person','unknown')
  --      AND NOT COALESCE(has_role(auth.uid(),'admin') OR is_teacher_of_class(auth.uid(), s.class_id), false)
  --                                                                           -> RETURN  (D1 would refuse: NO floor)
  -- 4 floor already STRONG -> append the cause, RETURN.  Already kept in this transaction (hec.floor_seen) -> RETURN
  -- 5 BEGIN v := session_held_evidence(p_session_id); level := v->>'level'; fam := v->'families'; source := 'd1';
  --   EXCEPTION WHEN OTHERS THEN level := p_own_level; fam := jsonb_build_object(p_own_family, true); source := 'row'; END;
  -- 6 level = 'NONE' -> RETURN;  else INSERT ... ON CONFLICT (session_id) DO UPDATE (level only rises, families OR-ed)
session_effective_level(p_session_id uuid, p_d1 jsonb) RETURNS text      -- STABLE, definer: max(p_d1->>'level', floor.level)
invoice_floor_state(p_student uuid, p_month text) RETURNS jsonb           -- STABLE, definer: the floor row or all-false
```

| Trigger (BEFORE, row, definer) | On | Calls the keep / records when | For |
|---|---|---|---|
| `zz_attendance_evidence_guard` | attendance U, D | G-10 first (HC024 every lane; HC025 person lane). Keep when `OLD.marked_by IS NOT NULL` and (DELETE or status / marked_by changed); own proof: Present / Late -> STRONG `D`, Absent -> SOFT `R` | `OLD.session_id` |
| `zz_point_evidence_keep` | point_transactions U, D | `OLD.type IN ('participation','correction') AND OLD.points > 0` and (DELETE or any of `class_id, date, session_id, type, points, created_by, student_id, created_at` changed); SOFT `P` | `OLD.session_id`, plus every lesson of `OLD.class_id` on `OLD.date`, ascending id |
| `zz_transcript_evidence_keep` | class_transcripts U, D | DELETE or any of `class_id, session_id, transcript_date, status, audio_storage_path, uploaded_by, created_at` changed; linked -> STRONG `D`, else SOFT `T` | `OLD.session_id`, plus lessons of the class on `OLD.transcript_date` and the Hanoi day of `OLD.created_at` |
| `zz_homework_evidence_keep` | homeworks U, D; homework_submissions U, D | homeworks: DELETE or `class_id, created_at, created_by` changed; submissions: DELETE or `graded_at` cleared; SOFT `H` | lessons of the class on the Hanoi day of the homework's `created_at` / the submission's `graded_at` |
| `zz0_session_evidence_keep` | sessions U | `OLD.status = 'Held' AND NEW.status <> 'Held'` (not into Canceled), or `OLD.date IS DISTINCT FROM NEW.date`; SOFT `R` | `OLD.id`. Records only; D2's trigger decides. |
| `zz_invoice_state_floor` | invoices U, D | any lowering listed in G-9; upsert of the flags of OLD; never touches `NEW` | (student, month) |

Also `audit_point_transactions AFTER UPDATE OR DELETE ... audit_row_change()`.

**`_session_change_assess` (replaced, same signature) - additions only:**
```sql
v_level_now := v_ev ->> 'level';   v_level := public.session_effective_level(s.id, v_ev);
v_floor := (SELECT to_jsonb(f) FROM public.session_evidence_floor f WHERE f.session_id = s.id);
-- settled also true when a bill floor says so, and, when an evidence floor exists, over EVERY child on the register:
v_settled_src := v_settled_src OR EXISTS (SELECT 1 FROM public.attendance a
     LEFT JOIN public.invoices i ON i.student_id = a.student_id AND i.month = v_src_month
     LEFT JOIN public.invoice_state_floor f ON f.student_id = a.student_id AND f.month = v_src_month
    WHERE a.session_id = s.id AND (v_floor IS NOT NULL OR a.status IN ('Present','Absent','Late'))
      AND (COALESCE(f.ever_paid OR f.ever_signed OR f.ever_frozen, false)
           OR (v_floor IS NOT NULL AND <D2's settled test on i>)));
-- delete: v_refuse := 'use_cancel' when (s.status <> 'Canceled' AND v_level <> 'NONE')
--                                   OR  (s.status =  'Canceled' AND v_level_now <> 'NONE')      -- D2 5.3 step 9 kept
-- refresh_pairs: plus (old child, month) of register rows re-pointed away in audit_log (G-10 residue)
-- token: version 3 = version 2's inputs + v_level_now + (v_floor ->> 'level') + jsonb_array_length(v_floor -> 'causes')
-- output adds: level_now, floor, fingerprint (the token's hash without p_uid),
--   impact {tier, closed_payroll, families, paid_vnd}   -- counts and stored figures over invoices_before + the bill floor
```
`level` in the output stays the effective one, so `session_cancel_overrides.level`, the review rule and every screen work unchanged. `_session_erased_recently` gains one UNION branch: the floor's causes of the last 30 days (`what: 'points' | 'transcript' | 'homework' | 'attendance' | 'session_status'`).

### c.2 `20261113091000_d4_core_register.sql` - the money guard's core and the register (step 1b)

Preflight: file 1; `session_change_reason_ok`; the two audit-guard functions of D2 (reused); `payroll_month_is_locked`; `student_enrolled_on`.

```sql
CREATE TABLE IF NOT EXISTS public.money_change_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
  txid bigint NOT NULL DEFAULT txid_current(), actor_user_id uuid NOT NULL,
  entity text NOT NULL CHECK (entity IN ('attendance','session','class_fee','enrollment','discount_assignment',
                                         'referral_bonus','pay_rate','invoice_freeze','family_link')),   -- all, from day one
  op text NOT NULL, target_id uuid NOT NULL, student_ids uuid[] NOT NULL DEFAULT '{}',
  reach_from date, reach_to date,
  via text NOT NULL CHECK (via IN ('single','bulk')), batch_id uuid,
  tier int NOT NULL CHECK (tier BETWEEN 0 AND 3), correction_mode boolean NOT NULL,
  reason text, correction_reason text, confirmed boolean NOT NULL, token text NOT NULL,
  row_before jsonb NOT NULL, change jsonb NOT NULL, reach jsonb NOT NULL, evidence jsonb,
  invoices_before jsonb NOT NULL, refresh_pairs jsonb NOT NULL, impact jsonb NOT NULL,
  review_required boolean NOT NULL, attached jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT money_change_overrides_reason CHECK (tier = 0 OR reason IS NOT NULL),
  CONSTRAINT money_change_overrides_correction CHECK (correction_mode = (tier = 3) AND (NOT correction_mode OR correction_reason IS NOT NULL)),
  CONSTRAINT money_change_overrides_attached_size CHECK (pg_column_size(attached) < 131072));
CREATE TABLE IF NOT EXISTS public.money_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
  override_id uuid REFERENCES public.money_change_overrides(id) ON DELETE RESTRICT, actor_user_id uuid,
  kind text NOT NULL CHECK (kind IN ('guard_installed','tuition_refreshed','tuition_refresh_failed','reviewed',
                                     'automation_refused','service_retro_mark','owner_lane')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(payload) < 262144));
-- append-only + insert-guard + no-truncate triggers as D2's audit tables; admin read policy; indexes as D2's.
```
```sql
tuition_month_state(p_student uuid, p_month text) RETURNS jsonb     -- STABLE, definer. {month, past, state, tier}
  -- state from invoices OR invoice_floor_state (frozen > signed > paid > issued > none); tier = the table in b.0;
  -- any error or NULL -> tier 3
tuition_reach(p_students uuid[], p_class uuid, p_from date, p_to date) RETURNS jsonb
  -- p_students is widened to every child of their families. Months = every month from p_from to p_to that is past
  -- or has a bill row. {tier, months[], invoices_before[], refresh_pairs[], fp, impact{families, paid_vnd, closed_payroll:false}}
payroll_reach(p_teacher uuid, p_assistant uuid, p_from date, p_to date) RETURNS jsonb
_money_ack(p_entities text[], p_target uuid, p_student uuid, p_from date, p_to date, p_tier int) RETURNS boolean
  -- the flag hec.money_change_ack names a row of THIS txid, entity in p_entities, covering target / child / window.
  -- row.tier < p_tier -> RAISE token_stale HC011 (A-8). Not consumed (one change may write several rows);
  -- the apply clears the flag and then checks in pg_trigger that the entity's guard trigger is enabled (HC050 if not).
money_change_preview(p_entity text, p_op text, p_args jsonb) RETURNS jsonb                    -- STABLE, admin
money_change_checked(p_entity text, p_op text, p_args jsonb, p_reason text DEFAULT NULL, p_token text DEFAULT NULL,
                     p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}') RETURNS jsonb
money_changes_checked_bulk(p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb DEFAULT '{}') RETURNS jsonb   -- <= 50
record_money_change_event(p_override_id uuid, p_kind text, p_payload jsonb DEFAULT '{}') RETURNS uuid
log_money_automation_refused(p_entity text, p_target uuid, p_source text) RETURNS uuid      -- service_role only
d4_guard_status() RETURNS jsonb     -- every D4 trigger with tgenabled, both floors, 30-day counts of the three event kinds
-- extension points, created ONLY IF MISSING (the session_recording_evidence pattern), replaced by file 6:
change_approval_needed(p_impact jsonb, p_actor uuid) RETURNS jsonb  -> '{"required": false, "reasons": []}'
_change_request_claim(p_kind text, p_fingerprint text) RETURNS uuid -> NULL
```
**The dispatcher is written once and never re-created by a later file.** `_money_change_plan(entity, op, args, uid)` is a static `CASE entity WHEN 'attendance' THEN public._money_plan__attendance(op, args, uid) WHEN 'session' THEN public._money_plan__session(...) ...` (plpgsql binds each call when its branch first runs, so a branch whose function is not installed yet raises 42883 only when used; it is caught and re-raised as HC015 `not_installed`). `_money_change_apply` does the same with `_money_exec__<entity>(plan jsonb)`. Each later file adds only its own `_money_plan__*` / `_money_exec__*` pair and triggers. No dynamic SQL.

Plan output (every entity): `{entity, op, target_id, student_ids, row_before, change, reach_from, reach_to, reach, tier, allowed, refuse_code, requires{reason_min, confirm, correction_reason}, invoices_before, refresh_pairs, impact, approval{required, reasons}, review_required, token, fingerprint}`; `token = sha256([1, entity, op, args (keys sorted), uid, tier, md5(row_before), reach.fp])`.
Apply order: admin -> reason (T1+; NULL allowed at T0) -> `pg_advisory_xact_lock(hashtextextended('money:'||entity||':'||target, 0))` -> row locks (attendance and session entities: the `sessions` row first, D2's order, section 4.4) -> plan -> refuse codes (HC015) -> token (T1+, HC011) -> confirm (HC012) -> correction reason (HC013) -> approval hook (`change_approval_needed`; required and no claim -> HC060) -> INSERT override -> set flag -> exec -> clear flag -> trigger-enabled check (HC050). `review_required := tier = 3 OR (tier = 2 AND via = 'bulk') OR impact.closed_payroll`.

This file's entity: **`attendance`**, ops `set_marks {session_id, marks[<=60]}` (writes `marked_by = actor`; the dialog says "this is recorded as your mark") and `repair {student_id, class_id, from, to, status}` (rows as `repair-attendance` writes them). Trigger `zz_attendance_money_guard` = the seven rules of G-11; its INSERT branch begins `IF EXISTS (SELECT 1 FROM attendance WHERE session_id = NEW.session_id AND student_id = NEW.student_id) THEN RETURN NEW; END IF;`.

### c.3 `20261113092000_d4_class_fee_history.sql` (step 2)

```sql
CREATE TABLE IF NOT EXISTS public.class_fee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  effective_from date NOT NULL CHECK (effective_from = DATE '1900-01-01' OR EXTRACT(DAY FROM effective_from) = 1),
  session_rate_vnd integer NOT NULL CHECK (session_rate_vnd >= 0),
  note text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
  UNIQUE (class_id, effective_from));                 -- plain, not partial
-- baseline, idempotent: INSERT ... SELECT id, '1900-01-01', COALESCE(session_rate_vnd, 0) FROM classes ON CONFLICT DO NOTHING
-- (rows in a NEW table; no class, lesson or bill is touched)
-- RLS: staff may read; NO write policy for authenticated - rows are written by the checked op and the two triggers.
class_fee_on(p_class uuid, p_date date) RETURNS integer        -- STABLE: the row with the greatest effective_from <= p_date
-- trigger class_fee_baseline AFTER INSERT ON classes: the new class's 1900 row
-- trigger zz_class_fee_money_guard BEFORE I/U/D ON class_fee_history: reach = children with a billable mark on a lesson of
--   the class dated from effective_from to the next row's; tier via tuition_month_state; owner / ack 'class_fee' / HC120
-- trigger zz_class_fee_mirror_guard BEFORE UPDATE OF session_rate_vnd ON classes: owner or ack 'class_fee', else HC120
-- _money_plan__class_fee / _money_exec__class_fee: 'set' (insert, or update of the same-date row; then
--   UPDATE classes SET session_rate_vnd = class_fee_on(id, today)), 'remove' (never the 1900 row)
```
First-of-month rows mean a class has one fee per month, so `class_breakdown[].session_rate_vnd` keeps its meaning. `refresh_pairs` = the reached (child, month) pairs from `effective_from` on; a row dated next month has none.

### c.4 `20261113093000_d4_lesson_pay_guard.sql` (step 3A)

```sql
session_pay_change_kind(o public.sessions, n public.sessions) RETURNS text    -- STABLE. NULL = nothing of ours
  -- 'unhold'  o.status='Held' AND n.status='Scheduled'
  -- 'hold'    o.status='Scheduled' AND n.status='Held' AND (no attendance row with marked_by IS NOT NULL
  --             OR an 'unhold' override exists for the lesson OR payroll_month_is_locked(month))
  -- 'reteach' teacher_id differs AND (o.status='Held' OR lesson started more than 7 days ago)
  -- 'retime'  o.status='Held' AND start/end differ AND session_change_kind(o, n) IS NULL
  -- then: the free week - reteach / retime with the month open and the lesson ended <= 7 days ago -> NULL
  -- two of ours, or one of ours together with a non-NULL session_change_kind(o, n) -> HC022
CREATE TRIGGER zz2_session_pay_guard BEFORE UPDATE ON public.sessions FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
     OR OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time)
  EXECUTE FUNCTION public.session_pay_guard();
  -- owner -> pass (+ owner_lane event); ack ('session', lesson id) whose op = the kind and whose change equals the write -> pass;
  -- service -> the table in b.1 (un-hold kept Held + automation_refused event; hold allowed; reteach / retime HC020);
  -- person -> HC020 kind=<kind>
CREATE TRIGGER zz_session_insert_guard BEFORE INSERT ON public.sessions ...       -- G-3, G-7
CREATE TRIGGER zz_session_staff_guard BEFORE INSERT OR UPDATE OR DELETE ON public.session_participants ...   -- G-6
-- _money_plan__session / _money_exec__session: ops unhold, hold, reteach, retime, restaff, create.
--   The plan carries D1's JSON and the floor in `evidence`; tier: unhold = session_change_tier(started, effective level,
--   settled incl. bill floor); the others = pay tier; create = tuition tier over the children enrolled that day, >= 1.
--   exec 'reteach' also sets is_manual = true, manual_reason = reason (a Held lesson is never rebuilt; no schedule meaning).
```

### c.5 `20261113094000_d4_money_inputs_guard.sql` (step 3B)

Triggers `zz_enrollment_money_guard`, `zz_discount_money_guard` (assignments and bonuses, with `discount_identity`), `zz_discount_definition_guard`, `zz_pay_rate_money_guard`, `zz_staff_pay_mirror_guard` (reach = dates before the person's earliest history row only), `zz_invoice_unfreeze_guard`, `zz_family_link_guard` (on `students` for `family_id` / `sibling_discount_from`, on `families` for `sibling_percent_override`), `zz_student_delete_guard`, `zz_class_delete_guard`; `audit_families` (the table is not in the audit list); `change_enrollment_terms(p_enrollment_id uuid, p_terms jsonb, p_effective_date date)`; the plan / exec pairs for `enrollment`, `discount_assignment`, `referral_bonus`, `pay_rate`, `invoice_freeze`, `family_link` with the ops of b.4. `ai_plan_check` is NOT touched.

### c.6 `20261113095000_d4_change_approvals.sql` (step 4) - objects; rules in (e)

```sql
change_approval_settings (one row: enabled false, on_tier3 true, on_closed_payroll true, on_unfreeze true,
   on_pay_adjustment true, min_families 3, min_paid_vnd 5000000, expiry_hours 168, solo_release_after_hours NULL)
change_approval_requests (id, created_at, requested_by, kind 'session'|'money'|'settings', rpc, params, target_key,
   batch boolean, impact, reasons, preview, fingerprint, expires_at)            -- append-only
change_approval_events   (request_id, txid, actor_user_id, kind 'requested'|'approved'|'rejected'|'withdrawn'|'stale'|
   'applied'|'released_alone', payload {override_ids[]})                        -- append-only
change_approval_queue    (view)
change_approval_needed(p_impact jsonb, p_actor uuid)      -- REPLACES the stub
_change_request_claim(p_kind text, p_fingerprint text)    -- REPLACES the stub
request_change_approval(p_kind text, p_rpc text, p_params jsonb, p_token text) RETURNS jsonb
approval_request_preview(p_request_id uuid) RETURNS jsonb
approve_change_request(p_request_id uuid, p_token text, p_note text DEFAULT NULL) RETURNS jsonb
reject_change_request(p_request_id uuid, p_note text), withdraw_change_request(p_request_id uuid),
release_own_request(p_request_id uuid, p_token text), set_change_approval_settings(p_patch jsonb, p_reason text),
change_approval_status() RETURNS jsonb
-- trigger zz_session_override_approval BEFORE INSERT ON session_cancel_overrides: the approval hook for D2's own
--   changes, with NO change to _session_change_apply: impact from NEW (tier, payroll_month_locked, invoices_before);
--   required and no claim -> HC060. (HC060 is not in the bulk RPC's per-item list, so it aborts the chunk: a batch
--   that needs approval is refused as a whole, which is R-12's "one request per batch".)
-- trigger zz_admin_grant_guard on user_roles; trigger zz_pay_adjustment_approval on payroll_adjustments (A-4): while enabled.
```

---

## (d) Edge functions and `src`, file by file (grouped by the build step that owns them)

Rules (D2's, unchanged): a person-initiated write to a guarded table is made on the caller's own client; a guarded change is preview -> confirm with the token; a missing RPC is `503 guard_not_installed` with no write and no fallback; an exception after a committed change is not reported as a failed change.

**Step 1a** (floors)
- `src/lib/sessionGuard.ts`: `GuardPreview` gains `level_now`, `floor`; `evidenceList` appends the floor's causes under "Recorded, and later removed"; nothing else.
- `src/components/admin/session-guard/EvidenceCards.tsx`: that card. No function changes: D2's functions pass the preview through.

**Step 1b** (core and register)
- `supabase/functions/_lib/session-guard.ts`: the code map gains EVERY new code of b.8 now (HC023, HC024, HC025, HC060-HC065, HC120, HC121; `not_installed` and the new refuse codes in the HC015 map), so no later step edits this file's map.
- `supabase/functions/_lib/money-guard.ts` (new): `moneyPreview`, `moneyConfirm`, `refreshMoneyChange` (reads `refresh_pairs` as the caller, runs `refreshPairs` at most 25 pairs a minute, records `tuition_refreshed` / `tuition_refresh_failed`; what is left shows in the pending view and is resumed by the same call).
- `supabase/functions/guarded-change-refresh/index.ts` (new, admin only): `{action:'refresh', override_id}`; service-only `{action:'log-refused'}`.
- `supabase/functions/repair-attendance/index.ts`: insert on the caller's client; HC025 -> `409 attendance_requires_checked_path` + preview, nothing inserted; body may carry `ack {reason, token, confirm, correction_reason}` -> `money_change_checked('attendance','repair')`.
- `supabase/functions/mark-attendance/index.ts`: admin caller -> the upsert (`:160-162`) and the Held flip (`:174-178`) on the caller's client; HC025 mapped, never retried on the service key. Teacher caller -> rule 6 of G-11 applied in the function from the lesson's date and the stored marks (no bill is read, no RPC is needed), then the service write as today. When the lesson's month is past and the D4 status RPC is missing: 503, nothing written (A-13).
- `src/lib/moneyGuard.ts`, `src/components/admin/money-guard/{api.ts, useMoneyChange.ts, MoneyGuardDialog.tsx, ReachTable.tsx, MoneyChangesReview.tsx}` (new; the dialog reuses `Fields.tsx` unchanged).
- `src/components/admin/PastAttendanceEditor.tsx`, `AttendanceRepairTool` (the screen behind `AutomationTab.tsx:142`): on the 409, open the dialog.

**Step 2** (dated class fees)
- `supabase/functions/_lib/class-fee.ts` (new, imports nothing): `classFeeOn(history, classId, date, fallback)`; a missing `class_fee_history` table (42P01 / PGRST205) falls back to `classes.session_rate_vnd`, the way `_lib/sibling-hold.ts:34` tolerates a missing column - so the function and the migration can ship in either order.
- `calculate-tuition/index.ts:185,252,314,552`, `calculate-tuition-bulk/index.ts:155,306,416`, `_lib/projected-per-class.ts:22,61`: read the history once per call and price each lesson with `classFeeOn(..., s.date, ...)`. No other line changes. Gate: `fixtures/tuition-figures.golden.json` byte-identical with baseline rows, and with no history table.
- `src/components/admin/class/ClassSettings.tsx`: the fee field becomes "Fee history" (list, "New fee from <month>"), through `('class_fee','set')`. `src/components/admin/class/ClassFeeHistory.tsx` (new).

**Step 3A** (lessons)
- `manage-session/index.ts`: `change-status` between Held and Scheduled -> preview `('session','unhold'|'hold')`; `kind` null -> plain update as the caller (as today); else `readAck()` + `money_change_checked`. `update`: `status` is no longer written; a teacher change the preview calls `reteach` -> `409 requires_checked_path, use_action:'set-teacher'`. New actions `set-teacher`, `set-time`, `set-staff`. `move`: a same-day time edit of a Held lesson outside the free week is `retime`, not `plain_update`. `create`: status always Scheduled; not started -> insert on the caller's client (the service key leaves this action); started -> preview / `('session','create')`. The public D2 actions and their RPC calls are untouched.
- `bulk-cancel-sessions/index.ts`: HC060 on a chunk -> the whole batch is returned as `approval_required` with one request offered.
- `schedule-sessions/index.ts:698-708`: HC020 on a Held time update -> `attention` + `log_session_automation_refused`.
- `src/lib/lessonPayGuard.ts` (new: op labels and sentences), `SessionActionsModal.tsx`, `class/AttendanceDrawer.tsx` (teacher swap `:141-160`, assistant tick `:246`: try the plain write, on HC020 open the dialog), `class/SessionDetailDrawer.tsx`, `EditSessionModal.tsx`, `AddSessionModal.tsx`, `TeacherScheduleTransfer.tsx` (error wording only), `SessionGenerator.tsx`, `SessionGeneratorConfirm.tsx` (include-held removed).

**Step 3B** (money inputs)
- `update-enrollment-rate/index.ts`, `create-family/index.ts`, `manage-demo-student/index.ts` (report `demo_reset_needs_owner`), `admin-data-import/index.ts` (whitelist cut, `session_rate_vnd` stripped): as b.5 / G-20.
- `src/lib/moneyInputs.ts` (new: entity and op wording). Screens moved to `useMoneyChange`: `BulkEnrollmentDateSetter`, `class/ClassEnrollments`, `ModifyEnrollmentModal` ("from this date" first), `discount/EditEnrollmentDiscountModal`, `EnrollmentRateEditor` (the in-place weekday write `:99-102` goes), `EnrollStudentDialog`, `StudentForm`, `EnrollmentRequestsManager`, the Create Family screen, `StudentsList` (deactivate), `discount/AssignDiscountModal`, `discount/StudentDiscountsTab`, `discount/EditDiscountModal`, `DiscountManager`, `staff/PayRateHistory`, `TeacherEditDrawer`, `ta/TAProfileDrawer`, `student/BillFreezePanel` (unfreeze), `SiblingDiscountCompute`, `pages/FamilyDetail`, `FamilyMembersManager`, `tabs/DataTab`, `src/lib/aiActions.ts` (wording).

**Step 4** (approvals): `src/lib/approvals.ts`, `src/components/admin/approvals/{ApprovalInbox, ApprovalSettingsCard, PendingApprovalBadge}.tsx`; `useGuardedChange.ts` and `useMoneyChange.ts` gain `requestApproval()`; `CancelOverridesReview.tsx` gains tabs and shows asked-by / approved-by from the approval events; `payroll/PayrollMonthLock.tsx` handles HC060.

Not touched by D4: calculate-payroll, close-payroll-month, confirm-tuition, the payment functions, `chat/**`, the Stars engine SQL, `ai_plan_check`. `types.ts` is regenerated by the conductor after the paste; new tables and RPCs are reached through the typed wrappers in the two `api.ts` files.

---

## (e) Two-admin approval (built OFF)

The setting ships `enabled = false`; `change_approval_needed` then answers "not required" for everything.

**Default threshold when switched on** - a change needs a second administrator when ANY is true, each read from the preview, none priced:

| Reason | Rule |
|---|---|
| `tier3` | The change is T3 (a taught lesson whose money is settled is cancelled, deleted, moved or un-held; or a money change reaching a confirmed, adjusted or frozen bill of a past month). |
| `closed_payroll` | It reaches a closed payroll month. |
| `families` | Settled bills of **3 or more families** in reach. |
| `paid` | **5,000,000 VND or more** already recorded on the bills in reach (highest recorded value, floor included). |
| `unfreeze` | Unfreezing a bill. |
| `pay_adjustment` | Carrying a payroll correction forward (`payroll_adjustments`) - the one screen that pays staff a free amount. |
| `settings` | Turning approval off or loosening it; giving someone the admin role. |

**Not splittable (R-12).** `families` and `paid` are counted over (1) the whole batch - `money_changes_checked_bulk` computes one impact for all its items, and D2's bulk is caught by the insert trigger - plus (2) the same person's applied T2+ changes of the last 24 hours, read from the two override tables. Fifteen single-family changes by one admin in an afternoon trip the line at the third. A batch that needs approval is ONE request holding the list; nothing in it is applied until it is approved.

**How it works.**
1. *Asking.* The preview says `approval.required`; the button reads "Send for approval". `request_change_approval` re-runs the plan as the requester under the same locks, checks token, reason, confirmation and correction reason, refuses when no approval is needed (a request is not a place to park a change) and when one is already waiting for the target (HC063), and stores what was asked with a fingerprint. Nothing else is written.
2. *Waiting.* A badge on the target; the requester may withdraw; other changes to the target proceed under their own rules and make the request stale. Month close and bill confirmation are not blocked; the Payroll and review screens say "N changes are waiting for a second administrator".
3. *Deciding.* `approval_request_preview` gives the other admin the request beside the plan recomputed now, as them, with their token. `approve_change_request`: an admin, **not the requester** (HC061; compared on `auth.uid()`, no exempt role), pending (HC062), not expired (HC064); under the locks the plan is recomputed - a different fingerprint writes a `stale` event and returns `{status:'stale'}`; the approver's token must match (HC011); an `approved` event is written, the flag `hec.change_request_ok` is set, and the SAME public checked function is called with the stored arguments. Its hook asks `_change_request_claim`, which accepts only a request approved in this transaction with this fingerprint. Approval and change are one transaction. Because the public function runs as the approver, D2's own columns (`canceled_by`, `actor_user_id` of a D2 row) name the approver; the request and its events name who asked; the review screen shows both (A-16). Money rows store the requester as `actor_user_id`.
4. *Expiry.* 7 days; an expired request cannot be approved; "Ask again" pre-fills the form and takes a fresh preview.

**Few admins.**
- Cannot be switched on with fewer than two admins (HC065), nor - said on the settings card - before step 4 is installed.
- **Way out when the other admin is away (A-17):** setting `solo_release_after_hours`, NULL (never) by default. When the owner sets it (say 48), the requester may apply their own request once it has waited that long undecided (`release_own_request`): recorded as `released_alone`, always in the review queue, shown first to the other admin on return. A delayed act by a named person, on the record; the alternative - switching the rule off from the SQL editor - leaves no trace in the approval tables and is all or nothing. The SQL statement is still printed on the status card for a school that falls to one admin.
- Adding an admin while it is on is a request of kind `settings` (`grant_admin`), applied by the other admin's approval (A-18). Loosening or switching off: the same. Tightening and switching on: immediate.
- Residual, stated: two logins held by one person before it was switched on; an admin password-reset tool, if one exists, makes a second login on the spot. The status card lists the admins for the owner to read on the day.
- A missing settings row is HC050 `guard_broken` with the repair statement, not "approval required" (A-15).
- The approver's work is one screen and one click; rejecting needs a sentence. No new notification system: a count on the admin overview.

**Audit.** Requests and events are append-only, written only by the definer functions, readable by admins; the `applied` event lists the override ids. A T3 change that was approved still goes to the review queue.

<!-- END -->
