// Lesson reports (20261121130000): the shared contract the three stages build on.
// Stage A (the AI draft), stage B (what families read) and stage C (the review
// quiz) each add their own section below, marked with their letter.
//
// Drives the lesson monitor pilot's migrations (which the transcript comes from)
// and then the lesson reports migration, in an in-process Postgres.
//
// The assertions that matter most here:
//   - photos, drafts and reports are staff-only (admin, a teacher of the class,
//     a TA on that lesson); a parent, a child or another teacher sees nothing;
//   - a TA may add photos but not build a draft or approve;
//   - approval is the one writer, takes only children enrolled on the lesson's
//     date and photos of that lesson, and creates the review homework once.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const PIPE_MIG = find("20260717090000"), TA_MIG = find("20261111110000"), REC_MIG = find("class_recorder");
const LM_MIG = find("lesson_monitor_pilot"), COVER_MIG = find("lesson_monitor_cover_earlier");
const LR_MIG = find("20261121130000_lesson_reports");
const EXTRA = MIGS.filter((f) => /2026112113\d{4}_lesson_report/.test(f) && f !== LR_MIG).sort(); // stage migrations after the contract
if (!PIPE_MIG || !TA_MIG || !REC_MIG || !LM_MIG || !COVER_MIG || !LR_MIG) {
  console.log("usage: lesson-reports.test.mjs <the lesson monitor's 5 migrations> <20261121130000_lesson_reports.sql> [stage migrations]");
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
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL);
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
for (const f of [PIPE_MIG, TA_MIG]) await db.exec(readFileSync(f, "utf8"));
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
for (const f of [REC_MIG, LM_MIG, COVER_MIG, LR_MIG, ...EXTRA]) await db.exec(readFileSync(f, "utf8"));
ok("applies on top of the lesson monitor pilot", true);
{
  let again = null;
  try { for (const f of [LR_MIG, ...EXTRA]) await db.exec(readFileSync(f, "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}
{
  const bare = new PGlite();
  await bare.exec(PRELUDE);
  let msg = null;
  try { await bare.exec(readFileSync(LR_MIG, "utf8")); } catch (e) { msg = e.message; }
  refused("refuses to install without the lesson monitor pilot", msg, /Refusing to install/);
}

// ---------------------------------------------------------------- people and a lesson
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3), TAU = U(4), PARENT = U(5), STUDENT = U(6), PARENT2 = U(7);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER, TAU, PARENT, STUDENT, PARENT2]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'teacher'),($5,'family'),($6,'student'),($7,'family')`,
  [ADMIN, VICTOR, OTHER, TAU, PARENT, STUDENT, PARENT2]);
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
await q(`INSERT INTO public.family_students VALUES ($1,$2),($3,$4)`, [PARENT, k1, PARENT2, k2]);
const LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2, CURRENT_DATE, '17:30','19:00') RETURNING id`, [VENUS, tVictor])).id;
const PLUTO_LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  VALUES ($1,$2, CURRENT_DATE, '17:30','19:00') RETURNING id`, [PLUTO, tOther])).id;
await q(`INSERT INTO public.session_participants (session_id, teaching_assistant_id) VALUES ($1,$2)`, [LESSON, ta]);

async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p, role) => (await as(uid, () => db.query(s, p), role)).rows;

// ---------------------------------------------------------------- contract: photos
const path = (cls, s, f) => `${cls}/${s}/${f}`;
const addPhoto = (uid, s, cls, f, kind = "whiteboard") => tryAs(uid, () => db.query(
  `INSERT INTO public.lesson_report_photos (session_id, class_id, storage_path, kind) VALUES ($1,$2,$3,$4)`, [s, cls, path(cls, s, f), kind]));
eq("the TA on the lesson adds a whiteboard photo", await addPhoto(TAU, LESSON, VENUS, "a.jpg"), null);
eq("the class's teacher adds a worksheet photo", await addPhoto(VICTOR, LESSON, VENUS, "b.jpg", "worksheet"), null);
refused("another teacher cannot add one", await addPhoto(OTHER, LESSON, VENUS, "c.jpg"), /row-level security/);
refused("a parent cannot add one", await addPhoto(PARENT, LESSON, VENUS, "d.jpg"), /row-level security/);
refused("a path outside {class}/{lesson}/ is refused", await tryAs(VICTOR, () => db.query(
  `INSERT INTO public.lesson_report_photos (session_id, class_id, storage_path) VALUES ($1,$2,$3)`,
  [LESSON, VENUS, `${PLUTO}/${LESSON}/e.jpg`])), /lesson_report_photos_path/);
eq("the uploader is the caller, whatever was sent",
  (await one(`SELECT uploaded_by FROM public.lesson_report_photos WHERE storage_path = $1`, [path(VENUS, LESSON, "a.jpg")])).uploaded_by, TAU);
eq("a parent reads no photo row", (await rowsAs(PARENT, `SELECT id FROM public.lesson_report_photos`)).length, 0);
eq("another teacher reads no photo row", (await rowsAs(OTHER, `SELECT id FROM public.lesson_report_photos`)).length, 0);
const objIns = (uid, name) => tryAs(uid, () => db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('lesson-photos', $1)`, [name]));
eq("the TA uploads the file to the lesson's folder", await objIns(TAU, path(VENUS, LESSON, "a.jpg")), null);
refused("a parent cannot upload to it", await objIns(PARENT, path(VENUS, LESSON, "p.jpg")), /row-level security/);
refused("a teacher cannot upload into another class's lesson", await objIns(OTHER, path(VENUS, LESSON, "o.jpg")), /row-level security/);
eq("a parent cannot read the file through Storage",
  (await rowsAs(PARENT, `SELECT name FROM storage.objects WHERE bucket_id = 'lesson-photos'`)).length, 0);

