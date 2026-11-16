// Reception display: anyone may send feedback but only as a pending row;
// only admins read it, approve it, or touch the screen's content and
// settings; the public form is rate-limited.
//
// Drives supabase/migrations/20261116090000_reception_display.sql against an
// in-process Postgres.
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
  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
    RETURNS boolean LANGUAGE sql STABLE AS $f$ SELECT _user_id IS NOT NULL AND current_setting('test.role', true) = _role::text $f$;
  GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
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

const ADMIN = "99999999-9999-9999-9999-999999999999";
const PARENT = "33333333-3333-3333-3333-333333333333";

async function as(uid, role, dbRole, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true), set_config('test.role', $2, true)`, [uid ?? "", role ?? ""]);
  await db.exec(`SET LOCAL ROLE ${dbRole}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (...a) => { try { await as(...a); return null; } catch (e) { return e.message; } };
const rows = async (uid, role, dbRole, q, p) => as(uid, role, dbRole, async () => (await db.query(q, p)).rows);
const one = async (q, p) => (await db.query(q, p)).rows[0];

console.log("=== settings ===");
const s = await one(`SELECT display_token, zalo_url, google_review_url, scene_seconds FROM public.reception_settings`);
ok("one settings row with a 48-hex display token", /^[a-f0-9]{48}$/.test(s.display_token), s.display_token);
eq("Zalo and Google links default to the centre's", [s.zalo_url, s.google_review_url],
  ["https://zalo.me/0975679889", "https://g.page/r/CRHndEQk9I1sECE/review"]);
ok("a second settings row is refused", (await tryAs(ADMIN, "admin", "authenticated", () =>
  db.query(`INSERT INTO public.reception_settings (id) VALUES (false)`))) !== null);
eq("a parent cannot read the display token", (await rows(PARENT, "family", "authenticated", `SELECT display_token FROM public.reception_settings`)).length, 0);
ok("anon cannot read the display token", (await tryAs(null, null, "anon", () => db.query(`SELECT display_token FROM public.reception_settings`))) !== null);
await as(ADMIN, "admin", "authenticated", () => db.query(`UPDATE public.reception_settings SET scene_seconds = 20`));
eq("an admin changes the timing", (await one(`SELECT scene_seconds FROM public.reception_settings`)).scene_seconds, 20);

console.log("=== feedback from the QR form ===");
ok("anon sends feedback", (await tryAs(null, null, "anon", () => db.query(
  `INSERT INTO public.reception_feedback (name, relation, rating, message, may_show) VALUES ('Lan','parent',5,'  Great teachers!  ',true)`))) === null);
eq("stored trimmed and pending", await one(`SELECT message, approved_at FROM public.reception_feedback`), { message: "Great teachers!", approved_at: null });
ok("anon cannot send it pre-approved", (await tryAs(null, null, "anon", () => db.query(
  `INSERT INTO public.reception_feedback (message, approved_at) VALUES ('fake', now())`))) !== null);
ok("anon cannot read feedback", (await tryAs(null, null, "anon", () => db.query(`SELECT * FROM public.reception_feedback`))) !== null);
eq("a parent reads none, not even their own", (await rows(PARENT, "family", "authenticated", `SELECT id FROM public.reception_feedback`)).length, 0);
await as(PARENT, "family", "authenticated", () => db.query(`UPDATE public.reception_feedback SET approved_at = now()`));
eq("and cannot approve any", (await one(`SELECT count(*)::int c FROM public.reception_feedback WHERE approved_at IS NOT NULL`)).c, 0);
ok("an empty message is refused", (await tryAs(null, null, "anon", () => db.query(
  `INSERT INTO public.reception_feedback (message) VALUES ('   ')`))) !== null);
eq("an admin reads it", (await rows(ADMIN, "admin", "authenticated", `SELECT name FROM public.reception_feedback`)).map((r) => r.name), ["Lan"]);
await as(ADMIN, "admin", "authenticated", () => db.query(`UPDATE public.reception_feedback SET approved_at = now(), approved_by = $1`, [ADMIN]));
eq("and approves it", (await one(`SELECT count(*)::int c FROM public.reception_feedback WHERE approved_at IS NOT NULL`)).c, 1);

console.log("=== the public form is rate-limited ===");
for (let i = 0; i < 29; i++) await as(null, null, "anon", () => db.query(`INSERT INTO public.reception_feedback (message) VALUES ('msg ${i}')`));
const flood = await tryAs(null, null, "anon", () => db.query(`INSERT INTO public.reception_feedback (message) VALUES ('one too many')`));
ok("the 31st message in 10 minutes is refused", flood !== null && /Too much feedback/.test(flood), flood ?? "accepted");

console.log("=== content ===");
ok("an admin adds an award", (await tryAs(ADMIN, "admin", "authenticated", () => db.query(
  `INSERT INTO public.reception_items (kind, title_en, title_vi) VALUES ('award','Reader of the Month','Học sinh đọc sách của tháng')`))) === null);
ok("a teacher cannot", (await tryAs(PARENT, "teacher", "authenticated", () => db.query(
  `INSERT INTO public.reception_items (kind, title_en) VALUES ('award','Mine')`))) !== null);
ok("an unknown kind is refused", (await tryAs(ADMIN, "admin", "authenticated", () => db.query(
  `INSERT INTO public.reception_items (kind, title_en) VALUES ('banner','x')`))) !== null);
ok("an http (not https) image is refused", (await tryAs(ADMIN, "admin", "authenticated", () => db.query(
  `INSERT INTO public.reception_items (kind, title_en, image_url) VALUES ('photo','x','http://example.com/a.jpg')`))) !== null);
ok("an end before the start is refused", (await tryAs(ADMIN, "admin", "authenticated", () => db.query(
  `INSERT INTO public.reception_items (kind, title_en, starts_on, ends_on) VALUES ('event','x','2026-12-02','2026-12-01')`))) !== null);

console.log("=== photo storage ===");
eq("the reception bucket is public-read", (await one(`SELECT public FROM storage.buckets WHERE id='reception'`)).public, true);
ok("an admin uploads a photo", (await tryAs(ADMIN, "admin", "authenticated", () => db.query(
  `INSERT INTO storage.objects (bucket_id, name) VALUES ('reception','a.jpg')`))) === null);
ok("a parent cannot", (await tryAs(PARENT, "family", "authenticated", () => db.query(
  `INSERT INTO storage.objects (bucket_id, name) VALUES ('reception','b.jpg')`))) !== null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
