// manage-session and bulk-cancel-sessions, end to end, with no Deno and no
// Supabase: the REAL functions are bundled with esbuild (remote imports
// stubbed), Deno.serve is captured, and their Supabase clients are a small
// stand-in for PostgREST backed by pglite loaded with the REAL migrations
// (audit trigger, cancelled-lesson guard, D1 evidence, D2 guard). So the
// real RPCs, triggers and RLS decide; only calculate-tuition and
// calculate-payroll are scripted (functions.invoke).
//
//   node scripts/pgtest/session-guard-functions.test.mjs \
//     supabase/migrations/20261009130000_audit_every_admin_action.sql \
//     supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql \
//     supabase/migrations/20261112090000_session_held_evidence.sql \
//     supabase/migrations/20261112091000_session_cancel_guard.sql
//
// The stand-in records which client made every write and every RPC
// ("service" = service-role key, "user" = a client built from the caller's
// Authorization header), so the suite can assert that no person-initiated
// change to `sessions` used the service key (D-review-2 F-2).
import { PGlite } from '@electric-sql/pglite';
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
  value ? pass++ : fail++;
};
async function section(name, fn) {
  try { await fn(); }
  catch (e) { ok(`section "${name}" ran to the end without an unexpected error`, false, { message: e?.message, stack: e?.stack?.split('\n').slice(0, 3) }); }
}

const files = process.argv.slice(2);
if (files.length !== 4) {
  console.error('usage: session-guard-functions.test.mjs <20261009130000> <20261027090000> <20261112090000> <20261112091000>');
  process.exit(2);
}
const sqlOf = (f) => readFileSync(f, 'utf8');

// Same prelude as session-cancel-guard.test.mjs (real columns from
// src/integrations/supabase/types.ts for what the migrations read).
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.jwt_role', true), '') $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles(user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  CREATE TABLE public.classes(id uuid PRIMARY KEY, default_teacher_user uuid);
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.classes c
                       WHERE c.id = is_teacher_of_class.class_id
                         AND c.default_teacher_user = is_teacher_of_class.user_id) $f$;
  CREATE TABLE public.sessions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Scheduled', teacher_id uuid NOT NULL,
    notes text, rate_override_vnd integer, is_manual boolean NOT NULL DEFAULT false, manual_reason text,
    canceled_reason text, canceled_by uuid, canceled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid);
  CREATE UNIQUE INDEX sessions_class_date_time_unique ON public.sessions (class_id, date, start_time) WHERE status <> 'Canceled';
  CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS
    $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$;
  CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  CREATE OR REPLACE FUNCTION public.validate_session_status_on_change()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NEW.status = 'Held' AND (now() AT TIME ZONE 'Asia/Bangkok') <
       ((NEW.date::text || ' ' || NEW.start_time::text)::timestamp AT TIME ZONE 'Asia/Bangkok') + interval '5 minutes' THEN
      NEW.status := 'Scheduled';
    END IF;
    RETURN NEW;
  END;
  $$;
  CREATE TRIGGER validate_session_status_trigger BEFORE INSERT OR UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.validate_session_status_on_change();
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
    teacher_id uuid, attended boolean NOT NULL DEFAULT true, absence_note text,
    created_at timestamptz NOT NULL DEFAULT now(), created_by uuid);
  CREATE TABLE public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    status text NOT NULL DEFAULT 'issued', base_amount integer NOT NULL DEFAULT 0,
    discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer, confirmation_status text, confirmed_at timestamptz,
    tuition_frozen boolean NOT NULL DEFAULT false, carry_in_credit integer, carry_in_debt integer,
    carry_out_credit integer, carry_out_debt integer, class_breakdown jsonb,
    UNIQUE(student_id, month));
  CREATE OR REPLACE FUNCTION public.payroll_month_is_locked(p_month text)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
    SELECT EXISTS (SELECT 1 FROM public.payroll_periods
                    WHERE month = substring(p_month from 1 for 7) AND status = 'locked');
  $fn$;
  CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can manage all sessions" ON public.sessions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Teachers read own sessions" ON public.sessions
    FOR SELECT USING (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "Service role sessions" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
`;

async function makeDb({ guard = true } = {}) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  await d.exec(sqlOf(files[0]));
  await d.exec(sqlOf(files[1]));
  await d.exec(sqlOf(files[2]));
  if (guard) await d.exec(sqlOf(files[3]));
  return d;
}

let db = await makeDb();

async function as(uid, jwtRole, dbRole, sql, params = []) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('test.uid', $1, false), set_config('test.jwt_role', $2, false)`, [uid ?? '', jwtRole ?? '']);
  if (dbRole) await db.exec(`SET ROLE ${dbRole}`);
  try { return await db.query(sql, params); }
  finally {
    await db.exec('RESET ROLE');
    await db.query(`SELECT set_config('test.uid', '', false), set_config('test.jwt_role', '', false)`);
  }
}
const asSuper = (sql, params) => as(null, '', null, sql, params);

// ------------------------------------------------- stand-in for PostgREST
const SERVICE_KEY = 'service-role-key';
const ANON_KEY = 'anon-key';
const jwts = new Map();                 // bearer token -> user id
const log = { writes: [], rpcs: [], invokes: [], reads: [] };
const tuitionFail = new Set();          // student ids whose calculate-tuition fails
const siblingUnresolved = new Set();    // student ids whose calculate-tuition answers siblingUnresolved
const rpcThrows = new Set();            // rpc names whose call throws (a network error, not a returned error)
// When on, the calculate-tuition stand-in does what the real one does to the
// bill (calculate-tuition/index.ts:575-607): upsert it with status 'issued'
// and confirmation_status auto_approved, creating it when there is none,
// keeping a frozen bill. Used by the D-review-3 F-1 sections.
let tuitionUpserts = false;
const pgErr = (e) => ({ code: e.code, message: e.message, details: e.detail ?? null });

