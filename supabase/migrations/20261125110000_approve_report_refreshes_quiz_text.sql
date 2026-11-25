-- Re-approving a lesson report now refreshes the text of its review-quiz assignment
-- (the questions, no answers) together with the questions, while nobody has submitted it.
-- Same function as 20261121130000 apart from the one UPDATE marked below.

CREATE OR REPLACE FUNCTION public.approve_lesson_report(p_session uuid, p_class_part jsonb, p_staff_part jsonb,
  p_students jsonb, p_photo_ids uuid[], p_quiz jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.sessions; v_report uuid; v_hw uuid; v_bad int; el jsonb;
BEGIN
  IF NOT public.lesson_report_teacher_can(p_session) THEN
    RAISE EXCEPTION 'Only a teacher of this class or an admin can approve its lesson report' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session;
  IF p_class_part IS NULL OR jsonb_typeof(p_class_part) <> 'object' THEN
    RAISE EXCEPTION 'The class part is a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_students IS NULL OR jsonb_typeof(p_students) <> 'array' THEN
    RAISE EXCEPTION 'Students is a JSON array' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_bad FROM jsonb_array_elements(p_students) e
  WHERE NOT EXISTS (SELECT 1 FROM public.enrollments en
                    WHERE en.class_id = s.class_id AND en.student_id::text = e->>'student_id'
                      AND en.start_date <= s.date AND (en.end_date IS NULL OR en.end_date >= s.date))
     OR jsonb_typeof(e->'part') IS DISTINCT FROM 'object';
  IF v_bad > 0 THEN
    RAISE EXCEPTION '% child part(s) are for a child not in this class on the lesson''s date', v_bad USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_bad FROM unnest(coalesce(p_photo_ids, '{}')) pid
  WHERE NOT EXISTS (SELECT 1 FROM public.lesson_report_photos p WHERE p.id = pid AND p.session_id = p_session);
  IF v_bad > 0 THEN
    RAISE EXCEPTION '% photo(s) are not this lesson''s', v_bad USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.lesson_reports AS r (session_id, class_id, class_part, staff_part, photo_ids, approved_by, approved_at)
  VALUES (p_session, s.class_id, p_class_part, coalesce(p_staff_part, '{}'::jsonb), coalesce(p_photo_ids, '{}'), auth.uid(), now())
  ON CONFLICT (session_id) DO UPDATE SET class_part = EXCLUDED.class_part, staff_part = EXCLUDED.staff_part,
    photo_ids = EXCLUDED.photo_ids, approved_by = EXCLUDED.approved_by, approved_at = now()
  RETURNING r.id, r.review_homework_id INTO v_report, v_hw;

  DELETE FROM public.lesson_report_students WHERE report_id = v_report;
  FOR el IN SELECT * FROM jsonb_array_elements(p_students) LOOP
    INSERT INTO public.lesson_report_students (report_id, student_id, part)
    VALUES (v_report, (el->>'student_id')::uuid, el->'part')
    ON CONFLICT (report_id, student_id) DO UPDATE SET part = EXCLUDED.part;
  END LOOP;

  IF p_quiz IS NOT NULL THEN
    IF jsonb_typeof(p_quiz->'questions') IS DISTINCT FROM 'array'
       OR jsonb_array_length(p_quiz->'questions') NOT BETWEEN 1 AND 15 THEN
      RAISE EXCEPTION 'A review quiz has 1 to 15 questions' USING ERRCODE = '22023';
    END IF;
    IF v_hw IS NULL THEN
      INSERT INTO public.homeworks (class_id, title, body, due_date, created_by, submission_type)
      VALUES (s.class_id, left(coalesce(nullif(p_quiz->>'title', ''), 'Lesson review'), 200), p_quiz->>'body',
              coalesce((p_quiz->>'due_date')::date, s.date + 7), auth.uid(), 'quiz')
      RETURNING id INTO v_hw;
      INSERT INTO public.lesson_review_quizzes (homework_id, report_id, questions, points)
      VALUES (v_hw, v_report, p_quiz->'questions', coalesce((p_quiz->>'points')::int, 10));
      UPDATE public.lesson_reports SET review_homework_id = v_hw WHERE id = v_report;
    ELSIF NOT EXISTS (SELECT 1 FROM public.homework_submissions hs WHERE hs.homework_id = v_hw) THEN
      UPDATE public.lesson_review_quizzes SET questions = p_quiz->'questions',
        points = coalesce((p_quiz->>'points')::int, points) WHERE homework_id = v_hw;
      -- new: the assignment's own text follows the questions (only when the approval sends a non-empty body)
      IF coalesce(btrim(p_quiz->>'body'), '') <> '' THEN
        UPDATE public.homeworks SET body = p_quiz->>'body' WHERE id = v_hw;
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('report_id', v_report, 'homework_id', v_hw);
END $$;

REVOKE ALL ON FUNCTION public.approve_lesson_report(uuid, jsonb, jsonb, jsonb, uuid[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_lesson_report(uuid, jsonb, jsonb, jsonb, uuid[], jsonb) TO authenticated, service_role;

-- Make the assignment text of review quizzes already set readable on screen. The text
-- from 20261125100000 was plain lines, which the page runs together; the page shows
-- HTML, so it is rewritten as one paragraph per question. Touches only an empty body
-- or the plain-text body that migration wrote (starts "1. ", no HTML tag in it).
CREATE FUNCTION public.zz_quiz_html(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

UPDATE public.homeworks h
SET body = q.txt
FROM (
  SELECT z.homework_id,
         string_agg(
           '<p><strong>' || t.n || '. ' || public.zz_quiz_html(t.q->>'prompt') || '</strong>'
              || CASE WHEN coalesce(t.q->>'prompt_vi', '') <> '' THEN '<br>' || public.zz_quiz_html(t.q->>'prompt_vi') ELSE '' END
              || CASE
                   WHEN t.q->>'kind' = 'choice' AND jsonb_typeof(t.q->'options') = 'array' THEN
                     (SELECT coalesce(string_agg('<br>' || chr(64 + o.i::int) || '. ' || public.zz_quiz_html(o.v), '' ORDER BY o.i), '')
                        FROM jsonb_array_elements_text(t.q->'options') WITH ORDINALITY AS o(v, i))
                   WHEN t.q->>'kind' = 'order' AND jsonb_typeof(t.q->'options') = 'array' THEN
                     '<br>Put in order: ' || (SELECT string_agg(public.zz_quiz_html(v), ' / ') FROM jsonb_array_elements_text(t.q->'options') AS o(v))
                   ELSE '' END
              || '</p>',
           '' ORDER BY t.n) AS txt
  FROM public.lesson_review_quizzes z
  CROSS JOIN LATERAL jsonb_array_elements(z.questions) WITH ORDINALITY AS t(q, n)
  GROUP BY z.homework_id
) q
WHERE h.id = q.homework_id
  AND (coalesce(btrim(h.body), '') = '' OR (h.body ~ '^1\. ' AND h.body !~ '<[a-z]'));

DROP FUNCTION public.zz_quiz_html(text);
