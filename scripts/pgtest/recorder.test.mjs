// Class recorder: who may record a class, who may hear it, and what the
// database refuses whatever the page sends.
//
// Drives supabase/migrations/20261112100000_class_recorder.sql against an
// in-process Postgres, after 20260717090000 (the EXISTING bucket
// `class-recordings` and its policy "staff_manage_class_recordings", which
// lets every teacher read, write and delete in it - as the live database has
// them, C1 critic 2 N1) and 20261111110000 (the real is_teacher_of_class,
// which says yes to teaching assistants - so the suite can show the recorder
// does not use it).
//
// The assertions that matter most:
//   - the switch is OFF until an admin confirms consent under the CURRENT
//     wording, child by child, and a recording cannot be created while it is
//     off, by anyone, including the service role;
//   - a different teacher, a teaching assistant, a parent and a student read
//     nothing: not a row, not a file; a cover teacher reads only the lesson
//     they covered, and nothing from a future assignment;
//   - the evidence D reads rests on what the server saw (C1 critic F1): a
//     1-byte "90 minutes" is refused, and a short recording does not count;
//   - capture runs only from 5 minutes before the lesson to the end + grace;
//   - the audit log cannot be changed;
//   - a chunk registered twice is one chunk, and never overwritten;
//   - the storage checks fail CLOSED when storage cannot be seen.
//
// Time: a chunk's position must fit the server's clock, so the suite moves a
// recording's server timestamps into the past (`travel`, with triggers off,
// as the superuser) instead of waiting.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const MIGS = process.argv.slice(2);
const PIPE_MIG = MIGS.find((f) => f.includes("20260717090000"));
const TA_MIG = MIGS.find((f) => f.includes("20261111110000"));
const REC_MIG = MIGS.find((f) => f.includes("class_recorder"));
if (!PIPE_MIG || !TA_MIG || !REC_MIG) {
  console.log("usage: recorder.test.mjs <20260717090000_...> <20261111110000_...> <20261112100000_class_recorder.sql>");
  console.log("0 passed, 1 failed");
  process.exit(1);
}
// The recorder's own bucket. Teacher Transcripts' bucket is OLD_BUCKET.
const BUCKET = "class-recorder-audio";
const OLD_BUCKET = "class-recordings";
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
  -- As Supabase has it: anon too holds table privileges on storage.objects;
  -- only the policies decide.
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
  -- What 20260717090000 alters (Teacher Transcripts).
  CREATE TABLE public.class_transcripts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), raw_text text,
    source_format text, CONSTRAINT class_transcripts_source_format_check CHECK (source_format IN ('vtt','srt','txt','paste')));
  -- As production has them (20260712023825): the other buckets' policies read these.
  GRANT SELECT ON public.teachers, public.teaching_assistants, public.classes, public.sessions,
    public.homeworks, public.session_participants, public.students, public.enrollments TO authenticated;
`;

const db = new PGlite();
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
await db.exec(PRELUDE);
// The live database has Teacher Transcripts' bucket and its policy.
await db.exec(readFileSync(PIPE_MIG, "utf8"));
const oldBucketState = async () => ({
  bucket: (await db.query(`SELECT row_to_json(b)::text j FROM storage.buckets b WHERE id = $1`, [OLD_BUCKET])).rows.map((r) => r.j),
  policies: (await db.query(
    `SELECT policyname, permissive, roles::text, cmd, qual, with_check FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND (policyname = 'staff_manage_class_recordings' OR concat_ws(' ', qual, with_check) LIKE '%' || $1 || '''%')
      ORDER BY policyname`, [OLD_BUCKET])).rows,
});
const OLD_BEFORE = await oldBucketState();
await db.exec(readFileSync(TA_MIG, "utf8"));
// 20260719014455 grants this back to signed-in users in production.
await db.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
await db.exec(readFileSync(REC_MIG, "utf8"));
ok("applies", true);
{
  let again = null;
  try { await db.exec(readFileSync(REC_MIG, "utf8")); } catch (e) { again = e.message; }
  ok("and applies a second time unchanged", again === null, again ?? "");
}

console.log("=== the recorder's own bucket; Teacher Transcripts' is untouched (C1 critic 2, N1) ===");
ok("the old bucket and its policy were there before (the suite sees what live has)",
  OLD_BEFORE.bucket.length === 1 && OLD_BEFORE.policies.length === 1 && OLD_BEFORE.policies[0].cmd === "ALL");
eq("after two applies, `class-recordings` and every policy that names it are byte-identical", await oldBucketState(), OLD_BEFORE);
eq("the old bucket still takes Teacher Transcripts' 50 MB mp3/m4a/mp4", (await one(
  `SELECT file_size_limit::int l, 'audio/mpeg' = ANY (allowed_mime_types) AND 'video/mp4' = ANY (allowed_mime_types) t
     FROM storage.buckets WHERE id = $1`, [OLD_BUCKET])), { l: 52428800, t: true });
eq("the recorder's bucket is its own: private, 8 MB, webm/flac/wav/json", (await one(
  `SELECT name, public, file_size_limit::int l, allowed_mime_types t FROM storage.buckets WHERE id = $1`, [BUCKET])),
  { name: BUCKET, public: false, l: 8388608, t: ["audio/webm", "audio/flac", "audio/x-flac", "audio/wav", "audio/x-wav", "application/json"] });
eq("exactly two policies reach the recorder's bucket, both its own", (await q(
  `SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
     AND concat_ws(' ', qual, with_check) LIKE '%' || $1 || '%' ORDER BY 1`, [BUCKET])),
  [{ policyname: "class_recorder_audio_insert", cmd: "INSERT" }, { policyname: "class_recorder_audio_select", cmd: "SELECT" }]);
eq("no recorder SQL names the old bucket in code (only comments may)", (await one(
  `SELECT count(*)::int n FROM pg_proc WHERE proname LIKE 'recorder%' AND prosrc LIKE '%' || $1 || '''%'`, [OLD_BUCKET])).n, 0);
{
  // The preflight: each of these refuses the whole file before anything lands.
  const paste = async () => {
    try { await db.exec(readFileSync(REC_MIG, "utf8")); return null; }
    catch (e) { try { await db.exec("ROLLBACK"); } catch { /* not in a transaction */ } return e.message; }
  };
  await db.exec(`CREATE POLICY probe_everything ON storage.objects FOR SELECT TO authenticated USING (true)`);
  refused("preflight: a storage policy not scoped by bucket_id (it would reach every bucket) refuses the install",
    await paste(), /Refusing to install the class recorder: storage policies that could reach its bucket: probe_everything/);
  await db.exec(`DROP POLICY probe_everything ON storage.objects`);
  await db.exec(`CREATE POLICY probe_named ON storage.objects FOR ALL TO authenticated
                   USING (bucket_id = '${BUCKET}' AND public.has_role(auth.uid(), 'teacher'))`);
  refused("preflight: someone else's policy on the recorder's bucket refuses the install", await paste(), /could reach its bucket: probe_named/);
  await db.exec(`DROP POLICY probe_named ON storage.objects`);
  await db.exec(`CREATE POLICY probe_narrow ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (owner = auth.uid())`);
  eq("preflight: a RESTRICTIVE policy only narrows access, so it is no reason to refuse", await paste(), null);
  await db.exec(`DROP POLICY probe_narrow ON storage.objects`);
  await db.exec(`UPDATE storage.buckets SET public = true WHERE id = '${BUCKET}'`);
  refused("preflight: the recorder's bucket existing with other settings (public) refuses the install", await paste(),
    /a bucket "class-recorder-audio" already exists with other settings/);
  await db.exec(`UPDATE storage.buckets SET public = false, file_size_limit = 52428800 WHERE id = '${BUCKET}'`);
  refused("preflight: so does another size limit", await paste(), /already exists with other settings/);
  await db.exec(`UPDATE storage.buckets SET file_size_limit = 8388608 WHERE id = '${BUCKET}'`);
  await db.exec(`ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY`);
  refused("preflight: storage.objects without row level security refuses the install", await paste(), /row level security is not enabled/);
  await db.exec(`ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`);
  eq("with all of that put back it pastes again", await paste(), null);
  eq("and the old bucket is still byte-identical", await oldBucketState(), OLD_BEFORE);
}

const U =(n) => `${String(n).repeat(8)}-0000-0000-0000-000000000000`;
const ADMIN = U(1), T1 = U(2), T2 = U(3), TA = U(4), PARENT = U(5), STUDENT = U(6);
await q(`INSERT INTO auth.users (id) VALUES ($1),($2),($3),($4),($5),($6)`, [ADMIN, T1, T2, TA, PARENT, STUDENT]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher'),($4,'teacher'),($5,'family'),($6,'student')`,
  [ADMIN, T1, T2, TA, PARENT, STUDENT]);
const t1 = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [T1])).id;
const t2 = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [T2])).id;
const ta = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [TA])).id;
const C1 = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Kindy A', $1) RETURNING id`, [t1])).id;
const C2 = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Kindy B', $1) RETURNING id`, [t2])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [C1, ta]);
const kid = async (name, cls) => {
  const id = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [name])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [id, cls]);
  return id;
};
const k1 = await kid("Minh", C1), k2 = await kid("An", C1), k3 = await kid("Lan", C2);

// A lesson that is running now, in Hanoi wall-clock time like the real table.
const NOW_SESSION = `
  WITH n AS (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AS lt)
  INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time, status)
  SELECT $1, $2, (lt::date + $3::int),
         CASE WHEN lt::time < time '00:05' THEN time '00:00' ELSE lt::time - interval '5 minutes' END,
         CASE WHEN lt::time > time '22:25' THEN time '23:59:59' ELSE lt::time + interval '90 minutes' END,
         $4::public.session_status
  FROM n RETURNING id`;
const sess = async (cls, teacher, dayOffset = 0, status = "Scheduled") =>
  (await one(NOW_SESSION, [cls, teacher, dayOffset, status])).id;
// A lesson from `a` to `b` minutes from now (Hanoi wall-clock).
const sessAt = async (cls, teacher, a, b) => (await one(`
  WITH n AS (SELECT (now() + make_interval(mins => $3::int)) AT TIME ZONE 'Asia/Ho_Chi_Minh' AS s,
                    (now() + make_interval(mins => $4::int)) AT TIME ZONE 'Asia/Ho_Chi_Minh' AS e)
  INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time)
  SELECT $1, $2, s::date, s::time, e::time FROM n RETURNING id`, [cls, teacher, a, b])).id;
const s1 = await sess(C1, t1), s1b = await sess(C1, t1), s1c = await sess(C1, t1), s1d = await sess(C1, t1);
const s2 = await sess(C2, t2);
const sTomorrow = await sess(C1, t1, 1), sYesterday = await sess(C1, t1, -1);
const sCancelled = await sess(C1, t1, 0, "Canceled");

async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; }
  catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, fn, role) => { try { await as(uid, fn, role); return null; } catch (e) { return e.message; } };
const rowsAs = async (uid, s, p, role) => (await as(uid, () => db.query(s, p), role)).rows;
const arm = (uid, session, extra = {}) => as(uid, async () => (await db.query(
  `INSERT INTO public.class_recordings (session_id, class_id, started_by, status, format, chunk_ms, max_duration_ms, session_date,
                                         scheduled_start, scheduled_end, delete_after, device_profile_id)
   VALUES ($1, $2, $3, $4, $5, $6, 1, '2000-01-01', now(), now() + interval '1 hour', now(), $7)
   RETURNING *`,
  [session, extra.class_id ?? C1, extra.started_by ?? uid, extra.status ?? "armed",
   extra.format ?? "opus-webm", extra.chunk_ms ?? 30000, extra.device_profile_id ?? null])).rows[0]);
const tryArm = async (uid, session, role) => {
  try {
    if (role) {
      await as(uid, () => db.query(
        `INSERT INTO public.class_recordings (session_id, class_id, started_by, format, max_duration_ms, session_date,
                                               scheduled_start, scheduled_end, delete_after)
         VALUES ($1, $2, $3, 'opus-webm', 1, '2000-01-01', now(), now() + interval '1 hour', now())`,
        [session, C1, T1]), role);
    } else await arm(uid, session);
    return null;
  } catch (e) { return e.message; }
};
const setSwitch = (uid, cls, on, version = "v1-2026-11", note = "paper forms, office folder B") =>
  tryAs(uid, () => db.query(`SELECT public.recorder_set_class_recording($1,$2,$3,$4)`, [cls, on, version, note]));
const consent = (uid, student, status = "granted", note = "signed form, 3 Nov") =>
  tryAs(uid, () => db.query(`SELECT public.recorder_record_child_consent($1,$2,$3)`, [student, status, note]));
const SHA = (c) => String(c).repeat(64);
// Move a recording's server-side timestamps `mins` minutes into the past, as
// if that much time had gone by. With `all`, its lesson and window move too.
const travel = async (id, mins, all = false) => {
  const iv = `${mins} minutes`;
  await db.exec(`SET session_replication_role = replica`);
  try {
    await q(`UPDATE public.class_recordings SET armed_at = armed_at - $2::interval, created_at = created_at - $2::interval,
               started_at = started_at - $2::interval, ended_at = ended_at - $2::interval,
               stop_requested_at = stop_requested_at - $2::interval
               ${all ? `, scheduled_start = scheduled_start - $2::interval, scheduled_end = scheduled_end - $2::interval,
                        capture_opens_at = capture_opens_at - $2::interval, capture_closes_at = capture_closes_at - $2::interval,
                        delete_after = delete_after - $2::interval` : ""}
             WHERE id = $1`, [id, iv]);
    await q(`UPDATE public.class_recording_chunks SET registered_at = registered_at - $2::interval,
               confirmed_at = confirmed_at - $2::interval WHERE recording_id = $1`, [id, iv]);
  } finally { await db.exec(`SET session_replication_role = DEFAULT`); }
};
// As the superuser, triggers off: for setting up states the API cannot reach.
const raw = async (s, p) => {
  await db.exec(`SET session_replication_role = replica`);
  try { return await q(s, p); } finally { await db.exec(`SET session_replication_role = DEFAULT`); }
};

console.log("=== the switch is off until an admin confirms consent ===");
eq("the switch column defaults to false", (await one(
  `SELECT column_default FROM information_schema.columns
    WHERE table_name='class_recording_settings' AND column_name='recording_enabled'`)).column_default, "false");
eq("no class has a switch row to begin with", (await one(`SELECT count(*)::int n FROM public.class_recording_settings`)).n, 0);
refused("with no row at all the class teacher cannot record", await tryArm(T1, s1), /switched off/);
refused("nor can an admin", await tryArm(ADMIN, s1), /switched off/);
await as(null, () => db.query(`INSERT INTO public.class_recording_settings (class_id) VALUES ($1)`, [C2]), "service_role");
eq("a row made without saying so is OFF", (await one(
  `SELECT recording_enabled FROM public.class_recording_settings WHERE class_id=$1`, [C2])).recording_enabled, false);