function fakeClient(key, opts) {
  const header = opts?.global?.headers?.Authorization ?? null;
  const who = header ? 'user' : key === SERVICE_KEY ? 'service' : 'anon';
  const uid = header ? jwts.get(header.replace(/^Bearer\s+/i, '')) ?? null : null;
  const run = (sql, params) => who === 'service' ? as(null, 'service_role', 'service_role', sql, params)
    : who === 'user' ? as(uid, 'authenticated', 'authenticated', sql, params)
    : as(null, 'anon', 'anon', sql, params);

  const from = (table) => {
    const q = { table, op: 'select', cols: '*', values: null, filters: [], one: null, ret: false };
    const where = (params) => q.filters.length === 0 ? '' : ' WHERE ' + q.filters.map((f) => {
      params.push(f.v);
      const n = `$${params.length}`;
      if (f.op === 'in') return `${f.c}::text = ANY(${n}::text[])`;
      return `${f.c} ${({ eq: '=', neq: '<>', gte: '>=', lte: '<=' })[f.op]} ${n}`;
    }).join(' AND ');
    const val = (v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
    const exec = async () => {
      const params = [];
      let sql;
      if (q.op === 'select') {
        sql = `SELECT to_jsonb(t) j FROM (SELECT ${q.cols} FROM public.${table}${where(params)}) t`;
      } else if (q.op === 'update') {
        const ks = Object.keys(q.values).filter((k) => q.values[k] !== undefined);
        const sets = ks.map((k) => { params.push(val(q.values[k])); return `${k} = $${params.length}`; });
        sql = `UPDATE public.${table} t SET ${sets.join(', ')}${where(params)} RETURNING to_jsonb(t) j`;
      } else if (q.op === 'delete') {
        sql = `DELETE FROM public.${table} t${where(params)} RETURNING to_jsonb(t) j`;
      } else {
        const ks = Object.keys(q.values).filter((k) => q.values[k] !== undefined);
        const ph = ks.map((k) => { params.push(val(q.values[k])); return `$${params.length}`; });
        sql = `INSERT INTO public.${table} AS t (${ks.join(', ')}) VALUES (${ph.join(', ')}) RETURNING to_jsonb(t) j`;
      }
      if (q.op !== 'select') log.writes.push({ table, op: q.op, who, uid });
      else log.reads.push({ table, who });
      try {
        const rows = (await run(sql, params)).rows.map((r) => r.j);
        if (q.one === 'single') {
          if (rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'not one row' } };
          return { data: rows[0], error: null };
        }
        if (q.one === 'maybe') return { data: rows[0] ?? null, error: null };
        return { data: q.op === 'select' || q.ret ? rows : null, error: null };
      } catch (e) {
        if (e.code === '42P01') return { data: null, error: { code: 'PGRST205', message: e.message } };
        return { data: null, error: pgErr(e) };
      }
    };
    const b = {
      select(cols = '*') { if (q.op !== 'select') q.ret = true; else q.cols = cols.replace(/\s+/g, ' '); return b; },
      update(v) { q.op = 'update'; q.values = v; return b; },
      delete() { q.op = 'delete'; return b; },
      insert(v) { q.op = 'insert'; q.values = v; return b; },
      eq(c, v) { q.filters.push({ op: 'eq', c, v }); return b; },
      neq(c, v) { q.filters.push({ op: 'neq', c, v }); return b; },
      gte(c, v) { q.filters.push({ op: 'gte', c, v }); return b; },
      lte(c, v) { q.filters.push({ op: 'lte', c, v }); return b; },
      in(c, v) { q.filters.push({ op: 'in', c, v }); return b; },
      order() { return b; },
      limit() { return b; },
      single() { q.one = 'single'; return b; },
      maybeSingle() { q.one = 'maybe'; return b; },
      then(res, rej) { return exec().then(res, rej); },
    };
    return b;
  };

  return {
    from,
    auth: {
      getUser: async (token) => jwts.has(token)
        ? { data: { user: { id: jwts.get(token), email: null } }, error: null }
        : { data: { user: null }, error: { message: 'invalid token' } },
    },
    rpc: async (name, params = {}) => {
      log.rpcs.push({ name, who, uid, params });
      if (rpcThrows.has(name)) throw new Error(`scripted network error calling ${name}`);
      const exists = (await asSuper(`SELECT count(*)::int n FROM pg_proc WHERE proname=$1 AND pronamespace='public'::regnamespace`, [name])).rows[0].n;
      if (!exists) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${name}` } };
      const keys = Object.keys(params);
      const vals = keys.map((k) => { const v = params[k]; return v !== null && typeof v === 'object' ? JSON.stringify(v) : v; });
      const sql = `SELECT public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) r`;
      try { return { data: (await run(sql, vals)).rows[0].r, error: null }; }
      catch (e) { return { data: null, error: pgErr(e) }; }
    },
    functions: {
      invoke: async (name, { body }) => {
        log.invokes.push({ name, who, body });
        if (name === 'calculate-tuition') {
          if (tuitionFail.has(body.studentId)) return { data: { error: 'scripted failure' }, error: null };
          if (tuitionUpserts) {
            await asSuper(`INSERT INTO invoices(student_id, month, status, confirmation_status)
                             VALUES ($1, $2, 'issued', 'auto_approved')
                           ON CONFLICT (student_id, month) DO UPDATE
                             SET status = CASE WHEN invoices.tuition_frozen THEN invoices.status ELSE 'issued' END,
                                 confirmation_status = CASE WHEN invoices.tuition_frozen THEN invoices.confirmation_status
                                                            ELSE 'auto_approved' END`, [body.studentId, body.month]);
          }
          if (siblingUnresolved.has(body.studentId)) {
            return { data: { totalAmount: null, siblingUnresolved: true, invoiceSaved: false }, error: null };
          }
          return { data: { totalAmount: 1000, baseAmount: 1000, totalDiscount: 0, sessionCount: 4, tuitionFrozen: false,
                           siblingUnresolved: false, invoiceSaved: true, carry: { carryInCredit: 0, carryInDebt: 0,
                           carryOutCredit: 0, carryOutDebt: 0, status: 'settled' },
                           invoice: { paid_amount: 999 } }, error: null };
        }
        if (name === 'calculate-payroll') return { data: { month: body.month, teachers: [{ id: body.teacherId, totalAmount: 1234 }] }, error: null };
        return { data: null, error: { message: `unexpected invoke ${name}` } };
      },
    },
  };
}

// --------------------------------------------- the functions, bundled
globalThis.__fakeCreateClient = (_url, key, opts) => fakeClient(key, opts);
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY };
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };

async function load(entry) {
  const out = await build({
    entryPoints: [resolve(repo, entry)],
    bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent',
    plugins: [{
      name: 'remote-imports',
      setup(b) {
        b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: 'remote' }));
        b.onLoad({ filter: /.*/, namespace: 'remote' }, (args) => args.path.includes('zod')
          ? { contents: 'export { z } from "zod";', loader: 'js', resolveDir: repo }
          : { contents: 'export const createClient = (...args) => globalThis.__fakeCreateClient(...args);', loader: 'js' });
      },
    }],
  });
  const p = resolve(tmpdir(), `sgf.${entry.split('/').slice(-2, -1)[0]}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  await import(pathToFileURL(p).href);
  return captured;
}
const manage = await load('supabase/functions/manage-session/index.ts');
const bulkFn = await load('supabase/functions/bulk-cancel-sessions/index.ts');
ok('both functions registered a handler', typeof manage === 'function' && typeof bulkFn === 'function');

async function call(fn, token, body) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fn(new Request('http://localhost/fn', { method: 'POST', headers, body: JSON.stringify(body) }));
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const ms = (token, action, data) => call(manage, token, { action, data });

// ---------------------------------------------------------- fixtures
async function person(role) {
  const id = randomUUID();
  const tok = `jwt-${id}`;
  jwts.set(tok, id);
  if (role) await asSuper(`INSERT INTO user_roles VALUES ($1,$2)`, [id, role]);
  return { id, tok };
}
const clock = async (days = 0, hours = 0) => (await db.query(`
  SELECT to_char(t, 'YYYY-MM-DD') AS date, to_char(t, 'HH24:MI') AS time,
         to_char(t + interval '1 hour', 'HH24:MI') AS end_time
    FROM (SELECT date_trunc('minute', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + make_interval(days => $1::int, hours => $2::int) AS t) q`,
  [days, hours])).rows[0];
const PAST = await clock(-3), FUTURE = await clock(10), FAR = await clock(20);
async function mk({ when = FUTURE, start = '17:30', end = '19:00', status = 'Scheduled', cid } = {}) {
  const teacher = randomUUID();
  if (!cid) { cid = randomUUID(); await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]); }
  const { id } = (await asSuper(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [cid, when.date, start, end, status, randomUUID()])).rows[0];
  const t = (await asSuper(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, date: when.date, month: when.date.slice(0, 7) };
}
const att = (sid, status, by, student = randomUUID()) =>
  asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, student, status, by]).then(() => student);
const inv = (student, month, recorded = 0) =>
  asSuper(`INSERT INTO invoices(student_id,month,total_amount,base_amount,recorded_payment) VALUES ($1,$2,540000,540000,$3)`, [student, month, recorded]);
const sess = async (sid) => (await asSuper(`SELECT id, status::text, to_char(date,'YYYY-MM-DD') date, start_time::text FROM sessions WHERE id=$1`, [sid])).rows[0];
const overrides = async (sid) => (await asSuper(`SELECT * FROM session_cancel_overrides WHERE session_id=$1 ORDER BY created_at, id`, [sid])).rows;
const events = async (oid) => (await asSuper(`SELECT kind, payload, actor_user_id FROM session_cancel_override_events WHERE override_id=$1 ORDER BY created_at, id`, [oid])).rows;
const REASON = 'Teacher is sick today, class off';
const CORR = 'Correction: register belonged to another lesson';

