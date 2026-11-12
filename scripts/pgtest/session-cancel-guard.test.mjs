// The cancellation guard. Drives the REAL migrations, in the order the
// owner pastes them:
//
//   node scripts/pgtest/session-cancel-guard.test.mjs \
//     supabase/migrations/20261009130000_audit_every_admin_action.sql \
//     supabase/migrations/20261027090000_cancelled_lesson_attendance_guard.sql \
//     supabase/migrations/20261112090000_session_held_evidence.sql \
//     supabase/migrations/20261112091000_session_cancel_guard.sql
//
// Spec: docs/evidence/D2-guard-design.md section 10 as amended by
// docs/evidence/D-review-1.md Part B (B-1..B-12). Case labels: "d<N>" =
// design test N, "B-<n>" = review finding. Dates are relative to the
// Hanoi clock, and "started two hours ago" / "starts in two hours" are
// built from now() as a (date, time) pair, so no case is ever skipped.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 600)}` : ''}`);
  value ? pass++ : fail++;
};

const [auditFile, cancelFile, d1File, d2File] = process.argv.slice(2);
if (!auditFile || !cancelFile || !d1File || !d2File) {
  console.error('usage: session-cancel-guard.test.mjs <20261009130000> <20261027090000> <20261112090000> <20261112091000>');
  process.exit(2);
}
const sqlOf = (f) => readFileSync(f, 'utf8');
// D-review-2 F-7: a fixture call that throws (because a mutant let an
// earlier refusal through) is a FAIL line for its section, never a crash
// that hides every later case.
async function section(name, fn) {
  try { await fn(); }
  catch (e) {
    ok(`section "${name}" ran to the end without an unexpected error`, false,
       { code: e?.code, message: e?.message });
    try { await db?.exec('RESET ROLE'); } catch { /* connection may be mid-transaction */ }
    try { await db?.exec('ROLLBACK'); } catch { /* none open */ }
  }
}
let db;

// Real columns, names and nullability of src/integrations/supabase/types.ts
// for every table the four migrations read.
const PRELUDE = `
  -- service_role bypasses RLS on Supabase; without BYPASSRLS here a write
  -- would be filtered to zero rows before any trigger could refuse it.
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
  -- 20251017144629:29-31
  CREATE UNIQUE INDEX sessions_class_date_time_unique ON public.sessions (class_id, date, start_time) WHERE status <> 'Canceled';
  CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS
    $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$;
  CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  -- Verbatim: 20251016045745_755294d2-f62d-468d-b15c-a3ad25c73da8.sql:5-41.
  CREATE OR REPLACE FUNCTION public.validate_session_status_on_change()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE
    v_now_bkk timestamp with time zone;
    v_session_start timestamp with time zone;
    v_five_minutes_after timestamp with time zone;
  BEGIN
    IF NEW.status = 'Held' THEN
      v_now_bkk := now() AT TIME ZONE 'Asia/Bangkok';
      v_session_start := (NEW.date::text || ' ' || NEW.start_time::text)::timestamp AT TIME ZONE 'Asia/Bangkok';
      v_five_minutes_after := v_session_start + interval '5 minutes';
      IF v_now_bkk < v_five_minutes_after THEN
        NEW.status := 'Scheduled';
        RAISE NOTICE 'Auto-corrected session % status from Held to Scheduled (session not yet started)', NEW.id;
      END IF;
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
  -- invoices: no paid_amount on purpose (cumulative; nothing here may read it).
  CREATE TABLE public.invoices(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, month text NOT NULL,
    status text NOT NULL DEFAULT 'issued', base_amount integer NOT NULL DEFAULT 0,
    discount_amount integer NOT NULL DEFAULT 0, total_amount integer NOT NULL DEFAULT 0,
    recorded_payment integer, confirmation_status text, confirmed_at timestamptz,
    tuition_frozen boolean NOT NULL DEFAULT false, carry_in_credit integer, carry_in_debt integer,
    carry_out_credit integer, carry_out_debt integer, class_breakdown jsonb,
    UNIQUE(student_id, month));
  -- Verbatim: 20261021093000_payroll_month_locking.sql:162-173.
  CREATE OR REPLACE FUNCTION public.payroll_month_is_locked(p_month text)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
    SELECT EXISTS (SELECT 1 FROM public.payroll_periods
                    WHERE month = substring(p_month from 1 for 7) AND status = 'locked');
  $fn$;
  -- 20251012023028:15-23 (the FK to auth.users left out).
  CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, action text NOT NULL,
    entity text NOT NULL, entity_id text, diff jsonb, occurred_at timestamptz NOT NULL DEFAULT now());

  -- What Supabase gives the API roles on public (20260712023825 revoked the
  -- defaults; the app re-grants table by table - sessions and attendance are
  -- writable by authenticated under RLS).
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

  ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
  -- 20251012023454:146-147
  CREATE POLICY "Admins can manage all sessions" ON public.sessions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "Teachers read own sessions" ON public.sessions
    FOR SELECT USING (public.is_teacher_of_class(auth.uid(), class_id));
  -- D0 A3.2: a teacher may update their own lesson while it stays Scheduled.
  CREATE POLICY "Teachers update own scheduled sessions" ON public.sessions
    FOR UPDATE USING (public.is_teacher_of_class(auth.uid(), class_id) AND status = 'Scheduled')
    WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "Service role sessions" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
`;

async function makeDb({ withD1 = true } = {}) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  await d.exec(sqlOf(auditFile));
  await d.exec(sqlOf(cancelFile));
  if (withD1) await d.exec(sqlOf(d1File));
  return d;
}

// ------------------------------------------------------------ preflight
await section("block 1", async () => {
  const bare = await makeDb({ withD1: false });
  let msg = null;
  try { await bare.exec(sqlOf(d2File)); } catch (e) { msg = e.message; }
  await bare.exec('ROLLBACK').catch(() => {});
  ok('d3 preflight: without the D1 function the migration refuses, naming it',
     /session_held_evidence\(uuid\) is missing/.test(msg ?? ''), msg);
  const t = (await bare.query(`SELECT to_regclass('public.session_cancel_overrides') AS t,
      (SELECT count(*)::int FROM pg_trigger WHERE tgname LIKE 'zz_session%') AS trg`)).rows[0];
  ok('d3   and installs nothing (no table, no trigger)', t.t === null && t.trg === 0, t);
  await bare.close();
});
await section("block 2", async () => {
  const v = await makeDb();
  await v.exec(`CREATE OR REPLACE FUNCTION public.session_recording_evidence(p_session_id uuid)
    RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $b$ SELECT '[]'::jsonb $b$;`);
  let msg = null;
  try { await v.exec(sqlOf(d2File)); } catch (e) { msg = e.message; }
  await v.exec('ROLLBACK').catch(() => {});
  ok('B-12 preflight refuses while session_recording_evidence is VOLATILE (A-2)',
     /session_recording_evidence must be STABLE/.test(msg ?? ''), msg);
  await v.close();
});

db = await makeDb();
const fnDef = async (name) => (await db.query(`SELECT pg_get_functiondef(to_regprocedure($1)) d`, [name])).rows[0].d;
const guardDefsBefore = [await fnDef('public.guard_cancelled_session_attendance()'),
                         await fnDef('public.set_attendance_excused_on_cancel()'),
                         await fnDef('public.session_held_evidence(uuid)')];
const triggersBefore = (await db.query(`SELECT tgname, tgenabled, pg_get_triggerdef(t.oid) d FROM pg_trigger t
   WHERE NOT tgisinternal AND tgname NOT LIKE 'zz_session%' ORDER BY tgname`)).rows;
await db.exec(sqlOf(d2File));

// ---------------------------------------------------------------- helpers
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const ADMIN2 = '00000000-0000-4000-8000-0000000000a2';
const PARENT = '00000000-0000-4000-8000-0000000000f1';
const NOBODY = '00000000-0000-4000-8000-0000000000e1';
await db.query(`INSERT INTO user_roles VALUES ($1,'admin'),($2,'admin'),($3,'family')`, [ADMIN, ADMIN2, PARENT]);
const R = 'Teacher is sick today, class off';

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
const tryIt = async (fn) => { try { return { ok: await fn() }; } catch (e) { return { code: e.code, message: e.message, detail: e.detail }; } };
// A fixture call that is expected to succeed, after a refusal test: a
// throw becomes a FAIL line and the case goes on with an empty result.
const must = async (label, fn) => {
  const r = await tryIt(fn);
  if (r.ok === undefined) { ok(`${label}: the fixture call succeeds`, false, r); return {}; }
  return r.ok ?? {};
};
const asAdmin = (sql, params) => as(ADMIN, 'authenticated', 'authenticated', sql, params);
const asService = (sql, params) => as(null, 'service_role', 'service_role', sql, params);
const asSuper = (sql, params) => as(null, '', null, sql, params);
// One transaction, statements as given, as a role. Returns null or the error.
async function script(uid, jwtRole, dbRole, body) {
  const head = `BEGIN; SELECT set_config('test.uid', '${uid ?? ''}', true), set_config('test.jwt_role', '${jwtRole ?? ''}', true);`
             + (dbRole ? ` SET LOCAL ROLE ${dbRole};` : '');
  try { await db.exec(`${head} ${body}; COMMIT;`); return null; }
  catch (e) { await db.exec('ROLLBACK').catch(() => {}); return { code: e.code, message: e.message }; }
}

const preview = async (sid, action = 'cancel', change = null, uid = ADMIN) =>
  (await as(uid, 'authenticated', 'authenticated', 'SELECT public.session_change_preview($1,$2,$3::jsonb) r',
    [sid, action, change ? JSON.stringify(change) : null])).rows[0].r;
const checked = (sid, { action = 'cancel', reason = R, token, confirm = false, corr = null, ctx = {} } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.cancel_session_checked($1,$2,$3,$4,$5,$6,$7::jsonb) r',
    [sid, action, reason, token, confirm, corr, JSON.stringify(ctx)]).then((r) => r.rows[0].r);
