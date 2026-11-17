// D5 G-11: supabase/migrations/20261117111000_ledger_append_only_and_audit.sql
// over the real audit trigger (20261009130000), in paste order.
//
// What this suite holds:
//   1. Preflight fails closed: with audit_row_change missing, with a table
//      missing, or with a function installed that updates / deletes the
//      ledger, the migration refuses and changes nothing.
//   2. The ledger is append-only for every role: INSERT works (a payment, a
//      reversal); UPDATE, DELETE and TRUNCATE are refused with HC130 - as a
//      signed-in admin, as the service role and as the SQL editor's owner.
//      Deleting a student or a ledger account that HAS ledger rows is refused
//      (the cascade meets the trigger); one with none deletes as before.
//   3. The six tables are audited: an insert, a real update and a delete each
//      write one audit row; an update that changes nothing writes none.
//   4. No writer anywhere in the repo updates or deletes ledger_entries
//      (TypeScript in src/ and supabase/functions/, SQL in migrations,
//      docs/sql and scripts/), so nothing live breaks.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8');
const G11 = mig('20261117111000_ledger_append_only_and_audit.sql');
const AUDIT = mig('20261009130000_audit_every_admin_action.sql');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), S1 = U(11), S2 = U(12), S3 = U(13);
const BASE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.students(id uuid PRIMARY KEY);
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
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  INSERT INTO public.students VALUES ('${S1}'), ('${S2}'), ('${S3}');
`;
const fresh = async ({ audit = true } = {}) => { const d = new PGlite(); await d.exec(BASE); if (audit) await d.exec(AUDIT); return d; };
const triggers = async (d) => (await d.query(`SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.ledger_entries'::regclass AND NOT tgisinternal ORDER BY 1`)).rows.map((r) => r.tgname);

// =================================================================== 1
console.log('\n1. the preflight fails closed');
{
  let d = await fresh({ audit: false });
  let e = await tryIt(() => d.exec(G11));
  ok('audit_row_change missing: refused, nothing installed', /audit_row_change\(\) is not installed/.test(e?.message ?? '') && (await triggers(d)).length === 0, e);
  await d.close();
  d = await fresh();
  await d.exec('DROP TABLE public.settlements');
  e = await tryIt(() => d.exec(G11));
  ok('a table missing (settlements): refused, nothing installed', /public\.settlements is missing/.test(e?.message ?? '') && (await triggers(d)).length === 0, e);
  await d.close();
  for (const body of ['UPDATE public.ledger_entries SET memo = memo', 'DELETE FROM ledger_entries WHERE false', 'TRUNCATE TABLE public.ledger_entries']) {
    d = await fresh();
    await d.exec(`CREATE FUNCTION public.rewrites_ledger() RETURNS void LANGUAGE sql AS $f$ ${body} $f$`);
    e = await tryIt(() => d.exec(G11));
    ok(`a function that does "${body.split(' ').slice(0, 3).join(' ')}...": refused, names it, nothing installed`,
       /rewrites_ledger\(\)/.test(e?.message ?? '') && (await triggers(d)).length === 0, e);
    await d.close();
  }
  d = await fresh();
  await d.exec(`CREATE FUNCTION public.reads_ledger() RETURNS bigint LANGUAGE sql AS $f$ SELECT count(*) FROM public.ledger_entries $f$;
                CREATE FUNCTION public.inserts_ledger() RETURNS void LANGUAGE sql AS $f$ INSERT INTO public.ledger_entries(tx_id, account_id, month) SELECT gen_random_uuid(), id, '2026-11' FROM public.ledger_accounts WHERE false $f$`);
  e = await tryIt(() => d.exec(G11));
  ok('functions that only read or insert the ledger do not stop it', e === null, e);
  e = await tryIt(() => d.exec(G11));
  ok('it installs twice (idempotent)', e === null, e);
  await d.close();
}

