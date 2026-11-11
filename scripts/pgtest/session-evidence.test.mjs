// "Was this class held?" Drives supabase/migrations/20261112090000 - the
// authoritative copy - on top of the REAL cancelled-lesson guard
// (20261027090000), so case 19 cancels through the real trigger.
// Design and case numbers: docs/evidence/D1-evidence-model.md section 5.
//
//   node scripts/pgtest/session-evidence.test.mjs \
//     supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql \
//     supabase/migrations/20261112090000_session_held_evidence.sql
//
// Every fixture timestamp is an explicit UTC instant. The lesson is
// 2026-10-26 17:30-19:00 Hanoi = 10:30Z-12:00Z; the Hanoi day of the 26th
// is 2026-10-25T17:00Z .. 2026-10-26T17:00Z.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra)}` : ''}`);
  value ? pass++ : fail++;
};

const [guardFile, evidenceFile] = process.argv.slice(2);
if (!guardFile || !evidenceFile) {
  console.error('usage: session-evidence.test.mjs <20261027090000 file> <20261112090000 file>');
  process.exit(2);
}

const db = new PGlite();
// Minimal tables carrying every real column the two migrations read, with
// the names and nullability of src/integrations/supabase/types.ts. A
// prelude thinner than production turns a real column into a test-only
// failure. invoices has NO paid_amount on purpose (case 18f): the function
// must not read the cumulative figure.
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.jwt_role', true), '') $f$;

  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');

  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  -- Real body: 20251012023454_6adfb949-50dc-4ebb-8853-6de73d8e8441.sql:34-47.
  CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;

  CREATE TABLE public.classes(id uuid PRIMARY KEY, default_teacher_user uuid);
  -- Stub, as video-homework.test.mjs: the real one also covers assistants.
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c
                       WHERE c.id = is_teacher_of_class.class_id
                         AND c.default_teacher_user = is_teacher_of_class.user_id) $f$;

  CREATE TABLE public.sessions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, date date NOT NULL,
    start_time time NOT NULL, end_time time NOT NULL, status public.session_status NOT NULL DEFAULT 'Scheduled',
    teacher_id uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.enrollments(class_id uuid, student_id uuid, start_date date, end_date date, allowed_days int[]);
  CREATE TABLE public.attendance(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL, status text NOT NULL DEFAULT 'Present',
    marked_at timestamptz NOT NULL DEFAULT now(), marked_by uuid, notes text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(session_id, student_id));
  CREATE TABLE public.stars_sync_attendance_state(
    session_id uuid NOT NULL, student_id uuid NOT NULL, status text NOT NULL, event_id uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(session_id, student_id));
  CREATE TABLE public.stars_sync_held_flips(
    session_id uuid PRIMARY KEY, event_id uuid NOT NULL, flipped_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.homeworks(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, title text NOT NULL DEFAULT 'hw',
    due_date date, created_by uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE public.stars_homework_map(stars_homework_ref text PRIMARY KEY, homework_id uuid NOT NULL UNIQUE);
  CREATE TABLE public.homework_submissions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL, student_id uuid NOT NULL,
    grade text, graded_at timestamptz);
  CREATE TABLE public.stars_sync_grade_state(
    homework_id uuid NOT NULL, student_id uuid NOT NULL, grade text NOT NULL, PRIMARY KEY(homework_id, student_id));
  CREATE TABLE public.point_transactions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    session_id uuid, points integer NOT NULL, type text NOT NULL, date date NOT NULL, notes text,
    created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.class_transcripts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, session_id uuid,
    uploaded_by uuid NOT NULL, transcript_date date NOT NULL DEFAULT CURRENT_DATE,
    status text NOT NULL DEFAULT 'processing', audio_storage_path text, audio_duration_seconds numeric,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.payroll_periods(
    month text PRIMARY KEY, status text NOT NULL DEFAULT 'open', locked_at timestamptz, locked_by uuid);
  CREATE TABLE public.payroll_lines(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), month text NOT NULL, teacher_id uuid, assistant_id uuid);
  CREATE TABLE public.session_participants(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL,
    participant_type text NOT NULL DEFAULT 'teaching_assistant', teaching_assistant_id uuid,
    teacher_id uuid, attended boolean NOT NULL DEFAULT true);
  CREATE TABLE public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    status text NOT NULL DEFAULT 'issued', recorded_payment integer, confirmation_status text,
    confirmed_at timestamptz, tuition_frozen boolean NOT NULL DEFAULT false, carry_in_credit integer,
    UNIQUE(student_id, month));

  -- Verbatim: 20261021093000_payroll_month_locking.sql:162-173.
  CREATE OR REPLACE FUNCTION public.payroll_month_is_locked(p_month text)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
    SELECT EXISTS (
      SELECT 1 FROM public.payroll_periods
      WHERE month = substring(p_month from 1 for 7) AND status = 'locked'
    );
  $fn$;
`);

// ------------------------------------------------------------ preflight
// Case "fails loudly": against a schema missing a table it reads, the
// migration refuses and installs nothing.
{
  const bare = new PGlite();
  await bare.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');`);
  let msg = null;
  try { await bare.exec(readFileSync(evidenceFile, 'utf8')); } catch (e) { msg = e.message; }
  ok('preflight: refuses a schema it does not fit, naming what is missing',
     msg !== null && /missing:.*table public\.attendance/.test(msg) && /column|table/.test(msg), msg);
  await bare.exec('ROLLBACK').catch(() => {});
  const installed = (await bare.query(
    `SELECT count(*)::int n FROM pg_proc WHERE proname IN ('session_held_evidence','session_recording_evidence')`)).rows[0].n;
  ok('preflight: nothing installed after the refusal', installed === 0, installed);
  await bare.close();
}

await db.exec(readFileSync(guardFile, 'utf8'));
await db.exec(readFileSync(evidenceFile, 'utf8'));

