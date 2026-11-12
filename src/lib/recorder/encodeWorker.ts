// The encoder Worker (C2 review M6): FLAC/WAV encoding and the SHA-256 of
// the result, off the main thread. Pure: it holds no audio after answering.
// Loaded by createRecorder with
//   new Worker(new URL("./encodeWorker.ts", import.meta.url), { type: "module" })
// which Vite bundles together with its imports.

import { encodePcmChunk } from "./encoders";
import { sha256Hex } from "./hash";

const scope = self as any;

scope.onmessage = async (e: MessageEvent) => {
  const { id, format, samples, sampleRate } = (e.data || {}) as { id: number; format: any; samples: Int16Array; sampleRate: number };
  try {
    const enc = encodePcmChunk(format, samples, sampleRate);
    const sha256 = await sha256Hex(enc.bytes);
    const buf = enc.bytes.buffer.byteLength === enc.bytes.byteLength ? enc.bytes.buffer : enc.bytes.slice().buffer;
    scope.postMessage({ id, ok: true, bytes: buf, encoding: enc.encoding, mime: enc.mime, ext: enc.ext, encodeMs: enc.encodeMs, sha256 }, [buf]);
  } catch (err) {
    scope.postMessage({ id, ok: false, message: String((err as any)?.message ?? err) });
  }
};
