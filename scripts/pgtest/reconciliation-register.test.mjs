// Tuition audit phase 2: supabase/migrations/20261121100000_tuition_reconciliation_register.sql
// over the real invoice_paid_label (20261113090000) and record_admin_payment
// (20261117121000), in paste order.
//
// What this suite holds:
//   1. Only an admin reads the register or decides an item; the loaded facts
//      never change; a decision is written only through the RPC.
//   2. Each decision kind does what it says: sheet_missed, rounding_accepted
//      and refer_phase4 move no money; not_received writes negative
//      corrections (memo 'audit: not received'); wrong_month writes a
//      correction on one month and a payment on the other, one receipt date.
//      Every money leg is a payments row with both ledger legs and the bill
//      moved - made by record_admin_payment.
//   3. A decided item is final: a second decision, an update or a delete is
//      refused. A correction larger than the bill holds, or than the gap the
//      audit found, is refused - and a refusal leaves nothing behind, even
//      the legs already written for the same decision.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  ok(n, g === w, `got ${g}, want ${w}`);
};

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','partial','credit');
  CREATE TYPE public.account_code AS ENUM ('AR','CASH','BANK','REVENUE','CREDIT','DISCOUNT');

  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
    family_id uuid REFERENCES public.families(id));
  CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), month text NOT NULL,
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0,
    total_amount integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer DEFAULT 0, carry_in_debt integer DEFAULT 0, carry_in_credit integer DEFAULT 0,
    status public.invoice_status NOT NULL DEFAULT 'issued', updated_by uuid,
    updated_at timestamptz DEFAULT now(), UNIQUE (student_id, month));
  CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), amount integer NOT NULL, method text NOT NULL,
    memo text, occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.ledger_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), code public.account_code NOT NULL, UNIQUE (student_id, code));
  CREATE TABLE public.ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id), debit integer NOT NULL DEFAULT 0,
    credit integer NOT NULL DEFAULT 0, occurred_at timestamptz NOT NULL, memo text, month text NOT NULL, created_by uuid);
  CREATE TABLE public.audit_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL,
    entity_id text, action text NOT NULL, actor_user_id uuid, diff jsonb, occurred_at timestamptz DEFAULT now());
  GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
`);

for (const file of process.argv.slice(2)) {
  try { await db.exec(readFileSync(file, "utf8")); ok(`migration applies: ${file.split(/[\\/]/).pop()}`, true); }
  catch (e) { ok(`migration applies: ${file.split(/[\\/]/).pop()}`, false, e.message); }
}

const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const TEACHER = "00000000-0000-4000-8000-0000000000b1";
await db.exec(`INSERT INTO public.user_roles VALUES ('${ADMIN}','admin'),('${TEACHER}','teacher');`);

async function as(uid, sql, params = []) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('test.uid', $1, false)", [uid ?? ""]);
  await db.exec("SET ROLE authenticated");
  try { return await db.query(sql, params); } finally { await db.exec("RESET ROLE"); }
}
const refusal = async (uid, sql, params = []) => {
  try { await as(uid, sql, params); return null; } catch (e) { return { code: e.code, message: e.message }; }
};
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const decide = (item, decision, note, legs = [], method = null, at = null, uid = ADMIN) =>
  as(uid, "SELECT public.decide_tuition_reconciliation_item($1, $2, $3, $4, $5, $6) AS r",
    [item, decision, note, JSON.stringify(legs), method, at]).then((r) => r.rows[0].r);
const decideFails = (item, decision, note, legs = [], method = null, at = null, uid = ADMIN) =>
  refusal(uid, "SELECT public.decide_tuition_reconciliation_item($1, $2, $3, $4, $5, $6)",
    [item, decision, note, JSON.stringify(legs), method, at]);
const counts = async () => one(`SELECT (SELECT count(*) FROM public.payments)::int AS payments,
  (SELECT count(*) FROM public.ledger_entries)::int AS ledger`);
const recorded = async (student, month) =>
  (await one("SELECT recorded_payment AS r FROM public.invoices WHERE student_id = $1 AND month = $2", [student, month])).r;

// Two families: Oak (two children, pays once for both) and Elm (one child).
const { id: oak } = await one("INSERT INTO public.families (name) VALUES ('Oak') RETURNING id");
const { id: elm } = await one("INSERT INTO public.families (name) VALUES ('Elm') RETURNING id");
const { id: o1 } = await one(`INSERT INTO public.students (full_name, family_id) VALUES ('Oak One', '${oak}') RETURNING id`);
const { id: o2 } = await one(`INSERT INTO public.students (full_name, family_id) VALUES ('Oak Two', '${oak}') RETURNING id`);
const { id: e1 } = await one(`INSERT INTO public.students (full_name, family_id) VALUES ('Elm One', '${elm}') RETURNING id`);
await db.exec(`
  INSERT INTO public.invoices (student_id, month, base_amount, total_amount, recorded_payment, paid_amount, status) VALUES
    ('${o1}', '2026-04', 2000000, 2000000, 2000000, 2000000, 'paid'),
    ('${o2}', '2026-04', 1000000, 1000000, 1000000, 1000000, 'paid'),
    ('${e1}', '2026-02', 1500000, 1500000, 0, 0, 'issued'),
    ('${e1}', '2026-03', 1500000, 1500000, 3000000, 3000000, 'paid'),
    ('${e1}', '2026-05', 1596000, 1596000, 1600000, 1600000, 'paid'),
    ('${e1}', '2026-01', 1260000, 1260000, 1260000, 1260000, 'paid');
