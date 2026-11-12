// Per-track levels, clipping, silence / dead-mic, and the "roles look swapped"
// measurement. Pure: fed with the same Float32 batches the worklet posts.
// It reports; it never acts. Swapping roles is the teacher's decision.

import type { TrackRole } from "./types";

export interface Level { rmsDb: number; peakDb: number; clipped: number; flat: boolean }
export type HealthEvent =
  | { kind: "clipping"; track: TrackRole; clippedSamples: number; tMs: number }
  | { kind: "silence"; track: TrackRole; seconds: number; tMs: number }
  | { kind: "dead_mic"; track: TrackRole; seconds: number; otherRmsDb: number; tMs: number }
  | { kind: "flat"; track: TrackRole; seconds: number; tMs: number }
  | { kind: "recovered"; track: TrackRole; tMs: number }
  | { kind: "roles_maybe_swapped"; measurement: SwapMeasurement; tMs: number };

export interface SwapMeasurement {
  activeWindows: number;
  roomLouderFraction: number;
  medianTeacherMinusRoomDb: number;
  verdict: "looks_right" | "maybe_swapped" | "not_enough_speech";
}

export const toDb = (x: number) => (x > 0 ? 20 * Math.log10(x) : -120);

export function measure(block: Float32Array): Level {
  let sum = 0, peak = 0, clipped = 0;
  const first = block.length ? block[0] : 0;
  let flat = true;
  for (let i = 0; i < block.length; i++) {
    const v = block[i];
    const a = v < 0 ? -v : v;
    sum += v * v;
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
    if (flat && v !== first) flat = false;
  }
  return { rmsDb: toDb(Math.sqrt(sum / Math.max(1, block.length))), peakDb: toDb(peak), clipped, flat };
}

export interface HealthOptions {
  sampleRate: number;
  silenceDb?: number;         // below this a track is "silent"
  liveDb?: number;            // above this the other track is "live"
  deadAfterSec?: number;      // silent while the other is live for this long -> dead_mic
  flatAfterSec?: number;      // exactly constant for this long -> flat
  clipReportEverySec?: number;
  speechDb?: number;          // a window counts for the swap test when the louder track is above this
  swapWindowSec?: number;     // first N seconds of a recording are measured
  swapMinActiveWindows?: number;
}

/** Stateful analyser: push batches, get events. */
export class HealthMonitor {
  private o: Required<HealthOptions>;
  private silent: Record<TrackRole, number> = { teacher: 0, room: 0 };
  private flatFor: Record<TrackRole, number> = { teacher: 0, room: 0 };
  private dead: Record<TrackRole, boolean> = { teacher: false, room: false };
  private flatReported: Record<TrackRole, boolean> = { teacher: false, room: false };
  private silenceReported: Record<TrackRole, boolean> = { teacher: false, room: false };
  private clipAcc: Record<TrackRole, number> = { teacher: 0, room: 0 };
  private lastClipReport: Record<TrackRole, number> = { teacher: -1e9, room: -1e9 };
  private diffs: number[] = [];
  private swapDone = false;
  private elapsed = 0;
  last: Record<TrackRole, Level> = { teacher: measure(new Float32Array(1)), room: measure(new Float32Array(1)) };

  constructor(opts: HealthOptions) {
    this.o = {
      silenceDb: -65, liveDb: -45, deadAfterSec: 10, flatAfterSec: 2, clipReportEverySec: 5,
      speechDb: -40, swapWindowSec: 60, swapMinActiveWindows: 20, ...opts,
    } as Required<HealthOptions>;
  }

  /** Forget the swap measurement (a new recording). */
  resetSwap() { this.diffs = []; this.swapDone = false; this.elapsed = 0; }