const move = (sid, { date, start, end, reason = R, token, confirm = false, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.move_session_checked($1,$2,$3,$4,$5,$6,$7,$8) r',
    [sid, date, start, end, reason, token, confirm, corr]).then((r) => r.rows[0].r);
const uncancel = (sid, { reason = R, token, corr = null } = {}, uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.uncancel_session_checked($1,$2,$3,$4::jsonb,$5) r',
    [sid, reason, token, '{}', corr]).then((r) => r.rows[0].r);
const bulk = (items, reason = R, batch = randomUUID(), uid = ADMIN) =>
  as(uid, 'authenticated', 'authenticated', 'SELECT public.cancel_sessions_checked_bulk($1::jsonb,$2,$3,$4::jsonb) r',
    [JSON.stringify(items), reason, batch, '{}']).then((r) => r.rows[0].r);
const CORR = 'Correction: register belonged to another lesson';
const cancelNow = async (sid, opts = {}) => {
  const p = await preview(sid);
  return checked(sid, { token: p.token, confirm: true, corr: p.tier === 3 ? CORR : null, ...opts });
};

const sess = async (sid) => (await asSuper(`SELECT * FROM sessions WHERE id=$1`, [sid])).rows[0];
const overrides = async (sid) => (await asSuper(`SELECT * FROM session_cancel_overrides WHERE session_id=$1 ORDER BY created_at, id`, [sid])).rows;
const nOverrides = async () => (await asSuper(`SELECT count(*)::int n FROM session_cancel_overrides`)).rows[0].n;

// Hanoi wall clock, relative.
const clock = async (days = 0, hours = 0) => (await db.query(`
  SELECT to_char(t, 'YYYY-MM-DD') AS date, to_char(t, 'HH24:MI') AS time,
         to_char(t + interval '1 hour', 'HH24:MI') AS end_time, to_char(t, 'YYYY-MM') AS month
    FROM (SELECT date_trunc('minute', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + make_interval(days => $1::int, hours => $2::int) AS t) q`,
  [days, hours])).rows[0];
const PAST = await clock(-3), FUTURE = await clock(10), FAR = await clock(20);
// A past month no other case uses (37 days from PAST, so always another month): d24 locks its payroll.
const OLD = await clock(-40);

/** A class of its own, with its teacher, and one lesson on it. */
async function mk({ when = FUTURE, start = '17:30', end = '19:00', status = 'Scheduled', cid } = {}) {
  const teacherUid = randomUUID();
  const teacherId = randomUUID();
  if (!cid) {
    cid = randomUUID();
    await db.query(`INSERT INTO classes VALUES ($1,$2)`, [cid, teacherUid]);
    await db.query(`INSERT INTO user_roles VALUES ($1,'teacher')`, [teacherUid]);
  }
  const { id } = (await asSuper(
    `INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [cid, when.date, start, end, status, teacherId])).rows[0];
  const t = (await db.query(`SELECT default_teacher_user u FROM classes WHERE id=$1`, [cid])).rows[0].u;
  return { sid: id, cid, teacher: t, teacherId, date: when.date, month: when.date.slice(0, 7) };
}
const att = (sid, status, markedBy, student = randomUUID()) =>
  asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,$2,$3,$4)`, [sid, student, status, markedBy])
    .then(() => student);
const inv = (student, month, { recorded = 0, conf = 'auto_approved', frozen = false, status = 'issued', total = 540000 } = {}) =>
  asSuper(`INSERT INTO invoices(student_id,month,status,total_amount,base_amount,recorded_payment,confirmation_status,tuition_frozen)
           VALUES ($1,$2,$3,$4,$4,$5,$6,$7)`, [student, month, status, total, recorded, conf, frozen]);
const startedToday = async () => { const c = await clock(0, -2); return mk({ when: c, start: c.time, end: c.end_time }); };
const startsLaterToday = async () => { const c = await clock(0, 2); return mk({ when: c, start: c.time, end: c.end_time }); };

// --------------------------------------------------------------- mechanism
await section("block 3", async () => {
  ok('d1 txid_current() exists', (await db.query(`SELECT txid_current() > 0 AS ok`)).rows[0].ok === true);
  const before = (await asSuper(`SELECT count(*)::int n FROM session_cancel_override_events WHERE kind='guard_installed'`)).rows[0].n;
  let again = null;
  try { await db.exec(sqlOf(d2File)); } catch (e) { again = e.message; }
  ok('d2 the migration applies a second time unchanged', again === null, again);
  const after = (await asSuper(`SELECT count(*)::int n FROM session_cancel_override_events WHERE kind='guard_installed'`)).rows[0].n;
  ok('d2   one more guard_installed event, nothing else', after === before + 1 && (await nOverrides()) === 0, [before, after]);
  const defsAfter = [await fnDef('public.guard_cancelled_session_attendance()'),
                     await fnDef('public.set_attendance_excused_on_cancel()'),
                     await fnDef('public.session_held_evidence(uuid)')];
  ok('d39 20261027090000 functions and D1 unchanged by D2 (pg_get_functiondef identical)',
     defsAfter.every((d, i) => d === guardDefsBefore[i]));
  const trigAfter = (await db.query(`SELECT tgname, tgenabled, pg_get_triggerdef(t.oid) d FROM pg_trigger t
     WHERE NOT tgisinternal AND tgname NOT LIKE 'zz_session%' AND tgrelid NOT IN
       ('public.session_cancel_overrides'::regclass, 'public.session_cancel_override_events'::regclass) ORDER BY tgname`)).rows;
  ok('d39 every trigger that existed before is unchanged; D2 adds only its own',
     JSON.stringify(trigAfter) === JSON.stringify(triggersBefore), [trigAfter.length, triggersBefore.length]);
  const procs = (await db.query(`SELECT proname, prosecdef, proconfig FROM pg_proc WHERE pronamespace='public'::regnamespace
     AND proname IN ('session_change_preview','cancel_session_checked','move_session_checked','uncancel_session_checked',
       'cancel_sessions_checked_bulk','record_session_override_event','session_cancel_guard_status',
       'log_session_automation_refused','session_change_guard','_session_change_apply','_session_change_assess')`)).rows;
  ok('d4 every RPC and the trigger: SECURITY DEFINER, search_path=public',
     procs.length === 11 && procs.every((p) => p.prosecdef && (p.proconfig ?? []).includes('search_path=public')), procs);
  const g = (await db.query(`SELECT
     has_function_privilege('authenticated','public.cancel_session_checked(uuid,text,text,text,boolean,text,jsonb)','EXECUTE') a,
     has_function_privilege('service_role','public.cancel_session_checked(uuid,text,text,text,boolean,text,jsonb)','EXECUTE') s,
     has_function_privilege('anon','public.cancel_session_checked(uuid,text,text,text,boolean,text,jsonb)','EXECUTE') n,
     has_function_privilege('service_role','public.cancel_sessions_checked_bulk(jsonb,text,uuid,jsonb)','EXECUTE') sb,
     has_function_privilege('service_role','public.move_session_checked(uuid,date,time,time,text,text,boolean,text,jsonb)','EXECUTE') sm,
     has_function_privilege('authenticated','public._session_change_apply(uuid,text,jsonb,text,text,boolean,text,jsonb,text,uuid,boolean)','EXECUTE') ia,
     has_function_privilege('service_role','public._session_change_apply(uuid,text,jsonb,text,text,boolean,text,jsonb,text,uuid,boolean)','EXECUTE') is2,
     has_function_privilege('service_role','public.log_session_automation_refused(uuid,text)','EXECUTE') ls,
     has_function_privilege('authenticated','public.log_session_automation_refused(uuid,text)','EXECUTE') la,
     has_table_privilege('authenticated','public.session_cancel_overrides','INSERT') ti,
     has_table_privilege('authenticated','public.session_cancel_overrides','SELECT') tsel,
     has_table_privilege('service_role','public.session_cancel_overrides','INSERT') tsi`)).rows[0];
  ok('d4 grants: RPCs for authenticated only (not service_role, not anon); internals for nobody',
     g.a && !g.s && !g.n && !g.sb && !g.sm && !g.ia && !g.is2, g);
  ok('d4   automation log: service_role only', g.ls && !g.la, g);
  ok('d4   override table: authenticated SELECT only; service_role has the house-rule GRANT ALL',
     g.tsel && !g.ti && g.tsi, g);
});

// --------------------------------------------------------- bypass attempts
await section("d5/d6: no raw cancel, by anybody.", async () => {
  // d5/d6: no raw cancel, by anybody.
  const fut = await mk(), past = await mk({ when: PAST }), strong = await mk({ when: PAST, status: 'Held' });
  await att(strong.sid, 'Present', strong.teacher);
  for (const [who, run] of [['admin (authenticated)', asAdmin], ['service role', asService], ['superuser', asSuper]]) {
    for (const [label, s] of [['future NONE', fut], ['past NONE', past], ['STRONG', strong]]) {
      const r = await tryIt(() => run(`UPDATE sessions SET status='Canceled' WHERE id=$1`, [s.sid]));
      ok(`d5/d6 raw cancel by the ${who} on a ${label} lesson -> HC020`, r.code === 'HC020', r);
    }
  }
  ok('d5   rows unchanged, no override row',
     (await sess(fut.sid)).status === 'Scheduled' && (await sess(strong.sid)).status === 'Held' && (await nOverrides()) === 0);
  const r = await tryIt(() => as(fut.teacher, 'authenticated', 'authenticated', `UPDATE sessions SET status='Canceled' WHERE id=$1`, [fut.sid]));
  ok('d5   the class teacher (RLS allows the row) -> HC020', r.code === 'HC020', r);
});
await section("d7 + B-2: raw delete - the automation lane, and nobody else.", async () => {
  // d7 + B-2: raw delete - the automation lane, and nobody else.
  const a = await mk();
  ok('d7 service role deletes a future Scheduled NONE lesson (rebuild lane)',
     (await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [a.sid]))).ok && !(await sess(a.sid)));
  const b = await mk();
  let r = await tryIt(() => asAdmin(`DELETE FROM sessions WHERE id=$1`, [b.sid]));
  ok('B-2 the same delete by a signed-in admin (PostgREST) -> HC020, row kept', r.code === 'HC020' && !!(await sess(b.sid)), r);
  const started = await mk({ when: PAST });
  r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [started.sid]));
  ok('d7 service role: started NONE -> HC020', r.code === 'HC020', r);
  const marked = await mk(); await att(marked.sid, 'Present', marked.teacher);
  r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [marked.sid]));
  ok('d7 service role: future with a human Present -> HC020', r.code === 'HC020', r);
  const canc = await mk({ status: 'Canceled' });
  r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [canc.sid]));
  ok('d7 service role: future Canceled -> HC020', r.code === 'HC020', r);
  const soft = await mk();
  await asSuper(`INSERT INTO homeworks(class_id, created_by, created_at) VALUES ($1,$2,($3::date + time '12:00') AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
    [soft.cid, soft.teacher, soft.date]);
  r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [soft.sid]));
  ok('d7 service role: future with homework set that day (SOFT) -> HC020', r.code === 'HC020', r);
  r = await tryIt(() => asSuper(`DELETE FROM classes WHERE id=$1`, [marked.cid]));
  ok('d7/A-17 deleting the class does not cascade into sessions (RESTRICT)', r.code === '23503' && !!(await sess(marked.sid)), r);
});
await section("d8-d12: the flag.", async () => {
  // d8-d12: the flag.
  const a = await mk(), b = await mk();
  let e = await script(null, '', null, `SELECT set_config('hec.session_change_ack', gen_random_uuid()::text, true);
    UPDATE sessions SET status='Canceled' WHERE id='${a.sid}'`);
  ok('d8 forged flag (random uuid) then a cancel, superuser -> HC020', e?.code === 'HC020', e);
  e = await script(ADMIN, 'authenticated', 'authenticated', `SELECT set_config('hec.session_change_ack', 'not-a-uuid', true);
    UPDATE sessions SET status='Canceled' WHERE id='${a.sid}'`);
  ok('d8 malformed flag as admin -> HC020 (the setting is never cast)', e?.code === 'HC020', e);

  // d10, d11, d12: inside one transaction, after a real RPC.
  const pa = await preview(a.sid);
  e = await script(ADMIN, 'authenticated', 'authenticated', `
    SELECT public.cancel_session_checked('${a.sid}','cancel','${R}','${pa.token}',false,NULL,'{}'::jsonb);
    SELECT set_config('hec.session_change_ack', (SELECT id::text FROM session_cancel_overrides WHERE session_id='${a.sid}'), true);
    UPDATE sessions SET status='Canceled' WHERE id='${b.sid}'`);
  ok('d10 flag naming session A\'s override, write to session B in the same transaction -> HC020', e?.code === 'HC020', e);
  ok('d10   the whole transaction rolled back (A not cancelled, no row)', (await sess(a.sid)).status === 'Scheduled' && (await overrides(a.sid)).length === 0);
  e = await script(ADMIN, 'authenticated', 'authenticated', `
    SELECT public.cancel_session_checked('${a.sid}','cancel','${R}','${pa.token}',false,NULL,'{}'::jsonb);
    SELECT set_config('hec.session_change_ack', (SELECT id::text FROM session_cancel_overrides WHERE session_id='${a.sid}'), true);
    DELETE FROM sessions WHERE id='${a.sid}'`);
  ok('d11 a cancel override re-pointed at a delete of the same session -> HC020', e?.code === 'HC020', e);
  e = await script(ADMIN, 'authenticated', 'authenticated', `
    SELECT public.cancel_session_checked('${a.sid}','cancel','${R}','${pa.token}',false,NULL,'{}'::jsonb);
    UPDATE sessions SET status='Scheduled' WHERE id='${a.sid}'`);
  ok('d12 one acknowledgement, two writes (cancel, then raw un-cancel) -> HC020', e?.code === 'HC020', e);
  const pm = await preview(b.sid, 'move', { date: FAR.date, start_time: '17:30', end_time: '19:00' });
  e = await script(ADMIN, 'authenticated', 'authenticated', `
    SELECT public.move_session_checked('${b.sid}','${FAR.date}','17:30','19:00','${R}','${pm.token}',false,NULL,'{}'::jsonb);
    SELECT set_config('hec.session_change_ack', (SELECT id::text FROM session_cancel_overrides WHERE session_id='${b.sid}'), true);
    UPDATE sessions SET date = date + 1 WHERE id='${b.sid}'`);
  ok('d11 a move override re-used for a different date -> HC020', e?.code === 'HC020', e);

  // d9 replay: a real row from an EARLIER transaction.
  const c = await mk();
  await cancelNow(c.sid);
  const pu = await preview(c.sid, 'uncancel');
  await uncancel(c.sid, { token: pu.token });
  const old = (await overrides(c.sid)).find((o) => o.action === 'cancel');
  e = await script(null, '', null, `SELECT set_config('hec.session_change_ack', '${old.id}', true);
    UPDATE sessions SET status='Canceled' WHERE id='${c.sid}'`);
  ok('d9 replay: the flag names a real cancel override of this session from an earlier transaction -> HC020', e?.code === 'HC020', e);
  ok('d9   session still Scheduled', (await sess(c.sid)).status === 'Scheduled');
});
await section("d13: the audit tables, and TRUNCATE.", async () => {
  // d13: the audit tables, and TRUNCATE.
  const a = await mk();
  await cancelNow(a.sid);
  const oid = (await overrides(a.sid))[0].id;
  let r = await tryIt(() => asAdmin(`INSERT INTO session_cancel_overrides(actor_user_id,session_id,class_id,teacher_id,session_date,action,via,tier,level,settled,correction_mode,reason,confirmed,token,evidence,session_before,affected,invoices_before,refresh_pairs,payroll_month_locked,review_required)
     VALUES ($1,$2,$2,$2,'2026-01-01','cancel','single',0,'NONE',false,false,'x',false,'x','{}','{}','[]','[]','[]',false,false)`, [ADMIN, a.sid]));
  ok('d13 authenticated cannot INSERT an override row (no grant)', r.code === '42501', r);
  r = await tryIt(() => asAdmin(`UPDATE session_cancel_overrides SET reason='changed later on' WHERE id=$1`, [oid]));
  ok('d13 authenticated cannot UPDATE it', r.code === '42501', r);
  r = await tryIt(() => asAdmin(`DELETE FROM session_cancel_overrides WHERE id=$1`, [oid]));
  ok('d13 authenticated cannot DELETE it', r.code === '42501', r);
  r = await tryIt(() => asService(`INSERT INTO session_cancel_overrides(actor_user_id,session_id,class_id,teacher_id,session_date,action,via,tier,level,settled,correction_mode,reason,confirmed,token,evidence,session_before,affected,invoices_before,refresh_pairs,payroll_month_locked,review_required)
     VALUES ($1,$2,$2,$2,'2026-01-01','cancel','single',0,'NONE',false,false,'x',false,'x','{}','{}','[]','[]','[]',false,false)`, [ADMIN, a.sid]));
  ok('d13 service role (GRANT ALL) still cannot INSERT a row directly -> HC041', r.code === 'HC041', r);
  r = await tryIt(() => asService(`INSERT INTO session_cancel_override_events(kind) VALUES ('reviewed')`));
  ok('d13 service role cannot INSERT an event directly -> HC041', r.code === 'HC041', r);
  for (const [who, run] of [['service role', asService], ['superuser', asSuper]]) {
    r = await tryIt(() => run(`UPDATE session_cancel_overrides SET reason='changed later on' WHERE id=$1`, [oid]));
    ok(`d13 ${who} UPDATE -> HC040`, r.code === 'HC040', r);
    r = await tryIt(() => run(`DELETE FROM session_cancel_overrides WHERE id=$1`, [oid]));
    ok(`d13 ${who} DELETE -> HC040`, r.code === 'HC040', r);
    r = await tryIt(() => run(`UPDATE session_cancel_override_events SET payload='{}'`));
    ok(`d13 ${who} UPDATE of an event -> HC040`, r.code === 'HC040', r);
    r = await tryIt(() => run(`TRUNCATE session_cancel_override_events CASCADE`));
    ok(`d13 ${who} TRUNCATE of the events -> HC040`, r.code === 'HC040', r);
    r = await tryIt(() => run(`TRUNCATE sessions CASCADE`));
    ok(`d13 ${who} TRUNCATE sessions -> HC030`, r.code === 'HC030', r);
  }
  r = await tryIt(() => asSuper(`TRUNCATE session_cancel_overrides CASCADE`));
  ok('d13 superuser TRUNCATE of the overrides -> HC040', r.code === 'HC040', r);
  r = await tryIt(() => asSuper(`TRUNCATE classes CASCADE`));
  ok('d13/A-18 TRUNCATE classes CASCADE reaches the sessions statement trigger -> HC030', r.code === 'HC030', r);
  ok('d13   the override row is still there', (await overrides(a.sid)).length === 1);
});
await section("d14: trigger disabled -> the RPC refuses to work without its guard.", async () => {
  // d14: trigger disabled -> the RPC refuses to work without its guard.
  const a = await mk();
  const p = await preview(a.sid);
  await db.exec(`ALTER TABLE public.sessions DISABLE TRIGGER zz_session_change_guard_upd`);
  const r = await tryIt(() => checked(a.sid, { token: p.token }));
  const st = (await asAdmin(`SELECT public.session_cancel_guard_status() r`)).rows[0].r;
  await db.exec(`ALTER TABLE public.sessions ENABLE TRIGGER zz_session_change_guard_upd`);
  ok('d14 trigger disabled: cancel_session_checked -> HC050', r.code === 'HC050', r);
  ok('d14   nothing cancelled, no override row', (await sess(a.sid)).status === 'Scheduled' && (await overrides(a.sid)).length === 0);
  ok('d14   guard status reports the update trigger D and ok=false', st.update_trigger === 'D' && st.ok === false, st);
  const st2 = (await asAdmin(`SELECT public.session_cancel_guard_status() r`)).rows[0].r;
  ok('d14   re-enabled: status O/O/O, ok, installed_at set', st2.ok === true && st2.delete_trigger === 'O' &&
     st2.truncate_trigger === 'O' && !!st2.installed_at, st2);
  const e = await tryIt(() => as(PARENT, 'authenticated', 'authenticated', `SELECT public.session_cancel_guard_status()`));
  ok('d14   status is admin-only', e.code === '42501', e);
});
await section("d15 + B-4: status flip then cancel.", async () => {
  // d15 + B-4: status flip then cancel.
  const a = await mk({ when: PAST, status: 'Held' });
  await att(a.sid, 'Present', a.teacher);
  ok('d15 raw Held -> Scheduled by an admin is allowed (not guarded)',
     (await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [a.sid]))).ok !== undefined);
  let p = await preview(a.sid);
  ok('d15   the marks remain: still T2 (STRONG, not settled)', p.tier === 2 && p.level === 'STRONG', p.tier);
  const res = await checked(a.sid, { token: p.token, confirm: true });
  const o = (await overrides(a.sid))[0];
  ok('B-4 the Held -> Scheduled flip within 30 days is in erased_recently, review_required',
     res.erased_recently === true && o.review_required === true &&
     o.erased_recently.some((x) => x.what === 'session_status' && x.old_status === 'Held'), o.erased_recently);
  const b = await mk({ when: PAST, status: 'Held' });
  await asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [b.sid]);
  p = await preview(b.sid);
  ok('d15 an R-only lesson flipped back -> T1, still needs reason + confirm', p.tier === 1 && p.requires.confirm === true, p.tier);
});
await section("d16, d17, d18 + B-2/B-3: moves and re-classing.", async () => {
  // d16, d17, d18 + B-2/B-3: moves and re-classing.
  const past = await mk({ when: PAST });
  let r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [past.sid, FUTURE.date]));
  ok('d16 raw move of a past lesson to the future (service role) -> HC020', r.code === 'HC020', r);
  const pts = await mk();
  await asSuper(`INSERT INTO point_transactions(student_id,class_id,points,type,date,created_by) VALUES (gen_random_uuid(),$1,5,'participation',$2,$3)`,
    [pts.cid, pts.date, pts.teacher]);
  r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [pts.sid, FAR.date]));
  ok('d16 raw move of a future lesson with a same-day point row -> HC020', r.code === 'HC020', r);
  const free = await mk();
  r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [free.sid, FAR.date]));
  ok('d16 raw move of a future NONE lesson by automation -> allowed', r.ok !== undefined && (await sess(free.sid)).date !== null, r);
  const free2 = await mk();
  r = await tryIt(() => asAdmin(`UPDATE sessions SET date=$2 WHERE id=$1`, [free2.sid, FAR.date]));
  ok('B-2 the same raw move by a signed-in admin -> HC020 (fail-closed ruling)', r.code === 'HC020', r);
  r = await tryIt(() => as(free2.teacher, 'authenticated', 'authenticated', `UPDATE sessions SET date=$2 WHERE id=$1`, [free2.sid, FAR.date]));
  ok('B-2 ... and by the class teacher under their own policy -> HC020', r.code === 'HC020', r);
  const intoPast = await mk();
  r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [intoPast.sid, PAST.date]));
  ok('B-3 automation cannot move an untouched future lesson INTO THE PAST -> HC020', r.code === 'HC020', r);
  // into a locked month
  const lockMonth = (await clock(45)).date.slice(0, 7);
  await asSuper(`INSERT INTO payroll_periods VALUES ($1,'locked',now(),$2)`, [lockMonth, ADMIN]);
  const intoLocked = await mk();
  const lockDate = (await clock(45)).date;
  r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [intoLocked.sid, lockDate]));
  ok('B-3 automation cannot move a lesson into a month whose payroll is locked -> HC020', r.code === 'HC020', r);
  // into a month where a billed child's invoice is paid
  const destDay = await clock(75);
  const intoPaid = await mk();
  const kid = await att(intoPaid.sid, 'Present', null);
  await inv(kid, destDay.month, { recorded: 540000 });
  r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [intoPaid.sid, destDay.date]));
  ok('B-3 automation cannot move a lesson into a month where a billed child\'s bill is paid -> HC020', r.code === 'HC020', r);

  const today = await startedToday();
  const later = await clock(0, 3);
  r = await tryIt(() => asService(`UPDATE sessions SET start_time=$2, end_time=$3 WHERE id=$1`, [today.sid, later.time, later.end_time]));
  ok('d17 un-start by time: a lesson that started 2h ago moved to 3h from now -> HC020', r.code === 'HC020' || later.date !== today.date, r);

  r = await tryIt(() => asService(`UPDATE sessions SET class_id=$2 WHERE id=$1`, [past.sid, free.cid]));
  ok('d18 class_id change on a started lesson (service role) -> HC021', r.code === 'HC021', r);
  const rc = await mk();
  r = await tryIt(() => asAdmin(`UPDATE sessions SET class_id=$2 WHERE id=$1`, [rc.sid, free.cid]));
  ok('d18 class_id change by a signed-in admin, even future NONE -> HC021', r.code === 'HC021', r);
  r = await tryIt(() => asService(`UPDATE sessions SET class_id=$2 WHERE id=$1`, [rc.sid, free.cid]));
  ok('d18 class_id change by automation on a future NONE lesson -> allowed', r.ok !== undefined, r);
  r = await tryIt(() => asSuper(`UPDATE sessions SET status='Canceled', date=date+1 WHERE id=$1`, [pts.sid]));
  ok('d18 cancel + date change in one statement -> HC022', r.code === 'HC022', r);
});
await section("d19: evidence removed first -> documented residual, now flagged (B-4).", async () => {
  // d19: evidence removed first -> documented residual, now flagged (B-4).
  const a = await mk({ when: PAST, status: 'Held' });
  for (let i = 0; i < 2; i++) await att(a.sid, 'Present', a.teacher);
  await asAdmin(`DELETE FROM attendance WHERE session_id=$1`, [a.sid]);
  await asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [a.sid]);
  const p = await preview(a.sid);
  ok('d19 marks deleted and Held undone first: the lesson now reads NONE, T1', p.level === 'NONE' && p.tier === 1, [p.level, p.tier]);
  const res = await checked(a.sid, { token: p.token, confirm: true });
  const o = (await overrides(a.sid))[0];
  ok('d19   the stored evidence is NONE (truthful) ...', o.evidence.level === 'NONE');
  ok('B-4   ... and erased_recently lists both deleted Present marks and the status change; review_required',
     o.review_required && res.erased_recently &&
     o.erased_recently.filter((x) => x.what === 'attendance' && x.operation === 'DELETE').length === 2 &&
     o.erased_recently.some((x) => x.what === 'session_status'), o.erased_recently);
  const q = (await asAdmin(`SELECT count(*)::int n FROM session_cancel_review_queue WHERE override_id=$1`, [o.id])).rows[0].n;
  ok('B-4   so it is in the review queue although T1', q === 1);
  const b = await mk({ when: PAST });
  const k = await att(b.sid, 'Present', b.teacher);
  await asAdmin(`UPDATE attendance SET status='Excused' WHERE student_id=$1`, [k]);
  const pb = await preview(b.sid);
  await checked(b.sid, { token: pb.token, confirm: true });
  ok('B-4 a person-marked Present changed to Excused before the cancel is flagged too',
     (await overrides(b.sid))[0].erased_recently.some((x) => x.old_status === 'Present' && x.new_status === 'Excused'));
});

// --------------------------------------------------------------------- RPC
await section("d20 wrong role.", async () => {
  // d20 wrong role.
  const a = await mk();
  const p = await preview(a.sid);
  for (const [who, uid, jwt, role] of [['the class teacher', a.teacher, 'authenticated', 'authenticated'],
    ['a parent', PARENT, 'authenticated', 'authenticated'], ['a user with no role', NOBODY, 'authenticated', 'authenticated'],
    ['service role (no uid)', null, 'service_role', 'service_role'], ['anon', null, 'anon', 'anon']]) {
    const r = await tryIt(() => as(uid, jwt, role, 'SELECT public.cancel_session_checked($1,$2,$3,$4,$5,$6,$7::jsonb)',
      [a.sid, 'cancel', R, p.token, false, null, '{}']));
    ok(`d20 ${who} -> 42501`, r.code === '42501', r);
    const rp = await tryIt(() => as(uid, jwt, role, 'SELECT public.session_change_preview($1,$2,NULL)', [a.sid, 'cancel']));
    ok(`d20   preview too, for ${who}`, rp.code === '42501', rp);
  }
  ok('d20   nothing written', (await overrides(a.sid)).length === 0 && (await sess(a.sid)).status === 'Scheduled');
});
await section("d21 reasons.", async () => {
  // d21 reasons.
  const a = await mk();
  const p = await preview(a.sid);
  for (const [label, reason] of [['14 characters', 'Holiday today.'], ['15 spaces', ' '.repeat(15)],
    ['aaaaaaaaaaaaaaa', 'a'.repeat(15)], ['"  Bulk   cancellation " (canned)', '  Bulk   cancellation '],
    ['"No reason provided" padded', 'No reason   provided'], ['NULL', null]]) {
    const r = await tryIt(() => checked(a.sid, { token: p.token, reason }));
    ok(`d21 reason ${label} -> HC010`, r.code === 'HC010', r);
  }
  const res = await must('d21', () => checked(a.sid, { token: p.token, reason: '  Nghỉ lễ   Quốc khánh 2/9  ' }));
  ok('d21 a 15+ character Vietnamese reason passes; stored cleaned',
     !!res.override_id && (await overrides(a.sid))[0].reason === 'Nghỉ lễ Quốc khánh 2/9' &&
     (await sess(a.sid)).canceled_reason === 'Nghỉ lễ Quốc khánh 2/9', (await overrides(a.sid))[0]?.reason);
});
await section("d22 tokens.", async () => {
  // d22 tokens.
  const a = await mk(), b = await mk();
  const pa = await preview(a.sid);
  ok('d22 the token is stable across two previews', (await preview(a.sid)).token === pa.token);
  let r = await tryIt(() => checked(b.sid, { token: pa.token }));
  ok('d22 session A\'s token on session B -> HC011', r.code === 'HC011', r);
  r = await tryIt(() => checked(a.sid, { token: pa.token, action: 'delete' }));
  ok('d22 a cancel token used for a delete -> HC011', r.code === 'HC011', r);
  r = await tryIt(() => checked(a.sid, { token: pa.token }, ADMIN2));
  ok('d22 admin A\'s token used by admin B -> HC011', r.code === 'HC011', r);
  r = await tryIt(() => checked(a.sid, { token: null }));
  ok('d22 no token -> HC011', r.code === 'HC011', r);
  ok('d22 the right token works', !!(await must('d22', () => checked(a.sid, { token: pa.token }))).override_id);
  r = await tryIt(() => checked(a.sid, { token: pa.token }));
  ok('d22 reused after the cancel -> HC015 already_canceled', r.code === 'HC015' && r.message === 'already_canceled', r);
});
await section("d23 + B-6 staleness.", async () => {
  // d23 + B-6 staleness.
  const a = await mk({ when: PAST, status: 'Held' });
  await att(a.sid, 'Absent', a.teacher);
  let p = await preview(a.sid);
  await att(a.sid, 'Present', a.teacher);
  let r = await tryIt(() => checked(a.sid, { token: p.token, confirm: true }));
  ok('d23 stale by evidence: a teacher marks a child Present between preview and confirm -> HC011', r.code === 'HC011', r);
  p = await preview(a.sid);
  await asSuper(`UPDATE sessions SET notes='moved room' WHERE id=$1`, [a.sid]);
  r = await tryIt(() => checked(a.sid, { token: p.token, confirm: true }));
  ok('d23 stale by updated_at: notes edited -> HC011', r.code === 'HC011', r);
  p = await preview(a.sid);
  await asSuper(`UPDATE attendance SET marked_at = now() - interval '1 minute' WHERE session_id=$1`, [a.sid]);
  ok('d23 not stale by noise: marked_at rewritten -> the token still works',
     !!(await must('d23', () => checked(a.sid, { token: p.token, confirm: true }))).override_id);

  const b = await mk({ when: PAST });
  const kb = await att(b.sid, 'Present', null);
  await inv(kb, b.month);
  p = await preview(b.sid);
  await att(b.sid, 'Present', null);      // a child newly billed (seeded) - D1 hash unchanged (A-4)
  r = await tryIt(() => checked(b.sid, { token: p.token, confirm: true }));
  ok('B-6 a new billed child between preview and confirm stales the token', r.code === 'HC011', r);
  p = await preview(b.sid);
  await asSuper(`UPDATE invoices SET total_amount = total_amount + 1 WHERE student_id=$1`, [kb]);
  r = await tryIt(() => checked(b.sid, { token: p.token, confirm: true }));
  ok('B-6 a bill total recalculated between preview and confirm stales the token', r.code === 'HC011', r);
  p = await preview(b.sid);
  await asSuper(`UPDATE invoices SET confirmation_status='confirmed' WHERE student_id=$1`, [kb]);
  r = await tryIt(() => checked(b.sid, { token: p.token, confirm: true }));
  ok('B-6 a bill confirmed between preview and confirm stales the token', r.code === 'HC011', r);
});
await section("d24, d25, d33: tiers and correction mode.", async () => {
  // d24, d25, d33: tiers and correction mode.
  const t2 = await mk({ when: OLD, status: 'Held' });
  for (let i = 0; i < 2; i++) await att(t2.sid, 'Present', t2.teacher);
  let p = await preview(t2.sid);
  ok('d24 STRONG, month open -> T2', p.tier === 2 && p.requires.correction_reason === false, p.tier);
  await asSuper(`INSERT INTO payroll_periods VALUES ($1,'locked',now(),$2) ON CONFLICT (month) DO UPDATE SET status='locked'`, [t2.month, ADMIN]);
  let r = await tryIt(() => checked(t2.sid, { token: p.token, confirm: true }));
  ok('d24 payroll month locked between preview and confirm -> HC011', r.code === 'HC011', r);
  p = await preview(t2.sid);
  ok('d24 new preview: T3, correction reason required', p.tier === 3 && p.requires.correction_reason === true, p.tier);
  r = await tryIt(() => checked(t2.sid, { token: p.token, confirm: true }));
  ok('d24 T3 without correction_reason -> HC013', r.code === 'HC013', r);
  r = await tryIt(() => checked(t2.sid, { token: p.token, confirm: true, corr: 'short one' }));
  ok('d24 T3 with a short correction_reason -> HC013', r.code === 'HC013', r);
  const res = await must('d33', () => checked(t2.sid, { token: p.token, confirm: true, corr: 'Register was entered for the wrong class' }));
  const o = (await overrides(t2.sid))[0] ?? {};
  ok('d33 T3 row: correction_mode, both reasons, payroll_month_locked, review_required',
     o.correction_mode && o.correction_reason === 'Register was entered for the wrong class' && o.reason === R &&
     o.payroll_month_locked && o.review_required && res.tier === 3, o);
  const q = await asAdmin(`SELECT * FROM session_cancel_review_queue WHERE override_id=$1`, [o.id]);
  ok('d33 it is in the review queue, tuition_state pending', q.rows.length === 1 && q.rows[0].tuition_state === 'pending', q.rows[0]);
  r = await tryIt(() => asAdmin(`SELECT public.record_session_override_event($1,'reviewed',$2::jsonb)`, [o.id, '{"note":"ok"}']));
  ok('d33 a reviewed note under 15 characters -> HC010', r.code === 'HC010', r);
  await asAdmin(`SELECT public.record_session_override_event($1,'reviewed',$2::jsonb)`, [o.id, JSON.stringify({ note: 'Checked with the teacher, correct' })]);
  ok('d33 after a reviewed event it leaves the queue',
     (await asAdmin(`SELECT count(*)::int n FROM session_cancel_review_queue WHERE override_id=$1`, [o.id])).rows[0].n === 0);

  const t1 = await mk({ when: PAST });
  p = await preview(t1.sid);
  r = await tryIt(() => checked(t1.sid, { token: p.token }));
  ok('d25 T1 (started, NONE) without confirm -> HC012', p.tier === 1 && r.code === 'HC012', r);
  const t0 = await mk();
  p = await preview(t0.sid);
  ok('d25 T0 without confirm works', p.tier === 0 && p.requires.confirm === false && !!(await checked(t0.sid, { token: p.token })).override_id);
  ok('d25   T0 is not in the review queue', (await overrides(t0.sid))[0].review_required === false);
});
await section("d26, d27, d38: STRONG cancellable; evidence read BEFORE; row content.", async () => {
  // d26, d27, d38: STRONG cancellable; evidence read BEFORE; row content.
  const a = await mk({ when: PAST, status: 'Held' });
  const kids = [];
  for (let i = 0; i < 3; i++) kids.push(await att(a.sid, 'Present', a.teacher));
  await inv(kids[0], a.month, { recorded: 540000 });
  await inv(kids[1], a.month);
  const p = await preview(a.sid);
  const res = await must('d26', () => checked(a.sid, { token: p.token, confirm: true, corr: CORR }));
  const o = (await overrides(a.sid))[0] ?? { evidence: {} };
  const marks = (await asSuper(`SELECT status FROM attendance WHERE session_id=$1`, [a.sid])).rows.map((x) => x.status);
  ok('d26 STRONG is cancellable (ruling 1): cancelled, every mark now Excused',
     (await sess(a.sid)).status === 'Canceled' && marks.length === 3 && marks.every((m) => m === 'Excused'), marks);
  const present = o.evidence.items.find((i) => i.type === 'attendance_present');
  ok('d26/d38 the stored evidence was read BEFORE: STRONG, attendance_present count 3',
     o.evidence.level === 'STRONG' && present?.count === 3, o.evidence.level);
  ok('d27 row: actor, reason, tier 3 (STRONG + a paid bill), token, via single, txid set',
     o.actor_user_id === ADMIN && o.reason === R && o.tier === 3 && o.token === p.token && o.via === 'single' && Number(o.txid) > 0, o.tier);
  ok('d27 affected = the three children, with the month and their status before the cancel',
     o.affected.length === 3 && o.affected.every((x) => x.month === a.month && x.status === 'Present' && x.marked_by_person), o.affected);
  const invRows = (await asSuper(`SELECT id, total_amount, recorded_payment FROM invoices WHERE student_id = ANY($1::uuid[]) AND month=$2 ORDER BY id`, [kids, a.month])).rows;
  ok('d27 invoices_before = the stored invoice rows (copied, not priced)',
     o.invoices_before.length === 2 && invRows.every((r) => o.invoices_before.some((x) => x.id === r.id && x.total_amount === r.total_amount && x.recorded_payment === r.recorded_payment)), o.invoices_before);
  ok('d27 no paid_amount anywhere in the row', !JSON.stringify(o).includes('paid_amount'));
  ok('d27 session_before is the row before (Held), the RPC returns affected + refresh_pairs',
     o.session_before.status === 'Held' && res.affected.length === 3 && res.refresh_pairs.length === 3);
  const r = await tryIt(() => asSuper(`INSERT INTO attendance(session_id,student_id,status) VALUES ($1,gen_random_uuid(),'Present')`, [a.sid]));
  ok('d39 after the cancel, a Present mark is still refused by 20261027090000 (23514)', r.code === '23514', r);
  const corr = await tryIt(() => checked(a.sid, { token: p.token, confirm: true, corr: 'x'.repeat(5) }));
  ok('d30 already cancelled -> HC015 already_canceled', corr.code === 'HC015', corr);
});
await section("settled: the restated rule agrees with D1 on the source month.", async () => {
  // settled: the restated rule agrees with D1 on the source month.
  const cases = [{ recorded: 1 }, { conf: 'confirmed' }, { conf: 'adjusted' }, { frozen: true }, { status: 'paid' },
    { status: 'partial' }, {}, { conf: 'needs_review', recorded: null }];
  let agree = 0;
  for (const c of cases) {
    const s = await mk({ when: PAST });
    const k = await att(s.sid, 'Absent', null);
    await inv(k, s.month, c);
    const d1 = (await asSuper(`SELECT public.session_held_evidence($1) r`, [s.sid])).rows[0].r.settled.tuition;
    const d2 = (await asSuper(`SELECT public.session_month_tuition_settled($1,$2) r`, [s.sid, s.month])).rows[0].r;
    if (d1 === d2) agree++;
  }
  ok('B-3 session_month_tuition_settled agrees with D1 settled.tuition on 8 invoice states', agree === cases.length, agree);
});
await section("d28 atomicity, d31 moves, B-1, B-3 through the checked path.", async () => {
  // d28 atomicity, d31 moves, B-1, B-3 through the checked path.
  const a = await mk({ when: PAST, status: 'Held' });
  const k = await att(a.sid, 'Present', a.teacher);
  const occupant = await mk({ when: FUTURE, cid: a.cid });
  let p = await preview(a.sid, 'move', { date: FUTURE.date, start_time: '17:30', end_time: '19:00' });
  let r = await tryIt(() => move(a.sid, { date: FUTURE.date, start: '17:30', end: '19:00', token: p.token, confirm: true }));
  ok('d28 checked move into an occupied slot -> 23505 (slot_taken)', r.code === '23505', r);
  ok('d28   and no override row remains (atomic)', (await overrides(a.sid)).length === 0);
  void occupant;
  p = await preview(a.sid, 'move', { date: FUTURE.date, start_time: '08:00', end_time: '09:30' });
  ok('d31 preview of a move: kind move, destination reported, T2', p.kind === 'move' && p.tier === 2 &&
     p.destination?.month === FUTURE.month, p);
  r = await tryIt(() => move(a.sid, { date: FUTURE.date, start: '08:00', end: '09:30', token: p.token }));
  ok('d31 T2 move without confirm -> HC012', r.code === 'HC012', r);
  const res = await must('d31', () => move(a.sid, { date: FUTURE.date, start: '08:00', end: '09:30', token: p.token, confirm: true }));
  const s = await sess(a.sid);
  const o = (await overrides(a.sid))[0] ?? { change: {} };
  ok('d31 checked move of a past lesson: new date/time, a move row with the change and destination flags',
     s.date !== null && o.action === 'move' && o.change.new_date === FUTURE.date && o.change.new_start_time === '08:00:00' &&
     typeof o.change.destination?.any === 'boolean' && o.review_required === true, o.change);
  ok('d31   marks unchanged by the move', (await asSuper(`SELECT status FROM attendance WHERE student_id=$1`, [k])).rows[0].status === 'Present');
  ok('B-7 a move returns refresh_pairs (both months when it crosses one)', Array.isArray(res.refresh_pairs) && res.refresh_pairs.length >= 1, res.refresh_pairs);

  // B-1: a time-only change of a started lesson.
  const b = await mk({ when: PAST, status: 'Held' });
  await att(b.sid, 'Present', b.teacher);
  p = await preview(b.sid, 'move', { date: b.date, start_time: '18:00', end_time: '19:30' });
  ok('B-1 preview of a time-only edit that leaves the lesson started: kind null, refuse bad_change',
     p.kind === null && p.refuse_code === 'bad_change' && p.allowed === false, [p.kind, p.refuse_code]);
  r = await tryIt(() => move(b.sid, { date: b.date, start: '18:00', end: '19:30', token: p.token, confirm: true }));
  ok('B-1 move_session_checked on it -> HC015 bad_change, NOT HC050', r.code === 'HC015' && r.message === 'bad_change', r);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET start_time='18:00', end_time='19:30' WHERE id=$1`, [b.sid]));
  ok('B-1 ... and the plain update by the admin is accepted (unguarded edit)', r.ok !== undefined && (await sess(b.sid)).start_time === '18:00:00', r);
  r = await tryIt(() => asAdmin(`UPDATE sessions SET end_time='19:45' WHERE id=$1`, [b.sid]));
  ok('B-1 an end_time-only edit is accepted too', r.ok !== undefined, r);
  p = await preview(b.sid, 'move', { date: b.date, start_time: '18:00', end_time: '17:00' });
  ok('d31 end before start -> bad_change', p.refuse_code === 'bad_change');

  // B-3: into the past, into a locked month - through the checked path.
  const c = await mk();
  p = await preview(c.sid, 'move', { date: PAST.date, start_time: '17:30', end_time: '19:00' });
  ok('B-3 a future NONE lesson moved into the past: started at the destination -> T1, confirm', p.tier === 1 && p.requires.confirm, p.tier);
  r = await tryIt(() => move(c.sid, { date: PAST.date, start: '17:30', end: '19:00', token: p.token }));
  ok('B-3   without confirm -> HC012', r.code === 'HC012', r);
  const lockDay = await clock(45);
  const d = await mk();
  await att(d.sid, 'Present', d.teacher);
  p = await preview(d.sid, 'move', { date: lockDay.date, start_time: '17:30', end_time: '19:00' });
  ok('B-3 a STRONG lesson moved into a locked payroll month -> T3 (worse of source and destination)',
     p.tier === 3 && p.destination.payroll_month_locked === true && p.requires.correction_reason, [p.tier, p.destination]);
});
await section("d29 delete.", async () => {
  // d29 delete.
  const t0 = await mk();
  await att(t0.sid, 'Present', null);
  let p = await preview(t0.sid, 'delete');
  const r0 = await checked(t0.sid, { action: 'delete', token: p.token });
  const o0 = (await overrides(t0.sid))[0];
  ok('d29 T0 delete works; deleted_rows holds the seeded attendance row',
     !!r0.override_id && !(await sess(t0.sid)) && o0.deleted_rows.attendance.length === 1 && o0.review_required === false, o0.deleted_rows);
  ok('d29   the override row outlives the session (no FK)', o0.session_id === t0.sid);
  const t1 = await mk({ when: PAST });
  p = await preview(t1.sid, 'delete');
  let r = await tryIt(() => checked(t1.sid, { action: 'delete', token: p.token }));
  ok('d29 T1 delete without confirm -> HC012', r.code === 'HC012', r);
  ok('d29 T1 delete with confirm works, review_required', !!(await must('d29', () => checked(t1.sid, { action: 'delete', token: p.token, confirm: true }))).override_id &&
     (await overrides(t1.sid))[0]?.review_required === true);
  const ev = await mk({ when: PAST, status: 'Held' });
  await att(ev.sid, 'Present', ev.teacher);
  p = await preview(ev.sid, 'delete');
  ok('d29 preview: delete with evidence -> allowed false, use_cancel', p.allowed === false && p.refuse_code === 'use_cancel');
  r = await tryIt(() => checked(ev.sid, { action: 'delete', token: p.token, confirm: true }));
  ok('d29 delete with evidence -> HC014', r.code === 'HC014', r);
  await must('d29 cancel', () => cancelNow(ev.sid));
  p = await preview(ev.sid, 'delete');
  ok('d29 cancel-then-delete: after the cancel the lesson reads NONE (marks Excused, not Held)', p.level === 'NONE' && p.allowed, p.level);
  await must('d29 delete', () => checked(ev.sid, { action: 'delete', token: p.token, confirm: true }));
  const rows = await overrides(ev.sid);
  ok('d29   two audited steps, the first holding the STRONG evidence',
     rows.length === 2 && rows[0].action === 'cancel' && rows[0].evidence.level === 'STRONG' && rows[1].action === 'delete', rows.map((x) => x.action));
  r = await tryIt(() => checked(randomUUID(), { token: 'x' }));
  ok('d30 unknown id -> P0002', r.code === 'P0002', r);
  r = await tryIt(() => checked(null, { token: 'x' }));
  ok('d30 NULL id -> 22004', r.code === '22004', r);
  r = await tryIt(() => checked(t1.sid, { action: 'move', token: 'x' }));
  ok('d30 cancel_session_checked with action move -> HC015 bad_action', r.code === 'HC015' && r.message === 'bad_action', r);
});
await section("d32 un-cancel.", async () => {
  // d32 un-cancel.
  const a = await mk({ when: PAST, status: 'Held' });
  const k = await att(a.sid, 'Present', a.teacher);
  await cancelNow(a.sid);
  const before = await sess(a.sid);
  let r = await tryIt(() => asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [a.sid]));
  ok('d32 raw un-cancel by an admin -> HC020', r.code === 'HC020', r);
  r = await tryIt(() => asService(`UPDATE sessions SET status='Held' WHERE id=$1`, [a.sid]));
  ok('d32 raw un-cancel by automation -> HC020', r.code === 'HC020', r);
  let p = await preview(a.sid, 'uncancel');
  ok('d32 preview: confirm not required, marks_excused_now 1', p.requires.confirm === false && p.after_cancel.marks_excused_now === 1, p.after_cancel);
  r = await tryIt(() => uncancel(a.sid, { token: p.token, reason: 'too short' }));
  ok('d32 short reason -> HC010', r.code === 'HC010', r);
  await must('d32', () => uncancel(a.sid, { token: p.token }));
  const s = await sess(a.sid);
  ok('d32 RPC -> Scheduled; canceled_* left as history', s.status === 'Scheduled' && s.canceled_reason === before.canceled_reason &&
     s.canceled_by === before.canceled_by && s.canceled_at !== null);
  ok('d32   attendance still Excused (OQ-2), override row uncancel',
     (await asSuper(`SELECT status FROM attendance WHERE student_id=$1`, [k])).rows[0].status === 'Excused' &&
     (await overrides(a.sid)).some((o) => o.action === 'uncancel'));
  ok('d32   a teacher can mark Present again (the cancelled-lesson guard no longer applies)',
     (await tryIt(() => asSuper(`UPDATE attendance SET status='Present', marked_by=$2 WHERE student_id=$1`, [k, a.teacher]))).ok !== undefined);
  p = await preview(a.sid, 'uncancel');
  ok('d32 un-cancel of a lesson that is not cancelled -> not_canceled', p.refuse_code === 'not_canceled');
  // occupied slot
  const b = await mk();
  await cancelNow(b.sid);
  await mk({ when: FUTURE, cid: b.cid });            // a replacement lesson now in the slot
  p = await preview(b.sid, 'uncancel');
  r = await tryIt(() => uncancel(b.sid, { token: p.token }));
  ok('d32 un-cancel into an occupied slot -> 23505, nothing written',
     r.code === '23505' && (await overrides(b.sid)).filter((o) => o.action === 'uncancel').length === 0, r);
});
await section("d34 events.", async () => {
  // d34 events.
  const a = await mk({ when: PAST });
  const k = await att(a.sid, 'Present', null);
  await inv(k, a.month);
  const res = await cancelNow(a.sid);
  ok('d34 a fresh cancel is not yet in tuition_pending (under 10 minutes)',
     (await asAdmin(`SELECT count(*)::int n FROM session_cancel_tuition_pending WHERE override_id=$1`, [res.override_id])).rows[0].n === 0);
  const def = (await db.query(`SELECT pg_get_viewdef('public.session_cancel_tuition_pending'::regclass) d`)).rows[0].d;
  ok('d34 tuition_pending predicate: older than 10 minutes, no tuition_refreshed event',
     /00:10:00|10 mins|10 minutes/.test(def) && /tuition_refreshed/.test(def), def.slice(0, 200));
  const evId = (await asAdmin(`SELECT public.record_session_override_event($1,'tuition_refreshed',$2::jsonb) r`,
    [res.override_id, JSON.stringify({ results: [{ student_id: k, month: a.month, ok: true, totalAmount: 1 }] })])).rows[0].r;
  const e = (await asSuper(`SELECT * FROM session_cancel_override_events WHERE id=$1`, [evId])).rows[0];
  ok('d34 tuition_refreshed: attached kept apart, invoices_after re-read by SQL',
     e.payload.attached.results.length === 1 && e.payload.invoices_after.length === 1 &&
     e.payload.invoices_after[0].student_id === k && e.actor_user_id === ADMIN, e.payload);
  let r = await tryIt(() => as(PARENT, 'authenticated', 'authenticated', `SELECT public.record_session_override_event($1,'reviewed','{}')`, [res.override_id]));
  ok('d34 non-admin -> 42501', r.code === '42501', r);
  r = await tryIt(() => asAdmin(`SELECT public.record_session_override_event($1,'guard_installed','{}')`, [res.override_id]));
  ok('d34 unknown kind -> HC015', r.code === 'HC015', r);
  r = await tryIt(() => asAdmin(`SELECT public.record_session_override_event($1,'reviewed','{}')`, [randomUUID()]));
  ok('d34 unknown override -> P0002', r.code === 'P0002', r);
});
await section("d35 bulk + B-5 cap.", async () => {
  // d35 bulk + B-5 cap.
  const t0s = [await mk(), await mk(), await mk()];
  const t1 = await mk({ when: PAST });
  const t2 = await mk({ when: PAST, status: 'Held' }); await att(t2.sid, 'Present', t2.teacher);
  const stale = await mk();
  const tok = async (s) => (await preview(s.sid)).token;
  const items = [];
  for (const s of t0s) items.push({ id: s.sid, token: await tok(s) });
  items.push({ id: t1.sid, token: await tok(t1) });                                   // no confirm
  const p2tier3 = (await preview(t2.sid)).tier === 3;
  items.push({ id: t2.sid, token: await tok(t2), confirm: true, reason: 'Class abandoned after roll-call, fire alarm', correction_reason: p2tier3 ? CORR : undefined });
  const st = await tok(stale);
  await asSuper(`UPDATE sessions SET notes='changed' WHERE id=$1`, [stale.sid]);
  items.push({ id: stale.sid, token: st });
  const batch = randomUUID();
  const out = await bulk(items, 'Public holiday, school closed', batch);
  ok('d35 bulk: done 4, refused 2', out.done.length === 4 && out.refused.length === 2, out);
  const codes = Object.fromEntries(out.refused.map((x) => [x.id, x.code]));
  ok('d35   refused codes: T1 without confirm HC012, stale HC011', codes[t1.sid] === 'HC012' && codes[stale.sid] === 'HC011', codes);
  const rows = (await asSuper(`SELECT * FROM session_cancel_overrides WHERE batch_id=$1`, [batch])).rows;
  ok('d35   all done rows share batch_id, via bulk; T2 kept its own reason',
     rows.length === 4 && rows.every((x) => x.via === 'bulk') &&
     rows.find((x) => x.session_id === t2.sid).reason === 'Class abandoned after roll-call, fire alarm', rows.length);
  ok('d35   refused ones untouched', (await sess(t1.sid)).status === 'Scheduled' && (await sess(stale.sid)).status === 'Scheduled');
  const t2b = await mk({ when: PAST, status: 'Held' }); await att(t2b.sid, 'Present', t2b.teacher);
  const o2 = await bulk([{ id: t2b.sid, token: await tok(t2b), confirm: true, correction_reason: CORR }]);
  ok('d35 a T2 item with the batch reason only -> refused HC017 (each one explained)',
     o2.refused.length === 1 && o2.refused[0].code === 'HC017', o2);
  const many = Array.from({ length: 51 }, () => ({ id: randomUUID(), token: 'x' }));
  const r = await tryIt(() => bulk(many));
  ok('B-5 51 items -> HC016 too_many (cap 50)', r.code === 'HC016', r);
  const r2 = await tryIt(() => as(t2b.teacher, 'authenticated', 'authenticated', `SELECT public.cancel_sessions_checked_bulk('[]'::jsonb,'x',gen_random_uuid(),'{}')`));
  ok('d35 bulk by a non-admin -> 42501', r2.code === '42501', r2);
});
await section("d36 views and the table are admin-only.", async () => {
  // d36 views and the table are admin-only.
  const a = await mk();
  await cancelNow(a.sid);
  const n = async (uid, sql) => (await as(uid, 'authenticated', 'authenticated', sql)).rows[0].n;
  ok('d36 admin reads the override table and the review queue',
     (await n(ADMIN, `SELECT count(*)::int n FROM session_cancel_overrides`)) > 0 &&
     (await n(ADMIN, `SELECT count(*)::int n FROM session_cancel_review_queue`)) > 0);
  ok('d36 the class teacher sees zero rows in all three',
     (await n(a.teacher, `SELECT count(*)::int n FROM session_cancel_overrides`)) === 0 &&
     (await n(a.teacher, `SELECT count(*)::int n FROM session_cancel_review_queue`)) === 0 &&
     (await n(a.teacher, `SELECT count(*)::int n FROM session_cancel_override_events`)) === 0);
  ok('d36 a parent sees zero rows', (await n(PARENT, `SELECT count(*)::int n FROM session_cancel_review_queue`)) === 0);
});
await section("d37 lock order, structurally: the row lock is the first statement on", async () => {
  // d37 lock order, structurally: the row lock is the first statement on
  // sessions in the checked path, before the evidence read and the write.
  const def = await fnDef('public._session_change_apply(uuid,text,jsonb,text,text,boolean,text,jsonb,text,uuid,boolean)');
  const iLock = def.indexOf('FOR UPDATE'), iAssess = def.indexOf('_session_change_assess('), iIns = def.indexOf('INSERT INTO public.session_cancel_overrides'),
    iUpd = def.indexOf("SET status = 'Canceled'");
  ok('d37 FOR UPDATE on the session precedes the evidence read, the audit insert and the write',
     iLock > 0 && iLock < iAssess && iAssess < iIns && iIns < iUpd, [iLock, iAssess, iIns, iUpd]);
});

