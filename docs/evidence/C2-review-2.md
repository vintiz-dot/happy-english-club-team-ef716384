VERDICT: FAIL (three small blockers; see "Verdict" at the end)

# C2 review 2 - independent re-review of the capture engine revision

Reviewed commit: d449acc (`worktree-agent-a4803c8e10a251526`), compared with `claude/hec-conductor-setup-efbaa5` (merge base d0d18b7).

Where the work happened: my session's working directory was the conductor's own worktree, on its branch. Detaching it would have moved the conductor's checkout, so the code under review was checked out in a separate detached worktree, `.claude/worktrees/c2r2` (at d449acc), and this file is committed on `claude/hec-conductor-setup-efbaa5` (as T1 review 2 was). The first "start" commit of this file was made in c2r2 before a hook refused cross-worktree writes; it is 48fd6f6 on a detached HEAD and can be ignored.

Review only: no product code changed, nothing deployed, pushed or applied to any database. No real audio was read: every probe uses the unit suite's synthetic sine + noise source.

**Where I am / next step:** sections 1-4 and 7 written. Next: section 5 (suite results) and 6 (mutations) when the runs finish, then the verdict.

How the probes were run: a throwaway `probe.mjs` in my scratchpad (outside the repo, not committed) = the unit suite's own harness (`world`, `FakeSource`, `recorder`, `started`, the contract-enforcing fake server; `scripts/recorder/unit.test.mjs` lines 14-33, 295-401, 773-787, copied verbatim) + 14 scenarios of mine, against the unmodified engine at d449acc. "P n" below is a probe; its printed result is quoted. File:line is `src/lib/recorder/` at d449acc unless another path is given.

## 1. B1-B4 and M1-M7: fixed, or made to pass the test?

Short answer: every one of the eleven is genuinely changed in the engine, none is special-cased for its test. B2 and B4 hold against new scenarios. B1 and B3 each leave a path the author's cases do not reach; B3's is a blocker.

### B1 dead AudioContext - FIXED for the first death; one gap
Real fix: `controller.ts:691-707` (watchdog on the monotonic clock, fed by PCM batches at :1003, not by ticks), :709-720 (`stalled` state, loud error), :722-737 (resume, then re-make), :740-749 (gap into manifest + marker), `audioGraph.ts:34` (statechange), `captureSource.ts:139-154` (rebuild with `frameBase`). The state can no longer be `recording` while no batch arrives for 3 s.

New scenario the author did not cover - **P1, a second dead context in the same lesson is never re-made**: `a.rebuilt = true` (:729) is set on the first re-make and never cleared (not in `leaveStall`, :740). First death at 8 s healed by a re-make; second death (which a re-make WOULD heal): `after second death, 120 s later: state stalled rebuilds 1 resumes 60`. The state is truthful (`stalled`, NOT RECORDING), so this is not a false "recording", but the rest of the lesson is lost unless the teacher reloads, and the message still says "Trying to restart it". MAJOR (N-M1). Fix: clear `rebuilt` in `leaveStall` and rate-limit re-makes (one per 30 s) instead of one per lesson.

Also noted (minor): `captureSource.ts:83` forwards the OLD graph's batches with no `this.g === g` guard (the state handler at :85 has one), and `chunker.push` ignores `absFrame` except against t0 (`chunker.ts:66-70`), so an old context that wakes during the hand-over would have its batches appended as extra audio. Narrow (the old context is closed a few lines later).

A consequence that is not a loss but must be known - **P13**: a stall does not pad the timeline (audio time falls behind the server clock by the gap). The server calls a chunk `late` when it is registered more than `late_after_ms` (10 min) after `started_at + t_end_ms` (`supabase/migrations/20261112100000_class_recorder.sql:1570-1574`). After one 12-minute stall: `teacher chunks late flags by seq: 0:ok 1:ok 2:LATE 3:LATE ... 8:LATE` - every chunk for the REST of the lesson is "uploaded too late to count" although it was captured and sent live. MAJOR (N-M2), evidence only: either pad the gap with silence on `leaveStall` (it compresses to below-floor chunks) or let the client state the summed gap so the server can judge lateness against it. A decision for C1 / the conductor.

