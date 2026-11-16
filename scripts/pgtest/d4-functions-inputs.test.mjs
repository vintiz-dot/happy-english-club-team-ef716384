// D4 step 3B: update-enrollment-rate, create-family, manage-demo-student and
// admin-data-import, bundled from the working tree and driven with requests
// per role, their Supabase clients a stand-in for PostgREST over the REAL
// migrations (the same list as d4-money-inputs). Asserts that every
// person-initiated write to a guarded table goes through the caller's own
// JWT, never the service key, and that the two service-lane functions are
// bound by the triggers like anyone else.
import { randomUUID } from 'node:crypto';
import { harness } from './d4-prelude.mjs';
import { makeInputsDb } from './d4-inputs-prelude.mjs';
import { functionsHarness, SERVICE_KEY } from './d4-functions-harness.mjs';

const files = process.argv.slice(2);
if (files.length !== 13) {
  console.error('usage: d4-functions-inputs.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> ' +
    '<no auto changes> <enrolment RPCs> <pause> <deactivation> <d4 money inputs>');
  process.exit(2);
}
let db = await makeInputsDb(files);
const H = harness(() => db);
const { ok, section, as, clock } = H;
const asSuper = (sql, p) => as(null, '', null, sql, p);
const q1 = async (sql, p) => (await asSuper(sql, p)).rows[0];
const F = functionsHarness({ as, asSuper });
const { log, call, person } = F;

// manage-demo-student also talks to the Auth admin API: a small stand-in.
const authUsers = [];
const authCalls = [];
{
  const base = globalThis.__fakeCreateClient;
  globalThis.__fakeCreateClient = (...a) => {
    const c = base(...a);
    c.auth.admin = {
      listUsers: async () => ({ data: { users: authUsers }, error: null }),
      createUser: async ({ email }) => {
        const u = { id: randomUUID(), email };
        authUsers.push(u);
        authCalls.push({ op: 'create', id: u.id });
        return { data: { user: u }, error: null };
      },
      updateUserById: async (id, patch) => { authCalls.push({ op: 'update', id, keys: Object.keys(patch) }); return { data: {}, error: null }; },
    };
    return c;
  };
}

const rateFn = await F.loadFunction('supabase/functions/update-enrollment-rate/index.ts');
const familyFn = await F.loadFunction('supabase/functions/create-family/index.ts');
const demoFn = await F.loadFunction('supabase/functions/manage-demo-student/index.ts');
const importFn = await F.loadFunction('supabase/functions/admin-data-import/index.ts');
ok('the four functions bundled and registered a handler', [rateFn, familyFn, demoFn, importFn].every((f) => typeof f === 'function'));

const NOW = await clock(0, 0);
const TODAY = NOW.date;
const OLD = await clock(-40), OLDER = await clock(-75), FUTURE = await clock(10);
const R = 'The start date was entered a month late';

async function mkClass(name = 'c') {
  const cid = randomUUID(), teacherUid = randomUUID();
  await asSuper(`INSERT INTO classes(id, default_teacher_user, name) VALUES ($1,$2,$3)`, [cid, teacherUid, name]);
  for (const [w, st] of [[OLDER, 'Held'], [OLD, 'Held'], [FUTURE, 'Scheduled']]) {
    await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00',$3,gen_random_uuid())`,
      [cid, w.date, st]);
  }
  return { cid, teacherUid };
}
const mkKid = async (extra = {}) => (await q1(`INSERT INTO students(full_name, linked_user_id) VALUES ('k', $1) RETURNING id`, [extra.user ?? null])).id;
const enrol = async (kid, c, start = '2025-01-01') =>
  (await q1(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3) RETURNING id`, [c.cid, kid, start])).id;
const inv = (k, month, recorded = 0, conf = 'auto_approved') =>
  asSuper(`INSERT INTO invoices(student_id,month,total_amount,base_amount,recorded_payment,confirmation_status,status)
           VALUES ($1,$2,540000,540000,$3,$4,$5)`, [k, month, recorded, conf, recorded > 0 ? 'paid' : 'issued']);
const enr = async (id) => q1(`SELECT * FROM enrollments WHERE id=$1`, [id]);
const count = async (t, where = 'true', p = []) => (await q1(`SELECT count(*)::int n FROM ${t} WHERE ${where}`, p)).n;
const serviceWrites = (table) => log.writes.filter((w) => w.table === table && w.who === 'service');
const userRpcs = (name) => log.rpcs.filter((r) => r.name === name && r.who === 'user');
const mark = () => ({ w: log.writes.length, r: log.rpcs.length, i: log.invokes.length });
const since = (m) => ({ writes: log.writes.slice(m.w), rpcs: log.rpcs.slice(m.r), invokes: log.invokes.slice(m.i) });
const callUrl = async (fn, token, body, query = '') => {
  const res = await fn(new Request(`http://localhost/fn${query}`, { method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
};

