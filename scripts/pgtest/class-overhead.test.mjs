// Spreading the standing costs - rent, electricity, the rest - over the
// classes that ran that month.
//
// The things worth doubting, and what this proves about each:
//   - the shares add up to the bill, to the dong, however it divides
//   - only flagged recurring costs are in the pool; payroll never is
//   - the divisor is the calendar, not whether a teacher marked attendance
//   - an archived class that ran lessons still carries its share
//   - closing a month freezes the split, and the frozen figures stop moving
//   - a teacher cannot read what the school pays in rent
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
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

  CREATE TYPE public.session_status AS ENUM ('Scheduled', 'Held', 'Canceled');

  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text NOT NULL);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text NOT NULL);

  CREATE TABLE public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    session_rate_vnd integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true);

  CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.teachers(id),
    date date NOT NULL,
    start_time time, end_time time,
    status public.session_status NOT NULL DEFAULT 'Scheduled');

  CREATE TABLE public.session_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES public.teachers(id),
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id),
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid);

  CREATE TABLE public.payroll_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES public.teachers(id),
    month text NOT NULL, total_hours numeric DEFAULT 0, total_amount numeric DEFAULT 0,
    sessions_count integer DEFAULT 0,
    UNIQUE (teacher_id, month));

  CREATE TABLE public.expenditures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    amount integer NOT NULL,
    category text NOT NULL,
    memo text,
    date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid);

  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
`;

const sqlOf = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

async function build() {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(sqlOf());
  return db;
}
const refused = async (db, q, p = []) => {
  try { await db.query(q, p); return null; } catch (e) { return e.message; }
};
const asRole = async (db, pgRole, appRole, uid = null) => {
  await db.exec(`RESET ROLE`);
  await db.query(`SELECT set_config('test.role', $1, false), set_config('test.uid', $2, false)`, [appRole ?? "", uid ?? ""]);
  await db.exec(`SET ROLE ${pgRole}`);
};

// A month with three classes, a flagged rent template, and sessions.
async function seed(db, { rent = 12000000, counts = { A: 6, B: 3, C: 1 }, month = "2026-07" } = {}) {
  const ids = {};
  for (const name of Object.keys(counts)) {
    ids[name] = (await db.query(`INSERT INTO public.classes (name) VALUES ($1) RETURNING id`, [name])).rows[0].id;
    for (let i = 0; i < counts[name]; i++) {
      await db.query(
        `INSERT INTO public.sessions (class_id, date, status) VALUES ($1, $2, 'Held')`,
        [ids[name], `${month}-${String((i % 27) + 1).padStart(2, "0")}`],
      );
    }
  }
  // rent: 0 means "no standing cost this month" - the amount CHECK on a
  // template is > 0, so there is nothing to create.
  if (rent <= 0) return { ids, tpl: null };
  const tpl = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month, allocation_mode)
     VALUES ($1, 'Rent', $2, 'all') RETURNING id`, [rent, `${month}-01`])).rows[0].id;
  await db.query(
    `INSERT INTO public.expenditures (amount, category, memo, date, source_template_id, source_kind, source_key, allocation_mode)
     VALUES ($1, 'Rent', 'Rent', $2, $3, 'recurring', $4, 'all')`,
    [rent, `${month}-01`, tpl, `${month}:${tpl}`]);
  return { ids, tpl };
}
const shares = async (db, month = "2026-07") =>
  (await db.query(
    `SELECT class_name, sessions_count, share_vnd::bigint, pool_vnd::bigint, frozen
       FROM public.class_overhead_for_month($1) ORDER BY class_name`, [month])).rows;

console.log("=== applies ===");
{
  const db = await build();
  ok("the migration applies on top of the others", true);
  let second = null;
  try { await db.exec(sqlOf()); } catch (e) { second = e.message; }
  ok("and applies a second time unchanged", second === null, second ?? "");

  const g = await db.query(
    `SELECT has_table_privilege('authenticated','public.class_overhead_allocations','SELECT') a,
            has_table_privilege('service_role','public.class_overhead_allocations','INSERT') s,
            has_table_privilege('anon','public.class_overhead_allocations','SELECT') n`);
  ok("granted to authenticated and service_role, not anon", g.rows[0].a && g.rows[0].s && !g.rows[0].n);

  const col = await db.query(`SELECT column_default, is_nullable FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recurring_expenditures' AND column_name='allocation_mode'`);
  ok("templates carry an allocation mode, defaulting to charging nobody",
     col.rows.length === 1 && /'none'/.test(col.rows[0].column_default) && col.rows[0].is_nullable === "NO",
     col.rows[0]?.column_default);
  const gone = await db.query(`SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recurring_expenditures' AND column_name='allocate_to_classes'`);
  ok("and the old all-or-nothing switch is gone, not left beside it", gone.rows.length === 0);
  await db.close();
}

console.log("=== it refuses to run before its prerequisite ===");
{
  const db = new PGlite();
  await db.exec(PRELUDE);
  // Everything except the recurring-expenditures migration.
  const without = MIGS.filter((f) => !f.includes("recurring_expenditures"))
    .map((f) => readFileSync(f, "utf8")).join("\n;\n");
  let e = null;
  try { await db.exec(without); } catch (err) { e = err.message; }
  ok("a missing recurring_expenditures stops it with a sentence, not a relation error",
     !!e && /Run 20261021095000/.test(e), e ?? "it applied anyway");
  await db.close();
}

