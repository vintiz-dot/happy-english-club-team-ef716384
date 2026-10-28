# Payroll rules
- Admin payroll totals and duration variances resolve effective-dated staff rates per session through the existing pay-history resolver; this keeps corrections consistent with calculate-payroll.
- Closed payroll expenditure rows are protected by a database trigger as well as a fresh period check before UI booking; this prevents stale clients from rewriting booked costs.
- Run payroll regression tests with `bun test scripts/payrollCalculation.test.ts`; tests live outside the browser-only source tree.

# Database migrations
- Migrations under `supabase/migrations/` are the authoritative tree: the owner applies them by pasting into the Supabase SQL editor. A DB change that exists only under `drizzle/migrations/` has not reached that tree.
- So port every new `drizzle/migrations/*.sql` into `supabase/migrations/` as soon as it appears, and point its test at the ported copy. Twice now a guard has been written, tested and committed while being inert: 20261022091000 and 20261027090000. A test that reads its SQL out of `drizzle/` is the tell.
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

# The in-app assistant (`supabase/functions/chat`)
- It answers as the person signed in. Who they are - name, every role, their teacher/TA record and classes, a parent's children, the child a shared login has selected, today's date in Hanoi, the page they are on - is worked out on the server from the JWT and written into the prompt by `_lib/chat-context.ts`. Never take identity from the conversation, and keep the scope rule per role: telling an admin "you can only discuss your own records" is the bug this replaced.
- Every tool reads through the caller's own client, so RLS stays the boundary. `studentFor` / `classFor` also hold parents, students and teachers to their own children, records and classes, because RLS is wider than that for leaderboards and the shared calendar. No writes, no rpc, no service role for data.
- Money: report `recorded_payment` (paid in that month) and the trigger-maintained `carry_*` balances. `invoices.paid_amount` is cumulative across months and reads as overpayment.
- A new tool goes into the "every tool" scenario of `scripts/pgtest/chat-assistant.test.mjs`. Its stand-in for PostgREST takes the real columns and foreign keys from `src/integrations/supabase/types.ts`, so a dead column fails there instead of in a parent's chat. The panel sends `context` (page, selected child); a function that predates it ignores it, so the two can ship in either order.

# Shared modules
- Cancelled-session attendance is guarded in the database with a parent-row lock; both tuition readers share the fail-closed session eligibility helper, cancellation functions refresh canonical invoices, and confirmation refreshes before approval to prevent stale charges.
- Tuition readers resolve missing/pending sibling assignments through the family-scoped calculator; its internal tuition preview skips resolution and invoice writes to prevent recursive calls and dry-run mutations. Discount cards render the returned winner class and amount rather than pricing them again.
- Deno cannot import from `src/`, so these pairs exist twice on purpose: payRate/pay-rate, payHistory/pay-history, payrollSessions/payroll-sessions. Change one and copy it to the other; `scripts/pgtest/run.mjs` fails if a pair drifts, and names the first line that differs.
- Those shared modules import nothing. That is what makes copying them possible, and the mirror test asserts it.
- `payrollSessions` currently has no importer in `src/` - the live caller is the Deno copy. It is kept mirrored so that the next browser code needing to know which lessons count imports it instead of restating the statuses, the participant type or the attendance rule.
- `datedPayrollTotal` in `src/lib/payrollCalculation.ts` also has no production caller now. It is correct and tested; it is not a licence to price payroll in the browser again.

# Stars / Pixel Pal sync
- One-way: Pixel Pal's feed -> HEC. Every decision about a child's record lives in `stars_sync__apply_event` (`supabase/migrations/20261027100000_stars_sync_engine.sql`), one transaction per page. The edge function `stars-sync` only fetches, calls it, and runs after-effects. Do not move decisions into TypeScript.
- What a register mark does besides the row - tuition recalc for Absent/Excused, streaks for Present - is defined once, in `supabase/functions/_lib/attendance-effects.ts`. `mark-attendance` runs it inline. The sync does not: `stars_sync__apply_event` queues each follow-up in `stars_sync_effects` in the same transaction as the mark, and `stars-sync` drains the queue with `recalcTuition` / `advanceStreaks`, a bounded amount per run (calculate-tuition allows 30 calls a minute), keeping anything refused. Do not go back to running them after the commit - that is how they were lost. The Scheduled->Held flip that pays the teacher is in both the SQL engine and mark-attendance; change one, change the other.
- The sync acts as a chosen teacher and asks `is_teacher_of_class` before every write, exactly as mark-attendance does. It must never overwrite a mark a person made: seeded placeholders (`marked_by IS NULL AND status = 'Present'` - repair-attendance also writes `marked_by IS NULL`, with an admin's chosen status) and rows it wrote itself (`stars_sync_attendance_state`, compared by value) are the only rows it may change. Anything else is a conflict for an admin, and `stars_sync_resolve_conflict` settles one in a single transaction that refuses if anything moved since it was raised.
- One Pixel Pal record per child per lesson stands at a time (Pixel Pal sends a change as a withdrawal plus a new record). `stars_sync_attendance_state.event_id` is the record the register reflects: a newer record inherits the older one's `prev` (HEC's value before the sync), withdrawing a record that is not the current one changes nothing, and an older record arriving late is a `duplicate`. Records are ordered by `seq`, never by when they were processed.
- A follow-up job is deleted only at the `generation` the drain read (`stars_sync_effects_done`), so a request that lands mid-run survives. Streak steps from the drain are dated by the lesson (`advanceStreaks({ lessonDate })`) and worked in lesson order; mark-attendance leaves `lessonDate` out and keeps "today".
- `stars-sync-upgrade.test.mjs` runs the old engine and then pastes the fix over it, as production does. A migration that changes how records are judged needs a case there for what the previous engine already decided.
- Run `node scripts/pgtest/run.mjs`; `stars-sync-engine.test.mjs` drives the real migrations in order and asserts what children's registers and points end up as.

# Agent integrations (MCP)
- Agent integrations (MCP) live in `src/lib/mcp/` (one tool per file, OAuth as the caller, RLS-scoped; never service role). `supabase/functions/mcp` is generated by the Vite plugin — do not hand-edit; it deploys only on publish.
- On Windows the plugin (`@lovable.dev/mcp-js` 3.3.0) writes that file as `import mcp from "npm:C:\..."` - a path on the building machine - so `vite.config.ts` leaves it off there. A tool edited on a Windows machine is regenerated by Lovable's build, not by yours. `edge-functions.test.mjs` fails if a machine path reaches the file anyway.

# Checking a change
- `tsc --noEmit` at the root loads ZERO files: tsconfig.json is a solution file. The app check is `tsc --noEmit -p tsconfig.app.json`, and `scripts/pgtest/run.mjs` runs it (`app-typecheck.test.mjs`), asserting it loaded the source before believing a clean result.
- Lovable keeps `bun.lock` only. When it adds a dependency, run `npm install` so `package-lock.json` agrees - an out-of-sync lockfile fails `npm ci`.

# Tuition screens and AI explanations
- Screens that read calculate-tuition retry on their own while `siblingState.status === "unresolved"`, using `src/lib/siblingRetry.ts` (bounded backoff); the overview retries only the unresolved students, so retries don't re-contend the month lock for everyone.
- `explain-family-tuition` (admin-only) words figures fetched from calculate-tuition as the calling admin; the model never prices anything and refuses (409) while the family discount is unresolved.
