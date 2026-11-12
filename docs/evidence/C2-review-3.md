# C2 review 3 - third review of the capture engine (round 3) and the C3 screens

Reviewed commit: bb70791 (`worktree-agent-a4803c8e10a251526`), against d449acc (what review 2 failed) and `claude/hec-conductor-setup-efbaa5`.
Code read and run in the separate detached worktree `.claude/worktrees/c2r2` (moved to bb70791); this file is committed on `claude/hec-conductor-setup-efbaa5`. The conductor's worktree was not detached.
Review only: no product code changed, nothing deployed, pushed or applied to any database.

**Where I am / next step:** sections 3 and 6 written. Next: sections 1-2 (probes running), 4 (mutants running), 5, 7, verdict.

A correction to review 2 first. I wrote there that no real audio was read. That was wrong for the unit suite itself: at d449acc `scripts/recorder/unit.test.mjs:191` read one minute of a real lesson WAV in place, unconditionally, for a FLAC ratio check, and I ran that suite eight times (once, six mutants, one control). Nothing was copied, stored or committed, and my own probes were synthetic, but the statement was not true and I did not check it. In this review every run has `RECORDER_REAL_AUDIO` unset.

File:line is at bb70791; `controller.ts` etc. are under `src/lib/recorder/`.

Probes: as in review 2, the unit suite's own harness (`unit.test.mjs` lines 14-33, 296-403, 775-789, verbatim) + my scenarios Q1-Q8, synthetic source, against the unmodified engine at bb70791; scenarios saved as `docs/evidence/C2-review-3-probes.mjs.txt`.

## 1. The three blockers

### N-B1 (slow / offline Start) - FIXED as designed; ONE new hole at 30 minutes
Read: `beginCapture` sets t0 at the first captured sample and the local phase `capturing` before any Start is sent, so chunks and 5-s segments go to IndexedDB from the first second; `adoptServerStart` computes `pre_start_ms = server stamp - first sample`; `sendPreStart` states it before the uploader registers anything (`uploader.ts`: `rec.startedAtServer && rec.preStartAcked !== false`); `setState` titles `starting` "◌ WAITING FOR THE SERVER". The author's P2a/P2b cases are real (I re-ran the suite, section 4-5) and my own scenarios agree:
- Q6, the page reloaded while waiting offline, network back 3 minutes later: `recovered 1 | server complete pre_start_ms 300021 stop_reason crash_recovered | teacher s on server 120` - all 120 s captured before the reload arrive.
- Q7, Stop pressed while waiting offline: message `Stopped before the school server confirmed the start. The 90 s recorded are kept on this laptop and will be sent if the server still accepts this recording.`; online: `complete, pre_start_ms 94984, teacher s on server 90`.
- Q8, a stated refusal after 3 minutes of waiting: `state error | source open false | 'NOT RECORDED on the server: Recording is switched off for this class. The 189 s captured before that are kept on this laptop (they cannot be sent); recording has stopped.' | heldAudio ['abandoned 25557698 B']` - true, and listed.
- Messages: every text I could raise says what is true, with one exception below.

