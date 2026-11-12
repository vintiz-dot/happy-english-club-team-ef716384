# D4 - other tuition-affecting actions: design

**Where I am / next step:** section (a) written (verified open paths). Next: (b) design per path.

Designer: Fable 5.2, worktree `agent-a5cb52c7b0f9c53b1`, base `claude/hec-conductor-setup-efbaa5` at 0618a6b.
Design only. Nothing under `src/` or `supabase/` was changed, nothing was run against a database, nothing was pushed.
Everything below marked "verified" was read in this checkout; the LIVE database was not looked at (migrations are pasted by hand, so "per migrations" is the strongest claim available).

Read for this: root `AGENTS.md`, `supabase/AGENTS.md`, `docs/MASTER_PLAN.md` (sections 1, 6, 8, 10), `docs/evidence/D0-inventory.md`, the D-review-1/2/3 findings named below, `D-ship-fixes.md`, `D3-review.md` item 8, both live migrations in full (`20261112090000`, `20261112091000`), `manage-session/index.ts` in full, the writers listed in (a).

Vocabulary used throughout (all from D1/D2, nothing new):
- **level** NONE / SOFT / STRONG - the answer of `session_held_evidence` (D1).
- **tier** T0-T3 - `session_change_tier` (D2): T0 no question, T1 reason + confirm, T2 the same plus review when STRONG, T3 correction mode (second reason, always reviewed).
- **checked path** - a SECURITY DEFINER RPC called with the admin's own JWT that writes one append-only override row and sets a transaction-local flag; the BEFORE trigger accepts the write only when the flag names a row of this transaction (txid) for this target and this kind.
- **lane** - who is writing. D4 names three and uses one helper for it (`_caller_lane()`, section c.0): `person` (auth.uid() is set), `service` (no uid, JWT role `service_role`: an edge function), `owner` (no uid, no JWT role, not an API role: the SQL editor, cron, the test harness). Anything else is treated as a person with no rights.

---

## (a) Verified list of open paths

Status words: **OPEN** = no guard today; **REVIEWED ONLY** = allowed, but a later cancel lands in the review queue; **GUARDED** = already refused or checked.

### Group 1 - sessions (D0 S7, S15-S17, S19, S24, S25; review F-13)

| # | Path (file:line, verified) | Status | Concrete misuse |
|---|---|---|---|
| P1 | **Held -> Scheduled by a person.** `manage-session/index.ts:244` (`change-status`, plain update as the caller, reason optional - `:247` stores `reason: data.reason ?? null`); `:316` (`update` writes `status: status \|\| oldSession?.status`, only the Canceled boundary is refused at `:299`); raw PostgREST under the admin policy. The classifier calls this "nothing guarded" on purpose (`20261112091000:249-250`). | OPEN (F-13). A later cancel is reviewed (`_session_erased_recently` third branch, `:577-585`), the un-hold itself is not. | An admin un-holds a teacher's four taught lessons on the 30th. The month is closed the next day; the teacher is paid four lessons short and the only trace is an `audit_log` row with no reason. |
| P2 | **Scheduled -> Held with no register, and a lesson born Held or Canceled.** `manage-session/index.ts:244` (to Held); `:430-438` (`create` inserts with the SERVICE key, `status: status \|\| 'Scheduled'`). No trigger looks at INSERT (`20261112091000:725-738` are UPDATE / DELETE / TRUNCATE only). Review 3 probe: "create born Held (past) => 200" (`D-review-3.md:76`). | OPEN | An admin creates three "make-up" lessons dated last week, already Held, for a friend on the staff: three lessons of pay, no register, no reason asked. |
| P3 | **Teacher change on a Held lesson.** `AttendanceDrawer.tsx:144-151`, `SessionDetailDrawer.tsx:114-118` (raw updates), `manage-session/index.ts:313-314` (`update`), raw PostgREST. `TeacherScheduleTransfer.tsx:142-145,155-158` writes raw too but its lists are filtered to `Scheduled` (`:71`, `:88`) - a UI filter, not a rule. | OPEN. D3 review item 8 proved by probe that the guard allows it on Held and settled lessons (`D3-review.md:59`). | Pay for a lesson Ms A taught is moved to Mr B in a payroll month that is already closed; the locked figures stay, the "drift" appears on the Payroll screen and is carried forward by whoever clicks next. No reason anywhere. |
| P4 | **Time edit of a Held lesson** (same day, lesson stays started). `manage-session/index.ts:262-273` (`applied: 'plain_update'`); `schedule-sessions/index.ts:698-706` (`include-held` mode, service key, errors swallowed at `:708`). | OPEN | An hourly-paid teacher's Held lessons are lengthened from 60 to 120 minutes: pay doubles, tuition untouched, nothing asks why. |
| P5 | **Assistant roster / attended flag on a Held lesson.** `AttendanceDrawer.tsx:246`, `EditSessionModal.tsx:164,181`, `ta/TAClassAssignment.tsx:143,158` (raw). Audited (`20261022090000:68-70`), not guarded. | OPEN | An assistant is added to twelve Held lessons of a closed month, or flipped from absent to attended, and is owed for them at the next carry-forward. |
| P6 | **Backdated lesson creation.** `manage-session/index.ts:430-438` accepts any date. The AFTER INSERT seed gives every enrolled child a `Present` row with `marked_by NULL`, and a seeded Present is billed (`_lib/tuition-session.ts`: billable = Scheduled/Held and Present/Absent/Late; D1 item 12 says so too, `20261112090000:611-612`). | OPEN | A lesson is created on a date three weeks ago in a class of twelve: twelve bills rise by one lesson the next time anyone opens them. |
| P7 | **Automation un-hold.** Stars sync withdrawal `20261028090000:602-611`; `normalizeFutureHeld` `schedule-sessions/index.ts:427-430` (has never run, MASTER_PLAN Q9); `normalize_session_statuses` (SQL only, EXECUTE revoked). | No rule. Works as intended today. | Not a misuse today; it needs a defined lane so that P1's guard neither breaks the sync nor leaves a side door. |

