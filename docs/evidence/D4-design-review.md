# D4 design review (adversarial critic)

Reviewed: `docs/evidence/D4-design.md` at c21c415 (conductor branch). Review only: no code, no push, no deploy, no database access. Nothing below was executed; every claim about code cites a file I read in this checkout.

**Where I am / next step:** COMPLETE - sections 0-8, the required and advised lists, what could not be assessed, and the verdict (BUILD WITH THE REQUIRED CHANGES). Next step is not mine: the conductor rules on R-1 to R-14 and the designer revises.

Finding ids: **R-n** = required change (blocker for the build as designed), **A-n** = advised. Each has a scenario and the smallest change.

How much was read: in full - root `AGENTS.md`, `supabase/AGENTS.md`, `D4-design.md`, `D0-inventory.md`, `D1-evidence-model.md`, `D2-guard-design.md`; MASTER_PLAN sections 1, 2, 3, 6, 8 and every D ruling in section 10; the live guard migration `20261112091000` lines 184-723 (helpers, classifier, assess, erased, review, trigger). Read in part (outline plus the passages D4 relies on): `D-review-1/2/3`, `D2-threat-model`, `D2-build`, `D2-edge-build`, `D3-review`, `D-ship-fixes`, `20261112090000` (caller test), `manage-session`, `mark-attendance`, `_lib/session-guard.ts`, `src/lib/sessionGuard.ts`. See "Could not assess".

---

## 0. Did skipping the D1/D2/D3 design documents cost the design anything? Yes, four places

| # | What D1/D2 already decided | What D4 does | Consequence |
|---|---|---|---|
| C-1 | D2 5.3 step 9 and owner default OQ-1 (ruling D-7): a lesson with evidence is cancelled, and "a cancelled lesson with no remaining evidence can then be deleted with its own reason". D2 test 29: "cancel-then-delete works in two calls". | G-8 keeps a floor at every `cancel`, and `use_cancel` on delete reads the effective level. | Every taught lesson, once cancelled, can never be deleted. Test 29 of the existing 266-assertion suite goes red, while f.1 says only token-version and `kind` edits are allowed there. See R-6. |
| C-2 | D2 section 11: "do not add the guard migration to any existing suite's list, and do not edit these files"; `cancelled-lessons.test.mjs:57,78,82,84,90` and `class-overhead.test.mjs:251,259,418,905` do raw cancels that the guard refuses. D2-build B-9: re-running `stars-sync-engine`, `stars-sync-homework`, `ta-standing` with D1 + D2 was tried and "NOT BUILT" - their preludes lack `class_transcripts`, `payroll_periods`, `invoices`, `auth.role()`, so D1's preflight refuses to install. | f.1 loads "prelude + M1 + M2" or "all four" into `stars-sync-*`, `enrollment-*`, `invoice-status`, `family-payment-month`, `payroll-rows`, `cancelled-lessons`. M1's preflight needs D1 and D2 present. | The test plan as written cannot run. It needs a prelude extension per suite (budget it) and `cancelled-lessons` cannot take the guard at all. See R-11. |
| C-3 | D2 4 and threat model A-29: "The trigger exempts no role"; D2 test 6: a raw cancel is HC020 "as service role and as the superuser session". D2: the trigger "never modifies `NEW`". | The `owner` lane (no uid, no JWT role: SQL editor, any pg_cron job that runs SQL, the harness) passes every D4 guard; D4 says "as it does in D2", which is not what D2 does. G-1 rewrites `NEW.status`. | Not a hole against the trusted owner, but hand-made cron jobs on live are UNKNOWN (D0 F) and would pass every money guard with no row written. See A-1. |
| C-4 | D1 4.7 "One copy": `session_held_evidence` is the only place "was it held?" is answered. | The effective level is computed inline in `_session_change_assess` and again, differently worded, in the trigger's automation lane ("floor row present -> not NONE"). | Two expressions of one rule. See A-2. |

Not a contradiction (checked): D2's design said `GRANT SELECT` only to `service_role` on the audit tables; the LIVE file gives `GRANT ALL` plus an insert guard (`20261112091000:236`, review-2 F-9). D4 follows the live file. The 50-item bulk cap matches the live `BULK_CHUNK = 50`. The read-only preview ruling (review-3 F-1) is respected.

One stale fact in D4 (a): P12 and self-critique 3 say `excuse_attendance_outside_enrollment` rewrites marks when an enrollment's dates change. That trigger was dropped by `20261106100000_attendance_guard_no_auto_changes.sql:1`. The reach of P12 is still right (the calculator reads the enrollment window); the preview's "how many marks will be excused by the existing triggers" has nothing to count for a date edit.

---

## 1. Bypasses

### R-1 (blocker) The whole money guard reads bill labels that an admin can lower first. No floor for bill state.

`tuition_month_state` decides the tier from `invoices.confirmation_status`, `recorded_payment`, `status`, `tuition_frozen`. D4 guards only the last (G-16) and puts the rest out of scope in (g).
- Scenario: admin opens Automation -> Recorded Payment Manager and presses "reset to 0" on a child's March bill (`src/components/admin/RecordedPaymentManager.tsx:165-166`, a raw update; `InvoiceStatusManager.tsx:72-73` sets `status` raw; `confirmation_status` is writable raw under the admin policy). March is now "issued": T1. The admin then ends the enrollment in February, or excuses eight March marks, with one 15-character reason: no correction mode, no review, and with approval ON no second admin (the `tier3`, `families` and `paid` lines all read the same labels).
- This is F-11 again, moved from evidence to bills. It also already weakens D2's `settled` (same columns, `session_month_tuition_settled`), so the fix helps both.
- Second way to the same place with no bad intent: calculate-tuition itself moves `confirmed` to `needs_review` when figures change (root `AGENTS.md`, Bill status labels). After the first T3 correction of a month, every further change to that month is T1/T2.
- Smallest change: apply G-8's own idea to bills. One table `invoice_state_floor(student_id, month, state, first_at, causes)` written by a BEFORE UPDATE / DELETE trigger on `invoices` on every lane whenever a write lowers the state (confirmed/adjusted -> other, `recorded_payment` to 0 from > 0, `status` paid/partial -> other, frozen -> not, row deleted). `tuition_month_state` returns `max(state now, floor)`; D2's settled test reads it too. Nothing is refused, so the payment paths stay out of scope as (g) wants. One f.2 case and one mutant ("floor not read").

