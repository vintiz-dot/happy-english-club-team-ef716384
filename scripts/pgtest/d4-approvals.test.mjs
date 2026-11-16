// D4 step 4: two-administrator approval, BUILT SWITCHED OFF.
//
// Spec: docs/evidence/D4-design.md revision 2 b.8, c.6, (e), f.3 "Approvals";
// the review's R-12, A-4, A-15, A-16, A-17, A-18; the owner's ruling D-22.
// Build notes: docs/evidence/D4-build-4.md.
//
// Drives the REAL migrations - D1, D2, every D4 file 1a..3B and file 6
// (20261114095000_d4_change_approvals.sql) - on the D4 release prelude
// (guard-fingerprint.mjs D4_BUILD), and rollback 6 (argv[2]).
//
// Proves:
//   OFF (as shipped): the same scenario run on 1a..3B alone and on 1a..3B + 6
//   gives the same answers, rows and tiers - nothing waits for approval; a
//   request is refused as not needed.
//   ON: a change over the threshold waits; nothing is written until a second
//   administrator approves; the requester cannot approve, reject or release
//   early; a stale approval is refused and recorded; an expired one too; the
//   audit rows are written and append-only; R-12 (batch and 24 hours); the
//   three triggers (D2's changes, the admin role, pay carried forward); the
//   setting (two admins, loosening needs the other); A-15; rollback 6.
//
// Child processes (one pglite each): --scenario off-without | off-with | preflight.
import { PGlite } from '@electric-sql/pglite';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { harness } from './d4-prelude.mjs';
import { D4_BUILD } from './guard-fingerprint.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const { prelude, baseline, files, mig } = D4_BUILD;
const F6 = '20261114095000_d4_change_approvals.sql';
const lf = (s) => s.replace(/\r\n/g, '\n');
// The mutation runner (d4-mutants.mjs) hands a mutated copy of file 6 through the environment.
const f6 = () => (process.env.D4_FILE6_OVERRIDE ? lf(readFileSync(process.env.D4_FILE6_OVERRIDE, 'utf8')) : mig(F6));
const rollback6 = process.argv.find((a) => /ROLLBACK-d4-6-approvals\.sql$/.test(a)) ?? resolve(repo, 'scripts/ROLLBACK-d4-6-approvals.sql');

const A1 = '00000000-0000-4000-8000-0000000000a1';   // the administrator who asks
const A2 = '00000000-0000-4000-8000-0000000000a2';   // the other administrator
const A3 = '00000000-0000-4000-8000-0000000000a3';   // an account given the admin role under approval
const TU = '00000000-0000-4000-8000-0000000000b1';   // a teacher (no admin role)
const A4 = '00000000-0000-4000-8000-0000000000a4';   // an administrator who worked while approval was off
const A5 = '00000000-0000-4000-8000-0000000000a5';   // an administrator making single changes in one day
const R = 'Entered against the wrong month by mistake';
const CORR = 'Correction: the confirmed bill was wrong';

async function makeDb(withF6) {
  const db = new PGlite();
  await db.exec(prelude);
  for (const f of baseline) await db.exec(mig(f));
  for (const f of files) if (f !== F6) await db.exec(mig(f)); else if (withF6) await db.exec(f6());
  return db;
}

