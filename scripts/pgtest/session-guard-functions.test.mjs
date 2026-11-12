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
const log = { writes: [], rpcs: [], invokes: [] };
const tuitionFail = new Set();          // student ids whose calculate-tuition fails
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

await section('T0 preview -> confirm, figures fetched', async () => {
  const a = await person('admin');
  const s = await mk();
  const kid = await att(s.sid, 'Present', null);
  log.invokes = [];
  const p = await ms(a.tok, 'preview', { id: s.sid, op: 'cancel' });
  ok('preview 200: tier 0, token, review_required false', p.status === 200 && p.body.preview.tier === 0 &&
     /^[0-9a-f]{64}$/.test(p.body.preview.token) && p.body.preview.review_required === false, p.body);
  const ct = p.body.consequences.tuition;
  ok('preview consequences: calculate-tuition BEFORE figures for the child, AFTER said to be unavailable (not guessed)',
     ct.length === 1 && ct[0].student_id === kid && ct[0].fetched && ct[0].before.totalAmount === 1000 &&
     ct[0].after.fetched === false && !JSON.stringify(ct).includes('paid_amount'), ct);
  ok('preview consequences: payroll not fetched for a Scheduled lesson (only Held lessons are paid)',
     p.body.consequences.payroll.fetched === false && p.body.consequences.payroll.reason === 'lesson_not_held', p.body.consequences.payroll);
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
  p = await ms(a.tok, 'preview', { id: t2.sid, op: 'cancel' });
  ok('T2 preview: tier 2 STRONG, review_required, payroll line fetched from calculate-payroll (Held)',
     p.body.preview.tier === 2 && p.body.preview.level === 'STRONG' && p.body.preview.review_required === true &&
     p.body.consequences.payroll.fetched === true && p.body.consequences.payroll.response.teachers[0].totalAmount === 1234, p.body.consequences);
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
    items: [{ id: free.sid, token: r.body.plain[0].token }, { id: ev.sid, token: evTok, confirm: true }] });
  ok('confirm: clean one deleted, evidence one refused use_cancel and kept', r.status === 200 && r.body.done.length === 1 &&
     r.body.refused[0]?.code === 'use_cancel' && !(await sess(free.sid)) && !!(await sess(ev.sid)), r.body);
});

await section('create is unchanged', async () => {
  const a = await person('admin');
  const cid = randomUUID();
  await asSuper(`INSERT INTO classes VALUES ($1,$2)`, [cid, randomUUID()]);
  const r = await ms(a.tok, 'create', { class_id: cid, date: FAR.date, start_time: '10:00', end_time: '11:00', teacher_id: randomUUID() });
  ok('create -> 200 with the new lesson (insert, not guarded)', r.status === 200 && r.body.session?.id, r.body);
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
