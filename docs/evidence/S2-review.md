# S2 independent review (audit medium + low findings)

Where I am / next step: COMPLETE. Next step is the owner's: the per-item verdicts below (four small changes - R-1..R-4 - recommended, none a blocker for the safe items).

Reviewed: branch `worktree-agent-a52234cf99a76ae26` at c53b4a70, on `review-s2` merged with the conductor twice (88b22dff, then a54d4f72 when it moved during the review: D4 step 3A, the demo removal ledger). Both merges were clean, no conflict to resolve; the second brought D4 3A's three suites back into `run.mjs` beside S2's seven. Read: `docs/AUDIT_FINDINGS.md`, the code (before the builder's evidence), `docs/evidence/S2-audit-medium-low.md`, root and `supabase/AGENTS.md`, the S1 evidence, rollback files and the live-recorded migrations (47ee634e, 3dc0a290). Nothing was applied, deployed or pushed; pglite only; no live data read.

## Verdicts, per item

### Migrations (paste order is free; each is independent)

| Item | Verdict | Why, in one line |
|---|---|---|
| `20261116092000` F-06 profiles / snapshots / leaders | **APPLY** | Preflight and postflight match the repo's and the audit's live state; every legitimate reader keeps its rows (class teacher, standing TA, cover teacher via `can_view_student_in_class` -> `is_teacher_of_class`; families and children through their own unchanged policies; service-role readers). No screen reads `monthly_leaders`; no teacher screen reads snapshots. |
| `20261116093000` F-17 staff pay | **APPLY WITH CHANGES** (R-2, perf, not a hole) | Closes the open branch and the rate functions correctly, no lock-out found (families incl. the 27 student-role family logins pass through `can_view_student`, which is role-blind; cover teachers through the kept lessons branch). But a family's unfiltered `teachers` read is ~8x slower (probe R-2); a drop-in body for `can_view_teacher` gives identical rows for all 12 test logins at ~1x. Ship `ClassCatalog.tsx` first or together. |
| `20261116094000` F-18 storage by class | **APPLY** (residual R-1 LOW, follow-up) | Smart Upload, signed URLs, lesson-resource upload/delete, exam-report upload and the child's reads all still pass; the postflight's known-policy list equals the repo's surviving policies on the three buckets. Residual: a teacher can point a row of their own class at another class's file name (R-1). |
| `20261116095000` F-05 homework grade guard | **APPLY** | Every writer of `homework_submissions` checked: family upsert (HomeworkSubmission, VideoHomeworkSubmission) touches no guarded column and the UI hides re-submission once graded; teachers / TAs / cover teachers and admins pass; Stars apply runs on the service role (uid null), Stars conflict resolution is admin, `approve_video_feedback` acts with the teacher's uid. No other SQL writes the table. |
| `20261116096000` F-19 vocab rows + 50 MB | **APPLY** | Every vocab write path checked: save-word / ocr-vocab-scan on the service role; browser updates are on the caller's own rows whose `student_id` came from the caller's own linked child (save-word) or is null. Upload UIs cap at 5 MB; video homework uses `homework-videos`, not `homework`. |
| `20261116097000` F-20 hardening | **APPLY** | No policy that calls the de-anon'd helpers is `TO public` (scan of the final policy set: all 20 are `TO authenticated`); the only caller of `recompute_student_points` is the DEFINER points trigger; the only SQL readers of `payroll_periods` are DEFINER; every browser reader is an admin screen. `auth.role()` keeps the service role and SQL/cron (NULL) as "staff". |

### Functions and browser files

| Item | Verdict | Why |
|---|---|---|
| calculate-tuition-bulk | **APPLY** | Callers: AdminTuitionList (`/tuition` renders it only for `role === "admin"`), AdminTuitionListEnhanced / QuickPayPanel / FinanceSummary (FinanceTab), CloseMonthDialog, schedule-sessions (service-role client -> passes). No teacher screen, no other function. Figures untouched (14-line diff is the gate). |
| cefr-defense | **APPLY** | Teacher actions now need `can_view_student_in_class`; the child's / family's own get_state and submit unchanged. |
| ocr-vocab-scan | **APPLY** | Class from the work row, child must be enrolled in it; the only caller (TeacherSmartUpload, incl. rescan) always sends the work's own class and a child picked from that class. |
| ocr-student-work | **APPLY** | `callerHoldsClass(work.class_id)`; every Smart Upload row has a class. |
| generate-student-report | **APPLY** | Teacher callers (BulkReportExport on TeacherClassDetail) always set `class_id`; AIReportDialog on StudentDetail is admin-only (`/students/:id`). |
| word-enrichment | **APPLY** (R-4 LOW follow-up) | Closes the planting. Side effect: its only caller (WordExplorer) always sends the sentence, so the shared cache is now never read or written - every click is an OpenAI call. Cost/latency, not a hole. |
| pronounce-syllables, pronounce-viseme | **APPLY** | The browser never sends `voice` (default always used). |
| image-generate | **APPLY** | Vendor text kept in the log only. |
| admin-unlock | **APPLY** | First enrolment still open; the gate's "Use this device" offer appears only in the enrol phase (nothing enrolled), and AdminSecurityCard sends `x-admin-unlock` from the live unlock. D-25: no extra unlock gate elsewhere for now. |
| create-teacher, create-teaching-assistant, `_lib/temp-password.ts` | **APPLY** | getRandomValues, rejection sampling; TA still gets the `teacher` role. |
| family-payment, smart-family-payment, modify-payment | **APPLY** | Role reading only (`.single()` -> every row); no figure or write path changed since 5d1e25c2; the D-23 voluntary-contribution refusal is intact in both payment functions. |
| redeem-access-code | **APPLY** (note) | The order is right: the function ends every session, THEN ClaimAccess signs the claimant in, so the current claimant keeps a session. Note: `signOut(..., "global")` revokes refresh tokens; another device's access token still works until it expires (default 1 h). |
| assignment-calendar | **APPLY** | Nothing in `src/` calls it (only a react-query key with the same name). |
| update-student-avatar | **APPLY WITH CHANGES** (R-3 LOW) | SVG closed. But the declared type must also equal the bytes: a real WebP or PNG labelled `image/jpeg` is refused, and HEIC (Samsung "high efficiency" photos via Android Chrome, the iOS Files app, a Mac) is refused with "must be PNG, JPEG, WebP or GIF" - before S2 it was stored. iPhone Safari's photo picker normally hands a JPEG to `accept="image/*"` (not tested on a device), so the common iPhone path should work. Not unsafe to ship as is; the change avoids a lock-out. |
| `_lib/auth.ts` (keysMatch) | **APPLY** | Same answer as `===` for every input that matters; reaches each importer on its next deploy. |
| `ClassCatalog.tsx` | **APPLY** (before or with F-17) | Falls back to the table when the function is missing. |
| `sanitizeSubmittedHtml` (HomeworkGrading, HomeworkGradingList) | **APPLY** | Keeps colour, bold, alignment, Quill indents (capped); layout CSS and classes gone. `data-list` was already stripped by `sanitizeHtml` before, so no regression. Coordinate with the editor-rebuild branch, which owns the same area. |
| config.toml, generate-sessions source removed | **APPLY** | Nothing calls either (grep). Owner deletes the live function. |

## Findings (one line each)

| # | Sev | Where | Finding | Probe / evidence | Proposed fix |
|---|---|---|---|---|---|
| R-1 | LOW | `20261116094000:64-71` with S1 `student_work_staff_insert` / `_update` (`20261113140000`) | A teacher may file (or edit) a `student_work` row of their own class whose `storage_path` names ANY file; `student_work_file_staff_can` then lets them read, overwrite or delete that file. Needs the exact name (`students/<id>/<workflow>/<random uuid>.<ext>`), which is not listable, so not practical today - but it is the "path claimed by a row" pattern. Strictly narrower than before S2. | `s2-review-probes` R-1: teacher A reads and deletes class B's photo after one INSERT. | In `student_work_file_staff_can`, for a `students/<sid>/...` name also require an enrollment of `<sid>` in `w.class_id`; or a trigger on `student_work` that lets only the service role set `storage_path` to anything outside `incoming/` / `teams/`. |
| R-2 | LOW (perf) | `20261116093000:70-87` | With the open branch gone, every teacher row a family has no class with runs both EXISTS branches in full (all lessons x all enrollments, `can_view_student` per pair). Family `SELECT id FROM teachers` (JournalEditor lists all active teachers for a student): pglite 115-453 ms before, 2420-4365 ms after (four runs). | `s2-review-probes` R-2 (30 teachers, 90 classes, 1400 children, 9000 lessons). | Replace the two family branches with one driven from the caller's own children (`students s JOIN enrollments e WHERE s.linked_user_id/secondary_user_id/family primary = _uid AND (class's default teacher OR a lesson of that class)`). The probe installs it: 244-296 ms, and every one of 12 logins gets exactly the builder's rows. |
| R-3 | LOW (lock-out) | `update-student-avatar/index.ts:73-83` | `declared !== looksLike` refuses real images whose browser label disagrees, and HEIC is refused with a misleading message. | R-3: WebP-labelled-JPEG 400, HEIC 400 (stored before S2), iPhone Safari JPEG 200. | Drop the declared-type equality (the stored type is already the sniffed one); for HEIC/HEIF bytes (`ftypheic`/`heix`/`mif1` at offset 4) answer "This is an iPhone/Samsung HEIC photo - choose JPEG or take a screenshot". |
| R-4 | LOW (cost/latency) | `word-enrichment/index.ts:268-280, 409` | WordExplorer always sends `context`, so after F-03 the shared cache is dead: every word click is a gpt-4o-mini call (seconds instead of instant), and the 40-per-5-min spender limit is the only brake. | R-4 (static: the one invoke and the `shared` gate). | Key the cache by `(word, target_cefr, sha256(context))`: an answer shaped by a sentence is served only for that same sentence. |
| R-5 | INFO | `redeem-access-code/index.ts:185-205` | "Ends old sessions" means refresh tokens revoked; an access token already issued lives until expiry (default 1 h). | Reading GoTrue's logout semantics. | None needed; say "within the hour" to the front desk. |
| R-6 | INFO | `20261116094000:117-128` | The own-upload branch relies on Storage filling the deprecated `owner` column. Plain uploads need INSERT only, so Smart Upload does not depend on it (the row is filed straight after); only update/delete of one's own still-unfiled upload does, which no screen does. | Supabase Storage access rules (upload = INSERT; upsert adds SELECT/UPDATE). | Optional: `(owner = auth.uid() OR owner_id = auth.uid()::text)`. Confirm with the manual check below. |
| R-7 | INFO | `20261116093000` | Behaviour change: the student's collaborative-journal teacher picker (JournalEditor) now lists only the child's own teachers, not every lead teacher. | Reading `JournalEditor.tsx:79-84`. | Intended by F-17; tell teachers. |

No new hole found: every new SECURITY DEFINER function pins `search_path`, none is executable by anon, the grade-guard trigger function is revoked from every role (triggers need no EXECUTE), `get_class_catalog_teachers` returns id/name/bio only to signed-in callers, and no new policy is OR-ed open by an old one (the F-06 and F-18 postflights refuse that; F-17's preflight refuses an unknown `teachers` read policy).

## Preflights against production

Judged from the repo's surviving policies (scan of every `CREATE/DROP POLICY` up to 20261116091000), the live-recorded S1 files, and the audit's 13 Nov catalog:
- F-06: the three role-only policies by their repo names; nothing else on the three tables reads by bare teacher role. Would install.
- F-17: the `teachers` read policies are `Teachers can view own record` (`user_id = auth.uid()`), `Admins can manage teachers` (`has_role(auth.uid(), 'admin'::app_role)`) and `Teachers visible to staff and their classes` (`can_view_teacher`) - all three match the preflight's pattern. Would install.
- F-18: surviving policies on the three buckets are exactly the ones the file drops or lists as known (`students_read_own_work_files`, `students_read_approved_work_files`, `students_read_lesson_resource_files`, `Admins manage exam-reports storage`, plus the exam-reports read/delete ones, which are not INSERT/ALL). Would install; a Lovable-made policy the repo does not know would make it refuse (fails closed).
- F-05, F-19, F-20: the objects the preflights ask for are all in the repo and the audit. Would install.
- All six re-run cleanly and each rollback block is executed by its suite (install as "before", fix, rollback, fix again).

The repo cannot prove live state (memory: migrations are pasted by hand). The preflights fail closed, so the worst case on a mismatch is a refused paste, not a wider policy.

## Lock-out sweep (who uses each changed thing today)

- `student_learning_profiles`: LearningJourneyCard, FamilyDashboard (own children: `family_read_children_learning_profiles`, `students_read_own_learning_profile` unchanged), chat (`userDb`, teachers already held by `studentFor`), service-role readers. `monthly_finance_snapshots`: admin hooks, family `PriorBalanceBreakdown` (own policies unchanged), snapshot-monthly-finance / student-audit (service role). `monthly_leaders`: no reader.
- `teachers` (F-17): family/child pages read their class's teacher (HomeworkDetailDialog, StudentOverviewTab, StudentScheduleCalendar, ScheduleCalendar `role=family`, HomeworkPdfDownload, Deposit/WithdrawModal) - all a class with the child's enrollment or a lesson of it: kept. GlobalCalendar for a student: sessions RLS already limits to the child's classes. ClassCatalog: new RPC. JournalEditor: R-7.
- Storage (F-18): TeacherSmartUpload (upload `incoming/` / `teams/`, row with `class_id` always, signed URLs by row), TeacherTranscripts (`<class_id>/...` upload, signed URL, remove), ExamReportEditor (`<student_id>/...` upload; delete by `created_by` unchanged), MyWorkGallery / StudentLessonDetail (child policies unchanged), ocr-* / generate-work-feedback (service role).
- `homework_submissions` (F-05): see the verdict line; plus GradeOfflineDialog, HomeworkGrading(List) as staff.
- Payroll months (F-20 d): PayrollTab, PayrollMonthLock, RecurringExpendituresManager, OperationalReports (admin); calculate-payroll / close-payroll-month (service role).
- Avatars (F-13): ProfilePictureUpload sends the raw `File` from `accept="image/*"`, so the browser's own label and bytes reach the function: R-3.
- calculate-tuition-bulk and the Stars sync / cron: schedule-sessions (service-role client) is the only service-to-service caller and still passes; the nightly runner calls schedule-sessions, not bulk; Stars sync touches none of the changed tables except through the service role.

## Owner actions I agree are needed

1. Paste the six migrations; take R-2's function body into `20261116093000` first (or paste it as a follow-up) and ship `ClassCatalog.tsx` with or before it.
2. Redeploy the eighteen functions with their import closures (the builder's table is right); update-student-avatar after R-3, or as is if preferred.
3. Delete the live `generate-sessions` function in the dashboard (D-25 already decided it).
4. F-22: rotate the Google API key that is in git history, and restrict it.
5. F-27: turn on leaked-password protection.
6. F-25: already done and verified on 16 Nov (ledger) - nothing left.
7. Decisions still open: F-17 rest (families of a class still read their teacher's pay columns and phone/email; every staff member reads every TA row), F-20 rest (anon's table privileges), F-12 durable rate limiter, F-24 consent wording.
8. After pasting, by hand: a teacher uploads a photo in Smart Upload and opens it in review; a TA does the same; a teacher opens and deletes a lesson-resource image; uploads an exam-report PDF; grades a homework; a child hands one in; a parent's login opens the dashboard (teacher names shown) and the class catalogue on a new child.

## Counts (merged tree `review-s2`)

- `node scripts/pgtest/run.mjs` on `review-s2` at bfaf424b (S2 + conductor a54d4f72): **6838 assertions across 75 suites, 0 failed**. S2's seven, also run one by one: F-06 42, F-17 60, F-18 38, F-05 35, F-19 32, F-20 30, edge functions 92 (= the builder's 329). The D4 3A suites the second merge brought in: 143 + 74 + 19, green beside S2.
- `tsc --noEmit -p tsconfig.app.json`: exit 0, 1919 files loaded.
- `npm run test:bun`: 190 pass, 0 fail (808 expects, 16 files).
- Probes `node scripts/pgtest/s2-review-probes.test.mjs <5 migration paths, see its header>`: 18 passed, 0 failed (R-1..R-4; timings printed, not asserted - four runs: before 115-453 ms, after 2420-4365 ms, rewrite 244-296 ms; the RESIDUAL lines assert today's behaviour and flip when fixed). Not added to `run.mjs` for that reason.
- Note: the recorder engine suite took about 20 minutes on this machine (another session's suite was running beside it); unrelated to S2.

## What I could not check

- Live catalog (no connection, by the rules): preflights judged from the repo and the audit.
- Storage API behaviour itself (owner column, upload read-back) and GoTrue's logout; reasoned from Supabase's documented rules, not run.
- No browser or device run: iPhone / Samsung avatar uploads, Smart Upload end to end, the grading screen rendering.
- R-2 timings are pglite (single-threaded WASM) on synthetic data; real Postgres will be faster in absolute terms, the ratio is the point.
