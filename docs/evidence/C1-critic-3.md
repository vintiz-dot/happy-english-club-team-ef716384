VERDICT: INCOMPLETE

Where I am / next step: suite re-run, N1/N2/N3 probes done (findings M1, M2, m1, m2 below). Next: guard suite with the recorder appended (check 4), mutations, verdict.

# C1 critic 3 (third review of the class recorder migration, revision 2)

Setup: own worktree, `git merge claude/hec-conductor-setup-efbaa5` (one doc conflict, `docs/ENHANCEMENT_BASELINE.md`, resolved to the conductor's copy; nothing else touched). Probes in `.probe/` (deleted at the end).

Suite, as run.mjs registers it:
`node scripts/pgtest/recorder.test.mjs supabase/migrations/20260717090000_audio_transcript_pipeline.sql supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql supabase/migrations/20261112100000_class_recorder.sql` -> `367 passed, 0 failed` (matches the known result).

Probe harness: `.probe/p3.mjs` = the suite's own prelude, fixtures and helpers (recorder.test.mjs lines 1-373, so the same 20260717090000 + TA migration + recorder, pasted twice) + my cases. Time is moved with the suite's `travel(id, mins, true)` (the whole recording, its lesson and its chunks' server stamps move together, so every server-clock check stays consistent).

## Findings (appended as confirmed)

### M1 MAJOR (executed) - the "live" rule bounds REGISTRATION, not the bytes: register on time, upload filler three days later, and it is evidence

`supabase/migrations/20261112100000_class_recorder.sql:1813-1814` (the view's `live` test reads only `registered_at`), `:1556-1595` (`recorder_confirm_chunk` has no time bound), `:2049` (`recorder_can_upload` accepts uploads for as long as the row is `uploading`, i.e. up to `stale_upload_days` = 14).

Probe (`.probe/p3.mjs`, "N2a"): a 95-minute lesson; Start; 100 chunks of 30 s registered one by one, each 1 s after its claimed end (none `late`); Stop at 50 min with NOT ONE BYTE uploaded; three days pass; then 100 objects of 64 000 bytes are uploaded to the registered paths and confirmed with the registered SHA (a client claim); manifest; complete. Real output:

```
P3 N2a any registered late? :: false
P3 N2a stop (no byte uploaded yet) :: null
P3 N2a filler uploaded+confirmed 3 days later, errors :: 0
P3 N2a complete :: null
P3 N2a view :: {"recording_ran_evidence":true,"v":3000000,"vl":3000000,"lo":3004036,"th":2850000,"late":0,"status":"complete","confirm_lag":"3 days 00:50:06.035"}
```

So a page needs only to send ~100 small RPC calls during the lesson (no audio at all); the "audio" can be made afterwards. C1-revision-2 "Contract for C2" item 2 even says "the upload and confirm may follow later", and the D1 contract says the flag means "a recording RAN, live". The offline-queue case does not need the gap: when the Wi-Fi drops, registration fails too, so registration and upload drain together.

Fix (small): in the view's `live` test also require `k.confirmed_at <= r.started_at + ((k.t_end_ms + r.late_after_ms) * INTERVAL '1 millisecond')`; change C2 contract item 2 to "register, upload and confirm within late_after of the chunk's end". Test: the N2a sequence above -> `recording_ran_evidence = false`, `late_audio_ms = 3000000`.

### M2 MAJOR (executed) - the half-lesson threshold counts pre-roll and grace audio as lesson audio: 15 minutes of a 60-minute lesson is "evidence"

`:1797-1819` + `:1749`: `verified_audio_ms` sums every live chunk wherever it sits in the capture window, and is then only capped by `lesson_overlap_ms` (how long the server saw it RUN across the lesson), not intersected with the lesson. Up to pre_roll + grace = 15 minutes outside the lesson count toward `evidence_threshold_ms`, and the column `verified_lesson_ms` says "lesson" for them.

Probe ("N2b"): 60-minute lesson; Start at capture open (5 min before); live chunks for the 5 min of pre-roll, the first 15 min of the lesson, nothing for 45 min, and the 10 min of grace; Stop at the window's close; complete. Real output:

```
P3 N2b chunk errors :: []
P3 N2b complete :: null
P3 N2b view (only 15 of 60 lesson minutes have audio) :: {"recording_ran_evidence":true,"v":1800000,"vl":1800000,"lo":3600000,"th":1800000,"late":0,"status":"complete",...}
```

25 % of the lesson passes a rule that is documented (`:160-162`, `:1716-1721`, D1 contract) as "at least 50 % of the scheduled lesson".

Fix (small): per chunk, count only the part inside the lesson - in the inner select use `GREATEST(0, LEAST(k.t_end_ms, ls.end_ms) - GREATEST(k.t_start_ms, ls.start_ms))` with `ls.start_ms = extract(epoch FROM r.scheduled_start - r.started_at)*1000`, `ls.end_ms = extract(epoch FROM r.scheduled_end - r.started_at)*1000`, for the `live_ms` that feeds `verified_lesson_ms`/the flag (keep `claimed_audio_ms` as is). Test: N2b -> flag false, `verified_lesson_ms = 900000`; the suite's existing "58 minutes ... counts" case must still pass.

### m1 MINOR (executed) - the recorder can preset `abandon_reason` (and so the reason the row will close with)

`:1172` keeps whatever text the page wrote while the row was open. Probe ("N3", owner, open recording): `abandon_reason: CHANGED`. A page can abandon its own recording with `abandon_reason = 'session_canceled'` or `'switch_off'`, imitating the server's reasons (the N4 rule protects `stop_reason` only). An abandoned row is never evidence, so this misleads a reader, it does not make evidence. Fix: in the update trigger take `abandon_reason` from the page only from the fixed list of page reasons, as for `stop_reason`; the server's reasons only from the server paths.

### m2 MINOR (read + executed) - `class_recording_tracks` keeps a whole-table UPDATE grant

`:1974`. While the recording is open the owner may update `recording_id`, `track`, `created_at` as well as the descriptive columns (probe lists all 13). Moving a track to another open recording of theirs is stopped by the chunks' foreign key once a chunk exists, and `chunk_count` is re-checked at completion, so nothing reaches evidence. Fix: column-level UPDATE grant without `recording_id`, `track`, `created_at`, same pattern as `class_recordings`.

## Checks that held (executed)

- N1, new bucket `class-recorder-audio`, every non-owner role (`.probe/p3.mjs` "N1"): T2 (teacher of another class), TA, parent, student: select 0 / update 0 / delete 0 rows; insert refused at the exact registered path, at `{other class}/{this recording}/...`, at `{this class}/{unknown recording}/...` and at the manifest. anon: select 0, insert refused. Admin: reads (by design), update/delete 0, insert refused. The owner: update 0, delete 0, an imitated other-class prefix refused, an unregistered seq refused. The old bucket is still writable by the owner through `staff_manage_class_recordings` (unchanged, as before). `OLD bucket row + policy identical before/after the recorder (two pastes)` -> `true`.
- N1 preflight's blind spot, against the whole tree: `.probe/policies.mjs` replays every CREATE/DROP/ALTER POLICY ... ON storage.objects in `supabase/migrations/` in file order and splits each surviving USING / WITH CHECK at top-level AND/OR. Result: `85 storage.objects policies survive the migration tree; 2 not provably scoped to another bucket` - the 2 are the recorder's own. Every one of the other 83 has a top-level `bucket_id = '<other bucket>'` conjunct (buckets: qr-codes, announcements, homework, student-avatars, teacher-avatars, submissions, exam-reports, resources, audit-clips, audit-eval, homework-videos, class-recordings, lesson-resources, student-work). No migration has the `bucket_id = 'x' OR ...` shape. This is the TREE; the live database may hold dashboard-made policies, so post-apply probe 7b below checks behaviour, not text.
- N3: every class_recordings column the owner can UPDATE on an open row: `abandon_reason, client_ended_at, client_info, client_started_at, manifest_path, manifest_sha256` change; `delete_after, stop_reason, stop_requested_at` ignored; the other 18 granted columns refused by the trigger; the server-stamp columns are not granted at all (suite).
