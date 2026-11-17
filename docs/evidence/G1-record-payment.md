# G1 - one admin record-payment function (D5 gap G-1)

Branch `g1-record-payment` (from `origin/pc2/record-payment` 9249b95f, which
was cut from `origin/claude/d5-money-audit` f3ee41db). MONEY: YES.
Build and test only: nothing deployed, no migration applied, no live
database touched, nothing pushed.

**Where it stands:** built and tested. The function, delete-payment's change
and the four screens are ready for an independent review, then deploy in the
order below. `ai_action_apply`'s payment step is NOT changed (section 5: it
does not fit cleanly - an owner decision first).

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

- `node scripts/pgtest/run.mjs`: GATE_PGTEST
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: GATE_TSC
- `npm run test:bun`: GATE_BUN

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
