// Tuition audit phase 3: supabase/migrations/20261121110000_historical_payment_rows.sql
// on top of the real record_admin_payment (20261117121000), in an in-process
// Postgres.
//
// What this suite holds:
//   1. The migration installs over live-shaped tables; existing rows become
//      receipts and nothing else about them changes.
//   2. The dry run inserts nothing and returns the per-month totals; they tie
//      to sum(recorded_payment) - what the payment rows explain + the refused
//      over-explanations.
//   3. Apply inserts exactly one historical row per short bill, for the
//      difference, dated the 1st of the bill's month in Hanoi, no ledger legs;
//      invoices, ledger_entries and ledger_accounts are byte-identical before
//      and after. Afterwards every bill not refused is fully explained.
//   4. Which payment rows explain a bill follows delete-payment's keyKind:
//      allocation keys count (smart-family-, payment-, record-payment-,
//      past-leftover-credit-<id>), leftover keys (smart-family-credit-) and
//      legs of a deleted payment do not; a record-payment correction counts
//      negative.
//   5. Idempotent: a second apply inserts nothing. A bill over-explained is
//      refused and listed, every run. A bill that grows after the backfill is
//      listed as still_short, never given a second historical row.
//   6. Who: a teacher is refused, anon cannot execute, the SQL editor (no
//      JWT) can. Nobody can write a historical row by hand; it cannot be
//      edited or deleted through the API, service_role included; the SQL
//      editor can remove them (the rollback).
//   7. The readers: student-audit's mapping lists a historical row as an
//      opening-balance adjustment in its bill's month, so the statement's
//      "Payments received" is not doubled; delete-payment refuses one before
//      reading the ledger (the real handler is run in invoice-status.test.mjs).
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const migrationFiles = process.argv.slice(2);
if (!migrationFiles.some((f) => basename(f).startsWith('20261121110000'))) {
  console.log('0 passed, 1 failed  -- run through run.mjs: the phase 3 migration was not passed');
  process.exit(1);
}

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), TEACHER = U(2);
const S1 = U(11), S2 = U(12), S3 = U(13), S4 = U(14), S5 = U(15), S6 = U(16);
const FAM = U(21);
const P1 = U(51), P2 = U(52), PX = U(59);
const RP5 = U(61), RP6 = U(62), RP1 = U(63);

