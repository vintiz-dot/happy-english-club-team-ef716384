# FIX: analyze-transcript (D-26)

Where I am / next step: built and tested on branch `worktree-agent-a31821f59b07b78ef`; next step is the conductor's review, then the owner pastes the migration, deploys `analyze-transcript`, and publishes the app (in that order - see "Deploy order"). Nothing applied, deployed or pushed.

## Owner's rulings

- "Yes, fix it" - to: "Fix the transcript analysis so it sends no names and nothing reaches families before a teacher approves".
- Then, relayed by the conductor, verbatim: "it's ok to send names. the students use psuedo names in class". So item 1 (neutral labels / no names to the vendor) is dropped: the prompts keep sending the roster names as they did, and no name-scrubber is added. Everything else stands: model attribution is a suggestion only, results are staff-only drafts until a teacher approves, spend gate, tests (without the "no roster name in the payload" case).
- Names in the transcript text itself: by design they are there. A pasted Zoom / Teams / "Name:" transcript carries each speaker's name as its label, and a room recording relies on the teacher calling a child's name before they speak (that is how both diarizers attribute turns). Under the ruling this is accepted; nothing scrubs it.

## What the function did (before, at 6404f52b)

`supabase/functions/analyze-transcript/index.ts`, service role throughout:

- matched every speaker label to a child by fuzzy name match (`matchStudent`, score >= 0.5) - for a room recording, labels the model itself produced (`llmDiarize`, or `transcribe-lesson-audio`'s diarizer for `source_format = 'audio'`) - and wrote that child into `transcript_speaker_metrics.student_id`, which the child's own login reads (`students_read_own_tsm`);
- for every matched child wrote `student_error_log` (+ `srs_cards`) and a `cefr_assessments` point from the model's own CEFR estimate; families read `cefr_assessments` (`family_read_children_cefr`), the child reads all three;
- upserted `lesson_overviews`, which enrolled children and families read;
- fired `refresh-student-profile` for every matched child (`student_learning_profiles`, family-readable);
- had no spend gate (`requireRole` only), and read the body and the transcript row before checking anyone.

## What changed

### Migration `supabase/migrations/20261117100000_transcript_analysis_drafts.sql` (NOT applied)

Smallest change that keeps every reader correct: the published tables keep their meaning (everything in them is published), and the analysis stops writing them.

- Preflight, fail closed: refuses to install unless `is_teacher_of_class` / `has_role` exist, the eight tables it touches have RLS on, and every policy on the two tables that hold drafts is one it knows (`transcript_speaker_metrics`: admins_all_tsm, teachers_read_class_tsm, students_read_own_tsm, teachers_update_class_tsm; `class_transcripts`: admins_all_transcripts, teachers_manage_class_transcripts), with `students_read_own_tsm` still keyed on the row's own `student_id`.
- `class_transcripts.overview_draft jsonb` - the draft lesson overview (that table is admin + class teachers only).
- `transcript_speaker_suggestions` (new): per speaker, the suggested child with `low / medium / high` confidence and its basis, whether the label came from a model, the drafted errors and CEFR estimate. One policy: SELECT for an admin or `is_teacher_of_class`. No write policy (the function writes it as the service role). CHECK: a `low` row names no child.
- `transcript_approvals` (new): per transcript, who approved and when, which analysis run, what the teacher chose per speaker (beside the suggestion), the ids of every row the approval published, copies of any old-pipeline rows it replaced, and a history. Same single staff SELECT policy, no write policy.
- Explicit grants on both tables (authenticated: SELECT, INSERT, UPDATE, DELETE; service_role: ALL; anon: none) - RLS refuses every write from a person.
- `transcript_metrics_link_guard` trigger on `transcript_speaker_metrics` (runs as the caller): any API role (anon, authenticated, service_role) is refused when it links a row to a child (INSERT with a child, UPDATE to a child) or inserts / deletes rows of a transcript whose approval stands. Clearing a link is allowed. Inside the definer RPCs and FK cascades (current_user = owner) it does nothing.
- `approve_transcript_analysis(p_transcript, p_assignments, p_overview DEFAULT NULL, p_replace_legacy DEFAULT false)` - SECURITY DEFINER; refuses no session, anyone not admin / `is_teacher_of_class`, a lesson not `analyzed`; one transaction. Uses ONLY the teacher's choices: a speaker left out or sent with no child stays unknown, whatever its suggestion said. Validates each speaker belongs to the lesson, is not the teacher, is listed once, and the child has an enrolment in the class; the CEFR level must be on the scale. Publishes the kept errors (+ SRS cards), the CEFR points (signed by the teacher), the lesson overview, links the metric rows, and remembers the label in `class_speaker_aliases`. Re-approving replaces exactly what the previous approval wrote.
- `withdraw_transcript_approval(p_transcript)` - same checks; removes exactly the rows the approval listed and the overview, unlinks the metric rows, records who and when.
- Old-pipeline rows ("legacy"): never changed by the migration. Approving a transcript that the old pipeline already published (error log / CEFR rows with `source = 'transcript'` for it, a linked metric row, an overview not written by an approval) is refused with hint `TRANSCRIPT_LEGACY_ROWS`; with `p_replace_legacy = true` (the screen asks the teacher) they are copied into `transcript_approvals.replaced_legacy` and then replaced. How many such lessons exist in production is unknown to me (no live database access).

### Function `supabase/functions/analyze-transcript/index.ts`

- Spend gate first: `requireSpender` (staff, 10 calls per account per 10 minutes) before the body or any row is read. The one caller let past it is the service-role key, which is how `transcribe-lesson-audio` hands off after its own staff + class check; it still goes through `requireRole` + `callerHoldsClass`.
- Refuses (409) a lesson whose approval stands, before any model call; fails closed (503) if the approval cannot be read.
- `matchStudent` replaced by `_lib/speaker-suggestion.ts` (new, imports nothing): alias = high; exact name from the text = high, from a model = medium; unique whole-word contains = medium; unique token match = medium from the text, low from a model; a tie or weak match = low with no child. Labels are "from a model" for `source_format = 'audio'` and whenever `llmDiarize` ran.
- Writes drafts only: metric rows with `student_id` null, one suggestion row per non-teacher speaker (errors drafted there, at most 5), the draft overview on `class_transcripts.overview_draft` (a draft the teacher edited is kept), `analysis.drafted_for_review = true`. No write to `student_error_log`, `srs_cards`, `cefr_assessments`, `lesson_overviews`; no profile refresh. Metric / suggestion / final-update write errors now fail the run instead of being ignored.
- Point-award suggestions (already applied one by one by a teacher): the child is filled in only at medium or high confidence (names there are model-extracted, so an exact match is medium).
- The prompts still carry the roster names (owner's ruling).

### Screens

- `src/pages/TeacherTranscripts.tsx` + new `src/components/teacher/TranscriptApprovalPanel.tsx` + new `src/lib/transcriptReview.ts`: a "Teacher approval" card per lesson - draft / approved / shared-automatically badge; per speaker the suggestion with its confidence, a child picker ("Unknown - don't assign" unless the suggestion is medium or high), a CEFR level picker (the drafted one marked), the drafted errors with keep / drop boxes; Approve (asks before replacing old-pipeline rows), Approve again, Withdraw. Re-analyze is disabled while approved. The overview editor saves to the draft; badges say "draft - not shared yet" / "shared with students" / "edited since approval". The old per-card "who was this?" picker (which wrote `student_id`, the error log, SRS cards and a CEFR point straight from the browser) is removed. After an approval the screen refreshes the approved children's profiles.

### Readers checked (every reader of the three tables and of `transcript_speaker_metrics`)

Family / child readers - all now see only approved (or pre-existing) rows, because drafts are not in these tables and draft metric rows have no child:

- `src/pages/FamilyDashboard.tsx:71,147` lesson_overviews (family policy) - published only.
- `src/components/student/LessonOverviewsCard.tsx:37`, `src/pages/StudentLessons.tsx:40`, `src/pages/StudentLessonDetail.tsx:41,50,58` (overview, own metric row by `student_id`, own errors by `student_id`) - published only.
- `src/components/charts/CefrGrowthChart.tsx:40` (cefr by student) - published only.
- `src/components/student/SrsReviewDeck.tsx:83,100` srs_cards - written only by the approval now.
- `supabase/functions/chat/index.ts:503,607,763` (cefr, overviews, error log through the caller's own client) - published only; `:1366` (staff-only tool, metric rows by class) - staff may see draft rows, with no child.
- `supabase/functions/refresh-student-profile/index.ts:96-112`, `generate-student-report/index.ts:104-137`, `cefr-defense/index.ts:259-267` - read by `student_id`, so drafts are invisible.

Staff readers / writers, unchanged: `src/components/shared/StudentActionPopover.tsx` (teacher's live flag), `src/components/cefr/CefrDefensePanel.tsx`, `src/components/admin/class/ClassAdminActions.tsx:73` (a count), `supabase/functions/ocr-vocab-scan` (its own source), `transcribe-lesson-audio:330` (reads overviews for context).

## Tests

- New suite `scripts/pgtest/transcript-drafts.test.mjs` (registered in `run.mjs`, expect 141): 141 passed, 0 failed. The real migration over production's policies (copied from the migrations that made them) + the real `is_teacher_of_class` (20261111110000) + the real staff policies (20261113140000): preflight refusals, paste twice, grants; a family, the child, another class's child and a role-less account read no suggestion, approval, transcript or draft metric row and nothing published; another class's teacher reads none of it; the link guard (service role, teacher, admin); the low CHECK; who may approve and withdraw; approve publishes once and re-approving replaces (no duplicates); a declined HIGH suggestion lands on nobody; withdraw removes exactly its rows and leaves unrelated ones; old-pipeline rows refused then replaced on request with copies kept; an admin can still delete an approved transcript. Then the REAL analyze-transcript, bundled, against a stand-in and a scripted OpenAI: refusals spend nothing; a paste writes nothing a child or family reads, unlinked metric rows, Kiki high / Bao low (two Baos) / An low; an audio transcript caps at medium; a room transcript diarized by the model is a suggestion; the service-role hand-off still runs; the rows it wrote are loaded into the real schema (columns, CHECKs, guard) and approved with the screen's own pre-selection - the low suggestions land on no child. Plus the screen helper and the suggestion rule.
- `scripts/pgtest/ai-gate.test.mjs`: analyze-transcript section added (staff only, 10 per 10 min, service-role hand-off let through, gate before the body, callers through `functions.invoke`, `verify_jwt = true`): 269 passed, 0 failed.
- Edge-function type check: 5 passed, 0 failed (110 files).
- Remaining results: see the report section below.

## Deploy order (owner)

1. Paste `20261117100000_transcript_analysis_drafts.sql` in the SQL editor. If it refuses, it names the policy it does not know - send that back, do not edit around it.
2. Deploy `analyze-transcript` (imports: `../_lib/text.ts`, `../_lib/auth.ts`, `../_lib/ai-gate.ts` (which imports `../_lib/rate-limit.ts`), `../_lib/speaker-suggestion.ts` (new); remote `https://esm.sh/@supabase/supabase-js@2.75.0`; `../_lib/profile.ts` is no longer imported).
3. Publish the app (the new Teacher Transcripts screen).

Between 1 and 2 the old function still publishes at once (as today). Between 2 and 3 the old screen shows drafts as "isn't on the roster" and its picker is refused by the database; nothing is published until the new screen is out.

## Not verified / limits

- Nothing ran against the live database. Whether production's policies on `transcript_speaker_metrics` / `class_transcripts` are exactly the six the preflight knows is from the migration files only; the preflight will say if not.
- How many lessons the old pipeline already published is unknown.
- The screen was type-checked, not opened in a browser.
- The model is a stand-in in the tests; the real OpenAI replies are not exercised.
- `class_speaker_aliases` written by an approval are not removed by a withdrawal (they are only ever read back as a suggestion).
- Re-approving replaces the published errors, so their SRS cards are recreated and their review progress resets (the same as video homework's re-approval).
- Not changed, but seen while reading: `transcribe-lesson-audio` (Whisper + diarization for a browser) has no `requireSpender`; `generate-student-report` and `cefr-defense` write `cefr_assessments` from a model's answer, which families read. Both outside this task.
