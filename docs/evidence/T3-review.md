VERDICT: PASS WITH CHANGES

Where I am / next step: COMPLETE. Reviewed `worktree-agent-a34c3c84114092f37` @ 2a5bf2e. I changed nothing but this file. Probes are in `.probe/` of my worktree (not committed).

Counts: 0 BLOCKER, 2 MAJOR, 6 MINOR.

Two things must be settled before the fix goes to main (both small):
- **C1 (for F1)** - the owner or the conductor confirms the live project's row cap does not bite the bulk calculator (one look, below), OR `BATCH_SIZE` in `fetchBulkTuition` goes down and the batches run one after another.
- **C2 (for F2)** - `src/hooks/useIvory.ts` ships with it (11 lines, harmless on its own), or the fix waits for the conductor branch.

Everything else can follow.

## What an admin will see change, and for which families

On `/tuition` (and `/students/:id/tuition`, which is the same list) the figures become the ones the Finance tab already shows. Most families do not move. A child with no bill saved yet for the month used to read as charged 0 (so only old arrears, or "Open"); they now show the month's lessons and the full amount owed. A child whose saved bill is behind the register (a lesson marked since the bill was last worked out) now shows the register's charge, so a "Settled" can turn into "Underpaid" by one lesson, or the other way. A month paid off by money recorded on a later month now says "Settled in <month>" instead of "Unpaid"; the amounts are the same. A child the calculator cannot answer for shows "Not available" everywhere and cannot be paid from this page. In a family whose sibling discount is being re-decided at that very moment, the page can briefly show the charge without the discount, with nothing to say so - as the Finance tab does today. Recording a payment for a child with no bill now creates the bill with the month's real charge instead of 0. The page also refreshes itself after a payment, and the Review Queue count and confirmation filter work.

## Findings

### F1 - MAJOR (the calculator's, inherited; new exposure for this screen): the bulk calculator is itself short past the row cap
`supabase/functions/calculate-tuition-bulk/index.ts:39-58` (`fetchChunked`, no paging), used for history at `199-204` and attendance at `143-150`. The evidence table's last line ("whole-school history past the row cap ... DIFFERS") compares the old browser sum with the PER-STUDENT calculator (`tuition-prior-balance.test.mjs:249-250`), which the fix does not read. I ran the bulk handler under the same cap (`.probe/cap-probe.test.mjs`, the author's test plus two calls):

```
PROBE bulk under 1000-row cap: answered 60 short 10 sample carryInDebt [ 0, 0, 0 ]
PROBE attendance all Present, 150 students: uncapped charge distribution {"1440000":150} capped {"0":25,"1440000":125}
```

So for that case the fix replaces one wrong number with the same wrong number: the same 10 of 60 students lose their 2,000,000 arrears. And there is a second cap the old screen did not have: attendance. A lesson with no attendance row is not billable (`_lib/tuition-session.ts:2-5`), so when a batch's attendance for the month passes the cap, the last students are charged 0. The old `/tuition` showed the SAVED bill there, written by the per-student calculator, which has no such cap. The Finance tab has had both exposures all along; whether they bite depends on the live `max-rows` (Supabase default 1,000), which cannot be seen from the repo. Thresholds with today's batch of 150: more than 1,000 earlier bills in a batch (about 7 months of history each) or more than 1,000 attendance rows in the month (about 7 marked lessons each).

On balance the fix is still no worse than before on history (old: one request for the whole school; new: 150 students per request) but it is not the cure the table suggests.