refused("even the service role cannot set ON without the consent confirmation",
  await tryAs(null, () => db.query(`UPDATE public.class_recording_settings SET recording_enabled = true WHERE class_id=$1`, [C2]), "service_role"),
  /class_recording_on_needs_consent/);
refused("an admin cannot write the switch table directly",
  await tryAs(ADMIN, () => db.query(`UPDATE public.class_recording_settings SET recording_enabled = true WHERE class_id=$1`, [C2])),
  /permission denied/);
refused("nor insert into it",
  await tryAs(ADMIN, () => db.query(
    `INSERT INTO public.class_recording_settings (class_id, recording_enabled, consent_confirmed_by, consent_confirmed_at, consent_wording_version, consent_note)
     VALUES ($1, true, $2, now(), 'v1-2026-11', 'x')`, [C1, ADMIN])),
  /permission denied/);

refused("a teacher cannot switch recording on", await setSwitch(T1, C1, true), /Only an admin can switch recording on/);
refused("a parent cannot", await setSwitch(PARENT, C1, true), /Only an admin/);
refused("the wording version must be the current one", await setSwitch(ADMIN, C1, true, "v0-old"), /current consent wording/);
refused("where the consent is held must be said", await setSwitch(ADMIN, C1, true, "v1-2026-11", "  "), /where the signed parental consent is held/);
refused("it stays off while children have no consent on record", await setSwitch(ADMIN, C1, true), /2 enrolled child/);
refused("a teacher cannot record a child's consent", await consent(T1, k1), /Only an admin/);
refused("consent needs a note", await consent(ADMIN, k1, "granted", " "), /how the parents answered/);
eq("an admin records one child's consent", await consent(ADMIN, k1), null);
refused("one child still without consent keeps it off", await setSwitch(ADMIN, C1, true), /1 enrolled child/);
eq("the class teacher is told how many are missing, as a number",
  (await rowsAs(T1, `SELECT public.recorder_class_missing_consent($1) n`, [C1]))[0].n, 1);
refused("another teacher is not told", await tryAs(T2, () => db.query(`SELECT public.recorder_class_missing_consent($1)`, [C1])), /Not your class/);
eq("the second child's consent", await consent(ADMIN, k2), null);
eq("now an admin can switch it on", await setSwitch(ADMIN, C1, true), null);
{
  const r = await one(`SELECT recording_enabled, consent_confirmed_by, consent_confirmed_at IS NOT NULL AS at_set,
                              consent_wording_version, consent_note FROM public.class_recording_settings WHERE class_id=$1`, [C1]);
  eq("the row says who confirmed, when, under which wording and where it is held", r,
    { recording_enabled: true, consent_confirmed_by: ADMIN, at_set: true, consent_wording_version: "v1-2026-11", consent_note: "paper forms, office folder B" });
}

console.log("=== who can record, and which lesson ===");
ok("a standing TA passes is_teacher_of_class (so that helper cannot be the gate)",
  (await one(`SELECT public.is_teacher_of_class($1,$2) c`, [TA, C1])).c === true);
ok("and fails the recorder's own check", (await one(`SELECT public.recorder_is_class_teacher($1,$2) c`, [TA, C1])).c === false);
ok("a teacher of another class fails it", (await one(`SELECT public.recorder_is_class_teacher($1,$2) c`, [T2, C1])).c === false);
ok("the class teacher passes it", (await one(`SELECT public.recorder_is_class_teacher($1,$2) c`, [T1, C1])).c === true);
ok("another class's switch is still off", /switched off/.test(await tryArm(T2, s2) ?? ""));
refused("a teacher of another class cannot record this one", await tryArm(T2, s1), /Only a teacher of this class|row-level security/);
refused("a teaching assistant cannot", await tryArm(TA, s1), /Only a teacher of this class|row-level security/);
refused("a parent cannot", await tryArm(PARENT, s1), /Only a teacher of this class|row-level security/);
refused("a student cannot", await tryArm(STUDENT, s1), /Only a teacher of this class|row-level security/);
refused("the service role cannot: a recording has a person behind it", await tryArm(null, s1, "service_role"), /never by the system/);
refused("a cancelled lesson cannot be recorded", await tryArm(T1, sCancelled), /cancelled/);
refused("tomorrow's lesson cannot be recorded today", await tryArm(T1, sTomorrow), /Too early/);
refused("yesterday's lesson cannot be recorded", await tryArm(T1, sYesterday), /Too late/);
refused("a recording needs a session", await tryArm(T1, null), /choose the session/);

const rec = await arm(T1, s1, { class_id: C2, status: "complete" });
eq("the class comes from the session and the state is 'armed', whatever the page sent",
  { class_id: rec.class_id, status: rec.status, started_by: rec.started_by, session_date_is_2000: String(rec.session_date).includes("2000"),
    armed_session_id: rec.armed_session_id },
  { class_id: C1, status: "armed", started_by: T1, session_date_is_2000: false, armed_session_id: s1 });
{
  const w = await one(`SELECT extract(epoch FROM (scheduled_start - capture_opens_at))::int AS pre,
                              extract(epoch FROM (capture_closes_at - scheduled_end))::int AS grace,
                              max_duration_ms = floor(extract(epoch FROM (capture_closes_at - capture_opens_at)) * 1000) AS dur,
                              min_bytes_per_sec, clock_tolerance_ms, evidence_min_fraction::text AS f
                       FROM public.class_recordings WHERE id=$1`, [rec.id]);
  eq("the capture window is 5 minutes before the lesson to its end + 10 minutes' grace, server-side (F5)",
    [w.pre, w.grace, w.dur], [300, 600, true]);
  eq("the plausibility floor, tolerance and held fraction are snapshot at arming", [w.min_bytes_per_sec, w.clock_tolerance_ms, w.f], [2000, 15000, "0.50"]);
}
{
  const r = await one(`SELECT round(extract(epoch FROM (delete_after - scheduled_end)) / 86400)::int AS days FROM public.class_recordings WHERE id=$1`, [rec.id]);
  eq("it is due for deletion 30 days after the lesson", r.days, 30);
}
refused("a second live recording of the same lesson is refused", await tryArm(T1, s1), /class_recordings_one_live_per_session|duplicate/);

console.log("=== tracks, chunks, upload ===");
const reg = (uid, r, track, seq, size, sha, t0, t1) => as(uid, async () => (await db.query(
  `SELECT public.recorder_register_chunk($1,$2,$3,$4,$5,$6,$7) AS j`, [r, track, seq, size, sha, t0, t1])).rows[0].j);
const tryReg = async (...a) => { try { await reg(...a); return null; } catch (e) { return e.message; } };
const put = (uid, name, size, role) => tryAs(uid, () => db.query(
  `INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('${BUCKET}', $1, $2, jsonb_build_object('size', $3::bigint))`,
  [name, uid, size]), role);
const confirm = (uid, chunk, sha) => tryAs(uid, () => db.query(`SELECT public.recorder_confirm_chunk($1,$2)`, [chunk, sha]));
const setStatus = (uid, id, status, extra = "", role) => tryAs(uid, () => db.query(
  `UPDATE public.class_recordings SET status = $2 ${extra} WHERE id = $1`, [id, status]), role);
const addTrack = (uid, id, track = "teacher", rate = 48000) => tryAs(uid, () => db.query(
  `INSERT INTO public.class_recording_tracks (recording_id, track, sample_rate) VALUES ($1,$2,$3)`, [id, track, rate]));
// Register, upload and confirm one chunk; returns the chunk row's id.
const chunkUp = async (uid, id, track, seq, size, t0, t1) => {
  const c = await reg(uid, id, track, seq, size, SHA("a"), t0, t1);
  const e1 = await put(uid, c.storage_path, size);
  if (e1) throw new Error(e1);
  const e2 = await confirm(uid, c.chunk_id, SHA("a"));
  if (e2) throw new Error(e2);
  return c;
};
const manifestOf = (r) => `${C1}/${r}/manifest.json`;
const completeRec = (uid, id) => setStatus(uid, id, "complete", `, manifest_path = '${manifestOf(id)}', manifest_sha256 = '${SHA("e")}'`);

refused("audio is not accepted while the recording is only armed", await tryReg(T1, rec.id, "teacher", 0, 64000, SHA("a"), 0, 30000), /armed and takes no more audio/);
refused("a recording cannot jump from armed to complete", await setStatus(T1, rec.id, "complete"), /cannot go from armed to complete/);
eq("armed -> recording", await setStatus(T1, rec.id, "recording", `, client_started_at = now() - interval '3 hours'`), null);
{
  const r = await one(`SELECT started_at >= armed_at AND started_at <= now() AS server_clock,
                              client_started_at < armed_at AS claim_kept FROM public.class_recordings WHERE id=$1`, [rec.id]);
  eq("the start time is the server's; the laptop's claim is kept beside it, as a claim", [r.server_clock, r.claim_kept], [true, true]);
}
await travel(rec.id, 2);
refused("a track must be described first", await tryReg(T1, rec.id, "teacher", 0, 64000, SHA("a"), 0, 30000), /Describe the teacher track/);
eq("the recorder describes both tracks", await tryAs(T1, () => db.query(
  `INSERT INTO public.class_recording_tracks (recording_id, track, device_label, sample_rate) VALUES ($1,'teacher','lapel',48000),($1,'room','S500',48000)`, [rec.id])), null);
refused("a stereo track is refused", await tryAs(T1, () => db.query(
  `UPDATE public.class_recording_tracks SET channel_count = 2 WHERE recording_id=$1 AND track='room'`, [rec.id])), /check/);
refused("a sample rate the bucket's file limit cannot hold is refused (F14)", await tryAs(T1, () => db.query(
  `UPDATE public.class_recording_tracks SET sample_rate = 96000 WHERE recording_id=$1 AND track='room'`, [rec.id])), /check/);
refused("another teacher cannot describe a track on it", await tryAs(T2, () => db.query(
  `UPDATE public.class_recording_tracks SET device_label = 'x' WHERE recording_id=$1 RETURNING 1`, [rec.id])
  .then((r) => { if (r.rows.length === 0) throw new Error("no rows"); })), /no rows/);

const c0 = await reg(T1, rec.id, "teacher", 0, 64000, SHA("a"), 0, 30000);
eq("the database chooses the path", c0.storage_path, `${C1}/${rec.id}/teacher/000000.webm`);
eq("first time it is new", c0.already_registered, false);
const c0again = await reg(T1, rec.id, "teacher", 0, 64000, SHA("a"), 0, 30000);
eq("registering the same chunk again returns the same row", [c0again.chunk_id, c0again.already_registered], [c0.chunk_id, true]);
eq("and there is still one row", (await one(`SELECT count(*)::int n FROM public.class_recording_chunks WHERE recording_id=$1`, [rec.id])).n, 1);
refused("different audio under the same number is refused, not overwritten",
  await tryReg(T1, rec.id, "teacher", 0, 64000, SHA("b"), 0, 30000), /already registered with different audio/);
refused("nor a different span under the same number",
  await tryReg(T1, rec.id, "teacher", 0, 64000, SHA("a"), 0, 29000), /already registered with different audio/);
