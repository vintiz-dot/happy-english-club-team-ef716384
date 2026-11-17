# Independent review: lesson monitor pilot (branch worktree-agent-afb17da402460d041 @ c5b82585)

## 1. Verdict: SHIP WITH CHANGES

The privacy core is sound. Only the lesson's own teacher can read a report: the one SELECT policy calls
`lesson_monitor_can_read_report` (`p_teacher = auth.uid()` AND `recorder_can_listen` AND the 30-day window). There is no
family, student, TA or admin SELECT path on any table, view, RPC or storage object. Grants are explicit and write-free.
The nightly path makes no vendor call (urllib to the Supabase URL only; Whisper loaded offline). Nothing can write audio or
transcripts into the repo (`pc.out` refuses repo paths; .gitignore covers wav/flac/hec-audio-eval). No voiceprint code is
imported anywhere in scripts/lesson-monitor.

Four things must be changed, or told to the owner, before it goes live (M-1 to M-4). None is a leak to a family.

## 2. Findings

### Majors

**M-1. The 30-day expiry is enforced for READING on the server, but DELETION depends on the laptop.**
`lesson_monitor_expire()` (migration l.597) is called only from `nightly.py:292`, which exits earlier when `pilot\STOP` exists
and never runs once the pilot ends. No pg_cron job is added (the recorder has one, 20261112101000).
Scenario: the pilot stops at week 4 and nobody runs nightly. Every report stays in the table indefinitely (hidden by the
policy, still present, still in backups), contradicting "deleted 30 days after the lesson" (runbook l.9, parent form l.38).
PROVED: probe P2: the policy hides a 45-day-old report, the row is still counted until expire runs.
Fix: schedule `lesson_monitor_expire` with pg_cron (tolerant block like 20261112101000), and tell the owner that
`delete_pilot.py` at the end is the real deletion.

**M-2. Withdrawal of consent does not reach everything it should.**
(a) `lesson_monitor_record_child_consent` (l.389-405) switches off and deletes reports only for classes the child is enrolled in
TODAY. A child who has left the class (enrollment end_date passed) and whose parent then withdraws keeps their voice in every
earlier report of that class, and the class stays ON. PROVED: probe P3.
(b) Local copies are untouched: `pilot\drafts\*.json/.html` (from `--no-upload`, or a failed save) survive a withdrawal and a
kill switch until 30 days or `delete_pilot.py`; `expire_drafts` runs only at nightly start. `--no-upload` reports are unknown
to the database (no run row), so no server action can ever remove them. Read in code: nightly.py:76-93, 232-236.
(c) pending/begin check consent by enrollment on the lesson date, so a visitor, a trial child or a not-yet-enrolled child is
recorded and transcribed with no consent check. This cannot be checked in code; say so to the owner and the teacher.
Fix: on withdrawal delete reports of every class the child was enrolled in during the pilot window; have nightly.py delete
local drafts for any class that is off or whose consent changed; document (c).

**M-3. The kill switch does not stop a job already running; step 0 ignores the local switch.**
Server side it holds: set_class(off) is enforced at begin and at save (PROVED probe P1b: save refused after the kill), so
no report is stored. But the laptop keeps downloading and transcribing for up to hours after a teacher presses "Stop", because
nightly.py never polls the database, only the local `STOP` file. In `--no-upload` mode nothing is checked after `begin`, so the
report is still written locally after a withdrawal. `step0.py make --recording` does not check `pc.stopped()` (no `stopped`/`STOP`
anywhere in step0.py), does not call `lesson_monitor_begin` (no audit row, no class-on check; it only checks consent), and
leaves 5 minutes of children's audio (`sample_*.wav`, `sample_listen.wav`) in `pilot\step0` until delete_pilot.
Fix: re-check begin between chunks and before keeping a local draft; step0 must honour STOP and go through begin; mention the
step0 audio in the runbook.

