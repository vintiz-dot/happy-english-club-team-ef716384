DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'pay_type'
  ) THEN
    RAISE NOTICE 'public.teachers.pay_type is not present; nothing to absorb.';
    RETURN;
  END IF;

  UPDATE public.teachers
     SET pay_rate_type        = 'per_session',
         per_session_rate_vnd = GREATEST(hourly_rate_vnd, 1),
         hourly_rate_vnd      = 0
   WHERE pay_type = 'per_session'
     AND pay_rate_type <> 'per_session';

  UPDATE public.teachers
     SET pay_rate_type = 'hourly'
   WHERE pay_type IS DISTINCT FROM 'per_session'
     AND pay_rate_type <> 'hourly';

  ALTER TABLE public.teachers DROP COLUMN pay_type;
  RAISE NOTICE 'Absorbed public.teachers.pay_type into pay_rate_type / per_session_rate_vnd.';
END
$do$;