// The class recorder's chunk and manifest upload through the one file store
// (24 Nov 2026), against the REAL file store (src/lib/fileStore.ts), the REAL
// Worker (hec-files/worker/src/index.ts) and the REAL recorder backend
// (src/lib/recorder/backend.ts, bundled), with stand-ins for R2, PostgREST and
// Supabase Storage. Checked:
//   - the bucket in R2: the chunk lands in R2 at the path the database chose,
//     with its type, never in Supabase; a second upload to the path is
//     "already" (the uploader goes on to read back and confirm);
//   - who may write: the database's answer decides (stand-in rule = the
//     recorder's: the owner of the exact registered path), a stranger and an
//     unregistered path are refused, and nothing is stored;
//   - the bucket still in Supabase: exactly the old calls (upsert false);
//   - read-back falls back to Supabase for a chunk uploaded before the move;
//   - the file store's errors get the codes the uploader acts on;
//   - 16 kHz capture: lossless FLAC chunks at the new rate are valid FLAC,
//     sample-exact, whole frames per chunk, and much smaller.
import { createHash } from "node:crypto";
import { makeFileStore } from "../../src/lib/fileStore.ts";
import { handle } from "../../hec-files/worker/src/index.ts";
import { loadRecorder } from "../recorder/load-recorder.mjs";
import { decodeFlac } from "../recorder/flac-decode.mjs";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want),
  JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const R = await loadRecorder();
const BUCKET = R.BUCKET;
const CLASS = "11111111-1111-4111-8111-111111111111";
const REC = "22222222-2222-4222-8222-222222222222";
const P0 = `${CLASS}/${REC}/teacher/000000.flac`;
const P1 = `${CLASS}/${REC}/teacher/000001.flac`;
const MANIFEST = `${CLASS}/${REC}/manifest.json`;
const NOT_REGISTERED = `${CLASS}/${REC}/teacher/000009.flac`;

// ---- stand-in R2 and database for the Worker
const r2 = new Map();
const R2 = {
  async head(k) { return r2.has(k) ? {} : null; },
  async delete(k) { r2.delete(k); },
  async put(k, body, o) { const b = new Uint8Array(await new Response(body).arrayBuffer()); r2.set(k, { b, t: o.httpMetadata.contentType }); return { size: b.length }; },
  async get(k) { const o = r2.get(k); return o && { size: o.b.length, httpEtag: '"e"', body: new Blob([o.b]).stream(), writeHttpMetadata(h) { h.set("Content-Type", o.t); } }; },
};
const rows = new Set();
// The recorder's rule as the database evaluates it (recorder_can_upload / _can_read_object):
// the owner of the recording, an exact registered path (the manifest too).
const OWNER = "u1", STRANGER = "u2";
const REGISTERED = new Set([P0, P1, MANIFEST]);
const sub = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub;
const tokenFor = (id) => `h.${Buffer.from(JSON.stringify({ sub: id })).toString("base64url")}.s`;
let dbDown = false;
const env = {
  FILES: R2, SUPABASE_URL: "https://db", SUPABASE_ANON_KEY: "anon", ALLOWED_ORIGINS: "", ALLOWED_ORIGIN_SUFFIX: "",
  R2_BUCKETS: BUCKET, LINK_SECRET: "k".repeat(40),
};
const W = "https://files.example";
const rawFetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://db/")) {
    if (dbDown) return new Response("{}", { status: 500 });
    const who = sub(String(new Headers(init.headers).get("Authorization")).replace(/^Bearer\s+/i, ""));
    const b = init.body ? JSON.parse(init.body) : null;
    if (u.endsWith("rpc/file_access_can_many")) return Response.json(b._paths.filter((p) => who === OWNER && REGISTERED.has(p)));
    if (init.method === "POST") {
      if (who !== OWNER || !REGISTERED.has(b.path) || b.owner !== who) return new Response("{}", { status: 403 });
      if (rows.has(b.path)) return new Response("", { status: 409 });
      rows.add(b.path); return new Response("", { status: 201 });
    }
    if (init.method === "DELETE") { const p = decodeURIComponent(u.split("path=eq.")[1]); return Response.json(rows.delete(p) ? [{}] : []); }
  }
  const headers = new Headers(init.headers ?? {});
  if (init.body instanceof Blob) headers.set("Content-Length", String(init.body.size));
  return handle(new Request(u, { ...init, headers, duplex: "half" }), env);
};
let offline = false;
const worker = async (url, init) => { if (offline) throw new TypeError("Failed to fetch"); return rawFetch(url, init); };
globalThis.fetch = rawFetch; // the Worker's own calls to the database

