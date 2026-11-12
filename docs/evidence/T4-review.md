# T4 payment paths - independent money review

Reviewed commit: 713bc1e (worktree-agent-aafcbedf13a50d197) against claude/hec-conductor-setup-efbaa5.

**Where I am / next step:** complete - verdict at the end (PASS WITH CHANGES, no blocker). Review only: no product code changed, nothing deployed or pushed; live read with aggregates only.

## 1. The rule change - measured on LIVE (13 Nov 2026, aggregates only)

State of live: 708 bills; stored labels issued 557, paid 115, partial 26, draft 10, `credit` 0. `max(invoices.updated_at)` = 12 Nov 07:41 UTC, i.e. **no bill has been written since the 13 Nov deploy**, so none of review 2's 445 relabels has happened yet (stored <> live rule: still 445).

Live rule (`recorded >= payable AND payable > 0`) versus T4 rule (`recorded >= payable AND (recorded > 0 OR greatest(base,total) > 0)`, `_lib/invoice-status.ts:102-108`):

| live rule -> T4 rule | bills | past months | frozen | confirmed/adjusted |
|---|---|---|---|---|
| issued -> paid | 16 (12 fully discounted: total 0, base > 0; 4 covered by carried-in credit) | 14 (2 in Nov 2026) | 2 | 12 |
| partial -> paid | 9 (covered/overpaid with money recorded) | 9 | 0 | 5 |
| any downgrade from paid | **0** | | | |

Months: issued->paid in 2025-12, 2026-01, -03, -04, -05, -07, -08, -09, -10, -11; partial->paid in 2025-10, -11, 2026-02, -08, -09, -10.

Stored label -> T4 rule (what the next write of each bill does): 461 change = issued->paid 372 (43 frozen), issued->partial 57, draft->paid 8, draft->issued 2, partial->paid 13, paid->issued 6, paid->partial 3. The nine "downgrades" are review 2's nine, unchanged by T4 (6 zero-charge bills with nothing recorded, 3 that already show carry-out debt); they come from the stale stored label, not from the T4 rule.

Cancellation guard (`20261112091000:307-319`, settled = recorded > 0 OR status in (paid, partial) OR confirmed/adjusted OR frozen): settled by stored labels 612; all bills on the live rule 606; all on the T4 rule 609. T4 versus live rule: **0 bills stop counting as settled; 3 start** (2026-09, -10, -11, one each; credit covers the month or fully discounted, nothing recorded, not confirmed, not frozen; all three have attendance marks). The guard is never lowered by T4; it is raised for the lessons of those three child-months (an override is asked where it was not). Acceptable, and should be told to the owner.

Consistency of the rule across writers (file:line at 713bc1e):
- calculators: `calculate-tuition/index.ts:634` (`paidLabel(monthPayments, payable, monthCharged(...))`); bulk writes nothing and reports no label.
- payment functions: `family-payment:288`, `smart-family-payment:278` and `:300`, `delete-payment:217` (all `labelAfterPayment` / `paidLabel`); settle-bill writes no bill at all now.
- confirm-tuition: imports the lib, writes `confirmation_status` only.
- browser: mirror `src/lib/invoiceStatus.ts`, registered in `scripts/pgtest/mirrors.test.mjs:33-35` (drift fails the run). grep for a restated rule (`payable > 0`, `>= payable`, literal status writes) in `src` and `supabase/functions`: none left outside the two mirrored files.
- SQL: `public.invoice_paid_label` via migration 20261113090000 (section 2). NOT consistent in one detail: `ai_action_apply` / `ai_action_undo` still overwrite an admin's `credit` label (the patched expression has no `credit` exception; `20261107090000:571-574`, `:726-729`), while the evidence says "kept by every writer". 0 `credit` bills on live. MINOR (T4-m1).
- `ai_action_apply`'s INSERT of a bill that does not exist still writes `partial` (`20261107090000:559-566`); corrected by the next calculation. Unchanged, MINOR.
- Family-facing screens and the review queue read carry-out and `confirmation_status`, not `status` (unchanged from review 2; `RecordedPaymentManager.tsx:335` is the only badge on `status`).

## 2. Migration 20261113090000_invoice_paid_label.sql

Read line by line. What it does: (a) `CREATE OR REPLACE FUNCTION public.invoice_paid_label(bigint x4)` - IMMUTABLE, `SET search_path = public`, the rule as one CASE (`:37-55`), compared with the TypeScript helper on a grid by the suite; (b) one DO block (`:60-99`) that, for `ai_action_apply(uuid, text, jsonb)` and `ai_action_undo(uuid)`, reads `pg_get_functiondef`, skips the function when the new call is already in it, requires EXACTLY ONE match of the old CASE (whitespace-tolerant regex, `:88-94`), and EXECUTEs the definition with that one expression replaced.

