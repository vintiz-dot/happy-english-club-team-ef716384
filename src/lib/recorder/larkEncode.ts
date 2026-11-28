// One Lark chunk: read the transmitter's WAV bytes for 4 minutes of its timeline, decode them (16/24/32-bit
// integer, 32/64-bit float, any channel count mixed to mono), resample to 16 kHz with a windowed-sinc low-pass,
// round to 16-bit and encode FLAC with the recorder's own encoder (flac.ts). Then the SHA-256 (hash.ts). LARK_OUT_RATE equals
// RECORDER_SAMPLE_RATE (index.ts, not imported here: it pulls in the capture code); the test holds them equal.
//
// Every chunk is computed from the source alone (its filter reads a little of the audio either side), never from
// the previous chunk's state, so:
//   * the browser holds one chunk at a time (a 2-hour 32-bit float file is never in memory: about 46 MB of source
//     bytes and floats per chunk, then dropped), and
//   * a resumed import re-makes chunk N byte for byte, so the server's "already registered" check holds.
// Runs in larkWorker.ts in the browser, and in Node for the tests: the bytes come through a `read` callback.

import { encodeFlac } from "./flac";
import { sha256Hex } from "./hash";
import { LARK_OUT_RATE, type ChunkSpan, type TransmitterLayout } from "./larkImport";

/** The parts of a laid-out file the encoder needs (structured-clone friendly, for the Worker). */
export interface EncodeFile {
  key: string;
  offsetFrames: number;
  frames: number;
  dataOffset: number;
  blockAlign: number;
  bytesPerSample: number;
  channels: number;
  isFloat: boolean;
  bitDepth: number;
}
export interface EncodePlan { sampleRate: number; timelineFrames: number; files: EncodeFile[] }

export function encodePlan(l: TransmitterLayout): EncodePlan {
  return {
    sampleRate: l.sampleRate, timelineFrames: l.timelineFrames,
    files: l.files.map((f) => ({
      key: f.key, offsetFrames: f.offsetFrames, frames: f.info.frames, dataOffset: f.info.dataOffset,
      blockAlign: f.info.blockAlign, bytesPerSample: f.info.bytesPerSample, channels: f.info.channels,
      isFloat: f.info.isFloat, bitDepth: f.info.bitDepth,
    })),
  };
}

/** Read bytes [start, end) of the file with this key. */
export type ReadBytes = (key: string, start: number, end: number) => Promise<Uint8Array>;

/** Decode interleaved frames to mono float (-1..1). */
export function decodeFrames(bytes: Uint8Array, f: Pick<EncodeFile, "bytesPerSample" | "channels" | "isFloat" | "bitDepth">, out: Float32Array, outAt: number): void {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ch = f.channels, bps = f.bytesPerSample, n = Math.floor(bytes.length / (bps * ch));
  const inv = 1 / ch;
  let p = 0;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < ch; c++, p += bps) {
      if (f.isFloat) s += bps === 4 ? v.getFloat32(p, true) : v.getFloat64(p, true);
      else if (bps === 2) s += v.getInt16(p, true) / 32768;
      else if (bps === 3) s += ((bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16)) << 8 >> 8) / 8388608;
      else s += v.getInt32(p, true) / 2147483648;
    }
    const x = ch === 1 ? s : s * inv;
    out[outAt + i] = Number.isFinite(x) ? x : 0;
  }
}

/** Source frames [a, b) of the timeline as mono floats; zeros where no file covers it. */
export async function readTimeline(plan: EncodePlan, a: number, b: number, read: ReadBytes): Promise<Float32Array> {
  const out = new Float32Array(Math.max(0, b - a));
  for (const f of plan.files) {
    const s = Math.max(a, f.offsetFrames), e = Math.min(b, f.offsetFrames + f.frames);
    if (e <= s) continue;
    // Read in pieces of at most ~8 MB so no single buffer is large.
    const step = Math.max(1, Math.floor((8 << 20) / f.blockAlign));
    for (let x = s; x < e; x += step) {
      const y = Math.min(e, x + step);
      const from = f.dataOffset + (x - f.offsetFrames) * f.blockAlign;
      const bytes = await read(f.key, from, from + (y - x) * f.blockAlign);
      decodeFrames(bytes, f, out, x - a);
    }
  }
  return out;
}

