// A synthetic "lesson" WAV for the browser suite (no real voices): bursts of
// harmonic tones with a wandering pitch and noise, at speech-like levels with
// pauses, never at full scale. Chrome's fake microphones loop it.
//
//   node scripts/recorder/make-synthetic-wav.mjs <out.wav> [seconds]
//   RECORDER_WAV=<out.wav> node scripts/recorder/browser.test.mjs
import { writeFileSync } from "node:fs";

const out = process.argv[2];
if (!out) { console.error("usage: make-synthetic-wav.mjs <out.wav> [seconds]"); process.exit(1); }
const seconds = Number(process.argv[3] ?? 180), sr = 16000, n = seconds * sr;
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pcm = new Int16Array(n);
let phase = 0;
for (let i = 0; i < n; i++) {
  const t = i / sr;
  const syl = Math.sin(Math.PI * ((t * 4) % 1));            // ~4 "syllables" a second
  const talking = Math.sin(t / 3) > -0.6 ? 1 : 0;            // pauses now and then
  const f0 = 140 + 40 * Math.sin(t * 0.7) + 20 * Math.sin(t * 3.1);
  phase += (2 * Math.PI * f0) / sr;
  let v = 0;
  for (let h = 1; h <= 6; h++) v += Math.sin(phase * h) / h;
  v = v * 0.25 * syl * talking + (rnd() - 0.5) * 0.01;
  pcm[i] = Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
}
const data = n * 2, buf = Buffer.alloc(44 + data);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + data, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(data, 40);
for (let i = 0; i < n; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
writeFileSync(out, buf);
console.log(`wrote ${out}: ${seconds} s, ${sr} Hz mono, synthetic`);