// The live columns of these tables (read 21 Nov 2026), RLS and the admin's
// FOR ALL policies, the grants 20260712023825 left, and live's two payments
// triggers (audit_payments, prevent_client_payment_deletion).
const PRELUDE = `
  DO $r$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  END $r$;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.role', true), '') $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','partial','credit');
  CREATE TYPE public.account_code AS ENUM ('AR','REVENUE','DISCOUNT','CASH','BANK','CREDIT');
  CREATE TABLE public.user_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE TABLE public.families(id uuid PRIMARY KEY, name text NOT NULL DEFAULT 'family');
  CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text NOT NULL, family_id uuid REFERENCES public.families(id));
  CREATE TABLE public.invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id), month text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'issued', base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0,
    total_amount integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0, recorded_payment integer DEFAULT 0,
    carry_in_credit integer, carry_in_debt integer, carry_out_credit integer, carry_out_debt integer,
    tuition_frozen boolean NOT NULL DEFAULT false, confirmation_status text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid, UNIQUE(month, student_id));
  CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount integer NOT NULL, method text NOT NULL, memo text, occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, family_id uuid REFERENCES public.families(id),
    parent_payment_id uuid REFERENCES public.payments(id));
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL,
    code public.account_code NOT NULL, UNIQUE(code, student_id));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id), debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0,
    month text, occurred_at timestamptz NOT NULL DEFAULT now(), memo text, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now(),
    operation text, changed_fields text[], client_ip text, user_agent text);

  CREATE FUNCTION public.invoice_paid_label(p_recorded bigint, p_payable bigint, p_base bigint, p_total bigint)
  RETURNS public.invoice_status LANGUAGE sql IMMUTABLE SET search_path = public AS $function$
    SELECT (CASE
      WHEN coalesce(p_recorded, 0) >= coalesce(p_payable, 0)
           AND (coalesce(p_recorded, 0) > 0 OR greatest(coalesce(p_base, 0), coalesce(p_total, 0)) > 0) THEN 'paid'
      WHEN coalesce(p_recorded, 0) > 0 THEN 'partial'
      ELSE 'issued' END)::public.invoice_status
  $function$;

  -- live's audit_row_change, reduced to what it writes.
  CREATE FUNCTION public.audit_row_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  BEGIN
    IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
    INSERT INTO public.audit_log (entity, entity_id, action, operation, diff, actor_user_id)
    VALUES (TG_TABLE_NAME, COALESCE(CASE WHEN TG_OP <> 'DELETE' THEN NEW.id::text END, OLD.id::text), lower(TG_OP), TG_OP,
            jsonb_strip_nulls(jsonb_build_object('old', CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
                                                 'new', CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END)), auth.uid());
    RETURN NULL;
  END $f$;
  CREATE TRIGGER audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
  CREATE TRIGGER audit_invoices AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
  -- live's prevent_direct_payment_deletion: service_role and no-JWT pass (the ai_action_undo branch is not needed here).
  CREATE FUNCTION public.prevent_direct_payment_deletion() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  BEGIN
    IF (auth.role() != 'service_role') IS NOT TRUE THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Direct payment deletion is not allowed. Use the delete-payment edge function instead.';
  END $f$;
  CREATE TRIGGER prevent_client_payment_deletion BEFORE DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_payment_deletion();

  DO $g$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['students','families','invoices','payments','ledger_accounts','ledger_entries','audit_log','user_roles'] LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
      EXECUTE format('CREATE POLICY admin_all ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
      EXECUTE format('CREATE POLICY service_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END LOOP;
  END $g$;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
`;

const db = new PGlite();
await db.exec(PRELUDE);

// Session identity: 'admin' | 'teacher' | 'service' | 'anon' | null (SQL editor: no JWT, superuser).
async function as(who, fn) {
  const uid = who === 'admin' ? ADMIN : who === 'teacher' ? TEACHER : '';
  const role = who === null ? '' : who === 'service' ? 'service_role' : who === 'anon' ? 'anon' : 'authenticated';
  const pgRole = who === null ? null : who === 'service' ? 'service_role' : who === 'anon' ? 'anon' : 'authenticated';
  await db.query(`SELECT set_config('test.uid', $1, false), set_config('test.role', $2, false)`, [uid, role]);
  if (pgRole) await db.exec(`SET ROLE ${pgRole}`);
  try { return await fn(); } finally { if (pgRole) await db.exec('RESET ROLE'); }
}
const tryq = async (sql, params) => {
  try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message, code: e.code }; }
};

