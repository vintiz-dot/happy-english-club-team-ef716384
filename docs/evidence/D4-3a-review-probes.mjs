// D4 step 3A independent review: executable probes (pglite only, the REAL
// migration files, the d4 prelude). Not a suite in run.mjs; run by hand:
//
//   node docs/evidence/D4-3a-review-probes.mjs
//
// Each probe prints PROBE <id> <what was observed>. "GAP" = the probe
// reproduced a path the guard does not close; "OK" = the guard held.
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { harness, makeDb, migPath, sqlOf } from '../../scripts/pgtest/d4-prelude.mjs';

const BASE = [
  '20261009130000_audit_every_admin_action.sql', '20261027090000_cancelled_lesson_attendance_guard.sql',
  '20261106090000_attendance_enrollment_guard.sql', '20261112090000_session_held_evidence.sql',
  '20261112091000_session_cancel_guard.sql', '20261106120000_invoice_tuition_freeze.sql',
  '20261114090000_d4_floors.sql', '20261114091000_d4_core_register.sql',
].map(migPath);
const PAY = migPath('20261114093000_d4_lesson_pay_guard.sql');

let db;
const H = harness(() => db);
const { as, tryIt, clock } = H;
const out = [];
const probe = (id, verdict, what, extra) => {
  const line = `PROBE ${id} ${verdict} ${what}${extra !== undefined ? '  :: ' + JSON.stringify(extra).slice(0, 400) : ''}`;
  out.push(line); console.log(line);
};

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const R = 'The register shows the teacher was off sick';
const CORR = 'Correction: the lesson was paid to the wrong person';
const asSuper = (sql, p) => as(null, '', null, sql, p);
const asAdmin = (sql, p) => as(ADMIN, 'authenticated', 'authenticated', sql, p);
const asService = (sql, p) => as(null, 'service_role', 'service_role', sql, p);

async function setup(payFile = PAY) {
  db = await makeDb(PGlite, { people: true, rls: false, migrations: BASE });
  await db.exec(`ALTER TABLE public.session_participants ADD CONSTRAINT uq_session_ta UNIQUE (session_id, teaching_assistant_id)`);
  await db.exec(sqlOf(payFile));
  // The LIVE teacher policy (20251012020423:79-86): a teacher updates their
  // own Scheduled lesson; no WITH CHECK, so USING is the check too.
  await db.exec(`CREATE POLICY "Teachers can update their sessions" ON public.sessions FOR UPDATE
    USING (teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid()) AND status = 'Scheduled')`);
  await db.query(`INSERT INTO user_roles VALUES ($1,'admin') ON CONFLICT DO NOTHING`, [ADMIN]);
}

async function mk({ when, start = '17:30', end = '19:00', status = 'Held', teacherRow = false } = {}) {
  const teacherUid = randomUUID();
  const cid = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacherUid]);
  await asSuper(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  let tid = randomUUID();
  if (teacherRow) tid = (await asSuper(`INSERT INTO teachers(user_id, full_name) VALUES ($1,'T') RETURNING id`, [teacherUid])).rows[0].id;
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [cid, when.date, start, end, status, tid])).rows[0];
  return { sid: id, cid, teacherUid, teacherId: tid, date: when.date, month: when.date.slice(0, 7) };
}
const kid = async (s) => {
  const id = (await asSuper(`INSERT INTO students(full_name) VALUES ('k') RETURNING id`)).rows[0].id;
  await asSuper(`INSERT INTO enrollments(class_id, student_id, start_date) VALUES ($1,$2,'2020-01-01')`, [s.cid, id]);
  return id;
};
const sess = async (sid) => (await asSuper(`SELECT * FROM sessions WHERE id=$1`, [sid])).rows[0];
const overrides = async (sid) => (await asSuper(`SELECT count(*)::int n FROM money_change_overrides WHERE target_id=$1`, [sid])).rows[0].n;

// =====================================================================
await setup();
const TEN = await clock(-10);       // outside the free week; month may be current or past
const FAR = await clock(14);

