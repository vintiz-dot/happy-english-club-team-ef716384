// D4 step 4, review probe (REVIEW-d4-step4.md), made a registered suite in
// fix round 1. The reviewer's probe P1-P4 ran against the real migrations
// (D4_BUILD: D1, D2, every D4 file 1a..3B and file 6) in pglite and PROVED
// B-1 (an approved pay carry rewritten by a plain UPDATE) and B-2 (an approved
// change whose bills nobody works out again). Here each probe asserts the fix:
//
//   P1/P2  ON: an approved carry cannot be raised, moved or deleted (B-1).
//   P3     OFF, the settings row: it cannot be deleted (decision 4 addition);
//          missing anyway, non-admin roles still work, the rest stops (HC050).
//   P4     ON: an approval made through guarded-change-refresh (as the
//          inbox does) ends in the same bill refresh as the direct path, for a
//          money change and a lesson cancel; the decision RPC alone does not
//          (why the screen no longer calls it directly) (B-2).
//   P5     ON: bulk-cancel-sessions over one chunk asks for the whole batch
//          first and changes nothing; a later chunk stopped by approval is
//          refreshed, audited and reported (M-1).
//   P6     ON: manage-admin-users refuses the admin role before making an
//          account or removing roles, and removes an account whose role was
//          refused anyway (M-2).
//
// The edge functions are bundled from the working tree and driven through
// d4-functions-harness.mjs (a stand-in for PostgREST over the same pglite).
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { harness } from './d4-prelude.mjs';
import { D4_BUILD } from './guard-fingerprint.mjs';
import { functionsHarness } from './d4-functions-harness.mjs';

const { prelude, baseline, files, mig } = D4_BUILD;
const F6 = '20261114095000_d4_change_approvals.sql';
const A1 = '00000000-0000-4000-8000-0000000000a1';
const A2 = '00000000-0000-4000-8000-0000000000a2';
const TU = '00000000-0000-4000-8000-0000000000b1';
const TU2 = '00000000-0000-4000-8000-0000000000b2';
const SU = '00000000-0000-4000-8000-0000000000c1';
const R = 'Entered against the wrong month by mistake';
const CORR = 'Correction: the confirmed bill was wrong';

let db;
const H = harness(() => db);
const { ok, section, as, tryIt, counts } = H;
db = new PGlite();
await db.exec(prelude);
for (const f of baseline) await db.exec(mig(f));
for (const f of files) await db.exec(mig(f));
const su = (sql, p) => as(null, '', null, sql, p);
const q1 = async (sql, p) => (await su(sql, p)).rows[0];
const rpc = (uid, sql, p = []) => tryIt(() => as(uid, 'authenticated', 'authenticated', sql, p).then((r) => r.rows[0]?.r));
const F = functionsHarness({ as, asSuper: su });
const T1 = 'jwt-a1', T2 = 'jwt-a2', TT = 'jwt-teacher';
F.jwts.set(T1, A1); F.jwts.set(T2, A2); F.jwts.set(TT, TU);

