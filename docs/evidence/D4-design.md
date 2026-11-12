# D4 - other tuition-affecting actions: design

**Where I am / next step:** COMPLETE - sections (a) to (i) and the self-critique are written. Next step is not mine: the conductor reads it, the owner answers section (i) (the build does not wait: every question has a default), then step 0 of the build order in (h).

Contents: (a) open paths - (b) design per path, codes - (c) migration objects - (d) functions and screens - (e) two-admin approval - (f) test plan - (g) not guarded - (h) build order - (i) owner questions - self-critique.

Not verified, said once here: the live database (policies, triggers, grants actually deployed); whether `authenticated` can write the `stars_*` helper tables (f.4 tests it); real tuition levels behind the 5,000,000 VND default; whether the pay-rate upsert really fails with 42P10 in production (inferred from root `AGENTS.md`, not run). No SQL in this document has been executed; names, signatures and conditions are a specification, and the implementer's suites are what prove them.

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

---

## (c) Migration objects

Four files under `supabase/migrations/`, pasted in this order. Each: `BEGIN; ... COMMIT;`, a preflight `DO` block that refuses loudly and installs nothing when something it reads is missing (D2's pattern, `20261112091000:53-118`), `CREATE OR REPLACE` / `IF NOT EXISTS` / `DROP TRIGGER IF EXISTS` throughout, safe to paste twice, changes no existing row. Every new table: RLS on, `REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role`, then `GRANT SELECT ... TO authenticated` (policy: admins) and `GRANT ALL ... TO service_role` (house rule; the triggers still refuse its writes). No partial unique index is used as a conflict target anywhere; the two upserts below name a PRIMARY KEY.

### c.0 `20261113085000_d4_prelude.sql` (tiny; written first so the two big files do not depend on each other)

```sql
-- Who is writing. One definition for every D4 guard. D2's own lanes are not changed.
CREATE OR REPLACE FUNCTION public._caller_lane() RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL THEN 'person'
    WHEN NULLIF(auth.role(), '') = 'service_role' THEN 'service'
    WHEN NULLIF(auth.role(), '') IS NULL
     AND session_user::text NOT IN ('authenticator', 'authenticated', 'anon')
     AND COALESCE(NULLIF(current_setting('role', true), ''), 'none')
           NOT IN ('authenticator', 'authenticated', 'anon') THEN 'owner'
    ELSE 'unknown'            -- treated everywhere as a person with no acknowledgement
  END
$fn$;   -- the same positive test as D1's "internal" (20261112090000:249-256), split in two

-- Extension points for approvals, in the manner of session_recording_evidence:
-- created ONLY IF MISSING, so re-pasting this file never undoes c.3.
--   change_approval_needed(p_impact jsonb) RETURNS jsonb   -> '{"required": false, "reasons": []}'
--   _change_request_claim(p_request uuid, p_kind text, p_fingerprint text) RETURNS uuid
--        -> RAISE 'approvals are not installed' (55000)
```
`REVOKE ALL` on all three from every API role (they are called only from definer functions).

### c.1 `20261113090000_d4_session_guard_ext.sql` (M1)

Preflight: both D migrations present (`session_change_guard`, `session_held_evidence`, the three `zz_` triggers enabled), `_caller_lane`, `audit_row_change`, `stars_sync_held_flips`, every column read below.

**Table changes**
```sql
ALTER TABLE public.session_cancel_overrides
  DROP CONSTRAINT IF EXISTS session_cancel_overrides_action_check;
ALTER TABLE public.session_cancel_overrides
  ADD CONSTRAINT session_cancel_overrides_action_check CHECK (action IN
    ('cancel','delete','move','uncancel','unhold','hold','reteach','retime','restaff','create'));
ALTER TABLE public.session_cancel_overrides
  ADD COLUMN IF NOT EXISTS approval_request_id uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid;          -- both NULL unless c.3 is on

CREATE TABLE IF NOT EXISTS public.session_evidence_floor (
  session_id uuid PRIMARY KEY,                 -- no FK: outlives nothing, but must never block a delete
  level      text NOT NULL CHECK (level IN ('SOFT','STRONG')),
  families   jsonb NOT NULL,                   -- D1's families at capture, OR-ed over captures
  first_at   timestamptz NOT NULL DEFAULT now(),
  last_at    timestamptz NOT NULL DEFAULT now(),
  causes     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- newest 20: {at, table, op, row_id, actor_user_id, lane, summary}
  CONSTRAINT session_evidence_floor_causes_size CHECK (pg_column_size(causes) < 32768)
);
-- trigger session_evidence_floor_monotonic BEFORE UPDATE OR DELETE: refuse DELETE; refuse an UPDATE that
--   lowers level or changes session_id (HC040). BEFORE INSERT/UPDATE: only the table owner (the definer
--   functions) may write - the body of session_cancel_audit_insert_guard, reused as is.
-- BEFORE TRUNCATE: session_cancel_audit_append_only (reused).
```

**The floor writer**
```sql
CREATE OR REPLACE FUNCTION public._session_evidence_keep(p_session_id uuid, p_cause jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
-- 1. session row; not found or NOT session_has_started(date, start_time) -> RETURN.
-- 2. existing floor row with level 'STRONG' -> append the cause only, RETURN (no D1 call).
-- 3. once per session per transaction: skip when p_session_id is already in the
--    transaction-local list hec.floor_seen (set_config(..., true)); the cancel's excuse-all
--    touches every row of a register and must cost one D1 call, not thirty.
-- 4. BEGIN v := public.session_held_evidence(p_session_id);
--          v_level := v ->> 'level'; v_fam := v -> 'families';
--    EXCEPTION WHEN OTHERS THEN v_level := 'STRONG'; v_fam := '{"unknown": true}';   -- cannot read = strongest
--    END;
-- 5. v_level = 'NONE' -> RETURN.
-- 6. INSERT ... ON CONFLICT (session_id) DO UPDATE
--      SET level = CASE WHEN floor.level = 'STRONG' OR EXCLUDED.level = 'STRONG' THEN 'STRONG' ELSE 'SOFT' END,
--          families = floor.families || <true keys of EXCLUDED.families>, last_at = now(),
--          causes = <cause prepended, cut to 20>;
$fn$;
```
Callers (all `BEFORE`, `FOR EACH ROW`, SECURITY DEFINER, named `zz_...` so they run after the existing guards and see the final row):

| Trigger | On | Fires the keep when | Lessons it keeps for |
|---|---|---|---|
| `zz_attendance_evidence_guard` | attendance UPDATE, DELETE | `OLD.marked_by IS NOT NULL` and (DELETE, or status / marked_by changed) | `OLD.session_id` |
| `zz_point_evidence_keep` | point_transactions UPDATE, DELETE | `OLD.type IN ('participation','correction') AND OLD.points > 0` and (DELETE, or any of `class_id, date, session_id, type, points, created_by, student_id, created_at` changed) | `OLD.session_id` if set, plus every lesson of `OLD.class_id` on `OLD.date` |
| `zz_transcript_evidence_keep` | class_transcripts UPDATE, DELETE | DELETE, or any of `class_id, session_id, transcript_date, status, audio_storage_path, audio_duration_seconds, uploaded_by, created_at` changed | `OLD.session_id` if set, plus every lesson of `OLD.class_id` on `OLD.transcript_date` and on the Hanoi day of `OLD.created_at` |
| `zz_homework_evidence_keep` | homeworks UPDATE, DELETE; homework_submissions UPDATE, DELETE | homeworks: DELETE or `class_id, created_at, created_by, due_date` changed; submissions: DELETE or `graded_at` set to NULL or `homework_id / student_id` changed | every lesson of the homework's class on the Hanoi day of its `created_at` and on its `due_date` |
| (inside `session_change_guard`) | sessions UPDATE | kind is `unhold`, `cancel`, `move` or `delete` | `OLD.id` |

Over-inclusion is harmless: the level stored is D1's answer for that lesson, so a lesson the row was not evidence for stores nothing it did not already have. Also `audit_point_transactions AFTER UPDATE OR DELETE ... audit_row_change()`.

`zz_attendance_evidence_guard` also carries G-9 and G-10:
```sql
IF TG_OP = 'UPDATE' AND (OLD.session_id IS DISTINCT FROM NEW.session_id
                      OR OLD.student_id IS DISTINCT FROM NEW.student_id) THEN
  RAISE EXCEPTION 'attendance_identity' USING ERRCODE = 'HC024', DETAIL = '...';     -- every lane
END IF;
-- keep (table above)
IF public._caller_lane() IN ('person','unknown') AND pg_trigger_depth() = 1
   AND OLD.marked_by IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = OLD.session_id       -- parent gone = cascade
                AND public.session_has_started(s.date, s.start_time)) THEN
  IF TG_OP = 'DELETE' THEN RAISE ... 'HC025', DETAIL = 'kind=delete_mark'; END IF;
  IF NEW.marked_by IS NULL THEN RAISE ... 'HC025', DETAIL = 'kind=unmark'; END IF;
END IF;
```

**`session_change_kind(o, n)` - replaced, same signature.** The four existing tests are untouched; added after them:
```sql
IF o.status = 'Held' AND n.status = 'Scheduled' THEN v_kinds := v_kinds || 'unhold'; END IF;
IF o.status = 'Scheduled' AND n.status = 'Held'
   AND (NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = o.id AND a.marked_by IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.session_cancel_overrides v          -- a lesson a person un-held is
                    WHERE v.session_id = o.id AND v.action = 'unhold'))     -- re-held with a reason too
THEN v_kinds := v_kinds || 'hold'; END IF;
IF o.status = 'Held' AND o.teacher_id IS DISTINCT FROM n.teacher_id THEN v_kinds := v_kinds || 'reteach'; END IF;
IF o.status = 'Held' AND NOT ('move' = ANY (v_kinds))
   AND (o.start_time IS DISTINCT FROM n.start_time OR o.end_time IS DISTINCT FROM n.end_time)
THEN v_kinds := v_kinds || 'retime'; END IF;
-- more than one kind -> HC022, as today (so an un-hold cannot carry a teacher change with it)
```
The UPDATE trigger is re-created with two more columns in its WHEN clause: `OR OLD.end_time IS DISTINCT FROM NEW.end_time OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id`.

**`session_change_guard()` - replaced.** Everything for `cancel / uncancel / reclass / move / delete / id change` stays byte-for-byte in behaviour. Added:
- first, for kinds `unhold, cancel, move, delete`: `PERFORM public._session_evidence_keep(OLD.id, <cause>)`.
- acknowledged lane, new checks: `unhold` -> `NEW.status = 'Scheduled'`; `hold` -> `NEW.status = 'Held'`; `reteach` -> `NEW.teacher_id = (o.change ->> 'new_teacher_id')::uuid`; `retime` -> new times equal `o.change`.
- unacknowledged lane, new kinds, by `_caller_lane()`:

| kind | person / unknown | service | owner |
|---|---|---|---|
| unhold | HC020 | allowed iff `NOT payroll_month_is_locked(month)` AND (`NOT session_has_started(...)` OR a `stars_sync_held_flips` row exists); else `NEW.status := OLD.status`, one `automation_refused` event (`payload: {session_id, source: 'unhold', lane}`), `RETURN NEW` | same rule as service |
| hold | HC020 | allowed | allowed |
| reteach, retime | HC020 | HC020 | allowed |

- the automation lane for D2's `delete / reclass / move` reads the EFFECTIVE level (`session_evidence_floor` row present -> not NONE).

**`_session_change_assess(s, p_action, p_change, p_uid)` - replaced, same signature.** Additions only:
```sql
v_floor := (SELECT to_jsonb(f) FROM public.session_evidence_floor f WHERE f.session_id = s.id);
v_level_now := v_ev ->> 'level';
v_level := CASE WHEN 'STRONG' IN (v_level_now, v_floor ->> 'level') THEN 'STRONG'
                WHEN 'SOFT'   IN (v_level_now, v_floor ->> 'level') THEN 'SOFT' ELSE 'NONE' END;
IF v_floor IS NOT NULL THEN        -- settled over every child on the register, not only billable rows
  v_settled_src := v_settled_src OR EXISTS (<the settled test of session_month_tuition_settled,
                                             without its status filter, for v_src_month>);
END IF;
-- new actions:
--  'unhold'  refuse 'not_held' unless s.status = 'Held';     tier := session_change_tier(started, v_level, v_settled)
--  'hold'    refuse 'already_held' / 'not_started';          tier := CASE WHEN locked THEN 3 ELSE 1 END
--  'reteach' p_change {teacher_id}; refuse 'not_held', 'same_teacher', 'teacher_not_found';   pay tier as 'hold'
--  'retime'  p_change {start_time, end_time}; refuse 'not_held', 'bad_change' (end <= start, or it is a move);  pay tier
--  'restaff' p_change {staff:[{teaching_assistant_id, attended, absence_note}]}; refuse 'not_held', 'bad_change'; pay tier
--  where locked := (v_ev -> 'settled' ->> 'payroll_month_locked')::boolean, NULL read as true.
-- token: version 3; adds v_level_now, v_floor ->> 'level', jsonb_array_length(v_floor -> 'causes').
-- output adds: 'level_now', 'floor', 'fingerprint' (the token's hash WITHOUT p_uid), and
-- 'impact': {tier, closed_payroll, families, paid_vnd, signed_or_frozen}  -- stored figures only:
--    families = distinct students.family_id over invoices_before rows that are paid / signed / frozen;
--    paid_vnd = sum(recorded_payment) over the same rows.
```
`_session_review_required` gains: `unhold / hold / reteach / retime / restaff` are reviewed when `tier = 3`; `unhold` also by the existing STRONG rule. `_session_erased_recently` gains a fourth branch: the floor's `causes` of the last 30 days as `{what: 'points' | 'transcript' | 'homework', ...}`.

**`_session_change_apply` - replaced; one more parameter, `p_request uuid` (the old 11-argument function is dropped in this file).** Changes:
- action list extended; reason, lock, assess, token, confirm, correction reason exactly as today (confirm is required at T1+ for the new kinds).
- approval hook after the token check (c.3 makes it real; with the prelude stub it never fires):
```sql
v_need := public.change_approval_needed(a -> 'impact');
IF COALESCE((v_need ->> 'required')::boolean, true) THEN            -- NULL = required
  IF p_request IS NULL THEN
    RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060', DETAIL = 'reasons=' || (v_need ->> 'reasons');
  END IF;
  v_actor := public._change_request_claim(p_request, 'session', a ->> 'fingerprint');   -- the requester
  v_approver := v_uid;
END IF;
```
- the row stores `actor_user_id = COALESCE(v_actor, v_uid)`, `approved_by`, `approval_request_id`; `refresh_pairs` gains the pairs of children named in `v_erased` (G-9 residue).
- writes: `unhold` / `hold` -> `UPDATE sessions SET status = ..., updated_by`; `reteach` -> `teacher_id`, `is_manual = true`, `manual_reason = v_reason`; `retime` -> times; `restaff` -> replace the lesson's teaching-assistant rows with `p_change.staff`, then clear the flag itself and check `pg_trigger` for `zz_session_staff_guard` enabled (HC050 if not) - the roster trigger reads the flag without consuming it because one change is several rows.

**New RPCs (admin JWT only; `GRANT EXECUTE ... TO authenticated`, not service_role)**
```sql
session_status_checked (p_session_id uuid, p_to text, p_reason text, p_token text,
                        p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}')
session_teacher_checked(p_session_id uuid, p_new_teacher_id uuid, p_reason text, p_token text, p_confirm ..., p_correction_reason ..., p_context ...)
session_time_checked   (p_session_id uuid, p_new_start time, p_new_end time, p_reason text, p_token text, ...)
session_staff_checked  (p_session_id uuid, p_staff jsonb, p_reason text, p_token text, ...)
session_create_preview (p_session jsonb) RETURNS jsonb          -- STABLE
create_session_checked (p_session jsonb, p_reason text, p_token text, p_confirm ..., p_correction_reason ..., p_context ...)
```
`session_change_preview(p_session_id, p_action, p_change)` keeps its signature and accepts the five new actions. `create_session_checked` does not go through `_session_change_apply` (there is no row to lock): it validates class and teacher, forces `status = 'Scheduled'`, takes `pg_advisory_xact_lock(hashtextextended('session-create:' || class_id || ':' || date || ':' || start_time, 0))`, plans (enrolled children on that date via `student_enrolled_on`, their `tuition_month_state` when M2 is installed - else every child is read as T2, fail closed - stored bills, token), runs the approval hook, generates the id, writes the override (`action = 'create'`, `session_before = '{}'`, `level = 'NONE'`), sets the flag, inserts, and raises HC050 if the flag is still set.

**New triggers on sessions and session_participants**
```sql
CREATE TRIGGER zz_session_insert_guard BEFORE INSERT ON public.sessions FOR EACH ROW
  EXECUTE FUNCTION public.session_insert_guard();
-- lane := _caller_lane()
-- NEW.status <> 'Scheduled' AND lane <> 'owner'                      -> HC023
-- session_has_started(NEW.date, NEW.start_time):
--    owner -> pass;  service -> pass iff NEW.date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date else HC020 kind=create_past
--    person/unknown -> flag names an override of this txid with action 'create' AND session_id = NEW.id
--                      AND (session_before is '{}') -> consume, pass; else HC020 kind=create_past

CREATE TRIGGER zz_session_staff_guard BEFORE INSERT OR UPDATE OR DELETE ON public.session_participants
  FOR EACH ROW EXECUTE FUNCTION public.session_staff_guard();
-- row is participant_type 'teaching_assistant'; parent lesson exists and is Held; pay-relevant change;
-- NOT (month open AND lesson ended <= 7 days ago);  then:
--    owner -> pass;  flag names a 'restaff' override of this txid for the parent lesson -> pass (not consumed)
--    else HC020 kind=restaff
```
`session_cancel_guard_status()` also reports the two new sessions triggers, the roster trigger, the four keep triggers and the floor table (`ok` requires all). `session_cancel_tuition_pending` adds `'create'` to its action list (a backdated lesson bills children).

### c.2 `20261113091000_d4_money_change_guard.sql` (M2)

Preflight: `_caller_lane`, `session_change_reason_ok`, `session_cancel_audit_append_only`, `session_cancel_audit_insert_guard` (reused), `payroll_month_is_locked`, `student_enrolled_on`, every table and column read.

**Tables**
```sql
CREATE TABLE IF NOT EXISTS public.money_change_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  txid bigint NOT NULL DEFAULT txid_current(),
  actor_user_id uuid NOT NULL,
  approved_by uuid, approval_request_id uuid,
  entity text NOT NULL CHECK (entity IN ('enrollment','discount_assignment','referral_bonus','class_rate',
                                         'pay_rate','invoice_freeze','attendance')),
  op text NOT NULL,
  target_id uuid NOT NULL,                 -- enrollment / assignment / bonus / class / staff / invoice / session id
  student_ids uuid[] NOT NULL DEFAULT '{}',
  reach_from date, reach_to date,          -- NULL = open on that side
  via text NOT NULL CHECK (via IN ('single','bulk')), batch_id uuid,
  tier int NOT NULL CHECK (tier BETWEEN 0 AND 3),
  correction_mode boolean NOT NULL,
  reason text, correction_reason text, confirmed boolean NOT NULL, token text NOT NULL,
  row_before jsonb NOT NULL, change jsonb NOT NULL,
  reach jsonb NOT NULL,                    -- [{student_id, month, past, state, tier, invoice_id}] / [{month, locked, held}]
  invoices_before jsonb NOT NULL, refresh_pairs jsonb NOT NULL,
  review_required boolean NOT NULL, attached jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT money_change_overrides_reason CHECK (tier = 0 OR reason IS NOT NULL),
  CONSTRAINT money_change_overrides_correction CHECK (correction_mode = (tier = 3)
                                                      AND (NOT correction_mode OR correction_reason IS NOT NULL)),
  CONSTRAINT money_change_overrides_attached_size CHECK (pg_column_size(attached) < 131072)
);
CREATE TABLE IF NOT EXISTS public.money_change_events (            -- as session_cancel_override_events
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
  override_id uuid REFERENCES public.money_change_overrides(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  kind text NOT NULL CHECK (kind IN ('guard_installed','tuition_refreshed','tuition_refresh_failed','reviewed','automation_refused')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT money_change_events_payload_size CHECK (pg_column_size(payload) < 262144)
);
-- indexes: (entity, target_id, created_at DESC), (created_at DESC), (batch_id) , (review_required, created_at DESC);
-- the three triggers per table that D2 puts on its audit tables (append-only, no truncate, insert guard).
```

**The reach functions (STABLE, SECURITY DEFINER, granted to nobody)**
```sql
tuition_month_state(p_student uuid, p_month text) RETURNS jsonb
  -- past  := p_month < to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh') - interval '7 days', 'YYYY-MM')
  -- state := 'frozen'  if tuition_frozen
  --          'signed'  if confirmation_status IN ('confirmed','adjusted')
  --          'paid'    if COALESCE(recorded_payment,0) > 0 OR status::text IN ('paid','partial')
  --          'issued'  if a row exists;  'none' otherwise
  -- tier  := the table in b.0; for 'none' in a past month: 1 iff the child has an enrollment whose class has a
  --          non-cancelled lesson in that month, else 0.  Any error -> tier 3 (the caller treats NULL as 3).
tuition_reach(p_student uuid, p_class uuid, p_from date, p_to date) RETURNS jsonb
  -- months := every month from p_from (NULL = the child's earliest enrollment start) to
  --           GREATEST(COALESCE(p_to, current month end), last month that has an invoice row for the child)
  --           that is past, or has an invoice row;   p_class NULL = any class
  -- returns {tier (max), months:[tuition_month_state...], invoices_before:[<the 16 fields D2 copies>],
  --          refresh_pairs:[{student_id, month}], fp (md5 over the 8 bill fields D2's token covers + states)}
payroll_reach(p_teacher uuid, p_assistant uuid, p_from date, p_to date) RETURNS jsonb
  -- months from p_from to LEAST(COALESCE(p_to, today), today) in which this person has a Held lesson
  -- (sessions.teacher_id, or a payable teaching-assistant row); {tier: 3 if any locked, 1 if any Held before today, else 0, months:[...]}
```

**Acknowledgement test, one function used by every money trigger**
```sql
_money_ack(p_entities text[], p_target uuid, p_student uuid, p_from date, p_to date) RETURNS boolean
  -- v := NULLIF(current_setting('hec.money_change_ack', true), '');  NULL -> false
  -- EXISTS (SELECT 1 FROM money_change_overrides o WHERE o.id::text = v AND o.txid = txid_current()
  --           AND o.entity = ANY (p_entities)
  --           AND (p_target  IS NULL OR o.target_id = p_target OR p_student = ANY (o.student_ids))
  --           AND (p_student IS NULL OR p_student = ANY (o.student_ids))
  --           AND (o.reach_from IS NULL OR p_from >= o.reach_from)
  --           AND (o.reach_to   IS NULL OR (p_to IS NOT NULL AND p_to <= o.reach_to)))
  -- Not consumed: one checked change may write several rows (a weekday split ends one enrollment and starts
  -- another and deletes placeholder marks). The flag is transaction-local and the row is tied to the txid.
```

**Triggers (all BEFORE, FOR EACH ROW, SECURITY DEFINER, `zz_` names)**

| Trigger / function | On | Guarded when | Passes when |
|---|---|---|---|
| `zz_enrollment_money_guard` / `enrollment_money_guard()` | enrollments I, U, D | U with `student_id` or `class_id` changed -> HC121 `enrollment_identity` (all lanes but owner). Otherwise reach as G-12 and `tuition_reach(student, class, from, to).tier >= 1` | owner; `_money_ack(ARRAY['enrollment'], row id, student, from, to)`; else HC120 |
| `zz_discount_money_guard` / `discount_money_guard()` | discount_assignments, referral_bonuses I, U, D | `tuition_reach(student, NULL, from, to).tier >= 1` | owner; ack for that entity |
| `zz_discount_definition_guard` | discount_definitions U (type, value, cadence, any pricing column), D | an assignment of it has reach tier >= 1 | owner only; else HC121 `definition_in_use` |
| `zz_class_money_guard` / `class_money_guard()` | classes U of `session_rate_vnd`; D | U: the class has a non-cancelled lesson before today with any register row. D: an enrollment exists -> HC121 `class_has_history` | owner; U with ack `class_rate` for this class |
| `zz_pay_rate_money_guard` | staff_pay_rates I, U, D | `payroll_reach(staff, effective_from, next row's effective_from - 1).tier >= 1` (U: both old and new rows) | owner; ack `pay_rate` for this staff id |
| `zz_staff_pay_mirror_guard` | teachers, teaching_assistants U of `pay_rate_type, hourly_rate_vnd, per_session_rate_vnd` | `payroll_reach(staff, '1900-01-01', today).tier >= 1` | owner; ack `pay_rate` for this staff id |
| `zz_invoice_unfreeze_guard` | invoices U, `OLD.tuition_frozen AND NOT COALESCE(NEW.tuition_frozen, false)` | always | owner; ack `invoice_freeze` for this invoice |
| `zz_attendance_money_guard` / `attendance_money_guard()` | attendance I, U, D | lane person / unknown, `pg_trigger_depth() = 1`, parent lesson exists and is not Canceled, billable(OLD) <> billable(NEW) (a missing row is not billable), `tuition_month_state(student, lesson month).tier >= 1` | `_money_ack(ARRAY['attendance','enrollment'], NULL, student, lesson date, lesson date)`; else HC025 `kind=retro_mark` |
| `zz_student_delete_guard` | students D | a payment, a bill with `total_amount > 0` or `recorded_payment > 0`, or a mark with `marked_by IS NOT NULL` | owner only; else HC121 `student_has_history` |

In every row "service" is refused exactly where a person without an acknowledgement is, and each such refusal on the service lane also writes a `money_change_events` row of kind `automation_refused` from an autonomous-free path: the trigger cannot insert and then raise, so the event is written by the edge function that received the error (`guarded-change-refresh` action `log-refused`, service role only) - same split as `log_session_automation_refused`.

**The checked path**
```sql
money_change_preview(p_entity text, p_op text, p_args jsonb) RETURNS jsonb      -- STABLE, admin only
money_change_checked(p_entity text, p_op text, p_args jsonb, p_reason text DEFAULT NULL, p_token text DEFAULT NULL,
                     p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL,
                     p_context jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
money_changes_checked_bulk(p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb DEFAULT '{}') RETURNS jsonb
     -- <= 50 items {entity, op, args, token, confirm, reason, correction_reason}; ascending target id;
     -- per-item refusals collected exactly as cancel_sessions_checked_bulk does (HC010-HC017, HC060, HC120, HC121, P0002)
record_money_change_event(p_override_id uuid, p_kind text, p_payload jsonb DEFAULT '{}') RETURNS uuid
money_change_guard_status() RETURNS jsonb
change_enrollment_terms(p_enrollment_id uuid, p_terms jsonb, p_effective_date date) RETURNS jsonb   -- G-12 set_terms_from
attendance_change_allowed(p_session_id uuid, p_marks jsonb) RETURNS jsonb
     -- STABLE. Caller: admin, or is_teacher_of_class for the lesson's class (else 42501). Answers only
     -- {allowed, refused:[{student_id}]}: a mark that crosses the billable line in a month whose
     -- tuition_month_state tier >= 1. No bill state is returned (a teacher may not learn it; D-review-1 A-1).
log_money_automation_refused(p_entity text, p_target uuid, p_source text) RETURNS uuid
     -- service_role only (auth.uid() must be NULL), insert-only, decides nothing; twin of log_session_automation_refused.
-- internal, granted to nobody:
_money_change_plan (p_entity text, p_op text, p_args jsonb, p_uid uuid) RETURNS jsonb     -- STABLE
_money_change_apply(p_entity text, p_op text, p_args jsonb, p_reason text, p_token text, p_confirm boolean,
                    p_correction_reason text, p_context jsonb, p_via text, p_batch_id uuid, p_request uuid) RETURNS jsonb
```
`_money_change_plan` is the one place that knows what an (entity, op) means. It returns `{entity, op, target_id, student_ids, row_before, change, reach_from, reach_to, reach, tier, allowed, refuse_code, requires:{reason_min:15 or 0, confirm: tier>=1, correction_reason: tier=3}, invoices_before, refresh_pairs, marks:{excused, deleted}, impact, review_required, token, fingerprint}`. `token = sha256([1, entity, op, <args, keys sorted>, p_uid, tier, md5(row_before), reach.fp])`; `fingerprint` is the same without `p_uid`.

Supported (entity, op) and what the apply does:

| entity | op | args | write |
|---|---|---|---|
| enrollment | `enroll` | student_id, class_id, start_date, end_date?, allowed_days?, rate_override_vnd?, discount_* ? | INSERT |
| | `set_start_date` | enrollment_id, start_date | UPDATE start_date |
| | `end` | student_id, class_id, end_date | `end_enrollment(...)` |
| | `set_days` | enrollment_id, allowed_days, effective_date | `change_enrollment_days(...)` |
| | `transfer` | student_id, old_class_id, new_class_id, effective_date | `modify_enrollment_transfer(...)` |
| | `pause` | the arguments of `pause_enrollment` | `pause_enrollment(...)` |
| | `set_rate` | enrollment_id, rate_override_vnd | UPDATE (whole span) |
| | `set_discount` | enrollment_id, discount_type, discount_value, discount_cadence | UPDATE (whole span) |
| | `set_terms_from` | enrollment_id, effective_date, terms{rate_override_vnd, discount_*} | `change_enrollment_terms(...)` |
| | `delete` | enrollment_id | DELETE |
| discount_assignment / referral_bonus | `assign`, `set_end`, `edit`, `remove` | the row's columns | INSERT / UPDATE / DELETE |
| class_rate | `set` | class_id, session_rate_vnd | UPDATE classes |
| pay_rate | `set` | teacher_id or assistant_id, effective_from, pay_rate_type, rate, note | INSERT, or UPDATE of the same-date row; then the mirror columns |
| | `remove` | rate row id | DELETE (never the last row of a person) |
| invoice_freeze | `unfreeze` | invoice_id | UPDATE tuition_frozen = false |
| attendance | `set_marks` | session_id, marks[{student_id, status}] (<= 60) | UPDATE / INSERT each mark with `marked_by = actor`, `marked_at = now()` |

`_money_change_apply` order: admin check -> reason (required when the plan's tier >= 1; NULL allowed at T0) -> `pg_advisory_xact_lock(hashtextextended('money:' || entity || ':' || target, 0))` -> row locks (`attendance`: the session row first, D2's order; others: the target rows by ascending id) -> plan -> refuse codes (HC015) -> token (T1+: must match, HC011; T0: may be NULL) -> confirm (HC012) -> correction reason (HC013) -> approval hook (as in c.1, kind `'money'`) -> INSERT override -> `set_config('hec.money_change_ack', id, true)` -> the write -> `set_config(..., '', true)` -> check in `pg_trigger` that the entity's guard trigger exists and is enabled, else HC050 -> return `{override_id, entity, op, tier, review_required, refresh_pairs}`.
`review_required := tier = 3 OR (tier = 2 AND via = 'bulk') OR <reach has a locked payroll month>`.

Views `money_change_review_queue`, `money_change_tuition_pending` (security_invoker), mirroring D2's two.

Also in this file: `audit_families AFTER INSERT OR UPDATE OR DELETE ON public.families ... audit_row_change()` (the sibling override lives there and the table is not in the audit list of `20261009130000:150-154`); and the first `money_change_events` row, kind `guard_installed`.

`ai_plan_check` (`20261107090000`) is re-created in this file with one added check per enrol / discount step: `tuition_reach(...)` tier >= 1 -> the step is refused on the card with code `needs_reason_path`. It is STABLE and stays STABLE (both reach functions are STABLE).

### c.3 `20261113092000_d4_change_approvals.sql` (M3)

Preflight: c.0, c.1 and c.2 present.

```sql
CREATE TABLE IF NOT EXISTS public.change_approval_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),           -- one row
  enabled boolean NOT NULL DEFAULT false,
  on_tier3 boolean NOT NULL DEFAULT true,
  on_closed_payroll boolean NOT NULL DEFAULT true,
  on_unfreeze boolean NOT NULL DEFAULT true,
  min_families int NOT NULL DEFAULT 3 CHECK (min_families >= 1),
  min_paid_vnd bigint NOT NULL DEFAULT 5000000 CHECK (min_paid_vnd >= 0),
  expiry_hours int NOT NULL DEFAULT 168 CHECK (expiry_hours BETWEEN 1 AND 720),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
INSERT INTO public.change_approval_settings DEFAULT VALUES ON CONFLICT (id) DO NOTHING;
-- BEFORE INSERT/UPDATE/DELETE trigger: only the owner lane or the definer functions of this file.

CREATE TABLE IF NOT EXISTS public.change_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('session','money','settings')),
  rpc text NOT NULL,                    -- which checked function this will run
  params jsonb NOT NULL,                -- its exact arguments, reason and correction reason included, token excluded
  target_key text NOT NULL,             -- 'session:<id>' | 'money:<entity>:<target>' | 'settings'
  impact jsonb NOT NULL, reasons jsonb NOT NULL, preview jsonb NOT NULL,   -- what the requester was shown
  fingerprint text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.change_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
  txid bigint NOT NULL DEFAULT txid_current(),
  request_id uuid NOT NULL REFERENCES public.change_approval_requests(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('requested','approved','rejected','withdrawn','stale','applied')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
-- both append-only with the insert guard, as the override tables. A request's state is its newest event;
-- "expired" is derived (pending AND now() > expires_at), never written.
CREATE OR REPLACE VIEW public.change_approval_queue WITH (security_invoker = true) AS ...  -- request + state + age
```
Functions:
```sql
change_approval_needed(p_impact jsonb) RETURNS jsonb          -- REPLACES the prelude stub. STABLE.
  -- s := the settings row.  NOT s.enabled -> {required:false}.   reasons := the true ones of:
  --   'tier3'           s.on_tier3 AND (p_impact ->> 'tier')::int = 3
  --   'closed_payroll'  s.on_closed_payroll AND (p_impact ->> 'closed_payroll')::boolean
  --   'unfreeze'        s.on_unfreeze AND (p_impact ->> 'unfreeze')::boolean
  --   'families'        (p_impact ->> 'families')::int >= s.min_families
  --   'paid'            (p_impact ->> 'paid_vnd')::numeric >= s.min_paid_vnd AND s.min_paid_vnd > 0
  --   'settings'        (p_impact ->> 'settings_loosen')::boolean
  -- a missing or unreadable impact field counts as true (fail closed). required := reasons not empty.
_change_request_claim(p_request uuid, p_kind text, p_fingerprint text) RETURNS uuid   -- REPLACES the stub
  -- passes only when current_setting('hec.change_request_ok', true) = p_request::text AND an 'approved' event
  -- of this request has txid = txid_current() AND the request's kind = p_kind AND fingerprint = p_fingerprint.
  -- returns requested_by. Anything else: 42501.
request_change_approval(p_kind text, p_rpc text, p_params jsonb, p_token text) RETURNS jsonb
approval_request_preview(p_request_id uuid) RETURNS jsonb     -- STABLE
approve_change_request(p_request_id uuid, p_token text, p_note text DEFAULT NULL) RETURNS jsonb
reject_change_request(p_request_id uuid, p_note text) RETURNS jsonb
withdraw_change_request(p_request_id uuid) RETURNS jsonb
set_change_approval_settings(p_patch jsonb, p_reason text) RETURNS jsonb
change_approval_status() RETURNS jsonb     -- {enabled, admins, single_admin, pending, expired, settings}
```
Their rules are section (e). One more trigger, active only while `enabled`: `zz_admin_grant_guard BEFORE INSERT OR UPDATE ON public.user_roles` - a row with `role = 'admin'` written on the person or service lane without a claimed request is refused with HC060 (otherwise an admin makes a second login and approves themselves).

---

## (d) Edge-function and `src` changes, file by file

Rules for all of it (D2's, unchanged): a person-initiated write to a guarded table goes through the caller's own client (`callerClient`), never the service key; a guarded change is `preview` -> confirm with the token; a missing RPC answers `503 guard_not_installed` and writes nothing, no fallback; after a committed change an exception in the after-work is not reported as a failed change.

### Edge functions

**`supabase/functions/_lib/session-guard.ts`** (track A)
- `SQLSTATE`: add HC023 `[409,'born_status']`, HC024 `[409,'attendance_identity']`, HC025 `[409,'attendance_requires_checked_path']`, HC060 `[409,'approval_required']`, HC061 `[403,'self_approval']`, HC062 `[409,'request_not_pending']`, HC063 `[409,'approval_already_pending']`, HC064 `[410,'request_expired']`, HC065 `[409,'approval_setting_locked']`, HC120 `[409,'money_requires_checked_path']`, HC121 `[409,'money_refused']` with the texts of b.4. For HC025, HC120, HC121 and HC060 the DETAIL is passed through (`kind`, `tier`, `code`, `reasons`).
- `HC015` map: add `not_held`, `already_held`, `not_started`, `same_teacher`, `teacher_not_found`, `not_frozen`, `nothing_to_change`, `approval_not_needed` (all 409 except `teacher_not_found` 404).
- `preview()` accepts the ops `unhold | hold | reteach | retime | restaff`; new `previewCreate(asCaller, session)` calling `session_create_preview`.
- `storedConsequences()` passes `floor`, `level_now` and `impact` through unchanged; adds `approval: {required, reasons}` read from the preview.

**`supabase/functions/_lib/money-guard.ts`** (new, track B; imports only from `session-guard.ts`): `moneyPreview`, `moneyConfirm`, `refreshMoneyChange(service, asCaller, overrideId)` (reads `refresh_pairs` of a `money_change_overrides` row as the caller, runs `refreshPairs`, records `record_money_change_event`).

**`supabase/functions/manage-session/index.ts`** (track A)
- `preview`: ops list becomes `cancel, delete, move, uncancel, unhold, hold, reteach, retime, restaff`; `op: 'create'` takes `data.session` and calls `previewCreate`.
- `change-status` (`:242-250`): the plain update is removed. Held -> Scheduled: `readAck()` then `confirmed('unhold', id, 'session_status_checked', {p_to: 'Scheduled', ...})`. Scheduled -> Held: call `preview(asCaller, id, 'hold')`; `kind === null` (a person's mark exists) -> plain update as the caller, as today; else `readAck()` and `session_status_checked` with `p_to: 'Held'`.
- `update` (`:289-327`): `status` is no longer written at all (a status in the body that differs from the lesson's -> `409 requires_checked_path, use_action: 'change-status'`). A `teacher_id` that differs on a Held lesson -> `409 requires_checked_path, use_action: 'set-teacher'`. Notes, `rate_override_vnd`, `is_manual`, and the teacher of a lesson that is not Held stay a plain update as the caller.
- new actions `set-teacher` (`session_teacher_checked`), `set-time` (`session_time_checked`), `set-staff` (`session_staff_checked`), each `readAck()` + `confirmed(...)`.
- `move` (`:262-273`): when the preview's `kind` is null and the lesson is Held and a time differs, re-preview as `retime` and require the token (no more silent `plain_update` on a Held lesson). Scheduled lessons keep `plain_update`.
- `create` (`:427-453`): `status` from the caller is ignored (always Scheduled; a body asking for another status -> `409 born_status`). Not started: `asCaller.from('sessions').insert(...)` - the service key leaves this action. Started: `readAck()` then `create_session_checked`; then the standard tuition refresh over the returned `refresh_pairs`.
- `refresh-tuition`: unchanged.
- Every `confirmed(...)` maps HC060 to `409 approval_required` with `{reasons, can_request: true}`; new action `request-approval` forwards to `request_change_approval` with the same body the confirm had. (Approve / reject / withdraw are called by the UI directly as RPCs; they need no function.)

**`supabase/functions/bulk-cancel-sessions/index.ts`** (track A): nothing but the code map; a lesson refused with HC060 comes back in `refused` with `code: 'approval_required'`.

**`supabase/functions/mark-attendance/index.ts`** (track A)
- The caller is an admin: the attendance upsert (`:160-162`) and the Held flip (`:174-178`) are made with `callerClient` instead of the service client, so G-9 / G-10 / G-11 and the `hold` kind bind. HC025 `retro_mark` -> `409 attendance_requires_checked_path` with `{tier, month, use: 'money_change_checked'}`; the screen then opens the guard dialog.
- The caller is a teacher: before the service write, for every entry whose new status crosses the billable line against the stored row, call `tuition_month_state` through a small admin-or-teacher RPC `attendance_change_allowed(p_session_id, p_marks jsonb) RETURNS jsonb` (c.2, STABLE, returns `{allowed, refused:[{student_id, tier}]}` and reveals no money state beyond allowed / not allowed). Any refused -> `409 attendance_requires_checked_path` with the teacher wording, nothing written.
- HC024 / HC025 from the database are mapped, never retried with the service key.

**`supabase/functions/schedule-sessions/index.ts`** (track A): at `:698-708`, when the Held time update returns HC020, push the lesson to `attention` with `reason: 'held_time_not_changed'` and call `log_session_automation_refused(id, 'schedule-sessions:include-held')`. `normalizeFutureHeld` (`:427-430`): read the row count back and report lessons kept Held by the guard; the broken `.like()` filter is NOT repaired (MASTER_PLAN Q9 stands).

**`supabase/functions/update-enrollment-rate/index.ts`** (track B): the service-key update at `:57` is replaced by `callerClient(...).rpc('money_change_checked', {p_entity: 'enrollment', p_op: 'set_rate', ...})`; the body gains `token`, `confirm`, `correction_reason`; without a token at T1+ it answers `409 preview_required` with the preview. `reason` stops being optional at T1+. A service-role caller (`caller.isServiceRole`) is refused: nothing internal calls it (grep before removing; if something does, it must pass a user JWT).

**`supabase/functions/admin-data-import/index.ts`** (track B): before the loop at `:94`, `select id from payments limit 1`; when a row exists the tables `sessions, attendance, enrollments, discount_assignments, discount_definitions` are skipped with `results[table] = { error: 'closed_on_a_live_system' }`. Dry run unchanged. HC120 / HC121 / HC020 from an upsert are reported per table, not thrown.

**`supabase/functions/guarded-change-refresh/index.ts`** (new, track B; admin only, `verify_jwt = true` in `config.toml`): `{action: 'refresh', override_id}` -> `refreshMoneyChange`; `{action: 'log-refused', ...}` is service-role only and writes the `automation_refused` event through `log_money_automation_refused`. It prices nothing: it calls calculate-tuition for the stored pairs, exactly as `refreshAndRecord` does for lessons.

**`supabase/functions/chat/**`**: no change. `ai_action_apply` / `ai_action_undo` are not given any new caller.

**Not touched:** calculate-tuition, calculate-payroll, close-payroll-month, confirm-tuition, the payment functions, stars-sync (its SQL engine is not re-created; G-1 is built so it need not be).

### `src`

Pure helpers (tested by pgtest suites, no React):
- **`src/lib/sessionGuard.ts`** (track A): `GuardOp` adds `unhold | hold | reteach | retime | restaff | create`; `GuardPreview` adds `level_now`, `floor`, `impact`, `approval`; `ERROR_TEXT` gets every new code of b.4; `actionLabel` / `COPY` / `guidanceFor` for the new ops ("Mark as not held", "Mark as held without a register", "Change teacher", "Change time", "Change assistants", "Add a past lesson"); `evidenceList` appends the floor's causes under the heading "Removed since"; `OverrideRow` adds `approved_by`, `approval_request_id`; `TIER_WORDS` unchanged.
- **`src/lib/moneyGuard.ts`** (new, track B): types for the money preview, `reachRows(preview)` (child, month, state word, stored bill), `stateWord` (`none` -> "No bill yet", `issued` -> "Billed, not paid", `paid` -> "Paid", `signed` -> "Confirmed", `frozen` -> "Frozen"), `moneyRequirements`, `canSubmitMoney`, `moneyActionLabel(entity, op)`. Reuses `checkReason`, `formatVnd`, `parseInvokeError` from `sessionGuard.ts`.
- **`src/lib/approvals.ts`** (new, step C): `approvalReasonText` (`tier3` -> "A taught lesson whose money is settled", `closed_payroll` -> "A closed payroll month", `families` -> "Bills of N or more families", `paid` -> "More than X already paid", `unfreeze` -> "Unfreezing a bill", `settings` -> "Loosening the approval rule"), `requestState`, `canApprove(request, me)`.

Components, track A (`src/components/admin/session-guard/` and the lesson screens):
- `api.ts`, `useGuardedChange.ts`: the new ops and the `create` flow; on `approval_required` the hook exposes `requestApproval()`.
- `GuardDialog.tsx`, `EvidenceCards.tsx`: the "Removed since" card; per-op headline and consequence sentence; when `approval.required`, the destructive button reads "Send for approval" and the footer says who can approve (names from `change_approval_status`).
- `SessionActionsModal.tsx`: Held <-> Scheduled opens the dialog (`unhold` / `hold`).
- `class/AttendanceDrawer.tsx:141-160` (teacher swap), `class/SessionDetailDrawer.tsx:108-118`, `EditSessionModal.tsx`: on a Held lesson the teacher change goes through `set-teacher`, times through `set-time`, assistants through `set-staff`; on a lesson that is not Held nothing changes. `AttendanceDrawer.tsx:246` (assistant attended): try the plain write, on HC020 `kind=restaff` open the dialog.
- `AddSessionModal.tsx`: a past date / started time runs the `create` preview and dialog.
- `TeacherScheduleTransfer.tsx`: no behaviour change (Scheduled only); its error toast uses `errorText` so an HC020 from a lesson that became Held meanwhile reads properly.
- `SessionGenerator.tsx`, `SessionGeneratorConfirm.tsx`: the include-held option is removed, with one line of help text ("Lessons already held are changed one at a time, with a reason").
- `PastAttendanceEditor.tsx` (track B, it needs M2): on `409 attendance_requires_checked_path` open `MoneyGuardDialog` for `('attendance','set_marks')`.

Components, track B (new folder `src/components/admin/money-guard/`): `api.ts` (`supabase.rpc('money_change_preview' | 'money_change_checked' | 'money_changes_checked_bulk')`, then `guarded-change-refresh`), `useMoneyChange.ts` (preview -> T0: confirm at once, no dialog; T1+: dialog), `MoneyGuardDialog.tsx` (reuses `Fields.tsx` and the layout of `GuardDialog.tsx`), `ReachTable.tsx`, `MoneyChangesReview.tsx` (the money queue with "Mark as reviewed"). Callers rewired to `useMoneyChange`, each replacing the raw write named in (a):
`BulkEnrollmentDateSetter.tsx` (bulk), `class/ClassEnrollments.tsx` (`:51`, `:220`), `ModifyEnrollmentModal.tsx` (rate `:268`; the three RPC calls become ops `set_days`, `end`, `transfer`; new field "from which date" using `set_terms_from`), `discount/EditEnrollmentDiscountModal.tsx`, `EnrollmentRateEditor.tsx` (rate via the function; weekdays via `set_days` with the first day of the reviewed month - the in-place write at `:99-102` goes), `EnrollStudentDialog.tsx`, `StudentForm.tsx`, `EnrollmentRequestsManager.tsx` (`enroll`), `discount/AssignDiscountModal.tsx`, `discount/StudentDiscountsTab.tsx`, `discount/EditDiscountModal.tsx`, `DiscountManager.tsx`, `class/ClassSettings.tsx` (fee field only), `staff/PayRateHistory.tsx` (the upsert and the mirror update become one `('pay_rate','set')`), `student/BillFreezePanel.tsx` (unfreeze only), `tabs/DataTab.tsx` (shows the closed tables), `src/lib/aiActions.ts` (wording for `needs_reason_path`).

Step C (after both tracks): `src/components/admin/approvals/ApprovalInbox.tsx` (pending, mine, history; approve / reject / withdraw), `ApprovalSettingsCard.tsx`, `PendingApprovalBadge.tsx` (on the lesson drawer and the enrolment row); `CancelOverridesReview.tsx` gains tabs "Lessons | Other changes | Approvals" and shows requested-by / approved-by; `AdminAlerts.tsx` one line "N changes waiting for a second administrator"; `tabs/AutomationTab.tsx` mounts the three (conductor merges; shared file).

`src/integrations/supabase/types.ts`: regenerated by the conductor after the paste (it lags, per memory); the new code reads the new tables and RPCs through typed wrappers in the two `api.ts` files so nothing else depends on it.

---

## (e) Two-admin approval

Owner decision Q2: **built OFF**. The migration ships `enabled = false`; with it off, `change_approval_needed` answers "not required" for everything and nothing in the school's day changes. The values below are what the setting holds on the day the owner turns it on.

### What counts as high impact (the default threshold)

A change needs a second administrator when ANY of these is true. Each is read from the same preview the first admin sees; none of them is priced - they are counts and stored figures.

| Reason | Rule | Why this line |
|---|---|---|
| `tier3` | The change is T3: a taught lesson (STRONG evidence, floor included) whose money is settled is cancelled, deleted, moved or un-held; or any T3 money change (it reaches a confirmed, adjusted or frozen bill of a past month). | T3 is already "correction mode" - the system's own word for "this rewrites something an admin signed off or a family paid for". It is the classic route for both an honest mistake and a favour. It is rare: a taught lesson is cancelled only to undo a register taken on the wrong lesson. |
| `closed_payroll` | It reaches a closed payroll month (teacher, time, assistant or status of a Held lesson there; a pay rate effective inside it; a lesson moved into or out of it). | Staff have been paid on those figures. The change does not alter the closed lines, but it creates a difference somebody will be asked to carry forward as real money. |
| `families` | It reaches settled bills (paid, part-paid, confirmed or frozen) of **3 or more families**. | One family is the everyday correction (one child's dates were typed wrong). Three or more means a bulk tool, a class fee or a class-wide date change; that is where one slip costs most, and where a second pair of eyes costs least per family. |
| `paid` | The settled bills it reaches hold **5,000,000 VND or more** of recorded payments. | Catches the single-family case that is still large (a whole year of one child's months). The figure is a placeholder near three to four months of one child's tuition; the owner should set it (question 2). 0 turns this line off. |
| `unfreeze` | Unfreezing a bill. | A freeze is the owner's own "this must stand"; undoing it is the first step of the only way round a frozen figure. |
| `settings` | Turning approval off, or loosening any line above, while it is on; and giving someone the admin role while it is on. | Otherwise the rule is one click from not existing, or one new login from being self-served. |

Not a reason on its own: T1 and T2 changes below the family and amount lines, anything in the current month that is not signed off, any T0 change. Those keep D2's single-admin rule: reason, confirmation, review queue.

Expected load once on: a handful of requests a month in normal running, more in the week bills are confirmed if corrections are made after confirming rather than before. That is the design pressure it is meant to create: correct first, confirm after.

### How it works

1. **Asking.** Admin A previews as always. The preview carries `approval: {required: true, reasons: [...]}` and the dialog's button reads "Send for approval". A fills in exactly what a confirm needs (reason, tick, typed date, correction reason). The confirm RPC would refuse with HC060; the dialog instead calls `request_change_approval(kind, rpc, params, token)`, which re-runs the same plan as A under the same locks, checks A's token (HC011), the reason rule (HC010), the confirmation (HC012) and the correction reason (HC013), refuses when no approval is actually needed (HC015 `approval_not_needed` - a request is never a way to park a change), refuses a second pending request for the same target (HC063), and stores the request with the preview A saw, the impact, the reasons and a fingerprint (the token's hash without the caller's id). **Nothing else is written. The lesson, enrolment or rate is exactly as it was.**
2. **While it waits.** The target shows a badge "Waiting for approval - asked by A on <date>". A can withdraw. Anyone can still make other guarded changes to the same target under their own rules; if one of them changes what the request was based on, the request goes stale at the next look (step 3). Month close and bill confirmation are not blocked by a pending request (blocking them would let one request freeze the school's month-end); the Payroll and review screens show "N changes waiting for a second administrator" so the person closing sees it.
3. **Deciding.** Admin B opens the request: `approval_request_preview(id)` returns A's reason and what A was shown, beside the plan **recomputed now, as B**, a `stale` flag and B's own token. B approves with `approve_change_request(id, token, note?)`:
   - B is an admin and **B is not A** (HC061) - compared on `auth.uid()` against `requested_by`, in the database, with no override and no role that is exempt;
   - the request is pending (HC062) and not expired (HC064);
   - under the target's locks the plan is recomputed; if its fingerprint differs from the request's, a `stale` event is written and the answer is `{status: 'stale'}` - nothing applied; A asks again on the new facts;
   - B's token must match what B was just shown (HC011);
   - an `approved` event is written, the flag `hec.change_request_ok` is set for this transaction, and the SAME checked function A would have called is run with `p_request`. It passes the approval hook through `_change_request_claim`, which accepts only this request, in this transaction, with this fingerprint. The override row is written with `actor_user_id = A`, `approved_by = B`, `approval_request_id`; an `applied` event closes the request.
   - It is one transaction: if the change fails, the approval is rolled back with it and the request is still pending.
   B can instead `reject_change_request(id, note)` (note by the reason rule). Then the usual tuition refresh runs for the returned pairs, as after any checked change.
4. **Expiry.** 168 hours (7 days) by default, `expires_at` fixed when asked. An expired request cannot be approved (HC064) and shows as expired; asking again is one click from it ("Ask again" pre-fills the form, a fresh preview and token are required). Seven days because the school has few admins and one may be away for a long weekend; staleness is checked at approval anyway, so a long window does not let an out-of-date request through.

### Audit trail

`change_approval_requests` (what was asked, by whom, the preview and impact at that moment) and `change_approval_events` (requested / approved / rejected / withdrawn / stale / applied, each with actor and time) are append-only for every role, written only by the definer functions, readable by admins. The override row of the applied change links back with `approval_request_id` and carries both people. The review screen shows "asked by A, approved by B". A T3 change that was approved still appears in the review queue: approval is before the fact, review is after it, and they are different people's jobs only when there are three admins.

### Designed for a school with two or three admins

- **It cannot be switched on with fewer than two admins** (`set_change_approval_settings` -> HC065 `needs_two_admins`, counting distinct `user_roles.user_id` with role admin).
- **If the school drops to one admin while it is on**, high-impact changes stop (there is nobody who may approve) - the closed direction. `change_approval_status()` reports `single_admin: true` and the screen says what to do: add a second admin, or the owner turns approval off from the Supabase SQL editor with the one statement printed there (`UPDATE public.change_approval_settings SET enabled = false, updated_at = now();`). The SQL editor is the owner lane; no signed-in admin can run that statement through the app.
- **Turning it off or loosening it from the app** needs the other admin (reason `settings`); tightening it or turning it on does not.
- **Giving the admin role while it is on** needs the other admin (`zz_admin_grant_guard`), so "create a second login and approve myself" is itself a two-person act. Residual, stated plainly: two admin logins held by one person BEFORE approval was turned on cannot be told apart by the database. `user_roles` is already audited (`audit_user_roles`), and the status call lists the admins so the owner can read the list on the day it is switched on.
- **The approver's work is one screen and one click**: everything A wrote, what it reaches, what changed since. No second reason to type; a note is optional. Rejecting needs a sentence.
- **No new notification system**: a count on the admin overview and in the review screen. If the owner later wants a message sent, that is a separate, small task.
- **Bulk**: in a bulk cancel or bulk enrolment change, a lesson or row that needs approval comes back refused with `approval_required`; the result screen offers "Send these N for approval", which makes one request per item (so one bad item cannot hold the rest, and each can be read on its own).

### What approval deliberately does not do

It does not judge the change, price it, or block the first admin from doing everything below the threshold. It does not apply to automation. It is not a second password: it is a second person.

---

## (f) Test plan

All of it runs in `node scripts/pgtest/run.mjs` (PGlite, the real migration files, LF-normalised). Every case states its probe in the three lanes the way `session-cancel-guard.test.mjs` does (`SET LOCAL request.jwt.claims` for an admin, a teacher, service_role; no claims for the owner lane). A fixture call that throws is a FAIL line, not a crash (review-2 ruling).

### f.1 Suites

| Suite (new unless marked) | Migrations loaded | What it is for |
|---|---|---|
| `session-cancel-guard.test.mjs` (existing, 266 assertions) | + prelude + M1 | **Must stay green with no assertion weakened.** Only allowed edits: the token version, and expected `kind` values where a case used an un-hold or a Held-lesson teacher / time edit as a "plain" write (each such edit listed in the build note). This is the proof that M1 weakens nothing. |
| `session-guard-functions.test.mjs` (existing, 135) | + prelude + M1 | Same rule. New cases for the changed actions (below). |
| `d4-session-guard.test.mjs` | D1, D2, prelude, M1 | G-1 to G-7, G-9, G-10. |
| `d4-evidence-floor.test.mjs` | D1, D2, prelude, M1 | G-8 and the F-11 reproduction. |
| `d4-money-guard.test.mjs` | audit, freeze, enrollment migrations, pay-rate and payroll-lock migrations, prelude, M2 | G-11 to G-18, the reach functions. |
| `d4-reach-oracle.test.mjs` | as above + the bundled calculate-tuition (the way `invoice-status.test.mjs` runs it) | The guard's tier against what the calculator actually does (f.3). |
| `d4-approvals.test.mjs` | everything + M3 | Section (e). |
| `d4-functions.test.mjs` | everything | manage-session, mark-attendance, update-enrollment-rate, admin-data-import, guarded-change-refresh, schedule-sessions driven with requests over the PostgREST stand-in; every write to a guarded table is asserted to be on the caller's client. |
| `money-guard-lib.test.mjs`, additions to the existing session-guard helper tests | none | `src/lib/moneyGuard.ts`, `approvals.ts`, the new `sessionGuard.ts` words. |
| `stars-sync-engine.test.mjs`, `stars-sync-upgrade.test.mjs` (existing) | + prelude + M1 + M2 | The sync still restores, deletes and un-holds its own lessons; plus the two new cases in f.2 (G-1). Every existing assertion unchanged. |
| `ai-actions.test.mjs` (existing) | + M2 | A plan reaching a billed past month is refused on the card (`needs_reason_path`) and apply writes nothing; a current-month plan still applies; undo of it still works. |
| `enrollment-order`, `enrollment-discounts`, `invoice-status`, `family-payment-month`, `payroll-rows`, `cancelled-lessons` (existing) | + all four | Run with the new triggers present. A fixture that acts as an admin on a past month moves to the checked RPC; a fixture on the owner lane needs no change. No expected FIGURE may change (`fixtures/tuition-figures.golden.json` byte-identical). |
| `edge-functions.test.mjs` (existing) | none | Plus the static scan of f.4. |

### f.2 One test per guard that fails without it

Each line is a case whose expected result is a refusal or a stored value that the pre-D4 code does not produce; the suite header lists them so "removed the guard, suite still green" is impossible.

- **G-1** admin raw `UPDATE sessions SET status='Scheduled'` on a Held lesson -> HC020 `kind=unhold`; via `session_status_checked` with token + reason -> Scheduled, one override `action='unhold'`, tier 2 (register with Present) / 3 (plus a paid bill); without confirm -> HC012; stale token after a teacher marks -> HC011. Service lane: sync-flipped lesson in an open month -> Scheduled; the same in a LOCKED month -> stays Held, one `automation_refused` event, the statement did not raise; a Held lesson with no flips row, started -> stays Held. Engine case: a Pixel Pal withdrawal in a locked month finishes the page with outcome `applied` and the lesson Held.
- **G-2** admin raw Scheduled -> Held, no marks, started -> HC020 `kind=hold`; with a person's mark -> allowed, no override; teacher's flip after marking -> allowed; un-hold then raw re-hold with marks -> HC020 (the un-hold row makes it a `hold`).
- **G-3** insert `status='Held'` as admin, as service -> HC023; as owner -> allowed; manage-session `create` with `status:'Held'` -> 409 `born_status`, no row.
- **G-4** raw teacher change on Held -> HC020 `kind=reteach` (admin, service); on Scheduled -> allowed; checked -> row with `change.new_teacher_id`, tier 1; locked month -> tier 3, HC013 without a correction reason, in the review queue; un-hold + teacher in one UPDATE -> HC022; acknowledged write with a different teacher than previewed -> HC020.
- **G-5** raw `end_time` change on Held -> HC020 `kind=retime` (this is the case that fails if the WHEN clause is not widened); same on Scheduled -> allowed; schedule-sessions include-held -> lesson unchanged, in `attention`, one logged refusal.
- **G-6** assistant row added to a Held lesson of a locked month, raw -> HC020 `kind=restaff`; same lesson, open month, ended yesterday -> allowed; ended 8 days ago -> HC020; `session_staff_checked` replaces the list and stores before / after; deleting the lesson (D2 path) still cascades.
- **G-7** admin raw insert of a lesson dated last month -> HC020 `kind=create_past`; `create_session_checked` -> lesson exists, seeded marks exist, override `action='create'` with those children in `refresh_pairs`; service insert dated yesterday -> HC020, dated today -> allowed; a future lesson by plain insert as the admin -> allowed, zero override rows.
- **G-8** the review-3 V7 probe, verbatim: seeded register, paid bill, points + linked transcript = tier 3; re-date the point row, unlink the transcript; preview -> **tier 3**, `level 'STRONG'`, `level_now 'NONE'`, `floor.causes` two entries, `review_required true`; cancel without a correction reason -> HC013. Then one case per evidence family removed alone (points deleted by the class TEACHER; transcript deleted; homework re-dated; a person's Present excused by hand; Held -> Scheduled through the checked path) each followed by a cancel preview with tier not lower than before. **Column sweep, generated, not hand-listed:** for each of `attendance`, `point_transactions`, `class_transcripts`, `homeworks`, `homework_submissions`, for each column the table has in `information_schema.columns`, on a lesson whose evidence rests on that one row: set the column to another valid value, set it to NULL where allowed, and delete the row - after each, `effective level >= level before` (a column I did not think of is still tried; a new column is tried the day it is added). Delete after removal -> `use_cancel`. Automation delete of that lesson -> HC020. Floor table: UPDATE lowering the level -> HC040; DELETE -> HC040; direct INSERT as service_role -> HC041. A lesson that has not started stores no floor. D1 raising inside the trigger (helper made VOLATILE) -> floor STRONG and the point delete itself still succeeds.
- **G-9** `UPDATE attendance SET session_id` / `SET student_id` as admin, teacher, service -> HC024; owner lane -> HC024 too. A cancel after an OLD re-parent recorded in `audit_log` (fixture row) has the moved child in `refresh_pairs`.
- **G-10** admin and teacher DELETE of a person's mark on a started lesson -> HC025 `delete_mark`; `marked_by -> NULL` -> HC025 `unmark`; seeded row delete in the current month -> allowed; the sync's restore on the service lane -> allowed and a floor row written; cascade from a checked lesson delete -> allowed.
- **G-11** admin raw Present -> Excused on a lesson of a past paid month -> HC025 `retro_mark, tier=2`; the same in the current paid month -> allowed; confirmed bill in the current month -> HC025 tier 2; Present -> Absent (both billable) in a past month -> allowed; via `money_change_checked('attendance','set_marks')` -> mark changed, override with the bill in `invoices_before`; the cancel's excuse-all on a lesson of a past paid month (D2 path) -> still works (depth 2); `attendance_change_allowed` as a teacher -> `allowed:false` with no bill fields in the answer; as a teacher of another class -> 42501.
- **G-12** each raw writer of (a) P12-P14 reproduced as an admin against a past paid month -> HC120; the same against the current month -> allowed. Each op of the table through `money_change_checked`: row changed, override written, reach stored, `refresh_pairs` right. `end_enrollment` called directly with a past date -> HC120; through op `end` -> placeholder marks deleted, no HC025 (the acknowledgement covers them). `student_id` change -> HC121. Service lane past month -> HC120. Bulk: 51 items -> HC016; one bad item refused, the rest applied, one `batch_id`. `set_terms_from` with this month's date on an old enrollment -> T0, two enrollment rows, past months' reach empty.
- **G-13** assignment with `effective_from` six months back, raw -> HC120; from today -> allowed; definition value edited while assigned over a billed past month -> HC121 `definition_in_use`; unassigned definition -> allowed.
- **G-14** raw `session_rate_vnd` change on a class with a past registered lesson -> HC120; on a brand-new class -> allowed; checked -> preview lists the past bills by state; tier 3 when one is frozen.
- **G-15** raw insert of a rate dated in a locked month -> HC120; future-dated -> allowed; raw UPDATE / DELETE of an old row -> HC120; `('pay_rate','set')` same-date twice -> one row (no 42P10), mirror columns equal `teacher_rate_on(today)`; direct mirror-column edit for a teacher with Held lessons -> HC120; `remove` of the only row -> HC015.
- **G-16** raw unfreeze as admin -> HC120; as service -> HC120; checked -> unfrozen, override with the bill copied; freeze -> allowed as today; calculate-tuition on a frozen bill -> figures identical before and after (existing assertion, re-run).
- **G-17** import of `attendance` with one payment row present -> `closed_on_a_live_system`, zero writes; with no payments -> as today.
- **G-18** raw DELETE of a student with a payment -> HC121; of a class with an enrollment -> HC121; `ai_action_undo` of a just-created child -> still works.
- **Approvals**: off -> every case above unchanged and `change_approval_needed` false for a T3 impact. On: T3 cancel by A -> HC060 with `reasons=tier3`; `request_change_approval` -> one request, lesson untouched; second request -> HC063; A approves own -> HC061 (and through a second SESSION of the same user -> HC061); B approves -> lesson cancelled, override `actor=A, approved_by=B`, events requested / approved / applied; B approves after a teacher marked another child -> `{status:'stale'}`, lesson untouched, `stale` event; expired -> HC064; rejected then approve -> HC062; `_session_change_apply(..., p_request := <id>)` called directly by an admin -> 42501 (no EXECUTE) and, as owner, refused by `_change_request_claim` without the flag; enabling with one admin -> HC065; disabling as A -> HC060, as owner lane UPDATE -> allowed; granting admin while on -> HC060; a failing apply inside approve leaves the request pending and no `approved` event; families = 3 reached -> required, 2 -> not; `paid_vnd` at 4,999,999 / 5,000,000; an impact with a field missing -> required.

### f.3 The reach oracle (the test that keeps the guard honest about tuition)

`d4-reach-oracle.test.mjs` builds one family with bills over five months in the states none / issued / paid / confirmed / frozen, then for each of about forty edits (every enrollment op, every discount op, a class-fee change, a register mark, a backdated lesson; each aimed at each month) it:
1. records the guard's tier for the edit (`money_change_preview` / `session_create_preview`);
2. performs the edit on the owner lane (bypassing the guard on purpose);
3. runs the real calculate-tuition for every month, and diffs every stored bill.

Assertion: **if any bill of a past month, or any confirmed / frozen bill, changed a figure or its confirmation state, the tier recorded in step 1 was at least 1; and every (student, month) that changed is in the preview's `refresh_pairs`.** A false T0 - the guard saying "nothing reached" while the calculator moves a billed month - fails here whatever the cause (a missed column, a wrong window, a month boundary). The opposite direction (tier >= 1 but nothing moved) is allowed and counted, so over-asking is visible in the output.

### f.4 Static checks (cheap, and they catch the next person's change)

- **Evidence sources.** The suite reads the text of `session_held_evidence` from the migration, extracts every `FROM public.<table>` / `JOIN public.<table>`, and asserts each table either has a D4 keep trigger or is on a short list in the test with a reason (`sessions`, `invoices`, `payroll_periods`, `payroll_lines`, `session_participants`, and the `stars_*` helper tables, for which the test instead asserts that `authenticated` has no INSERT / UPDATE / DELETE privilege or policy). A new evidence item in D1 (the recorder is coming) fails this test until its table is handled.
- **Service-key writers.** `edge-functions.test.mjs` scans `supabase/functions/**` for a service client writing (`insert | update | upsert | delete`) to `sessions, attendance, enrollments, discount_assignments, referral_bonuses, discount_definitions, classes, staff_pay_rates, session_participants, invoices`. Each hit must be in an allow-list in the test with a one-line reason (the sync engine's RPC, calculate-tuition's invoice upsert, mark-attendance for a teacher, the seed and repair functions, ...). A new function that writes a guarded table with the service key fails the run.
- **Raw writers in `src`.** The same scan over `src/**` for `supabase.from('<guarded table>').update|insert|upsert|delete`: allow-listed are the writes that are T0 by construction or not money (notes, class name, `is_active`). Each raw writer named in (a) must be gone.
- **Lanes.** `_caller_lane()` with: admin JWT, teacher JWT, service_role JWT, no claims as postgres, no claims with `SET ROLE authenticated`, an empty-string role claim -> person, person, service, owner, unknown, unknown.

### f.5 Mutation list (each must turn at least one named assertion red)

SQL, M1: (1) drop `unhold` from the classifier; (2) drop the un-hold-row condition from `hold`; (3) `hold` ignores marks (always NULL); (4) drop `reteach`; (5) `reteach` only when `n.status = 'Held'`; (6) drop `retime`; (7) WHEN clause without `end_time`; (8) WHEN clause without `teacher_id`; (9) service lane allowed for `reteach`; (10) un-hold service lane ignores the locked month; (11) un-hold service lane raises instead of keeping Held (the engine case goes red); (12) insert guard accepts Held; (13) insert guard ignores `session_has_started`; (14) insert guard's service lane accepts yesterday; (15) floor not read in assess (`v_level := v_level_now`); (16) floor not in the token; (17) floor keep skipped for `point_transactions`; (18) for `class_transcripts`; (19) for attendance; (20) keep runs AFTER instead of BEFORE (level read too late); (21) D1 error in keep swallowed as NONE instead of STRONG; (22) floor's widened settled test removed; (23) HC024 only for `session_id`; (24) HC025 skipped for teachers; (25) roster guard without the 7-day rule; (26) roster guard ignores DELETE; (27) `erased` children not added to `refresh_pairs`; (28) floor monotonic trigger allows a lower level.
SQL, M2: (29) `tuition_month_state` treats a past issued bill as T0; (30) grace 7 days -> 0 and -> 40; (31) current-month confirmed bill T0; (32) `none` in a past month always T0; (33) enrollment guard ignores `rate_override_vnd`; (34) ignores `allowed_days`; (35) ignores DELETE; (36) date-only UPDATE reach uses the new dates only; (37) `_money_ack` without the txid test; (38) without the student test; (39) without the reach-window test; (40) service lane passes; (41) attendance money guard without `pg_trigger_depth() = 1` (the D2 cancel case goes red) and (42) with it inverted; (43) billable crossing compares status equality instead of billable sets; (44) unfreeze guard checks `NEW.tuition_frozen = false` only (NULL slips); (45) pay-rate reach ends at the row's own date; (46) mirror guard dropped; (47) definition guard dropped; (48) token without `row_before`; (49) T0 requires no override row (the "every admin write leaves a row" assertion goes red); (50) bulk cap 50 -> 500; (51) `ai_plan_check` check removed.
SQL, M3: (52) `requested_by <> auth.uid()` removed; (53) expiry not checked; (54) fingerprint not compared; (55) `_change_request_claim` without the txid test; (56) without the flag test; (57) `change_approval_needed` treats a missing field as false; (58) NULL `required` read as false in the apply hook; (59) enabling allowed with one admin; (60) disabling allowed without a request; (61) admin-grant guard dropped; (62) `approved_by` stored as the requester.
Functions: (63) manage-session `change-status` back to a plain update; (64) `create` back on the service client; (65) `create` passes `status` through; (66) mark-attendance admin path on the service client; (67) teacher pre-check removed; (68) update-enrollment-rate on the service client; (69) import guard removed; (70) a confirm retried on the service client after HC020 / HC120.
The runner is the fixed one from the D ship fixes (no `rmSync` over a junction); results are recorded as caught / survived per mutant with the assertion that caught it.

### f.6 The fingerprint check

`scripts/pgtest/guard-fingerprint.mjs` already decides WHAT to fingerprint by diffing the catalog before and after the migrations it is given. It is generalised, not rewritten:
- it takes a baseline list and a "new" list; for D4 the baseline is everything the D release loaded PLUS `20261112090000` and `20261112091000` (the live state), and the new list is the four D4 files. Output: `docs/evidence/D4-release-fingerprint.sql` and `.expected.json`, same shape, one read-only SELECT.
- trigger entries gain `md5_def: md5(pg_get_triggerdef(oid))`. Today a trigger is fingerprinted by name, table, type, function and enabled flag only, so the widened WHEN clause of `zz_session_change_guard_upd` (G-5 depends on it) would be invisible. `TRIGGER_TABLES` grows to every table D4 puts a trigger on.
- the D4 expected file therefore contains the new objects AND the D2 objects D4 replaces. Those are named in the build note and must be exactly: `session_change_kind`, `_session_change_assess`, `_session_erased_recently`, `_session_review_required`, `session_change_guard`, `session_change_preview`, `_session_change_apply` (new signature; the old identity must be ABSENT), the four public D2 wrappers (they pass one more argument), `session_cancel_guard_status`, trigger `zz_session_change_guard_upd`, view `session_cancel_tuition_pending`, table `session_cancel_overrides` (constraint and two columns), plus `ai_plan_check`.
- a new `--check-unchanged` step asserts that every one of the 66 objects in `D-release-fingerprint.expected.json` that is NOT on that list has the same fingerprint after D4 as before. "D4 changed something of D2 it did not mean to" is then a failed check, locally and - by pasting the old `.sql` again after the D4 paste and comparing all but the listed entries - on the live database.
- `--check` runs in `run.mjs` as today, so an edit to a migration without regenerating the expected file fails the run.

---

## (g) Deliberately NOT guarded, and why

| Not guarded | Why | What still records it |
|---|---|---|
| A teacher correcting or deleting points, transcripts, homework | It is classroom work; a tuition dialog in front of it would be wrong and would be worked around. | The floor (G-8) keeps the lesson's level; `audit_point_transactions`. |
| Anything in the current month that no admin has confirmed or frozen (excused absences, a new discount from today, a late enrolment, an end date of today) | Families pay in advance; this is the school's daily work. | T0 override row when done from the admin screens; the existing audit triggers. |
| The teacher of a lesson that is still Scheduled, even after it started | Nobody has been paid yet; payroll counts Held lessons only. The flip to Held pays whoever is on the lesson at that moment. | `audit_sessions`. Left as is knowingly: a swap between "started" and "Held" is unreasoned. |
| The service lane on `attendance` (never refused, G-9 excepted) | The sync and the daily register run there; a refusal aborts a sync page or a teacher's register. | Floor, `audit_attendance`. **Consequence, stated plainly:** a TEACHER's retroactive mark through `mark-attendance` is stopped by a check in the function, not by the database. An admin's is stopped by the database. |
| `stars_sync_resolve_conflict` writing a mark into a billed past month | It is an RPC on the admin's JWT, so G-11 refuses it there (HC025). Not exempted: the admin makes the change with a reason first, then settles the conflict as "keep HEC's". | The refusal is the record. |
| Sibling links and overrides (`students.family_id`, `families.sibling_percent_override`, `students.sibling_discount_from`) | They are decided through `compute-sibling-discounts` and `sibling_discount_state`, with their own rule module (`_lib/sibling-hold.ts`) and their own retry / unresolved states. A reach rule for them needs that module's owner. | `audit_students`; M2 adds the missing `audit_families` trigger (the only thing D4 adds here). Owner question 9. |
| Payments, bill status, ledger repair tools (D0 O5-O9, O21, O24) | The payment paths have their own guards (reason and snapshot on delete, payment-month confirmation, the status rules of T1). Mixing a second rule into them belongs to that workstream. | Theirs. Only unfreezing (G-16) is taken, because it is the way round a frozen figure. |
| `payroll_adjustments` (carrying a correction forward) | It is itself the visible, itemised record of a correction, made on purpose from the Payroll screen. | The row. A candidate for the approval list later, not now. |
| Freezing a bill; closing or reopening a payroll month | Freezing protects figures. Reopening already stores who, when and why (`payroll_periods.reopen_reason`). | Existing columns. |
| Editing a discount definition that is on billed months | Refused outright (G-13), not checked: a checked path would need a reach over every family that ever had it. | - |
| An honest class-fee rise re-pricing unfrozen past months (P16) | D4 makes it visible and reasoned; stopping it needs dated class fees (the shape `staff_pay_rates` and `class_schedule_versions` already have). | G-14's row lists every bill exposed. Owner question 6. |
| `sessions.rate_override_vnd`, notes, class name, colours | Read by neither calculator. | - |
| Seeded / auto-marked / repaired register rows as "false evidence" (D0 S22, S23) | D1 already ignores `marked_by IS NULL`. | - |
| Deleting a lesson recording (workstream C) | Not shipped as evidence yet. Contract for C: the function that deletes or expires a recording calls `_session_evidence_keep(session, cause)` first, and the f.4 evidence-source test will fail until it does. | - |
| Repairing `normalizeFutureHeld` | MASTER_PLAN Q9 stays open; G-1's lane makes a future repair safe (locked months and taught lessons stay Held) but does not switch it on. | - |

---

## (h) Build order

Ship order for the owner (differs from D2's, on purpose): **the four migrations first, in order, fingerprint after each; then the functions; then the UI push; outside teaching hours.** With the migrations in and the old code still running, every newly guarded action is refused by the database (closed) and the daily register is untouched, because the old `mark-attendance` runs on the service lane. The other order would leave teachers' registers depending on an RPC that is not there yet. The new functions tolerate both orders: a missing checked RPC is `503 guard_not_installed` with no write, with one named exception - `mark-attendance`'s teacher pre-check treats a missing `attendance_change_allowed` as "not installed, behave as before", since that path existed before D4 and writes nothing new.

| Step | Who | Files (nobody else touches them) | Done when |
|---|---|---|---|
| **0. Prelude and tooling** | conductor or either implementer, first | `supabase/migrations/20261113085000_d4_prelude.sql`; `scripts/pgtest/guard-fingerprint.mjs` (baseline / new lists, `md5_def`, `--check-unchanged`); the lane test | merged; full run green; D-release fingerprint unchanged |
| **A1. Session guard** | implementer 1 | `20261113090000_d4_session_guard_ext.sql`; `d4-session-guard.test.mjs`, `d4-evidence-floor.test.mjs`; edits to `session-cancel-guard.test.mjs`, `stars-sync-*.test.mjs` | f.2 G-1..G-10 green; the 266 + 135 existing assertions green; mutants 1-28 caught |
| **A2. Lesson functions** | implementer 1 | `_lib/session-guard.ts`, `manage-session`, `bulk-cancel-sessions`, `mark-attendance`, `schedule-sessions`; the A half of `d4-functions.test.mjs` | mutants 63-67, 70 caught |
| **A3. Lesson screens** | implementer 1 | `src/lib/sessionGuard.ts`, `src/components/admin/session-guard/**`, `SessionActionsModal`, `class/AttendanceDrawer`, `class/SessionDetailDrawer`, `EditSessionModal`, `AddSessionModal`, `TeacherScheduleTransfer`, `SessionGenerator*` | tsc 0; helper tests; screenshots at 375 px and desktop of each new dialog state |
| **B1. Money guard** | implementer 2 | `20261113091000_d4_money_change_guard.sql`; `d4-money-guard.test.mjs`, `d4-reach-oracle.test.mjs`; edits to `ai-actions`, `enrollment-*`, `invoice-status` tests | f.2 G-11..G-18 green; the oracle green; golden figures byte-identical; mutants 29-51 caught |
| **B2. Money functions** | implementer 2 | `_lib/money-guard.ts`, `update-enrollment-rate`, `admin-data-import`, `guarded-change-refresh` (new); the B half of `d4-functions.test.mjs` | mutants 68, 69 caught |
| **B3. Money screens** | implementer 2 | `src/lib/moneyGuard.ts`, `src/components/admin/money-guard/**`, the enrolment, discount, class-fee, pay-rate, freeze and import screens listed in (d), `PastAttendanceEditor`, `src/lib/aiActions.ts` | tsc 0; every raw writer of (a) gone (f.4 scan) |
| **C. Approvals** | whichever implementer finishes first, after A1 and B1 are merged | `20261113092000_d4_change_approvals.sql`; `d4-approvals.test.mjs`; `src/lib/approvals.ts`, `src/components/admin/approvals/**`; the tabs in `CancelOverridesReview.tsx` | f.2 approvals green with the setting off AND on; mutants 52-62 caught |
| **D. Review and release** | fresh fable reviewer, then the conductor | `docs/evidence/D4-review.md`, `D4-release-fingerprint.*`, `D4-release.md` | PASS; fingerprint files generated; apply order written |

A and B never touch the same file. Shared files are merged by the conductor in small commits: `scripts/pgtest/run.mjs` (suite entries), `supabase/config.toml` (one block for `guarded-change-refresh`), `src/integrations/supabase/types.ts`, `tabs/AutomationTab.tsx`, and root `AGENTS.md`, which gains these rules once the build is merged:
- "A new source of evidence in `session_held_evidence` needs a keep trigger on its table (`_session_evidence_keep`); `d4-evidence-floor.test.mjs` fails until it has one."
- "A write to enrollments, discounts, the class fee, pay rates or a frozen flag goes through `money_change_checked`; `_money_change_plan` is the only place that knows what an op reaches. A new op needs a row in `d4-reach-oracle.test.mjs`."
- "No edge function writes a guarded table with the service key for a person; the allow-list is in `edge-functions.test.mjs`."
- "Approval is decided in `change_approval_needed` and nowhere else."

Cross-track seams, already settled in (c) so neither waits for the other: `create_session_checked` reads `tuition_month_state` if it exists and otherwise treats every child as T2; the approval hook is the prelude stub until step C; `mark-attendance` calls `attendance_change_allowed` if it exists.

---

## (i) Open questions for the owner - each with the default the build uses if there is no answer

1. **Turn two-admin approval on?** Default: built and left OFF (your decision Q2). Nothing changes until you switch it on.
2. **The amount line.** Default 5,000,000 VND of payments already recorded on the bills a change reaches. Is that about three to four months of one child's tuition, as assumed? If not, say the figure; 0 switches the amount line off and leaves "three families".
3. **How many days into a new month the old month still counts as current.** Default 7 (registers and corrections for the last days of a month are free until the 7th). The same 7 days is how long an assistant's attendance on a held lesson can be corrected without a reason.
4. **Teachers and old months.** Default: after those 7 days a teacher can no longer switch a child between charged (Present / Absent / Late) and Excused for a lesson of a month that is billed; an administrator does it, with a reason. Marking Present <-> Absent stays free.
5. **"From this date" for rates and discounts.** Default: build it (`set_terms_from`). Without it every discount or rate change on an old enrolment is a correction of the past, because those fields have no date today.
6. **Class fees are not dated.** Raising a class's fee re-prices every past bill of that class that is not frozen, the next time it is opened. Default for D4: the change asks for a reason and shows how many past bills are exposed. Recommended next task (not in D4): dated class fees, so a rise applies from a date. Until then, freeze the bills of a class's past months before changing its fee.
7. **"Include held lessons" in the schedule rebuild is retired.** Default: yes - times of lessons already held are changed one at a time, with a reason.
8. **Data import is closed for lessons, registers, enrolments and discounts once the school has payments.** Default: closed.
9. **Sibling and family links** stay outside this guard (they have their own calculator and states). Default: leave, add the missing audit trail on `families`.
10. **A request waits 7 days** before it expires. Default 7.
11. **For your information, no decision:** the pay-rate history screen saves with a conflict target that the project's own notes say Postgres refuses (42P10). If saving a rate has been failing, that is why; the new checked function replaces that write.
12. Existing Q9 (`normalizeFutureHeld`) is unchanged by D4; default still "leave as is".

---

## Self-critique: the three most likely ways this fails or is bypassed

**1. The service key as a side door.** Every trigger decides by lane, and an edge function holding the service key is the `service` lane whoever clicked the button. D4 closes that lane for the money tables (refused at T1+) and for the new lesson kinds, but leaves it open on `attendance`, where the sync and the register live. So the weakest point of the whole design is `mark-attendance` for teachers, and any FUTURE function that writes a guarded table "on behalf of" a signed-in person. A function written next month that updates enrollments with the service key would be refused at T1+ (good) - but one that writes attendance would pass.
*How the tests catch it:* the f.4 service-key scan fails the run for any service-client write to a guarded table that is not on the allow-list, with the reason written next to it; `d4-functions.test.mjs` asserts for every guarded action that the write happened on the caller's client (mutants 63-70); the teacher pre-check has its own case and mutant (67). What the tests cannot catch: a function deployed by hand that is not in the repo. The honest fix for the teacher path - moving `mark-attendance`'s write into a definer RPC called with the teacher's JWT - is deliberately not in D4 (it is the busiest write in the school and is mirrored by the sync engine); it should be its own task.

**2. A hole in the floor.** G-8 only works if EVERY way of making D1 read less passes a keep trigger first. The misses I can imagine: a new evidence source added to D1 without a trigger (the recorder is exactly that); a column D1 matches on that I did not list (it matches transcripts by the Hanoi day of `created_at`, points by `date` and `class_id`); the helper tables that make D1 EXCLUDE a row (`stars_homework_map`, `stars_sync_grade_state`: inserting a row there turns a teacher's homework into "sync-made", which D1 does not count); and a keep that runs but reads D1 as someone D1 refuses.
*How the tests catch it:* the evidence-source test in f.4 is derived from D1's own text, so a new table in D1 fails until it is handled; the per-family "remove it alone, tier must not drop" cases in f.2 are generated over every column of each evidence table from `information_schema` (change it, null it, delete the row), not from my list, so a matching column I forgot is still exercised; the same test asserts `authenticated` cannot write the `stars_*` helper tables (if it can, that is a finding for the build, and the fix is a keep trigger there too); mutant 21 pins "cannot read = STRONG". Residual I cannot test away: evidence removed BEFORE D4 is installed left no floor - the 30-day `audit_log` window of `_session_erased_recently` covers attendance only. The release note should say so, and the review screen's first week should be read with that in mind.

**3. The reach is computed wrong, in the open direction.** The money guard is only as good as "which months does this write touch". An under-estimate is a silent T0: the admin sees no dialog and a billed month moves. Candidates: an UPDATE that changes both dates at once; `allowed_days` (a weekday change reaches the whole span, not a window); a month with lessons but no bill row yet; the 7-day grace at a month boundary and the Hanoi / UTC date line; `excuse_attendance_outside_enrollment` rewriting marks as a consequence; and the class fee, whose reach is every child ever billed in the class.
*How the tests catch it:* the oracle (f.3) does not trust my reach rules at all - it performs each edit behind the guard's back, runs the real calculate-tuition over every month, and fails if any billed past month or signed-off bill moved while the guard had said T0, or if a moved (child, month) is missing from `refresh_pairs`. Mutants 29-36 and 45 each flip one reach rule and must turn the oracle or a named case red. The clock cases run at the last second of a month, the first second of the next, and on day 7 and day 8 in Hanoi time. What it cannot prove: a tuition input that is not in the oracle's forty edits because nobody knew it was an input (sibling state is the known one, and it is declared out of scope in (g)). If the fable review finds another input of calculate-tuition, it goes into the oracle before anything ships.

A fourth, smaller one, for completeness: **approval theatre** - two logins, one person; or a second admin who approves without reading. The database can enforce "not the same account", "not expired", "not stale" and "the approver was shown the current state" (the token), and it does; it cannot enforce attention. The requested / approved pair on every override row is there so the owner can see, afterwards, who approves whose changes and how fast.
