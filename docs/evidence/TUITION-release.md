# Tuition release (T1 round 2 + T3 round 2) - independent review and assembly

**Where I am / next step:** Part 1 written (verdict PASS WITH CHANGES, no blocker). Next: Part 2 - bring the release files onto `release/tuition-1` (cut from origin/main 0f372a6), leak check, suites.

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
