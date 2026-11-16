// D-26: the transcript analysis writes staff-only DRAFTS; only a teacher's
// approval publishes, and only the teacher's own choices.
//
//   node scripts/pgtest/run.mjs   (or this file with the three migrations)
//
// Part 1 drives the REAL migration against an in-process Postgres:
//   20261111110000  the real is_teacher_of_class (TAs included),
//   20261113140000  the staff policies production has on cefr_assessments
//                   and student_error_log,
//   20261117100000  the fix, pasted twice.
// The other policies on these tables (admin, the child's own read, the
// family's read) are production's, copied from the migrations that made
// them (20260712090000, 20260718090000, 20260722090000, 20260730130000).
//
// Part 2 bundles the REAL analyze-transcript (remote imports stubbed, its
// ../_lib imports real), drives it with requests against an in-memory
// stand-in for Supabase and a scripted OpenAI, then loads the drafts it wrote
// into the Postgres of part 1 and approves them as a teacher would.
//
// Part 3 is the screen's reasoning (src/lib/transcriptReview.ts) and the
// suggestion rule (supabase/functions/_lib/speaker-suggestion.ts).
import { PGlite } from "@electric-sql/pglite";
import { build, transform } from "esbuild";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGS = process.argv.slice(2);
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const STAFF_MIG = MIGS.find((f) => f.includes("20261113140000"));
const FIX_MIG = MIGS.find((f) => f.includes("20261117100000"));
if (!TA_MIG || !STAFF_MIG || !FIX_MIG) {
  console.log("usage: transcript-drafts.test.mjs <20261111110000_...sql> <20261113140000_...sql> <20261117100000_transcript_analysis_drafts.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
async function loadTs(rel) {
  const out = resolve(tmpdir(), `td.${rel.replace(/[^a-z]/gi, "_")}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
}
let reviewMod = null;
async function loadReview() { return (reviewMod ??= await loadTs("src/lib/transcriptReview.ts")); }

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + String(typeof x === "string" ? x : JSON.stringify(x)).slice(0, 400) : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// =================================================================== part 1
const PRELUDE = `
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $f$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $f$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TYPE public.app_role AS ENUM ('admin','teacher','family','student');
  CREATE TYPE public.session_status AS ENUM ('Scheduled','Held','Canceled');
  CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
    $f$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $f$;
  CREATE TABLE public.teachers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, full_name text, is_active boolean NOT NULL DEFAULT true);
  CREATE TABLE public.teaching_assistants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, is_active boolean DEFAULT true);
  CREATE TABLE public.classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, default_teacher_id uuid, schedule_template jsonb);
  CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id), teacher_id uuid,
    date date NOT NULL, start_time time NOT NULL DEFAULT '17:00', end_time time NOT NULL DEFAULT '18:00', status public.session_status NOT NULL DEFAULT 'Held');
  CREATE TABLE public.homeworks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid);
  CREATE TABLE public.session_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id),
    participant_type text NOT NULL DEFAULT 'teaching_assistant', teaching_assistant_id uuid REFERENCES public.teaching_assistants(id),
    teacher_id uuid, created_by uuid, UNIQUE (session_id, teaching_assistant_id));
  CREATE TABLE public.families (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), primary_user_id uuid);
  CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text, family_id uuid, linked_user_id uuid, secondary_user_id uuid, date_of_birth date);
  CREATE TABLE public.enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id),
    class_id uuid NOT NULL REFERENCES public.classes(id), start_date date NOT NULL DEFAULT '2026-01-01', end_date date);
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(n text) RETURNS text[] LANGUAGE sql AS
    $f$ SELECT (string_to_array(n,'/'))[1:array_length(string_to_array(n,'/'),1)-1] $f$;
  -- 20261113140000 also guards these three; production's shape.
  CREATE TABLE public.student_work (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid, class_id uuid, uploaded_by uuid NOT NULL,
    status text NOT NULL DEFAULT 'processing', external_url text, member_student_ids uuid[] NOT NULL DEFAULT '{}');
  CREATE TABLE public.student_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL, class_id uuid, generated_by uuid NOT NULL,
    published boolean NOT NULL DEFAULT false);
  CREATE TABLE public.resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, external_url text, thumbnail_url text, uploaded_by uuid NOT NULL);

  -- The transcript tables, as 20260712090000 / 20260717090000 / 20260718090000 /
  -- 20260721090000 / 20260722090000 made them.
  CREATE TABLE public.class_transcripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL, uploaded_by uuid NOT NULL, title text,
    transcript_date date NOT NULL DEFAULT CURRENT_DATE, source_format text NOT NULL DEFAULT 'txt', raw_text text NOT NULL,
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'analyzed', 'failed')),
    summary text, analysis jsonb, error_message text, analyzed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
    title_covered boolean, title_evidence jsonb, title_note text, lesson_context text, processing_stage text, processing_started_at timestamptz,
    audio_storage_path text, audio_mime_type text);
  CREATE TABLE public.transcript_speaker_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transcript_id uuid NOT NULL REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    speaker_label text NOT NULL, is_teacher boolean NOT NULL DEFAULT false, utterance_count int NOT NULL DEFAULT 0, word_count int NOT NULL DEFAULT 0,
    avg_utterance_length numeric, questions_asked int NOT NULL DEFAULT 0, participation_share numeric, vocabulary_richness numeric,
    errors_count int NOT NULL DEFAULT 0, cefr_estimate text, highlights jsonb, created_at timestamptz NOT NULL DEFAULT now(),
    contribution text, teacher_feedback text, recommendation text, edited_by_teacher boolean NOT NULL DEFAULT false);
  CREATE TABLE public.student_error_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
    source text NOT NULL DEFAULT 'live_flag' CHECK (source IN ('transcript', 'student_work', 'live_flag', 'homework', 'vocab')),
    source_id uuid, error_text text NOT NULL, corrected_text text,
    error_type text NOT NULL DEFAULT 'grammar' CHECK (error_type IN ('grammar', 'vocabulary', 'pronunciation', 'spelling', 'syntax', 'other')),
    cefr_topic text, severity smallint NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3), notes text, resolved boolean NOT NULL DEFAULT false,
    created_by uuid, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.srs_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    source text NOT NULL DEFAULT 'error', error_log_id uuid REFERENCES public.student_error_log(id) ON DELETE CASCADE,
    front text NOT NULL, back text NOT NULL, hint text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (student_id, error_log_id));
  CREATE TABLE public.cefr_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL, source text NOT NULL DEFAULT 'manual',
    level text NOT NULL CHECK (level IN ('Pre-A1', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2')),
    level_score numeric NOT NULL, sub_scores jsonb, confidence numeric, evidence text, assessed_at date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid, source_id uuid, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.lesson_overviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transcript_id uuid UNIQUE REFERENCES public.class_transcripts(id) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, lesson_date date NOT NULL, title text, summary text,
    materials jsonb NOT NULL DEFAULT '[]'::jsonb, homework text, created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(), edited_by_teacher boolean NOT NULL DEFAULT false);
  CREATE TABLE public.class_speaker_aliases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    speaker_label text NOT NULL, student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE, created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (class_id, speaker_label));
