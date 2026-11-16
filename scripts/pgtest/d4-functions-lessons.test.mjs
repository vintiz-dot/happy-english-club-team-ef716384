// D4 step 3A: manage-session and bulk-cancel-sessions, bundled from the
// working tree and driven with requests, their Supabase clients a stand-in
// for PostgREST over the REAL migrations (the d4-lesson-pay list). Asserts
// that every person-initiated lesson write goes through the caller's own JWT
// (never the service key), that a refused pay change writes NOTHING and
// answers with the money preview, and that no pay figure is fetched.
// schedule-sessions is checked at source level (its prelude would be the
// whole timetable schema): the include-held HC020 branch reports and logs.
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { harness, makeDb, repo } from './d4-prelude.mjs';
import { functionsHarness } from './d4-functions-harness.mjs';

const files = process.argv.slice(2);
if (files.length !== 9) {
  console.error('usage: d4-functions-lessons.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> <d4 lesson pay>');
  process.exit(2);
}
let db = await makeDb(PGlite, { people: true, migrations: files });
const H = harness(() => db);
const { ok, section, as, clock } = H;
const asSuper = (sql, p) => as(null, '', null, sql, p);
const F = functionsHarness({ as, asSuper });
const { log, call, person } = F;

const manage = await F.loadFunction('supabase/functions/manage-session/index.ts');
const bulkFn = await F.loadFunction('supabase/functions/bulk-cancel-sessions/index.ts');
ok('manage-session and bulk-cancel-sessions bundled and registered a handler', [manage, bulkFn].every((f) => typeof f === 'function'));
const ms = (tok, action, data) => call(manage, tok, { action, data });

