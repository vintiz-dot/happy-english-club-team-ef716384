VERDICT-D1: PASS
VERDICT-D2: PASS WITH CHANGES

# D review 2 - the built cancellation guard and the revised evidence function

Where I am / next step: FINISHED. Probes, 43 valid mutants, deviations and contract reviewed; `.probe/` and the node_modules link removed. Next step belongs to the conductor: F-1 and F-4 are small SQL edits to `20261112091000` (it is not applied anywhere yet), F-2 and the contract list go into the edge-function brief.

Counts: D1 - 0 BLOCKER, 0 MAJOR, 0 MINOR. D2 - 0 BLOCKER, 2 MAJOR, 7 MINOR, 1 NOTE.

Reviewer: fresh context, wrote none of it. Nothing applied to any database, no Supabase/MCP tool used. Probes ran in pglite from a throwaway `.probe/` folder against the real files `20261009130000`, `20261027090000`, `20261112090000`, `20261112091000`, with the same prelude as the builder's suite (`scripts/pgtest/session-cancel-guard.test.mjs:34-175`).

Why D2 is PASS WITH CHANGES and not FAIL: I found no executed way to cancel, un-cancel, delete, re-class or date-move a lesson that has started or has evidence without the checked RPC, a reason and an append-only row; no state that fails open; no existing guard changed. The two MAJORs are (F-1) a one-line gap in the "erased before the cancel" detector that lets a T3 cancel be done as an unreviewed T1 - the cancel itself is still reasoned and recorded - and (F-2) a rollout fact about today's edge functions, not about the SQL. If the conductor counts "evading correction mode and the review queue" as a bypass, F-1 alone makes this a FAIL until its fix lands; I do not soften it, I rank it.

Full run: NOT re-run by me (conductor's instruction; the conductor's own run on the merged branch: 2157 assertions, 33 suites, 0 failed). I ran the guard suite about 50 times under mutation; unmutated it is 212 passed, 0 failed.

---

## Findings

### F-1 MAJOR - re-pointing the register at another lesson turns a taught, paid lesson (T3) into an unreviewed T1 cancel

- Where: `supabase/migrations/20261112091000_session_cancel_guard.sql:488-498` (`_session_erased_recently` looks only for a status change, a `marked_by` going NULL, or a DELETE), `:413-422` and `:440-444` (affected and refresh pairs = rows whose `session_id` is this lesson).
- Probe (executed, E2). Past lesson, two children marked Present by the teacher, one bill paid:
  ```
  E2 taught (2 person-marked Present) + paid, preview => {"tier":3,"level":"STRONG","settled_any":true,...,"correction_reason":true}
  E2 admin raw: UPDATE attendance SET session_id = <another lesson of the class> => OK rows=0 affected=2
  E2 preview after => {"tier":1,"level":"NONE","started":true,"settled_any":false,...,"correction_reason":false}
  E2 cancel now => OK {"tier":1,"level":"NONE","action":"cancel","affected":[], ... "refresh_pairs":[] ...}
  E2 stored row => {"tier":1,"level":"NONE","review_required":false,"erased":0,...} | in review queue: 0
  ```
  Control (E1: marks set to Excused and Held -> Scheduled instead): `review_required:true, erased:3`, in the queue. Required change 4 works for the routes it names and not for this one.
- Why it matters: correction mode and the review queue are the only second look at a cancel of a settled lesson. One PostgREST update by an admin (the attendance guard `20261027090000` does not look at `session_id` changes) removes both, and leaves `affected` and `refresh_pairs` empty: no bill is refreshed and the audit row says nobody was affected.
- Fix: in the attendance branch of `_session_erased_recently` add `OR (l.diff -> 'new' ->> 'session_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'session_id')`; add the E2 case to the suite. For D4: refuse any UPDATE of `attendance.session_id` (nothing in the app needs it).

### F-2 MAJOR (rollout) - today's `manage-session` hands a signed-in admin the automation lane