`);

// What the loader's SQL inserts.
const item = async (key, f) => (await one(`INSERT INTO public.tuition_reconciliation_items
    (item_key, family_id, student_ids, month, sheet_amount, app_recorded, app_billed, pattern, evidence)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
  [key, f.family ?? null, f.students ?? [], f.month, f.sheet, f.recorded, f.billed ?? null, f.pattern, f.evidence ?? null])).id;
const oakApr = await item(`family:${oak}:2026-04`, { family: oak, students: [o1, o2], month: "2026-04", sheet: 1800000, recorded: 3000000, billed: 3000000, pattern: "B" });
const elmFeb = await item(`family:${elm}:2026-02`, { family: elm, students: [e1], month: "2026-02", sheet: 1500000, recorded: 0, billed: 1500000, pattern: "D" });
const elmMay = await item(`family:${elm}:2026-05`, { family: elm, students: [e1], month: "2026-05", sheet: 1600000, recorded: 1600000 - 4000 + 4000, billed: 1596000, pattern: "C" });
const elmJan = await item(`family:${elm}:2026-01`, { family: elm, students: [e1], month: "2026-01", sheet: 1680000, recorded: 1260000, billed: 1260000, pattern: "E" });
const unmatched = await item("sheet:abc123:2026-03", { month: "2026-03", sheet: 1890000, recorded: 0, pattern: "A", evidence: "sheet row 12, no student in the app" });
const spare = await item("sheet:def456:2026-04", { month: "2026-04", sheet: 997000, recorded: 0, pattern: "A" });

