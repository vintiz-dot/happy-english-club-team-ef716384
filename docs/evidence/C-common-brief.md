# Common brief for every workstream C (class recorder) agent

Product: a teacher tool that records the class from 5 minutes before the lesson starts using TWO microphones at once - the teacher's wireless lapel (USB receiver) and an Anker PowerConf S500 near the students (USB) - as TWO SEPARATE mono tracks on ONE laptop. Capture only: it analyses nothing.

## Rules (binding)

- NO LOST WORK: first action after setup: create your evidence file with a "Where I am / next step" line and commit. Commit after EVERY file edit and every test run (WIP commits are fine).
- Never sign in to the live app, never call the live Supabase project, no Supabase/MCP tools, no deploy, apply no migration. The conductor ships.
- Hard rules: migrations in `supabase/migrations/` with explicit GRANTs, tested via `node scripts/pgtest/run.mjs`; nothing derived from a lesson reaches a family until a teacher approves; no family SELECT policy on audio; no service role for data a caller could write under RLS; every guard fails CLOSED; never weaken an existing guard; no new npm dependency without saying so first (prefer none).
- Never put audio, video or derived voice data in the repo. Test audio comes from `C:\Users\Dell\hec-audio-eval\` and is read from there, never copied in. Never open `key.txt` or `consent.txt`.
- Do not touch: the audit-clips page/table/bucket, the session dialogs, `supabase/functions/manage-session`, `bulk-cancel-sessions`, `src/components/ui/*`, `src/index.css`, `tailwind.config.ts`, student dashboard files. Shared files (`src/App.tsx`, Layout, `supabase/config.toml`, `scripts/pgtest/run.mjs`): one small, clearly described edit at most.

## Setup

- Own git worktree on Windows (Git Bash + PowerShell, node v24). `git merge claude/hec-conductor-setup-efbaa5`.
- node_modules: `cmd //c mklink //J node_modules "C:\Users\Dell\Downloads\04 Code & Web Projects\hec-team-app\new\happy-english-club-team-ef716384\node_modules"`. Remove ONLY the link at the end, ONLY with `cmd //c rmdir node_modules`. NEVER `rm -rf`, `Remove-Item -Recurse` or `git clean` on it: they follow the junction and delete the shared install (this already happened once).
- Read: `AGENTS.md`, `supabase/AGENTS.md`, `docs/evidence/C1-architecture.md` (the design and its Revision 1 changelog), `docs/evidence/C1-revision.md` ("Contract for C2": what the client must send, what the server verifies and refuses; "Contract for D1"), `supabase/migrations/20261112100000_class_recorder.sql`.
- Design: `docs/DESIGN_SYSTEM.md` exists, but its tokens are scoped and its rollout is on hold: UI uses the EXISTING tokens and shadcn primitives (bg-background, text-muted-foreground, border-border, destructive...), no hard-coded palette classes, so it can be restyled by token later. Mobile and tablet friendly, 44 px targets, long Vietnamese names wrap.
- Tools outside the repo (Playwright etc.) live under `C:\Users\Dell\hec-tools\`; use your own folder and your own port.
