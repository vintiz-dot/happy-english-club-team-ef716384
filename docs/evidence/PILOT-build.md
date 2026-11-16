# PILOT build - lesson monitor Option A (Venus, Victor)

Owner's decision (D-28): "lesson pilo yes. with venus teacher victor."

**Where I am / next step:** DONE (built and tested, not run on any real lesson). Next step is the owner's: the four conditions, the migration paste, publishing the app, switching on. All of it is in `docs/LESSON_MONITOR_PILOT_RUNBOOK.md`. Nothing has been pushed or deployed.

## What was built
- `supabase/migrations/20261117090000_lesson_monitor_pilot.sql`:
  - Reports are teacher-only. `lesson_monitor_reports` has one SELECT policy: the lesson's own teacher, who must still be allowed to listen to the lesson (`recorder_can_listen`), for lessons at most 30 days old. The server sets whose report it is.
  - Each pilot class has ONE named teacher. Lessons taught by a cover teacher are refused.
  - The monitor has its own per-child consent (`monitor-v1-2026-11`). A withdrawal switches the class off and deletes its reports.
  - Teachers can type target words. Run records and an append-only audit hold codes and counts only.
  - The kill switch is open to the class's teacher. Switching on is admin only.
  - `lesson_monitor_delete_everything` deletes all pilot data in one call.
  - No write grants; no family, student, TA or storage policy; no service role.
- `scripts/lesson-monitor/`:
  - `nightly.py` is the overnight job. Steps: sign in with a hidden prompt (tokens in memory, refreshed) → `lesson_monitor_begin` gate → authenticated download → SHA-256 check → join and cut the lesson → B2b transcription, offline → `report.py` → delete the audio copy and prove it by listing → save the report, or keep a local draft.
  - `step0.py` builds the 5-minute sample and the marking sheets, and scores them against the design's bars.
  - `stop.py` is the kill switch. `delete_pilot.py` deletes everything. `pilot_admin.py` records consents, switches the class on or off and shows status/stop rules.
  - Data lives only under `<HEC_EVAL_ROOT>\pilot`; writing inside a repo or outside that folder is refused.
- Screen: `/teacher/lesson-reports` (`src/pages/TeacherLessonReports.tsx`, `src/lib/lessonMonitor.ts`, `src/hooks/useLessonMonitor.ts`). It is teacher-only, on the Ivory design, and appears in the menu only for a teacher of a pilot class.
- `docs/LESSON_MONITOR_PILOT_RUNBOOK.md`: the four conditions and how to check each, the exact consent lines (EN + VI draft), the evening routine, what Victor sees, the stop rules, the kill switch and deletion.

## Tests
- `scripts/pgtest/lesson-monitor.test.mjs`: 168 pass. It runs the real recorder and pilot migrations in PGlite. Victor reads only his Venus reports. Admin, other teachers, TA, cover teacher, parent, student and anon read nothing. Mars's teacher reads only Mars. Also covered: consent, kill switch, expiry, deletion, grants, and the append-only audit.
- `scripts/pgtest/lesson-monitor-view.test.mjs`: 35 pass (the screen's mapping and wording). Both suites are listed in `run.mjs`.
- `scripts/lesson-monitor/tests`: 35 pass under pytest, using the harness venv:
  - scheduling, and the report built from a synthetic transcript and synthetic levels;
  - deletion and the kill switch;
  - step 0 and the stop-rule arithmetic;
  - one lesson end to end, against a fake database, fake storage and a fake transcriber, using synthetic FLAC chunks.
- The real turbo model loaded offline (`local_files_only`, `HF_HUB_OFFLINE`) through `transcribe.py` and ran on 8 s of synthetic noise: 0 segments, no errors, 118 s to load under load.
- `tsc --noEmit -p tsconfig.app.json`: 0 errors.
- Screen preview: Vite with a fake client and made-up data at 375 px. The summary, flags, range wording and transcript (grey, faded and unwritten bands) all show, with no horizontal scroll. The preview was deleted afterwards.

## Deviation from the design (for the owner)
- Design s.3 step 4: the pilot report stays on the laptop and nothing is written to Supabase. The conductor's brief asked for an in-app report that is teacher-only, so it was built that way. `nightly.py --no-upload` keeps the design's local-only path.
- Feature D (voice groups) and E (per-child stretches) are not built. Option A as approved names nobody.
- Target words come from words the teacher types, or from the class's video homework rubric vocabulary. No flipbook word list exists to read.

## Not verified
- No real lesson was used. The speed of a full lesson is the B2b projection.
- BitLocker, the separate account and the consent wording were not checked; they are the owner's conditions.
- The full `node scripts/pgtest/run.mjs` was not run (only the two new suites plus the app typecheck).
