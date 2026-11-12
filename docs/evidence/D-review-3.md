VERDICT-SQL: PASS
VERDICT-FUNCTIONS: PASS WITH CHANGES
SHIP: YES AFTER FIXES

# D review 3 - SQL guard revision 1 and the rewired edge functions (last review before the live apply)

Where I am / next step: FINISHED. Three probe runs and both mutation runs complete (27 function mutants, 18 SQL mutants); `.probe/` and the node_modules link removed. Next step is the conductor's: the four fixes in "Ship decision".

Counts. SQL revision 1: 0 BLOCKER, 0 MAJOR, 3 MINOR. Functions: 0 BLOCKER, 2 MAJOR, 9 MINOR. Ship unit: 1 missing part (the D3 dialogs are not in this branch).

Reviewer: fresh context, wrote none of it. Nothing applied or deployed, no Supabase/MCP tool, no live database. Every probe drove the REAL handlers of `manage-session` and `bulk-cancel-sessions` through the harness of `scripts/pgtest/session-guard-functions.test.mjs` (esbuild bundle, pglite with the real migrations `20261009130000`, `20261027090000`, `20261112090000`, `20261112091000`), from a throwaway `.probe/` folder at merge a15aa51. Three probe runs (c1, c2, c3) and two mutation runs on copies. Output lines below are verbatim, shortened only by dropping ids.

Why SHIP is not a plain YES: (1) the preview step of `manage-session` calls calculate-tuition, which rewrites each child's bill status before the guard judges the lesson - it lowers the guard's own tier and un-confirms bills when a dialog is merely opened (F-1 below); (2) the suite does not notice the admin gate being deleted from either function (F-2); (3) no dialog that speaks the new contract exists in `src/` on this branch, so after the deploy no admin could cancel, delete or drag a lesson at all; (4) two measurements review 2 asked for before the live apply are still owed. None of these is a bypass: I found no executed way for anyone to cancel, un-cancel, delete, move or re-class a lesson outside the checked path, and nothing that fails open.

---

## Findings

### F-1 MAJOR (functions) - the preview rewrites the bills it is about to judge: tier 3 becomes tier 2, and an abandoned preview leaves bills un-confirmed

- Where: `supabase/functions/manage-session/index.ts:150-158` (default `figures` on -> `fetchConsequences` -> second `preview`), `supabase/functions/_lib/session-guard.ts:232-248`; cause in `supabase/functions/calculate-tuition/index.ts:576` and `:580-607` - every call upserts `confirmation_status: auto_approved | needs_review` and `status: 'issued'` (no code path keeps `confirmed`/`adjusted`/`paid`; grep of `supabase/migrations` finds no trigger that keeps them either: `confirmation_status` appears only in `20251117061416` and the two new files).
- The guard counts a bill as settled when `recorded_payment > 0`, `status IN (paid, partial)`, `confirmation_status IN (confirmed, adjusted)` or `tuition_frozen` (`20261112091000:307-319`). The preview's own first step erases two of those four.
- Probe (executed, c2 "DEVIATION-1"; calculate-tuition replaced by a stand-in that does exactly the upsert of `index.ts:580-607` - the real function was NOT run, it needs the whole schema). Past Held lesson, two children marked Present by the teacher, both bills confirmed by an admin, not yet paid:
  ```
  D1a bills before any preview => [{"status":"issued","confirmation_status":"confirmed","recorded_payment":0,...} x2]
  D1b preview figures:false (no calculate-tuition) => {"tier":3,"level":"STRONG","settled_any":true,...,"req":{"confirm":true,"correction_reason":true}}
  D1c default preview (calculate-tuition runs first) => {"tier":2,"level":"STRONG","settled_any":false,...,"req":{"confirm":true,"correction_reason":false}}
  D1d bills after the (abandoned) preview => [{"status":"issued","confirmation_status":"auto_approved","recorded_payment":0,...} x2]
  D1e paid bill, default preview => {"tier":3,...,"settled_any":true,...} bill: status "paid" -> "issued", confirmation "confirmed" -> "auto_approved", recorded_payment 540000 kept
  D1f move preview to a month 70 days out => invoices_before: 0; after the abandoned preview: 4 bills, two of them NEW rows for 2027-01, status "issued"
  ```