Fix, durable (calculator; the agent adding `carry.payable` is already in both files): page `fetchChunked` with `.range()` until a short page, and add a case to `tuition-prior-balance.test.mjs` that calls the BULK handler under `rowCap = 1000`.
Before shipping, one of (C1):
- a look at the live Finance tab for the current month: any enrolled child with marked lessons and a charge of 0, or arrears missing - if the school has more than about 120 enrolled children; or the owner reads `max_rows` in Supabase > Settings > API; or
- browser-only, `src/hooks/useLiveTuitionData.ts:51-66`: `BATCH_SIZE = 40` and a `for ... await` loop instead of `Promise.all` (sequential also removes F3's self-inflicted lock contention). 40 x 8 lessons = 320 attendance rows; history holds to 25 months. Still only a stopgap.

### F2 - MAJOR (shipping): the fix cannot go to main as three source files
`src/components/admin/AdminTuitionList.tsx:16` imports `@/hooks/useIvory`. `origin/main` (0f372a6) has no such file (`git cat-file -e origin/main:src/hooks/useIvory.ts` fails); it lives on the conductor branch. Shipped without it the build fails.
Fix (C2): ship `src/hooks/useIvory.ts` too. It is a context whose default is `false` and nothing on main provides it, so every `iv(new, old)` picks the old string. Checked: all 29 distinct `className` literals of main's file are present verbatim in the fixed file as the "old" branch; `Badge variant` falls to `"outline"` as on main; the three template class strings match apart from `balance > 0` becoming `balance.kind === "owed"`. So with the scope off the page looks as it does today, apart from the figures and the words listed above. The fix's own diff over R09 touches two `className` lines only (the new error sentence; `disabled` on Record Pay) and undoes none of R09.

### F3 - MINOR (new on this screen; recommend ship, flag to follow): unresolved family discount shown unflagged
Bulk `index.ts:322-329` applies the sibling discount only when the state is `assigned`; `_lib/sibling-state.ts:34-47` returns `unresolved` after about 7.5 s of a busy lock, and the bulk response carries no flag. Yes, this is new on `/tuition`: the old page read the saved bill, which is never saved while unresolved, so it showed the last settled figure (1,296,000 in case 14; the new page shows 1,440,000). The Finance tab does nothing about it today: same figure, no flag, no retry. Direction is over-stating what the family owes, by the sibling discount, until the next load. Record Pay in that window: for an existing bill it writes only `recorded_payment` and `status` (a full payment of the discounted amount is labelled `partial`); for a child with no bill it creates the bill at the undiscounted total, which the next `calculate-tuition` call rewrites. Same as from the Finance tab.
One mechanism makes it more likely than "another admin happens to be saving": with more than 150 students `fetchBulkTuition` sends its batches in parallel (`useLiveTuitionData.ts:57`), each asks `compute-sibling-discounts` for its missing families, and that function holds a per-month lock (`compute-sibling-discounts/index.ts:166`). `/tuition` sends everyone on the roster, so it crosses 150 before the Finance tab does.
Recommendation: SHIP AS IS on this point - the window is seconds, it heals on reload, and the Finance tab (where payments are taken) already has it. Next calculator deploy: `siblingUnresolved: true` per result; `tuitionRows.ts:118` and the retry at `AdminTuitionList.tsx:130-134` already act on it (unit-tested; mutation M5 caught). Sequential batches (F1's stopgap) remove the self-contention.

### F4 - MINOR: no retry on the failure screen
`AdminTuitionList.tsx:211-213`: "Tuition could not be calculated. Reload the page to try again." The app default is `retry: 1` (`App.tsx:78`), so one automatic retry, then a reload. The Finance tab has a Retry button (`AdminTuitionListEnhanced.tsx:248-260`). One failed batch fails the whole page (`useLiveTuitionData.ts:62`), as there. Fix: take `refetch` from the query and add the same button. Not a money risk: nothing is shown, and no old arithmetic remains to fall back on.

### F5 - MINOR (pre-existing, made smaller by the fix): a second payment inside the refresh window
`RecordPaymentDialog.tsx:152` patches only the exact key `["admin-tuition-live", month]`; this page's key is `[..., "everyone"]`, which is invalidated (173) and refetched. Until that answer lands the row still carries the old `recorded_payment`, and the dialog writes `alreadyPaid + amount` (42, 108, 122): a second payment for the same child in those one or two seconds would replace the first, not add to it. Before the fix this page never refreshed after a payment at all, so the window was "until reload". Fix (small): `disabled={figures.state !== "ready" || isFetching}` on Record Pay at `AdminTuitionList.tsx:385`.

### F6 - MINOR: the Payable line and the page itself have no test
Mutations M10-M13 (below) all survive: the sign of the Payable addition in `liveTuitionItem`, which cell shows which figure, the Record Pay guard, and a browser difference put back in the page. The harness comparison with the Finance tab would catch M11-M13 but it is not in `run.mjs`, and it cannot catch M10 because both screens share the line. Fix: export-free test of `liveTuitionItem` is not possible as the module imports the Supabase client; move `liveTuitionItem` next to the mapper (or assert in the pgtest, over the real bulk answers, that `payable - paid === carryOutDebt - carryOutCredit`). Goes away when `carry.payable` lands.

### F7 - MINOR: the "no arithmetic" regex test is narrower than it reads
`scripts/tuitionRows.test.ts` "the module contains no arithmetic on money" caught M3, but it only reads `tuitionRows.ts`. It does not look at `AdminTuitionList.tsx` (M13 survived). Fix: run the same regex over the page with the two known non-money hits allowed.

### F8 - MINOR: owner SQL covers one of the three reasons figures move
`scripts/CHECK-prior-balance-differences.sql` cannot show a stale saved total (case 6) or the row cap (F1); it shows the no-bill rows and stored-carry drift. Say so in its header. If the SQL editor limits output to 100 rows the count rows still come first.

## Item by item

**1. Browser arithmetic left.** `tuitionRows.ts`: none (read; regex test; M3 caught). `AdminTuitionList.tsx`: none on money - `dataUpdateCount - 1` (retry count) and `settled + overpaid`, `tuitionData.length - withDiscount` (row counts). `useLiveTuitionData.ts:95, 96, 101` are the Finance tab's old lines moved into `liveTuitionItem`; this page displays only line 95.
**Payable.** Formula: `finalPayable = carry.payable ?? totalAmount + carryInDebt - carryInCredit` (`??` binds looser than `+`, so the fallback is the whole sum). In the bulk function `carryInBalance = priorPayments - priorCharges`, credit and debt are its positive and negative parts (348-350), and `closingBalance = totalAmount - carryInBalance - monthPayments` (352). So the browser's sum is exactly `totalAmount - carryInBalance`, the function's own intermediate, over the same response, in integers: Payable - Paid equals carry-out debt minus credit by construction. It cannot disagree with what the server would say; the only risk is someone editing the line (F6). When `carry.payable` arrives: the mapper already reads it (`tuitionRows.ts:142`) and line 95 already prefers it; then delete the fallback, show "Not available" when it is absent, and have `RecordPaymentDialog.tsx:36` keep reading `finalPayable`.

**2. Disagreement cases** (`node scripts/pgtest/tuition-prior-balance.test.mjs`: 212 passed; the test bundles the real handlers with esbuild and stubs only the client, zod, auth, rate limit and `sibling-state`).
- No bill row, October short 1,000,000 (browser 1,000,000 / calculator 2,440,000): the calculator is right. Eight lessons were attended at 180,000; tuition is owed for attended lessons whether or not anyone has opened a screen that saves the bill. 0 for the month was an artefact of "no row".
- Stale saved total (7 lessons saved and paid, 8th marked): calculator right, 180,000 short. The saved total is a snapshot; AGENTS.md makes exactly one exception, the frozen bill, and case 7 shows the calculator honours it (810,000 in both).
- Row cap: here the calculator the fix reads is NOT right - see F1.
- Case 14 (unresolved): the calculator's figure is provisional - F3.

**3. Same source as the Finance tab.** Not literally the same hook or query: the Finance tab is `useLiveTuitionData` with key `["admin-tuition-live", month]` and the enrolled roster; this page has its own `useQuery` with key `[..., "everyone"]` and the whole month's roster. What is shared is `fetchBulkTuition` and `liveTuitionItem`, so for a child on both screens the row is built by the same code from the same function - the author's harness output shows the 14 shared rows cell-equal, and the Finance tab's rows identical before and after (I re-read `t3-out/before.json` and `after.json`; I did not re-run the harness). They can differ only by time (two fetches). Bounded sibling retry: wired (`siblingRetryDelayMs`, 130-134), dormant until the bulk answer carries a flag. Calls: 60 students = 1 bulk call per load and 1 per payment; the function has no rate limit (`checkRateLimit` appears 0 times in it). Before: 0 calculator calls.

**4. Loading and failure.** Loading: only "Loading tuition data...". Failure: only the sentence (F4). A row without a full answer: "Not available" in all six cells, header and badge, Record Pay disabled (`after.json` Case 16; mutation M4 caught). The file reads no `invoices` row, so there is nothing to fall back to. A child the function answers with `error` stays unpayable from this page until the function answers; the Finance tab does not list that child at all; the student page's per-student calculator remains.

**5. Side effects.** Record Pay with no bill: `RecordPaymentDialog.tsx:99-115` upserts `base_amount`, `discount_amount`, `total_amount`, `carry_in_*` from the row; the row is `liveTuitionItem` (`AdminTuitionList.tsx:123`), the same object the Finance tab passes (`AdminTuitionListEnhanced.tsx:392`, rows from `useLiveTuitionData.ts:185`). Same dialog, same write; before, this page passed 0. Review Queue / confirmation filter: `confirmation_status` now on the row; a row without figures has none and falls out of every confirmation filter but "All". Refresh after payment: one bulk call per 150 students, only for the mounted page; no storm, no rate limit to hit (F5 for the window).

**6. Statuses and filters.** Badge: Overpaid (carry-out credit > 0); Settled (no carry-out, charge > 0); "Settled in <month>" (debt, and the function's `carry.settledInMonth`: the first later month where running payments cover it, bulk 356-369); Underpaid (debt, paid > 0); Unpaid (debt, nothing paid); Open (nothing owed, charge 0); plus "Not available" / "Being calculated". Same predicate as the Finance tab (`getPaymentStatus`). The chips never partitioned the list and still do not: All; Discount / No Discount (a partition); Siblings; Paid = Settled + Overpaid; Overpaid; Underpaid; Settled. Unpaid, Open, "Settled in" and "Not available" rows appear only under All and the discount chips, as Unpaid and Open did before. One membership change to know: an Underpaid month later settled now leaves the Underpaid chip. Fixture counts from the author's runs, before -> after: Unpaid 13 -> 12, Open 1 -> 0, Settled 2 -> 1, Underpaid 0 -> 1, Settled in 2026-12 0 -> 1, Not available 0 -> 1 (16 rows both times).

**7. `/students/:id/tuition`.** `App.tsx` routes it to the same `Tuition` page, which ignores `:id`; same list, same findings. `src/pages/Tuition.tsx`, `useStudentMonthFinance`, `StudentTuitionTab` are byte-identical to origin/main: the student and parent views are untouched.

**8. Tests.** `tsc --noEmit -p tsconfig.app.json`: exit 0. `npx --yes bun test scripts/*.test.ts`: 111 pass, 0 fail. Full `node scripts/pgtest/run.mjs`: 2977 assertions across 37 suites, 0 suite(s) failed, exit 0 (the author had not run it; "tuition prior balance" is 212 of them). Mutations (`.probe/mutate.mjs`, each applied to the source, both tests run, source restored):

| # | Mutation | File | bun unit test | pgtest |
|---|---|---|---|---|
| M1 | Balance mapped to the carry-IN | tuitionRows.ts | caught | caught |
| M2 | charge mapped to baseAmount | tuitionRows.ts | caught | caught |
| M3 | payable added up in the mapper | tuitionRows.ts | caught | survived |
| M4 | a missing figure becomes 0 | tuitionRows.ts | caught | survived |
| M5 | unresolved treated as ready | tuitionRows.ts | caught | caught |
| M6 | status judged with the charge as paid | tuitionRows.ts | caught | caught |
| M7 | settledInMonth dropped | tuitionRows.ts | caught | caught |
| M8 | credit tested before debt (`credit >= 0`) | tuitionRows.ts | caught | survived |
| M9 | sort reversed | tuitionRows.ts | caught | survived |
| M10 | Payable sign flipped in liveTuitionItem | useLiveTuitionData.ts | SURVIVED | SURVIVED |
| M11 | Balance cell shows the prior balance | AdminTuitionList.tsx | SURVIVED | SURVIVED |
| M12 | Record Pay enabled without figures | AdminTuitionList.tsx | SURVIVED | SURVIVED |
| M13 | balance = payable - paid put back in the page | AdminTuitionList.tsx | SURVIVED | SURVIVED |

9 of 13 caught, all 9 in the mapper (every mapper mutation is caught by the unit test). 4 survive, all outside the mapper: nothing automated reads the page or the Payable line (F6, F7). The pgtest alone misses M8 because its Prior Bal. / Balance check accepts `kind === "credit"` with amount 0 (`tuition-prior-balance.test.mjs:231-232`); tighten it to require `amount > 0`.

**9. Owner SQL.** One `WITH ... SELECT`; no write keyword, no function beyond `now`, `to_char`, `date_trunc`, `make_interval`, `to_date`, aggregates; ids only, no names. `summed_carry_in` = sum of `recorded_payment - total_amount` over `month < this bill's month`: the old browser sum and the calculator's carry-in. `stored_carry_in` = `carry_in_credit - carry_in_debt`. Sound for what it claims (F8 for what it does not).

**10. Shipping.** Browser only: nothing under `supabase/`, no migration. Files for main:
- `src/components/admin/AdminTuitionList.tsx`
- `src/hooks/useLiveTuitionData.ts`
- `src/lib/tuitionRows.ts`
- `src/hooks/useIvory.ts` (F2; unless the conductor branch lands first)
- `scripts/tuitionRows.test.ts`, `scripts/pgtest/tuition-prior-balance.test.mjs`
- `scripts/pgtest/run.mjs`: only the "tuition prior balance" entry - the branch's file also lists suites whose migrations are not on main
- `scripts/CHECK-prior-balance-differences.sql`, `docs/evidence/T3-prior-balance.md`, this file
Everything else the page depends on (`RecordPaymentDialog`, `tuitionStatus`, `siblingRetry`, `finance/studentsInMonth`, `TuitionPageFilters`, the bulk function) is identical on origin/main.

## Checked and found sound
- No invoice read and no money arithmetic in the page or the mapper.
- The Payable addition is an identity over the function's own figures.
- Cases 4, 5, 6, 9: the calculator's figure is the right one; frozen bills hold.
- Missing or partial answers never become 0; Record Pay is off for them.
- Record Pay hands the dialog the Finance tab's row; no new write.
- Old class strings intact with the Ivory scope off; R09 not undone.
- Student and parent tuition views untouched.
- Owner SQL read-only and nameless.

## Not checked
- The live database: `max-rows`, row counts, whether migration 20261009120000 is applied, how many families move. No live access by instruction.
- I did not re-run the preview harness (the run was declined on this machine); item 6 counts and the Finance-tab equality come from the author's saved `t3-out/*.json`, which I re-read and re-counted.
- The Ivory (scope on) rendering of the page.
- Behaviour with more than 150 students in a real browser (parallel batches).
- `carry.payable` arriving: only the mapper's unit test covers it.
