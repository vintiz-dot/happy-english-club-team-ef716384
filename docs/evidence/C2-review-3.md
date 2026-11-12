VERDICT: PASS WITH CHANGES (two mandatory changes before a real class: R3-B1, C3-a)

# C2 review 3 - third review of the capture engine (round 3) and the C3 screens

Reviewed commit: bb70791 (`worktree-agent-a4803c8e10a251526`), against d449acc (what review 2 failed) and `claude/hec-conductor-setup-efbaa5`.
Code read and run in the separate detached worktree `.claude/worktrees/c2r2` (moved to bb70791); this file is committed on `claude/hec-conductor-setup-efbaa5`. The conductor's worktree was not detached.
Review only: no product code changed, nothing deployed, pushed or applied to any database.

**Where I am / next step:** DONE. Verdict PASS WITH CHANGES (two mandatory changes: R3-B1, C3-a); sections 1-7, the verdict and the hardware checks are below.

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

## 4. Suites and mutations, run here

Suites (c2r2 at bb70791, `RECORDER_REAL_AUDIO` unset, `node_modules` as a junction, removed at the end with `cmd //c rmdir node_modules`):

| Suite | Result here | Claim |
|---|---|---|
| `tsc --noEmit -p tsconfig.app.json` (alone) | exit 0 | exit 0 |
| `node scripts/pgtest/run.mjs` | **3627 assertions across 42 suites, 0 suite(s) failed**, exit 0 | 3627 / 42 / 0 |
| - recorder engine (`unit.test.mjs`, now inside run.mjs) | 406 / 0 (and 11 more full runs under the mutants) | 406 / 0 |
| - recorder screens logic (`ui.test.mjs`) | 30 / 0 | 30 / 0 |
| - class recorder SQL (`recorder.test.mjs`) | 415 / 0 | 415 / 0 |
| - recorder retention / recorder cron / app typecheck / edge functions typecheck | 37/0, 22/0, 3/0, 5/0 | same |
| `browser.test.mjs` | NOT RUN (a headless Chromium for many real-time recordings). Read only. | 62 assertions |

Mutations: throwaway copies in my scratchpad (outside the repo), one change each, the unit suite against each via `RECORDER_SRC`.

My six from review 2 - **6 of 6 CAUGHT** (each 405/1, by the case the author added):

| # | Mutant | Result | Caught by |
|---|---|---|---|
| A | late-tick deferral taken every time | CAUGHT | "A: with ticks 2 s apart a dead context is still declared" |
| B | re-made only when `resume()` says not running | CAUGHT | "B: re-made although resume() said running" |
| C | label fallback may open the other track's device | CAUGHT | "C: ... never re-acquired as the teacher's own device (same label)" |
| D | a loss not ignored when already lost | CAUGHT | "D: one device_unplugged alert and one device_lost entry, not two" |
| E | no read-back after a failed Stop | CAUGHT | "E: ... sees the Stop landed and does not send it again" |
| F | `recover()` leaves complete leftovers | CAUGHT | "F: an own complete leftover ... is purged on recover" |

Six new ones in the changed code - **2 caught, 4 survived**:

| # | Area | Mutant | Result | What it means |
|---|---|---|---|---|
| N1 | pre-start accounting | `uploader.ts`: chunks may be registered before the server was told `pre_start_ms` (the `preStartAcked !== false` gate removed) | **SURVIVED 406/0** | The gate is a second line behind `driveOnce` (which returns before the uploader when the statement fails), so nothing changes today; but nothing would notice if `driveOnce`'s order changed and chunks went out on the wrong timeline. |
| N2 | pre-start accounting | `driveOnce`: a capture stopped before the server answered is never started late | CAUGHT 405/1 | "N-B1: once online the truth is said ..." |
| N3 | retry classification | `consent_missing` taken out of `FINAL_START_REFUSALS` (a class without consent: the Start is retried and the capture goes on for the whole window) | **SURVIVED 406/0** | Only `switch_off` is tested as final. Each name in that list is a decision that recording must STOP; each needs its case - `consent_missing` and `session_canceled` above all. |
| N4 | double loss / N-B3 | `leaveStall` ignores `noMics` (a context stall ending while both microphones are gone says `recording`) | **SURVIVED 406/0** | The two faults together are untested; `capturingState()` is right, nothing holds it there. |
| N5 | silence fill | the 30-minute cap on `padSilence` removed | **SURVIVED 406/0** | No test has a stall over 30 minutes; a laptop asleep for hours would synthesise hours of zeros on wake. |
| N6 | screens | `recorderUi.ts`: `clipping` outranks `capture_stalled` on the board | CAUGHT 28/2 (`ui.test.mjs`) | The pure screen logic is tested. The components are not: removing `"stalled"` from `CAPTURING` in `DailyRecorder.tsx` (the Stop bar vanishing) is seen by no suite - nothing renders the .tsx. |