// =================================================================== 2
console.log('\n2. append-only, for every role');
const db = await fresh();
await db.exec(G11);
const as = async (role, uid, sql) => {
  await db.query(`SELECT set_config('test.uid', $1, false)`, [uid ?? '']);
  if (role) await db.exec(`SET ROLE ${role}`);
  try { return await tryIt(() => db.exec(sql)); } finally { await db.exec('RESET ROLE'); await db.query(`SELECT set_config('test.uid', '', false)`); }
};
{
  await db.exec(`INSERT INTO public.ledger_accounts(student_id, code) VALUES ('${S1}', 'AR'), ('${S1}', 'CASH'), ('${S2}', 'AR'), ('${S3}', 'AR')`);
  const acc = (s, c) => `(SELECT id FROM public.ledger_accounts WHERE student_id = '${s}' AND code = '${c}')`;
  let e = await as('service_role', null, `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
     ('${U(90)}', 'smart-family-p-s-1', ${acc(S1, 'CASH')}, 400000, 0, '2026-11'), ('${U(90)}', NULL, ${acc(S1, 'AR')}, 0, 400000, '2026-11')`);
  ok('a payment (two legs, service role) is inserted', e === null, e);
  e = await as('service_role', null, `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
     ('${U(91)}', 'payment-reversal-p-1', ${acc(S1, 'AR')}, 400000, 0, '2026-11'), ('${U(91)}', 'payment-reversal-p-2', ${acc(S1, 'CASH')}, 0, 400000, '2026-11')`);
  ok('a reversal, as delete-payment posts it (inserted legs), is inserted', e === null, e);
  for (const [who, role, uid] of [['a signed-in admin (authenticated)', 'authenticated', ADMIN], ['the service role', 'service_role', null], ['the SQL editor (owner)', null, null]]) {
    const u = await as(role, uid, `UPDATE public.ledger_entries SET debit = debit + 1 WHERE tx_key = 'smart-family-p-s-1'`);
    const k = await as(role, uid, `UPDATE public.ledger_entries SET memo = 'tidy', debit = debit, credit = credit`);
    const dl = await as(role, uid, `DELETE FROM public.ledger_entries WHERE tx_id = '${U(91)}'`);
    const tr = await as(role, uid, `TRUNCATE public.ledger_entries`);
    ok(`${who}: UPDATE (an amount, or a memo only) and DELETE refused with HC130; TRUNCATE refused (HC130, or 42501 where the role has no TRUNCATE grant)`,
       [u, k, dl].every((x) => x?.code === 'HC130') && (tr?.code === 'HC130' || (role === 'authenticated' && tr?.code === '42501')), { u, k, dl, tr });
  }
  const n = (await db.query(`SELECT count(*)::int n, sum(debit)::int d FROM public.ledger_entries`)).rows[0];
  ok('the four legs are all still there, unchanged', n.n === 4 && n.d === 800000, n);
  e = await tryIt(() => db.exec(`DELETE FROM public.students WHERE id = '${S1}'`));
  ok('deleting a student WITH ledger rows is refused (the cascade meets the trigger)', e?.code === 'HC130', e);
  e = await tryIt(() => db.exec(`DELETE FROM public.ledger_accounts WHERE student_id = '${S1}'`));
  ok('deleting a ledger account WITH ledger rows is refused', e?.code === 'HC130', e);
  e = await tryIt(() => db.exec(`DELETE FROM public.students WHERE id = '${S2}'`));
  ok('deleting a student whose accounts hold no ledger row works as before', e === null && (await db.query(`SELECT count(*)::int n FROM public.ledger_accounts WHERE student_id = '${S2}'`)).rows[0].n === 0, e);
  e = await tryIt(() => db.exec(`DELETE FROM public.ledger_accounts WHERE student_id = '${S3}'`));
  ok('deleting an empty ledger account works as before', e === null, e);
  const fn = (await db.query(`SELECT has_function_privilege('authenticated', 'public.ledger_entries_refuse_change()', 'EXECUTE') a,
                                     has_function_privilege('anon', 'public.ledger_entries_refuse_change()', 'EXECUTE') n`)).rows[0];
  ok('the trigger function is not callable by anon or authenticated', !fn.a && !fn.n, fn);

  // Fix round 2, M-3: created_at is the database's, whatever the writer sends.
  let k = 0;
  for (const [who, role, uid] of [['a signed-in admin (authenticated)', 'authenticated', ADMIN], ['the service role', 'service_role', null], ['the SQL editor (owner)', null, null]]) {
    k += 1;
    const t0 = (await db.query(`SELECT now() t`)).rows[0].t;
    const ins = await as(role, uid, `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month, occurred_at, created_at) VALUES
       ('${U(95 + k)}', 'backdated-${k}', ${acc(S1, 'CASH')}, 777000, 0, '2025-10', '2025-10-13 00:00+00', '2025-10-13 00:00+00'),
       ('${U(95 + k)}', NULL, ${acc(S1, 'AR')}, 0, 777000, '2025-10', '2025-10-13 00:00+00', '2025-10-13 00:00+00')`);
    const rows = (await db.query(`SELECT created_at, occurred_at FROM public.ledger_entries WHERE tx_id = $1`, [U(95 + k)])).rows;
    ok(`${who}: an INSERT with created_at backdated to Oct 2025 goes in with created_at = now(); occurred_at (when the money moved) is kept`,
       ins === null && rows.length === 2
         && rows.every((r) => new Date(r.created_at).getTime() >= new Date(t0).getTime() - 1000)
         && rows.every((r) => new Date(r.occurred_at).toISOString() === '2025-10-13T00:00:00.000Z'), { ins, rows, t0 });
  }
  const st = (await db.query(`SELECT has_function_privilege('authenticated', 'public.ledger_entries_stamp_created_at()', 'EXECUTE') a,
                                     has_function_privilege('anon', 'public.ledger_entries_stamp_created_at()', 'EXECUTE') n,
                                     (SELECT count(*)::int FROM pg_trigger WHERE tgrelid = 'public.ledger_entries'::regclass AND tgname = 'ledger_entries_stamp_created_at') t`)).rows[0];
  ok('the created_at trigger is installed once, and its function is not callable by anon or authenticated', st.t === 1 && !st.a && !st.n, st);
}

