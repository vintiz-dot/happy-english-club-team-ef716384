# D1 - Build log: `session_held_evidence`

**Where I am / next step:** migration and suite committed; suite green (123/0). Full `node scripts/pgtest/run.mjs` is running; next step is to paste its totals below and report.

Spec: `docs/evidence/D1-evidence-model.md`. Written and tested only; NOT applied to any database (no Supabase/MCP tool, no live access).

Files:

- `supabase/migrations/20261112090000_session_held_evidence.sql`
- `scripts/pgtest/session-evidence.test.mjs`
- one entry in `scripts/pgtest/run.mjs` (beside "cancelled lessons")

## Log

1. Merged `claude/hec-conductor-setup-efbaa5`; read root `AGENTS.md`, `supabase/AGENTS.md`, the D1 design, `run.mjs`, `cancelled-lessons.test.mjs`.
2. Verified the design's schema claims against the migrations and `src/integrations/supabase/types.ts` (attendance, class_transcripts, homeworks, homework_submissions, invoices, point_transactions, session_participants, sessions, stars_* tables, `app_role` = admin/teacher/family/student, `is_teacher_of_class(user_id uuid, class_id uuid)`, `payroll_month_is_locked(text)`, `has_role(uuid, app_role)`, `session_participants.participant_type = 'teaching_assistant'`). No contradiction with the real schema found.
3. Probed pglite 0.2.17: `Asia/Ho_Chi_Minh` resolves and `sha256(bytea)` exists. The function uses `Asia/Ho_Chi_Minh` as designed; no Bangkok fallback needed (case 21 asserts it).
4. Wrote the migration (commit e6733e0).
5. Wrote the suite: every case 1-32 of design section 5, plus preflight refusal on a bare schema, "writes nothing" (table fingerprints before/after; a writing helper is refused as non-volatile and nothing lands), lesson past midnight, assistant attended=true. First run: 5 failures, all in the test's own family-string helper (jsonb key order); fixed the helper. Second run 123 passed, 0 failed.
6. Mutation check: a copy of the migration with `marked_by IS NOT NULL` removed, `COLLATE "C"` removed and the STRONG threshold raised gave 9 FAILs - the suite catches broken rules.
7. Registered in `run.mjs` (commit 6a75c57).

## Deviations from the design

1. **Recorder helper is created only if missing, not `CREATE OR REPLACE`** (`supabase/migrations/20261112090000_session_held_evidence.sql:128`). Design 4/4.5 says CREATE OR REPLACE throughout. But once workstream C replaces the helper, a re-paste of this file would put the empty body back and recordings would silently stop counting (a false NONE, the unsafe direction). It is created via a `DO` block when `to_regprocedure` finds none; grants are re-asserted every time. Test: `session-evidence.test.mjs:732`. The function body itself still uses no dynamic SQL and no catalog probing.
2. **Case 18h's `detail.with_carry_in_credit` cannot be seen on its own.** The design says an item is present only when `count > 0`, and item 12's count is settled students, so with credit only there is no item to carry the detail. Kept the design's shape (no new field); `with_carry_in_credit` counts all affected students (`:581`) and is asserted alongside a settled child (`session-evidence.test.mjs:516`). 18h itself asserts `tuition = false` and no item.
3. **A kept recording element counts at least 1** (`:291`), even if it says `count: 0` or negative. The design says "default 1 each"; a careless replacement must not be able to report a recording yet weaken the level.
4. **Preflight checks every column the function reads**, a superset of the four columns the design lists (`:68`), because plpgsql resolves columns at first call.
5. Not a deviation, stated for clarity: a malformed element from the helper (`at` not a timestamp, `actor_id` not a uuid) raises and propagates, per 4.4 "nothing is caught and turned into NONE". Hash items are sorted by type with `COLLATE "C"` (`:609`), and all row-key orderings use `COLLATE "C"` so the hash does not depend on database collation.

## Not covered

