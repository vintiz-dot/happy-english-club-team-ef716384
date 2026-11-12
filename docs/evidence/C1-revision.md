# C1 Revision 1 - class recorder fixes (F1-F15)

**Where I am / next step:** migration, suite and architecture doc revised and committed; recorder suite 284 passed, 0 failed. Waiting on the full `node scripts/pgtest/run.mjs`; then the mutation run in `.probe/`.

Files touched (only these): `supabase/migrations/20261112100000_class_recorder.sql` (edited in place: never applied), `scripts/pgtest/recorder.test.mjs`, `docs/evidence/C1-architecture.md` (Revision 1 changelog at the top; sections 3, 4, 5.5, 6, 7, 8, 9.1), this file. Written and tested, NOT applied to any database.

## How each finding was closed

| # | Fix | Proof (suite assertion) |
|---|---|---|
| F1 BLOCKER | `started_at`/`ended_at` are the server's clock at the transitions; laptop times kept as `client_*` claims. `recorder_register_chunk` refuses a span longer than `chunk_ms` + 15 s, bytes below the format floor (`min_bytes_per_sec_*`: Opus 2 000, FLAC 4 000, WAV 15 000 B/s, snapshot at arming), `t_end_ms` past `clock_timestamp() - started_at` + 15 s, past Stop, past the window. `complete` re-checks every confirmed object is still stored at its confirmed size, no overlap between consecutive chunks, no chunk past the server's start-stop span. View: `claimed_audio_ms` (claim), `server_capture_ms`, `stored_bytes`, `verified_audio_ms` = LEAST(claim, server span, bytes/floor), `verified_lesson_ms`, `held_threshold_ms`, `was_completed` (technical) and `counts_as_held_evidence` (strict: verified lesson audio >= `held_evidence_min_fraction` 0.50 of the lesson, snapshot at arming). | "the critic's probe: ONE 1-byte chunk claiming 90 minutes is refused"; byte-floor, server-clock, overlap, span, lost-object, changed-size cases; "90 seconds of a 95-minute lesson: complete, but not evidence"; "58 minutes of a 90-minute lesson ... counts as evidence"; the two "view never vouches for more" cases |
| F2 BLOCKER | Record vs listen split. Record: admin, standing teacher, teacher of THAT session. Listen (rows, tracks, chunks, markers, view, storage): `recorder_can_listen(class, session)` = admin, standing teacher, teacher of the recording's own session. Class-level (switch, count, switch-off): a lesson of the class TODAY. The -7/+60 tier is gone. | "the critic's probe: ONE cover lesson 59 days ahead opens nothing - no row, no file"; "the cover teacher reads their own recording and its file - and none of the class's others"; "not the class teacher's file"; past cover; archived cover |
| F3 | One count, `recorder__children_without_consent`, compares `wording_version` with the current one; used by switch-on, the teacher's number and the arm trigger; NULL = refuse. A wording change switches every class off in the settings trigger. | "the critic's probe: switching on under v2 while every child consented under v1 is refused"; "the class is switched off the moment the wording changes"; "arming re-checks each child's wording version itself"; "a switch confirmed under an older wording does not let anyone arm" |
| F4 | `session_id` may go NULL only via the FK after the session row is gone; `armed_session_id` NOT NULL immutable; one-live index on it (partial, not an ON CONFLICT target); owner/class/window/snapshots immutable. | "the recorder cannot detach its open recording"; "nor can an admin while the session exists"; "nor move it"; "the owner cannot be nulled"; "deleting a session keeps its recording" |
| F5 | `capture_opens_at = start - pre_roll (5)`, `capture_closes_at = end + grace (10)`, Hanoi, snapshot at arming. Start refused before opens; chunks past closes + 15 s refused even while recording; Stop clamped to closes. `max_overrun_minutes` removed. | "capture cannot start 19 minutes early"; "audio after the end + grace (+15 s) is refused, even while still 'recording'"; "a Stop after the window is recorded at the window's end"; window snapshot assertion |
| F6 | `SET row_security = off` on `recorder__recording_before_update`, `recorder__recording_before_delete` (now DEFINER, re-checks storage) and `recorder_confirm_chunk`. | NOBYPASSRLS owner (owning the recorder tables, as production's pasting role would): mark-deleted, row delete and confirm all raise `row-level security policy for table "objects"`; "a row marked deleted by any path is still not removed while its audio is in storage"; proconfig assertion |
| F7 | Missing cases added: archived standing teacher, archived cover teacher, future cover, today cover, past cover, TA-of-A who teaches B, plus every hole above. | see mutation table |

Minors, all fixed (each is a correctness or privacy issue, and each was small):

| # | Fix | Proof |
|---|---|---|
| F8 | After Stop, `t_end_ms <= (ended_at - started_at) + 15 s`. | "after Stop, audio claimed from after Stop is refused (F8)" |
| F9 | AFTER INSERT/UPDATE trigger on `enrollments`: class on + child without current consent -> `recorder__switch_off`. Never raises; ended enrolments ignored. | "a new child without consent: the class is off at once"; "an enrolment that has already ended changes nothing" |
| F10 | AFTER UPDATE OF status trigger on `sessions`: Canceled -> abandon armed, stop-request running. `stop_reason 'session_canceled'` accepted only after a server stop request. | "the armed recording is abandoned"; "the running one is told to stop" |
| F11 | Deletion request stamped with `auth.uid()` and server time, frozen once made; `stop_reason` decided at the stop transition ('admin' only from an admin; 'switch_off'/'session_canceled' only after a stop request) and frozen; device profile must belong to the recorder; client fields frozen once terminal. | "a deletion request written by the recorder is stamped with the recorder"; "a teacher cannot claim an admin stopped it"; device-profile cases |
| F12 | `recorder_is_class_teacher` and `recorder__teaches_session` revoked from `authenticated`. | "a parent cannot ask whether someone teaches a class" |
| F13 | Starter read arm only while open, rows only; files only through listen. | "an archived class teacher ... reads no closed recording" |
| F14 | `sample_rate` capped at 48 000. | "a sample rate the bucket's file limit cannot hold is refused (F14)" |
| F15 | Admin DELETE policy on the bucket removed; the retention job (service role) is the only remover. | "its only policies are insert and select (F15)"; "an admin cannot delete a stored file by hand" |

Not done, by design: the critic's (e) "server hashes the object" needs an edge function (C2); the read-back SHA stays as the page's own safety check and is documented as not evidence. The withdrawal-deletes-past-recordings recommendation stays owner question Q3.

## Commands and totals

- Baseline on this branch before any change: `node scripts/pgtest/recorder.test.mjs supabase/migrations/20261111110000_ta_standing_assignments_and_homework_upload.sql supabase/migrations/20261112100000_class_recorder.sql` -> `191 passed, 0 failed`.
- After: same command -> `284 passed, 0 failed`. The migration is applied twice at the start and a third time over live data near the end, without error.
- After: `node scripts/pgtest/run.mjs` -> `2250 assertions across 33 suites, 0 suite(s) failed` (baseline 2157 across 33; 2157 - 191 + 284 = 2250: the only count that changed is the recorder suite; every other suite has its baseline count and passes; app and edge-function typechecks included).
- Every old recorder assertion is kept. Where the rule changed, the assertion changed with it: e.g. "start time held to the arming time" is now "the start time is the server's", "hard limit end + overrun" is now the window check, "two tracks are 30 s" now reads `verified_audio_ms`, the bucket has two policies, and "a child who joins blocks the next recording with the switch on" is now made through an enrolment that skips the trigger, because a normal enrolment now switches the class off (F9).

## Contract for D1

D reads `public.recorder_session_evidence` and decides on ONE column: **`counts_as_held_evidence`** (`WHERE session_id = $1 AND counts_as_held_evidence`). `was_completed` is technical only. Full column table: `C1-architecture.md` section 7. Not wired into D1 (`session_recording_evidence`) until this revision passes its second review.

## Contract for C2

The client must send, in order:

1. Arm: INSERT into `class_recordings` with `session_id`, `format` (`opus-webm`/`flac`/`pcm-wav`), `chunk_ms` (10 000-60 000), optional own `device_profile_id`, `client_info`. Everything else is overwritten by the server.
2. Start: UPDATE `status = 'recording'` no earlier than `capture_opens_at` (refused before), optionally `client_started_at` (kept as a claim). `started_at` is the server's clock: t = 0 of the audio should be as close as possible to this call (start capture, then send; the 15 s tolerance absorbs the latency).
3. Tracks: INSERT `class_recording_tracks` (mono, `sample_rate` <= 48 000).
4. Per chunk: `recorder_register_chunk(...)`, upload to the returned path, `recorder_confirm_chunk(chunk_id, readback_sha256)`.
5. Stop: UPDATE `status = 'uploading'`, `stop_reason` in (`manual`, `scheduled_end`, `device_lost`, `crash_recovered`), or `session_canceled`/`switch_off` when the server set `stop_requested_at`.
6. Finalize: upload `manifest.json`, set each track's `chunk_count`, UPDATE `status = 'complete'` with `manifest_path` and `manifest_sha256`.

The server now verifies and refuses:

- a chunk span > `chunk_ms` + 15 s; fewer bytes than `min_bytes_per_sec x span`; `t_end_ms` past the server's elapsed time since `started_at` + 15 s; past Stop + 15 s; past `capture_closes_at` + 15 s; `t_start_ms` past a stop request + 60 s; a re-registration with different bytes, hash or span;
- capture start before `capture_opens_at` or after `capture_closes_at`;
- completion with any unconfirmed chunk, any confirmed chunk missing from storage or changed in size, overlapping chunks (> 100 ms), a chunk past the server's start-stop span + 15 s, chunk counts that disagree, no manifest;
- changing session, class, owner, window, format, chunk length or any arming snapshot; detaching the session; someone else's device profile; forging deletion attribution or an admin stop reason.

C2 must measure the real bytes/second of each format on the school laptop and report them against the floors ([C2-measure]); if a floor is too high for a quiet room, an admin lowers the setting (it is snapshot per recording).