// ---------------------------------------------------------------- helpers
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const PARENT = '00000000-0000-4000-8000-0000000000f1';
const STUDENT_LOGIN = '00000000-0000-4000-8000-0000000000c1';
const NOBODY = '00000000-0000-4000-8000-0000000000e1';
const OTHER_TEACHER = '00000000-0000-4000-8000-0000000000b9';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'family'),($3,'student'),($4,'teacher')`,
  [ADMIN, PARENT, STUDENT_LOGIN, OTHER_TEACHER]);

async function as(uid, jwtRole, dbRole, sql, params = []) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('test.uid', $1, false), set_config('test.jwt_role', $2, false)`,
    [uid ?? '', jwtRole ?? '']);
  if (dbRole) await db.exec(`SET ROLE ${dbRole}`);
  try { return await db.query(sql, params); }
  finally {
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('test.uid', '', false), set_config('test.jwt_role', '', false)`);
  }
}
const CALL = 'SELECT public.session_held_evidence($1) AS r';
const ev = async (sid) => (await as(null, 'service_role', 'service_role', CALL, [sid])).rows[0].r;
const evAdmin = async (sid) => (await as(ADMIN, 'authenticated', 'authenticated', CALL, [sid])).rows[0].r;
const evAs = async (uid, sid) => (await as(uid, 'authenticated', 'authenticated', CALL, [sid])).rows[0].r;
const errAs = async (uid, sid, jwtRole = 'authenticated', dbRole = 'authenticated') => {
  try { await as(uid, jwtRole, dbRole, CALL, [sid]); return null; }
  catch (e) { return { code: e.code, message: e.message }; }
};
const item = (r, type) => r.items.find((i) => i.type === type);
const types = (r) => r.items.map((i) => i.type);
// Fixed reading order D R P T H, whatever order jsonb keeps the keys in.
const fam = (r) => ['D', 'R', 'P', 'T', 'H'].filter((k) => r.families[k] === true).join('');

/** A class of its own, with its teacher, and one session on it. */
async function mk({ date = '2026-10-26', start = '17:30', end = '19:00', status = 'Scheduled', cid } = {}) {
  const teacherUid = randomUUID();
  const teacherId = randomUUID();
  if (!cid) {
    cid = randomUUID();
    await db.query(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacherUid]);
    await db.query(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  }
  const { id } = (await db.query(
    `INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [cid, date, start, end, status, teacherId])).rows[0];
  const t = (await db.query(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, teacherId };
}
const att = (sid, status, markedBy, { student = randomUUID(), notes = null, at = '2026-10-26T11:00:00Z' } = {}) =>
  db.query(`INSERT INTO attendance(session_id,student_id,status,marked_by,notes,marked_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [sid, student, status, markedBy, notes, at]).then(() => student);
const pts = ({ cid, sid = null, student = randomUUID(), points = 10, type = 'participation', date = '2026-10-26',
  by = null, at = '2026-10-26T11:00:00Z', notes = null, id = randomUUID() }) =>
  db.query(`INSERT INTO point_transactions(id,student_id,class_id,session_id,points,type,date,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, student, cid, sid, points, type, date, notes, by, at]).then(() => id);
const tr = ({ cid, sid = null, date = '2026-10-26', status = 'analyzed', audio = null, secs = null,
  at = '2026-10-26T12:30:00Z', by = randomUUID(), id = randomUUID() }) =>
  db.query(`INSERT INTO class_transcripts(id,class_id,session_id,uploaded_by,transcript_date,status,audio_storage_path,audio_duration_seconds,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, cid, sid, by, date, status, audio, secs, at]).then(() => id);
const hw = ({ cid, at, due = null, by = randomUUID(), id = randomUUID() }) =>
  db.query(`INSERT INTO homeworks(id,class_id,due_date,created_by,created_at) VALUES ($1,$2,$3,$4,$5)`,
    [id, cid, due, by, at]).then(() => id);
const inv = ({ student, month = '2026-10', status = 'issued', recorded = 0, conf = 'auto_approved', frozen = false,
  credit = 0, confirmedAt = null }) =>
  db.query(`INSERT INTO invoices(student_id,month,status,recorded_payment,confirmation_status,confirmed_at,tuition_frozen,carry_in_credit)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [student, month, status, recorded, conf, confirmedAt, frozen, credit]);
const setHelper = (body) => db.exec(`CREATE OR REPLACE FUNCTION public.session_recording_evidence(p_session_id uuid)
  RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $b$ ${body} $b$;`);
const restoreHelper = () => setHelper(`SELECT '[]'::jsonb`);