console.log("=== the split ===");
{
  const db = await build();
  await seed(db);                       // 12,000,000 over 6 / 3 / 1 sessions
  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("one row per class that ran", r.length === 3, String(r.length));
  ok("A, with 6 of 10 sessions, carries 7,200,000",
     Number(r.find((x) => x.class_name === "A").share_vnd) === 7200000,
     String(r.find((x) => x.class_name === "A").share_vnd));
  ok("B, with 3, carries 3,600,000",
     Number(r.find((x) => x.class_name === "B").share_vnd) === 3600000);
  ok("C, with 1, carries 1,200,000",
     Number(r.find((x) => x.class_name === "C").share_vnd) === 1200000);
  ok("the shares add up to the bill exactly",
     r.reduce((n, x) => n + Number(x.share_vnd), 0) === 12000000);
  ok("an open month is not frozen", r.every((x) => x.frozen === false));
  await db.close();
}

console.log("=== a bill that does not divide evenly ===");
{
  const db = await build();
  await seed(db, { rent: 10, counts: { A: 1, B: 1, C: 1 } });
  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  const vals = r.map((x) => Number(x.share_vnd)).sort((a, b) => b - a);
  ok("10 over three equal classes is 4 / 3 / 3, not 3 / 3 / 3",
     vals.join(",") === "4,3,3", vals.join(","));
  ok("and still adds up to 10", vals.reduce((a, b) => a + b, 0) === 10);
  await db.close();
}
{
  const db = await build();
  await seed(db, { rent: 1000001, counts: { A: 7, B: 5, C: 3, D: 2 } });
  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("an awkward bill over awkward counts still adds up to the dong",
     r.reduce((n, x) => n + Number(x.share_vnd), 0) === 1000001,
     String(r.reduce((n, x) => n + Number(x.share_vnd), 0)));
  ok("  and nobody is handed more than one extra dong",
     r.every((x) => {
       const exact = (1000001 * x.sessions_count) / 17;
       return Math.abs(Number(x.share_vnd) - exact) < 1;
     }));
  await db.close();
}

console.log("=== what is in the pool ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1 } });

  const unflagged = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month, allocation_mode)
     VALUES (500, 'Room kit', '2026-07-01', 'none') RETURNING id`)).rows[0].id;
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, source_template_id)
     VALUES (500, 'Room kit', '2026-07-05', $1)`, [unflagged]);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date) VALUES (900, 'Taxi', '2026-07-06')`);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key)
     VALUES (8000000, 'Teacher Payroll', '2026-07-31', 'payroll', '2026-07:teacher:x')`);

  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("a template with the switch off is not shared", Number(r[0].pool_vnd) === 1000, String(r[0].pool_vnd));
  ok("  nor is a hand-entered cost", Number(r[0].share_vnd) === 1000);
  ok("  and payroll never is, because the class table already charges it per class",
     Number(r[0].pool_vnd) === 1000);

  await db.query(`INSERT INTO public.expenditures (amount, category, date, source_template_id, allocation_mode)
     VALUES (300, 'Rent', '2026-08-02', (SELECT id FROM public.recurring_expenditures WHERE category='Rent'), 'all')`);
  const still = await shares(db);
  ok("a cost dated into the next month belongs to the next month",
     Number(still[0].pool_vnd) === 1000, String(still[0].pool_vnd));
  await db.close();
}

console.log("=== the divisor is the calendar, not the attendance screen ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1, B: 1 } });
  // B's teacher never opened the attendance screen, so B's lesson is
  // still 'Scheduled' although it has happened.
  await db.query(`UPDATE public.sessions SET status='Scheduled' WHERE class_id=$1`, [ids.B]);
  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("a lesson nobody marked Held still carries its share",
     r.length === 2 && Number(r.find((x) => x.class_name === "B").share_vnd) === 500,
     JSON.stringify(r.map((x) => [x.class_name, Number(x.share_vnd)])));

  await asRole(db, "service_role", null);
  await db.query(`UPDATE public.sessions SET status='Canceled' WHERE class_id=$1`, [ids.B]);
  await asRole(db, "authenticated", "admin");
  const after = await shares(db);
  ok("a cancelled lesson does not", after.length === 1 && after[0].class_name === "A");
  ok("  and A then carries the whole bill", Number(after[0].share_vnd) === 1000);
  await db.close();
}

console.log("=== which classes ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1, B: 1 } });
  await db.query(`INSERT INTO public.classes (name, is_active) VALUES ('Dormant', true)`);
  await db.query(`UPDATE public.classes SET is_active = false WHERE id = $1`, [ids.B]);

  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("an archived class that ran lessons still carries its share",
     r.some((x) => x.class_name === "B" && Number(x.share_vnd) === 500),
     JSON.stringify(r.map((x) => [x.class_name, Number(x.share_vnd)])));
  ok("  so the active classes are not over-charged for it",
     Number(r.find((x) => x.class_name === "A").share_vnd) === 500);
  ok("a class that ran nothing carries nothing", !r.some((x) => x.class_name === "Dormant"));
  ok("and the shares still add up to the bill",
     r.reduce((n, x) => n + Number(x.share_vnd), 0) === 1000);
  await db.close();
}

