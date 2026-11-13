// The recorder in real Chromium with Chrome's fake microphones.
//
//   node scripts/recorder/browser.test.mjs [--headed] [--only=name,name]
//
// Needs Playwright from an existing install (see harness.mjs) and a lesson
// WAV from C:\Users\Dell\hec-audio-eval (read in place). Results that are
// measurements, not pass/fail, are printed as "info:" lines and written to
// C:\Users\Dell\hec-tools\c2-harness\browser-results.json (outside the repo).
import { writeFileSync, mkdirSync } from "node:fs";
import { startHarness, launch, lesson, TEACHER } from "./harness.mjs";
import { b64 } from "./fake-supabase-client.mjs";
import { BUCKET } from "./fake-recorder-server.mjs";

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const only = (args.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").filter(Boolean);
const OUT = process.env.RECORDER_OUT ?? "C:\\Users\\Dell\\hec-tools\\c2-harness";
let pass = 0, fail = 0;
const results = {};
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const info = (k, v) => { results[k] = v; console.log(`  info: ${k} = ${JSON.stringify(v)}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const want = (name) => !only.length || only.includes(name);

const H = await startHarness();
const browser = await launch({ headless: !headed });

async function newPage(ctx) {
  const c = ctx ?? await browser.newContext({ permissions: ["microphone"] });
  const page = await c.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await page.goto(H.url);
  await page.waitForFunction(() => window.harnessReady === true);
  return { ctx: c, page };
}
const objectsOf = (recId, track) => H.server.chunkRows(recId).filter((c) => c.track === track).sort((a, b) => a.seq - b.seq)
  .map((c) => b64.enc(H.server.objects.get(`${BUCKET}/${c.storage_path}`).bytes));
async function waitFor(fn, ms = 60000, every = 250) { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v) return v; if (Date.now() > end) return v; await sleep(every); } }
const serverRec = (id) => H.server.recordings.get(id);

try {
  // ------------------------------------------------------------------
  if (want("devices")) {
    console.log("=== two inputs, constraints requested and read back ===");
    const { page } = await newPage();
    const r = await page.evaluate(async () => {
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
      const real = R.realInputs(devs.map((d) => ({ deviceId: d.deviceId, groupId: d.groupId, label: d.label, kind: d.kind })));
      const both = await R.openBoth({ teacher: real[0].deviceId, room: real[1].deviceId });
      const ctx = new AudioContext({ sampleRate: 48000 });
      await ctx.resume();
      const grab = async (stream) => { const a = ctx.createAnalyser(); a.fftSize = 32768; ctx.createMediaStreamSource(stream).connect(a); return a; };
      const an = [await grab(both.teacher.stream), await grab(both.room.stream)];
      await new Promise((r) => setTimeout(r, 3000));
      const bufs = an.map((a) => { const b = new Float32Array(32768); a.getFloatTimeDomainData(b); return b; });
      const rms = bufs.map((b) => Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length));
      const out = {
        labels: devs.map((d) => d.label), realLabels: real.map((d) => d.label),
        distinctIds: real[0].deviceId !== real[1].deviceId, distinctGroups: real[0].groupId !== real[1].groupId,
        teacher: { requested: both.teacher.requested, applied: both.teacher.applied, notHonoured: both.teacher.notHonoured },
        room: { requested: both.room.requested, applied: both.room.applied, notHonoured: both.room.notHonoured },
        supportsVoiceIsolation: !!navigator.mediaDevices.getSupportedConstraints().voiceIsolation,
        rms, corr: R.zeroLagCorrelation(bufs[0], bufs[1]),
      };
      let sameTwice = null;
      try { await R.openBoth({ teacher: real[0].deviceId, room: real[0].deviceId }); } catch (e) { sameTwice = e.code; }
      out.sameTwice = sameTwice;
      both.teacher.stream.getTracks().forEach((t) => t.stop()); both.room.stream.getTracks().forEach((t) => t.stop());
      return out;
    });
    info("fake device labels", r.labels);
    ok("two real inputs besides the default alias, with distinct ids and groups", r.realLabels.length >= 2 && r.distinctIds && r.distinctGroups, r.realLabels.join(" | "));
    ok("both opened at once with exact deviceIds", r.teacher.applied.deviceId !== r.room.applied.deviceId);
    for (const t of ["teacher", "room"]) {
      info(`${t} applied settings`, r[t].applied);
      ok(`${t}: echoCancellation, noiseSuppression, autoGainControl read back false`, r[t].applied.echoCancellation === false && r[t].applied.noiseSuppression === false && r[t].applied.autoGainControl === false);
      info(`${t} not honoured`, r[t].notHonoured);
    }
    info("voiceIsolation supported", r.supportsVoiceIsolation);
    ok("voiceIsolation requested false where supported and read back false", !r.supportsVoiceIsolation || (r.teacher.requested.voiceIsolation === false && r.teacher.applied.voiceIsolation === false));
    info("signal rms per fake input", r.rms);
    info("zero-lag correlation between the two fake inputs", r.corr);
    ok("one device for both roles is refused", r.sameTwice === "same_device_twice", String(r.sameTwice));
    results.fakeInputsCarrySignal = r.rms.map((x) => x > 1e-4);
    await page.context().close();
  }

  // ------------------------------------------------------------------
  for (const format of ["flac", "opus-webm"]) {
    if (!want(format)) continue;
    console.log(`=== ${format}: arm, record 35 s, stop, complete ===`);
    const { page } = await newPage();
    const L = lesson(H.server);
    await page.evaluate(async ({ format }) => { await setup({ uid: "22222222-2222-4222-8222-222222222222", format, chunkMs: 10000, tap: true }); await rec.prepare(); }, { format });
    const t0 = Date.now();
    const row = await page.evaluate(async (L) => (await rec.arm(L)), L);
    await waitFor(() => page.evaluate(() => rec.state === "recording"), 15000);
    ok(`${format}: recording within the window`, await page.evaluate(() => rec.state === "recording"));
    await page.evaluate(() => rec.marker("roll_call_start"));
    const metrics0 = await (await page.context().newCDPSession(page)).send("Performance.enable").then(() => null).catch(() => null);
    void metrics0;
    await sleep(35000);
    await page.evaluate(() => { window.lastT0 = rec.active.chunker.t0Frame; return rec.stop(); });
    await waitFor(() => serverRec(row.id)?.status === "complete", 60000);
    const fin = serverRec(row.id);
    ok(`${format}: the server says complete`, fin.status === "complete", fin.status);
    const log = await page.evaluate(() => window.log);
    // The lesson WAV itself reaches full scale in places: the clipping WARNING is correct there, not an error.
    const clips = log.errors.filter((e) => e.code === "clipping").length;
    info(`${format} clipping warnings (the lesson file peaks at 0 dBFS)`, clips);
    ok(`${format}: no errors (clipping warnings aside)`, log.errors.every((e) => e.code === "clipping"), JSON.stringify(log.errors.filter((e) => e.code !== "clipping")).slice(0, 300));
    const rows = H.server.chunkRows(row.id);
    for (const track of ["teacher", "room"]) {
      const mine = rows.filter((c) => c.track === track).sort((a, b) => a.seq - b.seq);
      ok(`${format} ${track}: seq contiguous, boundaries shared`, mine.every((c, i) => c.seq === i && (i === 0 || c.t_start_ms === mine[i - 1].t_end_ms)), mine.map((c) => `${c.seq}:${c.t_start_ms}-${c.t_end_ms}`).join(" "));
      const full = mine.slice(0, -1);
      const bps = full.reduce((s, c) => s + c.byte_size, 0) / (full.reduce((s, c) => s + c.t_end_ms - c.t_start_ms, 0) / 1000);
      info(`${format} ${track} bytes/s (full chunks)`, Math.round(bps));
      info(`${format} ${track} MB per minute`, +(bps * 60 / 1e6).toFixed(3));
    }
    const man = JSON.parse(new TextDecoder().decode(H.server.objects.get(`${BUCKET}/${fin.manifest_path}`).bytes));
    ok(`${format}: manifest timeline is ${format === "flac" ? "exact" : "approximate"}`, man.timeline === (format === "flac" ? "exact" : "approximate"));
    ok(`${format}: manifest records the read-back settings per track`, man.tracks.every((t) => t.applied_settings && t.applied_settings.echoCancellation === false));
    if (format === "flac") {
      const enc = await page.evaluate(() => ({ kind: rec.encoder.kind, longest: Math.max(0, ...window.longTasks), over1s: window.longTasks.filter((d) => d > 1000).length }));
      info("flac encoder and long main-thread tasks", enc);
      ok("M6: FLAC was encoded in the Worker, not on the page", enc.kind === "worker" && log.chunks.some((c) => c.encodeMs !== null), JSON.stringify(enc));
      for (const track of ["teacher", "room"]) {
        const cmp = await page.evaluate(async ({ track, objs }) => compareTrack(track, objs), { track, objs: objectsOf(row.id, track) });
        info(`flac ${track} decode comparison`, cmp);
        ok(`flac ${track}: Chrome's decoder gives back exactly the samples the worklet delivered (gapless join)`, cmp.differing === 0 && cmp.compared === cmp.decoded && cmp.decoded > 48000 * 30, `${cmp.decoded} samples, ${cmp.differing} differ`);
      }
    } else {
      const r = await page.evaluate(async (objs) => {
        const ctx = new OfflineAudioContext(1, 1, 48000);
        const u8 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
        const all = objs.map(u8);
        const dec = async (u) => { try { const b = await ctx.decodeAudioData(u.slice().buffer); return b.length; } catch { return -1; } };
        const joined = new Uint8Array(all.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of all) { joined.set(a, o); o += a.length; }
        return { first: await dec(all[0]), second: await dec(all[1]), joined: await dec(joined), n: all.length };
      }, objectsOf(row.id, "teacher"));
      info("opus decodability", r);
      ok("opus: the first chunk decodes alone", r.first > 0);
      ok("opus: a later chunk does NOT decode alone (a byte-split of one stream)", r.second < 0);
      ok("opus: the chunks joined decode as one stream", r.joined > 48000 * 30, String(r.joined));
    }
    info(`${format} wall seconds for the run`, Math.round((Date.now() - t0) / 1000));
    await page.context().close();
  }

  // ------------------------------------------------------------------
  if (want("offline")) {
    console.log("=== offline 25 s mid-recording, then online ===");
    const { page, ctx } = await newPage();
    const L = lesson(H.server);
    await page.evaluate(async () => { await setup({ uid: "22222222-2222-4222-8222-222222222222" }); await rec.prepare(); });
    const row = await page.evaluate(async (L) => rec.arm(L), L);
    await waitFor(() => page.evaluate(() => rec.state === "recording"), 15000);
    await sleep(8000);
    await ctx.setOffline(true);
    const before = H.server.chunkRows(row.id).length;
    await sleep(25000);
    const during = H.server.chunkRows(row.id).length;
    const localDuring = await page.evaluate(async () => (await rec.o.store.listChunks(rec.recordingId)).length);
    ok("offline: chunks keep being captured and stored locally, none reach the server", during === before && localDuring >= before + 4, `${before} -> ${during} on server, ${localDuring} local`);
    await ctx.setOffline(false);
    await sleep(7000);
    await page.evaluate(() => rec.stop());
    await waitFor(() => serverRec(row.id)?.status === "complete", 60000);
    ok("online again: everything uploaded and the recording completes", serverRec(row.id).status === "complete");
    const log = await page.evaluate(() => window.log);
    ok("the UI was told about the offline period", log.errors.some((e) => e.code === "offline") || log.ups.some((u) => u.offline));
    await ctx.close();
  }

  // ------------------------------------------------------------------
  for (const how of ["reload", "crash"]) {
    if (!want(how)) continue;
    console.log(`=== ${how} mid-recording: recover, no chunk lost or duplicated ===`);
    const { page, ctx } = await newPage();
    const L = lesson(H.server);
    await page.evaluate(async () => { await setup({ uid: "22222222-2222-4222-8222-222222222222" }); await rec.prepare(); });
    const row = await page.evaluate(async (L) => rec.arm(L), L);
    await waitFor(() => page.evaluate(() => rec.state === "recording"), 15000);
    await sleep(27000);
    const startedAt = Date.parse(serverRec(row.id).started_at);
    const killedAt = Date.now();
    if (how === "reload") await page.reload();
    else {
      // Kill the renderer. Page.crash never answers (its target is gone), so do not wait on it.
      const crashed = new Promise((r) => page.once("crash", () => r(true)));
      const cdp = await ctx.newCDPSession(page);
      cdp.send("Page.crash").catch(() => {});
      results.crashEventSeen = await Promise.race([crashed, sleep(5000).then(() => false)]);
      await page.close().catch(() => {});
    }
    const p2 = how === "reload" ? page : (await newPage(ctx)).page;
    if (how === "reload") await p2.waitForFunction(() => window.harnessReady === true);
    const ids = await p2.evaluate(async () => { await setup({ uid: "22222222-2222-4222-8222-222222222222" }); await rec.prepare(); return rec.recover(); });
    ok(`${how}: the unfinished recording is found on the next load`, ids.includes(row.id), JSON.stringify(ids));
    await waitFor(() => serverRec(row.id)?.status === "complete", 60000);
    const fin = serverRec(row.id);
    ok(`${how}: finished as crash_recovered and complete`, fin.status === "complete" && fin.stop_reason === "crash_recovered", `${fin.status} ${fin.stop_reason}`);
    for (const track of ["teacher", "room"]) {
      const mine = H.server.chunkRows(row.id).filter((c) => c.track === track).sort((a, b) => a.seq - b.seq);
      const keys = mine.map((c) => c.seq);
      ok(`${how} ${track}: contiguous, no duplicates`, keys.every((s, i) => s === i) && new Set(keys).size === keys.length, keys.join(","));
      const lostMs = (killedAt - startedAt) - mine.at(-1).t_end_ms;
      info(`${how} ${track} audio lost at the end (ms)`, lostMs);
      ok(`${how} ${track}: at most ~5 s lost (segments every 5 s)`, lostMs < 5000 + 1500, `${lostMs} ms`);
    }
    await ctx.close();
  }

  // ------------------------------------------------------------------
  // B1 on a real AudioContext: suspended (resume brings it back) and closed
  // (only re-making it can). Never `recording` while it delivers nothing.
  for (const how of ["suspend", "close"]) {
    if (!want(`stall-${how}`)) continue;
    console.log(`=== B1: the AudioContext is ${how === "suspend" ? "suspended" : "closed"} mid-recording ===`);
    const { page, ctx } = await newPage();
    const L = lesson(H.server);
    await page.evaluate(async () => { await setup({ uid: "22222222-2222-4222-8222-222222222222" }); await rec.prepare(); });
    const row = await page.evaluate(async (L) => rec.arm(L), L);
    await waitFor(() => page.evaluate(() => rec.state === "recording"), 15000);
    await sleep(6000);
    const from = await page.evaluate(async (how) => {
      window.__titleAtStall = null;
      rec.on("state", (s) => { if (s.state === "stalled") window.__titleAtStall = document.title; });
      const n = window.log.states.length;
      const g = rec.o.source.graph;
      if (how === "suspend") await g.ctx.suspend(); else await g.ctx.close();
      return n;
    }, how);
    await waitFor(() => page.evaluate((n) => window.log.states.slice(n).includes("recording"), from), 20000);
    const mid = await page.evaluate((n) => ({ states: window.log.states.slice(n), errors: window.log.errors.map((e) => e.code), title: window.__titleAtStall }), from);
    ok(`B1 ${how}: the state went to stalled at once and only back to recording when audio came back`, mid.states[0] === "stalled" && mid.states.includes("recording"), JSON.stringify(mid.states));
    ok(`B1 ${how}: a loud capture_stalled error, and the tab title said NOT RECORDING`, mid.errors.includes("capture_stalled") && /NOT RECORDING/.test(mid.title ?? ""), mid.title);
    const back = await page.evaluate(() => ({ state: rec.state, rebuilds: rec.o.source.rebuilds, ctx: rec.o.source.contextState, health: window.log.health.map((h) => h.kind) }));
    ok(`B1 ${how}: audio came back (${how === "suspend" ? "resume" : "a new context"}) and it records again`, back.state === "recording" && back.ctx === "running" && back.health.includes("capture_resumed") && (how === "suspend" || back.rebuilds === 1), JSON.stringify(back));
    await sleep(6000);
    await page.evaluate(() => rec.stop());
    await waitFor(() => serverRec(row.id)?.status === "complete", 60000);
    const fin = serverRec(row.id);
    ok(`B1 ${how}: the recording completes`, fin.status === "complete", fin.status);
    const man = JSON.parse(new TextDecoder().decode(H.server.objects.get(`${BUCKET}/${fin.manifest_path}`).bytes));
    const gap = man.discontinuities.find((d) => d.kind === "context_stall");
    info(`B1 ${how} discontinuities`, man.discontinuities);
    ok(`B1 ${how}: the gap (the time with no audio, however short) is in the manifest`, gap && gap.wall_gap_ms > 0, JSON.stringify(gap));
    for (const track of ["teacher", "room"]) {
      const mine = H.server.chunkRows(row.id).filter((c) => c.track === track).sort((a, b) => a.seq - b.seq);
      ok(`B1 ${how} ${track}: contiguous on one timeline after the restart`, mine.every((c, i) => c.seq === i && (i === 0 || c.t_start_ms === mine[i - 1].t_end_ms)));
    }
    await ctx.close();
  }

  // ------------------------------------------------------------------
  if (want("unplug")) {
    console.log("=== a device ends mid-recording ===");
    const { page, ctx } = await newPage();
    const L = lesson(H.server);
    await page.evaluate(async () => { await setup({ uid: "22222222-2222-4222-8222-222222222222" }); await rec.prepare(); });
    const row = await page.evaluate(async (L) => rec.arm(L), L);
    await waitFor(() => page.evaluate(() => rec.state === "recording"), 15000);
    await sleep(4000);
    // As close to an unplug as the fake allows: the track is stopped and 'ended' is fired on it.
    await page.evaluate(() => { const t = rec.o.source.opened.teacher.track; t.stop(); t.dispatchEvent(new Event("ended")); });
    await sleep(6000);
    const log = await page.evaluate(() => window.log);
    ok("ended -> device_unplugged, then reopened by exact id -> device_restored", log.health.some((h) => h.kind === "device_unplugged") && log.health.some((h) => h.kind === "device_restored"), JSON.stringify(log.health));
    await sleep(6000);
    await page.evaluate(() => rec.stop());
    await waitFor(() => serverRec(row.id)?.status === "complete", 60000);
    ok("the recording still completes", serverRec(row.id).status === "complete");
    ok("device_change markers stored", [...H.server.markers.values()].filter((m) => m.recording_id === row.id && m.kind === "device_change").length >= 2);
    const teacher = H.server.chunkRows(row.id).filter((c) => c.track === "teacher").sort((a, b) => a.seq - b.seq);
    ok("the teacher timeline has no hole (zeros were written while it was gone)", teacher.every((c, i) => i === 0 || c.t_start_ms === teacher[i - 1].t_end_ms));
    await ctx.close();
  }

  // ------------------------------------------------------------------
  if (want("noclick")) {
    console.log("=== arm and start without a click (permission already granted) ===");
    // Measured by the page at load: no evaluate() before it finishes (evaluate carries a user gesture).
    for (const [label, opts] of [["headless, Playwright default", { headless: true }], ["headed, --autoplay-policy=document-user-activation-required", { headless: false, extraArgs: ["--autoplay-policy=document-user-activation-required"] }], ["headed, Chrome default policy", { headless: false }]]) {
      const b = await launch(opts);
      const ctx = await b.newContext({ permissions: ["microphone"] });
      const page = await ctx.newPage();
      await page.goto(H.url + "noclick");
      await sleep(7000); // no waitForFunction: its polling would itself count as a gesture
      const r = await page.evaluate(() => window.__noclick ?? null);
      info(`no-click (${label})`, r);
      await Promise.race([b.close(), sleep(8000)]);
    }
  }  if (want("autostart")) {
    console.log("=== the recorder arms, starts and finishes with no click at all ===");
    const b = await launch({ headless: false, extraArgs: ["--autoplay-policy=document-user-activation-required"] });
    const ctx = await b.newContext({ permissions: ["microphone"] });
    const page = await ctx.newPage();
    const L = lesson(H.server);
    await page.goto(`${H.url}autostart?l=${encodeURIComponent(JSON.stringify(L))}`);
    await sleep(25000); // no evaluate until it is over: evaluate would count as a gesture
    // Wait on the SERVER, not the page, so no gesture reaches it.
    await waitFor(() => [...H.server.recordings.values()].some((x) => x.armed_session_id === L.sessionId && x.status === "complete"), 150000, 1000);
    const r = await page.evaluate(() => window.__auto);
    info("autostart", r);
    const fin = r.recordingId && serverRec(r.recordingId);
    ok("no gesture at any point", r.activationAtPrepare === false && r.activationAt20s === false);
    // Chrome either resumes the first context once the mics are open or needs a new one (both seen); the engine does whichever works.
    info("autostart: context re-made (else resumed)", r.contextRebuilt);
    ok("context suspended at prepare, running once the mics were open (resumed or re-made), no gesture", r.contextAtPrepare === "suspended" && r.contextNow === "running", JSON.stringify(r).slice(0, 300));
    ok("audio flowed and the recording completed with no click", r.framesDelivered > 48000 * 15 && fin?.status === "complete", fin?.status);
    await Promise.race([b.close(), sleep(8000)]);
  }
} finally {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}\\browser-results.json`, JSON.stringify(results, null, 2));
  await Promise.race([browser.close().catch(() => {}), sleep(8000)]);
  H.http.closeAllConnections?.();
  await Promise.race([H.close(), sleep(3000)]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
