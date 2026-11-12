// Long measurements (minutes of real time). Not part of any test total.
//
//   node scripts/recorder/measure.mjs --run=formats [--minutes=32]
//       FLAC and Opus side by side (two pages, one browser), 30 s chunks:
//       bytes per minute per track, main-thread cost (CDP TaskDuration and the
//       encoder's own time), inter-track offset at minute 1 and at the end
//       (cross-correlation of teacher vs room - Chrome's fake inputs play the
//       same file, so the offset between them is measurable).
//   node scripts/recorder/measure.mjs --run=hidden [--minutes=11]
//       headed, Chrome's own background throttling ON (Playwright's switches
//       removed), the recorder tab hidden behind another tab: frames delivered
//       vs context time, setInterval wake-ups per minute, chunks stored and
//       confirmed per minute while hidden.
//
// Results go to C:\Users\Dell\hec-tools\c2-harness\measure-<run>.json.
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { startHarness, launch, lesson } from "./harness.mjs";
import { b64 } from "./fake-supabase-client.mjs";
import { BUCKET } from "./fake-recorder-server.mjs";
import { decodeFlac } from "./flac-decode.mjs";

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split("=")[1];
const run = arg("run", "formats");
const minutes = Number(arg("minutes", run === "hidden" ? 11 : 32));
const OUT = "C:\\Users\\Dell\\hec-tools\\c2-harness";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = "22222222-2222-4222-8222-222222222222";
const out = { run, minutes, startedAt: new Date().toISOString() };
const save = () => { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}\\measure-${run}.json`, JSON.stringify(out, null, 2)); };

/** Lag (in samples) of b relative to a that maximises correlation, searching +-maxLag. */
function bestLag(a, b, maxLag = 4800) {
  let best = 0, bestV = -Infinity;
  const n = Math.min(a.length, b.length) - 2 * maxLag;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = maxLag; i < maxLag + n; i += 3) s += a[i] * b[i + lag];
    if (s > bestV) { bestV = s; best = lag; }
  }
  return best;
}

const H = await startHarness();
const browser = await launch({ headless: run !== "hidden", realistic: run === "hidden" });
const newPage = async (ctx) => {
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  await page.goto(H.url);
  await page.waitForFunction(() => window.harnessReady === true);
  return page;
};

try {
  if (run === "formats") {
    const pages = {};
    const rows = {};
    for (const [i, format] of ["flac", "opus-webm"].entries()) {
      const ctx = await browser.newContext({ permissions: ["microphone"] });
      const page = await newPage(ctx);
      const L = lesson(H.server, { lengthMs: (minutes + 20) * 60000, classId: `1111111${i}-1111-4111-8111-111111111111` });
      await page.evaluate(async (format) => { await setup({ uid: "22222222-2222-4222-8222-222222222222", format, chunkMs: 30000 }); await rec.prepare(); }, format);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Performance.enable");
      rows[format] = await page.evaluate(async (L) => rec.arm(L), L);
      pages[format] = { page, cdp };
    }
    await sleep(3000);
    const m0 = {};
    for (const f of Object.keys(pages)) m0[f] = Object.fromEntries((await pages[f].cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const t0 = Date.now();
    while (Date.now() - t0 < minutes * 60000) { await sleep(60000); console.log(`  ${Math.round((Date.now() - t0) / 60000)} min`); }
    for (const f of Object.keys(pages)) {
      const m1 = Object.fromEntries((await pages[f].cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
      const audioMin = (Date.now() - t0) / 60000;
      out[f] = { mainThreadTaskSecPerAudioMin: +((m1.TaskDuration - m0[f].TaskDuration) / audioMin).toFixed(3), scriptSecPerAudioMin: +((m1.ScriptDuration - m0[f].ScriptDuration) / audioMin).toFixed(3), jsHeapMB: +(m1.JSHeapUsedSize / 1e6).toFixed(1) };
      await pages[f].page.evaluate(() => rec.stop());
    }
    for (let i = 0; i < 240; i++) { if (Object.values(rows).every((r) => H.server.recordings.get(r.id).status === "complete")) break; await sleep(1000); }
    for (const f of Object.keys(pages)) {
      const id = rows[f].id;
      const status = H.server.recordings.get(id).status;
      const chunks = H.server.chunkRows(id);
      const per = {};
      for (const tr of ["teacher", "room"]) {
        const mine = chunks.filter((c) => c.track === tr).sort((a, b) => a.seq - b.seq);
        const full = mine.slice(0, -1);
        const bytes = full.reduce((s, c) => s + c.byte_size, 0), ms = full.reduce((s, c) => s + c.t_end_ms - c.t_start_ms, 0);
        per[tr] = { chunks: mine.length, bytesPerSec: Math.round(bytes / (ms / 1000)), mbPerMin: +(bytes / (ms / 60000) / 1e6).toFixed(3), totalMB: +(mine.reduce((s, c) => s + c.byte_size, 0) / 1e6).toFixed(1), lastEndMs: mine.at(-1)?.t_end_ms };
      }
      const log = await pages[f].page.evaluate(() => window.log);
      const enc = log.chunks.filter((c) => c.encodeMs != null).map((c) => c.encodeMs);
      out[f] = { ...out[f], status, tracks: per, errors: log.errors.slice(0, 5), encodeMsPerChunkMean: enc.length ? +(enc.reduce((a, b) => a + b, 0) / enc.length).toFixed(1) : null, encodeMsPerChunkMax: enc.length ? Math.max(...enc) : null };
      // Inter-track offset at the start and at the end.
      const grab = async (tr, seqs) => {
        if (f === "flac") {
          return seqs.map((s) => { const c = chunks.find((x) => x.track === tr && x.seq === s); return Float32Array.from(decodeFlac(H.server.objects.get(`${BUCKET}/${c.storage_path}`).bytes).samples); });
        }
        const objs = chunks.filter((c) => c.track === tr).sort((a, b) => a.seq - b.seq).map((c) => b64.enc(H.server.objects.get(`${BUCKET}/${c.storage_path}`).bytes));
        return pages[f].page.evaluate(async ({ objs, seqs }) => {
          const u8 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
          const all = objs.map(u8); const joined = new Uint8Array(all.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of all) { joined.set(a, o); o += a.length; }
          const ab = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(joined.buffer);
          const d = ab.getChannelData(0);
          return seqs.map((s) => Array.from(d.subarray(s * 1440000, s * 1440000 + 480000)));
        }, { objs, seqs }).then((arr) => arr.map((a) => Float32Array.from(a)));
      };
      const last = Math.min(per.teacher.chunks, per.room.chunks) - 2;
      const tw = await grab("teacher", [2, last]), rw = await grab("room", [2, last]);
      const lagStart = bestLag(tw[0].subarray(0, 480000), rw[0].subarray(0, 480000));
      const lagEnd = bestLag(tw[1].subarray(0, 480000), rw[1].subarray(0, 480000));
      out[f].interTrack = { atMinute: [1, +(last * 0.5).toFixed(1)], lagSamples: [lagStart, lagEnd], lagMs: [lagStart / 48, lagEnd / 48], driftMs: (lagEnd - lagStart) / 48 };
      console.log(f, JSON.stringify(out[f]));
      save();
    }
  }

  if (run === "hidden") {
    const ctx = await browser.newContext({ permissions: ["microphone"] });
    const page = await newPage(ctx);
    const L = lesson(H.server, { lengthMs: (minutes + 20) * 60000 });
    await page.evaluate(async () => {
      await setup({ uid: "22222222-2222-4222-8222-222222222222", format: "flac", chunkMs: 30000 });
      await rec.prepare();
      window.probe = { ticks: [], frames: [] };
      setInterval(() => window.probe.ticks.push(Date.now()), 1000);
      setInterval(() => window.probe.frames.push([Date.now(), rec.o.source.graph.framesDelivered, rec.o.source.graph.ctx.currentTime, document.visibilityState]), 10000);
    });
    const row = await page.evaluate(async (L) => rec.arm(L), L);
    await sleep(5000);
    const other = await ctx.newPage();
    await other.goto("about:blank");
    await other.bringToFront();
    await sleep(2000);
    out.visibilityWhileBehind = await page.evaluate(() => document.visibilityState);
    const hiddenFrom = Date.now();
    const pc = spawnSync("powercfg", ["/requests"], { encoding: "utf8" });
    out.powercfg = (pc.stdout || pc.stderr || String(pc.error)).trim().slice(0, 1500);
    while (Date.now() - hiddenFrom < minutes * 60000) { await sleep(60000); console.log(`  hidden ${Math.round((Date.now() - hiddenFrom) / 60000)} min`); }
    const hiddenTo = Date.now();
    await page.bringToFront();
    await sleep(1500);
    const p = await page.evaluate(() => ({ probe: window.probe, log: window.log, state: rec.state, sr: rec.o.source.sampleRate }));
    const perMin = (ts) => { const b = {}; for (const t of ts) { if (t < hiddenFrom || t > hiddenTo) continue; const k = Math.floor((t - hiddenFrom) / 60000); b[k] = (b[k] ?? 0) + 1; } return b; };
    out.intervalWakeupsPerHiddenMinute = perMin(p.probe.ticks);
    out.chunksStoredPerHiddenMinute = perMin(p.log.chunks.filter((c) => c.state === "captured").map((c) => c.t));
    const conf = H.server.chunkRows(row.id).filter((c) => c.confirmed_at).map((c) => Date.parse(c.confirmed_at));
    out.chunksConfirmedPerHiddenMinute = perMin(conf);
    const fr = p.probe.frames.filter(([t]) => t >= hiddenFrom && t <= hiddenTo);
    if (fr.length >= 2) {
      const [a, b] = [fr[0], fr.at(-1)];
      out.framesDeliveredWhileHidden = b[1] - a[1];
      out.framesByContextClockWhileHidden = Math.round((b[2] - a[2]) * p.sr);
      out.wallSecondsBetweenSamples = (b[0] - a[0]) / 1000;
      out.frameSamplesTakenWhileHidden = fr.length;
      out.visibilitySeen = [...new Set(fr.map((x) => x[3]))];
    }
    await page.evaluate(() => rec.stop());
    for (let i = 0; i < 180; i++) { if (H.server.recordings.get(row.id).status === "complete") break; await sleep(1000); }
    out.finalStatus = H.server.recordings.get(row.id).status;
    const rows = H.server.chunkRows(row.id);
    for (const tr of ["teacher", "room"]) {
      const mine = rows.filter((c) => c.track === tr).sort((a, b) => a.seq - b.seq);
      out[`${tr}Contiguous`] = mine.every((c, i) => c.seq === i && (i === 0 || c.t_start_ms === mine[i - 1].t_end_ms));
      out[`${tr}AudioMs`] = mine.at(-1)?.t_end_ms;
    }
    out.wallMsRecorded = Date.parse(H.server.recordings.get(row.id).ended_at) - Date.parse(H.server.recordings.get(row.id).started_at);
    out.errors = p.log.errors.slice(0, 10);
    console.log(JSON.stringify(out, null, 1));
  }
} finally {
  save();
  await browser.close().catch(() => {});
  await H.close();
}
