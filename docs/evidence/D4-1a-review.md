# D4 step 0 / 1a (the two floors) - build review

Reviewed: commit e3367ffe (branch `worktree-agent-a8fa73ee4063a7b1b`), detached. Review only: no code change, no push, nothing applied. Live access (`aswgmbefikhsnhogtryv`): read-only catalog queries only (function md5 / flags / grants, trigger list, policies, index list, `reltuples`, migration names). No row about a person was read.

**Where I am / next step:** sections 1-2 written. Next: sections 3-7 (live diff, floors on old lessons, design questions, tests and my mutants, the apply brief), then the verdict.

`M` = `supabase/migrations/20261113100000_d4_floors.sql`. Probes marked "executed" were run by me in pglite against the real migration files (script kept outside the repo); they print facts and change nothing in the tree.

Findings: **C-n** = change I ask for before the apply; **N-n** = note / can follow.

---

## 1. Does the file build Revision 2's step 1a, and are the two routes closed?

**Built to the specification.** Tables, guard, keep, `session_effective_level`, `invoice_floor_state`, the seven trigger objects, the audit trigger on points and the two replaced bodies match design c.1 (`D4-design.md:241-315`) line for line, with the deviations the builder declares (no `hec.floor_seen`; submissions keep on any `graded_at` change; the wider "who was on the register" list). I found no undeclared deviation.

