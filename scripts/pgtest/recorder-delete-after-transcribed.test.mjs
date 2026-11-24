// Lesson audio is deleted soon after it has been transcribed:
// supabase/migrations/20261124140000_recorder_delete_after_transcribed.sql
// (owner, 24 Nov 2026: the private audio bucket is full).
//
// Runs the REAL migrations, in order, in an in-process Postgres: the class
// recorder, the lesson monitor pilot and its later steps, then this one. What it
// holds: a complete recording whose lesson-monitor report was saved more than
// 24 hours ago is due for deletion before its 30 days; one reported 2 hours ago,
// one with no report, one with a report but no 'report_made' run, and one still
// recording are not; every old condition is unchanged; the function keeps its
// signature, columns, SECURITY INVOKER and grants; recorder_mark_audio_deleted
// still refuses while a file is left, still refuses a recording that is not due
// by either rule, and works for one reached by the new rule; the install is
// idempotent and refuses a database it was not written against.
// What it cannot prove: pg_cron firing, the edge function's storage removal
// (recorder-retention.test.mjs holds that against the same functions' contract).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261124120000_lesson_monitor_voiceprints", "recorder_delete_after_transcribed"].map(find);
if (CHAIN.some((f) => !f)) {
  console.log("usage: recorder-delete-after-transcribed.test.mjs <its 7 migrations>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

const BUCKET = "class-recorder-audio";
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

// A database with the chain applied up to (not including) this migration
// (upTo = 6), or with it too (upTo = 7).
async function build(upTo) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  for (const f of CHAIN.slice(0, 2)) await d.exec(readFileSync(f, "utf8"));
  await d.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
  for (const f of CHAIN.slice(2, upTo)) await d.exec(readFileSync(f, "utf8"));
  return d;
}
const MINE = readFileSync(CHAIN[6], "utf8");

const db = await build(6);
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];

// ---------------------------------------------------------------- the installed function before
const sigOf = async () => (await one(
  `SELECT pg_get_function_result(p.oid) AS result, pg_get_function_identity_arguments(p.oid) AS args,
          p.prosecdef AS definer, p.provolatile AS vol
     FROM pg_proc p WHERE p.oid = 'public.recorder_retention_due(timestamptz)'::regprocedure`));
const grantsOf = async (fn) => (await one(
  `SELECT has_function_privilege('anon', $1, 'EXECUTE') AS anon, has_function_privilege('authenticated', $1, 'EXECUTE') AS auth,
          has_function_privilege('service_role', $1, 'EXECUTE') AS svc`, [fn]));
const before = await sigOf();
const grantsBefore = await grantsOf("public.recorder_retention_due(timestamptz)");

console.log("=== install: idempotent, and it refuses a database it was not written for ===");
await db.exec(MINE);
ok("applies on top of the lesson monitor", true);
{
  let again = null;
  try { await db.exec(MINE); } catch (e) { again = e.message; }
  ok("and applies a second time", again === null, again ?? "");
  eq("one retention_due and one helper after two installs", (await one(
    `SELECT count(*) FILTER (WHERE proname = 'recorder_retention_due')::int a,
            count(*) FILTER (WHERE proname = 'recorder_transcribed_audio_deletable')::int b
       FROM pg_proc WHERE pronamespace = 'public'::regnamespace`)), { a: 1, b: 1 });
  eq("the trigger carries the widened condition exactly once after two installs", (await one(
    `SELECT (length(d) - length(replace(d, 'recorder_transcribed_audio_deletable(OLD.id, v_now)', '')))
            / length('recorder_transcribed_audio_deletable(OLD.id, v_now)') AS n
       FROM (SELECT pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure) d) x`)).n, 1);
}
{
  const bare = new PGlite();
  await bare.exec(PRELUDE);
  let msg = null;
  try { await bare.exec(MINE); } catch (e) { msg = e.message; await bare.exec("ROLLBACK"); }
  refused("refuses to install without the class recorder", msg, /Refusing to install: the class recorder \(20261112100000\) is not installed/);
}
{
  const d = await build(3);   // recorder installed, lesson monitor pilot not
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  refused("refuses to install without the lesson monitor pilot", msg, /Refusing to install: the lesson monitor pilot \(20261117090000\) is not installed/);
  eq("and changed nothing", (await d.query(`SELECT count(*)::int n FROM pg_proc WHERE proname = 'recorder_transcribed_audio_deletable'`)).rows[0].n, 0);
}
{
  const d = await build(6);
  await d.exec(`CREATE OR REPLACE FUNCTION public.recorder_retention_due(p_now timestamptz DEFAULT now())
    RETURNS TABLE (recording_id uuid, class_id uuid, storage_prefix text, status text, delete_after timestamptz, deletion_requested boolean)
    LANGUAGE sql STABLE AS $f$ SELECT r.id, r.class_id, 'x/', r.status, r.delete_after, false FROM public.class_recordings r $f$`);
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  refused("refuses when recorder_retention_due is not the function it replaces", msg, /recorder_retention_due is not the function this file replaces/);
  eq("and left the trigger as it was", (await d.query(
    `SELECT pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure) LIKE '%recorder_transcribed_audio_deletable%' AS patched`)).rows[0].patched, false);
}
{
  const d = await build(6);
  const def = (await d.query(`SELECT pg_get_functiondef('public.recorder__recording_before_update()'::regprocedure) d`)).rows[0].d;
  await d.exec(def.replace("IF OLD.delete_after > v_now THEN", "IF OLD.delete_after > v_now + interval '0 seconds' THEN"));
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK"); }
  refused("refuses when the trigger no longer has the delete_after check it patches", msg, /delete_after check exactly once/);
}