- Where: `supabase/functions/manage-session/index.ts:23-24` (service-role client), `:215` (date update), `:264`, `:318` (deletes); guard `:569` (`auth.uid() IS NOT NULL` is the only "is this a person" test).
- The function checks the admin's JWT itself, then writes with the service key, so in the database `auth.uid()` is NULL and the write is "automation". Probe (executed, service role = that client):
  ```
  B2 service raw delete future NONE (the rebuild) => OK rows=0 affected=1
  B2 service raw move future->future (NONE, unsettled) => OK rows=0 affected=1
  override rows so far: 0
  ```
- After the migration is pasted and BEFORE the edge functions are rewired, an admin deleting or moving an untouched future lesson through `manage-session` leaves no reason, no override row and no refresh - what ruling 2 forbids. Started lessons, lessons with evidence and every cancel are refused (HC020), so this is the T0 gap only.
- The other half of the brief's question, answered: no SQL function gives a person the lane. `auth.uid()` survives SECURITY DEFINER; no migration calls `set_config` (grep: 0 hits outside the two new files); the only SQL writers of `sessions` in `supabase/migrations/` are the stars engine (`20261027100000:726`, `20261028090000:609, 783, 944`, `20261104090000:860`) and `normalize_session_statuses` (`20251017022007:32-48`), all `Scheduled <-> Held` flips, which are not guarded kinds. An API role with no uid (anon, or `authenticated` without claims) is stopped inside the trigger by D1's gate (`B3 ... => ERR 42501 session_held_evidence: not allowed`).
- Fix (edge-function task): every person-initiated cancel / un-cancel / delete / move goes through the checked RPCs on a client built from the caller's Authorization header; a `kind: null` edit is also sent on that client; the service-role client writes `sessions` only inside `schedule-sessions`' own rebuild. Paste and redeploy together and say in the rollout note that the ruling is not met in between.

### F-3 MINOR - evidence that is not attendance can be deleted first, unseen

- Where: `:481-510`. Follows the adopted wording of change 4, so not a build defect. `point_transactions` and `class_transcripts` are not audited tables (`20261009130000:151-155`), so the same trick as B-4 cannot be seen from `audit_log` at all.
- Probe (executed, E3): points + same-day transcript + paid bill = T3. After deleting the point rows and the transcript and excusing the SEEDED mark: `tier 1, level NONE`; cancel stored `review_required:false, erased:0`; not in the queue.
- Fix (D4): audit triggers on those two tables, then two more branches in `_session_erased_recently`. Tell the owner meanwhile.

### F-4 MINOR - a session's primary key can be changed by a raw update, and its Held-flip history is lost with it

- Where: `:612-617` (WHEN lists status/date/start_time/class_id), `:504-505` (history matched on `entity_id`).
- Probe (executed, E4): Held past lesson, `Held -> Scheduled`, then `UPDATE sessions SET id = <new>` as admin => OK; cancel under the new id stored `review_required:false, erased:0`. Control without the id change: `review_required:true, erased:1`. Works only for a lesson with no attendance rows (`23503` otherwise); earlier override rows keep the old id.
- Fix: add `OR OLD.id IS DISTINCT FROM NEW.id` to the WHEN clause and raise HC020 for it in `session_change_guard` for every caller; one test case.

### F-5 MINOR - what a move lands on is still not judged (disclosed "Not built" B-3(c)), and a settled destination is not reviewed

- Probe (executed, G2): blank future lesson moved onto a past day where the class has points and a transcript: preview `tier 1, level NONE`; after the move `review_required:false`, the lesson's evidence level is `STRONG`, not in the queue.
- Probe (executed, G3): checked move into a FUTURE month whose bill is paid: `tier 0`, no confirm, no review (`destination.any:true` is stored; both months are in `refresh_pairs`). Same for an un-cancel inside a settled month (I5: tier 1, `review:false`). The tier table cannot express "settled" for a NONE lesson - the design's table, not a slip.
- Fix (three lines in `_session_change_apply`): `review_required` also when `destination.started` or `destination.any`. Not needed before the edge functions; owner should see the sentence.

### F-6 MINOR (cross-workstream) - a completed recording is not evidence yet

