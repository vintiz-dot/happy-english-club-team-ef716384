// Teacher Transcripts' lesson audio (`class-recordings`): who may read,
// write, overwrite and delete it.
//
// Drives the REAL files, in paste order, against an in-process Postgres:
//   20260717090000  the bucket and its old FOR ALL policy (the defect),
//   20261111110000  the real is_teacher_of_class (it says yes to TAs),
//   20261112120000  the fix, pasted twice,
//   20261112100000  the class recorder, pasted after the fix, twice - its
//                   preflight inspects every storage policy.
//
// The storage stand-in is recorder.test.mjs's: storage.objects with RLS on,
// table privileges for anon / authenticated as Supabase grants them, so only
// the policies decide. A storage upload is an INSERT, an overwrite (upsert,
// update, move) an UPDATE, a remove a DELETE, a download / sign / list a
// SELECT.
//
// The app's path, unchanged since it was written (9ef15f9):
//   `${classId}/${crypto.randomUUID()}.${ext}`  (src/pages/TeacherTranscripts.tsx:317)
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const MIGS = process.argv.slice(2);
const PIPE_MIG = MIGS.find((f) => f.includes("20260717090000"));
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const FIX_MIG = MIGS.find((f) => f.includes("class_recordings_scope"));
const REC_MIG = MIGS.find((f) => f.includes("class_recorder"));
if (!PIPE_MIG || !TA_MIG || !FIX_MIG || !REC_MIG) {
  console.log("usage: class-recordings-scope.test.mjs <20260717090000_...> <20261111110000_...> <20261112120000_class_recordings_scope.sql> <20261112100000_class_recorder.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
const BUCKET = "class-recordings";
const REC_BUCKET = "class-recorder-audio";
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// recorder.test.mjs's prelude (so the recorder migration installs on it),
// with class_transcripts as 20260712090000 has it: class_id, uploaded_by and
// its two policies, which the app's follow-up insert has to pass.
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
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_type text NOT NULL DEFAULT 'teaching_assistant',
    teaching_assistant_id uuid REFERENCES public.teaching_assistants(id) ON DELETE CASCADE,
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id), class_id uuid NOT NULL REFERENCES public.classes(id),
    start_date date NOT NULL DEFAULT '2026-01-01', end_date date);

  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, metadata jsonb, UNIQUE (bucket_id, name));
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;

  -- 20260712090000:99-131 (the columns this suite needs) and its policies.
  CREATE TABLE public.class_transcripts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    uploaded_by uuid, status text NOT NULL DEFAULT 'processing', raw_text text,
    source_format text, CONSTRAINT class_transcripts_source_format_check CHECK (source_format IN ('vtt','srt','txt','paste')));
  ALTER TABLE public.class_transcripts ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON public.teachers, public.teaching_assistants, public.classes, public.sessions,
    public.homeworks, public.session_participants, public.students, public.enrollments TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_transcripts TO authenticated;
`;
// Policies that call is_teacher_of_class can only be created once it exists.
const TRANSCRIPT_POLICIES = `
  CREATE POLICY "admins_all_transcripts" ON public.class_transcripts FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_transcripts" ON public.class_transcripts FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(PIPE_MIG, "utf8"));
await db.exec(readFileSync(TA_MIG, "utf8"));
// 20260719014455 grants this to signed-in users in production.
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
await db.exec(TRANSCRIPT_POLICIES);

// ---------------------------------------------------------------- people
const U = (n) => `${String(n).repeat(8)}-0000-0000-0000-000000000000`;
const ADMIN = U(1), TEA = U(2), TEB = U(3), TA_ON = U(4), TA_OFF = U(5), PARENT = U(6), STUDENT = U(7), NOROLE = U(8);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, TEA, TEB, TA_ON, TA_OFF, PARENT, STUDENT, NOROLE]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'teacher'),($5,'teacher'),($6,'family'),($7,'student')`,
  [ADMIN, TEA, TEB, TA_ON, TA_OFF, PARENT, STUDENT]);
const tA = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEA])).id;
const tB = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TEB])).id;
// A teachers row, default teacher of class A, but no 'teacher' role (e.g. an
// archived member of staff whose role was taken away).
const tN = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [NOROLE])).id;
const taOn = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_ON])).id;
const taOff = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_OFF])).id;
const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class A', $1) RETURNING id`, [tA])).id;
const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class B', $1) RETURNING id`, [tB])).id;
const CN = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class N', $1) RETURNING id`, [tN])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2),($3,$4)`, [CA, taOn, CB, taOff]);

