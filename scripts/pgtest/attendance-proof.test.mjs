// A child who was in the room cannot be marked absent for that lesson
// (supabase/migrations/20261123100000_attendance_proof.sql).
//
// The Robot case: an old transfer function deleted a child's marks, a paid month
// was repriced to 0, although the teacher had given the child points in those
// lessons. This suite holds:
//   M1  each PROOF kind (individual points, a speaker mark naming one child):
//       Absent / Excused / delete / insert-Absent refused with ATTENDANCE_PROOF,
//       all four allowed once the evidence is removed. Plus the edges of "individual".
//   M2  every INDICATION kind (and a batch award): nothing refused, nothing marked.
//   M3  no person acting (service role, a trigger): the row is kept, one refusal is
//       logged, the rest of a multi-row statement completes, nothing raises.
//   M4  a cancelled lesson, a deleted lesson, the bypass flags, a failing lookup.
//   M5  the Robot case, with the OLD transfer body to wipe the marks.
//   M6  the live modify_enrollment_transfer over a lesson with proof.
//   M7  apply never touches a person's mark and never marks a child not enrolled.
//   M8  who may call what.
//   M9  the Stars sync, with a page that says Absent for a child with proof.
// The migration file is the one on argv (the same SQL that is pasted into Supabase).
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const MIG_FILE = process.argv[2] ?? join(repo, 'supabase', 'migrations', '20261123100000_attendance_proof.sql');
const MIG = readFileSync(MIG_FILE, 'utf8');
const mig = (name) => readFileSync(join(repo, 'supabase', 'migrations', name), 'utf8');

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), { got, want });
const tryIt = async (fn) => { try { await fn(); return null; } catch (e) { return { code: e.code, message: String(e.message) }; } };

// ------------------------------------------------------------------ people
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = U(1), T1 = U(2), T2 = U(3), FAM = U(4);
const TEACH1 = U(11), TEACH2 = U(12), CA = U(21), CB = U(22);