`;
const LIVE = `
  CREATE FUNCTION public.can_view_student(student_id uuid, user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.linked_user_id = user_id OR s.secondary_user_id = user_id
      OR EXISTS (SELECT 1 FROM public.families f WHERE f.id = s.family_id AND f.primary_user_id = user_id)));
  $function$;
  CREATE FUNCTION public.is_linked_student(_user_id uuid, _student_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student_id AND s.linked_user_id = _user_id);
  $function$;
  CREATE FUNCTION public.can_view_student_in_class(_student_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = _student_id AND e.end_date IS NULL AND public.is_teacher_of_class(_user_id, e.class_id));
  $function$;
  CREATE FUNCTION public.is_enrolled_in_class(_user_id uuid, _class_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
    SELECT EXISTS (SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id
                    WHERE s.linked_user_id = _user_id AND e.class_id = _class_id AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE));
  $function$;
  DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['students','enrollments','class_transcripts','transcript_speaker_metrics','student_error_log','srs_cards',
                             'cefr_assessments','lesson_overviews','class_speaker_aliases','student_work','student_reports','resources'] LOOP
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP; END $$;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
  CREATE POLICY students_own ON public.students FOR SELECT TO authenticated
    USING (can_view_student(id, auth.uid()) OR can_view_student_in_class(id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
  CREATE POLICY enrollments_read ON public.enrollments FOR SELECT TO authenticated USING (true);

  -- 20260712090000
  CREATE POLICY "admins_all_transcripts" ON public.class_transcripts FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_transcripts" ON public.class_transcripts FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "admins_all_tsm" ON public.transcript_speaker_metrics FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_read_class_tsm" ON public.transcript_speaker_metrics FOR SELECT TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "students_read_own_tsm" ON public.transcript_speaker_metrics FOR SELECT TO authenticated
    USING (student_id IS NOT NULL AND public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "admins_all_error_log" ON public.student_error_log FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_error_log" ON public.student_error_log FOR ALL TO authenticated
    USING (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)))
    WITH CHECK (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));
  CREATE POLICY "students_read_own_errors" ON public.student_error_log FOR SELECT TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "admins_all_srs" ON public.srs_cards FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "students_manage_own_srs" ON public.srs_cards FOR ALL TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id)) WITH CHECK (public.is_linked_student(auth.uid(), student_id));
  CREATE POLICY "admins_all_cefr" ON public.cefr_assessments FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_class_cefr" ON public.cefr_assessments FOR ALL TO authenticated
    USING (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)))
    WITH CHECK (created_by = auth.uid() OR (class_id IS NOT NULL AND public.is_teacher_of_class(auth.uid(), class_id)));
  CREATE POLICY "students_read_own_cefr" ON public.cefr_assessments FOR SELECT TO authenticated
    USING (public.is_linked_student(auth.uid(), student_id));
  -- 20260718090000
  CREATE POLICY "admins_all_lesson_overviews" ON public.lesson_overviews FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_lesson_overviews" ON public.lesson_overviews FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  CREATE POLICY "students_read_class_lesson_overviews" ON public.lesson_overviews FOR SELECT TO authenticated
    USING (public.is_enrolled_in_class(auth.uid(), class_id));
  -- 20260721090000
  CREATE POLICY "admins_all_speaker_aliases" ON public.class_speaker_aliases FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  CREATE POLICY "teachers_manage_speaker_aliases" ON public.class_speaker_aliases FOR ALL TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  -- 20260722090000
  CREATE POLICY "teachers_update_class_tsm" ON public.transcript_speaker_metrics FOR UPDATE TO authenticated
    USING (public.is_teacher_of_class(auth.uid(), class_id)) WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id));
  -- 20260730130000
  CREATE POLICY "family_read_children_cefr" ON public.cefr_assessments FOR SELECT TO authenticated
    USING (public.can_view_student(student_id, auth.uid()));
  CREATE POLICY "family_read_children_lesson_overviews" ON public.lesson_overviews FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.enrollments e JOIN public.students s ON s.id = e.student_id JOIN public.families f ON f.id = s.family_id
                    WHERE e.class_id = lesson_overviews.class_id AND f.primary_user_id = auth.uid()));
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
await db.exec(readFileSync(TA_MIG, "utf8"));
await db.exec(LIVE);
await db.exec(readFileSync(STAFF_MIG, "utf8"));
const FIX = readFileSync(FIX_MIG, "utf8");

console.log("=== installing ===");
{
  // A policy the file has never seen on a draft table: refuse, change nothing.
  await db.exec(`CREATE POLICY rogue_class_read ON public.transcript_speaker_metrics FOR SELECT TO authenticated USING (true)`);
  let err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on transcript_speaker_metrics: the paste refuses and names it", /Refusing to install.*rogue_class_read/.test(err ?? ""), err);
  eq("  ...and installs nothing", (await one(`SELECT to_regclass('public.transcript_approvals') IS NULL AS none`)).none, true);
  await db.exec(`DROP POLICY rogue_class_read ON public.transcript_speaker_metrics`);
  await db.exec(`CREATE POLICY rogue_family ON public.class_transcripts FOR SELECT TO authenticated USING (true)`);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("an unknown policy on class_transcripts (it holds the draft overview): refused", /Refusing to install.*rogue_family/.test(err ?? ""), err);
  await db.exec(`DROP POLICY rogue_family ON public.class_transcripts`);

  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("the fix installs on production's state", err === null, err);
  err = null; try { await db.exec(FIX); } catch (e) { err = e.message; }
  ok("and pastes a second time", err === null, err);
}
{
  const grants = await q(`SELECT table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS p
                            FROM information_schema.role_table_grants
                           WHERE table_schema = 'public' AND table_name IN ('transcript_speaker_suggestions', 'transcript_approvals')
                           GROUP BY 1, 2 ORDER BY 1, 2`);
  const g = (t, r) => grants.find((x) => x.table_name === t && x.grantee === r)?.p ?? "";
  for (const t of ["transcript_speaker_suggestions", "transcript_approvals"]) {
    ok(`${t}: authenticated holds SELECT, INSERT, UPDATE, DELETE (explicit; 20260712023825 revoked the defaults)`, ["DELETE", "INSERT", "SELECT", "UPDATE"].every((p) => g(t, "authenticated").includes(p)), g(t, "authenticated"));
    ok(`${t}: service_role holds all`, ["DELETE", "INSERT", "SELECT", "UPDATE"].every((p) => g(t, "service_role").includes(p)), g(t, "service_role"));
    eq(`${t}: anon holds nothing`, g(t, "anon"), "");
    const pol = await q(`SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`, [t]);
    eq(`${t}: one policy, a staff SELECT (no family policy, no write policy)`, pol.map((p) => p.cmd), ["SELECT"]);
  }
  const fns = await q(`SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth, p.prosecdef
                         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public' AND p.proname IN ('approve_transcript_analysis', 'withdraw_transcript_approval') ORDER BY 1`);
  eq("approve / withdraw: SECURITY DEFINER, callable by authenticated, not by anon", fns.map((f) => [f.proname, f.prosecdef, f.auth, f.anon]),
    [["approve_transcript_analysis", true, true, false], ["withdraw_transcript_approval", true, true, false]]);
}

// ---------------------------------------------------------------- people
const mk = async (role) => { const id = randomUUID(); await q(`INSERT INTO auth.users VALUES ($1)`, [id]); if (role) await q(`INSERT INTO public.user_roles VALUES ($1,$2)`, [id, role]); return id; };
const ADMIN = await mk("admin");
const TEA = await mk("teacher"), TEB = await mk("teacher"), TA_ON = await mk("teacher");
const PARENT = await mk("family"), KID = await mk("student"), KIDB = await mk("student"), NOROLE = await mk(null);
const tA = (await one(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1, 'Ms Lan') RETURNING id`, [TEA])).id;
const tB = (await one(`INSERT INTO public.teachers (user_id, full_name) VALUES ($1, 'Mr Minh') RETURNING id`, [TEB])).id;
const taOn = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA_ON])).id;
const CA = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class A', $1) RETURNING id`, [tA])).id;
const CB = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Class B', $1) RETURNING id`, [tB])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [CA, taOn]);
await q(`INSERT INTO public.sessions (class_id, teacher_id, date) VALUES ($1,$2,'2026-11-16')`, [CA, tA]);
const F1 = (await one(`INSERT INTO public.families (primary_user_id) VALUES ($1) RETURNING id`, [PARENT])).id;
const kid = async (name, cls, { family = null, linked = null } = {}) => {
  const id = (await one(`INSERT INTO public.students (full_name, family_id, linked_user_id) VALUES ($1,$2,$3) RETURNING id`, [name, family, linked])).id;
  if (cls) await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [id, cls]);
  return id;
};
// Pseudonyms, as the children use in class (owner's ruling). Two children share "Bao".
const KIKI = await kid("Kiki", CA, { family: F1, linked: KID });
const BAO_T = await kid("Bao Tran", CA, { family: F1 });
const BAO_N = await kid("Bao Ngoc", CA);
const ANH = await kid("Anh", CA);
const B1 = await kid("Lily", CB, { linked: KIDB });