// ---------------------------------------------------------------- the world
await db.exec(`
  INSERT INTO public.user_roles (user_id, role) VALUES ('${ADMIN}', 'admin'), ('${TEACHER}', 'teacher');
  INSERT INTO public.families (id) VALUES ('${FAM}');
  INSERT INTO public.students (id, full_name, family_id) VALUES
    ('${S1}', 'Child 1', NULL), ('${S2}', 'Child 2', '${FAM}'), ('${S3}', 'Child 3', '${FAM}'),
    ('${S4}', 'Child 4', NULL), ('${S5}', 'Child 5', NULL), ('${S6}', 'Child 6', NULL);
  INSERT INTO public.ledger_accounts (student_id, code)
    SELECT s, c::public.account_code FROM unnest(ARRAY['${S1}','${S2}','${S3}','${S4}','${S5}','${S6}']::uuid[]) s,
           unnest(ARRAY['AR','CASH','BANK','REVENUE','CREDIT']) c;
  -- Bills as the old path left them: recorded_payment typed on, mostly no row behind it.
  INSERT INTO public.invoices (student_id, month, base_amount, total_amount, paid_amount, recorded_payment, status) VALUES
    ('${S1}', '2025-10', 1000000, 1000000, 1000000, 1000000, 'paid'),
    ('${S1}', '2025-11', 1000000, 1000000, 0, 0, 'issued'),
    ('${S2}', '2026-02', 2000000, 2000000, 2000000, 2000000, 'paid'),
    ('${S3}', '2026-02', 700000, 700000, 700000, 700000, 'paid'),
    ('${S2}', '2026-10', 1000000, 1000000, 40000, 40000, 'partial'),
    ('${S4}', '2026-03', 600000, 600000, 500000, 500000, 'partial'),
    ('${S5}', '2026-11', 600000, 600000, 200000, 200000, 'partial'),
    ('${S6}', '2026-10', 400000, 400000, 400000, 400000, 'paid');
  -- P1: a smart family payment (row on S2) split S2 1,260,000 / S3 700,000 on February,
  -- a leftover tx (smart-family-credit-: NOT on a bill, even with an AR leg) and the
  -- owner's past-leftover-credit (40,000 onto S2's October bill; its -reclass is ledger-only).
  INSERT INTO public.payments (id, student_id, family_id, amount, method, memo, occurred_at) VALUES
    ('${P1}', '${S2}', '${FAM}', 2000000, 'Bank Transfer', 'Smart family payment - 2 siblings', '2026-02-11'),
    ('${P2}', '${S4}', NULL, 600000, 'Cash', 'Payment', '2026-03-17');
`);
const acc = async (s, code) => (await db.query(`SELECT id FROM public.ledger_accounts WHERE student_id = $1 AND code = $2`, [s, code])).rows[0].id;
async function tx(key, legs) {
  const t = (await db.query('SELECT gen_random_uuid() AS id')).rows[0].id;
  let first = true;
  for (const [s, code, debit, credit, month] of legs) {
    await db.query(`INSERT INTO public.ledger_entries (tx_id, tx_key, account_id, debit, credit, month) VALUES ($1, $2, $3, $4, $5, $6)`,
      [t, first ? key : null, await acc(s, code), debit, credit, month]);
    first = false;
  }
}
await tx(`smart-family-${P1}-${S2}-1770822277127`, [[S2, 'BANK', 1260000, 0, '2026-02'], [S2, 'AR', 0, 1260000, '2026-02']]);
await tx(`smart-family-${P1}-${S3}-1770822284633`, [[S3, 'BANK', 700000, 0, '2026-02'], [S3, 'AR', 0, 700000, '2026-02']]);
await tx(`smart-family-credit-${P1}-1770822523201`, [[S2, 'BANK', 40000, 0, '2026-02'], [S2, 'AR', 0, 40000, '2026-02']]);
await tx(`past-leftover-credit-${P1}`, [[S2, 'BANK', 40000, 0, '2026-10'], [S2, 'AR', 0, 40000, '2026-10']]);
await tx(`past-leftover-credit-${P1}-reclass`, [[S2, 'CREDIT', 40000, 0, '2026-02'], [S2, 'BANK', 0, 40000, '2026-02']]);
// P2: legacy single payment of 600,000 on a bill that records only 500,000 (edited down since): over-explained.
await tx(`payment-${P2}`, [[S4, 'CASH', 600000, 0, '2026-03'], [S4, 'AR', 0, 600000, '2026-03']]);
// PX: a record-payment whose payments row is gone (deleted, reversal posted): its legs explain nothing.
await tx(`record-payment-${PX}-${S1}`, [[S1, 'CASH', 250000, 0, '2025-10'], [S1, 'AR', 0, 250000, '2025-10']]);
await tx(`payment-reversal-${PX}-1`, [[S1, 'CASH', 0, 250000, '2025-10'], [S1, 'AR', 250000, 0, '2025-10']]);

// Install: the real record_admin_payment first, then phase 3.
for (const f of migrationFiles) {
  let r = {}; try { await db.exec(readFileSync(f, "utf8")); } catch (e) { r = { error: e.message }; }
  ok(`migration ${basename(f)} installs`, !r.error, r.error);
  if (r.error) { console.log(`${pass} passed, ${fail + 1} failed`); process.exit(1); }
}

