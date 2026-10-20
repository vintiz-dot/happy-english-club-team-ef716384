-- Archive a teacher or TA. Never erase one.
--
-- WHAT WAS THERE. A "Delete Teacher" button issuing a hard
-- DELETE FROM public.teachers, guarded only by catching SQLSTATE 23503 and
-- telling the admin "this teacher has lessons on record". That guard fires
-- for exactly two of the six foreign keys pointing at the table -
-- sessions.teacher_id and classes.default_teacher_id, the two declared
-- ON DELETE RESTRICT. The other four are ON DELETE CASCADE and raise
-- nothing at all:
--
--   payroll_summaries     every finalised month of pay, gone
--   teacher_banking_info  the account the school paid into, gone
--   session_participants  every record they were in the room, gone
--   teacher_flipbooks     their saved materials, gone
--
-- So a teacher who only ever co-taught - no owned sessions, no class
-- default - passed the check and was destroyed along with all four. No
-- error, and no audit row either, because `teachers` was not in the
-- audited-table list.
--
-- This migration makes that outcome unreachable and gives archiving the
-- three things it needs to be honest: a date, a way back, and an end to
-- the access the person had while they worked here.
--
-- WHY A TIMESTAMP AND NOT JUST is_active. Payroll is month-scoped. The
-- question a payroll screen asks is not "are they here today" but "were
-- they here in July", and a boolean cannot answer it - which is why
-- archiving someone on the 20th used to drop the first nineteen days of
-- their work out of the run. public.students already solved this exact
-- problem with deactivated_at in 20260904090000, down to the sync trigger;
-- this is the same shape, named for the action the UI offers.

-- ------------------------------------------------------------- 1. columns

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

ALTER TABLE public.teaching_assistants
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid;

COMMENT ON COLUMN public.teachers.archived_at IS
  'When this teacher left; NULL while they are on the staff. Month-scoped queries use it to decide whether they count toward a given month. Kept in lockstep with is_active by sync_staff_archived_at().';
COMMENT ON COLUMN public.teaching_assistants.archived_at IS
  'When this assistant left; NULL while they are on the staff. See public.teachers.archived_at.';

-- Anyone already switched off left at some point, and the best evidence of
-- when is the last time the row was touched. Better than now(): dating
-- every past departure to today would put them all in this month's payroll.
UPDATE public.teachers
   SET archived_at = updated_at
 WHERE is_active = false AND archived_at IS NULL;

UPDATE public.teaching_assistants
   SET archived_at = updated_at
 WHERE is_active = false AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_archived_at
  ON public.teachers (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teaching_assistants_archived_at
  ON public.teaching_assistants (archived_at) WHERE archived_at IS NOT NULL;

-- Flag and timestamp in lockstep, so no call site has to remember both.
-- Mirrors sync_student_deactivated_at (20260904090000) deliberately: two
-- tables that mean the same thing should not behave differently.
CREATE OR REPLACE FUNCTION public.sync_staff_archived_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NEW.is_active = false THEN
      -- NULL means the caller supplied no explicit date. One that does
      -- (backdating a departure to get the final month right) is left alone.
      IF NEW.archived_at IS NULL THEN
        NEW.archived_at := now();
      END IF;
    ELSE
      NEW.archived_at := NULL;
      NEW.archived_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS sync_teachers_archived_at ON public.teachers;
CREATE TRIGGER sync_teachers_archived_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.sync_staff_archived_at();

DROP TRIGGER IF EXISTS sync_tas_archived_at ON public.teaching_assistants;
CREATE TRIGGER sync_tas_archived_at
  BEFORE UPDATE ON public.teaching_assistants
  FOR EACH ROW EXECUTE FUNCTION public.sync_staff_archived_at();

-- ------------------------------------------- 2. the self-update allowlist
--
-- 20261016091000 installed an allowlist trigger: staff may change only
-- email, phone, bio and avatar_url on their own row, and the check is
-- "everything else must be identical to the stored value". archived_at and
-- archived_by are new columns, so they are already covered - a teacher
-- cannot un-archive themselves. Nothing to change here; stated because the
-- allowlist's whole point is that a new column is protected the moment it
-- exists, and that is worth confirming rather than assuming.

-- --------------------------------------------- 3. make deletion unreachable
--
-- Two layers, because one is not enough.
--
-- (a) payroll_summaries stops cascading. A finalised month of pay is a
--     financial record; the database should refuse, whatever any UI does.
--     The other three CASCADEs are left alone deliberately - banking
--     details, co-teaching rows and saved materials all belong WITH the
--     staff record, and the guard below means they can only ever cascade
--     for a staff member who has no history at all, i.e. nothing to lose.

DO $do$
DECLARE
  c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'public.payroll_summaries'::regclass
     AND confrelid = 'public.teachers'::regclass
     AND contype = 'f'
   LIMIT 1;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.payroll_summaries DROP CONSTRAINT %I', c);
  END IF;
  ALTER TABLE public.payroll_summaries
    ADD CONSTRAINT payroll_summaries_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE RESTRICT;
END
$do$;

-- (b) teachers.user_id stops being a child of the login.
--
--     It was REFERENCES public.users(id) ON DELETE CASCADE, and
--     public.users.id is itself ON DELETE CASCADE from auth.users. So
--     deleting an account deleted the staff record and everything hanging
--     off it - a completely separate hard-delete path from the button,
--     reachable from manage-admin-users. teaching_assistants.user_id
--     already does the right thing (ON DELETE SET NULL, 20260322050903);
--     this brings teachers into line. Revoking a login now unlinks the
--     record instead of destroying it.

DO $do$
DECLARE
  c text;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
   WHERE conrelid = 'public.teachers'::regclass
     AND contype = 'f'
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'public.teachers'::regclass AND attname = 'user_id')]
   LIMIT 1;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.teachers DROP CONSTRAINT %I', c);
  END IF;

  -- Nullable since 20260305152550, so SET NULL is representable.
  ALTER TABLE public.teachers ALTER COLUMN user_id DROP NOT NULL;
  ALTER TABLE public.teachers
    ADD CONSTRAINT teachers_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END
