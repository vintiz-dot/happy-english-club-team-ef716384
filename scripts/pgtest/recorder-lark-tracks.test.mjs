// The Lark import: supabase/migrations/20261128120000_recorder_lark_tracks.sql and src/lib/recorder/larkImport.ts /
// larkEncode.ts (owner, 28 Nov 2026: four LARK MAX 2 transmitters added to a lesson's recording as mic1..mic4).
//
// Part 1 runs the REAL recorder chain in an in-process Postgres, then this migration, and holds:
//   - the track CHECK takes mic1..mic4 and nothing else; a mic track exists only as an import; the page cannot
//     write one through the tracks table's own policy;
//   - only the lesson's teacher or an admin adds a transmitter, to a complete recording whose audio is kept, in a
//     class still switched on; lengths far from the lesson's are refused; resuming the same files carries on,
//     other files or another person are refused;
//   - chunks: path {class}/{recording}/mic<N>/{seq}.flac, at most 4 minutes, t_start = seq x 240 000, never
//     evidence (one registered too soon after the lesson is refused), same bytes again is a no-op;
//   - the upload policy lets only the importer upload a registered, unconfirmed mic chunk; confirm reads R2 or
//     Supabase at the byte count; finish refuses gaps, short coverage and missing files;
//   - the "import in progress" signal, and the deletion rule: never deletable mid-import, deletable again after,
//     a deletion request or a switch-off closes the import; the retention prefix covers mic files, and the row
//     cannot be marked deleted while a mic file is left in R2.
// Part 2 bundles the TypeScript with esbuild: WAV headers (16/24/32-bit int, 32-bit float, EXTENSIBLE, RF64, bext,
// iXML), refusals, transmitter guesses, split-file layout, length checks, the chunk plan, and an encode round trip
// on a generated 32-bit float WAV (decoded by an independent FLAC decoder), deterministic for resume.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { build as esbuild } from "esbuild";
import { decodeFlac } from "../recorder/flac-decode.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const MIGS = process.argv.slice(2);
const find = (s) => MIGS.find((f) => f.includes(s));
const CHAIN = ["20260717090000", "20261111110000", "class_recorder", "lesson_monitor_pilot", "lesson_monitor_cover_earlier",
  "20261124120000_lesson_monitor_voiceprints", "recorder_delete_after_transcribed", "recorder_byte_floor_16khz",
  "recorder_import_recording", "recorder_audio_grace_3h", "recorder_audio_in_r2", "recorder_audio_kept_for_voice_groups",
  "recorder_lark_tracks"].map(find);
if (CHAIN.some((f) => !f)) { console.log("usage: recorder-lark-tracks.test.mjs <its 13 migrations>"); console.log("0 passed, 1 failed"); process.exit(1); }
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const refused = (n, msg, re) => ok(n, msg !== null && re.test(msg), msg === null ? "it was allowed" : msg);

const sibling = readFileSync(resolve(here, "recorder-audio-in-r2.test.mjs"), "utf8");
const cut = (name) => { const a = sibling.indexOf(`const ${name} = \``) + `const ${name} = \``.length; return sibling.slice(a, sibling.indexOf("\n`;", a)); };
const PRELUDE = cut("PRELUDE"), FILE_OBJECTS = cut("FILE_OBJECTS");
if (!PRELUDE.includes("CREATE ROLE") || !FILE_OBJECTS.includes("file_objects")) { console.log("could not read the prelude of recorder-audio-in-r2.test.mjs"); console.log("0 passed, 1 failed"); process.exit(1); }

async function build(upTo) {
  const d = new PGlite();
  await d.exec(PRELUDE);
  await d.exec(FILE_OBJECTS);
  for (const f of CHAIN.slice(0, 2)) await d.exec(readFileSync(f, "utf8"));
  await d.exec(`GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(uuid, uuid) TO authenticated`);
  for (const f of CHAIN.slice(2, upTo)) await d.exec(readFileSync(f, "utf8"));
  return d;
}
const MINE = readFileSync(CHAIN[12], "utf8");

console.log("=== install ===");
{
  const d = await build(10);   // no R2 helpers yet
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK").catch(() => {}); }
  refused("refuses to install without the R2 helpers (20261127090000)", msg, /Refusing to install: the recorder audio in R2/);
}
{
  const d = await build(11);   // R2 but not the voice-group rule
  let msg = null;
  try { await d.exec(MINE); } catch (e) { msg = e.message; await d.exec("ROLLBACK").catch(() => {}); }
  refused("refuses to install without 20261127140000", msg, /voice-group deletion rule/);
}
const db = await build(12);
await db.exec(MINE);
{
  let again = null;
  try { await db.exec(MINE); } catch (e) { again = e.message; }
  ok("installs on the real chain, and a second time", again === null, again ?? "");
}
const q = async (s, p) => (await db.query(s, p)).rows;
const one = async (s, p) => (await q(s, p))[0];
const raw = async (s, p) => { await db.exec(`SET session_replication_role = replica`); try { return await q(s, p); } finally { await db.exec(`SET session_replication_role = DEFAULT`); } };
async function as(uid, fn, role = "authenticated") {
  await db.exec("BEGIN");
  await db.query(`SELECT set_config('test.uid', $1, true)`, [uid ?? ""]);
  if (role) await db.exec(`SET LOCAL ROLE ${role}`);
  try { const out = await fn(); await db.exec("COMMIT"); return out; } catch (e) { await db.exec("ROLLBACK"); throw e; }
}
const tryAs = async (uid, s, p, role) => { try { await as(uid, () => db.query(s, p), role); return null; } catch (e) { return e.message; } };
const callAs = async (uid, s, p, role) => (await as(uid, () => db.query(s, p), role)).rows[0];

