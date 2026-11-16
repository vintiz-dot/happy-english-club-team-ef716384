// D5: scripts/CHECK-money-invariants.sql - the owner's read-only check of the
// money invariants on live data - run here on synthetic fixtures.
//
// What this suite holds:
//   1. The script is ONE read-only statement: comments and string literals
//      stripped, it holds no write or DDL keyword and one statement; it runs
//      inside a READ ONLY transaction (a write would fail there); its output
//      carries no uuid, only check ids, names, counts and totals.
//   2. The fixture tables are the live columns: every column of every table
//      built here is a column of that table in src/integrations/supabase/
//      types.ts or, for a table types.ts does not know yet, in the migration
//      that creates it. A check that reads a dead column fails to run here.
//   3. A consistent world reports 0 on every check (M40, "the guard is on",
//      reports 1).
//   4. Each check catches its own violation: one deliberately broken row per
//      case, and exactly the checks named for that case move. Cases marked
//      "negative" are the near-misses the check must NOT count.
//   5. Everything broken at once, under READ ONLY: every 'must be 0' check is
//      above 0.
//   6. On the REAL triggers (carry chain, audit, freeze, cancelled-lesson
//      guard, invoice_paid_label): ordinary writes leave every 'must be 0'
//      check at 0, the writes the triggers stop leave them at 0 too, and the
//      known gap G-4 (the carry trigger moves a later month's payable without
//      relabelling it) shows in M11, as the audit says.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SCRIPT = readFileSync(join(repo, 'scripts', 'CHECK-money-invariants.sql'), 'utf8');
const mig = (name) => readFileSync(join(repo, 'supabase', 'migrations', name), 'utf8');

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ''}`);
  value ? pass++ : fail++;
};

// ------------------------------------------------------------------ ids
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), TEACHER = U(2), TA1 = U(3), OTHER_TEACHER = U(4);
const S1 = U(11), S2 = U(12), FAM = U(21);
const C1 = U(31), C2 = U(32);
const X1 = U(41), X2 = U(42), X3 = U(43), XF = U(44);
const P0 = U(51), P1 = U(52), P5 = U(55), P6 = U(56), P7 = U(57), P8 = U(58), P9 = U(59);
const B_SEP = U(61), B_OCT = U(62), B_NOV = U(63);

// ---------------------------------------------------- the fixture tables
// Plain tables with no triggers, so a broken row can be written. Section 2
// holds them to the live columns.
const SCHEMA = `
  DO $r$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  END $r$;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TYPE public.invoice_status AS ENUM ('draft','issued','paid','partial','credit');
  CREATE TYPE public.account_code AS ENUM ('AR','REVENUE','DISCOUNT','CASH','BANK','CREDIT');
  CREATE TABLE public.user_roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text NOT NULL DEFAULT 'class', session_rate_vnd integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, date date NOT NULL,
    start_time time NOT NULL DEFAULT '17:00', end_time time NOT NULL DEFAULT '18:30',
    status public.session_status NOT NULL DEFAULT 'Scheduled', teacher_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    start_date date NOT NULL, end_date date, allowed_days integer[], created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL, student_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'Present', marked_by uuid, marked_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(session_id, student_id));
  CREATE TABLE public.invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'issued', base_amount integer NOT NULL DEFAULT 0, discount_amount integer NOT NULL DEFAULT 0,
    total_amount integer NOT NULL DEFAULT 0, paid_amount integer NOT NULL DEFAULT 0, recorded_payment integer DEFAULT 0,
    carry_in_credit integer, carry_in_debt integer, carry_out_credit integer, carry_out_debt integer,
    class_breakdown jsonb, tuition_frozen boolean NOT NULL DEFAULT false, frozen_reason text, confirmation_status text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id, month));
  CREATE TABLE public.payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, family_id uuid,
    amount integer NOT NULL, method text NOT NULL DEFAULT 'Cash', occurred_at timestamptz NOT NULL DEFAULT now(),
    parent_payment_id uuid, memo text, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_payment_id uuid NOT NULL,
    student_id uuid NOT NULL, allocated_amount integer NOT NULL, allocation_order integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL,
    code public.account_code NOT NULL, UNIQUE(student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL, debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0, month text NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(), memo text, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL DEFAULT 'x',
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now(),
    operation text, changed_fields text[]);
  CREATE TABLE public.session_cancel_overrides(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
    session_id uuid NOT NULL, action text NOT NULL, refresh_pairs jsonb NOT NULL DEFAULT '[]', review_required boolean NOT NULL DEFAULT false);
  CREATE TABLE public.session_cancel_override_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
    override_id uuid, kind text NOT NULL, payload jsonb NOT NULL DEFAULT '{}');
  CREATE TABLE public.money_change_overrides(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
    refresh_pairs jsonb NOT NULL DEFAULT '[]', review_required boolean NOT NULL DEFAULT false);
  CREATE TABLE public.money_change_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
    override_id uuid, kind text NOT NULL, payload jsonb NOT NULL DEFAULT '{}');
  CREATE TABLE public.class_fee_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, effective_from date NOT NULL,
    session_rate_vnd integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(class_id, effective_from));
  CREATE TABLE public.payroll_periods(month text PRIMARY KEY, status text NOT NULL DEFAULT 'open', locked_at timestamptz);
  CREATE TABLE public.payroll_lines(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), month text NOT NULL, teacher_id uuid, assistant_id uuid,
    staff_name text NOT NULL DEFAULT 'x', total_amount_vnd integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.expenditures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric NOT NULL, category text NOT NULL,
    date date NOT NULL, source_kind text, source_key text, UNIQUE(source_kind, source_key));
  CREATE TABLE public.settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    amount integer NOT NULL, settlement_type text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.invoice_state_floor(student_id uuid NOT NULL, month text NOT NULL, max_recorded_payment numeric NOT NULL DEFAULT 0,
    PRIMARY KEY(student_id, month));
  CREATE TABLE public.monthly_finance_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    total_amount integer NOT NULL DEFAULT 0, recorded_payment integer NOT NULL DEFAULT 0, superseded_at timestamptz);
