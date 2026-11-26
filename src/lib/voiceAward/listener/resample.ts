/**
 * Streaming windowed-sinc resampler (Blackman-Harris window, 24 taps each side
 * at the lower rate). The sinc is low-passed at 0.475 x the OUTPUT rate when
 * down-sampling, so nothing above 7.6 kHz folds back into the 16 kHz signal.
 * Pure, no imports.
 */
export const TARGET_RATE = 16000;
const HALF = 24;

function bh(x: number): number {
  // Blackman-Harris over x in [-1, 1]
  if (x <= -1 || x >= 1) return 0;
  const t = (x + 1) * Math.PI;
  return 0.35875 - 0.48829 * Math.cos(t) + 0.14128 * Math.cos(2 * t) - 0.01168 * Math.cos(3 * t);
}

export class Resampler {
  private readonly step: number; // input samples per output sample
  private readonly fc: number; // cutoff relative to the input rate (0..0.5)
  private readonly half: number; // taps each side, in input samples
  private carry = new Float32Array(0);
  private pos = 0; // position of the next output, in carry coordinates

  constructor(readonly fromRate: number, readonly toRate: number = TARGET_RATE) {
    this.step = fromRate / toRate;
    const lowest = Math.min(fromRate, toRate);
    this.fc = (0.475 * lowest) / fromRate;
    this.half = this.step > 1 ? Math.ceil(HALF * this.step) : HALF;
  }

  process(chunk: Float32Array): Float32Array {
    if (this.fromRate === this.toRate) return chunk;
    const buf = new Float32Array(this.carry.length + chunk.length);
    buf.set(this.carry, 0);
    buf.set(chunk, this.carry.length);
    const out: number[] = [];
    const { half, fc, step } = this;
    const n = buf.length;
    let pos = this.pos;
    while (pos + half < n) {
      const c = Math.floor(pos);
      let acc = 0;
      for (let i = c - half + 1; i <= c + half; i++) {
        if (i < 0) continue;
        const d = i - pos;
        const arg = 2 * Math.PI * fc * d;
        const s = d === 0 ? 1 : Math.sin(arg) / arg;
        acc += buf[i] * s * bh(d / half);
      }
      out.push(acc * 2 * fc);
      pos += step;
    }
    const keepFrom = Math.max(0, Math.floor(pos) - half);
    this.carry = buf.slice(keepFrom);
    this.pos = pos - keepFrom;
    return Float32Array.from(out);
  }
}

/** One-shot helper. */
export function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_RATE) return input;
  return new Resampler(fromRate, TARGET_RATE).process(input);
}