/** The people, a teacher, and helpers to make lessons with a child and a bill. */
async function world(db, H) {
  const { as, clock } = H;
  const su = (sql, p) => as(null, '', null, sql, p);
  const q1 = async (sql, p) => (await su(sql, p)).rows[0];
  await su(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'teacher')`, [A1, TU]);
  const teacherId = (await q1(`INSERT INTO teachers(user_id, full_name) VALUES ($1,'t') RETURNING id`, [TU])).id;
  const OLD = await clock(-40);
  const OLD_MONTH_1 = `${OLD.month}-01`;
  let slot = 0;
  /** A taught lesson 40 days ago in its own class, one child (own family) marked Present by the teacher, a bill. */
  async function lesson({ recorded = 1000000, conf = 'auto_approved', frozen = false, kids = 1 } = {}) {
    const cls = randomUUID();
    await su(`INSERT INTO classes(id, default_teacher_user, name) VALUES ($1,$2,'c')`, [cls, TU]);
    const start = `${String(8 + (slot % 10)).padStart(2, '0')}:00`;
    const end = `${String(9 + (slot % 10)).padStart(2, '0')}:00`;
    slot++;
    const sid = (await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,'Held',$5) RETURNING id`,
      [cls, OLD.date, start, end, teacherId])).id;
    const out = [];
    for (let i = 0; i < kids; i++) {
      const fam = (await q1(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).id;
      const kid = (await q1(`INSERT INTO students(full_name, family_id) VALUES ('k',$1) RETURNING id`, [fam])).id;
      await su(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [cls, kid]);
      await su(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',$3)`, [sid, kid, TU]);
      const inv = (await q1(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
                             VALUES ($1,$2,'issued',540000,540000,$3,$4,$5) RETURNING id`, [kid, OLD.month, recorded, conf, frozen])).id;
      out.push({ kid, fam, inv });
    }
    return { cls, sid, kid: out[0].kid, inv: out[0].inv, kids: out };
  }
  return { su, q1, teacherId, OLD, OLD_MONTH_1, lesson };
}

/** Money and D2 calls as a person. */
function calls(H) {
  const { as, tryIt } = H;
  const preview = async (entity, op, args, uid = A1) =>
    (await as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_preview($1,$2,$3::jsonb) r`, [entity, op, JSON.stringify(args)])).rows[0].r;
  const checked = (entity, op, args, ack, uid = A1) =>
    as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_checked($1,$2,$3::jsonb,$4,$5,$6,$7,'{}'::jsonb) r`,
      [entity, op, JSON.stringify(args), ack.reason, ack.token, ack.confirm, ack.correction_reason]).then((r) => r.rows[0].r);
  const ackOf = (p) => ({ reason: p.tier >= 1 ? R : null, token: p.token, confirm: p.tier >= 1, correction_reason: p.tier === 3 ? CORR : null });
  const go = async (entity, op, args, uid = A1) => { const p = await preview(entity, op, args, uid); return tryIt(() => checked(entity, op, args, ackOf(p), uid)); };
  const bulkItem = async (entity, op, args, uid = A1) => { const p = await preview(entity, op, args, uid);
    return { entity, op, args, token: p.token, confirm: p.tier >= 1, reason: p.tier >= 2 ? R : null, correction_reason: p.tier === 3 ? CORR : null }; };
  const bulk = (items, uid = A1, batch = randomUUID()) =>
    tryIt(() => as(uid, 'authenticated', 'authenticated', `SELECT public.money_changes_checked_bulk($1::jsonb,$2,$3,'{}'::jsonb) r`,
      [JSON.stringify(items), R, batch]).then((r) => r.rows[0].r));
  const sPreview = async (sid, action = 'cancel', uid = A1) =>
    (await as(uid, 'authenticated', 'authenticated', `SELECT public.session_change_preview($1,$2) r`, [sid, action])).rows[0].r;
  const sCancel = async (sid, uid = A1) => { const p = await sPreview(sid, 'cancel', uid);
    return tryIt(() => as(uid, 'authenticated', 'authenticated', `SELECT public.cancel_session_checked($1,'cancel',$2,$3,$4,$5,'{}'::jsonb) r`,
      [sid, R, p.token, p.tier >= 1, p.tier === 3 ? CORR : null]).then((r) => r.rows[0].r)); };
  const sBulkItem = async (sid, uid = A1) => { const p = await sPreview(sid, 'cancel', uid);
    return { id: sid, token: p.token, confirm: p.tier >= 1, reason: p.tier >= 2 ? R : null, correction_reason: p.tier === 3 ? CORR : null }; };
  const sBulk = (items, uid = A1, batch = randomUUID()) =>
    tryIt(() => as(uid, 'authenticated', 'authenticated', `SELECT public.cancel_sessions_checked_bulk($1::jsonb,$2,$3,'{}'::jsonb) r`,
      [JSON.stringify(items), R, batch]).then((r) => r.rows[0].r));
  const rpc = (uid, sql, p = []) => tryIt(() => as(uid, 'authenticated', 'authenticated', sql, p).then((r) => r.rows[0]?.r));
  const ask = (kind, fn, params, token = null, uid = A1) =>
    rpc(uid, `SELECT public.request_change_approval($1,$2,$3::jsonb,$4) r`, [kind, fn, JSON.stringify(params), token]);
  const look = (id, uid = A2) => rpc(uid, `SELECT public.approval_request_preview($1) r`, [id]);
  const approve = (id, token, uid = A2, note = null) => rpc(uid, `SELECT public.approve_change_request($1,$2,$3) r`, [id, token, note]);
  const settings = (patch, uid = A1) => rpc(uid, `SELECT public.set_change_approval_settings($1::jsonb,$2) r`, [JSON.stringify(patch), R]);
  return { preview, checked, ackOf, go, bulkItem, bulk, sPreview, sCancel, sBulkItem, sBulk, rpc, ask, look, approve, settings };
}

// ================================================================== children
async function offScenario(withF6) {
  let db;
  const H = harness(() => db);
  db = await makeDb(withF6);
  const W = await world(db, H);
  const C = calls(H);
  const out = {};
  const np = (p) => p && { tier: p.tier, allowed: p.allowed, refuse_code: p.refuse_code ?? null, approval: p.approval,
                           requires: p.requires, review_required: p.review_required };
  const nr = (r) => (r.ok !== undefined ? { tier: r.ok?.tier ?? null, review_required: r.ok?.review_required ?? null,
                                            written: r.ok?.written ?? null, done: r.ok?.done?.length ?? null, refused: r.ok?.refused?.length ?? null }
                                         : { code: r.code });
  // the same things an admin does on an ordinary day, and the big ones
  const small = await W.lesson({ recorded: 1000000 });
  const big = await W.lesson({ recorded: 6000000 });
  const signed = await W.lesson({ recorded: 1000000, conf: 'confirmed' });
  const fee = await W.lesson({ recorded: 1000000, conf: 'confirmed' });
  const frozen = await W.lesson({ recorded: 1000000, frozen: true });
  const cancel3 = await W.lesson({ recorded: 6000000, conf: 'confirmed' });
  const bulkL = [await W.lesson(), await W.lesson(), await W.lesson()];
  const sb = [await W.lesson({ conf: 'confirmed' }), await W.lesson({ conf: 'confirmed' })];
  const marks = (l, status = 'Excused') => ({ session_id: l.sid, marks: [{ student_id: l.kid, status }] });

  out.p_small = np(await C.preview('attendance', 'set_marks', marks(small)));
  out.p_big = np(await C.preview('attendance', 'set_marks', marks(big)));
  out.p_signed = np(await C.preview('attendance', 'set_marks', marks(signed)));
  out.p_fee = np(await C.preview('class_fee', 'set', { class_id: fee.cls, effective_from: W.OLD_MONTH_1, session_rate_vnd: 250000 }));
  out.p_unfreeze = np(await C.preview('invoice_freeze', 'unfreeze', { invoice_id: frozen.inv }));
  out.g_small = nr(await C.go('attendance', 'set_marks', marks(small)));
  out.g_big = nr(await C.go('attendance', 'set_marks', marks(big)));
  out.g_signed = nr(await C.go('attendance', 'set_marks', marks(signed)));
  out.g_fee = nr(await C.go('class_fee', 'set', { class_id: fee.cls, effective_from: W.OLD_MONTH_1, session_rate_vnd: 250000 }));
  out.g_unfreeze = nr(await C.go('invoice_freeze', 'unfreeze', { invoice_id: frozen.inv }));
  const items = [];
  for (const l of bulkL) items.push(await C.bulkItem('attendance', 'set_marks', marks(l)));
  out.g_bulk = nr(await C.bulk(items));
  out.s_preview = np(await C.sPreview(cancel3.sid));
  out.s_cancel = nr(await C.sCancel(cancel3.sid));
  const sItems = [];
  for (const l of sb) sItems.push(await C.sBulkItem(l.sid));
  out.s_bulk = nr(await C.sBulk(sItems));
  const thisMonth = (await H.clock(0)).month;
  out.pay = nr(await H.tryIt(() => H.as(A1, 'authenticated', 'authenticated',
    `INSERT INTO payroll_adjustments(month, origin_month, teacher_id, amount_vnd, reason) VALUES ($1,$2,$3,150000,'found after close') RETURNING 1 AS tier`,
    [thisMonth, W.OLD.month, W.teacherId]).then((r) => r.rows[0])));
  out.grant = nr(await H.tryIt(() => H.as(null, 'service_role', 'service_role', `INSERT INTO user_roles VALUES ($1,'admin') RETURNING 0 AS tier`, [A3]).then((r) => r.rows[0])));
  out.state = (await W.q1(`SELECT
      (SELECT jsonb_agg(jsonb_build_array(entity, op, tier, review_required) ORDER BY entity, op, tier, review_required) FROM money_change_overrides) mo,
      (SELECT jsonb_agg(jsonb_build_array(action, tier, review_required) ORDER BY action, tier) FROM session_cancel_overrides) so,
      (SELECT jsonb_agg(jsonb_build_array(status::text) ORDER BY status::text) FROM sessions) ss,
      (SELECT jsonb_agg(jsonb_build_array(status) ORDER BY status) FROM attendance) aa,
      (SELECT count(*)::int FROM invoices WHERE tuition_frozen) frozen,
      (SELECT count(*)::int FROM payroll_adjustments) adj,
      (SELECT count(*)::int FROM user_roles WHERE role = 'admin') admins,
      (SELECT jsonb_agg(jsonb_build_array(kind) ORDER BY kind) FROM money_change_events WHERE kind <> 'guard_installed') ev`));
  if (withF6) {
    out.approval_rows = (await W.q1(`SELECT (SELECT count(*)::int FROM change_approval_requests) r,
                                            (SELECT count(*)::int FROM change_approval_events) e`));
    out.ask_off = (await C.ask('money', 'money_change_checked', { entity: 'attendance', op: 'set_marks', args: marks(small, 'Present') })).message ?? null;
  }
  await db.close();
  console.log('RESULT ' + JSON.stringify(out));
}

async function preflightScenario() {
  const results = [];
  const ok = (label, cond, detail) => results.push({ label, ok: !!cond, detail: cond ? undefined : detail });
  // without 3B: refused, nothing installed
  let db = new PGlite();
  await db.exec(prelude);
  for (const f of baseline) await db.exec(mig(f));
  for (const f of files) if (!/094000|095000/.test(f)) await db.exec(mig(f));
  let msg = null;
  try { await db.exec(f6()); } catch (e) { msg = e.message; }
  await db.exec('ROLLBACK').catch(() => {});
  ok('preflight: without step 3B the file refuses, naming what is missing', /d4_change_approvals cannot be installed/.test(msg ?? '') &&
     /_money_plan__enrollment|zz_enrollment_money_guard/.test(msg ?? ''), msg);
  const n = (await db.query(`SELECT to_regclass('public.change_approval_settings') t,
     (SELECT count(*)::int FROM pg_trigger WHERE tgname = 'zz_session_override_approval') g`)).rows[0];
  ok('preflight:   and installs nothing (no table, no trigger)', n.t === null && n.g === 0, n);
  // 3B in, then a 1b body that is not the reviewed one
  await db.exec(mig(files.find((f) => /094000/.test(f))));
  await db.exec(`CREATE OR REPLACE FUNCTION public.money_changes_checked_bulk(p_items jsonb, p_reason text, p_batch_id uuid, p_context jsonb DEFAULT '{}'::jsonb)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$ BEGIN RETURN '{}'::jsonb; END $f$;`);
  msg = null;
  try { await db.exec(f6()); } catch (e) { msg = e.message; }
  await db.exec('ROLLBACK').catch(() => {});
  ok('preflight: a bulk RPC that is not the reviewed 1b body (one that might catch HC060) -> refused, naming it',
     /money_changes_checked_bulk\(jsonb, text, uuid, jsonb\) is not the reviewed body/.test(msg ?? ''), msg);
  await db.close();
  // the real chain, then twice and as CRLF
  db = await makeDb(true);
  msg = null;
  try { await db.exec(lf(f6()).replace(/\n/g, '\r\n')); await db.exec(f6()); } catch (e) { msg = e.message; }
  ok('the file pastes a second time and as CRLF (its own bodies are pinned with CR stripped)', msg === null, msg);
  const rows = (await db.query(`SELECT count(*)::int n, bool_and(NOT enabled) off FROM change_approval_settings`)).rows[0];
  ok('  still exactly one settings row, still off', rows.n === 1 && rows.off === true, rows);
  await db.close();
  console.log('RESULT ' + JSON.stringify(results));
}

const si = process.argv.indexOf('--scenario');
if (si > 0) {
  const s = process.argv[si + 1];
  if (s === 'off-without') await offScenario(false);
  else if (s === 'off-with') await offScenario(true);
  else if (s === 'preflight') await preflightScenario();
  process.exit(0);
}

// ================================================================== parent
let db;
const H = harness(() => db);
const { ok, section, as, tryIt, script, counts } = H;
const child = (s) => {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--scenario', s], { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('RESULT '));
  if (!line) { ok(`scenario ${s} ran`, false, { status: r.status, err: String(r.stderr ?? '').slice(-600) }); return null; }
  return JSON.parse(line.slice(7));
};

await section('preflight and install', async () => {
  const res = child('preflight');
  for (const x of res ?? []) ok(x.label, x.ok, x.detail);
});

await section('OFF: identical to the database without file 6', async () => {
  const a = child('off-without');
  const b = child('off-with');
  if (!a || !b) return;
  const { approval_rows, ask_off, ...bSame } = b;
  for (const k of Object.keys(a)) ok(`OFF: "${k}" is the same with file 6 installed`, JSON.stringify(a[k]) === JSON.stringify(bSame[k]), { without: a[k], with: bSame[k] });
  ok('OFF: the scenario reached every tier: a T2 over 5,000,000, a T3, a fee change into a signed month, an unfreeze, a batch, D2 cancels',
     a.p_big.tier === 2 && a.p_signed.tier === 3 && a.p_fee.tier === 3 && a.p_unfreeze.tier >= 2 && a.g_bulk.done === 3 && a.s_bulk.done === 2 &&
     a.s_preview.tier === 3, a);
  ok('OFF: every preview says approval not required (file 6\'s answer equals the stub\'s)',
     ['p_small', 'p_big', 'p_signed', 'p_fee', 'p_unfreeze'].every((k) => b[k].approval.required === false && b[k].approval.reasons.length === 0 &&
       Object.keys(b[k].approval).length === 2), b);
  ok('OFF: every change applied at once - nothing waits (no HC060 anywhere)',
     !JSON.stringify(b).includes('HC060') && ['g_small', 'g_big', 'g_signed', 'g_fee', 'g_unfreeze', 's_cancel', 'pay', 'grant'].every((k) => !b[k].code), b);
  ok('OFF: not one approval request or event was written', approval_rows?.r === 0 && approval_rows?.e === 0, approval_rows);
  ok('OFF: asking for an approval is refused as not needed (HC015 approval_not_needed)', ask_off === 'approval_not_needed', ask_off);
});

// ------------------------------------------------------------------ the main database: file 6 installed
db = await makeDb(true);
const W = await world(db, H);
const C = calls(H);
const { su, q1 } = W;
const marks = (l, status = 'Excused') => ({ session_id: l.sid, marks: [{ student_id: l.kid, status }] });
const markOf = async (l) => (await q1(`SELECT status FROM attendance WHERE session_id=$1 AND student_id=$2`, [l.sid, l.kid])).status;
const countOf = async (t, where = 'true') => (await q1(`SELECT count(*)::int n FROM ${t} WHERE ${where}`)).n;
const events = async (id) => (await su(`SELECT kind, actor_user_id, payload FROM change_approval_events WHERE request_id=$1 ORDER BY created_at, id`, [id])).rows;
const params = (entity, op, args, p) => ({ entity, op, args, reason: p.tier >= 1 ? R : null, confirm: p.tier >= 1, correction_reason: p.tier === 3 ? CORR : null });

await section('install: the objects, grants and defaults', async () => {
  const st = await q1(`SELECT * FROM change_approval_settings`);
  ok('the setting ships OFF with the ruling\'s defaults (tier3, closed payroll, unfreeze, pay carried; 3 families; 5,000,000 VND; 168 h; no solo release)',
     st.enabled === false && st.on_tier3 && st.on_closed_payroll && st.on_unfreeze && st.on_pay_adjustment && st.min_families === 3 &&
     Number(st.min_paid_vnd) === 5000000 && st.expiry_hours === 168 && st.solo_release_after_hours === null, st);
  const g = (await su(`SELECT p.proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') au, has_function_privilege('anon', p.oid, 'EXECUTE') an,
       has_function_privilege('service_role', p.oid, 'EXECUTE') sr FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname IN ('request_change_approval','approval_request_preview','approve_change_request','reject_change_request','withdraw_change_request',
                         'release_own_request','acknowledge_released_request','set_change_approval_settings','change_approval_status',
                         'change_approval_needed','_change_request_claim','_approval_plan','_approval_decide','_approval_execute','grant_admin_role',
                         'carry_payroll_adjustments','_money_change_full_plan')`)).rows;
  const pub = ['request_change_approval', 'approval_request_preview', 'approve_change_request', 'reject_change_request', 'withdraw_change_request',
    'release_own_request', 'acknowledge_released_request', 'set_change_approval_settings', 'change_approval_status'];
  ok('grants: the nine RPCs for authenticated only; the rule, the claim, the planner, the writers (grant_admin_role, carry_payroll_adjustments): nobody',
     g.length === 17 && g.every((r) => (pub.includes(r.proname) ? r.au && !r.an && !r.sr : !r.au && !r.an && !r.sr)), g);
  const t = (await su(`SELECT relname, relrowsecurity rls, has_table_privilege('authenticated', c.oid, 'INSERT') ai, has_table_privilege('authenticated', c.oid, 'SELECT') asel,
       has_table_privilege('anon', c.oid, 'SELECT') ansel, has_table_privilege('service_role', c.oid, 'INSERT') si
       FROM pg_class c WHERE relname IN ('change_approval_settings','change_approval_requests','change_approval_events')`)).rows;
  ok('tables: RLS on; authenticated SELECT only; anon nothing; service_role ALL (house rule; the triggers refuse its writes)',
     t.length === 3 && t.every((r) => r.rls && !r.ai && r.asel && !r.ansel && r.si), t);
  const sr = await tryIt(() => as(null, 'service_role', 'service_role', `UPDATE change_approval_settings SET enabled = true`));
  ok('the service role cannot switch approval on behind the function (HC041)', sr.code === 'HC041', sr);
  const sr2 = await tryIt(() => as(null, 'service_role', 'service_role', `INSERT INTO change_approval_events(kind, payload) VALUES ('settings_changed','{}')`));
  ok('  nor write an approval event (HC041)', sr2.code === 'HC041', sr2);
  const ad = await tryIt(() => as(A1, 'authenticated', 'authenticated', `UPDATE change_approval_settings SET enabled = true`));
  ok('  an administrator cannot either, except through set_change_approval_settings (no UPDATE privilege)', ad.code === '42501', ad);
  const tq = await tryIt(() => as(TU, 'authenticated', 'authenticated', `SELECT count(*)::int n FROM change_approval_requests`).then((r) => r.rows[0].n));
  const tv = await tryIt(() => as(TU, 'authenticated', 'authenticated', `SELECT count(*)::int n FROM change_approval_queue`).then((r) => r.rows[0].n));
  ok('a teacher reads no request (RLS) and no queue row (security_invoker view)', tq.ok === 0 && tv.ok === 0, { tq, tv });
  const ts = await C.rpc(TU, `SELECT public.change_approval_status() r`);
  ok('a teacher cannot read the status card (42501)', ts.code === '42501', ts);
  const src = f6();
  ok('one transaction, lock_timeout 5s, NOTIFY pgrst, no partial unique index, no row of an existing table written',
     /^BEGIN;\s*\n\s*SET LOCAL lock_timeout = '5s';/m.test(lf(src)) && /NOTIFY pgrst, 'reload schema';/.test(src) && !/UNIQUE INDEX[^;]*WHERE/i.test(src) &&
     (src.match(/^INSERT INTO public\.\w+/gm) ?? []).join() === 'INSERT INTO public.change_approval_settings');
  const chat = ['chat', '_lib'].map((d) => { try { return spawnSync('git', ['grep', '-l', '-E', 'approve_change_request|request_change_approval|set_change_approval_settings|release_own_request|change_request_ok', '--', `supabase/functions/${d}`], { cwd: repo, encoding: 'utf8' }).stdout.trim(); } catch { return 'x'; } });
  ok('the chat function and the shared function code have no path to any approval RPC (no write path)', chat.every((x) => x === ''), chat);
});

// ------------------------------------------------------------------ switching on
await section('switching on: two administrators', async () => {
  const one = await C.settings({ enabled: true });
  ok('with ONE administrator it cannot be switched on (HC065 two_admins)', one.code === 'HC065' && /two_admins/.test(one.detail ?? ''), one);
  const t = await C.settings({ enabled: true }, TU);
  ok('a teacher cannot change the setting (42501)', t.code === '42501', t);
  const shortR = await C.rpc(A1, `SELECT public.set_change_approval_settings('{"enabled": true}'::jsonb, 'short') r`);
  ok('a reason is required to change it (HC010)', shortR.code === 'HC010', shortR);
  const bad = await C.settings({ enabled: 'yes' });
  const unk = await C.settings({ approve_everything: true });
  ok('a malformed or unknown setting is refused (HC015 bad_setting)', bad.message === 'bad_setting' && unk.message === 'bad_setting', { bad, unk });
  // while still off: a third administrator makes three single-family T2 changes (they count in the window once on)
  await su(`INSERT INTO user_roles VALUES ($1,'admin')`, [A4]);
  const early = [];
  for (let i = 0; i < 3; i++) {
    const l = await W.lesson({ recorded: 100000 });
    early.push(await C.go('attendance', 'set_marks', marks(l), A4));
  }
  ok('while off, three single-family T2 changes by one administrator all apply at once', early.every((g) => !!g.ok?.override_id), early);
  await su(`DELETE FROM user_roles WHERE user_id = $1`, [A4]);
  await su(`INSERT INTO user_roles VALUES ($1,'admin')`, [A2]);
  const on = await C.settings({ enabled: true });
  ok('with two administrators: switched on at once (tightening needs nobody else)', on.ok?.settings?.enabled === true && on.ok?.loosens === false, on);
  const ev = await q1(`SELECT * FROM change_approval_events WHERE kind = 'settings_changed' ORDER BY created_at DESC LIMIT 1`);
  ok('  recorded: a settings_changed event naming who, the reason, before and after', ev?.actor_user_id === A1 && ev.payload.reason === R &&
     ev.payload.before.enabled === false && ev.payload.after.enabled === true, ev);
  const s = await C.rpc(A2, `SELECT public.change_approval_status() r`);
  ok('the status card: on, installed, two admins, nothing waiting, the switch-off statement for a school left with one admin',
     s.ok?.enabled === true && s.ok?.installed === true && s.ok?.admin_count === 2 && s.ok?.pending === 0 && /UPDATE public\.change_approval_settings SET enabled = false/.test(s.ok?.off_statement ?? ''), s);
});

// ------------------------------------------------------------------ the threshold
let paidReq;
const big = await W.lesson({ recorded: 6000000 });
await section('ON: under the threshold nothing waits; over it, the change waits', async () => {
  const small = await W.lesson({ recorded: 1000000 });
  const p = await C.preview('attendance', 'set_marks', marks(small));
  ok('a T2 change of one family with 1,000,000 recorded: preview says no approval', p.tier === 2 && p.approval.required === false, p);
  const g = await C.go('attendance', 'set_marks', marks(small));
  ok('  and it is applied directly', !!g.ok?.override_id && (await markOf(small)) === 'Excused', g);
  const t1 = await W.lesson({ recorded: 0, conf: 'auto_approved' });
  const p1 = await C.preview('attendance', 'set_marks', marks(t1));
  ok('a T1 change (billed, nothing paid) never waits on the families / paid lines', p1.tier === 1 && p1.approval.required === false, p1);

  const pb = await C.preview('attendance', 'set_marks', marks(big), A1);
  ok('a T2 change reaching 6,000,000 recorded: preview says approval required, reason "paid" (the 5,000,000 VND line)',
     pb.tier === 2 && pb.approval.required === true && JSON.stringify(pb.approval.reasons) === '["paid"]' && pb.approval.totals.paid_vnd >= 6000000, pb);
  const before = await countOf('money_change_overrides');
  const g2 = await tryIt(() => C.checked('attendance', 'set_marks', marks(big), C.ackOf(pb)));
  ok('  money_change_checked refuses it: HC060 approval_required, reasons in the detail', g2.code === 'HC060' && /paid/.test(g2.detail ?? ''), g2);
  ok('  nothing written: the mark is still Present, no override row', (await markOf(big)) === 'Present' && (await countOf('money_change_overrides')) === before);

  const r = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(big), pb), pb.token);
  paidReq = r.ok?.request_id;
  ok('request_change_approval: one pending request, its reasons, expiring in 7 days', !!paidReq && r.ok.status === 'pending' &&
     JSON.stringify(r.ok.reasons) === '["paid"]', r);
  const row = await q1(`SELECT * FROM change_approval_requests WHERE id=$1`, [paidReq]);
  const hours = (new Date(row.expires_at) - new Date(row.created_at)) / 3600000;
  ok('  the request stores the asker, what was asked (reason, confirmation, args), one fingerprint, the target, 168 hours',
     row.requested_by === A1 && row.kind === 'money' && row.rpc === 'money_change_checked' && row.params.reason === R && row.params.confirm === true &&
     row.fingerprints.length === 1 && row.target_keys[0] === `attendance:${big.sid}` && Math.round(hours) === 168, row);
  const ev = await events(paidReq);
  ok('  a "requested" event by the asker', ev.length === 1 && ev[0].kind === 'requested' && ev[0].actor_user_id === A1, ev);
  ok('  and still nothing applied', (await markOf(big)) === 'Present' && (await countOf('money_change_overrides')) === before);
  const dup = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(big), pb), pb.token);
  ok('a second request for the same target while one waits: HC063, naming the waiting request', dup.code === 'HC063' && dup.detail?.includes(paidReq), dup);
  const bt = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(big), pb), 'not-the-token');
  ok('asking with a token that is not the preview\'s: HC011 (the request is checked as the change would be)', bt.code === 'HC011', bt);
  const small2 = await W.lesson({ recorded: 1000000 });
  const ps2 = await C.preview('attendance', 'set_marks', marks(small2));
  const park = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(small2), ps2), ps2.token);
  ok('a change that needs no approval cannot be parked as a request (HC015 approval_not_needed)', park.message === 'approval_not_needed', park);
  const l9 = await W.lesson({ recorded: 6000000 });
  const p9 = await C.preview('attendance', 'set_marks', marks(l9));
  const nr = await C.ask('money', 'money_change_checked', { entity: 'attendance', op: 'set_marks', args: marks(l9), reason: null, confirm: true }, p9.token);
  const nc = await C.ask('money', 'money_change_checked', { entity: 'attendance', op: 'set_marks', args: marks(l9), reason: R, confirm: false }, p9.token);
  ok('asking without the reason or the confirmation the change needs: HC010 / HC012, no request', nr.code === 'HC010' && nc.code === 'HC012' &&
     (await countOf('change_approval_requests', `target_keys && ARRAY['attendance:${l9.sid}']`)) === 0, { nr, nc });
});

await section('ON: the requester cannot approve; the other administrator can', async () => {
  const self = await C.look(paidReq, A1);
  const sa = await C.approve(paidReq, self.ok?.token, A1);
  ok('the requester approving their own request: HC061 self_approval, naming who can', sa.code === 'HC061' && sa.detail?.includes(A2), sa);
  ok('  the requester\'s preview says they cannot approve', self.ok?.can_approve === false && self.ok?.can_withdraw === true, self.ok);
  const sr = await C.rpc(A1, `SELECT public.reject_change_request($1,$2) r`, [paidReq, R]);
  ok('the requester rejecting it: HC061 (withdraw instead)', sr.code === 'HC061', sr);
  const tch = await C.approve(paidReq, 'x', TU);
  ok('a teacher approving: 42501', tch.code === '42501', tch);
  ok('  after all three: nothing applied, still pending', (await markOf(big)) === 'Present' &&
     (await q1(`SELECT status FROM change_approval_queue WHERE request_id=$1`, [paidReq])).status === 'pending');
  const forge = await script(A1, 'authenticated', 'authenticated',
    `SELECT set_config('hec.change_request_ok', '${paidReq}', true); SELECT public.money_change_checked('attendance','set_marks','${JSON.stringify(marks(big))}'::jsonb,'${R}','${(await C.preview('attendance', 'set_marks', marks(big))).token}',true,NULL,'{}'::jsonb)`);
  ok('naming the request in hec.change_request_ok by hand claims nothing (no approval event in this transaction): HC060', forge?.code === 'HC060', forge);

  const v = await C.look(paidReq, A2);
  ok('the other administrator\'s preview: the change recomputed as them, not stale, can approve, a token of their own',
     v.ok?.can_approve === true && v.ok.stale === false && typeof v.ok.token === 'string' && v.ok.now.items[0].tier === 2, v);
  const wrong = await C.approve(paidReq, self.ok?.token, A2);
  ok('approving with the requester\'s token: HC011 (the token is the approver\'s own)', wrong.code === 'HC011', wrong);
  const a = await C.approve(paidReq, v.ok.token, A2, 'Checked with the family: they were away');
  ok('approving: applied in the same call', a.ok?.status === 'applied' && a.ok.override_ids.length === 1, a);
  ok('  the mark is now Excused', (await markOf(big)) === 'Excused');
  const o = await q1(`SELECT * FROM money_change_overrides WHERE id=$1`, [a.ok?.override_ids?.[0]]);
  ok('  the override row: the approver ran it (actor), the asker and the request are named in attached; tier 2, reason as asked',
     o?.actor_user_id === A2 && o.attached.requested_by === A1 && o.attached.approval_request_id === paidReq && o.tier === 2 && o.reason === R, o);
  const ev = await events(paidReq);
  ok('  the audit: requested (asker), approved (approver, with the note), applied (approver, listing the override)',
     JSON.stringify(ev.map((e) => e.kind)) === '["requested","approved","applied"]' && ev[1].actor_user_id === A2 &&
     ev[1].payload.note === 'Checked with the family: they were away' && ev[2].payload.override_ids[0] === o?.id, ev);
  const again = await C.approve(paidReq, v.ok.token, A2);
  ok('approving again: HC062 request_not_pending', again.code === 'HC062', again);
  const up = await tryIt(() => su(`UPDATE change_approval_events SET kind = 'rejected' WHERE request_id = $1`, [paidReq]));
  const del = await tryIt(() => su(`DELETE FROM change_approval_requests WHERE id = $1`, [paidReq]));
  ok('requests and events are append-only, for the owner too (HC040)', up.code === 'HC040' && del.code === 'HC040', { up, del });
  const q = await q1(`SELECT * FROM change_approval_queue WHERE request_id=$1`, [paidReq]);
  ok('the queue shows it applied, decided by the approver, with the override ids', q.status === 'applied' && q.decided_by === A2 &&
     q.decision === 'approved' && q.override_ids[0] === o?.id, q);
});

await section('ON: a stale approval is refused and recorded', async () => {
  const l = await W.lesson({ recorded: 6000000 });
  const p = await C.preview('attendance', 'set_marks', marks(l));
  const r = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l), p), p.token);
  const v = await C.look(r.ok?.request_id, A2);
  // a payment lands on the bill after the request (the facts the change was approved against moved)
  await su(`UPDATE invoices SET recorded_payment = recorded_payment + 10000 WHERE id = $1`, [l.inv]);
  const v2 = await C.look(r.ok?.request_id, A2);
  ok('after a payment lands, the approver\'s preview says stale and cannot approve', v2.ok?.stale === true && v2.ok.can_approve === false, v2.ok);
  const a = await C.approve(r.ok?.request_id, v.ok?.token, A2);
  ok('approving it: status "stale", nothing applied', a.ok?.status === 'stale' && (await markOf(l)) === 'Present', a);
  const ev = await events(r.ok?.request_id);
  ok('  a "stale" event is written by the approver, with the fingerprint now', ev.at(-1)?.kind === 'stale' && ev.at(-1).actor_user_id === A2 &&
     Array.isArray(ev.at(-1).payload.fingerprints_now), ev);
  const again = await C.approve(r.ok?.request_id, v2.ok?.token, A2);
  ok('  and it can no longer be approved (HC062)', again.code === 'HC062', again);

  // stale for another reason: the mark itself was changed after the request
  const l2 = await W.lesson({ recorded: 6000000 });
  const p2 = await C.preview('attendance', 'set_marks', marks(l2));
  const r2 = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l2), p2), p2.token);
  await su(`UPDATE attendance SET status = 'Absent' WHERE session_id = $1`, [l2.sid]);
  const v3 = await C.look(r2.ok?.request_id, A2);
  const a3 = await C.approve(r2.ok?.request_id, v3.ok?.token, A2);
  ok('the mark changed after the request: stale, nothing applied (still Absent)', a3.ok?.status === 'stale' && v3.ok?.stale === true &&
     (await markOf(l2)) === 'Absent', { a3, v3: v3.ok?.stale });

  // an approval is not a vehicle: inside the approver's own transaction, the
  // approved request cannot be claimed for a different change
  const lx = await W.lesson({ recorded: 6000000 }), ly = await W.lesson({ recorded: 6000000 });
  const px = await C.preview('attendance', 'set_marks', marks(lx));
  const rx = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(lx), px), px.token);
  const vx = await C.look(rx.ok?.request_id, A2);
  const py = await C.preview('attendance', 'set_marks', marks(ly), A2);
  const vehicle = await script(A2, 'authenticated', 'authenticated',
    `SELECT public.approve_change_request('${rx.ok?.request_id}', '${vx.ok?.token}', NULL);
     SELECT set_config('hec.change_request_ok', '${rx.ok?.request_id}', true);
     SELECT public.money_change_checked('attendance','set_marks','${JSON.stringify(marks(ly))}'::jsonb,'${R}','${py.token}',true,NULL,'{}'::jsonb)`);
  ok('approving X and then re-using X\'s claim for another change Y in the same transaction: HC060, and X is not applied either',
     vehicle?.code === 'HC060' && (await markOf(ly)) === 'Present' && (await markOf(lx)) === 'Present' &&
     (await q1(`SELECT status FROM change_approval_queue WHERE request_id=$1`, [rx.ok?.request_id])).status === 'pending', vehicle);
});

await section('ON: expiry, withdrawal, rejection', async () => {
  const l = await W.lesson({ recorded: 6000000 });
  const p = await C.preview('attendance', 'set_marks', marks(l));
  const r = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l), p), p.token);
  const row = await q1(`SELECT * FROM change_approval_requests WHERE id=$1`, [r.ok?.request_id]);
  // the same request as a row made 8 days ago (owner fixture: requests are append-only, written by the owner)
  const old = (await q1(`INSERT INTO change_approval_requests(created_at, requested_by, kind, rpc, params, target_keys, batch, impact, reasons, preview, fingerprints, expires_at)
     SELECT now() - interval '8 days', requested_by, kind, rpc, params, ARRAY['fixture:expired'], batch, impact, reasons, preview, fingerprints, now() - interval '1 day'
       FROM change_approval_requests WHERE id = $1 RETURNING id`, [row.id])).id;
  const v = await C.look(old, A2);
  const a = await C.approve(old, v.ok?.token, A2);
  ok('an expired request (more than 7 days): HC064 request_expired, nothing applied', a.code === 'HC064' && (await markOf(l)) === 'Present' &&
     v.ok?.status === 'expired', { a, s: v.ok?.status });
  const rj0 = await C.rpc(A2, `SELECT public.reject_change_request($1,$2) r`, [r.ok?.request_id, 'no']);
  ok('rejecting needs a sentence (HC010)', rj0.code === 'HC010', rj0);
  const rj = await C.rpc(A2, `SELECT public.reject_change_request($1,$2) r`, [r.ok?.request_id, 'The family has paid in full: keep the mark']);
  ok('the other administrator rejects it with a sentence: rejected, nothing applied', rj.ok?.status === 'rejected' && (await markOf(l)) === 'Present', rj);
  const l2 = await W.lesson({ recorded: 6000000 });
  const p2 = await C.preview('attendance', 'set_marks', marks(l2));
  const r2 = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l2), p2), p2.token);
  const wo = await C.rpc(A2, `SELECT public.withdraw_change_request($1) r`, [r2.ok?.request_id]);
  ok('only the asker can withdraw (42501 for the other administrator)', wo.code === '42501', wo);
  const w = await C.rpc(A1, `SELECT public.withdraw_change_request($1) r`, [r2.ok?.request_id]);
  ok('the asker withdraws: withdrawn, a new request for the same target is then accepted', w.ok?.status === 'withdrawn' &&
     !!(await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l2), p2), p2.token)).ok?.request_id, w);
});

await section('ON: tier 3, a fee change into a signed month, an unfreeze, a closed payroll month', async () => {
  const s3 = await W.lesson({ recorded: 100000, conf: 'confirmed' });
  const p3 = await C.preview('attendance', 'set_marks', marks(s3));
  ok('a T3 change (a confirmed bill of a past month) with 100,000 recorded: reason tier3', p3.tier === 3 && p3.approval.reasons.includes('tier3'), p3);
  const fee = await W.lesson({ recorded: 100000, conf: 'confirmed' });
  const pf = await C.preview('class_fee', 'set', { class_id: fee.cls, effective_from: W.OLD_MONTH_1, session_rate_vnd: 250000 });
  ok('a class fee dated into a signed month (step 2; its own impact names no tier): tier3 - the plan\'s tier reaches the rule',
     pf.tier === 3 && pf.approval.required === true && pf.approval.reasons.includes('tier3'), pf);
  const next1 = (await q1(`SELECT to_char(date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '1 month', 'YYYY-MM-DD') d`)).d;
  const pn = await C.preview('class_fee', 'set', { class_id: fee.cls, effective_from: next1, session_rate_vnd: 260000 });
  ok('a fee rise from next month (T0; its impact names no tier either) needs nobody - the plan\'s tier, not "unknown = T3", is judged',
     pn.tier === 0 && pn.approval.required === false, pn);
  const fz = await W.lesson({ recorded: 100000, frozen: true });
  const pu = await C.preview('invoice_freeze', 'unfreeze', { invoice_id: fz.inv });
  ok('unfreezing a bill: reason unfreeze', pu.approval.reasons.includes('unfreeze'), pu);
  const gu = await C.go('invoice_freeze', 'unfreeze', { invoice_id: fz.inv });
  ok('  refused HC060 and the bill stays frozen', gu.code === 'HC060' && (await q1(`SELECT tuition_frozen f FROM invoices WHERE id=$1`, [fz.inv])).f === true, gu);
  // a closed payroll month: lock it, then move a Held lesson's teacher there (3A reteach, pay tier 3)
  const pl = await W.lesson({ recorded: 0 });
  await su(`INSERT INTO payroll_periods(month, status) VALUES ($1, 'locked') ON CONFLICT (month) DO UPDATE SET status = 'locked'`, [W.OLD.month]);
  const t2 = (await q1(`INSERT INTO teachers(user_id, full_name) VALUES (gen_random_uuid(),'t2') RETURNING id`)).id;
  const pp = await C.preview('session', 'reteach', { session_id: pl.sid, teacher_id: t2 });
  ok('a teacher change on a lesson of a closed payroll month (3A): reasons closed_payroll and tier3', pp.approval?.reasons?.includes('closed_payroll') &&
     pp.approval.reasons.includes('tier3'), pp);
  await su(`UPDATE payroll_periods SET status = 'open' WHERE month = $1`, [W.OLD.month]);
});

await section('ON: D2\'s own changes (zz_session_override_approval)', async () => {
  const l = await W.lesson({ recorded: 6000000, conf: 'confirmed' });
  const before = await countOf('session_cancel_overrides');
  const c = await C.sCancel(l.sid);
  ok('cancelling a taught lesson whose month is settled (D2 T3), unchanged D2 code: HC060 from the insert trigger', c.code === 'HC060', c);
  ok('  nothing written: the lesson still Held, no D2 override row', (await q1(`SELECT status::text s FROM sessions WHERE id=$1`, [l.sid])).s === 'Held' &&
     (await countOf('session_cancel_overrides')) === before);
  const p = await C.sPreview(l.sid);
  const r = await C.ask('session', 'cancel_session_checked', { session_id: l.sid, action: 'cancel', reason: R, confirm: true, correction_reason: CORR }, p.token);
  ok('one request of kind session', !!r.ok?.request_id && r.ok.reasons.includes('tier3'), r);
  const v = await C.look(r.ok?.request_id, A2);
  const a = await C.approve(r.ok?.request_id, v.ok?.token, A2);
  const s = await q1(`SELECT status::text s, canceled_by, canceled_reason FROM sessions WHERE id=$1`, [l.sid]);
  ok('approved: the lesson is cancelled by D2\'s own function (canceled_by = the approver; the reason as asked)', a.ok?.status === 'applied' &&
     s.s === 'Canceled' && s.canceled_by === A2 && s.canceled_reason === R, { a, s });
  const o = await q1(`SELECT * FROM session_cancel_overrides WHERE id=$1`, [a.ok?.override_ids?.[0]]);
  ok('  D2\'s override row names the approver, carries the asker in attached, and is still for review (T3)', o?.actor_user_id === A2 &&
     o.attached.requested_by === A1 && o.review_required === true, o);
  // a batch: two settled lessons; the bulk RPC does not catch HC060, so the chunk is refused whole
  const b1 = await W.lesson({ conf: 'confirmed' }), b2 = await W.lesson({ conf: 'confirmed' });
  const items = [await C.sBulkItem(b1.sid), await C.sBulkItem(b2.sid)];
  const bulk = await C.sBulk(items);
  ok('D2 bulk cancel of two settled lessons: HC060 for the whole call, neither cancelled', bulk.code === 'HC060' &&
     (await countOf('sessions', `id IN ('${b1.sid}','${b2.sid}') AND status = 'Canceled'`)) === 0, bulk);
  const batch = randomUUID();
  const rb = await C.ask('session', 'cancel_sessions_checked_bulk', { items, reason: R, batch_id: batch });
  ok('one request holds the batch (two fingerprints)', !!rb.ok?.request_id &&
     (await q1(`SELECT cardinality(fingerprints) n, batch FROM change_approval_requests WHERE id=$1`, [rb.ok?.request_id])).n === 2, rb);
  const vb = await C.look(rb.ok?.request_id, A2);
  const ab = await C.approve(rb.ok?.request_id, vb.ok?.token, A2);
  ok('approved: both cancelled in one transaction, two D2 override rows with the batch id', ab.ok?.status === 'applied' && ab.ok.override_ids.length === 2 &&
     (await countOf('session_cancel_overrides', `batch_id = '${batch}'`)) === 2, ab);
});

await section('ON: R-12 - a batch is judged whole, and so are the same person\'s last 24 hours', async () => {
  const ls = [];
  for (let i = 0; i < 15; i++) ls.push(await W.lesson({ recorded: 200000 }));
  const items = [];
  for (const l of ls) items.push(await C.bulkItem('attendance', 'set_marks', marks(l), A2));
  ok('each of 15 single-family items alone needs no approval (T2, one family, 200,000)', (await C.preview('attendance', 'set_marks', marks(ls[0]), A2)).approval.required === false);
  const before = await countOf('money_change_overrides');
  const b = await C.bulk(items, A2);
  ok('the 15 as one bulk call: HC060 (the third item reaches 3 families), and NOT ONE item written', b.code === 'HC060' &&
     (await countOf('money_change_overrides')) === before && (await markOf(ls[0])) === 'Present', b);
  const batch = randomUUID();
  const r = await C.ask('money', 'money_changes_checked_bulk', { items, reason: R, batch_id: batch }, null, A2);
  const row = await q1(`SELECT * FROM change_approval_requests WHERE id=$1`, [r.ok?.request_id]);
  ok('one request for the whole batch: 15 fingerprints, reason families, total 15 families', row?.batch === true && row.fingerprints.length === 15 &&
     row.reasons.includes('families') && Number(row.impact.families) === 15, row ?? r);
  const v = await C.look(r.ok?.request_id, A1);
  const a = await C.approve(r.ok?.request_id, v.ok?.token, A1);
  ok('approved by the other administrator: all 15 applied (50 per call, none refused), each override names the request',
     a.ok?.status === 'applied' && a.ok.override_ids.length === 15 &&
     (await countOf('money_change_overrides', `attached->>'approval_request_id' = '${r.ok?.request_id}'`)) === 15 && (await markOf(ls[14])) === 'Excused', a);

  // three single changes by one admin within 24 hours: the third requires approval
  const s1 = await W.lesson({ recorded: 100000 }), s2 = await W.lesson({ recorded: 100000 }), s3 = await W.lesson({ recorded: 100000 });
  const T = A5;
  await su(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'admin')`, [T, A4]);
  // A4's three changes made while approval was off are in A4's window now
  const e1 = await W.lesson({ recorded: 0 }), e2 = await W.lesson({ recorded: 100000 });
  const pe1 = await C.preview('attendance', 'set_marks', marks(e1), A4);
  const pe2 = await C.preview('attendance', 'set_marks', marks(e2), A4);
  ok('the window counts T2 changes made while approval was off: a T2 change of a fourth family needs approval (families)',
     pe2.tier === 2 && pe2.approval.required === true && pe2.approval.reasons.includes('families') && pe2.approval.totals.window_families === 3, pe2.approval);
  ok('  but a T1 change by the same person does not wait on the families / paid lines, whatever the window', pe1.tier === 1 && pe1.approval.required === false, pe1.approval);
  const g1 = await C.go('attendance', 'set_marks', marks(s1), T);
  const g2 = await C.go('attendance', 'set_marks', marks(s2), T);
  const p3 = await C.preview('attendance', 'set_marks', marks(s3), T);
  ok('one admin, three single-family T2 changes in a day: the first two apply, the third needs approval (families: 1 + 2 in the window)',
     !!g1.ok && !!g2.ok && p3.approval.required === true && p3.approval.reasons.includes('families') && p3.approval.totals.window_families === 2, { g1, g2, p3 });
  const p3b = await C.preview('attendance', 'set_marks', marks(s3), A1);
  ok('  the 15 A1 approved for A2 do not count in A1\'s own window (changes applied under an approval are not counted again)',
     p3b.approval.required === false && p3b.approval.totals.window_families === 1, p3b.approval);   // 1 = A1's own direct T2 change earlier
  await su(`DELETE FROM user_roles WHERE user_id IN ($1, $2)`, [T, A4]);
});