// ------------------------------------------------------------------ dates
const hanoiToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const dayAgo = (n) => new Date(Date.parse(`${hanoiToday}T12:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const hn = (date, hhmm) => new Date(`${date}T${hhmm}:00+07:00`).toISOString(); // Hanoi wall clock -> instant
const dow = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
const month = (date) => date.slice(0, 7);

// ------------------------------------------------------------------ schema
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
  GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
  CREATE TABLE public.teachers(id uuid PRIMARY KEY, full_name text, user_id uuid);
  CREATE TABLE public.classes(id uuid PRIMARY KEY, name text NOT NULL, default_teacher_id uuid);
  CREATE TABLE public.students(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, linked_user_id uuid);
  CREATE TABLE public.enrollments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    start_date date NOT NULL, end_date date, allowed_days integer[], created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid, updated_by uuid, updated_at timestamptz DEFAULT now());
  CREATE TABLE public.sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid REFERENCES public.classes(id), teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '09:00', end_time time NOT NULL DEFAULT '10:00',
    status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.attendance(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'Present' CHECK (status IN ('Present','Absent','Excused','Late')), notes text, marked_by uuid,
    marked_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id));
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $$ SELECT EXISTS (SELECT 1 FROM public.classes c JOIN public.teachers t ON t.id = c.default_teacher_id
                       WHERE c.id = is_teacher_of_class.class_id AND t.user_id = is_teacher_of_class.user_id) $$;
  GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated, service_role;
  CREATE TABLE public.point_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    homework_id uuid, session_id uuid, notes text, points integer NOT NULL, type text NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
    month text NOT NULL DEFAULT to_char(CURRENT_DATE,'YYYY-MM'), created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.student_points(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL, month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0, participation_points integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, class_id, month));
  CREATE TABLE public.skill_assessments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    session_id uuid, skill text NOT NULL DEFAULT 'speaking', score integer NOT NULL DEFAULT 5, date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid, created_at timestamptz DEFAULT now());
  CREATE TABLE public.student_work(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, status text NOT NULL DEFAULT 'approved',
    is_teamwork boolean NOT NULL DEFAULT false, uploaded_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.lesson_speaker_marks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    class_id uuid, kind text NOT NULL, student_ids uuid[] NOT NULL DEFAULT '{}', at timestamptz NOT NULL DEFAULT now(), made_by uuid);
  CREATE TABLE public.class_transcripts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, session_id uuid,
    transcript_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.transcript_speaker_metrics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transcript_id uuid NOT NULL, class_id uuid,
    student_id uuid, is_teacher boolean NOT NULL DEFAULT false, utterance_count integer NOT NULL DEFAULT 0);
  CREATE TABLE public.transcript_speaker_suggestions(metric_id uuid PRIMARY KEY, suggested_student_id uuid);
  CREATE TABLE public.homeworks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL, title text);
  CREATE TABLE public.homework_submissions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), homework_id uuid NOT NULL, student_id uuid NOT NULL, submitted_at timestamptz);
  CREATE TABLE public.audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text, entity text, entity_id text, diff jsonb);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
`;

const db = new PGlite();
await db.exec(PRELUDE);
const one = async (q, p) => (await db.query(q, p)).rows[0];
const all = async (q, p) => (await db.query(q, p)).rows;

await db.exec(`INSERT INTO public.user_roles VALUES ('${ADMIN}','admin'), ('${T1}','teacher'), ('${T2}','teacher'), ('${FAM}','family')`);
await db.exec(`INSERT INTO public.teachers VALUES ('${TEACH1}','Teacher One','${T1}'), ('${TEACH2}','Teacher Two','${T2}')`);
await db.exec(`INSERT INTO public.classes VALUES ('${CA}','Class A','${TEACH1}'), ('${CB}','Class B','${TEACH2}')`);

// Acting as someone: a signed-in person (uid + 'authenticated'), the service role, or
// nobody at all (the SQL editor / the hourly job: no claims, no uid, superuser).
const as = async (who, fn) => {
  const cfg = {
    admin: [ADMIN, 'authenticated'], teacher1: [T1, 'authenticated'], teacher2: [T2, 'authenticated'],
    family: [FAM, 'authenticated'], service: ['', 'service_role'],
  }[who];
  await db.query(`SELECT set_config('test.uid', $1, false), set_config('request.jwt.claims', $2, false)`, [cfg[0], JSON.stringify({ role: cfg[1] })]);
  await db.exec(`SET ROLE ${cfg[1]}`);
  try { return await fn(); }
  finally {
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('test.uid', '', false), set_config('request.jwt.claims', '', false)`);
  }
};

// ----------------------------------------------------------------- builders
let dayCounter = 0;
const lesson = async (cls = CA, status = 'Held', opts = {}) => {
  const date = opts.date ?? dayAgo(++dayCounter);
  const id = (await one(`INSERT INTO public.sessions(class_id, teacher_id, date, start_time, end_time, status) VALUES ($1,$2,$3,'09:00','10:00',$4) RETURNING id`,
    [cls, cls === CA ? TEACH1 : TEACH2, date, status])).id;
  return { id, date, cls };
};
let kidCounter = 0;
const kid = async (name, cls = CA, opts = {}) => {
  const id = (await one(`INSERT INTO public.students(full_name) VALUES ($1) RETURNING id`, [`${name} ${++kidCounter}`])).id;
  if (cls) await db.query(`INSERT INTO public.enrollments(student_id, class_id, start_date, allowed_days) VALUES ($1,$2,'2020-01-01',$3)`, [id, cls, opts.days ?? null]);
  return { id, name: `${name} ${kidCounter}` };
};
const mark = (L, k, status = 'Present', by = T1) =>
  db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,$3,$4)`, [L.id, k.id, status, by]);
const row = async (L, k) => one(`SELECT status::text AS status, marked_by, notes FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [L.id, k.id]);
const points = (L, k, hhmm = '09:30', o = {}) => db.query(
  `INSERT INTO public.point_transactions(student_id, class_id, session_id, points, type, created_by, created_at, notes, date, month)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [k.id, L.cls, o.noSession ? null : L.id, o.points ?? 5, o.type ?? 'participation', o.by === undefined ? T1 : o.by,
   o.at ?? hn(L.date, hhmm), o.notes ?? null, L.date, month(L.date)]);
const speaker = (L, kids, hhmm = '09:30', kind = 'student') => db.query(
  `INSERT INTO public.lesson_speaker_marks(session_id, class_id, kind, student_ids, at, made_by) VALUES ($1,$2,$3,$4,$5,$6)`,
  [L.id, L.cls, kind, kids.map((k) => k.id), hn(L.date, hhmm), T1]);
const rowsFor = async (L, k, proofOnly = false) => all(
  `SELECT kind, strength, summary FROM public.attendance_proof_rows(ARRAY[$1::uuid], $2::uuid, $3::boolean) ORDER BY kind`, [L.id, k.id, proofOnly]);
const refusals = async (L) => all(`SELECT op, attempted_status, kept_status FROM public.attendance_proof_refusals WHERE session_id=$1 ORDER BY created_at, id`, [L.id]);
const gaps = async (from, to, who = 'service') => as(who, () => all(`SELECT * FROM public.attendance_evidence_gaps($1::date, $2::date)`, [from, to]));
const apply = async (from, to, dry = true, who = 'service') =>
  as(who, async () => (await one(`SELECT public.attendance_apply_evidence($1::date, $2::date, $3::boolean) AS r`, [from, to, dry])).r);

// ================================================================== M5 (before the guard exists)
console.log('=== M5 the Robot case: the old transfer wipes the marks, then the guard arrives ===');
const ROBOT = await kid('Robot');
const MATE = await kid('Mate');
const robotLessons = [];
for (let i = 0; i < 8; i++) {
  const L = await lesson(CA);
  robotLessons.push(L);
  await mark(L, ROBOT, 'Present', T1);
  await mark(L, MATE, 'Present', T1);
  if (i < 5) await points(L, ROBOT, '09:30'); // proof in 5 of 8 lessons
}
const m5From = robotLessons[7].date, m5To = robotLessons[0].date;
// The OLD body (20251023141128): "Delete ALL attendance rows in old class (past and future)".
await db.exec(mig('20251023141128_a50f5fd3-fcf8-4395-b2db-1d118133bee5.sql'));
await db.query(`SELECT public.modify_enrollment_transfer($1, $2, $3, $4)`, [ROBOT.id, CA, CB, hanoiToday]);
eq('the old transfer deleted all 8 of Robot\'s marks', (await one(`SELECT count(*)::int n FROM public.attendance WHERE student_id=$1`, [ROBOT.id])).n, 0);
eq('  Mate\'s marks are untouched', (await one(`SELECT count(*)::int n FROM public.attendance WHERE student_id=$1`, [MATE.id])).n, 8);
// Enrolment history corrected afterwards (what the owner did): back in Class A, no Class B row.
await db.query(`UPDATE public.enrollments SET end_date = NULL WHERE student_id=$1 AND class_id=$2`, [ROBOT.id, CA]);
await db.query(`DELETE FROM public.enrollments WHERE student_id=$1 AND class_id=$2`, [ROBOT.id, CB]);

ok('the migration installs', (await tryIt(() => db.exec(MIG))) === null);
ok('the migration installs twice', (await tryIt(() => db.exec(MIG))) === null);

const g5 = (await gaps(m5From, m5To)).filter((r) => r.student_id === ROBOT.id);
const proofNoMark = g5.filter((r) => r.kind === 'proof_no_mark').map((r) => r.lesson_date.toISOString?.().slice(0, 10) ?? String(r.lesson_date)).sort();
const expectProof = robotLessons.slice(0, 5).map((L) => L.date).sort();
eq('gaps: the 5 lessons with points are proof_no_mark', proofNoMark, expectProof);
eq('gaps: the other 3 are no_mark_no_proof', g5.filter((r) => r.kind === 'no_mark_no_proof').length, 3);
eq('gaps: nothing else about Robot', g5.length, 8);
eq('gaps: Mate (marked) is not listed', (await gaps(m5From, m5To)).filter((r) => r.student_id === MATE.id).length, 0);
eq('gaps: the proof summary names the points', g5.find((r) => r.kind === 'proof_no_mark').summary, '5 participation points at 09:30');

const dry = await apply(m5From, m5To, true);
eq('dry run: would insert 5', [dry.dry_run, dry.inserted, dry.corrected, dry.left_for_admin], [true, 5, 0, 3]);
eq('dry run: changed nothing', (await one(`SELECT count(*)::int n FROM public.attendance WHERE student_id=$1`, [ROBOT.id])).n, 0);
eq('dry run: logged nothing', (await one(`SELECT count(*)::int n FROM public.attendance_evidence_runs`)).n, 0);
const real = await apply(m5From, m5To, false);
eq('apply: inserted exactly the 5', [real.dry_run, real.inserted, real.corrected, real.left_for_admin], [false, 5, 0, 3]);
const robotRows = await all(`SELECT s.date::text AS d, a.status::text AS status, a.marked_by, a.notes FROM public.attendance a JOIN public.sessions s ON s.id=a.session_id WHERE a.student_id=$1 ORDER BY s.date`, [ROBOT.id]);
eq('  they are the proof-backed lessons', robotRows.map((r) => r.d).sort(), expectProof);
ok('  Present, no person, noted', robotRows.every((r) => r.status === 'Present' && r.marked_by === null && r.notes.startsWith('Auto-marked from evidence: ')), robotRows);
eq('  affected months', real.affected_months.map((x) => `${x.month}`).sort(), [...new Set(expectProof.map(month))].sort());
eq('  the run is logged', (await one(`SELECT count(*)::int n, max(inserted)::int i FROM public.attendance_evidence_runs`)), { n: 1, i: 5 });
const second = await apply(m5From, m5To, false);
eq('a second apply changes nothing', [second.inserted, second.corrected], [0, 0]);
eq('  and still leaves the 3 for an admin', second.left_for_admin, 3);

// ================================================================== M1
console.log('=== M1 each proof kind locks the mark ===');
const PROOF = {
  individual_points: {
    add: async (L, k, hhmm) => points(L, k, hhmm),
    remove: async (L, k) => db.query(`DELETE FROM public.point_transactions WHERE session_id=$1 AND student_id=$2`, [L.id, k.id]),
    hint: /delete it in the child's point history/,
  },
  speaker_mark: {
    add: async (L, k, hhmm) => speaker(L, [k], hhmm),
    remove: async (L, k) => db.query(`DELETE FROM public.lesson_speaker_marks WHERE session_id=$1 AND $2 = ANY(student_ids)`, [L.id, k.id]),
    hint: /use Undo on the lesson's speakers page/,
  },
};
for (const [kind, p] of Object.entries(PROOF)) {
  const L = await lesson();
  const X = await kid('Proof X'), Y = await kid('Proof Y');
  await mark(L, X, 'Present', T1);
  await p.add(L, X, '09:30'); await p.add(L, Y, '09:40');
  eq(`${kind}: it is reported as proof`, (await rowsFor(L, X)).filter((r) => r.kind === kind).map((r) => r.strength), ['proof']);
  const attempts = {
    'UPDATE to Absent': () => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id])),
    'UPDATE to Excused': () => as('admin', () => db.query(`UPDATE public.attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id])),
    'DELETE': () => as('admin', () => db.query(`DELETE FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [L.id, X.id])),
    'INSERT of Absent': () => as('admin', () => db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Absent',$3)`, [L.id, Y.id, ADMIN])),
  };
  for (const [what, fn] of Object.entries(attempts)) {
    const err = await tryIt(fn);
    ok(`${kind}: ${what} is refused with ATTENDANCE_PROOF naming the child`,
      err && err.message.startsWith('ATTENDANCE_PROOF:') && err.message.includes(what === 'INSERT of Absent' ? Y.name : X.name) && p.hint.test(err.message) && err.code === 'P0001', err);
  }
  eq(`${kind}: the mark is still Present`, (await row(L, X)).status, 'Present');
  eq(`${kind}: nothing was inserted for the other child`, await row(L, Y), undefined);
  await as('admin', () => db.query(`UPDATE public.attendance SET status='Late' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]));
  eq(`${kind}: Late is still allowed (only Absent / Excused / delete are locked)`, (await row(L, X)).status, 'Late');
  await p.remove(L, X); await p.remove(L, Y);
  eq(`${kind}: UPDATE to Absent allowed once the evidence is gone`,
    await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]))), null);
  eq(`${kind}: UPDATE to Excused allowed`,
    await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]))), null);
  eq(`${kind}: DELETE allowed`,
    await tryIt(() => as('admin', () => db.query(`DELETE FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]))), null);
  eq(`${kind}: INSERT of Absent allowed`,
    await tryIt(() => as('admin', () => db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Absent',$3)`, [L.id, Y.id, ADMIN]))), null);
}
{
  console.log('--- what "individual" means');
  const L = await lesson();
  const A = await kid('Five A'), B = await kid('Five B');
  await points(L, A, '09:30'); await points(L, B, '09:30', { at: new Date(Date.parse(hn(L.date, '09:30')) + 5000).toISOString() });
  eq('two children tapped 5 seconds apart: both are proof', [(await rowsFor(L, A, true)).length, (await rowsFor(L, B, true)).length], [1, 1]);

  const L2 = await lesson();
  const [C, D, E] = [await kid('Batch C'), await kid('Batch D'), await kid('Batch E')];
  const at = hn(L2.date, '09:30');
  await db.query(`INSERT INTO public.point_transactions(student_id, class_id, session_id, points, type, created_by, created_at, date, month)
    SELECT s, $2, $3, 5, 'participation', $4, $5, $6, $7 FROM unnest($1::uuid[]) s`, [[C.id, D.id, E.id], CA, L2.id, T1, at, L2.date, month(L2.date)]);
  eq('a batch of 3 in one statement is not proof', [(await rowsFor(L2, C, true)).length, (await rowsFor(L2, D, true)).length, (await rowsFor(L2, E, true)).length], [0, 0, 0]);
  eq('  it is shown as an indication', (await rowsFor(L2, C)).map((r) => `${r.kind}/${r.strength}`), ['batch_points/indication']);

  const L3 = await lesson();
  const F = await kid('Outside F');
  await points(L3, F, '12:00'); // session set, but 2 hours after the lesson ended
  eq('an award outside the lesson window (session set) is not proof and not an indication', await rowsFor(L3, F), []);
  await mark(L3, F, 'Present', T1);
  eq('  so Absent is allowed', await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L3.id, F.id]))), null);

  const L4 = await lesson();
  const G = await kid('Edge G');
  await points(L4, G, '08:50'); // 10 minutes before the start: inside the 15 minute lead
  eq('an award 10 minutes before the start is inside the window', (await rowsFor(L4, G, true)).length, 1);
  const L5 = await lesson();
  const H = await kid('Edge H');
  await points(L5, H, '10:20'); // 20 minutes after the end: inside the 30 minute tail
  await points(L5, H, '10:45', { points: 3 }); // outside
  eq('only awards inside the window count (5 of 5 + 3)', (await rowsFor(L5, H, true)).map((r) => r.summary), ['5 participation points at 10:20']);

  const L6 = await lesson();
  const I = await kid('Not proof I');
  await points(L6, I, '09:30', { by: null });                       // no person (streak-like)
  await points(L6, I, '09:31', { notes: 'Attendance streak bonus x' });
  await points(L6, I, '09:32', { type: 'homework' });
  await points(L6, I, '09:33', { points: 0 });
  await points(L6, I, '09:34', { points: -2 });
  eq('streak bonus, system rows, homework, zero and negative points are not proof', (await rowsFor(L6, I, true)).length, 0);
  const L7 = await lesson();
  const J = await kid('Speaker multi J'), J2 = await kid('Speaker multi J2');
  await speaker(L7, [J, J2], '09:30');
  await speaker(L7, [], '09:35', 'teacher');
  eq('a speaker mark naming two children is an indication only', [(await rowsFor(L7, J)).map((r) => `${r.kind}/${r.strength}`)], [['speaker_group_mark/indication']]);
  const L8 = await lesson();
  const K = await kid('Speaker late K');
  await speaker(L8, [K], '12:00');
  eq('a speaker mark outside the window is nothing', await rowsFor(L8, K), []);
}

