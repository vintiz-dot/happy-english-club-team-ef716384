// A small FLAC encoder: 16-bit mono, fixed blocking, CONSTANT / VERBATIM /
// FIXED (orders 0-4) subframes with partitioned Rice residuals. No LPC, so it
// compresses a little less than `flac -5`, and it needs no dependency. Every
// chunk is a complete, standalone .flac file (STREAMINFO + frames), so any
// chunk decodes on its own and consecutive chunks join sample-exactly.
//
// Format reference: https://xiph.org/flac/format.html (RFC 9639).
// STREAMINFO's MD5 is written as zeros, which the format defines as "unknown".
//
// `verbatim: true` writes every subframe uncompressed. The engine uses it for a
// chunk that would otherwise fall below the server's byte floor (digital
// silence compresses to almost nothing): the bytes are then the real samples,
// not padding.

const BLOCK = 4096;

class BitWriter {
  buf: Uint8Array;
  pos = 0;          // bytes written
  acc = 0;          // pending bits (msb first)
  nacc = 0;
  constructor(size: number) { this.buf = new Uint8Array(size); }
  private grow(extra: number) {
    if (this.pos + extra <= this.buf.length) return;
    const next = new Uint8Array(Math.max(this.buf.length * 2, this.pos + extra + 1024));
    next.set(this.buf.subarray(0, this.pos));
    this.buf = next;
  }
  /** Write the low `n` bits of `v` (n <= 24). */
  bits(v: number, n: number) {
    if (n === 0) return;
    this.acc = (this.acc << n) | (v & ((1 << n) - 1));
    this.nacc += n;
    if (this.nacc >= 8) {
      this.grow(4);
      while (this.nacc >= 8) {
        this.nacc -= 8;
        this.buf[this.pos++] = (this.acc >>> this.nacc) & 0xff;
      }
      this.acc &= (1 << this.nacc) - 1;
    }
  }
  /** Up to 32 bits. */
  bits32(v: number, n: number) {
    if (n > 24) { this.bits(Math.floor(v / 0x1000000) & ((1 << (n - 24)) - 1), n - 24); this.bits(v & 0xffffff, 24); }
    else this.bits(v, n);
  }
  zeros(n: number) { while (n > 16) { this.bits(0, 16); n -= 16; } this.bits(0, n); }
  align() { if (this.nacc > 0) this.bits(0, 8 - this.nacc); }
  bytes(): Uint8Array { return this.buf.subarray(0, this.pos); }
}

const CRC8 = new Uint8Array(256);
const CRC16 = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff;
  CRC8[i] = c;
  let d = i << 8;
  for (let j = 0; j < 8; j++) d = d & 0x8000 ? ((d << 1) ^ 0x8005) & 0xffff : (d << 1) & 0xffff;
  CRC16[i] = d;
}
export function crc8(b: Uint8Array, from: number, to: number): number { let c = 0; for (let i = from; i < to; i++) c = CRC8[c ^ b[i]]; return c; }
export function crc16(b: Uint8Array, from: number, to: number): number { let c = 0; for (let i = from; i < to; i++) c = ((c << 8) & 0xffff) ^ CRC16[(c >> 8) ^ b[i]]; return c; }

function sampleRateCode(sr: number): { code: number; extraBits: number; extra: number } {
  const map: Record<number, number> = { 88200: 1, 176400: 2, 192000: 3, 8000: 4, 16000: 5, 22050: 6, 24000: 7, 32000: 8, 44100: 9, 48000: 10, 96000: 11 };
  if (map[sr]) return { code: map[sr], extraBits: 0, extra: 0 };
  if (sr < 65536) return { code: 13, extraBits: 16, extra: sr };
  return { code: 0, extraBits: 0, extra: 0 };
}