// ---------------------------------------------------------------- P1
// G-5 covers only a HELD lesson's times. A lesson more than a week old that
// is still Scheduled (nobody took the register - on live these are exactly
// the unpaid ones) can be lengthened raw and then held with a register.
{
  const h = await mk({ when: TEN, status: 'Held' });
  const r0 = await tryIt(() => asAdmin(`UPDATE sessions SET end_time='20:30' WHERE id=$1`, [h.sid]));
  probe('P1a', r0.code === 'HC020' ? 'OK' : 'UNEXPECTED', 'control: admin raw lengthening of a Held lesson 10 days old', { code: r0.code, detail: r0.detail });

  const s = await mk({ when: TEN, status: 'Scheduled' });
  const k = await kid(s);
  await asSuper(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',NULL)`, [s.sid, k]);  // the seed
  const r1 = await tryIt(() => asAdmin(`UPDATE sessions SET end_time='20:30' WHERE id=$1`, [s.sid]));
  // the admin then takes the register (mark-attendance on the caller's client: the mark, then the flip)
  const r2 = await tryIt(() => asAdmin(`UPDATE attendance SET marked_by=$2, status='Present' WHERE session_id=$1`, [s.sid, ADMIN]));
  const r3 = await tryIt(() => asAdmin(`UPDATE sessions SET status='Held' WHERE id=$1 AND status='Scheduled'`, [s.sid]));
  const after = await sess(s.sid);
  const gap = !r1.code && !r2.code && !r3.code && after.status === 'Held' && String(after.end_time).startsWith('20:30');
  probe('P1b', gap ? 'GAP' : 'OK', 'admin: old Scheduled lesson lengthened 17:30-19:00 -> 17:30-20:30 raw, register taken, Held - no reason, no override row',
        { lengthen: r1.code ?? 'passed', mark: r2.code ?? 'passed', hold: r3.code ?? 'passed', status: after.status, end: after.end_time, overrides: await overrides(s.sid) });

  // the same by the lesson's own teacher, under the LIVE RLS policy, then the
  // teacher's register through mark-attendance (service lane flips Held)
  const t = await mk({ when: TEN, status: 'Scheduled', teacherRow: true });
  const k2 = await kid(t);
  await asSuper(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',NULL)`, [t.sid, k2]);
  const t1 = await tryIt(() => as(t.teacherUid, 'authenticated', 'authenticated', `UPDATE sessions SET end_time='21:00' WHERE id=$1`, [t.sid]));
  const t2 = await tryIt(() => asService(`UPDATE attendance SET marked_by=$2 WHERE session_id=$1`, [t.sid, t.teacherUid]));
  const t3 = await tryIt(() => asService(`UPDATE sessions SET status='Held' WHERE id=$1 AND status='Scheduled'`, [t.sid]));
  const ta = await sess(t.sid);
  probe('P1c', !t1.code && ta.status === 'Held' && String(ta.end_time).startsWith('21:00') ? 'GAP' : 'OK',
        'teacher (live RLS): own Scheduled lesson 10 days old lengthened to 21:00, then held by the service-lane register flip',
        { lengthen: t1.code ?? `passed rows=${t1.ok?.affectedRows}`, mark: t2.code ?? 'passed', hold: t3.code ?? 'passed', status: ta.status, end: ta.end_time });
  // and the teacher's direct status write: refused (RLS check or the guard)
  const t4 = await tryIt(() => as(t.teacherUid, 'authenticated', 'authenticated', `UPDATE sessions SET status='Scheduled' WHERE id=$1`, [t.sid]));
  probe('P1d', (t4.code || t4.ok?.affectedRows === 0) ? 'OK' : 'GAP', 'teacher direct un-hold of that Held lesson', { code: t4.code ?? `rows=${t4.ok?.affectedRows}` });
  // the teacher of an OLD Scheduled lesson changed raw: A-5 does guard it
  const u = await mk({ when: TEN, status: 'Scheduled' });
  const u1 = await tryIt(() => asAdmin(`UPDATE sessions SET teacher_id=gen_random_uuid() WHERE id=$1`, [u.sid]));
  probe('P1e', u1.code === 'HC020' ? 'OK' : 'GAP', 'control: teacher change of an old Scheduled lesson (A-5) is guarded - asymmetric with P1b', { code: u1.code, detail: u1.detail });
}

// ---------------------------------------------------------------- P2
// The insert guard passes ANY insert whose class slot is taken (decision 7).
{
  const s = await mk({ when: TEN, status: 'Held' });
  const a = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Held',gen_random_uuid())`, [s.cid, s.date]));
  probe('P2a', a.code === '23505' ? 'OK' : 'GAP', 'born-Held duplicate at a taken past slot: guard passes it, the partial unique index refuses', { code: a.code });
  const b = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Canceled',gen_random_uuid()) RETURNING id`, [s.cid, s.date]));
  probe('P2b', b.ok ? 'INFO' : 'OK', 'born-CANCELED duplicate at a taken past slot (no child enrolled): created, no event (G-3 says HC023)', { code: b.code ?? 'created' });
  const k = await kid(s);
  const c = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'17:30','19:00','Canceled',gen_random_uuid())`, [s.cid, s.date]));
  // (the prelude has no seed trigger; on live 20261027090000:181-210 seeds a
  // cancelled lesson's children Excused, so this is created there too)
  probe('P2c', c.code ? 'OK' : 'INFO', '  same with a child enrolled: also created (no money: Excused, not paid, not billed)', { code: c.code ?? 'created' });
  const d = await tryIt(() => asAdmin(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'08:00','09:00','Held',gen_random_uuid())`, [s.cid, s.date]));
  probe('P2d', d.code === 'HC023' ? 'OK' : 'GAP', 'control: born-Held at a free past slot -> HC023', { code: d.code });
  const e = await tryIt(() => asAdmin(`INSERT INTO sessions(id,class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,'17:30','19:00','Scheduled',gen_random_uuid())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`, [s.sid, s.cid, s.date]));
  probe('P2e', e.code === 'HC020' ? 'OK' : 'GAP', 'PostgREST-shaped upsert un-hold (ON CONFLICT (id) DO UPDATE status=Scheduled)', { code: e.code, detail: e.detail });
  const f = await tryIt(() => asAdmin(`INSERT INTO sessions(id,class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,'17:30','19:00','Held',gen_random_uuid())
      ON CONFLICT (id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`, [s.sid, s.cid, s.date]));
  probe('P2f', f.code === 'HC020' ? 'OK' : 'GAP', 'upsert teacher change of a Held old lesson', { code: f.code });
}

