-- Leaderboard: the two residuals of the re-check of 70cad9e0
-- (docs/evidence/REVIEW-leaderboard-recheck.md). Paste after
-- 20261117130000_leaderboard_review_fixes.sql. Idempotent; same signatures.
--
--   M-1  On a per-lesson board (term, all time) every figure a family sees is
--        per lesson, category tabs and category leaders included, and
--        categories are ranked per lesson there: a classmate's category
--        totals can no longer be added up and divided into a lesson count.
--   M-2  economy_process takes an advisory lock per child, class and month, so
--        two different requests approved at once cannot both pass the
--        "not below zero" check.

CREATE OR REPLACE FUNCTION public.leaderboard_compute(
  p_class uuid, p_from date, p_to date, p_basis text DEFAULT 'total')
RETURNS TABLE (
  student_id uuid, full_name text, avatar_url text,
  joined_on date, is_new boolean, lessons int, attended int,
  homework bigint, video bigint, class_points bigint, streak_points bigint,
  vocabulary bigint, reading bigint, total bigint, per_lesson numeric,
  gain_week bigint, streak_now int, all_time bigint, rank int,
  rank_homework int, rank_video int, rank_class int, rank_streak int,
  rank_vocabulary int, rank_reading int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  WITH d AS (
    SELECT public.hanoi_today() AS today,
           LEAST(p_to, public.hanoi_today()) AS upto),
  members AS (
    SELECT e.student_id
      FROM public.enrollments e, d
     WHERE e.class_id = p_class
       -- A child whose enrolment has not started yet is not on a board that
       -- reaches today.
       AND e.start_date <= LEAST(p_to, d.today)
       AND (e.end_date IS NULL OR e.end_date >= p_from)
       AND (p_to < d.today OR e.end_date IS NULL OR e.end_date >= d.today)
       -- An inactive child is on no board that reaches today (review N-2).
       AND (p_to < d.today OR EXISTS (SELECT 1 FROM public.students st0
                                       WHERE st0.id = e.student_id AND st0.is_active))
     GROUP BY e.student_id),
  joined AS (
    SELECT e.student_id, MIN(e.start_date) AS joined_on
      FROM public.enrollments e JOIN members m USING (student_id)
     WHERE e.class_id = p_class GROUP BY e.student_id),
  ledger AS (
    SELECT t.student_id,
           public.points_category(t.type, t.notes, h.submission_type = 'video') AS cat,
           t.points, t.date
      FROM public.point_transactions t
      LEFT JOIN public.homeworks h ON h.id = t.homework_id
      JOIN members m ON m.student_id = t.student_id
     WHERE t.class_id = p_class AND t.date BETWEEN p_from AND p_to),
  sums AS (
    SELECT l.student_id,
      SUM(l.points) FILTER (WHERE cat = 'homework')   AS homework,
      SUM(l.points) FILTER (WHERE cat = 'video')      AS video,
      SUM(l.points) FILTER (WHERE cat = 'class')      AS class_points,
      SUM(l.points) FILTER (WHERE cat = 'streak')     AS streak_points,
      SUM(l.points) FILTER (WHERE cat = 'vocabulary') AS vocabulary,
      SUM(l.points) FILTER (WHERE cat = 'reading')    AS reading,
      SUM(l.points) AS total,
      SUM(l.points) FILTER (WHERE l.date BETWEEN GREATEST(p_from, d.upto - 6) AND d.upto) AS gain_week
      FROM ledger l, d GROUP BY l.student_id),
  -- Held lessons of this class inside the range and inside one of the
  -- child's own enrolments: the lessons a child could have earned in.
  les AS (
    SELECT m.student_id,
           COUNT(DISTINCT s.id) AS lessons,
           COUNT(DISTINCT s.id) FILTER (WHERE a.status IN ('Present', 'Late')) AS attended
      FROM members m
      JOIN public.sessions s ON s.class_id = p_class AND s.status::text = 'Held'
      CROSS JOIN d
      LEFT JOIN public.attendance a ON a.session_id = s.id AND a.student_id = m.student_id
     WHERE s.date BETWEEN p_from AND d.upto
       AND EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = m.student_id AND e.class_id = p_class
                      AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date))
     GROUP BY m.student_id),
  everything AS (
    SELECT m.student_id, public.level_points(m.student_id, NULL) AS all_time FROM members m),
  rws AS (
    SELECT m.student_id, st.full_name, st.avatar_url, j.joined_on,
           -- 'New' = joined after the period began (meaningless for all time).
           (j.joined_on > p_from AND p_from > DATE '2000-01-01') AS is_new,
           COALESCE(ls.lessons, 0)::int AS lessons, COALESCE(ls.attended, 0)::int AS attended,
           COALESCE(s.homework, 0)::bigint AS homework, COALESCE(s.video, 0)::bigint AS video,
           COALESCE(s.class_points, 0)::bigint AS class_points,
           COALESCE(s.streak_points, 0)::bigint AS streak_points,
           COALESCE(s.vocabulary, 0)::bigint AS vocabulary, COALESCE(s.reading, 0)::bigint AS reading,
           COALESCE(s.total, 0)::bigint AS total,
           round(COALESCE(s.total, 0)::numeric / GREATEST(COALESCE(ls.lessons, 0), 1), 1) AS per_lesson,
           COALESCE(s.gain_week, 0)::bigint AS gain_week,
           COALESCE((SELECT k.consecutive_days FROM public.student_attendance_streaks k
                      WHERE k.student_id = m.student_id AND k.class_id = p_class LIMIT 1), 0)::int AS streak_now,
           COALESCE(ev.all_time, 0)::bigint AS all_time
      FROM members m
      JOIN public.students st ON st.id = m.student_id
      JOIN joined j ON j.student_id = m.student_id
      LEFT JOIN sums s ON s.student_id = m.student_id
      LEFT JOIN les ls ON ls.student_id = m.student_id
      LEFT JOIN everything ev ON ev.student_id = m.student_id)
  -- Standard competition ranking: equal scores share a rank and the next
  -- rank skips (two children on 115 are both 2nd; nobody is 3rd).
  -- Per lesson, a child needs 3 lessons before ranking ahead of the
  -- children who have them: one good first lesson should not top a term.
  -- No points, no rank (review M-4): at the start of a month nobody is 1st.
  -- On a per-lesson board a category is ranked per lesson too (re-check
  -- M-1), with the same 3-lesson rule.
  -- Positive scores sort first, so their ranks are 1..n as before.
  SELECT r.*,
    CASE WHEN (CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END) > 0 THEN
      (rank() OVER (ORDER BY
         (CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END > 0) DESC,
         CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
         CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END DESC))::int END,
    CASE WHEN r.homework > 0 THEN (rank() OVER (ORDER BY
      (r.homework > 0) DESC,
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.homework::numeric / GREATEST(r.lessons, 1) ELSE r.homework::numeric END DESC))::int END,
    CASE WHEN r.video > 0 THEN (rank() OVER (ORDER BY
      (r.video > 0) DESC,
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.video::numeric / GREATEST(r.lessons, 1) ELSE r.video::numeric END DESC))::int END,
    CASE WHEN r.class_points > 0 THEN (rank() OVER (ORDER BY
      (r.class_points > 0) DESC,
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.class_points::numeric / GREATEST(r.lessons, 1) ELSE r.class_points::numeric END DESC))::int END,
    CASE WHEN r.streak_points > 0 THEN (rank() OVER (ORDER BY
      (r.streak_points > 0) DESC,
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.streak_points::numeric / GREATEST(r.lessons, 1) ELSE r.streak_points::numeric END DESC))::int END,
    CASE WHEN r.vocabulary > 0 THEN (rank() OVER (ORDER BY
      (r.vocabulary > 0) DESC,
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.vocabulary::numeric / GREATEST(r.lessons, 1) ELSE r.vocabulary::numeric END DESC))::int END,
    CASE WHEN r.reading > 0 THEN (rank() OVER (ORDER BY
      (r.reading > 0) DESC,
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.reading::numeric / GREATEST(r.lessons, 1) ELSE r.reading::numeric END DESC))::int END
  FROM rws r