**Will it apply on live as-is? YES.** Measured on live before applying (read-only): both signatures resolve; the migration's own regex finds exactly 1 match in each function; neither is already patched; `'paid'` appears once in each; both `UPDATE public.invoices SET` statements are unaliased, so the replacement's `invoices.base_amount` / `invoices.total_amount` resolve. `invoice_paid_label` does not exist yet. Live md5(prosrc): `ai_action_apply` 7179f282e4ce1d8cfb9541c6c8560635 (7024 chars), `ai_action_undo` 77175a4cb698a06b8ebfe7f75c5f8dc0 (9791 chars); whitespace-normalised 050912d4123b0155db7cf7487baafebd / b393512f519af6fe1589514cb8af0acf (compared with the repo source in section 9).

| question | answer |
|---|---|
| fails closed when the installed text differs | Yes: 0 or 2+ matches raises (`:92-94`); suite case `invoice-status.test.mjs:1353`. One fail-OPEN branch: a function that is not installed under that exact signature is skipped with a NOTICE (`:76-79`). On live both exist, so it does not matter today; a NOTICE in the SQL editor is easy to miss. |
| idempotent | Yes: `position(replacement IN def) > 0` skips (`:82-85`); suite runs the file twice (`ai-actions.test.mjs:350-355`). |
| owner, SECURITY DEFINER, search_path, grants | Preserved: `pg_get_functiondef` emits SECURITY DEFINER and `SET search_path`; CREATE OR REPLACE keeps owner and ACL. Live today: owner postgres, prosecdef true, search_path=public, ACL authenticated + service_role on both. Re-check after applying (deploy step). |
| touches anything else | No row, no other function. The new function gets Postgres' default EXECUTE to PUBLIC; it is pure, harmless. |
| half-apply, the two functions disagreeing | Not possible: one DO block is one statement; a RAISE in the second iteration rolls back the first EXECUTE. `invoice_paid_label` may be left created and unused; harmless. |
| suite runs the real file after the real previous migration, and on a patched database | Yes (`run.mjs:121-123`; second run in ai-actions; refusal case in invoice-status). |

Is a text patch the right mechanism? For THIS database, today, either would give the same result (the live text holds exactly the expression the repo holds). The patch is the more defensive choice given that migrations are pasted by hand and the repo cannot prove what is installed, and it fails closed. Its cost: after it, NO file in the repo holds the installed source of the two functions. The next person who changes `ai_action_apply` by copying `20261107090000` into a new CREATE OR REPLACE silently reverts the label to the old CASE. **Required (not blocking the paste): a line in AGENTS.md / the head of 20261107090000 saying so, and a suite assertion that any later migration which re-creates either function calls `invoice_paid_label`.** Accept the mechanism.

Not covered by the patch (T4-m1, section 1): the SQL writers have no `credit` exception; and `ai_action_apply`'s INSERT branch still writes `partial`.

## 3. delete-payment (`supabase/functions/delete-payment/index.ts`)

Live facts: 14 payments, all Smart Family Payments (keys `smart-family-<id>-<student>-<ts>`; 3 also have a `smart-family-credit-` leftover); 0 with `parent_payment_id`; 0 deletions ever; every payment has ledger entries; no ledger leg has a NULL month (0 of 217); `ledger_entries.tx_key` has a UNIQUE index. The admin dialogs (Record / QuickPay / Batch) write NO payment row and NO ledger entry, so `payment-<id>` has no writer; it is handled anyway.

- Both legs, every key format: found by `tx_key LIKE %id%` (`:125-128`), classified (`:40-45`: allocation = `payment-`, `family-payment-`, `smart-family-`; leftover = the four `-contribution-` / `-credit-` keys; a `payment-reversal-` key or a foreign key is ignored), then every leg read by `tx_id` (`:144-147`). Each leg is reversed with debit and credit swapped under a new tx per original tx (`:193-206`), one insert: balanced by construction.
- Amount and month: AR credit minus AR debit of the ALLOCATION transactions per (student, ledger month) (`:154-163`); the payment functions post the ledger month = the bill month and the same amount they add to `recorded_payment`, so it is exactly the payment's amount on the right bill. Leftover transactions are reversed in the ledger and correctly never taken off a bill.
- Split across siblings: one allocation tx per sibling -> one bill each. Across months: neither payment function writes more than one month.
- Refusals, all before the first write: created by a modification (`:108-112`), has been modified (`:113-122`), already reversed (`:131-133`), no ledger entries (`:139-143`), bill missing or holding less than the payment put there (`:170-188`). Verified nothing is written before `:207`.
- Frozen bill: only `recorded_payment`, `paid_amount`, `status` are written; the freeze trigger pins the charged figures only. Fine. Not covered by a suite case.
- Label / carry afterwards: `labelAfterPayment` on the stored row (`:217`), `credit` kept; carry by the trigger on the update; then calculate-tuition per bill (`:262-268`).
- Idempotency: retry after success -> payment row gone -> 400. Retry after a part failure -> "already reversed" 409. Double click (two requests at once): the reversal keys are deterministic (`payment-reversal-<payment>-<entry id>`, `:197`) and `tx_key` is UNIQUE on live, so the second insert fails whole and that request stops before touching a bill. Good, but it rests on the unique index, which the suite does not have (the ledger is an in-memory stand-in there).