console.log("=== who may see and decide ===");
{
  const t = await as(TEACHER, "SELECT count(*)::int AS n FROM public.tuition_reconciliation_items");
  const a = await as(ADMIN, "SELECT count(*)::int AS n FROM public.tuition_reconciliation_items");
  eq("an admin reads every item, a teacher none", [a.rows[0].n, t.rows[0].n], [6, 0]);
  const r = await decideFails(oakApr, "sheet_missed", "x", [], null, null, TEACHER);
  eq("a teacher cannot decide", r?.code, "RC403");
  let anonErr = null;
  await db.exec("SET ROLE anon");
  try { await db.query("SELECT public.decide_tuition_reconciliation_item(gen_random_uuid(), 'sheet_missed', 'x')"); } catch (e) { anonErr = e.message; } finally { await db.exec("RESET ROLE"); }
  ok("signed out, the function is not callable", /permission denied/.test(anonErr ?? ""), anonErr);
  const t2 = await refusal(TEACHER, "INSERT INTO public.tuition_reconciliation_items (item_key, month, sheet_amount, app_recorded, pattern) VALUES ('x', '2026-01', 1, 0, 'A')");
  ok("a teacher cannot add an item", /row-level security/.test(t2?.message ?? ""), t2?.message);
  const direct = await refusal(ADMIN, `UPDATE public.tuition_reconciliation_items SET status = 'decided', decision = 'sheet_missed', decided_by = auth.uid(), decided_at = now() WHERE id = '${oakApr}'`);
  eq("an admin cannot mark an item decided directly", direct?.code, "RC403");
  const facts = await refusal(ADMIN, `UPDATE public.tuition_reconciliation_items SET sheet_amount = 3000000 WHERE id = '${oakApr}'`);
  eq("nor change the audit's figures", facts?.code, "RC403");
  let flagOnly = null;
  await db.query("SELECT set_config('test.uid', $1, false)", [ADMIN]);
  try {
    await db.exec(`BEGIN; SET LOCAL ROLE authenticated;
      SELECT set_config('hec.tuition_reconciliation_item', '${oakApr}', true);
      UPDATE public.tuition_reconciliation_items SET sheet_amount = 1 WHERE id = '${oakApr}'; COMMIT;`);
  } catch (e) { flagOnly = { code: e.code }; await db.exec("ROLLBACK"); }
  await db.exec("RESET ROLE");
  ok("even with the flag set, the facts stay", flagOnly?.code === "RC403", JSON.stringify(flagOnly));
  const unknown = await decideFails(oakApr, "write_off", "x");
  eq("an unknown decision is refused", unknown?.code, "22023");
  const noNote = await decideFails(oakApr, "sheet_missed", "  ");
  eq("a decision needs a note", noNote?.code, "22023");
  const total = await one("SELECT sum(difference)::bigint AS d FROM public.tuition_reconciliation_items");
  eq("difference is sheet minus recorded", Number(total.d), (1800000 - 3000000) + 1500000 + 0 + 420000 + 1890000 + 997000);
}

