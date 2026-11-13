# Payments release (T4, both rounds) - assembly and deploy manifest

**Where I am / next step:** COMPLETE. `release/payments-1` assembled from origin/main 705dea8, leak check clean, all four checks green. Nothing pushed or deployed: the conductor's step.

Nothing pushed, nothing deployed, no database touched; live read with aggregates only. Reviewed tip: 5fc361b (`worktree-agent-aafcbedf13a50d197`). The review is `docs/evidence/T4-review.md` (round 1 PASS WITH CHANGES, round 2 PASS).

## Assembly: `release/payments-1`

Cut from origin/main 705dea8 (tuition release + student design release). Nothing merged or cherry-picked.

The T4 branch sits on the conductor branch (6465f08). For each of the 37 files T4 changed (`git diff --name-only 6465f08 5fc361b`) I asked one question: is main's copy the same as the copy T4 started from (`git diff origin/main 6465f08 -- <file>` empty)?

**Yes for 28 files - taken whole from 5fc361b** (so the release's copy is byte-identical to the reviewed one, and its diff against main is exactly T4's change):
- Functions: `supabase/functions/_lib/invoice-status.ts`, `_lib/recorded-payment-write.ts` (new), and `index.ts` of `calculate-tuition`, `calculate-tuition-bulk`, `settle-bill`, `delete-payment`, `smart-family-payment`, `family-payment`. `confirm-tuition/index.ts` is unchanged by T4 and equal to main; it is redeployed only because it imports the changed `_lib/invoice-status.ts`.
- Migration: `supabase/migrations/20261113090000_invoice_paid_label.sql`; reference source `docs/sql/ai_action_apply_undo.installed.sql`.
- Browser: `src/lib/invoiceStatus.ts`, `src/lib/recordedPaymentWrite.ts`, `src/lib/functionError.ts` (all new); `InvoiceStatusManager.tsx`, `LedgerBalanceInspector.tsx`, `PaymentIntegrityRepair.tsx`, `RecordedPaymentManager.tsx` in `src/components/admin/`.
- Tests and tools: `scripts/pgtest/invoice-status.test.mjs`, `ai-actions.test.mjs`, `mirrors.test.mjs`, `scripts/functionError.test.ts`, `scripts/run-bun-tests.mjs`, `package.json` (two script lines), `scripts/CHECK-payment-paths.sql`, `scripts/CHECK-invoice-status-resets.sql`.
- `AGENTS.md` (T4's lines only: main's copy equals T4's starting copy), `docs/evidence/T4-before.txt`, `T4-payment-paths.md`; `T4-review.md` from the review tip 0c7fc736.

**No for 8 files - main's copy kept, T4's own patch applied to it** (`git diff 6465f08 5fc361b -- <file>` applied with `git apply --3way`), because the conductor branch's copy also carries unshipped work:

| file | what the conductor copy carries that is NOT shipped | how T4's change went on |
|---|---|---|
| `src/components/admin/RecordPaymentDialog.tsx` | staff design batch R10 (`useIvory`, class changes) | clean except the import block: kept T4's two imports, dropped `useIvory` |
| `src/components/admin/QuickPayPanel.tsx` | R10 | same |
| `src/components/admin/BatchPaymentDialog.tsx` | R10 | same |
| `src/components/admin/SettleBillModal.tsx` | R10 | clean |
| `src/components/admin/BatchFamilyPaymentModal.tsx` | R10 | clean |
| `src/components/admin/FamilyPaymentModal.tsx` | R10 | clean |
| `src/components/admin/SmartFamilyPaymentModal.tsx` | R10 | clean |
| `scripts/pgtest/run.mjs` | recorder, audit-eval, transcribe-gate, class-recordings suites | clean (the one "AI admin actions" entry) |

So no file on the release carries an `useIvory` branch that main did not already have; nothing had to be argued inert. Check that the separation lost and added nothing: `git diff --numstat origin/main release/payments-1 -- src scripts/pgtest/run.mjs` equals `git diff --numstat 6465f08 5fc361b -- src scripts/pgtest/run.mjs` line for line, for all 15 files (for example RecordPaymentDialog 29/36, QuickPayPanel 29/29, BatchPaymentDialog 29/28, SettleBillModal 16/12).

### Leak check - CLEAN

`git diff --stat origin/main..release/payments-1`: the 37 files above plus this file, nothing else. In the `src` diff (1156 lines) a search for added or removed lines containing `Ivory`, `iv(`, `hec-`, `className` or `variant=` finds one line, the help paragraph T4 added to InvoiceStatusManager. Nothing from the design rollout, the recorder, lesson-eval / audit-eval, D4, the S1 security fixes or T5; the only migration is `20261113090000`. `run.mjs` differs from main by the one T4 entry. Blobs are LF.

### Checks on the release branch

| command | result |
|---|---|
| `node scripts/pgtest/run.mjs` | **2778 assertions across 36 suites, 0 suite(s) failed**, exit 0. Invoice status 268 (golden compared), AI admin actions 79, shared-module mirrors 19, edge functions typecheck 5, app typecheck 3, tuition prior balance 267 |
| `node scripts/run-bun-tests.mjs` (`npm run test:bun`) | 136 pass, 0 fail, 506 expect() calls, 11 files |
| `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | exit 0, 0 `error TS`; `--listFiles` shows 849 lines under `/src/` |
| `node node_modules/vite/bin/vite.js build` | exit 0, built in 3m 10s (chunk-size warnings only) |

36 suites and 11 bun files, not the conductor branch's 41 and 12: the missing ones belong to unshipped work (recorder, audit-eval, transcribe gate, class recordings) and are not on main.

node_modules by junction for the runs; the link removed with `cmd //c rmdir node_modules`, the real folder intact.

## DEPLOY MANIFEST

Source of every file: `release/payments-1`. Order: pre-checks, migration, the seven functions in the order below in one sitting, then the push. All seven functions have `verify_jwt = true` in `supabase/config.toml`; keep it. No secret, no config change.

### 0. Pre-checks (read-only; values as measured on 13 Nov 2026)

```sql
-- P1: the two functions the migration patches. Expect exactly these.
SELECT p.proname, md5(p.prosrc) AS md5, position('invoice_paid_label' in p.prosrc) AS patched,
       p.prosecdef, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('ai_action_apply', 'ai_action_undo') ORDER BY 1;
```
| function | md5(prosrc) BEFORE | patched | definer | config | acl |
|---|---|---|---|---|---|
| ai_action_apply | `7179f282e4ce1d8cfb9541c6c8560635` | 0 | true | `search_path=public` | postgres, authenticated, service_role |
| ai_action_undo | `77175a4cb698a06b8ebfe7f75c5f8dc0` | 0 | true | `search_path=public` | postgres, authenticated, service_role |

If either md5 differs, stop: the installed text changed since the review (the migration would still refuse rather than guess, but find out why first).

```sql
-- P2: nothing on live carries the key that makes a write-off count. Expect 0.
SELECT count(*) FROM ledger_entries WHERE tx_key LIKE 'settlement-writeoff%';
-- P3: the money, to compare after. Measured: 864719903 / 884051800 / 708 (it moves with real payments: record it at deploy time).
SELECT sum(recorded_payment), sum(total_amount), count(*) FROM invoices;
-- P4: labels. Measured: draft 10, issued 557, paid 115, partial 26, credit 0.
SELECT status, count(*) FROM invoices GROUP BY 1 ORDER BY 1;
-- P5: the compare-and-set needs both. Expect 0, and 1.
SELECT count(*) FROM invoices WHERE recorded_payment IS NULL;
SELECT count(*) FROM pg_indexes WHERE tablename = 'ledger_entries' AND indexdef ILIKE '%unique%' AND indexdef ILIKE '%tx_key%';
```
Also record the live version number of each of the seven functions (all v4 today): the rollback target.

### 1. Migration `supabase/migrations/20261113090000_invoice_paid_label.sql`

Paste whole into the SQL editor. Expect two notices, `... ai_action_apply(uuid, text, jsonb) now uses the rule` and `... ai_action_undo(uuid) now uses the rule`. An error "expected exactly one label expression" means nothing was changed: stop. Pasting it a second time is safe (`already uses the rule`). It updates no row.

Then P1 again. Expect:

| function | md5(prosrc) AFTER | patched | definer, config, acl |
|---|---|---|---|
| ai_action_apply | `b7981cd00c7136d5b7c6b9a829fe309b` | > 0 | unchanged |
| ai_action_undo | `944c9035dbb2b70afd142c465c9f7530` | > 0 | unchanged |

(Computed on live by running the migration's own replace over the installed text, without applying it. Whitespace-normalised these are `1b0e0df35f614bb17b4e9fee4e37e92a` and `96bd4918b1ed8c0291588596072fdc69`, the hashes of the two bodies in `docs/sql/ai_action_apply_undo.installed.sql`; the raw values differ from the file only because live holds CRLF line endings.) And `SELECT to_regprocedure('public.invoice_paid_label(bigint,bigint,bigint,bigint)') IS NOT NULL` is true.

The migration and the functions do not depend on each other; it goes first so that the assistant's label agrees with the functions' from the first minute.

### 2. Functions

Imports are written `../_lib/<name>.ts`: upload each listed file as `_lib/<name>.ts` beside `<function>/index.ts`. None of the `_lib` files below imports another file (`auth.ts` imports supabase-js from esm.sh only), so each list is the full recursive closure. A function uploaded with the OLD `invoice-status.ts` or without `recorded-payment-write.ts` fails at boot (missing export), which probe 2 catches.

| order | function | entrypoint | `_lib` files to upload with it |
|---|---|---|---|
| 1 | calculate-tuition | `supabase/functions/calculate-tuition/index.ts` | `rate-limit.ts`, `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `invoice-status.ts` |
| 2 | calculate-tuition-bulk | `supabase/functions/calculate-tuition-bulk/index.ts` | `auth.ts`, `sibling-state.ts`, `tuition-session.ts`, `enrollment-discounts.ts`, `invoice-status.ts` |
| 3 | settle-bill | `supabase/functions/settle-bill/index.ts` | `invoice-status.ts` |
| 4 | delete-payment | `supabase/functions/delete-payment/index.ts` | `invoice-status.ts`, `recorded-payment-write.ts` |
| 5 | smart-family-payment | `supabase/functions/smart-family-payment/index.ts` | `rate-limit.ts`, `invoice-status.ts`, `recorded-payment-write.ts` |
| 6 | family-payment | `supabase/functions/family-payment/index.ts` | `rate-limit.ts`, `invoice-status.ts`, `recorded-payment-write.ts` |
| 7 | confirm-tuition | `supabase/functions/confirm-tuition/index.ts` | `auth.ts`, `invoice-status.ts` |

Why this order: both calculators before settle-bill, because a write-off made by the new settle-bill is put on the bill by the calculators; with the old calculators still live it would be posted to the ledger and not show. The old settle-bill beside the new calculators is harmless (it cannot write the `settlement-writeoff-` key). The rest are independent of each other.

### 3. The push

Push `release/payments-1` to main (browser: the dialogs, Recorded Payment Manager, Payment Integrity Repair, Invoice Status Manager, the five function callers). After the functions, so that a refusal the new screens word for the admin exists to be worded. The new browser against the old functions, or the reverse, is safe either way: the compare-and-set is in the browser's own write, and an older function's labels are corrected by the next calculation.

### 4. Post-deploy probes (read-only, counts only)

1. Function list: the seven show a new version (v5), status ACTIVE, `verify_jwt` true.
2. Boot: an unauthenticated POST to each of the seven answers 401, not 500 / "worker boot error".
3. Edge logs for the seven, 10 minutes after: 5xx and boot errors = 0.
4. P1: the AFTER hashes above. P2: still 0 until an admin makes a write-off with the new Settle Bill; from then on it equals the number of such write-offs.
5. P3 straight after the deploy: `sum(recorded_payment)`, `sum(total_amount)` and the count are what was recorded before it. The deploy itself writes no bill. Later movement must be explained by payments and by `audit_log`: no historical write-off counts (P2 = 0), so no total falls because of this release until someone uses the new Settle Bill.
6. P4 after tuition screens have been opened: labels move towards the rule, and only towards it. If every bill were re-saved the table would read **issued 136, paid 499, partial 73, draft 0** (461 changes: issued -> paid 372, issued -> partial 57, draft -> paid 8, draft -> issued 2, partial -> paid 13, paid -> issued 6, paid -> partial 3; the last nine are stale labels on zero-charge or already-owing bills, review section 1). `paid` must never exceed 499 nor `issued` fall below 136 without a payment explaining it; `credit` stays 0 unless an admin sets one.
7. `SELECT count(*) FROM invoices WHERE recorded_payment IS NULL` = 0; `SELECT count(*) FROM invoices WHERE recorded_payment < 0` = 0.
8. After the push: the Actions run for the commit is green; an admin records one small payment and corrects it back in Record Payment (no name recorded here), and sees the label follow.
9. Tell the owner: about 461 old labels change as bills are opened, no amount changes; three child-months (Sep, Oct, Nov 2026) newly count as settled for the lesson-cancellation guard; the four old settlements do not show on their bills; a payment screen that says "this bill changed since the screen was loaded" has saved nothing and has reloaded; Payment Integrity Repair is safe to press again; the two owner questions (old settlements: default no; a contribution should use up the credit: default yes, as its own change).

### 5. Rollback

- Functions: redeploy the seven from 93ca410 (`git show 93ca410:supabase/functions/<name>/index.ts`, and `_lib/invoice-status.ts` and the other `_lib` files from the same commit; origin/main 705dea8 holds the same seven files, verified `git diff 93ca410 origin/main` empty for them). That is v4, what is live today. At 93ca410 none imports `recorded-payment-write.ts`. If a write-off was made with the new Settle Bill before the rollback, the old calculators do not count it: that bill's charge returns to the figure before the write-off at its next view, and the ledger keeps the write-off. Count them first with P2, and tell the owner which month if it is not 0.
- Migration: its reverse is to re-create the two functions from their source and drop the helper. Paste, from `supabase/migrations/20261107090000_ai_assisted_admin_actions.sql`, the statement starting at line 454 (`CREATE OR REPLACE FUNCTION public.ai_action_apply`) through its closing `$$;`, and the statement starting at line 662 (`CREATE OR REPLACE FUNCTION public.ai_action_undo`) through its closing `$$;`; then `DROP FUNCTION public.invoice_paid_label(bigint, bigint, bigint, bigint);`. CREATE OR REPLACE keeps owner and grants. Afterwards P1 shows `patched` 0 and the whitespace-normalised hashes `050912d4123b0155db7cf7487baafebd` / `b393512f519af6fe1589514cb8af0acf` (the raw md5 depends on the line endings of the paste). The migration can stay applied while the functions are rolled back, and the other way round: neither needs the other.
- Browser: revert the release commit on main and push. Safe against either function version.
- Data: nothing to undo in amounts. Labels written under the new rule stay until the next write of each bill.

**Where I am / next step:** COMPLETE. `release/payments-1` assembled from origin/main 705dea8, leak check clean, all four checks green. Nothing pushed or deployed: the conductor's step.