**F-11 as stated is closed** (executed by the builder's V7 case and re-read in `M:294-365`, `M:447-516`): the keep runs in a BEFORE row trigger, calls D1 while the row is still there, and the floor is what `_session_change_assess` now takes its tier from (`M:726-727`). Re-dating a point, unlinking or deleting a transcript, deleting marks on the service lane, un-holding and moving the lesson all leave the level they found.

**The bill-label route is closed for the lesson guard** (`M:584-639`, `M:670-672`, read by assess): un-confirming, lowering or zeroing `recorded_payment`, leaving paid / partial, un-freezing, deleting or re-keying the bill are each recorded before the write, on every lane, with `NEW` untouched. `zz_` sorts after the two live BEFORE triggers on `invoices` (`keep_frozen_invoice_amounts`, `update_invoices_updated_at` - live catalog), so it sees the final row. Note the money guard that will read this floor (`tuition_month_state`) does not exist until step 1b; in 1a only cancel / move / delete of a lesson benefits.

**Neither floor is writable or lowerable through the API.** `_floor_table_guard` (`M:192-230`) refuses every DELETE and TRUNCATE for every role, any write whose `current_user` is not the table's owner (so `service_role` despite its `GRANT ALL`, `authenticated`, `anon`), and any UPDATE that lowers the level, clears a family or a flag, lowers the payment, or re-keys the row. No function of the file is executable by an API role (`M:1033-1049`). Mutants M17, M22 and my R7 confirm the tests bite.

### Attempts to defeat the evidence floor

| Way of removing or weakening evidence | Seen before the fact is gone? | Evidence |
|---|---|---|
| Delete / un-sign a person's mark | refused on the person lane (HC025), kept on the service lane | `M:422-442` |
| Present -> Excused / Absent | kept | `M:435-441` |
| Re-point a mark to another lesson or child | refused, every lane (HC024) | `M:410-414` |
| Point row: delete, re-date, re-class, unlink, type, points to 0, `created_by`, child | kept, for the linked lesson and every lesson of that class-day | `M:452-476`; my R3 caught |
| Transcript: delete, unlink, re-date, re-class, status -> failed, audio path removed | kept | `M:489-512`; my R1, R2 caught |
| Truncating transcript text | not evidence (D1 does not read `raw_text`) | - |
| Homework deleted / re-dated / re-classed | kept for the day it was set | `M:528-539`; my R9 caught |
| Submission deleted, `graded_at` cleared or moved | kept for the day it was graded | `M:543-554` |
| Lesson un-held, or moved to another date | kept (`zz0_` runs before D2's trigger) | `M:664-667`; my R10 caught |
| Lesson re-classed | impossible for a started or marked lesson (D2: HC021, no checked path) | live `session_change_guard` |
| Lesson deleted and re-created | a lesson with evidence, now or once, cannot be deleted unless it was cancelled first (`M:756-762`); the cancel holds the evidence in its override row | - |
| Service-role writer | every keep fires on every lane; D1 answers the service lane | `M:319-325` |
| Cascade from a lesson delete | parent gone -> nothing to keep, and the delete itself was judged | `M:311-314` |
| **C-1. Same-day "un-start"** (executed, probe P1) | **NO** | below |
| **N-1. Homework deleted or re-classed while a submission was graded on the lesson's day** (executed, P2) | no | below |
| **N-2. A `stars_homework_map` row added for a teacher's homework** | no | below |
| **N-3. Cascade from a hard-deleted child** | no | below |
| DQ-1: a one-off cover teacher changing an old mark | no (declared) | section 5 |

**C-1 (change before apply). The lesson keep does not fire when only `start_time` changes.** D2 treats a time change that turns a started lesson into a not-started one as a move; `zz0_session_evidence_keep` fires only on a date change or an un-hold (`M:664-666`). After such a move the lesson "has not started", so every keep returns at `M:312` and G-10 does not apply. Executed: a lesson of today, three Present marks by the teacher, a paid bill, a linked point (preview: tier 3). Checked move to a later time today (tier 3, reviewed - that toll is paid). Then the teacher deletes the point and the admin excuses the marks: both allowed, **no floor**. Cancel preview: `tier 0, level NONE, floor null`, review true (three audit-log entries for the marks; the point is not among them). The lesson is taught, paid, and cancelled at the lowest tier with one shared reason and no correction reason. The window is the rest of that day. Fix, one line: add `OR OLD.start_time IS DISTINCT FROM NEW.start_time` to the trigger's WHEN (the keep reads the stored, still-started row and D1 answers before D2 judges). One case: the probe above ends at tier 3.

**N-1.** `_homework_evidence_keep` keeps a homework's own day only. D1 item 10 counts a graded submission on the day it was graded, through the homework's class. Executed: re-classing or deleting the homework drops the grading day's lesson from SOFT to NONE with no floor (on live the delete cascades to the submissions, whose trigger then finds no parent: `M:549` returns NULL). Family H only: it can move a lesson between SOFT and NONE, never from STRONG, so it cannot produce the F-11 outcome. Fix when the file is next touched: in the `homeworks` branch also keep for each Hanoi day on which one of its submissions was graded.

**N-2.** D1 excludes a homework that has a `stars_homework_map` row. Live: that table has an admin FOR ALL policy and table grants to `authenticated`, so an admin can add a row for a teacher's homework and D1 stops counting it. Same family H, same limit as N-1. The design planned a static check for the `stars_*` helper tables (f.5); it is not in 1a. `stars_sync_grade_state`, `stars_sync_attendance_state` and `stars_sync_held_flips` have no write policy for signed-in users on live.

**N-3.** The keep skips every trigger-made attendance write (`M:315-317`, meant for the cancel's excuse-all). A raw `DELETE` of a student cascades to the child's marks at trigger depth 2: no floor, and no HC025. It removes one child's marks, not a lesson's evidence, and needs a hard delete of a child (G-18 refuses that in step 3B). Tighter and free: skip only when the lesson's row is already `Canceled`.

### Attempts to lower a bill's state unseen

Raw UPDATE of each of the four labels, DELETE, re-key, the calculator's own `confirmed -> needs_review`, a payment deletion's write-back, an upsert (ON CONFLICT DO UPDATE fires the BEFORE UPDATE trigger): all pass `M:594-613`. My R4, R5, R6 (un-freeze, un-confirm, re-key ignored) were each caught. `TRUNCATE invoices` is not covered; no API role can issue it. I found no unseen lowering.

---

## 2. "Record and refuse nothing": honest daily actions, and the cost

**New refusals: only G-10** (HC024 re-pointing a mark, any lane; HC025 deleting or un-signing a person's mark on a started lesson, person lane, direct statement). Checked against live: the Stars engine and `mark-attendance` write on the service lane and never change `session_id` / `student_id`; the teacher screen upserts with `marked_by` set. I agree with the builder's writer list (`D4-build-1a.md`, "G-10 writers").

| Daily action | Triggers that run | Work per row |
|---|---|---|
| First register save over seeded rows (teacher, sync, admin) | `zz_attendance_evidence_guard` | two comparisons, then return at `M:416-420` (`marked_by IS NULL`). No query. Executed: 15 rows, no floor written. |
| Awarding points | none of D4's (BEFORE UPDATE / DELETE only; an award is an INSERT) | 0 |
| Uploading or submitting homework, first grading | submission trigger returns at `M:543` (`graded_at` was NULL); homework INSERT has no trigger | 0 |
| Recording a payment, a calculator run | `zz_invoice_state_floor` | a few boolean tests; no query unless a label is lowered |
| Changing a mark a person made (correction) | attendance trigger -> keep | session read, lane, `has_role` / `is_teacher_of_class`, floor read, one D1 call until the floor is STRONG, then one floor upsert per row |
| Deleting / editing a point, a transcript, a homework | keep per lesson of that class-day | the same, per lesson (normally one) |

Measured (pglite, slower than Postgres): 15 marks changed in one statement 320 ms with the trigger, 121 ms without - about 13 ms a row there. Live sizes are small (876 lessons, 6,289 marks, 6,789 point rows, 3,634 audit rows; every lookup is by primary key or `idx_sessions_class_date`). Not a concern. The extra audit-log read in the preview uses `idx_audit_log_changed_fields` (gin, present on live).

**Locks.** Marks: attendance row -> session row (`guard_cancelled_session_attendance`, live) -> floor row. Lesson changes: session row -> floor row. Same order; no cycle with D2 or the cancel's excuse-all (which writes no floor). Points / transcripts / homework take floor rows in ascending lesson id. One theoretical cycle: a sync page that changes person-made marks on two lessons of one class on one day in descending id order, against a point delete for that class-day. Postgres would abort one side; the sync retries. Acceptable. Invoices: floor row is taken under the bill's own row lock; `invoices_carry_sync` (AFTER) re-enters the trigger for neighbouring bills and lowers no label.

**Recursion.** None: the floor tables carry only their guard; `audit_point_transactions` is AFTER and `audit_row_change` skips nested writes.

**C-2 (change before apply). The floors record "removals" that are not removals, and those rows can never be taken back.** The keep fires on any change of the listed columns, not on a lowering. Executed:
- P4: a transcript going `processing -> analyzed` (every analysed upload) writes a floor with the cause the card words as "A class transcript was removed, unlinked or moved to another day ... by an automatic process"; a later cancel of that lesson is flagged for review on that entry.
- P5: an admin re-saving a teacher's register through `mark-attendance` (service key, `marked_by` becomes the admin, statuses unchanged) writes one cause per child, "changed from Present to Present", lane `service`, `actor_user_id` NULL - twenty of those push every real cause out of the list.
- P6: Absent -> Present (evidence rose) is recorded as a removal too.
The level stored is always D1's true answer, so no tier is wrong. But a floor's existence widens "settled" to every child on the register (`M:748`), puts the lesson in the review queue for 30 days, and shows the admin a sentence about removed records that is false; and floor rows are append-only for good. Fix, in the three trigger functions (the two replaced bodies are not touched): call the keep only when what the row proves for that lesson goes DOWN - the functions already compute "own proof" for OLD (`M:436`, `M:472-474`, `M:507-510`); compute it for NEW and compare (DELETE = nothing). Add `old_marked_by` / `new_marked_by` to the attendance cause so a service-lane change still names a person. Cases: the three probes above end with no floor row.
