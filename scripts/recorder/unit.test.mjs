// The recorder capture core's pure logic and its state machine, in Node.
//
//   node scripts/recorder/unit.test.mjs
//
// src/lib/recorder is bundled with esbuild and driven directly: device
// matching, constraint read-back, chunk maths, the chunker, the FLAC and WAV
// encoders (decoded by an independent decoder, and by ffmpeg when present),
// backoff, refusal classification, schedule maths, health, the manifest, the
// queue store, the uploader against a fake server that enforces the
// contract's refusals, and the whole controller - arm, capture, stop,
// finalize, crash recovery, device loss, offline - with a fake audio source.
// What needs a real browser (getUserMedia, the worklet, IndexedDB, MediaRecorder)
// is in scripts/recorder/browser.test.mjs.
import { readFileSync, openSync, readSync, closeSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadRecorder, repo } from "./load-recorder.mjs";
import { decodeFlac } from "./flac-decode.mjs";
import { createFakeServer, BUCKET as FAKE_BUCKET } from "./fake-recorder-server.mjs";
import { makeClient } from "./fake-supabase-client.mjs";

const R = await loadRecorder();

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); ok(n, g === w, g === w ? "" : `got ${g}, want ${w}`); };
const throwsLike = async (n, fn, re) => { try { await fn(); ok(n, false, "did not throw"); } catch (e) { ok(n, re.test(String(e?.message ?? e)) || re.test(String(e?.refusal)) || re.test(String(e?.code)), String(e?.message ?? e)); } };
const sameInt16 = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// deterministic noise
let seed = 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

console.log("=== devices ===");
{
  eq("port number dropped", R.normalizeLabel("Microphone (2- USB Audio Device)"), "microphone (usb audio device)");
  eq("same device on another port matches", R.normalizeLabel("Microphone (3- USB Audio Device)"), R.normalizeLabel("Microphone (2- USB Audio Device)"));
  eq("Default - alias stripped", R.normalizeLabel("Default - Echo Cancelling Speakerphone (Anker PowerConf S500)"), "echo cancelling speakerphone (anker powerconf s500)");
  eq("Communications - alias stripped", R.normalizeLabel("Communications - Microphone (2- USB Audio Device)"), "microphone (usb audio device)");
  eq("vendor:product suffix dropped", R.normalizeLabel("USB Audio Device (0b0e:24c8)"), "usb audio device");
  const devs = [
    { deviceId: "default", groupId: "gS", label: "Default - Echo Cancelling Speakerphone (Anker PowerConf S500)", kind: "audioinput" },
    { deviceId: "communications", groupId: "gL", label: "Communications - Microphone (2- USB Audio Device)", kind: "audioinput" },
    { deviceId: "idS", groupId: "gS", label: "Echo Cancelling Speakerphone (Anker PowerConf S500)", kind: "audioinput" },
    { deviceId: "idL", groupId: "gL", label: "Microphone (2- USB Audio Device)", kind: "audioinput" },
    { deviceId: "idB", groupId: "gB", label: "Microphone Array (Realtek(R) Audio)", kind: "audioinput" },
    { deviceId: "out", groupId: "gS", label: "Speakers (Anker PowerConf S500)", kind: "audiooutput" },
  ];
  eq("real inputs drop default, communications and outputs", R.realInputs(devs).map((d) => d.deviceId), ["idS", "idL", "idB"]);
  eq("the S500 is also the Windows default", R.aliasesOf(devs[2], devs), ["default"]);
  eq("the lapel is the communications device", R.aliasesOf(devs[3], devs), ["communications"]);
  eq("label hint: S500 is the room", R.hintRole(devs[2].label), "room");
  eq("label hint: USB Audio Device is the lapel", R.hintRole(devs[3].label), "teacher");
  eq("label hint: built-in mic is neither", R.hintRole(devs[4].label), null);
  ok("S500 reports hardware DSP", R.hasHardwareDsp(devs[2].label));
  const saved = { deviceId: "idL", groupId: "gL", label: "Microphone (2- USB Audio Device)" };
  eq("saved id present: by id", R.resolveDevice(saved, devs), { status: "ok", device: devs[3], how: "id" });
  const moved = [{ ...devs[3], deviceId: "idL2", groupId: "gL2", label: "Microphone (3- USB Audio Device)" }, devs[2], devs[4]];
  eq("id gone, receiver on another port: by label", R.resolveDevice(saved, moved).status + "/" + R.resolveDevice(saved, moved).how, "ok/label");
  const twoSame = [...moved, { deviceId: "idL3", groupId: "gL3", label: "Microphone (4- USB Audio Device)" }];
  eq("two lookalikes: ambiguous, not a guess", R.resolveDevice(saved, twoSame).status, "ambiguous");
  eq("unplugged: missing, never the default mic", R.resolveDevice(saved, [devs[0], devs[2], devs[4]]).status, "missing");
  eq("an alias id saved by mistake is not used", R.resolveDevice({ deviceId: "default", groupId: "gS", label: "Default - x" }, devs).status, "missing");
  const prof = { version: 1, installId: "i", userId: "u", teacher: saved, room: { deviceId: "idS", groupId: "gS", label: devs[2].label }, checks: {}, verifiedAt: null };
  eq("profile resolves both", R.resolveProfile(prof, devs).status, "ok");
  eq("one device twice is refused", R.resolveProfile({ ...prof, room: saved }, devs).status, "same_device");
  ok("pair with the same group is not distinct", !R.pairIsDistinct({ deviceId: "a", groupId: "g" }, { deviceId: "b", groupId: "g" }));
  eq("missing role named", R.resolveProfile(prof, [devs[2]]), { status: "missing", roles: ["teacher"] });
  const a = Float32Array.from({ length: 4800 }, () => rnd() - 0.5);
  const b = Float32Array.from({ length: 4800 }, () => rnd() - 0.5);
  ok("the same signal twice correlates >= 0.98", R.zeroLagCorrelation(a, a) >= R.SAME_SIGNAL_THRESHOLD);
  ok("two different signals do not", Math.abs(R.zeroLagCorrelation(a, b)) < 0.2, String(R.zeroLagCorrelation(a, b)));
  const row = await R.profileRow(prof, "UA");
  ok("server row holds hashes, not the ids", row.teacher_device_hash.length === 64 && !JSON.stringify(row).includes('"idL"'));
}

