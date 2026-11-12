# A5 security audit - findings

**Where I am / next step:** 13 Nov 2026. Sections 1, 2, 3 written (F-01 to F-20). Next: section 4 (bundle and repo), 5 (auth and sessions), 6 (abuse and cost), 7 (advisors), 8 (dependencies), then top five and owner summary.

Report only. No product code changed, nothing pushed or deployed. Live catalog read read-only (policies, grants, function bodies, counts). No child, family, staff or payment row was selected. No secret was read or printed.

Scope notes
- Live code = `origin/main` at 705dea8. Worktree = conductor branch 0618a6b. The two differ on the server side only by: `audit-eval-proxy` (new), `recorder-retention` (new), `transcribe-lesson-audio` (gate added), three migrations (20261112100000 recorder, 20261112110000 audit-eval bucket, 20261112120000 class-recordings scope). Per MASTER_PLAN the proxy, the transcribe gate and the last two migrations ARE applied/deployed live although the code is not on main; the recorder migration and `recorder-retention` are NOT live (the function is not in the live list).
- Live function list (70) read with `list_edge_functions`. `verify_jwt = false` on live for exactly six: `image-search`, `parent-video-page`, `pronounce-syllables`, `pronounce-viseme`, `redeem-access-code`, `word-enrichment` (config.toml says "five" in its comment; it lists six).
- IMPORTANT background fact: the browser key is a legacy anon JWT (role claim `anon`, read from the committed `.env`). The gateway's `verify_jwt` therefore accepts the PUBLIC key. `verify_jwt = true` means "has the public key", not "is signed in". Status-code probes on 13 Nov confirmed: an empty POST with only the public key reaches the handler (400 validation error) on `sapling-grammar`, `image-generate`, `smart-dictation`, `smart-dictionary`; an empty POST with no key at all reaches the handler on `word-enrichment`, `image-search`, `pronounce-syllables`, `pronounce-viseme`. No request with a real payload was sent.

Severity key: critical / high / medium / low by real effect on children's data or money.

---

## Findings (numbered; ranked list at the end)

### F-01 CRITICAL - Anyone on the internet can make themselves a "teacher" from the public sign-up form
- Who: anyone with an email address. No school account needed.
- Proof by reading:
  - `src/pages/Auth.tsx:351-366` shows a "Join the club" form with an "I am a" picker offering Student / Teacher / Family / Admin, and `:172-176` sends the choice as `options.data.role`.
  - Live Auth settings (public `/auth/v1/settings`): `disable_signup: false`, email provider on, email confirmation required. So sign-up is open; the person only has to click the confirmation mail sent to their own address.
  - Live trigger `auth.users on_auth_user_created -> public.handle_new_user` (catalog): `v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')`; only `admin` is downgraded; then it inserts `user_roles(user_id, v_role)`. So `teacher` and `family` are granted as asked.
  - What the self-made "teacher" role opens, with no class or teacher record:
    - RLS `student_learning_profiles` SELECT `has_role(auth.uid(),'teacher')`: every child's AI-written learning profile (summary, strengths, struggles, CEFR estimate) with `student_id`. 41 rows live.
    - RLS `monthly_finance_snapshots` SELECT `has_role(auth.uid(),'teacher')`: per-child bill, discount, payment and carry figures for closed months (0 rows today; fills when months are closed).
    - RLS `monthly_leaders` (child ids and points), `resources`, `resource_class_access` (ALL - can re-point or delete class resource links), `classes` SELECT for active classes (names, rates, timetable with teacher ids), `language_support_sets` (create), `journals` (create "student" journals).
    - Edge functions gated only on role `teacher` (see F-04): `calculate-tuition-bulk` returns any child's bill for ids taken from the profiles above; `cefr-defense` writes a level claim and sends a child's error log, vocabulary and date of birth to OpenAI; `ocr-vocab-scan` mints points; `generate-student-report`, `ocr-student-work`.
  - Catalog count: 8 accounts hold the teacher role; 2 of them have no `teachers` or `teaching_assistants` row. I did not look at who they are. The owner should (Supabase dashboard > Authentication), today.
- Smallest fix: in `handle_new_user`, ignore the metadata and always insert `student` (staff and family accounts are already created by `create-teacher`, `create-teaching-assistant`, `create-family`, which set roles themselves). And turn off public sign-up in Supabase Auth if the school does not use it, and remove the role picker from `Auth.tsx`.
- Permission change needing the owner: YES (changes who can get a role; turning sign-up off is an Auth setting).