const TODAY = await clock(0, -2), OLD = await clock(-40), FUTURE = await clock(10), LOCKED = await clock(-100);
await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked')`, [LOCKED.month]);
async function mk({ when = OLD, start = '17:30', end = '19:00', status = 'Held' } = {}) {
  const cid = randomUUID(), teacher = randomUUID(), tid = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]);
  if (when === TODAY) { start = TODAY.time; end = TODAY.end_time; }
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [cid, when.date, start, end, status, tid])).rows[0];
  return { sid: id, cid, teacher, tid, date: when.date, month: when.date.slice(0, 7) };
}
const kid = async (s) => {
  const id = (await asSuper(`INSERT INTO students(full_name) VALUES ('k') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, id]);
  return id;
};
const att = (s, k, status, by) => asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [s.sid, k, status, by]);
const sess = async (sid) => (await asSuper(`SELECT * FROM sessions WHERE id=$1`, [sid])).rows[0];
const overrides = async (target) => (await asSuper(`SELECT * FROM money_change_overrides WHERE target_id=$1 ORDER BY created_at, id`, [target])).rows;
const sessionWrites = (who) => log.writes.filter((w) => w.table === 'sessions' && w.who === who);
const reset = () => { log.writes = []; log.rpcs = []; log.invokes = []; log.reads = []; };
const R = 'The cover teacher taught this lesson, not the regular one';
const CORR = 'Correction: payroll month was already closed for this';

const admin = await person('admin');
const teacherP = await person('teacher');
const parent = await person('family');

// ---------------------------------------------------------------- gate
await section('who may call the new actions', async () => {
  const s = await mk();
  for (const [who, tok, want] of [['no Authorization', null, 401], ['a teacher', teacherP.tok, 403], ['a parent', parent.tok, 403]]) {
    reset();
    const rs = [await ms(tok, 'set-teacher', { id: s.sid, teacher_id: randomUUID() }), await ms(tok, 'set-time', { id: s.sid, start_time: '17:30', end_time: '20:00' }),
                await ms(tok, 'set-staff', { id: s.sid, participants: [] }), await ms(tok, 'pay-preview', { op: 'unhold', id: s.sid })];
    ok(`${who}: set-teacher / set-time / set-staff / pay-preview -> ${want}, no RPC, no write`, rs.every((r) => r.status === want) &&
       log.rpcs.length === 0 && log.writes.length === 0, rs.map((r) => r.status));
  }
});

// ---------------------------------------------------------------- change-status
await section('change-status Held -> Scheduled (G-1)', async () => {
  const s = await mk(); const k = await kid(s); await att(s, k, 'Absent', null);
  reset();
  let r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Scheduled' });
  ok('no token -> 409 requires_checked_path, kind unhold, use_action change-status, the money preview (T2), NOTHING written',
     r.status === 409 && r.body.code === 'requires_checked_path' && r.body.kind === 'unhold' && r.body.use_action === 'change-status' &&
     r.body.preview?.op === 'unhold' && r.body.preview?.tier === 2 && (await sess(s.sid)).status === 'Held' && (await overrides(s.sid)).length === 0, r.body);
  ok('  the refused attempt was the admin\'s own write; the service key wrote no lesson', sessionWrites('service').length === 0 &&
     sessionWrites('user').length === 1 && log.rpcs.some((x) => x.name === 'money_change_preview' && x.who === 'user'), log.writes);
  ok('  the message is the database\'s sentence (what to do next)', /Actions menu, with a reason/.test(r.body.message ?? ''), r.body.message);
  const token = r.body.preview.token;
  r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Scheduled', token, reason: 'short', confirm: true });
  ok('  a short reason -> 422 reason_too_short, still Held', r.status === 422 && r.body.code === 'reason_too_short' && (await sess(s.sid)).status === 'Held', r.body);
  reset();
  r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Scheduled', token, reason: R, confirm: true });
  const o = (await overrides(s.sid))[0];
  ok('  with token, reason and confirmation -> 200, Scheduled, one override (op unhold, the reason, the admin)',
     r.status === 200 && r.body.ok && (await sess(s.sid)).status === 'Scheduled' && o?.op === 'unhold' && o.reason === R && o.actor_user_id === admin.id, r.body);
  ok('  the change was money_change_checked on the caller\'s client; no service write to sessions; no calculate-payroll',
     log.rpcs.some((x) => x.name === 'money_change_checked' && x.who === 'user') && sessionWrites('service').length === 0 &&
     !log.invokes.some((x) => x.name === 'calculate-payroll'), [log.rpcs.map((x) => `${x.name}:${x.who}`), log.invokes]);
  ok('  a named audit_log entry with the override id', (await asSuper(`SELECT count(*)::int n FROM audit_log WHERE action='session_status_change' AND diff->>'override_id'=$1`, [o?.id ?? ''])).rows[0].n === 1);
  // stale
  const t = await mk(); const p = await ms(admin.tok, 'change-status', { id: t.sid, status: 'Scheduled' });
  await asSuper(`UPDATE sessions SET notes='changed meanwhile' WHERE id=$1`, [t.sid]);
  r = await ms(admin.tok, 'change-status', { id: t.sid, status: 'Scheduled', token: p.body.preview.token, reason: R, confirm: true });
  ok('the lesson changed after the preview -> 409 token_stale with a fresh preview, still Held', r.status === 409 && r.body.code === 'token_stale' &&
     !!r.body.preview?.token && r.body.preview.token !== p.body.preview.token && (await sess(t.sid)).status === 'Held', r.body);
});

await section('change-status Scheduled -> Held (G-2)', async () => {
  const s = await mk({ status: 'Scheduled' }); const k = await kid(s); await att(s, k, 'Present', s.teacher);
  reset();
  let r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Held' });
  ok('a person took the register, open month -> 200, plain write as the admin, no override', r.status === 200 && (await sess(s.sid)).status === 'Held' &&
     (await overrides(s.sid)).length === 0 && sessionWrites('user').length === 1 && sessionWrites('service').length === 0, r.body);
  const n = await mk({ status: 'Scheduled' });
  r = await ms(admin.tok, 'change-status', { id: n.sid, status: 'Held' });
  ok('nobody took the register -> 409 kind hold with the preview (T1), still Scheduled', r.status === 409 && r.body.kind === 'hold' &&
     r.body.preview?.tier === 1 && (await sess(n.sid)).status === 'Scheduled', r.body);
  r = await ms(admin.tok, 'change-status', { id: n.sid, status: 'Held', token: r.body.preview.token, reason: R, confirm: true });
  ok('  with the acknowledgement -> Held', r.status === 200 && (await sess(n.sid)).status === 'Held', r.body);
});

// ---------------------------------------------------------------- update / set-teacher
await section('the teacher of a held lesson (G-4)', async () => {
  const s = await mk();
  const nt = randomUUID();
  reset();
  let r = await ms(admin.tok, 'update', { id: s.sid, teacher_id: nt, notes: 'cover' });
  ok('update with a new teacher on an old Held lesson -> 409, use_action set-teacher, the reteach preview; nothing written (notes too)',
     r.status === 409 && r.body.kind === 'reteach' && r.body.use_action === 'set-teacher' && r.body.preview?.op === 'reteach' &&
     r.body.preview?.change?.new_teacher_id === nt && (await sess(s.sid)).teacher_id === s.tid && (await sess(s.sid)).notes === null, r.body);
  r = await ms(admin.tok, 'update', { id: s.sid, status: 'Scheduled' });
  ok('update no longer writes the status: a Held -> Scheduled through update -> 409 use_action change-status', r.status === 409 &&
     r.body.use_action === 'change-status' && (await sess(s.sid)).status === 'Held', r.body);
  r = await ms(admin.tok, 'set-teacher', { id: s.sid, teacher_id: nt });
  ok('set-teacher without a token -> 409 requires_checked_path with the preview (T1)', r.status === 409 && r.body.preview?.tier === 1 &&
     r.body.use_action === 'set-teacher', r.body);
  reset();
  r = await ms(admin.tok, 'set-teacher', { id: s.sid, teacher_id: nt, token: r.body.preview.token, reason: R, confirm: true });
  const after = await sess(s.sid);
  ok('  with the acknowledgement -> 200; teacher changed, is_manual, manual_reason = the reason; on the caller\'s client',
     r.status === 200 && after.teacher_id === nt && after.is_manual === true && after.manual_reason === R &&
     sessionWrites('service').length === 0 && log.rpcs.some((x) => x.name === 'money_change_checked' && x.who === 'user'), r.body);
  ok('  no pay figure was fetched (calculate-payroll never invoked)', !log.invokes.some((x) => x.name === 'calculate-payroll'));
  const t = await mk({ when: TODAY });
  reset();
  r = await ms(admin.tok, 'update', { id: t.sid, teacher_id: nt });
  ok('today\'s Held lesson (the free week): update -> 200, plain write as the admin', r.status === 200 && (await sess(t.sid)).teacher_id === nt &&
     sessionWrites('user').length === 1, r.body);
  r = await ms(admin.tok, 'set-teacher', { id: t.sid, teacher_id: randomUUID() });
  ok('set-teacher inside the free week -> 200 at once (T0), and still one override row', r.status === 200 && r.body.result?.tier === 0 &&
     (await overrides(t.sid)).length === 1, r.body);
  const l = await mk({ when: LOCKED });
  r = await ms(admin.tok, 'set-teacher', { id: l.sid, teacher_id: nt });
  ok('a locked payroll month -> 409 with T3 (correction reason asked)', r.status === 409 && r.body.preview?.tier === 3 &&
     r.body.preview?.requires?.correction_reason === true, r.body);
  r = await ms(admin.tok, 'set-teacher', { id: l.sid, teacher_id: nt, token: r.body.preview.token, reason: R, confirm: true });
  ok('  without the correction reason -> 422 correction_reason_required', r.status === 422 && r.body.code === 'correction_reason_required', r.body);
  r = await ms(admin.tok, 'set-teacher', { id: l.sid, teacher_id: 'x' });
  ok('set-teacher with a malformed id -> 400', r.status === 400, r.body);
});

// ---------------------------------------------------------------- time
await section('the time of a held lesson (G-5)', async () => {
  const s = await mk();
  reset();
  let r = await ms(admin.tok, 'move', { id: s.sid, date: s.date, start_time: '17:30', end_time: '20:30' });
  ok('a same-day time edit of an old Held lesson (was plain_update) -> 409 kind retime, use_action set-time, nothing written',
     r.status === 409 && r.body.kind === 'retime' && r.body.use_action === 'set-time' && r.body.preview?.change?.new_minutes === 180 &&
     String((await sess(s.sid)).end_time).startsWith('19:00'), r.body);
  r = await ms(admin.tok, 'set-time', { id: s.sid, start_time: '17:30', end_time: '20:30', token: r.body.preview.token, reason: R, confirm: true });
  ok('  set-time with the acknowledgement -> 200, the times changed', r.status === 200 && String((await sess(s.sid)).end_time).startsWith('20:30'), r.body);
  const t = await mk({ when: TODAY });
  r = await ms(admin.tok, 'move', { id: t.sid, date: t.date, start_time: TODAY.time, end_time: TODAY.end_time.slice(0, 2) + ':59' });
  ok('today\'s Held lesson -> 200 plain_update (the free week)', r.status === 200 && r.body.applied === 'plain_update', r.body);
  r = await ms(admin.tok, 'set-time', { id: s.sid, start_time: 'x', end_time: '20:30' });
  ok('set-time with a malformed time -> 400 bad_change', r.status === 400 && r.body.code === 'bad_change', r.body);
});

// ---------------------------------------------------------------- staff
await section('the assistants of a held lesson (G-6)', async () => {
  const s = await mk();
  const a1 = randomUUID();
  await asSuper(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',$2)`, [s.sid, a1]);
  let r = await ms(admin.tok, 'set-staff', { id: s.sid, participants: [{ teaching_assistant_id: a1, attended: false }] });
  ok('set-staff (an assistant marked absent) without a token -> 409 with the before / after list', r.status === 409 &&
     r.body.preview?.change?.before?.length === 1 && r.body.preview?.change?.after?.[0]?.attended === false, r.body);
  r = await ms(admin.tok, 'set-staff', { id: s.sid, participants: [{ teaching_assistant_id: a1, attended: false }], token: r.body.preview.token, reason: R, confirm: true });
  ok('  with the acknowledgement -> 200, the assistant is absent', r.status === 200 &&
     (await asSuper(`SELECT attended FROM session_participants WHERE session_id=$1`, [s.sid])).rows[0].attended === false, r.body);
  r = await ms(admin.tok, 'set-staff', { id: s.sid, participants: 'x' });
  ok('set-staff without a list -> 400', r.status === 400, r.body);
});

