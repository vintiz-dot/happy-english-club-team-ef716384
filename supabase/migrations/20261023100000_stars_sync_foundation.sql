-- Stars sync: the tables, and the readiness check that decides whether
-- any of it will actually work.
--
-- See docs/STARS_SYNC_SPEC.md for the design and
-- docs/STARS_SYNC_SETUP.md for the admin procedure. This migration is
-- the HEC side's foundation: configuration, mappings, the event log and
-- the conflict queue. It deliberately contains NO apply path and NO
-- fetch - the Stars app's export endpoint does not exist yet, and an
-- engine written against an imaginary contract is worse than none.
--
-- GENERALISED TO ANY TEACHER AND ANY CLASS. The spec described one
-- connection and one teacher because there were three known classes
-- sharing one. The shape here is the same, with the teacher moved to
-- where it varies: the connection holds a DEFAULT teacher and the master
-- switch, and each mapped class may override the teacher. One switch
-- still stops everything.
--
-- WHY THE TEACHER MATTERS SO MUCH. The sync acts as that person, through
-- the same row policies the app enforces for them - so the question "can
-- this sync write a register" is exactly the question "could this
-- teacher write that register". Two different policies decide it, and
-- they fail differently:
--
--   attendance            keyed on the SESSION's own teacher_id
--                         (20260403050441). Per session, no time bound.
--                         Wrong teacher -> registers never sync at all.
--
--   points, homework,     keyed on is_teacher_of_class, which since
--   grades                20261007120000 is roster-permanent (the class
--                         names them as default_teacher_id, or a weekly
--                         slot does) OR cover for [-45, +60] days.
--                         A cover teacher works for six weeks and then
--                         stops, mid-term, one class at a time.
--
-- stars_sync_readiness() below answers both, per class, so the admin
-- screen can say so before anything is switched on rather than after a
-- term of missing marks.

BEGIN;

-- ------------------------------------------------------------ tables

-- The master switch. Exactly one row, enforced by the primary key.
CREATE TABLE IF NOT EXISTS public.stars_sync_connection (
  id                 boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled            boolean NOT NULL DEFAULT false,
  -- Used by any mapped class that does not name its own teacher.
  default_teacher_id uuid REFERENCES public.teachers(id) ON DELETE RESTRICT,
  -- Informational: which Stars deployment this points at. The URL and
  -- the secret live in Supabase secrets, never here.
  endpoint_label     text,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES auth.users(id)
);

INSERT INTO public.stars_sync_connection (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- Which Stars class is which HEC class, and who the sync is for it.
--
-- ON DELETE RESTRICT on both references is deliberate: archiving a class
-- or a teacher must fail loudly while a mapping points at them, rather
-- than silently detaching a term of records.
CREATE TABLE IF NOT EXISTS public.stars_class_map (
  stars_class_id text PRIMARY KEY,
  class_id       uuid NOT NULL UNIQUE REFERENCES public.classes(id) ON DELETE RESTRICT,
  -- NULL means "use the connection's default teacher".
  teacher_id     uuid REFERENCES public.teachers(id) ON DELETE RESTRICT,
  enabled        boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id),
  CONSTRAINT stars_class_map_id_not_blank CHECK (btrim(stars_class_id) <> '')
);

-- One-to-one in both directions. A Stars student maps to exactly one
-- child here, and no child is the target of two Stars students - the
-- second would quietly merge two children's records.
CREATE TABLE IF NOT EXISTS public.stars_student_map (
  stars_student_id text PRIMARY KEY,
  student_id       uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),
  CONSTRAINT stars_student_map_id_not_blank CHECK (btrim(stars_student_id) <> '')
);

