// Register -> upload -> confirm, exactly as the contract says
// (C1-revision "Contract for C2", step 4; C1-architecture 5.5):
//
//   captured   --recorder_register_chunk-->  registered (the server chose the path)
//   registered --storage upload (upsert:false)--> uploaded ("already exists" = success so far)
//   uploaded   --download, SHA-256, recorder_confirm_chunk--> confirmed
//
// Every step is safe to repeat; a retried chunk is never duplicated (the seq
// is the key on both sides, and the same bytes register to the same row).
// Per track, chunks are REGISTERED in seq order, so a permanent refusal at
// seq k can never leave a hole below a registered k+1 - a hole would make
// `complete` impossible (chunk_count must equal max(seq) + 1). Both tracks run
// side by side: two at a time, oldest first.
//
// Nothing here deletes bytes. That happens only after the server row is
// `complete` (controller.finalize), and only for confirmed chunks.

import type { ChunkMeta, LocalRecording, TrackRole } from "./types";
import type { RecorderBackend } from "./backend";
import type { RecorderStore } from "./store";
import { RecorderError, toRecorderError, type ServerRefusal } from "./errors";
import { backoffDelay } from "./backoff";
import { checkChunkLocally } from "./chunkMath";
import { sha256Hex } from "./hash";

export interface UploadProgress {
  recordingId: string;
  total: number;
  confirmed: number;
  pending: number;
  refused: number;
  bytesPending: number;
  offline: boolean;
  /** Earliest time something is worth retrying (epoch ms), or null. */
  nextWakeAt: number | null;
  lastError: RecorderError | null;
  /** The recording cannot take audio any more (abandoned, not ours...). */
  halted: ServerRefusal | null;
  /** Unregistered chunks: their rows have not reached the server yet. */
  unregistered: number;
  /**
   * "Recorded offline too long: these minutes will not count as evidence."
   * Chunks registered after the tolerance; they are still uploaded and kept.
   */
  late: number;
  lateMs: number;
}

export interface UploaderOptions {
  now?: () => number;
  random?: () => number;
  maxBackoffMs?: number;
  /** Registration later than capture + chunk length + this is "late" (default 10 min). */
  lateToleranceMs?: number;
  onChunk?: (c: ChunkMeta) => void;
  onError?: (e: RecorderError, c?: ChunkMeta) => void;
}

/** Refusals after which no later chunk of the track can be accepted either. */
const TRACK_ENDING: ServerRefusal[] = ["stop_requested", "after_stop", "after_window", "span_too_long", "below_byte_floor", "conflicting_chunk"];
/** Refusals that stop the whole recording. */
const HALTING: ServerRefusal[] = ["recording_closed", "not_your_recording", "not_started"];

export class Uploader {
  private now: () => number;
  private random: () => number;
  private running = new Map<string, Promise<UploadProgress>>();

  private lateToleranceMs: number;

  constructor(private store: RecorderStore, private backend: RecorderBackend, private o: UploaderOptions = {}) {
    this.now = o.now ?? (() => Date.now());
    this.lateToleranceMs = o.lateToleranceMs ?? 10 * 60000;
    this.random = o.random ?? Math.random;
  }

  /** One pass over a recording; concurrent calls for the same recording share the pass. */
  run(recordingId: string): Promise<UploadProgress> {
    const have = this.running.get(recordingId);
    if (have) return have;
    const p = this.pass(recordingId).finally(() => this.running.delete(recordingId));
    this.running.set(recordingId, p);
    return p;
  }

  private async pass(recordingId: string): Promise<UploadProgress> {
    const rec = await this.store.getRecording(recordingId);
    if (!rec) throw new RecorderError("internal", `no local recording ${recordingId}`);
    const state = { offline: false, lastError: null as RecorderError | null, halted: null as ServerRefusal | null };
    if (rec.startedAtServer) {
      await Promise.all((["teacher", "room"] as TrackRole[]).map((t) => this.track(rec, t, state)));
    }
    return this.progress(recordingId, state);
  }

