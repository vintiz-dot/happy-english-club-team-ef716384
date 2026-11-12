# D2 build log - cancellation guard (SQL + tests)

Where I am / next step: Revision 1 done (SQL + suite 239/0 + mutants + contract gaps). Edge functions: see docs/evidence/D2-edge-build.md.

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

## Revision 1 (D-review-2, conductor rulings on review 2)

Edited in place: `20261112091000_session_cancel_guard.sql` (never applied) and its suite. Nothing else in `supabase/migrations/` touched.

| Item | Change | Where | Test (suite label) |
|---|---|---|---|
| F-1 MAJOR | A register row re-parented away from the lesson (`UPDATE attendance SET session_id = ...`) is erased evidence, ANY status, seeded or person-marked (fail closed: the child's bill line leaves with it). New `attendance_reparented` entries (student, old/new status, `new_session_id`) in `erased_recently`; the ordinary attendance branch no longer double-counts a re-parent. Refusing the write itself stays D4. | `_session_erased_recently` | `F-1 E2 ...` (probe reproduced: T3 lesson, admin re-parents both Present marks, preview then cancel -> `review_required:true`, both rows listed, in the queue); seeded re-parent counted; control lesson not reviewed |
| F-4 | A session's id cannot change: `OLD.id IS DISTINCT FROM NEW.id` added to the UPDATE trigger's WHEN, and `session_change_guard` raises `HC020` (`DETAIL kind=id_change`) for EVERY caller, before either lane. | trigger WHEN, `session_change_guard` | `F-4 UPDATE sessions SET id by the admin/service role/superuser -> HC020`; probe E4 |
| F-5 / B-3(c) | New `session_day_evidence(session, class, date)` (STABLE, internal): points, transcripts, homework and other Held/person-marked lessons of the class on a day. A move's `destination` now carries `day_evidence`. Destination evidence raises the tier to at least 1 (reason + confirm). Review rule now one function `_session_review_required`, which adds: a move whose destination is started, settled (`destination.any`) or has day evidence; an un-cancel when any register child's bill in the month is settled (D1's `settled` reads false after a cancel because every mark is Excused). Automation lane: a move onto a day with evidence -> `HC020`. | `_session_change_assess`, `_session_review_required`, `session_change_guard` | `F-5 G2 ...`, `F-5 G3 ...`, `F-5 I5 ...`, `F-5 automation ... homework -> HC020` + control |
| F-7 | Every top-level block of the suite now runs inside `section(name, fn)`: an unexpected throw is a FAIL line and the suite goes on. Bare fixture calls after a refusal test wrapped in `must(label, fn)` (d21, d22, d23, d24/d33, d26, d29 x3, d31, d32). New cases for the three survivors: M08 (an acknowledged un-cancel written as Held -> HC020, control Scheduled accepted), M32 (`log_session_automation_refused` with a uid on the service role -> 42501), M38 (automation move out of a paid source month into another month -> HC020, control allowed). | suite | `M08 ...`, `M32 ...`, `M38 ...` |
| F-8.2 | The preview now returns `review_required` and `erased_recently` (informational, not in the token; the RPC result is the authority). | `session_change_preview` | `F-8.2 preview of an untouched future lesson ...`, F-1/F-5 cases |
| F-9 (second half) | The audit-table insert guard is owner-only: refuses any `current_user` that is not the table's owner, besides the named API roles. | `session_cancel_audit_insert_guard` | `F-9 ...` |

Deferred, not built (rulings): guarding deletion of points/transcripts (D4); wiring the recorder view into `session_recording_evidence` (ships with the recorder migration). The F-9 `EXPLAIN ANALYZE` of the 30-day `audit_log` scan and `authenticated`'s statement timeout remain owner reads before the paste; the preview now runs the scan too (one more call per preview).

Revision deviations (fail-closed choices):
- R1. `attendance_reparented` counts rows of any status and seeded rows (the review asked only for the session_id branch on person-marked Present/Late).
- R2. Destination-day evidence raises the tier to >= 1 as well as requiring review (the ruling asked for the reviewed path only).
- R3. Destination-day evidence is read over-inclusively: points linked to ANOTHER lesson, any transcript of the day not linked to this lesson, and other Held/marked lessons of the class that day also count.

Verification (revision 1):

```
node scripts/pgtest/session-cancel-guard.test.mjs supabase/migrations/20261009130000_audit_every_admin_action.sql supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql supabase/migrations/20261112090000_session_held_evidence.sql supabase/migrations/20261112091000_session_cancel_guard.sql
-> 239 passed, 0 failed   (was 212; no case removed or weakened)
```

Mutation re-run (scratch copies, never committed), 11 mutants, all caught with the summary line printed (no crash): M08 uncancel to any status (2 FAIL), M32 automation log without uid check (4), M38 move out of a settled month (1), F-1 no re-parent branch (4), F-4 id change allowed (4), F-5 no day evidence in the raw lane (1), F-5 review ignores the destination (5), M19 flag not consumed (42 FAIL, 186 assertions reported - was a crash at 37), M17 confirm never required (12 - was a crash), M27 delete with evidence allowed (4 - was a crash), F-9 insert guard role list only (1).

## Contract for the edge functions and UI (as built)

All RPCs are called through PostgREST `rpc` on a client built from the CALLER'S OWN `Authorization` header (anon key + the admin's JWT). They are granted to `authenticated` only; `service_role` cannot execute them, and with no `auth.uid()` they refuse anyway (`42501`). Each checks `has_role(auth.uid(), 'admin')` first. Tokens are opaque 64-hex strings: send back exactly what the preview returned. Nothing returned by a preview may be cached across dialog opens.

### `session_change_preview(p_session_id uuid, p_action text, p_change jsonb DEFAULT NULL) -> jsonb`

STABLE, writes nothing, takes no lock. `p_action` in `cancel | delete | move | uncancel`. For `move`, `p_change = {"date":"YYYY-MM-DD","start_time":"HH:MM[:SS]","end_time":"HH:MM[:SS]"}` - the same values must then be passed to `move_session_checked`.

```jsonc
{
  "action": "cancel",
  "kind": "cancel" | "delete" | "move" | "uncancel" | null,   // null: a move-shaped edit the guard does not cover (B-1) - send it as a plain update
  "session": { "id","class_id","date","start_time","end_time","status","teacher_id","updated_at" },
  "started": bool,                    // for a move: started at the source OR the destination
  "tier": 0 | 1 | 2 | 3,
  "level": "NONE" | "SOFT" | "STRONG",
  "settled": { ...D1 settled object... },
  "settled_any": bool,                // source OR destination settled (move)
  "destination": null | { "month","started","payroll_month_locked","tuition","any" },   // move only
  "change": null | { "new_date","new_start_time","new_end_time","destination" },      // move only
  "evidence": { ...the whole D1 JSON (admin view)... },
  "requires": { "reason_min": 15, "confirm": bool, "correction_reason": bool },
  "allowed": bool,
  "refuse_code": null | "already_canceled" | "not_canceled" | "use_cancel" | "bad_change" | "bad_action",
  "affected": [ { "student_id","month","status","marked_by_person": bool } ],   // every attendance row of the lesson, source month
  "invoices_before": [ { "id","student_id","month","base_amount","discount_amount","total_amount","recorded_payment",
                         "status","confirmation_status","tuition_frozen","carry_in_credit","carry_in_debt",
                         "carry_out_credit","carry_out_debt","class_breakdown" } ],   // stored rows, both months on a crossing move
  "refresh_pairs": [ { "student_id","month" } ],   // what to send to calculate-tuition afterwards
  "after_cancel": { "marks_excused": int|null, "marks_excused_now": int|null },   // cancel: marks the cancel will excuse; uncancel: rows Excused now
  "token": "<64 hex>"
}
```

Errors: `42501` not an admin, `22004` NULL id, `P0002` no such lesson, `55000` evidence unavailable (recorder helper not STABLE, or evidence without its admin view).

### `cancel_session_checked(p_session_id uuid, p_action text, p_reason text, p_token text, p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}') -> jsonb`

`p_action` in `cancel | delete`. `p_context` (optional keys, never used for a decision): `batch_id` (uuid string), `set_manual` (`"true"`: cancel also sets `is_manual = true, manual_reason = reason`, as bulk-cancel does today), `attached` (object, stored as given, < 128 KB - e.g. `{ "source": "manage-session", "tuition_before": [...] }`).

### `move_session_checked(p_session_id uuid, p_new_date date, p_new_start time, p_new_end time, p_reason text, p_token text, p_confirm boolean DEFAULT false, p_correction_reason text DEFAULT NULL, p_context jsonb DEFAULT '{}') -> jsonb`

Token from `session_change_preview(id, 'move', {date, start_time, end_time})`. A same-day time edit that leaves a started lesson started is NOT a move (`HC015 bad_change`): send it as a plain update. Every date move by a signed-in person, even of an untouched future lesson (T0), must use this RPC (ruling: no raw lane for people).

### `uncancel_session_checked(p_session_id uuid, p_reason text, p_token text, p_context jsonb DEFAULT '{}', p_correction_reason text DEFAULT NULL) -> jsonb`

Back to `Scheduled` only. No `confirm`. `canceled_*` columns and attendance (`Excused`) are left as they are. `23505` = a replacement lesson sits in the slot.

Return shape of the three single RPCs:

```jsonc
{ "override_id": "<uuid>", "action": "...", "session_id": "<uuid>", "tier": 0-3, "level": "...",
  "review_required": bool, "erased_recently": bool,
  "affected": [ { "student_id","month" } ],
  "refresh_pairs": [ { "student_id","month" } ],   // refresh ALL of these after every action, move included (B-7)
  "session_before": { ...the sessions row before the change... } }
```

### `cancel_sessions_checked_bulk(p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb DEFAULT '{}') -> jsonb`

`p_items = [{ "id", "token", "confirm"?, "reason"?, "correction_reason"? }]`, at most 50 (`HC016`); `p_batch_id` required (`22004`). The edge function loops over chunks of <= 50 with ONE `batch_id`; each chunk is its own transaction. Items are processed in ascending id. A T2/T3 item needs its own `reason` (`HC017` otherwise), a T1+ item `confirm: true`, a T3 item `correction_reason`. Per-item refusals roll back only that item; any other error (deadlock, `HC050`, `55000`...) aborts the whole chunk.

```jsonc
{ "batch_id": "<uuid>",
  "done":    [ { "id","override_id","tier","review_required","refresh_pairs" } ],
  "refused": [ { "id", "code": "<SQLSTATE>", "message" } ] }   // codes: HC010-HC015, HC017, P0002
```

### `record_session_override_event(p_override_id uuid, p_kind text, p_payload jsonb DEFAULT '{}') -> uuid`

`p_kind` in `tuition_refreshed | tuition_refresh_failed | reviewed`. Tuition kinds: the payload (an object; suggested `{ "results": [ { "student_id","month","ok": bool,"error"?, "response"? } ] }` - loop to the end, one entry per pair) is stored under `payload.attached`, and SQL adds `payload.invoices_after` (its own copy of the bills of `refresh_pairs`). `reviewed` needs `payload.note` passing the reason rule (`HC010`). Errors: `42501`, `HC015 bad_kind|bad_payload`, `P0002`.

### `session_cancel_guard_status() -> jsonb` (admin only)

`{ "installed_at", "update_trigger", "delete_trigger", "truncate_trigger" ('O' enabled, 'D' disabled, null missing), "evidence_function": bool, "recording_helper_stable": bool, "ok": bool }`. Red banner unless `ok`.

### `log_session_automation_refused(p_session_id uuid, p_source text) -> uuid` (service_role only)

For `schedule-sessions` when a delete/time update comes back `HC020`/`HC021`: one `automation_refused` event. Decides nothing. `42501` when called with a user JWT.

### Views (admin-only through RLS, `security_invoker`)

- `session_cancel_review_queue`: `override_id, created_at, actor_user_id, session_id, class_id, teacher_id, session_date, action, via, batch_id, tier, level, settled, correction_mode, reason, correction_reason, confirmed, change, affected, invoices_before, refresh_pairs, payroll_month_locked, erased_recently, attached, tuition_state ('refreshed'|'failed'|'pending'), age`. Rows: `review_required` and no `reviewed` event. `review_required` = T3, or T2 STRONG, or delete at T1+, or move at T2+, or `erased_recently` not empty.
- `session_cancel_tuition_pending`: `override_id, created_at, actor_user_id, session_id, action, refresh_pairs, last_tuition_event, age` - any action older than 10 minutes with refresh pairs and no `tuition_refreshed` event.
- Tables `session_cancel_overrides` / `session_cancel_override_events`: readable by admins; full `evidence`, `session_before`, `deleted_rows` live there.

### Error codes (SQLSTATE in PostgREST's `code`)

| SQLSTATE | message | meaning | suggested HTTP |
|---|---|---|---|
| `HC010` | `reason_too_short` | reason (or review note) fails the rule: 15-1000 chars after trimming/collapsing, >= 5 distinct characters, not a retired canned string | 422 |
| `HC011` | `token_stale` | lesson row, evidence, affected children, shown bill fields, tier, action or caller changed since the preview | 409 + fresh preview |
| `HC012` | `confirm_required` | T1+ cancel/delete/move without `confirm` | 422 |
| `HC013` | `correction_reason_required` | T3 without a valid correction reason | 422 |
| `HC014` | `use_cancel` | delete of a lesson with evidence | 409 |
| `HC015` | the refuse code | `already_canceled`, `not_canceled`, `bad_change`, `bad_action`, `bad_kind`, `bad_items`, `bad_payload` | 409 / 400 |
| `HC016` | `too_many` | bulk over 50 | 413 |
| `HC017` | `own_reason_required` | bulk T2/T3 item with only the batch reason | 422 |
| `HC020` | `session_change_requires_checked_path` | a raw write was refused (DETAIL `kind=...; ...`) | 409 |
| `HC021` | same | raw `class_id` change refused | 409 |
| `HC022` | `one change at a time` | two guarded kinds in one statement | 409 |
| `HC030` | | TRUNCATE sessions | - |
| `HC040` / `HC041` | | audit row update/delete/truncate / direct insert | - |
| `HC050` | `guard_broken` | the trigger did not consume the acknowledgement (missing/disabled); nothing changed | 503 |
| `23505` | | slot taken (move, un-cancel) | 409 `slot_taken` |
| `40P01`, `40001` | | retry; nothing changed | 503 |
| `P0002` | | not found | 404 |
| `42501` | | not an admin / not executable | 403 |
| `22004` | | NULL id or batch id | 400 |
| `55000` | | evidence unavailable (recorder helper VOLATILE, evidence incomplete) | 503 |
| `PGRST202` / `42883` | | function missing: migration not pasted | 503 `guard_not_installed` |

### Revision 1: what the contract left open (D-review-2 F-8, items 1-11)

Preview additions (revision 1): `review_required` (bool), `erased_recently` (array of `{what: 'attendance'|'attendance_reparented'|'session_status', operation, student_id?, old_status, new_status, new_session_id?, actor_user_id, occurred_at}`), and for a move `destination.day_evidence = {points, transcripts, homeworks, other_lessons, any}`. Neither `review_required` nor `erased_recently` is covered by the token.

1. **Which client - a RULE.** Every person-initiated write to `sessions` - the checked RPCs AND an unguarded (`kind: null`) edit such as a same-day time change, a teacher, notes or rate edit, or `Scheduled <-> Held` - is made on a client built from the caller's own `Authorization` header (anon key + JWT). `manage-session` and `bulk-cancel-sessions` never write `sessions` with the service key. The one exception in the codebase is `schedule-sessions`' own rebuild (automation, no `auth.uid()`). The service client may still read, write `audit_log` named entries, and invoke calculate-tuition / calculate-payroll. (`manage-session` `create` still INSERTs on the service key: inserts are not guarded and the brief keeps `create` unchanged - see D2-edge-build.md deviations.)
2. **Review before Confirm.** The preview returns `review_required` and `erased_recently` (above). Informational; the RPC result's `review_required` is the authority.
3. **Partial refresh.** `tuition_refreshed` only when EVERY pair returned ok; otherwise ONE `tuition_refresh_failed` event carrying every pair's result. A retry (`manage-session` `refresh-tuition`) records a NEW event; the latest tuition event decides the queue's `tuition_state` and `session_cancel_tuition_pending` (which looks only for any `tuition_refreshed`).
4. **More errors.** `22P02`: a non-boolean `confirm` (or other malformed value) in a bulk item aborts the WHOLE chunk (not a per-item refusal) - the edge function sends booleans only. `23514`: `p_context.attached` at or over 128 KB - nothing changed; the function keeps attachments small (calculator snapshots of named fields only).
5. **Bulk details.** A duplicate id in one chunk: the second comes back `HC015 already_canceled` (the edge function de-duplicates before sending). A malformed item comes back `{id: <as given or null>, code: 'HC015', message: 'bad_item'}`. `done`/`refused` are in ascending id order, never input order: map by `id`.
6. **No bulk delete / bulk move RPC.** `manage-session` `bulk-delete` (hard) loops `cancel_session_checked(id,'delete')` one call per lesson, each its own transaction; NOT atomic. Its soft form (cancel) uses `cancel_sessions_checked_bulk` in chunks like bulk-cancel. There is no bulk reschedule.
7. **Check order.** The RPC checks: admin, reason (`HC010`), id, lock, `HC015` refuse codes, token (`HC011`), confirm (`HC012`), correction reason (`HC013`), `use_cancel` (`HC014`), bulk own reason (`HC017`). So a delete of an evidence lesson without `confirm` is `HC012` before `HC014`. The UI must branch on the preview's `allowed` / `refuse_code`, not on the RPC error.
8. **No re-class, no teacher moves.** There is no checked re-class: a `class_id` change by a person is always `HC021`; the screens do not offer it (the admin cancels and creates a lesson in the other class). A teacher cannot move a lesson's date at all once it has started or has evidence (RPCs are admin-only; the teacher policy allows only unguarded edits): the teacher asks an admin.
9. **Direct writers in `src/` that start getting `HC020`/`HC021` when the migration is pasted** and their replacement (D3): `src/components/admin/SessionActionsModal.tsx:134` (raw delete) -> manage-session `preview` + `delete`; `src/components/schedule/GlobalCalendar.tsx:191` (drag reschedule and its undo) -> manage-session `preview` op `move` + `move`; `src/components/admin/EditSessionModal.tsx:122` (start/end time) -> only a time edit that UN-STARTS a started lesson is refused (`move`): send times through manage-session `move` (which does a plain caller-JWT update when the preview's `kind` is null). Not refused (unguarded columns): `src/components/admin/class/SessionDetailDrawer.tsx:116` (notes/teacher), `src/components/admin/class/AttendanceDrawer.tsx:130` (teacher swap), `src/components/admin/TeacherScheduleTransfer.tsx:144,157` (teacher), `src/components/teacher/AttendanceMarking.tsx:217` (`Held`).
10. **`schedule-sessions` MUST** (not "may") call `log_session_automation_refused(id, 'schedule-sessions')` on an `HC020`/`HC021` from its delete or time update, and MUST NOT count that lesson as removed (`index.ts:745-750` swallows the error today). Not part of this task's files; owed by the schedule-sessions change before the paste.
11. **Chunk aborts.** `HC022`, `HC050`, `55000`, `40P01`/`40001`, `22P02` or a missing function abort the current chunk (its transaction rolls back). Earlier chunks of the same `batch_id` are COMMITTED and stay; the edge function STOPS (sends no later chunk), refreshes tuition for what was done, and returns the failed and later lessons as `not_attempted` with the code. A retry is a new request with fresh tokens (the done lessons are now `already_canceled`).

## Verification

```
node scripts/pgtest/session-evidence.test.mjs supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql supabase/migrations/20261112090000_session_held_evidence.sql
-> 143 passed, 0 failed

node scripts/pgtest/session-cancel-guard.test.mjs supabase/migrations/20261009130000_audit_every_admin_action.sql supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql supabase/migrations/20261112090000_session_held_evidence.sql supabase/migrations/20261112091000_session_cancel_guard.sql
-> 212 passed, 0 failed   (timing line: one bulk call, 50 lessons x 15 marked children, pglite: 844 ms)

node scripts/pgtest/run.mjs
-> 2157 assertions across 33 suites, 0 suite(s) failed
   (baseline 1925 / 32 / 0; +20 D1 revision, +212 new suite; no existing assertion removed or failing)
```

Mutation check of the guard (17 scratch copies of the migration, never committed), all caught (exit 1): no txid check (2 FAIL), no session check (5), no action check (2), signed-in lane open (4), no destination-started check (1), no destination-lock check (1), token without affected (3), token without invoices (2), no HC050 check (2), insert guard off (3), no erased_recently (4), bulk cap 500 (1), no own-reason rule (1), B-1 regression (2). Three were caught as a CRASH rather than FAIL lines (flag not consumed, confirm skipped, delete with evidence), because a fixture-level checked call outside `tryIt` threw; caught, but a crash hides later cases - worth hardening in a later pass.
