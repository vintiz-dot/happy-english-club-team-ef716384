# Tuition release (T1 round 2 + T3 round 2) - independent review and assembly

**Where I am / next step:** COMPLETE - see the last line of this file. Part 1 verdict PASS WITH CHANGES (no blocker); Part 2 assembled and green on `release/tuition-1`.

Nothing pushed, nothing deployed, no database touched. Reviewed tip: ab0e539 (`worktree-agent-a34c3c84114092f37`). Already reviewed and not re-reviewed here: T1 round 2 at 36c6af1 (`T1-review-2.md`), T3 round 1 at 2a5bf2e (`T3-review.md`).

## PART 1 - what is new since the reviewed commits

Scope read: `git diff 36c6af1..ab0e539 -- supabase/ scripts/` (7 files: the bulk function, three suites, run.mjs, the owner SQL, the unit test) and `git diff 2a5bf2e..ab0e539 -- src/lib src/hooks src/components/admin/AdminTuitionList.tsx`.

### a. `calculate-tuition-bulk` paged reads - SOUND

`fetchChunked` (`supabase/functions/calculate-tuition-bulk/index.ts:63-91`): per 200-id chunk, `.in(col, chunk)` + caller's filters + `.gt("id", after)` (`:79`) + `.order("id").limit(1000)` (`:80`), until an EMPTY page (`:82`).

| # | read | line | `id` | filters, before -> after |
|---|---|---|---|---|
| 1 | students (+ families, to-one embed) | 121 | uuid PK | same |
| 2 | enrollments | 129 | uuid PK, `id` added to select | same |
| 3 | classes | 152 | uuid PK | same |
| 4 | sessions | 158 | uuid PK | same (`gte/lt date`, `in status`, `:162`) |
| 5 | attendance | 177 | uuid PK, `id` added | same (`in student_id`) |
| 6 | discount_assignments (+ definition, to-one embed) | 193 | uuid PK, `id` added | same (`lte`, `or`) |
| 7 | referral_bonuses | 209 | uuid PK, `id` added | same |
| 8 | invoices, other months | 232 | uuid PK, `id` added | `neq month` kept; `.order("month")` removed from the request and done in memory (`:240`) |
| 9 | invoices, this month | 256 | uuid PK (already selected) | same (`eq month`) |

- Total, stable order: all eight tables declare `id UUID PRIMARY KEY` in their create-table migrations (20251011192324:33, 20251012020423:6 and :20, 20251012022335:9, 20251012022547:20 and :34, 20251012022746:37, 20251012062405:3). No composite key, no view, no id-less table. `gt` and `ORDER BY` on a uuid use the same comparison.
- Joins: the two embeds are many-to-one, so one top-level row per `id`; `limit` counts top-level rows. Complete.
- Reads 1 and 3 filter `id` twice (`in` and `gt`); supabase-js appends both and PostgREST ANDs them.
- Page size: 1,000 asked, never trusted - the loop ends only on an empty page, so a server cap of 1 or more still reads everything (suite proves caps 1000, 37, 7, 3). A row without `id` throws (`:86`) rather than looping or stopping.
- Fail closed: an error on any page throws (`:81`); nothing catches it before the outer handler (`:449-454`), which answers 400 with no `results`. The browser throws on that (`useLiveTuitionData.ts:35`). The per-student `try` (`:439`) is after all reads. By reading, not by an executed case.
- Not paged, correctly: `resolveSiblingStates` (one row per family, at most 200).
- Figures: `git diff 36c6af1..ab0e539 -- scripts/pgtest/fixtures` is empty; the invoice-status suite still compares every figure with the golden (run in Part 2).
- The month sort (`:240`) is a stable in-memory sort on `YYYY-MM`; one student cannot have two bills in a month, so the "settled in" walk reads the same sequence as before.

Minor, none blocking:
- **P1-m1** Rows now arrive in `id` order where the order used to be unspecified. Two places read order: `enrollments.find` (`:295`) picks the first enrollment covering a lesson, so for a child with two OVERLAPPING enrollments in the same class the one chosen (its override rate, allowed days, discount) may differ from the one Postgres happened to return first before; and the class breakdown lists classes in a different order. No effect on consistent data. Worth one count on live: students with overlapping enrollments in one class.
- **P1-m2** `referral_bonuses` sits in a `try/catch` (`:208-215`, as before): an error on any page drops ALL bonuses for the call, silently. Not partial, and it errs towards charging more, but it is not "fail closed". Pre-existing.
- **P1-m3** Cost: every chunk of every read now makes at least two requests (the last one empty), so 18+ per call instead of 9+. Watch the function's duration on the first live load.

