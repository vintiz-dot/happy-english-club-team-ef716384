# Brief: applying the S1 security fixes on the LIVE project (one item at a time; stop on anything unexpected)

Revised after `docs/evidence/S1-review.md` (round 2). F-14 and F-15 were approved as built and are being applied separately; their items are kept here for the record. Every other item needs the owner's yes first (`docs/evidence/S1-security-fixes.md`, "Owner decisions"). Live project id: `aswgmbefikhsnhogtryv`. Production: real children's data and money. Do exactly the steps of the item that was approved, in order, and nothing else. If a check differs from what is expected: STOP, change nothing further, report.

## Rules (as `T2-live-apply-brief.md`)

- First action: create `docs/evidence/S1-live-apply.md` with a "Where I am / next step" line; append each step's result and commit after each step.
- Every file sent to live is the LF blob from the commit (`git show <commit>:<path>`), never the CRLF working copy.
- Supabase MCP: `execute_sql` (catalog and counts only), `apply_migration`, `deploy_edge_function`, `get_edge_function`. Never read a secret. Never select rows about people.
- Each migration carries its own `BEGIN` / `COMMIT`, a preflight and, for F-14 / F-16 / F-21, a guard that raises if a policy it does not know still opens the door. Do not strip the transaction: "if it raises, nothing has changed" rests on it. On a raise, report the message verbatim (it names the policy) and stop.
- After each `apply_migration`: compare `md5(replace(prosrc, E'\r', ''))` of every function the file creates, on live, with the same computed locally by loading the file into pglite as its suite does. They must be equal.
- **Browser before database** for F-01, F-16 (+ the skill summary) and F-21: deploy the named release branch, confirm it is live (reload, check the changed screen), THEN paste. The release branches are cut from `origin/main` and contain only the listed files.
- Where each rollback is: F-01 and F-15 - the fenced blocks `<!-- rollback F-01 -->` / `<!-- rollback F-15 -->` in `S1-security-fixes.md`; F-14 / F-16 / F-21 - `docs/evidence/S1-F14-rollback.sql`, `S1-F16-rollback.sql`, `S1-F21-rollback.sql`; the skill summary - the block `<!-- rollback class-skill-summary -->`; F-02 - the function sources saved in step 1 of that item.

## Order

1. F-14, F-15 (in progress elsewhere).
2. Browser: `release/s1-signup-form` live. Then F-01.
3. Browser: `release/s1-f16-browser` and `release/s1-f21-browser` live. Then F-16 followed at once by the skill summary; then F-21.
4. F-02, function by function, `get-speech-token` last.

## F-01 - `20261113100000_signup_role_from_server_only.sql`

0. Precondition: the build from `release/s1-signup-form` is live - the "Join the club" form offers Student and Family only.
1. Pre: `SELECT md5(replace(prosrc, E'\r', '')) FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure` -> `b2979d905a52445265d16091df7111b2`. Record `SELECT role, count(*) FROM public.user_roles GROUP BY 1` (13 Nov: admin 3, student 64, teacher 8) and `SELECT count(*) FROM auth.users` (76).
2. Apply. Probes P1-P4 in the evidence file; the function's body must contain `IF v_requested = 'teacher' THEN` and must NOT contain `IN ('teacher', 'admin')`. The role counts are unchanged.
3. Hand check with a throw-away mailbox: join on the form as Family -> Admin > Users shows `student`. By a direct sign-up request (the form no longer offers them): `role: "admin"` -> `student`; `role: "teacher"` -> no role. Create a teacher in the admin screen -> `teacher` only. Remove the test accounts afterwards.
4. Public sign-up stays ON (owner). Nothing to change in the dashboard.
5. `student-create-migration-account` (the upsert) wakes a dormant feature: deploy it separately and deliberately, not as part of this item.

## F-14 - `20261113110000_homework_bucket_scope.sql`

1. Pre: the policy list on `storage.objects` matching `bucket_id = 'homework'` is exactly the 36 names in `docs/evidence/S1-F14-rollback.sql`. Record `SELECT count(*) FROM storage.objects WHERE bucket_id = 'homework'` (13 Nov: 99) and probe P3 (expect 3).
2. Apply. Probes P1-P4; md5 of the three `homework_object_*` functions.
3. Outside probe: with the publishable key and no session, listing bucket `homework` returns nothing.
4. Hand check the same day, before lessons: a teacher uploads an assignment file and opens a child's submission; a parent opens an assignment file and their child's submission, and hands one in. If either fails, run the rollback file (it reopens F-14) and report.
5. Never paste `20261111110000_ta_standing_assignments_and_homework_upload.sql` again after this one (it recreates two of the 36).

## F-15 - `20261113120000_pause_enrollment_admin_only.sql`