**M-4. "Nobody else can open it: not you" is not true on the laptop.**
The owner (an admin) runs the job. The transcript is in the machine's memory and, when a save fails or `--no-upload` is used, as
plain JSON/HTML in `pilot\drafts`. The database promise holds; the runbook sentences (l.9, and the teacher text l.191 "not the
office, not the owner") should say the report is readable by whoever sits at the laptop while it runs and by whoever can open
that folder. Also `lesson_monitor_audit` rows carry `student_id` for consent events and survive `delete_everything` (PROVED
probe P10; ids only, deliberate per the migration header), so "one command deletes everything" should say so.

### Minors
- **N-1.** The report-body privacy check (l.543) rejects only field NAMES. Spoken names stay in `lines[].text` and are accepted
  (PROVED probe P11). This is the owner's open choice below, not a bug.
- **N-2.** Reports stay readable by the teacher after the kill switch and after `ends_on`, until deleted or 30 days (PROVED P1).
  The screen says so (TeacherLessonReports.tsx:324). Consider hiding them when the class is off.
- **N-3.** `lesson_monitor_classes_read` lets any teacher teaching that class today read `consent_note` (where forms are kept).
- **N-4.** `delete_pilot.py` deletes local files only after the app call succeeds: a failed sign-in leaves local audio and drafts
  in place (`--local-only` works around it). It also cannot delete the recorder's own audio (by design).
- **N-5.** Supabase backups keep rows deleted in Postgres for their retention window; recorder audio (storage) is not in them.
  Transcripts are the only new thing that can sit in backups. Not checked (no dashboard access).
- **N-6.** `lesson_monitor__today()` and the audit-trigger function keep default EXECUTE; harmless.

## 3. Owner's open choice: report in the app vs `--no-upload`
Recommendation: **keep the report in the app (default)**, because every promise that can be enforced (teacher-only RLS, the
30-day policy, the withdrawal wipe, the audit, one-command delete) exists only for database rows, while a local HTML file has none
of them and reaches Victor only through an unmanaged copy; the extra exposure (spoken names next to audio the recorder already
keeps for 30 days in the same project) is small, provided M-1 is fixed so transcripts really expire.

## 4. What I ran
- `node scripts/pgtest/run.mjs` (full, started at 06:30 Hanoi without the clock-back shim): the pilot suites pass (lesson monitor pilot 168 passed 0 failed; lesson monitor view 35 passed 0 failed, both also run directly). One unrelated failure seen: "d4 money inputs" 307 passed, 1 failed (N-2, enrolment-ended-today), the known clock-edge flake before 08:00 Hanoi; not in the pilot path. The full run had not finished when this was written.
- Pilot suites inside it: lesson-monitor.test.mjs (117 assertions) and lesson-monitor-view.test.mjs.
- `python -m pytest scripts/lesson-monitor/tests` in the hec-audio-eval venv: **35 passed in 74.9 s** (fake transport, no audio).
- My probe: scripts/pgtest/lesson-monitor-review.test.mjs, **17 passed, 0 failed** (P1 readable after kill switch, P2 expiry hides
  but does not delete, P3 withdrawal after leaving, P5 admin reads none, P7 helper only for own uid, P8 audit scope, P9 direct
  insert refused, P10 audit survives delete-everything, P11 names in lines accepted). Run it with the four migrations that
  run.mjs lists for "lesson monitor pilot".
- Code reading: the whole migration; nightly, supa, audio, transcribe, stop, delete_pilot, pilot_admin, pilot_common, step0;
  TeacherLessonReports.tsx, useLessonMonitor.ts. `git grep` finds no other consumer of the tables (no edge function, MCP tool,
  chat tool, view or storage policy).
- tsc and `npm run test:bun`: not run (no money-path code changed; outside this brief).

## 5. Could not check
Real audio and real offline Whisper behaviour (HF_HUB_OFFLINE is set in `load_model` with `local_files_only=True`; no network
capture on the laptop), the live database (no SELECTs run), Supabase backup retention, Windows permissions on the pilot folder,
whether 20261117090000 is applied in production.

## 6. Fix round 1

Branch `pilot-fix2` (built on `pilot-fix`). Nothing applied to the live database, nothing deployed, nothing pushed.

**M-1 (expiry depended on the laptop).** The migration schedules the purge with a tolerant pg_cron job (hourly), and readers and `save_report` purge too. Proved by `lesson-monitor-review.test.mjs` P2 (one job, applied twice; an old report is deleted on the server with no laptop run). `delete_pilot.py` at the end remains the full deletion.

**M-2 (withdrawal did not reach everything).** (a) Server withdrawal covers every class the child was enrolled in during the pilot window: probe P3. (c) A child with no consent row (visitor, trial) counts as NOT consented in `may_continue`/`begin`/`save`: probe P4; the runbook says what cannot be checked in code. (b) Local drafts follow the database: `nightly.py` runs `lesson_monitor_keep_check` at start and deletes every draft it does not allow; a draft that cannot be checked stays and is logged. Proved by the `keep_check` probes and pytest `test_drafts_the_database_no_longer_allows_are_deleted_at_start`, `test_a_draft_that_cannot_be_checked_stays_and_is_said_so`, `test_a_draft_the_database_does_not_know_is_deleted`.

**M-3 (kill switch vs a running job; step 0).** `pilot_common.Guard` checks the STOP file at every check and the database (`lesson_monitor_may_continue`) at most every 15 s: between chunks, during transcription (each segment) and once more, forced, before anything is kept or saved. A "no" stops the job and deletes the audio copy and any draft of that lesson. An unreachable database (offline, or HTTP 401) is not a yes: after a 2-minute grace the job stops and wipes, and nothing is kept or saved unless the database says `ok` at the last look (also in `--no-upload`). Reason: a withdrawal cannot reach a laptop that cannot be asked, so silence must not mean "carry on" for hours; cost: a job on a pasted `--token` (about an hour) must finish inside it. `stop.py on` and `nightly.py` with STOP present delete all local audio and drafts. Step 0: `make` refuses while STOP exists and stops between chunks; `make --recording` goes through `lesson_monitor_begin` (class on, consent, audit line); any failure deletes what `make` wrote; `score` deletes the sample and keeps only `result.json`. Proved by `tests/test_fix2.py` (mid-run withdrawal, switch-off while transcribing, withdrawal after transcribing in both modes, unreachable beyond grace, blip inside grace, 401, last look unreachable, `--no-upload` only on ok, Guard unit, stop wipes, nightly with STOP, and the `test_step0_*` cases) and the probes "M-3 after the kill switch may_continue says class_off" and "keep_check drops the local draft".

**M-4 (wording).** Runbook, the screen text (`WORDING.forYouOnly`, `src/lib/lessonMonitor.ts`) and the design doc now say that in the app only the teacher can read a report, but whoever sits at the laptop while the job runs, and whoever can open `pilot\drafts`, can read it. The audit holds no child ids after `delete_everything` (it keeps event names, dates, class and recording ids, counts): probe P10.

**N-1.** Owner's ruling, recorded verbatim in the runbook: "it's ok to send names. the students use psuedo names in class". The report stays in the app (conductor ruling); `--no-upload` stays only because it now obeys every rule above.

**N-2.** Left as is: the teacher still reads existing reports after the kill switch until deleted or 30 days; the screen says so.

**N-3.** Left as is: a teacher of the class can read `consent_note`; flagged for the owner.

**N-4.** `delete_pilot.py` always runs the local wipe, even when sign-in or the app call fails (`SystemExit` included), prints `app: NOT DONE`, exits 2. Proved by three `test_delete_pilot_*` tests.

**N-5.** Not checked (no dashboard access): Supabase backups may keep deleted rows for their retention window; the runbook says so.

**N-6.** Helpers lose default EXECUTE: probe "N-6 helpers have no default EXECUTE".

**Migration** `supabase/migrations/20261117090000_lesson_monitor_pilot.sql`, md5 with CR removed (LF): `a6a48bb36518609188311b4d4308c206`.