**R3-B1 - MUST FIX before a real class (Q1).** The migration refuses `pre_start_ms` above 30 minutes (section 3, R3-1); the engine does not know, and the test fake has no such cap, so no suite can see it. With the SQL's rule applied in front of the fake (29 minutes as the control):
```
29 min offline: 5 min after the network is back: state recording | server chunks 406 ... | after Stop: server complete | teacher s on server 2040
31 min offline: 5 min after the network is back: state recording | server chunks 0 | local chunks 432 | setPreStart calls 116
                errors {"start_delayed":1,"server_refused":116}
                'The school server started the recording 1877 s after this laptop began recording. All of it is kept and sent; ...'
                "The audio before the server's start can be stated once, before any chunk, and not from before the window opened"
                5 min after Stop: state uploading | server recording, ended_at null | teacher s on server 0 | pending 432 | stopPending true | errors total 204
```
`driveOnce` returns as soon as `sendPreStart` fails, before the Stop and before any upload, on every pass, for ever: not one chunk of the lesson reaches the server - including everything recorded AFTER the network came back - the Stop never lands (the row stays `recording` until the 14-day sweep abandons it), the state says `recording` with the red dot throughout, the one message says "kept and sent", and an error is raised every 2.5 s. The audio is safe on the laptop, so this is not a loss; it is a lesson that silently never becomes a server recording, on a school-internet outage of half an hour at the bell (or a reload followed by a late Start). Fix: remove the `LEAST(1800000, ...)` (the window bound is enough) or teach the engine and the fake the cap; either way a refused pre-start must not be retried for ever with the red dot on - after N refusals say "this recording cannot be sent" and stop claiming it is. Tests: SQL at 30 min + 1 ms; the engine at 31 minutes offline with the fake enforcing whatever the SQL enforces.

Minor, same code: the in-memory copy never learns that the offset was accepted (`sendPreStart` saves the store's copy; the next chunk's `saveRec(a.rec)` writes `preStartAcked: false` back), so the statement is re-sent on every pass - 58 UPDATEs in the 29-minute control. Harmless only because the server treats an equal value as no change; copy the flag back into `a.rec`.

### N-B2 (only a stated refusal ends Start) - FIXED
`FINAL_START_REFUSALS` in `controller.ts`; everything else retried 2 s -> 30 s while capture continues. New scenario Q4, the Start LANDS, its answer is lost and the next two read-backs fail: `state recording | source open true | errors {"server_unavailable":2} | server complete, teacher s 40`. (In SQL a second `status = 'recording'` on a recording row is not a transition, :1095, so the retry simply returns the row.) Mutant N3 (section 4) asks whether each name in the list is tested.

### N-B3 (both microphones lost) - FIXED
`onTrackEnded` -> `noMics` -> `stalled` + `capture_stalled`; `capturingState()` is the only place a capturing state is chosen, and it never answers `recording` while `stalled || noMics`. Q5, one lost, then the other, then one back: `room lost: recording | teacher lost too: stalled | room back: recording`; the outage's chunks are below the floor (`teacher below_floor 20 s, room 30 s`). Q5b, both lost while the Start is unanswered: `stalled`, still `stalled` when the server answers, then `recording` when they return (`starting,stalled,starting,recording`). Both are searched for (two `device_unplugged`, the re-open loop per role).

## 2. The eight majors

| # | Verdict | Evidence |
|---|---|---|
| N-M1 second dead context | FIXED | `tryRecover`: no per-lesson latch, one re-make per 30 s (`lastRebuildAt`); `leaveStall` clears `rebuilt`. Author's P1 case; mutant B caught (section 4). |
| N-M2 late after a long stall | FIXED for lateness; **the fill is not honest for short stalls - R3-M1 below** | `padSilence` (<= 30 min, both tracks), `padded_ms` in the manifest, a `gap` marker on the server. |
| N-M3 clock round trip | FIXED | `measureClock` keeps a measurement only when `rtt <= 2 s` (the first one provisionally, re-measured in a minute). |
| N-M4 ownerless legacy rows | FIXED | `adoptLegacy` asks the server (`started_by` is now in `REC_COLUMNS`); complete leftovers cleaned. Left over: an ownerless UNFINISHED row the server no longer knows cannot be discarded (`discardLocal` wants `abandoned` / `complete`); rare, minor. |
| N-M5 complete with refused chunks | FIXED | `cleanAfterComplete`: labels and manifest go, refused audio stays AND is listed (`heldAudio` no longer skips `complete`). |
| N-M6 hung encoder | FIXED | 30 s per-chunk timeout in `onRawChunk` -> inline for the rest of the lesson; `workerEncoder` 20 s + `onmessageerror`. (The hung Worker is not terminated; minor.) |
| N-M7 hung re-open | FIXED | the re-open is raced against 10 s; `reopening` cleared in `finally`. |
| N-M8 health across lessons | FIXED | `HealthMonitor.reset()` in `beginCapture`. |