- What it means. (a) A taught lesson whose bills are confirmed but unpaid is handled as tier 2, not 3: no correction reason is asked, and the stored row says `settled_any:false`. It still goes to review, because STRONG at tier 2 is reviewed - so the second look survives, the "correction of a settled lesson" record does not. (b) Opening the cancel dialog and closing it is not neutral: every child on the register has the bill's confirmation reset, and a move preview across months creates bills for the destination month. That is the same write any tuition screen makes for the student it shows; here it is made for a whole register by a step called "preview". (c) Paid bills are safe (`recorded_payment` is re-derived). Frozen bills are safe (`index.ts:380-385` plus the freeze trigger).
- Also in this finding - the 30-a-minute limit (`calculate-tuition/index.ts:62`, keyed on the caller's IP, so shared by every server-side caller). Executed with the limit reproduced in the stand-in:
  ```
  R1 preview, 20 children => {"fetched":20,"not_fetched":0,"calls_so_far":20}
  R2 confirm within the same minute => {"s":200,"ok":true,"tuition":"failed","failed":10,"sample":"Edge Function returned a non-2xx status code","event_recorded":true,"lesson":"Canceled"}
  R3 Retry at once (limit still on) => {"s":200,"ok":true,"tuition":"failed","failed":20}
  R4 Retry a minute later, by another admin => {"s":200,"ok":true,"tuition":"refreshed","failed":0}
  R7 preview, 32 children => {"fetched":30,"not_fetched":2,"sample":{...,"fetched":false,"error":"Edge Function returned a non-2xx status code"}}
  ```
  The preview spends the budget the confirm's refresh needs: with 16 or more children on the register, a confirm inside the same minute leaves some bills not recalculated. It is visible (`tuition.status: "failed"`, a `tuition_refresh_failed` event, the row appears in `session_cancel_tuition_pending` after 10 minutes) and retryable, never silent. How the real limiter behaves for function-to-function calls (what `x-forwarded-for` carries, one counter per isolate) was NOT measured.
- The "after" figure is honest: `{"fetched":false,"reason":"not_available_before_the_change"}`; nothing is estimated. A failed fetch is `fetched:false` with the error. The teacher pay line comes from calculate-payroll, which itself upserts `payroll_summaries` when the month is open (`calculate-payroll/index.ts:768`) - a second write from a preview (same write the Payroll screen makes).
- Fix (small): the preview stops calling calculate-tuition. Show the stored bill from `preview.invoices_before` (written by calculate-tuition the last time it ran; the token already covers it) and keep `after: not_available_before_the_change`. Concretely: drop the tuition loop from `fetchConsequences` (or make it opt-in with `figures: "recalculate"`), and return one preview instead of two. Test to add: bills `confirmed`, unpaid -> default preview is tier 3 with `correction_reason:true`, the bill rows are byte-identical afterwards, and `log.invokes` has no `calculate-tuition`. The confirm step's refresh stays as it is.

### F-2 MAJOR (test quality) - deleting the admin gate from either function leaves the suite green

- Where: `scripts/pgtest/session-guard-functions.test.mjs:365-375` (the gate section tries a teacher on `preview` and on the bulk preview only), no case for `change-status` Scheduled <-> Held.
- Mutation (executed on copies):
  ```
  SURVIVED | F01 admin gate removed (manage-session) | exit 0 | 81 passed, 0 failed
  SURVIVED | F02 admin gate removed (bulk-cancel)    | exit 0 | 81 passed, 0 failed
  SURVIVED | F03 Scheduled<->Held write on the service client | exit 0 | 81 passed, 0 failed
  ```
  F01/F02 survive because the database refuses the RPC with 42501, which the function maps to the same `403 forbidden`. Good defence in depth, but with the gate gone a teacher would reach `create` (a `sessions` INSERT on the SERVICE key, `manage-session/index.ts:403`), `update` and the Scheduled <-> Held write under their own RLS, and calculate-tuition / calculate-payroll on the service key through `preview` - and no test would say so. F03: the only un-reasoned status write a person can make is not pinned to the caller's client.
- The gate itself is present and works - my own probe, not the suite (c1 "B1"): teacher, family, student, a signed-in account with no role -> 403 on all 11 actions and both bulk steps; no header / garbage token -> 401; `{"writes":[],"rpcs":[],"invokes":0}` every time.
- Fix: in the gate section loop every action (incl. `create`, `update`, `change-status`, `refresh-tuition`, `bulk-delete`) for teacher / family / student / no-role and assert the status AND that `log.writes`, `log.rpcs`, `log.invokes` did not grow; add one `change-status` Scheduled -> Held case asserting the write's `who === 'user'`.

### F-3 SHIP PRECONDITION - the new dialogs are not in this branch

- Grep of `src/` for `sessionGuard`, `preview_required`, `session_change_preview`, `op: 'cancel'`: 0 files. The seven call sites still send the one-step bodies. D-9 ruling: D ships as ONE unit. Deploying the functions and the migration today would leave no screen able to cancel, un-cancel, delete or date-move a lesson (all refused, see the table in "Old screens against the new functions"). Fail-closed, but the school cannot record a cancellation until D3 ships.

### F-4 MINOR (functions) - `manage-session` `bulk-delete` (soft) takes evidence lessons in `items` without `include_held`

- Where: `manage-session/index.ts:356-362` (`cleanItems(data.items)` keeps `confirm`/`reason`/`correction_reason`). Deviation 9's stripping exists only in `bulk-cancel-sessions/index.ts:119`.
- Probe (c2): `K2 confirm (bulk-cancel-sessions): evidence lessons smuggled into items with confirm+reason => canceled 1, refused ["confirm_required","confirm_required"]` - sound. `K5 manage-session bulk-delete soft: T2 item with confirm + own reason in items => done [{"tier":2,"review":true}], C: "Canceled"`. The admin still had to send that lesson's own token, `confirm:true` and an own reason, and it is reviewed - so this is an inconsistency between the two bulk paths, not a bypass.
- Fix: same `include_held` / `held_items` shape in `bulk-delete`, or say in the contract that this path has no default exclusion.

### F-5 MINOR (functions) - bulk confirm does not check the items against the criteria it writes into `audit_log`

- Probe (c2): `K7 hard bulk-delete: ..., a lesson of ANOTHER class => done [{"tier":1,"review":true},{"tier":0,"review":false}], other: "gone"` while the request said `class_id: <cid>`. Each lesson needed its own token and has its own override row, so the per-lesson trail is right; the `session_bulk_hard_delete` / `bulk_cancel_sessions` audit rows record criteria that did not select the lesson. Same in `bulk-cancel-sessions` (criteria are "only for the audit row").
- Also: `K10 bulk-cancel preview without class or teacher (whole school, 62 days) => 200`. Allowed by design (cap 500); the dialog should make the admin choose a class or teacher.
- Fix: drop `criteria` from the confirm's audit row, or re-select and refuse ids outside it.

### F-6 MINOR (functions) - `create`: born `Held` / `Canceled` on the service key, and a taken slot is a 500

- Probe (c1): `create born Held (past) => 200 "Held"`, `create born Canceled => 200`, `create on an occupied slot => {"s":500,"code":"unexpected"}`, existing lesson untouched, log `service:insert:sessions` only, 0 override rows. Insert only - no upsert, an existing lesson cannot be overwritten. A lesson born Held in the past pays a teacher with no reason asked: behaviour kept from before by the brief; it belongs to D4 with the other un-reasoned payroll edits. Small fix now: map `23505` to `slot_taken` in `create` (the catch at `:427-433` turns it into `unexpected`).

### F-7 MINOR (rollout) - nothing calls `log_session_automation_refused`; a refused rebuild delete is silent

- Probe (c3): `N7 rebuild: delete TODAY's lesson that started 2h ago, blank register => HC020 "kind=delete; started=true; level=NONE"`, `N18 automation_refused events => 0`. `schedule-sessions/index.ts:751-765` ignores the error and simply does not count the lesson as removed. Review-2 contract gap 10 ("must call") is still open; the build doc says so. The owner will not see that the rebuild wanted to remove a lesson and was stopped.
- Fix (own small change to `schedule-sessions`, can follow the ship): on `HC020`/`HC021` call the RPC and return the lesson in an `attention` list.

### F-8 MINOR (functions) - bulk refresh will mostly fail on its first pass; the 429 of `manage-session` has no code

- A bulk cancel of 10 lessons x 12 children is 120 calculate-tuition calls against a 30-a-minute limit (`refreshDone`, `session-guard.ts:351`). Reasoning from R2/R3, not executed at that size: about 90 pairs come back `failed`. Not worse than before (the old `refreshCancelledTuition` threw at the first failure and offered no retry) and now visible per lesson; but the dialog needs a paced "retry all", one `refresh-tuition` per override, and the pending view must be shown somewhere an admin looks.
- `manage-session` allows 50 actions a minute per admin (`:61`); a preview + confirm is two. Its 429 body comes from `rateLimitResponse` and has no `code` / `message_key` - not in the contract's error table.

### F-9 MINOR (functions, reasoning only - not executed) - an exception after the RPC has committed is reported as a failure

- `manage-session/index.ts:111-115`: after `cancel_session_checked` succeeds, a throw inside `refreshAndRecord` or `audit` (a network error from supabase-js, not a returned `error`) lands in the catch at `:427` -> `500 unexpected` although the lesson IS cancelled. The next preview says `already_canceled`, so it is recoverable; the refresh then needs `refresh-tuition`, whose override id the dialog never received. Fix: wrap the after-work in its own try and return `ok:true` with `tuition.status:'failed'`.

### F-10 MINOR (SQL) - re-pointing a mark at another CHILD is not counted as erased

- Where: `20261112091000:540-570` (`_session_erased_recently` looks at status, `marked_by`, `session_id`, DELETE).
- Probe (c1 V5): `UPDATE attendance SET student_id = <another child>` on a taught lesson with two paid bills => preview `{"tier":2,"level":"STRONG","settled_any":false,"review":true,"erased":[]}`; cancel stored `tier 2, review_required:true, erased []`, `pairs 2` (the new children). Still reviewed because the marks are STRONG; the correction reason is lost and the paid children's bills are not in `affected` / `refresh_pairs`.
- Fix: in the re-parent branch also `OR (l.diff -> 'new' ->> 'student_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'student_id')`; one case. Can ship after; D4 should refuse both writes.

### F-11 MINOR (SQL, known and deferred by ruling) - points / transcripts moved away first: T3 -> unreviewed T1

- Probe (c1 V7): seeded register, paid bill, points + linked transcript = `tier 3`; after re-dating the point row and unlinking the transcript: preview `{"tier":1,"level":"NONE","settled_any":true,"review":false,"erased":[]}`, cancel stored `review_required:false`, not in the queue. This is review-2 F-3, deferred to D4 by the conductor. Still true; the owner should hear it in one sentence.

### F-12 MINOR (SQL tests) - six mutants in the revised destination rules survive

```
SURVIVED | S05 destination-day evidence no longer raises the tier
SURVIVED | S06 review ignores destination day evidence
SURVIVED | S08 review ignores a started destination
SURVIVED | S12 day evidence ignores other Held / marked lessons
SURVIVED | S14 day evidence ignores points
SURVIVED | S15 day evidence ignores transcripts
```
S05/S06/S08: each condition is covered only together with another one (a day in the past with points is also a started destination), so removing one alone changes no assertion. A lesson moved later on the SAME day onto homework set that day is the one input that reaches `day_evidence` alone; no case has it. S12/S14/S15: of the four families `session_day_evidence` reads, only homework has a case that depends on it. Add: one case per family through the automation lane (as the homework case does), the same-day case (expect tier >= 1 and `review_required`), and a move to a started destination with no day evidence. None of these is a hole in the SQL as written; they are rules a later edit could drop unnoticed.

### F-13 MINOR - Held -> Scheduled needs no reason (deviation 5), by `change-status` and by `update`

- Probe (c1): `L1 update status Held->Scheduled => 200`, `L1b change-status Held->Scheduled (no reason) => 200`. Un-Holding a taught lesson removes the teacher's pay for it; the only record is the generic `audit_log` row with `reason: null` (plus the audit trigger's row). The lowering trick itself is caught: `L2 preview after flip => tier 3, review true, erased ["session_status"]`; after excusing the marks by hand as well: `L4 => tier 1, review true, erased ["session_status","attendance","attendance"]`, `L6 stored => {"tier":1,"review_required":true,"erased":3}`. Recorded for D4 by the review-1 ruling; not a new gap.

