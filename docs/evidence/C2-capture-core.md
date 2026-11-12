# C2 - Recorder capture core

**Where I am / next step:** built and tested; waiting on the minimised-window hidden-tab run and the 10-minute CPU re-run after the encoder speed-up, then the full `run.mjs`, then re-merge the conductor branch (revision 2 not merged yet at the time of writing).

Nothing here was applied, deployed or pointed at the live project. No audio entered the repo: the lesson WAV is read in place from `C:\Users\Dell\hec-audio-eval\...`, results go to `C:\Users\Dell\hec-tools\c2-harness\`. No new npm dependency (FLAC encoder written here; Playwright is used by path from `C:\Users\Dell\hec-tools\a0-harness`).

## What is built

| Path | What |
|---|---|
| `src/lib/recorder/index.ts` | public API, documented at the top for C3; `createRecorder()` |
| `types.ts`, `errors.ts`, `events.ts` | types; error taxonomy (`RecorderErrorCode`, `ServerRefusal`, classification of the migration's messages); typed events |
| `devices.ts` | enumeration, Windows label normalisation, `default`/`communications` aliases dropped (and reported via groupId), resolve by id -> label -> label+group, never the default mic; role hints; device profile in localStorage + `profileRow()` (hashes, not ids) for `recorder_device_profiles` |
| `capture.ts` | two `getUserMedia` calls, exact deviceIds, EC/NS/AGC false, `voiceIsolation:false` where supported, `getSettings()` read back after BOTH are open, `constraintsNotHonoured()` |
| `worklet.ts`, `audioGraph.ts`, `captureSource.ts` | ONE AudioContext, ONE AudioWorklet with two inputs (frame n of both tracks in the same `process()`), batches of 2048 frames, ticks every 0.5 s as the heartbeat; MediaStreamDestination taps for Opus |
| `chunker.ts`, `chunkMath.ts` | chunks of exactly F frames on the shared clock, t0 = frame at the start request, 5 s crash segments, positions from frames only; the server's per-chunk bounds checked locally first |
| `flac.ts`, `encoders.ts` | own FLAC encoder (16-bit mono, fixed predictors + partitioned Rice, standalone files) and WAV; below-floor FLAC chunk re-encoded VERBATIM (real samples, never padding) |
| `opusPipeline.ts` | candidate A: one MediaRecorder per track, Opus 128 kbps WebM, timeslice |
| `store.ts` | IndexedDB `hec-recorder` (recordings, chunks, bytes, segments, markers, manifests) + an in-memory store with the same contract; bytes deleted only for `confirmed` chunks |
| `backend.ts` | the server contract over an INJECTED supabase-js client (teacher's own JWT); `BUCKET = "class-recorder-audio"` - the one place the name is written |
| `uploader.ts` | register EARLY (rows in seq order as soon as chunks are cut) -> upload -> download + SHA-256 -> `recorder_confirm_chunk`; idempotent; exponential backoff to 60 s; refusals end a track instead of leaving a hole; `late` chunks counted |
| `health.ts` | level meter (dBFS rms/peak), clipping, silence, dead mic (flat while the other track is live), "roles look swapped" measurement (teacher-minus-room dB over the first 60 s of speech) |
| `manifest.ts` | manifest of C1 5.4, deterministic bytes (a retried finalize uploads the identical object) |
| `schedule.ts` | Hanoi wall-clock, arm/start/stop plan, back-to-back rule, server clock offset |
| `controller.ts` | `Recorder`: prepare / arm / auto start at `capture_opens_at` / stop (scheduled stop 5 s before `capture_closes_at`) / markers / finalize / recover after reload or crash / wake lock / File System Access backup / storage budget / one-uploader lock |
| `supabase/functions/recorder-retention/index.ts` | retention: runner token or admin JWT only; expire stale -> due list -> list, remove in 100s, list again, then `recorder_mark_audio_deleted`; skips any prefix that is not `{class}/{recording}/`; logs ids and counts only |
| `supabase/config.toml` | one entry: `[functions.recorder-retention] verify_jwt = true` |
| `scripts/pgtest/run.mjs` | one line: the `recorder retention` suite |

## Public API (for C3)

See the comment block at the top of `src/lib/recorder/index.ts`. In short:

```
const rec = await createRecorder({ client: supabase, userId, profile: loadProfile(userId) });  // in the "Ready" click
await rec.prepare();   await rec.recover();
await rec.arm(scheduleEntry, { stopAt });        // starts itself at capture_opens_at
rec.marker("roll_call_start" | "roll_call_end" | "activity" | "student_name" | "note", { label, studentId });
rec.extend(untilMs);  await rec.stop();
rec.on("state" | "level" | "health" | "constraints" | "chunk" | "upload" | "error" | "storage" | "clock" | "stop_requested" | "recovered" | "backup", fn)
rec.swapMeasurement();  rec.enableLocalBackup();  rec.discardLocal(id, "DISCARD");  rec.uploadProgress(id)
```

`upload` progress carries `unregistered`, `late` and `lateMs` for revision 2's "recorded offline too long: these minutes will not count as evidence". `RecorderError.code` is one of: `permission_denied, device_missing, device_ambiguous, same_device_twice, device_unplugged, device_lost, constraint_not_honoured, audio_context_suspended, unsupported, offline, server_refused (+ refusal: too_early, window_closed, switch_off, consent_missing, not_teacher, session_canceled, already_live, stop_requested, below_byte_floor, after_window, after_stop, ahead_of_server_clock, conflicting_chunk, readback_mismatch, not_in_storage, ...), not_signed_in, quota, storage_low, another_tab, clock_unknown`.

## Format decision: FLAC (candidate B), with numbers

**Decision: FLAC.** Chosen on the design's criteria (C1 5.2), by measurement:

| | A. Opus 128k WebM (MediaRecorder) | B. FLAC 48 kHz 16-bit (worklet + own encoder) |
|---|---|---|
| Bytes/s per track (fake lesson audio, full 30 s chunks) | 15 830 (32 min run), 14 974 (10 min run) | 45 499 (32 min), 45 627 (10 min) |
| MB per minute per track | 0.90-0.95 | 2.73 |
| **90-min lesson, two tracks** | **~162-171 MB** | **~491 MB** (measured rate; see caveat) |
| Full window 5 + 90 + 10 min, two tracks | ~189-200 MB | ~573 MB |
| (WAV fallback, 96 000 B/s) | | 1.04 GB / 1.21 GB |
| Main-thread task time per audio minute (CDP `TaskDuration`, both tracks) | 2.75 s (10 min run), 6.2 s (32 min) | 8.27 s after the encoder speed-up (10 min run); 28 s with the first encoder (32 min) |
| Encoder time per 30 s chunk | native, off the main thread | 0.61 s mean, 1.79 s max in the tab under heavy machine load; 0.2-0.3 s in Node on the same lesson audio |
| Gapless join, decoded and compared with the source | not testable sample-exactly (lossy); 30 s+ decodes only as the joined stream | **exact**: Chrome's own decoder gives back every sample the worklet delivered, 1.70 M samples per track, 0 differ (`browser.test.mjs`); own decoder and ffmpeg agree in `unit.test.mjs` |
| Chunks decodable alone | **no**: chunk 0 decodes, chunk 1 does not (`decodeAudioData` fails) | yes, every chunk is a complete .flac |
| Timeline | approximate (two MediaRecorders) | exact (one worklet frame counter for both) |
| Inter-track offset, minute 1 -> end (fake inputs play the same file) | 0 -> 0 ms (both runs) | -10.02 -> -10.00 ms over 30.5 min (32 min run, light load); 18.1 -> 32.0 ms over 9.5 min (10 min run, heavy machine load) |

Reading the offsets honestly: the worklet hands over frame n of both inputs in one `process()` call, so the PIPELINE cannot add drift (and the 32-minute run shows 0.02 ms, one sample of quantisation). The 13.9 ms seen in the loaded run comes from Chrome's two *fake* input devices themselves, which are software-clocked threads that fell behind unevenly while this laptop ran several other agents' browsers. Real USB devices have independent hardware clocks; the clap test (owner check 9) is the only real measurement. The Opus "0 ms" is from another page whose fake devices happened to open together; it is not evidence that Opus aligns better.

Caveat on FLAC size: the evaluation WAV is 16 kHz audio that Chrome upsamples to 48 kHz, so it has little above 8 kHz and compresses well. A real 48 kHz microphone with a noise floor will be larger; C1's estimate (45-60 kB/s) gives up to ~650 MB per 90-minute lesson. The byte floors (FLAC 4 000, Opus 2 000 B/s) are 11x and 7x below the measured speech rates. Digital silence (a muted input) compresses below the FLAC floor; the engine then writes that chunk as VERBATIM FLAC (the real samples, 96 kB/s) - never padding. Opus on a near-silent room may fall under its 2 000 B/s floor (VBR); not measured with real silence.

Why B and not A: criterion 2 (exact common timeline) and "a lossy original can never be made lossless later" (criterion 3), plus standalone chunks (a crash or a lost object costs one chunk, not the rest of the stream). A's advantages are size (one third) and CPU. B's CPU after the speed-up is ~14% of one core's main thread under heavy load (8.3 s per minute, including meters and uploads), ~5.5 s more per minute than A. If the school laptop struggles, the next step is moving `encodePcmChunk` into a dedicated Worker (it is pure and has no dependencies), not switching to A. The engine still supports `opus-webm` and `pcm-wav` behind the same API (`format` option).

## Constraint read-back (Chrome 145, fake devices)

Both fake inputs opened concurrently with `deviceId: { exact }`; values READ BACK with `getSettings()` after both were open (`browser.test.mjs`, "devices"):

| | requested | read back |
|---|---|---|
| echoCancellation | false | false (both) |
| noiseSuppression | false | false (both) |
| autoGainControl | false | false (both) |
| voiceIsolation (supported: true) | false | false (both) |
| channelCount | ideal 1 | **2** (both) - not honoured; reported as `channelCount: 2 (channel 0 is recorded)`; the worklet records channel 0 |
| sampleRate | (not requested) | 44 100 at the device; the AudioContext runs at 48 000, so Chrome resamples - the track row stores 48 000 and the device's own rate is in `applied_settings` |
| deviceId / groupId | exact ids | distinct ids AND distinct groupIds |

The same device for both roles is refused (`same_device_twice`). The S500's firmware DSP cannot be read back by any browser API; the manifest marks the room track `room_device_dsp: "hardware, not disableable"` from its label.

## Arm and start WITHOUT a click

Measured by a page that runs at LOAD, with no gesture at all (Playwright's `evaluate()` itself carries a user gesture, so an earlier version of this probe was wrong and its result is discarded): permission `granted`, `navigator.userActivation.hasBeenActive` false before and after. Same result headless, headed with Chrome's default policy, and headed with `--autoplay-policy=document-user-activation-required`:

| step, no gesture | result |
|---|---|
| `new AudioContext()` at load | `suspended`; `resume()` leaves it suspended and its promise **never settles** (the engine now races it with a 1 s timeout - it hung `prepare()` before that fix) |
| `getUserMedia` with the persisted grant | works |
| the context made before capture, resumed after capture started | still `suspended` |
| a NEW `AudioContext` created while a microphone capture is live | **`running`** |
| `MediaRecorder` (Opus) on the stream | records (16.6 kB in 1.6 s) |
| `MediaStreamTrackProcessor` | available |

So zero-touch IS possible in this Chromium: open the microphones first, then create the context. The engine does exactly that when it finds its context suspended at capture time (`BrowserCaptureSource.openTracks`, `rebuiltContext`), and `browser.test.mjs` "autostart" proves it end to end: a page opened with no gesture prepares (context suspended, `audio_context_suspended` reported), arms, starts at the window by its 1 s interval, re-makes the context once the mics are open (running), captures 886 784 frames and completes - with `hasBeenActive` still false. Caveats: (1) before capture the heartbeat is the 1 s `setInterval`, which Chrome throttles to once a minute after 5 minutes hidden, so an unattended hidden page could start up to ~1 minute late; with the "Ready" click the worklet ticks drive it instead; (2) this is Chrome's documented capture exception as observed in Chromium 145; Edge/Chrome on the school laptop must be checked (owner check list, item 3).

## Hidden tab, closed tab, sleep, lid

**Not measured as hidden - say so plainly.** Two attempts ran 11 minutes each with Chrome's own throttling enabled (Playwright's `--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding` removed), headed: (1) another tab brought to the front, (2) the window minimised through CDP. In both, `document.visibilityState` stayed `"visible"` for the whole run: Playwright emulates focus/visibility for the pages it drives. So timer throttling never engaged, and these runs do not answer the question. What they do show (`measure-hidden*.json` in the tools folder):

| | run 1 | run 2 (heavier machine load) |
|---|---|---|
| frames delivered by the worklet vs the context clock | 30 840 832 vs 30 839 936 | 26 851 328 vs 26 852 096 |
| context clock vs wall clock over the period | 642 s of audio in 650 s | **559 s of audio in 650 s** |
| setInterval(1 s) wake-ups per minute | 33-52 | 50-58 |
| chunks stored / confirmed per minute | 4 / 4 (2 x 30 s x 2 tracks) | 2-4 / 2-4 |
| result | complete, contiguous | complete, contiguous |

Run 2 is a real finding: with the CPU starved by other processes, the AudioContext itself ran 14% slow (fake devices are software-clocked), so 91 s of a 665 s server-seen span is simply absent from the audio. The engine marks a context stall when wall time outruns audio time by > 1 s between ticks (`gap` marker, `context_stall` discontinuity); the server's `verified_audio_ms` would count only what is there. On real hardware the device clock does not stop with the CPU, so the symptom would be dropped frames instead - the frames-captured vs frames-written counts in the manifest are what show it.

By documented platform behaviour (not executed here):
- **Hidden tab:** Chrome's intensive throttling (one timer wake-up a minute after 5 minutes hidden) is waived while the page is capturing audio/WebRTC and does not apply to the audio thread at all. The capture path uses no main-thread timer (worklet -> port message); uploads are driven by chunk events and the 5 s check in `tick()`, which also runs from the worklet's ticks. Expected: capture and uploads continue. **Owner check 8 is still required.**
- **Tab or browser closed:** capture stops at once (a page cannot run without its window). Measured instead: reload and renderer crash mid-recording lose 2.3 s and 2.8 s (segments every 5 s), and the next load finishes the recording as `crash_recovered`.
- **Laptop sleeps / lid closes:** the OS suspends the audio devices and the page; no web API prevents it. On wake the context stall check writes a `gap` marker. Runbook: power plan "do nothing" on lid close, sleep never on mains.
- `powercfg /requests` needs an elevated prompt; not run (owner check).

## Simulated vs needs the real hardware

SIMULATED

## Failure-injection table

FAILURES

## Test totals

TOTALS

## Requests to the conductor

REQUESTS