- Where: `supabase/migrations/20261112100000_class_recorder.sql:1187` creates the view `recorder_session_evidence` "the contract workstream D reads"; D1's hook is the FUNCTION `session_recording_evidence` (`20261112090000:155-168`), which ships returning `[]`. Grep: the recorder migration never mentions `session_recording_evidence`. Nothing connects the two.
- Consequence (reasoning from the two files, not executed): with all three pasted, a lesson whose only evidence is a completed recording is NONE; the rebuild may delete it (`recordings.session_id ... ON DELETE SET NULL`, `:437`) and an admin cancels it at T0/T1. `session_cancel_guard_status` still says `recording_helper_stable: true`.
- Fix: one `CREATE OR REPLACE FUNCTION session_recording_evidence` (STABLE) over the view, with the STABLE assertion in `recorder.test.mjs`, before any class is switched on for recording.

### F-7 MINOR - test suite: 8 of 43 mutants are caught only because the suite crashes; 3 survive

43 valid mutants of the guard migration (one more was syntactically broken and replaced). 32 caught by FAIL lines with the summary printed; 8 caught only by an uncaught throw; 3 survived.

```
caught (FAIL lines)  M01 ack no session match 5 | M02 no action match 2 | M03 no txid match 2 | M04 raw cancel not refused 4 | M05 any signed-in user is "admin" 5
                     M06 automation delete ignores status 1 | M07 move ack ignores the written date 1 | M09 audit rows deletable 4 | M10 updatable 4 | M13 cap 51 1
                     M14b raw move ignores destination tuition 1 | M15 dest settled not in tier 1 | M16 dest started not in tier 2 | M18 insert guard lets service_role in 3
                     M20 T1 delete not reviewed 1 | M22 WHEN omits class_id 2 | M23 preview open 1 | M24 raw move ignores level 1 | M25 two kinds allowed 1
                     M26 overrides readable by all 2 | M28 truncate allowed 3 | M29 raw move into the past 1 | M31 own-reason off 1 | M33 record-event ungated 1
                     M35 signed-in raw lane open 4 | M36 Held flip not looked for 2 | M37 raw move ignores dest payroll lock 1 | M39 only DELETEs looked for 1
                     M40 token without invoices 2 | M41 events readable by all 1 | M42 RPCs granted to service_role 1 | M43 automation reclass of a started lesson 1
crash, no summary    M11 token without caller uid (stops after 107 of 212 assertions, "already_canceled")
                     M12 token without updated_at (111) | M17 confirm never required (141, "bad_change") | M19 flag not consumed (37, "guard_broken")
                     M21 reason minimum 1 (101) | M27 delete with evidence allowed (158, "lesson not found") | M30 no correction reason at T3 | M34 STRONG+settled never T3
SURVIVED             M08 acknowledged un-cancel to any status (`:554`) - unreachable today (only the RPC sets the flag and it writes Scheduled); untested defence
                     M32 `log_session_automation_refused` without its own uid check (`:934`) - the grant still stops people (probe: permission denied); untested defence
                     M38 raw move OUT of a settled month into another month allowed (`:590`) - REAL gap: no case moves a lesson out of a settled source month as automation
```
- The builder reported 3 crash-type mutants (flag not consumed, confirm skipped, delete with evidence = my M19, M17, M27). The cause is general: after a `tryIt` that should have been refused, the next fixture call is bare (e.g. `:631` `ok('d22 the right token works', !!(await checked(...)).override_id)`), so when the mutant lets the first call through, the second throws and every later case is lost - M19 hides 175 assertions.
- Fix: wrap every `checked/move/uncancel/bulk/cancelNow` call that follows a refusal test in `tryIt`, or give each case its own lesson; add a case for M38 (automation, future NONE lesson with a seeded Present in a month whose bill is paid, moved to the next month -> HC020) and one each for `:554` and `:934`.
- Roles are really switched (`as()`: `SET ROLE` + both claims, `:228-237`); I found no vacuous assertion in the cases the mutants exercised, but did not read all 212.

### F-8 MINOR - the contract section is not yet enough to wire the functions without reading the SQL

