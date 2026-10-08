-- Shorten the trailing cover window from 45 days to 7.
--
-- 20261007120000 gave is_teacher_of_class two tiers and set cover at 45 days
-- back / 60 days forward. 45 was my estimate of how long a substitute needs
-- after a lesson to finish attendance, points and marking. It was too long:
-- in practice a teacher who covered a single lesson kept the class in their
-- leaderboard for six weeks, which reads to an admin as though the class had
-- been assigned to them. The one-off cover was still, in effect, lingering.
--
-- Seven days covers the lesson and the week after it, which is the window the
-- work actually happens in, and then it ends.
--
-- Nothing else changes. Roster membership (classes.default_teacher_id, or a
-- schedule_template weekly slot) is still permanent, cancelled sessions still
-- grant nothing, both the lead-teacher and teaching-assistant branches are
-- preserved, and the 60-day forward window is untouched - a teacher must
-- still be able to prepare a class they are about to cover.
--
-- Kept in step with COVER_TRAILING_DAYS in src/lib/teacherAccess.ts and the
-- same constant in supabase/functions/class-leaderboard/index.ts. If the UI
-- is more generous than this function, the class appears in the dropdown and
-- then renders an empty leaderboard.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_teacher_of_class'
  ) THEN
    RAISE EXCEPTION 'public.is_teacher_of_class is missing; 20261007120000 has not been applied';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Tier 1, roster: the class's default teacher. Permanent, and cheapest, so
  -- it goes first - OR EXISTS short-circuits.
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.default_teacher_id
    WHERE c.id = is_teacher_of_class.class_id
      AND t.user_id = is_teacher_of_class.user_id
  )

  -- Tier 2, cover: 7 days back, 60 days forward. Cancelled sessions grant
  -- nothing.
  OR EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.teachers t ON t.id = s.teacher_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND t.user_id  = is_teacher_of_class.user_id
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '7 days'
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
  -- Dropping this branch would revoke every TA school-wide.
  OR EXISTS (
    SELECT 1
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    JOIN public.teaching_assistants ta ON ta.id = sp.teaching_assistant_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND ta.user_id = is_teacher_of_class.user_id
      AND sp.participant_type = 'teaching_assistant'
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  );
$function$;

-- Supabase grants EXECUTE to anon/authenticated/service_role explicitly via
-- the public schema's default privileges, and CREATE OR REPLACE preserves the
-- existing ACL, so this does not lock signed-in users out.
REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.is_teacher_of_class(uuid, uuid) IS
  'Two tiers. Roster (classes.default_teacher_id, or a schedule_template weekly slot) is permanent. Coverage (a non-cancelled session assigned to the teacher or TA) lasts from 7 days before to 60 days after that session. The trailing window was 45 days in 20261007120000, which kept a one-off cover visible for six weeks.';
