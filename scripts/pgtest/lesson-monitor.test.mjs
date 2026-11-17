// Lesson monitor pilot (Option A): who may read a lesson report, who may make
// one, and what the database refuses whatever the job or the page sends.
//
// Drives supabase/migrations/20261117090000_lesson_monitor_pilot.sql on top of
// the class recorder (20261112100000, with 20260717090000 and 20261111110000
// before it, as recorder.test.mjs does), in an in-process Postgres.
//
// The assertions that matter most:
//   - a report is read by the teacher of that lesson and NOBODY else: not an
//     admin, another teacher, a teaching assistant, a parent or a student;
//     the teacher reads it only while they may still listen to that lesson
//     and only for 30 days;
//   - Victor sees Venus only: another pilot class's report, for its own
//     teacher, is invisible to him and his to them;
//   - the server, not the caller, decides whose report it is, and a lesson a
//     cover teacher taught is refused (the pilot is one teacher);
//   - nothing is processed without every enrolled child's monitor consent;
//     a withdrawal switches the class off and deletes its reports;
//   - the kill switch is open to the class's teacher; switching on is admin only;
//   - no table has a write grant, no family/student policy exists, and the
//     audit log cannot be changed;
//   - one command deletes everything the pilot put in the database.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const PIPE_MIG = MIGS.find((f) => f.includes("20260717090000"));
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const REC_MIG = MIGS.find((f) => f.includes("class_recorder"));
const LM_MIG = MIGS.find((f) => f.includes("lesson_monitor_pilot"));
if (!PIPE_MIG || !TA_MIG || !REC_MIG || !LM_MIG) {
  console.log("usage: lesson-monitor.test.mjs <20260717090000_...> <20261111110000_...> <20261112100000_class_recorder.sql> <20261117090000_lesson_monitor_pilot.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const sorted = (o) => Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)));
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

// The same stand-in for production as recorder.test.mjs.
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
  CREATE TABLE public.attendance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('Present','Absent','Excused','Late')), UNIQUE (session_id, student_id));
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
    public.homeworks, public.session_participants, public.students, public.enrollments TO authenticated;
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(PIPE_MIG, "utf8"));
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
await db.exec(readFileSync(REC_MIG, "utf8"));
await db.exec(readFileSync(LM_MIG, "utf8"));
ok("applies on top of the class recorder", true);
{
  let again = null;
  try { await db.exec(readFileSync(LM_MIG, "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}
{
  const bare = new PGlite();
  await bare.exec(PRELUDE);
  let msg = null;
  try { await bare.exec(readFileSync(LM_MIG, "utf8")); } catch (e) { msg = e.message; }
  refused("refuses to install without the class recorder", msg, /class recorder \(20261112100000\) is not installed/);
}

// ---------------------------------------------------------------- people
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), TA = U(4), PARENT = U(5), STUDENT = U(6), COVER = U(7), MARSIE = U(8);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, TA, PARENT, STUDENT, COVER, MARSIE]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'teacher'),($5,'family'),($6,'student'),($7,'teacher'),($8,'teacher')`,
  [ADMIN, VICTOR, OTHER, TA, PARENT, STUDENT, COVER, MARSIE]);
const tid = async (u) => (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [u])).id;
const tVictor = await tid(VICTOR), tOther = await tid(OTHER), tCover = await tid(COVER), tMarsie = await tid(MARSIE);
const ta = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tVictor])).id;
const MARS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Mars', $1) RETURNING id`, [tMarsie])).id;
const PLUTO = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Pluto', $1) RETURNING id`, [tOther])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [VENUS, ta]);
const kid = async (name, cls) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [id, cls]);
  return id;
};
const k1 = await kid("Child One", VENUS), k2 = await kid("Child Two", VENUS), k3 = await kid("Child Three", MARS);

async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p, role) => (await as(uid, () => db.query(s, p), role)).rows;
const valAs = async (uid, s, p) => (await rowsAs(uid, s, p))[0];
const raw = async (s, p) => {
  await db.exec(`SET session_replication_role = replica`);
  try { return await q(s, p); } finally { await db.exec(`SET session_replication_role = DEFAULT`); }
};
const today = (await one(`SELECT public.lesson_monitor__today()::text d`)).d;