// ================================================================== M2
console.log('=== M2 indications never lock and never mark ===');
const IND = {
  batch_points: async (L, k) => { const a = await kid('B2'), b = await kid('B3'); await points(L, k, '09:30'); await points(L, a, '09:30'); await points(L, b, '09:30'); },
  pixel_pal_points: async (L, k) => points(L, k, '09:30', { notes: '[Pixel Pal] Great work' }),
  transcript_award: async (L, k) => points(L, k, '09:30', { noSession: true, notes: 'In-class award (from transcript): "I like it"' }),
  window_points: async (L, k) => points(L, k, '09:30', { noSession: true }),
  skill_score: async (L, k) => db.query(`INSERT INTO public.skill_assessments(student_id, class_id, session_id, created_by, created_at, date) VALUES ($1,$2,$3,$4,$5,$6)`, [k.id, L.cls, L.id, T1, hn(L.date, '09:30'), L.date]),
  class_work: async (L, k) => db.query(`INSERT INTO public.student_work(student_id, class_id, status, uploaded_by, created_at) VALUES ($1,$2,'approved',$3,$4)`, [k.id, L.cls, T1, hn(L.date, '09:30')]),
  voice_confirmed: async (L, k) => {
    const t = (await one(`INSERT INTO public.class_transcripts(class_id, transcript_date) VALUES ($1,$2) RETURNING id`, [L.cls, L.date])).id;
    await db.query(`INSERT INTO public.transcript_speaker_metrics(transcript_id, class_id, student_id, utterance_count) VALUES ($1,$2,$3,5)`, [t, L.cls, k.id]);
  },
  voice_suggested: async (L, k) => {
    const t = (await one(`INSERT INTO public.class_transcripts(class_id, transcript_date) VALUES ($1,$2) RETURNING id`, [L.cls, L.date])).id;
    const m = (await one(`INSERT INTO public.transcript_speaker_metrics(transcript_id, class_id, student_id, utterance_count) VALUES ($1,$2,NULL,9) RETURNING id`, [t, L.cls])).id;
    await db.query(`INSERT INTO public.transcript_speaker_suggestions VALUES ($1,$2)`, [m, k.id]);
  },
  speaker_group_mark: async (L, k) => { const o = await kid('Other'); await speaker(L, [k, o], '09:30'); },
  homework_in_lesson: async (L, k) => {
    const h = (await one(`INSERT INTO public.homeworks(class_id, title) VALUES ($1,'HW') RETURNING id`, [L.cls])).id;
    await db.query(`INSERT INTO public.homework_submissions(homework_id, student_id, submitted_at) VALUES ($1,$2,$3)`, [h, k.id, hn(L.date, '09:40')]);
  },
};
const m2Dates = [];
for (const [kind, add] of Object.entries(IND)) {
  const L = await lesson();
  m2Dates.push(L.date);
  const X = await kid(`Ind ${kind}`), Y = await kid(`Ind2 ${kind}`);
  await mark(L, X, 'Present', T1);
  await add(L, X);
  const seen = await rowsFor(L, X);
  ok(`${kind}: shown as an indication, never as proof`, seen.some((r) => r.kind === kind && r.strength === 'indication') && seen.every((r) => r.strength === 'indication'), seen);
  eq(`${kind}: the proof lookup finds nothing`, (await rowsFor(L, X, true)).length, 0);
  eq(`${kind}: UPDATE to Absent allowed`, await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]))), null);
  eq(`${kind}: UPDATE to Excused allowed`, await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Excused' WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]))), null);
  eq(`${kind}: DELETE allowed`, await tryIt(() => as('admin', () => db.query(`DELETE FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [L.id, X.id]))), null);
  eq(`${kind}: INSERT of Absent allowed`, await tryIt(() => as('admin', () => db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Absent',$3)`, [L.id, X.id, ADMIN]))), null);
  eq(`${kind}: no refusal was logged`, (await refusals(L)).length, 0);
  await db.query(`DELETE FROM public.attendance WHERE session_id=$1`, [L.id]);
  // The gap list says "no mark, no proof" and names the indication; apply marks nobody.
  const g = (await gaps(L.date, L.date)).filter((r) => r.student_id === X.id);
  ok(`${kind}: gaps lists it as no_mark_no_proof and mentions the indication`, g.length === 1 && g[0].kind === 'no_mark_no_proof' && /indication exists/.test(g[0].summary), g);
  const ap = await apply(L.date, L.date, false);
  eq(`${kind}: apply inserts nothing`, ap.inserted, 0);
  eq(`${kind}: the child still has no row`, await row(L, X), undefined);
  // and the screen function sees the indication
  const fs = await as('teacher1', () => all(`SELECT * FROM public.attendance_proof_for_session($1)`, [L.id]));
  ok(`${kind}: the register screen is told: indication`, fs.some((r) => r.student_id === X.id && r.strength === 'indication' && r.kinds.includes(kind)), fs);
}
eq('a batch award does not appear as proof for any child of the batch', (await all(`SELECT 1 FROM public.attendance_proof_rows((SELECT array_agg(id) FROM public.sessions), NULL, true) WHERE kind='individual_points' AND session_id IN (SELECT session_id FROM public.point_transactions WHERE notes IS NULL GROUP BY session_id, created_at HAVING count(*) = 3)`)).length, 0);

