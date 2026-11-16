# S2 - medium and low audit findings

Where I am / next step: COMPLETE (16 Nov 2026). All 21 findings re-verified and marked; the open ones fixed in six migrations, eighteen functions and three browser files, each with a suite. Next step is the owner's: approve the pastes in the order below and the redeploys; the deferred items need the decisions at the end.

Branch: worktree-agent-a52234cf99a76ae26 (from claude/hec-conductor-setup-efbaa5 5594ca32, merged up to 43375f67).
Build and test only: nothing here was applied to the live database, deployed or pushed. The live catalog was NOT read in S2 (brief: no connection); every "before" is production as the audit (13 Nov) and the repository describe it, and every migration refuses to install when production holds a policy it does not know (fails closed: the paste stops, nothing changes).

Files touched by the six other branches (`d4-3a-lessons`, `worktree-agent-a935...`, `-ae3a...`, `-a20e...`, `-addb...`, `origin/pc2/r22-r23`) were avoided; the only shared file is `scripts/pgtest/run.mjs` (S2 entries only). Deferred because another branch owns the file: F-13's `analyze-video-submission` re-run cap (ae3a, now merged into the conductor - free for a follow-up), F-24 (`src/pages/OAuthConsent.tsx`, pc2/r22-r23).

Checks, run once at the end on the merged branch: `node scripts/pgtest/run.mjs` 6602 assertions across 72 suites, 0 failed (S2's seven: 42 + 60 + 38 + 35 + 32 + 30 + 92 = 329); `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` exit 0; `npm run test:bun` 190 pass, 0 fail.

## The 21 findings

| Finding | Sev | Status | Fix | Where | Test (`node scripts/pgtest/run.mjs`) | Rollback |
|---|---|---|---|---|---|---|
| F-04 staff functions without class scope | M | FIXED (was STILL-OPEN) | calculate-tuition-bulk admin + service role only; cefr-defense, ocr-vocab-scan, ocr-student-work, generate-student-report check the row's class / the child | 5 functions | S2 edge functions | redeploy the previous version |
| F-06 profiles / bill snapshots to any teacher | M | FIXED | profiles: role teacher AND can_view_student_in_class; no teacher read of snapshots; leaders: admin or class staff | `20261116092000` | teacher reads (F-06), 42 | block F-06 |
| F-17 staff pay readable by anyone | M | PARTLY FIXED | rate functions service role only; teachers row no longer open to every account (catalogue via `get_class_catalog_teachers`). Families of the class still read their teacher's pay columns; staff read TA rows - DEFERRED (needs ~38 screens on a view) | `20261116093000`, `ClassCatalog.tsx` | staff pay reads (F-17), 60 | block F-17 |
| F-18 any-teacher storage rules | M | FIXED (homework part FIXED-ALREADY by F-14 `20261113110000`) | student-work / lesson-resources by the class's staff; exam-reports upload for a child of a class the caller teaches. `resources` bucket NOT-A-RISK: the shared teacher library, every teacher already reads every row by design | `20261116094000` | teacher storage (F-18), 38 | block F-18 |
| F-05 child writes own grade | M | FIXED | BEFORE INSERT/UPDATE guard: grade, feedback, graded_at, graded status, homework / child of the row are staff-only | `20261116095000` | homework grade (F-05), 35 | block F-05 |
| F-03 cache planting | M | FIXED | word-enrichment: with a caller's context the shared cache is neither read nor written; word capped at 60, context cut to 300. Anonymous half closed by F-02. `image-search`: NOT-A-RISK after F-02 (only what the vendors return for that exact query, signed-in callers only) | word-enrichment | S2 edge functions | redeploy previous |
| F-07 unlock gate via passkey enrolment | M | FIXED (register); extending `requireUnlock` to other functions is an owner decision, not done | passkey/register on an account that already has a passcode or passkey needs a live `x-admin-unlock` | admin-unlock | S2 edge functions | redeploy previous |
| F-22 Google key in git history | M | STILL-OPEN, owner action | rotate the key in Google Cloud and restrict it; history cannot be fixed by a commit | - | - | - |
| F-08 non-constant-time compares | L | PARTLY FIXED | `_lib/auth.ts` service key via `keysMatch`. The two `CRON_SECRET_TOKEN` compares (watch-sibling-threshold, auto-mark-attendance) left alone per the brief | `_lib/auth.ts` | S2 edge functions | revert |
| F-09 dead deployments | L | FIXED in repo; owner deletes the live `generate-sessions` | empty `generate-sessions` source and stale `post-payment` entry removed; auto-mark-attendance untouched (CRON_SECRET_TOKEN) | `config.toml` | S2 edge functions | git revert |
| F-10 Math.random passwords | L | FIXED | `_lib/temp-password.ts` (getRandomValues, rejection sampling, 14+4 chars) | create-teacher, create-teaching-assistant | S2 edge functions | redeploy previous |
| F-11 `.single()` role checks | L | FIXED | family-payment, modify-payment, smart-family-payment read every role row. delete-payment / create-family: NOT-A-RISK (they filter `role = 'admin'` first) | 3 functions | S2 edge functions | redeploy previous |
| F-12 rate limiting / signOut | L | PARTLY FIXED | redeem-access-code really ends old sessions (signs in once with the new password, `admin.signOut(token,'global')`). Durable limiter and `x-forwarded-for`: STILL-OPEN (needs a table design; chat must not write) | redeem-access-code | S2 edge functions | redeploy previous |
| F-13 small items | L | PARTLY FIXED | avatar: bytes must be PNG/JPEG/WebP/GIF and match the type, stored by the checked type; assignment-calendar role from user_roles; SSML voice-name shape in both pronounce functions; image-generate hides vendor text. Open: migration-account email domain (owner: which domain), analyze-video-submission re-run cap (deferred, other branch) | 5 functions | S2 edge functions | redeploy previous |
| F-19 child-writable rows | L | FIXED (vocab, bucket limit); homework `submissions/` upload FIXED-ALREADY by F-14; game counters NOT-A-RISK (own display only: no points row, no board, no bill) | vocab insert / update name only a child the caller can view; 50 MB on homework and submissions | `20261116096000` | child writes (F-19), 32 | block F-19 |
| F-20 hardening | L | PARTLY FIXED | null uid is staff only for the service role; helpers not for anon; recompute_student_points service role only; payroll_periods admins + teachers. Open: anon table privileges, id-oracle helpers, refresh_invoice_carry, public avatar buckets, dead avatar-policy branch | `20261116097000` | hardening (F-20), 30 | block F-20 |
| F-23 browser items | L | PARTLY FIXED | grading screens render child-written HTML through `sanitizeSubmittedHtml` (layout CSS dropped). CSP / frame-ancestors: STILL-OPEN, owner decision (would need testing against Lovable preview and every vendor host); bucket limits: F-19; `selected_student_id`: NOT-A-RISK (audit) | `src/lib/sanitize.ts`, 2 screens | S2 edge functions (static) | git revert |
| F-24 OAuth consent wording | L | DEFERRED (pc2/r22-r23 edits `OAuthConsent.tsx`) | - | - | - | - |
| F-25 demo residue | L | STILL-OPEN, owner action | delete `teacher@demo.com` / `family@demo.com` and their teachers / families rows in the dashboard; no script (a delete belongs to the owner) | - | - | - |
| F-26 dependency advisories | L-M | STILL-OPEN, deferred | `npm audit fix` then `npm install` (both lockfiles); needs network and Lovable's bun.lock - not done on this memory-short laptop. dompurify 3.4.16 first | - | - | - |
| F-27 leaked-password protection off | L | STILL-OPEN, owner action | Auth settings switch | - | - | - |

## Who could do what, before and after

Roles: admin, teacher (class teacher), cover teacher, TA, family primary login, child login, anon, service role. Each row is asserted by its suite.

**F-04** (functions)
| Who | Before | After |
|---|---|---|
| teacher / TA of another class | bulk bills of any 200 children; set a child's level, send the child's error log / vocabulary / DOB to OpenAI, set a test, read evidence; award vocab points to any child in any class; OCR and re-route any work photo; rebuild and read any report | 403 for all of it, nothing read or sent |
| class teacher, TA, cover teacher | the same | their own classes' children only (bulk tuition: 403 - every caller is an admin screen) |
| admin, admin who also teaches | all | all |
| service role | bulk tuition (schedule-sessions) | unchanged |
| family / child | cefr-defense own state and test | unchanged |

**F-06** profiles / snapshots / leaders: teacher of another class and a self-made teacher from every row to their own classes' children / none / their own class; class teacher, TA, cover teacher: own classes, no snapshots; families and children: unchanged row for row; admin, service role: unchanged; anon: nothing.

**F-17**: rate functions - every account -> service role only. Teacher rows - unlinked sign-up and role-less account: both lead teachers -> none (the catalogue still shows name and bio); families: the teachers of their own children's classes (incl. a new class with no lessons yet) and of their lessons, no longer other classes' teachers; staff and admins unchanged.

**F-18**: teacher of another class / self-made teacher: every work photo and lesson resource (read, overwrite, delete), exam-report uploads for any child -> their own classes' files only / nothing. Class teacher, TA, cover teacher: own class's files, uploads to `incoming/` / `teams/`, own class's resources, exam reports for their class's children; can no longer drop a file into a child's `students/` folder (the service-role router does that). Families and children: reads unchanged. Admin, service role: everything.

**F-05**: family primary login and child login: could grade, write feedback, mark graded, raise or un-grade, insert graded, move -> refused 42501; hand in, hand in again before grading, video re-record, celebration seen: unchanged. Class teacher, TA, cover teacher, admin: grade and correct as before. Service role and definer functions acting for staff: unchanged.

**F-03**: any signed-in caller could make its sentence everyone's definition -> its answer is its own; plain look-ups cached as before.

**F-07**: an admin session without the gate could enrol a key and get an unlock -> 403 unless the account has nothing enrolled yet; with a live unlock: unchanged.

**F-19**: any account could add a word to any child's list or re-point one -> only about a child it can view; save-word (service role) unchanged.

**F-20**: anon: helpers executable, null-uid "staff" -> neither; parent / child / unlinked: read payroll months -> no; teacher, TA, admin: read them as before; recompute_student_points: every account -> service role (the points trigger is definer, awards unchanged).

## Migrations to paste, in order (owner)

1. `20261116092000_teacher_reads_own_classes_profiles.sql` (F-06)
2. `20261116093000_staff_pay_not_for_every_account.sql` (F-17) - ship the `ClassCatalog.tsx` build first or together (it falls back to the table either way; before the paste nothing changes, after it the catalogue needs the new function, which it tries first)
3. `20261116094000_teacher_storage_by_class.sql` (F-18)
4. `20261116095000_homework_grade_staff_only.sql` (F-05)
5. `20261116096000_child_writes_own_rows_only.sql` (F-19)
6. `20261116097000_hardening_anon_and_null_uid.sql` (F-20)

Independent of each other; this order is by severity. Each refuses to install if production is not as described, and changes no row.

Read-only probes after pasting:
```sql
-- F-06: expect teachers_read_class_learning_profiles, and no "Teachers can read all monthly snapshots"
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('student_learning_profiles','monthly_finance_snapshots','monthly_leaders') ORDER BY 1,2;
-- F-17: expect authenticated f for the two rate functions, t for get_class_catalog_teachers
SELECT proname, has_function_privilege('authenticated', oid, 'EXECUTE') FROM pg_proc WHERE proname IN ('teacher_rate_on','assistant_rate_on','get_class_catalog_teachers');
-- F-18: expect the ten names in the postflight list and nothing else for these buckets
SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND concat_ws(' ', qual, with_check) ~ 'student-work|lesson-resources|exam-reports' ORDER BY 1;
-- F-05: expect one row, enabled O
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'homework_submissions_grade_guard';
-- F-19: expect 52428800 twice
SELECT id, file_size_limit FROM storage.buckets WHERE id IN ('homework','submissions');
-- F-20: expect anon f, f; authenticated f for recompute
SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') anon, has_function_privilege('authenticated', oid, 'EXECUTE') au FROM pg_proc WHERE proname IN ('is_enrolled_in_class','recompute_student_points');
```
Then by hand: a teacher opens Smart Upload, uploads a photo and opens it in review; opens a lesson-resource image; uploads an exam report; grades one homework; a child hands in homework; a new account opens the class catalogue (teacher names shown).

## Functions to redeploy (with their whole relative-import closure)

| Function | Files | verify_jwt |
|---|---|---|
| calculate-tuition-bulk | `calculate-tuition-bulk/index.ts`, `_lib/auth.ts`, `_lib/enrollment-discounts.ts`, `_lib/invoice-status.ts`, `_lib/sibling-state.ts`, `_lib/tuition-session.ts` | true |
| cefr-defense | `cefr-defense/index.ts`, `_lib/auth.ts`, `_lib/text.ts` | true |
| ocr-vocab-scan | `ocr-vocab-scan/index.ts`, `_lib/auth.ts`, `_lib/google.ts`, `_lib/profile.ts`, `_lib/text.ts` | true |
| ocr-student-work | `ocr-student-work/index.ts`, `_lib/auth.ts`, `_lib/google.ts` | true |
| generate-student-report | `generate-student-report/index.ts`, `_lib/auth.ts` | true |
| word-enrichment | `word-enrichment/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| admin-unlock | `admin-unlock/index.ts`, `_lib/unlock.ts`, `_lib/webauthn.ts` | true |
| create-teacher | `create-teacher/index.ts`, `_lib/temp-password.ts` | true |
| create-teaching-assistant | `create-teaching-assistant/index.ts`, `_lib/temp-password.ts` | true |
| family-payment | `family-payment/index.ts`, `_lib/invoice-status.ts`, `_lib/rate-limit.ts`, `_lib/recorded-payment-write.ts` | true |
| modify-payment | `modify-payment/index.ts` | true |
| smart-family-payment | `smart-family-payment/index.ts`, `_lib/invoice-status.ts`, `_lib/rate-limit.ts`, `_lib/recorded-payment-write.ts` | true |
| redeem-access-code | `redeem-access-code/index.ts`, `_lib/rate-limit.ts` | false (as live) |
| assignment-calendar | `assignment-calendar/index.ts` | true |
| update-student-avatar | `update-student-avatar/index.ts` | true |
| pronounce-syllables | `pronounce-syllables/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| pronounce-viseme | `pronounce-viseme/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| image-generate | `image-generate/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| save-word (fix round) | `save-word/index.ts`, `_lib/auth.ts` | true |

The browser build carries `src/components/student/ClassCatalog.tsx` (F-17), `src/lib/sanitize.ts` + the two grading screens (F-23), `src/lib/avatarFile.ts` + `src/components/student/ProfilePictureUpload.tsx` (R-3). Each works against the database before and after the migrations.

`_lib/auth.ts` changed (F-08) and goes with every function above that imports it; other functions that import it pick it up whenever they are next deployed (no behaviour change for them). Rollback for any: redeploy the snapshot taken before (S1 practice), not `origin/main`. Owner, separately: delete the live `generate-sessions` function (dashboard).

## What was not verified

- Nothing was run against live: the "before" states are the repository's and the audit's. The preflights exist for exactly that gap; a refusal names the unknown policy.
- No browser run: ClassCatalog, the grading screens and the uploads are tested by reading and by SQL / handler tests, not in a browser.
- The Storage API itself (stand-in is `storage.objects` with RLS; `owner` / `owner_id` assumed set to the uploader, as the Storage API does). A real teacher upload and signed URL after F-18 is the proof.
- HEIC avatars: the server refuses HEIC bytes with its own message; the browser re-encodes a HEIC it can decode (canvas, tested with stubs only - not on a device or in Safari).
- F-12's sign-in-then-sign-out depends on GoTrue accepting `admin.signOut(accessToken, 'global')` as documented; driven against a stand-in only.

## Fix round after the independent review (`docs/evidence/S2-review.md`)

Migrations were not applied anywhere, so 093000 and 094000 were edited in place.

| Item | Change | Proof |
|---|---|---|
| R-2 (093000) | `can_view_teacher` driven from the caller's own children (the reviewer's body) | probe R-2: all 12 logins get exactly the first S2 body's rows; family `SELECT teachers` 380 ms vs 128 ms before S2 (first S2 body 5663 ms), asserted under 3x + 250 ms; F-17 suite 60 unchanged |
| R-1 (094000) | `student_work_file_staff_can`: a `students/<child>/...` name also needs `<child>` enrolled in the row's class (compared as text, so a malformed folder is just no match). Chosen over a storage_path trigger: the browser only ever files `incoming/` / `teams/` paths and ocr-student-work routes only to that class's roster, so no upload or read path changes | F-18 suite 48: the reviewer's case refused (read and delete), class B still reads its own, routed photo still read by class teacher / TA / cover, malformed folder no error; probe R-1 flipped |
| R-6 (094000) | own-upload branch is `storage_object_is_mine(owner, owner_id)`; preflight refuses a Storage without `owner_id` | F-18 suite: an upload with only `owner_id` is read by its uploader, not by another teacher |
| R-3 (update-student-avatar, browser) | bytes decide, the label is ignored, the sniffed type is stored; HEIC/HEIF gets "This photo is in HEIC format. Please choose a JPEG or PNG, or take a screenshot of it."; `src/lib/avatarFile.ts` re-encodes a HEIC the browser can decode (canvas, long side 1024, JPEG 0.9) before upload, else refuses with the same words | S2 edge suite: WebP labelled jpeg / PNG labelled svg stored as their real type, SVG refused with any label, HEIC refused with the message; helper: looksHeic brands, JPEG untouched, decodable HEIC -> `IMG_0001.jpg` 1024x768, undecodable -> message; probes R-3 flipped |
| R-4 (word-enrichment) | a look-up with a sentence is cached under `ctx1:<level>:<sha256(sentence)>:<word>` (read and write); plain look-ups keep the word key | S2 edge suite: same sentence again = hit with no vendor call; other sentence / other level / plain = miss with its own entry; the plain entry never touched by a sentence; probe R-4 flipped |
| F-03, new | `save-word` upserted the request's own payload into the shared `vocab_cache` - a second planting path. Removed (only word-enrichment fills the cache) | S2 edge suite: before has the write, after has none. Redeploy save-word |
| R-5, R-7 | no change: old access tokens live until expiry (front desk: "within the hour"); the journal teacher picker lists only the child's own teachers | - |

