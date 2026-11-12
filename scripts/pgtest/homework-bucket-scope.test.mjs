// F-14: the `homework` bucket - who may read, upload, overwrite and delete.
//
// Drives the REAL files against an in-process Postgres:
//   20261111110000  the real is_teacher_of_class (it says yes to TAs),
//   docs/evidence/S1-F14-rollback.sql  = the 36 policies production had on
//                   13 Nov 2026, verbatim. Run first, it IS the "before";
//                   run again at the end, it is the rollback under test,
//   20261113110000  the fix, pasted twice.
//
// The storage stand-in is class-recordings-scope.test.mjs's: storage.objects
// with RLS on and table privileges as Supabase grants them, so only policies
// decide. An upload is an INSERT, an overwrite / move an UPDATE, a remove a
// DELETE, a download / signed URL / list a SELECT.
//
// Roles are as production has them: every family login holds `student`
// (no live account holds `family`); TAs hold `teacher`.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX_MIG = MIGS.find((f) => f.includes("homework_bucket_scope"));
if (!TA_MIG || !FIX_MIG) {
  console.log("usage: homework-bucket-scope.test.mjs <20261111110000_...sql> <20261113110000_homework_bucket_scope.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
const LIVE = readFileSync(new URL("../../docs/evidence/S1-F14-rollback.sql", import.meta.url), "utf8");
const BUCKET = "homework";
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text,
    default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL,
    linked_user_id uuid, secondary_user_id uuid, family_id uuid REFERENCES public.families(id));
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE TABLE public.homework_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE, student_id uuid NOT NULL, storage_key text);

  -- public.can_view_student, verbatim from the live catalog (13 Nov 2026).
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
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
  $f$;
  GRANT EXECUTE ON FUNCTION public.can_view_student(uuid, uuid) TO authenticated;

  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  INSERT INTO storage.buckets (id, name, public) VALUES ('homework','homework',false), ('student-work','student-work',false);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, metadata jsonb, UNIQUE (bucket_id, name));
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
  -- The old policies read these tables directly, as the caller. Production's
  -- row policies would narrow some of those sub-selects further; granting
  -- plain SELECT here makes the "before" at least as open as production's was
  -- for the blanket policies under test (they only call has_role).
  GRANT SELECT ON public.teachers, public.teaching_assistants, public.classes, public.sessions, public.homeworks,
    public.session_participants, public.students, public.families, public.enrollments, public.user_roles,
    public.homework_submissions TO authenticated;
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);   // 20260719014455
let liveErr = null;
try { await db.exec(LIVE); } catch (e) { liveErr = e.message; }
ok("the 36 production policies (the rollback file) install as the starting state", liveErr === null, liveErr ?? "");

// ---------------------------------------------------------------- people
let seq = 0;
const mk = async (role) => {
  const id = randomUUID(); seq++;
  await q(`INSERT INTO auth.users (id) VALUES ($1)`, [id]);
  if (role) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, role]);
  return id;
};
const ADMIN = await mk("admin");
const TEA = await mk("teacher"), TEB = await mk("teacher"), TA_ON = await mk("teacher"), TA_OFF = await mk("teacher");
const PA = await mk("student");        // family 1's primary login (child A1, class A)
const KID = await mk("student");       // A1's own login
const SEC = await mk("student");       // A1's second login
const PMATE = await mk("student");     // family 3's primary login (child A3, class A): a classmate's parent
const PB = await mk("student");        // family 2's primary login (child B1, class B)
const PEX = await mk("student");       // family 4: child X1 left class A yesterday
const NEW = await mk("student");       // registered a minute ago, linked to nothing
const NEWFAM = await mk("family");     // the same, having picked "Family" under the old trigger
const FAKE_T = await mk("teacher");    // picked "Teacher" under the old trigger: role, no teachers row
const NOROLE = await mk(null);         // asked for teacher after the F-01 fix: no role at all

