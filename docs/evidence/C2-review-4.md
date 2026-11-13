VERDICT: PASS WITH CHANGES (fit for the supervised hardware checks with the backup recorder; R4-1, R4-2 before unsupervised use)

# C2 review 4 - delta review of round 4 (`git diff bb70791..596ce69d`, recorder files only)

Reviewed commit: 596ce69d (`worktree-agent-a4803c8e10a251526`). Code read and run in the detached worktree `.claude/worktrees/c2r2`; this file is committed on `claude/hec-conductor-setup-efbaa5`.
Review only: no product code changed, nothing deployed, pushed or applied. Synthetic audio only (`RECORDER_REAL_AUDIO`, `RECORDER_FLAC_CHECK`, `RECORDER_WAV` unset in every run).

**Where I am / next step:** DONE. Verdict PASS WITH CHANGES; fit for the supervised hardware checks with the quick recorder as backup; R4-1 and R4-2 before unsupervised use.

Probes V1-V7: the unit suite's harness (lines 14-33, 296-403, 775-789 of `scripts/recorder/unit.test.mjs`, verbatim) + my scenarios, synthetic source, unmodified engine; saved as `docs/evidence/C2-review-4-probes.mjs.txt`. File:line is at 596ce69d.

## 1. R3-B1: the 30-minute cap removed - judged as a security and privacy change

**The decision is sound.** What bounds `pre_start_ms` now (`supabase/migrations/20261112100000_class_recorder.sql`, the update trigger): `LEAST(OLD.max_duration_ms, started_at - capture_opens_at)`.
- **Who sets the window.** The server, in the insert trigger: `capture_opens_at := lesson start - pre_roll_minutes` (:910), `capture_closes_at` (:911), `max_duration_ms := closes - opens` (:912), from the session row and `recorder_settings`; the update trigger refuses any change to the three (:982-984). The client sets none of them. `started_at` is the server's `now()` at the Start and must fall inside the window.
- **How far back.** Never before `capture_opens_at`, i.e. at most the pre-roll (5 minutes) before the scheduled lesson, on the lesson's own day. Not "long before the lesson". (Because `started_at < capture_closes_at`, the second term is always the smaller one; `max_duration_ms` in the `LEAST` is belt and braces.)
- **Storage abuse.** Unchanged. The most a client can claim is one window of audio per track, which a recording started at the opening could always hold; objects are still limited to registered paths, 8 MB each (:99), one row per seq.
- **Evidence and `started_at`.** Unchanged from review 3: a chunk is live only if `t_start_ms >= pre_start_ms`; `verified_audio_ms` is still capped by `ended_at - started_at`; `started_at` stays server-owned. No length of pre-start audio can become evidence. The view now also exposes `pre_start_ms` (review 3, R3-2).
- **One expression, three places - yes.** The trigger; `chunkMath.preStartLimitMs` (used by `adoptServerStart`); the fake (`fake-recorder-server.mjs`: `Math.min(old.max_duration_ms, Math.max(0, Math.floor(started - opens)))`). `unit.test.mjs:1659` reads the trigger's text out of the migration with a regex, asserts no `1800000` is left, and compares the engine's values; the SQL suite computes the bound in SQL and tests bound + 1 ms refused, 30 min + 1 ms accepted, another teacher's attempt changing nothing. My mutant X2 (section 4) checks the engine side.
- V2, the round-3 failure, 35 minutes offline: `2 min after the network is back: state recording | pre_start_ms 2117124 | ... server complete | teacher s on server 2220` - all of it.

**The refusal path (three refusals -> "cannot be sent").** By reading and V1: capture stops, the last audio is flushed and stored, the microphones close, the row is abandoned, the state is `error`, and the recording is listed in `heldAudio` (deleted 14 days later). No audio is lost in that path; it is stranded on the laptop by design and said so. The red dot is held back until the offset is accepted (`capturingState`: `startedAtServer && preStartAcked !== false`), and `start_delayed` ("the server has accepted all of it") is said only after acceptance. All true - when the refusal is real.

