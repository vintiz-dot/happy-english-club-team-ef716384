# FIX: attendance streaks, family bank details, long phone videos

Where I am / next step: all three items written, tested and committed; full checks run (results at the end). Next step is the conductor's review and apply, in the order under "What the conductor applies".

Branch: worktree-agent-ae3a47575e6e4c362, started from the conductor branch `claude/hec-conductor-setup-efbaa5` at 946eb6d1. Built and tested only: nothing connected to the live database, nothing applied, deployed or pushed.

## 1. Attendance streaks

### What was wrong (conductor's live facts)
- `point_transactions.date` is NOT NULL with no default on live. `advanceStreaks` inserted the 50-point bonus without `date`, so every bonus failed (0 ever paid), from mark-attendance and from the stars-sync drain.
- The drain keeps a refused job and retries it every 5 minutes. Each retry still upserted the streak, and `last_attendance_date !== today -> consecutive_days + 1` counted an older lesson again on every retry: 18 children above 500. Nothing reset a streak on an absence.

### What changed
- `supabase/functions/_lib/attendance-effects.ts`
  - `streakRun(marks, uptoSessionId?)` (pure, exported) is the rule: the run of attended lessons of one child in one class, read from the register in lesson order (date, start_time, session id). Present and Late count, Absent breaks it, Excused / unmarked / cancelled lessons neither count nor break it.
  - `advanceStreaks` no longer increments anything. For each child given, it reads that child's register in the lesson's class (`attendance` joined to `sessions!inner`, one read per child so PostgREST's row cap cannot cut a register short) and:
    - writes the stored row as the CURRENT run (whole register): `consecutive_days`, `last_attendance_date` = latest Present/Late lesson, `bonuses_awarded = floor(run/5)` (the same values the repair script sets; the column decides nothing now). A row is written if the child already has one or the run is above 0.
    - pays the bonus when the lesson being processed is attended (in the register, not cancelled) and the run up to and including it is a multiple of 5: 50 points, `type 'participation'`, `date` = the lesson's date, `month` = its YYYY-MM, `session_id` = the lesson, the same notes text (`Attendance streak bonus: N consecutive classes attended!`), `created_by` NULL as before.
    - Idempotent: it first looks for an existing streak bonus for that child + lesson (`session_id`, type, notes prefix) and pays only where there is none; an insert refused with 23505 (the new index, a race) counts as already paid. A retry after success pays nothing. If the "already paid" read fails it pays nothing and reports failure (fail closed: the drain keeps the job).
    - Retrying the same lesson, or processing an older lesson late, can never inflate the run: the run is read, not stepped. Proven 100 retries in a row in the test.
    - Without `sessionId` it touches nothing and returns false.
  - It now runs for every marked child, not only Present: an Absent re-reads the streak (so it resets), an Excused re-mark repairs it; only an attended lesson can pay. `recalcTuition` is unchanged.
- `supabase/functions/mark-attendance/index.ts`: ONE change, the streak part - `sessionId` is passed to `afterAttendanceMarked` (it is the request's own validated `sessionId`). Nothing else in the function changed (diff is 3 lines).
- `supabase/functions/_lib/stars-sync-core.ts`: `StreakBatch` carries `sessionId` (from the queue row's `session_id`, which the queue's shape CHECK already requires for a streak job). Ordering (lesson order, attempts then id) unchanged.
- `supabase/functions/stars-sync/index.ts`: passes `batch.sessionId` to `advanceStreaks`. The "keep refused jobs" behaviour is unchanged: a false return still calls `stars_sync_effect_failed`, success still deletes at the generation read.
- `supabase/migrations/20261116091000_attendance_streak_rule.sql` (new):
  1. `point_transactions_one_streak_bonus`: a PARTIAL unique index on `(student_id, session_id) WHERE type = 'participation' AND session_id IS NOT NULL AND notes LIKE 'Attendance streak bonus%'` (the prefix shared by the live and the paid-late wording). Why on `point_transactions`: the brief allowed a new table or a partial check; a separate ledger table could not be written in the same statement as the point row through PostgREST, so a crash between the two would either pay without recording or record without paying. The index adds a guard and alters no existing constraint, column or default; teachers' points on the same lesson are untouched by it (tested). It is partial like `point_transactions_one_homework_award`, and nothing upserts against it (AGENTS.md, 42P10). Since no streak bonus row exists on live (0 ever paid), it cannot collide; paste it BEFORE the repair, so the back-pay is under it too; if one did, CREATE fails (fail closed). The code does not depend on it (it checks first).
  2. "Change one, change the other": the SQL engine decides when a streak step is owed (`stars_sync__queue_mark_effects`, 20261028090000) and queued one only for Present. Late now extends a streak, so it queues for `IN ('Present', 'Late')`. Body otherwise identical (the test strips that one change and compares with the 20261028090000 text byte for byte); SECURITY DEFINER, `search_path = public`, EXECUTE revoked from PUBLIC/anon/authenticated as before, service role keeps it. The engine's other decisions are untouched.
- `scripts/REPAIR-attendance-streaks.sql` (new): dry run, then real run once; pays the missed bonuses; see below.

### Side effect the conductor should know: the bonus now counts as lesson evidence
The D1/D4 evidence model (`20261112090000` points_awarded, `_floor_point_level` in `20261114090000`) counts a positive `participation` row linked to a lesson (`session_id = lesson`) as SOFT "P" evidence that the lesson happened; the streak bonus used to be excluded only because it had no session ("no creator, no session"). Linking it, as the brief asks, makes it SOFT P evidence for that lesson. It exists only where the register holds a Present/Late mark on that same lesson, which is already STRONG/SOFT attendance evidence, so no lesson's strength changes; a bonus written between a preview and an apply would change the fingerprint and the apply refuses (fail closed). `docs/evidence/D1-evidence-model.md` line 128 ("session NULL") is now out of date; I did not edit D files.

### The repair, with back-pay (`scripts/REPAIR-attendance-streaks.sql`)
Owner's ruling relayed by the conductor, 16 Nov 2026: "pay the missed streak bonus" (replaces the earlier no-back-pay default; the separate opt-in script is gone).
- Two runs in the SQL editor: as committed it is a DRY RUN (`SELECT true AS dry_run;` on one marked line); the real run is the same file with that `true` changed to `false`. The dry run writes nothing but temp tables (asserted: every table snapshot identical).
- One transaction, `student_attendance_streaks` locked SHARE ROW EXCLUSIVE.
- BACK-PAY: the register is walked per child per class by the SQL form of `streakRun` (cancelled lessons left out; each Absent starts a new group; the run at a lesson is the attended lessons of its group up to it; order `date, start_time::text, id::text`, the same code-unit order the TS sort uses). For every attended lesson where the run reached a multiple of 5 and the child has no streak bonus for that lesson (student + `session_id` + `type 'participation'` + notes starting `Attendance streak bonus` - exactly the key the live code checks and the unique index enforces), it inserts one row: 50 points, `participation`, `session_id` = that lesson, `date` = TODAY in Hanoi (`now() AT TIME ZONE 'Asia/Ho_Chi_Minh'`), `month` = today's YYYY-MM (past months' leaderboards are not rewritten), notes `Attendance streak bonus (paid late): <N> classes in a row, lesson of <YYYY-MM-DD>`, `created_by` NULL as for the live bonus. The `student_points` trigger updates totals as for any point row.
- One key for both payers: the live notes are `Attendance streak bonus: N consecutive classes attended!`, the late ones `Attendance streak bonus (paid late): ...`; the marker both code paths and the index use is the common prefix `Attendance streak bonus` (`STREAK_BONUS_NOTE_PREFIX`). So the live code never pays a lesson the back-pay paid, the back-pay never pays a lesson the live code paid, and the index refuses a second row either way (tested both directions).
- COUNTERS: every existing streak row is set from the register: `consecutive_days` = the current run, `last_attendance_date` = latest Present/Late lesson, `bonuses_awarded = floor(consecutive_days / 5)`; only rows that differ; none added or removed.
- STALE JOBS: deletes `stars_sync_effects WHERE kind = 'streak' AND attempts > 0`. With the bonuses back-paid and the rows rebuilt, the new code would find nothing to do for them (a no-op), so deleting them only empties the queue. Every stale job has `attempts >= 1` because the old code refused every streak job. Never-tried jobs and tuition jobs are left.
- Writes nothing else: no attendance, session, invoice, payment or payroll row; `point_transactions` only gains the back-pay rows (asserted).
- Prints ONE row, counts only - no names, no ids (asserted that no id appears in it): `mode`, `bonuses_to_pay`, `points_to_pay`, `bonuses_per_class` (one number per class, largest first), `children_by_bonus_count` ({bonuses: children}), `children_paid`, `largest_child_points`, `streak_rows`, `rows_over_500_before`, `max_run_before`, `max_run_after`, `streak_rows_to_change`, `stale_streak_jobs_to_delete`. In the real run the same row reports what was done.
- Idempotent: a second real run pays 0 and changes 0 rows (tested). Run it after pasting 20261116091000 (the index) and immediately before the redeploy.
- Dating the late bonus today keeps it out of the lesson evidence model for old lessons: `_floor_point_level` and points_awarded require the point's date to equal the lesson's date. It will show as a positive participation point of that class TODAY in `session_day_evidence` (moves), which only flags a move onto today's date for review (fail closed).

### Tests
- `scripts/pgtest/attendance-streaks.test.mjs` (suite "attendance streaks", 83 assertions, `expect: 83` in run.mjs): the real `attendance-effects.ts` over pglite through a PostgREST stand-in, on a `point_transactions` with `date NOT NULL` and no default as live has it (the old insert shape is refused there: 23502, proving the prelude reproduces live). Live code: the bonus row has `date` and `month` of the lesson, `session_id`, type, wording; 100 retries of the same lesson leave the run at 5 and one bonus; an older lesson processed late changes nothing and pays nothing; Late counts; Absent resets; re-marking Excused un-breaks it without paying twice; P P E (cancelled) P L P is a run of 5 with the bonus on the right lesson; a refused bonus fails the step and the retry pays once; a failed "already paid" read pays nothing; a failed register read writes nothing; no lesson -> nothing; the index refuses a second bonus and the code treats the race as paid; the migration applies twice and changes only the queue's status list.
  Repair: (1) a hand-computed fixture in a fresh database - six children, two classes, a cancelled lesson, Excused, Late, an Absent, one milestone the live code had already paid: the dry run changes nothing and announces 5 bonuses / 250 points, per class [4, 1], children {1: 3, 2: 1}, largest child 100; the real run inserts exactly the 5 hand-listed rows (child, lesson, wording with run and lesson date), 50 each, dated today in Hanoi; the already-paid lesson is not paid again; counters exactly as hand-computed; second run pays 0 and changes 0; a live bonus on a back-paid lesson is refused by the index. (2) a fixture like live (inflated 600+ rows, two lessons on one day, queued jobs) against the TS rule over every child and class: dry run changes nothing, real run pays exactly the lessons the TS rule owes, nothing owed after, every streak row equals the TS rule, stale jobs gone, second run 0. (3) the live code afterwards: re-working every back-paid lesson pays nothing and leaves the counters as the repair wrote them; the next milestone (15th lesson) pays one new bonus, dated by its lesson, in the live wording.
- `scripts/pgtest/stars-sync-core.test.mjs`: the old streak cases (which encoded the increment) are replaced by contract cases on a register fake: mark-attendance's call shape, the dated bonus, no double pay, no lesson -> nothing, failure reporting; and `planDrain` batches carry `sessionId`. 65 assertions.

## 2. Families cannot see the school's bank details

### What changed
`supabase/migrations/20261116090000_bank_info_family_logins.sql` (new):
- `public.caller_is_family_login()`: SQL, STABLE, SECURITY DEFINER, `SET search_path = public`, no argument (answers for `auth.uid()` only, so it cannot be used to ask about someone else): true when a `families` row has `primary_user_id = auth.uid()`. EXECUTE revoked from PUBLIC and anon, granted to authenticated. (Supabase's default privileges also give the service role EXECUTE; the service role bypasses RLS on bank_info and never evaluates the policy.) It reads `families` as its owner, so it does not depend on the families RLS (tested with families RLS hiding every row from the caller). It does not look at `families.is_active`: an inactive family that still owes can still pay.
- Replaces ONLY "Admins and families can view bank info" with the same three conditions (verbatim) plus `OR public.caller_is_family_login()`, now `TO authenticated` (it was TO public; anon could never pass it since `auth.uid()` is NULL, so this narrows nothing that worked). "Admins can manage bank info" is left alone, so only an admin writes. No teacher or anon widening.

### Tests
`scripts/pgtest/bank-info-family.test.mjs` (new suite "bank info family logins", 27 assertions, `expect: 27`): the rollback block below installed as the "before" reproduces the defect (a family's student-role primary login refused); after the migration (applied twice, idempotent): admin reads, a family's primary login holding only `student` reads, a `family`-role account reads, a child's linked login reads, a teacher who is a family's primary login reads (as a parent); a teacher with no family, a student account with no family or child, a role-less account and anon are refused; anon cannot call the helper; the helper's flags and grants; nobody but an admin can update, delete or insert; the admin still can; the rollback block restores exactly the "before" behaviour and removes the helper.

### Rollback
Recreates the live SELECT policy as 20251015032902 wrote it, and removes the helper. The conductor should compare it with `pg_policies` on live before relying on it (I could not read live). The test installs this block as the "before" and runs it again as the rollback.

<!-- rollback bank_info -->
```sql
DROP POLICY IF EXISTS "Admins and families can view bank info" ON public.bank_info;
CREATE POLICY "Admins and families can view bank info"
  ON public.bank_info FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'family')
    OR EXISTS (
      SELECT 1 FROM public.students 
      WHERE linked_user_id = auth.uid()
    )
  );
DROP FUNCTION IF EXISTS public.caller_is_family_login();
```

## 3. Long phone videos get no transcript

### Choice: (b), Gemini fallback in the function
Option (a) (extract the audio in the browser before upload) was not taken because I cannot show it works on iPhone Safari and Android Chrome without new dependencies:
- The only dependency-free real-time route is `HTMLMediaElement.captureStream()` + MediaRecorder, and Safari on iOS does not implement `captureStream()` on media elements; it also takes as long as the video plays.
- The other route, `decodeAudioData` on the whole file then a WAV encode, needs the whole video in memory as an ArrayBuffer plus the decoded PCM (a 5-minute 48 kHz stereo track is about 115 MB of float32 on top of a 100-300 MB video), which is exactly the case (long videos) on the phones most likely to kill the tab; and whether iOS Safari's `decodeAudioData` accepts a QuickTime video container is not something I can verify here.
- I have no device to test either on, and the brief asks how I know; I don't, so (a) fails its own condition. It would also touch the recorder, which is off-limits.

(b) reuses what already handles large files: `watch()` streams the video into Gemini's Files API (no size limit that matters here, streamed, never held in memory).

### What changed
- `supabase/functions/_lib/gemini-transcript.ts` (new, imports nothing): the verbatim-transcript prompt (word for word, mistakes kept, `[unclear]`, `[other speaker]`, times in seconds, JSON), `readGeminiTranscript` (reads the answer into the OpenAI transcript's `{text, segments:[{start,end,text}]}` shape; accepts a fence / bare list / "m:ss" times; drops empty, timeless, negative and past-the-end segments; sorts; caps 600 segments x 500 chars; null if unreadable), `transcriptAttention` (the teacher's line), `toSeconds`.
- `supabase/functions/analyze-video-submission/index.ts`:
  - `watch()`'s upload/poll/delete is now `openGeminiVideo()`, so the video is uploaded ONCE and both questions (what is shown; the fallback transcript) are asked of the same file, then it is deleted (`close`), as before.
  - When OpenAI could not take the file (no transcript from the OpenAI path, which only happens for size: every other failure throws as before), Gemini is asked for the transcript. Only then: a video OpenAI transcribes is never sent for a Gemini transcript.
  - Marked as Gemini's everywhere, never passed off as OpenAI's: `models.transcript` = the Gemini model name and `models.transcript_source = "gemini"` (`"openai"` otherwise); the teacher's attention line says the transcript was written by the video model, not OpenAI, why, and to check the quoted evidence; the marking model (Claude) is told it may be less exact and to keep confidence lower; the review panel's "Transcript" heading reads "Transcript (written by the video model, not speech recognition - check it)" for such an analysis (`src/components/video-homework/VideoReviewPanel.tsx`, text only, no className changed).
  - Without a Gemini key, or if Gemini fails, the analysis proceeds as before with no transcript, and the attention line says why.
  - Unchanged: the 0-100 score is `weightedScore` (never the model's number); the result is a draft in `video_analyses`, which has no family policy; nothing reaches a family before `approve_video_feedback`. `_lib/speech-file.ts` is reused unchanged for the OpenAI path and `geminiVideoMime`.

### Tests
`scripts/geminiTranscript.test.ts` (bun, 14 tests, 29 expects): shape, mistakes kept, fences / lists / clock times, sorting and dropping, end before start, past-the-end segments dropped, empty speech, unreadable answers -> null, caps, `toSeconds`, the attention lines name the source and the reason, the prompt asks for verbatim speech. The Gemini calls themselves (network) are not exercised by any test; the edge-function typecheck covers the wiring.

### Not verified
- A real long iPhone/Android upload through Gemini on live (needs a deploy and a real video; the conductor/owner).
- How exact Gemini's timestamps are against the video; the teacher is told to check.

## What the conductor applies, in order
1. Paste `supabase/migrations/20261116090000_bank_info_family_logins.sql` (independent of everything else; any time).
2. Paste `supabase/migrations/20261116091000_attendance_streak_rule.sql`.
3. Run `scripts/REPAIR-attendance-streaks.sql` as committed (DRY RUN; changes nothing) and read its one row of counts. Then change `true` to `false` on the marked line and run it again (REAL RUN): it pays the missed bonuses dated today, rebuilds the counters and deletes the stale refused streak jobs. Do this immediately before step 4. Between steps 3 and 4 the old code can at most re-inflate a counter it touches; the new code re-reads those from the register on its first drain, and it cannot double-pay (same key, and the index).
4. Redeploy, with the same verify_jwt as now (config.toml: mark-attendance true, stars-sync true; analyze-video-submission has no entry, i.e. the default):
   - `mark-attendance`: `mark-attendance/index.ts`, `_lib/rate-limit.ts`, `_lib/attendance-effects.ts`, `_lib/session-guard.ts`, `_lib/money-guard.ts` (money-guard imports `./session-guard.ts`). Only the streak call changed since v4.
   - `stars-sync`: `stars-sync/index.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts`, `_lib/attendance-effects.ts`, `_lib/stars-sync-core.ts`.
   - `analyze-video-submission`: `analyze-video-submission/index.ts`, `_lib/claude-json.ts`, `_lib/speech-file.ts`, `_lib/gemini-transcript.ts`, `_lib/video-homework.ts`.
   (`_lib/*` above import nothing relative beyond what is listed; remote imports are esm.sh / deno.land / npm.)
5. Publish the app for the review panel's label (optional; the function works without it).
