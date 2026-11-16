# Brief: D3 review and fix (opus)

You are the REVIEWER-AND-FIXER for task D3 (the "Check before cancelling" dialogs). A sonnet agent built them; you review with fresh eyes and FIX what you find within the D3 files. This ships to production with a database guard, so correctness and fail-closed behaviour matter more than polish.

## Rules

- NO LOST WORK: first action after setup: create `docs/evidence/D3-review.md` with `VERDICT: INCOMPLETE` and a "Where I am / next step" line and commit. Commit after EVERY finding written and EVERY fix.
- Never sign in to the live app, never call the live Supabase project, no Supabase/MCP tools, no deploy.
- Tuition figures only from calculate-tuition, payroll only from calculate-payroll: the dialogs DISPLAY what the preview returns and never compute, sum or estimate a figure.
- No direct client write to `sessions` in the D3 files. The UI fails closed. "Keep lesson" is the default action.

## Setup

- Own git worktree on Windows. `git merge claude/hec-conductor-setup-efbaa5`.
- Read: `AGENTS.md`; `docs/MASTER_PLAN.md` section 10 (rulings on reviews 1-3); `docs/evidence/D3-dialogs.md`; `docs/evidence/D2-edge-build.md` "Contract for the dialogs (D3)"; `docs/evidence/D-review-3.md` finding F-1; and, if it exists, `docs/evidence/D-ship-fixes.md` "CONTRACT FIELDS (final)". Another agent is finalising the functions: the preview no longer calls calculate-tuition; it returns the STORED bills as `invoices_before` and `after: { available: false }`. If that file is not there yet, merge the conductor branch again near the end and align then; if still absent, keep the single adapter `readStoredBills()` defensive and say so.
- node_modules: `cmd //c mklink //J node_modules "C:\Users\Dell\Downloads\04 Code & Web Projects\hec-team-app\new\happy-english-club-team-ef716384\node_modules"`; remove ONLY the link at the end with `cmd //c rmdir node_modules`.
- Preview harness: `C:\Users\Dell\hec-tools\d3-harness\` (fake Supabase client, scripted `functions.invoke`, Playwright; port 5343; its builder has finished, use it).

## Files you may edit

`src/lib/sessionGuard.ts`, `scripts/sessionGuard.test.ts`, everything under `src/components/admin/session-guard/`, the rewired callers (CancelSessionDialog, DeleteSessionDialog, SessionActionsModal, admin EditSessionModal, class/EditSessionModal, BulkSessionDelete, GlobalCalendar: only the parts that talk to the guard), `tabs/AutomationTab.tsx` (the review screen mount only), `docs/evidence/D3-review.md`, screenshots under `docs/evidence/D3/`.

Do NOT touch: `supabase/`, `src/components/ui/*` (another agent is editing the dialog/popover/tooltip primitives), Layout, App.tsx, index.css, tailwind config, Admin.tsx, student files, recorder, audit-clips.

## Known defect to fix first

`docs/evidence/D3/strong-1-open-375.png`: at 375 px the dialog is NOT centred. Its top-left corner sits at about (188, 406), i.e. left:50% / top:50% WITHOUT the -50% translate, so most of it is off-screen. At 1280 it is centred. Find the cause (a transform/animation class overriding the centring translate, a mobile variant, or a harness artefact: prove which from the computed transform after the open animation ends) and fix it so that at 375x812 and 320x568 the whole dialog is on screen, scrolls inside itself, and the Keep / destructive buttons stay reachable (sticky footer). Re-take ALL 375 screenshots and LOOK at them.

## Review (BLOCKER / MAJOR / MINOR with file:line; fix each and note the commit)

1. Flow in `useGuardedChange` / `api`: preview -> confirm with the preview's token; stale token -> reload preview and require confirmation AGAIN (never silent retry); no double submit; closing mid-request never claims success; every non-2xx read correctly from supabase-js (`FunctionsHttpError`: `await error.context.json()`; `FunctionsRelayError` / `FunctionsFetchError` have no body). Read `node_modules/@supabase/functions-js` source and make `parseInvokeError` right for each class, with unit tests using objects shaped like the real ones. Unknown codes show the code. A 200 with `tuition.status: 'failed'` shows which families failed and offers the contract's retry.
2. No arithmetic on money in the browser (grep for +, -, reduce, Math., Number( on figure fields).
3. Keep lesson has initial focus; Enter and Escape keep the lesson; the destructive button is disabled until every requirement of the tier is met and its label names the action; Enter in the reason field never triggers it.
4. Typed-date check is timezone-safe (plain YYYY-MM-DD, no Date parsing that shifts a day in UTC+7); tests for edge cases.
5. Bulk: evidence sessions excluded and unchecked by default, each with its own acknowledgement and reason; no "apply to all"; per-session results; chunks of 50; partial failure reported honestly.
6. React Query invalidation after success covers what the old dialogs invalidated (compare with `git show c7c5f21:<path>`).
7. Capability table: for cancel, force-cancel, un-cancel, Scheduled<->Held, delete, bulk cancel, bulk delete, edit times, move date, GlobalCalendar drag: old path -> new path. Builder's gaps: no bulk hard-delete screen, Canceled -> Held not offered, a time-only drag still opens the dialog, no "mark reviewed" button. For each: acceptable for a first release or must be added now? Add only what is small and already has a server action; never invent a client write.
8. FIVE REMAINING DIRECT WRITES to `sessions` outside D3 (do not edit them): `src/components/admin/class/AttendanceDrawer.tsx` ~129 (admin swaps teacher_id); `src/components/admin/class/SessionDetailDrawer.tsx` ~115 (admin updates notes and/or teacher_id); `src/components/admin/TeacherScheduleTransfer.tsx` ~143 and ~156 (admin bulk-moves teacher_id); `src/components/teacher/AttendanceMarking.tsx` ~216 (a TEACHER flips Scheduled -> Held after marking). PROVE with an executed pglite probe (real migrations, as `scripts/pgtest/session-cancel-guard.test.mjs` loads them; `.probe/` folder, deleted afterwards) what the guard does to each as an admin JWT / teacher JWT, on a future lesson, a started lesson, a Held lesson with marks and a lesson in a settled month: allowed or refused, with the code. Report a table. Anything REFUSED is a release blocker for the conductor: say which and propose the smallest fix, without editing those files or `supabase/`.
9. Accessibility and wording: labelled dialog, focus trapped and returned, errors tied to inputs, colour never the only signal, long Vietnamese names wrap. Fix misleading strings in the one wording map: e.g. "another administrator will look at it" is wrong (an admin may review their own correction for now): say "This change is recorded for review." Existing tokens only.
10. `npx --yes bun test scripts/sessionGuard.test.ts` covers what you fix; `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` exit 0.

## Output

`docs/evidence/D3-review.md`: first line `VERDICT: PASS` / `PASS AFTER MY FIXES` / `FAIL` (FAIL if something you could not fix would let an admin cancel without the checks, show a wrong figure, or leave a screen broken after the migration); findings with fixes; the item-8 table; the capability table; what remains for the conductor; the final field names the adapter reads.

Finish: stop any dev server, remove the node_modules link and `.probe/`, commit, report in under 250 words: verdict, counts by severity fixed / not fixed, the mobile defect's cause, the item-8 table in one line per write, anything blocking the release.
