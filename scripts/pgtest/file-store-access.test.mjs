// File store access: files kept in R2 obey the storage.objects policies as
// installed, exactly as Supabase Storage would apply them.
//
// Drives supabase/migrations/20261118090000_file_store_access.sql against an
// in-process Postgres. The oracle is Postgres itself: the same policies are
// installed on a stand-in storage.objects, and for every person x bucket x
// path x operation the answer RLS gives on storage.objects must equal what
// file_access_can gives. The policies imitate the live shapes: admin-only,
// path-scoped helpers, folder = my id, uploader-owned, a subquery on
// objects.name, a restrictive policy and one for another role.
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
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean DEFAULT false,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, owner_id text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
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
  -- A path-scoped helper in the style of homework_object_can_read: the
  -- teacher of class c may read classes/c/...
  CREATE TABLE public.teaches (uid uuid, class text);
  CREATE FUNCTION public.class_file_staff_can(_name text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.teaches t
          WHERE t.uid = auth.uid() AND t.class = (storage.foldername(_name))[2]) $f$;
  CREATE TABLE public.approved (path text);
  GRANT USAGE ON SCHEMA storage TO authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
  GRANT SELECT ON storage.buckets TO authenticated;
  GRANT SELECT ON public.approved, public.teaches TO authenticated;

  INSERT INTO storage.buckets (id, public, file_size_limit, allowed_mime_types) VALUES
    ('work', false, 1000, NULL), ('vid', false, NULL, ARRAY['video/mp4']),
    ('locked', false, NULL, NULL), ('pub', true, NULL, NULL), ('none', false, NULL, NULL);

  CREATE POLICY work_admin ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'work' AND has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'work' AND has_role(auth.uid(), 'admin'));
  CREATE POLICY work_staff ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'work' AND class_file_staff_can(name));
  CREATE POLICY work_staff_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'work' AND name ~ '^classes/[a-z0-9]+/[a-z0-9_.]+$' AND class_file_staff_can(name));
  CREATE POLICY work_mine ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'work' AND name LIKE 'incoming/%' AND storage_object_is_mine(owner, owner_id));
  CREATE POLICY work_mine_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'work' AND name LIKE 'incoming/%' AND has_role(auth.uid(), 'teacher'));
  CREATE POLICY work_own_folder ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'work' AND (auth.uid())::text = (storage.foldername(name))[1]);
  CREATE POLICY vid_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'vid' AND (storage.foldername(name))[1] = (auth.uid())::text);
  CREATE POLICY vid_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'vid' AND (storage.foldername(name))[1] = (auth.uid())::text);
  CREATE POLICY vid_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'vid' AND (storage.foldername(name))[1] = (auth.uid())::text
           AND NOT EXISTS (SELECT 1 FROM public.approved a WHERE a.path = objects.name));
  CREATE POLICY locked_all ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'locked');
  CREATE POLICY locked_no_secrets ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
    USING (bucket_id <> 'locked' OR name NOT LIKE 'secret/%');
  CREATE POLICY none_for_anon ON storage.objects FOR SELECT TO anon
    USING (bucket_id = 'none');
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

const ADMIN = "11111111-1111-1111-1111-111111111111";
const TEACHER = "22222222-2222-2222-2222-222222222222";
const OTHER_T = "33333333-3333-3333-3333-333333333333";
const FAMILY = "44444444-4444-4444-4444-444444444444";
await db.query(`INSERT INTO auth.users (id) VALUES ($1),($2),($3),($4)`, [ADMIN, TEACHER, OTHER_T, FAMILY]);
await db.query(`INSERT INTO public.teaches VALUES ($1, 'c1'), ($2, 'c2')`, [TEACHER, OTHER_T]);
await db.query(`INSERT INTO public.approved VALUES ($1)`, [`${FAMILY}/approved.mp4`]);

async function as(uid, role, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec("SET LOCAL ROLE authenticated");
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, role, fn) => { try { await as(uid, role, fn); return null; } catch (e) { return e.message; } };
const can = (uid, role, b, p, op) =>
  as(uid, role, async () => (await db.query(`SELECT public.file_access_can($1, $2, $3) AS c`, [b, p, op])).rows[0].c);