---

## Part A - SQL revision 1, answers

- Review-2 F-1 closed? YES, as "always reviewed" (executed, c1): re-parent `V1 => tier 2, review_required true, erased ["attendance_reparented" x2], queue 1`; delete the marks `V2 => review true, erased ["attendance" x2], queue 1`; excuse by hand `V3`, `marked_by -> NULL` `V4` the same; re-parent + un-Hold `V6 => tier 1, review true, erased [reparented x2, session_status], queue 1`. The tier still drops (the marks are gone, so D1 reads less) - the review queue and the `erased_recently` list are what close it. Not closed: F-10 (student swap) and F-11 (points / transcripts).
- Primary key change: `PK admin => HC020`, `PK service => HC020 "kind=id_change; a lesson's id cannot be changed"`, `PK superuser => HC020`.
- Destination checks: move into a settled month reviewed (mutant S07 caught), un-cancel in a settled month reviewed (S09 caught), automation cannot move onto a day with evidence (S10 caught). See F-12 for the three that are not pinned.
- Everything the revision changed, from `git diff b95cd12 HEAD -- supabase/migrations/20261112091000_session_cancel_guard.sql` (126 insertions, 11 deletions; `20261112090000` unchanged; no other migration touched):
  1. `session_cancel_audit_insert_guard()` - owner-only insert test added.
  2. NEW `session_day_evidence(uuid, uuid, date)` - STABLE, definer, revoked from everyone.
  3. `_session_change_assess(...)` - `destination.day_evidence`; tier raised to >= 1 when the destination day has evidence.
  4. `_session_erased_recently(uuid)` - `student_id` in the entries; ordinary branch skips re-parents; new `attendance_reparented` branch.
  5. NEW `_session_review_required(jsonb, text, jsonb)` - the one review rule (adds destination started / settled / day evidence, and un-cancel in a settled month).
  6. `session_change_guard()` - id change refused first; automation lane also refuses a move onto a day with evidence.
  7. Trigger `zz_session_change_guard_upd` - `OLD.id IS DISTINCT FROM NEW.id` added to WHEN.
  8. `session_change_preview(...)` - returns `erased_recently` and `review_required`.
  9. `_session_change_apply(...)` - `v_review` now from (5).
  10. The REVOKE list - the two new functions added.
  No existing guard is touched: `20261027090000` is not edited and its attendance refusal still fires after an un-cancel/cancel (suite), the migration only CREATEs its own objects.

