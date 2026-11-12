VERDICT: INCOMPLETE

Where I am / next step: 2 findings confirmed by probe; next: consent version, session detach, window, fail-open delete check, mutations.

Critic of C1 (class recorder): `supabase/migrations/20261112100000_class_recorder.sql`, `scripts/pgtest/recorder.test.mjs`, `docs/evidence/C1-architecture.md`, on branch `claude/hec-conductor-setup-efbaa5` merged into the critic worktree. Baseline: `node scripts/pgtest/recorder.test.mjs <TA mig> <recorder mig>` -> `191 passed, 0 failed` (run by the critic).

Probes ran in a throwaway `.probe/` harness that copies the suite's PRELUDE verbatim, loads 20261111110000 then the real recorder migration into pglite, and switches roles with `SET LOCAL ROLE authenticated|service_role` + `test.uid`, exactly as the suite does. The harness is deleted at the end and not committed.

## Findings

### F1 BLOCKER - `was_completed` and `confirmed_audio_ms` can be fabricated: one 1-byte chunk, completed in 0.25 s, reads as 90 minutes of confirmed lesson audio

- Where: `recorder_register_chunk` takes `p_t_start_ms` / `p_t_end_ms` from the client and only bounds them by `max_duration_ms` (migration :997-1005); `recorder_confirm_chunk` compares a client-supplied "read-back" SHA with the client-supplied registered SHA (:1063) - the server never hashes anything, so this proves nothing; the `complete` transition (:738-766) has no minimum duration, no lower bound on bytes per ms, no check that `ended_at - started_at` resembles the claimed audio; the view (:1194, :1212-1216) sums the client's claimed spans and labels them "confirmed". The view comment (:1183-1186) and architecture 6 ("the figures D should trust are the ones the server observed ... the confirmed audio length - not the laptop's clock") are false: `confirmed_audio_ms` IS the laptop's claim.
- Probe (executed): class switched on with consent, teacher T1 arms a running lesson, goes recording -> registers ONE chunk `byte_size=1, t 0..5_400_000`, uploads a 1-byte object, confirms with the same SHA, uploading, manifest, complete.
  ```
  P3 complete with ONE 1-byte chunk claiming 90 min: {"ok":[]}
  P3 evidence: {"was_completed":true,"confirmed_audio_ms":5400000,"tracks_with_audio":1,"started_at":"2026-11-12T01:34:10.655Z","ended_at":"2026-11-12T01:34:10.810Z","elapsed":"00:00:00.254"}
  P3 bytes actually stored: {"b":1}
  ```
- Why it matters: the contract says a completed recording is STRONG evidence that a lesson was held and forces an admin through the acknowledgement path before cancelling (and feeds who-gets-paid questions). A teacher who opens the page for a quarter of a second inside the window manufactures that evidence. Started/ended are server-clamped but 155 ms apart - nothing reads them.
- Fix (before D builds on it): (a) in `recorder_register_chunk`, refuse a chunk whose span does not fit the server's clock: `p_t_end_ms <= extract(epoch from (clock_timestamp() - started_at))*1000 + slack` (audio cannot be registered before it could have been captured), and bound bytes per ms by format (opus-webm >= ~2 kB/s, flac/wav >= sample_rate*~0.5 B/ms); (b) `complete` requires `ended_at - started_at >= N minutes` and per-track contiguous spans (`t_start_ms` of seq n+1 = `t_end_ms` of seq n, within tolerance); (c) the view exposes `server_span_ms = ended_at - started_at` and `last_chunk_registered_at - first_chunk_registered_at`, and `was_completed` is defined as complete AND server span >= a threshold, else `was_completed=false, too_short=true`; (d) rename or drop "confirmed" from `confirmed_audio_ms` (it is `claimed_audio_ms`), or have the retention/C2 edge function compute the real duration from the stored file and write it server-side. (e) Delete the read-back SHA ceremony or document that it proves only that the client is honest; a real check needs the server (edge function) to hash the object.

### F2 BLOCKER - a teacher of ANOTHER class reads every recording, every file and every name-chip of a class as soon as they are put on one of its sessions up to 60 days in the future (or 7 days back)

- Where: `recorder_is_class_teacher` tier 2 (:89-97) copies `is_teacher_of_class`'s session tier: any non-cancelled session of the class with `teacher_id` = them, dated today-7 .. today+60. It is used for READ of rows (`class_recordings_read` :1277-1279), chunks/markers/tracks (via `recorder_can_read_recording` :904-915) and storage (`recorder_can_read_object` :1436-1453), with no relation between the recording's date and the covered session.
- Probe (executed): T2 (default teacher of class B, nothing to do with class A) reads nothing; then one session of class A dated `CURRENT_DATE + 59` is given to T2.
  ```
  P1 before: T2 sees 0 recordings, 0 files
  P1 after ONE cover session 59 days ahead: T2 sees 1 recordings, 2 files; recorder_can_read_object: [{"v":true}]
  ```
- Why it matters: children's voice audio of every past lesson of the class (30 days retained, up to 180 by admin) opens to a teacher who has not taught it yet and may never; a cover booked two months ahead (or a mis-assigned session that an admin cancels later... while not Canceled) is a read grant on the whole archive. The brief requires "readable only by the class's teacher and admins". The 7-day back window has the same shape (a one-off cover last week reads the whole month).
- Fix: split "may record" from "may listen". Recording: keep tiers 1-3 but restrict tier 2 to `s.date = today (Hanoi)` (a cover teacher records the lesson they are covering, nothing else). Listening (`recorder_can_read_recording` / `recorder_can_read_object`): admin, the class's default/timetable teacher, or `r.started_by = auth.uid()` while still a teacher of the class, or the teacher of THAT recording's own session (`sessions.id = r.session_id AND teacher.user_id = auth.uid()`). Never a future session. Add suite cases: future cover reads 0, past cover reads only its own session's recording.

## Must fix before C2 builds on it
(in progress)

## Checked and found sound
(in progress)

## Not checked
(in progress)
