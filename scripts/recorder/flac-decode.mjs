// A minimal FLAC decoder for the tests: 16-bit mono, CONSTANT / VERBATIM /
// FIXED / LPC subframes, Rice (4- and 5-bit) residuals, CRC-8 and CRC-16
// checked. Independent of the encoder's code, so a round trip proves the
// files are valid FLAC rather than "whatever our encoder writes".

class BitReader {
  constructor(b) { this.b = b; this.pos = 0; this.bit = 0; }
  read(n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const byte = this.b[this.pos];
      if (byte === undefined) throw new Error("FLAC: read past the end");
      v = v * 2 + ((byte >> (7 - this.bit)) & 1);
      if (++this.bit === 8) { this.bit = 0; this.pos++; }
    }
    return v;
  }
  signed(n) { const v = this.read(n); return v >= 2 ** (n - 1) ? v - 2 ** n : v; }
  unary() { let q = 0; while (this.read(1) === 0) q++; return q; }
  align() { if (this.bit) { this.bit = 0; this.pos++; } }
}

function crc(b, from, to, poly, width) {
  let c = 0; const top = 1 << (width - 1), mask = (1 << width) - 1;
  for (let i = from; i < to; i++) { c ^= b[i] << (width - 8); for (let j = 0; j < 8; j++) c = c & top ? ((c << 1) ^ poly) & mask : (c << 1) & mask; }
  return c;
}

export function decodeFlac(bytes) {
  const r = new BitReader(bytes);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== "fLaC") throw new Error("FLAC: no fLaC marker");
  r.pos = 4;
  let info = null;
  for (;;) {
    const last = r.read(1), type = r.read(7), len = r.read(24);
    const start = r.pos;
    if (type === 0) {
      r.read(16); r.read(16); r.read(24); r.read(24);
      const sampleRate = r.read(20), channels = r.read(3) + 1, bps = r.read(5) + 1, total = r.read(36);
      info = { sampleRate, channels, bps, total };
    }
    r.pos = start + len; r.bit = 0;
    if (last) break;
  }
  if (!info || info.channels !== 1 || info.bps !== 16) throw new Error("FLAC: only 16-bit mono here");
  const out = new Int16Array(info.total);
  let o = 0, frameNo = 0;
  while (r.pos < bytes.length) {
    const fs = r.pos;
    if (r.read(14) !== 0x3ffe) throw new Error(`FLAC: bad sync at ${fs}`);
    r.read(1); r.read(1);
    const bsc = r.read(4), src = r.read(4); r.read(4); r.read(3); r.read(1);
    // UTF-8 frame number
    let first = r.read(8), num, extra = 0;
    if (first < 0x80) num = first; else { let m = 0x40; extra = 0; while (first & m) { extra++; m >>= 1; } num = first & (m - 1); for (let i = 0; i < extra; i++) num = num * 64 + (r.read(8) & 0x3f); }
    if (num !== frameNo) throw new Error(`FLAC: frame ${num}, expected ${frameNo}`);
    let bs;
    if (bsc === 1) bs = 192; else if (bsc >= 2 && bsc <= 5) bs = 576 << (bsc - 2); else if (bsc === 6) bs = r.read(8) + 1; else if (bsc === 7) bs = r.read(16) + 1; else bs = 256 << (bsc - 8);
    if (src === 12) r.read(8); else if (src === 13 || src === 14) r.read(16);
    const hc = r.read(8);
    if (crc(bytes, fs, r.pos - 1, 0x07, 8) !== hc) throw new Error(`FLAC: header CRC of frame ${frameNo}`);
    r.read(1);
    const t = r.read(6);
    if (r.read(1)) throw new Error("FLAC: wasted bits not handled");
    const x = new Int32Array(bs);
    if (t === 0) { const v = r.signed(16); x.fill(v); }
    else if (t === 1) { for (let i = 0; i < bs; i++) x[i] = r.signed(16); }
    else if ((t & 0x38) === 0x08 || (t & 0x20)) {
      const fixed = (t & 0x20) === 0;
      const order = fixed ? t & 7 : (t & 0x1f) + 1;
      for (let i = 0; i < order; i++) x[i] = r.signed(16);
      let coefs = null, shift = 0;
      if (!fixed) { const prec = r.read(4) + 1; shift = r.signed(5); coefs = []; for (let i = 0; i < order; i++) coefs.push(r.signed(prec)); }
      const method = r.read(2), pbits = method === 0 ? 4 : 5, esc = method === 0 ? 15 : 31;
      const porder = r.read(4), parts = 1 << porder;
      let i = order;
      const res = new Int32Array(bs);
      for (let p = 0; p < parts; p++) {
        const count = (bs >> porder) - (p === 0 ? order : 0);
        const k = r.read(pbits);
        if (k === esc) { const nb = r.read(5); for (let j = 0; j < count; j++) res[i++] = nb ? r.signed(nb) : 0; }
        else for (let j = 0; j < count; j++) { const q = r.unary(); const u = q * 2 ** k + (k ? r.read(k) : 0); res[i++] = u & 1 ? -((u + 1) / 2) : u / 2; }
      }
      for (let n = order; n < bs; n++) {
        let pred;
        if (fixed) {
          pred = order === 0 ? 0 : order === 1 ? x[n - 1] : order === 2 ? 2 * x[n - 1] - x[n - 2] : order === 3 ? 3 * x[n - 1] - 3 * x[n - 2] + x[n - 3] : 4 * x[n - 1] - 6 * x[n - 2] + 4 * x[n - 3] - x[n - 4];
        } else { let s = 0; for (let j = 0; j < order; j++) s += coefs[j] * x[n - 1 - j]; pred = Math.floor(s / 2 ** shift); }
        x[n] = pred + res[n];
      }
    } else throw new Error(`FLAC: subframe type ${t}`);
    r.align();
    const fc = r.read(16);
    if (crc(bytes, fs, r.pos - 2, 0x8005, 16) !== fc) throw new Error(`FLAC: frame CRC of frame ${frameNo}`);
    for (let i = 0; i < bs; i++) out[o++] = x[i];
    frameNo++;
  }
  if (o !== info.total) throw new Error(`FLAC: ${o} samples decoded, STREAMINFO says ${info.total}`);
  return { sampleRate: info.sampleRate, samples: out };
}