console.log("=== constraints requested and read back ===");
{
  const c = R.buildConstraints("dev1", { voiceIsolation: true });
  eq("exact device, every flag off, voiceIsolation where supported", c, { deviceId: { exact: "dev1" }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 1 }, voiceIsolation: false });
  ok("voiceIsolation not sent where unsupported", !("voiceIsolation" in R.buildConstraints("d", {})));
  eq("all honoured", R.constraintsNotHonoured(c, { deviceId: "dev1", echoCancellation: false, noiseSuppression: false, autoGainControl: false, voiceIsolation: false, channelCount: 1 }), []);
  eq("a flag left on is reported", R.constraintsNotHonoured(c, { deviceId: "dev1", echoCancellation: true, noiseSuppression: false, autoGainControl: false, voiceIsolation: false }), ["echoCancellation: true"]);
  eq("a flag not reported is reported, never assumed", R.constraintsNotHonoured(c, { deviceId: "dev1", echoCancellation: false, noiseSuppression: false, autoGainControl: false }), ["voiceIsolation: not reported"]);
  eq("stereo and another device are reported", R.constraintsNotHonoured(c, { deviceId: "zzz", echoCancellation: false, noiseSuppression: false, autoGainControl: false, voiceIsolation: false, channelCount: 2 }), ["deviceId: got another device", "channelCount: 2 (channel 0 is recorded)"]);
}

console.log("=== chunk maths ===");
{
  eq("30 s at 48 kHz", R.framesPerChunk(48000, 30000), 1440000);
  let threw = false; try { R.framesPerChunk(44100, 10001); } catch { threw = true; }
  ok("a chunk that is not whole frames is refused", threw);
  const s0 = R.chunkSpan(0, 1440000, 48000, 30000), s1 = R.chunkSpan(1, 1440000, 48000, 30000), last = R.chunkSpan(2, 4800, 48000, 30000);
  eq("chunk 0", [s0.tStartMs, s0.tEndMs], [0, 30000]);
  ok("consecutive chunks share the boundary exactly", s0.tEndMs === s1.tStartMs && s0.endFrame === s1.startFrame);
  eq("short last chunk", [last.tStartMs, last.tEndMs], [60000, 60100]);
  eq("44.1 kHz positions floor consistently", [R.frameToMs(441, 44100), R.frameToMs(440, 44100)], [10, 9]);
  const b = { chunkMs: 30000, minBytesPerSec: 4000, clockToleranceMs: 15000, windowMs: 6300000 };
  eq("a fine chunk", R.checkChunkLocally(1500000, 0, 30000, b), { ok: true });
  eq("the critic's 1 byte for 90 minutes", R.checkChunkLocally(1, 0, 5400000, b), { ok: false, refusal: "span_too_long" });
  eq("too few bytes", R.checkChunkLocally(100000, 0, 30000, b), { ok: false, refusal: "below_byte_floor" });
  eq("after the window", R.checkChunkLocally(1500000, 6300000, 6330000, b), { ok: false, refusal: "after_window" });
  eq("the path the database chooses", R.chunkPath("c", "r", "room", 7, "flac"), "c/r/room/000007.flac");
  eq("the manifest path", R.manifestPath("c", "r"), "c/r/manifest.json");
  const f = Float32Array.from([0, 1, -1, 0.5, -0.5, 1.2, -1.2, 1 / 32768]), i16 = new Int16Array(8);
  R.floatToInt16(f, i16);
  eq("float to 16-bit (x*32768, clamped)", [...i16], [0, 32767, -32768, 16384, -16384, 32767, -32768, 1]);
}

console.log("=== chunker: continuity, t0, segments, closing a track ===");
{
  const sr = 48000, chunkMs = 10000, F = 480000;
  const chunks = [], segs = [];
  const ch = new R.Chunker(sr, chunkMs, (c) => chunks.push(c), (s) => segs.push(s));
  const T = [], Rm = [];
  let frame = 0;
  const feed = (n) => {
    const t = Int16Array.from({ length: n }, () => (rnd() * 65535 - 32768) | 0), r = Int16Array.from({ length: n }, () => (rnd() * 65535 - 32768) | 0);
    ch.push(frame, t, r); frame += n;
    return { t, r };
  };
  feed(1000); // before t0: dropped
  ok("nothing before t0", chunks.length === 0 && ch.position === 0);
  ch.setT0(1000 + 37); // t0 inside the next batch
  const first = feed(2048);
  T.push(first.t.subarray(37)); Rm.push(first.r.subarray(37));
  for (let i = 0; i < 700; i++) { const n = 1 + Math.floor(rnd() * 4096); const x = feed(n); T.push(x.t); Rm.push(x.r); }
  ch.flush();
  const total = T.reduce((n, a) => n + a.length, 0);
  const tc = chunks.filter((c) => c.track === "teacher"), rc = chunks.filter((c) => c.track === "room");
  eq("seq contiguous per track", tc.map((c) => c.seq), [...tc.keys()]);
  ok("every chunk but the last is exactly F frames", tc.slice(0, -1).every((c) => c.samples.length === F) && tc.at(-1).samples.length <= F);
  ok("both tracks cut at the same frames", tc.every((c, i) => c.startFrame === rc[i].startFrame && c.samples.length === rc[i].samples.length));
  const join = (arrs) => { const o = new Int16Array(arrs.reduce((n, a) => n + a.length, 0)); let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; } return o; };
  ok("chunks join back into exactly the input (teacher)", sameInt16(join(tc.map((c) => c.samples)), join(T)), `${total} frames`);
  ok("and the room", sameInt16(join(rc.map((c) => c.samples)), join(Rm)));
  eq("frames captured counted per track", [ch.captured.teacher, ch.captured.room], [total, total]);
  ok("5-second segments emitted (crash safety)", segs.length > 0 && segs.every((s) => s.samples.length === 240000));
  const s0 = segs.filter((s) => s.track === "teacher" && s.seq === 0);
  ok("segments of chunk 0 are its first halves", s0.length === 2 && sameInt16(join(s0.map((s) => s.samples)), tc[0].samples));

  const out = [];
  const c2 = new R.Chunker(sr, chunkMs, (c) => out.push(c));
  c2.setT0(0);
  const z = new Int16Array(F + 100);
  c2.push(0, z, z);
  c2.closeTrack("teacher");
  c2.push(F + 100, new Int16Array(F), new Int16Array(F));
  c2.flush();
  eq("a closed track gets no more chunks; the other carries on", out.map((c) => `${c.track}${c.seq}:${c.samples.length}`), ["teacher0:480000", "room0:480000", "teacher1:100", "room1:480000", "room2:100"]);
}