// ---------------------------------------------------------------- create
await section('create (G-3, G-7)', async () => {
  const c = await mk({ when: FUTURE, status: 'Scheduled' });
  const k = await kid(c);
  reset();
  let r = await ms(admin.tok, 'create', { class_id: c.cid, date: FUTURE.date, start_time: '10:00', end_time: '11:00', teacher_id: randomUUID(), status: 'Held' });
  ok('a future lesson -> 200, inserted on the CALLER\'s client (the service key left this action), Scheduled even when Held was sent',
     r.status === 200 && r.body.session?.status === 'Scheduled' && sessionWrites('user').length === 1 && sessionWrites('service').length === 0, r.body);
  reset();
  const body = { class_id: c.cid, date: OLD.date, start_time: '08:00', end_time: '09:30', teacher_id: randomUUID() };
  r = await ms(admin.tok, 'create', body);
  ok('a lesson three weeks back -> 409 kind create_past, the preview lists the child who will be billed, NOTHING created',
     r.status === 409 && r.body.kind === 'create_past' && r.body.use_action === 'create' && r.body.preview?.op === 'create' &&
     r.body.preview?.change?.children_marked_present?.includes(k) &&
     (await asSuper(`SELECT count(*)::int n FROM sessions WHERE class_id=$1 AND date=$2`, [c.cid, OLD.date])).rows[0].n === 0, r.body);
  reset();
  r = await ms(admin.tok, 'create', { ...body, token: r.body.preview.token, reason: R, confirm: true });
  ok('  with the acknowledgement -> 200 with the new lesson, made by money_change_checked on the caller\'s client',
     r.status === 200 && r.body.session?.date && r.body.session?.status === 'Scheduled' &&
     log.rpcs.some((x) => x.name === 'money_change_checked' && x.who === 'user') && sessionWrites('service').length === 0, r.body);
  ok('  the bills it reaches are refreshed through calculate-tuition (refresh pairs), not priced here',
     r.body.tuition?.status !== undefined && log.invokes.every((x) => x.name === 'calculate-tuition'), [r.body.tuition, log.invokes.map((x) => x.name)]);
  r = await ms(admin.tok, 'create', { class_id: c.cid, date: FUTURE.date, start_time: '10:00', end_time: '11:00', teacher_id: randomUUID() });
  ok('a taken slot -> 409 slot_taken (unchanged)', r.status === 409 && r.body.code === 'slot_taken', r.body);
});

