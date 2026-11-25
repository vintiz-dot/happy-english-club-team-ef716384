// Importing a lesson recorded outside the app:
// supabase/migrations/20261125090000_recorder_import_recording.sql (owner, 25 Nov 2026).
//
// Runs the REAL migrations in an in-process Postgres. What it holds: only an admin person imports;
// the class's recording switch, consent wording and every child's consent are checked as when
// recording in the app; a lesson from before the consent confirmation needs the admin's statement;
// the file must overlap the lesson and end in the past; the same file resumes rather than doubles;
// chunks are bounded by the file; the recorder's own storage policy and confirm function serve the
// upload; finishing needs every chunk confirmed and in storage; an imported recording is never
// evidence; the triggers still refuse everything else (a late arm, a flag for another recording,
// a later change to an imported row); the install is idempotent and refuses a foreign database.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261124120000_lesson_monitor_voiceprints", "recorder_delete_after_transcribed", "recorder_byte_floor_16khz",
  "recorder_import_recording"].map(find);
if (CHAIN.some((f) => !f)) {
  console.log("usage: recorder-import.test.mjs <its 9 migrations>");
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

async function build(upTo) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  for (const f of CHAIN.slice(0, 2)) await d.exec(readFileSync(f, "utf8"));
  await d.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
  for (const f of CHAIN.slice(2, upTo)) await d.exec(readFileSync(f, "utf8"));
  return d;
}
const MINE = readFileSync(CHAIN[8], "utf8");
const db = await build(8);
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];

console.log("=== install ===");
{
  const bare = new PGlite();
  await bare.exec(PRELUDE);
  let msg = null;
  try { await bare.exec(MINE); } catch (e) { msg = e.message; await bare.exec("ROLLBACK"); }
  refused("refuses to install without the class recorder", msg, /class recorder \(20261112100000\) is not installed/);
}
{
  const d = await build(8);
  const def = (await d.query(`SELECT pg_get_functiondef('public.recorder__recording_before_insert()'::regprocedure) d`)).rows[0].d;
  await d.exec(def.replace("IF v_uid IS NULL THEN", "IF v_uid IS NULL OR false THEN"));
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  refused("refuses when the insert trigger is not the one it was written against", msg, /insert trigger is not the one/);
  eq("and changed nothing", (await d.query(`SELECT count(*)::int n FROM pg_proc WHERE proname = 'recorder_import_begin'`)).rows[0].n, 0);
}
await db.exec(MINE);
{
  let again = null;
  try { await db.exec(MINE); } catch (e) { again = e.message; }
  ok("applies, and applies a second time", again === null, again ?? "");
  const n = (fn, s) => one(`SELECT (length(d) - length(replace(d, $2, ''))) / length($2) AS n
    FROM (SELECT pg_get_functiondef($1::regprocedure) d) x`, [fn, s]);
  eq("each trigger carries its bypass exactly once after two installs",
    [(await n("public.recorder__recording_before_insert()", "'import:'")).n, (await n("public.recorder__recording_before_update()", "'import:'")).n], [1, 1]);
  eq("the 24-hour deletion patch is still in the update trigger", (await one(
    `SELECT pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure) LIKE '%recorder_transcribed_audio_deletable%' AS y`)).y, true);
  eq("the triggers keep SECURITY DEFINER and their settings", (await q(
    `SELECT proname, prosecdef, proconfig::text AS cfg FROM pg_proc WHERE proname IN ('recorder__recording_before_insert','recorder__recording_before_update') ORDER BY 1`)),
    [{ proname: "recorder__recording_before_insert", prosecdef: true, cfg: "{search_path=public}" },
     { proname: "recorder__recording_before_update", prosecdef: true, cfg: "{search_path=public,row_security=off}" }]);
  eq("the three functions are closed to anon", (await q(
    `SELECT has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth
       FROM pg_proc p WHERE proname LIKE 'recorder_import_%' ORDER BY proname`)), [{ anon: false, auth: true }, { anon: false, auth: true }, { anon: false, auth: true }]);
}