// ------------------------------------------------- baseline and exclusions
{
  const { sid } = await mk();
  const r = await ev(sid);
  ok('1 nothing: NONE, no items, all families false',
     r.level === 'NONE' && r.items.length === 0 && fam(r) === '', r);
  ok('1   settled.any false, hash is 64 hex', r.settled.any === false && /^[0-9a-f]{64}$/.test(r.snapshot_hash), r);
  ok('1   viewer internal, not redacted, version 1, session echoed',
     r.viewer === 'internal' && r.redacted === false && r.version === 1 &&
     r.session.id === sid && r.session.date === '2026-10-26' && r.session.status === 'Scheduled', r.session);
}
{
  const { sid, cid } = await mk();
  for (let i = 0; i < 3; i++)
    await db.query(`INSERT INTO enrollments VALUES ($1,$2,'2026-10-01',NULL,NULL)`, [cid, randomUUID()]);
  await db.query(`SELECT public._attendance_seed_for_class_dates($1,'2026-10-26','2026-10-26')`, [cid]);
  const seeded = (await db.query(`SELECT count(*)::int n FROM attendance WHERE session_id=$1 AND marked_by IS NULL AND status='Present'`, [sid])).rows[0].n;
  const r = await ev(sid);
  ok('2 three seeded Present rows (marked_by NULL) -> NONE', seeded === 3 && r.level === 'NONE' && r.items.length === 0, r);
  ok('2   but they are affected students', r.settled.affected_students === 3, r.settled);
}
{
  const { sid } = await mk();
  await att(sid, 'Present', null, { at: '2026-10-26T15:00:00Z' });
  await att(sid, 'Present', null, { at: '2026-10-26T15:00:00Z' });
  ok('3 auto-marked rows (Present, marked_by NULL, marked_at set) -> NONE', (await ev(sid)).level === 'NONE');
}
{
  const { sid } = await mk();
  await att(sid, 'Present', null, { notes: 'Auto-repaired on 2026-10-27' });
  await att(sid, 'Absent', null, { notes: 'Auto-repaired on 2026-10-27' });
  const r = await ev(sid);
  ok('4 repair rows (Present + Absent, marked_by NULL) -> NONE', r.level === 'NONE' && r.items.length === 0, r);
}
{
  const { sid, teacher } = await mk();
  await att(sid, 'Excused', teacher);
  await att(sid, 'Excused', teacher);
  const r = await ev(sid);
  ok('5 human-marked Excused only -> NONE', r.level === 'NONE' && r.items.length === 0, r);
}
{
  const { sid, cid, teacher } = await mk();
  const child = randomUUID();
  await pts({ cid, student: child, points: 50, by: null });                                    // streak bonus
  await pts({ cid, student: child, type: 'vocabulary_quiz', by: child });                      // vocab game
  await pts({ cid, student: child, type: 'homework', by: teacher });                           // homework award
  await pts({ cid, student: child, type: 'adjustment', by: ADMIN });                           // adjustment
  await pts({ cid, student: child, points: -5, by: teacher });                                 // negative
  const r = await ev(sid);
  ok('6 streak bonus, vocab, homework award, adjustment, negative -> NONE',
     r.level === 'NONE' && r.items.length === 0, r);
}

