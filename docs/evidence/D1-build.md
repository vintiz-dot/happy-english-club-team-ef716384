# D1 - Build log: `session_held_evidence`

Spec: `docs/evidence/D1-evidence-model.md`. Written and tested only; NOT applied to any database.

Files:

- `supabase/migrations/20261112090000_session_held_evidence.sql`
- `scripts/pgtest/session-evidence.test.mjs`
- one entry in `scripts/pgtest/run.mjs`

## Log

1. Merged `claude/hec-conductor-setup-efbaa5`; read root `AGENTS.md`, `supabase/AGENTS.md`, the D1 design, `run.mjs`, `cancelled-lessons.test.mjs`.
2. Verified the design's schema claims against the migrations and `src/integrations/supabase/types.ts` (attendance, class_transcripts, homeworks, homework_submissions, invoices, point_transactions, session_participants, sessions, stars_* tables, `app_role` = admin/teacher/family/student, `is_teacher_of_class(user_id uuid, class_id uuid)`, `payroll_month_is_locked(text)`, `has_role(uuid, app_role)`).
3. Probed pglite 0.2.17: `Asia/Ho_Chi_Minh` resolves, `sha256(bytea)` exists. So the function uses `Asia/Ho_Chi_Minh` as designed; no Bangkok fallback needed.
4. Wrote the migration.

## Deviations from the design

