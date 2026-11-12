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
  | "stalled"     // C2 revision (B1): capturing, but NO audio is arriving; the engine is trying to restart it
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
  /** Main-thread milliseconds the encoder took (measurement). */
  encodeMs?: number;
  /** When the server registered it (server time, on the engine's monotonic clock). */
  registeredAt?: number;
  /**
   * Ruling (a): the server stored it but flagged it below the format's byte
   * floor (digital silence / a dead microphone). Never evidence.
   */
  belowFloor?: boolean;
  /**
   * Registered later than its capture + tolerance (revision 2): it is still
   * uploaded and stored, but the server does not count it as evidence. The
   * server's own flag when it returns one, else the page's estimate.
   */
  late?: boolean;
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
  /**
   * context_stall: audio stopped arriving for wall_gap_ms (the timeline is NOT padded).
   * clock_change: the laptop's wall clock jumped by wall_gap_ms (timing does not use it).
   * local_store_failed: the browser would not store this track's chunk at t_ms; the track ends there.
   * pre_start_trimmed: the server stamped its start wall_gap_ms after the page asked; that audio is not part of the recording.
   */
  kind: "context_stall" | "clock_change" | "device_lost" | "device_restored" | "local_store_failed" | "pre_start_trimmed" | "pre_start";
  wall_gap_ms: number;
  /** context_stall: how much of the gap was filled with silence (C2 round 3, N-M2). pre_start: wall_gap_ms is the audio before the server's Start. */
  padded_ms?: number;
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
  /**
   * C2 revision (M1): the signed-in user who recorded it. Another user's
   * engine never uploads, stops, lists or deletes it. (A row without one is
   * treated as someone else's.)
   */
  ownerUserId?: string;
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
  /** Revision 2 (late_after_ms, snapshot at arming). */
  lateAfterMs?: number;
  startedAtServer?: string;
  /** C2 round 3 (N-B1): the server's time at the first captured sample (t = 0 of the chunks). */
  firstSampleServer?: number;
  /** Audio captured before the server stamped its start (ms), and whether the server has been told. */
  preStartMs?: number;
  preStartAcked?: boolean;
  clientStartedAt?: string;
  clientEndedAt?: string;
  stopReason?: StopReason;
  /** The stop transition still has to reach the server. */
  stopPending?: boolean;
  /** The server refused the stop for good (window closed, not yours...). Cleared by recover(). */
  stopRefused?: string;
  /** C2 revision (B4): Stop attempts that failed transiently, and when to try again (server time). */
  stopAttempts?: number;
  stopNextAt?: number;
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
  /** Revision 2: why the server asked the recording to stop. */
  stop_request_reason?: string | null;
  /** Revision 2: a chunk registered later than its end + this does not count (default 10 min). */
  late_after_ms?: number;
  manifest_path: string | null;
  manifest_sha256: string | null;
  abandon_reason?: string | null;
  /** C2 round 3: the audio before the server's start (ms) on the chunks' timeline. */
  pre_start_ms?: number;
  /** Who recorded it (adopting an old engine's rows, N-M4). */
  started_by?: string;
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