const tA = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEA])).id;
const tB = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEB])).id;
const taOn = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_ON])).id;
const taOff = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_OFF])).id;
const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class A', $1) RETURNING id`, [tA])).id;
const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class B', $1) RETURNING id`, [tB])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2),($3,$4)`, [CA, taOn, CB, taOff]);
const fam = async (uid) => (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [uid])).id;
const F1 = await fam(PA), F2 = await fam(PB), F3 = await fam(PMATE), F4 = await fam(PEX);
const kid = async (name, family, cls, { linked = null, secondary = null, end = null } = {}) => {
  const id = (await one(`INSERT INTO public.students (full_name, family_id, linked_user_id, secondary_user_id) VALUES ($1,$2,$3,$4) RETURNING id`,
    [name, family, linked, secondary])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, end_date) VALUES ($1,$2,$3)`, [id, cls, end]);
  return id;
};
const A1 = await kid("A1", F1, CA, { linked: KID, secondary: SEC });
const A3 = await kid("A3", F3, CA);
const B1 = await kid("B1", F2, CB);
const X1 = await kid("X1", F4, CA, { end: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10) });
const hw = async (cls) => (await one(`INSERT INTO public.homeworks (class_id) VALUES ($1) RETURNING id`, [cls])).id;
const HA = await hw(CA), HB = await hw(CB);

// ---------------------------------------------------------------- objects
const put = async (name, bucket = BUCKET) =>
  (await one(`INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2) RETURNING id`, [bucket, name])).id;
const O = {
  a_teacher: await put(`${HA}/1762740000000.pdf`),                         // AssignmentUpload.tsx
  a_admin: await put(`assignments/${HA}/1762740000000-sheet.pdf`),         // ClassHomework.tsx
  b_teacher: await put(`${HB}/1762740000000.pdf`),
  sA1: await put(`submissions/${HA}/${A1}/1762740000000-photo.jpg`),       // HomeworkSubmission.tsx
  sA3: await put(`submissions/${HA}/${A3}/1762740000000-photo.jpg`),
  sB1: await put(`submissions/${HB}/${B1}/1762740000000-photo.jpg`),
  sX1: await put(`submissions/${HA}/${X1}/1762740000000-photo.jpg`),
  oldA1: await put(`homework-submissions/${A1}/old.jpg`),                  // referenced by a submission row
  oldA3: await put(`homework-submissions/${A3}/unreferenced.jpg`),         // referenced by nothing
};
await q(`INSERT INTO public.homework_submissions (homework_id, student_id, storage_key) VALUES ($1,$2,$3)`, [HA, A1, `homework-submissions/${A1}/old.jpg`]);
const nameOf = async (id) => (await one(`SELECT name FROM storage.objects WHERE id = $1`, [id])).name;

async function attempt(uid, sql, params = [], role = "authenticated") {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(sql, params);
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) { return { rows: [], n: 0, err: e.message }; }
  finally { await db.exec("ROLLBACK"); }
}
// No RETURNING on the writes: it would apply the SELECT policy to the new row
// and hide a weak INSERT / UPDATE check behind the SELECT one.
const canRead = async (who, id, role) => (await attempt(who, `SELECT id FROM storage.objects WHERE id = $1`, [id], role)).rows.length === 1;
const canUpdate = async (who, id, role) => { const r = await attempt(who, `UPDATE storage.objects SET metadata = '{"size":1}' WHERE id = $1`, [id], role); return r.err === null && r.n === 1; };
const canDelete = async (who, id, role) => { const r = await attempt(who, `DELETE FROM storage.objects WHERE id = $1`, [id], role); return r.err === null && r.n === 1; };
const canInsert = async (who, name, role) => { const r = await attempt(who, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,auth.uid())`, [BUCKET, name], role); return r.err === null && r.n === 1; };
const sees = async (who, role) => (await attempt(who, `SELECT count(*)::int n FROM storage.objects WHERE bucket_id = $1`, [BUCKET], role)).rows[0]?.n ?? 0;
const reads = async (who, role) => { const out = []; for (const [k, id] of Object.entries(O)) if (await canRead(who, id, role)) out.push(k); return out; };
const ALLKEYS = Object.keys(O);

