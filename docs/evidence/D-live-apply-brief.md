# Brief: apply and deploy the D release on the LIVE project (exact steps; stop on anything unexpected)

Authorised by the owner (ledger D-9: "you have superbase connected you can push the migrations ... ship all codes and redeploy whatever you need to"). Live project id: `aswgmbefikhsnhogtryv`. This is a school's production database with real children and real money. Do EXACTLY these steps, in this order, and nothing else. If any check differs from what is expected, STOP immediately, change nothing further, and report.

## Rules

- First action: create `docs/evidence/D-live-apply.md` in your worktree with a "Where I am / next step" line and commit; append each step's result and commit after each step.
- Work from the branch `release/d1` (run `git fetch origin` and `git checkout --detach release/d1` in your worktree). Every file you send to the live project comes from that branch, byte for byte, with LF line endings (the files on disk may be CRLF: normalise CRLF to LF when reading; never alter anything else).
- Supabase MCP tools (load with ToolSearch): `execute_sql`, `apply_migration`, `deploy_edge_function`, `get_edge_function`, `list_edge_functions`. Never print or read a secret. Never run SQL that returns children's data (names, marks, bills): only catalog queries and counts.
- No push. No other table, function, bucket or setting is touched.
- You re-type file contents into tool calls: copy them EXACTLY. The fingerprint in step 3 and step 6 exists to catch a slip; a mismatch is not a disaster if you stop and report it.

## Step 0 - read the plan

Read on `release/d1`: `docs/evidence/D-release.md` (fingerprint notes: which fields are compared exactly, which are informational), `docs/evidence/D-ship-fixes.md` section "Probes for the conductor", `docs/evidence/D-release-fingerprint.sql`, `docs/evidence/D-release-fingerprint.expected.json`.

## Step 1 - pre-checks (read-only)

With `execute_sql`: confirm `session_held_evidence` does not exist (`select count(*) from pg_proc where proname = 'session_held_evidence'` = 0), the table `session_cancel_overrides` does not exist, no trigger on `public.sessions` has a name starting `zz_session`. Record the count of rows in `public.sessions` and the count with status 'Canceled' (two numbers only). If the guard objects already exist, STOP.

## Step 2 - apply migration 1

`apply_migration` name `session_held_evidence`, query = the exact LF content of `supabase/migrations/20261112090000_session_held_evidence.sql`. If it raises (its preflight refuses when a table it reads is missing), STOP and report the message verbatim.

## Step 3 - fingerprint check 1

Run the statement in `docs/evidence/D-release-fingerprint.sql` with `execute_sql` and compare with `docs/evidence/D-release-fingerprint.expected.json` for the objects that migration 1 creates (the evidence functions): `md5_prosrc`, security definer flag, volatility and EXECUTE privileges must match EXACTLY. Objects of migration 2 will be missing at this point: that is expected. Write the comparison table (object, expected md5, live md5, match) into the evidence file. If any md5 differs: re-read the file, apply migration 1 again (it is idempotent: CREATE OR REPLACE) and compare again; if it still differs, STOP.

## Step 4 - deploy the two functions

For each of `manage-session` and `bulk-cancel-sessions`: read its `index.ts` and EVERY relative import it needs, recursively (`../_lib/session-guard.ts`, `../_lib/rate-limit.ts`, `../_lib/auth.ts` and whatever those import); copy `verify_jwt` for the function from `supabase/config.toml` (if no entry, use true); deploy with `deploy_edge_function` using file names `<function>/index.ts` and `_lib/<file>.ts` and entrypoint `<function>/index.ts`. Then `get_edge_function` and read the returned files against the repo files line by line for the two `index.ts` and `session-guard.ts`; record "identical" or the differing lines; on a difference redeploy once; if still different, STOP.
Immediately after: with curl and the publishable key from `.env` (public client key; do not print it) POST `{"action":"preview"}` to `/functions/v1/manage-session` -> expect 401 or 403 (admin gate), and POST with no Authorization -> 401. Record status codes.
At this moment the guard migration is not installed: guarded actions answer 503 `guard_not_installed` and write nothing. Go straight to step 5.

## Step 5 - apply migration 2

`apply_migration` name `session_cancel_guard`, query = the exact LF content of `supabase/migrations/20261112091000_session_cancel_guard.sql`. If it raises, STOP and report verbatim (the functions then keep answering 503: fail closed).

## Step 6 - fingerprint check 2 (the important one)

Run the fingerprint statement again and compare the WHOLE expected JSON except the `informational` block: every function's `md5_prosrc`, security definer flag, volatility, `proconfig`; every trigger (name, table, enabled, function); the two tables' columns; RLS flags and policies; EXECUTE and table privileges for anon / authenticated / service_role. Write the full comparison table. Fields the release notes list as legitimately version-dependent are reported but do not fail the check. If any `md5_prosrc` or any trigger or privilege differs: do NOT try to repair by hand. Re-apply migration 2 once from a fresh, careful read (idempotent), compare again; if it still differs, STOP and report exactly which objects differ - the conductor decides.

## Step 7 - post-apply probes (read-only; from "Probes for the conductor")

- The three `zz_session%` triggers on `public.sessions` exist and are enabled; the three on each audit table too.
- Table owner of `session_cancel_overrides` equals the owner of `_session_change_apply`.
- `has_function_privilege` on `cancel_session_checked`: authenticated true, service_role false, anon false.
- `session_cancel_override_events`: one `guard_installed` row; `session_cancel_overrides`: 0 rows.
- Row counts of `public.sessions` and of status 'Canceled' are the same two numbers as in step 1 (the migration changed no session).
- With the publishable key: `POST /rest/v1/rpc/session_change_preview` -> 401 / 42501 (not PGRST202); `POST /functions/v1/manage-session` -> 401.
- `select jobname, active from cron.job` (names and flags only): record, so the next rebuild can be checked later.

## Report (under 250 words)

Each step's result; the two fingerprint verdicts with counts (objects compared / matched); deployed function versions; the probe results; the sessions counts before and after; anything that differed; and one clear line: "LIVE AND VERIFIED" or "STOPPED AT STEP n: <why>".
