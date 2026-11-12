// Candidate A: Opus in WebM, one MediaRecorder per track with a timeslice.
//
// Both recorders take their input from the shared AudioContext (a
// MediaStreamDestination per track), so they hear the same clock - but each
// MediaRecorder has its own start latency and its own blob edges, so chunk
// boundaries are not sample-exact (the manifest says `timeline: approximate`).
// With start(timeslice) only the FIRST blob carries the WebM header: later
// chunks are a byte-split of one stream and do not decode on their own.

import type { TrackRole } from "./types";
import { RecorderError } from "./errors";

export const OPUS_MIME = "audio/webm;codecs=opus";

export interface OpusBlob { track: TrackRole; seq: number; bytes: Uint8Array; final: boolean; at: number }

export function opusSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(OPUS_MIME);
}

export class OpusPair {
  private recs: Partial<Record<TrackRole, MediaRecorder>> = {};
  private seq: Record<TrackRole, number> = { teacher: 0, room: 0 };
  private pending: Promise<void>[] = [];
  onBlob: ((b: OpusBlob) => void) | null = null;

  constructor(readonly chunkMs: number, readonly bitsPerSecond = 128000) {
    if (!opusSupported()) throw new RecorderError("unsupported", "This browser cannot record Opus in WebM");
  }

  start(streams: Record<TrackRole, MediaStream>) {
    for (const t of ["teacher", "room"] as TrackRole[]) {
      const r = new MediaRecorder(streams[t], { mimeType: OPUS_MIME, audioBitsPerSecond: this.bitsPerSecond });
      let stopping = false;
      r.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        const seq = this.seq[t]++;
        const final = stopping;
        const p = e.data.arrayBuffer().then((buf) => this.onBlob?.({ track: t, seq, bytes: new Uint8Array(buf), final, at: performance.now() }));
        this.pending.push(p);
      };
      (r as any)._markStopping = () => { stopping = true; };
      this.recs[t] = r;
    }
    // Same JS turn for both: as close together as this API allows.
    this.recs.teacher!.start(this.chunkMs);
    this.recs.room!.start(this.chunkMs);
  }

  stopTrack(t: TrackRole): Promise<void> {
    const r = this.recs[t];
    if (!r || r.state === "inactive") return Promise.resolve();
    return new Promise((ok) => {
      r.addEventListener("stop", () => ok(), { once: true });
      (r as any)._markStopping();
      r.stop();
    });
  }

  async stop(): Promise<void> {
    await Promise.all([this.stopTrack("teacher"), this.stopTrack("room")]);
    await Promise.all(this.pending);
  }
}
