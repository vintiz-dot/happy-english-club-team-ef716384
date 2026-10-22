// Payroll month locking: does the lock actually stop the write that
// matters, does the close order work, and can a repeat booking still
// charge the school twice?
//
// The write that matters is payroll_summaries, because calculate-payroll
// upserts it on the service role - which bypasses RLS - and the finance
// dashboard invokes calculate-payroll as part of a READ. So the guard has
// to be a trigger, and this is the file that proves it is.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const db = new PGlite();
const refused = async (sql, params = []) => {
  try { await db.query(sql, params); return null; } catch (e) { return e.message; }
};

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE OR REPLACE FUNCTION public.has_role(_uid uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE AS $$ SELECT current_setting('test.role', true) = _role::text $$;

  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text NOT NULL);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text NOT NULL);
  CREATE TABLE public.payroll_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id),
    month text NOT NULL, total_hours numeric DEFAULT 0, total_amount numeric DEFAULT 0,
    sessions_count integer DEFAULT 0,
    UNIQUE (teacher_id, month));
  CREATE TABLE public.expenditures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    amount numeric NOT NULL, category text NOT NULL, memo text, date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), created_by uuid);

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
`);

const UT = "11111111-1111-1111-1111-111111111111";
const UC = "22222222-2222-2222-2222-222222222222";
const UA = "33333333-3333-3333-3333-333333333333";
await db.query(`INSERT INTO auth.users (id) VALUES ($1),($2),($3)`, [UT, UC, UA]);
const T = (await db.query(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1,'Mai'),($2,'Colleague') RETURNING id, full_name`, [UT, UC])).rows;
const MAI = T.find((r) => r.full_name === "Mai").id;
const COLLEAGUE = T.find((r) => r.full_name === "Colleague").id;
const TA = (await db.query(`INSERT INTO public.teaching_assistants (user_id, full_name) VALUES ($1,'Linh') RETURNING id`, [UA])).rows[0].id;