// ---------------------------------------------------------------- pay-preview
await section('pay-preview reads only', async () => {
  const s = await mk();
  reset();
  const before = JSON.stringify(await sess(s.sid));
  const r = await ms(admin.tok, 'pay-preview', { op: 'unhold', id: s.sid });
  ok('pay-preview unhold -> 200 with the preview; nothing written, no RPC but the preview', r.status === 200 && r.body.preview?.op === 'unhold' &&
     log.writes.filter((w) => w.table !== 'audit_log').length === 0 && log.rpcs.every((x) => x.name === 'money_change_preview') &&
     JSON.stringify(await sess(s.sid)) === before, [r.body, log.writes, log.rpcs.map((x) => x.name)]);
  const b = await ms(admin.tok, 'pay-preview', { op: 'nope', id: s.sid });
  ok('pay-preview with an unknown op -> 400', b.status === 400, b.body);
});

// ---------------------------------------------------------------- bulk approval
await section('bulk-cancel-sessions: a batch that needs a second administrator is one request', async () => {
  const s1 = await mk({ when: FUTURE, status: 'Scheduled' }), s2 = await mk({ when: FUTURE, status: 'Scheduled' });
  // Stand-in for step 4's trigger (approval switched on): every D2 override needs approval.
  await db.exec(`CREATE FUNCTION public.zz_test_need_approval() RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN RAISE EXCEPTION 'approval_required' USING ERRCODE = 'HC060', DETAIL = 'reasons=["tier3"]'; END $f$;
    CREATE TRIGGER zz_test_need_approval BEFORE INSERT ON public.session_cancel_overrides FOR EACH ROW EXECUTE FUNCTION public.zz_test_need_approval();`);
  const p = await call(bulkFn, admin.tok, { step: 'preview', date_from: FUTURE.date, date_to: FUTURE.date });
  const items = (p.body.plain ?? []).filter((x) => [s1.sid, s2.sid].includes(x.id)).map((x) => ({ id: x.id, token: x.token }));
  const r = await call(bulkFn, admin.tok, { step: 'confirm', reason: 'School closed for the national holiday', date_from: FUTURE.date, date_to: FUTURE.date, items });
  await db.exec(`DROP TRIGGER zz_test_need_approval ON public.session_cancel_overrides; DROP FUNCTION public.zz_test_need_approval();`);
  ok('HC060 on the chunk -> 409 approval_required, ONE request offered for the whole batch, nothing cancelled',
     r.status === 409 && r.body.code === 'approval_required' && r.body.approval?.one_request === true &&
     items.every((i) => r.body.approval.items.includes(i.id)) && (await sess(s1.sid)).status === 'Scheduled' && (await sess(s2.sid)).status === 'Scheduled', r.body);
});

