-- Fix: marking a student "Late" crashes attendance saving.
--
-- The attendance table was created with a narrow CHECK constraint that only
-- permits 'Present', 'Absent', 'Excused'. The mark-attendance edge function
-- and the classroom UI both offer a "Late" status, so any save that includes
-- a Late student fails the CHECK, the upsert throws, and the function returns
-- a non-2xx error ("Failed to mark attendance").
--
-- Widen the constraint to include 'Late'. Idempotent: drops the existing
-- auto-named constraint first (inline CHECKs are named <table>_<column>_check).

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('Present', 'Absent', 'Excused', 'Late'));
