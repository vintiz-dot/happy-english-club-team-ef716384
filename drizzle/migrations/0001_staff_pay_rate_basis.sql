ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS pay_rate_type text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS per_session_rate_vnd integer NOT NULL DEFAULT 0;

ALTER TABLE public.teaching_assistants
  ADD COLUMN IF NOT EXISTS pay_rate_type text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS per_session_rate_vnd integer NOT NULL DEFAULT 0;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_pay_rate_type_check') THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_pay_rate_type_check
      CHECK (pay_rate_type IN ('hourly', 'per_session'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tas_pay_rate_type_check') THEN
    ALTER TABLE public.teaching_assistants
      ADD CONSTRAINT tas_pay_rate_type_check
      CHECK (pay_rate_type IN ('hourly', 'per_session'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_per_session_rate_set_check') THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_per_session_rate_set_check
      CHECK (pay_rate_type <> 'per_session' OR per_session_rate_vnd > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tas_per_session_rate_set_check') THEN
    ALTER TABLE public.teaching_assistants
      ADD CONSTRAINT tas_per_session_rate_set_check
      CHECK (pay_rate_type <> 'per_session' OR per_session_rate_vnd > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_rates_non_negative_check') THEN
    ALTER TABLE public.teachers
      ADD CONSTRAINT teachers_rates_non_negative_check
      CHECK (hourly_rate_vnd >= 0 AND per_session_rate_vnd >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tas_rates_non_negative_check') THEN
    ALTER TABLE public.teaching_assistants
      ADD CONSTRAINT tas_rates_non_negative_check
      CHECK (hourly_rate_vnd >= 0 AND per_session_rate_vnd >= 0);
  END IF;
END
$do$;

COMMENT ON COLUMN public.teachers.pay_rate_type IS
  'How this teacher is paid: hourly (hourly_rate_vnd / 60 * minutes taught) or per_session (per_session_rate_vnd per session, regardless of length).';
COMMENT ON COLUMN public.teachers.per_session_rate_vnd IS
  'Flat VND paid per session when pay_rate_type = per_session. Ignored when hourly.';
COMMENT ON COLUMN public.teaching_assistants.pay_rate_type IS
  'How this TA is paid: hourly (hourly_rate_vnd / 60 * minutes assisted) or per_session (per_session_rate_vnd per session, regardless of length).';
COMMENT ON COLUMN public.teaching_assistants.per_session_rate_vnd IS
  'Flat VND paid per session when pay_rate_type = per_session. Ignored when hourly.';

DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['teachers', 'teaching_assistants'] LOOP
    IF (
      SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t
        AND column_name IN ('email', 'phone', 'bio', 'avatar_url', 'updated_at', 'updated_by')
    ) <> 6 THEN
      RAISE EXCEPTION
        'public.% is missing one of email, phone, bio, avatar_url, updated_at, updated_by; refusing to install the column-scope trigger', t;
    END IF;
  END LOOP;
END
$do$;

CREATE OR REPLACE FUNCTION public.enforce_teacher_self_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  remainder public.teachers;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  remainder := NEW;
  remainder.email      := OLD.email;
  remainder.phone      := OLD.phone;
  remainder.bio        := OLD.bio;
  remainder.avatar_url := OLD.avatar_url;
  remainder.updated_at := OLD.updated_at;
  remainder.updated_by := OLD.updated_by;

  IF remainder IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION
      'You may only change your own contact details, bio and photo. Pay rate, name and active status are set by an admin.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.enforce_ta_self_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  remainder public.teaching_assistants;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  remainder := NEW;
  remainder.email      := OLD.email;
  remainder.phone      := OLD.phone;
  remainder.bio        := OLD.bio;
  remainder.avatar_url := OLD.avatar_url;
  remainder.updated_at := OLD.updated_at;
  remainder.updated_by := OLD.updated_by;

  IF remainder IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION
      'You may only change your own contact details, bio and photo. Pay rate, name and active status are set by an admin.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.enforce_teacher_self_update_scope() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_ta_self_update_scope() FROM anon, PUBLIC;

DROP TRIGGER IF EXISTS enforce_teacher_self_update_scope ON public.teachers;
CREATE TRIGGER enforce_teacher_self_update_scope
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_teacher_self_update_scope();

DROP TRIGGER IF EXISTS enforce_ta_self_update_scope ON public.teaching_assistants;
CREATE TRIGGER enforce_ta_self_update_scope
  BEFORE UPDATE ON public.teaching_assistants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ta_self_update_scope();