## Part B - the functions, answers

1. Authorisation - SOUND (c1 B1, above). The caller client is built from the request's own `Authorization` header (`session-guard.ts:122-127`), the same string whose token `auth.getUser` validated (`manage-session/index.ts:39-45`); no body field or other header is read. Executed: teacher header with the admin's token in `data.Authorization`, `data.access_token`, top-level `Authorization`, `x-authorization`, `apikey` -> 403; `"Bearer <admin>, Bearer <teacher>"`, lower-case `bearer`, `"Bearer Bearer <admin>"` -> 401; 0 writes / RPCs / invokes. Every write and RPC, with its client (read from the code and confirmed by the harness log, e.g. `M2 log => writes ["user:update:sessions","service:insert:audit_log"]`):

   | where | call | client |
   |---|---|---|
   | manage-session `:64`, `:96`, `:415`; bulk-cancel `:160` | `audit_log` insert (named entries, rate-limit note) | service |
   | manage-session `:403` | `sessions` INSERT (`create`) | service - the only `sessions` write on the service key |
   | manage-session `:230`, `:255`, `:299` | `sessions` UPDATE (Scheduled <-> Held, same-day time edit, teacher/rate/notes) | caller |
   | manage-session `:103`, `:368`; session-guard `:137`, `:293` | `session_change_preview`, `cancel_session_checked`, `uncancel_session_checked`, `move_session_checked`, `cancel_sessions_checked_bulk` | caller |
   | session-guard `:208` | `record_session_override_event` | caller |
   | session-guard `:182`, `:237`, `:253` | `functions.invoke` calculate-tuition / calculate-payroll | service (those functions write `invoices` / `payroll_summaries` as they always do) |

   No write to `attendance`, `invoices`, payments or payroll lines in either function or the lib. `create`: see F-6.