// ================================================================ cases
await section('gate: no token, non-admin', async () => {
  const s = await mk();
  let r = await ms(null, 'cancel', { id: s.sid, reason: REASON, token: 'x' });
  ok('no Authorization -> 401 unauthorized', r.status === 401 && r.body.code === 'unauthorized', r);
  const teacher = await person('teacher');
  r = await ms(teacher.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('a teacher -> 403 forbidden (manage-session)', r.status === 403 && r.body.code === 'forbidden', r);
  r = await call(bulkFn, teacher.tok, { step: 'preview', date_from: FUTURE.date, date_to: FUTURE.date });
  ok('a teacher -> 403 forbidden (bulk-cancel-sessions)', r.status === 403 && r.body.code === 'forbidden', r);
  ok('  nothing written', (await sess(s.sid)).status === 'Scheduled' && (await overrides(s.sid)).length === 0);
});

// D-review-3 F-2: EVERY action of both functions, EVERY non-admin caller,
// refused before any read of a lesson, its evidence or a bill, and before
// any RPC, write or invoke. The only read allowed is the role lookup.
await section('F-2 gate: every action, every non-admin caller, nothing read or called', async () => {
  const s = await mk({ when: PAST, status: 'Held' });
  const kid = await att(s.sid, 'Present', s.teacher);
  await inv(kid, s.month, 540000);
  const noRole = await person(null), teacher = await person('teacher'), family = await person('family'), student = await person('student');
  const callers = [
    ['no Authorization header', null, 401],
    ['the anon (publishable) key as bearer', ANON_KEY, 401],
    ['a garbage token', 'not-a-jwt', 401],
    ['a valid JWT with no role', noRole.tok, 403],
    ['a teacher', teacher.tok, 403],
    ['a parent (family)', family.tok, 403],
    ['a student', student.tok, 403],
  ];
  const T = 'f'.repeat(64);
  const msBodies = [
    ['preview cancel', 'preview', { id: s.sid, op: 'cancel' }],
    ['preview delete', 'preview', { id: s.sid, op: 'delete' }],
    ['preview uncancel', 'preview', { id: s.sid, op: 'uncancel' }],
    ['preview move', 'preview', { id: s.sid, op: 'move', change: { date: FAR.date, start_time: '17:30', end_time: '19:00' } }],
    ['cancel', 'cancel', { id: s.sid, token: T, reason: REASON, confirm: true, correction_reason: CORR }],
    ['force-cancel', 'force-cancel', { id: s.sid, token: T, reason: REASON, confirm: true }],
    ['uncancel', 'uncancel', { id: s.sid, token: T, reason: REASON }],
    ['delete', 'delete', { id: s.sid, token: T, reason: REASON, confirm: true }],
    ['move', 'move', { id: s.sid, date: FAR.date, start_time: '17:30', end_time: '19:00', token: T, reason: REASON }],
    ['move (same-day, plain path)', 'move', { id: s.sid, date: s.date, start_time: '18:00', end_time: '19:30' }],
    ['change-status Held -> Scheduled', 'change-status', { id: s.sid, status: 'Scheduled' }],
    ['change-status -> Canceled', 'change-status', { id: s.sid, status: 'Canceled', token: T, reason: REASON }],
    ['update', 'update', { id: s.sid, notes: 'gate probe', teacher_id: randomUUID() }],
    ['refresh-tuition', 'refresh-tuition', { override_id: randomUUID() }],
    ['bulk-delete preview', 'bulk-delete', { step: 'preview', class_id: s.cid, from_date: PAST.date, to_date: FUTURE.date, hard_delete: false }],
    ['bulk-delete confirm', 'bulk-delete', { step: 'confirm', class_id: s.cid, from_date: PAST.date, to_date: FUTURE.date,
                                             hard_delete: true, reason: REASON, items: [{ id: s.sid, token: T }] }],
    ['create', 'create', { class_id: s.cid, date: FAR.date, start_time: '06:00', end_time: '07:00', teacher_id: randomUUID() }],
  ];
  const bulkBodies = [
    ['bulk preview', { step: 'preview', date_from: PAST.date, date_to: FUTURE.date, class_id: s.cid }],
    ['bulk confirm', { step: 'confirm', reason: REASON, items: [{ id: s.sid, token: T }], include_held: true,
                       held_items: [{ id: s.sid, token: T, confirm: true, reason: REASON }] }],
    ['bulk, old one-step body', { date_from: PAST.date, date_to: FUTURE.date, reason: REASON }],
  ];
  const invBefore = JSON.stringify((await asSuper(`SELECT to_jsonb(i) j FROM invoices i ORDER BY id`)).rows);
  const sesBefore = JSON.stringify((await asSuper(`SELECT to_jsonb(x) j FROM sessions x ORDER BY id`)).rows);
  let cases = 0, bad = [];
  for (const [who, tok, want] of callers) {
    const runs = [...msBodies.map(([n, a, d]) => [`manage-session ${n}`, () => ms(tok, a, d)]),
                  ...bulkBodies.map(([n, b]) => [`bulk-cancel-sessions ${n}`, () => call(bulkFn, tok, b)])];
    for (const [name, go] of runs) {
      log.writes = []; log.rpcs = []; log.invokes = []; log.reads = [];
      const r = await go();
      const code = want === 401 ? 'unauthorized' : 'forbidden';
      const otherReads = log.reads.filter((x) => x.table !== 'user_roles');
      const roleReads = log.reads.filter((x) => x.table === 'user_roles');
      cases++;
      const good = r.status === want && r.body?.code === code && log.writes.length === 0 && log.rpcs.length === 0 &&
        log.invokes.length === 0 && otherReads.length === 0 && (want === 403 ? roleReads.length === 1 : roleReads.length === 0);
      if (!good) bad.push({ who, name, status: r.status, code: r.body?.code, writes: log.writes, rpcs: log.rpcs.map((x) => x.name),
                            invokes: log.invokes.map((x) => x.name), reads: log.reads });
    }
  }
  ok(`F-2 ${cases} calls (7 callers x ${msBodies.length + bulkBodies.length} actions): each refused 401/403 with its code, ` +
     'zero writes, zero RPCs, zero invokes, no read but the role lookup', bad.length === 0 && cases === 7 * (msBodies.length + bulkBodies.length), bad.slice(0, 4));
  for (const [who, tok, want] of callers) {
    const mine = bad.filter((b) => b.who === who);
    ok(`F-2   ${who} -> ${want} on every action of both functions`, mine.length === 0, mine.slice(0, 2));
  }
  ok('F-2   every bill and every lesson byte-identical afterwards',
     JSON.stringify((await asSuper(`SELECT to_jsonb(i) j FROM invoices i ORDER BY id`)).rows) === invBefore &&
     JSON.stringify((await asSuper(`SELECT to_jsonb(x) j FROM sessions x ORDER BY id`)).rows) === sesBefore);
  // Control: the same harness lets an admin through (so the zero counts above are not vacuous).
  const a = await person('admin');
  log.rpcs = []; log.reads = [];
  const r = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('F-2   control: an admin\'s preview passes the gate and reaches the RPC on the caller\'s client',
     r.status === 200 && log.rpcs.some((x) => x.name === 'session_change_preview' && x.who === 'user'), [r.status, log.rpcs.map((x) => x.name)]);
});

// D-review-3 F-2 / mutant F03: the one un-reasoned status write a person
// can make (Scheduled <-> Held) is the admin's own, never the service key.
await section('F-2 change-status Scheduled <-> Held is written on the caller\'s client', async () => {
  const a = await person('admin');
  const s = await mk({ when: PAST });
  log.writes = [];
  let r = await ms(a.tok, 'change-status', { id: s.sid, status: 'Held' });
  const w = log.writes.filter((x) => x.table === 'sessions');
  ok('Scheduled -> Held -> 200, Held, the sessions write is who=user with the admin\'s uid',
     r.status === 200 && (await sess(s.sid)).status === 'Held' && w.length === 1 && w[0].who === 'user' && w[0].uid === a.id, [r.body, w]);
  log.writes = [];
  r = await ms(a.tok, 'change-status', { id: s.sid, status: 'Scheduled' });
  const w2 = log.writes.filter((x) => x.table === 'sessions');
  ok('Held -> Scheduled -> 200, Scheduled, who=user', r.status === 200 && (await sess(s.sid)).status === 'Scheduled' &&
     w2.length === 1 && w2[0].who === 'user', [r.body, w2]);
});

await section('old one-step calls are refused with a code', async () => {
  const a = await person('admin');
  const s = await mk();
  let r = await ms(a.tok, 'cancel', { id: s.sid, reason: 'No reason provided' });
  ok('CancelSessionDialog shape (cancel, no token) -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  r = await ms(a.tok, 'force-cancel', { id: s.sid, reason: 'Admin canceled' });
  ok('SessionActionsModal force-cancel, no token -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  r = await ms(a.tok, 'delete', { id: s.sid, reason: 'Deleted via admin interface' });
  ok('DeleteSessionDialog delete, no token -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  r = await ms(a.tok, 'change-status', { id: s.sid, status: 'Canceled', reason: 'x' });
  ok('change-status to Canceled, no token -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  r = await ms(a.tok, 'update', { id: s.sid, status: 'Canceled', notes: null });
  ok('EditSessionModal update with status Canceled -> 409 requires_checked_path, use_action cancel',
     r.status === 409 && r.body.code === 'requires_checked_path' && r.body.use_action === 'cancel', r);
  r = await call(bulkFn, a.tok, { date_from: FUTURE.date, date_to: FUTURE.date, reason: 'Bulk cancellation: a to b', include_held: false });
  ok('BulkSessionDelete one-step body -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  r = await ms(a.tok, 'bulk-delete', { class_id: s.cid, from_date: FUTURE.date, to_date: FUTURE.date, hard_delete: true });
  ok('bulk-delete without step -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  ok('  the lesson is untouched, no override row', (await sess(s.sid)).status === 'Scheduled' && (await overrides(s.sid)).length === 0);
});

await section('reasons', async () => {
  const a = await person('admin');
  const s = await mk();
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel', figures: false });
  let r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token });
  ok('missing reason -> 422 reason_required', r.status === 422 && r.body.code === 'reason_required', r);
  r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: '   short one   ' });
  ok('short reason -> 422 reason_too_short', r.status === 422 && r.body.code === 'reason_too_short', r);
  r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: 'Admin force-canceled (correction)' });
  ok('the retired canned default is refused by SQL -> 422 reason_too_short (HC010)',
     r.status === 422 && r.body.code === 'reason_too_short' && r.body.sqlstate === 'HC010', r);
  ok('  nothing cancelled', (await sess(s.sid)).status === 'Scheduled');
});

await section('T0 preview -> confirm, stored bills shown', async () => {
  const a = await person('admin');
  const s = await mk();
  const kid = await att(s.sid, 'Present', null);
  await inv(kid, s.month, 0);
  log.invokes = [];
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('preview 200: tier 0, token, review_required false', p.status === 200 && p.body.preview.tier === 0 &&
     /^[0-9a-f]{64}$/.test(p.body.preview.token) && p.body.preview.review_required === false, p.body);
  // Replaces the pre-F-1 assertion "calculate-tuition BEFORE figures": the
  // preview now shows the STORED bill and invokes nothing (D-review-3 F-1).
  const c = p.body.consequences;
  ok('preview consequences: the STORED bill for the child (total, discount, payment, statuses, frozen), AFTER said to be unavailable',
     c.source === 'stored' && c.invoices_before.length === 1 && c.invoices_before[0].student_id === kid &&
     c.invoices_before[0].month === s.month && c.invoices_before[0].bill.total_amount === 540000 &&
     c.invoices_before[0].bill.discount_amount === 0 && c.invoices_before[0].bill.recorded_payment === 0 &&
     c.invoices_before[0].bill.status === 'issued' && c.invoices_before[0].bill.tuition_frozen === false &&
     'confirmation_status' in c.invoices_before[0].bill && c.after.available === false &&
     c.after.reason === 'worked out after the change' && !JSON.stringify(c).includes('paid_amount'), c);
  ok('preview consequences: affected_students lists the child with the mark; pay line not fetched',
     c.affected_students.length === 1 && c.affected_students[0].student_id === kid && c.affected_students[0].mark.status === 'Present' &&
     c.pay_line.available === false, c);
  ok('preview invoked nothing (no calculate-tuition, no calculate-payroll)', log.invokes.length === 0, log.invokes);
  log.invokes = [];
  const r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: `  ${REASON}  ` });
  ok('confirm 200 ok, result tier 0', r.status === 200 && r.body.ok && r.body.result.tier === 0, r.body);
  const o = (await overrides(s.sid))[0];
  ok('override row: action cancel, actor = the admin (auth.uid() was the admin, not the service role), reason trimmed',
     o?.action === 'cancel' && o.actor_user_id === a.id && o.reason === REASON, o);
  ok('session Canceled', (await sess(s.sid)).status === 'Canceled');
  ok('tuition refreshed for the one pair, event tuition_refreshed with the result',
     r.body.tuition.status === 'refreshed' && r.body.tuition.results.length === 1 &&
     log.invokes.filter((x) => x.name === 'calculate-tuition').length === 1, r.body.tuition);
  const ev = await events(o.id);
  ok('  event recorded by the admin, results attached, invoices_after by SQL',
     ev.length === 1 && ev[0].kind === 'tuition_refreshed' && ev[0].actor_user_id === a.id &&
     ev[0].payload.attached.results.length === 1 && Array.isArray(ev[0].payload.invoices_after), ev);
  const al = (await asSuper(`SELECT diff FROM audit_log WHERE action='session_cancel' AND entity_id=$1`, [s.sid])).rows;
  ok('the named audit_log entry is kept, now with override_id', al.length === 1 && al[0].diff.override_id === o.id, al);
});

