// D5 G-1: supabase/functions/record-payment, the one admin payment path
// (docs/evidence/G1-record-payment.md), its database function
// public.record_admin_payment (20261117121000, fix round 1), and
// delete-payment taking one back.
//
// What runs: the REAL record-payment and delete-payment handlers, bundled
// with esbuild (remote imports stubbed), against a PostgREST stand-in over
// ONE pglite database carrying the real triggers the money passes through:
//
//   the D4 release as built by guard-fingerprint.mjs (D4_BUILD): D2's
//   prelude, its baseline (audit 20261009130000, the cancelled-lesson guard,
//   D1, D2, the freeze 20261106120000, the enrolment RPCs ...) and EVERY D4
//   file (20261114090000 floors - zz_invoice_state_floor -, 091000 register,
//   092000 class fee, 093000 lesson pay, 094000 money inputs - the frozen-bill
//   guards on invoices);
//   then live's ledger / payment tables (20251012022746 + tx_key 20251024050029
//   + the family columns, as past-leftover-credit.test.mjs has them) with
//   live's admin policies (20251012023454) and grants (20260712023825);
//   the carry trigger 20261009120000, invoice_paid_label (20261113090000),
//   the relabelling carry refresh 20261117110000 (G-4) and the append-only
//   ledger 20261117111000 (G-11);
//   and EVERY OTHER trigger live has on payments, ledger_accounts,
//   ledger_entries and invoices (pg_trigger, read-only, 17 Nov): payments'
//   prevent_client_payment_deletion (20251024152825 - review B-1: the suite
//   before fix round 1 lacked it), the updated_at triggers (20251012022746),
//   and G-11 round 2's ledger_entries_stamp_created_at plus its revoke of
//   refresh_invoice_carry (live, from main; this branch's copy of the file
//   predates round 2);
//   then the file under test, 20261117121000_record_admin_payment.sql.
//
// The stand-in runs a client made with the caller's JWT as `authenticated`
// (auth.uid() = the caller, row security on), the service key as
// `service_role`, and supabase.rpc() as one SELECT - one transaction, as
// PostgREST does. A test trigger records the database role that made every
// payments / ledger / bill write, so "written as the admin" is asserted.
// Faults are raised INSIDE the transaction by test triggers (a bill write
// that times out, a ledger insert that fails, the audit row failing), and
// lost replies are scripted on the rpc call (before it ran, or after it
// committed).
//
// The figures checked at the end are scripts/CHECK-money-invariants.sql
// itself (M01 / M03 / M04), run over a copy of the rows the functions wrote,
// in the fixture schema money-invariants-check.test.mjs holds to the live
// columns.
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { FunctionsClient } from '@supabase/functions-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { repo } from './d4-prelude.mjs';
import { D4_BUILD } from './guard-fingerprint.mjs';

const PROBE = !!process.env.G1_PROBE_LIVE_DELETE_TRIGGER;
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra, (_, v) => (typeof v === 'bigint' ? String(v) : v)).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};
const migText = (n) => readFileSync(join(repo, 'supabase', 'migrations', n), 'utf8').replace(/\r\n/g, '\n');
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: e.message }; } };
const RP_MIGRATION = '20261117121000_record_admin_payment.sql';
const RP_SIG = 'public.record_admin_payment(uuid, uuid, text, text, integer, text, timestamptz, text, integer)';

// ------------------------------------------------------------- database
const db = new PGlite();
// One statement sequence at a time: a request's role switch, its query and
// the reset must not interleave with another request's (the concurrency
// cases run two handlers at once).
let chain = Promise.resolve();
function locked(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}
async function asRole(who, uid, sql, params = []) {
  return locked(async () => {
    const role = who === 'service' ? 'service_role' : who === 'user' ? 'authenticated' : who === 'anon' ? 'anon' : null;
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('test.uid', $1, false), set_config('test.jwt_role', $2, false)`, [uid ?? '', role ?? '']);
    if (role) await db.exec(`SET ROLE ${role}`);
    try { return await db.query(sql, params); }
    finally {
      await db.exec('RESET ROLE');
      await db.query(`SELECT set_config('test.uid', '', false), set_config('test.jwt_role', '', false)`);
    }
  });
}
const sql = (text, params) => asRole(null, null, text, params);
const rows = async (text, params) => (await sql(text, params)).rows;
const one = async (text, params) => (await rows(text, params))[0];

const { prelude, baseline, files: D4_FILES, mig } = D4_BUILD;
await db.exec(prelude);
// Live's invoices: status is the invoice_status enum, and the columns the
// payment paths write (20251012022746 + later). Before the baseline, so every
// migration sees the live shape.
await db.exec(`
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
  ALTER TABLE public.invoices ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.invoices ALTER COLUMN status TYPE public.invoice_status USING status::public.invoice_status;
  ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';
  ALTER TABLE public.invoices ALTER COLUMN recorded_payment SET DEFAULT 0;
  ALTER TABLE public.invoices ADD COLUMN number text, ADD COLUMN paid_amount integer NOT NULL DEFAULT 0,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN created_by uuid, ADD COLUMN updated_by uuid;
`);
for (const f of baseline) await db.exec(mig(f));
for (const f of D4_FILES) await db.exec(mig(f));
await db.exec(`
  -- live's ledger and payment tables (20251012022746, tx_key 20251024050029, family columns)
  CREATE TYPE public.account_code AS ENUM ('AR', 'REVENUE', 'DISCOUNT', 'CASH', 'BANK', 'CREDIT');
  CREATE TABLE public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    code public.account_code NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, code));
  CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tx_id UUID NOT NULL,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
    debit INTEGER NOT NULL DEFAULT 0, credit INTEGER NOT NULL DEFAULT 0,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), memo TEXT, month TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID, tx_key TEXT UNIQUE,
    CONSTRAINT debit_or_credit CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)));
  ALTER TABLE public.payments ALTER COLUMN amount DROP DEFAULT, ALTER COLUMN method DROP DEFAULT,
    ADD COLUMN parent_payment_id uuid;
  CREATE TABLE public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, allocated_amount INTEGER NOT NULL, allocation_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID);
  CREATE TABLE public.payment_deletions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid, snapshot jsonb,
    deleted_by uuid, deletion_reason text, deleted_at timestamptz DEFAULT now());
  -- what G-11 audits besides the ledger (sibling_discount_state and discount_definitions are D4_INPUTS')
  CREATE TABLE IF NOT EXISTS public.expenditures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric NOT NULL, category text NOT NULL, date date NOT NULL);
  CREATE TABLE IF NOT EXISTS public.settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    amount integer NOT NULL, settlement_type text NOT NULL);
  CREATE TABLE IF NOT EXISTS public.monthly_finance_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL,
    month text NOT NULL, final_payable integer NOT NULL DEFAULT 0);
  -- 20260712023825: the API roles get every table explicitly.
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  -- 20251012023454:128-139 (invoices and payments already carry D4_INPUTS' admin policy)
  ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage ledger accounts" ON public.ledger_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage ledger entries" ON public.ledger_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage payment allocations" ON public.payment_allocations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  ALTER TABLE public.payment_deletions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins manage payment deletions" ON public.payment_deletions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  -- 20251012023454:104 + 20260809101447: admins read and write the audit log
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Admins can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
  -- a family login reads its own children's money (enough for "a parent cannot")
  CREATE POLICY family_reads_payments ON public.payments FOR SELECT TO authenticated
    USING (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()));
`);
// The audit trigger on the payment tables made after the audit migration ran (live has them).
for (const t of ['payments', 'payment_allocations']) {
  await db.exec(`DROP TRIGGER IF EXISTS audit_${t} ON public.${t};
    CREATE TRIGGER audit_${t} AFTER INSERT OR UPDATE OR DELETE ON public.${t} FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();`);
}
await db.exec(mig('20261009120000_keep_invoice_carry_balances_correct.sql'));
{
  const t = migText('20261113090000_invoice_paid_label.sql');
  const a = t.indexOf('CREATE OR REPLACE FUNCTION public.invoice_paid_label');
  const b = t.indexOf('$function$;', a);
  await db.exec(t.slice(a, b + '$function$;'.length));
}
await db.exec(mig('20261117110000_carry_refresh_relabels.sql'));
await db.exec(mig('20261117111000_ledger_append_only_and_audit.sql'));

// ---- the rest of live's triggers on the money tables (pg_trigger, 17 Nov)
// payments.prevent_client_payment_deletion: the function and trigger text of
// 20251024152825, verbatim (review B-1).
const DELETE_TRIGGER_SQL = (() => {
  const t = migText('20251024152825_6747d865-6888-4aa4-b728-fdb8e5a109d3.sql');
  const a = t.indexOf('CREATE OR REPLACE FUNCTION public.prevent_direct_payment_deletion()');
  const b = t.indexOf('EXECUTE FUNCTION public.prevent_direct_payment_deletion();', a);
  return t.slice(a, b + 'EXECUTE FUNCTION public.prevent_direct_payment_deletion();'.length);
})();
await db.exec(DELETE_TRIGGER_SQL);
// updated_at triggers (20251012022746:90-102); payments has none on live.
await db.exec(`
  CREATE TRIGGER update_ledger_accounts_updated_at BEFORE UPDATE ON public.ledger_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  CREATE TRIGGER update_ledger_entries_updated_at BEFORE UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
  CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
`);
// G-11 fix round 2 as live has it (pg_get_functiondef, 17 Nov; main's copy of 20261117111000).
await db.exec(`
  CREATE OR REPLACE FUNCTION public.ledger_entries_stamp_created_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $function$
  BEGIN
    NEW.created_at := now();
    RETURN NEW;
  END
  $function$;
  REVOKE ALL ON FUNCTION public.ledger_entries_stamp_created_at() FROM PUBLIC, anon, authenticated;
  DROP TRIGGER IF EXISTS ledger_entries_stamp_created_at ON public.ledger_entries;
  CREATE TRIGGER ledger_entries_stamp_created_at BEFORE INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.ledger_entries_stamp_created_at();
  -- G-4 fix round 2 as live has it: only the trigger (definer) calls the refresh.
  REVOKE EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) TO service_role;