A side effect of N3 worth its own line - **R3-M2 (privacy)**: since N-B1, audio is stored from the first sample, before the server has said yes. When the server's answer is a stated "no" - recording switched off, consent missing, lesson cancelled - what was captured is KEPT on the laptop until someone types DISCARD (Q8: 189 s, `phase abandoned`, listed). For "the network was down" keeping is right. For "the school has said this class must not be recorded" it is not: that audio should be deleted at once, and said so. The same applies to a switch-off that arrives mid-lesson for the part the server will never take.

## 5. The C3 screens (read, not rendered: `src/components/recorder/DailyRecorder.tsx`, `signOutGuard.ts`, `src/pages/TeacherRecorder.tsx`, `src/lib/recorderUi.ts`)

The 14 items of review 2:

| # | Item | Status |
|---|---|---|
| 1 | `stalled` keeps the bar and Stop; setup not offered | DONE - `CAPTURING` includes `stalled` (`DailyRecorder.tsx:33`); the bar is drawn for all three; `active` stays true so `TeacherRecorder.tsx` hides "Microphones" and `onSetup` is guarded. |
| 2 | `starting` has no red dot | DONE - the dot only when `state === "recording"`; "Starting...", after 5 s "Saving on this laptop - the school server has not confirmed yet" as an alert. |
| 3 | `error` screen | DONE - "This lesson is not being recorded" + the engine's text; may arm the next lesson, not the same one. |
| 4 | title prefixes | DONE - one regex with all four. |
| 5 | a view per new code, no Reload while capturing | DONE (`recorderUi.ts:249-265`; the button handler also refuses reload while capturing). |
| 6 | error board | DONE (`boardAdd/boardClear/boardShow`). |
| 7 | `device_lost` / `device_restored` | DONE - "Still missing - plug it back in; the recorder is looking for it"; restore clears both sets and both board entries. |
| 8 | clipping on the meter | DONE. |
| 9 | `mic_silent` until `recovered` | DONE. |
| 10 | `stuck`, `othersPending`, typed DISCARD | DONE, but see C3-b. |
| 11 | sign-out through the recorder; engine per user | PARTLY - see C3-c. The engine is re-created on a user change (`key={`${key}-${user.id}`}`). |
| 12-14 | `RecorderLike`, `durable`, upload line, no folder backup | DONE. |

A state with no Stop button: none found among `starting / recording / stalled` (one bar, one Stop, `stop("manual")` works in all three; the 30 s encoder timeout means `stopping` can no longer hang). A false red dot from the screen itself: none - the dot follows `state === "recording"` only. (The engine can hold `recording` while nothing reaches the server: R3-B1.)