### F-02 HIGH - Functions that spend the school's AI / speech credit can be called without signing in, with no limit
- Who: anyone. Four need no key at all; five need only the public key that ships in the web page.
- Proof by reading (none has any caller check or rate limit):
  - No key at all (`verify_jwt=false`): `word-enrichment/index.ts:244-315` (OpenAI gpt-4o-mini, 1600 tokens, no length cap on `word` or `context`), `image-search/index.ts:251-274` (Pixabay, Pexels, Google CSE, Unsplash keys; `skip_cache` and single-`provider` switches bypass the cache), `pronounce-syllables/index.ts:150-190` and `pronounce-viseme/index.ts:57-90` (Azure TTS; text length uncapped).
  - Public key only (`verify_jwt=true`, no `getUser`): `image-generate/index.ts:21-56` (DALL-E 3, one 1024px image per call - the dearest call in the app), `smart-dictation/index.ts:16-66`, `smart-dictionary/index.ts:95-240`, `sapling-grammar/index.ts:17-45`, `get-speech-token/index.ts:11-38` (hands a 10-minute Azure Speech token to any caller, usable directly against Azure for speech-to-text or TTS).
- Impact: money. A script can run up the OpenAI, Azure, Google CSE and Sapling bills or exhaust quotas so the children's dictionary, pronunciation and recorder stop working. No child data is exposed.
- Smallest fix: `verify_jwt = true` on the four open ones, and in all nine call `authenticateUser` (reject `null`) before the vendor call; add a per-user daily cap in a table (the in-memory limiter resets on every cold start). `image-generate` and `image-search?provider=` should be staff-only.
- Permission change needing the owner: YES for the four `verify_jwt` flips (the login screen must not call them; check `word-enrichment` is not used before sign-in). The in-function checks are code fixes.

### F-03 MEDIUM - An anonymous caller can plant dictionary content that children then read
- Who: anyone, no key.
- Proof: `word-enrichment/index.ts:295-297` puts the caller's free-text `context` into the model prompt, and `:384-390` saves the model's answer in `vocab_cache` keyed by the word alone, on the service role. `:265-276` then serves that cached entry to every later caller. So the first caller for a word that is not cached yet decides, through a crafted "sentence context", what definition and example sentences every child sees for that word. `image-search` has the same shape for pictures (`:313-325`), limited to what the image providers return for the caller's query.
- Smallest fix: cache only answers produced without caller `context` (or key the cache by word + hash of context), and only for signed-in callers (F-02).
- Permission change: no.

### F-04 MEDIUM - Five staff functions check "is a teacher" but not "of this class"
- Who: any teacher or teaching assistant (TAs hold the `teacher` role), and anyone using F-01.
- Proof: each runs on the service role and takes the child or record id from the body with only a role check:
  - `calculate-tuition-bulk/index.ts:106-115`: returns base, discount, total, payments and carry balances for up to 200 arbitrary `studentIds`. The browser only calls it from admin screens.
  - `cefr-defense/index.ts:193-195, 209-260, 342-375`: `set_level`, `mine_evidence`, `generate_test` for any `student_id`; `mine_evidence` reads the child's speaking metrics, error log, vocabulary, profile and date of birth and sends them to OpenAI.
  - `ocr-vocab-scan/index.ts:156-183`: awards +10 points per word to any `student_id`.
  - `ocr-student-work/index.ts:90-111` and `generate-student-report/index.ts:63-83`: read any work file / build any child's report by id.
  - By contrast `analyze-transcript`, `transcribe-lesson-audio`, `generate-work-feedback`, `refresh-student-profile`, `video-rubric`, `mark-attendance` DO call `callerHoldsClass` / `callerHoldsStudent` / `is_teacher_of_class`.
- Smallest fix: `calculate-tuition-bulk` -> admin only (plus service role). The other four -> `callerHoldsStudent` / `callerHoldsClass` from `_lib/auth.ts` on the row's own class or student.
- Permission change needing the owner: YES (narrows what teachers can do; confirm no teacher screen relies on bulk tuition).