eq("the first checksum stands", (await one(`SELECT sha256 FROM public.class_recording_chunks WHERE id=$1`, [c0.chunk_id])).sha256, SHA("a"));
refused("audio the server's clock says cannot have been captured yet is refused", await tryReg(T1, rec.id, "teacher", 1, 64000, SHA("c"), 9_000_000, 9_030_000), /server's clock/);
refused("another teacher cannot register a chunk", await tryReg(T2, rec.id, "teacher", 1, 64000, SHA("c"), 30000, 60000), /Not your recording/);
refused("a parent cannot", await tryReg(PARENT, rec.id, "teacher", 1, 64000, SHA("c"), 30000, 60000), /Not your recording/);
refused("a chunk row cannot be inserted directly", await tryAs(T1, () => db.query(
  `INSERT INTO public.class_recording_chunks (recording_id, track, seq, storage_path, byte_size, sha256, t_start_ms, t_end_ms)
   VALUES ($1,'teacher',7,'x',1,$2,0,1)`, [rec.id, SHA("d")])), /permission denied/);

refused("confirming before the file is there is refused", await confirm(T1, c0.chunk_id, SHA("a")), /not in storage/);
ok("the recorder cannot upload to a path that is not a registered chunk",
  (await put(T1, `${C1}/${rec.id}/teacher/000042.webm`, 64000)) !== null);
ok("nor outside its recording", (await put(T1, `${C1}/${U(9)}/teacher/000000.webm`, 64000)) !== null);
ok("nor a stray file name", (await put(T1, `${C1}/${rec.id}/notes.txt`, 10)) !== null);
ok("another teacher cannot upload to the registered path", (await put(T2, c0.storage_path, 64000)) !== null);
ok("a TA cannot", (await put(TA, c0.storage_path, 64000)) !== null);
ok("a parent cannot", (await put(PARENT, c0.storage_path, 64000)) !== null);
ok("a student cannot (N1)", (await put(STUDENT, c0.storage_path, 64000)) !== null);
ok("nobody signed in (anon) cannot (N1)", (await put(null, c0.storage_path, 64000, "anon")) !== null);
ok("the critic's probe: a teacher of another class - who the old staff policy lets write `class-recordings` - cannot write a registered path in the recorder's bucket (N1)",
  /row-level security/.test(await put(T2, c0.storage_path, 64000) ?? ""));
ok("the manifest cannot be uploaded while still recording", (await put(T1, manifestOf(rec.id), 300)) !== null);
eq("the recorder uploads the registered chunk", await put(T1, c0.storage_path, 63999), null);
refused("a size that differs from what was recorded is not a confirmation", await confirm(T1, c0.chunk_id, SHA("a")), /Storage holds 63999 bytes/);
await q(`UPDATE storage.objects SET metadata = jsonb_build_object('size', 64000) WHERE name = $1`, [c0.storage_path]);
refused("a read-back checksum that differs is not a confirmation", await confirm(T1, c0.chunk_id, SHA("f")), /does not match/);
refused("another teacher cannot confirm it", await confirm(T2, c0.chunk_id, SHA("a")), /Not your recording/);
eq("size and read-back checksum both matching confirms it", await confirm(T1, c0.chunk_id, SHA("a")), null);
eq("confirming twice is harmless", await confirm(T1, c0.chunk_id, SHA("a")), null);
eq("the row records what storage holds", (await one(
  `SELECT stored_size::int AS s, confirmed_at IS NOT NULL AS c FROM public.class_recording_chunks WHERE id=$1`, [c0.chunk_id])), { s: 64000, c: true });
ok("a confirmed chunk's path takes no second upload", (await put(T1, c0.storage_path, 64000)) !== null);
refused("no stored file can be overwritten: there is no update policy", await tryAs(T1, () => db.query(
  `UPDATE storage.objects SET metadata = '{}'::jsonb WHERE name = $1 RETURNING 1`, [c0.storage_path])
  .then((r) => { if (r.rows.length === 0) throw new Error("no rows"); })), /no rows/);
ok("the recorder cannot delete a stored file", (await rowsAs(T1, `DELETE FROM storage.objects WHERE name = $1 RETURNING 1`, [c0.storage_path])).length === 0);

console.log("=== markers ===");
const mark = (uid, r, kind, t, student = null, cm = null) => tryAs(uid, () => db.query(
  `INSERT INTO public.class_recording_markers (recording_id, client_marker_id, kind, t_ms, student_id, created_by)
   VALUES ($1, COALESCE($5::uuid, gen_random_uuid()), $2, $3, $4, $6)`, [r, kind, t, student, cm, ADMIN]));
eq("roll call start", await mark(T1, rec.id, "roll_call_start", 1000, null, U(7)), null);
refused("the same tap sent twice is one marker", await mark(T1, rec.id, "roll_call_start", 1000, null, U(7)), /class_recording_markers_once|duplicate/);
eq("the teacher taps a child's name", await mark(T1, rec.id, "student_name", 2000, k1), null);
eq("the marker is the teacher's, whoever the page said", (await one(
  `SELECT created_by FROM public.class_recording_markers WHERE kind='student_name'`)).created_by, T1);
refused("a child of another class cannot be named", await mark(T1, rec.id, "student_name", 3000, k3), /not in this class/);
refused("a name chip without a child is refused", await mark(T1, rec.id, "student_name", 3000, null), /names a child/);
refused("an activity marker cannot carry a child", await mark(T1, rec.id, "activity", 3000, k1), /names a child/);
ok("another teacher cannot add a marker", (await mark(T2, rec.id, "activity", 3000)) !== null);
ok("a parent cannot", (await mark(PARENT, rec.id, "activity", 3000)) !== null);

console.log("=== finishing ===");
refused("recording cannot jump to complete", await setStatus(T1, rec.id, "complete"), /cannot go from recording to complete/);
eq("recording -> uploading", await setStatus(T1, rec.id, "uploading", `, stop_reason = 'scheduled_end', client_ended_at = now() + interval '1 day'`), null);
{
  const r = await one(`SELECT ended_at >= started_at AS ordered, ended_at <= now() AS not_future, stopped_by, stop_reason,
                              client_ended_at > now() AS claim_kept
                       FROM public.class_recordings WHERE id=$1`, [rec.id]);
  eq("who stopped it and when is the server's record; the laptop's stop time is only a claim", r,
    { ordered: true, not_future: true, stopped_by: T1, stop_reason: "scheduled_end", claim_kept: true });
}
const MANIFEST = manifestOf(rec.id);
const complete = (uid = T1) => completeRec(uid, rec.id);
refused("complete needs the manifest", await setStatus(T1, rec.id, "complete"), /manifest/);
refused("and the manifest in storage", await complete(), /manifest is not in storage/);
eq("the manifest uploads once capture has stopped", await put(T1, MANIFEST, 300), null);
const r0 = await reg(T1, rec.id, "room", 0, 70000, SHA("b"), 0, 30000);
refused("an unconfirmed chunk blocks completion", await complete(), /not confirmed/);
await put(T1, r0.storage_path, 70000);
eq("the room chunk confirms", await confirm(T1, r0.chunk_id, SHA("b")), null);
refused("tracks with no chunk counts block completion", await complete(), /no audio|not the ones the manifest counts/);
await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 2 WHERE recording_id=$1 AND track='teacher'`, [rec.id]));
await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 1 WHERE recording_id=$1 AND track='room'`, [rec.id]));
refused("a manifest that counts a chunk storage does not have blocks completion", await complete(), /not the ones the manifest counts/);
await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 1 WHERE recording_id=$1 AND track='teacher'`, [rec.id]));
eq("with everything confirmed it completes", await complete(), null);
refused("a complete recording cannot go back", await setStatus(ADMIN, rec.id, "recording"), /cannot go from complete to recording/);
eq("the recorder can no longer change it", (await rowsAs(T1, `UPDATE public.class_recordings SET abandon_reason = 'x' WHERE id=$1 RETURNING 1`, [rec.id])).length, 0);
refused("no audio is accepted after completion", await tryReg(T1, rec.id, "teacher", 1, 64000, SHA("c"), 30000, 60000), /complete and takes no more audio/);
refused("its session cannot be swapped", await tryAs(ADMIN, () => db.query(`UPDATE public.class_recordings SET session_id = $2 WHERE id=$1`, [rec.id, s1b])), /cannot be changed or removed/);
refused("nor its class", await tryAs(ADMIN, () => db.query(`UPDATE public.class_recordings SET class_id = $2 WHERE id=$1`, [rec.id, C2])), /cannot be changed/);

console.log("=== who reads ===");
const TABLES = ["class_recordings", "class_recording_tracks", "class_recording_chunks", "class_recording_markers",
  "class_recording_settings", "recorder_child_consents", "recorder_audit_log", "recorder_session_evidence"];
const counts = async (uid) => {
  const out = {};
  // The other class has a switch row of its own (off), which its teacher may read.
  for (const t of TABLES) out[t] = (await rowsAs(uid,
    `SELECT 1 FROM public.${t}${t === "class_recording_settings" ? ` WHERE class_id = '${C1}'` : ""}`)).length;
  out.files = (await rowsAs(uid, `SELECT 1 FROM storage.objects WHERE bucket_id = '${BUCKET}'`)).length;
  return out;
};
const NOTHING = Object.fromEntries([...TABLES, "files"].map((t) => [t, 0]));
for (const [who, uid] of [["a teacher of another class", T2], ["a teaching assistant of this class", TA], ["a parent", PARENT], ["a student", STUDENT]]) {
  eq(`${who} reads nothing: no row, no file`, await counts(uid), NOTHING);
}
eq("no one signed in reads nothing either", await counts(null), NOTHING);
{
  // C1 critic 2, N1: the recorder's files are untouchable by anyone but its
  // listeners, whatever the old staff policy says about `class-recordings`.
  await q(`INSERT INTO storage.objects (bucket_id, name, metadata) VALUES ($1, $2, '{"size": 1000}')`,
    [OLD_BUCKET, `${C1}/${U(7)}.mp3`]);
  eq("control: the old policy is live here - a teacher of another class reads Teacher Transcripts' upload",
    (await rowsAs(T2, `SELECT 1 FROM storage.objects WHERE bucket_id = $1`, [OLD_BUCKET])).length, 1);
  const files = (await q(`SELECT name FROM storage.objects WHERE bucket_id = $1 ORDER BY name`, [BUCKET])).map((r) => r.name);
  ok("there are recorder files to probe", files.length === 3);
  const matrix = async (uid, role = "authenticated") => ({
    select: (await rowsAs(uid, `SELECT 1 FROM storage.objects WHERE bucket_id = $1`, [BUCKET], role)).length,
    update: (await rowsAs(uid, `UPDATE storage.objects SET metadata = '{"size": 1}' WHERE bucket_id = $1 RETURNING 1`, [BUCKET], role)).length,
    delete: (await rowsAs(uid, `DELETE FROM storage.objects WHERE bucket_id = $1 RETURNING 1`, [BUCKET], role)).length,
    insert: (await tryAs(uid, () => db.query(
      `INSERT INTO storage.objects (bucket_id, name, metadata) VALUES ($1, $2, '{"size": 64000}')`,
      [BUCKET, `${C1}/${rec.id}/teacher/000001.webm`]), role)) !== null ? "refused" : "ALLOWED",
  });
  const NONE = { select: 0, update: 0, delete: 0, insert: "refused" };
  for (const [who, uid, role] of [["a teacher of another class (the critic's T2)", T2], ["a teaching assistant of the class", TA],
    ["a parent", PARENT], ["a student", STUDENT], ["anon", null, "anon"]]) {
    eq(`the critic's probe: ${who} can do nothing in the recorder's bucket - select, update, delete, insert (N1)`, await matrix(uid, role), NONE);
  }
  eq("the files are all still there, unchanged", (await q(
    `SELECT name, metadata->>'size' s FROM storage.objects WHERE bucket_id = $1 ORDER BY name`, [BUCKET])).map((r) => r.name), files);
  eq("no policy at all - staff_manage_class_recordings included - shows T2 a recorder file, whichever bucket it is asked about (N1)",
    (await rowsAs(T2, `SELECT 1 FROM storage.objects WHERE name = ANY ($1::text[])`, [files])).length, 0);
  await q(`DELETE FROM storage.objects WHERE bucket_id = $1`, [OLD_BUCKET]);
}
{
  const c = await counts(T1);
  eq("the class teacher reads the recording, its parts and its files",
    [c.class_recordings, c.class_recording_tracks, c.class_recording_chunks, c.class_recording_markers, c.class_recording_settings, c.files, c.recorder_session_evidence],
    [1, 2, 2, 2, 1, 3, 1]);
  eq("but not which child has consent", c.recorder_child_consents, 0);
  ok("and only their own lines of the audit log", c.recorder_audit_log > 0 &&
    (await rowsAs(T1, `SELECT 1 FROM public.recorder_audit_log WHERE actor IS DISTINCT FROM $1`, [T1])).length === 0);
}
{
  const c = await counts(ADMIN);
  eq("an admin reads all of it",
    [c.class_recordings, c.class_recording_tracks, c.class_recording_chunks, c.class_recording_markers, c.files, c.recorder_child_consents],
    [1, 2, 2, 2, 3, 2]);
}
eq("a parent cannot read the recorder settings", (await rowsAs(PARENT, `SELECT 1 FROM public.recorder_settings`)).length, 0);
eq("a teacher can", (await rowsAs(T1, `SELECT 1 FROM public.recorder_settings`)).length, 1);
eq("a teacher cannot change them", (await rowsAs(T1, `UPDATE public.recorder_settings SET retention_days = 90 RETURNING 1`)).length, 0);
eq("the bucket is private", (await one(`SELECT public FROM storage.buckets WHERE id='${BUCKET}'`)).public, false);
eq("anon holds no privilege on any recorder table", (await one(
  `SELECT count(*)::int n FROM information_schema.role_table_grants
    WHERE grantee IN ('anon','PUBLIC') AND (table_name LIKE 'class_recording%' OR table_name LIKE 'recorder_%')`)).n, 0);
eq("no family or student policy exists on the bucket, and no delete policy: its only policies are insert and select (F15)", (await q(
  `SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'class_recorder_audio%' ORDER BY 1`))
  .map((r) => r.policyname), ["class_recorder_audio_insert", "class_recorder_audio_select"]);
ok("an admin cannot delete a stored file by hand either: removal goes through the retention job, which logs (F15)",
  (await rowsAs(ADMIN, `DELETE FROM storage.objects WHERE bucket_id='${BUCKET}' RETURNING 1`)).length === 0);
{
  // A profile is the person's own.
  eq("a teacher saves their device profile", await tryAs(T1, () => db.query(
    `INSERT INTO public.recorder_device_profiles (user_id, install_id, teacher_label, teacher_device_hash, room_label, room_device_hash)
     VALUES ($1, $2, 'Microphone (2- USB Audio Device)', 'h1', 'Echo Cancelling Speakerphone (Anker PowerConf S500)', 'h2')
     ON CONFLICT (user_id, install_id) DO UPDATE SET verified_at = now()`, [T1, U(8)])), null);
  eq("saving it again updates the one row (a plain unique index, so the upsert plans)", await tryAs(T1, () => db.query(
    `INSERT INTO public.recorder_device_profiles (user_id, install_id) VALUES ($1, $2)
     ON CONFLICT (user_id, install_id) DO UPDATE SET verified_at = now()`, [T1, U(8)])), null);
  refused("one device cannot be both microphones", await tryAs(T1, () => db.query(
    `UPDATE public.recorder_device_profiles SET room_device_hash = 'h1' WHERE user_id = $1`, [T1])), /recorder_device_profile_two_devices/);
  ok("a teacher cannot save a profile as someone else", (await tryAs(T1, () => db.query(
    `INSERT INTO public.recorder_device_profiles (user_id, install_id) VALUES ($1, $2)`, [T2, U(8)]))) !== null);
  eq("another teacher does not see it", (await rowsAs(T2, `SELECT 1 FROM public.recorder_device_profiles`)).length, 0);
  eq("a parent cannot keep one", (await tryAs(PARENT, () => db.query(
    `INSERT INTO public.recorder_device_profiles (user_id, install_id) VALUES ($1, $2)`, [PARENT, U(8)]))) !== null, true);
  eq("an admin sees it, for audit", (await rowsAs(ADMIN, `SELECT 1 FROM public.recorder_device_profiles`)).length, 1);
}

console.log("=== the audit log ===");
eq("who armed, started, stopped and completed is written by the database",
  (await q(`SELECT action, actor FROM public.recorder_audit_log WHERE recording_id=$1 ORDER BY id`, [rec.id])),
  [{ action: "armed", actor: T1 }, { action: "started", actor: T1 }, { action: "stopped", actor: T1 }, { action: "completed", actor: T1 }]);
eq("and who switched the class on", (await q(`SELECT actor FROM public.recorder_audit_log WHERE action='switch_on' AND class_id=$1`, [C1])), [{ actor: ADMIN }]);
eq("and each child's consent", (await one(`SELECT count(*)::int n FROM public.recorder_audit_log WHERE action='child_consent_granted'`)).n, 2);
for (const [who, uid, role] of [["an admin", ADMIN, "authenticated"], ["the service role", null, "service_role"]]) {
  refused(`${who} cannot update it`, await tryAs(uid, () => db.query(`UPDATE public.recorder_audit_log SET action = 'armed'`), role), /append-only|permission denied/);
  refused(`${who} cannot delete from it`, await tryAs(uid, () => db.query(`DELETE FROM public.recorder_audit_log`), role), /append-only|permission denied/);
}
{
  const direct = async (s) => { try { await db.exec(s); return null; } catch (e) { return e.message; } };
  refused("not even the database owner can update it", await direct(`UPDATE public.recorder_audit_log SET actor = NULL`), /append-only/);
  refused("or delete from it", await direct(`DELETE FROM public.recorder_audit_log`), /append-only/);
  refused("or truncate it", await direct(`TRUNCATE public.recorder_audit_log`), /append-only/);
}
refused("nobody signed in can write a line of their own", await tryAs(ADMIN, () => db.query(
  `INSERT INTO public.recorder_audit_log (action) VALUES ('armed')`)), /permission denied/);
refused("or call the writer", await tryAs(ADMIN, () => db.query(
  `SELECT public.recorder__audit('armed', NULL, NULL, NULL, NULL, NULL)`)), /permission denied/);

console.log("=== the contract for D1 ===");
{
  const e = await one(`SELECT session_id, status, was_completed, recording_ran_evidence, too_short, started_by,
                              started_at IS NOT NULL AS s, ended_at IS NOT NULL AS e,
                              claimed_audio_ms::int AS claimed, verified_audio_ms::int AS ms, stored_bytes::int AS bytes,
                              server_capture_ms BETWEEN 110000 AND 130000 AS span, tracks_with_audio,
                              first_chunk_registered_at IS NOT NULL AS f, first_chunk_confirmed_at IS NOT NULL AS fc
                       FROM public.recorder_session_evidence WHERE session_id = $1`, [s1]);
  eq("a completed 30-second recording of a session is one row: complete, but it does NOT count as evidence that a recording ran", e,
    { session_id: s1, status: "complete", was_completed: true, recording_ran_evidence: false, too_short: true, started_by: T1,
      s: true, e: true, claimed: 30000, ms: 30000, bytes: 134000, span: true, tracks_with_audio: 2, f: true, fc: true });
  eq("two tracks of one lesson are 30 seconds of lesson, not 60", e.ms, 30000);
  eq("a session with no recording has no row", (await q(`SELECT 1 FROM public.recorder_session_evidence WHERE session_id = $1`, [s2])).length, 0);
  eq("the service role can read it (D's function may run as it)", (await rowsAs(null, `SELECT 1 FROM public.recorder_session_evidence`, [], "service_role")).length, 1);
  refused("it is a view: it cannot be written", await tryAs(ADMIN, () => db.query(
    `UPDATE public.recorder_session_evidence SET status = 'complete'`)), /permission denied|cannot update/);
}

console.log("=== retention and deletion ===");
const due = async (at, uid = null, role = "service_role") =>
  (await rowsAs(uid, `SELECT recording_id, storage_prefix FROM public.recorder_retention_due(${at})`, [], role)).map((r) => r.recording_id);
const recB = await arm(T1, s1b);
await setStatus(T1, recB.id, "recording");
await travel(recB.id, 2);
eq("nothing is due today", await due("now()"), []);
eq("29 days after the lesson, still nothing", await due(`(SELECT scheduled_end + interval '29 days' FROM public.class_recordings WHERE id='${rec.id}')`), []);
eq("after 30 days the completed recording is due, and the one still recording is not",
  await due(`(SELECT scheduled_end + interval '30 days 1 second' FROM public.class_recordings WHERE id='${rec.id}')`), [rec.id]);
eq("the job is told which folder to empty", (await rowsAs(null,
  `SELECT storage_prefix FROM public.recorder_retention_due(now() + interval '40 days')`, [], "service_role"))[0].storage_prefix, `${C1}/${rec.id}/`);
eq("a teacher of another class is shown nothing by it", await due("now() + interval '40 days'", T2, "authenticated"), []);
eq("a teacher cannot push a deletion date later", await (async () => {
  await as(T1, () => db.query(`UPDATE public.class_recordings SET delete_after = delete_after + interval '100 days' WHERE id=$1`, [recB.id]));
  return (await one(`SELECT round(extract(epoch FROM (delete_after - scheduled_end)) / 86400)::int d FROM public.class_recordings WHERE id=$1`, [recB.id])).d;
})(), 30);
{
  // C1 critic 2, N3: retention is the server's.
  const before = (await one(`SELECT delete_after::text d FROM public.class_recordings WHERE id=$1`, [recB.id])).d;
  eq("the critic's probe: the recorder setting delete_after to the past while open is ignored (N3)", await tryAs(T1, () => db.query(
    `UPDATE public.class_recordings SET delete_after = '2000-01-01' WHERE id=$1`, [recB.id])), null);
  eq("the date stands", (await one(`SELECT delete_after::text d FROM public.class_recordings WHERE id=$1`, [recB.id])).d, before);
  eq("so the retention job is not told to remove it", (await due("now()")).includes(recB.id), false);
  eq("and no retention change is logged for the teacher", (await one(
    `SELECT count(*)::int n FROM public.recorder_audit_log WHERE recording_id=$1 AND action IN ('retention_changed','deletion_requested')`, [recB.id])).n, 0);
  refused("the deletion, stop-reason and stamp columns are not writable by a signed-in caller at all (column privileges)",
    await tryAs(T1, () => db.query(`UPDATE public.class_recordings SET deletion_reason = 'x' WHERE id=$1`, [recB.id])), /permission denied/);
  refused("nor ended_at", await tryAs(ADMIN, () => db.query(`UPDATE public.class_recordings SET ended_at = now() WHERE id=$1`, [recB.id])), /permission denied/);
  refused("nor stop_request_reason", await tryAs(ADMIN, () => db.query(
    `UPDATE public.class_recordings SET stop_request_reason = 'admin' WHERE id=$1`, [recB.id])), /permission denied/);
  // The service role holds the column privileges; the trigger still takes a
  // deletion request only from recorder_request_deletion.
  await as(null, () => db.query(`UPDATE public.class_recordings SET deletion_requested_at = now(), deletion_reason = 'x' WHERE id=$1`, [recB.id]), "service_role");
  eq("even the service role cannot write a deletion request into the row: only the function makes one", (await one(
    `SELECT deletion_requested_at, deletion_reason FROM public.class_recordings WHERE id=$1`, [recB.id])),
    { deletion_requested_at: null, deletion_reason: null });
}
eq("an admin can, and it is logged", await (async () => {
  await as(ADMIN, () => db.query(`UPDATE public.class_recordings SET delete_after = scheduled_end + interval '60 days' WHERE id=$1`, [recB.id]));
  return (await one(`SELECT count(*)::int n FROM public.recorder_audit_log WHERE recording_id=$1 AND action='retention_changed' AND actor=$2`, [recB.id, ADMIN])).n;
})(), 1);
refused("but never beyond 180 days", await tryAs(ADMIN, () => db.query(
  `UPDATE public.class_recordings SET delete_after = scheduled_end + interval '181 days' WHERE id=$1`, [recB.id])), /class_recordings_retention_cap/);
refused("a teacher of another class cannot ask for a deletion", await tryAs(T2, () => db.query(
  `SELECT public.recorder_request_deletion($1, 'x')`, [rec.id])), /Not your class/);
refused("a parent cannot", await tryAs(PARENT, () => db.query(`SELECT public.recorder_request_deletion($1, 'x')`, [rec.id])), /Not your class/);
refused("a reason is required", await tryAs(T1, () => db.query(`SELECT public.recorder_request_deletion($1, ' ')`, [rec.id])), /Say why/);
eq("the class teacher asks for the recording to be deleted", await tryAs(T1, () => db.query(
  `SELECT public.recorder_request_deletion($1, 'wrong class was in the room')`, [rec.id])), null);
eq("it is due at once", await due("now()"), [rec.id]);
eq("and the request is logged with who asked", (await q(
  `SELECT actor FROM public.recorder_audit_log WHERE recording_id=$1 AND action='deletion_requested'`, [rec.id])), [{ actor: T1 }]);
eq("the row says who asked, as the server saw it", (await one(
  `SELECT deletion_requested_by, deletion_reason FROM public.class_recordings WHERE id=$1`, [rec.id])),
  { deletion_requested_by: T1, deletion_reason: "wrong class was in the room" });
refused("it cannot be marked deleted while a file is left", await tryAs(null, () => db.query(
  `SELECT public.recorder_mark_audio_deleted($1)`, [rec.id]), "service_role"), /still in storage/);
refused("the row cannot be deleted while its audio exists", await tryAs(null, () => db.query(
  `DELETE FROM public.class_recordings WHERE id=$1`, [rec.id]), "service_role"), /kept until its audio has been removed/);
ok("a teacher cannot remove the files", (await rowsAs(T1,
  `DELETE FROM storage.objects WHERE bucket_id='${BUCKET}' RETURNING 1`)).length === 0);
await as(null, () => db.query(`DELETE FROM storage.objects WHERE bucket_id='${BUCKET}' AND name LIKE $1`, [`${C1}/${rec.id}/%`]), "service_role");
eq("a teacher cannot mark it deleted", (await rowsAs(T1, `SELECT public.recorder_mark_audio_deleted($1) AS d`, [rec.id]))[0].d, false);
eq("with the files gone the job marks it deleted", (await rowsAs(null, `SELECT public.recorder_mark_audio_deleted($1) AS d`, [rec.id], "service_role"))[0].d, true);
eq("the row stays as a record that the audio is gone", (await one(
  `SELECT status, audio_deleted_at IS NOT NULL AS gone FROM public.class_recordings WHERE id=$1`, [rec.id])), { status: "deleted", gone: true });
eq("it is not due again", await due("now() + interval '400 days'"), []);
eq("the evidence that the lesson was recorded outlives the audio", (await one(
  `SELECT status, was_completed, verified_audio_ms::int ms FROM public.recorder_session_evidence WHERE recording_id=$1`, [rec.id])),
  { status: "deleted", was_completed: true, ms: 30000 });
eq("deleted early at a person's request, it is no evidence and the view says who asked (N3)", (await one(
  `SELECT recording_ran_evidence, deleted_by_retention, deletion_requested_by, audio_deleted_at IS NOT NULL AS gone
     FROM public.recorder_session_evidence WHERE recording_id=$1`, [rec.id])),
  { recording_ran_evidence: false, deleted_by_retention: false, deletion_requested_by: T1, gone: true });
ok("the deletion is in the log, by the system", (await q(
  `SELECT actor FROM public.recorder_audit_log WHERE recording_id=$1 AND action='audio_deleted'`, [rec.id]))[0]?.actor === null);
refused("a teacher cannot run the stale sweep", await tryAs(T1, () => db.query(`SELECT public.recorder_expire_stale(now())`)), /permission denied/);
eq("the sweep leaves a recording from today alone", (await rowsAs(null, `SELECT public.recorder_expire_stale(now()) n`, [], "service_role"))[0].n, 0);

console.log("=== consent changes close the door ===");
const recC = await arm(T1, s1c);
eq("a recording is running and another is armed",
  (await q(`SELECT status FROM public.class_recordings WHERE id IN ($1,$2) ORDER BY armed_at`, [recB.id, recC.id])).map((r) => r.status), ["recording", "armed"]);
// An enrolment that reached the table without the recorder's trigger (for
// example before this migration was pasted): arming re-counts on its own.
const k4 = (await one(`INSERT INTO public.students (full_name) VALUES ('Bao') RETURNING id`)).id;
await raw(`INSERT INTO public.enrollments (student_id, class_id) VALUES ($1,$2)`, [k4, C1]);
refused("a child on the register without consent blocks arming even with the switch on", await tryArm(T1, s1d), /1 child\(ren\) in this class have no consent/);
eq("once that child's consent is recorded it is allowed again", [await consent(ADMIN, k4), await tryAs(T1, async () => {
  await db.query(`INSERT INTO public.class_recordings (session_id, class_id, started_by, format, max_duration_ms, session_date, scheduled_start, scheduled_end, delete_after)
                  VALUES ($1,$2,$3,'flac',1,'2000-01-01',now(),now()+interval '1 hour',now())`, [s1d, C1, T1]);
  throw new Error("rolled back on purpose");
})], [null, "rolled back on purpose"]);
eq("a parent withdraws: the admin records it", await consent(ADMIN, k2, "withdrawn", "phone call from mother, 12 Nov"), null);
{
  const s = await one(`SELECT recording_enabled, consent_confirmed_by, consent_confirmed_at FROM public.class_recording_settings WHERE class_id=$1`, [C1]);
  eq("the class switches off by itself and the old confirmation is gone", s, { recording_enabled: false, consent_confirmed_by: null, consent_confirmed_at: null });
  eq("the armed recording is abandoned", (await one(`SELECT status, abandon_reason FROM public.class_recordings WHERE id=$1`, [recC.id])),
    { status: "abandoned", abandon_reason: "switch_off" });
  eq("the running one is told to stop", (await one(`SELECT stop_requested_at IS NOT NULL AS s FROM public.class_recordings WHERE id=$1`, [recB.id])).s, true);
  ok("and the log says why", (await q(`SELECT 1 FROM public.recorder_audit_log WHERE action='switch_off_auto' AND class_id=$1`, [C1])).length === 1);
}
refused("no new recording", await tryArm(T1, s1d), /switched off/);
refused("switching back on is refused while that child is in the class", await setSwitch(ADMIN, C1, true), /1 enrolled child/);
await as(T1, () => db.query(`INSERT INTO public.class_recording_tracks (recording_id, track) VALUES ($1,'teacher')`, [recB.id]));
eq("audio captured before the switch-off still uploads", (await tryReg(T1, recB.id, "teacher", 0, 64000, SHA("1"), 0, 30000)), null);
refused("audio captured after it is refused", await tryReg(T1, recB.id, "teacher", 9, 64000, SHA("2"), 600_000, 630_000), /asked to stop/);
refused("a stop request cannot be cleared", await (async () => {
  await as(T1, () => db.query(`UPDATE public.class_recordings SET stop_requested_at = NULL WHERE id=$1`, [recB.id]));
  return (await one(`SELECT stop_requested_at IS NULL AS cleared FROM public.class_recordings WHERE id=$1`, [recB.id])).cleared ? null : "kept";
})(), /kept/);

console.log("=== switching off is open to the class, on is not ===");
await consent(ADMIN, k2, "granted", "signed again, 13 Nov");
eq("consent back, an admin switches on again", await setSwitch(ADMIN, C1, true), null);
refused("a teacher of another class cannot switch this class off", await setSwitch(T2, C1, false), /Only an admin or a teacher of the class/);
refused("a TA cannot", await setSwitch(TA, C1, false), /Only an admin or a teacher of the class/);
eq("the class teacher can switch it off", await setSwitch(T1, C1, false), null);
eq("and it is off", (await one(`SELECT recording_enabled FROM public.class_recording_settings WHERE class_id=$1`, [C1])).recording_enabled, false);
refused("and cannot switch it back on", await setSwitch(T1, C1, true), /Only an admin can switch recording on/);

console.log("=== a new consent wording switches everything off (F3) ===");
await setSwitch(ADMIN, C1, true);
await as(ADMIN, () => db.query(`UPDATE public.recorder_settings SET consent_wording_version = 'v2-2027-01'`));
eq("the class is switched off the moment the wording changes", (await one(
  `SELECT recording_enabled, consent_wording_version FROM public.class_recording_settings WHERE class_id=$1`, [C1])),
  { recording_enabled: false, consent_wording_version: null });
ok("and the log says the wording changed", (await q(
  `SELECT 1 FROM public.recorder_audit_log WHERE action='switch_off_auto' AND class_id=$1 AND detail->>'reason' = 'the consent wording changed'`, [C1])).length === 1);
refused("no new recording under the old wording", await tryArm(T1, s1d), /switched off/);
refused("the critic's probe: switching on under v2 while every child consented under v1 is refused",
  await setSwitch(ADMIN, C1, true, "v2-2027-01"), /3 enrolled child\(ren\) have no consent on record under wording v2-2027-01/);
eq("the class teacher is told 3 are missing under the new wording", (await rowsAs(T1, `SELECT public.recorder_class_missing_consent($1) n`, [C1]))[0].n, 3);
// The arm trigger's own check of the class confirmation, reached by a row the
// API cannot produce (old wording on an ON switch).
await raw(`UPDATE public.class_recording_settings SET recording_enabled = true, consent_confirmed_by = $2, consent_confirmed_at = now(),
             consent_wording_version = 'v1-2026-11', consent_note = 'forced' WHERE class_id = $1`, [C1, ADMIN]);
refused("a switch confirmed under an older wording does not let anyone arm", await tryArm(T1, s1d), /older wording/);
await raw(`UPDATE public.class_recording_settings SET recording_enabled = false, consent_confirmed_by = NULL, consent_confirmed_at = NULL,
             consent_wording_version = NULL, consent_note = NULL WHERE class_id = $1`, [C1]);
eq("the settings change is logged", (await one(`SELECT count(*)::int n FROM public.recorder_audit_log WHERE action='settings_changed' AND actor=$1`, [ADMIN])).n, 1);

console.log("=== a session that disappears ===");
await q(`DELETE FROM public.sessions WHERE id = $1`, [s1b]);
eq("deleting a session keeps its recording, with what the session said", (await one(
  `SELECT session_id, armed_session_id, session_date IS NOT NULL AS d, status FROM public.class_recordings WHERE id=$1`, [recB.id])),
  { session_id: null, armed_session_id: s1b, d: true, status: "recording" });
eq("the stale sweep abandons what never finished, 14 days on", (await rowsAs(null,
  `SELECT public.recorder_expire_stale(now() + interval '16 days') n`, [], "service_role"))[0].n, 1);
eq("and it then falls due like any other", (await due("now() + interval '400 days'")).includes(recB.id), true);

console.log("=== per-child consent under the current wording only (F3) ===");
await consent(ADMIN, k1, "granted", "v2 form, 14 Nov");
await consent(ADMIN, k2, "granted", "v2 form, 14 Nov");
refused("one child whose consent is still under v1 keeps the class off", await setSwitch(ADMIN, C1, true, "v2-2027-01"), /1 enrolled child/);
await consent(ADMIN, k4, "granted", "v2 form, 14 Nov");
eq("with every child under v2 an admin switches on", await setSwitch(ADMIN, C1, true, "v2-2027-01"), null);
await raw(`UPDATE public.recorder_child_consents SET wording_version = 'v1-2026-11' WHERE student_id = $1`, [k4]);
refused("arming re-checks each child's wording version itself", await tryArm(T1, s1d), /1 child\(ren\) in this class have no consent on record under wording v2-2027-01/);
await raw(`UPDATE public.recorder_child_consents SET wording_version = 'v2-2027-01' WHERE student_id = $1`, [k4]);

console.log("=== a recording stays with its lesson, and says who did what (F4, F11) ===");
const sA = await sess(C1, t1);
const rA = await arm(T1, sA);
refused("the recorder cannot detach its open recording from its session", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET session_id = NULL WHERE id=$1`, [rA.id])), /stays with its lesson/);
refused("nor can an admin while the session exists", await tryAs(ADMIN, () => db.query(
  `UPDATE public.class_recordings SET session_id = NULL WHERE id=$1`, [rA.id])), /stays with its lesson/);
