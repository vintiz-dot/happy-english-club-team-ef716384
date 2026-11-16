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
  1. `point_transactions_one_streak_bonus`: a PARTIAL unique index on `(student_id, session_id) WHERE type = 'participation' AND session_id IS NOT NULL AND notes LIKE 'Attendance streak bonus:%'`. Why on `point_transactions`: the brief allowed a new table or a partial check; a separate ledger table could not be written in the same statement as the point row through PostgREST, so a crash between the two would either pay without recording or record without paying. The index adds a guard and alters no existing constraint, column or default; teachers' points on the same lesson are untouched by it (tested). It is partial like `point_transactions_one_homework_award`, and nothing upserts against it (AGENTS.md, 42P10). Since no streak bonus row exists on live (0 ever paid), it cannot collide; if one did, CREATE fails (fail closed). The code does not depend on it (it checks first), so the migration may go before or after the redeploy.
  2. "Change one, change the other": the SQL engine decides when a streak step is owed (`stars_sync__queue_mark_effects`, 20261028090000) and queued one only for Present. Late now extends a streak, so it queues for `IN ('Present', 'Late')`. Body otherwise identical (the test strips that one change and compares with the 20261028090000 text byte for byte); SECURITY DEFINER, `search_path = public`, EXECUTE revoked from PUBLIC/anon/authenticated as before, service role keeps it. The engine's other decisions are untouched.
- `scripts/REPAIR-attendance-streaks.sql` (new): run once, see below.
- `scripts/OPTIN-attendance-streak-backpay.sql` (new): NOT to be run by default; see "Back-pay".

### Side effect the conductor should know: the bonus now counts as lesson evidence
The D1/D4 evidence model (`20261112090000` points_awarded, `_floor_point_level` in `20261114090000`) counts a positive `participation` row linked to a lesson (`session_id = lesson`) as SOFT "P" evidence that the lesson happened; the streak bonus used to be excluded only because it had no session ("no creator, no session"). Linking it, as the brief asks, makes it SOFT P evidence for that lesson. It exists only where the register holds a Present/Late mark on that same lesson, which is already STRONG/SOFT attendance evidence, so no lesson's strength changes; a bonus written between a preview and an apply would change the fingerprint and the apply refuses (fail closed). `docs/evidence/D1-evidence-model.md` line 128 ("session NULL") is now out of date; I did not edit D files.

### The repair (`scripts/REPAIR-attendance-streaks.sql`)
- One transaction, `student_attendance_streaks` locked SHARE ROW EXCLUSIVE.
- Every existing row is set by the SQL form of `streakRun` (each Absent starts a new group; the run is the attended lessons of the last group; cancelled lessons are left out; order `date, start_time::text, id::text`, the same code-unit order the TS sort uses): `consecutive_days`, `last_attendance_date`, `bonuses_awarded = consecutive_days / 5`. Only rows whose values differ are updated; no row is added or removed.
- Deletes `stars_sync_effects WHERE kind = 'streak' AND attempts > 0`. Why this is safe: with the new code a streak job does two things - re-read the stored row (which the repair has just done from the same register, so a no-op) and pay that lesson's bonus if due. The second would be back-pay of a bonus that was never paid, which the owner's default is not to pay, and would pay it only for the arbitrary subset of lessons that happened to be queued. Every stale job has `attempts >= 1` because the old code refused every streak job. Jobs never tried (`attempts = 0`) and tuition jobs are left.
- Touches nothing else: no point, attendance, session, invoice, payment or payroll row (asserted in the test by snapshot).
- Prints one row of counts, no names: rows_total, rows_over_500_before/after, max_run_before/after, bonuses_awarded_before/after, streak_jobs_before, rows_changed, streak_jobs_deleted, streak_jobs_left.
- Re-running it changes 0 rows (tested). It would also drop a streak job refused since, which costs that lesson's bonus check only, never a streak - so run it once, as below.

### Back-pay (owner's opt-in only)
Default: none. To opt in, the owner runs `scripts/OPTIN-attendance-streak-backpay.sql` once, after the repair, the migration and the redeploy, with `pay_from` (first line of the CTE, `DATE '2026-01-08'`) set to the first lesson date to back-pay. It pays the bonus the new code would have paid at every attended lesson where the run reaches a multiple of 5, dated by and linked to that lesson, only where the child has no streak bonus for that lesson yet (re-running pays nothing more; the index refuses duplicates anyway). It writes `point_transactions` only (the `student_points` trigger updates totals) and prints `bonuses_paid, points_paid`. The test checks it pays exactly the lessons the TS rule names, 50 each, dated by their lessons, and nothing on a second run. Note the stale queued jobs are deleted by the repair either way; the opt-in script covers all history, not just the queued subset.

### Tests
- `scripts/pgtest/attendance-streaks.test.mjs` (new suite "attendance streaks", 63 assertions, `expect: 63` in run.mjs): the real `attendance-effects.ts` over pglite through a PostgREST stand-in, on a `point_transactions` with `date NOT NULL` and no default as live has it (the old insert shape is refused there: 23502, proving the prelude reproduces live). Proves: the bonus row has `date` and `month` of the lesson, `session_id`, type, wording; 100 retries of the same lesson leave the run at 5 and one bonus; an older lesson processed late changes nothing and pays nothing; Late counts; Absent resets; re-marking Excused un-breaks it without paying twice; P P E (cancelled) P L P is a run of 5 with the bonus on the right lesson; a refused bonus fails the step and the retry pays once; a failed "already paid" read pays nothing; a failed register read writes nothing; no lesson -> nothing; the index refuses a second bonus and the code treats the race as paid; the migration applies twice and changes only the queue's status list; the repair gives, row for row, the TS rule's numbers on a fixture with inflated rows (600+), Late, Excused, a cancelled lesson, two lessons on one day, a child with no marks; queued jobs; re-run changes 0; the opt-in back-pay.
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
3. Run `scripts/REPAIR-attendance-streaks.sql` once, immediately before step 4 (it deletes the stale refused streak jobs so the new drain does not back-pay them; between steps 3 and 4 the old code can at most re-inflate children whose new jobs it touches, and the new code re-reads those from the register on its first drain). Keep its printed counts.
4. Redeploy, with the same verify_jwt as now (config.toml: mark-attendance true, stars-sync true; analyze-video-submission has no entry, i.e. the default):
   - `mark-attendance`: `mark-attendance/index.ts`, `_lib/rate-limit.ts`, `_lib/attendance-effects.ts`, `_lib/session-guard.ts`, `_lib/money-guard.ts` (money-guard imports `./session-guard.ts`). Only the streak call changed since v4.
   - `stars-sync`: `stars-sync/index.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts`, `_lib/attendance-effects.ts`, `_lib/stars-sync-core.ts`.
   - `analyze-video-submission`: `analyze-video-submission/index.ts`, `_lib/claude-json.ts`, `_lib/speech-file.ts`, `_lib/gemini-transcript.ts`, `_lib/video-homework.ts`.
   (`_lib/*` above import nothing relative beyond what is listed; remote imports are esm.sh / deno.land / npm.)
5. Publish the app for the review panel's label (optional; the function works without it).
6. Only if the owner opts in: `scripts/OPTIN-attendance-streak-backpay.sql` with `pay_from` set.