console.log("=== a month with costs but no lessons ===");
{
  const db = await build();
  const tpl = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month)
     VALUES (12000000, 'Rent', '2026-07-01') RETURNING id`)).rows[0].id;
  await db.query(`INSERT INTO public.expenditures (amount, category, date, source_template_id, allocation_mode)
     VALUES (12000000, 'Rent', '2026-07-01', $1, 'all')`, [tpl]);
  await asRole(db, "authenticated", "admin");
  ok("nothing is allocated", (await shares(db)).length === 0);
  ok("but the money is still reportable, rather than quietly vanishing",
     Number((await db.query(`SELECT public.class_overhead_pool('2026-07') p`)).rows[0].p) === 12000000);
  await db.close();
}

console.log("=== closing the month freezes it ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1, B: 1 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status) VALUES ('2026-07','open')`);

  await asRole(db, "authenticated", "admin");
  ok("open, and computed", (await shares(db)).every((x) => x.frozen === false));

  await asRole(db, "service_role", null);
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-07'`);

  await asRole(db, "authenticated", "admin");
  const frozen = await shares(db);
  ok("closing writes the snapshot", frozen.length === 2 && frozen.every((x) => x.frozen === true));
  ok("  at the figures it was closed at",
     frozen.every((x) => Number(x.share_vnd) === 500));

  // Someone adds a lesson to A after the month was paid.
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,'2026-07-20','Held')`, [ids.A]);
  await asRole(db, "authenticated", "admin");
  const after = await shares(db);
  ok("a session added after the close does not restate what was charged",
     after.every((x) => Number(x.share_vnd) === 500),
     JSON.stringify(after.map((x) => [x.class_name, Number(x.share_vnd)])));

  const edit = await refused(db,
    `UPDATE public.class_overhead_allocations SET share_vnd = 1 WHERE month='2026-07'`);
  ok("and the frozen figures cannot be edited by hand", !!edit, edit ?? "it was allowed");
  const del = await refused(db, `DELETE FROM public.class_overhead_allocations WHERE month='2026-07'`);
  ok("  nor deleted", !!del);

  // Reopen, re-close: the snapshot catches up.
  await asRole(db, "service_role", null);
  await db.query(`UPDATE public.payroll_periods SET status='open', reopened_at=now() WHERE month='2026-07'`);
  await asRole(db, "authenticated", "admin");
  ok("reopening keeps the snapshot rather than losing the record",
     (await db.query(`SELECT count(*)::int c FROM public.class_overhead_allocations`)).rows[0].c === 2);
  const live = await shares(db);
  ok("  but the report goes back to live figures",
     live.every((x) => x.frozen === false) &&
     Number(live.find((x) => x.class_name === "A").share_vnd) === 667,
     JSON.stringify(live.map((x) => [x.class_name, Number(x.share_vnd)])));

  await asRole(db, "service_role", null);
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-07'`);
  await asRole(db, "authenticated", "admin");
  const reclosed = await shares(db);
  ok("re-closing overwrites it with what is true now",
     Number(reclosed.find((x) => x.class_name === "A").share_vnd) === 667,
     JSON.stringify(reclosed.map((x) => [x.class_name, Number(x.share_vnd)])));
  ok("  and it still adds up", reclosed.reduce((n, x) => n + Number(x.share_vnd), 0) === 1000);
  await db.close();
}

console.log("=== a renamed or deleted class ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);
  await db.query(`UPDATE public.classes SET name = 'A (2026 intake)' WHERE id = $1`, [ids.A]);

  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("a closed month still names the class as it was charged",
     r.length === 1 && r[0].class_name === "A", r[0]?.class_name);

  await asRole(db, "service_role", null);
  const gone = await refused(db, `DELETE FROM public.classes WHERE id = $1`, [ids.A]);
  ok("a class with a closed month's charge against it cannot be deleted away",
     !!gone, gone ?? "it was allowed");
  await db.close();
}

console.log("=== who may read what the school pays in rent ===");
{
  const db = await build();
  await seed(db, { rent: 1000, counts: { A: 1 } });

  await asRole(db, "authenticated", "teacher", "11111111-1111-1111-1111-111111111111");
  const t = await refused(db, `SELECT * FROM public.class_overhead_for_month('2026-07')`);
  ok("a teacher is refused", !!t, t ?? "it was allowed");
  const tp = await refused(db, `SELECT public.class_overhead_pool('2026-07')`);
  ok("  including the bare total", !!tp);
  const ti = await refused(db, `SELECT * FROM public.class_overhead_compute('2026-07')`);
  ok("  and cannot route around it through the internal function", !!ti);

  await asRole(db, "authenticated", "admin", "22222222-2222-2222-2222-222222222222");
  const a = await refused(db, `SELECT * FROM public.class_overhead_for_month('2026-07')`);
  ok("an admin is not", a === null, a ?? "");

  await asRole(db, "service_role", null);
  const s = await refused(db, `SELECT * FROM public.class_overhead_for_month('2026-07')`);
  ok("and the service role is not, so a function can close a month", s === null, s ?? "");
  await db.exec(`RESET ROLE`);
  await db.close();
}