$do$;

-- (c) The guard itself. One BEFORE DELETE trigger covering every reference,
--     including the one that is not a foreign key at all:
--     classes.schedule_template -> weeklySlots -> teacherId is jsonb, so no
--     constraint protects it and a delete leaves a dangling uuid that
--     schedule-sessions then uses anyway.
--
--     A staff member with NO history can still be deleted - someone
--     created by a typo five minutes ago should not need archiving - and
--     that is the only case where the remaining CASCADEs can fire, with
--     nothing to destroy.

CREATE OR REPLACE FUNCTION public.block_delete_of_staff_with_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  n_sessions     integer := 0;
  n_participant  integer := 0;
  n_payroll      integer := 0;
  n_classes      integer := 0;
  n_slots        integer := 0;
  parts          text[]  := ARRAY[]::text[];
BEGIN
  IF TG_TABLE_NAME = 'teachers' THEN
    SELECT count(*) INTO n_sessions    FROM public.sessions WHERE teacher_id = OLD.id;
    SELECT count(*) INTO n_participant FROM public.session_participants WHERE teacher_id = OLD.id;
    SELECT count(*) INTO n_payroll     FROM public.payroll_summaries WHERE teacher_id = OLD.id;
    SELECT count(*) INTO n_classes     FROM public.classes WHERE default_teacher_id = OLD.id;
    SELECT count(*) INTO n_slots
      FROM public.classes c
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(c.schedule_template -> 'weeklySlots') = 'array'
             THEN c.schedule_template -> 'weeklySlots' ELSE '[]'::jsonb END) AS slot
     WHERE slot ->> 'teacherId' = OLD.id::text;
  ELSE
    SELECT count(*) INTO n_participant FROM public.session_participants WHERE teaching_assistant_id = OLD.id;
  END IF;

  IF n_sessions    > 0 THEN parts := parts || format('%s lesson(s)', n_sessions); END IF;
  IF n_participant > 0 THEN parts := parts || format('%s co-taught lesson(s)', n_participant); END IF;
  IF n_payroll     > 0 THEN parts := parts || format('%s month(s) of payroll', n_payroll); END IF;
  IF n_classes     > 0 THEN parts := parts || format('%s class(es) they lead', n_classes); END IF;
  IF n_slots       > 0 THEN parts := parts || format('%s timetable slot(s)', n_slots); END IF;

  IF array_length(parts, 1) IS NOT NULL THEN
    RAISE EXCEPTION
      '% has % on record and cannot be deleted. Archive them instead - the records stay, and payroll for months they worked stays correct.',
      OLD.full_name, array_to_string(parts, ', ')
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN OLD;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.block_delete_of_staff_with_history() FROM anon, PUBLIC;

DROP TRIGGER IF EXISTS block_delete_teachers_with_history ON public.teachers;
CREATE TRIGGER block_delete_teachers_with_history
  BEFORE DELETE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.block_delete_of_staff_with_history();

DROP TRIGGER IF EXISTS block_delete_tas_with_history ON public.teaching_assistants;
CREATE TRIGGER block_delete_tas_with_history
  BEFORE DELETE ON public.teaching_assistants
  FOR EACH ROW EXECUTE FUNCTION public.block_delete_of_staff_with_history();

