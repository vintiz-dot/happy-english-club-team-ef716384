# D release (checked cancellation) - assembly evidence

Where I am / next step: branch `release/d1` assembled from `origin/main` plus the IN paths; fingerprint written; gates results below. Next: conductor applies the two migrations, deploys manage-session and bulk-cancel-sessions, pushes. Nothing was pushed, applied or deployed by the release engineer.

## Leak check (src files, commits on the conductor branch since origin/main)

`origin/main` is the merge base of the conductor branch (c7c5f21 predates four shipped commits on main), so every listed commit is conductor-only. Every commit touching these files is a D3 commit (D3 dialogs, review fixes, WIP D3 steps); none belongs to A2.3 / A3.x / A4.x / recorder / audit-eval.

| File | Commits since origin/main | Verdict |
|---|---|---|
| src/lib/sessionGuard.ts | 05c7382 (D3) | taken whole |
| src/components/admin/session-guard/* (7 files) | 77f5e73, cfd668f, eb6265f, 44c23cc, 62a1f38, 8d0accc, 5091d2e, 715504d... (all D3) | taken whole |
| admin/CancelSessionDialog.tsx, DeleteSessionDialog.tsx | c23d749, 62a1f38.. (D3) | taken whole |
| admin/SessionActionsModal.tsx | 6629ae7 (D3) | taken whole |
| admin/EditSessionModal.tsx | e38bc56 (D3) | taken whole |
| admin/class/EditSessionModal.tsx | b32f474 (D3) | taken whole |
| admin/BulkSessionDelete.tsx | 9d640a5, 8d0accc (D3) | taken whole |
| schedule/GlobalCalendar.tsx | 91d5551 (D3) | taken whole |
| admin/tabs/AutomationTab.tsx | 19df40f (D3) | taken whole |

No file was rebuilt. Import/token check: grep of all IN src files for `useFullscreenContainer`, `lazyRetry`, `bg-paper`, `text-ink`, `font-display`, `bg-ink`, `border-paper`, `text-paper` found nothing; `src/components/ui`, `src/index.css`, `tailwind.config.ts` do not differ from origin/main. `tsc -p tsconfig.app.json` is the final proof that no import is missing.

`scripts/pgtest/run.mjs`: origin/main's file plus only the three D suite entries (session held evidence, session cancel guard, session guard functions), copied verbatim; recorder and audit-eval entries left out. docs/evidence/D1-build.md and D3 screenshots were not in the brief's doc list and are left out.

## Fingerprint

`node scripts/pgtest/guard-fingerprint.mjs` loads the prelude of session-cancel-guard.test.mjs, the audit and cancelled-lesson baseline, then the two real D migrations, diffs the catalog before/after and covers: 25 functions, 9 triggers (3 on sessions, 3 each on session_cancel_overrides and session_cancel_override_events; none on attendance), 4 relations (2 tables, 2 views). Files: `docs/evidence/D-release-fingerprint.sql` (one SELECT returning one jsonb) and `docs/evidence/D-release-fingerprint.expected.json`. Two runs gave identical output.

How to compare: paste the .sql in the SQL editor after applying both migrations, compare the single JSON value with the expected file, key by key (jsonb output key order differs; sort keys first). EXACT match required for everything except the `informational` block.

- `md5_prosrc` must match exactly: migrations are hashed with LF line endings (the script normalises a CRLF checkout). Paste the LF text, as committed.
- Excluded: owners, oids, ACL grantor names.
- `informational` (view definition md5, view reloptions) may differ across Postgres major versions (deparse); investigate only if the views' columns or privileges also differ.
- May legitimately differ between pglite and Supabase: `columns[].default` and `constraints[].md5_def` and policy `md5_qual`/`md5_with_check` are deparsed text and could differ by Postgres version in formatting; they match in a same-version comparison. `config` is sorted `name=value` text, expected `["search_path=public"]`.
- Privileges use has_function_privilege/has_table_privilege, which include PUBLIC and inherited grants; Supabase default privileges are revoked by the migrations' own REVOKE statements for every object they list.

## Gates (run on release/d1 with the node_modules junction)

- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `node scripts/pgtest/run.mjs`: 2155 assertions across 33 suites, 0 suite(s) failed (30 from origin/main + 3 D). session held evidence 143/0, session cancel guard 266/0, session guard functions 135/0, shared-module mirrors 13/0, edge functions typecheck 5/0.
- `npx --yes bun test scripts/*.test.ts`: 73 pass, 0 fail (7 files, includes sessionGuard.test.ts).
- `git diff --stat origin/main release/d1`: 42 files, only IN paths plus the fingerprint files and this evidence file.