console.log("=== re-closing after a class drops out of the split ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 20000000, counts: { A: 10, B: 10 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);

  await asRole(db, "authenticated", "admin");
  const first = await shares(db);
  ok("closed at ten million each",
     first.length === 2 && first.every((x) => Number(x.share_vnd) === 10000000));

  // Reopen; B's ten lessons turn out to have been entered by mistake.
  await asRole(db, "service_role", null);
  await db.query(`UPDATE public.payroll_periods SET status='open', reopened_at=now() WHERE month='2026-07'`);
  await db.query(`UPDATE public.sessions SET status='Canceled' WHERE class_id=$1`, [ids.B]);
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-07'`);

  await asRole(db, "authenticated", "admin");
  const second = await shares(db);
  ok("the class that dropped out loses its frozen share rather than keeping it",
     second.length === 1 && second[0].class_name === "A",
     JSON.stringify(second.map((x) => [x.class_name, Number(x.share_vnd)])));
  ok("  and the one class left carries the whole bill",
     Number(second[0].share_vnd) === 20000000, String(second[0].share_vnd));
  ok("  so the shares still add up to the ledger, not to one and a half times it",
     second.reduce((n, x) => n + Number(x.share_vnd), 0) === 20000000);
  await db.close();
}

console.log("=== re-closing after the last shared cost is switched off ===");
{
  const db = await build();
  await seed(db, { rent: 20000000, counts: { A: 10, B: 10 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);
  await db.query(`UPDATE public.payroll_periods SET status='open' WHERE month='2026-07'`);
  await db.query(`UPDATE public.expenditures SET allocation_mode = 'none' WHERE source_kind = 'recurring'`);
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-07'`);

  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  ok("the whole snapshot is cleared rather than left standing for a cost that is no longer shared",
     r.length === 0, JSON.stringify(r.map((x) => [x.class_name, Number(x.share_vnd)])));
  ok("  and the pool reports nothing too",
     Number((await db.query(`SELECT public.class_overhead_pool('2026-07') p`)).rows[0].p) === 0);
  await db.close();
}

console.log("=== a month closed with nothing shared stays closed ===");
{
  const db = await build();
  const tpl = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month, allocation_mode)
     VALUES (12000000, 'Rent', '2026-07-01', 'none') RETURNING id`)).rows[0].id;
  const cid = (await db.query(`INSERT INTO public.classes (name) VALUES ('A') RETURNING id`)).rows[0].id;
  await db.query(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,'2026-07-03','Held')`, [cid]);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, source_template_id, source_kind, source_key)
     VALUES (12000000, 'Rent', '2026-07-01', $1, 'recurring', $2)`, [tpl, `2026-07:${tpl}`]);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);

  await asRole(db, "authenticated", "admin");
  ok("closing with nothing shared freezes an empty answer", (await shares(db)).length === 0);
  ok("  and a pool of nothing", Number((await db.query(`SELECT public.class_overhead_pool('2026-07') p`)).rows[0].p) === 0);

  const reach = await refused(db,
    `UPDATE public.expenditures SET allocation_mode = 'all' WHERE source_kind = 'recurring'`);
  ok("and the closed month cannot be charged for it after the fact", !!reach, reach ?? "it was allowed");
  ok("  so it still reports nothing", (await shares(db)).length === 0);
  await db.close();
}

console.log("=== the two functions answer from the same world ===");
{
  const db = await build();
  await seed(db, { rent: 20000000, counts: { A: 1, B: 1 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);
  await db.query(`UPDATE public.payroll_periods SET status='open', reopened_at=now() WHERE month='2026-07'`);
  // Reopened, and a duplicated cost removed.
  await db.query(`UPDATE public.expenditures SET amount = 15000000 WHERE source_kind = 'recurring'`);

  await asRole(db, "authenticated", "admin");
  const rows = await shares(db);
  const pool = Number((await db.query(`SELECT public.class_overhead_pool('2026-07') p`)).rows[0].p);
  const allocated = rows.reduce((n, x) => n + Number(x.share_vnd), 0);
  ok("a reopened month's pool is live, like its shares", pool === 15000000, String(pool));
  ok("  so the report cannot invent an unallocated remainder",
     pool - allocated === 0, `${pool} - ${allocated}`);
  await db.close();
}

console.log("=== a template that has booked money is kept ===");
{
  const db = await build();
  const { tpl } = await seed(db, { rent: 1000, counts: { A: 1 } });
  await asRole(db, "authenticated", "admin");
  const gone = await refused(db, `DELETE FROM public.recurring_expenditures WHERE id = $1`, [tpl]);
  ok("deleting it is refused rather than silently erasing the cost from every class",
     !!gone, gone ?? "it was allowed");
  const stillThere = await shares(db);
  ok("  so the split is unchanged", stillThere.length === 1 && Number(stillThere[0].share_vnd) === 1000);

  const unused = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category) VALUES (1, 'Never booked') RETURNING id`)).rows[0].id;
  const okDelete = await refused(db, `DELETE FROM public.recurring_expenditures WHERE id = $1`, [unused]);
  ok("a template that never booked anything can still be deleted", okDelete === null, okDelete ?? "");
  await db.close();
}

