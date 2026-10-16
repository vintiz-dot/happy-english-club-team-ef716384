-- Let a teacher or TA be paid per session instead of per hour.
--
-- Until now pay had exactly one shape, stated in sessionDuration.ts and
-- implemented identically in five places:
--
--   amount = hourly_rate_vnd / 60 * (end_time - start_time)
--
-- That is right for staff paid by the clock and wrong for staff paid by the
-- lesson, who are currently handled by picking an hourly number that happens
-- to multiply out - which silently breaks the moment a lesson runs long.
--
-- ------------------------------------------------------------------------
-- 1. The columns
-- ------------------------------------------------------------------------
--
-- `pay_rate_type` is a typed column with a CHECK rather than a boolean, so
-- a third basis (per day, per block) can be added later without a migration
-- that has to reinterpret `is_hourly = false`.
--
-- NOT `session_rate_vnd`: public.classes already has a column by that name
-- and it means the opposite side of the ledger - what a CLASS is billed per
-- session, i.e. revenue. Two columns one join apart, same name, one revenue
-- and one cost, is a mistake waiting to be made in a payroll query. Hence
-- `per_session_rate_vnd`.
--
-- Existing rows default to 'hourly' with a 0 per-session rate, so every
-- staff member keeps the pay they have today and nothing recalculates.

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

  -- A per-session teacher on a 0 rate earns nothing, every month, silently -
  -- payroll would simply total to zero and look like a quiet month. The UI
  -- validates first; this is the backstop that makes the bad state
  -- unrepresentable.
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

  -- Non-negative on both sides. Payroll subtracts nothing, so a negative
  -- rate can only be a typo, and it would show up as a credit.
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

-- ------------------------------------------------------------------------
-- 2. Stop staff setting their own pay
-- ------------------------------------------------------------------------
--
-- THIS IS A PRE-EXISTING HOLE, found while adding the columns above, and it
-- has to be closed in the same migration because the new columns would walk
-- straight into it.
--
-- Both tables carry a self-update policy with no WITH CHECK and no column
-- restriction:
--
--   CREATE POLICY "Teachers can update own record" ON public.teachers
--     FOR UPDATE USING (user_id = auth.uid());          -- 20251011192324
--   CREATE POLICY "TAs can update own record" ON public.teaching_assistants
--     FOR UPDATE USING (user_id = auth.uid());          -- 20260322050903
--
-- Postgres reuses USING as the WITH CHECK, so the row has to stay theirs -
-- but every other column is wide open. Any teacher or TA with an app login
-- can run
--
--   UPDATE teachers SET hourly_rate_vnd = 9999999 WHERE user_id = auth.uid()
--
-- from the browser console, and calculate-payroll will price next month's
-- sessions at whatever they set. They can also flip their own is_active.
-- Adding per_session_rate_vnd under that policy would hand them a second
-- lever, so the guard goes in first.
--
-- Same allowlist shape as enforce_class_update_column_scope (20261005090000
-- / 20261013090000), for the same reason: a column added to these tables in
-- future is protected the moment it exists, rather than the moment someone
-- remembers to come back here.
--
-- What staff may actually change is exactly what their own edit screens send
-- (TeacherProfileEdit: email, phone, bio; TeacherProfilePictureUpload:
-- avatar_url). full_name is deliberately NOT on the list - it is the label
-- on every payroll row, expenditure line and report, and renaming yourself
-- mid-month makes those unreconcilable.

DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['teachers', 'teaching_assistants'] LOOP
    -- plpgsql resolves record fields at runtime, so a renamed column would
    -- leave the function compiling happily and then rejecting every save.
    -- Refuse to install instead.
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

-- Two functions rather than one generic trigger: the DECLARE needs the
-- table's own rowtype, and a dynamic version would have to give that up and
-- compare hstore or jsonb, which is slower and loses the field-name type
-- checking that the install-time guard above exists to protect.

CREATE OR REPLACE FUNCTION public.enforce_teacher_self_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  remainder public.teachers;
BEGIN
  -- No JWT: service_role, a migration or a scheduled job. Trusted.
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