await section('ON: pay carried forward (A-4) and the admin role (A-18)', async () => {
  const month = (await H.clock(0)).month;
  const raw = await tryIt(() => as(A1, 'authenticated', 'authenticated',
    `INSERT INTO payroll_adjustments(month, origin_month, teacher_id, amount_vnd, reason) VALUES ($1,$2,$3,150000,'found after close')`, [month, W.OLD.month, W.teacherId]));
  ok('carrying a payroll correction forward from the screen: HC060 (reason pay_adjustment), nothing inserted', raw.code === 'HC060' &&
     /pay_adjustment/.test(raw.detail ?? '') && (await countOf('payroll_adjustments')) === 0, raw);
  const rows = [{ month, origin_month: W.OLD.month, teacher_id: W.teacherId, assistant_id: null, amount_vnd: 150000, reason: 'Correction found after close' }];
  const r = await C.ask('money', 'carry_payroll_adjustments', { rows });
  ok('a request for the carry', !!r.ok?.request_id && r.ok.reasons.includes('pay_adjustment'), r);
  const v = await C.look(r.ok?.request_id, A2);
  const a = await C.approve(r.ok?.request_id, v.ok?.token, A2);
  const adj = await q1(`SELECT * FROM payroll_adjustments`);
  ok('approved: one adjustment row, as asked, created by the approver', a.ok?.status === 'applied' && adj?.amount_vnd === 150000 && adj.created_by === A2, { a, adj });
  const r2 = await C.ask('money', 'carry_payroll_adjustments', { rows: [{ ...rows[0], amount_vnd: 20000 }] });
  await su(`INSERT INTO payroll_adjustments(month, origin_month, teacher_id, amount_vnd, reason) VALUES ($1,$2,$3,5000,'owner fix')`, [month, W.OLD.month, W.teacherId]);
  const v2 = await C.look(r2.ok?.request_id, A2);
  const a2 = await C.approve(r2.ok?.request_id, v2.ok?.token, A2);
  ok('a carry for the same person and month made meanwhile makes the request stale (no double payment)', a2.ok?.status === 'stale' &&
     (await countOf('payroll_adjustments')) === 2, a2);

  const sv = await tryIt(() => as(null, 'service_role', 'service_role', `INSERT INTO user_roles VALUES ($1,'admin')`, [A3]));
  ok('giving the admin role on the service lane (the admin-user function) while on: HC060', sv.code === 'HC060' && !(await q1(`SELECT public.has_role($1,'admin') h`, [A3])).h, sv);
  const tr = await tryIt(() => as(null, 'service_role', 'service_role', `INSERT INTO user_roles VALUES ($1,'teacher')`, [A3]));
  ok('  any other role is unaffected (a teacher account is created as before)', tr.ok !== undefined, tr);
  const r3 = await C.ask('settings', 'grant_admin_role', { user_id: A3, reason: R });
  const v3 = await C.look(r3.ok?.request_id, A2);
  const a3 = await C.approve(r3.ok?.request_id, v3.ok?.token, A2);
  ok('a grant_admin request approved by the other administrator gives the role', a3.ok?.status === 'applied' && (await q1(`SELECT public.has_role($1,'admin') h`, [A3])).h === true, a3);
  const direct = await C.rpc(A1, `SELECT public.grant_admin_role($1,$2) r`, [A2, R]);
  ok('grant_admin_role is not callable by an administrator directly (no grant)', direct.code === '42501', direct);
  await su(`DELETE FROM user_roles WHERE user_id = $1 AND role = 'admin'`, [A3]);
});

