// Tuition audit phase 1: supabase/migrations/20261121090000_recorded_payment_guard.sql
// over the real record_admin_payment (20261117121000), in paste order.
//
// What this suite holds:
//   1. The preflight fails closed. With record_admin_payment missing, or with
//      another function writing recorded_payment, the migration refuses, names
//      it, and installs nothing. It installs twice.
//   2. The rule. A signed-in admin (authenticated) cannot change a bill's paid
//      figure by UPDATE or by inserting a bill that already holds one. They CAN
//      change anything else on the bill, write the same figure again, and
//      insert a bill with nothing paid. service_role, the owner and a SECURITY
//      DEFINER function still can.
//   3. record_admin_payment still records - payments row, both legs, the bill -
//      and a correction still takes money off. The flag does not outlive its one
//      update: a direct write later in the same transaction is refused.
//   4. Its body is 20261117121000's plus only the two flag lines.
//   5. Nothing in src/ writes recorded_payment any more (the browser goes
//      through record-payment), so nothing on the screens starts failing.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8');
const G1 = mig('20261117121000_record_admin_payment.sql');
const GUARD = mig('20261121090000_recorded_payment_guard.sql');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), S1 = U(11), S2 = U(12);
const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student', 'family');
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'partial', 'paid', 'credit');
  CREATE TYPE public.account_code AS ENUM ('AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
    AS $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  -- The label rule's shape only; its own suite (invoice-status) holds what it says.
  CREATE FUNCTION public.invoice_paid_label(rec bigint, payable bigint, base bigint, total bigint) RETURNS public.invoice_status
    LANGUAGE sql IMMUTABLE AS $f$ SELECT CASE WHEN rec >= payable AND (total > 0 OR rec > 0) THEN 'paid'::public.invoice_status
                                             WHEN rec > 0 THEN 'partial'::public.invoice_status ELSE 'issued'::public.invoice_status END $f$;
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text NOT NULL);
  CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    amount integer NOT NULL, method text NOT NULL, occurred_at timestamptz NOT NULL, memo text, created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), code public.account_code NOT NULL, UNIQUE(student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id), debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0,
    month text NOT NULL, memo text, occurred_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    month text NOT NULL, base_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0,
    carry_in_debt integer NOT NULL DEFAULT 0, carry_in_credit integer NOT NULL DEFAULT 0,
    status public.invoice_status NOT NULL DEFAULT 'issued', updated_at timestamptz, updated_by uuid,
    UNIQUE(student_id, month));
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT SELECT, UPDATE ON public.invoices TO anon; -- not so on live; here to reach the rule itself
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  INSERT INTO public.students VALUES ('${S1}', 'Test Child One'), ('${S2}', 'Test Child Two');
  INSERT INTO public.invoices(student_id, month, base_amount, total_amount) VALUES
    ('${S1}', '2026-11', 1596000, 1596000), ('${S2}', '2026-11', 725400, 725400);
