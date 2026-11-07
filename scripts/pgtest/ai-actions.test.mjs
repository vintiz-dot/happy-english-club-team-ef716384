// Admin actions the assistant sets up: supabase/migrations/20261107090000.
//
// Runs the real migration against an in-process Postgres and checks what
// it promises: only admins, only through the functions, a plan checked
// again at the moment it is carried out, all of it or none of it, one
// click to undo - and undo refusing, with reasons, once a person has done
// something that depends on it.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

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
`);

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
  await db.exec("SET ROLE authenticated");
  try { return await db.query(sql, params); } finally { await db.exec("RESET ROLE"); }
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
  eq("with the same audit entry the payment dialog writes", [a.diff.payment_amount, a.diff.payment_method, a.diff.memo, a.diff.via], [123000, "Bank Transfer", "Zalo", "assistant"]);

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
  const rows = (await as(ADMIN, "SELECT * FROM public.ai_actions_list(10)")).rows;
  ok("lists newest first, with who did and undid it", rows.length >= 5 && rows[0].created_at >= rows[1].created_at
    && rows.some((r) => r.created_by_name === "Mai" && r.undone_by_name === "Hoa"), JSON.stringify(rows.slice(0, 2)));
  ok("and says when the student it made is gone", rows.some((r) => r.student_exists === false));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
