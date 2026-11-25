-- Review quizzes set from a lesson report showed on Assignments as an empty homework:
-- the questions lived only in lesson_review_quizzes. The approval screen now writes them
-- (without answers) into homeworks.body. This fills in the ones already set.
-- Only homeworks whose body is empty are touched; a teacher's own text is never replaced.

UPDATE public.homeworks h
SET body = q.txt
FROM (
  SELECT z.homework_id,
         string_agg(
           (t.n || '. ' || (t.q->>'prompt')
              || CASE WHEN coalesce(t.q->>'prompt_vi', '') <> '' THEN ' (' || (t.q->>'prompt_vi') || ')' ELSE '' END
              || CASE
                   WHEN t.q->>'kind' = 'choice' AND jsonb_typeof(t.q->'options') = 'array' THEN
                     (SELECT coalesce(string_agg(E'\n   ' || chr(64 + o.i::int) || '. ' || o.v, '' ORDER BY o.i), '')
                        FROM jsonb_array_elements_text(t.q->'options') WITH ORDINALITY AS o(v, i))
                   WHEN t.q->>'kind' = 'order' AND jsonb_typeof(t.q->'options') = 'array' THEN
                     E'\n   Put in order: ' || (SELECT string_agg(v, ' / ') FROM jsonb_array_elements_text(t.q->'options') AS o(v))
                   ELSE '' END),
           E'\n' ORDER BY t.n) AS txt
  FROM public.lesson_review_quizzes z
  CROSS JOIN LATERAL jsonb_array_elements(z.questions) WITH ORDINALITY AS t(q, n)
  GROUP BY z.homework_id
) q
WHERE h.id = q.homework_id AND coalesce(btrim(h.body), '') = '';
