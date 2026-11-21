-- Lesson reports, stage C: the review quiz a teacher's approval sets as homework.
--
-- A child (or their family) asks for the questions WITHOUT answers, sends the
-- answers back, and the database marks them. The answers, accepted spellings and
-- explanations live in lesson_review_quizzes (staff only) and reach a child only
-- as a result after submitting.
--
--   get_lesson_review_quiz(homework, student)         questions + the child's result, if any
--   submit_lesson_review(homework, student, answers)   marks, grades the homework, awards points
--
-- Marking (docs/LESSON_REPORTS.md): trimmed, case-folded, inner spaces collapsed,
-- trailing . ! ? dropped. A gap also accepts anything in `accept`. An 'order'
-- answer is the pieces in the child's order joined by one space.
--
-- Retakes: allowed until the homework's due date (Hanoi). The best score stands and
-- the points follow it: award_homework_points replaces the one homework award, so a
-- retake never pays twice. The first submission after the due date is accepted (late).
-- Access: the child's own login or their family (can_view_student), for a child
-- enrolled in the homework's class today or on the lesson's date. Not another child.

DO $pre$
BEGIN
  IF to_regclass('public.lesson_review_quizzes') IS NULL
     OR to_regclass('public.lesson_reports') IS NULL
     OR to_regprocedure('public.award_homework_points(uuid, uuid, integer, text)') IS NULL
     OR to_regprocedure('public.can_view_student(uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Refusing to install: needs 20261121130000_lesson_reports.sql and award_homework_points';
  END IF;
END
$pre$;

-- ------------------------------------------------------------------ marking

CREATE OR REPLACE FUNCTION public.lesson_quiz_norm(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(btrim(coalesce(p_text, ''))), '\s+', ' ', 'g'), '[.!?]+$', ''))
$$;

-- What a child typed or tapped, as one string. A tapped 'order' answer is an array of pieces.
CREATE OR REPLACE FUNCTION public.lesson_quiz_answer_text(p_value jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE jsonb_typeof(p_value)
    WHEN 'string' THEN p_value #>> '{}'
    WHEN 'array' THEN (SELECT string_agg(e #>> '{}', ' ' ORDER BY n) FROM jsonb_array_elements(p_value) WITH ORDINALITY AS t(e, n))
    ELSE NULL END
$$;

-- Marks every question. Returns [{id, correct, your_answer, answer, explain, explain_vi}].
CREATE OR REPLACE FUNCTION public.lesson_quiz_mark(p_questions jsonb, p_answers jsonb)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', q->>'id',
    'correct', coalesce(mine, '') <> '' AND (
      public.lesson_quiz_norm(mine) = public.lesson_quiz_norm(q->>'answer')
      OR (q->>'kind' = 'gap' AND jsonb_typeof(q->'accept') = 'array' AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(q->'accept') a WHERE public.lesson_quiz_norm(a) = public.lesson_quiz_norm(mine)))),
    'your_answer', mine,
    'answer', q->>'answer',
    'explain', q->>'explain',
    'explain_vi', q->>'explain_vi') ORDER BY n), '[]'::jsonb)
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS t(q, n)
  CROSS JOIN LATERAL (SELECT public.lesson_quiz_answer_text(p_answers -> (q->>'id')) AS mine) m
$$;

-- The questions as a child may see them: no answer, no accepted spellings, no explanation.
-- An 'order' question's pieces come back shuffled (the same way every time, never already solved).
CREATE OR REPLACE FUNCTION public.lesson_quiz_public(p_questions jsonb)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', q->>'id', 'kind', q->>'kind', 'prompt', q->>'prompt', 'prompt_vi', q->>'prompt_vi',
    'options', CASE
      WHEN q->>'kind' = 'order' AND jsonb_typeof(q->'options') = 'array' THEN
        (SELECT CASE WHEN count(*) > 1 AND string_agg(p, ' ' ORDER BY md5((q->>'id') || p || i::text)) = (q->>'answer')
                     THEN jsonb_agg(p ORDER BY md5((q->>'id') || p || i::text) DESC)
                     ELSE jsonb_agg(p ORDER BY md5((q->>'id') || p || i::text)) END
         FROM jsonb_array_elements_text(q->'options') WITH ORDINALITY AS o(p, i))
      WHEN jsonb_typeof(q->'options') = 'array' THEN q->'options'
      ELSE NULL END) ORDER BY n), '[]'::jsonb)
  FROM jsonb_array_elements(p_questions) WITH ORDINALITY AS t(q, n)
