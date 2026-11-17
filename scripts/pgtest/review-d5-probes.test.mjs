// REVIEW (D5 fix round 1, review-d5): independent probes. Registered in
// run.mjs since D5 fix round 2, with the three PROBE findings turned round to
// the safe behaviour: M-2 (refresh_invoice_carry is not callable by a signed-in
// account), M-3 (a backdated created_at is overwritten with now()), N-1 (the
// computed_at-only upsert still writes its row - now what the header says).
// The two D5 migrations ON TOP of the whole D4 chain as it will be on live
// after today's paste: D1, D2, the freeze, D4 1a floors (zz_invoice_state_floor),
// 1b register, 3B money inputs (frozen-bill delete/keep guards, student delete
// guard, audit_discount_definitions), then 20261009120000 carry, 20261113090000
// label, 20261117110000 (G-4) and 20261117111000 (G-11).
//
// usage: node <this file> [worktree root]   (default: the repo this file is in)
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const ROOT = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (f) => pathToFileURL(resolve(ROOT, 'scripts', 'pgtest', f)).href;
const { harness, migPath, sqlOf } = await import(P('d4-prelude.mjs'));
const { makeInputsDb } = await import(P('d4-inputs-prelude.mjs'));

const BASE = [
  '20261009130000_audit_every_admin_action.sql',
  '20261027090000_cancelled_lesson_attendance_guard.sql',
  '20261106090000_attendance_enrollment_guard.sql',
  '20261112090000_session_held_evidence.sql',
  '20261112091000_session_cancel_guard.sql',
  '20261106120000_invoice_tuition_freeze.sql',
  '20261114090000_d4_floors.sql',
  '20261114091000_d4_core_register.sql',
  '20261106100000_attendance_guard_no_auto_changes.sql',
  '20261106100001_date_aware_enrollment_changes.sql',
  '20261113120000_pause_enrollment_admin_only.sql',
  '20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql',
  '20261114094000_d4_money_inputs_guard.sql',
];
const CARRY = '20261009120000_keep_invoice_carry_balances_correct.sql';
const LABEL = '20261113090000_invoice_paid_label.sql';
const G4 = '20261117110000_carry_refresh_relabels.sql';
const G11 = '20261117111000_ledger_append_only_and_audit.sql';

let db;
const H = harness(() => db);
const { ok, section, as, tryIt } = H;
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const PARENT = '00000000-0000-4000-8000-0000000000f1';

db = await makeInputsDb(BASE);
await db.exec(`
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'partial', 'credit');
  ALTER TABLE public.invoices ALTER COLUMN status DROP DEFAULT;
  ALTER TABLE public.invoices ALTER COLUMN status TYPE public.invoice_status USING status::public.invoice_status;
  ALTER TABLE public.invoices ALTER COLUMN status SET DEFAULT 'draft';
  CREATE TABLE public.ledger_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, code text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(student_id, code));
  CREATE TABLE public.ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tx_id uuid NOT NULL, tx_key text UNIQUE,
    account_id uuid NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
    debit integer NOT NULL DEFAULT 0, credit integer NOT NULL DEFAULT 0, month text NOT NULL, memo text,
    occurred_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.expenditures(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amount numeric NOT NULL, category text NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE);
  CREATE TABLE public.settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, month text, amount integer);
  CREATE TABLE public.monthly_finance_snapshots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, month text);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
`);
let loadErr = null;
for (const f of [CARRY, LABEL, G4, G11]) {
  try {
    await db.exec(sqlOf(migPath(f)));
    // Live grants EXECUTE on refresh_invoice_carry to authenticated (Supabase's
    // default privileges; has_function_privilege = true on 17 Nov). Recreate
    // that BEFORE G-4, as the paste will meet it.
    if (f === CARRY) await db.exec(`GRANT EXECUTE ON FUNCTION public.refresh_invoice_carry(uuid) TO authenticated, service_role`);
  } catch (e) { loadErr = { f, code: e.code, message: e.message }; break; }
}
ok('the two D5 files install on top of the D4 chain incl. 3B (and carry + label)', loadErr === null, loadErr);
const twice = await tryIt(async () => { await db.exec(sqlOf(migPath(G4))); await db.exec(sqlOf(migPath(G11))); return true; });
ok('  and both paste a second time', twice.ok === true, twice);

const q1 = async (sql, p = []) => (await db.query(sql, p)).rows[0];
const kid = async (name) => (await q1(`INSERT INTO public.students(full_name) VALUES ($1) RETURNING id`, [name])).id;
const bill = (s, m) => q1(`SELECT status::text, confirmation_status, tuition_frozen, base_amount, total_amount, recorded_payment,
  carry_in_credit, carry_in_debt FROM public.invoices WHERE student_id = $1 AND month = $2`, [s, m]);