// --------------------------------------------------- one per evidence type
{
  const { sid, teacher } = await mk();
  await att(sid, 'Late', teacher);
  const r = await ev(sid), i = item(r, 'attendance_present');
  ok('7 one Late by a teacher -> STRONG, family D', r.level === 'STRONG' && fam(r) === 'D', r);
  ok('7   detail late 1, hec 1, actor the teacher',
     i.count === 1 && i.detail.late === 1 && i.detail.present === 0 && i.detail.hec === 1 &&
     i.detail.pixel_pal === 0 && i.detail.markers === 1 && i.actor_id === teacher, i);
  ok('7   item shape: strength strong, label_key evidence.<type>, at set',
     i.strength === 'strong' && i.family === 'D' && i.label_key === 'evidence.attendance_present' && i.at !== null, i);
  ok('7   no child id anywhere in the output', !JSON.stringify(r).includes(
     (await db.query(`SELECT student_id FROM attendance WHERE session_id=$1`, [sid])).rows[0].student_id));
}
{
  const { sid, teacher } = await mk();
  const child = await att(sid, 'Present', teacher, { notes: 'Pixel Pal' });
  await db.query(`INSERT INTO stars_sync_attendance_state(session_id,student_id,status,event_id) VALUES ($1,$2,'Present',$3)`,
    [sid, child, randomUUID()]);
  const i = item(await ev(sid), 'attendance_present');
  ok('8 Pixel Pal mark -> STRONG, pixel_pal 1, hec 0', i && i.detail.pixel_pal === 1 && i.detail.hec === 0, i);
}
{
  const { sid, teacher } = await mk();
  await att(sid, 'Absent', teacher);
  await att(sid, 'Absent', teacher);
  let r = await ev(sid);
  ok('9 two Absent by a teacher, Scheduled -> SOFT, family R',
     r.level === 'SOFT' && fam(r) === 'R' && item(r, 'attendance_register_only').count === 2 &&
     item(r, 'attendance_register_only').detail.absent === 2, r);
  await db.query(`UPDATE sessions SET status='Held' WHERE id=$1`, [sid]);
  r = await ev(sid);
  ok('9   + Held -> still SOFT (one family), items 4 and 5 both present',
     r.level === 'SOFT' && types(r).join() === 'attendance_register_only,status_held', types(r));
  await att(sid, 'Present', teacher);
  r = await ev(sid);
  ok('9   register_only is not emitted once a Present exists',
     r.level === 'STRONG' && !item(r, 'attendance_register_only'), types(r));
}
{
  const { sid } = await mk({ status: 'Held' });
  let r = await ev(sid);
  ok('10 status_held alone -> SOFT, not flipped by sync',
     r.level === 'SOFT' && item(r, 'status_held').detail.flipped_by_stars_sync === false &&
     item(r, 'status_held').at === null, r);
  await db.query(`INSERT INTO stars_sync_held_flips VALUES ($1,$2,'2026-10-26T11:10:00Z')`, [sid, randomUUID()]);
  r = await ev(sid);
  ok('10   with a held flip -> flipped_by_stars_sync true, at = flipped_at',
     item(r, 'status_held').detail.flipped_by_stars_sync === true &&
     new Date(item(r, 'status_held').at).toISOString() === '2026-10-26T11:10:00.000Z', item(r, 'status_held'));
}
{
  // (a) teacher row unlinked
  const a = await mk();
  await pts({ cid: a.cid, by: a.teacher });
  let r = await ev(a.sid);
  ok('11a teacher points, session_id NULL, same date -> SOFT, family P',
     r.level === 'SOFT' && fam(r) === 'P' && item(r, 'points_awarded').count === 1 &&
     item(r, 'points_awarded').actor_id === a.teacher, r);
  // (b) admin panel row: created_by NULL, linked
  const b = await mk();
  await pts({ cid: b.cid, sid: b.sid, by: null });
  r = await ev(b.sid);
  ok('11b admin-panel row (created_by NULL, session linked) counts',
     item(r, 'points_awarded')?.count === 1 && item(r, 'points_awarded').detail.linked_to_session === 1, r);
  // (c) linked to ANOTHER session of the same class and date
  const c = await mk();
  const other = await mk({ cid: c.cid, start: '19:30', end: '21:00' });
  await pts({ cid: c.cid, sid: other.sid, by: c.teacher });
  ok('11c row linked to another session of the class that day -> not counted here',
     (await ev(c.sid)).level === 'NONE');
  ok('11c   but counted for that session', item(await ev(other.sid), 'points_awarded')?.count === 1);
  // (d) correction row
  const d = await mk();
  await pts({ cid: d.cid, type: 'correction', by: d.teacher });
  ok('11d correction row counts', item(await ev(d.sid), 'points_awarded')?.count === 1);
  // (e) lesson window: 18:00 Hanoi in, 23:00 Hanoi out
  const e = await mk();
  await pts({ cid: e.cid, by: e.teacher, at: '2026-10-26T11:00:00Z' });
  let i = item(await ev(e.sid), 'points_awarded');
  ok('11e created 18:00 Hanoi -> in_lesson_window 1', i.detail.in_lesson_window === 1, i);
  const e2 = await mk();
  await pts({ cid: e2.cid, by: e2.teacher, at: '2026-10-26T16:00:00Z' });
  i = item(await ev(e2.sid), 'points_awarded');
  ok('11e created 23:00 Hanoi -> in_lesson_window 0 (still counted)', i.count === 1 && i.detail.in_lesson_window === 0, i);
  // Pixel Pal note
  const f = await mk();
  await pts({ cid: f.cid, by: f.teacher, notes: '[Pixel Pal] star' });
  ok('11  Pixel Pal points reported as pixel_pal', item(await ev(f.sid), 'points_awarded').detail.pixel_pal === 1);
}
{
  const a = await mk();
  await tr({ cid: a.cid, date: '2026-10-26' });
  let r = await ev(a.sid);
  ok('12a transcript_date = s.date -> SOFT, family T', r.level === 'SOFT' && fam(r) === 'T' &&
     item(r, 'transcript_same_day').count === 1, r);
  const b = await mk();
  await tr({ cid: b.cid, date: '2026-10-25', at: '2026-10-25T23:30:00Z' });   // 06:30 Hanoi on the 26th
  ok('12b date the day before but created 06:30 Hanoi on s.date -> counted',
     item(await ev(b.sid), 'transcript_same_day')?.count === 1);
  const c = await mk();
  await tr({ cid: c.cid, status: 'failed' });
  ok('12c failed text paste -> not counted', (await ev(c.sid)).level === 'NONE');
  const d = await mk();
  await tr({ cid: d.cid, status: 'failed', audio: 'audio/x.webm', secs: 1799.6 });
  const i = item(await ev(d.sid), 'transcript_same_day');
  ok('12d failed with audio -> counted, audio 1, audio_seconds rounded',
     i?.count === 1 && i.detail.audio === 1 && i.detail.audio_seconds === 1800, i);
}
{
  const { sid, cid } = await mk();
  await tr({ cid, sid, status: 'analyzed' });
  const r = await ev(sid);
  ok('13 transcript linked to the session -> STRONG, family D',
     r.level === 'STRONG' && fam(r) === 'D' && item(r, 'transcript_linked')?.detail.analyzed === 1, r);
  ok('13   and NOT also transcript_same_day', !item(r, 'transcript_same_day'), types(r));
}
{
  const { sid, teacher } = await mk();
  await setHelper(`SELECT CASE WHEN p_session_id = '${sid}' THEN jsonb_build_array(jsonb_build_object(
      'type','bogus','family','H','strength','aux','label_key','x',
      'row_keys', jsonb_build_array('rec-1:completed'), 'at','2026-10-26T12:05:00Z',
      'actor_id','${teacher}', 'detail', jsonb_build_object('minutes', 88))) ELSE '[]'::jsonb END`);
  let r = await ev(sid), i = item(r, 'recording_completed');
  ok('14 helper returns one element with row_keys -> STRONG, family D',
     r.level === 'STRONG' && fam(r) === 'D' && i?.count === 1, r);
  ok('14   type/family/strength/label_key overwritten by the main function',
     i.family === 'D' && i.strength === 'strong' && i.label_key === 'evidence.recording_completed' &&
     i.actor_id === teacher && i.detail.recordings[0].minutes === 88, i);
  await setHelper(`SELECT jsonb_build_array(jsonb_build_object('count', 3, 'detail', '{}'::jsonb),
                                            jsonb_build_object('row_keys', '[]'::jsonb))`);
  ok('14   elements without (non-empty) row_keys are dropped', (await ev(sid)).level === 'NONE');
  await setHelper(`SELECT NULL::jsonb`);
  ok('14   helper returning NULL -> treated as []', (await ev(sid)).level === 'NONE');
  await setHelper(`SELECT '{"row_keys":["a"]}'::jsonb`);
  ok('14   helper returning an object -> treated as []', (await ev(sid)).level === 'NONE');
  await setHelper(`SELECT '[{"row_keys":["a"],"count":0}]'::jsonb`);
  ok('14   a kept element counts at least once (count 0 is not "no recording")',
     item(await ev(sid), 'recording_completed')?.count === 1);
  await setHelper(`SELECT '[{"row_keys":["a"],"at":"not a time"}]'::jsonb`);
  let raised = null;
  try { await ev(sid); } catch (e) { raised = e.code; }
  ok('14   a broken element raises rather than becoming NONE', raised !== null, raised);
  await restoreHelper();
  ok('14   restored helper -> NONE again', (await ev(sid)).level === 'NONE');
}
{
  const { sid, cid } = await mk();
  await hw({ cid, at: '2026-10-26T13:00:00Z', due: '2026-10-30' });         // 20:00 Hanoi
  let r = await ev(sid);
  ok('15 homework created 20:00 Hanoi -> SOFT, family H',
     r.level === 'SOFT' && fam(r) === 'H' && item(r, 'homework_assigned').detail.with_due_date === 1 &&
     item(r, 'homework_assigned').strength === 'aux', r);
  const b = await mk();
  await hw({ cid: b.cid, at: '2026-10-26T17:30:00Z' });                     // 00:30 Hanoi on the 27th
  ok('15   created 00:30 Hanoi the next day -> not counted', (await ev(b.sid)).level === 'NONE');
  const c = await mk();
  const h = await hw({ cid: c.cid, at: '2026-10-26T13:00:00Z' });
  await db.query(`INSERT INTO stars_homework_map VALUES ('pp-1',$1)`, [h]);
  ok('15   sync-created homework (stars_homework_map) -> not counted', (await ev(c.sid)).level === 'NONE');
}
{
  const { sid, cid } = await mk();
  const h = await hw({ cid, at: '2026-10-20T03:00:00Z' });
  const kid = randomUUID();
  await db.query(`INSERT INTO homework_submissions(homework_id,student_id,grade,graded_at) VALUES ($1,$2,'A','2026-10-26T13:00:00Z')`, [h, kid]);
  let r = await ev(sid);
  ok('16 graded inside the day -> SOFT, family H', r.level === 'SOFT' && fam(r) === 'H' &&
     item(r, 'homework_graded')?.count === 1 && item(r, 'homework_graded').detail.homeworks === 1, r);
  const b = await mk();
  const h2 = await hw({ cid: b.cid, at: '2026-10-20T03:00:00Z' });
  const kid2 = randomUUID();
  await db.query(`INSERT INTO homework_submissions(homework_id,student_id,grade,graded_at) VALUES ($1,$2,'A','2026-10-26T13:00:00Z')`, [h2, kid2]);
  await db.query(`INSERT INTO stars_sync_grade_state VALUES ($1,$2,'A')`, [h2, kid2]);
  ok('16   sync-written grade (stars_sync_grade_state) -> not counted', (await ev(b.sid)).level === 'NONE');
}
{
  // Payroll lives in months no other case uses, so a lock cannot bleed.
  await db.query(`INSERT INTO payroll_periods VALUES ('2026-09','locked','2026-10-02T02:00:00Z',$1)`, [ADMIN]);
  const a = await mk({ date: '2026-09-14' });
  let r = await ev(a.sid);
  ok('17a month locked, Scheduled, no marks -> NONE, settled locked and any',
     r.level === 'NONE' && r.settled.payroll_month_locked === true && r.settled.any === true &&
     r.settled.payroll_paid_as_held === false && types(r).join() === 'payroll_month_locked' &&
     item(r, 'payroll_month_locked').actor_id === ADMIN, r);
  const b = await mk({ date: '2026-09-15', status: 'Held' });
  await db.query(`INSERT INTO payroll_lines(month,teacher_id) VALUES ('2026-09',$1)`, [b.teacherId]);
  r = await ev(b.sid);
  ok('17b Held + line for its teacher -> item 6, paid_as_held, SOFT',
     r.level === 'SOFT' && r.settled.payroll_paid_as_held === true &&
     item(r, 'payroll_paid_as_held')?.detail.lines === 1 && item(r, 'payroll_paid_as_held').detail.month === '2026-09', r);
  const c = await mk({ date: '2026-09-16', status: 'Held' });
  const ta = randomUUID();
  await db.query(`INSERT INTO session_participants(session_id,participant_type,teaching_assistant_id,attended) VALUES ($1,'teaching_assistant',$2,false)`, [c.sid, ta]);
  await db.query(`INSERT INTO payroll_lines(month,assistant_id) VALUES ('2026-09',$1)`, [ta]);
  r = await ev(c.sid);
  ok('17c line only for an assistant with attended = false -> paid_as_held false',
     r.settled.payroll_paid_as_held === false && !item(r, 'payroll_paid_as_held'), r.settled);
  await db.query(`UPDATE session_participants SET attended = true WHERE session_id=$1`, [c.sid]);
  ok('17c   the same assistant attended -> paid_as_held true',
     (await ev(c.sid)).settled.payroll_paid_as_held === true);
  await db.query(`INSERT INTO payroll_periods VALUES ('2026-08','open',NULL,NULL)`);
  const d = await mk({ date: '2026-08-14', status: 'Held' });
  await db.query(`INSERT INTO payroll_lines(month,teacher_id) VALUES ('2026-08',$1)`, [d.teacherId]);
  r = await ev(d.sid);
  ok('17d month open -> all settled flags false',
     r.settled.any === false && r.settled.payroll_month_locked === false &&
     r.settled.payroll_paid_as_held === false && r.settled.tuition === false, r.settled);
}
{
  const settledFor = async (invoice, attStatus = 'Present') => {
    const { sid } = await mk();
    const kid = await att(sid, attStatus, null);   // seeded-shape row
    await inv({ student: kid, ...invoice });
    return ev(sid);
  };
  let r = await settledFor({ recorded: 500000 });
  ok('18a recorded_payment > 0 -> tuition true, level NONE',
     r.settled.tuition === true && r.settled.any === true && r.settled.tuition_students === 1 &&
     r.level === 'NONE' && item(r, 'invoice_settled').detail.paid === 1, r);
  r = await settledFor({ conf: 'confirmed', confirmedAt: '2026-10-01T03:00:00Z' });
  ok('18b confirmation_status confirmed -> tuition true',
     r.settled.tuition === true && item(r, 'invoice_settled').detail.confirmed === 1 && item(r, 'invoice_settled').at !== null, r);
  r = await settledFor({ conf: 'adjusted' });
  ok('18b confirmation_status adjusted -> tuition true', r.settled.tuition === true);
  r = await settledFor({ frozen: true });
  ok('18c tuition_frozen -> tuition true', r.settled.tuition === true && item(r, 'invoice_settled').detail.frozen === 1, r);
  r = await settledFor({ status: 'paid' });
  ok('18d status paid -> tuition true', r.settled.tuition === true && r.level === 'NONE');
  r = await settledFor({ status: 'partial' });
  ok('18d status partial -> tuition true', r.settled.tuition === true);
  r = await settledFor({ conf: 'auto_approved', recorded: 0 });
  ok('18e auto_approved with recorded_payment 0 -> false',
     r.settled.tuition === false && r.settled.any === false && !item(r, 'invoice_settled'), r.settled);
  r = await settledFor({ conf: 'needs_review', recorded: null });
  ok('18e needs_review, recorded_payment NULL -> false', r.settled.tuition === false);
  const src = readFileSync(evidenceFile, 'utf8').replace(/--.*$/gm, '');
  ok('18f the function never reads paid_amount (absent from the prelude, absent from the code)',
     !/paid_amount/.test(src));
  r = await settledFor({ recorded: 500000 }, 'Excused');
  ok('18g paid invoice, child Excused on this lesson -> not affected -> false',
     r.settled.tuition === false && r.settled.affected_students === 0, r.settled);
  r = await settledFor({ credit: 200000 });
  ok('18h carry_in_credit only -> tuition false', r.settled.tuition === false && !item(r, 'invoice_settled'), r.settled);
  // with_carry_in_credit is only visible on the item, which exists only
  // when somebody is settled (see D1-build.md, deviations).
  const { sid } = await mk();
  const k1 = await att(sid, 'Present', null), k2 = await att(sid, 'Absent', null);
  await inv({ student: k1, recorded: 100000 });
  await inv({ student: k2, credit: 200000 });
  r = await ev(sid);
  ok('18h   alongside a settled child: count 1, with_carry_in_credit 1, affected 2',
     item(r, 'invoice_settled').count === 1 && item(r, 'invoice_settled').detail.with_carry_in_credit === 1 &&
     item(r, 'invoice_settled').detail.affected_students === 2, item(r, 'invoice_settled'));
  // month scope: a paid bill in another month is not this lesson's month
  const o = await mk();
  const k3 = await att(o.sid, 'Present', null);
  await inv({ student: k3, month: '2026-11', recorded: 100000 });
  ok('18  a paid bill for another month does not settle this one', (await ev(o.sid)).settled.tuition === false);
}