function writeUtf8Number(w: BitWriter, n: number) {
  if (n < 0x80) { w.bits(n, 8); return; }
  if (n < 0x800) { w.bits(0xc0 | (n >> 6), 8); w.bits(0x80 | (n & 0x3f), 8); return; }
  if (n < 0x10000) { w.bits(0xe0 | (n >> 12), 8); w.bits(0x80 | ((n >> 6) & 0x3f), 8); w.bits(0x80 | (n & 0x3f), 8); return; }
  if (n < 0x200000) { w.bits(0xf0 | (n >> 18), 8); w.bits(0x80 | ((n >> 12) & 0x3f), 8); w.bits(0x80 | ((n >> 6) & 0x3f), 8); w.bits(0x80 | (n & 0x3f), 8); return; }
  throw new Error("frame number too large");
}

/** Residuals of the fixed predictor of `order` for x[start..end). */
function fixedResidual(x: Int16Array, start: number, end: number, order: number, out: Int32Array): void {
  let k = 0;
  for (let i = start + order; i < end; i++) {
    let r: number;
    switch (order) {
      case 0: r = x[i]; break;
      case 1: r = x[i] - x[i - 1]; break;
      case 2: r = x[i] - 2 * x[i - 1] + x[i - 2]; break;
      case 3: r = x[i] - 3 * x[i - 1] + 3 * x[i - 2] - x[i - 3]; break;
      default: r = x[i] - 4 * x[i - 1] + 6 * x[i - 2] - 4 * x[i - 3] + x[i - 4];
    }
    out[k++] = r;
  }
}

const zig = (r: number) => (r >= 0 ? r * 2 : -r * 2 - 1);

interface RicePlan { porder: number; params: number[]; bits: number }

/** Choose the partition order and Rice parameters with the fewest bits. */
function planRice(res: Int32Array, n: number, blockSize: number, order: number): RicePlan {
  let best: RicePlan | null = null;
  for (let p = 0; p <= 6; p++) {
    const parts = 1 << p;
    if (blockSize % parts !== 0) break;
    const psize = blockSize / parts;
    if (psize <= order) break;
    const params: number[] = [];
    let bits = 0;
    let idx = 0;
    for (let q = 0; q < parts; q++) {
      const count = q === 0 ? psize - order : psize;
      let sum = 0;
      for (let i = 0; i < count; i++) sum += zig(res[idx + i]);
      const mean = count ? sum / count : 0;
      let k = mean > 0 ? Math.max(0, Math.floor(Math.log2(mean))) : 0;
      if (k > 14) k = 14;
      // Exact cost for k and its neighbours.
      let bestK = k, bestCost = Infinity;
      for (const kk of [k - 1, k, k + 1]) {
        if (kk < 0 || kk > 14) continue;
        let c = count * (kk + 1);
        for (let i = 0; i < count; i++) c += zig(res[idx + i]) >>> kk;
        if (c < bestCost) { bestCost = c; bestK = kk; }
      }
      params.push(bestK);
      bits += 4 + bestCost;
      idx += count;
    }
    bits += 2 + 4;
    if (!best || bits < best.bits) best = { porder: p, params, bits };
  }
  return best!;
}

function writeRice(w: BitWriter, res: Int32Array, blockSize: number, order: number, plan: RicePlan) {
  w.bits(0, 2);           // Rice, 4-bit parameters
  w.bits(plan.porder, 4);
  const parts = 1 << plan.porder;
  const psize = blockSize / parts;
  let idx = 0;
  for (let q = 0; q < parts; q++) {
    const count = q === 0 ? psize - order : psize;
    const k = plan.params[q];
    w.bits(k, 4);
    for (let i = 0; i < count; i++) {
      const u = zig(res[idx + i]);
      const hi = u >>> k;
      w.zeros(hi);
      w.bits(1, 1);
      if (k) w.bits(u & ((1 << k) - 1), k);
    }
    idx += count;
  }
}

export interface FlacOptions { verbatim?: boolean }

