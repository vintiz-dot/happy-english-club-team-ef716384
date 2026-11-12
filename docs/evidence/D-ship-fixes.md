# D-ship-fixes - fixes required by D-review-3 before shipping the cancellation guard

Where I am / next step: fixes, tests and docs committed; first mutation run done (several runs died with 0xC0000142 when the session restarted - being re-run); full `run.mjs` still to run. Next: record mutation re-run + full run below, remove the node_modules link, report.

Nothing applied or deployed. No Supabase/MCP tool, no live database. Nothing under `src/` touched.

## CONTRACT FIELDS (final)

manage-session `preview` -> `{ ok, preview: P, consequences: C }`. The preview is READ-ONLY: no calculate-tuition, no calculate-payroll, no write. `figures` is accepted and ignored.

`C` (also on every bulk `needs_ack[]` row, and on a `409 token_stale` body next to the fresh `preview`):

```jsonc
{ "source": "stored",
  "affected_students": [ { "student_id", "month", "mark": { "status", "marked_by_person" } | null } ],
  "invoices_before":   [ { "student_id", "month",
                           "bill": { "total_amount", "discount_amount", "recorded_payment",
                                     "confirmation_status", "status", "tuition_frozen" } | null } ],
  "after":    { "available": false, "reason": "worked out after the change" },
  "pay_line": { "available": false, "reason": "not fetched in a preview: calculate-payroll saves the month summary when it runs" } }
```

- One entry per (student, month) in `P.refresh_pairs` (a cross-month move lists the destination month too). `bill: null` = no bill saved for that child and month. `mark: null` = no mark on this lesson.
- The token covers every `bill` field shown (plus bill id and base): a bill changed between preview and confirm -> `409 token_stale` with fresh `preview` + `consequences`.
- After-figures: the confirm's `tuition.results[].response` (the standard refresh through calculate-tuition, unchanged).
- New codes: `rate_limited` (429, body also `retryAfter`), `outside_criteria` (a row in bulk `refused`), `create` taken slot `409 slot_taken`.
- Bulk-delete confirm uses the bulk-cancel shape: `items: [{id, token}]` (anything else stripped), `include_held: true` + `held_items: [{id, token, confirm: true, reason?, correction_reason?}]`; response adds `held_ignored`.
- Criteria sent with a bulk confirm (dates, class, teacher) are enforced.
- `session_cancel_guard_status()` adds `automation_refused_30d`, `automation_refused_last`.

Full contract: docs/evidence/D2-edge-build.md "Contract for the dialogs (D3)" (updated).

## What changed

