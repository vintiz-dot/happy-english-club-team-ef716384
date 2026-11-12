# A5 security audit - findings

**Where I am / next step:** 13 Nov 2026. COMPLETE. All eight sections, the ranked list, the top five, what could not be checked and the owner's page are written (F-01 to F-27). Next step belongs to the owner: approve the permission changes. Nothing was changed, pushed or deployed.

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

---

## 4. The browser bundle and the repository

In good order
- No service key or server secret in `src/`, `index.html` or `public/`. The bundle reads only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_BUILD_HASH`, `VITE_VISEME_HEAD_URL`. `service_role` does not occur in `src/`.
- `.env` IS tracked in git, but holds only public values: the project URL and the browser key, whose role claim is `anon` (decoded the claim only). The same anon key is written into `supabase/migrations/20261110160000_schedule_runner_and_nightly_rebuild.sql:45-57` for the nightly job - public, so acceptable.
- Every `dangerouslySetInnerHTML` (17 places: homework bodies, submissions, announcements, exam reports, journal) goes through DOMPurify (`src/lib/sanitize.ts`, `src/lib/richText.ts`). `HomeworkPdfDownload.tsx:169-178` escapes the title and cleans the body before `innerHTML`. The assistant's chat text is not rendered as HTML.
- One `postMessage` listener (`src/integrations/supabase/previewAuthStorage.ts:86-95`): only on Lovable preview hosts, only when framed, origin checked against an allow-list, and it posts to a named origin. Not active on the production domain.
- Open redirect: `src/lib/oauth-return-path.ts` accepts only a same-origin path (rejects `//`, backslash, control characters). `OAuthConsent.tsx` redirects only to what Supabase Auth returns.
- Stars Sync in the browser: the `localStorage` keys in `components/admin/stars/` hold view settings and sets of ids (`hec.stars.link.rejected.v1`, ...), not names.

### F-21 HIGH - Any signed-in account can plant "approved work", a "published report", a CEFR level or error-log entries on any child's pages, including a link of its choosing
- Who: any signed-in account that knows a child's id (classmates' ids are readable, F-16; a self-made teacher gets them all, F-01).
- Proof (live policies): four tables let the CREATOR do anything with a row, with no role or class test and no trigger:
  - `student_work` ALL: `uploaded_by = auth.uid() OR (teacher of class)`. A row with `uploaded_by = me`, any `student_id`, `status = 'approved'`, `external_url`, `teacher_notes`, `ai_feedback` passes; the child then sees it (`student_work` SELECT: approved and own) in `src/components/student/MyWorkGallery.tsx:78-83` and `src/pages/StudentLessonDetail.tsx:311-312`, where `external_url` goes straight into `<a href>`.
  - `student_reports` ALL: `generated_by = auth.uid() OR ...` - a `published` report for any child, which the child reads.
  - `cefr_assessments` ALL: `created_by = auth.uid() OR ...` - families read their child's CEFR points.
  - `student_error_log` ALL: `created_by = auth.uid() OR ...`.
  - Also `resources` INSERT `uploaded_by = auth.uid()` for anyone (only staff read it unless a teacher-role account also adds a `resource_class_access` row, which any "teacher" may).
- The link: nothing checks the scheme of `external_url` (`MyWorkGallery`, `StudentLessonDetail`, `ResourceCard.tsx:31`, `TeacherResources.tsx:110`, `TeacherBooks.tsx:536`). React 18 does not block a `javascript:` href. Whether a given browser runs it from a `target="_blank"` link I did not test (no exploit run); treat it as a script-injection path into a child's or parent's session until a scheme check exists.
- Impact: forged school records shown to a family as if from the teacher; a possible way into another family's session.
- Smallest fix: add `AND (has_role(auth.uid(),'teacher') AND can_view_student_in_class(student_id, auth.uid()) OR has_role(auth.uid(),'admin'))` to the creator branch of those four policies (and staff-only on `resources` INSERT); in the UI allow only `http:`/`https:` links.
- Permission change needing the owner: YES for the policies; the UI check is code.

### F-22 MEDIUM - A Google API key is in the git history
- `git log -G` finds an `AIza...`-pattern key assigned to `GOOGLE_API_KEY` in `supabase/functions/image-search/index.ts`, added in commit fb545fd (11 May 2026) and removed in dbfa621 (12 May 2026). The value is still in history for anyone with the repository. I did not print or copy it. No other key pattern (OpenAI `sk-`, private key block, `sb_secret_`, service-role JWT) was found in tracked files or in history of `.env*`, `src`, `index.html`, `public`.
- Fix: rotate that key in Google Cloud if it has not been rotated since May, and restrict it by API and referrer. Not a permission change.