await section('ON: the setting - loosening needs the other administrator; solo release (A-17)', async () => {
  const off = await C.settings({ enabled: false });
  ok('switching off while on: HC065 loosen (it needs the other administrator)', off.code === 'HC065' && /loosen/.test(off.detail ?? ''), off);
  const up = await C.settings({ min_paid_vnd: 9000000 });
  ok('raising the 5,000,000 line is loosening too: HC065', up.code === 'HC065', up);
  const tight = await C.settings({ min_families: 2 });
  ok('tightening (2 families) applies at once', tight.ok?.settings?.min_families === 2, tight);
  const back = await C.ask('settings', 'set_change_approval_settings', { patch: { min_families: 3 }, reason: R });
  const vb = await C.look(back.ok?.request_id, A2);
  const ab = await C.approve(back.ok?.request_id, vb.ok?.token, A2);
  ok('putting it back to 3 is a request; approved by the other administrator, applied', ab.ok?.status === 'applied' &&
     (await q1(`SELECT min_families m FROM change_approval_settings`)).m === 3, ab);

  const l = await W.lesson({ recorded: 6000000 });
  const p = await C.preview('attendance', 'set_marks', marks(l));
  const r = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l), p), p.token);
  const mine = await C.look(r.ok?.request_id, A1);
  const early = await C.rpc(A1, `SELECT public.release_own_request($1,$2) r`, [r.ok?.request_id, mine.ok?.token]);
  ok('releasing one\'s own request with solo release off (the default): HC065 solo_release_off', early.code === 'HC065' && /solo_release_off/.test(early.detail ?? ''), early);
  const solo = await C.ask('settings', 'set_change_approval_settings', { patch: { solo_release_after_hours: 48 }, reason: R });
  const vs = await C.look(solo.ok?.request_id, A2);
  await C.approve(solo.ok?.request_id, vs.ok?.token, A2);
  const notYet = await C.rpc(A1, `SELECT public.release_own_request($1,$2) r`, [r.ok?.request_id, (await C.look(r.ok?.request_id, A1)).ok?.token]);
  ok('with 48 hours set, releasing before the delay: HC065 solo_release_not_yet, nothing applied', notYet.code === 'HC065' &&
     /not_yet/.test(notYet.detail ?? '') && (await markOf(l)) === 'Present', notYet);
  const aged = (await q1(`INSERT INTO change_approval_requests(created_at, requested_by, kind, rpc, params, target_keys, batch, impact, reasons, preview, fingerprints, expires_at)
     SELECT now() - interval '49 hours', requested_by, kind, rpc, params, ARRAY['fixture:aged'], batch, impact, reasons, preview, fingerprints, now() + interval '5 days'
       FROM change_approval_requests WHERE id = $1 RETURNING id`, [r.ok?.request_id])).id;
  await C.rpc(A1, `SELECT public.withdraw_change_request($1) r`, [r.ok?.request_id]);
  const other = await C.rpc(A2, `SELECT public.release_own_request($1,$2) r`, [aged, 'x']);
  ok('only the asker can release (42501)', other.code === '42501', other);
  const ma = await C.look(aged, A1);
  const rel = await C.rpc(A1, `SELECT public.release_own_request($1,$2) r`, [aged, ma.ok?.token]);
  ok('after 49 hours undecided the asker releases it: applied, the mark changed', rel.ok?.status === 'applied' && rel.ok.released_alone === true && (await markOf(l)) === 'Excused', rel);
  const ev = await events(aged);
  ok('  recorded as released_alone + applied, by the asker', JSON.stringify(ev.map((e) => e.kind)) === '["released_alone","applied"]' && ev[0].actor_user_id === A1, ev);
  const st = await C.rpc(A2, `SELECT public.change_approval_status() r`);
  const pv = await C.look(aged, A2);
  ok('  shown first to the other administrator: counted as released and unread, needs acknowledgement', st.ok?.released_unread === 1 && pv.ok?.needs_acknowledgement === true, { st: st.ok, pv: pv.ok?.needs_acknowledgement });
  const ackSelf = await C.rpc(A1, `SELECT public.acknowledge_released_request($1,$2) r`, [aged, null]);
  const ack = await C.rpc(A2, `SELECT public.acknowledge_released_request($1,$2) r`, [aged, 'Read: fine']);
  ok('  the asker cannot acknowledge it (HC061); the other administrator does', ackSelf.code === 'HC061' && ack.ok?.status === 'acknowledged' &&
     (await C.rpc(A2, `SELECT public.change_approval_status() r`)).ok?.released_unread === 0, { ackSelf, ack });
  const o = await q1(`SELECT * FROM money_change_overrides WHERE id = $1`, [rel.ok?.override_ids?.[0]]);
  ok('  the override names the asker as the one who ran it (released alone)', o?.actor_user_id === A1 && o.attached.approval_request_id === aged, o);
});

