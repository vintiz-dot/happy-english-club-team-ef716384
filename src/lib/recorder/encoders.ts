// The lossless candidates behind one interface. (The Opus candidate is a
// different pipeline - MediaRecorder encodes it - see opusPipeline.ts.)

import type { RecorderFormat } from "./types";
import { encodeFlac, encodeWav } from "./flac";
import { byteFloor, FORMAT_EXT, FORMAT_MIME } from "./chunkMath";

export interface EncodedPcm { bytes: Uint8Array; encoding: "fixed" | "verbatim" | "pcm"; mime: string; ext: string; encodeMs: number }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Encode one chunk. For FLAC, a chunk that would fall below the server's byte
 * floor (digital silence - a muted or dead input - compresses to almost
 * nothing) is re-encoded with VERBATIM subframes: the bytes are then the real
 * samples, uncompressed, so the floor is met honestly rather than padded.
 */
export function encodePcmChunk(format: RecorderFormat, samples: Int16Array, sampleRate: number, minBytesPerSec: number): EncodedPcm {
  const t = now();
  const mime = FORMAT_MIME[format], ext = FORMAT_EXT[format];
  if (format === "pcm-wav") return { bytes: encodeWav(samples, sampleRate), encoding: "pcm", mime, ext, encodeMs: now() - t };
  if (format !== "flac") throw new Error(`${format} is not a PCM format`);
  // +1 ms: the registered span is floor(end) - floor(start), which can be 1 ms more.
  const spanMs = Math.floor((samples.length * 1000) / sampleRate) + 1;
  let bytes = encodeFlac(samples, sampleRate);
  let encoding: "fixed" | "verbatim" = "fixed";
  if (bytes.length < byteFloor(spanMs, minBytesPerSec)) {
    bytes = encodeFlac(samples, sampleRate, { verbatim: true });
    encoding = "verbatim";
  }
  return { bytes, encoding, mime, ext, encodeMs: now() - t };
}
