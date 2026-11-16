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

// ============ REVIEW PROBES ============
// P1: a class switched ON, reports exist, kill switch pressed: can the teacher still read the report?
await consent(ADMIN, k1); await consent(ADMIN, k2);
await setClass(ADMIN, VENUS, true); await raw(`UPDATE public.lesson_monitor_classes SET starts_on = public.lesson_monitor__today() - 10, ends_on = public.lesson_monitor__today() + 17 WHERE class_id = $1`, [VENUS]);
eq("save r1", await save(ADMIN, rV1), null);
eq("kill switch by teacher", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_set_class($1,false,NULL,'stop')`, [VENUS])), null);
eq("P1 report still readable after kill switch", await reportsSeenBy(VICTOR), [rV1]);
eq("P1b save_report refused after kill", /monitor is off/.test(await save(ADMIN, rV2) ?? ""), true);

// P2: expiry: old report is hidden by policy but still PRESENT until someone calls expire
await raw(`UPDATE public.lesson_monitor_reports SET session_date = public.lesson_monitor__today() - 45 WHERE recording_id = $1`, [rV1]);
eq("P2 hidden from teacher", await reportsSeenBy(VICTOR), []);
eq("P2 but physically present", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_reports`)).n, 1);
await raw(`UPDATE public.lesson_monitor_reports SET session_date = public.lesson_monitor__today() - 1 WHERE recording_id = $1`, [rV1]);

// P3: child leaves the class (enrollment ended), THEN parent withdraws: reports of the class stay?
await setClass(ADMIN, VENUS, true); await raw(`UPDATE public.lesson_monitor_classes SET starts_on = public.lesson_monitor__today() - 10, ends_on = public.lesson_monitor__today() + 17 WHERE class_id = $1`, [VENUS]);
await raw(`UPDATE public.enrollments SET end_date = public.lesson_monitor__today() - 3 WHERE student_id = $1`, [k2]);
await q(`UPDATE public.lesson_monitor_child_consents SET status='granted' WHERE student_id=$1`, [k2]);
await consent(ADMIN, k2, "withdrawn", "parent phoned");
eq("P3 report of lessons that child attended survives withdrawal after he left", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_reports`)).n, 1);
eq("P3 class stays ON", (await one(`SELECT enabled FROM public.lesson_monitor_classes WHERE class_id=$1`, [VENUS])).enabled, true);

// P4: a child with a stale enrolment (class overlap) or a visitor: not covered by consent (documented?)
// P5: teacher who is ALSO an admin?  admin who is not the teacher reads nothing
eq("P5 admin reads none", await reportsSeenBy(ADMIN), []);
// P6: the owner/admin who is also user_roles teacher AND teaches... skip
// P7: lesson_monitor_can_read_report callable directly with any args
eq("P7 helper only true for own uid", (await valAs(OTHER, `SELECT public.lesson_monitor_can_read_report($1,$2,$3,$4::date) x`, [VICTOR, VENUS, sV1, today])).x, false);
// P8: audit is readable by actor
eq("P8 teacher sees only his own audit rows", (await rowsAs(VICTOR, `SELECT DISTINCT actor FROM public.lesson_monitor_audit`)).every((r) => r.actor === VICTOR), true);
// P9: service_role / authenticated direct insert of a report body
refused("P9 direct insert refused", await tryAs(VICTOR, () => db.query(`INSERT INTO public.lesson_monitor_reports (recording_id,class_id,session_date,teacher_user_id,made_by,job_version,body) VALUES ($1,$2,current_date,$3,$3,'x','{}')`, [rV2, VENUS, VICTOR])), /permission denied/);
// P10: delete_everything leaves audit with student ids
await tryAs(ADMIN, () => db.query(`SELECT public.lesson_monitor_delete_everything('DELETE ALL PILOT DATA', true)`));
eq("P10 audit rows with a student_id remain after delete everything", (await one(`SELECT count(*)::int n FROM public.lesson_monitor_audit WHERE student_id IS NOT NULL`)).n > 0, true);
// P11: body with a name hidden in a line is accepted (spoken names are in the transcript by design)
await consent(ADMIN, k1); await consent(ADMIN, k2);
await setClass(ADMIN, VENUS, true); await raw(`UPDATE public.lesson_monitor_classes SET starts_on = public.lesson_monitor__today() - 10, ends_on = public.lesson_monitor__today() + 17 WHERE class_id = $1`, [VENUS]);
await raw(`UPDATE public.enrollments SET end_date = NULL WHERE student_id = $1`, [k2]);
eq("P11 a line naming a child is accepted", await save(ADMIN, rV2, BODY({ lines: [{ t: 1, e: 2, text: "Child One, sit down please" }] })), null);
console.log(`\n${pass} passed, ${fail} failed`);
