# Payroll rules
- Admin payroll totals and duration variances resolve effective-dated staff rates per session through the existing pay-history resolver; this keeps corrections consistent with calculate-payroll.
- Closed payroll expenditure rows are protected by a database trigger as well as a fresh period check before UI booking; this prevents stale clients from rewriting booked costs.
- Run payroll regression tests with `bun test scripts/payrollCalculation.test.ts`; tests live outside the browser-only source tree.

# Database migrations
- Migrations under `supabase/migrations/` are the authoritative tree: the owner applies them by pasting into the Supabase SQL editor. A DB change that exists only under `drizzle/migrations/` has not reached that tree.
- A new table needs `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` and `GRANT ALL ... TO service_role` explicitly, because 20260712023825 revoked the defaults on public. Without them PostgREST reports the table as missing from the schema cache, not as forbidden.
- A PARTIAL unique index cannot serve as an `ON CONFLICT` target; PostgREST upserts against one fail with 42P10 at plan time. Use a plain UNIQUE index - NULLs are distinct in one anyway.
- Run the migration regression tests with `node scripts/pgtest/run.mjs` before changing anything under payroll, expenditures or class overhead. They execute the real migration files against an in-process Postgres.

# Payroll is computed in ONE place
- `supabase/functions/calculate-payroll` is the only thing that works out what staff are owed. It feeds close-payroll-month, payroll_lines, the finance dashboard, the per-class figures and the admin Payroll screen. Do not add a second calculation; there were two until 23 Oct 2026 and they drifted three times, always in the direction of overpaying.
- `src/components/admin/tabs/PayrollTab.tsx` reads that function and renders it. `src/lib/payrollRows.ts` maps the response to the screen's rows - renaming and arithmetic over figures the function already decided, no pricing. A new column on that screen is a new field in the function's response, not a new query.
- A CLOSED month is the one case the screen needs differently: the function reports the frozen `payroll_lines` figures, and keeps the recomputed ones in `live`. PayrollMonthLock compares what the screen shows against those same stored lines to find corrections worth carrying forward, so the screen must read `live`. Feed it the frozen figures and it compares them with themselves and silently stops reporting drift.
- Adding a field to the response means redeploying the function. `payrollRows` falls back for every field it reads, so a client ahead of the deploy degrades rather than breaks - keep it that way.
- Run `node scripts/pgtest/run.mjs` after touching any of it; `payroll-rows.test.mjs` covers the mapping, including the closed-month case and the not-yet-redeployed one.
- There is no Deno on these machines and the functions deploy by hand, so `scripts/pgtest/edge-functions.test.mjs` type-checks `supabase/functions` with the repo TypeScript and the remote imports stubbed. It catches a symbol used but not imported, which is otherwise found by the Supabase deploy. It cannot check what the remote packages declare.

# Shared modules
- Tuition readers resolve missing/pending sibling assignments through the family-scoped calculator; its internal tuition preview skips resolution and invoice writes to prevent recursive calls and dry-run mutations. Discount cards render the returned winner class and amount rather than pricing them again.
- Deno cannot import from `src/`, so these pairs exist twice on purpose: payRate/pay-rate, payHistory/pay-history, payrollSessions/payroll-sessions. Change one and copy it to the other; `scripts/pgtest/run.mjs` fails if a pair drifts, and names the first line that differs.
- Those shared modules import nothing. That is what makes copying them possible, and the mirror test asserts it.
- `payrollSessions` currently has no importer in `src/` - the live caller is the Deno copy. It is kept mirrored so that the next browser code needing to know which lessons count imports it instead of restating the statuses, the participant type or the attendance rule.
- `datedPayrollTotal` in `src/lib/payrollCalculation.ts` also has no production caller now. It is correct and tested; it is not a licence to price payroll in the browser again.