refused("nor move it to another lesson of the class", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET session_id = $2 WHERE id=$1`, [rA.id, s1d])), /stays with its lesson/);
refused("the owner cannot be nulled", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET started_by = NULL WHERE id=$1`, [rA.id])), /cannot be changed/);
refused("nor the lesson it was armed for", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET armed_session_id = $2 WHERE id=$1`, [rA.id, s1d])), /cannot be changed/);
refused("nor the capture window", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET capture_closes_at = capture_closes_at + interval '1 hour' WHERE id=$1`, [rA.id])), /cannot be changed/);
refused("nor the byte floor", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET min_bytes_per_sec = 1 WHERE id=$1`, [rA.id])), /cannot be changed/);
refused("a second live recording of that lesson is still refused", await tryArm(T1, sA), /class_recordings_one_live_per_session|duplicate/);
{
  const t2profile = (await one(`INSERT INTO public.recorder_device_profiles (user_id, install_id) VALUES ($1, $2) RETURNING id`, [T2, U(9)])).id;
  refused("someone else's device profile cannot be put on a recording", await tryAs(T1, () => db.query(
    `UPDATE public.class_recordings SET device_profile_id = $2 WHERE id=$1`, [rA.id, t2profile])), /not the recorder's/);
  const mine = (await one(`SELECT id FROM public.recorder_device_profiles WHERE user_id=$1`, [T1])).id;
  eq("their own can", await tryAs(T1, () => db.query(`UPDATE public.class_recordings SET device_profile_id = $2 WHERE id=$1`, [rA.id, mine])), null);
  refused("nor be named at arming", await tryAs(T1, async () => {
    await db.query(`INSERT INTO public.class_recordings (session_id, class_id, started_by, format, max_duration_ms, session_date,
                      scheduled_start, scheduled_end, delete_after, device_profile_id)
                    VALUES ($1,$2,$3,'flac',1,'2000-01-01',now(),now()+interval '1 hour',now(),$4)`, [s1d, C1, T1, t2profile]);
  }), /not yours/);
}
refused("a deletion request cannot be written into the row by the recorder: only recorder_request_deletion makes one (N3)",
  await tryAs(T1, () => db.query(`UPDATE public.class_recordings SET deletion_requested_by = $2, deletion_requested_at = now() - interval '9 days',
                                    deletion_reason = 'test' WHERE id=$1`, [rA.id, ADMIN])), /permission denied/);
eq("so there is none", (await one(`SELECT deletion_requested_at, deletion_requested_by FROM public.class_recordings WHERE id=$1`, [rA.id])),
  { deletion_requested_at: null, deletion_requested_by: null });
await setStatus(T1, rA.id, "recording");
eq("the recorder may write stop_requested_at, but it is ignored: a stop request is the server's (N4)", await tryAs(T1, () => db.query(
  `UPDATE public.class_recordings SET stop_requested_at = now() WHERE id=$1`, [rA.id])), null);
eq("and there is none", (await one(`SELECT stop_requested_at, stop_request_reason FROM public.class_recordings WHERE id=$1`, [rA.id])),
  { stop_requested_at: null, stop_request_reason: null });
await setStatus(T1, rA.id, "uploading", `, stop_reason = 'admin'`);
eq("a teacher cannot claim an admin stopped it", (await one(`SELECT stop_reason FROM public.class_recordings WHERE id=$1`, [rA.id])).stop_reason, "manual");
await tryAs(T1, () => db.query(`UPDATE public.class_recordings SET stop_reason = 'switch_off' WHERE id=$1`, [rA.id]));
eq("nor rewrite the stop reason later", (await one(`SELECT stop_reason FROM public.class_recordings WHERE id=$1`, [rA.id])).stop_reason, "manual");
await setStatus(T1, rA.id, "abandoned", `, abandon_reason = 'test over'`);
eq("a deletion request made through the function is stamped with the recorder and the server's time", [
  await tryAs(T1, () => db.query(`SELECT public.recorder_request_deletion($1, 'test')`, [rA.id])),
  await one(`SELECT deletion_requested_by, deletion_requested_at > now() - interval '1 minute' AS now_ish FROM public.class_recordings WHERE id=$1`, [rA.id])],
  [null, { deletion_requested_by: T1, now_ish: true }]);
refused("and it cannot be re-attributed afterwards, not even by an admin", await tryAs(ADMIN, () => db.query(
  `UPDATE public.class_recordings SET deletion_requested_by = $2 WHERE id=$1`, [rA.id, ADMIN])), /permission denied/);
eq("it is still the recorder's", (await one(`SELECT deletion_requested_by FROM public.class_recordings WHERE id=$1`, [rA.id])).deletion_requested_by, T1);

console.log("=== role oracle closed (F12) ===");
refused("a parent cannot ask whether someone teaches a class", await tryAs(PARENT, () => db.query(
  `SELECT public.recorder_is_class_teacher($1,$2)`, [T1, C1])), /permission denied/);
refused("nor can a teacher", await tryAs(T2, () => db.query(`SELECT public.recorder_is_class_teacher($1,$2)`, [T1, C1])), /permission denied/);
refused("nor about one session", await tryAs(PARENT, () => db.query(
  `SELECT public.recorder__teaches_session($1,$2,$3)`, [T1, s1d, C1])), /permission denied/);

console.log("=== the evidence rests on what the server saw (F1) ===");
const sP = await sess(C1, t1);
const rP = await arm(T1, sP);
await setStatus(T1, rP.id, "recording");
await addTrack(T1, rP.id);
refused("the critic's probe: ONE 1-byte chunk claiming 90 minutes is refused",
  await tryReg(T1, rP.id, "teacher", 0, 1, SHA("a"), 0, 5_400_000), /at most 30000 ms/);
refused("a chunk longer than one chunk is refused, however many bytes it has",
  await tryReg(T1, rP.id, "teacher", 0, 8_000_000, SHA("a"), 0, 120_000), /at most 30000 ms/);
refused("a chunk too small to be audio at all is refused (ruling (a): only under 40 bytes; a quieter one is flagged, below)",
  await tryReg(T1, rP.id, "teacher", 0, 39, SHA("a"), 0, 30_000), /too small to hold any audio/);
refused("audio ending later than the server's clock allows is refused (just armed: 30 s cannot exist yet)",
  await tryReg(T1, rP.id, "teacher", 0, 64_000, SHA("a"), 0, 30_000), /server's clock/);
await travel(rP.id, 1);
eq("one minute on, the first 30 s registers", (await tryReg(T1, rP.id, "teacher", 0, 64_000, SHA("a"), 0, 30_000)), null);
eq("and the next 30 s", (await tryReg(T1, rP.id, "teacher", 1, 64_000, SHA("a"), 30_000, 60_000)), null);
refused("but not audio past what one minute (+15 s) allows", await tryReg(T1, rP.id, "teacher", 2, 64_000, SHA("a"), 60_000, 80_000), /server's clock/);
eq("an overlapping chunk registers (its neighbours may not be there yet)", (await tryReg(T1, rP.id, "teacher", 2, 40_000, SHA("a"), 50_000, 70_000)), null);
for (const k of await q(`SELECT id, storage_path, byte_size FROM public.class_recording_chunks WHERE recording_id=$1`, [rP.id])) {
  await put(T1, k.storage_path, Number(k.byte_size)); await confirm(T1, k.id, SHA("a"));
}
await setStatus(T1, rP.id, "uploading");
await put(T1, manifestOf(rP.id), 300);
await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 3 WHERE recording_id=$1`, [rP.id]));
refused("but a track whose chunks overlap cannot complete: the audio would count twice", await completeRec(T1, rP.id), /overlap/);
await travel(rP.id, 5);
refused("after Stop, audio claimed from after Stop is refused (F8)", await tryReg(T1, rP.id, "teacher", 3, 40_000, SHA("a"), 70_000, 90_000), /after Stop/);

