# Payroll rules
- Admin payroll totals and duration variances resolve effective-dated staff rates per session through the existing pay-history resolver; this keeps corrections consistent with calculate-payroll.
- Closed payroll expenditure rows are protected by a database trigger as well as a fresh period check before UI booking; this prevents stale clients from rewriting booked costs.
- Run payroll regression tests with `bun test scripts/payrollCalculation.test.ts`; tests live outside the browser-only source tree.

# Database migrations
- Migrations under `supabase/migrations/` are the authoritative tree: the owner applies them by pasting into the Supabase SQL editor. A DB change that exists only under `drizzle/migrations/` has not reached that tree.
- A new table needs `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role` explicitly, because 20260712023825 revoked the defaults on public. Without them PostgREST reports the table as missing from the schema cache, not as forbidden.
- A PARTIAL unique index cannot serve as an `ON CONFLICT` target; PostgREST upserts against one fail with 42P10 at plan time. Use a plain UNIQUE index - NULLs are distinct in one anyway.
- Run the migration regression tests with `node scripts/pgtest/run.mjs` before changing anything under payroll, expenditures or class overhead. They execute the real migration files against an in-process Postgres.

# Shared modules
- Pay is worked out in two places: `supabase/functions/calculate-payroll` (the authority, which feeds close-payroll-month, payroll_lines and the per-class figures) and `src/components/admin/tabs/PayrollTab.tsx` (which recomputes the month for its own table, CSV and the live totals PayrollMonthLock reads). They have drifted three times.
- Which lessons a person is paid for is defined once, in `src/lib/payrollSessions.ts`, with a byte-identical Deno copy at `supabase/functions/_lib/payroll-sessions.ts`. Do not restate the statuses, the participant type or the attendance rule anywhere else - import them.
- Deno cannot import from `src/`, so these pairs exist twice on purpose: payRate/pay-rate, payHistory/pay-history, payrollSessions/payroll-sessions. Change one and copy it to the other; `scripts/pgtest/run.mjs` fails if a pair drifts, and names the first line that differs.
- Those shared modules import nothing. That is what makes copying them possible, and the mirror test asserts it.