// Lessons (Hanoi dates) and complete recordings of them, set up as the
// superuser with triggers off: the recorder's own suite tests how they get there.
const sess = async (cls, teacher, dayOffset) => (await one(
  `INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
   VALUES ($1, $2, public.lesson_monitor__today() + $3::int, '17:30', '19:00') RETURNING id`, [cls, teacher, dayOffset])).id;
const recording = async (cls, session, status = "complete", extra = {}) => (await raw(
  `INSERT INTO public.class_recordings (class_id, session_id, armed_session_id, session_date, scheduled_start, scheduled_end,
     capture_opens_at, capture_closes_at, status, format, max_duration_ms, min_bytes_per_sec, clock_tolerance_ms,
     late_after_ms, evidence_min_fraction, started_by, started_at, ended_at, completed_at, delete_after, purpose)
   SELECT $1, s.id, s.id, s.date, (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
     (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '5 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '10 minutes',
     $3, 'flac', 6300000, 4000, 15000, 600000, 0.5, $4,
     (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '4 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '5 minutes',
     now(), now() + interval '20 days', $5
   FROM public.sessions s WHERE s.id = $2 RETURNING id`,
  [cls, session, status, extra.started_by ?? VICTOR, extra.purpose ?? "lesson"]))[0].id;

const sV1 = await sess(VENUS, tVictor, -1), sV2 = await sess(VENUS, tVictor, -2), sVcover = await sess(VENUS, tCover, -3);
const sVup = await sess(VENUS, tVictor, 0), sVnext = await sess(VENUS, tVictor, 2);
const sM1 = await sess(MARS, tMarsie, -1);
const rV1 = await recording(VENUS, sV1), rV2 = await recording(VENUS, sV2), rVcover = await recording(VENUS, sVcover, "complete", { started_by: COVER });
const rVup = await recording(VENUS, sVup, "uploading"), rM1 = await recording(MARS, sM1, "complete", { started_by: MARSIE });

const WORDING = (await one(`SELECT consent_wording_version v FROM public.lesson_monitor_settings`)).v;
const setClass = (uid, cls, on, teacher = tVictor, version = WORDING, note = "paper forms, office folder M", days = 28) =>
  tryAs(uid, () => db.query(`SELECT public.lesson_monitor_set_class($1,$2,$3,$4,$5,$6)`, [cls, on, version, note, days, teacher]));
const consent = (uid, student, status = "granted", note = "signed monitor lines, 20 Nov") =>
  tryAs(uid, () => db.query(`SELECT public.lesson_monitor_record_child_consent($1,$2,$3)`, [student, status, note]));
const BODY = (extra = {}) => ({
  schema: "hec-lesson-monitor/1", lesson: { duration_s: 5400 }, notes: ["Vietnamese is not transcribed."],
  lines: [{ t: 12.5, e: 15.0, text: "Good afternoon, everyone.", u: false, f: false }], unwritten: [], targets: { source: "none", words: [] },
  patterns: {}, flags: [], coverage: {}, settings: {}, ...extra,
});
const save = (uid, rec, body = BODY()) =>
  tryAs(uid, () => db.query(`SELECT public.lesson_monitor_save_report($1,'pilot-0.1',$2::jsonb,5400,7000)`, [rec, JSON.stringify(body)]));
const pendingFor = async (uid) => (await rowsAs(uid, `SELECT recording_id, consent_ok, pilot_teacher_taught FROM public.lesson_monitor_pending(50)`)).map((r) => r.recording_id).sort();
const reportsSeenBy = async (uid, role) => (await rowsAs(uid, `SELECT recording_id FROM public.lesson_monitor_reports ORDER BY recording_id`, [], role)).map((r) => r.recording_id);

