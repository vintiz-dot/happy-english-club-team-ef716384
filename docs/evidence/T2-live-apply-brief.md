# Brief: apply and deploy the lesson-audio access fix on the LIVE project (exact steps; stop on anything unexpected)

Authorised by the owner (ledger D-9: the conductor may apply migrations and deploy; D-14: "fix both two issues" - the lesson-audio access defect). Live project id: `aswgmbefikhsnhogtryv`. Production: real children's lesson audio. Do EXACTLY these steps, in order, and nothing else. If any check differs from what is expected, STOP, change nothing further, and report.

## Rules

- First action: create `docs/evidence/T2-live-apply.md` in your worktree with a "Where I am / next step" line and commit; append each step's result and commit after each step.
- Work from the branch `claude/hec-conductor-setup-efbaa5`: `git fetch` is not needed (local branch); run `git checkout --detach claude/hec-conductor-setup-efbaa5`. Every file sent to the live project comes from that commit byte for byte with LF line endings (use `git show <commit>:<path>` to read the LF blob; never the CRLF working copy).
- Supabase MCP tools (load with ToolSearch): `execute_sql`, `apply_migration`, `deploy_edge_function`, `get_edge_function`. Never print or read a secret. Never run SQL that returns children's data: catalog queries and counts only.
- No push. Nothing else is touched: not the recorder migration, not any other function.
- You re-type file contents into tool calls: copy them EXACTLY. Steps 3 and 5 exist to catch a slip.

## Step 0 - read

`docs/evidence/T2-class-recordings-access.md` (post-apply probes P1-P6, the rollback statement), `docs/evidence/T2-review.md` (probes P0, P7, P8 and the verdict), `docs/evidence/T2b-transcribe-gate.md` (deploy files, post-deploy probe).

## Step 1 - pre-checks (read-only)

- P4: `SELECT count(*) FROM public.class_transcripts WHERE audio_storage_path IS NOT NULL AND lower(split_part(audio_storage_path, '/', 1)) <> class_id::text` -> expect 0. Also count rows whose path is NOT exactly two segments (`audio_storage_path !~ '^[^/\\]+/[^/\\]+$'`, where the class is one backslash followed by a slash inside the brackets as in the migration file: copy the pattern from the migration) -> expect 0. If either is not 0, STOP.
- The old policy "staff_manage_class_recordings" exists; none of the five new policies exists; the function `class_recordings_staff_can` does not exist; the constraint `class_transcripts_audio_path_in_class` does not exist.
- P0 from the review (which `is_teacher_of_class` is live): record it.
- Counts: objects in bucket `class-recordings`; rows in class_transcripts with audio. Record the two numbers.

## Step 2 - apply the migration

`apply_migration` name `class_recordings_scope`, query = the exact LF content of `supabase/migrations/20261112120000_class_recordings_scope.sql`. If it raises, STOP and report verbatim (the old policy is then still in force: nothing is exposed that was not before).

## Step 3 - verify the migration landed exactly

- P1: exactly five policies for this bucket and no "staff_manage_class_recordings". Compare each policy's `qual` and `with_check` text with what the migration file defines (Postgres normalises whitespace and adds casts: compare meaning, quote both).
- P2: helper settings (security definer, stable, search_path pinned, anon cannot execute).
- `md5(prosrc)` of `class_recordings_staff_can` on live versus the same computed locally: load the migration into pglite exactly as `scripts/pgtest/class-recordings-scope.test.mjs` does (link node_modules: `cmd //c mklink //J node_modules "C:\Users\Dell\Downloads\04 Code & Web Projects\hec-team-app\new\happy-english-club-team-ef716384\node_modules"`; remove ONLY the link at the end with `cmd //c rmdir node_modules`) and select `md5(prosrc)` there. They must be EQUAL. If not: re-apply once from a careful re-read (the migration is idempotent), compare again; if still different, run the rollback statement from the evidence file and STOP.
- P5: the CHECK exists, is NOT VALID, and its definition (pg_get_constraintdef) contains BOTH conditions: first segment equals class_id, and the two-segment pattern with a doubled backslash inside each bracket.
- P7: no permissive storage policy that names no bucket (expect 0 rows).
- P3, P6 counts; the object count and transcript-row count equal step 1's.

## Step 4 - deploy the function

Deploy `transcribe-lesson-audio` with `deploy_edge_function`: verify_jwt TRUE, entrypoint `transcribe-lesson-audio/index.ts`, files `transcribe-lesson-audio/index.ts`, `_lib/auth.ts`, `_lib/text.ts` (check the imports of each file: include every relative import, recursively), each the exact LF blob from the commit.

## Step 5 - verify the deploy

- `get_edge_function`: read the returned `index.ts` against the repo blob; the gate lines (requireRole before any read; callerHoldsClass on the row's class_id; the body-path check; the two-part path check with `audioParts`) must all be present and identical. Record "identical" or the differing lines; on a difference redeploy once; if still different STOP.
- With curl and the publishable key from `.env` (public client key; do not print it): POST `{"transcript_id":"00000000-0000-0000-0000-000000000000"}` -> expect 401 (it answered 404 before the fix). POST with no Authorization -> 401.

## Step 6 - nothing else broke (read-only)

- Counts again: objects in the bucket and transcript rows with audio are unchanged.
- The recorder bucket `class-recorder-audio` does not exist yet (its migration is not applied): confirm the new policies do not mention it.

## Report (under 220 words)

Each step's result; the md5 comparison; the five policies; the constraint definition; the deployed function version; the probe status codes; counts before and after; and one clear line: "LIVE AND VERIFIED" or "STOPPED AT STEP n: <why>" (say whether the rollback was run).