const appPath = (cls, ext = "mp3") => `${cls}/${randomUUID()}.${ext}`;
const put = async (name, bucket = BUCKET) =>
  (await one(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,$3) RETURNING id`, [bucket, name, TEA])).id;

// Every attempt runs in a transaction that is ROLLED BACK, so the seed stays.
const SUBJECTS = { ADMIN, TEA, TEB, TA_ON, TA_OFF, PARENT, STUDENT, NOROLE };
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
// What `who` can do to object `id` (and inserting `newName`): four booleans.
// No RETURNING on the writes: RETURNING makes Postgres apply the SELECT
// policies to the new row as well, which would hide a weak UPDATE / INSERT
// check behind the SELECT one.
const can = async (who, id, newName, role = "authenticated") => {
  const uid = who;
  const sel = await attempt(uid, `SELECT id FROM storage.objects WHERE id = $1`, [id], role);
  const upd = await attempt(uid, `UPDATE storage.objects SET metadata = '{"size":1}' WHERE id = $1`, [id], role);
  const del = await attempt(uid, `DELETE FROM storage.objects WHERE id = $1`, [id], role);
  const ins = await attempt(uid, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,auth.uid())`, [BUCKET, newName], role);
  return { select: sel.rows.length === 1, update: upd.err === null && upd.n === 1, delete: del.err === null && del.n === 1, insert: ins.err === null && ins.n === 1 };
};
const ALL = { select: true, update: true, delete: true, insert: true };
const NONE = { select: false, update: false, delete: false, insert: false };