// After 17 Nov: S5 gets a real 300,000 receipt on top of the old 200,000;
// S6 gets a 100,000 correction off the old 400,000.
await as('admin', async () => {
  await db.query(`SELECT public.record_admin_payment($1, $2, '2026-11', 'payment', 300000, 'Cash', '2026-11-18T03:00:00Z', NULL, 200000)`, [RP5, S5]);
  await db.query(`SELECT public.record_admin_payment($1, $2, '2026-10', 'correction', 100000, 'Bank Transfer', '2026-11-18T03:00:00Z', 'entered twice', 400000)`, [RP6, S6]);
});

console.log('\nThe marker');
{
  const r = (await db.query(`SELECT id, source, month FROM public.payments ORDER BY id`)).rows;
  ok('every existing row (the two old ones and both record-payment rows) is a receipt with no month',
     r.length === 4 && r.every((p) => p.source === 'receipt' && p.month === null), r);
  const bad = await as('admin', () => tryq(`INSERT INTO public.payments (student_id, amount, method) VALUES ($1, 1000, 'historical')`, [S1]));
  ok('a receipt cannot carry the method "historical" (CHECK)', !!bad.error && /payments_historical_shape/.test(bad.error), bad);
  const byHand = await as('admin', () => tryq(
    `INSERT INTO public.payments (student_id, amount, method, occurred_at, source, month)
     VALUES ($1, 1000, 'historical', ('2025-11-01'::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'historical', '2025-11')`, [S1]));
  ok('an admin cannot write a historical row by hand through the API (HP403)', byHand.code === 'HP403', byHand);
  await db.exec('BEGIN');
  await db.query(`SELECT set_config('hec.historical_backfill', 'on', true)`);
  const mis = await as(null, () => tryq(`INSERT INTO public.payments (student_id, amount, method, occurred_at, source, month)
     VALUES ('${S1}', 1000, 'historical', '2025-11-01T00:00:00Z', 'historical', '2025-11')`));
  await db.exec('ROLLBACK');
  ok('a historical row dated anything but the 1st of its month, Hanoi time, is refused (CHECK)', !!mis.error && /payments_historical_shape/.test(mis.error), mis);
}

const snap = async () => (await db.query(`SELECT
  (SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) FROM public.invoices t) AS inv,
  (SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) FROM public.ledger_entries t) AS led,
  (SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) FROM public.ledger_accounts t) AS acc,
  (SELECT count(*)::int FROM public.ledger_entries) AS legs,
  (SELECT count(*)::int FROM public.payments) AS pays,
  (SELECT coalesce(sum(recorded_payment), 0)::bigint FROM public.invoices) AS recorded`)).rows[0];
const backfill = (dry) => db.query(`SELECT public.admin_backfill_historical_payments($1) AS r`, [dry]).then((x) => x.rows[0].r);
const EXPECT = { '2025-10': 1000000, '2026-02': 740000, '2026-10': 400000, '2026-11': 200000 };

console.log('\nThe dry run');
const before = await snap();
let dry;
{
  dry = await as('admin', () => backfill(true));
  const months = Object.fromEntries(dry.months.map((m) => [m.month, Number(m.amount)]));
  ok('per-month totals: Oct 2025 1,000,000; Feb 2026 740,000; Oct 2026 400,000; Nov 2026 200,000 (4 bills, 2,340,000)',
     JSON.stringify(months) === JSON.stringify(EXPECT) && dry.would_insert.rows === 4 && Number(dry.would_insert.amount) === 2340000
       && dry.months.every((m) => m.bills === 1), dry.months);
  ok('  the deleted payment\'s legs, the leftover tx and the -reclass explain nothing; past-leftover-credit and a correction (negative) do',
     months['2025-10'] === 1000000 && months['2026-02'] === 740000 && !('2026-10' in months && months['2026-10'] !== 400000));
  ok('the over-explained bill (600,000 of rows on a 500,000 bill) is refused and listed, nothing for it',
     dry.refused.length === 1 && dry.refused[0].student_id === S4 && dry.refused[0].month === '2026-03' && Number(dry.refused[0].over_by) === 100000
       && !('2026-03' in months), dry.refused);
  const t = dry.tie;
  ok('it ties: recorded 5,040,000 - explained 2,800,000 + refused 100,000 = 2,340,000',
     Number(t.recorded_total) === 5040000 && Number(t.explained_before) === 2800000 && Number(t.refused_over_by) === 100000
       && Number(t.recorded_total) - Number(t.explained_before) + Number(t.refused_over_by) - Number(t.still_short_by) === Number(dry.would_insert.amount), t);
  const after = await snap();
  ok('the dry run writes nothing (payments, invoices, ledger identical)', JSON.stringify(after) === JSON.stringify(before), { before, after });
  ok('dry run is the default', (await as('admin', () => db.query(`SELECT public.admin_backfill_historical_payments() AS r`))).rows[0].r.dry_run === true);
}