await section('T1, T2, T3', async () => {
  const a = await person('admin');
  const t1 = await mk({ when: PAST });
  let p = await ms(a.tok, 'preview', { id: t1.sid, op: 'cancel', figures: false });
  let r = await ms(a.tok, 'cancel', { id: t1.sid, token: p.body.preview.token, reason: REASON });
  ok('T1 without confirm -> 422 confirm_required', p.body.preview.tier === 1 && r.status === 422 && r.body.code === 'confirm_required', r);
  r = await ms(a.tok, 'force-cancel', { id: t1.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('T1 with confirm (force-cancel name) -> 200', r.status === 200 && (await sess(t1.sid)).status === 'Canceled', r.body);

  const t2 = await mk({ when: PAST, status: 'Held' });
  await att(t2.sid, 'Present', t2.teacher);
  log.invokes = [];
  p = await ms(a.tok, 'preview', { id: t2.sid, op: 'cancel' });
  // Replaces the pre-F-1 "payroll line fetched": calculate-payroll upserts
  // payroll_summaries for an open month, so a preview no longer calls it.
  ok('T2 preview: tier 2 STRONG, review_required; pay line NOT fetched (calculate-payroll writes), nothing invoked',
     p.body.preview.tier === 2 && p.body.preview.level === 'STRONG' && p.body.preview.review_required === true &&
     p.body.consequences.pay_line.available === false && log.invokes.length === 0, [p.body.consequences, log.invokes]);
  r = await ms(a.tok, 'cancel', { id: t2.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('T2 confirm -> 200, review_required', r.status === 200 && r.body.result.review_required === true, r.body);

  const t3 = await mk({ when: PAST, status: 'Held' });
  const k = await att(t3.sid, 'Present', t3.teacher);
  await inv(k, t3.month, 540000);
  p = await ms(a.tok, 'preview', { id: t3.sid, op: 'cancel', figures: false });
  r = await ms(a.tok, 'cancel', { id: t3.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('T3 without correction reason -> 422 correction_reason_required', p.body.preview.tier === 3 && r.status === 422 &&
     r.body.code === 'correction_reason_required', r);
  r = await ms(a.tok, 'cancel', { id: t3.sid, token: p.body.preview.token, reason: REASON, confirm: true, correction_reason: CORR });
  ok('T3 with correction reason -> 200, correction_mode row', r.status === 200 && (await overrides(t3.sid))[0]?.correction_mode === true, r.body);
});

await section('stale token', async () => {
  const a = await person('admin');
  const s = await mk();
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel', figures: false });
  await asSuper(`UPDATE sessions SET notes='room changed' WHERE id=$1`, [s.sid]);
  const r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON });
  ok('changed since the preview -> 409 token_stale with a fresh preview in the body',
     r.status === 409 && r.body.code === 'token_stale' && r.body.preview?.token && r.body.preview.token !== p.body.preview.token, r.body);
  const other = await person('admin');
  const r2 = await ms(other.tok, 'cancel', { id: s.sid, token: r.body.preview.token, reason: REASON });
  ok("another admin's token -> 409 token_stale", r2.status === 409 && r2.body.code === 'token_stale', r2.body.code);
  ok('  nothing cancelled', (await sess(s.sid)).status === 'Scheduled');
});

await section('un-cancel', async () => {
  const a = await person('admin');
  const s = await mk({ when: PAST });
  const kid = await att(s.sid, 'Present', null);
  let p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel', figures: false });
  await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  let r = await ms(a.tok, 'change-status', { id: s.sid, status: 'Held', reason: REASON });
  ok('change-status Canceled -> Held -> 409 uncancel_to_scheduled_only', r.status === 409 && r.body.code === 'uncancel_to_scheduled_only', r);
  r = await ms(a.tok, 'update', { id: s.sid, status: 'Scheduled' });
  ok('update with status leaving Canceled -> 409 requires_checked_path, use_action uncancel',
     r.status === 409 && r.body.use_action === 'uncancel', r);
  p = await ms(a.tok, 'preview', { id: s.sid, op: 'uncancel', figures: false });
  log.invokes = [];
  r = await ms(a.tok, 'uncancel', { id: s.sid, token: p.body.preview.token, reason: 'Cancelled by mistake, lesson ran' });
  ok('un-cancel -> 200, Scheduled, uncancel override row', r.status === 200 && (await sess(s.sid)).status === 'Scheduled' &&
     (await overrides(s.sid)).some((o) => o.action === 'uncancel'), r.body);
  ok('un-cancel refreshes tuition now (D0 gap): calculate-tuition called for the child',
     r.body.tuition.status === 'refreshed' && log.invokes.some((x) => x.name === 'calculate-tuition' && x.body.studentId === kid), r.body.tuition);
  // through change-status too
  const s2 = await mk();
  p = await ms(a.tok, 'preview', { id: s2.sid, op: 'cancel', figures: false });
  await ms(a.tok, 'change-status', { id: s2.sid, status: 'Canceled', token: p.body.preview.token, reason: REASON });
  ok('change-status to Canceled with token -> cancelled through the RPC', (await sess(s2.sid)).status === 'Canceled' &&
     (await overrides(s2.sid))[0]?.action === 'cancel');
  p = await ms(a.tok, 'preview', { id: s2.sid, op: 'uncancel', figures: false });
  r = await ms(a.tok, 'change-status', { id: s2.sid, status: 'Scheduled', token: p.body.preview.token, reason: 'Holiday was moved, lesson back on' });
  ok('change-status Canceled -> Scheduled with token -> uncancel RPC', r.status === 200 && (await sess(s2.sid)).status === 'Scheduled', r.body);
});

await section('delete', async () => {
  const a = await person('admin');
  const ev = await mk({ when: PAST, status: 'Held' });
  await att(ev.sid, 'Present', ev.teacher);
  let p = await ms(a.tok, 'preview', { id: ev.sid, op: 'delete', figures: false });
  ok('preview of a delete with evidence: allowed false, refuse_code use_cancel', p.body.preview.allowed === false && p.body.preview.refuse_code === 'use_cancel');
  let r = await ms(a.tok, 'delete', { id: ev.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('delete with evidence -> 409 use_cancel, lesson kept', r.status === 409 && r.body.code === 'use_cancel' && !!(await sess(ev.sid)), r.body);
  const t0 = await mk();
  p = await ms(a.tok, 'preview', { id: t0.sid, op: 'delete', figures: false });
  r = await ms(a.tok, 'delete', { id: t0.sid, token: p.body.preview.token, reason: 'Duplicate lesson created by mistake' });
  ok('T0 delete through the RPC -> 200, gone, override row with actor', r.status === 200 && !(await sess(t0.sid)) &&
     (await overrides(t0.sid))[0]?.actor_user_id === a.id, r.body);
});

await section('refresh continues past a failing pair', async () => {
  const a = await person('admin');
  const s = await mk({ when: PAST });
  const kids = [await att(s.sid, 'Present', null), await att(s.sid, 'Present', null), await att(s.sid, 'Present', null)];
  const bad = [...kids].sort()[1];
  tuitionFail.add(bad);
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel', figures: false });
  log.invokes = [];
  const r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON, confirm: true });
  ok('the cancel stands (200 ok) while one refresh failed: tuition.status failed, 3 results, 2 ok',
     r.status === 200 && r.body.ok && r.body.tuition.status === 'failed' && r.body.tuition.results.length === 3 &&
     r.body.tuition.results.filter((x) => x.ok).length === 2 && r.body.tuition.failed[0]?.student_id === bad, r.body.tuition);
  ok('  calculate-tuition was called for all three (did not stop at the failure)',
     log.invokes.filter((x) => x.name === 'calculate-tuition').length === 3);
  const oid = r.body.result.override_id;
  let ev = await events(oid);
  ok('  one tuition_refresh_failed event carrying every pair', ev.length === 1 && ev[0].kind === 'tuition_refresh_failed' &&
     ev[0].payload.attached.results.length === 3, ev);
  tuitionFail.delete(bad);
  const rr = await ms(a.tok, 'refresh-tuition', { override_id: oid });
  ev = await events(oid);
  ok('refresh-tuition retry -> refreshed, a NEW tuition_refreshed event', rr.status === 200 && rr.body.tuition.status === 'refreshed' &&
     ev.length === 2 && ev[1].kind === 'tuition_refreshed', rr.body);
});

await section('move', async () => {
  const a = await person('admin');
  const s = await mk();
  const change = { date: FAR.date, start_time: '17:30', end_time: '19:00' };
  let r = await ms(a.tok, 'update', { id: s.sid, date: FAR.date });
  ok('update with a date change -> 409 requires_checked_path, use_action move', r.status === 409 && r.body.use_action === 'move', r);
  r = await ms(a.tok, 'move', { id: s.sid, ...change, reason: REASON });
  ok('a guarded move without a token -> 409 preview_required', r.status === 409 && r.body.code === 'preview_required', r);
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'move', change, figures: false });
  ok('move preview: kind move, tier 0', p.body.preview.kind === 'move' && p.body.preview.tier === 0, p.body.preview);
  r = await ms(a.tok, 'move', { id: s.sid, ...change, reason: 'Teacher swapped days with another class', token: p.body.preview.token });
  ok('T0 move through move_session_checked -> 200, new date, move override row', r.status === 200 &&
     (await sess(s.sid)).date === FAR.date && (await overrides(s.sid))[0]?.action === 'move', r.body);
  // A same-day time edit that leaves a started lesson started: kind null, plain update as the admin.
  const h = await mk({ when: PAST, status: 'Held' });
  await att(h.sid, 'Present', h.teacher);
  log.writes = [];
  r = await ms(a.tok, 'move', { id: h.sid, date: h.date, start_time: '18:00', end_time: '19:30' });
  ok('same-day time edit of a started lesson -> 200 kind null, plain update, no override row',
     r.status === 200 && r.body.kind === null && (await sess(h.sid)).start_time === '18:00:00' && (await overrides(h.sid)).length === 0, r.body);
  ok('  that plain update was made on the caller\'s client', log.writes.some((w) => w.table === 'sessions' && w.who === 'user'), log.writes);
  r = await ms(a.tok, 'update', { id: h.sid, notes: 'Room 3', teacher_id: randomUUID() });
  ok('a plain update (notes, teacher) still works, on the caller\'s client', r.status === 200, r.body);
  r = await ms(a.tok, 'update', { id: h.sid, class_id: randomUUID() });
  ok('update with another class_id -> 409 reclass_not_supported', r.status === 409 && r.body.code === 'reclass_not_supported', r);
});

await section('bulk-cancel-sessions: mixed evidence, per-session ack', async () => {
  const a = await person('admin');
  const cid = randomUUID(); const teacher = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]);
  const day = await clock(-1);
  const plain = [];
  for (let i = 0; i < 3; i++) plain.push(await mk({ when: await clock(20 + i), cid }));
  const t1 = await mk({ when: day, cid, start: '06:00', end: '07:00' });
  const t2 = await mk({ when: day, cid, start: '08:00', end: '09:00', status: 'Held' });
  await att(t2.sid, 'Present', teacher);
  let r = await call(bulkFn, a.tok, { step: 'preview', date_from: day.date, date_to: (await clock(25)).date, class_id: cid });
  ok('preview: 3 plain (tier 0), 2 needs_ack (tier 1 and 2)', r.status === 200 && r.body.plain.length === 3 &&
     r.body.needs_ack.length === 2 && r.body.needs_ack.every((x) => x.token && x.tier >= 1), r.body);
  const batch = r.body.batch_id;
  const tok = Object.fromEntries([...r.body.plain, ...r.body.needs_ack].map((x) => [x.id, x.token]));
  // An attempt to sneak the evidence lessons in as plain items, and held_items without include_held.
  r = await call(bulkFn, a.tok, { step: 'confirm', batch_id: batch, reason: 'Public holiday, school closed',
    items: [...plain.map((s) => ({ id: s.sid, token: tok[s.sid] })), { id: t1.sid, token: tok[t1.sid], confirm: true }],
    held_items: [{ id: t2.sid, token: tok[t2.sid], confirm: true, reason: 'Class abandoned after roll-call, fire alarm' }] });
  ok('confirm: the 3 plain lessons cancelled; the T1 sent as plain is refused confirm_required (its confirm is stripped)',
     r.status === 200 && r.body.canceled.length === 3 && r.body.refused.length === 1 && r.body.refused[0].id === t1.sid &&
     r.body.refused[0].code === 'confirm_required', r.body);
  ok('  held_items without include_held are ignored and reported; the T2 lesson is untouched',
     r.body.held_ignored === 1 && (await sess(t2.sid)).status === 'Held', r.body.held_ignored);
  ok('  the refused lesson comes back in needs_ack with a fresh preview', r.body.needs_ack.some((x) => x.id === t1.sid && x.token), r.body.needs_ack);
  ok('  partial: true, one batch id on every override row', r.body.partial === true &&
     (await asSuper(`SELECT count(*)::int n FROM session_cancel_overrides WHERE batch_id=$1 AND via='bulk' AND actor_user_id=$2`, [batch, a.id])).rows[0].n === 3);
  // Per-session acknowledgement: T2 without its own reason -> HC017; with it -> done.
  const ack = r.body.needs_ack.find((x) => x.id === t1.sid);
  const p2 = (await ms(a.tok, 'preview', { id: t2.sid, op: 'cancel', figures: false })).body.preview;
  r = await call(bulkFn, a.tok, { step: 'confirm', reason: 'Public holiday, school closed', include_held: true,
    held_items: [{ id: t2.sid, token: p2.token, confirm: true }] });
  ok('include_held: a T2 item with only the batch reason -> refused own_reason_required',
     r.body.refused.length === 1 && r.body.refused[0].code === 'own_reason_required', r.body);
  r = await call(bulkFn, a.tok, { step: 'confirm', reason: 'Public holiday, school closed', include_held: true,
    held_items: [{ id: t2.sid, token: p2.token }] });
  ok('include_held: an item without confirm:true -> 422 confirm_required, nothing sent', r.status === 422 && r.body.code === 'confirm_required', r.body);
  r = await call(bulkFn, a.tok, { step: 'confirm', reason: 'Public holiday, school closed', include_held: true,
    held_items: [{ id: t1.sid, token: ack.token, confirm: true },
                 { id: t2.sid, token: p2.token, confirm: true, reason: 'Class abandoned after roll-call, fire alarm' }] });
  ok('include_held with per-session token, confirm and own reason -> both cancelled', r.status === 200 && r.body.canceled.length === 2 &&
     (await sess(t1.sid)).status === 'Canceled' && (await sess(t2.sid)).status === 'Canceled', r.body);
  r = await call(bulkFn, a.tok, { step: 'confirm', reason: 'short', items: [{ id: t1.sid, token: 'x' }] });
  ok('bulk confirm with a short reason -> 422 reason_too_short', r.status === 422 && r.body.code === 'reason_too_short', r.body);
});

