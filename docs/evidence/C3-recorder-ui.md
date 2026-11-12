# C3 - Class recorder screens

**Where I am / next step:** DONE. All checks below green. Open: the Layout nav line (request below), the engine requests, and the hardware checks.

Nothing here touched the live project: no sign-in, no Supabase call, no deploy, no migration. The engine (`src/lib/recorder/**`), the migration, `src/components/ui/**`, Layout, `index.css` and the tailwind config are unchanged. No new npm dependency. No audio in the repo (the wizard's preview clips are a synthetic tone made in memory; the e2e reads the C2 lesson WAV in place through `scripts/recorder/harness.mjs`).

## What is built

| Path | What |
|---|---|
| `src/lib/recorderUi.ts` | pure helpers: lesson headline/phase/pick (Hanoi time, pre-roll, grace, arm window, back-to-back), stop confirmation, upload status words, upload speed, every `RecorderErrorCode` and `ServerRefusal` -> title/body/ONE action, meter words, device rows (S500 / lapel / Bluetooth / built-in), pair problems, swap warning from the engine's `SwapMeasurement`, browser and battery checks, consent gaps (current wording), status/audit/retention labels |
| `scripts/recorderUi.test.ts` | `bun test` for the above |
| `src/components/recorder/engine.ts` | the one door to the engine (`EngineApi`): `createRecorder`, profile load/save, device list/watch, `saveProfileToServer` (engine's `profileRow` + `supabaseBackend(client).upsertDeviceProfile`), and the wizard's **probe**: the engine's own `BrowserCaptureSource` (exact ids, processing off, read back), `measure()` for the meters, `swapVerdict()` for the swap check, `encodeWav` for the 10-second playback (blob: URL, in memory, never uploaded) |
| `src/components/recorder/RecorderDeps.tsx` | context: client, engine, clock (real by default; previews/tests inject) |
| `src/components/recorder/data.ts` | all reads/writes, as the signed-in user; writes only through `recorder_set_class_recording`, `recorder_record_child_consent`, `recorder_request_deletion` |
| `src/components/recorder/SetupWizard.tsx` | one-time setup, 6 steps |
| `src/components/recorder/DailyRecorder.tsx` | the daily screen |
| `src/components/recorder/RecorderAdminPanel.tsx` | admin panel |
| `src/components/recorder/HelpPanels.tsx`, `pieces.tsx` | numbered help; status line / notice / level meter / mic tick |
| `src/pages/TeacherRecorder.tsx` | `/teacher/recorder`: teachers get the daily screen + wizard; admins get the admin panel and can open the teacher screen |
| `src/App.tsx` | ONE edit: lazy import + `<Route path="/teacher/recorder">` (teacher, admin) |
| `src/components/CommandPalette.tsx` | ONE line: "Class recorder" in the teacher list (Ctrl+K) |

### Where things are mounted, and the nav request

- The teacher sidebar is defined in `src/components/Layout.tsx` (`getNavigationItems`, case "teacher"), which this task may not edit. **Request to the conductor (one line, Layout.tsx after the "Language Support" teacher entry, line ~114):** `{ icon: Mic, label: "Class recorder", path: "/teacher/recorder" },` plus `Mic` in the lucide import on line 5. Until then teachers reach it by Ctrl+K "Class recorder" or the URL.
- Admin panel: mounted the least invasive way - on the same `/teacher/recorder` page (admins land on it; a button switches to the teacher screen). No edit to `src/pages/Admin.tsx` or the admin nav. If the owner wants it under `/admin?tab=recorder`, that is two lines in `Admin.tsx` (import + `case "recorder": return <RecorderAdminPanel />`) and one nav line.

## Screens

**Setup wizard** (per browser): 1 Before you start (Chrome/Edge check, battery, help panels: lapel, S500 by USB not Bluetooth, AnkerWork switches off, Windows sound settings - audio enhancements off, input 100, "default communication device" not needed), "Allow the microphones" -> 2 device list (aliases dropped; badges "Looks like the Anker S500", "Looks like a lapel receiver", "Bluetooth - use USB instead", "The laptop's own microphone"; roles pre-picked only when exactly one input looks like each; Next blocked while a pair problem stands, e.g. the S500 on Bluetooth) -> 3 live meters for both, with the engine's swap verdict ("It looks like these are the other way round - speak normally and check" + Swap them) -> 4 record 10 s of both at once and play each back -> 5 Internet -> 6 Save (localStorage via the engine, then `recorder_device_profiles` upsert; a server failure keeps the local copy and says so).

**Upload speed test - what exists and what does not.** There is no path to upload a test object: `recorder_can_upload` accepts only a registered chunk path of the caller's own open recording. So the wizard says plainly that the speed is measured at the first lesson; the daily screen measures it from the engine's `chunk` events (register -> confirm time of confirmed chunks, last 20) and shows "Upload speed about X Mbit/s - fast enough (a lesson needs 0.75)" or a slow warning, and keeps the first figure in the local profile's `checks`.

**Daily screen**: "Starters 1 starts at 09:00 - recording from 08:55" from today's sessions (same read as TeacherDashboard's `teacher-today-sessions`); mic ticks from `prepare()`'s resolution; "Ready for today" (the click the AudioContext needs; also `recover()`); arms itself when the arm window opens, with the back-to-back stop (`stopAt` = next lesson's start); the engine starts at `capture_opens_at`. While capturing: a bar fixed to the bottom of the viewport ("Recording", elapsed time, class, Stop) - not dismissible, never scrolled away - and the tab title "● Recording - Class recorder"; per-track meters with words; upload status ("All saved" / "Saving 3 pieces" / "Offline - recording continues and will upload when the internet is back" / "Recorded offline too long - the last N minutes will not count" from `late`/`lateMs`); markers as large buttons (Roll-call start, Roll-call end, Activity) and optional name chips for children enrolled today (wrap, never truncate); a note that pre-roll and grace minutes are recorded but do not count as lesson time; ONE Stop with the confirm "Stop recording? The lesson has 12 minutes left." Errors: every code/refusal has a plain message and at most one action (tested). Switch off: a calm notice, nothing to press. The page keeps the recorder mounted when switching views, and hides the microphone check while armed/recording/saving (opening it would need the same mics).

