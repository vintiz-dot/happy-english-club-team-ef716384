# D4 step 0 / 1a (the two floors) - build review

Reviewed: commit e3367ffe (branch `worktree-agent-a8fa73ee4063a7b1b`), detached. Review only: no code change, no push, nothing applied. Live access (`aswgmbefikhsnhogtryv`): read-only catalog queries only (function md5 / flags / grants, trigger list, policies, index list, `reltuples`, migration names). No row about a person was read.

**Where I am / next step:** COMPLETE - sections 1-7 and the verdict (APPLY WITH CHANGES: C-1 to C-4 and the brief's updates). Next step is not mine: the builder revises file 1; a short re-check of the trigger functions, the new cases and the mutant run; then the conductor's apply.

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
| Point row: delete, re-date, re-class, unlink, type, points to 0, `created_by`, child | kept, for the linked lesson and every lesson of that class-day | `M:452-476` (code right; "points to 0" has no test: my R3 survived, section 6) |
| Transcript: delete, unlink, re-date, re-class, status -> failed, audio path removed | kept | `M:489-512`; my R1 caught; "audio path removed" has no test (R2 survived) |
| Truncating transcript text | not evidence (D1 does not read `raw_text`) | - |
| Homework deleted / re-dated / re-classed | kept for the day it was set | `M:528-539`; my R9 caught |
| Submission deleted, `graded_at` cleared or moved | kept for the day it was graded | `M:543-554` |
| Lesson un-held, or moved to another date | kept (`zz0_` runs before D2's trigger) | `M:664-667`; the date-move half has no test (my R10 survived) |
| Lesson re-classed | impossible for a started or marked lesson (D2: HC021, no checked path) | live `session_change_guard` |
| Lesson deleted and re-created | a lesson with evidence, now or once, cannot be deleted unless it was cancelled first (`M:775-781`); the cancel holds the evidence in its override row | - |
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
The level stored is always D1's true answer, so no tier is wrong. But a floor's existence widens "settled" to every child on the register (`M:746`), puts the lesson in the review queue for 30 days, and shows the admin a sentence about removed records that is false; and floor rows are append-only for good. Fix, in the three trigger functions (the two replaced bodies are not touched): call the keep only when what the row proves for that lesson goes DOWN - the functions already compute "own proof" for OLD (`M:436`, `M:472-474`, `M:507-510`); compute it for NEW and compare (DELETE = nothing). Add `old_marked_by` / `new_marked_by` to the attendance cause so a service-lane change still names a person. Cases: the three probes above end with no floor row.

---

## 3. The two replaced bodies, against LIVE

Live catalog today (queried):

| | `_session_change_assess(sessions,text,jsonb,uuid)` | `_session_erased_recently(uuid)` |
|---|---|---|
| md5 of the live body (CR stripped; raw is the same) | `e0acbcc9a958a789aa437a6c8c4a84ec` | `32c7fac7d6336c6ac48ba15bfe891630` |
| = the preflight's "D2" literal (`M:119`, `M:127`) and `D-release-fingerprint.expected.json` | yes | yes |
| SECURITY DEFINER / volatility / config / owner | true / stable / `search_path=public` / postgres | the same |
| ACL | `{postgres=X/postgres}` (no API role) | the same |

So the text the builder diffed (the repo's D2 body, which the suite installs and checks at that md5) IS the live text; the diff in `D4-build-1a.md` is a diff against live. I read it hunk by hunk: every removed line is replaced by a superset (the effective level, with the level now still read and used for a cancelled lesson's delete exactly as D2; the destination test OR the bill floor; bills and refresh pairs plus the re-pointed children; token inputs of version 2 all present in version 3; four output keys added, none removed or renamed). `_session_erased_recently` gains one UNION branch. The file re-creates both with the same signature, `STABLE SECURITY DEFINER SET search_path = public` (`M:683-684`, and the erased function likewise), and revokes from the same roles (`M:1047-1048`): flags and grants unchanged. The only behaviour that differs for an untouched lesson is none: with no floor row and no bill floor, every added term is false or empty (the carry-over suite proves it over D2's 266 assertions).

The other D-release objects on live: all 25 functions have the md5 of the expected file (25 of 25, queried), the 9 triggers are present and enabled, and no D4 object exists yet. I did not re-compare the 4 relations and their 28 parts; the brief's step 1.1 does. The file touches none of them (`--check-unchanged`: exactly the two functions differ; I ran it inside the `d4 floors` and `d4 rollback` suites).

One live fact for the brief: `audit_row_change` on live was pasted with CR line endings (raw md5 differs from the CR-stripped one). The preflight strips CR, and the two functions it checks have none; nothing to do.

---

## 4. Refused callers, cancelled lessons, backfill, and lessons taught before the paste

- A caller D1 refuses writes no floor: `M:319-325`, decided before D1 is called; cases for a child, parent, no-role user and another class's teacher on all six writes; mutant M01.
- Cancelled lessons stay deletable: `M:775-781`; mutant M04; the carry-over suite keeps D2's cancel-then-delete.
- Nothing is backfilled or rewritten: the file contains no INSERT / UPDATE / DELETE outside the floor functions; the suite compares row digests before and after the paste.

**Are lessons taught before the paste unprotected? No.** A floor is not written when a lesson is taught; it is written at the moment someone is about to lower its evidence, from D1's answer at that moment. That works the same for a lesson from last March as for tonight's: the first removal after the paste finds the evidence still there and records it. So from the paste onward F-11 is closed for every existing lesson, without anyone "touching" it first. Computing a floor lazily at first assessment would add nothing: an intact lesson does not need one, and a stripped lesson can no longer supply one.

What stays uncovered is the past, not the future: evidence removed BEFORE the paste. For marks and status there is `audit_log` (D2 already flags those cancels for review for 30 days; the G-10 residue reads it without a time limit). For points and transcripts there was no audit before this file, so nothing can be recovered, by any method. Seriousness: low; it needs someone to have prepared before today, and D5's audit of past cancellations is the place for it. Smallest history-preserving remedy for the part that can be recovered: the optional insert-only script (design A-11) that adds floor rows from the `audit_log` entries for person-made Present / Late marks changed or deleted and Held undone. It adds facts and rewrites nothing. Not needed for the apply.

---

## 5. The 13 design questions

| DQ | Ruling |
|---|---|
| 1 | **Accept the builder's (b), in step 1b, as the conductor ruled.** Live confirms both halves: `teacher_attendance_update` / `_delete` admit the lesson's own teacher and assistants at any date; `is_teacher_of_class` admits the class's default teacher, a teacher named in the weekly template and a standing assistant with no time limit, and a session's teacher or rostered assistant only while they have a lesson of that class from 7 days back to 60 days ahead. So the refusal can only ever meet a one-off cover teacher or assistant returning to a mark more than a week later; the ordinary register stays free. Until 1b the hole is open but narrow, and the mark's change is in `audit_log`, so a cancel within 30 days is still reviewed. Word the refusal "ask an administrator". |
| 2 | **Change, and it concerns file 1 too.** See C-3. |
| 3 | Accept (no `hec.floor_seen`). Correctness over one D1 call; the cost is small (section 2). |
| 4 | Accept: a date move proves SOFT on its own only if the lesson was Held. |
| 5 | Accept the direction, narrowed by C-2: keep when `graded_at` is cleared or leaves its Hanoi day, or the row is re-pointed. |
| 6 | Accept the wider list of children. |
| 7 | Accept: a re-keyed bill is floored as a delete of the old (child, month). |
| 8 | Accept: if a floor row cannot be written the lowering write fails. Closed is right; the brief's first-day sentence already names it. |
| 9 | Accept (digest as well as count). |
| 10 | Accept as a residual of 1a, to be closed in step 3A when `session_change_guard` is replaced anyway: its automation lane must read `session_effective_level`. Until then a floored lesson that an admin moved into the future through the checked path (reviewed) could be deleted by the nightly rebuild if D1 reads NONE. Record it in the ledger. |
| 11 | Accept. |
| 12 | Accept, but say plainly what the rollback leaves (section 6). |
| 13 | Accept; the prelude work for the money-input migrations is step 1b's, and its budget stands. |

---

## 6. Tests, my mutants, the rollback

**Full run, by me, on this commit** (`node scripts/pgtest/run.mjs`, node_modules linked by junction): 4691 assertions across 50 suites, 0 suite(s) failed - the builder's figure exactly. The four D4 suites: `d4 floors` 198 passed, `d4 D2 carry-over` 275, `d4 deployed functions` 37, `d4 rollback` 22, 0 failed; D2's own suites unchanged at 266 / 135 / 143. App typecheck: the suite "app typecheck" (it runs `tsc --noEmit -p tsconfig.app.json` and asserts the source was loaded) 3 passed, 0 failed; I did not run tsc a second time by hand.

**Twelve mutants of my own on the migration** (one textual change each, the preflight's own-body literals re-computed as the builder's runner does, suites `d4-floors` and where relevant `d4-d2-carryover`):

| # | Mutant | Verdict |
|---|---|---|
| R1 | transcript keep ignores a status change (-> failed) | caught (`G-8 a same-day transcript marked failed ...`) |
| R2 | transcript keep ignores `audio_storage_path` | **SURVIVED** |
| R3 | point keep ignores a `points` change (5 -> 0) | **SURVIVED** |
| R4 | bill floor ignores un-freezing | caught |
| R5 | bill floor ignores un-confirming | caught |
| R6 | a re-keyed bill leaves no floor | caught |
| R7 | floor rows can be deleted | caught |
| R8 | attendance keep ignores a signature-only change (`marked_by -> NULL`, same status: the sync's restore) | **SURVIVED** |
| R9 | homework keep ignores a re-dated homework | caught (column sweep) |
| R10 | lesson keep ignores a date move | **SURVIVED** (both suites) |
| R11 | move destination ignores the bill floor | caught |
| R12 | HC025 also on the service lane | caught (sync restore case) |

8 caught, 4 survived. In all four the migration is right and the suite does not notice it being wrong. The "column sweep" changes each column to another valid value, not to the value that lowers D1, which is why R2 and R3 slip through. **C-4:** four cases, each must go red under its mutant: (R2) a `failed` transcript that has audio, audio path cleared -> floor; (R3) a participation row's points set to 0 -> floor; (R8) service lane sets `marked_by` NULL on a Present row, status unchanged -> floor STRONG; (R10) a lesson whose only evidence is same-day points, moved to another date through the checked path -> floor SOFT and the tier it had. These matter more once C-2 rewrites exactly these conditions.

**Rollback** (`scripts/ROLLBACK-d4-1-floors.sql`, suite `d4 rollback`, 22 passed in my run): drops the seven floor / keep triggers; re-pasting `20261112091000` restores both D2 bodies at the D-release md5 and the D-release check is 66 of 66. Safe on live today: all 25 D functions there still have the D-release md5, so the re-paste writes over nothing newer. **It does not "leave no object behind", and should say so in one line:** after it, live keeps the two floor tables with their rows, guards and policies (right: history is never dropped), 13 functions that nothing calls and no API role can execute, and `audit_point_transactions`. That is harmless and a second paste of the migration re-attaches everything; but the brief's rollback paragraph should list what remains so nobody is surprised by it in the catalog.

---

## 7. The live-apply brief (`D4-1a-live-apply-brief.md`), against live as it is today

Pre-checks, run by me read-only:

| Brief step | Live today | Verdict |
|---|---|---|
| 1.1 D release as applied | 25 of 25 functions at the expected md5; 9 of 9 triggers present and enabled (relations and their parts not re-compared by me) | passes for what I checked |
| 1.2 no D4 object yet | both tables NULL; 0 of the four named functions | passes |
| 1.4 BEFORE triggers on `invoices` | `keep_frozen_invoice_amounts`, `update_invoices_updated_at` - both sort before `zz_invoice_state_floor` | passes |
| 1.4 other tables | `attendance`: `guard_attendance_enrollment`, `guard_cancelled_session_attendance`, `update_attendance_updated_at` (BEFORE), `audit_attendance` (AFTER); `point_transactions`: `validate_homework_point_date` (BEFORE), `trigger_update_points_from_transaction` (AFTER), no audit trigger yet; `class_transcripts`: none; `homeworks` / `homework_submissions`: notify and updated-at triggers only; `sessions`: the D2 three plus the pre-existing five | nothing collides by name; every `zz_` / `zz0_` name sorts last among BEFORE triggers of its table, and `zz0_` before D2's `zz_` |
| 1.6 cron | `stars-sync` (active), `rebuild-upcoming-sessions` (active) | record |
| preflight's own checks | both replaced bodies at the D2 md5; `audit_log.changed_fields` and its gin index exist | will pass |

**Does anything applied since D2 matter?** No. Live's migration list since D2 holds `class_recordings_scope` and `homework_bucket_scope` (storage and recording access), and the tuition release and `pause_enrollment` change replaced no D-release function (25 of 25 above). The file reads none of them. On live, order is the order of applying (`apply_migration` stamps its own version), so the shared date prefix has no effect there.

**C-3 (change before apply; mechanical). The file NAME collides in the repository.** The conductor branch already has `20261113100000_signup_role_from_server_only.sql`, and `...110000`, `...120000`, `...130000`, `...140000` are taken too. Two files with one 14-digit version is a duplicate key for any tool that reads the folder as migrations, and "sorts after" is undefined between them. Nothing in pgtest breaks (suites name their files), but fix it before the merge. Names that are free and keep the build order:

| Step | File |
|---|---|
| 1a | `20261113150000_d4_floors.sql` |
| 1b | `20261113151000_d4_core_register.sql` |
| 2 | `20261113152000_d4_class_fee_history.sql` |
| 3A | `20261113153000_d4_lesson_pay_guard.sql` |
| 3B | `20261113154000_d4_money_inputs_guard.sql` |
| 4 | `20261113155000_d4_change_approvals.sql` |

I found no "corrected names" recorded anywhere in the tree (the conductor branch's design still lists `...091000` to `...095000`, which sort BEFORE file 1); the table above is my proposal, not a confirmation of someone else's list. The name appears in the migration's header comment, the rollback script, `d4-prelude.mjs` (`FLOORS`), `run.mjs`, `guard-fingerprint.mjs`, the design and the brief; no function body contains it, so no body md5 moves.

Other points on the brief:
- **N-4. Add a lock timeout.** `CREATE TRIGGER` needs a table lock on `attendance`, `sessions`, `invoices`, `point_transactions`, `homeworks`, `homework_submissions`, `class_transcripts`. If a sync page or a register save is mid-transaction, the paste waits, and every later write to that table queues behind the paste. Put `SET LOCAL lock_timeout = '5s';` after `BEGIN` (a refused paste installs nothing and is simply repeated), and start the paste just after a `stars-sync` tick, not on the five-minute mark.
- After the merge with the conductor branch, re-run `d4-floors`: its policy pin reads the real migration files, and `classmate_rows_private` / `creator_rows_need_class_staff` (new there) may change who can write the evidence tables. A red pin there is a question to answer, not noise.
- Step 3's table of 29 md5 values must be regenerated after C-1 / C-2 (three trigger functions and the `zz0_` trigger definition change; the two replaced bodies and the other functions do not).
- Add to step 4, for the morning after: `select count(*), count(*) filter (where level = 'STRONG') from session_evidence_floor` and the count of `invoice_state_floor` (numbers only). A count in the tens on day one would mean the keep is recording ordinary work (C-2) and should be looked at before it accumulates.
- Verification by md5 of every created and replaced object, the 64-of-66 check, the read-only probes with the publishable key, the "what means roll back" sentence, and the two-paste rollback are all there and are right. `apply_migration` with a file that has its own `BEGIN ... COMMIT` and a trailing SELECT is how D2 was applied (`D-live-apply.md`).

---

## Verdict for step 1a: APPLY WITH CHANGES

The design is built faithfully; both routes it was written for are closed; nothing new can stop a register, a point, a homework or a payment; the two live bodies are replaced by supersets of exactly what is live; rollback is proven. Before the paste, precisely:

1. **C-1** `zz0_session_evidence_keep` also fires when `start_time` changes (`M:665-666`), with the un-start probe as a case ending at tier 3.
2. **C-2** the attendance, point, transcript and homework triggers call the keep only when what the row proves for that lesson goes down; the attendance cause carries `old_marked_by` / `new_marked_by`. Cases: `processing -> analyzed`, a re-sign with the same status, and Absent -> Present each leave no floor row.
3. **C-3** rename file 1 to a free version (`20261113150000_d4_floors.sql`) and fix the later names in the design.
4. **C-4** four cases for the surviving mutants R2, R3, R8, R10.
5. Regenerate `D4-release-fingerprint.*` and the brief's md5 table; add the lock timeout (N-4) and the one line on what the rollback leaves.

Can follow the apply: N-1 (homework deleted / re-classed: grading-day floor), N-2 (the `stars_homework_map` static check), N-3 (skip the keep only for a cancelled lesson), DQ-1 in step 1b, DQ-10 in step 3A, the optional insert-only backfill from `audit_log`.

A short re-check of the revised file (the diff of the trigger functions, the new cases, the mutant run) is enough; the two replaced bodies need no second review if their md5 stays `6c1b8c86...` / `5f589166...`.

## Not checked

- No write was made on live, so the triggers were never exercised there; timings are pglite's.
- The 4 D-release relations and their 28 parts on live (the brief's step 1.1 does it).
- Probe P3 (a `stars_homework_map` row) failed on my own fixture's column type; N-2 is reasoned from D1's text and the live policy, not executed.
- The live cascade from `homeworks` to `homework_submissions` (N-1's second half) is reasoned from `M:549`; the test prelude has no such foreign key.
- The src card was read as a diff, not rendered.
- `scripts/sessionGuard.test.ts` (bun) was not run.

---

## Round 2 - delta check of revision 1 (`git diff e3367ffe..707a9b82`)

Verdict: **APPLY.** Checked on a detached checkout of 707a9b82; nothing changed by me.

| Change | What I checked | Result |
|---|---|---|
| C-1 un-start | The trigger's WHEN now includes `start_time`; the function keeps on un-hold, date move, or started -> not started (`session_has_started` on OLD vs NEW). My probe P1 re-run: after the checked move to a later time today the floor is STRONG (`unstarted: true`); after the teacher deletes the point and the admin excuses the marks the cancel preview is `tier 3, level STRONG, level_now NONE, review true`. | closed |
| C-2 real lowering only | Each trigger compares what the row proves for the lesson before and after (`_floor_mark_level`, `_floor_point_level`, `_floor_transcript_level`; homework by class and Hanoi day) and calls the keep only when it goes down. Probes re-run: `processing -> analyzed` no floor, review false; re-sign with the same status no floor; Absent -> Present no floor. The register cause carries `old_marked_by` / `new_marked_by`. 15 changed marks: 44 ms with the trigger, 48 without (pglite). | done |
| C-3 file name | `supabase/migrations/20261114090000_d4_floors.sql`; no other file has that version; `...091000` to `...095000` reserved in the design. | done |
| C-4 test gaps | My mutants re-written for the new text and re-run, plus one for the un-start: **13 of 13 caught** (R2 audio path, R3 points to 0, R8 signature only, R10 date move now each have a named case). | done |
| C-5 | `D4-release-fingerprint.expected.json`: 18 functions, 12 triggers, 2 relations. The two replaced bodies are unchanged: `6c1b8c86c47d3193d42f13adf56dcdc2`, `5f58916650251e14a89a45455746fd6f`. `SET LOCAL lock_timeout = '5s'` after `BEGIN` in the migration and in the rollback. The rollback header lists what stays (2 tables with their guards and policies, 16 functions, `audit_point_transactions`) and why (history; dropping functions between the two pastes would break the D4 assess). **Accepted.** | done |

Full run by me on 707a9b82: `4710 assertions across 50 suites, 0 suite(s) failed`. The three new helper functions are in the REVOKE list. Still open, as ruled (can follow): N-1, N-2, N-3, DQ-1 (step 1b), DQ-10 (step 3A).

Live pre-check done during this round (read-only): D release 62 of 62 object digests equal to the expected file (25 functions, 9 triggers, 4 relations x 7 parts); no D4 object present.
