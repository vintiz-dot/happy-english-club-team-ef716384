# T3 round 2 - after review (docs/evidence/T3-review.md @ 16ae3ff)

**Where I am / next step:** COMPLETE - all six steps done, all three checks green on the final tree. Nothing pushed, nothing deployed. Next step is the reviewer's.

Round 1 is `docs/evidence/T3-prior-balance.md` (facts, the fifteen cases, the first before/after table). This file is what changed after the review. Where the two differ, this one is current: in particular round 1's "Stopped on" is closed.

## 1. Branch

`worktree-agent-a34c3c84114092f37` = T1 round 2 (`worktree-agent-ab1ade20b08d798c9`, 36c6af1) + the R09 restyle merge (1430cc5) + the T3 commits. T1's branch does not contain R09, and the list fix is built on R09's restyle of the same file, so R09 is merged in rather than rebased away. One conflict, `scripts/pgtest/run.mjs`: both suites kept. The round-1 tip is kept as local branch `t3-round1-2a5bf2e`.

T1 round 2 added `carry.payable` to both calculators and `siblingUnresolved` to each bulk result. `tuition-prior-balance.test.mjs` asserted both absent; it now asserts them present: payable equal in bulk and single for every case, `payable - paid == carry-out`, and `siblingUnresolved: true` for exactly the two children of the unresolved family.

## 2. F1 - the row cap (`supabase/functions/calculate-tuition-bulk/index.ts`)

**What was wrong.** Every multi-row read of the function was one request per 200 ids. PostgREST answers with at most `max-rows` rows (1,000 unless changed) and gives no sign it stopped. Past that, the last students of a batch lost earlier bills (arrears read as nothing owed) and attendance rows (their lessons became unbillable, charge 0).

**What it does now.** `fetchChunked` reads every table to the end, paged by key: rows in `id` order, each page starting after the last `id` received (`.gt("id", last).order("id").limit(1000)`), until a page comes back EMPTY.
- Empty, not short: a page shorter than the size asked for may simply be the server's cap, so "short" proves nothing. This holds for any cap of 1 or more.
- By key, not by offset (`.range`): with offsets, a row inserted or deleted between two pages shifts the rest, and a bill can be read twice or not at all. A bill read twice is a wrong balance. The instruction said "range loop"; I chose the key because this is money, and say so here for the reviewer.
- Cost: one extra (empty) request per table per call.
- All nine reads go through it (students, enrollments, classes, sessions, attendance, discount assignments, referral bonuses, other months' bills, this month's bills). Five selects gained `id`. The history read no longer orders by month in the request; the rows are sorted by month in memory, which the "settled in a later month" walk needs.
- Not paged: `_lib/sibling-state.ts` reads `sibling_discount_state` for the batch's families and one month - at most one row per family, so at most 200 rows. It is shared with calculate-tuition; left alone.
- No shared-module pair touched (`mirrors.test.mjs` passes).

**Proof** (`scripts/pgtest/tuition-prior-balance.test.mjs`, real handler, stand-in capped per request):
- 60 students x 20 earlier bills (1,200 rows) at caps 1,000, 37 and 7: all 60 carry in 2,000,000; the answer is deep-equal to the uncapped one.
- 150 students x 8 attended lessons (1,200 attendance rows) at caps 1,000 and 37: all 150 charged 1,440,000; deep-equal to uncapped.
- The fifteen cases at 3 rows per request: deep-equal to uncapped (every figure, flag and "settled in" month).
- Run against the function as it was before this change, the first of these fails ("bulk at 1000 rows per request: all 60 students' arrears come back").
- Figures unchanged for uncapped data: `invoice-status.test.mjs` compares every figure with `fixtures/tuition-figures.golden.json`; the golden file is untouched and the suite passes.

