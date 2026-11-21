// Tuition audit phase 4: scripts/audit-leftover-dong.mjs, its SQL run against
// the REAL record_admin_payment (20261117121000) and invoice_paid_label
// (20261113090000) in an in-process Postgres.
//
// What this suite holds:
//   1. The planner takes only zero-charge bills holding 1-2 dong, and says
//      why it skips anything else.
//   2. The dry-run file changes nothing.
//   3. The apply file corrects every leftover through record_admin_payment:
//      a payments row of minus the leftover, two ledger legs, the bill at 0,
//      an audit row, memo "audit: edit leftover", as the admin given.
//   4. Pasting apply twice is refused (RP409) and doubles nothing; a bill
//      that changed since it was read is refused (RP412) and the whole paste
//      rolls back.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8');
const G1 = mig('20261117121000_record_admin_payment.sql');
const LABEL = mig('20261113090000_invoice_paid_label.sql')
  .match(/CREATE OR REPLACE FUNCTION public\.invoice_paid_label\([\s\S]*?\$function\$;/)[0];
const { planLeftovers, buildSql, correctionId, SELECT_SQL, MEMO } =
  await import(pathToFileURL(join(repo, 'scripts', 'audit-leftover-dong.mjs')).href);

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1);
const A = U(11), B = U(12), C = U(13), D = U(14);

const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
  -- as Supabase's: the sub of the request's JWT claims
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''),
                    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'family', 'student');
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'partial', 'paid', 'credit');
  CREATE TYPE public.account_code AS ENUM ('AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT', 'DISCOUNT');
  CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(u uuid, r public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles x WHERE x.user_id = u AND x.role = r) $f$;
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text);
  CREATE TABLE public.payments(id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES public.students(id), amount integer NOT NULL,
    method text, occurred_at timestamptz, memo text, created_by uuid);
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, code public.account_code NOT NULL,
    UNIQUE (student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id), debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0,
    occurred_at timestamptz, memo text, month text, created_by uuid);
  CREATE TABLE public.invoices(id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES public.students(id), month text NOT NULL,
    base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0,
    carry_in_debt integer DEFAULT 0, carry_in_credit integer DEFAULT 0, tuition_frozen boolean NOT NULL DEFAULT false,
    status public.invoice_status NOT NULL DEFAULT 'issued', updated_at timestamptz, updated_by uuid, UNIQUE (student_id, month));
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  ${LABEL}
  INSERT INTO public.students VALUES ('${A}', 'a'), ('${B}', 'b'), ('${C}', 'c'), ('${D}', 'd');
  -- A and B: one family on a 100% discount, leftovers of 1 dong; C: a normal bill
  -- 3 dong short; D: a zero bill holding 5 dong (not a leftover this tool takes).
  INSERT INTO public.invoices(id, student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, carry_in_credit, status) VALUES
    ('${U(21)}', '${A}', '2025-10', 1470000, 1470000, 0, 1, 1, 0, 'paid'),
    ('${U(22)}', '${A}', '2026-02', 1680000, 1680000, 0, 1, 600002, 1, 'paid'),
    ('${U(23)}', '${B}', '2025-10', 1040000, 1092000, 0, 1, 0, 0, 'draft'),
    ('${U(24)}', '${B}', '2025-11', 1040000, 1092000, 0, 2, 0, 1, 'draft'),
    ('${U(25)}', '${C}', '2026-05', 1260000, 0, 1260000, 1259997, 0, 0, 'partial'),
    ('${U(26)}', '${D}', '2026-01', 500000, 500000, 0, 5, 5, 0, 'paid');
