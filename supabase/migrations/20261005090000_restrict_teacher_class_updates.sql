-- Confine teachers to the classroom-economy columns on public.classes.
--
-- THE HOLE
-- Teachers were granted UPDATE on public.classes so they could flip the
-- classroom-economy switch on a class they teach:
--
--   CREATE POLICY "Teachers can update economy settings for their classes"
--   ON public.classes FOR UPDATE TO authenticated
--   USING      (is_teacher_of_class(auth.uid(), id))
--   WITH CHECK (is_teacher_of_class(auth.uid(), id));
--
-- The NAME says economy settings. The POLICY says every column. Row-level
-- security scopes ROWS, never columns, so what that policy actually grants is:
-- any teacher may rename their class, change its session rate, reassign its
-- default teacher, or set is_active = false and make the class vanish from
-- every list in the school -- by calling the REST API directly, with no UI
-- involved and nothing in the audit log.
--
-- WHY NOT COLUMN GRANTS
-- `GRANT UPDATE (economy_mode, ...) ON classes TO authenticated` is the
-- textbook answer and it does not work here: admins and teachers are BOTH the
-- `authenticated` Postgres role in this deployment (the distinction lives in
-- public.user_roles, not in the database role), so revoking UPDATE on a column
-- would lock admins out of it too. A trigger comparing the proposed row
-- against the stored one is the only mechanism that can tell the two apart.
--
-- This changes no data and no policy. It only narrows what an UPDATE that
-- already passed RLS is permitted to have altered.

-- Fail at install time rather than silently at a teacher's first save: if
-- these columns are ever renamed, the trigger body would still compile (plpgsql
-- resolves record fields at runtime) and would then reject every teacher save.
DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND column_name IN ('economy_mode', 'points_to_cash_rate')
  ) <> 2 THEN
    RAISE EXCEPTION
      'public.classes is missing economy_mode and/or points_to_cash_rate; refusing to install the column-scope trigger';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_class_update_column_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remainder public.classes;
BEGIN
  -- No JWT in scope: service_role, a migration, or a scheduled job. These are
  -- trusted server-side callers and stay unrestricted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins manage classes in full, including anyone holding admin alongside
  -- teacher.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Anyone else who reached an UPDATE on this table got here through the
  -- teacher economy policy. Reset the columns they ARE allowed to set back to
  -- their stored values, then demand that what remains is identical to the
  -- stored row.
  --
  -- Deliberately an allowlist over a whole-row comparison rather than a list of
  -- forbidden columns: a column added to this table in future is protected the
  -- moment it exists, without anyone having to remember to come back here.
  remainder := NEW;
  remainder.economy_mode        := OLD.economy_mode;
  remainder.points_to_cash_rate := OLD.points_to_cash_rate;
  remainder.updated_at          := OLD.updated_at;  -- maintained by its own trigger
  remainder.updated_by          := OLD.updated_by;  -- bookkeeping, not a setting

  IF remainder IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION
      'Teachers may only change classroom-economy settings (economy_mode, points_to_cash_rate) on their own classes. Ask an admin to change anything else.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_class_update_column_scope() FROM anon, PUBLIC;

DROP TRIGGER IF EXISTS enforce_class_update_column_scope ON public.classes;

-- Name matters: triggers on the same table and timing fire in alphabetical
-- order, so this runs before update_classes_updated_at. The check neutralises
-- updated_at anyway, but the ordering keeps the comparison reading against
-- what the client actually sent.
CREATE TRIGGER enforce_class_update_column_scope
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_class_update_column_scope();

COMMENT ON TRIGGER enforce_class_update_column_scope ON public.classes IS
  'RLS scopes rows, not columns. The teacher economy-settings UPDATE policy therefore grants every column; this restricts non-admin callers to economy_mode and points_to_cash_rate.';
