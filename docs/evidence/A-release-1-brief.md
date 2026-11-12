# Brief: A release 1 (speed + stability) - build, gate, report. Do NOT push.

Goal: put the finished speed and stability tasks on top of `origin/main` as one release branch, WITHOUT anything that is on hold, run the gates, fill the "After" column, and report. The conductor pushes.

## Rules

- NO LOST WORK: first action: create `docs/evidence/A-release-1.md` (on the release branch) with a "Where I am / next step" line and commit; commit after every step.
- Never sign in to the live app, never call the live Supabase project, no Supabase/MCP tools, no deploy, NO PUSH.
- ZERO change to any figure, permission or workflow. You write no new product code: you assemble and measure. If something does not compile or a gate fails, STOP and report; do not patch product code (a one-line import fix is the only exception, and must be listed).
- node_modules: `cmd //c mklink //J node_modules "C:\Users\Dell\Downloads\04 Code & Web Projects\hec-team-app\new\happy-english-club-team-ef716384\node_modules"`; remove ONLY the link at the end, ONLY with `cmd //c rmdir node_modules`. NEVER `rm -rf`, `Remove-Item -Recurse`, `fs.rmSync` or `git clean` on it (they follow the junction and delete the shared install; this already happened once).

## Setup

Your agent worktree starts somewhere arbitrary. Run `git fetch origin`, then `git checkout -B release/a1 origin/main`. The source of the work is the branch `claude/hec-conductor-setup-efbaa5` (do NOT merge it: it also holds work that is on hold).

## IN (take each file from `claude/hec-conductor-setup-efbaa5` with `git checkout claude/hec-conductor-setup-efbaa5 -- <file>`, subject to the leak check)

- A3.1 lazy charts/PDF: `src/components/classroom-tools/ClassroomToolsLauncher.tsx`, `src/components/shared/ClassLeaderboardShared.tsx`, `src/components/homework/HomeworkPdfDownload.tsx`, `src/components/student/ProfileShareCard.tsx`, `src/lib/reportPdf.ts`, `src/components/admin/TuitionBulkDownload.tsx`, `src/lib/lazyRetry.ts`
- A3.2 entry diet: `src/main.tsx`, `src/App.tsx`, `index.html`
- A3.3 parent view batching: `src/pages/FamilyDashboard.tsx`, `scripts/familyDashboardBatch.test.ts`
- A3.4 shell asks once: `src/components/ProfileSwitcher.tsx`, `src/components/ProfilePicker.tsx`, `src/hooks/useAnnouncements.ts`, `src/hooks/useShellQueries.ts`, `scripts/shellQueries.test.ts` (and `src/hooks/useIdentity.ts` only if it differs)
- A4.5 parent-view overflow: `src/components/Layout.tsx`
- A2.3 overlays/tooltips: `src/components/ui/{tooltip,popover,dialog,dropdown-menu,select,alert-dialog,sheet}.tsx`, `src/hooks/useFullscreenContainer.ts`, `src/components/teacher/{SkillButton,RadialSkillMenu,LiveEngagementHUD}.tsx`, `src/pages/{TeacherLeaderboards,TeacherSmartUpload,TeacherTranscripts}.tsx`
- The regression script and measurement doc: `scripts/a11y-teacher/**`, `docs/ENHANCEMENT_BASELINE.md`
- (A2.2 `src/pages/TeacherBooks.tsx` is ALREADY on main.)

## OUT (must NOT reach the release branch)

- The design system and restyle (on hold for the owner): `src/index.css`, `tailwind.config.ts`, `docs/DESIGN_SYSTEM.md`, `src/pages/StudentDashboard.tsx`, `src/components/student/StudentNavBar.tsx`, `src/components/student/nova/**` and every other student file the restyle touched.
- Workstream D (ships separately with its migrations): anything under `supabase/`, `src/lib/sessionGuard.ts`, `src/components/admin/session-guard/**`, the session dialogs, `GlobalCalendar`, `tabs/AutomationTab.tsx`.
- Workstreams C and B: `src/lib/recorder/**`, `scripts/lesson-eval/**`, recorder and audit-eval migrations and functions.
- `docs/MASTER_PLAN.md` and `docs/evidence/**` except your own evidence file.

## Leak check (required, before any gate)

For EVERY file in the IN list, `git diff origin/main release/a1 -- <file>` must contain ONLY that task's change. The conductor branch may carry OTHER tasks' edits in the same file. For each IN file, list the commits on the conductor branch that touched it since `c7c5f21` (`git log --oneline c7c5f21..claude/hec-conductor-setup-efbaa5 -- <file>`); if any commit belongs to an OUT task (the restyle "A4.2", "D3", recorder...), do NOT take the whole file: rebuild it from `origin/main` plus only the IN task's change, and say so. In particular check `ProfileShareCard.tsx` and any `src/components/student/**` file for restyle classes (new token class names such as `bg-paper`, `text-ink`, `font-display`, or `data-hec-theme`): none may be present. Write the per-file table (file, commits, taken whole / rebuilt) into the evidence file.

## Gates (record commands and outputs)

- G1 `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` exit 0.
- G3 `npx --yes bun test scripts/*.test.ts` all pass (list totals).
- G4 `node node_modules/vite/bin/vite.js build` exit 0; then `node C:\Users\Dell\hec-tools\a0-harness\bundle.mjs <repoRoot>` and `libs-in-chunks.mjs`: entry JS gzip, Layout chunk gzip, total JS gzip, CSS gzip vs the baseline in `docs/ENHANCEMENT_BASELINE.md`.
- G5 `node C:\Users\Dell\hec-tools\a0-harness\measure.mjs <repoRoot> <outDir>` then `finalize.mjs` (no other agent is using its port now; run it ONCE): per screen requests, timings, axe counts, horizontal overflow at 375. Compare with baseline: no screen slower beyond the 20% noise band, requests down where expected (parent view, student dashboard, admin schedule), overflow at 375 = none on every screen, axe counts not higher.
- G6 `node C:\Users\Dell\hec-tools\a0-harness\static-counts.mjs <repoRoot>`: no count worse.
- A2 regression: `node scripts/a11y-teacher/teacher-stability.mjs --harness C:\Users\Dell\hec-tools\a2-harness --port 5321` (about 30 minutes): expected ALL gated checks to pass now that A2.2 and A2.3 are together; report totals.
- G2 pgtest is not needed (no SQL or edge function in this release); say so.

Fill the "After" column of `docs/ENHANCEMENT_BASELINE.md` on the release branch from these runs (leave the Baseline column untouched).

## Report (under 250 words)

Branch `release/a1` and its last commit; the leak-check summary (any file rebuilt); each gate's result with headline numbers (before -> after); anything that failed or was not run; and one clear line: "READY TO PUSH" or "NOT READY: <why>".
