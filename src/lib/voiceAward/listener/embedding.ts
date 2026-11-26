/**
 * Speaker embedding with the WeSpeaker ResNet34 ONNX model. This file holds the
 * part that does not care where onnxruntime runs (a Web Worker in the browser,
 * plain node in the tests): wave -> fbank -> mean normalise -> model -> L2.
 * Imports only ./fbank and ./dsp; the ort module is handed in.
 */
import { fbank, meanNormalise, FBANK_DIM } from "./fbank";
import { l2normalise } from "./dsp";

/** What the listener needs from an embedder, wherever it runs. */
export interface Embedder {
  /** 16 kHz mono wave in [-1,1] -> L2-normalised speaker embedding (256 numbers). */
  embed(wave: Float32Array): Promise<Float32Array>;
}

/** The slice of onnxruntime-web used here, so this file needs no import of it. */
export interface OrtLike {
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: {
    create(model: Uint8Array, opts?: Record<string, unknown>): Promise<{
      inputNames: readonly string[];
      outputNames: readonly string[];
      run(feeds: Record<string, unknown>): Promise<Record<string, { data: ArrayLike<number> }>>;
    }>;
  };
}

/** Shortest wave the model is fed: repeating a shorter clip keeps the embedding stable. */
export const MIN_EMBED_SECONDS = 1.5;
/** Longest wave embedded per call (cost is linear in length). */
export const MAX_EMBED_SECONDS = 4.5;

/** Tiles or trims a wave to [MIN, MAX] seconds. */
export function fitForEmbedding(wave: Float32Array, rate = 16000): Float32Array {
  const min = MIN_EMBED_SECONDS * rate, max = MAX_EMBED_SECONDS * rate;
  if (wave.length > max) return wave.subarray(0, max);
  if (wave.length >= min || wave.length === 0) return wave;
  const out = new Float32Array(min);
  for (let i = 0; i < min; i++) out[i] = wave[i % wave.length];
  return out;
}

export async function makeEmbedder(ort: OrtLike, modelBytes: Uint8Array, sessionOptions: Record<string, unknown> = {}): Promise<Embedder> {
  const session = await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"], ...sessionOptions });
  const input = session.inputNames[0], output = session.outputNames[0];
  return {
    async embed(wave: Float32Array): Promise<Float32Array> {
      const { data, frames } = fbank(wave);
      if (frames < 10) throw new Error("not enough audio to check the voice");
      meanNormalise(data, frames);
      const out = await session.run({ [input]: new ort.Tensor("float32", data, [1, frames, FBANK_DIM]) });
      return l2normalise(out[output].data);
    },
  };
}
