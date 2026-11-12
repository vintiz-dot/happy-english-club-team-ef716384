# B-proxy-deploy

Where I am / next step: STEP 3 deploy audit-eval-proxy (steps 1-2 done).

## Step 1 (2026-11-12)
No audit-eval bucket, no audit_eval* tables/functions, no audit-eval-proxy function. Clear.

## Step 2
Migration 20261112110000 applied as `audit_eval_bucket`, content unedited. Verified: bucket public=false; policies audit_eval_runs_admin_read, audit_eval_settings_admin_read, audit_eval_storage_{insert,select,delete}; RLS on for both tables; settings enabled=true, 400 calls, 600 min/run, 2000 min global; anon SELECT on audit_eval_runs/settings = false.
