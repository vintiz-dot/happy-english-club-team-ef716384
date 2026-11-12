// F-16: what a family's login can read about children who are not theirs.
//
// Drives the REAL files against an in-process Postgres:
//   20261111110000  the real is_teacher_of_class,
//   docs/evidence/S1-F16-rollback.sql  = the four classmate policies production
//                   had on 13 Nov 2026, verbatim: run first as the "before",
//                   again at the end as the rollback under test,
//   20261113130000  the fix, pasted twice.
// The helper functions (can_view_student, can_view_classmate,
// can_view_enrollment, is_student_enrolled_in_class, can_view_student_in_class)
// and every other policy on the five tables are production's, copied from
// the live catalog; the functions are checked against production's md5.
//
// "The screen's query" below is the PostgREST request each screen makes,
// written as the SQL PostgREST would run, as the signed-in caller, under RLS.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX_MIG = MIGS.find((f) => f.includes("classmate_rows_private"));
if (!TA_MIG || !FIX_MIG) {
  console.log("usage: classmate-rows.test.mjs <20261111110000_...sql> <20261113130000_classmate_rows_private.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
const LIVE = readFileSync(new URL("../../docs/evidence/S1-F16-rollback.sql", import.meta.url), "utf8");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
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
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, is_active boolean DEFAULT true,
    default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '17:00', end_time time NOT NULL DEFAULT '18:00',
    status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, primary_user_id uuid);
  -- public.students: the columns production has that matter here.
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id uuid REFERENCES public.families(id),
    linked_user_id uuid, secondary_user_id uuid, full_name text NOT NULL, phone text, email text, date_of_birth date,
    is_active boolean DEFAULT true, notes text, avatar_url text, cash_on_hand integer DEFAULT 0, sibling_discount_from date);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    student_id uuid NOT NULL REFERENCES public.students(id), status text NOT NULL, marked_by uuid, notes text, UNIQUE (session_id, student_id));
  CREATE TABLE public.skill_assessments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    session_id uuid, skill text NOT NULL, score integer NOT NULL, date date NOT NULL, teacher_comment text, created_by uuid);
  CREATE TABLE public.point_transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    month text NOT NULL, date date NOT NULL, type text NOT NULL, points integer NOT NULL, notes text);
  CREATE TABLE public.student_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid NOT NULL,
    month text NOT NULL, homework_points integer DEFAULT 0, participation_points integer DEFAULT 0, total_points integer DEFAULT 0,
    UNIQUE (student_id, class_id, month));
  -- 20261111110000 also writes two storage policies; it needs the table to exist.
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
`;

// Production's helper functions, bodies copied from the live catalog (13 Nov 2026).
const LIVE_HELPERS = `
CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id
      AND (
        s.linked_user_id = user_id
        OR s.secondary_user_id = user_id
        OR EXISTS (
          SELECT 1 FROM public.families f
          WHERE f.id = s.family_id
            AND f.primary_user_id = user_id
        )
      )
  );
$function$;
CREATE FUNCTION public.can_view_classmate(student_id_to_view uuid, viewer_user_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.students viewer_student
    JOIN public.enrollments viewer_enrollment ON viewer_enrollment.student_id = viewer_student.id
    JOIN public.enrollments viewed_enrollment ON viewed_enrollment.class_id = viewer_enrollment.class_id
    WHERE (
      viewer_student.linked_user_id = viewer_user_id
      OR viewer_student.secondary_user_id = viewer_user_id
      OR viewer_student.family_id IN (SELECT id FROM public.families WHERE primary_user_id = viewer_user_id)
      OR viewer_student.family_id IN (
        SELECT family_id
        FROM public.students
        WHERE linked_user_id = viewer_user_id OR secondary_user_id = viewer_user_id
      )
    )
    AND viewed_enrollment.student_id = student_id_to_view
    AND viewer_enrollment.end_date IS NULL
    AND viewed_enrollment.end_date IS NULL
  );