console.log('\nWho may run it');
{
  const t = await as('teacher', () => tryq(`SELECT public.admin_backfill_historical_payments(false)`));
  ok('a teacher is refused (HP403), nothing written', t.code === 'HP403' && (await snap()).pays === before.pays, t);
  const a = await as('anon', () => tryq(`SELECT public.admin_backfill_historical_payments(true)`));
  ok('anon cannot execute it', !!a.error && /permission denied/.test(a.error), a);
  const s = await as('service', () => tryq(`SELECT public.admin_backfill_historical_payments(true)`));
  ok('service_role cannot execute it (no admin behind the key)', !!s.error && /permission denied/.test(s.error), s);
  const e = await as(null, () => tryq(`SELECT public.admin_backfill_historical_payments(true) AS r`));
  ok('the SQL editor (no JWT) can run the dry run', !e.error && e.rows[0].r.would_insert.rows === 4, e);
}

console.log('\nApply');
{
  const res = await as('admin', () => backfill(false));
  ok('inserts 4 rows, 2,340,000', res.inserted.rows === 4 && Number(res.inserted.amount) === 2340000, res.inserted);
  const after = await snap();
  ok('invoices byte-identical (recorded_payment, labels, carry, updated_at - all of it)', after.inv === before.inv, { before: before.inv, after: after.inv });
  ok('ledger_entries and ledger_accounts byte-identical: NO legs written', after.led === before.led && after.acc === before.acc && after.legs === before.legs);
  ok('total recorded_payment unchanged', after.recorded === before.recorded);
  const rows = (await db.query(`SELECT student_id, month, amount, method, source, family_id, parent_payment_id, created_by, memo,
      to_char(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS hanoi
      FROM public.payments WHERE source = 'historical' ORDER BY month`)).rows;
  const want = [[S1, '2025-10', 1000000], [S2, '2026-02', 740000], [S6, '2026-10', 400000], [S5, '2026-11', 200000]];
  ok('one row per short bill, for the difference', JSON.stringify(rows.map((r) => [r.student_id, r.month, r.amount])) === JSON.stringify(want), rows);
  ok('  each: method historical, dated the 1st of its month 00:00 Hanoi, no family or parent, the admin as creator, the audit in the memo',
     rows.every((r) => r.method === 'historical' && r.hanoi === `${r.month}-01 00:00` && !r.family_id && !r.parent_payment_id
       && r.created_by === ADMIN && /tuition audit 16 Nov 2026/.test(r.memo)), rows);
  const unexplained = (await db.query(`SELECT i.student_id, i.month, i.recorded_payment,
      coalesce((SELECT sum(b.amount) FROM public.payment_bill_amounts b WHERE b.student_id = i.student_id AND b.month = i.month), 0)::bigint AS expl
      FROM public.invoices i`)).rows.filter((r) => Number(r.expl) !== Number(r.recorded_payment));
  ok('every bill but the refused one is now fully explained by its payment rows',
     unexplained.length === 1 && unexplained[0].student_id === S4, unexplained);
  const audit = (await db.query(`SELECT diff FROM public.audit_log WHERE action = 'historical_payment_backfill'`)).rows;
  ok('one summary audit row, plus the audit trigger\'s row for each insert',
     audit.length === 1 && audit[0].diff.rows === 4
       && (await db.query(`SELECT count(*)::int AS n FROM public.audit_log WHERE entity = 'payments' AND operation = 'INSERT' AND diff->'new'->>'source' = 'historical'`)).rows[0].n === 4);
}

