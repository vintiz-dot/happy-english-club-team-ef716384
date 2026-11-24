// The lesson monitor's voice step (20261124120000): voiceprint consent per child,
// a report's voice groups with the computer's suggestion, the teacher's answer,
// and the laptop learning from answers. The voiceprints themselves never reach
// the database; these are the rules around them.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261124120000_lesson_monitor_voiceprints"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: lesson-monitor-voiceprints.test.mjs <its 6 migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
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

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
for (const f of CHAIN.slice(0, 2)) await db.exec(readFileSync(f, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
for (const f of CHAIN.slice(2)) await db.exec(readFileSync(f, "utf8"));
ok("applies on top of the lesson monitor pilot", true);
{
  let again = null;
  try { await db.exec(readFileSync(CHAIN[5], "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time", again === null, again ?? "");
}

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), PARENT = U(5);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, PARENT]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'family')`, [ADMIN, VICTOR, OTHER, PARENT]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const tOther = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [OTHER])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tVictor])).id;
const PLUTO = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Pluto', $1) RETURNING id`, [tOther])).id;
const kid = async (name, cls, start = "2026-01-01", end = null) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,$3,$4)`, [id, cls, start, end]);
  return id;
};
const bee = await kid("Bee", VENUS), max = await kid("Max", VENUS), noVp = await kid("No Voiceprint", VENUS);
const pluto = await kid("Pluto Kid", PLUTO);
const LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2, CURRENT_DATE, '16:15','17:45') RETURNING id`, [VENUS, tVictor])).id;