$function$;
CREATE FUNCTION public.can_view_enrollment(_student_id uuid, _class_id uuid, _user_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.is_teacher_of_class(_user_id, _class_id)
    OR EXISTS (
      SELECT 1
      FROM public.students s
      LEFT JOIN public.families f ON f.id = s.family_id
      WHERE s.id = _student_id
        AND (
          s.linked_user_id = _user_id
          OR s.secondary_user_id = _user_id
          OR f.primary_user_id = _user_id
          OR EXISTS (
            SELECT 1
            FROM public.students sibling
            WHERE sibling.family_id = s.family_id
              AND (
                sibling.linked_user_id = _user_id
                OR sibling.secondary_user_id = _user_id
              )
          )
        )
    );
$function$;
CREATE FUNCTION public.is_student_enrolled_in_class(user_id uuid, class_id_check uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.enrollments e ON e.student_id = s.id
    WHERE (
      s.linked_user_id = user_id
      OR s.secondary_user_id = user_id
      OR s.family_id IN (SELECT id FROM public.families WHERE primary_user_id = user_id)
      OR s.family_id IN (SELECT family_id FROM public.students WHERE linked_user_id = user_id OR secondary_user_id = user_id)
    )
    AND e.class_id = class_id_check
    AND e.end_date IS NULL
  );
$function$;
CREATE FUNCTION public.can_view_student_in_class(_student_id uuid, _user_id uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = _student_id
      AND e.end_date IS NULL
      AND public.is_teacher_of_class(_user_id, e.class_id)
  );
$function$;
`;
const LIVE_MD5 = {
  can_view_student: "53f2d32704abbb600bf5eefa09130c12",
  can_view_classmate: "ffe7e1f83ee873ab36c0a5e28246d6a5",
  can_view_enrollment: "3bbba012bdd56010bb2d6059db8f444f",
  is_student_enrolled_in_class: "e8d7b3599d6e55b407daa052b7da6c75",
  can_view_student_in_class: "0d1352e61df14c0e54d63cb8b179eb2d",
};

// Every OTHER policy production has on these tables (pg_policies, 13 Nov 2026).
const LIVE_POLICIES = `
  ALTER TABLE public.students ENABLE ROW LEVEL SECURITY; ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.skill_assessments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY; ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

  CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Admins can view all students" ON public.students FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Family users can view family students" ON public.students FOR SELECT TO authenticated USING (can_view_student(id, auth.uid()));
  CREATE POLICY "Students can view own record" ON public.students FOR SELECT TO public USING ((linked_user_id = auth.uid()));
  CREATE POLICY "Teachers can view students in their classes" ON public.students FOR SELECT TO authenticated USING (can_view_student_in_class(id, auth.uid()));

  CREATE POLICY admin_attendance_select ON public.attendance FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY family_read_children_attendance ON public.attendance FOR SELECT TO authenticated USING (can_view_student(student_id, auth.uid()));
  CREATE POLICY student_attendance_select ON public.attendance FOR SELECT TO public USING (can_view_student(student_id, auth.uid()));
  CREATE POLICY teacher_attendance_select ON public.attendance FOR SELECT TO authenticated
    USING (((session_id IN ( SELECT s.id FROM (sessions s JOIN teachers t ON ((t.id = s.teacher_id))) WHERE (t.user_id = auth.uid()))) OR (session_id IN ( SELECT sp.session_id FROM (session_participants sp JOIN teaching_assistants ta ON ((ta.id = sp.teaching_assistant_id))) WHERE ((ta.user_id = auth.uid()) AND (sp.participant_type = 'teaching_assistant'::text))))));

  CREATE POLICY "Admins can manage skill assessments" ON public.skill_assessments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Teachers can manage class skill assessments" ON public.skill_assessments FOR ALL TO authenticated USING (is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (is_teacher_of_class(auth.uid(), class_id));

  CREATE POLICY "Admins can manage all point transactions" ON public.point_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Teachers can manage transactions for their classes" ON public.point_transactions FOR ALL TO authenticated USING (is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "Students can view their own transactions" ON public.point_transactions FOR SELECT TO authenticated
    USING ((student_id IN ( SELECT students.id FROM students WHERE ((students.linked_user_id = auth.uid()) OR (students.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));
  CREATE POLICY family_read_children_points ON public.point_transactions FOR SELECT TO authenticated USING (can_view_student(student_id, auth.uid()));

  CREATE POLICY "Admins can manage all points" ON public.student_points FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Teachers can manage points for their classes" ON public.student_points FOR ALL TO authenticated USING (is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "Students can view class leaderboard" ON public.student_points FOR SELECT TO public
    USING ((class_id IN ( SELECT DISTINCT e.class_id FROM (enrollments e JOIN students s ON ((s.id = e.student_id))) WHERE ((s.linked_user_id = auth.uid()) OR (s.family_id IN ( SELECT students.family_id FROM students WHERE (students.linked_user_id = auth.uid()))) OR (s.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));
  CREATE POLICY "Students can view their own points" ON public.student_points FOR SELECT TO authenticated
    USING ((student_id IN ( SELECT students.id FROM students WHERE ((students.linked_user_id = auth.uid()) OR (students.family_id IN ( SELECT families.id FROM families WHERE (families.primary_user_id = auth.uid())))))));
  CREATE POLICY family_read_children_student_points ON public.student_points FOR SELECT TO authenticated USING (can_view_student(student_id, auth.uid()));

  CREATE POLICY "Admins manage enrollments" ON public.enrollments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY "Users can view permitted enrollments" ON public.enrollments FOR SELECT TO authenticated USING (can_view_enrollment(student_id, class_id, auth.uid()));
  CREATE POLICY "Enrolled or teaching users view sessions" ON public.sessions FOR SELECT TO authenticated
    USING ((has_role(auth.uid(), 'admin'::app_role) OR is_teacher_of_class(auth.uid(), class_id) OR is_student_enrolled_in_class(auth.uid(), class_id)));
  CREATE POLICY "Teachers can view their sessions" ON public.sessions FOR SELECT TO authenticated
    USING ((teacher_id IN ( SELECT t.id FROM teachers t WHERE (t.user_id = auth.uid()))));
  CREATE FUNCTION public.can_view_family(family_id uuid, user_id uuid) RETURNS boolean
   LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id
      AND (
        f.primary_user_id = user_id
        OR EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.family_id = f.id
          AND s.linked_user_id = user_id
        )
      )
    );
  $function$;
  GRANT EXECUTE ON FUNCTION public.can_view_family(uuid, uuid) TO authenticated;
  CREATE POLICY "Family users can view own family" ON public.families FOR SELECT TO authenticated USING (can_view_family(id, auth.uid()));
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(LIVE_HELPERS);
for (const [name, md5] of Object.entries(LIVE_MD5)) {
  eq(`${name} is byte-for-byte production's (md5 from the live catalog)`,
    (await one(`SELECT md5(replace(prosrc, E'\\r', '')) m FROM pg_proc WHERE proname = $1`, [name])).m, md5);
}
await db.exec(LIVE_POLICIES);
let liveErr = null; try { await db.exec(LIVE); } catch (e) { liveErr = e.message; }
ok("the four production classmate policies (the rollback file) install as the starting state", liveErr === null, liveErr ?? "");

// ---------------------------------------------------------------- people
const mk = async (role) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); if (role) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, role]); return id; };
const ADMIN = await mk("admin");
const TEA = await mk("teacher"), TEB = await mk("teacher");
const PA = await mk("student");     // family 1's primary login: A1 (class A) and A2 (class B)
const KID = await mk("student");    // A1's own login
const PM = await mk("student");     // family 3's primary login: M1, a classmate of A1 in class A
const PB = await mk("student");     // family 2's primary login: B1 (class B only)
const HL = await mk("student");     // linked to H1 only; H2 and H3 are H1's siblings; the family has no primary login
const NEW = await mk("student");    // registered a minute ago
const NOROLE = await mk(null);
const tA = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEA])).id;
const tB = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEB])).id;
const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class A', $1) RETURNING id`, [tA])).id;
const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class B', $1) RETURNING id`, [tB])).id;
const fam = async (uid) => (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [uid])).id;
const F1 = await fam(PA), F2 = await fam(PB), F3 = await fam(PM), F5 = await fam(null);
const kid = async (name, family, classes, { linked = null, end = null } = {}) => {
  const id = (await one(`INSERT INTO public.students (full_name, family_id, linked_user_id, phone, email, date_of_birth, notes, cash_on_hand)
    VALUES ($1,$2,$3,'090-'||$1,$1||'@example.test',DATE '2016-05-04','school note about '||$1, 7) RETURNING id`, [name, family, linked])).id;
  for (const c of classes) await q(`INSERT INTO public.enrollments (student_id, class_id, end_date) VALUES ($1,$2,$3)`, [id, c, end]);
  return id;
};
const A1 = await kid("A1 Nguyen", F1, [CA], { linked: KID });
const A2 = await kid("A2 Nguyen", F1, [CB]);
const M1 = await kid("M1 Tran", F3, [CA]);
const B1 = await kid("B1 Le", F2, [CB]);
const H1 = await kid("H1 Pham", F5, [CA], { linked: HL });
const H2 = await kid("H2 Pham", F5, [CB]);
const H3 = await kid("H3 Pham", F5, [CB], { end: "2026-06-30" });   // left in June
const KIDS = { A1, A2, M1, B1, H1, H2, H3 };
const nameOfKid = Object.fromEntries(Object.entries(KIDS).map(([k, v]) => [v, k]));
const SA = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,'2026-11-03') RETURNING id`, [CA, tA])).id;
const SB = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,'2026-11-04') RETURNING id`, [CB, tB])).id;
for (const [k, cls, sess] of [[A1, CA, SA], [M1, CA, SA], [H1, CA, SA], [A2, CB, SB], [B1, CB, SB], [H2, CB, SB], [H3, CB, SB]]) {
  await q(`INSERT INTO public.attendance (session_id, student_id, status, notes) VALUES ($1,$2,'Present','register note')`, [sess, k]);
  await q(`INSERT INTO public.skill_assessments (student_id, class_id, session_id, skill, score, date, teacher_comment) VALUES
    ($1,$2,$3,'speaking',3,'2026-11-03','teacher comment'),($1,$2,$3,'speaking',2,'2026-10-06','older comment'),($1,$2,$3,'reading',4,'2026-11-03',null)`, [k, cls, sess]);
  await q(`INSERT INTO public.point_transactions (student_id, class_id, month, date, type, points, notes) VALUES ($1,$2,'2026-11','2026-11-03','participation',5,'award note')`, [k, cls]);
  await q(`INSERT INTO public.student_points (student_id, class_id, month, participation_points, total_points) VALUES ($1,$2,'2026-11',5,5)`, [k, cls]);
}
// M1 is the class's best speaker this month.
await q(`UPDATE public.skill_assessments SET score = 9 WHERE student_id = $1 AND skill = 'speaking' AND date = '2026-11-03'`, [M1]);

