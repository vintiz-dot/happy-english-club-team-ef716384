# Privacy follow-ups: model-made CEFR points, transcribe-lesson-audio gate

Branch `privacy-followups` (from `origin/main` at `04ccc58f`). Nothing applied, deployed or pushed. Live database: read-only SELECTs returning counts and definitions only.

Owner's rule: nothing derived from a lesson or an AI reaches a family before a teacher approves. The transcript release (20261117100000 / 100100, `docs/evidence/FIX-analyze-transcript.md`) made transcripts follow it; this does the same for the two functions that still wrote a model's CEFR answer where families read, and closes the two gaps that release left in `transcribe-lesson-audio`.

## 1. Model-made CEFR points are staff-only drafts

### What was wrong

- `generate-student-report` wrote the model's CEFR estimate straight into `cefr_assessments` (`source = 'ai_report'`, `source_id` = the report).
  - The child reads that table (`students_read_own_cefr`), and so does the family (`family_read_children_cefr`).
  - The report itself stays unpublished until a teacher publishes it. Its CEFR level did not wait.
- Live, 17 Nov:
  - 9 such points for 9 children, every one readable by a family or a child login.
  - All 9 reports are unpublished.
- `cefr-defense` wrote the evidence audit's recommended level (`level_defense_evidence`) and the test's estimate (`level_defense_test`) to the same table.
  - The source CHECK refused both, and the function never looked at the error, so none exist live (0).
  - Widening the CHECK alone would have published them. The suite shows this with the function as it was at `04ccc58f`.
- `generate-student-report` would also regenerate a published report in place: new model text on a report the child already reads, with no teacher in between. Live, 0 reports are published, so it has never happened.

### Design (smallest correct)

The transcript pattern applies: the published table keeps its meaning (everything in `cefr_assessments` is published), and model points stop going there.

- No reader of `cefr_assessments` needed a change.
- A reader added later cannot leak a draft by forgetting a filter.

New migration `supabase/migrations/20261117151000_cefr_model_drafts.sql` (one file, idempotent, paste once):

- **Preflight (fails closed).** Refuses unless all of these hold:
  - `is_teacher_of_class`, `has_role`, `staff_may_write_for` (20261113140000) and `can_view_student_in_class` exist.
  - RLS is on for `cefr_assessments` and `student_reports`.
  - There is exactly one source CHECK, and its values are production's five (read live) or this file's seven.
  - On a re-paste, the drafts table carries no policy but its own.
- **`cefr_assessments_source_check`** is widened by `level_defense_evidence` and `level_defense_test`, so an approved defense point can be published.
- **`cefr_assessment_drafts`** (new table):
  - It holds the model's point, the requester, the status (`draft`, then `approved` or `discarded`, once), who decided and the level they chose.
  - `held_row` keeps a copy of a published row it took down.
  - Its CHECKs keep status and decision consistent.
  - It has one policy, a SELECT through `cefr_draft_staff_can`: an admin, or a teacher/TA who may write for the row's class (`staff_may_write_for`). A draft with no class goes to a teacher of a class the child is in now.
  - It has no write policy.
  - Grants are explicit: authenticated SELECT, INSERT, UPDATE, DELETE; service_role ALL; anon none.
- **`cefr_point_is_model_made(source, source_id)`** is the one rule:
  - `level_defense_*`, or
  - `ai_report` whose `source_id` is a `student_reports` row.
  - Video homework's `ai_report` points are written by the teacher's approval with `source_id` = the submission, so they are not caught.
- **`cefr_model_point_guard`** (trigger on `cefr_assessments`, runs as the caller):
  - An API role (anon, authenticated, service_role) may not insert a model-made point, or turn a row into one.
  - Only the approval, which runs as the owner, writes them.
  - This also stops the functions as deployed today the moment the file is pasted. Their insert fails, the error is ignored and the report still saves. So the deploy order does not matter.