// ---------------------------------------------------------------- people, class, consent
const U = (n) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;
const ADMIN = U(1), VICTOR = U(2), OTHER = U(3);
await q(`INSERT INTO auth.users (id) SELECT unnest($1::uuid[])`, [[ADMIN, VICTOR, OTHER]]);
await q(`INSERT INTO public.user_roles VALUES ($1,'admin'),($2,'teacher'),($3,'teacher')`, [ADMIN, VICTOR, OTHER]);
const tVictor = (await one(`INSERT INTO public.teachers (user_id) VALUES ($1) RETURNING id`, [VICTOR])).id;
await q(`INSERT INTO public.teachers (user_id) VALUES ($1)`, [OTHER]);
const MARS = (await one(`INSERT INTO public.classes (name, default_teacher_id) VALUES ('Mars', $1) RETURNING id`, [tVictor])).id;
for (const n of ["A", "B"]) {
  const s = (await one(`INSERT INTO public.students (full_name) VALUES ($1) RETURNING id`, [n])).id;
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date) VALUES ($1, $2, '2026-01-01')`, [s, MARS]);
  await callAs(ADMIN, `SELECT public.recorder_record_child_consent($1, 'granted', 'ZALO')`, [s]);
}
await callAs(ADMIN, `SELECT public.recorder_set_class_recording($1, true, 'v1-2026-11', 'ZALO')`, [MARS]);

let day = 0;
/** A recording of a 90-minute lesson `daysAgo` days ago, by Victor, with its status; started `startedMinAgo` when given. */
const recording = async (status = "complete", startedMinAgo = null) => {
  day++;
  const sid = (await one(`INSERT INTO public.sessions (class_id, teacher_id, date, start_time, end_time, status)
     VALUES ($1, $2, CURRENT_DATE - $3::int, '17:30', '19:00', 'Held') RETURNING id`, [MARS, tVictor, 2 + day])).id;
  const rid = (await raw(
    `INSERT INTO public.class_recordings (class_id, session_id, armed_session_id, session_date, scheduled_start, scheduled_end,
       capture_opens_at, capture_closes_at, status, format, max_duration_ms, min_bytes_per_sec, clock_tolerance_ms,
       late_after_ms, evidence_min_fraction, started_by, started_at, ended_at, completed_at, delete_after, purpose)
     SELECT $1, s.id, s.id, s.date, (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh',
       (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '5 minutes', (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '10 minutes',
       $4, 'flac', 6300000, 1500, 15000, 600000, 0.5, $3,
       COALESCE(now() - $5::int * interval '1 minute', (s.date + s.start_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' - interval '4 minutes'),
       (s.date + s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh' + interval '5 minutes',
       now(), now() + interval '20 days', 'lesson'
     FROM public.sessions s WHERE s.id = $2 RETURNING id`, [MARS, sid, VICTOR, status, startedMinAgo]))[0].id;
  await raw(`INSERT INTO public.class_recording_tracks (recording_id, track, sample_rate, codec) VALUES ($1, 'room', 16000, 'flac'), ($1, 'teacher', 16000, 'flac')`, [rid]);
  return rid;
};
const SRC = (names = ["TX1_0001.WAV"], bytes = 1000) => JSON.stringify({ kind: "lark", transmitter: 1, files: names.map((n) => ({ name: n, bytes })) });
const LESSON = 90 * 60000;
const BEGIN = `SELECT public.recorder_lark_begin($1, $2, $3, $4::jsonb) AS r`;
const CH = `SELECT public.recorder_lark_chunk($1, $2, $3, $4, $5, $6, $7) AS r`;
const CONFIRM = `SELECT public.recorder_lark_confirm((SELECT id FROM public.class_recording_chunks WHERE storage_path = $1), $2) AS r`;
const FINISH = `SELECT public.recorder_lark_finish($1, $2) AS r`;
const audio = (i) => Buffer.from(`fLaC lark ${i} `.repeat(30000));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const inR2 = (path, size) => q(`INSERT INTO public.file_objects (bucket_id, path, owner, size_bytes, mime_type)
  VALUES ('class-recorder-audio', $1, $2, $3, 'audio/flac') ON CONFLICT (bucket_id, path) DO UPDATE SET size_bytes = EXCLUDED.size_bytes`, [path, VICTOR, size]);
const inProgress = async (rid, at = null) => (await callAs(null, `SELECT public.recorder_mic_import_in_progress($1, COALESCE($2::timestamptz, now())) AS r`, [rid, at], "service_role")).r;

console.log("=== the track CHECK and the page's own policy ===");
const R = await recording();
refused("track 'mic5' is refused", await tryAs(null, `INSERT INTO public.class_recording_tracks (recording_id, track, source, import_state) VALUES ($1, 'mic5', '{}', 'importing')`, [R], null), /class_recording_tracks_track_check/);
refused("a mic track that is not an import is refused", await tryAs(null, `INSERT INTO public.class_recording_tracks (recording_id, track) VALUES ($1, 'mic1')`, [R], null), /mic_is_import/);
refused("a teacher/room track cannot carry an import state", await tryAs(null, `UPDATE public.class_recording_tracks SET import_state = 'complete' WHERE recording_id = $1 AND track = 'room'`, [R], null), /mic_is_import/);
const OPEN = await recording("uploading");
refused("the recording's owner cannot write a mic track through the tracks table",
  await tryAs(VICTOR, `INSERT INTO public.class_recording_tracks (recording_id, track, source, import_state, import_by) VALUES ($1, 'mic1', '{}', 'importing', $2)`, [OPEN, VICTOR]),
  /row-level security/);
eq("but still the teacher/room tracks of an open recording, as before",
  await tryAs(VICTOR, `UPDATE public.class_recording_tracks SET device_label = 'lapel' WHERE recording_id = $1 AND track = 'teacher'`, [OPEN]), null);
eq("recorder_path_parts takes mic1..mic4 and nothing else", (await q(`SELECT (public.recorder_path_parts(p)).recording_id IS NOT NULL AS ok FROM unnest($1::text[]) p`,
  [[`${MARS}/${R}/mic1/000000.flac`, `${MARS}/${R}/mic4/000012.flac`, `${MARS}/${R}/mic5/000000.flac`, `${MARS}/${R}/mic/000000.flac`, `${MARS}/${R}/room/000000.flac`]])).map((x) => x.ok),
  [true, true, false, false, true]);

console.log("=== who and when ===");
refused("a teacher of another class cannot add a transmitter", await tryAs(OTHER, BEGIN, [R, 1, LESSON, SRC()]), /Only a teacher of this lesson or an admin/);
refused("nor the service role", await tryAs(null, BEGIN, [R, 1, LESSON, SRC()], "service_role"), /signed-in teacher or admin|permission denied/);
refused("transmitter 5 is refused", await tryAs(VICTOR, BEGIN, [R, 5, LESSON, SRC()]), /1, 2, 3 or 4/);
refused("a recording that is still uploading takes no microphones", await tryAs(VICTOR, BEGIN, [OPEN, 1, LESSON, SRC()]), /complete recording/);
refused("4 hours of audio for a 90-minute lesson is refused", await tryAs(VICTOR, BEGIN, [R, 1, 4 * 3600000, SRC()]), /not this lesson/);
refused("20 minutes of a 90-minute lesson is refused", await tryAs(VICTOR, BEGIN, [R, 1, 20 * 60000, SRC()]), /not the whole lesson/);
refused("no files described is refused", await tryAs(VICTOR, BEGIN, [R, 1, LESSON, JSON.stringify({ files: [] })]), /Describe the transmitter/);
const MIC_MS = 9 * 60000 + 30000;   // a 9.5-minute stand-in (the length rule is checked above; this one uses a short lesson)
await raw(`UPDATE public.class_recordings SET scheduled_end = scheduled_start + interval '20 minutes' WHERE id = $1`, [R]);
const b1 = (await callAs(VICTOR, BEGIN, [R, 1, MIC_MS, SRC(["TX1_0001.WAV", "TX1_0002.WAV"])])).r;
eq("the class's teacher starts transmitter 1", [b1.track, b1.resumed, b1.chunk_ms], ["mic1", false, 240000]);
const trk = await one(`SELECT sample_rate, codec, import_state, import_by = $2 AS mine, expected_ms::int, source -> 'files' -> 1 ->> 'name' AS f2 FROM public.class_recording_tracks WHERE recording_id = $1 AND track = 'mic1'`, [R, VICTOR]);
eq("its track: 16 kHz FLAC, importing, Victor's, the files kept", trk, { sample_rate: 16000, codec: "flac", import_state: "importing", mine: true, expected_ms: MIC_MS, f2: "TX1_0002.WAV" });
eq("the import is in progress", await inProgress(R), true);
eq("the same files again resume", (await callAs(VICTOR, BEGIN, [R, 1, MIC_MS, SRC(["TX1_0001.WAV", "TX1_0002.WAV"])])).r.resumed, true);
refused("other files for the same transmitter are refused", await tryAs(VICTOR, BEGIN, [R, 1, MIC_MS, SRC(["TX1_0009.WAV"])]), /other files/);
refused("another person on the same transmitter is refused", await tryAs(ADMIN, BEGIN, [R, 1, MIC_MS, SRC(["TX1_0001.WAV", "TX1_0002.WAV"])]), /Someone else/);
eq("an admin may add transmitter 2 of the same lesson", (await callAs(ADMIN, BEGIN, [R, 2, MIC_MS, SRC()])).r.track, "mic2");
eq("the audit log has both starts", (await one(`SELECT count(*)::int n FROM public.recorder_audit_log WHERE recording_id = $1 AND action = 'mic_import_started'`, [R])).n, 2);

console.log("=== chunks ===");
const reg = async (uid, rid, tx, seq, a, t0, t1) => (await callAs(uid, CH, [rid, tx, seq, a.length, sha(a), t0, t1])).r;
refused("a chunk not at seq x 4 min is refused", await tryAs(VICTOR, CH, [R, 1, 1, 9000, sha(audio(0)), 100000, 340000]), /not where its number says/);
refused("a chunk longer than 4 minutes is refused", await tryAs(VICTOR, CH, [R, 1, 0, 9000, sha(audio(0)), 0, 300000]), /at most 4 minutes/);
refused("a chunk over 8 MB is refused", await tryAs(VICTOR, CH, [R, 1, 0, 9000000, sha(audio(0)), 0, 240000]), /at most 8 MB/);
refused("a chunk past the transmitter's end is refused", await tryAs(VICTOR, CH, [R, 1, 2, 9000, sha(audio(0)), 480000, 720000]), /ends after the transmitter/);
refused("someone else cannot add chunks to Victor's import", await tryAs(OTHER, CH, [R, 1, 0, audio(0).length, sha(audio(0)), 0, 240000]), /Not a microphone import of yours/);
refused("nor the admin who runs transmitter 2", await tryAs(ADMIN, CH, [R, 1, 0, audio(0).length, sha(audio(0)), 0, 240000]), /Not a microphone import of yours/);
const spans = [[0, 240000], [240000, 480000], [480000, MIC_MS]];
const c0 = await reg(VICTOR, R, 1, 0, audio(0), 0, 240000);
eq("its path is the room track's scheme under mic1", c0.storage_path, `${MARS}/${R}/mic1/000000.flac`);
eq("the same chunk again is a no-op", (await reg(VICTOR, R, 1, 0, audio(0), 0, 240000)).already_registered, true);
refused("other bytes under the same number are refused", await tryAs(VICTOR, CH, [R, 1, 0, audio(9).length, sha(audio(9)), 0, 240000]), /different audio/);
const paths = [c0.storage_path];
for (let i = 1; i < 3; i++) paths.push((await reg(VICTOR, R, 1, i, audio(i), spans[i][0], spans[i][1])).storage_path);
{
  const SOON = await recording("complete", 15);
  await raw(`UPDATE public.class_recordings SET scheduled_end = scheduled_start + interval '20 minutes' WHERE id = $1`, [SOON]);
  await callAs(VICTOR, BEGIN, [SOON, 3, MIC_MS, SRC()]);
  refused("a chunk that the evidence view would count as live is refused (too soon after the lesson)",
    await tryAs(VICTOR, CH, [SOON, 3, 2, audio(2).length, sha(audio(2)), 480000, MIC_MS]), /Too soon/);
}

console.log("=== upload policy ===");
const canUp = async (uid, p) => (await callAs(uid, `SELECT public.recorder_can_upload($1) AS r`, [p])).r;
eq("the importer may upload a registered, unconfirmed mic chunk", await canUp(VICTOR, paths[0]), true);
eq("nobody else may", [await canUp(OTHER, paths[0]), await canUp(ADMIN, paths[0])], [false, false]);
eq("nor an unregistered mic path", await canUp(VICTOR, `${MARS}/${R}/mic1/000007.flac`), false);
{
  const rp = (await callAs(VICTOR, `SELECT public.recorder_register_chunk($1, 'room', 0, $2, $3, 0, 30000) AS r`, [OPEN, audio(0).length, sha(audio(0))]).catch((e) => ({ r: { err: e.message } }))).r;
  if (rp.storage_path) eq("an open recording's own room chunk is uploadable as before", await canUp(VICTOR, rp.storage_path), true);
  else ok("an open recording's own room chunk is uploadable as before", true, `(not registrable in this fixture: ${rp.err})`);
}

console.log("=== confirm ===");
refused("a chunk in neither store is not confirmed", await tryAs(VICTOR, CONFIRM, [paths[0], sha(audio(0))]), /not in storage/);
await inR2(paths[0], audio(0).length - 3);
refused("in R2 at another size it is not confirmed", await tryAs(VICTOR, CONFIRM, [paths[0], sha(audio(0))]), /Storage holds/);
await inR2(paths[0], audio(0).length);
refused("a read-back that does not match is refused", await tryAs(VICTOR, CONFIRM, [paths[0], sha(audio(5))]), /does not match/);
refused("someone else cannot confirm it", await tryAs(OTHER, CONFIRM, [paths[0], sha(audio(0))]), /Not a microphone import of yours|No such microphone chunk/);
refused("nor by the chunk's id", await tryAs(OTHER, `SELECT public.recorder_lark_confirm($1, $2)`, [(await one(`SELECT id FROM public.class_recording_chunks WHERE storage_path = $1`, [paths[0]])).id, sha(audio(0))]), /Not a microphone import of yours/);
eq("in R2 at its size, with the right read-back, it is confirmed", (await callAs(VICTOR, CONFIRM, [paths[0], sha(audio(0))])).r, true);
eq("and no longer uploadable", await canUp(VICTOR, paths[0]), false);
await inR2(paths[1], audio(1).length);
await callAs(VICTOR, CONFIRM, [paths[1], sha(audio(1))]);

console.log("=== finish ===");
refused("not finished while a chunk is unconfirmed", await tryAs(VICTOR, FINISH, [R, 1]), /1 chunk\(s\) of transmitter 1 are not confirmed/);
await q(`INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('class-recorder-audio', $1, $2, jsonb_build_object('size', $3::text))`, [paths[2], VICTOR, audio(2).length]);
await callAs(VICTOR, CONFIRM, [paths[2], sha(audio(2))]);
await q(`DELETE FROM public.file_objects WHERE path = $1`, [paths[1]]);
refused("not finished while a confirmed file has gone from storage", await tryAs(VICTOR, FINISH, [R, 1]), /1 chunk file\(s\) are not in storage/);
await inR2(paths[1], audio(1).length);
refused("someone else cannot finish it", await tryAs(OTHER, FINISH, [R, 1]), /Not a microphone import of yours/);
const fin = (await callAs(VICTOR, FINISH, [R, 1])).r;
eq("finished: three chunks, the whole 9.5 minutes", [fin.chunks, Number(fin.audio_ms)], [3, MIC_MS]);
eq("the track is complete with its counts", await one(`SELECT import_state, chunk_count, total_ms::int, import_completed_at IS NOT NULL AS at FROM public.class_recording_tracks WHERE recording_id = $1 AND track = 'mic1'`, [R]),
  { import_state: "complete", chunk_count: 3, total_ms: MIC_MS, at: true });
eq("finishing again says so", (await callAs(VICTOR, FINISH, [R, 1])).r.already_complete, true);
refused("starting transmitter 1 again is refused", await tryAs(VICTOR, BEGIN, [R, 1, MIC_MS, SRC(["TX1_0001.WAV", "TX1_0002.WAV"])]), /already added/);
refused("no chunk is added after it is complete", await tryAs(VICTOR, CH, [R, 1, 3, 9000, sha(audio(3)), 720000, 730000]), /Not a microphone import of yours/);
{
  const G = await recording();
  await raw(`UPDATE public.class_recordings SET scheduled_end = scheduled_start + interval '20 minutes' WHERE id = $1`, [G]);
  await callAs(VICTOR, BEGIN, [G, 1, MIC_MS, SRC()]);
  const p0 = (await reg(VICTOR, G, 1, 0, audio(0), 0, 240000)).storage_path;
  const p2 = (await reg(VICTOR, G, 1, 2, audio(2), 480000, MIC_MS)).storage_path;
  for (const [p, a] of [[p0, audio(0)], [p2, audio(2)]]) { await inR2(p, a.length); await callAs(VICTOR, CONFIRM, [p, sha(a)]); }
  refused("a missing middle chunk is refused", await tryAs(VICTOR, FINISH, [G, 1]), /Chunks are missing/);
  const S = await recording();
  await raw(`UPDATE public.class_recordings SET scheduled_end = scheduled_start + interval '20 minutes' WHERE id = $1`, [S]);
  await callAs(VICTOR, BEGIN, [S, 1, MIC_MS, SRC()]);
  const s0 = (await reg(VICTOR, S, 1, 0, audio(0), 0, 240000)).storage_path;
  await inR2(s0, audio(0).length); await callAs(VICTOR, CONFIRM, [s0, sha(audio(0))]);
  refused("chunks that stop short of the transmitter's length are refused", await tryAs(VICTOR, FINISH, [S, 1]), /cover 240000 ms, the transmitter recorded/);
}

console.log("=== the signal and the deletion rule ===");
eq("transmitter 2 is still importing: in progress", await inProgress(R), true);
eq("an import untouched for 6 hours no longer holds anything", await inProgress(R, new Date(Date.now() + 7 * 3600000).toISOString()), false);
// A report saved 4 hours ago, no voice groups: due unless a mic import is running.
const s = await one(`SELECT session_id, session_date FROM public.class_recordings WHERE id = $1`, [R]);
await raw(`INSERT INTO public.lesson_monitor_reports (recording_id, class_id, session_id, session_date, teacher_user_id, made_by, made_at, job_version, body)
  VALUES ($1, $2, $3, $4, $5, $5, now() - interval '4 hours', 'pilot-0.1', '{"schema":"hec-lesson-monitor/1"}'::jsonb)`, [R, MARS, s.session_id, s.session_date, VICTOR]);
await raw(`INSERT INTO public.lesson_monitor_runs (recording_id, class_id, outcome, by_user, at) VALUES ($1, $2, 'report_made', $3, now() - interval '4 hours')`, [R, MARS, VICTOR]);
const deletable = async (rid) => (await callAs(null, `SELECT public.recorder_transcribed_audio_deletable($1) AS d`, [rid], "service_role")).d;
const due = async (rid) => (await as(null, () => db.query(`SELECT recording_id, storage_prefix FROM public.recorder_retention_due() WHERE recording_id = $1`, [rid]), "service_role")).rows;
eq("not deletable while transmitter 2 is importing", await deletable(R), false);
eq("and not listed as due", (await due(R)).length, 0);
const m2 = (await callAs(ADMIN, CH, [R, 2, 0, audio(7).length, sha(audio(7)), 0, 240000])).r;
for (let i = 1; i < 3; i++) await callAs(ADMIN, CH, [R, 2, i, audio(7 + i).length, sha(audio(7 + i)), spans[i][0], spans[i][1]]);
for (let i = 0; i < 3; i++) {
  const p = `${MARS}/${R}/mic2/${String(i).padStart(6, "0")}.flac`;
  await inR2(p, audio(7 + i).length); await callAs(ADMIN, CONFIRM, [p, sha(audio(7 + i))]);
}
eq("transmitter 2 finishes", (await callAs(ADMIN, FINISH, [R, 2])).r.chunks, 3);
eq("nothing in progress now", await inProgress(R), false);
eq("deletable again once every import is done", await deletable(R), true);
const d = await due(R);
eq("due, with the prefix that holds the mic files too", [d.length, paths.every((p) => p.startsWith(d[0]?.storage_prefix ?? "-")), m2.storage_path.startsWith(d[0]?.storage_prefix ?? "-")], [1, true, true]);
await q(`DELETE FROM storage.objects WHERE name LIKE $1`, [`${MARS}/${R}/%`]);
await q(`DELETE FROM public.file_objects WHERE path LIKE $1 AND path NOT LIKE $2`, [`${MARS}/${R}/%`, `%/mic2/%`]);
refused("the recording is not marked deleted while a mic file is left in R2",
  await tryAs(null, `SELECT public.recorder_mark_audio_deleted($1)`, [R], "service_role"), /Audio is still in storage/);
await q(`DELETE FROM public.file_objects WHERE path LIKE $1`, [`${MARS}/${R}/%`]);
eq("marked deleted once the mic files are gone too", (await callAs(null, `SELECT public.recorder_mark_audio_deleted($1) AS r`, [R], "service_role")).r, true);
refused("a deleted recording takes no microphones", await tryAs(VICTOR, BEGIN, [R, 3, MIC_MS, SRC()]), /complete recording whose audio is still kept/);

console.log("=== a deletion request and a consent withdrawal ===");
{
  const X = await recording();
  await raw(`UPDATE public.class_recordings SET scheduled_end = scheduled_start + interval '20 minutes' WHERE id = $1`, [X]);
  await callAs(VICTOR, BEGIN, [X, 1, MIC_MS, SRC()]);
  const p = (await reg(VICTOR, X, 1, 0, audio(0), 0, 240000)).storage_path;
  await callAs(VICTOR, `SELECT public.recorder_request_deletion($1, 'parent asked')`, [X]);
  eq("after a deletion request the import is not in progress (nothing holds the deletion)", await inProgress(X), false);
  refused("and takes no more audio", await tryAs(VICTOR, CH, [X, 1, 1, audio(1).length, sha(audio(1)), 240000, 480000]), /Not a microphone import of yours/);
  eq("nor uploads", await canUp(VICTOR, p), false);
  eq("it is due at once, under the prefix that holds its mic files", (await due(X)).map((r) => p.startsWith(r.storage_prefix)), [true]);
  const Y = await recording();
  await raw(`UPDATE public.class_recordings SET scheduled_end = scheduled_start + interval '20 minutes' WHERE id = $1`, [Y]);
  await callAs(VICTOR, BEGIN, [Y, 4, MIC_MS, SRC()]);
  const kid = (await one(`SELECT id FROM public.students WHERE full_name = 'A'`)).id;
  await callAs(ADMIN, `SELECT public.recorder_record_child_consent($1, 'withdrawn', 'parent withdrew')`, [kid]);
  eq("a consent withdrawal (the class switches off) ends the import's hold", await inProgress(Y), false);
  refused("and refuses more audio", await tryAs(VICTOR, CH, [Y, 4, 0, audio(0).length, sha(audio(0)), 0, 240000]), /Not a microphone import of yours/);
  refused("and new transmitters", await tryAs(VICTOR, BEGIN, [Y, 3, MIC_MS, SRC()]), /switched off/);
}
eq("the new functions are closed to anon", (await q(`SELECT proname, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon FROM pg_proc p
  WHERE proname LIKE 'recorder\\_lark\\_%' OR proname IN ('recorder_mic_import_in_progress', 'recorder__mic_import_open') ORDER BY 1`)).map((r) => r.anon),
  [false, false, false, false, false, false]);

// ================================================================ part 2: the TypeScript
console.log("=== WAV parsing, grouping, layout ===");
const bundle = await esbuild({
  stdin: { contents: `export * from "./larkImport"; export * from "./larkEncode";`, resolveDir: resolve(repo, "src/lib/recorder"), loader: "ts" },
  bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent", target: "es2020",
});
const file = resolve(tmpdir(), `hec-lark-import.${process.pid}.${Date.now()}.mjs`);
writeFileSync(file, bundle.outputFiles[0].text);
const L = await import(pathToFileURL(file).href);
eq("LARK_OUT_RATE is the recorder's RECORDER_SAMPLE_RATE",
  L.LARK_OUT_RATE, Number(/export const RECORDER_SAMPLE_RATE = (\d+)/.exec(readFileSync(resolve(repo, "src/lib/recorder/index.ts"), "utf8"))?.[1]));

/** A WAV file in memory. samples: Float64Array of -1..1. */
function makeWav({ rate = 48000, bits = 32, float = true, channels = 1, samples, bext = null, ixml = null, extensible = false, rf64 = false, trailingIxml = null, claimMore = 0 }) {
  const bps = bits / 8, frames = samples.length / channels;
  const data = Buffer.alloc(samples.length * bps);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    if (float) data.writeFloatLE(x, i * 4);
    else if (bits === 16) data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x * 32767))), i * 2);
    else if (bits === 24) data.writeIntLE(Math.max(-8388608, Math.min(8388607, Math.round(x * 8388607))), i * 3, 3);
    else data.writeInt32LE(Math.max(-2147483648, Math.min(2147483647, Math.round(x * 2147483647))), i * 4);
  }
  const chunk = (id, body) => { const h = Buffer.alloc(8); h.write(id, 0, "ascii"); h.writeUInt32LE(body.length, 4); return Buffer.concat([h, body, body.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const fmt = Buffer.alloc(extensible ? 40 : 16);
  fmt.writeUInt16LE(extensible ? 0xfffe : float ? 3 : 1, 0); fmt.writeUInt16LE(channels, 2); fmt.writeUInt32LE(rate, 4);
  fmt.writeUInt32LE(rate * bps * channels, 8); fmt.writeUInt16LE(bps * channels, 12); fmt.writeUInt16LE(bits, 14);
  if (extensible) { fmt.writeUInt16LE(22, 16); fmt.writeUInt16LE(bits, 18); fmt.writeUInt32LE(4, 20); fmt.writeUInt16LE(float ? 3 : 1, 24); }
  const parts = [];
  if (rf64) { const ds = Buffer.alloc(28); ds.writeUInt32LE(data.length, 8); parts.push(chunk("ds64", ds)); }
  parts.push(chunk("fmt ", fmt));
  if (bext) {
    const b = Buffer.alloc(602);
    b.write("Lark Max 2", 256, "ascii"); b.write(bext.date, 320, "ascii"); b.write(bext.time, 330, "ascii");
    b.writeUInt32LE(bext.timeRef % 0x100000000, 338); b.writeUInt32LE(Math.floor(bext.timeRef / 0x100000000), 342);
    parts.push(chunk("bext", b));
  }
  if (ixml) parts.push(chunk("iXML", Buffer.from(ixml)));
  parts.push(chunk("JUNK", Buffer.alloc(100)));
  const dh = Buffer.alloc(8); dh.write("data", 0, "ascii"); dh.writeUInt32LE(rf64 ? 0xffffffff : data.length + claimMore, 4);
  parts.push(dh, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0));
  if (trailingIxml) parts.push(chunk("iXML", Buffer.from(trailingIxml)));
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(12); head.write(rf64 ? "RF64" : "RIFF", 0, "ascii"); head.writeUInt32LE(rf64 ? 0xffffffff : body.length + 4, 4); head.write("WAVE", 8, "ascii");
  return new Uint8Array(Buffer.concat([head, body]));
}
const sine = (n, rate, hz = 440, amp = 0.5, channels = 1) => { const s = new Float64Array(n * channels); for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) s[i * channels + c] = amp * Math.sin(2 * Math.PI * hz * i / rate); return s; };
const parse = (w) => L.parseWavHeader(w, w.length);
const msg = (f) => { try { f(); return null; } catch (e) { return `${e.code}: ${e.message}`; } };
{
  const w = makeWav({ samples: sine(48000, 48000), bext: { date: "2026-11-28", time: "17:31:02", timeRef: 63062 * 48000 + 24000 } });
  const i = parse(w);
  eq("32-bit float with bext: format, frames, duration", [i.container, i.isFloat, i.bitDepth, i.channels, i.sampleRate, i.frames, i.durationMs, i.truncated], ["RIFF", true, 32, 1, 48000, 48000, 1000, false]);
  eq("bext: origination date/time and TimeReference", [i.meta.originationDate, i.meta.originationTime, i.meta.timeReferenceSamples, i.meta.originator], ["2026-11-28", "17:31:02", 63062 * 48000 + 24000, "Lark Max 2"]);
  eq("its recorded start, to the millisecond, on the device's clock", L.recordedStart(i).text, "2026-11-28T17:31:02.500");
}
for (const [bits, float] of [[16, false], [24, false], [32, false]]) {
  const i = parse(makeWav({ samples: sine(4800, 48000), bits, float }));
  eq(`${bits}-bit integer PCM reads`, [i.isFloat, i.bitDepth, i.bytesPerSample, i.frames], [false, bits, bits / 8, 4800]);
}
eq("WAVE_FORMAT_EXTENSIBLE float reads as float", (({ isFloat, bitDepth, formatTag }) => [isFloat, bitDepth, formatTag])(parse(makeWav({ samples: sine(480, 48000), extensible: true }))), [true, 32, 3]);
eq("RF64 (size in ds64) reads", (({ container, frames }) => [container, frames])(parse(makeWav({ samples: sine(4800, 48000), rf64: true }))), ["RF64", 4800]);
eq("stereo is read (mixed to mono when decoded)", parse(makeWav({ samples: sine(480, 48000, 440, 0.5, 2), channels: 2 })).channels, 2);
{
  const w = makeWav({ samples: sine(4800, 48000), claimMore: 96000 });
  eq("a file cut short is read as far as it goes, and flagged", (({ frames, truncated }) => [frames, truncated])(parse(w)), [4800, true]);
}
{
  const w = makeWav({ samples: sine(4800, 48000), trailingIxml: "<BWFXML><TIMESTAMP_SAMPLES_SINCE_MIDNIGHT_HI>0</TIMESTAMP_SAMPLES_SINCE_MIDNIGHT_HI><TIMESTAMP_SAMPLES_SINCE_MIDNIGHT_LO>3027456000</TIMESTAMP_SAMPLES_SINCE_MIDNIGHT_LO><TIMESTAMP_SAMPLE_RATE>48000</TIMESTAMP_SAMPLE_RATE><TIMECODE_RATE>25/1</TIMECODE_RATE></BWFXML>" });
  const i = parse(w);
  ok("iXML after the audio: the header says where", i.afterDataOffset != null);
  L.parseTrailingChunks(i, w.subarray(i.afterDataOffset));
  eq("and its timecode is read", [i.meta.ixml?.samplesSinceMidnight, i.meta.ixml?.timecodeRate, L.recordedStart(i).text], [3027456000, "25/1", "17:31:12.000"]);
}
refused("an MP3 is refused as not WAV", msg(() => L.parseWavHeader(new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 14)), /not_wav/);
refused("an 8-bit WAV is refused", msg(() => parse(makeWav({ samples: sine(48, 48000), bits: 16, float: false }).map((b, k) => (k === 34 ? 8 : b)))), /unsupported.*8-bit/);
refused("a compressed (ADPCM) WAV is refused", msg(() => parse(makeWav({ samples: sine(48, 48000), bits: 16, float: false }).map((b, k) => (k === 20 ? 2 : b)))), /unsupported.*compressed/);

eq("transmitter guesses", ["TX1_0001.WAV", "LARK_MAX2_TX3_20261128.wav", "MIC 2.wav", "Ch4-003.WAV", "REC_0001.WAV", "TX12.WAV"].map((n) => L.guessTransmitter(n)), [1, 3, 2, 4, null, null]);
eq("the folder wins", L.guessTransmitter("REC_0001.WAV", "Lesson/TX4/REC_0001.WAV"), 4);

const lf = (name, info, extra = {}) => ({ key: name, name, bytes: 1, info, ...extra });
const withStart = (frames, time, timeRef) => parse(makeWav({ samples: new Float64Array(frames), bext: { date: "2026-11-28", time, timeRef } }));
{
  const a = withStart(48000 * 10, "17:30:00", 63000 * 48000), b = withStart(48000 * 5, "17:30:10", 63010 * 48000);
  const l = L.layoutTransmitter(1, [lf("TX1_0002.WAV", b), lf("TX1_0001.WAV", a)]);
  eq("split files are ordered by recorded start and joined exactly", [l.placedBy, l.files.map((f) => [f.name, f.offsetMs]), l.durationMs, l.problems], ["start-times", [["TX1_0001.WAV", 0], ["TX1_0002.WAV", 10000]], 15000, []]);
  const c = withStart(48000 * 5, "17:30:40", 63040 * 48000);
  const g = L.layoutTransmitter(1, [lf("TX1_0001.WAV", a), lf("TX1_0003.WAV", c)]);
  eq("a gap the start times show is kept as silence", [g.files[1].offsetMs, g.durationMs, g.notes.some((n) => /30 s of silence/.test(n))], [40000, 45000, true]);
  const o = withStart(48000 * 5, "17:30:05", 63005 * 48000);
  ok("overlapping files are refused", L.layoutTransmitter(1, [lf("a.wav", a), lf("b.wav", o)]).problems.some((p) => /overlap/.test(p)));
  const far = withStart(48000 * 5, "18:30:00", 66600 * 48000);
  ok("a file an hour later is refused as another lesson", L.layoutTransmitter(1, [lf("a.wav", a), lf("b.wav", far)]).problems.some((p) => /not the same lesson/.test(p)));
  const plain = parse(makeWav({ samples: new Float64Array(4800) }));
  const n = L.layoutTransmitter(2, [lf("REC_10.WAV", plain), lf("REC_9.WAV", plain)]);
  eq("without start times: joined end to end by their number", [n.placedBy, n.files.map((f) => [f.name, f.offsetMs])], ["contiguous", [["REC_9.WAV", 0], ["REC_10.WAV", 100]]]);
  ok("different sample rates are refused", L.layoutTransmitter(1, [lf("a.wav", plain), lf("b.wav", parse(makeWav({ samples: new Float64Array(4410), rate: 44100 })))]).problems.some((p) => /different sample rates/.test(p)));
  const src = L.sourceForServer(l);
  eq("the source jsonb: kind, transmitter, start, files", [src.kind, src.transmitter, src.recorded_start, src.files.length, src.files[1].offset_ms, src.bit_depth, src.float],
    ["lark", 1, "2026-11-28T17:30:00.000", 2, 10000, 32, true]);
}
eq("length checks: the lesson, too short, too long, a quarter", [L.checkLength(88 * 60000, LESSON), !!L.checkLength(30000, LESSON), !!L.checkLength(4 * 3600000, LESSON), !!L.checkLength(20 * 60000, LESSON)], [null, true, true, true]);
eq("chunk plan: 9.5 minutes is 4 + 4 + 1.5", L.chunkPlan(MIC_MS * 16).map((c) => [c.seq, c.tStartMs, c.tEndMs]), [[0, 0, 240000], [1, 240000, 480000], [2, 480000, MIC_MS]]);

console.log("=== encode round trip (32-bit float, 48 kHz, two split files) ===");
{
  const rate = 48000, f1 = 48000 * 150, f2 = 48000 * 120;          // 2.5 min + 2 min = 4.5 min: two chunks
  const all = new Float64Array(f1 + f2);
  for (let i = 0; i < all.length; i++) all[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / rate);
  const w1 = makeWav({ samples: all.subarray(0, f1), bext: { date: "2026-11-28", time: "17:30:00", timeRef: 63000 * rate } });
  const w2 = makeWav({ samples: all.subarray(f1), bext: { date: "2026-11-28", time: "17:32:30", timeRef: 63150 * rate } });
  const store = { "TX1_0001.WAV": w1, "TX1_0002.WAV": w2 };
  const l = L.layoutTransmitter(1, [lf("TX1_0001.WAV", parse(w1)), lf("TX1_0002.WAV", parse(w2))]);
  eq("the two files are one 4.5-minute timeline", [l.durationMs, l.problems.length], [270000, 0]);
  const plan = L.encodePlan(l);
  let reads = 0, biggest = 0;
  const read = async (key, a, b) => { reads++; biggest = Math.max(biggest, b - a); return store[key].subarray(a, b); };
  const spans = L.chunkPlan(l.outFrames);
  const chunks = [];
  for (const s of spans) chunks.push(await L.encodeLarkChunk(plan, s, read));
  eq("two chunks, 4 min and 30 s", chunks.map((c) => [c.tStartMs, c.tEndMs]), [[0, 240000], [240000, 270000]]);
  ok("no read is larger than 8 MB (the source is streamed)", biggest <= 8 << 20, `${biggest} bytes`);
  const dec = chunks.map((c) => decodeFlac(c.bytes));
  eq("each chunk is valid 16 kHz FLAC of its length", dec.map((x) => [x.sampleRate, x.samples.length]), [[16000, 240 * 16000], [16000, 30 * 16000]]);
  const joined = new Int16Array(dec[0].samples.length + dec[1].samples.length);
  joined.set(dec[0].samples); joined.set(dec[1].samples, dec[0].samples.length);
  let maxErr = 0;
  for (let i = 200; i < joined.length - 200; i++) {
    const want = Math.round(0.5 * 32767 * Math.sin(2 * Math.PI * 440 * i / 16000));
    maxErr = Math.max(maxErr, Math.abs(joined[i] - want));
  }
  ok("decoded = the 440 Hz sine at 16 kHz, across the file join and the chunk join (max error < 40 of 32767)", maxErr < 40, `max error ${maxErr}`);
  eq("over full scale (a 32-bit float transmitter) is clipped, never wrapped", Array.from(L.toInt16(new Float32Array([1.7, -2, 0.5, -0.5]))), [32767, -32768, 16384, -16383]);
  const again = await L.encodeLarkChunk(plan, spans[1], read);
  eq("making a chunk again gives the same bytes (resume)", again.sha256, chunks[1].sha256);
  eq("its SHA-256 is of the bytes", chunks[0].sha256, sha(Buffer.from(chunks[0].bytes)));
  ok("a 4-minute chunk is well inside the 8 MB limit", chunks[0].bytes.length < 8388608, `${chunks[0].bytes.length} bytes`);
  // 24-bit integer stereo at 44.1 kHz: a non-integer ratio, channels mixed.
  const r2 = 44100, st = sine(r2 * 3, r2, 1000, 0.4, 2);
  const w3 = makeWav({ samples: st, rate: r2, bits: 24, float: false, channels: 2 });
  const l3 = L.layoutTransmitter(3, [lf("x.wav", parse(w3))]);
  const c3 = await L.encodeLarkChunk(L.encodePlan(l3), L.chunkPlan(l3.outFrames)[0], async (k, a, b) => w3.subarray(a, b));
  const d3 = decodeFlac(c3.bytes).samples;
  let e3 = 0;
  for (let i = 300; i < d3.length - 300; i++) e3 = Math.max(e3, Math.abs(d3[i] - Math.round(0.4 * 32767 * Math.sin(2 * Math.PI * 1000 * i / 16000))));
  ok("24-bit stereo 44.1 kHz resamples to the same tone (max error < 60)", e3 < 60, `max error ${e3}`);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
