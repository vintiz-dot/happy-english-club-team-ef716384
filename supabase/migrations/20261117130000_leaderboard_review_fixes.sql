-- Leaderboard: fixes from the independent review of 6b53a6b5
-- (docs/evidence/LEADERBOARD-audit.md, section 8). Paste after
-- 20261117120000_leaderboard_engine.sql. Idempotent.
--
--   M-1  A family (and the projector) gets a classmate as a name, an avatar,
--        this board's points and rank - no level, per-lesson figure, "new"
--        flag, tie flag or category ranks. A category tab is ranked on the
--        server (p_category), so the screen never ranks.
--   M-2  economy_process: approving a class-cash request is one transaction,
--        claimed by id (a second approval or a retry is refused), refuses to
--        take a month below zero, and class-cash moves never change a level.
--   M-3  A teacher's view of a child's level and all-time points counts only
--        the classes that teacher teaches; a teacher sees a child's points
--        only while the child is in one of their classes.
--   M-4  No points, no rank: at the start of a month nobody is "1st".
--   N-2  The TV's top lists skip inactive children and classes before the
--        limit is applied.
--   N-3  school_terms: no TRUNCATE/REFERENCES/TRIGGER for app roles, nothing
--        for anon.
--   N-4  student_points is written only by the ledger trigger (and the
--        service role): teachers keep SELECT, lose direct writes.

-- The points a level is worked out on: everything earned, minus class-cash
-- moves (spending points on class cash must not lower a level; owner: a
-- level never goes down). p_classes NULL = every class.
CREATE OR REPLACE FUNCTION public.level_points(p_student uuid, p_classes uuid[] DEFAULT NULL)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT (SELECT COALESCE(SUM(sp.total_points), 0) FROM public.student_points sp
           WHERE sp.student_id = p_student AND (p_classes IS NULL OR sp.class_id = ANY (p_classes)))
       - (SELECT COALESCE(SUM(t.points), 0) FROM public.point_transactions t
           WHERE t.student_id = p_student AND t.notes LIKE 'Class cash:%'
             AND (p_classes IS NULL OR t.class_id = ANY (p_classes)))
