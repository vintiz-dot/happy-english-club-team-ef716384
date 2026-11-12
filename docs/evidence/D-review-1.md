VERDICT-A: FAIL
VERDICT-B: PASS WITH CHANGES

# D review 1 - evidence function (A) and cancellation-guard design (B)

Where I am / next step: FINISHED. Both parts reviewed, probes run, `.probe/` and the node_modules link removed. Next step belongs to the conductor: A-1 fix + the two missing test cases, then re-run the D1 suite; apply the eight required changes to the D2 design before the build starts.

Counts: Part A - 0 BLOCKER, 1 MAJOR, 6 MINOR. Part B - 0 BLOCKER, 5 MAJOR, 7 MINOR.

Why A is FAIL with no blocker: the verdict is binary. The level rules, access gate, grants, idempotency and hash stability all hold (see "checked and found sound"). It fails on one executed finding: the function gives the class teacher a way to work out which families have paid (A-1), which RLS on `invoices` otherwise forbids. The fix is a few lines and one changed test case; after it, and the two test cases of A-5, I would expect PASS.

Why B is PASS WITH CHANGES: no bypass of the guard was found and every rollout state is closed. The eight required changes are listed at the end of Part B.

Reviewer: fresh context, wrote neither. Nothing was applied to any database; every probe ran in pglite from a throwaway `.probe/` folder (deleted, never committed).

---

## PART A - `session_held_evidence` (supabase/migrations/20261112090000_session_held_evidence.sql)

Baseline run: `node scripts/pgtest/session-evidence.test.mjs supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql supabase/migrations/20261112090000_session_held_evidence.sql` -> `123 passed, 0 failed`.

### A findings

#### A-1 MAJOR - the class teacher can recover each child's paid / confirmed / frozen state from `snapshot_hash`

- Where: migration `:604-611` (hash covers the money flags and the `invoice_settled` fingerprint), `:571-573` (fingerprint = `md5(student_id:PCF)`), `:621` (hash returned to every viewer, teacher included). Spec 4.3 rule 2 says "The hash reveals nothing (SHA-256 over uuids)". That is wrong: every other input of the hash is something the teacher already holds (the session fields are in the JSON, the child ids and their own uid are in their register), and the unknown part is three bits per child.
- Probe (executed): one child marked Present by the teacher, that child's invoice `recorded_payment = 500000, confirmation_status = 'confirmed'`. Called as the teacher, then rebuilt the hash input for each candidate flag set using only the teacher's JSON, the child id and the teacher uid.
  ```
  P3 teacher view => {"redacted":true,"settled":null,"itemTypes":["attendance_present"]}
  P3 flags (paid,confirmed,frozen) the teacher recovered by guessing against snapshot_hash => ["110"]
  ```
  For a class of n affected children the search is at most 8^n SHA-256 calls (10 children: about 1e9, minutes on a laptop). The guess is blocked only when item 6 is present (a `payroll_lines.id` the teacher does not know enters the hash).