async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn) => { try { await as(uid, fn); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows;
const rpc = (uid, s, p) => tryAs(uid, () => db.query(s, p));

// ---- consent
refused("a teacher cannot record voiceprint consent",
  await rpc(VICTOR, `SELECT public.lesson_monitor_record_voiceprint_consent($1,'granted','form')`, [bee]), /Only an admin/);
refused("a consent needs a note",
  await rpc(ADMIN, `SELECT public.lesson_monitor_record_voiceprint_consent($1,'granted','  ')`, [bee]), /Say how the parents answered/);
for (const k of [bee, max, pluto]) {
  eq("the admin records a child's voiceprint consent",
    await rpc(ADMIN, `SELECT public.lesson_monitor_record_voiceprint_consent($1,'granted','signed voiceprint line, 24 Nov')`, [k]), null);
}
eq("the laptop's list: the children with voiceprint consent",
  (await rowsAs(ADMIN, `SELECT student_id FROM public.lesson_monitor_voiceprint_allowed() ORDER BY 1`)).map((r) => r.student_id).sort(),
  [bee, max, pluto].sort());
refused("a teacher cannot read the laptop's list",
  await rpc(VICTOR, `SELECT * FROM public.lesson_monitor_voiceprint_allowed()`), /Admins only/);
eq("a teacher reads no consent rows", (await rowsAs(VICTOR, `SELECT * FROM public.lesson_monitor_voiceprint_consents`)).length, 0);

// ---- a report (set up directly: the pilot's own tests cover saving one)
await db.exec(`SET session_replication_role = replica`);
const REC = (await one(`INSERT INTO public.class_recordings (class_id, session_id, armed_session_id, session_date,
  scheduled_start, scheduled_end, capture_opens_at, capture_closes_at, status, format, max_duration_ms,
  min_bytes_per_sec, clock_tolerance_ms, late_after_ms, evidence_min_fraction, started_by, delete_after, started_at, pre_start_ms)
  VALUES ($1,$2,$2,CURRENT_DATE, now(), now() + interval '90 min', now() - interval '5 min', now() + interval '100 min',
  'complete', 'opus-webm', 6000000, 100, 5000, 600000, 0.5, $3, now() + interval '30 days', now() - interval '60 s', 5000) RETURNING id`,
  [VENUS, LESSON, VICTOR])).id;
const REPORT = (await one(`INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_id, session_date,
  teacher_user_id, made_by, job_version, body) VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,'test','{}') RETURNING id`,
  [REC, VENUS, LESSON, VICTOR, ADMIN])).id;
await db.exec(`SET session_replication_role = origin`);

const groups = JSON.stringify([
  { key: "G1", seconds: 14.2, lines: 5, suggested: bee, score: 0.74 },
  { key: "G2", seconds: 9, lines: 3, suggested: noVp, score: 0.8 },    // no voiceprint consent: dropped
  { key: "G3", seconds: 7.5, lines: 2, suggested: pluto, score: 0.9 }, // another class: dropped
  { key: "G4", seconds: 3, lines: 1, suggested: null, score: null },
]);
refused("a teacher cannot save voice groups",
  await rpc(VICTOR, `SELECT public.lesson_monitor_save_voice_groups($1,$2::jsonb)`, [REC, groups]), /Admins only/);
eq("the laptop saves the report's groups",
  await rpc(ADMIN, `SELECT public.lesson_monitor_save_voice_groups($1,$2::jsonb)`, [REC, groups]), null);
eq("a suggestion stands only for an enrolled child with voiceprint consent",
  (await q(`SELECT group_key, suggested_student FROM public.lesson_monitor_voice_groups ORDER BY group_key`))
    .map((r) => [r.group_key, r.suggested_student]),
  [["G1", bee], ["G2", null], ["G3", null], ["G4", null]]);
refused("a report's groups are saved once",
  await rpc(ADMIN, `SELECT public.lesson_monitor_save_voice_groups($1,$2::jsonb)`, [REC, groups]), /already saved/);

eq("the lesson's teacher reads the groups", (await rowsAs(VICTOR, `SELECT group_key FROM public.lesson_monitor_voice_groups`)).length, 4);
eq("another teacher reads none", (await rowsAs(OTHER, `SELECT group_key FROM public.lesson_monitor_voice_groups`)).length, 0);
eq("a parent reads none", (await rowsAs(PARENT, `SELECT group_key FROM public.lesson_monitor_voice_groups`)).length, 0);

// ---- the teacher names
const name = (uid, g, a, s = null) => rpc(uid, `SELECT public.lesson_monitor_name_voice_group($1,$2,$3,$4)`, [REPORT, g, a, s]);
refused("another teacher cannot name a voice", await name(OTHER, "G1", "child", bee), /Only the lesson's teacher/);
refused("an admin who is not the lesson's teacher cannot either", await name(ADMIN, "G1", "child", bee), /Only the lesson's teacher/);
refused("a child of another class cannot be named", await name(VICTOR, "G2", "child", pluto), /enrolled in this class/);
refused("a child goes only with the answer 'child'", await name(VICTOR, "G4", "several", bee), /only with the answer/);
eq("the teacher confirms the suggestion", await name(VICTOR, "G1", "child", bee), null);
eq("names a child the computer did not know (no voiceprint consent: allowed, it is a name, not a voiceprint)",
  await name(VICTOR, "G2", "child", noVp), null);
eq("marks a group as several voices", await name(VICTOR, "G4", "several"), null);

let ans = await rowsAs(ADMIN, `SELECT group_key, answer, student_id, may_learn FROM public.lesson_monitor_voice_answers() ORDER BY group_key`);
eq("the laptop reads the answers; it may learn only from a child with voiceprint consent",
  ans.map((r) => [r.group_key, r.answer, r.may_learn]), [["G1", "child", true], ["G2", "child", false], ["G4", "several", false]]);
refused("a teacher cannot read the answers feed", await rpc(VICTOR, `SELECT * FROM public.lesson_monitor_voice_answers()`), /Admins only/);
eq("the laptop marks them learned",
  (await rowsAs(ADMIN, `SELECT public.lesson_monitor_voice_learned($1, ARRAY['G1','G2','G4']) AS n`, [REC]))[0].n, 3);
eq("and they leave the feed", (await rowsAs(ADMIN, `SELECT * FROM public.lesson_monitor_voice_answers()`)).length, 0);
eq("the same answer again stays learned", await name(VICTOR, "G1", "child", bee), null);
eq("...so it does not come back", (await rowsAs(ADMIN, `SELECT * FROM public.lesson_monitor_voice_answers()`)).length, 0);
eq("a corrected answer is learned again", await name(VICTOR, "G1", "child", max), null);
eq("...and comes back to the feed",
  (await rowsAs(ADMIN, `SELECT group_key, student_id FROM public.lesson_monitor_voice_answers()`)).map((r) => [r.group_key, r.student_id]),
  [["G1", max]]);

// ---- withdrawal
await q(`UPDATE public.lesson_monitor_voice_groups SET suggested_student = $1, suggested_score = 0.7 WHERE group_key = 'G3'`, [max]);
eq("a parent withdraws Max's voiceprint consent",
  await rpc(ADMIN, `SELECT public.lesson_monitor_record_voiceprint_consent($1,'withdrawn','phoned 24 Nov')`, [max]), null);
eq("no suggestion stands on Max's voice any more",
  (await q(`SELECT count(*)::int AS n FROM public.lesson_monitor_voice_groups WHERE suggested_student = $1`, [max]))[0].n, 0);
eq("nothing about Max is left to learn", (await rowsAs(ADMIN, `SELECT * FROM public.lesson_monitor_voice_answers()`)).length, 0);
ok("he leaves the laptop's list, so his voiceprint is deleted on its next start",
  !(await rowsAs(ADMIN, `SELECT student_id FROM public.lesson_monitor_voiceprint_allowed()`)).some((r) => r.student_id === max));
eq("the audit records it with ids only",
  (await q(`SELECT action FROM public.lesson_monitor_audit WHERE action LIKE 'voiceprint_consent%' ORDER BY id DESC LIMIT 1`))[0].action,
  "voiceprint_consent_withdrawn");

// ---- deletion follows the report
await q(`DELETE FROM public.lesson_monitor_reports WHERE id = $1`, [REPORT]);
eq("deleting the report deletes its voice groups", (await q(`SELECT count(*)::int AS n FROM public.lesson_monitor_voice_groups`))[0].n, 0);
const r2 = await rpc(ADMIN, `SELECT public.lesson_monitor_delete_everything('DELETE ALL PILOT DATA', true)`);
eq("delete everything runs", r2, null);
eq("and takes the voiceprint consents with it", (await q(`SELECT count(*)::int AS n FROM public.lesson_monitor_voiceprint_consents`))[0].n, 0);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
