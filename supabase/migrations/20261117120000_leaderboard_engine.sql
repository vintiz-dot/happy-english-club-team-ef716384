-- The leaderboard, worked out in ONE place (docs/evidence/LEADERBOARD-audit.md).
--
-- Until now four pieces of browser and edge code each decided who was on a
-- class board, in what order and on what level, and they disagreed: a tie
-- was 1st-and-1st on the teacher's screen and 1st-and-2nd on the child's,
-- the level was worked out three ways, and the "streak" on the display
-- boards was not the streak that pays. Every screen now renders what these
-- functions return.
--
--   points_category      which tab a ledger row belongs to (one rule)
--   points_level         the level for a number of points (one rule)
--   leaderboard_period   week / month / term / all time, in Hanoi dates
--   leaderboard_compute  the rows of one class for a date range
--   leaderboard_json     rows + champions + climber + streak, as the screens
--                        take them; trims what a family may see of classmates
--   leaderboard_board    the staff entry point (admin or teacher of the class)
--   leaderboard_centre   the whole centre, admin only
--   leaderboard_tv_feed  what the reception TV shows (service role only)
--   student_points_summary / _history   a child's own figures and awards
--   points_manual_changes               admin audit of awards made by people
--
-- The numbers are the ledger (`point_transactions`); `student_points` is the
-- trigger-kept monthly total of the same rows and is used only for a child's
-- all-time sum. Categories split the four stored buckets further but always
-- add up to the same total: video homework is inside `homework`, streak
-- bonuses inside `participation`.
--
-- Privacy (S1): a family reaches classmates only through `class-leaderboard`,
-- which calls leaderboard_json with p_full = false. Then a classmate is a
-- name, an avatar and points (totals, categories, points per lesson, rank,
-- level); lessons, attendance and the streak length stay on the family's
-- own child. leaderboard_json is executable by service_role only.
--
-- Paste order: after 20261117111000 (the latest before it). Idempotent.

-- ------------------------------------------------------------------ terms
CREATE TABLE IF NOT EXISTS public.school_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  CONSTRAINT school_terms_name_len CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  CONSTRAINT school_terms_dates CHECK (ends_on >= starts_on AND ends_on - starts_on <= 400)
);

-- Terms may not overlap: "the term containing this date" must be one term.
CREATE OR REPLACE FUNCTION public.school_terms_no_overlap()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $f$
BEGIN
  IF EXISTS (SELECT 1 FROM public.school_terms t
              WHERE t.id <> NEW.id
                AND t.starts_on <= NEW.ends_on AND t.ends_on >= NEW.starts_on) THEN
    RAISE EXCEPTION 'This term overlaps another term' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS school_terms_no_overlap ON public.school_terms;
CREATE TRIGGER school_terms_no_overlap BEFORE INSERT OR UPDATE ON public.school_terms
  FOR EACH ROW EXECUTE FUNCTION public.school_terms_no_overlap();

ALTER TABLE public.school_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_terms_read ON public.school_terms;
-- A term is a name and two dates: nothing about any child.
CREATE POLICY school_terms_read ON public.school_terms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS school_terms_admin ON public.school_terms;
CREATE POLICY school_terms_admin ON public.school_terms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_terms TO authenticated;
GRANT ALL ON public.school_terms TO service_role;

-- ------------------------------------------------------------ the two rules
CREATE OR REPLACE FUNCTION public.points_category(p_type text, p_notes text, p_video boolean)
RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE
    WHEN p_type = 'homework' AND COALESCE(p_video, false) THEN 'video'
    WHEN p_type = 'homework' THEN 'homework'
    WHEN p_type = 'reading_theory' THEN 'reading'
    WHEN p_type = 'vocabulary_quiz' THEN 'vocabulary'
    -- STREAK_BONUS_NOTE_PREFIX in supabase/functions/_lib/attendance-effects.ts
    WHEN p_type = 'participation' AND p_notes LIKE 'Attendance streak bonus%' THEN 'streak'
    ELSE 'class'  -- participation, adjustment, correction, early_submission
  END
$f$;

-- Level n starts at 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500,
-- 5500 points (what the student dashboard already showed), then one level
-- per 1,000 points with no cap. Owner's ruling 17 Nov 2026: a level counts
-- every point ever earned, in every class, and never goes down for a new month.
CREATE OR REPLACE FUNCTION public.points_level(p_points bigint)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $f$
DECLARE
  steps int[] := ARRAY[0,100,300,600,1000,1500,2100,2800,3600,4500,5500];
  p bigint := GREATEST(COALESCE(p_points, 0), 0);
  lvl int := 1; lo bigint := 0; hi bigint;