What I found that is not on the list:
- **C3-a - MUST FIX before a real class: leaving the page inside the app ends the recording silently.** `DailyRecorder.tsx` (`useEffect(() => () => { void rec.current?.dispose(); }, [])`) disposes the engine on unmount. `TeacherRecorder` keeps it mounted across its own three views, but any Layout link (attendance, the class page - what a teacher does during a lesson) is a client-side route change: the page unmounts, `dispose()` drops the audio callbacks and the timer, no Stop is sent, nothing is said (the screen is gone), and `dispose()` does not close the microphones, so the browser's own microphone indicator stays on. `beforeunload` (the engine's guard) does not fire for a route change, and nothing blocks the route (no `useBlocker`, checked in `App.tsx` / `Layout.tsx`). Everything from that moment to the teacher's return is not recorded; on return and "Ready" the capture is closed as `crash_recovered`. This existed before round 3 and I missed it in review 2; it answers this review's question ("silently fail to record") with yes. Fix, either: block the route while `active` (confirm dialog "Stop the recording first"), or hold the engine above the router so it outlives the page and show the recording bar in Layout. And `dispose()` while capturing should itself end the capture properly (flush, close the microphones, queue the Stop) rather than abandon it.
- **C3-b (major): on a day with no lesson the screen offers nothing.** The early return for `!lesson && !capturing && !SAVING` renders only "No more lessons to record today": no "Ready for today" button, so `recover()` never runs and yesterday's unfinished upload is not resumed until the teacher's next lesson day; the `stuck` / other-account notices and the DISCARD dialog are not rendered there either. Unsent audio waits on the laptop for days for no reason. Fix: run `prepare()` + `recover()` whenever the page is opened (uploads need no gesture) and render `heldBox` in that branch.
- **C3-c (minor): the sign-out guard exists only while the recorder page is mounted and "Ready" was pressed** (`rec.current`); a sign-out from any other page skips `rec.signOut()`, so confirmed audio of an unfinished upload stays in IndexedDB until that teacher next opens the recorder. No warning about unsent audio either.
- C3-d (minor): for "both microphones gone" the bar says "NOT RECORDING - restarting the audio" (the board entry has the right words); the meters keep their last level during a context stall.
- No render test exists: `ui.test.mjs` covers `recorderUi.ts` only. Removing `"stalled"` from `CAPTURING` (the Stop bar vanishing in the worst moment) is caught by nothing (section 4, N6). These screens have never been opened in a browser by anyone in this workstream; the owner's first hardware session is also their first render.

## 7. For the owner: may unsent audio stay on the laptop until someone types DISCARD?

My recommendation: **yes while the server can still take it, no once it cannot.**
- While the recording is still open on the server (up to 14 days, `stale_upload_days`), the laptop holds the only copy of a lesson. Deleting it automatically would be the engine destroying a lesson; keep it, show it (it is shown), and resume the upload without anyone asking (C3-b).
- Once the server has abandoned or deleted the recording, the audio can never be sent (`recorder_can_upload` refuses) and there is no export tool (the folder backup was rightly removed). From then on it is children's voices in plain IndexedDB on a shared classroom laptop, serving nobody. Delete it automatically 14 days after that point, with the countdown shown on the recorder page and the typed DISCARD still available earlier. An admin who wants a longer rescue window should get an admin-only export, not an indefinite local copy.
- Independently: one Windows account per classroom laptop is not enough protection for this data; turn on BitLocker on that laptop, and do not let the browser profile sync.

## 6. No real audio, transcript or derived data in the repo

