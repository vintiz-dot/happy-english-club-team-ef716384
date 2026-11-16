# FIX: analyze-transcript (D-26)

Where I am / next step: design written (below); next step is the migration `20261117100000_transcript_analysis_drafts.sql` and its pgtest suite.

## Owner's rulings

- "Yes, fix it" - to: "Fix the transcript analysis so it sends no names and nothing reaches families before a teacher approves".
- Then, relayed by the conductor, verbatim: "it's ok to send names. the students use psuedo names in class". So item 1 (neutral labels / no names to the vendor) is dropped: the prompt keeps sending the roster names as it does today, and no name-scrubber is added. Everything else stands: model attribution is a suggestion only, results are staff-only drafts until a teacher approves, spend gate, tests (without the "no roster name in the payload" case).

## What the function did (before)

`supabase/functions/analyze-transcript/index.ts` at 6404f52b, service role throughout:

- matched every speaker label to a child by fuzzy name match (`matchStudent`, score >= 0.5) - labels that, for a room recording, the model itself had produced (`llmDiarize`, or `transcribe-lesson-audio`'s diarizer for `source_format = 'audio'`) - and wrote that child into `transcript_speaker_metrics.student_id`, which the child's own login reads (`students_read_own_tsm`);
- for every matched child wrote `student_error_log` (+ `srs_cards`) and a `cefr_assessments` point from the model's own CEFR estimate; families read `cefr_assessments` (`family_read_children_cefr`), children read both;
- upserted `lesson_overviews`, which enrolled children and families read;
- fired `refresh-student-profile` for every matched child (`student_learning_profiles`, family-readable);
- had no spend gate: `requireRole` only, and it read the body and the transcript row before checking anyone.

## Design (smallest change that keeps every reader correct)

The three published tables keep their meaning - everything in them is published. The analysis no longer writes them; drafts live where only the class's staff can read them:

- `transcript_speaker_metrics` rows are still written per speaker, but with `student_id` NULL. Every reader of that table that is not staff filters on `student_id` (child's own row) or reads it by student id, so a NULL row reaches nobody but staff.
- NEW `transcript_speaker_suggestions` (staff-only SELECT, no write policy): per speaker, the suggested child with `low / medium / high` confidence and its basis, plus the drafted errors and CEFR estimate. A CHECK makes `low` carry no child at all ("unknown").
- `class_transcripts.overview_draft` (new column; the table is admin + class teacher only) holds the draft lesson overview.
- NEW `transcript_approvals` (staff-only SELECT, no write policy): one row per transcript - who approved, when, what the teacher chose per speaker, and the ids of every row the approval published, so a re-approval or a withdrawal removes exactly those and nothing else.
- `approve_transcript_analysis(transcript, assignments, overview, replace_legacy)`: SECURITY DEFINER, admin or `is_teacher_of_class`, one transaction. Only the children and CEFR levels the teacher sends are used; the suggestions are never read for who a child is. Publishes the error log + SRS cards, the CEFR points and the lesson overview; links the metric rows; remembers the label in `class_speaker_aliases`. Re-approving replaces what the previous approval wrote.
- `withdraw_transcript_approval(transcript)`: removes exactly what the approval published and unlinks the metric rows.
- A trigger on `transcript_speaker_metrics` refuses any API role (anon, authenticated, service_role) that sets `student_id` to a child, or inserts/deletes rows of a transcript whose approval stands - so the definer RPC is the only way a line lands on a child, and a re-analysis cannot pull rows out from under a published approval.
- Confidence: a teacher's saved alias = high; an exact roster-name match on a label from the source text = high; the same on a label the model produced = medium; a unique "contains" match = medium; a unique token match = medium from the text, low from the model; a tie or a weak match = low (no child). The point-award suggestions (already applied by a teacher one by one) now get a child only at medium or high.
- Existing published rows (legacy): left exactly as they are. How many exist in production is unknown to me (no live database access). Approving a transcript that the old pipeline already published is refused unless the teacher explicitly chooses to replace those rows; the replaced rows are copied into the approval record first.