BEGIN
  IF p >= 5500 THEN
    lvl := 11 + ((p - 5500) / 1000)::int;
    lo := 5500 + (lvl - 11)::bigint * 1000;
    hi := lo + 1000;
  ELSE
    FOR i IN 2..array_length(steps, 1) LOOP
      EXIT WHEN p < steps[i];
      lvl := i;
    END LOOP;
    lo := steps[lvl];
    hi := steps[lvl + 1];
  END IF;
  RETURN jsonb_build_object(
    'level', lvl, 'from', lo, 'next', hi,
    'progress', LEAST(100, GREATEST(0, floor(100.0 * (p - lo) / (hi - lo))))::int,
    'to_next', hi - p);
END $f$;

-- ---------------------------------------------------------------- periods
CREATE OR REPLACE FUNCTION public.hanoi_today()
RETURNS date LANGUAGE sql STABLE AS $f$ SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date $f$;

CREATE OR REPLACE FUNCTION public.leaderboard_period(p_kind text, p_anchor date DEFAULT NULL)
RETURNS TABLE (kind text, from_date date, to_date date, label text, term_id uuid, basis text)
LANGUAGE plpgsql STABLE SET search_path = public AS $f$
DECLARE
  a date := COALESCE(p_anchor, public.hanoi_today());
  t record;
BEGIN
  IF p_kind = 'week' THEN
    -- Monday to Sunday, as the school week.
    RETURN QUERY SELECT 'week'::text, date_trunc('week', a)::date, (date_trunc('week', a)::date + 6),
      'Week of ' || to_char(date_trunc('week', a), 'FMDD Mon YYYY'), NULL::uuid, 'total'::text;
  ELSIF p_kind = 'month' THEN
    RETURN QUERY SELECT 'month'::text, date_trunc('month', a)::date,
      (date_trunc('month', a) + interval '1 month - 1 day')::date,
      to_char(a, 'FMMonth YYYY'), NULL::uuid, 'total'::text;
  ELSIF p_kind = 'term' THEN
    SELECT * INTO t FROM public.school_terms s
     WHERE a BETWEEN s.starts_on AND s.ends_on ORDER BY s.starts_on DESC LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No term covers %', a USING ERRCODE = 'P0002';
    END IF;
    -- Children who joined part-way are ranked on points per lesson, so a
    -- late joiner is not last for the rest of the term (owner, 17 Nov 2026).
    RETURN QUERY SELECT 'term'::text, t.starts_on, t.ends_on, t.name, t.id, 'per_lesson'::text;
  ELSIF p_kind = 'all' THEN
    RETURN QUERY SELECT 'all'::text, DATE '2000-01-01', DATE '2999-12-31', 'All time'::text,
      NULL::uuid, 'per_lesson'::text;
  ELSE
    RAISE EXCEPTION 'Unknown period %', p_kind USING ERRCODE = '22023';
  END IF;
END $f$;

-- ------------------------------------------------------------- the engine
-- Who is on a class's board for a range: anyone enrolled in the class at
-- some point inside it - except that a range reaching today shows only the
-- children still in the class (a child who left is on the boards of the
-- months they were there, not on this week's).
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
    SELECT sp.student_id, SUM(sp.total_points)::bigint AS all_time
      FROM public.student_points sp JOIN members m USING (student_id)
     GROUP BY sp.student_id),
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
  SELECT r.*,
    (rank() OVER (ORDER BY
       CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
       CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END DESC))::int,
    (rank() OVER (ORDER BY r.homework DESC))::int,
    (rank() OVER (ORDER BY r.video DESC))::int,
    (rank() OVER (ORDER BY r.class_points DESC))::int,
    (rank() OVER (ORDER BY r.streak_points DESC))::int,
    (rank() OVER (ORDER BY r.vocabulary DESC))::int,
    (rank() OVER (ORDER BY r.reading DESC))::int
  FROM rws r
$f$;

-- The whole centre: every child's points across all their classes. A range
-- reaching today counts only children with a current enrolment.
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
  SELECT r.*, (rank() OVER (ORDER BY
      CASE WHEN p_basis = 'per_lesson' THEN (r.lessons >= 3)::int ELSE 0 END DESC,
      CASE WHEN p_basis = 'per_lesson' THEN r.per_lesson ELSE r.total END DESC))::int
    FROM r