### F-05 MEDIUM - A child (or the family login) can write their own homework grade
- Who: any student or family account, on their own submissions.
- Proof (catalog): policy on `homework_submissions` for UPDATE is `student_id IN (own or family's children)` with no WITH CHECK, and the INSERT policy has the same test. All 16 columns are granted to `authenticated`, and the table's triggers are only notify/updated_at - there is no column guard (compare `teachers`, `classes`, `video_submissions`, which each have one). The columns include `grade`, `teacher_feedback`, `status`, `graded_at`. So a direct API update of one's own row can set a grade and teacher feedback; `notify_homework_graded` then fires as if a teacher had graded it.
- Impact: integrity of grades and feedback that parents read; not another child's data. Points are not paid by this path (they go through `award_homework_points`; checked in section 2).
- Smallest fix: a BEFORE INSERT/UPDATE trigger that, for a caller who is not staff of the homework's class, keeps `grade`, `teacher_feedback`, `graded_at` and a graded `status` as they were.
- Permission change needing the owner: YES (tightens a table rule).

### F-06 MEDIUM - Every teacher and TA can read every child's learning profile and (once months are closed) every family's bill snapshot
- Who: any account with the teacher role.
- Proof (catalog): `student_learning_profiles` SELECT `has_role(auth.uid(),'teacher')`; `monthly_finance_snapshots` SELECT `has_role(auth.uid(),'teacher')`; `monthly_leaders` SELECT admin-or-teacher. None is scoped by class. Elsewhere teachers are held to `is_teacher_of_class` / `can_view_student_in_class`.
- Smallest fix: profiles -> `has_role(...,'teacher') AND can_view_student_in_class(student_id, auth.uid())`; finance snapshots -> admin only.
- Permission change needing the owner: YES.

### F-07 MEDIUM - The admin "confirm it's you" gate can be passed by anyone who already holds an admin session, and guards one function
- Who: someone with a stolen or unattended admin session (the case the gate exists for).
- Proof: `admin-unlock/index.ts:191-228` (`passkey/register`) inserts whatever `credentialId` / `publicKeySpki` the body carries after only a challenge the same caller just requested (`:127-136`), and returns `issueUnlock(...)`. It does not require an existing unlock, the current passcode, or a signed attestation. `passcode/set` (`:331-381`) does ask for the current passcode when one exists, so the passcode is protected and the passkey path is the way round. Separately, only `reset-points` calls `requireUnlock` (`grep requireUnlock` -> `admin-unlock`, `reset-points`); payments, deletions, `manage-admin-users`, `admin-data-import`, `close-payroll-month` rely on the admin role alone, so the gate is a screen lock for everything else.
- Smallest fix: `passkey/register` must require a valid `x-admin-unlock` (or the passcode) whenever the admin already has a passcode or passkey. Decide which other destructive functions should call `requireUnlock`.
- Permission change needing the owner: no for the register fix; yes for extending the gate.

### F-08 LOW - Secret comparisons that are not constant-time
- `watch-sibling-threshold/index.ts:26-28` (`presented === cronSecret`), `auto-mark-attendance/index.ts:20-23`, `_lib/auth.ts:42` (service key `===`). `stars-sync` (`_lib/stars-sync-core.ts:44-52`) and `schedule-sessions` (`:80-100`) do it properly. Remote timing attacks on these are impractical; fix by reusing `secretsMatch`.

### F-09 LOW - Two dead deployments
- `generate-sessions` is live with an EMPTY source file (read with `get_edge_function`; the repo file is 0 bytes). It does nothing; delete it.
- `auto-mark-attendance` is live with `verify_jwt = true` but authenticates by comparing the Authorization header to `Bearer <CRON_SECRET_TOKEN>`. The gateway only lets a JWT through, so unless that secret is itself a project JWT the function can never run. Either it is dead (then delete it) or the secret is a JWT (then say so). Not checked: I did not read the secret.

### F-10 LOW - New staff passwords come from `Math.random`
- `create-teacher/index.ts:67-68`: `Math.random().toString(36).slice(-8) + "!Aa1"`. Not a cryptographic source; `create-teaching-assistant` should be checked for the same line. Use `crypto.getRandomValues` as `manage-student-access` and `student-create-migration-account` do.

### F-11 LOW - Admin checks that break for a multi-role admin
- `family-payment/index.ts:47-54`, `modify-payment/index.ts:30-38`, `smart-family-payment/index.ts:64-72`, `delete-payment/index.ts:41-50`, `create-family/index.ts:70-78` use `.single()` on `user_roles`. For an admin who is also a teacher the first three fail closed (no payment can be recorded); not a hole, but `_lib/auth.ts` warns against exactly this. Use `requireRole`.