`);

// ---- the file under test, with live's default privileges on new functions
// (pg_default_acl, 17 Nov: EXECUTE to anon, authenticated and service_role),
// so its REVOKE is what keeps anon and the service key out.
await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role');
await db.exec(mig(RP_MIGRATION));
await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role');

// ---- test instruments (not live): who wrote, and faults inside the transaction
await db.exec(`
  CREATE TABLE public.test_write_role(id bigserial PRIMARY KEY, tbl text, op text, role text, uid uuid, row_id text);
  GRANT ALL ON public.test_write_role TO PUBLIC; GRANT ALL ON SEQUENCE public.test_write_role_id_seq TO PUBLIC;
  CREATE FUNCTION public.test_log_write() RETURNS trigger LANGUAGE plpgsql AS $f$
  BEGIN
    INSERT INTO public.test_write_role(tbl, op, role, uid, row_id)
    VALUES (TG_TABLE_NAME, lower(TG_OP), current_user, auth.uid(), to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END)->>'id');
    RETURN NULL;
  END $f$;
  CREATE TRIGGER zz_test_log AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.test_log_write();
  CREATE TRIGGER zz_test_log AFTER INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.test_log_write();
  CREATE TRIGGER zz_test_log AFTER INSERT ON public.ledger_accounts FOR EACH ROW EXECUTE FUNCTION public.test_log_write();
  CREATE TRIGGER zz_test_log AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.test_log_write();

  CREATE TABLE public.test_faults(name text PRIMARY KEY, only_action text, code text NOT NULL DEFAULT '57014',
    message text NOT NULL DEFAULT 'canceling statement due to statement timeout');
  GRANT ALL ON public.test_faults TO PUBLIC;
  CREATE FUNCTION public.test_fault() RETURNS trigger LANGUAGE plpgsql AS $f$
  DECLARE f record;
  BEGIN
    SELECT * INTO f FROM public.test_faults WHERE name = TG_TABLE_NAME || '.' || lower(TG_OP);
    IF FOUND AND (f.only_action IS NULL OR f.only_action = to_jsonb(NEW)->>'action') THEN
      RAISE EXCEPTION '%', f.message USING ERRCODE = f.code;
    END IF;
    RETURN NEW;
  END $f$;
  CREATE TRIGGER aa_test_fault BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.test_fault();
  CREATE TRIGGER aa_test_fault BEFORE INSERT ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.test_fault();
  CREATE TRIGGER aa_test_fault BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.test_fault();
  CREATE TRIGGER aa_test_fault BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.test_fault();
`);
const withFault = async (fault, fn) => {
  await sql('INSERT INTO public.test_faults(name, only_action, code, message) VALUES ($1, $2, coalesce($3, \'57014\'), coalesce($4, \'canceling statement due to statement timeout\'))',
    [fault.name, fault.only_action ?? null, fault.code ?? null, fault.message ?? null]);
  try { return await fn(); } finally { await sql('DELETE FROM public.test_faults WHERE name = $1', [fault.name]); }
};

console.log('\n0. the database carries the real money triggers, and the function as the migration states it');
{
  const trg = (await rows(`SELECT c.relname || '.' || t.tgname AS n FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
                             WHERE NOT t.tgisinternal AND t.tgenabled <> 'D'`)).map((r) => r.n);
  const want = ['invoices.zz_invoice_state_floor', 'invoices.zz_invoice_unfreeze_guard', 'invoices.zz_invoice_frozen_keep_guard',
    'invoices.zz_invoice_frozen_delete_guard', 'invoices.keep_frozen_invoice_amounts', 'invoices.invoices_carry_sync', 'invoices.audit_invoices',
    'invoices.update_invoices_updated_at',
    'ledger_entries.ledger_entries_append_only', 'ledger_entries.ledger_entries_no_truncate', 'ledger_entries.ledger_entries_stamp_created_at',
    'ledger_entries.update_ledger_entries_updated_at', 'ledger_accounts.audit_ledger_accounts', 'ledger_accounts.update_ledger_accounts_updated_at',
    'payments.audit_payments', 'payments.prevent_client_payment_deletion'];
  const missing = want.filter((w) => !trg.includes(w));
  ok(`every D4 file loaded (${D4_FILES.length}) with G-4 and G-11; every trigger live has on invoices, payments, ledger_accounts and ledger_entries is on (${want.length})`,
     D4_FILES.length === 5 && missing.length === 0, { missing, trg });
  const fn = await one(`SELECT p.prosecdef, p.provolatile, p.proconfig::text AS cfg,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS svc,
      EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0) AS public_exec
    FROM pg_proc p WHERE p.oid = '${RP_SIG}'::regprocedure`);
  ok('record_admin_payment: SECURITY INVOKER, volatile, fixed search_path; EXECUTE for authenticated only (not PUBLIC, anon or service_role)',
     fn && fn.prosecdef === false && fn.provolatile === 'v' && /search_path=public, pg_temp/.test(fn.cfg) && fn.auth === true && fn.anon === false && fn.svc === false && fn.public_exec === false, fn);
  const body = migText(RP_MIGRATION).replace(/--[^\n]*/g, '');
  ok('  its body deletes nothing and updates no ledger row (there is no undo path); it locks the bill FOR UPDATE and writes recorded_payment only WHERE it still holds the value read',
     !/\bDELETE\b/i.test(body) && !/UPDATE\s+public\.ledger_entries/i.test(body) && /FROM public\.invoices i\s+WHERE i\.student_id = p_student_id AND i\.month = p_month\s+FOR UPDATE/.test(body)
     && /WHERE i\.id = v_bill\.id AND coalesce\(i\.recorded_payment, 0\) = v_before/.test(body));
  if (PROBE) {
    const live = (await one(`SELECT prosrc FROM pg_proc WHERE proname = 'prevent_direct_payment_deletion'`)).prosrc;
    const kid = (await one(`INSERT INTO public.students (full_name) VALUES ('ProbeKid') RETURNING id`)).id;
    const admin = randomUUID();
    await sql(`INSERT INTO public.user_roles VALUES ($1, 'admin')`, [admin]);
    const pid = (await one(`INSERT INTO public.payments (student_id, amount, method) VALUES ($1, 1, 'Cash') RETURNING id`, [kid])).id;
    const refused = await tryIt(() => asRole('user', admin, 'DELETE FROM public.payments WHERE id = $1', [pid]));
    const allowed = await tryIt(() => asRole('service', null, 'DELETE FROM public.payments WHERE id = $1', [pid]));
    await sql('DELETE FROM public.user_roles WHERE user_id = $1', [admin]);
    await sql('DELETE FROM public.students WHERE id = $1', [kid]);
    ok('PROBE (review B-1): the payments delete trigger is the text of 20251024152825; it refuses an admin\'s DELETE and lets the service role (delete-payment) through',
       /IF auth\.role\(\) != 'service_role' THEN/.test(live) && DELETE_TRIGGER_SQL.includes(live.trim()) && /Direct payment deletion is not allowed/.test(refused?.message ?? '') && allowed === null, { refused, allowed });
  }
}

console.log('\n0b. the migration refuses to install when something it needs is missing (nothing created)');
{
  const MINIMAL = `
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
    CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
    CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
    CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE AS
      $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
    CREATE TYPE public.account_code AS ENUM ('AR', 'REVENUE', 'DISCOUNT', 'CASH', 'BANK', 'CREDIT');
    CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
    CREATE TABLE public.students(id uuid PRIMARY KEY, full_name text);
    CREATE TABLE public.payments(id uuid PRIMARY KEY, student_id uuid, amount integer, method text, occurred_at timestamptz, memo text, created_by uuid);
    CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, code public.account_code, UNIQUE(student_id, code));
    CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid, tx_key text UNIQUE, account_id uuid,
      debit integer, credit integer, occurred_at timestamptz, memo text, month text, created_by uuid);
    CREATE TABLE public.invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, month text, recorded_payment integer, paid_amount integer,
      base_amount integer, total_amount integer, carry_in_debt integer, carry_in_credit integer, status public.invoice_status,
      updated_at timestamptz, updated_by uuid, UNIQUE(student_id, month));
    CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text, entity_id text, action text, actor_user_id uuid, diff jsonb);
    CREATE FUNCTION public.invoice_paid_label(p_recorded bigint, p_payable bigint, p_base bigint, p_total bigint) RETURNS public.invoice_status
      LANGUAGE sql IMMUTABLE AS $f$ SELECT 'issued'::public.invoice_status $f$;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;`;
  const attempt = async (mutate) => {
    const c = new PGlite();
    await c.exec(MINIMAL);
    if (mutate) await c.exec(mutate);
    let error = null;
    try { await c.exec(migText(RP_MIGRATION)); } catch (e) { error = e.message; }
    const made = (await c.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname = 'record_admin_payment'`)).rows[0].n;
    await c.close();
    return { error, made };
  };
  const good = await attempt(null);
  ok('with everything it needs it installs', good.error === null && good.made === 1, good);
  const cases = [
    ['payments.created_by missing', 'ALTER TABLE public.payments DROP COLUMN created_by', /missing column\(s\) payments\.created_by/],
    ['invoices.updated_by missing', 'ALTER TABLE public.invoices DROP COLUMN updated_by', /invoices\.updated_by/],
    ['no audit_log table', 'DROP TABLE public.audit_log', /audit_log\.entity/],
    ['invoice_paid_label missing', 'DROP FUNCTION public.invoice_paid_label(bigint,bigint,bigint,bigint)', /invoice_paid_label is not installed/],
    ['ledger_accounts unique is partial', `ALTER TABLE public.ledger_accounts DROP CONSTRAINT ledger_accounts_student_id_code_key;
       CREATE UNIQUE INDEX la_partial ON public.ledger_accounts(student_id, code) WHERE student_id IS NOT NULL`, /no plain unique index on ledger_accounts/],
    ['ledger_entries.tx_key not unique', 'ALTER TABLE public.ledger_entries DROP CONSTRAINT ledger_entries_tx_key_key', /no plain unique index on ledger_entries/],
    ['authenticated lacks INSERT on ledger_entries', 'REVOKE INSERT ON public.ledger_entries FROM authenticated', /authenticated lacks INSERT on public\.ledger_entries/],
    ['account_code lacks BANK', `ALTER TABLE public.ledger_accounts ALTER COLUMN code TYPE text; DROP TYPE public.account_code;
       CREATE TYPE public.account_code AS ENUM ('AR', 'CASH', 'REVENUE', 'CREDIT')`, /account_code lacks/],
    ['another signature exists', `CREATE FUNCTION public.record_admin_payment(p uuid) RETURNS jsonb LANGUAGE sql AS $f$ SELECT '{}'::jsonb $f$`, /another public\.record_admin_payment signature/],
  ];
  const results = [];
  for (const [name, mutate, re] of cases) {
    const r = await attempt(mutate);
    results.push({ name, ok: !!r.error && re.test(r.error) && r.made === (name === 'another signature exists' ? 1 : 0), r });
  }
  ok(`each of ${cases.length} missing pieces refuses the install with a reason and creates nothing (${cases.map((c) => c[0]).join('; ')})`,
     results.every((x) => x.ok), results.filter((x) => !x.ok));
}