### R-2 (blocker) `repair-attendance` stays open: an admin puts billable marks into paid past months with the service key, no reason.

D0 lists it (S22 / O16). D4 names it only as an allow-list entry in f.4.
- Scenario: admin, Automation -> Attendance Repair, picks a child, a class, a date range covering last term and "Present". `repair-attendance/index.ts:96-107` inserts one billable row per lesson with no register row, `marked_by NULL`, on the service client. G-11 never sees it (service lane on `attendance` is never refused). Every one of those paid months rises on its next calculation.
- Smallest change: the insert is made with the caller's JWT (the function already requires an admin). G-11's trigger then binds ("a row appearing counts"); at T1+ the function answers `409 attendance_requires_checked_path` and the screen opens the money dialog. Add the function to (d), to f.2 and to the mutant list.

### R-3 (blocker) Service-key and trigger writers that D4 will break or leave unwired (found by grep; none is in section (d))

| Writer | What happens after M2 | Smallest change |
|---|---|---|
| `create-family/index.ts:140-156`: enrollment insert on the service client with a caller-chosen `startDate` | A family registered on the 13th whose child started on the 28th of last month: past month, class has lessons -> T1 -> the service lane is refused -> the function throws a 500 after the family and student rows were already created (it is not one transaction). | Insert with the caller's JWT and route T1+ to `money_change_checked('enrollment','enroll')`; or refuse a start date in a past month before anything is written, with the sentence "Create the family from today, then set the start date on the enrolment screen". |
| `manage-demo-student/index.ts:198-205`: delete + insert of the demo child's enrollments, service client | Refused at T1+ as soon as the demo class has a past lesson. | Same, or exempt nothing and document that the demo is reset from the SQL editor. |
| `auto_end_enrollments_on_deactivation` (`20260403051502`): BEFORE UPDATE trigger on `students` that sets `end_date = CURRENT_DATE` | Deactivating a child whose current bill is confirmed or frozen (T2) raises HC120 from inside the trigger. `StudentsList.tsx:106` shows a raw error; there is no checked path for "deactivate". | (d) gains the deactivation button: preview `('enrollment','end', today)`; T1+ runs the checked op first, then the deactivate. |
| `TeacherForm.tsx`, `TeachingAssistantForm.tsx` through `staff/PayRateFields.tsx:51-53`: write the mirror rate columns | `zz_staff_pay_mirror_guard` reaches `1900-01-01..today`, so it is T3 for anyone who has ever had a locked month. Saving the staff form with a changed rate fails with HC120 and no dialog. | Add both forms to (d) (rate goes through `('pay_rate','set')`), and make the mirror guard's reach only the dates no history row covers (the mirror is the fallback rate; where a history row exists a mirror edit pays nobody). |
| `FamilyMembersManager.tsx:40` (`students.family_id`), `families.sibling_percent_override` | Left open on purpose (owner question 9). See section 8, Q9: calculate-tuition reads the override directly (`calculate-tuition/index.ts:113`). | Section 8. |

### R-4 (blocker) G-11's trigger refuses ordinary register saves, because a PostgREST upsert fires BEFORE INSERT first

`AttendanceMarking.tsx:195-206` (teacher) and the rewired admin path of `mark-attendance` upsert every child of the lesson (`onConflict: 'session_id,student_id'`). Postgres runs the BEFORE INSERT row trigger for the proposed row before it finds the conflict. The spec says "a missing row is not billable": in the INSERT phase there is no OLD, so an existing Present re-saved as Present reads as "row appears, billable" -> crossing -> HC025.
- Scenario: a teacher re-saves the register of a lesson from five weeks ago to change one child from Present to Absent (allowed by owner question 4). All fifteen rows are upserted; the first one raises HC025; nothing is saved.
- Smallest change: in the INSERT branch the trigger looks up the existing `(session_id, student_id)` row and uses it as OLD. f.2 gains "upsert of an unchanged register in a T2 month passes" and "upsert Present -> Absent passes"; the functions suite drives a real upsert, not an UPDATE.

### R-5 (blocker, small) Identity of a discount row