console.log("=== a closed month is not booked into ===");
{
  const db = await build();
  const { tpl } = await seed(db, { rent: 1000, counts: { A: 1 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-08','locked',now())`);

  const t2 = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month)
     VALUES (500000, 'Water', '2026-08-01') RETURNING id`)).rows[0].id;
  const booked = await refused(db,
    `INSERT INTO public.expenditures (amount, category, date, source_template_id, source_kind, source_key)
     VALUES (500000, 'Water', '2026-08-01', $1, 'recurring', $2)`, [t2, `2026-08:${t2}`]);
  ok("a standing cost cannot be booked into it, even by the database's own client",
     !!booked, booked ?? "it was allowed");

  const handEntered = await refused(db,
    `INSERT INTO public.expenditures (amount, category, date) VALUES (90000, 'Taxi', '2026-08-04')`);
  ok("  while a hand-entered correction is still allowed, as it always was",
     handEntered === null, handEntered ?? "");

  const wages = await refused(db,
    `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key)
     VALUES (5000000, 'Teacher Payroll', '2026-08-31', 'payroll', '2026-08:teacher:x')`);
  ok("  and so is the wage bill, which is booked before the lock goes on",
     wages === null, wages ?? "");

  // Moving an open month's standing cost into the closed one, and out again.
  const intoClosed = await refused(db,
    `UPDATE public.expenditures SET date = '2026-08-15' WHERE source_kind = 'recurring' AND date = '2026-07-01'`);
  ok("a standing cost cannot be moved into a closed month", !!intoClosed, intoClosed ?? "it was allowed");

  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);
  const outOfClosed = await refused(db,
    `UPDATE public.expenditures SET date = '2026-09-01' WHERE source_kind = 'recurring'`);
  ok("  nor out of one", !!outOfClosed, outOfClosed ?? "it was allowed");
  const deleted = await refused(db,
    `DELETE FROM public.expenditures WHERE source_kind = 'recurring'`);
  ok("  nor deleted out of one", !!deleted, deleted ?? "it was allowed");
  await db.close();
}

console.log("=== the record of what has been booked ===");
{
  const db = await build();
  const { tpl } = await seed(db, { rent: 1000, counts: { A: 1 } });
  const g = await db.query(
    `SELECT has_table_privilege('authenticated','public.recurring_applications','INSERT') a,
            has_table_privilege('anon','public.recurring_applications','SELECT') n,
            relrowsecurity rls
       FROM pg_class WHERE oid = 'public.recurring_applications'::regclass`);
  ok("recurring_applications is reachable by the app, not by anon, and has RLS",
     g.rows[0].a && !g.rows[0].n && g.rows[0].rls === true);

  await asRole(db, "authenticated", "admin");
  await db.query(
    `INSERT INTO public.recurring_applications (template_id, month, automatic) VALUES ($1,'2026-07',true)`, [tpl]);
  const twice = await refused(db,
    `INSERT INTO public.recurring_applications (template_id, month) VALUES ($1,'2026-07')`, [tpl]);
  ok("one row per template per month, so a month cannot be marked done twice", !!twice);

  await asRole(db, "authenticated", "teacher", "11111111-1111-1111-1111-111111111111");
  ok("a teacher cannot see it",
     (await db.query(`SELECT count(*)::int c FROM public.recurring_applications`)).rows[0].c === 0);
  await db.exec(`RESET ROLE`);
  await db.close();
}

console.log("=== a cost aimed at one class ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 9, B: 1 } });
  const dormant = (await db.query(
    `INSERT INTO public.classes (name) VALUES ('Dormant') RETURNING id`)).rows[0].id;

  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_class_id)
     VALUES (3000000, 'Projector', '2026-07-09', 'class', $1)`, [ids.B]);

  await asRole(db, "authenticated", "admin");
  const r = await shares(db);
  const by = Object.fromEntries(r.map((x) => [x.class_name, Number(x.share_vnd)]));
  ok("the named class takes the whole thing, on top of its share of the rent",
     by.B === 3000000 + 100, JSON.stringify(by));
  ok("  and no part of it lands on anyone else", by.A === 900, String(by.A));
  ok("the total still equals what was spent",
     r.reduce((n, x) => n + Number(x.share_vnd), 0) === 3001000);

  // A class that ran nothing is still charged what was bought for it.
  await asRole(db, "service_role", null);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_class_id)
     VALUES (750000, 'Whiteboard', '2026-07-11', 'class', $1)`, [dormant]);
  await asRole(db, "authenticated", "admin");
  const r2 = await shares(db);
  const d = r2.find((x) => x.class_name === "Dormant");
  ok("a class that ran no lessons is still charged what was bought for it",
     !!d && Number(d.share_vnd) === 750000, JSON.stringify(r2.map((x) => [x.class_name, Number(x.share_vnd)])));
  ok("  and shows zero sessions beside it", d && d.sessions_count === 0, String(d?.sessions_count));
  ok("  without taking any of the shared rent",
     Number(r2.find((x) => x.class_name === "A").share_vnd) === 900);
  await db.close();
}

console.log("=== a cost that follows a teacher ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 0, counts: {} });
  const A = (await db.query(`INSERT INTO public.classes (name) VALUES ('A') RETURNING id`)).rows[0].id;
  const B = (await db.query(`INSERT INTO public.classes (name) VALUES ('B') RETURNING id`)).rows[0].id;
  const C = (await db.query(`INSERT INTO public.classes (name) VALUES ('C') RETURNING id`)).rows[0].id;
  const mai = (await db.query(
    `INSERT INTO public.teachers (full_name) VALUES ('Mai') RETURNING id`)).rows[0].id;
  const other = (await db.query(
    `INSERT INTO public.teachers (full_name) VALUES ('Other') RETURNING id`)).rows[0].id;

  // Mai teaches A three times and B once. C is someone else's class.
  for (const [cls, n, who] of [[A, 3, mai], [B, 1, mai], [C, 5, other]]) {
    for (let i = 0; i < n; i++) {
      await db.query(
        `INSERT INTO public.sessions (class_id, teacher_id, date, status) VALUES ($1,$2,$3,'Held')`,
        [cls, who, `2026-07-${String(i + 1).padStart(2, "0")}`]);
    }
  }
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_teacher_id)
     VALUES (400000, 'Training', '2026-07-15', 'staff', $1)`, [mai]);

  await asRole(db, "authenticated", "admin");
  const by = Object.fromEntries((await shares(db)).map((x) => [x.class_name, Number(x.share_vnd)]));
  ok("it lands only on the classes that teacher actually taught",
     by.C === undefined, JSON.stringify(by));
  ok("  split by how often they taught each: three quarters to A",
     by.A === 300000, String(by.A));
  ok("  and a quarter to B", by.B === 100000, String(by.B));
  ok("  adding up to the whole cost", (by.A ?? 0) + (by.B ?? 0) === 400000);
  await db.close();
}

