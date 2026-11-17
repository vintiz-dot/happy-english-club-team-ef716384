// Admin actions the assistant sets up: supabase/migrations/20261107090000.
//
// Runs the real migration against an in-process Postgres and checks what
// it promises: only admins, only through the functions, a plan checked
// again at the moment it is carried out, all of it or none of it, one
// click to undo - and undo refusing, with reasons, once a person has done
// something that depends on it.
import { PGlite } from "@electric-sql/pglite";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  ok(n, g === w, g === w ? "" : `got ${g}, want ${w}`);
};

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','partial','credit');
  CREATE TYPE public.discount_type AS ENUM ('percent','amount');
  CREATE TYPE public.discount_cadence AS ENUM ('once','monthly');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');

  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

  CREATE TABLE public.profiles (id uuid PRIMARY KEY, display_name text);
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true, primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
    date_of_birth date, family_id uuid REFERENCES public.families(id), is_active boolean NOT NULL DEFAULT true,
    linked_user_id uuid, secondary_user_id uuid, created_by uuid, updated_by uuid, deactivated_at timestamptz);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true, max_students integer);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid REFERENCES public.classes(id), date date NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL, end_date date, created_by uuid,
    CONSTRAINT unique_active_enrollment UNIQUE NULLS NOT DISTINCT (student_id, class_id, end_date));
  CREATE TABLE public.attendance (session_id uuid REFERENCES public.sessions(id),
    student_id uuid REFERENCES public.students(id), status text NOT NULL, marked_by uuid,
    UNIQUE (session_id, student_id));
  -- What production does on every enrolment: seed placeholder marks.
  CREATE FUNCTION public.seed_after_enrol() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO public.attendance (session_id, student_id, status, marked_by)
    SELECT s.id, NEW.student_id, 'Present', NULL FROM public.sessions s
    WHERE s.class_id = NEW.class_id AND s.date >= NEW.start_date
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END $$;
  CREATE TRIGGER seed_after_enrol AFTER INSERT ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.seed_after_enrol();

  CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), month text NOT NULL,
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0,
    total_amount integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer DEFAULT 0, carry_in_debt integer DEFAULT 0, carry_in_credit integer DEFAULT 0,
    status public.invoice_status NOT NULL DEFAULT 'issued', created_by uuid, updated_by uuid,
    updated_at timestamptz DEFAULT now(), tuition_frozen boolean NOT NULL DEFAULT false,
    UNIQUE (student_id, month));
  CREATE TABLE public.discount_definitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
    type public.discount_type NOT NULL, value integer NOT NULL, cadence public.discount_cadence NOT NULL,
    start_month text NOT NULL, end_month text, is_active boolean NOT NULL DEFAULT true, created_by uuid);
  CREATE TABLE public.discount_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id),
    discount_def_id uuid NOT NULL REFERENCES public.discount_definitions(id),
    effective_from date NOT NULL, effective_to date, note text, created_by uuid);
  CREATE TABLE public.monthly_finance_snapshots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id), month text NOT NULL, superseded_at timestamptz);
  CREATE TABLE public.sibling_discount_state (family_id uuid, month text, status text,
    winner_student_id uuid REFERENCES public.students(id), PRIMARY KEY (family_id, month));
  CREATE TABLE public.student_points (student_id uuid REFERENCES public.students(id), class_id uuid,
    month text, total_points integer DEFAULT 0);
  CREATE TABLE public.point_transactions (student_id uuid REFERENCES public.students(id), points integer);
  CREATE TABLE public.audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL,
    entity_id text, action text NOT NULL, actor_user_id uuid, diff jsonb, occurred_at timestamptz DEFAULT now());

  -- payments-followups: the money tables the assistant's payment step now
  -- writes through record_admin_payment (live's columns: 20251012022746,
  -- tx_key 20251024050029, the family columns, payment_deletions 20251024152825).
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('test.role', true), '') $$;
  GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, anon;
  CREATE TYPE public.account_code AS ENUM ('AR', 'REVENUE', 'DISCOUNT', 'CASH', 'BANK', 'CREDIT');
  CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid REFERENCES public.students(id),
    amount integer NOT NULL, method text, memo text, occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, family_id uuid, parent_payment_id uuid);
  CREATE TABLE public.payment_deletions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL,
    snapshot jsonb NOT NULL, deleted_by uuid, deletion_reason text NOT NULL, deleted_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now());
  CREATE TABLE public.ledger_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, code public.account_code NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (student_id, code));
  CREATE TABLE public.ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
    debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0, occurred_at timestamptz NOT NULL DEFAULT now(),
    memo text, month text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, tx_key text UNIQUE,
    CONSTRAINT debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)));
  -- D4 (20261114090000): the strongest state a bill had, kept when it is lowered or deleted.
  CREATE TABLE public.invoice_state_floor (student_id uuid NOT NULL, month text NOT NULL,
    ever_paid boolean NOT NULL DEFAULT false, max_recorded_payment numeric NOT NULL DEFAULT 0, PRIMARY KEY (student_id, month));
  CREATE FUNCTION public.test_floor() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF OLD.status::text IN ('paid', 'partial') OR coalesce(OLD.recorded_payment, 0) > 0 THEN
      INSERT INTO public.invoice_state_floor AS f (student_id, month, ever_paid, max_recorded_payment)
      VALUES (OLD.student_id, OLD.month, OLD.status::text = 'paid' OR coalesce(OLD.recorded_payment, 0) > 0, coalesce(OLD.recorded_payment, 0))
      ON CONFLICT (student_id, month) DO UPDATE SET ever_paid = f.ever_paid OR EXCLUDED.ever_paid,
        max_recorded_payment = greatest(f.max_recorded_payment, EXCLUDED.max_recorded_payment);
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END $$;
  CREATE TRIGGER zz_invoice_state_floor BEFORE UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.test_floor();
  -- What G-11 needs to install (its audit trigger is a stand-in here; the audit suite runs the real one).
  CREATE TABLE public.expenditures (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
  CREATE TABLE public.settlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid);
  CREATE FUNCTION public.audit_row_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
  -- 20260712023825: the API roles get the tables explicitly (record_admin_payment's preflight checks them).
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
`);
{
  // live's payments delete trigger: the function and trigger text of 20251024152825, verbatim.
  const migDir0 = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "supabase", "migrations");
  const t = readFileSync(join(migDir0, "20251024152825_6747d865-6888-4aa4-b728-fdb8e5a109d3.sql"), "utf8");
  const a = t.indexOf("CREATE OR REPLACE FUNCTION public.prevent_direct_payment_deletion()");
  const b = t.indexOf("EXECUTE FUNCTION public.prevent_direct_payment_deletion();", a);
  await db.exec(t.slice(a, b + "EXECUTE FUNCTION public.prevent_direct_payment_deletion();".length));
  // D4 G-21 (20261114094000): a child with payments, a paid bill or person-made marks is not deleted.
  const g = readFileSync(join(migDir0, "20261114094000_d4_money_inputs_guard.sql"), "utf8");
  const c = g.indexOf("CREATE OR REPLACE FUNCTION public._student_delete_guard()");
  const d = g.indexOf("FOR EACH ROW EXECUTE FUNCTION public._student_delete_guard();", c);
  await db.exec(g.slice(c, d + "FOR EACH ROW EXECUTE FUNCTION public._student_delete_guard();".length));
}

for (const file of process.argv.slice(2)) {
  try { await db.exec(readFileSync(file, "utf8")); ok(`migration applies: ${file.split(/[\\/]/).pop()}`, true); }
  catch (e) { ok(`migration applies: ${file.split(/[\\/]/).pop()}`, false, e.message); }
}

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const ADMIN2 = "00000000-0000-4000-8000-0000000000a2";
const TEACHER = "00000000-0000-4000-8000-0000000000b1";
await db.exec(`
  INSERT INTO public.user_roles VALUES ('${ADMIN}','admin'),('${ADMIN2}','admin'),('${TEACHER}','teacher');
  INSERT INTO public.profiles VALUES ('${ADMIN}','Mai'),('${ADMIN2}','Hoa');
`);

/** Run as a signed-in user, the way PostgREST would. */
async function as(uid, sql, params = []) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('test.uid', $1, false)", [uid ?? ""]);
  await db.query("SELECT set_config('test.role', 'authenticated', false)");
  await db.exec("SET ROLE authenticated");
  try { return await db.query(sql, params); } finally {
    await db.exec("RESET ROLE");
    await db.query("SELECT set_config('test.role', '', false)");
  }
}
const fails = async (uid, sql, params = []) => {
  try { await as(uid, sql, params); return null; } catch (e) { return e.message; }
};
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const preview = async (plan, uid = ADMIN) => (await as(uid, "SELECT public.ai_action_preview($1) AS r", [plan])).rows[0].r;
let proposals = 0;
const apply = async (plan, uid = ADMIN, proposal = `00000000-0000-4000-9000-${String(++proposals).padStart(12, "0")}`) =>
  (await as(uid, "SELECT public.ai_action_apply($1, $2, $3) AS r", [proposal, "typed by the admin", plan])).rows[0].r;
const undo = async (id, uid = ADMIN) => (await as(uid, "SELECT public.ai_action_undo($1) AS r", [id])).rows[0].r;

// Dates as the school sees them, so the suite never goes stale.
const { today } = await one("SELECT to_char((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD') AS today");
const addMonths = (ym, n) => { const d = new Date(`${ym}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
const addDays = (n) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const M0 = today.slice(0, 7), M1 = addMonths(M0, 1), M2 = addMonths(M0, 2), M3 = addMonths(M0, 3), Mprev = addMonths(M0, -1);
const label = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dayLabel = (d) => { const x = new Date(`${d}T00:00:00Z`); return `${x.getUTCDate()} ${x.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${x.getUTCFullYear()}`; };

const { id: cherry } = await one("INSERT INTO public.families (name) VALUES ('Cherry') RETURNING id");
const { id: plum } = await one("INSERT INTO public.families (name) VALUES ('Plum') RETURNING id");
const { id: stars2 } = await one("INSERT INTO public.classes (name, max_students) VALUES ('Stars 2', 12) RETURNING id");
const { id: closedClass } = await one("INSERT INTO public.classes (name, is_active) VALUES ('Old Class', false) RETURNING id");
const { id: lan } = await one(`INSERT INTO public.students (full_name, family_id) VALUES ('Lan Cherry', '${cherry}') RETURNING id`);
await db.exec(`
  INSERT INTO public.sessions (class_id, date, status) VALUES
    ('${stars2}', '${addDays(-3)}', 'Held'), ('${stars2}', '${addDays(4)}', 'Scheduled'), ('${stars2}', '${addDays(11)}', 'Scheduled');
  INSERT INTO public.enrollments (student_id, class_id, start_date) VALUES ('${lan}', '${stars2}', '2026-01-05');
  INSERT INTO public.invoices (student_id, month, base_amount, total_amount) VALUES ('${lan}', '${M0}', 1000000, 1000000);
`);

const maiThao = {
  version: 1,
  student: { new: { full_name: "Mai Thao", date_of_birth: "2021-02-18" } },
  family: { family_id: cherry },
  sibling_hold: { from: `${M3}-01` },
  enrol: { class_id: stars2, start_date: today },
  discount: { percent: 30, first_month: M0, months: 3 },
};

console.log("=== who may do it ===");
{
  ok("a teacher cannot preview", /Only administrators/.test(await fails(TEACHER, "SELECT public.ai_action_preview($1)", [maiThao]) ?? ""));
  ok("a teacher cannot apply", /Only administrators/.test(await fails(TEACHER, "SELECT public.ai_action_apply(gen_random_uuid(), 'x', $1)", [maiThao]) ?? ""));
  ok("nor undo", /Only administrators/.test(await fails(TEACHER, "SELECT public.ai_action_undo(gen_random_uuid())") ?? ""));
  let anonErr = null;
  await db.exec("SET ROLE anon");
  try { await db.query("SELECT public.ai_action_preview('{}')"); } catch (e) { anonErr = e.message; } finally { await db.exec("RESET ROLE"); }
  ok("signed out, not even the function is callable", /permission denied/.test(anonErr ?? ""), anonErr);
  ok("an admin cannot write the log directly", /permission denied/.test(await fails(ADMIN,
    "INSERT INTO public.ai_actions (proposal_id, instruction, plan, summary, effects, created_by) VALUES (gen_random_uuid(), 'x', '{}', '[]', '{}', auth.uid())") ?? ""));
  ok("nor call the inner check that skips the admin test", /permission denied/.test(await fails(ADMIN, "SELECT public.ai_plan_check('{}')") ?? ""));
  const vol = await one("SELECT string_agg(proname || '=' || provolatile::text, ',' ORDER BY proname) AS v FROM pg_proc WHERE proname IN ('ai_action_preview','ai_plan_check')");
  eq("the preview and the check are STABLE, so Postgres refuses any write in them", vol.v, "ai_action_preview=s,ai_plan_check=s");
}

console.log("=== the card the admin reads ===");
{
  const p = await preview(maiThao);
  ok("the example plan is fine", p.ok, JSON.stringify(p.problems));
  eq("and is worded line by line", p.summary, [
    "Create student: Mai Thao, born 18 Feb 2021",
    "Add to family: Cherry",
    `Sibling discount: on hold until ${dayLabel(`${M3}-01`)}`,
    `Enrol in Stars 2 from ${dayLabel(today)}`,
    `Discount: 30% on ${label(M0)}, ${label(M1)}, ${label(M2)} bills`,
  ]);
  ok("the plan the apply step acts on is not handed out", !("normal" in p));
  ok("with the nudges for afterwards", p.nudges.some((n) => /Account/.test(n)) && p.nudges.some((n) => /Tuition/.test(n)));
}

console.log("=== what the check refuses ===");
{
  const problem = async (n, plan, re) => {
    const p = await preview(plan);
    ok(n, !p.ok && p.problems.some((x) => re.test(x)), JSON.stringify(p.problems));
  };
  await problem("anything not on the list", { ...maiThao, delete_everything: true }, /Not something the assistant may do: delete_everything/);
  await problem("an extra key smuggled into a step", { ...maiThao, enrol: { ...maiThao.enrol, rate_override_vnd: 1 } }, /Unknown enrolment detail/);
  await problem("a fractional percentage", { ...maiThao, discount: { ...maiThao.discount, percent: 30.5 } }, /whole percentage/);
  await problem("a percentage given as text", { ...maiThao, discount: { ...maiThao.discount, percent: "30" } }, /whole percentage/);
  await problem("no months", { ...maiThao, discount: { ...maiThao.discount, months: 0 } }, /1 to 24 months/);
  await problem("a hold that does not end on the 1st", { ...maiThao, sibling_hold: { from: `${M3}-15` } }, /first day of a month/);
  await problem("a hold ending this month", { ...maiThao, sibling_hold: { from: `${M0}-01` } }, /later month/);
  await problem("a hold with no family", { ...maiThao, family: undefined }, /not in a family/);
  await problem("an inactive class", { ...maiThao, enrol: { class_id: closedClass, start_date: today } }, /no longer active/);
  await problem("an impossible birthday", { ...maiThao, student: { new: { full_name: "Mai Thao", date_of_birth: "2021-02-30" } } }, /not a real date/);
  await problem("someone already enrolled", { version: 1, student: { id: lan }, enrol: { class_id: stars2, start_date: today } }, /already enrolled/);
  await problem("a name already in use", { ...maiThao, student: { new: { full_name: "lan cherry" } } }, /already a student called/);
  ok("unless the admin said it is a different child", (await preview({ ...maiThao, student: { new: { full_name: "Lan Cherry" }, allow_same_name: true } })).ok);
  await problem("a payment method nobody uses", { version: 1, student: { id: lan }, payment: { amount: 123000, month: M0, method: "Crypto", paid_on: today } }, /Cash, Bank Transfer/);
  await problem("an amount given as text", { version: 1, student: { id: lan }, payment: { amount: "123000", month: M0, method: "Cash", paid_on: today } }, /whole amount/);
  await problem("a payment dated in the future", { version: 1, student: { id: lan }, payment: { amount: 1, month: M0, method: "Cash", paid_on: addDays(5) } }, /payment date/);
  await problem("nothing to do", { version: 1, student: { id: lan } }, /nothing to do/);
  const over = await preview({ version: 1, student: { id: lan }, payment: { amount: 1500000, month: M0, method: "Cash", paid_on: today } });
  ok("paying more than is owed is allowed, but said", over.ok && over.warnings.some((w) => /more than the 1\.000\.000 ₫ still owed/.test(w)), JSON.stringify(over.warnings));
}

console.log("=== doing it ===");
{
  const r = await apply(maiThao);
  ok("applies", r.ok, JSON.stringify(r));
  const kid = await one("SELECT * FROM public.students WHERE id = $1", [r.student_id]);
  eq("the student, in the family, with the hold", [kid.full_name, kid.date_of_birth?.toISOString?.().slice(0, 10) ?? String(kid.date_of_birth), kid.family_id, String(kid.sibling_discount_from?.toISOString?.().slice(0, 10) ?? kid.sibling_discount_from)],
    ["Mai Thao", "2021-02-18", cherry, `${M3}-01`]);
  const enrol = await one("SELECT count(*)::int AS n FROM public.enrollments WHERE student_id = $1", [r.student_id]);
  const seeded = await one("SELECT count(*)::int AS n FROM public.attendance WHERE student_id = $1 AND marked_by IS NULL", [r.student_id]);
  eq("enrolled, and the register seeded as usual", [enrol.n, seeded.n], [1, 2]);
  const d = await one(`SELECT to_char(a.effective_from, 'YYYY-MM-DD') AS f, to_char(a.effective_to, 'YYYY-MM-DD') AS t, d.value, d.type
    FROM public.discount_assignments a JOIN public.discount_definitions d ON d.id = a.discount_def_id WHERE a.student_id = $1`, [r.student_id]);
  const lastDay = new Date(Date.UTC(Number(M2.slice(0, 4)), Number(M2.slice(5, 7)), 0)).toISOString().slice(0, 10);
  eq("the discount covers exactly three bills (from the 2nd, so the month before is untouched)", [d.f, d.t, d.value, d.type], [`${M0}-02`, lastDay, 30, "percent"]);
  const log = await one("SELECT status, created_by, instruction FROM public.ai_actions WHERE id = $1", [r.action_id]);
  eq("logged as the admin who confirmed it", [log.status, log.created_by, log.instruction], ["applied", ADMIN, "typed by the admin"]);
  const visible = await as(ADMIN, "SELECT count(*)::int AS n FROM public.ai_actions");
  const hidden = await as(TEACHER, "SELECT count(*)::int AS n FROM public.ai_actions");
  eq("admins can read the log, a teacher sees none of it", [visible.rows[0].n, hidden.rows[0].n], [1, 0]);

  const again = await apply(maiThao, ADMIN, "00000000-0000-4000-9000-000000000001");
  const count = await one("SELECT count(*)::int AS n FROM public.students WHERE full_name = 'Mai Thao'");
  eq("a second click on the same card does nothing new", [again.already_applied, again.action_id === r.action_id, count.n], [true, true, 1]);

  const back = await undo(r.action_id, ADMIN2);
  ok("undo, by another admin", back.ok, JSON.stringify(back));
  const left = await one(`SELECT
      (SELECT count(*) FROM public.students WHERE id = $1)::int AS s,
      (SELECT count(*) FROM public.enrollments WHERE student_id = $1)::int AS e,
      (SELECT count(*) FROM public.attendance WHERE student_id = $1)::int AS a,
      (SELECT count(*) FROM public.discount_assignments WHERE student_id = $1)::int AS d,
      (SELECT count(*) FROM public.discount_definitions WHERE name LIKE '%Mai Thao')::int AS def`, [r.student_id]);
  eq("everything it made is gone", left, { s: 0, e: 0, a: 0, d: 0, def: 0 });
  const after = await one("SELECT status, undone_by FROM public.ai_actions WHERE id = $1", [r.action_id]);
  eq("the log keeps the row, marked undone and by whom", [after.status, after.undone_by], ["undone", ADMIN2]);
  ok("undoing twice is refused", (await undo(r.action_id)).reasons?.[0] === "This was already undone.");
  const audit = await one("SELECT string_agg(action, ',' ORDER BY occurred_at) AS a FROM public.audit_log WHERE entity = 'ai_action'");
  eq("both ends are in the audit log", audit.a, "ai_action_apply,ai_action_undo");
}

console.log("=== a card that went stale ===");
{
  // The admin reads the card, then something changes before Confirm.
  const plan = { version: 1, student: { id: lan }, payment: { amount: 70000, month: M2, method: "Cash", paid_on: today } };
  ok("the card was fine when shown", (await preview(plan)).ok);
  await db.query("INSERT INTO public.monthly_finance_snapshots (student_id, month) VALUES ($1, $2)", [lan, M2]);
  const r = await apply(plan);
  ok("apply checks again and refuses", r.ok === false && r.problems.some((p) => /is closed/.test(p)), JSON.stringify(r));
  const wrote = await one("SELECT count(*)::int AS n FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M2]);
  const logged = await one("SELECT count(*)::int AS n FROM public.ai_actions WHERE plan = $1::jsonb", [JSON.stringify(plan)]);
  eq("and writes nothing, not even a log row", [wrote.n, logged.n], [0, 0]);
  await db.query("DELETE FROM public.monthly_finance_snapshots");

  const forged = await apply({ ...maiThao, enrol: { class_id: closedClass, start_date: today } });
  ok("a plan the preview would never have passed is refused the same way", forged.ok === false
    && (await one("SELECT count(*)::int AS n FROM public.students WHERE full_name = 'Mai Thao'")).n === 0, JSON.stringify(forged));
}

console.log("=== all of it or none of it ===");
{
  await db.exec(`CREATE FUNCTION public.boom() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'disk full'; END $$;
    CREATE TRIGGER boom BEFORE INSERT ON public.discount_assignments FOR EACH ROW EXECUTE FUNCTION public.boom();`);
  const err = await fails(ADMIN, "SELECT public.ai_action_apply(gen_random_uuid(), 'x', $1)", [maiThao]);
  const kids = await one("SELECT count(*)::int AS n FROM public.students WHERE full_name = 'Mai Thao'");
  ok("a failure in the last step", /disk full/.test(err ?? ""), err);
  eq("leaves no student, enrolment or log row behind", [kids.n, (await one("SELECT count(*)::int AS n FROM public.ai_actions")).n], [0, 1]);
  await db.exec("DROP TRIGGER boom ON public.discount_assignments;");
}

console.log("=== undo refuses once people have done things ===");
{
  const r = await apply(maiThao);
  const marked = await db.query(`UPDATE public.attendance SET status = 'Absent', marked_by = $2
    WHERE student_id = $1 AND session_id = (SELECT session_id FROM public.attendance WHERE student_id = $1 LIMIT 1)`, [r.student_id, ADMIN]);
  eq("(a teacher marks one of her lessons)", marked.affectedRows, 1);
  const no = await undo(r.action_id);
  ok("a lesson marked by a person blocks it", !no.ok && no.reasons.some((x) => /marked by a person/.test(x)), JSON.stringify(no.reasons));
  const still = await one("SELECT family_id, sibling_discount_from IS NOT NULL AS held FROM public.students WHERE id = $1", [r.student_id]);
  eq("and nothing at all was undone", [still.family_id, still.held], [cherry, true]);

  await db.query("UPDATE public.attendance SET status = 'Present', marked_by = NULL WHERE student_id = $1", [r.student_id]);
  await db.query("INSERT INTO public.point_transactions VALUES ($1, 5)", [r.student_id]);
  await db.exec("CREATE TABLE public.new_feature (student_id uuid, note text)");
  await db.query("INSERT INTO public.new_feature VALUES ($1, 'added next year')", [r.student_id]);
  const no2 = await undo(r.action_id);
  ok("points a person gave block it", no2.reasons?.some((x) => /1 points award/.test(x)), JSON.stringify(no2.reasons));
  ok("and so does a table invented after this was written", no2.reasons?.some((x) => /1 new feature row/.test(x)));
  await db.query("DELETE FROM public.point_transactions WHERE student_id = $1", [r.student_id]);
  await db.query("DELETE FROM public.new_feature");
  ok("with those gone it undoes", (await undo(r.action_id)).ok);
}

console.log("=== recording tuition ===");
{
  const pay = (amount, month = M0) => ({ version: 1, student: { id: lan }, payment: { amount, month, method: "Bank Transfer", paid_on: today, note: "Zalo" } });
  const p = await preview(pay(123000));
  eq("the card", p.summary, ["Student: Lan Cherry", `Record tuition payment: 123.000 ₫ for ${label(M0)}, Bank Transfer, paid ${dayLabel(today)}`]);
  const r = await apply(pay(123000));
  let inv = await one("SELECT recorded_payment, status FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0]);
  eq("added to the month's payments", [inv.recorded_payment, inv.status], [123000, "partial"]);
  const a = await one("SELECT diff FROM public.audit_log WHERE entity = 'invoice' AND action = 'record_payment' ORDER BY occurred_at DESC LIMIT 1");
  // payments-followups: the payment dialog's entry IS record_admin_payment's now (via 'record-payment').
  eq("with the same audit entry the payment dialog writes (record_admin_payment's)", [a.diff.payment_amount, a.diff.method, a.diff.memo, a.diff.via, a.diff.ledger_account],
    [123000, "Bank Transfer", "Zalo", "record-payment", "BANK"]);
  eq("  and no second entry of its own (it would print the payment twice on the statement)",
    (await one("SELECT count(*)::int AS n FROM public.audit_log WHERE entity = 'invoice' AND diff->>'via' = 'assistant'")).n, 0);

  await db.query("UPDATE public.invoices SET recorded_payment = recorded_payment + 200000 WHERE student_id = $1 AND month = $2", [lan, M0]);
  ok("undo", (await undo(r.action_id)).ok);
  inv = await one("SELECT recorded_payment FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0]);
  eq("takes back only its own 123.000, not a payment recorded since", inv.recorded_payment, 200000);

  const r2 = await apply(pay(500000));
  await db.query("UPDATE public.invoices SET recorded_payment = 100000 WHERE student_id = $1 AND month = $2", [lan, M0]);
  const no = await undo(r2.action_id);
  ok("refuses when less is recorded now than it added", !no.ok && /Only 100\.000 ₫ is recorded/.test(no.reasons[0]), JSON.stringify(no.reasons));

  const r3 = await apply(pay(50000, M1));
  ok("a month with no bill gets one, as the dialog does", (await one("SELECT count(*)::int AS n FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M1])).n === 1);
  await db.query("INSERT INTO public.monthly_finance_snapshots (student_id, month) VALUES ($1, $2)", [lan, M1]);
  const closed = await undo(r3.action_id);
  ok("refuses once the month is closed", !closed.ok && /has been closed/.test(closed.reasons[0]), JSON.stringify(closed.reasons));
  const p2 = await preview(pay(1, M1));
  ok("and a closed month takes no new payments", !p2.ok && p2.problems.some((x) => /is closed/.test(x)));
  await db.query("DELETE FROM public.monthly_finance_snapshots");
  ok("reopened, the undo works and the empty bill goes", (await undo(r3.action_id)).ok
    && (await one("SELECT count(*)::int AS n FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M1])).n === 0);

  // T4: the label is the one rule (_lib/invoice-status.ts), through
  // public.invoice_paid_label (migration 20261113090000): a month whose
  // charge is covered by credit carried in, paid again on top, reads paid.
  const saved = await one("SELECT recorded_payment, carry_in_credit FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0]);
  await db.query("UPDATE public.invoices SET recorded_payment = 0, carry_in_credit = 1000000 WHERE student_id = $1 AND month = $2", [lan, M0]);
  const r4 = await apply(pay(50000));
  inv = await one("SELECT recorded_payment, status FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0]);
  eq("T4: credit covers the month, 50.000 paid on top: paid (was partial)", [inv.recorded_payment, inv.status], [50000, "paid"]);
  ok("T4: undone, nothing recorded and the credit still covers it: paid (was issued)", (await undo(r4.action_id)).ok
    && (await one("SELECT status FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0])).status === "paid");
  await db.query("UPDATE public.invoices SET recorded_payment = $3, carry_in_credit = $4, status = 'issued' WHERE student_id = $1 AND month = $2",
    [lan, M0, saved.recorded_payment, saved.carry_in_credit]);
  const def = (await one("SELECT pg_get_functiondef('public.ai_action_apply(uuid, text, jsonb)'::regprocedure) AS d")).d
    + (await one("SELECT pg_get_functiondef('public.ai_action_undo(uuid)'::regprocedure) AS d")).d;
  ok("T4: ai_action_apply / undo state no label rule of their own any more",
     (def.match(/public\.invoice_paid_label\(/g) || []).length === 2 && !/THEN 'paid'/.test(def));
  const t4mig = process.argv.slice(2).find((f) => f.includes("20261113090000"));
  let again = "not run";
  try { await db.exec(readFileSync(t4mig, "utf8")); again = null; } catch (e) { again = e.message; }
  const def2 = (await one("SELECT pg_get_functiondef('public.ai_action_apply(uuid, text, jsonb)'::regprocedure) AS d")).d
    + (await one("SELECT pg_get_functiondef('public.ai_action_undo(uuid)'::regprocedure) AS d")).d;
  // payments-followups: the apply installed by 20261117150000 has no label
  // expression of its own left (record_admin_payment labels the bill), so T4
  // pasted again now stops with its own error - and still changes nothing.
  ok("T4: the migration run a second time changes nothing (it stops: apply has no label expression left to patch)",
     /expected exactly one label expression in public\.ai_action_apply\(uuid, text, jsonb\), found 0; nothing was changed/.test(again ?? "") && def2 === def, again);

  // T4 r2 (review m1): an admin's credit label is kept by the assistant too.
  await db.query("UPDATE public.invoices SET status = 'credit' WHERE student_id = $1 AND month = $2", [lan, M0]);
  const r5 = await apply(pay(10000));
  ok("T4: a bill an admin marked credit stays credit after the assistant records a payment, and after its undo",
     (await one("SELECT status FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0])).status === "credit"
       && (await undo(r5.action_id)).ok
       && (await one("SELECT status FROM public.invoices WHERE student_id = $1 AND month = $2", [lan, M0])).status === "credit");
  await db.query("UPDATE public.invoices SET status = 'issued' WHERE student_id = $1 AND month = $2", [lan, M0]);

  // T4 r2 (review section 2): the installed source lives in a file, and nothing re-creates it without the rule.
  const refPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "sql", "ai_action_apply_undo.installed.sql");
  const norm = (s) => s.replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
  const installed = norm(`${(await one("SELECT pg_get_functiondef('public.ai_action_apply(uuid, text, jsonb)'::regprocedure) AS d")).d};\n\n`
    + `${(await one("SELECT pg_get_functiondef('public.ai_action_undo(uuid)'::regprocedure) AS d")).d};`);
  if (process.env.T4_WRITE_REFERENCE === "1") {
    writeFileSync(refPath, `-- REFERENCE ONLY - do not paste. The source of public.ai_action_apply and\n`
      + `-- public.ai_action_undo as installed after migrations 20261107090000,\n`
      + `-- 20261113090000 (the label patch) and 20261117150000 (the payment step\n`
      + `-- through record_admin_payment; its undo as delete-payment). Start any\n`
      + `-- change to either function from here, and keep public.invoice_paid_label\n`
      + `-- as its label. scripts/pgtest/ai-actions.test.mjs fails when the\n`
      + `-- installed functions differ from the text below.\n\n${installed}\n`);
  }
  // The file is its header comment, one blank line, then the source.
  const refText = existsSync(refPath) ? readFileSync(refPath, "utf8").replace(/\r\n/g, "\n") : "";
  const ref = norm(refText.slice(refText.indexOf("\n\n") + 2));
  ok("T4: docs/sql/ai_action_apply_undo.installed.sql is exactly the patched functions as installed",
     ref === installed && ref.length > 1000,
     ref === installed ? "" : ref.length ? "differs: regenerate with T4_WRITE_REFERENCE=1 only after checking the change is intended" : "file missing");
  const migDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "supabase", "migrations");
  const later = readdirSync(migDir).filter((f) => f > "20261113090000_invoice_paid_label.sql" && f.endsWith(".sql"))
    .filter((f) => /FUNCTION\s+public\.ai_action_(apply|undo)\s*\(/i.test(readFileSync(join(migDir, f), "utf8")));
  ok("T4: no later migration re-creates ai_action_apply / ai_action_undo without invoice_paid_label",
     later.every((f) => /invoice_paid_label/.test(readFileSync(join(migDir, f), "utf8"))), later.join(", "));
}

console.log("=== the payment is on the ledger (payments-followups, 20261117150000) ===");
{
  const migDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "supabase", "migrations");
  const MIG = "20261117150000_ai_action_payment_on_ledger.sql";
  const rows = async (sql, params = []) => (await db.query(sql, params)).rows;
  const n = async (sql, params = []) => Number((await one(sql, params)).n);
  // Money per child and month, as CHECK-money-invariants M03 / M04 compare it:
  // cash received in the ledger (CASH + BANK debit - credit) against the bill's recorded_payment.
  const moneyOff = async (sid) => rows(`
    WITH led AS (SELECT e.month, sum(e.debit - e.credit) AS cash FROM public.ledger_entries e
                   JOIN public.ledger_accounts a ON a.id = e.account_id AND a.code IN ('CASH', 'BANK') AND a.student_id = $1 GROUP BY e.month),
         bil AS (SELECT month, coalesce(recorded_payment, 0) AS rec FROM public.invoices WHERE student_id = $1)
    SELECT coalesce(l.month, b.month) AS month, coalesce(l.cash, 0)::bigint AS cash, coalesce(b.rec, 0)::bigint AS rec
    FROM led l FULL JOIN bil b ON b.month = l.month WHERE coalesce(l.cash, 0) <> coalesce(b.rec, 0)`, [sid]);
  const unbalanced = async () => n(`SELECT count(*) AS n FROM (SELECT tx_id FROM public.ledger_entries GROUP BY tx_id HAVING sum(debit) <> sum(credit)) t`);
  const ledgerRows = () => n("SELECT count(*) AS n FROM public.ledger_entries");
  const asService = async (sql, params = []) => {
    await db.query("SELECT set_config('test.role', 'service_role', false)");
    try { return await db.query(sql, params); } finally { await db.query("SELECT set_config('test.role', '', false)"); }
  };

  // ---------------------------------------------------- an existing child
  const { id: hoa } = await one("INSERT INTO public.students (full_name) VALUES ('Hoa Plum') RETURNING id");
  await db.query("INSERT INTO public.invoices (student_id, month, base_amount, total_amount) VALUES ($1, $2, 1000000, 1000000)", [hoa, M0]);
  const pay = (sid, amount, month = M0, method = "Cash", note = "Zalo") => ({ version: 1, student: { id: sid }, payment: { amount, month, method, paid_on: today, note } });
  const r = await apply(pay(hoa, 300000));
  ok("apply records the payment", r.ok, JSON.stringify(r));
  const eff = (await one("SELECT effects FROM public.ai_actions WHERE id = $1", [r.action_id])).effects.payment;
  const p = await one("SELECT * FROM public.payments WHERE id = $1", [eff.payment_id]);
  eq("a payments row, with the id the action keeps, the amount, the method, the note, the admin and the day paid (noon Hanoi)",
    [p?.student_id, p?.amount, p?.method, p?.memo, p?.created_by, p?.occurred_at?.toISOString?.()],
    [hoa, 300000, "Cash", "Zalo", ADMIN, new Date(`${today}T12:00:00+07:00`).toISOString()]);
  const legs = await rows(`SELECT e.*, a.code::text AS code FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE a.student_id = $1 ORDER BY a.code`, [hoa]);
  eq("two legs in one transaction on the payment's month: DR CASH keyed record-payment-<payment>-<child>, CR AR unkeyed",
    legs.map((l) => [l.code, l.debit, l.credit, l.month, l.tx_key, l.tx_id === legs[0].tx_id, l.created_by]),
    [["AR", 0, 300000, M0, null, true, ADMIN], ["CASH", 300000, 0, M0, `record-payment-${eff.payment_id}-${hoa}`, true, ADMIN]]);
  let bill = await one("SELECT recorded_payment, paid_amount, status FROM public.invoices WHERE student_id = $1 AND month = $2", [hoa, M0]);
  eq("the bill: recorded and paid 300.000, partial", [bill.recorded_payment, bill.paid_amount, bill.status], [300000, 300000, "partial"]);
  eq("the action keeps what it needs to take it back", [eff.amount, eff.month, eff.invoice_created, eff.ledger_account, eff.recorded_before, eff.recorded_after, typeof eff.ledger_tx_id],
    [300000, M0, false, "CASH", 0, 300000, "string"]);
  eq("M03 / M04: the ledger's cash for the month is the bill's recorded payment", await moneyOff(hoa), []);
  eq("M01: every transaction balances", await unbalanced(), 0);
  const audits = await rows("SELECT action, diff->>'via' AS via FROM public.audit_log WHERE entity = 'invoice' AND diff->>'student_id' = $1", [hoa]);
  eq("one audit row for the payment: record_admin_payment's", audits, [{ action: "record_payment", via: "record-payment" }]);

  const before = await ledgerRows();
  const u = await undo(r.action_id);
  ok("undo takes it back", u.ok && u.payment_reversed === true && u.student_removed === false && u.student_deactivated === false, JSON.stringify(u));
  ok("  and says what it did: reversed in the ledger, off the bill, the payment record deleted, as Delete payment does",
    u.notices?.length === 1 && /300\.000 ₫ payment .* taken back as Delete payment does: two reversing entries were added to the ledger \(it keeps every entry\), it came off the .* bill, and the payment record was deleted/.test(u.notices[0]), JSON.stringify(u.notices));
  eq("  the payments row is gone", await n("SELECT count(*) AS n FROM public.payments WHERE id = $1", [eff.payment_id]), 0);
  const rev = await rows(`SELECT e.*, a.code::text AS code FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
    WHERE e.tx_key LIKE $1 ORDER BY a.code`, [`payment-reversal-${eff.payment_id}-%`]);
  eq("  two reversal legs, keyed payment-reversal-<payment>-<leg>, mirroring the two, one transaction, same month",
    rev.map((l) => [l.code, l.debit, l.credit, l.month, l.tx_key === `payment-reversal-${eff.payment_id}-${legs.find((x) => x.code === l.code).id}`, l.tx_id === rev[0].tx_id]),
    [["AR", 300000, 0, M0, true, true], ["CASH", 0, 300000, M0, true, true]]);
  eq("  nothing in the ledger was updated or deleted: the two legs still there, two added", [await ledgerRows() - before,
    await n("SELECT count(*) AS n FROM public.ledger_entries WHERE id = ANY($1)", [legs.map((l) => l.id)])], [2, 2]);
  bill = await one("SELECT recorded_payment, paid_amount, status FROM public.invoices WHERE student_id = $1 AND month = $2", [hoa, M0]);
  eq("  the bill: back to 0 recorded, 0 paid, issued", [bill.recorded_payment, bill.paid_amount, bill.status], [0, 0, "issued"]);
  const del = await one("SELECT * FROM public.payment_deletions WHERE payment_id = $1", [eff.payment_id]);
  ok("  a payment_deletions snapshot, as delete-payment writes: the payment, the reversal, the bill change, who and why",
    del && del.deleted_by === ADMIN && del.deletion_reason === "Undo of an assistant action" && del.snapshot.payment_data.amount === 300000
      && del.snapshot.reversal_tx_ids[0] === rev[0].tx_id && del.snapshot.bill_changes[0].recordedAfter === 0 && del.snapshot.ai_action_id === r.action_id, JSON.stringify(del));
  ok("  an audit row ('payment', 'delete'), as delete-payment writes",
    (await n("SELECT count(*) AS n FROM public.audit_log WHERE entity = 'payment' AND entity_id = $1 AND action = 'delete' AND diff->>'via' = 'assistant-undo'", [eff.payment_id])) === 1);
  eq("  M03 / M04 / M01 still hold after the undo", [await moneyOff(hoa), await unbalanced()], [[], 0]);
  eq("  undoing twice is refused", (await undo(r.action_id)).reasons, ["This was already undone."]);

  // -------------------------------------------------- what undo refuses
  const r2 = await apply(pay(hoa, 100000));
  const pid2 = (await one("SELECT effects FROM public.ai_actions WHERE id = $1", [r2.action_id])).effects.payment.payment_id;
  const snap = async () => JSON.stringify([await ledgerRows(), await n("SELECT count(*) AS n FROM public.payments"), await n("SELECT count(*) AS n FROM public.payment_deletions"),
    (await one("SELECT recorded_payment FROM public.invoices WHERE student_id = $1 AND month = $2", [hoa, M0])).recorded_payment]);
  await db.query("UPDATE public.payments SET amount = 90000 WHERE id = $1", [pid2]);
  let s0 = await snap();
  let no = await undo(r2.action_id);
  ok("a payment changed since: refused, nothing changed", !no.ok && no.reasons.some((x) => /changed since/.test(x)) && await snap() === s0, JSON.stringify(no));
  await db.query("UPDATE public.payments SET amount = 100000 WHERE id = $1", [pid2]);
  await db.query(`WITH t AS (SELECT gen_random_uuid() AS tx)
    INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, month)
    SELECT t.tx, CASE WHEN a.code = 'AR' THEN 'payment-reversal-' || $1 || '-test' END, a.id,
           CASE WHEN a.code = 'AR' THEN 1 ELSE 0 END, CASE WHEN a.code = 'AR' THEN 0 ELSE 1 END, $3
    FROM t, public.ledger_accounts a WHERE a.student_id = $2 AND a.code IN ('AR', 'CASH')`, [pid2, hoa, M0]);
  s0 = await snap();
  no = await undo(r2.action_id);
  ok("a payment already reversed in the ledger: refused, nothing changed", !no.ok && no.reasons.some((x) => /already been reversed/.test(x)) && await snap() === s0, JSON.stringify(no));
  // delete-payment deleted it (the service role may; its reversal legs and bill change are not needed for this check)
  await asService("DELETE FROM public.payments WHERE id = $1", [pid2]);
  s0 = await snap();
  no = await undo(r2.action_id);
  ok("a payment deleted since (Delete payment): refused, nothing changed", !no.ok && no.reasons.some((x) => /deleted since \(Delete payment\)/.test(x)) && await snap() === s0, JSON.stringify(no));

  const big = await apply(pay(hoa, 600000000));
  ok("more than 500.000.000 in one payment: refused before anything is written",
    big.ok === false && big.problems.some((x) => /more than 500\.000\.000 ₫ cannot be recorded in one go/.test(x))
      && (await n("SELECT count(*) AS n FROM public.payments WHERE amount = 600000000")) === 0, JSON.stringify(big));

  // ------------------------------------------------- the delete rule
  const r3 = await apply(pay(hoa, 40000));
  const pid3 = (await one("SELECT effects FROM public.ai_actions WHERE id = $1", [r3.action_id])).effects.payment.payment_id;
  ok("payments delete rule: an admin's own DELETE is still refused", /Direct payment deletion is not allowed/.test(await fails(ADMIN, "DELETE FROM public.payments WHERE id = $1", [pid3]) ?? ""));
  await db.exec(`CREATE FUNCTION public.not_undo(p uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN DELETE FROM public.payments WHERE id = p; END $$; GRANT EXECUTE ON FUNCTION public.not_undo(uuid) TO authenticated;`);
  ok("  so is one made inside any other definer function", /Direct payment deletion is not allowed/.test(await fails(ADMIN, "SELECT public.not_undo($1)", [pid3]) ?? ""));
  // ai_action_undo called from inside something else: its frame is not the outermost, so the delete is refused and the undo reports it.
  await db.exec(`CREATE FUNCTION public.wrap_undo(p uuid) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RETURN public.ai_action_undo(p); END $$;
    GRANT EXECUTE ON FUNCTION public.wrap_undo(uuid) TO authenticated;`);
  const wrapped = (await as(ADMIN, "SELECT public.wrap_undo($1) AS r", [r3.action_id])).rows[0].r;
  ok("  ai_action_undo called from inside another function: the delete is refused, and the undo says so and changes nothing",
    wrapped.ok === false && wrapped.reasons.some((x) => /Direct payment deletion is not allowed/.test(x))
      && (await n("SELECT count(*) AS n FROM public.payments WHERE id = $1", [pid3])) === 1
      && (await n("SELECT count(*) AS n FROM public.ledger_entries WHERE tx_key LIKE $1", [`payment-reversal-${pid3}-%`])) === 0, JSON.stringify(wrapped));
  await db.exec(`CREATE SCHEMA shadow; CREATE FUNCTION shadow.ai_action_undo(p uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;`);
  const shadowed = await undo(r3.action_id);
  ok("  a second function called ai_action_undo anywhere: the real undo's delete is refused too (fails closed)",
    shadowed.ok === false && shadowed.reasons.some((x) => /Direct payment deletion is not allowed/.test(x)), JSON.stringify(shadowed));
  await db.exec("DROP SCHEMA shadow CASCADE");
  ok("  the service role deletes as before", (await asService("DELETE FROM public.payments WHERE id = $1 RETURNING id", [pid3])).rows.length === 1);
  await db.query("INSERT INTO public.payments (id, student_id, amount, method) VALUES ($1, $2, 40000, 'Cash')", [pid3, hoa]);
  ok("  a caller with no JWT role (the SQL editor) deletes as before", (await db.query("DELETE FROM public.payments WHERE id = $1 RETURNING id", [pid3])).rows.length === 1);
  await db.query("INSERT INTO public.payments (id, student_id, amount, method, memo, created_by) VALUES ($1, $2, 40000, 'Cash', 'Zalo', $3)", [pid3, hoa, ADMIN]);
  ok("  and the real undo, called by the admin, takes it back", (await undo(r3.action_id)).ok);

  // An action recorded before this migration (bill only, no payment_id): undone exactly as before.
  await db.query("UPDATE public.invoices SET recorded_payment = coalesce(recorded_payment, 0) + 25000 WHERE student_id = $1 AND month = $2", [hoa, M0]);
  const invId = (await one("SELECT id FROM public.invoices WHERE student_id = $1 AND month = $2", [hoa, M0])).id;
  const { id: oldAction } = await one(`INSERT INTO public.ai_actions (proposal_id, instruction, plan, summary, effects, student_id, created_by)
    VALUES (gen_random_uuid(), 'old', '{}', '[]', $1, $2, $3) RETURNING id`,
    [{ student_id: hoa, student_created: false, nudges: [], payment: { invoice_id: invId, month: M0, amount: 25000, invoice_created: false } }, hoa, ADMIN]);
  const l0 = await ledgerRows(), rec0 = (await one("SELECT recorded_payment FROM public.invoices WHERE id = $1", [invId])).recorded_payment;
  const old = await undo(oldAction);
  ok("an action from before (on the bill only): undone as before - off the bill, its correction audit row, the ledger untouched",
    old.ok && old.payment_reversed === false && (await ledgerRows()) === l0
      && (await one("SELECT recorded_payment FROM public.invoices WHERE id = $1", [invId])).recorded_payment === rec0 - 25000
      && (await n("SELECT count(*) AS n FROM public.audit_log WHERE entity = 'invoice' AND entity_id = $1 AND action = 'payment_correction' AND diff->>'via' = 'assistant'", [invId])) === 1, JSON.stringify(old));

  // ------------------------------------------- a new child and a payment
  const kidPlan = (name) => ({
    version: 1, student: { new: { full_name: name, date_of_birth: "2020-05-05" } }, family: { family_id: cherry },
    sibling_hold: { from: `${M3}-01` }, enrol: { class_id: stars2, start_date: today },
    discount: { percent: 10, first_month: M0, months: 2 },
    payment: { amount: 200000, month: M0, method: "Bank Transfer", paid_on: today },
  });
  const k = await apply(kidPlan("Bao Cherry"));
  ok("a new child, enrolled, discounted, in a family, held, and paid for: applies", k.ok, JSON.stringify(k));
  const kid = k.student_id;
  const kEff = (await one("SELECT effects FROM public.ai_actions WHERE id = $1", [k.action_id])).effects;
  eq("  the month had no bill: one with no charge, and the payment on it, on the ledger (BANK)",
    [kEff.payment.invoice_created, (await one("SELECT recorded_payment FROM public.invoices WHERE student_id = $1 AND month = $2", [kid, M0])).recorded_payment,
     kEff.payment.ledger_account, await n("SELECT count(*) AS n FROM public.payments WHERE student_id = $1", [kid])], [true, 200000, "BANK", 1]);
  const actOwn = (await one("SELECT public.ai_student_activity($1, $2) AS a", [kid, [kEff.payment.payment_id]])).a;
  const actAll = (await one("SELECT public.ai_student_activity($1) AS a", [kid])).a;
  ok("  ai_student_activity: its own payment and ledger rows are not 'added by people since'; the one-argument form still counts them",
    !actOwn.some((x) => /payment\(s\)|ledger entry/.test(x)) && actAll.includes("1 payment(s)") && actAll.includes("2 ledger entry(ies)"), JSON.stringify({ actOwn, actAll }));
  const ku = await undo(k.action_id);
  ok("undo: everything taken back, and the child kept, made inactive", ku.ok && ku.student_deactivated === true && ku.student_removed === false
    && ku.payment_reversed === true && ku.open_path === `/students/${kid}`, JSON.stringify(ku));
  ok("  and it says so: the payment reversed, and why the child is inactive rather than deleted",
    ku.notices?.length === 2 && /taken back as Delete payment does/.test(ku.notices[0])
      && /Bao Cherry was not deleted but made inactive: the payment this recorded stays in the ledger's history \(reversed\), and a child with ledger history keeps their record\. Everything else the assistant set up for them was removed\./.test(ku.notices[1]), JSON.stringify(ku.notices));
  const kidRow = await one("SELECT is_active, family_id, sibling_discount_from FROM public.students WHERE id = $1", [kid]);
  eq("  the child: inactive, out of the family, no hold", [kidRow?.is_active, kidRow?.family_id, kidRow?.sibling_discount_from], [false, null, null]);
  eq("  the enrolment, its marks, the discount, the bills and the payment are gone",
    [await n("SELECT count(*) AS n FROM public.enrollments WHERE student_id = $1", [kid]), await n("SELECT count(*) AS n FROM public.attendance WHERE student_id = $1", [kid]),
     await n("SELECT count(*) AS n FROM public.discount_assignments WHERE student_id = $1", [kid]), await n("SELECT count(*) AS n FROM public.discount_definitions WHERE name LIKE '%Bao Cherry'"),
     await n("SELECT count(*) AS n FROM public.invoices WHERE student_id = $1", [kid]), await n("SELECT count(*) AS n FROM public.payments WHERE student_id = $1", [kid])],
    [0, 0, 0, 0, 0, 0]);
  eq("  the ledger keeps the payment and its reversal (4 legs, nothing net), and the deletion record",
    [await n(`SELECT count(*) AS n FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id WHERE a.student_id = $1`, [kid]),
     await n(`SELECT coalesce(sum(e.debit - e.credit), 0) AS n FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id WHERE a.student_id = $1 AND a.code IN ('CASH','BANK')`, [kid]),
     await n("SELECT count(*) AS n FROM public.payment_deletions WHERE payment_id = $1", [kEff.payment.payment_id])], [4, 0, 1]);
  const delErr = await db.query("DELETE FROM public.students WHERE id = $1", [kid]).then(() => null, (e) => e.code);
  ok("  why it is kept: deleting this child is refused by the database itself (G-21 HC121 / the append-only ledger HC130)", ["HC121", "HC130"].includes(delErr), delErr);
  eq("  M03 / M04 / M01 hold for the child", [await moneyOff(kid), await unbalanced()], [[], 0]);

  // a person's own payment since blocks the undo of a new child (and nothing is changed)
  // (no discount on this one: a payment on a discounted month is refused by the discount step first, as before)
  const { discount: _d, ...noDiscount } = kidPlan("Chi Cherry");
  const k2 = await apply(noDiscount);
  ok("(a second new child, paid for, no discount)", k2.ok, JSON.stringify(k2));
  const kid2 = k2.student_id;
  await as(ADMIN, "SELECT public.record_admin_payment(gen_random_uuid(), $1, $2, 'payment', 50000, 'Cash', now(), 'at the desk', NULL)", [kid2, M0]);
  const l1 = await ledgerRows();
  const ku2 = await undo(k2.action_id);
  ok("a new child with a payment a person recorded since: refused, naming it - the action's own payment is not counted",
    !ku2.ok && ku2.reasons.some((x) => /People have added records for this student since: .*1 payment\(s\)/.test(x) && /2 ledger entry\(ies\)/.test(x))
      && (await ledgerRows()) === l1 && (await n("SELECT count(*) AS n FROM public.payments WHERE student_id = $1", [kid2])) === 2
      && (await one("SELECT is_active FROM public.students WHERE id = $1", [kid2])).is_active === true, JSON.stringify(ku2));

  // a new child with no payment: deleted, exactly as before
  const k3 = await apply({ version: 1, student: { new: { full_name: "Dung Cherry" } }, enrol: { class_id: stars2, start_date: today } });
  const ku3 = await undo(k3.action_id);
  ok("a new child with no payment: deleted, as before", ku3.ok && ku3.student_removed === true && ku3.student_deactivated === false
    && (ku3.notices ?? []).length === 0 && (await n("SELECT count(*) AS n FROM public.students WHERE id = $1", [k3.student_id])) === 0, JSON.stringify(ku3));

  // ------------------------------------------- all of it or none of it
  await db.exec(`CREATE FUNCTION public.boom2() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'ledger down'; END $$;
    CREATE TRIGGER boom2 BEFORE INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.boom2();`);
  const kids0 = await n("SELECT count(*) AS n FROM public.students"), pays0 = await n("SELECT count(*) AS n FROM public.payments"), acts0 = await n("SELECT count(*) AS n FROM public.ai_actions");
  const err = await fails(ADMIN, "SELECT public.ai_action_apply(gen_random_uuid(), 'x', $1)", [kidPlan("Em Cherry")]);
  ok("the ledger failing inside the payment step: apply fails, and leaves no child, payment, bill or log row",
    /ledger down/.test(err ?? "") && await n("SELECT count(*) AS n FROM public.students") === kids0 && await n("SELECT count(*) AS n FROM public.payments") === pays0
      && await n("SELECT count(*) AS n FROM public.ai_actions") === acts0 && await n("SELECT count(*) AS n FROM public.students WHERE full_name = 'Em Cherry'") === 0, err);
  await db.exec("DROP TRIGGER boom2 ON public.ledger_entries");

  // ------------------------------------------------ the migration itself
  const md5 = (s) => createHash("md5").update(s.replace(/\r/g, "")).digest("hex");
  const defOf = async (sig) => (await one(`SELECT pg_get_functiondef('${sig}'::regprocedure) AS d`)).d;
  const migText = readFileSync(join(migDir, MIG), "utf8");
  const now = {};
  for (const [k2_, sig] of [["APPLY", "public.ai_action_apply(uuid, text, jsonb)"], ["UNDO", "public.ai_action_undo(uuid)"],
    ["ACTIVITY1", "public.ai_student_activity(uuid)"], ["ACTIVITY2", "public.ai_student_activity(uuid, uuid[])"], ["TRIGGER", "public.prevent_direct_payment_deletion()"]]) now[k2_] = md5(await defOf(sig));
  if (process.env.AI_PRINT_MD5) console.log(JSON.stringify(now));
  ok("the migration's preflight pins exactly the versions it installs (so a second paste is accepted and anything else refused)",
    Object.values(now).every((h) => migText.includes(`'${h}'`)), JSON.stringify(now));
  const defs0 = JSON.stringify(now);
  const allMd5 = async () => {
    const o = {};
    for (const [k2_, sig] of [["APPLY", "public.ai_action_apply(uuid, text, jsonb)"], ["UNDO", "public.ai_action_undo(uuid)"],
      ["ACTIVITY1", "public.ai_student_activity(uuid)"], ["ACTIVITY2", "public.ai_student_activity(uuid, uuid[])"], ["TRIGGER", "public.prevent_direct_payment_deletion()"]]) o[k2_] = md5(await defOf(sig));
    return JSON.stringify(o);
  };
  let again2 = null;
  try { await db.exec(migText); } catch (e) { again2 = e.message; }
  ok("  pasted twice: accepted, nothing changes", again2 === null && (await allMd5()) === defs0, again2);
  const refuses = async (label, breakIt, restore, re) => {
    await db.exec(breakIt);
    const broken = await allMd5();
    let e2 = null;
    try { await db.exec(migText); } catch (e) { e2 = e.message; }
    const afterPaste = await allMd5();
    await db.exec(restore);
    ok(`  refuses to install, changing nothing, when ${label}`, re.test(e2 ?? "") && afterPaste === broken && (await allMd5()) === defs0, e2);
  };
  const undoSrc = await defOf("public.ai_action_undo(uuid)");
  await refuses("the installed undo is not a version it knows",
    undoSrc.replace("All of it or none of it.", "All of it or none of it (edited)."), undoSrc, /ai_action_undo\(uuid\) is not the version this replaces/);
  const trigSrc = await defOf("public.prevent_direct_payment_deletion()");
  await refuses("the payments delete rule is not a version it knows",
    trigSrc.replace("Direct payment deletion is not allowed.", "Deletion is not allowed."), trigSrc, /prevent_direct_payment_deletion\(\) is not the version this replaces/);
  await refuses("the payments delete trigger is missing",
    "DROP TRIGGER prevent_client_payment_deletion ON public.payments",
    "CREATE TRIGGER prevent_client_payment_deletion BEFORE DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_payment_deletion()",
    /payments has no prevent_client_payment_deletion trigger/);
  await refuses("record_admin_payment is not installed",
    "ALTER FUNCTION public.record_admin_payment(uuid, uuid, text, text, integer, text, timestamptz, text, integer) RENAME TO record_admin_payment_x",
    "ALTER FUNCTION public.record_admin_payment_x(uuid, uuid, text, text, integer, text, timestamptz, text, integer) RENAME TO record_admin_payment",
    /record_admin_payment is not installed/);
  await refuses("payment_deletions lacks a column it writes",
    "ALTER TABLE public.payment_deletions RENAME COLUMN snapshot TO snapshot_x", "ALTER TABLE public.payment_deletions RENAME COLUMN snapshot_x TO snapshot",
    /missing column\(s\) payment_deletions\.snapshot/);
  ok("  the new two-argument activity check is not callable by any API role",
    !(await one("SELECT has_function_privilege('authenticated', 'public.ai_student_activity(uuid, uuid[])', 'EXECUTE') AS x")).x
      && !(await one("SELECT has_function_privilege('anon', 'public.ai_student_activity(uuid, uuid[])', 'EXECUTE') AS x")).x);
  const applyDef = await defOf("public.ai_action_apply(uuid, text, jsonb)");
  ok("  apply writes no recorded_payment, no ledger and no payments row itself: only through record_admin_payment",
    /public\.record_admin_payment\(/.test(applyDef) && !/recorded_payment\s*=/.test(applyDef) && !/INTO public\.(ledger_entries|payments)\b/.test(applyDef));
  const undoDef = await defOf("public.ai_action_undo(uuid)");
  ok("  undo never updates or deletes a ledger row (G-11), only inserts reversals",
    !/(UPDATE|DELETE FROM)\s+public\.ledger_entries/i.test(undoDef) && /INSERT INTO public\.ledger_entries/.test(undoDef));
}

console.log("=== families ===");
{
  const r = await apply({ version: 1, student: { id: lan }, family: { family_id: plum } });
  ok("a move between families", r.ok, JSON.stringify(r));
  await db.query(`INSERT INTO public.sibling_discount_state (family_id, month, status, winner_student_id)
    VALUES ($1, $2, 'assigned', $3), ($4, $2, 'assigned', NULL), ($1, $5, 'assigned', $3)`, [plum, M0, lan, cherry, Mprev]);
  await db.query("INSERT INTO public.monthly_finance_snapshots (student_id, month) VALUES ($1, $2)", [lan, Mprev]);
  ok("undo", (await undo(r.action_id)).ok);
  const fam = await one("SELECT family_id FROM public.students WHERE id = $1", [lan]);
  const states = await db.query("SELECT family_id = $1 AS plum, month FROM public.sibling_discount_state ORDER BY month", [plum]);
  eq("back in the first family", fam.family_id, cherry);
  eq("this month's family discount working is cleared for both families; a closed month keeps what was billed",
    states.rows.map((s) => s.month), [Mprev]);
  await db.query("DELETE FROM public.monthly_finance_snapshots");

  const moved = await apply({ version: 1, student: { id: lan }, family: { family_id: plum } });
  await db.query("UPDATE public.students SET family_id = NULL WHERE id = $1", [lan]);
  const no = await undo(moved.action_id);
  ok("refuses if someone moved the student again since", !no.ok && /moved this student/.test(no.reasons[0]));
  await db.query("UPDATE public.students SET family_id = $2 WHERE id = $1", [lan, cherry]);
}

console.log("=== the log screen ===");
{
  const rows = (await as(ADMIN, "SELECT * FROM public.ai_actions_list(100)")).rows;
  ok("lists newest first, with who did and undid it", rows.length >= 5 && rows[0].created_at >= rows[1].created_at
    && rows.some((r) => r.created_by_name === "Mai" && r.undone_by_name === "Hoa"), JSON.stringify(rows.slice(0, 2)));
  ok("and says when the student it made is gone", rows.some((r) => r.student_exists === false));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