// ------------------------------------------------- levels and combinations
{
  const { sid, teacher } = await mk({ status: 'Held' });
  for (let i = 0; i < 3; i++) await att(sid, 'Present', teacher);
  const before = await ev(sid);
  await db.query(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [sid]);
  const after = await ev(sid);
  ok('19 three teacher-marked Present -> STRONG before the cancel', before.level === 'STRONG');
  ok('19   after the real cancel trigger -> NONE, session.status Canceled (read first, then cancel)',
     after.level === 'NONE' && after.session.status === 'Canceled' && after.items.length === 0, after);
}
{
  // R = Held, P = points, T = same-day transcript, H = homework, D = mark.
  const combo = async ({ R, P, T, H, D, M }) => {
    const date = M ? '2026-06-10' : '2026-10-26';
    const { sid, cid, teacher } = await mk({ date, status: R ? 'Held' : 'Scheduled' });
    if (P) await pts({ cid, date, by: teacher, at: `${date}T11:00:00Z` });
    if (T) await tr({ cid, date, at: `${date}T12:30:00Z` });
    if (H) await hw({ cid, at: `${date}T13:00:00Z` });
    if (D) await att(sid, 'Present', teacher);
    return ev(sid);
  };
  await db.query(`INSERT INTO payroll_periods VALUES ('2026-06','locked','2026-07-02T02:00:00Z',$1)`, [ADMIN]);
  const rows = [
    [{ R: 1, P: 1 }, 'STRONG', 'RP'], [{ R: 1, T: 1 }, 'STRONG', 'RT'], [{ P: 1, T: 1 }, 'STRONG', 'PT'],
    [{ R: 1, P: 1, T: 1 }, 'STRONG', 'RPT'],
    [{ H: 1, R: 1 }, 'SOFT', 'RH'], [{ H: 1, P: 1 }, 'SOFT', 'PH'], [{ H: 1, T: 1 }, 'SOFT', 'TH'],
    [{ H: 1 }, 'SOFT', 'H'], [{ D: 1 }, 'STRONG', 'D'], [{ M: 1 }, 'NONE', ''],
    [{ D: 1, H: 1 }, 'STRONG', 'DH'],
  ];
  for (const [f, level, fams] of rows) {
    const r = await combo(f);
    ok(`20 truth table ${Object.keys(f).join('+')} -> ${level}`, r.level === level && fam(r) === fams, { level: r.level, f: fam(r) });
  }
}
{
  const tz = (await db.query(`SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') IS NOT NULL AS ok`)).rows[0].ok;
  ok('21 Asia/Ho_Chi_Minh resolves in pglite (no Bangkok fallback needed)', tz === true);
  const d26 = await mk({ date: '2026-10-26' });
  const d27 = await mk({ date: '2026-10-27', cid: d26.cid });
  await hw({ cid: d26.cid, at: '2026-10-26T17:05:00Z' });       // 00:05 on the 27th in Hanoi
  ok('21 homework at 17:05Z is NOT on the 26th', (await ev(d26.sid)).level === 'NONE');
  ok('21   and IS on the 27th', item(await ev(d27.sid), 'homework_assigned')?.count === 1);
  const late = await mk({ date: '2026-10-26', start: '22:00', end: '00:30' });
  await pts({ cid: late.cid, by: late.teacher, at: '2026-10-26T17:20:00Z' }); // 00:20 Hanoi on the 27th, UTC date 26th
  ok('21 lesson running past midnight: window ends the next day',
     item(await ev(late.sid), 'points_awarded')?.detail.in_lesson_window === 1);
}