Findings:
- **T4-M1 (MAJOR, small).** The only caller, `LedgerBalanceInspector.tsx:182-185`, does `if (error) throw error` and toasts `error.message`: for every refusal the admin reads "Edge Function returned a non-2xx status code". T4 added four 409 refusals whose entire value is the sentence telling the admin what to do instead (Recorded Payment Manager). Unwrap the body as `SettleBillModal.tsx:74-82` does. Browser only; ship in the same publish.
- T4-m2. A payment whose allocation legs give no positive bill amount (for instance an AR leg with no month) would be reversed and deleted with no bill lowered and no refusal: `onBill` empty falls through (`:171-172`, `:207`). 0 such legs on live. Refuse when a payment has allocation transactions but `bills` is empty.
- T4-m3. Not atomic across steps: ledger reversal, then one update per bill, then the payment row. A failure after the first bill of a two-sibling payment leaves one bill lowered, one not, the payment row present, and every retry refused. The error says which bill. Acceptable for a path used 0 times so far; the real fix is one RPC.
- T4-m4. Same read-then-write of `recorded_payment` as R2-m6, with a longer window (read at `:173`, write at `:218`). See section 8.
- T4-m5. `payment_deletions` insert error is not checked (`:245-250`); pre-existing.
- 5 `family-payment-` ledger legs exist on live whose payment rows do not (not from delete-payment: 0 deletions). Pre-existing; for the owner's information.

## 4. settle-bill (`supabase/functions/settle-bill/index.ts`) and the write-off line

- Balance = carry-out of the bill just recalculated (`:82-98`); 502 when the refresh fails, 409 while the family discount is undecided, 404 without a bill. All before any write.
- Write-off = one discount line after every other discount, in both calculators (`calculate-tuition/index.ts:413-422`, `calculate-tuition-bulk/index.ts:379-386`), `min(sum, total)` so the total never goes below 0; skipped for a frozen bill in both.
- Frozen: refused 409 before the ledger (`:137-141`). Confirmed: the recalculation sends it to `needs_review` with `changed_after_confirmation` (helper `:218-238`; suite `:1277`). Cap: `min(amount, balance, total_amount)` (`:144-150`).
- Sibling discount: the family winner is chosen from `breakdown.classes[].net_amount_vnd`, which holds class-specific discounts only (`calculate-tuition/index.ts:588-599`; `compute-sibling-discounts/index.ts:85-96`). The write-off is not class-specific and is added after the sibling line, so it cannot change the winner or the sibling amount.
- Golden: `git diff claude/hec-conductor-setup-efbaa5...HEAD -- scripts/pgtest/fixtures` is empty. Still meaningful: it holds no settlement on or after the cutoff, so it proves the charged figures are unchanged wherever no new write-off exists, which is every bill on live today.
- History: settlements on live = 4, all before the cutoff: 2 `discount` (304,000 in total, 2 bills, last 22 Nov 2025; one of the two bills is frozen) and 2 `voluntary_contribution` (40,000, one bill, last 7 Oct 2026). Settlements on or after 2026-11-12: **0**. So deploying changes no historical bill's figure. Neither discount bill shows debt today (carry-out debt 0), so counting them would CREATE 304,000 of credit rather than clear a debt.

Findings:
- **T4-M2 (MAJOR, condition on the deploy).** The cutoff is a constant in the past (`_lib/invoice-status.ts:157`, 2026-11-12T00:00Z), and the settle-bill that is live until this deploys still sizes a write-off from cumulative `paid_amount`. Any write-off made with the OLD function between 12 Nov and the deploy will be counted on its bill by the new calculators. Today the count is 0. Either re-run the count immediately before deploying (must be 0) or set the constant to the deploy moment. Also write the cutoff into AGENTS.md as a rule: it is invisible on every screen, and "why does this old write-off not show on the bill" will be asked.
- T4-m6. `SettleBillModal.tsx:86` toasts "Bill settled successfully" whatever was settled: the function silently caps (asked 700,000, wrote off 400,000) and can return `billRefreshed: false`; neither reaches the admin. Show the amount returned.
- T4-m7. Two write-offs at the same instant each pass the cap; the calculators cap the bill at 0, the ledger keeps both. No idempotency key (`Date.now()` in the key). Low reach (button disabled while loading).
- T4-m8. If the month's charge later falls below the write-off (enrollment corrected), the bill counts only up to the new charge while the ledger keeps the full write-off. Flag only.
- T4-m9 (owner question 2). A voluntary contribution / unapplied cash still moves nothing on the bill, so the same credit can be converted again: the second request sees the same carry-out credit. The two live contributions are on one bill.

