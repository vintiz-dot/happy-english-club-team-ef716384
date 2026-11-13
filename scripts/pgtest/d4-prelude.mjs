// Shared scaffolding for the D4 suites (docs/evidence/D4-design.md f.2).
// Not a suite: it runs nothing on import.
//
// D2_PRELUDE is the PRELUDE of session-cancel-guard.test.mjs, COPIED ONCE
// here. d4-floors.test.mjs asserts (preludeCopyIsCurrent) that the copy
// still equals the string in that file, so the two cannot drift: change
// one, copy it to the other.
//
// D4 adds, on top, only what its suites need, in named blocks:
//   D4_PEOPLE        students / families (the impact counts read family_id),
//                    teachers / teaching_assistants (the live attendance
//                    policies name them)
//   D4_EVIDENCE_RLS  row security and policies on the five evidence tables,
//                    as the real migrations write them (20251012110051,
//                    20260403050441, 20260508153000, 20260712090000,
//                    20261023090000); used where a suite asks who may write
// The real money-input migrations the later steps need (20261106100001,
// 20261021090000, 20261021093000) do NOT load over D2's prelude as it is:
// docs/evidence/D4-build-1a.md "Step 0" lists why; the step that first needs
// them (1b / 3B) extends this file.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const migPath = (name) => resolve(repo, 'supabase', 'migrations', name);
export const sqlOf = (f) => readFileSync(f, 'utf8');

export const AUDIT = '20261009130000_audit_every_admin_action.sql';
export const CANCEL = '20261027090000_cancelled_lesson_attendance_guard.sql';
export const D1 = '20261112090000_session_held_evidence.sql';
export const D2 = '20261112091000_session_cancel_guard.sql';
export const FLOORS = '20261114090000_d4_floors.sql';
export const ROLLBACK_FLOORS = resolve(repo, 'scripts', 'ROLLBACK-d4-1-floors.sql');

// ------------------------------------------------------------ D2 (copy)
export const D2_PRELUDE = `
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

/** True when D2_PRELUDE is byte-identical (LF) to the PRELUDE in session-cancel-guard.test.mjs. */
export function preludeCopyIsCurrent() {
  const src = readFileSync(resolve(repo, 'scripts/pgtest/session-cancel-guard.test.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const m = src.match(/const PRELUDE = `([\s\S]*?)`;\n/);
  return !!m && m[1] === D2_PRELUDE.replace(/\r\n/g, '\n');
}

// ------------------------------------------------------------ D4 blocks
export const D4_PEOPLE = `
  CREATE TABLE public.families(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, sibling_percent_override numeric);
  CREATE TABLE public.students(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL DEFAULT 'child',
    family_id uuid REFERENCES public.families(id), linked_user_id uuid, sibling_discount_from date,
    is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teachers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text);
  CREATE TABLE public.teaching_assistants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text);
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.families, public.students, public.teachers, public.teaching_assistants TO authenticated;
  GRANT ALL ON public.families, public.students, public.teachers, public.teaching_assistants TO service_role;
`;

export const D4_EVIDENCE_RLS = `
  ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
  CREATE POLICY att_admin_all ON public.attendance FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY att_teacher_all ON public.attendance FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = attendance.session_id
                    AND public.is_teacher_of_class(auth.uid(), s.class_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = attendance.session_id
                         AND public.is_teacher_of_class(auth.uid(), s.class_id)));
  CREATE POLICY att_family_read ON public.attendance FOR SELECT TO authenticated
    USING (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()));

  ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY pt_admin_all ON public.point_transactions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY pt_teacher_all ON public.point_transactions FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY pt_family_read ON public.point_transactions FOR SELECT TO authenticated
    USING (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()));

  ALTER TABLE public.class_transcripts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY admins_all_transcripts ON public.class_transcripts FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY teachers_manage_class_transcripts ON public.class_transcripts FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));

  ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
  CREATE POLICY hw_admin_all ON public.homeworks FOR ALL
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY hw_teacher_all ON public.homeworks FOR ALL
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY hw_student_read ON public.homeworks FOR SELECT USING (true);

  ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY hw_sub_admin_all ON public.homework_submissions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY hw_sub_teacher_all ON public.homework_submissions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.homeworks h WHERE h.id = homework_submissions.homework_id
                    AND public.is_teacher_of_class(auth.uid(), h.class_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.homeworks h WHERE h.id = homework_submissions.homework_id
                         AND public.is_teacher_of_class(auth.uid(), h.class_id)));
  -- 20260508153000:97 "Students can update own submissions" (a child, or the
  -- family login, on the child's own row).
  CREATE POLICY "Students can update own submissions" ON public.homework_submissions FOR UPDATE
    USING (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()))
    WITH CHECK (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()));
  CREATE POLICY "Students can view own submissions" ON public.homework_submissions FOR SELECT
    USING (student_id IN (SELECT st.id FROM public.students st WHERE st.linked_user_id = auth.uid()));
