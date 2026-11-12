// A tiny typed event emitter (no dependency).

import type { ChunkMeta, RecorderState, TrackRole } from "./types";
import type { RecorderError } from "./errors";
import type { HealthEvent, Level } from "./health";
import type { UploadProgress } from "./uploader";

export interface RecorderEvents {
  state: { state: RecorderState; recordingId: string | null };
  level: { teacher: Level; room: Level; tMs: number };
  health: HealthEvent | { kind: "device_unplugged" | "device_restored" | "device_lost"; track: TrackRole; tMs: number };
  constraints: { track: TrackRole; requested: Record<string, unknown>; applied: Record<string, unknown>; notHonoured: string[] };
  chunk: ChunkMeta;
  upload: UploadProgress;
  error: RecorderError;
  storage: { usage: number; quota: number; free: number; persisted: boolean | null; warning: boolean };
  clock: { offsetMs: number; rttMs: number; warning: boolean };
  stop_requested: { recordingId: string; reason: "session_canceled" | "switch_off" };
  recovered: { recordingIds: string[] };
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