await db.exec(MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n"));
console.log("=== applies ===");
ok("both migrations apply", true);
let second = null;
try { await db.exec(MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n")); } catch (e) { second = e.message; }
ok("and apply a SECOND time unchanged", second === null, second ?? "");

console.log("=== the upsert close-payroll-month actually sends ===");
{
  // The gap that let 42P10 through twice in one sitting: every other
  // assertion in this file writes payroll_lines with a plain INSERT, and a
  // PARTIAL unique index serves a plain INSERT perfectly well.
  // close-payroll-month does not insert. It upserts on (month, teacher_id)
  // and (month, assistant_id), and PostgreSQL will not use a partial index
  // to arbitrate a conflict target that does not repeat its predicate -
  // which PostgREST has no way to express.
  await db.query(`INSERT INTO public.payroll_periods (month, status) VALUES ('2026-08','open')`);

  const upsertTeacher = (amount) => db.query(
    `INSERT INTO public.payroll_lines (month, teacher_id, staff_name, pay_rate_type, hourly_rate_vnd, sessions_count, total_minutes, total_amount_vnd)
     VALUES ('2026-08', $1, 'Mai', 'hourly', 200000, 10, 900, $2)
     ON CONFLICT (month, teacher_id) DO UPDATE SET total_amount_vnd = EXCLUDED.total_amount_vnd`, [MAI, amount]);
  const upsertTa = (amount) => db.query(
    `INSERT INTO public.payroll_lines (month, assistant_id, staff_name, pay_rate_type, per_session_rate_vnd, sessions_count, total_minutes, total_amount_vnd)
     VALUES ('2026-08', $1, 'Linh', 'per_session', 80000, 10, 900, $2)
     ON CONFLICT (month, assistant_id) DO UPDATE SET total_amount_vnd = EXCLUDED.total_amount_vnd`, [TA, amount]);

  let e = null;
  try { await upsertTeacher(3000000); } catch (err) { e = err.message; }
  ok("ON CONFLICT (month, teacher_id) has an index to arbitrate it", e === null, e ?? "");
  e = null;
  try { await upsertTa(800000); } catch (err) { e = err.message; }
  ok("ON CONFLICT (month, assistant_id) too", e === null, e ?? "");

  await upsertTeacher(3100000);
  const r = (await db.query(`SELECT count(*)::int c, sum(total_amount_vnd)::int s FROM public.payroll_lines WHERE month='2026-08'`)).rows[0];
  ok("closing twice updates the line rather than writing a second one", r.c === 2 && r.s === 3900000, `${r.c} row(s), ${r.s}`);

  await db.query(`DELETE FROM public.payroll_lines WHERE month='2026-08'`);
  await db.query(`DELETE FROM public.payroll_periods WHERE month='2026-08'`);
}

console.log("=== why a partial index could not have arbitrated it ===");
{
  // Self-contained, so the mechanism is visible rather than inferred.
  const d2 = new PGlite();
  await d2.exec(`
    CREATE TABLE public.payroll_lines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      month text NOT NULL, teacher_id uuid, assistant_id uuid,
      total_amount_vnd bigint NOT NULL DEFAULT 0);
    CREATE UNIQUE INDEX payroll_lines_month_teacher_key
      ON public.payroll_lines (month, teacher_id) WHERE teacher_id IS NOT NULL;`);
  const U = "44444444-4444-4444-4444-444444444444";
  const up = (d) => d.query(
    `INSERT INTO public.payroll_lines (month, teacher_id, total_amount_vnd) VALUES ('2026-08', $1, 1)
     ON CONFLICT (month, teacher_id) DO UPDATE SET total_amount_vnd = EXCLUDED.total_amount_vnd`, [U]);

  let e = null;
  try { await up(d2); } catch (err) { e = err.message; }
  ok("the partial index fails the upsert outright",
     !!e && /no unique or exclusion constraint/i.test(e), e ?? "it was allowed");
  ok("  and it fails at plan time, before any row is looked at",
     (await d2.query(`SELECT count(*)::int c FROM public.payroll_lines`)).rows[0].c === 0,
     "so it broke every close, not only a repeat one");

  let plain = null;
  try {
    await d2.query(`INSERT INTO public.payroll_lines (month, teacher_id, total_amount_vnd) VALUES ('2026-08', $1, 1)`, [U]);
  } catch (err) { plain = err.message; }
  ok("  while a plain INSERT against the same index is fine", plain === null,
     "which is exactly why a harness that only inserted saw nothing wrong");

  await d2.exec(`
    DROP INDEX public.payroll_lines_month_teacher_key;
    CREATE UNIQUE INDEX payroll_lines_month_teacher_key ON public.payroll_lines (month, teacher_id);`);
  e = null;
  try { await up(d2); } catch (err) { e = err.message; }
  ok("dropping the predicate makes the same upsert work", e === null, e ?? "");
  const dup = await (async () => {
    try {
      await d2.query(`INSERT INTO public.payroll_lines (month, teacher_id, total_amount_vnd) VALUES ('2026-08', $1, 2)`, [U]);
      return null;
    } catch (err) { return err.message; }
  })();
  ok("  and refuses a second line for the same person and month", !!dup, dup ?? "it was allowed");
  await d2.query(`INSERT INTO public.payroll_lines (month, teacher_id, total_amount_vnd) VALUES ('2026-08', NULL, 3)`);
  await d2.query(`INSERT INTO public.payroll_lines (month, teacher_id, total_amount_vnd) VALUES ('2026-08', NULL, 4)`);
  ok("  while assistant rows, which hold teacher_id NULL, are still exempt",
     (await d2.query(`SELECT count(*)::int c FROM public.payroll_lines WHERE teacher_id IS NULL`)).rows[0].c === 2,
     "NULLs are distinct in a UNIQUE index - the predicate was never doing any work");
  await d2.close();
}

console.log("=== booking the same month twice ===");
{
  const book = (amount) => db.query(
    `INSERT INTO public.expenditures (amount, category, memo, date, source_kind, source_key)
     VALUES ($1, 'Teacher Payroll', 'Mai - 2026-09', DATE '2026-09-30', 'payroll', '2026-09:teacher:${MAI}')
     ON CONFLICT (source_kind, source_key) DO UPDATE SET amount = EXCLUDED.amount`, [amount]);
  await book(5000000);
  await book(5200000);
  const r = (await db.query(`SELECT count(*)::int c, sum(amount)::int s FROM public.expenditures WHERE source_kind='payroll'`)).rows[0];
  ok("a second booking updates rather than charging twice", r.c === 1 && r.s === 5200000, `${r.c} row(s), ${r.s}`);

  await db.query(`INSERT INTO public.expenditures (amount, category, memo) VALUES (50000,'Transport','Taxi')`);
  await db.query(`INSERT INTO public.expenditures (amount, category, memo) VALUES (50000,'Transport','Taxi')`);
  ok("two identical hand-entered costs are still two costs",
     (await db.query(`SELECT count(*)::int c FROM public.expenditures WHERE source_kind IS NULL`)).rows[0].c === 2,
     "NULLs are distinct in a UNIQUE constraint, which is why no predicate is needed");

  const halfSourced = await refused(`INSERT INTO public.expenditures (amount, category, source_key) VALUES (1,'X','orphan')`);
  ok("a source_key with no source_kind is refused", !!halfSourced);
}

console.log("=== the close order: lines first, lock last ===");
{
  await db.query(`INSERT INTO public.payroll_periods (month, status) VALUES ('2026-09','open')`);
  const line = await refused(
    `INSERT INTO public.payroll_lines (month, teacher_id, staff_name, pay_rate_type, hourly_rate_vnd, sessions_count, total_minutes, total_amount_vnd)
     VALUES ('2026-09', $1, 'Mai', 'hourly', 200000, 12, 1080, 3600000)`, [MAI]);
  ok("lines can be written while the period is open", line === null, line ?? "");

  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-09'`);
  ok("the month reports as locked",
     (await db.query(`SELECT public.payroll_month_is_locked('2026-09') l`)).rows[0].l === true);
}

console.log("=== what the lock actually refuses ===");
{
  const summary = await refused(
    `INSERT INTO public.payroll_summaries (teacher_id, month, total_amount) VALUES ($1,'2026-09',9999999)
     ON CONFLICT (teacher_id, month) DO UPDATE SET total_amount = EXCLUDED.total_amount`, [MAI]);
  ok("calculate-payroll's summary upsert is refused for a closed month", !!summary,
     "this is the write the finance dashboard makes on a READ, on the service role");
  ok("  and the message says what to do instead",
     /locked/i.test(summary ?? "") && /adjustment/i.test(summary ?? ""), (summary ?? "").slice(0, 90));

  ok("editing a closed month's line is refused",
     !!(await refused(`UPDATE public.payroll_lines SET total_amount_vnd = 1 WHERE month='2026-09'`)));
  ok("deleting one is refused",
     !!(await refused(`DELETE FROM public.payroll_lines WHERE month='2026-09'`)));
  ok("adding one is refused",
     !!(await refused(`INSERT INTO public.payroll_lines (month, assistant_id, staff_name, pay_rate_type, per_session_rate_vnd) VALUES ('2026-09',$1,'Linh','per_session',80000)`, [TA])));

  const other = await refused(
    `INSERT INTO public.payroll_summaries (teacher_id, month, total_amount) VALUES ($1,'2026-10',500)`, [MAI]);
  ok("an OPEN month is untouched by any of this", other === null, other ?? "");
}

console.log("=== the inputs stay editable, on purpose ===");
{
  // Nothing in these migrations touches sessions or attendance. A
  // correction to a closed month must still be possible to make - it just
  // stops restating the month.
  const s = await refused(`UPDATE public.teachers SET full_name = 'Mai N.' WHERE id = $1`, [MAI]);
  ok("a closed month does not freeze the rest of the database", s === null, s ?? "");
}

console.log("=== carrying the correction forward ===");
{
  const adj = await refused(
    `INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, amount_vnd, reason)
     VALUES ('2026-10','2026-09',$1, 200000, 'Three lessons marked Held late')`, [MAI]);
  ok("an adjustment against a later month is allowed", adj === null, adj ?? "");
  ok("a negative adjustment is allowed too",
     (await refused(`INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, amount_vnd, reason) VALUES ('2026-11','2026-09',$1,-50000,'Overpaid')`, [MAI])) === null);
  ok("an adjustment of zero is refused",
     !!(await refused(`INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, amount_vnd, reason) VALUES ('2026-12','2026-09',$1,0,'Nothing')`, [MAI])));
  ok("an adjustment onto its own month is refused",
     !!(await refused(`INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, amount_vnd, reason) VALUES ('2026-09','2026-09',$1,1,'Self')`, [MAI])),
     "that would be restating the closed month by another name");
  ok("an adjustment for both a teacher and a TA is refused",
     !!(await refused(`INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, assistant_id, amount_vnd, reason) VALUES ('2026-10','2026-09',$1,$2,1,'Both')`, [MAI, TA])));
  ok("a malformed month is refused",
     !!(await refused(`INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, amount_vnd, reason) VALUES ('2026-13','2026-09',$1,1,'Bad')`, [MAI])));
}

console.log("=== reopening ===");
{
  await db.query(`UPDATE public.payroll_periods SET status='open', reopened_at=now(), reopen_reason='Closed the wrong month' WHERE month='2026-09'`);
  ok("a reopened month accepts writes again",
     (await refused(`UPDATE public.payroll_lines SET total_amount_vnd = 3700000 WHERE month='2026-09'`)) === null);
  ok("a locked period must carry a locked_at",
     !!(await refused(`UPDATE public.payroll_periods SET status='locked', locked_at=NULL WHERE month='2026-09'`)),
     "a lock with no timestamp is not a record of anything");
}

console.log("=== RLS: pay is not a colleague's business ===");
{
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-09'`);
  const as = async (uid, role) => {
    await db.exec(`SET ROLE authenticated`);
    await db.query(`SELECT set_config('test.uid',$1,false), set_config('test.role',$2,false)`, [uid, role]);
  };

  await as(UT, "teacher");
  ok("a teacher sees their own payroll line",
     (await db.query(`SELECT count(*)::int c FROM public.payroll_lines WHERE teacher_id=$1`, [MAI])).rows[0].c === 1);
  ok("a teacher sees their own adjustments",
     (await db.query(`SELECT count(*)::int c FROM public.payroll_adjustments`)).rows[0].c === 2);
  ok("a teacher can see WHICH months are closed",
     (await db.query(`SELECT count(*)::int c FROM public.payroll_periods WHERE status='locked'`)).rows[0].c === 1,
     "so their own payroll screen can say September is closed");
  ok("a teacher cannot close a month",
     !!(await refused(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-12','locked',now())`)));
  ok("a teacher cannot write themselves an adjustment",
     !!(await refused(`INSERT INTO public.payroll_adjustments (month, origin_month, teacher_id, amount_vnd, reason) VALUES ('2027-01','2026-09',$1,9999999,'Bonus')`, [MAI])));

  await as(UC, "teacher");
  ok("a colleague sees none of Mai's lines",
     (await db.query(`SELECT count(*)::int c FROM public.payroll_lines`)).rows[0].c === 0);
  ok("  nor her adjustments",
     (await db.query(`SELECT count(*)::int c FROM public.payroll_adjustments`)).rows[0].c === 0);

  await as(UT, "admin");
  ok("an admin sees everything",
     (await db.query(`SELECT count(*)::int c FROM public.payroll_lines`)).rows[0].c === 1);
  await db.exec(`RESET ROLE`);
}

console.log("=== the wage bill of a closed month ===");
{
  // 20261022091000, ported from the Lovable agent's drizzle-only
  // migration. Payroll locking froze payroll_lines and the summaries but
  // left the expenditure rows that hold the actual wage bill editable,
  // so a stale tab could still rewrite what a closed month paid out.
  await db.query(`INSERT INTO public.payroll_periods (month, status) VALUES ('2026-11','open')`);

  const book = (month, amount, key) => db.query(
    `INSERT INTO public.expenditures (amount, category, memo, date, source_kind, source_key)
     VALUES ($1, 'Teacher Payroll', 'Mai', ($2 || '-28')::date, 'payroll', $3)
     ON CONFLICT (source_kind, source_key) DO UPDATE SET amount = EXCLUDED.amount
     RETURNING id`, [amount, month, key]);

  const opened = await refused(
    `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key)
     VALUES (4000000, 'Teacher Payroll', '2026-11-30', 'payroll', '2026-11:teacher:mai')`);
  ok("the wage bill can be booked while the month is open", opened === null, opened ?? "");
  const row = (await db.query(`SELECT id FROM public.expenditures WHERE source_key = '2026-11:teacher:mai'`)).rows[0].id;

  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-11'`);

  const edited = await refused(`UPDATE public.expenditures SET amount = 9000000 WHERE id = $1`, [row]);
  ok("once closed, its amount cannot be changed", !!edited, edited ?? "it was allowed");
  ok("  and the message says what to do", /Reopen the month/.test(edited ?? ""), edited ?? "");
  const removed = await refused(`DELETE FROM public.expenditures WHERE id = $1`, [row]);
  ok("  nor can it be deleted", !!removed);
  const added = await refused(
    `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key)
     VALUES (1, 'TA Payroll', '2026-11-30', 'payroll', '2026-11:assistant:linh')`);
  ok("  nor a new one added to that month", !!added);

  // The escape an attacker, or a careless edit, would reach for.
  const smuggled = await refused(
    `UPDATE public.expenditures SET source_kind = NULL, source_key = NULL, date = '2026-12-01' WHERE id = $1`, [row]);
  ok("blanking the source and moving the date out of the month is refused too",
     !!smuggled, smuggled ?? "it was allowed");
  ok("  so the amount is still what the month was closed at",
     // numeric comes back as a string from pglite, as it does from PostgREST
     Number((await db.query(`SELECT amount FROM public.expenditures WHERE id = $1`, [row])).rows[0].amount) === 4000000);

  const handEntered = await refused(
    `INSERT INTO public.expenditures (amount, category, date) VALUES (50000, 'Taxi', '2026-11-04')`);
  ok("an ordinary hand-entered cost in the same closed month is untouched by this",
     handEntered === null, handEntered ?? "");

  // The wage bill booked before source_kind existed carries NULL there,
  // so the guard has to recognise it by the category the payroll button
  // wrote - otherwise the months already on the books, which are the
  // ones most likely to be closed first, are the ones left open.
  const legacyInsert = await refused(
    `INSERT INTO public.expenditures (amount, category, memo, date)
     VALUES (4200000, 'Teacher Payroll', 'Mai - 2026-11', '2026-11-30')`);
  ok("a payroll row with no source_kind is recognised by its category",
     !!legacyInsert, legacyInsert ?? "it was allowed");

  // And one that already exists from before, edited after the close.
  await db.query(`UPDATE public.payroll_periods SET status='open' WHERE month='2026-11'`);
  const old = (await db.query(
    `INSERT INTO public.expenditures (amount, category, memo, date)
     VALUES (4200000, 'TA Payroll', 'Linh - 2026-11', '2026-11-30') RETURNING id`)).rows[0].id;
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-11'`);
  const legacyEdit = await refused(`UPDATE public.expenditures SET amount = 1 WHERE id = $1`, [old]);
  ok("  so a wage row booked before source_kind existed is frozen too",
     !!legacyEdit, legacyEdit ?? "it was allowed");
  ok("  and its amount is intact",
     Number((await db.query(`SELECT amount FROM public.expenditures WHERE id = $1`, [old])).rows[0].amount) === 4200000);

  await db.query(`UPDATE public.payroll_periods SET status='open', reopened_at=now() WHERE month='2026-11'`);
  const afterReopen = await refused(`UPDATE public.expenditures SET amount = 4500000 WHERE id = $1`, [row]);
  ok("reopening the month makes it editable again", afterReopen === null, afterReopen ?? "");
}

console.log("=== closing a month still works with the guard in place ===");
{
  // The order close-payroll-month actually uses: lines, then the
  // expenditures, then the lock. If the guard fired on the booking the
  // close would fail outright, which is the failure mode worth proving
  // against rather than reasoning about.
  await db.query(`INSERT INTO public.payroll_periods (month, status) VALUES ('2026-10','open')`);
  const line = await refused(
    `INSERT INTO public.payroll_lines (month, teacher_id, staff_name, pay_rate_type, hourly_rate_vnd, sessions_count, total_minutes, total_amount_vnd)
     VALUES ('2026-10', $1, 'Mai', 'hourly', 200000, 10, 900, 3000000)`, [MAI]);
  ok("lines go in while the period is open", line === null, line ?? "");
  const booked = await refused(
    `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key)
     VALUES (3000000, 'Teacher Payroll', '2026-10-31', 'payroll', '2026-10:teacher:mai2')`);
  ok("the wage bill goes in while the period is open", booked === null, booked ?? "");
  const lock = await refused(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-10'`);
  ok("and the lock goes on last, without the guard refusing the close", lock === null, lock ?? "");
  ok("  leaving the month locked", (await db.query(`SELECT public.payroll_month_is_locked('2026-10') l`)).rows[0].l === true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
