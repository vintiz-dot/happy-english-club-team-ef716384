// Audit clips: admin-only, consent before upload, codes and clip numbers
// assigned by the database, withdrawal removes everything.
//
// Drives supabase/migrations/20261111090000_audit_voice_clips.sql against an
// in-process Postgres. What matters most: nobody but an admin can read or
// write a clip row or a file in the bucket, and a child with no recorded
// consent cannot get a clip, whatever the client sends.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  GRANT USAGE ON SCHEMA storage TO authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
  GRANT SELECT ON public.students TO authenticated;
`;
const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");

const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(sql());
ok("applies", true);
{
  let again = null;
  try { await db.exec(sql()); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}

const one = async (q, p) => (await db.query(q, p)).rows[0];
const ADMIN = "11111111-1111-1111-1111-111111111111";
const TEACHER = "22222222-2222-2222-2222-222222222222";
const FAMILY = "33333333-3333-3333-3333-333333333333";
await db.query(`INSERT INTO auth.users (id) VALUES ($1),($2),($3)`, [ADMIN, TEACHER, FAMILY]);
const minh = (await one(`INSERT INTO public.students (full_name) VALUES ('Minh') RETURNING id`)).id;
const an = (await one(`INSERT INTO public.students (full_name) VALUES ('An') RETURNING id`)).id;
const lan = (await one(`INSERT INTO public.students (full_name) VALUES ('Lan') RETURNING id`)).id;

async function as(uid, role, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec("SET LOCAL ROLE authenticated");
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, role, fn) => { try { await as(uid, role, fn); return null; } catch (e) { return e.message; } };
const enrol = (uid, role, student, note) =>
  as(uid, role, async () => (await db.query(`SELECT public.audit_clip_enrol($1, $2) AS c`, [student, note])).rows[0].c);

console.log("=== consent comes first ===");
ok("a note is required to add a child",
  /how the parents consented/i.test(await tryAs(ADMIN, "admin", () => db.query(`SELECT public.audit_clip_enrol($1, '  ')`, [minh])) ?? ""));
ok("only an admin can add a child",
  /Only an admin/.test(await tryAs(TEACHER, "teacher", () => db.query(`SELECT public.audit_clip_enrol($1, 'x')`, [minh])) ?? ""));
ok("a clip for a child with no consent on record is refused",
  /Consent has not been recorded/.test(await tryAs(ADMIN, "admin", () => db.query(
    `INSERT INTO public.audit_clips (student_id, storage_path) VALUES ($1, 'S01/x.mp4')`, [minh])) ?? ""));

console.log("=== codes and clip numbers ===");
eq("first child is S01", await enrol(ADMIN, "admin", minh, "written, 3 Nov"), "S01");
eq("second child is S02", await enrol(ADMIN, "admin", an, "written"), "S02");
eq("asking again returns the same code", await enrol(ADMIN, "admin", minh, "other note"), "S01");
for (const [sid, p] of [[minh, "S01/a.mp4"], [minh, "S01/b.mp4"], [an, "S02/c.mp4"]]) {
  await as(ADMIN, "admin", () => db.query(
    `INSERT INTO public.audit_clips (student_id, storage_path, clip_no) VALUES ($1, $2, 99)`, [sid, p]));
}
eq("clip numbers are assigned per child, whatever the client sends",
  (await db.query(`SELECT student_id = $1 AS minh, clip_no FROM public.audit_clips ORDER BY storage_path`, [minh])).rows,
  [{ minh: true, clip_no: 1 }, { minh: true, clip_no: 2 }, { minh: false, clip_no: 1 }]);
ok("storage paths are unique",
  /unique|duplicate/i.test(await tryAs(ADMIN, "admin", () => db.query(
    `INSERT INTO public.audit_clips (student_id, storage_path) VALUES ($1,'S01/a.mp4')`, [minh])) ?? ""));

console.log("=== nobody but an admin ===");
for (const [who, uid, role] of [["a teacher", TEACHER, "teacher"], ["a family", FAMILY, "family"]]) {
  eq(`${who} sees no clip rows`, (await as(uid, role, () => db.query(`SELECT 1 FROM public.audit_clips`))).rows.length, 0);
  eq(`${who} sees no subjects`, (await as(uid, role, () => db.query(`SELECT 1 FROM public.audit_clip_subjects`))).rows.length, 0);
  ok(`${who} cannot add a clip`, (await tryAs(uid, role, () => db.query(
    `INSERT INTO public.audit_clips (student_id, storage_path) VALUES ($1,'S01/z.mp4')`, [minh]))) !== null);
  ok(`${who} cannot upload a file`, (await tryAs(uid, role, () => db.query(
    `INSERT INTO storage.objects (bucket_id, name) VALUES ('audit-clips','S01/z.mp4')`))) !== null);
}
eq("an admin uploads a file", await tryAs(ADMIN, "admin", () => db.query(
  `INSERT INTO storage.objects (bucket_id, name) VALUES ('audit-clips','S01/a.mp4')`)), null);
eq("a teacher cannot read it", (await as(TEACHER, "teacher", () => db.query(`SELECT 1 FROM storage.objects WHERE bucket_id='audit-clips'`))).rows.length, 0);
eq("an admin can", (await as(ADMIN, "admin", () => db.query(`SELECT 1 FROM storage.objects WHERE bucket_id='audit-clips'`))).rows.length, 1);
eq("the bucket is private", (await one(`SELECT public FROM storage.buckets WHERE id='audit-clips'`)).public, false);

console.log("=== withdrawing ===");
await as(ADMIN, "admin", () => db.query(`DELETE FROM public.audit_clip_subjects WHERE student_id=$1`, [minh]));
eq("withdrawing a child removes their clips", (await one(`SELECT count(*)::int n FROM public.audit_clips WHERE student_id=$1`, [minh])).n, 0);
eq("and leaves another child's", (await one(`SELECT count(*)::int n FROM public.audit_clips WHERE student_id=$1`, [an])).n, 1);
eq("the next child gets a code no one else holds", await enrol(ADMIN, "admin", lan, "ok"), "S03");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
