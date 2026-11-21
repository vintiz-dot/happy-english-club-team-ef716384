// Who's speaking (20261121140000): a TA or teacher taps who is talking during a
// recorded lesson. Staff of that lesson mark; a parent or another teacher cannot;
// only children enrolled on the lesson's date; the offset is the server's.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261121130000_lesson_reports", "20261121140000_lesson_speaker_marks"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: lesson-speaker-marks.test.mjs <its 7 migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
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
  -- family links: a parent sees the children in family_students (stand-in for production's can_view_student).
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
ok("applies on top of the lesson reports contract", true);
{
  let again = null;
  try { await db.exec(readFileSync(CHAIN[6], "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time", again === null, again ?? "");
}

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), TAU = U(4), PARENT = U(5);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, TAU, PARENT]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'teacher'),($5,'family')`, [ADMIN, VICTOR, OTHER, TAU, PARENT]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const tOther = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [OTHER])).id;
const ta = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TAU])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tVictor])).id;
const PLUTO = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Pluto', $1) RETURNING id`, [tOther])).id;
const kid = async (name, cls, start = "2026-01-01", end = null) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,$3,$4)`, [id, cls, start, end]);
  return id;
};
const k1 = await kid("Child One", VENUS), k2 = await kid("Child Two", VENUS), k3 = await kid("Child Three", PLUTO);
const kLeft = await kid("Child Left", VENUS, "2026-01-01", "2026-01-02");
await q(`INSERT INTO public.family_students VALUES ($1,$2)`, [PARENT, k1]);
const LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2, CURRENT_DATE, '16:15','17:45') RETURNING id`, [VENUS, tVictor])).id;
await q(`INSERT INTO public.session_participants (session_id, teaching_assistant_id) VALUES ($1,$2)`, [LESSON, ta]);

async function as(uid, fn) {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE authenticated`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn) => { try { await as(uid, fn); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p) => (await as(uid, () => db.query(s, p))).rows;
// The client sends a wrong class and maker on purpose: the server must replace both.
const mark = (uid, kind, ids = []) => tryAs(uid, () => db.query(
  `INSERT INTO public.lesson_speaker_marks (session_id, class_id, kind, student_ids, made_by, at)
   VALUES ($1, $2, $3, $4::uuid[], $5, '2000-01-01')`, [LESSON, PLUTO, kind, ids, ADMIN]));

eq("before any recording: the TA marks two children speaking together", await mark(TAU, "student", [k1, k2]), null);
const m1 = await one(`SELECT * FROM public.lesson_speaker_marks ORDER BY created_at LIMIT 1`);
eq("the class, the maker and the recording are the server's", [m1.class_id, m1.made_by, m1.recording_id, m1.offset_ms], [VENUS, TAU, null, null]);
ok("and so is the time", new Date(m1.at).getFullYear() >= 2026);

// A recording of the lesson, started 60 s ago with 5 s captured before Start (set-up: triggers off).
await db.exec(`SET session_replication_role = replica`);
const REC = (await one(`INSERT INTO public.class_recordings (class_id, session_id, armed_session_id, session_date,
  scheduled_start, scheduled_end, capture_opens_at, capture_closes_at, status, format, max_duration_ms,
  min_bytes_per_sec, clock_tolerance_ms, late_after_ms, evidence_min_fraction, started_by, delete_after, started_at, pre_start_ms)
  VALUES ($1,$2,$2,CURRENT_DATE, now(), now() + interval '90 min', now() - interval '5 min', now() + interval '100 min',
  'recording', 'opus-webm', 6000000, 100, 5000, 600000, 0.5, $3, now() + interval '30 days', now() - interval '60 s', 5000) RETURNING id`,
  [VENUS, LESSON, VICTOR])).id;
await db.exec(`SET session_replication_role = origin`);

eq("the teacher marks themself", await mark(VICTOR, "teacher"), null);
const m2 = await one(`SELECT * FROM public.lesson_speaker_marks WHERE kind = 'teacher'`);
eq("it carries the recording under way", m2.recording_id, REC);
ok("and the offset into its audio (60 s + 5 s before Start)", Number(m2.offset_ms) >= 64000 && Number(m2.offset_ms) < 70000, String(m2.offset_ms));
eq("the admin marks chorus", await mark(ADMIN, "chorus"), null);
eq("the TA marks stop", await mark(TAU, "stop"), null);
eq("the TA reads the roster of the lesson's date",
  (await rowsAs(TAU, `SELECT full_name FROM public.lesson_speaker_roster($1)`, [LESSON])).map((r) => r.full_name), ["Child One", "Child Two"]);
eq("the TA sees the recording is live",
  (await rowsAs(TAU, `SELECT status FROM public.lesson_speaker_recording($1)`, [LESSON])).map((r) => r.status), ["recording"]);

refused("a child of another class cannot be marked", await mark(TAU, "student", [k3]), /enrolled in this class/);
refused("a child who left before the lesson cannot be marked", await mark(TAU, "student", [kLeft]), /enrolled in this class/);
refused("'student' needs at least one child", await mark(TAU, "student", []), /lesson_speaker_marks_students/);
refused("another teacher cannot mark", await mark(OTHER, "teacher"), /row-level security/);
refused("a parent cannot mark", await mark(PARENT, "student", [k1]), /row-level security/);
eq("a parent reads no mark", (await rowsAs(PARENT, `SELECT id FROM public.lesson_speaker_marks`)).length, 0);
eq("another teacher reads no mark", (await rowsAs(OTHER, `SELECT id FROM public.lesson_speaker_marks`)).length, 0);
refused("a parent cannot read the roster",
  await tryAs(PARENT, () => db.query(`SELECT * FROM public.lesson_speaker_roster($1)`, [LESSON])), /Only the staff/);
eq("staff cannot rewrite a mark (no update policy)",
  (await rowsAs(TAU, `UPDATE public.lesson_speaker_marks SET kind = 'chorus' WHERE kind = 'stop' RETURNING id`)).length, 0);
refused("nor can the owner",
  await (async () => { try { await db.query(`UPDATE public.lesson_speaker_marks SET kind = 'chorus' WHERE kind = 'stop'`); return null; } catch (e) { return e.message; } })(), /cannot be changed/);
eq("a parent's undo deletes nothing", (await rowsAs(PARENT, `DELETE FROM public.lesson_speaker_marks RETURNING id`)).length, 0);
eq("the TA undoes the last mark", (await rowsAs(TAU, `DELETE FROM public.lesson_speaker_marks WHERE kind = 'stop' RETURNING id`)).length, 1);
eq("the staff read the marks in order",
  (await rowsAs(TAU, `SELECT kind FROM public.lesson_speaker_marks ORDER BY at, created_at`)).map((r) => r.kind), ["student", "teacher", "chorus"]);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