// ------------------------------------------------------ PostgREST stand-in
const SERVICE_KEY = 'service-role-key';
const ANON_KEY = 'anon-key';
const jwts = new Map();                         // token -> user id
const log = [];                                 // { table, op, who }
const invokes = [];                             // { name, who, body }
let faults = [];                                // { table, op, match?(q), error, before?() }
let rpcFaults = [];                             // { name, when: 'before' | 'after', error }
const tuition = { fail: new Set(), price: new Map() };
const val = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);

function fakeClient(key, opts) {
  const header = opts?.global?.headers?.Authorization ?? null;
  const token = header ? header.replace(/^Bearer\s+/i, '') : null;
  const who = header ? 'user' : key === SERVICE_KEY ? 'service' : 'anon';
  const uid = token ? jwts.get(token) ?? null : null;
  const run = (text, params) => asRole(who, uid, text, params);

  const from = (table) => {
    let mode = 'select', cols = '*', ret = false, payload = null, onConflict = '', ignoreDup = false, order = '', lim = '', one = null;
    const where = [], params = [];
    let embeds = [];
    const p = (v) => { params.push(v); return `$${params.length}`; };
    const parseCols = (c) => {
      embeds = [...c.matchAll(/(\w+)(!inner)?\(([^)]*)\)/g)].map((m) => ({ rel: m[1], cols: m[3] }));
      return c.replace(/,?\s*\w+(!inner)?\([^)]*\)/g, '').trim() || '*';
    };
    async function attach(list) {
      for (const e of embeds) for (const r of list) {
        if (e.rel === 'payment_allocations') r.payment_allocations = (await run(`SELECT ${e.cols} FROM public.payment_allocations WHERE parent_payment_id = $1`, [r.id])).rows;
        if (e.rel === 'ledger_accounts') r.ledger_accounts = (await run('SELECT student_id, code::text AS code FROM public.ledger_accounts WHERE id = $1', [r.account_id])).rows[0] ?? null;
      }
      return list;
    }
    async function exec() {
      const f = faults.find((x) => x.table === table && x.op === mode && (!x.match || x.match({ payload, where, params })));
      if (f) {
        faults = faults.filter((x) => x !== f);
        if (f.before) await f.before();
        if (f.error) return { data: null, error: f.error };
      }
      if (mode !== 'select') log.push({ table, op: mode, who });
      const w = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      try {
        let data;
        if (mode === 'select') {
          data = await attach((await run(`SELECT ${cols} FROM public.${table}${w}${order}${lim}`, params)).rows);
        } else if (mode === 'insert' || mode === 'upsert') {
          const list = Array.isArray(payload) ? payload : [payload];
          const keys = [...new Set(list.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
          const vals = list.map((r) => `(${keys.map((k) => (r[k] === undefined ? 'DEFAULT' : p(val(r[k])))).join(', ')})`).join(', ');
          const conflict = mode === 'upsert' ? (ignoreDup ? ` ON CONFLICT (${onConflict}) DO NOTHING`
            : ` ON CONFLICT (${onConflict}) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}`) : '';
          data = (await run(`INSERT INTO public.${table} AS t (${keys.join(', ')}) VALUES ${vals}${conflict} RETURNING *`, params)).rows;
        } else if (mode === 'update') {
          const filterParams = [...params];
          const sets = [];
          const all = [];
          for (const k of Object.keys(payload)) { if (payload[k] === undefined) continue; all.push(val(payload[k])); sets.push(`${k} = $${all.length}`); }
          const shifted = where.map((c) => c.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + all.length}`));
          data = (await run(`UPDATE public.${table} SET ${sets.join(', ')}${shifted.length ? ` WHERE ${shifted.join(' AND ')}` : ''} RETURNING *`, [...all, ...filterParams])).rows;
        } else {
          data = (await run(`DELETE FROM public.${table}${w} RETURNING *`, params)).rows;
        }
        if (mode !== 'select' && !ret) data = null;
        if (one === 'maybe') return { data: data?.[0] ?? null, error: null };
        if (one === 'single') return data?.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'not one row' } };
        return { data, error: null };
      } catch (e) {
        return { data: null, error: { code: e.code, message: e.message } };
      }
    }
    const q = {
      select(c = '*') { if (mode === 'select') cols = parseCols(c); else ret = true; return q; },
      eq(k, v) { where.push(`${k}::text = ${p(String(v))}`); return q; },
      neq(k, v) { where.push(`${k}::text <> ${p(String(v))}`); return q; },
      gte(k, v) { where.push(`${k} >= ${p(v)}`); return q; },
      lte(k, v) { where.push(`${k} <= ${p(v)}`); return q; },
      in(k, vs) { where.push(`${k}::text = ANY(${p(vs.map(String))}::text[])`); return q; },
      like(k, pat) { where.push(`${k} LIKE ${p(pat)}`); return q; },
      order(k, o = {}) { order = `${order ? `${order},` : ' ORDER BY'} ${k} ${o.ascending === false ? 'DESC' : 'ASC'}`; return q; },
      limit(n) { lim = ` LIMIT ${Number(n)}`; return q; },
      insert(v) { mode = 'insert'; payload = v; return q; },
      upsert(v, o = {}) { mode = 'upsert'; payload = v; onConflict = o.onConflict; ignoreDup = !!o.ignoreDuplicates; return q; },
      update(v) { mode = 'update'; payload = v; return q; },
      delete() { mode = 'delete'; return q; },
      maybeSingle() { one = 'maybe'; return q; },
      single() { one = 'single'; return q; },
      then(a, b) { return exec().then(a, b); },
    };
    return q;
  };

  // PostgREST /rpc/<name>: one SELECT, so one transaction - a raised error rolls all of it back.
  const rpc = async (name, args = {}) => {
    log.push({ table: `rpc:${name}`, op: 'rpc', who });
    const f = rpcFaults.find((x) => x.name === name);
    if (f) rpcFaults = rpcFaults.filter((x) => x !== f);
    if (f?.when === 'before') return { data: null, error: f.error };   // the request never reached the database
    const keys = Object.keys(args).filter((k) => args[k] !== undefined);
    const text = `SELECT public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) AS r`;
    try {
      const res = await run(text, keys.map((k) => val(args[k])));
      if (f?.when === 'after') return { data: null, error: f.error };  // committed; the reply was lost
      return { data: res.rows[0]?.r ?? null, error: null };
    } catch (e) {
      if (f?.when === 'after') return { data: null, error: f.error };
      return { data: null, error: { code: e.code, message: e.message, details: e.detail ?? null, hint: e.hint ?? null } };
    }
  };

  return {
    from,
    rpc,
    auth: {
      getUser: async (t) => {
        const tok = t ?? token;
        return jwts.has(tok) ? { data: { user: { id: jwts.get(tok), email: null } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } };
      },
    },
    functions: {
      invoke: async (name, { body }) => {
        invokes.push({ name, who, body });
        if (name !== 'calculate-tuition') return { data: null, error: { message: `unexpected invoke ${name}` } };
        // calculate-tuition, as far as these functions use it: it prices and
        // saves a missing bill (the price is the fixture's); otherwise it
        // leaves the figures alone. Its own behaviour is invoice-status's.
        // Like functions-js, an HTTP error is RETURNED, not thrown (review N-2).
        if (tuition.fail.has(body.studentId)) return { data: null, error: { name: 'FunctionsHttpError', message: 'scripted failure' } };
        const price = tuition.price.get(body.studentId);
        if (price !== undefined) {
          await sql(`INSERT INTO public.invoices (student_id, month, base_amount, total_amount, status)
                     VALUES ($1, $2, $3, $3, 'issued') ON CONFLICT (student_id, month) DO NOTHING`, [body.studentId, body.month, price]);
        }
        return { data: { totalAmount: price ?? 0 }, error: null };
      },
    },
  };
}
globalThis.__rpCreateClient = (_url, key, opts) => fakeClient(key, opts);
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY };
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
async function load(name) {
  const out = await build({
    entryPoints: [resolve(repo, 'supabase', 'functions', name, 'index.ts')],
    bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
    plugins: [{ name: 'remote-imports', setup(b) {
      b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: 'remote' }));
      b.onLoad({ filter: /.*/, namespace: 'remote' }, (args) => args.path.includes('zod')
        ? { contents: 'export { z } from "zod";', loader: 'js', resolveDir: repo }
        : { contents: 'export const createClient = (...a) => globalThis.__rpCreateClient(...a);', loader: 'js' });
    } }],
  });
  const p = resolve(tmpdir(), `g1.${name}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  await import(pathToFileURL(p).href);
  return captured;
}
const recordFn = await load('record-payment');
const deleteFn = await load('delete-payment');
ok('record-payment and delete-payment bundled from the working tree', typeof recordFn === 'function' && typeof deleteFn === 'function');

async function call(fn, token, body) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fn(new Request('http://localhost/fn', { method: 'POST', headers, body: JSON.stringify(body) }));
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function person(role) {
  const id = randomUUID(), tok = `jwt-${id}`;
  jwts.set(tok, id);
  if (role) await sql('INSERT INTO public.user_roles VALUES ($1, $2)', [id, role]);
  return { id, tok };
}

// ---------------------------------------------------------------- fixture
const ADMIN = await person('admin');
const ADMIN2 = await person('admin');
const TEACHER = await person('teacher');
const PARENT = await person('family');
async function child(name, linked = null) {
  return (await one('INSERT INTO public.students (full_name, linked_user_id) VALUES ($1, $2) RETURNING id', [name, linked])).id;
}
async function bill(sid, month, total, recorded = 0, extra = {}) {
  const status = extra.status ?? (recorded >= total && recorded > 0 ? 'paid' : recorded > 0 ? 'partial' : 'issued');
  return (await one(`INSERT INTO public.invoices (student_id, month, base_amount, discount_amount, total_amount, recorded_payment, paid_amount, status)
                     VALUES ($1, $2, $3, 0, $3, $4, $4, $5) RETURNING id`, [sid, month, total, recorded, status])).id;
}
const billOf = (sid, month) => one('SELECT * FROM public.invoices WHERE student_id = $1 AND month = $2', [sid, month]);
const paymentsOf = (sid) => rows('SELECT * FROM public.payments WHERE student_id = $1 ORDER BY created_at, id', [sid]);
const legsOf = (sid) => rows(`SELECT e.*, a.code::text AS code FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
                               WHERE a.student_id = $1 ORDER BY e.created_at, e.id`, [sid]);
/** Net per account code for a child: debit - credit. */
async function net(sid) {
  const out = {};
  for (const l of await legsOf(sid)) out[l.code] = (out[l.code] ?? 0) + Number(l.debit) - Number(l.credit);
  return out;
}
const balanced = (legs) => {
  const by = new Map();
  for (const l of legs) by.set(l.tx_id, (by.get(l.tx_id) ?? 0) + Number(l.debit) - Number(l.credit));
  return [...by.values()].every((d) => d === 0);
};
/** Everything a request could have written, counted: equal before and after = it wrote nothing. */
const snapshot = () => one(`SELECT (SELECT count(*) FROM public.payments)::int AS payments, (SELECT count(*) FROM public.ledger_entries)::int AS legs,
    (SELECT count(*) FROM public.ledger_accounts)::int AS accounts, (SELECT count(*) FROM public.invoices)::int AS bills,
    (SELECT coalesce(sum(recorded_payment), 0) FROM public.invoices)::text AS recorded,
    (SELECT count(*) FROM public.audit_log)::int AS audit, (SELECT count(*) FROM public.test_write_role)::int AS writes`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const reversalLegs = async (key) => (await rows(`SELECT 1 FROM public.ledger_entries WHERE tx_key LIKE $1`, [`payment-reversal-${key}-%`])).length;
const M = '2026-08', M2 = '2026-09';
const pay = (body, tok = ADMIN.tok) => call(recordFn, tok, { month: M, kind: 'payment', method: 'Cash', occurredAt: '2026-08-10', idempotencyKey: randomUUID(), ...body });
const writesSince = (n) => log.slice(n);
const userClient = (tok) => fakeClient(ANON_KEY, { global: { headers: { Authorization: `Bearer ${tok}` } } });
const rpcArgs = (o) => ({ p_payment_id: randomUUID(), p_student_id: null, p_month: M, p_kind: 'payment', p_amount: 1000, p_method: 'Cash',
  p_occurred_at: '2026-08-10T12:00:00+07:00', p_memo: null, p_expected_recorded: null, ...o });

// =================================================================== 1
console.log('\n1. only an admin, with their own session; nothing written otherwise');
{
  const s = await child('Gate');
  await bill(s, M, 1000000);
  const body = { studentId: s, month: M, kind: 'payment', amount: 100000, method: 'Cash', occurredAt: '2026-08-10', idempotencyKey: randomUUID() };
  const before = log.length, snap0 = await snapshot();
  const r0 = await call(recordFn, null, body);
  const r1 = await call(recordFn, TEACHER.tok, body);
  const r2 = await call(recordFn, PARENT.tok, body);
  const r3 = await call(recordFn, SERVICE_KEY, body);
  const r4 = await call(recordFn, 'jwt-not-a-session', body);
  ok('no Authorization: 401; a teacher: 403; a parent: 403; the service key: 403 (no admin behind it); a forged token: 401',
     r0.status === 401 && r1.status === 403 && r2.status === 403 && r3.status === 403 && r4.status === 401, [r0, r1, r2, r3, r4].map((r) => r.status));
  ok('  none of them wrote anything', log.length === before && (await paymentsOf(s)).length === 0 && Number((await billOf(s, M)).recorded_payment) === 0);
  const bad = [
    { ...body, amount: 0 }, { ...body, amount: -5 }, { ...body, amount: 1.5 }, { ...body, month: '2026-8' }, { ...body, studentId: 'x' },
    { ...body, idempotencyKey: 'not-a-uuid' }, { ...body, kind: 'refund' }, { ...body, method: '' }, { ...body, occurredAt: 'yesterday' },
    { ...body, amount: 500000001 }, { ...body, kind: 'correction', memo: '   ' }, { ...body, month: '2026-13' },
  ];
  const statuses = [];
  for (const b of bad) statuses.push((await call(recordFn, ADMIN.tok, b)).status);
  ok(`12 malformed requests (amount 0 / negative / fractional / too big, bad month x2, student, key, kind, method, date, a correction with no note): all 400`,
     statuses.every((x) => x === 400), statuses);
  ok('  and nothing written by any of them', log.length === before && (await paymentsOf(s)).length === 0);
  const nobody = await call(recordFn, ADMIN.tok, { ...body, studentId: randomUUID() });
  ok('a student that does not exist: 404, nothing written', nobody.status === 404 && log.length === before, nobody);

  // The database function on its own: the same gate, whoever calls it.
  const direct = async (client, o) => client.rpc('record_admin_payment', rpcArgs({ p_student_id: s, ...o }));
  const dt = await direct(userClient(TEACHER.tok));
  const dp = await direct(userClient(PARENT.tok));
  const da = await direct(fakeClient(ANON_KEY));
  const ds = await direct(fakeClient(SERVICE_KEY));
  ok('record_admin_payment called directly: a teacher and a parent refused RP403; anon and the service key cannot execute it (42501)',
     dt.error?.code === 'RP403' && dp.error?.code === 'RP403' && da.error?.code === '42501' && ds.error?.code === '42501', [dt.error, dp.error, da.error, ds.error]);
  const admin = userClient(ADMIN.tok);
  const outOfRange = [
    await direct(admin, { p_amount: 0 }), await direct(admin, { p_amount: 500000001 }), await direct(admin, { p_kind: 'refund' }),
    await direct(admin, { p_month: '2026-8' }), await direct(admin, { p_method: '  ' }), await direct(admin, { p_kind: 'correction', p_memo: ' ' }),
    await direct(admin, { p_expected_recorded: -1 }), await direct(admin, { p_occurred_at: null }), await direct(admin, { p_memo: 'x'.repeat(501) }),
  ];
  ok('  an admin with values out of range: 22023 for each of 9 (it does not rely on the edge function\'s check)', outOfRange.every((r) => r.error?.code === '22023'), outOfRange.map((r) => r.error));
  const noKid = await direct(admin, { p_student_id: randomUUID() });
  const noBill = await direct(admin, { p_month: '2027-01' });
  ok('  no such student: RP404; no bill for the month: RP424', noKid.error?.code === 'RP404' && noBill.error?.code === 'RP424', [noKid.error, noBill.error]);
  ok('  and none of these wrote anything', same(await snapshot(), snap0), { before: snap0, after: await snapshot() });
}

// =================================================================== 2
console.log('\n2. a payment writes the payments row, two balanced legs and the bill - as the admin, in one call');
{
  const s = await child('Anh');
  const inv = await bill(s, M, 1000000);
  await bill(s, M2, 1000000);
  const key = randomUUID();
  const w0 = log.length, i0 = invokes.length;
  const r = await call(recordFn, ADMIN.tok, { studentId: s, month: M, kind: 'payment', amount: 400000, method: 'Cash',
    occurredAt: '2026-07-28', memo: 'paid at the desk', idempotencyKey: key });
  ok('200, and the answer says what the bill records before and after', r.status === 200 && r.body?.success && r.body.paymentId === key
     && r.body.recordedBefore === 0 && r.body.recordedAfter === 400000 && r.body.ledgerAccount === 'CASH' && r.body.invoiceId === inv, r);
  const ps = await paymentsOf(s);
  ok('one payments row: id = the screen\'s key, amount, method as labelled, the receipt date, the memo, created_by the admin',
     ps.length === 1 && ps[0].id === key && Number(ps[0].amount) === 400000 && ps[0].method === 'Cash' && ps[0].memo === 'paid at the desk'
     && ps[0].created_by === ADMIN.id && new Date(ps[0].occurred_at).toISOString() === '2026-07-28T05:00:00.000Z', ps);
  const legs = await legsOf(s);
  const cash = legs.find((l) => l.code === 'CASH'), ar = legs.find((l) => l.code === 'AR');
  ok('two legs in one transaction: DR CASH 400,000, CR AR 400,000, balanced, created_by the admin',
     legs.length === 2 && cash && ar && cash.tx_id === ar.tx_id && Number(cash.debit) === 400000 && Number(cash.credit) === 0
     && Number(ar.credit) === 400000 && Number(ar.debit) === 0 && balanced(legs) && legs.every((l) => l.created_by === ADMIN.id), legs);
  ok(`  the cash leg keyed record-payment-<payment>-<student>, the AR leg unkeyed (as every payment path)`,
     cash?.tx_key === `record-payment-${key}-${s}` && ar?.tx_key === null, legs.map((l) => l.tx_key));
  ok('  both legs on the CONFIRMED tuition month (2026-08), not the receipt month (July), and dated by the receipt',
     legs.every((l) => l.month === M && new Date(l.occurred_at).toISOString() === '2026-07-28T05:00:00.000Z'), legs.map((l) => [l.month, l.occurred_at]));
  const b = await billOf(s, M);
  ok('the bill: recorded_payment 400,000, partial (the one rule), paid_amount moved with it, updated_by the admin, the next month untouched',
     Number(b.recorded_payment) === 400000 && b.status === 'partial' && b.id === inv && Number(b.paid_amount) === 400000 && b.updated_by === ADMIN.id
     && Number((await billOf(s, M2)).recorded_payment) === 0, b);
  ok('  the carry follows: carry_out_debt 600,000, and the next month\'s carry_in_debt 600,000 (the carry trigger)',
     Number(b.carry_out_debt) === 600000 && Number((await billOf(s, M2)).carry_in_debt) === 600000);
  const audit = await rows(`SELECT * FROM public.audit_log WHERE action = 'record_payment' AND entity_id = $1`, [inv]);
  ok('an audit row record_payment by the admin, naming the payment and ledger transaction',
     audit.length === 1 && audit[0].actor_user_id === ADMIN.id && audit[0].diff.payment_id === key && audit[0].diff.ledger_tx_id === cash?.tx_id
     && audit[0].diff.new_recorded_payment === 400000 && audit[0].diff.via === 'record-payment', audit);
  const writes = writesSince(w0);
  ok('the function made ONE call that writes - record_admin_payment, with the admin\'s own session - and no table write of its own',
     writes.length === 1 && writes[0].table === 'rpc:record_admin_payment' && writes[0].who === 'user', writes);
  const roleLog = await rows(`SELECT tbl, op, role, uid FROM public.test_write_role WHERE row_id = ANY($1::text[]) OR (tbl = 'ledger_entries' AND row_id = ANY($2::text[]))`,
    [[key, inv], legs.map((l) => l.id)]);
  ok('  in the database every payment, leg and bill write was made by role authenticated as the admin (invoker: row security on), none by a definer or the service role',
     roleLog.filter((x) => x.tbl === 'payments' && x.op === 'insert').length === 1 && roleLog.filter((x) => x.tbl === 'ledger_entries').length === 2
     && roleLog.some((x) => x.tbl === 'invoices' && x.op === 'update')
     && roleLog.filter((x) => x.tbl !== 'invoices' || x.role === 'authenticated').every((x) => x.role === 'authenticated' && x.uid === ADMIN.id)
     && roleLog.filter((x) => x.tbl === 'invoices' && x.role === 'authenticated').length === 1, roleLog);
  ok('  calculate-tuition asked once, afterwards, to refresh the bill (the internal call every payment path makes)',
     invokes.slice(i0).length === 1 && invokes[i0].name === 'calculate-tuition' && invokes[i0].body.month === M, invokes.slice(i0));

  const r2 = await pay({ studentId: s, amount: 600000, method: 'Bank Transfer' });
  const b2 = await billOf(s, M);
  ok('a second payment, by bank transfer, covers the bill: paid, 1,000,000 recorded, DR BANK 600,000',
     r2.status === 200 && Number(b2.recorded_payment) === 1000000 && b2.status === 'paid' && (await net(s)).BANK === 600000 && (await net(s)).AR === -1000000, { r2, b2 });
}

// =================================================================== 3
console.log('\n3. CASH or BANK, whatever the case of the label');
{
  const s = await child('Methods');
  await bill(s, M, 10000000);
  const cases = [['cash', 'CASH'], ['CASH', 'CASH'], [' Cash ', 'CASH'], ['Cash', 'CASH'], ['Bank Transfer', 'BANK'], ['bank transfer', 'BANK'], ['Card', 'BANK'], ['Other', 'BANK']];
  const got = [];
  for (const [method] of cases) got.push((await pay({ studentId: s, amount: 1000, method })).body?.ledgerAccount);
  ok(`${cases.map(([m, c]) => `'${m}' -> ${c}`).join(', ')}`, cases.every(([, c], i) => got[i] === c), got);
  const n = await net(s);
  ok('  and the ledger agrees: CASH 4,000, BANK 4,000, AR -8,000', n.CASH === 4000 && n.BANK === 4000 && n.AR === -8000, n);
}

// =================================================================== 4
console.log('\n4. a correction takes money off - never below 0, never without a note');
{
  const s = await child('Correct');
  const inv = await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 700000 });
  const key = randomUUID();
  const r = await pay({ studentId: s, kind: 'correction', amount: 200000, memo: 'entered 200,000 too much', idempotencyKey: key });
  const n = await net(s);
  const p = (await paymentsOf(s)).find((x) => x.id === key);
  ok('200: recorded 700,000 -> 500,000, and the ledger nets CASH 500,000 / AR -500,000',
     r.status === 200 && r.body.recordedBefore === 700000 && r.body.recordedAfter === 500000 && n.CASH === 500000 && n.AR === -500000
     && Number((await billOf(s, M)).recorded_payment) === 500000, { r, n });
  const ck = (await legsOf(s)).find((l) => l.tx_key === `record-payment-${key}-${s}`);
  const ca = (await legsOf(s)).find((l) => l.tx_id === ck?.tx_id && l.id !== ck?.id);
  ok('  its legs: DR AR 200,000, CR CASH 200,000 (one transaction, balanced); its payments row is -200,000 with the note; audit payment_correction',
     ck && ca && Number(ck.credit) === 200000 && ca.code === 'AR' && Number(ca.debit) === 200000 && balanced(await legsOf(s))
     && p && Number(p.amount) === -200000 && p.memo === 'entered 200,000 too much'
     && (await rows(`SELECT 1 FROM public.audit_log WHERE action = 'payment_correction' AND entity_id = $1`, [inv])).length === 1, { ck, ca, p });
  const s0 = await snapshot();
  const below = await pay({ studentId: s, kind: 'correction', amount: 500001, memo: 'too much' });
  ok('a correction of 500,001 on a bill recording 500,000: 409, nothing written', below.status === 409 && same(await snapshot(), s0)
     && Number((await billOf(s, M)).recorded_payment) === 500000 && /below 0/.test(below.body?.error ?? ''), below);
  const toZero = await pay({ studentId: s, kind: 'correction', amount: 500000, memo: 'all of it was a mistake' });
  const bz = await billOf(s, M);
  ok('a correction of exactly what is recorded: 0 recorded, issued again (the one rule), paid_amount floored at 0',
     toZero.status === 200 && Number(bz.recorded_payment) === 0 && bz.status === 'issued' && Number(bz.paid_amount) === 0, bz);
  // paid_amount is cumulative and may hold less than recorded_payment (history): floored at 0, never negative.
  const pf = await child('PaidFloor');
  const pfi = await bill(pf, M, 1000000);
  await pay({ studentId: pf, amount: 300000 });
  await sql('UPDATE public.invoices SET paid_amount = 100000 WHERE id = $1', [pfi]);
  const rpf = await pay({ studentId: pf, kind: 'correction', amount: 300000, memo: 'wrong child' });
  const bpf = await billOf(pf, M);
  ok('  a correction larger than the bill\'s paid_amount: paid_amount floored at 0 (not -200,000), recorded 0', rpf.status === 200
     && Number(bpf.paid_amount) === 0 && Number(bpf.recorded_payment) === 0, { rpf, bpf });
  const s2 = await child('NoBill');
  tuition.price.set(s2, 900000);
  const w1 = log.length, i1 = invokes.length;
  const nb = await pay({ studentId: s2, kind: 'correction', amount: 1000, memo: 'nothing to correct' });
  ok('a correction for a month with no bill: 409, no bill created, nothing written, calculate-tuition not asked',
     nb.status === 409 && log.length === w1 && invokes.length === i1 && !(await billOf(s2, M)), nb);
}

// =================================================================== 5
console.log('\n5. the label rule, frozen bills and the D4 floors do not get in the way');
{
  const s = await child('Credit');
  await bill(s, M, 500000, 0, { status: 'credit' });
  const r = await pay({ studentId: s, amount: 500000 });
  const b = await billOf(s, M);
  ok('an admin\'s \'credit\' label is kept when money comes in (labelAfterPayment)', r.status === 200 && b.status === 'credit' && Number(b.recorded_payment) === 500000, b);
  const rc0 = await pay({ studentId: s, kind: 'correction', amount: 500000, memo: 'returned' });
  ok('  and when money goes out', rc0.status === 200 && (await billOf(s, M)).status === 'credit');

  const f = await child('Frozen');
  const fid = await bill(f, M, 800000);
  await sql(`UPDATE public.invoices SET tuition_frozen = true WHERE id = $1`, [fid]);
  const before = await billOf(f, M);
  const rf = await pay({ studentId: f, amount: 300000 });
  const after = await billOf(f, M);
  ok('a FROZEN bill takes a payment (a freeze locks what is charged, not what is paid); its charged figures stay',
     rf.status === 200 && after.tuition_frozen && Number(after.recorded_payment) === 300000 && after.total_amount === before.total_amount
     && after.base_amount === before.base_amount && after.discount_amount === before.discount_amount, { rf, after });
  const rc = await pay({ studentId: f, kind: 'correction', amount: 100000, memo: 'part refunded in cash' });
  ok('  and a correction on it (the frozen-bill guards do not fire: it stays frozen, same child and month)', rc.status === 200 && Number((await billOf(f, M)).recorded_payment) === 200000, rc);

  const fl = await child('Floor');
  await bill(fl, M, 400000);
  await pay({ studentId: fl, amount: 400000 });
  const rr = await pay({ studentId: fl, kind: 'correction', amount: 400000, memo: 'payment was for another child' });
  const floor = await one('SELECT * FROM public.invoice_state_floor WHERE student_id = $1 AND month = $2', [fl, M]);
  ok('a correction that un-pays a paid bill is let through; the D4 bill floor keeps that it was paid (max 400,000, ever_paid)',
     rr.status === 200 && Number((await billOf(fl, M)).recorded_payment) === 0 && floor?.ever_paid === true && Number(floor?.max_recorded_payment) === 400000, { rr, floor });

  // The label against the month's payable: carry-in debt must be covered too.
  const cd = await child('CarryDebt');
  await bill(cd, '2026-07', 300000);
  await bill(cd, M, 500000);
  const rd = await pay({ studentId: cd, amount: 500000 });
  const bd = await billOf(cd, M);
  ok('a payment of the month\'s charge with 300,000 debt carried in: the function itself labels it partial, not paid (invoice_paid_label over charge + carry-in debt)',
     rd.status === 200 && rd.body?.status === 'partial' && Number(bd.carry_in_debt) === 300000 && bd.status === 'partial', { rd, bd });
  const cc = await child('CarryCredit');
  await bill(cc, '2026-07', 300000);
  await bill(cc, M, 500000);
  await pay({ studentId: cc, month: '2026-07', amount: 800000 });
  const rcc = await pay({ studentId: cc, amount: 1000 });
  ok('  and with 500,000 credit carried in that covers the month, a small payment labels it paid', rcc.status === 200 && rcc.body?.status === 'paid'
     && (await billOf(cc, M)).status === 'paid', rcc);
}

// =================================================================== 6
console.log('\n6. a month with no bill yet: calculate-tuition makes it first, or nothing is written');
{
  const s = await child('Fresh');
  tuition.price.set(s, 1200000);
  const i0 = invokes.length;
  const r = await pay({ studentId: s, amount: 1200000 });
  const b = await billOf(s, M);
  ok('the bill is created by calculate-tuition (never from the screen\'s figures), then paid: paid, 1,200,000',
     r.status === 200 && b && b.total_amount === 1200000 && Number(b.recorded_payment) === 1200000 && b.status === 'paid'
     && invokes.slice(i0).filter((x) => x.name === 'calculate-tuition' && x.who === 'service').length === 2, { r, b });
  const s2 = await child('Unpriced');
  tuition.fail.add(s2);
  const w0 = log.length;
  const r2 = await pay({ studentId: s2, amount: 100000 });
  ok('calculate-tuition answers an error (returned, not thrown): 409 "try again" naming it, nothing written (review N-2)',
     r2.status === 409 && log.length === w0 && (await paymentsOf(s2)).length === 0 && /calculate-tuition: scripted failure/.test(r2.body?.error ?? ''), r2);
  const s3 = await child('RefreshFails');
  await bill(s3, M, 500000);
  tuition.fail.add(s3);
  const r3 = await pay({ studentId: s3, amount: 100000 });
  ok('  the refresh after a payment fails: the payment stands (200), and the answer says the refresh failed', r3.status === 200
     && r3.body?.refreshFailed === 'scripted failure' && Number((await billOf(s3, M)).recorded_payment) === 100000, r3);
}

// =================================================================== 7
console.log('\n7. the screen\'s figure: an edit against a stale screen writes nothing');
{
  const s = await child('Stale');
  await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 300000 });
  const s0 = await snapshot();
  const r = await pay({ studentId: s, amount: 100000, expectedRecorded: 0 });
  ok('expectedRecorded 0 while the bill records 300,000: 409 conflict, nothing written', r.status === 409 && r.body?.conflict === true && same(await snapshot(), s0), r);
  const r2 = await pay({ studentId: s, kind: 'correction', amount: 100000, memo: 'fix', expectedRecorded: 300000 });
  ok('  with the right figure it goes through', r2.status === 200 && Number((await billOf(s, M)).recorded_payment) === 200000, r2);
}