// ================================================================== M3
console.log('=== M3 nobody signed in: skip, keep, log, never raise ===');
{
  const L = await lesson();
  const X = await kid('Sys X'), Y = await kid('Sys Y'), Z = await kid('Sys Z'), N = await kid('Sys New');
  for (const k of [X, Y, Z]) await mark(L, k, 'Present', T1);
  await points(L, X, '09:30'); await points(L, N, '09:40');
  const e1 = await tryIt(() => as('service', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1`, [L.id])));
  eq('service role, UPDATE of 3 rows to Absent: no error', e1, null);
  eq('  the child with proof keeps Present', (await row(L, X)).status, 'Present');
  eq('  the other two were marked Absent', [(await row(L, Y)).status, (await row(L, Z)).status], ['Absent', 'Absent']);
  eq('  one refusal logged', await refusals(L), [{ op: 'UPDATE', attempted_status: 'Absent', kept_status: 'Present' }]);
  const e2 = await tryIt(() => as('service', () => db.query(`DELETE FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [L.id, X.id])));
  eq('service role, DELETE: no error', e2, null);
  eq('  the row is still there', (await row(L, X)).status, 'Present');
  const e3 = await tryIt(() => as('service', () => db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Excused',$3)`, [L.id, N.id, T1])));
  eq('service role, INSERT of Excused: no error', e3, null);
  eq('  it is kept as Present, with no marked_by', [(await row(L, N)).status, (await row(L, N)).marked_by], ['Present', null]);
  eq('  logged as an insert', (await refusals(L)).map((r) => `${r.op}:${r.attempted_status}->${r.kept_status}`), ['UPDATE:Absent->Present', 'DELETE:null->Present', 'INSERT:Excused->Present']);
  // The SQL editor (no role claims at all, superuser) is also "nobody".
  await db.exec(`UPDATE public.attendance SET status='Excused' WHERE session_id='${L.id}' AND student_id='${X.id}'`);
  eq('the SQL editor: skipped too', (await row(L, X)).status, 'Present');
  // A row written by another trigger (depth 2): skipped, never raised, even for a signed-in admin.
  await db.exec(`CREATE TABLE public.zz_probe(session_id uuid, student_id uuid);
    CREATE FUNCTION public.zz_probe_fn() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      UPDATE public.attendance SET status='Absent' WHERE session_id=NEW.session_id AND student_id=NEW.student_id; RETURN NEW; END $$;
    CREATE TRIGGER zz_probe_t AFTER INSERT ON public.zz_probe FOR EACH ROW EXECUTE FUNCTION public.zz_probe_fn();
    GRANT ALL ON public.zz_probe TO authenticated;`);
  const e4 = await tryIt(() => as('admin', () => db.query(`INSERT INTO public.zz_probe VALUES ($1,$2)`, [L.id, X.id])));
  eq('a write from another trigger, even as admin: no error', e4, null);
  eq('  and the mark stays', (await row(L, X)).status, 'Present');
  eq('  logged (the same write tried again counts up, it does not add a row)', (await refusals(L)).length, 4);
}

// ================================================================== M4
console.log('=== M4 cancelled lesson, deleted lesson, bypass, fail-open ===');
{
  await db.exec(mig('20261027090000_cancelled_lesson_attendance_guard.sql'));
  const L = await lesson(CA, 'Held');
  const X = await kid('Cancel X');
  await mark(L, X, 'Present', T1); await points(L, X, '09:30');
  const eC = await tryIt(() => as('admin', () => db.query(`UPDATE public.sessions SET status='Canceled' WHERE id=$1`, [L.id])));
  eq('cancelling a lesson where a child has proof is not blocked', eC, null);
  eq('  the child is Excused by the cancellation', (await row(L, X)).status, 'Excused');
  eq('  and the cancelled lesson is not guarded for a person either (Excused again)',
    await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Excused' WHERE session_id=$1`, [L.id]))), null);
  eq('  a DELETE on the cancelled lesson is allowed', await tryIt(() => as('admin', () => db.query(`DELETE FROM public.attendance WHERE session_id=$1`, [L.id]))), null);
  const gc = (await gaps(L.date, L.date)).filter((r) => r.student_id === X.id);
  eq('  gaps lists proof_on_cancelled', gc.map((r) => r.kind), ['proof_on_cancelled']);
  eq('  and apply does not mark it', (await apply(L.date, L.date, false)).inserted, 0);

  const L2 = await lesson();
  const Y = await kid('Delete Y');
  await mark(L2, Y, 'Present', T1); await points(L2, Y, '09:30');
  eq('deleting a lesson (the attendance cascade) is not blocked, even as admin',
    await tryIt(() => as('admin', () => db.query(`DELETE FROM public.sessions WHERE id=$1`, [L2.id]))), null);
  eq('  the marks went with it', (await one(`SELECT count(*)::int n FROM public.attendance WHERE session_id=$1`, [L2.id])).n, 0);

  const L3 = await lesson();
  const Z = await kid('Flag Z');
  await mark(L3, Z, 'Present', T1); await points(L3, Z, '09:30');
  await db.exec(`SET hec.attendance_proof_bypass = 'on'`);
  eq('hec.attendance_proof_bypass: the change goes through', await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1`, [L3.id]))), null);
  await db.exec(`SET hec.attendance_proof_bypass = 'off'`);
  await db.query(`UPDATE public.attendance SET status='Present' WHERE session_id=$1`, [L3.id]);
  await db.exec(`SET hec.attendance_restore = 'on'`);
  eq('hec.attendance_restore (admin_merge_students): a delete goes through', await tryIt(() => as('admin', () => db.query(`DELETE FROM public.attendance WHERE session_id=$1`, [L3.id]))), null);
  await db.exec(`SET hec.attendance_restore = 'off'`);

  // Fail open: the lookup itself throws.
  const L4 = await lesson();
  const W = await kid('Fail W');
  await mark(L4, W, 'Present', T1); await points(L4, W, '09:30');
  await db.exec(`CREATE OR REPLACE FUNCTION public.attendance_proof_rows(p_session_ids uuid[], p_student_id uuid DEFAULT NULL, p_proof_only boolean DEFAULT false)
    RETURNS TABLE (session_id uuid, student_id uuid, kind text, strength text, at timestamptz, summary text)
    LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'the proof lookup is broken'; END $$;`);
  eq('the proof lookup throws: a teacher can still mark Absent', await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1`, [L4.id]))), null);
  eq('  and it saved', (await row(L4, W)).status, 'Absent');
  await db.exec(MIG); // put the real function back
  await db.query(`UPDATE public.attendance SET status='Present' WHERE session_id=$1`, [L4.id]);
  const back = await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1`, [L4.id])));
  ok('re-running the migration restores the guard', back && back.message.startsWith('ATTENDANCE_PROOF:'), back);
}

// ================================================================== M6
console.log('=== M6 the live modify_enrollment_transfer over a lesson with proof ===');
{
  await db.exec(mig('20261106100001_date_aware_enrollment_changes.sql'));
  const E = hanoiToday;                       // effective date: today
  const before = await lesson(CA, 'Held', { date: dayAgo(1) });
  const after2 = await lesson(CA, 'Scheduled', { date: new Date(Date.parse(`${hanoiToday}T12:00:00Z`) + 3 * 86400000).toISOString().slice(0, 10) });
  const T = await kid('Transfer T'), C = await kid('Transfer Control');
  for (const L of [before, after2]) { await mark(L, T, 'Present', null); await mark(L, C, 'Present', null); }
  await points(before, T, '09:30');           // proof in a lesson BEFORE the effective date
  await points(after2, T, '09:30');           // and one AFTER it
  const res = await tryIt(() => as('admin', () => db.query(`SELECT public.modify_enrollment_transfer($1,$2,$3,$4)`, [T.id, CA, CB, E])));
  // The transfer ends the old enrolment first and only then removes placeholder marks from the
  // effective date on. By then the child is not enrolled in Class A for the later lesson, so its
  // proof does not lock (the review's F5): the transfer goes through. The lesson BEFORE the
  // effective date is not touched by the live function at all.
  eq('a transfer is not blocked by proof for a lesson the child no longer belongs to', res, null);
  eq('  the lesson before the effective date keeps its mark', (await row(before, T)).status, 'Present');
  eq('  the placeholder after the effective date is removed (as before)', await row(after2, T), undefined);
  eq('  the old enrolment ended the day before', (await one(`SELECT end_date::text d FROM public.enrollments WHERE student_id=$1 AND class_id=$2`, [T.id, CA])).d, dayAgo(1));
  // A pause (Excused over a window) while still enrolled IS refused, nothing half-done:
  const P = await kid('Pause P');
  const Lp = await lesson(); await mark(Lp, P, 'Present', null); await points(Lp, P, '09:30');
  const e2 = await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Excused', marked_by=$2 WHERE session_id=$1`, [Lp.id, ADMIN])));
  ok('an Excused sweep over a lesson the enrolled child has proof for is refused', e2 && e2.message.startsWith('ATTENDANCE_PROOF:'), e2);
  eq('  and the mark is unchanged', (await row(Lp, P)).status, 'Present');
}

