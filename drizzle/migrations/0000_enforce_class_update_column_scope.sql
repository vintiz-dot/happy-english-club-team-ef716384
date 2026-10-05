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
  remainder := NEW;
  remainder.economy_mode        := OLD.economy_mode;
  remainder.points_to_cash_rate := OLD.points_to_cash_rate;
  remainder.updated_at          := OLD.updated_at;
  remainder.updated_by          := OLD.updated_by;

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

CREATE TRIGGER enforce_class_update_column_scope
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_class_update_column_scope();

COMMENT ON TRIGGER enforce_class_update_column_scope ON public.classes IS
  'RLS scopes rows, not columns. The teacher economy-settings UPDATE policy therefore grants every column; this restricts non-admin callers to economy_mode and points_to_cash_rate.';