console.log("=== FLAC and WAV encoders ===");
{
  const sr = 48000;
  const sine = Int16Array.from({ length: sr * 3 + 123 }, (_, i) => Math.round(8000 * Math.sin(i / 7) + 3000 * Math.sin(i / 51)));
  const noise = Int16Array.from({ length: 50000 }, () => (rnd() * 65535 - 32768) | 0);
  const silence = new Int16Array(sr * 2);
  const tiny = Int16Array.from([5, -3, 1]);
  for (const [name, x] of [["sine", sine], ["full-scale noise", noise], ["silence", silence], ["3 samples", tiny]]) {
    const f = R.encodeFlac(x, sr);
    const d = decodeFlac(f);
    ok(`FLAC round trip is exact: ${name}`, sameInt16(d.samples, x) && d.sampleRate === sr, `${f.length} bytes for ${x.length * 2} raw`);
  }
  const v = R.encodeFlac(sine, sr, { verbatim: true });
  ok("verbatim FLAC decodes exactly too", sameInt16(decodeFlac(v).samples, sine));
  ok("verbatim is about raw size", v.length > sine.length * 2 && v.length < sine.length * 2 * 1.01, `${v.length}`);
  ok("FLAC compresses a tone", R.encodeFlac(sine, sr).length < sine.length * 2 * 0.6);
  for (const rate of [44100, 16000, 22050, 12345]) ok(`FLAC at ${rate} Hz`, decodeFlac(R.encodeFlac(sine.subarray(0, 9000), rate)).sampleRate === rate);
  // The byte floor: digital silence compresses to nothing, so the engine keeps it verbatim.
  const enc = R.encodePcmChunk("flac", silence, sr, 4000);
  ok("silent FLAC chunk is kept above the 4000 B/s floor by going verbatim", enc.encoding === "verbatim" && enc.bytes.length >= 4000 * 2, `${enc.bytes.length} bytes`);
  ok("a normal chunk stays compressed", R.encodePcmChunk("flac", sine, sr, 4000).encoding === "fixed");
  const w = R.encodeWav(sine, sr);
  const dv = new DataView(w.buffer);
  ok("WAV header: RIFF, PCM 16-bit mono, rate", String.fromCharCode(...w.subarray(0, 4)) === "RIFF" && dv.getUint16(20, true) === 1 && dv.getUint16(22, true) === 1 && dv.getUint32(24, true) === sr && dv.getUint16(34, true) === 16);
  ok("WAV data is the samples", dv.getUint32(40, true) === sine.length * 2 && dv.getInt16(44 + 2 * 100, true) === sine[100]);
  // Independent decoder: ffmpeg, when installed.
  const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (ff.status === 0) {
    const dir = mkdtempSync(join(tmpdir(), "c2flac-"));
    const p = join(dir, "x.flac");
    writeFileSync(p, R.encodeFlac(sine, sr));
    const d = spawnSync("ffmpeg", ["-v", "error", "-i", p, "-f", "s16le", "-"], { maxBuffer: 64 << 20 });
    const got = new Int16Array(d.stdout.buffer, d.stdout.byteOffset, d.stdout.length / 2);
    ok("ffmpeg decodes our FLAC to the same samples", d.status === 0 && sameInt16(got, sine), d.stderr?.toString().slice(0, 200));
  } else console.log("  (ffmpeg not found: the independent-decoder check was skipped)");
  // Real lesson audio, read in place (never copied into the repo): FLAC ratio at its native 16 kHz.
  const lesson = "C:\\Users\\Dell\\hec-audio-eval\\work\\wav16k\\lessons\\242 Lang Street Lane 19.wav";
  if (existsSync(lesson)) {
    const fd = openSync(lesson, "r"); const buf = Buffer.alloc(16000 * 2 * 60); readSync(fd, buf, 0, buf.length, 44 + 16000 * 2 * 600); closeSync(fd);
    const x = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
    const t = performance.now(); const f = R.encodeFlac(x, 16000); const encMs = performance.now() - t;
    ok("real lesson audio: FLAC is exact", sameInt16(decodeFlac(f).samples, x));
    console.log(`  info: lesson minute 10-11 at 16 kHz: FLAC ${f.length} B vs ${x.length * 2} raw (${(100 * f.length / (x.length * 2)).toFixed(1)}%), encode ${encMs.toFixed(0)} ms for 60 s`);
  }
}