The reviewer's probes (`s2-review-probes.test.mjs`) are now in `run.mjs`, flipped where fixed.

## Owner decisions

| # | Decision | Recommended |
|---|---|---|
| 1 | Paste the six migrations and redeploy the eighteen functions | Yes, migrations first except F-17 (browser first or together) |
| 2 | F-17 rest: families still read their own teacher's pay columns; staff read TA rows | Move family screens to a name/bio/avatar view, then revoke the row |
| 3 | F-07: which destructive functions also call `requireUnlock` | payments, deletions, manage-admin-users, admin-data-import, close-payroll-month |
| 4 | F-13: which email domains a child's migration account may use | the school's own domain only |
| 5 | F-20 rest: revoke anon's table privileges | after reading which `TO public` policies anon passes on live |
| 6 | F-22, F-25, F-27 | rotate the key; delete the demo residue; turn on leaked-password protection |
| 7 | F-23 CSP | a report-only header first, then enforce |

## Rollbacks

Each block is executed by its suite (install it as the "before", paste the fix, run the block, paste the fix again).

<!-- rollback F-06 -->
```sql
-- Puts back the three role-only policies as 20260715090000, 20260507120000
-- and 20260711235255 created them. THIS REOPENS F-06.
BEGIN;
DROP POLICY IF EXISTS "teachers_read_class_learning_profiles" ON public.student_learning_profiles;
DROP POLICY IF EXISTS "teachers_read_learning_profiles" ON public.student_learning_profiles;
CREATE POLICY "teachers_read_learning_profiles" ON public.student_learning_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
DROP POLICY IF EXISTS "Teachers can read all monthly snapshots" ON public.monthly_finance_snapshots;
CREATE POLICY "Teachers can read all monthly snapshots" ON public.monthly_finance_snapshots
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role));
DROP POLICY IF EXISTS "Admins and class staff view monthly leaders" ON public.monthly_leaders;
DROP POLICY IF EXISTS "Admins and teachers view monthly leaders" ON public.monthly_leaders;
CREATE POLICY "Admins and teachers view monthly leaders" ON public.monthly_leaders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));
COMMIT;
```