await section('bulk: more than 50 lessons are sent in chunks of at most 50', async () => {
  const a = await person('admin');
  const cid = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, randomUUID()]);
  const base = await clock(30);
  const ids = [];
  for (let i = 0; i < 120; i++) {
    const h = String(6 + Math.floor(i / 12)).padStart(2, '0'), m = (i % 12) * 5;
    ids.push((await mk({ when: base, cid, start: `${h}:${String(m).padStart(2, '0')}`, end: `${h}:${String(m + 4).padStart(2, '0')}` })).sid);
  }
  let r = await call(bulkFn, a.tok, { step: 'preview', date_from: base.date, date_to: base.date, class_id: cid });
  ok('preview of 120 lessons: all plain', r.status === 200 && r.body.plain.length === 120, [r.status, r.body.plain?.length, r.body.code]);
  log.rpcs = [];
  r = await call(bulkFn, a.tok, { step: 'confirm', batch_id: r.body.batch_id, reason: 'Public holiday, school closed',
    items: r.body.plain.map((x) => ({ id: x.id, token: x.token })) });
  const calls = log.rpcs.filter((x) => x.name === 'cancel_sessions_checked_bulk');
  ok('120 cancelled in 3 RPC calls of <= 50, each on the caller\'s client', r.status === 200 && r.body.canceled.length === 120 &&
     calls.length === 3 && calls.every((c) => c.params.p_items.length <= 50 && c.who === 'user'),
     { canceled: r.body.canceled?.length, calls: calls.map((c) => [c.params.p_items.length, c.who]) });
});

