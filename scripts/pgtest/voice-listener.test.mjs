// Voice points assistant: the on-device listener (src/lib/voiceAward/listener).
//
// Part 1 is pure DSP: fbank, resampler, DTW, WAV. Part 2 uses real speech made
// with Windows text-to-speech (two voices, "David" = teacher A, "Zira" = B) and
// the real WeSpeaker ResNet34 model through onnxruntime-web (wasm) in node:
// enrol A, score a new sentence by A and by B, then run the whole listening
// engine over streams ("heck ..." wakes, other speech does not).
//
// Part 2 is skipped, with a message, when PowerShell speech or the model file is
// missing. The model: set HEC_VOICE_MODEL=<path to voxceleb_resnet34_LM.onnx>
// (it is the file at VOICEPRINT_MODEL_URL in src/lib/voiceAward/types.ts).
//
// TTS voices are cleaner than a classroom: these numbers show the code works,
// not how it will score on a clip-on mic next to thirty children.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = resolve(repo, "src/lib/voiceAward/listener").replace(/\\/g, "/");
const work = mkdtempSync(join(tmpdir(), "hec-voice-listener-"));

const out = await build({
  stdin: {
    contents: `
      export * from "${L}/dsp"; export * from "${L}/resample"; export * from "${L}/wav";
      export * from "${L}/fbank"; export * from "${L}/mfcc"; export * from "${L}/vad";
      export * from "${L}/dtw"; export * from "${L}/embedding"; export * from "${L}/calibrate";
      export * from "${L}/engine"; export * from "${L}/embedClient";`,
    resolveDir: repo, sourcefile: "entry.ts", loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const bundle = join(work, "listener.mjs");
writeFileSync(bundle, out.outputFiles[0].text);
const K = await import(pathToFileURL(bundle).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const note = (s) => console.log(`        ${s}`);
const f3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : String(v));

// ---------------------------------------------------------------- part 1: DSP
console.log("fbank");
{
  const sr = 16000, n = sr; // 1 s of a 1 kHz sine, amplitude 0.5
  const sine = new Float32Array(n).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 1000 * i) / sr));
  const { data, frames } = K.fbank(sine);
  ok("frame count = 1 + (16000-400)/160", frames === 98, String(frames));
  ok("80 numbers a frame, all finite", data.length === frames * 80 && data.every(Number.isFinite));
  let peak = 0, pv = -1e9;
  for (let b = 0; b < 80; b++) if (data[10 * 80 + b] > pv) { pv = data[10 * 80 + b]; peak = b; }
  // mel(1000) on the Kaldi scale: bin centre = mel(20) + (b+1) * delta
  const m = (f) => 1127 * Math.log(1 + f / 700), delta = (m(8000) - m(20)) / 81;
  const want = Math.round((m(1000) - m(20)) / delta - 1);
  ok("a 1 kHz sine peaks in the mel bin of 1 kHz", Math.abs(peak - want) <= 1, `peak bin ${peak}, expected ${want}`);
  const silence = K.fbank(new Float32Array(4000)).data;
  ok("digital silence floors at log(1.19e-7) = -15.94", Math.abs(silence[0] - Math.log(1.1920929e-7)) < 1e-3, f3(silence[0]));
  // loud-to-quiet: doubling the amplitude adds ln(4) = 1.386 to every energy
  const loud = K.fbank(sine.map((v) => v * 2)).data;
  ok("doubling the amplitude adds ln 4 to the peak bin", Math.abs(loud[10 * 80 + peak] - data[10 * 80 + peak] - Math.log(4)) < 0.01, f3(loud[10 * 80 + peak] - data[10 * 80 + peak]));
  // Absolute value, computed by hand from the spec: 0.5 sine (x32768 = 16384 peak). Checked against a direct DFT.
  const frame = Array.from({ length: 400 }, (_, i) => 16384 * Math.sin((2 * Math.PI * 1000 * i) / sr));
  const mean = frame.reduce((a, b) => a + b, 0) / 400;
  const x = frame.map((v) => v - mean);
  for (let i = 399; i > 0; i--) x[i] -= 0.97 * x[i - 1];
  x[0] -= 0.97 * x[0];
  const w = x.map((v, i) => v * Math.pow(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / 399), 0.85));
  const lowM = m(20), hiM = m(8000), dl = (hiM - lowM) / 81;
  let e = 0;
  for (let k = 0; k < 256; k++) {
    let re = 0, im = 0;
    for (let i = 0; i < 400; i++) { re += w[i] * Math.cos((2 * Math.PI * k * i) / 512); im -= w[i] * Math.sin((2 * Math.PI * k * i) / 512); }
    const mm = m((16000 / 512) * k), l = lowM + peak * dl, c = lowM + (peak + 1) * dl, r = lowM + (peak + 2) * dl;
    const wt = mm > l && mm < c ? (mm - l) / (c - l) : mm > c && mm < r ? (r - mm) / (r - c) : 0;
    e += wt * (re * re + im * im);
  }
  ok("bin value equals a direct-DFT computation of the Kaldi recipe", Math.abs(Math.log(e) - data[10 * 80 + peak]) < 1e-3, `${f3(Math.log(e))} vs ${f3(data[10 * 80 + peak])}`);
  const cm = Float32Array.from(data); K.meanNormalise(cm, frames);
  let mx = 0; for (let f = 0; f < frames; f++) mx = Math.max(mx, Math.abs(cm[f * 80 + 5]) > 0 ? 0 : 0);
  let s = 0; for (let f = 0; f < frames; f++) s += cm[f * 80 + peak];
  ok("mean normalisation leaves each bin with mean 0", Math.abs(s / frames) < 1e-4);
}