// ================================================================== M7
console.log('=== M7 apply: never a person\'s mark, never a child who was not enrolled ===');
{
  const L = await lesson();
  const P = await kid('Person P'), S = await kid('System S'), NE = await kid('Not enrolled', null), Dd = await kid('Day D', CA, { days: [(dow(L.date) + 3) % 7] }), Ok = await kid('Fine Ok');
  await mark(L, P, 'Absent', T1);             // a person's Absent
  await mark(L, S, 'Excused', null);          // a system Excused (no person)
  for (const k of [P, S, NE, Dd, Ok]) await points(L, k, k === P ? '09:30' : k === S ? '09:35' : k === NE ? '09:40' : k === Dd ? '09:45' : '09:50');
  const g = await gaps(L.date, L.date);
  const kindOf = (k) => g.filter((r) => r.student_id === k.id).map((r) => r.kind);
  eq('person Absent + proof: proof_contradicts_person', kindOf(P), ['proof_contradicts_person']);
  eq('system Excused + proof: proof_contradicts_system', kindOf(S), ['proof_contradicts_system']);
  eq('not enrolled: proof_not_enrolled', kindOf(NE), ['proof_not_enrolled']);
  eq('enrolled on other weekdays only: proof_not_enrolled', kindOf(Dd), ['proof_not_enrolled']);
  eq('enrolled with proof and no mark: proof_no_mark', kindOf(Ok), ['proof_no_mark']);
  eq('person flag is reported', g.find((r) => r.student_id === P.id).marked_by_person, true);
  const r = await apply(L.date, L.date, false);
  eq('apply: 1 inserted, 1 corrected', [r.inserted, r.corrected], [1, 1]);
  eq('  the person\'s Absent is untouched', await row(L, P), { status: 'Absent', marked_by: T1, notes: null });
  eq('  the system Excused became Present with a note', [(await row(L, S)).status, (await row(L, S)).notes.startsWith('Auto-corrected from evidence: ')], ['Present', true]);
  eq('  nothing for the child who was not enrolled', await row(L, NE), undefined);
  eq('  nothing on a day outside allowed_days', await row(L, Dd), undefined);
  eq('  the enrolled child was marked Present', (await row(L, Ok)).status, 'Present');
  eq('  the contradiction and the two not enrolled stay on the list for an admin', r.rows.filter((x) => x.action === 'left' && x.kind.startsWith('proof_')).map((x) => x.kind).sort(), ['proof_contradicts_person', 'proof_not_enrolled', 'proof_not_enrolled']);
  eq('  a second run changes nothing', ((x) => [x.inserted, x.corrected])(await apply(L.date, L.date, false)), [0, 0]);
  // A lesson that has not happened yet is never listed.
  const Fut = await lesson(CA, 'Scheduled', { date: new Date(Date.parse(`${hanoiToday}T12:00:00Z`) + 5 * 86400000).toISOString().slice(0, 10) });
  const F2 = await kid('Future F'); await points(Fut, F2, '09:30');
  eq('a lesson that has not happened yet is not listed', (await gaps(Fut.date, Fut.date)).length, 0);
}

