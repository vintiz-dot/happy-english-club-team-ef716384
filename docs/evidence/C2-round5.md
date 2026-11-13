# C2 round 5 - R4-1, R4-2, the review-4 minors, full screen, the sidebar entry, the runbook

Base: merged `claude/hec-conductor-setup-efbaa5` (f4fe32bf). Synthetic audio only (`RECORDER_REAL_AUDIO`, `RECORDER_FLAC_CHECK`, `RECORDER_WAV` unset). No apply, no deploy, no push. No migration changed this round.

**Where I am / next step:** DONE. Suites green, 10 of 10 mutants caught, node_modules link removed, no process left. Next: review 5.

## 1. R4-1: only a refusal the server STATES ends a recording at the pre-start statement

- `errors.ts`: the update trigger's one text ("... can be stated once, before any chunk ...") is its own refusal, `pre_start_refused`, matched first.
- `controller.ts sendPreStart`: final only for `FINAL_PRE_START_REFUSALS` = `pre_start_refused`, `recording_closed`, `not_your_recording` (all texts the server raises). Anything else (429, PostgREST "no rows", a timeout, an unclassified answer, offline) increments `preStartAttempts` and waits `preStartNextAt` (the shared backoff, 1 s doubling to 60 s), for as long as it takes; capture carries on, every chunk is stored locally, the state stays `starting` (no red dot), and the screen is told `server_unavailable` "...not yet confirmed when this recording started ... It is asked again; recording carries on and every piece is kept on this laptop" - not a refusal. A `not_signed_in` answer refreshes the session first.
- When the refusal is real: capture stops, the row is given up, `abandonedAt` is stamped at once, the audio is held (listed, with its deletion date: the unsent-audio rule, 14 days), and the message says the server refused it, that it is final, to use the backup, and for how long the audio is kept.
- Tests (`unit.test.mjs`, "R4-1"): the trigger's text read from the migration classifies as `pre_start_refused` and four other answers do not; 429 x 8, "no rows" x 8, a 504 timeout x 8 and an unclassified error x 8, each then success: still capturing after 40 s, no "cannot be sent", nothing abandoned, every chunk kept locally, retries spaced with growing gaps (never above 60 s), then `recording`, the stated offset equals the server's, Stop completes with all audio on the server. Four 429s then the stated refusal: final at the stated one (5 calls), the audio held. The round-4 stated-refusal test now also checks the held audio's deletion date and the new wording.

## 2. R4-2: arming lives in the session

