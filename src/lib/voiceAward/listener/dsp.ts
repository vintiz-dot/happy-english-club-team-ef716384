/** Small DSP helpers shared by the listener: an FFT and the frame energy. Pure, no imports. */

const fftTables = new Map<number, { cos: Float64Array; sin: Float64Array; rev: Uint32Array }>();

function tablesFor(n: number) {
  let t = fftTables.get(n);
  if (t) return t;
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = -Math.sin((2 * Math.PI * i) / n);
  }
  const rev = new Uint32Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    rev[i] = r;
  }
  t = { cos, sin, rev };
  fftTables.set(n, t);
  return t;
}

/** In-place radix-2 complex FFT. n must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  const { cos, sin, rev } = tablesFor(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      const tr = re[i], ti = im[i];
      re[i] = re[j]; im[i] = im[j];
      re[j] = tr; im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0, ti = 0; k < half; k++, ti += step) {
        const a = start + k, b = a + half;
        const wr = cos[ti], wi = sin[ti];
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

/** Frame energy in dB (full scale = 0 dB for a +-1 square wave). */
export function energyDb(x: ArrayLike<number>, start = 0, end = x.length): number {
  let s = 0;
  for (let i = start; i < end; i++) s += x[i] * x[i];
  return 10 * Math.log10(s / Math.max(1, end - start) + 1e-10);
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return d / (Math.sqrt(na * nb) || 1);
}

export function l2normalise(v: ArrayLike<number>): Float32Array {
  const o = new Float32Array(v.length);
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) o[i] = v[i] / n;
  return o;
}