// ------------------------------------------------------------------- hash
const hashOf = async (sid) => (await ev(sid)).snapshot_hash;
{
  const { sid, cid, teacher } = await mk({ status: 'Held' });
  await att(sid, 'Present', teacher);
  await pts({ cid, by: teacher });
  ok('22 two calls on unchanged data -> same hash', (await hashOf(sid)) === (await hashOf(sid)));
}
{
  const { sid, cid, teacher } = await mk({ status: 'Held' });
  const kids = [randomUUID(), randomUUID(), randomUUID()];
  const pids = [randomUUID(), randomUUID(), randomUUID()];
  const fill = async (order) => {
    for (const n of order) {
      await att(sid, n === 1 ? 'Absent' : 'Present', teacher, { student: kids[n] });
      await pts({ cid, id: pids[n], student: kids[n], points: 5 + n, by: teacher });
      await inv({ student: kids[n], recorded: n === 2 ? 1000 : 0 });
    }
  };
  await fill([0, 1, 2]);
  const h1 = await hashOf(sid);
  await db.query(`DELETE FROM attendance WHERE session_id=$1`, [sid]);
  await db.query(`DELETE FROM point_transactions WHERE class_id=$1`, [cid]);
  await db.query(`DELETE FROM invoices WHERE student_id = ANY($1::uuid[])`, [kids]);
  await fill([2, 1, 0]);
  const h2 = await hashOf(sid);
  ok('23 same facts inserted in the opposite order -> same hash', h1 === h2, [h1, h2]);
  ok('23   independent of now(): computed_at is not hashed',
     (await db.query(`SELECT (public.session_held_evidence($1)->>'computed_at') IS NOT NULL AS ok`, [sid])).rows[0].ok);

  // 24: every viewer gets the same token
  const asAdmin = await evAdmin(sid), asTeacher = await evAs(teacher, sid), asService = await ev(sid);
  ok('24 admin, the class teacher and service role get the same hash',
     asAdmin.snapshot_hash === asTeacher.snapshot_hash && asAdmin.snapshot_hash === asService.snapshot_hash);
  ok('24   admin view: viewer admin, settled present, invoice_settled item present',
     asAdmin.viewer === 'admin' && asAdmin.redacted === false && asAdmin.settled?.tuition === true &&
     !!item(asAdmin, 'invoice_settled'), asAdmin.viewer);
  ok('24   teacher view: settled null, no items 11/12, redacted true, same level',
     asTeacher.viewer === 'teacher' && asTeacher.redacted === true && asTeacher.settled === null &&
     !asTeacher.items.some((i) => i.family === 'M') && asTeacher.level === asAdmin.level &&
     asTeacher.items.length === asAdmin.items.filter((i) => i.family !== 'M').length, asTeacher);
}
{
  const { sid, teacher } = await mk({ status: 'Held' });
  const kid = await att(sid, 'Present', teacher);
  const h0 = await hashOf(sid);
  await db.query(`UPDATE attendance SET marked_at='2026-10-26T11:45:00Z', updated_at='2026-10-27T00:00:00Z' WHERE student_id=$1`, [kid]);
  ok('25 re-saving a mark (new marked_at / updated_at) leaves the hash unchanged', (await hashOf(sid)) === h0);
  await att(sid, 'Present', null);   // seeded row for a child with no invoice
  ok('25 a seeded row for a child with no settled invoice leaves the hash unchanged', (await hashOf(sid)) === h0);
}
{
  const { sid, cid, teacher } = await mk();
  const kid = await att(sid, 'Absent', teacher);
  const pid = await pts({ cid, by: teacher });
  const tid = await tr({ cid, status: 'processing' });
  const billKid = await att(sid, 'Present', null);
  await inv({ student: billKid });
  const changes = [
    ['one mark Absent -> Present', `UPDATE attendance SET status='Present' WHERE student_id='${kid}'`],
    ['the same mark re-made by a different marked_by', `UPDATE attendance SET marked_by='${randomUUID()}' WHERE student_id='${kid}'`],
    ['a new point row', `INSERT INTO point_transactions(student_id,class_id,points,type,date,created_by,created_at) VALUES ('${randomUUID()}','${cid}',3,'participation','2026-10-26','${teacher}','2026-10-26T11:20:00Z')`],
    ["a point row's points edited", `UPDATE point_transactions SET points=20 WHERE id='${pid}'`],
    ['a transcript processing -> analyzed', `UPDATE class_transcripts SET status='analyzed' WHERE id='${tid}'`],
    ['session Scheduled -> Held', `UPDATE sessions SET status='Held' WHERE id='${sid}'`],
    ['session start time moved', `UPDATE sessions SET start_time='17:45' WHERE id='${sid}'`],
    ["an affected child's invoice gaining recorded_payment", `UPDATE invoices SET recorded_payment=100000 WHERE student_id='${billKid}'`],
    ['session date moved', `UPDATE sessions SET date='2026-07-27' WHERE id='${sid}'`],
    ['payroll month locked', `INSERT INTO payroll_periods VALUES ('2026-07','locked','2026-08-01T02:00:00Z','${ADMIN}')`],
  ];
  let prev = await hashOf(sid);
  for (const [name, sql] of changes) {
    await db.exec(sql);
    const h = await hashOf(sid);
    ok(`26 hash changes: ${name}`, h !== prev, [prev, h]);
    prev = h;
  }
  await setHelper(`SELECT CASE WHEN p_session_id = '${sid}' THEN '[{"row_keys":["rec-9:completed"]}]'::jsonb ELSE '[]'::jsonb END`);
  ok('26 hash changes: a new recording element from the helper', (await hashOf(sid)) !== prev);
  await restoreHelper();
  ok('26   and returns when the element goes', (await hashOf(sid)) === prev);
}