G-12 refuses `student_id` / `class_id` changes on enrollments. G-13 does not for `discount_assignments` / `referral_bonuses`; its reach is computed for one student.
- Scenario: `UPDATE discount_assignments SET student_id = <new child>` on a 30% discount that covered a paid year of child A. If the trigger asks for the reach of NEW only, the tier is T0 and A's twelve paid bills lose the discount on the next calculation.
- Smallest change: HC121 `discount_identity` for a changed `student_id` (and the bonus's person columns), every lane but owner. One case, one mutant.

### The designer's named weak spot: teachers' retro marks through `mark-attendance` checked in the function, not the database

Verdict: **acceptable for prevention, not acceptable as the only record.** Reasons:
- A teacher has no way to the service key except this function, and the function asks the database's own rule. That is as strong as the function's deployed version.
- What the database cannot see: (1) the OLD `mark-attendance` during the window between the migrations and the function deploy, and after any rollback of the function; (2) R-2's kind of function; (3) a function deployed by hand that is not in the repo. In all three an ADMIN's retro mark through `PastAttendanceEditor` is also unguarded - section (h) says "every newly guarded action is refused by the database (closed)" in that window, and for P11 that is not true.
- A trigger that RAISES on the service lane is wrong (it would abort a sync page), so it need not be "a trigger that refuses". **R-7: it must be a trigger that records.** On the service lane, a direct attendance write that crosses the billable line in a month whose tier is 1 or more inserts one `money_change_events` row (`service_retro_mark`, session, child, old and new status, `marked_by`) and lets the write through; the money review queue lists them. A trigger can insert without raising. Then a missing function check is visible the next morning instead of never. Also correct the sentence in (h).
- Simplify the teacher rule at the same time (A-3): refuse a teacher's Excused switch by the lesson's MONTH being past, not by the bill's state. As designed, `attendance_change_allowed` answers `allowed: false` in the current month exactly when the bill is confirmed or frozen, so a teacher learns that bit by probing (the leak class of D-review-1 A-1), and see R-8.

### Paths that stay open after D4 (D0 numbering)

| D0 | Path | Status after D4 |
|---|---|---|
| S22 / O16 | repair-attendance | OPEN - R-2 |
| O21 | raw invoice label writes | OPEN and it undermines the tier - R-1 |
| O13, O14, O20 | create-family, demo, deactivation trigger | broken or unwired - R-3 |
| O25 | family link, sibling override | OPEN by default 9 - section 8 |
| O24, O5-O9 | ledger and payment tools | out of scope, own guards; accepted |
| O26 | `payroll_adjustments` (carry forward) | open; itemised with a reason by design. A-4: add it to the approval reasons, it is the one screen that pays staff an arbitrary amount. |
| S16-S19 on a lesson that has STARTED but is not Held yet | teacher swap is free (g), then the register makes it Held and pays the new teacher, also in a locked month (a `hold` with marks is not a kind) | OPEN in two harmless steps - A-5: `reteach` applies to a started lesson older than the 7-day window, and a person's `hold` in a locked payroll month is T1 even with marks. |
| O16, current month | a person-marked Present switched to Excused for a whole taught class | free at T0 by design (teacher or admin). It is the tuition half of a cancel with no reason. A-6: when a mark a PERSON made as Present / Late is switched to Excused more than 7 days after the lesson, an admin gives a reason whatever the month; inside 7 days it stays free and the floor records it. |
| S7 then S20 | create a future lesson (free), then move it into a past month | reviewed and reasoned by D2's move (T1, destination started), but G-7 would have made the same thing T3 against a confirmed month. A-7: a move whose destination has started takes the higher of D2's tier and G-7's. |

Checked and found closed by the design as written: re-parenting a register row (G-9, every lane); deleting a student or class to cascade (G-18, RESTRICT); delete-and-recreate of an enrollment (both ends guarded by reach); the import (G-17 plus the service lane); a second transaction between preview and confirm (advisory lock, row locks, token recomputed under them); forging the flag (override row + txid, D2's argument holds for the money flag because only the definer function inserts the row). One small gap in that last one, A-8: `_money_ack` matches entity, target, child and window but not the tier; a payment recorded between the plan and the write leaves a row that says T1 over a write the trigger would call T2. The trigger should compare its own tier with the row's and raise HC011 when higher.

G-1's service lane, A-9: "a `stars_sync_held_flips` row exists" lets ANY service-lane writer un-hold a started lesson the sync once flipped, including a repaired `normalizeFutureHeld` on an admin's evening run. Add "and no register row with `marked_by IS NOT NULL` and status Present / Late remains" (the engine restores or deletes the marks before it un-holds, `20261028090000:569-611`).

---

## 2. The evidence floor

### R-6 (blocker) The floor can be raised falsely, permanently, by people D1 refuses - including a child

G-8: "If D1 cannot be read from inside the trigger (the caller is someone D1 refuses, or it raises), the floor is set to STRONG."
- D1 refuses everyone who is not admin, internal, or teacher of the class (`20261112090000:249-258`). `SECURITY DEFINER` does not change `auth.uid()`, so a keep trigger fired by a student's or parent's own write calls D1 as that student and gets 42501.
- Scenario: `homework_submissions` has "Students can update own submissions" policies. A child re-submits and the write clears `graded_at` (or a child sends `graded_at: null` by hand). `zz_homework_evidence_keep` fires for "every lesson of the homework's class on the Hanoi day of its `created_at` and on its `due_date`"; D1 raises; each of those started lessons gets floor STRONG, families `{"unknown": true}`. The floor table refuses every UPDATE that lowers and every DELETE, for every role. From then on those lessons are T2 or T3 to cancel (T3 nearly always, because with a floor "settled" is judged over every child and the month is paid in advance), can never be deleted (`use_cancel`), and with approval ON need a second admin - for lessons that may never have had any evidence.
- Smallest change: the keep must not ask D1 as the caller. Either (a) split D1 into an ungranted core without the viewer test and a public wrapper that keeps it, the keep calling the core (D1 becomes one more replaced live object in f.6 - say so); or (b) without touching D1: on SQLSTATE 42501 store only what the removed row's own family could prove on its own (homework -> SOFT/H, points -> SOFT/P, unlinked transcript -> SOFT/T, a person's Present/Late or a linked transcript -> STRONG/D), and keep STRONG for every other error. Test: a student-lane write on each evidence table stores no more than that.
- Same finding, D2 conflict C-1: the floor must not make a cancelled lesson undeletable. For action `delete` on a row that is already `Canceled`, `use_cancel` reads D1's level now, as D2 decided; the floor still raises the tier and the review flag.

### Other answers

- **Raised falsely by staff, honestly:** a teacher saves the register on the wrong lesson (D1's own risk row), then corrects it to Excused; or awards a point to the wrong class and deletes it. The floor keeps STRONG / SOFT for good. The cancel is still possible (reason, tick, second reason), so this is friction, not a block - except with approval ON and the other admin away (section 5). The "Removed since" card says who and when, which is the right way out. No change required; A-10: let the card's wording say "this was recorded and later removed by <name>" so the admin's reason can be one sentence.
- **Evaded by a new lesson and moved children:** not found. Register rows cannot change lesson or child (G-9); points and transcripts re-pointed or re-dated fire the keep for the OLD lesson first; a move keeps the floor; the destination-day rule of D2 still applies. The real evasion is not of the floor but around the cancel: A-6 above (excuse the class in the current month).
- **Lessons that existed before the floor:** the design leaves them with no floor and says so. A backfill that rewrites no history is possible and cheap for one family: insert floor rows from `audit_log` for attendance and `sessions` status erasures (the same three branches `_session_erased_recently` reads, without its 30-day limit, back to when `20261009130000` was applied). New rows in a new table; no session, bill or mark is touched. Points and transcripts have no audit before D4, so they cannot be backfilled; the release note must say that. A-11.
- **Cost:** one D1 call (about a dozen indexed reads) per lesson per transaction, only when a person's mark, a positive participation row, a transcript or a homework row is changed or removed on a STARTED lesson; skipped when the floor is already STRONG. A cancel now costs two D1 calls instead of one (assess, then the keep): fine at the 50-item bulk cap. Storage: one row per lesson that ever lost evidence, causes capped at 20. Acceptable.
- **Locks, A-12:** the attendance keep runs under the session row lock the existing guard already takes, so its floor upsert is serialised. The point / transcript / homework keeps take no session lock and may upsert floor rows for two lessons of one class-day in row order; two concurrent deletes can deadlock. Sort the lessons by id inside the keep.
- **One rule, A-2:** put `max(level now, floor)` in one function (`session_effective_level(session_id, d1 jsonb)`) used by assess, by `use_cancel` and by the automation lane, and say in D1's header that D5's owner SQL must call it, not D1 alone.

---

## 3. The money-change guard (reach -> tier)

**Is reach computed in the database, in the transaction of the write, from server-side facts?** Yes, twice: `_money_change_plan` under the advisory lock and the target row locks, and again by each table's trigger at the moment of the write (`tuition_reach` / `payroll_reach` are STABLE definer functions reading tables only; nothing from the client decides). The bills the reach reads are not locked, hence A-8. The facts themselves are the weak part: R-1.

**Can the preview be stale at confirm?** Not usefully: the token covers the args, the tier, `md5(row_before)` and a fingerprint of the reached bills and their states, and is recomputed under the locks (HC011). A T0 change needs no token, which is right.

**Does it fail closed when reach cannot be computed?** As specified, yes: any error in `tuition_month_state` is tier 3, a NULL is 3, an unknown lane is a person. Three places where the design chooses open, to be decided knowingly:
1. A past month with no bill row and no lesson of the child's class is T0. Fine.
2. `mark-attendance` treats a missing `attendance_change_allowed` as "behave as before". PostgREST also answers PGRST202 for a few seconds after a paste, before its schema cache reloads. A-13: when the RPC is missing and the lesson's month is past, answer 503 and write nothing.
3. The reach of an enrollment or discount write is the row's OWN child. Ending child A's enrollment can change the family's sibling winner and so child B's bill for the same months; B is in neither the tier nor `refresh_pairs`. I could not establish from the files read whether an already assigned month is re-decided (see "Could not assess"). **R-8a:** the oracle (f.3) uses a family of TWO children with a sibling discount and asserts over both children's bills; if it goes red, the reach of enrollment and discount ops becomes "every child of the family".

### R-8 (blocker) "Confirmed in the current month = T2" plus "teachers are refused at T1+" stops the daily register

b.0: the current month is T0 unless the bill is confirmed, adjusted or frozen, then T2. G-11: a teacher is refused at T1 or more; an admin needs the dialog.
- Scenario: the admin confirms November's bills on the 3rd (the design itself expects "the week bills are confirmed"). On the 10th a child is ill. The teacher opens today's register and switches that child from the seeded Present to Excused: HC025, "ask an administrator" - for today's lesson, every day until December. The admin then types a 15-character reason for each ordinary absence, which is exactly the "ok ok ok" habit b.0 says it wants to avoid. `stars_sync_resolve_conflict` is refused the same way.
- Smallest change: a register mark is register work while the lesson is recent. G-11 does not apply to a lesson that ended 7 days ago or less (the same 7 days G-6 already uses for assistants), on any lane, whatever the bill's state; T1 of the invoice-status rules already flags a confirmed bill that moves (`needs_review`, `changed_after_confirmation`). After 7 days: a teacher is refused (by the lesson's age, not the bill - A-3), an admin gets the tier of the table. f.2: "confirmed current month, lesson today, teacher marks Excused -> allowed".

### R-9 (blocker) G-14 turns a silent, lazy re-pricing of history into a reasoned, immediate one - done by D4 itself

Today a class-fee change re-prices an unfrozen past bill "the next time it is opened". With G-14 the admin gives a reason, and then the standard refresh runs calculate-tuition for every `(child, month)` in `refresh_pairs` - which f.3 requires to contain every past month that moves. So one honest fee rise:
- asks for T2 or T3 (past months are paid in advance, many confirmed): reason, tick, second reason, review queue, and a second admin when approval is on (`tier3`, `families`, `paid` all fire). That is the opposite of "an honest future fee rise passes without friction";
- then re-prices every unfrozen past bill of the class in one go, flips confirmed bills to `needs_review`, and leaves paid families owing a difference for months they settled. The money rule is "never rewrite historical invoices"; the design's own text says G-14 "does not stop" this;
- and cannot finish: a class of 12 over 10 months is 120 calculator calls against a limit of 30 a minute (review-3 F-8 already found the bulk refresh mostly fails on its first pass).

Is the answer effective-dated rows? Yes, and it matches what the project already has: `staff_pay_rates(effective_from)` with one resolver (`payHistory` / `pay-history`, a mirrored pair) and `class_schedule_versions(effective_from)`. A `class_fee_history(class_id, effective_from, session_rate_vnd)` with a "fee on the lesson's date" resolver in calculate-tuition is the same shape; the first row is dated before the class's first lesson so no existing figure moves (the golden file proves it). It is NOT the enrollment pattern (splitting rows): a class fee is one value for many children.

Smallest change to D4, in order of preference:
1. Build dated class fees as part of D4 (a step B0 before B1; it touches calculate-tuition and its bulk and projected readers, so it needs its own golden-figure gate). G-14 then guards only a row whose `effective_from` is in a past month - the pay-rate rule, word for word - and an honest rise from next month is T0.
2. If it stays a follow-up: G-14 refuses (does not merely ask) while any unfrozen past bill of the class is paid, confirmed or adjusted, and the dialog offers the way forward as a button, "Freeze these N past bills, then change the fee" (freezing is the existing, protective write; one reasoned batch). `refresh_pairs` for `class_rate` holds the current month onward only; past months are listed, never refreshed by D4.
Either way the owner is told in plain words not to change a class fee before this ships.

### Dated terms for enrollments (`set_terms_from`): right, with two conditions

Consistent with `change_enrollment_days` and the rule in `supabase/AGENTS.md`. A-14: (1) the screens offer "from this date" as the default and the whole-span `set_rate` / `set_discount` only as "correct a mistake for the whole enrolment" - otherwise staff will keep choosing the in-place edit and meeting T2/T3; (2) `supabase/AGENTS.md` says a weekday split "preserves a discount rather than creating another" because identical terms are grouped once; a terms split makes the two halves differ on purpose, so the oracle needs a case with a once-per-month and a per-lesson discount across the split date.

---

## 4. Fail-closed, and the existing guards

Weakened or routed around:
- **The live session guard.** Not weakened in logic. Three things to pin: (1) C-1 / R-6, the delete of a cancelled lesson; (2) M1 replaces `_session_change_apply` with a new signature and drops the old one while the LIVE `manage-session` v4 and `bulk-cancel-sessions` v4 are still deployed. The design says the four public wrappers "pass one more argument". **R-10:** state that the public signatures of `cancel_session_checked`, `move_session_checked`, `uncancel_session_checked`, `cancel_sessions_checked_bulk` and `session_change_preview` are unchanged, and add a test that drives the CURRENT functions (as the release commit has them) against prelude + M1; (3) G-1 makes the trigger modify `NEW` for the first time. It runs last (`zz_`), so no later BEFORE trigger sees a stale value; say so, and assert `audit_log` gets no row for the kept lesson.
- **Closed-payroll trigger:** untouched. `reteach` / `retime` / `restaff` in a locked month never write `payroll_lines`. Good.
- **Frozen bills:** strengthened (G-16). Under R-9 option 2 the freeze becomes a tool; unfreezing those bills later is T2/T3, which is the intended direction.
- **Invoice-status rules:** D4 writes no label and its refresh is the standard calculate-tuition call. The R-1 floor trigger must be BEFORE and must never change `NEW`, so `_lib/invoice-status.ts` keeps deciding the labels.
- **The two-step:** kept for T1+. The approval hook sits inside the apply with `COALESCE(required, true)`. That is closed, but it means a damaged settings row or a failing `change_approval_needed` stops every checked change in the school while approval is "off". A-15: a missing settings row raises HC050 `guard_broken` with the repair statement, instead of reading as "approval required".

Does the design itself rewrite history?
- Migrations: no `UPDATE` of an existing row, no backfill; the two `ALTER TABLE`s touch the override table's shape only. Good.
- At run time: the G-14 refresh (R-9). The G-9 residue refresh re-prices the bill of a child whose mark was swapped away before D4; that corrects a bill that is already wrong and is recorded - accepted.
- `reteach` sets `is_manual = true` and `manual_reason` on the lesson. Harmless for a Held lesson (the rebuild only touches future Scheduled ones); say it in the build note so nobody reads it as a schedule change.
- `('attendance','set_marks')` writes `marked_by = the admin`. D1 then reads those rows as a person's register (STRONG). An admin correcting last month's mark from the office creates "a person recorded the child as there". Accepted by D1's rule (an admin's mark counts), but the dialog should say "this is recorded as your mark".

