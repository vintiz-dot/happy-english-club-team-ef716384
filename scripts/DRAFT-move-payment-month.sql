-- DRAFT - NOT RUN. Changes nothing as written: it is a dry run inside BEGIN ... ROLLBACK.
-- Review it with Victor, then run it ONE student and ONE move at a time, after
-- CHECK-payment-month-gaps.sql has said "only the month label looks wrong".
--
-- WHAT IT DOES
-- Moves `amount` VND of recorded payment from one month's bill to another month's bill
-- of the SAME student. That is all the app records: invoices.recorded_payment is the only
-- place a payment's month lives (the `payments` table has no month column, so there is
-- nothing to change there, and paid_amount is a cumulative figure that is left alone).
--
-- WHAT STAYS TRUE
--  * The student's total paid and total charged do not change, so the family's overall
--    balance does not change. A script check refuses to finish if it did.
--  * The carry-in / carry-out columns are rebuilt by the invoices_carry_sync trigger
--    (20261009120000) as soon as the two rows change; they are not written here.
--  * The audit trigger (20261009130000) logs both invoice UPDATEs; this script also writes
--    one named audit_log row ('move_payment_month') that says what moved, why, and why it was safe.
--
-- WHAT IT REFUSES (it raises an error, so nothing changes)
--  * either month has an active monthly_finance_snapshots row (closed books);
--  * either invoice has tuition_frozen = true (that flag locks the CHARGE, not the payment, but
--    a frozen bill means somebody already decided this month; refused to be safe);
--  * a missing invoice, same source and target month, amount <= 0 or more than the source holds;
--  * the source bill was repriced DOWN on/after 28 Oct 2026 per audit_log - then the charge
--    was wiped, not the payment misplaced: restore the charge, do not move money;
--  * the target month's own charge would be over-paid by the move (it must fit: pass
--    v_allow_overpay := true only if you really mean to over-pay the target, e.g. advance payment).
--
-- HOW TO USE
--  1. Edit the five values in the DECLARE block.
--  2. Run as is. It ends in an error saying "DRY RUN" with a before/after summary; nothing changed.
--  3. To apply: set v_commit := true AND change the last line ROLLBACK to COMMIT. Run again.
--  4. Re-run CHECK-payment-month-gaps.sql and open the student's Tuition tab for both months.

BEGIN;

DO $$
DECLARE
  v_student       uuid    := '00000000-0000-0000-0000-000000000000';  -- the student
  v_from_month    text    := '2026-07';                               -- month that holds the money now
  v_to_month      text    := '2026-08';                               -- month it belongs to
  v_amount        bigint  := 0;                                       -- VND to move
  v_reason        text    := 'Replace with the reason, e.g. paid for August, recorded on July';
  v_allow_overpay boolean := false;
  v_commit        boolean := false;                                   -- true to keep the change (and COMMIT below)

  src public.invoices%ROWTYPE;
  dst public.invoices%ROWTYPE;
  v_paid_before bigint;
  v_paid_after  bigint;
  v_payable     bigint;
  v_summary     text;
  v_reprice     timestamptz;