console.log("=== grants and policies: read only, no family or student path ===");
{
  const tables = ["lesson_monitor_settings", "lesson_monitor_child_consents", "lesson_monitor_classes", "lesson_monitor_reports",
    "lesson_monitor_targets", "lesson_monitor_runs", "lesson_monitor_audit"];
  const priv = async (role, t, p) => (await one(`SELECT has_table_privilege($1, $2, $3) x`, [role, `public.${t}`, p])).x;
  for (const t of tables) {
    eq(`${t}: authenticated may SELECT`, await priv("authenticated", t, "SELECT"), true);
    eq(`${t}: authenticated may not INSERT or DELETE`, [await priv("authenticated", t, "INSERT"), await priv("authenticated", t, "DELETE")], [false, false]);
    eq(`${t}: anon has nothing`, [await priv("anon", t, "SELECT"), await priv("anon", t, "INSERT")], [false, false]);
    eq(`${t}: service_role has all`, [await priv("service_role", t, "SELECT"), await priv("service_role", t, "INSERT"), await priv("service_role", t, "DELETE")], [true, true, true]);
    eq(`${t}: row level security is on`, (await one(`SELECT relrowsecurity r FROM pg_class WHERE oid = $1::regclass`, [`public.${t}`])).r, true);
  }
  eq("UPDATE is granted on the settings row only", await Promise.all(tables.map((t) => priv("authenticated", t, "UPDATE"))),
    [true, false, false, false, false, false, false]);
  eq("the reports table has exactly one policy: the teacher's read", (await q(
    `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'lesson_monitor_reports'`)), [{ policyname: "lesson_monitor_reports_teacher_read", cmd: "SELECT" }]);
  eq("no lesson-monitor policy mentions families, students or can_view_student", (await one(
    `SELECT count(*)::int n FROM pg_policies WHERE tablename LIKE 'lesson_monitor%'
       AND concat_ws(' ', qual, with_check) ~* '(family|student|can_view_student|is_family)'`)).n, 0);
  eq("no lesson-monitor policy touches storage", (await one(
    `SELECT count(*)::int n FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE 'lesson_monitor%'`)).n, 0);
  eq("internal helpers are not executable by signed-in users", await Promise.all(
    ["lesson_monitor__audit(text,uuid,uuid,uuid,uuid,jsonb)", "lesson_monitor__children_without_consent(uuid,date)",
     "lesson_monitor__switch_off(uuid,text,text)", "lesson_monitor__lesson_teacher(uuid,uuid)", "lesson_monitor__pilot_teacher_taught(uuid,uuid)"]
      .map(async (f) => (await one(`SELECT has_function_privilege('authenticated', $1, 'EXECUTE') x`, [`public.${f}`])).x)),
    [false, false, false, false, false]);
  eq("anon may run none of the API functions", (await one(
    `SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
      WHERE ns.nspname = 'public' AND p.proname LIKE 'lesson\\_monitor%' AND p.proname NOT LIKE 'lesson\\_monitor\\_\\_%'
        AND has_function_privilege('anon', p.oid, 'EXECUTE')`)).n, 0);
}

