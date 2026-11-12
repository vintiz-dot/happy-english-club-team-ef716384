# D2 edge build

Where I am / next step: FINISHED. Revision 1 + both functions + tests; full run 2265/34/0; node_modules link removed. Next belongs to the conductor: review, then D3 builds the dialogs from "Contract for the dialogs (D3)". Nothing applied or deployed.

Written and tested only. NOTHING applied or deployed: no Supabase/MCP tool, no live database. Every change to cancellation behaviour waits for the owner.

## Files

- `supabase/migrations/20261112091000_session_cancel_guard.sql` - revision 1 (in place; never applied). See `docs/evidence/D2-build.md` "Revision 1".
- `scripts/pgtest/session-cancel-guard.test.mjs` - sections, `must()`, revision cases.
- `supabase/functions/_lib/session-guard.ts` (new; imports nothing) - error mapping, reason check, caller client, refresh loop, consequences, bulk chunks/preview.
- `supabase/functions/manage-session/index.ts`, `supabase/functions/bulk-cancel-sessions/index.ts` - rewired.
- `scripts/pgtest/session-guard-functions.test.mjs` (new), `scripts/pgtest/run.mjs` (one entry).

## What changed in the functions

- Every person-initiated write to `sessions` in both functions is on `asCaller` = `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: <caller's header> } } })`: the checked RPCs, AND the unguarded plain updates (`update`, Scheduled<->Held `change-status`, a same-day time edit). The service client keeps: the admin gate (unchanged), reads, the named `audit_log` entries, and `functions.invoke('calculate-tuition' | 'calculate-payroll')`. Exception kept as the brief asks: `create` still INSERTs on the service key (inserts are not guarded).
- The canned reasons are gone (`'Admin force-canceled (correction)'`, `'Admin status change'`, `'Bulk cancellation'`, `reason ||` fallbacks). A reason is trimmed/collapsed and required (>= 15 chars as a courtesy; SQL's `session_change_reason_ok` is the authority, and refuses the old canned strings too).
- Two steps everywhere a guarded change happens: `preview` (token) -> action with token + reason. A call without a token is `409 preview_required` (old screens).
- After every successful RPC: `refreshPairs` over the RPC's `refresh_pairs` - calculate-tuition per (student, month), continuing past failures, one result per pair - then ONE event: `tuition_refreshed` if every pair is ok, else `tuition_refresh_failed` with all results. The change stands either way (200, `tuition.status: 'failed'`). Retry: `refresh-tuition`.
- Guard migration missing (PostgREST `PGRST202`, or `42883`; `PGRST205`/`42P01` for its tables) -> `503 guard_not_installed`, message "The database update for checked cancellation has not been applied yet. Nothing was changed." No fallback write exists in either function.
- Un-cancel now goes through `uncancel_session_checked` and refreshes tuition (D0 gap).

## Tests

`node scripts/pgtest/session-guard-functions.test.mjs <4 migrations>` -> 81 passed, 0 failed. The real functions are esbuild-bundled with https imports stubbed (supabase-js -> a stand-in, deno.land zod -> the npm zod in node_modules), `Deno.serve` captured, requests driven. The stand-in for PostgREST runs every query and RPC in pglite loaded with the REAL migrations (20261009130000, 20261027090000, 20261112090000, 20261112091000), as `service_role` for the service key and as `authenticated` with the JWT's uid for a caller client, so the real RPCs, triggers and RLS decide. Only calculate-tuition / calculate-payroll are scripted. Cases: no token / non-admin (both functions); every old one-step UI body refused with a code; missing, short and canned reasons; T0, T1, T2 (payroll line fetched for a Held lesson), T3 (correction reason); stale token (fresh preview in the body; another admin's token); un-cancel (refresh now runs) via `uncancel` and `change-status`; delete refused with evidence, T0 delete; refresh continuing past a failing pair + retry event; move (T0 checked, same-day kind-null plain update, update with date / class refused); bulk with mixed evidence, sneaked T1 refused, held_items ignored without include_held, per-session ack with own reason (HC017 without), 120 lessons in 3 chunks of <= 50; manage-session hard bulk-delete; create unchanged; RPC missing -> 503 everywhere with NO write to sessions; and the F-2 acceptance assertion: over the whole run, no UPDATE/DELETE of `sessions` and no guard RPC on the service client, and no override row without a person. Non-vacuity check (scratch, reverted with `git checkout`): calling the confirm RPCs on the service client instead -> 22 FAIL lines.