Owner lane (C-3), A-1: keep it, but (1) each pass on the owner lane that a person would have needed a reason for inserts one event row (`owner_lane`, table, id) - a trigger can insert without raising - so the review screen shows it; (2) the release note lists the pg_cron jobs found on live before the paste (the D0 "unknown").

---

## 5. Two-admin approval (built OFF)

- **Can the requester edit the request after approval?** No. There is no "approved, not yet applied" state: approving IS applying, in one transaction, and both tables are append-only. Good.
- **Is what is approved bound to the exact change?** Yes: the request stores the checked function's arguments (reason included) and a fingerprint; the approver's call recomputes the plan under the locks and compares; `_change_request_claim` accepts only this request, this fingerprint, this transaction. A different change cannot ride on it. One inconsistency to settle, A-16: the override stores `actor_user_id = A`, but the write runs as B, so `sessions.canceled_by` / `updated_by` and `audit_log.actor` say B. Write the requester into `canceled_by`, or say in the review screen that the audit row shows the approver.
- **Expiry:** 7 days, fixed at request, staleness checked at approval anyway. Fine.
- **What a waiting request blocks:** only a second request for the same target (HC063). Month close and confirmation are not blocked. Agreed. HC063's text must say what to do: "open it and approve, reject, or ask the requester to withdraw".

