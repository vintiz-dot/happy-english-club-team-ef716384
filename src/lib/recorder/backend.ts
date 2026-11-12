// What the engine needs from the server, and the adapter that does it with an
// INJECTED supabase-js client (the teacher's own session). The engine never
// imports the app's client, so tests pass a fake; and there is no service
// role anywhere on this path - every call is the teacher's, under RLS.
//
// The tables and functions are from supabase/migrations/20261112100000_class_recorder.sql.
// src/integrations/supabase/types.ts does not know them yet (the migration is
// not applied), hence the local types here (C1-architecture, assumption 6).

import type { RecorderFormat, ServerRecording, StopReason, TrackRole } from "./types";
import { RecorderError, toRecorderError } from "./errors";

export const BUCKET = "class-recordings";

export interface ArmInput {
  session_id: string;
  format: RecorderFormat;
  chunk_ms: number;
  purpose?: "lesson" | "evaluation";
  device_profile_id?: string | null;
  client_info?: Record<string, unknown>;
}

export interface TrackRow {
  recording_id: string;
  track: TrackRole;
  device_label: string | null;
  device_hash: string | null;
  sample_rate: number;
  channel_count: 1;
  codec: string;
  bitrate: number | null;
  applied_settings: Record<string, unknown>;
}

export interface RegisterResult { chunk_id: string; storage_path: string; already_registered: boolean; confirmed: boolean }

export interface RecorderBackend {
  serverTime(): Promise<string>;
  arm(input: ArmInput): Promise<ServerRecording>;
  getRecording(id: string): Promise<ServerRecording | null>;
  start(id: string, clientStartedAt: string): Promise<ServerRecording>;
  ensureTrack(row: TrackRow): Promise<void>;
  registerChunk(a: { recording: string; track: TrackRole; seq: number; byteSize: number; sha256: string; tStartMs: number; tEndMs: number }): Promise<RegisterResult>;
  /** "already" = the object was there (a retry): success so far, go and confirm. */
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<"stored" | "already">;
  download(path: string): Promise<Uint8Array>;
  confirmChunk(chunkId: string, readbackSha256: string): Promise<boolean>;
  stop(id: string, reason: StopReason, clientEndedAt: string): Promise<ServerRecording>;
  setTrackCounts(id: string, track: TrackRole, c: { chunk_count: number; total_bytes: number; total_ms: number }): Promise<void>;
  complete(id: string, manifestPath: string, manifestSha256: string): Promise<ServerRecording>;
  abandon(id: string, reason: string): Promise<ServerRecording>;
  /** "already" = a re-sent marker (same client_marker_id): a no-op. */
  insertMarker(row: { recording_id: string; client_marker_id: string; kind: string; t_ms: number; label: string | null; student_id: string | null }): Promise<"stored" | "already">;
  upsertDeviceProfile(row: Record<string, unknown>): Promise<{ id: string }>;
  sessionStatus(sessionId: string): Promise<string | null>;
}

// ---------------------------------------------------------------- supabase-js

/** The slice of supabase-js the adapter uses (so a fake can implement just this). */
export interface SupabaseLike {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: any; error: any }>;
  from(table: string): any;
  storage: { from(bucket: string): { upload(path: string, body: Blob | ArrayBuffer | Uint8Array, opts?: Record<string, unknown>): PromiseLike<{ data: any; error: any }>; download(path: string): PromiseLike<{ data: Blob | null; error: any }> } };
}

const REC_COLUMNS = "id,class_id,session_id,armed_session_id,session_date,scheduled_start,scheduled_end,capture_opens_at,capture_closes_at,status,format,chunk_ms,max_duration_ms,min_bytes_per_sec,clock_tolerance_ms,purpose,started_at,ended_at,stop_reason,stop_requested_at,manifest_path,manifest_sha256,abandon_reason";

async function unwrap<T>(p: PromiseLike<{ data: T; error: any }>, what: string): Promise<T> {
  let r: { data: T; error: any };
  try { r = await p; } catch (e) { throw toRecorderError(e, what); }
  if (r.error) throw toRecorderError(r.error, what);
  return r.data;
}