// =================================================================== 8
console.log('\n8. a double click (or a retry) pays once');
{
  const s = await child('Double');
  await bill(s, M, 1000000);
  const key = randomUUID();
  const body = { studentId: s, amount: 250000, idempotencyKey: key };
  const [a, b] = await Promise.all([pay(body), pay(body)]);
  const statuses = [a.status, b.status].sort();
  const dup = a.status === 409 ? a : b;
  ok('two requests with one key at the same moment: one 200, one 409 duplicate', statuses[0] === 200 && statuses[1] === 409 && dup.body?.duplicate === true, [a, b]);
  ok('  recorded once: one payments row, two legs, 250,000 on the bill', (await paymentsOf(s)).length === 1 && (await legsOf(s)).length === 2
     && Number((await billOf(s, M)).recorded_payment) === 250000);
  const s0 = await snapshot();
  const again = await pay(body);
  ok('the same key later (a retry after a lost reply): 409 duplicate, nothing written', again.status === 409 && again.body?.duplicate && same(await snapshot(), s0), again);
  const three = await Promise.all([1, 2, 3].map(() => pay({ studentId: s, amount: 10000, idempotencyKey: key })));
  ok('  three more at once with that key: all refused, still once', three.every((x) => x.status === 409) && (await paymentsOf(s)).length === 1
     && Number((await billOf(s, M)).recorded_payment) === 250000, three.map((x) => x.status));
  const other = await child('DoubleOther');
  await bill(other, M, 1000000);
  const s1 = await snapshot();
  const cross = await pay({ studentId: other, amount: 250000, idempotencyKey: key });
  ok('  that key on ANOTHER child: refused as a duplicate too (the key is the payment), nothing written', cross.status === 409 && cross.body?.duplicate && same(await snapshot(), s1), cross);
  const stale = await pay({ ...body, expectedRecorded: 0 });
  ok('  a retry with the same key and the stale screen figure: reported as a duplicate (already recorded), not as "the bill changed"',
     stale.status === 409 && stale.body?.duplicate === true && !stale.body?.conflict, stale);
}

