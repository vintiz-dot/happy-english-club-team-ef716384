VERDICT-A: INCOMPLETE
VERDICT-B: INCOMPLETE

# D review 1 - evidence function (A) and cancellation-guard design (B)

Where I am / next step: Part A probes done and written below (verdict line still to be set at the end). Part B: design read in full, schedule-sessions and the set_config grep checked; next: threat model, D0 inventory, run.mjs suite lists, then write the B findings.

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

(findings follow)