- `session.ts` now owns the arming rule (`armTick`, every 5 s, and on each engine state change): the first of today's lessons that is not over, not armed today and not switched off; armed once its arm window opens; the back-to-back stop at the next lesson's start; a stated refusal ends that lesson for today, anything else retried in 30 s; never armed while a microphone is missing or sound is not allowed (both re-checked with `prepare()` every 30 s in the arm window).
- "Ready for today" is stored as `hec-recorder-ready:<user id>` = `{date, armed[], capturing}` in localStorage: that teacher, that day, this device. It survives navigation and reloads; another user never reads it; `followUser` (auth state) and both sign-out hooks clear it.
- The session is kept while a lesson waits on Ready, while anything is busy, and while uploads of any recording are pending (review 4's C3-b limit); otherwise disposed as before.
- After a reload: `RecorderBoot` (mounted once in `App.tsx`, lazy, renders nothing; the capture engine is loaded only when Ready is set today) brings the engine back on any page: prepare, recover, start the day. A lesson that was capturing when the page died is armed again for the rest of it (the part recorded is finished by `recover`); one the teacher Stopped stays done. A second tab whose `prepare` is refused gives up (the first tab arms). After a reload the browser may want one click for sound: the bar then shows "Allow sound" and says the next lesson will not record without it.
- The bar now says: "Ready for today - <class> records from HH:MM", "Armed - <class> - recording starts at HH:MM by itself", then the recording states; "NOT armed: <why> - open the recorder" as an alert; "The page was reloaded during the lesson ...".
- `DailyRecorder.tsx` no longer arms (its arm effect and `armedFor` are gone); Ready is read back from the session; its "Ready" button becomes "Allow sound" after a reload; the armed line says other pages may be used.
- Tests (`screens.test.mjs`, "R4-2", against a scripted engine): leave before arming (kept, bar text, armed at 09:40 with no page, the bar's "starts at 09:55", then recording, armed once, ended after the day); back-to-back (stopAt, not armed while capturing, armed while the first uploads); reload between lessons (engine back on any page, the recorded lesson not armed again, the next one arms); reload during a lesson (the rest re-armed, "reloaded" said; a Stopped lesson stays done); a second teacher (first one's Ready cleared and session ended, nothing armed for the second, key per user, per day, a guard-less sign-out clears it); sign-out with and without an engine clears Ready; no Ready = idle disposal as before; switched-off class skipped; arm failure retried after 30 s, stated refusal not retried; no sound / missing microphone never armed, said as an alert, "Allow sound" arms; a second tab's boot gives up. Engine-level (`unit.test.mjs`, "R4-2 (engine)"): the real engine arms B while A is still uploading; both complete, both tracks contiguous, nothing refused.

## 3. Minors of review 4 and the two extra hardware checks

- Resumed uploads of earlier recordings keep the session (tested).
- After a crash or reload on another page: `RecorderBoot` + the "reloaded" bar (tested at session level; hardware item 19).
- The session follows the auth state (`followUser`): another user ends the first one's session; a sign-out that bypassed the guard clears Ready and ends an idle session (a capturing one is not cut by an expired token: the server refuses what it must and the audio stays under its owner).
- The purge after a server-side "no" is chosen by the server's own codes (`SAID_NO_ABANDON_REASONS` = `switch_off`, `session_canceled`), tied by a test that reads every `abandon:<code>` the migration writes; behaviour tested for switch_off and session_canceled (deleted) and "never finished" (kept).
- `kill()` stays out of `RecorderLike` (asserted).
- Full screen: the bar is moved into `document.fullscreenElement` on `fullscreenchange` (the A2.1 M5 finding: anything outside the full-screen element is invisible), and drawn even while the recorder screen is attached when a page is full screen; Stop asks again inside the bar ("Yes, stop recording") instead of `window.confirm`; z-index max and `pointer-events: auto` so a modal dialog neither covers nor disables it. Hardware item 18.
- The 14-day deletion now also runs when the app boots with Ready; the runbook says a laptop nobody opens keeps it longer.

## 4. Sidebar entry

`src/components/Layout.tsx`: "Class recorder" (Mic icon) -> `/teacher/recorder` in the admin and teacher lists only (the route was already `ProtectedRoute allowedRole={["teacher","admin"]}`). Asserted by `screens.test.mjs`. Shared files touched this round: `Layout.tsx` (this entry + the icon import), `App.tsx` (the lazy `RecorderBoot`, 3 lines).

## 5. Documents

- `docs/RECORDER_RUNBOOK.md` - one page for a teacher: before, during, after, every message and what to do, when to use the backup.
- `docs/evidence/C5-owner-hardware-checklist.md` - review 3's 16 checks and review 4's additions merged into 20 numbered checks with expected results and tick boxes.

## 6. Suites and mutations

| Suite | Result |
|---|---|
| `node scripts/pgtest/run.mjs` | **5141 assertions across 53 suites, 0 failed**, exit 0 |
| - recorder engine (`unit.test.mjs`) | 504 / 0 (445 in round 4) |
| - recorder screens logic / render | 30 / 0, 74 / 0 (26 in round 4) |
| - class recorder SQL / retention / cron | 423 / 0, 37 / 0, 22 / 0 (no migration changed) |
| - app typecheck (`tsc -p tsconfig.app.json`) / edge functions typecheck | 3 / 0, 5 / 0 |

The first engine run found two real things, both fixed: a given-up recording was asked for its pre-start again on the next pass ("cannot be sent" said twice) - now `sendPreStart` returns at once for an abandoned recording, and the test asserts the message once; and the backoff gap check allowed no drive-pass granularity (a 68 s gap at a 60 s cap with passes ~8 s apart) - tolerance one pass.

Mutations - **10 of 10 CAUGHT**. Engine mutants are copies outside the repo (`RECORDER_SRC`, scratchpad); session mutants were made in place and restored by the script (worktree clean afterwards).

| # | Mutant | Result |
|---|---|---|
| E1 | pre-start: any non-retryable answer final again (the round-4 rule) | CAUGHT 475/29 |
| E2 | pre-start: the trigger's text not classified | CAUGHT 496/8 |
| E3 | pre-start: no backoff | CAUGHT 496/8 |
| E4 | purge: 'never finished' counted as a 'no' | CAUGHT 502/2 |
| S1 | Ready does not keep the session (arming back in the page) | CAUGHT 53/21 |
| S2 | Ready shared across users | CAUGHT 73/1 |
| S3 | a lesson armed today armed again after a reload | CAUGHT 67/7 |
| S4 | back-to-back: no arming while the first uploads | CAUGHT 73/1 |
| S5 | full screen: bar hidden while the screen is attached | CAUGHT 72/2 |
| S6 | sign-out does not clear Ready | CAUGHT 73/1 |

Not done here: `browser.test.mjs` (needs the harness browser), and nothing has been rendered in a real browser - hardware checklist items 1, 17, 18 and 19 are the first.