const sS = await sess(C1, t1);
const rS = await arm(T1, sS);
await setStatus(T1, rS.id, "recording");
await addTrack(T1, rS.id);
await travel(rS.id, 3);
for (let i = 0; i < 3; i++) await chunkUp(T1, rS.id, "teacher", i, 60_000, i * 30_000, (i + 1) * 30_000);
await setStatus(T1, rS.id, "uploading");
await put(T1, manifestOf(rS.id), 300);
await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 3 WHERE recording_id=$1`, [rS.id]));
await raw(`UPDATE public.class_recordings SET ended_at = started_at + interval '30 seconds' WHERE id=$1`, [rS.id]);
eq("the view never vouches for more audio than the server saw run between start and stop", (await one(
  `SELECT claimed_audio_ms::int c, server_capture_ms::int s, verified_audio_ms::int v FROM public.recorder_session_evidence WHERE recording_id=$1`, [rS.id])),
  { c: 90_000, s: 30_000, v: 30_000 });
refused("and a recording whose chunks run past the server's start-to-stop span cannot complete", await completeRec(T1, rS.id), /longer than the server saw/);
await raw(`UPDATE public.class_recordings SET ended_at = started_at + interval '180 seconds' WHERE id=$1`, [rS.id]);
const lost = (await one(`SELECT storage_path FROM public.class_recording_chunks WHERE recording_id=$1 AND seq=1`, [rS.id])).storage_path;
await q(`DELETE FROM storage.objects WHERE name=$1`, [lost]);
refused("a confirmed chunk that has gone from storage blocks completion", await completeRec(T1, rS.id), /no longer in storage/);
await q(`INSERT INTO storage.objects (bucket_id, name, metadata) VALUES ('${BUCKET}', $1, '{"size": 59000}')`, [lost]);
refused("and so does one whose stored size changed", await completeRec(T1, rS.id), /no longer in storage/);
await q(`UPDATE storage.objects SET metadata = '{"size": 60000}' WHERE name=$1`, [lost]);
eq("with every object there at its confirmed size, it completes", await completeRec(T1, rS.id), null);
eq("90 seconds of a 95-minute lesson: complete, but not evidence that a recording ran", (await one(
  `SELECT was_completed, recording_ran_evidence, too_short, claimed_audio_ms::int c, verified_audio_ms::int v,
          server_capture_ms::int s, stored_bytes::int b FROM public.recorder_session_evidence WHERE recording_id=$1`, [rS.id])),
  { was_completed: true, recording_ran_evidence: false, too_short: true, c: 90_000, v: 90_000, s: 180_000, b: 180_000 });
await q(`UPDATE public.class_recording_chunks SET stored_size = 1000 WHERE recording_id=$1`, [rS.id]);
eq("and the view never vouches for more audio than the stored bytes can hold at the format's floor", (await one(
  `SELECT verified_audio_ms::int v FROM public.recorder_session_evidence WHERE recording_id=$1`, [rS.id])).v, 1500);
await q(`UPDATE public.class_recording_chunks SET stored_size = byte_size WHERE recording_id=$1`, [rS.id]);

const sL = await sessAt(C1, t1, -60, 30);
const rL = await arm(T1, sL, { chunk_ms: 60000 });
await setStatus(T1, rL.id, "recording");
await addTrack(T1, rL.id);
// Live: each minute's chunk reaches the server as that minute ends (N2).
for (let i = 0; i < 58; i++) {
  await travel(rL.id, 1);
  await chunkUp(T1, rL.id, "teacher", i, 120_000, i * 60_000, (i + 1) * 60_000);
}
await setStatus(T1, rL.id, "uploading");
await put(T1, manifestOf(rL.id), 300);
await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 58 WHERE recording_id=$1`, [rL.id]));
eq("58 minutes of a 90-minute lesson, captured live, completes", await completeRec(T1, rL.id), null);
{
  const e = await one(`SELECT was_completed, recording_ran_evidence, too_short, verified_audio_ms::int v,
                              verified_lesson_ms::int vl, evidence_threshold_ms::int th, tracks_with_audio
                       FROM public.recorder_session_evidence WHERE session_id=$1`, [sL]);
  eq("and counts as evidence that a recording ran: verified live 58 min >= half of 90", e,
    { was_completed: true, recording_ran_evidence: true, too_short: false, v: 3_480_000, vl: 3_480_000, th: 2_700_000, tracks_with_audio: 1 });
}
await as(ADMIN, () => db.query(`UPDATE public.recorder_settings SET evidence_min_fraction = 0.90`));
eq("a later change of the threshold does not reinterpret it: the fraction was snapshot at arming", (await one(
  `SELECT recording_ran_evidence FROM public.recorder_session_evidence WHERE session_id=$1`, [sL])).recording_ran_evidence, true);
