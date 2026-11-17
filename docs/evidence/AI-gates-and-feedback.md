# AI spend gates and teacher-approved feedback (N-5, N-6, N-7)

Branch `ai-gates-feedback`, from `origin/main` at `9e591347`. Three gaps from the independent privacy review of 17 Nov 2026. Nothing here is deployed or applied; no live data was changed. Live reads were counts and definitions only.

## N-5: eight more functions behind `requireSpender`

Owner rule: every function that calls a paid vendor for a browser starts with `requireSpender` (`_lib/ai-gate.ts`): a real session, a role, a per-account limit.

| function | who | limit per account | sized from |
|---|---|---|---|
| refresh-student-profile | teacher, admin; service key 200 / 10 min | 60 / 10 min | callers: Smart Upload approvals (busiest uploader: 25 pages in 10 min), transcript approval (one per child), video approval; `_lib/profile.ts` from ocr-vocab-scan on the service key |
| generate-work-feedback | teacher, admin | 40 / 10 min | one per scanned page, 25 / 10 min busiest |
| video-rubric | teacher, admin | 20 / 10 min | one per video homework set |
| explain-family-tuition | admin | 20 / 10 min | one per family written to (each also calls calculate-tuition per child) |
| audit-eval-proxy | admin | 60 / 10 min | `audit_eval_runs`: 283 calls, at most 33 in any 10 min. Only the gate changed; the bucket, page and SQL caps are untouched (owner) |
| ocr-vocab-scan | teacher, admin (service key now refused: nothing calls it) | 20 / 10 min | 6 vocab pages in 10 min busiest |
| chat | student, family, teacher, admin | 30 / 5 min, plus the existing 80 a day | every role keeps it; role-less accounts are refused (live: 2 role-less accounts, neither linked to a child or a family, so no one who used it loses it) |
| analyze-video-submission | any role, then: the class's staff, or this child / their family | 30 / hour; a family account 6 / hour | see below |

`_lib/ai-gate.ts` gains one option, `serviceLimit`: off unless set, it lets the service-role key through under one shared count. Only refresh-student-profile sets it (the test asserts no other function does). The nine F-02 functions are unchanged in behaviour.

Each function's own role check (`requireRole` / `authenticateUser`) is replaced by the gate, which runs first, before the body is read; the scoping that followed (class, student) is kept and now uses the gate's identity.

### analyze-video-submission

Before: any bearer token (no role check, no limit); a family could start a run on an `uploaded` or `failed` take, and a failing video could be re-run without end; staff could re-run anything not approved. Status was set to `processing` by a plain update, so two calls at once both spent.

Now:
1. `requireSpender` (any role), the body's id must be a uuid.
2. The row is read as the caller (RLS). Not visible: 404.
3. Staff of the class (`video_staff_for_class`, as the caller) or, if not staff, `can_view_student(student, caller)` must be true; an error in either check is a 503, a "no" is a 404. Non-staff: 6 calls an hour per account.
4. `video_analysis_claim(submission, by_staff)` (migration `20261117160200`, EXECUTE for service_role only) takes the row lock, decides, counts and stamps `processing` in one step:
   - family: only an `uploaded` (new) or `failed` take; at most 3 runs a take and 10 a submission (the total survives re-records);
   - staff: anything not approved, not while a run is under way (processing and touched in the last 15 min), at most 6 a take and 20 a submission ("New draft", "Retry", "Start now" keep working);
   - answers `claimed` or `not_found` / `approved` / `with_teacher` / `busy` / `take_limit` / `total_limit`, mapped to 404 / 409 / 429.
5. `video_submissions.analysis_runs` / `analysis_take_runs` are written only by the claim: the guard (otherwise byte-for-byte the 20261109090000 one) sets them to 0 on any signed-in insert, keeps them on any signed-in update (a family, and a teacher through the staff policy), resets only the take count on a re-record.

The upload flow is unchanged: VideoHomeworkSubmission's upsert, then the invoke, is a family claim on an `uploaded` take.

## N-6: AI feedback on student work is a staff-only draft

Before: `student_work.ai_feedback` held the model's note; `students_read_approved_work` lets a child read every column of their approved rows, and the table is in the realtime publication. 65 rows had an AI text (64 approved, 1 rejected). generate-work-feedback overwrote the column on any row, whatever its status.

Live, read before deciding (counts only):

| status | rows | AI text | teacher_notes | notes = AI text | notes differ | AI text, no notes |
|---|---|---|---|---|---|---|
| approved | 223 | 64 | 96 | 56 | 8 | 0 |
| rejected | 31 | 1 | 1 | 1 | 0 | 0 |

