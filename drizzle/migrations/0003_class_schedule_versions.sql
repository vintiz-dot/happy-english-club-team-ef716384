-- Give a class's weekly schedule a history, so it can be changed from a date
-- without rewriting the past.
--
-- THE PROBLEM. classes.schedule_template is one jsonb blob holding the
-- current weeklySlots, and RecurringSessionsManager overwrites it whole.
-- There is nowhere to say "from 1 November this class moves to Tuesday".
-- Worse, that single blob is what every PAST session is judged against:
--
--   src/lib/classSchedule.ts expectedLengthFor()  -- and its mirror inside
--   supabase/functions/calculate-payroll          -- computeTotals()
--
-- take a session's date, find the weekly slot for that weekday, and compare
-- the slot's length against what the session actually ran. Change a class
-- from 90 to 120 minutes today and every session already taught at 90
-- becomes a "mismatch" tomorrow: the payroll screen lights up with a
-- variance that is not real, and the figure it prints as "projected at
-- scheduled lengths" re-prices history at a length that was never
-- scheduled when those lessons happened.
--
-- THE SHAPE. One row per (class, effective_from). The schedule in force on
-- date D is the row with the greatest effective_from <= D. Nothing is ever
-- overwritten to make a change: a change is a new row.
--
-- classes.schedule_template STAYS, and stays meaning "the schedule in force
-- now". About twenty readers use it to answer "when does this class meet?"
-- - the catalog, the enrollment pickers, the class cards - and every one of
-- those questions is about the present, so none of them needs to change.
-- Only the readers that ask "what was the schedule ON THIS DATE" move to
-- the new table.

CREATE TABLE IF NOT EXISTS public.class_schedule_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,

  -- Inclusive. A version runs until the day before the next version's
  -- effective_from, or forever. No effective_to column: two columns that
  -- have to agree can disagree, and a gap or an overlap between them has
  -- no meaning here.
  effective_from date NOT NULL,

  -- Same shape as classes.schedule_template -> 'weeklySlots':
  -- [{ dayOfWeek, startTime, endTime, teacherId }]
  weekly_slots jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Carried per version, not read off the class, for the same reason the
  -- slots are: checkSessionLength falls back to this number for a session
  -- on a weekday the class does not normally run, so a class that changes
  -- its standard length would otherwise re-judge old one-offs against the
  -- new one.
  default_session_length_minutes integer,

  -- Why the schedule changed. Shown next to the version in the admin UI;
  -- a timetable change nobody can explain six months later is how a
  -- "mistake" gets corrected back into a real mistake.
  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,

  CONSTRAINT class_schedule_versions_unique_start UNIQUE (class_id, effective_from),
  CONSTRAINT class_schedule_versions_slots_is_array CHECK (jsonb_typeof(weekly_slots) = 'array'),
  CONSTRAINT class_schedule_versions_length_sane
    CHECK (default_session_length_minutes IS NULL
           OR (default_session_length_minutes > 0 AND default_session_length_minutes <= 1440))
);

-- The hot query is "the version in force on date D for class C", i.e.
-- ORDER BY effective_from DESC LIMIT 1 with effective_from <= D.
CREATE INDEX IF NOT EXISTS idx_class_schedule_versions_lookup
  ON public.class_schedule_versions (class_id, effective_from DESC);

COMMENT ON TABLE public.class_schedule_versions IS
  'History of a class''s weekly timetable. The schedule in force on a date is the row with the greatest effective_from <= that date. classes.schedule_template mirrors the row in force today, for the many readers that only ever ask about the present.';

-- ------------------------------------------------------------------ backfill
--
-- Every class gets a baseline version carrying whatever its template holds
-- today, dated far enough back to cover every session ever recorded. Without
-- this, "the version in force on D" returns nothing for historical dates and
-- every consumer would need a null branch; with it, the lookup always has an
-- answer and the null branch cannot be forgotten.
--
-- 1900-01-01 rather than the class's created_at: sessions have been
-- backdated before now, and a baseline that starts after a session leaves
-- that session unexplained.

INSERT INTO public.class_schedule_versions (class_id, effective_from, weekly_slots, default_session_length_minutes, note)
SELECT
  c.id,
  DATE '1900-01-01',
  CASE
    WHEN jsonb_typeof(c.schedule_template -> 'weeklySlots') = 'array'
      THEN c.schedule_template -> 'weeklySlots'
    ELSE '[]'::jsonb
  END,
  c.default_session_length_minutes,
  'Baseline captured when schedule history was introduced.'
FROM public.classes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.class_schedule_versions v WHERE v.class_id = c.id
);

-- --------------------------------------------------------------- the lookup
--
-- SQL-side resolver, used by is_teacher_of_class further down this file.
-- The client and the edge functions fetch a class's versions and resolve in
-- code instead - they need many classes at once and a per-row function call
-- would be a join per session - but a policy cannot do that, so it needs
-- this.