### R-12 (required before approval may be switched ON; cheap to specify now) The amount and family lines can be split

Impact is computed per plan, and a bulk is "one request per item".
- Scenario: BulkEnrollmentDateSetter over a class of 15 children from 15 families, each with paid past bills. Each item is one enrollment: `families = 1`, `paid_vnd` about one child's months. No item reaches 3 families or 5,000,000 VND. The one tool the `families` line was written for never trips it. By hand the same works for discounts, one child and one month at a time.
- Smallest change: (1) `money_changes_checked_bulk` and the session bulk compute ONE impact over the whole batch (distinct families, summed payments) and every item inherits "approval required"; one request per batch, which the approver reads as a list; (2) `change_approval_needed` adds the same actor's applied T2+ changes of the last 24 hours to `families` and `paid_vnd`. Test: 15 single-family items -> required.

Also specify before it can be turned on:
- **Deadlock.** Two admins, one away for two weeks: every T3, closed-month and unfreeze change stops, and the only way out is one statement in the SQL editor that switches the whole rule off. For a non-technical owner at 8 pm that is the wrong shape: it is all or nothing and leaves no trace in the approval tables. A-17: a setting `solo_release_after_hours` (NULL = never, the default). When set, the requester may apply their own request once it has waited that long with no decision; the override is stored with `approved_by NULL`, `released_alone = true`, is always in the review queue, and the absent admin sees it first on return. A delayed, recorded act by a named person is not a bypass; switching the guard off from SQL is closer to one.
- **Granting the admin role while ON** "needs the other admin", but no checked function for it exists in the RPC list (`rpc` names "which checked function this will run"). As designed, adding an admin while approval is on is possible only from the SQL editor. Say that, or add `grant_admin_checked`. A-18.
- **Resetting the other admin's password** through an admin tool is a second account under one person's control made on the spot. Out of scope as stated, but `zz_admin_grant_guard` covers only `user_roles`; list any admin password-reset function as a residual the owner reads on the day it is switched on.
- **T3 is wider than (e) says.** With the floor, "settled" is judged over every child, and months are paid in advance, so nearly every cancel of a lesson that ever had a register is T3. The load estimate ("a handful a month") should be re-stated after R-6 and R-8.