### B2 clock jump - FIXED
`controller.ts:222-225` (`serverNow` on `perfNow`), :673-688, :1470-1489. I could not make a wall-clock jump end or shift a lesson. `Date.now()` is left only in labels.

New scenario - **P8, a slow answer to the clock measurement**: `measureClock` (:1470-1483) takes the server time to be at the request's midpoint and accepts ANY round-trip time. The server answered at once, the answer took 40 s to arrive: `serverNow - true (ms) -20000`. That error then feeds B3's `lead = S - firstSendServer` (:900): the next, perfectly fast start reported `start_delayed: The server started the recording 20 s after it was asked: those 20 s ... are not part of the recording` and threw away 20 s of real audio the server would have accepted. The re-measure runs every 10 minutes (:634), and a slow network is exactly when both happen together. With the error the other way (estimate ahead) no re-anchor happens when one is needed, and the first review's B3 failure (chunks "ahead of the server's clock", tail refused "after Stop") comes back. MAJOR (N-M3). Fix: keep a measurement only when `rttMs < 2000` (else keep the previous one and retry in a minute); prefer the smallest RTT seen.

### B3 slow start - PARTLY FIXED; what remains is a BLOCKER
What is fixed: nothing is dropped without an event any more; the Start has a timeout, is off the control queue, is retried, and the row is read back (:860-893). A start STAMPED on time but answered late keeps its audio sample-exact.

The question asked: *a server stamp more than 5 s late moves t = 0 - is captured audio discarded, and is the teacher told?* **Yes, it is discarded**: `adoptStart` (:904-912) moves t0 forward by the lead, `chunker.push` drops every frame before t0 (`chunker.ts:68`), and the held batches are released (:931-933). It is not stored anywhere, not even locally. **The teacher is told only when the answer finally arrives** (`start_delayed`, :911, plus a `pre_start_trimmed` manifest entry). Until then the engine says the opposite. P2a, network down for the first 10 minutes of the capture window, then back:
```
after 10 min offline: state starting | errors {"offline":72,"server_unavailable":15}
  'The server has not confirmed the start yet: the audio is kept and the start is tried again'
local chunks 0 segments 0 pre frames held (s) 120 preDropped (s) 480
back online: 'start_delayed: The server started the recording 600 s after it was asked: those 600 s
  before its start are not part of the recording; everything after is'
server status complete, teacher audio on server (s) 60 of played (s) 660
```
For those 10 minutes the state is `starting`; the engine itself sets the tab title to "● RECORDING" for `starting` (:1591); the C3 screen shows the red pulsing dot and "Starting to record" (`DailyRecorder.tsx:30,199-200` on the conductor branch); both messages (:649, :889) say "the audio is kept". None of it is kept: the hold is a rolling 2 minutes in memory (:1015-1016), and whatever it holds is trimmed anyway once the lead exceeds 5 s. The hold only ever saves audio when the REQUEST arrived on time and the ANSWER was slow; a slow or absent request always costs everything before the server's stamp.

P2b, offline until the window closes (a whole lesson without internet): `state abandoned`, final message `The server did not start the recording ... The audio captured so far is kept on this laptop.` - **120 s of a 45-minute capture are kept**; `preDroppedFrames` (:118, :1016) is counted and never read, so the other 43 minutes go without a word. Also 519 `clock_unknown` + 149 `server_unavailable` + 124 `offline` error events for C3 to de-duplicate.

This is the review's one question answered "yes": lesson audio is lost while the page shows a recording indicator and says the audio is kept. **BLOCKER N-B1.** Smallest honest fix (client only): (1) `starting` is never titled or drawn as RECORDING - title "◌ WAITING FOR THE SERVER", and after 5 s unanswered a loud error "NOT RECORDING YET: the school server has not started this recording; nothing said before it answers is kept"; (2) correct the two "the audio is kept" messages; (3) `startFailed` states how much was held and how much was let go. The real fix needs the owner's decision and a server change: write the held audio to IndexedDB and let Start carry a client start time the server accepts back to `capture_opens_at` (flagged, not evidence) - otherwise a Wi-Fi outage at the bell always costs the start of the lesson.