// ---------------------------------------------------------------- BEFORE
console.log("=== before the fix: the defect reproduces ===");
const objA = await put(appPath(CA));
const objB = await put(appPath(CB));
// A row that already breaks the path/class link (planted before the fix).
const badRow = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text, audio_storage_path)
  VALUES ($1,$2,'audio','x',$3) RETURNING id`, [CA, TEA, `${CB}/old.mp3`])).id;
eq("teacher B (class B only) can read, overwrite, delete class A's audio and upload under class A's folder", await can(TEB, objA, appPath(CA)), ALL);
eq("a TA not on class A can do the same", await can(TA_OFF, objA, appPath(CA)), ALL);
eq("control: a parent could do nothing even before", await can(PARENT, objA, appPath(CA)), NONE);
{
  const r = await attempt(TEA, `INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text, audio_storage_path)
    VALUES ($1,$2,'audio','x',$3) RETURNING id`, [CA, TEA, `${CB}/whatever.mp3`]);
  ok("F1 before: teacher A can point a class-A transcript row at a class-B file (the service-role function would transcribe it)", r.err === null && r.rows.length === 1, r.err ?? "");
}

// ---------------------------------------------------------------- APPLY
const policies = async () => (await q(
  `SELECT policyname, permissive, roles::text, cmd, qual, with_check FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname LIKE '%class_recordings%' OR concat_ws(' ', qual, with_check) LIKE '%''' || $1 || '''%')
    ORDER BY policyname`, [BUCKET]));
const fixText = readFileSync(FIX_MIG, "utf8");
let applyErr = null;
try { await db.exec(fixText); } catch (e) { applyErr = e.message; }
ok("the fix applies", applyErr === null, applyErr ?? "");
const P1 = await policies();
let again = null;
try { await db.exec(fixText); } catch (e) { again = e.message; }
ok("and applies a second time", again === null, again ?? "");
eq("the second paste leaves the same policies, byte for byte", await policies(), P1);
eq("exactly the five new policies reach the bucket; the old one is gone",
  P1.map((p) => `${p.policyname}:${p.cmd}:${p.permissive}:${p.roles}`),
  ["class_recordings_admin_all:ALL:PERMISSIVE:{authenticated}", "class_recordings_staff_delete:DELETE:PERMISSIVE:{authenticated}",
   "class_recordings_staff_insert:INSERT:PERMISSIVE:{authenticated}", "class_recordings_staff_select:SELECT:PERMISSIVE:{authenticated}",
   "class_recordings_staff_update:UPDATE:PERMISSIVE:{authenticated}"]);
ok("every one of them is scoped by bucket_id = 'class-recordings'",
  P1.every((p) => [p.qual, p.with_check].filter(Boolean).every((t) => t.includes("bucket_id = 'class-recordings'"))));
eq("the bucket row itself is untouched (private, 50 MB, mp3/m4a/mp4)", (await one(
  `SELECT public, file_size_limit::int l, 'audio/mpeg' = ANY (allowed_mime_types) AND 'video/mp4' = ANY (allowed_mime_types) t
     FROM storage.buckets WHERE id = $1`, [BUCKET])), { public: false, l: 52428800, t: true });
eq("the helper is STABLE, SECURITY DEFINER, search_path pinned, not executable by anon/PUBLIC", (await one(`
  SELECT p.provolatile v, p.prosecdef d, p.proconfig::text c,
         has_function_privilege('anon', p.oid, 'EXECUTE') a,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') u
    FROM pg_proc p WHERE p.proname = 'class_recordings_staff_can'`)), { v: "s", d: true, c: "{search_path=public}", a: false, u: true });

// ---------------------------------------------------------------- AFTER
console.log("=== after: class A's audio, the app's path ===");
eq("teacher A (class A) can select, overwrite, delete and upload class A's audio", await can(TEA, objA, appPath(CA)), ALL);
eq("a TA on class A (standing assignment) - what the page allows them today", await can(TA_ON, objA, appPath(CA, "m4a")), ALL);
eq("admin: everything", await can(ADMIN, objA, appPath(CA)), ALL);
for (const [label, who] of [["teacher B (class B)", TEB], ["a TA not on class A", TA_OFF], ["a parent", PARENT], ["a student", STUDENT],
                            ["a teachers row on class N but no teacher role, on class N's folder", NOROLE]]) {
  const target = who === NOROLE ? await put(appPath(CN)) : objA;
  eq(`${label}: nothing - select, update, delete, insert`, await can(who, target, appPath(who === NOROLE ? CN : CA)), NONE);
}
eq("anon: nothing", await can(null, objA, appPath(CA), "anon"), NONE);
eq("signed-in role with no uid: nothing", await can(null, objA, appPath(CA)), NONE);
eq("teacher B still has everything on class B's own audio", await can(TEB, objB, appPath(CB)), ALL);
eq("teacher A has nothing on class B's audio", await can(TEA, objB, appPath(CB)), NONE);

console.log("=== planting and moving ===");
{
  const r = await attempt(TEB, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2)`, [BUCKET, appPath(CA)]);
  ok("teacher B cannot upload under class A's folder (no RETURNING)", r.err !== null && /row-level security/.test(r.err), r.err ?? "allowed");
  const mv = await attempt(TEA, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [objA, appPath(CB)]);
  ok("teacher A cannot move class A's file into class B's folder", mv.err !== null, mv.err ?? `allowed (${mv.n} row)`);
  const mv2 = await attempt(TEB, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [objB, appPath(CA)]);
  ok("teacher B cannot move a class B file into class A's folder", mv2.err !== null, mv2.err ?? `allowed (${mv2.n} row)`);
  const mvOdd = await attempt(TEA, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [objA, `${CA}/sub/hidden.mp3`]);
  ok("teacher A cannot move class A's file to a shape only admins can see", mvOdd.err !== null, mvOdd.err ?? `allowed (${mvOdd.n} row)`);
  // An UPDATE that names no column (no WHERE, a constant SET) is the one
  // shape where Postgres does NOT also hold the new row to the SELECT
  // policy - so only the UPDATE policy's own WITH CHECK stands between it
  // and a move into another class's folder. Teacher D sees exactly one file.
  const TED = U(9);
  await q(`INSERT INTO auth.users (id) VALUES ($1)`, [TED]);
  await q(`INSERT INTO public.user_roles VALUES ($1,'teacher')`, [TED]);
  const tD = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [TED])).id;
  const CD = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class D', $1) RETURNING id`, [tD])).id;
  await put(appPath(CD));
  eq("teacher D sees exactly one file", (await attempt(TED, `SELECT count(*)::int n FROM storage.objects`)).rows[0].n, 1);
  const blind = await attempt(TED, `UPDATE storage.objects SET name = '${CA}/planted.mp3'`);
  ok("teacher D cannot move it into class A's folder even with a column-free UPDATE (WITH CHECK holds on its own)",
    blind.err !== null, blind.err ?? `allowed (${blind.n} row)`);
  const mv3 = await attempt(TEA, `UPDATE storage.objects SET name = $2 WHERE id = $1`, [objA, appPath(CA)]);
  ok("teacher A can rename within class A's folder", mv3.err === null && mv3.n === 1, mv3.err ?? "");
  const up = await attempt(TEB, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2)
                                  ON CONFLICT (bucket_id, name) DO UPDATE SET metadata = '{"x":1}'`,
                           [BUCKET, (await one(`SELECT name FROM storage.objects WHERE id = $1`, [objA])).name]);
  ok("teacher B cannot upsert over class A's file", up.err !== null, up.err ?? "allowed");
  const other = await attempt(TEA, `INSERT INTO storage.objects (bucket_id, name) VALUES ('homework', $1)`, [appPath(CA)]);
  ok("these policies do not reach another bucket: teacher A cannot write class A's path into 'homework'", other.err !== null, other.err ?? "allowed");
}

console.log("=== objects whose class cannot be determined: admin only ===");
// [label, a stored name, a new name of the same shape to try inserting]
const NOCLASS = randomUUID();
const ODD = [
  ["a folder that is not a uuid", "lesson-12/rec.mp3", "lesson-12/new.mp3"],
  ["no folder at all", "rec.mp3", "new.mp3"],
  ["three segments under class A", `${CA}/sub/rec.mp3`, `${CA}/sub/new.mp3`],
  ["a uuid that is no class", `${NOCLASS}/rec.mp3`, `${NOCLASS}/new.mp3`],
  ["an empty file name under class A", `${CA}/`, `${CA}//`],
  ["a uuid with trailing junk", `${CA}x/rec.mp3`, `${CA}x/new.mp3`],
  ["a leading slash", `/${CA}/rec.mp3`, `/${CA}/new.mp3`],
  ["a NULL name", null, null],
];
for (const [label, name, fresh] of ODD) {
  const id = (await one(`INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2) RETURNING id`, [BUCKET, name])).id;
  eq(`${label}: teacher A has nothing`, await can(TEA, id, fresh), NONE);
  eq(`${label}: a TA on class A has nothing`, await can(TA_ON, id, fresh), NONE);
  eq(`${label}: admin has everything`, await can(ADMIN, id, fresh === null ? null : fresh + ".2"), ALL);
}
{
  const id = await put(`${CA.toUpperCase()}/${randomUUID()}.mp3`);
  eq("the class id in upper case still resolves to class A (teacher A: all; teacher B: none)",
    [await can(TEA, id, `${CA.toUpperCase()}/x.mp3`), await can(TEB, id, `${CA.toUpperCase()}/y.mp3`)], [ALL, NONE]);
  const noExt = await put(`${CA}/${randomUUID()}.recording`);
  eq("a file name the page builds from an odd extension still resolves", await can(TEA, noExt, `${CA}/${randomUUID()}.Voice Memo`), ALL);
}
{
  const r = await attempt(TEA, `SELECT public.class_recordings_staff_can(NULL) n, public.class_recordings_staff_can('') e`);
  eq("helper: NULL and empty names are no", r.rows[0], { n: false, e: false });
}

console.log("=== the app's whole flow, as the page does it ===");
{
  await db.exec("BEGIN");
  let err = null, rowId = null;
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [TEA]);
    await db.exec(`SET LOCAL ROLE authenticated`);
    const path = appPath(CA, "m4a");
    await db.query(`INSERT INTO storage.objects (bucket_id, name, owner) VALUES ($1,$2,auth.uid())`, [BUCKET, path]);
    rowId = (await db.query(`INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text, audio_storage_path, audio_mime_type, status)
      VALUES ($1, auth.uid(), 'audio', '[Audio uploaded - transcribing...]', $2, 'audio/mp4', 'processing') RETURNING id`, [CA, path])).rows[0].id;
  } catch (e) { err = e.message; }
  await db.exec("ROLLBACK");
  ok("teacher A: upload to `${classId}/${uuid}.${ext}` then the transcript row - both succeed", err === null && rowId, err ?? "");
}
{
  // TA on the class: same flow.
  const r1 = await attempt(TA_ON, `WITH o AS (INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2) RETURNING name)
    INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text, audio_storage_path)
    SELECT $3, auth.uid(), 'audio', 'x', name FROM o RETURNING id`, [BUCKET, appPath(CA), CA]);
  ok("a TA on class A: the same flow succeeds", r1.err === null && r1.rows.length === 1, r1.err ?? "");
  const r2 = await attempt(TA_OFF, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2) RETURNING id`, [BUCKET, appPath(CA)]);
  ok("a TA not on class A: refused at the upload (no orphan file any more)", r2.err !== null, r2.err ?? "allowed");
}
console.log("=== F1: a transcript row cannot name another class's file ===");
{
  const r = await attempt(TEA, `INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text, audio_storage_path)
    VALUES ($1,$2,'audio','x',$3) RETURNING id`, [CA, TEA, `${CB}/whatever.mp3`]);
  ok("teacher A cannot point a class-A row at a class-B path", r.err !== null && /class_transcripts_audio_path_in_class/.test(r.err), r.err ?? "allowed");
  const r2 = await attempt(ADMIN, `INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text, audio_storage_path)
    VALUES ($1,$2,'audio','x',$3) RETURNING id`, [CA, ADMIN, `${CB}/whatever.mp3`]);
  ok("nor can an admin", r2.err !== null, r2.err ?? "allowed");
  let svc = null;
  try { await q(`INSERT INTO public.class_transcripts (class_id, source_format, raw_text, audio_storage_path) VALUES ($1,'audio','x',$2)`, [CA, `notauuid/x.mp3`]); }
  catch (e) { svc = e.message; }
  ok("nor anything that bypasses RLS (a CHECK, not a policy)", svc !== null, svc ?? "allowed");
  const p = await attempt(TEA, `INSERT INTO public.class_transcripts (class_id, uploaded_by, source_format, raw_text)
    VALUES ($1,$2,'paste','pasted text, no audio') RETURNING id`, [CA, TEA]);
  ok("a pasted transcript (no audio path) is unaffected", p.err === null && p.rows.length === 1, p.err ?? "");
  const mv = await attempt(TEA, `UPDATE public.class_transcripts SET audio_storage_path = $2 WHERE id = $1 RETURNING id`, [badRow, `${CA}/fixed.mp3`]);
  ok("an existing row can be corrected to its own class's path", mv.err === null && mv.rows.length === 1, mv.err ?? "");
  eq("the row planted before the fix is still there (NOT VALID: the paste does not fail on old rows)",
    (await one(`SELECT count(*)::int n FROM public.class_transcripts WHERE id = $1`, [badRow])).n, 1);
  let upd = null;
  try { await q(`UPDATE public.class_transcripts SET status = 'failed' WHERE id = $1`, [badRow]); } catch (e) { upd = e.message; }
  ok("but nothing can process it any further: any update to it is refused until its path is fixed", upd !== null, upd ?? "allowed");
  eq("probe P4 counts it", (await one(`SELECT count(*)::int n FROM public.class_transcripts
     WHERE audio_storage_path IS NOT NULL AND lower(split_part(audio_storage_path, '/', 1)) <> class_id::text`)).n, 1);
  eq("the constraint is NOT VALID, as written", (await one(`SELECT convalidated v FROM pg_constraint WHERE conname = 'class_transcripts_audio_path_in_class'`)).v, false);
}

console.log("=== the service role (transcribe-lesson-audio) is unaffected ===");
{
  const r = await attempt(null, `SELECT count(*)::int n FROM storage.objects WHERE bucket_id = $1`, [BUCKET], "service_role");
  const all = (await one(`SELECT count(*)::int n FROM storage.objects WHERE bucket_id = $1`, [BUCKET])).n;
  ok("service role reads every object in the bucket (it downloads by the row's path)", r.rows[0].n === all && all > 0, `${r.rows[0].n}/${all}`);
}

// ---------------------------------------------------------------- recorder after
console.log("=== the class recorder migration installs after the fix ===");
const recObj = await put(`${CA}/${randomUUID()}/mic/000000.flac`, REC_BUCKET);
const recObj2 = await put(`${CA}/x.webm`, REC_BUCKET);
eq("before the recorder: teacher A sees nothing in the recorder's bucket through these policies",
  [(await can(TEA, recObj, "")).select, (await can(TEA, recObj2, "")).select, (await can(TEB, recObj2, "")).select], [false, false, false]);
let recErr = null;
try { await db.exec(readFileSync(REC_MIG, "utf8")); } catch (e) { recErr = e.message; }
ok("20261112100000 installs on top (its preflight accepts these policies)", recErr === null, recErr ?? "");
let recErr2 = null;
try { await db.exec(readFileSync(REC_MIG, "utf8")); } catch (e) { recErr2 = e.message; }
ok("and pastes a second time", recErr2 === null, recErr2 ?? "");
eq("our policies are byte-identical after the recorder", await policies(), P1);
eq("no policy of ours names the recorder's bucket", P1.filter((p) => concatPol(p).includes(REC_BUCKET)).length, 0);
function concatPol(p) { return `${p.qual ?? ""} ${p.with_check ?? ""}`; }
eq("after the recorder: an unregistered file in its bucket is still unreadable by teacher A / teacher B / TA on A",
  [(await can(TEA, recObj2, "")).select, (await can(TEB, recObj2, "")).select, (await can(TA_ON, recObj, "")).select], [false, false, false]);
{
  const r = await attempt(TEA, `INSERT INTO storage.objects (bucket_id, name) VALUES ($1,$2) RETURNING id`, [REC_BUCKET, appPath(CA)]);
  ok("teacher A cannot drop a Teacher Transcripts-shaped file into the recorder's bucket", r.err !== null, r.err ?? "allowed");
}
eq("class A's transcript audio: still teacher A all, teacher B none, after the recorder",
  [await can(TEA, objA, appPath(CA)), await can(TEB, objA, appPath(CA))], [ALL, NONE]);
{
  // The fix pasted once more after the recorder: still clean, recorder untouched.
  const recPolicies = async () => q(`SELECT policyname, qual, with_check FROM pg_policies WHERE schemaname='storage' AND policyname LIKE 'class_recorder_audio%' ORDER BY 1`);
  const before = await recPolicies();
  let e3 = null; try { await db.exec(fixText); } catch (e) { e3 = e.message; }
  ok("the fix pastes again after the recorder", e3 === null, e3 ?? "");
  eq("and the recorder's two policies are untouched by it", await recPolicies(), before);
  eq("recorder has its two policies", before.map((p) => p.policyname), ["class_recorder_audio_insert", "class_recorder_audio_select"]);
}

console.log("=== the rollback in docs/evidence/T2-class-recordings-access.md ===");
{
  const ev = readFileSync(new URL("../../docs/evidence/T2-class-recordings-access.md", import.meta.url), "utf8");
  const m = /<!-- rollback -->\s*```sql\s*([\s\S]*?)```/.exec(ev);
  ok("the evidence file carries a rollback block", !!m);
  if (m) {
    let e = null; try { await db.exec(m[1]); } catch (x) { e = x.message; }
    ok("it runs", e === null, e ?? "");
    eq("it restores exactly the old policy", (await policies()).map((p) => `${p.policyname}:${p.cmd}`), ["staff_manage_class_recordings:ALL"]);
    eq("and with it the old behaviour (teacher B reads class A's audio again)", (await can(TEB, objA, appPath(CA))).select, true);
    eq("the helper and the constraint are gone", (await one(`SELECT
      (SELECT count(*)::int FROM pg_proc WHERE proname = 'class_recordings_staff_can') f,
      (SELECT count(*)::int FROM pg_constraint WHERE conname = 'class_transcripts_audio_path_in_class') c`)), { f: 0, c: 0 });
    let e2 = null; try { await db.exec(fixText); } catch (x) { e2 = x.message; }
    ok("and the fix pastes again over the rolled-back state", e2 === null && (await policies()).length === 5, e2 ?? "");
  }
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
