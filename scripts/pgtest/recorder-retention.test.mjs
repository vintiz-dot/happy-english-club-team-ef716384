// recorder-retention, end to end, with no Deno and no Supabase.
//
// supabase/functions/recorder-retention/index.ts is bundled with its remote
// import stubbed and run in Node, against the recorder's fake PostgREST +
// Storage (scripts/recorder/fake-recorder-server.mjs, which follows the
// migration's rules for these calls: recorder_expire_stale and the storage
// list/remove are service-role only, a recording cannot be marked deleted
// while an object is left under its prefix). Checked here: who may run it,
// that it removes exactly the due recordings' files and nothing else, that it
// fails closed (a failed or incomplete removal is never marked deleted), and
// that it logs ids and counts only.
//
// The SQL functions themselves are tested against the real migration in
// recorder.test.mjs; this tests the function that calls them.
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { createFakeServer, BUCKET as FAKE_BUCKET } from "../recorder/fake-recorder-server.mjs";
import { makeClient } from "../recorder/fake-supabase-client.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); ok(n, g === w, g === w ? "" : `got ${g}, want ${w}`); };

const SERVICE_KEY = "service-role-key";
let server = null;
let ghostRemove = false;
globalThis.__fakeCreateClient = (_url, key) => {
  const service = key === SERVICE_KEY;
  return makeClient(async (q) => {
    if (ghostRemove && q.op === "remove") return { data: q.paths.map((name) => ({ name })), error: null }; // says yes, removes nothing
    return server.handle(q, null, service);
  });
};
const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY };
let handler = null;
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => env[k] } };