console.log("resampler");
{
  for (const [rate, hz] of [[48000, 1000], [44100, 3000], [48000, 7000]]) {
    const n = rate; // 1 s
    const x = new Float32Array(n).map((_, i) => 0.6 * Math.sin((2 * Math.PI * hz * i) / rate));
    // streamed in odd-sized blocks, as the worklet does
    const r = new K.Resampler(rate, 16000);
    const parts = [];
    for (let o = 0; o < n; o += 1000) parts.push(r.process(x.subarray(o, Math.min(n, o + 1000))));
    const y = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
    let p0 = 0; for (const p of parts) { y.set(p, p0); p0 += p.length; }
    ok(`${rate} -> 16000: length right`, Math.abs(y.length - 16000) <= 30, String(y.length));
    // frequency by zero crossings of the steady part
    const a = 1000, b = y.length - 1000;
    let zc = 0; for (let i = a + 1; i < b; i++) if (y[i - 1] < 0 && y[i] >= 0) zc++;
    const est = zc / ((b - a) / 16000);
    // amplitude of the steady part
    let pk = 0; for (let i = a; i < b; i++) pk = Math.max(pk, Math.abs(y[i]));
    ok(`${hz} Hz sine stays ${hz} Hz`, Math.abs(est - hz) < hz * 0.01 + 2, `${est.toFixed(1)} Hz, peak ${pk.toFixed(3)}`);
    ok(`${hz} Hz keeps its level`, pk > (hz >= 7000 ? 0.5 : 0.55) && pk < 0.65, pk.toFixed(3));
  }
  // aliasing: 12 kHz from a 48 kHz source must be filtered, not folded to 4 kHz
  const x = new Float32Array(48000).map((_, i) => 0.6 * Math.sin((2 * Math.PI * 12000 * i) / 48000));
  const y = new K.Resampler(48000, 16000).process(x);
  let pk = 0; for (let i = 1000; i < y.length - 1000; i++) pk = Math.max(pk, Math.abs(y[i]));
  ok("12 kHz (above 8 kHz Nyquist) is removed, not folded in", pk < 0.02, `peak ${pk.toFixed(4)}`);
}

console.log("wav");
{
  const x = new Float32Array(16000).map((_, i) => 0.7 * Math.sin(i / 10));
  const wav = K.floatToWav(x, 16000);
  ok("44-byte header + 2 bytes a sample", wav.length === 44 + 32000);
  ok("RIFF/WAVE/fmt/data tags", String.fromCharCode(...wav.slice(0, 4)) === "RIFF" && String.fromCharCode(...wav.slice(8, 12)) === "WAVE");
  const back = K.wavToFloat(wav);
  let err = 0; for (let i = 0; i < x.length; i++) err = Math.max(err, Math.abs(back.samples[i] - x[i]));
  ok("round trip is within 2 LSB", err < 2 / 32768 && back.sampleRate === 16000, err.toExponential(2));
  const b64 = K.floatToWavBase64(x);
  const bytes = K.base64ToBytes(b64);
  ok("base64 round trip", bytes.length === wav.length && bytes.every((v, i) => v === wav[i]));
  const big = new Float32Array(16000 * 8).map((_, i) => Math.sin(i / 7));
  const t0 = performance.now(); K.floatToWavBase64(big); const ms = performance.now() - t0;
  ok("8 s of audio to base64 is fast", ms < 50, `${ms.toFixed(1)} ms`);
}

