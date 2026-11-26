/**
 * Microphone capture: getUserMedia -> AudioWorklet (inline, from a Blob URL) ->
 * blocks of Float32 -> our own 16 kHz resampler. Browser only.
 *
 * The AudioContext is created inside the call, so the caller must be inside (or
 * shortly after) a user gesture: Chrome keeps a context suspended otherwise, and
 * `resume()` is called here for the common case where the gesture was a click.
 */
import { Resampler, TARGET_RATE } from "./resample";

const WORKLET = `
class HecCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf, [this.buf.buffer]); this.buf = new Float32Array(2048); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor("hec-capture", HecCapture);
`;

export interface Mic {
  /** Called with 16 kHz mono samples, about every 40 ms. */
  onSamples: ((s: Float32Array) => void) | null;
  /** Set by the caller: the track ended (microphone unplugged or permission taken back). */
  onEnded?: (() => void) | null;
  /** The label of the microphone actually in use. */
  label: string | null;
  close(): void;
}

export async function openMic(deviceId?: string): Promise<Mic> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot use the microphone.");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
      channelCount: 1,
    },
  });
  const ctx = new AudioContext();
  try {
    if (ctx.state === "suspended") await ctx.resume();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "hec-capture", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    const mute = ctx.createGain();
    mute.gain.value = 0;
    src.connect(node);
    node.connect(mute).connect(ctx.destination); // some browsers only run a worklet that reaches the destination
    const resampler = new Resampler(ctx.sampleRate, TARGET_RATE);
    const mic: Mic = {
      onSamples: null,
      label: stream.getAudioTracks()[0]?.label ?? null,
      close() {
        mic.onSamples = null;
        try { node.port.onmessage = null; node.disconnect(); src.disconnect(); } catch { /* already closed */ }
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => undefined);
      },
    };
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const cb = mic.onSamples;
      if (cb) cb(resampler.process(e.data));
    };
    // The microphone going away (unplugged, permission revoked) ends the track.
    stream.getAudioTracks()[0]?.addEventListener("ended", () => mic.onEnded?.());
    return mic;
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => undefined);
    throw e;
  }
}

/** Records until stop(), for the enrolment reading and the "HEC" samples. */
export async function recordUntilStopped(deviceId?: string): Promise<{ stop(): Promise<Float32Array>; level(): number }> {
  const mic = await openMic(deviceId);
  const chunks: Float32Array[] = [];
  let level = 0;
  mic.onSamples = (s) => {
    chunks.push(s);
    let e = 0;
    for (let i = 0; i < s.length; i++) e += s[i] * s[i];
    const db = 10 * Math.log10(e / Math.max(1, s.length) + 1e-10);
    level = Math.max(0, Math.min(1, (db + 60) / 50));
  };
  return {
    level: () => level,
    async stop() {
      mic.close();
      const n = chunks.reduce((a, c) => a + c.length, 0);
      const out = new Float32Array(n);
      let o = 0;
      for (const c of chunks) { out.set(c, o); o += c.length; }
      return out;
    },
  };
}