- **`cefr_draft_write_guard`** (trigger on the drafts table): an API role only inserts an undecided draft holding nothing, and never updates one.
- **`approve_cefr_draft(p_draft, p_level DEFAULT NULL)`** (SECURITY DEFINER):
  - Refuses no session, anyone `cefr_draft_staff_can` refuses, a decided draft, and a level off the scale.
  - Publishes into `cefr_assessments` under the draft's own id, `created_by` = the teacher.
  - If the teacher picks another level, the confidence is dropped and the evidence says "Set by the teacher (the AI suggested X)".
- **`discard_cefr_draft(p_draft)`**: the same checks. Nothing is published.
- **Take-back:**
  - Every published model-made point without a draft is copied whole into a draft (same id, `held_row`) and deleted from `cefr_assessments`.
  - A point whose draft is approved is the approval's and stays.
  - It refuses if a published row shares an id with an undecided or discarded draft.
  - It refuses to commit if any model point is still published without an approval.
  - It prints its counts.

### Live selection (read-only, the rule exactly as written)

| | count |
|---|---|
| model-made points the rule selects | 9 (9 children, all `ai_report`, all with a class) |
| ...of which a family or child login can read today | 9 |
| `ai_report` rows outside the rule (would be untouched) | 0 |
| other `cefr_assessments` rows, untouched | 29 (19 children; all `transcript`, every one listed in an approval) |
| level-defense points | 0 (the CHECK refused them) |
| published student reports | 0 of 9 |

Expected on paste: `held_this_paste = 9, children = 9, drafts_waiting = 9, held_total = 9`.

### Functions

- **`supabase/functions/generate-student-report/index.ts`:**
  - Refuses (409) a published report before the model call (`report.published !== false`, which fails closed).
  - Saves the report with a compare-and-set, `.eq("published", false).select("id")`. A report published while the model wrote gets 409 and is not overwritten. The failure path's status write is conditioned the same way.
  - Inserts the CEFR estimate into `cefr_assessment_drafts` (requested by the caller) and returns `cefr_draft_id`.
  - No write to `cefr_assessments`.
  - A failed draft insert is logged, and the report stands.
- **`supabase/functions/cefr-defense/index.ts`:**
  - `saveDraft()` is its only CEFR write.
  - `mine_evidence` drafts the recommended level (`source_id` = the claim) when the audit is conclusive.
  - The final `submit_stage` drafts the estimate (`source_id` = the test, requested by the child).
  - No write to `cefr_assessments`.

### Screens

- **New `src/components/cefr/CefrDraftsCard.tsx`:**
  - Titled "CEFR levels waiting for your approval".
  - For each draft it shows the source, date, the AI's level and confidence, and its rationale, with a level picker (the AI's level marked).
  - It offers Approve (`approve_cefr_draft`) and Discard (`discard_cefr_draft`).
  - It says plainly that nothing is on the chart or shown to the student or family until approved.
  - It renders nothing when there are no drafts.
- **Where the card appears:**
  - `src/pages/StudentDetail.tsx`, under the growth chart. This is an admin route and covers classless defense drafts.
  - `src/pages/TeacherClassDetail.tsx`, under BulkReportExport, where teachers generate reports. This is a teacher/admin route.
- **Small changes:**
  - `AIReportDialog`: the toast says the CEFR level waits for approval.
  - `CefrDefensePanel` refreshes the drafts. Its header comment is updated.
  - `CefrGrowthChart` has labels for the two new sources.

### The generated report text

