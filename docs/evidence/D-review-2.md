VERDICT-D1: INCOMPLETE
VERDICT-D2: INCOMPLETE

# D review 2 - the built cancellation guard and the revised evidence function

Where I am / next step: probe sets 1 and 2 done and written below. Mutation run (36 mutants) still going, 15 read so far. Next: finish mutants, locate the crash sites, fill in deviations / contract / verdicts.

Reviewer: fresh context, wrote none of it. Nothing applied to any database. Probes ran in pglite from a throwaway `.probe/` folder against the real files `20261009130000`, `20261027090000`, `20261112090000`, `20261112091000`, with the same prelude as the builder's suite (`session-cancel-guard.test.mjs:34-175`).

## Findings (WIP - ranking may still change)

### F-1 MAJOR - re-pointing the register at another lesson takes a taught, paid lesson from T3 to an unreviewed T1 cancel

- Where: `20261112091000:488-498` (`_session_erased_recently` looks only for a status change, a `marked_by` going NULL, or a DELETE), `:413-422` (affected = rows whose `session_id` is this lesson).
- Probe (executed, `.probe/p2.mjs` E2). Past lesson, two children marked Present by the teacher, one bill paid:
  ```
  E2 taught (2 person-marked Present) + paid, preview => {"tier":3,"level":"STRONG","settled_any":true,...,"correction_reason":true}
  E2 admin raw: UPDATE attendance SET session_id = <another lesson of the class> => OK rows=0 affected=2
  E2 preview after => {"tier":1,"level":"NONE","started":true,"settled_any":false,...,"correction_reason":false}
  E2 cancel now => OK {"tier":1,"level":"NONE","action":"cancel","affected":[], ... "refresh_pairs":[] ...}
  E2 stored row => {"tier":1,"level":"NONE","review_required":false,"erased":0,...} | in review queue: 0
  ```
  Control (E1, the marks set to Excused and Held -> Scheduled instead): `review_required: true, erased: 3`, in the queue. So required change 4 works for the two routes it names and not for this one.
- Why it matters: correction mode and the review queue are the only second look at a cancel of a settled lesson. One ordinary PostgREST update by an admin (the existing attendance guard `20261027090000` does not look at `session_id` changes) removes both, and also leaves `affected` and `refresh_pairs` empty, so no bill is refreshed and the audit row says nobody was affected.
- Fix: in `_session_erased_recently` add `OR (l.diff -> 'new' ->> 'session_id') IS DISTINCT FROM (l.diff -> 'old' ->> 'session_id')` to the attendance branch, and add the case to the suite. Better, and for D4: refuse an UPDATE of `attendance.session_id` outright (nothing in the app needs it).

### F-2 MAJOR (rollout) - today's `manage-session` gives a signed-in admin the automation lane

- Where: `supabase/functions/manage-session/index.ts:23-24` (service-role client), `:215` (date update), `:264`, `:318` (deletes); guard `20261112091000:569` (`auth.uid() IS NOT NULL` is the only "is this a person" test).
- The function checks the admin's JWT itself and then writes with the service key, so in the database `auth.uid()` is NULL and the write is "automation". Probe (executed, service role = what that client is):
  ```
  B2 service raw delete future NONE (the rebuild) => OK rows=0 affected=1
  B2 service raw move future->future (NONE, unsettled) => OK rows=0 affected=1
  override rows so far: 0
  ```
- So after the migration is pasted and BEFORE the edge functions are rewired, an admin deleting or moving an untouched future lesson through `manage-session` still leaves no reason, no override row and no refresh - what ruling 2 forbids. Lessons with evidence, started lessons and every cancel are refused (HC020), so this is the T0 gap only. No SQL function in `supabase/migrations/` reaches the lane for a person: `auth.uid()` survives SECURITY DEFINER, no migration calls `set_config` (grep, 0 hits outside the two new files), and the only SQL writers of `sessions` are the stars engine's `Scheduled <-> Held` flips and `normalize_session_statuses` (`Held -> Scheduled`), none guarded kinds.
- Fix: the edge-function task must (a) call the checked RPCs on a client built from the caller's Authorization header for every person-initiated delete / move / cancel / un-cancel, (b) keep the service-role client for sessions writes only inside `schedule-sessions`' own rebuild, and (c) say in the contract that a `kind: null` edit is also sent on the caller's client. Paste and redeploy together; the ruling is not met on live in between.

### F-3 MINOR - evidence that is not attendance can be deleted first, unseen

- Where: `20261112091000:481-510`. Follows the adopted wording of change 4 (attendance and Held only), so not a build defect.
- Probe (executed, E3): points + same-day transcript + paid bill = T3. After deleting the point rows and the transcript and excusing the SEEDED mark: `tier 1, level NONE`, cancel stored with `review_required:false, erased:0`, not in the queue.
- Fix (later, D4): a tombstone or audit read for `point_transactions` / `class_transcripts` deletes; or accept and tell the owner.

### F-4 MINOR - a session's primary key can be changed by a raw update, and its Held-flip history is lost with it

- Where: `20261112091000:612-617` (WHEN lists status/date/start_time/class_id), `:504-505` (history matched on `entity_id`).
- Probe (executed, E4): Held past lesson, `Held -> Scheduled`, then `UPDATE sessions SET id = <new>` as admin => OK; cancel under the new id stored `review_required:false, erased:0`. Control without the id change: `review_required:true, erased:1`. Works only for a lesson with no attendance rows (`23503` otherwise).
- Fix: add `OLD.id IS DISTINCT FROM NEW.id` to the WHEN clause and refuse it for everyone (HC020); one test case.