$f$;
REVOKE ALL ON FUNCTION public.level_points(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.level_points(uuid, uuid[]) TO service_role;

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
  -- Positive scores sort first, so their ranks are 1..n as before.
  SELECT r.*,
    CASE WHEN (CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END) > 0 THEN
      (rank() OVER (ORDER BY
         (CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END > 0) DESC,
         CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
         CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END DESC))::int END,
    CASE WHEN r.homework > 0 THEN (rank() OVER (ORDER BY r.homework DESC))::int END,
    CASE WHEN r.video > 0 THEN (rank() OVER (ORDER BY r.video DESC))::int END,
    CASE WHEN r.class_points > 0 THEN (rank() OVER (ORDER BY r.class_points DESC))::int END,
    CASE WHEN r.streak_points > 0 THEN (rank() OVER (ORDER BY r.streak_points DESC))::int END,
    CASE WHEN r.vocabulary > 0 THEN (rank() OVER (ORDER BY r.vocabulary DESC))::int END,
    CASE WHEN r.reading > 0 THEN (rank() OVER (ORDER BY r.reading DESC))::int END
  FROM rws r
$f$;

CREATE OR REPLACE FUNCTION public.leaderboard_centre_compute(
  p_from date, p_to date, p_basis text DEFAULT 'total')
RETURNS TABLE (student_id uuid, full_name text, avatar_url text, class_names text,
               total bigint, lessons int, per_lesson numeric, rank int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  WITH d AS (SELECT public.hanoi_today() AS today, LEAST(p_to, public.hanoi_today()) AS upto),
  m AS (
    SELECT e.student_id, e.class_id
      FROM public.enrollments e, d
     WHERE e.start_date <= LEAST(p_to, d.today) AND (e.end_date IS NULL OR e.end_date >= p_from)
       AND (p_to < d.today OR e.end_date IS NULL OR e.end_date >= d.today)
       AND (p_to < d.today OR EXISTS (SELECT 1 FROM public.students st0
                                       WHERE st0.id = e.student_id AND st0.is_active)
                           AND EXISTS (SELECT 1 FROM public.classes cl0
                                        WHERE cl0.id = e.class_id AND cl0.is_active))
     GROUP BY e.student_id, e.class_id),
  pts AS (
    SELECT t.student_id, SUM(t.points) AS total
      FROM public.point_transactions t JOIN m ON m.student_id = t.student_id AND m.class_id = t.class_id
     WHERE t.date BETWEEN p_from AND p_to GROUP BY t.student_id),
  les AS (
    SELECT m.student_id, COUNT(DISTINCT s.id) AS lessons
      FROM m JOIN public.sessions s ON s.class_id = m.class_id AND s.status::text = 'Held'
      CROSS JOIN d
     WHERE s.date BETWEEN p_from AND d.upto
       AND EXISTS (SELECT 1 FROM public.enrollments e
                    WHERE e.student_id = m.student_id AND e.class_id = m.class_id
                      AND e.start_date <= s.date AND (e.end_date IS NULL OR e.end_date >= s.date))
     GROUP BY m.student_id),
  r AS (
    SELECT st.id AS student_id, st.full_name, st.avatar_url,
           (SELECT string_agg(DISTINCT c.name, ', ') FROM m m2 JOIN public.classes c ON c.id = m2.class_id
             WHERE m2.student_id = st.id) AS class_names,
           COALESCE(p.total, 0)::bigint AS total,
           COALESCE(l.lessons, 0)::int AS lessons,
           round(COALESCE(p.total, 0)::numeric / GREATEST(COALESCE(l.lessons, 0), 1), 1) AS per_lesson
      FROM (SELECT DISTINCT student_id FROM m) x
      JOIN public.students st ON st.id = x.student_id
      LEFT JOIN pts p ON p.student_id = x.student_id
      LEFT JOIN les l ON l.student_id = x.student_id)
  -- No points, no rank (review M-4).
  SELECT r.*,
    CASE WHEN (CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END) > 0 THEN
      (rank() OVER (ORDER BY
        (CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END > 0) DESC,
        CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
        CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END DESC))::int END
    FROM r
$f$;

CREATE OR REPLACE FUNCTION public.leaderboard_centre(p_period text DEFAULT 'month', p_anchor date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE per record; out_rows jsonb;
BEGIN
  -- Children of every class: admins only. A teacher's scope is their classes.
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an admin can see the whole centre' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO per FROM public.leaderboard_period(p_period, p_anchor);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'student_id', c.student_id, 'name', c.full_name, 'avatar_url', c.avatar_url,
           'class_names', c.class_names, 'total', c.total, 'lessons', c.lessons,
           'per_lesson', c.per_lesson, 'rank', c.rank) ORDER BY c.rank NULLS LAST, c.full_name), '[]'::jsonb)
    INTO out_rows FROM public.leaderboard_centre_compute(per.from_date, per.to_date, per.basis) c;
  RETURN jsonb_build_object(
    'period', jsonb_build_object('kind', per.kind, 'from', per.from_date, 'to', per.to_date,
                                 'label', per.label, 'term_id', per.term_id, 'basis', per.basis),
    'rows', out_rows);
END $f$;

-- ------------------------------------------------------------------ M-1, M-3
-- p_category: rank the board on one tab (homework, video, class, streak,
-- vocabulary, reading); every row's `rank` and `points` are then that tab's.
-- p_teacher: the staff member asking, when not an admin: their view of a
-- child's level counts only their own classes.
DROP FUNCTION IF EXISTS public.leaderboard_json(uuid, text, date, uuid[], boolean);
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
      CASE cat.k WHEN 'homework' THEN b.homework::numeric WHEN 'video' THEN b.video::numeric
                 WHEN 'class' THEN b.class_points::numeric WHEN 'streak' THEN b.streak_points::numeric
                 WHEN 'vocabulary' THEN b.vocabulary::numeric WHEN 'reading' THEN b.reading::numeric
                 ELSE CASE WHEN per.basis = 'per_lesson' THEN b.per_lesson ELSE b.total::numeric END
      END AS shown_points,
      CASE WHEN p_teacher IS NULL THEN b.all_time
           ELSE public.level_points(b.student_id, (SELECT ids FROM tclasses)) END AS level_basis
      FROM base b, cat, per),
  centre AS (
    SELECT cc.student_id, cc.rank, count(*) OVER () AS of
      FROM per, public.leaderboard_centre_compute(per.from_date, per.to_date, per.basis) cc
     WHERE cardinality(COALESCE(p_viewers, '{}')) > 0),
  champs AS (
    SELECT DISTINCT ON (k.key) k.ord,
           jsonb_build_object('category', k.key, 'student_id', r.student_id,
                              'name', r.full_name, 'points', k.pts) AS c
      FROM r
      CROSS JOIN LATERAL (VALUES
        (1, 'homework', r.homework), (2, 'video', r.video), (3, 'class', r.class_points),
        (4, 'streak', r.streak_points), (5, 'vocabulary', r.vocabulary), (6, 'reading', r.reading)
      ) AS k(ord, key, pts)
     WHERE k.pts > 0
     ORDER BY k.key, k.pts DESC, r.full_name)
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