const floor = (s, m) => q1(`SELECT ever_paid, ever_signed, ever_frozen, jsonb_array_length(causes) n FROM public.invoice_state_floor WHERE student_id = $1 AND month = $2`, [s, m]);
const noCarry = (on) => db.exec(`ALTER TABLE public.invoices ${on ? 'ENABLE' : 'DISABLE'} TRIGGER invoices_carry_sync`);

await section('G-4 relabel under the floor and 3B triggers', async () => {
  const a = await kid('A');
  await noCarry(false);
  await db.query(`INSERT INTO public.invoices(student_id, month, status, base_amount, total_amount, recorded_payment) VALUES
    ($1, '2026-07', 'paid', 500000, 500000, 500000), ($1, '2026-08', 'paid', 0, 0, 0)`, [a]);
  await noCarry(true);
  const r = await tryIt(() => as(ADMIN, 'authenticated', 'authenticated',
    `UPDATE public.invoices SET discount_amount = 0 WHERE student_id = $1 AND month = '2026-07'`, [a]));
  ok('A: an ordinary admin write to July passes every trigger', r.code === undefined, r);
  const aug = await bill(a, '2026-08');
  ok('A: August (zero charge, nothing recorded, stored paid) is relabelled issued', aug.status === 'issued', aug);
  const f = await floor(a, '2026-08');
  ok('A: and the bill floor records ever_paid for August, so the D4 settled tiers still count it', f?.ever_paid === true, f);

  const b = await kid('B');
  await noCarry(false);
  await db.query(`INSERT INTO public.invoices(student_id, month, status, base_amount, total_amount, recorded_payment) VALUES
    ($1, '2026-07', 'paid', 300000, 300000, 900000)`, [b]);
  await db.query(`INSERT INTO public.invoices(student_id, month, status, base_amount, total_amount, recorded_payment, confirmation_status, tuition_frozen) VALUES
    ($1, '2026-08', 'issued', 400000, 400000, 0, 'confirmed', true)`, [b]);
  await noCarry(true);
  const r2 = await tryIt(() => as(null, 'service_role', 'service_role',
    `UPDATE public.invoices SET discount_amount = 0 WHERE student_id = $1 AND month = '2026-07'`, [b]));
  ok('B: a service-role write passes (relabel of a frozen, confirmed later bill trips no 3B guard)', r2.code === undefined, r2);
  const augB = await bill(b, '2026-08');
  ok('B: the frozen confirmed August becomes paid; confirmation_status, frozen and figures kept',
    augB.status === 'paid' && augB.confirmation_status === 'confirmed' && augB.tuition_frozen === true && augB.total_amount === 400000, augB);

  const c = await kid('C');
  await noCarry(false);
  await db.query(`INSERT INTO public.invoices(student_id, month, status, base_amount, total_amount, recorded_payment) VALUES
    ($1, '2026-07', 'paid', 100, 100, 100), ($1, '2026-08', 'credit', 100, 100, 0), ($1, '2026-09', 'draft', 100, 100, 500)`, [c]);
  await noCarry(true);
  await db.query(`UPDATE public.invoices SET discount_amount = 0 WHERE student_id = $1 AND month = '2026-07'`, [c]);
  ok('C: credit and draft kept', (await bill(c, '2026-08')).status === 'credit' && (await bill(c, '2026-09')).status === 'draft');

  // D: live grants EXECUTE on refresh_invoice_carry to authenticated (recreated
  // above, before G-4); fix round 2 (M-2) revokes it in G-4.
  const d = await kid('D');
  await noCarry(false);
  await db.query(`INSERT INTO public.invoices(student_id, month, status, base_amount, total_amount, recorded_payment) VALUES
    ($1, '2026-08', 'paid', 0, 0, 0)`, [d]);
  await noCarry(true);
  const audBefore = (await q1(`SELECT count(*)::int n FROM public.audit_log WHERE entity = 'invoices'`)).n;
  const flBefore = await floor(d, '2026-08');
  const r3 = await tryIt(() => as(PARENT, 'authenticated', 'authenticated', `SELECT public.refresh_invoice_carry($1)`, [d]));
  const dAug = await bill(d, '2026-08');
  const audAfter = (await q1(`SELECT count(*)::int n FROM public.audit_log WHERE entity = 'invoices'`)).n;
  const fl = await floor(d, '2026-08');
  ok('D (M-2 fixed): a role-less signed-in account calling the RPC for another child is refused (42501); the bill, its floor and the audit are untouched',
    r3.code === '42501' && dAug.status === 'paid' && JSON.stringify(fl) === JSON.stringify(flBefore) && audAfter === audBefore,
    { r3, dAug, audBefore, audAfter, flBefore, fl });
  const g = await q1(`SELECT has_function_privilege('authenticated', 'public.refresh_invoice_carry(uuid)', 'EXECUTE') au,
                             has_function_privilege('anon', 'public.refresh_invoice_carry(uuid)', 'EXECUTE') an,
                             has_function_privilege('service_role', 'public.refresh_invoice_carry(uuid)', 'EXECUTE') sr`);
  ok('D: EXECUTE is gone for authenticated and anon, kept for service_role', !g.au && !g.an && g.sr, g);
  const r3b = await tryIt(() => as(ADMIN, 'authenticated', 'authenticated',
    `UPDATE public.invoices SET discount_amount = 0 WHERE student_id = $1 AND month = '2026-08'`, [d]));
  ok('D: and the trigger still refreshes for a signed-in admin\'s ordinary write (it runs as the owner): August relabelled issued',
    r3b.code === undefined && (await bill(d, '2026-08')).status === 'issued', r3b);
});