`;

/**
 * What the live enrolment RPCs need beyond D2's prelude, so the REAL
 * 20261106100001 (end_enrollment, ...) and 20261113120000 (pause_enrollment)
 * can be loaded after it: the enrolment columns they write, pause_windows,
 * and a stub of pause_enrollment for the latter's preflight (replaced by it).
 */
export const D4_ENROLMENT_RPCS = `
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS created_by uuid,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS updated_by uuid;
  CREATE TABLE IF NOT EXISTS public.pause_windows(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    from_date date NOT NULL, to_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, memo text);
  CREATE OR REPLACE FUNCTION public.pause_enrollment(p_student_id uuid, p_class_id uuid, p_from_date date, p_to_date date, p_memo text DEFAULT NULL)
    RETURNS jsonb LANGUAGE sql AS $f$ SELECT '{}'::jsonb $f$;
  -- modify_enrollment_transfer moves points by month
  ALTER TABLE public.point_transactions ADD COLUMN IF NOT EXISTS month text;
  CREATE TABLE IF NOT EXISTS public.student_points(
    student_id uuid NOT NULL, class_id uuid NOT NULL, month text NOT NULL,
    homework_points integer NOT NULL DEFAULT 0, participation_points integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (student_id, class_id, month));
  -- stand-in for stars_sync_resolve_conflict's register write ("take Pixel Pal's mark"):
  -- the real one (20261104090000) needs the whole sync schema; this is its UPDATE with the
  -- LIVE signature (uuid, text), plpgsql, SECURITY DEFINER, search_path public - what the
  -- guard recognises in the call stack
  CREATE TABLE IF NOT EXISTS public.zz_stars_conflicts(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL, student_id uuid NOT NULL, theirs text NOT NULL);
  CREATE OR REPLACE FUNCTION public.stars_sync_resolve_conflict(p_conflict_id uuid, p_resolution text)
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
  DECLARE v record;
  BEGIN
    SELECT * INTO v FROM public.zz_stars_conflicts WHERE id = p_conflict_id;
    IF p_resolution = 'took_theirs' THEN
      UPDATE public.attendance SET status = v.theirs, marked_by = auth.uid(), marked_at = now()
       WHERE session_id = v.session_id AND student_id = v.student_id;
    END IF;
    RETURN jsonb_build_object('resolution', p_resolution);
  END $f$;
`;

/**
 * A fresh pglite with D2's prelude, the D4 blocks asked for, then the named
 * migration files in order (real files, read as they are on disk).
 */
export async function makeDb(PGlite, { people = true, rls = false, migrations = [] } = {}) {
  const d = new PGlite();
  await d.exec(D2_PRELUDE);
  if (people) await d.exec(D4_PEOPLE);
  if (rls) await d.exec(D4_EVIDENCE_RLS);
  for (const m of migrations) await d.exec(sqlOf(m.includes('/') || m.includes('\\') ? m : migPath(m)));
  return d;
}

// ------------------------------------------------------------ harness
/**
 * The helpers every D4 suite uses, bound to one database. Same shapes as
 * session-cancel-guard.test.mjs so cases read the same.
 */
export function harness(getDb) {
  let pass = 0, fail = 0;
  const ok = (name, value, extra) => {
    console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ''}`);
    value ? pass++ : fail++;
  };
  const counts = () => ({ pass, fail });
  async function section(name, fn) {
    try { await fn(); }
    catch (e) {
      ok(`section "${name}" ran to the end without an unexpected error`, false, { code: e?.code, message: e?.message });
      try { await getDb()?.exec('RESET ROLE'); } catch { /* mid-transaction */ }
      try { await getDb()?.exec('ROLLBACK'); } catch { /* none open */ }
    }
  }
  async function as(uid, jwtRole, dbRole, sql, params = []) {
    const db = getDb();
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
  const must = async (label, fn) => {
    const r = await tryIt(fn);
    if (r.ok === undefined) { ok(`${label}: the fixture call succeeds`, false, r); return {}; }
    return r.ok ?? {};
  };
  async function script(uid, jwtRole, dbRole, body) {
    const db = getDb();
    const head = `BEGIN; SELECT set_config('test.uid', '${uid ?? ''}', true), set_config('test.jwt_role', '${jwtRole ?? ''}', true);`
               + (dbRole ? ` SET LOCAL ROLE ${dbRole};` : '');
    try { await db.exec(`${head} ${body}; COMMIT;`); return null; }
    catch (e) { await db.exec('ROLLBACK').catch(() => {}); return { code: e.code, message: e.message }; }
  }
  const clock = async (days = 0, hours = 0) => (await getDb().query(`
    SELECT to_char(t, 'YYYY-MM-DD') AS date, to_char(t, 'HH24:MI') AS time,
           to_char(t + interval '1 hour', 'HH24:MI') AS end_time, to_char(t, 'YYYY-MM') AS month
      FROM (SELECT date_trunc('minute', now() AT TIME ZONE 'Asia/Ho_Chi_Minh') + make_interval(days => $1::int, hours => $2::int) AS t) q`,
    [days, hours])).rows[0];
  return { ok, counts, section, as, tryIt, must, script, clock };
}