Repo source versus live (section 2, closed): whitespace-normalised md5 of the two function bodies in `20261107090000` = 050912d4123b0155db7cf7487baafebd (apply) and b393512f519af6fe1589514cb8af0acf (undo): **identical to live**. The raw hashes differ only by line endings (live is 141 / 184 characters longer = one CR per line: it was pasted with CRLF); the migration's regex uses `\s+`, and its match count on live is 1 and 1.

## 5. Browser writers

- No pricing: the diff in `src/` is the label import and its call sites, the two repair/status screens, and the mirror. The placeholder-bill upsert in the three dialogs still writes the calculator's own `base_amount` / `total_amount` from the row (unchanged, not arithmetic).
- Label from the mirrored helper everywhere: `RecordPaymentDialog.tsx:95`, `QuickPayPanel.tsx:130`, `BatchPaymentDialog.tsx:101` (`labelForPayment(item.status, newTotalPaid, finalPayable, monthCharged(item))`), `RecordedPaymentManager.tsx:108`, `:166` (`labelAfterPayment`), `PaymentIntegrityRepair.tsx:59`, `:133`, `InvoiceStatusManager.tsx:88`. `item.status` is the STORED label (`calculate-tuition-bulk/index.ts:454` -> `liveTuitionItem.ts:78`) and `finalPayable` is the calculator's `carry.payable`, so `credit` is recognised and kept (the key is left out of the write).
- Right label at once: the optimistic cache patch uses the same call (`RecordPaymentDialog.tsx:157`, `QuickPayPanel.tsx:198`, `BatchPaymentDialog.tsx:170`).
- `useTuitionMonthConfirmation` / `TuitionMonthConfirmation.tsx`: not in the diff. Unchanged.
- InvoiceStatusManager: offers `credit` and "follow"; follow reads the bill and writes the rule's label. Fine. PaymentIntegrityRepair: lists and repairs by the rule, skips `credit`; after this publish Repair is safe to press (it writes the label every other writer would).
- Not changed, and the weakest point of the whole payment path (section 8): the three dialogs write `recorded_payment = <what the screen showed> + <entered>`.

## 6. family-payment

- `owed = max(0, total + carry-in debt - carry-in credit - recorded)` in one closure used by the selection, pro-rata and oldest-first (`family-payment/index.ts:107-108`, `:139`, `:174`), and by the apply loop (`:283`).
- Refusals before the first write (`:192-202`, the payment row is inserted at `:208`): an allocation with no bill; a remainder with no leftover instruction; a contribution without consent. Verified nothing is written above `:208`.
- Manual mode puts the whole chosen amount on the child's bill (last bill takes the rest, `:282-283`), so ledger and bill agree.
- Still unchecked (pre-existing): the `payments`, `payment_allocations` and `ledger_entries` inserts ignore their errors (`:208-217`, `:224-230`, `:253-275`); a failed ledger insert leaves money on the bill with no ledger, which delete-payment then refuses. The function is not mounted (`<FamilyPaymentModal` has no user).

## 7. Fail-closed pricing reads