- Why it matters: `invoices` is admin-only under RLS; this definer function hands a teacher a per-child "has this family paid / is this bill frozen" oracle for every lesson of their class. The redaction at `:637-646` is defeated.
- Fix (small): do not return the full hash to the redacted view. Nothing a teacher can call consumes it (D2's RPCs are admin-only). Either omit `snapshot_hash` when `redacted`, or return a second hash for teachers computed over the non-money items only. Change spec 4.3 rule 2 and test case 24 accordingly (case 24 currently asserts the leak as a requirement, test `:607-608`).

#### A-2 MINOR - "STABLE, so Postgres itself refuses any write" is not true for the recorder hook

- Where: migration header `:29-31`; test `:710-721` proves it only for a helper that is itself declared STABLE.
- Probe (executed): replaced `session_recording_evidence` with a VOLATILE plpgsql body that inserts a row, called `session_held_evidence` as service_role.
  ```
  P1 VOLATILE helper called from STABLE fn: error => none
  P1 rows written by a "read-only" call => 1
  ```
  Postgres checks volatility per function, not down the call chain. `CREATE OR REPLACE` may change volatility freely, so workstream C can turn every evidence read (and every D2 trigger call) into a write without any error.
- Fix: correct the comment; add to the recorder suite (and to session-evidence case 32 after any replacement) an assertion that `session_recording_evidence` has `provolatile = 's'`; state it in the contract block at `:110-124`. Optionally have D2's preflight refuse to install when the helper is not STABLE.

#### A-3 MINOR - "internal" is decided by the ABSENCE of JWT claims (fails open if claims are ever missing)

- Where: `:215-217`. `v_internal := v_uid IS NULL AND v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM 'anon'`.
- Probe (executed): database role `authenticated`, no `test.uid`, no `test.jwt_role`:
  ```
  P2 authenticated DB role with NO jwt role and NO uid => {"viewer":"internal","redacted":false,"settled":{"any":true,...,"tuition":true,...}}
  ```
  PostgREST always sets the claims, and I found no function in `supabase/migrations/` that calls `set_config` (grep, 0 hits), so I could not reach this through the API. It is still the wrong default for a function whose internal view shows money: any future path that runs SQL as `authenticated` without claims gets the full view.
- Also: test `:678` is named "authenticated with an empty JWT role is not internal" but passes jwtRole `'authenticated'`; the empty-role case is not tested (it would fail, as above).
- Fix: positive test instead of negative: `v_internal := v_uid IS NULL AND (v_role = 'service_role' OR (v_role IS NULL AND session_user NOT IN ('authenticator','authenticated','anon')))`, and add the empty-claims case to the suite.

#### A-4 MINOR (matters to Part B) - facts the admin is shown, and that move bills, are outside the hash

- Where: `:553-555` (`affected_students` shown in `settled`), `:342` (a person-marked Absent is hashed only when nobody is Present), spec 4.3 rule 4.
- Probe (executed):
  ```
  P7a new billed child (seeded Present): affected_students => [2,3,"hash same: true"]
  P7b a person-marked Absent (billed) changed to Excused (not billed): affected_students => [3,2,"hash same: true"]
  ```
  This follows the spec, so it is not a build defect. But D2 uses this hash as "the admin saw THIS": the number of bills a cancellation moves can change between preview and confirm without the token going stale. Carried into Part B (B-6).

#### A-5 MINOR - test gaps found by mutation

28 mutated copies of the migration were run through the suite (`.probe/mutate.mjs`, each mutation checked to have applied). 25 were caught, 1 crashed the suite (caught, but as a TypeError at test `:272` rather than a FAIL line), 2 SURVIVED:

```
M4  hash omits session status ................ exit 0; 123 passed, 0 failed   (SURVIVED)
M28 drop `pt.date = s.date` from points ...... exit 0; 123 passed, 0 failed   (SURVIVED)
M16 Late is not presence ..................... crash: TypeError ... session-evidence.test.mjs:272
```
Caught (fail counts): M1 marked_by NULL counted 6; M2 STRONG at one family 9; M3 negative points 1; M5 not-found before not-allowed 2; M6 internal ignores jwt role 1; M7 teacher unredacted 1; M8 UTC zone 6; M9 Excused affected 1; M10 linked transcript double counted 2; M11 points value not hashed 1; M12 homework NONE 3; M13 no REVOKE 2; M14 sync homework 1; M15 non-attending assistant 1; M17 Absent as D 2; M18 money not hashed 1; M19 fingerprint by insertion order 1; M20 search_path unpinned 1; M21 VOLATILE 1; M22 issued = paid 5; M23 streak bonus 1; M24 register_only with present 1; M25 hash uses the clock 6; M26 Excused as register 2; M27 failed paste 1.

- M28: no case has a participation row for the class on a DIFFERENT date. Without `pt.date = s.date` every lesson of a class that ever got points is SOFT (or STRONG once Held). The real function is right (`P8 real function, teacher points dated a week earlier => NONE`), the suite would not notice it breaking. Add the case.
- M4: case 26 "Scheduled -> Held" passes for the wrong reason (the `status_held` item appears). Add hash-changes cases for `Scheduled -> Canceled` with no marks, `teacher_id`, `end_time` and `class_id`.
- Vacuous: test `:602-603` "independent of now(): computed_at is not hashed" only asserts `computed_at IS NOT NULL`. M25 shows cases 22-24 do the real work; delete or rename the assertion.
- Use `item(...)?.` at `:272` so a missing item is a FAIL, not a crash that hides every later case.

#### A-6 MINOR - recorder `row_keys` are joined with "," so different key sets can share a fingerprint

- Where: `:294`. Probe (executed): `P4 row_keys ["a","b"] vs ["a,b"] give the same hash => true`. All other row keys are uuid/enum/int text and cannot collide. Fix: fingerprint `jsonb_agg(key ORDER BY key COLLATE "C")::text` instead of `string_agg(key, ',')`, or state in the contract that keys must not contain a comma.

#### A-7 MINOR - documented over-counting worth the owner knowing

- Probe (executed): `P6 one unlinked point row, two Held lessons that day => ["STRONG","STRONG"]`. One teacher award makes BOTH lessons of that class that day STRONG. Spec section 6 accepts it (safe direction: over-warns). Consequence for D2: a duplicate lesson created by mistake on a taught day can never be deleted, only cancelled (see B-12).
- `transcript_date = s.date OR created_at in the Hanoi day` (`:472`): an upload at 00:30 Hanoi counts for the day before (UTC date) and for the new day. Same direction. Reasoning only.

### A - deviations listed in D1-build.md

| # | Deviation | Verdict |
|---|---|---|
| 1 | Recorder helper created only if missing | ACCEPT. Right call; re-paste keeps C's body (test `:728-733`). Grants are still re-asserted. |
| 2 | 18h `with_carry_in_credit` only visible beside a settled child | ACCEPT. Spec was self-contradictory; nothing reads it for a decision. |
| 3 | A kept recording counts at least 1 | ACCEPT. Fail-closed direction. |
| 4 | Preflight checks every column read | ACCEPT. Stricter than the spec. |
| 5 | Malformed helper element raises | ACCEPT. Spec 4.4. Note for D2: a broken helper then blocks every cancel and every rebuild delete (closed, loud). |
| - | NOT listed: `REVOKE` on the helper names `PUBLIC, anon, authenticated` only (`:661`); on Supabase the default privileges also grant `service_role`, so "revoked from everyone" (spec 1.2) is not what lands. | Harmless (service role), but say so or add `service_role`. |

### A - checked and found sound

- Truth table: `:593-598` is exactly spec section 2. D or two of {R,P,T} -> STRONG; one of them, or H -> SOFT; M never counts. Mutations M2, M12, M17, M24, M26 all caught.
- `marked_by IS NULL` never counts (items 1 and 4, `:258`, `:357`); seeded rows still count as "affected" for the settled flag only (`:555`). M1 caught.
- `settled` is separate and never feeds the level (`:608`, `:627`); `paid_amount` is not read anywhere.
- SECURITY DEFINER, `search_path = public` pinned on both functions; role gate inside; 42501 is raised before P0002 so a non-member gets the same code AND message for a real and an invented id (test `:673-677`, M5 caught). Parent, student, no-role, other class's teacher -> 42501; anon -> permission denied (grant level). Timing: for a non-member the only extra work on a real id is one `is_teacher_of_class` lookup; the id is an unguessable uuid. Not a practical channel.
- Grants explicit (`:659-661`); no table created, so no table grants needed.
- No writes, no advisory locks, no `FOR UPDATE` in the function body (read `:200-650`); plain read of `sessions` at `:208-211`.
- Hash: explicit `ORDER BY ... COLLATE "C"` on every aggregate; arrays not objects; no timestamp except the session's own date/times; `now()` only in `computed_at` (M19, M25 caught). Changes on status/date/time/teacher (`:606`), level, the three money flags and each item's count + row fingerprint.
- Time zone: `Asia/Ho_Chi_Minh` resolves in pglite; half-open Hanoi-day range; a lesson ending after midnight gets `v_end + 1 day` (`:236-238`), used only for the informational `in_lesson_window`. M8 caught.
- Paste twice: suite case 31 (and the cancelled-lesson guard re-applies on top). Preflight on a bare schema: refuses, installs nothing (test `:123-136`).
- Role switching in the suite is real (`SET ROLE` + the two settings, test `:150-160`); spec section 5 cases 1-32 each have at least one assertion.

### A - not checked

- The real `is_teacher_of_class`, `has_role`, `auth.role()` bodies (the suite stubs the first; standing/rostered assistants are covered by `ta-standing.test.mjs`, not re-run here).
- The live schema (by rule). Whether `attendance.status` is text or an enum live; the concatenation at `:244` works for both.
- Performance claims in spec 4.6 (no EXPLAIN run).
- The full `node scripts/pgtest/run.mjs` (only the D1 suite was run).

---

## PART B - cancellation guard design

Inputs read in full: `D2-guard-design.md`, `D2-threat-model.md`, `D0-inventory.md`. Code re-read for this part: `supabase/functions/schedule-sessions/index.ts:402-425, 618-630, 683-697, 737-750`; `supabase/functions/_lib/refresh-cancelled-tuition.ts`; `supabase/functions/mark-attendance/index.ts:173-178`; `supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql` (trigger list); `20261009130000_audit_every_admin_action.sql:85-89`; `scripts/pgtest/run.mjs` suite table; greps named below.

Summary: I found NO way to cancel, delete or date-move a lesson that has evidence without the checked RPC. The row + flag + txid mechanism holds in an executed prototype. The design is not ready to build as written because of five MAJOR points; all are fixable inside the design without changing its shape.

### B findings

#### B-1 MAJOR - a checked move that only changes the TIME is reported as "guard broken" (HC050) and can never succeed

- Where: design 4 (`WHEN` clause lists `status, date, start_time, class_id` - not `end_time`), 4.1 ("no kind ... -> RETURN NEW, no evidence call" comes BEFORE the acknowledged lane of 4.2), 5.3 step 14 / 5.6 (the RPC raises `HC050` when the flag was not consumed), 7.2 `move` ("if the preview says the move is free a plain update; else `move_session_checked`").
- A started lesson is never "free" (tier >= 1), so correcting yesterday's 17:30-19:00 lesson to 18:00-19:30 is sent to `move_session_checked`. The trigger classifies a same-day time edit that does not un-start the lesson as "no kind", returns before reading the flag, the flag stays set, and the RPC rolls back with `HC050`, which 7.1 maps to 503 `guard_broken` "trigger missing/disabled".
- Probe (executed, `.probe/probeB.mjs`, a prototype of 4.1/4.2/5.3 exactly as written):
  ```
  B-P2 move_session_checked-style call: same date, start 17:30 -> 18:00 on a lesson 3 days ago => ERR HC050 guard trigger did not run
  B-P2 same, changing only end_time (WHEN clause does not fire at all) => ERR HC050 guard trigger did not run
  B-P2 a checked move that changes the date => [{"r":"done"}]
  ```
- Why it matters: times of a Held lesson are payroll minutes. The one legitimate correction admins make most often on past lessons would show a false "the guard is off" alarm, and the HC050 alarm is the design's only loud signal for a really disabled trigger.
- Fix: ONE classifier function `session_change_kind(old sessions, new sessions) RETURNS text`, used by the trigger, the preview and the three RPCs. The preview returns `kind: null` for an unguarded edit and manage-session then does the plain update on `asAdmin`; `move_session_checked` raises `bad_change` (not HC050) when the classifier returns no kind. Add the case to test 31.

#### B-2 MAJOR - the "automation lane" is open to people: an admin can still delete or move a billed lesson with no reason, no override row and no tuition refresh

- Where: design 4.3 (delete/move/reclass allowed with no flag when not started + Scheduled + NONE, "no path is exempted by role"), threat model A-7 ("by itself moves no settled money: bills for a future month are recalculated when next read").
- A-7's reasoning is wrong for the CURRENT month. Bills are issued a month ahead and count `Scheduled` lessons with a seeded `Present` (`_lib/tuition-session.ts:2-4`, D1 section 0). A lesson on the 25th is in this month's bill, which may be paid, confirmed or frozen. Deleting it on the 5th by direct PostgREST (`SessionActionsModal.tsx:133-136` does exactly this) lowers what the family owes. Under the design that write has: no reason, no `session_cancel_overrides` row, no before/after snapshot, and no refresh (`refreshCancelledTuition` is not called; after a delete it would find nobody anyway). `audit_log` has who and when but no why. That breaks the money rule "every money-affecting admin write leaves an append-only audit row with who, when, why and a before/after snapshot".
- Probe (executed, prototype): `B-P3 raw delete of a future Scheduled lesson, as authenticated (no reason, no override row) => [{"id":6}]`, `override rows written in total => 2` (only the two RPC calls).
- Fix: keep the lane for automation only. In the unacknowledged lane require `auth.uid() IS NULL` (service role, cron, SQL editor) for `delete` and for a month-crossing `move`; a signed-in person takes the T0 path (reason, token, row, refresh). `schedule-sessions` already refreshes tuition and payroll after each run (`schedule-sessions/index.ts:300-332`, D0 section D), so its deletes are covered. This closes the lane to the admin browser and to the teacher policy (D0 A3.2) while the nightly rebuild is unaffected. If the owner prefers to keep person-made raw deletes of untouched future lessons, that is a policy decision that must be written down as an exception to the money rule, not left implicit.

#### B-3 MAJOR - a move is judged only by where the lesson comes FROM, never by where it goes

- Where: design 4.3 move row: "OLD not started AND `ev.level = 'NONE'` AND NOT (month of NEW.date <> month of OLD.date AND `ev.settled.any`)". `ev` is `session_held_evidence(OLD.id)` read before the write, so `settled` is the state of the SOURCE month (`20261112090000:231`, `v_month := to_char(s.date,...)`). Same for the tier in `move_session_checked` (5.6).
- Consequences, all through a raw write with no reason: (a) an untouched future lesson can be moved INTO a month whose payroll is locked or whose bills are paid/confirmed/frozen; (b) it can be moved into the PAST, where it is instantly "started", carries seeded `Present` rows and is billed as a lesson nobody taught; (c) the destination's own same-day evidence (points, transcript, homework of that class that day) attaches to it, so a blank lesson becomes SOFT/STRONG by being moved.
- Not new in kind: creating a session directly with a past date does the same (D0 S7, threat model A-37, left to D4). But a guard whose stated purpose is date moves should not leave the destination unchecked.
- Reasoning only - not executed (the prototype has no evidence function).
- Fix: the free lane also requires `NOT session_has_started(NEW.date, NEW.start_time)` and that the destination month is not settled: `payroll_month_is_locked(new month)` is false and no child with a billable row on the lesson has a settled invoice in the new month. Otherwise the checked path, with the tier taking the worse of source and destination. Put `new_date`'s month settled flags into the `change` jsonb of the override row.

#### B-4 MAJOR - everything a cancellation does to money can be done without touching the guard, and those same steps lower the tier of a later cancel

- Verified in code: the attendance guard is `BEFORE INSERT OR UPDATE` only (`20261027090000:143-144`), so deleting attendance rows takes no session lock and is not refused; a child with no row or an `Excused` row is not billed (`_lib/tuition-session.ts:2-4`); staff are paid only for `Held` (`_lib/payroll-sessions.ts:21`); `Scheduled <-> Held` is deliberately unguarded (design 4.1).
- So an admin can, by ordinary raw writes with no reason: mark every child `Excused` (or delete the rows) and set `Held -> Scheduled`. The lesson is now un-billed and un-paid and still on the calendar. D2 records nothing. The threat model says this (A-12, A-13, section 4) and assigns it to D4/D5; I agree it is outside a cancel guard, but the owner should not read "D2 built" as "a taught lesson cannot be quietly removed from a bill".
- The part that IS D2's: those steps also empty `settled.tuition` (it is computed from the Present/Absent/Late rows, `20261112090000:553-569`) and remove families D and R. A lesson that was STRONG + settled (T3: correction reason, always in the review queue) becomes T1 ("listed, not flagged") or T2 unflagged. The review queue - the only place a second pair of eyes sees a correction - is skipped by doing the erasing first.
- Reasoning only - not executed.
- Fix (in D2, cheap, fail-safe): inside `cancel_session_checked` / `move_session_checked`, after the lock, read `audit_log` for this session and its attendance over the last 30 days (one indexed read per call; this is an RPC, not the per-row trigger) and set `review_required = true` plus a stored `erased_recently` jsonb when a person-marked `Present`/`Late` was changed or deleted, or the status left `Held`, in that window. No tier change needed. And record in MASTER_PLAN that D4 must guard, for a STARTED lesson: person-marked Present/Late/Absent -> Excused or row delete, and `Held -> Scheduled` by a signed-in person (the stars engine and `normalizeFutureHeld` run without a user and keep working).

#### B-5 MAJOR - a 500-lesson bulk cancel is one statement run as `authenticated`

- Where: design 5.7 (one RPC, one transaction, up to 500 items), 7.1 (called through the admin's own JWT), 9 ("inside the well-under-a-second envelope").
- Today the bulk UPDATE runs on the service role. Under the design it runs as `authenticated`, whose per-statement time limit on Supabase is short by default (8 seconds, from memory of the platform defaults - NOT verified against this project). Per lesson the RPC does: a row lock, one evidence call (about a dozen reads), two selects, an audit insert with several jsonb snapshots, the UPDATE, the AFTER trigger rewriting every attendance row (each firing the attendance guard and the audit trigger), plus `audit_sessions`. Section 9 quotes D1's estimate for the evidence call alone. A timeout rolls the whole batch back - closed, but the holiday cancel then cannot be done at all at the cap. A function-level `SET statement_timeout` does not help: the timer belongs to the statement already running.
- Also: all 500 session rows stay locked until the end, and any deadlock (`40P01` is not in the caught list) aborts everything.
- Reasoning only - not executed, not measured.
- Fix: cap the SQL batch at 50 and let the edge function loop over chunks with one shared `batch_id` (each chunk its own transaction; the response already reports `done`/`refused` per item). Add a pgtest case that times 50 lessons x 15 marked children, and have the owner read `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticated'` before rollout.

#### B-6 MINOR (required) - the token does not cover what the preview shows about bills

- Where: design 5.2 (token = action, session, uid, tier, D1 hash, session fields, `updated_at`), 5.1 (`affected`, `invoices_before`, `after_cancel.marks_excused` are shown).
- Probe (executed, Part A): `P7a new billed child (seeded Present): affected_students => [2,3,"hash same: true"]`, `P7b ... Absent -> Excused ... [3,2,"hash same: true"]`. An enrollment starting, a person-marked Absent changing, or a calculator run between preview and confirm changes the number of bills and the "before" figures the admin was shown without staling the token. The stored `invoices_before` is still correct (read under the lock), so the audit is right; only "I saw THIS" is not.
- Fix: add to the token an md5 over the sorted `affected` list (`student_id:status`) and over `invoices_before` reduced to (`id`, total, `recorded_payment`, `status`, `confirmation_status`, `tuition_frozen`).

#### B-7 MINOR - tuition refresh stops at the first failure and is skipped for same-month moves

- `refresh-cancelled-tuition.ts:13-17` throws on the first student whose calculation fails (`siblingUnresolved` included), leaving every later student un-refreshed. The design keeps that loop for `refreshTuitionFor`. With the pending view and the Retry button this is recoverable, but the event should say which pairs succeeded. Fix: loop to the end, collect per-pair results, write them in the `tuition_refreshed` / `tuition_refresh_failed` payload.
- Design 7.2 refreshes after a move only "when the month changed". A date move inside one month can put the lesson outside a child's dated enrollment or allowed weekdays (`supabase/AGENTS.md`, "Enrollment changes are dated"), which changes who is billed. Refresh after every checked move.
- Both reuse the existing calculator path; nothing prices in SQL. Confirmed sound in that respect.

#### B-8 MINOR - the rebuild will now leave a started, off-template lesson in place, and can add its replacement beside it

- Verified: the delete is per row and a failed delete is swallowed (`schedule-sessions/index.ts:737-750`, `if (!error)`), so the run completes as the design says; inserts and teacher updates are unguarded; `normalizeFutureHeld` is a `Held -> Scheduled` update with no kind (`:402-425`). `auto-mark-attendance` and `repair-attendance` write attendance only; the stars engine only flips `Scheduled <-> Held` with a status filter; `mark-attendance` filters `.eq('status','Scheduled')` (`:173-178`); the enrollment RPCs and `ai_action_apply`/`undo` do not write `sessions` (design section 0 - not re-read by me); MCP tools only read sessions (`src/lib/mcp/tools/list-upcoming-lessons.ts:20`, grep). None of them can cancel or delete an evidence lesson under the design, and none is broken.
- Side effect to tell the owner: if a class's time is changed in the template after today's old slot has started (an 08:00 class at the 09:00 run), the old lesson is kept and the new-time lesson is inserted the same day. Both are `Scheduled`, both get `Present` from the 22:00 auto-mark, both are billed until an admin cancels one. Before D2 the old one was deleted. The `automation_refused` event exists for this; D3 must put it somewhere an admin sees the same day, not only on the review screen.

#### B-9 MINOR - test plan gaps

- The claim in design section 11 is TRUE: every entry in `scripts/pgtest/run.mjs` names its own migration files (`run.mjs:45-208`, read); no suite globs the folder, and none names `20261112091000`. Line references into `cancelled-lessons.test.mjs` / `class-overhead.test.mjs` in that section were not re-checked.
- But "do not add the guard to any existing suite" leaves the interplay with real code untested. Case 43 replays the stars statements "verbatim" - a copy that will drift. Add NEW entries in `run.mjs` (no existing file edited) that run existing suites on top of D1 + D2: (1) `stars-sync-engine.test.mjs` and `stars-sync-homework.test.mjs` with the two migrations appended - they contain no raw cancel/delete/move (design 11), so they must pass unchanged, proving Held flips, withdrawals and conflict resolution through the real engine with the guard on; (2) `recorder.test.mjs` with D1 + D2 appended - workstream C chose `ON DELETE SET NULL` because "the rebuild deletes today's sessions"; with the guard a lesson with a completed recording cannot be deleted at all, and C's replacement of `session_recording_evidence` should be asserted STABLE there (A-2); (3) `ta-standing.test.mjs` with D1 + D2 - the real `is_teacher_of_class` and the `cta_new_session` insert trigger under the guard. `cancelled-lessons` and `class-overhead` cannot take the guard (raw cancels) - cases 26, 38, 39, 44 are the right replacement for the first.
- Case 30's "skip with a logged notice within 2 hours of midnight Bangkok" is a silently missing test. Build "started 2 h ago" / "starts in 2 h" from `now()` as a (date, time) pair so it never needs skipping.
- Add: time-only checked move (B-1); raw delete/move by a signed-in admin vs by the service role (B-2); move into a locked month and into the past (B-3); a bulk chunk timing (B-5); the three rollout states of 7.4 as executable cases where SQL can show them (D2 pasted without D1 -> preflight refuses; D1 function dropped afterwards -> every guarded write raises).

#### B-10 MINOR - un-cancel leaves a lesson that bills nobody and that automation cannot refill

- Design 5.6 / OQ-2: marks stay `Excused`. Seeded rows keep `marked_by NULL` with status `Excused`; the stars sync may only overwrite `marked_by IS NULL AND status = 'Present'` (`supabase/AGENTS.md`), and auto-mark only inserts for children with no row. So after an un-cancel every child must be re-marked by hand or the lesson is never billed, and Pixel Pal marks for it become conflicts. Safe direction (under-bills), but the owner question should say it. Option for the owner: on un-cancel, reset to `Present` only the rows that are placeholders (`marked_by IS NULL`) - that restores no person's decision.

#### B-11 MINOR - usability

- Class abandoned after roll-call: works (T2, reason + confirm; evidence stored). Holiday bulk cancel of future lessons: works subject to B-5. A lesson created by mistake: works (T0/T1 delete with a reason) unless the class had points, a transcript or homework that day - then it is SOFT, `use_cancel`, and stays as a `Canceled` row for ever (D1 counts unlinked same-day rows for every lesson of the class, probe A `P6`). Harmless to money; worth one line in the dialog.
- "A session with evidence cannot be deleted" is workable given cancel-then-delete (5.3 step 9).
- 15 characters: "Nghỉ lễ 2/9" (11) and "Teacher sick" (12) fail. Admins will pad. OQ-3 already asks; I would allow 8 at T0 only.
- The old "past Held" block in `manage-session` `cancel` (`:126`) is removed. It is replaced by something stricter in every case except that it no longer refuses outright (conductor ruling 1). Not one of the listed protected guards; noted so nobody is surprised.

#### B-12 MINOR - small points

- Two zone names for one clock (`Asia/Bangkok` in D2, `Asia/Ho_Chi_Minh` in D1). Same offset; use one.
- If A-1 is fixed by dropping the hash from the teacher view, nothing in D2 breaks: the trigger's unacknowledged lane reads only `level` and `settled`, and `settled = null` is already treated as settled (design 2).
- D2's preflight should also refuse when `session_recording_evidence` is not STABLE (A-2).

### B - the seven questions, answered

1. **Bypass.** None found. `authenticated` cannot insert into the override table (no grant, no policy; prototype: `ERR 42501 permission denied for table ov`); a forged flag is refused (`ERR HC020`); a flag pointing at an earlier transaction's row is refused (`ERR HC020`, txid); `txid_current()` exists in pglite and is the same inside and after an `EXCEPTION` sub-block (`[{"x":767,"sub":null},{"x":767,"sub":-1}]`); a transaction-local flag set inside a rolled-back sub-block reverts (`{"v":"","is_null":false}`) and does not leak into the next transaction; custom SQLSTATE `HC020` surfaces as `HC020`; the flag set in one SECURITY DEFINER function with `SET search_path` is visible to, and cleared by, the trigger function (`B-P1 checked cancel => done`). No function in `supabase/migrations/` calls `set_config` (grep: 0 hits) and every `EXECUTE` is fixed DDL or a fixed query with `USING` (grep, 60+ hits read) - design section 0 confirmed. Cascades: `sessions.class_id` / `teacher_id` are `ON DELETE RESTRICT` (`20251012020423:21, 26`, grep found no later `ALTER`), and a cascade would fire the row trigger anyway (prototype: `DELETE FROM classes ... => ERR HC020 ... kind=delete`). `TRUNCATE classes CASCADE` reaches the statement trigger (`ERR HC030`). Held -> Scheduled, deleting attendance: not closed, audited in `audit_log` without a reason (B-4). Moving the date first: closed for a started or evidence lesson; open towards the destination (B-3). Token: replay, cross-session, cross-admin all covered by its inputs; evidence change covered except B-6.
2. **Rollout states.** All four rows of 7.4 are closed as described; old set-based writes fail whole (`manage-session:264`, `bulk-cancel-sessions:121`). D1 missing -> D2 preflight refuses; D1 dropped later -> the trigger's evidence call raises -> refused. Not executed.
3. **Automatic paths.** See B-8. All keep working; none can cancel or delete an evidence lesson.
4. **Existing guards / figures.** Nothing in the design edits 20261027090000, the eligibility helper, the closed-payroll trigger, frozen bills, payment-month confirmation or the sibling hold. Lock order session -> attendance is kept; the one opposite-order path (UPDATE of an existing attendance row) is pre-existing and correctly left alone. Tuition is refreshed only through `calculate-tuition`; SQL copies invoice rows and prices nothing. See B-7.
5. **Usability.** B-1 (broken), B-5 (at risk), B-11.
6. **"No existing test is affected".** True. See B-9 for the suites to add.
7. **D0 paths the design does not cover** (all named as out of scope in the threat model section 6, none hidden): S7 (create as Held/Canceled), S15 for time edits of Held lessons (payroll minutes), S16, S17, S19 (teacher change on Held lessons), S24, S25 and F-1 (Held -> Scheduled), O15/O16 (attendance written raw or by import: Excused, delete), O3 for same-month moves (B-7). D0 A3.2 (teacher moves own lesson) is covered only before the start (and falls under B-2).

### B - required changes before build (the PASS WITH CHANGES list)

1. One shared classifier; `move_session_checked` never raises HC050 for an unguarded edit (B-1).
2. Raw delete and month-crossing raw move only when `auth.uid() IS NULL`; a signed-in person takes T0 (B-2) - or the owner signs the exception.
3. Destination checks on every move: not started at the destination, destination month not settled, else checked path with the worse tier (B-3).
4. `erased_recently` + `review_required` from `audit_log` inside the RPCs; D4 scope recorded in MASTER_PLAN (B-4).
5. SQL bulk cap 50, chunked by the edge function; timing test (B-5).
6. Token covers `affected` and the shown invoice fields (B-6).
7. Refresh: continue past failures, per-pair results, refresh after every checked move (B-7).
8. Test additions of B-9.

### B - not checked

- The live database: `authenticated`'s statement timeout, live cron jobs, live policies, whether an old `generate-sessions` is deployed.
- `manage-session` and `bulk-cancel-sessions` line references in design section 0 beyond the grep hits (`:92, 133, 162, 215, 264, 287, 318`; `:121`).
- `ai_action_apply` / `undo`, the enrollment RPCs and `admin-data-import` were not re-read; I rely on design section 0 for "they do not write sessions".
- The `src/` direct writers (`SessionActionsModal`, `EditSessionModal`, `GlobalCalendar`, `TeacherScheduleTransfer`) were taken from D0, not re-opened.
- Real two-connection lock behaviour (pglite is single-connection); the lock-order argument is reasoning only.
- PostgREST / pg_graphql reachability of `pg_catalog.set_config` on the live project (reasoned from the exposed-schema rule; the override row, not the flag, is the real gate either way).
