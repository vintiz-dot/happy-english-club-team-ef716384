/**
 * Module Web Worker: runs the WeSpeaker model with onnxruntime-web (wasm backend,
 * one thread, so no cross-origin isolation is needed) off the main thread.
 *
 * Messages in:  { type: "init", model: ArrayBuffer }   { type: "embed", id, wave: Float32Array }
 * Messages out: { type: "ready" }  { type: "error", id?, message }  { type: "embedding", id, embedding, ms }
 *
 * Vite bundles the wasm binary as a hashed asset (the ?url import) and the worker
 * is built from the `new Worker(new URL(...))` in embedClient.ts.
 */
import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { makeEmbedder, type Embedder, type OrtLike } from "./embedding";

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = { wasm: wasmUrl } as unknown as string;

let embedder: Embedder | null = null;
// One embedding at a time: the wasm session is not re-entrant.
let queue: Promise<unknown> = Promise.resolve();

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
};

ctx.onmessage = (e: MessageEvent) => {
  const m = e.data as { type: string; id?: number; model?: ArrayBuffer; wave?: Float32Array };
  if (m.type === "init" && m.model) {
    makeEmbedder(ort as unknown as OrtLike, new Uint8Array(m.model), { graphOptimizationLevel: "all" }).then(
      (em) => { embedder = em; ctx.postMessage({ type: "ready" }); },
      (err) => ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) }),
    );
  } else if (m.type === "embed" && m.wave) {
    const wave = m.wave, id = m.id;
    queue = queue.then(async () => {
      try {
        if (!embedder) throw new Error("The voice model is not loaded yet.");
        const t0 = performance.now();
        const embedding = await embedder.embed(wave);
        ctx.postMessage({ type: "embedding", id, embedding, ms: performance.now() - t0 }, [embedding.buffer]);
      } catch (err) {
        ctx.postMessage({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
      }
    });
  }
};