DROP FUNCTION IF EXISTS public.leaderboard_board(uuid, text, date, boolean);
CREATE OR REPLACE FUNCTION public.leaderboard_board(
  p_class uuid, p_period text DEFAULT 'month', p_anchor date DEFAULT NULL,
  p_wall boolean DEFAULT false, p_category text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not allowed to see this class board' USING ERRCODE = '42501';
  END IF;
  is_admin := public.has_role(auth.uid(), 'admin');
  IF NOT (is_admin OR public.is_teacher_of_class(auth.uid(), p_class)) THEN
    RAISE EXCEPTION 'Not allowed to see this class board' USING ERRCODE = '42501';
  END IF;
  RETURN public.leaderboard_json(p_class, p_period, p_anchor, '{}'::uuid[],
    NOT COALESCE(p_wall, false), p_category, CASE WHEN is_admin THEN NULL ELSE auth.uid() END);
END $f$;

-- ------------------------------------------------------------------- N-2
CREATE OR REPLACE FUNCTION public.leaderboard_tv_feed(p_top int DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  cur record; prev record;
  centre jsonb; per_class jsonb; champs jsonb;
BEGIN
  SELECT * INTO cur FROM public.leaderboard_period('month', public.hanoi_today());
  SELECT * INTO prev FROM public.leaderboard_period('month', (cur.from_date - 1));

  -- Only children on today's register (active, in an active class) before
  -- the limit, so the TV's list is not short when one has left.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', c.student_id, 'points', c.total, 'rank', c.rank)
           ORDER BY c.rank, c.full_name), '[]'::jsonb)
    INTO centre FROM (
      SELECT x.* FROM public.leaderboard_centre_compute(cur.from_date, cur.to_date, 'total') x
        JOIN public.students s ON s.id = x.student_id AND s.is_active
       WHERE x.total > 0
         AND EXISTS (SELECT 1 FROM public.enrollments e JOIN public.classes cl ON cl.id = e.class_id AND cl.is_active
                      WHERE e.student_id = x.student_id AND e.start_date <= cur.to_date
                        AND (e.end_date IS NULL OR e.end_date >= public.hanoi_today()))
       ORDER BY x.rank, x.full_name LIMIT p_top) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('class_id', k.id, 'rows', k.rows)), '[]'::jsonb) INTO per_class
    FROM (SELECT cl.id,
                 (SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', r.student_id, 'points', r.total, 'rank', r.rank)
                           ORDER BY r.rank, r.full_name), '[]'::jsonb)
                    FROM (SELECT x.* FROM public.leaderboard_compute(cl.id, cur.from_date, cur.to_date, 'total') x
                            JOIN public.students s ON s.id = x.student_id AND s.is_active
                           WHERE x.total > 0 ORDER BY x.rank, x.full_name LIMIT p_top) r) AS rows
            FROM public.classes cl WHERE cl.is_active) k;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('class_id', w.class_id, 'student_id', w.student_id, 'points', w.total)), '[]'::jsonb)
    INTO champs
    FROM (SELECT cl.id AS class_id, r.student_id, r.total
            FROM public.classes cl
            CROSS JOIN LATERAL public.leaderboard_compute(cl.id, prev.from_date, prev.to_date, 'total') r
            JOIN public.students s ON s.id = r.student_id AND s.is_active
           WHERE cl.is_active AND r.rank = 1 AND r.total > 0) w;

  RETURN jsonb_build_object('month', to_char(cur.from_date, 'YYYY-MM'),
    'champions_month', to_char(prev.from_date, 'YYYY-MM'),
    'centre', centre, 'classes', per_class, 'champions', champs);
END $f$;

