-- CREDIT the past unapplied-cash leftovers onto the children's bills.
--
-- Owner's decision (verbatim): "Yes, credit them". Paste ONCE into the
-- Supabase SQL editor, AFTER the new family-payment / smart-family-payment
-- (credit on the bill) AND the new delete-payment are live.
--
-- WHAT THE ROWS ARE. Before the OVERPAYMENT change, money a family paid
-- beyond what the bills owed was posted as "unapplied cash": one ledger
-- transaction, a keyed DR AR leg (`smart-family-credit-<payment>-<ms>` or
-- `family-credit-<payment>-<ms>`) and an unkeyed CR CREDIT leg, on one child.
-- No bill recorded it and no CASH/BANK leg received it (review M9).
--
-- WHAT THIS DOES, for each such leftover not reversed and not yet credited:
--   1. the bill: adds the amount to that child's bill's recorded_payment,
--      compare-and-set on the value read, label by public.invoice_paid_label
--      (an admin's 'credit' label kept), as the payment functions do. The
--      carry trigger then shows it as credit on the next bill.
--      WHICH BILL: the child's bill for the CURRENT month (Hanoi); if there
--      is none, their latest earlier bill. A frozen bill is used like any
--      other: recording money on it is allowed today and the freeze trigger
--      keeps its charged figures. No bill at all for a child: the WHOLE
--      script stops and changes nothing.
--   2. the ledger, new rows dated now, the old pair never edited or deleted:
--        reclass  (month of the old pair): DR CREDIT x / CR AR x
--                 tx_key past-leftover-credit-<payment>-reclass
--                 - takes the old pair back out
--        cash leg (month of the bill used): DR CASH|BANK x / CR AR x
--                 tx_key past-leftover-credit-<payment>   (the marker)
--                 CASH when the payment's method is 'cash' in any case,
--                 else BANK - smart-family-payment's own rule
--      Old pair + these two = exactly what the new code posts for the same
--      money: DR CASH|BANK x / CR AR x, nothing on CREDIT. The child's AR,
--      CREDIT and CASH|BANK balances end as if the payment had been made
--      with the new code (scripts/pgtest/past-leftover-credit.test.mjs).
--
-- SAFE TO RUN AGAIN: a leftover whose marker exists is skipped; a second
-- run changes nothing and reports the same totals. ALL OR NOTHING: one DO
-- block, so any refusal or error leaves the database as it was.
--
-- REFUSES (nothing changed) unless it finds exactly the kind of rows
-- expected: every leftover a two-leg pair (keyed DR AR, unkeyed CR CREDIT of
-- the same amount on the same child), one per payment, its payment row
-- present; and in total the 3 leftovers / 708,000 VND counted on live on
-- 16 Nov 2026 (change the two constants only after counting again).
--
-- delete-payment (with this change) deletes such a payment whole afterwards:
-- it reverses the old legs AND both correction transactions, and takes the
-- amount off the bill this script put it on.
--
-- Output: one row of counts and totals; no names, no ids.

DO $credit$
DECLARE
  c_expect_rows  constant integer := 3;        -- leftovers counted on live, 16 Nov 2026
  c_expect_total constant bigint  := 708000;   -- their total, VND
  v_month   text := to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM');
  v_rows    integer;
  v_total   bigint;
  v_done    integer := 0;
  v_done_amount bigint := 0;
  r         record;
  v_bill    record;
  v_method  text;
  v_cash_code public.account_code;
  v_cash_acc uuid;
  v_new     bigint;
  v_n       integer;
  v_tx      uuid;
BEGIN
  IF to_regprocedure('public.invoice_paid_label(bigint,bigint,bigint,bigint)') IS NULL THEN
    RAISE EXCEPTION 'public.invoice_paid_label is not installed (migration 20261113090000). Nothing was changed.';
  END IF;
  -- One run at a time.
  PERFORM pg_advisory_xact_lock(hashtext('past-leftover-credit'));

  CREATE TEMP TABLE _plc ON COMMIT DROP AS
  SELECT k.tx_id,
         k.debit::bigint                 AS amount,
         k.credit                        AS keyed_credit,
         k.month                         AS src_month,
         a.student_id,
         a.code::text                    AS keyed_code,
         k.account_id                    AS ar_account,
         (k.tx_key LIKE 'smart-family-credit-%') AS smart,
         substring(k.tx_key FROM '^(?:smart-)?family-credit-([0-9a-fA-F-]{36})-') AS payment_id
  FROM public.ledger_entries k
  JOIN public.ledger_accounts a ON a.id = k.account_id
  WHERE k.tx_key LIKE 'family-credit-%' OR k.tx_key LIKE 'smart-family-credit-%';

  ALTER TABLE _plc ADD COLUMN reversed boolean, ADD COLUMN credited boolean, ADD COLUMN credit_account uuid;
  UPDATE _plc p SET
    reversed = EXISTS (SELECT 1 FROM public.ledger_entries rv WHERE rv.tx_key LIKE 'payment-reversal-' || p.payment_id || '-%'),
    credited = EXISTS (SELECT 1 FROM public.ledger_entries m WHERE m.tx_key = 'past-leftover-credit-' || p.payment_id),
    credit_account = (SELECT o.account_id FROM public.ledger_entries o
                      WHERE o.tx_id = p.tx_id AND o.tx_key IS NULL LIMIT 1);

  -- ---------------------------------------------------------- preflight
  SELECT count(*), coalesce(sum(amount), 0) INTO v_rows, v_total FROM _plc;
  IF v_rows <> c_expect_rows OR v_total <> c_expect_total THEN
    RAISE EXCEPTION 'expected % leftovers totalling %, found % totalling %. Nothing was changed.',
      c_expect_rows, c_expect_total, v_rows, v_total;
  END IF;
  IF EXISTS (SELECT 1 FROM _plc WHERE payment_id IS NULL) THEN
    RAISE EXCEPTION 'a leftover key does not carry a payment id. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM _plc GROUP BY payment_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'a payment has more than one leftover. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM _plc WHERE keyed_code <> 'AR' OR amount <= 0 OR keyed_credit <> 0) THEN
    RAISE EXCEPTION 'a leftover''s keyed leg is not a debit to AR. Nothing was changed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _plc p
    WHERE (SELECT count(*) FROM public.ledger_entries e WHERE e.tx_id = p.tx_id) <> 2
       OR NOT EXISTS (
         SELECT 1 FROM public.ledger_entries o JOIN public.ledger_accounts oa ON oa.id = o.account_id
         WHERE o.tx_id = p.tx_id AND o.tx_key IS NULL AND oa.code = 'CREDIT'
           AND oa.student_id = p.student_id AND o.credit = p.amount AND o.debit = 0)
  ) THEN
    RAISE EXCEPTION 'a leftover is not exactly a DR AR / CR CREDIT pair of one amount on one child. Nothing was changed.';
  END IF;
  -- (A payment deleted after its leftover was reversed or credited is gone
  -- on purpose; only a leftover still to credit needs its payment row.)
  IF EXISTS (SELECT 1 FROM _plc p WHERE NOT p.reversed AND NOT p.credited
             AND NOT EXISTS (SELECT 1 FROM public.payments y WHERE y.id::text = p.payment_id)) THEN
    RAISE EXCEPTION 'a leftover''s payment no longer exists. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM _plc p WHERE NOT p.reversed AND NOT p.credited
             AND NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.student_id = p.student_id AND i.month <= v_month)) THEN
    RAISE EXCEPTION 'a child with a leftover has no bill for % or earlier. Nothing was changed.', v_month;
  END IF;
  -- A payment that modify-payment rewrote (child payments, reversal- /
  -- modified- keys) was already corrected; crediting it would count the money
  -- twice and delete-payment could not take it back (review F1, CREDIT-review.md).
  IF EXISTS (SELECT 1 FROM _plc p WHERE NOT p.reversed AND NOT p.credited AND (
       EXISTS (SELECT 1 FROM public.payments c WHERE c.parent_payment_id::text = p.payment_id)
    OR EXISTS (SELECT 1 FROM public.ledger_entries e
                WHERE e.tx_key LIKE 'reversal-' || p.payment_id || '-%' OR e.tx_key LIKE 'modified-' || p.payment_id || '-%'))) THEN
    RAISE EXCEPTION 'a leftover''s payment was modified since. Nothing was changed.';
  END IF;

  -- -------------------------------------------------------------- credit
  FOR r IN SELECT * FROM _plc WHERE NOT reversed AND NOT credited ORDER BY src_month, payment_id LOOP
    -- The bill: the current month's, else the latest earlier one.
    SELECT i.id, i.month, i.status, coalesce(i.recorded_payment, 0)::bigint AS recorded,
           coalesce(i.total_amount, 0)::bigint AS total, coalesce(i.base_amount, 0)::bigint AS base,
           coalesce(i.carry_in_debt, 0)::bigint AS ci_debt, coalesce(i.carry_in_credit, 0)::bigint AS ci_credit
      INTO v_bill
      FROM public.invoices i
     WHERE i.student_id = r.student_id AND i.month <= v_month
     ORDER BY i.month DESC
     LIMIT 1
       FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'a child with a leftover has no bill for % or earlier. Nothing was changed.', v_month;
    END IF;

    v_new := v_bill.recorded + r.amount;
    UPDATE public.invoices
       SET recorded_payment = v_new,
           paid_amount = CASE WHEN r.smart THEN coalesce(paid_amount, 0) + r.amount ELSE paid_amount END,
           status = CASE WHEN status = 'credit' THEN status
                         ELSE public.invoice_paid_label(v_new, v_bill.total + v_bill.ci_debt - v_bill.ci_credit, v_bill.base, v_bill.total) END,
           updated_at = now()
     WHERE id = v_bill.id
       AND coalesce(recorded_payment, 0) = v_bill.recorded;     -- compare-and-set on the value read
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'a bill changed while it was being credited. Nothing was changed: run the script again.';
    END IF;

    -- The cash or bank account the money should have reached.
    SELECT y.method INTO v_method FROM public.payments y WHERE y.id::text = r.payment_id;
    v_cash_code := CASE WHEN lower(coalesce(v_method, '')) = 'cash' THEN 'CASH' ELSE 'BANK' END;
    INSERT INTO public.ledger_accounts (student_id, code) VALUES (r.student_id, v_cash_code)
      ON CONFLICT (student_id, code) DO NOTHING;
    SELECT la.id INTO v_cash_acc FROM public.ledger_accounts la WHERE la.student_id = r.student_id AND la.code = v_cash_code;

    -- Reclass: the old DR AR / CR CREDIT pair taken back out, in its own month.
    v_tx := gen_random_uuid();
    INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, occurred_at, memo, month) VALUES
      (v_tx, 'past-leftover-credit-' || r.payment_id || '-reclass', r.credit_account, r.amount, 0, now(),
       'Past unapplied cash moved onto the bill (owner, OVERPAYMENT): the customer credit taken back out', r.src_month),
      (v_tx, NULL, r.ar_account, 0, r.amount, now(),
       'Past unapplied cash moved onto the bill (owner, OVERPAYMENT)', r.src_month);

    -- The cash leg the old code never posted, on the bill's month (the marker).
    v_tx := gen_random_uuid();
    INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, occurred_at, memo, month) VALUES
      (v_tx, 'past-leftover-credit-' || r.payment_id, v_cash_acc, r.amount, 0, now(),
       'Past unapplied cash moved onto the bill (owner, OVERPAYMENT): the payment''s missing cash leg', v_bill.month),
      (v_tx, NULL, r.ar_account, 0, r.amount, now(),
       'Past unapplied cash moved onto the bill (owner, OVERPAYMENT): kept on the bill as credit', v_bill.month);

    v_done := v_done + 1;
    v_done_amount := v_done_amount + r.amount;
  END LOOP;

  RAISE NOTICE 'past-leftover-credit: % credited now (% VND), % already credited, % reversed before (skipped)',
    v_done, v_done_amount,
    (SELECT count(*) FROM _plc WHERE credited), (SELECT count(*) FROM _plc WHERE reversed AND NOT credited);
END
$credit$;

-- The result: counts and totals only. Expect 3 / 708000 / 0 after the first
-- run and after every later one.
SELECT count(*)                                   AS leftovers_credited,
       coalesce(sum(debit), 0)                    AS total_vnd,
       (SELECT count(*) FROM public.ledger_entries k
         WHERE (k.tx_key LIKE 'family-credit-%' OR k.tx_key LIKE 'smart-family-credit-%')
           AND NOT EXISTS (SELECT 1 FROM public.ledger_entries m
                            WHERE m.tx_key = 'past-leftover-credit-' || substring(k.tx_key FROM '^(?:smart-)?family-credit-([0-9a-fA-F-]{36})-'))
           AND NOT EXISTS (SELECT 1 FROM public.ledger_entries r
                            WHERE r.tx_key LIKE 'payment-reversal-' || substring(k.tx_key FROM '^(?:smart-)?family-credit-([0-9a-fA-F-]{36})-') || '-%')
       )                                          AS still_to_credit
  FROM public.ledger_entries
 WHERE tx_key ~ '^past-leftover-credit-[0-9a-fA-F-]{36}$';
