VERDICT: FAIL

# C2 review - capture core

Where I am / next step: DONE. Nothing but this file was changed. The fixes below are small (B1-B4 are each a few lines to a few dozen); with them in and re-tested this is a PASS WITH CHANGES, not a redesign.

Reviewed at `05c5184` (claude/hec-conductor-setup-efbaa5), fresh context. Baseline re-run here: `node scripts/recorder/unit.test.mjs` 195 passed / 0 failed (the ffmpeg check ran: ffmpeg 8.1.2 is installed). Probes lived in `.probe/` in this worktree and were removed afterwards; they reuse the unit suite's own harness (`world`, `FakeSource`, `recorder`, the contract-enforcing fake server), so "server" below means that fake, and the SQL was read from `supabase/migrations/20261112100000_class_recorder.sql`. The browser suite (49 assertions, Playwright + Chromium) was NOT re-run here; it was read.

Why FAIL: the brief's rule is "any path that loses audio silently". Three were reproduced (B1, B2, B3). No privileged key is used in the browser and no teacher can upload or read another teacher's audio through the server; those two FAIL conditions are not met.

Counts: 4 BLOCKER, 8 MAJOR, 9 MINOR.

## BLOCKER (all four before any lesson with real children)

**B1. A dead AudioContext is silent: the page says RECORDING and captures nothing.**
`src/lib/recorder/controller.ts:415-445` (`tick()`), `audioGraph.ts` (no `statechange` listener; `lastTickAt` at :23 is written and never read).
Evidence (probe P4): capture started, 25 s played, then no PCM batch and no audio tick for 10 minutes while `tick()` ran every second -> `state = recording`, 0 new errors, 0 new health events. Every health check (`health.ts`) is driven by batches, so no batches means no checks. Real causes: the context left `suspended`/`interrupted` after sleep or lid close, the Windows audio service restarting, a worklet failure, the no-gesture context being suspended again.
Fix: in `tick()` (the 1 s interval keeps running), while `a.capturing`: if `perfNow() - lastAudioTickPerf > 3000`, emit `RecorderError("audio_context_suspended", ...)` + a health event `capture_stalled`, try `source.resume()`, and if still not running re-make the context exactly as `openTracks` already does (captureSource.ts:82-94), re-attaching both streams; write a `gap` marker with the wall gap when ticks return. Add `ctx.onstatechange` -> same path. Test: FakeSource stops delivering; assert the error within 5 s and the gap marker.

**B2. A forward jump of the laptop clock ends the lesson, as `scheduled_end`, with no error.**
`controller.ts:131` (`serverNow() = Date.now() + offset`), :420 (offset re-measured asynchronously) vs :428 (stop decided in the same tick with the stale offset).
Evidence (probe P5): laptop clock +3 h with the server clock unchanged, 30 s into a 90-minute lesson -> next tick `endCapture("scheduled_end")` -> server `complete`. An old classroom laptop that boots with a wrong clock and is corrected by Windows time sync mid-lesson does exactly this; a backward correction instead delays the stop past the window.
Fix: make `serverNow()` monotonic: at each `measureClock()` store `serverAtMeasure` and `perfAtMeasure`, return `serverAtMeasure + (perfNow() - perfAtMeasure)`. `Date.now()` then only labels things. Also: before a scheduled stop, if `|Date.now() - expected| > 5 s` since the last tick, re-measure first and decide after. Test: P5 as a unit case, both directions.