// ---------------------------------------------------------------- not installed
await section('the lesson-pay migration missing: 503, nothing written, no fallback', async () => {
  const saved = db;
  db = await makeDb(PGlite, { people: true, migrations: files.slice(0, -1) });
  try {
    await asSuper(`INSERT INTO user_roles VALUES ($1,'admin')`, [admin.id]);
    const s = await mk();
    reset();
    let r = await ms(admin.tok, 'set-teacher', { id: s.sid, teacher_id: randomUUID() });
    ok('set-teacher -> 503 not_installed (the session entity is not installed), nothing written', r.status === 503 &&
       (await sess(s.sid)).teacher_id === s.tid && sessionWrites('user').length === 0 && sessionWrites('service').length === 0, r.body);
    r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Scheduled', token: 'f'.repeat(64), reason: R, confirm: true });
    ok('change-status with a token -> 503, still Held', r.status === 503 && (await sess(s.sid)).status === 'Held', r.body);
    r = await ms(admin.tok, 'change-status', { id: s.sid, status: 'Scheduled' });
    ok('change-status without a token -> the plain write as the admin, as before 3A (no guard to refuse it)',
       r.status === 200 && (await sess(s.sid)).status === 'Scheduled' && sessionWrites('service').length === 0, r.body);
  } finally {
    await db.close();
    db = saved;
  }
});