console.log("=== a cost that follows an assistant ===");
{
  const db = await build();
  await seed(db, { rent: 0, counts: {} });
  const A = (await db.query(`INSERT INTO public.classes (name) VALUES ('A') RETURNING id`)).rows[0].id;
  const B = (await db.query(`INSERT INTO public.classes (name) VALUES ('B') RETURNING id`)).rows[0].id;
  const linh = (await db.query(
    `INSERT INTO public.teaching_assistants (full_name) VALUES ('Linh') RETURNING id`)).rows[0].id;
  const nam = (await db.query(
    `INSERT INTO public.teaching_assistants (full_name) VALUES ('Nam') RETURNING id`)).rows[0].id;

  const sess = [];
  for (const [cls, n] of [[A, 2], [B, 2]]) {
    for (let i = 0; i < n; i++) {
      sess.push({
        cls,
        id: (await db.query(
          `INSERT INTO public.sessions (class_id, date, status) VALUES ($1,$2,'Held') RETURNING id`,
          [cls, `2026-07-0${sess.length + 1}`])).rows[0].id,
      });
    }
  }
  // Linh assists both of A's lessons and one of B's. Nam assists the other.
  for (const x of [sess[0], sess[1], sess[2]]) {
    await db.query(
      `INSERT INTO public.session_participants (session_id, teaching_assistant_id, participant_type)
       VALUES ($1,$2,'teaching_assistant')`, [x.id, linh]);
  }
  await db.query(
    `INSERT INTO public.session_participants (session_id, teaching_assistant_id, participant_type)
     VALUES ($1,$2,'teaching_assistant')`, [sess[3].id, nam]);
  // A duplicate participation row for one of Linh's lessons.
  await db.query(
    `INSERT INTO public.session_participants (session_id, teaching_assistant_id, participant_type)
     VALUES ($1,$2,'teaching_assistant')`, [sess[0].id, linh]);

  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_assistant_id)
     VALUES (300000, 'TA stipend', '2026-07-20', 'staff', $1)`, [linh]);

  await asRole(db, "authenticated", "admin");
  const by = Object.fromEntries((await shares(db)).map((x) => [x.class_name, Number(x.share_vnd)]));
  ok("it follows the assistant into the classes they assisted",
     by.A === 200000 && by.B === 100000, JSON.stringify(by));
  ok("  a duplicated participation row does not weight a class twice",
     (by.A ?? 0) + (by.B ?? 0) === 300000);
  ok("  and Nam's class is untouched by Linh's stipend", by.B === 100000);
  await db.close();
}

console.log("=== a target with nothing to land on ===");
{
  const db = await build();
  await seed(db, { rent: 1000, counts: { A: 1 } });
  const ghost = (await db.query(
    `INSERT INTO public.teachers (full_name) VALUES ('On leave') RETURNING id`)).rows[0].id;
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_teacher_id)
     VALUES (500000, 'Retainer', '2026-07-12', 'staff', $1)`, [ghost]);

  await asRole(db, "authenticated", "admin");
  const rows = await shares(db);
  const allocated = rows.reduce((n, x) => n + Number(x.share_vnd), 0);
  const pool = Number((await db.query(`SELECT public.class_overhead_pool('2026-07') p`)).rows[0].p);
  ok("a person who taught nothing cannot have their cost charged to a class",
     allocated === 1000, String(allocated));
  ok("  so it shows as a shortfall rather than disappearing",
     pool - allocated === 500000, `${pool} - ${allocated}`);
  await db.close();
}

