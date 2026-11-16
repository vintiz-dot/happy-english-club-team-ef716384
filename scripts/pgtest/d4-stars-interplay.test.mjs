// D4 step 3A: the Stars sync against the lesson-pay guard (and 1b's
// register guard). docs/evidence/D4-design.md f.2 "d4-stars-interplay".
//
// FALLBACK, as f.2 allows and states: the union of D2's prelude and the
// Stars engine's own schema would have to satisfy both preflights (D1/D2
// need the D-prelude's stand-ins of the stars helper tables; the four Stars
// migrations create their own, with other columns, in CREATE ... IF NOT
// EXISTS). Instead, the engine's statements that write lessons and the
// register are EXTRACTED from the migration text at run time by pattern -
// not copied, so they cannot drift - and run on the service lane (the
// sync's real lane: stars-sync calls the engine with the service key), in
// a plpgsql function that declares the engine's own variable names:
//   20261028090000 stars_sync__apply_event: the mark (upsert + Scheduled ->
//     Held + the flip record), the withdrawal that restores, the one that
//     deletes, and the un-hold block ("the sync had marked this lesson Held
//     and no marks remain");
//   20261104090000 stars_sync_resolve_conflict: the admin's Scheduled -> Held.
// Each pattern must match exactly once, so an engine change that moves a
// statement turns this suite red instead of silently testing nothing.
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { harness, makeDb, migPath, sqlOf } from './d4-prelude.mjs';

const files = process.argv.slice(2);
if (files.length !== 9) {
  console.error('usage: d4-stars-interplay.test.mjs <audit> <cancel guard> <enrollment guard> <D1> <D2> <freeze> <d4 floors> <d4 core> <d4 lesson pay>');
  process.exit(2);
}
const db = await makeDb(PGlite, { people: true, migrations: files });
const H = harness(() => db);
const { ok, section, as, tryIt, clock } = H;
const asSuper = (sql, p) => as(null, '', null, sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);

// ---------------------------------------------------------------- extract
const fnBody = (file, name) => {
  const src = sqlOf(migPath(file)).replace(/\r\n/g, '\n');
  const start = src.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  const end = src.indexOf('CREATE OR REPLACE FUNCTION', start + 10);
  return start < 0 ? '' : src.slice(start, end < 0 ? undefined : end);
};
const apply = fnBody('20261028090000_stars_sync_review_fixes.sql', 'stars_sync__apply_event');
const resolve = fnBody('20261104090000_stars_sync_homework.sql', 'stars_sync_resolve_conflict');
const once = (src, re, label) => {
  const m = src.match(new RegExp(re.source, 'g')) ?? [];
  ok(`extracted: the engine's ${label} (exactly one match in the live definition)`, m.length === 1, m.length);
  return m[0] ?? 'RAISE EXCEPTION \'not extracted\';';
};
const MARK = once(apply, /INSERT INTO public\.attendance \(session_id, student_id, status, notes, marked_by, marked_at\)[\s\S]*?marked_at = EXCLUDED\.marked_at;\s*UPDATE public\.sessions SET status = 'Held'\s+WHERE id = v_session\.id AND status = 'Scheduled';\s*GET DIAGNOSTICS v_flipped = ROW_COUNT;\s*IF v_flipped > 0 THEN[\s\S]*?END IF;/,
  'mark: register upsert, Scheduled -> Held, the flip record');