### F-5 MINOR - a blank lesson moved onto a past day that has the class's points/transcript becomes STRONG with no review (builder's disclosed "Not built" B-3(c))

- Probe (executed, G2): preview `tier 1, level NONE`; move with confirm => `review_required:false`; evidence level of the moved lesson afterwards => `STRONG`; not in the queue.
- Also G3: a checked move into a FUTURE month whose bill is paid is T0 - no confirm, no review (`destination.any:true` is stored in `change`, and both months are in `refresh_pairs`). The tier function cannot express "settled" for a NONE lesson; that is the design's table, not a build slip.
- Fix (cheap, in `_session_change_apply`): `review_required` also when `destination.started` or `destination.any`. Not needed before the edge functions.

### F-6 NOTE - self-review and "refreshed" without a refresh

- Probe (executed): the admin who made the cancel can record `reviewed` on it and `tuition_refreshed` with an empty payload; the row leaves both views. Owner question OQ-4 already defaults to "yes for now"; SQL stores its own `invoices_after`, so a false "refreshed" is visible in the row. No change asked.

## Checked and found sound (all executed unless marked)

- D1 A-1: the class teacher's JSON is byte-identical (minus `computed_at`) before and after the child's bill became paid + confirmed + frozen, and after the payroll month was locked; `snapshot_hash: null`, `settled: null`, no family-M item.
- D1 A-3: anon -> permission denied; `authenticated` with no uid and no role, with no uid and role `authenticated`, with a uid and no role rows, a parent, another class's teacher -> 42501 with the same message for a real and an invented id; service role and the SQL editor -> internal.
- Raw cancel / delete / date move / re-class / upsert-to-Canceled as an admin -> HC020/HC021. Teacher date move and cancel of own lesson -> HC020. RPCs: teacher, parent 42501; service_role and anon not executable; `_session_change_apply` and `log_session_automation_refused` not executable by an admin.
- `auth.uid() IS NULL` with an API role (anon, or `authenticated` without claims, table policy opened for the probe) does NOT reach the automation lane: D1's gate raises 42501 inside the trigger.
- Service role: cancel and un-cancel always refused; delete of a started lesson, of a not-started SOFT lesson, of a Canceled lesson, move into the past, move into a paid month refused; one statement mixing a clean and an evidence lesson is refused whole and the clean one survives.
- Flag forgery (C1-C6b): same-transaction re-pointing at another session, another kind, a committed row, garbage, service role with a real row id -> all HC020, nothing changed.
- Tokens: replay, cross-session, cross-admin, cancel-token-for-delete, after an unrelated edit, after cancel + un-cancel, NULL -> HC011/HC015. Reasons: 14 chars, one repeated letter, NULL -> HC010.
- Audit tables: admin/teacher/anon have no write privilege (42501); service_role INSERT -> HC041, UPDATE/DELETE/TRUNCATE -> HC040, cannot disable triggers (must be owner); the SQL editor can INSERT (owner) but not UPDATE/DELETE/TRUNCATE. Teacher reads 0 override rows.
- TRUNCATE sessions / TRUNCATE classes CASCADE -> HC030. Two kinds in one statement -> HC022.
- B-4 as specified: marks -> Excused and Held -> Scheduled before the cancel => `review_required:true, erased:3`, in the queue (but see F-1, F-3, F-4).
- Moves: into the past needs confirm (HC012 without); same-day time edit that stays started -> preview `kind:null`, RPC HC015 `bad_change`, plain update accepted; a time edit that un-starts a started lesson -> HC020; occupied slot -> 23505 and no override row left behind.
- Bulk: 51 -> HC016; mixed batch is per item as design 7.3 says (`done` two T0; refused: HC017 own reason, HC012 confirm, P0002, HC015 already_canceled for the duplicate, HC015 bad_item x3); a bad boolean aborts the whole chunk (22P02) and nothing in it is cancelled; NULL batch id 22004.
- Legitimate work: class abandoned after roll-call = T2, reason + confirm, marks Excused with `marked_by` kept, in the queue; T3 needs the correction reason (HC013) then succeeds and the bill row is untouched; un-cancel works and leaves marks Excused; attendance writes on the cancelled lesson still refused by 20261027090000 (23514); stars-shaped `Scheduled <-> Held` and the rebuild's teacher change pass as service role; the rebuild's delete of a clean future lesson passes, of today's started lesson is refused (review-1 B-8) and `log_session_automation_refused` records it.
- Fail closed: trigger disabled -> HC050, status unchanged, no override row, status RPC `ok:false`; D1 renamed away -> 42883 on the automation lane and on preview, admin raw cancel still HC020, unguarded writes still work; D1 returning `{}` or NULL -> HC020 / 55000.
- Money (read + grep): the guard migration writes only `session_cancel_overrides` (`:746`), `session_cancel_override_events` (`:921`, `:937`, `:1040`) and `sessions` (`:766`, `:773`, `:775`, `:782`). No invoice, payment, payroll or expenditure write; no arithmetic on money. The audit row carries actor, created_at, reason, `session_before`, `evidence`, `invoices_before`; the "after" is `invoices_after` in the refresh event.
