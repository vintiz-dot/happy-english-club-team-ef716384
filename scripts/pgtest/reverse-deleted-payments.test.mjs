// supabase/migrations/20261123130000_reverse_oct2025_deleted_family_payments.sql
// on top of the append-only ledger (20261117111000), with the five live
// transactions of the three deleted payments reproduced.
//
// What this suite holds:
//   1. It posts one opposite leg for every leg (BANK and AR) of the five
//      transactions, keyed payment-reversal-<payment>-<entry id>, and every
//      account then nets to zero for those payments. Nothing is updated or
//      deleted (the append-only trigger would refuse it).
//   2. Other payments' legs are untouched.
//   3. Running it again posts nothing; if one of the payments exists again
//      it posts nothing; on a database without these rows it posts nothing.
//   4. The checks (paymentChecks.ts) list the orphans before and nothing after.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8');
const FIX = mig('20261123130000_reverse_oct2025_deleted_family_payments.sql');
const G11 = mig('20261117111000_ledger_append_only_and_audit.sql');
const AUDIT = mig('20261009130000_audit_every_admin_action.sql');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};

const P1 = '1daccf45-354c-4580-8c32-30dcc8ba95e6';
const P2 = '32b4b436-b735-498c-a0f9-5a8957ea9413';
const P3 = 'b052d89e-4d81-49e6-9676-b14fc207e542';
const KEEP = '6e9ea5b4-c457-42ee-8ad6-9e0ff2cadbd3';
const A = '97569fea-90ba-4db1-9baf-41c899c8391f';
const B = '9fbb123c-781b-498e-8c4c-032361095188';

const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.students(id uuid PRIMARY KEY);
  CREATE TABLE public.payments(id uuid PRIMARY KEY, student_id uuid, amount integer);
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, code text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
    debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0, month text NOT NULL, memo text,
    occurred_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.expenditures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric NOT NULL, category text NOT NULL, date date NOT NULL);
  CREATE TABLE public.settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    amount integer NOT NULL, settlement_type text NOT NULL);
  CREATE TABLE public.sibling_discount_state(family_id uuid NOT NULL, month text NOT NULL, status text, computed_at timestamptz DEFAULT now(),
    PRIMARY KEY(family_id, month));
  CREATE TABLE public.discount_definitions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, value numeric);
  CREATE TABLE public.monthly_finance_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL,
    month text NOT NULL, final_payable integer NOT NULL DEFAULT 0);
  INSERT INTO public.students VALUES ('${A}'), ('${B}');
  INSERT INTO public.ledger_accounts(student_id, code) VALUES ('${A}','AR'),('${A}','BANK'),('${A}','CASH'),('${B}','AR'),('${B}','BANK'),('${B}','CASH');
`;
// The five live transactions (BANK debit keyed, AR credit unkeyed), plus a
// payment that still exists, which must not be touched.
const tx = (pid, sid, amount, ts) => `
  WITH t AS (SELECT gen_random_uuid() AS id)
  INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month, memo)
  SELECT t.id, 'family-payment-${pid}-${sid}-${ts}', (SELECT id FROM ledger_accounts WHERE student_id='${sid}' AND code='BANK'), ${amount}, 0, '2025-10', 'Family payment allocation' FROM t
  UNION ALL
  SELECT t.id, NULL, (SELECT id FROM ledger_accounts WHERE student_id='${sid}' AND code='AR'), 0, ${amount}, '2025-10', 'Family payment allocation' FROM t;`;
const LIVE = [
  tx(P1, A, 1323000, 1761320568230), tx(P1, B, 1795000, 1761320575268), tx(P2, A, 94500, 1761317445467),
  tx(P3, B, 1795000, 1761363933553), tx(P3, A, 1320000, 1761363925919),
  `INSERT INTO public.payments VALUES ('${KEEP}', '${A}', 1680000);`,
  tx(KEEP, A, 1680000, 1786972225355).replaceAll("'2025-10'", "'2026-08'"),
].join('\n');

const fresh = async ({ seed = true } = {}) => {
  const d = new PGlite();
  await d.exec(BASE); await d.exec(AUDIT); await d.exec(G11);
  if (seed) await d.exec(LIVE);
  return d;
};
const count = async (d, where = 'true') => Number((await d.query(`SELECT count(*)::int n FROM ledger_entries WHERE ${where}`)).rows[0].n);
const reversals = (d) => count(d, `tx_key LIKE 'payment-reversal-%'`);

// The browser checks, bundled from the source the screens use.
const out = await build({ entryPoints: [join(repo, 'src/lib/finance/paymentChecks.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const { ledgerByPayment } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const cashLegs = async (d) => (await d.query(`SELECT e.tx_key, e.month, e.debit, e.credit FROM ledger_entries e JOIN ledger_accounts a ON a.id=e.account_id
  WHERE a.code IN ('CASH','BANK') AND e.tx_key IS NOT NULL`)).rows;
const openOrphans = async (d) => [...ledgerByPayment(await cashLegs(d), new Set([KEEP])).orphan.values()].filter((o) => o.net !== 0);

console.log('\n1. it reverses every leg of the five transactions');
{
  const d = await fresh();
  const before = await openOrphans(d);
  ok('before: the checks list three deleted payments, 6,327,500 in all', before.length === 3 && before.reduce((s, o) => s + o.net, 0) === 6327500, before);
  const legsBefore = await count(d);
  await d.exec(FIX);
  ok('ten reversing legs posted (5 BANK + 5 AR)', (await reversals(d)) === 10 && (await count(d)) === legsBefore + 10);
  const nets = (await d.query(`
    SELECT a.code, a.student_id, sum(e.debit - e.credit)::int net FROM ledger_entries e JOIN ledger_accounts a ON a.id=e.account_id
     WHERE e.month='2025-10' GROUP BY 1,2 ORDER BY 1,2`)).rows;
  ok('every October 2025 account nets to zero', nets.length === 4 && nets.every((r) => r.net === 0), nets);
  const keys = (await d.query(`SELECT tx_key FROM ledger_entries WHERE tx_key LIKE 'payment-reversal-%'`)).rows.map((r) => r.tx_key);
  ok('keyed as delete-payment keys a reversal', keys.every((k) => /^payment-reversal-(1daccf45|32b4b436|b052d89e)[0-9a-f-]{28}-[0-9a-f-]{36}$/.test(k)), keys);
  const kept = (await d.query(`SELECT sum(e.debit - e.credit)::int net FROM ledger_entries e JOIN ledger_accounts a ON a.id=e.account_id WHERE a.code='BANK' AND e.month='2026-08'`)).rows[0].net;
  ok('the payment that still exists keeps its legs', kept === 1680000 && (await count(d, `tx_key LIKE 'payment-reversal-${KEEP}%'`)) === 0);
  const after = await openOrphans(d);
  ok('after: the checks list nothing', after.length === 0, after);

  await d.exec(FIX);
  ok('a second run posts nothing', (await reversals(d)) === 10);
  await d.close();
}

console.log('\n2. it posts nothing when it should not');
{
  let d = await fresh();
  await d.exec(`INSERT INTO public.payments VALUES ('${P2}', '${A}', 94500)`);
  await d.exec(FIX);
  ok('one of the payments exists again: nothing posted', (await reversals(d)) === 0);
  await d.close();
  d = await fresh({ seed: false });
  await d.exec(FIX);
  ok('a database without these rows: nothing posted, no error', (await count(d)) === 0);
  await d.close();
}

console.log(`\nreverse-deleted-payments: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