const RESTORE = once(apply, /UPDATE public\.attendance\s+SET status\s+= v_prev ->> 'status',[\s\S]*?WHERE session_id = v_session\.id AND student_id = v_student_id;/, 'withdrawal that restores');
const DELETE = once(apply, /DELETE FROM public\.attendance WHERE session_id = v_session\.id AND student_id = v_student_id;/, 'withdrawal that deletes');
const UNHOLD = once(apply, /IF v_session\.status = 'Held'\s+AND EXISTS \(SELECT 1 FROM public\.stars_sync_held_flips[\s\S]*?UPDATE public\.sessions SET status = 'Scheduled' WHERE id = v_session\.id AND status = 'Held';\s*DELETE FROM public\.stars_sync_held_flips WHERE session_id = v_session\.id;/,
  'un-hold after a withdrawal');
const RESOLVE_HOLD = once(resolve, /UPDATE public\.sessions SET status = 'Held' WHERE id = v\.session_id AND status = 'Scheduled';/, 'conflict resolution Scheduled -> Held');

// The engine's variables, declared with its names; the statements verbatim.
await db.exec(`
  CREATE FUNCTION public.zz_engine(p_step text, p_session uuid, p_student uuid, p_status text, p_teacher_user uuid, p_prev jsonb)
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $zz$
  DECLARE
    v_session public.sessions;
    v_student_id uuid := p_student;
    v_status text := p_status;
    v_teacher record;
    v_event_id uuid := gen_random_uuid();
    p_now timestamptz := now();
    v_prev jsonb := p_prev;
    v_flipped int;
  BEGIN
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session;
    SELECT p_teacher_user AS user_id INTO v_teacher;
    IF p_step = 'mark' THEN
      ${MARK}
    ELSIF p_step = 'restore' THEN
      ${RESTORE}
    ELSIF p_step = 'delete' THEN
      ${DELETE}
    ELSIF p_step = 'unhold' THEN
      ${UNHOLD}
      END IF;
    END IF;
    RETURN (SELECT status::text FROM public.sessions WHERE id = p_session);
  END $zz$;
  CREATE FUNCTION public.zz_resolve_hold(p_session uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $zz$
  DECLARE v record;
  BEGIN
    SELECT p_session AS session_id INTO v;
    ${RESOLVE_HOLD}
    RETURN (SELECT status::text FROM public.sessions WHERE id = p_session);
  END $zz$;
  GRANT EXECUTE ON FUNCTION public.zz_engine(text, uuid, uuid, text, uuid, jsonb), public.zz_resolve_hold(uuid) TO service_role, authenticated;`);
const engine = (step, s, kid, status = null, prev = null) =>
  asService(`SELECT public.zz_engine($1,$2,$3,$4,$5,$6::jsonb) r`, [step, s.sid, kid, status, s.teacher, prev ? JSON.stringify(prev) : null]).then((r) => r.rows[0].r);

// ---------------------------------------------------------------- fixtures
const TODAY = await clock(0, -2), OLD = await clock(-40), LOCKED = await clock(-100);
await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked')`, [LOCKED.month]);
const ADMIN = randomUUID();
await asSuper(`INSERT INTO user_roles VALUES ($1,'admin')`, [ADMIN]);
async function mk(when, status = 'Scheduled') {
  const cid = randomUUID(), teacher = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]);
  await asSuper(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacher]);
  const start = when === TODAY ? TODAY.time : '17:30', end = when === TODAY ? TODAY.end_time : '19:00';
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,gen_random_uuid()) RETURNING id`,
    [cid, when.date, start, end, status])).rows[0];
  return { sid: id, cid, teacher, date: when.date, month: when.date.slice(0, 7) };
}
const kid = async (s) => {
  const id = (await asSuper(`INSERT INTO students(full_name) VALUES ('k') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, id]);
  await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',NULL)`, [s.sid, id]);   // the seed
  return id;
};
const sess = async (sid) => (await asSuper(`SELECT status::text s FROM sessions WHERE id=$1`, [sid])).rows[0].s;
const mark = async (s, k) => (await asSuper(`SELECT status, marked_by FROM attendance WHERE session_id=$1 AND student_id=$2`, [s.sid, k])).rows[0];
const events = async (kind, key, val) => (await asSuper(`SELECT * FROM money_change_events WHERE kind=$1 AND payload->>$2=$3`, [kind, key, val])).rows;
const flips = async (sid) => (await asSuper(`SELECT count(*)::int n FROM stars_sync_held_flips WHERE session_id=$1`, [sid])).rows[0].n;
const PREV_PLACEHOLDER = { existed: true, status: 'Present', marked_by: null, notes: null };

// ---------------------------------------------------------------- cases
await section('a mark: today\'s lesson', async () => {
  const s = await mk(TODAY); const k = await kid(s);
  const r = await tryIt(() => engine('mark', s, k, 'Absent'));
  ok('the sync marks Absent and the lesson becomes Held (service lane hold allowed), no raise', r.ok === 'Held' &&
     (await mark(s, k)).status === 'Absent' && (await flips(s.sid)) === 1, r);
});

await section('a withdrawal that restores, then the un-hold (open month)', async () => {
  const s = await mk(TODAY); const k = await kid(s);
  await engine('mark', s, k, 'Absent');
  let r = await tryIt(() => engine('restore', s, k, null, PREV_PLACEHOLDER));
  ok('the withdrawal restores the seeded placeholder (marked_by NULL), no raise', r.ok !== undefined && (await mark(s, k)).marked_by === null &&
     (await mark(s, k)).status === 'Present', r);
  r = await tryIt(() => engine('unhold', s, k));
  ok('the sync\'s own un-hold (its flip, no person\'s mark left, open month) -> Scheduled, flip record removed', r.ok === 'Scheduled' &&
     (await flips(s.sid)) === 0, r);
});