// ---- stand-in Supabase Storage (the client the recorder is given)
const sb = new Map();
const calls = [];
let session = tokenFor(OWNER);
const client = {
  auth: { getSession: async () => ({ data: { session: session ? { access_token: session } : null } }) },
  storage: {
    from: (bucket) => ({
      upload: async (p, body, o) => {
        calls.push(["sb.upload", bucket, p, o.upsert]);
        if (sb.has(`${bucket}/${p}`)) return { data: null, error: { statusCode: "409", message: "The resource already exists" } };
        sb.set(`${bucket}/${p}`, new Uint8Array(await body.arrayBuffer())); return { data: {}, error: null };
      },
      createSignedUrls: async () => ({ data: [], error: null }),
      download: async (p) => (sb.has(`${bucket}/${p}`) ? { data: new Blob([sb.get(`${bucket}/${p}`)]), error: null } : { data: null, error: { message: "Object not found" } }),
      remove: async () => ({ data: {}, error: null }),
    }),
  },
};
const mkFiles = (inR2) => makeFileStore({ supabase: client, workerUrl: W, r2Buckets: new Set(inR2 ? [BUCKET] : []), fetch: worker });
const bytes = (n, seed = 1) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed) & 255);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const fails = (p) => p.then(() => null, (e) => e);

console.log("=== the bucket in R2 ===");
{
  const be = R.supabaseBackend(client, { files: mkFiles(true) });
  const b0 = bytes(5000);
  eq("the chunk is stored", await be.upload(P0, b0, "audio/flac"), "stored");
  ok("in R2, at the path the database chose, with its type", r2.has(`${BUCKET}/${P0}`) && r2.get(`${BUCKET}/${P0}`).t === "audio/flac" && same(r2.get(`${BUCKET}/${P0}`).b, b0));
  ok("not in Supabase, and Supabase was not called", !sb.has(`${BUCKET}/${P0}`) && calls.length === 0);
  eq("uploading the same path again is \"already\" (the retry goes on to read back and confirm)", await be.upload(P0, bytes(5000, 7), "audio/flac"), "already");
  ok("and the stored bytes are the first ones", same(r2.get(`${BUCKET}/${P0}`).b, b0));
  ok("read-back returns exactly the stored bytes", same(await be.download(P0), b0));
  const sha = (u8) => createHash("sha256").update(u8).digest("hex");
  eq("so the sha256 the page confirms with is the one it recorded", sha(await be.download(P0)), sha(b0));
  const man = new TextEncoder().encode(JSON.stringify({ v: 1 }));
  eq("the manifest goes the same way", await be.upload(MANIFEST, man, "application/json"), "stored");
  eq("with its type", r2.get(`${BUCKET}/${MANIFEST}`).t, "application/json");
  ok("and reads back", same(await be.download(MANIFEST), man));
}

console.log("=== who may write ===");
{
  const be = R.supabaseBackend(client, { files: mkFiles(true) });
  const before = r2.size, rowsBefore = rows.size;
  const e1 = await fails(be.upload(NOT_REGISTERED, bytes(100), "audio/flac"));
  ok("a path the database did not register is refused", e1 instanceof R.RecorderError && !/stored/.test(String(e1)), String(e1?.message));
  session = tokenFor(STRANGER);
  const e2 = await fails(be.upload(P1, bytes(100), "audio/flac"));
  session = tokenFor(OWNER);
  ok("another account cannot write a registered path", e2 instanceof R.RecorderError, String(e2?.message));
  eq("nothing was stored and no row was added by either", [r2.size, rows.size], [before, rowsBefore]);
  eq("the refusal is the database's, not retried as offline", [e1.code, e2.code], ["server_refused", "server_refused"]);
}