**R4-1 - MUST FIX before unsupervised use: the path is entered by answers that are not refusals.** `sendPreStart` counts every `server_refused && !retryable` error, and `toRecorderError` gives that shape to anything it cannot classify. EVERY recording states an offset (any real Start takes some milliseconds, so `pre_start_ms > 0`). V1, an ordinary start (0.4 s), the pre-start UPDATE answered `{message: "Too Many Requests", code: "429"}` three times (about 10 s):
```
pre_start the engine wanted to state (ms): 400 | calls 4
state error | states ready,armed,starting,error | microphones open false | server abandoned | chunks on server 0
'This recording CANNOT be sent to the school server (Too Many Requests). Recording has stopped; the 10 s recorded are kept on this laptop and listed there.'
```
The lesson is not recorded, the row is abandoned (so even the 10 s can never be sent), and the message is false - it could have been sent. A burst of 429s, or PostgREST's "no rows" while the session is briefly anonymous, lasts longer than three passes. This is review 2's N-B2 again (only a refusal the server STATED may end a recording), in a path every lesson goes through. It is loud, not silent. Fix: count only the trigger's own text (give "can be stated once, before any chunk" its own `ServerRefusal` in `errors.ts` and test for that); everything else retries with backoff while capture goes on. Test: V1.

## 2. C3-a: the engine above the routes (`src/components/recorder/session.ts`, `RecordingBar.tsx`, `DailyRecorder.tsx`, `controller.ts` `dispose`)

