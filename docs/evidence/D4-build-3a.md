# D4 build - step 3A (lessons: who is paid, P1-P7, G-1 to G-7)

**Fix round 1 - where I am:** on branch `d4-3a-fix` (= `d4-3a-lessons` 856e493d + `review-3a` 10b10442). B-1, S-1, S-2, N-1..N-4, N-6, N-7, d4_guard_status and the merge note are done and committed; the section "Fix round 1" at the end has each finding -> change -> proof. Remaining: full run, mutants, fingerprint, apply brief's table (see that section's last line).

**Where I am / next step (build, before the review):** COMPLETE: built and tested (65 suites green, app typecheck exit 0, bun 166/0, 40 of 41 mutants caught, fingerprint regenerated). Next step is not mine: the independent review of 3A, then the conductor's live apply (migration, then manage-session / bulk-cancel-sessions / schedule-sessions, then the screens, in one sitting).

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

- `node scripts/pgtest/run.mjs`: 6318 assertions across 65 suites, 1 suite failed - session guard functions 134/135, run BEFORE decision 18's assertion change (it had already run when the assertion was changed); re-run alone after the change: 135 passed, 0 failed. So: 65 of 65 green, 6319 assertions. The three new suites: d4 lesson pay 130, d4 functions lessons 57, d4 stars interplay 19 (pinned). Every D2 / 1a / 1b suite green, incl. session guard functions 135/135 (after decision 18), d4 rollback 26 (it runs `guard-fingerprint.mjs --release d4 --check`, `--check-unchanged` and `--after-rollback` 66/66 with rollback 4), d4 register 140, d4 deployed functions 37, edge functions typecheck 5 (the three changed functions type-check), mirrors 19.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0 (and the suite "app typecheck").
- `npm run test:bun`: 166 pass, 0 fail, 13 files (bun from the local npx cache).

## Mutations (`node scripts/pgtest/d4-mutants.mjs L01 ... L36 FL1 ... FL5`)

41 mutants: 36 of file 4 (L01-L36), 5 of manage-session (FL1-FL5, mutated in place and restored; `git status` clean afterwards). **40 caught, 1 survivor (L36), explained:**

| Mutant | Breaks | Verdict |
|---|---|---|
| L01-L07 | un-hold not a kind / given the free week / kept un-hold raises / no event / A-9 dropped / any started lesson / locked month ignored | CAUGHT (lesson) |
| L08-L11 | hold without register / A-5 locked / after a checked un-hold / service hold refused | CAUGHT (lesson) |
| L12-L15 | born Held / an upsert of an existing lesson judged as new / G-7 dropped / service backdates | CAUGHT (lesson) |
| L16-L20 | G-4 dropped / A-19 / A-5 teacher / G-5 dropped / HC022 dropped | CAUGHT (lesson) |
| L21-L25 | G-6 dropped / `attended` not pay / staff free week ignores the lock (caught after a case was added) / service restaff / R-4 for assistants | CAUGHT (lesson) |
| L26-L33 | create T0 / create ignores bills / un-hold tier not D2's / locked hold T1 / pay tier ignores payroll_reach / reteach not manual / end_time not watched / no owner_lane event | CAUGHT (lesson) |
| L34 | the session exec granted to authenticated (first written as a REVOKE without authenticated: SURVIVED as equivalent - nobody had a grant - and rewritten as a real GRANT) | CAUGHT (lesson) |
| L35 | preflight no longer checks the 1b bodies | CAUGHT (lesson) |
| **L36** | the exec's re-plan under the row lock (A-8) removed | **SURVIVED** - see decision 4: the apply's token already covers the row and the tier; the exec check closes only a race between the apply's plan and the row lock, which one pglite connection cannot drive. |
| FL1-FL5 | Held <-> Scheduled on the service key / refused teacher change not turned into the check / create on the service key / T0 shortcut for T1+ / update writes status again | CAUGHT (fnles) |

## Fingerprints (CR-stripped md5 of each new function body)

`docs/evidence/D4-release-fingerprint.{sql,expected.json}` regenerated (`guard-fingerprint.mjs --release d4`): now 50 functions, 22 triggers; the diff against 1b's version is additions only (every 1a / 1b entry unchanged). New in file 4:

| Object | md5 (body, CR removed) / trigger def | definer | volatility |
|---|---|---|---|
| `session_pay_change_kind(sessions, sessions)` | f16980b8840b46a1bf45a017f443b6ca | yes | s |
| `_session_ta_rows(uuid)` | dc0e044990548a79d45ff64718abb5d8 | yes | s |
| `_session_pay_tier(text, sessions, sessions)` | 13dfc790cfafffbffc108ab656e00e24 | yes | s |
| `_session_pay_sentence(text)` | 54b02ecee83b2f202e4fccc9124d6048 | no | i |
| `session_pay_guard()` | f69bcfb3f69fc7206f8aaabe62db09ac | yes | v |
| `_session_insert_guard()` | ede7f558c2e089a3acdd214d550bfbf2 | yes | v |
| `_session_staff_guard()` | 19a597ce8b0fd93c159f7c43d27689b2 | yes | v |
| `_money_plan__session(text, jsonb, uuid)` | e21f34e1392c0dd6f34f21b133271b87 | yes | s |
| `_money_exec__session(jsonb, uuid)` | cabd2db1f4023cba61bf8d38780d4e34 | yes | v |
| trigger `sessions.zz2_session_pay_guard` | md5_def 627eb5d6e28b91e44f5d997cc30f4686 | | |
| trigger `sessions.zz_session_insert_guard` | md5_def c33edb0a689b2c4fe1a351bf27c74a56 | | |
| trigger `session_participants.zz_session_staff_guard` | md5_def fe26026f304672fe4cc8682e35ebdf96 | | |

EXECUTE for anon / authenticated / service_role: none on all nine. The preflight's pinned 1a/1b bodies (CR-stripped, equal to `D4-1b-live-apply-brief.md`): `_caller_lane` 66001c3b..., `_lesson_in_free_week` 4e8eac60..., `_money_ack` 471a5563..., `_money_change_plan` 3efa9ebc..., `_money_change_exec` b5efef0f..., `payroll_reach` 5ccecd82....

## Rollback

(Corrected in fix round 1, review B-1. The exact files, md5s and order are in `docs/evidence/D4-3a-live-apply-brief.md` "Rollback".)