### Group 2 - evidence (review-2 F-1 / F-3, review-3 F-10 / F-11)

| # | Path | Status | Concrete misuse |
|---|---|---|---|
| P8 | **Points re-dated or deleted; transcript unlinked, re-dated or deleted.** `point_transactions`: admin FOR ALL and class-teacher FOR ALL (`20251107052426:25-35`); UI delete at `PointHistoryDialog.tsx:100,118`. `class_transcripts`: `admins_all_transcripts`, `teachers_manage_class_transcripts` (`20260712090000:123-128`). Neither table is in the audit list (`20261009130000:150-154`), so `_session_erased_recently` cannot see it. | OPEN (F-11). Review-3 probe V7: tier 3 -> `{"tier":1,"level":"NONE","review":false,"erased":[]}`. | The owner-facing sentence in MASTER_PLAN: re-date a point row, unlink a transcript, then cancel a taught, paid lesson at the lowest tier with no review. |
| P9 | **Register row moved to another lesson or another child** (`UPDATE attendance SET session_id / student_id`). Nothing in `src/` or `supabase/functions` does this (grep: no writer). | REVIEWED ONLY (`20261112091000:561-575`). The write is allowed; the tier still drops. | The mark of a paying child is re-pointed at a child who has left: the first child's bill loses the lesson, and (F-10 residue, `D-ship-fixes.md:55`) their bill is not in `refresh_pairs` because that list is built from the current register (`:489-493`). |
| P10 | **A person's mark deleted, or `marked_by` set to NULL.** Admin delete policy `20251012063108:27-29`; teacher delete policy `20260403050441:57`. No UI deletes a mark. | REVIEWED ONLY (`:541-559`); tier drops. | Delete the three Present marks, then cancel at T1. Reviewed afterwards, but the cancel itself met no correction-mode check. |
| P11 | **Retroactive register edits that move a bill** (Present/Absent/Late <-> Excused on a lesson of a month that is already billed). `PastAttendanceEditor.tsx:60` -> `mark-attendance/index.ts:160-162` (service key, no reason field); teacher direct upsert `AttendanceMarking.tsx:199-205`; raw PostgREST. | OPEN. T1 softens it (a confirmed bill goes to `needs_review`, a frozen one keeps its figures); a paid, unconfirmed bill of a past month just changes. | Eight marks of last term are switched to Excused for one family: eight lessons of credit carried into next month, no reason recorded. |

### Group 3 - enrollments, discounts, rates (D0 O10, O15, O22, O23)

