// The Recurring Expenditures panel could not reach its table. This proves
// the migration that lands it does so in BOTH states production could be
// in - table absent, and table present but never granted - because
// PostgREST reports those two identically ("could not find the table in
// the schema cache") and we cannot see which one it is from here.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIG = process.argv[2];
const sql = readFileSync(MIG, "utf8");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE OR REPLACE FUNCTION public.has_role(_uid uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE AS $$ SELECT current_setting('test.role', true) = _role::text $$;
  CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

  CREATE TABLE public.expenditures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    amount integer NOT NULL,
    category text NOT NULL,
    memo text,
    date date NOT NULL DEFAULT CURRENT_DATE,
    source_kind text, source_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenditures TO authenticated;
  GRANT ALL ON public.expenditures TO service_role;
`;

const fresh = async (extra = "") => {
  const db = new PGlite();
  await db.exec(PRELUDE + extra);
  return db;
};
const refused = async (db, q, p = []) => {
  try { await db.query(q, p); return null; } catch (e) { return e.message; }
};
const priv = async (db, role, p) =>
  (await db.query(`SELECT has_table_privilege($1, 'public.recurring_expenditures', $2) AS y`, [role, p])).rows[0].y;

console.log("=== the table was never created (what production looks like) ===");
{
  const db = await fresh();
  const before = await db.query(`SELECT to_regclass('public.recurring_expenditures') AS t`);
  ok("starts absent, as the error says", before.rows[0].t === null);

  await db.exec(sql);

  const after = await db.query(`SELECT to_regclass('public.recurring_expenditures') AS t`);
  ok("the migration creates it", after.rows[0].t !== null);

  ok("authenticated can read it", await priv(db, "authenticated", "SELECT"));
  ok("authenticated can write it", (await priv(db, "authenticated", "INSERT"))
     && (await priv(db, "authenticated", "UPDATE")) && (await priv(db, "authenticated", "DELETE")));
  ok("service_role can reach it too", await priv(db, "service_role", "SELECT"));
  ok("anon cannot - nothing here is public", !(await priv(db, "anon", "SELECT")));

  const rls = await db.query(`SELECT relrowsecurity AS on FROM pg_class WHERE oid = 'public.recurring_expenditures'::regclass`);
  ok("row level security is on", rls.rows[0].on === true);

  const col = await db.query(`SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='expenditures' AND column_name='source_template_id'`);
  ok("expenditures gains source_template_id, so Apply can dedupe", col.rows.length === 1);

  await db.close();
}

console.log("=== the table exists but was never granted (the other possibility) ===");
{
  // Exactly the shape 20260418100000 would have left behind if it HAD run
  // after 20260712023825 revoked the defaults: object present, no
  // privileges, so PostgREST reports it missing all the same.
  const db = await fresh(`
    CREATE TABLE public.recurring_expenditures (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      amount integer NOT NULL CHECK (amount > 0),
      category text NOT NULL, memo text,
      day_of_month smallint NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 31),
      start_month date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,
      end_month date, is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid REFERENCES auth.users(id));
    INSERT INTO public.recurring_expenditures (amount, category) VALUES (12000000, 'Rent');
  `);
  ok("ungranted to start with", !(await priv(db, "authenticated", "SELECT")));

  await db.exec(sql);

  ok("the migration grants it without complaining", await priv(db, "authenticated", "SELECT"));
  const rows = await db.query(`SELECT count(*)::int AS n FROM public.recurring_expenditures`);
  ok("and does not drop the template that was already there", rows.rows[0].n === 1);
  await db.close();
}

console.log("=== running it twice ===");
{
  const db = await fresh();
  await db.exec(sql);
  await db.exec(`INSERT INTO public.recurring_expenditures (amount, category) VALUES (500000, 'Internet')`);
  // exec, not query: the migration is many statements and query() is a
  // single prepared statement.
  let err = null;
  try { await db.exec(sql); } catch (e) { err = e.message; }
  ok("a second run is a no-op rather than an error", err === null, err ?? "");
  const rows = await db.query(`SELECT count(*)::int AS n FROM public.recurring_expenditures`);
  ok("the templates survive it", rows.rows[0].n === 1);
  const pols = await db.query(`SELECT count(*)::int AS n FROM pg_policies
    WHERE schemaname='public' AND tablename='recurring_expenditures'`);
  ok("and there is still exactly one policy, not two", pols.rows[0].n === 1, String(pols.rows[0].n));
  await db.close();
}

console.log("=== who may manage a template ===");
{
  const db = await fresh();
  await db.exec(sql);
  await db.exec(`SET ROLE authenticated`);

  await db.exec(`SELECT set_config('test.role', 'teacher', false)`);
  const asTeacher = await refused(db,
    `INSERT INTO public.recurring_expenditures (amount, category) VALUES (1, 'Rent')`);
  ok("a teacher cannot create one", asTeacher !== null, asTeacher ?? "it was allowed");

  await db.exec(`SELECT set_config('test.role', 'admin', false)`);
  const asAdmin = await refused(db,
    `INSERT INTO public.recurring_expenditures (amount, category, day_of_month, start_month)
     VALUES (12000000, 'Rent', 1, '2026-01-01')`);
  ok("an admin can", asAdmin === null, asAdmin ?? "");

  await db.exec(`SELECT set_config('test.role', 'teacher', false)`);
  const seen = await db.query(`SELECT count(*)::int AS n FROM public.recurring_expenditures`);
  ok("and a teacher cannot read what the admin wrote", seen.rows[0].n === 0, String(seen.rows[0].n));

  await db.exec(`RESET ROLE`);
  await db.close();
}

console.log("=== the shape the panel writes ===");
{
  const db = await fresh();
  await db.exec(sql);
  // The payload RecurringExpendituresManager actually sends.
  const good = await refused(db,
    `INSERT INTO public.recurring_expenditures (amount, category, memo, day_of_month, start_month, end_month, is_active)
     VALUES (12000000, 'Rent', NULL, 1, '2026-01-01', NULL, true)`);
  ok("the New Recurring Template payload is accepted", good === null, good ?? "");

  ok("a zero amount is refused",
     (await refused(db, `INSERT INTO public.recurring_expenditures (amount, category) VALUES (0, 'Rent')`)) !== null);
  ok("day 32 is refused",
     (await refused(db, `INSERT INTO public.recurring_expenditures (amount, category, day_of_month) VALUES (1, 'Rent', 32)`)) !== null);

  const before = await db.query(`SELECT updated_at FROM public.recurring_expenditures LIMIT 1`);
  await db.exec(`UPDATE public.recurring_expenditures SET amount = 13000000`);
  const after = await db.query(`SELECT updated_at, amount FROM public.recurring_expenditures LIMIT 1`);
  ok("updated_at moves on edit", +new Date(after.rows[0].updated_at) >= +new Date(before.rows[0].updated_at));
  ok("the edit landed", after.rows[0].amount === 13000000);

  // Deleting a template must not take the expenditures it generated with
  // it - those are money that was actually spent.
  const t = await db.query(`SELECT id FROM public.recurring_expenditures LIMIT 1`);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, source_template_id) VALUES (13000000, 'Rent', '2026-07-01', $1)`,
    [t.rows[0].id]);
  await db.query(`DELETE FROM public.recurring_expenditures WHERE id = $1`, [t.rows[0].id]);
  const kept = await db.query(`SELECT source_template_id, amount FROM public.expenditures`);
  ok("deleting a template leaves the money it booked on the ledger", kept.rows.length === 1 && kept.rows[0].amount === 13000000);
  ok("with the link nulled rather than the row removed", kept.rows[0].source_template_id === null);
  await db.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
