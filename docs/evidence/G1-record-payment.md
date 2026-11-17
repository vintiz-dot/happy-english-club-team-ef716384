# G1 - one admin record-payment function (D5 gap G-1)

Branch `g1-record-payment` (from `origin/pc2/record-payment` 9249b95f, which
was cut from `origin/claude/d5-money-audit` f3ee41db). MONEY: YES.
Build and test only: nothing deployed, no migration applied, no live
database touched, nothing pushed.

**Where it stands:** built and tested. The function, delete-payment's change
and the four screens are ready for an independent review, then deploy in the
order below. `ai_action_apply`'s payment step is NOT changed (section 5: it
does not fit cleanly - an owner decision first).

**Superseded in part by "Fix round 1" at the end:** the independent review
said DO NOT SHIP (B-1: the undo's DELETE is refused on live; B-2: a dropped
connection counted as answered). The three PostgREST writes and their undo
are now ONE database transaction (`record_admin_payment`, migration
20261117120000). Where a section above describes the undo, the reversal legs
or `halfDone`, Fix round 1 is what holds.

## The gap

RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog, RecordedPaymentManager
(through `src/lib/recordedPaymentWrite.ts`) and `ai_action_apply` put money on
`invoices.recorded_payment` with no `payments` row and no ledger legs
(D5-audit G-1; M03 counts it on live: 495 bills / 761.7M VND - history, NOT
touched or backfilled here).

## Design (as built)

- `record-payment`: admin only - `requireRole(["admin"], { allowServiceRole:
  false })`, so the service key is refused (403) as well as teachers, parents
  and anonymous callers. Every read and write of the child's data goes
  through the CALLER's client (`callerClient`: anon key + the admin's JWT), so
  RLS (the admin FOR ALL policies of 20251012023454) and the D4 triggers see
  the admin (`_caller_lane()` = person). The service client is used only for
  the role check and for the `calculate-tuition` invoke (pricing a missing
  bill, refreshing after) - the internal call every payment path makes.
- Input: one child, the month the screen CONFIRMED
  (`useTuitionMonthConfirmation` stays on all four screens), `kind` payment
  (adds) or correction (takes off; note required, never below 0), whole-dong
  amount 1 .. 500,000,000, method as the screen labels it (CASH leg when
  `method.trim().toLowerCase() === "cash"`, every other method BANK),
  receipt date, memo, `idempotencyKey` (uuid), optional `expectedRecorded`.