// ---------------------------------------------------------------- schedule-sessions (source)
await section('schedule-sessions include-held: refused time updates are reported and logged', async () => {
  const src = readFileSync(resolve(repo, 'supabase/functions/schedule-sessions/index.ts'), 'utf8');
  ok('an HC020 on a Held lesson\'s time update goes to attention.heldTimeRefused', /updateError[^\n]*code === 'HC020'[\s\S]{0,200}attention\.heldTimeRefused\.push/.test(src));
  ok('  and is logged with log_session_automation_refused (service role, insert-only)', /rpc\('log_session_automation_refused'/.test(src));
  ok('  the nightly timer still never runs include-held', /isTimerRun \? 'future-only'/.test(src));
  const gen = readFileSync(resolve(repo, 'src/components/admin/SessionGenerator.tsx'), 'utf8') +
              readFileSync(resolve(repo, 'src/components/admin/SessionGeneratorConfirm.tsx'), 'utf8');
  ok('the generator screens no longer offer include-held (no such mode is sent or offered)', !/["']include-held["']/.test(gen) && /onConfirm\("future-only"\)/.test(gen));
});

// ---------------------------------------------------------------- src/lib/lessonPayGuard.ts (pure)
await section('lessonPayGuard: the dialog asks what the server says, and sends back what was previewed', async () => {
  const out = await build({
    entryPoints: [resolve(repo, 'src/lib/lessonPayGuard.ts')], bundle: true, format: 'esm', platform: 'neutral', write: false,
    logLevel: 'silent', alias: { '@': resolve(repo, 'src') },
  });
  const p = resolve(tmpdir(), `lpg.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  const lib = await import(pathToFileURL(p).href);
  const plan = (o = {}) => ({ entity: 'session', op: 'reteach', kind: 'reteach', tier: 1, allowed: true, token: 'tok',
    requires: { reason_min: 15, reason: true, confirm: true, correction_reason: false },
    args: { session_id: 's1', teacher_id: 't2' }, change: { old_teacher_id: 't1', new_teacher_id: 't2', minutes: 90 }, ...o });
  const good = { reason: 'The cover teacher taught it', confirm: true, correctionReason: '' };
  ok('requirements from the plan; a T1+ plan with no "requires" still asks (fail closed)',
     lib.payRequirements(plan()).reason && lib.payRequirements(plan({ requires: {} })).confirm && lib.payRequirements(plan({ tier: 3, requires: {} })).correctionReason);
  ok('canSubmit: complete -> yes; no tick / short reason / refused plan -> no', lib.canSubmitPay(plan(), good) &&
     !lib.canSubmitPay(plan(), { ...good, confirm: false }) && !lib.canSubmitPay(plan(), { ...good, reason: 'short' }) &&
     !lib.canSubmitPay(plan({ allowed: false }), good));
  const req = lib.payRequest(plan(), good);
  ok('payRequest: set-teacher with the PREVIEWED args, the token, the reason and the tick', req.action === 'set-teacher' &&
     req.data.id === 's1' && req.data.teacher_id === 't2' && req.data.token === 'tok' && req.data.confirm === true && req.data.reason === good.reason, req);
  const u = lib.payRequest(plan({ op: 'unhold', args: { session_id: 's1' } }), good);
  ok('payRequest: an un-hold is change-status to Scheduled', u.action === 'change-status' && u.data.status === 'Scheduled', u);
  const c = lib.payRequest(plan({ op: 'create', args: { class_id: 'c', date: '2026-10-01', start_time: '08:00:00', end_time: '09:00:00', teacher_id: 't' } }), good);
  ok('payRequest: a backdated lesson is create with its fields', c.action === 'create' && c.data.class_id === 'c' && c.data.date === '2026-10-01', c);
  ok('payDialogFrom: a 409 requires_checked_path with a pay kind and a session preview opens the dialog',
     lib.payDialogFrom({ code: 'requires_checked_path', kind: 'create_past', preview: { entity: 'session', op: 'create' } })?.op === 'create' &&
     lib.payDialogFrom({ code: 'requires_checked_path', kind: 'move', preview: { entity: 'session' } }) === null &&
     lib.payDialogFrom({ code: 'token_stale', kind: 'reteach', preview: { entity: 'session' } }) === null);
  const lines = lib.payChangeLines(plan(), { t1: 'Ms A', t2: 'Mr B' });
  ok('payChangeLines: from whom to whom and the minutes, no money', lines[0] === 'From Ms A to Mr B' && /90 minutes/.test(lines[1]) &&
     !/[0-9][.,]?000|vnd|₫/i.test(lines.join(' ')), lines);
  ok('payNotes: a closed month says so; the pay note says no figure is shown', lib.payNotes(plan({ impact: { closed_payroll: true } }))
     .some((x) => /payroll month is closed/.test(x)) && lib.payNotes(plan()).some((x) => /no figure is shown/.test(x)));
  ok('every refusal text says what to do (or that nothing changed)', Object.values(lib.PAY_ERROR_TEXT).every((t) => /\.|Restore|reason/.test(t)) &&
     /Nothing was changed/.test(lib.payErrorText('x', 'Server said no.')));
  const src = readFileSync(resolve(repo, 'src/lib/lessonPayGuard.ts'), 'utf8');
  ok('the module imports no client and prices nothing', !/supabase|calculate-payroll'|fetch\(/.test(src.replace(/\/\/[^\n]*/g, '')));
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