CREATE OR REPLACE FUNCTION public.class_slots_on(p_class_id uuid, p_date date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT COALESCE(
    (
      SELECT v.weekly_slots
      FROM public.class_schedule_versions v
      WHERE v.class_id = p_class_id
        AND v.effective_from <= p_date
      ORDER BY v.effective_from DESC
      LIMIT 1
    ),
    -- No version at or before this date. Falls back to the class's current
    -- template rather than to an empty array: an empty array would silently
    -- revoke every rostered teacher's access, which is a worse failure than
    -- being one schedule change out of date.
    CASE
      WHEN jsonb_typeof(c.schedule_template -> 'weeklySlots') = 'array'
        THEN c.schedule_template -> 'weeklySlots'
      ELSE '[]'::jsonb
    END
  )
  FROM public.classes c
  WHERE c.id = p_class_id;
$fn$;

REVOKE EXECUTE ON FUNCTION public.class_slots_on(uuid, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_slots_on(uuid, date) TO authenticated, service_role;

COMMENT ON FUNCTION public.class_slots_on(uuid, date) IS
  'The weeklySlots array in force for a class on a given date. Falls back to classes.schedule_template when no version covers the date.';

-- -------------------------------------------------------------------- RLS
--
-- Reads: admins, and staff who hold the class. Students are deliberately
-- excluded - they see the current timetable through classes.schedule_template
-- in the catalog, and a class's staffing history is not theirs to read.
--
-- Writes: admins only, matching who can reach RecurringSessionsManager
-- (/admin/classes/:id is guarded to admin). Teachers may change their own
-- class's economy and leaderboard settings but not its timetable, and the
-- allowlist trigger on public.classes already enforces that for the
-- template; this table follows the same line.

ALTER TABLE public.class_schedule_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage class schedule versions" ON public.class_schedule_versions;
CREATE POLICY "Admins manage class schedule versions"
  ON public.class_schedule_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read their class schedule versions" ON public.class_schedule_versions;
CREATE POLICY "Staff read their class schedule versions"
  ON public.class_schedule_versions FOR SELECT
  TO authenticated
  USING (public.is_teacher_of_class(auth.uid(), class_id));

REVOKE ALL ON public.class_schedule_versions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule_versions TO authenticated;

-- ------------------------------------------- is_teacher_of_class, date-aware
--
-- The roster-slot tier reads the weekly slots to decide whether a teacher
-- holds a class. It read classes.schedule_template, which is a cache of
-- "the schedule in force now" that only gets refreshed when someone saves.
-- That is fine today and wrong tomorrow: a version dated 1 November names
-- a new teacher, 1 November arrives, and nothing has re-saved the class, so
-- the cache still names the old one. The new teacher cannot open their own
-- class and the old one still can.
--
-- Reading class_slots_on(class_id, CURRENT_DATE) instead makes the handover
-- happen on the date it was scheduled for, with nothing to run and nothing
-- to remember.
--
-- EVERYTHING ELSE IS UNCHANGED, and deliberately so. This function is the
-- gate on class data for every teacher and TA in the school; the two
-- tiers, the 7/60-day cover window, the cancelled-session exclusion and the
-- uuid regex guard are all reproduced verbatim from
-- 20261007140000_shorten_cover_window_to_seven_days.sql. The only edit is
-- which jsonb the slot tier walks.
--
-- On a teacher taken OFF the roster: they lose the roster tier the day the
-- new version starts, and keep the cover tier for 7 days after their last
-- actual session, which is the window the school already agreed. They do
-- not silently keep the class forever, and they do not lose it the instant
-- an admin plans a change for next term.

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Tier 1, roster: named as the class's default teacher.
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.default_teacher_id
    WHERE c.id = is_teacher_of_class.class_id
      AND t.user_id = is_teacher_of_class.user_id
  )

  -- Tier 2, cover: a non-cancelled session of this class assigned to them,
  -- near enough in time to still be their business.
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

  -- Tier 1, roster: named on one of the class's weekly slots AS THEY STAND
  -- TODAY. The regex guards the cast: the slots are free-form JSON written
  -- by admin screens, and a malformed teacherId must not raise inside an
  -- RLS predicate, which would lock the table rather than deny a row.
  OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(public.class_slots_on(is_teacher_of_class.class_id, CURRENT_DATE)) AS slot
    JOIN public.teachers t
      ON t.id = (slot ->> 'teacherId')::uuid
    WHERE (slot ->> 'teacherId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND t.user_id = is_teacher_of_class.user_id
  )

  -- Tier 2, cover, for teaching assistants. Same window, same status rule.
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
  'Two tiers. Roster (classes.default_teacher_id, or a weekly slot in the schedule version in force TODAY - see class_slots_on) is permanent while it stands. Coverage (a non-cancelled session assigned to the teacher or TA) lasts from 7 days before to 60 days after that session.';