-- Stars homework id -> the homeworks row created for it. Grades and
-- retractions need to find it again.
CREATE TABLE IF NOT EXISTS public.stars_homework_map (
  stars_homework_ref text PRIMARY KEY,
  homework_id        uuid NOT NULL UNIQUE REFERENCES public.homeworks(id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- How far through the feed we have read. Exactly one row.
CREATE TABLE IF NOT EXISTS public.stars_sync_cursor (
  id          boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_seq    bigint NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_error  text
);

INSERT INTO public.stars_sync_cursor (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- Every event handed to us, and what became of it.
--
-- event_id as the primary key is what makes a re-run harmless: the
-- second insert conflicts and the event is not applied twice. applied_ref
-- records what the event created so a later retraction can reverse
-- exactly that, rather than guessing - and a guess here changes the
-- wrong child's record.
CREATE TABLE IF NOT EXISTS public.stars_sync_events (
  event_id     uuid PRIMARY KEY,
  seq          bigint NOT NULL,
  kind         text NOT NULL,
  raw          jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  outcome      text NOT NULL CHECK (outcome IN (
                 'applied', 'duplicate', 'conflict', 'retracted',
                 'skipped_unmapped', 'skipped_no_session',
                 'skipped_no_homework', 'skipped_disabled', 'rejected')),
  outcome_note text,
  applied_ref  jsonb
);

CREATE INDEX IF NOT EXISTS stars_sync_events_seq_idx ON public.stars_sync_events (seq);
CREATE INDEX IF NOT EXISTS stars_sync_events_outcome_idx
  ON public.stars_sync_events (outcome, received_at DESC);

-- The ones a person has to look at: both apps hold a different answer.
CREATE TABLE IF NOT EXISTS public.stars_sync_conflicts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.stars_sync_events(event_id) ON DELETE CASCADE,
  student_id  uuid REFERENCES public.students(id) ON DELETE SET NULL,
  session_id  uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  ours        jsonb NOT NULL,
  theirs      jsonb NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution  text CHECK (resolution IN ('kept_ours', 'took_theirs', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS stars_sync_conflicts_open_idx
  ON public.stars_sync_conflicts (detected_at DESC) WHERE resolved_at IS NULL;

-- --------------------------------------------------------- functions

-- Who the sync acts as for a given Stars class: the class's own teacher
-- if it names one, otherwise the connection default. NULL means the
-- class cannot sync, which the readiness check reports as blocked.
CREATE OR REPLACE FUNCTION public.stars_sync_effective_teacher(p_stars_class text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(m.teacher_id, c.default_teacher_id)
  FROM public.stars_class_map m
  CROSS JOIN public.stars_sync_connection c
  WHERE m.stars_class_id = p_stars_class;
$$;

-- Can each mapped class actually sync, and if not, why not.
--
-- The two permission tiers are reported separately because they fail
-- separately: a class can sync points and nothing else, and that is the
-- failure that otherwise shows up as "the register stopped working".
CREATE OR REPLACE FUNCTION public.stars_sync_readiness()
RETURNS TABLE (
  stars_class_id        text,
  class_id              uuid,
  class_name            text,
  teacher_id            uuid,
  teacher_name          text,
  teacher_is_default    boolean,
  teacher_is_active     boolean,
  teacher_has_login     boolean,
  sessions_total        integer,
  sessions_with_teacher integer,
  map_enabled           boolean,
  can_sync_points       boolean,
  can_sync_attendance   boolean,
  status                text,
  detail                text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH mapped AS (
    SELECT m.stars_class_id,
           m.class_id,
           m.enabled AS map_enabled,
           COALESCE(m.teacher_id, conn.default_teacher_id) AS teacher_id
    FROM public.stars_class_map m
    CROSS JOIN public.stars_sync_connection conn
  ),
  counted AS (
    SELECT mp.*,
           c.name AS class_name,
           c.default_teacher_id,
           t.full_name AS teacher_name,
           t.is_active AS teacher_is_active,
           (t.user_id IS NOT NULL) AS teacher_has_login,
           (SELECT count(*) FROM public.sessions s
             WHERE s.class_id = mp.class_id)::integer AS sessions_total,
           (SELECT count(*) FROM public.sessions s
             WHERE s.class_id = mp.class_id
               AND s.teacher_id IS NOT DISTINCT FROM mp.teacher_id)::integer
             AS sessions_with_teacher
    FROM mapped mp
    JOIN public.classes c ON c.id = mp.class_id
    LEFT JOIN public.teachers t ON t.id = mp.teacher_id
  ),
  judged AS (
    SELECT cn.*,
           -- Roster tier: permanent. Anything else is cover, which
           -- expires 45 days after their last lesson.
           (cn.teacher_id IS NOT NULL
            AND cn.default_teacher_id IS NOT DISTINCT FROM cn.teacher_id) AS teacher_is_default,
           -- Attendance needs them on the session rows themselves. No
           -- sessions at all is not a fault - a new class has none yet.
           (cn.teacher_id IS NOT NULL
            AND (cn.sessions_total = 0 OR cn.sessions_with_teacher > 0)) AS can_sync_attendance
    FROM counted cn
  )
  SELECT
    j.stars_class_id,
    j.class_id,
    j.class_name,
    j.teacher_id,
    j.teacher_name,
    j.teacher_is_default,
    COALESCE(j.teacher_is_active, false),
    COALESCE(j.teacher_has_login, false),
    j.sessions_total,
    j.sessions_with_teacher,
    j.map_enabled,
    (j.teacher_is_default AND COALESCE(j.teacher_is_active, false)
       AND COALESCE(j.teacher_has_login, false)) AS can_sync_points,
    (j.can_sync_attendance AND COALESCE(j.teacher_is_active, false)
       AND COALESCE(j.teacher_has_login, false)) AS can_sync_attendance,
    CASE
      WHEN j.teacher_id IS NULL THEN 'blocked'
      WHEN NOT COALESCE(j.teacher_is_active, false) THEN 'blocked'
      WHEN NOT COALESCE(j.teacher_has_login, false) THEN 'blocked'
      WHEN NOT j.map_enabled THEN 'paused'
      WHEN j.teacher_is_default AND j.can_sync_attendance THEN 'ready'
      ELSE 'partial'
    END AS status,
    CASE
      WHEN j.teacher_id IS NULL
        THEN 'No teacher. Set one on this class, or a default on the connection.'
      WHEN NOT COALESCE(j.teacher_is_active, false)
        THEN j.teacher_name || ' is archived. Nothing will sync until another teacher is chosen.'
      WHEN NOT COALESCE(j.teacher_has_login, false)
        THEN j.teacher_name || ' has no login, so the sync cannot act as them.'
      WHEN NOT j.map_enabled
        THEN 'Paused for this class. Nothing syncs until it is switched back on.'
      WHEN NOT j.teacher_is_default AND NOT j.can_sync_attendance
        THEN j.teacher_name || ' is neither the class default teacher nor on any of its lessons. '
             || 'Points and homework will stop 45 days after their last lesson, and registers will never sync.'
      WHEN NOT j.teacher_is_default
        THEN j.teacher_name || ' is not the class default teacher, only covering. '
             || 'Points, homework and grades will stop 45 days after their last lesson in this class.'
      WHEN NOT j.can_sync_attendance
        THEN j.teacher_name || ' is the default teacher but is not on any of this class''s '
             || j.sessions_total || ' lessons, so registers will not sync.'
      ELSE 'Ready. ' || j.teacher_name || ' is the default teacher and is on '
             || j.sessions_with_teacher || ' of ' || j.sessions_total || ' lessons.'
    END AS detail
  FROM judged j
  ORDER BY j.class_name;
$$;

-- ------------------------------------------------------- row security
--
-- Admin only, throughout. The sync itself does not exist yet; when it
-- does it will act as a teacher and will need its own narrow policies on
-- the bookkeeping tables. Granting those now, to a path nothing walks,
-- would be opening a door before there is a room behind it.

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stars_sync_connection', 'stars_class_map', 'stars_student_map',
    'stars_homework_map', 'stars_sync_cursor', 'stars_sync_events',
    'stars_sync_conflicts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (public.has_role(auth.uid(), ''admin''::public.app_role))
         WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))',
      t || '_admin_all', t);

    -- 20260712023825 revoked the defaults on public, so a new table is
    -- reported by PostgREST as missing from the schema cache rather than
    -- as forbidden until it is granted explicitly.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END
$do$;

GRANT EXECUTE ON FUNCTION public.stars_sync_readiness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.stars_sync_effective_teacher(text) TO authenticated;

-- ------------------------------------------------------------- audit
-- Who mapped which child to which Stars record, and who turned the
-- connection on. Both are answerable later or they are not answerable.

DO $do$
DECLARE t text;
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE NOTICE 'public.audit_row_change() not present; stars sync config will not be audited.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'stars_sync_connection', 'stars_class_map', 'stars_student_map'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- What landed, as a result set the SQL editor will always print.
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'stars\_%')     AS stars_tables,
  (SELECT count(*) FROM pg_proc WHERE proname = 'stars_sync_readiness') AS readiness_fn,
  (SELECT enabled FROM public.stars_sync_connection)                   AS connection_enabled,
  (SELECT count(*) FROM public.stars_class_map)                        AS classes_mapped,
  (SELECT count(*) FROM public.stars_student_map)                      AS students_mapped;
