# REMOVE: voluntary contributions and Settle Bill

Owner's order, verbatim (D-23, 2026-11-16): "remove voluntary contributions entirely. remove settle bill also entirely."

**Where I am / next step:** BUILT AND TESTED, nothing deployed, pushed or applied; no database touched. Next (conductor): deploy the three functions below, merge the branch, edit AGENTS.md with the text in section 6, and later remove the calculators' write-off reader (section 5).

Branch `worktree-agent-a691e69d8dce8ffe6`, started from `claude/hec-conductor-setup-efbaa5` @ 3e636879 (the worktree had been cut from main; I reset it onto the conductor branch rather than merge main's 7 HEC Docs commits into it).

## THE RULE, and how it holds

Past records stay exactly as they are and keep counting where they count. Only the ways to CREATE new ones go.

- No migration. The `settlements` table, its CHECK constraint (`20251024050029`, still allows `discount`, `voluntary_contribution`, `unapplied_cash`) and its 4 rows are untouched.
- No ledger row, invoice, payment or settlement is rewritten or deleted by anything here. Ledger balances, carry, labels and report totals do not move.
- calculate-tuition, calculate-tuition-bulk, `_lib/invoice-status.ts`, `src/lib/invoiceStatus.ts`, `_lib/projected-per-class.ts`, class fee and D4 files: not touched. `scripts/pgtest/fixtures/tuition-figures.golden.json`: not touched, and the invoice-status suite still compares every figure with it (green).
- Guards kept as they were: compare-and-set on `recorded_payment` (`_lib/recorded-payment-write.ts`), payment-month confirmation (`useTuitionMonthConfirmation`), frozen bills, family-payment's refusal of a remainder with no instruction. One guard ADDED (below): a leftover that cannot be posted now fails loudly.

## 1. Voluntary contributions - removed

### Functions

`family-payment` and `smart-family-payment`:
- `leftoverHandling` accepts only `'unapplied_cash'` (`z.enum(['unapplied_cash'])`); `consentGiven` is gone from both schemas.
- A request that still sends `leftoverHandling: 'voluntary_contribution'` (a tab opened before the removal) is answered **400** with `"Voluntary contributions have been removed. Money paid beyond what the bills owe is kept as unapplied cash. Nothing was recorded: reload the page and post the payment again."` It is checked straight after the body is read, before the first write (smart-family-payment's audit row included). It is never turned into something else. Before this, smart-family-payment silently treated a voluntary request without consent as unapplied cash.
- The voluntary branch (DR CASH/BANK credit / REVENUE debit, keys `family-contribution-` / `smart-family-contribution-`) is deleted.
- family-payment still refuses a remainder sent with no `leftoverHandling` (400, nothing written); its message now asks for `'unapplied_cash'` instead of offering a choice. smart-family-payment still defaults an omitted value to unapplied cash, as before.

### What "unapplied cash" actually does (read from the code - it is NOT credit carried on the family's bills)

Money beyond what the bills owe is posted to the ledger as customer credit: one transaction, **DR AR / CR CREDIT**, keyed `family-credit-<payment>-...` or `smart-family-credit-<payment>-...`, on the ledger accounts of ONE child: family-payment's first selected student, smart-family-payment's sibling with the highest debt (listed first). It is **not put on any bill**: `recorded_payment`, the carry (`carry_out_credit`) and the label do not change, so the tuition screens and the next month's carry-in do not show it. Nothing in the app reads the CREDIT ledger account back onto a bill. (family-payment's Manual split is different: an amount above what is owed goes on the bill and becomes credit through the carry.)

The conductor's brief called this path "credit carried to the family". It is not; I did not change what it does (that would be a new money behaviour), I made the screens say what it is. If the owner wants a family's overpayment to carry as credit on the bills, that is a separate decision.

Added guard: the leftover is posted only after the child's AR and CREDIT accounts are made sure of (the same upsert the allocation loop uses), and a failed leftover insert is now an error (`"Payment posted, but the N left over could not be recorded as unapplied cash: ..."`). Before, when the child had had nothing allocated, the accounts could be missing and the insert, whose error was never checked, dropped the leftover without a word while the payment row kept the full amount.

### Screens

| file | change |
|---|---|
| `src/components/admin/SmartFamilyPaymentModal.tsx` (mounted: Finance tab, Tuition page) | the radio choice and the consent checkbox are gone; the leftover alert says: "It will be kept as unapplied cash: recorded in the ledger as a credit on <child>'s account (the child listed first). It is not put on any bill, so the bills and their balances will not show it." No longer sends `consentGiven`. |
| `src/components/admin/FamilyPaymentModal.tsx` (NOT mounted anywhere in the app - dead code, changed as asked) | same, naming the first selected student |
| `src/components/admin/BatchFamilyPaymentModal.tsx` | already sent `unapplied_cash`; drops `consentGiven: false`. It never offered the voluntary option. Its "Settle" / "Settle all" buttons fill the amount with the debt (a payment), they are not Settle Bill and stay. |
| `src/components/admin/VoluntaryContributionRepair.tsx` | **deleted** (it deleted contribution ledger rows and re-posted them as `repaired-contribution-...`) |
| `src/components/admin/tabs/AutomationTab.tsx` | only the import and the "Voluntary Contribution Repair" card removed |
| `src/components/admin/LedgerBalanceInspector.tsx` | the list stays as history, titled "Voluntary contributions (no longer offered)", "History only: ... They stay in the ledger as they are." Its per-row Undo button, the "Reverse Contribution" dialog and `handleReverseContribution` are removed. **Judgement call beyond the brief** (which said to remove only controls that create or re-attach): that control HARD-DELETED every ledger row of the transaction (`delete().eq('tx_id', ...)`), i.e. it rewrote history and changed ledger balances, which THE RULE forbids. Separate commit (bf2beea0) if the conductor wants it back. |
| `src/components/admin/FamilyPaymentActivityLog.tsx` | the badge on a past contribution reads "Voluntary contribution (no longer offered)" |
| `src/components/admin/PaymentIntegrityRepair.tsx` | the scan still lists contribution legs on AR, worded as history ("... (history: contributions are no longer offered)", fix "None - kept as recorded; Repair All does not change them"). Repair All never acted on them and still does not. |
| `OperationalReports.tsx` | nothing there reads contributions; unchanged |

## 2. Settle Bill - removed

- `src/components/admin/SettleBillModal.tsx` **deleted**. Its only opener, the admin's "Settle Bill" button in `src/components/student/StudentTuitionTab.tsx`, is removed with the modal mount and the student-name query that existed only for the modal. No other button, menu item or `invoke('settle-bill')` exists in `src`.
- `supabase/functions/settle-bill/index.ts` is now a stub: OPTIONS answers the CORS preflight as before; every other request is **410** `{"error":"Settle bill has been removed"}` with CORS headers. It imports nothing, reads no environment, makes no client, never reads the request body. `supabase/config.toml` keeps `[functions.settle-bill] verify_jwt = true`, so a call with no token is still 401 at the gateway.
- Shared helpers: settle-bill imported only `WRITE_OFF_KEY_PREFIX` from `_lib/invoice-status.ts`. That constant and `settledWriteOff` are still used by both calculators (the reader, section 5), so nothing was deleted from `_lib`.
- `scripts/functionError.test.ts`: the SettleBillModal entry is dropped from "every screen that calls a payment function shows its sentence".

## 3. What remains for history, and why

| what | why it stays |
|---|---|
| `settlements` table, CHECK constraint, the 4 rows (2 `discount` 304,000; 2 `voluntary_contribution` 40,000) | THE RULE; no writer is left (grep proof in the suite) |
| their ledger legs (`settlement-discount-` x2, `settlement-contribution-` x2; the 4 "Voluntary contribution" legs, 80,000 both legs) | keep counting in ledger balances as today |
| `delete-payment`'s `keyKind` still recognising `family-contribution-` and `smart-family-contribution-` (and the `-credit-` keys) | so a payment made before the removal that had a contribution leftover is still deleted WHOLE: every leg reversed with new rows, the reversal balanced, only the allocation taken off the bill. Without them delete-payment would reverse the allocation and leave the contribution legs standing, unbalanced. File not changed (so it need not be redeployed). |
| reversal of a settlement | there is none and there never was in delete-payment: settlements are keyed `settlement-...`, not by a payment id, so delete-payment never finds or touches them. The only "reversal" of a contribution was the inspector's hard delete, now removed. The 4 settlements therefore have no undo path, which is what THE RULE asks. |
| calculators' write-off reader (`settledWriteOff`, `WRITE_OFF_KEY_PREFIX`, the settlements read) | follow-up, another agent is in those files; counts nothing on live (0 `settlement-writeoff-` rows) |
| the history lists in LedgerBalanceInspector, FamilyPaymentActivityLog, PaymentIntegrityRepair | showing past rows as history |
| `settle-bill` deployed as a stub | so an old tab cannot reach the old function |

## 4. Tests

`scripts/pgtest/invoice-status.test.mjs` HAD to change: it ran the real settle-bill handler in 14 places (a 410 stub cannot pass "write-off accepted"). Changed only those cases; every other case and the golden comparison are byte-for-byte as they were.
- Each settle-bill call now asserts **410, nothing written** (no memory write, no invoice write, the bill unchanged): write-off in full, in part, on a family with history, voluntary conversion, unapplied cash, during a concurrent payment.
- The calculator behaviour those cases covered (a counted write-off lowers the charge, in part / in full, capped at the month's charge, ignored on a frozen bill, sends a confirmed bill to review, both calculators agree) is kept by putting a past write-off in the fixture exactly as the T4 settle-bill wrote it (`historicWriteOff`: the settlements row plus its `settlement-writeoff-` ledger pair). The "old settle-bill key does not count" and "legs unreadable: fail" cases are unchanged.
- Dropped: settle-bill's own refusals (second write-off of a month, sibling discount unresolved, "no credit balance") - that function no longer exists.
- New section "D-23": voluntary asked of smart-family-payment with consent / without consent, of family-payment: 400, "removed", nothing written (audit row included); an unknown option: 400; family-payment 500,000 against 400,000 owed: 400,000 on the bill, paid, the 100,000 a DR AR / CR CREDIT pair, nothing to REVENUE, `carry_out_credit` 0; the same for smart-family-payment; a leftover with no ledger account: fails loudly.

New suite `scripts/pgtest/removed-money-features.test.mjs` (registered in `run.mjs`, `expect: 35`):
- the stub run for real: imports nothing; OPTIONS 200 with CORS; write-off / voluntary / unapplied / empty body / malformed body / GET all 410 with the exact body; `req.bodyUsed` false; `Deno.env` and `fetch` trapped and never touched; config keeps `verify_jwt = true`.
- grep proof over 625 app files and 105 function files: no write to `settlements`; its only readers are the two calculators; no `tx_key` template containing `contribution` or `settlement-`; nothing puts `WRITE_OFF_KEY_PREFIX` into a key; no payment function posts to REVENUE; no screen invokes settle-bill; SettleBillModal and VoluntaryContributionRepair gone and unimported; `voluntary_contribution` appears in `src` only in FamilyPaymentActivityLog (history), `consentGiven` nowhere; both functions' enum is `['unapplied_cash']` with the refusal before the first write; delete-payment still knows the contribution keys; no SQL in 256 migration / installed files inserts into settlements; only the original migration mentions `settlement_type`.
- the write-off assumption: `scripts/CHECK-writeoff-reader-removal.sql` (new, SELECT only) run on a copy of the two tables shaped like live (2 old-kind discounts, 2 contributions, synthetic amounts): 0 legs, 0 counted; with one `settlement-writeoff-` leg added it reads 1 and its amount. The golden figures contain no "Settle Bill write-off" line, no `settlement-writeoff`, no `isSettlement`.

### Results (run once at the end, on this branch)

RESULTS_PLACEHOLDER

## 5. Follow-up: removing the calculators' write-off reader (NOT done here)

Precondition: `scripts/CHECK-writeoff-reader-removal.sql` on live reads 0 and 0 (the conductor read 0 `settlement-writeoff-` rows on 16 Nov). Line numbers at 3e636879 / this branch (the files are unchanged here):

`supabase/functions/calculate-tuition/index.ts`
- 14-15: `settledWriteOff,` and `WRITE_OFF_NAME,` in the `_lib/invoice-status.ts` import
- 117: `settlementsRes,` in the `Promise.all` destructuring, and 156-162: its query (`// Settle Bill write-offs of this month ...`, `.from("settlements") ... .eq("settlement_type", "discount"),`)
- 186: `if (settlementsRes.error) throw new Error("Unable to read the month's settlements");`
- 187-195: the comment and the `settlementTxIds` / `settlementLegs` / `ledger_entries` read
- 421-429: the comment, `const writeOff = Math.min(settledWriteOff(...), totalAmount);` and the `if (writeOff > 0 && ...)` block pushing the `WRITE_OFF_NAME` discount line
- line 182-183 comment "a discount, bonus or write-off silently left out": drop "or write-off"

`supabase/functions/calculate-tuition-bulk/index.ts`
- 7: `settledWriteOff` from the import (keep `monthPayable`)
- 217-235: `// 8b. Settle Bill write-offs ...`, `allSettlements`, `settlementLegs`, `settlementsByStudent`
- 386-392: the comment, `const writeOff = ...` and its `if` block (keep line 387 `const frozenInv = currentInvoiceMap.get(sid);` if it is still used below - it is, by the frozen-bill block that follows)

`supabase/functions/_lib/invoice-status.ts` (149-187) and its mirror `src/lib/invoiceStatus.ts` (150-188), together (mirror test): the "settle bill" section - `WRITE_OFF_KEY_PREFIX`, `WRITE_OFF_NAME`, `settledWriteOff`; also the stale comments at 47 / 48 ("settle-bill," in the writers list) and 76 / 77 ("a charge written off in full by Settle Bill").

Tests to change with it: `invoice-status.test.mjs` - the `historicWriteOff` cases (they would then assert the write-off does NOT count), the "old settle-bill" loop, "the same row with the T4 key counts", "legs cannot be read", "the month's settlements cannot be read", and the r2 assertion "the write-off filter is applied in one place"; `removed-money-features.test.mjs` - "the only readers left are the two calculators" (becomes "no reader") and the last assertion on `WRITE_OFF_KEY_PREFIX`. Redeploy calculate-tuition, calculate-tuition-bulk and every function that uploads `_lib/invoice-status.ts`.

## 6. Proposed replacement text for root AGENTS.md (conductor edits)

In "# Bill status labels", replace the paragraph starting "- A Settle Bill write-off is a discount line in BOTH calculators ..." with:

> - Settle Bill and voluntary contributions are REMOVED (owner, D-23, 16 Nov 2026). `settle-bill` is a stub that answers 410 `{ error: "Settle bill has been removed" }` to every request and touches no data; it stays deployed so a tab opened before the removal cannot reach the old function. Nothing may create a settlement or a contribution again: no screen, function, RPC or migration writes `settlements`, and no ledger key contains `contribution` or `settlement-` (`removed-money-features.test.mjs` greps for it). The 4 past settlements and their ledger legs stay exactly as they are and keep counting where they count; the settlements CHECK constraint stays. The calculators still read `'discount'` settlements keyed `settlement-writeoff-` (`settledWriteOff`) until that reader is removed; live has none, and `scripts/CHECK-writeoff-reader-removal.sql` must read 0 before it goes. delete-payment takes the payment off the bill (`recorded_payment`) as well as reversing every ledger leg, and refuses when the bill holds less than the payment put there; it still recognises the old `family-contribution-` / `smart-family-contribution-` keys so a payment made before the removal is deleted whole.

In "# Payment month", append:

> - Money a family pays beyond what the chosen bills owe has ONE outcome: unapplied cash, a DR AR / CR CREDIT ledger pair on one child's accounts. It is NOT put on any bill: `recorded_payment`, the carry and the label do not move, and no screen shows it as credit (family-payment's Manual split, by contrast, puts an excess on the bill, where the carry turns it into credit). `family-payment` and `smart-family-payment` accept only `leftoverHandling: 'unapplied_cash'` and refuse `'voluntary_contribution'` with a 400 before writing anything; never map it to something else.

## 7. Deploy (conductor)

Order: the functions, then the push (the new screens never send the removed option, so either order is safe; the stub first closes the old function soonest). Imports are written `../_lib/<name>.ts`; none of the `_lib` files listed imports another file, so each list is the full recursive closure. All three have `verify_jwt = true`; keep it. No migration, no secret, no config change.

| function | entrypoint | `_lib` files to upload with it |
|---|---|---|
| settle-bill | `supabase/functions/settle-bill/index.ts` | none (imports nothing) |
| family-payment | `supabase/functions/family-payment/index.ts` | `rate-limit.ts`, `invoice-status.ts`, `recorded-payment-write.ts` |
| smart-family-payment | `supabase/functions/smart-family-payment/index.ts` | `rate-limit.ts`, `invoice-status.ts`, `recorded-payment-write.ts` |

The three `_lib` files are unchanged by this branch (they are the conductor branch's copies); compare them with what is live before uploading. delete-payment, calculate-tuition, calculate-tuition-bulk and confirm-tuition are unchanged and need no redeploy.

Probes after deploy (counts only): an unauthenticated POST to each is 401 at the gateway; settle-bill with the public key / a signed-in call is 410 with the body above; `SELECT count(*) FROM settlements` still 4; `SELECT count(*) FROM ledger_entries WHERE tx_key LIKE 'settlement-writeoff-%'` still 0; `sum(recorded_payment)`, `sum(total_amount)` unchanged by the deploy itself; edge logs 10 minutes after: no 5xx, no boot error.

Rollback: redeploy the three from 3e636879 (`git show 3e636879:supabase/functions/<name>/index.ts`); revert the branch's screen commits.

## 8. Not verified

- No signed-in call through the deployed functions (nothing deployed).
- The screens were not opened in a browser; checked by the app type check and the source greps only.
- Whether live holds any `family-contribution-` / `smart-family-contribution-` ledger rows (the conductor's counts cover settlements and "Voluntary contribution" memos; the 4 legs match the 2 settle-bill contributions exactly, which suggests none).
- That the `_lib` copies on this branch equal the ones live today.