console.log('\nRe-run');
{
  const snap1 = await snap();
  const again = await as('admin', () => backfill(false));
  const snap2 = await snap();
  ok('a second apply inserts nothing and changes nothing', again.inserted.rows === 0 && again.would_insert.rows === 0
     && JSON.stringify(snap1) === JSON.stringify(snap2) && again.months.length === 0, again);
  ok('  the over-explained bill is still refused and listed', again.refused.length === 1 && again.refused[0].student_id === S4);
  const d2 = await as('admin', () => backfill(true));
  ok('  and the dry run now says 0', d2.would_insert.rows === 0 && Number(d2.would_insert.amount) === 0);
}

console.log('\nAfter the backfill');
{
  // A real payment on a backfilled bill: the receipt explains its own part.
  await as('admin', () => db.query(`SELECT public.record_admin_payment($1, $2, '2025-10', 'payment', 50000, 'Cash', now(), NULL, 1000000)`, [RP1, S1]));
  let r = (await db.query(`SELECT i.recorded_payment, (SELECT sum(amount) FROM public.payment_bill_amounts WHERE student_id = i.student_id AND month = i.month)::bigint AS expl
      FROM public.invoices i WHERE student_id = $1 AND month = '2025-10'`, [S1])).rows[0];
  ok('record_admin_payment on a backfilled bill still works; historical + receipt = recorded (1,050,000)',
     r.recorded_payment === 1050000 && Number(r.expl) === 1050000, r);
  let d = await as('admin', () => backfill(true));
  ok('  and the backfill has nothing to add', d.would_insert.rows === 0 && d.still_short.length === 0, d);
  // The old path again (what phase 1's guard will refuse): never a second historical row.
  await db.query(`UPDATE public.invoices SET recorded_payment = recorded_payment + 70000 WHERE student_id = $1 AND month = '2025-10'`, [S1]);
  d = await as('admin', () => backfill(false));
  ok('a bill grown since its backfill is listed as still_short (70,000), and no second historical row is written',
     d.inserted.rows === 0 && d.still_short.length === 1 && Number(d.still_short[0].short_by) === 70000
       && (await db.query(`SELECT count(*)::int AS n FROM public.payments WHERE source = 'historical' AND student_id = $1`, [S1])).rows[0].n === 1, d);
  await db.query(`UPDATE public.invoices SET recorded_payment = recorded_payment - 70000 WHERE student_id = $1 AND month = '2025-10'`, [S1]);
}

console.log('\nA historical row cannot be changed or taken');
{
  const hid = (await db.query(`SELECT id FROM public.payments WHERE source = 'historical' AND student_id = $1`, [S1])).rows[0].id;
  const up = await as('admin', () => tryq(`UPDATE public.payments SET amount = 1 WHERE id = $1`, [hid]));
  ok('an admin cannot edit one (HP403)', up.code === 'HP403', up);
  const flip = await as('admin', () => tryq(`UPDATE public.payments SET source = 'historical', month = '2026-02' WHERE id = $1`, [P2]));
  ok('a receipt cannot be turned into a historical row (HP403)', flip.code === 'HP403', flip);
  const del = await as('admin', () => tryq(`DELETE FROM public.payments WHERE id = $1`, [hid]));
  ok('an admin cannot delete one', !!del.error, del);
  const sdel = await as('service', () => tryq(`DELETE FROM public.payments WHERE id = $1`, [hid]));
  ok('service_role (delete-payment\'s client) cannot delete one (HP403)', sdel.code === 'HP403', sdel);
  ok('  it is still there', (await db.query(`SELECT count(*)::int AS n FROM public.payments WHERE id = $1`, [hid])).rows[0].n === 1);
  await db.exec('BEGIN');
  const rb = await as(null, () => tryq(`DELETE FROM public.payments WHERE source = 'historical'`));
  const left = (await db.query(`SELECT count(*)::int AS n FROM public.payments WHERE source = 'historical'`)).rows[0].n;
  await db.exec('ROLLBACK');
  ok('the owner\'s rollback in the SQL editor (no JWT) removes them all', !rb.error && left === 0, rb);
}