console.log("dtw");
{
  const mk = (n, seed) => Array.from({ length: n }, (_, t) => Float32Array.from({ length: 26 }, (_, d) => Math.sin(seed * 1.7 + t * 0.35 * (1 + (d % 3)) + d) * (3 - d / 10)));
  const tpl = mk(40, 1);
  const seq = [...mk(5, 9), ...tpl, ...mk(30, 5)];
  const same = K.subsequenceDtw(tpl, tpl, { startSlack: 0 });
  ok("identical template: distance 0", same.dist < 1e-9, f3(same.dist));
  const hidden = K.subsequenceDtw(tpl, seq, { startSlack: 8 });
  ok("template starting 5 frames in is found, distance 0", hidden.dist < 1e-9 && hidden.end === 44, `${f3(hidden.dist)} end ${hidden.end}`);
  const stretch = (a, k) => Array.from({ length: Math.round(a.length * k) }, (_, i) => a[Math.min(a.length - 1, Math.floor(i / k))]);
  const slow = K.subsequenceDtw(tpl, stretch(tpl, 1.3), { startSlack: 4 });
  const fast = K.subsequenceDtw(tpl, stretch(tpl, 0.75), { startSlack: 4 });
  ok("a 1.3x slower copy is still ~0", slow.dist < 0.5, f3(slow.dist));
  ok("a 0.75x faster copy is still close (< 1.5)", fast.dist < 1.5, f3(fast.dist));
  const other = K.subsequenceDtw(tpl, mk(60, 7), { startSlack: 8 });
  ok("a different word is far", other.dist > 5 * Math.max(slow.dist, 0.05) && other.dist > 1.5, f3(other.dist));
  const two = K.bestTwoAverage([5, 1, 3, 2, 9]);
  ok("best-2-of-5 average", Math.abs(two - 1.5) < 1e-9);
}

console.log("embed service failure handling (fake worker)");
{
  const mkWorker = (mode) => class FakeWorker {
    constructor() { FakeWorker.last = this; setTimeout(() => this.onmessage?.({ data: { type: "ready" } }), 0); }
    postMessage(m) {
      if (m.type === "embed") {
        if (mode === "crash") setTimeout(() => this.onerror?.({ message: "boom" }), 0);
        else if (mode === "ok") setTimeout(() => this.onmessage?.({ data: { type: "embedding", id: m.id, embedding: new Float32Array(256) } }), 0);
      }
    }
    terminate() { this.dead = true; }
  };
  globalThis.fetch = async () => new Response(new Uint8Array(21_000_000), { headers: { "content-length": "21000000" } });
  const wave = new Float32Array(32000);
  globalThis.Worker = mkWorker("crash");
  let svc = await K.getEmbedService();
  let err = null; try { await svc.embed(wave); } catch (e) { err = e; }
  ok("a worker that dies after ready rejects the pending embed", err && /boom/.test(err.message), String(err));
  let err2 = null; try { await svc.embed(wave); } catch (e) { err2 = e; }
  ok("later embeds on the dead service reject at once", !!err2);
  globalThis.Worker = mkWorker("ok");
  svc = await K.getEmbedService();
  ok("the next getEmbedService starts a fresh worker", (await svc.embed(wave)).length === 256);
  svc.dispose();
  globalThis.Worker = mkWorker("silent");
  svc = await K.getEmbedService();
  const t = performance.now(); let err3 = null; try { await svc.embed(wave); } catch (e) { err3 = e; }
  ok("a worker that never answers is given up on after the timeout", err3 && /too long/.test(err3.message) && performance.now() - t >= K.EMBED_TIMEOUT_MS - 100, `${(performance.now() - t) | 0} ms`);
  // the engine turns a failing embed into an error state, not a hang
  const prof = { version: 1, userId: "u", createdAt: "", embedding: new Array(256).fill(0), threshold: 0.4, wakeTemplates: [[new Array(26).fill(0)]], wakeThreshold: 1e9, micLabel: null };
  const states = [];
  const eng = new K.ListenerEngine(prof, { onState: (x, d) => states.push(d ? x + ":" + d : x), onCommand() {}, onRejected() {} }, { embed: async () => { throw new Error("The voice check stopped working. Switch voice points off and on again."); } });
  let sd = 5; const rn = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5);
  const burst = (sec, amp) => Float32Array.from({ length: sec * 16000 }, (_, i) => rn() * amp * (0.5 + 0.5 * Math.sin(i / 20)));
  for (const blk of [burst(1, 0.002), burst(2, 0.4), burst(2, 0.002)]) for (let o = 0; o < blk.length; o += 320) eng.push(blk.subarray(o, o + 320));
  await new Promise((r) => setTimeout(r, 100));
  ok("a failing embed gives onState error with the sentence, then listening again", states.some((x) => x.startsWith("error:The voice check stopped working")) && states[states.length - 1] === "listening", states.join(" > "));
}

