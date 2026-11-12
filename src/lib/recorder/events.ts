// A tiny typed event emitter (no dependency).

import type { ChunkMeta, RecorderState, TrackRole } from "./types";
import type { RecorderError } from "./errors";
import type { HealthEvent, Level } from "./health";
import type { UploadProgress } from "./uploader";

/** Own audio held on this laptop that has not reached the server (C2 revision M1/M2). */
export interface HeldAudio {
  recordingId: string;
  sessionDate: string;
  phase: string;
  serverStatus: string;
  /** Unconfirmed bytes still only on this laptop. */
  bytes: number;
  ageMs: number;
  /** Older than the stated limit (default 14 days): show it to the teacher / an admin. Never deleted automatically. */
  overLimit: boolean;
}

export interface RecorderEvents {
  state: { state: RecorderState; recordingId: string | null };
  /** clipping: full scale reached in the last 2 s, per track - show it on the meter (field finding: lapel at 0.0 dB). */
  level: { teacher: Level; room: Level; tMs: number; clipping?: { teacher: boolean; room: boolean } };
  health: HealthEvent | { kind: "device_unplugged" | "device_restored" | "device_lost"; track: TrackRole; tMs: number }
    // C2 revision (B1): no audio is arriving / it is arriving again (gapMs: how long nothing came).
    | { kind: "capture_stalled" | "capture_resumed"; tMs: number; gapMs?: number; contextState?: string };
  constraints: { track: TrackRole; requested: Record<string, unknown>; applied: Record<string, unknown>; notHonoured: string[] };
  chunk: ChunkMeta;
  upload: UploadProgress;
  error: RecorderError;
  storage: { usage: number; quota: number; free: number; persisted: boolean | null; warning: boolean };
  /** jumpMs (C2 revision B2): the laptop's wall clock jumped by this much; lesson timing does not use it. */
  clock: { offsetMs: number; rttMs: number; warning: boolean; jumpMs?: number };
  stop_requested: { recordingId: string; reason: "session_canceled" | "switch_off" };
  /** othersPending (C2 revision M1): another account's unsent audio on this laptop - it must sign in to send it. */
  recovered: { recordingIds: string[]; othersPending?: { recordings: number; bytes: number } };
  /** C2 revision (M2): own unsent audio older than the limit. Kept until an explicit Discard, never deleted by itself. */
  stuck: { recordings: HeldAudio[] };
  backup: { status: "off" | "on" | "needs_permission" | "failed"; detail?: string };
}

export type Listener<K extends keyof RecorderEvents> = (e: RecorderEvents[K]) => void;

export class Emitter {
  private m = new Map<string, Set<(e: any) => void>>();
  on<K extends keyof RecorderEvents>(k: K, fn: Listener<K>): () => void {
    if (!this.m.has(k)) this.m.set(k, new Set());
    this.m.get(k)!.add(fn);
    return () => this.m.get(k)?.delete(fn);
  }
  emit<K extends keyof RecorderEvents>(k: K, e: RecorderEvents[K]) {
    for (const fn of this.m.get(k) ?? []) { try { fn(e); } catch (err) { console.error("[recorder] listener failed", err); } }
  }
}