### F-12 LOW - Rate limiting is per warm instance and keyed on a header the caller sets
- `_lib/rate-limit.ts`: a `Map` in memory (reset on cold start, not shared between instances) and `getClientIP` trusts the first `x-forwarded-for` entry. It is the only brake on `redeem-access-code` (`:83-85`), `stars-sync`, `chat`'s daily cap. `redeem-access-code` is still safe against guessing because codes carry 50 random bits, expire and are single use (`manage-student-access/index.ts:51-64`); its `auth.admin.signOut(row.user_id, "global")` call (`:171`) passes a user id where the API expects a token, so old sessions are probably NOT ended after a reset.

### F-13 LOW - Small items
- `student-create-migration-account/index.ts:77-135`: a signed-in student picks ANY email (domain included) for the new confirmed account; it can squat an address the school later wants for staff. Restrict the domain.
- `update-student-avatar/index.ts:68-80`: trusts the browser-declared `file.type`; SVG passes "image/". Whitelist png/jpeg/webp.
- `assignment-calendar/index.ts:120` reads the role from `user_metadata` (user-editable). Harmless today because every read is under the caller's RLS; do not build on it.
- `pronounce-syllables` / `pronounce-viseme` put the caller's `voice` string into SSML unescaped.
- `image-generate/index.ts:62-66` returns the vendor's raw error text to the caller.
- `analyze-video-submission/index.ts:471-476`: a family can restart analysis whenever the row is `uploaded` or `failed`; each run costs OpenAI + Gemini + Claude. Bounded by their own homework, but uncapped.

---

## 1. Edge functions - every function

Columns: **JWT** = live `verify_jwt`. **Who** = the check inside. **Identity** = where the caller's identity comes from. **SR** = uses the service role (what for). **Gap**.

Admin only, identity from the JWT, service role used for the work, input validated - no gap found beyond F-07/F-11:
`admin-activity-logs` (:50-60), `admin-data-export` (:28-43), `admin-data-import` (:33-48), `admin-integrity-scan` (:28-43), `bulk-cancel-sessions` (:51-62), `close-payroll-month` (:71, service role refused), `compute-sibling-discounts` (:137), `confirm-tuition` (:23), `create-family` (:63-78), `create-teacher` (:32-54; F-10), `create-teaching-assistant` (:30-48), `delete-payment` (:36-50), `explain-family-tuition` (:24, service role refused; prices nothing), `family-payment` (:33-54; zod), `link-student-user` (:37-70), `manage-admin-users` (:166-199; `checkAdmins` and `bootstrap` are pre-auth by design, bootstrap needs zero admins AND secret `ALLOW_ADMIN_BOOTSTRAP=true`, :63-86), `manage-demo-student` (:54-60), `manage-session` (:46-57), `manage-student-access` (authenticateUser + admin), `modify-payment` (:23-38), `repair-attendance` (:22), `reset-monthly-leaderboard` (:22), `reset-points` (:42-84, plus unlock), `settle-bill` (:30-42), `smart-family-payment` (:51-72), `snapshot-monthly-finance` (:109-124), `stars-roster` (:49), `student-audit` (:92-104), `update-enrollment-rate` (:39-48), `admin-unlock` (:63-71; F-07), `audit-eval-proxy` (:237, service role refused; section 6).