await section('G-11 with the 3B student delete guard', async () => {
  const e = await kid('E');
  const acct = (await q1(`INSERT INTO public.ledger_accounts(student_id, code) VALUES ($1, 'AR') RETURNING id`, [e])).id;
  await db.query(`INSERT INTO public.ledger_entries(tx_id, account_id, debit, month) VALUES (gen_random_uuid(), $1, 100, '2026-08')`, [acct]);
  const r = await tryIt(() => db.query(`DELETE FROM public.students WHERE id = $1`, [e]));
  ok('E: ledger rows but no payment / paid bill / marks: 3B lets the delete through, G-11 refuses it (HC130), even as owner',
    r.code === 'HC130', r);
  const f = await kid('F');
  await db.query(`INSERT INTO public.payments(student_id, amount) VALUES ($1, 100)`, [f]);
  const fa = (await q1(`INSERT INTO public.ledger_accounts(student_id, code) VALUES ($1, 'AR') RETURNING id`, [f])).id;
  await db.query(`INSERT INTO public.ledger_entries(tx_id, account_id, debit, month) VALUES (gen_random_uuid(), $1, 100, '2026-08')`, [fa]);
  const r2 = await tryIt(() => db.query(`DELETE FROM public.students WHERE id = $1`, [f]));
  ok('F: a child with a payment: 3B refuses first (HC121)', r2.code === 'HC121', r2);
  const g = await kid('G');
  await db.query(`INSERT INTO public.ledger_accounts(student_id, code) VALUES ($1, 'AR')`, [g]);
  const r3 = await tryIt(() => db.query(`DELETE FROM public.students WHERE id = $1`, [g]));
  ok('G: an account with no ledger row: the child deletes as before', r3.code === undefined, r3);

  const n = (await q1(`SELECT count(*)::int n FROM pg_trigger WHERE tgrelid = 'public.discount_definitions'::regclass AND NOT tgisinternal AND tgfoid = 'public.audit_row_change'::regproc`)).n;
  ok('discount_definitions has exactly one audit trigger after 3B + G-11', n === 1, n);
  const before = (await q1(`SELECT count(*)::int n FROM public.audit_log WHERE entity = 'discount_definitions'`)).n;
  await db.query(`INSERT INTO public.discount_definitions(name, type, cadence, value, start_month) VALUES ('x', 'percent', 'monthly', 5, '2026-08')`);
  const after = (await q1(`SELECT count(*)::int n FROM public.audit_log WHERE entity = 'discount_definitions'`)).n;
  ok('  one insert -> one audit row', after === before + 1, { before, after });

  const fam = (await q1(`INSERT INTO public.families(name) VALUES ('fam') RETURNING id`)).id;
  const up = `INSERT INTO public.sibling_discount_state(family_id, month, status, sibling_percent, computed_at)
              VALUES ($1, '2026-08', 'none', 5, clock_timestamp())
              ON CONFLICT (family_id, month) DO UPDATE SET status = EXCLUDED.status, computed_at = EXCLUDED.computed_at`;
  await db.query(up, [fam]);
  const s0 = (await q1(`SELECT count(*)::int n FROM public.audit_log WHERE entity = 'sibling_discount_state'`)).n;
  await db.query(up, [fam]);
  const s1 = (await q1(`SELECT count(*)::int n FROM public.audit_log WHERE entity = 'sibling_discount_state'`)).n;
  ok('N-1 (as the G-11 header now says): an upsert that changes only computed_at writes one audit row', s1 === s0 + 1, { s0, s1 });

  const h = await kid('H');
  const ha = (await q1(`INSERT INTO public.ledger_accounts(student_id, code) VALUES ($1, 'AR') RETURNING id`, [h])).id;
  const r4 = await tryIt(() => as(ADMIN, 'authenticated', 'service_role',
    `INSERT INTO public.ledger_entries(tx_id, account_id, credit, month, created_at) VALUES (gen_random_uuid(), $1, 777000, '2025-10', '2025-10-13 00:00+00')`, [ha]));
  const h4 = await q1(`SELECT created_at >= now() - interval '1 minute' AS stamped FROM public.ledger_entries WHERE account_id = $1`, [ha]);
  ok('M-3 fixed: an unkeyed leg sent with created_at in Oct 2025 goes in dated now() (so M01 sees it, not M41)', r4.code === undefined && h4?.stamped === true, { r4, h4 });
});

const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