// =================================================================== 9
console.log('\n9. two payments on one bill at the same moment');
{
  const s = await child('Busy');
  const inv = await bill(s, M, 1000000);
  const w0 = (await one('SELECT count(*)::int AS n FROM public.test_write_role')).n;
  const [a, b] = await Promise.all([pay({ studentId: s, amount: 300000 }), pay({ studentId: s, amount: 200000, method: 'Bank Transfer' })]);
  const n = await net(s);
  ok('both 200; the bill records 500,000 (neither overwrote the other)', a.status === 200 && b.status === 200
     && Number((await billOf(s, M)).recorded_payment) === 500000, [a, b]);
  const billWrites = await rows(`SELECT role FROM public.test_write_role WHERE id > $1 AND tbl = 'invoices' AND op = 'update' AND row_id = $2 AND role = 'authenticated'`, [w0, inv]);
  ok('  two bill writes, one per payment, each a compare-and-set under the bill\'s row lock (no re-read and retry needed)', billWrites.length === 2, billWrites);
  ok('  two payments rows, four legs, CASH 300,000 + BANK 200,000 = AR -500,000', (await paymentsOf(s)).length === 2 && (await legsOf(s)).length === 4
     && n.CASH === 300000 && n.BANK === 200000 && n.AR === -500000, n);

  // Review B-1, case 1: two screens both showing 0.
  const s2 = await child('BusyScreens');
  await bill(s2, M, 1000000);
  const [c, d] = await Promise.all([pay({ studentId: s2, amount: 300000, expectedRecorded: 0 }), pay({ studentId: s2, amount: 200000, expectedRecorded: 0 })]);
  const won = c.status === 200 ? c : d, lost = c.status === 200 ? d : c;
  const n2 = await net(s2);
  ok('two screens both showing 0 (expectedRecorded 0): one lands, the other is refused as changed (409 conflict) - as the screens did before',
     won.status === 200 && lost.status === 409 && lost.body?.conflict === true && Number((await billOf(s2, M)).recorded_payment) === won.body.amount, [c, d]);
  ok('  the refused one wrote NOTHING: no payments row, no legs, no reversal legs, nothing to undo (net = the winner only)',
     (await paymentsOf(s2)).length === 1 && (await legsOf(s2)).length === 2 && (n2.CASH ?? 0) === won.body.amount && n2.AR === -won.body.amount
     && (await reversalLegs(lost.body.paymentId)) === 0 && !(await paymentsOf(s2)).some((p) => p.id === lost.body.paymentId), { n2, lost });

  // Review B-1, case 2: two corrections at once, each fine alone, together below 0.
  const s3 = await child('BusyCorrections');
  await bill(s3, M, 1000000);
  await pay({ studentId: s3, amount: 300000 });
  const [e, g] = await Promise.all([pay({ studentId: s3, kind: 'correction', amount: 200000, memo: 'one' }),
                                    pay({ studentId: s3, kind: 'correction', amount: 200000, memo: 'two' })]);
  const n3 = await net(s3);
  const loser = e.status === 200 ? g : e;
  ok('two corrections of 200,000 at once on 300,000 recorded: one lands, the other is refused (never below 0) and wrote nothing',
     [e.status, g.status].sort().join() === '200,409' && /below 0/.test(loser.body?.error ?? '') && Number((await billOf(s3, M)).recorded_payment) === 100000
     && n3.CASH === 100000 && n3.AR === -100000 && (await paymentsOf(s3)).length === 2 && (await legsOf(s3)).length === 4 && balanced(await legsOf(s3))
     && (await reversalLegs(loser.body.paymentId)) === 0, { e, g, n3 });
}