`;
const fresh = async () => { const d = new PGlite(); await d.exec(BASE); return d; };
const hasTrigger = async (d) => (await d.query(`SELECT 1 FROM pg_trigger WHERE tgname = 'a_invoice_recorded_payment_guard'`)).rows.length === 1;

// =================================================================== 1
console.log('\n1. the preflight fails closed');
{
  let d = await fresh();
  let e = await tryIt(() => d.exec(GUARD));
  ok('record_admin_payment missing: refused, nothing installed', /record_admin_payment \(20261117121000\) is not installed/.test(e?.message ?? '') && !(await hasTrigger(d)), e);
  await d.close();

  d = await fresh();
  await d.exec(G1);
  await d.exec(`CREATE FUNCTION public.marks_paid(p uuid) RETURNS void LANGUAGE sql AS $f$ UPDATE public.invoices SET recorded_payment = total_amount WHERE id = p $f$`);
  e = await tryIt(() => d.exec(GUARD));
  ok('another function writing recorded_payment: refused, named, nothing installed', /marks_paid\(p uuid\)/.test(e?.message ?? '') && !(await hasTrigger(d)), e);
  await d.close();

  d = await fresh();
  await d.exec(G1);
  await d.exec(`CREATE FUNCTION public.reads_paid() RETURNS bigint LANGUAGE sql AS $f$ SELECT sum(recorded_payment) FROM public.invoices $f$`);
  e = await tryIt(() => d.exec(GUARD));
  ok('a function that only reads it does not stop the install', e === null && (await hasTrigger(d)), e);
  e = await tryIt(() => d.exec(GUARD));
  ok('it installs twice (idempotent), one trigger', e === null && (await d.query(`SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'a_invoice_recorded_payment_guard'`)).rows[0].n === 1, e);
  await d.close();
}

// =================================================================== 2
console.log('\n2. the rule');
const db = await fresh();
await db.exec(G1);
await db.exec(GUARD);
const as = async (role, uid, sql) => {
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uid ?? '']);
  if (role) await db.exec(`SET ROLE ${role}`);
  try { return await tryIt(() => db.exec(sql)); } finally { await db.exec('RESET ROLE'); await db.query(`SELECT set_config('test.uid', '', false)`); }
};
const bill = async (s) => (await db.query(`SELECT recorded_payment, paid_amount, status::text AS status FROM public.invoices WHERE student_id = $1 AND month = '2026-11'`, [s])).rows[0];
{
  let e = await as('authenticated', ADMIN, `UPDATE public.invoices SET recorded_payment = 1596000 WHERE student_id = '${S1}'`);
  ok('an admin typing a paid figure onto a bill: refused with RP451', e?.code === 'RP451' && (await bill(S1)).recorded_payment === 0, e);
  ok('  and the refusal says how to do it instead', /only by recording a payment/.test(e?.message ?? ''), e);
  e = await as('authenticated', ADMIN, `UPDATE public.invoices SET status = 'paid', recorded_payment = 1596000 WHERE student_id = '${S1}'`);
  ok('  even alongside other columns', e?.code === 'RP451' && (await bill(S1)).status === 'issued', e);
  e = await as('anon', null, `UPDATE public.invoices SET recorded_payment = 1 WHERE student_id = '${S1}'`);
  ok('anon: refused', e?.code === 'RP451', e);
  e = await as('authenticated', ADMIN, `UPDATE public.invoices SET status = 'partial' WHERE student_id = '${S1}'`);
  ok('a label change on its own goes through', e === null && (await bill(S1)).status === 'partial', e);
  e = await as('authenticated', ADMIN, `UPDATE public.invoices SET recorded_payment = 0, total_amount = 1596000 WHERE student_id = '${S1}'`);
  ok('writing the same figure again (an upsert of the whole row) goes through', e === null, e);
  e = await as('authenticated', ADMIN, `INSERT INTO public.invoices(student_id, month, total_amount) VALUES ('${S1}', '2026-12', 1596000)`);
  ok('a new bill with nothing paid goes through (calculate-tuition)', e === null, e);
  e = await as('authenticated', ADMIN, `INSERT INTO public.invoices(student_id, month, total_amount, recorded_payment) VALUES ('${S1}', '2027-01', 1596000, 1596000)`);
  ok('a new bill that arrives already paid: refused', e?.code === 'RP451', e);
  e = await as('service_role', null, `UPDATE public.invoices SET recorded_payment = 100000 WHERE student_id = '${S2}'`);
  ok('service_role (the payment edge functions) still writes it', e === null && (await bill(S2)).recorded_payment === 100000, e);
  e = await as(null, null, `UPDATE public.invoices SET recorded_payment = 0 WHERE student_id = '${S2}'`);
  ok('the owner (SQL editor) still writes it', e === null && (await bill(S2)).recorded_payment === 0, e);
  await db.exec(`CREATE FUNCTION public.definer_writer(p uuid, v integer) RETURNS void LANGUAGE sql SECURITY DEFINER
                   AS $f$ UPDATE public.invoices SET recorded_payment = v WHERE student_id = p AND month = '2026-11' $f$;
                 GRANT EXECUTE ON FUNCTION public.definer_writer(uuid, integer) TO authenticated`);
  e = await as('authenticated', ADMIN, `SELECT public.definer_writer('${S2}', 5)`);
  ok('a SECURITY DEFINER function (ai_action_undo) still writes it', e === null && (await bill(S2)).recorded_payment === 5, e);
  await db.exec(`UPDATE public.invoices SET recorded_payment = 0 WHERE student_id = '${S2}'`);
  e = await as('authenticated', ADMIN, `SELECT set_config('hec.payment_writer', 'me', false)`);
  ok('(a signed-in role can set a session flag in SQL - PostgREST gives it no way to: no public function wraps set_config)', e === null, e);
  await db.query(`SELECT set_config('hec.payment_writer', '', false)`);
}

// =================================================================== 3
console.log('\n3. record_admin_payment still records');
{
  const rap = (key, s, kind, amount, extra = '') => `SELECT public.record_admin_payment('${key}', '${s}', '2026-11', '${kind}', ${amount}, 'Cash', '2026-11-21T10:00:00+07', ${extra || 'NULL'})`;
  let e = await as('authenticated', ADMIN, rap(U(901), S1, 'payment', 1600000));
  const b = await bill(S1);
  const pays = (await db.query(`SELECT amount FROM public.payments WHERE id = $1`, [U(901)])).rows;
  const legs = (await db.query(`SELECT debit, credit FROM public.ledger_entries WHERE tx_key LIKE 'record-payment-' || $1 || '-%' OR tx_id IN (SELECT tx_id FROM public.ledger_entries WHERE tx_key LIKE 'record-payment-' || $1 || '-%')`, [U(901)])).rows;
  ok('a payment: the bill, the payments row and both legs', e === null && b.recorded_payment === 1600000 && pays.length === 1 && pays[0].amount === 1600000 && legs.length === 2, { e, b, pays, legs });
  e = await as('authenticated', ADMIN, rap(U(902), S1, 'correction', 600000, `'audit: not received'`));
  ok('a correction takes money off the same way', e === null && (await bill(S1)).recorded_payment === 1000000, e);
  e = await as('authenticated', ADMIN, `${rap(U(903), S2, 'payment', 725000)}; UPDATE public.invoices SET recorded_payment = 9 WHERE student_id = '${S2}'`);
  ok('the flag is cleared after its one update: a direct write in the same transaction is refused, and the payment rolls back with it',
     e?.code === 'RP451' && (await bill(S2)).recorded_payment === 0 && (await db.query(`SELECT 1 FROM public.payments WHERE id = $1`, [U(903)])).rows.length === 0, e);
  e = await as('authenticated', ADMIN, rap(U(904), S2, 'payment', 725000));
  ok('  recorded on its own, it goes through', e === null && (await bill(S2)).recorded_payment === 725000, e);
  e = await as('authenticated', U(2), rap(U(905), S2, 'payment', 1000));
  ok('a non-admin calling it is still refused by its own check (RP403)', e?.code === 'RP403', e);
}

// =================================================================== 4
console.log('\n4. record_admin_payment is 20261117121000 plus the flag');
{
  const n = (s) => s.replace(/\r/g, '');
  const body = (s) => { const at = s.indexOf('FUNCTION public.record_admin_payment('); return s.slice(s.indexOf('AS $function$', at), s.indexOf('$function$;', at)); };
  const before = body(n(G1));
  const after = body(n(GUARD));
  const extra = after.split('\n').filter((l) => !before.split('\n').includes(l));
  ok('the only lines added set and clear hec.payment_writer', extra.length === 3 && extra.every((l) => /hec\.payment_writer|Tuition audit phase 1/.test(l)), extra);
  ok('  and nothing was taken away', after.split('\n').filter((l) => !extra.includes(l)).join('\n') === before);
  const live = (await db.query(`SELECT prosrc FROM pg_proc WHERE proname = 'record_admin_payment'`)).rows[0].prosrc;
  ok('the installed function is the replaced one', /hec\.payment_writer/.test(live));
}

// =================================================================== 5
console.log('\n5. nothing in the browser writes recorded_payment');
{
  const files = [];
  const walk = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(x) && !x.endsWith('.d.ts')) files.push(p); } };
  walk(join(repo, 'src'));
  const rel = (p) => relative(repo, p).replace(/\\/g, '/');
  const writers = [];
  for (const f of files) {
    const r = rel(f);
    if (r === 'src/lib/recordedPaymentWrite.ts' || r === 'src/integrations/supabase/types.ts') continue;
    const s = readFileSync(f, 'utf8');
    // a write payload that names the column: .update({ ... recorded_payment: ... }) / .insert / .upsert
    for (const m of s.matchAll(/\.(update|insert|upsert)\(\s*\{([^}]*)\}/g)) if (/recorded_payment\s*:/.test(m[2])) writers.push(`${r}: .${m[1]}`);
    if (/\b(setRecordedPayment|addToRecordedPayment)\s*\(/.test(s)) writers.push(`${r}: calls the compare-and-set writer`);
  }
  ok('no screen writes the column or calls the browser copy of the writer (every payment goes through record-payment)', writers.length === 0, writers);
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