async function as(uid, sql, params = [], role = "authenticated") {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(sql, params);
    return { rows: r.rows, err: null };
  } catch (e) { return { rows: [], err: e.message }; }
  finally { await db.exec("ROLLBACK"); }
}
const TABLES = { students: "id", attendance: "student_id", skill_assessments: "student_id", point_transactions: "student_id", student_points: "student_id" };
// Whose rows of each table can `who` see: { students: ["A1","M1"], ... } (by child label, sorted, distinct).
const reach = async (who, role) => {
  const out = {};
  for (const [t, col] of Object.entries(TABLES)) {
    const r = await as(who, `SELECT DISTINCT ${col}::text k FROM public.${t}`, [], role);
    out[t] = r.rows.map((x) => nameOfKid[x.k]).sort();
  }
  return out;
};
const PEOPLE = { ADMIN, TEA, TEB, PA, KID, PM, PB, HL, NEW, NOROLE };
const reachAll = async () => { const o = {}; for (const [k, v] of Object.entries(PEOPLE)) o[k] = await reach(v); return o; };

// ---------------------------------------------------------------- BEFORE
console.log("=== before the fix: the defect reproduces ===");
const BEFORE = await reachAll();
eq("family 1's primary login can read rows about classmates M1, H1 (class A) and B1, H2 (class B) in all four tables",
  [BEFORE.PA.students, BEFORE.PA.attendance, BEFORE.PA.skill_assessments, BEFORE.PA.point_transactions],
  [["A1", "A2", "B1", "H1", "H2", "M1"], ["A1", "A2", "B1", "H1", "H2", "H3", "M1"], ["A1", "A2", "B1", "H1", "H2", "H3", "M1"], ["A1", "A2", "B1", "H1", "H2", "H3", "M1"]]);
{
  const r = await as(PA, `SELECT full_name, phone, email, date_of_birth IS NOT NULL dob, notes, family_id IS NOT NULL fam, cash_on_hand FROM public.students WHERE id = $1`, [M1]);
  eq("  ...the classmate's whole row: phone, email, date of birth, the school's notes, family id, cash", r.rows[0],
    { full_name: "M1 Tran", phone: "090-M1 Tran", email: "M1 Tran@example.test", dob: true, notes: "school note about M1 Tran", fam: true, cash_on_hand: 7 });
  const c = await as(KID, `SELECT teacher_comment FROM public.skill_assessments WHERE student_id = $1 AND teacher_comment IS NOT NULL ORDER BY date DESC`, [M1]);
  eq("  ...a child's own login reads the teacher's comments on a classmate", c.rows.map((x) => x.teacher_comment), ["teacher comment", "older comment"]);
  const a = await as(PM, `SELECT status, notes FROM public.attendance WHERE student_id = $1`, [A1]);
  eq("  ...and a classmate's parent reads A1's register mark and its note", a.rows, [{ status: "Present", notes: "register note" }]);
}
eq("control: an account linked to nothing reads no child's rows even before", BEFORE.NEW, { students: [], attendance: [], skill_assessments: [], point_transactions: [], student_points: [] });

