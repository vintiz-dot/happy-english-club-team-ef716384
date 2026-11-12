// manifest.json (C1-architecture 5.4), built from the local records. Pure and
// deterministic: the same inputs give the same bytes, which matters because
// the bucket never overwrites a stored object - a retried finalize must upload
// exactly the manifest it uploaded before.

import type { ChunkMeta, LocalRecording, MarkerRecord, TrackRole } from "./types";
import { hasHardwareDsp } from "./devices";

export interface TrackCounts { chunk_count: number; total_bytes: number; total_ms: number }

/** Chunks that count for a track: confirmed, contiguous from 0, before any refusal. */
export function countedChunks(chunks: ChunkMeta[], track: TrackRole, refusedFromSeq?: number): ChunkMeta[] {
  const mine = chunks.filter((c) => c.track === track).sort((a, b) => a.seq - b.seq);
  const out: ChunkMeta[] = [];
  for (const c of mine) {
    if (refusedFromSeq !== undefined && c.seq >= refusedFromSeq) break;
    if (c.seq !== out.length) break;
    out.push(c);
  }
  return out;
}

export function trackCounts(chunks: ChunkMeta[]): TrackCounts {
  return {
    chunk_count: chunks.length,
    total_bytes: chunks.reduce((s, c) => s + c.byteSize, 0),
    total_ms: chunks.reduce((s, c) => s + (c.tEndMs - c.tStartMs), 0),
  };
}

/** Stable JSON: keys sorted, so the bytes do not depend on insertion order. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
}

export function buildManifest(rec: LocalRecording, chunks: ChunkMeta[], markers: MarkerRecord[]) {
  const exact = rec.format !== "opus-webm";
  return {
    schema_version: 1,
    recording_id: rec.id,
    class_id: rec.classId,
    session_id: rec.sessionId,
    purpose: rec.purpose,
    session_date: rec.sessionDate,
    scheduled_start: rec.scheduledStart,
    scheduled_end: rec.scheduledEnd,
    format: rec.format,
    chunk_ms: rec.chunkMs,
    timeline: exact ? "exact" : "approximate",
    // Exact: both tracks come from one worklet frame counter. Opus: two
    // MediaRecorders, chunk edges from their timeslice (see the C2 evidence).
    tolerance_ms: exact ? 0 : 100,
    sample_rate: rec.sampleRate,
    chunks_self_contained: exact,
    started_at_client: rec.clientStartedAt ?? null,
    ended_at_client: rec.clientEndedAt ?? null,
    started_at_server: rec.startedAtServer ?? null,
    server_offset_ms_at_start: rec.serverOffsetAtStart ?? null,
    server_offset_ms_at_end: rec.serverOffsetAtEnd ?? null,
    anchors: rec.anchors,
    discontinuities: rec.discontinuities,
    tracks: rec.tracks.map((t) => {
      const counted = countedChunks(chunks, t.track, t.refusedFromSeq);
      const counts = trackCounts(counted);
      const all = chunks.filter((c) => c.track === t.track).sort((a, b) => a.seq - b.seq);
      return {
        track: t.track,
        device_label: t.deviceLabel,
        device_hash: t.deviceHash,
        group_hash: t.groupHash,
        requested_constraints: t.requestedConstraints,
        applied_settings: t.appliedSettings,
        constraints_not_honoured: t.notHonoured,
        ...(t.track === "room" ? { room_device_dsp: hasHardwareDsp(t.deviceLabel) ? "hardware, not disableable" : "none reported" } : {}),
        frames_captured: t.framesCaptured,
        frames_written: t.framesWritten,
        closed_at_frame: t.closedAtFrame ?? null,
        chunk_count: counts.chunk_count,
        total_bytes: counts.total_bytes,
        total_ms: counts.total_ms,
        chunks: counted.map((c) => ({ seq: c.seq, path: c.storagePath, byte_size: c.byteSize, sha256: c.sha256, t_start_ms: c.tStartMs, t_end_ms: c.tEndMs, encoding: c.encoding })),
        not_accepted: all.filter((c) => !counted.includes(c)).map((c) => ({ seq: c.seq, reason: c.refusal ?? t.refusedReason ?? "not confirmed", t_start_ms: c.tStartMs, t_end_ms: c.tEndMs })),
      };
    }),
    markers: markers
      .filter((m) => m.sent)
      .sort((a, b) => a.tMs - b.tMs || a.clientMarkerId.localeCompare(b.clientMarkerId))
      .map((m) => ({ client_marker_id: m.clientMarkerId, kind: m.kind, t_ms: m.tMs, label: m.label, student_id: m.studentId })),
    app: { version: rec.appVersion, user_agent: rec.userAgent, install_id: rec.installId, device_profile_id: rec.deviceProfileId ?? null },
    stop_reason: rec.stopReason ?? null,
  };
}

export function manifestBytes(m: unknown): Uint8Array {
  return new TextEncoder().encode(stableStringify(m));
}