const isDuplicate = (e: any) => e && (e.code === "23505" || /duplicate key/i.test(String(e.message ?? "")));
const isStorageDuplicate = (e: any) =>
  e && (String(e.statusCode ?? e.status ?? "") === "409" || /already exists|duplicate/i.test(String(e.message ?? e.error ?? "")));

export function supabaseBackend(client: SupabaseLike): RecorderBackend {
  const rec = () => client.from("class_recordings");
  return {
    async serverTime() { return String(await unwrap(client.rpc("recorder_server_time"), "server time")); },
    async arm(input) {
      return unwrap(rec().insert({ purpose: "lesson", client_info: {}, ...input }).select(REC_COLUMNS).single(), "arm");
    },
    async getRecording(id) {
      return unwrap(rec().select(REC_COLUMNS).eq("id", id).maybeSingle(), "read recording");
    },
    async start(id, clientStartedAt) {
      return unwrap(rec().update({ status: "recording", client_started_at: clientStartedAt }).eq("id", id).select(REC_COLUMNS).single(), "start");
    },
    async ensureTrack(row) {
      let r: { error: any };
      try { r = await client.from("class_recording_tracks").insert(row); } catch (e) { throw toRecorderError(e, "track"); }
      if (r.error && !isDuplicate(r.error)) throw toRecorderError(r.error, "track");
    },
    async registerChunk(a) {
      return unwrap(client.rpc("recorder_register_chunk", {
        p_recording: a.recording, p_track: a.track, p_seq: a.seq, p_byte_size: a.byteSize,
        p_sha256: a.sha256, p_t_start_ms: a.tStartMs, p_t_end_ms: a.tEndMs,
      }), "register chunk");
    },
    async upload(path, bytes, contentType) {
      let r: { data: any; error: any };
      const body = new Blob([bytes as BlobPart], { type: contentType });
      try { r = await client.storage.from(BUCKET).upload(path, body, { upsert: false, contentType, cacheControl: "no-store" }); }
      catch (e) { throw toRecorderError(e, "upload"); }
      if (r.error) {
        if (isStorageDuplicate(r.error)) return "already";
        throw toRecorderError(r.error, "upload");
      }
      return "stored";
    },
    async download(path) {
      const blob = await unwrap(client.storage.from(BUCKET).download(path), "read back");
      if (!blob) throw new RecorderError("server_refused", "Storage returned nothing", { refusal: "not_in_storage", retryable: true });
      return new Uint8Array(await blob.arrayBuffer());
    },
    async confirmChunk(chunkId, sha) {
      return (await unwrap(client.rpc("recorder_confirm_chunk", { p_chunk: chunkId, p_readback_sha256: sha }), "confirm")) === true;
    },
    async stop(id, reason, clientEndedAt) {
      return unwrap(rec().update({ status: "uploading", stop_reason: reason, client_ended_at: clientEndedAt }).eq("id", id).select(REC_COLUMNS).single(), "stop");
    },
    async setTrackCounts(id, track, c) {
      await unwrap(client.from("class_recording_tracks").update(c).eq("recording_id", id).eq("track", track), "track counts");
    },
    async complete(id, manifestPath, sha) {
      return unwrap(rec().update({ status: "complete", manifest_path: manifestPath, manifest_sha256: sha }).eq("id", id).select(REC_COLUMNS).single(), "complete");
    },
    async abandon(id, reason) {
      return unwrap(rec().update({ status: "abandoned", abandon_reason: reason }).eq("id", id).select(REC_COLUMNS).single(), "abandon");
    },
    async insertMarker(row) {
      let r: { error: any };
      try { r = await client.from("class_recording_markers").insert(row); } catch (e) { throw toRecorderError(e, "marker"); }
      if (r.error) { if (isDuplicate(r.error)) return "already"; throw toRecorderError(r.error, "marker"); }
      return "stored";
    },
    async upsertDeviceProfile(row) {
      // Plain UNIQUE (user_id, install_id): a valid ON CONFLICT target.
      return unwrap(client.from("recorder_device_profiles").upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id,install_id" }).select("id").single(), "device profile");
    },
    async sessionStatus(sessionId) {
      const r = await unwrap(client.from("sessions").select("status").eq("id", sessionId).maybeSingle(), "session");
      return (r as any)?.status ?? null;
    },
  };
}