`node scripts/pgtest/edge-functions.test.mjs` -> 5 passed, 0 failed (96 of 96 files loaded).

## Deviations (each the fail-closed or the spec-silent choice)

1. **Preview calls calculate-tuition, which saves the canonical bill** (`_lib/session-guard.ts` `fetchConsequences`; `manage-session/index.ts` preview). calculate-tuition always writes the invoice it computes and has no projection mode, so: it runs BEFORE the preview that issues the token (the token then covers the refreshed bill), BEFORE figures are passed through as a snapshot of named fields (never `paid_amount`), and AFTER figures are reported as `{ fetched: false, reason: 'not_available_before_the_change' }` - the real after-figures come back from the confirm step's refresh. `figures: false` skips it. Bulk previews never fetch figures (rate limit 30/min).
2. **Teacher pay line** (design silent): fetched from calculate-payroll `{ month, teacherId }` only for a single preview of a `Held` lesson, passed through raw; otherwise `{ fetched: false, reason }`.
3. **`refreshCancelledTuition` kept unchanged but no longer called** by these two functions (`_lib/refresh-cancelled-tuition.ts`): it throws at the first failed pair and reads attendance (gone after a delete). `refreshPairs` makes the same call with the same failure test (`error`, `data.error`, `siblingUnresolved`) and continues (review-1 B-7).
4. **`create` still writes on the service key** (`manage-session/index.ts`, `create`): brief says unchanged; INSERT is not guarded. Recorded in the F-2 assertion as the one service-key sessions write.
5. **`change-status` Scheduled <-> Held keeps an optional reason** (not a guarded kind; behaviour unchanged except the write is the admin's own).
6. **`update` refuses** status into/out of Canceled (`requires_checked_path`, `use_action`), any date/start/end change (`use_action: 'move'`) and any class change (`reclass_not_supported`) before writing; the old "status Canceled -> refresh" branch is gone with it.
7. **`move` with a kind-null preview does a plain update only for the same date with end > start** on a non-cancelled lesson; anything else 400 `bad_change`.
8. **Bulk chunk failure stops the loop** (HC022, HC050, 55000, retry, guard missing, unexpected): done chunks stay and are refreshed, the rest are `not_attempted`; if nothing was done or refused the error itself is returned with its status.
9. **Bulk plain items are stripped to `{id, token}`** so a client cannot smuggle `confirm`/`reason` past the default exclusion; acknowledged lessons only come through `held_items` with `include_held: true`, and each must carry `confirm: true` (422 otherwise, nothing sent).
10. **`bulk-delete` (manage-session) now requires** `step`, both dates, a class or teacher, and a range of 0-62 days (design 7.2); it had none of these.
11. **`SUPABASE_ANON_KEY` missing -> 503 `misconfigured`** for every action but `create` (no caller client can be built; refusing is the closed option).

## NOT built / NOT tested

- Not deployed; not run against a real Supabase (PostgREST error shapes for PGRST202 are the documented ones, simulated).
- supabase-js `functions.invoke` behaviour on non-2xx (the UI must read `error.context`) not exercised - the tests call the handler directly.
- `schedule-sessions` calling `log_session_automation_refused` (contract gap 10) - not in this task's files.
- Two-connection races (pglite is one connection).
- The UI (D3).

## Full run

```
node scripts/pgtest/run.mjs
-> 2265 assertions across 34 suites, 0 suite(s) failed   (exit 0)
   baseline 2157 / 33 / 0; +27 in "session cancel guard" (212 -> 239), +81 new "session guard functions";
   every other suite at its baseline count; no assertion removed, weakened or failing.
```

## Contract for the dialogs (D3)

Transport: `supabase.functions.invoke(name, { body })` from the signed-in admin's client (its JWT is the caller). Every response is JSON. On a non-2xx status supabase-js returns `error` (FunctionsHttpError) with `data: null`: read the body with `await error.context.json()`. Every error body is:

```jsonc
{ "ok": false, "code": "<code>", "message_key": "sessionGuard.error.<code>", "message": "<English fallback>",
  "sqlstate": "<SQLSTATE or PGRST code, when it came from the database>", "detail": "...", ...extra }
```

Render by `message_key`; `message` is a fallback only. Never cache a preview across dialog opens; tokens are opaque 64-hex strings bound to this admin, this lesson, this action and the state shown.

### Error codes (both functions)

| code | HTTP | wording key | when / what the dialog does |
|---|---|---|---|
| `unauthorized` | 401 | `sessionGuard.error.unauthorized` | no / bad JWT: sign in again |
| `forbidden` | 403 | `sessionGuard.error.forbidden` | not an admin |
| `bad_request` | 400 | `sessionGuard.error.bad_request` | missing id, bad dates/range, malformed value (`22P02`, `22004`) |
| `bad_action` | 400 | `sessionGuard.error.bad_action` | unknown action / op |
| `bad_change` | 400 | `sessionGuard.error.bad_change` | move values invalid, or not a move |
| `bad_items` | 400 | `sessionGuard.error.bad_items` | bulk items missing / without id+token |
| `preview_required` | 409 | `sessionGuard.error.preview_required` | no token: open the preview first (old screens get this) |
| `reason_required` | 422 | `sessionGuard.error.reason_required` | reason missing/blank |
| `reason_too_short` | 422 | `sessionGuard.error.reason_too_short` | < 15 chars, < 5 distinct chars, or a retired canned reason (`HC010`) |
| `correction_reason_required` | 422 | `sessionGuard.error.correction_reason_required` | T3 without a valid correction reason (`HC013`) |
| `confirm_required` | 422 | `sessionGuard.error.confirm_required` | T1+ without `confirm: true` (`HC012`); bulk held item without confirm |
| `own_reason_required` | 422 | `sessionGuard.error.own_reason_required` | bulk T2/T3 item with only the batch reason (`HC017`) |
| `token_stale` | 409 | `sessionGuard.error.token_stale` | something changed: body carries `preview` (fresh) - show it again, ask again |
| `use_cancel` | 409 | `sessionGuard.error.use_cancel` | delete of a lesson with evidence: offer Cancel |
| `already_canceled` | 409 | `sessionGuard.error.already_canceled` | |
| `not_canceled` | 409 | `sessionGuard.error.not_canceled` | un-cancel of a lesson that is not cancelled |
| `uncancel_to_scheduled_only` | 409 | `sessionGuard.error.uncancel_to_scheduled_only` | change-status Canceled -> Held |
| `requires_checked_path` | 409 | `sessionGuard.error.requires_checked_path` | `update` tried a guarded change (body `use_action`: `cancel`/`uncancel`/`move`), or the DB refused a raw write (`HC020`) |
| `reclass_not_supported` | 409 | `sessionGuard.error.reclass_not_supported` | class change (`HC021`): cancel and create in the other class |
| `one_change_at_a_time` | 409 | `sessionGuard.error.one_change_at_a_time` | `HC022` |
| `slot_taken` | 409 | `sessionGuard.error.slot_taken` | move / un-cancel into an occupied slot (`23505`) |
| `too_many` | 413 | `sessionGuard.error.too_many` | > 500 lessons in a bulk preview/confirm: narrow the range |
| `not_found` | 404 | `sessionGuard.error.not_found` | |
| `rejected_by_database` | 400 | `sessionGuard.error.rejected_by_database` | `23514` (attachment too large) |
| `guard_not_installed` | 503 | `sessionGuard.error.guard_not_installed` | migration not pasted: "The database update for checked cancellation has not been applied yet." Disable the action. |
| `guard_broken` | 503 | `sessionGuard.error.guard_broken` | trigger missing/disabled (`HC050`); nothing changed |
| `evidence_unavailable` | 503 | `sessionGuard.error.evidence_unavailable` | `55000`; nothing changed |
| `retry` | 503 | `sessionGuard.error.retry` | deadlock/serialization; nothing changed, try again |
| `misconfigured` | 503 | `sessionGuard.error.misconfigured` | function lacks SUPABASE_ANON_KEY |
| `unexpected` | 500 | `sessionGuard.error.unexpected` | anything else |

> **Revised by the ship fixes (docs/evidence/D-ship-fixes.md, D-review-3).** The preview is READ-ONLY: it calls neither calculate-tuition nor calculate-payroll and writes nothing. `consequences` (`C` below) carries the STORED bills. Added codes: `rate_limited` (429), `outside_criteria` (bulk refused row). `create` on a taken slot is now `409 slot_taken`. Bulk-delete confirm takes the same `items` / `include_held` / `held_items` shape as bulk cancel.

| code | HTTP | wording key | when / what the dialog does |
|---|---|---|---|
| `rate_limited` | 429 | `sessionGuard.error.rate_limited` | manage-session: more than 50 actions a minute by this admin (a preview + confirm is two). Body also has `retryAfter` (seconds). Nothing changed; wait. |
| `outside_criteria` | - (row in `refused`) | `sessionGuard.error.outside_criteria` | bulk confirm: this lesson is not inside the dates / class / teacher the request states; it was not sent. |

### manage-session: preview (all single dialogs)

Request `{ "action": "preview", "data": { "id": "<uuid>", "op": "cancel"|"delete"|"move"|"uncancel", "change"?: { "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM" } } }` (`change` required for `move`). `figures` is accepted and ignored (a preview never fetches figures).

Response 200 `{ "ok": true, "preview": P, "consequences": C }`.

`P` (from `session_change_preview`, D2-build.md contract + revision 1): `action`, `kind` (`null` = an unguarded time edit; send it with `move`, no token/reason needed), `session {id,class_id,date,start_time,end_time,status,teacher_id,updated_at}`, `started`, `tier` 0-3, `level` NONE|SOFT|STRONG, `settled` (D1 object), `settled_any`, `destination` (move: `{month, started, payroll_month_locked, tuition, any, day_evidence {points, transcripts, homeworks, other_lessons, any}}`), `change`, `evidence` (D1 admin JSON: `items[]` with `label_key`, `count`, `at`, `actor_id`), `requires {reason_min: 15, confirm, correction_reason}`, `allowed`, `refuse_code` (`already_canceled|not_canceled|use_cancel|bad_change|bad_action`), `affected [{student_id, month, status, marked_by_person}]`, `invoices_before [...]`, `refresh_pairs [{student_id, month}]`, `after_cancel {marks_excused, marks_excused_now}`, `review_required`, `erased_recently [...]`, `token`.

Dialog rules: branch on `allowed`/`refuse_code` first (not on a later RPC error - check order, D2-build.md gap 7). Ask for confirmation when `requires.confirm`; ask for a correction reason when `requires.correction_reason`; say "this goes to review" when `review_required`; show `erased_recently` entries as "removed before this cancel".

`C` (final, D-ship-fixes) - built from `P` alone, no other read, no arithmetic:

```jsonc
{ "source": "stored",
  "affected_students": [ { "student_id", "month", "mark": { "status", "marked_by_person" } | null } ],
  "invoices_before":   [ { "student_id", "month",
                           "bill": { "total_amount", "discount_amount", "recorded_payment",
                                     "confirmation_status", "status", "tuition_frozen" } | null } ],
  "after":    { "available": false, "reason": "worked out after the change" },
  "pay_line": { "available": false, "reason": "not fetched in a preview: calculate-payroll saves the month summary when it runs" } }
```

One `affected_students` and one `invoices_before` entry per (student, month) in `P.refresh_pairs` (a move across months lists the destination month too). `bill: null` = no bill is saved for that child and month (say "no bill yet", never 0). `mark: null` = the child has no mark on this lesson. Show the bill fields exactly as given; `recorded_payment` is what was paid in that month (never `paid_amount`). The after-figures come from the confirm step's `tuition.results[].response`. The token covers every field of `bill` (plus the bill id and base): a bill that changes between preview and confirm gives `409 token_stale`, whose body now carries `preview` AND `consequences` (fresh) - show them, ask again.

### manage-session: confirm actions (single)

| UI action | request `data` (always with `"action"` as named) |
|---|---|
| Cancel | `action: "cancel"` (or `"force-cancel"`, same behaviour): `{ id, token, reason, confirm?: true, correction_reason? }` |
| Un-cancel | `action: "uncancel"`: `{ id, token, reason, correction_reason? }` (no confirm) |
| Delete | `action: "delete"`: `{ id, token, reason, confirm?: true, correction_reason? }` |
| Move / reschedule (incl. calendar drag and its undo) | `action: "move"`: `{ id, date, start_time, end_time, token, reason, confirm?, correction_reason? }`; when the preview's `kind` is null send `{ id, date, start_time, end_time }` only -> `{ ok: true, kind: null, applied: "plain_update" }` |
| Status menu | `action: "change-status"`: `{ id, status, token?, reason?, confirm?, correction_reason? }` - to `Canceled` = Cancel (token+reason), from `Canceled` to `Scheduled` = Un-cancel (token+reason), Scheduled<->Held needs nothing more; same status -> `{ ok: true, unchanged: true }` |
| Edit (teacher, rate, notes, manual flags) | `action: "update"`: `{ id, teacher_id?, rate_override_vnd?, status?, notes?, is_manual?, manual_reason? }` - no date/time/class here |
| Retry tuition | `action: "refresh-tuition"`: `{ override_id }` |

Success 200:

```jsonc
{ "ok": true,
  "result": { "override_id", "action", "session_id", "tier", "level", "review_required", "erased_recently": bool,
              "affected": [ { "student_id", "month" } ], "refresh_pairs": [ { "student_id", "month" } ], "session_before": { ... } },
  "tuition": { "status": "refreshed"|"failed"|"none", "results": [ { "student_id", "month", "ok", "error"?, "response"? } ],
               "failed": [ { "student_id", "month", "error" } ], "event_recorded": bool, "event_error"? } }
```

`tuition.status: "failed"` means the change IS made and some bills are not recalculated: show a blocking "Retry" that calls `refresh-tuition` with `result.override_id` (response `{ ok, override_id, tuition }`). A failure that happened after the database committed the change (a network error while refreshing or writing the event) is ALSO a 200 with `tuition.status: "failed"` (one `failed` entry with `student_id: null`); it is never reported as a failed change. If a confirm still answers 5xx, re-open the preview before telling the admin it failed (`already_canceled` / `not_canceled` there means it did go through). `tuition.failed[].error` is a raw English string (or `"sibling_unresolved"`): show the wording key `sessionGuard.tuition.refresh_failed`, not the string. `result.review_required` is the authority after a confirm; the preview's `review_required` is a forecast.

Un-cancel: the register stays Excused after an un-cancel (marks are not restored); `P.after_cancel.marks_excused_now` says how many. The dialog says so and links to the register.

### Bulk cancel (bulk-cancel-sessions)

Preview (read-only, no calculate-tuition): `{ "step": "preview", "date_from", "date_to" (both required, 0-62 days), "class_id"?, "teacher_id"? }` -> `{ ok: true, success: true, batch_id, plain: [Row], needs_ack: [Row + { level, settled_any, requires, review_required, evidence, affected, invoices_before, consequences: C }], refused: [Row + { refuse_code }], preview_failed: [{ id, code, message_key }] }`; `Row = { id, date, start_time, end_time, status, class_id, teacher_id, tier, token }`; `C` is the same block as the single preview. Non-cancelled lessons only; > 500 -> `too_many`. The dialog should make the admin pick a class or a teacher (the API allows the whole school, capped at 500).

Confirm: `{ "step": "confirm", "batch_id" (from the preview), "reason" (batch reason, required), "items": [{ id, token }] (the plain rows; any other field is stripped), "include_held"?: true, "held_items"?: [{ id, token, confirm: true, reason? (required by SQL for tier 2/3), correction_reason? (tier 3) }] , "date_from"?, "date_to"?, "class_id"?, "teacher_id"? }`. Send the same criteria as the preview: every criterion sent is ENFORCED - a lesson outside it is refused `outside_criteria` and not sent. `held_items` without `include_held: true` are ignored (`held_ignored: n`).

Response 200: `{ ok, success, partial, batch_id, canceled: [{ id, override_id, tier, review_required }], refused: [{ id, code, message_key, sqlstate }], not_attempted: [{ id, code }], needs_ack: [{ id, tier, level, settled_any, requires, review_required, evidence, token, consequences: C }], held_ignored, stopped: null | { code, message_key, message }, tuition: { status, per_session: [{ id, override_id, status, failed, event_recorded }], failed } }`. `ok: false` + `stopped` = a chunk failed (done chunks stand); `not_attempted` lessons were not sent - their tokens stay good unless something changed (a confirm then answers `token_stale` per lesson). The dialog lists `refused` with their wording and offers `needs_ack` for one-by-one acknowledgement (each with its own reason, confirm, correction reason).

Retrying failed refreshes after a bulk: one manage-session `refresh-tuition` per `tuition.per_session[].override_id` whose `status` is `failed`, paced (calculate-tuition allows 30 calls a minute for every caller together; a lesson of 12 children is 12 calls). A bulk of more than ~2 lessons will usually leave some `failed` on its first pass; that is expected and visible, not an error. Overrides older than 10 minutes without a `tuition_refreshed` event are listed by the view `session_cancel_tuition_pending` - show it on the admin's sessions page.

### Bulk delete (manage-session `bulk-delete`)

Preview `{ action: "bulk-delete", data: { step: "preview", from_date, to_date, class_id? | teacher_id? (one required), hard_delete: bool } }` -> `{ ok, op: "delete"|"cancel", batch_id, plain, needs_ack, refused, preview_failed }` (same rows as bulk cancel, `needs_ack` with `consequences`; hard delete includes cancelled lessons; evidence lessons are in `refused` with `use_cancel`). Confirm - SAME SHAPE AS BULK CANCEL (D-ship-fixes F-4): `{ step: "confirm", ..same criteria (enforced, outside_criteria).., reason, batch_id, items: [{ id, token }], include_held?: true, held_items?: [{ id, token, confirm: true, reason?, correction_reason? }] }` -> `{ ok, partial, op, batch_id, done: [{ id, override_id, tier, review_required }], refused, not_attempted, held_ignored, stopped, tuition }`. A past or started lesson without evidence is tier 1 even for a hard delete: it goes in `held_items` with `confirm: true`. Hard delete is one RPC per lesson (not atomic); soft goes in chunks of 50.

Teachers: every checked RPC is admin-only, so a teacher cannot cancel, delete or move a lesson; the calendar must not offer dragging to non-admins (a teacher's drag is refused by the database, HC020).

`create`: a taken slot is `409 slot_taken` (was `500 unexpected`).

### UI call sites that break against the new functions (ship functions and dialogs together)

| file:line | call | after the new functions |
|---|---|---|
| `src/components/admin/CancelSessionDialog.tsx:31` | `manage-session` `cancel` without token, default reason `"No reason provided"` | 409 `preview_required` |
| `src/components/admin/DeleteSessionDialog.tsx:38` | `delete` / `cancel` without token, reason `"Deleted via admin interface"` | 409 `preview_required` |
| `src/components/admin/SessionActionsModal.tsx:67` | `cancel` / `force-cancel` without token, reason `"Admin canceled"` | 409 `preview_required` |
| `src/components/admin/SessionActionsModal.tsx:102` | `change-status` | to/from Canceled: 409 `preview_required` (Canceled -> Held: `uncancel_to_scheduled_only`); Scheduled <-> Held still works |
| `src/components/admin/BulkSessionDelete.tsx:80` | `bulk-cancel-sessions` one-step body | 409 `preview_required`; it also reads `data.success` |
| `src/components/admin/class/EditSessionModal.tsx:46` | `manage-session` `update` | works, except a status into/out of Canceled -> 409 `requires_checked_path` |
| `src/components/admin/AddSessionModal.tsx:111` | `create` | unchanged |

Direct writers that break when the MIGRATION is pasted (not these functions): `src/components/admin/SessionActionsModal.tsx:134` (raw delete by a signed-in admin -> always HC020: use `preview` + `delete`), `src/components/schedule/GlobalCalendar.tsx:191` (drag -> HC020: use `preview` op `move` + `move`), `src/components/admin/EditSessionModal.tsx:122` (time edit that un-starts a started lesson -> HC020: use `move`). Unaffected: `SessionDetailDrawer.tsx:116`, `AttendanceDrawer.tsx:130`, `TeacherScheduleTransfer.tsx:144,157`, `teacher/AttendanceMarking.tsx:217`.