await section('fail closed: a missing or disabled piece', async () => {
  const l = await W.lesson({ recorded: 100000 });
  await su(`ALTER TABLE public.user_roles DISABLE TRIGGER zz_admin_grant_guard`);
  const d = await tryIt(() => C.preview('attendance', 'set_marks', marks(l)));
  ok('an approval trigger disabled while on: HC050 guard_broken naming it (not "not required")', d.code === 'HC050' && /zz_admin_grant_guard/.test(d.detail ?? ''), d);
  await su(`ALTER TABLE public.user_roles ENABLE TRIGGER zz_admin_grant_guard`);
  const saved = await q1(`SELECT * FROM change_approval_settings`);
  await su(`DELETE FROM change_approval_settings`);
  const m = await tryIt(() => C.preview('attendance', 'set_marks', marks(l)));
  ok('A-15: the settings row deleted: a money preview is HC050 guard_broken with the repair statement', m.code === 'HC050' &&
     /INSERT INTO public\.change_approval_settings/.test(m.detail ?? ''), m);
  const s2 = await C.sCancel(l.sid);
  ok('  and D2\'s cancel is refused the same way (HC050), nothing written', s2.code === 'HC050' &&
     (await q1(`SELECT status::text s FROM sessions WHERE id=$1`, [l.sid])).s === 'Held', s2);
  await su(`INSERT INTO change_approval_settings (id) VALUES (true)`);
  ok('  the repair statement brings the row back switched OFF', (await q1(`SELECT enabled FROM change_approval_settings`)).enabled === false);
  await su(`UPDATE change_approval_settings SET enabled = true, solo_release_after_hours = NULL, min_families = $1`, [saved.min_families]);
});

