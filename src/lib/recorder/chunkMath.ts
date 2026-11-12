// Frame <-> millisecond arithmetic and the server's per-chunk bounds, written
// down once. Pure: no browser API.
//
// t = 0 is the first frame after the server was asked to start. Chunk k holds
// frames [k*F, (k+1)*F) with F = sampleRate * chunkMs / 1000; only the last
// chunk of a track is short. Positions come from frame counts, never Date.now().

export const FORMAT_EXT: Record<string, string> = { "opus-webm": "webm", flac: "flac", "pcm-wav": "wav" };
export const FORMAT_MIME: Record<string, string> = { "opus-webm": "audio/webm", flac: "audio/flac", "pcm-wav": "audio/wav" };

export function framesPerChunk(sampleRate: number, chunkMs: number): number {
  const f = (sampleRate * chunkMs) / 1000;
  if (!Number.isInteger(f) || f <= 0) throw new Error(`chunk of ${chunkMs} ms is not a whole number of frames at ${sampleRate} Hz`);
  return f;
}

/** ms position of a frame, floored, so consecutive chunks share their boundary exactly. */
export function frameToMs(frame: number, sampleRate: number): number {
  return Math.floor((frame * 1000) / sampleRate);
}

export function msToFrame(ms: number, sampleRate: number): number {
  return Math.floor((ms * sampleRate) / 1000);
}

export interface ChunkSpan { seq: number; startFrame: number; endFrame: number; tStartMs: number; tEndMs: number }

export function chunkSpan(seq: number, frames: number, sampleRate: number, chunkMs: number): ChunkSpan {
  const F = framesPerChunk(sampleRate, chunkMs);
  const startFrame = seq * F;
  const endFrame = startFrame + frames;
  return { seq, startFrame, endFrame, tStartMs: frameToMs(startFrame, sampleRate), tEndMs: frameToMs(endFrame, sampleRate) };
}

/** The bounds `recorder_register_chunk` enforces, checked locally first (same arithmetic). */
export interface ChunkBounds {
  chunkMs: number;
  minBytesPerSec: number;
  clockToleranceMs: number;
  /** ms from started_at to capture_closes_at. */
  windowMs: number;
}

export type LocalVerdict = { ok: true } | { ok: false; refusal: "span_too_long" | "below_byte_floor" | "after_window" | "bad_span" };

export function checkChunkLocally(byteSize: number, tStartMs: number, tEndMs: number, b: ChunkBounds): LocalVerdict {
  if (!(tEndMs > tStartMs) || tStartMs < 0) return { ok: false, refusal: "bad_span" };
  const span = tEndMs - tStartMs;
  if (span > b.chunkMs + b.clockToleranceMs) return { ok: false, refusal: "span_too_long" };
  if (byteSize * 1000 < b.minBytesPerSec * span) return { ok: false, refusal: "below_byte_floor" };
  if (tEndMs > b.windowMs + b.clockToleranceMs) return { ok: false, refusal: "after_window" };
  return { ok: true };
}

/** Smallest byte count a chunk of this span may have. */
export function byteFloor(spanMs: number, minBytesPerSec: number): number {
  return Math.ceil((minBytesPerSec * spanMs) / 1000);
}

/** Bytes/s of 16-bit mono PCM. */
export const pcmBytesPerSec = (sampleRate: number) => sampleRate * 2;

/** Storage path the database will choose (for the local backup folder and for checks). */
export function chunkPath(classId: string, recordingId: string, track: string, seq: number, format: string): string {
  return `${classId}/${recordingId}/${track}/${String(seq).padStart(6, "0")}.${FORMAT_EXT[format]}`;
}
export const manifestPath = (classId: string, recordingId: string) => `${classId}/${recordingId}/manifest.json`;

/** Float [-1, 1] to 16-bit, the same rounding everywhere (so a decode can be compared exactly). */
export function floatToInt16(src: Float32Array, dst: Int16Array, dstOffset = 0): void {
  for (let i = 0; i < src.length; i++) {
    // x * 32768, clamped: the inverse of the usual s16 / 32768 decode, so a
    // decoded chunk times 32768 gives back these exact integers.
    let v = Math.round(src[i] * 32768);
    if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
    dst[dstOffset + i] = v;
  }
}
