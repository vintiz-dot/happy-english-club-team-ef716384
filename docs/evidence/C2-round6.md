# C2 round 6 - R5-1 (a failed arm is never silent), R5-2 (the Armed bar's time), render faults

Base: merged `claude/hec-conductor-setup-efbaa5`. Review: `00485225:docs/evidence/C2-review-5.md`. Synthetic audio only. No push, no apply. No migration and no engine (`src/lib/recorder`) change this round.

**Where I am / next step:** DONE. Suites green, 5 of 5 mutants caught, node_modules link removed, no process left. Next: review 6.

## 1. R5-1 (MAJOR): arming retries; only a stated refusal is final; never silent

`session.ts armTick`:
- Final only for `FINAL_ARM_REFUSALS` = switch_off, consent_missing, session_canceled, not_teacher, no_longer_teaching, window_closed, already_live, session_invalid (texts the insert trigger raises, classified by `errors.ts`). The lesson is marked done for today AND its reason (`refusalView(...).title`) is stored in the Ready record (`refused`), so it is said after a reload too.
- Anything else (429, PostgREST "no rows", 503, timeout, offline, unclassified) is retried with the shared backoff (`backoffDelay`, cap 60 s, as the pre-start and Stop), for as long as the lesson lasts; `notArmed` is set meanwhile.
- The bar (any page, full screen too) says "Not armed yet - retrying (<why>) - <class> should record from HH:MM" as an alert while not confirmed; on a stated refusal "This lesson will NOT be recorded: <reason> - <class>. Use the backup recorder." as an alert, until that lesson is over. The session is kept while a refusal is being said.
- The recorder page reads the same (`sessionState()`): an error notice for a refusal, "Not armed yet - retrying" for the rest, instead of "Getting the lesson ready..." for ever.

Tests (`screens.test.mjs`, "R5-1", the arm error built by the real `toRecorderError` from the raw answer): 429 x6, "no rows" x6, 503 x6 then success - retried until armed, nothing stored as refused, the bar shown on EVERY pass while not armed and saying "Not armed yet - retrying" as an alert, then "Armed"; 429 for 10 minutes - gaps grow to the 60 s cap, attempts never stop, the bar still says so in the capture window; stated consent missing / switched off / not your class - asked once, the bar says "This lesson will NOT be recorded: <reason> ... Use the backup recorder.", still during the lesson, still after a reload, gone once the lesson is over. The round-5 arm-refusal test was updated to the backoff.

## 2. R5-2: the Armed bar shows the armed lesson's time

`d.armedAt` is set when the arm succeeds and cleared when that lesson is over; the armed state prints it (`next` stays the following lesson). Test: lessons 10:00 and 14:00 - "starts at 09:55" at the arming pass and 5 s, 10 s, 60 s, 5 min later, never 13:55; a single lesson keeps its time.

## 3. Render faults

- The start failure drawn twice on the error screen: `recorderUi.boardForScreen` leaves `start_failed` out of the list on the error screen (the "not being recorded" notice carries it); DailyRecorder uses it. Tested.
- The phone header: `RecorderHeader.tsx` (new, used by `TeacherRecorder.tsx`) - the title block on its own row, the buttons in their own wrapping group, side by side only from `sm`. Rendered and tested. The admin class card: the switch button goes under the name on a phone (`flex-col sm:flex-row`).
- The warning sign only where action is needed: the floating bar prints it only on alerts; `RecordingBar` shows a clock, not the sign, for a calm start (< 5 s). Rendered and tested.
- The "Allow sound" help text no longer claims a reload.
- Runbook: the two new messages, "if a lesson is moved after Armed, press Stop and Ready again", check the laptop's date. Checklist: items 21 (switched-off class / missing consent, the refusal said) and 22 (laptop date and time).

## 4. Suites and mutations

| Suite | Result |
|---|---|
| `node scripts/pgtest/run.mjs` | **5894 assertions across 59 suites, 0 failed**, exit 0 |
| - recorder engine / screens logic / screens render | 504 / 0, 30 / 0, 118 / 0 |
| - class recorder SQL / retention / cron | 423 / 0, 37 / 0, 22 / 0 |
| - app typecheck / edge functions typecheck | 3 / 0, 5 / 0; `tsc --noEmit -p tsconfig.app.json` alone exit 0 |

Mutants (in place in `session.ts`, restored by the script; worktree clean afterwards) - **5 of 5 CAUGHT**: T1 any non-retryable arm answer final again (110/8); T2 a failed arm says nothing (114/4); T3 a stated refusal not on the bar (109/9); T4 no backoff (117/1); T5 the Armed bar shows the next lesson's time (113/5).

## Files changed this round

`src/components/recorder/session.ts`, `src/components/recorder/DailyRecorder.tsx`, `src/components/recorder/RecordingBar.tsx`, `src/components/recorder/RecorderHeader.tsx` (new), `src/components/recorder/RecorderAdminPanel.tsx`, `src/pages/TeacherRecorder.tsx`, `src/lib/recorderUi.ts`, `scripts/recorder/screens.test.mjs`, `docs/RECORDER_RUNBOOK.md`, `docs/evidence/C5-owner-hardware-checklist.md`, `docs/evidence/C2-round6.md`.