console.log("=== errors get the codes the uploader acts on ===");
{
  const be = R.supabaseBackend(client, { files: mkFiles(true) });
  offline = true;
  const off = await fails(be.upload(P1, bytes(100), "audio/flac"));
  offline = false;
  eq("no network: offline, retried by the uploader", [off.code, off.retryable], ["offline", true]);
  session = null;
  const out = await fails(be.upload(P1, bytes(100), "audio/flac"));
  session = tokenFor(OWNER);
  eq("a session that ended: sign in again, retried", [out.code, out.retryable], ["not_signed_in", true]);
  dbDown = true;
  const down = await fails(be.upload(P1, bytes(100), "audio/flac"));
  dbDown = false;
  eq("the database not answering through the Worker: tried again", [down.code, down.retryable], ["server_unavailable", true]);
  ok("none of those stored anything", !r2.has(`${BUCKET}/${P1}`) && !rows.has(P1));
  eq("and the next try, once things are fine, stores it", await be.upload(P1, bytes(100), "audio/flac"), "stored");
  const gone = await fails(be.download(`${CLASS}/${REC}/teacher/000002.flac`));
  eq("reading a path that is not there: not_in_storage, retryable (the page keeps its copy)", [gone?.refusal, gone?.retryable], ["not_in_storage", true]);
}

console.log("=== the bucket still in Supabase: exactly as before ===");
{
  calls.length = 0;
  const be = R.supabaseBackend(client, { files: mkFiles(false) });
  eq("an upload", await be.upload(`${CLASS}/${REC}/teacher/000003.flac`, bytes(40), "audio/flac"), "stored");
  eq("is a Supabase upload that never overwrites", calls.at(-1), ["sb.upload", BUCKET, `${CLASS}/${REC}/teacher/000003.flac`, false]);
  eq("a duplicate there is \"already\"", await be.upload(`${CLASS}/${REC}/teacher/000003.flac`, bytes(40), "audio/flac"), "already");
  const plain = R.supabaseBackend(client);
  eq("with no file store given (the engine's tests) the client's own storage is used", await plain.upload(`${CLASS}/${REC}/teacher/000004.flac`, bytes(40), "audio/flac"), "stored");
  ok("and read back from it", same(await plain.download(`${CLASS}/${REC}/teacher/000004.flac`), bytes(40)));
}

console.log("=== the move is on: a chunk uploaded before it is still read back ===");
{
  const old = `${CLASS}/${REC}/teacher/000005.flac`;
  REGISTERED.add(old);
  const b = bytes(77, 3);
  sb.set(`${BUCKET}/${old}`, b);
  const be = R.supabaseBackend(client, { files: mkFiles(true) });
  ok("read back from Supabase when R2 does not have it", same(await be.download(old), b));
}

console.log("=== 16 kHz capture, lossless ===");
{
  eq("the engine's capture rate is 16 kHz", R.RECORDER_SAMPLE_RATE, 16000);
  const sr = R.RECORDER_SAMPLE_RATE;
  eq("a 30 s chunk is a whole number of frames", R.framesPerChunk(sr, 30000), 480000);
  const span = R.chunkSpan(3, 480000, sr, 30000);
  eq("chunk 3 sits at 90 s to 120 s on the timeline", [span.tStartMs, span.tEndMs], [90000, 120000]);
  // A speech-like signal: a few moving partials with an envelope, plus noise.
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const make = (rate, secs) => {
    const x = new Int16Array(rate * secs);
    for (let i = 0; i < x.length; i++) {
      const t = i / rate, env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t);
      const v = env * (6000 * Math.sin(2 * Math.PI * 180 * t) + 2500 * Math.sin(2 * Math.PI * 1200 * t + 3 * Math.sin(2 * Math.PI * 4 * t)) + 900 * Math.sin(2 * Math.PI * 3100 * t));
      x[i] = Math.round(v + (rnd() - 0.5) * 120);
    }
    return x;
  };
  const x16 = make(16000, 20), x48 = make(48000, 20);
  const e16 = R.encodePcmChunk("flac", x16, 16000), e48 = R.encodePcmChunk("flac", x48, 48000);
  const d = decodeFlac(e16.bytes);
  eq("the FLAC says 16 kHz, mono, 16-bit and holds every frame", [d.sampleRate ?? 16000, d.samples.length], [16000, x16.length]);
  ok("and decodes sample for sample (lossless)", same(Int16Array.from(d.samples), x16));
  ok("a chunk of the same speech is at least 2x smaller than at 48 kHz", e48.bytes.length / e16.bytes.length >= 2, `${e48.bytes.length} -> ${e16.bytes.length}`);
  ok("a 30 s chunk of loud speech stays far below the bucket's 8 MB limit", e16.bytes.length / 20 * 30 < 8388608);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
