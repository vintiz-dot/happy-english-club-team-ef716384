# Payments follow-ups (R-N1, R-N2, G-2, the assistant's payment step)

Branch `payments-followups` (from `origin/main` 04ccc58f). MONEY: YES.
Build and test only: nothing deployed, no migration applied, nothing pushed.
Live was read only (SELECTs of catalog definitions and counts; no names or
personal data).

**Where it stands:** built and tested. Four items, below. One new migration
to paste (`20261117150000`), two functions to deploy (`student-audit`,
`modify-payment`), the screens on the next push to main.

## 1. The statement never prints a deleted payment as money received (review R-N1)

`supabase/functions/student-audit/index.ts` (the Account Statement's source,
admin only): an audit row written by `public.record_admin_payment`
(`diff.via = "record-payment"`) is now NEVER listed. Before, it was skipped
only while its payments row still existed - so a record-payment payment that
was later deleted (delete-payment removes the row, the audit row stays) printed
as "Payment recorded", kind `payment`, i.e. as money received on the statement
(`StudentStatementPrint.tsx`: events of kind payment or correction, by absolute
amount). The payments row is the source: listed while the payment stands, gone
when it is deleted. A deleted correction and an undone assistant payment
(item 4) are the same shape and are covered by the same line. Every other case
is unchanged: the old screens' audit-only payments and corrections, the old
assistant rows (`via: "assistant"`), family payments, confirmations, ledger
legs (adjustments).

Live (count only): 0 audit rows with `via = 'record-payment'` today and 0
record-payment ledger legs - nothing printed wrongly yet.

