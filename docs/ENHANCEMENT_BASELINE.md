# ENHANCEMENT BASELINE (task A0)

Measured, not changed: no source file was modified. Every "After" cell is empty on purpose; the same commands fill it later.

## Where I am / next step

- Part 1 (tsc, pgtest, bun tests, build and bundle, static counts): complete.
- Part 2 measured: student dashboard, admin Tuition, admin Attendance, admin class sessions, admin schedule (5 of 12).
- Not yet measured: teacher dashboard, 3 class boards, student leaderboard, parent view, admin Payroll.
- Next step: measure teacher-dashboard, board-*, student-leaderboard, parent-view, admin-payroll one at a time
- Caveats: every Part 2 number is a dev-server number through a fake client; the fake returns `{}` for edge functions other than admin-unlock and calculate-tuition, so admin screens show real layout but thin data (see request kinds). Below 768 px the app itself falls back from the three display boards to the plain podium.
- Harness (outside the repo): `C:\Users\Dell\hec-tools\a0-harness\`. Run `node C:\Users\Dell\hec-tools\a0-harness\measure.mjs <repoRoot> <outDir> [screen-id,...]` (needs node_modules linked in the repo and Chrome installed; deploys the fake client into the git-ignored `<repo>/.claude/a0-preview/`, starts Vite on 5191, writes results.json + screenshots to outDir), then `node finalize.mjs <repoRoot> <outDir>` merges into `docs/evidence/A0` and regenerates the Part 2 tables. `static-counts.mjs`, `bundle.mjs`, `libs-in-chunks.mjs` give sections 1d/1e.

## Machine record

| Item | Value |
|---|---|
| Date | 2026-11-11 |
| Commit measured | `9ba819f` (origin/main c7c5f21 + conductor master plan; no source difference from c7c5f21) |
| CPU | Intel Core i7-8665U @ 1.90 GHz, 8 logical cores |
| RAM | 15.8 GB |
| OS | Windows 11 Pro 10.0.26300 |
| Node | v24 |
| Browser (runtime part) | Playwright 1.65.0, Chromium (bundled) / Chrome 157.0.8103.40 installed |
| Note | Timings were taken while other background jobs (pgtest, tsc) shared the CPU on this laptop-class machine: treat seconds as +/- 20 %. |

## Part 1 - static checks

### 1a-1c. Gates

| Check | Command | Baseline | After |
|---|---|---|---|
| App type check | `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | PASS, 0 errors, 213 s wall | |
| pgtest | `node scripts/pgtest/run.mjs` | PASS 1611 assertions, 30 suites, 0 failed, 473 s | |
| payrollCalculation | `npx --yes bun test scripts/payrollCalculation.test.ts` | PASS 6 / 0 fail | |
| enrolledMonths | `npx --yes bun test scripts/enrolledMonths.test.ts` | PASS 4 / 0 fail | |
| paymentMonth | `npx --yes bun test scripts/paymentMonth.test.ts` | PASS 3 / 0 fail | |
| restPaging | `npx --yes bun test scripts/restPaging.test.ts` | PASS 5 / 0 fail | |
| siblingDiscount | `npx --yes bun test scripts/siblingDiscount.test.ts` | PASS 7 / 0 fail | |
| siblingRetry | `npx --yes bun test scripts/siblingRetry.test.ts` | PASS 3 / 0 fail | |

`bun` is not on PATH, but `npx --yes bun ...` works (bun v1.4.4, first run 34 s incl. download to the npm cache). `git status` stayed clean afterwards: package.json and lockfiles untouched. Total bun tests: 28 pass, 0 fail.

### pgtest

`node scripts/pgtest/run.mjs`: exit 0, 473 s wall (it includes its own app typecheck and edge-function typecheck, run while other jobs shared the CPU). **1611 assertions across 30 suites, 0 suites failed. No pre-existing failure.** Full per-suite output: `docs/evidence/A0/pgtest.txt`.