| Function | JWT | Who may call | Identity | SR | Gap |
|---|---|---|---|---|---|
| analyze-transcript | on | admin/teacher + `callerHoldsClass` (:992) | JWT | yes, reads/writes transcript rows | none found |
| analyze-video-submission | on | whoever RLS shows the row to (:461-470); family only while `uploaded`/`failed` | JWT (caller client) | yes, after the check | cost re-run (F-13) |
| assignment-calendar | on | any signed-in user, caller's RLS | JWT; role from user_metadata | no | F-13 |
| auto-mark-attendance | on | header == cron secret | shared secret, `!==` | yes | F-08, F-09 |
| calculate-payroll | on | admin; teacher sees own row only (:511-524) | JWT | yes | none found |
| calculate-tuition | on | admin; student/family for own child (`callerOwnsStudent` :93); rate limited | JWT | yes, writes the invoice | none found |
| calculate-tuition-bulk | on | admin OR any teacher | JWT | yes, read only | F-04 |
| calendar-events | on | any signed-in user, caller's RLS; role from `public.users` | JWT | no | none (users.role is pinned by the UPDATE policy) |
| cefr-defense | on | staff by role only; student for own record/test (:383, :413) | JWT | yes | F-04 |
| chat | on | any signed-in user (:1682-1688), daily cap | JWT | identity only (:1681-1682); all data on the caller's client | none found (section 3) |
| class-leaderboard | on | admin, class teacher, enrolled child, family of enrolled child (:64-174) | JWT | yes, read only | none found |
| generate-sessions | on | - | - | - | empty file (F-09) |
| generate-student-report | on | staff by role only (:63-67) | JWT | yes | F-04 |
| generate-work-feedback | on | admin/teacher + holds check (:77) | JWT | yes | none found |
| get-speech-token | on | NOBODY CHECKED | none | no | F-02 |
| image-generate | on | NOBODY CHECKED | none | no | F-02 |
| image-search | OFF | NOBODY CHECKED | none | yes, cache table | F-02, F-03 |
| mark-attendance | on | admin, or teacher of the session's class (:60-131), rate limited | JWT | yes | none found |
| mcp | on | OAuth token of the caller; tools read as the caller | JWT (OAuth) | no | section 5 |
| ocr-student-work | on | staff by role only (:90-95) | JWT | yes, storage move | F-04 |
| ocr-vocab-scan | on | staff by role only (:156-162) | JWT | yes, awards points | F-04 |
| parent-video-page | OFF | holder of a 48-hex link token (:22) | token in body | yes, read only, approved videos of one child | no expiry, no rate limit (acceptable at 192 bits; section 3) |
| pronounce-syllables | OFF | NOBODY CHECKED | none | no | F-02 |
| pronounce-viseme | OFF | NOBODY CHECKED | none | no | F-02 |
| record-practice | on | signed-in child, own record via `linked_user_id` (:147-151) | JWT (body `user_id` ignored) | yes, points with per-word budget | none found |
| recorder-retention (conductor only, not live) | on | runner token or admin (:151, service role refused) | token / JWT | yes | not live; read in section 6 |
| redeem-access-code | OFF | holder of a single-use code | code hash | yes, sets a password; refuses staff accounts | F-12 |
| refresh-student-profile | on | admin/teacher + holds check (:61) | JWT | yes | none found |
| sapling-grammar | on | NOBODY CHECKED | none | no | F-02 |
| save-word | on | signed-in child, own record (:360-364), daily cap in SQL | JWT (body `user_id` ignored) | yes | none found |
| schedule-sessions | on | runner secret (constant-time, :80-100) or admin (:177) | secret / JWT | yes | none found |
| smart-dictation | on | NOBODY CHECKED | none | no | F-02 |
| smart-dictionary | on | NOBODY CHECKED | none | no | F-02 |
| stars-sync | on | `x-stars-cron` token (constant-time) or admin (:87-96), IP limit | token / JWT | yes | none found |
| student-create-migration-account | on | signed-in child, own record only (:86-93), once | JWT | yes, creates an auth user | F-13 |
| transcribe-lesson-audio | on | admin/teacher + `callerHoldsClass` on the ROW's class; path rule (conductor code; live v4 per MASTER_PLAN:349) | JWT | yes | fix holds by reading; main's copy of the file lacks it (see note) |
| update-student-avatar | on | child/family for own record; admin for any (:87-120) | JWT | yes | F-13 |
| video-rubric | on | admin/teacher + holds check (:72) | JWT | yes | none found |
| watch-sibling-threshold | on | `x-cron-secret` or admin (:26-32) | secret / JWT | yes | fix holds; F-08 |
| word-enrichment | OFF | NOBODY CHECKED | none | yes, cache table | F-02, F-03 |

Notes
- Known fixed item confirmed: `watch-sibling-threshold` now requires the cron secret or an admin (`:26-32`); live version 4 was deployed after the fix (updated_at later than the bulk deploy).
- Known fixed item, with a caveat: `transcribe-lesson-audio` is gated in the conductor branch and MASTER_PLAN records it deployed as live v4. But `origin/main` (what a routine redeploy from main would ship) still has the UNGATED file. Until the conductor branch reaches main, a redeploy of this function from main would silently reopen it. Same for `audit-eval-proxy`, which is live but absent from main.
- `supabase/config.toml` still lists `post-payment`, which no longer exists.
- No function takes the caller's identity from the request body. `record-practice` and `save-word` say so in their headers and ignore `user_id`.

**Ranked gaps for section 1:** F-01 (role), F-02 (open spend), F-04 (no class scope), F-03 (cache planting), F-07 (unlock), then F-08 to F-13.

---

## 2. Row-level security, functions, grants and storage (live catalog, 13 Nov)