// ---------------------------------------------------------------- contract: drafts
refused("a TA cannot build a draft (it reads the transcript)",
  await tryAs(TAU, () => db.query(`SELECT public.lesson_report_claim($1)`, [LESSON])), /Only a teacher of this class or an admin/);
const run1 = (await rowsAs(VICTOR, `SELECT public.lesson_report_claim($1) r`, [LESSON]))[0].r;
eq("the teacher starts run 1", run1, 1);
refused("a second start while it builds is refused",
  await tryAs(VICTOR, () => db.query(`SELECT public.lesson_report_claim($1)`, [LESSON])), /already being built/);
eq("the run saves its draft", (await rowsAs(VICTOR, `SELECT public.lesson_report_finish($1, 1, '{"summary":"x"}'::jsonb, 'claude-opus-5-5') r`, [LESSON]))[0].r, true);
eq("a stale run cannot overwrite it", (await rowsAs(VICTOR, `SELECT public.lesson_report_finish($1, 1, '{"summary":"y"}'::jsonb) r`, [LESSON]))[0].r, false);
eq("the TA reads the draft", (await rowsAs(TAU, `SELECT status FROM public.lesson_report_drafts`)).map((r) => r.status), ["ready"]);
eq("a parent reads no draft", (await rowsAs(PARENT, `SELECT 1 FROM public.lesson_report_drafts`)).length, 0);
eq("no write grant on drafts", (await one(`SELECT has_table_privilege('authenticated','public.lesson_report_drafts','INSERT') p`)).p, false);

// ---------------------------------------------------------------- contract: approval
const photoA = (await one(`SELECT id FROM public.lesson_report_photos WHERE storage_path = $1`, [path(VENUS, LESSON, "a.jpg")])).id;
const QUIZ = { title: "Review: animals", questions: [{ id: "q1", kind: "choice", prompt: "A cat is...", options: ["an animal", "a fruit"], answer: "an animal" }] };
const approve = (uid, students, photos = [photoA], quiz = QUIZ, s = LESSON) => tryAs(uid, () => db.query(
  `SELECT public.approve_lesson_report($1, '{"summary":"We learned animals"}'::jsonb, '{"gaps":["plural -s"]}'::jsonb, $2::jsonb, $3::uuid[], $4::jsonb)`,
  [s, JSON.stringify(students), photos, quiz && JSON.stringify(quiz)]));