// ---------------------------------------------------------------- P3
// A D2-checked move of a Held lesson into the future: validate_session_status
// (runs first) turns Held into Scheduled, so zz2 sees unhold + move.
{
  const s = await mk({ when: TEN, status: 'Held' });
  const pm = (await asAdmin(`SELECT public.session_change_preview($1,'move',$2::jsonb) r`, [s.sid,
    JSON.stringify({ date: FAR.date, start_time: '17:30:00', end_time: '19:00:00' })])).rows[0].r;
  const r = await tryIt(() => asAdmin(`SELECT public.move_session_checked($1,$2,'17:30','19:00',$3,$4,true,$5,'{}'::jsonb)`,
    [s.sid, FAR.date, R, pm.token, pm.tier === 3 ? CORR : null]));
  probe('P3', r.code === 'HC022' ? 'CHANGED' : (r.ok ? 'UNCHANGED' : 'OTHER'),
        'D2 checked move of a Held lesson 10 days old to next fortnight (worked before 3A, un-holding it silently)', { tier: pm.tier, code: r.code, detail: r.detail, status: (await sess(s.sid)).status });
}

// ---------------------------------------------------------------- P4
// The Stars withdrawal statements (20261028090000:604-611) in a LOCKED month:
// the un-hold is kept Held (no raise) - but the very next statement deletes
// the flips row and the note still says "Scheduled again".
{
  const today = await clock(0, -3);
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [today.month]);
  const s = await mk({ when: today, start: today.time, end: today.end_time, status: 'Held' });
  const k = await kid(s);
  await asSuper(`INSERT INTO attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Present',NULL)`, [s.sid, k]);
  await asSuper(`INSERT INTO stars_sync_held_flips(session_id, event_id) VALUES ($1, gen_random_uuid())`, [s.sid]);
  const r = await tryIt(() => asService(`
    WITH u AS (UPDATE public.sessions SET status = 'Scheduled' WHERE id = '${s.sid}' AND status = 'Held' RETURNING 1)
    SELECT count(*)::int n FROM u`));
  await asService(`DELETE FROM public.stars_sync_held_flips WHERE session_id = $1`, [s.sid]);
  const flips = (await asSuper(`SELECT count(*)::int n FROM stars_sync_held_flips WHERE session_id=$1`, [s.sid])).rows[0].n;
  const ev = (await asSuper(`SELECT count(*)::int n FROM money_change_events WHERE kind='automation_refused' AND payload->>'target_id'=$1`, [s.sid])).rows[0].n;
  const src = readFileSync(migPath('20261028090000_stars_sync_review_fixes.sql'), 'utf8').replace(/\r/g, '');
  const unconditionalNote = /UPDATE public\.sessions SET status = 'Scheduled' WHERE id = v_session\.id AND status = 'Held';\n\s*DELETE FROM public\.stars_sync_held_flips WHERE session_id = v_session\.id;\n\s*v_note := v_note \|\| ' The sync had marked this lesson Held and no marks remain, so it is Scheduled again\.';/.test(src);
  probe('P4', (r.ok && (await sess(s.sid)).status === 'Held' && flips === 0 && ev === 1 && unconditionalNote) ? 'GAP(minor)' : 'OTHER',
        'Stars withdrawal in a locked month: no raise, kept Held, 1 automation_refused event; then the flips row is deleted and the engine\'s note says "Scheduled again" unconditionally',
        { raised: r.code ?? null, rowsUpdated: r.ok?.rows?.[0]?.n, status: (await sess(s.sid)).status, flipsLeft: flips, events: ev, noteUnconditional: unconditionalNote });
  await asSuper(`DELETE FROM payroll_periods WHERE month=$1`, [today.month]);
}