async function as(uid, sql, params = [], { role = "authenticated", keep = false } = {}) {
  await db.exec("BEGIN");
  try {
    await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
    await db.exec(`SET LOCAL ROLE ${role}`);
    const r = await db.query(sql, params);
    await db.exec(keep ? "COMMIT" : "ROLLBACK");
    return { rows: r.rows, n: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) { await db.exec("ROLLBACK"); return { rows: [], n: 0, err: e.message }; }
}
const approve = (uid, tr, assignments, { overview = null, replace = false, keep = true } = {}) =>
  as(uid, `SELECT public.approve_transcript_analysis($1, $2::jsonb, $3::jsonb, $4) AS r`, [tr, JSON.stringify(assignments), overview ? JSON.stringify(overview) : null, replace], { keep });
const withdraw = (uid, tr) => as(uid, `SELECT public.withdraw_transcript_approval($1) AS r`, [tr], { keep: true });

// A drafted lesson, written as the analysis writes it: service role, no child linked.
async function draftLesson(cls, { title = "Past simple", date = "2026-11-16" } = {}) {
  const T = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, overview_draft, analyzed_at)
       VALUES ($1,$2,$3,$4,'Teacher: hello','analyzed','We practised the past simple.', $5::jsonb, $6::jsonb, now()) RETURNING id`,
    [cls, TEA, title, date, JSON.stringify({ drafted_for_review: true, materials: [{ name: "Book 2", pages: "14" }], homework: "Page 15" }),
     JSON.stringify({ summary: "We practised the past simple.", materials: [{ name: "Book 2", pages: "14" }], homework: "Page 15", edited_by_teacher: false })])).id;
  const metric = async (label, isTeacher = false) => {
    const r = await as(null, `INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, is_teacher, word_count, cefr_estimate, teacher_feedback)
                              VALUES ($1,$2,$3,$4,20,'A2','Well done') RETURNING id`, [T, cls, label, isTeacher], { role: "service_role", keep: true });
    if (r.err) throw new Error(r.err);
    return r.rows[0].id;
  };
  const sug = async (m, key, sid, conf, basis, errors = []) => {
    const r = await as(null, `INSERT INTO public.transcript_speaker_suggestions (metric_id, transcript_id, class_id, speaker_key, suggested_student_id, confidence, basis, draft_errors, cefr_estimate, cefr_confidence, cefr_evidence)
                              VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'A2',0.6,'Used past forms with help')`, [m, T, cls, key, sid, conf, basis, JSON.stringify(errors)], { role: "service_role", keep: true });
    if (r.err) throw new Error(r.err);
  };
  return { T, metric, sug };
}
const ERR1 = { error_text: "I go to the park yesterday", corrected_text: "I went to the park yesterday", error_type: "grammar", cefr_topic: "past simple" };
const ERR2 = { error_text: "I goed", corrected_text: "I went", error_type: "grammar", cefr_topic: "irregular verbs" };

const L1 = await draftLesson(CA);
const mTeacher = await L1.metric("Teacher", true);
const mKiki = await L1.metric("Kiki");
const mBao = await L1.metric("Bao");
const mUnknown = await L1.metric("Unknown");
await L1.sug(mKiki, "kiki", KIKI, "high", "exact_name", [ERR1]);
await L1.sug(mBao, "bao", null, "low", "name_contains", [ERR2]);
await L1.sug(mUnknown, "unknown", null, "low", "none");

const count = async (uid, table, where = "true", params = []) => (await as(uid, `SELECT count(*)::int AS n FROM public.${table} WHERE ${where}`, params)).rows[0]?.n ?? -1;

console.log("=== a draft reaches no family and no child ===");
for (const [label, who] of [["the family's primary login", PARENT], ["the child's own login (Kiki)", KID], ["another class's child", KIDB], ["an account with no role", NOROLE]]) {
  eq(`${label}: no suggestion, no approval, no transcript (draft overview), no draft metric row`,
    [await count(who, "transcript_speaker_suggestions"), await count(who, "transcript_approvals"), await count(who, "class_transcripts"),
     await count(who, "transcript_speaker_metrics")], [0, 0, 0, 0]);
  eq(`${label}: nothing published yet - no error, card, CEFR point or lesson overview`,
    [await count(who, "student_error_log"), await count(who, "srs_cards"), await count(who, "cefr_assessments"), await count(who, "lesson_overviews")], [0, 0, 0, 0]);
}
eq("the class's teacher reads the draft: 3 suggestions, 4 metric rows, the transcript", [await count(TEA, "transcript_speaker_suggestions"), await count(TEA, "transcript_speaker_metrics"), await count(TEA, "class_transcripts")], [3, 4, 1]);
eq("the class's TA reads the suggestions too", await count(TA_ON, "transcript_speaker_suggestions"), 3);
eq("an admin reads them", await count(ADMIN, "transcript_speaker_suggestions"), 3);
eq("a teacher of ANOTHER class reads none of it", [await count(TEB, "transcript_speaker_suggestions"), await count(TEB, "transcript_speaker_metrics"), await count(TEB, "class_transcripts")], [0, 0, 0]);
{
  const r = await as(PARENT, `SELECT * FROM public.transcript_speaker_suggestions WHERE suggested_student_id = $1`, [KIKI]);
  eq("the family cannot read the suggestion about its own child either", r.rows.length, 0);
}

console.log("=== only the approval links a speaker to a child ===");
{
  const svc = await as(null, `INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3)`, [L1.T, CA, KIKI], { role: "service_role" });
  ok("the service role (the analysis) cannot insert a metric row with a child", /approves the lesson/.test(svc.err ?? ""), svc);
  const t = await as(TEA, `UPDATE public.transcript_speaker_metrics SET student_id = $1 WHERE id = $2`, [KIKI, mKiki]);
  ok("the class's teacher cannot link one directly (the approval is the way)", /approves the lesson/.test(t.err ?? ""), t);
  const a = await as(ADMIN, `UPDATE public.transcript_speaker_metrics SET student_id = $1 WHERE id = $2`, [KIKI, mKiki]);
  ok("nor can an admin", /approves the lesson/.test(a.err ?? ""), a);
  const s2 = await as(null, `UPDATE public.transcript_speaker_metrics SET student_id = $1 WHERE id = $2`, [KIKI, mKiki], { role: "service_role" });
  ok("nor the service role", /approves the lesson/.test(s2.err ?? ""), s2);
  const edit = await as(TEA, `UPDATE public.transcript_speaker_metrics SET teacher_feedback = 'Lovely work' WHERE id = $1`, [mKiki]);
  ok("the teacher can still correct the drafted feedback text", edit.err === null && edit.n === 1, edit);
  const low = await as(null, `UPDATE public.transcript_speaker_suggestions SET suggested_student_id = $1 WHERE metric_id = $2`, [BAO_T, mBao], { role: "service_role" });
  ok("a LOW suggestion cannot name a child, even written by the service role (CHECK)", /low_is_unknown/.test(low.err ?? ""), low);
  const tw = await as(TEA, `UPDATE public.transcript_speaker_suggestions SET confidence = 'high', suggested_student_id = $1 WHERE metric_id = $2`, [BAO_T, mBao]);
  ok("a teacher cannot rewrite a suggestion (no write policy): 0 rows", tw.err === null && tw.n === 0, tw);
  const fam = await as(PARENT, `INSERT INTO public.transcript_approvals (transcript_id, class_id, approved_by) VALUES ($1,$2,$3)`, [L1.T, CA, PARENT]);
  ok("nobody writes an approval row directly", fam.err !== null, fam);
  const tap = await as(TEA, `INSERT INTO public.transcript_approvals (transcript_id, class_id, approved_by) VALUES ($1,$2,$3)`, [L1.T, CA, TEA]);
  ok("  ...not even the class's teacher", tap.err !== null, tap);
}

console.log("=== who may approve ===");
const KIKI_ONLY = [{ metric_id: mKiki, student_id: KIKI, cefr_level: "A2", errors: [ERR1] }];
for (const [label, who] of [["the family", PARENT], ["the child", KID], ["a teacher of another class", TEB], ["an account with no role", NOROLE], ["nobody signed in", null]]) {
  const r = await approve(who, L1.T, KIKI_ONLY, { keep: false });
  ok(`${label}: refused`, r.err !== null && /teacher of this class|Sign in/.test(r.err), r);
}
eq("  ...and nothing was published by any of them", [await count(ADMIN, "student_error_log"), await count(ADMIN, "cefr_assessments"), await count(ADMIN, "lesson_overviews"), await count(ADMIN, "transcript_approvals")], [0, 0, 0, 0]);
{
  const r = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: B1 }], { keep: false });
  ok("a child from another class: refused", /not in this class/.test(r.err ?? ""), r);
  const r2 = await approve(TEA, L1.T, [{ metric_id: mTeacher, student_id: KIKI }], { keep: false });
  ok("the teacher's own speech assigned to a child: refused", /is the teacher/.test(r2.err ?? ""), r2);
  const r3 = await approve(TEA, L1.T, [{ metric_id: randomUUID(), student_id: KIKI }], { keep: false });
  ok("a speaker from no / another lesson: refused", /not part of this lesson/.test(r3.err ?? ""), r3);
  const r4 = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: "Z9" }], { keep: false });
  ok("a CEFR level the scale does not have: refused", /unknown CEFR level/.test(r4.err ?? ""), r4);
  const r5 = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI }, { metric_id: mKiki, student_id: ANH }], { keep: false });
  ok("one speaker sent twice: refused", /listed twice/.test(r5.err ?? ""), r5);
}

console.log("=== approve publishes the teacher's choices, exactly once ===");
{
  // The teacher confirms the high suggestion and leaves the low one unknown
  // (the screen never pre-selects low). Bao's drafted error must go nowhere.
  const r = await approve(TEA, L1.T, [...KIKI_ONLY, { metric_id: mBao, student_id: null }]);
  ok("the class's teacher approves", r.err === null, r);
  const res = r.rows[0]?.r ?? {};
  eq("  result: one child, one unknown speaker, one error, one CEFR point, an overview", [res.students, res.unknown_speakers, res.errors_published, res.cefr_points, !!res.overview_id],
    [[KIKI], 1, 1, 1, true]);
  eq("Kiki's family now reads her CEFR point and the lesson overview", [await count(PARENT, "cefr_assessments", "student_id = $1", [KIKI]), await count(PARENT, "lesson_overviews")], [1, 1]);
  eq("Kiki's own login reads her error, its practice card, her metric row and the overview",
    [await count(KID, "student_error_log"), await count(KID, "srs_cards"), await count(KID, "transcript_speaker_metrics"), await count(KID, "lesson_overviews")], [1, 1, 1, 1]);
  const lv = await one(`SELECT level, created_by, confidence, evidence FROM public.cefr_assessments WHERE student_id = $1`, [KIKI]);
  eq("  the CEFR point is the level the teacher sent, signed by the teacher", [lv.level, lv.created_by, Number(lv.confidence)], ["A2", TEA, 0.6]);
  eq("the LOW suggestion landed on no child: both Baos and Anh have nothing", await one(`SELECT
      (SELECT count(*)::int FROM public.student_error_log WHERE student_id IN ($1,$2,$3)) AS e,
      (SELECT count(*)::int FROM public.cefr_assessments WHERE student_id IN ($1,$2,$3)) AS c,
      (SELECT count(*)::int FROM public.transcript_speaker_metrics WHERE student_id IN ($1,$2,$3)) AS m,
      (SELECT count(*)::int FROM public.srs_cards WHERE student_id IN ($1,$2,$3)) AS s`, [BAO_T, BAO_N, ANH]), { e: 0, c: 0, m: 0, s: 0 });
  eq("  and its metric row is still unlinked", (await one(`SELECT student_id FROM public.transcript_speaker_metrics WHERE id = $1`, [mBao])).student_id, null);
  eq("the teacher's choice is remembered for the class, as a label for later suggestions",
    (await q(`SELECT speaker_label, student_id FROM public.class_speaker_aliases WHERE class_id = $1`, [CA])).map((a) => [a.speaker_label, a.student_id]), [["kiki", KIKI]]);
  const ov = await one(`SELECT summary, homework, materials, edited_by_teacher FROM public.lesson_overviews WHERE transcript_id = $1`, [L1.T]);
  eq("  the overview is the draft's", [ov.summary, ov.homework, ov.materials, ov.edited_by_teacher], ["We practised the past simple.", "Page 15", [{ name: "Book 2", pages: "14" }], true]);
  eq("another class's child sees nothing of it", [await count(KIDB, "lesson_overviews"), await count(KIDB, "student_error_log"), await count(KIDB, "cefr_assessments")], [0, 0, 0]);
  eq("the suggestion rows stay staff-only after approval", [await count(PARENT, "transcript_speaker_suggestions"), await count(KID, "transcript_speaker_suggestions"), await count(KID, "transcript_approvals")], [0, 0, 0]);

  const again = await approve(TEA, L1.T, [...KIKI_ONLY, { metric_id: mBao, student_id: null }]);
  ok("approving the same lesson again succeeds", again.err === null, again);
  eq("  ...and replaces: still exactly 1 error, 1 card, 1 CEFR point, 1 overview, 1 approval",
    [await count(ADMIN, "student_error_log"), await count(ADMIN, "srs_cards"), await count(ADMIN, "cefr_assessments"), await count(ADMIN, "lesson_overviews"), await count(ADMIN, "transcript_approvals")], [1, 1, 1, 1, 1]);
  const ap = await one(`SELECT jsonb_array_length(history) AS h, array_length(error_log_ids, 1) AS e FROM public.transcript_approvals WHERE transcript_id = $1`, [L1.T]);
  eq("  the approval keeps its history (2 approvals) and lists the 1 error it wrote", [ap.h, ap.e], [2, 1]);

  const changed = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: null, errors: [] }, { metric_id: mBao, student_id: BAO_T, cefr_level: "A1", errors: [ERR2] }],
    { overview: { summary: "Teacher's own summary", materials: [], homework: null } });
  ok("the teacher changes their mind: Kiki without an error or level, Bao chosen by hand as Bao Tran", changed.err === null, changed);
  eq("  Kiki's earlier error, card and level are gone; Bao Tran has the one the teacher kept",
    [await count(ADMIN, "student_error_log", "student_id = $1", [KIKI]), await count(ADMIN, "srs_cards", "student_id = $1", [KIKI]), await count(ADMIN, "cefr_assessments", "student_id = $1", [KIKI]),
     await count(ADMIN, "student_error_log", "student_id = $1", [BAO_T]), await count(ADMIN, "cefr_assessments", "student_id = $1", [BAO_T])], [0, 0, 0, 1, 1]);
  eq("  the overview is the teacher's text", (await one(`SELECT summary FROM public.lesson_overviews WHERE transcript_id = $1`, [L1.T])).summary, "Teacher's own summary");
  eq("  Bao Ngoc (the other Bao) has nothing", [await count(ADMIN, "student_error_log", "student_id = $1", [BAO_N]), await count(ADMIN, "transcript_speaker_metrics", "student_id = $1", [BAO_N])], [0, 0]);
  const declined = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: null }, { metric_id: mBao, student_id: null }]);
  ok("the teacher declines even the HIGH suggestion (Kiki left unknown): approved", declined.err === null, declined);
  eq("  the suggestion is not used: nothing about Kiki or anyone from this lesson, only the overview",
    [await count(ADMIN, "student_error_log", "source_id = $1", [L1.T]), await count(ADMIN, "cefr_assessments", "source_id = $1", [L1.T]),
     await count(ADMIN, "transcript_speaker_metrics", "transcript_id = $1 AND student_id IS NOT NULL", [L1.T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [L1.T])], [0, 0, 0, 1]);
  const omitted = await approve(TEA, L1.T, []);
  ok("  nor when the speakers are simply left out of the request", omitted.err === null
    && (await count(ADMIN, "transcript_speaker_metrics", "transcript_id = $1 AND student_id IS NOT NULL", [L1.T])) === 0, omitted);
  const backToFirst = await approve(TEA, L1.T, [...KIKI_ONLY, { metric_id: mBao, student_id: null }]);
  ok("and back to the first choice", backToFirst.err === null, backToFirst);
}

console.log("=== while approved, the drafts are not rebuilt under it ===");
{
  const d = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L1.T], { role: "service_role" });
  ok("the service role (a re-analysis) cannot delete an approved lesson's metric rows", /Withdraw the approval/.test(d.err ?? ""), d);
  const i = await as(null, `INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label) VALUES ($1,$2,'New')`, [L1.T, CA], { role: "service_role" });
  ok("  ...nor add one", /Withdraw the approval/.test(i.err ?? ""), i);
}

console.log("=== withdraw takes back exactly what the approval wrote ===");
{
  // Unrelated rows about the same child that must survive.
  await q(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'ai_report','A1',1,$3)`, [KIKI, CA, randomUUID()]);
  await q(`INSERT INTO public.student_error_log (student_id, class_id, source, error_text, created_by) VALUES ($1,$2,'live_flag','he go',$3)`, [KIKI, CA, TEA]);
  for (const [label, who] of [["the family", PARENT], ["a teacher of another class", TEB], ["nobody signed in", null]]) {
    const r = await withdraw(who, L1.T);
    ok(`${label}: cannot withdraw`, r.err !== null, r);
  }
  const r = await withdraw(TEA, L1.T);
  ok("the class's teacher withdraws", r.err === null, r);
  eq("  result: 1 error, 1 CEFR point, 1 overview removed", [r.rows[0]?.r?.errors_removed, r.rows[0]?.r?.cefr_removed, r.rows[0]?.r?.overview_removed], [1, 1, 1]);
  eq("the family and the child read none of the lesson now", [await count(PARENT, "lesson_overviews"), await count(KID, "transcript_speaker_metrics"), await count(KID, "srs_cards")], [0, 0, 0]);
  eq("the unrelated CEFR point and live-flag error are untouched",
    [await count(ADMIN, "cefr_assessments", "source = 'ai_report'"), await count(ADMIN, "student_error_log", "source = 'live_flag'")], [1, 1]);
  const ap = await one(`SELECT withdrawn_by, withdrawn_at IS NOT NULL AS w, error_log_ids, jsonb_array_length(history) AS h FROM public.transcript_approvals WHERE transcript_id = $1`, [L1.T]);
  eq("  the approval row says who withdrew it, lists nothing, and keeps its history", [ap.withdrawn_by, ap.w, ap.error_log_ids, ap.h], [TEA, true, [], 7]);
  const again = await withdraw(TEA, L1.T);
  ok("withdrawing twice is refused", /not approved/.test(again.err ?? ""), again);
  const d = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1 AND speaker_label = 'Unknown'`, [L1.T], { role: "service_role", keep: false });
  ok("once withdrawn, a re-analysis may rebuild the drafts again", d.err === null && d.n === 1, d);
}

console.log("=== a lesson the OLD pipeline already published ===");
{
  // As production holds it: rows written at once by the old analysis (no created_by), an overview, a linked metric row.
  const T = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, analyzed_at)
                        VALUES ($1,$2,'Old lesson','2026-10-01','x','analyzed','Old summary','{"materials":[]}'::jsonb, now()) RETURNING id`, [CA, TEA])).id;
  const oldErr = (await one(`INSERT INTO public.student_error_log (student_id, class_id, source, source_id, error_text, corrected_text) VALUES ($1,$2,'transcript',$3,'old error','fixed') RETURNING id`, [KIKI, CA, T])).id;
  await q(`INSERT INTO public.srs_cards (student_id, error_log_id, front, back) VALUES ($1,$2,'f','b')`, [KIKI, oldErr]);
  await q(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'transcript','B1',3,$3)`, [KIKI, CA, T]);
  await q(`INSERT INTO public.lesson_overviews (transcript_id, class_id, lesson_date, summary) VALUES ($1,$2,'2026-10-01','Old summary')`, [T, CA]);
  await q(`INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3)`, [T, CA, KIKI]);
  const before = [await count(ADMIN, "student_error_log", "source_id = $1", [T]), await count(ADMIN, "cefr_assessments", "source_id = $1", [T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [T])];
  eq("the old pipeline's published rows are in place (the migration changes no existing row)", before, [1, 1, 1]);
  const r = await approve(TEA, T, []);
  ok("approving it without saying so is refused, with the code the screen recognises", /earlier automatic analysis \(4 item/.test(r.err ?? ""), r);
  eq("  ...and nothing moved", [await count(ADMIN, "student_error_log", "source_id = $1", [T]), await count(ADMIN, "cefr_assessments", "source_id = $1", [T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [T]), await count(ADMIN, "srs_cards", "error_log_id = $1", [oldErr])], [1, 1, 1, 1]);
  const hint = await db.query(`SELECT 1`).then(async () => {
    await db.exec("BEGIN");
    try { await db.query(`SELECT set_config('test.uid', $1, true)`, [TEA]); await db.exec("SET LOCAL ROLE authenticated");
      await db.query(`SELECT public.approve_transcript_analysis($1, '[]'::jsonb)`, [T]); return null; }
    catch (e) { return e.hint ?? null; } finally { await db.exec("ROLLBACK"); }
  });
  eq("  the refusal's hint is TRANSCRIPT_LEGACY_ROWS", hint, "TRANSCRIPT_LEGACY_ROWS");
  const rr = await approve(TEA, T, [], { replace: true });
  ok("the teacher chooses to replace them: approved", rr.err === null, rr);
  const ap = await one(`SELECT replaced_legacy FROM public.transcript_approvals WHERE transcript_id = $1`, [T]);
  eq("  every replaced row was copied into the approval first", ap.replaced_legacy.map((x) => x.table).sort(), ["cefr_assessments", "lesson_overviews", "student_error_log", "transcript_speaker_metrics"]);
  eq("  the old error (and its card) and the old level are gone; the overview is the approved one", [await count(ADMIN, "student_error_log", "source_id = $1", [T]), await count(ADMIN, "srs_cards", "error_log_id = $1", [oldErr]), await count(ADMIN, "cefr_assessments", "source_id = $1", [T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [T])], [0, 0, 0, 1]);
  eq("  rows of OTHER lessons were not touched", [await count(ADMIN, "cefr_assessments", "source = 'ai_report'"), await count(ADMIN, "student_error_log", "source = 'live_flag'")], [1, 1]);
  const del = await as(ADMIN, `DELETE FROM public.class_transcripts WHERE id = $1`, [T], { keep: true });
  ok("an admin can still delete an approved transcript (its rows cascade as the owner)", del.err === null && del.n === 1, del);
}
{
  const p = await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, raw_text, status) VALUES ($1,$2,'x','processing') RETURNING id`, [CA, TEA]);
  const r = await approve(TEA, p.id, []);
  ok("a lesson still analysing cannot be approved", /not finished analysing/.test(r.err ?? ""), r);
}

