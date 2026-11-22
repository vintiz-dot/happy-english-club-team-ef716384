// Course media (20261122190000): the course books' class videos and audio in
// R2 under `course-media/`. Staff (admin, role teacher) may read; only an
// admin may write, replace or delete; families, children and the signed-out
// get nothing. Asked of public.file_access_can (20261118090000), which is
// what the hec-files Worker asks, and checked against what Storage's own RLS
// says for the same person and file.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// The Supabase pieces the two migrations lean on, as file-store-access.test.mjs stands them in.
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean DEFAULT false,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, owner_id text, metadata jsonb);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS
    $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
    $f$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $f$;
  CREATE FUNCTION public.storage_object_is_mine(_owner uuid, _owner_id text)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT auth.uid() IS NOT NULL AND (_owner = auth.uid() OR _owner_id = auth.uid()::text) $f$;
  GRANT USAGE ON SCHEMA storage TO authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
  GRANT SELECT ON storage.buckets TO authenticated;
  -- Another bucket's loose read policy, as production has: it must not reach course-media.
  INSERT INTO storage.buckets (id, public) VALUES ('other', false);
  CREATE POLICY other_all ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'other');
`;
const sql = () => MIGS.map((f) => readFileSync(f, "utf8")).join("\n;\n");
const course = MIGS.find((f) => /course_media_bucket/.test(f));
if (!course) throw new Error("usage: course-media.test.mjs <file_store_access migration> <course_media_bucket migration>");

const db = new PGlite();
await db.exec(PRELUDE);
await db.exec(sql());
ok("applies", true);
{
  let again = null;
  try { await db.exec(readFileSync(course, "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}
eq("the bucket is private, 300 MB a file, video and audio only",
  (await db.query(`SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'course-media'`)).rows,
  [{ public: false, file_size_limit: 314572800, allowed_mime_types: ["video/mp4", "audio/mpeg", "audio/mp4"] }]);

const PEOPLE = {
  admin: "11111111-1111-1111-1111-111111111111",
  teacher: "22222222-2222-2222-2222-222222222222",
  family: "33333333-3333-3333-3333-333333333333",
  student: "44444444-4444-4444-4444-444444444444",
};
for (const id of Object.values(PEOPLE)) await db.query(`INSERT INTO auth.users (id) VALUES ($1)`, [id]);

async function as(uid, role, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec("SET LOCAL ROLE authenticated");
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const can = (uid, role, p, op) =>
  as(uid, role, async () => (await db.query(`SELECT public.file_access_can('course-media', $1, $2) AS c`, [p, op])).rows[0].c);
// What Storage's own RLS says about reading a file that is there.
async function storageReads(uid, role, p) {
  await db.exec("BEGIN");
  try {
    await db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('course-media', $1)`, [p]);
    await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
    await db.exec("SET LOCAL ROLE authenticated");
    return (await db.query(`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = 'course-media' AND name = $1`, [p])).rows[0].n === 1;
  } finally { await db.exec("ROLLBACK"); }
}

const FILE = "reach-higher/3b/unit-7-video.mp4";
const want = {
  admin: { read: true, write: true, delete: true },
  teacher: { read: true, write: false, delete: false },
  family: { read: false, write: false, delete: false },
  student: { read: false, write: false, delete: false },
};
for (const [role, uid] of Object.entries(PEOPLE)) {
  const got = {};
  for (const op of ["read", "write", "delete"]) got[op] = await can(uid, role, FILE, op);
  eq(`${role}: read / write / delete`, got, want[role]);
  eq(`${role}: file_access_can agrees with Storage's own RLS on reading`, await storageReads(uid, role, FILE), want[role].read);
}
eq("signed out: nothing", [await can(null, null, FILE, "read"), await can(null, null, FILE, "write")], [false, false]);
eq("a teacher reads a batch, as the Worker asks",
  (await as(PEOPLE.teacher, "teacher", async () => (await db.query(
    `SELECT p FROM public.file_access_can_many('course-media', ARRAY[$1, $2], 'read') AS p ORDER BY p`,
    [FILE, "reach-higher/3a/unit-1-video.mp4"])).rows)).map((r) => r.p),
  ["reach-higher/3a/unit-1-video.mp4", FILE]);
eq("a family's read of the other bucket's loose policy does not carry over", await can(PEOPLE.family, "family", FILE, "read"), false);

// A loose policy beside these would open the bucket: the paste refuses.
{
  await db.exec(`CREATE POLICY loose_course_media ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'course-media')`);
  let err = null;
  try { await db.exec(readFileSync(course, "utf8")); } catch (e) { err = e.message; await db.exec("ROLLBACK"); }
  ok("refuses to install beside another policy that names the bucket", /other storage policies name the bucket \(loose_course_media\)/.test(err ?? ""), err ?? "installed");
  await db.exec(`DROP POLICY loose_course_media ON storage.objects`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