$f$;

-- What the screens take. p_viewers: the children the caller is (or is the
-- family of) - marked `is_self`, and the only rows a family sees in full.
-- p_full: staff and the projector see every field; a family sees
-- classmates as name, avatar and points only.
CREATE OR REPLACE FUNCTION public.leaderboard_json(
  p_class uuid, p_period text DEFAULT 'month', p_anchor date DEFAULT NULL,
  p_viewers uuid[] DEFAULT '{}', p_full boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  WITH per AS (SELECT * FROM public.leaderboard_period(p_period, p_anchor)),
  r AS (
    SELECT c.*, (c.student_id = ANY (COALESCE(p_viewers, '{}'))) AS is_self,
           count(*) OVER (PARTITION BY c.rank) AS same_rank
      FROM per, public.leaderboard_compute(p_class, per.from_date, per.to_date, per.basis) c),
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
    'full', p_full,
    'rows', COALESCE((SELECT jsonb_agg(
        jsonb_build_object(
          'student_id', r.student_id, 'name', r.full_name, 'avatar_url', r.avatar_url,
          'rank', r.rank, 'tied', r.same_rank > 1,
          'is_new', r.is_new, 'is_self', r.is_self,
          'total', r.total, 'per_lesson', r.per_lesson, 'gain_week', r.gain_week,
          'categories', jsonb_build_object(
            'homework', r.homework, 'video', r.video, 'class', r.class_points,
            'streak', r.streak_points, 'vocabulary', r.vocabulary, 'reading', r.reading),
          'category_ranks', jsonb_build_object(
            'homework', r.rank_homework, 'video', r.rank_video, 'class', r.rank_class,
            'streak', r.rank_streak, 'vocabulary', r.rank_vocabulary, 'reading', r.rank_reading),
          'level', public.points_level(r.all_time))
        -- A classmate's level, not their points from other classes.
        || CASE WHEN p_full OR r.is_self THEN jsonb_build_object(
             'all_time', r.all_time,
             'lessons', r.lessons, 'attended', r.attended, 'streak_now', r.streak_now,
             'joined_on', r.joined_on)
           ELSE '{}'::jsonb END
        || CASE WHEN r.is_self THEN jsonb_build_object('centre', (
             SELECT jsonb_build_object('rank', ce.rank, 'of', ce.of) FROM centre ce
              WHERE ce.student_id = r.student_id))
           ELSE '{}'::jsonb END
        ORDER BY r.rank, r.full_name) FROM r), '[]'::jsonb),
    'champions', COALESCE((SELECT jsonb_agg(champs.c ORDER BY champs.ord) FROM champs), '[]'::jsonb),
    'climber', (SELECT jsonb_build_object('student_id', r.student_id, 'name', r.full_name, 'gain', r.gain_week)
                  FROM r WHERE r.gain_week > 0 ORDER BY r.gain_week DESC, r.full_name LIMIT 1),
    -- The streak that pays: lessons in a row attended (attendance-effects.ts).
    -- A family sees their own child's, never a classmate's attendance.
    'streak', (SELECT jsonb_build_object('student_id', r.student_id, 'name', r.full_name, 'lessons', r.streak_now)
                 FROM r WHERE r.streak_now >= 2 AND (p_full OR r.is_self)
                ORDER BY r.streak_now DESC, r.full_name LIMIT 1))
$f$;

-- ------------------------------------------------------- the entry points
-- p_wall: the projector / class window, which the whole class reads. It
-- gets what a family gets of classmates (no lessons, attendance or streak
-- length of anyone), even though a teacher opened it.
CREATE OR REPLACE FUNCTION public.leaderboard_board(
  p_class uuid, p_period text DEFAULT 'month', p_anchor date DEFAULT NULL, p_wall boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.is_teacher_of_class(auth.uid(), p_class)) THEN
    RAISE EXCEPTION 'Not allowed to see this class board' USING ERRCODE = '42501';
  END IF;
  RETURN public.leaderboard_json(p_class, p_period, p_anchor, '{}'::uuid[], NOT COALESCE(p_wall, false));
END $f$;

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
           'per_lesson', c.per_lesson, 'rank', c.rank) ORDER BY c.rank, c.full_name), '[]'::jsonb)
    INTO out_rows FROM public.leaderboard_centre_compute(per.from_date, per.to_date, per.basis) c;
  RETURN jsonb_build_object(
    'period', jsonb_build_object('kind', per.kind, 'from', per.from_date, 'to', per.to_date,
                                 'label', per.label, 'term_id', per.term_id, 'basis', per.basis),
    'rows', out_rows);