// ---------------------------------------------------------------- BEFORE
console.log("=== before the fix: the defect reproduces ===");
eq("an account registered a minute ago (student, linked to nothing) reads EVERY homework file", await reads(NEW), ALLKEYS);
eq("  ...and can list the bucket", await sees(NEW), ALLKEYS.length);
eq("the same with the family role", await reads(NEWFAM), ALLKEYS);
eq("a self-made teacher (role, no teacher record) reads every file", await reads(FAKE_T), ALLKEYS);
ok("family 2 reads family 1's child's submission", await canRead(PB, O.sA1));
ok("teacher B (class B) reads class A's submissions", await canRead(TEB, O.sA1));
ok("teacher B can overwrite a class A child's submission", await canUpdate(TEB, O.sA1));
ok("teacher B can overwrite class A's assignment sheet", await canUpdate(TEB, O.a_teacher));
ok("an unlinked student can upload anywhere under submissions/", await canInsert(NEW, `submissions/${HA}/${A1}/planted.jpg`));
ok("a self-made teacher can upload under assignments/ for any homework", await canInsert(FAKE_T, `assignments/${HA}/planted.pdf`));
eq("control: an account with no role reads nothing even before", await reads(NOROLE), []);

// ---------------------------------------------------------------- APPLY
const policies = async () => q(
  `SELECT policyname, permissive, roles::text, cmd, qual, with_check FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname`);
eq("36 policies reach the bucket before", (await policies()).length, 36);
const fixText = readFileSync(FIX_MIG, "utf8");
let e1 = null; try { await db.exec(fixText); } catch (e) { e1 = e.message; }
ok("the fix applies", e1 === null, e1 ?? "");
const P1 = await policies();
let e2 = null; try { await db.exec(fixText); } catch (e) { e2 = e.message; }
ok("and applies a second time", e2 === null, e2 ?? "");
eq("the second paste leaves the same policies, byte for byte", await policies(), P1);
eq("exactly six policies reach the bucket; none of the 36 is left",
  P1.map((p) => `${p.policyname}:${p.cmd}:${p.permissive}:${p.roles}`),
  ["homework_admin_all:ALL:PERMISSIVE:{authenticated}", "homework_family_insert:INSERT:PERMISSIVE:{authenticated}",
   "homework_read:SELECT:PERMISSIVE:{authenticated}", "homework_staff_delete:DELETE:PERMISSIVE:{authenticated}",
   "homework_staff_insert:INSERT:PERMISSIVE:{authenticated}", "homework_staff_update:UPDATE:PERMISSIVE:{authenticated}"]);
ok("every one of them is scoped by bucket_id = 'homework'",
  P1.every((p) => [p.qual, p.with_check].filter(Boolean).every((t) => t.includes("bucket_id = 'homework'"))));
eq("no object was moved or deleted", (await one(`SELECT count(*)::int n FROM storage.objects WHERE bucket_id = $1`, [BUCKET])).n, ALLKEYS.length);
eq("the bucket row is untouched", await one(`SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = $1`, [BUCKET]),
  { public: false, file_size_limit: null, allowed_mime_types: null });
eq("the three helpers: STABLE, SECURITY DEFINER, search_path pinned, executable by authenticated, not by anon / PUBLIC",
  await q(`SELECT p.proname n, p.provolatile v, p.prosecdef d, p.proconfig::text c,
      has_function_privilege('anon', p.oid, 'EXECUTE') a, has_function_privilege('authenticated', p.oid, 'EXECUTE') u
    FROM pg_proc p WHERE p.proname LIKE 'homework_object_%' ORDER BY 1`),
  ["homework_object_can_read", "homework_object_family_can_upload", "homework_object_staff_can"].map((n) =>
    ({ n, v: "s", d: true, c: "{search_path=public}", a: false, u: true })));

// ---------------------------------------------------------------- AFTER: reads
console.log("=== after: who reads what ===");
eq("admin reads everything", await reads(ADMIN), ALLKEYS);
eq("teacher A (class A): class A's sheets, class A's submissions, and the old file its submission row points at",
  await reads(TEA), ["a_teacher", "a_admin", "sA1", "sA3", "sX1", "oldA1"]);