// =================================================================== 3
console.log('\n3. the six tables are audited');
{
  const audits = async (entity) => (await db.query(`SELECT count(*)::int n FROM public.audit_log WHERE entity = $1`, [entity])).rows[0].n;
  const plan = [
    ['ledger_accounts', `INSERT INTO public.ledger_accounts(student_id, code) VALUES ('${S3}', 'BANK')`, `UPDATE public.ledger_accounts SET code = 'CREDIT' WHERE student_id = '${S3}' AND code = 'BANK'`, `UPDATE public.ledger_accounts SET code = code WHERE student_id = '${S3}'`, `DELETE FROM public.ledger_accounts WHERE student_id = '${S3}'`],
    ['expenditures', `INSERT INTO public.expenditures(amount, category, date) VALUES (100, 'Rent', '2026-11-01')`, `UPDATE public.expenditures SET amount = 200`, `UPDATE public.expenditures SET amount = amount`, `DELETE FROM public.expenditures`],
    ['settlements', `INSERT INTO public.settlements(student_id, month, amount, settlement_type) VALUES ('${S3}', '2026-11', 1, 'discount')`, `UPDATE public.settlements SET amount = 2`, `UPDATE public.settlements SET amount = amount`, `DELETE FROM public.settlements`],
    ['sibling_discount_state', `INSERT INTO public.sibling_discount_state(family_id, month, status) VALUES ('${U(70)}', '2026-11', 'pending')`, `UPDATE public.sibling_discount_state SET status = 'assigned'`, `UPDATE public.sibling_discount_state SET status = status`, `DELETE FROM public.sibling_discount_state`],
    ['discount_definitions', `INSERT INTO public.discount_definitions(name, value) VALUES ('d', 5)`, `UPDATE public.discount_definitions SET value = 10`, `UPDATE public.discount_definitions SET value = value`, `DELETE FROM public.discount_definitions`],
    ['monthly_finance_snapshots', `INSERT INTO public.monthly_finance_snapshots(student_id, month, final_payable) VALUES ('${S3}', '2026-10', 5)`, `UPDATE public.monthly_finance_snapshots SET final_payable = 6`, `UPDATE public.monthly_finance_snapshots SET final_payable = final_payable`, `DELETE FROM public.monthly_finance_snapshots`],
  ];
  for (const [t, ins, upd, noop, del] of plan) {
    const n0 = await audits(t);
    await db.exec(ins); const n1 = await audits(t);
    await db.exec(upd); const n2 = await audits(t);
    await db.exec(noop); const n3 = await audits(t);
    await db.exec(del); const n4 = await audits(t);
    ok(`${t}: insert, update, delete each write one audit row; an update that changes nothing writes none`,
       n1 === n0 + 1 && n2 === n1 + 1 && n3 === n2 && n4 === n3 + 1, { n0, n1, n2, n3, n4 });
  }
}
await db.close();

// =================================================================== 4
console.log('\n4. nothing in the repo updates or deletes the ledger');
{
  const files = [];
  const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) { if (n !== 'node_modules') walk(p); } else files.push(p); } };
  walk(join(repo, 'src')); walk(join(repo, 'supabase', 'functions'));
  const ts = files.filter((f) => /\.(ts|tsx)$/.test(f)).flatMap((f) => {
    const t = readFileSync(f, 'utf8');
    return [...t.matchAll(/\.from\(\s*["'`]ledger_entries["'`]\s*\)\s*(?:\/\/[^\n]*\n\s*)*\.(\w+)\s*\(/g)].map((m) => `${f.slice(repo.length + 1)} ${m[1]}`);
  });
  const ops = [...new Set(ts.map((x) => x.split(' ').pop()))];
  ok(`TypeScript only inserts into or reads ledger_entries (${ts.length} uses: ${ops.join(', ')})`, ops.every((o) => ['insert', 'select'].includes(o)), ts);
  const sqlFiles = [
    ...readdirSync(join(repo, 'supabase', 'migrations')).map((n) => join(repo, 'supabase', 'migrations', n)),
    ...readdirSync(join(repo, 'docs', 'sql')).map((n) => join(repo, 'docs', 'sql', n)),
    ...readdirSync(join(repo, 'scripts')).filter((n) => n.endsWith('.sql')).map((n) => join(repo, 'scripts', n)),
  ].filter((f) => f.endsWith('.sql') && !f.endsWith('20261117111000_ledger_append_only_and_audit.sql'));
  const writers = sqlFiles.filter((f) => /(update\s+(only\s+)?(public\.)?ledger_entries\b|delete\s+from\s+(only\s+)?(public\.)?ledger_entries\b|truncate\s+(table\s+)?(public\.)?ledger_entries\b)/i
    .test(readFileSync(f, 'utf8').replace(/--[^\n]*/g, ''))).map((f) => f.slice(repo.length + 1));
  ok('no migration, docs/sql or owner script updates, deletes or truncates ledger_entries', writers.length === 0, writers);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