END $f$;

-- The reception TV (reception-feed, service role). Same rows as the class
-- boards; names, photos, class and points only.
CREATE OR REPLACE FUNCTION public.leaderboard_tv_feed(p_top int DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE
  cur record; prev record;
  centre jsonb; per_class jsonb; champs jsonb;
BEGIN
  SELECT * INTO cur FROM public.leaderboard_period('month', public.hanoi_today());
  SELECT * INTO prev FROM public.leaderboard_period('month', (cur.from_date - 1));

  SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', c.student_id, 'points', c.total, 'rank', c.rank)
           ORDER BY c.rank, c.full_name), '[]'::jsonb)
    INTO centre FROM (SELECT * FROM public.leaderboard_centre_compute(cur.from_date, cur.to_date, 'total')
                       WHERE total > 0 ORDER BY rank, full_name LIMIT p_top) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('class_id', k.id, 'rows', k.rows)), '[]'::jsonb) INTO per_class
    FROM (SELECT cl.id,
                 (SELECT COALESCE(jsonb_agg(jsonb_build_object('student_id', r.student_id, 'points', r.total, 'rank', r.rank)
                           ORDER BY r.rank, r.full_name), '[]'::jsonb)
                    FROM (SELECT * FROM public.leaderboard_compute(cl.id, cur.from_date, cur.to_date, 'total')
                           WHERE total > 0 ORDER BY rank, full_name LIMIT p_top) r) AS rows
            FROM public.classes cl WHERE cl.is_active) k;

  -- Last month's winners, ties included, worked out from the ledger: this
  -- read monthly_leaders, which nothing ever wrote.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('class_id', w.class_id, 'student_id', w.student_id, 'points', w.total)), '[]'::jsonb)
    INTO champs
    FROM (SELECT cl.id AS class_id, r.student_id, r.total
            FROM public.classes cl
            CROSS JOIN LATERAL public.leaderboard_compute(cl.id, prev.from_date, prev.to_date, 'total') r
           WHERE cl.is_active AND r.rank = 1 AND r.total > 0) w;

  RETURN jsonb_build_object('month', to_char(cur.from_date, 'YYYY-MM'),
    'champions_month', to_char(prev.from_date, 'YYYY-MM'),
    'centre', centre, 'classes', per_class, 'champions', champs);
END $f$;