eq("a TA on class A: the same", await reads(TA_ON), ["a_teacher", "a_admin", "sA1", "sA3", "sX1", "oldA1"]);
eq("teacher B (class B): class B's sheet and submission only", await reads(TEB), ["b_teacher", "sB1"]);
eq("a TA on class B only: the same", await reads(TA_OFF), ["b_teacher", "sB1"]);
eq("family 1's primary login: class A's sheets and child A1's own submissions", await reads(PA), ["a_teacher", "a_admin", "sA1", "oldA1"]);
eq("child A1's own login: the same", await reads(KID), ["a_teacher", "a_admin", "sA1", "oldA1"]);
eq("child A1's second login: the same", await reads(SEC), ["a_teacher", "a_admin", "sA1", "oldA1"]);
eq("a classmate's parent (child A3, class A): the class's sheets and A3's files - never A1's",
  await reads(PMATE), ["a_teacher", "a_admin", "sA3", "oldA3"]);
eq("family 2 (child B1, class B): class B's sheet and B1's submission - nothing of class A", await reads(PB), ["b_teacher", "sB1"]);
eq("a family whose child left class A: the child's own submission still, the class's sheets no longer", await reads(PEX), ["sX1"]);
for (const [label, who, role] of [["an account registered a minute ago (student, linked to nothing)", NEW], ["the same with the family role", NEWFAM],
  ["a self-made teacher (role, no teacher record)", FAKE_T], ["an account with no role", NOROLE],
  ["the signed-in role with no uid", null], ["anon", null, "anon"]]) {
  eq(`${label}: reads nothing`, await reads(who, role), []);
  eq(`  ...and lists nothing`, await sees(who, role), 0);
}
eq("family 1 lists exactly its four objects", await sees(PA), 4);

