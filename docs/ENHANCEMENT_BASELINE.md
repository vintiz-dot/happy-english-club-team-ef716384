# ENHANCEMENT BASELINE (task A0)

Measured, not changed: no source file was modified. Every "After" cell is empty on purpose; the same commands fill it later.

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
| pgtest | `node scripts/pgtest/run.mjs` | see section "pgtest" below | |
| payrollCalculation | `npx --yes bun test scripts/payrollCalculation.test.ts` | PASS 6 / 0 fail | |
| enrolledMonths | `npx --yes bun test scripts/enrolledMonths.test.ts` | PASS 4 / 0 fail | |
| paymentMonth | `npx --yes bun test scripts/paymentMonth.test.ts` | PASS 3 / 0 fail | |
| restPaging | `npx --yes bun test scripts/restPaging.test.ts` | PASS 5 / 0 fail | |
| siblingDiscount | `npx --yes bun test scripts/siblingDiscount.test.ts` | PASS 7 / 0 fail | |
| siblingRetry | `npx --yes bun test scripts/siblingRetry.test.ts` | PASS 3 / 0 fail | |

`bun` is not on PATH, but `npx --yes bun ...` works (bun v1.4.4, first run 34 s incl. download to the npm cache). `git status` stayed clean afterwards: package.json and lockfiles untouched. Total bun tests: 28 pass, 0 fail.

### pgtest

PGTEST_PLACEHOLDER

### 1d. Production build

BUILD_PLACEHOLDER

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

RUNTIME_PLACEHOLDER

## Not measured

NOTMEASURED_PLACEHOLDER