-- ------------------------------------------------------- one child's own
CREATE OR REPLACE FUNCTION public.can_see_student_points(p_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT auth.uid() IS NOT NULL AND (
       public.has_role(auth.uid(), 'admin')
    OR public.can_view_student(p_student, auth.uid())
    OR public.is_family_student(p_student, auth.uid())
    OR EXISTS (SELECT 1 FROM public.enrollments e
                WHERE e.student_id = p_student AND public.is_teacher_of_class(auth.uid(), e.class_id)))
$f$;

-- All-time points and level of each child asked for that the caller may see
-- (others are left out, not refused, so a family home can ask for all its
-- children at once). Per class: all time and the current Hanoi month.
CREATE OR REPLACE FUNCTION public.student_points_summary(p_students uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  -- The level and all-time total are the child's (every class). The
  -- per-class list and this month's figure are limited, for a teacher, to
  -- the classes they teach, as student_points_history is.
  SELECT COALESCE(jsonb_object_agg(s.id::text, jsonb_build_object(
           'all_time', COALESCE(t.all_time, 0),
           'month', COALESCE(t.month, 0),
           'level', public.points_level(COALESCE(t.all_time, 0)),
           'classes', COALESCE(t.classes, '[]'::jsonb))), '{}'::jsonb)
    FROM public.students s
    CROSS JOIN LATERAL (
      SELECT (public.has_role(auth.uid(), 'admin') OR public.can_view_student(s.id, auth.uid())
              OR public.is_family_student(s.id, auth.uid())) AS whole
    ) w
    LEFT JOIN LATERAL (
      SELECT SUM(x.all_time)::bigint AS all_time,
             SUM(x.month) FILTER (WHERE x.visible)::bigint AS month,
             jsonb_agg(jsonb_build_object('class_id', x.class_id, 'all_time', x.all_time, 'month', x.month))
               FILTER (WHERE x.visible) AS classes
        FROM (SELECT sp.class_id, SUM(sp.total_points)::bigint AS all_time,
                     SUM(sp.total_points) FILTER (WHERE sp.month = to_char(public.hanoi_today(), 'YYYY-MM'))::bigint AS month,
                     (w.whole OR public.is_teacher_of_class(auth.uid(), sp.class_id)) AS visible
                FROM public.student_points sp WHERE sp.student_id = s.id GROUP BY sp.class_id) x
    ) t ON true
   WHERE s.id = ANY (p_students) AND public.can_see_student_points(s.id)
$f$;

-- Every award one child got in a range, newest first, with the tab it
-- counts under, and the range's total worked out here (not in the
-- screen). A teacher sees only the rows of classes they teach. At most
-- 1,000 rows are listed; `truncated` says when there were more (the total
-- still counts them all).
DROP FUNCTION IF EXISTS public.student_points_history(uuid, date, date, uuid);
CREATE OR REPLACE FUNCTION public.student_points_history(
  p_student uuid, p_from date, p_to date, p_class uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE whole boolean; out_rows jsonb; n bigint; tot bigint;
BEGIN
  IF NOT public.can_see_student_points(p_student) THEN
    RAISE EXCEPTION 'Not allowed to see this child''s points' USING ERRCODE = '42501';
  END IF;
  whole := public.has_role(auth.uid(), 'admin') OR public.can_view_student(p_student, auth.uid())
           OR public.is_family_student(p_student, auth.uid());

  SELECT count(*), COALESCE(SUM(t.points), 0) INTO n, tot
    FROM public.point_transactions t
   WHERE t.student_id = p_student AND t.date BETWEEN p_from AND p_to
     AND (p_class IS NULL OR t.class_id = p_class)
     AND (whole OR public.is_teacher_of_class(auth.uid(), t.class_id));

  SELECT COALESCE(jsonb_agg(x.r ORDER BY x.d DESC, x.c DESC), '[]'::jsonb) INTO out_rows FROM (
    SELECT t.date AS d, t.created_at AS c, jsonb_build_object(
             'id', t.id, 'date', t.date, 'class_id', t.class_id, 'class_name', cl.name,
             'category', public.points_category(t.type, t.notes, h.submission_type = 'video'),
             'points', t.points, 'note', t.notes,
             'homework_title', COALESCE(t.homework_title, h.title), 'created_at', t.created_at) AS r
      FROM public.point_transactions t
      JOIN public.classes cl ON cl.id = t.class_id
      LEFT JOIN public.homeworks h ON h.id = t.homework_id
     WHERE t.student_id = p_student
       AND t.date BETWEEN p_from AND p_to
       AND (p_class IS NULL OR t.class_id = p_class)
       AND (whole OR public.is_teacher_of_class(auth.uid(), t.class_id))
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT 1000) x;

  RETURN jsonb_build_object('rows', out_rows, 'total', tot, 'count', n, 'truncated', n > 1000);
END $f$;

-- ---------------------------------------------------------- admin audit
-- Awards a person made (the ledger row has an author), and awards a person
-- removed (audit_log). Plus homework that was graded but paid no points,
-- for a teacher to finish.
CREATE OR REPLACE FUNCTION public.points_manual_changes(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $f$
DECLARE made jsonb; removed jsonb; unpaid jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only an admin can see the points audit' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'created_at') DESC), '[]'::jsonb) INTO made FROM (
    SELECT jsonb_build_object(
      'id', t.id, 'created_at', t.created_at, 'date', t.date,
      'by', COALESCE(te.full_name, pr.display_name, 'Staff'),
      'student', st.full_name, 'class', c.name,
      'category', public.points_category(t.type, t.notes, h.submission_type = 'video'),
      'points', t.points, 'note', t.notes) AS x
      FROM public.point_transactions t
      JOIN public.students st ON st.id = t.student_id
      JOIN public.classes c ON c.id = t.class_id
      LEFT JOIN public.homeworks h ON h.id = t.homework_id
      LEFT JOIN public.teachers te ON te.user_id = t.created_by
      LEFT JOIN public.profiles pr ON pr.id = t.created_by
     WHERE t.created_by IS NOT NULL
       AND (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN p_from AND p_to
     ORDER BY t.created_at DESC LIMIT 2000) z;

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'at') DESC), '[]'::jsonb) INTO removed FROM (
    SELECT jsonb_build_object(
      'at', a.occurred_at, 'what', a.operation,
      'by', COALESCE(te.full_name, pr.display_name, 'Staff'),
      'student', st.full_name, 'class', c.name,
      'points', (a.diff->'old'->>'points')::int,
      'note', a.diff->'old'->>'notes') AS x
      FROM public.audit_log a
      LEFT JOIN public.students st ON st.id::text = a.diff->'old'->>'student_id'
      LEFT JOIN public.classes c ON c.id::text = a.diff->'old'->>'class_id'
      LEFT JOIN public.teachers te ON te.user_id = a.actor_user_id
      LEFT JOIN public.profiles pr ON pr.id = a.actor_user_id
     WHERE a.entity = 'point_transactions' AND a.operation IN ('DELETE', 'UPDATE')
       AND (a.occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN p_from AND p_to
     ORDER BY a.occurred_at DESC LIMIT 1000) z;

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'graded_at') DESC), '[]'::jsonb) INTO unpaid FROM (
    SELECT jsonb_build_object(
      'homework', h.title, 'class', c.name, 'student', st.full_name,
      'grade', s.grade, 'graded_at', s.graded_at, 'due_date', h.due_date) AS x
      FROM public.homework_submissions s
      JOIN public.homeworks h ON h.id = s.homework_id
      JOIN public.classes c ON c.id = h.class_id
      JOIN public.students st ON st.id = s.student_id
     WHERE COALESCE(btrim(s.grade), '') <> ''
       AND NOT EXISTS (SELECT 1 FROM public.point_transactions t
                        WHERE t.type = 'homework' AND t.homework_id = s.homework_id AND t.student_id = s.student_id)
     ORDER BY s.graded_at DESC NULLS LAST LIMIT 500) z;

  RETURN jsonb_build_object('made', made, 'removed', removed, 'graded_without_points', unpaid);