// ---------------------------------------------------------------- APPLY
const fixText = readFileSync(FIX_MIG, "utf8");
const pols = async () => q(`SELECT tablename, policyname, cmd, roles::text, qual, with_check FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('students','attendance','skill_assessments','point_transactions','student_points','enrollments','sessions') ORDER BY 1, 2`);
const P0 = await pols();
const rowCounts = async () => one(`SELECT (SELECT count(*) FROM public.students)::int s, (SELECT count(*) FROM public.attendance)::int a,
  (SELECT count(*) FROM public.skill_assessments)::int k, (SELECT count(*) FROM public.point_transactions)::int p, (SELECT count(*) FROM public.student_points)::int sp`);
const R0 = await rowCounts();
let e1 = null; try { await db.exec(fixText); } catch (e) { e1 = e.message; }
ok("the fix applies", e1 === null, e1 ?? "");
const P1 = await pols();
let e2 = null; try { await db.exec(fixText); } catch (e) { e2 = e.message; }
ok("and applies a second time", e2 === null, e2 ?? "");
eq("the second paste leaves the same policies, byte for byte", await pols(), P1);
{
  const names = (ps) => ps.map((p) => `${p.tablename}/${p.policyname}`);
  const gone = names(P0).filter((n) => !names(P1).includes(n)), added = names(P1).filter((n) => !names(P0).includes(n));
  eq("exactly four policies replaced, one per table", [gone, added], [
    ["attendance/Classmates can view attendance", "point_transactions/Students can view class transactions",
     "skill_assessments/Students can view class skill assessments", "students/Students can view classmates for leaderboard"],
    ["attendance/Family logins can view siblings attendance", "point_transactions/Family logins can view own children class transactions",
     "skill_assessments/Family logins can view own children skill assessments", "students/Family logins can view siblings in their classes"]]);
  const untouched = (ps) => ps.filter((p) => !added.includes(`${p.tablename}/${p.policyname}`) && !gone.includes(`${p.tablename}/${p.policyname}`));
  eq("every other policy on students, attendance, skill_assessments, point_transactions, student_points, enrollments, sessions is byte-identical", untouched(P1), untouched(P0));
  // Each new policy is "family test AND the old expression": never wider.
  for (const [table, oldName, newName] of [["students", "Students can view classmates for leaderboard", "Family logins can view siblings in their classes"],
    ["attendance", "Classmates can view attendance", "Family logins can view siblings attendance"],
    ["skill_assessments", "Students can view class skill assessments", "Family logins can view own children skill assessments"],
    ["point_transactions", "Students can view class transactions", "Family logins can view own children class transactions"]]) {
    const o = P0.find((p) => p.tablename === table && p.policyname === oldName), n = P1.find((p) => p.tablename === table && p.policyname === newName);
    const col = table === "students" ? "id" : "student_id";
    ok(`${table}: the new policy is is_family_student(...) AND the old test, word for word`,
      n.cmd === "SELECT" && n.roles === "{authenticated}" && n.qual === `(is_family_student(${col}, auth.uid()) AND ${o.qual})`, n.qual);
  }
}
eq("no row was written", await rowCounts(), R0);
eq("the two functions: STABLE, SECURITY DEFINER, search_path pinned, authenticated yes, anon no",
  await q(`SELECT p.proname n, p.provolatile v, p.prosecdef d, p.proconfig::text c, has_function_privilege('anon', p.oid, 'EXECUTE') a,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') u FROM pg_proc p WHERE p.proname IN ('is_family_student','get_class_skill_points') ORDER BY 1`),
  [{ n: "get_class_skill_points", v: "s", d: true, c: "{search_path=public}", a: false, u: true }, { n: "is_family_student", v: "s", d: true, c: "{search_path=public}", a: false, u: true }]);