// ---------------------------------------------------------------- resampling
const ZERO_CROSSINGS = 12;          // per side, at the output rate
const PHASES = 512;                 // fractional positions for a non-integer ratio

interface Kernel { half: number; taps: Float32Array[]; integer: boolean; ratio: number }
const kernels = new Map<number, Kernel>();

function bessel0(x: number) { let s = 1, t = 1; for (let k = 1; k < 30; k++) { t *= (x / (2 * k)) ** 2; s += t; } return s; }

/** Low-pass at 0.45 x the output rate (7.2 kHz for 16 kHz), Kaiser window (beta 8). */
function kernelFor(sourceRate: number): Kernel {
  const hit = kernels.get(sourceRate);
  if (hit) return hit;
  const ratio = sourceRate / LARK_OUT_RATE;
  const scale = Math.max(1, ratio);
  const cutoff = 0.45 / scale;                               // cycles per source sample
  const half = Math.ceil(ZERO_CROSSINGS * scale);
  const beta = 8, i0b = bessel0(beta);
  const integer = Number.isInteger(ratio);
  const make = (frac: number) => {
    const t = new Float32Array(2 * half + 1);
    let sum = 0;
    for (let j = -half; j <= half; j++) {
      const x = j - frac;
      const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
      const r = x / (half + 1);
      const w = Math.abs(r) >= 1 ? 0 : bessel0(beta * Math.sqrt(1 - r * r)) / i0b;
      t[j + half] = sinc * w; sum += sinc * w;
    }
    for (let j = 0; j < t.length; j++) t[j] /= sum;         // unity gain at DC
    return t;
  };
  const taps = integer ? [make(0)] : Array.from({ length: PHASES }, (_, p) => make(p / PHASES));
  const k = { half, taps, integer, ratio };
  kernels.set(sourceRate, k);
  return k;
}

/** Output frames [o0, o1) at 16 kHz, from the timeline. Reads only the source this span needs. */
export async function resampleSpan(plan: EncodePlan, o0: number, o1: number, read: ReadBytes): Promise<Float32Array> {
  const out = new Float32Array(o1 - o0);
  if (plan.sampleRate === LARK_OUT_RATE) {
    const src = await readTimeline(plan, o0, o1, read);
    out.set(src);
    return out;
  }
  const k = kernelFor(plan.sampleRate);
  const a = Math.floor(o0 * k.ratio) - k.half - 1;
  const b = Math.ceil(o1 * k.ratio) + k.half + 2;
  const src = await readTimeline(plan, Math.max(0, a), b, read);
  const base = Math.max(0, a);
  const at = (i: number) => { const j = i - base; return j >= 0 && j < src.length ? src[j] : 0; };
  for (let i = o0; i < o1; i++) {
    const pos = i * k.ratio;
    const ip = Math.floor(pos);
    const t = k.integer ? k.taps[0] : k.taps[Math.min(PHASES - 1, Math.round((pos - ip) * PHASES)) % PHASES];
    const first = ip - k.half - base;
    let s = 0;
    if (first >= 0 && first + t.length <= src.length) {
      for (let j = 0; j < t.length; j++) s += t[j] * src[first + j];
    } else {
      for (let j = 0; j < t.length; j++) s += t[j] * at(ip - k.half + j);
    }
    out[i - o0] = s;
  }
  return out;
}

/** -1..1 floats to 16-bit, clipped (a 32-bit float transmitter can go over full scale), no dither: deterministic. */
export function toInt16(x: Float32Array): Int16Array {
  const out = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = Math.round(x[i] * 32767);
    out[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
  }
  return out;
}

export interface EncodedLarkChunk { seq: number; bytes: Uint8Array; sha256: string; tStartMs: number; tEndMs: number; peak: number }

export async function encodeLarkChunk(plan: EncodePlan, span: ChunkSpan, read: ReadBytes): Promise<EncodedLarkChunk> {
  const f = await resampleSpan(plan, span.outStart, span.outEnd, read);
  let peak = 0;
  for (let i = 0; i < f.length; i++) { const a = Math.abs(f[i]); if (a > peak) peak = a; }
  const pcm = toInt16(f);
  const bytes = encodeFlac(pcm, LARK_OUT_RATE);
  return { seq: span.seq, bytes, sha256: await sha256Hex(bytes), tStartMs: span.tStartMs, tEndMs: span.tEndMs, peak };
}
