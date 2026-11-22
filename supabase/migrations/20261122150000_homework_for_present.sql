-- Homework for the children who were in the lesson (owner, 22 Nov 2026).
--
-- `homeworks.student_ids` names the children a homework is for. NULL (every
-- homework before this, and any posted without a list) is the whole class, as
-- before. Lesson Decks' "Set in app" fills it with the children marked Present
-- in today's lesson, so a child who missed the lesson is not set work on it.
--
-- Everything a child or family reads or does with a homework respects it:
--   hw_student_read / hwf_student_read   the homework row and its files
--   "Students can insert own submissions" a child can hand in only work set for them
--   get_student_homeworks / get_student_weekly_stats  (SECURITY DEFINER, so
--     they bypass RLS and need the rule themselves)
--   notify_homework_assigned              only the named children's logins are told
-- Staff policies are unchanged (a teacher of the class sees every homework).
-- The rule is ONE function, homework_is_for(student_ids, student_id).
--
-- Not covered: the homework bucket's assignment files (homework_object_can_read)
-- still open to any child enrolled in the class who knows the file's path; Lesson
-- Decks posts no files, and the path holds the homework's id, which an untargeted
-- child cannot read.

DO $$
BEGIN
  IF to_regclass('public.homeworks') IS NULL OR to_regclass('public.enrollments') IS NULL
     OR to_regclass('public.homework_submissions') IS NULL OR to_regclass('public.homework_files') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: homeworks / homework_submissions / homework_files / enrollments missing';
  END IF;
END $$;

ALTER TABLE public.homeworks ADD COLUMN IF NOT EXISTS student_ids uuid[];
ALTER TABLE public.homeworks DROP CONSTRAINT IF EXISTS homeworks_student_ids_nonempty;
ALTER TABLE public.homeworks ADD CONSTRAINT homeworks_student_ids_nonempty
  CHECK (student_ids IS NULL OR cardinality(student_ids) BETWEEN 1 AND 200);
COMMENT ON COLUMN public.homeworks.student_ids IS
  'The children this homework is for; NULL = the whole class. Read through homework_is_for().';

CREATE OR REPLACE FUNCTION public.homework_is_for(_student_ids uuid[], _student_id uuid)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT _student_ids IS NULL OR _student_id = ANY(_student_ids) $$;
GRANT EXECUTE ON FUNCTION public.homework_is_for(uuid[], uuid) TO authenticated, service_role;

-- Every named child is (or was) enrolled in the homework's class; no repeats.
CREATE OR REPLACE FUNCTION public.homeworks_student_ids_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_bad uuid;
BEGIN
  IF NEW.student_ids IS NULL THEN RETURN NEW; END IF;
  IF cardinality(NEW.student_ids) <> (SELECT count(DISTINCT x) FROM unnest(NEW.student_ids) x) THEN
    RAISE EXCEPTION 'homeworks.student_ids repeats a child';
  END IF;
  SELECT x INTO v_bad FROM unnest(NEW.student_ids) x
   WHERE NOT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.class_id = NEW.class_id AND e.student_id = x)
   LIMIT 1;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'homeworks.student_ids: % is not enrolled in this class', v_bad;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.homeworks_student_ids_check() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS homeworks_student_ids_check ON public.homeworks;
CREATE TRIGGER homeworks_student_ids_check BEFORE INSERT OR UPDATE OF student_ids, class_id ON public.homeworks
  FOR EACH ROW EXECUTE FUNCTION public.homeworks_student_ids_check();

-- The homework row: a child (or their family) reads it when the child is in the
-- class now AND it is set for them.
DROP POLICY IF EXISTS hw_student_read ON public.homeworks;
CREATE POLICY hw_student_read ON public.homeworks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
       WHERE e.class_id = homeworks.class_id
         AND e.end_date IS NULL
         AND public.homework_is_for(homeworks.student_ids, e.student_id)
         AND e.student_id IN (
           SELECT s.id FROM public.students s
            WHERE s.linked_user_id = auth.uid()
               OR s.family_id IN (SELECT f.id FROM public.families f WHERE f.primary_user_id = auth.uid())
         )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_teacher_of_class(auth.uid(), class_id)
  );