  async progress(recordingId: string, state: { offline: boolean; lastError: RecorderError | null; halted: ServerRefusal | null } = { offline: false, lastError: null, halted: null }): Promise<UploadProgress> {
    const chunks = await this.store.listChunks(recordingId);
    const open = chunks.filter((c) => c.state !== "confirmed" && c.state !== "refused");
    const waits = open.map((c) => c.nextAttemptAt ?? 0).filter((t) => t > 0);
    return {
      recordingId,
      total: chunks.length,
      confirmed: chunks.filter((c) => c.state === "confirmed").length,
      pending: open.length,
      refused: chunks.filter((c) => c.state === "refused").length,
      bytesPending: open.reduce((s, c) => s + c.byteSize, 0),
      offline: state.offline,
      nextWakeAt: open.length ? (waits.length ? Math.min(...waits) : this.now()) : null,
      lastError: state.lastError,
      halted: state.halted,
      unregistered: chunks.filter((c) => c.state === "captured").length,
      late: chunks.filter((c) => c.late).length,
      lateMs: chunks.filter((c) => c.late).reduce((s, c) => s + (c.tEndMs - c.tStartMs), 0),
    };
  }

  /**
   * Register EARLY, upload when possible (revision 2): a chunk only counts as
   * evidence if its row reaches the server within its capture time + a
   * tolerance, so every captured chunk is registered as soon as it can be -
   * registering is one small call - and the uploads (the big part) follow,
   * oldest first. Registration stays in seq order per track.
   */
  private async track(rec: LocalRecording, track: TrackRole, state: { offline: boolean; lastError: RecorderError | null; halted: ServerRefusal | null }) {
    for (;;) {
      if (state.offline || state.halted) return;
      const fresh = (await this.store.getRecording(rec.id)) ?? rec;
      const info = fresh.tracks.find((t) => t.track === track);
      const chunks = (await this.store.listChunks(rec.id)).filter((c) => c.track === track).sort((a, b) => a.seq - b.seq);
      const open = chunks.filter((c) => c.state !== "confirmed" && c.state !== "refused");
      if (!open.length) return;
      const beyond = info?.refusedFromSeq !== undefined ? open.find((c) => c.seq >= info.refusedFromSeq!) : undefined;
      if (beyond) { await this.refuse(fresh, beyond, (info!.refusedReason as ServerRefusal) ?? "unknown", false); continue; }
      const due = (c: ChunkMeta) => (c.nextAttemptAt ?? 0) <= this.now();
      // 1. The lowest unregistered chunk (seq order keeps the server's rows contiguous).
      const reg = open.find((c) => c.state === "captured");
      if (reg && due(reg)) { if (await this.step(fresh, reg, state)) continue; if (state.offline || state.halted) return; }
      // 2. The oldest registered chunk still to upload / confirm.
      const up = open.find((c) => (c.state === "registered" || c.state === "uploaded") && due(c));
      if (!up) return;
      if (!(await this.step(fresh, up, state))) return;
    }
  }

