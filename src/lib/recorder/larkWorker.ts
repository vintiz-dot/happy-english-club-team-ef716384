// The Lark import's Worker: makes one FLAC chunk off the main thread, reading the transmitter's files with
// File.slice so a 2-hour 32-bit float file is never held whole. Loaded by LarkImport.tsx with
//   new Worker(new URL("@/lib/recorder/larkWorker.ts", import.meta.url), { type: "module" })
// It holds nothing after answering.

import { encodeLarkChunk, type EncodePlan } from "./larkEncode";
import type { ChunkSpan } from "./larkImport";

const scope = self as any;

scope.onmessage = async (e: MessageEvent) => {
  const { id, plan, span, files } = (e.data || {}) as { id: number; plan: EncodePlan; span: ChunkSpan; files: Record<string, Blob> };
  try {
    const read = async (key: string, start: number, end: number) => {
      const f = files[key];
      if (!f) throw new Error(`file ${key} is missing`);
      return new Uint8Array(await f.slice(start, end).arrayBuffer());
    };
    const c = await encodeLarkChunk(plan, span, read);
    const buf = c.bytes.buffer.byteLength === c.bytes.byteLength ? c.bytes.buffer : c.bytes.slice().buffer;
    scope.postMessage({ id, ok: true, seq: c.seq, bytes: buf, sha256: c.sha256, tStartMs: c.tStartMs, tEndMs: c.tEndMs, peak: c.peak }, [buf]);
  } catch (err) {
    scope.postMessage({ id, ok: false, message: String((err as any)?.message ?? err) });
  }
};
