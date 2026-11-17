# FIX: analyze-transcript (D-26)

Where I am / next step: fix round 1 (the review's M-1..M-4 and minors) built and tested on branch `transcript-fix` (see "Fix round 1" at the end, which supersedes the deploy order below: two pastes now); next step is the conductor's re-review, then the owner pastes `20261117100000`, deploys `analyze-transcript`, pastes `20261117100100`, and publishes the app. Nothing applied, deployed or pushed.

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
- `tsc --noEmit -p tsconfig.app.json`: exit 0 (233 s).
- `npm run test:bun` (`node scripts/run-bun-tests.mjs`): 250 pass, 0 fail, 18 files.
- Full `node scripts/pgtest/run.mjs`, once: 8355 assertions across 87 suites, 1 suite failed - `d4 money inputs` 307/308, case N-2 ("its open enrolment ended today"), run at 04:0x Hanoi, the known after-midnight clock edge; that suite loads none of this work's files. Re-run alone with `NODE_OPTIONS="--import file:///.../scratchpad/clock-back-8h.mjs"`: 308 passed, 0 failed. Every other suite green, including `transcript drafts (D-26)` 141 and `ai spend gate (F-02)` 269.

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

## Fix round 1 (review `REVIEW-transcript.md`, branch `transcript-fix` from `3a036509`)

Nothing applied, deployed or pushed. Live database: read-only SELECTs returning counts only.

### M-1 (conductor's ruling: take the old pipeline's output off families' view, keep the content)

New migration `supabase/migrations/20261117100100_transcript_legacy_unpublish.sql`, a second file rather than more of `20261117100000`, because it must be pasted AFTER the new `analyze-transcript` is deployed (the old function publishes again on its next run), it is a one-time data step rather than schema, and keeping it apart lets it be re-pasted on its own if anything slips in between (it is idempotent). It refuses unless this round's `20261117100000` is in (guard on, `_transcript_alias_revert` present, the suggestions table accepts `legacy_auto`).

Per lesson with NO approval row it:
1. copies every row it takes down, whole, into the new `transcript_legacy_holds` (staff of the class only: one SELECT policy for admin / `is_teacher_of_class`, no write policy, explicit grants, anon none);
2. drafts the lesson so a teacher approves it in the new panel WITHOUT a paid re-analysis: a suggestion per linked speaker naming the child the old pipeline picked, `confidence = medium`, `basis = 'legacy_auto'` (or `teacher_alias` when a teacher saved that label for that child), `labels_from_model = true` (not recorded for these lessons, so assumed); its published errors, de-duplicated, as the drafted errors; its latest CEFR point as the drafted level; the published overview as `overview_draft`; `analysis.drafted_for_review = true`. The screen never pre-selects `legacy_auto` or a saved label on a model-made label: the teacher chooses every child;
3. unlinks the metric rows (`student_id` NULL; the old child is in the suggestion and the held copy);
4. deletes the error rows (cards cascade), the CEFR points and the non-edited overviews.

Identification rule (the only rows it touches):
- `student_error_log`: `source = 'transcript' AND source_id = <lesson> AND created_by IS NULL`, plus their `srs_cards`;
- `cefr_assessments`: same rule;
- `lesson_overviews`: `transcript_id = <lesson> AND NOT edited_by_teacher`;
- `transcript_speaker_metrics`: `student_id IS NOT NULL` on a lesson with no approval.

Why `created_by IS NULL` is exact:
- `20260712090000` documents it ("NULL = pipeline"); the column has no default live (checked);
- the old analysis (at `6404f52b`) never set it; the old screen's hand picker set `created_by: user.id`; `approve_transcript_analysis` sets it;
- no other code writes `source = 'transcript'` (grep of `src` and `supabase`); video homework and other features use other sources (`homework`, `student_work`, `live_flag`, `vocab`, `ai_report`, ...), which it never reads.

Kept as they are:
- the 2 teacher-edited overviews stay published (the teacher's own text, and possibly written by hand). They become the draft too, marked `edited_by_teacher`, so a re-analysis keeps them and the approval republishes that same text (N-9). The approval does not count such an overview as "shared automatically" while the draft is the teacher's.
- rows a person made on the same lessons (the old picker's errors / levels: none live) stay published; approving such a lesson asks the replace step, as before.
- `student_learning_profiles` (an AI summary built from the published rows, family-readable): not touched; each child's profile is refreshed when a teacher approves. The owner may refresh the 32 children's profiles after the paste.

Fails closed (nothing moves) on: this round's `20261117100000` missing, an unknown policy on a draft table, RLS off, a linked teacher / "Unknown" speaker, two speakers linked to one child in one lesson, a published error / CEFR row whose child is no linked speaker of a lesson that has no drafts. Prints its counts (NOTICE, a SELECT before COMMIT, and a per-table summary of everything held after COMMIT). A second paste finds nothing and changes nothing; a later paste takes back anything published in between.

Live, read-only, with the rule exactly as written (no approvals exist yet):

| | Rule selects | Review's count |
|---|---|---|
| lessons | 24 (all analysed) | 24 |
| metric links / children | 57 / 32 | 57 / 32 |
| error rows / their cards | 100 / 100 | 100 / 100 |
| CEFR points | 54 | 54 |
| overviews taken down / kept (teacher-edited) | 22 / 2 | 24 (2 edited) |
| `source = 'transcript'` errors / CEFR rows outside the rule | 0 / 0 | |
| other error rows / cards / CEFR rows, untouched | 170 / 170 / 9 | |
| shape refusals (teacher or Unknown linked, one child twice, orphan rows) | 0, 0, 0 | |
| distinct drafted errors after de-duplication | 94 | |
| speakers whose basis will be `teacher_alias` | 1 | |
| `created_by` column defaults | none | |

Proof (suite): before the paste, the child and family read the old rows. After: they read none. No row of those lessons is linked. Every row a person or another feature made has the same ids, and the approvals are unchanged. The two teacher overviews are unchanged. Held copies, by table, equal what was taken. The holding table is staff-only. The suggestions are as described, and nobody is pre-selected. Each lesson reads as a draft. Pasting twice changes nothing. Approving a held lesson needs no replace step, and the old guess (Bao Tran) gets nothing. The teacher-overview lesson keeps the teacher's text. The teacher's own rows ask the replace step. A later paste picks up a new one, and its speaker key equals the function's `speakerKey`.

### M-2: re-approving must not republish errors the teacher dropped

- What changed: approve stores, per speaker in `transcript_approvals.assignments`, `kept_errors` (as published) and `draft_error_count`.
- `initialChoices(metrics, suggestions, approval)` seeds each box from the approval (standing or withdrawn), matching on error and correction text. The page now reads `assignments`.
- Proof: drop ERR2 and approve. "Approve again" then starts `[true, false]`, and approving unchanged publishes 1 error, ERR2 none. The same holds after a withdrawal. Probe R7 turned round.

### M-3: a withdrawn pick must not live on as a high pre-selection

- What changed in the database:
  - `transcript_approvals.alias_writes` records each alias the approval wrote: the label, whether it existed, the child it held before, the child after.
  - Withdraw, and a re-approval before it rewrites, put each alias back through `_transcript_alias_revert`, newest first. That means the earlier child, or removing an alias the approval created. An alias somebody changed since is left alone.
  - The helper is executable by the owner only.
- What changed in suggestions and the screen:
  - `suggestSpeaker` caps a saved label on a model-made label at `medium`.
  - `preselects` never pre-selects a `teacher_alias` on a model label, or `legacy_auto`.
- Proof: a "bao" alias (Bao Ngoc) is overwritten by an approval as Bao Tran, then restored to Bao Ngoc on withdraw. A new label approved as Kiki, then Anh, ends at Anh, and is removed on withdraw. A label changed by someone else survives. The model-label alias is not pre-selected.

### M-4: show everything that will be published, let the teacher drop or edit it

- What changed in the database: approve now REQUIRES `text: { contribution, teacher_feedback, recommendation, highlights }` for every speaker given a child, and writes exactly that onto the metric row. Empty publishes nothing. `edited_by_teacher` is set when she changed it. The before and after text are kept in `assignments`.
- What changed in the panel:
  - per chosen child, under "What X's lesson page and family will see once you approve": the speaking figures, editable "How you did" / "Your teacher says" / "Try next" (badged "AI draft" until edited), highlights to tick, and practice points to tick;
  - the caption and the replace confirm name all of it, the lesson summary included.
- Proof: an approval without `text` is refused. The child reads exactly the teacher's edit, no dropped feedback, and the kept highlight only. Probe R2 turned round. The source check covers the panel.

### Minors

- **N-1:** the guard refuses an API role changing `transcript_id` or `class_id` of any metric row. Proof: probe R3 and the suite (teacher, service role, admin, into an approved lesson). Text edits still pass.
- **N-2:** approve takes a metric row only `AND class_id = tr.class_id`. Proof: probe R4 and the suite.
- **N-3:** the child must hold an enrolment covering the lesson date (start ≤ date ≤ end). The panel offers exactly those children, from a new lesson-date roster. Proof: ended before the lesson is refused, joined after is refused, left since is accepted.
- **N-4:** a child for the "Unknown" speaker is refused. Proof: probe R6.
- **N-5:** the guard refuses an API role deleting a metric row linked to a child. After the take-back no unapproved linked rows remain anyway. Proof: probe R8.
- **N-6:** `transcript_approval_active` answers only an admin, the class's staff or a caller with no session (service role, owner). Everyone else gets false, and anon cannot call it. Proof: probe R1 and the suite.
- **N-7:** "Retry transcription" is disabled on an approved lesson, with a tooltip saying why. This is in the screen only; `transcribe-lesson-audio` is unchanged. Proof: source check.
- **N-8:** the function stamps `status = 'processing'` before analysing in both modes. A failed stamp gives a 503. Proof: the suite (the first write of a sync run).
- **N-9:** the teacher's overview text is kept as the draft by the take-back. A re-analysis keeps a teacher-marked draft (suite), and the approval does not replace it with AI text.
- **N-10:** unchanged by design. Approving stays open to everyone `is_teacher_of_class` covers, like every other staff policy.

### Files (LF md5, CR stripped)

| File | md5 |
|---|---|
| `supabase/migrations/20261117100000_transcript_analysis_drafts.sql` | 921dc2136710395071810bfdb7b5c5c0 |
| `supabase/migrations/20261117100100_transcript_legacy_unpublish.sql` (new) | aa3b9ee0d66e9bfafd32b7c587776bc7 |
| `supabase/functions/analyze-transcript/index.ts` | 91226837ac479450f06a6114e7f21048 |
| `supabase/functions/_lib/speaker-suggestion.ts` | f76d5f35174b732ee14b97c0f92fd8e4 |

Screen: `src/lib/transcriptReview.ts`, `src/components/teacher/TranscriptApprovalPanel.tsx`, `src/pages/TeacherTranscripts.tsx`.

Tests:
- `scripts/pgtest/transcript-drafts.setup.mjs` (new): the shared database;
- `transcript-drafts.test.mjs`;
- `review-transcript-probes.mjs`: the reviewer's R1-R9, turned round.

### Deploy order (owner)

1. Paste `20261117100000_transcript_analysis_drafts.sql`. It is not applied yet; this round's version replaces the first.
2. Deploy `analyze-transcript`. Its imports are unchanged from the first round, and `_lib/speaker-suggestion.ts` changed.
3. Paste `20261117100100_transcript_legacy_unpublish.sql`.
   - It prints the counts; send them back. Expected: 24 lessons, 57 links and 32 children, 100 errors and 100 cards, 54 CEFR points, 22 overviews taken down and 2 kept.
   - If it refuses, send back what it names.
4. Publish the app. Do 3 and 4 back to back: between them the old screen cannot approve, and families see nothing of those 24 lessons except the 2 teacher-written overviews.

Steps 1 and 2 may swap (stricter): the new function answers 503 until 1 is in. Step 3 must come after 2. If an analysis ran on the old function after 3, paste 3 again.

### Tests (fix round 1)

Run on the real clock (the full run started 08:37 Hanoi). The machine was shared with other agents' suites.

| Check | Result |
|---|---|
| `transcript drafts (D-26)` (expect pinned at 221; was 141) | 221 passed, 0 failed |
| `transcript review probes` (R1-R9 turned round, expect 34) | 34 passed, 0 failed |
| `ai spend gate (F-02)` | 269 passed, 0 failed |
| `edge functions typecheck` | 5 passed, 0 failed |
| `app typecheck` inside run.mjs | 3 passed, 0 failed |
| Full `node scripts/pgtest/run.mjs` | **8470 assertions across 88 suites, 0 failed** (exit 0) |
| `npm run test:bun` | 250 pass, 0 fail, 18 files |
| `tsc --noEmit -p tsconfig.app.json` standalone | exit 0 |

Still not verified:
- the screen was type-checked, not opened in a browser;
- real OpenAI replies are not exercised;
- the take-back ran only against the in-process Postgres. Live: only its selection, read-only.