console.log("=== several costs with different targets ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 12000000, counts: { A: 6, B: 3, C: 1 } });
  const mai = (await db.query(
    `INSERT INTO public.teachers (full_name) VALUES ('Mai') RETURNING id`)).rows[0].id;
  await db.query(`UPDATE public.sessions SET teacher_id = $1 WHERE class_id = $2`, [mai, ids.A]);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_class_id)
     VALUES (2000000, 'Books', '2026-07-05', 'class', $1)`, [ids.C]);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_teacher_id)
     VALUES (900000, 'Course fee', '2026-07-06', 'staff', $1)`, [mai]);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date) VALUES (400000, 'Marketing', '2026-07-07')`);

  await asRole(db, "authenticated", "admin");
  const rows = await shares(db);
  const by = Object.fromEntries(rows.map((x) => [x.class_name, Number(x.share_vnd)]));
  ok("rent splits six/three/one, the books land on C, the course fee on Mai's class",
     by.A === 7200000 + 900000 && by.B === 3600000 && by.C === 1200000 + 2000000,
     JSON.stringify(by));
  ok("the column adds up to every allocated cost and nothing else",
     rows.reduce((n, x) => n + Number(x.share_vnd), 0) === 12000000 + 2000000 + 900000);
  ok("  and the school-wide marketing spend is not among them",
     Number((await db.query(`SELECT public.class_overhead_pool('2026-07') p`)).rows[0].p) === 14900000);
  await db.close();
}

console.log("=== what the schema refuses ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1 } });
  const mai = (await db.query(
    `INSERT INTO public.teachers (full_name) VALUES ('Mai') RETURNING id`)).rows[0].id;
  const linh = (await db.query(
    `INSERT INTO public.teaching_assistants (full_name) VALUES ('Linh') RETURNING id`)).rows[0].id;

  ok("aiming at a class without naming one",
     !!(await refused(db, `INSERT INTO public.expenditures (amount, category, date, allocation_mode)
        VALUES (1, 'X', '2026-07-02', 'class')`)));
  ok("naming a class while sharing with everyone",
     !!(await refused(db, `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_class_id)
        VALUES (1, 'X', '2026-07-02', 'all', $1)`, [ids.A])));
  ok("naming both a teacher and an assistant",
     !!(await refused(db, `INSERT INTO public.expenditures (amount, category, date, allocation_mode, allocation_teacher_id, allocation_assistant_id)
        VALUES (1, 'X', '2026-07-02', 'staff', $1, $2)`, [mai, linh])));
  ok("following a person without naming one",
     !!(await refused(db, `INSERT INTO public.expenditures (amount, category, date, allocation_mode)
        VALUES (1, 'X', '2026-07-02', 'staff')`)));
  ok("sharing out the wage bill, which each class is already charged for",
     !!(await refused(db, `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key, allocation_mode)
        VALUES (5000000, 'Teacher Payroll', '2026-07-31', 'payroll', '2026-07:teacher:x', 'all')`)));
  ok("  while an unallocated payroll row is fine, as it has to be",
     (await refused(db, `INSERT INTO public.expenditures (amount, category, date, source_kind, source_key)
        VALUES (5000000, 'Teacher Payroll', '2026-07-31', 'payroll', '2026-07:teacher:y')`)) === null);
  await db.close();
}

console.log("=== carrying the old switch across ===");
{
  // A database as it stood after 20261021097000, with templates already
  // booked, then brought forward.
  const before = MIGS.filter((f) => !f.includes("098000"));
  const after = MIGS.filter((f) => f.includes("098000"));
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(before.map((f) => readFileSync(f, "utf8")).join("\n;\n"));

  const shared = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month, allocate_to_classes)
     VALUES (12000000, 'Rent', '2026-07-01', true) RETURNING id`)).rows[0].id;
  const notShared = (await db.query(
    `INSERT INTO public.recurring_expenditures (amount, category, start_month, allocate_to_classes)
     VALUES (3000000, 'Marketing', '2026-07-01', false) RETURNING id`)).rows[0].id;
  for (const [id, amt] of [[shared, 12000000], [notShared, 3000000]]) {
    await db.query(
      `INSERT INTO public.expenditures (amount, category, date, source_template_id, source_kind, source_key)
       VALUES ($1, 'X', '2026-07-01', $2, 'recurring', $3)`, [amt, id, `2026-07:${id}`]);
  }

  await db.exec(after.map((f) => readFileSync(f, "utf8")).join("\n;\n"));

  const t = await db.query(
    `SELECT id, allocation_mode FROM public.recurring_expenditures ORDER BY category`);
  ok("a shared template becomes 'all'",
     t.rows.find((x) => x.id === shared).allocation_mode === "all");
  ok("an unshared one becomes 'none'",
     t.rows.find((x) => x.id === notShared).allocation_mode === "none");

  const e = await db.query(
    `SELECT source_template_id, allocation_mode FROM public.expenditures`);
  ok("and the costs already booked inherit what their template said",
     e.rows.find((x) => x.source_template_id === shared).allocation_mode === "all" &&
     e.rows.find((x) => x.source_template_id === notShared).allocation_mode === "none",
     JSON.stringify(e.rows.map((x) => x.allocation_mode)));
  await db.close();
}

