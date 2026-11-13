// The AudioWorklet processor, as source text (loaded from a Blob URL, so it
// needs no bundler support and no file in public/).
//
// ONE processor with TWO inputs (0 = teacher, 1 = room) and no outputs. Every
// process() call hands over the same 128 frames of both tracks, so frame n of
// one track and frame n of the other are the same instant on the one
// AudioContext clock: the two tracks are aligned by construction.
//
// It counts frames from its own creation and posts:
//   { type: "pcm", frame, teacher, room, missing: [bool, bool] }  every BATCH frames
//   { type: "tick", frame, time }                                   every ~0.5 s
// A missing input (unplugged, not yet connected) is sent as zeros with its
// `missing` flag set, so the timeline stays aligned. Channel 0 only: mono.
// The ticks are the engine's heartbeat: they come from the audio thread,
// which background-tab timer throttling does not slow.

export const WORKLET_NAME = "hec-recorder-capture";
export const BATCH_FRAMES = 2048;

export const WORKLET_SOURCE = `
class HecRecorderCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.batch = (options && options.processorOptions && options.processorOptions.batch) || ${BATCH_FRAMES};
    this.frame = 0;
    this.fill = 0;
    this.batchStart = 0;
    this.t = new Float32Array(this.batch);
    this.r = new Float32Array(this.batch);
    this.mt = false; this.mr = false;
    this.forward = false;
    this.nextTick = 0;
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === "forward") this.forward = !!d.on;
    };
  }
  process(inputs) {
    const n = 128;
    const a = inputs[0] && inputs[0][0];
    const b = inputs[1] && inputs[1][0];
    if (this.forward) {
      if (this.fill === 0) this.batchStart = this.frame;
      const len = (a && a.length) || (b && b.length) || n;
      for (let i = 0; i < len; i++) {
        this.t[this.fill + i] = a ? a[i] : 0;
        this.r[this.fill + i] = b ? b[i] : 0;
      }
      if (!a) this.mt = true;
      if (!b) this.mr = true;
      this.fill += len;
      if (this.fill >= this.batch) {
        const t = this.t.slice(0, this.fill), r = this.r.slice(0, this.fill);
        this.port.postMessage({ type: "pcm", frame: this.batchStart, teacher: t, room: r, missing: [this.mt, this.mr] }, [t.buffer, r.buffer]);
        this.fill = 0; this.mt = false; this.mr = false;
      }
      this.frame += len;
    } else {
      this.frame += n;
    }
    if (this.frame >= this.nextTick) {
      this.port.postMessage({ type: "tick", frame: this.frame, time: currentTime });
      this.nextTick = this.frame + sampleRate / 2;
    }
    return true;
  }
}
registerProcessor("${WORKLET_NAME}", HecRecorderCapture);
`;

const loaded = new WeakSet<BaseAudioContext>();

export async function loadWorklet(ctx: BaseAudioContext): Promise<void> {
  if (loaded.has(ctx)) return;
  const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
  try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
  loaded.add(ctx);
}