// ----------------------------------------------------------------- access
{
  const { sid, teacher } = await mk();
  await att(sid, 'Present', teacher);
  const random = randomUUID();
  let e = await errAs(null, sid, 'anon', 'anon');
  ok('27 anon cannot execute', e?.code === '42501' && /permission denied for function/.test(e.message), e);
  e = await errAs(NOBODY, sid);
  ok('28 signed-in user with no role -> 42501', e?.code === '42501', e);
  e = await errAs(OTHER_TEACHER, sid);
  ok('28 teacher of a DIFFERENT class -> 42501', e?.code === '42501', e);
  e = await errAs(PARENT, sid);
  ok('28 a parent -> 42501', e?.code === '42501', e);
  e = await errAs(STUDENT_LOGIN, sid);
  ok('28 a student -> 42501', e?.code === '42501', e);
  const eReal = await errAs(OTHER_TEACHER, sid), eFake = await errAs(OTHER_TEACHER, random);
  ok('28 same 42501 and message for a random uuid (no existence leak)',
     eFake?.code === '42501' && eFake.message === eReal.message, [eReal, eFake]);
  e = await errAs(teacher, random);
  ok('28 even a real teacher gets 42501 for an invented id', e?.code === '42501', e);
  ok('28 authenticated with an empty JWT role is not "internal"',
     (await errAs(null, sid, 'authenticated', 'authenticated'))?.code === '42501');
  e = await errAs(ADMIN, random);
  ok('29 admin with a random uuid -> P0002', e?.code === 'P0002', e);
  e = await errAs(ADMIN, null);
  ok('29 NULL argument -> 22004', e?.code === '22004', e);
  ok('24 the class teacher may call', (await evAs(teacher, sid)).level === 'STRONG');
  let denied = null;
  try { await as(ADMIN, 'authenticated', 'authenticated', `SELECT public.session_recording_evidence($1)`, [sid]); }
  catch (x) { denied = x.message; }
  ok('30 authenticated cannot execute session_recording_evidence directly',
     /permission denied for function/.test(denied ?? ''), denied);
}