**Proof:** `scripts/pgtest/student-audit-statement.test.mjs` (27/0, registered,
expect 27). The function BEFORE (kept byte for byte as
`scripts/pgtest/fixtures/student-audit.before-followups.ts`, LF md5
`fa04a8014b1b1c819a5ecb9dd6b7f5a3` = student-audit v5 as deployed per
G1-record-payment.md) and AFTER, both bundled, answer the same request over one
fixture (old screen payment + correction, old assistant payment + undo, family
payment, confirmation, a closed month, record-payment payment and correction
that stand, ones that were deleted, an assistant payment undone, ledger legs,
another child's rows). Compared: no event added; every event removed is an
audit row with `via = 'record-payment'`; every other event byte-identical in
order; months, totals, student and actors identical; "Payments received" after
= before minus exactly the three deleted/undone ones (before: 150,000 / 20,000
/ 90,000 printed as received - the bug, reproduced).

## 2. The retry key outlives the dialog (review R-N2)

The four payment screens (RecordPaymentDialog, QuickPayPanel,
BatchPaymentDialog, RecordedPaymentManager - the only screens that send an
idempotency key; the family payment screens send none) held the key in a
`useRef`: closing the dialog after "no answer from the server" and entering the
same payment again made a NEW key, so a payment that had in fact been recorded
was recorded twice.

`src/lib/recordPayment.ts` now has `createPaymentKeyStore()` and the shared
`paymentKeys`: a module-level map mirrored in `sessionStorage` (every access in
try/catch; memory alone when storage refuses), keyed by the attempt - child +
month + kind + amount. The bill is child + month; the invoice row's id is NOT
used, because a payment for a month with no bill creates the bill on the way,
so a reopened dialog would see a real id where the first had a placeholder and
make a new key. `keyFor(attempt)` is taken when Save is pressed (before the
request leaves); `settle(attempt, result)` drops it only on a definite answer
(recorded, or record-payment's own refusal - a duplicate included). A different
amount is a different payment and gets its own key. All four screens use it;
no component holds a key any more.

**Proof:** `scripts/pgtest/record-payment.test.mjs` section 15 (over the REAL
record-payment handler, the real functions-js client, the D4 world): recorded,
reply lost -> the store keeps the key after the dialog is gone; reopened and
entered again -> 409 duplicate, paid ONCE; that answer clears the key and the
next equal payment records; nothing arrived -> reopened retry records once with
the kept key; tab reloaded in between (new store, same sessionStorage) -> paid
once; sessionStorage throwing on every call -> memory keeps it, paid once; the
key is per attempt (amount, kind, month, child); control: the old component key
pays the reopened retry again (800,000). Section 14 static: all four screens
take the key from `paymentKeys.keyFor(attempt)` and `settle` it, no `useRef` /
`newPaymentKey` left.

## 3. modify-payment retired (D5 G-2; owner D-22 via conductor)

`supabase/functions/modify-payment/index.ts` is a 410 Gone stub exactly like
settle-bill's: no import, no client, no environment, the body never read; CORS
preflight answered as before; the comment says why (it moved the ledger but
never the bill, booked 'Cash' to BANK, ignored insert errors; delete-payment +
record-payment cover every case). `src/components/admin/ModifyPaymentModal.tsx`
(its only caller, mounted nowhere) is deleted: before the deletion, `grep
ModifyPaymentModal src hec-docs` found only the file itself, and nothing under
`src/` or `supabase/functions` invoked `modify-payment`. Live (count only):
0 `payment_modifications` rows, 0 payments with a `parent_payment_id` - it was
never used. delete-payment is unchanged (it still refuses rows modify-payment
made, of which there are none). `supabase/config.toml` keeps
`[functions.modify-payment] verify_jwt = true`.

**Proof:** `money-write-paths.test.mjs` section 1b (the stub reads and writes
nothing, answers 410, its six writes unpinned, nothing calls it, the modal is
gone and named only by the stub's comment); `s2-edge-functions.test.mjs` F-11
(modify-payment now: admin-teacher, teacher and no token all 410, nothing read
or written; the BEFORE defect still reproduced); `invoice-status.test.mjs`
(the "moved to November" case: modify-payment answers 410 and writes no table
or bill; the recalculation it used to ask for is asked for directly; every
figure as before, golden unchanged).

## 4. The assistant's payment step on the ledger (migration 20261117150000)

NEW `supabase/migrations/20261117150000_ai_action_payment_on_ledger.sql`
(LF md5 `2126b8e9519227e961a1158dec7bcf80`), started from
`docs/sql/ai_action_apply_undo.installed.sql` (whose CR-stripped
`pg_get_functiondef` md5s equal live's, read 17 Nov: apply `8477e385...`,
undo `1bc731cc...`). `public.invoice_paid_label` kept.

**Apply.** The payment step calls `public.record_admin_payment` in the same
transaction: payments row (new uuid), both ledger legs keyed
`record-payment-<payment>-<child>`, the bill by compare-and-set under its row
lock with the one label rule (credit kept), and the audit row (`via:
record-payment`). A month with no bill first gets a bill with no charge (as
before; record_admin_payment records only on an existing bill). The action's
own `record_payment` audit row (`via: assistant`) is no longer written - two
rows would print the payment twice. Over 500,000,000 (record_admin_payment's
bound; the plan check allows 1,000,000,000) is refused before anything is
written. `effects.payment` now also keeps `payment_id`, `ledger_tx_id`,
`ledger_account`, `recorded_before/after`.

**Invoker inside definer.** `ai_action_apply` is SECURITY DEFINER (owner
`postgres`, BYPASSRLS, not superuser - live); `record_admin_payment` is
SECURITY INVOKER, so inside apply it runs as `postgres`: the owner may EXECUTE
it (the REVOKE is from PUBLIC / anon / service_role), row security is apply's
as for every other write apply makes, and its admin check reads `auth.uid()`
- the JWT subject, which a definer function does not change - so it sees the
admin who pressed Confirm (apply checked the same first). D4's `_caller_lane()`
also reads `auth.uid()`: lane `person`. Proved in the D4 world (below): every
payment write carries `auth.uid()` = the admin.

**Undo of a payment recorded this way** (`effects.payment.payment_id`), as
delete-payment does: two reversal legs keyed `payment-reversal-<payment>-<leg>`
(never an UPDATE / DELETE of a ledger row - G-11), the amount off the bill by
compare-and-set under the row lock (label rule, credit kept, paid_amount
floored at 0; an empty bill the action created is deleted, as before), a
`payment_deletions` snapshot, the payments row deleted, an audit row
(`payment`, `delete`, `via: assistant-undo`). Refused with reasons (nothing
changed) when the payment was deleted since (Delete payment), changed since,
already reversed, the month is closed, or the bill holds less than it put
there. An action applied BEFORE this migration (no `payment_id`) is undone
exactly as before (bill only).

**The payments delete trigger.** `prevent_client_payment_deletion`
(20251024152825) lets only the service role delete a payments row, so undo
could not delete one. `prevent_direct_payment_deletion()` now also lets
`ai_action_undo(uuid)` through, recognised from the SERVER's call stack: the
outermost frame must be exactly `PL/pgSQL function ai_action_undo(uuid) line N
at SQL statement`, the only function of that name anywhere, public, plpgsql,
SECURITY DEFINER (the test D4's register guard uses). A client cannot fake the
stack; undo deletes only the one payment its own action recorded (`ai_actions`
is not writable by clients). Everything else is as before - including that a
caller with NO JWT role (the SQL editor) may delete, which the old `IF
auth.role() != 'service_role'` allowed (NULL) and the new
`IF (auth.role() != 'service_role') IS NOT TRUE` keeps.

**A new child + payment (conductor's ruling).** Undo no longer deletes the
child once a payment of the action is on the ledger (or the child has ledger
accounts): it is deactivated (`students.is_active = false`; live's triggers set
`deactivated_at` and end enrolments), after everything else is removed as
before (enrolment and its placeholder marks, discount, family, hold, bills with
no money, points rows). Its ledger accounts and the four legs stay
(append-only; deleting the child would cascade into G-11's trigger, and D4
G-21 refuses to delete a child with money history anyway - both proved). A new
child with no payment is deleted exactly as before.

**What undo says.** The answer has `notices` (and `student_deactivated`,
`payment_reversed`); the two screens that undo (AiActionBanner, AiActionsTab)
show them in the success toast. The texts:
"The 200.000 ₫ payment for Nov 2026 was taken back as Delete payment does: two
reversing entries were added to the ledger (it keeps every entry), it came off
the Nov 2026 bill, and the payment record was deleted." and "<name> was not
deleted but made inactive: the payment this recorded stays in the ledger's
history (reversed), and a child with ledger history keeps their record.
Everything else the assistant set up for them was removed."

**ai_student_activity.** New `ai_student_activity(student, own_payments
uuid[])` (EXECUTE revoked from PUBLIC, anon, authenticated, service_role): as
before ("every table with a student_id column is counted"), except the action's
own money - its payments rows, the ledger transactions of those payments and of
their reversals (ledger_accounts is now counted as the child's ledger ENTRIES
not belonging to them; an account is a container every payment path creates),
and the D4 `invoice_state_floor` rows of their months. The one-argument form is
the same rule with no own payments. Undo passes the action's payment id.

**Preflight (fails closed, nothing changed):** every table/column used;
`record_admin_payment`, `invoice_paid_label`, `auth.uid()`, `auth.role()`;
`ai_action_apply`, `ai_action_undo`, `ai_student_activity(uuid)` and
`prevent_direct_payment_deletion()` must be EXACTLY the installed versions it
replaces (CR-stripped md5 of `pg_get_functiondef`, read on live) or already
this migration's (so a second paste is accepted and changes nothing); the
payments delete trigger must exist; no other `ai_student_activity(uuid,
uuid[])`.

`docs/sql/ai_action_apply_undo.installed.sql` regenerated from the installed
functions (T4_WRITE_REFERENCE=1 after checking the diff), LF md5
`2119ffafd220e4f011b76742294e957a`.

**Proof - `scripts/pgtest/ai-actions.test.mjs` 137/0** (was 80; registered
with G-11, 20261117121000 and this migration loaded; expect 137). Its schema
now carries payments, payment_deletions, ledger_accounts / ledger_entries
(live's columns), live's payments delete trigger verbatim from 20251024152825,
D4 G-21's `_student_delete_guard` verbatim from 20261114094000, an
invoice_state_floor stand-in, and G-11 itself. Every step type applied and
undone (new child, family, hold, enrol, discount, payment on an existing child,
payment on a new child, the old bill-only shape). New section "the payment is
on the ledger": payments row / two keyed balanced legs / bill / one audit row;
M03 / M04 (ledger cash = recorded per month) and M01 (balanced) before and
after undo; undo's reversal legs, payment_deletions, audit, nothing in the
ledger updated or deleted; refusals (changed since, already reversed, deleted
since) change nothing; over 500,000,000 refused before writing; the delete
rule (an admin's DELETE refused; one inside another definer function refused;
undo called from a wrapper function refused and reported, nothing changed; a
same-named function in another schema makes the real undo's delete refused -
fails closed; service role and the no-role SQL editor delete as before); the
old shape undone as before; new child + payment kept inactive with both
notices, everything else removed, ledger 4 legs net 0, deleting the child
refused by the database; a person's later payment blocks the undo of a new
child, naming it, with the action's own payment not counted; a new child with
no payment deleted as before; the ledger failing inside the payment step
leaves no child, payment, bill or log row; the migration's pins equal the
installed versions; pasted twice changes nothing; it refuses (changing
nothing) for an unknown undo, an unknown delete rule, a missing delete
trigger, a missing record_admin_payment, a missing payment_deletions column;
apply writes no recorded_payment / ledger / payments itself; undo never
updates or deletes a ledger row. The T4 re-paste now stops with T4's own
"expected exactly one label expression ... found 0; nothing was changed" (apply
has no label expression left) - asserted, nothing changes.

**Proof in the D4 world - `record-payment.test.mjs` section 11b** (every D4
file incl. 093000/094000, G-4, G-11, every trigger live has on the money
tables): the assistant's migrations then this one install (every preflight
passes); an existing child paid and undone (row deleted, two reversal legs,
bill 0); every payment write with `auth.uid()` = the admin; Delete payment
deletes an assistant payment like any other, and the undo then refuses and
changes nothing; a new child in a family paid for: deleting it is refused by
the database, the undo keeps it inactive, out of the family, ledger 4 legs net
0. Section 12 then runs `scripts/CHECK-money-invariants.sql` itself over
everything written, assistant payments and undos included: **M01 0, M03 0,
M04 0, M08 0** (control: an old-style bill write makes M03 1).

## Test harness brought onto this branch (said, as the common rules ask)

main's `scripts/pgtest` lagged: no record-payment suite, run.mjs registered
~50 suites (no money suites). Taken: `scripts/pgtest` from the local branch
`g1-fix` (89307a29, = origin/conductor/work's harness + the D5 / G-1 suites),
then main's newer copies of `ledger-append-only`, `money-invariants-check`,
`ivory-scope`, main's leaderboard / lesson-monitor / approvals / review-d5
files and main's two leaderboard entries in run.mjs. Also from g1-fix the SQL
the suites read: `scripts/ROLLBACK-d4-{1,2,4,5}-*.sql`,
`CREDIT-past-unapplied-cash.sql`, `CHECK-unlinked-accounts.sql`,
`FIX-remove-unbacked-teacher-role.sql` (main's CHECK-money-invariants.sql kept -
it is newer). `money-write-paths` was failing on main already (8 of its own
checks): its pins now match main as found (2 enrolment writers, 21 RPCs from
the leaderboard / lesson monitor / approvals, EconomyActions 1 write,
link-student-user no family delete, G-8's OperationalReports sessionPayVnd
import gone) - marked in the file as pinned as found, not reviewed here.

**Two live migrations main did not have:** `20261114093000_d4_lesson_pay_guard.sql`
and `20261114094000_d4_money_inputs_guard.sql` are live (all 29 function bodies
of the two files, CR-stripped md5 of prosrc, equal live's - read 17 Nov) but were
never on main; conductor/work has them. Restored into `supabase/migrations/`
verbatim from origin/conductor/work (LF md5 `8e3c73a0...` / `7b0bc8f4...`) so
the authoritative tree matches live and the D4 suites can load them. **They are
already applied: do NOT paste them.**

## Gates

Run in Hanoi daytime, real clock (no shim).

- `node scripts/pgtest/run.mjs`: see the hand-back (numbers filled from the final
  run). The money gates: record payment (G-1) 122/0, G-1 probe delete trigger
  123/0, AI admin actions 137/0, statement: deleted payments 27/0, money write
  paths 28/0, money invariants check 125/0, ledger append-only 30/0, shared-module
  mirrors 19/0, edge functions typecheck 5/0, app typecheck 3/0.
  invoice status 301/16 - the SAME 16 as before this change (the baseline run of
  this harness on main without these changes: 301/16); they are main's
  settlement-write-off reader lag (removed-money-features 35/2 likewise), not
  touched here. Golden `scripts/pgtest/fixtures/tuition-figures.golden.json`
  `181298c3b173095b02ed95c69f9ed24a`, unchanged.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npm run test:bun`: 142 pass / 3 fail - the 3 are main's own (functionError
  reads the deleted SettleBillModal.tsx; two richText suites import
  `scripts/fixtures/rich-text`, which main lacks); no bun test touches this change.

## Files (LF md5 = CR stripped)

| md5 | file | how it ships |
|---|---|---|
| `2126b8e9519227e961a1158dec7bcf80` | supabase/migrations/20261117150000_ai_action_payment_on_ledger.sql (NEW) | paste |
| `be0fa080c7bdeddb9793ea298c29d831` | supabase/functions/student-audit/index.ts | deploy (no _lib imports) |
| `79df447430d01aaac9434948a2b942c1` | supabase/functions/modify-payment/index.ts (410 stub) | deploy (no imports) |
| `0d40722d6a1712082ebe0e14ff078012` | src/lib/recordPayment.ts | push to main |
| `d871067bc2c5ac1fe81b8af1ed6828bf` | src/components/admin/RecordPaymentDialog.tsx | push |
| `20237b021ae1b7c11c8c46dfe2603d5b` | src/components/admin/QuickPayPanel.tsx | push |
| `23dd8cf74466a9a46df741724775ea89` | src/components/admin/BatchPaymentDialog.tsx | push |
| `b5c65e40f3c85f4baba5fa1f8863c3e1` | src/components/admin/RecordedPaymentManager.tsx | push |
| `f23b3dee814155a572d5f98a2553cacd` | src/lib/aiActions.ts | push |
| `30ff674cf2ffa088964568f68da2731a` | src/components/admin/AiActionBanner.tsx | push |
| `a5ed2e2d7f17c1d044acce1715ab4b5d` | src/components/admin/tabs/AiActionsTab.tsx | push |
| (deleted) | src/components/admin/ModifyPaymentModal.tsx | push |
| `2119ffafd220e4f011b76742294e957a` | docs/sql/ai_action_apply_undo.installed.sql | reference |
| `8e3c73a025385e85f7ec17e33e888adc` | supabase/migrations/20261114093000_d4_lesson_pay_guard.sql (restored, ALREADY LIVE) | do not paste |
| `7b0bc8f4b33f2b7419164b06220b5625` | supabase/migrations/20261114094000_d4_money_inputs_guard.sql (restored, ALREADY LIVE) | do not paste |
| `be0072194efe02452a2a6120caf9ed3b` | scripts/pgtest/ai-actions.test.mjs | |
| `e17c3f1c23776ab7bc9f8214a3355b3c` | scripts/pgtest/student-audit-statement.test.mjs (NEW) | |
| `fa04a8014b1b1c819a5ecb9dd6b7f5a3` | scripts/pgtest/fixtures/student-audit.before-followups.ts (NEW, = v5) | |
| `92e17e681457e15b9a0cf9819c712207` | scripts/pgtest/record-payment.test.mjs | |
| `e2a74fe13fd000f39f86cdbf01a7fec4` | scripts/pgtest/money-write-paths.test.mjs | |

Also `scripts/pgtest/invoice-status.test.mjs`, `s2-edge-functions.test.mjs`,
`run.mjs`, the harness files listed above, `docs/evidence/D5-audit.md` (G-2
closed, write-path rows).

## Deploy order

1. **Paste `20261117150000_ai_action_payment_on_ledger.sql`.** Its preflight
   refuses (nothing changed) unless apply, undo, ai_student_activity and the
   payments delete rule are exactly what live has today (read 17 Nov) and
   record_admin_payment is installed. Check afterwards (read-only):
   `md5(replace(pg_get_functiondef('public.ai_action_apply(uuid,text,jsonb)'::regprocedure), E'\r',''))`
   = `7f5b1484fb593b4e351fb473f0e800a4`, undo `d8a20222c9d09a3e54d3776efaf07b7f`,
   `prevent_direct_payment_deletion()` `c825892f49f9fe45d2818496d0d57d30`,
   `ai_student_activity(uuid)` `ed908438003457e75bb6c9dc7a74c7fe`,
   `ai_student_activity(uuid,uuid[])` `a31cfcbafc496ab4dcf5012feacffd4b`, and
   `has_function_privilege('authenticated','public.ai_student_activity(uuid,uuid[])','EXECUTE')` false.
   Independent of the rest: an assistant payment made before it stays bill-only
   and is undone as before.
2. **Deploy `student-audit`** (R-N1) and **`modify-payment`** (the stub). Either order.
3. **Push the screens** (R-N2 and the undo notices). The old screens with the
   new migration simply ignore `notices`.

## What a reviewer should attack

- The delete-trigger exception: can anything other than ai_action_undo's own
  DELETE (of the payment its action recorded) make the outermost frame
  `ai_action_undo(uuid) ... at SQL statement`? (Wrappers, DO blocks, pg_temp
  shadows are refused - tested; dynamic SQL inside undo would print a
  different line.) Is extending this guard acceptable, or should undo keep the
  payments row (statement then needs another rule)?
- Undo of new child + payment: deactivation goes through D4's
  `_family_link_guard` (is_active). In the D4 world a new child with no billed
  month passes (tier 0) - tested; a child whose bill was priced by
  calculate-tuition in between was not tested under D4.
- Deleting the created child's bills on deactivation: they hold no money
  (activity check), but a priced bill of the month the payment was for is
  deleted too, as the old undo did for a deleted child.
- R-N2's attempt identity (child, month, kind, amount): two genuinely separate
  equal payments after an unanswered first one - the second is refused as a
  duplicate (if the first landed), which clears the key; the admin enters it
  again. Acceptable?
- ai_student_activity now counts ledger ENTRIES for ledger_accounts (not
  accounts) and skips the action's floor months.

## What I could not check

- Real concurrency inside Postgres (pglite is one connection).
- The live `pg_get_functiondef` text after the paste (the new md5s are
  pglite's; the old ones matched live exactly, so the formatting agrees).
- The toast rendering (not run in a browser).
- main's other lagging suites (invoice-status' write-off reader, D4 function
  suites, payroll function suites, s2-edge-functions' BASE bundle) - pre-existing,
  same in the baseline run, untouched.
