// Shared set-up for the S2 suites (docs/evidence/S2-audit-medium-low.md).
//
// Not a suite. Gives each S2 suite the same small Supabase stand-in the S1
// suites build: the auth schema and roles, user_roles + has_role, the staff
// and class tables, the REAL is_teacher_of_class (from 20261111110000,
// passed on the command line), production's can_view_student /
// is_linked_student / can_view_student_in_class bodies, storage.objects with
// RLS - and one cast of people, so every suite asks the same questions of
// the same eight kinds of account:
//   admin, class teacher, standing TA, cover teacher (a lesson this week),
//   teacher of another class, the family's primary login, the child's own
//   login, a second family, an unlinked sign-up, a role-less account.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

export const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.role', true), '') $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text, bio text, avatar_url text,
    hourly_rate_vnd integer, per_session_rate_vnd integer, pay_rate_type text, phone text, email text, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text,
    hourly_rate_vnd integer, per_session_rate_vnd integer, pay_rate_type text, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, default_teacher_id uuid, schedule_template jsonb,
    is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id), teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '17:00', end_time time NOT NULL DEFAULT '18:00', status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, title text);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    participant_type text NOT NULL DEFAULT 'teaching_assistant', teaching_assistant_id uuid REFERENCES public.teaching_assistants(id),
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, family_id uuid, linked_user_id uuid, secondary_user_id uuid);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id), start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean DEFAULT false, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
`;
// Production's helper bodies (as the S1 suites carry them).
export const HELPERS = `
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.linked_user_id = user_id OR s.secondary_user_id = user_id
      OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = s.family_id AND f.primary_user_id = user_id)));
  $function$;
  CREATE FUNCTION public.is_linked_student(_user_id uuid, _student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student_id AND s.linked_user_id = _user_id);
  $function$;
  CREATE FUNCTION public.can_view_student_in_class(_student_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = _student_id AND e.end_date IS NULL AND public.is_teacher_of_class(_user_id, e.class_id));
  $function$;
  CREATE FUNCTION public.is_staff_member(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.teachers WHERE user_id = _uid) OR EXISTS (SELECT 1 FROM public.teaching_assistants WHERE user_id = _uid)
      OR public.has_role(_uid, 'admin'::public.app_role);
  $function$;
`;

export function harness(title) {
  let pass = 0, fail = 0;
  const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + String(x).slice(0, 400) : ""}`); c ? pass++ : fail++; };
  const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  const done = () => { console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); };
  const bail = (why) => { console.log(`  FAIL  ${title}: ${why}`); console.log(`${pass} passed, ${fail + 1} failed`); process.exit(1); };
  return { ok, eq, done, bail };
}

/** The rollback block `<!-- rollback <tag> -->` from the S2 evidence file. */
export function rollbackBlock(tag) {
  const ev = readFileSync(new URL("../../docs/evidence/S2-audit-medium-low.md", import.meta.url), "utf8").replace(/\r/g, "");
  const esc = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`<!-- rollback ${esc} -->\\s*\`\`\`sql\\s*([\\s\\S]*?)\`\`\``).exec(ev)?.[1] ?? null;
}