**R3-M1 (MAJOR, evidence): filled silence inside a chunk counts as recorded audio.** The honesty of the fill rests on "the silence is stored below the byte floor". That is true only for chunks that are ALL silence. A stall shorter than a chunk leaves its silence inside chunks that also hold real audio; those are far above the floor (4000 B/s for FLAC, :166) and count in full. Q3, twelve stalls of about 6 s in 4.5 minutes (10 s chunks): `stalls 12 | silence filled (s) 73 | teacher s on server 262 | of which below_floor (never evidence) 0 | counted as audio 262` - 73 of the 262 "recorded" seconds never existed, and the server's view cannot tell (the manifest and the `gap` markers say so; `recorder_session_evidence` reads neither). With production's 30 s chunks every stall under about 25 s is invisible to the evidence, and a long stall still over-counts up to one chunk at each end. Before round 3 the timeline simply had less audio, so nothing was over-counted. Bounded and not a loss - but it is exactly the question asked: is the fill "never evidence that the recording ran"? Not always. Fix (a claim that only ever LOWERS evidence needs no verification): let the page state the padded total with the Stop (or per track with the counts) and subtract it in the view; or subtract the server's own `gap` markers.

Also for the runbook, not a defect: the fill is sized by the page's monotonic clock and capped at 30 minutes; a sleep the clock does not count, or a stall over 30 minutes, leaves the old behaviour (later chunks late). Hardware check 4 below.

## 3. The migration (`supabase/migrations/20261112100000_class_recorder.sql`, 52 changed lines, still unapplied)

The cron migration `20261112101000` did not change (`git diff d449acc bb70791` on it is empty).

Line by line:
- **:702 column** `pre_start_ms bigint NOT NULL DEFAULT 0 CHECK (>= 0)`. **:918** the insert trigger forces 0 whatever the client sends.
- **:1009-1017 update trigger.** A change is accepted only when ALL hold: it was 0 (stated once); `OLD.started_at` is set and the status is `recording` / `uploading` (not while armed, not in the same UPDATE as the Start, not after complete / abandoned); the value is `>= 0` and `<= LEAST(30 min, started_at - capture_opens_at)`; no chunk row exists yet. The check sits before the "server-owned fields" block and is not skipped for an admin or the service role. `started_at`, `ended_at`, the window and `started_by` remain server-owned (:1020 on, :971-990 unchanged).
- **:1200 complete**: the "no track is longer than the server saw" span becomes `ended_at - started_at + pre_start_ms`.
- **:1523 register**: `v_origin = started_at - pre_start_ms`; the stop-request, ahead-of-clock, after-Stop, after-window and `late` tests all measure from it (:1543, :1557, :1562, :1565, :1597). Ownership and `recorder__may_record` checks above it are untouched.
- **:1895-1908 evidence view**: the lesson's span on the chunk timeline is shifted by `pre_start_ms` and its start is `GREATEST(pre_start_ms, ...)`; a chunk is `live` only if `t_start_ms >= pre_start_ms`, not below the floor, and registered AND confirmed within `late_after` of its claimed end. `verified_audio_ms` is still `LEAST(live_ms, server_capture_ms, live_bytes / floor)` with `server_capture_ms = ended_at - started_at` (:1859) - the pre-start span is NOT added to that cap.
- **:2066** column grant adds `pre_start_ms`. Policies: no change (the diff touches none); `class_recordings_update` still needs `started_by = auth.uid()` or admin.