// What Storage itself would say. Each probe rolls back.
async function storageSays(uid, role, b, p, op, owner) {
  await db.exec("BEGIN");
  try {
    if (op !== "write") {
      await db.query(`INSERT INTO storage.objects (bucket_id, name, owner, owner_id) VALUES ($1, $2, $3::uuid, $4::text)`, [b, p, owner, owner]);
    }
    await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid, role]);
    await db.exec("SET LOCAL ROLE authenticated");
    await db.exec("SAVEPOINT probe");
    try {
      if (op === "read") {
        return (await db.query(`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = $1 AND name = $2`, [b, p])).rows[0].n === 1;
      }
      if (op === "delete") {
        return (await db.query(`DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2 RETURNING 1`, [b, p])).rows.length === 1;
      }
      await db.query(`INSERT INTO storage.objects (bucket_id, name, owner, owner_id) VALUES ($1, $2, auth.uid(), auth.uid()::text)`, [b, p]);
      return true;
    } catch (e) {
      if (/row-level security/i.test(e.message)) return false;
      throw e;
    }
  } finally {
    await db.exec("ROLLBACK");
  }
}

console.log("=== same answer as Storage, every case ===");
const people = [[ADMIN, "admin"], [TEACHER, "teacher"], [OTHER_T, "teacher"], [FAMILY, "family"]];
const files = [
  ["work", "classes/c1/sheet.jpg", OTHER_T],
  ["work", "classes/c2/sheet.jpg", TEACHER],
  ["work", "classes/c1/../c2/x.jpg", TEACHER],
  ["work", "incoming/abc.jpg", TEACHER],
  ["work", "incoming/def.jpg", OTHER_T],
  ["work", `${FAMILY}/mine.jpg`, ADMIN],
  ["vid", `${FAMILY}/take1.mp4`, FAMILY],
  ["vid", `${FAMILY}/approved.mp4`, FAMILY],
  ["vid", `${TEACHER}/t.mp4`, TEACHER],
  ["locked", "open/a.txt", ADMIN],
  ["locked", "secret/a.txt", ADMIN],
  ["none", "a.txt", ADMIN],
];
let cases = 0, differ = [];
for (const [uid, role] of people) {
  for (const [b, p, owner] of files) {
    if (p.includes("..")) continue; // Storage would not refuse this; R2 must (below)
    for (const op of ["read", "write", "delete"]) {
      if (op !== "write") await db.query(`INSERT INTO public.file_objects (bucket_id, path, owner, size_bytes, mime_type) VALUES ($1, $2, $3, 1, $4)`, [b, p, owner, b === "vid" ? "video/mp4" : null]);
      const ours = await can(uid, role, b, p, op);
      if (op !== "write") await db.query(`DELETE FROM public.file_objects WHERE bucket_id = $1 AND path = $2`, [b, p]);
      const theirs = await storageSays(uid, role, b, p, op, owner);
      cases++;
      if (ours !== theirs) differ.push(`${role}:${uid.slice(0, 2)} ${op} ${b}/${p} ours=${ours} storage=${theirs}`);
    }
  }
}
ok(`all ${cases} cases agree with Storage`, differ.length === 0, differ.join("; "));
// The matrix must actually contain both answers, or it proves nothing.
{
  const yes = await can(TEACHER, "teacher", "work", "classes/c1/sheet.jpg", "read");
  const no = await can(OTHER_T, "teacher", "work", "classes/c1/sheet.jpg", "read");
  ok("a class teacher may read their class's file, another teacher may not", yes === true && no === false);
}

console.log("=== uploader-owned files ===");
await db.query(`INSERT INTO public.file_objects (bucket_id, path, owner, size_bytes) VALUES ('work', 'incoming/own.jpg', $1, 1)`, [TEACHER]);
eq("the uploader reads their incoming file", await can(TEACHER, "teacher", "work", "incoming/own.jpg", "read"), true);
eq("another teacher does not", await can(OTHER_T, "teacher", "work", "incoming/own.jpg", "read"), false);
eq("an incoming file nobody registered is nobody's", await can(TEACHER, "teacher", "work", "incoming/ghost.jpg", "read"), false);

console.log("=== restrictive and other-role policies ===");
eq("restrictive policy holds", await can(ADMIN, "admin", "locked", "secret/a.txt", "read"), false);
eq("permissive one still lets the rest through", await can(ADMIN, "admin", "locked", "open/a.txt", "read"), true);
eq("a policy for anon does not open a bucket to the signed-in", await can(ADMIN, "admin", "none", "a.txt", "read"), false);
eq("a bucket with no policy for the command refuses", await can(ADMIN, "admin", "locked", "open/b.txt", "write"), false);

console.log("=== public buckets, paths, ops ===");
eq("a public bucket is readable by anyone signed in", await can(FAMILY, "family", "pub", "x.mp4", "read"), true);
eq("but not writable", await can(FAMILY, "family", "pub", "x.mp4", "write"), false);
eq("nobody signed in gets nothing", await can(null, null, "pub", "x.mp4", "read"), false);
for (const bad of ["/abs.jpg", "classes/c1/../c2/x.jpg", "classes//x.jpg", "a".repeat(1025)]) {
  eq(`path refused: ${bad.slice(0, 30)}`, await can(ADMIN, "admin", "work", bad, "read"), false);
}
ok("an unknown op is an error, not a yes",
  /op must be/.test(await tryAs(ADMIN, "admin", () => db.query(`SELECT public.file_access_can('work', 'a', 'list')`)) ?? ""));
