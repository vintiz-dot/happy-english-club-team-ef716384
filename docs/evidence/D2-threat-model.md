# D2 - Threat model for the cancellation guard

Companion to `docs/evidence/D2-guard-design.md` ("design N.N" below). `D0 Sx` = row of `docs/evidence/D0-inventory.md`. `M/` = `supabase/migrations/`, `F/` = `supabase/functions/`. Nothing here was run against a database; "after D2" describes the design, to be proven by the numbered test cases of design section 10.

## 1. Assets

| # | Asset | Why it matters |
|---|---|---|
| AS-1 | The fact that a lesson took place (`sessions.status`, the register rows) | It is what families are billed for and staff are paid for (`F/_lib/tuition-session.ts:2-4`, `F/_lib/payroll-sessions.ts:21`) |
| AS-2 | The evidence itself: human marks, points, transcripts, homework | Cancelling rewrites marks to `Excused` (`M/20261027090000_cancelled_lesson_attendance_guard.sql:157-160`); deleting cascades them away (`M/20251012062405_b0d6758e-c136-4ded-98c5-446357e758a6.sql:4`) |
| AS-3 | Family bills, payments and carried balances | Real money |
| AS-4 | Closed payroll lines, frozen bills | Must not be rewritten |
| AS-5 | The audit trail: `session_cancel_overrides`, its events, `audit_log` | The only way to reconstruct a decision afterwards |
| AS-6 | The guard itself (triggers, functions) | A guard that is silently off is worse than none |

## 2. Actors

| Actor | Can do today | Trust |
|---|---|---|
| Careless admin | Any session write through the screens | Honest, makes mistakes |
| Admin on a stale tab | The same, on data that has moved | Honest |
| Two admins at once | Concurrent writes to one lesson | Honest |
| Rogue or compromised admin account | Everything an admin JWT can do: edge functions AND direct PostgREST under the `FOR ALL` policy (`M/20251012023454_6adfb949-50dc-4ebb-8853-6de73d8e8441.sql:146`), browser console included | Hostile, but has no SQL editor |
| Teacher | Marks registers; may UPDATE own `Scheduled` lessons while they stay `Scheduled` (D0 A3.2) | Honest; interest in lessons counting as held |
| Parent / student | No write policy on `sessions` (D0 A3.4) | Interest in lessons not counting |
| Service-role automation | `schedule-sessions` (cron 09:00 Hanoi and admin runs), stars-sync, auto-mark, admin-data-import, any future function | Not hostile; indiscriminate |
| The chat assistant | Reads as the caller; proposes plans; no apply path (root `AGENTS.md`) | Must gain nothing |
| Lovable / another agent editing code | Rewrites edge functions and screens, sometimes deleting unapplied work (owner memory) | Honest, unaware of this design |
| A future developer | Adds a function with a service-role client | Honest, unaware |
| The owner in the SQL editor | Superuser: can disable or drop anything | **Trusted.** Out of scope to prevent; in scope to detect |

## 3. Attacks and mistakes

"Test" = case number in design section 10.