await section('manage-session bulk-delete (hard): one checked delete per lesson', async () => {
  const a = await person('admin');
  const cid = randomUUID(); const teacher = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacher]);
  const free = await mk({ when: await clock(40), cid });
  const ev = await mk({ when: await clock(-2), cid, status: 'Held' });
  await att(ev.sid, 'Present', teacher);
  let r = await ms(a.tok, 'bulk-delete', { step: 'preview', class_id: cid, from_date: (await clock(-2)).date, to_date: (await clock(40)).date, hard_delete: true });
  ok('preview: the clean lesson plain, the evidence lesson refused use_cancel', r.status === 200 && r.body.plain.length === 1 &&
     r.body.refused.length === 1 && r.body.refused[0].refuse_code === 'use_cancel', r.body);
  const evTok = (await ms(a.tok, 'preview', { id: ev.sid, op: 'delete', figures: false })).body.preview.token;
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', class_id: cid, from_date: (await clock(-2)).date, to_date: (await clock(40)).date,
    hard_delete: true, reason: 'Class closed, lessons entered by mistake',
    items: [{ id: free.sid, token: r.body.plain[0].token }], include_held: true,
    held_items: [{ id: ev.sid, token: evTok, confirm: true }] });
  ok('confirm: clean one deleted, evidence one (acknowledged in held_items) refused use_cancel and kept', r.status === 200 && r.body.done.length === 1 &&
     r.body.refused[0]?.code === 'use_cancel' && !(await sess(free.sid)) && !!(await sess(ev.sid)), r.body);
});

// D-review-3 F-4 + mutant F25: bulk-delete takes the same confirm shape as
// bulk-cancel-sessions; a confirmation in a plain item is stripped.
await section('F-4 / F25 bulk-delete: plain items carry no confirmation; held_items need include_held', async () => {
  const a = await person('admin');
  const cid = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, randomUUID()]);
  const d1 = await clock(-2), d2 = await clock(-1);
  const t1 = await mk({ when: d1, cid });                       // past, blank register: tier 1, deletable
  const crit = { class_id: cid, from_date: d1.date, to_date: d2.date, hard_delete: true };
  let p = await ms(a.tok, 'bulk-delete', { step: 'preview', ...crit });
  const row = p.body.needs_ack?.find((x) => x.id === t1.sid);
  ok('F25 preview: the past blank lesson is tier 1 in needs_ack', p.status === 200 && row?.tier === 1, p.body);
  let r = await ms(a.tok, 'bulk-delete', { step: 'confirm', ...crit, reason: 'Lessons entered twice by mistake',
    items: [{ id: t1.sid, token: row?.token, confirm: true, reason: 'Entered twice by mistake, own reason' }] });
  ok('F25 hard: a tier-1 lesson sent as a PLAIN item with confirm:true -> refused confirm_required (stripped), lesson kept',
     r.status === 200 && r.body.done.length === 0 && r.body.refused[0]?.code === 'confirm_required' && !!(await sess(t1.sid)), r.body);
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', ...crit, reason: 'Lessons entered twice by mistake',
    items: [], held_items: [{ id: t1.sid, token: row?.token, confirm: true }] });
  ok('F-4 hard: held_items without include_held are ignored and reported (nothing sent)',
     r.status === 400 && r.body.code === 'bad_items' && !!(await sess(t1.sid)), r.body);
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', ...crit, reason: 'Lessons entered twice by mistake', include_held: true,
    held_items: [{ id: t1.sid, token: row?.token }] });
  ok('F-4 hard: a held item without confirm:true -> 422 confirm_required, nothing sent', r.status === 422 && r.body.code === 'confirm_required', r.body);
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', ...crit, reason: 'Lessons entered twice by mistake', include_held: true,
    held_items: [{ id: t1.sid, token: row?.token, confirm: true }] });
  ok('F25 hard: the same lesson in held_items with include_held + confirm -> deleted',
     r.status === 200 && r.body.done.length === 1 && !(await sess(t1.sid)), r.body);
  // soft (cancel) path, the K5 probe: a T2 lesson with confirm + own reason in items.
  const t2 = await mk({ when: d2, cid, status: 'Held' });
  await att(t2.sid, 'Present', randomUUID());
  const soft = { ...crit, hard_delete: false };
  p = await ms(a.tok, 'bulk-delete', { step: 'preview', ...soft });
  const r2 = p.body.needs_ack?.find((x) => x.id === t2.sid);
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', ...soft, reason: 'Public holiday, school closed',
    items: [{ id: t2.sid, token: r2?.token, confirm: true, reason: 'Class abandoned after roll-call, fire alarm' }] });
  ok('F-4 soft (K5): T2 lesson smuggled into items with confirm + own reason -> refused confirm_required, still Held',
     r.status === 200 && r.body.done.length === 0 && r.body.refused[0]?.code === 'confirm_required' && (await sess(t2.sid)).status === 'Held', r.body);
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', ...soft, reason: 'Public holiday, school closed', include_held: true,
    held_items: [{ id: t2.sid, token: r2?.token, confirm: true, reason: 'Class abandoned after roll-call, fire alarm' }] });
  ok('F-4 soft: through held_items with include_held -> cancelled', r.status === 200 && r.body.done.length === 1 &&
     (await sess(t2.sid)).status === 'Canceled', r.body);
});

