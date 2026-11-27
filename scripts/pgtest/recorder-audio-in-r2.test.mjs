// The recorder's audio in Cloudflare R2: supabase/migrations/20261127090000_recorder_audio_in_r2.sql
// (owner, 27 Nov 2026; docs/RECORDER_R2_AND_COMPRESSION.md section 2).
//
// Runs the REAL recorder migrations in an in-process Postgres, then this one. What it holds:
//   - a chunk is confirmed when it is in Supabase Storage OR has a file_objects row (R2), at the size the
//     recorder made, and refused when it is in neither or at another size;
//   - a recording completes with its manifest and chunks in R2 only, and not when one is missing;
//   - an import finishes with its chunks in R2 only, and not when one is missing;
//   - a recording is marked deleted, and its row removed, only when NOTHING is left in either store;
//   - the install refuses a foreign database and changes nothing then, applies twice, keeps each
//     function's SECURITY DEFINER / search_path / row_security, and leaves no direct storage.objects read.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261124120000_lesson_monitor_voiceprints", "recorder_delete_after_transcribed", "recorder_byte_floor_16khz",
  "recorder_import_recording", "recorder_audio_grace_3h", "recorder_audio_in_r2"].map(find);
if (CHAIN.some((f) => !f)) {
  console.log("usage: recorder-audio-in-r2.test.mjs <its 11 migrations>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

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
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text,
    default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL,
    status public.session_status NOT NULL DEFAULT 'Scheduled');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid,
    title text, body text, due_date date, created_by uuid, created_at timestamptz DEFAULT now(),
    submission_type text NOT NULL DEFAULT 'standard', video_max_seconds int,
    CONSTRAINT homeworks_submission_type_check CHECK (submission_type IN ('standard','video')));
  CREATE TABLE public.homework_submissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE, student_id uuid NOT NULL,
    submission_text text, grade text, teacher_feedback text, status text DEFAULT 'submitted',
    submitted_at timestamptz DEFAULT now(), graded_at timestamptz, UNIQUE (homework_id, student_id));
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, avatar_url text);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('Present','Absent','Excused','Late')), UNIQUE (session_id, student_id));
  CREATE TABLE public.family_students (user_id uuid, student_id uuid);
  CREATE FUNCTION public.can_view_student(p_student uuid, p_user uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT public.has_role(p_user, 'admin') OR EXISTS (SELECT 1 FROM public.family_students f
         WHERE f.user_id = p_user AND f.student_id = p_student) $f$;
  CREATE TABLE public.point_awards (student_id uuid, homework_id uuid, points int, note text);
  CREATE FUNCTION public.award_homework_points(p_student uuid, p_homework uuid, p_points integer, p_note text)
    RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS
    $f$ DELETE FROM public.point_awards WHERE student_id = p_student AND homework_id = p_homework;
        INSERT INTO public.point_awards VALUES (p_student, p_homework, p_points, p_note) $f$;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, metadata jsonb);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
  CREATE TABLE public.class_transcripts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raw_text text,
    source_format text, CONSTRAINT class_transcripts_source_format_check CHECK (source_format IN ('vtt','srt','txt','paste')));
  GRANT SELECT ON public.teachers, public.teaching_assistants, public.classes, public.sessions,
    public.homeworks, public.homework_submissions, public.session_participants, public.students,
    public.enrollments, public.attendance TO authenticated;
`;
// file_objects as 20261118090000 makes it (the columns this migration reads), with RLS on as live.
const FILE_OBJECTS = `
  CREATE TABLE public.file_objects (bucket_id text NOT NULL, path text NOT NULL, owner uuid,
    size_bytes bigint NOT NULL CHECK (size_bytes >= 0), mime_type text, created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (bucket_id, path));
  ALTER TABLE public.file_objects ENABLE ROW LEVEL SECURITY;