console.log('\nThe readers');
{
  const out = mkdtempSync(join(tmpdir(), 'hist-pay-'));
  const lib = join(out, 'payment-source.mjs');
  writeFileSync(lib, (await build({ entryPoints: [join(repo, 'supabase', 'functions', '_lib', 'payment-source.ts')], bundle: true, format: 'esm', write: false })).outputFiles[0].text);
  const L = await import(pathToFileURL(lib).href);
  const src = readFileSync(join(repo, 'supabase', 'functions', '_lib', 'payment-source.ts'), 'utf8');
  ok('_lib/payment-source.ts imports nothing', !/^\s*import\s/m.test(src));

  // The rows as PostgREST returns them, and the audit_log bump the old path left for the same money.
  const rows = (await db.query(`SELECT id, amount, method, memo, source, month, created_by, parent_payment_id,
      to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS occurred_at, created_at::text AS created_at
      FROM public.payments WHERE student_id = $1`, [S1])).rows;
  const events = rows.map((p) => ({ ...L.paymentAuditEvent(p), provenance: 'payments' }));
  const hist = events.find((e) => /Opening balance/.test(e.label));
  ok('student-audit lists the historical row as an adjustment in its bill\'s month (2025-10, though stored as 2025-09-30T17:00Z)',
     !!hist && hist.kind === 'adjustment' && hist.month === '2025-10' && hist.amount === 1000000, events);
  const receipt = events.find((e) => e.kind === 'payment');
  ok('  the receipt beside it is listed as a payment, as before', !!receipt && receipt.amount === 50000 && receipt.label === 'Payment');
  ok('  a correction is still an adjustment', L.paymentAuditEvent({ amount: -100000, occurred_at: '2026-11-18T03:00:00Z' }).kind === 'adjustment');
  ok('  a row from before the migration (no source) is a receipt', L.paymentAuditEvent({ amount: 5, occurred_at: '2026-02-11T00:00:00Z' }).kind === 'payment'
     && !L.isHistoricalPayment({ amount: 5 }));
  // StudentStatementPrint: "Payments received" = payment and correction events.
  const auditBump = { kind: 'payment', amount: 1000000, month: '2025-10', provenance: 'audit_log' };
  const printed = [...events, auditBump].filter((e) => e.kind === 'payment' || e.kind === 'correction');
  ok('the Account Statement\'s "Payments received" totals 1,050,000 (the old bump and the new receipt), not 2,050,000: the opening balance is not printed',
     printed.length === 2 && printed.reduce((s, e) => s + Math.abs(e.amount), 0) === 1050000 && !printed.some((e) => /Opening balance/.test(e.label ?? '')), printed);
  ok('the scalarPayments caveat counts receipts only', L.receiptRows(rows).length === 1 && L.receiptRows([{ source: 'historical' }]).length === 0);

  const audit = readFileSync(join(repo, 'supabase', 'functions', 'student-audit', 'index.ts'), 'utf8');
  ok('student-audit maps every payments row through paymentAuditEvent, reads select("*") (works before the migration too) and counts receipts for the caveat',
     /from\("payments"\)\s*\n\s*\/\/[^\n]*\n\s*\.select\("\*"\)/.test(audit) && /paymentAuditEvent\(p\)/.test(audit) && /receiptRows\(payments\)\.length === 0/.test(audit));
  const del = readFileSync(join(repo, 'supabase', 'functions', 'delete-payment', 'index.ts'), 'utf8');
  ok('delete-payment refuses a historical row before it reads the ledger',
     del.indexOf('isHistoricalPayment(payment)') > 0 && del.indexOf('isHistoricalPayment(payment)') < del.indexOf(".from('ledger_entries')"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