Missing or ambiguous in `docs/evidence/D2-build.md` "Contract for the edge functions and UI":
1. Which client. It says RPCs use the caller's JWT, but not that a `kind: null` edit must too, nor that person-initiated `manage-session` / `bulk-cancel-sessions` must stop writing `sessions` with the service key (F-2). State it as a rule, with `schedule-sessions` the one exception.
2. The preview does not return `review_required` / `erased_recently`; the dialog cannot say "this will go to review" before Confirm. Either add both to the preview or say the UI learns it only from the result.
3. `tuition_refreshed` vs `tuition_refresh_failed` when SOME pairs fail is not defined. (Suggest: `tuition_refreshed` only when every pair is ok; otherwise `failed`, and the retry records a new event.)
4. Errors not in the table: `22P02` (a non-boolean `confirm` in a bulk item aborts the whole chunk - executed H4), `23514` (`attached` over 128 KB - executed N7; nothing changed).
5. Bulk details: a duplicate id comes back `HC015 already_canceled`; a malformed item has `id` as given or null; results are in id order, not input order (stated) - the function must map by id.
6. No bulk delete or bulk move RPC exists. `manage-session` `bulk-delete` and bulk reschedule must loop the single RPCs, one transaction each, not atomic. Say so.
7. Check order: a delete of an evidence lesson without `confirm` raises `HC012` before `HC014`. The UI must branch on the preview's `allowed` / `refuse_code`, not on the RPC error.
8. No path for a person to re-class a lesson (HC021 always) and none for a teacher to move a date (RPCs are admin-only; the teacher policy on `sessions` now only allows unguarded edits). The contract should say what each screen does instead.
9. The direct writers in `src/` that will start getting HC020 the moment the migration is pasted are not listed with their replacement: `SessionActionsModal.tsx:135` (delete), `EditSessionModal.tsx:123`, `GlobalCalendar.tsx:191`, `SessionDetailDrawer.tsx:116`, `AttendanceDrawer.tsx:130` (not opened by me - map each).
10. `schedule-sessions`: must call `log_session_automation_refused` on HC020/HC021 and must not count the lesson as removed (`index.ts:745-750` swallows the error today); the contract says "for" but not "must".
11. `HC022` and `HC050` handling in bulk (abort the chunk) is stated; what the function does with the already-committed earlier chunks of the same `batch_id` is not.

### F-9 MINOR - two things to measure or tighten before the paste

- `_session_erased_recently` (`:488-509`) scans 30 days of `audit_log` attendance UPDATE/DELETE rows per call, matching a key inside `diff`; builder deviation 12 says so. A 50-lesson bulk does it 50 times in one statement as `authenticated`. Not measured anywhere real. Before the paste: `EXPLAIN ANALYZE` it once on live through the SQL editor and read `authenticated`'s `statement_timeout`. If slow, an index on `audit_log (entity, occurred_at)` is an owner-approved change to an existing table.
- `session_cancel_audit_insert_guard` (`:197`) lists the roles it refuses. A role added later is let in by default. Fail-closed form: refuse unless `current_user` is the table owner.

### F-10 NOTE - self-review and "refreshed" without a refresh

- Probe (executed): the admin who made the cancel can record `reviewed` on it, and `tuition_refreshed` with an empty payload; the row leaves both views. OQ-4 defaults to "yes for now" and SQL stores its own `invoices_after`, so a false "refreshed" shows in the row. No change asked.

---

## The builder's deviations and "Not built" items