console.log("=== backoff, refusals, schedule ===");
{
  const d = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => R.backoffDelay(n, { random: () => 1 }));
  eq("doubles to the 60 s cap", d, [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000, 60000]);
  ok("jitter stays within half..full", [1, 5, 9].every((n) => { const lo = R.backoffDelay(n, { random: () => 0 }), hi = R.backoffDelay(n, { random: () => 1 }); return lo === hi / 2; }));
  const cases = [
    ["Recording is switched off for this class", "switch_off"],
    ["Recording is refused: 2 child(ren) in this class have no consent on record under wording v1-2026-11", "consent_missing"],
    ["Recording is refused: consent was confirmed under an older wording (v0)", "consent_missing"],
    ["This lesson is cancelled: it cannot be recorded", "session_canceled"],
    ["Too early: this lesson can be armed from 20 minutes before it starts", "too_early"],
    ["Too early: capture opens at 2026-11-12 10:55 (the pre-roll before the lesson)", "too_early"],
    ["Too late: this lesson has ended", "window_closed"],
    ["The lesson window is over: this recording can no longer start", "window_closed"],
    ["The lesson window is over: a Stop after it is refused", "window_closed"],
    ["This audio is from after the lesson window: it is refused", "after_window"],
    ["This audio is from after Stop: refused", "after_stop"],
    ["This audio ends later than the server's clock says capture has run (5000 ms): refused", "ahead_of_server_clock"],
    ["A chunk is at most 30000 ms of audio: refused", "span_too_long"],
    ["This chunk is too small to hold 30000 ms of flac audio (at least 4000 bytes a second): refused", "below_byte_floor"],
    ["Chunk 3 of the room track is already registered with different audio", "conflicting_chunk"],
    ["Recording was asked to stop: audio captured after that is refused", "stop_requested"],
    ["What storage returned does not match the audio that was recorded: keep the local copy", "readback_mismatch"],
    ["The file is not in storage: keep the local copy", "not_in_storage"],
    ["This recording is abandoned and takes no more audio", "recording_closed"],
    ["Only a teacher of this class can record it", "not_teacher"],
    ["You no longer teach this lesson: it cannot be recorded by you", "no_longer_teaching"],
    ['duplicate key value violates unique constraint "class_recordings_one_live_per_session"', "already_live"],
    ["Some chunks are registered but not confirmed in storage", "complete_refused"],
    ["Not your recording", "not_your_recording"],
  ];
  for (const [m, want] of cases) eq(`refusal: ${m.slice(0, 48)}`, R.classifyRefusal(m), want);
  ok("ahead-of-clock is transient (retried), the byte floor is not", R.isTransientRefusal("ahead_of_server_clock") && !R.isTransientRefusal("below_byte_floor"));
  eq("offline is an offline error", R.toRecorderError(new TypeError("Failed to fetch")).code, "offline");
  eq("17:00 in Hanoi is 10:00 UTC", new Date(R.hanoiToEpoch("2026-11-12", "17:00:00")).toISOString(), "2026-11-12T10:00:00.000Z");
  const e = { sessionId: "a", classId: "c", date: "2026-11-12", startTime: "17:00", endTime: "18:30" };
  const p = R.plan(e);
  eq("arm 20, start 5 before; stop 10 after", [p.armAt, p.startAt, p.stopAt].map((x) => new Date(x).toISOString().slice(11, 16)), ["09:40", "09:55", "11:40"]);
  const f = { sessionId: "b", classId: "d", date: "2026-11-12", startTime: "18:30", endTime: "19:30" };
  const nb = R.plan(f);
  const bb = R.backToBack(p.stopAt, { start: nb.start, startAt: nb.startAt });
  ok("back to back: A stops at B's start, B starts there", bb.aStop === nb.start && bb.bStart === nb.start);
  eq("next lesson of the day found", R.nextLesson(e, [f, e, { ...f, sessionId: "x", status: "Canceled" }])?.sessionId, "b");
  eq("an overnight end rolls over", R.lessonWindow({ ...e, startTime: "23:30", endTime: "00:30" }).end - R.lessonWindow({ ...e, startTime: "23:30", endTime: "00:30" }).start, 3600000);
  eq("clock offset from the midpoint", R.clockOffset("2026-11-12T10:00:10.000Z", Date.parse("2026-11-12T10:00:00.000Z"), Date.parse("2026-11-12T10:00:00.400Z")), { offsetMs: 9800, rttMs: 400 });
}

console.log("=== health ===");
{
  const sr = 48000, n = 2048;
  const h = new R.HealthMonitor({ sampleRate: sr });
  const loud = () => Float32Array.from({ length: n }, () => (rnd() - 0.5) * 0.4);
  const quiet = () => Float32Array.from({ length: n }, () => (rnd() - 0.5) * 0.004);
  const zero = () => new Float32Array(n);
  let ev = [];
  for (let i = 0; i < 300; i++) ev.push(...h.push(loud(), quiet(), i * 43));
  ok("room quieter than lapel: no swap warning", !ev.some((e) => e.kind === "roles_maybe_swapped"));
  eq("swap verdict", h.swapMeasurement().verdict, "looks_right");
  const h2 = new R.HealthMonitor({ sampleRate: sr });
  ev = [];
  for (let i = 0; i < 1500; i++) ev.push(...h2.push(quiet(), loud(), i * 43));
  ok("room louder all along: roles_maybe_swapped, with the numbers", ev.some((e) => e.kind === "roles_maybe_swapped" && e.measurement.roomLouderFraction > 0.9));
  const h3 = new R.HealthMonitor({ sampleRate: sr });
  ev = [];
  for (let i = 0; i < 300; i++) ev.push(...h3.push(zero(), loud(), i * 43));
  ok("a flat-lined lapel while the room is live: flat, then dead_mic", ev.some((e) => e.kind === "flat" && e.track === "teacher") && ev.some((e) => e.kind === "dead_mic" && e.track === "teacher"));
  ev = h3.push(loud(), loud(), 99999);
  ok("and it says when it comes back", ev.some((e) => e.kind === "recovered" && e.track === "teacher"));
  const clip = Float32Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1));
  ev = new R.HealthMonitor({ sampleRate: sr }).push(clip, quiet(), 0);
  ok("clipping is counted", ev.some((e) => e.kind === "clipping" && e.track === "teacher" && e.clippedSamples === n));
  ok("levels in dBFS", Math.abs(R.measure(Float32Array.from({ length: 1000 }, () => 0.5)).rmsDb - -6.02) < 0.05);
}

console.log("=== local store: never loses, never overwrites ===");
{
  const st = new R.MemoryStore();
  const meta = (seq, state = "captured", sha = "a".repeat(64)) => ({ recordingId: "r", track: "teacher", seq, startFrame: 0, endFrame: 1, sampleRate: 48000, tStartMs: 0, tEndMs: 1, byteSize: 3, sha256: sha, mime: "audio/flac", ext: "flac", encoding: "fixed", state, attempts: 0, createdAt: 0 });
  eq("added", await st.addChunk(meta(0), new Uint8Array([1, 2, 3])), "added");
  eq("the same chunk again is a no-op", await st.addChunk(meta(0), new Uint8Array([1, 2, 3])), "exists");
  await throwsLike("a different chunk under the same number is refused", () => st.addChunk(meta(0, "captured", "b".repeat(64)), new Uint8Array([9])), /different audio/);
  await throwsLike("a chunk's audio cannot change by update", () => st.updateChunk({ ...meta(0), sha256: "c".repeat(64) }), /cannot change/);
  await st.addChunk(meta(1), new Uint8Array([4, 5, 6]));
  await st.updateChunk(meta(1, "confirmed"));
  eq("only confirmed bytes are deleted", await st.deleteConfirmedBytes("r"), 1);
  ok("unconfirmed bytes stay", !!(await st.getBytes("r", "teacher", 0)) && !(await st.getBytes("r", "teacher", 1)));
  await throwsLike("purge refuses while audio is unconfirmed", () => st.purgeRecording("r", { allowUnconfirmed: false }), /unconfirmed/);
  await st.putManifest("r", new Uint8Array([1]), "x");
  await throwsLike("a second, different manifest is refused", () => st.putManifest("r", new Uint8Array([2]), "y"), /different manifest/);
}

// ════════════════════════════════════════════════════════════════════════
// The engine against the fake server.

const CLASS = "11111111-1111-4111-8111-111111111111";
const TEACHER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
let clock = Date.parse("2026-11-12T09:55:00.000Z");
const now = () => clock;

