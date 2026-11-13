// Where FLAC/WAV chunks are encoded and hashed (C2 review M6).
//
// The encoder is pure and costs ~0.3-1.8 s of CPU per 30 s chunk, two chunks
// at a time; on the main thread that froze the page and made a delayed
// heartbeat look like a context stall. In the browser it runs in a dedicated
// Worker (encodeWorker.ts); the inline encoder is the fallback (and what the
// Node tests use).
//
// Order is kept: jobs are answered in the order they were posted, and the
// controller stores them through one serial queue. The samples are COPIED to
// the worker (not transferred), so if the worker dies a job can still be
// encoded here: nothing is lost with it.

import type { RecorderFormat } from "./types";
import { encodePcmChunk, type EncodedPcm } from "./encoders";
import { sha256Hex } from "./hash";

export interface EncodedChunk extends EncodedPcm { sha256: string }

export interface ChunkEncoder {
  readonly kind: "worker" | "inline";
  encode(format: RecorderFormat, samples: Int16Array, sampleRate: number): Promise<EncodedChunk>;
  close(): void;
}

/** Main-thread encoder (tests; and the fallback when no Worker can run). */
export function inlineEncoder(): ChunkEncoder {
  return {
    kind: "inline",
    async encode(format, samples, sampleRate) {
      const enc = encodePcmChunk(format, samples, sampleRate);
      return { ...enc, sha256: await sha256Hex(enc.bytes) };
    },
    close() { /* nothing */ },
  };
}

/** The slice of Worker this uses (so a test can pass a fake). */
export interface WorkerLike {
  postMessage(m: unknown): void;
  terminate(): void;
  onmessage: ((e: { data: any }) => void) | null;
  onerror: ((e: any) => void) | null;
}

/**
 * Encoder in a Worker. `make` creates it (in the app:
 * `new Worker(new URL("./encodeWorker.ts", import.meta.url), { type: "module" })`).
 * If the worker cannot be made or fails, every pending and later job is
 * encoded inline instead, and `onFallback` says so once.
 */
export function workerEncoder(make: () => WorkerLike, onFallback?: (why: string) => void, opts: { jobTimeoutMs?: number } = {}): ChunkEncoder {
  const inline = inlineEncoder();
  // N-M6: a worker that neither answers nor raises an error must not hold the
  // chunk queue (and the crash segments behind it, and the Stop) for ever.
  const jobTimeoutMs = opts.jobTimeoutMs ?? 20000;
  let w: WorkerLike | null = null;
  let dead = false;
  let next = 1;
  const pending = new Map<number, { format: RecorderFormat; samples: Int16Array; sampleRate: number; ok: (e: EncodedChunk) => void; no: (e: unknown) => void; timer: any }>();
  const fallBack = (why: string) => {
    if (dead) return;
    dead = true;
    try { w?.terminate(); } catch { /* */ }
    w = null;
    onFallback?.(why);
    // Re-run what the worker had not answered, in order, here.
    const jobs = [...pending.entries()].sort((a, b) => a[0] - b[0]);
    pending.clear();
    for (const [, j] of jobs) { clearTimeout(j.timer); inline.encode(j.format, j.samples, j.sampleRate).then(j.ok, j.no); }
  };
  try {
    w = make();
    (w as any).onmessageerror = () => fallBack("the encoder worker could not read a message");
    w.onmessage = (e) => {
      const d = e.data || {};
      const j = pending.get(d.id);
      if (!j) return;
      pending.delete(d.id);
      clearTimeout(j.timer);
      if (d.ok) j.ok({ bytes: new Uint8Array(d.bytes), encoding: d.encoding, mime: d.mime, ext: d.ext, encodeMs: d.encodeMs, sha256: d.sha256 });
      else {
        // The encoder threw for this job in the worker: try it here (a real
        // encoder bug would throw here too, and the caller reports it).
        inline.encode(j.format, j.samples, j.sampleRate).then(j.ok, j.no);
      }
    };
    w.onerror = (e) => fallBack(`the encoder worker failed: ${String(e?.message ?? e)}`);
  } catch (e) {
    fallBack(`no encoder worker: ${String((e as any)?.message ?? e)}`);
  }
  return {
    get kind() { return dead ? "inline" : "worker"; },
    encode(format, samples, sampleRate) {
      if (dead || !w) return inline.encode(format, samples, sampleRate);
      return new Promise<EncodedChunk>((ok, no) => {
        const id = next++;
        const timer = setTimeout(() => fallBack(`the encoder worker did not answer in ${Math.round(jobTimeoutMs / 1000)} s`), jobTimeoutMs);
        pending.set(id, { format, samples, sampleRate, ok, no, timer });
        try { w!.postMessage({ id, format, samples, sampleRate }); }
        catch (e) { fallBack(`could not post to the encoder worker: ${String((e as any)?.message ?? e)}`); }
      });
    },
    close() { try { w?.terminate(); } catch { /* */ } w = null; dead = true; },
  } as ChunkEncoder;
}