- Single: `calculate-tuition/index.ts:186-188` throw -> 400, before any write. Bulk: `fetchChunked` throws for referral bonuses and settlements (`calculate-tuition-bulk/index.ts:209-222`) -> 400 for the whole call.
- Checked on live that the reads cannot fail structurally: `referral_bonuses`, `discount_assignments`, `settlements` exist, service_role has SELECT, and every column the reads name exists (`effective_from`, `effective_to`, `settlement_type`, `created_at`, ...). The old `catch {}` ("table may not exist") hid nothing real.
- Callers: `useLiveTuitionData.ts:34-35`, `AdminTuitionList`, `useFinanceOverview`, `CloseMonthDialog.tsx:74-77` all throw on a failed call (react-query's retry and error state; Close Month stops instead of snapshotting a short list). `compute-sibling-discounts:16-19` throws. `confirm-tuition`, `settle-bill:83-85` stop. `schedule-sessions:319-326` records the failure in its report. `stars-sync` keeps the job for the next run. Payroll does not call the tuition calculators.
- One silent path, pre-existing and now slightly more reachable: `smart-family-payment/index.ts:147-150` returns `null` for a sibling whose calculation failed and carries on, allocating the family's money among the siblings that did answer (the rest becomes "unapplied cash"). It should refuse the payment. MINOR (T4-m10), not introduced here.

## 8. R2-m6: read-then-write of `recorded_payment`

Where it is: `smart-family-payment/index.ts:266-286`, `family-payment/index.ts:281-296`, `delete-payment/index.ts:173-227` (new in T4), and - not named in R2-m6 but the same defect with a far longer window - the three admin dialogs, which add the entered amount to the value THE SCREEN LOADED (`RecordPaymentDialog.tsx:85-124`, `QuickPayPanel.tsx:121-158`, `BatchPaymentDialog.tsx:94-129`). Only `ai_action_apply` / `undo` are safe (`SELECT ... FOR UPDATE`, `20261107090000:555-556`, `:711`).

Reachable?
- Functions, two requests at the same instant: yes in principle, milliseconds wide. Smart Family Payment is the only one with live use (14 payments ever); a double submit needs two clicks before the modal disables. Rare.
- Dialogs: **yes, in ordinary use.** The window is the age of the screen, not milliseconds. The school has separate admin logins. Admin A records 400,000 for a child; admin B, whose tuition list was loaded before that (the query has `staleTime` 30 s and no refetch on focus, `useLiveTuitionData.ts:121-122`), records 200,000 for the same child: the bill ends at 200,000 and A's payment is gone, with only `audit_log` to show it. Same with one admin and two tabs, or Batch after QuickPay. The dialogs are the main payment path on live (hundreds of bills hold a payment; only 14 came through a function).

Ruling: **not a blocker for T4** - T4 neither creates nor widens the dialog window, and it adds one rarely used writer (delete-payment). **But it must be the very next payment change, and I would put the dialog half in this publish, because it is three lines per dialog and needs no migration:**

Smallest correct fix = compare-and-set, no SQL:
- dialogs: `.update({...}).eq("id", id).eq("recorded_payment", alreadyPaid).select("id")`; when no row comes back, write nothing and tell the admin "this bill changed since the screen loaded - reload" (and refetch). The placeholder upsert path is already guarded by the unique (student, month).
- functions (smart-family-payment, family-payment, delete-payment): the same `.eq("recorded_payment", <value read>)` with `.select("id")`; on no row, re-read and retry up to 3 times, then fail loudly. smart-family-payment must also start checking the errors of its invoice update, which it ignores today (`:279-286`).
- `recorded_payment` is NOT NULL-safe for this on live: integer, 0 NULLs, default 0.
An atomic `recorded_payment = recorded_payment + delta` in one RPC is the cleaner end state (and `invoice_paid_label` from this migration makes the label part of the same statement), but it turns a double submit from harmless (same absolute value written twice) into a double payment, so it needs an idempotency key with it. Compare-and-set has neither problem.

Live numbers behind the ruling: 3 admin accounts, and 3 distinct `updated_by` on bills that hold a payment; 556 bills hold a payment, 14 payments ever went through a function.

## 9. Suites and mutations, run by me at 713bc1e

node_modules linked by junction for the runs and the link removed with `cmd //c rmdir node_modules` afterwards.

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **3557 assertions across 41 suites, 0 suite(s) failed** (invoice status 247, AI admin actions 76, mirrors 16, edge functions typecheck 5, app typecheck 3, family payment month 6, tuition prior balance 267, session cancel guard 266) - the implementer's totals exactly |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json --listFiles` | exit 0, 0 `error TS`, 880 lines under `/src/` loaded (not an empty check) |
| `npx --yes bun test` over the 11 `scripts/*.test.ts`, named one by one | **155 pass, 0 fail**, 690 expect() calls. (`npx --yes bun test scripts` as one argument produced no output in over five minutes and was stopped: it also collects `scripts/pgtest/*.test.mjs`, which are not bun tests.) |

Mutations (each applied to the product file, `invoice-status.test.mjs` run with its four migrations, file restored; helper mutations applied to BOTH mirrored copies so the mirror check is not what catches them). 12 run: **9 caught, 3 survived.**

| # | mutation | result |
|---|---|---|
| h1 | helper: `recorded >= due` -> `>` | caught (28 assertions) |
| h2 | helper: drop "the month charged something or received money" (zero-charge month reads paid) | caught (6, incl. the SQL grid) |
| h3 | helper: `labelForPayment` no longer keeps `credit` | caught (1) |
| h4 | helper: `settledWriteOff` ignores the cutoff | **survived** - equivalent: both calculators also filter `created_at >= cutoff` in the query |
| h5 | h4 plus both query filters removed | caught (1: the 7 Oct case, single calculator) |
| d1 | delete-payment: no "bill holds less" refusal | caught (3) |
| d2 | delete-payment: a `smart-family-credit` leftover classed as an allocation | **survived** - no case deletes a payment that has a leftover; 3 of the 14 live payments have one |
| d3 | delete-payment: reversal legs not swapped | caught (1) |
| d4 | delete-payment: no "already reversed" refusal | **survived** - the retry case is stopped by the "holds less" refusal instead; with other money on the bill only the UNIQUE `tx_key` on live would stop a second reversal |
| s1 | settle-bill: no cap at the month's charge | caught (1) |
| s2 | settle-bill: frozen bill not refused | caught (1) |
| s3 | settle-bill: balance ignores carry-out credit | caught (1) |

Tests to add (not blocking): delete a payment with a leftover (d2); a retry where the bill still holds enough (d4), and a UNIQUE `tx_key` in the ledger stand-in; delete on a frozen bill and on a two-sibling payment; the cutoff in the bulk calculator.

## 10. The two owner questions

1. **Should the 4 settlements made before 2026-11-12 count on their bills? Default: NO.** The two write-offs (304,000, last 22 Nov 2025) sit on bills that show no debt today, one of them frozen: counting them would not clear anything, it would lower two charges nobody disputes and hand those families 304,000 of credit (and send any confirmed one back to review). The two contributions cannot count under any reading of the code. Leave history alone; if the owner wants one of them on a bill, that is a deliberate correction of that bill. Does not block.
2. **Should a voluntary contribution use up the bill's credit? Default: YES, as its own reviewed change, not in this release.** Today the school books the contribution as revenue while the family keeps the same credit against future tuition, so the money is counted twice and the same credit can be converted again (T4-m9). It needs a charge line on the bill, which moves balances, so it must not ride along here. Until then: tell the admins not to use "voluntary contribution" / "unapplied cash" in Settle Bill, or add a refusal when earlier conversions of that month already cover the credit. Does not block.

---

# VERDICT: PASS WITH CHANGES

No blocker. No historical bill's charged figure changes on deploy (0 settlements on or after the cutoff; golden untouched and passing; labels only).

## Majors
- **T4-M1.** `LedgerBalanceInspector.tsx:182-185` shows "non-2xx status code" for every delete-payment refusal; unwrap the body. Same publish.
- **T4-M2.** The write-off cutoff is a past constant: re-count settlements on or after 2026-11-12 immediately before deploying (must be 0; it is 0 now) or set the constant to the deploy moment; and write the cutoff into AGENTS.md as a rule.
- **T4-M3 (R2-m6, recommended in this publish, not blocking).** The three admin dialogs overwrite `recorded_payment` from a screen that may be minutes old; compare-and-set on the value read (section 8). The functions' half can follow as the next change.

## Minors
m1 SQL writers overwrite `credit`; m2 delete-payment with no bill found still reverses and deletes; m3 delete-payment not atomic; m4 its read-then-write window; m5 `payment_deletions` error unchecked; m6 Settle Bill toast hides the capped amount and `billRefreshed`; m7 double write-off; m8 charge later below the write-off; m9 contribution repeatable; m10 smart-family-payment drops a sibling whose calculation failed; m11 family-payment pro-rata rounding can now refuse an exact payment by 1 dong (unmounted); the migration's "not installed" branch is a NOTICE; nothing in the repo holds the patched functions' source (section 2).

## Deploy order
1. Read-only pre-check: settlements on or after 2026-11-12 = 0; the section 2 query (pattern matches 1 and 1).
2. Paste migration `20261113090000`; expect two "now uses the rule" notices; check both functions are still SECURITY DEFINER, search_path=public, ACL authenticated + service_role.
3. Functions, each with `_lib/invoice-status.ts`, in one sitting: calculate-tuition, calculate-tuition-bulk (from the T3 commit if T3 ships with it), then settle-bill, delete-payment, smart-family-payment, family-payment, confirm-tuition. The calculators must be live before settle-bill.
4. One publish for the browser (with T4-M1, and T4-M3 if taken).
5. Tell the owner: 461 stored labels will change as bills are opened (25 more than under the rule live today: 16 issued -> paid, 9 partial -> paid; no downgrade from the rule); three child-months (Sep, Oct, Nov 2026) newly count as settled for the lesson-cancellation guard; an old write-off does not show on its bill.

**Where I am / next step:** round 1 complete; round 2 below.

---

# Round 2 - delta 713bc1e..5fc361b

Review only, as before. Live read again on 13 Nov with aggregates only.

**Where I am / next step (round 2):** Part 1 complete - verdict PASS (R2-d below). Part 2, the release assembly, is written up in `docs/evidence/PAYMENTS-release.md`.

## R2-a. The three majors

**T4-M1 - closed.** `src/lib/functionError.ts` reads the function's JSON body from `error.context` (cloned, falls back to the generic message). Used by all five callers of a payment function: `LedgerBalanceInspector.tsx:188`, `SettleBillModal.tsx:76`, `BatchFamilyPaymentModal.tsx:291`, `FamilyPaymentModal.tsx:242`, `SmartFamilyPaymentModal.tsx:263`. Settle Bill now toasts the amount the function returned, says when it was capped, and warns on `billRefreshed: false` (`SettleBillModal.tsx:78-89`). Unit-tested (`scripts/functionError.test.ts`).

**T4-M2 - closed, and better than what I asked for.** The date constant is gone. A write-off counts only when its settlement's ledger transaction has a leg whose `tx_key` starts `settlement-writeoff-` (`_lib/invoice-status.ts:164-187`, the one place the filter lives; both calculators read the month's `discount` settlements and their legs unfiltered and fail closed on either read: `calculate-tuition/index.ts:157-162`, `:187-195`; `calculate-tuition-bulk/index.ts:218-229`). Only the new settle-bill writes that key (`settle-bill/index.ts:159`).
- Live: ledger legs with a key starting `settlement-writeoff`: **0**. Legs keyed `settlement-discount-`: 2 (the two old write-offs). Settlements: 4, 2 of type discount, 0 with a NULL `tx_id`.
- The settle-bill live until the deploy (v4, 93ca410) writes `settlement-discount-` / `settlement-contribution-` / `settlement-unapplied-` only (`git show 93ca410:supabase/functions/settle-bill/index.ts` lines 161, 208, 237). It cannot produce a counted write-off, whenever it runs. The deploy-window risk of round 1 is gone, and no pre-deploy recount is needed.
- Grep for the prefix: only settle-bill, the mirrored helper pair and the owner check SQL.

