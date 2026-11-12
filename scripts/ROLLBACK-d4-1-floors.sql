-- ROLLBACK of D4 step 1a (supabase/migrations/20261114090000_d4_floors.sql).
--
-- WHEN: cancelling, moving or deleting a lesson fails with an error that
-- mentions the floor or guard_broken, or a teacher's register / a bill
-- save fails with an error naming one of the triggers below. Nothing is
-- lost by rolling back; tell the conductor.
--
-- TWO PASTES, in this order, in the Supabase SQL editor:
--   1. this file   - drops the seven floor / keep trigger objects of
--                    20261114090000 and nothing else.
--   2. supabase/migrations/20261112091000_session_cancel_guard.sql, again,
--                    unchanged. It is idempotent and D4 changed no
--                    signature: it puts back the two D2 bodies that
--                    20261114090000 replaced (_session_change_assess,
--                    _session_erased_recently), byte for byte. It also adds
--                    one more guard_installed event row (expected).
-- Then run docs/evidence/D-release-fingerprint.sql: all 66 objects match
-- docs/evidence/D-release-fingerprint.expected.json again.
--
-- WHAT STAYS AFTER BOTH PASTES, on purpose (scripts/pgtest/d4-rollback.test.mjs
-- checks this exact list):
--   * the tables session_evidence_floor and invoice_state_floor, with their
--     rows, RLS, admin-read policy and their own guard / no-truncate
--     triggers. They are history (what a lesson or a bill once had): D4 never
--     deletes history, a later re-paste of 20261114090000 reads them again,
--     and nothing reads them while D4 is rolled back.
--   * 16 functions of the file (_caller_lane, _floor_table_guard,
--     _floor_families_or, _floor_causes_push, _floor_mark_level,
--     _floor_point_level, _floor_transcript_level, _session_evidence_keep,
--     session_effective_level, invoice_floor_state,
--     _attendance_evidence_guard, _point_evidence_keep,
--     _transcript_evidence_keep, _homework_evidence_keep,
--     _session_evidence_keep_trg, _invoice_state_floor). No API role can
--     execute any of them and, after step 2, nothing calls them except
--     _floor_table_guard (the tables' own guard, which must stay with the
--     tables). Dropping them here would break the D4 _session_change_assess
--     between the two pastes (it calls session_effective_level), and buys
--     nothing.
--   * the trigger audit_point_transactions: an AFTER audit trigger
--     (20261009130000's audit_row_change) that refuses nothing and records
--     who changed or deleted a point. Drop it by hand only if point writes
--     fail naming it:
--       DROP TRIGGER IF EXISTS audit_point_transactions ON public.point_transactions;

BEGIN;
SET LOCAL lock_timeout = '5s';
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
