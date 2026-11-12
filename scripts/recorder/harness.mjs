// Browser harness for the recorder capture core: an HTTP server (port 5352
// by default) serving a test page, the recorder bundled for the browser, the
// fake supabase client, and the fake server behind POST /fake; plus a
// Chromium launcher with Chrome's fake media devices fed from a lesson WAV.
//
// Playwright is not a dependency of this repo: it is imported by path from an
// existing install (default C:\Users\Dell\hec-tools\a0-harness, override with
// PLAYWRIGHT_DIR), and the browser from the existing ms-playwright cache
// (override with CHROME_EXE). Audio is read in place from
// C:\Users\Dell\hec-audio-eval (override with RECORDER_WAV); nothing is copied
// into the repo.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { bundleRecorder, repo } from "./load-recorder.mjs";
import { createFakeServer } from "./fake-recorder-server.mjs";

export const PORT = Number(process.env.RECORDER_PORT ?? 5352);
export const WAV = process.env.RECORDER_WAV ?? "C:\\Users\\Dell\\hec-audio-eval\\work\\wav16k\\lessons\\242 Lang Street Lane 19.wav";
const PW_DIR = process.env.PLAYWRIGHT_DIR ?? "C:\\Users\\Dell\\hec-tools\\a0-harness";
const CHROME = process.env.CHROME_EXE ?? "C:/Users/Dell/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe";

export async function playwright() {
  const p = resolve(PW_DIR, "node_modules", "playwright", "index.mjs");
  if (!existsSync(p)) throw new Error(`Playwright not found at ${p} (set PLAYWRIGHT_DIR)`);
  return import(pathToFileURL(p).href);
}

const PAGE = `<!doctype html><meta charset="utf-8"><title>recorder harness</title>
<body><p id="s">recorder harness</p>
<script type="module">
import * as R from "/recorder.js";
import { makeClient, httpTransport } from "/fake-client.js";
window.R = R;
window.mkBackend = (uid) => R.supabaseBackend(makeClient(httpTransport(location.origin, () => uid)));
// Build a recorder on Chrome's two fake inputs: teacher = "Fake Audio Input 1", room = "Fake Audio Input 2".
window.setup = async ({ uid, format = "flac", chunkMs = 10000, tap = false }) => {
  const s = await navigator.mediaDevices.getUserMedia({ audio: true });
  s.getTracks().forEach((t) => t.stop());
  const devs = R.realInputs((await navigator.mediaDevices.enumerateDevices()).map((d) => ({ deviceId: d.deviceId, groupId: d.groupId, label: d.label, kind: d.kind })));
  const pick = (d) => ({ deviceId: d.deviceId, groupId: d.groupId, label: d.label });
  const profile = { version: 1, installId: R.getInstallId(), userId: uid, teacher: pick(devs[0]), room: pick(devs[1]), checks: {}, verifiedAt: null };
  const rec = await R.createRecorder({ backend: mkBackend(uid), userId: uid, profile, format, chunkMs, storageRefuseBytes: 0, storageWarnBytes: 0 });
  const log = { errors: [], states: [], chunks: [], health: [], constraints: [], ups: [], storage: [] };
  rec.on("error", (e) => log.errors.push({ code: e.code, refusal: e.refusal ?? null, message: e.message }));
  rec.on("state", (e) => log.states.push(e.state));
  rec.on("chunk", (c) => log.chunks.push({ track: c.track, seq: c.seq, state: c.state, bytes: c.byteSize, encoding: c.encoding, t: Date.now(), late: !!c.late }));
  rec.on("health", (h) => log.health.push({ kind: h.kind, track: h.track ?? null }));
  rec.on("constraints", (c) => log.constraints.push(c));
  rec.on("upload", (p) => log.ups.push({ t: Date.now(), confirmed: p.confirmed, pending: p.pending, offline: p.offline, late: p.late }));
  rec.on("storage", (s) => log.storage.push(s));
  window.rec = rec; window.log = log;
  window.tapped = { teacher: [], room: [] };
  if (tap) {
    const src = rec.o.source, inner = src.onBatch;
    src.onBatch = (b) => { window.tapped.teacher.push([b.frame, b.teacher.slice()]); window.tapped.room.push([b.frame, b.room.slice()]); inner(b); };
  }
  return { profile, devices: devs.map((d) => d.label) };
};
// Decode the stored chunks of a track with Chrome's own decoder and compare with what the worklet delivered.
window.compareTrack = async (track, objects) => {
  const t0 = rec.active?.chunker?.t0Frame ?? window.lastT0;
  const ctx = new OfflineAudioContext(1, 1, 48000);
  const parts = [];
  for (const b64 of objects) {
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const ab = await ctx.decodeAudioData(u.buffer);
    parts.push(ab.getChannelData(0));
  }
  const decoded = new Int16Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { const i16 = new Int16Array(p.length); R.floatToInt16(p, i16); decoded.set(i16, o); o += p.length; }
  // the source from t0
  const src = new Int16Array(decoded.length); let k = 0;
  for (const [frame, x] of window.tapped[track]) { const i16 = new Int16Array(x.length); R.floatToInt16(x, i16); for (let i = 0; i < x.length && k < src.length; i++) if (frame + i >= t0) src[k++] = i16[i]; }
  let diff = 0, first = -1;
  for (let i = 0; i < Math.min(k, decoded.length); i++) if (src[i] !== decoded[i]) { diff++; if (first < 0) first = i; }
  let energy = 0; for (let i = 0; i < decoded.length; i += 7) energy += Math.abs(decoded[i]);
  return { decoded: decoded.length, compared: Math.min(k, decoded.length), differing: diff, firstDiff: first, meanAbs: energy / (decoded.length / 7), chunks: parts.map((p) => p.length) };
};
window.harnessReady = true;
</script>`;