console.log("=== not received ===");
{
  const before = await counts();
  const over = await decideFails(oakApr, "not_received", "bank statement April: one transfer of 1,800,000",
    [{ student_id: o2, month: "2026-04", kind: "correction", amount: 1100000 }], "Bank Transfer", "2026-11-21T09:00:00+07:00");
  eq("a correction larger than the bill holds is refused", over?.code, "RC422");
  const pastGap = await decideFails(oakApr, "not_received", "bank statement",
    [{ student_id: o1, month: "2026-04", kind: "correction", amount: 1300000 }], "Bank Transfer", "2026-11-21T09:00:00+07:00");
  eq("so is one larger than the gap the audit found (1,200,000)", pastGap?.code, "RC422");
  const rollback = await decideFails(oakApr, "not_received", "bank statement",
    [{ student_id: o1, month: "2026-04", kind: "correction", amount: 200000 },
     { student_id: o2, month: "2026-04", kind: "correction", amount: 1000001 }], "Bank Transfer", "2026-11-21T09:00:00+07:00");
  ok("a refusal on the second leg is refused whole", rollback?.code === "RC422" || rollback?.code === "RP422", JSON.stringify(rollback));
  eq("and nothing of the first leg is left", [await counts(), await recorded(o1, "2026-04")], [before, 2000000]);
  const outsider = await decideFails(oakApr, "not_received", "bank statement",
    [{ student_id: e1, month: "2026-04", kind: "correction", amount: 1000 }], "Cash", "2026-11-21T09:00:00+07:00");
  eq("a leg on another family's child is refused", outsider?.code, "22023");
  const payment = await decideFails(oakApr, "not_received", "bank statement",
    [{ student_id: o1, month: "2026-04", kind: "payment", amount: 1000 }], "Cash", "2026-11-21T09:00:00+07:00");
  eq("not received takes corrections only", payment?.code, "22023");
  const noDate = await decideFails(oakApr, "not_received", "bank statement",
    [{ student_id: o1, month: "2026-04", kind: "correction", amount: 1000 }], "Cash", null);
  eq("money needs a receipt date", noDate?.code, "22023");

  const r = await decide(oakApr, "not_received", "bank statement April: one transfer of 1,800,000",
    [{ student_id: o1, month: "2026-04", kind: "correction", amount: 200000 },
     { student_id: o2, month: "2026-04", kind: "correction", amount: 1000000 }], "Bank Transfer", "2026-11-21T09:00:00+07:00");
  ok("decided", r.ok && r.paymentIds.length === 2, JSON.stringify(r));
  const pays = (await db.query("SELECT student_id, amount, memo, method FROM public.payments WHERE id = ANY ($1::uuid[]) ORDER BY amount", [r.paymentIds])).rows;
  eq("two negative corrections, memo 'audit: not received'", pays.map((p) => [p.student_id, p.amount, p.memo]),
    [[o2, -1000000, "audit: not received"], [o1, -200000, "audit: not received"]]);
  const legs = (await db.query(`SELECT a.code::text AS code, e.debit, e.credit, e.month FROM public.ledger_entries e
      JOIN public.ledger_accounts a ON a.id = e.account_id WHERE a.student_id = $1 ORDER BY a.code::text`, [o2])).rows;
  eq("both ledger legs: DR AR / CR BANK on April", legs.map((l) => [l.code, l.debit, l.credit, l.month]),
    [["AR", 1000000, 0, "2026-04"], ["BANK", 0, 1000000, "2026-04"]]);
  const bills = await one(`SELECT (SELECT recorded_payment FROM public.invoices WHERE student_id = $1 AND month = '2026-04') AS a,
      (SELECT status::text FROM public.invoices WHERE student_id = $2 AND month = '2026-04') AS s2,
      (SELECT recorded_payment FROM public.invoices WHERE student_id = $2 AND month = '2026-04') AS b`, [o1, o2]);
  eq("the bills now hold the sheet's 1,800,000 and reopen the debt", [bills.a, bills.b, bills.s2], [1800000, 0, "issued"]);
  const row = await one("SELECT status, decision, decided_by, payment_ids, decision_note FROM public.tuition_reconciliation_items WHERE id = $1", [oakApr]);
  eq("the item is decided, by whom, with the payments it made", [row.status, row.decision, row.decided_by, row.payment_ids.length],
    ["decided", "not_received", ADMIN, 2]);
  const again = await decideFails(oakApr, "sheet_missed", "changed my mind");
  eq("a second decision is refused", again?.code, "RC409");
  const del = await refusal(ADMIN, `DELETE FROM public.tuition_reconciliation_items WHERE id = '${oakApr}'`);
  const still = await one("SELECT count(*)::int AS n FROM public.tuition_reconciliation_items WHERE id = $1", [oakApr]);
  eq("a decided item cannot be deleted", still.n, 1);
  ok("(the admin's delete matched no row or was refused)", del === null || del.code === "RC409", JSON.stringify(del));
  const audit = await one("SELECT count(*)::int AS n FROM public.audit_log WHERE entity = 'tuition_reconciliation_item' AND entity_id = $1", [oakApr]);
  eq("the decision is in the audit log", audit.n, 1);
}

console.log("=== wrong month ===");
{
  const at = "2026-03-10T10:00:00+07:00";
  const unequal = await decideFails(elmFeb, "wrong_month", "T3 'Over paid Feb' column",
    [{ student_id: e1, month: "2026-03", kind: "correction", amount: 1500000 },
     { student_id: e1, month: "2026-02", kind: "payment", amount: 1400000 }], "Cash", at);
  eq("the correction and the payment must be equal", unequal?.code, "22023");
  const sameMonth = await decideFails(elmFeb, "wrong_month", "x",
    [{ student_id: e1, month: "2026-02", kind: "correction", amount: 1 }, { student_id: e1, month: "2026-02", kind: "payment", amount: 1 }], "Cash", at);
  eq("the two months must differ", sameMonth?.code, "22023");
  const elsewhere = await decideFails(elmFeb, "wrong_month", "x",
    [{ student_id: e1, month: "2026-03", kind: "correction", amount: 1 }, { student_id: e1, month: "2026-05", kind: "payment", amount: 1 }], "Cash", at);
  eq("one of them must be the item's month", elsewhere?.code, "22023");

  const r = await decide(elmFeb, "wrong_month", "T3 'Over paid Feb' column",
    [{ student_id: e1, month: "2026-02", kind: "payment", amount: 1500000 },
     { student_id: e1, month: "2026-03", kind: "correction", amount: 1500000 }], "Cash", at);
  ok("decided", r.ok && r.paymentIds.length === 2, JSON.stringify(r));
  const pays = (await db.query("SELECT amount, memo, occurred_at FROM public.payments WHERE id = ANY ($1::uuid[]) ORDER BY amount", [r.paymentIds])).rows;
  eq("a correction on March and a payment on February", pays.map((p) => [p.amount, p.memo]),
    [[-1500000, "audit: wrong month, 2026-03 to 2026-02"], [1500000, "audit: wrong month, 2026-03 to 2026-02"]]);
  ok("on one receipt date", pays[0].occurred_at.getTime() === pays[1].occurred_at.getTime() && pays[0].occurred_at.getTime() === new Date(at).getTime());
  const months = (await db.query(`SELECT e.month, a.code::text AS code, e.debit, e.credit FROM public.ledger_entries e
      JOIN public.ledger_accounts a ON a.id = e.account_id WHERE e.memo LIKE '%wrong month%' ORDER BY e.month, a.code::text`)).rows;
  eq("the ledger moves the cash from March to February", months.map((m) => [m.month, m.code, m.debit, m.credit]),
    [["2026-02", "AR", 0, 1500000], ["2026-02", "CASH", 1500000, 0], ["2026-03", "AR", 1500000, 0], ["2026-03", "CASH", 0, 1500000]]);
  eq("February and March each hold their own month", [await recorded(e1, "2026-02"), await recorded(e1, "2026-03")], [1500000, 1500000]);
}