`;
const fresh = async () => { const d = new PGlite(); await d.exec(BASE); await d.exec(G1); return d; };
const all = (d, sql) => d.query(sql).then((x) => x.rows);
const state = async (d) => JSON.stringify({
  inv: await all(d, `SELECT id, recorded_payment, paid_amount, status::text FROM public.invoices ORDER BY id`),
  pay: await all(d, `SELECT count(*)::int n FROM public.payments`),
  led: await all(d, `SELECT count(*)::int n FROM public.ledger_entries`),
  aud: await all(d, `SELECT count(*)::int n FROM public.audit_log`),
});

// =================================================================== 1
console.log('\n1. the planner');
{
  const d = await fresh();
  const rows = await all(d, SELECT_SQL);
  const plan = planLeftovers(rows);
  ok('the query finds the four zero bills holding 1-2 dong, and only those',
     plan.take.map((x) => `${x.student_id.slice(-2)}:${x.month}:${x.amount}`).join(' ') === '11:2025-10:1 11:2026-02:1 12:2025-10:1 12:2025-11:2'
     && plan.total === 5, plan);
  const more = planLeftovers([
    { invoice_id: U(25), student_id: C, month: '2026-05', total_amount: 1260000, recorded_payment: 1259997 },
    { invoice_id: U(26), student_id: D, month: '2026-01', total_amount: 0, recorded_payment: 5 },
    { invoice_id: 'x', student_id: D, month: '2026-01', total_amount: 0, recorded_payment: 1 },
  ]);
  ok('anything else is skipped with a reason', more.take.length === 0
     && more.skipped.map((s) => s.why).join('|') === 'the bill charges something|not a 1-2 dong leftover|bad id', more.skipped);
  ok('a correction id is a fixed uuid per bill', correctionId(U(21)) === correctionId(U(21)) && correctionId(U(21)) !== correctionId(U(22))
     && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(correctionId(U(21))));
  ok('the SQL needs an admin id', /--admin/.test((() => { try { buildSql(plan, { admin: 'me', commit: true }); return ''; } catch (e) { return e.message; } })()));
  await d.close();
}

// =================================================================== 2-4
console.log('\n2. dry run, 3. apply, 4. twice / stale');
{
  const d = await fresh();
  const plan = planLeftovers(await all(d, SELECT_SQL));
  const dry = buildSql(plan, { admin: ADMIN, commit: false });
  const apply = buildSql(plan, { admin: ADMIN, commit: true });
  const before = await state(d);
  await d.exec(dry);
  ok('the dry-run file changes nothing', (await state(d)) === before);
  ok('the dry-run file ends in ROLLBACK, the apply file in COMMIT', /ROLLBACK;\s*$/.test(dry) && /COMMIT;\s*$/.test(apply));

  await d.exec(apply);
  const inv = await all(d, `SELECT id, recorded_payment, paid_amount FROM public.invoices WHERE id IN ('${U(21)}', '${U(22)}', '${U(23)}', '${U(24)}') ORDER BY id`);
  ok('apply: all four bills now record 0', inv.every((b) => b.recorded_payment === 0), inv);
  const pays = await all(d, `SELECT id, student_id, amount, method, memo, created_by FROM public.payments ORDER BY id`);
  ok('apply: one payments row per bill, minus the leftover, memo and admin as given',
     pays.length === 4 && pays.reduce((s, p) => s + p.amount, 0) === -5
     && pays.every((p) => p.memo === MEMO && p.created_by === ADMIN && p.method === 'adjustment')
     && pays.every((p) => plan.take.some((x) => x.payment_id === p.id)), pays);
  const legs = await all(d, `SELECT sum(debit)::int dr, sum(credit)::int cr, count(*)::int n FROM public.ledger_entries`);
  ok('apply: two balanced ledger legs per correction', legs[0].n === 8 && legs[0].dr === 5 && legs[0].cr === 5, legs);
  const aud = await all(d, `SELECT action, actor_user_id FROM public.audit_log`);
  ok('apply: one payment_correction audit row each, by the admin', aud.length === 4 && aud.every((a) => a.action === 'payment_correction' && a.actor_user_id === ADMIN), aud);
  ok('apply: the other bills are untouched',
     (await all(d, `SELECT recorded_payment r FROM public.invoices WHERE id IN ('${U(25)}', '${U(26)}') ORDER BY id`)).map((x) => x.r).join() === '1259997,5');

  const after = await state(d);
  const e = await tryIt(() => d.exec(apply));
  await d.exec('ROLLBACK').catch(() => {});
  ok('pasting apply again: refused (RP409), nothing doubled', e?.code === 'RP409' && (await state(d)) === after, e);
  await d.close();
}
{
  const d = await fresh();
  const plan = planLeftovers(await all(d, SELECT_SQL));
  const apply = buildSql(plan, { admin: ADMIN, commit: true });
  await d.exec(`UPDATE public.invoices SET recorded_payment = 3 WHERE id = '${U(24)}'`);         // a payment landed after the file was read
  const before = await state(d);
  const e = await tryIt(() => d.exec(apply));
  await d.exec('ROLLBACK').catch(() => {});
  ok('a bill that changed since it was read: refused (RP412), and none of the corrections stand', e?.code === 'RP412' && (await state(d)) === before, e);
  await d.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
