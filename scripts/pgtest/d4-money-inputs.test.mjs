// D4 step 3B: the money inputs (G-13 to G-19, G-21) and b.5's writers.
// Drives the REAL migrations in paste order (see run.mjs for the list) and
// the step's rollback script as the last argument.
//
// Spec: docs/evidence/D4-design.md revision 2 b.0, b.4, b.5, c.5, f.3
// ("G-13 to G-21"). Prelude: d4-inputs-prelude.mjs (D2's prelude, the D4
// people and evidence policies, the money-input tables as the real
// migrations shape them).
import { randomUUID } from 'node:crypto';
import { harness, sqlOf } from './d4-prelude.mjs';
import { makeInputsDb } from './d4-inputs-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 14) {
  console.error('usage: d4-money-inputs.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> ' +
    '<no auto changes> <enrolment RPCs> <pause> <deactivation> <d4 money inputs> <rollback 5>');
  process.exit(2);
}
const inputsF = files[12], rb5F = files[13];
const base = files.slice(0, 12);
let db;
const H = harness(() => db);
const { ok, section, as, tryIt, clock } = H;

const TRIGGERS = ['classes.zz_class_delete_guard', 'discount_assignments.zz_discount_money_guard',
  'discount_definitions.zz_discount_definition_guard', 'enrollments.zz_enrollment_money_guard', 'families.audit_families',
  'families.zz_family_link_guard', 'invoices.zz_invoice_unfreeze_guard', 'referral_bonuses.zz_discount_money_guard',
  'staff_pay_rates.zz_pay_rate_money_guard', 'students.zz_family_link_guard', 'students.zz_student_delete_guard',
  'teachers.zz_staff_pay_mirror_guard', 'teaching_assistants.zz_staff_pay_mirror_guard'];

// ------------------------------------------------------------ preflight
await section('preflight', async () => {
  const bare = await makeInputsDb(base.filter((f) => !/d4_core_register/.test(f)));
  let msg = null;
  try { await bare.exec(sqlOf(inputsF)); } catch (e) { msg = e.message; }
  await bare.exec('ROLLBACK').catch(() => {});
  ok('preflight: without D4 file 2 the file refuses, naming what is missing',
     /d4_money_inputs_guard cannot be installed/.test(msg ?? '') && /money_change_overrides|_money_ack/.test(msg ?? ''), msg);
  const t = (await bare.query(`SELECT (SELECT count(*)::int FROM pg_trigger WHERE tgname = 'zz_enrollment_money_guard') n,
      to_regprocedure('public.change_enrollment_terms(uuid, jsonb, date)') f`)).rows[0];
  ok('preflight:   and installs nothing', t.n === 0 && t.f === null, t);
  await bare.close();

  const x = await makeInputsDb(base);
  await x.exec(`CREATE OR REPLACE FUNCTION public.tuition_month_state(p_student uuid, p_month text) RETURNS jsonb
                LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$ SELECT '{"tier":0}'::jsonb $f$;`);
  msg = null;
  try { await x.exec(sqlOf(inputsF)); } catch (e) { msg = e.message; }
  await x.exec('ROLLBACK').catch(() => {});
  ok('a tuition_month_state that is not the reviewed 1b body -> refused, naming it, nothing installed',
     /tuition_month_state\(uuid, text\) is not the reviewed/.test(msg ?? '') &&
     (await x.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname = 'zz_enrollment_money_guard'`)).rows[0].n === 0, msg);
  await x.close();

  const y = await makeInputsDb(base);
  msg = null;
  const crlf = sqlOf(inputsF).replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  try { await y.exec(crlf); await y.exec(crlf); } catch (e) { msg = e.message; }
  ok('the file pasted with CRLF, twice, is accepted (the md5 of its own helper body is of the CR-stripped text)', msg === null, msg);
  await y.close();
});

db = await makeInputsDb(base);
const fnRows = async () => new Map((await db.query(`SELECT p.oid::regprocedure::text k, md5(replace(p.prosrc, E'\\r', '')) m, p.prosecdef,
   p.provolatile::text v, p.proconfig::text c, has_function_privilege('authenticated', p.oid, 'EXECUTE') au,
   has_function_privilege('anon', p.oid, 'EXECUTE') an, has_function_privilege('service_role', p.oid, 'EXECUTE') sr
   FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace`)).rows.map((r) => [r.k, r]));
const trgRows = async () => (await db.query(`SELECT c.relname || '.' || t.tgname k, pg_get_triggerdef(t.oid) d, t.tgenabled::text e
   FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE NOT t.tgisinternal ORDER BY 1`)).rows;
const fnsBefore = await fnRows();
const trgBefore = await trgRows();
{
  // rows that exist before the paste: it must not touch them
  await db.exec(`
    INSERT INTO classes(id, default_teacher_user, name) VALUES ('00000000-0000-4000-8000-00000000c001', gen_random_uuid(), 'pre');
    INSERT INTO families(id, name, sibling_percent_override) VALUES ('00000000-0000-4000-8000-00000000f001', 'pre', 12);
    INSERT INTO students(id, full_name, family_id) VALUES ('00000000-0000-4000-8000-000000005001', 'pre', '00000000-0000-4000-8000-00000000f001');
    INSERT INTO enrollments(class_id, student_id, start_date, rate_override_vnd)
      VALUES ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-000000005001', '2025-01-01', 150000);
    INSERT INTO teachers(id, full_name, pay_rate_type, hourly_rate_vnd) VALUES ('00000000-0000-4000-8000-00000000e001', 'pre', 'hourly', 200000);
    INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd)
      VALUES ('00000000-0000-4000-8000-00000000e001', '1900-01-01', 'hourly', 200000);`);
}
const rowsDigest = async () => (await db.query(`SELECT
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM enrollments a) e,
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM students a) s,
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM families a) f,
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM staff_pay_rates a) p,
   (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, ',' ORDER BY a.id), '')) FROM teachers a) t`)).rows[0];
const digestBefore = await rowsDigest();
await db.exec(sqlOf(inputsF));

await section('install', async () => {
  ok('no row rewritten (enrolments, students, families, pay rates, teachers identical)',
     JSON.stringify(await rowsDigest()) === JSON.stringify(digestBefore));
  const after = await fnRows();
  const snap = JSON.stringify([...after.entries()]) + JSON.stringify(await trgRows());
  let e = null; try { await db.exec(sqlOf(inputsF)); } catch (x) { e = x.message; }
  ok('the file applies a second time', e === null, e);
  ok('  as a no-op on functions and triggers', JSON.stringify([...(await fnRows()).entries()]) + JSON.stringify(await trgRows()) === snap);
  const changed = [...fnsBefore.keys()].filter((k) => JSON.stringify(fnsBefore.get(k)) !== JSON.stringify(after.get(k)));
  ok('of everything that existed, exactly ONE function body is replaced: step 1b\'s _money_enrollment_rpc_call()',
     JSON.stringify(changed) === JSON.stringify(['_money_enrollment_rpc_call()']), changed);
  const b = fnsBefore.get('_money_enrollment_rpc_call()'), a = after.get('_money_enrollment_rpc_call()');
  ok('  with the same attributes and (no) grants; only its text differs',
     b.m !== a.m && JSON.stringify({ ...b, m: 0 }) === JSON.stringify({ ...a, m: 0 }) && !a.au && !a.an && !a.sr, { b, a });
  ok('the dispatcher of step 1b is not re-created (plan, exec, apply, full plan identical)',
     ['_money_change_plan(text,text,jsonb,uuid)', '_money_change_exec(text,jsonb,uuid)', '_money_change_full_plan(text,text,jsonb,uuid,text)',
      '_money_change_apply(text,text,jsonb,text,text,boolean,text,jsonb,text,uuid)'].every((k) => fnsBefore.get(k)?.m === after.get(k)?.m));
  const trgAfter = await trgRows();
  const added = trgAfter.filter((x) => !trgBefore.some((y) => y.k === x.k)).map((x) => x.k).sort();
  ok('every trigger that existed is unchanged; added: the nine guards (on twelve tables) and audit_families',
     trgBefore.every((x) => JSON.stringify(trgAfter.find((y) => y.k === x.k)) === JSON.stringify(x)) &&
     JSON.stringify(added) === JSON.stringify(TRIGGERS), added);
  const fresh = [...after.entries()].filter(([k]) => !fnsBefore.has(k)).map(([, v]) => v);
  ok('every new function pins search_path=public', fresh.length >= 35 && fresh.every((f) => /search_path=public/.test(f.c ?? '')),
     fresh.filter((f) => !/search_path=public/.test(f.c ?? '')).map((f) => f.k));
  ok('grants: change_enrollment_terms for authenticated only (not anon, not service_role); every other new function: nobody',
     fresh.every((f) => /^change_enrollment_terms\(/.test(f.k) ? (f.au && !f.an && !f.sr) : (!f.au && !f.an && !f.sr)),
     fresh.filter((f) => f.au || f.an || f.sr).map((f) => f.k));
  const src = sqlOf(inputsF);
  ok('the paste fails fast: SET LOCAL lock_timeout = \'5s\' right after BEGIN', /BEGIN;\s*(--[^\n]*\n\s*)*SET LOCAL lock_timeout = '5s';/.test(src));
  ok('no dynamic SQL, no new table, no ALTER TABLE, no row of an existing table written (only its own guard_installed event)',
     !/\bEXECUTE\s+(format|'|\$)/i.test(src) && !/CREATE TABLE/i.test(src) && !/ALTER TABLE/i.test(src)
     && (src.match(/^(INSERT INTO|UPDATE|DELETE FROM) public\.\w+/gm) ?? []).join() === 'INSERT INTO public.money_change_events');
  ok('one guard_installed event per paste names this migration',
     (await db.query(`SELECT count(*)::int n FROM money_change_events WHERE kind='guard_installed' AND payload->>'migration' = '20261114094000_d4_money_inputs_guard'`)).rows[0].n === 2);
});

// ---------------------------------------------------------------- fixtures
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const PARENT = '00000000-0000-4000-8000-0000000000f1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'family')`, [ADMIN, PARENT]);
const R = 'Entered against the wrong month by mistake';
const CORR = 'Correction: the confirmed bill was wrong';
const asAdmin = (sql, p) => as(ADMIN, 'authenticated', 'authenticated', sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);
const asSuper = (sql, p) => as(null, '', null, sql, p);
const q1 = async (sql, p) => (await asSuper(sql, p)).rows[0];

const NOW = await clock(0, 0);
const TODAY = NOW.date;
const OLD = await clock(-40);            // a past month, more than a week ago
const OLDER = await clock(-75);
const RECENT = await clock(-3);
const FUTURE = await clock(10);
const day = async (n) => (await clock(n)).date;
const NEXT_MONTH_1 = (await q1(`SELECT to_char(date_trunc('month', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) + interval '1 month', 'YYYY-MM-DD') d`)).d;

