# S1 phase 2 - F-16, F-21, F-02 release preparation

**Where I am / next step:** COMPLETE (13 Nov 2026). Nothing was pushed, deployed or applied. Next step is the conductor's: section 3, "Apply-and-deploy sheet", from step 1.

Branches (local only):

| Branch | Tip | What |
|---|---|---|
| `s1-phase2` | see `git log` | this file; the reviewed `20261113150000` and its tests; the same browser change as the release branch |
| `release/s1-browser-2` | `f5987804` | the one browser release, cut from `origin/main` `c502312e` |

**`origin/main` moved while this was prepared**: `e22c4226` -> `c502312e` ("Teacher resources: upload several files or a whole folder at once", one file, `src/components/resources/ResourceUploadDialog.tsx`). The release branch is cut from `c502312e`. That commit still saves resources through `useResources` (`uploaded_by` = the caller, `external_url` from the form), so it fits the F-21 policies. Fetch again before pushing; if main has moved again, rebase the three release commits (they touch none of main's recent files) and re-run the checks.

Live was read read-only (catalog, md5, counts). No row about a person, no secret.

---

## 1. Review of `supabase/migrations/20261113150000_class_skill_summary_without_names.sql`

**Verdict: APPLY WITH CHANGES - made on `s1-phase2` (commit `db9e1500`), with tests. Apply the version on `s1-phase2`, blob `5fc34c5d5c298a433668ba6b29b6b966b43e9629`, not the one on the conductor branch.**

### What was wrong with it as written

Line numbers are those of the file as it was at `1c736fff`.

1. **The threshold was per class, not per skill** (`:78`, `:86` - `size.n` counts children with ANY assessment in the range, and the test is `size.n >= 3`). A skill that one child was assessed in came back as `best = total`, `students = 1`: that child's score. The suite itself expected it: `classmate-rows.test.mjs:615-616` at `1c736fff` asserts `["reading", 5, 1, 3]` for a family. On live this is not rare: since August, of 48 class-month-skill cells, 5 hold one child and 6 hold two.
2. **The caller's own child counted towards the three.** In a class of exactly three that includes their child, a parent got `top = [a, b, c]` and the sum; taking their own child's figure away leaves the other two children's totals exactly (which of the two is which is the only thing not given).
3. **Free date ranges** (`:74-75`). `p_from` / `p_to` were anything the caller liked. Two overlapping ranges that both pass the threshold subtract to one lesson: the sum for that day, and the change in `students` says how many children it belongs to. A lesson in which one child was assessed in a skill is that child's score.

### What the file does now (same signature, same result columns)

- A family's row for a skill needs **at least three children who are not in the caller's own family** with a total in that skill in the range (`HAVING who.staff OR count(*) FILTER (WHERE NOT kids.own) >= 3`; `own` = `is_family_student(child, auth.uid())`, the function `20261113130000` adds, so a brother or sister in the same class does not count either).
- A family may ask only for **all time (both dates NULL) or exactly one calendar month** - the two ranges the panels send (`RadarChartTab` none; `PerformanceHeatmapTab` `monthStartStr` / `monthEndStr`). Anything else returns no rows.
- Staff of the class and admins: held to neither, as before.

### Is three enough? (the threshold question)

Recommended default, and what is built: **three OTHER children per skill**, not three in the class and not a higher number.

- Three counted the way the file had it was not enough (points 1 and 2 above).
- Counted from the caller's side it holds: every figure a family receives is over at least three children it cannot tell apart, and nothing joins one skill's figures to another's.
- Five would be the textbook number, but the classes are small: 8 classes, 5 to 10 children enrolled now. Live, class-month-skill cells since August (48): 1-2 children 11, exactly 3: 4, exactly 4: 7, 5 or more: 26. With "three others" a family sees class figures for the 26, for most of the 7, and not for the rest; with five it would be the 26 only and half the monthly skills would be blank. All time (the Attributes tab): 44 class-skill cells, 33 with five or more, 8 with exactly three, 3 with one or two.
- Cost the owner should know: **in the two smallest classes (3 and 4 children ever assessed) families will see no class best / average on the all-time chart**, and in any class no figure for a skill few children were assessed in that month. The child's own points are always shown.

### What can still be learned (accepted, written into the file's header)

- **The top three are exact totals.** They belong to unnamed children out of at least three the caller cannot tell apart. If one child is far ahead on the named class board (points by name stay public to the class by the owner's choice: `student_points` "Students can view class leaderboard"), a parent can guess that the top skill totals are that child's. That is a guess from two things the school chose to show, not a read of a record.
- **Asking every day.** The current month's sums grow as lessons are marked; someone who polls sees each day's addition per skill (not whose). A classmate joining shows as `students` + 1 with their first score added to the sum. Only delaying or rounding the figures would stop this; not recommended for a class board.
- A child leaving changes nothing: their past assessments stay in the class's history and in the sums.

### The rest of the checklist

| Question | Answer, with evidence |
|---|---|
| Does it close the finding - any other path to a classmate's per-skill totals by name | Yes. Live catalog, 13 Nov: the only function in `public` whose body mentions `skill_assessments` is `approve_video_feedback` (writes; staff-checked). No view or materialized view reads it. Policies on `skill_assessments`: admin (ALL), `is_teacher_of_class` (ALL) and "Students can view class skill assessments", which `20261113130000:120-125` replaces with the family-only one. No edge function reads the table (`git grep skill_assessments -- supabase/functions`: none). `student_points` stays class-wide by design: month totals, not per skill. |
| SECURITY DEFINER, pinned search_path | `:56-59` `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`; every object schema-qualified. |
| Its own caller check | `who` CTE: `auth.uid()` not null AND (admin OR `is_teacher_of_class(uid, p_class)` OR `is_student_enrolled_in_class(uid, p_class)`). The last is production's function (md5 `e8d7b3599d6e55b407daa052b7da6c75`, read today): the caller's child, second login, family primary login or sibling-linked login, with an enrollment in THAT class with `end_date IS NULL`. A parent of another class, an unlinked account, a role-less account, a self-made teacher with no classes: no rows (asserted). |
| Grants | `REVOKE ... FROM PUBLIC, anon; GRANT ... TO authenticated`. Asserted: anon gets "permission denied". |
| Idempotent | `CREATE OR REPLACE`, `DROP FUNCTION IF EXISTS`; pasted twice in the suite, second paste changes nothing. |
| Applies to live as it is | Not on its own: its preflight needs `is_family_student`, which does not exist on live today (correct - `20261113130000` creates it). `get_class_skill_points` does not exist on live today either; it will exist with the signature `(uuid, date, date)` once `20261113130000` is in, and the drop is `IF EXISTS`. `is_teacher_of_class(uuid,uuid)`, `is_student_enrolled_in_class(uuid,uuid)`, `has_role(uuid,app_role)` exist. |
| Anything still calling the function it drops | `origin/main` `src/`, `supabase/`, `scripts/`: no reference to `get_class_skill_points` or `get_class_skill_summary` at all. Browser branch: only `src/lib/classSkillPoints.ts`, as the middle fallback. Edge functions: none. |
| Order relative to `20261113130000` | After it, immediately. Between the two a family can call the named function. Never paste `20261113130000` again afterwards (it recreates the named function); if that happens, paste `20261113150000` again. |
| The suite fails without the fix | `node scripts/pgtest/classmate-rows.test.mjs <20261111110000> <20261113130000> <20261113150000>`: 136 passed. Scratch mutants of the migration (repo untouched): own child counted (`count(*) >= 3`) 7 fail; free date ranges 7 fail; threshold two 7 fail; named function not dropped 4 fail; caller check removed (any signed-in account) fails the five "0 rows" cases; **the file as written before this review: 15 fail**. |

Rollback: unchanged - the fenced block `<!-- rollback class-skill-summary -->` in `S1-security-fixes.md` (recreates `get_class_skill_points` as `20261113130000` defines it, drops the summary; the suite runs it and compares md5). The paragraphs about "fewer than three in the class" in `S1-security-fixes.md` round 2 are superseded by this section.

### What this needed in the browser (in the release, commit 3 of 3)

With figures withheld more often, two things in the panels became wrong rather than merely empty, so they are fixed in the F-16 files themselves:

- `RadarChartTab`: a skill with no class figure had "best" 0, and `score >= 0` marked the child as LEADER of it. Now: no class figure, no crown; the card shows "/ -" and the header drops the "/ class total" when a skill the child has points in has no class figure.
- `PerformanceHeatmapTab`: showed "Best: 1pts / Avg: 0pts"; now a dash, and "Not shown for a small group" in place of the top three.
- `classSkillPoints.ts`: it used to fall back to the next source on ANY error. After the migrations the last fallback (rows) returns the family's own rows only, so one failed request would have shown the child as best in class. It now falls back only when the database says the function does not exist (PostgREST `PGRST202`, Postgres `42883`) and otherwise throws, like the query it replaced.

---

## 2. The browser release: `release/s1-browser-2`

Cut from `origin/main` `c502312e`. Three commits:

| Commit | From | What |
|---|---|---|
| `de3d597d` | cherry-pick of `7f9d562f` (`release/s1-f16-browser`) | class skill panels read the summary; classmate pop-up shows header + private line |
| `4fba645c` | cherry-pick of `3d5c8193` (`release/s1-f21-browser`) | stored links open only when http(s) |
| `f5987804` | new, this review | the three panel fixes listed at the end of section 1 |

Both cherry-picks applied without conflict: none of the ten files was touched on main between `705dea85` and `c502312e`.

Leak check, `git diff --stat origin/main..release/s1-browser-2` - exactly these ten files, nothing else:

```
src/components/resources/ResourceCard.tsx
src/components/student/MyWorkGallery.tsx
src/components/student/StudentAnalyticsModal.tsx
src/components/student/analytics/PerformanceHeatmapTab.tsx
src/components/student/analytics/RadarChartTab.tsx
src/lib/classSkillPoints.ts          (new)
src/lib/safeUrl.ts                   (new)
src/pages/StudentLessonDetail.tsx
src/pages/TeacherResources.tsx
src/pages/TeacherSmartUpload.tsx
```

Checks on the branch: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` exit 0; `node scripts/pgtest/run.mjs` 2782 assertions across 37 suites, 0 failed (main's suites, including the app typecheck and the edge-function typecheck; the F-16 / F-21 / F-02 suites live on `s1-phase2`, where `classmate-rows` runs 136 / 0 with the summary and 77 / 0 without); `node node_modules/vite/bin/vite.js build` built in 5m 5s, exit 0, `dist/` removed afterwards. The `node_modules` link was removed with `cmd //c rmdir node_modules`.

### F-16 code against each state of the database (by reading `src/lib/classSkillPoints.ts`)

Family callers: `get_class_skill_summary` -> if the function is missing, `get_class_skill_points` -> if that is missing too, the row query the panels use today. Staff (`role` teacher or admin) go straight to rows.

| Window | What a family sees |
|---|---|
| **Browser release live, no migration yet** (today's database) | Exactly what they see today. Both functions are missing, the panels use today's row query under today's policies: class best, class average, top three WITH first names. Tapping a classmate: the pop-up's probe finds the classmate's row (old policy), so the four tabs open as today. No visible change at all. |
| Between `20261113130000` and `20261113150000` (seconds) | Own child: unchanged figures, names still on the top three (the named function). Classmate: header and the private line. |
| **After both migrations** | Tapping a classmate on the board: name, avatar, level and points, then "<Name>'s points are shown above. Skills, attendance and history are private to each student and their family." Own child's pop-up: four tabs with their own data as before; per skill "Best" and "Avg" for the class where at least three other children were assessed in it (this month on the Performance tab, all time on the Attributes tab), otherwise a dash; the top three as medals with points, "You" on the child's own entry and "#1 / #2 / #3" on the others - no names. The class board itself (names, avatars, points) is unchanged. |
| Staff, any window | Unchanged, names included. |

One thing to know for the minute after the paste: PostgREST reloads its list of functions a moment after the DDL. In that moment a family opening the panel could get the row fallback (own rows only: the child shown as best) until the next reload of the page. The sheet has a probe for it (step 2b.4).

### F-21 `safeHttpUrl` / `openHttpUrl`

`src/lib/safeUrl.ts`: http(s) only, no whitespace or control characters anywhere, then `new URL()` must agree. Used at every place a stored link is rendered or opened on current main: `MyWorkGallery.tsx:81`, `StudentLessonDetail.tsx:313`, `TeacherSmartUpload.tsx:967` (`href`), `ResourceCard.tsx:32`, `TeacherResources.tsx:111` (`window.open`). The other `href={x.url}` on those pages are signed storage URLs made by the app. Re-searched `src/` on `c502312e` for `external_url` / `thumbnail_url`: no new render site (the new upload dialog only writes). Harmless against today's data: all stored links are http(s) (probe P4 = 0, 0 today).

---

## 3. Apply-and-deploy sheet (for the conductor; in this order; stop on any difference)

Rules as in `S1-live-apply-brief.md`: every file sent to live is the LF blob from git (`git show <ref>:<path>`), never the working copy; do not strip a migration's own `BEGIN` / `COMMIT`; after each paste compare `md5(replace(prosrc, E'\r', ''))` with the value given here; record each result in `S1-live-apply.md`.

### Step 1 - browser

1. `git fetch origin`. `origin/main` must be `c502312e`. If it moved: rebase `release/s1-browser-2` onto it, re-run `tsc --noEmit -p tsconfig.app.json`, and check `git diff --stat origin/main..release/s1-browser-2` still lists only the ten files above.
2. `git push origin release/s1-browser-2:main` (fast-forward; no force).
3. Wait for the Cloudflare deploy; read the Actions run, do not trust a local build.
4. Confirm it is live: reload the app as a parent, open the class board, tap own child (four tabs, "Best" numbers, top three WITH names - old database), tap a classmate (four tabs still open - old database). As a teacher open one resource link. Nothing should look different from yesterday.

### Step 2a - `20261113130000_classmate_rows_private.sql` (blob `af1a45831fe86dcf2361abdff388b33887bcd4c5` at `s1-phase2`)

Pre-checks, with the values read on live today (13 Nov):

```sql
-- A  the four policies it replaces exist, and nothing of the fix is there yet. Today: 4 rows, then 0 rows.
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
   AND policyname IN ('Students can view classmates for leaderboard', 'Classmates can view attendance',
                      'Students can view class skill assessments', 'Students can view class transactions') ORDER BY 1;
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Family logins can view %';
-- B  helpers it builds on. Today: can_view_classmate ffe7e1f83ee873ab36c0a5e28246d6a5, can_view_student 53f2d32704abbb600bf5eefa09130c12,
--    can_view_enrollment 3bbba012bdd56010bb2d6059db8f444f, is_student_enrolled_in_class e8d7b3599d6e55b407daa052b7da6c75,
--    is_teacher_of_class bac42052f79017f627b2d5dfc9585958, has_role dcfc17cfff0b246634d5df8bf8ceb915
SELECT proname, md5(replace(prosrc, E'\r', '')) FROM pg_proc WHERE pronamespace = 'public'::regnamespace
   AND proname IN ('can_view_classmate','can_view_student','can_view_enrollment','is_student_enrolled_in_class','is_teacher_of_class','has_role') ORDER BY 1;
-- C  the functions it creates do not exist. Today: 0 rows.
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('is_family_student','get_class_skill_points','get_class_skill_summary');
-- D  only one policy calls can_view_classmate. Today: 1 row, students / "Students can view classmates for leaderboard".
SELECT tablename, policyname FROM pg_policies WHERE concat_ws(' ', qual, with_check) ~ 'can_view_classmate';
-- E  sibling reach (probe P4 of S1-security-fixes.md, F-16). Today: 5. Must be 5 again afterwards.
```
Also true today: RLS on for the four tables; `students.secondary_user_id` exists.

Apply. Then:

- P1-P4 of `S1-security-fixes.md` (F-16): P1 = 4 rows, all "Family logins ..."; P2 = 1 row; P3 = `is_family_student` and `get_class_skill_points`, definer t, anon f, authenticated t; P4 = 5.
- md5: `is_family_student` -> `b3703c0ab1b52dfd9ee8fbc83ba5c9a3` (662 chars); `get_class_skill_points` -> `bcb33eff0c78840966c734245573b9d3` (617 chars).
- each new policy's `qual` starts `(is_family_student(<col>, auth.uid()) AND `.

Rollback: `docs/evidence/S1-F16-rollback.sql` (blob `9f7ddb6e7eec3a15a111cf54a40fd457fba51b9b`). Reopens F-16. If `20261113150000` is already in, run ITS rollback block first.

### Step 2b - `20261113150000_class_skill_summary_without_names.sql`, at once (blob `5fc34c5d5c298a433668ba6b29b6b966b43e9629` at `s1-phase2` - the reviewed version; the conductor branch's copy is the old one)

1. Pre: `is_family_student(uuid,uuid)` exists (step 2a); `get_class_skill_points(uuid,date,date)` exists with md5 `bcb33eff0c78840966c734245573b9d3`; `get_class_skill_summary` does not.
2. Apply.
3. Verify:
```sql
-- expect ONE row: get_class_skill_summary | t | f | t | 1cd267da31275adacd80919eb2987ac1 | {search_path=public}
SELECT proname, prosecdef, has_function_privilege('anon', oid, 'EXECUTE') anon, has_function_privilege('authenticated', oid, 'EXECUTE') authenticated,
       md5(replace(prosrc, E'\r', '')), proconfig
  FROM pg_proc WHERE proname IN ('get_class_skill_summary', 'get_class_skill_points');
-- the body carries both rules: expect t, t
SELECT prosrc ~ 'FILTER \(WHERE NOT kids\.own\) >= 3', prosrc ~ 'whole_period' FROM pg_proc WHERE proname = 'get_class_skill_summary';
-- no row and no policy changed: P1 and P4 of F-16 as after step 2a (4 rows; 5)
```
   Length of the body: 1719 chars.
4. Outside probe (PostgREST has picked the function up): with the publishable key and no session, `POST /rest/v1/rpc/get_class_skill_summary` with body `{"p_class":"00000000-0000-0000-0000-000000000000"}` answers 401 / "permission denied" (42501), NOT 404 `PGRST202`; the same for `get_class_skill_points` answers 404 `PGRST202`. If the first still says `PGRST202` after a minute, run `NOTIFY pgrst, 'reload schema';` and probe again.
5. Hand check as a parent: class board shows every child; own child's pop-up has four tabs with data, "Best" / "Avg" on skills several children were assessed in (a dash on the others), top three as points with "You"; a classmate's pop-up shows the header and the private line. As a teacher: the same pop-up from a staff board still shows names.

Rollback: the fenced block `<!-- rollback class-skill-summary -->` in `docs/evidence/S1-security-fixes.md` (brings the named function back: reopens the review's point).

### Step 2c - `20261113140000_creator_rows_need_class_staff.sql` (blob `c7aaba3395c64cb6aa474189924aeae01f59d3c4`)

Pre-checks, values read on live today:

```sql
-- A  the seven policies it replaces exist. Today: 7 rows -
--    student_work/teachers_manage_class_student_work, student_reports/teachers_manage_reports, cefr_assessments/teachers_manage_class_cefr,
--    student_error_log/teachers_manage_class_error_log (each ALL, authenticated); resources/"Teachers can insert|update|delete own resources" (public)
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public'
   AND policyname IN ('teachers_manage_class_student_work','teachers_manage_reports','teachers_manage_class_cefr','teachers_manage_class_error_log',
                      'Teachers can insert own resources','Teachers can update own resources','Teachers can delete own resources') ORDER BY 1, 2;
-- B  nothing of the fix is there. Today: 0 rows, 0 rows, 0 rows.
SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND policyname ~ '_staff_(select|insert|update|delete)';
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'staff\_%';
SELECT conname FROM pg_constraint WHERE conname LIKE '%\_url\_http';
-- C  probe P4 of S1-security-fixes.md (F-21): no stored link fails the new constraints. Today: 0, 0. Not zero -> STOP and report the counts.
```
Also true today: RLS on for the five tables; `is_teacher_of_class`, `can_view_student_in_class`, `has_role` exist. Whitespace-stripped md5 of `qual|with_check` of the seven, for an exact before/after record: student_work `ae6c9807...`, student_reports `465b5ea5...`, cefr and error_log `b3640038...`, resources insert `c7e9f714...`, update and delete `a9bb5578...`.

Apply. Then P1-P4 of `S1-security-fixes.md` (F-21): P1 = 0 rows; P2 = 4, 4, 4, 4 and resources 3; P3 = 3 constraints (`student_work_external_url_http`, `resources_external_url_http`, `resources_thumbnail_url_http`), `convalidated` f; P4 = 0, 0. md5: `staff_may_write_for` -> `a9f27775f478171d56c15e9d7f11bcb6` (483), `staff_may_write_for_members` -> `aedac535b09c28a73c5e7bb3d63c8314` (380), `staff_created_this` -> `3f7bb2cb55797da5a3a3155d7b23198d` (146).

Hand check as a teacher: Smart Upload one photo and approve it; flag one error in class; generate one report from the class page; add one resource (the new multi-file dialog from `c502312e`).

Rollback: `docs/evidence/S1-F21-rollback.sql` (blob `95a2c42ae70d5572ec354a462ff8c623ba58b527`). Reopens F-21.

### Step 3 - F-02, nine functions, no SQL

**Source of the files: commit `1c736fff` (conductor branch tip; `s1-phase2` carries the same blobs).** Compared with `origin/main` `c502312e`, per function:

| Function | `index.ts` blob to deploy | Difference from `origin/main` |
|---|---|---|
| `word-enrichment` | `9f8669c2ed6850844b8f388cde2cf266e4395eef` | the gate only (+10 lines: import, `GATE`, the two-line call) |
| `image-search` | `9c3f015b9503ed5913a630a5cc04ada139b60070` | the gate (+10) and the staff-only test on `provider` / `skip_cache` (+7). Also 17 lines whose only change is the line ending: main's blob has CRLF on them, this one LF (`git diff --ignore-cr-at-eol` shows the +17 only). No other change. |
| `pronounce-syllables` | `1df87b260a4d3c64cfd08ec625fdf1fbd94e6da7` | the gate only (+10) |
| `pronounce-viseme` | `b6db2e8ea1327d869a9474a77835709ea619c6b4` | the gate only (+10) |
| `smart-dictation` | `93cbba8f3a798c92bc204b03c3aed00d01f50408` | the gate only (+10) |
| `smart-dictionary` | `099bd8e73a57b8951ff4b3de07a0e6be6da3d893` | the gate only (+10) |
| `sapling-grammar` | `a20eec920376807a96f359da7464b25ed5cb3293` | the gate only (+10) |
| `image-generate` | `274ffaddefb7cc2ba6c945410817870ee6552988` | the gate only (+10; staff roles) |
| `get-speech-token` | `1340712fa19f3ab3527631d7f078a274ae9c53ec` | the gate only (+10) |

`_lib/auth.ts` (`bd20ef228e07bb0f355081da4f63a44b696431a1`) and `_lib/rate-limit.ts` (`84478ed62f5bd579135622f4417f92eb8c4f318c`) are byte-identical to `origin/main`. `_lib/ai-gate.ts` (`baa9a0438d2d126f42e8401249ca20e3fc5d13a3`) is new. So no function file carries unshipped work, and no clean rebuild from main was needed. (`supabase/config.toml` on the conductor branch does carry unrelated entries - `audit-eval-proxy`, `recorder-retention` - but it is not deployed; the setting is given per function below.)

Import closure, re-read at `1c736fff`: each `index.ts` has exactly one relative import, `../_lib/ai-gate.ts`; `ai-gate.ts` imports `./auth.ts` and `./rate-limit.ts`; `auth.ts` imports only `https://esm.sh/@supabase/supabase-js@2.75.0`; `rate-limit.ts` imports nothing. Remote imports of the entrypoints are unchanged from main (`esm.sh` supabase-js in `word-enrichment` and `image-search`, `npm:microsoft-cognitiveservices-speech-sdk@1.52.0` in `pronounce-viseme`, `deno.land/std@0.168.0` in `sapling-grammar`).

For EACH function, in this order, finishing one before starting the next:

| # | Function | Entrypoint | Files to upload (LF blobs from `1c736fff`) | `verify_jwt` live today -> deploy with |
|---|---|---|---|---|
| 1 | `word-enrichment` | `word-enrichment/index.ts` | that + `_lib/ai-gate.ts`, `_lib/auth.ts`, `_lib/rate-limit.ts` | false -> **true** |
| 2 | `image-search` | `image-search/index.ts` | same three `_lib` files | false -> **true** |
| 3 | `pronounce-syllables` | `pronounce-syllables/index.ts` | same | false -> **true** |
| 4 | `pronounce-viseme` | `pronounce-viseme/index.ts` | same | false -> **true** |
| 5 | `smart-dictation` | `smart-dictation/index.ts` | same | true -> true |
| 6 | `smart-dictionary` | `smart-dictionary/index.ts` | same | true -> true |
| 7 | `sapling-grammar` | `sapling-grammar/index.ts` | same | true -> true |
| 8 | `image-generate` | `image-generate/index.ts` | same | true -> true |
| 9 | `get-speech-token` - LAST, outside lesson and homework hours (a weekday morning, Hanoi time) | `get-speech-token/index.ts` | same | true -> true |

(The live `verify_jwt` column is the reviewer's reading of today; step a re-reads it.)

a. **Snapshot live.** `get_edge_function`; save every returned file under `docs/evidence/S1-F02-live-before/<name>/` with the version and `verify_jwt`; commit. That copy is the rollback.
b. **Compare with the base.** The live `index.ts` must equal `git show origin/main:supabase/functions/<name>/index.ts` ignoring line endings (the nine are unchanged on main since the pre-gate base `6703938`). If it differs: STOP - the deploy would change something else as well. Only `get-speech-token` has been compared so far (by the reviewer: identical); I did not fetch the live sources.
c. **Deploy** the four files laid out as `<name>/index.ts` + `_lib/<file>.ts`, entrypoint `<name>/index.ts`, `verify_jwt` true (the layout the payments deploy used today).
d. **Verify.** `get_edge_function` again: the returned files equal the blobs sent; `requireSpender(req, corsHeaders, GATE)` sits straight after the OPTIONS block; `verify_jwt` true; the function booted (a probe answers, not a 5xx boot error).
e. **Probe**, with an empty JSON body - nothing here reaches a vendor:
   - no `Authorization` and no `apikey` -> **401** (the gateway);
   - the publishable key as `apikey` and as bearer -> **401** (the function: a key is not a session);
   - signed-in, wrong role -> **403**: this exists only where a role is excluded - `image-generate` as a student / family login, and `image-search` with `{"query":"cat","provider":"pixabay"}` as a student / family login (refused before any provider is called). The other seven let every role through, so their only 403 is an account holding no role, and no usable live account is in that state (two, both banned): do not create one for the probe. The signed-in probes need a person at a signed-in browser (owner or a test login the owner provides); never a real family's password.
f. Signed-in check after 1-3: look one word up on the Vocabulary page (definition, pictures, syllable audio). After 7: the grammar hint on the same page. After 9: start the video recorder once and see the live pronunciation line appear.

Rollback of one function: redeploy the files saved in step a with the `verify_jwt` recorded there.

Expected visible change, already accepted by the owner: `/vocabulary` opened by someone who is not signed in answers "Could not look up word".

---

## 4. For the owner

- The class figures are stricter than the version described before: three OTHER children per skill, whole months or all time only. The two smallest classes lose the class best / average on the all-time chart for families; teachers and admins see everything as before.
- The top three shows points without names to families. Names with total points stay on the class board.
- `origin/main` gained a commit from elsewhere during this work (`c502312e`); the release is built on it.
- Not done by me, by design: nothing pushed, deployed or applied; live function sources not fetched (step 3a/3b does it); no real browser run - the hand checks are in the sheet.
