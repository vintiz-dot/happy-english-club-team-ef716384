# B-proxy-deploy

Where I am / next step: STEP 3 deploy audit-eval-proxy (steps 1-2 done).

## Step 1 (2026-11-12)
No audit-eval bucket, no audit_eval* tables/functions, no audit-eval-proxy function. Clear.

## Step 2
Migration 20261112110000 applied as `audit_eval_bucket`, content unedited. Verified: bucket public=false; policies audit_eval_runs_admin_read, audit_eval_settings_admin_read, audit_eval_storage_{insert,select,delete}; RLS on for both tables; settings enabled=true, 400 calls, 600 min/run, 2000 min global; anon SELECT on audit_eval_runs/settings = false.

## Step 3-4
audit-eval-proxy deployed v1, verify_jwt true, entrypoint audit-eval-proxy/index.ts, files audit-eval-proxy/index.ts, audit-eval-proxy/vendors.ts, _lib/auth.ts (all imports covered). get_edge_function returned the same three files; compared by reading against the repo text, no difference seen. (No machine diff: MCP output cannot be piped to disk without retyping it.)

Where I am / next step: STEP 5 anonymous probes.

## Step 5
(a) no Authorization -> 401 (platform: UNAUTHORIZED_NO_AUTH_HEADER). (b) publishable key as bearer -> 401 {"error":"Unauthorized"} from the function gate. audit_eval_runs rows before 0, after 0.

Where I am / next step: STEP 6 --login in vendor_run.py.

## Step 6
--login/--whoami added to scripts/lesson-eval/vendor_run.py, README updated; mock self-test (password sign-in, refresh near expiry, HEC_ADMIN_JWT) and --dry-run pass.