-- ------------------------------------------------------------------- M-3
-- A teacher sees a child's points only while the child is in one of their
-- classes (it was: any enrolment ever).
CREATE OR REPLACE FUNCTION public.can_see_student_points(p_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT auth.uid() IS NOT NULL AND (
       public.has_role(auth.uid(), 'admin')
    OR public.can_view_student(p_student, auth.uid())
    OR public.is_family_student(p_student, auth.uid())
    OR EXISTS (SELECT 1 FROM public.enrollments e
                WHERE e.student_id = p_student
                  AND (e.end_date IS NULL OR e.end_date >= public.hanoi_today())
                  AND public.is_teacher_of_class(auth.uid(), e.class_id)))
$f$;

-- All-time points, level and per-class figures of each child the caller may
-- see. For a teacher, all of them over the classes the teacher teaches.
CREATE OR REPLACE FUNCTION public.student_points_summary(p_students uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT COALESCE(jsonb_object_agg(s.id::text, jsonb_build_object(
           'all_time', w.lp,
           'month', COALESCE(t.month, 0),
           'level', public.points_level(w.lp),
           'classes', COALESCE(t.classes, '[]'::jsonb))), '{}'::jsonb)
    FROM public.students s
    CROSS JOIN LATERAL (
      SELECT CASE WHEN public.has_role(auth.uid(), 'admin') OR public.can_view_student(s.id, auth.uid())
                       OR public.is_family_student(s.id, auth.uid())
                  THEN NULL
                  ELSE (SELECT COALESCE(array_agg(DISTINCT sp.class_id), '{}'::uuid[])
                          FROM public.student_points sp
                         WHERE sp.student_id = s.id AND public.is_teacher_of_class(auth.uid(), sp.class_id))
             END AS ids
    ) v
    CROSS JOIN LATERAL (SELECT public.level_points(s.id, v.ids) AS lp) w
    LEFT JOIN LATERAL (
      SELECT SUM(x.month)::bigint AS month,
             jsonb_agg(jsonb_build_object('class_id', x.class_id, 'all_time', x.all_time, 'month', x.month)) AS classes
        FROM (SELECT sp.class_id, SUM(sp.total_points)::bigint AS all_time,
                     SUM(sp.total_points) FILTER (WHERE sp.month = to_char(public.hanoi_today(), 'YYYY-MM'))::bigint AS month
                FROM public.student_points sp
               WHERE sp.student_id = s.id AND (v.ids IS NULL OR sp.class_id = ANY (v.ids))
               GROUP BY sp.class_id) x
    ) t ON true
   WHERE s.id = ANY (p_students) AND public.can_see_student_points(s.id)
$f$;

-- ------------------------------------------------------------------- M-2
-- Approve or reject a class-cash request: one transaction, keyed by the
-- request. A request already handled is refused (two teachers, a double
-- click, a retry after a dropped connection). Spending points may not take
-- the child's month in that class below zero. The points move is a ledger
-- row marked 'Class cash:', which level_points leaves out of the level.
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

-- ------------------------------------------------------------------- N-4
-- The ledger is the one way points change: student_points is kept by the
-- trigger (SECURITY DEFINER) and the admin reset (service role).
DROP POLICY IF EXISTS "Teachers can manage points for their classes" ON public.student_points;
DROP POLICY IF EXISTS "Teachers can view points for their classes" ON public.student_points;
CREATE POLICY "Teachers can view points for their classes" ON public.student_points
  FOR SELECT TO authenticated USING (public.is_teacher_of_class(auth.uid(), class_id));

-- ------------------------------------------------------------------- N-3
REVOKE ALL ON public.school_terms FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.school_terms FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.points_category(text, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.points_level(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leaderboard_period(text, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.hanoi_today() FROM PUBLIC, anon;

-- ---------------------------------------------------------------- grants
REVOKE ALL ON FUNCTION public.leaderboard_compute(uuid, date, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leaderboard_centre_compute(date, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leaderboard_json(uuid, text, date, uuid[], boolean, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leaderboard_tv_feed(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_compute(uuid, date, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_centre_compute(date, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_json(uuid, text, date, uuid[], boolean, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_tv_feed(int) TO service_role;
REVOKE ALL ON FUNCTION public.leaderboard_board(uuid, text, date, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_board(uuid, text, date, boolean, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.leaderboard_centre(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_centre(text, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.student_points_summary(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_points_summary(uuid[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_see_student_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_student_points(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.economy_process(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.economy_process(uuid, text) TO authenticated, service_role;
