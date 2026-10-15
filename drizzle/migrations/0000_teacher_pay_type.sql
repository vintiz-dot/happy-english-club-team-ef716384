ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS pay_type text NOT NULL DEFAULT 'hourly';
ALTER TABLE public.teachers ADD CONSTRAINT teachers_pay_type_check CHECK (pay_type IN ('hourly','per_session'));
COMMENT ON COLUMN public.teachers.hourly_rate_vnd IS 'Pay rate in VND: per hour when pay_type=hourly, per held session when pay_type=per_session';