**T4-M3 / R2-m6 - closed for lost updates.** One mirrored module (`_lib/recorded-payment-write.ts` / `src/lib/recordedPaymentWrite.ts`, registered in `mirrors.test.mjs`): `UPDATE ... WHERE id = ? AND recorded_payment = <value read> RETURNING id`.

| # | path | write | guard |
|---|---|---|---|
| 1 | RecordPaymentDialog (payment and correction) | `setRecordedPayment`, expected = the value the screen showed | conflict: toast, both queries invalidated, nothing written |
| 2 | QuickPayPanel | same, per row | conflicting rows listed, not patched into the cache, list refetched |
| 3 | BatchPaymentDialog | same, per row | same |
| 4 | RecordedPaymentManager edit | same | toast and reload |
| 5 | RecordedPaymentManager reverse | same | toast and reload |
| 6 | smart-family-payment | `addToRecordedPayment` (`:277-282`); a bill created meanwhile (23505) is re-read and added to (`:301-308`) | re-read, retry once, then fail loudly |
| 7 | family-payment | `addToRecordedPayment` (`:291-297`) | same |
| 8 | delete-payment | `addToRecordedPayment` with a negative delta and a guard that the fresh bill still holds the payment (`:227-241`) | same |

No write of `recorded_payment` is left outside the module (grep over `src` and `supabase/functions`): the only other one is smart-family-payment's INSERT of a bill that does not exist, which cannot overwrite anything and falls back to the compare-and-set on a duplicate key. A bill with no row yet goes in by INSERT (no longer an upsert that overwrote), then compare-and-set on the duplicate. `ai_action_apply` / `undo` lock the row (`FOR UPDATE`), unchanged.

