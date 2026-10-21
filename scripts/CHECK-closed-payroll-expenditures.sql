-- Regression check using synthetic rows only. All changes roll back.
BEGIN;
DO $test$
DECLARE
  row_id uuid;
  blocked integer := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.payroll_periods WHERE month = '2098-01') THEN
    RAISE EXCEPTION 'Synthetic test month already exists; choose another month.';
  END IF;
  INSERT INTO public.payroll_periods(month, status) VALUES ('2098-01', 'open');
  INSERT INTO public.expenditures(amount, category, date, source_kind, source_key)
    VALUES (300000, 'Teacher Payroll', '2098-01-31', 'payroll', '2098-01:teacher:regression-test')
    RETURNING id INTO row_id;
  UPDATE public.payroll_periods SET status = 'locked', locked_at = now() WHERE month = '2098-01';
  BEGIN
    UPDATE public.expenditures SET amount = 450000 WHERE id = row_id;
  EXCEPTION WHEN check_violation THEN blocked := blocked + 1; END;
  BEGIN
    DELETE FROM public.expenditures WHERE id = row_id;
  EXCEPTION WHEN check_violation THEN blocked := blocked + 1; END;
  BEGIN
    UPDATE public.expenditures SET source_kind = NULL, source_key = NULL, date = '2098-02-01' WHERE id = row_id;
  EXCEPTION WHEN check_violation THEN blocked := blocked + 1; END;
  BEGIN
    INSERT INTO public.expenditures(amount, category, date, source_kind, source_key)
      VALUES (450000, 'Teacher Payroll', '2098-02-01', 'payroll', '2098-01:teacher:another-test');
  EXCEPTION WHEN check_violation THEN blocked := blocked + 1; END;
  IF blocked <> 4 THEN RAISE EXCEPTION 'Expected four blocked writes, got %', blocked; END IF;
  IF (SELECT amount FROM public.expenditures WHERE id = row_id) <> 300000 THEN
    RAISE EXCEPTION 'Closed payroll amount changed';
  END IF;
  UPDATE public.payroll_periods SET status = 'open' WHERE month = '2098-01';
  UPDATE public.expenditures SET amount = 450000 WHERE id = row_id;
  IF (SELECT amount FROM public.expenditures WHERE id = row_id) <> 450000 THEN
    RAISE EXCEPTION 'Reopened payroll cannot be edited';
  END IF;
END
$test$;
ROLLBACK;