# D4 design review (adversarial critic)

Reviewed: `docs/evidence/D4-design.md` at c21c415 (conductor branch). Review only: no code, no push, no deploy, no database access. Nothing below was executed; every claim about code cites a file I read in this checkout.

**Where I am / next step:** sections 1-2 written. Next: sections 3-5.

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