// ================================================================== M8
console.log('=== M8 who may call what ===');
{
  const L = await lesson();
  const X = await kid('Auth X'); await points(L, X, '09:30');
  const call = (who, sid) => as(who, () => all(`SELECT * FROM public.attendance_proof_for_session($1)`, [sid]));
  eq('admin sees the proof', (await call('admin', L.id)).map((r) => [r.student_id, r.strength, r.kinds]), [[X.id, 'proof', ['individual_points']]]);
  eq('the class\'s teacher sees it', (await call('teacher1', L.id)).length, 1);
  eq('another class\'s teacher sees nothing', (await call('teacher2', L.id)).length, 0);
  eq('a family account sees nothing', (await call('family', L.id)).length, 0);
  for (const [fn, q] of [['attendance_evidence_gaps', `SELECT * FROM public.attendance_evidence_gaps($1::date,$1::date)`], ['attendance_apply_evidence', `SELECT public.attendance_apply_evidence($1::date,$1::date,true)`]]) {
    for (const who of ['teacher1', 'family']) {
      const e = await tryIt(() => as(who, () => db.query(q, [L.date])));
      ok(`${fn} refuses ${who}`, e && e.code === '42501', e);
    }
    eq(`${fn} works for an admin`, await tryIt(() => as('admin', () => db.query(q, [L.date]))), null);
    eq(`${fn} works for the service role`, await tryIt(() => as('service', () => db.query(q, [L.date]))), null);
    eq(`${fn} works with no role at all (the hourly job)`, await tryIt(() => db.query(q, [L.date])), null);
  }
  const direct = await tryIt(() => as('teacher1', () => db.query(`SELECT * FROM public.attendance_proof_rows(ARRAY[$1::uuid], NULL, false)`, [L.id])));
  ok('the one rule is not callable by a signed-in person', direct && /permission denied/.test(direct.message), direct);
  const direct2 = await tryIt(() => as('admin', () => db.query(`SELECT public.attendance_has_proof($1,$2)`, [L.id, X.id])));
  ok('  nor attendance_has_proof', direct2 && /permission denied/.test(direct2.message), direct2);
  eq('  the service role may (mark-attendance asks it)', (await as('service', () => one(`SELECT public.attendance_has_proof($1,$2) AS p`, [L.id, X.id]))).p, true);
  const logRead = async (who) => as(who, () => all(`SELECT 1 FROM public.attendance_proof_refusals LIMIT 1`));
  ok('the refusal log is readable by an admin and not by a teacher', (await logRead('admin')).length === 1 && (await logRead('teacher1')).length === 0);
  ok('the run log is readable by an admin and not by a teacher', (await as('admin', () => all(`SELECT 1 FROM public.attendance_evidence_runs`))).length > 0
    && (await as('teacher1', () => all(`SELECT 1 FROM public.attendance_evidence_runs`))).length === 0);
  const w = await tryIt(() => as('admin', () => db.query(`INSERT INTO public.attendance_proof_refusals(session_id, student_id, op) VALUES ($1,$2,'x')`, [L.id, X.id])));
  ok('nobody signed in can write the logs', w && /permission denied/.test(w.message), w);
}

