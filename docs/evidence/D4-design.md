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

<!-- END -->
