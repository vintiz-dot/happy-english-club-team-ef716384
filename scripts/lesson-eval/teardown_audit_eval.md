# Teardown: the TEMPORARY vendor evaluation proxy (audit-eval-proxy)

This is the FIRST item in the owner actions for the vendor evaluation. Do the steps in this order; each says what to check before going on. Every step is safe to repeat.

What exists while the evaluation runs: the edge function `audit-eval-proxy`, the private bucket `audit-eval` (pieces of lesson audio named by codes), the tables `audit_eval_settings` and `audit_eval_runs` (ids, durations, status codes, cost - no transcripts), two functions and two triggers (migration `supabase/migrations/20261112110000_audit_eval_bucket.sql`), and on this PC the vendor results under `C:\Users\Dell\hec-audio-eval\work\vendor\`.

## 1. Switch it off

Supabase SQL editor:

```sql
UPDATE public.audit_eval_settings SET enabled = false, updated_at = now();
```

Verify: `SELECT enabled FROM public.audit_eval_settings;` returns `false`. Any further call to the function now answers 503 before a vendor is contacted.

## 2. Delete every piece of audio in the bucket

Either, on this PC (needs a fresh admin access token in the environment; it is not saved):

```powershell
$env:HEC_ADMIN_JWT = "<admin access token>"
C:\Users\Dell\hec-audio-eval\.venv\Scripts\python scripts\lesson-eval\vendor_run.py --delete-remote --all
Remove-Item Env:HEC_ADMIN_JWT
```

or in the Dashboard: Storage > `audit-eval` > open each folder (`lessons`, `clips`, `synth`) > select all > Delete.

Verify (SQL editor): `SELECT count(*) FROM storage.objects WHERE bucket_id = 'audit-eval';` returns `0`.

Vendor side: nothing is left at Azure (fast transcription stores nothing) or OpenAI (no Files API used; abuse-monitoring logs, if ZDR is not on, expire after up to 30 days and cannot be deleted by us). Gemini uploads are deleted by the function after each call; to be sure, list the project's files (Files API `GET /v1beta/files`) and delete any `audit-eval-piece` left by a call that crashed (they expire on their own after about 48 hours).

## 3. Delete the bucket

Dashboard: Storage > `audit-eval` > Delete bucket. (Step 4 also removes the bucket row if it is empty, so this step may already be done.)

Verify: `SELECT count(*) FROM storage.buckets WHERE id = 'audit-eval';` returns `0`.

## 4. Drop the tables, functions, triggers and policies

Paste `scripts/lesson-eval/teardown_audit_eval.sql` into the SQL editor and run it. It is idempotent: if it prints a NOTICE that objects remain, go back to step 2 and paste it again.

Verify (each returns null / 0):

```sql
SELECT to_regclass('public.audit_eval_runs'), to_regclass('public.audit_eval_settings');
SELECT count(*) FROM pg_proc WHERE proname LIKE 'audit_eval%';
SELECT count(*) FROM pg_policies WHERE policyname LIKE 'audit_eval%';
SELECT count(*) FROM storage.buckets WHERE id = 'audit-eval';
```

If you want the call log for the record, save it BEFORE this step: `SELECT * FROM public.audit_eval_runs ORDER BY started_at;` (codes and numbers only).

## 5. Delete the edge function

Dashboard: Edge Functions > `audit-eval-proxy` > Delete (or `npx supabase functions delete audit-eval-proxy --project-ref aswgmbefikhsnhogtryv`). Then in the repo remove `supabase/functions/audit-eval-proxy/`, its `[functions.audit-eval-proxy]` block in `supabase/config.toml`, `scripts/pgtest/audit-eval.test.mjs` and its line in `scripts/pgtest/run.mjs`, and `scripts/lesson-eval/vendor_run.py`. Keep this file, the teardown SQL and the migration file (the migration tree is the record of what was applied; the teardown SQL undoes it).

Verify: `curl -i -X POST https://aswgmbefikhsnhogtryv.supabase.co/functions/v1/audit-eval-proxy` answers 404 (function not found), and `node scripts/pgtest/run.mjs` passes after the repo removal.

The secrets (`azure_key`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CREDENTIALS`) are used by other functions and are NOT removed.

## 6. Delete local derived vendor output

```powershell
Remove-Item -Recurse -Force C:\Users\Dell\hec-audio-eval\work\vendor
```

This holds the cut pieces (`_pieces\`), the per-piece answers (`pieces\`), the stitched results and the local code-to-file maps. Results that were copied into `work\results\` for scoring are removed with `delete_all_derived.py --yes` when the whole evaluation ends.

Verify: `Test-Path C:\Users\Dell\hec-audio-eval\work\vendor` returns `False`.