- `git log --numstat d0d18b7..bb70791`: the only binary files in the whole range are PNG screenshots under `docs/evidence/A4.6/` (the conductor branch's tuition work, merged in; not this workstream). No `.wav/.flac/.mp3/.ogg/.webm/.m4a/.opus/.pcm/.zip/.npy/.mp4` was ever added. No blob over 300 kB exists in the range. The one added fixture is `scripts/pgtest/fixtures/tuition-figures.golden.json` (tuition).
- Real-audio references left in the tests: `unit.test.mjs:191-193` (a path string; read only when `RECORDER_REAL_AUDIO=1`), comments in `harness.mjs` / `browser.test.mjs`. `harness.mjs:21` now defaults to a synthetic WAV OUTSIDE the repo (`C:/Users/Dell/hec-tools/c2r-harness/synthetic.wav`), made by `scripts/recorder/make-synthetic-wav.mjs` (read: harmonic tones + noise from a seeded generator, no input file).
- The default path of every suite is synthetic: unit (the `FakeSource` sine + noise), pgtest (SQL only), ui (no audio), browser (the synthetic WAV unless `RECORDER_WAV` names another file).
- The implementer's note is accurate: before the guard, the unit suite read the lesson file in place. So did mine in review 2 (above).

## Verdict

**PASS WITH CHANGES.** The three blockers of review 2 are closed, the eight majors are closed (N-M2 with a reservation), my six surviving mutants are all caught now, the migration change cannot be used to fake evidence, and every suite is green as claimed. Two changes are mandatory before any real class; neither is a redesign, and I do not need to see the engine again if each lands with the test named.

Must fix before a real class:
1. **R3-B1** - the 30-minute cap on `pre_start_ms` (`20261112100000_class_recorder.sql:1012`) that the engine and the test fake do not know: a Start more than 30 minutes after capture began leaves the whole lesson on the laptop, the Stop unsent, the red dot on and "kept and sent" on screen (Q1). Remove the cap or teach all three; a refused pre-start must end in a plain "cannot be sent", not an endless retry. Tests: SQL at 30 min + 1 ms; engine at 31 minutes offline with the fake enforcing the SQL's rule.
2. **C3-a** - leaving the recorder page by an in-app link disposes the engine: the recording stops silently, the microphones stay open. Block the route while active or hold the engine above the router; `dispose()` while capturing must end the capture properly. Test: a render or router-level test that navigation while `active` is refused.

Majors (before unsupervised use):
- **R3-M1** filled silence inside a mixed chunk counts as recorded audio (Q3: 73 of 262 s); state the padded total and subtract it in the view.
- **R3-M2** audio captured before a stated "no" (switch-off, consent, cancellation) is kept instead of deleted.
- **C3-b** no "Ready" / recover / held-audio notices on a day without a lesson.
- **R3-M3** tests for the four survivors (N1, N3, N4, N5), the untested bounds of the new trigger (section 3, R3-3), and one render test of the recorder screen (`stalled` keeps Stop; `starting` has no red dot).

Minors: `pre_start_ms` re-sent on every pass; `recorder_session_evidence` should expose `pre_start_ms`; the sign-out guard only on the recorder page (C3-c); bar wording for "both microphones gone" (C3-d); an ownerless unfinished row the server does not know cannot be discarded; the hung Worker is not terminated.

## Real-hardware checks for the owner, before a real class

On the school laptop, the real S500 and lapel receiver, Chrome or Edge, a test lesson with no children:
1. First render: open `/teacher/recorder`, run the microphone setup, press "Ready for today"; watch a whole short lesson arm, start, record and reach "Saved". Nobody has seen these screens in a browser yet.
2. Read-back on the real pair: echo cancellation / noise suppression / auto gain reported OFF for both; native sample rates; both labels written down.
3. Wi-Fi off from before the window opens for 10 minutes, then on: bar says "Saving on this laptop - the school server has not confirmed yet" (no red dot), then "Recording"; afterwards the admin panel shows the whole lesson including the first 10 minutes. Repeat with 35 minutes off once R3-B1 is fixed.
4. Close the lid for 1 minute, and separately let Windows sleep for 12 minutes, mid-recording: "NOT RECORDING" on return, recovery by itself, a gap in the recording of about the right length, and the chunks after it not marked late.
5. Pull the S500's USB plug for 10 s, then 2 minutes, then re-plug into a DIFFERENT port: "Room microphone ... unplugged" at once, the lapel keeps recording, the S500 comes back by itself. Same for the lapel receiver.
6. Pull BOTH (or the hub): "NOT RECORDING" with the Stop button still there; both come back by themselves.
7. Leave the laptop recording for a full 90 minutes with the recorder tab hidden behind the lesson material: no stall, both tracks whole. Then the S500 "54:51" question: does it survive the hour (USB selective suspend off in the Windows power plan)?
8. During a recording click another menu item of the app (attendance): until C3-a is fixed this ends the recording - confirm the fix refuses it.
9. Speak loudly into the lapel: the meter shows "Too loud - clipping"; set the receiver gain so normal speech does not. Mute the lapel: "... is silent" within seconds, and it clears when unmuted.
10. Press Stop with the Wi-Fi off, then turn it on: "Not stopped on the server yet", then "Saved".
11. Clap test at minute 1 and near the end: the two tracks stay aligned (offset under 20 ms, growth under 10 ms).
12. Two back-to-back lessons on one "Ready": the second arms and records; a microphone that was dead in the first is reported again in the second.
13. A second teacher signs in on the same browser profile: sees "another teacher has unsent audio" if there is any, cannot touch it; sign-out during a recording is refused.
14. After a complete lesson: DevTools > Application > IndexedDB `hec-recorder` holds nothing of it.
15. After the migrations are pasted: one admin POST to `recorder-retention`; `select jobname from cron.job where jobname like 'recorder-%'` shows two jobs; next morning the nightly call answered 200.
16. Disk: BitLocker on; under 2 GB free the page refuses to arm.
