-- ROLLBACK of D4 step 1a (supabase/migrations/20261114090000_d4_floors.sql).
--
-- WHEN: cancelling, moving or deleting a lesson fails with an error that
-- mentions the floor or guard_broken, or a teacher's register / a bill
-- save fails with an error naming one of the triggers below. Nothing is
-- lost by rolling back; tell the conductor.
--
-- TWO PASTES, in this order, in the Supabase SQL editor:
--   1. this file   - drops the seven floor / keep trigger objects of
--                    20261114090000 and nothing else. The floor tables,
--                    their rows, their own guards and the functions stay
--                    (history is kept; nothing reads the floors once
--                    step 2 has run).
--   2. supabase/migrations/20261112091000_session_cancel_guard.sql, again,
--                    unchanged. It is idempotent and D4 changed no
--                    signature: it puts back the two D2 bodies that
--                    20261114090000 replaced (_session_change_assess,
--                    _session_erased_recently), byte for byte. It also adds
--                    one more guard_installed event row (expected).
-- Then run docs/evidence/D-release-fingerprint.sql: all 66 objects match
-- docs/evidence/D-release-fingerprint.expected.json again.
--
-- Not dropped, on purpose: audit_point_transactions (an AFTER audit trigger
-- that refuses nothing; drop it by hand only if point writes fail naming it:
--   DROP TRIGGER IF EXISTS audit_point_transactions ON public.point_transactions;).

BEGIN;
DROP TRIGGER IF EXISTS zz_attendance_evidence_guard ON public.attendance;
DROP TRIGGER IF EXISTS zz_point_evidence_keep       ON public.point_transactions;
DROP TRIGGER IF EXISTS zz_transcript_evidence_keep  ON public.class_transcripts;
DROP TRIGGER IF EXISTS zz_homework_evidence_keep    ON public.homeworks;
DROP TRIGGER IF EXISTS zz_homework_evidence_keep    ON public.homework_submissions;
DROP TRIGGER IF EXISTS zz0_session_evidence_keep    ON public.sessions;
DROP TRIGGER IF EXISTS zz_invoice_state_floor       ON public.invoices;
COMMIT;

SELECT count(*) AS d4_floor_triggers_left
  FROM pg_trigger
 WHERE NOT tgisinternal
   AND tgname IN ('zz_attendance_evidence_guard', 'zz_point_evidence_keep', 'zz_transcript_evidence_keep',
                  'zz_homework_evidence_keep', 'zz0_session_evidence_keep', 'zz_invoice_state_floor');