// =================================================================== part 2
console.log("=== the function: what it writes, and what it asks the model ===");
const SERVICE_KEY = "test-service-role-key";
const ANON_KEY = "test-anon-key";
const tokenOf = (u) => `jwt-${u}`;
const world = { tables: {}, log: [], vendor: [], roles: {} };
const embed = (table, row, select) => {
  const out = { ...row };
  if (table === "enrollments" && /students\(/.test(select)) out.students = (world.tables.students || []).find((s) => s.id === row.student_id) ?? null;
  if (table === "sessions" && /teachers\(/.test(select)) out.teachers = (world.tables.teachers || []).find((t) => t.id === row.teacher_id) ?? null;
  return out;
};
function fakeClient(key) {
  const who = key === SERVICE_KEY ? "service" : "other";
  const from = (table) => {
    const st = { op: "select", eq: [], neq: [], in: [], payload: null, single: false, maybe: false, returning: false, limit: null, select: "*" };
    const rows = () => (world.tables[table] ??= []);
    const match = (r) => st.eq.every(([c, v]) => r[c] === v) && st.neq.every(([c, v]) => r[c] !== v) && st.in.every(([c, vs]) => vs.includes(r[c]));
    const exec = () => {
      world.log.push({ client: who, table, op: st.op });
      let data;
      if (st.op === "select") data = rows().filter(match).map((r) => embed(table, r, st.select));
      else if (st.op === "insert" || st.op === "upsert") {
        const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ id: p.id ?? randomUUID(), ...p }));
        rows().push(...list); data = list;
      } else if (st.op === "update") { data = rows().filter(match); for (const r of data) Object.assign(r, st.payload); }
      else if (st.op === "delete") { data = rows().filter(match); world.tables[table] = rows().filter((r) => !match(r)); }
      if (st.limit !== null) data = data.slice(0, st.limit);
      if (st.single || st.maybe) {
        if (data.length > 1) return { data: null, error: { message: "multiple rows" } };
        if (data.length === 0) return st.single ? { data: null, error: { message: "no rows" } } : { data: null, error: null };
        return { data: data[0], error: null };
      }
      return { data: st.op === "select" || st.returning ? data : null, error: null };
    };
    const b = new Proxy({}, {
      get(_t, prop) {
        if (prop === "then") return (res, rej) => Promise.resolve().then(exec).then(res, rej);
        return (...a) => {
          if (prop === "eq") st.eq.push([a[0], a[1]]);
          else if (prop === "neq") st.neq.push([a[0], a[1]]);
          else if (prop === "in") st.in.push([a[0], a[1]]);
          else if (prop === "limit") st.limit = a[0];
          else if (["insert", "upsert", "update", "delete"].includes(prop)) { st.op = prop; st.payload = a[0]; }
          else if (prop === "select") { if (st.op !== "select") st.returning = true; else st.select = a[0] ?? "*"; }
          else if (prop === "single") st.single = true;
          else if (prop === "maybeSingle") st.maybe = true;
          return b;
        };
      },
    });
    return b;
  };
  return {
    from,
    rpc: async (name, args) => {
      world.log.push({ client: who, rpc: name });
      if (name === "is_teacher_of_class") return { data: (world.teacherOf[args.user_id] || []).includes(args.class_id), error: null };
      return { data: null, error: null };
    },
    auth: {
      getUser: async (token) => {
        const uid = Object.keys(world.roles).find((u) => tokenOf(u) === token);
        return uid ? { data: { user: { id: uid, email: null } }, error: null } : { data: { user: null }, error: { message: "invalid JWT" } };
      },
    },
  };
}
globalThis.__fakeCreateClient = (_url, key) => fakeClient(key);
// user_roles comes from world.roles.
const baseFrom = fakeClient;
globalThis.__fakeCreateClient = (_url, key) => {
  const c = baseFrom(key);
  const from = c.from;
  c.from = (table) => {
    if (table === "user_roles") world.tables.user_roles = Object.entries(world.roles).flatMap(([u, rs]) => rs.map((role) => ({ user_id: u, role })));
    return from(table);
  };
  return c;
};

