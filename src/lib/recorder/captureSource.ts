// What the controller needs from "the audio side", so the whole state machine
// can run in Node tests against a fake, and in the browser against the real
// AudioContext + microphones.

import type { TrackRole } from "./types";
import { AudioGraph, type PcmBatch } from "./audioGraph";
import { openBoth, openInput, type OpenedTrack } from "./capture";
import { listInputs, type InputDevice } from "./devices";
import { OpusPair, type OpusBlob } from "./opusPipeline";

export interface TrackOpen {
  role: TrackRole;
  deviceId: string;
  label: string;
  groupId: string;
  requested: Record<string, unknown>;
  applied: Record<string, unknown>;
  notHonoured: string[];
}

export interface CaptureSource {
  readonly sampleRate: number;
  /** "running" once the teacher's click resumed it. */
  readonly contextState: string;
  resume(): Promise<boolean>;
  listDevices(): Promise<InputDevice[]>;
  openTracks(ids: { teacher: string; room: string }): Promise<Record<TrackRole, TrackOpen>>;
  reopen(role: TrackRole, deviceId: string): Promise<TrackOpen>;
  closeTracks(): void;
  forward(on: boolean): void;
  /** The frame after the last one delivered. */
  readonly lastFrame: number;
  timestamp(): { contextTime: number | null; performanceNow: number };
  onBatch: ((b: PcmBatch) => void) | null;
  onTick: ((frame: number, contextTime: number) => void) | null;
  onTrackEnded: ((role: TrackRole) => void) | null;
  /** Opus candidate: start MediaRecorders on the context's taps. */
  startOpus?(chunkMs: number, onBlob: (b: OpusBlob) => void): void;
  stopOpus?(role?: TrackRole): Promise<void>;
  close(): Promise<void>;
}

/** The real thing: one AudioContext, one worklet, two getUserMedia streams. */
export class BrowserCaptureSource implements CaptureSource {
  private opened: Partial<Record<TrackRole, OpenedTrack>> = {};
  private opus: OpusPair | null = null;
  onBatch: ((b: PcmBatch) => void) | null = null;
  onTick: ((frame: number, contextTime: number) => void) | null = null;
  onTrackEnded: ((role: TrackRole) => void) | null = null;

  private constructor(private g: AudioGraph) {
    g.onBatch = (b) => this.onBatch?.(b);
    g.onTick = (f, t) => this.onTick?.(f, t);
  }

  static async create(sampleRate = 48000): Promise<BrowserCaptureSource> {
    return new BrowserCaptureSource(await AudioGraph.create(sampleRate));
  }

  get sampleRate() { return this.g.sampleRate; }
  get contextState() { return this.g.state; }
  get lastFrame() { return this.g.lastFrame; }
  get graph() { return this.g; }
  resume() { return this.g.resume(); }
  listDevices() { return listInputs(); }
  timestamp() { return this.g.timestamp(); }
  forward(on: boolean) { this.g.forward(on); }

  private attach(o: OpenedTrack): TrackOpen {
    this.opened[o.role] = o;
    this.g.connect(o.role, o.stream);
    o.track.addEventListener("ended", () => { if (this.opened[o.role] === o) this.onTrackEnded?.(o.role); });
    return {
      role: o.role, deviceId: String(o.applied.deviceId ?? ""), label: o.track.label, groupId: String(o.applied.groupId ?? ""),
      requested: o.requested, applied: o.applied, notHonoured: o.notHonoured,
    };
  }

  async openTracks(ids: { teacher: string; room: string }) {
    const both = await openBoth(ids);
    if (this.g.state !== "running") await this.g.resume();
    if (this.g.state !== "running") {
      // Measured (C2 evidence, "arm without a click"): with no user gesture a
      // context made BEFORE capture stays suspended even after resume(), but
      // one created while a microphone capture is live starts running. So
      // with the mics open, make a fresh context rather than give up.
      const old = this.g;
      const g = await AudioGraph.create(old.sampleRate);
      g.onBatch = (b) => this.onBatch?.(b);
      g.onTick = (f, t) => this.onTick?.(f, t);
      this.g = g;
      void old.close();
      this.rebuiltContext = true;
    }
    return { teacher: this.attach(both.teacher), room: this.attach(both.room) };
  }
  /** True when the context had to be re-made after the mics opened (no gesture). */
  rebuiltContext = false;

  async reopen(role: TrackRole, deviceId: string) {
    const o = await openInput(role, deviceId);
    this.opened[role]?.stream.getTracks().forEach((t) => t.stop());
    return this.attach(o);
  }

  closeTracks() {
    for (const r of ["teacher", "room"] as TrackRole[]) {
      this.opened[r]?.stream.getTracks().forEach((t) => t.stop());
      this.g.disconnect(r);
      delete this.opened[r];
    }
  }

  startOpus(chunkMs: number, onBlob: (b: OpusBlob) => void) {
    this.opus = new OpusPair(chunkMs);
    this.opus.onBlob = onBlob;
    this.opus.start({ teacher: this.g.tap("teacher"), room: this.g.tap("room") });
  }
  async stopOpus(role?: TrackRole) {
    if (!this.opus) return;
    if (role) return this.opus.stopTrack(role);
    await this.opus.stop();
    this.opus = null;
  }

  async close() { this.closeTracks(); await this.g.close(); }
}