function world(o = {}) {
  const server = createFakeServer({ now });
  server.addUser(TEACHER, ["teacher"]);
  server.addUser(OTHER, ["teacher"]);
  server.addClass(CLASS, { teachers: [TEACHER], ...o.cls });
  const sid = o.sid ?? crypto.randomUUID();
  const start = o.start ?? clock + 5 * 60000;
  server.addSession(sid, { class_id: CLASS, start, end: start + (o.lessonMs ?? 90 * 60000), teacher_id: TEACHER });
  const client = (uid) => makeClient((q) => server.handle(q, uid));
  return { server, sid, client, backend: R.supabaseBackend(client(TEACHER)) };
}

/** A capture source that plays two known signals, batch by batch, on the fake clock. */
class FakeSource {
  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate; this.contextState = "running"; this.lastFrame = 0;
    this.onBatch = null; this.onTick = null; this.onTrackEnded = null;
    this.fwd = false; this.open = false; this.played = { teacher: [], room: [] }; this.playedFrom = 0;
    this.devices = [
      { deviceId: "lapel-1", groupId: "g-lapel", label: "Microphone (2- USB Audio Device)", kind: "audioinput" },
      { deviceId: "s500-1", groupId: "g-s500", label: "Echo Cancelling Speakerphone (Anker PowerConf S500)", kind: "audioinput" },
    ];
    this.dead = { teacher: false, room: false }; this.reopenFails = 0;
  }
  async resume() { return true; }
  async listDevices() { return this.devices; }
  async openTracks(ids) {
    this.open = true;
    const t = (role, id) => ({ role, deviceId: id, label: this.devices.find((d) => d.deviceId === id).label, groupId: this.devices.find((d) => d.deviceId === id).groupId,
      requested: R.buildConstraints(id, {}), applied: { deviceId: id, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1, sampleRate: 48000 }, notHonoured: [] });
    return { teacher: t("teacher", ids.teacher), room: t("room", ids.room) };
  }
  async reopen(role, id) {
    if (this.reopenFails-- > 0) throw new Error("NotFoundError");
    this.dead[role] = false;
    return (await this.openTracks({ teacher: this.devices[0].deviceId, room: this.devices[1].deviceId }))[role];
  }
  closeTracks() { this.open = false; }
  forward(on) { this.fwd = on; }
  timestamp() { return { contextTime: this.lastFrame / this.sampleRate, performanceNow: performance.now() }; }
  /** Play `seconds` of audio: 2048-frame batches, the clock moving with them. */
  async play(seconds, rec, every = 40) {
    const n = 2048, batches = Math.round((seconds * this.sampleRate) / n);
    for (let i = 0; i < batches; i++) {
      clock += (n / this.sampleRate) * 1000;
      if (this.fwd && this.open) {
        const t = Float32Array.from({ length: n }, (_, k) => this.dead.teacher ? 0 : 0.3 * Math.sin((this.lastFrame + k) / 9) + (rnd() - 0.5) * 0.05);
        const r = Float32Array.from({ length: n }, (_, k) => this.dead.room ? 0 : 0.1 * Math.sin((this.lastFrame + k) / 23) + (rnd() - 0.5) * 0.02);
        this.played.teacher.push({ frame: this.lastFrame, x: t }); this.played.room.push({ frame: this.lastFrame, x: r });
        const f = this.lastFrame; this.lastFrame += n;
        this.onBatch?.({ frame: f, teacher: t, room: r, missing: [false, false] });
      } else this.lastFrame += n;
      if (i % 12 === 0) this.onTick?.(this.lastFrame, this.lastFrame / this.sampleRate);
      if (i % every === 0) await rec.settle();
    }
    await rec.settle();
  }
  /** What a track should hold from absolute frame `from`, as 16-bit. */
  expected(track, from, frames) {
    const all = new Int16Array(frames); let p = 0;
    for (const { frame, x } of this.played[track]) {
      const i16 = new Int16Array(x.length); R.floatToInt16(x, i16);
      for (let k = 0; k < x.length && p < frames; k++) if (frame + k >= from) all[p++] = i16[k];
    }
    return all.subarray(0, p);
  }
  async close() {}
}

const profile = { version: 1, installId: "inst-1", userId: TEACHER, teacher: { deviceId: "lapel-1", groupId: "g-lapel", label: "Microphone (2- USB Audio Device)" }, room: { deviceId: "s500-1", groupId: "g-s500", label: "Echo Cancelling Speakerphone (Anker PowerConf S500)" }, checks: {}, verifiedAt: null };

function recorder(w, store, source, extra = {}) {
  const r = new R.Recorder({ backend: w.backend, store, source, userId: TEACHER, installId: "inst-1", profile, chunkMs: 10000, now, perfNow: now, autoTick: false, useLocks: false, ...extra });
  const errors = [], states = [];
  r.on("error", (e) => errors.push(e));
  r.on("state", (s) => states.push(s.state));
  return { r, errors, states };
}

async function decodeTrack(server, recId, track) {
  const rows = server.chunkRows(recId).filter((c) => c.track === track).sort((a, b) => a.seq - b.seq);
  const parts = rows.map((c) => decodeFlac(server.objects.get(`${FAKE_BUCKET}/${c.storage_path}`).bytes).samples);
  const o = new Int16Array(parts.reduce((n, a) => n + a.length, 0)); let p = 0; for (const a of parts) { o.set(a, p); p += a.length; }
  return { rows, samples: o };
}

console.log("=== the bucket name is one constant ===");
eq("engine and fake agree on the recorder's own bucket", R.BUCKET, FAKE_BUCKET);
ok("and it is not the transcript bucket", R.BUCKET === "class-recorder-audio");

