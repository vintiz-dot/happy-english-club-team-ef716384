# D4 build - step 3A (lessons: who is paid, P1-P7, G-1 to G-7)

**Where I am / next step:** built and tested; full-suite run, mutation run and fingerprint in progress - see "Checks" below for what was finished. Next step is not mine: the independent review of 3A, then the conductor's live apply (migration, then manage-session / bulk-cancel-sessions / schedule-sessions, then the screens, in one sitting).

Implementer only: nothing pushed, nothing deployed, nothing applied to any database. Branch `d4-3a-lessons`, based on `claude/hec-conductor-setup-efbaa5` at c132bf7b (the worktree's own branch was older; a new branch was cut from the conductor branch rather than merging, which conflicted on files outside this step).

## What was built (only the files the 3A row of (h) lists, plus D4 test tooling)

| File | What |
|---|---|
| `supabase/migrations/20261114093000_d4_lesson_pay_guard.sql` | the classifier `session_pay_change_kind`, `_session_pay_tier`, `_session_ta_rows`, `_session_pay_sentence`; triggers `sessions.zz2_session_pay_guard` (G-1, G-2, G-4, G-5), `sessions.zz_session_insert_guard` (G-3, G-7), `session_participants.zz_session_staff_guard` (G-6); the 'session' entity of the 1b dispatcher, `_money_plan__session` / `_money_exec__session`, ops `unhold`, `hold`, `reteach`, `retime`, `restaff`, `create`. The dispatcher is NOT re-created (its 'session' branch binds on first use). Preflight pins the CR-stripped md5 of the 1a/1b bodies it relies on (`_caller_lane`, `_lesson_in_free_week`, `_money_ack`, `_money_change_plan`, `_money_change_exec`, `payroll_reach`). `SET LOCAL lock_timeout = '5s'`. No grants to anyone (the checked path is 1b's `money_change_preview` / `money_change_checked`). Replaces nothing; changes no row. |
| `scripts/ROLLBACK-d4-4-lesson-pay.sql` | drops the three triggers and nothing else; the redeploy of the previous manage-session is a REQUIRED second step (header). |
| `supabase/functions/manage-session/index.ts` | see "Functions" below. |
| `supabase/functions/bulk-cancel-sessions/index.ts` | HC060 on a chunk -> 409 `approval_required` with ONE request offered for the whole batch (`approval.items` = every lesson not done). |
| `supabase/functions/schedule-sessions/index.ts` | include-held: an HC020 on a Held lesson's time update -> `attention.heldTimeRefused` + `log_session_automation_refused`. |
| `src/lib/lessonPayGuard.ts` (new, pure) | op labels and sentences, what the dialog asks for (from the plan), the request built back from the PREVIEWED args, `payDialogFrom` (which 409 opens the dialog), `payOpFromDbError` (a raw PostgREST HC020), `participantsAfter`, `payChangeLines`, `payNotes`, `payEvidencePreview` (un-hold evidence in the shape of the session guard's cards). No pay figure anywhere. |
| `src/components/admin/session-guard/{api.ts, useGuardedChange.ts, GuardDialog.tsx}` | `payPreview`; `useGuardedPayChange` (fresh preview on open, stale token shows the fresh preview and asks again); `PayGuardDialog` (reuses `Fields.tsx`, `EvidenceCards` unchanged). |
| `SessionActionsModal.tsx` | Held -> Scheduled opens the lesson-pay check; a refused hold opens it too. |
| `class/AttendanceDrawer.tsx` | teacher swap and the assistant present/absent tick: the plain write is tried; on HC020 the check opens. |
| `class/SessionDetailDrawer.tsx` | teacher change: same. |
| `EditSessionModal.tsx` (admin) | a Held lesson's time change opens the check (free in its first week); teacher via `update` -> on 409 the check, then the rest of the save; the assistant list -> on HC020 the check with the whole list (each one's `attended` kept). |
| `class/EditSessionModal.tsx` | not in the design's list but broken otherwise: `update` no longer writes the status, so Held <-> Scheduled goes through `change-status`; teacher as above. |
| `AddSessionModal.tsx` | create through `manageSession`; a lesson that has started -> the check creates it; assistants added after. |
| `TeacherScheduleTransfer.tsx` | error wording only (HC020 kind=reteach: "already held ... from that lesson's Actions menu"). |
| `SessionGenerator.tsx`, `SessionGeneratorConfirm.tsx` | include-held retired from the screen. |
| tests | `scripts/pgtest/d4-lesson-pay.test.mjs`, `d4-functions-lessons.test.mjs`, `d4-stars-interplay.test.mjs`; `run.mjs` gains ONLY these three entries with pinned counts; `d4-mutants.mjs` gains 41 mutants (L01-L36, FL1-FL5) and the 3A suites; `guard-fingerprint.mjs` lists file 4 and runs rollback 4 in `--after-rollback`. |

R21 classes were kept as they were on every screen; only behaviour changed (the one exception: the include-held block of SessionGeneratorConfirm is gone, with its markup).

## The guards as built

Lanes as 1a: `person` (auth.uid() set), `service` (JWT role service_role), `owner` (SQL editor / harness), `unknown` (an API role with no user: treated as a person). The free week = the lesson ended 7 days ago or less (`_lesson_in_free_week`, 1b) AND its payroll month is open.

| Guard | Kind | Person (direct write) | Service | Owner | Checked op, tier |
|---|---|---|---|---|---|
| G-1 un-hold (P1, P7) | Held -> Scheduled, no free week | HC020 kind=unhold | allowed iff month open AND (not started OR (sync flip row AND no person's Present / Late)); otherwise KEPT Held (`NEW.status := OLD.status`), one `automation_refused` event, no raise | pass + `owner_lane` | `unhold`: D2's tier over the effective level, settled incl. the bill floor (`_session_change_assess(s,'cancel')`): T2, T3 when STRONG and settled; locked month -> `closed_payroll`, reviewed |
| G-2 hold w/o register (P2) | Scheduled -> Held with no person's mark, or after an `unhold` override, or in a locked month | HC020 kind=hold | allowed | pass + event | `hold`: T1, T3 locked; a lesson not started -> `bad_change` |
| G-3 born Scheduled (P2) | INSERT with another status (after validate_session_status has fixed a future Held) | HC023 | HC023 | pass + event | - |
| G-4 teacher (P3) | teacher changes on a Held lesson, or on one that ended more than 7 days ago (A-5), outside the free week | HC020 kind=reteach | HC020 | pass + event | `reteach`: max(1, payroll_reach of both teachers and the assistants) = T1, T3 locked; exec sets `is_manual`, `manual_reason` = the reason |
| G-5 time (P4) | start / end of a Held lesson, outside the free week, not a D2 move | HC020 kind=retime | HC020 (the include-held rebuild) | pass + event | `retime`: as G-4; shows old / new minutes; a D2 move -> `bad_change` |
| G-6 assistants (P5) | a teaching-assistant row of a Held lesson added, removed, re-pointed, or its type / person / `attended` changed, outside the free week | HC020 kind=restaff | HC020 | pass + event | `restaff`: the whole list before / after, as G-4 |
| G-7 backdated (P6) | INSERT of a lesson that has started | HC020 kind=create_past | allowed iff dated today or later (Hanoi) | pass + event | `create`: max(1, tuition tier of the children enrolled that day, family-wide via `tuition_reach`); refresh pairs = those children's month |
| one at a time | two of ours, or one of ours with a D2 kind | HC022 | HC022 | HC022 | - |

Beyond the design, both fail-closed and both needed by real writes (flagged below): an INSERT whose lesson already exists (by id, or the class's slot) passes the insert guard so the UPDATE branch judges it (R-4 for lessons: import-shaped upserts); an INSERT of an assistant already on the lesson passes the staff guard (R-4 for assistants: EditSessionModal's `upsert(..., ignoreDuplicates)`); a `DO UPDATE` changing `attended` is still judged.

## Functions

`manage-session` (all writes on the admin's own client; the service key only reads, writes the named audit_log entry and refreshes tuition):
- `change-status` Held <-> Scheduled, `update` (teacher), `move` (same-day time), `create`: the plain write is tried AS THE CALLER, as before; when the database answers HC020 with a pay kind the function answers `409 requires_checked_path` with `kind`, `use_action` (change-status / set-teacher / set-time / set-staff / create), the database's sentence as `message`, and the money preview; nothing is written. With `token` + `reason` (+ `confirm`, `correction_reason`) in the body the same action runs `money_change_checked('session', op)`.
- New `set-teacher`, `set-time`, `set-staff`: the checked op; without a token a T0 change is done at once (one T0 override row), T1+ -> 409 with the preview. New `pay-preview`: read-only.
- `update` no longer writes `status` (Held <-> Scheduled -> 409 `use_action: change-status`). `create` always inserts `Scheduled`, on the caller's client (it used the service key).
- A missing step-3A SQL -> `503 not_installed` for the checked paths, nothing written; the plain paths behave as before 3A (the database has nothing to refuse with).
- No calculate-payroll call anywhere; refresh only for `create` (calculate-tuition, through 1b's `refreshMoneyChange`).

## Suites

| Suite | Assertions | Covers |
|---|---|---|
| `d4-lesson-pay` | 130 | preflight (without file 2; a foreign `_money_ack`; CRLF bodies accepted); install (no row rewritten, twice, nothing of D1/D2/1a/1b replaced or re-granted, exactly the three triggers, nine functions with search_path and no grants, trigger order, lock timeout, prices nothing); G-1 person (D2 d15 / d43 re-stated), checked (HC010/HC011/HC012/HC013, the override row, the floor, T3, locked -> reviewed, refuse codes, 42501 teacher/parent/service), service (not started, kept Held + event + no audit row, flip + placeholders, A-9 Present and Late, locked month, the rest of a kept write), owner; G-2 (no register, marks, A-5 locked, service, after a checked un-hold, checked T1/T3, not started, T0 row); G-3 (admin, D2 d44 re-stated, validate trigger, owner, upserts of an existing lesson); G-4 (old Held, free week, A-19 locked, A-5, rebuild, service, preview minutes and no money, checked, T3, refuse codes, HC022); G-5 (old, D2 d42 re-stated, free week, Scheduled, minutes, checked, bad times, a D2 move); G-6 (add / absent / remove / note / upserts / service / re-point / Scheduled / free week / locked free week / checked add-absent-remove / T3 / bad list); G-7 (raw, future, service past / today, preview children and family tier, checked, T0 future, bad args, no children T1); forged / replayed acknowledgements, stale lesson, tier rising after the preview (HC011); HC050 per trigger; D2's cancel / move / raw cancel beside it; rollback 4 (gone, rows stay, raw passes, HC050, D2 untouched, twice, re-paste). |
| `d4-functions-lessons` | 57 | the gate for the new actions; change-status unhold (409 + preview, nothing written, the attempt on the caller's client, the sentence, short reason, ack -> override + audit, no calculate-payroll, stale -> fresh preview); hold; update / set-teacher (409 with the reteach preview and nothing written, status not written, ack, free week plain + T0 row, locked T3 + correction, bad id); move -> retime; set-staff; create (future on the caller's client and Scheduled even when Held is sent, past -> 409 with the children, ack -> lesson + refresh through calculate-tuition only, slot taken); pay-preview reads only; bulk HC060 -> one request; file 4 missing -> 503 and the plain path as before; schedule-sessions and the generator screens (source); `lessonPayGuard.ts` (requirements fail closed, request built from the previewed args, which 409 opens the dialog, wording without money). |
| `d4-stars-interplay` | 19 | FALLBACK of f.2 (stated in the header): the engine's statements EXTRACTED at run time from `stars_sync__apply_event` (20261028090000) and `stars_sync_resolve_conflict` (20261104090000), each pattern exactly once, run on the service lane: a mark (hold allowed), a withdrawal that restores then the un-hold, one that deletes then the un-hold, an un-hold in a locked month (kept Held, event, no raise), A-9 on the service lane, a late record on an old paid lesson (written + `service_retro_mark`, no abort), the admin's conflict resolution (open month passes; locked month HC020 kind=hold). |

## Checks

FILL: full `node scripts/pgtest/run.mjs`, `tsc --noEmit -p tsconfig.app.json`, `npm run test:bun`, edge typecheck, mutants, fingerprint.

## Fingerprints (CR-stripped md5 of each new function body)

FILL from `docs/evidence/D4-release-fingerprint.expected.json`.

## Rollback

1. Paste `scripts/ROLLBACK-d4-4-lesson-pay.sql` (drops `zz2_session_pay_guard`, `zz_session_insert_guard`, `zz_session_staff_guard`).
2. At once redeploy the previous `manage-session` (and `bulk-cancel-sessions`, `schedule-sessions` if they went out with 3A). Not optional: with the triggers gone `money_change_checked('session', ...)` refuses everything (HC050), and the 3A manage-session sends set-teacher / set-time / set-staff and every acknowledged status change through it.
3. The screens may stay: against the old function a refused write is never returned (nothing refuses), so they behave as before; `pay-preview` / `set-*` would answer 400 bad_action from the old function.
Symptom that means "roll back": an admin or teacher cannot mark today's lesson Held, change today's teacher or assistants, or add a lesson for today or later, with an error naming one of the three triggers or kind=unhold / hold / reteach / retime / restaff / create_past; or a Stars page failing on sessions. `d4-lesson-pay` "rollback 4" and `guard-fingerprint.mjs --check-unchanged --after-rollback` (66/66) test it.

## Decisions the design left open (each built the fail-closed way) - FOR THE REVIEWER

1. **Try the plain write first, not preview first** (manage-session `change-status`, `update`, `move`, `create`). The database is the authority; a refused write writes nothing and the 409 carries the money preview. This keeps D2's `session-guard-functions` suite (which runs the working-tree manage-session on a database WITHOUT file 4, and must not be edited) green, and an un-guarded change (the free week, a hold with marks) behaves exactly as today. Consequence: such a T0 pay change through the OLD actions leaves `audit_log` rows but no `money_change_overrides` row; through the new `set-*` actions it always leaves one. Design b.0 says "T0: the screens still call the checked RPC so a row is written" - the reviewer should say whether the old actions must also write T0 rows (they could call `set-*` instead).
2. **Trigger order.** `zz2_session_pay_guard` sorts AFTER `update_sessions_updated_at`, `validate_session_status_trigger`, 1a's `zz0_session_evidence_keep` and BEFORE D2's `zz_session_change_guard_upd` ('2' < '_'); the design says "runs last by name". Safe: D2's trigger never rewrites NEW, so it judges the row this trigger leaves; every trigger that rewrites NEW runs first. Tested (install: the order).
3. **A kept un-hold leaves a floor.** 1a's `zz0` keep runs before this trigger and records "taken off Held" although the service lane's un-hold is kept Held. The floor only raises later tiers (fail closed); the cause text over-states what happened.
4. **A-8 (tier re-check) is in `_money_exec__session`, not in the trigger.** The exec takes the lesson's row lock (and the assistants'), re-plans, and raises HC011 when the row or a higher tier differs from what was acknowledged. The triggers call `_money_ack(..., 0)`: re-tiering inside the trigger would read the floor 1a's keep writes in the same UPDATE (it widens `_session_change_assess`'s settled set) and refuse honest un-holds with a false HC011. Mutant L36 SURVIVES for that reason (the apply's token already covers the row and the tier; the exec check only closes a race between apply's plan and the lock, which single-connection pglite cannot drive).
5. **Owner lane on G-3:** passes with an `owner_lane` event (the design's G-3 row lists person and service only).
6. **G-6 scope:** any row that is a teaching-assistant row (type or id), with `session_id`, `participant_type`, `teaching_assistant_id`, `teacher_id`, `attended` as pay; a row re-pointed between lessons is judged at both; trigger-made writes (standing assistants on a new lesson, cascades) are not judged. A teaching assistant's own record deleted (FK cascade) is not guarded.
7. **The two "R-4" passes** (an INSERT of an existing lesson / an existing assistant passes to its UPDATE branch), as 1b's register rule 1, with FOR UPDATE.
8. **Pay tier** for reteach / retime / restaff = max(1, `payroll_reach` of the old teacher, the new teacher and every assistant before / after) - in practice T1, or T3 when the month is locked. No pay figure anywhere (b.1, review-3 F-1).
9. **refresh_pairs:** none for un-hold / hold / teacher / time / assistants (calculate-tuition counts Scheduled and Held alike, `calculate-tuition/index.ts:218`); for `create`, the enrolled children's month (the preview's bills are family-wide).
10. **Hold of a lesson that has not started** -> `bad_change` (validate_session_status would revert it); **retime that D2 calls a move** -> `bad_change` ("a moved lesson goes through Move").
11. **No free week for un-hold** (design). A future lesson that is already Held (invalid state) taken off Held by a person needs the T2 dialog; the rebuild's `normalizeFutureHeld` (service, never ran, Q9) would be allowed.
12. **`update` no longer writes status**; `class/EditSessionModal.tsx` (not in the 3A list) adapted so Held <-> Scheduled still works from it.
13. **`create` needs `SUPABASE_ANON_KEY`** like every other action now (503 misconfigured otherwise; it used the service key).
14. **bulk HC060:** the 409 lists the lessons not done as the one request (earlier committed chunks, if any, are in `done`); the request itself is step 4's.
15. **include-held** stays accepted by schedule-sessions' schema (the timer never sends it), retired from the screen; refusals logged with D2's `log_session_automation_refused` (the design names it).
16. **Stars conflict "take theirs" in a locked payroll month** on a Scheduled lesson: the resolve's hold is HC020 and the whole resolve rolls back (fail closed); the admin marks the lesson Held through the check first, then settles. Inside an open month it passes (the admin's own mark is a register).
17. **mark-attendance (1b's file, not changed):** an admin's register save whose Held flip the database now refuses (locked month, or after a checked un-hold) saves the marks and leaves the lesson Scheduled silently - the function ignores the flip's error, as before 3A. Fail closed (unpaid until held through the check); a one-line message there is a follow-up for the conductor.

18. **ONE EXISTING TEST ASSERTION CHANGED (reviewer: please rule).** `scripts/pgtest/session-guard-functions.test.mjs` (D2's functions suite, which drives the WORKING-TREE manage-session) pinned "the only service-key sessions write is manage-session create, an INSERT - kept unchanged" (`ins.length === 1`). Design (d) step 3A moves `create` to the caller's client, and the hard rule forbids the service role for a write the admin can make under RLS, so that count is now 0. The assertion was changed to `ins.length === 0` with a comment naming this decision; nothing else in the file changed, and the suite is otherwise green on the 3A function. Design f.1 ("no existing test file is edited") could not hold here: the suite runs the working-tree function. The alternative (keeping a service-key insert for lessons that have not started) was rejected as weaker.

## For the conductor (shared files - not edited)

- `d4_guard_status()` (1b) does not list the three new triggers; step 4 or the conductor may add `sessions.zz2_session_pay_guard`, `sessions.zz_session_insert_guard`, `session_participants.zz_session_staff_guard` to its list.
- `docs/evidence/D4-release-fingerprint.*` and `guard-fingerprint.mjs` now include file 4 and rollback 4; steps 2 and 3B append their files to the same lists, so the generated files will conflict at merge: regenerate with `node scripts/pgtest/guard-fingerprint.mjs --release d4` after merging.
- Root `AGENTS.md` rule to add when 3A merges: "A lesson's status Held <-> Scheduled, its teacher, times or assistants once held, and a lesson created after it started, are written only through `money_change_checked('session', ...)` (manage-session set-teacher / set-time / set-staff, change-status / create with a token); a screen tries the plain write and opens the lesson-pay check on HC020."

## What a teacher or admin will see differently

- **Admin, taking a lesson off Held:** a "Check before taking this lesson off Held" window (what was recorded, the bills, "the teacher is no longer paid ... if the lesson did not happen, cancel it instead"), a reason and a tick; T3 adds a correction reason.
- **Admin, changing the teacher, the times or the assistants of a held lesson more than a week old (or in a closed payroll month):** the same kind of window, "From X to Y, 90 minutes" / old and new minutes / the assistant list before and after, a reason. Inside the first week of an open month: nothing changes.
- **Admin, adding a lesson that has already started:** the window lists the children who will be marked Present and billed, their bills as stored; the lesson is created by the window. Future lessons: as before.
- **Admin, Edit Session (class page):** a status change between Held and Scheduled may open the window after the other fields are saved.
- **Admin, Generate Sessions:** only "Future sessions only"; "Also update past Held" is gone.
- **Admin, Teacher Schedule Transfer:** if a lesson in the list became held meanwhile, the transfer stops with a sentence saying how to change that lesson.
- **Teachers:** nothing new on their screens. Their register saves and the automatic Held flip work as before (the service lane may hold); a direct write a teacher's session could make on a held lesson's status is refused by the database.
- **Stars sync:** marks and withdrawals as before; an un-hold the sync wants in a closed payroll month (or with a person's Present left) is not done and is logged, never an error.

## Not verified

The live database. The screens were type-checked, not rendered (no browser run; the dialog reuses the session guard's fields and cards). schedule-sessions was checked at source level, not driven (its prelude is the whole timetable schema). The real Stars engine function was not run end to end (fallback of f.2: its statements, extracted). PostgREST's own error shape for HC020 (`code`, `details`) is assumed as 1b assumed it for HC025.