  /** Advance one chunk by one state. Returns false when it should wait. */
  private async step(rec: LocalRecording, c: ChunkMeta, state: { offline: boolean; lastError: RecorderError | null; halted: ServerRefusal | null }): Promise<boolean> {
    try {
      if (c.state === "captured") {
        const windowMs = Date.parse(rec.captureClosesAt) - Date.parse(rec.startedAtServer!);
        const v = checkChunkLocally(c.byteSize, c.tStartMs, c.tEndMs, {
          chunkMs: rec.chunkMs, minBytesPerSec: rec.minBytesPerSec, clockToleranceMs: rec.clockToleranceMs, windowMs,
        });
        if (v.ok === false) {
          // (strict is off in this repo, so the union is not narrowed: read it explicitly.)
          const refusal = (v as { refusal: "span_too_long" | "below_byte_floor" | "after_window" | "bad_span" }).refusal;
          await this.refuse(rec, c, refusal === "bad_span" ? "span_too_long" : refusal, true);
          return true;
        }
        const r = await this.backend.registerChunk({ recording: rec.id, track: c.track, seq: c.seq, byteSize: c.byteSize, sha256: c.sha256, tStartMs: c.tStartMs, tEndMs: c.tEndMs });
        c.chunkId = r.chunk_id; c.storagePath = r.storage_path;
        if (!c.registeredAt) c.registeredAt = this.now();
        // The server's verdict when it gives one; otherwise our own estimate
        // (cut at createdAt, registered now) so the UI can warn either way.
        c.late = typeof (r as any).late === "boolean" ? (r as any).late : c.registeredAt - c.createdAt > rec.chunkMs + this.lateToleranceMs;
        c.state = r.confirmed ? "confirmed" : "registered";
        if (r.confirmed) c.confirmedAt = this.now();
      } else if (c.state === "registered") {
        const bytes = await this.store.getBytes(c.recordingId, c.track, c.seq);
        if (!bytes) throw new RecorderError("internal", `the bytes of chunk ${c.track}/${c.seq} are missing locally`);
        await this.backend.upload(c.storagePath!, bytes, c.mime);
        c.state = "uploaded";
      } else if (c.state === "uploaded") {
        const back = await this.backend.download(c.storagePath!);
        const sha = await sha256Hex(back);
        if (sha !== c.sha256 || back.length !== c.byteSize) {
          // Never confirm what did not round-trip. The object cannot be
          // replaced (no UPDATE policy), so this chunk stays local and the
          // recording cannot complete: the UI must show it.
          throw new RecorderError("server_refused", "What storage returned is not what was recorded: the local copy is kept", { refusal: "readback_mismatch" });
        }
        const ok = await this.backend.confirmChunk(c.chunkId!, sha);
        if (!ok) throw new RecorderError("server_refused", "The server did not confirm the chunk", { refusal: "not_in_storage", retryable: true });
        c.state = "confirmed"; c.confirmedAt = this.now();
      }
      c.attempts = 0; c.nextAttemptAt = undefined; c.lastError = undefined;
      await this.store.updateChunk(c);
      this.o.onChunk?.(c);
      return true;
    } catch (e) {
      const err = toRecorderError(e);
      state.lastError = err;
      this.o.onError?.(err, c);
      if (err.code === "offline") { state.offline = true; return false; }
      if (err.refusal && HALTING.includes(err.refusal)) { state.halted = err.refusal; return false; }
      if (err.refusal && TRACK_ENDING.includes(err.refusal)) { await this.refuse(rec, c, err.refusal, true); return true; }
      if (err.refusal === "not_in_storage" && c.state === "uploaded") c.state = "registered";
      if (err.refusal === "readback_mismatch") { c.state = "refused"; c.refusal = "readback_mismatch"; c.lastError = err.message; await this.store.updateChunk(c); this.o.onChunk?.(c); return true; }
      c.attempts += 1;
      c.lastError = err.message;
      c.nextAttemptAt = this.now() + backoffDelay(c.attempts, { maxMs: this.o.maxBackoffMs ?? 60000, random: this.random });
      await this.store.updateChunk(c);
      return false;
    }
  }

  /** A permanent refusal: this chunk and every later one of the track are not counted. Bytes are kept. */
  private async refuse(rec: LocalRecording, c: ChunkMeta, refusal: ServerRefusal, markTrack: boolean) {
    c.state = "refused"; c.refusal = refusal;
    await this.store.updateChunk(c);
    if (markTrack) {
      const fresh = (await this.store.getRecording(rec.id)) ?? rec;
      const t = fresh.tracks.find((x) => x.track === c.track);
      if (t && (t.refusedFromSeq === undefined || c.seq < t.refusedFromSeq)) {
        t.refusedFromSeq = c.seq; t.refusedReason = refusal;
        fresh.updatedAt = this.now();
        await this.store.putRecording(fresh);
      }
    }
    this.o.onChunk?.(c);
  }
}