console.log("=== no money moves ===");
{
  const before = await counts();
  const big = await decideFails(elmJan, "rounding_accepted", null);
  eq("420,000 is not rounding", big?.code, "22023");
  const r1 = await decide(elmMay, "rounding_accepted", null);
  ok("a 4,000 difference is accepted as rounding", r1.ok && r1.paymentIds.length === 0, JSON.stringify(r1));
  const withLegs = await decideFails(elmJan, "sheet_missed", "x", [{ student_id: e1, month: "2026-01", kind: "payment", amount: 1 }], "Cash", "2026-01-05");
  eq("sheet missed takes no money legs", withLegs?.code, "22023");
  const r2 = await decide(elmJan, "sheet_missed", "receipt book: 1,260,000 on 5 Jan; the sheet's figure is before the re-price");
  ok("sheet missed: decided with a note", r2.ok && r2.paymentIds.length === 0);
  const rs = await decide(spare, "refer_phase4", "not in the app");
  ok("a second pattern A item is referred too", rs.ok);
  const r3 = await decide(unmatched, "refer_phase4", "not in the app: needs a student and a bill");
  ok("pattern A: referred to phase 4", r3.ok);
  eq("none of them wrote a payment or a ledger line", await counts(), before);
  eq("nor touched a bill", [await recorded(e1, "2026-05"), await recorded(e1, "2026-01")], [1600000, 1260000]);
}

console.log("=== refer only pattern A ===");
{
  const { id: x } = await one(`INSERT INTO public.tuition_reconciliation_items (item_key, family_id, student_ids, month, sheet_amount, app_recorded, pattern)
    VALUES ('family:x:2026-05', $1, $2, '2026-05', 0, 1050000, 'B') RETURNING id`, [elm, [e1]]);
  const r = await decideFails(x, "refer_phase4", "x");
  eq("a pattern B item is not referred", r?.code, "22023");
  await as(ADMIN, "DELETE FROM public.tuition_reconciliation_items WHERE id = $1", [x]);
  const left = await one("SELECT count(*)::int AS n FROM public.tuition_reconciliation_items WHERE id = $1", [x]);
  eq("an open item can be deleted to reload it", left.n, 0);
  const dup = await refusal(ADMIN, `INSERT INTO public.tuition_reconciliation_items (item_key, family_id, student_ids, month, sheet_amount, app_recorded, pattern)
    VALUES ('family:${elm}:2026-05', '${elm}', ARRAY['${e1}']::uuid[], '2026-05', 0, 1, 'B')`);
  eq("one row per family-month and audit", dup?.code, "23505");
  const noKids = await refusal(ADMIN, `INSERT INTO public.tuition_reconciliation_items (item_key, month, sheet_amount, app_recorded, pattern)
    VALUES ('k', '2026-05', 0, 1, 'B')`);
  eq("only pattern A may name no child", noKids?.code, "23514");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