// =================================================================== 10
console.log('\n10. a failure anywhere inside the transaction leaves NOTHING (no undo, no delete)');
{
  const s = await child('Fails');
  await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 100000 });
  const ledgerFor = async (k) => (await rows(`SELECT 1 FROM public.ledger_entries WHERE tx_key LIKE $1`, [`%${k}%`])).length;

  // Review B-1, case 3: the bill write fails after the legs.
  const key = randomUUID();
  const s0 = await snapshot();
  const r = await withFault({ name: 'invoices.update' }, () => pay({ studentId: s, amount: 300000, idempotencyKey: key }));
  ok('the bill write fails (a statement timeout inside the transaction): 500 "Nothing was recorded", not halfDone, not undone',
     r.status === 500 && /^Nothing was recorded/.test(r.body?.error ?? '') && !r.body?.halfDone && !r.body?.undone && !r.body?.unknown, r);
  ok('  everything rolled back: no payments row, no legs (none keyed, no reversals), the bill as it was (100,000), no audit row - the counts are unchanged',
     same(await snapshot(), s0) && !(await paymentsOf(s)).some((p) => p.id === key) && (await ledgerFor(key)) === 0
     && Number((await billOf(s, M)).recorded_payment) === 100000, { before: s0, after: await snapshot() });
  const r1 = await pay({ studentId: s, amount: 300000, idempotencyKey: key });
  ok('  nothing was written, so the same key then records the payment once', r1.status === 200 && Number((await billOf(s, M)).recorded_payment) === 400000
     && (await paymentsOf(s)).filter((p) => p.id === key).length === 1 && (await ledgerFor(key)) === 1, r1);

  // Review B-1, case 4: the ledger insert fails.
  const key2 = randomUUID();
  const s1 = await snapshot();
  const r2 = await withFault({ name: 'ledger_entries.insert', code: '08006', message: 'connection failure' }, () => pay({ studentId: s, amount: 50000, idempotencyKey: key2 }));
  ok('the ledger insert fails: 500, no payments row, no legs, the bill untouched - unchanged counts', r2.status === 500 && same(await snapshot(), s1)
     && !(await paymentsOf(s)).some((p) => p.id === key2) && Number((await billOf(s, M)).recorded_payment) === 400000, r2);
  const r3 = await pay({ studentId: s, amount: 50000, idempotencyKey: key2 });
  ok('  and the retry with that key is NOT refused as "already submitted": it records once', r3.status === 200 && Number((await billOf(s, M)).recorded_payment) === 450000
     && (await paymentsOf(s)).filter((p) => p.id === key2).length === 1, r3);

  // The very last write fails: the payment row, the legs and the bill written before it go too.
  const key3 = randomUUID();
  const s2 = await snapshot();
  const r4 = await withFault({ name: 'audit_log.insert', only_action: 'record_payment' }, () => pay({ studentId: s, amount: 70000, idempotencyKey: key3 }));
  ok('the audit row (the last write) fails: 500, and the payments row, both legs and the bill written before it are rolled back',
     r4.status === 500 && same(await snapshot(), s2) && Number((await billOf(s, M)).recorded_payment) === 450000 && (await ledgerFor(key3)) === 0, r4);
  const key4 = randomUUID();
  const s3 = await snapshot();
  const r5 = await withFault({ name: 'payments.insert' }, () => pay({ studentId: s, amount: 70000, idempotencyKey: key4 }));
  ok('the payments insert fails: 500, nothing written', r5.status === 500 && same(await snapshot(), s3), r5);

  // Live's delete trigger is on, and nothing in this path needs a delete.
  const p0 = (await paymentsOf(s))[0];
  const del = await tryIt(() => asRole('user', ADMIN.id, 'DELETE FROM public.payments WHERE id = $1', [p0.id]));
  ok('live\'s prevent_client_payment_deletion is on: an admin\'s own DELETE of a payment is refused (so an undo could never have worked)',
     /Direct payment deletion is not allowed/.test(del?.message ?? ''), del);
  const appendOnly = await tryIt(() => sql(`UPDATE public.ledger_entries SET memo = 'x' WHERE tx_key = $1`, [`record-payment-${key}-${s}`]));
  const delLeg = await tryIt(() => sql(`DELETE FROM public.ledger_entries WHERE tx_key = $1`, [`record-payment-${key}-${s}`]));
  ok('the ledger stays append-only: UPDATE and DELETE are refused (HC130, G-11)', appendOnly?.code === 'HC130' && delLeg?.code === 'HC130', { appendOnly, delLeg });
}