// ================================================================== M9 (Stars sync)
console.log('=== M9 the Stars sync: Pixel Pal says Absent for a child with proof ===');
{
  const MIGS = ['20261023090000_homework_grading_integrity.sql', '20261023100000_stars_sync_foundation.sql', '20261027090000_cancelled_lesson_attendance_guard.sql',
    '20261027100000_stars_sync_engine.sql', '20261028090000_stars_sync_review_fixes.sql'];
  const src = readFileSync(join(here, 'stars-sync-engine.test.mjs'), 'utf8');
  const pm = /const PRELUDE = `([\s\S]*?)`;\r?\n\r?\nconst db/.exec(src);
  if (!pm || !MIGS.every((f) => existsSync(join(repo, 'supabase', 'migrations', f)))) {
    ok('the stars prelude and migrations are available', false, 'not found');
  } else {
    const sdb = new PGlite();
    await sdb.exec(pm[1]);
    for (const f of MIGS) await sdb.exec(mig(f));
    await sdb.exec(`ALTER TABLE public.enrollments ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()`); // production has it
    await sdb.exec(MIG);
    const q1 = async (q, p) => (await sdb.query(q, p)).rows[0];
    const ADM = U(91), MAI = U(92);
    await sdb.query(`INSERT INTO auth.users VALUES ($1),($2)`, [ADM, MAI]);
    await sdb.query(`INSERT INTO public.user_roles VALUES ($1,'teacher'),($2,'admin')`, [MAI, ADM]);
    const tid = (await q1(`INSERT INTO public.teachers(full_name,user_id) VALUES ('Mai',$1) RETURNING id`, [MAI])).id;
    const cid = (await q1(`INSERT INTO public.classes(name, default_teacher_id) VALUES ('Stars',$1) RETURNING id`, [tid])).id;
    const mk = async (n) => {
      const id = (await q1(`INSERT INTO public.students(full_name) VALUES ($1) RETURNING id`, [n])).id;
      await sdb.query(`INSERT INTO public.enrollments(student_id,class_id,start_date) VALUES ($1,$2,'2026-09-01')`, [id, cid]);
      return id;
    };
    const APPLE = await mk('Apple'), JOHNNY = await mk('Johnny');
    const SID = (await q1(`INSERT INTO public.sessions(class_id,teacher_id,date,start_time,end_time,status) VALUES ($1,$2,'2026-10-27','09:00','09:50','Scheduled') RETURNING id`, [cid, tid])).id;
    await sdb.query(`INSERT INTO public.attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,'Present',NULL),($1,$3,'Present',NULL)`, [SID, APPLE, JOHNNY]);
    // Apple: an individual award at 09:30 Hanoi, by the teacher, saved against the lesson.
    await sdb.query(`INSERT INTO public.point_transactions(student_id,class_id,session_id,points,type,created_by,created_at,date,month) VALUES ($1,$2,$3,5,'participation',$4,'2026-10-27T02:30:00Z','2026-10-27','2026-10')`, [APPLE, cid, SID, MAI]);
    await sdb.query(`UPDATE public.stars_sync_connection SET default_teacher_id=$1, enabled=true, sync_from='2026-10-01'`, [tid]);
    await sdb.query(`INSERT INTO public.stars_class_map(stars_class_id,class_id) VALUES ('19',$1)`, [cid]);
    await sdb.query(`INSERT INTO public.stars_student_map(stars_student_id,student_id) VALUES ('88',$1),('89',$2)`, [APPLE, JOHNNY]);
    const NOW = '2026-10-27T03:00:00Z';
    const idn = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const ev = (seq, ref) => ({ seq, event_id: idn(seq), occurred_at: NOW, kind: 'attendance', class_ref: '19', student_ref: ref, lesson_date: '2026-10-27', payload: { status: 'Absent' } });
    await sdb.exec('SET ROLE service_role');
    let err = null;
    try { await q1(`SELECT public.stars_sync_apply_page($1::jsonb, 2::bigint, $2::timestamptz) AS r`, [JSON.stringify([ev(1, '88'), ev(2, '89')]), NOW]); }
    catch (e) { err = e.message; }
    await sdb.exec('RESET ROLE');
    eq('the page completes: no error from the guard', err, null);
    const st = async (id) => (await q1(`SELECT status FROM public.attendance WHERE session_id=$1 AND student_id=$2`, [SID, id])).status;
    eq('Apple (has proof) stays Present', await st(APPLE), 'Present');
    eq('Johnny (no proof) is marked Absent as before', await st(JOHNNY), 'Absent');
    eq('one refusal is logged for Apple', (await q1(`SELECT count(*)::int n FROM public.attendance_proof_refusals WHERE student_id=$1`, [APPLE])).n, 1);
    eq('the cursor moved: the page is not stuck', Number((await q1(`SELECT last_seq FROM public.stars_sync_cursor`)).last_seq), 2);
    const outcomes = (await sdb.query(`SELECT event_id, outcome FROM public.stars_sync_events ORDER BY seq`)).rows;
    ok('both records have an outcome', outcomes.length === 2 && outcomes.every((o) => o.outcome), outcomes);
    console.log(`    (outcomes: ${outcomes.map((o) => o.outcome).join(', ')})`);
  }
}