const bundled = await build({
  entryPoints: [resolve(repo, "supabase/functions/recorder-retention/index.ts")],
  bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
  plugins: [{
    name: "remote-imports",
    setup(b) {
      b.onResolve({ filter: /^https?:\/\// }, (args) => ({ path: args.path, namespace: "remote" }));
      b.onLoad({ filter: /.*/, namespace: "remote" }, () => ({ contents: "export const createClient = (...args) => globalThis.__fakeCreateClient(...args);", loader: "js" }));
    },
  }],
});
const bundlePath = resolve(tmpdir(), `recorderRetention.${process.pid}.mjs`);
writeFileSync(bundlePath, bundled.outputFiles[0].text);
const mod = await import(pathToFileURL(bundlePath).href);
ok("the function registered its handler", typeof handler === "function");
eq("its bucket is the recorder's own (same constant as the engine's fake)", mod.BUCKET, FAKE_BUCKET);
{
  const src = (await import("node:fs")).readFileSync(resolve(repo, "src/lib/recorder/backend.ts"), "utf8");
  ok("and the engine's BUCKET constant says the same", src.includes(`export const BUCKET = "${mod.BUCKET}"`));
}

// Console capture: the function must log ids and counts only.
const logs = [];
const realLog = console.log, realErr = console.error;
const capture = () => { console.log = (...a) => logs.push(a.join(" ")); console.error = (...a) => logs.push(a.join(" ")); };
const release = () => { console.log = realLog; console.error = realErr; };

const NOW = Date.parse("2026-12-20T20:00:00.000Z");
const day = 86400000;
const CLASS = "11111111-1111-4111-8111-111111111111";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER = "22222222-2222-4222-8222-222222222222";

function seed() {
  server = createFakeServer({ now: () => NOW });
  server.addUser(ADMIN, ["admin"]);
  server.addUser(TEACHER, ["teacher"]);
  server.addClass(CLASS, { teachers: [TEACHER] });
  const mk = (id, o) => {
    const r = { id, class_id: CLASS, session_id: null, armed_session_id: id, status: "complete", scheduled_start: new Date(NOW - 40 * day).toISOString(),
      scheduled_end: new Date(NOW - 40 * day + 5400000).toISOString(), capture_closes_at: new Date(NOW - 40 * day + 6000000).toISOString(),
      delete_after: new Date(NOW - 10 * day).toISOString(), audio_deleted_at: null, deletion_requested_at: null, started_by: TEACHER, clock_tolerance_ms: 15000, ...o };
    server.recordings.set(id, r);
    for (const p of o.files ?? ["manifest.json", "teacher/000000.flac", "teacher/000001.flac", "room/000000.flac", "room/000001.flac"])
      server.objects.set(`${FAKE_BUCKET}/${CLASS}/${id}/${p}`, { bytes: new Uint8Array(10), size: 10 });
    return r;
  };
  const due = mk("d0000000-0000-4000-8000-000000000001", {});
  const notDue = mk("d0000000-0000-4000-8000-000000000002", { delete_after: new Date(NOW + 5 * day).toISOString() });
  const stale = mk("d0000000-0000-4000-8000-000000000003", { status: "uploading", delete_after: new Date(NOW - 1 * day).toISOString(), files: ["teacher/000000.flac"] });
  const many = mk("d0000000-0000-4000-8000-000000000004", { files: Array.from({ length: 230 }, (_, i) => `room/${String(i).padStart(6, "0")}.flac`) });
  // Another bucket's file with a lookalike prefix must never be touched.
  server.objects.set(`class-recordings/${CLASS}/${due.id}/transcript.json`, { bytes: new Uint8Array(1), size: 1 });
  return { due, notDue, stale, many };
}
const objectsOf = (id) => [...server.objects.keys()].filter((k) => k.startsWith(`${FAKE_BUCKET}/${CLASS}/${id}/`)).length;

const call = async (headers = {}, body = {}, method = "POST") => {
  capture();
  try {
    const res = await handler(new Request("https://example.supabase.co/functions/v1/recorder-retention", { method, headers: { "content-type": "application/json", ...headers }, body: method === "POST" ? JSON.stringify(body) : undefined }));
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally { release(); }
};

console.log("=== who may run it ===");
{
  seed();
  eq("no credentials: 401", (await call()).status, 401);
  eq("a teacher's JWT: 403", (await call({ authorization: `Bearer jwt-${TEACHER}` })).status, 403);
  eq("the service-role key on its own: 403 (not a way in)", (await call({ authorization: `Bearer ${SERVICE_KEY}` })).status, 403);
  eq("a wrong runner token: 401", (await call({ "x-schedule-runner-secret": "guess" })).status, 401);
  eq("a token one character off: 401", (await call({ "x-schedule-runner-secret": server.runnerToken.slice(0, -1) + "x" })).status, 401);
  eq("GET is refused", (await call({}, {}, "GET")).status, 405);
  ok("nothing was removed by any of those", objectsOf("d0000000-0000-4000-8000-000000000001") === 5);
  eq("an admin with a malformed recording id: 400", (await call({ authorization: `Bearer jwt-${ADMIN}` }, { recording_id: "../../x" })).status, 400);
}

console.log("=== the nightly run ===");
{
  const s = seed();
  logs.length = 0;
  const r = await call({ "x-schedule-runner-secret": server.runnerToken });
  eq("the runner token is accepted", r.status, 200);
  eq("stale upload abandoned first, then due with the others", [r.body.expired_stale, r.body.due, r.body.deleted], [1, 3, 3]);
  eq("objects removed (5 + 1 + 230, in batches of 100)", r.body.objects_removed, 236);
  eq("due recording: files gone, row deleted", [objectsOf(s.due.id), server.recordings.get(s.due.id).status], [0, "deleted"]);
  eq("the stale one too", [objectsOf(s.stale.id), server.recordings.get(s.stale.id).status], [0, "deleted"]);
  eq("not yet due: untouched", [objectsOf(s.notDue.id), server.recordings.get(s.notDue.id).status], [5, "complete"]);
  ok("230 files went in 3 remove calls", server.log.filter((l) => l[0] === "remove").length >= 3);
  ok("the transcript bucket's lookalike file is untouched", server.objects.has(`class-recordings/${CLASS}/${s.due.id}/transcript.json`));
  ok("it never downloaded audio", !server.log.some((l) => l[1] === "download"));
  const text = logs.join("\n");
  ok("logs carry ids and counts", text.includes(s.due.id) && text.includes('"deleted":3'));
  ok("logs carry no file paths", !/teacher\/|room\/|manifest\.json|\.flac/.test(text), text.slice(0, 300));
  const again = await call({ "x-schedule-runner-secret": server.runnerToken });
  eq("a second run finds nothing", [again.body.due, again.body.deleted], [0, 0]);
}

console.log("=== an admin's delete-now for one recording ===");
{
  const s = seed();
  const r = await call({ authorization: `Bearer jwt-${ADMIN}` }, { recording_id: s.due.id });
  eq("admin accepted; only that recording", [r.status, r.body.due, r.body.deleted], [200, 1, 1]);
  eq("the others are left", [objectsOf(s.many.id), server.recordings.get(s.many.id).status], [230, "complete"]);
}

console.log("=== fails closed ===");
{
  let s = seed();
  server.failNext("remove", 1, { message: "storage is down" });
  let r = await call({ "x-schedule-runner-secret": server.runnerToken }, { recording_id: s.due.id });
  eq("a failed remove: not marked deleted", [r.body.deleted, server.recordings.get(s.due.id).status], [0, "complete"]);
  ok("and the reason is reported", r.body.skipped[0]?.recording_id === s.due.id && /remove failed/.test(r.body.skipped[0]?.reason));

  s = seed();
  ghostRemove = true;
  r = await call({ "x-schedule-runner-secret": server.runnerToken }, { recording_id: s.due.id });
  ghostRemove = false;
  eq("storage said yes but the files are still listed: not marked", [r.body.deleted, server.recordings.get(s.due.id).status, objectsOf(s.due.id)], [0, "complete", 5]);
  ok("reported as still listed", /still listed/.test(r.body.skipped[0]?.reason ?? ""));

  s = seed();
  server.failNext("list", 1, { message: "list broke" });
  r = await call({ "x-schedule-runner-secret": server.runnerToken }, { recording_id: s.due.id });
  eq("a failed listing: nothing removed, nothing marked", [r.body.deleted, objectsOf(s.due.id), server.recordings.get(s.due.id).status], [0, 5, "complete"]);

  s = seed();
  const realHandle = server.handle;
  server.handle = async (q, uid, service) => {
    const res = await realHandle(q, uid, service);
    if (q.op === "rpc" && q.fn === "recorder_retention_due") res.data = res.data.map((x) => ({ ...x, storage_prefix: `${CLASS}/` }));
    return res;
  };
  r = await call({ "x-schedule-runner-secret": server.runnerToken });
  eq("a due row whose prefix is not {class}/{recording}/ is skipped, never removed", [r.body.deleted, r.body.objects_removed, objectsOf(s.due.id)], [0, 0, 5]);

  s = seed();
  server.handle = async (q, uid, service) => (q.op === "rpc" && q.fn === "recorder_retention_due" ? { data: null, error: { message: "permission denied" } } : realHandle(q, uid, service));
  r = await call({ "x-schedule-runner-secret": server.runnerToken });
  eq("the due list cannot be read: 500, nothing deleted", [r.status, objectsOf(s.due.id)], [500, 5]);

  s = seed();
  server.handle = async (q, uid, service) => (q.op === "select" && q.table === "schedule_runner" ? { data: null, error: { message: "no table" } } : realHandle(q, uid, service));
  r = await call({ "x-schedule-runner-secret": "runner-secret-token" });
  eq("the token table cannot be read: the token is not accepted", r.status, 401);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