<!-- rollback F-17 -->
```sql
-- can_view_teacher exactly as 20261110140000 defines it, the rate functions'
-- grants as 20261021090000 left them, and no catalogue function.
-- THIS REOPENS F-17. Ship the ClassCatalog fallback first (it reads the table
-- again when the function is missing).
BEGIN;
CREATE OR REPLACE FUNCTION public.can_view_teacher(_teacher_id uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    public.is_staff_member(_uid)
    OR EXISTS (SELECT 1 FROM public.classes c WHERE c.default_teacher_id = _teacher_id AND c.is_active)
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.enrollments e ON e.class_id = s.class_id
      WHERE s.teacher_id = _teacher_id AND public.can_view_student(e.student_id, _uid)
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_teacher(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_rate_on(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assistant_rate_on(uuid, date) TO authenticated, service_role;
DROP FUNCTION IF EXISTS public.get_class_catalog_teachers(uuid[]);
COMMIT;
```

<!-- rollback F-18 -->
```sql
-- The three any-teacher storage policies as 20260712090000, 20260721090000
-- and 20260711235255 created them; the new policies and helpers dropped.
-- THIS REOPENS F-18. No file is touched.
BEGIN;
DROP POLICY IF EXISTS student_work_files_admin_all ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_select ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_insert ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_update ON storage.objects;
DROP POLICY IF EXISTS student_work_files_staff_delete ON storage.objects;
DROP POLICY IF EXISTS lesson_resource_files_admin_all ON storage.objects;
DROP POLICY IF EXISTS lesson_resource_files_staff_all ON storage.objects;
DROP POLICY IF EXISTS exam_report_files_staff_insert ON storage.objects;
DROP POLICY IF EXISTS "staff_manage_student_work_files" ON storage.objects;
CREATE POLICY "staff_manage_student_work_files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'student-work' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')))
  WITH CHECK (bucket_id = 'student-work' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));
DROP POLICY IF EXISTS "staff_manage_lesson_resource_files" ON storage.objects;
CREATE POLICY "staff_manage_lesson_resource_files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'lesson-resources' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')))
  WITH CHECK (bucket_id = 'lesson-resources' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));
DROP POLICY IF EXISTS "Teachers and admins upload exam-reports files" ON storage.objects;
CREATE POLICY "Teachers and admins upload exam-reports files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exam-reports' AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role)));
DROP FUNCTION IF EXISTS public.student_work_file_staff_can(text);
DROP FUNCTION IF EXISTS public.student_work_file_may_upload(text);
DROP FUNCTION IF EXISTS public.lesson_resource_file_staff_can(text);
DROP FUNCTION IF EXISTS public.exam_report_file_staff_may_upload(text);
DROP FUNCTION IF EXISTS public.storage_object_is_mine(uuid, text);
COMMIT;
```

