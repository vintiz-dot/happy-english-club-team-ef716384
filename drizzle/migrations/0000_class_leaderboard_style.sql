ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS leaderboard_style TEXT NOT NULL DEFAULT 'podium'
  CHECK (leaderboard_style IN ('podium', 'star', 'arcade', 'night'));

-- Teachers may already update their own class rows under the existing
-- policy; the column-scope trigger decides which columns they may touch.
-- Add leaderboard_style to that allowlist.
CREATE OR REPLACE FUNCTION public.enforce_class_update_column_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and server-side jobs (service role) are unrestricted.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Teachers may only change the classroom-economy settings and the
  -- leaderboard display style on their own classes. Reset every other
  -- column to its old value; raise if they tried to change anything else.
  NEW.economy_mode := OLD.economy_mode IS NOT NULL AND NEW.economy_mode;
  NEW.points_to_cash_rate := OLD.points_to_cash_rate;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();

  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.rate_per_session IS DISTINCT FROM OLD.rate_per_session
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.schedule IS DISTINCT FROM OLD.schedule
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.max_students IS DISTINCT FROM OLD.max_students
     OR NEW.age_range IS DISTINCT FROM OLD.age_range
     OR NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url
     OR NEW.curriculum IS DISTINCT FROM OLD.curriculum
     OR NEW.show_curriculum IS DISTINCT FROM OLD.show_curriculum
     OR NEW.show_teacher_bio IS DISTINCT FROM OLD.show_teacher_bio THEN
    RAISE EXCEPTION 'Teachers may only update economy settings and leaderboard style on their own classes';
  END IF;

  RETURN NEW;
END;
$$;