| # | Item (D2-build.md) | Verdict |
|---|---|---|
| D1 | Raw re-class automation-only | ACCEPT (closed). Owner should know there is no way for a person to re-class a lesson (F-8.8). |
| D2 | `authenticated` SELECT only on the audit tables | ACCEPT. Executed: admin/teacher/anon writes -> 42501. |
| D3 | INSERT guard HC041 | ACCEPT; tighten to "owner only" (F-9). |
| D4 | Un-cancel at T3 needs a correction reason | ACCEPT. In practice an un-cancel is T1: the cancel already excused the marks (I5). |
| D5 | Bulk own-reason rule in SQL (HC017) | ACCEPT. Executed H2/H3. |
| D6 | Columns `refresh_pairs`, `erased_recently` | ACCEPT. |
| D7 | One zone | ACCEPT. |
| D8 | `session_month_tuition_settled` restates D1's test | ACCEPT; the suite's 8-state agreement case is the right tripwire. |
| D9 | Token v2 | ACCEPT. Executed C7-C13. Not a secret and has no expiry - by design; it proves "this state", nothing more. |
| D10 | HC015 carries the refuse code as message | ACCEPT. |
| D11 | `end_time <= start_time` refused on a move | ACCEPT; owner decision only if a lesson ever runs past midnight. |
| D12 | `audit_log` scan without an index | MEASURE BEFORE THE PASTE (F-9). |
| N1 | B-9 re-runs of stars-sync-engine, stars-sync-homework, ta-standing with D1 + D2 | NOT a blocker for the edge functions; do before the live paste. Seriousness: low to medium. What I checked instead: every `sessions` write in the real engine SQL is a status flip with a status filter (lines in F-2), I executed those shapes as the service role with the guard on (`I6 ... => OK`), and inserts are not guarded, so `cta_new_session` is untouched. What is still unproven is the engine's own functions end to end under the three new triggers. Needed: ONE new suite file (no existing file edited) whose prelude is the stars-engine suite's prelude plus the tables D1's preflight asks for (`class_transcripts`, `payroll_periods`, `payroll_lines`, `invoices`, `homeworks`, `homework_submissions`, `stars_homework_map`, `stars_sync_grade_state`, `point_transactions`, `session_participants`, `auth.role()`), loading the engine migrations + `20261009130000` + `20261027090000` + D1 + D2, then driving the engine's real apply functions for a Held flip, a withdrawal and a conflict, and one `ta-standing` insert; plus a new `run.mjs` entry. |
| N2 | Destination-day evidence not computed | ACCEPT for now with the F-5 change; OWNER DECISION whether a move into the past should be reviewed. |
| N3 | D4 scope note | ACCEPT (it is in MASTER_PLAN section 10). Add F-1's `attendance.session_id` and F-3 to it. |
| N4 | B-7 / B-8 / B-10 / B-11 left to the edge functions / owner | MUST be in the edge-function brief: loop the refresh to the end with per-pair results, refresh after every checked move, `automation_refused` shown to an admin the same day. |
| N5 | Two-connection lock behaviour | Reasoning only (pglite is one connection): the RPC locks the session row first (`:690`); the attendance guard of 20261027090000 takes the parent-row lock, so a mark racing a cancel either commits first (evidence read after the lock sees it; token goes stale) or waits and is then refused. Worth one run on a Supabase branch before live. |
| N6 | `authenticated` statement timeout | OWNER reads it before rollout (F-9). |

## Must fix before the edge functions are wired

1. F-1: the `session_id` branch in `_session_erased_recently` + its test.
2. F-4: `id` change refused + its test.
3. F-7: wrap the bare fixture calls; add the M38 case (a real untested condition at `:590`).
4. F-8: complete the contract (items 1-11), above all the client rule of F-2.
5. Put F-2 in the edge-function brief as its first acceptance test: after the rewire, no person-initiated request reaches `sessions` on the service key (grep + one pgtest that the T0 delete through the RPC leaves an override row).

Before the live paste (not before the wiring): F-5, F-9 measurements, N1 suite, N5 branch run. Before recording is switched on for any class: F-6.

## Checked and found sound (executed unless marked)

