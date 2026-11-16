-- Preflight for removing the calculators' Settle Bill write-off reader
-- (settledWriteOff / WRITE_OFF_KEY_PREFIX in calculate-tuition,
-- calculate-tuition-bulk and _lib/invoice-status.ts). Read-only, counts only.
--
-- Settle Bill was removed on 16 Nov 2026 (D-23); settle-bill is a 410 stub,
-- so nothing can write a new 'settlement-writeoff-' row. The reader counts
-- only 'discount' settlements whose ledger transaction carries that key.
-- Removing it changes no bill exactly when both counts below are 0.
-- As read by the conductor on 16 Nov 2026: 0 and 0.
--
-- If either is not 0, STOP: those write-offs lower a bill today and would
-- stop doing so when the reader goes.

-- 1) ledger legs carrying the key. Expect 0.
SELECT count(*) AS writeoff_ledger_legs
FROM public.ledger_entries
WHERE tx_key LIKE 'settlement-writeoff-%';

-- 2) 'discount' settlements the reader would count. Expect 0.
SELECT count(*) AS counted_writeoffs, coalesce(sum(s.amount), 0) AS counted_amount
FROM public.settlements s
WHERE s.settlement_type = 'discount'
  AND EXISTS (SELECT 1 FROM public.ledger_entries e
              WHERE e.tx_id = s.tx_id AND e.tx_key LIKE 'settlement-writeoff-%');