`student_reports.published` defaults to false. Its only child-facing policy is `students_read_published_reports` (published AND the child's own login). There is no family policy. Only a staff member sets `published` (the AIReportDialog switch).

So the report text already had a teacher step. The one hole was regenerating a published report in place, which is now 409, plus the compare-and-set.

Not changed: a published report's JSON carries the model's CEFR level in its text. The teacher reviewed it when publishing. Publishing does not approve the growth-chart point; that stays a separate decision.

### Every reader of `cefr_assessments`, after the change

All of them see published points only, because drafts live in another table. `cefr-drafts.test.mjs` part 3 lists them from the source and fails if the set changes:

- **Families and children:**
  - `src/components/charts/CefrGrowthChart.tsx` (rendered only on the admin StudentDetail).
  - `supabase/functions/chat/index.ts:503`, through the caller's client.
  - The family and child policies themselves.
- **Feeding later AI output:**
  - `supabase/functions/refresh-student-profile/index.ts:104` (the family-readable profile is built from published points only).
  - `generate-student-report/index.ts:148` (prompt).
  - `cefr-defense/index.ts:301` (prompt).
  - `analyze-transcript/index.ts:615` (prompt).
- **Not readers of either table:** reception-feed, FamilyDashboard (reads `student_learning_profiles`), StudentLessonDetail (reads `transcript_speaker_metrics.cefr_estimate`, published by the transcript approval).
- **Readers of `cefr_assessment_drafts`:** only `CefrDraftsCard` (browser), plus the two functions, which only insert.

### Chat assistant (item 3)

The chat assistant's CEFR tool reads `cefr_assessments` through the caller's own client and never names the drafts table (asserted). So it reads only approved or person-made points. `chat-assistant.test.mjs`, including the "every tool" scenario: 201 passed, 0 failed. No new tool was added.

## 2. transcribe-lesson-audio

- **Spend gate.** `requireSpender` is the first thing after the preflight (staff only, 10 calls per account per 10 minutes), before the body or any row is read. Its own `requireRole` is gone (one gate).
  - There is no service-role hand-off: nothing calls this function with that key (asserted), so the key is refused (403) like any non-session.
  - Before, the service-role key ran a full transcription.
- **Approved lessons (409).** After the class check, the function reads `transcript_approvals`:
  - an approval that stands gives 409 before any download, vendor call or write;
  - if the approval cannot be read, it gives 503 (fails closed);
  - a withdrawn approval transcribes as usual.
- The screen's disabled button (N-7) is unchanged; this is the server side of it.

## Tests

| Check | Result |
|---|---|
| `cefr drafts` (new, `scripts/pgtest/cefr-drafts.test.mjs`, pinned 139) | 139 passed, 0 failed |
| `transcribe gate` (`transcribe-gate.test.mjs`, updated) | 133 passed, 0 failed |
| `ai spend gate (F-02)` (`ai-gate.test.mjs`, transcribe-lesson-audio section added) | 293 passed, 0 failed |
| `chat assistant` | 201 passed, 0 failed |
| `transcript drafts (D-26)` / `transcript review probes` | 221 / 34 passed, 0 failed |
| `edge functions typecheck` / `app typecheck` (inside run.mjs) | 5 / 3 passed, 0 failed |
| full `node scripts/pgtest/run.mjs` (real clock, started 16:2x Hanoi) | 6258 assertions across 91 suites, 36 suites failed: every failure is harness lag, none loads a file this work changed (below) |
| `tsc --noEmit -p tsconfig.app.json` standalone | exit 0 (173 s) |
| `npm run test:bun` | 142 pass, 3 fail, 2 errors (14 files). The failures are `src/components/admin/SettleBillModal.tsx` missing and `scripts/fixtures/rich-text/dom` missing. This branch changes no `scripts/*.ts` and no file those tests read, so main gives the same result. |

The 36 failed suites, in two groups:

- **Crashes on a missing file (`Node.js v24` crash).** The conductor tree's suites read files that `origin/main` does not have:
  - D4 migrations (`20261114093000_d4_lesson_pay_guard.sql`, `20261114094000_d4_money_inputs_guard.sql`);
  - `scripts/ROLLBACK-d4-*.sql`;
  - `docs/evidence/S1-*`, `S2-audit-medium-low.md` and `T2-class-recordings-access.md`;
  - `scripts/lesson-eval/teardown_audit_eval.sql`, `scripts/csp/cfHeaders.mjs`, `scripts/CREDIT-past-unapplied-cash.sql` and `scripts/CHECK-unlinked-accounts.sql`.
- **Assertion failures in money and payroll code this work does not touch:** invoice status (named as known in the brief), removed money features, session guard functions, d4 floors / register / class fee / rollback / apply chain, teacher payroll function, and TA payroll function.

Every suite that loads a changed file is green: cefr drafts, transcribe gate, ai spend gate, chat assistant, transcript drafts, transcript review probes, edge functions typecheck and app typecheck.

`cefr-drafts.test.mjs`, in three parts:

1. **The real migration over production's state** (20261111110000, the 20261113140000 staff policies, the admin/child/family policies, the live source CHECK).
   - **Before the paste:** the child and the family read the report's level; a defense point is refused by the CHECK.
   - **Refusals:** a CHECK the file does not know is refused and changes nothing; so is RLS off on student_reports.
   - **After the paste:**
     - The child and family read neither report level.
     - The other three points are unchanged byte for byte.
     - Each held point is a draft under its own id, with the whole row in `held_row`.
     - A second and a third paste change nothing; the counts print.
   - **Grants and policies:** explicit grants; one staff SELECT policy.
   - **Who reads the drafts:**
     - none: the child, family, another child, a role-less account, anon;
     - the class teacher and TA read their class's only; an admin reads all.
   - **The guard:**
     - The service role, the class teacher and an admin are each refused `ai_report`-with-a-report and both defense sources.
     - A person's own level still goes in, and so does video homework's shape.
     - A teacher cannot turn a person's point into a report's, but can still edit it.
   - **The drafts guard:** the service role inserts only undecided drafts and cannot update one. A teacher cannot write or mark one from the browser.
   - **Approve and discard:**
     - Refused for no session, the family, the child, no role, and another class's teacher.
     - A bad level is refused.
     - An approval publishes under the same id, signed by the teacher, and the family then reads it. Twice is refused, and so is a discard after an approval.
     - An admin's own level gets its score, no confidence, and the AI's suggestion in the evidence.
     - A TA's discard publishes nothing, and the draft cannot be approved later.
     - A classless defense draft is readable and approvable by the child's teacher, not another class's.
   - **Re-paste after approvals:** changes no decision. A leaked report level written in between is taken back. A published row sharing an id with an undecided draft makes the paste refuse, and so does an unknown policy on the drafts table.
2. **The real functions (bundled), each also as it was at `04ccc58f`.**
   - **generate-student-report:**
     - Before, it wrote cefr_assessments and rewrote a published report.
     - Now it writes one draft and no cefr_assessments row.
     - A published report gets 409 with no model call and no write.
     - Publishing mid-generation gets 409, not overwritten, no draft.
     - A level off the scale saves the report with no draft.
     - Another class's teacher gets 403.
   - **cefr-defense:** before, it wrote cefr_assessments. Now:
     - `mine_evidence` drafts the claim's level;
     - an inconclusive audit drafts nothing;
     - the child's final stage drafts the estimate;
     - the child cannot audit.
   - **In the real schema:** every draft they wrote is loaded into the Postgres of part 1 as the service role. The family reads nothing of it until the class teacher approves. The old functions' direct write is refused in the database.
3. **Source checks:**
   - No edge function or browser file writes `cefr_assessments`.
   - The readers are exactly those listed above.
   - Only the two model writers touch the drafts, and only to insert.
   - Chat, reception-feed and refresh-student-profile never name the drafts table.
   - The browser reads the drafts only in `CefrDraftsCard`, shown on the two staff routes only, deciding only through the two RPCs.

Mutation runs, each caught:

| Mutation | Result |
|---|---|
| guard trigger removed | 11 failures |
| take-back DELETE removed | suite fails |
| drafts policy `USING (true)` | 11 failures |
| approve without the staff check | 9 failures |

Harness: `scripts/pgtest` came from `transcript-fix` (= `origin/conductor/work` + the transcript suites, which main lacks). Main's leaderboard suites were re-registered in `run.mjs`. Main-only files the conductor tree lacks stay on disk, unregistered as on main.

## Files (LF md5, CR stripped) - round 1, superseded by round 2 below

| File | md5 |
|---|---|
| `supabase/migrations/20261117151000_cefr_model_drafts.sql` (new) | 7a19069d90aad63eab8245af812a0b81 |
| `supabase/functions/generate-student-report/index.ts` | 691e0cc141db68a17adb3fc64cc57db0 |
| `supabase/functions/cefr-defense/index.ts` | 391b02fdeef1277bd5d076011888b6c3 |
| `supabase/functions/transcribe-lesson-audio/index.ts` | 2d637c062aed9c5e5752d93c36ae9665 |
| `supabase/functions/_lib/ai-gate.ts` (unchanged, newly imported by transcribe-lesson-audio) | e5d4d3c66e6d6cb35219ad7e72f20cb7 |
| `supabase/functions/_lib/rate-limit.ts` (unchanged, imported by ai-gate) | aad3d996bc38a83848e33bd1cb88415e |
| `supabase/functions/_lib/auth.ts` (unchanged) | 92b44db93cd2614a2fb3011e3a9063ba |
| `supabase/functions/_lib/text.ts` (unchanged) | 41a119cc74c73f197cf8fd6c84c3f33a |

Function imports:

- `generate-student-report`: `../_lib/auth.ts` and esm.sh supabase-js@2.75.0 (unchanged).
- `cefr-defense`: `../_lib/text.ts`, `../_lib/auth.ts` (unchanged).
- `transcribe-lesson-audio`: `../_lib/text.ts`, `../_lib/auth.ts`, and now `../_lib/ai-gate.ts` (which imports `./auth.ts`, `./rate-limit.ts`).

Screens: `src/components/cefr/CefrDraftsCard.tsx` (new), `src/pages/StudentDetail.tsx`, `src/pages/TeacherClassDetail.tsx`, `src/components/reports/AIReportDialog.tsx`, `src/components/cefr/CefrDefensePanel.tsx`, `src/components/charts/CefrGrowthChart.tsx`.

## Deploy order (owner) - round 1, superseded by round 2 below

1. Paste `20261117151000_cefr_model_drafts.sql`.
   - Expected output: `held_this_paste 9, children 9, drafts_waiting 9, held_total 9`.
   - If it refuses, send back what it names.
   - From this moment the deployed functions can no longer publish a model's level: their insert is refused, the error is ignored, and the report still saves.
2. Deploy `generate-student-report`, `cefr-defense` and `transcribe-lesson-audio`, in any order.
   - If a new function goes out before step 1, its draft insert fails, is logged, and nothing is shared.
3. Publish the app (the approval card). Until then the 9 held levels are invisible to families and waiting; nothing is lost.

## What a reviewer should attack

- **The guard keys on `current_user`.**
  - It assumes PostgREST runs as `authenticated` / `service_role` and SECURITY DEFINER functions run as their owner (postgres). That is the same assumption as `transcript_metrics_link_guard`.
  - An owner-run path other than the approval could still write a model point; the take-back catches it on a re-paste.
- **`cefr_point_is_model_made` for `ai_report` relies on `source_id` naming a `student_reports` row.**
  - A teacher's browser insert of `ai_report` with no or another `source_id` is treated as person-made.
  - Teachers can insert through the staff policy; no screen does.
- **`cefr_draft_staff_can` reuses `staff_may_write_for`:** any-date enrollment in the class, or the child is in one of the caller's classes. That is the same scope as writing a CEFR point by hand.
- **Approving publishes under the draft's id.** If a teacher later deletes that published row (the staff delete policy), the draft still says approved, and it cannot be re-approved.
- **Race in transcribe-lesson-audio.** An approval landing between the approval read and the `processing` stamp is not re-checked. The analysis then refuses (409, after Whisper), and the lesson ends `failed`. The window is milliseconds; a conditional stamp would close it.

## Open questions for the conductor / owner (seen, not changed)

1. **`student_learning_profiles.cefr_estimate`** is a model-made CEFR level (and summary) that the family reads (`family_read_children_learning_profiles`; FamilyDashboard shows it on each child's card). Live, 42 profiles carry one. The profile is built from published data, but its level is the model's own and no teacher approves it. This is the same rule; it is a ruling for the conductor.
2. **cefr-defense shows the child AI output before any teacher step:**
   - the final test result (`level_estimate`, `defended`, rationale) in the `submit_stage` response and in `get_state`;
   - the evidence audit's verdict and rationale through `get_state`;
   - and directly through the child's own SELECT policy on `cefr_level_claims` (`students_read_own_cefr_claim`), which exposes the whole `evidence` JSON including `recommended_level`.
   Live: 1 claim carries evidence. This is a product ruling: a child seeing the result of the test they just took.
3. **`generate-student-report` and `cefr-defense` call OpenAI with no `requireSpender`** (AGENTS.md: every function that calls a paid vendor for a browser starts with it). They were left alone here because BulkReportExport generates a whole class in one go, and the student side of cefr-defense needs non-staff roles, so the limits need a decision.

## Not verified

- **Nothing ran against the live database** except the read-only counts above.
- **The screens were type-checked, not opened in a browser.**
- **The model is a stand-in in the tests.**
- **Known harness lag, not this work:** `s2-edge-functions.test.mjs` fails on this tree before reaching these functions. Its "before" copy of calculate-tuition-bulk at `5594ca32` no longer bundles against today's `_lib/invoice-status.ts` (`settledWriteOff`), and its F-09 config checks fail. Run with that load skipped, its cefr-defense and generate-student-report sections pass, with 3 unrelated failures.

## Round 2 (conductor rulings, owner: "use your recommendations")

Nothing applied, deployed or pushed. The live database was used only for read-only counts.

### 0. Rename

The payments branch also has a `20261117150000_*`, so this migration is now `supabase/migrations/20261117151000_cefr_model_drafts.sql`. Every reference was updated: the function headers, `CefrDraftsCard`, the suite, `run.mjs` and this file.

### 1. The learning profile reaches no family or child

New migration `supabase/migrations/20261117152000_family_reads_without_ai.sql`, pasted after 151000:

- **Preflight (fails closed).** It refuses unless 151000 is in, RLS is on for the four tables, and every policy on `student_learning_profiles`, `cefr_level_claims` and `cefr_defense_tests` is one it knows. The known set is the live set, read 17 Nov.
- **It drops** `family_read_children_learning_profiles` and `students_read_own_learning_profile`.
- **What stays:** staff keep `admins_all_learning_profiles` and `teachers_read_class_learning_profiles`. The edge functions keep the profile as context for the drafts teachers review.
- **Live:** 42 profiles carry a model CEFR estimate. No row is touched.

Changes in `src/pages/FamilyDashboard.tsx`:

- A new exported `withApprovedLevels(client, children)` sets each card's level from the latest `cefr_assessments` row (published only), read through the family's own session. It clears `journey`, the model summary.
- The text is cleared even if a request still returned it, and also when the level cannot be read (fails closed).
- `fetchChildren` is unchanged, because `familyDashboardBatch.test.ts` compares its batching with the original. It still asks for the profile, and RLS now returns nothing.

Other readers:

- The only other browser reader is `LearningJourneyCard`, rendered on the admin-only StudentDetail page. The suite asserts this.
- The chat assistant's `get_student_overview` reads the profile through the caller's client, so a family or child now gets the numbers and no AI summary. `chat-assistant` 201/0.

### 2. cefr-defense: the child sees progress, then the approved level

The child's direct SELECT `students_read_own_cefr_claim` is dropped (same migration). It exposed the whole evidence JSON (verdict, recommended level, rationale) and the AI-driven status. No screen read the table as a child.

In `supabase/functions/cefr-defense/index.ts`, a caller who is not staff of the child gets only:

- **from `get_state`:**
  - the teacher's level;
  - a child status: `set_by_teacher`, `test_assigned`, `submitted` or `reviewed`;
  - tests with `result: null` and `submitted`, and the active stage's questions without its routed `level`;
  - `approved_level` once a teacher has approved a `level_defense_test` point for one of the child's own tests (published rows only).
- **from `submit_stage`:** the next stage without its level and without `stage_score`. On the last stage, "Submitted - your teacher will review your test."

Staff see everything, as before. `src/pages/StudentDefendLevel.tsx` shows exactly that: progress, then "Your teacher's review: X".

### 3. Spend gates

`generate-student-report`:

- `requireSpender` first: staff only, 60 per account per 10 minutes.
- Live, 17 Nov: the biggest class has 10 active children (top three 10, 9, 9), so 60 is six full BulkReportExport runs back to back.
- Its old `authenticateUser` gate is gone. The service-role key is refused: nothing calls the function with it.

`cefr-defense`:

- `requireSpender` first: any role (`SIGNED_IN_ROLES`). The child takes the test; a shared family login may hold `family`; staff run the rest.
- The gate allows 60 calls per account per 10 minutes, `get_state` included. The child's page and the staff panel reload state after every step.
- The three actions that call OpenAI (`mine_evidence`, `generate_test`, `submit_stage`) share a tighter 20 per 10 minutes. A whole test is 4 OpenAI calls and a child makes 3 of them, so 20 is about five tests or audits in ten minutes for one teacher.
- Its own `getUser` / `user_roles` lookup is gone (the gate's identity is used).

### 4. Deleting an approved point

Chosen: re-approvable. Applied to 151000, which is not yet applied anywhere.

- A new `AFTER DELETE` trigger `cefr_published_point_removed` (SECURITY DEFINER) handles a teacher or admin deleting a published point through the existing staff delete policy. The point's draft goes back to `draft`: off the chart, back in the teacher's queue, approvable or discardable again.
- `cefr_assessment_drafts.history` records every approval, discard and removal (who, when, level).
- The card marks such a draft "Taken off the chart until approved".
- The service role cannot insert a draft with a history.
- Deleting a teacher's own point touches no draft.

### Tests (round 2)

| Check | Result |
|---|---|
| `cefr drafts` (pinned 191; was 139) | 191 passed, 0 failed |
| `ai spend gate (F-02)` (generate-student-report and cefr-defense sections added) | 340 passed, 0 failed |
| `chat assistant` | 201 passed, 0 failed |
| `transcribe gate` | 133 passed, 0 failed |
| `transcript drafts (D-26)` / `transcript review probes` | 221 / 34 passed, 0 failed |
| `edge functions typecheck` | 5 passed, 0 failed |
| `tsc --noEmit -p tsconfig.app.json` standalone | FULL_TSC |
| full `node scripts/pgtest/run.mjs` | FULL_RUN |
| `npm run test:bun` | 142 pass, 3 fail, 2 errors: same as round 1. `familyDashboardBatch.test.ts` passes. |

New cases in `cefr-drafts.test.mjs`:

- **Before the paste:** the family and the child read the model summary and estimate, and the child reads the AI audit's recommended level.
- **152000:**
  - It refuses before 151000 and drops nothing.
  - An unknown policy on profiles, or on claims, is refused and named.
  - It installs, and pastes twice.
  - The family, the child, another child and a role-less account read no profile and no claim.
  - The class teacher and the TA read Kiki's; another class's teacher reads neither; an admin reads both.
  - The family still reads approved levels.
  - Exactly the six staff policies remain, and the rows are untouched.
- **Re-approval:**
  - The class teacher deletes the approved point. The family stops seeing it, and the draft is `draft` again with history approved, unpublished (by the teacher, A2) and back in the queue.
  - Re-approved at B1, it is published again under the same id, with three history steps.
  - Deleting a teacher's own point leaves the drafts as they were.
  - A forged history is refused.
- **cefr-defense, bundled:**
  - The child's `get_state` carries no evidence, no AI status, no rationale, recommended level, stage level or answer key anywhere in the reply.
  - Staff see the full audit.
  - The child's final submit replies "submitted - your teacher will review", with nothing of the result, while the result is stored for staff.
  - After the test the child's state says "submitted", with no result and no approved level.
  - A published (approved) point for the child's own test shows as `reviewed`, A2. Another test's point does not show.
  - A child's stage-1 submit carries no level, score or key; staff get both.
- **FamilyDashboard:** the real `withApprovedLevels`, extracted from the page, run against Postgres as the family through a PostgREST stand-in.
  - Kiki's card shows the latest approved level and no journey text, even when the input carried the model's B2 and summary.
  - A child the family cannot read gets nothing.
  - A read error gives no level and no text.
  - The page wires it in.
- **Source:** the browser reads the profile only in `LearningJourneyCard` (admin StudentDetail) and FamilyDashboard. It never reads `cefr_level_claims` or `cefr_defense_tests` directly.

Mutations, each caught:

| Mutation | Result |
|---|---|
| family policy kept | the paste's own commit check refuses (suite fails) |
| unpublish trigger removed | 6 failures |
| child given the staff `get_state` | 6 failures |
| child given the staff final submit | 2 failures |
| FamilyDashboard keeps the model text | 4 failures |

FULL_LAG

### Files (LF md5, CR stripped) - round 2

| File | md5 |
|---|---|
| `supabase/migrations/20261117151000_cefr_model_drafts.sql` (renamed from 150000; re-approval added) | 1c4d394d2d3658cf22d09c7e2af037aa |
| `supabase/migrations/20261117152000_family_reads_without_ai.sql` (new) | beef1b3903e7062709fbc75a99d5f6cf |
| `supabase/functions/generate-student-report/index.ts` | 769c904089d9478b1f32850e515916e4 |
| `supabase/functions/cefr-defense/index.ts` | 5417666eadbf68bc9aebc95c1a8fe897 |
| `supabase/functions/transcribe-lesson-audio/index.ts` (unchanged since round 1) | 2d637c062aed9c5e5752d93c36ae9665 |
| `supabase/functions/_lib/ai-gate.ts` (unchanged) | e5d4d3c66e6d6cb35219ad7e72f20cb7 |
| `supabase/functions/_lib/rate-limit.ts` (unchanged) | aad3d996bc38a83848e33bd1cb88415e |
| `supabase/functions/_lib/auth.ts` (unchanged) | 92b44db93cd2614a2fb3011e3a9063ba |
| `supabase/functions/_lib/text.ts` (unchanged) | 41a119cc74c73f197cf8fd6c84c3f33a |

Function imports:

- **generate-student-report:** `../_lib/auth.ts` and `../_lib/ai-gate.ts` (new; it imports `./auth.ts` and `./rate-limit.ts`), plus esm.sh supabase-js@2.75.0.
- **cefr-defense:** `../_lib/text.ts`, `../_lib/auth.ts`, `../_lib/ai-gate.ts` (new) and `../_lib/rate-limit.ts` (new).
- **transcribe-lesson-audio:** as round 1.

Screens: `src/pages/FamilyDashboard.tsx`, `src/pages/StudentDefendLevel.tsx`, `src/components/cefr/CefrDraftsCard.tsx`, plus the round 1 screens.

### Deploy order (owner) - round 2, replaces the one above

1. **Paste `20261117151000_cefr_model_drafts.sql`.** Expected output: `held_this_paste 9, children 9, drafts_waiting 9, held_total 9`. From here the deployed functions can no longer publish a model's level.
2. **Paste `20261117152000_family_reads_without_ai.sql`.** It refuses until step 1 is in. If it refuses on a policy, send back the name.
   - From here, families and children read no learning profile and no level claim.
   - The family card shows no level until step 4, and no AI text.
3. **Deploy `cefr-defense`, `generate-student-report` and `transcribe-lesson-audio`.**
   - Deploy `cefr-defense` promptly: until it is out, the old function still hands the child the test's AI result in its reply.
   - A function deployed before step 1 logs a failed draft insert and shares nothing.
4. **Publish the app.** This brings the approval card, the family card's approved level and the child's progress-only defence page. Until it is out, the old child page shows "Show what you can do" for the new statuses.

### What a reviewer should attack (round 2)

- **The unpublish trigger** runs as the owner and trusts `OLD.id` = draft id. Only the approval publishes under a draft's id, and the take-back refuses a shared id.
- **The child-view rule** is "not staff of this child". An admin or teacher looking at their own linked student record would get the staff view. That is the existing `staffHolds` predicate.
- **cefr-defense's two limits** are in memory and per instance (audit F-12), like every gate.
- **`withApprovedLevels`** takes the latest by `assessed_at`, then `created_at`. A teacher's backdated manual point can be "older" than an AI point approved today. That is by design: it is the date assessed.

### Not verified (round 2)

- The screens were type-checked, not opened in a browser.
- The model is a stand-in.
- The 152000 policy drops ran only in the in-process Postgres. Live: only the read-only policy list and counts.
