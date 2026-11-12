# T2 live apply (aswgmbefikhsnhogtryv)

Where I am / next step: DONE. All six steps passed; nothing pushed.

## Step 0 - read
Read T2-live-apply-brief.md, T2-class-recordings-access.md, T2-review.md, T2b-transcribe-gate.md from 7f8004e (detached HEAD).

## Step 1 - pre-checks (read-only)
- P4 mismatched first segment: 0. Not exactly two segments (`audio_storage_path !~ '^[^/\\]+/[^/\\]+$'`, copied from the migration): 0.
- Old policy "staff_manage_class_recordings": exists (1). The five new policies: 0. Helper `class_recordings_staff_can`: absent. Constraint `class_transcripts_audio_path_in_class`: absent.
- P0: live `is_teacher_of_class` standing_tas = true, seven_day_window = true (the 20261111110000 version).
- Counts: objects in `class-recordings` = 11; `class_transcripts` rows with audio = 11.
- All as expected.

## Step 2 - apply
`apply_migration` name `class_recordings_scope`, query = the LF content of `supabase/migrations/20261112120000_class_recordings_scope.sql` at 7f8004e. Result: `{"success":true}`.

## Step 3 - verify the migration landed
- P1: exactly five policies, all PERMISSIVE, roles `{authenticated}`; no "staff_manage_class_recordings".
  - class_recordings_admin_all ALL: qual = with_check = `((bucket_id = 'class-recordings'::text) AND has_role(auth.uid(), 'admin'::app_role))` (file: `bucket_id = 'class-recordings' AND public.has_role(auth.uid(), 'admin'::public.app_role)` for both) - same.
  - class_recordings_staff_select SELECT: qual `((bucket_id = 'class-recordings'::text) AND class_recordings_staff_can(name))`, with_check null - same as file.
  - class_recordings_staff_insert INSERT: qual null, with_check `((bucket_id = 'class-recordings'::text) AND class_recordings_staff_can(name))` - same.
  - class_recordings_staff_update UPDATE: qual and with_check both `((bucket_id = 'class-recordings'::text) AND class_recordings_staff_can(name))` - same.
  - class_recordings_staff_delete DELETE: qual `((bucket_id = 'class-recordings'::text) AND class_recordings_staff_can(name))` - same.
  - Also: md5 of the five policies' (name|cmd|roles|qual|with_check) live = `bfecfb23f905fa37ed67349029c25c87` = local pglite load.
- P2: prosecdef t, provolatile s, proconfig `{search_path=public}`, anon EXECUTE f, authenticated EXECUTE t.
- md5(prosrc) of class_recordings_staff_can: live `b8b2985ed5d906b138fbaf93d988db64` (len 387); local pglite (PRELUDE + 20260717090000 + 20261111110000 + the fix, LF blobs from 7f8004e, loaded as class-recordings-scope.test.mjs does) `b8b2985ed5d906b138fbaf93d988db64` (len 387). EQUAL.
- P5: `class_transcripts_audio_path_in_class`, convalidated f. Definition: `CHECK (((audio_storage_path IS NULL) OR ((lower(split_part(audio_storage_path, '/'::text, 1)) = (class_id)::text) AND (audio_storage_path ~ '^[^/\\]+/[^/\\]+$'::text)))) NOT VALID` - both conditions; exactly two backslashes inside each bracket (strpos check true, no triple). md5(def) live `236774d34d13649f539275a8ccfeb4c6` = local.
- P7: 0 rows.
- P3: 0. P6: 0.
- Objects in bucket 11 (step 1: 11); rows with audio 11 (step 1: 11).
- Note: sha256 of the LF fix blob at 7f8004e is `f01a227a...c652`, not the `92044de3...` in T2-class-recordings-access.md "Fingerprint" (that fingerprint predates folding in R1, the two-segment clause; the file was not re-fingerprinted). The md5 checks above are what verify the live state.

## Step 4 - deploy
`deploy_edge_function` transcribe-lesson-audio, verify_jwt true, entrypoint `transcribe-lesson-audio/index.ts`, files `transcribe-lesson-audio/index.ts`, `_lib/auth.ts` (imports only esm.sh supabase-js), `_lib/text.ts` (imports nothing) - the LF blobs at 7f8004e; the function dir has no deno.json. Result: status ACTIVE, version 4, verify_jwt true, ezbr_sha256 `698cb157d461852739ff0b49f9eaa55313cc202090c6b8274d5b151cfa614caf`.

## Step 5 - verify the deploy
- `get_edge_function`: version 4, ACTIVE, verify_jwt true; files index.ts, _lib/text.ts, _lib/auth.ts. Gate lines in the returned index.ts, each found verbatim (exactly once) in the 7f8004e blob: `requireRole(req, sb, ["admin", "teacher"], corsHeaders)` + `if (gate instanceof Response) return gate;` (blob line 427, before the row read in the handler and before any download); `callerHoldsClass(sb, gate, tr.class_id)` with the 403 message; the body `audio_storage_path` check (400); the `audioParts` two-part check (`length !== 2`, first part = class_id lowercased, no empty / `.` / `..` / `%` / backslash part) with its 403. Result: identical. The box-drawing comment lines (the only non-ASCII-heavy lines) also match the blob byte for byte; the rest read identical to the blob; _lib files read identical.
- Probes (publishable key from .env, not printed): POST `{"transcript_id":"00000000-0000-0000-0000-000000000000"}` with the anon key -> 401, body `{"error":"Unauthorized"}` (the function's own requireRole reply; was 404 before). POST without Authorization -> 401.

## Step 6 - nothing else changed (read-only)
- Objects in `class-recordings`: 11 (before 11). Transcript rows with audio: 11 (before 11).
- Bucket `class-recorder-audio`: does not exist (0). No storage policy (new or other) mentions `class-recorder-audio` (0). New policies: 5.
- Nothing pushed. node_modules junction removed; throwaway probe script deleted.

LIVE AND VERIFIED