| # | Path | Status | Concrete misuse |
|---|---|---|---|
| P12 | **Enrollment start date edited in place.** `BulkEnrollmentDateSetter.tsx:69-72` (every enrollment of a class at once), `class/ClassEnrollments.tsx:51-54`. | OPEN | A whole class's start date is set a month later: every child's first month of lessons falls outside the enrollment and is un-billed (and `excuse_attendance_outside_enrollment` rewrites their marks to Excused). |
| P13 | **Rate override, discount and weekdays edited in place** - none of them dated, so each applies to every month of the enrollment. `ModifyEnrollmentModal.tsx:268-274` (rate), `discount/EditEnrollmentDiscountModal.tsx:82-85`, `EnrollmentRateEditor.tsx:99-102` (weekdays in place, against the rule in `supabase/AGENTS.md`), `update-enrollment-rate/index.ts:57` (service key, reason optional). | OPEN | A 30% discount is typed onto an enrollment that began in January: every unfrozen month since January re-prices on its next calculation. |
| P14 | **Backdated enroll / end / transfer / weekday change.** Inserts: `ClassEnrollments.tsx:220`, `EnrollStudentDialog.tsx:70`, `StudentForm.tsx:95`, `EnrollmentRequestsManager.tsx:49`. Dated RPCs `20261106100001:1,106,158` take any effective date and check only the admin role. Raw DELETE under the admin policy (no UI). | OPEN | `end_enrollment` with a last day two months back removes the placeholder marks after it (`:140`) - two paid months un-billed - with no reason. |
| P15 | **Discount assignments and referral bonuses.** `AssignDiscountModal.tsx:97`, `StudentDiscountsTab.tsx:91,123`, `EditDiscountModal.tsx:77-78,109-110`, `DiscountManager.tsx:178,211,247`. Audited (`audit_discount_assignments`), not guarded; any `effective_from`. | OPEN | A discount is assigned with `effective_from` six months ago, or an old one is deleted: six months of bills move. |
| P16 | **Class fee (`classes.session_rate_vnd`).** `class/ClassSettings.tsx:114`. calculate-tuition prices every lesson of every month at the class's CURRENT rate (`calculate-tuition/index.ts:251-253`). The fee is not dated. | OPEN, and worse than it looks: an honest fee rise re-prices every unfrozen past bill of the class. | The fee goes from 150,000 to 170,000 from January. In February an admin opens last October's bill of an unconfirmed family: it is now 20,000 per lesson higher. |
| P17 | **Pay-rate history.** `staff/PayRateHistory.tsx:124-127` (backdated `effective_from` allowed; the toast says "re-run payroll for the affected months"); policy FOR ALL to admins (`20261021090000:275-279`), so old rows can be UPDATEd or DELETEd raw although the table comment says "added, never edited". | OPEN. Closed months keep their lines; open past months re-price; closed months show drift that is then carried forward. Side finding: that upsert names a PARTIAL unique index (`:99-102`) as its conflict target, which root `AGENTS.md` says fails with 42P10 - the checked RPC below replaces it. | A rate row dated the 1st of last month is added on the day before closing: every Held lesson of the month re-prices upward. |
| P18 | **Unfreezing a bill.** `student/BillFreezePanel.tsx:55-56` - freezing stores `frozen_reason`, unfreezing stores nothing. | OPEN | Unfreeze an unpaid frozen bill, edit the enrollment (now "nothing settled"), freeze again. |
| P19 | **`admin-data-import`.** `admin-data-import/index.ts:72-76` whitelist includes `enrollments`, `sessions`, `attendance`, `discount_assignments`, `discount_definitions`, `classes`; `:94-97` upserts with the service key. Sessions are covered by the D2 triggers on the automation lane; the rest is not. | OPEN (D0 O15) | A JSON file re-imports last year's attendance over this year's register. |
| P20 | **Hard delete of a student** (raw PostgREST only; the UI deactivates, `StudentsList.tsx:102-106`). Cascades to attendance (`20251012062405:5`), enrollments and the money tables (`20251012022746:10,38,57`). | OPEN, no UI | One DELETE removes a child's bills, payments and register. |

### Checked and found already guarded