### b. The rewritten `invoice-status` assertion - AT LEAST AS STRONG

Old (accepted by T1's review): one regex on `useLiveTuitionData.ts`, `finalPayable:` followed on the same line by `carryInDebt ... - ... carryInCredit` (any operator before the debt). New (`invoice-status.test.mjs:713-721`): two checks on `src/lib/liveTuitionItem.ts`, where the line now lives - `finalPayable: payableFromFunction(` and, after `??`, the exact text `data.totalAmount + (data.carry?.carryInDebt ?? 0) - (data.carry?.carryInCredit ?? 0)`. The exact expression pins both signs, which the old one did not. The file read is the right one: `liveTuitionItem.ts:67-70`, the only builder of the row both lists hand to the payment dialogs (`useLiveTuitionData.ts:8, 104`; `AdminTuitionList.tsx` row builder). `payableFromFunction` is `carry.payable` or null (`tuitionRows.ts:209-211`), and the server's `carry.payable` is `monthPayable` (T1, already reviewed). In addition `scripts/tuitionRows.test.ts` now checks both branches by value (mutations M10, M10b caught, per the author; re-run in Part 2 as the 46 unit tests).

### c. Beyond the brief - CORRECT, no browser pricing

- Retry (`AdminTuitionList.tsx:211-222`): `refetch()`, disabled while fetching. When a refetch fails the error block replaces the list, so no stale figure stays on screen.
- Record Pay (`:388`): `disabled={!cells.canRecordPay || refreshing}`; `refreshing` is the query's `isFetching` (`:297`), true for the refresh after a payment and for the unresolved-discount retries. `canRecordPay` is `state === "ready"` (`tuitionRows.ts:271`).
- Sequential batches (`useLiveTuitionData.ts:33-37`): one `await` per batch, any batch error fails the whole load. Finance tab: same rows, slower above 150 students. No figure involved.
- Payable: `tuitionRows.ts:252` - the function's `carry.payable`; the older-function sum only when the function sent none AND the row is ready; a pending or unavailable row shows words. The only arithmetic on money in the diff is that fallback (`liveTuitionItem.ts:70`), which is main's own line (`useLiveTuitionData.ts` on origin/main) moved, not new.
- Unresolved: `tuitionRows.ts:116` reads either shape; absent on an older function, the row is an ordinary row as today.

Minor:
- **P1-m4** A browser AHEAD of the function deploy has no `siblingUnresolved` to read, so an unresolved family shows its provisional charge as a figure (what the Finance tab does today, and what T3 round 1's review accepted). It degrades and does not break; to avoid even that, deploy the functions before the publish.
- **P1-m5** The retry counter is `dataUpdateCount - 1` (`AdminTuitionList.tsx:132`), which counts every successful load of the page session, not only retries. After eight earlier loads (payments refresh the list) a pending row is no longer retried automatically and stays "Being calculated", Record Pay off, until the page is reloaded. Fails closed. Follow-up.
- **P1-m6** Stale comments in `tuitionRows.ts` ("NOT in the function's answer today", "the bulk function does not yet"). Words only.

### d. R09 inside the five files for main - NOT VISIBLE ON MAIN

Only one of the five carries R09: `AdminTuitionList.tsx` (commit d9c0451). `useLiveTuitionData.ts`, `tuitionRows.ts`, `liveTuitionItem.ts` have T3 commits only; `useIvory.ts` is the 11-line context (default `false`, imports React only; origin/main has no provider).

R09's changes in `AdminTuitionList.tsx`, all behind `useIvory()`:
- 18 `iv(new, old)` class pairs on existing elements (loading line, title icon, toolbar row, confirmation select, sort row/icon/label, empty line, card, trigger button, name, class names, "Balance" caption, detail panel, grid, action row), the two chip `Badge`s (`variant={ivory ? "secondary" : "outline"}`, class `iv("", old)`), the header balance and chevron (`ivory ? new-template : old-template`);
- `FinanceCell` gains `ivory` / `total` props and an early `if (ivory) return ...` branch.

Checked mechanically (scratch script over `git show origin/main:` and `git show ab0e539:` of the file): of the 22 `iv()` calls, 18 have as their old string a `className` literal of main's file verbatim; the other 4 are the fix's own new error block. With every `iv()` collapsed to its old string, the only `className` / `variant` lines that differ from main are: the "Not available / Being calculated" badge, the error block with Retry, `disabled=` on Record Pay (all three the fix), and the four `ivory ? ... : old` ternaries whose false arm is main's text (the header-balance template differs only in `balance > 0` becoming `cells.headerBalance.tone === "owed"`). `FinanceCell` with `ivory` false runs main's body unchanged. The Balance cell's `"0 ₫"` became `format(0)`, which is the same string.

Outside the five files: `src/components/admin/TuitionReviewQueue.tsx` on the branch ALSO carries an R09 restyle (a493a3a, 71 lines). T1's change to it is one line (c97ffdf: the `changed_after_confirmation` heading). **Condition: only that line goes to main, applied to main's file** - done so in Part 2.

### Verdict for Part 1: PASS WITH CHANGES

No blocker. One condition on assembly (TuitionReviewQueue: the one line, not the file), one on order (functions before the publish, P1-m4), six minors (P1-m1 to m6) as follow-ups.

Not checked: the live `max-rows`; the page in a browser; Ivory rendering; an executed case for "error on page N".

## PART 2 - assembly: `release/tuition-1`

Cut from origin/main (0f372a6). Nothing merged or cherry-picked: each file below was taken from the commit named, or edited by hand where the branch's copy carries unshipped work.

### What is on the branch (30 files against origin/main)

Taken whole from ab0e539 (byte-identical: `git diff ab0e539 HEAD -- <these>` is empty):
- Functions: `supabase/functions/_lib/invoice-status.ts` (new), and `index.ts` of `calculate-tuition`, `calculate-tuition-bulk`, `smart-family-payment`, `family-payment`, `settle-bill`, `delete-payment`, `confirm-tuition`. No other `_lib` file differs from main.
- Browser: `src/components/admin/AdminTuitionList.tsx`, `src/hooks/useLiveTuitionData.ts`, `src/lib/tuitionRows.ts` (new), `src/lib/liveTuitionItem.ts` (new), `src/hooks/useIvory.ts` (new). The app typecheck and the build pass, so nothing else main lacks is imported.
- Tests: `scripts/pgtest/invoice-status.test.mjs`, `scripts/pgtest/tuition-prior-balance.test.mjs`, `scripts/pgtest/fixtures/tuition-figures.golden.json`, `scripts/pgtest/enrollment-discounts.test.mjs` (its diff against main is the 9 paging lines only), `scripts/tuitionRows.test.ts`.
- Owner SQL: `scripts/CHECK-invoice-status-resets.sql`, `scripts/CHECK-prior-balance-differences.sql`.
- `AGENTS.md` (its diff against main is the six "Bill status labels" lines only).
- Evidence: `T1-invoice-status.md`, `T1-review.md`, `T3-prior-balance.md`, `T3-round2.md`; `T1-review-2.md` from 5fa6d61; `T3-review.md` from 16ae3ff; this file.

Edited on main's own copy, because the branch's copy carries other work:
- `src/components/admin/TuitionReviewQueue.tsx`: the one line `changed_after_confirmation: "Changed after it was confirmed"` (c97ffdf). The branch's file also holds the R09 restyle (a493a3a) - left out.
- `scripts/pgtest/run.mjs`: the two entries "invoice status" and "tuition prior balance". The branch's file also registers audit-eval, recorder retention, class recorder, transcribe gate and class recordings scope - left out.

`scripts/pgtest/run-invoice-status.sh` appears in T1's history but no longer exists at ab0e539; not shipped.

### Leak check - CLEAN

`git diff origin/main..release/tuition-1 --stat`: the 30 files above and nothing else. Nothing under `supabase/migrations`, no recorder / audit-eval / lesson-eval / transcribe file, no `ui/*` primitive, no tailwind or `index.css` change, no `IvoryScope`. `useIvory.ts` is the only design-rollout file and it is the inert context. No migration in the release. Blobs are LF (`git ls-files --eol`: `i/lf` for every checked file).

### Suites on the release branch (node_modules by junction; the link removed with `cmd //c rmdir`, real folder intact at 399 entries)

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **2610 assertions across 35 suites, 0 suite(s) failed**, exit 0. Invoice status 188 (golden compared), tuition prior balance 267, dated enrollment discounts 22, family payment month 6, shared-module mirrors 13, edge functions typecheck 5, app typecheck 3 |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0; `--listFiles` shows 841 files under `src/` |
| `npx --yes bun test scripts/tuitionRows.test.ts` | 46 pass, 0 fail |
| vite build | exit 0, built. Run as `node node_modules/vite/bin/vite.js build`: `npx vite build` cannot start in this folder (the `&` in the path breaks npx's shim) |

35 suites, not the branch's 40: the five missing are the unshipped ones left out of run.mjs.

## DEPLOY MANIFEST

Source of every file: `release/tuition-1`. All seven have `verify_jwt = true` in `supabase/config.toml`; keep it. No secret, no migration, no config change. Every relative import is one level (none of the `_lib` files below imports another file; `auth.ts` imports supabase-js from esm.sh only).

| order | function | entrypoint | `_lib` files to upload with it |
|---|---|---|---|
| 1 | calculate-tuition | `supabase/functions/calculate-tuition/index.ts` | `rate-limit.ts`, `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `invoice-status.ts` |
| 2 | smart-family-payment | `supabase/functions/smart-family-payment/index.ts` | `rate-limit.ts`, `invoice-status.ts` |
| 3 | family-payment | `supabase/functions/family-payment/index.ts` | `rate-limit.ts`, `invoice-status.ts` |
| 4 | settle-bill | `supabase/functions/settle-bill/index.ts` | `invoice-status.ts` |
| 5 | delete-payment | `supabase/functions/delete-payment/index.ts` | `invoice-status.ts` |
| 6 | confirm-tuition | `supabase/functions/confirm-tuition/index.ts` | `auth.ts`, `invoice-status.ts` |
| 7 | calculate-tuition-bulk | `supabase/functions/calculate-tuition-bulk/index.ts` | `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `invoice-status.ts` |

Imports are written `../_lib/<name>.ts`, so upload each as `_lib/<name>.ts` beside `<function>/index.ts` (the layout the earlier deploys used). A function uploaded without `invoice-status.ts` fails at boot.

Order and timing: all seven in one sitting, calculate-tuition first (T1 review 2, condition 1). Then the browser: push `release/tuition-1` to main. Functions BEFORE the push (P1-m4); the other way round also works but shows an unresolved family's provisional charge until the bulk function is live.

Before deploying: record the live version number of each of the seven (function list) - that is the rollback target. Tell the owner the things in T1 review 2, condition 4 (about 445 old bills change label as they are opened, no amount changes; do not press Payment Integrity Repair; a hand-set `paid` does not stick; deleting a payment does not take it off the bill).

### Post-deploy probes (read-only, counts only)

1. Function list: the seven show a new version, status ACTIVE, `verify_jwt` true.
2. Boot: an unauthenticated POST to each of the seven answers 401, not 500 / "worker boot error" (proves `_lib/invoice-status.ts` arrived). No body needed.
3. Edge logs for the seven, 10 minutes after: count of 5xx and of boot errors = 0. For calculate-tuition-bulk also the slowest execution time (P1-m3).
4. `SELECT count(*) FROM invoices WHERE recorded_payment IS NULL` = 0.
5. `SELECT status, count(*) FROM invoices GROUP BY 1` before the deploy and again after a few tuition screens were opened: `issued` falls, `paid` / `partial` rise; the total does not fall.
6. T1 review 2, condition 5: its section 1 transition count again - `paid -> issued` stays at 6 or falls; and `scripts/CHECK-invoice-status-resets.sql` query 0, then its audit queries: no `recorded_payment` lowered by the service role.
7. Overlapping enrollments in one class (P1-m1); 0 means the new read order cannot change any figure. Can be run before the deploy:
   `SELECT count(*) FROM (SELECT a.student_id, a.class_id FROM enrollments a JOIN enrollments b ON b.student_id = a.student_id AND b.class_id = a.class_id AND b.id <> a.id AND b.start_date <= coalesce(a.end_date, 'infinity') AND a.start_date <= coalesce(b.end_date, 'infinity') GROUP BY 1, 2) x`
8. After the push: the Actions run for the commit is green; `/tuition` for the current month loads, and for one child present on both, the six cells equal the Finance tab's row (looked at by an admin; no name recorded).

### Rollback

- Functions: redeploy the seven from origin/main 0f372a6 (`git show 0f372a6:supabase/functions/<name>/index.ts`), with their `_lib` files from the same commit. At 0f372a6 none of them imports `invoice-status.ts`, so it need not be removed. Order: any; calculate-tuition-bulk alone can be rolled back without the other six (the browser falls back to the older answer). The version numbers recorded before the deploy say what was live; if a live function differed from 0f372a6, roll back to what was read from the live project, not to the repo.
- Browser: revert the release commit on main and push. Safe against either function version.
- Data: nothing to undo in amounts. Labels (`status`, `confirmation_status`, the `changed_after_confirmation` flag) written by the new functions stay as written; the old calculate-tuition rewrites `status` to `issued` on the next view of each bill, as it does today.

**Where I am / next step:** COMPLETE. Part 1 PASS WITH CHANGES; `release/tuition-1` assembled, leak check clean, all four checks green. Nothing pushed or deployed: the conductor's step.