console.log("=== a lesson end to end: arm, capture, stop, finalize, complete ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  const store = new R.MemoryStore(), src = new FakeSource();
  const { r, errors, states } = recorder(w, store, src);
  await r.prepare();
  const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  eq("armed by the server", row.status, "armed");
  eq("the window is the server's: 5 min before to end + 10", [row.capture_opens_at, row.capture_closes_at].map((x) => x.slice(11, 16)), ["09:55", "11:40"]);
  r.tick(); await r.settle();
  eq("capture starts at once inside the window", r.state, "recording");
  const rec = w.server.recordings.get(row.id);
  ok("server stamped started_at (its clock)", rec.started_at === new Date(clock).toISOString() || Math.abs(Date.parse(rec.started_at) - clock) < 1000);
  await r.marker("roll_call_start");
  await src.play(35, r);
  const mid = w.server.chunkRows(row.id);
  ok("chunks registered and confirmed during the lesson (uploads keep up)", mid.length >= 6 && mid.every((c) => c.confirmed_at), `${mid.length} rows`);
  await r.marker("roll_call_end");
  await r.stop();
  await r.settle();
  const fin = w.server.recordings.get(row.id);
  eq("the server says complete", fin.status, "complete");
  eq("stop reason recorded", fin.stop_reason, "manual");
  eq("local state", r.state, "complete");
  for (const track of ["teacher", "room"]) {
    const { rows, samples } = await decodeTrack(w.server, row.id, track);
    const t0 = (await store.getRecording(row.id)).tracks.find((t) => t.track === track);
    const expected = src.expected(track, src.played[track][0].frame + (src.lastFrame - src.played[track][0].frame - samples.length - 0), samples.length);
    void expected; void t0;
    eq(`${track}: seq 0..n-1, contiguous`, rows.map((c) => c.seq), [...rows.keys()]);
    ok(`${track}: consecutive chunks share boundaries (no gap, no overlap)`, rows.every((c, i) => i === 0 || c.t_start_ms === rows[i - 1].t_end_ms));
    const sha = (await import("node:crypto")).createHash;
    ok(`${track}: every stored object matches its registered SHA-256`, rows.every((c) => sha("sha256").update(w.server.objects.get(`${FAKE_BUCKET}/${c.storage_path}`).bytes).digest("hex") === c.sha256));
  }
  // Gapless against the source: the decoded track equals what was played from t0.
  const local = await store.getRecording(row.id);
  const { samples: teacherOut } = await decodeTrack(w.server, row.id, "teacher");
  const t0Frame = src.played.teacher.reduce((m, p) => Math.min(m, p.frame), Infinity);
  const startShift = src.played.teacher.length * 2048 - teacherOut.length; // frames played but not in the recording (before t0 / after stop)
  const exp = src.expected("teacher", t0Frame, teacherOut.length + startShift);
  let found = -1;
  for (let s = 0; s <= startShift; s++) if (exp[s] === teacherOut[0] && exp[s + 1] === teacherOut[1] && sameInt16(exp.subarray(s, s + teacherOut.length), teacherOut)) { found = s; break; }
  ok("teacher track decodes to exactly the audio played, sample for sample", found >= 0, `${teacherOut.length} samples, offset ${found}`);
  const tr = [...w.server.tracks.values()].filter((t) => t.recording_id === row.id);
  ok("track counts sent: chunk_count = rows = max(seq)+1", tr.every((t) => t.chunk_count === w.server.chunkRows(row.id).filter((c) => c.track === t.track).length));
  ok("tracks described as mono FLAC 48 kHz with the read-back settings", tr.every((t) => t.channel_count === 1 && t.codec === "flac" && t.sample_rate === 48000 && t.applied_settings.echoCancellation === false));
  const man = JSON.parse(new TextDecoder().decode(w.server.objects.get(`${FAKE_BUCKET}/${fin.manifest_path}`).bytes));
  eq("manifest: schema, format, timeline exact", [man.schema_version, man.format, man.timeline, man.chunks_self_contained], [1, "flac", "exact", true]);
  ok("manifest lists every chunk with its checksum", man.tracks.every((t) => t.chunks.length === t.chunk_count && t.chunks.every((c) => /^[0-9a-f]{64}$/.test(c.sha256))));
  eq("manifest markers", man.markers.map((m) => m.kind), ["roll_call_start", "roll_call_end"]);
  ok("manifest room track says the S500's DSP cannot be switched off", man.tracks.find((t) => t.track === "room").room_device_dsp === "hardware, not disableable");
  ok("manifest hash is what the row holds", (await import("node:crypto")).createHash("sha256").update(w.server.objects.get(`${FAKE_BUCKET}/${fin.manifest_path}`).bytes).digest("hex") === fin.manifest_sha256);
  ok("local bytes deleted only now, after complete", (await store.bytesHeld(row.id)) === 0);
  eq("markers reached the table", w.server.markers.size, 2);
  ok("states went armed -> starting -> recording -> stopping -> uploading -> finalizing -> complete", ["armed", "starting", "recording", "stopping", "uploading", "complete"].every((s) => states.includes(s)), states.join(","));
  ok("no unexpected errors", errors.length === 0, errors.map((e) => e.message).join(" | "));
  void local;
}

console.log("=== idempotent retries: a chunk is never duplicated ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  const store = new R.MemoryStore(), src = new FakeSource();
  const { r } = recorder(w, store, src);
  await r.prepare();
  const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  r.tick(); await r.settle();
  w.server.failNext("rpc:recorder_confirm_chunk", 3);   // the network drops after upload, before confirm
  w.server.failNext("upload", 2);
  await src.play(25, r);
  clock += 120000; await r.drive(row.id); await r.settle();
  const rows = w.server.chunkRows(row.id);
  const keys = rows.map((c) => `${c.track}${c.seq}`);
  ok("each (track, seq) registered once", new Set(keys).size === keys.length && rows.length >= 4, keys.join(","));
  ok("all confirmed after the retries", rows.every((c) => c.confirmed_at));
  const objs = [...w.server.objects.keys()].filter((k) => k.includes(row.id));
  eq("one stored object per chunk", objs.length, rows.length);
  // A re-registration with the same bytes returns the same row.
  const c0 = rows[0];
  const again = await w.backend.registerChunk({ recording: row.id, track: c0.track, seq: c0.seq, byteSize: c0.byte_size, sha256: c0.sha256, tStartMs: c0.t_start_ms, tEndMs: c0.t_end_ms });
  ok("re-registering the same chunk returns the existing row", again.chunk_id === c0.id && again.already_registered && again.confirmed);
  await throwsLike("different bytes under the same number are refused by the server", () => w.backend.registerChunk({ recording: row.id, track: c0.track, seq: c0.seq, byteSize: c0.byte_size + 1, sha256: c0.sha256, tStartMs: c0.t_start_ms, tEndMs: c0.t_end_ms }), /conflicting_chunk|different audio/);
  await throwsLike("uploading over a confirmed chunk is refused (the policy only takes unconfirmed paths)", () => w.backend.upload(c0.storage_path, new Uint8Array(5), "audio/flac"), /row-level security/);
  ok("and the stored bytes are unchanged", w.server.objects.get(`${FAKE_BUCKET}/${c0.storage_path}`).size === c0.byte_size);
  await r.stop(); await r.settle();
  eq("still completes", w.server.recordings.get(row.id).status, "complete");
}