const admin = await person('admin');
const teacherP = await person('teacher');
const parent = await person('family');

// ---------------------------------------------------------------- update-enrollment-rate
await section('update-enrollment-rate: who may call it', async () => {
  const c = await mkClass(); const k = await mkKid(); const id = await enrol(k, c, TODAY);
  const body = { enrollmentId: id, rateOverrideVnd: 150000, studentId: k, month: NOW.month };
  for (const [who, tok, want] of [['no Authorization', null, 401], ['a teacher', teacherP.tok, 403], ['a parent', parent.tok, 403],
                                  ['the service key itself', SERVICE_KEY, 403]]) {
    const r = await call(rateFn, tok, body);
    ok(`update-enrollment-rate: ${who} -> ${want}, nothing written`, r.status === want && (await enr(id)).rate_override_vnd === null, r);
  }
  const r = await call(rateFn, admin.tok, { enrollmentId: 'nope', studentId: k, month: NOW.month });
  ok('a malformed body: 400', r.status === 400, r);
});

await section('update-enrollment-rate: the rate is written as the admin, through the checked path', async () => {
  const c = await mkClass(); const k = await mkKid(); const id = await enrol(k, c, TODAY);
  let m = mark();
  let r = await call(rateFn, admin.tok, { enrollmentId: id, rateOverrideVnd: 150000, studentId: k, month: NOW.month, reason: 'agreed' });
  let s = since(m);
  ok('an enrolment that began today (T0): 200, the rate is set, no dialog', r.status === 200 && r.body.success && (await enr(id)).rate_override_vnd === 150000 && r.body.tier === 0, r);
  ok('  by money_change_checked on the CALLER\'s client; the service key wrote no enrolment and no audit row itself',
     s.rpcs.some((x) => x.name === 'money_change_checked' && x.who === 'user' && x.uid === admin.id) &&
     s.writes.every((w) => w.who !== 'service') && s.rpcs.every((x) => x.who === 'user'), s);
  ok('  one override row names the admin, with the rate before and after',
     (await q1(`SELECT actor_user_id a, change, attached FROM money_change_overrides WHERE id=$1`, [r.body.override_id])).a === admin.id &&
     (await q1(`SELECT change FROM money_change_overrides WHERE id=$1`, [r.body.override_id])).change.terms.rate_override_vnd === 150000);
  r = await call(rateFn, admin.tok, { enrollmentId: id, rateOverrideVnd: 150000, studentId: k, month: NOW.month });
  ok('the same rate again: 200 unchanged, no second override', r.status === 200 && r.body.unchanged === true, r);
  r = await call(rateFn, admin.tok, { enrollmentId: id, rateOverrideVnd: 1, studentId: await mkKid(), month: NOW.month });
  ok('an enrolment that is not that child\'s: 400, nothing written', r.status === 400 && (await enr(id)).rate_override_vnd === 150000, r);

  // an enrolment with a paid past month behind it
  const k2 = await mkKid(); const id2 = await enrol(k2, c);
  await inv(k2, OLD.month, 540000);
  const body = { enrollmentId: id2, rateOverrideVnd: 120000, studentId: k2, month: OLD.month };
  m = mark();
  r = await call(rateFn, admin.tok, body);
  s = since(m);
  ok('P14 the whole-enrolment rate over a PAID past month, no ack: 409 money_requires_checked_path with the preview, NOTHING written',
     r.status === 409 && r.body.code === 'money_requires_checked_path' && r.body.preview?.tier === 2 && r.body.preview?.token &&
     (await enr(id2)).rate_override_vnd === null && s.writes.length === 0 && !s.rpcs.some((x) => x.name === 'money_change_checked'), r);
  const p = r.body.preview;
  r = await call(rateFn, admin.tok, { ...body, preview: true });
  ok('preview: true -> the plan, nothing written', r.status === 200 && r.body.preview === true && r.body.plan.tier === 2 && (await enr(id2)).rate_override_vnd === null, r);
  r = await call(rateFn, admin.tok, { ...body, ack: { reason: 'short', token: p.token, confirm: true } });
  ok('a short reason: 422 reason_too_short, nothing written', r.status === 422 && r.body.code === 'reason_too_short' && (await enr(id2)).rate_override_vnd === null, r);
  r = await call(rateFn, admin.tok, { ...body, ack: { reason: R, token: 'stale', confirm: true } });
  ok('a stale token: 409 token_stale with a fresh preview, nothing written',
     r.status === 409 && r.body.code === 'token_stale' && r.body.preview?.token === p.token && (await enr(id2)).rate_override_vnd === null, r);
  m = mark();
  r = await call(rateFn, admin.tok, { ...body, ack: { reason: R, token: p.token, confirm: true } });
  s = since(m);
  ok('with the ack: 200, the rate is changed; the reason is on the override row',
     r.status === 200 && (await enr(id2)).rate_override_vnd === 120000 &&
     (await q1(`SELECT reason FROM money_change_overrides WHERE id=$1`, [r.body.override_id])).reason === R, r);
  ok('  the bills it reached are worked out again by calculate-tuition (never priced here), and the result recorded as the admin',
     s.invokes.some((i) => i.name === 'calculate-tuition' && i.body.studentId === k2 && i.body.month === OLD.month) &&
     s.rpcs.some((x) => x.name === 'record_money_change_event' && x.who === 'user') &&
     (await count('money_change_events', `override_id = $1 AND kind = 'tuition_refreshed'`, [r.body.override_id])) === 1 && r.body.recalculated === true, s.invokes);
  ok('  no enrolment write was ever made with the service key', serviceWrites('enrollments').length === 0 && serviceWrites('audit_log').length === 0);

  // "from this date"
  const k3 = await mkKid(); const id3 = await enrol(k3, c);
  await inv(k3, OLD.month, 540000, 'confirmed');
  r = await call(rateFn, admin.tok, { enrollmentId: id3, rateOverrideVnd: 130000, studentId: k3, month: NOW.month, effectiveDate: TODAY });
  const rows = (await asSuper(`SELECT start_date::text s, end_date::text e, rate_override_vnd r FROM enrollments WHERE student_id=$1 ORDER BY start_date`, [k3])).rows;
  ok('effectiveDate today over a CONFIRMED past month: 200 with no ack (T0) - the enrolment is split, the past keeps its rate',
     r.status === 200 && r.body.tier === 0 && rows.length === 2 && rows[0].r === null && rows[1].s === TODAY && rows[1].r === 130000, { r, rows });
  const back = { enrollmentId: id3, rateOverrideVnd: 90000, studentId: k3, month: OLD.month, effectiveDate: OLD.date };
  r = await call(rateFn, admin.tok, back);
  ok('effectiveDate in the confirmed past month: 409, tier 3', r.status === 409 && r.body.preview?.tier === 3, r);
  const p3 = r.body.preview;
  r = await call(rateFn, admin.tok, { ...back, ack: { reason: R, token: p3.token, confirm: true } });
  ok('  T3 with a reason but no correction reason: 422 correction_reason_required, nothing written',
     r.status === 422 && r.body.code === 'correction_reason_required' && (await count('enrollments', 'student_id=$1', [k3])) === 2, r);
  r = await call(rateFn, admin.tok, { ...back, ack: { reason: R, token: p3.token, confirm: true, correction_reason: 'The confirmed bill used the wrong rate' } });
  ok('  with both reasons: 200, split again on that date, and the change is marked for review',
     r.status === 200 && r.body.tier === 3 && (await count('enrollments', 'student_id=$1', [k3])) === 3 &&
     (await count('money_change_review_queue', 'override_id=$1', [r.body.override_id])) === 1, r);
});