await su(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'admin'),($3,'teacher'),($4,'teacher')`, [A1, A2, TU, TU2]);
const t1 = (await q1(`INSERT INTO teachers(user_id, full_name) VALUES ($1,'t1') RETURNING id`, [TU])).id;
const t2 = (await q1(`INSERT INTO teachers(user_id, full_name) VALUES ($1,'t2') RETURNING id`, [TU2])).id;
const month = (await H.clock(0)).month;
const origin = (await H.clock(-40)).month;
const OLD = await H.clock(-40);

await section('P1/P2: ON, pay carried forward, then rewritten directly (B-1)', async () => {
  const on = await rpc(A1, `SELECT public.set_change_approval_settings('{"enabled": true}'::jsonb, $1) r`, [R]);
  ok('switched on', on.ok?.settings?.enabled === true, on);
  const raw = await tryIt(() => as(A1, 'authenticated', 'authenticated',
    `INSERT INTO payroll_adjustments(month, origin_month, teacher_id, amount_vnd, reason) VALUES ($1,$2,$3,150000,'x')`, [month, origin, t1]));
  ok('a direct carry is refused (HC060)', raw.code === 'HC060', raw);
  const rows = [{ month, origin_month: origin, teacher_id: t1, assistant_id: null, amount_vnd: 150000, reason: 'Correction found after close' }];
  const r = await rpc(A1, `SELECT public.request_change_approval('money','carry_payroll_adjustments',$1::jsonb,NULL) r`, [JSON.stringify({ rows })]);
  const v = await rpc(A2, `SELECT public.approval_request_preview($1) r`, [r.ok?.request_id]);
  const a = await rpc(A2, `SELECT public.approve_change_request($1,$2,NULL) r`, [r.ok?.request_id, v.ok?.token]);
  ok('A2 approved a 150,000 VND carry', a.ok?.status === 'applied', a);
  const up = await tryIt(() => as(A1, 'authenticated', 'authenticated', `UPDATE payroll_adjustments SET amount_vnd = 50000000 RETURNING amount_vnd`).then((x) => x.rows));
  const now = await q1(`SELECT amount_vnd, teacher_id FROM payroll_adjustments`);
  ok('PROBE P1: the requester cannot raise the approved carry to 50,000,000 by UPDATE (HC060, still 150,000)',
     up.code === 'HC060' && now.amount_vnd === 150000, { up, now });
  const mv = await tryIt(() => as(A1, 'authenticated', 'authenticated', `UPDATE payroll_adjustments SET teacher_id = $1 RETURNING teacher_id`, [t2]).then((x) => x.rows));
  ok('PROBE P2a: the carry cannot be moved to another teacher by UPDATE (HC060)', mv.code === 'HC060' &&
     (await q1(`SELECT teacher_id FROM payroll_adjustments`)).teacher_id === t1, mv);
  const del = await tryIt(() => as(A1, 'authenticated', 'authenticated', `DELETE FROM payroll_adjustments RETURNING id`).then((x) => x.rows.length));
  ok('PROBE P2b: the carry cannot be deleted while on (HC060), the row stays', del.code === 'HC060' &&
     (await q1(`SELECT count(*)::int n FROM payroll_adjustments`)).n === 1, del);
  await su(`UPDATE change_approval_settings SET enabled = false`);
  const offUp = await tryIt(() => as(A1, 'authenticated', 'authenticated', `UPDATE payroll_adjustments SET amount_vnd = 160000 RETURNING amount_vnd`).then((x) => x.rows));
  ok('  switched off again: the same UPDATE is accepted as before step 4', offUp.ok?.[0]?.amount_vnd === 160000, offUp);
});

await section('P3: OFF, the settings row', async () => {
  const del = await tryIt(() => su(`DELETE FROM change_approval_settings`));
  ok('P3-0 (decision 4 addition): the row cannot be deleted, by the table owner either (HC041)', del.code === 'HC041' &&
     (await q1(`SELECT count(*)::int n FROM change_approval_settings`)).n === 1, del);
  // deliberately removed (the guard trigger dropped for a moment), as the review's probe did
  await db.exec(`ALTER TABLE public.change_approval_settings DISABLE TRIGGER change_approval_settings_write_guard;
                 DELETE FROM public.change_approval_settings;
                 ALTER TABLE public.change_approval_settings ENABLE TRIGGER change_approval_settings_write_guard;`);
  const st = await tryIt(() => as(null, 'service_role', 'service_role', `INSERT INTO user_roles VALUES ($1,'student') RETURNING 1`, [SU]));
  ok('P3a a student role is still given (sign-ups unaffected)', !!st.ok, st);
  const adm = await tryIt(() => as(null, 'service_role', 'service_role', `INSERT INTO user_roles VALUES ($1,'admin') RETURNING 1`, [SU]));
  ok('P3b an admin role is refused HC050 while off and the row is missing', adm.code === 'HC050', adm);
  const pay = await tryIt(() => as(A1, 'authenticated', 'authenticated',
    `INSERT INTO payroll_adjustments(month, origin_month, teacher_id, amount_vnd, reason) VALUES ($1,$2,$3,1000,'x')`, [month, origin, t2]));
  ok('P3c a pay carry is refused HC050 while off and the row is missing', pay.code === 'HC050', pay);
  const payUp = await tryIt(() => as(A1, 'authenticated', 'authenticated', `UPDATE payroll_adjustments SET amount_vnd = 170000`));
  ok('P3c\' and so is rewriting one (the guard fails closed on UPDATE too)', payUp.code === 'HC050', payUp);
  const cls = (await q1(`INSERT INTO classes(default_teacher_user, name) VALUES ($1,'c') RETURNING id`, [TU])).id;
  const sid = (await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',$3) RETURNING id`, [cls, OLD.date, t1])).id;
  const fam = (await q1(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).id;
  const kid = (await q1(`INSERT INTO students(full_name, family_id) VALUES ('k',$1) RETURNING id`, [fam])).id;
  await su(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [cls, kid]);
  await su(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',$3)`, [sid, kid, TU]);
  await su(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen) VALUES ($1,$2,'issued',540000,540000,0,'auto_approved',false)`, [kid, OLD.month]);
  const pv = await rpc(A1, `SELECT public.money_change_preview('attendance','set_marks',$1::jsonb) r`,
    [JSON.stringify({ session_id: sid, marks: [{ student_id: kid, status: 'Excused' }] })]);
  ok('P3d a money PREVIEW (read-only) also stops with HC050 while off and the row is missing', pv.code === 'HC050', pv);
  await su(`INSERT INTO change_approval_settings (id) VALUES (true)`);
  ok('  the repair INSERT puts it back, switched off', (await q1(`SELECT enabled FROM change_approval_settings`)).enabled === false);
});

// ------------------------------------------------------------------ helpers for P4/P5
let slot = 0;
async function taught({ recorded = 6000000, conf = 'auto_approved' } = {}) {
  const cls = (await q1(`INSERT INTO classes(default_teacher_user, name) VALUES ($1,'c') RETURNING id`, [TU])).id;
  const s = slot++;
  const sid = (await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,'Held',$5) RETURNING id`,
    [cls, OLD.date, `${String(8 + (s % 10)).padStart(2, '0')}:00`, `${String(9 + (s % 10)).padStart(2, '0')}:00`, t1])).id;
  const fam = (await q1(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).id;
  const kid = (await q1(`INSERT INTO students(full_name, family_id) VALUES ('k',$1) RETURNING id`, [fam])).id;
  await su(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [cls, kid]);
  await su(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',$3)`, [sid, kid, TU]);
  await su(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen) VALUES ($1,$2,'issued',540000,540000,$3,$4,false)`,
    [kid, OLD.month, recorded, conf]);
  return { cls, sid, kid };
}
const moneyPending = async (ov) => (await q1(`SELECT count(*)::int n FROM money_change_overrides o WHERE o.id = $1 AND jsonb_array_length(o.refresh_pairs) > 0
  AND NOT EXISTS (SELECT 1 FROM money_change_events e WHERE e.override_id = o.id AND e.kind = 'tuition_refreshed')`, [ov])).n;
const sessionPending = async (ov) => (await q1(`SELECT count(*)::int n FROM session_cancel_overrides o WHERE o.id = $1 AND jsonb_array_length(o.refresh_pairs) > 0
  AND NOT EXISTS (SELECT 1 FROM session_cancel_override_events e WHERE e.override_id = o.id AND e.kind = 'tuition_refreshed')`, [ov])).n;
async function askMoney(l) {
  const args = { session_id: l.sid, marks: [{ student_id: l.kid, status: 'Excused' }] };
  const p = (await as(A1, 'authenticated', 'authenticated', `SELECT public.money_change_preview('attendance','set_marks',$1::jsonb) r`, [JSON.stringify(args)])).rows[0].r;
  const params = { entity: 'attendance', op: 'set_marks', args, reason: R, confirm: p.tier >= 1, correction_reason: p.tier === 3 ? CORR : null };
  const r = await rpc(A1, `SELECT public.request_change_approval('money','money_change_checked',$1::jsonb,$2) r`, [JSON.stringify(params), p.token]);
  return { p, id: r.ok?.request_id, r };
}
async function askCancel(l) {
  const sp = (await as(A1, 'authenticated', 'authenticated', `SELECT public.session_change_preview($1,'cancel') r`, [l.sid])).rows[0].r;
  const params = { session_id: l.sid, action: 'cancel', reason: R, confirm: sp.tier >= 1, correction_reason: sp.tier === 3 ? CORR : null };
  const r = await rpc(A1, `SELECT public.request_change_approval('session','cancel_session_checked',$1::jsonb,$2) r`, [JSON.stringify(params), sp.token]);
  return { id: r.ok?.request_id, r };
}
const tokenFor = async (id, uid = A2) => (await rpc(uid, `SELECT public.approval_request_preview($1) r`, [id])).ok?.token;

const refreshFn = await F.loadFunction('supabase/functions/guarded-change-refresh/index.ts');
const bulkFn = await F.loadFunction('supabase/functions/bulk-cancel-sessions/index.ts');
const adminFn = await F.loadFunction('supabase/functions/manage-admin-users/index.ts');
ok('the three functions bundled and registered a handler', [refreshFn, bulkFn, adminFn].every((f) => typeof f === 'function'));

await section('P4: ON, an approved change ends in the bill refresh (B-2)', async () => {
  await su(`UPDATE change_approval_settings SET enabled = true`);
  // the decision RPC alone (what the inbox used to call): nothing refreshes the bills
  const l0 = await taught();
  const m0 = await askMoney(l0);
  ok('the money change needs approval and is asked for', m0.p.approval?.required === true && !!m0.id, m0.r);
  const a0 = await rpc(A2, `SELECT public.approve_change_request($1,$2,NULL) r`, [m0.id, await tokenFor(m0.id)]);
  ok('PROBE P4 (characterisation): approve_change_request alone applies the change and leaves its bills to refresh - why the screen goes through guarded-change-refresh',
     a0.ok?.status === 'applied' && (await moneyPending(a0.ok.override_ids[0])) === 1, a0);
  const again0 = await F.call(refreshFn, T2, { action: 'approval-refresh', request_id: m0.id });
  ok('  and approval-refresh picks such a request up: refreshed, nothing left pending', again0.status === 200 && again0.body.tuition?.status === 'refreshed' &&
     (await moneyPending(a0.ok.override_ids[0])) === 0, again0.body);

  // through the function, as the inbox now does
  const l = await taught();
  const m = await askMoney(l);
  F.log.invokes = []; F.log.rpcs = [];
  const tch = await F.call(refreshFn, TT, { action: 'approve', request_id: m.id, token: 'x' });
  ok('a teacher calling approve: 403, nothing decided', tch.status === 403 && F.log.rpcs.length === 0, tch.body);
  const self = await F.call(refreshFn, T1, { action: 'approve', request_id: m.id, token: await tokenFor(m.id, A1) });
  ok('the asker approving through the function: 403 self_approval (the database decides), nothing applied', self.status === 403 && self.body.code === 'self_approval' &&
     (await q1(`SELECT status FROM attendance WHERE session_id = $1`, [l.sid])).status === 'Present', self.body);
  const r = await F.call(refreshFn, T2, { action: 'approve', request_id: m.id, token: await tokenFor(m.id), note: 'Checked with the family' });
  const ov = r.body.decision?.override_ids?.[0];
  ok('PROBE P4a: approved through guarded-change-refresh: applied, and its bills worked out again (tuition refreshed)',
     r.status === 200 && r.body.decision?.status === 'applied' && r.body.tuition?.status === 'refreshed' && !!ov, r.body);
  ok('  no bill left to refresh: money_change_tuition_pending stays clean for it', (await moneyPending(ov)) === 0);
  ok('  the decision ran on the approver\'s own client, calculate-tuition on the service client for the child and month',
     F.log.rpcs.some((x) => x.name === 'approve_change_request' && x.who === 'user' && x.uid === A2) &&
     !F.log.rpcs.some((x) => x.name === 'approve_change_request' && x.who === 'service') &&
     F.log.invokes.some((x) => x.name === 'calculate-tuition' && x.who === 'service' && x.body.studentId === l.kid && x.body.month === OLD.month), F.log);
  const ev = await q1(`SELECT actor_user_id, payload FROM money_change_events WHERE override_id = $1 AND kind = 'tuition_refreshed'`, [ov]);
  ok('  the refresh is recorded on the override by the approver', ev?.actor_user_id === A2, ev);
  const audit = await q1(`SELECT count(*)::int n FROM audit_log WHERE action = 'approval_applied' AND entity_id = $1`, [m.id]);
  ok('  and an audit row names the applied approval', audit.n === 1, audit);
  F.log.invokes = [];
  const again = await F.call(refreshFn, T2, { action: 'approval-refresh', request_id: m.id });
  ok('  "work out the bills again" afterwards is idempotent: refreshed, no pair refreshed twice', again.status === 200 && again.body.tuition?.status === 'refreshed' &&
     F.log.invokes.length === 0, again.body);

  // a failed refresh is reported, and the retry finishes it
  const lf = await taught();
  const mf = await askMoney(lf);
  F.tuitionFail.add(lf.kid);
  const rf = await F.call(refreshFn, T2, { action: 'approve', request_id: mf.id, token: await tokenFor(mf.id) });
  ok('a refresh that fails: the change is applied and the answer says the bills are not done (failed), never "refreshed"',
     rf.status === 200 && rf.body.decision?.status === 'applied' && rf.body.tuition?.status === 'failed' && (await moneyPending(rf.body.decision.override_ids[0])) === 1, rf.body);
  F.tuitionFail.delete(lf.kid);
  const rf2 = await F.call(refreshFn, T2, { action: 'approval-refresh', request_id: mf.id });
  ok('  the retry (approval-refresh) finishes it', rf2.body.tuition?.status === 'refreshed' && (await moneyPending(rf.body.decision.override_ids[0])) === 0, rf2.body);

  // a D2 lesson cancel
  const l2 = await taught({ conf: 'confirmed' });
  const s = await askCancel(l2);
  ok('the lesson cancel is asked for (tier3)', !!s.id && s.r.ok.reasons.includes('tier3'), s.r);
  F.log.invokes = [];
  const rs = await F.call(refreshFn, T2, { action: 'approve', request_id: s.id, token: await tokenFor(s.id) });
  const sov = rs.body.decision?.override_ids?.[0];
  ok('PROBE P4b: the approved lesson cancel: applied and its bills refreshed; no pending refresh, so CancelOverridesReview shows no "failed"',
     rs.body.decision?.status === 'applied' && rs.body.tuition?.status === 'refreshed' && (await sessionPending(sov)) === 0 &&
     (await q1(`SELECT status::text s FROM sessions WHERE id = $1`, [l2.sid])).s === 'Canceled' &&
     F.log.invokes.some((x) => x.name === 'calculate-tuition' && x.body.studentId === l2.kid), rs.body);
  F.log.invokes = [];
  const rs2 = await F.call(refreshFn, T2, { action: 'approval-refresh', request_id: s.id });
  ok('  again: already refreshed, calculate-tuition not called again', rs2.body.tuition?.status === 'refreshed' && F.log.invokes.length === 0, rs2.body);
  const notApplied = await askMoney(await taught());
  const na = await F.call(refreshFn, T2, { action: 'approval-refresh', request_id: notApplied.id });
  ok('approval-refresh for a request still waiting: 409 not_applied, nothing done', na.status === 409 && na.body.code === 'not_applied', na.body);
  await rpc(A1, `SELECT public.withdraw_change_request($1) r`, [notApplied.id]);
  // a stale decision: answered, nothing refreshed
  const ls = await taught();
  const ms = await askMoney(ls);
  const tk = await tokenFor(ms.id);
  await su(`UPDATE invoices SET recorded_payment = recorded_payment + 1000 WHERE student_id = $1`, [ls.kid]);
  F.log.invokes = [];
  const st = await F.call(refreshFn, T2, { action: 'approve', request_id: ms.id, token: tk });
  ok('a stale request: 200 with the stale decision, no refresh (nothing was applied)', st.status === 200 && st.body.decision?.status === 'stale' &&
     st.body.tuition === null && F.log.invokes.length === 0, st.body);
});

await section('P5: ON, bulk cancel over one chunk (M-1)', async () => {
  const cls = randomUUID();
  await su(`INSERT INTO classes(id, default_teacher_user, name) VALUES ($1,$2,'bulk')`, [cls, TU]);
  const from = (await H.clock(1)).date, to = (await H.clock(14)).date;
  let n = 0;
  for (let d = 1; d <= 13 && n < 51; d++) {
    const day = (await H.clock(d)).date;
    for (const t of ['08:00', '10:00', '13:00', '15:00']) {
      if (n >= 51) break;
      await su(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,($3::time + interval '1 hour')::time,'Scheduled',$4)`, [cls, day, t, t1]);
      n++;
    }
  }
  // one taught lesson of the same class, settled, at the end of the range: tier 3
  const lastDay = (await H.clock(14)).date;
  const tsid = (await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'18:00','19:00','Scheduled',$3) RETURNING id`, [cls, lastDay, t1])).id;
  const fam = (await q1(`INSERT INTO families(name) VALUES ('F') RETURNING id`)).id;
  const kid = (await q1(`INSERT INTO students(full_name, family_id) VALUES ('k',$1) RETURNING id`, [fam])).id;
  await su(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [cls, kid]);
  await su(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',$3)`, [tsid, kid, TU]);
  await su(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen) VALUES ($1,$2,'issued',540000,540000,6000000,'confirmed',false)
            ON CONFLICT (student_id, month) DO NOTHING`, [kid, lastDay.slice(0, 7)]);
  const p = await F.call(bulkFn, T1, { step: 'preview', date_from: from, date_to: to, class_id: cls });
  const plain = (p.body.plain ?? []).map((x) => ({ id: x.id, token: x.token }));
  const held = (p.body.needs_ack ?? []).filter((x) => x.id === tsid);
  ok('preview: 51 lessons with nothing recorded and the one with evidence', p.status === 200 && plain.length === 51 && held.length === 1, { status: p.status, plain: plain.length, held: held.length, body: p.body?.code });
  const heldItems = held.map((h) => ({ id: h.id, token: h.token, confirm: true, reason: 'The lesson was moved to the holiday week', correction_reason: CORR }));
  const body = { step: 'confirm', reason: 'School closed for the national holiday', date_from: from, date_to: to, class_id: cls, items: plain,
                 include_held: true, held_items: heldItems };
  const before = (await q1(`SELECT count(*)::int n FROM sessions WHERE class_id = $1 AND status = 'Canceled'`, [cls])).n;
  const r = await F.call(bulkFn, T1, body);
  ok('PROBE M-1a: 52 lessons, one of them T3: asked for the whole batch first - 409 approval_required, NOT ONE lesson cancelled',
     r.status === 409 && r.body.code === 'approval_required' && (await q1(`SELECT count(*)::int n FROM sessions WHERE class_id = $1 AND status = 'Canceled'`, [cls])).n === before &&
     r.body.not_attempted?.length === 52 && (r.body.done ?? []).length === 0, { status: r.status, code: r.body.code, na: r.body.not_attempted?.length });
  ok('  the answer offers ONE request for the 52, with the items as sent (ids and tokens)', r.body.approval?.one_request === true &&
     r.body.approval.params?.items?.length === 52 && r.body.approval.params.items.every((i) => typeof i.token === 'string'), r.body.approval);
  const req = await rpc(A1, `SELECT public.request_change_approval('session','cancel_sessions_checked_bulk',$1::jsonb,NULL) r`, [JSON.stringify(r.body.approval.params)]);
  ok('  and that request is accepted as it is (one request, 52 fingerprints)', !!req.ok?.request_id &&
     (await q1(`SELECT cardinality(fingerprints) n FROM change_approval_requests WHERE id = $1`, [req.ok?.request_id])).n === 52, req);
  await rpc(A1, `SELECT public.withdraw_change_request($1) r`, [req.ok?.request_id]);

  // a later chunk stopped by approval although the batch, asked a moment before, was not: simulated by
  // taking the whole-batch question away (as when the function is missing): the first chunk is done
  await su(`ALTER FUNCTION public.change_approval_check(text, text, jsonb) RENAME TO change_approval_check_away`);
  const r2 = await F.call(bulkFn, T1, body);
  await su(`ALTER FUNCTION public.change_approval_check_away(text, text, jsonb) RENAME TO change_approval_check`);
  const cancelled = (await q1(`SELECT count(*)::int n FROM sessions WHERE class_id = $1 AND status = 'Canceled'`, [cls])).n;
  ok('PROBE M-1b: the first chunk (50) is cancelled, the second stops on approval: the answer is ok with the truth - 50 cancelled, 2 not attempted, stopped: approval_required',
     r2.status === 200 && r2.body.ok === true && r2.body.success === false && r2.body.canceled?.length === 50 && r2.body.not_attempted?.length === 2 &&
     r2.body.stopped?.code === 'approval_required' && cancelled === 50, { status: r2.status, ok: r2.body.ok, c: r2.body.canceled?.length, na: r2.body.not_attempted?.length, stopped: r2.body.stopped });
  const audit = await q1(`SELECT diff FROM audit_log WHERE action = 'bulk_cancel_sessions' AND diff ->> 'batch_id' = $1`, [r2.body.batch_id ?? '']);
  ok('  what was done is audited (count 50, 2 not attempted) and refreshed (tuition answered)', audit?.diff?.count === 50 && audit.diff.not_attempted === 2 &&
     !!r2.body.tuition, audit);
  ok('  and the rest is offered as one request (the 2 not attempted)', r2.body.approval?.params?.items?.length === 2, r2.body.approval);
  await su(`UPDATE change_approval_settings SET enabled = false`);
  const r3 = await F.call(bulkFn, T1, { ...body, items: [], held_items: heldItems });
  ok('switched off: the evidence lesson is cancelled at once (the whole-batch question answers "off")', r3.status === 200 && r3.body.canceled?.length === 1, r3.body);
  await su(`UPDATE change_approval_settings SET enabled = true`);
});

await section('P6: ON, giving the administrator role from the staff screen (M-2)', async () => {
  const made = [];
  const removed = [];
  const orig = globalThis.__fakeCreateClient;
  globalThis.__fakeCreateClient = (...a) => {
    const c = orig(...a);
    c.auth.admin = {
      createUser: async ({ email }) => { const id = randomUUID(); made.push({ id, email }); return { data: { user: { id, email } }, error: null }; },
      deleteUser: async (id) => { removed.push(id); return { data: {}, error: null }; },
    };
    return c;
  };
  try {
    const c = await F.call(adminFn, T1, { action: 'create', email: 'new.admin@example.test', password: 'abcabc!' });
    ok('PROBE M-2a: "Create Admin" while on: 409 approval_required with a sentence, and NO account made', c.status === 409 && c.body.code === 'approval_required' &&
       /switched on/.test(c.body.error ?? '') && made.length === 0, { c: c.body, made });
    const target = randomUUID();
    await su(`INSERT INTO user_roles VALUES ($1,'teacher')`, [target]);
    const p = await F.call(adminFn, T1, { action: 'promote', userId: target });
    ok('  "Promote to Admin" while on: 409 with the grant request offered, no role given', p.status === 409 && p.body.approval?.rpc === 'grant_admin_role' &&
       p.body.approval.user_id === target && !(await q1(`SELECT public.has_role($1,'admin') h`, [target])).h, p.body);
    const u = await F.call(adminFn, T1, { action: 'updateRole', userId: target, role: 'admin' });
    ok('  "updateRole admin" while on: 409 before anything is removed (the teacher role stays)', u.status === 409 &&
       (await q1(`SELECT count(*)::int n FROM user_roles WHERE user_id = $1 AND role = 'teacher'`, [target])).n === 1, u.body);
    const g = await rpc(A1, `SELECT public.request_change_approval('settings','grant_admin_role',$1::jsonb,NULL) r`, [JSON.stringify({ user_id: target, reason: 'New office manager from Monday' })]);
    const tk = await tokenFor(g.ok?.request_id);
    const ga = await F.call(refreshFn, T2, { action: 'approve', request_id: g.ok?.request_id, token: tk });
    ok('  the offered grant request, approved by the other administrator (through the inbox\'s function): the role is given, no bills to refresh',
       ga.body.decision?.status === 'applied' && ga.body.tuition?.status === 'none' && (await q1(`SELECT public.has_role($1,'admin') h`, [target])).h === true, ga.body);
    // the check missing (as when the function is ahead of the database): the role is refused after the account is made, and the account is removed again
    await su(`ALTER FUNCTION public.change_approval_status() RENAME TO change_approval_status_away`);
    const c2 = await F.call(adminFn, T1, { action: 'create', email: 'other.admin@example.test', password: 'abcabc!' });
    await su(`ALTER FUNCTION public.change_approval_status_away() RENAME TO change_approval_status`);
    ok('PROBE M-2b: an account whose admin role the database refused is removed again (email free), with a sentence',
       c2.status === 409 && c2.body.code === 'approval_required' && c2.body.account_removed === true && made.length === 1 && removed[0] === made[0].id, { c2: c2.body, made, removed });
    await su(`UPDATE change_approval_settings SET enabled = false`);
    const c3 = await F.call(adminFn, T1, { action: 'create', email: 'third.admin@example.test', password: 'abcabc!' });
    ok('switched off: "Create Admin" makes the account and gives the role, as before', c3.status === 200 && c3.body.success === true &&
       (await q1(`SELECT public.has_role($1,'admin') h`, [c3.body.user?.id])).h === true, c3.body);
  } finally {
    globalThis.__fakeCreateClient = orig;
  }
});

await db.close();
const { pass, fail } = counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
