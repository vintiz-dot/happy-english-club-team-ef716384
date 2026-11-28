// Class highlights: a teacher or TA of a class may add a PENDING clip for that
// class only; nobody but an admin approves; approval stamps who and when;
// students and families read nothing; tagged children must be enrolled.
//
// Drives supabase/migrations/20261129090000_class_highlights.sql against an
// in-process Postgres. is_teacher_of_class is stood in for by a table: the
// real rule is tested elsewhere, this suite checks that the highlights
// policies ask it.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.length > 2 ? process.argv.slice(2) : ["supabase/migrations/20261129090000_class_highlights.sql"];
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid,
    start_date date NOT NULL DEFAULT CURRENT_DATE, end_date date);
  CREATE TABLE public.test_staff (user_id uuid, class_id uuid);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE FUNCTION public.is_teacher_of_class(user_id uuid, class_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $f$
    SELECT EXISTS (SELECT 1 FROM public.test_staff t WHERE t.user_id = is_teacher_of_class.user_id AND t.class_id = is_teacher_of_class.class_id) $f$;
  GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
`;
const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n"));
ok("applies", true);
{
  let again = null;
  try { await db.exec(MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n")); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}

const ADMIN = "99999999-9999-9999-9999-999999999999";
const T1 = "11111111-1111-1111-1111-111111111111"; // teacher of class A
const T2 = "22222222-2222-2222-2222-222222222222"; // teacher of class B
const KID = "33333333-3333-3333-3333-333333333333"; // a student account
const CA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const S_IN = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const S_OUT = "dddddddd-dddd-dddd-dddd-dddddddddddd";
await db.exec(`
  INSERT INTO public.classes VALUES ('${CA}','A'), ('${CB}','B');
  INSERT INTO public.students (id, full_name) VALUES ('${S_IN}','In class'), ('${S_OUT}','Not in class');
  INSERT INTO public.enrollments (student_id, class_id) VALUES ('${S_IN}','${CA}');
  INSERT INTO public.test_staff VALUES ('${T1}','${CA}'), ('${T2}','${CB}');
`);

async function as(uid, role, dbRole, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec(`SET LOCAL ROLE ${dbRole}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (...a) => { try { await as(...a); return null; } catch (e) { return e.message; } };
const rows = async (uid, role, dbRole, q, p) => as(uid, role, dbRole, async () => (await db.query(q, p)).rows);

const ins = (uid, cls, extra = "") => `INSERT INTO public.class_highlights (class_id, storage_path, uploaded_by${extra ? ", " + extra.split("|")[0] : ""})
  VALUES ('${cls}', '${cls}/x.mp4', '${uid}'${extra ? ", " + extra.split("|")[1] : ""}) RETURNING id`;

console.log("=== insert ===");
const id1 = (await rows(T1, "teacher", "authenticated", ins(T1, CA)))[0].id;
ok("teacher of the class adds a pending clip", !!id1);
ok("teacher of another class cannot add one", (await tryAs(T2, "teacher", "authenticated", () => db.exec(ins(T2, CA)))) !== null);
ok("cannot add as approved", (await tryAs(T1, "teacher", "authenticated", () => db.exec(ins(T1, CA, "status|'approved'")))) !== null);
ok("cannot add in someone else's name", (await tryAs(T1, "teacher", "authenticated", () => db.exec(ins(T2, CA)))) !== null);
ok("tagging a child enrolled in the class works", (await tryAs(T1, "teacher", "authenticated", () => db.exec(ins(T1, CA, `student_ids|ARRAY['${S_IN}']::uuid[]`)))) === null);
ok("tagging a child who is not in the class is refused", (await tryAs(T1, "teacher", "authenticated", () => db.exec(ins(T1, CA, `student_ids|ARRAY['${S_OUT}']::uuid[]`)))) !== null);
ok("a 700-second clip is refused", (await tryAs(T1, "teacher", "authenticated", () => db.exec(ins(T1, CA, "duration_seconds|700")))) !== null);

console.log("=== read ===");
ok("teacher of the class reads its clips", (await rows(T1, "teacher", "authenticated", "SELECT id FROM public.class_highlights")).length >= 1);
eq0("teacher of another class reads none", (await rows(T2, "teacher", "authenticated", "SELECT id FROM public.class_highlights")).length);
eq0("a student reads none", (await rows(KID, "student", "authenticated", "SELECT id FROM public.class_highlights")).length);
eq0("a family reads none", (await rows(KID, "family", "authenticated", "SELECT id FROM public.class_highlights")).length);
eq0("anon reads none", (await rows(null, null, "anon", "SELECT id FROM public.class_highlights").catch(() => [])).length);
function eq0(n, got) { ok(n, got === 0, `got ${got}`); }

console.log("=== approve ===");
await rows(T1, "teacher", "authenticated", `UPDATE public.class_highlights SET status='approved' WHERE id='${id1}' RETURNING id`);
eq0("a teacher's update changes nothing (no update policy)",
  (await rows(ADMIN, "admin", "authenticated", `SELECT id FROM public.class_highlights WHERE id='${id1}' AND status <> 'pending'`)).length);
const ap = (await rows(ADMIN, "admin", "authenticated",
  `UPDATE public.class_highlights SET status='approved', approved_by = '${T1}' WHERE id='${id1}' RETURNING status, approved_by, approved_at`))[0];
ok("admin approves it", ap?.status === "approved");
ok("approved_by is the admin, not what the client sent", ap?.approved_by === ADMIN, String(ap?.approved_by));
ok("approved_at is set", !!ap?.approved_at);
const rj = (await rows(ADMIN, "admin", "authenticated",
  `UPDATE public.class_highlights SET status='rejected', reject_reason='removed' WHERE id='${id1}' RETURNING approved_by, approved_at`))[0];
ok("taking it off clears who and when", rj?.approved_by === null && rj?.approved_at === null);

console.log("=== delete ===");
const id2 = (await rows(T1, "teacher", "authenticated", ins(T1, CA)))[0].id;
const d1 = await rows(T1, "teacher", "authenticated", `DELETE FROM public.class_highlights WHERE id='${id2}' RETURNING id`);
ok("uploader deletes their pending clip", d1.length === 1);
await rows(ADMIN, "admin", "authenticated", `UPDATE public.class_highlights SET status='approved' WHERE id='${id1}'`);
const d2 = await rows(T1, "teacher", "authenticated", `DELETE FROM public.class_highlights WHERE id='${id1}' RETURNING id`);
ok("but not once it is approved", d2.length === 0);

console.log("=== storage ===");
const put = (uid, role, path) => tryAs(uid, role, "authenticated", () => db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('class-highlights', '${path}')`));
ok("teacher uploads into their class's folder", (await put(T1, "teacher", `${CA}/a.mp4`)) === null);
ok("teacher cannot upload into another class's folder", (await put(T1, "teacher", `${CB}/a.mp4`)) !== null);
ok("a student cannot upload", (await put(KID, "student", `${CA}/b.mp4`)) !== null);
ok("a path that is not a class folder is refused", (await put(T1, "teacher", `junk/a.mp4`)) !== null);
eq0("another class's teacher cannot see the file", (await rows(T2, "teacher", "authenticated", "SELECT id FROM storage.objects WHERE bucket_id='class-highlights'")).length);
ok("an admin sees it", (await rows(ADMIN, "admin", "authenticated", "SELECT id FROM storage.objects WHERE bucket_id='class-highlights'")).length === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