// ------------------------------------------------------------- part 2: speech
const ttsDir = process.env.HEC_VOICE_TTS_DIR || join(tmpdir(), "hec-voice-listener-tts");
const PS = `
param([string]$Out)
Add-Type -AssemblyName System.Speech
function Say($voice, $rate, $text, $file) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice($voice); $s.Rate = $rate
  $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $s.SetOutputToWaveFile((Join-Path $Out $file), $fmt); $s.Speak($text); $s.Dispose()
}
$A = "Microsoft David Desktop"; $B = "Microsoft Zira Desktop"
$reading = "Good morning everyone. Today we are going to learn about animals and where they live. Please open your books to page twelve and look at the picture of the big green forest. Some animals live in the water, and some animals live on the land. Can anyone tell me which animals can fly? That is right, birds can fly very high in the sky. After the lesson we will play a game together, so please listen carefully and wait for your turn. Remember to speak clearly and use full sentences. When you finish the exercise, put your pencil down and look at me. Well done, class. You are working very hard today, and I am proud of every one of you."
$new = "Please sit down quietly and take out your notebooks for the writing activity."
$cmds = @("add thirty stars to Minh", "hello everyone", "heck add thirty stars to Minh", "heck yes", "heck undo that", "heck take five points from Lan for talking")
Say $A 0 $reading "A_reading.wav"; Say $A 0 $new "A_new.wav"; Say $B 0 $reading "B_reading.wav"; Say $B 0 $new "B_new.wav"
$rates = @(-2, -1, 0, 1, 2)
for ($i = 0; $i -lt 5; $i++) { Say $A $rates[$i] "heck." ("A_wake" + $i + ".wav"); Say $B $rates[$i] "heck." ("B_wake" + $i + ".wav") }
for ($i = 0; $i -lt $cmds.Count; $i++) { Say $A 0 $cmds[$i] ("A_cmd" + $i + ".wav"); Say $B 0 $cmds[$i] ("B_cmd" + $i + ".wav") }
Say $A 0 "Everyone please check your homework, then the hockey club will meet at four." "A_neg_check.wav"
`;
let haveSpeech = existsSync(join(ttsDir, "A_neg_check.wav"));
if (!haveSpeech && process.platform === "win32") {
  try {
    mkdirSync(ttsDir, { recursive: true });
    const ps1 = join(work, "tts.ps1");
    writeFileSync(ps1, PS);
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-Out", ttsDir], { stdio: "pipe", timeout: 120000 });
    haveSpeech = existsSync(join(ttsDir, "A_neg_check.wav"));
  } catch (e) { console.log(`  (could not run Windows speech: ${String(e.message).split("\n")[0]})`); }
}
const modelPath = process.env.HEC_VOICE_MODEL ||
  "C:/Users/Dell/AppData/Local/Temp/claude/1da31f9f70d7ac5c/6b4bebbc-b2fc-40ed-85b3-af1064264167/scratchpad/voice-model/voxceleb_resnet34_LM.onnx";

