// staff_pay_rates: the backfill must not move a single number, the
// resolver must agree with the SQL rule, the constraints must hold, and a
// teacher must not be able to give themselves a raise.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${extra ? " :: " + extra : ""}`);
  cond ? pass++ : fail++;
};
/** Run SQL expecting it to be rejected; returns the error message or null. */
const refused = async (sql, params = []) => {
  try { await db.query(sql, params); return null; } catch (e) { return e.message; }
};

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE OR REPLACE FUNCTION public.has_role(_uid uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE AS $$ SELECT current_setting('test.role', true) = _role::text $$;

  CREATE TABLE public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    pay_rate_type text NOT NULL DEFAULT 'hourly',
    hourly_rate_vnd integer NOT NULL DEFAULT 0,
    per_session_rate_vnd integer NOT NULL DEFAULT 0);
  CREATE TABLE public.teaching_assistants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    pay_rate_type text NOT NULL DEFAULT 'hourly',
    hourly_rate_vnd integer NOT NULL DEFAULT 0,
    per_session_rate_vnd integer NOT NULL DEFAULT 0);

  GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
`);

// Three teachers and a TA, spanning both pay bases and one with nothing set.
const U = {
  hourly: "11111111-1111-1111-1111-111111111111",
  session: "22222222-2222-2222-2222-222222222222",
  unset: "33333333-3333-3333-3333-333333333333",
  ta: "44444444-4444-4444-4444-444444444444",
};
await db.query(`INSERT INTO auth.users (id) VALUES ($1),($2),($3),($4)`, Object.values(U));
const trows = (await db.query(`
  INSERT INTO public.teachers (user_id, full_name, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd)
  VALUES ($1,'Hourly Hannah','hourly',200000,0),
         ($2,'Session Sam','per_session',0,250000),
         ($3,'Unset Una','hourly',0,0)
  RETURNING id, full_name`, [U.hourly, U.session, U.unset])).rows;
const T = Object.fromEntries(trows.map((r) => [r.full_name.split(" ")[0], r.id]));
const TA = (await db.query(`
  INSERT INTO public.teaching_assistants (user_id, full_name, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd)
  VALUES ($1,'Assistant Ada','per_session',0,80000) RETURNING id`, [U.ta])).rows[0].id;

// ---------------------------------------------------------------- apply
const sql = MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");
await db.exec(sql);
console.log("=== applies ===");
ok("the migration applies", true);
// Re-runnability is not optional here: Lovable has re-applied files before.
let second = null;
try { await db.exec(sql); } catch (e) { second = e.message; }
ok("and applies a SECOND time unchanged", second === null, second ?? "");

console.log("=== the backfill moves no money ===");
{
  const n = (await db.query(`SELECT count(*)::int c FROM public.staff_pay_rates`)).rows[0].c;
  ok("one baseline row per member of staff, not two after the re-run", n === 4, `got ${n}`);

  const all = (await db.query(`
    SELECT t.full_name, t.pay_rate_type ct, t.hourly_rate_vnd ch, t.per_session_rate_vnd cs,
           r.pay_rate_type rt, r.hourly_rate_vnd rh, r.per_session_rate_vnd rs,
           to_char(r.effective_from,'YYYY-MM-DD') effective_from
    FROM public.teachers t JOIN public.staff_pay_rates r ON r.teacher_id = t.id`)).rows;
  ok("every baseline starts at 1900-01-01",
     all.every((r) => r.effective_from === "1900-01-01"),
     all.map((r) => r.effective_from).join(" "));
  ok("Hourly Hannah's baseline is her exact current rate",
     all.some((r) => r.full_name === "Hourly Hannah" && r.rt === "hourly" && r.rh === 200000 && r.rs === 0));
  ok("Session Sam's basis and amount both carry over",
     all.some((r) => r.full_name === "Session Sam" && r.rt === "per_session" && r.rs === 250000 && r.rh === 0));
  ok("a teacher with no rate set becomes 1 VND, not 0",
     all.some((r) => r.full_name === "Unset Una" && r.rh === 1),
     "0 would fail the check constraint and abort the migration for the whole school");
  ok("the TA is backfilled too",
     (await db.query(`SELECT per_session_rate_vnd s FROM public.staff_pay_rates WHERE assistant_id=$1`, [TA])).rows[0].s === 80000);
}

console.log("=== every past month still prices exactly as it does today ===");
{
  for (const [name, id] of Object.entries(T)) {
    const row = (await db.query(`
      SELECT public.teacher_rate_on($1, DATE '2026-03-15') r,
             jsonb_build_object('pay_rate_type', pay_rate_type,
                                'hourly_rate_vnd', hourly_rate_vnd,
                                'per_session_rate_vnd', per_session_rate_vnd) cur
      FROM public.teachers WHERE id = $1`, [id])).rows[0];
    const r = row.r, c = row.cur;
    const same = r.pay_rate_type === c.pay_rate_type &&
      // Una is the deliberate exception: 0 became 1.
      (name === "Unset" || (r.hourly_rate_vnd === c.hourly_rate_vnd && r.per_session_rate_vnd === c.per_session_rate_vnd));
    ok(`  ${name}: March 2026 resolves to the current rate`, same, JSON.stringify(r));
  }
}

console.log("=== a raise from a date, which is the whole point ===");
{
  await db.query(`
    INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, note)
    VALUES ($1, DATE '2026-11-01', 'hourly', 260000, 0, 'Annual review')`, [T.Hourly]);
  const on = async (d) => (await db.query(`SELECT public.teacher_rate_on($1,$2::date) r`, [T.Hourly, d])).rows[0].r;

  ok("October is still priced at the old rate", (await on("2026-10-31")).hourly_rate_vnd === 200000);
  ok("the raise applies from its own date, inclusive", (await on("2026-11-01")).hourly_rate_vnd === 260000);
  ok("and onwards", (await on("2027-06-01")).hourly_rate_vnd === 260000);
  ok("a month already paid cannot be moved by a future raise",
     (await on("2026-03-15")).hourly_rate_vnd === 200000,
     "this is the behaviour the whole table exists for");
}

console.log("=== a backdated correction, which is the other thing asked for ===");
{
  // "Sam has always been per-session at 300k, we recorded 250k."
  await db.query(`
    UPDATE public.staff_pay_rates SET per_session_rate_vnd = 300000, note = 'Corrected: always 300k'
    WHERE teacher_id = $1 AND effective_from = DATE '1900-01-01'`, [T.Session]);
  const r = (await db.query(`SELECT public.teacher_rate_on($1, DATE '2026-02-01') r`, [T.Session])).rows[0].r;
  ok("amending the baseline re-prices history, on purpose", r.per_session_rate_vnd === 300000);

  // The other route: switch basis from a date in the past.
  await db.query(`
    INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, note)
    VALUES ($1, DATE '2026-09-01', 'per_session', 0, 240000, 'Moved to per-session from September')`, [T.Hourly]);
  const sept = (await db.query(`SELECT public.teacher_rate_on($1, DATE '2026-09-15') r`, [T.Hourly])).rows[0].r;
  const aug = (await db.query(`SELECT public.teacher_rate_on($1, DATE '2026-08-15') r`, [T.Hourly])).rows[0].r;
  ok("hourly -> per-session from a past date takes effect that day", sept.pay_rate_type === "per_session" && sept.per_session_rate_vnd === 240000);
  ok("  and August, before it, is untouched", aug.pay_rate_type === "hourly" && aug.hourly_rate_vnd === 200000);
  ok("  while November's later raise still wins over it",
     (await db.query(`SELECT public.teacher_rate_on($1, DATE '2026-11-05') r`, [T.Hourly])).rows[0].r.hourly_rate_vnd === 260000);
}

console.log("=== the database refuses what must not be stored ===");
{
  ok("a row for nobody is refused",
     !!(await refused(`INSERT INTO public.staff_pay_rates (effective_from, pay_rate_type, hourly_rate_vnd) VALUES (DATE '2026-01-01','hourly',1)`)));
  ok("a row for a teacher AND a TA is refused",
     !!(await refused(`INSERT INTO public.staff_pay_rates (teacher_id, assistant_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,$2,DATE '2026-01-01','hourly',1)`, [T.Hourly, TA])));
  ok("hourly with a zero rate is refused",
     !!(await refused(`INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,DATE '2025-01-01','hourly',0)`, [T.Session])));
  ok("per-session with an hourly amount set is refused",
     !!(await refused(`INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd) VALUES ($1,DATE '2025-02-01','per_session',100,200)`, [T.Session])),
     "the unused column must stay 0 so nothing can read a plausible wrong number out of it");
  ok("two rates for one person on one date are refused",
     !!(await refused(`INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,DATE '2026-11-01','hourly',999)`, [T.Hourly])));
  ok("an unknown basis is refused",
     !!(await refused(`INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,DATE '2025-03-01','monthly',1)`, [T.Session])));
}

console.log("=== fallback and lifecycle ===");
{
  const fresh = (await db.query(`
    INSERT INTO public.teachers (full_name, pay_rate_type, hourly_rate_vnd)
    VALUES ('Fresh Fred','hourly',180000) RETURNING id`)).rows[0].id;
  const r = (await db.query(`SELECT public.teacher_rate_on($1, CURRENT_DATE) r`, [fresh])).rows[0].r;
  ok("a teacher hired after the backfill prices from their own row", r.hourly_rate_vnd === 180000,
     "an empty result would price them at nothing");

  await db.query(`DELETE FROM public.teachers WHERE id = $1`, [fresh]);
  ok("deleting a brand-new teacher is not blocked by their rate row",
     (await db.query(`SELECT count(*)::int c FROM public.teachers WHERE id=$1`, [fresh])).rows[0].c === 0,
     "rate rows cascade; they must not make every teacher undeletable");
}

console.log("=== RLS: nobody reads, and nobody writes, somebody else's pay ===");
{
  const asUser = async (uid, role) => {
    await db.exec(`SET ROLE authenticated`);
    await db.query(`SELECT set_config('test.uid',$1,false), set_config('test.role',$2,false)`, [uid, role]);
  };
  const reset = async () => { await db.exec(`RESET ROLE`); };

  await asUser(U.hourly, "teacher");
  const mine = (await db.query(`SELECT count(*)::int c FROM public.staff_pay_rates WHERE teacher_id=$1`, [T.Hourly])).rows[0].c;
  const theirs = (await db.query(`SELECT count(*)::int c FROM public.staff_pay_rates WHERE teacher_id=$1`, [T.Session])).rows[0].c;
  ok("a teacher sees their own pay history", mine > 0, `${mine} rows`);
  ok("a teacher sees NOTHING of a colleague's", theirs === 0, `${theirs} rows`);

  const selfRaise = await refused(
    `INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1, DATE '2027-01-01','hourly',9999999)`,
    [T.Hourly]);
  ok("a teacher cannot give themselves a raise", !!selfRaise, (selfRaise || "").slice(0, 60));

  await asUser(U.hourly, "admin");
  const adminWrite = await refused(
    `INSERT INTO public.staff_pay_rates (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1, DATE '2027-02-01','hourly',270000)`,
    [T.Session]);
  ok("an admin can record a rate change", adminWrite === null, adminWrite ?? "");
  const adminRead = (await db.query(`SELECT count(*)::int c FROM public.staff_pay_rates`)).rows[0].c;
  ok("an admin sees everyone's", adminRead >= 5, `${adminRead} rows`);

  await reset();
}

console.log("=== the statement the drawer actually sends ===");
{
  // PostgREST turns .upsert(row, { onConflict: "teacher_id,effective_from" })
  // into exactly this. A PARTIAL unique index cannot serve as that conflict
  // target, so every save from the drawer failed with 42P10 while this file
  // passed - it had only ever used plain INSERT. That is the gap.
  const upsert = async (rate, note) => refused(
    `INSERT INTO public.staff_pay_rates
       (teacher_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, note)
     VALUES ($1, DATE '2026-05-01', 'per_session', 0, ${rate}, '${note}')
     ON CONFLICT (teacher_id, effective_from) DO UPDATE SET
       pay_rate_type = EXCLUDED.pay_rate_type,
       hourly_rate_vnd = EXCLUDED.hourly_rate_vnd,
       per_session_rate_vnd = EXCLUDED.per_session_rate_vnd,
       note = EXCLUDED.note`, [T.Hourly]);

  const first = await upsert(550000, "Correcting a mis-recorded rate");
  ok("a backdated rate saves the way the drawer saves it", first === null, first ?? "");

  const again = await upsert(560000, "Changed my mind");
  ok("  and the same date again updates rather than erroring", again === null, again ?? "");
  ok("  leaving one row, not two",
     (await db.query(`SELECT count(*)::int c FROM public.staff_pay_rates WHERE teacher_id=$1 AND effective_from=DATE '2026-05-01'`, [T.Hourly])).rows[0].c === 1);
  ok("  with the later value",
     (await db.query(`SELECT per_session_rate_vnd v FROM public.staff_pay_rates WHERE teacher_id=$1 AND effective_from=DATE '2026-05-01'`, [T.Hourly])).rows[0].v === 560000);

  const ta = await refused(
    `INSERT INTO public.staff_pay_rates
       (assistant_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd)
     VALUES ($1, DATE '2026-05-01', 'hourly', 90000, 0)
     ON CONFLICT (assistant_id, effective_from) DO UPDATE SET hourly_rate_vnd = EXCLUDED.hourly_rate_vnd`,
    [TA]);
  ok("the assistant branch upserts too", ta === null, ta ?? "");
  ok("  and a teacher row on the same date lives beside it",
     (await db.query(`SELECT count(*)::int c FROM public.staff_pay_rates WHERE effective_from=DATE '2026-05-01'`)).rows[0].c === 2,
     "teacher_id NULL is distinct, which is why the predicate was never needed");
}


console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