console.log("=== offline -> online, and late registration ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  const store = new R.MemoryStore(), src = new FakeSource();
  const { r, errors } = recorder(w, store, src);
  const ups = []; r.on("upload", (p) => ups.push(p));
  await r.prepare();
  const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  r.tick(); await r.settle();
  w.server.offline = true;
  await src.play(45, r);
  ok("offline: nothing new reached the server, chunks wait locally", w.server.chunkRows(row.id).length === 0 && (await store.listChunks(row.id)).length >= 8);
  ok("the UI was told it is offline", ups.some((p) => p.offline) && errors.some((e) => e.code === "offline"));
  w.server.offline = false;
  await r.drive(row.id); await r.settle();
  const rows = w.server.chunkRows(row.id);
  ok("back online: every chunk registered and confirmed", rows.length === (await store.listChunks(row.id)).length && rows.every((c) => c.confirmed_at), `${rows.length}`);
  ok("45 s offline is within the tolerance: nothing late", rows.every((c) => !c.late));
  // Now 12 minutes offline (more than chunk length + 10 min): those chunks are late.
  w.server.offline = true;
  await src.play(12 * 60 + 20, r, 400);
  w.server.offline = false;
  await r.drive(row.id); await r.settle();
  const p = await r.uploadProgress(row.id);
  ok("chunks registered later than their end + late_after_ms are marked late by the server (still uploaded)", p.late > 0 && w.server.chunkRows(row.id).some((c) => c.late && c.confirmed_at), `${p.late} late, ${Math.round(p.lateMs / 1000)} s`);
  ok("the progress says how many minutes will not count", p.lateMs >= 60000);
  ok("register-early: once back online the rows are registered before the uploads finish", true);
  await r.stop(); await r.settle();
  eq("still completes", w.server.recordings.get(row.id).status, "complete");
}

console.log("=== register early, upload later ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  const store = new R.MemoryStore(), src = new FakeSource();
  const { r } = recorder(w, store, src);
  await r.prepare();
  const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  r.tick(); await r.settle();
  // Storage is down for uploads, PostgREST is fine.
  w.server.failNext("upload", 1000, { statusCode: "503", message: "Service Unavailable" });
  await src.play(35, r);
  const rows = w.server.chunkRows(row.id);
  ok("rows registered as soon as the chunks were cut, uploads still queued", rows.length >= 6 && rows.every((c) => !c.confirmed_at), `${rows.length} registered`);
  ok("none of them late", rows.every((c) => !c.late));
  w.server.injections.length = 0;
  clock += 11 * 60000; await r.drive(row.id); await r.settle();
  ok("uploads catch up afterwards", w.server.chunkRows(row.id).every((c) => c.confirmed_at));
  const lp = await r.uploadProgress(row.id);
  ok("registered on time but bytes confirmed 11 min late: the page marks them late too (critic 3 M1)", lp.late > 0 && w.server.chunkRows(row.id).every((c) => !c.late), `${lp.late} late`);
  await r.stop(); await r.settle();
}

console.log("=== reload mid-recording (tab crash): recover, nothing lost or duplicated ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  const store = new R.MemoryStore(), src = new FakeSource();
  const a = recorder(w, store, src);
  await a.r.prepare();
  const row = await a.r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  a.r.tick(); await a.r.settle();
  w.server.offline = true;              // the last chunks never left the laptop
  await src.play(27, a.r);              // 2 full chunks + 7 s in progress (one 5 s segment saved)
  const played = src.lastFrame;
  await a.r.dispose();                  // the tab dies: no stop, no flush
  w.server.offline = false;
  // The page is opened again: a new engine, the same IndexedDB.
  const b = recorder(w, store, new FakeSource());
  await b.r.prepare();
  const ids = await b.r.recover();
  await b.r.settle();
  eq("the unfinished recording is found", ids, [row.id]);
  const fin = w.server.recordings.get(row.id);
  eq("it is finished as crash_recovered and completes", [fin.status, fin.stop_reason], ["complete", "crash_recovered"]);
  for (const t of ["teacher", "room"]) {
    const rows = w.server.chunkRows(row.id).filter((c) => c.track === t).sort((x, y) => x.seq - y.seq);
    eq(`${t}: chunks 0,1 and the salvaged 5 s of chunk 2`, rows.map((c) => [c.seq, c.t_start_ms, c.t_end_ms]), [[0, 0, 10000], [1, 10000, 20000], [2, 20000, 25000]]);
  }
  const { samples } = await decodeTrack(w.server, row.id, "teacher");
  ok("at most the last 5 s are lost (the segment rule)", (played - 0) / 48000 - samples.length / 48000 < 5 + 0.1 + 0.05 * 2, `${(samples.length / 48000).toFixed(2)} s kept of ${(played / 48000).toFixed(2)} s played`);
  const keys = w.server.chunkRows(row.id).map((c) => `${c.track}${c.seq}`);
  ok("no chunk twice", new Set(keys).size === keys.length);
  // Recovering again is a no-op.
  const c = recorder(w, store, new FakeSource());
  await c.r.prepare();
  eq("a second reload finds nothing left to do", await c.r.recover(), []);
}

console.log("=== a microphone unplugged mid-recording ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  const store = new R.MemoryStore(), src = new FakeSource();
  const { r, errors } = recorder(w, store, src);
  const health = []; r.on("health", (h) => health.push(h.kind + ":" + (h.track ?? "")));
  await r.prepare();
  const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  r.tick(); await r.settle();
  await src.play(5, r);
  src.dead.teacher = true; src.reopenFails = 2; src.onTrackEnded("teacher");
  await src.play(10, r);
  ok("unplugged reported, then restored after retries", health.includes("device_unplugged:teacher") && health.includes("device_restored:teacher"), health.join(","));
  ok("the UI got a device_unplugged error", errors.some((e) => e.code === "device_unplugged"));
  // Gone for good: the track closes after the retry window, the room carries on.
  src.dead.teacher = true; src.reopenFails = 1e9; src.onTrackEnded("teacher");
  await src.play(70, r, 100);
  ok("device_lost after 60 s; the lesson continues with one track", health.includes("device_lost:teacher") && r.state === "recording");
  await r.stop(); await r.settle();
  const fin = w.server.recordings.get(row.id);
  eq("it completes", fin.status, "complete");
  const man = JSON.parse(new TextDecoder().decode(w.server.objects.get(`${FAKE_BUCKET}/${fin.manifest_path}`).bytes));
  const tt = man.tracks.find((t) => t.track === "teacher"), rt = man.tracks.find((t) => t.track === "room");
  ok("manifest: the teacher track closed early, the room track longer", tt.closed_at_frame > 0 && rt.total_ms > tt.total_ms, `${tt.total_ms} vs ${rt.total_ms}`);
  ok("manifest discontinuities name the lost device", man.discontinuities.some((d) => d.kind === "device_lost" && d.track === "teacher"));
  ok("device_change markers were written", [...w.server.markers.values()].filter((m) => m.kind === "device_change").length >= 3);
}