export async function makeDb(taMig) {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(readFileSync(taMig, "utf8"));
  await db.exec(HELPERS);
  // As production: the base tables and the policy helpers are granted to
  // authenticated (each suite grants the tables it adds itself).
  await db.exec(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;`);
  const q =async (s, p) => (await db.query(s, p)).rows;
  const one = async (s, p) => (await q(s, p))[0];
  // A migration that raises leaves its own BEGIN open and aborted: end it, as
  // the SQL editor does when a paste fails.
  const exec = async (sql) => {
    try { await db.exec(sql); return null; }
    catch (e) { try { await db.exec("ROLLBACK"); } catch { /* none open */ } return e.message; }
  };
  // Runs one statement as a person; rolled back unless keep. role: the
  // database role (authenticated / anon / service_role); jwtRole: what
  // auth.role() answers (Supabase sets it from the token).
  async function as(uid, sql, params = [], { role = "authenticated", jwtRole = null, keep = false } = {}) {
    await db.exec("BEGIN");
    try {
      await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", jwtRole ?? (role === "service_role" ? "service_role" : role)]);
      await db.exec(`SET LOCAL ROLE ${role}`);
      const r = await db.query(sql, params);
      await db.exec(keep ? "COMMIT" : "ROLLBACK");
      return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
    } catch (e) { await db.exec("ROLLBACK"); return { rows: [], n: 0, err: e.message, code: e.code }; }
  }
  return { db, q, one, exec, as };
}

/** The cast. Class A: teacher, standing TA, cover teacher, children A1 (family 1) and A2.
 *  Class B: teacher B, child B1 (family 2). */
export async function cast({ q, one }) {
  const mk = async (...roles) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); for (const r of roles) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, r]); return id; };
  const P = {
    ADMIN: await mk("admin"), ADMIN_TEACHER: await mk("admin", "teacher"),
    TEA: await mk("teacher"), TA: await mk("teacher"), COVER: await mk("teacher"), TEB: await mk("teacher"),
    PARENT: await mk("student"), KID: await mk("student"), SECOND: await mk("student"), PARENT2: await mk("student"),
    NEW: await mk("student"), FAKE_T: await mk("teacher"), NOROLE: await mk(),
  };
  const t = async (uid, name, rate) => (await one(`INSERT INTO public.teachers (user_id, full_name, bio, hourly_rate_vnd, pay_rate_type, phone, email)
    VALUES ($1,$2,'bio',$3,'hourly','0900','t@example.test') RETURNING id`, [uid, name, rate])).id;
  const tA = await t(P.TEA, "Teacher A", 200000), tCover = await t(P.COVER, "Cover", 180000), tB = await t(P.TEB, "Teacher B", 210000);
  const taId = (await one(`INSERT INTO public.teaching_assistants (user_id, full_name, hourly_rate_vnd) VALUES ($1,'TA',90000) RETURNING id`, [P.TA])).id;
  const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('A', $1) RETURNING id`, [tA])).id;
  const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('B', $1) RETURNING id`, [tB])).id;
  const CIDLE = (await one(`INSERT INTO public.classes (name, default_teacher_id, is_active) VALUES ('Old', $1, false) RETURNING id`, [tB])).id;
  await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [CA, taId]);
  await q(`INSERT INTO public.sessions (class_id, teacher_id, date, status) VALUES ($1,$2,CURRENT_DATE,'Scheduled')`, [CA, tCover]);
  const F1 = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [P.PARENT])).id;
  const F2 = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [P.PARENT2])).id;
  const kid = async (name, cls, { family = null, linked = null, second = null, end = null } = {}) => {
    const id = (await one(`INSERT INTO public.students (full_name, family_id, linked_user_id, secondary_user_id) VALUES ($1,$2,$3,$4) RETURNING id`, [name, family, linked, second])).id;
    if (cls) await q(`INSERT INTO public.enrollments (student_id, class_id, end_date) VALUES ($1,$2,$3)`, [id, cls, end]);
    return id;
  };
  const A1 = await kid("A1", CA, { family: F1, linked: P.KID, second: P.SECOND });
  const A2 = await kid("A2", CA);
  const B1 = await kid("B1", CB, { family: F2 });
  return { P, tA, tB, tCover, taId, CA, CB, CIDLE, F1, F2, A1, A2, B1 };
}

/** The people as [label, uid] pairs, for matrices. */
export const PEOPLE = (P) => [
  ["admin", P.ADMIN], ["admin who also teaches", P.ADMIN_TEACHER], ["class teacher", P.TEA], ["standing TA", P.TA], ["cover teacher", P.COVER],
  ["teacher of another class", P.TEB], ["family primary login", P.PARENT], ["child's own login", P.KID], ["child's second login", P.SECOND],
  ["another family", P.PARENT2], ["unlinked sign-up", P.NEW], ["self-made teacher, no record", P.FAKE_T], ["no role", P.NOROLE],
];