// ================================================================== R2 (review round)
console.log('=== R2 review: upsert of a whole class, staff only, enrolled only, window, runs ===');
{
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmt = (d) => `${Number(d.slice(8, 10))} ${monthNames[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
  const refs = async (L, k) => one(`SELECT count(*)::int n, max(attempts)::int attempts FROM public.attendance_proof_refusals WHERE session_id=$1 AND student_id=$2`, [L.id, k.id]);

  // -- a whole class saved with INSERT ... ON CONFLICT DO UPDATE by the service role
  const L = await lesson();
  const [A, B, C] = [await kid('Up A'), await kid('Up B'), await kid('Up C')];
  for (const k of [A, B, C]) await mark(L, k, 'Present', T1);
  await points(L, A, '09:30');
  const upsert = () => as('service', () => db.query(
    `INSERT INTO public.attendance(session_id, student_id, status, marked_by) SELECT $1, s, 'Absent', $2 FROM unnest($3::uuid[]) s
     ON CONFLICT (session_id, student_id) DO UPDATE SET status = EXCLUDED.status`, [L.id, T1, [A.id, B.id, C.id]]));
  eq('upsert of the class as the service role: no error', await tryIt(upsert), null);
  eq('  the child with proof keeps Present, the others save', [(await row(L, A)).status, (await row(L, B)).status, (await row(L, C)).status], ['Present', 'Absent', 'Absent']);
  eq('  one refusal row, attempted once', await refs(L, A), { n: 1, attempts: 1 });
  await db.query(`UPDATE public.attendance SET status='Present' WHERE session_id=$1`, [L.id]);
  await tryIt(upsert);
  eq('  the same save again: still one row, attempts 2', await refs(L, A), { n: 1, attempts: 2 });
  const gk = (await gaps(L.date, L.date)).filter((r) => r.kind === 'write_kept_by_proof');
  ok('  gaps shows it as write_kept_by_proof, with the count', gk.length === 1 && gk[0].student_id === A.id && /Absent \(update\) was tried 2 time\(s\)/.test(gk[0].summary), gk);
  const ap = await apply(L.date, L.date, false);
  eq('  apply leaves it for the admin and changes nothing', [ap.inserted, ap.corrected, (await row(L, A)).status], [0, 0, 'Present']);

  // -- a teacher on their own JWT gets the raise
  const eT = await tryIt(() => as('teacher1', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L.id, A.id])));
  ok('a teacher on their own JWT is refused with ATTENDANCE_PROOF', eT && eT.message.startsWith('ATTENDANCE_PROOF:'), eT);
  // -- the message names the class and the date
  ok('  and it names the lesson: class and date', eT.message.includes(`${A.name} was in the Class A lesson on ${fmt(L.date)}: 5 participation points at 09:30.`), eT.message);

  // -- who counts
  const L2 = await lesson();
  const [P1, P2, S1, S2, F1] = [await kid('Two 1'), await kid('Two 2'), await kid('Staff 1'), await kid('Staff 2'), await kid('Family F')];
  const at = hn(L2.date, '09:30');
  await points(L2, P1, '09:30', { at }); await points(L2, P2, '09:30', { at });
  eq('a batch of exactly 2 is not proof', [(await rowsFor(L2, P1, true)).length, (await rowsFor(L2, P2, true)).length], [0, 0]);
  const at2 = hn(L2.date, '09:40');
  await points(L2, S1, '09:40', { at: at2, by: T1 }); await points(L2, S2, '09:40', { at: at2, by: T2 });
  eq('two different staff at the same instant are each proof', [(await rowsFor(L2, S1, true)).length, (await rowsFor(L2, S2, true)).length], [1, 1]);
  await points(L2, F1, '09:35', { by: FAM });
  eq('an award made by a non-staff account is not proof', (await rowsFor(L2, F1, true)).length, 0);

  // -- a child who is not enrolled that day is never locked or rewritten
  const L3 = await lesson();
  const NE = await kid('Not enrolled NE', null), NE2 = await kid('Not enrolled NE2', null);
  const WD = await kid('Wrong weekday', CA, { days: [(dow(L3.date) + 2) % 7] });
  for (const k of [NE, WD]) { await mark(L3, k, 'Present', T1); await points(L3, k, '09:30'); }
  await points(L3, NE2, '09:30');
  for (const k of [NE, WD]) {
    eq(`${k.name}: Absent is allowed (proof does not lock a child who was not enrolled)`, await tryIt(() => as('admin', () => db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L3.id, k.id]))), null);
  }
  await as('service', () => db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Excused',$3)`, [L3.id, NE2.id, T1]));
  eq('a service INSERT of Excused for a not-enrolled child with proof is kept as written', (await row(L3, NE2)).status, 'Excused');
  eq('  and nothing was logged for them', (await refs(L3, NE2)).n, 0);
  eq('attendance_has_proof says no for a child who was not enrolled', (await as('service', () => one(`SELECT public.attendance_has_proof($1,$2) AS p`, [L3.id, NE.id]))).p, false);

  // -- the rewritten INSERT does not claim a teacher marked the child
  const L4 = await lesson();
  const R = await kid('Rewritten R'); await points(L4, R, '09:30');
  await as('service', () => db.query(`INSERT INTO public.attendance(session_id, student_id, status, marked_by) VALUES ($1,$2,'Absent',$3)`, [L4.id, R.id, T1]));
  const rr = await row(L4, R);
  eq('a service INSERT rewritten to Present: no marked_by, auto-mark note', [rr.status, rr.marked_by, rr.notes], ['Present', null, 'Auto-marked from evidence: 5 participation points at 09:30']);

  // -- RAISE NOTICE for the SQL editor
  const notices = [];
  await db.query(`UPDATE public.attendance SET status='Absent' WHERE session_id=$1 AND student_id=$2`, [L.id, A.id], { onNotice: (n) => notices.push(n.message) });
  ok('the skip path says so with a NOTICE (visible in the SQL editor)', notices.some((m) => m.startsWith('ATTENDANCE_PROOF (change not made):') && m.includes(A.name)), notices);

  // -- a lesson with end_time = start_time gets no extra day
  const Z = await kid('Zero length');
  const zid = (await one(`INSERT INTO public.sessions(class_id, teacher_id, date, start_time, end_time, status) VALUES ($1,$2,$3,'09:00','09:00','Held') RETURNING id`, [CA, TEACH1, dayAgo(++dayCounter)])).id;
  const LZ = { id: zid, date: dayAgo(dayCounter), cls: CA };
  await points(LZ, Z, '09:20');
  await points(LZ, Z, '09:10', { at: new Date(Date.parse(hn(LZ.date, '09:10')) + 86400000).toISOString(), points: 7 });
  eq('end = start: only the award inside the window counts, not one the next day', (await rowsFor(LZ, Z, true)).map((r) => r.summary), ['5 participation points at 09:20']);

  // -- the hourly window (the later of today - 14 and the first day of the billing window)
  const w = async (iso) => { const x = await one(`SELECT from_date::text f, to_date::text t FROM public.attendance_evidence_window($1::timestamptz)`, [iso]); return [x.f, x.t]; };
  eq('window, day 3 of a month: last month is still repriced, 14 days back', await w('2026-11-03T05:00:00Z'), ['2026-10-20', '2026-11-03']);
  eq('window, day 10: stops at the 1st of this month', await w('2026-11-10T05:00:00Z'), ['2026-11-01', '2026-11-10']);
  eq('window, day 20: 14 days back is inside the month', await w('2026-11-20T05:00:00Z'), ['2026-11-06', '2026-11-20']);
  eq('window uses Hanoi dates (20:00 UTC on the 5th is the 6th in Hanoi)', await w('2026-11-05T20:00:00Z'), ['2026-11-01', '2026-11-06']);
  eq('window, day 1 of January', await w('2027-01-01T05:00:00Z'), ['2026-12-18', '2027-01-01']);

  // -- a run is logged only when something changed or failed (the hourly job)
  const runs = async () => (await one(`SELECT count(*)::int n FROM public.attendance_evidence_runs`)).n;
  const quiet = dayAgo(300);
  const r0 = await runs();
  await apply(quiet, quiet, false);
  eq('a quiet hourly run writes no run row', await runs(), r0);
  const L5 = await lesson(); const Q = await kid('Run Q'); await points(L5, Q, '09:30');
  const ch = await apply(L5.date, L5.date, false);
  eq('a run that changed something is logged, with its months', [ch.inserted, await runs(), (await one(`SELECT detail->'affected_months' m FROM public.attendance_evidence_runs ORDER BY ran_at DESC, id LIMIT 1`)).m.length], [1, r0 + 1, 1]);
  const failTry = await one(`SELECT jsonb_typeof(detail->'failures') t FROM public.attendance_evidence_runs ORDER BY ran_at DESC LIMIT 1`);
  eq('  the run row keeps a failures list', failTry.t, 'array');
}

// ================================================================== M10 (the read-only check)
console.log('=== M10 scripts/CHECK-attendance-proof.sql applies the same rule ===');
{
  const checkSql = readFileSync(join(repo, 'scripts', 'CHECK-attendance-proof.sql'), 'utf8');
  ok('the check is a single SELECT: it never writes', !/\b(insert|update|delete|drop|create|alter|truncate)\b\s/i.test(checkSql.replace(/--.*$/gm, '')));
  const res = await all(checkSql);
  const fromFn = await all(`
    SELECT r.kind, r.strength, count(*)::int AS n
      FROM public.attendance_proof_rows(
             (SELECT array_agg(s.id) FROM public.sessions s
               WHERE ((s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh') < now()), NULL, false) r
     GROUP BY r.kind, r.strength`);
  const a = Object.fromEntries(res.filter((r) => !r.kind.startsWith('*')).map((r) => [r.kind, Number(r.child_lessons)]));
  const b = Object.fromEntries(fromFn.map((r) => [r.kind, r.n]));
  const sortObj = (o) => Object.fromEntries(Object.entries(o).sort());
  eq('the check and the function find the same child-lessons for every kind', sortObj(a), sortObj(b));
  const anyProof = res.find((r) => r.kind === '* any proof');
  ok('the "any proof" row is there and counts each pair once', anyProof && Number(anyProof.child_lessons) <= (a.individual_points ?? 0) + (a.speaker_mark ?? 0), anyProof);
  const ip = res.find((r) => r.kind === 'individual_points');
  ok('individual_points row has the columns the owner compares', ip && ['on_cancelled', 'not_enrolled', 'no_mark', 'present_late', 'absent', 'excused', 'contradicts_person', 'contradicts_system'].every((c) => c in ip), ip);
}

console.log(`
${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
