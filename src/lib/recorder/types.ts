// Shared types of the class recorder capture core. Pure declarations.

export type TrackRole = "teacher" | "room";
export const TRACKS: readonly TrackRole[] = ["teacher", "room"] as const;

/** The three formats the database accepts (`class_recordings.format`). */
export type RecorderFormat = "opus-webm" | "flac" | "pcm-wav";

/** Server-side status (`class_recordings.status`). */
export type ServerStatus = "armed" | "recording" | "uploading" | "complete" | "abandoned" | "deleted";

/** Stop reasons the page may send (the server decides the rest). */
export type StopReason = "manual" | "scheduled_end" | "device_lost" | "crash_recovered" | "session_canceled" | "switch_off";

/** What the engine is doing, for the UI. */
export type RecorderState =
  | "idle"        // nothing prepared
  | "ready"       // AudioContext running, devices resolved ("Ready for today")
  | "armed"       // a server row exists, waiting for the capture window
  | "starting"    // capture running, waiting for the server to stamp started_at
  | "recording"
  | "stopping"
  | "uploading"   // capture over, chunks still going up
  | "finalizing"  // manifest + complete
  | "complete"
  | "abandoned"
  | "error";

/** Local chunk life cycle. Every step is safe to repeat. */
export type ChunkState =
  | "captured"     // in IndexedDB, not yet known to the server
  | "registered"   // recorder_register_chunk returned a path
  | "uploaded"     // storage accepted (or already had) the object
  | "confirmed"    // recorder_confirm_chunk returned true: the server has it
  | "refused";     // the server refused it for good (reason kept); bytes kept

export interface ChunkMeta {
  recordingId: string;
  track: TrackRole;
  seq: number;
  /** Frame positions on the shared AudioContext clock, relative to t = 0. */
  startFrame: number;
  endFrame: number;
  sampleRate: number;
  tStartMs: number;
  tEndMs: number;
  byteSize: number;
  sha256: string;
  mime: string;
  ext: string;
  /** "fixed" (normal FLAC), "verbatim" (FLAC kept uncompressed to stay above the byte floor), "pcm", "opus". */
  encoding: string;
  state: ChunkState;
  chunkId?: string;
  storagePath?: string;
  attempts: number;
  nextAttemptAt?: number;
  lastError?: string;
  refusal?: string;
  createdAt: number;
  confirmedAt?: number;
}

export interface Anchor {
  t_ms: number;
  context_time: number | null;
  performance_now: number;
  date_now: number;
  server_offset_ms: number | null;
}

export interface Discontinuity {
  t_ms: number;
  kind: "context_stall" | "clock_change" | "device_lost" | "device_restored";
  wall_gap_ms: number;
  track?: TrackRole;
}

export interface TrackInfo {
  track: TrackRole;
  deviceId: string;
  deviceLabel: string;
  deviceHash: string;
  groupHash: string;
  requestedConstraints: Record<string, unknown>;
  appliedSettings: Record<string, unknown>;
  notHonoured: string[];
  framesCaptured: number;
  framesWritten: number;
  /** Set when the device was lost for good: the track has no audio from here. */
  closedAtFrame?: number;
  /** First seq the server refused for good; chunks from here are not counted. */
  refusedFromSeq?: number;
  refusedReason?: string;
}

export interface MarkerRecord {
  recordingId: string;
  clientMarkerId: string;
  kind: MarkerKind;
  tMs: number;
  label: string | null;
  studentId: string | null;
  sent: boolean;
  refusal?: string;
  attempts: number;
}

export type MarkerKind =
  | "roll_call_start" | "roll_call_end" | "activity" | "student_name" | "note" | "gap" | "device_change";

/** The local copy of one recording (IndexedDB `recordings`). */
export interface LocalRecording {
  id: string;
  classId: string;
  sessionId: string;
  format: RecorderFormat;
  chunkMs: number;
  sampleRate: number;
  purpose: "lesson" | "evaluation";
  serverStatus: ServerStatus;
  /** Local phase, which is ahead of the server while requests are queued. */
  phase: "armed" | "capturing" | "stopped" | "finalized" | "complete" | "abandoned";
  scheduledStart: string;
  scheduledEnd: string;
  captureOpensAt: string;
  captureClosesAt: string;
  sessionDate: string;
  minBytesPerSec: number;
  clockToleranceMs: number;
  maxDurationMs: number;
  startedAtServer?: string;
  clientStartedAt?: string;
  clientEndedAt?: string;
  stopReason?: StopReason;
  /** The stop transition still has to reach the server. */
  stopPending?: boolean;
  serverOffsetAtStart?: number | null;
  serverOffsetAtEnd?: number | null;
  tracks: TrackInfo[];
  anchors: Anchor[];
  discontinuities: Discontinuity[];
  deviceProfileId?: string | null;
  installId: string;
  appVersion: string;
  userAgent: string;
  manifestSha256?: string;
  stopRequested?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** The server row as the engine reads it back. */
export interface ServerRecording {
  id: string;
  class_id: string;
  session_id: string | null;
  armed_session_id: string;
  session_date: string;
  scheduled_start: string;
  scheduled_end: string;
  capture_opens_at: string;
  capture_closes_at: string;
  status: ServerStatus;
  format: RecorderFormat;
  chunk_ms: number;
  max_duration_ms: number;
  min_bytes_per_sec: number;
  clock_tolerance_ms: number;
  purpose: "lesson" | "evaluation";
  started_at: string | null;
  ended_at: string | null;
  stop_reason: string | null;
  stop_requested_at: string | null;
  manifest_path: string | null;
  manifest_sha256: string | null;
  abandon_reason?: string | null;
}

/** A lesson from `public.sessions` (Hanoi wall-clock). */
export interface ScheduleEntry {
  sessionId: string;
  classId: string;
  className?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM[:SS]
  endTime: string;
  status?: string;
}