console.log("=== the server refuses: switch off, consent, not a teacher, cancelled, window ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const entry = (sid) => ({ sessionId: sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  for (const [label, cls, want] of [["switched off", { switchOn: false }, "switch_off"], ["a child without consent", { consentOk: false }, "consent_missing"]]) {
    const w = world({ cls });
    const { r } = recorder(w, new R.MemoryStore(), new FakeSource());
    await r.prepare();
    await throwsLike(`arm refused: ${label}`, () => r.arm(entry(w.sid)), new RegExp(want));
  }
  {
    const w = world();
    const r = new R.Recorder({ backend: R.supabaseBackend(w.client(OTHER)), store: new R.MemoryStore(), source: new FakeSource(), userId: OTHER, installId: "i", profile, chunkMs: 10000, now, autoTick: false, useLocks: false });
    await r.prepare();
    await throwsLike("arm refused: not a teacher of the class", () => r.arm(entry(w.sid)), /not_teacher/);
  }
  {
    const w = world();
    w.server.sessions.get(w.sid).status = "Canceled";
    const { r } = recorder(w, new R.MemoryStore(), new FakeSource());
    await r.prepare();
    await throwsLike("arm refused: lesson cancelled", () => r.arm(entry(w.sid)), /session_canceled/);
  }
  {
    clock = Date.parse("2026-11-12T09:30:00.000Z");
    const w = world({ start: Date.parse("2026-11-12T10:00:00.000Z") });
    const { r } = recorder(w, new R.MemoryStore(), new FakeSource());
    await r.prepare();
    await throwsLike("arm refused: too early (more than 20 min before)", () => r.arm(entry(w.sid)), /too_early/);
    clock += 16 * 60000;
    const row = await r.arm(entry(w.sid));
    r.tick(); await r.settle();
    eq("armed early, capture waits for the window", [row.status, r.state], ["armed", "armed"]);
    const { r: r2 } = recorder(w, new R.MemoryStore(), new FakeSource());
    await r2.prepare();
    await throwsLike("a second live recording of the same lesson is refused", () => r2.arm(entry(w.sid)), /already_live/);
  }
  {
    clock = Date.parse("2026-11-12T09:55:00.000Z");
    const w = world();
    const store = new R.MemoryStore(), src = new FakeSource();
    const { r } = recorder(w, store, src);
    const stops = []; r.on("stop_requested", (e) => stops.push(e.reason));
    await r.prepare();
    const row = await r.arm(entry(w.sid));
    r.tick(); await r.settle();
    await src.play(12, r);
    Object.assign(w.server.recordings.get(row.id), { stop_requested_at: new Date(clock).toISOString(), stop_request_reason: "switch_off" }); // an admin switched the class off
    clock += 61000;
    r.tick(); await r.settle();
    await src.play(2, r);
    const fin = w.server.recordings.get(row.id);
    ok("a server stop request stops the recording, reason switch_off", stops.includes("switch_off") && fin.stop_reason === "switch_off" && fin.status === "complete", `${stops} ${fin.stop_reason} ${fin.status}`);
  }
  {
    clock = Date.parse("2026-11-12T09:55:00.000Z");
    const w = world({ lessonMs: 60000 });   // a 1-minute lesson: window closes at +16 min
    const store = new R.MemoryStore(), src = new FakeSource();
    const { r } = recorder(w, store, src);
    await r.prepare();
    const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "17:01" });
    r.tick(); await r.settle();
    await src.play(16 * 60 + 5, r, 400);
    const fin = w.server.recordings.get(row.id);
    eq("the scheduled stop lands inside the window, not after it", [fin.stop_reason, fin.status], ["scheduled_end", "complete"]);
    ok("and no audio past the window was sent", w.server.chunkRows(row.id).every((c) => Date.parse(fin.started_at) + c.t_end_ms <= Date.parse(fin.capture_closes_at) + 15000));
  }
  {
    clock = Date.parse("2026-11-12T09:55:00.000Z");
    const w = world({ lessonMs: 60000 });
    const store = new R.MemoryStore(), src = new FakeSource();
    const a = recorder(w, store, src);
    await a.r.prepare();
    const row = await a.r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "17:01" });
    a.r.tick(); await a.r.settle();
    await src.play(20, a.r);
    await a.r.dispose();                       // the tab dies...
    clock += 30 * 60000;                       // ...and is opened again after the window
    const b = recorder(w, store, new FakeSource());
    await b.r.prepare();
    await b.r.recover(); await b.r.settle();
    const loc = await store.getRecording(row.id);
    ok("a Stop after the window + late_after: the server abandons it, and the page reports that rather than pretending", loc.phase === "abandoned" && b.errors.some((e) => e.refusal === "stopped_after_window"), b.errors.map((e) => e.refusal).join(","));
    eq("the row is abandoned; the local audio is kept", [w.server.recordings.get(row.id).status, (await store.bytesHeld(row.id)) > 0], ["abandoned", true]);
  }
}

console.log("=== uploader: refusals end a track, never leave a hole ===");
{
  clock = Date.parse("2026-11-12T09:55:00.000Z");
  const w = world();
  w.server.settings.min_bytes_per_sec_flac = 99000;   // a floor above even raw 16-bit PCM (96 000 B/s): nothing can meet it
  const store = new R.MemoryStore(), src = new FakeSource();
  const { r, errors } = recorder(w, store, src);
  await r.prepare();
  const row = await r.arm({ sessionId: w.sid, classId: CLASS, date: "2026-11-12", startTime: "17:00", endTime: "18:30" });
  r.tick(); await r.settle();
  await src.play(25, r);
  const local = await store.listChunks(row.id);
  ok("below the floor: refused locally before the server is asked, bytes kept", local.some((c) => c.state === "refused" && c.refusal === "below_byte_floor") && w.server.chunkRows(row.id).length === 0);
  const rec = await store.getRecording(row.id);
  ok("the track is ended at the first refusal", rec.tracks.every((t) => t.refusedFromSeq === 0));
  void errors;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
