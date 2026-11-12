# C3 - Class recorder screens

**Where I am / next step:** screens built and committed; screenshots + axe run in progress; then the real-engine e2e.

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

(filled in below as they run)