console.log("=== the switch: off, admin-only on, consent child by child, one named teacher ===");
eq("no class is on to begin with", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_classes`)).n, 0);
eq("nothing is pending while the class is off", await pendingFor(ADMIN), []);
refused("a teacher cannot switch it on", await setClass(VICTOR, VENUS, true), /Only an admin can switch the lesson monitor on/);
refused("an admin must quote the current wording", await setClass(ADMIN, VENUS, true, tVictor, "old-wording"), /current monitor consent wording/);
refused("and say where the forms are", await setClass(ADMIN, VENUS, true, tVictor, WORDING, "  "), /where the signed monitor consent lines are held/);
refused("it stays off while an enrolled child has no monitor consent", await setClass(ADMIN, VENUS, true), /2 enrolled child\(ren\) have no monitor consent/);
refused("only an admin records a child's consent", await consent(VICTOR, k1), /Only an admin/);
eq("the admin records both Venus children", [await consent(ADMIN, k1), await consent(ADMIN, k2)], [null, null]);
refused("the recorder's consent is not the monitor's: a teacher cannot read the monitor consents",
  (await rowsAs(VICTOR, `SELECT * FROM public.lesson_monitor_child_consents`)).length === 0 ? "none visible" : null, /none visible/);
refused("the pilot names its teacher", await setClass(ADMIN, VENUS, true, null), /Name the pilot's teacher/);
refused("who must teach the class", await setClass(ADMIN, VENUS, true, tOther), /Name the pilot's teacher/);
refused("a pilot is at most six weeks", await setClass(ADMIN, VENUS, true, tVictor, WORDING, "forms", 60), /1 to 42 days/);
eq("with all of that, the admin switches Venus on for Victor", await setClass(ADMIN, VENUS, true), null);
eq("four weeks from today", (await one(`SELECT (ends_on - starts_on)::int d, starts_on::text s FROM public.lesson_monitor_classes WHERE class_id = $1`, [VENUS])), { d: 27, s: today });
eq("lessons recorded before the pilot started are never processed", await pendingFor(ADMIN), []);
// From here on the pilot started ten days ago (as the superuser, no API can move it).
const backdate = (cls) => raw(`UPDATE public.lesson_monitor_classes SET starts_on = public.lesson_monitor__today() - 10,
  ends_on = public.lesson_monitor__today() + 17 WHERE class_id = $1`, [cls]);
await backdate(VENUS);
eq("the teacher reads the switch row of his class; another teacher does not",
  [(await rowsAs(VICTOR, `SELECT class_id FROM public.lesson_monitor_classes`)).length, (await rowsAs(OTHER, `SELECT class_id FROM public.lesson_monitor_classes`)).length], [1, 0]);
eq("Victor's menu shows Venus", (await rowsAs(VICTOR, `SELECT class_name FROM public.lesson_monitor_my_classes()`)).map((r) => r.class_name), ["Venus"]);
eq("another teacher's menu is empty", (await rowsAs(OTHER, `SELECT class_name FROM public.lesson_monitor_my_classes()`)).length, 0);
eq("a parent's and a student's are empty", [(await rowsAs(PARENT, `SELECT 1 FROM public.lesson_monitor_my_classes()`)).length,
  (await rowsAs(STUDENT, `SELECT 1 FROM public.lesson_monitor_my_classes()`)).length], [0, 0]);
refused("a teacher cannot change the consent wording", await tryAs(VICTOR, async () => {
  const r = await db.query(`UPDATE public.lesson_monitor_settings SET consent_wording_version = 'x' RETURNING id`);
  if (r.rows.length === 0) throw new Error("no row changed");
}), /no row changed/);

console.log("=== what the overnight job sees ===");
{
  const pend = await rowsAs(ADMIN, `SELECT recording_id, consent_ok, pilot_teacher_taught FROM public.lesson_monitor_pending(50) ORDER BY recording_id`);
  eq("the admin sees Venus's complete lessons only (not uploading, not Mars)", pend.map((r) => r.recording_id).sort(), [rV1, rV2, rVcover].sort());
  eq("consent is fine for all three", pend.every((r) => r.consent_ok), true);
  eq("the cover teacher's lesson is marked as not the pilot teacher's", pend.filter((r) => !r.pilot_teacher_taught).map((r) => r.recording_id), [rVcover]);
  eq("Victor (the class's teacher) sees the same three", await pendingFor(VICTOR), [rV1, rV2, rVcover].sort());
  eq("the cover teacher sees only the lesson he taught", await pendingFor(COVER), [rVcover]);
  eq("another teacher, the TA, a parent and a student see nothing",
    [await pendingFor(OTHER), await pendingFor(TA), await pendingFor(PARENT), await pendingFor(STUDENT)], [[], [], [], []]);
  refused("anon cannot ask", await tryAs(null, () => db.query(`SELECT * FROM public.lesson_monitor_pending(5)`), "anon"), /permission denied/);
  eq("begin: ok for Victor's lesson", (await valAs(ADMIN, `SELECT public.lesson_monitor_begin($1) j`, [rV1])).j, { ok: true });
  eq("begin: the cover's lesson is refused (other_teacher)", (await valAs(ADMIN, `SELECT public.lesson_monitor_begin($1) j`, [rVcover])).j, { ok: false, reason: "other_teacher" });
  eq("begin: an uploading recording is not complete", (await valAs(ADMIN, `SELECT public.lesson_monitor_begin($1) j`, [rVup])).j, { ok: false, reason: "not_complete" });
  eq("begin: Mars is off", (await valAs(ADMIN, `SELECT public.lesson_monitor_begin($1) j`, [rM1])).j, { ok: false, reason: "class_off" });
  refused("begin: a parent is refused outright", await tryAs(PARENT, () => db.query(`SELECT public.lesson_monitor_begin($1)`, [rV1])), /Not a recording you may listen to/);
  refused("begin: so is another teacher", await tryAs(OTHER, () => db.query(`SELECT public.lesson_monitor_begin($1)`, [rV1])), /Not a recording you may listen to/);
  eq("the download is in the audit log, with who", (await one(
    `SELECT count(*)::int n FROM public.lesson_monitor_audit WHERE action = 'audio_download' AND recording_id = $1 AND actor = $2`, [rV1, ADMIN])).n, 1);
}

console.log("=== saving a report: the server decides whose it is ===");
{
  refused("a body in another shape is refused", await save(ADMIN, rV1, { schema: "x", lines: [] }), /hec-lesson-monitor\/1 shape/);
  refused("an unknown part is refused", await save(ADMIN, rV1, BODY({ voiceprints: [] })), /unknown part: voiceprints/);
  refused("a child's id riding along anywhere is refused", await save(ADMIN, rV1,
    BODY({ lines: [{ t: 1, e: 2, text: "hello", student_id: k1 }] })), /may not name or point at a child/);
  refused("so is a child's name field", await save(ADMIN, rV1, BODY({ flags: [{ student_name: "x" }] })), /may not name or point at a child/);
  refused("a report needs its lines", await save(ADMIN, rV1, BODY({ lines: "none" })), /transcript lines/);
  refused("the cover teacher's lesson cannot be saved, by anyone", await save(ADMIN, rVcover), /pilot's own teacher did not teach this lesson/);
  refused("a parent cannot save", await save(PARENT, rV1), /Not a recording you may listen to/);
  refused("an uploading recording cannot be saved", await save(ADMIN, rVup), /not a complete lesson recording/);
  eq("the admin saves Victor's lesson", await save(ADMIN, rV1), null);
  eq("the report is Victor's, made by the admin", (await one(
    `SELECT teacher_user_id = $2 t, made_by = $3 m FROM public.lesson_monitor_reports WHERE recording_id = $1`, [rV1, VICTOR, ADMIN])), { t: true, m: true });
  refused("a second save of the same lesson is refused", await save(ADMIN, rV1), /already been handled/);
  eq("Victor himself may run the job for his class", await save(VICTOR, rV2), null);
  eq("handled lessons leave the pending list", await pendingFor(ADMIN), [rVcover]);
  eq("the job records the cover lesson as refused", await tryAs(ADMIN, () => db.query(
    `SELECT public.lesson_monitor_record_run($1,'refused','other_teacher')`, [rVcover])), null);
  eq("and it is gone from the list for good", await pendingFor(ADMIN), []);
  refused("record_run cannot claim a report was made", await tryAs(ADMIN, () => db.query(
    `SELECT public.lesson_monitor_record_run($1,'report_made','x')`, [rVcover])), /refused or failed/);
  refused("the reason is a code, never text", await tryAs(ADMIN, () => db.query(
    `SELECT public.lesson_monitor_record_run($1,'failed','Child said: hello')`, [rVcover])), /short code/);
}

console.log("=== who reads a report: the lesson's teacher, nobody else ===");
{
  eq("Victor reads both of his reports", await reportsSeenBy(VICTOR), [rV1, rV2].sort());
  eq("with the transcript", (await valAs(VICTOR, `SELECT body->'lines'->0->>'text' t FROM public.lesson_monitor_reports WHERE recording_id = $1`, [rV1])).t, "Good afternoon, everyone.");
  eq("the admin who made it reads none of it", await reportsSeenBy(ADMIN), []);
  eq("another teacher, the TA, the cover teacher, a parent and a student read nothing",
    [await reportsSeenBy(OTHER), await reportsSeenBy(TA), await reportsSeenBy(COVER), await reportsSeenBy(PARENT), await reportsSeenBy(STUDENT)], [[], [], [], [], []]);
  refused("anon cannot read the table at all", await tryAs(null, () => db.query(`SELECT * FROM public.lesson_monitor_reports`), "anon"), /permission denied/);
  refused("Victor cannot write to it directly", await tryAs(VICTOR, () => db.query(`UPDATE public.lesson_monitor_reports SET body = '{}'::jsonb`)), /permission denied/);
  refused("nor delete from it directly", await tryAs(VICTOR, () => db.query(`DELETE FROM public.lesson_monitor_reports`)), /permission denied/);
  refused("nor insert one with himself as the teacher of someone else's lesson", await tryAs(OTHER, () => db.query(
    `INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_date, teacher_user_id, made_by, job_version, body)
     VALUES ($1,$2,current_date,$3,$3,'x','{}')`, [rM1, MARS, OTHER])), /permission denied/);
  eq("the admin's status shows dates and feedback, no content", Object.keys((await rowsAs(ADMIN, `SELECT * FROM public.lesson_monitor_admin_status()`))[0]).sort(),
    ["class_id", "first_opened_at", "made_at", "reading_minutes", "report_id", "session_date", "used_something"]);
  refused("a teacher cannot read the admin status", await tryAs(VICTOR, () => db.query(`SELECT * FROM public.lesson_monitor_admin_status()`)), /Admins only/);
  refused("the TA's standing assignment to Venus does not open the reports either",
    (await rowsAs(TA, `SELECT public.is_teacher_of_class($1, $2) x`, [TA, VENUS]))[0].x === true && (await reportsSeenBy(TA)).length === 0 ? "isolated" : null, /isolated/);
}

console.log("=== Victor sees Venus only ===");
{
  // A second pilot class with its own teacher.
  eq("the Mars child's consent", await consent(ADMIN, k3), null);
  eq("Mars switched on for its own teacher", await setClass(ADMIN, MARS, true, tMarsie), null);
  await backdate(MARS);
  eq("its report saved", await save(ADMIN, rM1), null);
  eq("Mars's teacher reads only Mars", await reportsSeenBy(MARSIE), [rM1]);
  eq("Victor still reads only Venus", await reportsSeenBy(VICTOR), [rV1, rV2].sort());
  eq("Victor's menu still shows only Venus", (await rowsAs(VICTOR, `SELECT class_name FROM public.lesson_monitor_my_classes()`)).map((r) => r.class_name), ["Venus"]);
  const mars = (await one(`SELECT id FROM public.lesson_monitor_reports WHERE recording_id = $1`, [rM1])).id;
  refused("Victor cannot mark Mars's report", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_report_feedback($1, 5, 'yes')`, [mars])), /Not your report/);
  refused("nor delete it", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_delete_report($1)`, [mars])), /Only the lesson's teacher or an admin/);
  refused("nor stop Mars", await setClass(VICTOR, MARS, false), /Only an admin or a teacher of the class can stop/);
}

console.log("=== an archived teacher reads nothing; nor after 30 days ===");
{
  await q(`UPDATE public.teachers SET is_active = false WHERE id = $1`, [tVictor]);
  eq("Victor archived: no reports", await reportsSeenBy(VICTOR), []);
  await q(`UPDATE public.teachers SET is_active = true WHERE id = $1`, [tVictor]);
  eq("back: both again", (await reportsSeenBy(VICTOR)).length, 2);
  const sOld = await sess(VENUS, tVictor, -40);
  const rOld = await recording(VENUS, sOld);
  await raw(`INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_id, session_date, teacher_user_id, made_by, job_version, body)
             SELECT $1, $2, $3, date, $4, $5, 'pilot-0.1', '{"schema":"hec-lesson-monitor/1","lines":[]}' FROM public.sessions WHERE id = $3`,
    [rOld, VENUS, sOld, VICTOR, ADMIN]);
  eq("a 40-day-old report is not readable even before it is deleted", (await reportsSeenBy(VICTOR)).includes(rOld), false);
  refused("a parent cannot run the expiry", await tryAs(PARENT, () => db.query(`SELECT public.lesson_monitor_expire()`)), /Staff only/);
  eq("the expiry deletes exactly it", (await valAs(VICTOR, `SELECT public.lesson_monitor_expire() n`)).n, 1);
  eq("and it is gone", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_reports WHERE recording_id = $1`, [rOld])).n, 0);
}

