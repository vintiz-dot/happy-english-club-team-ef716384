// Tuition audit phase 1b: supabase/migrations/20261121130000_record_family_payment.sql,
// after the real record_admin_payment (20261117121000) and the phase 1 guard
// (20261121090000), in paste order.
//
// What this suite holds:
//   1. A family payment is one transaction: the payments row, each child's
//      allocation, ledger pair (keyed as delete-payment and payment_bill_amounts
//      read it) and bill, and the caller's audit rows - all written, labels by
//      the one rule, an admin's 'credit' kept.
//   2. All or nothing: a child with no bill, a split that does not add up, a
//      repeated payment id, a child named twice, a non-admin actor - each
//      refused with NOTHING written, the first child's bill included.
//   3. A missing bill is made only from figures the caller sends.
//   4. Only service_role may run it (a signed-in admin's browser cannot).
//   5. The two edge functions call it and no longer write payments, ledger or
//      bills themselves.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const mig = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8');
const G1 = mig('20261117121000_record_admin_payment.sql');
const GUARD = mig('20261121090000_recorded_payment_guard.sql');
const FAM = mig('20261121130000_record_family_payment.sql');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), TEACHER = U(2), FAMILY = U(5), S1 = U(11), S2 = U(12), S3 = U(13);
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
  CREATE FUNCTION public.invoice_paid_label(rec bigint, payable bigint, base bigint, total bigint) RETURNS public.invoice_status
    LANGUAGE sql IMMUTABLE AS $f$ SELECT CASE WHEN rec >= payable AND (total > 0 OR base > 0 OR rec > 0) THEN 'paid'::public.invoice_status
                                             WHEN rec > 0 THEN 'partial'::public.invoice_status ELSE 'issued'::public.invoice_status END $f$;
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text NOT NULL, family_id uuid);
  CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    amount integer NOT NULL, method text NOT NULL, occurred_at timestamptz NOT NULL, memo text, created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(), family_id uuid, parent_payment_id uuid,
    source text NOT NULL DEFAULT 'receipt', month text);
  CREATE TABLE public.payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_payment_id uuid NOT NULL REFERENCES public.payments(id),
    student_id uuid NOT NULL, allocated_amount integer NOT NULL, allocation_order integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), code public.account_code NOT NULL, UNIQUE(student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id), debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0,
    month text NOT NULL, memo text, occurred_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    month text NOT NULL, base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0,
    total_amount integer NOT NULL DEFAULT 0, recorded_payment integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0,
    carry_in_debt integer NOT NULL DEFAULT 0, carry_in_credit integer NOT NULL DEFAULT 0,
    status public.invoice_status NOT NULL DEFAULT 'issued', updated_at timestamptz, updated_by uuid,
    UNIQUE(student_id, month));
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin'), ('${TEACHER}', 'teacher');
  INSERT INTO public.students VALUES ('${S1}', 'Test Child One', '${FAMILY}'), ('${S2}', 'Test Child Two', '${FAMILY}'), ('${S3}', 'Test Child Three', '${FAMILY}');