await as(ADMIN, () => db.query(`UPDATE public.recorder_settings SET evidence_min_fraction = 0.50`));
{
  // A state the API cannot reach (a late Stop abandons), set by hand: the view
  // checks the Stop time itself as well.
  const was = (await one(`SELECT ended_at::text e FROM public.class_recordings WHERE id=$1`, [rL.id])).e;
  await raw(`UPDATE public.class_recordings SET ended_at = capture_closes_at + interval '11 minutes' WHERE id=$1`, [rL.id]);
  eq("a complete recording whose Stop came after the window + late allowance is no evidence, however it got there (N2)",
    (await one(`SELECT recording_ran_evidence FROM public.recorder_session_evidence WHERE recording_id=$1`, [rL.id])).recording_ran_evidence, false);
  await raw(`UPDATE public.class_recordings SET ended_at = $2::timestamptz WHERE id=$1`, [rL.id, was]);
}

console.log("=== ruling (a): silence below the byte floor is stored, flagged, never evidence (C2 review) ===");
{
  const s = await sessAt(C1, t1, -60, 30);
  const r = await arm(T1, s, { chunk_ms: 60000 });   // opus-webm: floor 2000 B/s, so 120 000 B a minute
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id, "teacher");
  await addTrack(T1, r.id, "room");
  await travel(r.id, 1);
  refused("a chunk under 40 bytes is still refused: it cannot be an audio file",
    await tryReg(T1, r.id, "teacher", 0, 39, SHA("a"), 0, 60_000), /too small to hold any audio/);
  const silent = await reg(T1, r.id, "room", 0, 500, SHA("a"), 0, 60_000);
  eq("a chunk below the floor (500 B for 60 s) is ACCEPTED and flagged below_floor", [silent.already_registered, silent.below_floor], [false, true]);
  const loud = await reg(T1, r.id, "teacher", 0, 120_000, SHA("a"), 0, 60_000);
  eq("one at the floor is not flagged", loud.below_floor, false);
  eq("registering the silent chunk again returns the same row, still flagged", (await reg(T1, r.id, "room", 0, 500, SHA("a"), 0, 60_000)).below_floor, true);
  refused("the recorder cannot clear the flag itself (no UPDATE on chunks)", await tryAs(T1, () => db.query(
    `UPDATE public.class_recording_chunks SET below_floor = false WHERE recording_id=$1`, [r.id])), /permission denied/);
  for (const k of await q(`SELECT id, storage_path, byte_size FROM public.class_recording_chunks WHERE recording_id=$1`, [r.id])) {
    await put(T1, k.storage_path, Number(k.byte_size)); await confirm(T1, k.id, SHA("a"));
  }
  // 58 live minutes on both tracks: the teacher speaks for 40, then is silent
  // for 18 (a dead lapel); the room track is silent all along.
  for (let i = 1; i < 58; i++) {
    await travel(r.id, 1);
    await chunkUp(T1, r.id, "teacher", i, i < 40 ? 120_000 : 900, i * 60_000, (i + 1) * 60_000);
    await chunkUp(T1, r.id, "room", i, 500, i * 60_000, (i + 1) * 60_000);
  }
  await setStatus(T1, r.id, "uploading");
  await put(T1, manifestOf(r.id), 300);
  await as(T1, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = 58 WHERE recording_id=$1`, [r.id]));
  eq("a recording with silent chunks still completes: the timeline is whole", await completeRec(T1, r.id), null);
  eq("below-floor chunks are counted in the table as below_floor", (await one(
    `SELECT count(*) FILTER (WHERE below_floor)::int n, count(*)::int a FROM public.class_recording_chunks WHERE recording_id=$1`, [r.id])), { n: 76, a: 116 });
  eq("but never as evidence: 40 live minutes of a 90-minute lesson, the 18 silent ones and the silent room track do not count",
    (await one(`SELECT was_completed, recording_ran_evidence, too_short, verified_audio_ms::int v, verified_lesson_ms::int vl,
                       late_audio_ms::int l, below_floor_ms::int bf, tracks_with_audio
                  FROM public.recorder_session_evidence WHERE recording_id=$1`, [r.id])),
    { was_completed: true, recording_ran_evidence: false, too_short: true, v: 2_400_000, vl: 2_400_000, l: 0, bf: 3_480_000, tracks_with_audio: 1 });
}

console.log("=== evidence is what reached the server LIVE (C1 critic 2, N2) ===");
eq("the late allowance is snapshot at arming: 10 minutes", (await one(
  `SELECT late_after_ms FROM public.class_recordings WHERE id=$1`, [rL.id])).late_after_ms, 600_000);
const evidenceOf = (id) => one(
  `SELECT status, was_completed, recording_ran_evidence, verified_audio_ms::int v, late_audio_ms::int l,
          evidence_threshold_ms::int th, abandon_reason, deleted_by_retention, audio_deleted_at IS NOT NULL AS gone
     FROM public.recorder_session_evidence WHERE recording_id=$1`, [id]);
// A lesson of `mins` minutes that began a minute ago, recorded live for `n`
// one-minute chunks (the whole lesson moves into the past as time "passes").
const liveRec = async (mins, n, uid = T1) => {
  const s = await sessAt(C1, t1, -1, mins - 1);
  const r = await arm(uid, s, { chunk_ms: 60000 });
  await setStatus(uid, r.id, "recording");
  await addTrack(uid, r.id);
  for (let i = 0; i < n; i++) {
    await travel(r.id, 1, true);
    await chunkUp(uid, r.id, "teacher", i, 120_000, i * 60_000, (i + 1) * 60_000);
  }
  return r;
};
const finish = async (id, n, uid = T1) => {
  await put(uid, manifestOf(id), 300);
  await as(uid, () => db.query(`UPDATE public.class_recording_tracks SET chunk_count = $2 WHERE recording_id=$1`, [id, n]));
  return completeRec(uid, id);
};
{
  // The critic's probe: Start inside the window, nothing for three days, Stop, filler.
  const s = await sessAt(C1, t1, -1, 89);
  const r = await arm(T1, s);
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id);
  await travel(r.id, 3 * 24 * 60, true);
  eq("the critic's probe: a Stop three days later is accepted as a call", await setStatus(T1, r.id, "uploading"), null);
  eq("but it is not a Stop: the recording is abandoned, and the real moment is kept, not clamped into the window", (await one(
    `SELECT status, abandon_reason, ended_at > capture_closes_at + interval '2 days' AS real_time, stopped_by
       FROM public.class_recordings WHERE id=$1`, [r.id])),
    { status: "abandoned", abandon_reason: "stopped after the lesson window", real_time: true, stopped_by: T1 });
  refused("and no filler is taken after it", await tryReg(T1, r.id, "teacher", 0, 120_000, SHA("a"), 0, 60_000), /abandoned and takes no more audio/);
  eq("so it is no evidence", (await evidenceOf(r.id)).recording_ran_evidence, false);
}
{
  // Stop on time, but upload a lesson's worth of audio afterwards.
  const s = await sessAt(C1, t1, -1, 89);
  const r = await arm(T1, s, { chunk_ms: 60000 });
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id);
  await travel(r.id, 92, true);
  eq("a Stop inside the window (3 minutes after the lesson) is a Stop", await setStatus(T1, r.id, "uploading"), null);
  eq("at the real moment: ended_at is the server's clock, not moved", (await one(
    `SELECT status, ended_at > scheduled_end AS after_end, ended_at <= capture_closes_at AS in_window FROM public.class_recordings WHERE id=$1`, [r.id])),
    { status: "uploading", after_end: true, in_window: true });
  const lateFlags = [];
  for (let i = 0; i < 92; i++) lateFlags.push((await chunkUp(T1, r.id, "teacher", i, 120_000, i * 60_000, (i + 1) * 60_000)).late);
  eq("audio sent long after the moment it claims is stored, and the server says it is late", [lateFlags[0], lateFlags[50], lateFlags[91]], [true, true, false]);
  eq("it can still complete (all of it is stored and listenable)", await finish(r.id, 92), null);
  const e = await evidenceOf(r.id);
  eq("the critic's probe, offline variant: 92 minutes uploaded after Stop is no evidence: late audio counts for nothing",
    [e.was_completed, e.recording_ran_evidence, e.l >= 80 * 60_000, e.v <= 11 * 60_000], [true, false, true, true]);
}
{
  // The allowance itself: 10 minutes after the moment a chunk claims to end.
  const s = await sessAt(C1, t1, -1, 89);
  const r = await arm(T1, s, { chunk_ms: 60000 });
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id);
  await travel(r.id, 10, true);
  const a = await reg(T1, r.id, "teacher", 0, 120_000, SHA("a"), 0, 60_000);
  eq("a chunk that reaches the server 9 minutes after its end (an offline queue draining) is live", a.late, false);
  await travel(r.id, 12, true);
  const b = await reg(T1, r.id, "teacher", 1, 120_000, SHA("a"), 60_000, 120_000);
  eq("one that reaches it 20 minutes after its end is late", b.late, true);
  eq("registering the first again does not refresh it: still live, and the second still late",
    [(await reg(T1, r.id, "teacher", 0, 120_000, SHA("a"), 0, 60_000)).late, (await reg(T1, r.id, "teacher", 1, 120_000, SHA("a"), 60_000, 120_000)).late],
    [false, true]);
  await setStatus(T1, r.id, "abandoned", `, abandon_reason = 'test'`);
}
{
  // C1 critic 2, N6: only a COMPLETED recording counts.
  const r = await liveRec(10, 6);
  eq("still recording: not evidence", (await evidenceOf(r.id)).recording_ran_evidence, false);
  await setStatus(T1, r.id, "uploading");
  eq("6 live minutes of a 10-minute lesson, stopped, still uploading: enough verified audio, but not evidence (N6)",
    await evidenceOf(r.id).then((e) => [e.v, e.th, e.recording_ran_evidence]), [360_000, 300_000, false]);
  await setStatus(T1, r.id, "abandoned", `, abandon_reason = 'test'`);
  eq("abandoned with all its audio confirmed: not evidence (N6)", await evidenceOf(r.id).then((e) => [e.status, e.v, e.was_completed, e.recording_ran_evidence]),
    ["abandoned", 360_000, false, false]);
}

console.log("=== the BYTES must reach storage live too (C1 critic 3, M1) ===");
{
  // The critic's probe N2a: a 95-minute lesson, every chunk registered as it
  // ends (none late), not one byte uploaded; Stop; three days later the
  // "audio" is uploaded to the registered paths and confirmed; complete.
  const s = await sessAt(C1, t1, -1, 94);
  const r = await arm(T1, s, { chunk_ms: 60000 });
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id);
  const lateFlags = [];
  for (let i = 0; i < 50; i++) {
    await travel(r.id, 1, true);
    lateFlags.push((await reg(T1, r.id, "teacher", i, 120_000, SHA("a"), i * 60_000, (i + 1) * 60_000)).late);
  }
  eq("the critic's probe: 50 minutes registered on time, none late, not a byte uploaded", lateFlags.some((x) => x), false);
  eq("a Stop at 50 minutes, nothing uploaded yet", await setStatus(T1, r.id, "uploading"), null);
  await travel(r.id, 3 * 24 * 60, true);
  let errs = 0;
  for (const k of await q(`SELECT id, storage_path, byte_size FROM public.class_recording_chunks WHERE recording_id=$1 ORDER BY seq`, [r.id])) {
    if (await put(T1, k.storage_path, Number(k.byte_size))) errs++;
    if (await confirm(T1, k.id, SHA("a"))) errs++;
  }
  eq("the bytes uploaded and confirmed three days later are stored", errs, 0);
  eq("and it completes", await finish(r.id, 50), null);
  eq("but the critic's probe is closed: registered on time, uploaded days later is NO evidence, and all of it is late audio (M1)",
    await evidenceOf(r.id).then((e) => [e.was_completed, e.recording_ran_evidence, e.v, e.l, e.th]), [true, false, 0, 3_000_000, 2_850_000]);
}
{
  // The bound itself: confirmed 9 minutes after the chunk's end is live, 11 is late.
  const s = await sessAt(C1, t1, -1, 89);
  const r = await arm(T1, s, { chunk_ms: 60000 });
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id);
  await travel(r.id, 1, true);
  const a = await reg(T1, r.id, "teacher", 0, 120_000, SHA("a"), 0, 60_000);
  await travel(r.id, 1, true);
  const b = await reg(T1, r.id, "teacher", 1, 120_000, SHA("a"), 60_000, 120_000);
  eq("two chunks registered as they end", [a.late, b.late], [false, false]);
  await travel(r.id, 8, true);
  await setStatus(T1, r.id, "uploading");
  await put(T1, a.storage_path, 120_000); await confirm(T1, a.chunk_id, SHA("a"));
  await travel(r.id, 3, true);
  await put(T1, b.storage_path, 120_000); await confirm(T1, b.chunk_id, SHA("a"));
  eq("bytes confirmed 9 minutes after the chunk's end count as live; 11 minutes after, late (M1)",
    await evidenceOf(r.id).then((e) => [e.v, e.l]), [60_000, 60_000]);
  // The registration bound still stands on its own (a state the API cannot
  // reach: registered late, confirmed early), set by hand.
  await raw(`UPDATE public.class_recording_chunks SET registered_at = confirmed_at + interval '2 minutes' WHERE id=$1`, [a.chunk_id]);
  eq("a chunk the server registered 11 minutes after its end is late, whenever its bytes came (N2 bound, by hand)",
    await evidenceOf(r.id).then((e) => [e.v, e.l]), [0, 120_000]);
  await setStatus(T1, r.id, "abandoned", `, abandon_reason = 'test'`);
}

console.log("=== only audio INSIDE the lesson counts toward half of it (C1 critic 3, M2) ===");
// A lesson of `lessonMin` minutes starting `preMin` minutes after the server's
// Start (set exactly, so the boundaries are exact), with one-minute chunks at
// the given minutes of the recording's timeline, each registered and confirmed
// within 5 minutes of its end (live). Stopped at `stopMin`.
const lessonEvidence = (id) => one(
  `SELECT was_completed, recording_ran_evidence, verified_audio_ms::int v, verified_lesson_ms::int vl,
          evidence_threshold_ms::int th, lesson_overlap_ms::int lo
     FROM public.recorder_session_evidence WHERE recording_id=$1`, [id]);
const windowRec = async (preMin, lessonMin, minutes, stopMin, beforeFinish) => {
  const s = await sessAt(C1, t1, -1, lessonMin - 1);
  const r = await arm(T1, s, { chunk_ms: 60000 });
  await setStatus(T1, r.id, "recording");
  await addTrack(T1, r.id);
  await raw(`UPDATE public.class_recordings
                SET scheduled_start = started_at + make_interval(secs => $2::float8 * 60),
                    scheduled_end = started_at + make_interval(secs => ($2::float8 + $3::float8) * 60),
                    capture_opens_at = started_at + make_interval(secs => ($2::float8 - 5) * 60),
                    capture_closes_at = started_at + make_interval(secs => ($2::float8 + $3::float8 + 10) * 60)
              WHERE id=$1`, [r.id, preMin, lessonMin]);
  let seq = 0;
  for (let at = 0; at < stopMin; ) {
    const step = Math.min(5, stopMin - at);
    await travel(r.id, step, true);
    for (const m of minutes) if (m >= at && m + 1 <= at + step) {
      await chunkUp(T1, r.id, "teacher", seq++, 120_000, m * 60_000, (m + 1) * 60_000);
    }
    at += step;
  }
  const stop = await setStatus(T1, r.id, "uploading");
  if (stop) throw new Error(stop);
  if (beforeFinish) await beforeFinish(r);
  const done = await finish(r.id, seq);
  if (done) throw new Error(done);
  return r;
};
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
{
  // The critic's probe N2b: 60-minute lesson; audio for the 5 minutes of
  // pre-roll, the first 15 lesson minutes, and the 10 minutes of grace.
  const r = await windowRec(5, 60, [...range(0, 20), ...range(65, 75)], 75, async (rr) => {
    // C1 critic 3, survivor 1: the owner's manifest under ANOTHER class's prefix.
    refused("the owner cannot upload a manifest under another class's prefix with their own recording id",
      await put(T1, `${C2}/${rr.id}/manifest.json`, 300), /row-level security/);
    refused("nor a chunk", await put(T1, `${C2}/${rr.id}/teacher/000000.webm`, 120_000), /row-level security/);
  });
  eq("the critic's probe: 15 of 60 lesson minutes (plus pre-roll and grace) is NOT evidence; only the 15 lesson minutes are lesson audio (M2)",
    await lessonEvidence(r.id), { was_completed: true, recording_ran_evidence: false, v: 1_800_000, vl: 900_000, th: 1_800_000, lo: 3_600_000 });
}
{
  const r = await windowRec(5, 60, range(5, 35), 65);
  eq("exactly half the lesson, all inside it, is evidence (M2 boundary)",
    await lessonEvidence(r.id).then((e) => [e.recording_ran_evidence, e.vl, e.th]), [true, 1_800_000, 1_800_000]);
  // C1 critic 3, survivor 3: the server-seen overlap with the lesson caps it.
  // A state the API cannot reach (the chunks run past Stop), set by hand.
  const was = (await one(`SELECT ended_at::text e FROM public.class_recordings WHERE id=$1`, [r.id])).e;
  await raw(`UPDATE public.class_recordings SET ended_at = scheduled_start + interval '27 minutes' WHERE id=$1`, [r.id]);
  eq("and it is never more than the server saw run inside the lesson: Stop 27 minutes in caps it at 27 (overlap cap)",
    await lessonEvidence(r.id).then((e) => [e.recording_ran_evidence, e.vl, e.lo]), [false, 1_620_000, 1_620_000]);
  await raw(`UPDATE public.class_recordings SET ended_at = $2::timestamptz WHERE id=$1`, [r.id, was]);
}
{
  // The lesson starts 4.5 minutes in: the chunk of minute 4 holds 30 s of it.
  const r = await windowRec(4.5, 60, range(4, 34), 65);
  eq("a chunk straddling the lesson's start counts only its part inside: 29.5 of 60 minutes is not half (M2)",
    await lessonEvidence(r.id).then((e) => [e.recording_ran_evidence, e.v, e.vl, e.th]), [false, 1_800_000, 1_770_000, 1_800_000]);
  // The byte floor uses only the straddling chunk's bytes inside the lesson
  // (pro rata). Half the floor in every chunk, by hand: 29 x 60 000 + 30 000 B.
  await q(`UPDATE public.class_recording_chunks SET stored_size = 60000 WHERE recording_id=$1`, [r.id]);
  eq("and only that part's share of its bytes counts toward the byte floor (M2, pro rata)",
    (await lessonEvidence(r.id)).vl, 885_000);
  await q(`UPDATE public.class_recording_chunks SET stored_size = byte_size WHERE recording_id=$1`, [r.id]);
}
{
  // The lesson ends 64.5 minutes in: the chunk of minute 64 holds 30 s of it;
  // minute 65 is grace.
  const r = await windowRec(4.5, 60, range(35, 66), 66);
  eq("a chunk straddling the lesson's end counts only its part inside, grace not at all: 29.5 of 60 is not half (M2)",
    await lessonEvidence(r.id).then((e) => [e.recording_ran_evidence, e.v, e.vl]), [false, 1_860_000, 1_770_000]);
}

console.log("=== a deleted recording's files are read by nobody, not an admin (C1 critic 3, survivor 2) ===");
{
  const r = await windowRec(5, 10, range(5, 15), 15);
  const name = `${C1}/${r.id}/teacher/000000.webm`;
  eq("control: an admin reads a complete recording's file", (await rowsAs(ADMIN, `SELECT 1 FROM storage.objects WHERE name=$1`, [name])).length, 1);
  await raw(`UPDATE public.class_recordings SET status = 'deleted', audio_deleted_at = now() WHERE id=$1`, [r.id]);
  eq("marked deleted, a file still left in storage is not readable by an admin", (await rowsAs(ADMIN, `SELECT 1 FROM storage.objects WHERE name=$1`, [name])).length, 0);
  eq("nor by the class teacher", (await rowsAs(T1, `SELECT 1 FROM storage.objects WHERE name=$1`, [name])).length, 0);
}

console.log("=== the page cannot speak with the server's voice (C1 critic 3, m1-m3) ===");
{
  const s = await sessAt(C1, t1, -1, 89);
  const r = await arm(T1, s);
  await setStatus(T1, r.id, "recording");
  eq("m1: the critic's probe - the recorder presets abandon_reason on an open row: accepted as a call",
    await tryAs(T1, () => db.query(`UPDATE public.class_recordings SET abandon_reason = 'session_canceled' WHERE id=$1`, [r.id])), null);
  eq("but nothing is preset", (await one(`SELECT abandon_reason FROM public.class_recordings WHERE id=$1`, [r.id])).abandon_reason, null);
  await setStatus(T1, r.id, "abandoned", `, abandon_reason = ' Session_Canceled '`);
  eq("m1: abandoning with a server reason the server did not give is 'unspecified'",
    (await one(`SELECT status, abandon_reason FROM public.class_recordings WHERE id=$1`, [r.id])), { status: "abandoned", abandon_reason: "unspecified" });
  const s2b = await sessAt(C1, t1, -1, 89);
  const r2 = await arm(T1, s2b);
  await setStatus(T1, r2.id, "recording");
  await setStatus(T1, r2.id, "abandoned", `, abandon_reason = 'the laptop died'`);
  eq("m1: the page's own words are kept", (await one(`SELECT abandon_reason FROM public.class_recordings WHERE id=$1`, [r2.id])).abandon_reason, "the laptop died");
  const s3b = await sessAt(C1, t1, -1, 89);
  const r3 = await arm(T1, s3b);
  await setStatus(T1, r3.id, "recording");
  eq("m1: the server's own path still gives its reason",
    await tryAs(T1, () => db.query(`SELECT public.recorder_request_deletion($1, 'wrong room')`, [r3.id])), null);
  eq("('deletion requested')", (await one(`SELECT abandon_reason FROM public.class_recordings WHERE id=$1`, [r3.id])).abandon_reason, "deletion requested");

  refused("m2: the recorder cannot move a track to another recording",
    await tryAs(T1, () => db.query(`UPDATE public.class_recording_tracks SET recording_id = $2 WHERE recording_id=$1`, [r3.id, r2.id])), /permission denied/);
  refused("m2: nor rename it", await tryAs(T1, () => db.query(`UPDATE public.class_recording_tracks SET track = 'room' WHERE recording_id=$1`, [r3.id])), /permission denied/);
  refused("m2: nor re-date it", await tryAs(T1, () => db.query(`UPDATE public.class_recording_tracks SET created_at = now() WHERE recording_id=$1`, [r3.id])), /permission denied/);

  const s4b = await sessAt(C1, t1, -1, 89);
  const r4 = await arm(T1, s4b);
  await setStatus(T1, r4.id, "recording");
  await addTrack(T1, r4.id);
  eq("m2: but it still describes its track", await tryAs(T1, () => db.query(
    `UPDATE public.class_recording_tracks SET device_label = 'lapel', chunk_count = 0 WHERE recording_id=$1`, [r4.id])), null);
  await setStatus(T1, r4.id, "uploading");
  const before = (await one(`SELECT delete_after::text d FROM public.class_recordings WHERE id=$1`, [r4.id])).d;
  eq("m3: the critic's probe - the recorder forges the deletion flag and moves delete_after: accepted as a call",
    await tryAs(T1, async () => {
      await db.query(`SELECT set_config('recorder.server_write', $1, true)`, [`delete:${r4.id}`]);
      await db.query(`UPDATE public.class_recordings SET delete_after = now() - interval '1 day' WHERE id=$1`, [r4.id]);
    }), null);
  eq("m3: but without a stamped request the date does not move", (await one(
    `SELECT delete_after::text d, deletion_requested_at FROM public.class_recordings WHERE id=$1`, [r4.id])),
    { d: before, deletion_requested_at: null });
  await setStatus(T1, r4.id, "abandoned", `, abandon_reason = 'test'`);
}

console.log("=== deletion: retention keeps a tombstone, a person's early deletion ends the evidence (N3) ===");
{
  const rT = await liveRec(10, 6);
  await setStatus(T1, rT.id, "uploading");
  eq("a verified live recording completes", await finish(rT.id, 6), null);
  eq("and is evidence that a recording ran", (await evidenceOf(rT.id)).recording_ran_evidence, true);
  await as(null, () => db.query(`DELETE FROM storage.objects WHERE bucket_id = $1 AND name LIKE $2`, [BUCKET, `${C1}/${rT.id}/%`]), "service_role");
  refused("files gone, but before its date nobody - not the retention job - may mark it deleted: an early deletion is a request",
    await tryAs(null, () => db.query(`SELECT public.recorder_mark_audio_deleted($1)`, [rT.id]), "service_role"), /not due for deletion/);
  await travel(rT.id, 31 * 24 * 60, true);
  eq("31 days on it is due", (await due("now()")).includes(rT.id), true);
  eq("the retention job marks it deleted", (await rowsAs(null, `SELECT public.recorder_mark_audio_deleted($1) AS d`, [rT.id], "service_role"))[0].d, true);
  eq("the tombstone: deleted by retention after a verified complete recording, it still says a recording ran, and when the audio went",
    await evidenceOf(rT.id).then((e) => [e.status, e.deleted_by_retention, e.gone, e.recording_ran_evidence]), ["deleted", true, true, true]);

  const rQ = await liveRec(10, 6);
  await setStatus(T1, rQ.id, "uploading");
  await finish(rQ.id, 6);
  eq("a second verified recording is evidence", (await evidenceOf(rQ.id)).recording_ran_evidence, true);
  eq("the class teacher asks for its early deletion", await tryAs(T1, () => db.query(
    `SELECT public.recorder_request_deletion($1, 'the wrong class was in the room')`, [rQ.id])), null);
  eq("from that moment it is no evidence - before the audio is even gone", (await evidenceOf(rQ.id)).recording_ran_evidence, false);
  ok("and the request is in the append-only log, by the teacher", (await q(
    `SELECT 1 FROM public.recorder_audit_log WHERE recording_id=$1 AND action='deletion_requested' AND actor=$2`, [rQ.id, T1])).length === 1);
  await as(null, () => db.query(`DELETE FROM storage.objects WHERE bucket_id = $1 AND name LIKE $2`, [BUCKET, `${C1}/${rQ.id}/%`]), "service_role");
  eq("once the job has removed it", (await rowsAs(null, `SELECT public.recorder_mark_audio_deleted($1) AS d`, [rQ.id], "service_role"))[0].d, true);
  eq("it is deleted, not by retention, and still no evidence",
    await evidenceOf(rQ.id).then((e) => [e.status, e.deleted_by_retention, e.recording_ran_evidence]), ["deleted", false, false]);

  const rX = await liveRec(10, 6);
  await setStatus(T1, rX.id, "uploading");
  await finish(rX.id, 6);
  eq("an admin bringing a verified recording's deletion forward", await tryAs(ADMIN, () => db.query(
    `UPDATE public.class_recordings SET delete_after = now() WHERE id=$1`, [rX.id])), null);
  eq("is an early deletion by a person: stamped as a request by the admin, logged, and the evidence ends",
    [(await one(`SELECT deletion_requested_by, deletion_reason FROM public.class_recordings WHERE id=$1`, [rX.id])),
     (await one(`SELECT count(*)::int n FROM public.recorder_audit_log WHERE recording_id=$1 AND action='deletion_requested' AND actor=$2`, [rX.id, ADMIN])).n,
     (await evidenceOf(rX.id)).recording_ran_evidence],
    [{ deletion_requested_by: ADMIN, deletion_reason: "retention brought forward by an admin" }, 1, false]);
}

console.log("=== who stopped it is who pressed Stop (N6) ===");
{
  const s = await sessAt(C1, t1, -1, 89);
  const r = await arm(T1, s);
  await setStatus(T1, r.id, "recording");
  eq("an admin may ask a running recording to stop", await tryAs(ADMIN, () => db.query(
    `UPDATE public.class_recordings SET stop_requested_at = now() - interval '1 day' WHERE id=$1`, [r.id])), null);
  eq("stamped by the server, with the reason", (await one(
    `SELECT stop_requested_at > now() - interval '1 minute' AS now_ish, stop_request_reason FROM public.class_recordings WHERE id=$1`, [r.id])),
    { now_ish: true, stop_request_reason: "admin" });
  eq("an admin stops the teacher's recording", await setStatus(ADMIN, r.id, "uploading", `, stop_reason = 'admin'`), null);
  eq("stopped_by is the admin who pressed Stop, not the owner", (await one(
    `SELECT stopped_by, stop_reason, started_by FROM public.class_recordings WHERE id=$1`, [r.id])),
    { stopped_by: ADMIN, stop_reason: "admin", started_by: T1 });
  await setStatus(T1, r.id, "abandoned", `, abandon_reason = 'test'`);
}

console.log("=== capture only inside the window (F5) ===");
const sEarly = await sessAt(C1, t1, 19, 109);
const rEarly = await arm(T1, sEarly);
ok("a lesson 19 minutes away can be armed (arming is only a row)", rEarly.status === "armed");
refused("but capture cannot start 19 minutes early: it opens 5 minutes before", await setStatus(T1, rEarly.id, "recording"), /Too early: capture opens/);
const sSoon = await sessAt(C1, t1, 4, 94);
const rSoon = await arm(T1, sSoon);
eq("4 minutes before the lesson, capture may start", await setStatus(T1, rSoon.id, "recording", `, client_started_at = now() - interval '20 minutes'`), null);
eq("and its start is the server's clock, not the laptop's 20-minutes-early claim", (await one(
  `SELECT started_at >= capture_opens_at AS inside FROM public.class_recordings WHERE id=$1`, [rSoon.id])).inside, true);
const sW = await sessAt(C1, t1, -80, 1);
const rW = await arm(T1, sW);
await setStatus(T1, rW.id, "recording");
await addTrack(T1, rW.id);
await travel(rW.id, 120, true);
eq("audio up to the end + grace registers", (await tryReg(T1, rW.id, "teacher", 20, 60_000, SHA("a"), 600_000, 630_000)), null);
refused("audio after the end + grace (+15 s) is refused, even while still 'recording'",
  await tryReg(T1, rW.id, "teacher", 22, 60_000, SHA("a"), 660_000, 690_000), /after the lesson window/);
await setStatus(T1, rW.id, "uploading");
// Revision 2 (N2): this used to assert "recorded at the window's end" - the
// silent clamp the critic showed could turn a Stop days later into a valid one.
eq("a Stop long after the window is not clamped into it: the recording is abandoned, at the real moment", (await one(
  `SELECT status, abandon_reason, ended_at > capture_closes_at AS real_time FROM public.class_recordings WHERE id=$1`, [rW.id])),
  { status: "abandoned", abandon_reason: "stopped after the lesson window", real_time: true });
await setStatus(T1, rSoon.id, "abandoned");
await setStatus(T1, rEarly.id, "abandoned");

console.log("=== a lesson cancelled after arming (F10) ===");
const sK1 = await sess(C1, t1), sK2 = await sess(C1, t1);
const rK1 = await arm(T1, sK1), rK2 = await arm(T1, sK2);
await setStatus(T1, rK2.id, "recording");
await q(`UPDATE public.sessions SET status = 'Canceled' WHERE id IN ($1,$2)`, [sK1, sK2]);
eq("the armed recording is abandoned", (await one(`SELECT status, abandon_reason FROM public.class_recordings WHERE id=$1`, [rK1.id])),
  { status: "abandoned", abandon_reason: "session_canceled" });
eq("the running one is told to stop, and keeps what it has", (await one(
  `SELECT status, stop_requested_at IS NOT NULL AS s FROM public.class_recordings WHERE id=$1`, [rK2.id])), { status: "recording", s: true });
await setStatus(T1, rK2.id, "uploading", `, stop_reason = 'session_canceled'`);
eq("and may say it stopped because the lesson was cancelled", (await one(`SELECT stop_reason FROM public.class_recordings WHERE id=$1`, [rK2.id])).stop_reason, "session_canceled");
eq("the server recorded why it asked", (await one(`SELECT stop_request_reason FROM public.class_recordings WHERE id=$1`, [rK2.id])).stop_request_reason, "session_canceled");
{
  // C1 critic 2, N4: the recorder cannot make the stop request itself.
  const sK3 = await sess(C1, t1);
  const rK3 = await arm(T1, sK3);
  await setStatus(T1, rK3.id, "recording");
  await tryAs(T1, () => db.query(`UPDATE public.class_recordings SET stop_requested_at = now() WHERE id=$1`, [rK3.id]));
  await setStatus(T1, rK3.id, "uploading", `, stop_reason = 'session_canceled'`);
  eq("the critic's probe: a teacher who files its own stop request cannot then say the lesson was cancelled (N4)", (await one(
    `SELECT stop_requested_at, stop_reason, stop_request_reason FROM public.class_recordings WHERE id=$1`, [rK3.id])),
    { stop_requested_at: null, stop_reason: "manual", stop_request_reason: null });
  const sK4 = await sess(C1, t1);
  const rK4 = await arm(T1, sK4);
  await setStatus(T1, rK4.id, "recording");
  await q(`UPDATE public.sessions SET status = 'Canceled' WHERE id = $1`, [sK4]);
  await setStatus(T1, rK4.id, "uploading", `, stop_reason = 'switch_off'`);
  eq("nor claim the class was switched off when the lesson was cancelled", (await one(
    `SELECT stop_reason FROM public.class_recordings WHERE id=$1`, [rK4.id])).stop_reason, "manual");
  await setStatus(T1, rK3.id, "abandoned", `, abandon_reason = 'test'`);
  await setStatus(T1, rK4.id, "abandoned", `, abandon_reason = 'test'`);
}

console.log("=== a cover teacher hears only the lesson they covered (F2) ===");
const rSfile = (await one(`SELECT storage_path FROM public.class_recording_chunks WHERE recording_id=$1 AND seq=0`, [rS.id])).storage_path;
const canObj = async (uid, name) => (await rowsAs(uid, `SELECT public.recorder_can_read_object($1) v`, [name]))[0].v;
eq("before any cover, the other class's teacher reads nothing of this class", await counts(T2), NOTHING);
const sFuture = await sess(C1, t2, 59);
eq("the critic's probe: ONE cover lesson 59 days ahead opens nothing - no row, no file", await counts(T2), NOTHING);
eq("and no single file", await canObj(T2, rSfile), false);
const taT2 = (await one(`INSERT INTO public.teaching_assistants (user_id) VALUES ($1) RETURNING id`, [T2])).id;
await q(`INSERT INTO public.class_teaching_assistants (class_id, teaching_assistant_id) VALUES ($1,$2)`, [C1, taT2]);
ok("a teacher of another class who is also this class's TA passes is_teacher_of_class",
  (await one(`SELECT public.is_teacher_of_class($1,$2) c`, [T2, C1])).c === true);
eq("and still reads nothing of the recorder", await counts(T2), NOTHING);
refused("and cannot record a lesson that is not theirs", await tryArm(T2, s1d), /Only a teacher of this class|row-level security/);
const sCov = await sess(C1, t2);
eq("on the day of their cover lesson they see the class's switch", (await counts(T2)).class_recording_settings, 1);
const rCov = await arm(T2, sCov);
ok("and record that lesson", rCov.status === "armed" && rCov.started_by === T2);
refused("but no other lesson of the class", await tryArm(T2, s1d), /Only a teacher of this class/);
await setStatus(T2, rCov.id, "recording");
await addTrack(T2, rCov.id);
await travel(rCov.id, 2);
await chunkUp(T2, rCov.id, "teacher", 0, 64_000, 0, 30_000);
{
  const c = await counts(T2);
  eq("the cover teacher reads their own recording and its file - and none of the class's others",
    [c.class_recordings, c.class_recording_tracks, c.class_recording_chunks, c.files, c.recorder_session_evidence], [1, 1, 1, 1, 1]);
  eq("not the class teacher's file", await canObj(T2, rSfile), false);
  eq("while the class teacher hears the cover lesson too", (await rowsAs(T1, `SELECT 1 FROM public.class_recordings WHERE id=$1`, [rCov.id])).length, 1);
}
{
  // C1 critic 2, N5: a cover teacher taken off the lesson stops adding to it.
  await travel(rCov.id, 1);
  await q(`UPDATE public.sessions SET teacher_id = $2 WHERE id = $1`, [sCov, t1]);
  refused("the critic's probe: the lesson given back to the class teacher, the cover teacher's recorder takes no more audio (N5)",
    await tryReg(T2, rCov.id, "teacher", 1, 64_000, SHA("a"), 30_000, 60_000), /no longer teach this lesson/);
  const sCov2 = await sess(C1, t2);
  const rCov2 = await arm(T2, sCov2);
  await q(`UPDATE public.sessions SET teacher_id = $2 WHERE id = $1`, [sCov2, t1]);
  refused("and one they armed cannot start", await setStatus(T2, rCov2.id, "recording"), /no longer teach this lesson/);
  // No longer a listener, they cannot see the row once it is closed, so
  // closing it is the admin's (or the stale sweep's) job.
  eq("an admin abandons it", await setStatus(ADMIN, rCov2.id, "abandoned", `, abandon_reason = 'cover taken off'`), null);
  await q(`UPDATE public.sessions SET teacher_id = $2 WHERE id = $1`, [sCov, t2]);
  eq("given back to them, it takes audio again", await tryReg(T2, rCov.id, "teacher", 1, 64_000, SHA("a"), 30_000, 60_000), null);
}
await setStatus(T2, rCov.id, "abandoned", `, abandon_reason = 'test'`);
await q(`UPDATE public.sessions SET date = date - 1 WHERE id=$1`, [sCov]);
{
  const c = await counts(T2);
  eq("the next day (a past cover) they still hear their own lesson, and no longer see the class's switch",
    [c.class_recordings, c.files, c.class_recording_settings], [1, 1, 0]);
}
await q(`UPDATE public.teachers SET is_active = false WHERE id=$1`, [t2]);
{
  const c = await counts(T2);
  eq("an archived cover teacher hears nothing at all", [c.class_recordings, c.class_recording_chunks, c.files], [0, 0, 0]);
}
await q(`UPDATE public.teachers SET is_active = true WHERE id=$1`, [t2]);
eq("re-activated, their own lesson is back", (await counts(T2)).class_recordings, 1);
await q(`UPDATE public.teachers SET is_active = false WHERE id=$1`, [t1]);
{
  eq("an archived class teacher is not a teacher of the class (F7)", (await one(`SELECT public.recorder_is_class_teacher($1,$2) c`, [T1, C1])).c, false);
  eq("reads no closed recording of it", (await rowsAs(T1, `SELECT 1 FROM public.class_recordings WHERE status NOT IN ('armed','recording','uploading')`)).length, 0);
  eq("no chunk of one", (await rowsAs(T1,
    `SELECT 1 FROM public.class_recording_chunks k JOIN public.class_recordings r ON r.id = k.recording_id
      WHERE r.status NOT IN ('armed','recording','uploading')`)).length, 0);
  eq("and no file", (await counts(T1)).files, 0);
  refused("and cannot record it", await tryArm(T1, s1d), /Only a teacher of this class|row-level security/);
}
await q(`UPDATE public.teachers SET is_active = true WHERE id=$1`, [t1]);

console.log("=== a child joining without consent switches the class off (F9) ===");
{
  const kOld = (await one(`INSERT INTO public.students (full_name) VALUES ('Hoa') RETURNING id`)).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,'2026-01-01', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1)`, [kOld, C1]);
  eq("an enrolment that has already ended changes nothing", (await one(
    `SELECT recording_enabled FROM public.class_recording_settings WHERE class_id=$1`, [C1])).recording_enabled, true);
  const rJ = await arm(T1, s1d);
  const k6 = await kid("Duc", C1);
  eq("a new child without consent: the class is off at once", (await one(
    `SELECT recording_enabled FROM public.class_recording_settings WHERE class_id=$1`, [C1])).recording_enabled, false);
  eq("and what was armed is abandoned", (await one(`SELECT status FROM public.class_recordings WHERE id=$1`, [rJ.id])).status, "abandoned");
  ok("and the log says why", (await q(
    `SELECT 1 FROM public.recorder_audit_log WHERE action='switch_off_auto' AND class_id=$1 AND detail->>'student_id' = $2`, [C1, k6])).length === 1);
}