DROP POLICY IF EXISTS hwf_student_read ON public.homework_files;
CREATE POLICY hwf_student_read ON public.homework_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.homeworks h
        JOIN public.enrollments e ON e.class_id = h.class_id AND e.end_date IS NULL
       WHERE h.id = homework_files.homework_id
         AND public.homework_is_for(h.student_ids, e.student_id)
         AND e.student_id IN (
           SELECT s.id FROM public.students s
            WHERE s.linked_user_id = auth.uid()
               OR s.family_id IN (SELECT f.id FROM public.families f WHERE f.primary_user_id = auth.uid())
         )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Handing in: the child's own login or family, for homework set for that child.
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.homework_submissions;
CREATE POLICY "Students can insert own submissions" ON public.homework_submissions
  FOR INSERT
  WITH CHECK (
    (
      student_id IN (SELECT s.id FROM public.students s WHERE s.linked_user_id = auth.uid())
      OR student_id IN (
        SELECT s.id FROM public.students s
         WHERE s.family_id IN (SELECT f.id FROM public.families f WHERE f.primary_user_id = auth.uid())
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.homeworks h
       WHERE h.id = homework_submissions.homework_id
         AND public.homework_is_for(h.student_ids, homework_submissions.student_id)
    )
  );

-- Notifications go to the named children only (all of the class when NULL).
CREATE OR REPLACE FUNCTION public.notify_homework_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment RECORD;
  v_class_name TEXT;
BEGIN
  SELECT name INTO v_class_name FROM classes WHERE id = NEW.class_id;
  FOR v_enrollment IN
    SELECT DISTINCT
      s.id as student_id,
      COALESCE(s.linked_user_id, f.primary_user_id) as user_id,
      s.full_name
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    LEFT JOIN families f ON s.family_id = f.id
    WHERE e.class_id = NEW.class_id
      AND public.homework_is_for(NEW.student_ids, s.id)
      AND (s.linked_user_id IS NOT NULL OR f.primary_user_id IS NOT NULL)
      AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
  LOOP
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      v_enrollment.user_id, 'homework_assigned',
      'New Homework: ' || NEW.title,
      'New homework assigned in ' || v_class_name,
      jsonb_build_object('homework_id', NEW.id, 'class_id', NEW.class_id, 'class_name', v_class_name, 'due_date', NEW.due_date, 'student_id', v_enrollment.student_id)
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

-- As installed (read from production on 22 Nov 2026), plus homework_is_for.
CREATE OR REPLACE FUNCTION public.get_student_homeworks(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_caller_id uuid := auth.uid();
  v_authorized boolean := false;
BEGIN
  IF public.has_role(v_caller_id, 'admin'::app_role) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM enrollments e
      JOIN sessions s ON s.class_id = e.class_id
      JOIN teachers t ON t.id = s.teacher_id
      WHERE e.student_id = p_student_id
        AND t.user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students
      WHERE id = p_student_id AND linked_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students s
      JOIN families f ON f.id = s.family_id
      WHERE s.id = p_student_id AND f.primary_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'homeworks', COALESCE((
      SELECT jsonb_agg(hw_row ORDER BY hw_row->>'created_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', h.id,
          'class_id', h.class_id,
          'title', h.title,
          'body', h.body,
          'due_date', h.due_date,
          'created_by', h.created_by,
          'created_at', h.created_at,
          'classes', jsonb_build_object('name', c.name),
          'homework_files', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'id', hf.id,
              'file_name', hf.file_name,
              'storage_key', hf.storage_key,
              'size_bytes', hf.size_bytes
            ))
            FROM homework_files hf WHERE hf.homework_id = h.id
          ), '[]'::jsonb)
        ) AS hw_row
        FROM homeworks h
        JOIN classes c ON c.id = h.class_id
        WHERE h.class_id IN (
          SELECT e.class_id FROM enrollments e
          WHERE e.student_id = p_student_id AND e.end_date IS NULL
        )
          AND public.homework_is_for(h.student_ids, p_student_id)
      ) sub
    ), '[]'::jsonb),
    'submissions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', hs.id,
        'homework_id', hs.homework_id,
        'student_id', hs.student_id,
        'status', hs.status,
        'grade', hs.grade,
        'teacher_feedback', hs.teacher_feedback,
        'submission_text', hs.submission_text,
        'file_name', hs.file_name,
        'storage_key', hs.storage_key,
        'submitted_at', hs.submitted_at,
        'graded_at', hs.graded_at,
        'celebration_seen_at', hs.celebration_seen_at
      ))
      FROM homework_submissions hs
      WHERE hs.student_id = p_student_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- As installed (read from production on 22 Nov 2026), plus homework_is_for.
CREATE OR REPLACE FUNCTION public.get_student_weekly_stats(p_student_id uuid, p_week_start date, p_week_end date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_caller_id uuid := auth.uid();
  v_authorized boolean := false;
  v_class_ids uuid[];
BEGIN
  IF public.has_role(v_caller_id, 'admin'::app_role) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students WHERE id = p_student_id AND linked_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM students s
      JOIN families f ON f.id = s.family_id
      WHERE s.id = p_student_id AND f.primary_user_id = v_caller_id
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT array_agg(e.class_id) INTO v_class_ids
  FROM enrollments e
  WHERE e.student_id = p_student_id AND e.end_date IS NULL;

  IF v_class_ids IS NULL THEN
    v_class_ids := '{}';
  END IF;

  SELECT jsonb_build_object(
    'total_sessions', (
      SELECT count(*) FROM sessions
      WHERE class_id = ANY(v_class_ids)
        AND date >= p_week_start AND date <= p_week_end
        AND status IN ('Scheduled', 'Held')
    ),
    'attended_sessions', (
      SELECT count(*) FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      WHERE a.student_id = p_student_id
        AND a.status = 'Present'
        AND s.date >= p_week_start AND s.date <= p_week_end
    ),
    'total_homeworks', (
      SELECT count(*) FROM homeworks
      WHERE class_id = ANY(v_class_ids)
        AND public.homework_is_for(student_ids, p_student_id)
        AND created_at >= p_week_start::timestamptz
    ),
    'submitted_homeworks', (
      SELECT count(*) FROM homework_submissions
      WHERE student_id = p_student_id
        AND status IN ('submitted', 'graded')
        AND submitted_at >= p_week_start::timestamptz
    ),
    'xp_earned', COALESCE((
      SELECT sum(points) FROM point_transactions
      WHERE student_id = p_student_id
        AND date >= p_week_start AND date <= p_week_end
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