await section('rollback 6: approvals read as off', async () => {
  const l = await W.lesson({ recorded: 6000000 });
  const p = await C.preview('attendance', 'set_marks', marks(l));
  const r = await C.ask('money', 'money_change_checked', params('attendance', 'set_marks', marks(l), p), p.token);
  ok('before: on, the change needs approval and is waiting', p.approval.required === true && !!r.ok?.request_id, { p: p.approval, r });
  const rows = { req: await countOf('change_approval_requests'), ev: await countOf('change_approval_events') };
  let err = null;
  try { await db.exec(readFileSync(rollback6, 'utf8')); } catch (e) { err = e.message; }
  const left = await q1(`SELECT count(*)::int n FROM pg_trigger WHERE tgname IN ('zz_session_override_approval','zz_admin_grant_guard','zz_pay_adjustment_approval')`);
  ok('the script runs and drops the three triggers', err === null && left.n === 0, { err, left });
  ok('  the approval rows stay (the record of who asked and who decided)', (await countOf('change_approval_requests')) === rows.req &&
     (await countOf('change_approval_events')) === rows.ev);
  const p2 = await C.preview('attendance', 'set_marks', marks(l));
  ok('after: the same change needs no approval', p2.approval.required === false, p2.approval);
  const v = await C.look(r.ok?.request_id, A2);
  const a = await C.approve(r.ok?.request_id, v.ok?.token, A2);
  ok('  the waiting request can no longer be approved (HC050: rolled back)', a.code === 'HC050', a);
  const g = await C.go('attendance', 'set_marks', marks(l));
  ok('  the change is made directly', !!g.ok?.override_id && (await markOf(l)) === 'Excused', g);
  const s = await C.rpc(A1, `SELECT public.change_approval_status() r`);
  ok('  the status card says rolled back, not on', s.ok?.rolled_back === true && s.ok.enabled === false, s.ok);
  err = null;
  try { await db.exec(f6()); } catch (e) { err = e.message; }
  ok('file 6 pastes again after the rollback (its own bodies are accepted by its preflight) and approval is on again',
     err === null && (await C.preview('attendance', 'set_marks', marks(await W.lesson({ recorded: 6000000 })))).approval.required === true, err);
});

await db.close();
const { pass, fail } = counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
