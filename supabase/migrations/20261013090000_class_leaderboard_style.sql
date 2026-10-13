-- Let each class choose how its leaderboard looks.
--
-- Three new display boards ship alongside the existing one: Star Board for
-- the youngest classes, High Scores for primary, Night League for the older
-- ones. Which suits a class is a judgement about the children in the room,
-- so the teacher who stands in front of them picks it, not an admin
-- guessing from a spreadsheet.
--
-- TWO THINGS HAVE TO CHANGE TOGETHER, and the second is the one that would
-- have broken this quietly.
--
-- 1. The column. A typed column with a CHECK, not a key inside
--    visibility_settings: that column is a public-field mask written WHOLE
--    by the admin screen, so a teacher saving a style would have to re-send
--    every visibility flag and could clobber one by racing. A separate
--    column also means the database rejects a typo rather than a board
--    silently falling back.
--
-- 2. The trigger. enforce_class_update_column_scope (20261005090000) is a
--    deliberate ALLOWLIST: it resets economy_mode and points_to_cash_rate to
--    their stored values and then demands the rest of the row is untouched.
--    That design protects every future column automatically — which means a
--    new column is FORBIDDEN to teachers the moment it exists. Adding the
--    column without amending the trigger would leave every teacher save
--    failing with insufficient_privilege, and the failure would look like a
--    UI bug rather than a policy one.
--
-- No new RLS policy is added, deliberately. Teachers already hold a FOR
-- UPDATE policy on their own classes (20260409104920) and admins hold one on
-- all of them; permissive policies OR together, so a narrower extra policy
-- would grant nothing and only confuse the next reader.
--
-- On who counts as "their own class": this reuses is_teacher_of_class
-- exactly as the economy settings do, which includes a teacher covering a
-- session in the window as well as the rostered one. That is the boundary
-- the school already accepted for a setting that moves MONEY, so drawing a
-- stricter line around a cosmetic one would be inconsistent. The style is
-- per class, reversible, and visible to everyone the moment it changes.

-- ---------------------------------------------------------------- column

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS leaderboard_style text NOT NULL DEFAULT 'podium';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_leaderboard_style_check'
  ) THEN
    ALTER TABLE public.classes
      ADD CONSTRAINT classes_leaderboard_style_check
      CHECK (leaderboard_style IN ('podium', 'star', 'arcade', 'night'));
  END IF;
END $$;

COMMENT ON COLUMN public.classes.leaderboard_style IS
  'Which leaderboard design this class sees: podium (the classic board, and the only one that works on a phone), star (Star Board, early years), arcade (High Scores, primary), night (Night League, middle years and up). Set by an admin or by a teacher of this class.';

-- ----------------------------------------------------------- the trigger

-- Same install-time guard as the original, widened by one column. It exists
-- because plpgsql resolves record fields at runtime: if a column here were
-- renamed, the function body would still compile and would then reject every
-- teacher save. Better to refuse to install.
DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND column_name IN ('economy_mode', 'points_to_cash_rate', 'leaderboard_style')
  ) <> 3 THEN
    RAISE EXCEPTION
      'public.classes is missing economy_mode, points_to_cash_rate and/or leaderboard_style; refusing to install the column-scope trigger';
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
  -- teacher policy. Reset the columns they ARE allowed to set back to their
  -- stored values, then demand that what remains is identical to the stored
  -- row.
  --
  -- Still an allowlist rather than a denylist: a column added to this table
  -- in future stays protected the moment it exists, without anyone having to
  -- remember to come back here. The cost of that choice is exactly this
  -- migration — a new teacher-editable column must be named here too.
  remainder := NEW;
  remainder.economy_mode        := OLD.economy_mode;
  remainder.points_to_cash_rate := OLD.points_to_cash_rate;
  remainder.leaderboard_style   := OLD.leaderboard_style;
  remainder.updated_at          := OLD.updated_at;  -- maintained by its own trigger
  remainder.updated_by          := OLD.updated_by;  -- bookkeeping, not a setting

  IF remainder IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION
      'Teachers may only change classroom-economy settings (economy_mode, points_to_cash_rate) and the leaderboard style on their own classes. Ask an admin to change anything else.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_class_update_column_scope() FROM anon, PUBLIC;

-- The trigger itself already exists and points at this function by name, so
-- CREATE OR REPLACE above is enough. Recreated defensively in case this runs
-- on a database where 20261005090000 was never applied.
DROP TRIGGER IF EXISTS enforce_class_update_column_scope ON public.classes;
CREATE TRIGGER enforce_class_update_column_scope
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_class_update_column_scope();