1. Pre: `md5(replace(prosrc, E'\r', ''))` of `pause_enrollment(uuid, uuid, date, date, text)` -> `37437aad7f6524d3d2ea9a57f7304660`. Record `SELECT count(*) FROM public.pause_windows` (8).
2. Apply. Probes P1-P2. Expected md5 afterwards: `fd2186eff3f49bb91602e7bc182bece0` (2217 chars; the reviewer's figure for the LF file - recompute locally to confirm). The pause-window count is unchanged.
3. Outside probe: with the publishable key and no session, `POST /rest/v1/rpc/pause_enrollment` is refused.

## F-16 - `20261113130000_classmate_rows_private.sql`, then at once `20261113150000_class_skill_summary_without_names.sql`

0. Precondition: the build from `release/s1-f16-browser` is live. (Database first would show a child as "best in class" from its own rows alone - wrong figures, no error.)
1. Pre: the four old policies exist under their names; md5 of `can_view_classmate` -> `ffe7e1f83ee873ab36c0a5e28246d6a5`, `can_view_student` -> `53f2d32704abbb600bf5eefa09130c12`, `can_view_enrollment` -> `3bbba012bdd56010bb2d6059db8f444f`, `is_student_enrolled_in_class` -> `e8d7b3599d6e55b407daa052b7da6c75`. Record probe P4 (5).
2. Apply `20261113130000`. Probes P1-P4 (P4 unchanged); md5 of `is_family_student` and `get_class_skill_points`. Each new policy's `qual` reads `(is_family_student(<col>, auth.uid()) AND <the old qual>)`.
3. Apply `20261113150000` straight away. Probe: `get_class_skill_summary` exists (definer, anon no, authenticated yes) and `get_class_skill_points` does not; md5 of the summary function.
4. Hand check as a parent: the class board shows every child; own child's pop-up has four tabs with data, a "class best", and a top three shown as points with "You" on the child's own entry; a classmate's pop-up shows the header and the private line. As a teacher: the same pop-up from a staff board still shows names in the top three.
5. Never paste `20261113130000` again after `20261113150000`; if it happens, paste `20261113150000` again.

## F-21 - `20261113140000_creator_rows_need_class_staff.sql`

0. Precondition: the build from `release/s1-f21-browser` is live (it only stops a non-http(s) link being rendered; independent of the paste, but first).
1. Pre: probe P4 (0, 0) - if not zero, those rows could no longer be updated once the constraints exist: STOP and report the counts. The four `teachers_manage_*` policies and the three `Teachers can ... own resources` policies exist.
2. Apply. Probes P1-P4; md5 of the three `staff_*` functions.
3. Hand check as a teacher: Smart Upload one photo and approve it; flag one error in class; generate one report from the class page.

## F-02 - the nine functions (no SQL)

Source commit for the new code: the tip of this branch. Pre-gate base for the comparison: commit `6703938`.

For EACH function, in this order - `word-enrichment`, `image-search`, `pronounce-syllables`, `pronounce-viseme`, `smart-dictation`, `smart-dictionary`, `sapling-grammar`, `image-generate`, and LAST `get-speech-token` (outside lesson and homework hours: it is the one a child's video recorder touches):

1. **Snapshot.** `get_edge_function` it. Save every returned file under `docs/evidence/S1-F02-live-before/<name>/` and commit. That copy - not `origin/main` - is the rollback. Record the live `verify_jwt` and version.
2. **Compare with the base.** The live `index.ts` must equal `git show 6703938:supabase/functions/<name>/index.ts`, ignoring line endings. If it differs, STOP: the deploy would silently change something else. (The reviewer did this for `get-speech-token`: identical. The other eight are unchecked.)
3. **Deploy** with `verify_jwt` TRUE, entrypoint `<name>/index.ts`, and exactly these files, each the LF blob, laid out so that `../_lib/ai-gate.ts` resolves from the entrypoint:

| Function | Files (entrypoint first) | `verify_jwt` live -> new |
|---|---|---|
| `word-enrichment` | `word-enrichment/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | false -> true |
| `image-search` | `image-search/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | false -> true |
| `pronounce-syllables` | `pronounce-syllables/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | false -> true |
| `pronounce-viseme` | `pronounce-viseme/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | false -> true |
| `smart-dictation` | `smart-dictation/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| `smart-dictionary` | `smart-dictionary/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| `sapling-grammar` | `sapling-grammar/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| `image-generate` | `image-generate/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |
| `get-speech-token` (last) | `get-speech-token/index.ts`, `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | true |

   Import closure, checked on this branch: each `index.ts` has exactly one relative import, `../_lib/ai-gate.ts`; `ai-gate.ts` imports `./auth.ts` and `./rate-limit.ts`; those two import nothing relative. (`_lib/google.ts` only mentions image-search in a comment; it is not imported.) Re-check with `grep -n "from \"\\.\\.\\?/" <file>` before deploying.
4. **Verify.** `get_edge_function` again: `requireSpender(req, corsHeaders, GATE)` sits straight after the OPTIONS block and the returned `index.ts` equals the blob deployed.
5. **Probe**, empty body, nothing that reaches a vendor: no Authorization -> 401; the publishable key as bearer -> 401.
6. Only then the next function. After `word-enrichment`, `image-search` and `pronounce-syllables`: signed in as a child, look one word up on the Vocabulary page (definition, pictures, syllable audio). After `get-speech-token`: start the video recorder once.

Rollback of one function: redeploy the files saved in step 1 with the `verify_jwt` recorded there.

## The two `teacher` accounts with no teacher record (no migration closes this)

Owner only: run `scripts/CHECK-unlinked-accounts.sql` (ids and dates), look each id up in Authentication > Users, then for each account that is not a member of staff run `scripts/FIX-remove-unbacked-teacher-role.sql` with that id. The conductor does not run it without the owner naming the account.

## Report (under 250 words)

Per item: applied / deployed or STOPPED AT STEP n and why; the md5 comparisons; the probe results against the expected values; counts before and after; whether a rollback was run.