// ------------------------------------------------------ writes nothing
{
  const { sid, cid, teacher } = await mk({ status: 'Held' });
  await att(sid, 'Present', teacher);
  await pts({ cid, by: teacher });
  const fingerprint = async () => (await db.query(`
    SELECT string_agg(t || ':' || n, ',' ORDER BY t) f FROM (
      SELECT 'attendance' t, md5(COALESCE(string_agg(a::text, '|' ORDER BY a.id), '')) n FROM attendance a
      UNION ALL SELECT 'sessions', md5(COALESCE(string_agg(s::text, '|' ORDER BY s.id), '')) FROM sessions s
      UNION ALL SELECT 'points', md5(COALESCE(string_agg(p::text, '|' ORDER BY p.id), '')) FROM point_transactions p
      UNION ALL SELECT 'invoices', md5(COALESCE(string_agg(i::text, '|' ORDER BY i.id), '')) FROM invoices i
      UNION ALL SELECT 'transcripts', md5(COALESCE(string_agg(c::text, '|' ORDER BY c.id), '')) FROM class_transcripts c
      UNION ALL SELECT 'homeworks', md5(COALESCE(string_agg(h::text, '|' ORDER BY h.id), '')) FROM homeworks h
      UNION ALL SELECT 'payroll', md5(COALESCE(string_agg(l::text, '|' ORDER BY l.id), '')) FROM payroll_lines l
    ) x`)).rows[0].f;
  const before = await fingerprint();
  await ev(sid); await evAdmin(sid); await evAs(teacher, sid);
  ok('W calling it (service, admin, teacher) changes no row anywhere', (await fingerprint()) === before);
  // A replacement helper that tries to write is refused by Postgres:
  // the whole chain is STABLE.
  await db.exec(`CREATE OR REPLACE FUNCTION public.session_recording_evidence(p_session_id uuid)
    RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $b$
    BEGIN
      INSERT INTO public.point_transactions(student_id,class_id,points,type,date) VALUES (gen_random_uuid(),gen_random_uuid(),1,'participation','2026-10-26');
      RETURN '[]'::jsonb;
    END $b$;`);
  let refused = null;
  try { await ev(sid); } catch (e) { refused = e.message; }
  ok('W a helper that writes is refused (STABLE), and the error propagates', /non-volatile/.test(refused ?? ''), refused);
  ok('W   and nothing was written', (await fingerprint()) === before);
  await restoreHelper();
}

// ------------------------------------------------ re-paste and catalogue
{
  const { sid } = await mk();
  await setHelper(`SELECT CASE WHEN p_session_id = '${sid}' THEN '[{"row_keys":["rec-c:completed"]}]'::jsonb ELSE '[]'::jsonb END`);
  let again = null;
  try { await db.exec(readFileSync(evidenceFile, 'utf8')); } catch (e) { again = e.message; }
  ok('31 the migration applies a second time unchanged', again === null, again);
  ok("31   and a re-paste does NOT put the empty helper back over workstream C's",
     (await ev(sid)).level === 'STRONG');
  await restoreHelper();
  let guardAgain = null;
  try { await db.exec(readFileSync(guardFile, 'utf8')); } catch (e) { guardAgain = e.message; }
  ok('31   the cancelled-lesson guard still re-applies on top', guardAgain === null, guardAgain);
  const procs = (await db.query(`
    SELECT proname, provolatile, prosecdef, proconfig FROM pg_proc
     WHERE pronamespace = 'public'::regnamespace AND proname IN ('session_held_evidence','session_recording_evidence')
     ORDER BY proname`)).rows;
  ok('32 both functions: STABLE, SECURITY DEFINER, search_path=public',
     procs.length === 2 && procs.every((p) => p.provolatile === 's' && p.prosecdef === true &&
       (p.proconfig ?? []).includes('search_path=public')), procs);
  const grants = (await db.query(`SELECT
      has_function_privilege('authenticated','public.session_held_evidence(uuid)','EXECUTE') a,
      has_function_privilege('service_role','public.session_held_evidence(uuid)','EXECUTE') s,
      has_function_privilege('anon','public.session_held_evidence(uuid)','EXECUTE') n,
      has_function_privilege('authenticated','public.session_recording_evidence(uuid)','EXECUTE') ra,
      has_function_privilege('anon','public.session_recording_evidence(uuid)','EXECUTE') rn`)).rows[0];
  ok('32 grants: evidence for authenticated + service_role only; helper for nobody',
     grants.a && grants.s && !grants.n && !grants.ra && !grants.rn, grants);
}

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
