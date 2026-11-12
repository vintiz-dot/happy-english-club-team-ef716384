# Brief: applying the S1 security fixes on the LIVE project (one item at a time; stop on anything unexpected)

NOT YET AUTHORISED. Each item below is a permission change and needs the owner's yes first (`docs/evidence/S1-security-fixes.md`, "Owner decisions"). Live project id: `aswgmbefikhsnhogtryv`. Production: real children's data and money. Do exactly the steps of the item that was approved, in order, and nothing else. If a check differs from what is expected: STOP, change nothing further, report.

## Rules (as `T2-live-apply-brief.md`)

- First action: create `docs/evidence/S1-live-apply.md` with a "Where I am / next step" line; append each step's result and commit after each step.
- Every file sent to live is the LF blob from the commit (`git show <commit>:<path>`), never the CRLF working copy.
- Supabase MCP: `execute_sql` (catalog and counts only), `apply_migration`, `deploy_edge_function`, `get_edge_function`. Never read a secret. Never select rows about people.
- Each migration is one transaction with its own preflight and, for F-14 / F-16 / F-21, a guard that raises if a policy it does not know still opens the door. If it raises, nothing has changed: report the message verbatim (it names the policy) and stop.
- After each `apply_migration`: compare `md5(replace(prosrc, E'\r', ''))` of every function the file creates, on live, with the same computed locally by loading the file into pglite as its suite does. They must be equal.
- The items are independent. Recommended order: F-01, F-14, F-15 (small, invisible to real users), then F-16 and F-21 with the browser build that carries their `src/` changes, then F-02.

## F-01 - `20261113100000_signup_role_from_server_only.sql`

1. Pre: `SELECT md5(replace(prosrc, E'\r', '')) FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure` -> `b2979d905a52445265d16091df7111b2` (the function the fix was built against). Record `SELECT role, count(*) FROM public.user_roles GROUP BY 1` (13 Nov: admin 3, student 64, teacher 8) and `SELECT count(*) FROM auth.users` (76).
2. Apply. Probes P1-P4 in the evidence file. The role counts must be unchanged.
3. Hand check (owner, or a throw-away mailbox): join on the form -> the account shows `student`; create a teacher in the admin screen -> `teacher` only. Remove the test accounts in the dashboard afterwards.
4. Separately, when the owner says so: Authentication > Sign In / Providers > "Allow new users to sign up" off.
5. `student-create-migration-account` (the upsert) can be deployed at any time; it is a bug fix, not a permission change.

## F-14 - `20261113110000_homework_bucket_scope.sql`

1. Pre: the policy list on `storage.objects` matching `bucket_id = 'homework'` is exactly the 36 names in `docs/evidence/S1-F14-rollback.sql` (compare names, commands and roles; if a 37th exists the migration will refuse - add it to the DROP list and to the rollback file first, with the owner's knowledge). Record `SELECT count(*) FROM storage.objects WHERE bucket_id = 'homework'` (13 Nov: 99) and probe P3 (expect 3).
2. Apply. Probes P1-P4; md5 of the three `homework_object_*` functions.
3. Hand check the same day, with real logins: a teacher opens Homework, uploads an assignment file and opens a child's submission; a parent opens an assignment file and their child's submission, and hands one in. If either fails, run the rollback file (it reopens F-14) and report.

## F-15 - `20261113120000_pause_enrollment_admin_only.sql`

1. Pre: `md5(replace(prosrc, E'\r', ''))` of `pause_enrollment(uuid, uuid, date, date, text)` -> `37437aad7f6524d3d2ea9a57f7304660`. Record `SELECT count(*) FROM public.pause_windows` (8).
2. Apply. Probes P1-P2. The pause-window count is unchanged.

## F-16 - `20261113130000_classmate_rows_private.sql` (ship the browser build with it)

1. Pre: the four old policies exist under their names; md5 of `can_view_classmate` -> `ffe7e1f83ee873ab36c0a5e28246d6a5`, `can_view_student` -> `53f2d32704abbb600bf5eefa09130c12`, `can_view_enrollment` -> `3bbba012bdd56010bb2d6059db8f444f`, `is_student_enrolled_in_class` -> `e8d7b3599d6e55b407daa052b7da6c75`. Record probe P4 (5).
2. Apply. Probes P1-P4 (P4 unchanged); md5 of `is_family_student` and `get_class_skill_points`. Each new policy's `qual` must read `(is_family_student(<col>, auth.uid()) AND <the old qual>)`.
3. Hand check as a parent: the class board shows every child; own child's pop-up has four tabs with data and a "class best"; a classmate's pop-up shows the header and the private line.

## F-21 - `20261113140000_creator_rows_need_class_staff.sql` (ship the browser build with it)

1. Pre: probe P4 (0, 0) - if not zero, those rows could no longer be updated once the constraints exist: STOP and report the counts. The four `teachers_manage_*` policies and the three `Teachers can ... own resources` policies exist.
2. Apply. Probes P1-P4; md5 of the three `staff_*` functions.
3. Hand check as a teacher: Smart Upload one photo and approve it; flag one error in class; generate one report from the class page.

## F-02 - the nine functions (no SQL)

1. Deploy each of `word-enrichment`, `image-search`, `pronounce-syllables`, `pronounce-viseme`, `smart-dictation`, `smart-dictionary`, `sapling-grammar`, `get-speech-token`, `image-generate` with `verify_jwt` TRUE, files: its `index.ts` plus `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` (on 13 Nov none of the nine has another relative import; check each file's imports again before deploying, recursively).
2. `get_edge_function` each: `requireSpender(req, corsHeaders, GATE)` is present straight after the OPTIONS block.
3. Probes with curl, empty body, nothing that reaches a vendor: no Authorization -> 401 on all nine; the publishable key as bearer -> 401 on all nine.
4. Hand check signed in as a child: one word on the Vocabulary page (definition, pictures, syllable audio); start the video recorder once.

## Report (under 250 words)

Per item: applied / deployed or STOPPED AT STEP n and why; the md5 comparisons; the probe results against the expected values; counts before and after; whether a rollback was run.