// ---------------------------------------------------------------- AFTER
console.log("=== after: whose rows each login can read ===");
const AFTER = await reachAll();
const FOUR = ["students", "attendance", "skill_assessments", "point_transactions"];
eq("family 1's primary login: its own two children, in all four tables", FOUR.map((t) => AFTER.PA[t]), [["A1", "A2"], ["A1", "A2"], ["A1", "A2"], ["A1", "A2"]]);
eq("child A1's own login: A1 only (it is not linked to the sibling A2... but is in A2's family: A2 while enrolled)", FOUR.map((t) => AFTER.KID[t]), FOUR.map((t) => BEFORE.KID[t].filter((k) => ["A1", "A2"].includes(k))));
eq("a classmate's parent (M1): M1 only", FOUR.map((t) => AFTER.PM[t]), [["M1"], ["M1"], ["M1"], ["M1"]]);
eq("family 2 (B1): B1 only", FOUR.map((t) => AFTER.PB[t]), [["B1"], ["B1"], ["B1"], ["B1"]]);
eq("a login linked to H1 only keeps exactly what it could read about H1's brothers and sisters before",
  FOUR.map((t) => AFTER.HL[t]), FOUR.map((t) => BEFORE.HL[t].filter((k) => k.startsWith("H"))));
eq("  ...which is: the enrolled sibling H2 in all four; H3, who left, only where the old policy already showed H3",
  FOUR.map((t) => AFTER.HL[t]), [["H1", "H2"], ["H1", "H2", "H3"], ["H1", "H2", "H3"], ["H1", "H2", "H3"]]);
