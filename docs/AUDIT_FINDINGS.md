# A5 security audit - findings

**Where I am / next step:** 13 Nov 2026. Section 1 (edge functions) written. Section 2 (RLS, definer functions, storage) in progress - first results already recorded as F-01, F-05, F-06. Next: finish section 2, then 3-8, then top five and owner summary.

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
