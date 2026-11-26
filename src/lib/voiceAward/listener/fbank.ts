/**
 * Kaldi-compatible 80-dim log-mel filterbank, as the WeSpeaker recipe computes it
 * (torchaudio.compliance.kaldi.fbank): 16 kHz, 25 ms povey window, 10 ms shift,
 * DC removed, pre-emphasis 0.97, no dither, samples x 32768, power spectrum on a
 * 512-point FFT, mel bins between 20 Hz and Nyquist, natural log, snip edges.
 * Pure: imports only ./dsp.
 */
import { fft } from "./dsp";

export const FBANK_DIM = 80;
const FRAME = 400, SHIFT = 160, NFFT = 512, PREEMPH = 0.97, LOW = 20, HIGH = 8000, EPS = 1.1920929e-7;

const mel = (f: number) => 1127 * Math.log(1 + f / 700);

let bank: { start: Int32Array; weights: Float64Array[] } | null = null;
let win: Float64Array | null = null;

function setup() {
  if (bank && win) return;
  win = new Float64Array(FRAME);
  for (let i = 0; i < FRAME; i++) win[i] = Math.pow(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1)), 0.85);
  const lowM = mel(LOW), highM = mel(HIGH);
  const delta = (highM - lowM) / (FBANK_DIM + 1);
  const binW = 16000 / NFFT;
  const start = new Int32Array(FBANK_DIM);
  const weights: Float64Array[] = [];
  for (let b = 0; b < FBANK_DIM; b++) {
    const left = lowM + b * delta, centre = lowM + (b + 1) * delta, right = lowM + (b + 2) * delta;
    let first = -1;
    const w: number[] = [];
    for (let k = 0; k < NFFT / 2; k++) {
      const m = mel(binW * k);
      let v = 0;
      if (m > left && m < centre) v = (m - left) / (centre - left);
      else if (m > centre && m < right) v = (right - m) / (right - centre);
      if (v > 0 && first < 0) first = k;
      if (first >= 0) w.push(v);
    }
    start[b] = Math.max(first, 0);
    weights.push(Float64Array.from(w));
  }
  bank = { start, weights };
}

export function fbankFrameCount(samples: number): number {
  return samples < FRAME ? 0 : 1 + Math.floor((samples - FRAME) / SHIFT);
}

/** wave: 16 kHz mono in [-1, 1]. Returns frames x 80 log-mel energies (row-major). */
export function fbank(wave: Float32Array): { data: Float32Array; frames: number } {
  setup();
  const frames = fbankFrameCount(wave.length);
  const data = new Float32Array(frames * FBANK_DIM);
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  const x = new Float64Array(FRAME);
  const { start, weights } = bank!;
  for (let f = 0; f < frames; f++) {
    const o = f * SHIFT;
    let mean = 0;
    for (let i = 0; i < FRAME; i++) { x[i] = wave[o + i] * 32768; mean += x[i]; }
    mean /= FRAME;
    for (let i = 0; i < FRAME; i++) x[i] -= mean;
    for (let i = FRAME - 1; i > 0; i--) x[i] -= PREEMPH * x[i - 1];
    x[0] -= PREEMPH * x[0];
    re.fill(0); im.fill(0);
    for (let i = 0; i < FRAME; i++) re[i] = x[i] * win![i];
    fft(re, im);
    for (let b = 0; b < FBANK_DIM; b++) {
      const w = weights[b], s = start[b];
      let e = 0;
      for (let k = 0; k < w.length; k++) { const j = s + k; e += w[k] * (re[j] * re[j] + im[j] * im[j]); }
      data[f * FBANK_DIM + b] = Math.log(Math.max(e, EPS));
    }
  }
  return { data, frames };
}

/** Per-utterance mean normalisation over time, in place. */
export function meanNormalise(data: Float32Array, frames: number, dim = FBANK_DIM): void {
  if (!frames) return;
  for (let d = 0; d < dim; d++) {
    let m = 0;
    for (let f = 0; f < frames; f++) m += data[f * dim + d];
    m /= frames;
    for (let f = 0; f < frames; f++) data[f * dim + d] -= m;
  }
}
