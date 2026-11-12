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

## Row order

**Where I am / next step:** code, test and this write-up done on branch `release/tuition-1b` (cut from 9804590; `release/tuition-1` is checked out in another worktree, so the work could not go on it directly). Next: the three checks on the final tree, then the numbers below.

Why: the paged reads return rows in `id` order. The pre-deploy probe found one pair of overlapping enrollments of one student in one class (7 days, 2025-11; same override, days and discount; ids in the reverse of creation order). Which row prices a shared lesson must not depend on how the rows were fetched.

### Order-dependent places (line numbers are this branch's)

Result depends on row order - fixed:

| # | where | what |
|---|---|---|
| 1 | `calculate-tuition-bulk/index.ts:298` (was `enrollments.find`, `:295`) | the FIRST enrollment of the class covering the lesson's date decides its allowed days (billed or skipped), override rate (the saving) and discount terms. Rows came in id order. |
| 2 | `calculate-tuition/index.ts:240` (was `.find`, `:236`) | the same pick, over a query with NO `ORDER BY` (`:119-124`): whatever order Postgres returned. |
| 3 | `calculate-tuition/index.ts:312` | `enrollments.find(class)` for the WORDS of the "Rate Adjustment" line (`overrideRate`, `savingsPerSession`). Not a charged figure; now reads the same sorted list, so it is stable too. |

Reads row order but cannot change a figure - left as they are:

| where | why it is safe |
|---|---|
| bulk `:126` students, `:157` classes (maps by `id`) | primary key: one row per key |
| bulk `:192` attendance map, last row wins per session+student; single `:216` | `attendance UNIQUE(session_id, student_id)` (20251012062405:12) |
| bulk `:232` sibling state map; single `:192` `states[0]`; `_lib/sibling-state.ts:15,32,39` `.some` | `sibling_discount_state PRIMARY KEY (family_id, month)` (20251012080009:10); `.some` is a yes/no |
| bulk `:243` invoices sorted by month, then the "settled in" walk; `:265` this month's bill map | `invoices UNIQUE(student_id, month)`: no ties to break |
| bulk prior charges / payments (`reduce`), student discounts, referral bonuses | sums of whole dong, each amount rounded on its own from the month's base: any order gives the same total |
| `_lib/enrollment-discounts.ts` `enrollmentDiscounts` | groups by the terms themselves; the group's first row supplies only those same terms; one rounding per group |
| bulk `:288` lessons gathered class by class; `:315` class breakdown in first-seen order | sums only. The ORDER of `breakdown.classes` follows the enrollments, so it is now creation order (stable). In calculate-tuition it follows the sessions query, which has no `ORDER BY`: the list order there (and of `sessionDetails`) is still the database's. No figure; not changed, to keep this change small. |

### The rule

The enrollment **created first** wins: rows sorted by `created_at`, then `id`, before use. One helper for both functions, in `_lib/enrollment-discounts.ts` (already uploaded with both): `inCreationOrder(rows)` and `enrollmentOn(ordered, classId, date)`. Both selects gained `created_at` (and calculate-tuition `id`); `enrollments.created_at` is `timestamptz NOT NULL DEFAULT now()`.

Why this reproduces present behaviour: calculate-tuition reads with no `ORDER BY`, and so did the bulk function until this release; for rows still lying in the table in the order they were inserted, that is creation order, so "first created" is the row both have been picking. For the live pair the release as reviewed (id order) would have picked the other row; with this it picks the same row as before. Their terms are identical, so no figure moves either way. What I cannot know from here: Postgres does not promise that order (an updated row can move), so for some pair the old pick may have been the other row. calculate-tuition relied on the unordered query; both now share the explicit rule.

Ties: same `created_at` to the millisecond falls to the text (Postgres keeps microseconds), then to the lower `id`. A row without `created_at` (impossible in the table) sorts last, as a NULL does.

No pricing rule changed. Frozen bills: untouched (the frozen branch reads the saved figures after this point, as before). No shared-module pair touched.

### Test - `scripts/pgtest/enrollment-order.test.mjs` (new; "enrollment row order" in run.mjs)

Real handlers, the stand-in of `enrollment-discounts.test.mjs`. Two enrollments of one class, the first to 14 Nov, the second from 8 Nov (lessons on 12 and 14 Nov belong to both), 8 lessons at 100,000. Each fixture seeded four ways: ids following / reversing creation order x the unordered read handing over the older / the newer row first.

| fixture | base | discount | if the later row had won |
|---|---|---|---|
| (a) identical terms (override 80,000, Wed+Fri, 5%) | 800,000 | 200,000 | same |
| (b) different rates (80,000 then 60,000) | 800,000 | 240,000 | 280,000 |
| (c) different days and discount (Wed 10%, then Wed+Fri 20%) | 600,000 | 100,000 | base 700,000 |
| created microseconds apart | 800,000 | 240,000 | 280,000 |
| same `created_at`: the lower id wins | - | 240,000 or 280,000 by id | - |

In every seeding: bulk deep-equals per-student (base, discount, charge, payable, carry-out, class amounts), both equal the expected figures, and the bill calculate-tuition saves carries them. With the sort taken out (helper returning the rows as given) the suite fails at "different rates [ids follow creation, unordered read newest first]: bulk and per-student agree".
