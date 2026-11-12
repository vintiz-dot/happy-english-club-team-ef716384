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

### N2 MAJOR (executed) - F1 survives in a new form: one Start call inside the window, nothing for three days, then Stop and 5.7 MB of filler gives `counts_as_held_evidence = true` with "server_capture_ms" of the whole lesson

- Where: the stop transition clamps `ended_at := LEAST(v_now, OLD.capture_closes_at)` (class_recorder.sql:951), so a Stop days later is recorded as a Stop at the window's end; the after-Stop bound (:1344-1347) and the elapsed bound (:1340-1343) are then both satisfied by any position inside the window; nothing compares a chunk's `registered_at` with `started_at + t_end_ms`; the view (:1553-1555) does not look at `first/last_chunk_registered_at`, which it does expose. The byte floor (:1336) is met by any bytes - the server never parses audio. So "server_capture_ms" is two API calls, not capture the server saw.
- Probe (executed): 90-min lesson; T1 starts inside the window; `travel` 3 days; Stop; 190 chunks x 30 s of 60 000 bytes registered, "uploaded", confirmed; manifest; complete.
  ```
  PROBE F1L stop 3 days later: null
  PROBE F1L ended_at vs now: {"clamped":true,"behind":"2 days 22:17:00.68"}
  PROBE F1L filler chunks (60 000 random-size bytes per 30 s) accepted: 190 null
  PROBE F1L complete: null
  PROBE F1L evidence: {"counts_as_held_evidence":true,"was_completed":true,"server_capture_ms":6179717,"verified_lesson_ms":5400000,"held_threshold_ms":2700000,"first_chunk_lag":"3 days 00:00:00.422"}
  ```
- Why: D's contract reads ONE column. A teacher (or anyone with the teacher's login, from any device, within the 14-day stale window) manufactures STRONG "held" evidence after the fact for a lesson where no laptop was on. Even honest, the flag proves only that a device uploaded plausible-size data during the window - NOT that children were present (an empty room records the same).
- Fix (small): (a) do not clamp silently: store the real `stopped_at := v_now` and keep `ended_at := LEAST(...)`; (b) in the view, count toward `verified_audio_ms` only chunks with `registered_at <= started_at + t_end_ms + live_lag` (setting `live_upload_lag_minutes`, default 15, snapshot at arming) and expose the rest as `late_audio_ms`; `counts_as_held_evidence` requires `stopped_at <= capture_closes_at + live_lag`. Offline catch-up uploads stay possible; they just are not evidence. (c) Rename the D column to what it is: `capture_ran_during_lesson` (label "a recording ran during the lesson time - this is not attendance"), and keep D's strength wording to "recording made", never "lesson held"/"children present". Suite: the 3-day probe above must give false, and an 80%-live recording true.

### N3 MAJOR (executed) - the person whose lesson is in question can destroy the audio before anyone listens, and the evidence row keeps saying "held"

- Where: update trigger :914-917 lets anyone who can update the row shorten `delete_after` with no lower bound ("Anyone who can touch the row may shorten its life"); the recorder can update while open (policy :1680-1685); `recorder_retention_due` (:1470-1483) returns it at once; the view (:1553) keeps `counts_as_held_evidence` true for `status = 'deleted'` (by design, "stays true after retention"). `recorder_request_deletion` gives a standing teacher the same power over any recording of the class.
- Probe (executed, continuing N2's recording):
  ```
  PROBE F1L teacher shortens delete_after to the past while open: null
  PROBE F1L delete_after now: {"delete_after":"2000-01-01T00:00:00.000Z"}
  PROBE F1L retention_due as service role: [{"it":true,"deletion_requested":false}]
  PROBE F1L retention marks deleted: null
  PROBE F1L evidence after the audio is gone: {"status":"deleted","counts_as_held_evidence":true}
  ```
  (`deletion_requested: false` - the retention job cannot even tell it was the teacher's choice; only the audit log's `retention_changed` row says so.)
- Fix: (a) the server-owned list gets `delete_after` for non-admins: a non-admin may only go through `recorder_request_deletion` (privacy right kept, attributed); (b) `delete_after >= scheduled_end` CHECK; (c) the view adds `audio_deleted_at`, `deletion_requested_by`, and `counts_as_held_evidence` is false when the deletion was requested by a non-admin before an admin reviewed it (or D shows "audio deleted at the teacher's request on ..." next to the item). Suite: teacher-set past `delete_after` is kept; evidence after a teacher-requested deletion is not strong.

### N4 MINOR (executed) - F11's "stop_reason 'session_canceled' only after a server stop request" is bypassable: the recorder can make the stop request itself

- Where: :892-896 accepts a client-written `stop_requested_at` (stamped with server time) and :958-959 then accepts `session_canceled`/`switch_off`.
- Probe: `F11 teacher sets stop_requested_at itself: null` / `stops with stop_reason session_canceled: null` / `row: {"stop_reason":"session_canceled","session_status":"Scheduled"}`.
- Fix: keep `stop_requested_at` server-owned for non-admins (`IF NOT v_admin THEN NEW.stop_requested_at := OLD.stop_requested_at`); the switch-off/cancel triggers run as the caller, so set a transaction-local flag (`set_config('recorder.server_stop','1',true)`) in `recorder__switch_off` / `recorder__session_canceled` and accept the column only when it is set. A teacher's own "stop" is just the `uploading` transition.

### F4 re-check (executed) - every column the recorder can still change on its own OPEN recording

Sweep: for each column of `class_recordings`, T1 runs `UPDATE ... SET col = <typed value>` on its open recording and the result is compared (rolled back each time).
```
PROBE F4 sweep (T1, open recording): ["client_info","client_started_at","client_ended_at","stop_requested_at","manifest_path","abandon_reason","delete_after","updated_at"]
refused: id class_id session_id armed_session_id session_date scheduled_* capture_* purpose status(to an illegal state) format chunk_ms max_duration_ms min_bytes_per_sec clock_tolerance_ms held_min_fraction started_by device_profile_id(foreign) armed_at manifest_sha256(bad format) deletion_requested_at(no reason)
silently kept (server-owned): started_at ended_at stopped_by stop_reason completed_at abandoned_at audio_deleted_at deletion_requested_by
```
`session_id` detach is now refused (F4 fixed). The client fields are labelled claims; `manifest_path` is checked at complete. The two that matter are `delete_after` (N3) and `stop_requested_at` (N4). `updated_at` is overwritten by the server.

### F2 re-check (executed) - cover removed while recording

`F2 cover T2 reads rows of class A: 1` (its own open recording only); after the session is given back to T1: `T2 (still recording) reads rows: 1`, and register reaches the track check (would accept audio). MINOR (N5): a recorder taken off the lesson keeps capturing it until Stop. Fix: in `recorder_register_chunk` re-check `recorder__teaches_session OR recorder_is_class_teacher OR admin` for `started_by`, refuse otherwise; or a `sessions.teacher_id` change trigger that sets `stop_requested_at`, same shape as F10.

Where I am / next step: clock edges + 0.50 boundary, F6 owner on mark_audio_deleted, F3 ended enrolment; then mutations.