| Path | Why it is guarded |
|---|---|
| Deleting a class with history (D0 S28, `ClassAdminActions.tsx:306`) | `sessions.class_id ... ON DELETE RESTRICT` (`20251012020423:21`): a class with any lesson cannot be deleted, and a lesson with evidence cannot be deleted first (D2: `use_cancel`). The UI re-counts sessions and enrollments before deleting (`:294-302`). One hardening item only (section b, G-15). |
| SessionGenerator / BulkRebuildSessions (`schedule-sessions`) | Deletes go through the D2 trigger's automation lane (unstarted, NONE, Scheduled only); inserts are `date >= today`; teacher updates are future Scheduled only. The one open piece is `include-held` (P4). |
| TeacherScheduleTransfer | Scheduled lessons only; payroll counts Held only (`payrollSessions.ts`, `ACTUAL_SESSION_STATUSES = ["Held"]`). Raw misuse on Held lessons is P3. |
| `sessions.rate_override_vnd` | Read by neither calculator (grep: calculate-payroll has no reference; calculate-tuition reads the ENROLLMENT's override). Not money. |
| Closed payroll rows, frozen bills, cancelled-lesson attendance, payment deletion | Existing guards; D4 touches none of them. |

**Count: 20 paths open (P1-P6, P8-P20 are 19 open or reviewed-only; P7 needs a defined lane).** The worst three:
1. **P8 (F-11)** - evidence that is not attendance can be removed first, and a taught, paid lesson is then cancelled at T1 with no review.
2. **P13 / P16** - in-place rate, discount and class-fee edits silently re-price every unfrozen past month; P16 does it even when the admin is being honest.
3. **P1 / P3** - un-holding a taught lesson, or moving it to another teacher, changes who is paid with no reason, including inside a closed payroll month.

---

## (b) The design, path by path

### b.0 Four building blocks, all made from D2's parts

1. **The session guard grows new kinds.** `session_change_kind` learns `unhold`, `hold`, `reteach`, `retime`; the same trigger function refuses them without an acknowledgement; the same `_session_change_apply` writes the same `session_cancel_overrides` row. Two more session-side kinds (`restaff`, `create`) use the same row and flag from their own small triggers. No second audit table for lessons.
2. **The evidence floor.** One small table remembers the highest evidence level a started lesson has ever shown at the moment someone was about to lower it. The guard computes its tier from `max(level now, floor)`. Evidence can still be corrected - a teacher may delete a point given by mistake - but removing it no longer lowers the check that a later cancel meets. This is what "not removable without the same level of check" means here: the removal is free, the benefit of the removal is gone.
3. **The money-change guard** for everything that is not a lesson: enrollments, discounts, the class fee, pay rates, unfreezing, retroactive register edits. One idea: every such write has a **reach** (which child or member of staff, which dates). The trigger asks one function what the reach touches and gets a tier; T0 passes as today; T1-T3 need the checked path. Sibling tables `money_change_overrides` / `money_change_events`, same shape, same append-only triggers, same token-over-a-snapshot, same two steps.
4. **Two-admin approval** sits inside the only functions that can write an override row, so it is enforced by the database for both guards. Built OFF (section e).

What "reach" touches, for tuition - one function, `tuition_month_state(student, month)`:

| The month is... | no bill row | bill issued, nothing paid | paid / part-paid (`recorded_payment > 0` or status paid/partial) | confirmed / adjusted | frozen |
|---|---|---|---|---|---|
| the current month or later | T0 | T0 | T0 | T2 | T2 |
| a past month (see grace below) | T1 if the class has a non-cancelled lesson in it, else T0 | T1 | T2 | T3 | T3 |

"Past" = earlier than the month of (now in Hanoi minus 7 days): the first week of a month still counts the month before as current, because registers and corrections for the 31st are normally done on the 1st to the 3rd. The 7 is a constant in one function (owner question 3).
Why the current month is T0 even when paid: families here pay in advance, so the current month is "paid" from its first day and every ordinary excused absence, new discount or late enrolment lands in a paid month. Guarding that would put a reason box on daily work and teach everyone to type "ok ok ok ok ok ok". An admin's explicit sign-off (confirmed, adjusted, frozen) is different and is guarded in any month.

For pay - `payroll_reach(staff, from, to)`: T3 if any month in reach is locked (`payroll_month_is_locked`); T1 if the member of staff has a Held lesson in reach dated before today; else T0.

The tier of a change is the highest tier over everything it reaches. T0: no reason, no dialog, but the UI still goes through the checked RPC so the row is written (money rule: every money-affecting admin write leaves an append-only row). T1: reason + confirm. T2: the same, and reviewed when it came from a bulk tool. T3: correction mode - second reason, always reviewed.

Lanes for every new guard: a `person` uses the checked path or is refused; `service` is refused wherever a person would need a reason (an edge function may not be the way round), except the lanes named below; `owner` (SQL editor, cron, test harness) passes, as it does in D2. No setting turns a guard off.

### b.1 Session-side guards

**G-1 Un-hold (P1, P7).** Kind `unhold` = `OLD.status = 'Held' AND NEW.status = 'Scheduled'`.
- Person: only `session_status_checked(p_session_id, 'Scheduled', ...)`. Tier by the standard rule over the EFFECTIVE level (a Held lesson is at least SOFT, so at least T2; STRONG and settled is T3). Always in the review queue when the payroll month is locked.
- Preview shows: the D1 evidence cards, "the teacher will no longer be paid for this lesson", whether the payroll month is closed, the stored bills of the children on the register (unchanged by an un-hold - said in one line), and the sentence "If the lesson did not happen, cancel it instead."
- Refused outright: un-hold of a lesson that is not Held (`bad_change`).
- Service / owner lane (stars-sync withdrawal, `normalizeFutureHeld`): allowed when the payroll month is NOT locked and (the lesson has not started, or `stars_sync_held_flips` has a row for it - i.e. the sync made it Held and is taking that back). Otherwise the trigger **keeps the lesson Held** (`NEW.status := OLD.status`), writes an `automation_refused` event and lets the rest of the statement through. It does not raise: a raise inside `stars_sync__apply_event` would abort the whole sync page and the record would be retried for ever; keeping Held is the closed direction (nothing settled changes) and is the same technique `validate_session_status_on_change` already uses. The review screen lists these events.

**G-2 Hold without a register (P2).** Kind `hold` = `OLD.status = 'Scheduled' AND NEW.status = 'Held'` AND no row of this lesson has `marked_by IS NOT NULL`.
- With a person's mark on the register the kind is NULL - the teacher's flip (`AttendanceMarking.tsx:215`), mark-attendance and the sync are untouched.
- Person without marks: `session_status_checked(..., 'Held', ...)`, T1 (reason + confirm), T3 when the payroll month is locked. Preview says "No one has taken the register for this lesson. Marking it Held pays the teacher for it."
- Service / owner: allowed (both automatic flippers write marks first).

**G-3 A lesson is born Scheduled (P2).** BEFORE INSERT on sessions: `NEW.status <> 'Scheduled'` is refused for `person` and `service` (HC023). `owner` may (restores, fixtures). There is no checked path: create it Scheduled, then take the register or use G-2.

**G-4 Teacher change on a Held lesson (P3).** Kind `reteach` = `teacher_id` changes AND `OLD.status = 'Held'`. (On a Scheduled lesson nobody has been paid yet: kind NULL, as today.)
- Person: `session_teacher_checked(p_session_id, p_new_teacher_id, ...)`. Pay-only tier: T1; T3 when the payroll month is locked. Reviewed when locked.
- Preview shows: from whom to whom, the lesson's minutes, whether the month is closed ("the closed figures do not change; the difference will show on the Payroll screen as a correction to carry forward"), evidence cards. No pay amount: the preview may not call calculate-payroll (D-review-3 F-1 ruling).
- Refused: same teacher, unknown or inactive teacher (`bad_change`).
- Service: refused (HC020). schedule-sessions only re-assigns future Scheduled lessons, so nothing legitimate is lost.

**G-5 Time edit of a Held lesson (P4).** Kind `retime` = `start_time` or `end_time` changes AND `OLD.status = 'Held'` AND the change is not a `move`.
- Person: `session_time_checked(p_session_id, p_new_start, p_new_end, ...)`; tier as G-4. Preview shows old and new minutes and "an hourly-paid teacher's pay for this lesson changes with its length".
- Service: refused (HC020). `schedule-sessions` `include-held` therefore changes no Held lesson any more; it reports each one under `attention` and calls `log_session_automation_refused`. The UI option is retired (owner question 7).

**G-6 Assistant roster on a Held lesson (P5).** BEFORE INSERT / UPDATE / DELETE on `session_participants`, rows of `participant_type = 'teaching_assistant'`, parent lesson Held, change is pay-relevant (row added or removed, `attended` or `teaching_assistant_id` changed). A cascade from a deleted lesson (parent row gone) passes.
- Free (kind NULL) while the month is open AND the lesson ended 7 days ago or less: ticking an assistant absent after class is register work, and it is already audited.
- Otherwise a person uses `session_staff_checked(p_session_id, p_staff jsonb, ...)` (the whole desired assistant list); T1, T3 when the month is locked. Service: refused. Owner: passes.

**G-7 Backdated creation (P6).** BEFORE INSERT on sessions, lesson already started (`session_has_started(NEW.date, NEW.start_time)`):
- Person: `create_session_checked(p_session jsonb, ...)`. Tier = the highest `tuition_month_state` over the children enrolled on that date (they get a billable seeded Present), minimum T1.
- Preview (`session_create_preview`) shows: the children who will be marked Present and billed, their stored bills for that month, whether the payroll month is closed, and "take the register afterwards: children who were not there must be marked, or they are charged".
- Service: allowed only when `NEW.date >= today (Hanoi)` - the rebuild inserts nothing older. Owner: passes.
- A lesson not yet started: a plain insert, as the caller (no service key), no reason.

### b.2 Evidence guards

**G-8 The evidence floor (P8, F-11; also the "tier still drops" residue of P9 / P10).**
- Table `session_evidence_floor` (one row per lesson, level only ever rises). Written by `_session_evidence_keep(session, cause)`, which is called from BEFORE UPDATE / DELETE triggers on `attendance`, `point_transactions`, `class_transcripts`, `homeworks`, `homework_submissions`, and from the sessions guard when a lesson stops being Held or is moved. It calls `session_held_evidence` WHILE THE ROW IS STILL THERE and stores that level and those families. No rule of D1 is restated: the level is D1's own answer, taken a moment earlier.
- If D1 cannot be read from inside the trigger (the caller is someone D1 refuses, or it raises), the floor is set to STRONG. Unknown is treated as the strongest.
- Only for lessons that have started (nothing before the start is evidence of teaching), and skipped when the floor is already STRONG.
- The guard: `_session_change_assess` uses `effective level = max(D1 level, floor)` for the tier, for `use_cancel` on delete, and for the automation lane ("NONE" must be the effective level). When a floor exists, "settled" is judged over EVERY child on the register, not only the billable rows (the same widening the un-cancel rule already has), so excusing the marks first does not turn T3 into T2. The floor's level and cause count are in the token.
- The preview shows the floor as its own card: "Removed since: 3 participation points (deleted 12/11 by <admin>), 1 transcript unlinked". `_session_erased_recently` also returns the floor's causes of the last 30 days, so such a cancel is always reviewed as well.
- Nothing is refused by G-8. That is deliberate: a teacher correcting a point must not meet a dialog about tuition.
- `point_transactions` gets the generic audit trigger for UPDATE and DELETE (not INSERT: volume). `class_transcripts` does NOT get the generic audit trigger - it would copy `raw_text` (children's speech) into `audit_log`; the floor's cause entry (ids, dates, who, no text) is its record.

**G-9 A register row keeps its lesson and its child (P9, F-10).** BEFORE UPDATE on attendance: `session_id` or `student_id` changed -> HC024, every lane, no checked path (nothing in the app does it; a wrong mark is corrected by marking, not by re-pointing). The F-10 residue for marks moved before D4: `_session_change_apply` adds the `student_id`s found in `_session_erased_recently` to `refresh_pairs`, so the swapped-away child's bill is refreshed and recorded with the others.

**G-10 A person's mark is changed, not deleted (P10).** BEFORE UPDATE / DELETE on attendance, `person` lane, direct statement (`pg_trigger_depth() = 1`), lesson started and not being deleted:
- DELETE of a row with `marked_by IS NOT NULL` -> HC025 `kind=delete_mark`.
- UPDATE that sets `marked_by` to NULL -> HC025 `kind=unmark`.
- No checked path. The sync's own restore (`20261028090000:571-573, 592`) runs on the service lane and is not touched; the floor (G-8) records it.

**G-11 Retroactive register edits (P11).** BEFORE INSERT / UPDATE / DELETE on attendance, `person` lane, direct statement, lesson not Canceled: the write crosses the billable line for that child (billable = Present / Absent / Late; a row appearing or disappearing counts) AND `tuition_month_state(child, lesson month)` is T1 or more -> HC025 `kind=retro_mark` unless a money acknowledgement of this transaction covers that child.
- Admin: `money_change_checked('attendance', 'set_marks', {session_id, marks:[{student_id,status}]}, ...)`, tier from the table in b.0. Preview shows each child's mark before and after, the stored bill of that month, its state (issued / paid / confirmed / frozen) and the D1 evidence of the lesson.
- Teacher: refused, with "ask an administrator" (owner question 4).
- Trigger-made writes pass (`pg_trigger_depth() > 1`): the cancel's excuse-all and the enrollment triggers are consequences of changes that are themselves guarded.
- Service lane: not refused (the sync must not be aborted). `mark-attendance` is changed so that an ADMIN's marks are written with the admin's own JWT - so the trigger binds - and a TEACHER's request is checked in the function against the same `tuition_month_state` before the service write. That teacher check is edge-level, said plainly in section (g) and in the critic section.

### b.3 Money-change guards (not lessons)

One trigger function per table, all doing the same four things: (1) work out the reach of this write; (2) ask `tuition_reach` / `payroll_reach` for the tier; (3) T0 -> pass; (4) otherwise pass only with an acknowledgement of this transaction that covers this target and this reach, else HC120.

**G-12 Enrollments (P12, P13, P14).**
- Reach: INSERT `[start_date, end_date]`; DELETE the same of the old row; UPDATE of dates only = the days that enter or leave the enrollment; UPDATE of `allowed_days`, `rate_override_vnd`, `discount_type / value / cadence` = the whole span (they are not dated). `student_id` or `class_id` changed -> refused outright (HC121): an enrollment is not re-pointed.
- Checked path `money_change_checked('enrollment', op, args, ...)` with ops `enroll`, `set_start_date`, `end` (delegates to `end_enrollment`), `set_days` (`change_enrollment_days`), `transfer` (`modify_enrollment_transfer`), `pause` (`pause_enrollment`), `set_rate`, `set_discount`, `set_terms_from` (new: split at a date and give the new part the new rate / discount, modelled on `change_enrollment_days`; owner question 5), `delete`. The existing dated RPCs are not rewritten: the checked function writes the override, sets the flag and calls them in the same transaction; called on their own they still work at T0 and are refused by the trigger above it.
- Bulk: `money_changes_checked_bulk` (50 per call, one `batch_id`), for BulkEnrollmentDateSetter.
- Preview shows: the row before and after; the months reached, each with the child's stored bill and state; how many register marks will be excused or deleted by the existing triggers; the tier and what it asks for; the sentence from D2: "These are the bills as saved now. The new bills are worked out after the change."
- Service: refused at T1+. `update-enrollment-rate` moves to the admin's JWT and this RPC. `ai_action_apply` is a person's confirmed action, so the trigger binds it: `ai_plan_check` gains a check that refuses, on the card, a plan whose reach is T1+ ("This reaches bills of months already billed. Do it from the enrolment screen, with a reason."); `ai_action_undo` lists the same refusal among its reasons. The chat function gets nothing.

**G-13 Discount assignments, referral bonuses, definitions (P15).**
- Assignments and bonuses: reach `[effective_from, effective_to]` (UPDATE: the days that change, or both windows when the definition, type or value changes). Checked ops `assign`, `set_end`, `edit`, `remove` for entity `discount_assignment` / `referral_bonus`.
- `discount_definitions`: changing a pricing column, or deleting, a definition that has any assignment whose reach is T1+ is refused outright (HC121 `definition_in_use`): make a new definition and assign it from a date. No checked path (it would need a reach over every family that ever had it).

**G-14 Class fee (P16).** BEFORE UPDATE on classes, `session_rate_vnd` changed, class has a non-cancelled lesson with a register dated before today -> person needs `money_change_checked('class_rate', 'set', {class_id, session_rate_vnd}, ...)`. The RPC computes the real reach (children with a billable mark in a past month of this class) for the preview and the tier. Preview shows the number of past bills that will re-price, how many of them are paid, confirmed or frozen, and says in words that the fee is not dated. This guard makes the re-pricing visible and reasoned; it does not stop an honest fee rise from re-pricing history. Dated class fees are the real fix and are a separate task (owner question 6).

**G-15 Pay rates (P17).** BEFORE INSERT / UPDATE / DELETE on `staff_pay_rates`: reach = from the row's `effective_from` to the day before that person's next row; tier from `payroll_reach`. T1+ needs `money_change_checked('pay_rate', 'set' | 'remove', {...})`. The RPC does a plain INSERT or UPDATE of the same-date row (no ON CONFLICT on the partial index) and writes the mirror columns on `teachers` / `teaching_assistants` in the same transaction. A person changing those mirror columns directly, for someone with a Held lesson before today, is refused without the acknowledgement (the staff row is the fallback rate when no history row exists). Preview shows months reached, which are closed, the count of Held lessons in each; no amount.

**G-16 Unfreezing a bill (P18).** BEFORE UPDATE on invoices: `tuition_frozen` true -> false. Person: `money_change_checked('invoice_freeze', 'unfreeze', {invoice_id}, ...)`, T2, T3 when the bill is paid or confirmed. Service: refused (calculate-tuition never unfreezes). Freezing stays as it is. No other invoice column is touched by D4 (section g).

**G-17 Data import (P19).** `admin-data-import` refuses `sessions`, `attendance`, `enrollments`, `discount_assignments`, `discount_definitions` once the `payments` table has a row (the school is live); a dry run still counts them. Under it the triggers already refuse the service lane at T1+ for enrollments and discounts, and D2 covers sessions.

**G-18 Deletes (P20 and class hardening).** BEFORE DELETE on students: refused for `person` and `service` when the child has any payment, any bill with `total_amount > 0` or `recorded_payment > 0`, or any mark made by a person (HC121 `student_has_history`). BEFORE DELETE on classes: refused when the class has an enrollment (sessions are already RESTRICT) (HC121 `class_has_history`). Deactivate / archive instead - what the screens already do. `ai_action_undo` only ever deletes a child nothing depends on, so it is not affected.

### b.4 Codes and messages

Reused unchanged from D2 with the same meaning, for both guards: HC010 `reason_too_short`, HC011 `token_stale`, HC012 `confirm_required`, HC013 `correction_reason_required`, HC015 (`bad_action`, `bad_change`, `bad_items`, ...), HC016 `too_many`, HC017 `own_reason_required`, HC020 `session_change_requires_checked_path` (DETAIL `kind=unhold|hold|reteach|retime|restaff|create_past; ...`), HC022 `one change at a time`, HC040 / HC041 (append-only), HC050 `guard_broken`, 42501, P0002.

New:

| SQLSTATE | SQL message | DETAIL | Function code / HTTP | Text shown to the admin (`ERROR_TEXT`) |
|---|---|---|---|---|
| HC023 | `session_born_status` | `status=<x>; a lesson is created Scheduled` | `born_status` 409 | "A lesson is created as Scheduled. Create it, then take the register - or mark it Held with a reason." |
| HC024 | `attendance_identity` | `a register row cannot be moved to another lesson or child` | `attendance_identity` 409 | "A register mark cannot be moved to another lesson or another child. Change the mark instead." |
| HC025 | `attendance_requires_checked_path` | `kind=delete_mark\|unmark\|retro_mark; tier=<n>; month=<YYYY-MM>` | `attendance_requires_checked_path` 409 | delete / unmark: "A mark made by a person is changed, not removed." retro, admin: "This lesson is in a month that is already billed. Change the mark with a reason." retro, teacher: "This month's bill is already settled. Please ask an administrator to make this change." |
| HC120 | `money_change_requires_checked_path` | `entity=<e>; tier=<n>; reach=<from>..<to>` | `money_requires_checked_path` 409 | "This change reaches months that are already billed or paid. Open it again to see what it affects, then confirm with a reason." |
| HC121 | `money_change_refused` | `code=enrollment_identity\|definition_in_use\|student_has_history\|class_has_history` | the code, 409 | identity: "An enrolment cannot be moved to another child or class. End it and start a new one." in use: "This discount is already on bills. Create a new discount and assign it from a date." student: "This child has bills, payments or a register. Deactivate instead of deleting." class: "This class has enrolments. Archive it instead." |
| HC060 | `approval_required` | `reasons=<list>` | `approval_required` 409 | "This change needs a second administrator. Send it for approval?" |
| HC061 | `self_approval` | | `self_approval` 403 | "You asked for this change, so someone else has to approve it." |
| HC062 | `request_not_pending` | `state=<approved\|rejected\|withdrawn\|stale>` | `request_not_pending` 409 | "This request has already been dealt with." |
| HC063 | `approval_already_pending` | `request=<id>` | `approval_already_pending` 409 | "A request for this is already waiting for approval." |
| HC064 | `request_expired` | | `request_expired` 410 | "This request is more than <n> days old. Ask again." |
| HC065 | `approval_setting_locked` | `code=needs_two_admins\|needs_second_admin` | same, 409 | "Approval needs at least two administrators." / "Turning approval off or loosening it needs a second administrator." |

Preview refusals (`refuse_code`, returned by the preview and raised as HC015 by the apply): `not_held`, `already_held`, `not_started`, `same_teacher`, `teacher_not_found`, `bad_change`, `not_frozen`, `not_found`, `nothing_to_change`.

<!-- END -->