- Before anything is written: the student exists (404); the key has no
  payments row (409 `duplicate`) and appears in no ledger key (409 "tried
  before and undone"); the bill exists - a payment for a month with no bill
  asks calculate-tuition to price and save it first (never from screen
  figures; 409 "try again" if it still is not there), a correction for a
  month with no bill is refused (409, nothing created); `expectedRecorded`
  matches (409 `conflict`); a correction would not go below 0 (409).
- Order: `payments` row (id = the key; a correction is a negative amount)
  -> both ledger legs in ONE insert, keyed on the cash leg
  `record-payment-<payment_id>-<student_id>` (payment: DR CASH|BANK / CR AR;
  correction: DR AR / CR CASH|BANK), both on the confirmed month, dated by the
  receipt -> compare-and-set on `recorded_payment` (`addToRecordedPayment`:
  re-read and retry once; the retry re-checks `expectedRecorded` and the
  floor of 0), label by `labelAfterPayment` (an admin's `credit` kept),
  `paid_amount` moved with it -> audit row `record_payment` /
  `payment_correction` (names payment, ledger tx, account) -> calculate-tuition
  refresh.
- Never half-done: if the ledger insert fails, the payments row is deleted
  (and any legs that did land, read back by tx_id, reversed). If the bill
  write fails after the legs, the legs are reversed by NEW legs keyed
  `payment-reversal-<payment_id>-<leg_id>` (G-11: the ledger is append-only;
  nothing is updated or deleted there) and the payments row is deleted; the
  answer says "nothing was recorded" (`undone: true`). If that undo fails too
  the answer is a 500 `halfDone` naming the payment id and saying it is NOT on
  the bill and must NOT go through Delete payment (which would take money off
  the bill).
- Double click: the payments row's id is the key, so a second request with
  it is refused before writing, and if two arrive at once the second insert
  meets the primary key (23505 -> 409 duplicate). `ledger_entries.tx_key` is
  UNIQUE, which is the last stop if a retry ever raced an undo.
- Locked / closed months: not refused (the family paths do not refuse them).
  Frozen bills: not refused (a freeze locks charges, not payments); the D4
  frozen-bill guards do not fire (same child and month, still frozen).

## What changed in this round (review of the WIP)

1. `record-payment` wrote everything with the SERVICE key. Now the caller's
   client (above); the suite asserts every write was made as `authenticated`
   with the admin's uid and none with the service key.
2. A correction for a month with no bill asked calculate-tuition to create
   the bill and then refused it - a side effect for nothing. Now refused
   before anything (no bill created, calculate-tuition not called).
3. RecordedPaymentManager sent `invoice.month` (the row's) and a UTC date.
   Now it sends the month the admin confirmed (`selectedMonth`, and refuses if
   the row is not that month) and today in Hanoi (`receiptDateToday()` in
   `src/lib/recordPayment.ts`; a UTC date is yesterday before 07:00 Hanoi).
4. delete-payment's read of a positive allocation's bill now selects
   `student_id, month` too (its error messages named "the  bill").
5. Everything else in the WIP held against the design and the hard rules
   (case-insensitive CASH/BANK, never below 0 at the first check AND the
   retry, reversal legs not deletes, payments row deleted on undo, key cannot
   pay twice, credit kept, confirmed month written, D4 guards not tripped).

Design note, not changed: the three writes are three PostgREST calls, so a
crash of the function's isolate between them (not an error it sees) can
still leave a payments row with no legs, or legs with no bill money. The
second is exactly what M04 reports (section 13 of the suite proves it), the
first shows in the payments list. A single plpgsql function doing all three
in one transaction would close that window entirely; it is a migration and a
review of its own, so it is offered, not built (open question 2).

## Tests

`scripts/pgtest/record-payment.test.mjs` (registered in `run.mjs`, expect 65; 65/0):
the REAL record-payment and delete-payment handlers bundled with esbuild,
against a PostgREST stand-in over one pglite built from `D4_BUILD` (D2's
prelude, its baseline, ALL FIVE D4 files), live's ledger / payment tables,
policies and grants, the carry trigger 20261009120000, invoice_paid_label,
G-4 20261117110000 and G-11 20261117111000. User clients run as
`authenticated` with RLS; the service key as `service_role`.

| Section | Holds |
|---|---|
| 0 | every D4 file, G-4, G-11 loaded; invoice / ledger / audit triggers on |
| 1 | no token 401, teacher 403, parent 403, service key 403, forged 401; 11 malformed bodies 400; unknown child 404 - nothing written by any |
| 2 | payment: payments row (id = key), two legs one tx balanced, cash leg keyed, AR unkeyed, confirmed month not receipt month, bill + label + carry, audit row, ALL writes as the admin, calculate-tuition once |
| 3 | 'cash' / 'CASH' / ' Cash ' / 'Cash' -> CASH; 'Bank Transfer' / 'bank transfer' / 'Card' / 'Other' -> BANK |
| 4 | correction: down, legs DR AR / CR CASH, negative payments row; below 0 refused with nothing written; to exactly 0 relabels issued; no bill -> 409, no bill created |
| 5 | 'credit' kept; a frozen bill takes a payment and a correction, figures unchanged; un-paying a paid bill is allowed and the D4 floor records ever_paid / max 400,000 |
| 6 | missing bill made by calculate-tuition then paid; calculate-tuition failing -> 409, nothing written |
| 7 | stale `expectedRecorded` -> 409 conflict, nothing written |
| 8 | the same key twice at once: one 200, one 409 duplicate; again later 409; three more at once all refused; paid once |
| 9 | two keys at once on one bill: both land (CAS missed once and re-read); two screens both showing 0: one lands, the other refused and fully undone; two corrections at once that together would go below 0: one lands, the other refused at the re-read and undone |
| 10 | bill write fails after the legs: 409 undone, bill unchanged, row gone, two reversal legs, net 0; key then refused; ledger insert fails: 500, nothing left, the key then pays once; the ledger refuses UPDATE / DELETE (HC130) |
| 11 | delete-payment reverses a record-payment payment (bill, two reversal legs, row gone, deletion record), refuses a second time; deleting a CORRECTION puts the money back; refuses when the bill now holds less |
| 12 | `scripts/CHECK-money-invariants.sql` itself over a copy of everything written: M01 0, M03 0, M04 0, M08 0; control: one old-style screen write makes M03 1 |
| 13 | undo failing: 500 halfDone naming the payment; that state is M04 1 |
| 14 | static: the four screens call recordPayment, write neither the bill nor audit_log; month confirmation kept; invoke only; verify_jwt = true; requireRole admin / no service lane / callerClient |

Mutation pass (scratchpad `g1-mutants.mjs`, each mutant applied to the source,
the suite run, the file restored byte for byte): 13 mutants, 13 killed - data
through the service key; CASH only for exactly "Cash"; no below-0 check before
writing; no below-0 check at the CAS retry (survived the first pass; killed
after section 9 gained the two-corrections-at-once case); undo deleting the
legs; undo leaving the payments row; credit label not kept; no duplicate check;
legs on the receipt month; no expectedRecorded check; the CAS without its
condition (`_lib`); delete-payment skipping corrections; a correction allowed
with no bill.

`money-write-paths.test.mjs` (expect 20 -> 22): record-payment's four writers
pinned (ledger_accounts upsert, ledger_entries insert x2, payments insert,
payments delete); the four screens call record-payment and write no money
table; nothing under `src/` calls `setRecordedPayment` any more (the browser
file stays only as the registered mirror of `_lib/recorded-payment-write.ts`;
mirrors unchanged). `invoice-status.test.mjs` and
`fixtures/tuition-figures.golden.json`: unchanged (not edited; both runs green
below). `edge-functions.test.mjs` type-checks every file under
`supabase/functions`, so record-payment is in it. `ai-gate.test.mjs` is for
the nine functions that spend vendor credit; record-payment calls no vendor
(no `requireSpender`), has `verify_jwt = true`, and the gate's list of
public functions is unchanged - asserted by ai-gate as it stands.

Gates (Hanoi daytime, no clock shim needed):

- `node scripts/pgtest/run.mjs`: **8788 assertions across 93 suites, 0 failed**
  (D5 round 1 was 8721 / 92: + 65 record-payment, + 2 money-write-paths).
  invoice status 317/0 and invoice status + G-4 317/0, golden unchanged;
  d4 class fee 174/0 (it re-runs invoice-status inside); money invariants
  120/0; ledger append-only 26/0; past leftover credit 29/0; mirrors 19/0;
  edge functions typecheck 5/0; app typecheck 3/0; S2 edge functions 107/0.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0
- `npm run test:bun`: 250 pass / 0 fail (18 files)

`invoice-status.test.mjs` changed in TWO static assertions only (its count
and every figure are as before): "takes the label from @/lib/invoiceStatus"
now also accepts a screen that leaves the label to record-payment, and
"writes recorded_payment only through setRecordedPayment" became "puts money
on the bill only through record-payment (expectedRecorded = the screen's
figure) and handles a refusal" - they pinned the old screen code this change
replaces. Its dynamic cases of `setRecordedPayment` (the library, still the
registered mirror) are unchanged.

## Files (LF md5)

Deployed as edge functions (the `_lib` files they bundle are unchanged by
this work - `git diff f3ee41db` touches nothing under `supabase/functions/_lib`,
`supabase/migrations` or `docs/sql`):

| md5 (CR stripped) | file |
|---|---|
| `24c4f50f44171830400a5496d9caca9e` | supabase/functions/record-payment/index.ts (NEW) |
| `3c80e93c2a1fefefadb99ab48c248c6f` | supabase/functions/delete-payment/index.ts |
| `ce6470c236d307bcfdc4c07eced08f14` | supabase/functions/_lib/recorded-payment-write.ts (unchanged) |
| `a278832ac3c18b088c5a9c84f9e31ed1` | supabase/functions/_lib/invoice-status.ts (unchanged) |
| `9046deec2a7253a8287b3f64f1ee4659` | supabase/functions/_lib/session-guard.ts (unchanged; `callerClient`) |
| `92b44db93cd2614a2fb3011e3a9063ba` | supabase/functions/_lib/auth.ts (unchanged; `requireRole`) |

The screens (push to main):

| md5 (CR stripped) | file |
|---|---|
| `28a78d810edf8998d7e9afc6eedd6c7c` | src/lib/recordPayment.ts (NEW) |
| `603669db71f6ac93f72465171e48ac32` | src/components/admin/RecordPaymentDialog.tsx |
| `f1530f5337e55451f8136e3c794bb7c8` | src/components/admin/QuickPayPanel.tsx |
| `5e55548d0bcb35404994a8e8bcaf77d5` | src/components/admin/BatchPaymentDialog.tsx |
| `b268d8dc5269cf453c949d2b9bf58356` | src/components/admin/RecordedPaymentManager.tsx |
| `16586d861da15f74c98a09f5709acf0c` | src/lib/recordedPaymentWrite.ts (unchanged; mirror only now) |

Also: `supabase/config.toml` (`[functions.record-payment] verify_jwt = true`),
`scripts/pgtest/record-payment.test.mjs` (`1c40769603685b9bc992767f0b47e12f`),
`scripts/pgtest/money-write-paths.test.mjs`, `scripts/pgtest/run.mjs`,
`docs/evidence/D5-audit.md` (write-path rows). Golden
`fixtures/tuition-figures.golden.json` `181298c3b173095b02ed95c69f9ed24a`,
unchanged.

No migration in this change.

## Deploy order

1. No migration. G-11 (20261117111000, ledger append-only) should be live
   first or together: record-payment's undo already posts reversal legs, so it
   is correct with or without it; delete-payment as well.
2. Deploy `record-payment` (new) and `delete-payment` (keyKind knows
   `record-payment-`, puts a correction back) - both through the Supabase
   deploy, as edge functions are deployed by hand. `[functions.record-payment]
   verify_jwt = true` is in config.toml.
3. Then the screens (push to main): RecordPaymentDialog, QuickPayPanel,
   BatchPaymentDialog, RecordedPaymentManager and `src/lib/recordPayment.ts`.
   A screen released before step 2 would fail every payment with "function
   not found" (nothing written), not write the old way - so the order matters
   for availability, not for money.
4. After a few payments: CHECK-money-invariants M03 / M04 should stop growing
   (M03's 495 / 761.7M is history and stays).

## 5. ai_action_apply's payment step - NOT changed (needs a decision)

It would mean, starting from `docs/sql/ai_action_apply_undo.installed.sql`
in a new migration (after 20261117111000) with a preflight pinning both
installed bodies by CR-stripped md5:

- apply: in the `payment` branch, after the bill write (same row lock),
  `INSERT INTO ledger_accounts ... ON CONFLICT DO NOTHING` for AR / CASH /
  BANK, a `payments` row (amount, method as typed, `paid_on`, memo, created_by
  the admin), both legs keyed `ai-action-payment-<payment_id>-<student_id>`
  in one INSERT on the bill's month, and `payment_id` in `effects.payment`;
- undo: in the `payment` branch, reversal legs keyed
  `payment-reversal-<payment_id>-<leg_id>` and `DELETE FROM payments`;
- delete-payment's `keyKind` would have to learn `ai-action-payment-`.

Why it does not fit cleanly:

1. `ai_action_undo` of an action that CREATED the student deletes the
   student (`DELETE FROM public.students`). With a payment it would now have
   ledger accounts and legs: the cascade reaches `ledger_entries` and G-11's
   append-only trigger refuses it (HC130) - and that exception is not one the
   undo's handler catches (it catches raise_exception and foreign_key_violation
   only), so the undo would fail with a database error instead of a reason.
   D4 G-21 / G-11 say a child with money history is deactivated, not
   deleted - so "undo" of "new child + payment" has to change meaning (undo
   the payment, keep or deactivate the child), which is the owner's call.
2. `ai_student_activity` counts every table with a `student_id` column, so
   the action's own `payments` row and `ledger_accounts` would count as "people
   have added records for this student since" and block every undo of a new
   child that included a payment, unless both are excluded by the action's own
   ids - a change to the undo rule the AGENTS.md describes ("every table with a
   `student_id` column is counted").
3. Even for an existing child, reversal legs and the ledger accounts stay
   forever, so an undone assistant payment leaves ledger rows behind - that is
   the append-only rule working, but it is a visible change to what "undone"
   means for the admin.

So the AI action's payment stays bill-only (M03 keeps counting those) until
the owner rules on (1). Asked as open question 1.

## What an independent reviewer should attack

- The caller-client switch: every table record-payment touches must be
  writable by an admin under live RLS (payments, ledger_accounts,
  ledger_entries, invoices, audit_log). The suite uses live's policies as the
  migrations write them; the reviewer should confirm on live (read-only:
  `pg_policies`) that no later migration narrowed one of them - a missing
  INSERT policy would make every payment 400/500 with nothing recorded (safe,
  but a stop).
- The undo path: can any failure leave a payments row AND legs without the
  bill, other than the reported `halfDone`? (Isolate crash: yes, see the
  design note.)
- Idempotency: the `like('tx_key', '%<key>%')` check reads keys of OTHER
  payments too; a key is a fresh uuid per attempt, so a false hit needs a
  uuid collision. Is a duplicate after a lost reply reported clearly enough
  on the screens (they show the 409 message and reload)?
- `expectedRecorded` on the additive screens (QuickPay, Batch, the dialog)
  keeps the old behaviour (a bill changed since loading is refused). Under
  concurrency the refused request has already posted legs, so it is undone
  with reversal legs: correct, but the ledger carries the pair. Acceptable?
- Corrections as negative `payments` rows: anything that sums
  `payments.amount` (reports, modify-payment) now sees negatives from this
  path. delete-payment handles them (tested). modify-payment on a
  record-payment row was not tested.
- RecordedPaymentManager now books its edits as Cash or Bank (a new select,
  default Cash). An admin "fixing a figure" must pick the right one or the
  CASH/BANK split is off (the total is right either way).

## Open questions

1. AI action payments (section 5): may undo of "new child + payment" stop
   deleting the child (deactivate it, or undo only the payment)? Until then
   the AI action stays bill-only.
2. Should the three writes move into one plpgsql function (one transaction)
   to close the isolate-crash window? It needs a migration and its own review.
3. RecordedPaymentManager's Cash/Bank default: should it default to the
   method of the bill's last payment instead?

## Fix round 1 (review REVIEW-g1.md of 1549ec07: DO NOT SHIP, B-1 / B-2 / M-1..M-3 / N-1..N-4)

Branch `g1-fix` (from `g1-record-payment` 1549ec07). MONEY: YES. Build and
test only: nothing deployed, no migration applied, nothing pushed. Live was
read only (SELECTs of catalog definitions and counts; no personal data).

### The conductor's ruling (B-1 and M-3 together): one transaction

NEW migration `supabase/migrations/20261117120000_record_admin_payment.sql`:
`public.record_admin_payment(p_payment_id, p_student_id, p_month, p_kind,
p_amount, p_method, p_occurred_at, p_memo, p_expected_recorded) RETURNS jsonb`
does all three writes, plus the audit row, in ONE plpgsql transaction:

1. checks, in this order: a signed-in admin (`has_role(auth.uid(),'admin')`,
   RP403) before anything is read; every value in range (22023 - the same
   bounds as the edge function's zod, so it does not rely on them); the
   student (RP404); the key has no payments row (RP409); the bill, locked
   `SELECT ... FOR UPDATE` (RP424 if none); the key again after the lock (a
   request with it that was ahead has committed and is visible now); the
   key's `record-payment-<key>-%` leg not already in the ledger (RP410: the
   payment was recorded and has since been deleted - never paid again);
   `p_expected_recorded` (RP412 conflict); never below 0 (RP422);
2. the five ledger accounts `ON CONFLICT (student_id, code) DO NOTHING`;
3. the payments row (id = key; a correction is negative; `unique_violation`
   is reported as RP409);
4. both legs in one INSERT on one tx_id, the cash leg keyed
   `record-payment-<payment>-<student>` (delete-payment's `keyKind`, unchanged),
   AR unkeyed, both on the confirmed month and dated by the receipt;
   'cash' in any case/spacing -> CASH, everything else BANK;
5. the bill: `recorded_payment = before + delta WHERE id = bill AND
   recorded_payment = before` (compare-and-set under the lock), `paid_amount`
   floored at 0, `status` = `invoice_paid_label(after, total + carry_in_debt -
   carry_in_credit, base, total)` unless it is `credit` (kept) - the rule of
   `labelAfterPayment`;
6. the audit row (`record_payment` / `payment_correction`, the same diff keys).

Any error anywhere - a refusal, a trigger, a constraint, a timeout - rolls
all of it back. There is no undo path and nothing is deleted.

**SECURITY INVOKER, not DEFINER - why.** Invoker works: live (pg_policies,
read-only, 17 Nov) gives admins `FOR ALL` on payments, ledger_accounts,
ledger_entries, invoices and students and `INSERT` on audit_log, and
`authenticated` holds the table grants (the preflight checks them). So the
function can do nothing an admin could not already do through PostgREST,
row security stays the caller's, the D4 triggers see a person, and there is
no definer path to get wrong. The admin check is explicit anyway (a teacher
or parent is refused RP403 before anything is read). `SET search_path =
public, pg_temp`. EXECUTE: `authenticated` only - revoked from PUBLIC, anon
and service_role (live's default privileges grant new functions to all
three, read-only check of pg_default_acl).

**Preflight fails closed** (refuses to install, nothing created) if any of
39 columns, `invoice_paid_label(bigint x4)`, `has_role(uuid, app_role)`,
`auth.uid()`, the enum labels (invoice_status issued/partial/paid/credit,
account_code AR/CASH/BANK/REVENUE/CREDIT), a plain unique index on
ledger_accounts(student_id, code) / ledger_entries(tx_key) /
invoices(student_id, month) / payments(id), or authenticated's table rights
are missing, or another `record_admin_payment` signature exists. The suite
installs it into a minimal schema and removes each piece in turn (9 cases).

**The edge function** (`supabase/functions/record-payment/index.ts`) is now:
`requireRole(["admin"], { allowServiceRole: false })` -> zod -> the student
(caller's client) -> the bill exists: a correction with no bill is refused
(409, nothing created); a payment with no bill asks calculate-tuition to
price it and READS its returned error (N-2) - a still-missing bill is a 409
naming that error -> `supabase.rpc("record_admin_payment", ...)` with the
caller's client -> map: RP403 403, RP404 404, RP409 409 `duplicate`, RP410
409, RP412 409 `conflict`, RP422 409, RP424 409, 22023 400; a database error
with a SQLSTATE (or a PostgREST code) 500 "Nothing was recorded" (rolled
back); NO code (the reply never arrived) 503 `unknown: true` - it may have
committed, so the screen keeps the key -> the calculate-tuition refresh, its
error read and returned as `refreshFailed` (the payment stands). It writes
no table itself (money-write-paths pins that).

### Per finding

| Finding | What changed | Proof |
|---|---|---|
| B-1 undo cannot delete on live | No undo at all: one transaction (above). The suite now installs live's `prevent_client_payment_deletion` from the text of 20251024152825 and every other trigger live has on payments / ledger_accounts / ledger_entries / invoices (pg_trigger, 17 Nov: the updated_at triggers, G-11 round 2's `ledger_entries_stamp_created_at` and the refresh revoke) | suite s0 (16 triggers on), s9 (two screens at 0; two corrections at once: the loser wrote NOTHING, no reversal legs), s10 (bill write / ledger insert / payments insert / the audit row failing inside the transaction: counts unchanged, and the same key then pays once), s10 an admin's DELETE refused by the trigger, s13 (for every child: payments rows = bill money = AR credited; no payments row without its keyed leg - the orphan the review found), s12 M01/M03/M04/M08 0. The review's probe re-registered (`probe-g1-live-delete-trigger.test.mjs`) |
| B-2 a drop counted as answered | `src/lib/recordPayment.ts`: answered only when record-payment itself replied - a 2xx or an HTTP `Response` (`error.context instanceof Response`) carrying its own JSON `error` - and not `unknown`. A fetch failure, a gateway page, a relay error, a runtime 546 or the function's 503 `unknown` keep the key | suite s15 over the REAL functions-js 2.75.0 `FunctionsClient`: drop / 502 page / relay / 546 / 503 unknown -> not answered; 409 duplicate and 500 "Nothing was recorded" -> answered; end to end through the real handler: recorded, reply lost -> key kept -> the retry (screen reloaded) is a 409 duplicate, paid ONCE; control: the old rule's new key pays 1,000,000. The review's `probe-g1-answered.mjs` re-registered with assertions (2/0) |
| M-1 RPM pre-selects Cash | Two separate choices, `editMethod` / `reverseMethod`, start `""` with placeholder "Choose cash or bank", cleared whenever an edit or a reversal opens, required before sending (toast; the reversal button is disabled) | suite s14 static |
| M-2 UTC receipt dates | RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog prefill (and reset) with `receiptDateToday()` (Hanoi) | suite s14 static (all four screens; no `toISOString()` date) |
| M-3 a lost reply between the function and PostgREST | Closed by the one transaction: there is no state between two writes to lose a reply in. The one remaining unknown - the reply of the single rpc call - is reported as such (503 `unknown`), never as "nothing was recorded" | suite s10b: committed-then-lost -> 503 unknown, recorded whole, the retry 409 duplicate; lost-before -> 503 unknown, nothing written, the retry pays once; a coded PostgREST error -> 500 definite |
| N-1 RPM one key for all rows | One key per invoice row (`keyFor(invoice.id)`), dropped only when answered | suite s14 static |
| N-2 refresh errors invisible | `functions.invoke`'s returned `error` is read and logged at both calls; the missing-bill 409 names it; the refresh failure is returned as `refreshFailed` | suite s6 |
| N-3 modify-payment and record-payment rows | NOTE ONLY (as ruled): modify-payment is case-sensitive (`method === 'cash'`), writes no invoice and does not know negative rows; it is unreachable (ModifyPaymentModal is imported by no screen). Before anyone wires it back in, it should refuse a payment whose ledger key starts `record-payment-` | - |
| N-4 negative rows visible to families | Checked read-only (code): no family screen lists `payments` rows - StudentTuitionTab only subscribes to payments changes to refetch calculate-tuition's month figures (which net a correction), and the chat assistant reports `recorded_payment`. The one thing a family can receive that lists payments is the Account Statement (Reports -> student-audit -> HEC Docs template, fallback StudentStatementPrint), whose "Payments received" lists events of kind payment/correction by ABSOLUTE amount: a -200,000 correction would print as 200,000 received, and every record-payment payment would print TWICE (its payments row and its audit row). Fixed at the source, in `supabase/functions/student-audit/index.ts` (admin-only): an audit row `via: "record-payment"` whose `payment_id` is a listed payments row is skipped (one payment, one line), and a negative payments row is listed as an `adjustment` "Payment correction (taken off the bill)", signed - shown in the admin's audit panel, excluded from "Payments received"; the month's Paid column already nets it. The templates are not touched (hec-docs parity unchanged; a "Correction -X" line there needs an hec-docs rebuild, which this worktree cannot do - offered as a follow-up). Live has 0 negative payments today. Old audit-only `payment_correction` rows (the screens before G-1) are unchanged: they still print by absolute amount, as before | suite s14 static |

delete-payment: unchanged by this round; it still reverses a record-payment
payment completely (both legs, off the bill, the row deleted as the service
role - which live's trigger allows - and a deletion record), puts a deleted
correction's money back, and refuses when the bill holds less (suite s11,
now with live's trigger on). New: the deleted payment's key sent again is
refused (RP410), never recorded a second time.

### Tests (fix round 1)

`scripts/pgtest/record-payment.test.mjs`: **101/0** (was 65). Same harness
(the REAL record-payment and delete-payment over one pglite with every D4
file, G-4, G-11), plus: every trigger live has on payments /
ledger_accounts / ledger_entries / invoices; live's default EXECUTE grants
on new functions (so the migration's REVOKE is what keeps anon and the
service key out); the migration under test; `supabase.rpc()` as one
SELECT (one transaction, as PostgREST); a test trigger recording the
database role of every payment / leg / bill write; fault triggers that fail
the bill update, the ledger insert, the payments insert or the audit row
INSIDE the transaction; scripted lost replies on the rpc (before it ran /
after it committed). Every money case from before is kept, rewritten where
the design changed (no "CAS missed once", no reversal legs, no halfDone):

| Section | Holds |
|---|---|
| 0 | 16 live triggers on; the function is INVOKER, volatile, fixed search_path, EXECUTE authenticated only; its body has no DELETE / ledger UPDATE, locks the bill FOR UPDATE, writes recorded_payment only WHERE it still holds the value read |
| 0b | the preflight: installs into a minimal schema; refuses (nothing created) for each of 9 missing pieces |
| 1 | the HTTP gate as before (401/403/403/403/401, 12 malformed 400, 404); the RPC called directly: teacher / parent RP403, anon / service key 42501, 9 out-of-range values 22023, RP404, RP424 - none writes anything |
| 2 | a payment: row, two balanced legs keyed as delete-payment expects, confirmed month, bill + label + paid_amount + carry, audit row; the function makes ONE writing call; in the database every write was role `authenticated` as the admin |
| 3 | CASH / BANK whatever the case |
| 4 | corrections; below 0 refused with nothing written; to 0 relabels issued; paid_amount floored at 0; no bill -> 409 with no bill created |
| 5 | credit kept (in and out); frozen bill; D4 floor; carry-in debt -> partial and carry-in credit -> paid, as labelled by the function itself |
| 6 | missing bill priced by calculate-tuition; its returned error -> 409 naming it; a failed refresh -> `refreshFailed`, the payment stands |
| 7 | stale expectedRecorded -> 409 conflict, nothing written |
| 8 | one key twice at once / later / three at once / on another child / with a stale figure -> one payment, the rest 409 duplicate |
| 9 | two keys at once both land (two bill writes, each under the lock); two screens at 0 and two corrections at once: the loser wrote nothing, no reversal legs |
| 10 | bill write / ledger insert / payments insert / audit row failing: 500 "Nothing was recorded", counts unchanged, the same key then pays once; an admin's DELETE refused by live's trigger; ledger append-only |
| 10b | reply lost after commit -> 503 unknown, recorded whole, retry 409 duplicate; lost before -> 503 unknown, nothing, retry pays once; a coded PostgREST error -> 500 definite |
| 11 | delete-payment reverses a record-payment payment and a correction, refuses when the bill holds less; the deleted payment's key sent again -> 409 RP410 |
| 12 | CHECK-money-invariants M01 / M03 / M04 / M08 0 over everything above (faults and lost replies included); control M03 1 |
| 13 | per child: payments rows = bill money = AR credited; no payments row without its keyed leg |
| 14 | static: the four screens (record-payment only, month confirmation, Hanoi date), RPM method choice and per-row keys, recordPayment.ts invoke-only, verify_jwt, record-payment writes no table and reads the invoke error, student-audit's dedupe and correction kind |
| 15 | the answer rule over the real functions-js `FunctionsClient` and the real handler (B-2) |

The review's probes, registered in `run.mjs`:
`probe-g1-live-delete-trigger.test.mjs` **102/0** (the suite with
`G1_PROBE_LIVE_DELETE_TRIGGER`, which adds the probe's own check: the
trigger is the migration's text, refuses an admin's DELETE, lets the service
role through; the verbatim copy that failed 7 is the commit before it) and
`probe-g1-answered.mjs` **2/0** (the review's script, its print turned into
assertions). `money-write-paths.test.mjs` 22 -> **23**: record-payment's four
table writers unpinned (it writes no table now), `record_admin_payment`
pinned as an RPC, the migration pinned as a SQL writer of recorded_payment
with its FOR UPDATE + compare-and-set asserted.

Mutation pass (scratchpad `g1-fix-mutants.mjs`; each mutant applied, the
suite run, the file restored byte for byte): **19 mutants, 19 killed** -
credit label not kept; no floor of 0; no expected_recorded check; CASH only
for exactly "Cash"; legs on the receipt month; no admin check; no
deleted-key check; SECURITY DEFINER; EXECUTE left to anon; paid_amount not
floored; label ignoring carry-in debt; preflight skipping columns; a lost
reply reported as "nothing recorded"; the invoke error not read; a
correction with no bill sent on; `answered` = any context (the old rule);
`unknown` counted as answered; RPM pre-selecting Cash; RPM one shared key.
Four survived the first pass (anon, paid_amount, carry-in debt, shared key)
and were killed after the suite gained live's default privileges, the
paid_amount case, the label in the function's answer and the per-row key
count.

Not proven by the suite: real concurrency inside Postgres. pglite is one
connection, so two calls are serialised whole; the row lock and the
re-check after it are asserted statically and argued (READ COMMITTED: a
`SELECT ... FOR UPDATE` that waited returns the row the other transaction
committed, and the next statement sees its payments row).

### Gates (Hanoi daytime, real clock)

- `node scripts/pgtest/run.mjs`: **8929 assertions across 95 suites, 0
  failed** (before: 8788 / 93; + 36 record-payment, + 1 money-write-paths,
  + 102 and + 2 the probes). Within it: record payment (G-1) 101/0, G-1
  probe delete trigger 102/0, G-1 probe answered 2/0, money write paths
  23/0, invoice status 317/0 and invoice status + G-4 317/0 (golden
  `scripts/pgtest/fixtures/tuition-figures.golden.json`
  `181298c3b173095b02ed95c69f9ed24a`, unchanged), money invariants check
  120/0, ledger append-only 26/0, shared-module mirrors 19/0, edge functions
  typecheck 5/0, app typecheck 3/0.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npm run test:bun`: 250 pass / 0 fail (18 files).

### Files (fix round 1, LF md5 = CR stripped)

| md5 | file |
|---|---|
| `5502a0aea99792c1c381053fdfa8e146` | supabase/migrations/20261117120000_record_admin_payment.sql (NEW - paste) |
| `222fe43b32473fd2cb2a442619de85eb` | supabase/functions/record-payment/index.ts (deploy) |
| `3c80e93c2a1fefefadb99ab48c248c6f` | supabase/functions/delete-payment/index.ts (deploy; unchanged since 1549ec07) |
| `fa04a8014b1b1c819a5ecb9dd6b7f5a3` | supabase/functions/student-audit/index.ts (deploy; N-4) |
| `92b44db93cd2614a2fb3011e3a9063ba` | supabase/functions/_lib/auth.ts (unchanged) |
| `9046deec2a7253a8287b3f64f1ee4659` | supabase/functions/_lib/session-guard.ts (unchanged) |
| `0c052088e3ac434ac77beb14536de89e` | src/lib/recordPayment.ts |
| `34149b4bf25d709dca12d7eaa246af13` | src/components/admin/RecordPaymentDialog.tsx |
| `5304d7dc9eaf9e527e3b67cf9da29659` | src/components/admin/QuickPayPanel.tsx |
| `7ca0c30e43f94644f059208b371f3cf5` | src/components/admin/BatchPaymentDialog.tsx |
| `efc22ac80f362b8b8e18979d60b69c4a` | src/components/admin/RecordedPaymentManager.tsx |
| `a7b0a436798f929a553263b4bc6d6d3c` | scripts/pgtest/record-payment.test.mjs |
| `4243d2531bcd8c75bef7787a854ac355` | scripts/pgtest/probe-g1-live-delete-trigger.test.mjs |
| `2e116bc7124c52c6b42b4df2802b04b7` | scripts/pgtest/probe-g1-answered.mjs |

Also `scripts/pgtest/money-write-paths.test.mjs`, `scripts/pgtest/run.mjs`,
`docs/evidence/D5-audit.md` (the record-payment write-path row). Nothing
under `supabase/functions/_lib`, `docs/sql` or the fixtures changed.

Note for the merge: this branch's copies of 20261117110000 (G-4) and
20261117111000 (G-11) are round 1; main and live have round 2 (the refresh
revoke, `ledger_entries_stamp_created_at`). The suite installs live's round-2
pieces itself; take main's files when merging.

### Deploy order (fix round 1)

1. **Paste the migration** `20261117120000_record_admin_payment.sql` in the
   SQL editor. Its preflight refuses (nothing changed) if anything it needs
   is missing. Check afterwards: `has_function_privilege('authenticated',
   'public.record_admin_payment(uuid,uuid,text,text,integer,text,timestamptz,text,integer)',
   'EXECUTE')` true, and the same for `anon` false.
2. **Deploy `record-payment` and `delete-payment`** (and `student-audit`,
   N-4) through the Supabase deploy. record-payment before the migration
   would answer every payment 500 "Nothing was recorded" (PostgREST: function
   not found) - safe, but a stop, so the migration goes first.
3. **Then the screens** (push to main): `src/lib/recordPayment.ts` and the
   four screens. A screen released before step 2 would get "function not
   found" (nothing written).
4. After a few payments: CHECK-money-invariants M03 / M04 stop growing, and
   no `payments` row lacks its `record-payment-` leg.
