# Payroll rules
- Admin payroll totals and duration variances resolve effective-dated staff rates per session through the existing pay-history resolver; this keeps corrections consistent with calculate-payroll.
- Closed payroll expenditure rows are protected by a database trigger as well as a fresh period check before UI booking; this prevents stale clients from rewriting booked costs.
- Run payroll regression tests with `bun test scripts/payrollCalculation.test.ts`; tests live outside the browser-only source tree.

# Database migrations
- Migrations under `supabase/migrations/` are the authoritative tree: the owner applies them by pasting into the Supabase SQL editor. A DB change that exists only under `drizzle/migrations/` has not reached that tree.
- A new table needs `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role` explicitly, because 20260712023825 revoked the defaults on public. Without them PostgREST reports the table as missing from the schema cache, not as forbidden.
- A PARTIAL unique index cannot serve as an `ON CONFLICT` target; PostgREST upserts against one fail with 42P10 at plan time. Use a plain UNIQUE index - NULLs are distinct in one anyway.
- Run the migration regression tests with `node scripts/pgtest/run.mjs` before changing anything under payroll, expenditures or class overhead. They execute the real migration files against an in-process Postgres.