/** A class with a teacher, a Held lesson 75 and 40 days ago, one 3 days ago, one in 10 days. */
async function mkClass() {
  const cid = randomUUID(), teacherUid = randomUUID();
  await asSuper(`INSERT INTO classes(id, default_teacher_user, name) VALUES ($1,$2,'c')`, [cid, teacherUid]);
  await asSuper(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  const teacherId = (await q1(`INSERT INTO teachers(user_id, full_name, pay_rate_type, hourly_rate_vnd) VALUES ($1,'t','hourly',200000) RETURNING id`, [teacherUid])).id;
  const s = {};
  for (const [k, w, st] of [['older', OLDER, 'Held'], ['old', OLD, 'Held'], ['recent', RECENT, 'Held'], ['future', FUTURE, 'Scheduled']]) {
    s[k] = (await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00',$3,$4) RETURNING id`,
      [cid, w.date, st, teacherId])).id;
  }
  return { cid, teacherUid, teacherId, s };
}
const mkFamily = async (pct = null) => (await q1(`INSERT INTO families(name, sibling_percent_override) VALUES ('F', $1) RETURNING id`, [pct])).id;
const mkKid = async (family = null) => (await q1(`INSERT INTO students(full_name, family_id) VALUES ('k', $1) RETURNING id`, [family])).id;
/** Enrol on the owner lane (a fixture, not the thing under test). */
const enrol = async (kid, c, start = '2025-01-01', extra = {}) => (await q1(
  `INSERT INTO enrollments(class_id, student_id, start_date, end_date, rate_override_vnd, discount_type, discount_value, discount_cadence)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
  [c.cid, kid, start, extra.end ?? null, extra.rate ?? null, extra.dtype ?? null, extra.dvalue ?? null, extra.dcad ?? null])).id;
const inv = (k, month, { recorded = 0, conf = 'auto_approved', frozen = false, status = 'issued' } = {}) =>
  asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
           VALUES ($1,$2,$3,540000,540000,$4,$5,$6) RETURNING id`, [k, month, status, recorded, conf, frozen]).then((r) => r.rows[0].id);
const att = (sid, k, status, by) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, k, status, by]);
const preview = async (entity, op, args, uid = ADMIN) =>
  (await as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_preview($1,$2,$3::jsonb) r`, [entity, op, JSON.stringify(args)])).rows[0].r;
const checked = (entity, op, args, { reason = null, token = null, confirm = false, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', `SELECT public.money_change_checked($1,$2,$3::jsonb,$4,$5,$6,$7,'{}'::jsonb) r`,
    [entity, op, JSON.stringify(args), reason, token, confirm, corr]).then((r) => r.rows[0].r);
/** Preview, then confirm with exactly what the preview asks for. */
const go = async (entity, op, args, uid = ADMIN) => {
  const p = await preview(entity, op, args, uid);
  return checked(entity, op, args, { reason: p.tier >= 1 ? R : null, token: p.token, confirm: p.tier >= 1, corr: p.tier === 3 ? CORR : null }, uid);
};
const override = async (id) => q1(`SELECT * FROM money_change_overrides WHERE id=$1`, [id]);
const nEvents = async (kind) => (await q1(`SELECT count(*)::int n FROM money_change_events WHERE kind=$1`, [kind])).n;
const nOverrides = async () => (await q1(`SELECT count(*)::int n FROM money_change_overrides`)).n;
const enr = async (id) => q1(`SELECT * FROM enrollments WHERE id=$1`, [id]);
const refused = (r, code, re) => r.code === code && (!re || re.test(`${r.message} ${r.detail ?? ''}`));

/**
 * A write made by an admin while an acknowledgement is in force - the state
 * only money_change_checked can create. The override row is inserted on the
 * owner lane (as the definer function does), the flag names it, then the
 * statement runs as the admin. Everything is rolled back.
 */
async function withAck(o, stmt, { sameTx = true } = {}) {
  const id = randomUUID();
  const ins = `INSERT INTO money_change_overrides (id, actor_user_id, entity, op, target_id, student_ids, reach_from, reach_to, via,
      tier, correction_mode, reason, correction_reason, confirmed, token, row_before, change, reach, invoices_before, refresh_pairs,
      impact, review_required)
    VALUES ('${id}', '${ADMIN}', '${o.entity}', '${o.op}', '${o.target}', '{${(o.students ?? []).join(',')}}', '${o.from ?? '1900-01-01'}',
      '${o.to ?? '9999-12-31'}', 'single', ${o.tier ?? 3}, ${(o.tier ?? 3) === 3}, 'a reason long enough to pass', 'a correction reason too',
      true, 't', '[]', '${JSON.stringify(o.change ?? {})}', '{}', '[]', '[]', '{}', false)`;
  const actor = `SELECT set_config('hec.money_change_ack', '${id}', true), set_config('test.uid', '${ADMIN}', true),
                 set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated`;
  try {
    if (sameTx) await db.exec(`BEGIN; ${ins}; ${actor}; ${stmt}; ROLLBACK;`);
    else await db.exec(`BEGIN; ${ins}; COMMIT; BEGIN; ${actor}; ${stmt}; ROLLBACK;`);
    return { ok: true };
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    await db.exec('RESET ROLE').catch(() => {});
    return { code: e.code, message: e.message, detail: e.detail };
  }
}

// ---------------------------------------------------------------- readers
await section('the reach readers', async () => {
  const span = async (o, n, other = ['allowed_days', 'rate_override_vnd'], lead = 0) =>
    (await q1(`SELECT public._money_span($1::jsonb, $2::jsonb, 'start_date', 'end_date', $3::text[], $4) r`,
      [o === null ? null : JSON.stringify(o), n === null ? null : JSON.stringify(n), other, lead])).r;
  const row = { start_date: '2026-03-10', end_date: null, allowed_days: null, rate_override_vnd: null };
  let r = await span(null, row);
  ok('_money_span INSERT: the row\'s span, open-ended', r.from === '2026-03-10' && r.to === null && r.open === true, r);
  r = await span({ ...row, end_date: '2026-05-31' }, null);
  ok('_money_span DELETE: the row\'s span', r.from === '2026-03-10' && r.to === '2026-05-31' && r.open === false, r);
  r = await span(row, { ...row, start_date: '2026-04-01' });
  ok('_money_span start moved later: only the days leaving', r.from === '2026-03-10' && r.to === '2026-03-31' && !r.open, r);
  r = await span(row, { ...row, end_date: '2026-06-30' });
  ok('_money_span an open enrolment ended: the days after the last day, open-ended', r.from === '2026-07-01' && r.open === true, r);
  r = await span({ ...row, end_date: '2026-06-30' }, { ...row, end_date: '2026-04-30' });
  ok('_money_span end moved earlier: the days in between', r.from === '2026-05-01' && r.to === '2026-06-30', r);
  r = await span({ ...row, end_date: '2026-06-30' }, { ...row, end_date: '2026-06-30', rate_override_vnd: 5 });
  ok('_money_span a rate changed: the whole span (it is not dated)', r.from === '2026-03-10' && r.to === '2026-06-30' && r.cols.includes('rate_override_vnd'), r);
  r = await span(row, { ...row });
  ok('_money_span nothing that prices changed: none', r.none === true, r);
  r = await span(null, { start_date: '2026-04-01', end_date: null }, [], 1);
  ok('_money_span with a lead day (discounts): starts the day before', r.from === '2026-03-31', r);

  const c = await mkClass();
  const lone = await mkKid();
  r = (await q1(`SELECT public._money_tuition_reach($1::uuid[], NULL, '2025-01-01', NULL) r`, [[lone]])).r;
  ok('a child with no bill and no lesson reaches nothing: T0, empty', r.tier === 0 && r.empty === true && r.to === '9999-12-31', r);
  r = (await q1(`SELECT public._money_tuition_reach($1::uuid[], $2, $3, NULL) r`, [[lone], c.cid, OLD.date])).r;
  ok('days ENTERING an enrolment of a class that was taught in a past month: T1 (the child is not enrolled yet)', r.tier === 1, r);
  r = (await q1(`SELECT public._money_tuition_reach($1::uuid[], $2, $3, NULL) r`, [[lone], c.cid, TODAY])).r;
  ok('  from today: T0', r.tier === 0, r);
  const fam = await mkFamily();
  const a = await mkKid(fam), b = await mkKid(fam);
  await enrol(a, c);
  await enrol(b, c);
  await inv(b, OLD.month, { recorded: 540000, conf: 'confirmed' });
  await inv(b, FUTURE.month === NOW.month ? NOW.month : FUTURE.month, {}).catch(() => {});
  r = (await q1(`SELECT public._money_tuition_reach($1::uuid[], $2, $3, NULL) r`, [[a], c.cid, OLDER.date])).r;
  ok('R-8a: widened to the family - the sibling\'s confirmed past bill makes it T3 and is in refresh_pairs',
     r.tier === 3 && r.students.includes(b) && r.refresh_pairs.some((p) => p.student_id === b && p.month === OLD.month), r);
  ok('an open-ended reach runs at least to today and is acknowledged as open (9999-12-31)', r.to === '9999-12-31' && r.calc_to >= TODAY, r);
  ok('a bad range fails closed: HC015', (await tryIt(async () => asSuper(`SELECT public._money_tuition_reach('{}'::uuid[], NULL, NULL, NULL)`))).code === 'HC015');
});

// ---------------------------------------------------------------- G-13
let P13;   // shared by a few sections
await section('G-13 enrolments: what passes untouched (T0)', async () => {
  const c = await mkClass();
  const k = await mkKid();
  const n0 = await nOverrides();
  let r = await tryIt(async () => asAdmin(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [c.cid, k, TODAY]));
  ok('a child joining today (raw insert, as the screens did): allowed', r.ok !== undefined, r);
  const id = (await q1(`SELECT id FROM enrollments WHERE student_id=$1`, [k])).id;
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET rate_override_vnd = 150000 WHERE id=$1`, [id]));
  ok('a rate on an enrolment that began today: allowed (nothing billed is reached)', r.ok !== undefined, r);
  await inv(k, NOW.month, { recorded: 540000, status: 'paid' });
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET allowed_days = '{1,3}' WHERE id=$1`, [id]));
  ok('the current month PAID but not signed off: still T0 (families pay in advance)', r.ok !== undefined, r);
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET updated_at = now(), updated_by = $2 WHERE id=$1`, [id, ADMIN]));
  ok('a write that changes nothing priced (updated_at / updated_by) passes', r.ok !== undefined, r);
  r = await tryIt(async () => asService(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [c.cid, await mkKid(), TODAY]));
  ok('service lane, T0: allowed (manage-demo-student\'s insert dated today)', r.ok !== undefined, r);
  ok('none of these wrote an override row (no dialog, no checked path needed)', (await nOverrides()) === n0);
});