What holds:
- **Leaving the page keeps recording.** The engine is held at module level; `DailyRecorder` attaches / detaches; `maybeEnd` disposes only when no screen is attached AND the state is not busy (`armed`, the three capturing states, `stopping / uploading / finalizing`). Listeners of the unmounted screen are removed (`offs`).
- **The bar.** Plain DOM appended to `document.body` (fixed, bottom, z-50), outside the React tree, so no route or layout can unmount it; it shows the state in words, the red dot only for `recording`, Stop (with a confirm) in the three capturing states, and "Open the recorder". It belongs to the tab's module state, not to a route or role: it is drawn on any page of that tab, including student / parent routes if a teacher's tab is navigated there.
- **`dispose()` while capturing** ends the capture first. V6: `microphones open false | server uploading stop_reason manual | teacher s on server 25` - stopped properly and the Stop delivered; the manifest / `complete` step is left for the next time the recorder is open (the engine is gone by then), which is correct.
- **Sign-out** goes through the session's guard from any page: refused while capturing, a warning when audio is unsent, then `rec.signOut()`. **User change**: `sessionFor(otherUser)` ends the first user's session (mutant X1 caught).
- **Two tabs**: unchanged engine rule (`navigator.locks`, the second tab's `prepare()` is refused as `another_tab`); the bar exists only in the tab that owns the engine.

What does not:
- **R4-2 - MAJOR: "Ready for today", then leaving the page, records nothing and says nothing.** Only the ENGINE moved above the router; the decision to arm did not. `r.arm(...)` is called from an effect of `DailyRecorder` (it needs the mounted screen's lesson list and its `clicked` state), `ready` is not a busy state, so on leaving the page before the lesson is armed (arming opens 20 minutes before the lesson) the session is ended and disposed; no bar, no warning. The same for the second of two back-to-back lessons when the teacher is on another page as the first one ends. And `clicked` is component state: coming back shows "Ready for today" again and nothing arms until it is pressed again. So C3-a is closed for a lesson that was already ARMED when the teacher left, and open for one that was not: the lesson silently never starts. The screen does say "keep this page open" in that state; that sentence is now the only protection. Fix: move the arming rule (lesson list, `clicked`, back-to-back `stopAt`) into `session.ts`, or at least keep the session and draw the bar in `ready` ("NOT armed yet - open the recorder before the lesson").
- **Hard reload / crash on another page (minor).** The engine's `beforeunload` prompt still guards a reload while armed or capturing. If the tab does die, the module state is gone and nothing on the page that reloads (attendance, say) tells the teacher the recording stopped; it is recovered only when the recorder page is next opened. A one-line check at app start (an unfinished capturing recording of this user in IndexedDB -> the bar "the recording was interrupted - open the recorder") would close it.
- **User change without the guard (minor).** The session ends another user's engine only when the NEW user opens the recorder page. A session that ends without `guardedSignOut` (token expiry, a sign-out in another tab) leaves the first teacher's engine and bar alive in the tab for whoever signs in next. The server refuses everything from then on and local ownership is unchanged, so nothing leaks; subscribe the session to the auth state and end it there.
- **What can hide the bar (for the hardware list).** Anything shown with the browser's Fullscreen API (a lesson flipbook in full screen) hides every element outside it, the bar included; a modal dialog covers it; other fixed bottom elements (the mobile nav, the assistant button) share its place. None unmounts it.
- `kill()` (crash simulation for tests) is a public method of the engine; harmless, but it is the old silent `dispose` - keep it out of `RecorderLike`.

## 3. The three majors of review 3

- **R3-M1 filled silence - FIXED, in the SQL view too.** Client: `manifest.paddedInside` (exact overlap of each fill with chunks that are not below the floor) is stated per track with the counts (`finalize` -> `setTrackCounts(..., padded_ms)`). Server: `class_recording_tracks.padded_ms` (`>= 0`, writable only by the recorder on its open recording, same policy as the counts), and `recorder_session_evidence` computes `GREATEST(0, live_ms - padded_ms)` and `GREATEST(0, lesson_ms - padded_ms)` and exposes `padded_audio_ms`. V3, the round-3 scenario: `silence filled (s) 73 | teacher s on server 262 below_floor 0 | stated per track: teacher total_ms 262396 padded_ms 73212; room ... padded_ms 73212` - exactly the fill. The whole figure is subtracted from lesson time even when part of the fill lies outside the lesson: an under-count, the safe side. Mutant X3 (the view's lesson subtraction removed) is caught by the SQL suite.
- **R3-M2 a stated "no" - FIXED.** `DELETE_ON_NO` = switch_off, consent_missing, session_canceled, not_teacher: the local copy is purged at once and nothing is sent. V4, both texts after 3 minutes of waiting: `state error | mics open false | local row false bytes 0 | server chunks 0 | "... The 189 s captured before the school's answer have been DELETED from this laptop; nothing was sent."` `consent_missing` is final (mutant N3 now caught, section 4). A server-side abandon for switch-off / consent / cancellation purges what was not taken (`pollServer`), and chunks refused as "asked to stop" lose their bytes (`dropForbidden`). One loose end: the purge in `pollServer` is chosen by a regex on `abandon_reason` text (`/switch|consent|cancel/`), not by a code; if the wording in the migration changes, audio that must go would be kept. Minor; tie the two with a test that reads the migration, as was done for the limit.
- **C3-b a day with no lesson - FIXED, with one limit.** The page prepares and recovers by itself when opened (`ready(false)`; the "one click needed" notice is suppressed for that pass; arming still needs the click), and the no-lesson branch renders the error board, the unsent / stuck list and the Discard dialog. Limit: resumed uploads of EARLIER recordings do not make the session "busy" (the state stays `ready`), so leaving the recorder page ends the session and pauses them until the page is opened again. Not a loss. Count pending uploads as busy when R4-2 is done.
- **The 14-day deletion (owner's ruling) - DONE as specified.** `abandonedAt` is stamped when the local phase becomes `abandoned`; `recover()` deletes the unsent audio once `abandonedKeepMs` (14 days) has passed and says so; `heldAudio().deleteAt` carries the date and the screen prints it ("it is deleted from this laptop by itself on <date>"). V5: `phase abandoned | held ['164 MB deleteAt +14 d']`; page opened 13 days later: still 164 MB, nothing said; 2 days after that: `bytes held 0 | row false | 'Unsent audio from 2026-11-12 was deleted from this laptop: the server gave that recording up more than 14 days ago.'` It runs only when the recorder page is opened (that is when `recover()` runs), so on a laptop nobody opens the recorder on, the audio outlives the date; acceptable, and worth one line in the runbook. While the server can still take a recording nothing is deleted (mutant X4 shows the test for that).

## 4. Suites and mutations, run here

Suites (c2r2 at 596ce69d; `node_modules` as a junction, removed at the end with `cmd //c rmdir node_modules`):

| Suite | Result here | Claim |
|---|---|---|
| `tsc --noEmit -p tsconfig.app.json` (alone) | exit 0 | exit 0 |
| `node scripts/pgtest/run.mjs` | **4042 assertions across 45 suites, 0 suite(s) failed**, exit 0 | 4042 / 45 / 0 |
| - recorder engine (`unit.test.mjs`) | 445 / 0 (and six more full runs under mutants) | 445 / 0 |
| - recorder screens logic / screens render | 30 / 0, 26 / 0 | same |
| - class recorder SQL | 423 / 0 | 423 / 0 |
| - recorder retention / cron / app typecheck / edge functions typecheck | 37/0, 22/0, 3/0, 5/0 | same |
| `browser.test.mjs` | not run (the implementer did not re-run it this round either) | - |

Mutations - **8 of 8 CAUGHT**. Engine mutants are throwaway copies outside the repo (`RECORDER_SRC`); X1 and X3 were made in place in my review worktree, run, and restored with `git checkout --` (worktree clean afterwards).

| # | Mutant | Result | Caught by |
|---|---|---|---|
| N1 | chunks registered before the offset is acknowledged (`uploader.ts` gate removed) | CAUGHT 444/1 | "N1: with the offset not yet acknowledged nothing is registered" |
| N3 | `consent_missing` not a final Start refusal | CAUGHT 443/2 | "N3 (consent missing): final ..." and "R3-M2 (consent missing): ... DELETED" |
| N4 | the end of a stall ignores "no microphones" | CAUGHT 444/1 | "N4: audio flows again but there is still no microphone: `stalled`" |
| N5 | silence fill unbounded | CAUGHT 444/1 | "N5: a 35-minute stall is filled with at most 30 minutes" |
| X1 | session ownership: another user is handed the first user's engine (`session.ts` `sessionFor`) | CAUGHT 25/1 (`screens.test.mjs`) | "another teacher signing in never gets the first one's engine" |
| X2 | pre-start limit: the engine's function ignores `max_duration_ms` | CAUGHT 444/1 | "R3-B1: the engine's limit is the same expression" |
| X3 | silence subtraction: the SQL view no longer subtracts `padded_ms` from lesson time | CAUGHT 422/1 (`recorder.test.mjs`) | "R3-M1: 10 minutes of filled silence stated ... the 38 left are not evidence" |
| X4 | 14-day purge: audio the server gave up is deleted at once | CAUGHT 440/5 | "ruling: still kept after 13 days" and four more |

Render tests now exist (`screens.test.mjs`, react-dom/server on `RecordingBar` and the session). They cover the bar and the session; `DailyRecorder.tsx` itself (the arming effect, the `clicked` state - where R4-2 lives) is still rendered by nothing.

## 5. Test hygiene

- No default or CI path reads a real lesson file. `unit.test.mjs:190-193`: the FLAC ratio check runs only with `RECORDER_FLAC_CHECK=1` and then reads the SYNTHETIC WAV unless `RECORDER_FLAC_FILE` names another file; the hard-coded lesson path is gone from the file. `harness.mjs:21` (browser suite) defaults to the synthetic WAV. `run.mjs` sets none of these variables; the repo has no workflow that does. The only mentions of the real-audio folder left are two comments (`browser.test.mjs:6`, `harness.mjs:10`).
- `screens.test.mjs` writes its bundle to the repo root as `.screens-test.<pid>.mjs` and removes it; a killed run would leave an untracked file there. Harmless; note it.
- The delta adds no binary or audio file (`git diff --stat bb70791 596ce69d` on the recorder paths: 17 text files).

## Verdict

**PASS WITH CHANGES.** Both mandatory changes of review 3 are closed as asked (the cap is gone and the limit is one expression tied by tests; the engine outlives the page and `dispose()` ends a capture properly), the three majors are closed, all eight mutants are caught, and the suites are green as claimed.

**Fit for the owner's hardware checks on a real class, with the quick recorder running alongside as the backup: YES**, on two conditions for that session: press "Ready for today" and stay on the recorder page until the bar says the lesson is armed or recording (R4-2); treat a red "This recording CANNOT be sent" in the first seconds as a reason to rely on the backup for that lesson (R4-1). Not yet fit for unsupervised daily use.

Before unsupervised use:
1. **R4-1** - three unclassified answers (429, "no rows") to the pre-start statement end the capture and abandon the row with a false "CANNOT be sent" (V1). Count only the trigger's own refusal text; retry everything else.
2. **R4-2** - "Ready for today" followed by leaving the page before the lesson is armed (or between two back-to-back lessons) records nothing and shows nothing: arming still lives in the page. Move arming into the session, or keep the session and show the bar while `ready`.

Minors: resumed uploads of earlier recordings pause when the page is left; nothing tells the teacher after a crash / hard reload on another page; the session does not follow auth changes that bypass the guard; the purge after a server-side "no" is chosen by matching the reason's wording; fullscreen content hides the bar; `kill()` is public; the 14-day deletion runs only when the recorder page is opened.

Hardware checks: review 3's list stands, with item 3 at 35 minutes offline, item 8 = "navigate away while recording: the bar with Stop follows, the recording continues", and two additions - (17) press Ready, leave the page BEFORE the lesson arms, and see what the lesson does (today: nothing; R4-2); (18) put the lesson material in full screen while recording and confirm the teacher still knows it is recording (the bar is hidden).