await section('a withdrawal that deletes, then the un-hold', async () => {
  const s = await mk(TODAY);
  const k = (await asSuper(`INSERT INTO students(full_name) VALUES ('new') RETURNING id`)).rows[0].id;   // no seed: the sync makes the row
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, k]);
  await engine('mark', s, k, 'Present');
  let r = await tryIt(() => engine('delete', s, k));
  ok('the withdrawal deletes the sync\'s own row (service lane), no raise', r.ok !== undefined && !(await mark(s, k)), r);
  r = await tryIt(() => engine('unhold', s, k));
  ok('  the un-hold follows -> Scheduled', r.ok === 'Scheduled', r);
});

await section('an un-hold in a locked payroll month: kept Held, recorded, the page is not aborted', async () => {
  const s = await mk(LOCKED); const k = await kid(s);
  await asSuper(`UPDATE sessions SET status='Held' WHERE id=$1`, [s.sid]);           // owner lane: held before the lock
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [s.sid]);
  const r = await tryIt(() => engine('unhold', s, k));
  ok('the engine\'s un-hold statement runs without an error (a raise would abort the sync page for ever)', r.ok !== undefined, r);
  ok('  the lesson stays Held: the teacher stays paid in the closed month', (await sess(s.sid)) === 'Held');
  const ev = await events('automation_refused', 'target_id', s.sid);
  ok('  one automation_refused event says why (locked month)', ev.length === 1 && ev[0].payload.payroll_month_locked === true, ev);
  ok('  (the engine drops its flip record, as it does after any un-hold: the lesson is now an ordinary Held lesson)', (await flips(s.sid)) === 0);
});

await section('an un-hold of an old lesson (open month) where a person\'s Present remains: kept Held', async () => {
  const s = await mk(OLD); const k = await kid(s);
  await asSuper(`UPDATE sessions SET status='Held' WHERE id=$1`, [s.sid]);
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [s.sid]);
  const other = (await asSuper(`INSERT INTO students(full_name) VALUES ('x') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, other]);
  await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',$3)`, [s.sid, other, s.teacher]);
  // the engine's own condition already stops here (a mark by someone remains); the guard holds even a writer that did not ask
  const r = await tryIt(() => asService(`UPDATE sessions SET status='Scheduled' WHERE id=$1 AND status='Held'`, [s.sid]));
  ok('A-9 on the service lane: kept Held, recorded, no raise', r.ok !== undefined && (await sess(s.sid)) === 'Held' &&
     (await events('automation_refused', 'target_id', s.sid)).length === 1, r);
});

await section('a late record on an old billed lesson: written, recorded, not aborted', async () => {
  const s = await mk(OLD); const k = await kid(s);
  await asSuper(`INSERT INTO invoices(student_id, month, total_amount, base_amount, recorded_payment) VALUES ($1,$2,540000,540000,540000)`, [k, s.month]);
  const r = await tryIt(() => engine('mark', s, k, 'Excused'));
  ok('the late mark goes through on the service lane, and the lesson is Held (a service hold)', r.ok === 'Held' &&
     (await mark(s, k)).status === 'Excused', r);
  const ev = await events('service_retro_mark', 'session_id', s.sid);
  ok('  one service_retro_mark event names it (1b, R-7): the review screen lists it', ev.length === 1 && ev[0].payload.new_status === 'Excused', ev);
});

await section('an admin settles a conflict as "take Pixel Pal\'s mark" (person lane)', async () => {
  const s = await mk(OLD); const k = await kid(s);
  await asSuper(`UPDATE attendance SET marked_by=$3, status='Absent' WHERE session_id=$1 AND student_id=$2`, [s.sid, k, ADMIN]);
  let r = await tryIt(() => as(ADMIN, 'authenticated', 'authenticated', `SELECT public.zz_resolve_hold($1) r`, [s.sid]));
  ok('open month, the register signed by the admin: Scheduled -> Held passes (not a hold without a register)', r.ok?.rows?.[0]?.r === 'Held', r);
  const l = await mk(LOCKED); const kl = await kid(l);
  await asSuper(`UPDATE attendance SET marked_by=$3, status='Absent' WHERE session_id=$1 AND student_id=$2`, [l.sid, kl, ADMIN]);
  r = await tryIt(() => as(ADMIN, 'authenticated', 'authenticated', `SELECT public.zz_resolve_hold($1) r`, [l.sid]));
  ok('a locked payroll month: HC020 kind=hold (fail closed; the admin marks it Held through the check first, then settles)',
     r.code === 'HC020' && /kind=hold/.test(r.detail ?? ''), r);
});

await db.close();
const { pass, fail } = H.counts();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