// ---------------------------------------------------------------- create-family
await section('create-family: who may call it', async () => {
  for (const [who, tok, want] of [['no Authorization', null, 401], ['a teacher', teacherP.tok, 403], ['a parent', parent.tok, 403],
                                  ['the service key itself', SERVICE_KEY, 403]]) {
    const n = await count('families');
    const r = await call(familyFn, tok, { name: 'X' });
    ok(`create-family: ${who} -> ${want}, nothing created`, r.status === want && (await count('families')) === n, r);
  }
  const r = await call(familyFn, admin.tok, { email: 'not-an-email' });
  ok('a malformed body: 400', r.status === 400, r);
});

await section('create-family: a family joining today', async () => {
  const c = await mkClass();
  let m = mark();
  let r = await call(familyFn, admin.tok, { name: 'Nguyen', students: [{ fullName: 'An', enrollments: [{ classId: c.cid }] }] });
  let s = since(m);
  const kidId = r.body?.students?.[0]?.id;
  ok('no start date (today): 200 - family, child and enrolment created, nothing asked', r.status === 200 && r.body.family?.id && kidId &&
     r.body.partial === false && (await count('enrollments', 'student_id = $1 AND class_id = $2', [kidId, c.cid])) === 1, r);
  ok('  every row was written on the caller\'s client (families, students, and the enrolment by money_change_checked): no service-key write at all',
     s.writes.filter((w) => w.op !== 'select').every((w) => w.who === 'user') && s.writes.some((w) => w.table === 'families') &&
     s.rpcs.filter((x) => x.name === 'money_change_checked').every((x) => x.who === 'user') && s.rpcs.filter((x) => x.name === 'money_change_checked').length === 1, s);
  ok('  the enrolment was previewed BEFORE the family was created',
     s.rpcs.findIndex((x) => x.name === 'money_change_preview') >= 0 && log.rpcs.slice(m.r)[0].name === 'money_change_preview');
  ok('  created_by is the admin; the enrolment left one override row at tier 0',
     (await q1(`SELECT created_by c FROM families WHERE id=$1`, [r.body.family.id])).c === admin.id &&
     (await q1(`SELECT tier, op FROM money_change_overrides WHERE id=$1`, [r.body.enrollments[0].override_id])).tier === 0);
  m = mark();
  r = await call(familyFn, admin.tok, { name: 'Just a family' });
  s = since(m);
  ok('a family with no children: 200, written as the admin', r.status === 200 && s.writes.length === 1 && s.writes[0].who === 'user', r);
  r = await call(familyFn, admin.tok, { name: 'Tran', students: [{ fullName: 'Binh', enrollments: [{ classId: c.cid, startDate: FUTURE.date,
        discountType: 'percent', discountValue: 10, discountCadence: 'monthly' }] }] });
  ok('a start date next week with a discount: 200, the terms are on the enrolment',
     r.status === 200 && (await q1(`SELECT discount_value v FROM enrollments WHERE student_id=$1`, [r.body.students[0].id])).v === 10, r);
  const nF = await count('families');
  r = await call(familyFn, admin.tok, { name: 'Bad', students: [{ fullName: 'C', enrollments: [{ classId: randomUUID() }] }] });
  ok('a class that does not exist: refused BEFORE anything is created (it used to leave a family and a child behind)',
     r.status === 400 && (await count('families')) === nF, r);
});