await section('G-13 enrolments: backdated and in-place changes are refused raw (P13, P14, P15)', async () => {
  const c = await mkClass();
  const k = await mkKid();
  const id = await enrol(k, c);
  await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
  P13 = { c, k, id };
  const before = JSON.stringify(await enr(id));
  let r = await tryIt(async () => asAdmin(`UPDATE enrollments SET start_date = $2 WHERE id=$1`, [id, RECENT.date]));
  ok('P13 start date moved a month later over a PAID past month, raw: HC120 entity=enrollment tier=2, with the next step',
     refused(r, 'HC120', /entity=enrollment; tier=2; .*enrolment screen, with a reason/), r);
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET rate_override_vnd = 100000 WHERE id=$1`, [id]));
  ok('P14 rate typed in place on an enrolment begun last year: HC120', refused(r, 'HC120', /tier=2/), r);
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET discount_type='percent', discount_value=30, discount_cadence='monthly' WHERE id=$1`, [id]));
  ok('P14 30% typed onto it: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET allowed_days = '{2}' WHERE id=$1`, [id]));
  ok('P14 weekdays in place: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET end_date = $2 WHERE id=$1`, [id, OLDER.date]));
  ok('P15 ended two months back, raw: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`DELETE FROM enrollments WHERE id=$1`, [id]));
  ok('P15 deleted raw: HC120', refused(r, 'HC120'), r);
  const k2 = await mkKid();
  r = await tryIt(async () => asAdmin(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [c.cid, k2, OLD.date]));
  ok('P15 a NEW child enrolled from a past month in which the class was taught, raw: HC120 tier=1', refused(r, 'HC120', /tier=1/), r);
  ok('  nothing changed', JSON.stringify(await enr(id)) === before && (await q1(`SELECT count(*)::int n FROM enrollments WHERE student_id=$1`, [k2])).n === 0);
  r = await tryIt(async () => asService(`UPDATE enrollments SET rate_override_vnd = 100000 WHERE id=$1`, [id]));
  ok('service lane is refused where a person would need a reason: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => as(null, 'anon', 'anon', `UPDATE enrollments SET rate_override_vnd = 1 WHERE id=$1`, [id]));
  ok('anon: nothing (no grant)', r.code === '42501' && JSON.stringify(await enr(id)) === before, r);
  const ev = await nEvents('owner_lane');
  r = await tryIt(async () => asSuper(`UPDATE enrollments SET rate_override_vnd = 100000 WHERE id=$1`, [id]));
  ok('owner lane (SQL editor): passes, and ONE owner_lane event names the table, the row and the tier',
     r.ok !== undefined && (await nEvents('owner_lane')) === ev + 1 &&
     (await q1(`SELECT payload FROM money_change_events WHERE kind='owner_lane' ORDER BY created_at DESC, id DESC LIMIT 1`)).payload.table === 'enrollments', r);
  await asSuper(`UPDATE enrollments SET rate_override_vnd = NULL WHERE id=$1`, [id]);
});

await section('G-13 an enrolment keeps its child and its class (HC121, every lane)', async () => {
  const { id } = P13;
  const other = await mkKid();
  const c2 = await mkClass();
  for (const [lane, run] of [['admin', asAdmin], ['service', asService], ['owner', asSuper]]) {
    const r = await tryIt(async () => run(`UPDATE enrollments SET student_id = $2 WHERE id=$1`, [id, other]));
    ok(`student_id changed, ${lane} lane: HC121 enrollment_identity "end it and start a new one"`,
       refused(r, 'HC121', /code=enrollment_identity; .*End it and start a new one/), r);
  }
  const r = await tryIt(async () => asAdmin(`UPDATE enrollments SET class_id = $2 WHERE id=$1`, [id, c2.cid]));
  ok('class_id changed: HC121', refused(r, 'HC121', /enrollment_identity/), r);
  // Review B-1: where two rows of one class overlap, the one CREATED FIRST
  // prices the lesson (both calculators order by created_at, then id), so
  // created_at and id are identity too.
  const before = JSON.stringify(await enr(id));
  for (const [lane, run] of [['admin', asAdmin], ['service', asService], ['owner', asSuper]]) {
    const r2 = await tryIt(async () => run(`UPDATE enrollments SET created_at = created_at - interval '3 days' WHERE id=$1`, [id]));
    ok(`B-1 created_at changed (which overlapping row prices a lesson), ${lane} lane: HC121 enrollment_identity`,
       refused(r2, 'HC121', /code=enrollment_identity; .*End it and start a new one/), r2);
  }
  const r3 = await tryIt(async () => asSuper(`UPDATE enrollments SET id = gen_random_uuid() WHERE id=$1`, [id]));
  ok('B-1 id changed, owner lane: HC121 enrollment_identity', refused(r3, 'HC121', /enrollment_identity/), r3);
  ok('  nothing changed', JSON.stringify(await enr(id)) === before);
});

await section('G-13 the checked path: enroll, set_start_date, set_rate, set_discount, delete', async () => {
  const { c, k, id } = P13;
  // set_start_date over the paid past month: T2
  let p = await preview('enrollment', 'set_start_date', { enrollment_id: id, start_date: RECENT.date });
  ok('preview set_start_date: T2, allowed, a reason and a confirmation required, the paid bill shown as stored',
     p.tier === 2 && p.allowed && p.requires.reason && p.requires.confirm && !p.requires.correction_reason &&
     p.invoices_before.some((i) => i.month === OLD.month && Number(i.recorded_payment) === 540000) &&
     p.refresh_pairs.some((x) => x.student_id === k && x.month === OLD.month), p);
  let r = await tryIt(async () => checked('enrollment', 'set_start_date', { enrollment_id: id, start_date: RECENT.date }, { token: p.token, confirm: true }));
  ok('  without a reason: HC010', r.code === 'HC010', r);
  r = await tryIt(async () => checked('enrollment', 'set_start_date', { enrollment_id: id, start_date: RECENT.date }, { reason: R, token: 'x', confirm: true }));
  ok('  a wrong token: HC011', r.code === 'HC011', r);
  r = await tryIt(async () => checked('enrollment', 'set_start_date', { enrollment_id: id, start_date: RECENT.date }, { reason: R, token: p.token }));
  ok('  no confirmation: HC012', r.code === 'HC012', r);
  let done = await checked('enrollment', 'set_start_date', { enrollment_id: id, start_date: RECENT.date }, { reason: R, token: p.token, confirm: true });
  let o = await override(done.override_id);
  ok('  with them: the date is changed and ONE append-only row holds who, why, before and after',
     (await enr(id)).start_date.toISOString?.().slice(0, 10) !== '2025-01-01' && o.actor_user_id === ADMIN && o.reason === R && o.entity === 'enrollment'
     && o.op === 'set_start_date' && o.tier === 2 && o.row_before[0].start_date === '2025-01-01' && o.change.start_date === RECENT.date
     && o.invoices_before.length >= 1, o);
  ok('  the row cannot be edited or deleted afterwards (append-only)',
     (await tryIt(async () => asSuper(`UPDATE money_change_overrides SET reason='x' WHERE id=$1`, [done.override_id]))).code !== undefined &&
     (await tryIt(async () => asSuper(`DELETE FROM money_change_overrides WHERE id=$1`, [done.override_id]))).code !== undefined);
  await go('enrollment', 'set_start_date', { enrollment_id: id, start_date: '2025-01-01' });
  ok('  and back again through the same path', (await q1(`SELECT start_date::text d FROM enrollments WHERE id=$1`, [id])).d === '2025-01-01');

  // a payment lands between the preview and the confirmation
  p = await preview('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 120000 });
  await inv(k, OLDER.month, { recorded: 100000, status: 'partial' });
  r = await tryIt(async () => checked('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 120000 }, { reason: R, token: p.token, confirm: true }));
  ok('a bill written between preview and confirm: HC011 token_stale, nothing changed', r.code === 'HC011' && (await enr(id)).rate_override_vnd === null, r);
  done = await go('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 120000 });
  o = await override(done.override_id);
  ok('set_rate ("correct a mistake for the whole enrolment"): written, the old and new rate in the row',
     (await enr(id)).rate_override_vnd === 120000 && o.change.terms.rate_override_vnd === 120000 && o.change.old.rate_override_vnd === null, o);
  done = await go('enrollment', 'set_discount', { enrollment_id: id, discount_type: 'percent', discount_value: 30, discount_cadence: 'monthly' });
  ok('set_discount: written', (await enr(id)).discount_value === 30 && (await override(done.override_id)).op === 'set_discount');
  p = await preview('enrollment', 'set_discount', { enrollment_id: id, discount_type: 'percent', discount_value: 30 });
  ok('set_discount with a type and no cadence: refused bad_args (a discount is whole or absent)', p.allowed === false && p.refuse_code === 'bad_args', p);
  p = await preview('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 120000 });
  ok('the same rate again: refused nothing_to_change', p.refuse_code === 'nothing_to_change', p);
  p = await preview('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: -5 });
  ok('a negative rate: refused bad_args', p.refuse_code === 'bad_args', p);
  r = await tryIt(async () => preview('enrollment', 'set_rate', { enrollment_id: randomUUID(), rate_override_vnd: 1 }));
  ok('an enrolment that does not exist: P0002', r.code === 'P0002', r);

  // enroll, backdated
  const k2 = await mkKid();
  p = await preview('enrollment', 'enroll', { student_id: k2, class_id: c.cid, start_date: OLD.date });
  ok('preview enroll from a past month the class taught: T1 ("started on the 28th, entered on the 13th": one dialog)', p.tier === 1 && p.allowed, p);
  done = await checked('enrollment', 'enroll', { student_id: k2, class_id: c.cid, start_date: OLD.date }, { reason: R, token: p.token, confirm: true });
  const e2 = await q1(`SELECT * FROM enrollments WHERE student_id=$1`, [k2]);
  ok('  confirmed: the enrolment exists, created_by is the admin, the row is in the override',
     e2 && e2.created_by === ADMIN && (await override(done.override_id)).change.row.class_id === c.cid, e2);
  p = await preview('enrollment', 'enroll', { student_id: await mkKid(), class_id: c.cid, start_date: TODAY });
  ok('preview enroll from today: T0, nothing required', p.tier === 0 && !p.requires.reason && !p.requires.confirm, p);
  const n0 = await nOverrides();
  const k3 = await mkKid();
  done = await checked('enrollment', 'enroll', { student_id: k3, class_id: c.cid, start_date: TODAY, rate_override_vnd: 90000 });
  ok('  a T0 change through the checked path needs no reason and STILL leaves one row (money rule)',
     (await nOverrides()) === n0 + 1 && (await override(done.override_id)).tier === 0 && (await q1(`SELECT rate_override_vnd r FROM enrollments WHERE student_id=$1`, [k3])).r === 90000);
  p = await preview('enrollment', 'enroll', { student_id: k3, class_id: randomUUID(), start_date: TODAY });
  ok('enroll into a class that does not exist: bad_args', p.refuse_code === 'bad_args', p);

  // enroll_new: previewed before the child exists (create-family)
  p = await preview('enrollment', 'enroll_new', { class_id: c.cid, start_date: OLD.date });
  ok('enroll_new previewed with no child yet, start date last month: T1', p.tier === 1 && p.allowed && p.change.new_child === true, p);
  r = await tryIt(async () => checked('enrollment', 'enroll_new', { class_id: c.cid, start_date: OLD.date }, { reason: R, token: p.token, confirm: true }));
  ok('  it cannot be APPLIED without the child: HC015 student_required, no row', r.code === 'HC015' && /student_required/.test(r.message), r);
  p = await preview('enrollment', 'enroll_new', { class_id: c.cid, start_date: TODAY });
  ok('enroll_new from today: T0', p.tier === 0, p);

  // delete
  r = await tryIt(async () => asAdmin(`DELETE FROM enrollments WHERE id=$1`, [e2.id]));
  ok('deleting the backdated enrolment raw: HC120', refused(r, 'HC120'), r);
  done = await go('enrollment', 'delete', { enrollment_id: e2.id });
  ok('  through delete: gone, the whole row kept in row_before', (await enr(e2.id)) === undefined && (await override(done.override_id)).row_before[0].id === e2.id);

  // who may
  r = await tryIt(async () => preview('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 1 }, c.teacherUid));
  ok('a teacher cannot preview: 42501', r.code === '42501', r);
  r = await tryIt(async () => checked('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 1 }, { reason: R }, PARENT));
  ok('a parent cannot run the checked path: 42501', r.code === '42501', r);
  r = await tryIt(async () => asService(`SELECT public.money_change_checked('enrollment','set_rate',$1::jsonb)`, [JSON.stringify({ enrollment_id: id, rate_override_vnd: 1 })]));
  ok('the service role has no grant on it: 42501', r.code === '42501', r);
});

await section('G-13 the acknowledgement covers one change, exactly', async () => {
  const c = await mkClass(), c2 = await mkClass();
  const k = await mkKid(), other = await mkKid();
  const id = await enrol(k, c), id2 = await enrol(k, c2), idOther = await enrol(other, c);
  await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
  await inv(other, OLD.month, { recorded: 540000, status: 'paid' });
  const ack = { entity: 'enrollment', op: 'set_rate', target: id, students: [k], tier: 2, change: { class_ids: [c.cid] } };
  let r = await withAck(ack, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${id}'`);
  ok('an acknowledged set_rate of this enrolment passes', r.ok === true, r);
  r = await withAck(ack, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${id2}'`);
  ok('  the same acknowledgement does not cover the child\'s OTHER enrolment (another class): HC120', refused(r, 'HC120'), r);
  r = await withAck(ack, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${idOther}'`);
  ok('  nor another child\'s enrolment: HC120', refused(r, 'HC120'), r);
  r = await withAck(ack, `UPDATE enrollments SET start_date = '${RECENT.date}' WHERE id='${id}'`);
  ok('  nor another KIND of change to the same row (a start date under a set_rate): HC120', refused(r, 'HC120'), r);
  r = await withAck(ack, `DELETE FROM enrollments WHERE id='${id}'`);
  ok('  nor a delete: HC120', refused(r, 'HC120'), r);
  r = await withAck({ ...ack, tier: 1 }, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${id}'`);
  ok('A-8: stored at T1 while the trigger finds T2 (a payment landed in between): HC011 token_stale', r.code === 'HC011', r);
  r = await withAck({ ...ack, from: TODAY }, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${id}'`);
  ok('  a window that does not cover the write: HC120', refused(r, 'HC120'), r);
  r = await withAck(ack, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${id}'`, { sameTx: false });
  ok('  a replay: the flag names a real row of an EARLIER transaction: HC120', refused(r, 'HC120'), r);
  r = await withAck({ ...ack, entity: 'discount_assignment' }, `UPDATE enrollments SET rate_override_vnd = 1 WHERE id='${id}'`);
  ok('  an acknowledgement of another entity: HC120', refused(r, 'HC120'), r);
  const tr = { entity: 'enrollment', op: 'transfer', target: k, students: [k], tier: 2, change: { class_ids: [c.cid, c2.cid] } };
  r = await withAck(tr, `UPDATE enrollments SET end_date = '${OLDER.date}' WHERE id='${id}'`);
  ok('a transfer\'s acknowledgement lets the old class\'s enrolment end', r.ok === true, r);
  const c3 = await mkClass();
  const id3 = await enrol(k, c3);
  r = await withAck(tr, `UPDATE enrollments SET end_date = '${OLDER.date}' WHERE id='${id3}'`);
  ok('  but not a third, unrelated enrolment of the same child in that transaction: HC120', refused(r, 'HC120'), r);
  r = await withAck(tr, `UPDATE enrollments SET rate_override_vnd = 5 WHERE id='${id}'`);
  ok('  and not a rate on the old one: HC120', refused(r, 'HC120'), r);
});

await section('G-13 end / transfer / pause / set_days go through the live dated RPCs', async () => {
  const c = await mkClass(), c2 = await mkClass();
  const k = await mkKid();
  const id = await enrol(k, c);
  await inv(k, OLD.month, {});                               // issued, nothing paid: T1
  await att(c.s.old, k, 'Present', null);                    // a placeholder on a lesson 40 days ago
  await att(c.s.recent, k, 'Present', null);
  const endDay = await day(-45);
  // direct RPC, backdated into a billed past month
  let r = await tryIt(async () => asAdmin(`SELECT public.end_enrollment($1,$2,$3)`, [k, c.cid, endDay]));
  ok('end_enrollment called directly, backdated 45 days into a billed month: HC120 (step 1b only recorded it)', refused(r, 'HC120', /entity=enrollment/), r);
  ok('  the enrolment and the placeholder mark are untouched', (await enr(id)).end_date === null &&
     (await q1(`SELECT count(*)::int n FROM attendance WHERE student_id=$1`, [k])).n === 2);
  let p = await preview('enrollment', 'end', { student_id: k, class_id: c.cid, end_date: endDay });
  ok('preview end: T1, the row end_enrollment will pick, the days leaving',
     p.tier === 1 && p.target_id === id && p.reach_from > endDay && p.reach_to === '9999-12-31', p);
  const marksBefore = await nEvents('enrollment_rpc_mark');
  let done = await checked('enrollment', 'end', { student_id: k, class_id: c.cid, end_date: endDay }, { reason: R, token: p.token, confirm: true });
  ok('checked end: the enrolment ends that day and the placeholder marks after it are removed (the RPC\'s own rule)',
     (await q1(`SELECT end_date::text d FROM enrollments WHERE id=$1`, [id])).d === endDay &&
     (await q1(`SELECT count(*)::int n FROM attendance WHERE student_id=$1`, [k])).n === 0, await enr(id));
  ok('  the register guard let those marks through as part of THIS checked change, and recorded each (rpc = checked_end)',
     (await nEvents('enrollment_rpc_mark')) === marksBefore + 1 &&
     (await q1(`SELECT payload->>'rpc' r FROM money_change_events WHERE kind='enrollment_rpc_mark' ORDER BY created_at DESC, id DESC LIMIT 1`)).r === 'checked_end');
  ok('  one override row; the audit_log row of the RPC is there too',
     (await override(done.override_id)).op === 'end' &&
     (await q1(`SELECT count(*)::int n FROM audit_log WHERE action='end' AND entity='enrollment' AND entity_id=$1`, [id])).n === 1);
  p = await preview('enrollment', 'end', { student_id: k, class_id: c.cid, end_date: endDay });
  ok('ending it again: refused no_enrollment', p.refuse_code === 'no_enrollment', p);

  // end from today: T0, the RPC called directly still works
  const k2 = await mkKid();
  const id2 = await enrol(k2, c);
  r = await tryIt(async () => asAdmin(`SELECT public.end_enrollment($1,$2,$3)`, [k2, c.cid, TODAY]));
  ok('end_enrollment directly from today (T0): works as before, no dialog', r.ok !== undefined && (await q1(`SELECT end_date::text d FROM enrollments WHERE id=$1`, [id2])).d === TODAY, r);

  // transfer, backdated
  const k3 = await mkKid();
  const id3 = await enrol(k3, c);
  await inv(k3, OLD.month, { recorded: 540000, status: 'paid' });
  await att(c.s.old, k3, 'Present', null);
  const from = await day(-45);
  r = await tryIt(async () => asAdmin(`SELECT public.modify_enrollment_transfer($1,$2,$3,$4)`, [k3, c.cid, c2.cid, from]));
  ok('modify_enrollment_transfer directly, backdated over a paid month: HC120', refused(r, 'HC120'), r);
  done = await go('enrollment', 'transfer', { student_id: k3, old_class_id: c.cid, new_class_id: c2.cid, effective_date: from });
  const rows = (await asSuper(`SELECT class_id, start_date::text s, end_date::text e FROM enrollments WHERE student_id=$1 ORDER BY start_date`, [k3])).rows;
  ok('checked transfer: the old enrolment ends the day before, a new one starts in the other class (two rows under ONE acknowledgement)',
     rows.length === 2 && rows[0].class_id === c.cid && rows[0].e < from && rows[1].class_id === c2.cid && rows[1].s === from
     && (await override(done.override_id)).tier === 2, rows);
  ok('  placeholder marks moved with it: removed in the old class, seeded in the new one',
     (await q1(`SELECT count(*)::int n FROM attendance a JOIN sessions s ON s.id=a.session_id WHERE a.student_id=$1 AND s.class_id=$2`, [k3, c.cid])).n === 0 &&
     (await q1(`SELECT count(*)::int n FROM attendance a JOIN sessions s ON s.id=a.session_id WHERE a.student_id=$1 AND s.class_id=$2`, [k3, c2.cid])).n >= 1);
  r = await tryIt(async () => db.exec(`BEGIN; SELECT set_config('test.uid','${ADMIN}',true), set_config('test.jwt_role','authenticated',true); SET LOCAL ROLE authenticated;
     SELECT public.money_change_checked('enrollment','set_start_date','{"enrollment_id":"${id3}","start_date":"2025-01-01"}'::jsonb);
     UPDATE enrollments SET rate_override_vnd = 7 WHERE id='${id3}'; COMMIT;`));
  await db.exec('ROLLBACK').catch(() => {}); await db.exec('RESET ROLE');
  ok('after a checked change returns, the flag is cleared: a raw write later in the same transaction is refused', /HC120|nothing_to_change/.test(`${r.code} ${r.message}`), r);

  // pause
  const k4 = await mkKid();
  await enrol(k4, c);
  await inv(k4, OLD.month, { recorded: 540000, status: 'paid' });
  await att(c.s.old, k4, 'Present', c.teacherUid);
  const pf = await day(-42), pt = await day(-38);
  r = await tryIt(async () => asAdmin(`SELECT public.pause_enrollment($1,$2,$3,$4,'away')`, [k4, c.cid, pf, pt]));
  ok('pause_enrollment called directly over a paid past month: refused by the register guard, HC025 (its checked path now exists)',
     r.code === 'HC025' && (await q1(`SELECT status FROM attendance WHERE session_id=$1 AND student_id=$2`, [c.s.old, k4])).status === 'Present', r);
  p = await preview('enrollment', 'pause', { student_id: k4, class_id: c.cid, from: pf, to: pt, memo: 'away' });
  ok('preview pause: T2, the lesson in the window listed with its mark', p.tier === 2 && p.row_before.length === 1 && p.row_before[0].status === 'Present', p);
  done = await checked('enrollment', 'pause', { student_id: k4, class_id: c.cid, from: pf, to: pt, memo: 'away' }, { reason: R, token: p.token, confirm: true });
  ok('checked pause: the lesson is Excused, a pause window exists, one override row',
     (await q1(`SELECT status FROM attendance WHERE session_id=$1 AND student_id=$2`, [c.s.old, k4])).status === 'Excused' &&
     (await q1(`SELECT count(*)::int n FROM pause_windows WHERE student_id=$1`, [k4])).n === 1 && (await override(done.override_id)).op === 'pause');
  // A-6: a lesson 8 days old (after the free week; in the current month except on the 1st)
  const W8 = await clock(-8);
  const s8 = (await q1(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',$3) RETURNING id`,
    [c2.cid, W8.date, c2.teacherId])).id;
  const k5 = await mkKid(), k5b = await mkKid();
  await enrol(k5, c2, W8.date);
  await enrol(k5b, c2, W8.date);
  await att(s8, k5, 'Late', c2.teacherUid);
  await att(s8, k5b, 'Present', null);
  p = await preview('enrollment', 'pause', { student_id: k5, class_id: c2.cid, from: W8.date, to: W8.date });
  const ctrl = await preview('enrollment', 'pause', { student_id: k5b, class_id: c2.cid, from: W8.date, to: W8.date });
  const w8Past = (await q1(`SELECT public._money_month_is_past($1) p`, [W8.month])).p;
  ok('A-6 in the plan: a pause that un-bills a mark a PERSON made as Late, after the week, is at least T1 whatever the bill (a placeholder: T0)',
     p.tier >= 1 && (w8Past || ctrl.tier === 0), { p: p.tier, ctrl: ctrl.tier, w8Past });
  p = await preview('enrollment', 'pause', { student_id: k5, class_id: c2.cid, from: await day(3), to: await day(9) });
  ok('a pause of next week: T0', p.tier === 0, p);
  p = await preview('enrollment', 'pause', { student_id: k5, class_id: c.cid, from: pf, to: pt });
  ok('a pause in a class the child is not in: refused no_enrollment', p.refuse_code === 'no_enrollment', p);

  // weekdays, dated
  const k6 = await mkKid();
  const id6 = await enrol(k6, c);
  await inv(k6, OLD.month, { recorded: 540000, conf: 'confirmed' });
  r = await tryIt(async () => asAdmin(`SELECT public.change_enrollment_days($1,'{1,3}',$2)`, [id6, TODAY]));
  ok('change_enrollment_days directly from today, with a CONFIRMED past month behind it: T0, works (the past keeps its days)',
     r.ok !== undefined && (await q1(`SELECT count(*)::int n FROM enrollments WHERE student_id=$1`, [k6])).n === 2, r);
  const id6b = (await q1(`SELECT id FROM enrollments WHERE student_id=$1 AND end_date IS NULL`, [k6])).id;
  r = await tryIt(async () => asAdmin(`SELECT public.change_enrollment_days($1,'{2}',$2)`, [id6, OLDER.date]));
  ok('  backdated over the confirmed month: HC120 tier=3', refused(r, 'HC120', /tier=3/), r);
  p = await preview('enrollment', 'set_days', { enrollment_id: id6, allowed_days: [2], effective_date: OLD.date });
  ok('preview set_days backdated: T3 - correction mode, a second reason', p.tier === 3 && p.requires.correction_reason && p.review_required, p);
  r = await tryIt(async () => checked('enrollment', 'set_days', { enrollment_id: id6, allowed_days: [2], effective_date: OLD.date }, { reason: R, token: p.token, confirm: true }));
  ok('  without the correction reason: HC013', r.code === 'HC013', r);
  done = await checked('enrollment', 'set_days', { enrollment_id: id6, allowed_days: [2], effective_date: OLD.date }, { reason: R, token: p.token, confirm: true, corr: CORR });
  ok('  with it: split, and the change goes to the review queue',
     (await q1(`SELECT count(*)::int n FROM enrollments WHERE student_id=$1`, [k6])).n === 3 &&
     (await q1(`SELECT count(*)::int n FROM money_change_review_queue WHERE override_id=$1`, [done.override_id])).n === 1);
  p = await preview('enrollment', 'set_days', { enrollment_id: id6b, allowed_days: [9], effective_date: TODAY });
  ok('weekday 9: bad_args', p.refuse_code === 'bad_args', p);
});

await section('G-14 "from this date": change_enrollment_terms and set_terms_from', async () => {
  const c = await mkClass();
  const k = await mkKid();
  const id = await enrol(k, c, '2025-01-01', { rate: 100000 });
  await inv(k, OLD.month, { recorded: 540000, conf: 'confirmed' });
  let p = await preview('enrollment', 'set_terms_from', { enrollment_id: id, terms: { rate_override_vnd: 130000 }, effective_date: TODAY });
  ok('a new rate FROM TODAY on an enrolment with a confirmed past month: T0 - no dialog (the default the screens offer)', p.tier === 0 && p.change.split === true, p);
  const done = await checked('enrollment', 'set_terms_from', { enrollment_id: id, terms: { rate_override_vnd: 130000 }, effective_date: TODAY });
  const rows = (await asSuper(`SELECT id, start_date::text s, end_date::text e, rate_override_vnd r FROM enrollments WHERE student_id=$1 ORDER BY start_date`, [k])).rows;
  ok('  the old enrolment ends yesterday with its OLD rate; a new one starts today with the new rate',
     rows.length === 2 && rows[0].r === 100000 && rows[0].e === (await day(-1)) && rows[1].s === TODAY && rows[1].r === 130000, rows);
  ok('  one override row at T0, and the RPC\'s own audit_log row',
     (await override(done.override_id)).tier === 0 && (await q1(`SELECT count(*)::int n FROM audit_log WHERE action='change_terms' AND entity_id=$1`, [id])).n === 1);
  p = await preview('enrollment', 'set_terms_from', { enrollment_id: id, terms: { rate_override_vnd: 90000 }, effective_date: OLD.date });
  ok('the same change dated in the confirmed past month: T3', p.tier === 3, p);
  let r = await tryIt(async () => asAdmin(`SELECT public.change_enrollment_terms($1, '{"discount_type":"percent","discount_value":10,"discount_cadence":"monthly"}'::jsonb, $2)`, [rows[1].id, TODAY]));
  ok('change_enrollment_terms called directly from today (in place: the row starts today): works',
     r.ok !== undefined && (await enr(rows[1].id)).discount_value === 10, r);
  r = await tryIt(async () => asAdmin(`SELECT public.change_enrollment_terms($1, '{"rate_override_vnd":1}'::jsonb, $2)`, [id, OLD.date]));
  ok('  directly, backdated: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => as(c.teacherUid, 'authenticated', 'authenticated', `SELECT public.change_enrollment_terms($1, '{"rate_override_vnd":1}'::jsonb, $2)`, [id, TODAY]));
  ok('  by a teacher: 42501', r.code === '42501', r);
  r = await tryIt(async () => asService(`SELECT public.change_enrollment_terms($1, '{"rate_override_vnd":1}'::jsonb, $2)`, [id, TODAY]));
  ok('  by the service role: 42501 (no grant)', r.code === '42501', r);
  r = await tryIt(async () => asAdmin(`SELECT public.change_enrollment_terms($1, '{"start_date":"2020-01-01"}'::jsonb, $2)`, [rows[1].id, TODAY]));
  ok('  a term that is not a rate or a discount (start_date): 22023, nothing changed', r.code === '22023', r);
  r = await tryIt(async () => asAdmin(`SELECT public.change_enrollment_terms($1, '{"discount_type":null}'::jsonb, $2)`, [rows[1].id, TODAY]));
  ok('  half a discount: 22023', r.code === '22023', r);
  p = await preview('enrollment', 'set_terms_from', { enrollment_id: rows[1].id, terms: { rate_override_vnd: 130000 }, effective_date: TODAY });
  ok('the same terms again: nothing_to_change', p.refuse_code === 'nothing_to_change', p);
});

await section('b.5 deactivating a child (trigger-made enrolment ends are judged)', async () => {
  const c = await mkClass();
  const k = await mkKid();
  const id = await enrol(k, c);
  let r = await tryIt(async () => asAdmin(`UPDATE students SET is_active = false WHERE id=$1`, [k]));
  ok('the usual case (this month not signed off): deactivating ends the enrolment today, no dialog',
     r.ok !== undefined && (await enr(id)).end_date !== null, r);
  const k2 = await mkKid();
  const id2 = await enrol(k2, c);
  await inv(k2, NOW.month, { conf: 'confirmed' });
  r = await tryIt(async () => asAdmin(`UPDATE students SET is_active = false WHERE id=$1`, [k2]));
  ok('this month\'s bill is CONFIRMED: a raw deactivate is HC120 (the enrolment end the trigger makes is judged), child still active',
     refused(r, 'HC120', /entity=enrollment; tier=2/) && (await q1(`SELECT is_active a FROM students WHERE id=$1`, [k2])).a === true, r);
  const p = await preview('enrollment', 'end_all', { student_id: k2 });
  ok('preview end_all: T2, every open enrolment listed', p.tier === 2 && p.row_before.length === 1 && p.change.end_date === TODAY, p);
  await checked('enrollment', 'end_all', { student_id: k2 }, { reason: R, token: p.token, confirm: true });
  r = await tryIt(async () => asAdmin(`UPDATE students SET is_active = false WHERE id=$1`, [k2]));
  ok('  the checked end_all, then the deactivate: both go through',
     r.ok !== undefined && (await q1(`SELECT end_date::text d FROM enrollments WHERE id=$1`, [id2])).d === TODAY &&
     (await q1(`SELECT is_active a FROM students WHERE id=$1`, [k2])).a === false, r);
  ok('end_all for a child with no open enrolment: nothing_to_change', (await preview('enrollment', 'end_all', { student_id: k2 })).refuse_code === 'nothing_to_change');
});

await section('G-13 bulk (BulkEnrollmentDateSetter) and HC050', async () => {
  const c = await mkClass();
  const items = [];
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const k = await mkKid();
    const id = await enrol(k, c, i === 2 ? OLDER.date : TODAY);
    if (i === 2) await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
    const args = { enrollment_id: id, start_date: i === 2 ? RECENT.date : await day(1) };
    const p = await preview('enrollment', 'set_start_date', args);
    items.push({ entity: 'enrollment', op: 'set_start_date', args, token: p.token, confirm: p.tier >= 1 });
    ids.push(id);
  }
  let r = (await asAdmin(`SELECT public.money_changes_checked_bulk($1::jsonb, $2, gen_random_uuid()) r`, [JSON.stringify(items), R])).rows[0].r;
  ok('bulk of three: the two T0 items are done; the T2 item is refused on the batch reason alone (HC017)',
     r.done.length === 2 && r.refused.length === 1 && r.refused[0].code === 'HC017', r);
  items[2].reason = 'This one was entered a month too early';
  r = (await asAdmin(`SELECT public.money_changes_checked_bulk($1::jsonb, $2, gen_random_uuid()) r`, [JSON.stringify([items[2]]), R])).rows[0].r;
  ok('  with its own reason it is done, and a T2 change made in bulk is reviewed', r.done.length === 1 && r.done[0].review_required === true, r);
  r = await tryIt(async () => asAdmin(`SELECT public.money_changes_checked_bulk($1::jsonb, $2, gen_random_uuid())`,
    [JSON.stringify(Array.from({ length: 51 }, () => items[0])), R]));
  ok('51 items: HC016', r.code === 'HC016', r);

  const k = await mkKid();
  const id = await enrol(k, c);
  await db.exec(`ALTER TABLE enrollments DISABLE TRIGGER zz_enrollment_money_guard`);
  r = await tryIt(async () => go('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 5 }));
  await db.exec(`ALTER TABLE enrollments ENABLE TRIGGER zz_enrollment_money_guard`);
  ok('guard trigger disabled: the checked path refuses to work, HC050, nothing written', r.code === 'HC050' && (await enr(id)).rate_override_vnd === null, r);

  // families pay in advance: a bill already SIGNED OFF for next month is inside an open-ended reach
  const k2 = await mkKid();
  const id2 = await enrol(k2, c, TODAY);
  await inv(k2, NEXT_MONTH_1.slice(0, 7), { conf: 'confirmed' });
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET rate_override_vnd = 5 WHERE id=$1`, [id2]));
  ok('an enrolment that began today, with NEXT month\'s bill already confirmed: a raw rate is HC120 tier=2 (an open-ended reach runs to the last billed month)',
     refused(r, 'HC120', /tier=2/), r);

  // the exec re-reads the row it was shown, locked, before writing
  const k3 = await mkKid();
  const id3 = await enrol(k3, c);
  const p = await preview('enrollment', 'set_rate', { enrollment_id: id3, rate_override_vnd: 111 });
  await asSuper(`UPDATE enrollments SET allowed_days = '{1}' WHERE id=$1`, [id3]);
  r = await tryIt(async () => asSuper(`SELECT public._money_exec__enrollment($1::jsonb, $2)`, [JSON.stringify(p), ADMIN]));
  ok('the exec refuses a plan whose enrolment changed since it was previewed: HC011, nothing written',
     r.code === 'HC011' && (await enr(id3)).rate_override_vnd === null, r);
});

// ---------------------------------------------------------------- G-15
await section('G-15 discount assignments and referral bonuses (P16)', async () => {
  const c = await mkClass();
  const k = await mkKid();
  await enrol(k, c);
  await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
  const def = (await q1(`INSERT INTO discount_definitions(name,type,cadence,value,start_month) VALUES ('Staff child','percent','monthly',10,'2025-01') RETURNING id`)).id;
  let r = await tryIt(async () => asAdmin(`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ($1,$2,$3)`, [k, def, OLDER.date]));
  ok('P16 a discount assigned from two months ago, raw: HC120 entity=discount_assignment, "discount screen"',
     refused(r, 'HC120', /entity=discount_assignment; tier=2; .*discount screen, with a reason/), r);
  r = await tryIt(async () => asAdmin(`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ($1,$2,$3)`, [k, def, TODAY]));
  ok('a discount from this month (today), raw: allowed', r.ok !== undefined, r);
  const cur = (await q1(`SELECT id FROM discount_assignments WHERE student_id=$1`, [k])).id;
  r = await tryIt(async () => asAdmin(`UPDATE discount_assignments SET note = 'agreed with the family' WHERE id=$1`, [cur]));
  ok('a note alone: allowed', r.ok !== undefined, r);
  r = await tryIt(async () => asAdmin(`UPDATE discount_assignments SET effective_to = $2 WHERE id=$1`, [cur, await day(20)]));
  ok('ending it later this month / next: allowed (T0)', r.ok !== undefined, r);
  let p = await preview('discount_assignment', 'assign', { student_id: k, discount_def_id: def, effective_from: OLDER.date });
  ok('preview assign from the past: T2', p.tier === 2 && p.allowed, p);
  let done = await checked('discount_assignment', 'assign', { student_id: k, discount_def_id: def, effective_from: OLDER.date, note: 'backdated' },
    { reason: R, token: (await preview('discount_assignment', 'assign', { student_id: k, discount_def_id: def, effective_from: OLDER.date, note: 'backdated' })).token, confirm: true });
  const past = (await q1(`SELECT id FROM discount_assignments WHERE student_id=$1 AND note='backdated'`, [k])).id;
  ok('  confirmed: assigned, created_by the admin, one override row', !!past && (await override(done.override_id)).entity === 'discount_assignment');
  const other = await mkKid();
  for (const [lane, run] of [['admin', asAdmin], ['service', asService], ['owner', asSuper]]) {
    r = await tryIt(async () => run(`UPDATE discount_assignments SET student_id = $2 WHERE id=$1`, [past, other]));
    ok(`R-5 an assignment re-pointed at another child, ${lane} lane: HC121 discount_identity`, refused(r, 'HC121', /code=discount_identity; .*Remove it and assign it to the other child/), r);
  }
  r = await tryIt(async () => asAdmin(`UPDATE discount_assignments SET effective_to = $2 WHERE id=$1`, [past, OLD.date]));
  ok('ending the backdated assignment in the paid past month, raw: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE discount_assignments SET effective_to = $2 WHERE id=$1`, [past, await day(-1)]));
  ok('  ending it YESTERDAY (only days from today leave): allowed', r.ok !== undefined, r);
  await asSuper(`UPDATE discount_assignments SET effective_to = NULL WHERE id=$1`, [past]);
  done = await go('discount_assignment', 'set_end', { id: past, effective_to: OLD.date });
  ok('  through set_end: changed', (await q1(`SELECT effective_to::text d FROM discount_assignments WHERE id=$1`, [past])).d === OLD.date && (await override(done.override_id)).op === 'set_end');
  r = await tryIt(async () => asAdmin(`DELETE FROM discount_assignments WHERE id=$1`, [past]));
  ok('deleting it raw: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asService(`DELETE FROM discount_assignments WHERE id=$1`, [past]));
  ok('  service lane: HC120', refused(r, 'HC120'), r);
  done = await go('discount_assignment', 'remove', { id: past });
  ok('  through remove: gone, the row kept in row_before',
     (await q1(`SELECT count(*)::int n FROM discount_assignments WHERE id=$1`, [past])).n === 0 && (await override(done.override_id)).row_before[0].id === past);
  p = await preview('discount_assignment', 'assign', { student_id: k, discount_def_id: randomUUID(), effective_from: TODAY });
  ok('assigning a definition that does not exist: bad_args', p.refuse_code === 'bad_args', p);
  p = await preview('discount_assignment', 'edit', { id: cur, note: 'agreed with the family' });
  ok('an edit that changes nothing: nothing_to_change', p.refuse_code === 'nothing_to_change', p);

  // bonuses
  r = await tryIt(async () => asAdmin(`INSERT INTO referral_bonuses(student_id, type, cadence, value, effective_from) VALUES ($1,'amount','once',200000,$2)`, [k, OLDER.date]));
  ok('a referral bonus from two months ago, raw: HC120 entity=referral_bonus', refused(r, 'HC120', /entity=referral_bonus/), r);
  done = await go('referral_bonus', 'assign', { student_id: k, type: 'amount', cadence: 'once', value: 200000, effective_from: OLDER.date });
  const bonus = (await q1(`SELECT id FROM referral_bonuses WHERE student_id=$1`, [k])).id;
  ok('  through assign: written', !!bonus && (await override(done.override_id)).entity === 'referral_bonus');
  r = await tryIt(async () => asAdmin(`UPDATE referral_bonuses SET value = 900000 WHERE id=$1`, [bonus]));
  ok('its value changed raw: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE referral_bonuses SET student_id = $2 WHERE id=$1`, [bonus, other]));
  ok('R-5 a bonus re-pointed: HC121 discount_identity', refused(r, 'HC121', /discount_identity/), r);
  done = await go('referral_bonus', 'edit', { id: bonus, value: 250000 });
  ok('  through edit: changed, old and new value in the row',
     (await q1(`SELECT value v FROM referral_bonuses WHERE id=$1`, [bonus])).v === 250000 && (await override(done.override_id)).change.old.value === 200000);
  p = await preview('referral_bonus', 'assign', { student_id: k, type: 'percent', cadence: 'once', value: -1, effective_from: TODAY });
  ok('a negative bonus: bad_args', p.refuse_code === 'bad_args', p);
  await asSuper(`UPDATE invoices SET confirmation_status = 'confirmed' WHERE student_id=$1 AND month=$2`, [k, OLD.month]);
  r = await withAck({ entity: 'referral_bonus', op: 'set_end', target: bonus, students: [k], tier: 3 }, `UPDATE referral_bonuses SET value = 1 WHERE id='${bonus}'`);
  ok('an acknowledged set_end does not cover a value change: HC120', refused(r, 'HC120'), r);
  r = await withAck({ entity: 'referral_bonus', op: 'edit', target: bonus, students: [k], tier: 3 }, `UPDATE referral_bonuses SET value = 1 WHERE id='${bonus}'`);
  ok('  an acknowledged edit of that row does', r.ok === true, r);

  // the first of next month is read by the calculator for THIS month
  const k9 = await mkKid();
  await enrol(k9, c, TODAY);
  await inv(k9, NOW.month, { conf: 'confirmed' });
  r = await tryIt(async () => asAdmin(`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ($1,$2,$3)`, [k9, def, NEXT_MONTH_1]));
  ok('a discount dated the 1st of NEXT month reaches THIS month\'s confirmed bill (calculate-tuition reads effective_from <= next month\'s first day): HC120',
     refused(r, 'HC120', /tier=2/), r);
});

await section('G-15 discount definitions (definition_in_use)', async () => {
  const c = await mkClass();
  const k = await mkKid();
  await enrol(k, c);
  await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
  const used = (await q1(`INSERT INTO discount_definitions(name,type,cadence,value,start_month) VALUES ('Old','percent','monthly',10,'2025-01') RETURNING id`)).id;
  const fresh = (await q1(`INSERT INTO discount_definitions(name,type,cadence,value,start_month) VALUES ('New','percent','monthly',10,'2025-01') RETURNING id`)).id;
  await asSuper(`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ($1,$2,$3)`, [k, used, OLDER.date]);
  await asSuper(`INSERT INTO discount_assignments(student_id, discount_def_id, effective_from) VALUES ($1,$2,$3)`, [k, fresh, TODAY]);
  let r = await tryIt(async () => asAdmin(`UPDATE discount_definitions SET value = 50 WHERE id=$1`, [used]));
  ok('the value of a definition whose assignment reaches a paid past month: HC121 definition_in_use, "create a new discount"',
     refused(r, 'HC121', /code=definition_in_use; .*Create a new discount and assign it from a date/), r);
  r = await tryIt(async () => asAdmin(`UPDATE discount_definitions SET type = 'amount' WHERE id=$1`, [used]));
  ok('  its type: HC121', refused(r, 'HC121'), r);
  r = await tryIt(async () => asAdmin(`UPDATE discount_definitions SET is_active = false WHERE id=$1`, [used]));
  ok('  switching it off (the calculator skips an inactive definition for every month): HC121', refused(r, 'HC121'), r);
  r = await tryIt(async () => asAdmin(`DELETE FROM discount_definitions WHERE id=$1`, [used]));
  ok('  deleting it: HC121', refused(r, 'HC121'), r);
  r = await tryIt(async () => asService(`UPDATE discount_definitions SET value = 50 WHERE id=$1`, [used]));
  ok('  service lane: HC121', refused(r, 'HC121'), r);
  r = await tryIt(async () => asSuper(`UPDATE discount_definitions SET value = 50 WHERE id=$1`, [used]));
  ok('  owner lane too: HC121 (there is no checked path; a new discount is the way)', refused(r, 'HC121'), r);
  r = await tryIt(async () => asAdmin(`UPDATE discount_definitions SET name = 'Old (staff)' WHERE id=$1`, [used]));
  ok('  its name: allowed', r.ok !== undefined, r);
  r = await tryIt(async () => asAdmin(`UPDATE discount_definitions SET value = 15 WHERE id=$1`, [fresh]));
  ok('a definition assigned only from this month: its value may change', r.ok !== undefined, r);
  r = await tryIt(async () => asAdmin(`INSERT INTO discount_definitions(name,type,cadence,value,start_month) VALUES ('x','amount','once',5,'2026-01')`));
  ok('creating a definition: allowed', r.ok !== undefined, r);
});

// ---------------------------------------------------------------- G-17
await section('G-17 pay rates (P18)', async () => {
  const c = await mkClass();
  const t = c.teacherId;
  await asSuper(`INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,'1900-01-01','hourly',200000)`, [t]);
  let r = await tryIt(async () => asAdmin(`INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,$2,'hourly',250000)`, [t, await day(-50)]));
  ok('P18 a rate dated 50 days ago for someone with Held lessons since, raw: HC120 entity=pay_rate tier=1, "pay-rate history"',
     refused(r, 'HC120', /entity=pay_rate; tier=1; .*pay-rate history, with a reason/), r);
  r = await tryIt(async () => asAdmin(`INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,$2,'hourly',250000)`, [t, FUTURE.date]));
  ok('a raise from a future date, raw: allowed (T0)', r.ok !== undefined, r);
  const fut = (await q1(`SELECT id FROM staff_pay_rates WHERE teacher_id=$1 AND effective_from=$2`, [t, FUTURE.date])).id;
  r = await tryIt(async () => asAdmin(`UPDATE staff_pay_rates SET note = 'agreed' WHERE id=$1`, [fut]));
  ok('a note alone: allowed', r.ok !== undefined, r);
  r = await tryIt(async () => asAdmin(`UPDATE staff_pay_rates SET effective_from = $2 WHERE id=$1`, [fut, await day(-50)]));
  ok('that future row re-dated into the past, raw: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asService(`INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,$2,'hourly',250000)`, [t, await day(-50)]));
  ok('service lane, backdated: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE staff_pay_rates SET hourly_rate_vnd = 999999 WHERE teacher_id=$1 AND effective_from='1900-01-01'`, [t]));
  ok('the baseline row edited in place: HC120 (it pays every lesson taught so far)', refused(r, 'HC120'), r);

  const from = await day(-50);
  let p = await preview('pay_rate', 'set', { teacher_id: t, effective_from: from, pay_rate_type: 'hourly', hourly_rate_vnd: 250000, per_session_rate_vnd: 0, note: 'recorded wrongly' });
  ok('preview set, backdated: T1, the lessons already taught counted, no bill in it',
     p.tier === 1 && p.reach.payroll.held_lessons >= 1 && p.invoices_before.length === 0 && p.refresh_pairs.length === 0 && p.change.mirror.hourly_rate_vnd === 250000, p);
  let done = await checked('pay_rate', 'set', { teacher_id: t, effective_from: from, pay_rate_type: 'hourly', hourly_rate_vnd: 250000, per_session_rate_vnd: 0, note: 'recorded wrongly' },
    { reason: R, token: p.token, confirm: true });
  ok('  confirmed: a plain INSERT (no ON CONFLICT), created_by the admin, and the mirror ("the rate now") follows in the same transaction',
     (await q1(`SELECT count(*)::int n FROM staff_pay_rates WHERE teacher_id=$1 AND effective_from=$2 AND hourly_rate_vnd=250000 AND created_by=$3`, [t, from, ADMIN])).n === 1 &&
     (await q1(`SELECT hourly_rate_vnd h FROM teachers WHERE id=$1`, [t])).h === 250000 && (await override(done.override_id)).entity === 'pay_rate', done);
  done = await go('pay_rate', 'set', { teacher_id: t, effective_from: from, pay_rate_type: 'per_session', hourly_rate_vnd: 0, per_session_rate_vnd: 300000 });
  ok('the same date again: the row is UPDATED, not doubled (owner question 5: the old upsert named a conflict target)',
     (await q1(`SELECT count(*)::int n FROM staff_pay_rates WHERE teacher_id=$1 AND effective_from=$2`, [t, from])).n === 1 &&
     (await q1(`SELECT pay_rate_type p FROM teachers WHERE id=$1`, [t])).p === 'per_session' && (await override(done.override_id)).row_before.length === 1);
  p = await preview('pay_rate', 'set', { teacher_id: t, effective_from: from, pay_rate_type: 'per_session', hourly_rate_vnd: 0, per_session_rate_vnd: 300000 });
  ok('  unchanged: nothing_to_change', p.refuse_code === 'nothing_to_change', p);
  p = await preview('pay_rate', 'set', { teacher_id: t, effective_from: TODAY, pay_rate_type: 'hourly', hourly_rate_vnd: 0, per_session_rate_vnd: 0 });
  ok('a rate of 0: bad_args (the table\'s own rule, said before the write)', p.refuse_code === 'bad_args', p);
  p = await preview('pay_rate', 'set', { teacher_id: t, assistant_id: t, effective_from: TODAY, pay_rate_type: 'hourly', hourly_rate_vnd: 5 });
  ok('two people at once: bad_args', p.refuse_code === 'bad_args', p);
  p = await preview('pay_rate', 'set', { teacher_id: t, effective_from: TODAY, pay_rate_type: 'hourly', hourly_rate_vnd: 260000, per_session_rate_vnd: 0 });
  ok('a rate from TODAY: T0 ("staff rate from today: none")', p.tier === 0, p);

  // a locked month
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [OLD.month]);
  p = await preview('pay_rate', 'set', { teacher_id: t, effective_from: await day(-45), pay_rate_type: 'hourly', hourly_rate_vnd: 210000, per_session_rate_vnd: 0 });
  ok('a rate reaching a CLOSED payroll month: T3, correction mode, reviewed, closed_payroll in the impact',
     p.tier === 3 && p.requires.correction_reason && p.review_required && p.impact.closed_payroll === true && p.reach.payroll.locked_months.includes(OLD.month), p);
  r = await tryIt(async () => asAdmin(`DELETE FROM staff_pay_rates WHERE teacher_id=$1 AND effective_from=$2`, [t, from]));
  ok('deleting a rate that pays into the closed month, raw: HC120 tier=3', refused(r, 'HC120', /tier=3/), r);
  const rid = (await q1(`SELECT id FROM staff_pay_rates WHERE teacher_id=$1 AND effective_from=$2`, [t, from])).id;
  done = await go('pay_rate', 'remove', { rate_id: rid });
  ok('  through remove (with both reasons): gone; the mirror falls back to the rate now in force',
     (await q1(`SELECT count(*)::int n FROM staff_pay_rates WHERE id=$1`, [rid])).n === 0 && (await q1(`SELECT pay_rate_type p, hourly_rate_vnd h FROM teachers WHERE id=$1`, [t])).h === 200000);
  await asSuper(`DELETE FROM payroll_periods WHERE month=$1`, [OLD.month]);
  const baseId = (await q1(`SELECT id FROM staff_pay_rates WHERE teacher_id=$1 AND effective_from='1900-01-01'`, [t])).id;
  p = await preview('pay_rate', 'remove', { rate_id: baseId });
  ok('the person\'s first rate cannot be removed: first_rate', p.refuse_code === 'first_rate' && p.allowed === false, p);
  const ev = await nEvents('owner_lane');
  r = await tryIt(async () => asSuper(`INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,$2,'hourly',250000)`, [t, await day(-50)]));
  ok('owner lane: passes with one owner_lane event', r.ok !== undefined && (await nEvents('owner_lane')) === ev + 1, r);
  r = await withAck({ entity: 'pay_rate', op: 'set', target: randomUUID(), tier: 3 }, `UPDATE staff_pay_rates SET hourly_rate_vnd = 1 WHERE id='${baseId}'`);
  ok('an acknowledgement for ANOTHER person does not cover this one\'s row: HC120', refused(r, 'HC120'), r);
  r = await withAck({ entity: 'pay_rate', op: 'set', target: t, tier: 3 }, `UPDATE staff_pay_rates SET hourly_rate_vnd = 1 WHERE id='${baseId}'`);
  ok('  for this person: passes', r.ok === true, r);

  // an assistant
  const ta = (await q1(`INSERT INTO teaching_assistants(full_name, pay_rate_type, hourly_rate_vnd) VALUES ('ta','hourly',80000) RETURNING id`)).id;
  await asSuper(`INSERT INTO staff_pay_rates(assistant_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,'1900-01-01','hourly',80000)`, [ta]);
  await asSuper(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',$2)`, [c.s.old, ta]);
  r = await tryIt(async () => asAdmin(`INSERT INTO staff_pay_rates(assistant_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,$2,'hourly',90000)`, [ta, await day(-50)]));
  ok('an assistant\'s backdated rate, raw: HC120', refused(r, 'HC120'), r);
  done = await go('pay_rate', 'set', { assistant_id: ta, effective_from: await day(-50), pay_rate_type: 'hourly', hourly_rate_vnd: 90000, per_session_rate_vnd: 0 });
  ok('  through set: written, the assistant\'s mirror follows', (await q1(`SELECT hourly_rate_vnd h FROM teaching_assistants WHERE id=$1`, [ta])).h === 90000 && done.tier === 1, done);
});

await section('G-17 the mirror columns on teachers / teaching_assistants', async () => {
  const c = await mkClass();          // a teacher with Held lessons and NO history row
  let r = await tryIt(async () => asAdmin(`UPDATE teachers SET hourly_rate_vnd = 999999 WHERE id=$1`, [c.teacherId]));
  ok('someone with taught lessons and no dated rate: the mirror IS the rate - a raw edit is HC120, "from the pay-rate history, from a date"',
     refused(r, 'HC120', /entity=pay_rate; .*pay-rate history, from a date/), r);
  r = await tryIt(async () => asAdmin(`UPDATE teachers SET full_name = 'New name' WHERE id=$1`, [c.teacherId]));
  ok('  a name, a phone number: allowed (the guard fires only when a rate column changes)', r.ok !== undefined, r);
  r = await tryIt(async () => asService(`UPDATE teachers SET hourly_rate_vnd = 999999 WHERE id=$1`, [c.teacherId]));
  ok('  service lane: HC120', refused(r, 'HC120'), r);
  await asSuper(`INSERT INTO staff_pay_rates(teacher_id, effective_from, pay_rate_type, hourly_rate_vnd) VALUES ($1,'1900-01-01','hourly',200000)`, [c.teacherId]);
  r = await tryIt(async () => asAdmin(`UPDATE teachers SET hourly_rate_vnd = 220000 WHERE id=$1`, [c.teacherId]));
  ok('the same teacher WITH a baseline row: the mirror pays nobody, a staff-form save is allowed (T0)', r.ok !== undefined, r);
  const fresh = (await q1(`INSERT INTO teachers(full_name) VALUES ('new') RETURNING id`)).id;
  r = await tryIt(async () => asAdmin(`UPDATE teachers SET pay_rate_type='per_session', per_session_rate_vnd = 300000, hourly_rate_vnd = 0 WHERE id=$1`, [fresh]));
  ok('a new person with no lessons: allowed', r.ok !== undefined, r);
  const ta = (await q1(`INSERT INTO teaching_assistants(full_name, hourly_rate_vnd) VALUES ('ta', 80000) RETURNING id`)).id;
  await asSuper(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',$2)`, [c.s.old, ta]);
  r = await tryIt(async () => asAdmin(`UPDATE teaching_assistants SET hourly_rate_vnd = 1 WHERE id=$1`, [ta]));
  ok('an assistant with a taught lesson and no dated rate: HC120', refused(r, 'HC120'), r);
  // the first dated rate of such a person moves the mirror: the plan shows it and the one acknowledgement covers both writes
  const p = await preview('pay_rate', 'set', { assistant_id: ta, effective_from: TODAY, pay_rate_type: 'hourly', hourly_rate_vnd: 95000, per_session_rate_vnd: 0 });
  ok('their first dated rate, from today, changes "the rate now" and so what the uncovered lessons pay: the plan says T1, not T0',
     p.tier === 1 && p.change.mirror.hourly_rate_vnd === 95000 && p.reach_from === '1900-01-01', p);
  const done = await checked('pay_rate', 'set', { assistant_id: ta, effective_from: TODAY, pay_rate_type: 'hourly', hourly_rate_vnd: 95000, per_session_rate_vnd: 0 },
    { reason: R, token: p.token, confirm: true });
  ok('  confirmed: the row and the mirror are both written under the one acknowledgement',
     done.written === 2 && (await q1(`SELECT hourly_rate_vnd h FROM teaching_assistants WHERE id=$1`, [ta])).h === 95000, done);
});

// ---------------------------------------------------------------- G-18
await section('G-18 unfreezing a bill (P19)', async () => {
  const c = await mkClass();
  const k = await mkKid();
  await enrol(k, c);
  const bill = await inv(k, OLD.month, { frozen: true });
  let r = await tryIt(async () => asAdmin(`UPDATE invoices SET tuition_frozen = false WHERE id=$1`, [bill]));
  ok('an admin unfreezing raw (BillFreezePanel\'s old write, no reason stored): HC120 entity=invoice_freeze tier=2',
     refused(r, 'HC120', /entity=invoice_freeze; tier=2; .*unfrozen from the child's bill, with a reason/) &&
     (await q1(`SELECT tuition_frozen f FROM invoices WHERE id=$1`, [bill])).f === true, r);
  r = await tryIt(async () => asService(`UPDATE invoices SET tuition_frozen = false, total_amount = 1 WHERE id=$1`, [bill]));
  ok('service lane: the bill stays frozen with its figures (the existing freeze guard; the calculator never unfreezes)',
     (await q1(`SELECT tuition_frozen f, total_amount t FROM invoices WHERE id=$1`, [bill])).f === true &&
     (await q1(`SELECT total_amount t FROM invoices WHERE id=$1`, [bill])).t === 540000, r);
  r = await tryIt(async () => asAdmin(`UPDATE invoices SET recorded_payment = 100000 WHERE id=$1`, [bill]));
  ok('a payment recorded on a frozen bill: untouched by this guard', r.ok !== undefined, r);
  let p = await preview('invoice_freeze', 'unfreeze', { invoice_id: bill });
  ok('preview unfreeze of a bill with money on it: T3 (correction mode), the bill and its state shown',
     p.tier === 3 && p.requires.correction_reason && p.reach.pairs[0].state === 'frozen' && p.invoices_before[0].id === bill && p.impact.unfreeze === true, p);
  const bill2 = await inv(await mkKid(), OLD.month, { frozen: true });
  p = await preview('invoice_freeze', 'unfreeze', { invoice_id: bill2 });
  ok('preview unfreeze, nothing paid, not confirmed: T2 - never T0', p.tier === 2 && p.requires.reason && p.requires.confirm, p);
  r = await tryIt(async () => checked('invoice_freeze', 'unfreeze', { invoice_id: bill2 }, { token: p.token, confirm: true }));
  ok('  without a reason: HC010, still frozen', r.code === 'HC010' && (await q1(`SELECT tuition_frozen f FROM invoices WHERE id=$1`, [bill2])).f === true, r);
  let done = await checked('invoice_freeze', 'unfreeze', { invoice_id: bill2 }, { reason: R, token: p.token, confirm: true });
  const o = await override(done.override_id);
  ok('  with a reason: unfrozen, the reason is on the record, the bill is in refresh_pairs',
     (await q1(`SELECT tuition_frozen f FROM invoices WHERE id=$1`, [bill2])).f === false && o.reason === R && o.refresh_pairs.length === 1 && o.tier === 2, o);
  ok('  already unfrozen: not_frozen', (await preview('invoice_freeze', 'unfreeze', { invoice_id: bill2 })).refuse_code === 'not_frozen');
  r = await tryIt(async () => asAdmin(`UPDATE invoices SET tuition_frozen = true, frozen_reason = 'history corrected' WHERE id=$1`, [bill2]));
  ok('freezing (false -> true) is not guarded here: allowed', r.ok !== undefined && (await q1(`SELECT tuition_frozen f FROM invoices WHERE id=$1`, [bill2])).f === true, r);
  await asAdmin(`UPDATE invoices SET recorded_payment = 0 WHERE id=$1`, [bill]);
  p = await preview('invoice_freeze', 'unfreeze', { student_id: k, month: OLD.month });
  ok('G-9 under it: the payment reset to 0 first does not lower the tier (the bill floor): still T3', p.tier === 3, p);
  r = await tryIt(async () => checked('invoice_freeze', 'unfreeze', { student_id: k, month: OLD.month }, { reason: R, token: p.token, confirm: true }));
  ok('  T3 without the correction reason: HC013', r.code === 'HC013', r);
  done = await checked('invoice_freeze', 'unfreeze', { student_id: k, month: OLD.month }, { reason: R, token: p.token, confirm: true, corr: CORR });
  ok('  with it: unfrozen and in the review queue',
     (await q1(`SELECT tuition_frozen f FROM invoices WHERE id=$1`, [bill])).f === false &&
     (await q1(`SELECT count(*)::int n FROM money_change_review_queue WHERE override_id=$1`, [done.override_id])).n === 1);
  const bill3 = await inv(await mkKid(), OLD.month, { frozen: true });
  r = await withAck({ entity: 'invoice_freeze', op: 'unfreeze', target: bill2, tier: 3, from: OLD.month + '-01', to: OLD.month + '-01',
    students: [(await q1(`SELECT student_id s FROM invoices WHERE id=$1`, [bill3])).s] }, `UPDATE invoices SET tuition_frozen = false WHERE id='${bill3}'`);
  ok('an acknowledgement for another bill does not unfreeze this one: HC120', refused(r, 'HC120'), r);
});

// ---------------------------------------------------------------- G-19
await section('G-19 family and sibling fields (P20, R-14)', async () => {
  const c = await mkClass();
  const fam = await mkFamily(), fam2 = await mkFamily();
  const a = await mkKid(fam), b = await mkKid(fam);
  await enrol(a, c);
  await enrol(b, c);
  await inv(a, OLD.month, { recorded: 540000, status: 'paid' });
  const fresh = await mkKid();
  let r = await tryIt(async () => asAdmin(`UPDATE students SET family_id = $2 WHERE id=$1`, [fresh, fam]));
  ok('linking a NEW child (no enrolment yet) to a family with paid months: allowed - linking is free', r.ok !== undefined, r);
  await asSuper(`UPDATE students SET family_id = NULL WHERE id=$1`, [fresh]);
  r = await tryIt(async () => asAdmin(`UPDATE students SET family_id = $2 WHERE id=$1`, [a, fam2]));
  ok('moving a child with a paid past month to another family, raw: HC120 entity=family_link, "family screen"',
     refused(r, 'HC120', /entity=family_link; tier=2; .*family screen, with a reason/), r);
  r = await tryIt(async () => asAdmin(`UPDATE students SET family_id = NULL WHERE id=$1`, [b]));
  ok('un-linking the SIBLING (whose own months are unpaid): HC120 too - the reach is every child of the old family', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE students SET sibling_discount_from = $2 WHERE id=$1`, [b, TODAY]));
  ok('a sibling-discount hold typed raw: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE families SET sibling_percent_override = 25 WHERE id=$1`, [fam]));
  ok('P20 the sibling percentage of a family with a paid past month, raw: HC120', refused(r, 'HC120', /entity=family_link/), r);
  r = await tryIt(async () => asService(`UPDATE families SET sibling_percent_override = 25 WHERE id=$1`, [fam]));
  ok('  service lane: HC120', refused(r, 'HC120'), r);
  r = await tryIt(async () => asAdmin(`UPDATE families SET name = 'Renamed' WHERE id=$1`, [fam]));
  ok('  the family\'s name: allowed, and audit_families writes the audit row',
     r.ok !== undefined && (await q1(`SELECT count(*)::int n FROM audit_log WHERE entity='families' AND entity_id=$1`, [fam])).n >= 1, r);
  r = await tryIt(async () => asAdmin(`DELETE FROM families WHERE id=$1`, [fam]));
  ok('deleting the family (which un-links its children): HC120, nothing un-linked',
     refused(r, 'HC120') && (await q1(`SELECT count(*)::int n FROM students WHERE family_id=$1`, [fam])).n === 2, r);
  r = await tryIt(async () => asAdmin(`UPDATE families SET sibling_percent_override = 25 WHERE id=$1`, [fam2]));
  ok('a family with no child: its percentage may change', r.ok !== undefined, r);

  let p = await preview('family_link', 'set_sibling_percent', { family_id: fam, percent: 25 });
  ok('preview set_sibling_percent: T2, both children in reach', p.tier === 2 && p.student_ids.includes(a) && p.student_ids.includes(b), p);
  let done = await checked('family_link', 'set_sibling_percent', { family_id: fam, percent: 25 }, { reason: R, token: p.token, confirm: true });
  ok('  confirmed: written, old and new percentage in the row',
     Number((await q1(`SELECT sibling_percent_override p FROM families WHERE id=$1`, [fam])).p) === 25 && (await override(done.override_id)).change.old_percent === null);
  done = await go('family_link', 'set_sibling_from', { student_id: b, date: TODAY });
  ok('set_sibling_from: written', (await q1(`SELECT sibling_discount_from::text d FROM students WHERE id=$1`, [b])).d === TODAY && (await override(done.override_id)).op === 'set_sibling_from');
  // the NEW family's children are in reach too
  const cFam = await mkFamily();
  const settled = await mkKid(cFam);
  await enrol(settled, c);
  await inv(settled, OLD.month, { recorded: 540000, conf: 'confirmed' });
  const mover = await mkKid();
  await enrol(mover, c, OLDER.date);
  p = await preview('family_link', 'set_family', { student_id: mover, family_id: cFam });
  ok('a child joining a family whose other child has a CONFIRMED past month: T3 - every child of the NEW family is in reach',
     p.tier === 3 && p.student_ids.includes(settled), p);
  done = await checked('family_link', 'set_family', { student_id: mover, family_id: cFam }, { reason: R, token: p.token, confirm: true, corr: CORR });
  ok('  confirmed: linked', (await q1(`SELECT family_id f FROM students WHERE id=$1`, [mover])).f === cFam && done.review_required === true);
  p = await preview('family_link', 'set_family', { student_id: mover, family_id: cFam });
  ok('  again: nothing_to_change', p.refuse_code === 'nothing_to_change', p);
  p = await preview('family_link', 'set_sibling_percent', { family_id: fam, percent: 140 });
  ok('140%: bad_args', p.refuse_code === 'bad_args', p);
  r = await withAck({ entity: 'family_link', op: 'set_sibling_from', target: a, students: [a, b], tier: 3 }, `UPDATE students SET family_id = NULL WHERE id='${a}'`);
  ok('an acknowledged set_sibling_from does not cover moving the child to another family: HC120', refused(r, 'HC120'), r);
});

// ---------------------------------------------------------------- G-21
await section('G-21 hard deletes (P22)', async () => {
  const c = await mkClass();
  const paid = await mkKid();
  await asSuper(`INSERT INTO payments(student_id, amount) VALUES ($1, 500000)`, [paid]);
  for (const [lane, run] of [['admin', asAdmin], ['service', asService], ['owner', asSuper]]) {
    const r = await tryIt(async () => run(`DELETE FROM students WHERE id=$1`, [paid]));
    ok(`a student with a payment, ${lane} lane: HC121 student_has_history "deactivate instead"`, refused(r, 'HC121', /code=student_has_history; .*Deactivate instead/), r);
  }
  const marked = await mkKid();
  await enrol(marked, c, RECENT.date);
  await att(c.s.recent, marked, 'Present', c.teacherUid);
  let r = await tryIt(async () => asAdmin(`DELETE FROM students WHERE id=$1`, [marked]));
  ok('a student whose only history is one mark made by a person: HC121', refused(r, 'HC121', /student_has_history/), r);
  const billed = await mkKid();
  await inv(billed, OLD.month, { recorded: 540000, status: 'paid' });
  r = await tryIt(async () => asAdmin(`DELETE FROM students WHERE id=$1`, [billed]));
  ok('a student with a paid bill: HC121', refused(r, 'HC121'), r);
  await asAdmin(`UPDATE invoices SET recorded_payment = 0, status = 'issued' WHERE student_id=$1`, [billed]);
  r = await tryIt(async () => asAdmin(`DELETE FROM students WHERE id=$1`, [billed]));
  ok('  the payment reset to 0 first: still HC121 (the bill floor remembers)', refused(r, 'HC121'), r);
  const clean = await mkKid();
  r = await tryIt(async () => asAdmin(`DELETE FROM students WHERE id=$1`, [clean]));
  ok('a student created by mistake, with nothing: deleted', r.ok !== undefined && (await q1(`SELECT count(*)::int n FROM students WHERE id=$1`, [clean])).n === 0, r);
  const enrolledOld = await mkKid();
  await enrol(enrolledOld, c);
  r = await tryIt(async () => asAdmin(`DELETE FROM students WHERE id=$1`, [enrolledOld]));
  ok('a student with no money but an enrolment over taught past months: the cascade to the enrolment is judged, HC120', refused(r, 'HC120'), r);
  for (const [lane, run] of [['admin', asAdmin], ['service', asService]]) {
    r = await tryIt(async () => run(`DELETE FROM classes WHERE id=$1`, [c.cid]));
    ok(`a class with an enrolment, ${lane} lane: HC121 class_has_history "archive it instead"`, refused(r, 'HC121', /code=class_has_history; .*Archive it instead/), r);
  }
  const empty = randomUUID();
  await asSuper(`INSERT INTO classes(id, name) VALUES ($1,'empty')`, [empty]);
  r = await tryIt(async () => asAdmin(`DELETE FROM classes WHERE id=$1`, [empty]));
  ok('a class with no enrolment and no lesson: deleted', r.ok !== undefined, r);
});

// ---------------------------------------------------------------- step 1b
await section('step 1b\'s register guard, with file 5 over it', async () => {
  const c = await mkClass();
  const k = await mkKid();
  await enrol(k, c);
  await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
  await att(c.s.old, k, 'Present', c.teacherUid);
  let r = await tryIt(async () => asAdmin(`UPDATE attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [c.s.old, k]));
  ok('an admin\'s raw old billed mark: still HC025 retro_mark', r.code === 'HC025' && /retro_mark/.test(r.detail ?? ''), r);
  const cf = (await q1(`INSERT INTO zz_stars_conflicts(session_id, student_id, theirs) VALUES ($1,$2,'Excused') RETURNING id`, [c.s.old, k])).id;
  const n = await nEvents('enrollment_rpc_mark');
  r = await tryIt(async () => asAdmin(`SELECT public.stars_sync_resolve_conflict($1, 'took_theirs')`, [cf]));
  ok('stars_sync_resolve_conflict (not an enrolment change): still recorded, not refused, exactly as step 1b left it',
     r.ok !== undefined && (await nEvents('enrollment_rpc_mark')) === n + 1, r);
  r = await tryIt(async () => asAdmin(`UPDATE attendance SET status='Present' /* end_enrollment( */ WHERE session_id=$1 AND student_id=$2`, [c.s.old, k]));
  ok('a comment naming an RPC still forges nothing: HC025', r.code === 'HC025', r);
  r = await withAck({ entity: 'enrollment', op: 'set_rate', target: k, students: [k], tier: 3, change: { class_ids: [c.cid] } },
    `UPDATE attendance SET status='Present' WHERE session_id='${c.s.old}' AND student_id='${k}'`);
  ok('an enrolment acknowledgement that is NOT an end / transfer / pause opens nothing on the register: HC025', r.code === 'HC025', r);
  r = await withAck({ entity: 'enrollment', op: 'pause', target: k, students: [k], tier: 3, change: { class_ids: [c.cid] } },
    `UPDATE attendance SET status='Present', marked_by='${ADMIN}' WHERE session_id='${c.s.old}' AND student_id='${k}'`);
  ok('  and one that IS still passes only the rows those RPCs write (Excused, or an unsigned row): billing a child back is HC025', r.code === 'HC025', r);
  await asSuper(`UPDATE attendance SET status='Present', marked_by=$3 WHERE session_id=$1 AND student_id=$2`, [c.s.old, k, c.teacherUid]);
  r = await withAck({ entity: 'enrollment', op: 'set_rate', target: k, students: [k], tier: 3, change: { class_ids: [c.cid] } },
    `UPDATE attendance SET status='Excused' WHERE session_id='${c.s.old}' AND student_id='${k}'`);
  ok('  not even for a row an enrolment RPC could write (an old billed mark set to Excused under a set_rate): HC025', r.code === 'HC025', r);
  r = await withAck({ entity: 'enrollment', op: 'pause', target: k, students: [k], tier: 3, change: { class_ids: [c.cid] } },
    `UPDATE attendance SET status='Excused' WHERE session_id='${c.s.old}' AND student_id='${k}'`);
  ok('  the same write under a pause\'s acknowledgement passes (what the checked pause does)', r.ok === true, r);
});

// ---------------------------------------------------------------- rollback
await section('rollback 5', async () => {
  const c = await mkClass();
  const k = await mkKid();
  const id = await enrol(k, c);
  await inv(k, OLD.month, { recorded: 540000, status: 'paid' });
  await att(c.s.old, k, 'Present', c.teacherUid);
  const nO = await nOverrides();
  const nE = (await q1(`SELECT count(*)::int n FROM money_change_events`)).n;
  let e = null; try { await db.exec(sqlOf(rb5F)); } catch (x) { e = x.message; }
  ok('the rollback script runs', e === null, e);
  const left = (await trgRows()).map((x) => x.k).filter((x) => TRIGGERS.includes(x));
  ok('the nine guard triggers are gone from all twelve tables; audit_families stays', JSON.stringify(left) === JSON.stringify(['families.audit_families']), left);
  ok('nothing else is dropped: the override and event rows, every function, the 1b register guard',
     (await nOverrides()) === nO && (await q1(`SELECT count(*)::int n FROM money_change_events`)).n === nE &&
     (await q1(`SELECT to_regprocedure('public.change_enrollment_terms(uuid, jsonb, date)') IS NOT NULL a, to_regprocedure('public._money_plan__enrollment(text, jsonb, uuid)') IS NOT NULL b`)).a === true &&
     (await trgRows()).some((x) => x.k === 'attendance.zz_attendance_money_guard'));
  let r = await tryIt(async () => asAdmin(`UPDATE enrollments SET rate_override_vnd = 77 WHERE id=$1`, [id]));
  ok('a raw write the guard refused now passes (the state before step 3B)', r.ok !== undefined && (await enr(id)).rate_override_vnd === 77, r);
  r = await tryIt(async () => go('enrollment', 'set_rate', { enrollment_id: id, rate_override_vnd: 78 }));
  ok('the checked path refuses to work without its trigger: HC050, nothing written (still closed)', r.code === 'HC050' && (await enr(id)).rate_override_vnd === 77, r);
  const n = await nEvents('enrollment_rpc_mark');
  r = await tryIt(async () => asAdmin(`SELECT public.pause_enrollment($1,$2,$3,$4,'away')`, [k, c.cid, await day(-42), await day(-38)]));
  ok('a direct pause_enrollment over a paid past month is recorded, not refused, again - step 1b\'s answer returns with the guard gone',
     r.ok !== undefined && (await nEvents('enrollment_rpc_mark')) === n + 1, r);
  e = null; try { await db.exec(sqlOf(rb5F)); } catch (x) { e = x.message; }
  ok('the script is safe to paste twice', e === null, e);
  e = null; try { await db.exec(sqlOf(inputsF)); } catch (x) { e = x.message; }
  r = await tryIt(async () => asAdmin(`UPDATE enrollments SET rate_override_vnd = 79 WHERE id=$1`, [id]));
  ok('pasting the migration again puts every guard back', e === null && refused(r, 'HC120') &&
     JSON.stringify((await trgRows()).map((x) => x.k).filter((x) => TRIGGERS.includes(x))) === JSON.stringify(TRIGGERS), { e, r });
});

const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