const breakdown = async (db, month = "2026-07") =>
  (await db.query(
    `SELECT class_name, category, allocation_mode, cost_vnd::bigint, share_vnd::bigint, frozen
       FROM public.class_overhead_breakdown($1) ORDER BY class_name, category`, [month])).rows;

console.log("=== what the overhead is made of ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 12000000, counts: { A: 6, B: 3, C: 1 } });
  await db.query(
    `INSERT INTO public.expenditures (amount, category, memo, date, allocation_mode, allocation_class_id)
     VALUES (2000000, 'Books', 'Grade 6 set', '2026-07-05', 'class', $1)`, [ids.C]);
  await db.query(
    `INSERT INTO public.expenditures (amount, category, date, allocation_mode)
     VALUES (400000, 'Marketing', '2026-07-07', 'none')`);

  await asRole(db, "authenticated", "admin");
  const lines = await breakdown(db);
  const rows = await shares(db);

  ok("every class that is charged has its costs listed",
     new Set(lines.map((l) => l.class_name)).size === rows.length, `${lines.length} lines`);
  ok("the lines of a class add up to the number in its column",
     rows.every((r) =>
       lines.filter((l) => l.class_name === r.class_name)
            .reduce((n, l) => n + Number(l.share_vnd), 0) === Number(r.share_vnd)),
     JSON.stringify(rows.map((r) => [r.class_name, Number(r.share_vnd)])));

  const cLines = lines.filter((l) => l.class_name === "C");
  ok("a class shows the rent it shares and the books bought for it",
     cLines.length === 2 && cLines.map((l) => l.category).join(",") === "Books,Rent",
     cLines.map((l) => l.category).join(","));
  ok("  each line carrying the whole cost as well as this class's part",
     Number(cLines.find((l) => l.category === "Books").cost_vnd) === 2000000 &&
     Number(cLines.find((l) => l.category === "Books").share_vnd) === 2000000);
  ok("  and the rent line showing the full bill behind the share",
     Number(cLines.find((l) => l.category === "Rent").cost_vnd) === 12000000 &&
     Number(cLines.find((l) => l.category === "Rent").share_vnd) === 1200000);
  ok("the books do not appear against any other class",
     lines.filter((l) => l.category === "Books").length === 1);
  ok("a school-wide cost appears against nobody",
     lines.every((l) => l.category !== "Marketing"));
  ok("how each line was aimed is carried, so the panel can say why",
     cLines.find((l) => l.category === "Books").allocation_mode === "class" &&
     cLines.find((l) => l.category === "Rent").allocation_mode === "all");
  await db.close();
}

console.log("=== the breakdown freezes with the month ===");
{
  const db = await build();
  const { ids } = await seed(db, { rent: 1000, counts: { A: 1, B: 1 } });
  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.payroll_periods (month, status, locked_at) VALUES ('2026-07','locked',now())`);

  await asRole(db, "authenticated", "admin");
  const frozen = await breakdown(db);
  ok("closing records the lines, not just the totals", frozen.length === 2);
  ok("  and they report as frozen", frozen.every((l) => l.frozen === true));

  await asRole(db, "service_role", null);
  await db.query(`INSERT INTO public.sessions (class_id, date, status) VALUES ($1,'2026-07-20','Held')`, [ids.A]);
  await asRole(db, "authenticated", "admin");
  ok("a session added afterwards does not move them",
     (await breakdown(db)).every((l) => Number(l.share_vnd) === 500));

  const edit = await refused(db, `UPDATE public.class_overhead_lines SET share_vnd = 1 WHERE month='2026-07'`);
  ok("  nor can they be edited by hand", !!edit, edit ?? "it was allowed");

  // Reopen, remove a class from the split, re-close.
  await asRole(db, "service_role", null);
  await db.query(`UPDATE public.payroll_periods SET status='open' WHERE month='2026-07'`);
  await db.query(`UPDATE public.sessions SET status='Canceled' WHERE class_id=$1`, [ids.B]);
  await db.query(`UPDATE public.payroll_periods SET status='locked', locked_at=now() WHERE month='2026-07'`);

  await asRole(db, "authenticated", "admin");
  const after = await breakdown(db);
  ok("re-closing clears the lines of a class that dropped out",
     after.length === 1 && after[0].class_name === "A",
     JSON.stringify(after.map((l) => [l.class_name, Number(l.share_vnd)])));
  ok("  and the lines still add up to the totals",
     Number(after[0].share_vnd) === Number((await shares(db))[0].share_vnd));
  await db.close();
}

console.log("=== who may see the breakdown ===");
{
  const db = await build();
  await seed(db, { rent: 1000, counts: { A: 1 } });
  await asRole(db, "authenticated", "teacher", "11111111-1111-1111-1111-111111111111");
  ok("a teacher cannot read what the school pays, line by line",
     !!(await refused(db, `SELECT * FROM public.class_overhead_breakdown('2026-07')`)));
  ok("  nor reach the internal lines function",
     !!(await refused(db, `SELECT * FROM public.class_overhead_compute_lines('2026-07')`)));
  await asRole(db, "authenticated", "admin", "22222222-2222-2222-2222-222222222222");
  ok("an admin can", (await refused(db, `SELECT * FROM public.class_overhead_breakdown('2026-07')`)) === null);
  await db.exec(`RESET ROLE`);
  await db.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