| finding | fix | where | test |
|---|---|---|---|
| F-1 MAJOR | preview makes ONE `session_change_preview` call and returns `storedConsequences(P)` (pure, from `P.invoices_before` / `refresh_pairs` / `affected`); `fetchConsequences` and `studentsAndMonths` removed. calculate-payroll upserts `payroll_summaries` for an open month (`calculate-payroll/index.ts:768`), so the pay line is DROPPED from the preview (`pay_line.available: false`). Token fingerprint now also covers `discount_amount` and `base_amount` (shown). Confirm refresh unchanged. | `_lib/session-guard.ts`, `manage-session/index.ts`, migration `_session_change_assess` | functions suite "F-1 a preview is read-only": stand-in calculate-tuition does the real upsert (status issued, auto_approved, creates rows); D1a confirmed-unpaid bills; D1c default preview tier 3, `settled_any`, correction reason required; zero invokes; D1d bills byte-identical and same count; `figures:true` ignored; bulk-cancel and bulk-delete previews zero invokes, bills identical; D1e paid bill stays paid; D1f move 70 days out creates no bill, destination shown `bill: null`; token_stale after discount / confirmation status / recorded payment change; confirm then refreshes once per pair and stores a correction (settled, correction_mode). |
| F-2 MAJOR | (tests) | functions suite | "F-2 gate": 7 callers (no header, anon key, garbage, no-role JWT, teacher, family, student) x 20 actions (every manage-session action incl. 4 preview ops, plain move, both change-status kinds, update, refresh-tuition, both bulk-delete steps, create; bulk preview, confirm, old body) = 140 calls: 401/403 with code, zero writes / RPCs / invokes, no read but `user_roles` (the stand-in now logs reads); bills and lessons byte-identical; admin control. "change-status Scheduled <-> Held" pinned to `who=user` with the admin's uid. |
| F-4 | one bulk confirm shape (`bulkConfirmItems`) for both bulk paths | lib, both functions | K5 smuggle refused `confirm_required`; held_items without include_held; without confirm 422; with both -> done (soft and hard) |
| F-5 | `outsideCriteria`: ids outside the stated dates/class/teacher are refused `outside_criteria`, not sent | lib, both functions | K7 other class (bulk-delete and bulk-cancel), outside dates |
| F-6 | `create` maps 23505 to `409 slot_taken` | manage-session | occupied slot, existing lesson byte-identical. Born Held/Canceled left: D4 (un-reasoned payroll edits), insert is not a guarded kind; behaviour kept by the brief |
| F-7 | guard status counts `automation_refused` events (30 days, last). The rebuild itself must call the RPC - patch below (schedule-sessions is not in my files) | migration | started-today delete HC020 + log -> count +1 |
| F-8 | 429 body gets `code: rate_limited`, `message_key`, `message` (same status/headers as `rateLimitResponse`); bulk pacing documented in the contract | manage-session, D2-edge-build | 51st call -> 429 rate_limited |
| F-9 | after the RPC commits, refresh and audit are each in their own try: 200 `ok:true` with `tuition.status: failed` | manage-session | scripted network throw in `record_session_override_event` -> 200, Canceled, retry refreshes |
| F-10 | `_session_erased_recently`: student_id change counts in the re-parent branch (`new_student_id`), excluded from the ordinary branch | migration | V5 swap -> review_required, one entry, stored on the override |
| F-12 | (tests) points, transcripts, homework, other marked lesson each ALONE on a future destination day: tier 1, confirm, review, automation HC020, stored reviewed; S08 started destination alone; control | guard suite | |
| F19, F21, F22, F25 | (tests) | functions suite | sibling-unresolved -> failed `sibling_unresolved`; anon key missing -> 503 misconfigured (both functions, no RPC/write); 63 days / reversed range 400, 62 ok; tier-1 hard delete as plain item refused, via held_items deleted |

Two pre-existing assertions that asserted the behaviour F-1 removes ("calculate-tuition BEFORE figures", "payroll line fetched") were REPLACED by assertions of the opposite (stored bills shown, nothing invoked). One hard-delete case now sends the evidence lesson through `held_items` (same expected `use_cancel`). No other assertion changed.

## Minors left, and why

- F-3 (dialogs): another agent builds them from the contract; ship precondition for the conductor.
- F-6 born Held/Canceled on create: D4 by the review-1 ruling (un-reasoned payroll edits).
- F-10 residue: the swapped-away child's bill is not in `refresh_pairs` (only the current register is). Reviewed and recorded; refusing the write is D4.
- F-11: deferred to D4 by ruling.
- F-13 (Held -> Scheduled without reason): D4 by the review-1 ruling.
- Bulk-cancel confirm without any criteria: allowed (contract keeps them optional); nothing recorded that did not select the lesson.
- `tuition.failed[].error` stays a raw string; the contract tells the dialog to render a key instead.

## Patch for the conductor - schedule-sessions (F-7), `supabase/functions/schedule-sessions/index.ts:756`

Replace `if (!error) {` ... `}` block's tail so a guard refusal is logged and surfaced:

```ts
      if (error && (error.code === 'HC020' || error.code === 'HC021')) {
        await supabase.rpc('log_session_automation_refused', { p_session_id: session.id, p_source: 'schedule-sessions' });
        attention.noTeacherExisting.push({ ...session, guard_refused: error.details ?? error.message }); // or a new attention.guardRefused list
      } else if (!error) {
```

(Three lines added before the existing `if (!error) {`, which becomes `else if`. A dedicated `attention.guardRefused: [] as any[]` in the object at `:521` is cleaner than reusing `noTeacherExisting`; that is a 4th line.) The RPC is granted to service_role only and refuses a caller with a uid; the rebuild runs on the service key.

## Probes for the conductor

Before the apply (read-only, review fix 4):

```sql
-- 1. statement_timeout for the API roles (role-level and database-level settings)
SELECT r.rolname, r.rolconfig,
       (SELECT s.setconfig FROM pg_db_role_setting s
         WHERE s.setrole = 0 AND s.setdatabase = (SELECT oid FROM pg_database WHERE datname = current_database())) AS database_config
  FROM pg_roles r WHERE r.rolname IN ('authenticated', 'authenticator', 'anon', 'service_role');

-- 2. size of the 30-day attendance window _session_erased_recently scans (every preview, every bulk item)
SELECT count(*) AS rows_30d,
       count(*) FILTER (WHERE operation IN ('UPDATE', 'DELETE')) AS update_delete_30d,
       pg_size_pretty(sum(pg_column_size(diff))) AS diff_size
  FROM public.audit_log
 WHERE entity = 'attendance' AND occurred_at >= now() - interval '30 days';
```