$$;

-- ------------------------------------------------------------------ access

-- The quiz behind a homework when the caller may take or view it for p_student; raises otherwise.
-- Both OUT values are NULL when the homework is not a review quiz.
CREATE OR REPLACE FUNCTION public.lesson_quiz_for(p_homework uuid, p_student uuid,
  OUT quiz public.lesson_review_quizzes, OUT hw public.homeworks)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_date date; v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501'; END IF;
  SELECT * INTO quiz FROM public.lesson_review_quizzes WHERE homework_id = p_homework;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO hw FROM public.homeworks WHERE id = p_homework;
  IF p_student IS NULL OR NOT public.can_view_student(p_student, auth.uid()) THEN
    RAISE EXCEPTION 'This is not your child''s homework' USING ERRCODE = '42501';
  END IF;
  SELECT s.date INTO v_date FROM public.lesson_reports r JOIN public.sessions s ON s.id = r.session_id WHERE r.id = quiz.report_id;
  IF NOT EXISTS (SELECT 1 FROM public.enrollments en
                 WHERE en.student_id = p_student AND en.class_id = hw.class_id
                   AND (   (en.start_date <= v_today AND (en.end_date IS NULL OR en.end_date >= v_today))
                        OR (v_date IS NOT NULL AND en.start_date <= v_date AND (en.end_date IS NULL OR en.end_date >= v_date)))) THEN
    RAISE EXCEPTION 'This child is not in the class this homework is for' USING ERRCODE = '42501';
  END IF;
END $$;

-- ------------------------------------------------------------------ the child's side