/** Encode 16-bit mono samples as one complete FLAC file. */
export function encodeFlac(samples: Int16Array, sampleRate: number, opts: FlacOptions = {}): Uint8Array {
  const n = samples.length;
  const w = new BitWriter(Math.max(1024, n * 2 + 1024));
  // "fLaC" + STREAMINFO (last metadata block).
  w.bits(0x66, 8); w.bits(0x4c, 8); w.bits(0x61, 8); w.bits(0x43, 8);
  w.bits(1, 1); w.bits(0, 7); w.bits(34, 24);
  const minBlock = n <= BLOCK ? Math.max(16, n) : BLOCK;
  w.bits(Math.min(minBlock, BLOCK), 16); w.bits(Math.max(16, Math.min(BLOCK, Math.max(n, 16))), 16);
  w.bits(0, 24); w.bits(0, 24);       // frame sizes unknown
  w.bits(sampleRate, 20);
  w.bits(0, 3);                        // 1 channel
  w.bits(15, 5);                       // 16 bits per sample
  w.bits32(Math.floor(n / 0x100000000), 4); w.bits32(n >>> 0, 32);
  for (let i = 0; i < 16; i++) w.bits(0, 8);   // MD5 unknown

  const res = new Int32Array(BLOCK);
  const sr = sampleRateCode(sampleRate);
  let frame = 0;
  for (let start = 0; start < n; start += BLOCK, frame++) {
    const end = Math.min(n, start + BLOCK);
    const bs = end - start;
    const frameStart = w.pos;
    // Header.
    w.bits(0x3ffe, 14); w.bits(0, 1); w.bits(0, 1);
    const bsCode = bs === 4096 ? 12 : bs <= 256 ? 6 : 7;
    w.bits(bsCode, 4);
    w.bits(sr.code, 4);
    w.bits(0, 4);           // mono
    w.bits(4, 3);           // 16 bps
    w.bits(0, 1);
    writeUtf8Number(w, frame);
    if (bsCode === 6) w.bits(bs - 1, 8); else if (bsCode === 7) w.bits(bs - 1, 16);
    if (sr.extraBits) w.bits(sr.extra, sr.extraBits);
    w.bits(crc8(w.buf, frameStart, w.pos), 8);

    // Subframe.
    let constant = true;
    for (let i = start + 1; i < end; i++) if (samples[i] !== samples[start]) { constant = false; break; }
    if (opts.verbatim) {
      w.bits(0, 1); w.bits(1, 6); w.bits(0, 1);
      for (let i = start; i < end; i++) w.bits(samples[i] & 0xffff, 16);
    } else if (constant) {
      w.bits(0, 1); w.bits(0, 6); w.bits(0, 1);
      w.bits(samples[start] & 0xffff, 16);
    } else {
      // Pick the fixed order with the smallest residual magnitude.
      let bestOrder = 0, bestSum = Infinity;
      for (let order = 0; order <= 4 && order < bs; order++) {
        fixedResidual(samples, start, end, order, res);
        let s = 0;
        for (let i = 0; i < bs - order; i++) s += Math.abs(res[i]);
        if (s < bestSum) { bestSum = s; bestOrder = order; }
      }
      fixedResidual(samples, start, end, bestOrder, res);
      const plan = planRice(res, bs - bestOrder, bs, bestOrder);
      const fixedBits = 8 + bestOrder * 16 + plan.bits;
      if (fixedBits >= 8 + bs * 16) {
        w.bits(0, 1); w.bits(1, 6); w.bits(0, 1);
        for (let i = start; i < end; i++) w.bits(samples[i] & 0xffff, 16);
      } else {
        w.bits(0, 1); w.bits(8 | bestOrder, 6); w.bits(0, 1);
        for (let i = 0; i < bestOrder; i++) w.bits(samples[start + i] & 0xffff, 16);
        writeRice(w, res, bs, bestOrder, plan);
      }
    }
    w.align();
    const c = crc16(w.buf, frameStart, w.pos);
    w.bits(c, 16);
  }
  return w.bytes().slice();
}

/** 44-byte RIFF header + 16-bit mono PCM. */
export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const data = samples.length * 2;
  const out = new Uint8Array(44 + data);
  const v = new DataView(out.buffer);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) out[o + i] = t.charCodeAt(i); };
  s(0, "RIFF"); v.setUint32(4, 36 + data, true); s(8, "WAVE");
  s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, "data"); v.setUint32(40, data, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, samples[i], true);
  return out;
}