What is in good order
- All 129 tables in `public` have RLS on. None is off.
- 9 tables have RLS on and NO policy, which is right for each: `admin_auth_challenges`, `admin_passcodes`, `admin_passkeys`, `admin_unlock_sessions`, `schedule_runner`, `stars_sync_secrets`, `student_access_codes`, `vocab_cache`, `vocab_image_cache` (service role only).
- 323 policies; 110 are plain admin-only. No policy names the `anon` role. Only one policy is `USING (true)`: `payroll_periods` SELECT for any signed-in user (F-20).
- The 3 views (`session_cancel_review_queue`, `session_cancel_tuition_pending`, `v_projected_base`) are all `security_invoker=true`.
- All 144 SECURITY DEFINER functions have a pinned `search_path`.
- The tables that carry money are admin-write only: `invoices`, `payments`, `ledger_*`, `payroll_*`, `staff_pay_rates`, `expenditures`, `families`, `students`, `enrollments`, `user_roles`. Families read their own bills through `can_view_student`.
- Column guards exist where a non-admin may update a row with sensitive columns: `teachers` and `teaching_assistants` (contact, bio, photo only - pay is refused), `classes` (economy settings only), `sessions` (`session_change_guard` refuses a signed-in direct cancel/move/reclass/delete), `video_submissions` (family cannot set status or teacher note), `users` (role pinned).
- The session cancel/move functions, the enrollment functions `end_enrollment`, `change_enrollment_days`, `modify_enrollment_transfer`, the `ai_action_*` functions, `approve_video_feedback`, `stars_sync_resolve_conflict` and the class overhead readers each check admin (or class teacher) themselves.
- Confirmed fixed: `class-recordings` bucket has exactly `class_recordings_admin_all` plus four `class_recordings_staff_*` policies, each through `class_recordings_staff_can(name)`, which requires the teacher role AND `is_teacher_of_class` on the class id in the path. The old any-teacher policy is gone.

### F-14 CRITICAL - Every child's homework file can be read by any signed-in account, including one made a minute ago on the sign-up form
- Who: any account with the `student`, `family` or `teacher` role. A brand-new self-registered account gets `student` by default (F-01), so: anyone on the internet.
- Proof (live storage policies on bucket `homework`, 99 objects, private, no size or type limit):
  - `Students can view all homework files`: `bucket_id = 'homework' AND has_role(auth.uid(),'student')`
  - `Family can view all homework files`: `bucket_id = 'homework' AND has_role(auth.uid(),'family')`
  - `Teachers can view all homework files`: `... has_role(auth.uid(),'teacher')`; also `Teachers view all homework` (any `teachers` row).
  - Source: `supabase/migrations/20251026083002_c5c670d8-7d35-47c8-9d78-05fac786594b.sql`. Storage SELECT policies are OR-ed, so these three make the careful per-child policies beside them (`Students read own homework submissions`, `Families read student homework submissions`, ...) meaningless. SELECT also allows listing the bucket, so file names (which carry student ids) need not be guessed.
- Impact: one family can download every other child's submitted homework (photos of handwriting, sometimes of the child). With open sign-up, so can a stranger.
- Smallest fix: drop those three blanket policies (and `Teachers view all homework`); keep the scoped ones; give teachers a policy scoped by `is_teacher_of_class` on the homework's class. Check the teacher grading screen still opens files afterwards.
- Permission change needing the owner: YES.

### F-15 HIGH - Any signed-in account can "pause" any child and overwrite the register to Excused
- Who: any signed-in account (parent, child, self-registered).
- Proof (live function body): `public.pause_enrollment(p_student_id, p_class_id, p_from_date, p_to_date, p_memo)` is SECURITY DEFINER, EXECUTE granted to `authenticated` (`supabase/migrations/20260722020830_e93174db-8549-43fa-a4a3-e95d5ee4786d.sql:1`, first granted in `20251023112730_3625a376-5d07-41a5-88fd-a6af65c32ddc.sql:326`), and has NO role check - its siblings `end_enrollment`, `change_enrollment_days`, `modify_enrollment_transfer` each start with `IF NOT has_role(v_actor,'admin') THEN RAISE`. It inserts a `pause_windows` row and then, for every non-cancelled lesson of that class in the date range, inserts attendance `Excused` `ON CONFLICT ... DO UPDATE SET status = 'Excused'` - overwriting marks a teacher made.
- Impact: money and records. Excused lessons are not charged, so a parent can call it for their own child (they know the student id and class id from their own pages) over any past or future range and the next tuition calculation lowers the bill; already-confirmed bills go to "needs review". Anyone who has another child's ids (a classmate's are readable, F-16) can wipe that child's attendance marks. It is written to `audit_log`, so misuse would be traceable.
- Smallest fix: add the same admin check as its siblings at the top of the function.
- Permission change needing the owner: YES (a database function rule), though it only restores what the screen already assumes.