- Can the retry double-apply? No. The second attempt runs only when the first UPDATE answered successfully with zero rows, which is proof it wrote nothing. A timeout or transport error surfaces as `error` and throws without retrying. On the admin screens there is no retry at all; an admin who clicks again after an unseen success is refused by the compare (the bill no longer holds what the screen showed).
- `recorded_payment` is an integer, never NULL on live (0 of 708), so equality is exact.
- The two-writer tests do interleave: the suite's client runs a hook between the writer's read and its UPDATE / INSERT (`beforeNextInvoiceWrite`), in which the second writer completes; covered for the dialogs' function (stale 0 against a saved 200,000; no bill on either screen), two Smart Family Payments, two Family Payments, delete-payment with a payment landing, and settle-bill with a payment landing. The dialogs are tested through the shared function plus a source check that each file writes only through it, not by rendering the components.

Remaining, not blocking:
- **R2-n1 (MINOR). Ledger and bill can still diverge, now loudly instead of silently.** smart-family-payment and family-payment post the ledger pair first and the bill second; delete-payment reverses the ledger first. There is no transaction and no compensating step. If the compare-and-set misses twice (two other writes on the same bill inside one request's few milliseconds), or delete-payment's fresh-bill guard refuses, the function fails with "posted to the ledger but the bill could not be updated": the ledger holds the payment, the bill does not, later siblings of that payment are not processed, and the payment row stays. Before round 2 the same race lost the money silently, so this is strictly better, and it needs three writers on one bill at once. The end state is one SQL function per payment (ledger and bill in one transaction). Say so in AGENTS.md; do not block.
- R2-n2 (MINOR). After such a failure, deleting that payment is refused if the bill holds less than it "put there", but if the bill holds as much from OTHER money, delete-payment would take that off. Same three-writer precondition.
- R2-n3 (MINOR). Batch / QuickPay list the children whose bills conflicted in the toast; fine on an admin screen.

## R2-b. Surviving mutations, and "names no bill"

- d2 (leftover classed as allocation), d4 (no already-reversed refusal): each now has a case (`invoice-status.test.mjs`, "T4 r2 - the mutations the review left alive"); the ledger stand-in enforces UNIQUE `tx_key`. Re-run by me in R2-d.
- h4 is gone by construction: one filter, in `settledWriteOff`.
- New refusal (`delete-payment/index.ts:190-197`): a payment with allocation transactions but no bill amount. A payment that is leftover-only (all of it unapplied cash) is not refused: it is reversed in the ledger and deleted, and no bill changes, which is right.
- Could it strand a real payment? Live, all 14 payments classified with the function's own rule: names no bill **0**; a named bill missing **0**; already reversed **0**; a named bill now holds less than the payment put there **3** (refused with the Recorded Payment Manager message, by design: those bills were edited since); deletable now **11**. No ledger leg on live has a NULL month. Nothing is stranded by the new refusal.

## R2-c. The migration, re-checked

Change since round 1: the replacement is now `(CASE WHEN invoices.status = 'credit' THEN invoices.status ELSE public.invoice_paid_label(...) END)` (`20261113090000:90-93`), so the assistant's payment and undo keep an admin's `credit` (closes T4-m1; suite case in ai-actions). Everything else in the DO block is as reviewed.

- **Applies on live as-is: YES.** Live today: `ai_action_apply` md5(prosrc) 7179f282e4ce1d8cfb9541c6c8560635, `ai_action_undo` 77175a4cb698a06b8ebfe7f75c5f8dc0 (unchanged since round 1); the migration's pattern matches exactly once in each; neither is patched; `invoice_paid_label` does not exist; both SECURITY DEFINER, `search_path=public`, ACL postgres + authenticated + service_role.
- **Expected after applying** (computed on live, read-only, by running the migration's own `regexp_replace` over the installed text): `ai_action_apply` md5(prosrc) **b7981cd00c7136d5b7c6b9a829fe309b** (7029 chars), `ai_action_undo` **944c9035dbb2b70afd142c465c9f7530** (9793 chars). Whitespace-normalised: 1b0e0df35f614bb17b4e9fee4e37e92a and 96bd4918b1ed8c0291588596072fdc69, **equal to the two bodies in `docs/sql/ai_action_apply_undo.installed.sql`** (hashed from the file). The raw hashes differ from the file's only because live was pasted with CRLF.
- Fail closed: unchanged (exactly one match or RAISE). A database patched by the ROUND 1 form of this migration (plain call, no `credit` arm) would hold neither the old CASE nor the new replacement, so this one would stop there rather than guess; live was never patched, so it does not arise.
- Idempotent: the replacement text is searched for verbatim before anything else; suite runs the file twice.
- `docs/sql/ai_action_apply_undo.installed.sql` = what the migration produces: asserted in `ai-actions.test.mjs` against `pg_get_functiondef` of both functions (line endings and trailing spaces normalised); the same suite fails if a later migration re-creates either function without `invoice_paid_label`. The migration's header now says where the source lives. This closes the "no file holds the source" point of round 1.

## R2-d. Suites and mutations, run by me at 5fc361b

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **3584 assertions across 41 suites, 0 suite(s) failed** (invoice status 268, AI admin actions 79, mirrors 19, edge functions typecheck 5, app typecheck 3) - the implementer's totals |
| `npm run test:bun` (run as `node scripts/run-bun-tests.mjs`) | **159 pass, 0 fail**, 710 expect() calls, 12 files |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0 |

Mutations (same method as round 1; mirrored files mutated in both copies). 11 run: **10 caught, 1 survived.**

| # | mutation | result |
|---|---|---|
| c1 | `setRecordedPayment` without the compare | caught (2) |
| c2 | `addToRecordedPayment` without the compare | caught (3: smart, family, delete) |
| c3 | the retry keeps the stale bill instead of the re-read one | caught (3) |
| c4 | no retry | caught (3) |
| c5 | a miss reported as saved | caught (3) |
| c6 | a screen conflict reported as ok | caught (2) |
| c7 | delete-payment: no check that the RE-READ bill still holds the payment | **survived** - no case has the bill fall below the payment between delete-payment's first read and its retry. Add one; the code is right. |
| w1 | a write-off counted whatever its ledger key | caught (2) |
| d2 | leftover classed as an allocation (round 1 survivor) | caught |
| d4 | no "already reversed" refusal (round 1 survivor) | caught |
| d5 | no "names no bill" refusal | caught |

## Round 2 verdict: PASS

All three majors are closed; the migration still applies on live as-is, fails closed and is idempotent; no remaining read-then-write of `recorded_payment`. Follow-ups, none blocking: R2-n1 (ledger first, bill second, no transaction: a double miss now fails loudly with the ledger posted - one SQL function per payment is the end state), R2-n2, R2-n3, a test for c7, and round 1's m3, m5, m7-m11 and the two owner questions, which this round did not set out to change.