The decision: `teacher_notes` IS the teacher-approved text. Smart Upload's "Approve & publish" writes the review box (pre-filled with the AI draft, edited or not) into `teacher_notes` in the same update that sets `approved` and `approved_by`; every approved row has `approved_by`. The child's screens (MyWorkGallery, StudentLessonDetail) already show `teacher_notes` only. No approved row has an AI text without a teacher text, so nothing a child sees disappears and nothing new appears; only the raw column is taken away.

Migration `20261117160000`:
- `student_work_ai_drafts (work_id PK -> student_work, feedback, generated_by, generated_at, source)`: RLS on, SELECT granted to authenticated, policy `student_work_ai_drafts_staff_read` = admin, or the rule of `student_work_staff_select` (uploader who is a teacher, or a teacher of the work's class), through a SECURITY DEFINER helper so a wider student_work policy could never widen it. No write grant or policy for authenticated: only the service role writes. No student or family policy.
- The 65 texts are copied verbatim (source `moved_from_student_work`), checked row by row, and only then cleared from student_work; the migration refuses to clear anything it has not copied.
- A trigger refuses a draft for work that is no longer `processing` / `needs_review`, taking the work row's lock so a draft cannot slip in during an approval.
- `student_work.ai_feedback` stays as a column (readers get NULL) but cannot hold text: an UPDATE setting it is diverted into a draft (refused for reviewed work: the old generate-work-feedback's overwrite), an INSERT setting it is refused, and `CHECK (ai_feedback IS NULL)` holds even if the trigger is dropped.

generate-work-feedback: gate first; 409 unless the work is `needs_review`; a `student_id` override must be a child the caller may see (its learning profile goes into the prompt); the draft goes to `student_work_ai_drafts`, and a refused write is a 409. refresh-student-profile now feeds the profile from `teacher_notes` only.

TeacherSmartUpload reads the drafts for the `needs_review` queue and pre-fills the box with `teacher_notes ?? draft`; "Approve & publish" with the box untouched is the one-click approve: it copies the draft to `teacher_notes`, the text the child reads.

## N-7: families read only the final fields

Before: `get_video_progress` gave a family each approved video's criteria from `criteria_scores` (the column every model run upserts). `get_video_homework_for_student` did the same and also returned the model's `strengths`, `focus_points` (never shown on any teacher screen, so never seen by a teacher) and each criterion's model `comment`.

Migration `20261117160100`:
- `video_analyses.final_criteria`: `[{key,label,score,max}]` as they stood when the teacher approved. VideoReviewPanel saves the teacher's per-criterion scores into `criteria_scores` and then calls `approve_video_feedback`; a trigger snapshots them whenever `approved_at` is stamped, so `approve_video_feedback` is unchanged. Backfill only where `updated_at = approved_at` (untouched since the approval, which writes both in one statement): live, 1 approved analysis, untouched.
- Family view: `get_video_progress` criteria = `final_criteria`; the report = final_score, final_grade, final_feedback_student, final_feedback_parent, `final_criteria` (label, score, max), approved_at; `strengths` and `focus_points` are empty arrays (kept as keys so the screen does not break). A family sees a video only once `approved_at` is set.
- Staff (an admin, or a teacher of the child's class; for the report, `video_staff_for_class`) get exactly what they got before.
- Both functions are replaced only if they are the 20261109090000 versions (md5 of the body, CR stripped: `293e4ee8...`, `d1ab0a9f...`, equal to live) or this one.

## Tests

| item | proof |
|---|---|
| N-5, all eight | `scripts/pgtest/ai-gate.test.mjs`: each REAL function bundled and driven. Before (git `9e591347`): limit + 1 calls from one account all reach the vendor. After: preflight; no header / anon key / not-a-session / empty bearer 401; role-less, role lookup failing, service key 403 (refresh-student-profile: service key let through, 200 per window then 429); a role-less account naming an admin in body and headers refused; each role allowed or refused; exactly the limit, then 429 with Retry-After, nothing read or spent; another account unaffected; IP headers do not escape; the gate is first in the source and its settings are the tested ones; callers send the session token; verify_jwt on |
| N-5 analyze-video-submission | ai-gate: family and teacher claim with the right `by_staff`; another child's account 404 with no claim; non-uuid 400; every claim refusal maps to its status with no vendor call and nothing written; family 6 an hour; no direct status write before the claim. `video-homework.test.mjs` (real migrations in pglite): family upload counters forced to 0; claim not executable by a family or a teacher; new take claimed; second family call `with_teacher`; teacher `busy` while running; two retries after failure then `take_limit`; teacher may still; family cannot re-run a draft with the teacher, teacher can; neither family nor teacher can reset counters; re-record resets the take, not the total; 10-run total for a family across re-records, 20 for staff; approved refused for both; unknown id; a run stuck 20 minutes may be restarted by the teacher |
| N-5 upload flow | the existing video-homework cases (child submits, upsert re-record, approval, wall, storage) pass with both new migrations applied |
| N-5 chat | `chat-assistant.test.mjs` unchanged and green, including "every tool" and the role-less refusal |
| N-6 | `scripts/pgtest/student-work-feedback.test.mjs` (new; the live student_work columns and policies, the REAL migration): refuses to install without student_work or staff_created_this and leaves nothing; BEFORE the child reads the raw AI text; applies twice; all four AI texts moved verbatim, none left; teacher_notes untouched; the child still sees both approved works with the teacher's text and no AI text; child and family read no drafts and cannot write one; the class's teacher reads the class's drafts, another teacher none, the uploader of unassigned work its own, an admin all; a teacher cannot write drafts; the service role drafts waiting work, is refused over approved and rejected work; the old function's column write becomes a draft or is refused over approved work; an insert with an AI text refused; CHECK holds with the trigger disabled; approving copies the draft to what the child reads, and it cannot be regenerated after |
| N-6 generate-work-feedback | ai-gate: approved / rejected / processing / failed work 409 with no vendor call and nothing written; waiting work writes only `student_work_ai_drafts`; a student override the teacher does not teach 403 with no vendor call |
| N-7 | `video-homework.test.mjs`: the family's progress and report show the teacher's approved per-criterion score with no comment or evidence, and no model strengths / focus points / text; after the model overwrites `criteria_scores` the family still sees the approved score; staff (teacher, admin) unchanged; a re-approval takes the new scores; an approval with no snapshot shows no criteria (final score and words still show); a classmate still refused. A mutant of the migration that gives families `criteria_scores` fails 5 of these |

## Gates

Run at 20:08 Hanoi, so `run.mjs` ran with a preload moving the clock back 8 hours (NODE_OPTIONS `--import`, inherited by every suite).

| gate | main `9e591347` | this branch |
|---|---|---|
| `node scripts/pgtest/run.mjs` | 3999 assertions, 46 suites, 2 failed | 4545 assertions, 48 suites, 2 failed |
| the two failures | invoice status 236/32, stars sync core (crash) | the same two, the same counts: the known main-vs-conductor harness lag, files this branch does not touch |
| AI spend gates (new to main) | - | 474 / 0 (250 F-02 + 224 N-5) |
| student work feedback (new) | - | 32 / 0 |
| video homework | 55 / 0 | 95 / 0 |
| chat assistant | 201 / 0 | 201 / 0 |
| edge functions typecheck | 5 / 0 | 5 / 0 (112 files loaded) |
| homework grading | 27 / 0 | 27 / 0 |
| `tsc --noEmit -p tsconfig.app.json` | | exit 0 |
| `npm run test:bun` | | 142 pass, 3 fail: `SettleBillModal.tsx` missing and `scripts/fixtures/rich-text/dom` missing - neither exists on `origin/main`; no file here touches them |

## Migrations (LF md5, CR stripped)

| file | md5 |
|---|---|
| `supabase/migrations/20261117160000_student_work_ai_feedback_staff_only.sql` | `428742572d7bcdf20cfaad99b8d9fb1a` |
| `supabase/migrations/20261117160100_video_family_reads_final_only.sql` | `3b7fc29208bea70aee5312d402c3c5a9` |
| `supabase/migrations/20261117160200_video_analysis_claim.sql` | `4bf82dbd70978f1b143ddf7b5aa23f7f` |

## Functions to deploy (LF md5, CR stripped)

`_lib/ai-gate.ts` changed (`f28818eaf3e3e36a3633124d62faf0ea`); it imports `_lib/auth.ts` (`92b44db93cd2614a2fb3011e3a9063ba`, unchanged) and `_lib/rate-limit.ts` (`aad3d996bc38a83848e33bd1cb88415e`, unchanged). Every function below bundles those three.

| function | its files |
|---|---|
| refresh-student-profile | `index.ts` `4aaf6d92f727edff047740495fcbfc75` |
| generate-work-feedback | `index.ts` `efe3acfc4bc170b4ed5afd9ce95d96fd` |
| video-rubric | `index.ts` `61c31abc793a3846d6d9913f3ff7fc18`; `_lib/claude-json.ts` `8b59deaf477c607efd56d5de5cac0977`, `_lib/video-homework.ts` `5deff10fed4c7e498cfcfbeceb2dce5f` (unchanged) |
| explain-family-tuition | `index.ts` `9f019ccefdcf3b8f3d6396f84d88bfba` |
| audit-eval-proxy | `index.ts` `6a2d59051bce948d88823b2c96bb2022`; `vendors.ts` `67ecf80753ee13123c930c29233b8ebc` (unchanged) |
| ocr-vocab-scan | `index.ts` `c27de801cae0b864992a179031864926`; `_lib/google.ts` `c46de6f19b00cb3c14c540c25340f160`, `_lib/profile.ts` `f8f9bca90d0ed65b0b655f59a94bb1d4`, `_lib/text.ts` `41a119cc74c73f197cf8fd6c84c3f33a` (unchanged) |
| chat | `index.ts` `a16401181d81b1b5d8a988cd4f1dc4d9`; `_lib/chat-context.ts` `04d7b33bd83714a1129dbd59883c247e`, `_lib/chat-plan.ts` `61474efde2b5e36a68a7413566ef9f05`, `_lib/text.ts` (unchanged) |
| analyze-video-submission | `index.ts` `731ea9cab749d21a0f832743999a7595`; `_lib/claude-json.ts`, `_lib/video-homework.ts`, `_lib/gemini-transcript.ts` `5893bde8c6970d55709f9f295dacdf03`, `_lib/speech-file.ts` `f5bd9da0492ed6c9921c1020942d573a` (unchanged) |

The nine F-02 functions also import `_lib/ai-gate.ts`; they need no redeploy (the change is an option none of them sets) and pick it up on their next deploy.

## Deploy order

1. Paste `20261117160000` (N-6). Before generate-work-feedback and before the app: the new function writes the draft table; the old one's writes are diverted by the migration's trigger.
2. Paste `20261117160100` (N-7) and `20261117160200` (claim). Before analyze-video-submission: the new function needs `video_analysis_claim` and answers 503 (no draft, nothing spent) without it. Until it is redeployed the old function still runs unlimited.
3. Deploy the eight functions; analyze-video-submission and generate-work-feedback first.
4. Push the app (TeacherSmartUpload). Between 1 and 4, the old page finds no AI text in `ai_feedback`: the box is not pre-filled with an old draft (a freshly drafted note still fills it), and an untouched approve would save no note.

## What a reviewer should attack

- The N-6 decision that `teacher_notes` written by "Approve & publish" from the pre-filled box counts as teacher approval of the 56 identical texts. The alternative (hide them until re-approved) would take text off 56 children's pages that a teacher did click to publish.
- `student_work_draft_staff_can` against the live `student_work_staff_select` and the uploader rule (`staff_created_this` requires the teacher role); whether any other path still copies an AI text into `teacher_notes` without a teacher.
- The diversion trigger as the safety net for the old generate-work-feedback between paste and deploy; FOR UPDATE inside the draft guard against an approval in flight.
- `get_video_homework_for_student` was changed as well as `get_video_progress` (same rule, same leak: model strengths, focus points, comments). Families lose the strengths / focus-point lists on the report until a teacher-approved version of them exists.
- The `final_criteria` snapshot relies on VideoReviewPanel saving `criteria_scores` before calling approve; a direct RPC approve snapshots whatever is there (the AI's prefilled scores the teacher saw).
- The claim caps (3/10 family, 6/20 staff) and the 15-minute stale rule; the per-take reset on re-record (a family can re-record to get 3 more runs, bounded by the 10 total and 6 an hour).
- In-memory limits reset on a cold start and are per instance (F-12); the claim's counts are the only durable ones.
- chat now refuses role-less accounts (its old fallback for them is unreachable); live there are none it served.

## What I could not check

- Nothing was deployed or applied; the live functions and policies were read, not exercised. pglite is not production (the student_work prelude restates the live policies; the two write-policy helpers are reduced to "teacher of the class").
- Deno is not on this machine: the functions were type-checked by `edge-functions.test.mjs` and driven bundled with stubs; the real Anthropic SDK, OpenAI, Google and Supabase clients were not run.
- Whether a teacher read each of the 56 AI texts before clicking approve.

## Harness

Main's `scripts/pgtest` lags `origin/conductor/work`. Only `ai-gate.test.mjs` was brought across (it passes on main unchanged, 250), then extended with the eight; `run.mjs` on main gains it, `student-work-feedback.test.mjs` and the two new migrations in the video homework suite. Nothing else from conductor was copied.