Per-suite (passed/failed): family payment month 6/0, dated enrollment discounts 22/0, cancelled lessons 25/0, shared-module mirrors 13/0, edge functions typecheck 5/0, app typecheck 3/0, chat assistant 201/0, AI admin actions 71/0, payroll session rules 27/0, payroll screen rows 69/0, pay-rate history 38/0, payroll month locking 55/0, stars sync 46/0, stars sync engine 172/0, stars sync upgrade 17/0, stars sync homework 138/0, stars sync core 75/0, stars link tool 94/0, stars records 126/0, homework grading 27/0, video homework rules 26/0, language support lib 49/0, language support 27/0, video homework 55/0, audit clips lib 27/0, audit clips 33/0, ta standing assignments 10/0, assistant absence 15/0, recurring expenditures 24/0, class overhead 115/0.

| Metric | Baseline | After |
|---|---|---|
| Assertions / suites / failed suites | 1611 / 30 / 0 | |

### 1d. Production build

Command: `node node_modules/vite/bin/vite.js build` (exit 0, 90 s wall, "built in 1m 27s"; output kept in `docs/evidence/A0/build-output.txt`). Analysed with `node C:\Users\Dell\hec-tools\a0-harness\bundle.mjs <repo root>` (raw bytes, gzip level 9; KiB = 1024 B; full list in `docs/evidence/A0/bundle.json`). Only vite's own "chunks over 500 kB" warning was printed.

| Metric | Baseline | After |
|---|---|---|
| Total JS, gzip (147 JS files) | 1474.7 KiB (raw 5032.8 KiB) | |
| **Initial-load JS gzip** (entry `index-lDZDr1uY.js`; `dist/index.html` has one `<script type=module>`, zero `modulepreload`, and the entry has no static imports of other chunks) | **216.3 KiB** (raw 694.5 KiB) | |
| Initial CSS gzip (`index-CEIBNdKR.css`, only stylesheet) | 44.3 KiB (raw 299.8 KiB) | |
| Files in dist/assets | 158 (147 JS, 1 CSS, 10 avatar PNG ~60 KiB each) | |
| JS chunks over 500 kB raw | 3: Layout, index (entry), Admin | |

Top chunks by raw size (JS and CSS):

| Chunk | Raw KB | Gzip KB |
|---|---|---|
| Layout-C6kXVtG6.js | 1380.3 | 391.9 |
| index-lDZDr1uY.js | 694.5 | 216.3 |
| Admin-ta8GU85f.js | 527.4 | 136.2 |
| microsoft.cognitiveservices.speech.sdk-BHxAY8Yr.js | 373.3 | 80.7 |
| index-CEIBNdKR.css | 299.8 | 44.3 |
| index-DwBFokjN.js | 204.6 | 61.1 |
| index.es-B6ykoAna.js | 147.2 | 50.2 |
| StudentDetail-J53gEBh3.js | 137.1 | 35.1 |
| StudentDashboard-BtxsVJYw.js | 135.0 | 34.9 |
| BulkReportExport-DpFyyk8c.js | 106.5 | 33.9 |
| Vocabulary-aWp9Abbc.js | 88.4 | 25.5 |
| GlobalCalendar-Jty9zQWS.js | 86.3 | 26.9 |
| ClassDetail-5bZEs3oC.js | 47.9 | 12.8 |
| TeacherTranscripts-Jz6eGjma.js | 46.0 | 11.7 |
| Teachers-E82X9zeI.js | 44.9 | 11.0 |
| ClassBoardWindow-WyorB0lL.js | 41.2 | 14.1 |
| StudentProfileEdit-CzaTOX71.js | 33.5 | 10.7 |
| calendar-FWToLH7a.js | 33.0 | 10.5 |
| TeacherProfile-CCNFwB-T.js | 31.3 | 8.6 |
| TeacherClassDetail-CbS2qJ0T.js | 29.7 | 8.9 |
| HighScores-BceODYFH.js | 28.4 | 7.6 |
| NightLeague-COxUj_pl.js | 28.0 | 7.5 |
| TeacherSmartUpload-CdVLh9TU.js | 27.2 | 8.3 |
| AssignmentUpload-aA_1HcP0.js | 25.0 | 7.1 |
| StarBoard-6KByQl58.js | 25.0 | 6.9 |


