# D2 build log - cancellation guard (SQL + tests)

Where I am / next step: STEP 1 done (D1 revision 1, 143/0). STEP 2: migration `20261112091000_session_cancel_guard.sql` and suite `session-cancel-guard.test.mjs` written, suite 212/0, registered in run.mjs. Running: full `node scripts/pgtest/run.mjs` and a mutation check of the guard. Next: paste their totals below, then remove the node_modules link and report.

Written and tested only. NOT applied to any database (no Supabase/MCP tool, no live access).

Spec: `docs/evidence/D2-guard-design.md` + `D2-threat-model.md`, as amended by the eight required changes of `docs/evidence/D-review-1.md` Part B and the conductor rulings (`docs/MASTER_PLAN.md` section 10: change 2 = fail closed, the raw delete/move lane only when `auth.uid() IS NULL`).

Files (all on this branch):

- `supabase/migrations/20261112090000_session_held_evidence.sql` (step 1, edited in place)
- `scripts/pgtest/session-evidence.test.mjs` (step 1)
- `supabase/migrations/20261112091000_session_cancel_guard.sql` (new)
- `scripts/pgtest/session-cancel-guard.test.mjs` (new)
- `scripts/pgtest/run.mjs` (one new entry, "session cancel guard")
- `docs/evidence/D1-build.md` ("Revision 1"), this file

## Log

1. Setup: merged `claude/hec-conductor-setup-efbaa5`, linked node_modules, read AGENTS.md, supabase/AGENTS.md, MASTER_PLAN rulings, D-review-1 in full, design, threat model.
2. Step 1 (D1 revision): see `docs/evidence/D1-build.md` "Revision 1". The new A-3 test found the evidence function's access gate fell OPEN on NULL (three-valued logic); fixed. Suite 143 passed, 0 failed; 8 targeted mutants all caught.
3. Step 2: wrote the guard migration, then the suite. First runs found only test-fixture problems (the test's service_role lacked BYPASSRLS, which Supabase gives it; one case locked a month other cases used; a `"char" || text` in the final result set). Suite: 212 passed, 0 failed.

## Amended-spec coverage (review "required changes before build")

| # | Change | Built | Tested by (suite case label) |
|---|---|---|---|
| 1 | One classifier `session_change_kind`; checked move of an unguarded edit -> `bad_change`, never HC050 | yes | B-1 (preview kind null, HC015 bad_change, plain update accepted, end_time-only edit) |
| 2 | Raw delete / move only when `auth.uid() IS NULL` (fail-closed ruling) | yes (reclass too, see deviation 1) | B-2 (admin delete, admin move, teacher move -> HC020), d7, d16, d40 |
| 3 | Destination checks: not started at destination, destination month not settled; else checked path with the worse tier; destination flags in `change` | yes | B-3 (into the past, into a locked month, into a paid month - raw; T1 into the past and T3 into a locked month - checked), settled-rule agreement with D1 |
| 4 | `erased_recently` + `review_required` from audit_log in the RPCs | yes | B-4 (Held->Scheduled flip, deleted Present marks, Present->Excused) |
| 5 | Bulk cap 50; timing test | yes | B-5 (51 -> HC016; 50 lessons x 15 marked children) |
| 6 | Token covers `affected` and the shown invoice fields | yes | B-6 (new billed child, total recalculated, bill confirmed) |
| 7 | Refresh continues past failures, per-pair results, refresh after every checked move | SQL part only: `refresh_pairs` returned for every action (both months on a crossing move); `record_session_override_event` stores whatever per-pair results the edge function attaches; the pending view includes moves. The loop itself is edge-function work (later task). | d34, d31 |
| 8 | B-9 test additions | partly - see "Not built / not tested" | |

## Deviations (each the fail-closed choice)

1. **Raw re-class is automation-only too** (`20261112091000:569`). The ruling names delete and move; a `class_id` change moves a lesson between bills the same way, so a signed-in person gets `HC021` for it as well. There is still no checked re-class path (design 4.2).
2. **Audit tables: `authenticated` gets SELECT only** (`:231`), not the house rule's SELECT/INSERT/UPDATE/DELETE - "append-only by grants". `service_role` gets the house rule's GRANT ALL.
3. **New INSERT guard on both audit tables** (`:194-199`, `HC041`). With GRANT ALL, `service_role` could otherwise insert an override row directly. The trigger function is SECURITY INVOKER and refuses when `current_user` is anon/authenticated/service_role/authenticator; the definer RPCs run as the owner and pass.
4. **Un-cancel at T3 needs a correction reason** (`:710`, all actions). Design 5.6 is silent; confirm stays not required for un-cancel, as designed.
5. **Bulk: a T2/T3 item needs its own reason, enforced in SQL** (`:723`, new code `HC017 own_reason_required`). Design 7.3 put it in the edge function only.
6. **Two extra columns on `session_cancel_overrides`**: `refresh_pairs` (`:155`; student x month pairs to refresh, both months for a crossing move - the design's `affected` has only the source month) and `erased_recently` (`:158`, change 4).
7. **One zone, `Asia/Ho_Chi_Minh`** (`:241`), as D1 (B-12). The validate trigger keeps its own `Asia/Bangkok` (same offset, not touched).
8. **`session_month_tuition_settled` restates D1's "settled bill" test** (`:303`) for the destination month, because D1 only answers for the lesson's own month and D1 is not D2's to edit. The suite asserts the two agree on 8 invoice states.
9. **Token version 2** (`:450`): the design's inputs + `md5(affected student_id:status)` + `md5(invoice id, total_amount, recorded_payment, status, confirmation_status, tuition_frozen)` (change 6). On a move it covers the bills of both months.
10. **`HC015` carries the refuse code as its MESSAGE** (`:701`): `already_canceled`, `not_canceled`, `bad_change`, `bad_action`, `bad_kind`, `bad_items`, `bad_payload`.
11. **A move with `end_time <= start_time` is refused** (`:381`), as designed - so a lesson running past midnight cannot be moved through the checked path. Closed direction.
12. The `audit_log`-based `erased_recently` query filters `entity='attendance' AND operation IN (UPDATE, DELETE)` over the last 30 days by `occurred_at` and matches `diff->'old'->>'session_id'` - there is no index on the session id inside `diff`, and the brief forbids changing existing objects, so no index was added. Per call it scans 30 days of attendance updates/deletes. Measured only in pglite (the 50-lesson bulk includes it).

## Not built / not tested

- **B-9 (1)-(3) - existing suites re-run with D1 + D2 appended: NOT BUILT.** Tried (scratch, not committed): `stars-sync-engine`, `stars-sync-homework` and `ta-standing` stop at D1's preflight (their preludes lack `class_transcripts`, `payroll_periods`, `invoices`, `auth.role()` ...: D1 refuses, closed); `recorder.test.mjs` picks its migrations by name and ignores extra ones. Making them run needs edits to those test files, which this task may not touch. The stars engine's statements are covered only as copies (suite d43), which the review warned can drift.
- B-3(c): evidence of the DESTINATION day (points/transcript/homework of that class on the new date) is not computed; only "started at destination" and "destination month settled" are.
- B-4: the D4 scope note in MASTER_PLAN (not a file of this task) - the conductor's ruling entry already lists it.
- B-7 / B-8 / B-10 / B-11: edge-function or owner items, not SQL.
- Real two-connection lock behaviour (pglite is one connection): lock order is asserted structurally (d37) only.
- `authenticated`'s live statement timeout (B-5): the owner should read `SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticated'` before rollout.

## Verification

(totals pasted below when the runs finish)
