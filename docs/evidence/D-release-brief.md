# Brief: D release (checked cancellation) - assemble, gate, fingerprint. Do NOT push, apply or deploy.

Goal: put workstream D (the cancellation guard: two migrations, two edge functions, the dialogs) on top of `origin/main` as one release branch with NOTHING else, run the gates on that branch, and produce a fingerprint the conductor will use to prove the live database matches the repo after the migrations are applied. The conductor applies, deploys and pushes.

## Rules

- NO LOST WORK: first action: create `docs/evidence/D-release.md` (on the release branch) with a "Where I am / next step" line and commit; commit after every step.
- Never sign in to the live app, never call the live Supabase project, no Supabase/MCP tools, NO apply, NO deploy, NO push.
- You write no new product code: you assemble and measure. If something does not compile or a gate fails, STOP and report (a one-line fix to a test registration is the only exception, and must be listed).
- node_modules: `cmd //c mklink //J node_modules "C:\Users\Dell\Downloads\04 Code & Web Projects\hec-team-app\new\happy-english-club-team-ef716384\node_modules"`; remove ONLY the link at the end, ONLY with `cmd //c rmdir node_modules`. NEVER `rm -rf`, `Remove-Item -Recurse`, `fs.rmSync` or `git clean` on it or on a folder containing it (this deleted the shared install once already).

## Setup

`git fetch origin`, then `git checkout -B release/d1 origin/main`. Source of the work: branch `claude/hec-conductor-setup-efbaa5` (do NOT merge it).

## IN (take each from the conductor branch with `git checkout claude/hec-conductor-setup-efbaa5 -- <path>`, subject to the leak check)

- Migrations: `supabase/migrations/20261112090000_session_held_evidence.sql`, `supabase/migrations/20261112091000_session_cancel_guard.sql`
- Functions: `supabase/functions/manage-session/index.ts`, `supabase/functions/bulk-cancel-sessions/index.ts`, `supabase/functions/_lib/session-guard.ts`
- Tests: `scripts/pgtest/session-evidence.test.mjs`, `scripts/pgtest/session-cancel-guard.test.mjs`, `scripts/pgtest/session-guard-functions.test.mjs`, `scripts/sessionGuard.test.ts`
- `scripts/pgtest/run.mjs`: do NOT take the conductor branch's file whole (it also registers recorder and audit-eval suites whose files are not in this release). Start from `origin/main`'s `run.mjs` and add ONLY the three D suite entries exactly as they appear on the conductor branch.
- UI: `src/lib/sessionGuard.ts`, `src/components/admin/session-guard/**`, and the rewired callers: find them with `git diff --name-only c7c5f21 claude/hec-conductor-setup-efbaa5 -- src` filtered to the files the D3 evidence lists (`docs/evidence/D3-dialogs.md` and `docs/evidence/D3-review.md` on the conductor branch: CancelSessionDialog, DeleteSessionDialog, SessionActionsModal, admin EditSessionModal, class/EditSessionModal, BulkSessionDelete, GlobalCalendar, tabs/AutomationTab.tsx).
- Docs for the owner: `docs/evidence/D0-inventory.md`, `D1-evidence-model.md`, `D2-guard-design.md`, `D2-threat-model.md`, `D2-build.md`, `D2-edge-build.md`, `D-ship-fixes.md`, `D-review-1.md`, `D-review-2.md`, `D-review-3.md`, `D3-dialogs.md`, `D3-review.md` (no screenshots: leave `docs/evidence/D3/` out to keep main light).
- The already-shipped `supabase/functions/schedule-sessions` and `watch-sibling-threshold` are on main: do not touch.

## OUT (must NOT reach the release branch)

Design system and restyle (`src/index.css`, `tailwind.config.ts`, `docs/DESIGN_SYSTEM.md`, student dashboard files); A-stream speed/stability files (they ship as release/a1: `src/components/ui/*`, Layout, App.tsx, main.tsx, index.html, FamilyDashboard, ProfileSwitcher/Picker, useShellQueries, lazyRetry, teacher files...); recorder (`20261112100000_class_recorder.sql`, `src/lib/recorder/**`, recorder tests); audit-eval (`20261112110000_audit_eval_bucket.sql`, `supabase/functions/audit-eval-proxy/**`, its test, its `config.toml` entry); `scripts/lesson-eval/**`; `docs/MASTER_PLAN.md`.

## Leak check (required, before any gate)

For EVERY IN file under `src/`, list the commits on the conductor branch that touched it since `c7c5f21` (`git log --oneline c7c5f21..claude/hec-conductor-setup-efbaa5 -- <file>`). If any commit belongs to an OUT task (A2.3 overlays, A3.x, A4.x restyle...), do NOT take the file whole: rebuild it from `origin/main` plus only the D3 change, and say so. Check that no D file imports something that exists only on the conductor branch (e.g. `@/hooks/useFullscreenContainer`, `@/lib/lazyRetry`, new token class names like `bg-paper` / `text-ink` / `font-display`). Write the per-file table into the evidence file.

## Gates (record commands and outputs)

- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` exit 0.
- `node scripts/pgtest/run.mjs` on the release branch: 0 failed suites; report totals per D suite (expected: session held evidence 143, session cancel guard 266, session guard functions 135) and the overall total; every suite that exists on `origin/main` must still be present and green.
- `node scripts/pgtest/edge-functions.test.mjs` green (it is part of run.mjs; quote its lines).
- `npx --yes bun test scripts/*.test.ts` all pass.
- `git diff --stat origin/main release/d1` summary: only IN paths.

## Fingerprint (the conductor uses this after applying the migrations to the live database)

Write `scripts/pgtest/guard-fingerprint.mjs` (on the release branch; it may ship) that loads the same prelude and migrations as `session-cancel-guard.test.mjs` into pglite (so both D migrations are installed from the REAL files) and prints JSON with, for the objects those two migrations create or replace:
- every function: `proname`, `pg_get_function_identity_arguments`, `md5(prosrc)`, `prosecdef`, `provolatile`, `proconfig`;
- every trigger on `sessions`, `attendance` (if the migrations add any), `session_cancel_overrides` and `session_cancel_override_events`: `tgname`, table, `tgtype`, function name, `tgenabled`;
- the two new tables' columns (name, type, not null, default) and their RLS flag and policies (name, cmd, roles, `md5(qual)`, `md5(with_check)`);
- EXECUTE privileges of `anon`, `authenticated`, `service_role` on each function; table privileges of the same three roles on the two tables.
Decide the list of objects by diffing the catalog before and after loading the two migrations, so nothing is missed. The script must also print ONE read-only SQL statement (a single SELECT returning one JSON value built with `jsonb_build_object` / `jsonb_agg`) that produces the SAME structure when run on a real Postgres, written to `docs/evidence/D-release-fingerprint.sql`, and the expected JSON written to `docs/evidence/D-release-fingerprint.expected.json` (keys sorted, stable). Note in the evidence file any field that can legitimately differ between pglite and Supabase (e.g. owner names, `proconfig` formatting, policies' role oids) and exclude or normalise those so that an exact comparison is meaningful - `md5(prosrc)` MUST be compared exactly: it is the proof that the SQL text reached the database unaltered. Run the script; confirm it is deterministic (two runs, identical output).

## Report (under 250 words)

Branch `release/d1` and its last commit; the leak-check summary (any file rebuilt); each gate's result; the fingerprint files and how many objects they cover; anything that failed; and one clear line: "READY FOR APPLY AND PUSH" or "NOT READY: <why>".