// -------------------------------------------------------- automatic paths
await section("d40 rebuild deletes, as the service role.", async () => {
  // d40 rebuild deletes, as the service role.
  const fut = await mk();
  ok('d40 rebuild: future Scheduled NONE -> deleted', (await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [fut.sid]))).ok && !(await sess(fut.sid)));
  const st = await startedToday();
  let r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [st.sid]));
  ok("d40 rebuild: TODAY's lesson that started two hours ago -> kept (HC020)", r.code === 'HC020' && !!(await sess(st.sid)), r);
  const later = await startsLaterToday();
  r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [later.sid]));
  ok("d40 rebuild: today's lesson starting in two hours -> deleted", r.ok !== undefined && !(await sess(later.sid)), r);
  const mark = await mk(); await att(mark.sid, 'Absent', mark.teacher);
  r = await tryIt(() => asService(`DELETE FROM sessions WHERE id=$1`, [mark.sid]));
  ok('d40 rebuild: future lesson with a human mark -> kept', r.code === 'HC020', r);
  const id = (await asService(`SELECT public.log_session_automation_refused($1,'schedule-sessions') r`, [st.sid])).rows[0].r;
  const e = (await asSuper(`SELECT * FROM session_cancel_override_events WHERE id=$1`, [id])).rows[0];
  ok('d40 log_session_automation_refused writes one automation_refused event and nothing else',
     e.kind === 'automation_refused' && e.override_id === null && e.payload.session_id === st.sid && !!(await sess(st.sid)), e);
  r = await tryIt(() => asAdmin(`SELECT public.log_session_automation_refused($1,'x')`, [st.sid]));
  ok('d40   an admin cannot call it', r.code === '42501', r);
  // d41 insert, teacher update
  r = await tryIt(() => asService(`INSERT INTO sessions(class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,'07:00','08:00',gen_random_uuid())`, [st.cid, FAR.date]));
  ok('d41 rebuild insert -> succeeds', r.ok !== undefined, r);
  r = await tryIt(() => asService(`UPDATE sessions SET teacher_id=gen_random_uuid() WHERE id=$1`, [st.sid]));
  ok('d41 rebuild teacher update on a started lesson -> succeeds (not guarded, D4)', r.ok !== undefined, r);
  // d42 include-held time update
  const held = await mk({ when: PAST, status: 'Held' });
  r = await tryIt(() => asService(`UPDATE sessions SET start_time='16:00', end_time='17:30' WHERE id=$1`, [held.sid]));
  ok('d42 include-held: time update on a past Held lesson (still started) -> succeeds', r.ok !== undefined, r);
});
await section("d43 stars engine shape, signed in as the chosen teacher.", async () => {
  // d43 stars engine shape, signed in as the chosen teacher.
  const a = await startedToday();
  let r = await tryIt(() => as(a.teacher, 'authenticated', null, `UPDATE sessions SET status='Held' WHERE id=$1 AND status='Scheduled'`, [a.sid]));
  ok('d43 stars Scheduled -> Held on a started lesson -> succeeds', r.ok !== undefined && (await sess(a.sid)).status === 'Held', r);
  r = await tryIt(() => as(a.teacher, 'authenticated', null, `UPDATE sessions SET status='Scheduled' WHERE id=$1 AND status='Held'`, [a.sid]));
  ok('d43 stars Held -> Scheduled -> succeeds', r.ok !== undefined && (await sess(a.sid)).status === 'Scheduled', r);
  r = await tryIt(() => as(a.teacher, 'authenticated', 'authenticated', `UPDATE sessions SET status='Held' WHERE id=$1`, [a.sid]));
  ok('d43 mark-attendance-style flip by the teacher under RLS -> succeeds', r.ok !== undefined, r);
  ok('d43   no override row', (await overrides(a.sid)).length === 0);
  // d44, d45, d47
  r = await tryIt(() => asService(`INSERT INTO sessions(class_id,date,start_time,end_time,status,teacher_id) VALUES ($1,$2,'06:00','07:00','Canceled',gen_random_uuid())`, [a.cid, FAR.date]));
  ok('d44 inserting a session as Canceled is not guarded (D4)', r.ok !== undefined, r);
  const b = await mk();
  r = await tryIt(() => asService(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ($1,gen_random_uuid(),'Present',NULL),($1,gen_random_uuid(),'Absent',NULL)`, [b.sid]));
  ok('d45 auto-mark / repair inserts (marked_by NULL) succeed', r.ok !== undefined, r);
  ok('d45   and do not raise the tier', (await preview(b.sid)).tier === 0);
  r = await tryIt(() => asService(`DELETE FROM attendance WHERE session_id=$1 AND marked_by IS NULL`, [b.sid]));
  ok('d47 enrollment-RPC-shaped delete of placeholders succeeds', r.ok !== undefined, r);
  // d46 import-shaped upsert
  const c = await mk({ when: PAST, status: 'Held' });
  const nid = randomUUID();
  r = await tryIt(() => asService(`INSERT INTO sessions(id,class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,$3,'05:00','06:00',gen_random_uuid())
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`, [nid, c.cid, FAR.date]));
  ok('d46 import upsert of a new session -> inserted', r.ok !== undefined && !!(await sess(nid)), r);
  r = await tryIt(() => asService(`INSERT INTO sessions(id,class_id,date,start_time,end_time,teacher_id,status) VALUES ($1,$2,$3,'17:30','19:00',gen_random_uuid(),'Canceled')
      ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`, [c.sid, c.cid, c.date]));
  ok('d46 import upsert that cancels an existing lesson -> HC020', r.code === 'HC020', r);
  r = await tryIt(() => asService(`INSERT INTO sessions(id,class_id,date,start_time,end_time,teacher_id,notes) VALUES ($1,$2,$3,'17:30','19:00',gen_random_uuid(),'imported note')
      ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes`, [c.sid, c.cid, c.date]));
  ok('d46 import upsert changing only notes -> updated', r.ok !== undefined && (await sess(c.sid)).notes === 'imported note', r);
});
await section("Rollout states (B-9): D1 function dropped after D2 -> every guarded ra", async () => {
  // Rollout states (B-9): D1 function dropped after D2 -> every guarded raw write raises.
  const x = await makeDb();
  await x.exec(sqlOf(d2File));
  const cid = randomUUID();
  await x.query(`INSERT INTO classes VALUES ($1, gen_random_uuid())`, [cid]);
  const fut = await clock(10);
  const sid = (await x.query(`INSERT INTO sessions(class_id,date,start_time,end_time,teacher_id) VALUES ($1,$2,'17:30','19:00',gen_random_uuid()) RETURNING id`, [cid, fut.date])).rows[0].id;
  await x.exec(`DROP FUNCTION public.session_held_evidence(uuid)`);
  let code = null;
  try { await x.query(`DELETE FROM sessions WHERE id=$1`, [sid]); } catch (e) { code = e.code; }
  ok('B-9 rollout: D1 function dropped after the guard -> even an automation-lane delete is refused (closed)', code !== null, code);
  await x.close();
});

// ------------------------------------- revision 1 (D-review-2 findings)
await section('R1 F-1 re-parented register (probe E2)', async () => {
  const a = await mk({ when: PAST, status: 'Held' });
  const other = await mk({ when: FAR, cid: a.cid });
  const k1 = await att(a.sid, 'Present', a.teacher), k2 = await att(a.sid, 'Present', a.teacher);
  await inv(k1, a.month, { recorded: 540000 });
  const p0 = await preview(a.sid);
  ok('F-1 E2 taught + paid lesson previews as T3, STRONG', p0.tier === 3 && p0.level === 'STRONG', [p0.tier, p0.level]);
  const r = await tryIt(() => asAdmin(`UPDATE attendance SET session_id=$2 WHERE session_id=$1`, [a.sid, other.sid]));
  ok('F-1 E2 the admin re-points the register at another lesson (still possible: refusing it is D4)', r.ok !== undefined, r);
  const p1 = await preview(a.sid);
  ok('F-1 preview after the re-parent: tier drops below 3 (marks gone, only Held left) BUT review_required and erased_recently say why',
     p1.tier < 3 && p1.review_required === true &&
     p1.erased_recently.filter((x) => x.what === 'attendance_reparented').length === 2, [p1.tier, p1.review_required, p1.erased_recently]);
  const res = await must('F-1', () => checked(a.sid, { token: p1.token, confirm: true }));
  const o = (await overrides(a.sid))[0] ?? { erased_recently: [] };
  ok('F-1 the cancel is stored review_required with both re-parented rows (students, destination lesson)',
     res.review_required === true && o.review_required === true &&
     o.erased_recently.filter((x) => x.what === 'attendance_reparented' && x.new_session_id === other.sid &&
       [k1, k2].includes(x.student_id)).length === 2, o.erased_recently);
  const q = (await asAdmin(`SELECT count(*)::int n FROM session_cancel_review_queue WHERE override_id=$1`, [o.id ?? randomUUID()])).rows[0].n;
  ok('F-1 and it is in the review queue (closed: no unreviewed T1 cancel)', q === 1, q);
  // A re-parent of a SEEDED row counts too (fail closed: the bill line moves with it).
  const b = await mk({ when: PAST });
  const other2 = await mk({ when: FAR, cid: b.cid });
  await att(b.sid, 'Present', null);
  await asAdmin(`UPDATE attendance SET session_id=$2 WHERE session_id=$1`, [b.sid, other2.sid]);
  const pb = await preview(b.sid);
  ok('F-1 a re-parented seeded row is counted as well', pb.review_required === true && pb.erased_recently.length === 1, pb.erased_recently);
  // Control: an untouched lesson is not reviewed and says so in the preview.
  const c = await mk();
  const pc = await preview(c.sid);
  ok('F-8.2 preview of an untouched future lesson: review_required false, erased_recently []',
     pc.review_required === false && Array.isArray(pc.erased_recently) && pc.erased_recently.length === 0, pc);
});
await section('R1 F-4 a lesson id cannot change', async () => {
  const a = await mk();
  for (const [who, run] of [['admin', asAdmin], ['service role', asService], ['superuser', asSuper]]) {
    const r = await tryIt(() => run(`UPDATE sessions SET id=gen_random_uuid() WHERE id=$1`, [a.sid]));
    ok(`F-4 UPDATE sessions SET id by the ${who} -> HC020`, r.code === 'HC020' && /id_change/.test(r.detail ?? ''), r);
  }
  const held = await mk({ when: PAST, status: 'Held' });
  await asAdmin(`UPDATE sessions SET status='Scheduled' WHERE id=$1`, [held.sid]);
  const r = await tryIt(() => asAdmin(`UPDATE sessions SET id=gen_random_uuid() WHERE id=$1`, [held.sid]));
  ok('F-4 probe E4: after a Held flip, the id change that would hide it -> HC020, lesson kept', r.code === 'HC020' && !!(await sess(held.sid)), r);
});
await section('R1 F-5 what a move lands on', async () => {
  // G2: a blank future lesson moved onto a past day with points + a transcript of its class.
  const a = await mk();
  const day = await clock(-5);
  await asSuper(`INSERT INTO point_transactions(student_id,class_id,points,type,date,created_by) VALUES (gen_random_uuid(),$1,5,'participation',$2,$3)`,
    [a.cid, day.date, a.teacher]);
  await asSuper(`INSERT INTO class_transcripts(class_id,uploaded_by,transcript_date,status) VALUES ($1,$2,$3,'analyzed')`, [a.cid, a.teacher, day.date]);
  const p = await preview(a.sid, 'move', { date: day.date, start_time: '17:30', end_time: '19:00' });
  ok('F-5 G2 preview: destination day evidence reported, confirm required, review_required',
     p.destination?.day_evidence?.any === true && p.destination.day_evidence.points === 1 && p.destination.day_evidence.transcripts === 1 &&
     p.requires.confirm === true && p.review_required === true, [p.tier, p.destination, p.review_required]);
  const res = await must('F-5 G2', () => move(a.sid, { date: day.date, start: '17:30', end: '19:00', token: p.token, confirm: true }));
  ok('F-5 G2 the checked move is stored review_required', res.review_required === true &&
     (await overrides(a.sid))[0]?.review_required === true, res);
  // Automation onto a FUTURE day that already has evidence: refused (B-3(c)).
  const b = await mk();
  const fday = await clock(12);
  await mk({ when: fday, cid: b.cid, start: '08:00', end: '09:00', status: 'Scheduled' });
  await asSuper(`INSERT INTO homeworks(class_id, created_by, created_at) VALUES ($1,$2,($3::date + time '12:00') AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
    [b.cid, b.teacher, fday.date]);
  let r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [b.sid, fday.date]));
  ok('F-5 automation cannot move a lesson onto a day with homework of its class -> HC020', r.code === 'HC020', r);
  const ctl = await mk();
  const cday = await clock(13);
  r = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [ctl.sid, cday.date]));
  ok('F-5   control: the same move onto a clean day is still allowed', r.ok !== undefined, r);
  const c = await mk();
  const hday = await clock(-6);
  await mk({ when: hday, cid: c.cid, start: '08:00', end: '09:00', status: 'Held' });
  const pc = await preview(c.sid, 'move', { date: hday.date, start_time: '17:30', end_time: '19:00' });
  ok('F-5 another Held lesson of the class that day counts as destination evidence',
     pc.destination?.day_evidence?.other_lessons === 1 && pc.review_required === true, pc.destination);
  // G3: checked move into a future month whose bill is paid -> reviewed.
  const d = await mk();
  const kid = await att(d.sid, 'Present', null);
  const dest = await clock(100);
  await inv(kid, dest.month, { recorded: 540000 });
  const pd = await preview(d.sid, 'move', { date: dest.date, start_time: '17:30', end_time: '19:00' });
  ok('F-5 G3 move into a paid destination month: destination.any, review_required in the preview',
     pd.destination?.any === true && pd.review_required === true, [pd.tier, pd.destination]);
  const rd = await must('F-5 G3', () => move(d.sid, { date: dest.date, start: '17:30', end: '19:00', token: pd.token, confirm: pd.requires.confirm }));
  ok('F-5 G3 stored review_required; both months in refresh_pairs', rd.review_required === true &&
     (rd.refresh_pairs ?? []).length === 2, rd);
  // I5: un-cancel inside a settled month -> reviewed.
  const e = await mk({ when: PAST });
  const ek = await att(e.sid, 'Present', null);
  await inv(ek, e.month, { recorded: 540000 });
  await must('F-5 I5 cancel', () => cancelNow(e.sid));
  const pe = await preview(e.sid, 'uncancel');
  ok('F-5 I5 un-cancel in a settled month: review_required in the preview', pe.review_required === true, pe.settled_any);
  const re = await must('F-5 I5', () => uncancel(e.sid, { token: pe.token, corr: pe.tier === 3 ? CORR : null }));
  ok('F-5 I5 ... and stored', re.review_required === true, re);
});
await section('R1 F-7 surviving mutants', async () => {
  // M08 (:554): an acknowledged un-cancel goes back to Scheduled only.
  const a = await mk({ when: PAST, status: 'Canceled' });
  const ins = (sid, action) => `INSERT INTO session_cancel_overrides(actor_user_id,session_id,class_id,teacher_id,session_date,action,via,tier,level,
      settled,correction_mode,reason,confirmed,token,evidence,session_before,affected,invoices_before,refresh_pairs,payroll_month_locked,review_required)
    SELECT '${ADMIN}', id, class_id, teacher_id, date, '${action}', 'single', 1, 'NONE', false, false, 'test reason here ok', true, 'x',
           '{}', '{}', '[]', '[]', '[]', false, false FROM sessions WHERE id='${sid}' RETURNING id`;
  let e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${ins(a.sid, 'uncancel')} INTO v;
      PERFORM set_config('hec.session_change_ack', v::text, true); END $x$;
    UPDATE sessions SET status='Held' WHERE id='${a.sid}'`);
  ok('M08 acknowledged un-cancel written as Held -> HC020 (only back to Scheduled)', e?.code === 'HC020', e);
  ok('M08   lesson still Canceled', (await sess(a.sid)).status === 'Canceled');
  e = await script(null, '', null, `DO $x$ DECLARE v uuid; BEGIN ${ins(a.sid, 'uncancel')} INTO v;
      PERFORM set_config('hec.session_change_ack', v::text, true); END $x$;
    UPDATE sessions SET status='Scheduled' WHERE id='${a.sid}'`);
  ok('M08   control: the same acknowledgement written as Scheduled is accepted', e === null && (await sess(a.sid)).status === 'Scheduled', e);
  // M32 (:934): log_session_automation_refused refuses a caller with a uid even where the grant would allow it.
  const r = await tryIt(() => as(ADMIN, 'service_role', 'service_role', `SELECT public.log_session_automation_refused($1,'x')`, [a.sid]));
  ok('M32 log_session_automation_refused with a user uid on the service role -> 42501', r.code === '42501', r);
  // M38 (:590): automation may not move a lesson OUT of a settled month into another month.
  const src = await mk();
  const k = await att(src.sid, 'Present', null);
  await inv(k, src.month, { recorded: 540000 });
  const destDay = await clock(80);
  let m = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [src.sid, destDay.date]));
  ok('M38 automation move of a NONE lesson out of a month whose bill is paid, into another month -> HC020',
     m.code === 'HC020' && (await sess(src.sid)).date !== destDay.date, m);
  const ctl = await mk();
  await att(ctl.sid, 'Present', null);
  m = await tryIt(() => asService(`UPDATE sessions SET date=$2 WHERE id=$1`, [ctl.sid, destDay.date]));
  ok('M38   control: the same move with no settled bill is allowed', m.ok !== undefined, m);
});
await section('R1 F-9 insert guard is owner-only', async () => {
  const def = await fnDef('public.session_cancel_audit_insert_guard()');
  ok('F-9 the insert guard refuses any role that is not the table owner', /relowner/.test(def), def.slice(0, 120));
});

// --------------------------------------------------- timing (B-5)
await section("block 29", async () => {
  const N = 50, KIDS = 15;
  const items = [];
  for (let i = 0; i < N; i++) {
    const s = await mk();
    const values = Array.from({ length: KIDS }, (_, j) => `('${s.sid}', gen_random_uuid(), '${j % 5 === 0 ? 'Absent' : 'Present'}', '${s.teacher}')`).join(',');
    await asSuper(`INSERT INTO attendance(session_id,student_id,status,marked_by) VALUES ${values}`);
    items.push({ id: s.sid, token: (await preview(s.sid)).token, confirm: true, reason: `Holiday closure for lesson number ${i}` });
  }
  const t = Date.now();
  const out = await bulk(items, 'Public holiday, school closed');
  const ms = Date.now() - t;
  console.log(`  (timing: one bulk call, ${N} lessons x ${KIDS} marked children, pglite: ${ms} ms)`);
  ok(`B-5 a 50-lesson bulk with 15 marked children each completes (${ms} ms, all done)`,
     out.done.length === N && out.refused.length === 0 && ms < 60000, { done: out.done.length, refused: out.refused.slice(0, 2), ms });
  const ex = (await asSuper(`SELECT count(*)::int n FROM attendance a JOIN sessions s ON s.id=a.session_id
     WHERE s.id = ANY($1::uuid[]) AND a.status <> 'Excused'`, [items.map((i) => i.id)])).rows[0].n;
  ok('B-5   every mark on the 50 lessons is Excused, 50 override rows', ex === 0 &&
     (await asSuper(`SELECT count(*)::int n FROM session_cancel_overrides WHERE session_id = ANY($1::uuid[])`, [items.map((i) => i.id)])).rows[0].n === N);
});

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
