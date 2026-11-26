/**
 * Main-thread side of the speaker model: downloads the ONNX file once (kept in
 * Cache Storage, cache "hec-voiceprint-v1"), starts the worker, and hands out an
 * Embedder. One worker is shared by enrolment and listening in the same page.
 */
import { VOICEPRINT_MODEL_URL } from "../listenerApi";
import type { Embedder } from "./embedding";

export const MODEL_CACHE = "hec-voiceprint-v1";
const MIN_MODEL_BYTES = 20_000_000; // the real file is 26.5 MB; anything smaller is a broken download

export async function loadModelBytes(onProgress?: (fraction: number) => void, url = VOICEPRINT_MODEL_URL): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try { cache = typeof caches !== "undefined" ? await caches.open(MODEL_CACHE) : null; } catch { cache = null; }
  if (cache) {
    try {
      const hit = await cache.match(url);
      if (hit) {
        const buf = await hit.arrayBuffer();
        if (buf.byteLength >= MIN_MODEL_BYTES) { onProgress?.(1); return buf; }
        await cache.delete(url);
      }
    } catch { /* fall through to the network */ }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`The voice model could not be downloaded (${res.status}). Check the internet connection and try again.`);
  const total = Number(res.headers.get("content-length")) || 26_530_309;
  let buf: ArrayBuffer;
  if (res.body) {
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      got += value.length;
      onProgress?.(Math.min(0.99, got / total));
    }
    const all = new Uint8Array(got);
    let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    buf = all.buffer;
  } else {
    buf = await res.arrayBuffer();
  }
  if (buf.byteLength < MIN_MODEL_BYTES) throw new Error("The voice model download was cut short. Please try again.");
  if (cache) {
    try { await cache.put(url, new Response(buf.slice(0), { headers: { "content-type": "application/octet-stream" } })); } catch { /* quota: it will download again next time */ }
  }
  onProgress?.(1);
  return buf;
}

export interface EmbedService extends Embedder {
  dispose(): void;
}

let shared: Promise<EmbedService> | null = null;

/** Starts (once) the worker and the model. `onProgress` gets 0..1 while the model downloads. */
export function getEmbedService(onProgress?: (fraction: number) => void): Promise<EmbedService> {
  if (!shared) {
    shared = createService(onProgress).catch((e) => { shared = null; throw e; });
  }
  return shared;
}

async function createService(onProgress?: (fraction: number) => void): Promise<EmbedService> {
  const model = await loadModelBytes(onProgress);
  const worker = new Worker(new URL("./embedWorker.ts", import.meta.url), { type: "module" });
  const waiting = new Map<number, { resolve(v: Float32Array): void; reject(e: Error): void }>();
  let nextId = 1;
  await new Promise<void>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; id?: number; message?: string; embedding?: Float32Array };
      if (m.type === "ready") resolve();
      else if (m.type === "error" && m.id === undefined) reject(new Error(m.message || "The voice model could not start."));
      else if (m.type === "embedding" && m.id !== undefined) { waiting.get(m.id)?.resolve(m.embedding!); waiting.delete(m.id); }
      else if (m.type === "error" && m.id !== undefined) { waiting.get(m.id)?.reject(new Error(m.message || "Voice check failed.")); waiting.delete(m.id); }
    };
    worker.onerror = (e) => reject(new Error(e.message || "The voice model could not start."));
    worker.postMessage({ type: "init", model }, [model]);
  });
  return {
    embed(wave: Float32Array): Promise<Float32Array> {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        waiting.set(id, { resolve, reject });
        const copy = wave.slice(); // the caller keeps its own buffer
        worker.postMessage({ type: "embed", id, wave: copy }, [copy.buffer]);
      });
    },
    dispose() {
      worker.terminate();
      for (const w of waiting.values()) w.reject(new Error("Stopped."));
      waiting.clear();
      shared = null;
    },
  };
}