// ---------------------------------------------------------------- AFTER: writes
console.log("=== after: who writes what ===");
const W = async (who, role) => {
  const out = {};
  for (const k of ALLKEYS) { const u = await canUpdate(who, O[k], role), d = await canDelete(who, O[k], role); if (u || d) out[k] = `${u ? "u" : ""}${d ? "d" : ""}`; }
  return out;
};
eq("admin may overwrite and delete everything", Object.keys(await W(ADMIN)), ALLKEYS);
eq("teacher A may overwrite / delete class A's assignment sheets - and no child's submission", await W(TEA), { a_teacher: "ud", a_admin: "ud" });
eq("a TA on class A: the same", await W(TA_ON), { a_teacher: "ud", a_admin: "ud" });
eq("teacher B: class B's sheet only", await W(TEB), { b_teacher: "ud" });
for (const [label, who, role] of [["family 1", PA], ["child A1's login", KID], ["a classmate's parent", PMATE], ["family 2", PB], ["the just-registered account", NEW],
  ["the family-role account", NEWFAM], ["the self-made teacher", FAKE_T], ["the role-less account", NOROLE], ["anon", null, "anon"]]) {
  eq(`${label}: may overwrite or delete nothing`, await W(who, role), {});
}
const UP = {
  "teacher shape, class A": `${HA}/${Date.now()}.pdf`,
  "admin shape, class A": `assignments/${HA}/${Date.now()}-sheet.pdf`,
  "teacher shape, class B": `${HB}/${Date.now()}.pdf`,
  "submission A1 for class A's homework": `submissions/${HA}/${A1}/${Date.now()}-photo.jpg`,
  "submission A3 for class A's homework": `submissions/${HA}/${A3}/${Date.now()}-photo.jpg`,
  "submission B1 for class B's homework": `submissions/${HB}/${B1}/${Date.now()}-photo.jpg`,
  "submission A1 for CLASS B's homework": `submissions/${HB}/${A1}/${Date.now()}-photo.jpg`,
  "old submission shape for A1": `homework-submissions/${A1}/${Date.now()}.jpg`,
  "homework/ folder": `homework/${Date.now()}.pdf`,
  "bare file": `x.pdf`,
};
const ups = async (who, role) => { const out = []; for (const [k, name] of Object.entries(UP)) if (await canInsert(who, name, role)) out.push(k); return out; };
eq("admin may upload any path", await ups(ADMIN), Object.keys(UP));
eq("teacher A uploads class A's assignment files (both shapes) and nothing else", await ups(TEA), ["teacher shape, class A", "admin shape, class A"]);
eq("a TA on class A: the same", await ups(TA_ON), ["teacher shape, class A", "admin shape, class A"]);
eq("teacher B: class B's only", await ups(TEB), ["teacher shape, class B"]);
eq("family 1 uploads A1's submission for class A's homework and nothing else", await ups(PA), ["submission A1 for class A's homework"]);
eq("child A1's login: the same", await ups(KID), ["submission A1 for class A's homework"]);
eq("child A1's second login: the same", await ups(SEC), ["submission A1 for class A's homework"]);
eq("a classmate's parent: A3's only", await ups(PMATE), ["submission A3 for class A's homework"]);
eq("family 2: B1's only", await ups(PB), ["submission B1 for class B's homework"]);
for (const [label, who, role] of [["the just-registered account", NEW], ["the family-role account", NEWFAM], ["the self-made teacher", FAKE_T],
  ["the role-less account", NOROLE], ["the signed-in role with no uid", null], ["anon", null, "anon"]]) {
  eq(`${label}: may upload nothing`, await ups(who, role), []);
}
{
  const late = await attempt(PEX, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2)`, [BUCKET, `submissions/${HA}/${X1}/late.jpg`]);
  ok("a child who has left the class can still hand in that class's homework late (the enrollment existed)", late.err === null, late.err ?? "");
}

console.log("=== planting and moving ===");
{
  const r1 = await attempt(TEA, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [O.a_teacher, `${HB}/moved.pdf`]);
  ok("teacher A cannot move class A's sheet under class B's homework", r1.err !== null, r1.err ?? `allowed (${r1.n})`);
  const r2 = await attempt(TEA, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [O.a_teacher, `submissions/${HA}/${A1}/fake.jpg`]);
  ok("nor rename it into a child's submission folder", r2.err !== null, r2.err ?? `allowed (${r2.n})`);
  const r3 = await attempt(TEA, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [O.a_teacher, `${HA}/renamed.pdf`]);
  ok("teacher A can rename within the homework's own folder", r3.err === null && r3.n === 1, r3.err ?? "");
  const r4 = await attempt(TEB, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2)
     ON CONFLICT (bucket_id, name) DO UPDATE SET metadata = '{"x":1}'`, [BUCKET, await nameOf(O.a_teacher)]);
  ok("teacher B cannot upsert over class A's sheet", r4.err !== null, r4.err ?? "allowed");
  const r5 = await attempt(PA, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2)
     ON CONFLICT (bucket_id, name) DO UPDATE SET metadata = '{"x":1}'`, [BUCKET, await nameOf(O.sA1)]);
  ok("a family cannot upsert over a file already handed in (the app uploads with upsert: false)", r5.err !== null, r5.err ?? "allowed");
  // A column-free UPDATE is the one shape where Postgres does not also hold
  // the new row to the SELECT policy: only WITH CHECK stands. Teacher D sees
  // exactly one updatable file.
  const TED = await mk("teacher");
  const tD = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TED])).id;
  const CD = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class D', $1) RETURNING id`, [tD])).id;
  const HD = await hw(CD);
  await put(`${HD}/only.pdf`);
  const blind = await attempt(TED, `UPDATE storage.objects SET name = '${HA}/planted.pdf'`);
  ok("a column-free UPDATE cannot move a teacher's file under another class's homework (WITH CHECK holds alone)", blind.err !== null, blind.err ?? `allowed (${blind.n})`);
  const other = await attempt(TEA, `INSERT INTO storage.objects (bucket_id, name) VALUES ('student-work', $1)`, [`${HA}/x.pdf`]);
  ok("these policies reach no other bucket: teacher A cannot write the same path into 'student-work'", other.err !== null, other.err ?? "allowed");
  const otherR = await put(`${HA}/x.pdf`, "student-work");
  eq("nor read it there", (await attempt(TEA, `SELECT 1 FROM storage.objects WHERE id = $1`, [otherR])).rows.length, 0);
}

