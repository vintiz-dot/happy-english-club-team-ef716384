-- An assistant who did not come to a lesson should not be paid for it.
--
-- A teaching assistant is attached to a lesson by a row in
-- session_participants, and calculate-payroll pays them for every lesson
-- they are attached to. There is no way to say "Linh was off on the 9th".
-- The only thing the UI offers is editing the session and removing her
-- from it, which does not mean the same thing at all: it erases the fact
-- that she was rostered, so nobody can later tell a missed lesson from a
-- lesson she was never on, and re-saving the session's assistants puts
-- her straight back.
--
-- So the roster stays and the pay stops.
--
-- WHY THIS IS NOT THE attendance TABLE. public.attendance is about
-- students: it drives tuition, excused-absence credit and the leaderboard,
-- and its statuses mean things that make no sense for staff. Staff
-- presence belongs on the row that already says the staff member was
-- meant to be there.
--
-- WHAT IT AFFECTS AND WHAT IT DELIBERATELY DOES NOT.
--
--   Pay: calculate-payroll skips a lesson an assistant missed, so it
--   drops out of their total, out of payroll_lines when the month is
--   closed, and out of the class's Payroll column.
--
--   Allocation: NOT affected. "Which classes does this person work in",
--   which is what a cost aimed at a staff member is split by
--   (20261021098000), is a roster question rather than an attendance one.
--   A monthly retainer should follow the classes someone is assigned to
--   even in a month when they were off sick, and a split that jittered
--   with every absence would be harder to explain than it is worth.
--
-- A closed month is not protected from this, on purpose. The lock
-- freezes figures, not inputs - the same rule as sessions and student
-- attendance - so marking a past absence shows up as drift on the
-- Payroll tab and can be carried into the next open month as an
-- adjustment, which is the correct way to claw back an overpayment.
--
-- Teachers are out of scope here: a teacher is named on the session
-- itself, and a teacher not turning up is a cover arrangement rather
-- than a flag.

ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS absence_note text;

COMMENT ON COLUMN public.session_participants.attended IS
  'False when this staff member was rostered for the lesson but did not work it. They stay on the roster - which is the point - and calculate-payroll stops paying them for it. Cost allocation still counts the lesson, because that asks which classes someone works in, not which lessons they made.';

COMMENT ON COLUMN public.session_participants.absence_note IS
  'Optional reason, shown beside the absence on the lesson. Free text; nothing reads it.';

-- Payroll reads this for one assistant across a whole month, so the
-- index that already exists on teaching_assistant_id now wants the flag
-- beside it.
CREATE INDEX IF NOT EXISTS idx_session_participants_ta_attended
  ON public.session_participants (teaching_assistant_id, attended)
  WHERE teaching_assistant_id IS NOT NULL;

-- Marking someone absent takes money off them, which is exactly the kind
-- of act that should be reconstructable a year later.
DO $do$
BEGIN
  IF to_regprocedure('public.audit_row_change()') IS NULL THEN
    RAISE NOTICE 'public.audit_row_change() not present; staff absence will not be audited.';
    RETURN;
  END IF;
  DROP TRIGGER IF EXISTS audit_session_participants ON public.session_participants;
  CREATE TRIGGER audit_session_participants
    AFTER INSERT OR UPDATE OR DELETE ON public.session_participants
    FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
END
$do$;

NOTIFY pgrst, 'reload schema';