// D-review-3 F-5: the criteria an audit row records are the criteria that selected the lessons.
await section('F-5 bulk confirm refuses lessons outside the stated criteria', async () => {
  const a = await person('admin');
  const cid = randomUUID(), other = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2), ($3,$4)`, [cid, randomUUID(), other, randomUUID()]);
  const day = await clock(30);
  const mine = await mk({ when: day, cid }), theirs = await mk({ when: day, cid: other, start: '08:00', end: '09:00' });
  const tokMine = (await ms(a.tok, 'preview', { id: mine.sid, op: 'delete' })).body.preview.token;
  const tokTheirs = (await ms(a.tok, 'preview', { id: theirs.sid, op: 'delete' })).body.preview.token;
  let r = await ms(a.tok, 'bulk-delete', { step: 'confirm', class_id: cid, from_date: day.date, to_date: day.date, hard_delete: true,
    reason: 'Class closed, lessons entered by mistake', items: [{ id: mine.sid, token: tokMine }, { id: theirs.sid, token: tokTheirs }] });
  ok('K7: bulk-delete for class A with a lesson of class B -> B refused outside_criteria and kept, A deleted',
     r.status === 200 && r.body.done.length === 1 && r.body.done[0].id === mine.sid &&
     r.body.refused.some((x) => x.id === theirs.sid && x.code === 'outside_criteria') && !!(await sess(theirs.sid)) && !(await sess(mine.sid)), r.body);
  const ctok = (await ms(a.tok, 'preview', { id: theirs.sid, op: 'cancel' })).body.preview.token;
  r = await call(bulkFn, a.tok, { step: 'confirm', class_id: cid, date_from: day.date, date_to: day.date,
    reason: 'Public holiday, school closed', items: [{ id: theirs.sid, token: ctok }] });
  ok('bulk-cancel-sessions confirm for class A with a lesson of class B -> refused outside_criteria, still Scheduled',
     r.status === 200 && r.body.canceled.length === 0 && r.body.refused[0]?.code === 'outside_criteria' &&
     (await sess(theirs.sid)).status === 'Scheduled', r.body);
  const out = await call(bulkFn, a.tok, { step: 'confirm', date_from: (await clock(31)).date, date_to: (await clock(32)).date,
    reason: 'Public holiday, school closed', items: [{ id: theirs.sid, token: ctok }] });
  ok('  ... and outside the stated dates -> refused outside_criteria', out.body.refused?.[0]?.code === 'outside_criteria', out.body);
});

// Surviving mutants F19, F21, F22 (D-review-3 mutation table) and F-6, F-8, F-9.
await section('F19 a sibling-unresolved refresh is a failed refresh, never "refreshed"', async () => {
  const a = await person('admin');
  const s = await mk();
  const kid = await att(s.sid, 'Present', null);
  siblingUnresolved.add(kid);
  try {
    const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
    const r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON });
    ok('cancel stands; tuition.status failed with error sibling_unresolved; event tuition_refresh_failed',
       r.status === 200 && r.body.tuition.status === 'failed' && r.body.tuition.failed[0]?.error === 'sibling_unresolved' &&
       (await events(r.body.result.override_id))[0]?.kind === 'tuition_refresh_failed', r.body.tuition);
  } finally { siblingUnresolved.delete(kid); }
});

await section('F21 SUPABASE_ANON_KEY missing -> 503 misconfigured, nothing read or written', async () => {
  const a = await person('admin');
  const s = await mk();
  const saved = env.SUPABASE_ANON_KEY;
  delete env.SUPABASE_ANON_KEY;
  try {
    const w0 = log.writes.length, r0 = log.rpcs.length;
    let r = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
    ok('manage-session preview -> 503 misconfigured', r.status === 503 && r.body.code === 'misconfigured', r.body);
    r = await ms(a.tok, 'change-status', { id: s.sid, status: 'Held' });
    ok('manage-session change-status -> 503 misconfigured', r.status === 503 && r.body.code === 'misconfigured', r.body);
    r = await call(bulkFn, a.tok, { step: 'preview', date_from: FUTURE.date, date_to: FUTURE.date });
    ok('bulk-cancel-sessions preview -> 503 misconfigured', r.status === 503 && r.body.code === 'misconfigured', r.body);
    ok('  no RPC and no write to sessions', log.rpcs.length === r0 &&
       log.writes.slice(w0).filter((w) => w.table === 'sessions').length === 0, [log.rpcs.slice(r0), log.writes.slice(w0)]);
  } finally { env.SUPABASE_ANON_KEY = saved; }
});

await section('F22 bulk ranges: 0-62 days only', async () => {
  const a = await person('admin');
  const s = await mk();
  const d0 = await clock(0), d63 = await clock(63), d62 = await clock(62);
  let r = await ms(a.tok, 'bulk-delete', { step: 'preview', class_id: s.cid, from_date: d0.date, to_date: d63.date, hard_delete: false });
  ok('manage-session bulk-delete 63 days -> 400 bad_request', r.status === 400 && r.body.code === 'bad_request', r.body);
  r = await ms(a.tok, 'bulk-delete', { step: 'confirm', class_id: s.cid, from_date: d63.date, to_date: d0.date, hard_delete: false,
    reason: REASON, items: [{ id: s.sid, token: 'x' }] });
  ok('manage-session bulk-delete with to before from -> 400 bad_request, nothing sent', r.status === 400 && r.body.code === 'bad_request', r.body);
  r = await ms(a.tok, 'bulk-delete', { step: 'preview', class_id: s.cid, from_date: d0.date, to_date: d62.date, hard_delete: false });
  ok('  control: 62 days -> 200', r.status === 200, r.body);
  r = await call(bulkFn, a.tok, { step: 'preview', date_from: d0.date, date_to: d63.date, class_id: s.cid });
  ok('bulk-cancel-sessions preview 63 days -> 400 bad_request', r.status === 400 && r.body.code === 'bad_request', r.body);
});

await section('F-9 a throw after the change committed is not reported as a failed change', async () => {
  const a = await person('admin');
  const s = await mk();
  await att(s.sid, 'Present', null);
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
  rpcThrows.add('record_session_override_event');
  let r;
  try { r = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON }); }
  finally { rpcThrows.delete('record_session_override_event'); }
  ok('cancel -> 200 ok with the override id and tuition.status failed (not 500 unexpected); lesson Canceled',
     r.status === 200 && r.body.ok === true && !!r.body.result?.override_id && r.body.tuition.status === 'failed' &&
     (await sess(s.sid)).status === 'Canceled', r.body);
  const rr = await ms(a.tok, 'refresh-tuition', { override_id: r.body.result?.override_id });
  ok('  the dialog can retry with that override id -> refreshed', rr.status === 200 && rr.body.tuition.status === 'refreshed', rr.body);
});

await section('F-8 manage-session 429 carries a code and message_key', async () => {
  const a = await person('admin');
  let last = null;
  for (let i = 0; i < 51; i++) last = await ms(a.tok, 'preview', { id: randomUUID(), op: 'nope' });
  ok('the 51st action in a minute -> 429 rate_limited with message_key and Retry-After seconds',
     last.status === 429 && last.body.code === 'rate_limited' && last.body.message_key === 'sessionGuard.error.rate_limited' &&
     typeof last.body.retryAfter === 'number', last);
});

await section('create is unchanged', async () => {
  const a = await person('admin');
  const cid = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, randomUUID()]);
  const r = await ms(a.tok, 'create', { class_id: cid, date: FAR.date, start_time: '10:00', end_time: '11:00', teacher_id: randomUUID() });
  ok('create -> 200 with the new lesson (insert, not guarded)', r.status === 200 && r.body.session?.id, r.body);
});

// D-review-3 F-1, the D1a-D1f probe reproduced with a calculate-tuition
// stand-in that does the real upsert: a preview (single and bulk) must
// invoke nothing and leave every bill byte-identical.
await section('F-1 a preview is read-only: tier 3 stays 3, bills byte-identical, no bill created', async () => {
  const a = await person('admin');
  tuitionUpserts = true;
  try {
    const allBills = async () => JSON.stringify((await asSuper(`SELECT to_jsonb(i) j FROM invoices i ORDER BY id`)).rows);
    const nBills = async () => (await asSuper(`SELECT count(*)::int n FROM invoices`)).rows[0].n;
    const billsOf = async (kids) => (await asSuper(`SELECT student_id::text, month, status, confirmation_status, recorded_payment
        FROM invoices WHERE student_id::text = ANY($1::text[]) ORDER BY student_id, month`, [kids])).rows;
    // Past Held lesson, two children marked Present by the teacher, both bills confirmed by an admin, unpaid.
    const s = await mk({ when: PAST, status: 'Held' });
    const k1 = await att(s.sid, 'Present', s.teacher), k2 = await att(s.sid, 'Present', s.teacher);
    for (const k of [k1, k2]) {
      await asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,discount_amount,recorded_payment,confirmation_status)
                     VALUES ($1,$2,'issued',540000,600000,60000,0,'confirmed')`, [k, s.month]);
    }
    const d1a = await billsOf([k1, k2]);
    ok('D1a bills before any preview: issued / confirmed / unpaid x2',
       d1a.length === 2 && d1a.every((b) => b.status === 'issued' && b.confirmation_status === 'confirmed'), d1a);
    const before = await allBills(), countBefore = await nBills();
    log.invokes = [];
    const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
    ok('D1c default preview (no figures flag) -> tier 3, settled_any true, correction reason required',
       p.status === 200 && p.body.preview.tier === 3 && p.body.preview.settled_any === true &&
       p.body.preview.requires.correction_reason === true && p.body.preview.requires.confirm === true, p.body.preview);
    ok('  ZERO calls to calculate-tuition or calculate-payroll', log.invokes.length === 0, log.invokes);
    ok('D1d bills after the (abandoned) preview: byte-identical, same count', (await allBills()) === before && (await nBills()) === countBefore,
       await billsOf([k1, k2]));
    const c = p.body.consequences;
    ok('  the preview shows the stored bills as they stand (confirmed, total 540000, discount 60000, payment 0)',
       c.invoices_before.length === 2 && c.invoices_before.every((x) => x.bill?.confirmation_status === 'confirmed' &&
       x.bill.total_amount === 540000 && x.bill.discount_amount === 60000 && x.bill.recorded_payment === 0 && x.bill.status === 'issued'), c);
    log.invokes = [];
    const pf = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel', figures: true });
    ok('  figures:true is ignored: still zero invokes, bills identical, same token',
       log.invokes.length === 0 && (await allBills()) === before && pf.body.preview.token === p.body.preview.token, log.invokes);
    // Bulk previews of the same lesson: zero invokes, bills identical.
    log.invokes = [];
    let r = await call(bulkFn, a.tok, { step: 'preview', date_from: s.date, date_to: s.date, class_id: s.cid });
    ok('bulk-cancel-sessions preview: lesson in needs_ack at tier 3, stored bills shown, zero invokes, bills identical',
       r.status === 200 && r.body.needs_ack.some((x) => x.id === s.sid && x.tier === 3 && x.consequences?.invoices_before?.length === 2) &&
       log.invokes.length === 0 && (await allBills()) === before, [r.body.needs_ack, log.invokes]);
    r = await ms(a.tok, 'bulk-delete', { step: 'preview', class_id: s.cid, from_date: s.date, to_date: s.date, hard_delete: false });
    ok('manage-session bulk-delete preview: zero invokes, bills identical',
       r.status === 200 && log.invokes.length === 0 && (await allBills()) === before, log.invokes);
    // D1e: a paid bill keeps 'paid' across a preview.
    const sp = await mk({ when: PAST, status: 'Held' });
    const kp = await att(sp.sid, 'Present', sp.teacher);
    await asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status)
                   VALUES ($1,$2,'paid',540000,540000,540000,'confirmed')`, [kp, sp.month]);
    const beforeP = await allBills();
    log.invokes = [];
    const pp = await ms(a.tok, 'preview', { id: sp.sid, op: 'cancel' });
    ok('D1e paid bill: tier 3, status stays "paid", confirmation stays "confirmed", zero invokes',
       pp.body.preview.tier === 3 && (await allBills()) === beforeP && log.invokes.length === 0 &&
       (await billsOf([kp]))[0]?.status === 'paid', await billsOf([kp]));
    // D1f: a move preview to a month 70 days out creates no bill there.
    const sm = await mk();
    const km1 = await att(sm.sid, 'Present', null), km2 = await att(sm.sid, 'Present', null);
    await inv(km1, sm.month, 0); await inv(km2, sm.month, 0);
    const far = await clock(70);
    const beforeM = await allBills(), nM = await nBills();
    log.invokes = [];
    const pm = await ms(a.tok, 'preview', { id: sm.sid, op: 'move', change: { date: far.date, start_time: '17:30', end_time: '19:00' } });
    const dest = (pm.body.consequences?.invoices_before ?? []).filter((x) => x.month === far.date.slice(0, 7));
    ok('D1f move preview 70 days out: no bill created for the destination month (count and rows identical), zero invokes',
       pm.status === 200 && (await nBills()) === nM && (await allBills()) === beforeM && log.invokes.length === 0, [pm.status, log.invokes]);
    ok('  the destination month is shown with bill: null for each child (no bill saved there)',
       far.date.slice(0, 7) !== sm.month ? dest.length === 2 && dest.every((x) => x.bill === null) : true, pm.body.consequences);
    // The token covers what the preview shows: a change to any shown bill field makes it stale.
    for (const [what, sql] of [['discount', `UPDATE invoices SET discount_amount = discount_amount + 1 WHERE student_id=$1 AND month=$2`],
                               ['confirmation status', `UPDATE invoices SET confirmation_status='needs_review' WHERE student_id=$1 AND month=$2`],
                               ['recorded payment', `UPDATE invoices SET recorded_payment = 1000 WHERE student_id=$1 AND month=$2`]]) {
      const t = await mk({ when: PAST, status: 'Held' });
      const kt = await att(t.sid, 'Present', t.teacher);
      await asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,discount_amount,recorded_payment,confirmation_status)
                     VALUES ($1,$2,'issued',540000,600000,60000,0,'confirmed')`, [kt, t.month]);
      const pt = await ms(a.tok, 'preview', { id: t.sid, op: 'cancel' });
      await asSuper(sql, [kt, t.month]);
      const rt = await ms(a.tok, 'cancel', { id: t.sid, token: pt.body.preview.token, reason: REASON, confirm: true, correction_reason: CORR });
      ok(`token covers the stored bill: ${what} changed after the preview -> 409 token_stale with fresh consequences, lesson still Held`,
         rt.status === 409 && rt.body.code === 'token_stale' && Array.isArray(rt.body.consequences?.invoices_before) &&
         (await sess(t.sid)).status === 'Held', rt.body.code);
    }
    // After a SUCCESSFUL change the standard refresh runs exactly as built.
    log.invokes = [];
    const rc = await ms(a.tok, 'cancel', { id: s.sid, token: p.body.preview.token, reason: REASON, confirm: true, correction_reason: CORR });
    const ti = log.invokes.filter((x) => x.name === 'calculate-tuition');
    ok('the confirm (tier 3, correction reason) -> 200, then calculate-tuition once per (student, month): the standard refresh',
       rc.status === 200 && rc.body.result.tier === 3 && ti.length === 2 &&
       new Set(ti.map((x) => x.body.studentId)).size === 2 && rc.body.tuition.status === 'refreshed', [rc.body, ti.length]);
    const o = (await overrides(s.sid))[0];
    ok('  stored as a correction of a settled lesson (settled true, correction_mode), bills before = the confirmed ones',
       o?.settled === true && o.correction_mode === true &&
       o.invoices_before.every((x) => x.confirmation_status === 'confirmed'), o && { settled: o.settled, cm: o.correction_mode });
  } finally { tuitionUpserts = false; }
});

