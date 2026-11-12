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

MEASURE_TABLE

## Constraint read-back (Chrome 145, fake devices)

CONSTRAINTS

## Arm and start WITHOUT a click

NOCLICK

## Hidden tab, closed tab, sleep, lid

HIDDEN

## Simulated vs needs the real hardware

SIMULATED

## Failure-injection table

FAILURES

## Test totals

TOTALS

## Requests to the conductor

REQUESTS