Second remaining path - **P3, BLOCKER N-B2: B4's rule was applied to Stop and not to Start.** `sendStart` treats every error that is not offline / 5xx / JWT / `too_early` as final (:883, :892). One answer `{message: "Too Many Requests", code: "429"}` to the Start: `state error | errors start_failed/unknown | source open false | server armed`, and 100 s later still `error`: the microphones are closed, the local phase is `abandoned`, nothing retries, the server row stays `armed`. PostgREST's "no rows" (PGRST116, e.g. the session was briefly anonymous), a 409, a 429 or any unclassified text all land here. It is loud, but one transient non-5xx answer at the bell costs the whole lesson, and the C3 screen never re-arms from `error`. Fix: as in `sendStop` - only a refusal the server STATED is final (`window_closed`, `switch_off`, `consent_missing`, `session_canceled`, `not_teacher`, `no_longer_teaching`, `already_live`, `recording_closed`); everything else retries until the window closes.

### B4 Stop failure - FIXED
`controller.ts:456-493`, `errors.ts` `looksUnavailable`. New scenario - P12, the Stop LANDS, its answer is lost (503) and the next two read-backs fail too: `server complete | engine complete | local purged | errors {"server_unavailable":1,"stop_pending":1}`. The read-back-before-refusal order at :474-479 is right. Nothing found. (Mutant E in section 6 shows whether a test protects that read-back.)

### M1 ownership - FIXED for new recordings; old ones orphaned
`controller.ts:607-608` and every caller. B's engine makes no call about A's recording. Two gaps:
- **P7, recordings stored by the previous engine have no `ownerUserId`**, and `isMine` (:607) is false for everyone: `recovered 0, othersPending {"recordings":1} | legacy complete row still stored true, its label ['Nguyen Van A read aloud'] | legacy unsent bytes still stored`. The laptop that recorded the real 68-minute class with the old engine holds exactly such rows (the old engine left the row, chunk rows, manifest and marker labels after `complete` - first review M2). Nobody can ever purge, resume or discard them, and unsent ones are reported to their own teacher as "another account's". MAJOR (N-M4). Fix: in `recover()`, for a row without an owner ask the server (`getRecording`; RLS answers only the recorder or a listener) and adopt it when the server knows it, else offer the typed Discard.
- `o.userId` is fixed at construction and never compared with the session the injected client actually has. If the app signs another teacher in without rebuilding the engine, B's new recording is stamped with A's id (`newLocal`, :799). The server boundary still holds (`started_by = auth.uid()`). C3 must dispose and re-create the engine on every auth change (section 7). Cheap engine guard: add `started_by` to `REC_COLUMNS` (`backend.ts:88`) and refuse in `arm()` when it differs. Minor.

Server side (read; the pgtest suites ran - section 5): upload = own open recording and the exact registered path only (`...class_recorder.sql:2104-2125`); UPDATE (start / stop / complete / abandon) = `started_by = auth.uid()` or admin (:1965-1970); chunks only through `recorder_register_chunk` / `_confirm_chunk`, which check `started_by` and `recorder__may_record`. A second teacher cannot upload into or stop another's recording. "Cannot see": a STANDING teacher of the same class and the session's own teacher can read the row and listen (`recorder_can_listen`, :278-290) - that is the design, not a leak; a teacher of another class cannot.

### M2 purge - FIXED for the clean case; a hole when a recording completes with refused chunks
`finalize` :1434-1441, `signOut` :565-575, `recover` :354-357 / :383-391.

