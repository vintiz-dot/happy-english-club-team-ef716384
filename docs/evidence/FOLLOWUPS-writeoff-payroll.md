# Follow-ups: write-off reader removal, TA payroll fail-closed

Where I am / next step: BOTH PIECES BUILT AND TESTED; nothing deployed, pushed or applied, no database touched. Next (conductor): run `scripts/CHECK-writeoff-reader-removal.sql` on live (must read 0 and 0), deploy the three functions in section 4, merge, edit AGENTS.md with section 3's text.

Branch `worktree-agent-aaf2a2487b506103a`, started from `claude/hec-conductor-setup-efbaa5` @ efcb3a64. No migration, no secret, no config change.

## 1. Settle Bill write-off reader removed

Precondition (conductor, before deploying): `scripts/CHECK-writeoff-reader-removal.sql` on live reads 0 and 0. If not 0, do not deploy: those write-offs lower a bill today and would stop doing so.

Exact diff (nothing else in these files moved; the D4 step 2 class-fee code - `classFeeOn`, `readClassFeeHistory`, `indexClassFees`, `isMissingFeeHistory` and their call sites - is untouched, as are `frozenInv` / the frozen-bill blocks):

`supabase/functions/calculate-tuition/index.ts`
- import from `../_lib/invoice-status.ts`: `settledWriteOff,` and `WRITE_OFF_NAME,` removed (keeps `invoiceLabelFields, monthCharged, monthPayable, paidLabel`).
- Wave 1 `Promise.all`: `settlementsRes` and its `settlements` query (`settlement_type, amount, tx_id`, by student, month, `discount`) removed.
- the `settlementsRes.error` throw, the `settlementTxIds` / `settlementLegs` / `ledger_entries` read and its throw removed; the comment above the discount/bonus throws now reads "a discount or bonus silently left out".
- after `let totalAmount = Math.max(0, baseAmount - totalDiscount);`: the write-off comment, `const writeOff = ...` and the `if (writeOff > 0 && ...)` block (the `WRITE_OFF_NAME` / `isSettlement` discount line) removed.

`supabase/functions/calculate-tuition-bulk/index.ts`
- import: `settledWriteOff` removed (`monthPayable` kept).
- `// 8b. Settle Bill write-offs ...`: `allSettlements`, `settlementLegs`, `settlementsByStudent` removed.
- after `let totalAmount = ...`: the write-off comment, `const writeOff = ...` and its `if` block removed; `const frozenInv = currentInvoiceMap.get(sid);` kept (the frozen-bill block below uses it).

`supabase/functions/_lib/invoice-status.ts` and `src/lib/invoiceStatus.ts` (identical below their headers; the mirror test passes):
- the "settle bill" section removed: `WRITE_OFF_KEY_PREFIX`, `WRITE_OFF_NAME`, `settledWriteOff`.
- stale comments: `settle-bill,` dropped from the writers list; "a charge written off in full by Settle Bill, or discounted to 0" now "a charge discounted to 0".
- nothing else imported the removed names (grep: only the two calculators and the tests did).

`scripts/pgtest/fixtures/tuition-figures.golden.json`: unchanged, not regenerated; the invoice-status suite still compares every figure with it (green).

Tests changed, one assertion for one (invoice-status 257 `ok(` calls before and after, removed-money-features 32 and 32; runner expect 37 unchanged):
- `invoice-status.test.mjs`: every `historicWriteOff` case (a `discount` settlement plus its `settlement-writeoff-` ledger pair, exactly as the T4 settle-bill wrote it) now asserts the row is IGNORED: in full, in part on a part-paid bill, on a family with history, larger than the month's charge, both calculators showing no write-off line and agreeing, the confirmed bill staying `confirmed` with no before/after flag. "The same row with the T4 key counts" became "is ignored too". "Legs cannot be read" and "settlements cannot be read" became: those tables unreadable, both calculators still price the month (they read neither). The r2 grep became "no write-off reader is left" (neither calculator names `settlements`, `ledger_entries`, `settledWriteOff`, `WRITE_OFF_`; neither invoice-status copy exports them). The old-key loop, the frozen-bill case, the settle-bill 410 cases and every other case are as they were.
- `removed-money-features.test.mjs`: "the only readers left are the two calculators" became "no file reads settlements"; the `${WRITE_OFF_KEY_PREFIX}` grep widened to "nothing names WRITE_OFF_KEY_PREFIX, WRITE_OFF_NAME or settledWriteOff"; the last assertion became "gone from both copies, and the preflight still counts `settlement-writeoff-`". Header comment updated.

## 2. calculate-payroll: the assistants' loop fails closed

