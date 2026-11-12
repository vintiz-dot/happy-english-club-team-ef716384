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

### F3 MAJOR - per-child consent is never checked against the current wording version: a new wording invalidates the class confirmation but not one child's consent

- Where: `recorder_child_consents.wording_version` is stored (:217, :384) but neither `recorder_class_missing_consent` (:244-246) nor the arm trigger (:619-621) compares it with `recorder_settings.consent_wording_version`; both test only `status = 'granted'`. Architecture 4 says changing the text "invalidates every earlier confirmation"; that is true only of the class row.
- Probe (executed): both children granted under v1; admin sets wording v2; admin switches the class ON quoting v2; teacher arms.
  ```
  C-version: switch ON under v2 while both children's consent is v1: {"ok":[{"recorder_set_class_recording":""}]}
  C-version: child consent rows: [{"wording_version":"v1-2026-11"},{"wording_version":"v1-2026-11"}]
  C-version: arm under v2 with v1 child consents: {"ok":"33623fcb-..."}
  ```
- Why: the reason to version the wording is that v2 may ask parents for something v1 did not (e.g. "may be sent to an AI vendor", which the owner approved for evaluation). Children are then recorded under terms their parents never saw. Fail-open against the guard's own stated intent.
- Fix: in both places, `NOT EXISTS (... cc.status = 'granted' AND cc.wording_version = v_set.consent_wording_version)`. Suite case: bump the version, reconfirm the class, arm must be refused with "N children".

### F4 MAJOR - the recorder can detach its own open recording from its session (`session_id := NULL`), which erases the evidence for that session and defeats the one-live-recording index

- Where: update trigger (:691-694) deliberately allows `session_id` -> NULL ("the session may vanish"), but the RLS update policy (:1286-1292) lets the owner write the column while the recording is open, so the exception meant for `ON DELETE SET NULL` is open to the client.
- Probe (executed):
  ```
  DETACH: owner sets session_id NULL on open recording: {"ok":[{"session_id":null}]}
  DETACH: evidence rows for that session now: 0
  DETACH: second live recording of the same session: {"ok":"ad06489a-..."}
  ```
- Why: the cancellation guard (D) finds evidence by `session_id`; a recording detached this way still has audio of children but no session, so D sees "no recording" and the STRONG path is skipped. Recordings with NULL session are also orphans for any per-session reasoning, and the unique index (:482-483) no longer stops two concurrent captures of one lesson.
- Fix: in the update trigger, allow `NEW.session_id IS NULL AND OLD.session_id IS NOT NULL` only when the session row is actually gone: `AND NOT EXISTS (SELECT 1 FROM public.sessions WHERE id = OLD.session_id)` (inside the FK's SET NULL action the row is already deleted). Better: keep `session_id` NOT NULL with no FK action and a separate `session_deleted_at`, so evidence is never keyed on a nullable column. Add a suite case for the client write.

### F5 MAJOR - the server lets capture run from 20 minutes before the lesson (settable to 30) and to 30 minutes after it (settable to 60); the product rule is 5 minutes before to end + grace

- Where: arm window `arm_window_minutes` default 20, max 30 (:58); `max_duration_ms` = end + `max_overrun_minutes` (default 30, max 60) - now (:641-642); `started_at` may be as early as `armed_at` (:728). `pre_roll_minutes` (5) and `grace_minutes` (10) are, by the file's own comment (:56-57), only "what the page does by itself" - i.e. not enforced.
- Probe (executed): lesson starts in 19 min.
  ```
  WINDOW: arm 19 min before start: {"ok":"5933b003-..."}
  WINDOW: start capture now (19 min early): {"ok":[{"started_at":"2026-11-12T01:35:21.645Z","scheduled_start":"2026-11-12T01:54:21.616Z"}]}
  WINDOW: chunk t=0..30s (i.e. 19 min before the lesson) registers: {"ok":[...,"already_registered":false}]}
  WINDOW: max_duration_ms (min): 108
  ```
- Why: room audio of children in the corridor/break 15+ minutes outside the window the parents were told about is accepted and stored. The server is the only boundary a modified page cannot cross; here it is 4x wider than the product rule.
- Fix: arming may stay early (it is just a row), but `armed -> recording` must clamp `started_at >= scheduled_start - pre_roll_minutes` (refuse earlier), and `recorder_register_chunk` must refuse audio whose server-time position falls before `scheduled_start - pre_roll` or after `scheduled_end + grace_minutes` (compute from `started_at` + `t_ms`, and see F1(a) for tying `t_ms` to the server clock). If an overrun allowance is wanted, it is `grace_minutes`, one number.

## Must fix before C2 builds on it
(in progress)

## Checked and found sound
(in progress)

## Not checked
(in progress)