// The F-2 acceptance test: over everything above, no write to `sessions`
// and no guard RPC was made with the service key.
await section('no person-initiated sessions write on the service key', async () => {
  const svc = log.writes.filter((w) => w.table === 'sessions' && w.who === 'service' && w.op !== 'insert');
  ok('no UPDATE/DELETE of sessions by the service client in either function', svc.length === 0, svc);
  const ins = log.writes.filter((w) => w.table === 'sessions' && w.who === 'service' && w.op === 'insert');
  ok('  (the only service-key sessions write is manage-session create, an INSERT - kept unchanged)', ins.length === 1, ins.length);
  const guardRpcs = ['session_change_preview', 'cancel_session_checked', 'move_session_checked', 'uncancel_session_checked',
                     'cancel_sessions_checked_bulk', 'record_session_override_event'];
  const bad = log.rpcs.filter((x) => guardRpcs.includes(x.name) && x.who !== 'user');
  ok('every guard RPC was called on the caller\'s client', bad.length === 0, bad);
  const total = (await asSuper(`SELECT count(*)::int n FROM session_cancel_overrides WHERE actor_user_id IS NULL`)).rows[0].n;
  ok('no override row without a person', total === 0);
});

// After the acceptance count above (this one attempts a service-key INSERT that fails).
await section('F-6 create on a taken slot -> 409 slot_taken, the existing lesson untouched', async () => {
  const a = await person('admin');
  const s = await mk();
  const before = JSON.stringify(await sess(s.sid));
  const r = await ms(a.tok, 'create', { class_id: s.cid, date: s.date, start_time: '17:30', end_time: '19:00', teacher_id: randomUUID() });
  ok('create into an occupied slot -> 409 slot_taken (was 500 unexpected)', r.status === 409 && r.body.code === 'slot_taken', r.body);
  ok('  existing lesson byte-identical', JSON.stringify(await sess(s.sid)) === before);
});

// Rollout: the functions deployed before the migration is pasted.
await section('guard migration missing -> fail closed, no fallback write', async () => {
  const saved = db;
  db = await makeDb({ guard: false });
  try {
    const a = await person('admin');
    const s = await mk();
    log.writes = [];
    let r = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel', figures: false });
    ok('preview -> 503 guard_not_installed with the admin message', r.status === 503 && r.body.code === 'guard_not_installed' &&
       /has not been applied yet/.test(r.body.message), r.body);
    r = await ms(a.tok, 'cancel', { id: s.sid, token: 'f'.repeat(64), reason: REASON, confirm: true });
    ok('cancel with a token -> 503 guard_not_installed', r.status === 503 && r.body.code === 'guard_not_installed', r.body);
    r = await ms(a.tok, 'delete', { id: s.sid, token: 'f'.repeat(64), reason: REASON });
    ok('delete -> 503 guard_not_installed', r.status === 503 && r.body.code === 'guard_not_installed', r.body);
    r = await ms(a.tok, 'move', { id: s.sid, date: FAR.date, start_time: '17:30', end_time: '19:00', token: 'f'.repeat(64), reason: REASON });
    ok('move -> 503 guard_not_installed', r.status === 503 && r.body.code === 'guard_not_installed', r.body);
    r = await call(bulkFn, a.tok, { step: 'confirm', reason: 'Public holiday, school closed', items: [{ id: s.sid, token: 'x' }] });
    ok('bulk confirm -> 503 guard_not_installed', r.status === 503 && r.body.code === 'guard_not_installed', r.body);
    r = await ms(a.tok, 'refresh-tuition', { override_id: randomUUID() });
    ok('refresh-tuition -> 503 guard_not_installed (no audit tables)', r.status === 503 && r.body.code === 'guard_not_installed', r.body);
    ok('  the lesson is untouched and NO write reached sessions (no fallback to the old direct write)',
       (await sess(s.sid)).status === 'Scheduled' && log.writes.filter((w) => w.table === 'sessions').length === 0, log.writes);
  } finally {
    await db.close();
    db = saved;
  }
});

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
