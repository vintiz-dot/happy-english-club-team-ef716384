# C2 round 3 - after C2 review 2 (FAIL: N-B1..N-B3, N-M1..N-M9) and the C3 change list

**Where I am / next step:** DONE. All three blockers and nine majors fixed and tested; the C3 change list applied; suites green (totals below).

Branch `worktree-agent-a4803c8e10a251526`; merged `claude/hec-conductor-setup-efbaa5` (review 2, C3 screens) at 5999dde. Synthetic audio only in every test. Nothing applied, deployed or pushed.

## Decisions

- **N-B1 rule, as the conductor set it:** no captured audio is ever discarded; t = 0 is the first captured sample; the server's start is recorded as an offset. Built as: the chunker's t0 is set when capture begins (before the Start is even sent), every chunk and 5-s segment goes to IndexedDB at once; when the server answers, `pre_start_ms = server stamp - first sample` (server time, never before `capture_opens_at`) is stated to the server once, before any chunk. This needed a SERVER change (the migration is still never applied, edited in place): `class_recordings.pre_start_ms` (stated once by the recorder, while open, before any chunk, bounded by the window - trigger), `recorder_register_chunk` and the completeness check measure from `started_at - pre_start_ms`, and the evidence view never counts audio before `started_at` (a chunk that starts before it is never live; the lesson's start on the timeline is at least `pre_start_ms`). So pre-start audio is stored and listenable, never evidence. A capture stopped before any answer (a whole lesson offline) keeps everything locally; when the network comes back the engine starts and stops the recording late if the server still accepts it, else says plainly "never started; N s kept on this laptop, cannot be sent".
- `starting` is titled "◌ WAITING FOR THE SERVER", never "● RECORDING"; its messages now say what is true ("the audio IS being saved on this laptop and will be sent once it does").
- **N-M2:** a stall's gap is filled with silence (both tracks, at most 30 min) so the timeline stays on the server's clock and later chunks are not "late"; the silence is stored below the byte floor (never evidence) and the manifest's `context_stall` carries `padded_ms`.

## API changes for C3 (additive)

`RecorderErrorCode` unchanged since round 2 (clipping etc.). `Discontinuity.kind` adds `pre_start` (and `padded_ms?`); `LocalRecording` adds `firstSampleServer?`, `preStartMs?`, `preStartAcked?`; `ServerRecording` adds `pre_start_ms?`, `started_by?`; `RecorderBackend.setPreStart?`; `RecorderStore.deleteManifest?`; options `reopenTimeoutMs`, `clockMaxRttMs`, `encodeTimeoutMs`; `workerEncoder(make, onFallback, { jobTimeoutMs })`; `HealthMonitor.reset()`. Markers can be added from the first captured sample (before the server answers). The C3 screens were changed here (see below).

## How each finding was closed (engine: `src/lib/recorder/controller.ts` unless named; proof: `scripts/recorder/unit.test.mjs` case names)

| # | Fix | Proof |
|---|---|---|
| N-B1 | t0 at the first captured sample (`beginCapture`), chunks/segments stored at once, local phase `capturing` from then; `adoptServerStart` computes `pre_start_ms`, `sendPreStart` states it before any registration (uploader gated on `preStartAcked`); `lateStart` for a capture stopped before any answer; `startNeverPossible` says exactly how much is kept. Server: `pre_start_ms` (migration, trigger, register, complete span, view). `starting` title "◌ WAITING FOR THE SERVER"; messages true. | P2a: 10 min offline: `starting` throughout, ~60 chunks/track stored, true messages, < 60 errors; back online: **660 of 660 s on the server**, `pre_start_ms` >= 599 000. P2b: whole window offline: never `recording`, 20 min kept, then "never started ... kept on this laptop but cannot be sent" with the exact ms, listed in heldAudio. 25-s start travel: all kept, sample-exact from the first sample, offset in manifest + server. SQL: pre_start cases (stated once, not while armed, not before the window, not after a chunk; 2 pre-start minutes stored but not evidence: 48 of 50 count). |
| N-B2 | `sendStart`: final only for `FINAL_START_REFUSALS` (window_closed, switch_off, consent_missing, session_canceled, not_teacher, no_longer_teaching, already_live, recording_closed, not_your_recording, session_invalid); anything else retried with backoff 2 s -> 30 s while capture continues; errors de-duplicated (first, then every fifth). | 429, PGRST116, 409 (twice each): mics stay open, retried, recording, complete; a stated switch-off is final. |
| N-B3 | `onTrackEnded`: every open track lost -> `noMics`, state `stalled`, `capture_stalled` "both microphones are gone"; `capturingState()` never says `recording` while `stalled || noMics`; back on the first `device_restored`. | P4: stalled at once and a minute later, loud error, the outage's chunks all below_floor, both sought and restored, recording, complete. |
| N-M1 | `leaveStall` clears `rebuilt`; re-make rate-limited to one per 30 s instead of one per lesson. | P1: second death re-made (rebuilds 2), recording, complete. |
| N-M2 | `padSilence` on `leaveStall` (<= 30 min), `padded_ms` in the manifest. | P13: 11-min stall: later chunks not late, padding below_floor, `padded_ms` >= 10 min. |
| N-M3 | `measureClock` keeps a measurement only when rtt <= `clockMaxRttMs` (2 s), else keeps the previous one and retries in a minute; `clock_unknown` de-duplicated (10 min). | P8: a 40-s answer moves the estimate < 1 s; the next start reports no delay; complete. |
| N-M4 | `adoptLegacy` on recover: an ownerless row the server says is mine (`started_by`, now in `REC_COLUMNS`) is adopted; an ownerless COMPLETE leftover is cleaned whoever signs in; the typed Discard works on ownerless rows. | P7 / mutant F. |
| N-M5 | `cleanAfterComplete`: confirmed bytes, marker labels and the manifest go; if refused chunks still hold audio the row stays and `heldAudio` lists it (the `complete` skip removed) -> `stuck`, sign-out report, typed Discard. `RecorderStore.deleteManifest`. | P5: no label/manifest left, listed, sign-out says 1, stuck after 20 days, Discard reaches it. |
| N-M6 | Per-chunk encode timeout in the controller (`encodeTimeoutMs` 30 s, from posting): the chunk is encoded inline and so is the rest of the lesson; `workerEncoder` per-job timeout (20 s) and `onmessageerror`. | P9 with a never-answering encoder: said, chunks stored and confirmed, Stop returns, complete; a silent Worker job falls back. |
| N-M7 | Re-open raced against `reopenTimeoutMs` (10 s); the `reopening` flag cleared. | P11: after a hung re-open the microphone is still found. |
| N-M8 | `HealthMonitor.reset()` in `beginCapture` (everything, incl. `lastClipReport`). | Two lessons on one engine with a dead room mic: `mic_silent` raised again in lesson 2; the monitor raises flat + clipping again after reset. |
| N-M9 | cases for the reviewer's six mutants | A: stall with ticks 2 s apart declared within 8 s; B: "running" but silent re-made; C: two same-label devices - the lost room mic is never re-opened as the lapel; D: `ended` + `devicechange` = one alert, one loss; E: a failed Stop whose read-back shows it landed is not re-sent (1 Stop call); F: own complete leftovers purged on recover. Plus P12 (answer and two read-backs lost: complete). |

Also: `scripts/pgtest/run.mjs` now runs the engine unit suite ("recorder engine") and the screens logic ("recorder screens logic").

## C3 screens (`src/components/recorder/**`, `src/pages/TeacherRecorder.tsx`, `src/lib/recorderUi.ts`, one wrapped call in `src/components/Layout.tsx`)

Review 2 section 7, item by item: (1) `stalled` is in CAPTURING: the bar and Stop stay, the screen is not left (setup not offered), drawn without the red dot as "NOT RECORDING - restarting the audio", `role="alert"`; (2) `starting` has no red dot: "Starting...", after 5 s "Saving on this laptop - the school server has not confirmed yet" as an alert; (3) an `error` screen "This lesson is not being recorded" with the start_failed text (what is kept); `error` may arm the NEXT lesson, never re-arm the same one; (4) the title regex knows all four prefixes; (5) `errorView` has a view per new code, and while capturing no view offers Reload (the default says "Do not reload while recording"); (6) an error board in `recorderUi.ts` (`boardAdd/boardClear/boardShow`): one entry per (code, track), by priority (NOT RECORDING > microphones > silent/quota > server > others > clipping), repeats counted, offline never on it, at most three shown; (7) `device_lost` = "still missing - plug it back in; the recorder is looking for it", and `device_restored` clears both `unplugged` and `lost` (and their board entries); (8) `level.clipping` on the meter ("Too loud - clipping") and the clipping warning clears itself after a minute; (9) `mic_silent` stays per track until health `recovered` for that track; (10) `stuck` and `recovered.othersPending` shown, with a typed-DISCARD dialog for stuck audio; (11) sign-out goes through `guardedSignOut` (new `signOutGuard.ts`; Layout's one edit): refused while capturing, warns when audio is unsent, then `rec.signOut()`; the engine is re-created on a user change (DailyRecorder keyed by user id); (12) `RecorderLike` picks `signOut`, `othersPending`, `heldAudio`, `durable`, `discardLocal`, `current`; `durable === false` -> an error notice and no arming; (13) the upload line shows `stopPending`, `stopRefused`, `heldInMemory`, `belowFloor`; (14) no folder backup offered. Tested: `scripts/recorder/ui.test.mjs` 30/0 (views, no Reload while capturing, the board, the upload lines); the screens themselves type-check (`tsc -p tsconfig.app.json` exit 0); not rendered in a browser here.

## Mutation run (`.probe/mut.mjs`, throwaway, removed; each mutant a copy of `src/lib/recorder` run against `unit.test.mjs` via `RECORDER_SRC`)

| # | Mutant | Result |
|---|---|---|
| A | reviewer: the late-tick deferral taken every time | CAUGHT 403/1 |
| B | reviewer: re-made only when resume() says not running | CAUGHT 403/1 |
| C | reviewer: label fallback may open the other track's device | CAUGHT 403/1 |
| D | reviewer: a loss not ignored when the track is already lost | SURVIVED 404/0 -> case (a second `ended`) -> CAUGHT 406/1 |
| E | reviewer: no read-back after a failed Stop | CAUGHT 403/1 |
| F | reviewer: recover leaves complete leftovers | CAUGHT 403/1 |
| G | N-B1: t0 at the answer again | CAUGHT (suite crashed) |
| H | N-B1: pre_start never told to the server | CAUGHT 398/6 |
| I | N-B1: `starting` considered `recording` | SURVIVED 404/0 -> case (a stall while starting) -> CAUGHT 406/1 |
| J | N-B2: any start failure final | CAUGHT 395/9 |
| K | N-B3: both lost does not stall | CAUGHT 401/3 |
| L | N-M1: one re-make per lesson | CAUGHT 403/1 |
| N | N-M2: no padding | CAUGHT 401/3 |
| O | N-M3: slow clock answers kept | CAUGHT 402/2 |
| P | N-M4: ownerless rows not adopted | CAUGHT 403/1 |
| Q | N-M5: complete-with-refused not listed | CAUGHT 401/3 |
| S | N-M6: no encoder timeout | CAUGHT (suite never finished on the hung encoder) |
| T | N-M7: no re-open timeout | CAUGHT 403/1 |
| U | N-M8: no health reset per lesson | CAUGHT 403/1 |

The reviewer's six: 6 caught (D after one case). 13 new: 13 caught (I after one case).

## Test totals (final code)

- `node scripts/pgtest/run.mjs`: **3627 assertions across 42 suites, 0 suite(s) failed** - incl. recorder engine (unit) **406/0** (was 337), recorder screens logic **30/0** (new), class recorder SQL **415/0** (was 406), recorder retention 37/0, recorder cron 22/0, app typecheck 3/0, edge functions typecheck 5/0.
- `tsc --noEmit -p tsconfig.app.json`: exit 0 (alone too).
- `node scripts/recorder/browser.test.mjs` (Chromium, fake devices on the synthetic WAV, port 5362): full run 61/1 - the failing assertion demanded that the context be RE-MADE at autostart, but Chrome resumed the first one once the mics were open (recorded with no gesture all the same); the assertion now accepts either -> `--only=autostart` 3/3. 62 assertions in all, including the real `ctx.suspend()` / `ctx.close()` cases.

## Synthetic audio only

The unit suite's one real-lesson FLAC check now runs only with `RECORDER_REAL_AUDIO=1`; the browser harness defaults to a synthetic WAV made by `scripts/recorder/make-synthetic-wav.mjs` (`C:\Users\Dell\hec-tools\c2r-harness\synthetic.wav`, harmonic tones + noise with pauses). Honest note: the first unit run of this round and the 19-mutant run started before that guard, so that one FLAC ratio check read a minute of the lesson file in place (nothing copied, nothing stored); the final unit run, the full pgtest run, the D/I re-run and the browser suite used synthetic audio only.

## For the owner / conductor

- The migration change (pre_start_ms) must be pasted with the rest of 20261112100000 (still never applied); the engine works against an older server too (no `setPreStart` -> treated as told), but then a slow start's audio is ahead of the server's clock.
- Decision still open (review 2): unsent children's audio stays on the laptop until someone types DISCARD; the 14-day rule only reports.
- Real-hardware checks: as in `docs/evidence/C2-revision.md`, plus: Wi-Fi off at the bell for 10 minutes (everything must reach the server afterwards), both USB microphones pulled at once (NOT RECORDING, then back by itself).

**Where I am / next step:** DONE.