  /**
   * C2 round 3 (N-M8): forget EVERYTHING - a new lesson on the same engine
   * must raise a fault that carried over (a dead mic, clipping) again, and
   * its clock (tMs) restarts at 0.
   */
  reset() {
    this.resetSwap();
    for (const t of ["teacher", "room"] as TrackRole[]) {
      this.silent[t] = 0; this.flatFor[t] = 0; this.dead[t] = false; this.flatReported[t] = false;
      this.silenceReported[t] = false; this.clipAcc[t] = 0; this.lastClipReport[t] = -1e9;
    }
  }

  push(teacher: Float32Array, room: Float32Array, tMs: number): HealthEvent[] {
    const out: HealthEvent[] = [];
    const sec = teacher.length / this.o.sampleRate;
    this.elapsed += sec;
    const lv: Record<TrackRole, Level> = { teacher: measure(teacher), room: measure(room) };
    this.last = lv;
    for (const t of ["teacher", "room"] as TrackRole[]) {
      const other: TrackRole = t === "teacher" ? "room" : "teacher";
      const l = lv[t];
      if (l.clipped) {
        this.clipAcc[t] += l.clipped;
        if (tMs - this.lastClipReport[t] >= this.o.clipReportEverySec * 1000) {
          out.push({ kind: "clipping", track: t, clippedSamples: this.clipAcc[t], tMs });
          this.clipAcc[t] = 0; this.lastClipReport[t] = tMs;
        }
      }
      if (l.flat) this.flatFor[t] += sec; else { this.flatFor[t] = 0; }
      if (this.flatFor[t] >= this.o.flatAfterSec && !this.flatReported[t]) {
        this.flatReported[t] = true;
        out.push({ kind: "flat", track: t, seconds: this.flatFor[t], tMs });
      }
      if (l.rmsDb < this.o.silenceDb) this.silent[t] += sec;
      else {
        if (this.dead[t] || this.flatReported[t] || this.silenceReported[t]) out.push({ kind: "recovered", track: t, tMs });
        this.silent[t] = 0; this.dead[t] = false; this.flatReported[t] = false; this.silenceReported[t] = false;
      }
      if (!this.dead[t] && this.silent[t] >= this.o.deadAfterSec && lv[other].rmsDb > this.o.liveDb) {
        this.dead[t] = true;
        out.push({ kind: "dead_mic", track: t, seconds: this.silent[t], otherRmsDb: lv[other].rmsDb, tMs });
      } else if (!this.silenceReported[t] && !this.dead[t] && this.silent[t] >= this.o.deadAfterSec * 3) {
        this.silenceReported[t] = true;
        out.push({ kind: "silence", track: t, seconds: this.silent[t], tMs });
      }
    }
    // Roles: while one voice dominates, the lapel should be the louder one.
    if (!this.swapDone && this.elapsed <= this.o.swapWindowSec) {
      if (Math.max(lv.teacher.rmsDb, lv.room.rmsDb) > this.o.speechDb) this.diffs.push(lv.teacher.rmsDb - lv.room.rmsDb);
    } else if (!this.swapDone) {
      this.swapDone = true;
      const m = this.swapMeasurement();
      if (m.verdict === "maybe_swapped") out.push({ kind: "roles_maybe_swapped", measurement: m, tMs });
    }
    return out;
  }

  swapMeasurement(): SwapMeasurement { return swapVerdict(this.diffs, this.o.swapMinActiveWindows); }
}

/** teacher-minus-room dB per active window -> verdict. */
export function swapVerdict(diffs: number[], minWindows = 20): SwapMeasurement {
  const n = diffs.length;
  if (n < minWindows) return { activeWindows: n, roomLouderFraction: 0, medianTeacherMinusRoomDb: 0, verdict: "not_enough_speech" };
  const sorted = [...diffs].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  const roomLouder = diffs.filter((d) => d < 0).length / n;
  return {
    activeWindows: n,
    roomLouderFraction: Math.round(roomLouder * 1000) / 1000,
    medianTeacherMinusRoomDb: Math.round(median * 10) / 10,
    verdict: roomLouder > 0.7 && median < -3 ? "maybe_swapped" : "looks_right",
  };
}