`;

// The carry chain as refresh_invoice_carry works it out (for the fixtures).
function withCarry(bills) {
  const byStudent = new Map();
  for (const b of bills) (byStudent.get(b.student) ?? byStudent.set(b.student, []).get(b.student)).push(b);
  for (const list of byStudent.values()) {
    list.sort((a, b) => a.month.localeCompare(b.month));
    let run = 0;
    for (const b of list) {
      const net = b.total - b.recorded - run;
      Object.assign(b, { ci_credit: Math.max(run, 0), ci_debt: Math.max(-run, 0), co_credit: Math.max(-net, 0), co_debt: Math.max(net, 0) });
      run += b.recorded - b.total;
    }
  }
  return bills;
}

// --------------------------------------------------------- a clean world
const bills = withCarry([
  { id: B_SEP, student: S1, month: '2026-09', base: 600000, total: 600000, recorded: 600000, status: 'paid', frozen: true },
  { id: B_OCT, student: S1, month: '2026-10', base: 600000, total: 600000, recorded: 900000, status: 'paid', frozen: false },
  // payable = 600,000 - 300,000 credit carried in; 100,000 recorded (the past credit) -> partial
  { id: B_NOV, student: S1, month: '2026-11', base: 600000, total: 600000, recorded: 100000, status: 'partial', frozen: false },
]);
const acct = (student, code) => `(SELECT id FROM public.ledger_accounts WHERE student_id = '${student}' AND code = '${code}')`;
const tx = (n) => U(9000 + n);
const leg = (txn, key, student, code, debit, credit, month) =>
  `('${tx(txn)}', ${key ? `'${key}'` : 'NULL'}, ${acct(student, code)}, ${debit}, ${credit}, '${month}')`;

const BASELINE = `
  INSERT INTO public.user_roles(user_id, role) VALUES ('${ADMIN}', 'admin'), ('${TEACHER}', 'teacher');
  INSERT INTO public.classes(id, session_rate_vnd) VALUES ('${C1}', 300000), ('${C2}', 280000);
  INSERT INTO public.class_fee_history(class_id, effective_from, session_rate_vnd) VALUES
    ('${C1}', '1900-01-01', 300000), ('${C2}', '1900-01-01', 250000), ('${C2}', '2026-11-01', 280000);
  INSERT INTO public.enrollments(student_id, class_id, start_date) VALUES ('${S1}', '${C1}', '2026-01-01');
  INSERT INTO public.sessions(id, class_id, date, status, teacher_id) VALUES
    ('${X1}', '${C1}', '2026-10-05', 'Held', '${TEACHER}'),
    ('${X2}', '${C1}', '2026-10-12', 'Canceled', '${TEACHER}'),
    ('${XF}', '${C1}', '2099-01-05', 'Scheduled', '${TEACHER}');
  INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES
    ('${X1}', '${S1}', 'Present', '${TEACHER}'), ('${X2}', '${S1}', 'Excused', '${TEACHER}');
  ${bills.map((b) => `INSERT INTO public.invoices(id, student_id, month, status, base_amount, total_amount, recorded_payment, paid_amount,
      carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt, tuition_frozen, updated_at)
    VALUES ('${b.id}', '${b.student}', '${b.month}', '${b.status}', ${b.base}, ${b.total}, ${b.recorded}, ${b.recorded},
      ${b.ci_credit}, ${b.ci_debt}, ${b.co_credit}, ${b.co_debt}, ${b.frozen}, '2026-11-14T00:00:00Z');`).join('\n')}
  -- the freeze of September, as the audit trigger records it
  INSERT INTO public.audit_log(entity, entity_id, operation, changed_fields, actor_user_id, occurred_at, diff) VALUES
    ('invoices', '${B_SEP}', 'UPDATE', ARRAY['frozen_reason','tuition_frozen'], '${ADMIN}', '2026-10-10T00:00:00Z',
     jsonb_build_object('old', jsonb_build_object('tuition_frozen', false, 'base_amount', 600000, 'discount_amount', 0, 'total_amount', 600000),
                        'new', jsonb_build_object('tuition_frozen', true, 'base_amount', 600000, 'discount_amount', 0, 'total_amount', 600000)));
  INSERT INTO public.ledger_accounts(student_id, code)
    SELECT s, c::public.account_code FROM (VALUES ('${S1}'::uuid), ('${S2}'::uuid)) v(s),
           unnest(ARRAY['AR','REVENUE','DISCOUNT','CASH','BANK','CREDIT']) c;
  -- September: one child's payment. October: a family payment of 900,000, allocated in full.
  INSERT INTO public.payments(id, student_id, amount, created_at) VALUES ('${P0}', '${S1}', 600000, '2026-09-10T00:00:00Z');
  INSERT INTO public.payments(id, student_id, family_id, amount, created_at) VALUES
    ('${P1}', '${S1}', '${FAM}', 900000, '2026-10-10T00:00:00Z'),
    ('${P9}', '${S1}', '${FAM}', 100000, '2026-08-10T00:00:00Z');
  INSERT INTO public.payment_allocations(parent_payment_id, student_id, allocated_amount) VALUES ('${P1}', '${S1}', 900000);
  INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
    ${leg(1, 'single-sep', S1, 'CASH', 600000, 0, '2026-09')}, ${leg(1, null, S1, 'AR', 0, 600000, '2026-09')},
    ${leg(2, `smart-family-${P1}-${S1}-1700000000000`, S1, 'CASH', 900000, 0, '2026-10')}, ${leg(2, null, S1, 'AR', 0, 900000, '2026-10')},
    -- an old unapplied-cash leftover (P9), credited on 17 Nov: reclass + marker
    ${leg(3, `smart-family-credit-${P9}-1600000000000`, S1, 'AR', 100000, 0, '2026-08')}, ${leg(3, null, S1, 'CREDIT', 0, 100000, '2026-08')},
    ${leg(4, `past-leftover-credit-${P9}-reclass`, S1, 'CREDIT', 100000, 0, '2026-08')}, ${leg(4, null, S1, 'AR', 0, 100000, '2026-08')},
    ${leg(5, `past-leftover-credit-${P9}`, S1, 'CASH', 100000, 0, '2026-11')}, ${leg(5, null, S1, 'AR', 0, 100000, '2026-11')};
  -- the D2 guard, on since 12 Nov; one checked cancel, its bills refreshed
  INSERT INTO public.session_cancel_override_events(kind, created_at) VALUES ('guard_installed', '2026-11-12T10:00:00Z');
  INSERT INTO public.session_cancel_overrides(id, session_id, action, refresh_pairs, created_at) VALUES
    ('${U(71)}', '${X2}', 'cancel', '[["s","2026-10"]]', '2026-11-13T03:00:00Z');
  INSERT INTO public.session_cancel_override_events(override_id, kind, created_at) VALUES ('${U(71)}', 'tuition_refreshed', '2026-11-13T03:00:05Z');
  INSERT INTO public.audit_log(entity, entity_id, operation, actor_user_id, occurred_at, diff) VALUES
    ('sessions', '${X2}', 'UPDATE', '${ADMIN}', '2026-11-13T03:00:00Z',
     '{"old":{"status":"Scheduled","date":"2026-10-12"},"new":{"status":"Canceled","date":"2026-10-12"}}');
  -- D4: one checked money change, refreshed
  INSERT INTO public.money_change_overrides(id, refresh_pairs, created_at) VALUES ('${U(72)}', '[["s","2026-10"]]', '2026-11-14T03:00:00Z');
  INSERT INTO public.money_change_events(override_id, kind, created_at) VALUES ('${U(72)}', 'tuition_refreshed', '2026-11-14T03:00:05Z');
  -- payroll: September closed on 5 Oct, one line, its cost booked
  INSERT INTO public.payroll_periods(month, status, locked_at) VALUES ('2026-09', 'locked', '2026-10-05T00:00:00Z'), ('2026-10', 'open', NULL);
  INSERT INTO public.payroll_lines(month, teacher_id, total_amount_vnd, created_at) VALUES ('2026-09', '${TEACHER}', 1000000, '2026-10-04T00:00:00Z');
  INSERT INTO public.expenditures(amount, category, date, source_kind, source_key) VALUES
    (1000000, 'Teacher Payroll', '2026-09-30', 'payroll', '2026-09:teacher:${TEACHER}');
  INSERT INTO public.settlements(student_id, month, amount, settlement_type, created_at) VALUES ('${S1}', '2026-06', 50000, 'discount', '2026-07-01T00:00:00Z');
  INSERT INTO public.invoice_state_floor(student_id, month, max_recorded_payment) VALUES ('${S1}', '2026-10', 900000);
  INSERT INTO public.monthly_finance_snapshots(student_id, month, total_amount, recorded_payment) VALUES ('${S1}', '2026-09', 600000, 600000);