| # | Attack / mistake | Today (D0) | After D2 | Residual risk | Test |
|---|---|---|---|---|---|
| A-1 | Admin cancels a taught lesson by accident from the dialog | Allowed unless status is `Held` and the date is past; reason optional, defaults to "No reason provided" (D0 S2, B-i; `F/manage-session/index.ts:126`) | Preview shows the evidence; reason + token always; explicit confirmation once the lesson has started; correction reason when settled | An admin who reads nothing and types 15 characters still cancels. It is recorded with their name, reason and the evidence they were shown. | 25, 26 |
| A-2 | Stale tab: the admin confirms on a screen loaded before the teacher marked the register | No check at all | Token recomputed under the row lock; any change to evidence, to the session row, to the tier or to who is asking -> `token_stale` | A change the D1 hash does not cover AND that does not touch the session row (an enrollment or discount edit) does not stale the token. It also does not change whether the lesson was held. | 23, 24 |
| A-3 | Evidence added between preview and confirm | Lost: the cancel excuses the new marks | The RPC locks the session first; the attendance guard takes the same lock (`M/20261027090000_...sql:128`), so a mark either commits before the lock (seen, token stale) or waits and is then refused on a cancelled lesson | A plain `UPDATE` of an existing attendance row can deadlock with the cancel; Postgres aborts one side; nothing is half-applied (design 4.4). Points/transcripts/homework take no session lock: one inserted in the milliseconds between the RPC's evidence read and its commit is not seen. It is still in its own table for D5 to find. | 23, 37, 38 |
| A-4 | Two admins cancel the same lesson at once | Both succeed; second overwrites `canceled_by/at` (D0 B-i) | Second waits on the row lock, then fails: `already_canceled` (or `token_stale`) | None | 22, 30 |
| A-5 | Admin uses `force-cancel` or `change-status` to get round the block | No check; canned reason (D0 S3, S4, B-ii) | Both are the same checked path; no canned reason; reasons equal to the old canned strings are rejected | None | 21 |
| A-6 | **Direct PostgREST `UPDATE sessions SET status='Canceled'` by an admin** (console, script, a new screen) | Allowed by RLS; bypasses everything (D0 B-iv) | Trigger refuses every raw transition into `Canceled`, for every role | None at the API | 5, 6 |
| A-7 | **Direct PostgREST `DELETE` by an admin** | Allowed; `SessionActionsModal.tsx:133-136` does exactly this (D0 S18) | Allowed only for a lesson that has not started, is `Scheduled` and has no evidence; otherwise refused | A not-started, untouched lesson can still be deleted without a reason. That is the automation lane and by itself moves no settled money: bills for a future month are recalculated when next read. It is in `audit_log` with the actor (`M/20261009130000_audit_every_admin_action.sql:173-175`). | 7 |
| A-8 | **Setting the session flag directly** | n/a | The flag must name an override row for this session, this kind of change, this transaction; only the definer RPC can insert one. `set_config` is not reachable through PostgREST and the tree has no SQL-exec RPC (design 4.2, section 0) | A future migration that adds a generic "run this SQL" RPC, or grants INSERT on the override table, reopens it. Test 13 pins the grants; a reviewer must refuse such an RPC. | 8, 13 |
| A-9 | **Replaying an old token** | n/a | After the cancel the session is `Canceled` -> `already_canceled`; after an un-cancel `updated_at` and status differ -> stale | Cancel -> un-cancel -> identical evidence again cannot reproduce the token: `updated_at` moved. None. | 22 |
| A-10 | **Token for session A used on session B** | n/a | Session id is in the token | None | 22 |
| A-11 | Replaying an old override ROW (pointing the flag at it) | n/a | `txid` must equal the current transaction | None | 9, 10, 11, 12 |
| A-12 | **Evidence removed first**: an admin or teacher un-marks the register (Present -> Excused/Absent, or deletes rows), deletes point rows or the transcript, then cancels as "no evidence" | Possible; unremarkable | NOT blocked - registers must stay correctable. The lesson has still started, so the cancel is T1: reason, confirmation, named actor. The override row truthfully records NONE. | **Real residual.** Detection: `audit_log` has every attendance insert/update/delete with actor (`M/20261009130000_...sql:152-166`). `point_transactions`, `class_transcripts` and `homeworks` have NO audit trigger (grep of `M/` for `audit_point_transactions`, `audit_class_transcripts`, `audit_homeworks`: nothing) - deleting those leaves no trace. D5 should add: (a) an owner query "T0/T1 overrides whose session had a human Present/Late in `audit_log` in the preceding 30 days"; (b) audit triggers on those three tables (a new migration, owner approval). | 19 |
| A-13 | **Status flip `Held -> Scheduled`, then cancel** | Possible | The flip is not guarded (the stars engine and the validate trigger need it). Marks remain, so a marked lesson is still T2/T3. A lesson whose ONLY evidence was `Held` drops to T1 - still reason + confirmation. | The override row shows NONE for an R-only lesson that was `Held` an hour ago. Detection: the flip is in `audit_log`. Same D5 query shape as A-12. Related pre-existing fault: `schedule-sessions` un-Helds today's lessons on every run (design section 0, F-1). | 15 |
| A-14 | **Change `date` to the future, then cancel** (or let the rebuild delete it) | Possible by drag (`GlobalCalendar.tsx:191`, D0 S20) | A started lesson, or one with any evidence, cannot change date outside `move_session_checked` (reason, token, audit row). A time edit that would un-start a started lesson is treated the same. | A checked move still detaches date-keyed evidence (points, same-day transcripts, homework) from the lesson. The `move` override row stores the evidence as it was; `review_required` for T2+. | 16, 17, 31 |
| A-15 | **Change `class_id`** to shed class-keyed evidence | Possible by direct write | Refused for a started or touched lesson; there is no checked path (`HC021`) | None | 18 |
| A-16 | Change `teacher_id` on a held lesson | Possible (D0 S16, S19) | **Not addressed by D2.** It changes who is paid, not whether the lesson exists. The token goes stale, nothing more. | Payroll risk, for D4. | - |
| A-17 | **Deleting the class, teacher or enrollment so sessions cascade** | D0: unknown | Verified: `sessions.class_id` and `teacher_id` are `ON DELETE RESTRICT` (`M/20251012020423_f00f2350-14fd-44b1-b5cc-f0360ab9fcdf.sql:21, 26`); enrollments have no FK to sessions. Nothing cascades INTO a session delete. If a later migration made it cascade, the BEFORE DELETE row trigger fires for cascaded deletes too. | None | 7 |
| A-18 | **TRUNCATE sessions** (row triggers do not fire) | `authenticated` has no TRUNCATE (`M/20260712023825_7ddf10d6-c1de-406e-8ce7-e5a535388cfc.sql:6`); `service_role` has `GRANT ALL` (`:7`) but PostgREST offers no TRUNCATE | Statement trigger refuses TRUNCATE on `sessions` and on both audit tables | `TRUNCATE ... CASCADE` from a parent table: `sessions` references `classes`/`teachers`, so truncating those with CASCADE reaches `sessions` and DOES fire its TRUNCATE trigger. SQL editor only. | 13 |
| A-19 | **Bulk cancel** with `include_held`, no filters, a past range | One UPDATE over everything matching; canned reason (D0 S8, B-iii) | Dates required, <= 62 days, <= 500 lessons; only T0 lessons go with the shared reason; every other lesson comes back for its own token, confirmation and (T2/T3) its own reason; SQL enforces this per item whatever the client sent | An admin can still cancel a month of future lessons with one sentence. That is the holiday case and each lesson has a row. | 35 |
| A-20 | Bulk hard delete | No reason, no refresh (D0 S5) | Per-lesson RPC; evidence lessons refused; tuition refreshed from the returned `affected` | Design OQ-6: consider removing it | 29 |
| A-21 | **Editing or deleting the override table** | n/a | No INSERT/UPDATE/DELETE grant to `authenticated` or `service_role`; UPDATE/DELETE/TRUNCATE triggers raise for every role | SQL editor can drop the trigger and edit. Trusted actor. | 13 |
| A-22 | Lying in the attached tuition figures | n/a | Attachments are stored as attachments; no decision reads them; the database's own copy of the invoice rows sits beside them (design 5.4) | The review screen must label the two sources. | 27, 34 |
| A-23 | Admin calls `cancel_session_checked` straight from the browser, skipping the edge function, so bills are not refreshed | n/a (today: the same effect via A-6) | The cancel is fully checked and audited, but no `tuition_refreshed` event follows; the lesson is not billable from that moment (calculator reads the register live); stored invoices are stale until the next calculator run | Shown in `session_cancel_tuition_pending` after 10 minutes; `refresh-tuition` fixes it. Stale stored bills until then - the same state as today's refresh failure (D0 B-xi), now visible. | 34 |
| A-24 | Un-cancel to bring back a lesson and bill for it | Unguarded, unrefreshed, attendance left `Excused` (D0 B-vi) | Only through `uncancel_session_checked` (reason, token, row), only to `Scheduled`. No child is billed until a person marks them. | Re-marking is ordinary register work with its own audit. Paying the teacher needs `Held`, which needs a mark or an admin status change (audited, D4). | 32 |
| A-25 | **Disabling or dropping the trigger** | n/a | Only the table owner/superuser can (`ALTER TABLE ... DISABLE TRIGGER`, `session_replication_role`). Out of scope to prevent. Detection: (1) `cancel_session_checked` refuses to work when the trigger did not consume its flag (`HC050`) - with the new functions deployed, a disabled trigger means NO cancel works, which someone notices the same day; (2) `session_cancel_guard_status()` -> red banner; (3) D5 query: sessions cancelled or deleted (from `audit_log`) after the first `guard_installed` event that have no override row. | A raw SQL-editor write while the trigger is off leaves only the `audit_log` row (actor NULL). Query (3) finds it. If `audit_log`'s trigger is disabled too, nothing does. | 14 |
| A-26 | **Edge functions deployed without the migration** | n/a | New functions have no raw-write fallback: 503 `guard_not_installed` | Admins cannot cancel until the owner pastes. Closed. | edge unit test |
| A-27 | **Migration pasted without the new functions** | n/a | Old functions' raw cancels all fail in the trigger: 500, nothing cancelled. Old direct delete works only in the automation lane. | Same: closed, unfriendly message. | 5, 6, 7 |
| A-28 | Lovable or a future developer rewrites `manage-session` back to a raw service-role update | That IS today's code | The database refuses it. The screen breaks visibly; no lesson is cancelled unchecked. | They "fix" it by adding `service_role` to the RPC grants or an exemption to the trigger. Tests 4 and 6 fail if so; the migration comment says why not. A migration pasted by the owner without tests is the remaining path (trusted). | 4, 6 |
| A-29 | A new service-role function, cron job or import cancels sessions | Allowed | Refused: no role exemption exists | It can still delete not-started untouched lessons (the lane). | 6, 40, 46 |
| A-30 | The nightly rebuild (09:00 Hanoi) or an evening admin run deletes today's lesson that has already been taught but not marked | **Happens today**: `session.date >= today` (`F/schedule-sessions/index.ts:737-746`; cron `M/20261110160000_schedule_runner_and_nightly_rebuild.sql:38`) | Refused once the lesson's start time has passed; reported as `guardKept` and an `automation_refused` event | A lesson removed from the template for a day when it genuinely will not run stays on the calendar if the run happens after its start time; an admin cancels it with a reason. | 40 |
| A-31 | The chat assistant is talked into cancelling a class | Has no write path (root `AGENTS.md`) | Unchanged. The RPCs need an admin JWT on a client the chat function does not build. `ai_plan_check` gets no "cancel" step in D2. | A later "let the assistant cancel" feature must go through preview -> the admin's own Confirm, like `ai_action_apply`, never the function calling the RPC. | - |
| A-32 | Teacher moves or edits their own lesson to hide or fake a class | May move own `Scheduled` lesson freely (D0 A3.2) | Free only before it starts and with no evidence; otherwise refused (no checked path for teachers) | Before the start, a teacher can still move their own untouched lesson without an admin. `audit_log` records it. D4 may want to remove that policy. | 16 |
| A-33 | Teacher fabricates evidence (marks a lesson that did not run) to block a cancellation | Possible | Evidence never blocks a cancel (ruling 1); the admin sees who marked and when, and explains | Billing for a fake lesson is a register-integrity problem, outside D2. | 26 |
| A-34 | Parent or student | No write policy on `sessions`; RPCs refuse non-admins; audit tables invisible | None | 20, 36 |
| A-35 | Forged `marked_by` (NULL to hide a human mark) | RLS does not constrain the column (D1 1.1) | Unchanged. A forged NULL turns STRONG into T1, not into "silent" | For A5's audit, as D1 says. | - |
| A-36 | Reason that says nothing ("aaaaaaaaaaaaaaa", 15 spaces) | Reason optional | Trim/collapse, 15 characters, 5 distinct characters, canned strings rejected | "asdf asdf asdf qwer" passes. No rule can make a person truthful; the row carries their name. | 21 |
| A-37 | Insert a session directly as `Canceled`, or as `Held` | Possible (`manage-session create`, D0 S7; import) | **Not addressed.** An inserted `Canceled` row bills nobody and pays nobody; an inserted `Held` row pays staff (D4). | For D4. | - |
| A-38 | `admin-data-import` upserts `sessions`/`attendance` wholesale on the service role | Possible (`F/admin-data-import/index.ts:72-76, 97`) | Session rows: the trigger applies per row. Attendance rows: not D2's - an import can overwrite the register (then A-12). | For A5/D4: that function should not list `attendance` and `sessions`. | 46 |
| A-39 | Time passes: preview at 17:25 as T0, confirm at 17:35 after the 17:30 start | n/a | Tier is in the token: stale; new preview is T1 | None | 24 (same mechanism) |
| A-40 | Deadlock or crash mid-bulk | Partial cancel with no record of which (set-based UPDATE then refresh) | One transaction: all committed items have rows, or none | Tuition refresh after commit can still stop half-way; the pending view lists what is left. | 35 |