**Thresholds for a small school:** T3, closed payroll month and unfreeze as fixed lines - agreed. Three families - agreed once batches count as one (R-12). 5,000,000 VND - the design's own example fee is 150,000 to 170,000 a lesson, so roughly 1.2 to 1.4 million a child a month; 5,000,000 is three to four months of one child, a sensible line for "one family, but a lot". Loosening the rule needing the other admin - agreed. Add `payroll_adjustments` (A-4).

---

## 6. Operability for a non-technical owner and a few staff

Extra work for an honest correction, as designed (a "dialog" = open, type a reason of 15+ characters, tick, confirm: three actions; T3 adds a second reason and a later review click):

| Correction | As designed | After the required changes |
|---|---|---|
| Absent marked instead of Present, last week | 0 (both are charged; no line crossed) | 0 |
| Present marked instead of Excused, last week, same month, bill not confirmed | 0 | 0 |
| The same, bill already confirmed | admin: one dialog (T2); teacher: refused | 0 inside 7 days (R-8) |
| The same, last month, after the 7th | paid: one dialog; confirmed: T3 dialog + review; approval ON: + a second admin. Teacher: refused, told to ask an admin. | same - this is the intended friction |
| Moving a lesson | D2's rule, unchanged | same |
| Changing the time of a lesson already Held (same day) | was 0, now one dialog; T3 in a closed month | same |
| A cover teacher recorded after the register was taken | one dialog every time (T1), T3 in a closed month | A-19: free while the payroll month is open and the lesson ended 7 days ago or less, the rule G-6 already gives assistants; it is audited |
| A child who joined mid-month | 0 (T0; two invisible calls) | 0 |
| A child who started on the 28th, entered on the 13th of the next month | one dialog (T1) from the enrolment screen; from Create Family: a 500 with the family half-created | one dialog in both places (R-3) |
| A fee typo (1,500,000 for 150,000) | the typo AND its fix are each T2/T3 with a second reason; approval ON: a second admin for each, while bills calculate at the wrong fee | dated fees: fix the row dated today, T0 (R-9). A-22 meanwhile: undoing your own change within 30 minutes, back to the stored `row_before`, is T1. |
| Editing a teacher's rate in the staff form | HC120, no dialog | dialog (R-3) |
| Deactivating a child with a confirmed bill | raw error | dialog (R-3) |

Where staff are stuck at 8 pm with no way forward, as designed: (1) the unwired writers of R-3 (the message says "open it again", and there is nothing to open); (2) a teacher marking an absence in a month whose bills are confirmed (R-8); (3) approval ON with the other admin away (A-17); (4) the window between the migrations and the UI push (closed by design; do it in one sitting, outside teaching hours, as (h) says).

Refusal texts that do not yet say what to do next (b.4): HC120 on a screen with no dialog ("Change this from the enrolment / discount / staff-rate screen, with a reason" per entity); HC020 for the new kinds (one sentence per kind: "Change the teacher of a held lesson from the lesson's Actions menu, with a reason"); HC063; HC061 should name who can approve. The rest are fine.

---

## 7. Build risk