Findings that matter for A3:

- **`Layout-*.js` is 1380 KiB raw / 392 KiB gzip and is fetched by every page that renders `<Layout>` (79 chunks reference it), including the student dashboard, teacher dashboard and admin.** It is not in the initial bundle, but every screen waits for it after the entry. Signature counts show it holds recharts (82 hits), jsPDF (87), html2canvas (23), date-fns and lucide (90): rollup parked the shared dependency graph in the Layout chunk, so PDF and chart code is downloaded by a student opening the dashboard. framer-motion cannot be located by name after minification (0 name hits in any chunk); `Layout.tsx` imports `motion` statically so it is probably in that chunk too (unverified).
- Heavy libs in the **initial** (entry) chunk: none of recharts, jsPDF, html2canvas, pdf.js, framer-motion by signature. The entry holds react-router, react-query, the supabase client, lucide and fuse.
- Heavy libs in **lazy** chunks: recharts also in StudentDashboard, StudentDetail, StudentProfileEdit; quill in `index-DwBFokjN.js` (205 KiB raw, 61 KiB gzip); Azure speech SDK as its own chunk (373 KiB raw, 81 KiB gzip); `index.es-*` (147 KiB raw, 50 KiB gzip) lazy.
- **Admin code vs student/parent bundle:** every route in `src/App.tsx` is `lazy()`, so `Admin-*.js` (527 KiB raw, 136 KiB gzip) is not in the initial bundle and a student never downloads it. What they share is the Layout chunk above. `ProtectedRoute` statically imports `AdminUnlockGate` into the entry (small).
- Not measured: production-build runtime timings (the built app would call the live Supabase project; forbidden). Sizes are static.


### 1e. Static counts

Produced by `node C:\Users\Dell\hec-tools\a0-harness\static-counts.mjs <repo root>` (JSON; regex based, so heuristics, same script for "After"). Cross-checked with plain grep where noted. The script counts `select('*')` including ones followed by more args.

| Metric | Definition | Baseline | After |
|---|---|---|---|
| `select('*')` in src | `grep -rEn "select\((['\"])\*\1\)" src --include=*.ts --include=*.tsx \| wc -l` (grep: 66; script, which also matches `select('*', {opts})`: 67) | 67 | |
| `select('*')` in supabase/functions | same grep on `supabase/functions` (grep 24; script 25) | 25 | |
| `.select()` no columns, src | `grep -rEn "\.select\(\s*\)" src` | 6 | |
| `.select()` no columns, functions | same on `supabase/functions` | 9 | |
| `select('*, rel(...)')` in src (informational) | `grep -rEn "select\((['\"])\*," src` | 16 | |
| `<img` total / without `alt` | script, tag-level multiline match; flags `alt=` or `{...spread}` as OK | 36 / 3 (HomeworkPdfDownload.tsx, vocabulary/ImageCarousel.tsx) | |
| Icon-only `<Button>`/`<button>` total / without aria-label, aria-labelledby or title | script heuristic: element whose only child is a self-closing `<Icon />` or `<svg>`; misses icon + sr-only span and buttons built with other wrappers | 38 / 27 | |
| `useQuery(` calls total / without `staleTime` in the call | script balanced-paren scan | 327 / 285 | |
| Global react-query default | `src/App.tsx`: `staleTime: 60_000, gcTime: 5 min, retry: 1, refetchOnWindowFocus: false` | so the 285 inherit 60 s | |
| `: any` occurrences in src | `grep -rEo ": any\b" src --include=*.ts --include=*.tsx \| wc -l` | 749 | |
| `as any` occurrences in src | `grep -rEo "as any\b" src ... \| wc -l` | 355 | |
| Files over 800 lines (src) | script (counts `split('\n')`, i.e. wc -l + 1) | 12 (list below) | |

