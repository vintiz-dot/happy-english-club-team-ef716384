// Cuts the aligned PCM of both tracks into chunks of exactly F frames on the
// shared clock, and into 5-second segments for crash safety. Pure: the tests
// drive it with arrays.
//
// Frames before t0 (set when the server is asked to start) are dropped. A
// track that has been closed (device lost for good) gets no more chunks; the
// other carries on with the same frame positions.

import type { TrackRole } from "./types";
import { framesPerChunk } from "./chunkMath";

export interface RawChunk { track: TrackRole; seq: number; startFrame: number; samples: Int16Array; final: boolean }
export interface RawSegment { track: TrackRole; seq: number; index: number; startFrame: number; samples: Int16Array }

const ROLES: TrackRole[] = ["teacher", "room"];

export class Chunker {
  readonly F: number;
  readonly segmentFrames: number;
  private t0: number | null = null;
  private bufs: Record<TrackRole, Int16Array>;
  /** Frames filled in the current chunk window (shared: both tracks move in step). */
  private fill = 0;
  /** Index of the current chunk window. Chunk seq == window index for every track. */
  private win = 0;
  private segIndex: Record<TrackRole, number> = { teacher: 0, room: 0 };
  private segFrom: Record<TrackRole, number> = { teacher: 0, room: 0 };
  private closed: Record<TrackRole, boolean> = { teacher: false, room: false };
  /** Frames accepted after t0, per track (frames_captured in the manifest). */
  readonly captured: Record<TrackRole, number> = { teacher: 0, room: 0 };

  constructor(
    readonly sampleRate: number,
    readonly chunkMs: number,
    private readonly onChunk: (c: RawChunk) => void,
    private readonly onSegment?: (s: RawSegment) => void,
    segmentMs = 5000,
  ) {
    this.F = framesPerChunk(sampleRate, chunkMs);
    this.segmentFrames = Math.round((sampleRate * segmentMs) / 1000);
    this.bufs = { teacher: new Int16Array(this.F), room: new Int16Array(this.F) };
  }

  get started(): boolean { return this.t0 !== null; }
  get t0Frame(): number | null { return this.t0; }
  /** Frames since t0. */
  get position(): number { return this.win * this.F + this.fill; }

  setT0(absFrame: number): void { this.t0 = absFrame; }

  /** Forget everything (a start the server did not accept). */
  reset(): void {
    this.t0 = null; this.fill = 0; this.win = 0;
    for (const t of ROLES) { this.segIndex[t] = 0; this.segFrom[t] = 0; this.captured[t] = 0; this.closed[t] = false; }
  }

  /** No more audio for this track: its partial chunk is emitted now. */
  closeTrack(track: TrackRole): void {
    if (this.closed[track]) return;
    if (this.t0 !== null) this.emit(track, this.fill, true);
    this.closed[track] = true;
  }
  isClosed(track: TrackRole): boolean { return this.closed[track]; }

  /** One aligned batch starting at absolute frame `absFrame`; both arrays the same length. */
  push(absFrame: number, teacher: Int16Array, room: Int16Array): void {
    if (this.t0 === null) return;
    const from = absFrame < this.t0 ? Math.min(teacher.length, this.t0 - absFrame) : 0;
    let off = from;
    let left = teacher.length - from;
    const src: Record<TrackRole, Int16Array> = { teacher, room };
    while (left > 0) {
      const take = Math.min(this.F - this.fill, left);
      for (const t of ROLES) {
        if (this.closed[t]) continue;
        this.bufs[t].set(src[t].subarray(off, off + take), this.fill);
        this.captured[t] += take;
      }
      this.fill += take; off += take; left -= take;
      if (this.onSegment) {
        for (const t of ROLES) {
          if (this.closed[t]) continue;
          while (this.fill - this.segFrom[t] >= this.segmentFrames) {
            const a = this.segFrom[t], b = a + this.segmentFrames;
            this.onSegment({ track: t, seq: this.win, index: this.segIndex[t]++, startFrame: this.win * this.F + a, samples: this.bufs[t].slice(a, b) });
            this.segFrom[t] = b;
          }
        }
      }
      if (this.fill === this.F) {
        for (const t of ROLES) if (!this.closed[t]) this.emit(t, this.F, false);
        this.fill = 0; this.win++;
      }
    }
  }

  /** Stop: emit the partial chunk of each open track. */
  flush(): void {
    if (this.t0 === null) return;
    for (const t of ROLES) if (!this.closed[t]) this.emit(t, this.fill, true);
    if (this.fill > 0) { this.fill = 0; this.win++; }
  }

  private emit(track: TrackRole, frames: number, final: boolean): void {
    this.segIndex[track] = 0; this.segFrom[track] = 0;
    if (frames === 0) return;
    this.onChunk({ track, seq: this.win, startFrame: this.win * this.F, samples: this.bufs[track].slice(0, frames), final });
  }
}