const parts = [{ student_id: k1, part: { highlight: "One" } }, { student_id: k2, part: { highlight: "Two" } }];
refused("a TA cannot approve", await approve(TAU, parts), /Only a teacher of this class or an admin/);
refused("a child of another class is refused", await approve(VICTOR, [...parts, { student_id: k3, part: {} }]), /not in this class/);
refused("a child who left before the lesson is refused", await approve(VICTOR, [{ student_id: kLeft, part: {} }]), /not in this class/);
const plutoPhoto = (await one(`INSERT INTO public.lesson_report_photos (session_id, class_id, storage_path, uploaded_by)
  VALUES ($1,$2,$3,$4) RETURNING id`, [PLUTO_LESSON, PLUTO, path(PLUTO, PLUTO_LESSON, "z.jpg"), OTHER])).id;
refused("another lesson's photo is refused", await approve(VICTOR, parts, [plutoPhoto]), /not this lesson's/);
eq("the teacher approves", await approve(VICTOR, parts), null);
const rep = await one(`SELECT id, review_homework_id FROM public.lesson_reports WHERE session_id = $1`, [LESSON]);
const hw = await one(`SELECT submission_type, class_id, title FROM public.homeworks WHERE id = $1`, [rep.review_homework_id]);
eq("...which sets the review quiz as the class's homework", hw, { submission_type: "quiz", class_id: VENUS, title: "Review: animals" });
eq("...with each child's part", (await q(`SELECT count(*)::int n FROM public.lesson_report_students WHERE report_id = $1`, [rep.id]))[0].n, 2);
eq("re-approving keeps the one homework", (await approve(VICTOR, parts.slice(0, 1))) === null &&
  (await one(`SELECT review_homework_id h FROM public.lesson_reports WHERE id = $1`, [rep.id])).h === rep.review_homework_id, true);
eq("...and replaces the children's parts", (await one(`SELECT count(*)::int n FROM public.lesson_report_students WHERE report_id = $1`, [rep.id])).n, 1);
eq("a parent reads no report table directly", (await rowsAs(PARENT, `SELECT 1 FROM public.lesson_reports UNION ALL SELECT 1 FROM public.lesson_report_students UNION ALL SELECT 1 FROM public.lesson_review_quizzes`)).length, 0);
refused("a claim after approval needs redo", await tryAs(VICTOR, () => db.query(`SELECT public.lesson_report_claim($1)`, [LESSON])), /already approved/);
eq("anon cannot call approval", (await one(`SELECT has_function_privilege('anon','public.approve_lesson_report(uuid, jsonb, jsonb, jsonb, uuid[], jsonb)','EXECUTE') p`)).p, false);

// ---------------------------------------------------------------- stage A (draft builder) adds cases here

// ---------------------------------------------------------------- stage B (families) adds cases here
// 20261121131000_lesson_report_family: get_lesson_reports_for_student and lesson_report_file.
// Its own lesson (in March), so the other stages' state does not matter.
{
  const B_MIG = EXTRA.find((f) => f.includes("lesson_report_family"));
  ok("stage B: the family migration is loaded", !!B_MIG, "pass 20261121131000_lesson_report_family.sql to the suite");
  // production's student_work, the columns the file function reads
  await db.exec(`CREATE TABLE IF NOT EXISTS public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid, class_id uuid, is_teamwork boolean NOT NULL DEFAULT false,
    member_student_ids uuid[] NOT NULL DEFAULT '{}', storage_path text, status text NOT NULL DEFAULT 'approved')`);
  const PARENT3 = U(8), PARENT4 = U(9);
  await q(`INSERT INTO auth.users (id) VALUES ($1),($2)`, [PARENT3, PARENT4]);
  await q(`INSERT INTO public.user_roles VALUES ($1,'family'),($2,'family')`, [PARENT3, PARENT4]);
  const kLate = await kid("Child Late", VENUS, "2026-04-01");
  const kNoPart = await kid("Child Quiet", VENUS);
  // STUDENT is k1's own login (the stand-in can_view_student reads family_students for both)
  await q(`INSERT INTO public.family_students VALUES ($1,$2),($3,$4),($5,$6)`, [STUDENT, k1, PARENT3, kLate, PARENT4, k3]);
  const B_LESSON = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
    VALUES ($1,$2,'2026-03-10','17:30','19:00') RETURNING id`, [VENUS, tVictor])).id;
  const bPhoto = async (f) => (await one(`INSERT INTO public.lesson_report_photos (session_id, class_id, storage_path, uploaded_by)
    VALUES ($1,$2,$3,$4) RETURNING id`, [B_LESSON, VENUS, path(VENUS, B_LESSON, f), VICTOR])).id;
  const shared = await bPhoto("board.jpg"), unshared = await bPhoto("faces.jpg");
  const work = async (owner, p, team = []) => (await one(`INSERT INTO public.student_work (student_id, class_id, is_teamwork, member_student_ids, storage_path)
    VALUES ($1,$2,$3,$4,$5) RETURNING id`, [owner, VENUS, team.length > 0, team, p])).id;
  const w1 = await work(k1, "k1/poster.jpg"), w2 = await work(k2, "k2/poster.jpg");
  const wTeam = await work(k2, "team/poster.jpg", [k1, k2]), wUnlisted = await work(k1, "k1/other.jpg");
  const classPart = {
    schema: "hec-lesson-report/1",
    lesson: { title: "Animals", title_vi: "Động vật", summary: "We learned animals", summary_vi: "Chúng con học về động vật" },
    objectives: [{ text: "Name 5 animals", text_vi: "Gọi tên 5 con vật", met: "yes", evidence: "STAFF-EVIDENCE" }],
    words: [{ en: "cat", vi: "con mèo" }],
    photo_captions: { [shared]: { caption: "Our board", caption_vi: "Bảng của lớp" }, [unshared]: { caption: "SECRET-CAPTION" } },
    gaps: [{ issue: "STAFF-GAP" }], // a writer slipping a staff key in: the family function drops it
  };
  const bParts = [
    { student_id: k1, part: { highlight: "One B", attendance: "Present", points: 3, work_ids: [w1, wTeam, w2], name_moments: [{ quote: "STAFF-MOMENT" }] } },
    { student_id: k2, part: { highlight: "Two B", work_ids: [w2] } },
  ];
  eq("stage B: the teacher approves the March lesson", await tryAs(VICTOR, () => db.query(
    `SELECT public.approve_lesson_report($1, $2::jsonb, '{"gaps":["STAFF-ONLY plural -s"]}'::jsonb, $3::jsonb, $4::uuid[], $5::jsonb)`,
    [B_LESSON, JSON.stringify(classPart), JSON.stringify(bParts), [shared], JSON.stringify(QUIZ)])), null);

  const reportsAs = async (uid, student, limit = 20, before = null) =>
    rowsAs(uid, `SELECT * FROM public.get_lesson_reports_for_student($1, $2, $3::date)`, [student, limit, before]);
  const bRow = (rows) => rows.find((r) => r.session_id === B_LESSON);
  const r1 = bRow(await reportsAs(PARENT, k1));
  ok("a parent reads their child's March report", !!r1);
  eq("...with their own child's part", r1?.part?.highlight, "One B");
  eq("...and the class part", r1?.class_part?.lesson?.title, "Animals");
  const text = JSON.stringify(r1 ?? {});
  ok("...never the staff part", !text.includes("STAFF-ONLY") && !("staff_part" in (r1 ?? {})));
  ok("...never another child's part", !text.includes("Two B"));
  ok("...never a staff key slipped into the class part", !text.includes("STAFF-GAP") && !("gaps" in (r1?.class_part ?? {})));
  ok("...objectives keep met, lose evidence", r1?.class_part?.objectives?.[0]?.met === "yes" && !text.includes("STAFF-EVIDENCE"));
  ok("...nor name moments in the child's part", !text.includes("STAFF-MOMENT"));
  eq("...only the shared photo, with its approved caption", r1?.photos, [{ id: shared, caption: "Our board", caption_vi: "Bảng của lớp" }]);
  ok("...and the review homework", !!r1?.review_homework_id);
  eq("the other child's parent gets their own child's part", bRow(await reportsAs(PARENT2, k2))?.part?.highlight, "Two B");
  eq("the child's own login reads it", bRow(await reportsAs(STUDENT, k1))?.part?.highlight, "One B");
  const quiet = bRow(await reportsAs(ADMIN, kNoPart));
  ok("a child in the class without a part gets the class part and no part", quiet?.class_part?.lesson?.title === "Animals" && quiet?.part === null);
  refused("a parent cannot read another family's child",
    await tryAs(PARENT2, () => db.query(`SELECT * FROM public.get_lesson_reports_for_student($1)`, [k1])), /Not your child/);
  refused("nor can a signed-out caller",
    await tryAs(null, () => db.query(`SELECT * FROM public.get_lesson_reports_for_student($1)`, [k1])), /Not your child/);
  eq("a child who joined after the lesson sees nothing of it", bRow(await reportsAs(PARENT3, kLate)), undefined);
  eq("a child of another class sees nothing", (await reportsAs(PARENT4, k3)).length, 0);
  eq("newest first, and p_before pages back",
    [(await reportsAs(PARENT, k1, 1))[0]?.session_id === LESSON, (await reportsAs(PARENT, k1, 5, "2026-11-01")).map((r) => r.session_id)],
    [true, [B_LESSON]]);
  eq("anon cannot call the family functions",
    (await one(`SELECT has_function_privilege('anon','public.get_lesson_reports_for_student(uuid, integer, date)','EXECUTE')
              OR has_function_privilege('anon','public.lesson_report_file(text, uuid, uuid)','EXECUTE') p`)).p, false);

  const fileAs = async (uid, kind, id, student) =>
    (await rowsAs(uid, `SELECT public.lesson_report_file($1, $2, $3) f`, [kind, id, student]))[0].f;
  eq("the shared photo comes to the parent", await fileAs(PARENT, "photo", shared, k1),
    { path: path(VENUS, B_LESSON, "board.jpg"), bucket: "lesson-photos" });
  eq("an unshared photo does not", await fileAs(PARENT, "photo", unshared, k1), null);
  eq("another class's photo does not", await fileAs(PARENT, "photo", plutoPhoto, k1), null);
  eq("a stranger naming a child they cannot view gets nothing", await fileAs(PARENT2, "photo", shared, k1), null);
  eq("a child who joined later gets nothing", await fileAs(PARENT3, "photo", shared, kLate), null);
  eq("the lesson's teacher fetches an unshared photo", (await fileAs(VICTOR, "photo", unshared, null))?.path, path(VENUS, B_LESSON, "faces.jpg"));
  eq("another teacher does not", await fileAs(OTHER, "photo", unshared, null), null);
  eq("the child's own work listed in their part comes", await fileAs(PARENT, "work", w1, k1), { path: "k1/poster.jpg", bucket: "student-work" });
  eq("teamwork the child is a member of comes", (await fileAs(PARENT, "work", wTeam, k1))?.path, "team/poster.jpg");
  eq("another child's work does not, even listed in this child's part", await fileAs(PARENT, "work", w2, k1), null);
  eq("the child's own work not listed in the report does not", await fileAs(PARENT, "work", wUnlisted, k1), null);
  eq("a parent cannot fetch another child's work by naming that child", await fileAs(PARENT, "work", w2, k2), null);
  eq("an unknown kind gives nothing", await fileAs(PARENT, "other", w1, k1), null);
}

// ---------------------------------------------------------------- stage C (review quiz) adds cases here

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