END $f$;

-- ------------------------------------------------- the monthly "reset"
-- It zeroed two of the four buckets and left the ledger, so the next award
-- recalculated the month and put everything back; each month is already
-- its own board. It now only saves the month's final standings, from the
-- same engine, and zeroes nothing.
CREATE OR REPLACE FUNCTION public.archive_and_reset_monthly_leaderboard(target_month text)
RETURNS TABLE(archived_count integer, reset_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
DECLARE v_from date; v_to date; n int := 0;
BEGIN
  IF target_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Month must look like 2026-10' USING ERRCODE = '22023';
  END IF;
  v_from := (target_month || '-01')::date;
  v_to := (v_from + interval '1 month - 1 day')::date;

  DELETE FROM public.archived_leaderboards WHERE month = target_month;
  INSERT INTO public.archived_leaderboards
    (student_id, class_id, month, homework_points, participation_points, total_points, rank, archived_by)
  SELECT r.student_id, cl.id, target_month,
         (r.homework + r.video)::int, (r.class_points + r.streak_points)::int, r.total::int, r.rank, auth.uid()
    FROM public.classes cl
    CROSS JOIN LATERAL public.leaderboard_compute(cl.id, v_from, v_to, 'total') r;
  GET DIAGNOSTICS n = ROW_COUNT;

  DELETE FROM public.monthly_leaders WHERE month = target_month;
  -- One leader per class (the table is unique on class + month): the top
  -- rank, a tie settled by name.
  INSERT INTO public.monthly_leaders (class_id, month, student_id, total_points)
  SELECT DISTINCT ON (a.class_id) a.class_id, target_month, a.student_id, a.total_points
    FROM public.archived_leaderboards a JOIN public.students st ON st.id = a.student_id
   WHERE a.month = target_month AND a.rank = 1 AND a.total_points > 0
   ORDER BY a.class_id, st.full_name;

  RETURN QUERY SELECT n, 0;
END $f$;

-- ---------------------------------------------------------------- grants
REVOKE ALL ON FUNCTION public.leaderboard_compute(uuid, date, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leaderboard_centre_compute(date, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leaderboard_json(uuid, text, date, uuid[], boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leaderboard_tv_feed(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_and_reset_monthly_leaderboard(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_compute(uuid, date, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_centre_compute(date, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_json(uuid, text, date, uuid[], boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_tv_feed(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_and_reset_monthly_leaderboard(text) TO service_role;

REVOKE ALL ON FUNCTION public.leaderboard_board(uuid, text, date, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leaderboard_centre(text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_points_summary(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_points_history(uuid, date, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.points_manual_changes(date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_see_student_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_board(uuid, text, date, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_centre(text, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_points_summary(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_points_history(uuid, date, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.points_manual_changes(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_see_student_points(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.points_category(text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.points_level(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_period(text, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hanoi_today() TO authenticated, service_role;