- The test's `is_teacher_of_class` is a stub over `classes.default_teacher_user` (as in `video-homework.test.mjs`); standing and rostered assistants are the real function's job, tested by `ta-standing.test.mjs`.
- `20251016045745`'s BEFORE trigger (Held reverts to Scheduled before start + 5 min) is not in the prelude; fixtures set Held directly.
- Stars-sync engine migrations are not loaded; their tables are hand-written with the real columns.
- `types.ts` not regenerated (conductor's job).

## Verification

```
node scripts/pgtest/session-evidence.test.mjs supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql supabase/migrations/20261112090000_session_held_evidence.sql
-> 123 passed, 0 failed
```

## Revision 1 (2026-11-12, after docs/evidence/D-review-1.md Part A)

Edited in place (never applied anywhere). What changed:

- **A-1 (MAJOR) closed.** The redacted (class teacher) view now returns `snapshot_hash: null`. The full hash, over the money flags, is returned only to admins and internal callers, which is all D2's token needs. Test case 24 revised (it asserted the leak as a requirement); new case "A-1" (the review's probe, inverted): one child's invoice is driven through all 8 paid/confirmed/frozen states and the teacher's JSON (minus `computed_at`) is byte-identical for all 8 and carries no hash, while the admin hash does change.
- **A-2 closed (claim made true).** Before calling `session_recording_evidence` the function reads its `provolatile` and raises `55000` unless it is STABLE or IMMUTABLE. The helper then runs inside a sub-transaction that is always rolled back (`RAISE ... 'HC0RO'`, caught at once; its return value lives in a plpgsql variable, which a rollback does not touch), so any row it, or anything it calls, writes is undone. Residue named in the header: sequence advances, session advisory locks. Tests: a VOLATILE writing helper -> 55000, nothing written; a STABLE helper calling a VOLATILE writer (INSERT + UPDATE invoices) -> the call answers and every row is rolled back, for service, admin and teacher calls. Contract comment updated. `REVOKE` on the helper now also names `service_role` (review table, "NOT listed"), asserted in case 32.
- **A-3 closed.** "Internal" is now positive: no uid AND (JWT role `service_role`, OR no JWT role AND neither `session_user` nor the SET ROLE is authenticator/authenticated/anon). The new A-3 test found a second, worse defect in the same lines: with no JWT role, `v_role = 'service_role'` is NULL, so `v_internal` was NULL and `IF NOT (NULL OR false OR false)` does not raise - the gate fell OPEN and the caller got the redacted view. Every gate operand is now NULL-safe and COALESCEd to false. Tests: authenticated DB role with no claims -> 42501; jwt anon -> 42501; service_role DB role with no claims -> internal; no claims and no SET ROLE (SQL editor, cron) -> internal full view. The mis-named test at old `:678` renamed.
- **A-4** carried into D2 (token covers `affected` and the invoice fields, B-6).
- **A-5.** New cases: points of the class dated a week earlier and the next day -> NONE (kills M28); hash changes on a bare lesson for `end_time`, `teacher_id`, `class_id` and `Scheduled -> Canceled` with no marks (kills M4). `item(...)` guarded at case 7 so a missing item FAILs instead of crashing the suite (M16). The vacuous `computed_at` assertion replaced by a real one (two calls 20 ms apart: `computed_at` differs, the hash does not).
- **A-6 closed.** Recorder row keys are fingerprinted as a sorted JSON array; test: `["a","b"]` vs `["a,b"]` give different hashes.

Mutation re-check (scratch copies, never committed): M4 caught (1 FAIL), M28 caught (1), M16 caught (3 FAILs, no crash), teacher-gets-hash caught (3), no-rollback caught (3), no-volatility-check caught (1), old internal rule caught (2), comma-joined keys caught (1).

```
node scripts/pgtest/session-evidence.test.mjs supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql supabase/migrations/20261112090000_session_held_evidence.sql
-> 143 passed, 0 failed
```