await section('create-family: a start date in a month already taught', async () => {
  const c = await mkClass();
  const body = { name: 'Le', students: [
    { fullName: 'Late starter', enrollments: [{ classId: c.cid, startDate: OLD.date }] },
    { fullName: 'Today', enrollments: [{ classId: c.cid }] }] };
  const nF = await count('families'), nS = await count('students'), nE = await count('enrollments'), nO = await count('money_change_overrides');
  let m = mark();
  let r = await call(familyFn, admin.tok, body);
  let s = since(m);
  ok('start date last month, no ack: 409 preview_required with the preview (tier 1, both enrolments listed)',
     r.status === 409 && r.body.code === 'preview_required' && r.body.preview.tier === 1 && r.body.preview.items.length === 2 &&
     r.body.preview.requires.reason === true && typeof r.body.preview.token === 'string', r);
  ok('  NOTHING created: no family, no child, no enrolment, no override; no write of any kind',
     (await count('families')) === nF && (await count('students')) === nS && (await count('enrollments')) === nE &&
     (await count('money_change_overrides')) === nO && s.writes.length === 0, s.writes);
  const token = r.body.preview.token;
  r = await call(familyFn, admin.tok, { ...body, ack: { reason: R, token: 'wrong', confirm: true } });
  ok('a wrong token: 409 token_stale, nothing created', r.status === 409 && r.body.code === 'token_stale' && (await count('families')) === nF, r);
  r = await call(familyFn, admin.tok, { ...body, ack: { reason: 'too short', token, confirm: true } });
  ok('a short reason: 422, nothing created', r.status === 422 && (await count('families')) === nF, r);
  r = await call(familyFn, admin.tok, { ...body, ack: { reason: R, token } });
  ok('no confirmation: 422 confirm_required, nothing created', r.status === 422 && r.body.code === 'confirm_required' && (await count('families')) === nF, r);
  m = mark();
  r = await call(familyFn, admin.tok, { ...body, ack: { reason: R, token, confirm: true } });
  s = since(m);
  ok('with the ack: 200 - family, both children, both enrolments', r.status === 200 && r.body.partial === false && r.body.enrollments.length === 2 &&
     (await count('families')) === nF + 1 && (await count('students')) === nS + 2 && (await count('enrollments')) === nE + 2, r);
  const late = r.body.enrollments.find((e) => e.tier === 1);
  ok('  the backdated enrolment has ONE override row with the admin\'s reason; the other is tier 0',
     late && (await q1(`SELECT reason, actor_user_id a, entity, op FROM money_change_overrides WHERE id=$1`, [late.override_id])).reason === R &&
     r.body.enrollments.filter((e) => e.tier === 0).length === 1 && (await count('money_change_overrides')) === nO + 2, r.body.enrollments);
  ok('  and its start date is the one entered', (await q1(`SELECT start_date::text d FROM enrollments WHERE student_id=$1`, [late.student_id])).d === OLD.date);
  ok('  all of it on the caller\'s client', s.writes.every((w) => w.who === 'user') && s.rpcs.every((x) => x.who === 'user'), s);
});