- D1 A-1: the class teacher's JSON is byte-identical (minus `computed_at`) before and after the child's bill became paid + confirmed + frozen, and after the payroll month was locked; `snapshot_hash: null`, `settled: null`, no family-M item. Errors and item counts carry no money either.
- D1 A-2: VOLATILE helper -> 55000 on the evidence call and on the trigger path, status RPC `recording_helper_stable:false`; a STABLE helper calling a VOLATILE writer leaves 0 rows behind, from the function and from the trigger.
- D1 A-3: anon -> permission denied; `authenticated` with no uid and no role, with no uid and role `authenticated`, with a uid and no role rows, a parent, another class's teacher -> 42501, same message for a real and an invented id; service role and the SQL editor -> internal.
- D1 A-6: row keys `["a","b"]` and `["a,b"]` now hash differently.
- Raw cancel / delete / date move / re-class / upsert-to-Canceled as an admin -> HC020/HC021. Teacher date move and cancel of own lesson -> HC020. RPCs: teacher, parent 42501; service_role and anon not executable; `_session_change_apply` and `log_session_automation_refused` not executable by an admin.
- Service role: cancel and un-cancel always refused; delete of a started lesson, a not-started SOFT lesson, a Canceled lesson; move into the past, into a paid month -> refused; one statement mixing a clean and an evidence lesson is refused whole.
- Flag forgery (C1-C6b): same-transaction re-pointing at another session, another kind, a committed row, garbage, service role with a real row id -> all HC020, nothing changed.
- Tokens: replay, cross-session, cross-admin, cancel-token-for-delete, after an unrelated edit, after cancel + un-cancel, NULL -> HC011/HC015. Reasons: 14 chars, one repeated letter, NULL -> HC010.
- Audit tables: service_role INSERT -> HC041; UPDATE/DELETE/TRUNCATE -> HC040 for service_role and the SQL editor; service_role cannot disable the triggers; a teacher reads 0 rows.
- TRUNCATE sessions / TRUNCATE classes CASCADE -> HC030. Two kinds in one statement -> HC022.
- B-4 as specified: marks -> Excused and Held -> Scheduled before the cancel => `review_required:true, erased:3`, in the queue.
- Moves: into the past needs confirm (HC012); same-day time edit that stays started -> preview `kind:null`, RPC HC015 `bad_change`, plain update accepted; a time edit that un-starts a started lesson -> HC020; occupied slot -> 23505 and no override row left.
- Bulk: 51 -> HC016; per-item results as design 7.3 (two done; refused HC017, HC012, P0002, HC015 x4); bad boolean aborts the chunk; NULL batch id 22004.
- Legitimate work: class abandoned after roll-call = T2, reason + confirm, marks Excused with `marked_by` kept, queued; T3 needs the correction reason (HC013) then succeeds, the bill row untouched; un-cancel works; attendance writes on the cancelled lesson still refused by 20261027090000 (23514); stars-shaped flips and the rebuild's teacher change pass; the rebuild's delete of a clean future lesson passes, of today's started lesson is refused (review-1 B-8) and `log_session_automation_refused` records it. Real code read for these: `schedule-sessions/index.ts:676-700, 728-752`, the engine lines in F-2.
- Fail closed: trigger disabled -> HC050, status unchanged, no override row, status RPC `ok:false`; D1 renamed away -> 42883 on the automation lane and on preview, admin raw cancel still HC020, unguarded writes still work; D1 returning `{}` or NULL -> HC020 / 55000; D2 without D1 and with a VOLATILE helper -> preflight refuses (builder's cases, re-run 50 times under mutation).
- Paste: D1 again and D2 twice more -> no error, object set identical, one `guard_installed` event per paste, guard still on.
- Existing objects: snapshot of every function body, trigger, table/view ACL, policy and column in `public`/`auth` before and after D2 -> nothing changed or removed; added: 21 functions, 2 tables, 2 views, 2 policies, 9 triggers (3 on `sessions`, 3 on each audit table).
- Money (read + grep): the guard writes only `session_cancel_overrides` (`:746`), `session_cancel_override_events` (`:921`, `:937`, `:1040`) and `sessions` (`:766`, `:773`, `:775`, `:782`). No invoice, payment, payroll-line or expenditure write; no arithmetic on money. The row carries actor, time, reason, `session_before`, `evidence`, `invoices_before`; the "after" is `invoices_after` in the refresh event.

## Not checked

- The full `node scripts/pgtest/run.mjs` (skipped on the conductor's instruction; conductor's figure quoted above).
- The live database: grants, policies, cron, `authenticated`'s timeout, `audit_log` size, whether anon holds any privilege on `sessions`.
- Real two-connection locking; a session row locked by another transaction (reasoning in N5 only).
- The five `src/` direct writers and `bulk-cancel-sessions` beyond the grep hits; `admin-data-import` (grep found no `sessions` write).
- All 212 assertions one by one for vacuity; M30 and M34 crash sites.
- B-9 suites with the guard loaded (see N1).
