// The lossless candidates behind one interface. (The Opus candidate is a
// different pipeline - MediaRecorder encodes it - see opusPipeline.ts.)

import type { RecorderFormat } from "./types";
import { encodeFlac, encodeWav } from "./flac";
import { FORMAT_EXT, FORMAT_MIME } from "./chunkMath";

export interface EncodedPcm { bytes: Uint8Array; encoding: "fixed" | "verbatim" | "pcm"; mime: string; ext: string; encodeMs: number }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Encode one chunk.
 *
 * C2 review ruling (a): a FLAC chunk of digital silence (a muted or dead
 * input) compresses far below the server's byte floor. It is no longer
 * re-encoded VERBATIM to get over the floor (that uploaded ~96 kB/s of zeros
 * and made silence count as verified audio): it is sent as it is, the server
 * stores it and flags it `below_floor`, and it never counts as evidence.
 * `_minBytesPerSec` is kept so existing callers keep compiling.
 */
export function encodePcmChunk(format: RecorderFormat, samples: Int16Array, sampleRate: number, _minBytesPerSec = 0): EncodedPcm {
  const t = now();
  const mime = FORMAT_MIME[format], ext = FORMAT_EXT[format];
  if (format === "pcm-wav") return { bytes: encodeWav(samples, sampleRate), encoding: "pcm", mime, ext, encodeMs: now() - t };
  if (format !== "flac") throw new Error(`${format} is not a PCM format`);
  return { bytes: encodeFlac(samples, sampleRate), encoding: "fixed", mime, ext, encodeMs: now() - t };
}