// ---------------------------------------------------------------- people, class, consent
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher')`, [ADMIN, VICTOR]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const MARS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Mars', $1) RETURNING id`, [tVictor])).id;
const kids = [];
for (const n of ["A", "B"]) {
  const s = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [n])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date) VALUES ($1, $2, '2026-01-01')`, [s, MARS]);
  kids.push(s);
}
async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const callAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows[0];
for (const s of kids) await as(ADMIN, () => db.query(`SELECT public.recorder_record_child_consent($1, 'granted', 'ZALO')`, [s]));
await as(ADMIN, () => db.query(`SELECT public.recorder_set_class_recording($1, true, 'v1-2026-11', 'ZALO')`, [MARS]));

const lesson = async (daysAgo, status = "Held", start = "19:30", end = "21:00") => (await one(
  `INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time, status)
   VALUES ($1, $2, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - $3::int, $4, $5, $6) RETURNING id`,
  [MARS, tVictor, daysAgo, start, end, status])).id;
const at = async (sid, hhmm) => (await one(
  `SELECT ((s.date + $2::time) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS t FROM public.sessions s WHERE s.id = $1`, [sid, hhmm])).t;
const BEGIN = `SELECT public.recorder_import_begin($1, $2, $3, $4, $5) AS r`;
const NOTE = "laptop Sound Recorder, the app recorder crashed";

