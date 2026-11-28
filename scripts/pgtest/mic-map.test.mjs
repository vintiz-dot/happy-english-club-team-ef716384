// Mic map (20261128090000): who sits at which Lark mic. Pure rules (src/lib/micMap.ts)
// and the table, RLS, undo window and the VM's admin-only RPC in PGlite.
import { PGlite } from "@electric-sql/pglite";
import { transform } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "20261128090000_lesson_mic_seats"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: mic-map.test.mjs <its migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

// ---- 1. the pure rules
const here = dirname(fileURLToPath(import.meta.url));
const srcTs = readFileSync(resolve(here, "..", "..", "src/lib/micMap.ts"), "utf8");
const js = (await transform(srcTs, { loader: "ts" })).code;
const tmp = join(mkdtempSync(join(tmpdir(), "micmap-")), "micMap.mjs");
writeFileSync(tmp, js);
const M = await import(pathToFileURL(tmp).href);
ok("micMap imports nothing", !/^\s*import\s/m.test(srcTs));
const T = (m) => `2026-11-28T0${m}:00:00Z`;
eq("an empty map seats nobody", M.seatsAt([]), {});
eq("a null map seats nobody", M.seatsAt(null), {});
eq("last row wins", M.seatsAt([{ student_id: "a", mic: 1, at: T(1) }, { student_id: "a", mic: 3, at: T(2) }]), { a: 3 });
eq("order of the rows does not matter", M.seatsAt([{ student_id: "a", mic: 3, at: T(2) }, { student_id: "a", mic: 1, at: T(1) }]), { a: 3 });
eq("seat at a moment: before the move", M.seatsAt([{ student_id: "a", mic: 1, at: T(1) }, { student_id: "a", mic: 3, at: T(5) }], Date.parse(T(3))), { a: 1 });
eq("seat at a moment: before any row = unknown", M.seatsAt([{ student_id: "a", mic: 1, at: T(4) }], Date.parse(T(3))), {});
eq("a bad mic number is ignored", M.seatsAt([{ student_id: "a", mic: 9, at: T(1) }]), {});
eq("prefill from the last lesson, new child unseated", M.prefill(["a", "b"], [{ student_id: "a", mic: 2, at: T(1) }, { student_id: "z", mic: 4, at: T(1) }]), { a: 2, b: null });
eq("prefill with nothing before", M.prefill(["a"], null), { a: null });
eq("byMic groups and lists the unseated", M.byMic(["a", "b", "c"], { a: 2, b: 2, c: null }), { mics: { 1: [], 2: ["a", "b"], 3: [], 4: [] }, unseated: ["c"] });
eq("confirm writes one row per seated child", M.confirmRows("S", { a: 2, b: null }), [{ session_id: "S", student_id: "a", mic: 2 }]);
eq("tapping the same mic clears it", M.setSeat({ a: 2 }, "a", 2), { a: null });
eq("tapping another mic moves it", M.setSeat({ a: 2 }, "a", 3), { a: 3 });

// ---- 2. the migration
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



const IS_ADMIN_STANDIN = `
  CREATE FUNCTION public.lesson_monitor__is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
  $f$ SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') $f$;`;
const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
for (const f of CHAIN.slice(0, 2)) await db.exec(readFileSync(f, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
{
  let msg = null;
  try { await db.exec(readFileSync(CHAIN[2], "utf8")); } catch (e) { msg = e.message; }
  refused("refuses to install without lesson_monitor__is_admin", msg, /Refusing to install/);
  await db.exec("ROLLBACK").catch(() => {});
}
await db.exec(IS_ADMIN_STANDIN);
await db.exec(`GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated`);
await db.exec(readFileSync(CHAIN[2], "utf8"));
{ let again = null; try { await db.exec(readFileSync(CHAIN[2], "utf8")); } catch (e) { again = e.message; } ok("applies a second time", again === null, again ?? ""); }

const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), PARENT = U(5);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, PARENT]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'family')`, [ADMIN, VICTOR, OTHER, PARENT]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
const tOther = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [OTHER])).id;
const VENUS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Venus', $1) RETURNING id`, [tVictor])).id;
const PLUTO = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Pluto', $1) RETURNING id`, [tOther])).id;
const kid = async (n) => (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [n])).id;
const k1 = await kid("One"), k2 = await kid("Two");
const LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time) VALUES ($1,$2,CURRENT_DATE,'16:15','17:45') RETURNING id`, [VENUS, tVictor])).id;
const PLUTO_LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time) VALUES ($1,$2,CURRENT_DATE,'16:15','17:45') RETURNING id`, [PLUTO, tOther])).id;