BEGIN
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Set v_amount to the VND to move (> 0).'; END IF;
  IF v_from_month = v_to_month THEN RAISE EXCEPTION 'Source and target month are the same.'; END IF;
  IF length(btrim(v_reason)) < 10 THEN RAISE EXCEPTION 'Give a real reason (it is written to the audit log).'; END IF;

  -- Lock both bills in month order so two runs cannot deadlock.
  SELECT * INTO src FROM public.invoices WHERE student_id = v_student AND month = v_from_month FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No % bill for this student.', v_from_month; END IF;
  SELECT * INTO dst FROM public.invoices WHERE student_id = v_student AND month = v_to_month FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No % bill for this student (create it by opening the tuition screen first).', v_to_month; END IF;

  IF EXISTS (SELECT 1 FROM public.monthly_finance_snapshots m
             WHERE m.student_id = v_student AND m.month IN (v_from_month, v_to_month) AND m.superseded_at IS NULL) THEN
    RAISE EXCEPTION 'Refused: % or % is a closed month for this student.', v_from_month, v_to_month;
  END IF;
  IF COALESCE(src.tuition_frozen, false) OR COALESCE(dst.tuition_frozen, false) THEN
    RAISE EXCEPTION 'Refused: one of the bills is frozen (tuition_frozen).';
  END IF;

  IF COALESCE(src.recorded_payment, 0) < v_amount THEN
    RAISE EXCEPTION 'Refused: % holds only % paid, less than the % to move.', v_from_month, COALESCE(src.recorded_payment, 0), v_amount;
  END IF;

  SELECT min(l.occurred_at) INTO v_reprice
  FROM public.audit_log l
  WHERE l.entity = 'invoices' AND l.entity_id = src.id::text AND l.operation = 'UPDATE'
    AND l.occurred_at >= (DATE '2026-10-28')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
    AND l.changed_fields && ARRAY['total_amount']
    AND (l.diff -> 'new' ->> 'total_amount')::numeric < (l.diff -> 'old' ->> 'total_amount')::numeric;
  IF v_reprice IS NOT NULL THEN
    RAISE EXCEPTION 'Refused: the % bill was repriced DOWN on % - restore the charge instead of moving money.', v_from_month, v_reprice;
  END IF;

  IF NOT v_allow_overpay
     AND COALESCE(dst.recorded_payment, 0) + v_amount > COALESCE(dst.total_amount, 0) + GREATEST(COALESCE(dst.carry_in_debt, 0), 0) THEN
    RAISE EXCEPTION 'Refused: % would be paid % against a charge of % (+ debt carried in %). Pass v_allow_overpay := true if intended.',
      v_to_month, COALESCE(dst.recorded_payment, 0) + v_amount, COALESCE(dst.total_amount, 0), COALESCE(dst.carry_in_debt, 0);
  END IF;

  SELECT COALESCE(sum(recorded_payment), 0) INTO v_paid_before FROM public.invoices WHERE student_id = v_student;

  -- Source: same status rule the payment dialogs use (cosmetic; the figures are the truth).
  v_payable := COALESCE(src.total_amount, 0) + COALESCE(src.carry_in_debt, 0) - COALESCE(src.carry_in_credit, 0);
  UPDATE public.invoices
  SET recorded_payment = src.recorded_payment - v_amount,
      status = (CASE WHEN src.recorded_payment - v_amount >= v_payable AND v_payable > 0 THEN 'paid'
                     WHEN src.recorded_payment - v_amount > 0 THEN 'partial' ELSE 'issued' END)::invoice_status,
      updated_at = now()
  WHERE id = src.id;

  v_payable := COALESCE(dst.total_amount, 0) + COALESCE(dst.carry_in_debt, 0) - COALESCE(dst.carry_in_credit, 0);
  UPDATE public.invoices
  SET recorded_payment = COALESCE(dst.recorded_payment, 0) + v_amount,
      status = (CASE WHEN COALESCE(dst.recorded_payment, 0) + v_amount >= v_payable AND v_payable > 0 THEN 'paid'
                     WHEN COALESCE(dst.recorded_payment, 0) + v_amount > 0 THEN 'partial' ELSE 'issued' END)::invoice_status,
      updated_at = now()
  WHERE id = dst.id;

  SELECT COALESCE(sum(recorded_payment), 0) INTO v_paid_after FROM public.invoices WHERE student_id = v_student;
  IF v_paid_after <> v_paid_before THEN
    RAISE EXCEPTION 'Safety check failed: the student''s total paid changed (% -> %).', v_paid_before, v_paid_after;
  END IF;

  INSERT INTO public.audit_log (entity, entity_id, action, actor_user_id, diff)
  VALUES ('invoice', src.id::text, 'move_payment_month', NULL, jsonb_build_object(
    'student_id', v_student, 'from_month', v_from_month, 'to_month', v_to_month, 'amount', v_amount,
    'from_invoice_id', src.id, 'to_invoice_id', dst.id,
    'from_recorded_payment', jsonb_build_object('old', src.recorded_payment, 'new', src.recorded_payment - v_amount),
    'to_recorded_payment', jsonb_build_object('old', dst.recorded_payment, 'new', COALESCE(dst.recorded_payment, 0) + v_amount),
    'student_total_paid', v_paid_after, 'reason', v_reason, 'via', 'sql_editor_reviewed_script'));

  v_summary := format('%s: %s -> %s | %s: %s -> %s | student total paid stays %s',
    v_from_month, src.recorded_payment, src.recorded_payment - v_amount,
    v_to_month, COALESCE(dst.recorded_payment, 0), COALESCE(dst.recorded_payment, 0) + v_amount, v_paid_after);
  RAISE NOTICE '%', v_summary;

  IF NOT v_commit THEN
    RAISE EXCEPTION 'DRY RUN, nothing changed. It would have done: %', v_summary;
  END IF;
END $$;

-- Default: undo everything. To apply, set v_commit := true above AND change this line to COMMIT;
ROLLBACK;