### F-16 HIGH - A family can read the full record of every classmate, not just the name on the leaderboard
- Who: any child or family account, about children enrolled in the same class.
- Proof (live): `students` has a SELECT policy `can_view_classmate(id, auth.uid())` (`20260712024213_b12a82c4-5e2a-4b43-ae19-d3bfa844e6ce.sql`), and RLS is per row, not per column. The row holds `full_name, phone, email, date_of_birth, notes, family_id, linked_user_id, cash_on_hand, status_message, sibling_discount_from, ...`. The same class-wide read exists on `attendance` (status and `notes` for every classmate, policy with `viewer_enroll`), `skill_assessments` (`score`, `teacher_comment`), `point_transactions` (`notes`) and `student_points`.
- Impact: a parent who opens the browser tools (or uses the public key with their own session) reads other children's date of birth, phone, email, the school's private notes about them, their attendance and the teacher's comments. The screens only show a name, an avatar and points.
- Smallest fix: remove the classmate SELECT on `students` and serve the leaderboard / class wall from a SECURITY DEFINER function or view that returns only `id, display name, avatar_url` (as `get_class_video_wall` already does); restrict classmates' `attendance` and `skill_assessments` to own child; keep `student_points` class-wide if the board needs it.
- Permission change needing the owner: YES. Needs care: `class-leaderboard` (service role) is unaffected, but any page that reads classmates directly must move to the function first.

### F-17 MEDIUM - Staff pay rates and contact details are readable by every signed-in account
- Proof (live):
  - `teachers` SELECT `can_view_teacher(id, auth.uid())`, and that function (`20261110140000_scope_staff_quest_and_homework_reads.sql`) returns true for ANY signed-in user when the teacher is the default teacher of an active class. The row includes `hourly_rate_vnd`, `per_session_rate_vnd`, `pay_rate_type`, `phone`, `email`.
  - `teacher_rate_on(p_teacher_id, p_date)` and `assistant_rate_on(...)` are SECURITY DEFINER, EXECUTE to `authenticated`, no check (`20261021090000_staff_pay_rate_history.sql`): any signed-in user gets any staff member's dated pay rate by id.
  - `teaching_assistants` SELECT `is_staff_member(auth.uid())`: every teacher and TA sees every TA's row, pay included.
- Smallest fix: revoke EXECUTE on the two `*_rate_on` functions from `authenticated` (calculate-payroll uses the service role); serve families a name/avatar/bio view of teachers instead of the table; scope the TA row to self + admin.
- Permission change needing the owner: YES.

### F-18 MEDIUM - "Any teacher" storage rules: children's work photos, lesson resources, exam reports
- Proof (live storage policies): `staff_manage_student_work_files` is ALL on bucket `student-work` (217 photos of children's work) for `has_role(...,'teacher')`: read, overwrite, delete, list, for every class. Same shape: `staff_manage_lesson_resource_files` (ALL, `lesson-resources`), `Teachers and admins upload exam-reports files` (INSERT), `Authenticated read resources own folder` (SELECT for any teacher), and on `homework`: `Teachers and admins can update homework files` / `Teachers can update homework files` (any teacher may overwrite any homework file, including a child's submission).
- With F-01 this is not limited to real staff.
- Smallest fix: scope each by the class id in the path with `is_teacher_of_class`, as `class_recordings_staff_can` now does.
- Permission change needing the owner: YES.

### F-19 LOW - Rows and files a child's account can write that it should not
- `student_vocabulary_entries` INSERT is `user_id = auth.uid()` with any `student_id`; the row is then shown to that other child (`is_linked_student`) and their teacher. A signed-in user can put a word, definition and `image_url` into another child's word list.
- `homework` bucket INSERT `Students can upload homework submissions`: any student, anywhere under `submissions/`, and the bucket has no size or type limit (nor have `exam-reports`, `submissions`, `resources`).
- `daily_login_rewards` (INSERT with any `xp_awarded`), `student_login_streaks` (UPDATE own streak), `early_submission_rewards` (INSERT own row with any `points_awarded`): a child can inflate their own game counters. None of these feeds `point_transactions` by trigger, so leaderboard points are not affected.

