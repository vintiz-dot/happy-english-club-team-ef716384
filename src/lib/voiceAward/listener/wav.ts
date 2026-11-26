/** 16-bit PCM WAV encoding for the voice-award request. Pure, no imports. */

export function floatToWav(samples: Float32Array, sampleRate = 16000): Uint8Array {
  const n = samples.length;
  const out = new Uint8Array(44 + n * 2);
  const dv = new DataView(out.buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE");
  w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    dv.setInt16(44 + i * 2, s < 0 ? Math.round(s * 32768) : Math.round(s * 32767), true);
  }
  return out;
}

/** Reads a 16-bit PCM WAV (mono or stereo, averaged), as written above or by Windows speech. */
export function wavToFloat(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("not a WAV file");
  let o = 12, rate = 16000, channels = 1, bits = 16, data = -1, len = 0;
  while (o + 8 <= bytes.byteLength) {
    const id = tag(o), size = dv.getUint32(o + 4, true);
    if (id === "fmt ") { channels = dv.getUint16(o + 10, true); rate = dv.getUint32(o + 12, true); bits = dv.getUint16(o + 22, true); }
    if (id === "data") { data = o + 8; len = Math.min(size, bytes.byteLength - data); break; }
    o += 8 + size + (size & 1);
  }
  if (data < 0 || bits !== 16) throw new Error("only 16-bit PCM WAV is supported");
  const frames = Math.floor(len / (2 * channels));
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += dv.getInt16(data + (i * channels + c) * 2, true);
    samples[i] = s / channels / 32768;
  }
  return { samples, sampleRate: rate };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH) as unknown as number[]);
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i);
  return o;
}

export function floatToWavBase64(samples: Float32Array, sampleRate = 16000): string {
  return bytesToBase64(floatToWav(samples, sampleRate));
}