`supabase/functions/calculate-payroll/index.ts`
- new, module level: `class PayrollReadError extends Error {}` and `payrollReadFailed(what, cause)` (logs the database's message, returns `Payroll not calculated: <what> could not be read. Try again.`).
- the assistants list (`await aq`): error -> throw ("the teaching assistants").
- participations, held, projected: error -> throw ("a teaching assistant's lessons"). Before, all four ignored `error`, so a failed read dropped the TA (or every TA): 0 on the screen and no line booked by close-payroll-month, with a 200.
- the catch passes a `PayrollReadError` message to the caller (500); every other error is still "Failed to calculate payroll". A read that throws (not an error result) was already a 500 and still is.
- participations now read for the requested month only: `select(... , sessions!inner(date))` with `.gte("sessions.date", startDate).lt("sessions.date", nextMonthStart)`. The held / projected / cancelled reads keep their own identical date filters, so the same lessons count; only the id list in their URLs shrinks to the month's. `session_participants` has one foreign key to `sessions` (types.ts), so the embed is unambiguous. The service-role client reads it, as before.
- Unchanged: the teacher loop, the Lost Income read (still never fails the call; a display figure), every amount computation, the response shape.

Not changed, reported: other reads in this function still ignore their errors and affect teachers and TAs alike - `class_schedule_versions` (would price against "no timetable history"), `payroll_periods` (a failed read treats a closed month as open), `payroll_lines` (closed month with no frozen lines), `payroll_adjustments` (corrections silently missing), and a non-admin teacher's own-row lookup. Out of this brief; each is a candidate for the same treatment. Also: when a TA read fails on an open month, the teacher loop has already upserted teachers' `payroll_summaries` (correct figures, as on any later failure); the response itself carries no payroll.

Tests:
- both suites' Supabase stand-ins now understand an embedded `sessions!inner(...)` select with `sessions.<col>` filters (a non-inner embed does not drop the parent row, as in PostgREST) and a `failRead` hook.
- `ta-payroll.test.mjs` (108 -> 261): every caller x Sep/Oct/Nov (admin, admin naming TA_1 / TA_2 / teacher A, teacher A, teacher B, TA_1 own, TA_2 own, service role, a two-row login, a parent - 29 calls, 30+ payroll rows) byte-identical answer and identical writes to efcb3a64; the October participations read is narrowed by date and sends only October lesson ids (at efcb3a64 September's ids were in the October URL); each of the four reads x error/throw x five callers (admin Oct, admin naming TA_1, admin closed Sep, TA own, service role): 500 with the stated message, no `payrollData`, nothing of the database's words in the answer, a TA's own call writes nothing; at efcb3a64 the same failed read answered 200 without TA_1; the Lost Income read failing still answers 200.
- `teacher-payroll.test.mjs` (124 -> 134): the participations read failing (error / throw): admin's October 500 with the message; a teacher's own call (reads no assistant) unaffected; close-payroll-month refuses to close and books no payroll line, expenditure or period lock (the normal close books TA_1's line).
- Mutants, run against the TA suite: the efcb3a64 function 23 failures; `!inner` dropped 2 (the month-filter checks only - figures identical either way); the participations error check dropped 5.

## 3. Proposed replacement text for root AGENTS.md (conductor edits)

In "# Bill status labels", replace the paragraph starting "- A Settle Bill write-off is a discount line in BOTH calculators ..." (still the text at efcb3a64, line 64; it is also what `REMOVE-voluntary-and-settle.md` section 6 replaces, so this supersedes that proposal) with:

> - Settle Bill and voluntary contributions are REMOVED (owner, D-23, 16 Nov 2026). `settle-bill` is a stub that answers 410 `{ error: "Settle bill has been removed" }` to every request and touches no data; it stays deployed so a tab opened before the removal cannot reach the old function. Nothing may create a settlement or a contribution again: no screen, function, RPC or migration writes `settlements`, and no ledger key contains `contribution` or `settlement-` (`removed-money-features.test.mjs` greps for it). The 4 past settlements and their ledger legs stay exactly as they are in the ledger; the settlements CHECK constraint stays. Neither calculator reads `settlements` any more: the write-off reader (`settledWriteOff`, `WRITE_OFF_KEY_PREFIX`) was removed after `scripts/CHECK-writeoff-reader-removal.sql` read 0 on live, so no past write-off, of either key, lowers a bill. Do not add a reader back. delete-payment takes the payment off the bill (`recorded_payment`) as well as reversing every ledger leg, and refuses when the bill holds less than the payment put there; it still recognises the old `family-contribution-` / `smart-family-contribution-` keys so a payment made before the removal is deleted whole.

(If the conductor has meanwhile installed section 6's text from `REMOVE-voluntary-and-settle.md`, replace only its sentence "The calculators still read ... before it goes." with the two sentences "Neither calculator reads ... Do not add a reader back." above, and "keep counting where they count" with "stay exactly as they are in the ledger".)

In "# Payroll is computed in ONE place", append:

> - Every read in calculate-payroll's assistants loop (the TA list, their participations, held and projected lessons) fails the call like the teacher loop's: a 500 with `Payroll not calculated: ... could not be read`, never an answer without that person (a dropped TA was 0 on the screen and missing from the month close). Only the cancelled-lessons read for Lost Income may fail quietly. Participations are read for the requested month (`sessions!inner(date)`), so the lesson-id URL does not grow with a TA's history.

## 4. Deploy (conductor)

Imports are written `../_lib/<name>.ts`; none of the `_lib` files listed imports another local file (auth.ts imports only supabase-js), so each list is the full closure. Keep `verify_jwt` as configured. No migration.

| function | why | `_lib` files to upload with it |
|---|---|---|
| calculate-tuition | reader removed | `rate-limit.ts`, `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `class-fee.ts`, `invoice-status.ts` |
| calculate-tuition-bulk | reader removed | `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `invoice-status.ts`, `class-fee.ts` |
| calculate-payroll | TA loop fail-closed, month filter | `pay-rate.ts`, `pay-history.ts`, `auth.ts`, `payroll-sessions.ts` |

Optional, no behaviour change (they bundle `invoice-status.ts` but use none of the removed names): confirm-tuition (`auth.ts`, `invoice-status.ts`), delete-payment (`invoice-status.ts`, `recorded-payment-write.ts`), family-payment and smart-family-payment (`invoice-status.ts`, `rate-limit.ts`, `recorded-payment-write.ts`). Redeploy them only to keep the live `_lib` copy identical.

The two calculators also carry D4 step 2's class-fee code; if another agent redeploys them, deploy from one merged tree so neither change undoes the other. Compare the `_lib` copies with what is live before uploading.

Probes after deploy (counts only): `SELECT count(*) FROM ledger_entries WHERE tx_key LIKE 'settlement-writeoff-%'` still 0; `sum(total_amount)` over invoices unchanged by the deploy; the admin Payroll screen for the current month shows the same total as before the deploy; edge logs 10 minutes after: no 5xx, no boot error, no `Payroll read failed`.

Rollback: redeploy the three from efcb3a64 (`git show efcb3a64:supabase/functions/<name>/index.ts`, same `_lib` files from that commit).

- `s2-edge-functions.test.mjs`: its F-04 "BEFORE" bundles calculate-tuition-bulk as at 5594ca32, which imports `settledWriteOff`; that build now takes 5594ca32's own `_lib/invoice-status.ts` (`both(name, ["invoice-status"])`). No assertion changed (107).

## 5. Checks (this branch)

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` (with the clock-back-8h shim; 03:10 Hanoi) | 7748 assertions across 86 suites, 2 failed: **S2 edge functions** (a real break from this branch - the BASE build above; fixed, rerun alone 107 passed, 0 failed) and **recorder engine** (hung over 35 minutes under a loaded machine - another worktree's copy of the same suite hung alongside it; I stopped my own run of it; untouched by this branch, rerun alone below). Invoice status 317 (golden compared, file unchanged), removed money features 37, shared-module mirrors 19, edge functions typecheck 5, app typecheck 3, teacher payroll function 134, TA payroll function 261, teacher payroll view 94, payroll rows 69 |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0, 0 `error TS` |
| `npm run test:bun` | 250 pass, 0 fail, 1801 expect() calls, 18 files |
| `git diff efcb3a64 -- scripts/pgtest/fixtures` | empty |
| `node scripts/recorder/unit.test.mjs` alone, no shim, 15-minute limit | timed out: 380 PASS, 0 FAIL, stalled at "N-B1 (P2b): offline for the whole capture window". No recorder file is in this branch's diff and the suite imports none of the changed files; it stalled the same way in another worktree at the same time, so this looks like machine load (many suites running in parallel), not this change. NOT verified green here. |

## 6. Not verified

- Nothing deployed; no call through a deployed function. The `sessions!inner(date)` embed and `sessions.date` filters are standard PostgREST, exercised here only by the test stand-in, not by a real PostgREST.
- The live zero-write-off count is the conductor's 16 Nov reading; the preflight must be rerun before deploying.
- That the live copies of the three functions and their `_lib` files equal efcb3a64's.
