-- Reverse the ledger legs of three family payments deleted in October 2025
-- whose deletion posted no reversal. Owner, 23 Nov 2026: "fix the unreversed entires."
--
-- Found by the discrepancy checks (Finance > Recorded, Reports > Forensic):
-- "Ledger money with no payment", 6,327,500 VND in BANK, October 2025.
--   1daccf45-354c-4580-8c32-30dcc8ba95e6  deleted 25 Oct 2025 ("mistake"),
--                                         audit_log shows reversal_tx_ids []
--   32b4b436-b735-498c-a0f9-5a8957ea9413  row gone, no audit entry
--   b052d89e-4d81-49e6-9676-b14fc207e542  row gone, no audit entry
-- Five transactions (BANK debit / AR credit each) across two siblings. Their
-- October 2025 bills are fully explained by rows that still exist, and the
-- family's real October cash is on separate CASH legs, so these are leftovers
-- of payments entered and then deleted.
--
-- The ledger is append-only (20261117111000): nothing is deleted or changed.
-- Every leg of each transaction gets its opposite, keyed exactly as
-- delete-payment keys a reversal (payment-reversal-<payment>-<entry id>), so
-- delete-payment and the checks both see these payments as reversed.
--
-- Safe to run twice and on a database without these rows: it posts nothing
-- if any of the three payments exists again or any reversal is already there.
-- Ends by checking that each payment's legs now net to zero.
--
-- Rollback: post the opposite of the rows whose tx_key starts with
-- 'payment-reversal-' for these three ids (never delete ledger rows).

DO $$
DECLARE
  v_pids uuid[] := ARRAY[
    '1daccf45-354c-4580-8c32-30dcc8ba95e6',
    '32b4b436-b735-498c-a0f9-5a8957ea9413',
    'b052d89e-4d81-49e6-9676-b14fc207e542'
  ]::uuid[];
  v_live int;
  v_done int;
  v_rows int;
  v_left numeric;
BEGIN
  SELECT count(*) INTO v_live FROM public.payments WHERE id = ANY (v_pids);
  IF v_live > 0 THEN
    RAISE NOTICE 'One of the payments exists again; nothing was posted.';
    RETURN;
  END IF;

  SELECT count(*) INTO v_done FROM public.ledger_entries e, unnest(v_pids) p
   WHERE e.tx_key LIKE 'payment-reversal-' || p || '-%';
  IF v_done > 0 THEN
    RAISE NOTICE 'Already reversed (% legs); nothing was posted.', v_done;
    RETURN;
  END IF;

  WITH txs AS (
    SELECT DISTINCT e.tx_id, p AS pid
      FROM public.ledger_entries e, unnest(v_pids) p
     WHERE e.tx_key LIKE 'family-payment-' || p || '-%'
  ), newtx AS (
    SELECT tx_id, pid, gen_random_uuid() AS ntx FROM txs
  )
  INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, occurred_at, memo, month)
  SELECT n.ntx,
         'payment-reversal-' || n.pid || '-' || e.id,
         e.account_id, e.credit, e.debit, now(),
         'Reversal of deleted payment: October 2025 deletion posted no reversal (owner, 23 Nov 2026)',
         e.month
    FROM public.ledger_entries e
    JOIN newtx n ON n.tx_id = e.tx_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  -- Every leg of these payments, originals and reversals, must now net to 0.
  SELECT coalesce(sum(abs(s)), 0) INTO v_left FROM (
    SELECT sum(e.debit - e.credit) AS s
      FROM public.ledger_entries e
      JOIN public.ledger_accounts a ON a.id = e.account_id, unnest(v_pids) p
     WHERE e.tx_key LIKE 'payment-reversal-' || p || '-%'
        OR e.tx_id IN (SELECT tx_id FROM public.ledger_entries WHERE tx_key LIKE 'family-payment-' || p || '-%')
     GROUP BY p, a.id
  ) x;
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'The reversal does not net to zero (% left); nothing was posted.', v_left;
  END IF;

  RAISE NOTICE 'Posted % reversing legs; the three deleted payments now net to zero in every account.', v_rows;
END $$;