CREATE OR REPLACE FUNCTION public.get_lesson_review_quiz(p_homework uuid, p_student uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record; sub public.homework_submissions; st jsonb; v_res jsonb; v_score int;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date; v_open boolean;
BEGIN
  SELECT * INTO a FROM public.lesson_quiz_for(p_homework, p_student);
  IF a.quiz IS NULL OR (a.quiz).homework_id IS NULL THEN RETURN NULL; END IF;
  v_open := (a.hw).due_date IS NULL OR (a.hw).due_date >= v_today;
  SELECT * INTO sub FROM public.homework_submissions WHERE homework_id = p_homework AND student_id = p_student;
  IF FOUND AND sub.submission_text ~ '^\s*\{' THEN
    st := sub.submission_text::jsonb;
    v_res := public.lesson_quiz_mark((a.quiz).questions, coalesce(st->'answers', '{}'::jsonb));
    SELECT count(*) FILTER (WHERE (r->>'correct')::boolean) INTO v_score FROM jsonb_array_elements(v_res) r;
  END IF;
  RETURN jsonb_build_object(
    'homework_id', p_homework, 'title', (a.hw).title, 'due_date', (a.hw).due_date, 'points', (a.quiz).points,
    'questions', public.lesson_quiz_public((a.quiz).questions),
    'submission', CASE WHEN v_res IS NULL THEN NULL ELSE jsonb_build_object(
      'score', v_score, 'total', jsonb_array_length((a.quiz).questions),
      'points_awarded', coalesce((st->>'points')::int, 0), 'attempts', coalesce((st->>'attempts')::int, 1),
      'results', v_res, 'can_retake', v_open AND v_score < jsonb_array_length((a.quiz).questions)) END);
END $$;

CREATE OR REPLACE FUNCTION public.submit_lesson_review(p_homework uuid, p_student uuid, p_answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a record; sub public.homework_submissions; st jsonb; v_res jsonb; v_total int; v_score int; v_prev int;
  v_pts int; v_attempts int := 1; v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_improved boolean := true; v_best_score int; v_best_pts int; v_grade text;
BEGIN
  SELECT * INTO a FROM public.lesson_quiz_for(p_homework, p_student);
  IF a.quiz IS NULL OR (a.quiz).homework_id IS NULL THEN
    RAISE EXCEPTION 'This homework is not a review quiz' USING ERRCODE = '22023';
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Answers are a JSON object of question id to answer' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_homework::text || p_student::text, 0));

  v_total := jsonb_array_length((a.quiz).questions);
  v_res := public.lesson_quiz_mark((a.quiz).questions, p_answers);
  SELECT count(*) FILTER (WHERE (r->>'correct')::boolean) INTO v_score FROM jsonb_array_elements(v_res) r;
  v_pts := round((a.quiz).points::numeric * v_score / v_total)::int;
  v_grade := v_score || '/' || v_total;

  SELECT * INTO sub FROM public.homework_submissions WHERE homework_id = p_homework AND student_id = p_student FOR UPDATE;
  IF FOUND THEN
    IF (a.hw).due_date IS NOT NULL AND (a.hw).due_date < v_today THEN
      RAISE EXCEPTION 'This quiz has closed; the first result stands' USING ERRCODE = 'P0001';
    END IF;
    st := CASE WHEN sub.submission_text ~ '^\s*\{' THEN sub.submission_text::jsonb ELSE '{}'::jsonb END;
    v_attempts := coalesce((st->>'attempts')::int, 1) + 1;
    SELECT count(*) FILTER (WHERE (r->>'correct')::boolean) INTO v_prev
      FROM jsonb_array_elements(public.lesson_quiz_mark((a.quiz).questions, coalesce(st->'answers', '{}'::jsonb))) r;
    v_improved := v_score > v_prev;
  END IF;

  IF v_improved THEN
    v_best_score := v_score; v_best_pts := v_pts;
    IF sub.id IS NULL THEN
      INSERT INTO public.homework_submissions (homework_id, student_id, submission_text, grade, teacher_feedback, status, submitted_at, graded_at)
      VALUES (p_homework, p_student, jsonb_build_object('answers', p_answers, 'attempts', 1, 'points', v_pts)::text,
              v_grade, NULL, 'graded', now(), now());
    ELSE
      UPDATE public.homework_submissions SET
        submission_text = jsonb_build_object('answers', p_answers, 'attempts', v_attempts, 'points', v_pts)::text,
        grade = v_grade, teacher_feedback = NULL, status = 'graded', submitted_at = now(), graded_at = now()
      WHERE id = sub.id;
    END IF;
    IF v_pts > 0 THEN PERFORM public.award_homework_points(p_student, p_homework, v_pts, v_grade); END IF;
  ELSE
    -- Not better: the earlier answers, grade and points stand; only the attempt is counted.
    v_best_score := v_prev; v_best_pts := coalesce((st->>'points')::int, 0);
    UPDATE public.homework_submissions SET
      submission_text = jsonb_set(st, '{attempts}', to_jsonb(v_attempts))::text
    WHERE id = sub.id;
  END IF;

  RETURN jsonb_build_object(
    'homework_id', p_homework, 'score', v_score, 'total', v_total, 'points_awarded', v_best_pts,
    'best_score', v_best_score, 'improved', v_improved, 'attempts', v_attempts, 'results', v_res,
    'can_retake', ((a.hw).due_date IS NULL OR (a.hw).due_date >= v_today) AND v_best_score < v_total);
END $$;

DO $g$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.get_lesson_review_quiz(uuid, uuid)', 'public.submit_lesson_review(uuid, uuid, jsonb)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
  -- Internal: the two functions above run them as their owner.
  FOREACH f IN ARRAY ARRAY['public.lesson_quiz_norm(text)', 'public.lesson_quiz_answer_text(jsonb)',
      'public.lesson_quiz_mark(jsonb, jsonb)', 'public.lesson_quiz_public(jsonb)',
      'public.lesson_quiz_for(uuid, uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END
$g$;