`;

async function build(upTo, withFileObjects = true) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  if (withFileObjects) await d.exec(FILE_OBJECTS);
  for (const f of CHAIN.slice(0, 2)) await d.exec(readFileSync(f, "utf8"));
  await d.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
  for (const f of CHAIN.slice(2, upTo)) await d.exec(readFileSync(f, "utf8"));
  return d;
}
const MINE = readFileSync(CHAIN[10], "utf8");
const FNS = ["public.recorder__recording_before_update()", "public.recorder__recording_before_delete()",
  "public.recorder_confirm_chunk(uuid,text)", "public.recorder_import_finish(uuid)"];

console.log("=== install ===");
{
  const d = await build(10, false);
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  refused("refuses to install without file_objects", msg, /file store \(20261118090000/);
}
{
  const d = await build(10);
  const def = (await d.query(`SELECT pg_get_functiondef('public.recorder_confirm_chunk(uuid,text)'::regprocedure) d`)).rows[0].d;
  await d.exec(def.replace("AND o.name = v_row.storage_path", "AND o.name = v_row.storage_path AND true"));
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  refused("refuses when a function is not the one it was written against", msg, /recorder_confirm_chunk.*not the function/);
  eq("and changed nothing", (await d.query(`SELECT count(*)::int n FROM pg_proc WHERE proname = 'recorder__object_size'`)).rows[0].n, 0);
}
const db = await build(10);
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
const before = await q(`SELECT proname, prosecdef, proconfig::text AS cfg FROM pg_proc
  WHERE proname IN ('recorder__recording_before_update','recorder__recording_before_delete','recorder_confirm_chunk','recorder_import_finish') ORDER BY 1`);
await db.exec(MINE);
{
  let again = null;
  try { await db.exec(MINE); } catch (e) { again = e.message; }
  ok("applies, and applies a second time", again === null, again ?? "");
  const defs = await Promise.all(FNS.map((f) => one(`SELECT pg_get_functiondef($1::regprocedure) d`, [f])));
  eq("no patched function reads storage.objects directly", defs.map((x) => /FROM\s+storage\.objects/.test(x.d)), [false, false, false, false]);
  eq("each helper call appears once after two installs", [
    (defs[0].d.match(/recorder__object_present\(NEW\.manifest_path\)/g) || []).length,
    (defs[0].d.match(/recorder__object_size\(c\.storage_path\)/g) || []).length,
    (defs[0].d.match(/recorder__has_objects_under/g) || []).length,
    (defs[1].d.match(/recorder__has_objects_under/g) || []).length,
    (defs[2].d.match(/recorder__object_present/g) || []).length,
    (defs[3].d.match(/recorder__object_size/g) || []).length], [1, 1, 1, 1, 1, 1]);
  eq("the functions keep SECURITY DEFINER and their settings", await q(`SELECT proname, prosecdef, proconfig::text AS cfg FROM pg_proc
    WHERE proname IN ('recorder__recording_before_update','recorder__recording_before_delete','recorder_confirm_chunk','recorder_import_finish') ORDER BY 1`), before);
  eq("the 3-hour and import patches are still in the update trigger", [
    defs[0].d.includes("recorder_transcribed_audio_deletable"), defs[0].d.includes("'import:'")], [true, true]);
  eq("the helpers are closed to callers", await q(`SELECT proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon FROM pg_proc p WHERE proname LIKE 'recorder\\_\\_object%' OR proname = 'recorder__has_objects_under' ORDER BY 1`),
    [{ proname: "recorder__has_objects_under", auth: false, anon: false }, { proname: "recorder__object_present", auth: false, anon: false },
     { proname: "recorder__object_size", auth: false, anon: false }]);
}

// ---------------------------------------------------------------- people, class, consent
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher')`, [ADMIN, VICTOR]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const MARS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Mars', $1) RETURNING id`, [tVictor])).id;
for (const n of ["A", "B"]) {
  const s = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [n])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date) VALUES ($1, $2, '2026-01-01')`, [s, MARS]);
}
async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  if (role) await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const callAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows[0];
for (const s of (await q(`SELECT id FROM public.students`)).map((r) => r.id)) {
  await as(ADMIN, () => db.query(`SELECT public.recorder_record_child_consent($1, 'granted', 'ZALO')`, [s]));
}
await as(ADMIN, () => db.query(`SELECT public.recorder_set_class_recording($1, true, 'v1-2026-11', 'ZALO')`, [MARS]));
const lesson = async (daysAgo) => (await one(
  `INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time, status)
   VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - $3::int, '19:30', '21:00', 'Held') RETURNING id`,
  [MARS, tVictor, daysAgo])).id;
const at = async (sid, hhmm) => (await one(
  `SELECT ((s.date + $2::time) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS t FROM public.sessions s WHERE s.id = $1`, [sid, hhmm])).t;
const BEGIN = `SELECT public.recorder_import_begin($1, $2, $3, $4, $5) AS r`;
const CH = `SELECT public.recorder_import_chunk($1, $2, $3, $4, $5, $6) AS r`;
const CONFIRM = `SELECT public.recorder_confirm_chunk((SELECT id FROM public.class_recording_chunks WHERE storage_path = $1), $2) AS r`;
const audio = (i) => Buffer.from(`fLaC chunk ${i} `.repeat(8000));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const inSupabase = (name, size) => q(`INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('class-recorder-audio', $1, $2, jsonb_build_object('size', $3::text))`, [name, ADMIN, size]);
const inR2 = (path, size) => q(`INSERT INTO public.file_objects (bucket_id, path, owner, size_bytes, mime_type)
  VALUES ('class-recorder-audio', $1, $2, $3, 'audio/flac')`, [path, ADMIN, size]);

async function importChunks(sid, n) {
  const r = (await callAs(ADMIN, BEGIN, [sid, await at(sid, "19:40"), 58 * 60000, "laptop recorder", "parents agreed"])).r;
  const paths = [];
  for (let i = 0; i < n; i++) {
    const a = audio(i);
    paths.push((await callAs(ADMIN, CH, [r.recording_id, i, a.length, sha(a), i * 60000, (i + 1) * 60000])).r.storage_path);
  }
  return { rid: r.recording_id, paths };
}

console.log("=== confirming a chunk ===");
const A = await importChunks(await lesson(2), 4);
await inSupabase(A.paths[0], audio(0).length);
eq("a chunk in Supabase Storage is confirmed as before", (await callAs(ADMIN, CONFIRM, [A.paths[0], sha(audio(0))])).r, true);
refused("a chunk in neither store is refused", await tryAs(ADMIN, () => db.query(CONFIRM, [A.paths[1], sha(audio(1))])), /The file is not in storage/);
await inR2(A.paths[1], audio(1).length);
eq("a chunk only in R2 (a file_objects row) is confirmed", (await callAs(ADMIN, CONFIRM, [A.paths[1], sha(audio(1))])).r, true);
eq("its stored size is the R2 row's", (await one(`SELECT stored_size::int s FROM public.class_recording_chunks WHERE storage_path = $1`, [A.paths[1]])).s, audio(1).length);
await inR2(A.paths[2], audio(2).length - 5);
refused("a chunk in R2 at another size is refused", await tryAs(ADMIN, () => db.query(CONFIRM, [A.paths[2], sha(audio(2))])), /Storage holds \d+ bytes, the recorder made/);
await q(`UPDATE public.file_objects SET size_bytes = $2 WHERE path = $1`, [A.paths[2], audio(2).length]);
eq("and confirmed once the size is right", (await callAs(ADMIN, CONFIRM, [A.paths[2], sha(audio(2))])).r, true);
refused("the teacher still cannot confirm the admin's chunk", await tryAs(VICTOR, () => db.query(CONFIRM, [A.paths[3], sha(audio(3))])), /Not your recording/);
await inR2(A.paths[3], audio(3).length);
await callAs(ADMIN, CONFIRM, [A.paths[3], sha(audio(3))]);

console.log("=== completing a recording ===");
await q(`UPDATE public.class_recording_tracks SET chunk_count = 4, total_bytes = 1, total_ms = 240000 WHERE recording_id = $1`, [A.rid]);
const manifest = (await one(`SELECT class_id::text || '/' || id::text || '/manifest.json' AS m FROM public.class_recordings WHERE id = $1`, [A.rid])).m;
const COMPLETE = `UPDATE public.class_recordings SET status = 'complete', manifest_path = $2, manifest_sha256 = repeat('a', 64) WHERE id = $1`;
refused("not complete while the manifest is in neither store", await tryAs(ADMIN, () => db.query(COMPLETE, [A.rid, manifest])), /manifest is not in storage yet/);
await inR2(manifest, 300);
await q(`DELETE FROM public.file_objects WHERE path = $1`, [A.paths[2]]);
refused("not complete while a confirmed chunk has gone from R2", await tryAs(ADMIN, () => db.query(COMPLETE, [A.rid, manifest])), /confirmed chunk is no longer in storage/);
await inR2(A.paths[2], audio(2).length - 1);
refused("nor while it is in R2 at another size", await tryAs(ADMIN, () => db.query(COMPLETE, [A.rid, manifest])), /confirmed chunk is no longer in storage/);
await q(`UPDATE public.file_objects SET size_bytes = $2 WHERE path = $1`, [A.paths[2], audio(2).length]);
eq("complete with the manifest and three chunks only in R2 and one in Supabase",
  await tryAs(ADMIN, () => db.query(COMPLETE, [A.rid, manifest])), null);
eq("it is complete", (await one(`SELECT status FROM public.class_recordings WHERE id = $1`, [A.rid])).status, "complete");

console.log("=== finishing an import ===");
const B = await importChunks(await lesson(3), 2);
for (let i = 0; i < 2; i++) {
  await inR2(B.paths[i], audio(i).length);
  await callAs(ADMIN, CONFIRM, [B.paths[i], sha(audio(i))]);
}
await q(`DELETE FROM public.file_objects WHERE path = $1`, [B.paths[1]]);
refused("an import does not finish while a chunk has gone from R2",
  await tryAs(ADMIN, () => db.query(`SELECT public.recorder_import_finish($1)`, [B.rid])), /1 chunk file\(s\) are not in storage/);
await inR2(B.paths[1], audio(1).length);
eq("and finishes with every chunk only in R2", (await callAs(ADMIN, `SELECT public.recorder_import_finish($1) AS r`, [B.rid])).r.chunks, 2);

console.log("=== deleting ===");
await q(`SET session_replication_role = replica`);
await q(`UPDATE public.class_recordings SET delete_after = now() - interval '1 day' WHERE id = $1`, [A.rid]);
await q(`SET session_replication_role = DEFAULT`);
const MARK = `SELECT public.recorder_mark_audio_deleted($1) AS r`;
await q(`DELETE FROM storage.objects WHERE name LIKE $1`, [`${MARS}/${A.rid}/%`]);
refused("not marked deleted while R2 still holds its files (Supabase empty)",
  await tryAs(null, () => db.query(MARK, [A.rid]), null), /Audio is still in storage/);
await q(`DELETE FROM public.file_objects WHERE path LIKE $1`, [`${MARS}/${A.rid}/%`]);
await inSupabase(A.paths[0], 10);
refused("nor while Supabase holds one (R2 empty)", await tryAs(null, () => db.query(MARK, [A.rid]), null), /Audio is still in storage/);
await q(`DELETE FROM storage.objects WHERE name LIKE $1`, [`${MARS}/${A.rid}/%`]);
await inR2(`${MARS}/${B.rid}/room/000000.flac.other`, 1);
eq("marked deleted once both are empty (another recording's files do not count)",
  (await as(null, () => db.query(MARK, [A.rid]), null)).rows[0].r, true);
eq("its audio_deleted_at is set", (await one(`SELECT status, audio_deleted_at IS NOT NULL AS gone FROM public.class_recordings WHERE id = $1`, [A.rid])),
  { status: "deleted", gone: true });
await inR2(`${MARS}/${A.rid}/room/stray.flac`, 1);
refused("the row is kept while R2 holds a stray file under it",
  await tryAs(null, () => db.query(`DELETE FROM public.class_recordings WHERE id = $1`, [A.rid]), null), /Audio is still in storage: the recording row is kept/);
await q(`DELETE FROM public.file_objects WHERE path = $1`, [`${MARS}/${A.rid}/room/stray.flac`]);
const del = await tryAs(null, () => db.query(`DELETE FROM public.class_recordings WHERE id = $1`, [A.rid]), null);
ok("and may go once nothing is left (or is kept by another rule)", del === null || !/still in storage/.test(del), del ?? "");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