for (const who of ["ADMIN", "TEA", "TEB"]) eq(`${who}: every table exactly as before`, AFTER[who], BEFORE[who]);
eq("teacher A still reads class A's children and nobody else's", FOUR.map((t) => AFTER.TEA[t]), [["A1", "H1", "M1"], ["A1", "H1", "M1"], ["A1", "H1", "M1"], ["A1", "H1", "M1"]]);
for (const who of ["NEW", "NOROLE"]) eq(`${who}: nothing`, FOUR.map((t) => AFTER[who][t]), [[], [], [], []]);
eq("anon: nothing (no grant, no policy)", (await as(null, `SELECT count(*)::int n FROM public.students`, [], "anon")).rows[0]?.n ?? 0, 0);
{
  // The general statement, for every login and table: never wider, and
  // nothing outside the login's own family is left.
  const family = { PA: ["A1", "A2"], KID: ["A1", "A2"], PM: ["M1"], PB: ["B1"], HL: ["H1", "H2", "H3"], NEW: [], NOROLE: [] };
  let wider = [], outside = [], lostOwn = [];
  for (const who of Object.keys(PEOPLE)) for (const t of Object.keys(TABLES)) {
    for (const k of AFTER[who][t]) if (!BEFORE[who][t].includes(k)) wider.push(`${who}/${t}/${k}`);
    if (family[who] && t !== "student_points") {
      for (const k of AFTER[who][t]) if (!family[who].includes(k)) outside.push(`${who}/${t}/${k}`);
      for (const k of BEFORE[who][t]) if (family[who].includes(k) && !AFTER[who][t].includes(k)) lostOwn.push(`${who}/${t}/${k}`);
    }
  }
  eq("no login can read any row it could not read before", wider, []);
  eq("no family login can read a row about a child outside its own family", outside, []);
  eq("no family login lost a row about a child of its own family", lostOwn, []);
}
eq("student_points (the numbers on the board) is unchanged for everyone", Object.fromEntries(Object.keys(PEOPLE).map((k) => [k, AFTER[k].student_points])),
  Object.fromEntries(Object.keys(PEOPLE).map((k) => [k, BEFORE[k].student_points])));

