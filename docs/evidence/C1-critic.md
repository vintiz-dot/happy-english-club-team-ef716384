VERDICT: FAIL

Counts: 2 BLOCKER (F1 false evidence, F2 data exposure), 5 MAJOR (F3-F7), 8 MINOR (F8-F15). Every BLOCKER and MAJOR was run as a probe; the real output is quoted. FAIL because F1 (fabricated `was_completed`), F2 (children's audio readable by a teacher of another class) and F6 (fail-open deletion guard) were executed. Status: finished.

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

### F6 MAJOR - the "no file left" guard on `deleted` fails OPEN when the function owner cannot see `storage.objects` rows; then the row can be hard-deleted and the audio is orphaned with nothing pointing at it

- Where: `recorder__recording_before_update`, `deleted` branch (:780-784): `IF EXISTS (SELECT 1 FROM storage.objects ...)`. The function is SECURITY DEFINER, so it reads as its owner (whoever pasted the migration). If that role is subject to RLS on `storage.objects` (Supabase enables RLS there; policies here are `TO authenticated`), the query silently returns no rows, `EXISTS` is false and the guard passes. The builder's caveat is right, and it is fail-open. The `complete` branch (:743) and `recorder_confirm_chunk` (:1066-1071) have the same blindness but fail CLOSED (absence -> refusal).
- Probe (executed): `recorder__recording_before_update` owned by `mig_owner NOBYPASSRLS` with SELECT on storage.objects; a recording completed earlier with 2 files in storage.
  ```
  FAILOPEN: complete with a non-bypass owner: {"err":"The manifest is not in storage yet"}     <- closed side
  files of r2 in storage: 2
  FAILOPEN: service role marks r2 deleted with its files still present: {"ok":[{"d":true}]}
  FAILOPEN: row now: [{"status":"deleted","gone":true}]
  FAILOPEN: files still there: 2
  FAILOPEN: row can now be hard-deleted: {"ok":[]}
  FAILOPEN: orphaned files left: 2
  ```
- Whether the owner on production bypasses RLS was NOT checked (no live database). The guard's correctness depends on an unasserted property of the pasting role.
- Fail-closed form (executed): give the function `SET row_security = off`. Postgres then raises instead of filtering when the owner does not bypass RLS:
  ```
  FIX: with row_security=off and a non-bypass owner, mark deleted: {"err":"query would be affected by row-level security policy for table \"objects\""}
  ```
  Put `SET row_security = off` on `recorder__recording_before_update` and `recorder_confirm_chunk` (both read storage.objects), and add a suite case that re-owns the function to a NOBYPASSRLS role and expects the refusal. Separately, `recorder__recording_before_delete` (:801-811) should re-check storage too (same form), so a row is never removed while a file exists, whatever path got it to `deleted`.

### F7 MAJOR (test quality) - mutation run: 19 of 21 applied mutations caught; both survivors are in the access rule; the six holes above have no test at all

Executed: `.probe/mut.mjs` wrote a mutated copy of the migration (CRLF-aware string replace) and ran the real suite against it: `node scripts/pgtest/recorder.test.mjs <TA mig> .probe/m_class_recorder.sql`. CAUGHT = at least one FAIL or a non-zero exit.

| Mutation | Result |
|---|---|
| switch `DEFAULT true` | CAUGHT (crash after "nor can an admin") |
| arm ignores the switch | CAUGHT (189/2) |
| arm ignores per-child consent | CAUGHT (189/2) |
| CHECK "ON needs consent" removed | CAUGHT (189/2) |
| audit trigger allows DELETE | CAUGHT (188/3) |
| audit TRUNCATE trigger removed (re-run cleanly in `.probe/mut2.mjs`) | CAUGHT (190/1: `FAIL or truncate it :: it was allowed`) |
| storage SELECT policy = bucket only | CAUGHT (186/5) |
| storage read lets TAs in via `is_teacher_of_class` | CAUGHT (190/1) |
| **archived teacher (`is_active=false`) still a teacher** | **SURVIVED (191/0)** - no inactive-teacher case |
| **cover tier widened from 60 days to 3650 days ahead** | **SURVIVED (191/0)** - no cover-teacher case at all (see F2) |
| cancelled lesson can be armed | CAUGHT (187/4) |
| ended lesson can be armed | CAUGHT (187/4) |
| `class_recordings` readable by every signed-in user | CAUGHT (185/6) |
| tracks/chunks/markers readable by anyone | CAUGHT (186/5) |
| confirmed chunk can be re-uploaded | CAUGHT (188/3) |
| `deleted` allowed while files remain | CAUGHT (186/5) |
| consent withdrawal does not switch off | CAUGHT (184/7) |
| anon gets SELECT on `class_recordings` | CAUGHT (190/1) |
| teachers read per-child consent | CAUGHT (188/3) |
| chunk span unbounded by the window | CAUGHT (indirectly: a later assertion crashed) |
| stop request may be cleared | CAUGHT (190/1) |

Two controls (per-child wording version; client nulls `session_id`) could not be mutated because the guard does not exist - F3, F4. Untested behaviours the probes above exploited: F1 (no minimum span / claimed ms), F2 (cover teacher), F3, F4, F5 (window wider than product), F6 (owner without BYPASSRLS).

Other test-quality notes (read, not executed): roles ARE really switched (`SET LOCAL ROLE` + `test.uid`, :124-131) - good. But (a) every storage function runs as the pglite superuser, so the suite can never see F6; (b) the PRELUDE's `enrollments`, `sessions`, `teachers` are cut-down stand-ins (:40-57), so a column renamed in production would not fail here; (c) the "TA reads nothing" case passes because the TA has no `teachers` row - no case covers a person who is both a TA of class A and a teacher of class B; (d) the "audio from after the lesson window" case uses 9 000 000 ms, nowhere near the edge.

### MINOR findings

- **F8 MINOR (executed) - audio from after Stop is accepted.** In `uploading`, `recorder_register_chunk` (:987, :1003) bounds `t_end_ms` only by `max_duration_ms`, not by `ended_at`. Probe: stopped at once, then `AFTER-STOP: chunk claiming minutes 60-61 after Stop registers: {"ok":[...]}`. A page that keeps capturing after showing "stopped" can still deliver it. Fix: once `ended_at` is set, refuse `p_t_start_ms > (ended_at - started_at) ms + 5 s`.
- **F9 MINOR (executed) - a child enrolled mid-recording is recorded without consent until the lesson ends.** Probe: `MID-ENROL: missing consent count now: 1`, `switch still on: true`, `audio keeps registering: {"ok":...}`. The next arm is refused (good), but nothing reacts to the enrolment. Fix: an AFTER INSERT/UPDATE trigger on `enrollments` that calls `recorder__switch_off(class, 'switch_off_auto', ...)` when the new child has no current-version consent - same shape as the withdrawal path.
- **F10 MINOR (executed) - a lesson cancelled after arming keeps recording and completes; `stop_reason 'session_canceled'` exists but nothing sets it.** Probe: `CANCELLED: complete after the session was cancelled: {"ok":[]}`, evidence `[{"was_completed":true,"status":"Canceled"}]`. This is the very case the D guard exists for, so evidence must stay; but capture should be told to stop: a trigger on `sessions` status -> Canceled sets `stop_requested_at` on live recordings of that session (and abandons armed ones).
- **F11 MINOR (executed) - the recorder can forge attribution fields.** Probe: `SPOOF: owner writes deletion_requested_by=ADMIN directly: {"ok":[{"deletion_requested_by":"1111...","stop_reason":"admin"}]}`. The audit log still records the true actor, so this is cosmetic, but `deletion_requested_*`, `stop_reason='admin'`, `client_info`, `device_profile_id` (any profile id, including another user's) are client-writable while open. Fix: add them to the server-owned list in the update trigger (:697-705) and set them only from `recorder_request_deletion` / the trigger.
- **F12 MINOR (executed) - role oracle.** `recorder_is_class_teacher(p_user, p_class)` is granted to `authenticated` with arbitrary arguments; probe: `P9 parent calls recorder_is_class_teacher(T1,C1): {"ok":[{"v":true}]}`. A parent can map which login teaches which class. Fix: revoke from `authenticated` (policies call it via the DEFINER wrappers) or ignore `p_user` and use `auth.uid()`. Same for `recorder_can_read_class` - fine as is, it uses `auth.uid()`.
- **F13 MINOR (reasoning only - not executed) - a former teacher keeps reading recording rows, chunks and name-chip markers of a class forever** through `started_by = auth.uid()` (`class_recordings_read` :1279, `recorder_can_read_recording` :914). The audio itself is correctly cut off (`recorder_can_read_object` uses only `recorder_can_read_class`). Markers carry `student_id`s with timestamps. Fix: drop the `started_by` arm from the read helpers once the recording is not open.
- **F14 MINOR (reasoning only) - schema allows configurations the bucket refuses.** `sample_rate` up to 192 000 (:490) and `chunk_ms` up to 60 000 (:445) with `pcm-wav`: 96 kHz x 2 B x 60 s = 11.5 MB > the 8 MB `file_size_limit` (:1373). Such a chunk can never upload, never confirm, and the recording can never complete. Fix: CHECK on the recording/track that `sample_rate * 2 * chunk_ms / 1000 <= 8 MB` for pcm-wav, or cap sample_rate at 48 000.
- **F15 MINOR (reasoning only) - an admin's direct storage DELETE (policy :1473-1476) leaves `complete` rows pointing at missing files**, with nothing recording it in the audit log. Prefer: admins delete only via the retention function, which logs.

## Design soundness for C2 (brief, reasoning only)

- **Size/bandwidth re-derived:** Opus 128 kbit/s = 16 kB/s; x 5 400 s = 86.4 MB per track, 172.8 MB for two - matches. Full 105-min window x 2 = 201.6 MB - matches. 5 lessons/day x 30 days = 150 recordings x 0.2 GB = 30.2 GB - matches; FLAC 150 x 0.61-0.72 GB = 92-108 GB - matches. PCM 48 kHz 16-bit = 96 kB/s; 30 s = 2.88 MB, 60 s = 5.76 MB - matches. Uplink needed in real time: Opus 2 x 128 = 256 kbit/s, FLAC about 0.8-0.9 Mbit/s, WAV 1.54 Mbit/s - not stated in the doc; C2 should state it next to the school's measured uplink. 128 kbit/s mono Opus is generous for speech (48-64 kbit/s is transparent for voice) - halving it halves storage.
- **Clock claim overstated:** "frame n of teacher and frame n of room are the same instant ... aligned by construction" (arch 5.3) is true of the context's frame counter, not of the sound: each USB device has its own capture latency and buffer, so a fixed offset (often tens of ms) between the tracks remains, plus drift. The doc does list drift as [C2-measure]; it should also list the initial offset and the tap test should measure it.
- **The manifest and chunk times are client claims** (F1). C2's edge function is the place to make them server facts (hash the stored object, read its duration, write both server-side).
- **Stolen laptop / IndexedDB:** plain children's audio at rest until uploaded, with no local TTL. A recording that the server abandons (14-day stale sweep) or deletes is never told to the laptop, so its local copy can outlive server retention indefinitely. C2 needs: on page open, ask the server for the status of every local recording and drop local bytes for `abandoned`/`deleted`/`complete`; and a hard local TTL equal to `retention_days`.
- **Per-child withdrawal on a room recording:** switching the class off is right, but past recordings that contain the child stay for up to 30 days (180 if an admin extends) unless an admin requests each (arch Q3 open). Recommend `recorder_record_child_consent('withdrawn')` also calls `recorder_request_deletion` for every non-deleted recording of every class the child was enrolled in on `session_date`, in the same transaction - logged.

## Must fix before C2 builds on it

1. F1 - make `was_completed` / audio length server facts (span bound to server clock, minimum duration, per-track contiguity, drop or rename `confirmed_audio_ms`), before D's cancellation guard reads them.
2. F2 - split record vs listen; no future-session read; past cover reads only its own session's recording. Tests for both.
3. F3 - compare per-child `wording_version` with the current one in both counting places.
4. F4 - client cannot null `session_id`.
5. F5 - enforce pre-roll/grace on the server (start and chunk position), not only in the page.
6. F6 - `SET row_security = off` on every DEFINER function that reads `storage.objects`; re-check storage in the DELETE trigger; a suite case with a NOBYPASSRLS owner.
7. F7 - add the missing cases (inactive teacher, cover teacher, both F-holes above) so each fix is pinned.
8. F8-F10 should land in the same migration (they are small and touch the same triggers).

## Checked and found sound

- No family, student, TA, other-teacher or anon access to any recorder row or file in the steady state (suite cases :352-355 plus the mutation run proves they bite); bucket private; no family policy on audio; no storage UPDATE policy (no overwrite); no unscoped `storage.objects` policy in any migration (scripted scan of every `CREATE POLICY ... ON storage.objects` without `bucket_id`: none), so nothing ORs the recorder bucket open.
- `recorder_is_class_teacher` excludes both TA tiers of the current `is_teacher_of_class` (20261111110000:97-117) and parses `teacherId` safely (`t.id::text = lower(...)`, no cast error). Its session tier matches the current definition exactly - which is the problem in F2, not a drift.
- Arming fails closed for: no switch row, switch off, no confirmation, old class wording, any enrolled child without `granted`, cancelled session, no session, session of another class (class taken from the session, client value overwritten), ended lesson, no signed-in user (service role refused). Switch-off/withdrawal vs arm race is serialised by `FOR SHARE` on the switch row (:598-599) against the UPDATE in `recorder__switch_off`. Only `session_status` values are Scheduled/Held/Canceled (20251012020423), so `<> 'Canceled'` is complete.
- State machine: no skipped states, `complete`/`abandoned`/`deleted` cannot go back (mutations and suite), class/session/owner/window immutable, stop request sticky, server-owned timestamps overwritten.
- Audit log: UPDATE/DELETE/TRUNCATE refused for admin, service role and the superuser owner (suite :406-415; truncate mutation caught). Writer function not executable by `authenticated`.
- SECURITY DEFINER helpers: all pin `search_path = public` and schema-qualify every relation (so a caller's `pg_temp` table cannot shadow one); all are NULL-safe for a caller with no uid; error messages do not distinguish "not yours" from "does not exist" for recordings/chunks.
- Upload path: only the exact DB-chosen path of a registered, unconfirmed chunk, or the manifest while `uploading`; strict regex parse (`recorder_path_parts`) returns "no" instead of erroring.
- Grants: explicit per table, nothing to anon/PUBLIC, `service_role` explicit. The only partial unique index (`class_recordings_one_live_per_session`) is not used as an ON CONFLICT target; both upserts target plain UNIQUE constraints.
- Paste twice: suite asserts it (`and applies a second time unchanged`) and it passed in the critic's run.

## Not checked

- Whether the role that will paste the migration on production bypasses RLS on `storage.objects` (decides whether F6 bites today) - no live database by rule.
- Production column names/types of `enrollments`, `sessions`, `classes.schedule_template` against the suite's stand-ins (only `teachers.is_active` and the `session_status` enum were checked in the migration tree). A missing column makes the paste fail and roll back (fail closed), not mis-behave.
- Supabase Storage API behaviour (upsert header, whether upload needs SELECT as well as INSERT, how `metadata.size` is set) - pglite has only a stand-in `storage.objects`.
- Concurrency beyond reading the lock order; no multi-connection probe.
- Workstream D's cancellation guard (20261112090000/091000) does not yet reference `recorder_session_evidence`; how it will weigh `was_completed` was not reviewed.
- Browser claims marked [C2-measure] in the architecture (two simultaneous USB captures, AudioContext without gesture, drift) - nothing to execute yet.