`;

// ---------------------------------------------------------------- helpers
async function freshDb() {
  const db = new PGlite();
  await db.exec(SCHEMA);
  await db.exec(mig('20261113090000_invoice_paid_label.sql'));
  await db.exec(BASELINE);
  return db;
}
const runCheck = async (db) => {
  const r = await db.query(SCRIPT);
  return Object.fromEntries(r.rows.map((x) => [x.check_id, { n: Number(x.violations), total: x.total_vnd === null ? null : Number(x.total_vnd), kind: x.kind, name: x.check_name }]));
};
const runReadOnly = async (db) => {
  await db.exec('BEGIN READ ONLY');
  try { return await runCheck(db); } finally { await db.exec('ROLLBACK'); }
};

// =================================================================== 1
console.log('\n1. the script is one read-only statement');
{
  const stripped = SCRIPT.replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''");
  const forbidden = stripped.match(/\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY|DO|CALL|SET|LOCK|NOTIFY|VACUUM|REFRESH|EXECUTE|PERFORM|COMMIT|ROLLBACK|BEGIN|nextval|setval|pg_advisory\w*|dblink\w*|lo_\w+)\b/gi) ?? [];
  ok('no write, DDL, transaction or side-effect keyword outside comments and strings', forbidden.length === 0, forbidden);
  const statements = stripped.split(';').filter((s) => s.trim().length > 0);
  ok('exactly one statement, a WITH ... SELECT', statements.length === 1 && /^\s*WITH\b/i.test(statements[0]), statements.length);
  const fns = [...new Set((stripped.match(/\bpublic\.([a-z_]+)\s*\(/g) ?? []).map((m) => m.replace(/\s*\($/, '')))];
  ok('the only function of public it calls is invoice_paid_label (IMMUTABLE)', fns.length === 1 && fns[0] === 'public.invoice_paid_label', fns);
  ok('invoice_paid_label is declared IMMUTABLE in its migration', /invoice_paid_label\([\s\S]*?IMMUTABLE/.test(mig('20261113090000_invoice_paid_label.sql')));
  const ids = [...SCRIPT.matchAll(/'(M\d\d)' AS check_id|SELECT '(M\d\d)'/g)].map((m) => m[1] ?? m[2]);
  ok('40 checks, numbered M01..M40 once each', ids.length === 40 && new Set(ids).size === 40
     && ids.every((id, i) => id === `M${String(i + 1).padStart(2, '0')}`), ids);
}

// =================================================================== 2
console.log('\n2. the fixture tables carry the live columns only');
{
  const types = readFileSync(join(repo, 'src', 'integrations', 'supabase', 'types.ts'), 'utf8').replace(/\r\n/g, '\n');
  const rowCols = (table) => {
    const at = types.indexOf(`\n      ${table}: {\n        Row: {`);
    if (at < 0) return null;
    const body = types.slice(at, types.indexOf('\n        }', at + 10));
    return new Set([...body.matchAll(/^\s{10}([a-z_0-9]+):/gm)].map((m) => m[1]));
  };
  const migDir = join(repo, 'supabase', 'migrations');
  const migCols = (table) => {
    for (const f of readdirSync(migDir).sort()) {
      const t = readFileSync(join(migDir, f), 'utf8');
      const at = t.search(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\s*\\(`));
      if (at >= 0) { const block = t.slice(at, t.indexOf('\n);', at)); return { f, has: (c) => new RegExp(`\\b${c}\\b`).test(block) }; }
    }
    return null;
  };
  const db = await freshDb();
  const cols = (await db.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1, 2`)).rows;
  const byTable = new Map();
  for (const { table_name, column_name } of cols) (byTable.get(table_name) ?? byTable.set(table_name, []).get(table_name)).push(column_name);
  for (const [table, list] of byTable) {
    const live = rowCols(table);
    if (live) {
      const dead = list.filter((c) => !live.has(c));
      ok(`${table}: every column is in types.ts`, dead.length === 0, dead);
    } else {
      const m = migCols(table);
      const dead = m ? list.filter((c) => !m.has(c)) : list;
      ok(`${table}: not in types.ts yet; every column is in its CREATE TABLE (${m?.f ?? 'NOT FOUND'})`, !!m && dead.length === 0, dead);
    }
  }
  await db.close();
}

// =================================================================== 3, 4
const CASES = [
  // [label, mutation SQL, checks that must move]
  ['M01 a one-legged ledger transaction', `INSERT INTO public.ledger_entries(tx_id, account_id, debit, credit, month) VALUES ('${tx(100)}', ${acct(S1, 'AR')}, 500, 0, '2026-10')`, ['M01']],
  ['M02 a ledger row with neither side', `INSERT INTO public.ledger_entries(tx_id, account_id, debit, credit, month) VALUES ('${tx(101)}', ${acct(S1, 'AR')}, 0, 0, '2026-10')`, ['M02']],
  ['M03 a bill recording 50,000 more than the ledger (and its carry not refreshed)', `UPDATE public.invoices SET recorded_payment = recorded_payment + 50000 WHERE id = '${B_NOV}'`, ['M03', 'M09']],
  ['M04 ledger cash for a month with no bill', `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES ${leg(102, 'k102', S1, 'CASH', 70000, 0, '2026-12')}, ${leg(102, null, S1, 'AR', 0, 70000, '2026-12')}`, ['M04']],
  ['M05 an old family payment allocated short', `
     INSERT INTO public.payments(id, student_id, family_id, amount, created_at) VALUES ('${P5}', '${S2}', '${FAM}', 200000, '2026-11-01T00:00:00Z');
     INSERT INTO public.payment_allocations(parent_payment_id, student_id, allocated_amount) VALUES ('${P5}', '${S2}', 150000);
     INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES ${leg(103, `smart-family-${P5}-${S2}-1`, S2, 'REVENUE', 150000, 0, '2026-08')}, ${leg(103, null, S2, 'AR', 0, 150000, '2026-08')}`, ['M05']],
  ['M06 a family payment since 17 Nov allocated short', `
     INSERT INTO public.payments(id, student_id, family_id, amount, created_at) VALUES ('${P6}', '${S2}', '${FAM}', 200000, '2026-11-17T05:00:00Z');
     INSERT INTO public.payment_allocations(parent_payment_id, student_id, allocated_amount) VALUES ('${P6}', '${S2}', 150000);
     INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES ${leg(104, `family-payment-${P6}-${S2}-1`, S2, 'REVENUE', 150000, 0, '2026-08')}, ${leg(104, null, S2, 'AR', 0, 150000, '2026-08')}`, ['M06']],
  ['M07 an allocation with no keyed ledger leg', `
     INSERT INTO public.payments(id, student_id, amount) VALUES ('${P7}', '${S2}', 10000);
     INSERT INTO public.payment_allocations(parent_payment_id, student_id, allocated_amount) VALUES ('${P7}', '${S2}', 10000)`, ['M07']],
  ['M08 a negative recorded payment (the ledger then holds more than the bill)', `
     INSERT INTO public.invoices(student_id, month, status, recorded_payment, carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt)
       VALUES ('${S2}', '2026-10', 'issued', -1000, 0, 0, 0, 1000)`, ['M08', 'M04']],
  ['M09/M10 a stored carry-out that is not the chain', `UPDATE public.invoices SET carry_out_credit = carry_out_credit + 1 WHERE id = '${B_OCT}'`, ['M09', 'M10']],
  ['M11 a stale label not written since T4', `UPDATE public.invoices SET status = 'partial', updated_at = '2026-11-01T00:00:00Z' WHERE id = '${B_SEP}'`, ['M11']],
  ['M12 a stale label written since T4', `UPDATE public.invoices SET status = 'issued', updated_at = '2026-11-15T00:00:00Z' WHERE id = '${B_OCT}'`, ['M11', 'M12']],
  ['M13 an audit row: figures changed while frozen', `INSERT INTO public.audit_log(entity, entity_id, operation, changed_fields, diff) VALUES
     ('invoices', '${B_SEP}', 'UPDATE', ARRAY['total_amount'], '{"old":{"tuition_frozen":true,"total_amount":600000},"new":{"tuition_frozen":true,"total_amount":650000}}')`, ['M13']],
  ['M14 a frozen bill whose breakdown moved since the freeze', `UPDATE public.invoices SET class_breakdown = '{"c":1}' WHERE id = '${B_SEP}'`, ['M14']],
  ['M15 a frozen bill with no freeze record', `INSERT INTO public.invoices(student_id, month, status, tuition_frozen, carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt)
     VALUES ('${S2}', '2026-07', 'issued', true, 0, 0, 0, 0)`, ['M15']],
  ['M16 unfrozen by a teacher', `INSERT INTO public.audit_log(entity, entity_id, operation, actor_user_id, diff) VALUES
     ('invoices', '${B_SEP}', 'UPDATE', '${TEACHER}', '{"old":{"tuition_frozen":true},"new":{"tuition_frozen":false}}')`, ['M16']],
  ['M16 negative: unfrozen by an admin', `INSERT INTO public.audit_log(entity, entity_id, operation, actor_user_id, diff) VALUES
     ('invoices', '${B_SEP}', 'UPDATE', '${ADMIN}', '{"old":{"tuition_frozen":true},"new":{"tuition_frozen":false}}')`, []],
  ['M17 Present on a cancelled lesson', `UPDATE public.attendance SET status = 'Present' WHERE session_id = '${X2}'`, ['M17']],
  ['M18 Present for a child not enrolled', `INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ('${X1}', '${S2}', 'Present', '${TEACHER}')`, ['M18']],
  ['M18 negative: Excused for a child not enrolled', `INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ('${X1}', '${S2}', 'Excused', '${TEACHER}')`, []],
  ['M18 a mark on a weekday the enrolment excludes', `UPDATE public.enrollments SET allowed_days = ARRAY[3] WHERE student_id = '${S1}'`, ['M18']],
  ['M19 a past Held lesson with only a placeholder mark', `
     INSERT INTO public.sessions(id, class_id, date, status, teacher_id) VALUES ('${X3}', '${C1}', '2026-10-19', 'Held', '${TEACHER}');
     INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ('${X3}', '${S1}', 'Present', NULL)`, ['M19']],
  ['M20 a cancel after the guard with no checked row', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${X1}', 'UPDATE', '2026-11-14T03:00:00Z', '{"old":{"status":"Held","date":"2026-10-05"},"new":{"status":"Canceled","date":"2026-10-05"}}')`, ['M20']],
  ['M20 negative: the same cancel BEFORE the guard', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${X1}', 'UPDATE', '2026-11-01T03:00:00Z', '{"old":{"status":"Held","date":"2026-10-05"},"new":{"status":"Canceled","date":"2026-10-05"}}')`, []],
  ['M20 negative: the same cancel WITH its checked row', `
     INSERT INTO public.session_cancel_overrides(session_id, action, created_at) VALUES ('${X1}', 'cancel', '2026-11-14T03:00:00Z');
     INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${X1}', 'UPDATE', '2026-11-14T03:00:00Z', '{"old":{"status":"Held","date":"2026-10-05"},"new":{"status":"Canceled","date":"2026-10-05"}}')`, []],
  ['M21 an un-cancel with no checked row', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${X2}', 'UPDATE', '2026-11-14T03:00:00Z', '{"old":{"status":"Canceled","date":"2026-10-12"},"new":{"status":"Scheduled","date":"2026-10-12"}}')`, ['M21']],
  ['M22 a Held lesson deleted with no checked row', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${X1}', 'DELETE', '2026-11-14T03:00:00Z', '{"old":{"status":"Held","date":"2026-10-05"}}')`, ['M22']],
  ['M22 a started lesson moved to another date with no checked row', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${X1}', 'UPDATE', '2026-11-14T03:00:00Z', '{"old":{"status":"Held","date":"2026-10-05"},"new":{"status":"Held","date":"2026-10-06"}}')`, ['M22']],
  ['M22 negative: the rebuild deleting a future Scheduled lesson', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('sessions', '${XF}', 'DELETE', '2026-11-14T03:00:00Z', '{"old":{"status":"Scheduled","date":"2099-01-05"}}')`, []],
  ['M23 a checked cancel whose bills were never refreshed', `INSERT INTO public.session_cancel_overrides(session_id, action, refresh_pairs, created_at)
     VALUES ('${X1}', 'cancel', '[["s","2026-10"]]', '2026-11-14T04:00:00Z')`, ['M23']],
  ['M24 a correction nobody reviewed', `INSERT INTO public.session_cancel_overrides(session_id, action, review_required, created_at)
     VALUES ('${X1}', 'cancel', true, '2026-11-14T05:00:00Z')`, ['M24']],
  ['M25 a money change nobody reviewed', `INSERT INTO public.money_change_overrides(review_required, created_at) VALUES (true, '2026-11-14T03:00:00Z')`, ['M25']],
  ['M26 a money change whose bills were never refreshed', `INSERT INTO public.money_change_overrides(refresh_pairs, created_at) VALUES ('[["s","2026-10"]]', '2026-11-14T03:00:00Z')`, ['M26']],
  ['M27 a service-lane retro mark', `INSERT INTO public.money_change_events(kind) VALUES ('service_retro_mark')`, ['M27']],
  ['M28 the rebuild refused (D2 and D4 events both count)', `INSERT INTO public.money_change_events(kind) VALUES ('automation_refused');
     INSERT INTO public.session_cancel_override_events(kind) VALUES ('automation_refused')`, ['M28']],
  ['M29 a class with no baseline fee row', `DELETE FROM public.class_fee_history WHERE class_id = '${C2}' AND effective_from = '1900-01-01'`, ['M29']],
  ['M30 a class fee changed outside its history', `UPDATE public.classes SET session_rate_vnd = 310000 WHERE id = '${C1}'`, ['M30']],
  ['M31 a payroll line created after its month was closed', `
     INSERT INTO public.payroll_lines(month, assistant_id, total_amount_vnd, created_at) VALUES ('2026-09', '${TA1}', 500000, '2026-10-06T00:00:00Z');
     INSERT INTO public.expenditures(amount, category, date, source_kind, source_key) VALUES (500000, 'TA Payroll', '2026-09-30', 'payroll', '2026-09:assistant:${TA1}')`, ['M31']],
  ["M31 an audit row: a closed month's line changed after the close", `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('payroll_lines', 'x', 'UPDATE', '2026-10-06T00:00:00Z', '{"old":{"month":"2026-09"},"new":{"month":"2026-09"}}')`, ['M31']],
  ['M31 negative: a line of an OPEN month changed', `INSERT INTO public.audit_log(entity, entity_id, operation, occurred_at, diff) VALUES
     ('payroll_lines', 'x', 'UPDATE', '2026-11-06T00:00:00Z', '{"old":{"month":"2026-10"},"new":{"month":"2026-10"}}')`, []],
  ['M32 a booked cost that is not the line', `UPDATE public.expenditures SET amount = 900000 WHERE source_key = '2026-09:teacher:${TEACHER}'`, ['M32']],
  ['M33 a booked cost with no line', `INSERT INTO public.expenditures(amount, category, date, source_kind, source_key) VALUES (300000, 'Teacher Payroll', '2026-09-30', 'payroll', '2026-09:teacher:${OTHER_TEACHER}')`, ['M33']],
  ['M34 an unapplied-cash leftover not credited', `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
     ${leg(105, `family-credit-${P8}-1600000000001`, S2, 'AR', 40000, 0, '2026-07')}, ${leg(105, null, S2, 'CREDIT', 0, 40000, '2026-07')}`, ['M34']],
  ['M34 negative: the same leftover, reversed by delete-payment', `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
     ${leg(105, `family-credit-${P8}-1600000000001`, S2, 'AR', 40000, 0, '2026-07')}, ${leg(105, null, S2, 'CREDIT', 0, 40000, '2026-07')},
     ${leg(106, `payment-reversal-${P8}-x`, S2, 'CREDIT', 40000, 0, '2026-07')}, ${leg(106, null, S2, 'AR', 0, 40000, '2026-07')}`, []],
  ['M35 a past credit marker without its reclass', `DELETE FROM public.ledger_entries WHERE tx_id = '${tx(4)}'`, ['M35']],
  ['M36 a settlement made after the removal', `INSERT INTO public.settlements(student_id, month, amount, settlement_type, created_at) VALUES ('${S1}', '2026-11', 1, 'voluntary_contribution', '2026-11-16T10:00:00+07')`, ['M36']],
  ['M37 a counted write-off', `INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
     ${leg(107, 'settlement-writeoff-1', S1, 'DISCOUNT', 1000, 0, '2026-10')}, ${leg(107, null, S1, 'AR', 0, 1000, '2026-10')}`, ['M37']],
  ['M38 a bill paid down below its floor', `UPDATE public.invoice_state_floor SET max_recorded_payment = 950000`, ['M38']],
  ['M39 a closed finance snapshot that no longer matches the bill', `UPDATE public.monthly_finance_snapshots SET total_amount = 610000`, ['M39']],
  ['M40 no guard_installed event (M20-M22 then read nothing)', `DELETE FROM public.session_cancel_override_events WHERE kind = 'guard_installed'`, ['M40']],
];

console.log('\n3. a consistent world reports 0 everywhere (M40 reports the guard: 1)');
const db = await freshDb();
const base = await runReadOnly(db);
{
  const ids = Object.keys(base);
  ok('the script runs read-only and returns its 40 rows', ids.length === 40, ids);
  const nonZero = Object.entries(base).filter(([id, v]) => (id === 'M40' ? v.n !== 1 : v.n !== 0));
  ok('every check is 0 on the consistent world, M40 is 1', nonZero.length === 0, nonZero);
  ok('every row says its kind', Object.values(base).every((v) => v.kind === 'must be 0' || v.kind === 'report'));
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const r = await db.query(SCRIPT);
  ok('the output holds no uuid (no ids leave the database)', !r.rows.some((row) => Object.values(row).some((v) => uuid.test(String(v)))));
  ok('the output columns are the documented six', r.fields.map((f) => f.name).join(',') === 'check_id,check_name,kind,violations,total_vnd,meaning', r.fields.map((f) => f.name));
}

console.log('\n4. each check catches its own violation, and only the checks named move');
const covered = new Set();
for (const [label, sql, expect] of CASES) {
  await db.exec('BEGIN');
  let got, err;
  try { await db.exec(sql); got = await runCheck(db); } catch (e) { err = e.message; }
  await db.exec('ROLLBACK');
  if (err) { ok(`${label}: the case runs`, false, err); continue; }
  const moved = Object.keys(got).filter((id) => got[id].n !== base[id].n).sort();
  const want = [...expect].sort();
  ok(`${label}: moves ${want.length ? want.join(', ') : 'nothing'}`, moved.join() === want.join(), { moved, n: Object.fromEntries(moved.map((m) => [m, got[m].n])) });
  for (const id of expect) covered.add(id);
}
{
  const missing = Object.keys(base).filter((id) => !covered.has(id));
  ok('every one of the 40 checks has a case that makes it move', missing.length === 0, missing);
}
// The totals mean what they say on two cases.
{
  await db.exec('BEGIN');
  await db.exec(`UPDATE public.invoices SET recorded_payment = recorded_payment + 50000 WHERE id = '${B_NOV}'`);
  const got = await runCheck(db);
  await db.exec('ROLLBACK');
  ok('M03 total is the 50,000 the bill shows beyond the ledger', got.M03.total === 50000, got.M03);
  await db.exec('BEGIN');
  await db.exec(`UPDATE public.expenditures SET amount = 900000 WHERE source_key = '2026-09:teacher:${TEACHER}'`);
  const g2 = await runCheck(db);
  await db.exec('ROLLBACK');
  ok('M32 total is the 100,000 between the line and its booked cost', g2.M32.total === 100000, g2.M32);
}

console.log('\n5. everything broken at once, read-only: every "must be 0" check is above 0');
{
  await db.exec('BEGIN');
  for (const [label, sql, expect] of CASES) {
    if (expect.length === 0 || label.startsWith('M40') || label.startsWith('M14')) continue;
    await db.exec(sql).catch((e) => ok(`${label}: applies in the combined world`, false, e.message));
  }
  await db.exec(`UPDATE public.invoices SET total_amount = total_amount + 1 WHERE id = '${B_SEP}'`);   // M14 by total, with the rest
  await db.exec('COMMIT');
  const all = await runReadOnly(db);
  const silent = Object.entries(all).filter(([id, v]) => v.kind === 'must be 0' && v.n === 0).map(([id]) => id);
  ok('no "must be 0" check stays at 0', silent.length === 0, silent);
  let wrote = null;
  await db.exec('BEGIN READ ONLY');
  try { await db.exec(`UPDATE public.invoices SET status = 'paid'`); } catch (e) { wrote = e.message; }
  await db.exec('ROLLBACK');
  ok('(the READ ONLY transaction really refuses a write)', /read-only/i.test(wrote ?? ''), wrote);
}
await db.close();

// =================================================================== 6
console.log('\n6. on the real triggers: ordinary writes keep every "must be 0" at 0; G-4 shows in M11');
{
  const t = new PGlite();
  await t.exec(SCHEMA);
  await t.exec(BASELINE);
  // The real objects the checks stand on, over the same tables.
  for (const f of [
    '20261009120000_keep_invoice_carry_balances_correct.sql',
    '20261009130000_audit_every_admin_action.sql',
    '20261106120000_invoice_tuition_freeze.sql',
    '20261027090000_cancelled_lesson_attendance_guard.sql',
    '20261113090000_invoice_paid_label.sql',
  ]) await t.exec(mig(f)).catch((e) => ok(`${f} installs over the fixture`, false, e.message));
  const as = (uid) => t.query(`SELECT set_config('test.uid', $1, false)`, [uid ?? '']);
  await as(ADMIN);
  const pay = async (id, amount) => t.exec(`UPDATE public.invoices SET recorded_payment = recorded_payment + ${amount},
      status = public.invoice_paid_label((recorded_payment + ${amount})::bigint,
        (total_amount + coalesce(carry_in_debt, 0) - coalesce(carry_in_credit, 0))::bigint, base_amount::bigint, total_amount::bigint)
    WHERE id = '${id}'`);
  const cashLeg = async (n, student, month, amount) => t.exec(`INSERT INTO public.ledger_entries(tx_id, tx_key, account_id, debit, credit, month) VALUES
    ${leg(n, `k${n}`, student, 'CASH', amount, 0, month)}, ${leg(n, null, student, 'AR', 0, amount, month)}`);

  // A December bill, then a part payment on it, as the payment paths write them.
  await t.exec(`INSERT INTO public.invoices(student_id, month, status, base_amount, total_amount, recorded_payment) VALUES ('${S1}', '2026-12', 'issued', 600000, 600000, 0)`);
  const DEC = (await t.query(`SELECT id FROM public.invoices WHERE student_id = '${S1}' AND month = '2026-12'`)).rows[0].id;
  await pay(DEC, 200000); await cashLeg(200, S1, '2026-12', 200000);
  await pay(B_NOV, 200000); await cashLeg(201, S1, '2026-11', 200000);
  // Try to move a frozen bill's figures as calculate-tuition's upsert would: the trigger keeps them.
  await t.exec(`UPDATE public.invoices SET total_amount = 1, base_amount = 1, class_breakdown = '{"c":9}' WHERE id = '${B_SEP}'`);
  const sep = (await t.query(`SELECT total_amount, base_amount, class_breakdown FROM public.invoices WHERE id = '${B_SEP}'`)).rows[0];
  ok('(the freeze trigger kept September\'s figures)', sep.total_amount === 600000 && sep.base_amount === 600000 && sep.class_breakdown === null, sep);
  // A lesson cancelled with marks on it: the trigger excuses them; Present on it is refused.
  await t.exec(`UPDATE public.sessions SET status = 'Canceled' WHERE id = '${X1}'`);
  let refused = null;
  try { await t.exec(`UPDATE public.attendance SET status = 'Present' WHERE session_id = '${X1}'`); } catch (e) { refused = e.code; }
  ok('(Present on the cancelled lesson is refused, 23514)', refused === '23514', refused);
  // Freeze December through an ordinary update: the audit trigger records it.
  await t.exec(`UPDATE public.invoices SET tuition_frozen = true, frozen_reason = 'corrected history' WHERE id = '${DEC}'`);

  const after = await runCheck(t);
  const broken = Object.entries(after).filter(([id, v]) => v.kind === 'must be 0' && v.n !== 0 && !['M20'].includes(id));
  ok('every "must be 0" check is still 0 after the ordinary writes (carry, freeze, cancel, labels by the rule)', broken.length === 0, broken);
  ok('M20 catches the raw cancel made in this fixture with no checked row (the D2 guard is not installed here)', after.M20.n === 1, after.M20);
  ok('M15: a bill frozen by an ordinary UPDATE has its freeze record (audit trigger)', after.M15.n === 0, after.M15);
  ok('M09/M10: the real carry trigger keeps the chain', after.M09.n === 0 && after.M10.n === 0, { M09: after.M09, M10: after.M10 });

  // G-4: pay 700,000 more on November. December's payable drops by 700,000
  // through the carry trigger, but nothing relabels December.
  const before = await runCheck(t);
  await pay(B_NOV, 700000); await cashLeg(202, S1, '2026-11', 700000);
  const dec = (await t.query(`SELECT status::text, recorded_payment, total_amount, carry_in_credit, carry_in_debt FROM public.invoices WHERE id = '${DEC}'`)).rows[0];
  const g4 = await runCheck(t);
  const rule = (await t.query(`SELECT public.invoice_paid_label($1::bigint, $2::bigint, 600000, 600000)::text AS l`,
    [dec.recorded_payment, 600000 + dec.carry_in_debt - dec.carry_in_credit])).rows[0].l;
  ok(`KNOWN GAP G-4 pinned: December's payable is now ${600000 + dec.carry_in_debt - dec.carry_in_credit} with ${dec.recorded_payment} recorded - the rule says "${rule}", the bill still reads "${dec.status}"; M11 counts it (${before.M11.n} -> ${g4.M11.n})`,
     g4.M11.n === before.M11.n + 1 && dec.status === 'partial' && rule === 'paid', { dec, rule, M11: g4.M11 });
  ok('  and every "must be 0" check is still 0 - the label gap is a report, not a guard failure',
     Object.entries(g4).filter(([id, v]) => v.kind === 'must be 0' && v.n !== 0 && id !== 'M20').length === 0);
  await t.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