// =================================================================== 10b
console.log('\n10b. a reply that never arrives (review M-3): the outcome is reported unknown, and the same key cannot pay twice');
{
  const s = await child('LostReply');
  await bill(s, M, 1000000);
  // Committed in the database, the reply lost on the way back to the function.
  const key = randomUUID();
  rpcFaults.push({ name: 'record_admin_payment', when: 'after', error: { message: 'TypeError: fetch failed', details: '', hint: '', code: '' } });
  const r = await pay({ studentId: s, amount: 400000, idempotencyKey: key });
  ok('the database committed but its reply was lost: 503 unknown (not "nothing was recorded"), naming the payment',
     r.status === 503 && r.body?.unknown === true && r.body?.paymentId === key && !/^Nothing was recorded/.test(r.body?.error ?? ''), r);
  ok('  and it IS recorded, whole: one payments row, two legs, 400,000 on the bill', (await paymentsOf(s)).length === 1 && (await legsOf(s)).length === 2
     && Number((await billOf(s, M)).recorded_payment) === 400000);
  const s0 = await snapshot();
  const retry = await pay({ studentId: s, amount: 400000, idempotencyKey: key, expectedRecorded: 0 });
  ok('  the retry with the same key: 409 duplicate, nothing more', retry.status === 409 && retry.body?.duplicate === true && same(await snapshot(), s0), retry);
  // Never reached the database.
  const key2 = randomUUID();
  rpcFaults.push({ name: 'record_admin_payment', when: 'before', error: { message: 'TypeError: fetch failed', details: '', hint: '', code: '' } });
  const s1 = await snapshot();
  const r2 = await pay({ studentId: s, amount: 100000, idempotencyKey: key2 });
  ok('the request never reached the database: 503 unknown too, and nothing was written', r2.status === 503 && r2.body?.unknown === true && same(await snapshot(), s1), r2);
  const r3 = await pay({ studentId: s, amount: 100000, idempotencyKey: key2 });
  ok('  the retry with the same key records it once', r3.status === 200 && Number((await billOf(s, M)).recorded_payment) === 500000
     && (await paymentsOf(s)).filter((p) => p.id === key2).length === 1, r3);
  // A database error (it answered): rolled back, so definite.
  rpcFaults.push({ name: 'record_admin_payment', when: 'before', error: { message: 'Could not find the function public.record_admin_payment', code: 'PGRST202' } });
  const r4 = await pay({ studentId: s, amount: 1000 });
  ok('a PostgREST error with a code (e.g. the function not installed): 500 "Nothing was recorded" (definite, not unknown)',
     r4.status === 500 && /^Nothing was recorded/.test(r4.body?.error ?? '') && !r4.body?.unknown, r4);
}

// =================================================================== 11
console.log('\n11. delete-payment takes a record-payment payment back from all three');
{
  const s = await child('Delete');
  await bill(s, M, 1000000);
  await pay({ studentId: s, amount: 200000 });
  const key = randomUUID();
  await pay({ studentId: s, amount: 300000, idempotencyKey: key, method: 'Bank Transfer' });
  const r = await call(deleteFn, ADMIN.tok, { paymentId: key, deleteReason: 'entered on the wrong child' });
  const legs = await legsOf(s);
  const n = await net(s);
  ok('200: the bill back to 200,000, the payments row gone (delete-payment deletes as the service role, which live\'s trigger lets through), a deletion record kept',
     r.status === 200 && Number((await billOf(s, M)).recorded_payment) === 200000
     && !(await paymentsOf(s)).some((p) => p.id === key) && (await rows('SELECT 1 FROM public.payment_deletions WHERE payment_id = $1', [key])).length === 1, r);
  ok('  both legs reversed by two new legs (BANK nets 0, AR nets -200,000), balanced', legs.filter((l) => (l.tx_key ?? '').startsWith(`payment-reversal-${key}-`)).length === 2
     && (n.BANK ?? 0) === 0 && n.CASH === 200000 && n.AR === -200000 && balanced(legs), n);
  const twice = await call(deleteFn, ADMIN.tok, { paymentId: key, deleteReason: 'again' });
  ok('  deleting it again: refused (no payment), nothing changed', twice.status >= 400 && Number((await billOf(s, M)).recorded_payment) === 200000, twice);
  const s0 = await snapshot();
  const reuse = await pay({ studentId: s, amount: 300000, idempotencyKey: key });
  ok('  the deleted payment\'s key sent again (a stale screen\'s retry): 409, never recorded a second time', reuse.status === 409 && same(await snapshot(), s0)
     && /deleted or reversed/.test(reuse.body?.error ?? ''), reuse);

  const ckey = randomUUID();
  await pay({ studentId: s, kind: 'correction', amount: 50000, memo: 'thought it was too much', idempotencyKey: ckey });
  const rc = await call(deleteFn, ADMIN.tok, { paymentId: ckey, deleteReason: 'the correction was the mistake' });
  const nc = await net(s);
  ok('deleting a CORRECTION puts its money back on the bill: 150,000 -> 200,000, ledger CASH 200,000 / AR -200,000',
     rc.status === 200 && Number((await billOf(s, M)).recorded_payment) === 200000 && nc.CASH === 200000 && nc.AR === -200000 && balanced(await legsOf(s)), { rc, nc });

  const s2 = await child('DeleteGuard');
  await bill(s2, M, 1000000);
  const k2 = randomUUID();
  await pay({ studentId: s2, amount: 400000, idempotencyKey: k2 });
  await pay({ studentId: s2, kind: 'correction', amount: 300000, memo: 'part of it was for the sibling' });
  const w0 = log.length;
  const guarded = await call(deleteFn, ADMIN.tok, { paymentId: k2, deleteReason: 'test' });
  ok('a payment whose bill now records less than it put there: refused (409), nothing written', guarded.status === 409 && log.length === w0
     && Number((await billOf(s2, M)).recorded_payment) === 100000, guarded);
}

// =================================================================== 12
console.log('\n12. CHECK-money-invariants.sql over what the functions wrote: M01 / M03 / M04 stay 0');
const checkSrc = readFileSync(join(repo, 'scripts', 'pgtest', 'money-invariants-check.test.mjs'), 'utf8').replace(/\r\n/g, '\n');
const CHECK_SCHEMA = checkSrc.match(/const SCHEMA = `([\s\S]*?)`;\n/)[1];
const CHECK_SQL = readFileSync(join(repo, 'scripts', 'CHECK-money-invariants.sql'), 'utf8');
async function invariants() {
  const c = new PGlite();
  await c.exec(CHECK_SCHEMA);
  const t = migText('20261113090000_invoice_paid_label.sql');
  const a = t.indexOf('CREATE OR REPLACE FUNCTION public.invoice_paid_label');
  await c.exec(t.slice(a, t.indexOf('$function$;', a) + '$function$;'.length));
  for (const table of ['invoices', 'payments', 'payment_allocations', 'ledger_accounts', 'ledger_entries']) {
    const cols = (await c.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table])).rows.map((r) => r.column_name);
    const src = await rows(`SELECT ${cols.map((x) => `t.${x}`).join(', ')} FROM public.${table} t`);
    if (src.length) await c.query(`INSERT INTO public.${table} SELECT * FROM json_populate_recordset(NULL::public.${table}, $1::json)`, [JSON.stringify(src)]);
  }
  const out = Object.fromEntries((await c.query(CHECK_SQL)).rows.map((r) => [r.check_id, Number(r.violations)]));
  await c.close();
  return out;
}
{
  const inv = await invariants();
  const counts = await one(`SELECT (SELECT count(*) FROM public.payments)::int AS p, (SELECT count(*) FROM public.ledger_entries)::int AS l,
                                   (SELECT count(*) FROM public.invoices WHERE recorded_payment > 0)::int AS b`);
  ok(`after every case above, faults and lost replies included (${counts.p} payments, ${counts.l} legs, ${counts.b} bills with money): M01 0 (no unbalanced transaction), M03 0 (no bill shows more than the ledger), M04 0 (no ledger cash off a bill), M08 0`,
     inv.M01 === 0 && inv.M03 === 0 && inv.M04 === 0 && inv.M08 === 0 && counts.p >= 25, { inv, counts });
  // Control: the write the screens used to make (recorded_payment only) is what M03 counts.
  const s = await child('Legacy');
  await bill(s, M, 500000);
  await sql(`UPDATE public.invoices SET recorded_payment = 200000 WHERE student_id = $1 AND month = $2`, [s, M]);
  const legacy = await invariants();
  ok('  control: one bill paid the old way (recorded_payment only, no payment, no legs) is caught: M03 1, M01 / M04 still 0',
     legacy.M03 === 1 && legacy.M01 === 0 && legacy.M04 === 0, legacy);
  await sql(`UPDATE public.invoices SET recorded_payment = 0 WHERE student_id = $1 AND month = $2`, [s, M]);
}