// ---------------------------------------------------------------- manage-demo-student
await section('manage-demo-student: on the service lane, bound by the guard like anyone else', async () => {
  let r = await call(demoFn, teacherP.tok, { action: 'set_password', password: 'a-long-passphrase-1' });
  ok('a teacher: 403', r.status === 403, r);
  r = await call(demoFn, admin.tok, { action: 'set_password', password: 'a-long-passphrase-1' });
  const demoUid = authUsers[0]?.id;
  const demoKid = (await q1(`SELECT id FROM students WHERE linked_user_id=$1`, [demoUid]))?.id;
  const demoClass = (await q1(`SELECT id FROM classes WHERE name='Demo Class'`))?.id;
  ok('first set_password: 200 - the sandbox is provisioned; its enrolment dated today passes the guard on the service lane (T0)',
     r.status === 200 && r.body.success && r.body.enabled && demoKid && demoClass &&
     (await count('enrollments', 'student_id=$1 AND class_id=$2', [demoKid, demoClass])) === 1 &&
     (await q1(`SELECT enabled FROM demo_access`)).enabled === true, r);
  // enrolled in a real class by mistake, nothing billed: the reset removes it, as before
  const c = await mkClass('Real class');
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,$3)`, [c.cid, demoKid, TODAY]);
  r = await call(demoFn, admin.tok, { action: 'set_password', password: 'a-long-passphrase-2' });
  ok('the demo child in a real class from today (nothing billed): the reset removes that enrolment (T0), 200',
     r.status === 200 && (await count('enrollments', 'student_id=$1 AND class_id=$2', [demoKid, c.cid])) === 0, r);
  // ... over a billed past month: refused, reported, and NOT enabled
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2025-01-01')`, [c.cid, demoKid]);
  await inv(demoKid, OLD.month, 540000);
  const calls = authCalls.length;
  r = await call(demoFn, admin.tok, { action: 'set_password', password: 'a-long-passphrase-3' });
  ok('the demo child in a real class over a PAID past month: 409 demo_reset_needs_owner; nothing is exempted for this function',
     r.status === 409 && r.body.code === 'demo_reset_needs_owner' && r.body.success === false, r);
  ok('  the enrolment is still there (the database refused the service-key delete)',
     (await count('enrollments', 'student_id=$1 AND class_id=$2', [demoKid, c.cid])) === 1);
  ok('  and the demo login is left switched OFF and locked again (a login still in a real class is not handed out)',
     (await q1(`SELECT enabled FROM demo_access`)).enabled === false &&
     authCalls.slice(calls).filter((x) => x.op === 'update' && x.id === demoUid).length === 2, authCalls.slice(calls));
  r = await call(demoFn, admin.tok, { action: 'status' });
  ok('  status afterwards: disabled', r.status === 200 && r.body.enabled === false, r);
  ok('  the function wrote that enrolment with the service key and nothing else on its behalf passed: the trigger is the only judge',
     log.writes.some((w) => w.table === 'enrollments' && w.op === 'delete' && w.who === 'service'));
});