console.log("=== storage checks fail closed (F6) ===");
// rS is complete with its files. Reach 'deleted' with the files still there by
// a path the API refuses (trigger off): the DELETE trigger checks again.
await db.exec(`ALTER TABLE public.class_recordings DISABLE TRIGGER class_recordings_before_update`);
await q(`UPDATE public.class_recordings SET status = 'deleted' WHERE id=$1`, [rS.id]);
await db.exec(`ALTER TABLE public.class_recordings ENABLE TRIGGER class_recordings_before_update`);
refused("a row marked deleted by any path is still not removed while its audio is in storage", await tryAs(null, () => db.query(
  `DELETE FROM public.class_recordings WHERE id=$1`, [rS.id]), "service_role"), /Audio is still in storage/);
eq("every function that reads storage.objects runs with row_security = off", (await q(
  `SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND 'row_security=off' = ANY (proconfig) ORDER BY 1`)).map((r) => r.proname),
  ["recorder__recording_before_delete", "recorder__recording_before_update", "recorder_confirm_chunk"]);
{
  const before = (await one(`SELECT count(*)::int n FROM public.class_recordings`)).n;
  let again = null;
  try { await db.exec(readFileSync(REC_MIG, "utf8")); } catch (e) { again = e.message; }
  ok("pasting the migration again over live data succeeds", again === null, again ?? "");
  eq("and changes nothing that was there", [(await one(`SELECT count(*)::int n FROM public.class_recordings`)).n,
    (await one(`SELECT consent_wording_version v FROM public.recorder_settings`)).v], [before, "v2-2027-01"]);
  eq("and after everything, Teacher Transcripts' bucket and its policy are still byte-identical (N1)", await oldBucketState(), OLD_BEFORE);
}
// Production: the pasting role owns the public tables but NOT storage.objects.
// If it is subject to RLS there, the checks must refuse, not pass.
await db.exec(`
  CREATE ROLE mig_owner NOBYPASSRLS;
  GRANT USAGE ON SCHEMA storage, auth TO mig_owner;
  GRANT SELECT ON storage.objects TO mig_owner;
  ALTER TABLE public.recorder_settings OWNER TO mig_owner;
  ALTER TABLE public.class_recording_settings OWNER TO mig_owner;
  ALTER TABLE public.recorder_child_consents OWNER TO mig_owner;
  ALTER TABLE public.recorder_device_profiles OWNER TO mig_owner;
  ALTER TABLE public.class_recordings OWNER TO mig_owner;
  ALTER TABLE public.class_recording_tracks OWNER TO mig_owner;
  ALTER TABLE public.class_recording_chunks OWNER TO mig_owner;
  ALTER TABLE public.class_recording_markers OWNER TO mig_owner;
  ALTER TABLE public.recorder_audit_log OWNER TO mig_owner;
  ALTER FUNCTION public.recorder__recording_before_update() OWNER TO mig_owner;
  ALTER FUNCTION public.recorder__recording_before_delete() OWNER TO mig_owner;
  ALTER FUNCTION public.recorder_confirm_chunk(uuid, text) OWNER TO mig_owner;
`);
refused("an owner that cannot see storage cannot mark audio deleted: it raises (rL's files are all there)", await tryAs(null, () => db.query(
  `SELECT public.recorder_mark_audio_deleted($1)`, [rL.id]), "service_role"), /row-level security policy for table "objects"/);
refused("and the row cannot be removed either", await tryAs(null, () => db.query(
  `DELETE FROM public.class_recordings WHERE id=$1`, [rS.id]), "service_role"), /row-level security policy for table "objects"/);
{
  const open = (await one(`SELECT id FROM public.class_recording_chunks WHERE recording_id=$1 AND confirmed_at IS NULL LIMIT 1`, [rW.id])).id;
  refused("nor can a chunk be confirmed: storage's answer is not 'no file'", await tryAs(T1, () => db.query(
    `SELECT public.recorder_confirm_chunk($1, $2)`, [open, SHA("a")])), /row-level security policy for table "objects"/);
}
eq("both rows are still there", (await one(`SELECT count(*)::int n FROM public.class_recordings WHERE id IN ($1,$2)`, [rL.id, rS.id])).n, 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