The three PostgREST stand-ins that drive the bulk handler (`tuition-prior-balance`, `enrollment-discounts`, `invoice-status`) learned `gt`, `order` and `limit`, and give id-less fixture rows an id, as real rows have. In `invoice-status` a second `order()` now adds a sort key instead of replacing the first, as PostgREST does.

## 3. `carry.payable` and `siblingUnresolved`, with the fallback kept

- `src/lib/liveTuitionItem.ts` (new; the row builder moved out of the hook so it can be tested without a Supabase client): `finalPayable` is the function's `carry.payable`. Only for an answer without it (a function deployed before 12 Nov 2026) is it still charge + carry-in debt - carry-in credit over the function's own three figures.
- `src/lib/tuitionRows.ts`: `payableFromFunction`; `tuitionRowCells` words every cell of a row. Payable is the function's; the older-function figure is used only when the function sent none, and never for a pending or unavailable row.
- `siblingUnresolved: true` (bulk) or `siblingState.status === "unresolved"` (single) makes the row "Being calculated": no figure shown, Record Pay off, and the page asks again with the bounded backoff (`siblingRetryDelayMs`: 3 s doubling to 30 s, 8 attempts). An answer with neither field is an ordinary row, as before.
- `fetchBulkTuition` now sends its batches one after another. Sent together, each batch asked `compute-sibling-discounts` for its families and found the month lock busy - which is what produced "unresolved" in the first place (review F3). This also applies to the Finance tab, which uses the same function: with more than 150 students it loads in sequence.
- The Finance tab's own rows are otherwise unchanged. It still shows an unresolved family's provisional figure with no flag; that is its existing behaviour and outside this fix.

Tests for both shapes: `scripts/tuitionRows.test.ts`, "Payable: the function's carry.payable, or the older function's three figures" and "the two shapes of an unresolved family discount".

## 4. F2 - what ships to main

`origin/main` (0f372a6) lacks three files the page imports: `src/hooks/useIvory.ts`, `src/lib/tuitionRows.ts`, `src/lib/liveTuitionItem.ts`. Checked by bundling the page with esbuild and asking git for each of its 29 source files (scratch script, not committed): 0 errors, exactly those three missing.

`useIvory.ts` is 11 lines: `createContext(false)` and `useContext`. It imports only React. With no provider (main has no `<IvoryScope>`) it returns false, so every `iv(new, old)` picks the old class string and `Badge` takes `outline` / `secondary`, both of which main's `badge.tsx` has. The other files the page pulls in that differ from main are the conductor branch's restyled `ui/*` primitives and `utils.ts`; the page does not need those versions.

## 5. The four surviving mutations, and the minors

Mutations re-run against `scripts/tuitionRows.test.ts` (scratch script, each applied, tested, restored):

| # | Mutation | Result |
|---|---|---|
| M10 | Payable sign flipped in the older-function fallback | caught |
| M10b | `carry.payable` ignored (always the sum) | caught |
| M11 | Balance cell shows the prior balance (in the page) | caught |
| M11b | balance cell built from the carry-in (in the mapper) | caught |
| M12 | Record Pay enabled without figures (in the page) | caught |
| M12b | `canRecordPay` always true (in the mapper) | caught |
| M13 | `balance = payable - paid` put back in the page | caught |
| M14 | older-function payable shown for an unresolved row | caught |
| M15 | `siblingUnresolved` ignored | caught |

How: the cells moved out of the JSX into `tuitionRowCells` (unit-tested with seven different numbers, so a cell wired to the wrong figure fails). The page is then checked as source: each labelled `<FinanceCell>` must take `cells.<same name>.text`, there must be exactly six, Record Pay must carry `disabled={!cells.canRecordPay || refreshing}`, no `from("invoices")`, and no arithmetic on a line naming a money figure (the three row/retry counts are allowed by exact text, each required to be present once). A source check is weaker than rendering the page; there is no component-render harness in the unit tests, and the preview harness (section 6) covers the rendered text.