2. Bypass through the functions - none found (c2). Old one-step bodies -> 409 `preview_required` (suite). `update` with a date -> `409 requires_checked_path, use: "move"`; another class -> `409 reclass_not_supported`; the same date sent as a timestamp string -> 409; the code never writes date, time or class in `update` (`:299-307`). `move` on a null-kind preview: `M2 same-day time edit of a past Held lesson => 200 plain_update` on the caller's client; `M1 un-start today's started lesson, no token => 409 preview_required` (the database decides `kind`, the function cannot be talked into the plain path); `M4 end before start => 400 bad_change`. Tier lowering: F-13. Bulk smuggling: F-4. Bulk-delete limits: `K8 63 days => 400`, `K9 no class/teacher => 400`. Tokens: `T1 cancel-token used for delete => 409 token_stale`, `T2 other lesson => token_stale`, `T3 another admin => token_stale`, `T3c move with a cancel token => token_stale`, lessons untouched. Preview, then the teacher marks a child Present, then confirm: `T4 => 409 token_stale` with a fresh preview `tier 2, STRONG, review true` in the body; lesson still Scheduled.
3. Deviation 1 - F-1. calculate-tuition is deterministic for the amounts and keeps frozen figures, so an abandoned preview cannot change a correct amount; it does reset `confirmation_status` and `status`, bumps `updated_at`, and creates the row when there is none.
4. After a successful change - SOUND with F-8/F-9. `refreshPairs` continues past failures (mutant F13 caught), reports per pair, `tuition_refreshed` only when every pair is ok (see mutation table). `X1 cancel while calculate-tuition fails => 200 ok, tuition "failed", lesson "Canceled"`; `X3 teacher retries => 403`; `X4 admin retries => 200 "refreshed"`. `session_cancel_tuition_pending` lists every override older than 10 minutes with pairs and no `tuition_refreshed` event (`:1096-1107`), so a failed and a never-attempted refresh both show. A lesson with no register rows has no pairs (`R8 => tuition "none"`): as before the rewiring. Deviation 3: `refreshCancelledTuition` did nothing except read the register and call calculate-tuition, throwing at the first failure; nothing is lost. It has no caller left in `supabase/functions` (only `cancelled-lessons.test.mjs` reads the file); the new pairs are a superset (destination month of a move, un-cancel).
5. Fail-closed rollout - SOUND. Guard migration missing (database built without `20261112091000`): `preview, cancel, delete, uncancel, move, change-status to/from Canceled, bulk preview, bulk confirm, bulk-delete, refresh-tuition => 503 guard_not_installed`; `update` to Canceled => 409; `G2 writes while missing => []`; lessons unchanged. Unguarded edits (notes, Held -> Scheduled) still work on the caller's client - they are not guarded kinds. There is no fallback write in either file (read; mutant F12 caught by 6 assertions). `SUPABASE_ANON_KEY` missing: everything `503 misconfigured` except `create` (200) and the old one-step bulk body (409).
6. Errors and logging - SOUND. The functions logged nothing during c2 (`LOGGED ... => []`); the only log lines in the code are the rate-limit warning (user id) and the caught error object (`:428`, bulk `:190`: SQLSTATE, message, ids, dates - no names, figures or tokens). A non-admin never gets past the 401/403 bodies. An admin's error body carries `sqlstate` and the database's `detail` (`X7 => {"code":"use_cancel",...,"sqlstate":"HC014","detail":"A lesson with evidence is cancelled, not deleted."}`), unexpected errors are generic.
7. D3 contract gaps: see the list below.
8. Test quality: F-2 and the mutation table.

### Old screens against the new functions and the migration (nothing is accepted in a way the old screen reads as success)

| old call | what it gets | what the admin sees |
|---|---|---|
| `CancelSessionDialog.tsx:31` cancel | 409 `preview_required` | an error toast (supabase-js generic "non-2xx" text, not the function's sentence) |
| `DeleteSessionDialog.tsx:38` delete / cancel | 409 `preview_required` | error |
| `SessionActionsModal.tsx:67` cancel / force-cancel | 409 `preview_required` | error |
| `SessionActionsModal.tsx:102` change-status | to / from Canceled 409; Canceled -> Held 409 `uncancel_to_scheduled_only`; Scheduled <-> Held 200 | error / works |
| `SessionActionsModal.tsx:134` raw delete | `N10 => HC020 "a signed-in person uses the checked path"` | error, lesson stays |
| `BulkSessionDelete.tsx:80` | 409 `preview_required` (with `success:false`) | error |
| `class/EditSessionModal.tsx:46` update (teacher, rate, status, notes) | 200; status into / out of Canceled 409 `requires_checked_path` | works / error |
| `admin/EditSessionModal.tsx:122` raw time + teacher edit | `N12` future lesson OK, `N13` past Held lesson OK; an edit that un-starts a started lesson HC020 | works / error |
| `GlobalCalendar.tsx:191` drag | `N11 => HC020 "kind=move"` for a date change; same-day time drag OK | error (undo is the same call) |
| `AddSessionModal.tsx:111` create | 200 | works |

### D3 contract (docs/evidence/D2-edge-build.md) - gaps

1. `figures` defaults to ON and has side effects (F-1). Until fixed the dialogs must send `figures: false`; after the fix the contract must say where the "before" bill comes from (`preview.invoices_before`).
2. A `token_stale` body carries a fresh `preview` but no `consequences`; say whether the dialog re-requests them.
3. Bulk: how to retry failed refreshes (one `manage-session` `refresh-tuition` per `per_session[].override_id`, paced under 30 a minute) is not stated; nor what to do with `not_attempted` after `stopped` (their tokens are still good unless something changed).
4. `manage-session` 429 (50 actions a minute): body has no `code` / `message_key`; not in the table.
5. `bulk-delete` soft path: no `include_held` (F-4) - the two bulk dialogs differ; say it or align it.
6. Un-cancel: the dialog must say the register stays Excused (`X6 un-cancel => lesson "Scheduled", marks ["Excused"]`); the contract has `after_cancel` for cancel and nothing for un-cancel.
7. `consequences.tuition[].error` and `tuition.failed[].error` are raw English strings from supabase-js or calculate-tuition, not keys.
8. `review_required` in a preview is informational; the confirm's `result.review_required` is the one to show afterwards (it is in D2-build.md, not in the D3 section).
9. Teachers: no path to move or cancel (RPCs are admin-only). The contract lists teacher screens as "unaffected" but does not say the calendar must hide dragging for non-admins (a teacher's drag is HC020).
10. `create` returns 500 `unexpected` for a taken slot (F-6).
11. After any 5xx on a confirm the dialog must re-preview before telling the admin it failed (F-9).

---

## Mutation runs

Run on copies (`.probe/fm/<n>/supabase/functions`, `.probe/sm/<n>.sql`); the real files were never edited. Unmutated controls: functions suite `81 passed, 0 failed`; guard suite `239 passed, 0 failed`.

Functions - 27 mutants, 20 caught, 7 survived (every caught mutant printed its summary line; F20 and F26 were caught partly through `section ... ran to the end` FAIL lines):

```
SURVIVED F01 admin gate removed (manage-session)                 81/0   -> F-2
SURVIVED F02 admin gate removed (bulk-cancel-sessions)           81/0   -> F-2
SURVIVED F03 Scheduled<->Held write on the service client        81/0   -> F-2
caught   F04 kind-null move write on the service client          2 FAIL
caught   F05 update write on the service client                  1 FAIL
caught   F06 reason length check dropped in the function         1 FAIL (bulk; the single path is still refused by SQL HC010)
caught   F07 reason not read at all in readAck                   1 FAIL
caught   F08 missing token accepted                              5 FAIL
caught   F09 refresh skipped after a confirmed change            7 FAIL
caught   F10 bulk includes held_items by default                 5 FAIL
caught   F11 bulk plain items not stripped                       4 FAIL
caught   F12 guard-missing branch removed                        6 FAIL
caught   F13 refreshPairs stops at the first failure             3 FAIL
caught   F14 tuition_refreshed recorded although a pair failed   1 FAIL
caught   F15 update no longer refuses a date/time change         1 FAIL (the mutant answers 200 and writes no date - it only stops saying no)
caught   F16 update no longer refuses status into/out of Canceled 2 FAIL
caught   F17 cancel always sent with confirm true                2 FAIL
caught   F18 bulk held item without confirm accepted             1 FAIL
SURVIVED F19 a sibling-unresolved refresh counted as ok          81/0   - no case scripts `siblingUnresolved`; a bill not saved would be reported "refreshed"
caught   F20 caller client built without the Authorization header 17 FAIL
SURVIVED F21 SUPABASE_ANON_KEY-missing check removed             81/0   - no case; my probe G5 shows the real behaviour (503 misconfigured)
SURVIVED F22 bulk-delete 0-62 day range check removed            81/0   - no case; my probe K8 shows 400
caught   F23 change-status Canceled -> Held allowed              1 FAIL
caught   F24 a failed refresh reported as "refreshed"            1 FAIL
SURVIVED F25 hard bulk-delete: per-item confirm forced true      81/0   - no hard-delete case with a tier-1 lesson sent without confirm
caught   F26 preview on the service client                       12 FAIL
caught   F27 tuitionSnapshot leaks paid_amount                   1 FAIL
```

SQL (revised areas) - 18 mutants, 12 caught, 6 survived, no crash:

```
caught   S01 re-parent branch removed                            4 FAIL
caught   S02 re-parent counts only person-marked rows            1 FAIL
caught   S03 id change not raised in the function                4 FAIL
caught   S04 trigger WHEN omits id                               4 FAIL
SURVIVED S05 destination-day evidence no longer raises the tier  239/0  -> F-12
SURVIVED S06 review ignores destination day evidence             239/0  -> F-12
caught   S07 review ignores a settled destination                2 FAIL
SURVIVED S08 review ignores a started destination                239/0  -> F-12
caught   S09 un-cancel in a settled month not reviewed           2 FAIL
caught   S10 automation lane ignores destination day evidence    1 FAIL
caught   S11 insert guard: owner check removed                   1 FAIL (the assertion reads the function's source text, it does not try an insert as another role)
SURVIVED S12 day evidence ignores other Held / marked lessons    239/0  -> F-12
caught   S13 day evidence ignores homework                       1 FAIL
SURVIVED S14 day evidence ignores points                         239/0  -> F-12
SURVIVED S15 day evidence ignores transcripts                    239/0  -> F-12
caught   S16 preview review_required always false                6 FAIL
caught   S17 un-cancel review ignores the bills of excused children 2 FAIL
caught   S18 preview erased_recently always empty                2 FAIL
```

Add to fix 2 of the ship decision, same size: cases for F19 (scripted `siblingUnresolved: true` -> `tuition.status: "failed"`, `error: "sibling_unresolved"`), F21, F22 and F25.

---

## Ship decision

`SHIP: YES AFTER FIXES`. The SQL may be applied as it stands. The fixes, each checkable by a diff and one test:

1. F-1: `manage-session` preview no longer invokes calculate-tuition; "before" figures are the stored `invoices_before`. Test as written in F-1 (confirmed-unpaid bill stays confirmed, tier 3, no calculate-tuition invoke in a preview).
2. F-2: gate assertions for every action and role with the log unchanged; one Scheduled -> Held case pinned to the caller's client. Check: mutants F01, F02, F03 are caught.
3. F-3: the D3 dialogs are in the same push, reviewed, and use `preview` -> confirm for all seven call sites plus the three raw writers. Not a small fix; it is the missing third of the unit.
4. Owed since review 2, before the apply (reads only): `authenticated`'s `statement_timeout`, and the size of the 30-day `audit_log` attendance window that `_session_erased_recently` scans on every preview and every bulk item (a bulk preview runs it up to 500 times in one invocation). After the apply: one `EXPLAIN ANALYZE` of it.

Can follow the ship (each its own small change): F-4, F-5, F-6 (`slot_taken`), F-7, F-9, F-10, F-12. For the owner's ear, not a code change now: F-11 and F-13 (D4).

Not done by anyone yet and not blocking in my judgement: the stars-engine suites with the guard loaded (review-2 N1). What I executed instead (c3): the engine's and mark-attendance's write shapes under the guard - `N1 service: Scheduled -> Held on a started lesson => OK`, `N2 Held -> Scheduled => OK`, `N3 no JWT at all (pg_cron SQL) => OK`. The engine's own functions end to end under the three new triggers remain unproven.

### Order of operations

Do it outside teaching hours and not within the hour before 09:00 Hanoi.

1. Read-only pre-checks on live (item 4 above; the four tables D1's preflight needs exist).
2. Apply `20261112090000_session_held_evidence.sql` (adds a read-only function; changes no behaviour). Probe: `SELECT provolatile FROM pg_proc WHERE oid = to_regprocedure('public.session_held_evidence(uuid)')` -> `s`.
3. Deploy `manage-session` and `bulk-cancel-sessions`. From this moment every guarded action answers `503 guard_not_installed` and writes nothing (executed, G1/G2). This is the closed order.
4. Apply `20261112091000_session_cancel_guard.sql` straight away.
5. Push the frontend with the dialogs; read the Actions run.

Why not 4 before 3: with the guard on and the OLD function still deployed, the old function's service-key writes land in the automation lane - executed: `N14 OLD manage-session cancel (service key raw cancel) => HC020` (a 500 for the admin), but `N15 OLD manage-session delete of a blank future lesson (service key) => OK` with `N17 override rows => 0`: a person deleting a lesson with no reason and no row, which ruling 2 forbids. In the order above the only gap is minutes in which nobody can cancel.

### Post-apply probes (read-only, change nothing)

- `SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'public.sessions'::regclass AND tgname LIKE 'zz_session%'` -> three rows, all `O`. Same for the three triggers on each of `session_cancel_overrides` and `session_cancel_override_events`.
- `SELECT c.relname, c.relowner::regrole, p.proname, p.proowner::regrole FROM pg_class c, pg_proc p WHERE c.relname = 'session_cancel_overrides' AND p.proname = '_session_change_apply'` -> the same owner (the revised insert guard refuses anyone but the table's owner; a mismatch would make every checked change fail with HC041).
- `SELECT has_function_privilege('authenticated', 'public.cancel_session_checked(uuid,text,text,text,boolean,text,jsonb)', 'EXECUTE')` true, and false for `service_role` and `anon` (take the signature from `pg_proc`).
- `SELECT kind, count(*) FROM session_cancel_override_events GROUP BY 1` -> one `guard_installed`; `SELECT count(*) FROM session_cancel_overrides` -> 0.
- `session_cancel_guard_status()` needs an admin's JWT (`N19 guard status => "not allowed"` without one): call it from the app as an admin, expect `ok:true`.
- With the publishable key: `POST /rest/v1/rpc/session_change_preview` -> 401 / 42501, not `PGRST202` (proves PostgREST sees the function and anon is refused). `POST /functions/v1/manage-session` with the publishable key as bearer -> 401.
- As an admin in the app: open a preview with `figures:false` on a future lesson and close it (the RPC is STABLE; nothing is written).
- Legitimate work still passes: `SELECT count(*) FROM sessions WHERE date = current_date` before and after the next rebuild; `cron.job_run_details` for the rebuild and the Stars sync -> succeeded.

### The 09:00 rebuild and the Stars sync on their first run after the migration

- Rebuild (`schedule-sessions`, service key; shapes executed in c3): teacher change `N4 => OK`; delete of a future Scheduled lesson with a seeded register `N5 => OK`; include-held time edit of a past Held lesson `N6 => OK`; delete of today's lesson that starts later `N8 => OK`; delete of today's lesson that has already started `N7 => HC020`, lesson stays. The function ignores that error (`index.ts:752-765`), so the job does not fail; the lesson is simply not removed and nobody is told (F-7). If the template moved that lesson, the old one stays beside the new one until an admin cancels it through the checked path. No cancel or un-cancel is attempted by the rebuild.
- Stars sync: it only flips Scheduled <-> Held and writes marks; flips are not guarded kinds (`N1`, `N2`, `N3 => OK`). Marks on a cancelled lesson are refused by `20261027090000` exactly as before. Risk of the sync being stopped by the guard: none found in the write shapes; the engine functions end to end were not run with the guard (N1 suite).
- Neither path can be made to cancel: `N14 => HC020 "kind=cancel; never without the checked path"`.

---

## Checked and found sound (executed unless marked)

- Admin gate before any evidence or figure is read, all roles, both functions; token cannot be steered by body or extra headers (c1 B1).
- No `sessions` UPDATE/DELETE and no guard RPC on the service key in any person-initiated path (log of c2; suite assertion; mutants F04, F05 caught).
- Old one-step bodies, tokens across action / lesson / admin, stale state, move rules, `update` refusals, bulk smuggling in `bulk-cancel-sessions`, bulk-delete limits (c2).
- Review-2 F-1 and F-4, and the destination rules that are pinned (c1; mutants S01-S04, S07, S09, S10 caught).
- Guard missing -> 503 and no write; anon key missing -> 503; no fallback path (c2 G1-G5; code read).
- Refresh continues past failures, is reported per pair, is retryable by any admin and only by an admin; pending view definition (c3 X1-X5; code read `:1096-1107`).
- Un-cancel goes through the RPC, refreshes, leaves marks Excused (c3 X6).
- `refreshCancelledTuition`: no behaviour lost, no production caller left (code read, grep).
- Other writers of `sessions` in `supabase/functions`: only `mark-attendance:176` (Held flip) and `schedule-sessions` (`:429`, `:677`, `:700`, `:753`) - none cancels (grep).
- Money rules: the two functions and the lib compute nothing; figures are copied from calculate-tuition / calculate-payroll field by field, never `paid_amount`; no write to attendance, invoices, payments or payroll lines; every checked change leaves the append-only override row (actor, reason, before, evidence, invoices before) and the refresh event (code read; `L6 stored => actor true`).

## Not checked

- The full `node scripts/pgtest/run.mjs` (the conductor is running it) and `edge-functions.test.mjs`.
- The real calculate-tuition and calculate-payroll (stand-ins; F-1 rests on reading `index.ts:576-607` and on a stand-in that does the same upsert). Whether live has a trigger outside the repo that keeps `confirmed`.
- The live database, PostgREST's real error shapes (`PGRST202`), supabase-js `functions.invoke` on non-2xx, the real rate limiter between functions, statement timeouts, two-connection races.
- The stars engine and `schedule-sessions` end to end under the guard (write shapes only).
- The D3 dialogs (none exist here) and the i18n keys.
- A future lesson whose register the Pixel Pal sync wrote was deleted by the rebuild shape in my probe (`N9 => OK`); the fixture is artificial (the sync marks taught lessons) and I did not establish whether D1 is meant to count such a mark before the lesson starts.