export async function startHarness() {
  const server = createFakeServer();
  const recorderJs = await bundleRecorder({ platform: "browser" });
  const clientJs = readFileSync(resolve(repo, "scripts/recorder/fake-supabase-client.mjs"), "utf8");
  const http = createServer(async (req, res) => {
    try {
      if (req.method === "POST" && req.url === "/fake") {
        let body = "";
        for await (const c of req) body += c;
        const q = JSON.parse(body);
        const uid = req.headers["x-user"] || null;
        let out;
        try { out = await server.handle(q, uid, false); } catch (e) { res.writeHead(503); res.end(String(e?.message ?? e)); return; }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(out));
        return;
      }
      const types = { "/": ["text/html", PAGE], "/recorder.js": ["text/javascript", recorderJs], "/fake-client.js": ["text/javascript", clientJs] };
      const t = types[req.url.split("?")[0]];
      if (!t) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "content-type": t[0], "cache-control": "no-store" });
      res.end(t[1]);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  await new Promise((ok) => http.listen(PORT, "127.0.0.1", ok));
  return { server, http, url: `http://localhost:${PORT}/`, close: () => new Promise((ok) => http.close(ok)) };
}

/**
 * Chromium with Chrome's fake media devices. `realistic: true` removes the
 * Playwright switches that disable background throttling and renderer
 * backgrounding, so hidden-tab behaviour is Chrome's own.
 */
export async function launch({ headless = true, realistic = false, extraArgs = [], wav = WAV } = {}) {
  const { chromium } = await playwright();
  const ignore = realistic ? ["--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] : [];
  return chromium.launch({
    headless, executablePath: CHROME, ignoreDefaultArgs: ignore,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, ...extraArgs],
  });
}

export const TEACHER = "22222222-2222-4222-8222-222222222222";
export const CLASS = "11111111-1111-4111-8111-111111111111";

/** A class and a lesson starting `inMs` from now (capture opens 5 min before: i.e. at once when inMs <= 5 min). */
export function lesson(server, { inMs = 4 * 60000, lengthMs = 90 * 60000, classId = CLASS } = {}) {
  if (!server.users.has(TEACHER)) server.addUser(TEACHER, ["teacher"]);
  if (!server.classes.has(classId)) server.addClass(classId, { teachers: [TEACHER] });
  const sid = crypto.randomUUID();
  const start = Date.now() + inMs;
  server.addSession(sid, { class_id: classId, start, end: start + lengthMs, teacher_id: TEACHER });
  const hanoi = (ms) => new Date(ms + 7 * 3600000).toISOString();
  return { sessionId: sid, classId, date: hanoi(start).slice(0, 10), startTime: hanoi(start).slice(11, 19), endTime: hanoi(start + lengthMs).slice(11, 19) };
}