After the apply (read-only):

- `SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass AND tgname LIKE 'zz_session%'` -> three rows, all `O`; same check for the three triggers on each of `session_cancel_overrides` and `session_cancel_override_events`.
- `SELECT c.relowner::regrole, p.proowner::regrole FROM pg_class c, pg_proc p WHERE c.relname = 'session_cancel_overrides' AND p.proname = '_session_change_apply'` -> the same owner (else every checked change fails HC041).
- `SELECT has_function_privilege('authenticated', p.oid, 'EXECUTE'), has_function_privilege('service_role', p.oid, 'EXECUTE'), has_function_privilege('anon', p.oid, 'EXECUTE') FROM pg_proc p WHERE p.proname = 'cancel_session_checked'` -> true, false, false.
- `SELECT kind, count(*) FROM session_cancel_override_events GROUP BY 1` -> one `guard_installed`; `SELECT count(*) FROM session_cancel_overrides` -> 0.
- `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM public.audit_log l WHERE l.entity = 'attendance' AND l.operation IN ('UPDATE','DELETE') AND l.occurred_at >= now() - interval '30 days' AND l.diff -> 'old' ->> 'session_id' = '<a real session id>'` (the scan `_session_erased_recently` makes; read-only).
- As an admin in the app: `session_cancel_guard_status()` -> `ok: true`, `automation_refused_30d: 0`.
- Publishable key: `POST /rest/v1/rpc/session_change_preview` -> 401/42501, not PGRST202; `POST /functions/v1/manage-session` with it as bearer -> 401.
- As an admin: open a preview of a lesson whose children have confirmed bills and close it; re-read those bills - `confirmation_status` and `updated_at` unchanged (proves F-1 live).
- Next rebuild and Stars sync: `cron.job_run_details` succeeded; lessons today counted before and after.

## Verification

```
node scripts/pgtest/session-guard-functions.test.mjs <the 4 migrations>   -> 134 passed, 0 failed (was 81); +1 assertion after (F27 pin), see below
node scripts/pgtest/session-cancel-guard.test.mjs   <the 4 migrations>    -> 266 passed, 0 failed (was 239)
node scripts/pgtest/edge-functions.test.mjs                               -> 5 passed, 0 failed (98 of 98 files loaded)
```

Mutation re-run (scratch copies only, runner `scratchpad/mut.mjs`; a run stops at its first FAIL line; runs that died with 0xC0000142 or ENOENT when the session restarted / two runs shared a temp file were re-run alone):

- Functions, the review's 27: **27 caught, 0 survived** (F01, F02 by the F-2 gate case; F03 by the Scheduled <-> Held case; F19, F21, F22, F25 by their new cases; F27 survived once - the preview no longer passes through `tuitionSnapshot` - and is caught after the added assertion "the refresh result never copies paid_amount"). Plus 7 new mutants of this round (preview calls calculate-tuition / calculate-payroll again, bill matched across months, criteria not enforced, F-9 undone, 23505 mapping removed, 429 without code): **7 caught**.
- SQL, the review's 18: **18 caught, 0 survived** (S05, S06 by "F-12 ... the day alone"; S08 by "F-12 S08"; S12, S14, S15 caught - S14/S15 already by the G2 counts assertion, S12 by the other-lesson case; S11 still only by the source-text assertion). Plus 3 new: token without discount (X01) **caught by the functions suite** (the guard suite has no bill-edit-after-preview case for the discount), F-10 undone (X02) caught, guard status count removed (X03) caught.

Environment note for the conductor: during this session `@electric-sql/pglite` DISAPPEARED from the main checkout's `node_modules` (the folder was modified at 11:11 today; it is a devDependency in package.json; every pgtest suite needs it). I did not touch the main node_modules. To keep testing I installed it OFFLINE from the local npm cache into my scratchpad and junctioned it at this worktree's `scripts/node_modules/@electric-sql` (git-ignored, removed at the end). Someone should run `npm install` in the main checkout before the next pgtest run.