<!-- rollback F-05 -->
```sql
-- Removes the grade guard: homework_submissions back to its policies alone.
-- THIS REOPENS F-05. No row is changed.
BEGIN;
DROP TRIGGER IF EXISTS homework_submissions_grade_guard ON public.homework_submissions;
DROP FUNCTION IF EXISTS public.homework_submissions_grade_guard();
COMMIT;
```

<!-- rollback F-19 -->
```sql
-- The two word-list policies as 20260801090000 created them, and no size
-- limit on homework / submissions. THIS REOPENS F-19.
BEGIN;
DROP POLICY IF EXISTS "vocab_insert_own" ON public.student_vocabulary_entries;
CREATE POLICY "vocab_insert_own" ON public.student_vocabulary_entries
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "vocab_update_own_or_linked" ON public.student_vocabulary_entries;
CREATE POLICY "vocab_update_own_or_linked" ON public.student_vocabulary_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id)))
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id)));
UPDATE storage.buckets SET file_size_limit = NULL WHERE id IN ('homework', 'submissions') AND file_size_limit = 52428800;
COMMIT;
```

<!-- rollback F-20 -->
```sql
-- video_staff_for_class as 20261109090000 defines it, PUBLIC's EXECUTE back
-- on the helpers and recompute_student_points, payroll_periods readable by
-- every signed-in account (20261021093000). THIS REOPENS F-20 (a-d).
BEGIN;
CREATE OR REPLACE FUNCTION public.video_staff_for_class(p_class uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.is_teacher_of_class(auth.uid(), p_class);
$$;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_class(uuid, uuid), public.is_linked_student(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_student_points(uuid, uuid, text) TO PUBLIC;
DO $ls$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.language_support_staff_for_class(uuid)', 'public.language_support_family_can_read(uuid)',
                           'public.language_support_staff_can_read(uuid)'] LOOP
    IF to_regprocedure(f) IS NOT NULL THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', f); END IF;
  END LOOP;
END
$ls$;
DROP POLICY IF EXISTS "Staff can see which months are closed" ON public.payroll_periods;
CREATE POLICY "Staff can see which months are closed" ON public.payroll_periods FOR SELECT TO authenticated USING (true);
COMMIT;
```