**P5 - MAJOR (N-M5), privacy.** A track that ends in refused chunks (after Stop, after the window, a hole) still lets the recording `complete` (refused chunks without a `chunkId` are not "registered", :1408-1410). Then `purgeRecording(.., { allowUnconfirmed: false })` throws "unconfirmed audio would be lost" (`store.ts:84/198`) and the whole local copy stays; `heldAudio()` skips `phase === "complete"` (:547), so it is never reported, never `stuck`, and `signOut()` answers 0:
```
server complete, engine state complete
local after complete: recording row true, chunk rows ... teacher2:refused teacher3:refused teacher4:refused,
  bytes held 1978108, markers ['Nguyen Van A']
heldAudio() []      signOut() {"unsentRecordings":0,"unsentBytes":0} | bytes still held after sign-out 1978108
20 days later, next sign-in recover(): bytes held 1978108, stuck events 0
```
Children's audio and a name label sit in IndexedDB with no end date and no screen that can show them. Fix: after `complete`, delete confirmed bytes, markers and manifest regardless; keep the refused chunks' bytes but report the recording through `heldAudio()` (drop the `complete` skip when unconfirmed bytes exist) so the 14-day `stuck` rule and the typed Discard reach it.

The 14-day rule as built: REPORT only, on `recover()` (page load) only (:397-398); nothing is ever deleted without the typed DISCARD. That is the author's stated decision; the owner should confirm that unsent children's audio may stay on a shared classroom laptop indefinitely when nobody types the word.

### M3 quota, M4 late tab, M5 folder backup, M7 cron - FIXED
M3 `controller.ts:1086-1169` + `uploader.ts:163-174`; M4 :419-431; M5 :507-510 (`grep showDirectoryPicker|createWritable|showSaveFilePicker` over `src/lib/recorder`: none). M7: section 3. One scenario for M3 by trace, not run: a tab crash while chunks are parked in memory - `salvage` (:1207-1238) rebuilds only ONE chunk (`seq === next`) and deletes the segments of every other seq (:1234), so with k and k+1 parked and their 5-s segments safely stored, k+1 is thrown away. Needs quota trouble AND a crash; minor.

### M6 Worker - FIXED as measured; one unbounded wait
`encoderClient.ts`, `encodeWorker.ts`, `index.ts:118-121`. A worker that DIES (`onerror`) falls back inline and re-runs its pending jobs in order (:58-68) - by reading, and the author's case.

**P9 - MAJOR (N-M6): a worker that does not answer and raises no error** (no `messageerror` handler, no per-job timeout; `encoderClient.ts:71-83`). The chunk queue awaits the job (`controller.ts:1047`), and every later chunk AND every 5-second crash segment is queued behind it (`chain`, :1027, :1040):
```
2 min in: state recording | local chunks 0 segments 4 | server chunks 0 | errors {}
stop(): STILL PENDING after 1.5 s | state stopping | server recording
```
State `recording`, no error, nothing durable after the first 10 s, Stop hangs on `await this.io` (:1184), and a reload then loses everything since the hang. I cannot show a Chrome build that hangs a module worker this way, so this is a robustness hole, not a reproduced field failure - but it is the one place where a single promise with no timeout sits between the microphones and the disk. Fix: a 20 s per-job timeout in `workerEncoder` -> `fallBack(...)` (inline re-run), and `w.onmessageerror = fallBack`.

## 2. Field finding: the S500 ended at 54:51 and nothing re-acquired it