## 4. What a determined admin can still do (honestly)

Without the SQL editor, an admin who means to cancel a taught lesson quietly can: (1) cancel it and write a false reason - recorded under their name with the evidence; (2) first erase the evidence through ordinary screens (A-12, A-13), then cancel as "no evidence" - still a named, reasoned T1 row, and the attendance part of the erasure is in `audit_log`; the points/transcript/homework part is not; (3) delete not-yet-started lessons nobody has touched without a reason (A-7).

They cannot: cancel or delete anything without a row carrying their id; cancel on a stale screen; reuse a token or an acknowledgement; move or re-class a held lesson unrecorded; alter the audit rows; do any of it as the service role or through the chat assistant.

With the SQL editor (the owner, trusted): everything. Detection is A-25's three checks, plus `audit_log`.

## 5. Detection summary (what D5 should turn into owner SQL)

1. Guard on? `session_cancel_guard_status()`.
2. Sessions that became `Canceled`, left `Canceled`, changed date or were deleted (from `audit_log`, `entity = 'sessions'`) after the first `guard_installed` event, with no matching override row -> the guard was bypassed.
3. T0/T1 overrides whose session had a human `Present`/`Late`, or status `Held`, in `audit_log` in the 30 days before -> evidence removed first.
4. `session_cancel_tuition_pending` not empty -> bills not refreshed.
5. `session_cancel_review_queue` not empty -> corrections nobody has looked at.
6. `automation_refused` events -> the rebuild wanted to remove a lesson that had started.

## 6. Out of scope, named so it is not mistaken for covered

Teacher and rate changes on held lessons (A-16); creating sessions as `Held`/`Canceled` (A-37); the register's own integrity (A-12, A-33, A-35, A-38); `schedule-sessions` un-Helding today's lessons (design F-1); the SQL editor; anything about past cancellations (D5).