console.log("=== who may import, and which lesson ===");
const S = await lesson(2);
const t0 = await at(S, "19:56");
const DUR = 58 * 60000;
refused("a teacher of the class cannot import", await tryAs(VICTOR, () => db.query(BEGIN, [S, t0, DUR, NOTE, "x"])), /Only an admin/);
refused("the service role cannot import", await tryAs(null, () => db.query(BEGIN, [S, t0, DUR, NOTE, "x"]), "service_role"), /Only an admin|permission denied/);
refused("a source must be stated", await tryAs(ADMIN, () => db.query(BEGIN, [S, t0, DUR, "  ", "x"])), /Say where the file came from/);
refused("a lesson before the consent confirmation needs the admin's statement",
  await tryAs(ADMIN, () => db.query(BEGIN, [S, t0, DUR, NOTE, null])), /before the class's recording consent was confirmed/);
const t1500 = await at(S, "15:00");
refused("a file that does not overlap the lesson is refused",
  await tryAs(ADMIN, () => db.query(BEGIN, [S, t1500, DUR, NOTE, "x"])), /does not overlap the lesson/);
refused("a file that ends in the future is refused",
  await tryAs(ADMIN, () => db.query(BEGIN, [S, new Date(Date.now() - 60000), 3600000, NOTE, "x"])), /cannot end in the future/);
refused("a 30-second file is refused", await tryAs(ADMIN, () => db.query(BEGIN, [S, t0, 30000, NOTE, "x"])), /1 minute to 4 hours/);
{
  const c = await lesson(3, "Canceled"), tc = await at(c, "19:56");
  refused("a cancelled lesson is refused", await tryAs(ADMIN, () => db.query(BEGIN, [c, tc, DUR, NOTE, "x"])), /cancelled/);
  const o = await lesson(40), to = await at(o, "19:40");
  refused("a lesson past its 30 days of keeping is refused", await tryAs(ADMIN, () => db.query(BEGIN, [o, to, DUR, NOTE, "x"])), /past its 30 days/);
}

console.log("=== begin ===");
const CONSENT = "parents agreed on Zalo before 16 Nov";
const b = (await callAs(ADMIN, BEGIN, [S, t0, DUR, NOTE, CONSENT])).r;
const RID = b.recording_id;
eq("it begins", [b.resumed, b.class_id, b.chunk_ms], [false, MARS, 60000]);
const row = await one(`SELECT status, purpose, format, started_by, imported_at IS NOT NULL AS imported, import_note, import_consent_note,
  started_at = $2::timestamptz AS start_ok, ended_at = $2::timestamptz + interval '58 minutes' AS end_ok, stop_reason,
  capture_opens_at <= scheduled_start AND capture_closes_at >= ended_at AS window_ok,
  delete_after = scheduled_end + interval '30 days' AS keep_ok, min_bytes_per_sec FROM public.class_recordings WHERE id = $1`, [RID, t0]);
eq("an uploading lesson recording of the admin's, flagged as imported, with the file's own times", row,
  { status: "uploading", purpose: "lesson", format: "flac", started_by: ADMIN, imported: true, import_note: NOTE,
    import_consent_note: CONSENT, start_ok: true, end_ok: true, stop_reason: "admin", window_ok: true, keep_ok: true, min_bytes_per_sec: 1500 });
eq("a room track, 16 kHz mono FLAC", await one(`SELECT track, sample_rate, channel_count, codec FROM public.class_recording_tracks WHERE recording_id = $1`, [RID]),
  { track: "room", sample_rate: 16000, channel_count: 1, codec: "flac" });
eq("the audit log says it was imported, with the statement", (await q(
  `SELECT action, actor, detail->>'consent_note' AS c FROM public.recorder_audit_log WHERE recording_id = $1 ORDER BY id`, [RID])),
  [{ action: "armed", actor: ADMIN, c: null }, { action: "imported", actor: ADMIN, c: CONSENT }]);
{
  const again = (await callAs(ADMIN, BEGIN, [S, t0, DUR, NOTE, CONSENT])).r;
  eq("the same file again resumes the same import", [again.recording_id, again.resumed], [RID, true]);
}
eq("the flag is cleared after the write", (await one(`SELECT COALESCE(current_setting('recorder.server_write', true), '') AS f`)).f, "");

console.log("=== chunks, storage, confirm ===");
const CH = `SELECT public.recorder_import_chunk($1, $2, $3, $4, $5, $6) AS r`;
const audio = (i) => Buffer.from(`fLaC chunk ${i} `.repeat(8000));
const sha = (b) => createHash("sha256").update(b).digest("hex");
refused("a teacher cannot add audio to it", await tryAs(VICTOR, () => db.query(CH, [RID, 0, 9000, sha(audio(0)), 0, 60000])), /Not an import of yours/);
refused("a chunk longer than 60 s is refused", await tryAs(ADMIN, () => db.query(CH, [RID, 0, 9000, sha(audio(0)), 0, 90000])), /at most 60000 ms/);
refused("a chunk past the end of the file is refused",
  await tryAs(ADMIN, () => db.query(CH, [RID, 0, 9000, sha(audio(0)), DUR, DUR + 60000])), /ends after the file does/);
const N = 3;
const paths = [];
for (let i = 0; i < N; i++) {
  const a = audio(i);
  const r = (await callAs(ADMIN, CH, [RID, i, a.length, sha(a), i * 60000, (i + 1) * 60000])).r;
  paths.push(r.storage_path);
  if (i === 0) eq("the path is the recorder's own", r.storage_path, `${MARS}/${RID}/room/000000.flac`);
}
eq("registering again with the same audio is fine", (await callAs(ADMIN, CH, [RID, 0, audio(0).length, sha(audio(0)), 0, 60000])).r.already_registered, true);
refused("registering again with other audio is refused",
  await tryAs(ADMIN, () => db.query(CH, [RID, 0, 9999, sha(audio(0)), 0, 60000])), /already registered with different audio/);
const put = (uid, name, size) => tryAs(uid, () => db.query(
  `INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('class-recorder-audio', $1, $2, jsonb_build_object('size', $3::text))`, [name, uid, size]));
eq("the recorder's storage policy lets the admin upload a registered chunk", await put(ADMIN, paths[0], audio(0).length), null);
ok("but not a file nobody registered", (await put(ADMIN, `${MARS}/${RID}/room/000099.flac`, 10)) !== null);
ok("and not the teacher", (await put(VICTOR, paths[1], audio(1).length)) !== null);
eq("the recorder's own confirm accepts it", (await callAs(ADMIN, `SELECT public.recorder_confirm_chunk(
  (SELECT id FROM public.class_recording_chunks WHERE storage_path = $1), $2) AS r`, [paths[0], sha(audio(0))])).r, true);
const FIN = `SELECT public.recorder_import_finish($1) AS r`;
refused("finishing with chunks unconfirmed is refused", await tryAs(ADMIN, () => db.query(FIN, [RID])), /2 chunk\(s\) are not confirmed/);
for (let i = 1; i < N; i++) {
  await put(ADMIN, paths[i], audio(i).length);
  await callAs(ADMIN, `SELECT public.recorder_confirm_chunk((SELECT id FROM public.class_recording_chunks WHERE storage_path = $1), $2)`, [paths[i], sha(audio(i))]);
}
refused("a teacher cannot finish it", await tryAs(VICTOR, () => db.query(FIN, [RID])), /Not an import of yours/);

console.log("=== finish ===");
const f = (await callAs(ADMIN, FIN, [RID])).r;
eq("it finishes", [f.chunks, f.audio_ms], [3, 180000]);
eq("complete, with the track's counts", await one(`SELECT r.status, r.completed_at IS NOT NULL AS done, t.chunk_count, t.total_ms
  FROM public.class_recordings r JOIN public.class_recording_tracks t ON t.recording_id = r.id WHERE r.id = $1`, [RID]),
  { status: "complete", done: true, chunk_count: 3, total_ms: 180000 });
eq("finishing again says so", (await callAs(ADMIN, FIN, [RID])).r, { recording_id: RID, already_complete: true });
refused("no more audio once complete", await tryAs(ADMIN, () => db.query(CH, [RID, 3, 9000, sha(audio(3)), 180000, 240000])), /is complete and takes no more audio/);
refused("the same file cannot be imported twice", await tryAs(ADMIN, () => db.query(BEGIN, [S, t0, DUR, NOTE, CONSENT])), /already imported/);
eq("it is never evidence that the lesson ran (all its audio is late)", await one(
  `SELECT recording_ran_evidence, late_audio_ms::int AS late, below_floor_ms::int AS silent FROM public.recorder_session_evidence WHERE recording_id = $1`, [RID]),
  { recording_ran_evidence: false, late: 180000, silent: 0 });
eq("the lesson monitor sees a complete lesson recording", await one(
  `SELECT status = 'complete' AND purpose = 'lesson' AND started_at IS NOT NULL AND audio_deleted_at IS NULL AS ready FROM public.class_recordings WHERE id = $1`, [RID]),
  { ready: true });

console.log("=== everything else is still refused ===");
refused("a normal arm after the lesson is still too late",
  await tryAs(ADMIN, () => db.query(`INSERT INTO public.class_recordings (session_id, format, started_by, class_id) VALUES ($1, 'flac', $2, $3)`, [S, ADMIN, MARS])),
  /Too late/);
refused("a flag naming another recording does not open the insert",
  await tryAs(ADMIN, async () => {
    await db.query(`SELECT set_config('recorder.server_write', 'import:' || gen_random_uuid()::text, true)`);
    return db.query(`INSERT INTO public.class_recordings (session_id, format, started_by, class_id) VALUES ($1, 'flac', $2, $3)`, [S, ADMIN, MARS]);
  }), /Too late/);
refused("an imported recording's window cannot be changed afterwards",
  await tryAs(ADMIN, () => db.query(`UPDATE public.class_recordings SET scheduled_start = scheduled_start - interval '1 hour' WHERE id = $1`, [RID])),
  /cannot be changed/);
refused("nor sent back to uploading",
  await tryAs(ADMIN, () => db.query(`UPDATE public.class_recordings SET status = 'uploading' WHERE id = $1`, [RID])), /cannot go from complete/);
{
  const kid = (await one(`INSERT INTO public.students (full_name) VALUES ('C') RETURNING id`)).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date) VALUES ($1, $2, '2026-01-01')`, [kid, MARS]);
  const S2 = await lesson(1);
  refused("a class with a child without consent on record is refused",
    await tryAs(ADMIN, async () => db.query(BEGIN, [S2, await at(S2, "19:40"), DUR, NOTE, CONSENT])), /switched off|no recording consent/);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