$f$;

CREATE OR REPLACE FUNCTION public.leaderboard_json(
  p_class uuid, p_period text DEFAULT 'month', p_anchor date DEFAULT NULL,
  p_viewers uuid[] DEFAULT '{}', p_full boolean DEFAULT false,
  p_category text DEFAULT NULL, p_teacher uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  WITH per AS (SELECT * FROM public.leaderboard_period(p_period, p_anchor)),
  cat AS (SELECT CASE WHEN p_category IN ('homework', 'video', 'class', 'streak', 'vocabulary', 'reading')
                      THEN p_category END AS k),
  tclasses AS (
    SELECT COALESCE(array_agg(c.id), '{}'::uuid[]) AS ids FROM public.classes c
     WHERE p_teacher IS NOT NULL AND public.is_teacher_of_class(p_teacher, c.id)),
  base AS (
    SELECT c.*, (c.student_id = ANY (COALESCE(p_viewers, '{}'))) AS is_self
      FROM per, public.leaderboard_compute(p_class, per.from_date, per.to_date, per.basis) c),
  r AS (
    SELECT b.*,
      CASE cat.k WHEN 'homework' THEN b.rank_homework WHEN 'video' THEN b.rank_video
                 WHEN 'class' THEN b.rank_class WHEN 'streak' THEN b.rank_streak
                 WHEN 'vocabulary' THEN b.rank_vocabulary WHEN 'reading' THEN b.rank_reading
                 ELSE b.rank END AS shown_rank,
      -- On a per-lesson board every figure is per lesson, category tabs
      -- included: a classmate's category totals would add up to their total,
      -- and total / per-lesson is their lesson count (re-check M-1).
      CASE WHEN cat.k IS NULL THEN CASE WHEN per.basis = 'per_lesson' THEN b.per_lesson ELSE b.total::numeric END
           ELSE CASE WHEN per.basis = 'per_lesson'
                  THEN round((CASE cat.k WHEN 'homework' THEN b.homework WHEN 'video' THEN b.video
                                WHEN 'class' THEN b.class_points WHEN 'streak' THEN b.streak_points
                                WHEN 'vocabulary' THEN b.vocabulary ELSE b.reading END)::numeric
                             / GREATEST(b.lessons, 1), 1)
                  ELSE (CASE cat.k WHEN 'homework' THEN b.homework WHEN 'video' THEN b.video
                          WHEN 'class' THEN b.class_points WHEN 'streak' THEN b.streak_points
                          WHEN 'vocabulary' THEN b.vocabulary ELSE b.reading END)::numeric END
      END AS shown_points,
      CASE WHEN p_teacher IS NULL THEN b.all_time
           ELSE public.level_points(b.student_id, (SELECT ids FROM tclasses)) END AS level_basis
      FROM base b, cat, per),
  centre AS (
    SELECT cc.student_id, cc.rank, count(*) OVER () AS of
      FROM per, public.leaderboard_centre_compute(per.from_date, per.to_date, per.basis) cc
     WHERE cardinality(COALESCE(p_viewers, '{}')) > 0),
  -- Category leaders: per lesson on a per-lesson board, like every figure there.
  champs AS (
    SELECT DISTINCT ON (k.key) k.ord,
           jsonb_build_object('category', k.key, 'student_id', r.student_id,
                              'name', r.full_name, 'points', k.shown) AS c
      FROM r
      CROSS JOIN LATERAL (VALUES
        (1, 'homework', r.homework), (2, 'video', r.video), (3, 'class', r.class_points),
        (4, 'streak', r.streak_points), (5, 'vocabulary', r.vocabulary), (6, 'reading', r.reading)
      ) AS k0(ord, key, pts)
      CROSS JOIN LATERAL (SELECT k0.ord, k0.key, k0.pts,
        CASE WHEN (SELECT basis FROM per) = 'per_lesson'
             THEN round(k0.pts::numeric / GREATEST(r.lessons, 1), 1) ELSE k0.pts::numeric END AS shown) k
     WHERE k.pts > 0
     ORDER BY k.key, k.shown DESC, r.full_name)
  SELECT jsonb_build_object(
    'period', (SELECT jsonb_build_object('kind', kind, 'from', from_date, 'to', to_date,
                                         'label', label, 'term_id', term_id, 'basis', basis) FROM per),
    'class_id', p_class,
    'category', (SELECT k FROM cat),
    'full', p_full,
    'rows', COALESCE((SELECT jsonb_agg(
        -- Every row: a name, an avatar, this board's points and rank.
        jsonb_build_object(
          'student_id', r.student_id, 'name', r.full_name, 'avatar_url', r.avatar_url,
          'rank', r.shown_rank, 'points', r.shown_points)
        -- On a points board the split of those points is points too. On a
        -- per-lesson board a total beside the average would give a
        -- classmate's lesson count, so it is kept to own rows.
        || CASE WHEN (SELECT basis FROM per) = 'total' OR p_full OR r.is_self THEN jsonb_build_object(
             'total', r.total,
             'categories', jsonb_build_object(
               'homework', r.homework, 'video', r.video, 'class', r.class_points,
               'streak', r.streak_points, 'vocabulary', r.vocabulary, 'reading', r.reading))
           ELSE '{}'::jsonb END
        -- Staff, and a family's own children: everything.
        || CASE WHEN p_full OR r.is_self THEN jsonb_build_object(
             'is_self', r.is_self, 'is_new', r.is_new, 'overall_rank', r.rank,
             'per_lesson', r.per_lesson, 'gain_week', r.gain_week,
             'category_ranks', jsonb_build_object(
               'homework', r.rank_homework, 'video', r.rank_video, 'class', r.rank_class,
               'streak', r.rank_streak, 'vocabulary', r.rank_vocabulary, 'reading', r.rank_reading),
             'all_time', r.level_basis,
             'level', public.points_level(r.level_basis),
             'lessons', r.lessons, 'attended', r.attended, 'streak_now', r.streak_now,
             'joined_on', r.joined_on)
           ELSE '{}'::jsonb END
        || CASE WHEN r.is_self THEN jsonb_build_object('centre', (
             SELECT jsonb_build_object('rank', ce.rank, 'of', ce.of) FROM centre ce
              WHERE ce.student_id = r.student_id))
           ELSE '{}'::jsonb END
        ORDER BY r.shown_rank NULLS LAST, r.full_name) FROM r), '[]'::jsonb),
    'champions', COALESCE((SELECT jsonb_agg(champs.c ORDER BY champs.ord) FROM champs), '[]'::jsonb),
    'climber', (SELECT jsonb_build_object('student_id', r.student_id, 'name', r.full_name, 'gain', r.gain_week)
                  FROM r WHERE r.gain_week > 0 ORDER BY r.gain_week DESC, r.full_name LIMIT 1),
    -- The streak that pays: lessons in a row attended (attendance-effects.ts).
    -- A family sees their own child's, never a classmate's attendance.
    'streak', (SELECT jsonb_build_object('student_id', r.student_id, 'name', r.full_name, 'lessons', r.streak_now)
                 FROM r WHERE r.streak_now >= 2 AND (p_full OR r.is_self)
                ORDER BY r.streak_now DESC, r.full_name LIMIT 1))
$f$;

CREATE OR REPLACE FUNCTION public.economy_process(p_tx uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  tx record;
  today date := public.hanoi_today();
  month_total bigint;
  new_cash int;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status must be approved or rejected' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO tx FROM public.economy_transactions WHERE id = p_tx FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such request' USING ERRCODE = 'P0002';
  END IF;
  IF auth.uid() IS NULL
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.is_teacher_of_class(auth.uid(), tx.class_id)) THEN
    RAISE EXCEPTION 'Not allowed to handle this request' USING ERRCODE = '42501';
  END IF;
  IF tx.status::text <> 'pending' THEN
    RAISE EXCEPTION 'This request was already handled' USING ERRCODE = 'P0001';
  END IF;
  -- Two different requests of one child approved at the same moment would
  -- each lock only their own row and both pass the month check (re-check
  -- M-2): approvals for one child, class and month take turns.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(tx.student_id::text || '/' || tx.class_id::text || '/' || to_char(today, 'YYYY-MM'), 0));

  UPDATE public.economy_transactions
     SET status = p_status::public.economy_tx_status, processed_by = auth.uid(), updated_at = now()
   WHERE id = p_tx;

  IF p_status = 'approved' THEN
    IF tx.type::text = 'convert_to_cash' AND tx.points_impact < 0 THEN
      SELECT COALESCE(SUM(sp.total_points), 0) INTO month_total FROM public.student_points sp
       WHERE sp.student_id = tx.student_id AND sp.class_id = tx.class_id AND sp.month = to_char(today, 'YYYY-MM');
      IF month_total + tx.points_impact < 0 THEN
        RAISE EXCEPTION 'Not enough points this month (has %, needs %)', month_total, -tx.points_impact
          USING ERRCODE = 'P0001';
      END IF;
      INSERT INTO public.point_transactions (student_id, class_id, type, points, date, month, notes, created_by)
      VALUES (tx.student_id, tx.class_id, 'adjustment', tx.points_impact, today, to_char(today, 'YYYY-MM'),
              'Class cash: points changed into cash', auth.uid());
    ELSIF tx.type::text = 'deposit_cash' AND tx.points_impact > 0 THEN
      INSERT INTO public.point_transactions (student_id, class_id, type, points, date, month, notes, created_by)
      VALUES (tx.student_id, tx.class_id, 'adjustment', tx.points_impact, today, to_char(today, 'YYYY-MM'),
              'Class cash: cash changed back into points', auth.uid());
    END IF;
    UPDATE public.students
       SET cash_on_hand = GREATEST(0, COALESCE(cash_on_hand, 0) + COALESCE(tx.cash_impact, 0))
     WHERE id = tx.student_id
     RETURNING cash_on_hand INTO new_cash;
  END IF;

  RETURN jsonb_build_object('status', p_status, 'cash_on_hand', new_cash);
END $f$;

REVOKE ALL ON FUNCTION public.leaderboard_compute(uuid, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_compute(uuid, date, date, text) TO service_role;
REVOKE ALL ON FUNCTION public.leaderboard_json(uuid, text, date, uuid[], boolean, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_json(uuid, text, date, uuid[], boolean, text, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.economy_process(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.economy_process(uuid, text) TO authenticated, service_role;