- M8 in the pgtest (credit accepted with amount 0): tightened to require `amount > 0`.
- F3 (unresolved shown unflagged): closed by T1's flag plus section 3.
- F4 (no retry on failure): the failure state is now the Finance tab's block with a Retry button.
- F5 (second payment inside the refresh window): Record Pay is disabled while the list is refetching.
- F6, F7: section 5 above.
- F8: the SQL header now says it cannot show a stale saved total or a row cap.

## 6. Verification (final tree)

- `node scripts/pgtest/run.mjs`: 3,416 assertions across 40 suites, 0 failed, exit 0. Of these: tuition prior balance 267, invoice status 188 (golden file untouched), dated enrollment discounts 22, shared-module mirrors 13, edge functions typecheck 5.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npx --yes bun test scripts/tuitionRows.test.ts`: 46 pass, 0 fail.
- One assertion of T1's `invoice-status.test.mjs` pinned the source text of the payable line in `useLiveTuitionData.ts`. The line moved to `src/lib/liveTuitionItem.ts` and now prefers the function's figure, so that check was rewritten to the new place and the new rule (two assertions instead of one). It failed in the run before I rewrote it; nothing else failed in any run.
- Preview harness on the round-2 code (`C:\Users\Dell\hec-tools\t3-out\after-r2.json|log`; the fake's bulk answers are the real handler's, regenerated with `carry.payable` and `siblingUnresolved`):
  - 14 of 16 rows on `/tuition` are text-identical to round 1 and to the Finance tab where it lists them.
  - Case 14 and Case 15 (the family whose discount is unresolved) now read "Being calculated" in every cell, with Record Pay disabled, and the page asked the calculator again by itself (3 bulk calls in the run: the load and two retries). In round 1 they showed the undiscounted 1,440,000 with no sign. The Finance tab still shows 1,440,000 for them.
  - Case 16 (calculator error): "Not available", Record Pay disabled, as in round 1.
  - The Finance tab's rows are identical to round 1.
- Not run: the page in a real browser against the deployed function; the Ivory rendering of the page; more than 150 students in a browser (sequential batches).

## What an admin sees, beyond round 1

- A family whose sibling discount is still being decided shows "Being calculated" on `/tuition` for a few seconds and then fills in by itself, instead of a charge without the discount.
- If the calculator fails, the page shows "Couldn't load tuition" with a Retry button.
- Record Pay is greyed out for a moment while the list refreshes after a payment.
- Once the bulk function is redeployed, students who were losing arrears or lessons to the row cap (if any were) show the right figures on both `/tuition` and the Finance tab. Whether any were depends on the live `max-rows` and the school's size; I could not look.

## Deploy order

Either order works. The browser reads `carry.payable` and `siblingUnresolved` when the function sends them and behaves as before when it does not; the function's new fields are additions. The row-cap fix takes effect only when `calculate-tuition-bulk` is redeployed.

## Files

For main (browser):
- `src/components/admin/AdminTuitionList.tsx`
- `src/hooks/useLiveTuitionData.ts`
- `src/lib/tuitionRows.ts` (new)
- `src/lib/liveTuitionItem.ts` (new)
- `src/hooks/useIvory.ts` (new on main; unchanged from the conductor branch)

Functions to redeploy:
- `calculate-tuition-bulk` (this change: paging; plus T1's `carry.payable` / `siblingUnresolved`, with `_lib/invoice-status.ts`)
- `calculate-tuition` is T1's, not changed here.

Tests and documents:
- `scripts/tuitionRows.test.ts`, `scripts/pgtest/tuition-prior-balance.test.mjs`, `scripts/pgtest/run.mjs` (the "tuition prior balance" entry)
- `scripts/pgtest/enrollment-discounts.test.mjs`, `scripts/pgtest/invoice-status.test.mjs` (stand-ins page; the source check)
- `scripts/CHECK-prior-balance-differences.sql`
- `docs/evidence/T3-prior-balance.md`, `docs/evidence/T3-round2.md`

No migration.