// ---------------------------------------------------------------- admin-data-import
await section('admin-data-import: the money tables are not importable (G-20)', async () => {
  const c = await mkClass(); const k = await mkKid();
  const sess = (await q1(`SELECT id FROM sessions WHERE class_id=$1 ORDER BY date LIMIT 1`, [c.cid])).id;
  const def = randomUUID(), fam = randomUUID(), newClass = randomUUID();
  const tables = {
    families: [{ id: fam, name: 'Imported family' }],
    classes: [{ id: newClass, name: 'Imported class', session_rate_vnd: 999999 }],
    enrollments: [{ class_id: c.cid, student_id: k, start_date: '2020-01-01' }],
    sessions: [{ class_id: c.cid, date: '2020-01-06', start_time: '17:30', end_time: '19:00', teacher_id: randomUUID(), status: 'Held' }],
    attendance: [{ session_id: sess, student_id: k, status: 'Present' }],
    discount_definitions: [{ id: def, name: 'Imported', type: 'percent', cadence: 'monthly', value: 100, start_month: '2020-01' }],
    discount_assignments: [{ student_id: k, discount_def_id: def, effective_from: '2020-01-01' }],
  };
  for (const [who, tok, want] of [['no Authorization', null, 401], ['a teacher', teacherP.tok, 403], ['the service key itself', SERVICE_KEY, 401]]) {
    const r = await callUrl(importFn, tok, { tables });
    ok(`admin-data-import: ${who} -> ${want}`, r.status === want, r);
  }
  const before = { e: await count('enrollments'), s: await count('sessions'), a: await count('attendance'),
                   d: await count('discount_definitions'), da: await count('discount_assignments'), f: await count('families') };
  let r = await callUrl(importFn, admin.tok, { tables }, '?dryRun=1');
  ok('dry run: every table is still counted, and the five money tables are named as not imported',
     r.status === 200 && r.body.dryRun && r.body.counts.enrollments === 1 && r.body.counts.attendance === 1 &&
     JSON.stringify(Object.keys(r.body.not_imported).sort()) === JSON.stringify(['attendance', 'discount_assignments', 'discount_definitions', 'enrollments', 'sessions']) &&
     (await count('families')) === before.f, r);
  let m = mark();
  r = await callUrl(importFn, admin.tok, { tables, dryRun: true });
  ok('the screen\'s "Dry run" box travels in the body: nothing is written (it used to import)',
     r.status === 200 && r.body.dryRun === true && (await count('families')) === before.f && since(m).writes.filter((w) => w.table !== 'audit_log').length === 0, r);
  m = mark();
  r = await callUrl(importFn, admin.tok, { tables });
  const s = since(m);
  ok('import: families and classes are imported', r.status === 200 && r.body.results.families.imported === 1 && r.body.results.classes.imported === 1 &&
     (await count('families')) === before.f + 1, r);
  ok('P21 enrolments, lessons, the register and discounts are NOT written - reported as skipped, with the reason',
     (await count('enrollments')) === before.e && (await count('sessions')) === before.s && (await count('attendance')) === before.a &&
     (await count('discount_definitions')) === before.d && (await count('discount_assignments')) === before.da &&
     ['enrollments', 'sessions', 'attendance', 'discount_definitions', 'discount_assignments'].every((t) => r.body.results[t]?.skipped === 'not_importable'), r.body.results);
  ok('  no write to any of the five tables was even attempted',
     !s.writes.some((w) => ['enrollments', 'sessions', 'attendance', 'discount_definitions', 'discount_assignments'].includes(w.table)), s.writes);
  ok('a class\'s fee is dropped from imported class rows (it has its own dated history)',
     (await q1(`SELECT session_rate_vnd r FROM classes WHERE id=$1`, [newClass])).r === 0);
});

// ---------------------------------------------------------------- the guard missing
await section('with the database step not installed: 503, nothing written, no fallback', async () => {
  const old = db;
  db = await makeInputsDb(files.filter((f) => !/d4_money_inputs_guard/.test(f)));
  const adminP = await person('admin');
  const c = await mkClass(); const k = await mkKid(); const id = await enrol(k, c, TODAY);
  let m = mark();
  let r = await call(rateFn, adminP.tok, { enrollmentId: id, rateOverrideVnd: 150000, studentId: k, month: NOW.month });
  ok('update-enrollment-rate before the migration is pasted: 503 not installed, the rate untouched, no service-key fallback',
     r.status === 503 && (await enr(id)).rate_override_vnd === null && since(m).writes.length === 0, r);
  const nF = await count('families');
  m = mark();
  r = await call(familyFn, adminP.tok, { name: 'Early', students: [{ fullName: 'A', enrollments: [{ classId: c.cid }] }] });
  ok('create-family with an enrolment before the migration is pasted: 503, nothing created',
     r.status === 503 && (await count('families')) === nF && since(m).writes.length === 0, r);
  await db.close();
  db = old;
});

const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
