// The one AudioContext and its worklet. Both microphones are sources in this
// context, so they share its clock; the worklet sees frame n of both tracks
// in the same process() call.
//
// The context is created and resumed in the teacher's "Ready for today" click
// (Chrome's autoplay policy may keep a context made without a gesture
// suspended - see the C2 evidence for what was measured) and then stays
// running all day: its worklet ticks are the engine's heartbeat.

import type { TrackRole } from "./types";
import { loadWorklet, WORKLET_NAME, BATCH_FRAMES } from "./worklet";
import { RecorderError } from "./errors";

export interface PcmBatch { frame: number; teacher: Float32Array; room: Float32Array; missing: [boolean, boolean] }

export class AudioGraph {
  readonly ctx: AudioContext;
  private node: AudioWorkletNode | null = null;
  private sources: Record<TrackRole, MediaStreamAudioSourceNode | null> = { teacher: null, room: null };
  private dests: Record<TrackRole, MediaStreamAudioDestinationNode | null> = { teacher: null, room: null };
  /** The frame just after the last one the worklet delivered. */
  lastFrame = 0;
  lastTickAt = 0;
  lastContextTime = 0;
  onBatch: ((b: PcmBatch) => void) | null = null;
  onTick: ((frame: number, contextTime: number) => void) | null = null;
  /** C2 revision (B1): the context left (or re-entered) "running" - suspended, interrupted, closed. */
  onStateChange: ((state: string) => void) | null = null;
  /** Frames delivered by the worklet while forwarding (frames_written basis). */
  framesDelivered = 0;

  private constructor(ctx: AudioContext) {
    this.ctx = ctx;
    try { ctx.addEventListener("statechange", () => this.onStateChange?.(ctx.state)); } catch { /* old browsers */ }
  }

  static async create(sampleRate = 48000): Promise<AudioGraph> {
    if (typeof AudioContext === "undefined" || typeof AudioWorkletNode === "undefined") throw new RecorderError("unsupported", "This browser has no AudioWorklet");
    const ctx = new AudioContext({ sampleRate, latencyHint: "playback" });
    const g = new AudioGraph(ctx);
    await loadWorklet(ctx);
    const node = new AudioWorkletNode(ctx, WORKLET_NAME, {
      numberOfInputs: 2, numberOfOutputs: 0, channelCount: 1, channelCountMode: "explicit", channelInterpretation: "discrete",
      processorOptions: { batch: BATCH_FRAMES },
    });
    node.port.onmessage = (e) => g.handle(e.data);
    g.node = node;
    return g;
  }

  get sampleRate(): number { return this.ctx.sampleRate; }
  get state(): AudioContextState { return this.ctx.state; }

  /** Must be called from a user gesture the first time. */
  async resume(): Promise<boolean> {
    // Without a gesture Chrome leaves resume()'s promise PENDING (measured:
    // the page hung here) rather than rejecting it, so never wait on it long.
    try { await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 1000))]); } catch { /* state says it */ }
    return this.ctx.state === "running";
  }

  private handle(d: any) {
    if (!d) return;
    if (d.type === "pcm") {
      this.lastFrame = d.frame + d.teacher.length;
      this.framesDelivered += d.teacher.length;
      this.onBatch?.({ frame: d.frame, teacher: d.teacher, room: d.room, missing: d.missing });
    } else if (d.type === "tick") {
      this.lastFrame = Math.max(this.lastFrame, d.frame);
      this.lastTickAt = performance.now();
      this.lastContextTime = d.time;
      this.onTick?.(d.frame, d.time);
    }
  }

  forward(on: boolean) { this.forwarding = on; this.node?.port.postMessage({ type: "forward", on }); }
  forwarding = false;

  /** Route a microphone into its worklet input (0 = teacher, 1 = room). */
  connect(role: TrackRole, stream: MediaStream) {
    this.disconnect(role);
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(this.node!, 0, role === "teacher" ? 0 : 1);
    this.sources[role] = src;
  }

  /** A MediaStream of this track as the context renders it (for the Opus candidate). */
  tap(role: TrackRole): MediaStream {
    const src = this.sources[role];
    if (!src) throw new RecorderError("internal", `no ${role} source`);
    const d = this.ctx.createMediaStreamDestination();
    d.channelCount = 1;
    src.connect(d);
    this.dests[role] = d;
    return d.stream;
  }

  disconnect(role: TrackRole) {
    try { this.sources[role]?.disconnect(); } catch { /* already */ }
    this.sources[role] = null;
    try { this.dests[role]?.disconnect(); } catch { /* already */ }
    this.dests[role] = null;
  }

  /** getOutputTimestamp gives context time and performance.now together. */
  timestamp(): { contextTime: number | null; performanceNow: number } {
    try {
      const ts = this.ctx.getOutputTimestamp();
      return { contextTime: ts.contextTime ?? this.ctx.currentTime, performanceNow: ts.performanceTime ?? performance.now() };
    } catch { return { contextTime: this.ctx.currentTime, performanceNow: performance.now() }; }
  }

  async close() {
    this.disconnect("teacher"); this.disconnect("room");
    try { this.node?.disconnect(); } catch { /* */ }
    try { await this.ctx.close(); } catch { /* */ }
  }
}