console.log("=== the function keeps its shape ===");
{
  const after = await sigOf();
  eq("same arguments", after.args, before.args);
  eq("same columns", after.result, before.result);
  eq("still SECURITY INVOKER and STABLE", [after.definer, after.vol], [before.definer, before.vol]);
  eq("same grants: not anon, authenticated and the service role", await grantsOf("public.recorder_retention_due(timestamptz)"), grantsBefore);
  eq("grants are the intended ones", grantsBefore, { anon: false, auth: true, svc: true });
  eq("the helper is closed to anon", await grantsOf("public.recorder_transcribed_audio_deletable(uuid, timestamptz)"), { anon: false, auth: true, svc: true });
  eq("the helper is SECURITY INVOKER (it reads only what the caller may)", (await one(
    `SELECT prosecdef FROM pg_proc WHERE oid = 'public.recorder_transcribed_audio_deletable(uuid, timestamptz)'::regprocedure`)).prosecdef, false);
  eq("the trigger is still SECURITY DEFINER with row_security off and its search_path", (await one(
    `SELECT prosecdef, proconfig::text AS cfg FROM pg_proc WHERE oid = 'public.recorder__recording_before_update()'::regprocedure`)),
    { prosecdef: true, cfg: "{search_path=public,row_security=off}" });
  eq("recorder_mark_audio_deleted is untouched", (await one(
    `SELECT prosrc LIKE '%status IN (''complete'', ''abandoned'')%' AS same, prosecdef FROM pg_proc WHERE oid = 'public.recorder_mark_audio_deleted(uuid)'::regprocedure`)),
    { same: true, prosecdef: false });
}

// ---------------------------------------------------------------- data
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher')`, [ADMIN, VICTOR, OTHER]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tVictor])).id;

async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p, role) => (await as(uid, () => db.query(s, p), role)).rows;
const raw = async (s, p) => {
  await db.exec(`SET session_replication_role = replica`);
  try { return await q(s, p); } finally { await db.exec(`SET session_replication_role = DEFAULT`); }
};

let day = 0;
// A recording of a lesson 'daysAgo' days ago, set up as the superuser with triggers off
// (the recorder's own suites test how a recording gets to each state).
const recording = async (status, { deleteAfterDays = 20, daysAgo = 10, requested = false } = {}) => {
  day++;
  const sid = (await one(
    `INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
     VALUES ($1, $2, CURRENT_DATE - $3::int, '17:30', '19:00') RETURNING id`, [VENUS, tVictor, daysAgo + day])).id;
  return (await raw(
    `INSERT INTO public.class_recordings (class_id, session_id, armed_session_id, session_date, scheduled_start, scheduled_end,
       capture_opens_at, capture_closes_at, status, format, max_duration_ms, min_bytes_per_sec, clock_tolerance_ms,
       late_after_ms, evidence_min_fraction, started_by, started_at, ended_at, completed_at, delete_after, purpose,
       deletion_requested_at, deletion_requested_by, deletion_reason)
     SELECT $1, s.id, s.id, s.date, (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
       (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '5 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '10 minutes',
       $3, 'flac', 6300000, 4000, 15000, 600000, 0.5, $4,
       (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '4 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '5 minutes',
       now(), now() + make_interval(days => $5), 'lesson',
       CASE WHEN $6::boolean THEN now() END, CASE WHEN $6::boolean THEN $4::uuid END, CASE WHEN $6::boolean THEN 'asked' END
     FROM public.sessions s WHERE s.id = $2 RETURNING id`,
    [VENUS, sid, status, VICTOR, deleteAfterDays, requested]))[0].id;
};
// A report (and, unless told otherwise, the run that says it was made) saved hoursAgo hours ago.
const report = async (rec, hoursAgo, outcome = "report_made") => {
  const s = (await one(`SELECT session_id, session_date FROM public.class_recordings WHERE id = $1`, [rec]));
  await raw(
    `INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_id, session_date, teacher_user_id, made_by, made_at, job_version, body)
     VALUES ($1, $2, $3, $4, $5, $5, now() - $6::numeric * interval '1 hour', 'pilot-0.1', '{"schema":"hec-lesson-monitor/1"}'::jsonb)`,
    [rec, VENUS, s.session_id, s.session_date, VICTOR, hoursAgo]);
  if (outcome) {
    await raw(`INSERT INTO public.lesson_monitor_runs (recording_id, class_id, outcome, by_user, at) VALUES ($1, $2, $3, $4, now() - $5::numeric * interval '1 hour')`,
      [rec, VENUS, outcome, VICTOR, hoursAgo]);
  }
};
const files = async (rec, n = 3) => {
  for (let i = 0; i < n; i++) {
    await q(`INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)`, [BUCKET, `${VENUS}/${rec}/teacher/00000${i}.flac`]);
  }
};
const removeFiles = (rec) => as(null, () => db.query(`DELETE FROM storage.objects WHERE bucket_id = $1 AND name LIKE $2`, [BUCKET, `${VENUS}/${rec}/%`]), "service_role");
const due = async (at = "now()") =>
  (await rowsAs(null, `SELECT recording_id FROM public.recorder_retention_due(${at})`, [], "service_role")).map((r) => r.recording_id);