// The scripted model: a reply per job, keyed by the system prompt.
const MODEL = {
  report: { summary: "The class practised the past simple.", objectives: [], chronology: [], engagement: [], misconceptions: [], interventions: [],
    general_understanding: "", next_steps: [], materials: [{ name: "Book 2", pages: "14" }], homework: "Page 15", title_coverage: { covered: true, evidence: [], note: "" } },
  students: { students: [
    { name: "Kiki", cefr_estimate: "A2", confidence: 0.7, errors: [ERR1], highlights: [], contribution: "Told us about her weekend.", teacher_feedback: "Great story!", recommendation: "Practise -ed", evidence: "Past forms with help" },
    { name: "Bao", cefr_estimate: "A1", confidence: 0.5, errors: [ERR2], highlights: [], contribution: "Answered once.", teacher_feedback: "Good try", recommendation: "Irregular verbs", evidence: "Short answers" },
    { name: "An", cefr_estimate: "A1", confidence: 0.4, errors: [], highlights: [], contribution: "", teacher_feedback: "", recommendation: "", evidence: "" },
  ] },
  awards: { awards: [{ student_name: "Kiki", points: 5, quote: "Five stars Kiki!", reason: "great answer" }, { student_name: "Bao", points: 2, quote: "Two points Bao", reason: null }] },
  diarize: { utterances: [{ speaker: "Teacher", text: "Who went to the park?" }, { speaker: "Kiki", text: "I go to the park yesterday with my brother." }, { speaker: "Bao", text: "Me too I goed to school today." }] },
};
globalThis.fetch = async (url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : {};
  world.vendor.push({ url: String(url), body });
  const sys = String(body.messages?.[0]?.content ?? "");
  const reply = /segment a raw classroom/.test(sys) ? MODEL.diarize : /post-lesson report/.test(sys) ? MODEL.report
    : /ESL assessment specialist/.test(sys) ? MODEL.students : /POINT AWARDS/.test(sys) ? MODEL.awards : {};
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY, OPENAI_API_KEY: "k-openai" };
let captured = null;
globalThis.__capture = (h) => { captured = h; };
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
let pendingWork = [];
globalThis.EdgeRuntime = { waitUntil: (p) => { pendingWork.push(p); } };