console.log("=== each screen's query, as the caller ===");
{
  // StudentClassLeaderboard -> edge function class-leaderboard (service role): roster with names, then points.
  const roster = await as(null, `SELECT e.student_id, s.full_name, s.avatar_url FROM public.enrollments e JOIN public.students s ON s.id = e.student_id
    WHERE e.class_id = $1 AND e.end_date IS NULL ORDER BY s.full_name`, [CA], "service_role");
  eq("class-leaderboard (service role) still gets class A's roster with names", roster.rows.map((r) => r.full_name), ["A1 Nguyen", "H1 Pham", "M1 Tran"]);
  // ...and the family's own read of the month's points, used for realtime refresh and the dashboards.
  const pts = await as(PA, `SELECT student_id, total_points FROM public.student_points WHERE class_id = $1 AND month = '2026-11'`, [CA]);
  eq("a family still reads the class's points rows (numbers and ids)", pts.rows.length, 3);
  const embed = await as(PA, `SELECT sp.student_id, s.full_name FROM public.student_points sp LEFT JOIN public.students s ON s.id = sp.student_id
    WHERE sp.class_id = $1 AND sp.month = '2026-11' ORDER BY s.full_name NULLS LAST`, [CA]);
  eq("  ...but an embedded students(...) on it now names only its own child", embed.rows.map((r) => r.full_name), ["A1 Nguyen", null, null]);
}
{
  // ClassLeaderboardShared / ProjectedBoard / TeacherLeaderboards (staff): enrollments + students(id, full_name, avatar_url), student_points, the ledger.
  const roster = await as(TEA, `SELECT e.student_id, s.full_name FROM public.enrollments e LEFT JOIN public.students s ON s.id = e.student_id
    WHERE e.class_id = $1 AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE) ORDER BY 2`, [CA]);
  eq("the staff boards: teacher A reads the roster with every name", roster.rows.map((r) => r.full_name), ["A1 Nguyen", "H1 Pham", "M1 Tran"]);
  const ledger = await as(TEA, `SELECT student_id, points, date FROM public.point_transactions WHERE class_id = $1 AND date >= '2026-10-15'`, [CA]);
  eq("useBoardExtras' ledger (biggest climber, streak): teacher A reads all three children's awards", ledger.rows.length, 3);
  const cash = await as(TEA, `SELECT s.id, s.cash_on_hand FROM public.enrollments e JOIN public.students s ON s.id = e.student_id WHERE e.class_id = $1`, [CA]);
  eq("economy mode's cash column: teacher A reads it", cash.rows.length, 3);
  const adminRoster = await as(ADMIN, `SELECT count(*)::int n FROM public.enrollments e JOIN public.students s ON s.id = e.student_id`);
  eq("admin (StudentDetail, ClassDetail): every enrollment with its student", adminRoster.rows[0].n, 7);
}
{
  // The analytics pop-up, own child (RadarChartTab, PerformanceHeatmapTab, QuestLogTab, PointHistoryTab).
  const own = await as(PA, `SELECT
    (SELECT count(*)::int FROM public.skill_assessments WHERE student_id = $1 AND class_id = $2) skills,
    (SELECT string_agg(teacher_comment, '|' ORDER BY date DESC) FROM public.skill_assessments WHERE student_id = $1 AND class_id = $2 AND date >= '2026-11-01') comments,
    (SELECT count(*)::int FROM public.attendance WHERE student_id = $1 AND session_id = $3) att,
    (SELECT count(*)::int FROM public.point_transactions WHERE student_id = $1 AND class_id = $2 AND month = '2026-11') hist,
    (SELECT count(*)::int FROM public.students WHERE id = $1) row`, [A1, CA, SA]);
  eq("own child: skills (with the teacher's comment), attendance, point history and the student row all still read", own.rows[0], { skills: 3, comments: "teacher comment", att: 1, hist: 1, row: 1 });
  // ...and a classmate.
  const mate = await as(PA, `SELECT
    (SELECT count(*)::int FROM public.skill_assessments WHERE student_id = $1 AND class_id = $2) skills,
    (SELECT count(*)::int FROM public.attendance WHERE student_id = $1 AND session_id = $3) att,
    (SELECT count(*)::int FROM public.point_transactions WHERE student_id = $1 AND class_id = $2 AND month = '2026-11') hist,
    (SELECT count(*)::int FROM public.students WHERE id = $1) row`, [M1, CA, SA]);
  eq("a classmate: skills, attendance, history - nothing; and the row probe the pop-up uses to hide its tabs says no", mate.rows[0], { skills: 0, att: 0, hist: 0, row: 0 });
  // The class figures on the child's own panels now come from the function.
  const month = await as(PA, `SELECT * FROM public.get_class_skill_points($1, '2026-11-01', '2026-11-30') ORDER BY skill, total DESC, student_name`, [CA]);
  eq("get_class_skill_points (month): name, skill and total per child of class A - and only those four columns",
    month.rows, [
      { student_id: A1, student_name: "A1 Nguyen", skill: "reading", total: 4 }, { student_id: H1, student_name: "H1 Pham", skill: "reading", total: 4 }, { student_id: M1, student_name: "M1 Tran", skill: "reading", total: 4 },
      { student_id: M1, student_name: "M1 Tran", skill: "speaking", total: 9 }, { student_id: A1, student_name: "A1 Nguyen", skill: "speaking", total: 3 }, { student_id: H1, student_name: "H1 Pham", skill: "speaking", total: 3 }]);
  // It must equal what the old class-wide query added up to (PerformanceHeatmapTab's own arithmetic), computed here without RLS.
  const truth = await q(`SELECT sa.student_id, s.full_name student_name, sa.skill, sum(sa.score)::int total FROM public.skill_assessments sa JOIN public.students s ON s.id = sa.student_id
    WHERE sa.class_id = $1 AND sa.date BETWEEN '2026-11-01' AND '2026-11-30' GROUP BY 1,2,3 ORDER BY skill, total DESC, student_name`, [CA]);
  eq("  ...the same figures the panel computed from rows before", month.rows, truth);
  const all = await as(KID, `SELECT skill, max(total)::int best FROM public.get_class_skill_points($1) GROUP BY skill ORDER BY skill`, [CA]);
  eq("get_class_skill_points (all time, RadarChartTab's class best): by the child's own login", all.rows, [{ skill: "reading", best: 4 }, { skill: "speaking", best: 11 }]);
  for (const [label, who, role, n] of [["teacher A", TEA, "authenticated", 6], ["admin", ADMIN, "authenticated", 6], ["teacher B (another class)", TEB, "authenticated", 0], ["family 2 (class B only)", PB, "authenticated", 0],
    ["an account linked to nothing", NEW, "authenticated", 0], ["an account with no role", NOROLE, "authenticated", 0], ["no uid", null, "authenticated", 0]]) {
    eq(`  class A's skill figures for ${label}: ${n} rows`, (await as(who, `SELECT count(*)::int n FROM public.get_class_skill_points($1, '2026-11-01', '2026-11-30')`, [CA], role)).rows[0]?.n, n);
  }
  const anon = await as(null, `SELECT * FROM public.get_class_skill_points($1)`, [CA], "anon");
  ok("  anon cannot call it", anon.err !== null && /permission denied/.test(anon.err), anon.err ?? "callable");
  const left = await as(HL, `SELECT count(*)::int n FROM public.get_class_skill_points($1)`, [CB]);
  eq("  a login whose family has a child enrolled in class B now reads class B's figures; one whose child left would not", left.rows[0].n > 0, true);
}
{
  // FamilyDashboard / StudentDashboard / AttendanceHeatmap / StudentScheduleCalendar / PointsBreakdownChart / StudentLessonDetail: all by the child's id.
  const d = await as(PA, `SELECT
    (SELECT count(*)::int FROM public.student_points WHERE student_id = ANY ($1::uuid[])) sp,
    (SELECT count(*)::int FROM public.attendance WHERE student_id = ANY ($1::uuid[]) AND status = 'Present') att,
    (SELECT count(*)::int FROM public.enrollments WHERE student_id = ANY ($1::uuid[])) enr,
    (SELECT count(*)::int FROM public.point_transactions WHERE student_id = ANY ($1::uuid[])) pt`, [[A1, A2]]);
  eq("the family and student dashboards: points, attendance, enrollments and awards of both children", d.rows[0], { sp: 2, att: 2, enr: 2, pt: 2 });
  // GlobalCalendar (student view): own enrollments, then the classes' sessions.
  const cal = await as(KID, `SELECT s.id FROM public.sessions s WHERE s.class_id IN (SELECT class_id FROM public.enrollments WHERE student_id = $1)`, [A1]);
  eq("the calendar: child A1's login reads class A's lessons", cal.rows.map((r) => r.id), [SA]);
  const calB = await as(KID, `SELECT count(*)::int n FROM public.sessions WHERE class_id = $1`, [CB]);
  eq("  ...and its sibling's class B lessons, as before (is_student_enrolled_in_class counts brothers and sisters)", calB.rows[0].n, 1);
  // The assistant: _lib/chat-context reads the caller's own children; studentFor refuses anyone else before a query runs.
  const ctx = await as(PA, `SELECT id, full_name FROM public.students WHERE family_id = $1 AND is_active = true ORDER BY full_name`, [F1]);
  eq("the assistant's context for a parent: both children by name", ctx.rows.map((r) => r.full_name), ["A1 Nguyen", "A2 Nguyen"]);
  const find = await as(PA, `SELECT id, full_name FROM public.students WHERE id = ANY ($1::uuid[])`, [[A1, A2]]);
  eq("the assistant's find_students for a parent (its own ids): both", find.rows.length, 2);
  const sneak = await as(PA, `SELECT id FROM public.students WHERE id = $1`, [M1]);
  eq("  ...and were studentFor ever bypassed, a classmate's id now returns nothing at the database too", sneak.rows.length, 0);
  const teacherRoster = await as(TEA, `SELECT s.id FROM public.students s WHERE s.id = ANY ($1::uuid[])`, [[A1, M1, H1, B1]]);
  eq("the assistant's roster for a teacher: class A's three, not class B's child", teacherRoster.rows.length, 3);
}