-- --------------------------------- 4. an archived teacher still has a name
--
-- The SELECT policy was `USING (is_active = true AND auth.uid() IS NOT NULL)`.
-- The moment is_active went false, every non-admin lost the row, so every
-- embedded join returned null: a student's schedule, the class catalogue, a
-- homework dialog, the teacher-side calendars. A lesson a child attended in
-- March lost the name of the person who taught it.
--
-- That is the single thing that made archiving unusable, and it is why the
-- school reached for a delete button instead.
--
-- The ONLY change is dropping `is_active = true`. Active staff were
-- already readable by every signed-in user, so letting archived ones be
-- read too widens exactly one thing: a name on a lesson that has already
-- happened. Sensitive columns stay protected by the mechanism that already
-- protects them - 20260711235255 revoked SELECT on (email, phone) from
-- authenticated and anon at the COLUMN level, which no row policy can undo.
--
-- NOT FIXED HERE, and worth stating rather than leaving implied: the pay
-- columns (hourly_rate_vnd, per_session_rate_vnd, pay_rate_type) are
-- readable by any signed-in user, including a student, and have been since
-- long before archiving. The column-revoke that would close it also breaks
-- the two queries that read a teacher's own row with select("*") -
-- useStaffProfile.ts:37 and TeacherProfile.tsx:37 - which is how a teacher
-- sees their own rate on their dashboard. Closing it means rewriting those
-- with explicit column lists first, which is a separate change with its own
-- blast radius. Left alone on purpose, not missed.

DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
CREATE POLICY "Authenticated users can view teachers"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Both names dropped: this policy is RENAMED (it was "...active TAs",
-- and it is no longer about active ones), so dropping only the old name
-- leaves the new one in place and the CREATE fails on a second run. The
-- teachers policy above keeps its name, so one DROP is enough there.
DROP POLICY IF EXISTS "Authenticated users can view active TAs" ON public.teaching_assistants;
DROP POLICY IF EXISTS "Authenticated users can view TAs" ON public.teaching_assistants;
CREATE POLICY "Authenticated users can view TAs"
  ON public.teaching_assistants FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- --------------------------------- 5. archiving actually removes access
--
-- is_teacher_of_class joins public.teachers in every tier and never looked
-- at is_active, and its roster tier is permanent. So an archived teacher
-- who kept their login kept FOR ALL access to their old classes' points,
-- attendance and assessments - forever. An archive that does not cut data
-- access is not an archive.
--
-- The slot tier also now reads the schedule version in force TODAY
-- (class_slots_on, 20261020090000) rather than the cached template, so a
-- handover planned for next term takes effect on its own date.

CREATE OR REPLACE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  -- Tier 1, roster: the class's default teacher. Active staff only.
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.teachers t ON t.id = c.default_teacher_id
    WHERE c.id = is_teacher_of_class.class_id
      AND t.user_id = is_teacher_of_class.user_id
      AND t.is_active
  )

  -- Tier 2, cover: a non-cancelled session of this class assigned to them,
  -- inside the window. Active staff only.
  OR EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.teachers t ON t.id = s.teacher_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND t.user_id  = is_teacher_of_class.user_id
      AND t.is_active
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  )

  -- Tier 1, roster: named on a weekly slot of the version in force today.
  -- The regex guards the cast: the slots are free-form JSON written by
  -- admin screens, and a malformed teacherId must not raise inside an RLS
  -- predicate, which would lock the table rather than deny a row.
  OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(public.class_slots_on(is_teacher_of_class.class_id, CURRENT_DATE)) AS slot
    JOIN public.teachers t
      ON t.id = (slot ->> 'teacherId')::uuid
    WHERE (slot ->> 'teacherId') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND t.user_id = is_teacher_of_class.user_id
      AND t.is_active
  )

  -- Tier 2, cover, for teaching assistants. Same window, same status rule.
  OR EXISTS (
    SELECT 1
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    JOIN public.teaching_assistants ta ON ta.id = sp.teaching_assistant_id
    WHERE s.class_id = is_teacher_of_class.class_id
      AND ta.user_id = is_teacher_of_class.user_id
      AND ta.is_active
      AND sp.participant_type = 'teaching_assistant'
      AND s.status <> 'Canceled'::public.session_status
      AND s.date >= CURRENT_DATE - INTERVAL '7 days'
      AND s.date <= CURRENT_DATE + INTERVAL '60 days'
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) FROM anon, PUBLIC;

COMMENT ON FUNCTION public.is_teacher_of_class(uuid, uuid) IS
  'Two tiers, active staff only. Roster (classes.default_teacher_id, or a weekly slot in the schedule version in force TODAY - see class_slots_on) is permanent while it stands. Coverage (a non-cancelled session assigned to them) lasts from 7 days before to 60 days after that session. Archiving a teacher ends all of it.';

-- ---------------------------------------------- 6. record who archived whom
--
-- `teachers` was not in the audited-table list, so a pay-rate change, an
-- archive, or the hard delete left no record of who did it. Archiving is
-- reversible and consequential, which is exactly the shape of thing the
-- audit trigger exists for.

DO $do$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['teachers', 'teaching_assistants'] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t, t);
  END LOOP;
END
$do$;