ok("anon cannot call it",
  /permission denied/.test(await (async () => {
    await db.exec("BEGIN"); await db.exec("SET LOCAL ROLE anon");
    try { await db.query(`SELECT public.file_access_can('pub', 'x', 'read')`); return ""; }
    catch (e) { return e.message; } finally { await db.exec("ROLLBACK"); }
  })()));

console.log("=== many paths at once ===");
eq("the batch answer is the single answers, for a mixed list",
  await as(TEACHER, "teacher", async () => (await db.query(
    `SELECT p FROM public.file_access_can_many('work', $1, 'read') AS p ORDER BY p`,
    [["classes/c1/a.jpg", "classes/c2/b.jpg", "classes/c1/a.jpg", "/bad.jpg", "classes/c1/c.jpg"]])).rows.map((r) => r.p)),
  ["classes/c1/a.jpg", "classes/c1/c.jpg"]);
ok("more than 200 paths is refused",
  /at most 200/.test(await tryAs(ADMIN, "admin", () => db.query(
    `SELECT public.file_access_can_many('work', $1, 'read')`, [Array.from({ length: 201 }, (_, i) => `p${i}`)])) ?? ""));

console.log("=== file_objects rows ===");
const add = (uid, role, b, p, owner, size, mime = null) => tryAs(uid, role, () => db.query(
  `INSERT INTO public.file_objects (bucket_id, path, owner, size_bytes, mime_type) VALUES ($1, $2, $3, $4, $5)`,
  [b, p, owner, size, mime]));
eq("a teacher registers a file in their class", await add(TEACHER, "teacher", "work", "classes/c1/new.jpg", TEACHER, 10), null);
ok("a second write to the same path is refused", /duplicate key|unique/i.test(await add(ADMIN, "admin", "work", "classes/c1/new.jpg", ADMIN, 10) ?? ""));
ok("another class's teacher cannot register there", /row-level security/i.test(await add(OTHER_T, "teacher", "work", "classes/c1/other.jpg", OTHER_T, 10) ?? ""));
ok("nobody registers a file in someone else's name", /row-level security/i.test(await add(TEACHER, "teacher", "work", "classes/c1/x2.jpg", ADMIN, 10) ?? ""));
ok("the bucket's size limit holds", /allows 1000/.test(await add(ADMIN, "admin", "work", "big.jpg", ADMIN, 1001) ?? ""));
ok("the bucket's file types hold", /does not take image\/png/.test(await add(FAMILY, "family", "vid", `${FAMILY}/a.png`, FAMILY, 1, "image/png") ?? ""));
eq("an allowed type goes in", await add(FAMILY, "family", "vid", `${FAMILY}/b.mp4`, FAMILY, 1, "video/mp4"), null);
ok("a bad path is refused by the table too", /file_objects_path_shape|row-level security/.test(await add(ADMIN, "admin", "work", "a/../b.jpg", ADMIN, 1) ?? ""));
const sees = (uid, role) => as(uid, role, async () =>
  (await db.query(`SELECT path FROM public.file_objects WHERE bucket_id = 'vid' ORDER BY path`)).rows.map((r) => r.path));
eq("the family sees its own video row", await sees(FAMILY, "family"), [`${FAMILY}/b.mp4`]);
eq("a teacher with no claim on it does not", await sees(TEACHER, "teacher"), []);
eq("an admin sees every row", (await sees(ADMIN, "admin")).length, 1);
await db.query(`INSERT INTO public.file_objects (bucket_id, path, owner, size_bytes, mime_type) VALUES ('vid', $1, $2, 1, 'video/mp4')`, [`${FAMILY}/approved.mp4`, FAMILY]);
const del = (uid, role, p) => as(uid, role, async () =>
  (await db.query(`DELETE FROM public.file_objects WHERE bucket_id = 'vid' AND path = $1 RETURNING 1`, [p])).rows.length);
eq("an approved video's row cannot be deleted", await del(FAMILY, "family", `${FAMILY}/approved.mp4`), 0);
eq("the family deletes an unapproved take", await del(FAMILY, "family", `${FAMILY}/b.mp4`), 1);
ok("rows cannot be edited in place",
  (await as(ADMIN, "admin", async () => (await db.query(`UPDATE public.file_objects SET size_bytes = 5 RETURNING 1`)).rows.length)) === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