`;
const db = new PGlite();
await db.exec(BASE);
await db.exec(G1);
await db.exec(GUARD);
let e = await tryIt(() => db.exec(FAM));
ok('the migration installs after record_admin_payment and the phase 1 guard', e === null, e);
e = await tryIt(() => db.exec(FAM));
ok('  and installs twice (idempotent)', e === null, e);

const reset = async () => {
  await db.exec(`SET session_replication_role = replica;
    DELETE FROM public.audit_log; DELETE FROM public.ledger_entries; DELETE FROM public.ledger_accounts;
    DELETE FROM public.payment_allocations; DELETE FROM public.payments; DELETE FROM public.invoices;
    SET session_replication_role = DEFAULT;
    INSERT INTO public.invoices(student_id, month, base_amount, total_amount) VALUES
      ('${S1}', '2026-11', 1680000, 1680000), ('${S2}', '2026-11', 1680000, 1596000);`);
};
const as = async (role, sql, params) => {
  if (role) await db.exec(`SET ROLE ${role}`);
  try { return await tryIt(() => (params ? db.query(sql, params) : db.exec(sql))); } finally { await db.exec('RESET ROLE'); }
};
const call = (o) => ({
  sql: `SELECT public.record_family_payment($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb) AS r`,
  params: [o.id ?? U(900), o.actor ?? ADMIN, FAMILY, o.primary ?? S1, o.amount, o.method ?? 'Bank Transfer',
    '2026-11-20T10:00:00+07', o.memo ?? 'Family payment for 2 students', o.month ?? '2026-11', o.prefix ?? 'family-payment',
    JSON.stringify(o.allocations), JSON.stringify(o.audit ?? [])],
});
const run = async (role, o) => { const c = call(o); return as(role, c.sql, c.params); };
const bill = async (s, m = '2026-11') => (await db.query(`SELECT recorded_payment, paid_amount, status::text AS status FROM public.invoices WHERE student_id = $1 AND month = $2`, [s, m])).rows[0] ?? null;
const count = async (t) => (await db.query(`SELECT count(*)::int AS n FROM public.${t}`)).rows[0].n;
const nothingWritten = async () => (await count('payments')) === 0 && (await count('payment_allocations')) === 0
  && (await count('ledger_entries')) === 0 && (await bill(S1)).recorded_payment === 0 && (await bill(S2)).recorded_payment === 0;

console.log('\n1. one transaction, everything written');
{
  await reset();
  const allocations = [
    { student_id: S1, amount: 1680000, order: 1, leg_memo: 'Family payment allocation (1/2)' },
    { student_id: S2, amount: 1600000, order: 2, leg_memo: 'Family payment allocation (2/2), including 4000 beyond what the bills owe' },
  ];
  e = await run('service_role', { amount: 3280000, allocations, audit: [{ action: 'family_payment_completed', entity: 'family_payment', entity_id: U(900), diff: { total: 3280000 } }] });
  const p = (await db.query(`SELECT * FROM public.payments`)).rows;
  const al = (await db.query(`SELECT student_id, allocated_amount, allocation_order FROM public.payment_allocations ORDER BY allocation_order`)).rows;
  const legs = (await db.query(`SELECT e.tx_key, e.debit, e.credit, e.month, a.code::text AS code, a.student_id FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id ORDER BY a.student_id, e.debit DESC`)).rows;
  ok('it runs as service_role', e === null, e);
  ok('one payments row: the whole amount, on the first child, the family set, a receipt with no month',
     p.length === 1 && p[0].amount === 3280000 && p[0].student_id === S1 && p[0].family_id === FAMILY && p[0].source === 'receipt' && p[0].month === null && p[0].created_by === ADMIN, p);
  ok('one allocation per child, in order', al.length === 2 && al[0].student_id === S1 && al[0].allocated_amount === 1680000 && al[1].allocated_amount === 1600000, al);
  ok('one ledger pair per child: DR BANK keyed family-payment-<payment>-<child>, CR AR unkeyed, on the month',
     legs.length === 4 && legs.filter((l) => l.code === 'BANK' && l.debit > 0 && l.tx_key === `family-payment-${U(900)}-${l.student_id}`).length === 2
       && legs.filter((l) => l.code === 'AR' && l.credit > 0 && l.tx_key === null).length === 2 && legs.every((l) => l.month === '2026-11'), legs);
  const b1 = await bill(S1), b2 = await bill(S2);
  ok('each bill holds its share; labels by the rule (paid / paid with 4,000 over)',
     b1.recorded_payment === 1680000 && b1.status === 'paid' && b2.recorded_payment === 1600000 && b2.status === 'paid' && b2.paid_amount === 1600000, { b1, b2 });
  ok('the caller\'s audit row is written with the actor', (await db.query(`SELECT actor_user_id, action FROM public.audit_log WHERE action = 'family_payment_completed'`)).rows[0]?.actor_user_id === ADMIN);
  ok('the flag is cleared after the bills: a direct write by a signed-in admin later is still refused',
     (await as('authenticated', `SELECT set_config('test.uid', '${ADMIN}', false); UPDATE public.invoices SET recorded_payment = 1 WHERE student_id = '${S1}'`))?.code === 'RP451');

  await reset();
  await db.exec(`UPDATE public.invoices SET status = 'credit' WHERE student_id = '${S2}'`);
  e = await run('service_role', { id: U(901), amount: 1000000, allocations: [{ student_id: S1, amount: 500000 }, { student_id: S2, amount: 500000 }] });
  ok('a part payment reads partial; an admin\'s credit label is kept', e === null && (await bill(S1)).status === 'partial' && (await bill(S2)).status === 'credit', { e, b1: await bill(S1), b2: await bill(S2) });
  e = await run('service_role', { id: U(902), amount: 100000, method: 'Cash', prefix: 'smart-family', allocations: [{ student_id: S1, amount: 100000 }] });
  const cashLeg = (await db.query(`SELECT a.code::text AS code, e.tx_key FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id WHERE e.tx_key LIKE 'smart-family-%'`)).rows[0];
  ok('cash goes to CASH, and the smart prefix keys the leg smart-family-<payment>-<child>',
     e === null && cashLeg?.code === 'CASH' && cashLeg?.tx_key === `smart-family-${U(902)}-${S1}` && (await bill(S1)).recorded_payment === 600000, { e, cashLeg });
}

console.log('\n2. all or nothing');
{
  await reset();
  e = await run('service_role', { amount: 3000000, allocations: [{ student_id: S1, amount: 1500000 }, { student_id: S3, amount: 1500000 }] });
  ok('a child with no bill and no figures: FP424, nothing written - not even the first child\'s bill', e?.code === 'FP424' && await nothingWritten(), e);
  e = await run('service_role', { amount: 3000000, allocations: [{ student_id: S1, amount: 1500000 }, { student_id: S2, amount: 1400000 }] });
  ok('shares that do not add up to the payment: FP422, nothing written', e?.code === 'FP422' && await nothingWritten(), e);
  e = await run('service_role', { amount: 2000000, allocations: [{ student_id: S1, amount: 1000000 }, { student_id: S1, amount: 1000000 }] });
  ok('a child named twice: refused, nothing written', e?.code === '22023' && await nothingWritten(), e);
  e = await run('service_role', { amount: 1000000, allocations: [{ student_id: S1, amount: 1000000 }, { student_id: S2, amount: 0 }] });
  ok('a share of 0: refused, nothing written', e?.code === '22023' && await nothingWritten(), e);
  e = await run('service_role', { actor: TEACHER, amount: 1000000, allocations: [{ student_id: S1, amount: 1000000 }] });
  ok('an actor who is not an admin: FP403, nothing written', e?.code === 'FP403' && await nothingWritten(), e);
  e = await run('service_role', { amount: 1000000, prefix: 'payment', allocations: [{ student_id: S1, amount: 1000000 }] });
  ok('an unknown key prefix: refused, nothing written', e?.code === '22023' && await nothingWritten(), e);
  e = await run('service_role', { id: U(910), amount: 1000000, allocations: [{ student_id: S1, amount: 1000000 }] });
  const once = await bill(S1);
  e = await run('service_role', { id: U(910), amount: 1000000, allocations: [{ student_id: S1, amount: 1000000 }] });
  ok('the same payment id twice: FP409 the second time, the bill holds it once',
     e?.code === 'FP409' && once.recorded_payment === 1000000 && (await bill(S1)).recorded_payment === 1000000 && (await count('payments')) === 1, e);
  // A failure in the middle of the writes (an allocation insert that breaks) undoes the earlier child too.
  await reset();
  await db.exec(`ALTER TABLE public.payment_allocations ADD CONSTRAINT test_no_s2 CHECK (student_id <> '${S2}')`);
  e = await run('service_role', { amount: 2000000, allocations: [{ student_id: S1, amount: 1000000 }, { student_id: S2, amount: 1000000 }] });
  ok('a write that fails for the second child undoes the first child\'s allocation, ledger and bill', e !== null && await nothingWritten(), e);
  await db.exec(`ALTER TABLE public.payment_allocations DROP CONSTRAINT test_no_s2`);
}

console.log('\n3. a missing bill is made only from the caller\'s figures');
{
  await reset();
  e = await run('service_role', { prefix: 'smart-family', amount: 2000000,
    allocations: [{ student_id: S1, amount: 1000000 }, { student_id: S3, amount: 1000000, new_bill: { base_amount: 1680000, discount_amount: 0, total_amount: 1680000 } }] });
  const b3 = (await db.query(`SELECT total_amount, recorded_payment, paid_amount, status::text AS status FROM public.invoices WHERE student_id = '${S3}'`)).rows[0];
  ok('the bill is created with the figures sent and the payment on it (partial)',
     e === null && b3?.total_amount === 1680000 && b3?.recorded_payment === 1000000 && b3?.paid_amount === 1000000 && b3?.status === 'partial', { e, b3 });
}

console.log('\n4. who may run it');
{
  await reset();
  await db.query(`SELECT set_config('test.uid', $1, false)`, [ADMIN]);
  e = await run('authenticated', { amount: 1000000, allocations: [{ student_id: S1, amount: 1000000 }] });
  ok('a signed-in admin\'s own session (the browser) cannot call it', e?.code === '42501' && await nothingWritten(), e);
  await db.query(`SELECT set_config('test.uid', '', false)`);
  e = await run('anon', { amount: 1000000, allocations: [{ student_id: S1, amount: 1000000 }] });
  ok('anon cannot call it', e?.code === '42501', e);
}

console.log('\n5. the edge functions use it');
{
  for (const f of ['family-payment', 'smart-family-payment']) {
    const src = readFileSync(join(repo, 'supabase', 'functions', f, 'index.ts'), 'utf8');
    ok(`${f} records through record_family_payment`, /\.rpc\(\s*['"]record_family_payment['"]/.test(src));
    ok(`  and writes no payments, allocations, ledger or bills itself`,
       !/from\(['"](payments|payment_allocations|ledger_entries|ledger_accounts|invoices)['"]\)\s*\.(insert|update|upsert)\(/.test(src)
         && !/addToRecordedPayment|setRecordedPayment/.test(src), f);
  }
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