1. Paste `scripts/ROLLBACK-d4-4-lesson-pay.sql` (drops `zz2_session_pay_guard`, `zz_session_insert_guard`, `zz_session_staff_guard`).
2. At once redeploy the previous functions: `manage-session`, `bulk-cancel-sessions`, `schedule-sessions` and `mark-attendance` as they were before 3A (saved with LF in `docs/evidence/D4-3a-rollback-before/`). Not optional: with the triggers gone `money_change_checked('session', ...)` refuses everything (HC050), and the 3A manage-session sends set-teacher / set-time / set-staff and every acknowledged status change through it.
3. **Revert the 3A screens** (git revert of the 3A `src/` files, then the normal deploy). NOT optional - the first version of this section said "the screens may stay", which was wrong (review B-1): `SessionActionsModal` (Held -> Scheduled) and `EditSessionModal` (a Held lesson's time) open `PayGuardDialog` straight away, whose first call is `pay-preview`; the previous manage-session has no such action (400 `bad_request`), so taking a lesson off Held or changing a held lesson's time would have no route left in the app.
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

## Fix round 1 (review `D4-3a-review.md`: APPLY WITH CHANGES)

Branch `d4-3a-fix`. The migration was edited in place (applied nowhere yet).

| Finding | Change | Proof |
|---|---|---|
| **B-1** rollback 4 leaves the 3A screens dead | Rollback 4 = script + previous functions + revert of the 3A screens: script header, migration header, this doc's "Rollback", and the new `D4-3a-live-apply-brief.md` (apply order, fingerprint table, the exact file lists). The functions of before 3A saved with LF in `docs/evidence/D4-3a-rollback-before/` (manage-session, bulk-cancel-sessions, schedule-sessions as at c132bf7b; mark-attendance = live v4, md5 3963244d... as `D4-1b-live-apply.md`). | doc; the brief's pre-check 4 compares the live functions with the saved copies before anything is sent |
| **S-1** an old Scheduled lesson's times are free, then it is held | `session_pay_change_kind`: retime when `(o.status = 'Held' OR NOT _lesson_in_free_week(...)) AND NOT v_free AND times differ AND not a D2 move` (the reviewer's line); the refusal sentence names "a lesson more than a week ago". `manage-session move` with a token runs the checked retime whatever the status (it was Held-only: an acknowledged move of an old Scheduled lesson would have looped back to the refused plain write). `useGuardedChange` / `GuardDialog` gain `onPayCheck`: the D2 Move dialog hands a 409 with a pay kind to the lesson-pay check instead of showing it as an error; `EditSessionModal` (non-Held time path) and `GlobalCalendar` (drag-to-move, the same route, found while doing this) use it. | `d4-lesson-pay` G-5: the builder's pin at :424-426 re-stated as HC020 retime with the reason in a comment; P1b (admin raw lengthen refused; the register and the hold then pay the original 90 minutes) and P1c (the teacher under the LIVE policy "Teachers can update their sessions", swapped in for the prelude's, with a control write that reaches the row; the service flip then holds 90 minutes) are permanent cases; inside the week and future lessons stay free. `d4-functions-lessons`: move of an old Scheduled lesson -> 409 retime / set-time, then move with the acknowledgement -> 200, one retime override. Mutants L37, FL6. |
| **S-2** L36 survived; the token does not cover the window | The review's P8 is a case in `d4-lesson-pay` ("the acknowledgement" section): an AFTER INSERT trigger on `money_change_overrides` locks the lesson's payroll month inside the apply, after the token check and before the exec. | HC011, teacher unchanged, no override row. Mutant L36 now CAUGHT (mutant notes in `d4-mutants.mjs` and the table below). |
| N-1 Stars "take theirs" toast showed the raw code | `starsResolveRefusalText` (lessonPayGuard.ts); `StarsSyncTab` resolve's onError uses it | lib case + source check |
| N-2 admin register save, Held flip refused silently | `mark-attendance`: ONLY the flip's error is captured and the success response gains `held: false, held_refused {code, message}` when it is refused (nothing else in the file changed; unchanged shape otherwise). `heldRefusedText`; AttendanceDrawer, SessionDetailDrawer, PastAttendanceEditor, StudentActionPopover show it as a warning | `d4-functions-lessons` drives mark-attendance over file 4: locked month -> 200, mark saved, still Scheduled, `held_refused.code = HC020`, the flip on the admin's client; open month -> Held and no new fields. Mutant FL7 |
| N-3 TAClassAssignment failed whole with the raw code | assign: the batch upsert first; on HC020 restaff, lesson by lesson, and the refused ones queue the lesson-pay check (restaff, the lesson's whole list plus this assistant, absences kept); remove: the check with the list minus this assistant. R21 classes unchanged | source check |
| N-4 HC022 "kinds=unhold,move" | `oneChangeText`: "This lesson is Held. Moving it to a time that has not started also takes it off Held ... Take it off Held first ..., then move it." Used by the D2 dialog's error banners | lib case |
| N-6 hold sentence untrue in two cases | `PAY_COPY.meaning.hold` = "Marking it Held pays the teacher for this lesson." (always true); `payMeaning(op, plan)` prefixes the case from the plan's evidence (closed month / taken off Held before / nobody took the register); PayGuardDialog shows it | lib case |
| N-7 "Reload the list" | "Start the date range within the last week and transfer again; an older lesson's teacher is changed from that lesson's Actions menu, with a reason." | source check |
| N-5, N-8, N-9, N-10 | Not changed; release-note text below | - |
| `d4_guard_status()` (1b, live) lists none of the 3A triggers | Replaced in file 4 (section 5b) with the 1b body byte for byte plus the three names in its list (a disabled one reads `ok: false`; a dropped one is absent, as 1a's are before 1a). Grants untouched (CREATE OR REPLACE). The preflight refuses unless the live body, with that one insertion removed, has md5 df2b7052707d4a8d06bdc307e6fe96a9 (1b's, `D4-1b-live-apply-brief.md`) - so a second paste passes and any other body is refused. | `d4-lesson-pay`: the 1b body here is df2b7052; a foreign body refused, nothing installed; install: the only replaced function is d4_guard_status, body only, = 1b + the insertion; status lists the three `O` and `ok`; one disabled -> `ok false`. Mutants L38, L39 |

### Release-note text for N-5, N-8, N-9, N-10 and decision 1

- N-5: a Stars withdrawal in a CLOSED payroll month leaves the lesson Held (correct, recorded as `automation_refused` with `payroll_month_locked: true`), but the sync's own note to the admin still says "so it is Scheduled again", and the flips row is gone. The money review screen's event is the true record. (The engine is outside D4.)
- N-8: decision 18's count of 0 is not vacuous: `d4-functions-lessons` asserts the create's insert is on the admin's own client.
- N-9: the insert guard's slot match also passes a lesson born `Canceled` at an already-taken slot, with no HC023 and no event. No money: a cancelled lesson is neither paid nor billed. Not tightened.
- N-10: on the service lane a hold is always allowed (design b.1 G-2), so a teacher's register through `mark-attendance` can hold a lesson in a CLOSED payroll month, with nothing in `money_change_events`; the Payroll screen's `live` drift is the trace. A `service_hold_locked` event is a follow-up.
- Decision 1: a T0 change through the old actions (inside the free week, or a hold with a register in an open month) leaves `audit_log` rows but no `money_change_overrides` row (design (g) says "a T0 row when done from the admin screens").

### Merge note for the conductor (step 2 and the others)

Shared with step 2 (`worktree-agent-a36ad2752b190053b`): `scripts/pgtest/run.mjs`, `scripts/pgtest/guard-fingerprint.mjs`, `scripts/pgtest/d4-mutants.mjs`, `docs/evidence/D4-release-fingerprint.sql`, `docs/evidence/D4-release-fingerprint.expected.json`. After the merge they must read:
- `guard-fingerprint.mjs` `D4_FILES`, in migration order: `['20261114090000_d4_floors.sql', '20261114091000_d4_core_register.sql', '20261114092000_d4_class_fee_history.sql', '20261114093000_d4_lesson_pay_guard.sql', '20261114094000_d4_money_inputs_guard.sql']` (the last only once 3B is merged).
- its after-rollback list, newest first: `['scripts/ROLLBACK-d4-5-money-inputs.sql', 'scripts/ROLLBACK-d4-4-lesson-pay.sql', 'scripts/ROLLBACK-d4-3-class-fee.sql', 'scripts/ROLLBACK-d4-2-register.sql', 'scripts/ROLLBACK-d4-1-floors.sql']` (5 only with 3B).
- `run.mjs`: both sides' entries kept; 3A's three entries with `expect` 143 / 74 / 19 (this round). If step 2's file is in a 3A suite's migration list (it is not today), the counts do not change.
- `d4-mutants.mjs`: both mutant lists kept (3A: L01-L39, FL1-FL7); the SUITES map gains step 2's suites beside 3A's.
- The two fingerprint files: never hand-merged; regenerate with `node scripts/pgtest/guard-fingerprint.mjs --release d4`, then `--release d4 --check`, `--check-unchanged`, `--check-unchanged --after-rollback` (66/66). The regenerated table now also carries 3A's NEW md5 of `d4_guard_status` (1b's entry changes: expected).
- 3A's preflight pins six 1a/1b bodies and `d4_guard_status`; neither step 2 nor 3B replaces any of them (grep at the review), so the order of 2 / 3A / 3B does not matter for it. If a later step replaces `d4_guard_status` again, it must pin 3A's body, not 1b's.

## Not verified

The live database. The screens were type-checked, not rendered (no browser run; the dialog reuses the session guard's fields and cards). schedule-sessions was checked at source level, not driven (its prelude is the whole timetable schema). The real Stars engine function was not run end to end (fallback of f.2: its statements, extracted). PostgREST's own error shape for HC020 (`code`, `details`) is assumed as 1b assumed it for HC025.