### F-23 LOW - Smaller browser-side items
- `sanitizeHtml` (`src/lib/sanitize.ts:24-31`) allows any `style` and `class`; `cleanRichHtml` filters both. A child's submission text is shown to the teacher through `sanitizeHtml` (`HomeworkGrading.tsx:440`, `HomeworkGradingList.tsx:387`), so a child can draw over the grading screen with CSS (no script). Use the filtered cleaner there.
- No Content-Security-Policy or frame-ancestors header: there is no `public/_headers`, and a HEAD of the Lovable host shows only HSTS, nosniff and referrer-policy. A CSP would blunt F-21's link and any future sanitiser miss; `frame-ancestors` stops the app being framed by another site.
- Upload limits are enforced in the browser only for homework (5 MB, `HomeworkSubmission.tsx:110`); the `homework`, `exam-reports`, `submissions`, `resources` buckets have no size or type limit of their own (F-19).
- `selected_student_id` in `localStorage` (`src/contexts/StudentProfileContext.tsx:21-28`) is only a filter; the server decides (section 5).

---

## 5. Auth and sessions

| Topic | Result |
|---|---|
| Sign-up | OPEN on live, with a role picker - F-01. Email confirmation is required (0 of 76 accounts unconfirmed). |
| Shared family login and the child selector | The chosen child is a browser value. Forging it gains nothing beyond what RLS gives the account: `can_view_student` (own or family's child) on bills, payments, attendance, video; `callerOwnsStudent` in `calculate-tuition` (`:93`); `studentFor` / `classFor` in `chat/index.ts:337-365` hold parents, children and teachers to their own; `cefr-defense` uses the JWT's linked student. The exception is what RLS itself over-shares: classmates (F-16). |
| Admin unlock gate | Passcode: PBKDF2-SHA256 210k, constant-time compare, 5 tries then lock, tokens hashed, 12 h. Weakness: F-07 (passkey enrolment needs no prior unlock; only `reset-points` enforces the gate). |
| Demo access | Demo is OFF (`demo_access.enabled = false`). `student@demo.com` exists with the student role and is enrolled in nothing; no real child is in "Demo Class". `manage-demo-student` is admin-only and refuses privileged demo accounts. BUT: a demo student is an ordinary `student` account, so while F-14 is open, switching the demo on would let a demo visitor download every real child's homework file - against the rule that demo surfaces never read production data. Fix F-14 before the demo is ever enabled. Residue (F-25): `teacher@demo.com` and `family@demo.com` still exist - banned, no roles, but each still has a `teachers` / `families` row. Delete them. |
| Password reset | Email reset is refused in the browser for school-issued handles (`Auth.tsx:150-163`) - a convenience, not a control: Supabase will still send a reset mail to whoever owns that domain if asked directly. That risk is inherent in using other people's domains (`hanh@hanh.com`) as login names; prefer a domain the school owns. |
| Front-desk codes | 50-bit single-use codes, hashed, expiring, staff accounts refused (`redeem-access-code`, `manage-student-access`). Notes in F-12. |
| Migration ("claim") account | A child creates one extra login for their own record, once (`student-create-migration-account`). Any email may be chosen (F-13). |
| OAuth consent page | Shows the client name, redirect and scopes; approval goes through Supabase Auth. F-24 (LOW): the page says the app gets "read-only tools", but what is issued is the user's own access token (audience `authenticated`), which works against the whole API with that user's rights, not only the three tools. An admin approving a client gives it admin reach. Say so on the page, and do not approve clients as an admin. |
| MCP (`src/lib/mcp/`) | Holds: OAuth issuer check, three read-only tools (`whoami`, `list_classes`, `list_upcoming_lessons`), each builds a client from the caller's token and the public key (`supabase.ts`), so RLS applies. No service role anywhere in `src/lib/mcp/` or the generated `supabase/functions/mcp/index.ts`. Dependency advisories for the MCP packages: section 8. |
| Admin bootstrap | Unauthenticated by design but refuses unless there are zero admins AND the secret `ALLOW_ADMIN_BOOTSTRAP` is `true` (`manage-admin-users/index.ts:63-86`). I could not read the secret; confirm it is unset. `checkAdmins` tells anyone whether an admin exists - harmless. |

Accounts the owner should look at (counts only, I did not open them): 2 teacher-role accounts with no teacher or TA record and no admin role; 16 student/family-role accounts linked to no child or family. With sign-up open, some of these may be people who registered themselves.

---

## 6. Abuse and cost

- Open spend: F-02 (nine functions; four need no key). This is the main item.
- Signed-in spend without a durable limit: `chat` (daily cap kept in memory, `chat/index.ts:108-118`; up to 5 model rounds per message), `analyze-video-submission` (re-runs, F-13), `cefr-defense`, `generate-student-report`, `ocr-*`, `analyze-transcript`, `transcribe-lesson-audio`, `generate-work-feedback`, `refresh-student-profile`, `video-rubric`, `explain-family-tuition` - staff or admin only, no per-user cap. With F-01 "staff" is self-service.
- Messages: no function sends email or SMS on a caller's request. Supabase Auth mail (sign-up confirmation, reset) is open to anyone and limited only by Supabase's own rate limits; closing sign-up (F-01) removes most of it.
- `calculate-tuition` is rate limited (30/min) and ownership-checked; a parent can only recalc their own child.
- `stars-sync` every 5 minutes and `rebuild-upcoming-sessions` nightly are the only cron jobs; both present a database-held token compared in constant time.
- `audit-eval-proxy` (temporary): CONFIRMED admin-only. `requireRole(..., ["admin"], { allowServiceRole: false })` at `audit-eval-proxy/index.ts:237`; audio is read as the caller from bucket `audit-eval`, whose four policies are admin-only (insert also pins the file-name pattern); minutes are reserved in SQL before the vendor call (`audit_eval_reserve` -> trigger `audit_eval_runs_guard`), caps 400 calls / 600 min per run, 2000 min global. State on 13 Nov: switch `enabled = true`, 283 runs, about USD 9.24 estimated, 1,230 of 2,000 minutes used; 37 objects in `audit-eval`, 33 in `audit-clips`. Until teardown: set `enabled = false` when no batch is running. At teardown: delete the function, empty both buckets, and note that `audit_clip_enrol`, `audit_eval_reserve`, `audit_eval_finish` are executable by `anon` (each checks admin inside, so harmless) - revoke with the rest. The function is not on `main` (section 1 note).
- `recorder-retention` (conductor branch only, not live): runner token or a named admin, service key alone refused (`:140-155`). Nothing to report.

---

## 7. Supabase security advisors (13 Nov)

| Advisor | Level | Count | Triage |
|---|---|---|---|
| RLS enabled, no policy | info | 9 | Intended - server-only tables (listed in section 2). No action. |
| Function search_path mutable | warn | 15 | All are non-definer helpers (`stars_sync__*`, `ai_*` formatters, `homework_video_path_ids`, `language_support_touch`, `is_payroll_expenditure`, `audit_*`). Low; pin `search_path` when next touched. `homework_video_path_ids` matters most: storage policies depend on it. |
| Extension in public | warn | 2 | `btree_gist`, `pg_net`. Low. `pg_net` in `public` means its functions sit beside the app's; move to `extensions` when convenient. |
| SECURITY DEFINER function executable by anon | warn | 16 | Seven are trigger functions (not callable usefully). Real ones: `recompute_student_points`, `is_enrolled_in_class`, `is_linked_student`, three `language_support_*`, three `audit_*`. Revoke from `anon` (F-20). |
| SECURITY DEFINER function executable by authenticated | warn | 79 | Mostly intended RPCs and policy helpers. The ones that matter are F-15 (`pause_enrollment`), F-17 (`teacher_rate_on`, `assistant_rate_on`) and the id-oracle helpers in F-20. |
| Leaked password protection disabled | warn | 1 | Turn on in Auth settings (checks new passwords against known breaches). Owner setting. F-27 LOW. |

Remediation pages: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy , ...lint=0011_function_search_path_mutable , ...lint=0014_extension_in_public , ...lint=0028_anon_security_definer_function_executable , ...lint=0029_authenticated_security_definer_function_executable , https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

The advisors do not flag F-01, F-14, F-15, F-16 or F-21: they check shape, not meaning.

---

## 8. Dependencies - `npm audit --omit=dev` (13 Nov)

14 advisories: 1 critical, 5 high, 6 moderate, 2 low. (F-26)

| Package (installed) | Severity | What | Does it bite here? |
|---|---|---|---|
| dompurify 3.4.16 | critical | SAFE_FOR_TEMPLATES bypass; IN_PLACE hook leaves handlers armed | It is the app's only XSS barrier, so upgrade first. The two modes named are not used in `src/` (grep: none), so present exposure is low. Non-breaking fix available. |
| vite 5.4.21, esbuild | high / moderate | dev-server path traversal and request forgery | Dev machine only, not the deployed site. Fix is a major upgrade. |
| zod 3.25.76 | high | memory exhaustion on oversized collections | Browser-side use; edge functions import their own zod from a URL. Low here. Major upgrade. |
| @lovable.dev/mcp-js 3.3.0, @modelcontextprotocol/sdk, @modelcontextprotocol/server | high | OAuth client could send credentials to a server-chosen authorization server; shared transport could deliver one client's messages to another; memory exhaustion | The `mcp` edge function is live and bundles these. The "one client's messages to another" item is the one to take seriously for a server that answers as different users. Upgrade when Lovable publishes a fixed build (the function is generated; AGENTS.md says not to hand-edit). |
| @hono/node-server | moderate | static path double-decode | Transitive of the MCP kit; not used for static files here. |
| glob, minimatch, postcss-selector-parser, sucrase | moderate | DoS in build tooling | Build time only. |
| quill 2.0.3 / react-quill-new 3.8.3 | low | XSS through HTML export | The editors' output is re-sanitised on display. Low. |

`npm audit fix` (non-major) covers dompurify, the MCP SDKs, hono, glob, minimatch, postcss-selector-parser, sucrase. Run `npm install` afterwards so both lockfiles agree (root AGENTS.md).

---

## Ranked list

| # | Severity | Finding | Owner approval needed |
|---|---|---|---|
| F-01 | CRITICAL | Public sign-up grants the role the visitor picks (teacher, family) | yes |
| F-14 | CRITICAL | `homework` bucket readable by every student/family/teacher account | yes |
| F-15 | HIGH | `pause_enrollment` has no role check: any account can excuse any child's lessons | yes |
| F-16 | HIGH | Families can read classmates' full records (DOB, phone, notes, attendance, comments) | yes |
| F-21 | HIGH | Creator-owned policies: forged work, reports, CEFR, error log on any child; unchecked links | yes |
| F-02 | HIGH | Nine AI/speech functions callable without sign-in, no limit | yes (4 gateway flips) |
| F-04 | MEDIUM | Five staff functions with no class scope (bulk tuition, cefr-defense, ocr x2, report) | yes |
| F-06 | MEDIUM | Learning profiles and finance snapshots readable by any teacher | yes |
| F-17 | MEDIUM | Staff pay and contact details readable by any signed-in account | yes |
| F-18 | MEDIUM | "Any teacher" storage rules on children's work photos and other buckets | yes |
| F-05 | MEDIUM | A child can set their own homework grade and teacher feedback | yes |
| F-03 | MEDIUM | Anonymous caller can plant dictionary content children read | no |
| F-07 | MEDIUM | Admin unlock gate passable via passkey enrolment; enforced on one function | partly |
| F-22 | MEDIUM | Google API key in git history | no |
| F-26 | LOW-MEDIUM | 14 dependency advisories (dompurify, MCP kit first) | no |
| F-08..F-13, F-19, F-20, F-23, F-24, F-25, F-27 | LOW | timing compares, dead deployments, weak temp passwords, `.single()` role checks, in-memory rate limits, small items, child-writable counters, hardening, CSS in sanitiser, consent wording, demo residue, leaked-password check off | mixed |

Counts: 2 critical, 4 high, 8 medium, 13 low (27 findings).

## The top five to fix first

1. **Close the front door (F-01).** Make `handle_new_user` always insert `student`, remove the role picker, and switch public sign-up off in Supabase Auth unless the school truly uses it. Then look at the 2 unexplained teacher-role accounts and the 16 unlinked student/family accounts. One small migration and one dashboard switch remove the stranger from every other finding.
2. **Homework files (F-14).** Drop the three "can view all homework files" storage policies and the any-teacher one. One migration.
3. **`pause_enrollment` (F-15).** Add the admin check its sibling functions have. One line in one function.
4. **What families can read and write about other children (F-16, F-21).** Replace the classmate row read with a name-and-avatar function; add role and class tests to the four creator-owned policies. This one needs the most care because screens depend on it; do it with two test families and the pgtest harness.
5. **Open spend (F-02, F-03).** Require a signed-in user in the nine vendor functions and put a durable per-user cap behind them.

Next after those: F-04, F-06, F-17, F-18 (teacher scope), F-05, then the dependency upgrade.

## What I could NOT check, and why

- **Nothing was exploited.** By the rules of this audit every finding is proved by reading code and the live catalog, not by doing it. Whoever fixes F-14, F-15, F-16 and F-21 should first confirm each with two throw-away test accounts on a branch database, and keep the test as the regression.
- **Supabase Auth dashboard settings** other than the three public flags: password rules, OTP/link expiry, redirect allow-list, whether OAuth dynamic client registration is open, auth hooks, session lifetime. Not reachable by SQL or the public endpoint.
- **Edge function secrets**: whether `ALLOW_ADMIN_BOOTSTRAP` is unset, what `CRON_SECRET_TOKEN` is (F-09). I must not read secrets.
- **Whether live code equals the repo for all 70 functions.** I read live source for `generate-sessions` only and relied on version numbers, dates and MASTER_PLAN for the rest. `transcribe-lesson-audio` and `audit-eval-proxy` are known to be live from the conductor branch, not main.
- **Row contents.** Not read, by rule. So: whether `transcript_speaker_metrics.highlights` quotes other children; whether avatars are real photographs; whether the unexplained accounts are legitimate; whether the video report's `strengths` / `criteria_scores` are the teacher's final text.
- **The cron jobs' command text** (`cron.job.command`): names and schedules only, because the commands carry tokens.
- **Browser behaviour for a `javascript:` link** in F-21: not run.
- **The production domain's headers.** `user.hanoienglish.vip` answered 301 to a HEAD and I did not follow it; the Lovable host has no CSP. Also not checked: whether the `*.lovable.app` copy is an old build pointing at the same database.
- **Who can see the git repository** (decides how urgent F-22 is), and function / database logs.
- **The recorder migration (20261112100000)** is not applied; its policies were not audited here beyond what the C1 critics did.

## One page for the owner, in plain words

The app's foundations are sound. Every table has its lock switched on, money tables can only be changed by an admin, the payment and payroll functions all check for an admin, the AI assistant cannot change anything, the lesson-audio fix from yesterday holds, and no secret key is in the web page. The problems are a handful of doors that were left wider than the screens suggest.

**The two that matter most**

1. **Anyone can sign up and call themselves a teacher.** The login page has a "Join the club" form with a "Teacher" choice, and the database believes it. A stranger who does this can read every child's learning profile and, from there, families' bills. *Fix: one small database change and switching public sign-up off.* Until then, please look in Supabase > Authentication for accounts you do not recognise - there are two "teacher" accounts with no teacher record behind them.
2. **Every homework file can be opened by every account.** An old rule says "students can view all homework files". It was meant for convenience; it means one family can download another child's homework, and so can anyone who signs up. *Fix: remove three old rules.*

**Four more that deserve this week**

3. A database function for "pausing" a student has no check on who is calling. Any parent could mark their own child excused for a month - which lowers the bill - or change another child's attendance. It is logged, and one line fixes it.
4. To draw the class leaderboard, the app lets families read classmates' whole records - birthday, phone, the school's private notes, attendance, teacher comments - when it only needs a name and a picture.
5. Any account can add "approved work", a "report" or an English level to any child's page, as if a teacher had.
6. Nine AI and speech features (dictionary, pronunciation, picture generation) can be used by anyone on the internet without signing in. No child's data leaks, but somebody could run up the OpenAI and Azure bills.

**Then:** teachers can currently see more than their own classes in a few places (all children's profiles, work photos, bulk tuition figures); every signed-in person can read teachers' pay rates; a child can type in their own homework grade; a Google key from May is still in the code history and should be replaced; and some software libraries need updating.

**What I need from you:** almost every fix changes who is allowed to do what, so each needs your yes. I recommend approving 1, 2 and 3 today - they are small, and they do not change anything a real family or teacher sees. 4 and 5 need testing with two pretend families before they go live. Nothing has been changed by this audit.

**The temporary vendor-test tool** (`audit-eval-proxy`) is admin-only as intended. It is still switched on; it has used about 9 US dollars and 1,230 of its 2,000 minutes. Switch it off between batches and remove it, with its two audio folders, when the comparison is finished.