### F-20 LOW - Hardening
- `anon` holds every table privilege (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) on almost every table in `public`. RLS stops it today (no policy is for `anon`), but RLS is then the only wall; root `AGENTS.md` says 20260712023825 revoked these defaults - on this project they are back. Revoke all on `public` tables from `anon`.
- `video_staff_for_class` returns TRUE when `auth.uid()` is null (meant for the service role). `anon` cannot execute it today; if EXECUTE were ever granted to `anon`, or a policy `TO public` used it, anonymous callers would be "staff" on every video table. Replace the null test with `auth.role() = 'service_role'`.
- Helper functions that take a user id as a parameter (`has_role`, `get_user_role`, `can_view_student`, `can_view_family`, `is_teacher_of_class`, ...) are callable over RPC by any signed-in user for ANY user id: a way to learn who is an admin or which account belongs to which child. `is_enrolled_in_class`, `is_linked_student` are callable by `anon` too.
- `refresh_invoice_carry(student)` and `recompute_student_points(...)` (the latter also by `anon`) are definer and unchecked. Both only recompute from stored rows, so the effect is load, not wrong figures.
- `payroll_periods` is readable by every signed-in user (`USING (true)`): which months are closed, by which admin id, with the note and reopen reason.
- `student-avatars`, `teacher-avatars`, `announcements`, `qr-codes` are PUBLIC buckets: a child's avatar is reachable by anyone who has the URL, without signing in. Not listable. Acceptable only if avatars are never real photographs.
- The policy `Students can manage their own avatar` contains `storage.foldername(f.name)` (the family's name, not the file's) - a dead branch.
- 203 non-definer functions have no pinned `search_path` (advisor-level).

---

## 3. Children's privacy rules from AGENTS.md - do they hold in the database?

| Rule | Holds? | Evidence |
|---|---|---|
| No family SELECT on `video_analyses` | YES | one policy only: ALL for `video_staff_for_class` of the submission's class |
| Families read video reports only through `get_video_homework_for_student` | YES, with a note | the function checks `can_view_student` or class staff and returns the report only when the submission is `approved` (`20261109090000_video_homework.sql:526-537`). Note: besides `final_*` it returns `strengths`, `focus_points` and `criteria_scores` - not `final_`-named columns. `get_video_progress` likewise returns `criteria_scores` and `final_gaps`. Confirm `approve_video_feedback` rewrites those with the teacher's version; if they are the AI's draft, a draft reaches families after approval. |
| Classmates see videos, never scores | YES | `get_class_video_wall` returns first name, title, video and poster path, hearts - no score; storage `can_view_homework_video` gives a classmate only `video_path` and `frame_paths` of an approved, shared video, never `audio_path`. `video_reactions` is staff-read only. |
| Nothing reaches a family before a teacher approves | YES | `video_submissions_guard` pins status for non-staff; the public `parent-video-page` skips rows without `approved_at`. Note: that page shows score, grade and feedback to anyone holding the link, links never expire (only revoke), and a class teacher as well as the family can read the token (`can_manage_video_parent_link`). |
| Stars Sync names never persisted | YES | `stars_student_map` holds ids only; the stored feed record (`stars_sync_events.raw`) has keys `class_ref, event_id, kind, lesson_date, occurred_at, payload, seq, student_ref` and payload keys `body, category, due_date, feedback, grade, homework_ref, points, reason, retracts_event_id, status, title` - no name field (keys read, not values). Browser side checked in section 4. |
| Lesson audio / transcripts never reachable by a family | YES for audio and transcript text | `class_transcripts`, `class_speaker_aliases`, `transcript_point_suggestions`: `is_teacher_of_class` only; bucket `class-recordings`: staff of the class only. By design a child's linked login can read its own row of `transcript_speaker_metrics` (counts, `highlights`, `contribution`, teacher feedback) - used by `src/pages/StudentLessonDetail.tsx:47-53`. If `highlights` quotes other children's words, that is a leak; I did not read rows to check. |
| The assistant has no write path and cannot call apply/undo | YES | `chat/index.ts` and its `_lib` contain no insert/update/upsert/delete and one rpc, `ai_action_preview` (`:1544`), which is STABLE in the live catalog. The service-role client is used only inside `authenticateUser` (`:1681-1682`). `ai_action_apply` / `ai_action_undo` are named only in a comment; they are called from `src/lib/aiActions.ts` by the admin's click and each begins with an admin check. |

Not a listed rule, but the same subject - see F-14 (homework files), F-16 (classmate records), F-01/F-06 (learning profiles).
