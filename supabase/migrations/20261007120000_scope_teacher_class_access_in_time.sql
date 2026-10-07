-- Give is_teacher_of_class a notion of WHEN, and of the roster.
--
-- THE HOLE
-- The function answered "has this person ever had a single session row for
-- this class", with no bound on date and no check on status:
--
--   SELECT EXISTS (SELECT 1 FROM sessions s JOIN teachers t ON t.id = s.teacher_id
--                  WHERE s.class_id = $2 AND t.user_id = $1)
--      OR EXISTS (... the same shape for teaching assistants ...)
--
-- So covering one lesson for a colleague granted that class permanently. Not
-- read-only, either: point_transactions, student_points, skill_assessments and
-- attendance all carry FOR ALL policies keyed on this function, so a teacher
-- who stood in once two years ago can still award and deduct that class's
-- points today. A CANCELLED session grants it just as well as a taught one,
-- because status was never consulted.
--
-- It was also invisible. The leaderboard page stops listing the class after
-- three months, so the access outlives the only screen that revealed it.
--
-- THE RULE, in two tiers
--
--   Roster  - permanent. The class names you as its default teacher, or one
--             of its weekly slots does. This is what actually decides who
--             teaches what: schedule-sessions generates every session row
--             from `slot.teacherId || cls.default_teacher_id`, so the roster
--             is the source and the session rows are a projection of it.
--
--   Cover   - time-boxed. A non-cancelled session assigned to you within
--             [today - 45 days, today + 60 days].
--
-- The window is the whole design question, so to be explicit about both ends:
--   - 60 days forward, because a teacher must prepare and see a class they
--     are about to cover, and because the generator writes future sessions.
--   - 45 days back, because teaching a lesson is not the end of the work:
--     attendance, points and grading trail it. Shorter and a substitute loses
--     the class before they have finished marking it.
-- Neither tier lets a one-off cover become permanent, which is the bug.
--
-- BLAST RADIUS. 86 references across 30 migrations route through this
-- function. Narrowing the function is deliberate: it is the only change that
-- revokes anything. Restricting the leaderboard query alone would remove the
-- dropdown entry and leave every API path open.
--
-- The TA branch is preserved. An earlier migration (20260401142419) added it,
-- and dropping it here would revoke every teaching assistant's access school
-- wide.

-- Fail at install time rather than silently at a teacher's first page load.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'classes'
      AND column_name = 'schedule_template'
  ) THEN
    RAISE EXCEPTION 'public.classes.schedule_template is missing; refusing to install a roster check that reads it';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'classes'
      AND column_name = 'default_teacher_id'
  ) THEN
    RAISE EXCEPTION 'public.classes.default_teacher_id is missing; refusing to install a roster check that reads it';
  END IF;

  -- 'Canceled' must be a real label of the enum or the status check below
  -- silently matches nothing and the time bound is the only thing left.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'session_status' AND e.enumlabel = 'Canceled'
  ) THEN
    RAISE EXCEPTION 'session_status has no Canceled label; refusing to install a check that filters on it';
  END IF;
END $$;

-- Supports the coverage lookups, which now run on every RLS check that uses
-- this function.
CREATE INDEX IF NOT EXISTS idx_sessions_class_teacher_date
  ON public.sessions (class_id, teacher_id, date);

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Tier 1, roster: named as the class's default teacher. Permanent, and the
  -- cheapest check, so it goes first - OR EXISTS short-circuits.
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.default_teacher_id
    WHERE c.id = is_teacher_of_class.class_id
      AND t.user_id = is_teacher_of_class.user_id
  )

  -- Tier 2, cover: a session of this class assigned to them, near enough in
  -- time to still be their business. Cancelled sessions grant nothing.
  OR EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.teachers t ON t.id = s.teacher_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND t.user_id  = is_teacher_of_class.user_id
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '45 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  )

  -- Tier 1, roster: named on one of the class's weekly slots. Permanent.
  -- The regex guards the cast: schedule_template is free-form JSON written by
  -- two admin screens, and a malformed teacherId must not raise inside an RLS
  -- predicate, which would lock the table rather than deny a row.
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(c.schedule_template -> 'weeklySlots') = 'array'
        THEN c.schedule_template -> 'weeklySlots'
        ELSE '[]'::jsonb
      END
    ) AS slot
    JOIN public.teachers t
      ON t.id = (slot ->> 'teacherId')::uuid
    WHERE c.id = is_teacher_of_class.class_id
      AND (slot ->> 'teacherId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND t.user_id = is_teacher_of_class.user_id
  )

  -- Tier 2, cover, for teaching assistants. Same window, same status rule.
  -- Preserved from 20260401142419: without this every TA loses access.
  OR EXISTS (
    SELECT 1
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    JOIN public.teaching_assistants ta ON ta.id = sp.teaching_assistant_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND ta.user_id = is_teacher_of_class.user_id
      AND sp.participant_type = 'teaching_assistant'
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '45 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  );
$function$;

-- Re-applies what 20260711235255 already does. This does NOT lock signed-in
-- users out: Supabase's default privileges on the public schema grant EXECUTE
-- to anon, authenticated and service_role EXPLICITLY, so revoking PUBLIC
-- leaves the authenticated grant standing. (CREATE OR REPLACE above also
-- preserves the existing ACL rather than resetting it.) Worth stating,
-- because a plain Postgres instance has no such default privileges and the
-- same two lines there would revoke the only grant that exists.
REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.is_teacher_of_class(uuid, uuid) IS
  'Two tiers. Roster (classes.default_teacher_id, or a schedule_template weekly slot) is permanent. Coverage (a non-cancelled session assigned to the teacher or TA) lasts from 45 days before to 60 days after that session. Previously this was "any session ever", so one cover lesson granted a class permanently.';