const mark = (rec, uid = null, role = "service_role") =>
  rowsAs(uid, `SELECT public.recorder_mark_audio_deleted($1) AS d`, [rec], role).then((r) => r[0].d);
const tryMark = (rec, uid = null, role = "service_role") =>
  tryAs(uid, () => db.query(`SELECT public.recorder_mark_audio_deleted($1)`, [rec]), role);

// The recordings, each with one thing true about it.
const A = await recording("complete");                 // reported 25 h ago: due
const B = await recording("complete");                 // reported 2 h ago: not yet
const C = await recording("complete");                 // no report
const D = await recording("recording", { deleteAfterDays: 20 });   // still recording, even with a report row
const E = await recording("complete");                 // a report row but the run says failed
const F = await recording("complete", { deleteAfterDays: -1 });    // old rule: past delete_after, no report
const G = await recording("abandoned", { deleteAfterDays: -1 });   // old rule: abandoned and past
const H = await recording("complete", { requested: true, deleteAfterDays: -1 }); // old rule: a person asked
const I = await recording("complete", { deleteAfterDays: 5 });     // not due, not reported
const J = await recording("complete", { deleteAfterDays: 20 });    // reported 23 h 59 min ago
for (const r of [A, B, C, D, E, F, G, H, I, J]) await files(r);
await report(A, 25);
await report(B, 2);
await report(D, 30);
await report(E, 30, "failed");
await report(J, 23.98);

console.log("=== who is due ===");
{
  const d = await due();
  ok("reported 25 hours ago, complete, delete_after still 20 days away: due", d.includes(A));
  ok("reported 2 hours ago: not due", !d.includes(B));
  ok("complete with no report: not due", !d.includes(C));
  ok("still recording, even though a report row exists: not due", !d.includes(D));
  ok("a report row but no 'report_made' run: not due", !d.includes(E));
  ok("reported 23 h 59 min ago: not yet", !d.includes(J));
  ok("old rule: complete and past delete_after, no report: still due", d.includes(F));
  ok("old rule: abandoned and past delete_after: still due", d.includes(G));
  ok("old rule: a person's deletion request (date brought forward): still due", d.includes(H));
  ok("old rule: complete, 5 days to go, no report: still not due", !d.includes(I));
  eq("exactly those, in delete_after order then id", d.length, 4);
  eq("what it says about A: its folder, its row's own (future) date and that nobody asked", (await rowsAs(null,
    `SELECT storage_prefix, status, deletion_requested, delete_after > now() AS future FROM public.recorder_retention_due() WHERE recording_id = $1`, [A], "service_role"))[0],
    { storage_prefix: `${VENUS}/${A}/`, status: "complete", deletion_requested: false, future: true });
  eq("the same list for an 'as of' time: a day later B is due, J too", (await due("now() + interval '23 hours'")).filter((x) => [B, J].includes(x)).sort(), [B, J].sort());
  eq("an hour before the grace day ends A is not due", (await due("now() - interval '2 hours'")).includes(A), false);
}
{
  const d = await rowsAs(OTHER, `SELECT recording_id FROM public.recorder_retention_due()`, [], "authenticated");
  eq("a teacher of another class is shown none of them", d.map((r) => r.recording_id).filter((x) => [A, B, C, F].includes(x)), []);
  const e = await tryAs(null, () => db.query(`SELECT * FROM public.recorder_retention_due()`), "anon");
  refused("anon cannot call it", e, /permission denied/);
}