Files over 800 lines: `integrations/supabase/types.ts` 6821 (generated), `leaderboard/HighScores.tsx` 1916, `pages/TeacherTranscripts.tsx` 1724, `leaderboard/StarBoard.tsx` 1655, `leaderboard/NightLeague.tsx` 1518, `admin/tabs/StarsSyncTab.tsx` 1247, `pages/TeacherSmartUpload.tsx` 1090, `admin/stars/StarsRecordsCenter.tsx` 1075, `vocabulary/WordExplorer.tsx` 996, `admin/stars/StarsTools.tsx` 980, `lib/starsRecords.ts` 848, `pages/StudentDashboard.tsx` 841.

Routing: every page in `src/App.tsx` is `lazy(() => import(...))` (admin, teacher, student, family alike). Statically imported by App.tsx: providers, ProfilePicker, OAuthConsent, ProtectedRoute (which pulls AdminUnlockGate), StartupGuard, AnnouncementRenderer, AuthProvider.

## Part 2 - runtime (fake Supabase client)

Run: 2026-11-12T00:39:06.445Z. vite dev server, fake client (NOT production). Times are **dev-server numbers through the fake client** (Vite on-demand transforms, 15-25 ms fake latency, no minification): comparable only with the same harness. "Render" = first time #root holds >150 characters of non-loader text; "idle" = last resource/fake request activity before 1 s of quiet. Light = median of 3 loads; dark = 1 load (screenshot + axe). Warm-up load before measuring. Requests = fake-client calls (from/rpc/functions/storage) at idle.

| Screen | Route (role) | Req | 375 render/idle ms | 375 @4x CPU render/idle ms | 768 render/idle ms | 1280 render/idle ms | Overflow at 375 | axe 375 (crit/ser/mod/min) | axe 1280 |
|---|---|---|---|---|---|---|---|---|---|
| student-dashboard | `/student/dashboard` (student) | 33 | 1577 / 1863 | 8489 / 11181 | 1220 / 1742 | 1542 / 2129 | no | 1/2/1/0 (4 rules, 12 nodes) | 1/2/1/0 (4 rules, 11 nodes) |
| admin-tuition | `/tuition` (admin) | 20 | 1399 / 1690 | 10490 / 12438 | 1224 / 1449 | 1071 / 1336 | no | 1/2/1/0 (4 rules, 19 nodes) | 1/4/1/0 (6 rules, 19 nodes) |
| admin-attendance | `/teacher/attendance` (admin) | 17 | 2580 / 2475 | 7250 / 6878 | 2808 / 2844 | 2895 / 2936 | no | 1/1/1/0 (3 rules, 19 nodes) | 1/3/1/0 (5 rules, 18 nodes) |
| admin-class-sessions | `/admin/classes/c-0001` (admin) | 19 | 2263 / 2414 | 14610 / 13542 | 2271 / 2420 | 3168 / 3332 | no | 1/1/0/0 (2 rules, 6 nodes) | 1/3/0/0 (4 rules, 10 nodes) |
| admin-schedule | `/schedule` (admin) | 16 | 2675 / 2822 | 8935 / 9093 | 3331 / 3500 | 3161 / 3329 | no | 1/2/1/0 (4 rules, 19 nodes) | 1/4/1/0 (6 rules, 19 nodes) |
| teacher-dashboard | `/teacher/dashboard` (teacher) | 27 | 1903 / 2174 | 12155 / 8548 | 1952 / 2212 | 1895 / 2139 | no | 1/3/1/0 (5 rules, 16 nodes) | 1/5/1/0 (7 rules, 17 nodes) |
| board-starboard | `/teacher/leaderboards` (teacher, style star) | 27 | 2165 / 2189 | 12193 / 11205 | 1504 / 1854 | 1820 / 2313 | no | 2/1/1/0 (4 rules, 15 nodes) | 1/3/4/0 (8 rules, 14 nodes) |
| board-highscores | `/teacher/leaderboards` (teacher, style arcade) | 27 | 1845 / 1867 | 11766 / 10743 | 1598 / 1978 | 2055 / 2417 | no | 2/1/1/0 (4 rules, 15 nodes) | 1/3/4/0 (8 rules, 18 nodes) |