- **R-10 (ordering against the live 66 objects).** M1 replaces about fourteen live objects in place. Add to the preflight: for every D2 function it replaces, the md5 of the live body equals the value in `D-release-fingerprint.expected.json`, else refuse to install (someone pasted something else; do not write over it). Public RPC signatures unchanged, proved by driving the functions as they are deployed today against prelude + M1. Every D4 file ends with `NOTIFY pgrst, 'reload schema'` like D1 and D2; (c) does not say so, and without it the new RPCs answer "not installed".
- **R-11 (the test plan cannot run as written).** See C-2. Name the suites that really get D4 loaded and budget the prelude work (D1's preflight needs about a dozen tables and `auth.role()`); `cancelled-lessons` and `class-overhead` keep running without the guard, and what they protect is re-asserted through the checked path, as D2 did. State the expected assertion count per suite so a suite that silently loaded nothing is seen (the project's own notes: "a green check can mean it checked nothing").
- **R-13 (no rollback).** D2 has section 12 and `scripts/ROLLBACK-session-cancel-guard.sql`. D4 has nothing, and it changes the busiest tables of the school (`attendance`, `enrollments`). Required: one script per migration that drops the new triggers only (tables and rows stay), plus re-pasting `20261112091000` to restore the D2 bodies; a pgtest case that applies D4, runs the rollback, and gets the D-release fingerprint 66/66 again; and the sentence for the owner saying which symptom means "roll back M2" (teachers cannot save a register).
- **Idempotency.** `DROP CONSTRAINT IF EXISTS` then `ADD` is right (the live name is the default `session_cancel_overrides_action_check`). The drop of the 11-argument `_session_change_apply` must be `IF EXISTS`. The prelude's create-only-if-missing stubs are right. A second paste of M1 after M3 is safe as described.
- **GRANTs.** Follow the house rule and the live file. Missing from (c): grants on the two new views of M2 and on `change_approval_queue`; `REVOKE ... FROM PUBLIC` on every new function before the grants (D2 does this in one block).
- **Trigger interplay.** Checked on paper: the cancel's excuse-all (depth 2) passes G-10 / G-11 and still feeds the keep; the enrollment seed passes by depth; the sync runs on the service lane and its `hold` is allowed. Not safe: `auto_end_enrollments_on_deactivation` (R-3). Not covered by any case: two money triggers on one statement (an enrollment `transfer` writes two enrollment rows and deletes marks under one acknowledgement that is not consumed) - add a case that a SECOND, unrelated enrollment of the same child cannot be changed inside that window by anything the RPC calls.
- **`ai_plan_check` re-created by copy in M2 (A-21).** It is a live function outside the D fingerprint, and the project's notes say a fix to the AI-actions SQL is waiting on another branch. Whichever is pasted second reverts the other. Smaller: do not re-create it. `ai_action_apply` runs as the admin, so the trigger refuses the write and the whole action rolls back (all or none, as today); `src/lib/aiActions.ts` words HC120. The card loses the early warning, nothing is weakened.
- **Guards with no test that fails without them:** the upsert shape of a register save (R-4); a discount row re-pointed (R-5); G-18 on the service lane and for the "has a person's mark" condition alone; the class DELETE guard; "service is refused" per table (mutant 40 is one mutant for eight triggers - make it one per trigger); G-1's "no flips row and started" on the SERVICE lane (mutant 10 covers the locked month only); the keep for `homeworks` and `homework_submissions` (mutants 17-19 cover three of five tables); `hec.floor_seen` keyed wrongly (bulk-cancel two taught lessons in one transaction, both must have a floor); the pay side has no oracle at all - `payroll_reach` is asserted against itself. Add a small pay oracle: change a rate, a teacher, a time and an assistant behind the guard's back, run the bundled calculate-payroll for an open and a locked month, and require tier >= 1 whenever a figure or `live` moved.
- **Are the two tracks disjoint?** Nearly, not fully. Shared in fact: `d4-functions.test.mjs` ("the A half", "the B half" - one file, two people: split it in two); the error-code maps in `_lib/session-guard.ts` and `src/lib/sessionGuard.ts` (track A's files, but HC120 / HC121 / HC025 are needed by B's first test); `Fields.tsx` / `GuardDialog.tsx` (A edits them while B builds on their layout); `mark-attendance` (A) calling `attendance_change_allowed` (B's SQL) and `PastAttendanceEditor` (B) reading `mark-attendance`'s 409 body (A); the `stars-sync-*` suites (A) loading M2 (B); both tracks put a `zz_` trigger on `attendance` and nobody owns the combined case until step D. Smallest change: step 0 also lands the code maps, the two 409 bodies as a written contract, and one combined "both attendance triggers" suite stub that A and B each add cases to in their own `describe` file.

---

## 8. The owner questions and the defaults

| # | Designer's default | Verdict |
|---|---|---|
| 1 | Approval built, left OFF | Agree (owner decision). It must not be switched on before R-12 and A-17 exist; say so on the settings card. |
| 2 | 5,000,000 VND | Agree as the starting figure (about three to four months of one child at the fees the design quotes), counted per batch and per actor per day (R-12). |
| 3 | Month grace of 7 days | Agree. Add the per-lesson 7 days for register marks (R-8), so the rule staff learn is one number: "a week". |
| 4 | Teachers cannot make old-month Excused changes | Agree, with the rule keyed to the lesson's age, not the bill's state (A-3, R-8): no teacher ever learns whether a family's bill is confirmed, and today's register always works. |
| 5 | Build "from this date" for rates and discounts | Agree. It is the existing dated-enrollment pattern. Make it the default choice on the screens (A-14). |
| 6 | Dated class fees as a follow-up; D4 only asks for a reason | **Disagree.** Build dated class fees inside D4, or refuse-and-offer-freeze meanwhile, and never refresh past months after a fee change (R-9). A guard that asks why and then re-prices paid months is worse than the silent version: it has the owner's signature on it. |
| 7 | Retire "include held lessons" | Agree. The service lane is refused anyway; the one-at-a-time path exists. |
| 8 | Close the import for lessons, registers, enrolments, discounts on a live system | Agree, and go one step further: remove those tables from the whitelist outright (the dry run can still count them) instead of testing "payments has a row", and drop `classes.session_rate_vnd` from what an import may change. |
| 9 | Sibling and family links unguarded, audit only | **Better default: guard them, with a reach that needs no knowledge of the sibling module.** calculate-tuition reads `families.sibling_percent_override` at calculation time (`calculate-tuition/index.ts:113`), so editing it is the same in-place, undated re-pricing as P13. Rule (R-14): a change to `families.sibling_percent_override`, `students.family_id` or `students.sibling_discount_from` has the reach "every child of the old and the new family, every month"; T0 while none of those months is past or signed off, so linking a new family is free; otherwise the checked path with a reason. Keep `audit_families`. |
| 10 | A request waits 7 days | Agree. |

---

## REQUIRED changes to the design (blockers)

1. **R-1** A floor for bill state (`invoice_state_floor`), read by `tuition_month_state` and by D2's settled test; lowering a label no longer lowers the tier.
2. **R-2** `repair-attendance` writes with the admin's JWT; G-11 binds it; add to (d), f.2, mutants.
3. **R-3** Wire or fix `create-family`, `manage-demo-student`, student deactivation (`auto_end_enrollments_on_deactivation`), `TeacherForm` / `TeachingAssistantForm`; narrow the mirror guard's reach.
4. **R-4** G-11's INSERT branch treats an existing row as OLD (PostgREST upsert); tests drive a real upsert.
5. **R-5** A discount or bonus row cannot change child (HC121).
6. **R-6** The keep never asks D1 as the caller (a child can raise a permanent STRONG floor today); a cancelled lesson stays deletable as D2 and the owner decided.
7. **R-7** Service-lane register writes that cross the billable line in a tier 1+ month are recorded and queued; correct the "closed" claim in (h).
8. **R-8** Register marks are free for 7 days after the lesson on every lane, whatever the bill's state; **R-8a** the oracle uses a two-child family.
9. **R-9** Class fee: dated fees in D4, or refuse-and-freeze meanwhile; D4 never refreshes past months after a fee change.
10. **R-10** Public RPC signatures unchanged and proved against the deployed functions; preflight md5 of every live object replaced; `NOTIFY pgrst`.
11. **R-11** A test plan that can run: prelude work budgeted, `cancelled-lessons` / `class-overhead` left without the guard, expected counts stated.
12. **R-12** Approval impact per batch and per actor per day (may be built with step C; approval must not be switchable on without it).
13. **R-13** Rollback scripts and a test that the D-release fingerprint is 66/66 again after them.
14. **R-14** Family and sibling fields guarded with the over-inclusive reach.

## Advised changes

A-1 owner-lane passes leave an event row; list live cron jobs before the paste. A-2 one `session_effective_level` function. A-3 teacher rule by lesson age (no bill-state leak). A-4 `payroll_adjustments` among the approval reasons. A-5 `reteach` on a started lesson past the window; a person's `hold` in a locked month is T1. A-6 a person's Present/Late switched to Excused after 7 days needs an admin's reason in any month. A-7 a move into the past takes the higher of D2's and G-7's tier. A-8 the trigger compares its tier with the override's. A-9 G-1's flips-row lane also requires that no Present/Late mark by a person remains. A-10 wording of the "Removed since" card. A-11 backfill floor rows from `audit_log` (insert-only). A-12 keep sorts lessons by id. A-13 `mark-attendance` answers 503 for a past-month mark when the RPC is missing. A-14 "from this date" is the default on screens; oracle case for discounts across a terms split. A-15 a missing approval settings row is `guard_broken`, not "approval required". A-16 who is stored as `canceled_by` on an approved change. A-17 `solo_release_after_hours` (off by default) as the way out of a two-admin deadlock. A-18 say how an admin is added while approval is on. A-19 teacher change free for 7 days in an open month. A-20 grants on the new views and `REVOKE FROM PUBLIC` on every new function. A-21 do not re-create `ai_plan_check`. A-22 undo of your own change within 30 minutes at T1. Correct P12's mention of the dropped `excuse_attendance_outside_enrollment` trigger.

## What I could not assess

- Nothing was executed: no suite, no probe. Every scenario is reasoned from the files cited; R-4 (BEFORE INSERT fires before the conflict) is standard Postgres behaviour and should be the first thing the implementer proves in pglite.
- The live database: policies, hand-made cron jobs, whether bills are in practice confirmed every month (R-8's weight depends on it), real fee levels behind the 5,000,000 figure.
- Whether an already assigned sibling month is re-decided when a sibling's enrollment or the family link changes (I read only the calculator's select at `:113`, not `compute-sibling-discounts` or `sibling-state.ts`). R-8a and R-14 are written to be right either way.
- Whether a child's own write can in fact clear `homework_submissions.graded_at` (a later integrity migration may protect the column). R-6 does not depend on it: any caller D1 refuses has the same effect, and the fix is the same.
- `D-review-1/2/3`, `D2-threat-model`, `D2-build`, `D2-edge-build`, `D3-dialogs`, `D3-review`, `D-ship-fixes`, `bulk-cancel-sessions`, `_lib/session-guard.ts` and `src/lib/sessionGuard.ts` were read by outline and by the passages D4 depends on, not line by line; the first 180 lines and the RPC bodies (lines 740-1170) of `20261112091000`, and most of `20261112090000`, were not re-read. A contradiction with a detail in those parts could have been missed.
- `src/lib/mcp/**` tools and whether any writes a guarded table as the caller (they would meet HC120 with no dialog).
- The React side of (d) beyond the files grepped.

## Verdict

**BUILD WITH THE REQUIRED CHANGES.** The structure is right and is D2's own: one classifier, one override row, the same flag and token, tiers from stored facts, nothing priced in SQL, approval inside the only functions that can write an override. No finding needs a different architecture. But as written it would (a) leave the tier lowerable through bill labels and the repair tool, (b) stop ordinary register saves and several ordinary admin screens on the day it is pasted, (c) let a child's homework edit lock lessons at the strongest level for good, and (d) make D4 itself the thing that re-prices paid months after a fee change. R-1 to R-11 and R-13, R-14 go into the design before step 0; R-12 before approval can be switched on.
