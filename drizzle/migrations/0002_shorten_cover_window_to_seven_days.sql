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
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.default_teacher_id
    WHERE c.id = is_teacher_of_class.class_id
      AND t.user_id = is_teacher_of_class.user_id
  )
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

REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.is_teacher_of_class(uuid, uuid) IS
  'Two tiers. Roster (classes.default_teacher_id, or a schedule_template weekly slot) is permanent. Coverage (a non-cancelled session assigned to the teacher or TA) lasts from 7 days before to 60 days after that session. The trailing window was 45 days in 20261007120000, which kept a one-off cover visible for six weeks.';