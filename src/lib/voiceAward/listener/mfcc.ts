/**
 * Features for the wake word: 13 cepstra (c1..c13, no energy term, so loudness does
 * not matter) plus 13 deltas = 26 numbers a frame, each divided by that coefficient's
 * usual spread in speech (STATIC_STD / DELTA_STD, measured on a few minutes of speech) so
 * every dimension counts about the same in the DTW distance (liftering weighted the
 * noisy high coefficients too much). 25 ms window, 10 ms shift, 16 kHz. `mfccStatic` works one frame at a time so the listener
 * can compute a frame the moment it is complete; `withDeltas` adds the deltas
 * over any stretch of those frames. Pure: imports only ./dsp.
 */
import { fft } from "./dsp";

export const MFCC_FRAME = 400;
export const MFCC_HOP = 160;
export const MFCC_STATIC = 13;
export const MFCC_DIM = 26;
const NFFT = 512, NMEL = 26, LOWHZ = 100, HIGHHZ = 7600, PREEMPH = 0.97;
const STATIC_STD = [7.76, 3.38, 3.27, 2.92, 1.91, 1.75, 1.67, 1.31, 1.31, 1.16, 0.98, 1.01, 0.83];
const DELTA_STD = [1.78, 0.85, 0.7, 0.69, 0.46, 0.44, 0.41, 0.34, 0.32, 0.29, 0.26, 0.26, 0.24];

const hz2mel = (f: number) => 2595 * Math.log10(1 + f / 700);
const mel2hz = (m: number) => 700 * (Math.pow(10, m / 2595) - 1);

let setupDone = false;
let win: Float64Array;
let filt: Float64Array[]; // NMEL x (NFFT/2+1)
let dct: Float64Array[]; // MFCC_STATIC x NMEL
const re = new Float64Array(NFFT), im = new Float64Array(NFFT);

function setup() {
  if (setupDone) return;
  win = new Float64Array(MFCC_FRAME);
  for (let i = 0; i < MFCC_FRAME; i++) win[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (MFCC_FRAME - 1));
  const lowM = hz2mel(LOWHZ), highM = hz2mel(HIGHHZ);
  const pts: number[] = [];
  for (let i = 0; i < NMEL + 2; i++) pts.push(mel2hz(lowM + ((highM - lowM) * i) / (NMEL + 1)));
  filt = [];
  for (let m = 0; m < NMEL; m++) {
    const w = new Float64Array(NFFT / 2 + 1);
    const l = pts[m], c = pts[m + 1], r = pts[m + 2];
    for (let k = 0; k <= NFFT / 2; k++) {
      const f = (k * 16000) / NFFT;
      if (f > l && f <= c) w[k] = (f - l) / (c - l);
      else if (f > c && f < r) w[k] = (r - f) / (r - c);
    }
    filt.push(w);
  }
  dct = [];
  for (let n = 1; n <= MFCC_STATIC; n++) {
    const row = new Float64Array(NMEL);
    for (let k = 0; k < NMEL; k++) row[k] = Math.sqrt(2 / NMEL) * Math.cos((Math.PI * n * (k + 0.5)) / NMEL);
    dct.push(row);
  }
  setupDone = true;
}

const logE = new Float64Array(NMEL);

/** One frame (400 samples, [-1,1]) to 13 scaled cepstra. */
export function mfccStatic(frame: ArrayLike<number>, offset = 0): Float32Array {
  setup();
  re.fill(0); im.fill(0);
  let prev = frame[offset];
  re[0] = (prev - PREEMPH * prev) * win[0];
  for (let i = 1; i < MFCC_FRAME; i++) {
    const v = frame[offset + i];
    re[i] = (v - PREEMPH * prev) * win[i];
    prev = v;
  }
  fft(re, im);
  for (let m = 0; m < NMEL; m++) {
    const w = filt[m];
    let e = 0;
    for (let k = 0; k <= NFFT / 2; k++) if (w[k] !== 0) e += w[k] * (re[k] * re[k] + im[k] * im[k]);
    logE[m] = Math.log(e + 1e-8);
  }
  const out = new Float32Array(MFCC_STATIC);
  for (let n = 0; n < MFCC_STATIC; n++) {
    let s = 0;
    const row = dct[n];
    for (let k = 0; k < NMEL; k++) s += row[k] * logE[k];
    out[n] = s / STATIC_STD[n];
  }
  return out;
}

/** All static frames of a wave (frames beyond the last full 25 ms window are not made). */
export function mfccFrames(wave: Float32Array): Float32Array[] {
  const out: Float32Array[] = [];
  for (let o = 0; o + MFCC_FRAME <= wave.length; o += MFCC_HOP) out.push(mfccStatic(wave, o));
  return out;
}

/** Adds regression deltas (+-2 frames, edges repeated): [c1..c13, d1..d13]. */
export function withDeltas(frames: Float32Array[]): Float32Array[] {
  const n = frames.length;
  const out: Float32Array[] = [];
  const at = (i: number) => frames[Math.min(n - 1, Math.max(0, i))];
  for (let t = 0; t < n; t++) {
    const o = new Float32Array(MFCC_DIM);
    o.set(frames[t], 0);
    for (let c = 0; c < MFCC_STATIC; c++) {
      o[MFCC_STATIC + c] = ((1 * (at(t + 1)[c] - at(t - 1)[c]) + 2 * (at(t + 2)[c] - at(t - 2)[c])) / 10) * (STATIC_STD[c] / DELTA_STD[c]);
    }
    out.push(o);
  }
  return out;
}