console.log("=== paths whose owner cannot be determined: admin only ===");
const GHOST = randomUUID();
const ODD = [
  ["a homework that does not exist (3 such objects are live)", `${GHOST}/sheet.pdf`],
  ["assignments/ under a homework that does not exist", `assignments/${GHOST}/sheet.pdf`],
  ["a submission for a child that does not exist, homework that does not exist", `submissions/${GHOST}/${GHOST}/x.jpg`],
  ["the class id as first folder (an old policy's shape)", `${CA}/sheet.pdf`],
  ["homework/ folder", `homework/sheet.pdf`],
  ["a bare file", `sheet.pdf`],
  ["submissions/ with the student first and the homework second", `submissions/${A1}/${HA}/x.jpg`],
  ["submissions/ one level short", `submissions/${HA}/x.jpg`],
  ["submissions/ one level deep", `submissions/${HA}/${A1}/sub/x.jpg`],
  ["assignments/ one level deep", `assignments/${HA}/sub/x.pdf`],
  ["teacher shape one level deep", `${HA}/sub/x.pdf`],
  ["an empty file name", `${HA}/`],
  ["a leading slash", `/${HA}/x.pdf`],
  ["a uuid with trailing junk", `${HA}x/x.pdf`],
  ["Assignments/ in capitals", `Assignments/${HA}/x.pdf`],
  ["a NULL name", null],
];
for (const [label, name] of ODD) {
  const id = (await one(`INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2) RETURNING id`, [BUCKET, name])).id;
  const row = [];
  for (const who of [TEA, TA_ON, PA, KID, NEW, FAKE_T]) row.push(await canRead(who, id), await canUpdate(who, id), await canDelete(who, id), name === null || name.endsWith("/") ? false : await canInsert(who, name + ".2"));
  ok(`${label}: teacher A, TA, family 1, child A1, new account, self-made teacher - nothing`, row.every((x) => x === false), JSON.stringify(row));
  ok(`${label}: admin reads it`, await canRead(ADMIN, id));
}
{
  const r = await attempt(TEB, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2)`, [BUCKET, `${HB}/`]);
  ok("teacher B cannot upload an empty file name even under their own homework", r.err !== null && /row-level security/.test(r.err), r.err ?? "allowed");
}
{
  const up = await put(`${HA.toUpperCase()}/CAPS.pdf`);
  eq("the homework id in upper case still resolves (teacher A reads, teacher B does not)", [await canRead(TEA, up), await canRead(TEB, up)], [true, false]);
  const r = await attempt(TEA, `SELECT public.homework_object_can_read(NULL) a, public.homework_object_can_read('') b,
    public.homework_object_staff_can(NULL) c, public.homework_object_family_can_upload(NULL) d, public.homework_object_family_can_upload('') e`);
  eq("helpers: NULL and empty names are no", r.rows[0], { a: false, b: false, c: false, d: false, e: false });
  const an = await attempt(null, `SELECT public.homework_object_can_read($1)`, [await nameOf(O.sA1)], "anon");
  ok("anon cannot even call the helper", an.err !== null && /permission denied/.test(an.err), an.err ?? "callable");
}

console.log("=== the app's flows, statement by statement ===");
{
  // AssignmentUpload.tsx: homework row, then `${homework.id}/${Date.now()}.${ext}`, then a signed URL.
  for (const [label, who] of [["teacher A", TEA], ["a TA on class A", TA_ON]]) {
    const r = await attempt(who, `WITH o AS (INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,auth.uid()) RETURNING name)
      SELECT name FROM o`, [BUCKET, `${HA}/${Date.now()}.docx`]);
    ok(`${label}: uploads the assignment file and reads it back`, r.err === null && r.rows.length === 1, r.err ?? "");
  }
  // HomeworkSubmission.tsx: upload, then download of existingSubmission.storage_key.
  for (const [label, who] of [["family 1's primary login", PA], ["child A1's own login", KID]]) {
    const r = await attempt(who, `WITH o AS (INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,auth.uid()) RETURNING name)
      SELECT name FROM o`, [BUCKET, `submissions/${HA}/${A1}/${Date.now()}-my_work.jpg`]);
    ok(`${label}: hands in a file and reads it back`, r.err === null && r.rows.length === 1, r.err ?? "");
  }
  // HomeworkGrading.tsx / HomeworkGradingList.tsx: download(submission.storage_key).
  ok("teacher A opens child A1's submission to grade it", await canRead(TEA, O.sA1));
  ok("teacher A opens the old-shape submission through its row", await canRead(TEA, O.oldA1));
  ok("teacher A cannot open an old-shape file that no submission row points at", !(await canRead(TEA, O.oldA3)));
  // HomeworkDetailDialog.tsx: createSignedUrl(homework_files.storage_key).
  ok("child A1 opens both kinds of assignment file", (await canRead(KID, O.a_teacher)) && (await canRead(KID, O.a_admin)));
  // ClassHomework.tsx / SessionDrawer.tsx: admin.
  ok("admin uploads assignments/<homework>/<file> and opens any file", (await canInsert(ADMIN, `assignments/${HB}/${Date.now()}-a.pdf`)) && (await canRead(ADMIN, O.sB1)));
  // Stars sync / edge functions use the service role.
  const svc = await attempt(null, `SELECT count(*)::int n FROM storage.objects WHERE bucket_id = $1`, [BUCKET], "service_role");
  ok("the service role is unaffected", svc.rows[0].n === (await one(`SELECT count(*)::int n FROM storage.objects WHERE bucket_id = $1`, [BUCKET])).n);
}
{
  // Staff change with the timetable: the moment teacher B is given class A, B reads class A's files.
  await db.exec("BEGIN");
  await db.query(`UPDATE public.classes SET default_teacher_id = $1 WHERE id = $2`, [tB, CA]);
  await db.query(`SELECT set_config('test.uid', $1, true)`, [TEB]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  const n = (await db.query(`SELECT count(*)::int n FROM storage.objects WHERE id = ANY ($1::uuid[])`, [[O.a_admin, O.sA1]])).rows[0].n;
  await db.exec("ROLLBACK");
  eq("access follows is_teacher_of_class: reassigning the class moves it with no migration", n, 2);
}

console.log("=== a policy this migration does not know stops the install ===");
{
  await db.exec(`CREATE POLICY "Mystery homework policy" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'homework' AND public.has_role(auth.uid(), 'student'))`);
  let e = null; try { await db.exec(fixText); } catch (x) { e = x.message; }
  await db.exec("ROLLBACK").catch(() => {});
  ok("the fix refuses, naming the policy", e !== null && /Mystery homework policy/.test(e), e ?? "installed");
  eq("and nothing changed (its transaction rolled back): the six are still there", (await policies()).filter((p) => p.policyname.startsWith("homework_")).length, 6);
  await db.exec(`DROP POLICY "Mystery homework policy" ON storage.objects`);
  await db.exec(`CREATE POLICY "Everything everywhere" ON storage.objects FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)`);
  let g = null; try { await db.exec(fixText); } catch (x) { g = x.message; }
  await db.exec("ROLLBACK").catch(() => {});
  ok("a policy with no bucket test at all (it would open every bucket) stops it too", g !== null && /Everything everywhere/.test(g), g ?? "installed");
  await db.exec(`DROP POLICY "Everything everywhere" ON storage.objects`);
  await db.exec(`CREATE POLICY "homework_videos_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'homework-videos' AND false)`);
  let h = null; try { await db.exec(fixText); } catch (x) { h = x.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("the homework-videos bucket's policies are not mistaken for this bucket's", h === null, h ?? "");
  eq("and are left alone", (await policies()).filter((p) => p.policyname === "homework_videos_select").length, 1);
  await db.exec(`DROP POLICY "homework_videos_select" ON storage.objects`);
}

console.log("=== the rollback file ===");
{
  let e = null; try { await db.exec(LIVE); } catch (x) { e = x.message; }
  ok("docs/evidence/S1-F14-rollback.sql runs after the fix", e === null, e ?? "");
  eq("36 policies again, none of the six", [(await policies()).length, (await policies()).filter((p) => p.policyname.startsWith("homework_")).length], [36, 0]);
  eq("the helpers are gone", (await one(`SELECT count(*)::int n FROM pg_proc WHERE proname LIKE 'homework_object_%'`)).n, 0);
  ok("and the old behaviour is back (the just-registered account reads a child's submission)", await canRead(NEW, O.sA1));
  let e2 = null; try { await db.exec(LIVE); } catch (x) { e2 = x.message; }
  ok("it can be pasted twice", e2 === null && (await policies()).length === 36, e2 ?? "");
  let e3 = null; try { await db.exec(fixText); } catch (x) { e3 = x.message; }
  ok("and the fix pastes again over the rolled-back state", e3 === null && (await policies()).length === 6, e3 ?? "");
  eq("closing it again", await reads(NEW), []);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