let seq = 0;
async function loadFn() {
  const name = "analyze-transcript";
  const out = await build({
    entryPoints: [resolve(repo, "supabase", "functions", name, "index.ts")],
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{ name: "remote", setup(b) {
      b.onResolve({ filter: /^(https?:\/\/|npm:|jsr:)/ }, (a) => ({ path: a.path, namespace: "remote" }));
      b.onLoad({ filter: /.*/, namespace: "remote" }, () => ({ loader: "js",
        contents: `export const createClient = (...a) => globalThis.__fakeCreateClient(...a); export const serve = (h) => globalThis.__capture(h); export default {};` }));
    } }],
  });
  const p = resolve(tmpdir(), `transcript-drafts.${process.pid}.${seq++}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}
const quiet = { log: console.log, warn: console.warn, error: console.error };
async function call(handler, { token, body }) {
  world.log = []; world.vendor = [];
  const headers = { "content-type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request("https://example.supabase.co/functions/v1/analyze-transcript", { method: "POST", headers, body: JSON.stringify(body ?? {}) }));
    await Promise.all(pendingWork.splice(0));
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, vendor: world.vendor.slice(), writes: world.log.filter((e) => e.op && e.op !== "select").map((e) => `${e.op}:${e.table}`) };
  } finally { Object.assign(console, quiet); }
}

// The world the function sees: the same class and children as the database above.
const T_PASTE = randomUUID(), T_AUDIO = randomUUID(), T_ROOM = randomUUID(), T_APPROVED = randomUUID();
const PASTE = [
  "Teacher: Good morning everyone. What did you do yesterday?",
  "Kiki: I go to the park yesterday with my brother.",
  "Kiki: It was very fun and sunny and we played football.",
  "Bao: Me too I goed to school and then I played games.",
  "An: I like it very much teacher it was a good day.",
  "Teacher: Five stars Kiki! Great answer. Two points Bao.",
].join("\n");
function resetWorld() {
  world.roles = { [TEA]: ["teacher"], [TEB]: ["teacher"], [ADMIN]: ["admin"], [PARENT]: ["family"], [KID]: ["student"], [NOROLE]: [] };
  world.teacherOf = { [TEA]: [CA], [TEB]: [CB] };
  const tr = (id, extra) => ({ id, class_id: CA, uploaded_by: TEA, transcript_date: "2026-11-16", title: "Past simple", lesson_context: null,
    status: "processing", source_format: "paste", raw_text: PASTE, overview_draft: null, ...extra });
  world.tables = {
    class_transcripts: [tr(T_PASTE), tr(T_AUDIO, { source_format: "audio" }), tr(T_ROOM, { raw_text: "who went to the park kiki i go to the park yesterday bao me too i goed to school" }), tr(T_APPROVED)],
    transcript_approvals: [{ transcript_id: T_APPROVED, withdrawn_at: null }],
    students: [{ id: KIKI, full_name: "Kiki" }, { id: BAO_T, full_name: "Bao Tran" }, { id: BAO_N, full_name: "Bao Ngoc" }, { id: ANH, full_name: "Anh" }],
    enrollments: [KIKI, BAO_T, BAO_N, ANH].map((s) => ({ student_id: s, class_id: CA, end_date: null })),
    teachers: [{ id: tA, full_name: "Ms Lan" }],
    sessions: [{ id: randomUUID(), class_id: CA, teacher_id: tA, date: "2026-11-16" }],
    class_speaker_aliases: [], classes: [{ id: CA, name: "Class A" }], cefr_assessments: [], lesson_overviews: [], attendance: [],
    transcript_speaker_metrics: [], transcript_speaker_suggestions: [], transcript_point_suggestions: [],
  };
}
const PUBLISHED = ["student_error_log", "srs_cards", "cefr_assessments", "lesson_overviews", "student_learning_profiles"];
const fn = await loadFn();
ok("the real analyze-transcript loads and registers a handler", typeof fn === "function");

{
  resetWorld();
  for (const [label, token, status] of [["no Authorization header", null, 401], ["the public (anon) key", ANON_KEY, 401], ["an account with no role", tokenOf(NOROLE), 403],
    ["a family login", tokenOf(PARENT), 403], ["a child's login", tokenOf(KID), 403]]) {
    const r = await call(fn, { token, body: { transcript_id: T_PASTE } });
    ok(`${label}: ${status}, no model call, nothing read or written`, r.status === status && r.vendor.length === 0 && world.log.filter((e) => e.table && e.table !== "user_roles").length === 0, r);
  }
  const other = await call(fn, { token: tokenOf(TEB), body: { transcript_id: T_PASTE } });
  ok("a teacher of another class: 403, no model call", other.status === 403 && other.vendor.length === 0, other);
  const appr = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_APPROVED } });
  ok("an approved lesson: 409 (withdraw first), no model call, nothing written", appr.status === 409 && appr.vendor.length === 0 && appr.writes.length === 0, appr);
}
{
  resetWorld();
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_PASTE } });
  ok("the class's teacher: analysed (200)", r.status === 200 && r.json?.success === true, r);
  ok("  the model was asked (vendor calls made)", r.vendor.length >= 3, r.vendor.length);
  eq("  NOTHING was written to a table a child or family reads", r.writes.filter((w) => PUBLISHED.some((t) => w.endsWith(`:${t}`))), []);
  const metrics = world.tables.transcript_speaker_metrics;
  eq("  every metric row is unlinked (student_id null)", metrics.map((m) => m.student_id), metrics.map(() => null));
  const sug = Object.fromEntries(world.tables.transcript_speaker_suggestions.map((s) => [metrics.find((m) => m.id === s.metric_id)?.speaker_label, s]));
  eq("  suggestions: Kiki high (exact name, from the text); Bao low (two Baos: a tie); An low (no match)",
    [[sug.Kiki?.confidence, sug.Kiki?.suggested_student_id], [sug.Bao?.confidence, sug.Bao?.suggested_student_id], [sug.An?.confidence, sug.An?.suggested_student_id]],
    [["high", KIKI], ["low", null], ["low", null]]);
  eq("  no suggestion row for the teacher's speech", Object.keys(sug).includes("Teacher"), false);
  eq("  the drafted errors and CEFR estimate are held on the suggestion", [sug.Kiki?.draft_errors?.length, sug.Kiki?.cefr_estimate, sug.Bao?.draft_errors?.length], [1, "A2", 1]);
  const pts = world.tables.transcript_point_suggestions;
  eq("  point awards: Kiki's names Kiki (a model-extracted name, medium at most); Bao's names nobody (low)",
    pts.map((p) => [p.speaker_label, p.student_id]).sort(), [["Bao", null], ["Kiki", KIKI]]);
  const tr = world.tables.class_transcripts.find((t) => t.id === T_PASTE);
  eq("  the overview is a DRAFT on the transcript row", [tr.status, tr.overview_draft?.summary, tr.overview_draft?.homework, tr.analysis?.drafted_for_review], ["analyzed", "The class practised the past simple.", "Page 15", true]);
  eq("  the response says it needs a teacher's approval", [r.json?.needs_approval, r.json?.suggested_students, r.json?.errors_drafted], [true, 1, 2]);

  // Into the real schema: the drafts, as written, then the teacher's approval.
  const T = (await one(`INSERT INTO public.class_transcripts (id, class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, overview_draft, analyzed_at)
                        VALUES ($1,$2,$3,$4,$5,'x','analyzed',$6,$7::jsonb,$8::jsonb, now()) RETURNING id`,
    [T_PASTE, CA, TEA, tr.title, tr.transcript_date, tr.summary, JSON.stringify(tr.analysis), JSON.stringify(tr.overview_draft)])).id;
  let loadErr = null;
  // Every column the function sent must exist (an unknown key is an error
  // here, not silently dropped); created_at is the table's default.
  const loadRows = async (table, list) => {
    const known = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table])).map((c) => c.column_name);
    for (const raw of list) {
      // The stand-in gives every inserted row an id; a table keyed otherwise has none.
      const row = { ...raw };
      if (!known.includes("id")) delete row.id;
      const unknown = Object.keys(row).filter((k) => !known.includes(k));
      if (unknown.length) { loadErr = `${table}: the function wrote columns the table does not have: ${unknown.join(", ")}`; continue; }
      const r2 = await as(null, `INSERT INTO public.${table} SELECT * FROM jsonb_populate_record(NULL::public.${table}, $1::jsonb)`,
        [JSON.stringify({ created_at: new Date().toISOString(), ...row })], { role: "service_role", keep: true });
      if (r2.err) loadErr = `${table}: ${r2.err}`;
    }
  };
  await loadRows("transcript_speaker_metrics", metrics);
  await loadRows("transcript_speaker_suggestions", world.tables.transcript_speaker_suggestions);
  ok("the rows the function wrote fit the migration's columns and CHECKs, as the service role, through the link guard", loadErr === null, loadErr);
  // What the screen sends: its own pre-selection (tested in part 3) - Kiki only.
  const review = await loadReview();
  const mRows = (await q(`SELECT id, speaker_label, is_teacher, student_id, cefr_estimate FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [T]));
  const sRows = (await q(`SELECT metric_id, suggested_student_id, confidence, draft_errors, cefr_estimate FROM public.transcript_speaker_suggestions WHERE transcript_id = $1`, [T]));
  const choices = review.initialChoices(mRows, sRows);
  const payload = review.buildAssignments(mRows, sRows, choices);
  const a = await approve(TEA, T, payload);
  ok("the teacher approves what the screen pre-selected", a.err === null, a);
  eq("  Kiki: her error and level are published", [await count(KID, "student_error_log", "source_id = $1", [T]), await count(PARENT, "cefr_assessments", "source_id = $1", [T])], [1, 1]);
  eq("  the LOW suggestions landed on no child: no row for either Bao or Anh from this lesson",
    (await one(`SELECT (SELECT count(*)::int FROM public.student_error_log WHERE source_id = $1 AND student_id <> $2)
                     + (SELECT count(*)::int FROM public.cefr_assessments WHERE source_id = $1 AND student_id <> $2)
                     + (SELECT count(*)::int FROM public.transcript_speaker_metrics WHERE transcript_id = $1 AND student_id IS NOT NULL AND student_id <> $2) AS n`, [T, KIKI])).n, 0);
}
{
  resetWorld();
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_AUDIO } });
  const sug = world.tables.transcript_speaker_suggestions.map((s) => [world.tables.transcript_speaker_metrics.find((m) => m.id === s.metric_id)?.speaker_label, s.confidence, s.labels_from_model]);
  ok("a recording's transcript (labels made by the diarizing model): analysed", r.status === 200, r);
  eq("  the exact name match is only MEDIUM, and marked as a model-made label", sug.find((x) => x[0] === "Kiki"), ["Kiki", "medium", true]);
}
{
  resetWorld();
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_ROOM, background: true } });
  ok("an unlabelled room transcript, queued in the background: 200 queued", r.status === 200 && r.json?.queued === true, r);
  ok("  the diarizing model was asked to attribute speakers", r.vendor.some((v) => /segment a raw classroom/.test(String(v.body?.messages?.[0]?.content ?? ""))));
  const sug = world.tables.transcript_speaker_suggestions.map((s) => [world.tables.transcript_speaker_metrics.find((m) => m.id === s.metric_id)?.speaker_label, s.confidence, s.suggested_student_id]);
  eq("  its attribution is a suggestion: Kiki medium, Bao low (no child)", sug.sort(), [["Bao", "low", null], ["Kiki", "medium", KIKI]].sort());
  eq("  and nothing was published", r.writes.filter((w) => PUBLISHED.some((t) => w.endsWith(`:${t}`))), []);
}
{
  resetWorld();
  const r = await call(fn, { token: SERVICE_KEY, body: { transcript_id: T_PASTE } });
  ok("transcribe-lesson-audio's hand-off (service-role key) still runs", r.status === 200 && r.json?.success === true, r);
}
{
  resetWorld();
  const src = readFileSync(resolve(repo, "supabase", "functions", "analyze-transcript", "index.ts"), "utf8");
  ok("the function writes none of the published tables (source)", !/from\("(student_error_log|srs_cards|cefr_assessments)"\)\s*\.(insert|upsert|update|delete)/.test(src)
    && !/from\("lesson_overviews"\)\s*\.(insert|upsert|update|delete)/.test(src) && !/fireProfileRefresh/.test(src));
}