**Admin panel**: Classes tab - current wording version; per class OFF by default, "Switch on..." dialog (tick "signed parental permission is on file for every child ... under wording v1-2026-11" + where the forms are kept) -> `recorder_set_class_recording`; the server's refusal is shown word for word; ON shows who confirmed, when, which wording and where the forms are; the list of children enrolled today without consent under the current wording (none / withdrawn / old wording) with "Record permission" (`recorder_record_child_consent`, note required); Switch off with optional reason. Recordings tab - class, date, lesson time, recorded by, status, verified duration and inside-lesson duration from `recorder_session_evidence` (server figures, not the laptop's), retention date, "Request deletion" with a required reason (`recorder_request_deletion`). Who did what tab - `recorder_audit_log`, newest first, with names. No playback.

## Checks

- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: **exit 0**, 0 `error TS`; with `--listFiles` it loaded 877 files under `src/` including the recorder screens (so the clean result is real, not an empty solution-file run).
- `npx --yes bun test scripts/recorderUi.test.ts`: **23 pass, 0 fail, 204 expect() calls**.
- Preview: `C:\Users\Dell\hec-tools\c3-harness\` (copied from a46-harness), port 5353, Vite with `@/integrations/supabase/client` aliased to a fake client (made-up names) and the screens given a scripted FAKE engine through `RecorderDepsProvider` (`preview/fake-engine.ts`: every state, upload status, unplug, swap verdict, permission). `node shoot.mjs <repo> <out>`. Reduced motion emulated. 24 states x 375 and 1280 = **48 screenshots** in `docs/evidence/C3/` (largest 145 KB).
- **axe (axe-core, all impacts): 0 violations on all 48.** Earlier runs found colour-contrast on the red recording bar, the destructive buttons and the Bluetooth badge (the theme's `destructive`/`destructive-foreground` pair fails AA) - fixed by using `foreground`/`background` with a red border/dot; and a doubled title (see engine notes). Small targets (< 44 px): 0 except the shadcn Dialog close "x" (16 px) in two dialogs - `src/components/ui/dialog.tsx` is out of bounds; Escape and the Cancel button (44 px) do the same.
- No horizontal overflow at 375 on any state. Long class names and long Vietnamese names wrap (fixture "Nguyen Hoang Phuong Thao Nguyen", a 60-character class name).

| shot | axe | small targets | overflow | KB |
|---|---|---|---|---|
| wizard-1-start-375 | 0 | 0 | False | 44 |
| wizard-1-start-1280 | 0 | 0 | False | 49 |
| wizard-1-warnings-375 | 0 | 0 | False | 50 |
| wizard-1-warnings-1280 | 0 | 0 | False | 54 |
| wizard-2-devices-375 | 0 | 0 | False | 93 |
| wizard-2-devices-1280 | 0 | 0 | False | 102 |
| wizard-2-bluetooth-375 | 0 | 0 | False | 124 |
| wizard-2-bluetooth-1280 | 0 | 0 | False | 134 |
| wizard-3-meters-375 | 0 | 0 | False | 44 |
| wizard-3-meters-1280 | 0 | 0 | False | 51 |
| wizard-3-swapped-375 | 0 | 0 | False | 55 |
| wizard-3-swapped-1280 | 0 | 0 | False | 62 |
| wizard-4-playback-375 | 0 | 0 | False | 34 |
| wizard-4-playback-1280 | 0 | 0 | False | 36 |
| wizard-5-upload-375 | 0 | 0 | False | 31 |
| wizard-5-upload-1280 | 0 | 0 | False | 36 |
| wizard-6-save-375 | 0 | 0 | False | 36 |
| wizard-6-save-1280 | 0 | 0 | False | 40 |
| daily-before-375 | 0 | 0 | False | 37 |
| daily-before-1280 | 0 | 0 | False | 38 |
| daily-armed-375 | 0 | 0 | False | 36 |
| daily-armed-1280 | 0 | 0 | False | 37 |
| daily-recording-375 | 0 | 0 | False | 69 |
| daily-recording-1280 | 0 | 0 | False | 69 |
| daily-stop-confirm-375 | 0 | 0 | False | 62 |
| daily-stop-confirm-1280 | 0 | 0 | False | 73 |
| daily-offline-375 | 0 | 0 | False | 68 |
| daily-offline-1280 | 0 | 0 | False | 69 |
| daily-late-offline-375 | 0 | 0 | False | 69 |
| daily-late-offline-1280 | 0 | 0 | False | 70 |
| daily-unplugged-375 | 0 | 0 | False | 76 |
| daily-unplugged-1280 | 0 | 0 | False | 80 |
| daily-saved-375 | 0 | 0 | False | 37 |
| daily-saved-1280 | 0 | 0 | False | 39 |
| daily-switch-off-375 | 0 | 0 | False | 29 |
| daily-switch-off-1280 | 0 | 0 | False | 33 |
| admin-off-375 | 0 | 0 | False | 102 |
| admin-off-1280 | 0 | 0 | False | 111 |
| admin-on-375 | 0 | 0 | False | 110 |
| admin-on-1280 | 0 | 0 | False | 118 |
| admin-turning-on-consent-missing-375 | 0 | 1 | False | 121 |
| admin-turning-on-consent-missing-1280 | 0 | 1 | False | 145 |
| admin-recordings-375 | 0 | 0 | False | 95 |
| admin-recordings-1280 | 0 | 0 | False | 102 |
| admin-deletion-request-375 | 0 | 1 | False | 94 |
| admin-deletion-request-1280 | 0 | 1 | False | 105 |
| admin-audit-375 | 0 | 0 | False | 59 |
| admin-audit-1280 | 0 | 0 | False | 63 |

Caveat: full-page screenshots draw the fixed recording bar where the viewport was, mid-page; in the browser it stays pinned to the bottom. Dialog shots may catch the 150 ms fade.

### End-to-end with the REAL engine (`node e2e.mjs`)

Chromium 145 (`scripts/recorder/harness.mjs` `launch`: `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`, the C2 lesson WAV read in place), the real `createRecorder` + `BrowserCaptureSource` + uploader, `supabaseBackend` over the C2 contract-enforcing fake recorder server (`scripts/recorder/fake-recorder-server.mjs`, served by a Vite middleware at `POST /fake`). A lesson starting in 1 minute (capture window already open), 2.5 min long, chunks 10 s. Driven only through the screen: Ready for today -> armed -> recording by itself -> Roll-call start, Activity, a name chip, Roll-call end -> Stop -> confirm -> Saved. **14 passed, 0 failed** (`docs/evidence/C3/c3-e2e.json`): tab title "● RECORDING - Class recorder" while recording and back after; both meters live; the Stop confirm ("The lesson has 3 minutes left."); one recording `complete`, `stop_reason = manual`; every chunk of both tracks confirmed; the four teacher markers on the server and in the manifest (the name chip with the child's id); the manifest stored with both tracks, `frames_captured == frames_written`; the device profile upserted; no page errors.
An earlier run on the heavily loaded machine also produced engine-written `gap` ("context stalled N s") and `device_change` markers (both fake inputs dropped at 43 s and came back at 52 s) and still completed - the screen showed the unplug and the restore. The test now ignores the engine's own marker kinds when comparing the teacher's.

## Requests to the engine (C2) - not edited here, worked around

1. **Tab title is the engine's.** `controller.ts` `setState` writes "● RECORDING - " / "◌ ARMED - " into `document.title`. The screen therefore only sets the base title and never prefixes (a first version did, and the e2e caught "● RECORDING - ● Recording - ..."). Request: document this in `index.ts` (or make it an option), since a UI owning `document.title` is the usual expectation.
2. **No upload-speed probe.** `recorder_can_upload` allows only registered chunk paths of an open recording, so the wizard cannot send a test object; speed is measured from `chunk` events (register -> confirm). Request (if wanted): an engine helper `measureUpload(chunks)` or a `registeredAt`/`uploadMs` split per chunk (the current `confirmedAt - registeredAt` includes queueing and the read-back).
3. **Wizard probe.** The wizard builds its probe from public pieces (`BrowserCaptureSource`, `measure`, `swapVerdict`, `encodeWav`); the engine's own `HealthMonitor` swap window (60 s, from the start of a recording) does not fit a 10-second check, so `swapVerdict` is called on the probe's own per-batch diffs with the same speech threshold (-40 dB) and minimum 20 windows. A first-class `openProbe()` in the engine would keep the two in one place.
4. **Discard of an abandoned recording** (`discardLocal` with "DISCARD") is NOT offered on this screen yet; an abandoned recording shows "Anything recorded is kept on this laptop". Kept out deliberately to avoid a destructive control in a teacher's daily view; suggest putting it in an admin-guided support step.
5. **Level events only while capturing.** Before capture the daily screen can show only the ticks from `prepare()` (resolved, not opened); live meters there would need the mics open early. Left as is.

## Not in the database, said plainly

- The consent wording TEXT is not stored, only its version (`recorder_settings.consent_wording_version`). C1 asked for the text next to the version; the panel shows the version and says the text is the school's form for that version. Owner question Q1 (wording) is still open.

## What needs the real S500 and lapel (cannot be verified here)

Chrome's fake devices are two inputs playing the same file, so these are untested by me: (1) the real labels and whether `hintRole`/`isS500Label`/`isBluetoothLabel` recognise them (the S500 on Bluetooth shows "Hands-Free AG Audio" on Windows - assumed from Windows naming, not seen); (2) the swap warning on a real pair (the fake engine scripts it; the real probe path ran only in typecheck); (3) the 10-second playback quality and that the S500's firmware DSP is audible/acceptable; (4) the meters' "Quiet/Good/Too loud" thresholds against real levels; (5) unplugging a real USB device mid-lesson and the "plug it back in" path; (6) whether the AnkerWork app exposes those switches at all; (7) the Windows Sound steps' exact wording on the school laptop's Windows build; (8) battery API on the school laptop (Chrome exposes `getBattery`; Edge too); (9) upload speed on the school uplink; plus C2's own owner checks 1-14.