# Lesson reports (21 Nov 2026)

A daily report of what happened in a lesson, for the teacher first and then for each family.
Database contract: `supabase/migrations/20261121130000_lesson_reports.sql` (read its header);
suite: `scripts/pgtest/lesson-reports.test.mjs`.

## Owner's rulings (21 Nov 2026)
- The lesson monitor transcript (in-class pseudo-names included) may go to Claude to write the draft.
- Context for the draft, all of it: the transcript; photos a teacher or TA took of the screen,
  whiteboard, worksheets and other material (`lesson_report_photos`); student work uploaded from the
  lesson's start to **30 minutes after its end** (`student_work`, with its OCR text); attendance;
  points given in that lesson; homework set that day and recent homework results; target words if any.
- A child's part comes from the app's records plus the teacher's line. The AI MAY suggest moments where
  the teacher names a child ("name moments"); staff only, each accepted or deleted by the teacher.
- The AI proposes 2-4 objectives; the teacher confirms them.
- Approval sets an auto-marked review quiz as the class's homework.
- Nothing reaches a family before a teacher approves. Another child's work or part never reaches a family.

## Stages
- **A - draft and teacher review.** Photo capture (teacher/TA), edge function `lesson-report-draft`,
  the teacher's review-and-approve screen. Writes through `lesson_report_claim` / `lesson_report_finish` /
  `approve_lesson_report`.
- **B - families.** What a parent and a child see: `get_lesson_reports_for_student` (class_part + that
  child's part only) and edge function `lesson-report-file` for the shared photos and the child's own work.
- **C - review quiz.** `get_lesson_review_quiz` (no answers) and `submit_lesson_review` (marks, grades the
  homework, awards points through `award_homework_points`), rendered in the Homework section.

## What the lesson set out to teach (`20261121150000`, `20261121151000`)
- `curriculum_lessons` holds one row per course-book lesson (Oxford Discover 2e Level 3 so far: 90 rows,
  Get Ready / Read / Understand / Communicate per unit, Big Question and Wrap Up per unit pair), generated
  from the school's own Teacher's Guide by `scripts/build-curriculum-seed.mjs` - objectives, words, reading
  strategy, grammar point, skills focus, Big Question and Student Book page, no teaching notes. Any staff
  member reads it; only an admin changes it. Another level is another generated seed migration.
- `session_lesson_plans` says which of those a session covered, set on the review screen ("What this lesson
  covered", which suggests the lesson after the class's last one). Staff of the session only; who and when
  are the server's.
- `lesson-report-draft` reads the plan as the caller and passes it as `planned_lessons` in the evidence;
  the instructions make it the starting point for the 2-4 objectives and say a plan is intent, never proof
  (no evidence means `unknown`). No plan, or a database without the migration, builds exactly as before.
- `scripts/pgtest/curriculum-lessons.test.mjs` runs both migrations.

## The draft body (`lesson_report_drafts.body`, written by A)
Every family-facing text has an English field and a `_vi` Vietnamese field.

```jsonc
{
  "schema": "hec-lesson-report-draft/1",
  "lesson":     { "title": "", "title_vi": "", "summary": "", "summary_vi": "" },
  "objectives": [ { "text": "", "text_vi": "", "met": "yes|partly|no|unknown", "evidence": "" } ],   // 2-4
  "taught":     [ { "topic": "", "detail": "", "detail_vi": "" } ],
  "words":      [ { "en": "", "vi": "", "example": "" } ],
  "structures": [ { "pattern": "", "example": "" } ],
  "activities": [ { "name": "", "description": "", "description_vi": "" } ],
  "gaps":       [ { "issue": "", "kind": "misconception|gap|grammar|vocabulary|pronunciation",
                    "who": "class|some", "evidence": [ { "t": 0, "quote": "" } ], "suggestion": "" } ],  // staff only
  "class_focus":[ { "en": "", "vi": "" } ],          // the gaps, softened, for families
  "students":   [ { "student_id": "", "highlight": "", "highlight_vi": "", "focus_next": "", "focus_next_vi": "",
                    "work_ids": [], "points": 0, "attendance": "Present|Late|Absent|Excused|unknown",
                    "name_moments": [ { "t": 0, "quote": "", "why": "" } ] } ],                  // name_moments: staff only
  "parents":    { "tips": [ { "en": "", "vi": "" } ], "ask_your_child": [ { "en": "", "vi": "" } ],
                  "next_lesson": { "en": "", "vi": "" } },
  "homework":   [ { "homework_id": null, "title": "", "due_date": null } ],
  "photos":     [ { "photo_id": "", "share": true, "caption": "", "caption_vi": "" } ],
  "quiz":       { "title": "", "questions": [ /* see below */ ] },
  "sources":    { "transcript": true, "transcript_lines": 0, "transcript_note": "", "photos": 0, "works": 0, "attendance": 0, "points": 0 }
                // transcript_note only when there is no transcript (e.g. an admin built it: only the lesson's teacher reads it)
}
```

## What approval stores (A's screen calls `approve_lesson_report`; B and C read it)
- `class_part` = `{ schema: "hec-lesson-report/1", lesson, objectives (text, text_vi, met), taught, words,
  structures, activities, class_focus, parents, homework, photo_captions: {photo_id: {caption, caption_vi}} }`.
  Never `gaps`, `name_moments`, `evidence` or `sources`.
- `staff_part` = `{ gaps, name_moments_accepted: [{student_id, t, quote}], sources, model }`.
- each child's `part` = `{ highlight, highlight_vi, focus_next, focus_next_vi, attendance, points, work_ids,
  teacher_comment }` - `work_ids` only that child's own `student_work` ids.
- `p_photo_ids` = photos the teacher ticked to share.
- `p_quiz` = `{ title, body?, due_date?, points?, questions }`.

## Quiz questions (`lesson_review_quizzes.questions`)
```jsonc
{ "id": "q1", "kind": "choice|gap|order", "prompt": "", "prompt_vi": "",
  "options": ["", ""],        // choice: the choices; order: the pieces, shuffled
  "answer": "",               // choice/gap: the text; order: the pieces joined by one space
  "accept": [""],             // gap only, optional: other accepted spellings
  "explain": "", "explain_vi": "", "objective": 0 }
```
Marking (C, in SQL): compare trimmed, case-folded, inner spaces collapsed, trailing .!? dropped.