// =================================================================== part 3

console.log("=== the screen's reasoning (src/lib/transcriptReview.ts) ===");
{
  const r = await loadReview();
  const metrics = [
    { id: "m1", speaker_label: "Kiki", is_teacher: false, student_id: null },
    { id: "m2", speaker_label: "Bao", is_teacher: false, student_id: null },
    { id: "m3", speaker_label: "Teacher", is_teacher: true, student_id: null },
    { id: "m4", speaker_label: "Unknown", is_teacher: false, student_id: null },
    { id: "m5", speaker_label: "Anna", is_teacher: false, student_id: null },
  ];
  const sugg = [
    { metric_id: "m1", suggested_student_id: "kiki", confidence: "high", draft_errors: [ERR1], cefr_estimate: "A2" },
    { metric_id: "m2", suggested_student_id: null, confidence: "low", draft_errors: [ERR2], cefr_estimate: "A1" },
    // A low row that (wrongly) still named a child: the screen must not use it either.
    { metric_id: "m5", suggested_student_id: "anna", confidence: "low", draft_errors: [], cefr_estimate: null },
  ];
  const c = r.initialChoices(metrics, sugg);
  eq("high is pre-selected; low starts unknown, even when a low row names someone; teacher and Unknown are not offered",
    Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.studentId])), { m1: "kiki", m2: null, m5: null });
  eq("medium is pre-selected too", r.initialChoices([metrics[0]], [{ ...sugg[0], confidence: "medium" }]).m1.studentId, "kiki");
  const p = r.buildAssignments(metrics, sugg, c);
  eq("the payload: only the teacher's choices; an unknown speaker carries no errors or level",
    p, [{ metric_id: "m1", student_id: "kiki", cefr_level: "A2", errors: [ERR1] }, { metric_id: "m2", student_id: null }, { metric_id: "m5", student_id: null }]);
  c.m1.keepErrors = [false]; c.m1.cefrLevel = "Z9";
  eq("a dropped error and an invalid level are not sent", r.buildAssignments(metrics, sugg, c)[0], { metric_id: "m1", student_id: "kiki", cefr_level: null, errors: [] });
  eq("an approved lesson starts from what was approved", r.initialChoices([{ ...metrics[1], student_id: "baoT", cefr_estimate: "A1" }], sugg).m2, { studentId: "baoT", cefrLevel: "A1", keepErrors: [true] });
  eq("review states", [r.reviewState({ status: "analyzed", analysis: { drafted_for_review: true } }, null), r.reviewState({ status: "analyzed", analysis: {} }, null),
    r.reviewState({ status: "analyzed" }, { withdrawn_at: null }), r.reviewState({ status: "analyzed", analysis: { drafted_for_review: true } }, { withdrawn_at: "x" }),
    r.reviewState({ status: "processing" }, null)], ["draft", "legacy", "approved", "withdrawn", "processing"]);
  eq("the legacy refusal is recognised by its hint", [r.isLegacyRefusal({ hint: "TRANSCRIPT_LEGACY_ROWS" }), r.isLegacyRefusal({ message: "other" })], [true, false]);
}