async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p, role) => (await as(uid, () => db.query(s, p), role)).rows;
// A wrong class, maker and time are sent on purpose: the server replaces them.
const seat = (uid, session, student, mic) => tryAs(uid, () => db.query(
  `INSERT INTO public.lesson_mic_seats (session_id, class_id, student_id, mic, set_by, at) VALUES ($1,$2,$3,$4,$5,'2000-01-01')`,
  [session, PLUTO, student, mic, ADMIN]));

eq("the lesson's teacher seats a child", await seat(VICTOR, LESSON, k1, 2), null);
const r1 = await one(`SELECT * FROM public.lesson_mic_seats`);
eq("class and maker are the server's", [r1.class_id, r1.set_by], [VENUS, VICTOR]);
ok("and so is the time", new Date(r1.at).getFullYear() >= 2026);
eq("an admin seats a child", await seat(ADMIN, LESSON, k2, 3), null);
refused("another teacher cannot seat in this class", await seat(OTHER, LESSON, k1, 1), /row-level security/);
refused("a parent cannot seat", await seat(PARENT, LESSON, k1, 1), /row-level security/);
refused("anon cannot seat", await tryAs(null, () => db.query(`INSERT INTO public.lesson_mic_seats (session_id, class_id, student_id, mic) VALUES ($1,$2,$3,1)`, [LESSON, VENUS, k1]), "anon"), /permission denied/);
refused("mic 5 is refused", await seat(VICTOR, LESSON, k1, 5), /check/);
refused("mic 0 is refused", await seat(VICTOR, LESSON, k1, 0), /check/);
eq("the other class's teacher can seat in their own class", await seat(OTHER, PLUTO_LESSON, k1, 4), null);
eq("the teacher reads their class's rows only", (await rowsAs(VICTOR, `SELECT mic FROM public.lesson_mic_seats ORDER BY mic`)).map((r) => r.mic), [2, 3]);
eq("another teacher reads only their own", (await rowsAs(OTHER, `SELECT mic FROM public.lesson_mic_seats`)).map((r) => r.mic), [4]);
eq("a parent reads nothing", (await rowsAs(PARENT, `SELECT id FROM public.lesson_mic_seats`)).length, 0);
refused("anon reads nothing", await tryAs(null, () => db.query(`SELECT * FROM public.lesson_mic_seats`), "anon"), /permission denied/);
refused("no update, even by the teacher (no grant)", await tryAs(VICTOR, () => db.query(`UPDATE public.lesson_mic_seats SET mic = 1`)), /permission denied/);

// the VM's read
eq("the admin reads the map in time order", (await rowsAs(ADMIN, `SELECT public.lesson_monitor_mic_map($1) AS m`, [LESSON]))[0].m.map((r) => [r.student_id, r.mic]), [[k1, 2], [k2, 3]]);
eq("an empty lesson gives []", (await rowsAs(ADMIN, `SELECT public.lesson_monitor_mic_map($1) AS m`, [U(9)]))[0].m, []);
refused("a teacher cannot read the RPC", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_monitor_mic_map($1)`, [LESSON])), /Only an admin/);
refused("anon cannot call the RPC", await tryAs(null, () => db.query(`SELECT public.lesson_monitor_mic_map($1)`, [LESSON]), "anon"), /permission denied/);

// undo window
eq("another teacher cannot undo", (await rowsAs(OTHER, `DELETE FROM public.lesson_mic_seats WHERE session_id = $1 RETURNING id`, [LESSON])).length, 0);
eq("the teacher cannot undo the admin's row", (await rowsAs(VICTOR, `DELETE FROM public.lesson_mic_seats WHERE set_by = $1 RETURNING id`, [ADMIN])).length, 0);
await db.exec(`UPDATE public.lesson_mic_seats SET created_at = now() - interval '11 minutes' WHERE student_id = '${k1}' AND session_id = '${LESSON}'`);
eq("after 10 minutes the teacher cannot undo", (await rowsAs(VICTOR, `DELETE FROM public.lesson_mic_seats WHERE student_id = $1 AND session_id = $2 RETURNING id`, [k1, LESSON])).length, 0);
eq("seat again, then undo within 10 minutes", await seat(VICTOR, LESSON, k1, 1), null);
eq("the teacher undoes their fresh row", (await rowsAs(VICTOR, `DELETE FROM public.lesson_mic_seats WHERE student_id = $1 AND session_id = $2 AND mic = 1 RETURNING id`, [k1, LESSON])).length, 1);
eq("the service role reads everything", (await rowsAs(null, `SELECT id FROM public.lesson_mic_seats`, [], "service_role")).length >= 3, true);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