// =================================================================== 13
console.log('\n13. no payment is on one record and not the others (what M01-M04 cannot see, review B-1)');
{
  // Every child in this suite was paid only through record-payment (and
  // delete-payment): for each, the payments rows, the bill and the AR ledger
  // must say the same, and every payments row must have its keyed leg.
  const perChild = await rows(`
    SELECT s.full_name,
      (SELECT coalesce(sum(p.amount), 0) FROM public.payments p WHERE p.student_id = s.id)::text AS paid_rows,
      (SELECT coalesce(sum(i.recorded_payment), 0) FROM public.invoices i WHERE i.student_id = s.id)::text AS on_bills,
      (SELECT coalesce(sum(e.credit - e.debit), 0) FROM public.ledger_entries e JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE a.student_id = s.id AND a.code = 'AR')::text AS ar_credit
    FROM public.students s`);
  const off = perChild.filter((r) => !(r.paid_rows === r.on_bills && r.on_bills === r.ar_credit));
  ok(`for each of ${perChild.length} children: sum of payments rows = money on the bills = AR credited`, off.length === 0, off);
  const orphans = await rows(`SELECT p.id FROM public.payments p
    WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries e WHERE e.tx_key = 'record-payment-' || p.id::text || '-' || p.student_id::text)`);
  ok('  no payments row without its record-payment ledger leg (an orphan like the review found cannot be made)', orphans.length === 0, orphans);
}

// =================================================================== 14
console.log('\n14. the screens and the function, statically');
{
  const read = (f) => readFileSync(join(repo, f), 'utf8').replace(/\r\n/g, '\n');
  const screens = ['RecordPaymentDialog', 'QuickPayPanel', 'BatchPaymentDialog', 'RecordedPaymentManager'].map((n) => `src/components/admin/${n}.tsx`);
  const bad = screens.filter((f) => { const t = read(f); return !/recordPayment\(supabase,/.test(t) || /setRecordedPayment|addToRecordedPayment|from\(\s*["']invoices["']\s*\)\s*\.(update|insert|upsert)|from\(\s*["']audit_log["']\s*\)\s*\.insert/.test(t); });
  // (recorded_payment still appears in their react-query cache patches: the figure the function returned.)
  ok('the four payment screens call recordPayment and neither write the bill nor its audit row themselves', bad.length === 0, bad);
  ok('  every one keeps the tuition-month confirmation (useTuitionMonthConfirmation) and checks it before sending',
     screens.every((f) => /useTuitionMonthConfirmation\(/.test(read(f)) && /\.confirmed\)/.test(read(f))));
  ok('  every one prefills the receipt date with today in Hanoi (receiptDateToday), never a UTC date (review M-2)',
     screens.every((f) => /receiptDateToday\(\)/.test(read(f)) && !/new Date\(\)\.toISOString\(\)\.(split\("T"\)\[0\]|slice\(0, 10\))/.test(read(f))));
  const rpm = read('src/components/admin/RecordedPaymentManager.tsx');
  ok('  RecordedPaymentManager pre-selects no method: two separate choices start empty, are cleared when an edit or reversal opens, and are required (review M-1)',
     !/useState\(\s*["'](Cash|Bank Transfer)["']\s*\)/.test(rpm) && /\[editMethod, setEditMethod\] = useState\(""\)/.test(rpm) && /\[reverseMethod, setReverseMethod\] = useState\(""\)/.test(rpm)
     && /handleStartEdit = \(invoice: Invoice\) => \{\n\s*setEditMethod\(""\);/.test(rpm) && /setReverseMethod\(""\);\n\s*setReversingInvoice\(/.test(rpm)
     && /if \(!editMethod\) \{ toast\.error\(METHOD_REQUIRED\); return; \}/.test(rpm) && /if \(!reverseMethod\) \{ toast\.error\(METHOD_REQUIRED\); return; \}/.test(rpm)
     && /method: editMethod,/.test(rpm) && /method: reverseMethod,/.test(rpm) && /placeholder="Choose cash or bank"/.test(rpm));
  ok('  RecordedPaymentManager keeps one key per invoice row (review N-1)', (rpm.match(/idempotencyKey: keyFor\(invoice\.id\)/g) ?? []).length === 2
     && (rpm.match(/idempotencyKey:/g) ?? []).length === 2 && !/paymentKey\.current/.test(rpm)
     && (rpm.match(/paymentKeys\.current\.delete\(invoice\.id\)/g) ?? []).length === 2);
  ok('  src/lib/recordPayment.ts reaches the function only through supabase.functions.invoke("record-payment")',
     /client\.functions\.invoke\("record-payment"/.test(read('src/lib/recordPayment.ts')) && !/fetch\(/.test(read('src/lib/recordPayment.ts')));
  const toml = read('supabase/config.toml');
  ok('  [functions.record-payment] verify_jwt = true in supabase/config.toml', /\[functions\.record-payment\]\nverify_jwt = true/.test(toml));
  const fn = read('supabase/functions/record-payment/index.ts');
  ok('  record-payment: requireRole(["admin"]) with allowServiceRole false; its data through callerClient; the writes only through the caller\'s rpc',
     /requireRole\(req, service, \["admin"\], corsHeaders, \{ allowServiceRole: false \}\)/.test(fn) && /callerClient\(createClient/.test(fn)
     && !/service\s*\.(from|rpc)\(/.test(fn) && /supabase\.rpc\("record_admin_payment"/.test(fn)
     && !/\.(insert|update|upsert|delete)\s*\(/.test(fn));
  ok('  record-payment reads calculate-tuition\'s returned error instead of trusting a try/catch (review N-2)',
     /const \{ error \} = await service\.functions\.invoke\("calculate-tuition"/.test(fn) && /if \(!error\) return null;/.test(fn));
  const audit = read('supabase/functions/student-audit/index.ts');
  // payments-followups (R-N1): the audit row of a record-payment payment is
  // never listed, whether or not its payments row still stands (a deleted
  // payment is not money received). student-audit-statement.test.mjs runs it.
  ok('  student-audit (the account statement\'s source) lists a record-payment payment once, and a correction row as an adjustment, signed - never as money received (review N-4, R-N1)',
     /if \(diff\.via === "record-payment"\) continue;/.test(audit)
     && /kind: correction \? "adjustment" : "payment"/.test(audit));
}

// =================================================================== 15
console.log('\n15. the screens\' answer rule over the REAL functions-js client (review B-2)');
{
  const out = await build({ entryPoints: [join(repo, 'src/lib/recordPayment.ts')], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent' });
  const p = resolve(tmpdir(), `g1.recordPayment.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  const lib = await import(pathToFileURL(p).href);
  const via = (customFetch) => ({ functions: new FunctionsClient('https://example.supabase.co/functions/v1', { headers: { Authorization: `Bearer ${ADMIN.tok}` }, customFetch }) });
  // The real handler behind functions-js.
  const serve = (u, init) => recordFn(new Request('http://localhost/fn', { method: init.method, headers: init.headers, body: init.body }));
  const args = (o) => ({ month: M, kind: 'payment', amount: 1, method: 'Cash', occurredAt: '2026-08-10', idempotencyKey: randomUUID(), ...o });

  const drop = await lib.recordPayment(via(async () => { throw new TypeError('Failed to fetch'); }), args({ studentId: randomUUID() }));
  ok('a dropped connection (fetch rejects): answered false - the screen keeps the key', drop.ok === false && drop.answered === false && drop.message === lib.NO_ANSWER_MESSAGE, drop);
  const gateway = await lib.recordPayment(via(async () => new Response('<html>502 Bad Gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } })), args({ studentId: randomUUID() }));
  const relay = await lib.recordPayment(via(async () => new Response('{"message":"relay"}', { status: 502, headers: { 'Content-Type': 'application/json', 'x-relay-error': 'true' } })), args({ studentId: randomUUID() }));
  const limit = await lib.recordPayment(via(async () => new Response('{"code":"WORKER_LIMIT","message":"limit"}', { status: 546, headers: { 'Content-Type': 'application/json' } })), args({ studentId: randomUUID() }));
  ok('  a gateway 502 page, a relay error and a runtime 546 without record-payment\'s own `error`: not answered (key kept)',
     [gateway, relay, limit].every((r) => r.ok === false && r.answered === false), [gateway, relay, limit]);
  const unknown = await lib.recordPayment(via(async () => new Response(JSON.stringify({ error: 'The database did not answer...', unknown: true }), { status: 503, headers: { 'Content-Type': 'application/json' } })), args({ studentId: randomUUID() }));
  ok('  record-payment\'s own 503 unknown: not answered (key kept), its words shown', unknown.answered === false && /did not answer/.test(unknown.message), unknown);
  const dup = await lib.recordPayment(via(async () => new Response(JSON.stringify({ error: 'dup', duplicate: true }), { status: 409, headers: { 'Content-Type': 'application/json' } })), args({ studentId: randomUUID() }));
  const nothing = await lib.recordPayment(via(async () => new Response(JSON.stringify({ error: 'Nothing was recorded: x' }), { status: 500, headers: { 'Content-Type': 'application/json' } })), args({ studentId: randomUUID() }));
  ok('  a 409 duplicate and a 500 "Nothing was recorded" from record-payment: answered (definite)', dup.answered && dup.duplicate && nothing.answered && !nothing.duplicate, [dup, nothing]);

  // End to end: the request reaches record-payment and is recorded, the reply is lost.
  const s = await child('ScreenRetry');
  await bill(s, M, 1000000);
  let key = randomUUID();
  const entry = { studentId: s, amount: 500000, expectedRecorded: 0 };
  const lost = await lib.recordPayment(via(async (u, i) => { const res = await serve(u, i); await res.text(); throw new TypeError('Failed to fetch'); }), args({ ...entry, idempotencyKey: key }));
  if (lost.ok || lost.answered) key = randomUUID(); // the screens' rule
  ok('the payment was recorded but the reply was lost: answered false, so the screen keeps the key', lost.answered === false
     && Number((await billOf(s, M)).recorded_payment) === 500000, lost);
  const retried = await lib.recordPayment(via(serve), args({ ...entry, expectedRecorded: 500000, idempotencyKey: key }));
  ok('  the admin retries (the screen reloaded, so it now shows 500,000): refused as already submitted - paid ONCE',
     retried.ok === false && retried.answered && retried.duplicate && Number((await billOf(s, M)).recorded_payment) === 500000 && (await paymentsOf(s)).length === 1, retried);
  // The same flow under the old rule (answered = a context or data): a new key, so the retry pays again.
  const c = await child('ScreenRetryOldRule');
  await bill(c, M, 1000000);
  await lib.recordPayment(via(async (u, i) => { const res = await serve(u, i); await res.text(); throw new TypeError('Failed to fetch'); }), args({ studentId: c, amount: 500000, idempotencyKey: randomUUID() }));
  await lib.recordPayment(via(serve), args({ studentId: c, amount: 500000, idempotencyKey: randomUUID() }));
  ok('  control: had the screen made a new key (the old answered = true), the retry would have recorded 1,000,000',
     Number((await billOf(c, M)).recorded_payment) === 1000000 && (await paymentsOf(c)).length === 2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