if (!haveSpeech) {
  console.log("\nSKIPPED part 2: no Windows text-to-speech here (needs PowerShell + System.Speech).");
} else {
  console.log("\nspeech (Windows TTS: A = David, B = Zira)");
  const load = (name) => { const w = K.wavToFloat(new Uint8Array(readFileSync(join(ttsDir, name)))); return K.resampleTo16k(w.samples, w.sampleRate); };
  const A = { reading: load("A_reading.wav"), new: load("A_new.wav"), wake: [0, 1, 2, 3, 4].map((i) => load(`A_wake${i}.wav`)), cmd: [0, 1, 2, 3, 4, 5].map((i) => load(`A_cmd${i}.wav`)), check: load("A_neg_check.wav") };
  const B = { reading: load("B_reading.wav"), new: load("B_new.wav"), wake: [0, 1, 2, 3, 4].map((i) => load(`B_wake${i}.wav`)), cmd: [0, 1, 2, 3, 4, 5].map((i) => load(`B_cmd${i}.wav`)) };
  ok("TTS audio resampled from 48 kHz to 16 kHz", Math.abs(A.reading.length / 16000 - 44.6) < 3, `${(A.reading.length / 16000).toFixed(1)} s reading`);

  // Wake-only checks need no model.
  const wk = K.calibrateWake(A.wake, A.reading);
  ok("wake calibration accepts 5 clean samples of voice A", wk.ok, wk.message);
  note(`leave-one-out best-2-of-4 distances: ${wk.detail.loo.map(f3).join(", ")}`);
  note(`closest of ${wk.detail.negCount} other words in the reading: ${wk.detail.negMin == null ? "n/a" : f3(wk.detail.negMin)}`);
  note(`wake threshold: ${f3(wk.threshold)}`);
  const noWord = K.calibrateWake([new Float32Array(16000), ...A.wake.slice(1)], null);
  ok("a silent HEC sample is refused with a sentence", !noWord.ok && /sample 1/i.test(noWord.message), noWord.message);
  const longWord = K.calibrateWake([A.reading.subarray(0, 48000), ...A.wake.slice(1)], null);
  ok("a 3 s HEC sample is refused as too long", !longWord.ok && /too long/.test(longWord.message), longWord.message);
  const shortReading = await K.buildProfileCore("u", A.reading.subarray(0, 16000 * 8), A.wake, null, { embed: async () => new Float32Array(256) });
  ok("an 8 s reading is refused (needs 15 s of speech)", !shortReading.profile && !shortReading.quality.ok, shortReading.quality.message);

  if (!existsSync(modelPath)) {
    console.log(`\nSKIPPED the speaker-check part: model not found at ${modelPath} (set HEC_VOICE_MODEL).`);
  } else {
    const ort = await import(pathToFileURL(resolve(repo, "node_modules/onnxruntime-web/dist/ort.wasm.min.mjs")).href);
    ort.env.wasm.numThreads = 1;
    const embedder = await K.makeEmbedder(ort, new Uint8Array(readFileSync(modelPath)), { graphOptimizationLevel: "all" });
    let embedMs = [], inflight = 0;
    const timed = { embed: async (w) => { inflight++; const t = performance.now(); const e = await embedder.embed(w).finally(() => inflight--); embedMs.push(performance.now() - t); return e; } };

    console.log("\nenrolment");
    const t0 = performance.now();
    const prog = [];
    const built = await K.buildProfileCore("teacher-A", A.reading, A.wake, "TTS", timed, (p) => prog.push(p));
    note(`buildProfile took ${((performance.now() - t0) / 1000).toFixed(1)} s for a ${(A.reading.length / 16000).toFixed(0)} s reading; ${embedMs.length} embeddings, ${(embedMs.reduce((a, b) => a + b, 0) / embedMs.length).toFixed(0)} ms each (3 s windows)`);
    ok("voice A enrols", built.quality.ok && !!built.profile, built.quality.message);
    ok("progress goes 0..1 in order", prog.length > 3 && prog.every((v, i) => i === 0 || v >= prog[i - 1]) && prog[prog.length - 1] === 1);
    const P = built.profile;
    ok("profile shape: 256-number unit embedding, 5 templates of 26-number frames", P.embedding.length === 256 && Math.abs(Math.hypot(...P.embedding) - 1) < 1e-3 && P.wakeTemplates.length === 5 && P.wakeTemplates.every((t) => t.every((f) => f.length === 26)));
    ok("threshold within [0.35, 0.5]", P.threshold >= 0.35 && P.threshold <= 0.5, f3(P.threshold));
    note(`speaker threshold ${f3(P.threshold)}, wake threshold ${f3(P.wakeThreshold)}`);
    const json = JSON.stringify(P);
    ok("profile is JSON-safe and small", json.length < 200000, `${(json.length / 1024).toFixed(0)} KB`);

    console.log("teacher check (cosine against voice A's profile)");
    // As the engine cuts a clip: 200 ms before the first sound to 200 ms after the last.
    const clipOf = (w) => { const { flags } = K.speechFlags(w); const a = flags.indexOf(true), b = flags.lastIndexOf(true); return w.subarray(Math.max(0, a * 160 - 3200), Math.min(w.length, b * 160 + 400 + 3200)); };
    const scoreOf = async (w) => K.cosine(await embedder.embed(K.fitForEmbedding(w)), P.embedding);
    const sA = await scoreOf(clipOf(A.new)), sB = await scoreOf(clipOf(B.new));
    ok("a NEW sentence by A scores at or above the threshold", sA >= P.threshold, `${f3(sA)} vs ${f3(P.threshold)}`);
    ok("voice B (different speaker) scores below it", sB < P.threshold, `${f3(sB)} vs ${f3(P.threshold)}`);
    const A_all = []; for (const c of A.cmd) A_all.push(await scoreOf(clipOf(c)));
    const B_all = []; for (const c of B.cmd) B_all.push(await scoreOf(clipOf(c)));
    note(`A commands (${A.cmd.map((c) => (clipOf(c).length / 16000).toFixed(1) + "s").join(" ")}): ${A_all.map(f3).join(" ")}`);
    note(`B commands: ${B_all.map(f3).join(" ")}`);
    ok("every command clip by A (0.6-3 s long) is accepted", A_all.every((s) => s >= P.threshold), `min ${f3(Math.min(...A_all))}`);
    ok("every command clip by B is rejected", B_all.every((s) => s < P.threshold), `max ${f3(Math.max(...B_all))}`);

    console.log("wake word through the whole engine");
    // Stream = quiet noise + clip + quiet noise, fed in 20 ms blocks like the capture worklet.
    let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5) * 2;
    const noise = (s) => Float32Array.from({ length: Math.round(s * 16000) }, () => rnd() * 0.002);
    const cat = (...p) => { const o = new Float32Array(p.reduce((a, b) => a + b.length, 0)); let k = 0; for (const x of p) { o.set(x, k); k += x.length; } return o; };
    const mix = (x) => { const n = noise(x.length / 16000); for (let i = 0; i < x.length; i++) n[i] += x[i]; return n; };
    async function run(name, clip, { profile = P, pre = 1.5, post = 2.5 } = {}) {
      const ev = { states: [], commands: [], rejected: [], levels: 0 };
      const checks = [];
      const eng = new K.ListenerEngine(profile, {
        onState: (s) => ev.states.push(s), onCommand: (c) => ev.commands.push(c), onRejected: (r, s) => ev.rejected.push([r, s]), onLevel: () => ev.levels++,
      }, { embed: (w) => timed.embed(w), onWakeCheck: (i) => checks.push(i) });
      const stream = cat(noise(pre), mix(clip), noise(post));
      for (let o = 0; o < stream.length; o += 320) eng.push(stream.subarray(o, Math.min(stream.length, o + 320)));
      await new Promise((r) => setTimeout(r, 50));
      while (inflight > 0) await new Promise((r) => setTimeout(r, 50));
      return { ev, checks, eng };
    }
    const scores = (r) => r.checks.map((c) => `${f3(c.score)}${c.heard ? "*" : ""}`).join(" ");

    const r1 = await run("heck add thirty stars to Minh (A)", A.cmd[2]);
    note(`"heck add thirty stars to Minh" by A: wake checks [${scores(r1)}] (threshold ${f3(P.wakeThreshold)}), states ${r1.ev.states.join(">")}`);
    ok("A: 'heck add thirty stars to Minh' wakes and is sent", r1.ev.commands.length === 1 && r1.checks.some((c) => c.heard), JSON.stringify(r1.ev.rejected));
    if (r1.ev.commands[0]) {
      const c = r1.ev.commands[0];
      const back = K.wavToFloat(K.base64ToBytes(c.wavBase64));
      ok("the clip is a 16 kHz WAV that includes the wake word, with the score attached", back.sampleRate === 16000 && Math.abs(back.samples.length / 16000 * 1000 - c.durationMs) < 2 && c.speakerScore >= P.threshold, `${c.durationMs} ms, score ${f3(c.speakerScore)}`);
      ok("clip covers the whole phrase (>= clip length of the TTS, +-0.5 s)", Math.abs(c.durationMs / 1000 - A.cmd[2].length / 16000) < 1.2, `${c.durationMs} ms vs ${(A.cmd[2].length / 16 ).toFixed(0)} ms`);
    }
    ok("level meter fires about 15 times a second", r1.ev.levels > 40, String(r1.ev.levels));

    const r2 = await run("add thirty stars to Minh (A)", A.cmd[0]);
    note(`"add thirty stars to Minh" (no wake word) by A: [${scores(r2)}]`);
    ok("A without the wake word: no wake", r2.checks.every((c) => !c.heard) && !r2.ev.commands.length && !r2.ev.states.includes("recording"));
    const r3 = await run("hello everyone (A)", A.cmd[1]);
    note(`"hello everyone" by A: [${scores(r3)}]`);
    ok("'hello everyone': no wake", r3.checks.every((c) => !c.heard) && !r3.ev.commands.length);
    const r4 = await run("check/hockey sentence (A)", A.check);
    note(`"Everyone please check your homework, then the hockey club..." by A: [${scores(r4)}]`);
    ok("a sentence with 'check' and 'hockey' in it: no wake", r4.checks.every((c) => !c.heard) && !r4.ev.commands.length);
    const r5 = await run("heck add thirty stars to Minh (B)", B.cmd[2]);
    note(`"heck add thirty stars to Minh" by B (wrong speaker): wake [${scores(r5)}], rejected ${JSON.stringify(r5.ev.rejected)}`);
    ok("B says the wake word: nothing is sent (either not woken by another voice, or held back as not_teacher)", !r5.ev.commands.length);
    const r6 = await run("heck yes (A)", A.cmd[3]);
    note(`"heck yes" by A: [${scores(r6)}], ${r6.ev.commands.length ? `sent ${r6.ev.commands[0].durationMs} ms score ${f3(r6.ev.commands[0].speakerScore)}` : "rejected " + JSON.stringify(r6.ev.rejected)}`);
    ok("A: 'heck yes' (a short command) is sent", r6.ev.commands.length === 1, JSON.stringify(r6.ev.rejected));
    const r7 = await run("heck alone (A)", A.wake[2]);
    note(`"heck" alone by A: [${scores(r7)}], rejected ${JSON.stringify(r7.ev.rejected)}`);
    ok("the wake word alone is dropped as too_short", !r7.ev.commands.length && r7.ev.rejected.some(([why]) => why === "too_short"));
    const r8 = await run("after a chat (A)", cat(A.new, noise(1.0), A.cmd[5]), { pre: 1 });
    note(`ordinary talk, a pause, then "heck take five points from Lan for talking": [${scores(r8)}]`);
    ok("wake word after other speech and a pause is still heard", r8.ev.commands.length === 1, JSON.stringify(r8.ev.rejected));

    const dtwMs = [r1, r2, r3, r4, r5, r6, r7, r8].flatMap((r) => r.checks.map((c) => c.ms));
    const dsum = [...dtwMs].sort((a, b) => a - b);
    note(`wake check time over ${dtwMs.length} checks: median ${dsum[Math.floor(dsum.length / 2)].toFixed(2)} ms, max ${dsum[dsum.length - 1].toFixed(2)} ms`);
    ok("a wake check takes well under 50 ms", dsum[dsum.length - 1] < 50);
    const em = embedMs.slice(-12);
    note(`embedding time, last ${em.length} calls (2-4.5 s of audio): ${em.map((v) => v.toFixed(0)).join(" ")} ms`);

    // pause / resume
    const ev = []; const eng = new K.ListenerEngine(P, { onState: (s) => ev.push(s), onCommand() {}, onRejected() {} }, { embed: timed.embed });
    eng.pause(); eng.push(noise(1)); eng.resume();
    ok("pause then resume reports paused > listening", ev.join(">") === "paused>listening");
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
