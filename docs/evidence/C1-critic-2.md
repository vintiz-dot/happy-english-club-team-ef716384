VERDICT: INCOMPLETE

# C1 critic 2 (second review of class recorder migration)

Baseline (run by critic 2): `node scripts/pgtest/recorder.test.mjs <20261111110000> <20261112100000>` -> `284 passed, 0 failed`.

## Findings (appended as confirmed)

Probe harness: `.probe/build.mjs` takes the suite's own PRELUDE and helpers (recorder.test.mjs lines 1-195 and 278-299) verbatim, optionally loads the REAL `20260717090000_audio_transcript_pipeline.sql` first (`PIPE=1`, as the live database has it), then the TA migration and the real recorder migration, and runs a probe body. Deleted at the end, not committed.

### N1 BLOCKER (executed) - the bucket `class-recordings` already exists, with a policy that lets EVERY teacher read, overwrite and delete every object in it; the recorder reuses it and leaves that policy in place. Applying it also breaks the live Teacher Transcripts audio upload.

- Where: `supabase/migrations/20260717090000_audio_transcript_pipeline.sql:24-48` creates bucket `class-recordings` (50 MB, mp3/m4a/mp4/wav/webm) and policy "staff_manage_class_recordings" `FOR ALL TO authenticated USING/WITH CHECK (bucket_id = 'class-recordings' AND (has_role admin OR has_role teacher))`. Nothing in the tree drops it (grep: one hit). The live page `src/pages/TeacherTranscripts.tsx:316-319` uploads lesson audio there (`{classId}/{uuid}.{ext}`, up to 24.5 MB, :37) and `supabase/functions/transcribe-lesson-audio/index.ts:287` reads it. The recorder migration (`20261112100000_class_recorder.sql:1766-1772`) inserts the same bucket id with `ON CONFLICT (id) DO UPDATE SET file_size_limit = 8 MB, allowed_mime_types = (webm, flac, wav, json)`, adds its own two policies, and drops only `class_recordings_storage_delete`. Postgres ORs permissive policies, so the recorder's careful SELECT/INSERT rules are moot. The suite's PRELUDE has no such bucket or policy, so it cannot see this; neither critic 1 nor the revision mentions 20260717090000.
- Probe (executed, `PIPE=1`): T2 is the teacher of class B only; T1 records class A and confirms one chunk.
  ```
  PROBE bucket after recorder migration: {"file_size_limit":8388608,"allowed_mime_types":["audio/webm","audio/flac","audio/x-flac","audio/wav","audio/x-wav","application/json"]}
  PROBE storage.objects policies: [... "class_recordings_storage_insert" INSERT, "class_recordings_storage_select" SELECT, "staff_manage_class_recordings" ALL]
  PROBE N1 T2 (teacher of class B only) SELECT files of class A: 1
  PROBE N1 T2 recorder_can_read_object: [{"v":false}]          <- the recorder's own rule says no; the old policy says yes
  PROBE N1 T2 UPDATE (overwrite) a confirmed chunk: 1
  PROBE N1 T2 INSERT at a path of class A's recording: null   <- allowed
  PROBE N1 T2 DELETE class A's audio: 2
  ```
  Same probe without the old migration (what the suite sees): `0`, `0`, `new row violates row-level security policy`, `0`.
- Why: children's voice audio of every class readable, replaceable and deletable by every teacher (and by a teacher of the class after the recording, so a "complete" row can point at swapped or missing files). On apply, with the recorder switched off, the live transcript upload starts refusing mp3/m4a/mp4 and any file over 8 MB.
- Fix: give the recorder its OWN bucket (e.g. `lesson-recorder`), created with `ON CONFLICT (id) DO NOTHING` plus a preflight that RAISES if a bucket of that id exists with `public = true` or if any policy on storage.objects mentions that bucket other than the recorder's two; change every `'class-recordings'` literal in the migration (bucket insert, policies, the four storage.objects reads in the triggers / confirm function, comments) and in the suite. Do not touch the old bucket or its policy. Add to the suite PRELUDE a FOR ALL teacher policy on a neighbouring bucket and assert a class-B teacher reads 0 recorder files. Separately (owner question, not this migration): "staff_manage_class_recordings" already lets every teacher read every class's uploaded lesson audio today.

Where I am / next step: writing up F1-late, delete_after, F11 and F4 results (already executed), then clock edges, F6 owner, mutations.