**Can a client inflate `pre_start_ms` to fake evidence?** No. Worked through: stating a larger value moves the origin EARLIER. A chunk counts only if it starts at or after `pre_start_ms` on that timeline (= at or after the server's own `started_at`), was registered within `late_after` of the moment it claims to end, and that moment cannot be more than `clock_tolerance` ahead of the server's clock (:1557). Those three are exactly the pre-round-3 rules in shifted coordinates, so the set of wall-clock instants that can become evidence is unchanged: `[started_at, ended_at]`, capped again by `server_capture_ms`. Stating a SMALLER value than the truth gets the page's own chunks refused as "ahead of the server's clock". Changing it after the fact is refused (once; never after a chunk).

**Can it back-date a recording?** `started_at` cannot move. What a client CAN now do, and could not before: claim that up to `min(30 min, time since the window opened)` of audio was captured before the server saw anything, and upload any bytes for it. That audio is stored and listenable, never evidence, and the row says so (`pre_start_ms > 0`). So a late-armed recording can carry an unverifiable first part. This is the price of the N-B1 rule (keep what the laptop captured while offline) and I think it is the right trade; whatever reads these recordings later (review screens, transcription, D1) must treat `t < pre_start_ms` as "the laptop's claim, not seen by the server" - `recorder_session_evidence` does not expose `pre_start_ms`, and it should.

**Findings**
- **R3-1 (MUST FIX, one line + parity): the 30-minute cap is unknown to the client and to the test fake.** :1012 refuses `pre_start_ms > 1800000`. The engine clamps only to `started_at - capture_opens_at` (`controller.ts`, `adoptServerStart`), and `scripts/recorder/fake-recorder-server.mjs` implements the bound without the 30 minutes. A Start that lands more than 30 minutes after capture began (the school's internet down from 5 minutes before the bell to 26 minutes after; or a reload followed by a late Start) makes the server refuse the statement for ever; what the engine then does is section 1, probe Q1. The window bound alone is sufficient (the origin can never precede `capture_opens_at`); either drop the `LEAST(1800000, ...)` or make the engine and the fake know it. Add the SQL case at exactly 30 min + 1 ms and the engine case at 31 minutes offline.
- **R3-2 (minor): `recorder_session_evidence` should expose `pre_start_ms`** (see above).
- **R3-3 (minor): the 9 new SQL assertions (406 -> 415) cover**: armed refused, beyond-window refused (with 365 days, which also trips the 30-min cap, so neither bound is tested on its own), stated once, stored, three pre-start chunks accepted, ahead-of-clock from the new origin, completes, "48 of 50 minutes count", refused after a chunk. **Not covered**: another teacher (not `started_by`) setting it; a value just over `started_at - capture_opens_at` with the cap not in play; the cap itself; a chunk that straddles `started_at` (it is not live - right, untested); `late` for post-start chunks after a long pre-start; the state `uploading`. The trigger reads correctly on each of these; they have no test that could fail.

## 6. No real audio, transcript or derived data in the repo

- `git log --numstat d0d18b7..bb70791`: the only binary files in the whole range are PNG screenshots under `docs/evidence/A4.6/` (the conductor branch's tuition work, merged in; not this workstream). No `.wav/.flac/.mp3/.ogg/.webm/.m4a/.opus/.pcm/.zip/.npy/.mp4` was ever added. No blob over 300 kB exists in the range. The one added fixture is `scripts/pgtest/fixtures/tuition-figures.golden.json` (tuition).
- Real-audio references left in the tests: `unit.test.mjs:191-193` (a path string; read only when `RECORDER_REAL_AUDIO=1`), comments in `harness.mjs` / `browser.test.mjs`. `harness.mjs:21` now defaults to a synthetic WAV OUTSIDE the repo (`C:/Users/Dell/hec-tools/c2r-harness/synthetic.wav`), made by `scripts/recorder/make-synthetic-wav.mjs` (read: harmonic tones + noise from a seeded generator, no input file).
- The default path of every suite is synthetic: unit (the `FakeSource` sine + noise), pgtest (SQL only), ui (no audio), browser (the synthetic WAV unless `RECORDER_WAV` names another file).
- The implementer's note is accurate: before the guard, the unit suite read the lesson file in place. So did mine in review 2 (above).