**B3. Chunks cut while the start request is in flight are dropped without a word, and the rest of the recording cannot complete.**
`controller.ts:592` (`onRawChunk` returns when `!startedAtServer`), :585 (`onSegment` the same), :516 (t0 = frame at SEND) vs the server stamping `started_at` at ARRIVAL.
Evidence (probe P1, run three times, same result twice; in the first run the probe played its audio before the engine had opened the microphones - the probe's own 50 ms wait lost a race on a loaded machine - so the start was not in flight and nothing was dropped; that is my reading of it, not something I isolated): start held 25 s with 10 s chunks -> chunks 0 and 1 never stored, no error event for them; server rows are seq 2,3,4; because the whole timeline now sits 25 s ahead of the server, chunks are delayed by `ahead_of_server_clock` retries and the last two are refused `after_stop`; recording stuck in `uploading`. supabase-js has no request timeout, so a stalled connection at the start of a lesson is enough. In production (30 s chunks) it needs a start slower than 30 s to drop a chunk, and slower than 15 s (clock tolerance) to shift the timeline into refusals.
Fix (smallest): when the start answer arrives more than 5 s after it was sent, re-anchor: `chunker.reset(); chunker.setT0(source.lastFrame)` before setting `startedAtServer`, and emit an error saying how many seconds of pre-roll were not kept. Add an `AbortController` timeout (10 s) to the start call so it retries from `tick()` instead of hanging. Never `return` silently in `onRawChunk`/`onSegment`: emit an error. Test: P1.

**B4. One failed Stop call is permanent: the lesson never becomes `complete`, and after the first error nothing says so.**
`controller.ts:296` (`if (rec.stopPending && !rec.stopRefused)`), :318-320 (`else if (!err.retryable) rec.stopRefused = err.message`), `errors.ts:122-126` (everything that is not "offline" or one of three refusals is non-retryable).
Evidence (probe P6): the Stop UPDATE answered once with `{message: "upstream request timeout", code: "503"}`, and separately with `JWT expired`; the server was healthy from then on. Result after 10 more minutes of ticks AND after a reload + `recover()`: server row still `recording`, `ended_at` null, all 6 chunks confirmed, page state `uploading`, `stopRefused` set, exactly one error event ever emitted (`server_refused/unknown`, resp. `not_signed_in`). The row then sits until `recorder_expire_stale` abandons it after 14 days. The audio is on the server, so this is not audio loss - it is a lost lesson record caused by any transient 5xx, gateway timeout or token refresh at the one moment Stop is sent.
The same field is how another teacher's session damages a recording (M1).
Fix: only a refusal the server actually stated is permanent. Set `stopRefused` only when `err.refusal` is one of `window_closed | recording_closed | not_your_recording | no_longer_teaching`; everything else (unknown refusal, `not_signed_in`, 5xx) retries with backoff and keeps a visible "not stopped on the server yet" state. Clear `stopRefused` on `recover()`. Test: P6 both variants must end `complete`.

## MAJOR

**M1. The local queue is not owned by anyone: teacher B's session works on teacher A's recordings.** (privacy / cross-teacher)
`controller.ts:40` declares `userId` and nothing reads it; `store.ts:118` one database `hec-recorder` per origin; `recover()` (:247-277) and `kickUploads()` (:451-455) take every recording in it.
Evidence (probe P2): A's tab dies mid-lesson with chunks queued; B signs in on the same browser and the page calls `recover()`. B's engine returns A's recording id, salvages and re-encodes A's audio, tries Stop / markers / register as B. The server refuses all of it (`Not your recording`, `recorder_register_chunk` checks `started_by = auth.uid()`; storage insert policy the same) - **0 objects uploaded by B**, so the server boundary holds. But: B's UI receives A's recording id and errors; A's 3.4 MB of queued audio and A's marker label are readable through B's engine; B's failed Stop wrote `stopRefused` into A's record, and when A came back every chunk confirmed but the row stayed `recording` with no error (B4). `discardLocal` on A's recording was refused only because its phase was not `abandoned`; for an abandoned one B could discard A's unsent audio.
Fix: add `ownerUserId` to `LocalRecording` (set in `newLocal`), and make `recover`, `kickUploads`, `arm`'s local lookup, `discardLocal`, `uploadProgress` skip anything whose owner is not `o.userId`. Expose `othersPending(): {count, bytes}` so C3 can say "another teacher has unsent audio on this laptop - they must sign in to send it". Never delete another owner's unconfirmed audio on sign-out (that would be data loss); see M2 for the age cap.
Must land before real children if more than one teacher will ever sign in on that laptop/browser profile; for a first supervised lesson on a single-teacher browser profile it can follow, with that restriction written in the runbook.

**M2. Children's audio and labels stay in IndexedDB with no end date.**
`controller.ts:827` deletes only confirmed bytes, only on `complete`; `purgeRecording` is called only from the typed Discard (:370).
Evidence (probe P8): after `complete`: audio bytes 0, but the recording row, 6 chunk rows, the manifest and the marker label ("Nguyen Van A read aloud") remain. For `abandoned` recordings, refused chunks and anything stuck (B4, M3, M4) the AUDIO itself stays until someone types DISCARD - on a shared classroom laptop, unencrypted, readable by anyone using that Windows profile's browser.
Fix: after `complete` call `purgeRecording(id, {allowUnconfirmed:false})` (keep at most id + status for the UI list). On `recover()`, list recordings older than N days (suggest the server's `stale_upload_days`, 14) that still hold audio and emit an event so C3 shows them; purge those the server reports `deleted`. Sign-out: C3 should warn when unsent audio exists, not purge.

**M3. A quota failure drops a chunk after ~15 s of retries and leaves a hole the recording can never complete over.**
`controller.ts:629-638` (`storeChunk` throws after 6 attempts; `chain()` swallows it into an error event), `uploader.ts:136` (registers the next captured chunk whatever its number).
Evidence (probe P3): `addChunk` refused for teacher seq 1 -> `quota` error emitted (so not silent), chunk 1 gone from memory, server rows 0,2,3,4, recording stuck `uploading`, and the message shown is the misleading "chunks the server registered but did not confirm". The 5-s segments of the lost chunk were still in the store and nothing reads them (salvage runs only for phase `capturing`).
Fix: (a) the uploader must not register seq k+1 when seq k is missing locally: end the track at the hole (`refusedFromSeq = k`, reason `local_store_failed`) so the part before it completes; (b) on quota, first free space by deleting bytes of chunks the server has CONFIRMED (they are safe; this relaxes "only after complete" under pressure only), then retry; (c) keep the failed chunk in memory and keep retrying while memory allows. Arming already refuses under 2 GB free, which makes this unlikely on day one.

**M4. A tab reopened after the window sends Stop first, which abandons the row and blocks its own pending uploads.** See ruling 6(b). `controller.ts:296-326` runs before `uploader.run` at :329; `recorder_can_upload` (SQL :2030-2050) allows uploads only while the row is `recording`/`uploading`.

**M5. The optional folder backup writes plain audio outside every retention rule.**
`controller.ts:349-360, 951-963`. It is opt-in (needs a click and Chrome's folder picker), the handle is not persisted, it writes `{recordingId}/{track}/{seq}.flac` + `manifest.json` into whatever folder the teacher picks (Desktop, a synced OneDrive folder, a USB stick), never deletes anything, and a write failure is only a `backup` event. Nothing in the retention function or the app can ever remove those files.
Fix: C3 must not offer it for lessons with real children until the owner decides where such copies may live and who deletes them; if kept, write a README into the folder, and delete a recording's folder after `complete`.

**M6. FLAC is encoded on the main thread, both tracks back to back.**
`controller.ts:594` (`encodePcmChunk` inside the worklet-port message handler); `chunker.ts:91` emits teacher and room in the same call. See item 8 below. Besides jank, a block longer than 1 s makes `onAudioTick` (:399-409) see `wall - audio > 1000` on the delayed tick and write a FALSE `context_stall` discontinuity and `gap` marker (the author measured 1.79 s for one chunk under load; two run consecutively).

**M7. Retention has no schedule.** See item 5 below.

**M8. Five guards have no test that can fail** (mutation run, item 7): the read-back checksum compare, the manifest read-back compare, the server's `late` flag, the typed word for Discard, and registration in seq order. The first is the only thing that proves stored audio is the recorded audio (the server compares the hash the page reports, not the object). Add one case each; the fake server already has `corruptDownload()`.

## MINOR

- m1. `index.ts:101-103`: if IndexedDB cannot be opened the engine silently uses `MemoryStore` - no crash safety and nobody is told. Emit an error / expose `durable: false`; C3 should refuse to arm.
- m2. `controller.ts:754-762`: after a microphone is reopened, the new read-back is stored in memory but no `constraints` event is emitted, no `constraint_not_honoured` error is raised, the track row's `applied_settings` is not updated, and the groupId is not re-checked against the other track.
- m3. `controller.ts:585`: segments cut before the start answer are not stored, so with a start slower than 5 s a crash in the first chunk salvages nothing (index 0 missing -> `salvage` stops at :694).
- m4. `controller.ts:630-637`: a non-quota store error ("already stored with different audio") is retried 6 times over 15 s although it can never succeed.
- m5. `controller.ts:570`: `performance.now()` used directly instead of `o.perfNow()`.
- m6. The bucket name is written in three code places (`backend.ts:18`, `recorder-retention/index.ts:30`, the test fake) plus the SQL; a test ties them, so drift fails, but it is not "one constant".
- m7. Every chunk is uploaded and then downloaded again for the read-back hash: the uplink need (0.75 Mbit/s for two FLAC tracks) is also a downlink need. Worth one line in the runbook.
- m8. `recorder-retention/index.ts:103`: no cap on recordings per run or on run time. A backlog (first run weeks after go-live: ~380 objects per lesson) can outlast the function limit; it is idempotent so the next night continues, but add `.slice(0, 25)` and a 100 s budget, and return `remaining`.
- m9. `uploader.ts:153-157`: a chunk refused by the LOCAL pre-check is marked refused without calling `onError` (only a `chunk` event), unlike a server refusal.

## Item by item

### 1. Data loss
Traced worklet -> `onBatch` (float to int16) -> `Chunker` -> `onRawChunk` (encode, sync) -> `chain(storeChunk)` (one IndexedDB transaction for meta + bytes, `durability: "strict"`) -> uploader register -> upload (`upsert:false`) -> download + SHA-256 + size compare -> `recorder_confirm_chunk` -> `confirmed`. Bytes are deleted in exactly one place, `controller.ts:827`, after the server row is `complete`, and `deleteConfirmedBytes` skips anything not `confirmed`. A refused chunk (window closed, after stop, below floor, conflicting, read-back mismatch) keeps its bytes, is marked `refused`, ends its track from that seq, and is reported (`chunk` event, `upload.refused`, and `error` for server refusals). That part is sound.
Not sound: B1, B2, B3 (silent), B4, M3, M4.
Crash between encode and persist: covered by 5-s segments written on the same serial queue; up to ~5 s lost by design. Two tabs: `navigator.locks` `hec-recorder-upload` with `ifAvailable`, the second tab's `prepare()`/`recover()` rejects with `another_tab` - correct by reading, **no test**. Reload during upload: states are persisted per step, "already exists" on upload counts as stored, register is idempotent on the server (same seq + same bytes -> same row). Clock: B2.
The crash-recovery tests: `unit.test.mjs` "reload mid-recording" uses `MemoryStore` and `dispose()` after `settle()`, so it never exercises a crash between encode and persist; it proves seq numbers 0,1,2 with the right time spans and "less than 5.2 s shorter", not that the salvaged samples equal the source. `browser.test.mjs` does a real `page.reload()` and `Page.crash` on real IndexedDB and checks contiguous seqs, no duplicate seq, <= 6.5 s lost - a real test of the path, again without comparing salvaged samples to what was captured. Mutant 05 below shows whether the unit one can fail.

### 2. Privacy
- At rest: M2. Cleared after confirmed upload: audio yes (on `complete`), metadata and labels no. On sign-out: nothing happens and the engine has no hook. Different teacher: M1 - cannot upload or read through the server; can read locally and can damage A's record.
- File System Access backup: M5.
- Console: one call in the whole engine, `events.ts:33`, logging a listener's own exception. No audio, names or tokens. `localStorage` holds the device profile (device ids, labels) and install id only.
- Service role in the browser: none. `grep` over `src/lib/recorder` for `service_role`, `createSignedUrl`, `getSession`, `access_token`: no hits. The client is injected; every call is the teacher's.
- Retention columns (`delete_after`, `deletion_requested*`, `audio_deleted*`): never written by the engine (no hits).

### 3. Correctness of capture
- One clock: both microphones are sources of one AudioContext feeding one worklet with two inputs; a batch carries the same 2048 frames of both. Chunk k is frames `[kF, (k+1)F)` for both tracks, positions are frame counts, `frameToMs` floors so consecutive chunks share a boundary. Sound, and `browser.test.mjs:126` compares Chrome's own decode of the stored FLAC with the samples the worklet delivered (0 differ over > 30 s).
- What "one clock" does not cover: each USB device has its own crystal; Chrome resamples each stream into the context and absorbs drift by dropping or repeating samples, invisibly. A 48 kHz S500 next to a 44.1 kHz lapel is handled by Chrome, not by this code; the per-device native rate is stored in `applied_settings`. Only the clap test on the real pair measures the result.
- Suspend/resume: a stall is noticed only when ticks come back (`onAudioTick`), the audio timeline is not padded (later audio sits earlier than wall time; the manifest's `discontinuities` and anchors record it). If ticks never come back: B1.
- Unplug/replug: zeros keep the timeline, reopen by exact id every 2 s for 60 s, then the track closes and the other continues; read-back after reopen is m2.
- Context re-made after the mics open: same sample rate requested, t0 is taken after the new graph exists, handlers are rewired. By reading, sound. Tested only on Chromium 145 with fake devices.
- FLAC encoder, read line by line against RFC 9639: sync code, fixed-blocksize bit, block-size codes (4096 -> 12, <= 256 -> 6 with 8-bit size, else 7 with 16-bit size), sample-rate codes incl. 13 (Hz in 16 bits), mono, 16-bit, UTF-8 frame number, CRC-8 (0x07) over the header, CRC-16 (0x8005) over the whole frame after byte alignment, CONSTANT / VERBATIM / FIXED 0-4 with warm-up samples, partitioned Rice with 4-bit parameters capped at 14, partition order limited so every partition is longer than the predictor order, last short block allowed, STREAMINFO min/max block size, 36-bit total samples, MD5 zero = unknown. No defect found.
- Independent decoder: the suite's ffmpeg check is real and ran here, but covers one 3-second sine. Probe P7 widened it: 11 signals (full-scale noise, alternating -32768/32767, silence, DC, 1 sample, 3 samples, exactly 4096, 4097, 4296, 30 s speech-like, +-2 LSB noise) x (fixed, verbatim, 44.1 kHz) = 33 files, **all decoded by ffmpeg to exactly the input**, ffprobe reports rate/mono/16-bit correctly. ffmpeg ignores FLAC CRCs by default (a flipped CRC decoded "fine"), so a second probe used `-err_detect crccheck+explode`: the good file passes with all samples, a flipped CRC-16 is reported ("CRC error"), a flipped header CRC-8 is reported ("header crc mismatch"). The CRCs are right.
- Constraints: `echoCancellation`, `noiseSuppression`, `autoGainControl` (and `voiceIsolation` where supported) requested `false` (`capture.ts:13-23`), read back after BOTH inputs are open (:87-90), a flag that is not exactly `false` or is not reported at all is listed, raised as `constraint_not_honoured`, stored on the track row and in the manifest. Honest. The S500's own firmware DSP cannot be read and is labelled as such.

### 4. The server contract
Matches: chunks are registered in seq order as soon as they are cut and before any upload of the track proceeds (`uploader.ts:124-143`); the server's `late` verdict is stored, and a chunk confirmed more than `late_after_ms` after it was cut is marked late locally too; the page stops itself 5 s before `capture_closes_at`; an `abandoned` answer to Stop is surfaced as `stopped_after_window` with the audio kept; retention fields never sent; bucket `class-recorder-audio`. Checksums: the page hashes what storage returns and compares hash and length before confirming; the server compares the hash the page reports with the registered one and the stored object's size. So content integrity rests on the page's read-back (as C1 5.5 says) - mutant 04 shows whether a test notices if that compare is removed.
Does not match in spirit: B3 (t0 at send vs `started_at` at arrival) and M4.

### 5. recorder-retention
- Gate: `verify_jwt = true` in `supabase/config.toml:258-259`. In the handler the only thing done before the gate is building the service client and reading the runner token to compare (constant-time); then `requireRole(..., ["admin"], {allowServiceRole:false})`. No recorder data is read before one of the two passes. Tests cover: no credentials 401, teacher 403, bare service key 403, wrong / near token 401, GET 405, token table unreadable 401.
- Deletes only what `recorder_retention_due` returns (`audio_deleted_at IS NULL`, status complete/abandoned, `delete_after <= now`), only under `{class_id}/{recording_id}/` rebuilt from the row and compared with the returned prefix, both UUID-checked; every listed name must start with that prefix. An admin's `recording_id` only narrows the due list, it cannot delete something not due.
- Rows: never deleted here; the row is marked `deleted` only after a second listing is empty, and the trigger refuses while an object is visible. Remove fails / lies / list fails -> skipped, tested.
- Logs: ids and counts; skip reasons go to the admin's response, not the log.
- Idempotent: yes (second run finds nothing; a half-removed prefix is finished next time).
- Bounded: no (m8).
- **The cron gap (for the conductor).** Nothing calls this function. Until a migration schedules it, no recording is ever deleted automatically and `recorder_expire_stale` never runs, so rows left `armed`/`recording`/`uploading` (B4 produces these) are never abandoned either. Running without it is SAFE in the sense that nothing is wrongly deleted; it is a retention promise not kept from the day the first `delete_after` passes. Needed: (1) a file in `supabase/migrations/` (not `drizzle/`) that calls `cron.schedule('recorder-retention', '0 20 * * *', ...)` with `net.http_post` to `/functions/v1/recorder-retention`, header `x-schedule-runner-secret` read from `public.schedule_runner` at run time, plus the same `apikey`/`Authorization` form that `20261110160000` uses (with `verify_jwt = true` the gateway needs a key it accepts as a JWT - check that the key in that file still is one), guarded so it does nothing where pg_cron/pg_net are absent, and idempotent (`cron.unschedule` first); (2) the function deployed; (3) a pgtest case that the job exists after the migration; (4) one manual admin POST after the first test lesson to prove the path end to end. Deadline: before the first recording's `delete_after`; until then an admin can run it by hand.

### 6. Rulings

**(a) Digital silence vs the byte floor.** Today the engine never sends a below-floor FLAC chunk: it re-encodes it VERBATIM (`encoders.ts:27-30`), so the server accepts it. Two things are wrong with that: a dead microphone uploads 96 kB/s of zeros (about 518 MB for a 90-minute track, more than both live tracks together, on the same uplink), and those zeros then count as verified audio - the floor exists to stop exactly that. Ruling: **accept and store, mark it, never count it, tell the teacher.** That is a server change plus a client deletion:
- server (C1, smallest form): add `below_floor boolean NOT NULL DEFAULT false` to `class_recording_chunks`; in `recorder_register_chunk` replace the "too small to hold" RAISE (SQL :1499-1502) with setting that flag, keeping a hard minimum (say 40 bytes: a FLAC header) so an empty object is still refused; exclude `below_floor` chunks from `verified_audio_ms` in the evidence view; return `below_floor` in the JSON.
- client: delete the verbatim fallback in `encodePcmChunk` and the local `below_byte_floor` pre-check in `checkChunkLocally`/`uploader.ts:153`, take `below_byte_floor` out of `TRACK_ENDING`, show the flag in `upload` progress.
- teacher alert: already there - a constant input raises `flat` after 2 s and `dead_mic` after 10 s (`health.ts:93-109`); C3 must render both prominently.
Until the server change lands, KEEP the verbatim fallback (no audio is lost either way). Not needed before a first supervised lesson; needed before recordings are used as evidence. For Opus the fallback does not exist and a quiet room could end a track at the first below-floor chunk - another reason FLAC is the right first format.

**(b) A tab reopened after the lesson window.** Yes, it may finish uploading chunks that were registered on time - and, since `recorder_register_chunk` has no deadline of its own (it only flags `late`), also register and upload the ones that were not; late bytes never count as evidence. The server already allows all of this while the row is `recording`/`uploading`. What prevents it today is the page: it sends its own late Stop first, the server turns the row `abandoned`, and `recorder_can_upload` then refuses every pending object, leaving the audio only on the laptop. Smallest change, client only, in `driveOnce` (`controller.ts:292-346`): when `serverNow() > captureClosesAt + lateAfterMs` and Stop is still pending, run `uploader.run()` FIRST and send Stop only when nothing is pending (or the uploader halted). The row still ends `abandoned` with reason "stopped after the lesson window", which is the truth; the difference is that the audio is on the server under the normal retention instead of sitting on a classroom laptop. Then free the confirmed bytes locally for an abandoned recording too. No server change. Should land with B4 (same lines).

### 7. Test quality
Claims in `C2-capture-core.md` with no test at all (no reference in either suite): the one-uploader lock / `another_tab`; `storage_low` and the quota path; `clock_unknown` refusing to arm; the wake lock; the folder backup; `discardLocal` and its typed word; the `context_stall` / `gap` marker; `IdbStore` except through the browser harness; the retention cron (not written).
Tests that cannot fail or prove less than their name: `unit.test.mjs` end-to-end case computes `expected`/`t0` and discards them (`void expected; void t0;`) - harmless, the later sample-for-sample compare is real, for the teacher track only; the reload case's "at most the last 5 s are lost" is a duration bound, not a content check; "no chunk twice" is a seq-key check.
The browser suite and Chrome's fake devices: there are three fake inputs with distinct ids and groups, so "two devices open at once with exact ids" is real. Everything that depends on two different signals or two real clocks is not: both inputs play the same WAV (dead-mic, swap, correlation are untested there), both are 44.1 kHz software devices (no rate mismatch, no real drift), processing flags trivially read back `false`, unplug is a synthetic `ended` event with the device still present, hidden-tab throttling never engaged (the author says so). What it does prove on a real browser: the worklet path, real IndexedDB across reload and renderer crash, Chrome decoding the FLAC to the delivered samples, offline/online, the no-gesture start.

Mutation run (16 mutants, each a throwaway copy of the engine under `.probe/m/`, `unit.test.mjs` run against it):

| # | Mutant | Result | What noticed |
|---|---|---|---|
| 01 | store deletes bytes of unconfirmed chunks | caught | "only confirmed bytes are deleted", "unconfirmed bytes stay" |
| 02 | confirmed bytes deleted before the recording is complete | caught, by one unrelated assertion | "the row is abandoned; the local audio is kept" - nothing asserts bytes are still held while a healthy recording is uploading |
| 03 | local bytes deleted after upload, before the read-back confirm | caught, by the same single assertion | as 02 |
| 04 | **read-back checksum not compared** (`uploader.ts:176`) | **SURVIVED** 195/0 | nothing. The fake has `corruptDownload()` and no test uses it |
| 05 | wrong sequence on resume | caught | the reload case (3 assertions) |
| 06 | echoCancellation requested true | caught | constraints case |
| 07 | read-back never reports a flag left on | caught | "a flag left on is reported" |
| 08 | bucket constant changed | caught | the two bucket assertions (then the run crashed) |
| 09 | **server's `late` flag ignored** (`uploader.ts:165`) | **SURVIVED** 195/0 | nothing: the 12-minute-offline case is satisfied by the page's own confirm-time rule at :188 |
| 10 | FLAC frame CRC-16 wrong | caught, by a crash | the suite's own decoder throws and the run dies with no summary - make it an assertion |
| 11 | FLAC header CRC-8 wrong | caught, by a crash | as 10 |
| 12 | **manifest read-back not compared** (`controller.ts:816`) | **SURVIVED** 195/0 | nothing |
| 13 | **discard without the typed word** (`controller.ts:367`) | **SURVIVED** 195/0 | `discardLocal` has no test |
| 14 | scheduled stop sent 15 min after the window | caught | "the scheduled stop lands inside the window" |
| 15 | server's abandoned answer to Stop not reported | caught | the late-Stop case |
| 16 | **chunks registered newest first** (`uploader.ts:136`) | **SURVIVED** 195/0 | nothing asserts registration order, although "never leave a hole" depends on it |

11 caught (2 of them only by an incidental assertion, 3 by crashing the run), 5 survived. The survivors are M8.

### 8. CPU
Encoding is on the main thread, not in a Worker or the worklet (`controller.ts:594`). Per 30 s the page does two encodes back to back (author's numbers: 0.61 s mean, 1.79 s max each under load), i.e. a main-thread block of roughly 1.2 s typical and up to ~3.6 s, every 30 seconds, plus two SHA-256 passes (async, off-thread in WebCrypto) and the per-batch float->int16 and level meter.
- Dropped audio: no. Capture runs on the audio thread and posts transferable batches; a blocked main thread only delays them. Memory grows by ~400 kB per blocked second, nothing.
- Lesson jank: yes if the recorder shares a renderer with the lesson. Inside the same SPA tab as the flipbook it will freeze the page for 1-3 s twice a minute - not acceptable. In its own tab it may still share the process (same-origin tabs often do). In a separate browser window opened from the address bar it usually has its own process and the cost is one busy core for ~4% of the time.
- False stall markers: M6.
Recommendation: move `encodePcmChunk` + the hash into a dedicated Worker (pure function, no dependencies, transfer the `Int16Array` in and the bytes out; keep the queue order). About 40 lines plus a Vite `new Worker(new URL(...))`. It does NOT block a first supervised test lesson provided the recorder runs in its own window, not in the tab that shows the lesson, and the supervisor watches for jank; it should land before unsupervised use and before anyone trusts `gap` markers.

## What must land when

Before a first supervised test lesson with real children: B1, B2, B3, B4 (each with its probe turned into a unit case); M2's purge-after-complete; M5 (do not offer the backup); m1. And two written conditions: one teacher per browser profile until M1 lands; the recorder in its own window until M6 lands.
Also before the first lesson, because it is cheap and it guards the integrity claim: the checksum test of M8 (mutant 04).
Can follow: M1 (before a second teacher uses the laptop), M3, M4 + ruling (b), M6 (Worker), M7 cron (before the first `delete_after`), the rest of M8, ruling (a) (before recordings count as evidence), m2-m9, the missing tests in item 7.

## Checked and found sound
- No local chunk is deleted before the server's read-back confirm AND `complete` (one call site; store refuses unconfirmed).
- Refused chunks are kept and reported; a refusal ends the track instead of leaving a hole (for server refusals).
- Register / upload / confirm are each safe to repeat; a seq can never hold two different chunks (local store and server both refuse).
- No service role, no signed URLs, no retention columns, no token or audio in logs, in the browser code.
- Teacher B cannot register, upload or confirm into teacher A's recording (SQL: `started_by = auth.uid()` in `recorder_register_chunk`, `recorder_confirm_chunk`, `recorder_can_upload`).
- Never falls back to the default microphone; one device for both roles refused by id and by groupId.
- Constraint request and honest read-back.
- The FLAC encoder: bit-exact against ffmpeg on 33 files, CRC-8 and CRC-16 verified by ffmpeg's CRC checking.
- Frame bookkeeping across chunk boundaries; deterministic manifest bytes.
- recorder-retention's gate, prefix discipline, fail-closed marking and logging.

## Not checked / needs real hardware
- The browser suite was not re-run in this review (read only). pgtest suites other than reading `recorder-retention.test.mjs` were not re-run.
- Real S500 + lapel: read-back of the processing flags, native rates (48 vs 44.1 kHz), drift between the two device clocks over 90 minutes (clap test), real unplug/replug and a different USB port, dead-mic and swapped-roles detection on two different signals.
- Hidden / minimised tab for a whole lesson, lid close and sleep (B1 is what these will hit), the no-gesture start on the school laptop's actual Chrome/Edge.
- FLAC encode time and main-thread blocking on the classroom laptop; real FLAC bytes per second for speech and for a quiet room.
- IndexedDB quota behaviour on that laptop's disk, and `navigator.locks` with two real tabs.
- Uplink AND downlink (read-back) at lesson time.
- Whether `recorder_register_chunk` on the live database behaves as the fake does for the probes above (the fake was written from the SQL; the SQL was read, not executed, here).