console.log("=== the teacher's own actions: open, feedback, target words, delete now ===");
{
  const r1 = (await one(`SELECT id FROM public.lesson_monitor_reports WHERE recording_id = $1`, [rV1])).id;
  eq("opening stamps first_opened_at", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_report_feedback($1)`, [r1])), null);
  eq("feedback: 8 minutes, used something", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_report_feedback($1, 8, 'yes')`, [r1])), null);
  eq("the admin sees the 8 minutes (for the stop rule)", (await rowsAs(ADMIN, `SELECT reading_minutes m, used_something u, first_opened_at IS NOT NULL o FROM public.lesson_monitor_admin_status() WHERE report_id = $1`, [r1]))[0], { m: 8, u: "yes", o: true });
  refused("minutes are bounded", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_report_feedback($1, 999, NULL)`, [r1])), /0 to 240/);
  refused("the admin cannot give the teacher's feedback", await tryAs(ADMIN, () => db.query(`SELECT public.lesson_monitor_report_feedback($1, 1, 'no')`, [r1])), /Not your report/);

  eq("Victor's upcoming Venus lessons", (await rowsAs(VICTOR, `SELECT session_id FROM public.lesson_monitor_my_lessons($1::date, $1::date + 7)`, [today])).map((r) => r.session_id).sort(), [sVup, sVnext].sort());
  eq("another teacher has none", (await rowsAs(OTHER, `SELECT 1 FROM public.lesson_monitor_my_lessons($1::date - 7, $1::date + 7)`, [today])).length, 0);
  eq("Victor types target words (cleaned, sorted)", await tryAs(VICTOR, () => db.query(
    `SELECT public.lesson_monitor_set_targets($1, ARRAY['  Elephant','giraffe','elephant'], ARRAY['can / can''t'])`, [sVnext])), null);
  eq("stored", (await one(`SELECT words, structures FROM public.lesson_monitor_targets WHERE session_id = $1`, [sVnext])), { words: ["elephant", "giraffe"], structures: ["can / can't"] });
  refused("a word that is not a word is refused", await tryAs(VICTOR, () => db.query(
    `SELECT public.lesson_monitor_set_targets($1, ARRAY['<script>'], '{}')`, [sVnext])), /English letters/);
  refused("another teacher cannot set Venus's words", await tryAs(OTHER, () => db.query(
    `SELECT public.lesson_monitor_set_targets($1, ARRAY['x'], '{}')`, [sVnext])), /Not a lesson you teach/);
  refused("a parent cannot either", await tryAs(PARENT, () => db.query(
    `SELECT public.lesson_monitor_set_targets($1, ARRAY['x'], '{}')`, [sVnext])), /Not a lesson you teach/);
  eq("the job (admin) reads the words; a parent does not",
    [(await rowsAs(ADMIN, `SELECT words FROM public.lesson_monitor_targets`)).length, (await rowsAs(PARENT, `SELECT words FROM public.lesson_monitor_targets`)).length], [1, 0]);

  const r2 = (await one(`SELECT id FROM public.lesson_monitor_reports WHERE recording_id = $1`, [rV2])).id;
  eq("delete now (Victor)", (await valAs(VICTOR, `SELECT public.lesson_monitor_delete_report($1) d`, [r2])).d, true);
  eq("it is gone, and the lesson is not made again", [await reportsSeenBy(VICTOR), (await pendingFor(ADMIN)).includes(rV2)], [[rV1], false]);
}

console.log("=== the kill switch ===");
{
  eq("Victor stops the pilot himself", await setClass(VICTOR, VENUS, false, null, null, "teacher asked to stop"), null);
  eq("the class is off and says who stopped it", (await one(`SELECT enabled, stopped_by = $2 s, stop_reason FROM public.lesson_monitor_classes WHERE class_id = $1`, [VENUS, VICTOR])),
    { enabled: false, s: true, stop_reason: "teacher asked to stop" });
  const sV3 = await sess(VENUS, tVictor, -1);
  const rV3 = await recording(VENUS, sV3);
  eq("a new Venus lesson is not pending while it is off", (await pendingFor(ADMIN)).includes(rV3), false);
  eq("begin says class_off", (await valAs(ADMIN, `SELECT public.lesson_monitor_begin($1) j`, [rV3])).j, { ok: false, reason: "class_off" });
  refused("and a save is refused", await save(ADMIN, rV3), /monitor is off for this class/);
  refused("target words cannot be typed while it is off", await tryAs(VICTOR, () => db.query(
    `SELECT public.lesson_monitor_set_targets($1, ARRAY['x'], '{}')`, [sVnext])), /not on for this class/);
  eq("the existing report stays readable until deleted (stopping is not deleting)", await reportsSeenBy(VICTOR), [rV1]);
  refused("a parent cannot use the kill switch", await setClass(PARENT, VENUS, false), /Only an admin or a teacher/);
  eq("the admin switches it back on", await setClass(ADMIN, VENUS, true), null);
  await backdate(VENUS);
  eq("the new lesson is pending again", (await pendingFor(ADMIN)).includes(rV3), true);
}

console.log("=== consent: a new child, a withdrawal, a wording change ===");
{
  const k4 = await kid("Child Four", VENUS);
  const p = await rowsAs(ADMIN, `SELECT recording_id, consent_ok FROM public.lesson_monitor_pending(50)`);
  eq("a child without the monitor line joins: the lesson is flagged, not processed", p.every((r) => r.consent_ok === false), true);
  const rec = p[0].recording_id;
  eq("begin refuses it", (await valAs(ADMIN, `SELECT public.lesson_monitor_begin($1) j`, [rec])).j, { ok: false, reason: "consent_missing" });
  refused("and so does a save made with audio taken earlier", await save(ADMIN, rec), /no monitor consent/);
  await consent(ADMIN, k4);
  eq("with the new child's line recorded it is fine again", (await rowsAs(ADMIN, `SELECT consent_ok FROM public.lesson_monitor_pending(50)`)).every((r) => r.consent_ok), true);
  const res = (await valAs(ADMIN, `SELECT public.lesson_monitor_record_child_consent($1,'withdrawn','parent phoned, 21 Nov') j`, [k2])).j;
  eq("a withdrawal switches Venus off and deletes its report at once", sorted(res), sorted({ classes_switched_off: 1, reports_deleted: 1 }));
  eq("Victor has nothing left", await reportsSeenBy(VICTOR), []);
  eq("Mars is untouched", await reportsSeenBy(MARSIE), [rM1]);
  refused("Venus cannot come back on while that child is enrolled", await setClass(ADMIN, VENUS, true), /1 enrolled child\(ren\) have no monitor consent/);
  await q(`UPDATE public.lesson_monitor_settings SET consent_wording_version = 'monitor-v2-2026-12'`);
  eq("a wording change switches every pilot class off (Mars)", (await one(`SELECT enabled FROM public.lesson_monitor_classes WHERE class_id = $1`, [MARS])).enabled, false);
}

console.log("=== the audit log ===");
{
  const text = JSON.stringify(await q(`SELECT detail FROM public.lesson_monitor_audit`));
  ok("it carries ids and counts, never transcript text", !/Good afternoon/.test(text));
  let msg = null;
  try { await q(`UPDATE public.lesson_monitor_audit SET action = 'switch_on'`); } catch (e) { msg = e.message; }
  refused("it cannot be changed, even by the owner", msg, /append-only/);
  msg = null;
  try { await q(`DELETE FROM public.lesson_monitor_audit`); } catch (e) { msg = e.message; }
  refused("or emptied", msg, /append-only/);
  eq("a teacher reads only their own lines", (await rowsAs(VICTOR, `SELECT DISTINCT actor FROM public.lesson_monitor_audit`)).map((r) => r.actor), [VICTOR]);
  eq("a parent reads none", (await rowsAs(PARENT, `SELECT 1 FROM public.lesson_monitor_audit`)).length, 0);
}

console.log("=== one command deletes everything ===");
{
  refused("a teacher cannot", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_delete_everything('DELETE ALL PILOT DATA')`)), /Admins only/);
  refused("the admin must type the words", await tryAs(ADMIN, () => db.query(`SELECT public.lesson_monitor_delete_everything('yes')`)), /Type DELETE ALL PILOT DATA/);
  const before = (await one(`SELECT (SELECT count(*) FROM public.lesson_monitor_reports)::int r, (SELECT count(*) FROM public.lesson_monitor_runs)::int u,
                              (SELECT count(*) FROM public.lesson_monitor_targets)::int t, (SELECT count(*) FROM public.lesson_monitor_classes)::int c`));
  ok("there is something to delete", before.r > 0 && before.u > 0 && before.t > 0 && before.c > 0, JSON.stringify(before));
  const out = (await valAs(ADMIN, `SELECT public.lesson_monitor_delete_everything('DELETE ALL PILOT DATA') j`)).j;
  eq("it reports what it deleted and that nothing is left", sorted(out), sorted({ reports: before.r, targets: before.t, runs: before.u, classes: before.c, consents: 0, left: 0 }));
  eq("the consent records stay unless asked", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_child_consents`)).n > 0, true);
  const out2 = (await valAs(ADMIN, `SELECT public.lesson_monitor_delete_everything('DELETE ALL PILOT DATA', true) j`)).j;
  eq("asked, they go too", [out2.consents > 0, (await one(`SELECT count(*)::int n FROM public.lesson_monitor_child_consents`)).n], [true, 0]);
  eq("the deletion is logged with counts", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_audit WHERE action = 'delete_everything'`)).n, 2);
  eq("the recordings themselves are the recorder's and untouched", (await one(`SELECT count(*)::int n FROM public.class_recordings WHERE status = 'complete'`)).n >= 5, true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