console.log("=== a surviving classmate policy stops the install ===");
{
  await db.exec(`CREATE POLICY "Classmates can view attendance" ON public.attendance FOR SELECT TO public USING (true)`);
  // The file drops that name itself, so it must install cleanly and remove it...
  let e = null; try { await db.exec(fixText); } catch (x) { e = x.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("a stray policy under one of the four old names is dropped by the file", e === null && (await q(`SELECT 1 FROM pg_policies WHERE policyname = 'Classmates can view attendance'`)).length === 0, e ?? "");
  // ...while one under an unknown name that still calls can_view_classmate is refused.
  await db.exec(`CREATE POLICY "Another classmates policy" ON public.students FOR SELECT TO authenticated USING (public.can_view_classmate(id, auth.uid()))`);
  let g = null; try { await db.exec(fixText); } catch (x) { g = x.message; }
  await db.exec("ROLLBACK").catch(() => {});
  ok("an unknown policy still handing out classmates is refused by name", g !== null && /Another classmates policy/.test(g), g ?? "installed");
  await db.exec(`DROP POLICY "Another classmates policy" ON public.students`);
  eq("and the fix's own policies are still in place", (await pols()).length, P1.length);
}

console.log("=== the rollback file ===");
{
  let e = null; try { await db.exec(LIVE); } catch (x) { e = x.message; }
  ok("docs/evidence/S1-F16-rollback.sql runs after the fix", e === null, e ?? "");
  eq("the policies are byte-for-byte the starting state", await pols(), P0);
  eq("the two functions are gone", (await one(`SELECT count(*)::int n FROM pg_proc WHERE proname IN ('is_family_student','get_class_skill_points')`)).n, 0);
  eq("and every login reads exactly what it read before the fix", await reachAll(), BEFORE);
  let e2 = null; try { await db.exec(LIVE); } catch (x) { e2 = x.message; }
  ok("it can be pasted twice", e2 === null, e2 ?? "");
  let e3 = null; try { await db.exec(fixText); } catch (x) { e3 = x.message; }
  ok("and the fix pastes again over the rolled-back state", e3 === null, e3 ?? "");
  eq("closing it again", await reachAll(), AFTER);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