What is right (read + P10, P14 + the author's cases): `onTrackEnded` (:1251-1266) alerts at once and keeps the other track; three triggers (track `ended` `captureSource.ts:104`; `devicechange` :73 -> `controller.ts:1269-1280`; a `readyState` poll :1356-1363); re-acquire by exact id, then by normalised label, never the other track's device and never the default (:1283-1295); sought for the whole lesson (`deviceRetryMs: Infinity`, :191).
- P10: the label rule survives a move to another USB port (`"... (Anker PowerConf S500)"` vs `"... (2- Anker PowerConf S500)"` -> same; `"Microphone (2- USB Audio Device)"` vs `"(3- ...)"` -> same).
- P14, a loss at 17 s, re-acquire at 26 s, Stop at 39.3 s: both tracks decode sample-exact against the source (`decoded frames 1886208 expected 1886208 equal true`, chunks `10000,10000,10000,9296` ms on both). So: no duplicate or overlapping segment, no sample dropped or repeated at a chunk boundary or at the re-acquire, and the other track is untouched.
- A re-acquire while a chunk is uploading touches nothing the uploader reads (it works from stored chunks; `saveRec` merges, :1451-1466).
- Manifest: `device_lost` at the loss, `device_restored` with the wall gap, two `gap` markers.

What is wrong:
- **P4 - BLOCKER N-B3: with BOTH microphones lost the engine still says `recording`.** The worklet keeps delivering zero-filled batches for missing inputs (`worklet.ts:46-47`), so the watchdog never fires; `deviceRetryMs` is Infinity, so no track is ever closed and the old "both closed -> stop" (:1318) is unreachable. `3 min with no microphone at all: state recording | errors {"device_unplugged":2,"mic_silent":4,"device_lost":2} | chunks still being produced and sent: 38 confirmed 38 belowFloor 34`. Both devices are USB; a hub or a USB controller power-save takes both at once. Errors are raised, but the state, the tab title ("● RECORDING") and the red dot all say recording while nothing is recorded - exactly what this review was asked to rule out. Fix (a few lines): when every track is in `lostSince`, `setState("stalled")` with a `capture_stalled` error ("NOT RECORDING: both microphones are gone"), and back to `recording` on the first `device_restored`.
- **P11 - MAJOR (N-M7): a re-open that never answers ends the search.** `a.reopening[role]` (:1328) is cleared only in `.finally` (:1351); `getUserMedia` has no timeout (`capture.ts`, `openInput`). A hung call (a device half-enumerated after a re-plug is a known way to get one): `3 min after the device is back: restored? false | reopening flag {"room":true}` - and `checkTracksLive` skips a role that is "reopening" (:1360). The search for the S500 silently stops for the rest of the lesson: the field finding again, by another road. Fix: race `reacquire` against a 10 s timeout and clear the flag.
- **P6 - MAJOR (N-M8): the silent-microphone and clipping warnings do not survive into the next lesson on the same engine.** One `HealthMonitor` lives as long as the engine (`controller.ts:204`), and a new capture resets only the swap measurement (:844 -> `health.ts:75`). `flatReported`, `dead`, `silenceReported` (`health.ts:57-59`) stay set, and `lastClipReport` (`health.ts:61`) holds the previous lesson's time while `tMs` restarts at 0 (:88). Lesson 1 ends with the room mic dead and the lapel clipping; lesson 2 starts with the same faults: `lesson 2 (first 64 s ...) events: []` - no `flat`, no `dead_mic`, no `clipping`, so no `mic_silent` and no `clipping` error (:984-993) until the fault clears and comes back (clipping: until lesson 2 has run longer than lesson 1). The engine is built for a day of back-to-back lessons (`arm(..., { stopAt })`). Fix: a full reset of the monitor in `beginCapture`.
- Minor: the `device_lost` health event now has two meanings (still looking at 60 s, :1306; closed, :1315) that C3 can tell apart only by the error text; the `flat` -> `mic_silent` error is raised once per silence, so C3 must hold it until `recovered`.

Clipping warning (field 6): `health.ts:34` (>= 0.999), `controller.ts:984-1000`. `level.clipping` works (meter, 2 s hold). The `clipping` ERROR is throttled to one per 30 s per track and depends on the health event, hence N-M8. Fine otherwise.

## 3. Privacy and access

- Ownership (M1) and purge (M2): section 1 - N-M4 (ownerless legacy rows), N-M5 (complete-with-refused keeps audio and a name, invisibly), the report-only 14-day rule.
- Logs and error reports: one `console` call in the engine, `events.ts:53`, printing a listener's own exception. `RecorderError.detail` carries device labels, counts, server texts; never samples, never marker labels. `recorder-retention/index.ts:176-179` logs ids and counts. This engine makes no transcript.
- Writes outside the bucket: `backend.ts:18` is the only bucket name; uploads go to the path the server chose (`uploader.ts:215`) or `manifestPath` (`controller.ts:1425`). No File System Access, no download link, no `sendBeacon`, no `fetch` in `src/lib/recorder`. `localStorage`: the device profile (device ids + labels) and the install id (`devices.ts:150-180`). IndexedDB `hec-recorder`: audio, 5-s raw PCM segments, markers (labels), manifest - the M2 surface.
- Family access: none. Policies exist only for admin / teacher paths (`...class_recorder.sql:1950-2015`, storage :2158-2166); `recorder_is_class_teacher` (:179-204) reads `classes.default_teacher_id` and the weekly slots' teachers - no TA, no parent, no student. Bucket SELECT = `recorder_can_listen` and not `deleted`.
- Service role: none in the browser code (grep). Used only by `recorder-retention`, to delete objects no caller may delete under RLS (the bucket has no DELETE policy). It never downloads audio.
- **The cron migration, line by line** (`supabase/migrations/20261112101000_recorder_retention_cron.sql`, 79 lines):
  - It is ALREADY under `supabase/migrations/` (`git diff d0d18b7 d449acc -- drizzle` is empty) and its test reads that file. Nothing to port; the owner still has to PASTE it (after 20261112100000) and the function has to be deployed.
  - :35-38 feature tests by `to_regprocedure` / `to_regclass`; :40-43 no pg_cron -> NOTICE, nothing scheduled, nothing fails.
  - :46, :72 `cron.unschedule` by name inside its own exception block, then schedule: idempotent, re-pasting is safe.
  - :48-65 nightly 20:00 UTC `net.http_post` to this project's `recorder-retention`. The `apikey` / `Authorization` value is the project's public ANON key, the same string already committed in `20261110160000` (checked) - not a secret. The real gate, `x-schedule-runner-secret`, is `(select token from public.schedule_runner where id = 1)` evaluated when the job RUNS: the secret is not in the migration, the job text or `cron.job`.
  - Fails closed: no row / NULL token -> a JSON null header -> `runnerTokenMatches` is false -> the admin gate -> 401/403 (`recorder-retention/index.ts:50-56, 162-169`); function not deployed -> 404, nothing deleted; pg_net or the runner table missing -> NOTICE, not scheduled (:66-69).
  - :74 hourly `select public.recorder_expire_stale()`: pure SQL, runs as the job owner; EXECUTE is revoked from `authenticated` (recorder migration :1719-1720). It abandons only rows whose `scheduled_end` is more than `stale_upload_days` old.
  - Two remarks, neither blocking: the project URL is hard-coded (house pattern; a branch database would call production's function, which refuses a token that is not its own); `timeout_milliseconds := 300000` is above the function's own 100 s budget, fine.
  - What cannot be proven locally: that the gateway accepts the anon key and that the function is deployed - the author's post-apply check 18 covers it.

## 4. The Worker FLAC encoder across boundaries

- Each chunk is a complete, self-contained FLAC file (`encoders.ts:27` -> `encodeFlac`), so there is no encoder state to carry across a boundary; continuity is the chunker's job. `chunker.ts:72-93`: `take = min(F - fill, left)`; chunk k is frames [kF, (k+1)F) of both tracks; `emit` copies (`slice`), so reusing the buffer cannot alias. P14 proves it end to end through the fake server and an independent decoder: sample-exact across three full-chunk boundaries, a device loss + re-acquire, and the final partial chunk.
- At Stop: `endCapture` (:1175-1184) sets `capturing = false` first, so batches still in the page's message queue and the worklet's partial batch (< 2048 frames = 43 ms) are not kept: up to ~43 ms plus main-thread latency of tail audio at the moment of Stop. Not material. In the fake (no queue) the tail loss is 0 frames.
- At a context re-make: the old worklet's partial batch (<= 43 ms) is lost and the frame count continues (`frameBase`); it falls inside the stall's own gap.
- Order with the Worker: jobs are posted in cut order and awaited in that order on one queue (`controller.ts:1035-1050`), so a late answer cannot reorder chunks. Samples are structured-cloned to the worker (not transferred), so the page still holds them if the worker dies.
- If the Worker dies: `onerror` -> inline re-run of pending jobs, a once-only notice (`index.ts:137`, code `internal`; C3's default view for `internal` says "Reload the page", the wrong advice mid-lesson - section 7). If it HANGS: N-M6.

## 7. What C3 must change (`src/components/recorder/**`, `src/pages/TeacherRecorder.tsx`, and `src/lib/recorderUi.ts`)

Read at `claude/hec-conductor-setup-efbaa5`; line numbers are that branch's.

1. **`stalled` is a capturing state.** `DailyRecorder.tsx:30` `CAPTURING = ["starting", "recording"]`: on `stalled` the bottom bar and its Stop button (:190-208) disappear, `active` goes false (:93), so `TeacherRecorder.tsx:46` lets the teacher open the setup wizard, which unmounts the recorder and `dispose()`s it mid-lesson (:92). Add `stalled` to the capturing set and draw it differently: no red dot, "NOT RECORDING - restarting the audio", `role="alert"`.
2. **`starting` must not look like recording** (N-B1): no pulsing red dot at :199-200; "Waiting for the school server - not recording yet", an alert after 5 s.
3. **`error` state**: a screen for it ("This lesson is not being recorded" + the `start_failed` text + what is kept). The arm effect (:156) re-arms only from `ready | complete | abandoned`; decide whether `error` may re-arm.
4. **Tab title**: the regexes at :88-89 know `● RECORDING|◌ ARMED` only; add `⚠ NOT RECORDING`, or that prefix stays in the title after unmount.
5. **`errorView` (`recorderUi.ts:227-265`) has no case for the new codes**: `clipping`, `mic_silent`, `capture_stalled`, `server_unavailable`, `start_delayed`, `start_failed`, `stop_pending`, `local_store_failed`, `not_durable` all fall to the default "Something went wrong - Reload the page" with a Reload button. Reloading mid-lesson ends the recording as `crash_recovered`. Add a view per code; the default must not offer Reload while capturing.
6. **One error slot** (`setError`, :96-101): a `clipping` warning (every 30 s) replaces a standing `device_unplugged` / `capture_stalled`. Keep errors by code with a priority (stalled > device > mic_silent > start/stop > clipping) and de-duplicate: a long outage emits hundreds of `offline` / `server_unavailable` / `clock_unknown`.
7. **`device_lost` now means "gone 60 s, still looking"**: :115 moves the track from `unplugged` to `lost`, and :270 / `recorderUi.ts:240-241` then say "Gone for this lesson" / "did not come back". Reword to "still looking - plug it back in", and make `device_restored` (:114) clear `lost` too (today it clears only `unplugged`, so a microphone that returns after a minute shows as gone, with a dead meter at :308-309, for the rest of the lesson).
8. **Clipping**: read `level.clipping` (:108 drops it) and show it on the meter; show the `clipping` error as a warning that clears itself.
9. **`mic_silent`**: a standing banner per track from the error until health `recovered` for that track (the engine raises it once per silence: `flat` at 2 s, `dead_mic` at 10 s, `silence` at 30 s).
10. **`stuck` and `recovered.othersPending`**: no handler today (:103-124). Show "audio from <date> has not reached the server for N days" with the typed-DISCARD action (`discardLocal`), and "another teacher has unsent audio on this laptop".
11. **Sign-out**: `Layout.tsx` calls `signOut` directly (:149, :225, ...). Call `rec.signOut()` first, warn when `unsentRecordings > 0`, refuse while capturing. Dispose and re-create the engine whenever the signed-in user changes (M1).
12. **`RecorderLike`** (`engine.ts:22`) must also pick `signOut`, `othersPending`, `heldAudio`, `durable`, `discardLocal`, `current`. `not_durable` / `rec.durable === false`: say so before "Ready for today" and do not arm.
13. **Upload line**: show `stopPending` ("not stopped on the server yet"), `stopRefused`, `heldInMemory` ("keep this page open"), `belowFloor`.
14. Do not offer the folder backup (`enableLocalBackup` is a no-op). `clock.jumpMs`: informational only.