// ---------------------------------------------------------------- P5
// Session variables and reused acknowledgements.
{
  const a = await mk({ when: TEN, status: 'Held' });
  const b = await mk({ when: TEN, status: 'Held' });
  // a real T1 reteach of A (leaves an override row)
  const newT = randomUUID();
  const p = (await asAdmin(`SELECT public.money_change_preview('session','reteach',$1::jsonb) r`, [JSON.stringify({ session_id: a.sid, teacher_id: newT })])).rows[0].r;
  await asAdmin(`SELECT public.money_change_checked('session','reteach',$1::jsonb,$2,$3,true,NULL,'{}'::jsonb)`, [JSON.stringify({ session_id: a.sid, teacher_id: newT }), R, p.token]);
  const oid = (await asSuper(`SELECT id FROM money_change_overrides WHERE target_id=$1 ORDER BY created_at DESC LIMIT 1`, [a.sid])).rows[0].id;
  // (a) a later transaction names that row in the flag
  const r1 = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT set_config('hec.money_change_ack', '${oid}', true); UPDATE sessions SET teacher_id = '${newT}' WHERE id = '${b.sid}'`);
  probe('P5a', r1?.code === 'HC020' ? 'OK' : 'GAP', 'flag set by the client to another transaction\'s override id, raw reteach of another lesson', r1);
  // (b) same transaction: a real checked op on A, then the flag re-armed and used on B / on A for another kind
  const p2 = (await asAdmin(`SELECT public.money_change_preview('session','reteach',$1::jsonb) r`, [JSON.stringify({ session_id: a.sid, teacher_id: randomUUID() })])).rows[0].r;
  const t2 = p2.args.teacher_id;
  const r2 = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT public.money_change_checked('session','reteach','${JSON.stringify({ session_id: a.sid, teacher_id: t2 })}'::jsonb,'${R}','${p2.token}',true,NULL,'{}'::jsonb);
     SELECT set_config('hec.money_change_ack', (SELECT id::text FROM money_change_overrides WHERE txid = txid_current() LIMIT 1), true);
     UPDATE sessions SET teacher_id = '${t2}' WHERE id = '${b.sid}'`);
  probe('P5b', r2?.code === 'HC020' ? 'OK' : 'GAP', 'same transaction: re-armed flag (override for A) used for a raw reteach of B', r2);
  const r3 = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT set_config('hec.money_change_ack', '', true);
     SELECT public.money_change_checked('session','reteach','${JSON.stringify({ session_id: a.sid, teacher_id: randomUUID() })}'::jsonb,'${R}',NULL,true,NULL,'{}'::jsonb)`);
  probe('P5c', r3?.code === 'HC011' ? 'OK' : 'GAP', 'checked op with no token at T1 (forged/missing token) -> HC011', r3);
  const p4 = (await asAdmin(`SELECT public.money_change_preview('session','unhold',$1::jsonb) r`, [JSON.stringify({ session_id: a.sid })])).rows[0].r;
  const r4 = await tryIt(() => as(randomUUID(), 'authenticated', 'authenticated',
    `SELECT public.money_change_checked('session','unhold',$1::jsonb,$2,$3,true,$4,'{}'::jsonb)`, [JSON.stringify({ session_id: a.sid }), R, p4.token, CORR]));
  probe('P5d', r4.code === '42501' ? 'OK' : 'GAP', 'another signed-in non-admin replays the admin\'s token', { code: r4.code });
  const r5 = await tryIt(() => asService(`SELECT public.money_change_checked('session','unhold',$1::jsonb,$2,$3,true,$4,'{}'::jsonb)`, [JSON.stringify({ session_id: a.sid }), R, p4.token, CORR]));
  probe('P5e', r5.code ? 'OK' : 'GAP', 'the service role replays it', { code: r5.code });
  const r6 = await tryIt(() => asAdmin(`SELECT public._money_exec__session('{}'::jsonb, $1)`, [ADMIN]));
  probe('P5f', r6.code === '42501' ? 'OK' : 'GAP', 'admin calls the exec directly', { code: r6.code });
}

// ---------------------------------------------------------------- P6
// Assistants: disguised removals of a Held old lesson's assistant.
{
  const s = await mk({ when: TEN, status: 'Held' });
  const taId = randomUUID();
  await asSuper(`INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ($1,'teaching_assistant',$2)`, [s.sid, taId]);
  const tries = {
    'type -> teacher': `UPDATE session_participants SET participant_type='teacher' WHERE session_id='${s.sid}'`,
    'ta id -> NULL': `UPDATE session_participants SET teaching_assistant_id=NULL WHERE session_id='${s.sid}'`,
    'attended -> false': `UPDATE session_participants SET attended=false WHERE session_id='${s.sid}'`,
    're-point to a Scheduled lesson': `UPDATE session_participants SET session_id=gen_random_uuid() WHERE session_id='${s.sid}'`,
    'delete': `DELETE FROM session_participants WHERE session_id='${s.sid}'`,
    'add a second TA': `INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id) VALUES ('${s.sid}','teaching_assistant',gen_random_uuid())`,
    'upsert attended=false': `INSERT INTO session_participants(session_id, participant_type, teaching_assistant_id, attended) VALUES ('${s.sid}','teaching_assistant','${taId}',false)
       ON CONFLICT (session_id, teaching_assistant_id) DO UPDATE SET attended = EXCLUDED.attended`,
  };
  const res = {};
  for (const [k, q] of Object.entries(tries)) { const r = await tryIt(() => asAdmin(q)); res[k] = r.code ?? 'passed'; }
  const left = (await asSuper(`SELECT count(*)::int n FROM session_participants WHERE session_id=$1 AND attended AND participant_type='teaching_assistant'`, [s.sid])).rows[0].n;
  probe('P6', Object.values(res).every((c) => c === 'HC020') && left === 1 ? 'OK' : 'GAP', 'assistant changes on a Held lesson 10 days old (raw, admin)', res);
  const ok2 = await tryIt(() => asAdmin(`INSERT INTO session_participants(session_id, participant_type, teacher_id) VALUES ($1,'teacher',gen_random_uuid())`, [s.sid]));
  probe('P6b', 'INFO', 'a participant_type=teacher row is not judged (calculate-payroll pays no such row: _lib/payroll-sessions.ts participationIsPayable)', { code: ok2.code ?? 'passed' });
}

// ---------------------------------------------------------------- P7
// The service lane in a locked month: hold is allowed with no record.
{
  const today = await clock(0, -3);
  await asSuper(`INSERT INTO payroll_periods(month, status) VALUES ($1,'locked') ON CONFLICT (month) DO UPDATE SET status='locked'`, [today.month]);
  const s = await mk({ when: today, start: today.time, end: today.end_time, status: 'Scheduled' });
  const r = await tryIt(() => asService(`UPDATE sessions SET status='Held' WHERE id=$1`, [s.sid]));
  const ev = (await asSuper(`SELECT count(*)::int n FROM money_change_events WHERE payload::text LIKE '%' || $1 || '%'`, [s.sid])).rows[0].n;
  probe('P7', r.ok && (await sess(s.sid)).status === 'Held' && ev === 0 ? 'DESIGN' : 'OTHER',
        'service lane (a teacher\'s mark-attendance) holds a lesson with NO register in a LOCKED payroll month: passes, nothing recorded (b.1 G-2 "allowed")',
        { code: r.code ?? 'passed', events: ev });
  const r2 = await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [s.sid]));
  probe('P7b', r2.code === 'HC020' ? 'OK' : 'GAP', '  and the admin cannot take it back off Held raw', { code: r2.code });
  await asSuper(`DELETE FROM payroll_periods WHERE month=$1`, [today.month]);
}
await db.close();

// ---------------------------------------------------------------- P8
// L36: the exec's tier re-check under the row lock. The race window is
// between _money_change_apply's plan/token check and the exec's FOR UPDATE.
// Simulated in one connection: an AFTER INSERT trigger on
// money_change_overrides (fires inside the apply, after the token check and
// before the exec) does what a concurrent transaction committing in that
// window would do - locks the lesson's payroll month.
async function race(payFile, label) {
  await setup(payFile);
  const s = await mk({ when: TEN, status: 'Held' });
  await db.exec(`CREATE OR REPLACE FUNCTION public.probe_race() RETURNS trigger LANGUAGE plpgsql AS $f$
    BEGIN IF current_setting('probe.race', true) = 'on' THEN
      INSERT INTO public.payroll_periods(month, status) VALUES ('${s.month}', 'locked') ON CONFLICT (month) DO UPDATE SET status='locked';
    END IF; RETURN NULL; END $f$;
    CREATE TRIGGER probe_race AFTER INSERT ON public.money_change_overrides FOR EACH ROW EXECUTE FUNCTION public.probe_race();`);
  const newT = randomUUID();
  const args = JSON.stringify({ session_id: s.sid, teacher_id: newT });
  const p = (await asAdmin(`SELECT public.money_change_preview('session','reteach',$1::jsonb) r`, [args])).rows[0].r;
  const r = await H.script(ADMIN, 'authenticated', 'authenticated',
    `SELECT set_config('probe.race', 'on', true);
     SELECT public.money_change_checked('session','reteach','${args}'::jsonb,'${R}','${p.token}',true,NULL,'{}'::jsonb)`);
  const after = await sess(s.sid);
  const o = (await asSuper(`SELECT tier, review_required, correction_reason FROM money_change_overrides WHERE target_id=$1`, [s.sid])).rows;
  const locked = (await asSuper(`SELECT public.payroll_month_is_locked($1) l`, [s.month])).rows[0].l;
  await db.close();
  return { label, previewTier: p.tier, result: r?.code ?? 'committed', teacherChanged: after.teacher_id === newT, overrides: o, monthLockedNow: locked };
}
const real = await race(PAY, 'real file');
probe('P8a', real.result === 'HC011' && !real.teacherChanged ? 'OK' : 'GAP',
      'race: payroll month locked between the apply\'s token check and the exec\'s row lock (real file)', real);
const dir = mkdtempSync(join(tmpdir(), 'd43a-'));
const mutant = join(dir, 'pay-L36.sql');
const src = readFileSync(PAY, 'utf8');
const needle = "     OR COALESCE((v_now ->> 'tier')::int, 3) > COALESCE((p_plan ->> 'tier')::int, 0) THEN";
if (!src.replace(/\r/g, '').includes(needle)) throw new Error('L36 needle not found');
writeFileSync(mutant, src.replace(/\r/g, '').replace(needle, '     OR false THEN'));
const mut = await race(mutant, 'mutant L36');
probe('P8b', mut.result === 'committed' && mut.teacherChanged ? 'L36-KILLED-BY-THIS-PROBE' : 'L36-STILL-SURVIVES',
      'same race with mutant L36: the teacher change of a now-LOCKED month commits as a T1 override, not reviewed, no correction reason', mut);

console.log(`\n${out.length} probes run`);