Axe at dark 375 and per-run details are in `docs/evidence/A0/results.json`. Screenshots: `docs/evidence/A0/<screen>-<375|768|1280>-<light|dark>.png` (.jpg when a PNG exceeded 380 KB).

Request kinds per screen (375 light):

- student-dashboard: from:students x5, from:enrollments x5, from:families x3, from:site_announcements x2, from:user_roles x2, rpc:get_student_homeworks x2, from:daily_login_rewards x2, from:announcement_dismissals x1, function:calculate-tuition x1, from:notifications x1, from:profiles x1, from:student_login_streaks x1, from:class_monitors x1, from:student_points x1, rpc:get_student_weekly_stats x1, from:attendance x1, from:language_support_set_classes x1, from:sessions x1, from:lesson_overviews x1
- admin-tuition: from:students x5, from:user_roles x4, from:families x4, from:site_announcements x2, from:announcement_dismissals x1, rpc:ai_actions_list x1, from:sessions x1, from:profiles x1, from:teachers x1
- admin-attendance: from:students x4, from:families x3, from:site_announcements x2, from:user_roles x2, from:teachers x2, from:announcement_dismissals x1, rpc:ai_actions_list x1, from:profiles x1, from:teaching_assistants x1
- admin-class-sessions: from:students x4, from:families x3, from:site_announcements x2, from:user_roles x2, function:admin-unlock x1, from:announcement_dismissals x1, rpc:ai_actions_list x1, from:sessions x1, from:enrollments x1, from:profiles x1, from:classes x1, from:teachers x1
- admin-schedule: from:students x4, from:families x3, from:site_announcements x2, from:user_roles x2, from:announcement_dismissals x1, rpc:ai_actions_list x1, from:sessions x1, from:profiles x1, from:teachers x1
- teacher-dashboard: from:sessions x5, from:students x4, from:teachers x4, from:families x3, from:site_announcements x2, from:user_roles x2, from:announcement_dismissals x1, from:video_submissions x1, from:profiles x1, function:calculate-payroll x1, from:notifications x1, from:homeworks x1, from:homework_submissions x1
- board-starboard: from:students x4, from:families x3, from:teachers x3, from:sessions x3, from:classes x3, from:site_announcements x2, from:user_roles x2, from:announcement_dismissals x1, from:profiles x1, from:notifications x1, from:class_monitors x1, from:enrollments x1, from:student_points x1, from:point_transactions x1
- board-highscores: from:students x4, from:families x3, from:teachers x3, from:sessions x3, from:classes x3, from:site_announcements x2, from:user_roles x2, from:announcement_dismissals x1, from:profiles x1, from:notifications x1, from:class_monitors x1, from:enrollments x1, from:student_points x1, from:point_transactions x1

Page errors seen (375 light): admin-tuition: Cannot read properties of undefined (reading 'name') | Cannot read properties of undefined (reading 'name') | Cannot read properties of undefined (reading 'name')


## Not measured

- admin Tuition (fixture gap, see top), teacher dashboard, Star Board / High Scores / Night League boards, student leaderboard, parent view, admin Payroll: not run (task paused).
- Production-build runtime timings (would hit the live Supabase project).
- Real-network / real-device timings; Lighthouse.
- framer-motion chunk location (minified, no name hits).