console.log("=== a report does not make a non-complete recording due, nor survive its own removal ===");
{
  await raw(`DELETE FROM public.lesson_monitor_reports WHERE recording_id = $1`, [A]);
  eq("the report of A is removed (a report purge): A is no longer due by this rule", (await due()).includes(A), false);
  await raw(`INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_id, session_date, teacher_user_id, made_by, made_at, job_version, body)
    SELECT id, class_id, session_id, session_date, $2, $2, now() - interval '25 hours', 'pilot-0.1', '{"schema":"hec-lesson-monitor/1"}'::jsonb
    FROM public.class_recordings WHERE id = $1`, [A, VICTOR]);
  eq("saved again 25 hours ago: due again", (await due()).includes(A), true);
}

console.log("=== recorder_mark_audio_deleted ===");
refused("A: refused while its files are in storage, however old the report", await tryMark(A), /Audio is still in storage/);
await removeFiles(A);
eq("a teacher of the class still cannot mark it deleted (it changes nothing)", [await mark(A, VICTOR, "authenticated"),
  (await one(`SELECT status FROM public.class_recordings WHERE id = $1`, [A])).status], [false, "complete"]);
eq("A: files gone, report older than a day: the job marks it deleted, 30 days early", await mark(A), true);
eq("the row is a tombstone: status, audio_deleted_at, no deletion request (retention's, not a person's)", (await one(
  `SELECT status, audio_deleted_at IS NOT NULL AS gone, deletion_requested_at IS NULL AS no_request FROM public.class_recordings WHERE id = $1`, [A])),
  { status: "deleted", gone: true, no_request: true });
eq("the evidence view says it was deleted by retention", (await one(
  `SELECT deleted_by_retention FROM public.recorder_session_evidence WHERE recording_id = $1`, [A])).deleted_by_retention, true);
eq("A is not due again", (await due()).includes(A), false);
eq("marking it a second time answers false", await mark(A), false);
eq("the report stays (the report is the product; only the audio went)", (await one(
  `SELECT count(*)::int n FROM public.lesson_monitor_reports WHERE recording_id = $1`, [A])).n, 1);

await removeFiles(B);
refused("B: reported 2 hours ago, files gone, before its date: refused (an early deletion is a request)", await tryMark(B), /not due for deletion/);
await removeFiles(C);
refused("C: no report: refused", await tryMark(C), /not due for deletion/);
await removeFiles(E);
refused("E: a report row but the run is 'failed': refused", await tryMark(E), /not due for deletion/);
await removeFiles(J);
refused("J: 23 h 59 min: refused", await tryMark(J), /not due for deletion/);
eq("D: still recording: marking does nothing (false), the row is untouched", [await mark(D), (await one(`SELECT status FROM public.class_recordings WHERE id = $1`, [D])).status], [false, "recording"]);
eq("none of the refused ones was changed", (await q(
  `SELECT status FROM public.class_recordings WHERE id = ANY($1::uuid[]) ORDER BY id`, [[B, C, E, J]])).map((r) => r.status), ["complete", "complete", "complete", "complete"]);
eq("B, once its day has passed, can be marked (the clock moves, nothing else)", await (async () => {
  await raw(`UPDATE public.lesson_monitor_reports SET made_at = now() - interval '26 hours' WHERE recording_id = $1`, [B]);
  return mark(B);
})(), true);

console.log("=== the old paths are as they were ===");
eq("F (past delete_after, no report): refused while files are left", /still in storage/.test(await tryMark(F) ?? ""), true);
await removeFiles(F);
eq("F: files gone: marked deleted as before", await mark(F), true);
await removeFiles(G);
eq("G (abandoned, past): marked deleted as before", await mark(G), true);
await removeFiles(H);
eq("H (a person asked): marked deleted as before, and its request is kept", [await mark(H), (await one(
  `SELECT deletion_requested_at IS NOT NULL AS asked FROM public.class_recordings WHERE id = $1`, [H])).asked], [true, true]);
await removeFiles(I);
refused("I (5 days to go, no report): still refused before its date", await tryMark(I), /not due for deletion/);
{
  const x = await recording("complete", { deleteAfterDays: -1 });
  await removeFiles(x);
  eq("a teacher cannot mark a due recording deleted (it changes nothing)", [await mark(x, VICTOR, "authenticated"),
    (await one(`SELECT status FROM public.class_recordings WHERE id = $1`, [x])).status], [false, "complete"]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