console.log("=== the suggestion rule (_lib/speaker-suggestion.ts) ===");
{
  const s = await loadTs("supabase/functions/_lib/speaker-suggestion.ts");
  const roster = [{ id: "kiki", full_name: "Kiki" }, { id: "baoT", full_name: "Bao Tran" }, { id: "baoN", full_name: "Bao Ngoc" }, { id: "anna", full_name: "Anna Lê" }, { id: "minh", full_name: "Minh Đức" }];
  const none = new Map();
  const t = (label, fromModel = false, aliases = none) => { const x = s.suggestSpeaker(label, roster, aliases, fromModel); return [x.confidence, x.studentId]; };
  eq("exact name from the text: high", t("Kiki"), ["high", "kiki"]);
  eq("exact name from the model: medium", t("Kiki", true), ["medium", "kiki"]);
  eq("diacritics and case do not matter", t("ANNA LE"), ["high", "anna"]);
  eq("a unique whole-word contains ('Anna' / 'Anna Lê'): medium", t("Anna"), ["medium", "anna"]);
  eq("a tie ('Bao' / two Baos): low, no child", t("Bao"), ["low", null]);
  eq("a scrap of a name ('An'): low, no child", t("An"), ["low", null]);
  eq("a unique token match from the text ('Duc Minh'): medium", t("Duc Minh"), ["medium", "minh"]);
  eq("the same from the model: low, no child", t("Duc Minh", true), ["low", null]);
  eq("no match: low, no child", t("Zed"), ["low", null]);
  eq("Unknown and Teacher: low, no child", [t("Unknown"), t("Teacher")], [["low", null], ["low", null]]);
  eq("a teacher's saved choice for the label: high, even from the model", t("Kiwi", true, new Map([["kiwi", "kiki"]])), ["high", "kiki"]);
  eq("a saved choice for a child no longer in the class is ignored", t("Kiwi", false, new Map([["kiwi", "gone"]])), ["low", null]);
  ok("every low answer names no child", ["Bao", "An", "Zed", "Unknown", "Duc Minh"].every((l) => s.suggestSpeaker(l, roster, none, true).confidence !== "low" || s.suggestSpeaker(l, roster, none, true).studentId === null));
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
