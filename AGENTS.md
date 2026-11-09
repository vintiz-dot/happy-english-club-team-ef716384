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
- Every tool reads through the caller's own client, so RLS stays the boundary. `studentFor` / `classFor` also hold parents, students and teachers to their own children, records and classes, because RLS is wider than that for leaderboards and the shared calendar. No writes and no service role for data. The one rpc is `ai_action_preview`, which is STABLE, so Postgres refuses any write in it.
- Admins can have it SET THINGS UP (create a student, enrol, a % discount for some months, a family, a sibling-discount hold, a tuition payment). The model only fills in `propose_changes` with values as typed; `_lib/chat-plan.ts` reads dates one way or asks, matches names or asks, and checks percentages and amounts against the admin's own words; `ai_action_preview` checks the plan and words the card. Only the admin's Confirm runs `ai_action_apply`, which checks again and does all of it or none, logged in `ai_actions` (`supabase/migrations/20261107090000`). `ai_action_undo` reverses one action in one click and refuses, with reasons, once a person has done something that depends on it - every table with a `student_id` column is counted, so a new table is covered without anyone remembering it. Do not add a way for the model, or the chat function, to call apply or undo. A new kind of step needs its check in `ai_plan_check`, its write in apply, its reversal in undo and cases in `ai-actions.test.mjs`.
- `students.sibling_discount_from` holds a child out of the family sibling discount until that date: the family is worked out as if the child were not in it. `_lib/sibling-hold.ts` is the one rule, used by compute-sibling-discounts and projectedByFamilyPerClass.
- Money: report `recorded_payment` (paid in that month) and the trigger-maintained `carry_*` balances. `invoices.paid_amount` is cumulative across months and reads as overpayment.
- A new tool goes into the "every tool" scenario of `scripts/pgtest/chat-assistant.test.mjs`. Its stand-in for PostgREST takes the real columns and foreign keys from `src/integrations/supabase/types.ts`, so a dead column fails there instead of in a parent's chat. The panel sends `context` (page, selected child); a function that predates it ignores it, so the two can ship in either order.

# Shared modules
- Cancelled-session attendance is guarded in the database with a parent-row lock; both tuition readers share the fail-closed session eligibility helper, cancellation functions refresh canonical invoices, and confirmation refreshes before approval to prevent stale charges.
- Tuition readers resolve missing/pending sibling assignments through the family-scoped calculator; its internal tuition preview skips resolution and invoice writes to prevent recursive calls and dry-run mutations. Discount cards render the returned winner class and amount rather than pricing them again.
- Deno cannot import from `src/`, so these pairs exist twice on purpose: payRate/pay-rate, payHistory/pay-history, payrollSessions/payroll-sessions. Change one and copy it to the other; `scripts/pgtest/run.mjs` fails if a pair drifts, and names the first line that differs.
- Those shared modules import nothing. That is what makes copying them possible, and the mirror test asserts it.
- `payrollSessions` currently has no importer in `src/` - the live caller is the Deno copy. It is kept mirrored so that the next browser code needing to know which lessons count imports it instead of restating the statuses, the participant type or the attendance rule.
- `datedPayrollTotal` in `src/lib/payrollCalculation.ts` also has no production caller now. It is correct and tested; it is not a licence to price payroll in the browser again.

# Stars Sync screens
- `src/lib/starsRecords.ts` reads the record log and `src/lib/starsLink.ts` works out who an unlinked Pixel Pal child probably is. Both are pure, and tested by `stars-records.test.mjs` and `stars-link.test.mjs`. The screens in `src/components/admin/stars/` only render them.
- The link tool suggests and an admin decides. Nothing links a child on its own, however sure it is: a name match can hand one child's register to another (`docs/STARS_SYNC_SPEC.md`, decision 2). Do not add an auto-link, even for "the only one left".
- Pixel Pal's names reach the page from `stars-roster` or a paste and stay in memory. Never save them in HEC. A filter or a "no" answer may go in localStorage; those hold numbers, not names.

# Agent integrations (MCP)
- Agent integrations (MCP) live in `src/lib/mcp/` (one tool per file, OAuth as the caller, RLS-scoped; never service role). `supabase/functions/mcp` is generated by the Vite plugin — do not hand-edit; it deploys only on publish.
- On Windows the plugin (`@lovable.dev/mcp-js` 3.3.0) writes that file as `import mcp from "npm:C:\..."` - a path on the building machine - so `vite.config.ts` leaves it off there. A tool edited on a Windows machine is regenerated by Lovable's build, not by yours. `edge-functions.test.mjs` fails if a machine path reaches the file anyway.

# Checking a change
- `tsc --noEmit` at the root loads ZERO files: tsconfig.json is a solution file. The app check is `tsc --noEmit -p tsconfig.app.json`, and `scripts/pgtest/run.mjs` runs it (`app-typecheck.test.mjs`), asserting it loaded the source before believing a clean result.
- Lovable keeps `bun.lock` only. When it adds a dependency, run `npm install` so `package-lock.json` agrees - an out-of-sync lockfile fails `npm ci`.

# Tuition screens and AI explanations
- Screens that read calculate-tuition retry on their own while `siblingState.status === "unresolved"`, using `src/lib/siblingRetry.ts` (bounded backoff); the overview retries only the unresolved students, so retries don't re-contend the month lock for everyone.
- `explain-family-tuition` (admin-only) words figures fetched from calculate-tuition as the calling admin; the model never prices anything and refuses (409) while the family discount is unresolved.

# Nested rules
- Subdirectories carry their own `AGENTS.md` for the files there: read `supabase/AGENTS.md` before database, migration or edge-function work, and `src/components/leaderboard/AGENTS.md` before class-board changes.

# Frozen bills
- `invoices.tuition_frozen` locks a bill's charged figures (base, discount, total, class breakdown): a trigger keeps them on every update, and calculate-tuition / calculate-tuition-bulk report the saved figures instead of repricing. Used when enrollment history is corrected but what was billed must stand; only an admin explicitly setting it false unfreezes.

# Payment month
- Payment forms share `useTuitionMonthConfirmation`: explicitly confirm the target invoice month separately from receipt date, resetting on reopen/month changes; `family-payment` requires and filters by that month, using monthly `recorded_payment` rather than cumulative `paid_amount`.

# Video homework
- `homeworks.submission_type = 'video'` switches a homework to the in-app recorder (`src/components/video-homework/`). Schema, policies and the approval RPC are `supabase/migrations/20261109090000_video_homework.sql`; `scripts/pgtest/video-homework.test.mjs` runs it.
- Measure, then judge: `analyze-video-submission` transcribes the separate audio track (OpenAI), lets Gemini describe the video (optional), reads the Azure pronunciation summary the browser measured while recording (optional), and asks Claude (`_lib/claude-json.ts`) to score each rubric criterion with quoted evidence. The 0-100 score is `weightedScore` in `videoHomework.ts` / `_lib/video-homework.ts` (a mirrored pair), never the model's number.
- Nothing reaches a family before a teacher approves. `video_analyses` has no family policy; families read the approved report through `get_video_homework_for_student`, which returns only the `final_*` fields. Keep it that way: do not add a family SELECT policy to `video_analyses`.
- Classmates see videos, never scores: the wall is `get_class_video_wall` and the storage policy lets a classmate read only an approved, shared video and its frames, not the audio track.
- `approve_video_feedback` writes the grade, points (`award_homework_points`), error log + SRS cards, a `speaking` skill score and a CEFR point in one transaction, and replaces what an earlier approval wrote. Add any new side effect there, with a case in the test.
