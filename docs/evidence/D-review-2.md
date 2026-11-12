VERDICT-D1: INCOMPLETE
VERDICT-D2: INCOMPLETE

# D review 2 - the built cancellation guard and the revised evidence function

Where I am / next step: probe set 1 done (D1 gates, raw writes by actor, flag forgery, token replay, audit tables). 34 mutants running. Next: probe set 2 (tier lowering / erased_recently, moves and destinations, bulk, fail-closed, legit paths), then deviations, contract, verdicts.

Reviewer: fresh context, wrote none of it. Nothing applied to any database. Probes ran in pglite from a throwaway `.probe/` folder against the real files `20261009130000`, `20261027090000`, `20261112090000`, `20261112091000` (same prelude as the builder's suite).

## Findings so far (WIP - ranking may still change)

### W-1 MAJOR (rollout) - today's `manage-session` gives a signed-in admin the automation lane

- Where: `supabase/functions/manage-session/index.ts:23-24` (service-role client), `:215` (date update), `:264`, `:318` (deletes); guard `20261112091000:569` (`auth.uid() IS NOT NULL` is the only "is this a person" test).
- The function checks the admin's JWT itself and then writes with the service key, so in the database `auth.uid()` is NULL and the write is "automation". Probe (executed, service role = what that client is):
  ```
  B2 service raw delete future NONE (the rebuild) => OK rows=0 affected=1
  B2 service raw move future->future (NONE, unsettled) => OK rows=0 affected=1
  override rows so far: 0
  ```
- So after the migration is pasted and BEFORE the edge functions are rewired, an admin deleting or moving an untouched future lesson through the UI's edge-function path still leaves no reason, no override row and no refresh - exactly what ruling 2 forbids ("a signed-in person NEVER gets the raw lane"). Lessons with evidence, started lessons and every cancel are refused (HC020), so this is the T0 gap only.
- Fix: the edge-function task must (a) call the checked RPCs on a client built from the caller's Authorization header for every person-initiated delete/move/cancel, and (b) keep the service-role client only for `schedule-sessions`' own rebuild. Until both functions are redeployed the ruling is not met on live; paste and redeploy together, and say so in the rollout note.

### W-2 MINOR - a session's primary key can be changed by a raw update, unguarded

- Where: `20261112091000:612-617` (WHEN lists status/date/start_time/class_id), `:252` (classifier).
- Probe (executed): `B1 admin changes the session PRIMARY KEY => OK rows=0 affected=1`.
- Consequences are followed up in probe set 2 (evidence and history keyed by session id).

### W-3 MINOR - an admin can sign off their own override, and mark tuition "refreshed" with no refresh

- Where: `20261112091000:886-925`.
- Probe (executed): `D admin: self-review of own override => OK`, `D admin: tuition_refreshed recorded with no refresh done => OK` (same admin that made the cancel; the row then leaves both views).

## Checked and found sound so far (all executed)

- D1 A-1: the class teacher's JSON is byte-identical (minus `computed_at`) before and after the child's bill became paid + confirmed + frozen, and after the payroll month was locked; `snapshot_hash: null`, `settled: null`, no family-M item.
- D1 A-3: anon -> permission denied; `authenticated` with no uid and no role, with no uid and role `authenticated`, with a uid and no role rows, a parent, another class's teacher -> 42501 with the same message for a real and an invented id; service role and the SQL editor -> internal.
- Raw cancel / delete / date move / re-class / upsert-to-Canceled as an admin -> HC020/HC021. Teacher date move and cancel of own lesson -> HC020. RPCs: teacher, parent 42501; service_role and anon not executable.
- `auth.uid() IS NULL` with an API role (anon, or `authenticated` without claims) does NOT reach the automation lane: D1's gate raises 42501 inside the trigger.
- Service role: cancel and un-cancel always refused; delete of a started lesson, of a not-started SOFT lesson, move into the past refused; one statement mixing a clean and an evidence lesson is refused whole.
- Flag forgery (C1-C6b): same-transaction re-pointing at another session, another kind, a committed row, garbage, service role with a real row id -> all HC020.
- Tokens: replay, cross-session, cross-admin, cancel-token-for-delete, after an unrelated edit, after cancel + un-cancel, NULL -> HC011/HC015.
- Audit tables: admin/teacher/anon have no write privilege; service_role INSERT -> HC041, UPDATE/DELETE/TRUNCATE -> HC040, cannot disable triggers; the SQL editor can INSERT (owner) but not UPDATE/DELETE/TRUNCATE.
- TRUNCATE sessions / TRUNCATE classes CASCADE -> HC030.
