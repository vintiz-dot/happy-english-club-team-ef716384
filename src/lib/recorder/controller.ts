// The recorder: session control on top of the pieces. One instance per page.
//
// Life of a recording (server states in capitals):
//   arm(entry)        INSERT class_recordings -> ARMED (the server checked consent, switch, teacher, window)
//   window opens      open both mics, t0 = current frame, UPDATE status -> RECORDING (server stamps started_at)
//                     tracks described, chunks stream into IndexedDB and up to storage
//   stop / end+grace  capture stops, final partial chunks stored, UPDATE -> UPLOADING (server stamps ended_at)
//   all confirmed     track counts, manifest.json uploaded + read back, UPDATE -> COMPLETE
//   then              local bytes of confirmed chunks deleted - and only then
//
// Timers: decisions are taken in tick(), which runs on the worklet's ticks
// (audio thread: not throttled in a background tab) AND on a 1 s interval as a
// fallback, AND on visibilitychange / online. "Now" is the laptop's clock
// corrected by the measured server offset; the server re-checks every window
// on its own clock anyway.

import type { ChunkMeta, LocalRecording, MarkerKind, MarkerRecord, RecorderFormat, RecorderState, ScheduleEntry, ServerRecording, StopReason, TrackInfo, TrackRole } from "./types";
import type { RecorderBackend } from "./backend";
import type { RecorderStore } from "./store";
import type { CaptureSource, TrackOpen } from "./captureSource";
import type { PcmBatch } from "./audioGraph";
import type { OpusBlob } from "./opusPipeline";
import { Emitter, type Listener, type RecorderEvents } from "./events";
import { RecorderError, toRecorderError } from "./errors";
import { Chunker, type RawChunk, type RawSegment } from "./chunker";
import { encodePcmChunk } from "./encoders";
import { sha256Hex, randomUuid } from "./hash";
import { floatToInt16, frameToMs, framesPerChunk, manifestPath, FORMAT_EXT, FORMAT_MIME } from "./chunkMath";
import { Uploader, type UploadProgress } from "./uploader";
import { buildManifest, countedChunks, manifestBytes, trackCounts } from "./manifest";
import { HealthMonitor } from "./health";
import { clockOffset, CLOCK_WARN_MS, plan, type WindowSettings, DEFAULT_WINDOW } from "./schedule";
import { resolveProfile, type DeviceProfile } from "./devices";

export interface RecorderOptions {
  backend: RecorderBackend;
  store: RecorderStore;
  /** Made inside the teacher's click (prepare). */
  source: CaptureSource;
  userId: string;
  installId: string;
  profile: DeviceProfile | null;
  format?: RecorderFormat;
  chunkMs?: number;
  appVersion?: string;
  userAgent?: string;
  /** Laptop clock (tests inject). */
  now?: () => number;
  /** Monotonic wall time for stall detection (default performance.now; tests inject). */
  perfNow?: () => number;
  /** Start/stop the 1 s fallback interval (tests may drive tick() themselves). */
  autoTick?: boolean;
  window?: WindowSettings;
  /** Warn below this much free browser storage (default 4 GB). */
  storageWarnBytes?: number;
  /** Refuse to arm below this (default 2 GB, C1-architecture 1.3). */
  storageRefuseBytes?: number;
  /** How long to try to get a lost microphone back before the track is closed. */
  deviceRetryMs?: number;
  deviceRetryEveryMs?: number;
  /** Cross-tab single-uploader lock; default navigator.locks when present. */
  useLocks?: boolean;
}

interface Active {
  rec: LocalRecording;
  chunker: Chunker | null;
  capturing: boolean;
  startSentAt: number | null;
  startInFlight: boolean;
  stopAt: number;
  lostSince: Partial<Record<TrackRole, number>>;
  lastReopenTry: Partial<Record<TrackRole, number>>;
  opusSeqStartFrame: number;
}

const ms = (iso: string) => Date.parse(iso);
/** The scheduled stop is sent this long before capture_closes_at, so it lands inside the window. */
export const STOP_MARGIN_MS = 5000;

export class Recorder {
  readonly events = new Emitter();
  private o: Required<Omit<RecorderOptions, "profile">> & { profile: DeviceProfile | null };
  private uploader: Uploader;
  private _state: RecorderState = "idle";
  private active: Active | null = null;
  private offsetMs: number | null = null;
  private lastOffsetAt = 0;
  private lastServerPoll = 0;
  private lastStorageCheck = 0;
  private lastUploadKick = 0;
  private interval: any = null;
  private work: Promise<unknown> = Promise.resolve();
  /** Chunk storing runs on its own queue, so a control step can wait for it. */
  private io: Promise<unknown> = Promise.resolve();
  private pageWatched = false;
  private lastBeginTry = 0;
  private health: HealthMonitor;
  private lastLevelAt = 0;
  private wakeLock: any = null;
  private backupDir: any = null;
  private lockRelease: (() => void) | null = null;
  private driving = new Map<string, Promise<void>>();
  private driveAgain = new Set<string>();
  private lastTickPerf = 0;
  private lastTickCtx = 0;
  private disposed = false;

  constructor(opts: RecorderOptions) {
    this.o = {
      format: "flac", chunkMs: 30000, appVersion: "dev", userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "node",
      now: () => Date.now(), perfNow: () => performance.now(), autoTick: true, window: DEFAULT_WINDOW, storageWarnBytes: 4 * 1024 ** 3, storageRefuseBytes: 2 * 1024 ** 3,
      deviceRetryMs: 60000, deviceRetryEveryMs: 2000, useLocks: true, ...opts,
    } as any;
    this.uploader = new Uploader(this.o.store, this.o.backend, {
      now: this.o.now,
      onChunk: (c) => this.events.emit("chunk", c),
      onError: (e) => this.events.emit("error", e),
    });
    this.health = new HealthMonitor({ sampleRate: this.o.source.sampleRate });
    this.o.source.onBatch = (b) => this.onBatch(b);
    this.o.source.onTick = (f, t) => this.onAudioTick(f, t);
    this.o.source.onTrackEnded = (r) => this.onTrackEnded(r);
  }

  // ------------------------------------------------------------ public

  get state(): RecorderState { return this._state; }
  get recordingId(): string | null { return this.active?.rec.id ?? null; }
  /** Laptop clock corrected by the server offset. */
  serverNow(): number { return this.o.now() + (this.offsetMs ?? 0); }
  get serverOffsetMs(): number | null { return this.offsetMs; }

  on<K extends keyof RecorderEvents>(k: K, fn: Listener<K>) { return this.events.on(k, fn); }

  /**
   * "Ready for today". Call from the teacher's click: resumes the AudioContext,
   * asks for persistent storage, takes the one-uploader lock, measures the
   * server clock and resolves both microphones (without opening them).
   */
  async prepare(): Promise<{ contextRunning: boolean; devices: ReturnType<typeof resolveProfile>; offsetMs: number | null }> {
    const running = await this.o.source.resume();
    if (!running) this.events.emit("error", new RecorderError("audio_context_suspended", "Click Ready to let the recorder use audio"));
    await this.takeLock();
    await this.checkStorage(true);
    await this.measureClock();
    const devices = resolveProfile(this.o.profile, await this.o.source.listDevices());
    if (this.o.autoTick && !this.interval) this.interval = setInterval(() => this.tick(), 1000);
    this.watchPage();
    if (this._state === "idle") this.setState("ready");
    return { contextRunning: running, devices, offsetMs: this.offsetMs };
  }

  setProfile(p: DeviceProfile | null) { this.o.profile = p; }

  /**
   * Arm a lesson: INSERT the row (the server decides everything that matters).
   * Re-uses this browser's own armed row for the same session (after a reload).
   * `stopAt` lets the scheduler apply the back-to-back rule.
   */
  async arm(entry: ScheduleEntry, opts: { stopAt?: number; purpose?: "lesson" | "evaluation" } = {}): Promise<ServerRecording> {
    if (this.active && this.active.rec.phase !== "complete" && this.active.rec.phase !== "abandoned" && this.active.capturing)
      throw new RecorderError("internal", "A recording is already running");
    if (this.offsetMs === null) await this.measureClock();
    if (this.offsetMs === null) throw new RecorderError("clock_unknown", "The server's time could not be read: the lesson is not armed");
    const st = await this.checkStorage(true);
    if (st && st.free < this.o.storageRefuseBytes)
      throw new RecorderError("storage_low", `Not armed: only ${Math.round(st.free / 1e6)} MB of browser storage is free (a lesson needs up to about 700 MB)`, { detail: st });
    const local = (await this.o.store.listRecordings()).find((r) => r.sessionId === entry.sessionId && r.phase === "armed");
    let row: ServerRecording | null = null;
    if (local) {
      row = await this.o.backend.getRecording(local.id).catch(() => null);
      if (row && row.status !== "armed") row = null;
    }
    if (!row) {
      row = await this.o.backend.arm({
        session_id: entry.sessionId, format: this.o.format, chunk_ms: this.o.chunkMs, purpose: opts.purpose ?? "lesson",
        device_profile_id: this.o.profile?.serverId ?? null,
        client_info: { app_version: this.o.appVersion, user_agent: this.o.userAgent, install_id: this.o.installId, format: this.o.format },
      });
    }
    const rec = local && local.id === row.id ? local : this.newLocal(row);
    rec.serverStatus = row.status;
    await this.saveRec(rec);
    const planned = plan(entry, this.o.window);
    this.active = {
      rec, chunker: null, capturing: false, startSentAt: null, startInFlight: false,
      // Stop INSIDE the window (revision 2 refuses a later Stop): a margin
      // for the request's own travel time.
      stopAt: Math.min(opts.stopAt ?? Infinity, ms(row.capture_closes_at) - STOP_MARGIN_MS),
      lostSince: {}, lastReopenTry: {}, opusSeqStartFrame: 0,
    };
    void planned;
    this.setState("armed");
    await this.acquireWakeLock();
    this.tick();
    return row;
  }

  /** Move the planned stop ("Keep recording"), never past the server's hard limit. */
  extend(untilMs: number) {
    if (!this.active) return;
    this.active.stopAt = Math.min(untilMs, ms(this.active.rec.captureClosesAt) - STOP_MARGIN_MS);
  }

  /** Stop now. Stopping never needs permission. */
  async stop(reason: StopReason = "manual"): Promise<void> {
    const a = this.active;
    if (!a) return;
    if (!a.capturing) {
      if (a.rec.phase === "armed") {
        // Armed, nothing recorded: give the row up.
        await this.o.backend.abandon(a.rec.id, reason === "manual" ? "stopped before the lesson" : reason).catch((e) => this.events.emit("error", toRecorderError(e)));
        a.rec.phase = "abandoned"; a.rec.serverStatus = "abandoned";
        await this.saveRec(a.rec);
        this.setState("abandoned");
        this.releaseWakeLock();
      }
      return;
    }
    await this.endCapture(reason);
  }

  /** A marker on the recording's own timeline (roll call, activity, a child's name chip...). */
  async marker(kind: MarkerKind, opts: { label?: string | null; studentId?: string | null; tMs?: number } = {}): Promise<MarkerRecord> {
    const a = this.active;
    if (!a || !a.rec.startedAtServer || !a.chunker) throw new RecorderError("internal", "Markers can be added while recording");
    const m: MarkerRecord = {
      recordingId: a.rec.id, clientMarkerId: randomUuid(), kind,
      tMs: opts.tMs ?? frameToMs(a.chunker.position, a.rec.sampleRate),
      label: opts.label ?? null, studentId: kind === "student_name" ? (opts.studentId ?? null) : null,
      sent: false, attempts: 0,
    };
    await this.o.store.putMarker(m);
    void this.drive(a.rec.id);
    return m;
  }

  /** Swap measurement so far (the UI asks the teacher; it never swaps by itself). */
  swapMeasurement() { return this.health.swapMeasurement(); }

  /**
   * On page load: find unfinished recordings in IndexedDB and carry on. A
   * recording that was capturing when the tab died is finished from its
   * stored chunks and 5-second segments, as `crash_recovered`.
   */
  async recover(): Promise<string[]> {
    await this.takeLock();
    const ids: string[] = [];
    for (const rec of await this.o.store.listRecordings()) {
      if (rec.phase === "complete") continue;
      if (rec.phase === "capturing" && this.active?.rec.id !== rec.id) {
        await this.salvage(rec);
        rec.phase = "stopped"; rec.stopReason = "crash_recovered"; rec.stopPending = true;
        rec.clientEndedAt = new Date(this.o.now()).toISOString();
        rec.updatedAt = this.o.now();
        await this.saveRec(rec);
      }
      if (rec.phase === "armed") {
        const row = await this.o.backend.getRecording(rec.id).catch(() => null);
        if (row && row.status === "armed" && this.serverNow() < ms(row.capture_closes_at)) { ids.push(rec.id); continue; } // arm() picks it up again
        // Armed and the window is over, or the tab died between the start
        // request and saving its answer (the row is `recording` with nothing
        // stored here): give the row up rather than leave it open for 14 days.
        let abandoned = false;
        if (row && (row.status === "armed" || row.status === "recording")) {
          abandoned = !!(await this.o.backend.abandon(rec.id, row.status === "armed" ? "never started" : "the tab closed before any audio was saved").catch(() => null));
        }
        rec.phase = "abandoned"; rec.serverStatus = abandoned ? "abandoned" : (row?.status ?? rec.serverStatus);
        await this.saveRec(rec);
        continue;
      }
      if (rec.phase === "stopped" || rec.phase === "finalized") { ids.push(rec.id); void this.drive(rec.id); }
    }
    this.events.emit("recovered", { recordingIds: ids });
    return ids;
  }

  /** Upload and finish everything that can be finished now. Safe to call any time. */
  drive(recordingId: string): Promise<void> {
    const have = this.driving.get(recordingId);
    if (have) { this.driveAgain.add(recordingId); return have; }
    const p = this.driveOnce(recordingId).finally(() => {
      this.driving.delete(recordingId);
      // Something arrived while that pass ran (a new chunk): one more pass.
      if (this.driveAgain.delete(recordingId)) void this.drive(recordingId);
    });
    this.driving.set(recordingId, p);
    return p;
  }

  private async driveOnce(recordingId: string): Promise<void> {
    try {
      let rec = await this.o.store.getRecording(recordingId);
      if (!rec) return;
      if (rec.stopPending && !rec.stopRefused) {
        try {
          const row = await this.o.backend.stop(rec.id, rec.stopReason ?? "manual", rec.clientEndedAt ?? new Date(this.o.now()).toISOString());
          rec.serverStatus = row.status; rec.stopPending = false;
          // Revision 2: a Stop after capture_closes_at + late_after leaves the
          // row ABANDONED. Read back what the server did and say so.
          if (row.status === "abandoned") {
            rec.phase = "abandoned";
            this.events.emit("error", new RecorderError("server_refused", `The server did not accept this Stop: ${row.abandon_reason ?? "stopped after the lesson window"}. The audio is kept on this laptop.`, { refusal: "stopped_after_window" }));
            if (this.active?.rec.id === rec.id) this.setState("abandoned");
          }
          await this.saveRec(rec);
        } catch (e) {
          const err = toRecorderError(e);
          if (err.code !== "offline") {
            // Revision 2: a Stop outside the window is refused (or the server
            // abandons the recording) - not clamped. Read what the server now
            // says and report exactly that; never pretend it stopped.
            const row = await this.o.backend.getRecording(rec.id).catch(() => null);
            if (row && row.status !== "recording") {
              rec.serverStatus = row.status; rec.stopPending = false;
              if (row.status === "abandoned" || row.status === "deleted") rec.phase = "abandoned";
            } else if (!err.retryable) {
              rec.stopRefused = err.message;
            }
            await this.saveRec(rec);
            if (rec.phase === "abandoned" && this.active?.rec.id === rec.id) this.setState("abandoned");
          }
          this.events.emit("error", err);
        }
      }
      rec = (await this.o.store.getRecording(recordingId))!;
      await this.sendMarkers(rec);
      const p = await this.uploader.run(recordingId);
      this.events.emit("upload", p);
      if (p.halted === "recording_closed") {
        const row = await this.o.backend.getRecording(rec.id).catch(() => null);
        if (row && (row.status === "abandoned" || row.status === "deleted")) {
          rec.serverStatus = row.status; rec.phase = "abandoned";
          await this.saveRec(rec);
          if (this.active?.rec.id === rec.id) this.setState("abandoned");
        }
      }
      rec = (await this.o.store.getRecording(recordingId))!;
      if ((rec.phase === "stopped" || rec.phase === "finalized") && !rec.stopPending && rec.serverStatus === "uploading" && p.pending === 0 && !p.offline) {
        await this.finalize(rec);
      }
    } catch (e) {
      this.events.emit("error", toRecorderError(e));
    }
  }

  /** Local backup to a folder (File System Access API). Call from a click. */
  async enableLocalBackup(): Promise<boolean> {
    const pick = (globalThis as any).showDirectoryPicker;
    if (typeof pick !== "function") { this.events.emit("backup", { status: "failed", detail: "This browser cannot write to a folder" }); return false; }
    try {
      this.backupDir = await pick({ id: "hec-recorder", mode: "readwrite" });
      this.events.emit("backup", { status: "on" });
      return true;
    } catch (e) {
      this.events.emit("backup", { status: "failed", detail: String((e as any)?.message ?? e) });
      return false;
    }
  }

  /**
   * The teacher's typed "Discard" for a recording that cannot finish
   * (abandoned, refused). `confirmation` must be the word DISCARD.
   */
  async discardLocal(recordingId: string, confirmation: string): Promise<void> {
    if (confirmation !== "DISCARD") throw new RecorderError("internal", "Type DISCARD to throw away audio that the server does not have");
    const rec = await this.o.store.getRecording(recordingId);
    if (rec && rec.phase !== "abandoned" && rec.phase !== "complete") throw new RecorderError("internal", "Only a finished or abandoned recording can be discarded");
    await this.o.store.purgeRecording(recordingId, { allowUnconfirmed: true });
  }

  async uploadProgress(recordingId: string): Promise<UploadProgress> { return this.uploader.progress(recordingId); }

  /** Resolves when queued control steps and chunk writes have run (tests; a "Saving..." spinner). */
  async settle(): Promise<void> {
    for (let i = 0; i < 8; i++) {
      await this.work; await this.io;
      await Promise.all([...this.driving.values()]);
    }
  }

  /** The local copy of the current recording (for the UI's details panel). */
  async current(): Promise<LocalRecording | null> {
    return this.active ? ((await this.o.store.getRecording(this.active.rec.id)) ?? null) : null;
  }

  async dispose() {
    this.disposed = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.releaseWakeLock();
    this.lockRelease?.();
    this.o.source.onBatch = null; this.o.source.onTick = null; this.o.source.onTrackEnded = null;
  }

  // ------------------------------------------------------------ heartbeat

  private onAudioTick(_frame: number, ctxTime: number) {
    // Context stall detection (sleep / lid): performance.now ran on, the context did not.
    const perf = this.o.perfNow();
    if (this.active?.capturing && this.lastTickPerf) {
      const wall = perf - this.lastTickPerf, audio = (ctxTime - this.lastTickCtx) * 1000;
      if (wall - audio > 1000) {
        const tMs = this.active.chunker ? frameToMs(this.active.chunker.position, this.active.rec.sampleRate) : 0;
        this.active.rec.discontinuities.push({ t_ms: tMs, kind: "context_stall", wall_gap_ms: Math.round(wall - audio) });
        void this.queueMarker("gap", `context stalled ${Math.round((wall - audio) / 1000)} s`);
      }
    }
    this.lastTickPerf = perf; this.lastTickCtx = ctxTime;
    this.tick();
  }

  /** Every decision that depends on time. Cheap; called often. */
  tick(): void {
    if (this.disposed) return;
    const a = this.active;
    const now = this.serverNow();
    const lap = this.o.now();
    if (lap - this.lastOffsetAt > 10 * 60000) void this.measureClock();
    if (lap - this.lastStorageCheck > 60000) void this.checkStorage(false);
    if (a) {
      const rec = a.rec;
      if (rec.phase === "armed" && !a.capturing && now >= ms(rec.captureOpensAt) && now < ms(rec.captureClosesAt) && lap - this.lastBeginTry > 2000) {
        this.lastBeginTry = lap;
        this.serial(() => this.beginCapture());
      }
      if (a.capturing && a.rec.startedAtServer && now >= a.stopAt) {
        this.serial(() => this.endCapture("scheduled_end"));
      }
      if (a.capturing && !a.rec.startedAtServer && !a.startInFlight && a.startSentAt !== null && lap - a.startSentAt > 2000) {
        this.serial(() => this.sendStart());
      }
      if (a.capturing) this.retryLostDevices();
      if ((rec.phase === "armed" || a.capturing) && lap - this.lastServerPoll > 60000) {
        this.lastServerPoll = lap;
        void this.pollServer();
      }
      if (rec.phase === "armed" && now >= ms(rec.captureClosesAt)) this.serial(() => this.stop("manual"));
    }
    if (lap - this.lastUploadKick > 5000) {
      this.lastUploadKick = lap;
      void this.kickUploads();
    }
  }

  private serial(fn: () => Promise<unknown>) {
    this.work = this.work.then(fn).catch((e) => this.events.emit("error", toRecorderError(e)));
  }

  private async kickUploads() {
    for (const rec of await this.o.store.listRecordings()) {
      if (rec.phase === "capturing" && rec.startedAtServer || rec.phase === "stopped" || rec.phase === "finalized") void this.drive(rec.id);
    }
  }

  // ------------------------------------------------------------ capture

  private newLocal(row: ServerRecording): LocalRecording {
    return {
      id: row.id, classId: row.class_id, sessionId: row.session_id ?? row.armed_session_id, format: row.format, chunkMs: row.chunk_ms,
      sampleRate: this.o.source.sampleRate, purpose: row.purpose, serverStatus: row.status, phase: "armed",
      scheduledStart: row.scheduled_start, scheduledEnd: row.scheduled_end, captureOpensAt: row.capture_opens_at,
      captureClosesAt: row.capture_closes_at, sessionDate: row.session_date, minBytesPerSec: row.min_bytes_per_sec,
      clockToleranceMs: row.clock_tolerance_ms, maxDurationMs: row.max_duration_ms, lateAfterMs: row.late_after_ms ?? 600000,
      tracks: [], anchors: [], discontinuities: [], deviceProfileId: this.o.profile?.serverId ?? null,
      installId: this.o.installId, appVersion: this.o.appVersion, userAgent: this.o.userAgent,
      createdAt: this.o.now(), updatedAt: this.o.now(),
    };
  }

  private async beginCapture() {
    const a = this.active;
    if (!a || a.capturing || a.rec.phase !== "armed") return;
    const devices = resolveProfile(this.o.profile, await this.o.source.listDevices());
    if (devices.status !== "ok") {
      const code = devices.status === "same_device" ? "same_device_twice" : devices.status === "ambiguous" ? "device_ambiguous" : "device_missing";
      this.events.emit("error", new RecorderError(code, "Run the microphone check: the saved microphones were not found", { detail: devices }));
      return; // tick() tries again; never falls back to another microphone
    }
    let opened: Record<TrackRole, TrackOpen>;
    try {
      opened = await this.o.source.openTracks({ teacher: devices.teacher.deviceId, room: devices.room.deviceId });
    } catch (e) {
      this.events.emit("error", toRecorderError(e));
      return;
    }
    const rec = a.rec;
    rec.tracks = [];
    for (const t of ["teacher", "room"] as TrackRole[]) {
      const o = opened[t];
      const info: TrackInfo = {
        track: t, deviceId: o.deviceId, deviceLabel: o.label, deviceHash: await sha256Hex(o.deviceId), groupHash: await sha256Hex(o.groupId || ""),
        requestedConstraints: o.requested, appliedSettings: o.applied, notHonoured: o.notHonoured, framesCaptured: 0, framesWritten: 0,
      };
      rec.tracks.push(info);
      this.events.emit("constraints", { track: t, requested: o.requested, applied: o.applied, notHonoured: o.notHonoured });
      if (o.notHonoured.some((x) => !x.startsWith("channelCount")))
        this.events.emit("error", new RecorderError("constraint_not_honoured", `The browser kept processing on for the ${t} microphone: ${o.notHonoured.join(", ")}`, { detail: o.notHonoured }));
    }
    a.chunker = new Chunker(rec.sampleRate, rec.chunkMs, (c) => this.onRawChunk(c), rec.format === "opus-webm" ? undefined : (s) => this.onSegment(s));
    a.capturing = true;
    this.health.resetSwap();
    this.o.source.forward(true);
    this.setState("starting");
    await this.sendStart();
  }

  /** t0 = the frame at the moment the start is SENT; the server's started_at is stamped when it arrives. */
  private async sendStart() {
    const a = this.active;
    if (!a || !a.capturing || a.rec.startedAtServer || a.startInFlight) return;
    a.startInFlight = true;
    const chunker = a.chunker!;
    chunker.reset();
    chunker.setT0(this.o.source.lastFrame);
    a.startSentAt = this.o.now();
    const ts = this.o.source.timestamp();
    const clientIso = new Date(this.o.now()).toISOString();
    try {
      const row = await this.o.backend.start(a.rec.id, clientIso);
      a.rec.startedAtServer = row.started_at!;
      a.rec.clientStartedAt = clientIso;
      a.rec.serverStatus = row.status;
      a.rec.phase = "capturing";
      a.rec.serverOffsetAtStart = this.offsetMs;
      a.rec.anchors.push({ t_ms: 0, context_time: ts.contextTime, performance_now: ts.performanceNow, date_now: this.o.now(), server_offset_ms: this.offsetMs });
      a.stopAt = Math.min(a.stopAt, ms(row.capture_closes_at) - STOP_MARGIN_MS);
      if (row.format === "opus-webm" && this.o.source.startOpus) {
        a.opusSeqStartFrame = chunker.t0Frame ?? 0;
        this.o.source.startOpus(a.rec.chunkMs, (b) => this.onOpusBlob(b));
      }
      await this.saveRec(a.rec);
      for (const t of a.rec.tracks) {
        await this.o.backend.ensureTrack({
          recording_id: a.rec.id, track: t.track, device_label: t.deviceLabel, device_hash: t.deviceHash, sample_rate: a.rec.sampleRate,
          channel_count: 1, codec: a.rec.format === "opus-webm" ? "opus" : a.rec.format === "flac" ? "flac" : "pcm_s16le",
          bitrate: a.rec.format === "opus-webm" ? 128000 : null, applied_settings: { ...t.appliedSettings, not_honoured: t.notHonoured },
        }).catch((e) => this.events.emit("error", toRecorderError(e)));
      }
      this.setState("recording");
    } catch (e) {
      const err = toRecorderError(e);
      this.events.emit("error", err);
      if (err.code === "offline" || err.refusal === "too_early" || err.retryable) {
        chunker.reset(); // retried from tick() with a fresh t0
      } else {
        // The server will not take this recording (window closed, switched off...).
        a.capturing = false;
        this.o.source.forward(false);
        this.o.source.closeTracks();
        chunker.reset();
        if (err.refusal === "window_closed") await this.o.backend.abandon(a.rec.id, "the window closed before capture started").catch(() => null);
        a.rec.phase = "abandoned"; a.rec.serverStatus = "abandoned";
        await this.saveRec(a.rec);
        this.setState("abandoned");
        this.releaseWakeLock();
      }
    } finally {
      a.startInFlight = false;
    }
  }

  private onBatch(b: PcmBatch) {
    const a = this.active;
    const n = b.teacher.length;
    const tMs = a?.chunker ? frameToMs(a.chunker.position, this.o.source.sampleRate) : 0;
    const events = this.health.push(b.teacher, b.room, tMs);
    for (const e of events) this.events.emit("health", e);
    const perf = performance.now();
    if (perf - this.lastLevelAt > 100) { this.lastLevelAt = perf; this.events.emit("level", { teacher: this.health.last.teacher, room: this.health.last.room, tMs }); }
    if (!a || !a.capturing || !a.chunker || a.rec.format === "opus-webm") {
      if (a?.chunker && a.rec.format === "opus-webm") a.chunker.push(b.frame, new Int16Array(n), new Int16Array(n)); // position only
      return;
    }
    const t16 = new Int16Array(n), r16 = new Int16Array(n);
    floatToInt16(b.teacher, t16);
    floatToInt16(b.room, r16);
    a.chunker.push(b.frame, t16, r16);
    for (const t of a.rec.tracks) t.framesCaptured = a.chunker.captured[t.track];
  }

  private onSegment(s: RawSegment) {
    const a = this.active;
    if (!a || !a.rec.startedAtServer) return;
    const id = a.rec.id;
    this.chain(() => this.o.store.putSegment({ recordingId: id, track: s.track, seq: s.seq, index: s.index, startFrame: s.startFrame, samples: s.samples }));
  }

  private onRawChunk(c: RawChunk) {
    const a = this.active;
    if (!a || !a.rec.startedAtServer || a.rec.format === "opus-webm") return;
    const rec = a.rec;
    const enc = encodePcmChunk(rec.format, c.samples, rec.sampleRate, rec.minBytesPerSec);
    const startFrame = c.startFrame, endFrame = c.startFrame + c.samples.length;
    const ts = this.o.source.timestamp();
    rec.anchors.push({ t_ms: frameToMs(endFrame, rec.sampleRate), context_time: ts.contextTime, performance_now: ts.performanceNow, date_now: this.o.now(), server_offset_ms: this.offsetMs });
    this.chain(async () => {
      const meta: ChunkMeta = {
        recordingId: rec.id, track: c.track, seq: c.seq, startFrame, endFrame, sampleRate: rec.sampleRate,
        tStartMs: frameToMs(startFrame, rec.sampleRate), tEndMs: frameToMs(endFrame, rec.sampleRate),
        byteSize: enc.bytes.length, sha256: await sha256Hex(enc.bytes), mime: enc.mime, ext: enc.ext, encoding: enc.encoding,
        state: "captured", attempts: 0, createdAt: this.o.now(), encodeMs: Math.round(enc.encodeMs * 10) / 10,
      };
      await this.storeChunk(rec, meta, enc.bytes);
      await this.o.store.deleteSegments(rec.id, c.track, c.seq);
    });
  }

  private onOpusBlob(b: OpusBlob) {
    const a = this.active;
    if (!a || !a.rec.startedAtServer) return;
    const rec = a.rec;
    const F = framesPerChunk(rec.sampleRate, rec.chunkMs);
    const startFrame = b.seq * F;
    // The last blob ends where the context says capture ended; the others are timeslice-long.
    const endFrame = b.final && a.chunker ? Math.max(startFrame + 1, a.chunker.position) : startFrame + F;
    this.chain(async () => {
      const meta: ChunkMeta = {
        recordingId: rec.id, track: b.track, seq: b.seq, startFrame, endFrame, sampleRate: rec.sampleRate,
        tStartMs: frameToMs(startFrame, rec.sampleRate), tEndMs: frameToMs(endFrame, rec.sampleRate),
        byteSize: b.bytes.length, sha256: await sha256Hex(b.bytes), mime: FORMAT_MIME["opus-webm"], ext: FORMAT_EXT["opus-webm"], encoding: "opus",
        state: "captured", attempts: 0, createdAt: this.o.now(),
      };
      await this.storeChunk(rec, meta, b.bytes);
    });
  }

  private async storeChunk(rec: LocalRecording, meta: ChunkMeta, bytes: Uint8Array) {
    for (let attempt = 0; ; attempt++) {
      try { await this.o.store.addChunk(meta, bytes); break; }
      catch (e: any) {
        const err = e?.name === "QuotaExceededError" ? new RecorderError("quota", "The browser refused to store more audio", { detail: e?.message }) : toRecorderError(e);
        this.events.emit("error", err);
        if (attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    const t = rec.tracks.find((x) => x.track === meta.track);
    if (t) t.framesWritten = Math.max(t.framesWritten, meta.endFrame);
    rec.updatedAt = this.o.now();
    await this.saveRec(rec);
    this.events.emit("chunk", meta);
    if (this.backupDir) void this.backup(rec, `${meta.track}/${String(meta.seq).padStart(6, "0")}.${meta.ext}`, bytes);
    void this.drive(rec.id);
  }

  private chain(fn: () => Promise<unknown>) {
    this.io = this.io.then(fn).catch((e) => this.events.emit("error", toRecorderError(e)));
  }

  private async endCapture(reason: StopReason) {
    const a = this.active;
    if (!a || !a.capturing) return;
    this.setState("stopping");
    a.capturing = false;
    if (a.rec.format === "opus-webm") await this.o.source.stopOpus?.();
    this.o.source.forward(false);
    a.chunker?.flush();
    this.o.source.closeTracks();
    await this.io; // every chunk stored
    const rec = a.rec;
    if (!rec.startedAtServer) {
      // The server never saw the start: nothing it would accept was captured.
      await this.o.backend.abandon(rec.id, "stopped before the server saw the start").catch(() => null);
      rec.phase = "abandoned"; rec.serverStatus = "abandoned";
      await this.saveRec(rec);
      this.setState("abandoned");
      this.releaseWakeLock();
      return;
    }
    rec.phase = "stopped";
    rec.stopReason = reason;
    rec.stopPending = true;
    rec.clientEndedAt = new Date(this.o.now()).toISOString();
    rec.serverOffsetAtEnd = this.offsetMs;
    rec.updatedAt = this.o.now();
    await this.saveRec(rec);
    this.releaseWakeLock();
    this.setState("uploading");
    await this.drive(rec.id);
  }

  /** Rebuild the chunk that was in progress when the tab died, from its segments. */
  private async salvage(rec: LocalRecording) {
    const chunks = await this.o.store.listChunks(rec.id);
    const segs = await this.o.store.listSegments(rec.id);
    const F = framesPerChunk(rec.sampleRate, rec.chunkMs);
    for (const t of rec.tracks) {
      const have = new Set(chunks.filter((c) => c.track === t.track).map((c) => c.seq));
      const next = chunks.filter((c) => c.track === t.track).reduce((m, c) => Math.max(m, c.seq + 1), 0);
      const mine = segs.filter((s) => s.track === t.track && s.seq === next && !have.has(s.seq)).sort((a, b) => a.index - b.index);
      const contiguous: typeof mine = [];
      for (const s of mine) { if (s.index !== contiguous.length) break; contiguous.push(s); }
      if (contiguous.length) {
        const total = contiguous.reduce((n, s) => n + s.samples.length, 0);
        const samples = new Int16Array(total);
        let off = 0;
        for (const s of contiguous) { samples.set(s.samples, off); off += s.samples.length; }
        const enc = encodePcmChunk(rec.format, samples, rec.sampleRate, rec.minBytesPerSec);
        const startFrame = next * F, endFrame = startFrame + total;
        const meta: ChunkMeta = {
          recordingId: rec.id, track: t.track, seq: next, startFrame, endFrame, sampleRate: rec.sampleRate,
          tStartMs: frameToMs(startFrame, rec.sampleRate), tEndMs: frameToMs(endFrame, rec.sampleRate),
          byteSize: enc.bytes.length, sha256: await sha256Hex(enc.bytes), mime: enc.mime, ext: enc.ext, encoding: enc.encoding,
          state: "captured", attempts: 0, createdAt: this.o.now(),
        };
        await this.o.store.addChunk(meta, enc.bytes);
        t.framesWritten = Math.max(t.framesWritten, endFrame);
      }
      // Segments of chunks that were stored are leftovers; drop them.
      for (const s of segs.filter((x) => x.track === t.track)) await this.o.store.deleteSegments(rec.id, t.track, s.seq);
      t.framesCaptured = Math.max(t.framesCaptured, t.framesWritten);
    }
    rec.discontinuities.push({ t_ms: Math.max(0, ...rec.tracks.map((t) => frameToMs(t.framesWritten, rec.sampleRate))), kind: "device_lost", wall_gap_ms: 0 });
  }

  // ------------------------------------------------------------ devices

  private onTrackEnded(role: TrackRole) {
    const a = this.active;
    if (!a || !a.capturing) return;
    if (a.lostSince[role] !== undefined) return;
    a.lostSince[role] = this.o.now();
    const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
    a.rec.discontinuities.push({ t_ms: tMs, kind: "device_lost", wall_gap_ms: 0, track: role });
    this.events.emit("health", { kind: "device_unplugged", track: role, tMs });
    this.events.emit("error", new RecorderError("device_unplugged", `The ${role} microphone was unplugged: plug it back in`, { detail: role }));
    void this.queueMarker("device_change", `${role} microphone lost`);
  }

  private retryLostDevices() {
    const a = this.active;
    if (!a) return;
    for (const role of Object.keys(a.lostSince) as TrackRole[]) {
      const since = a.lostSince[role]!;
      const lap = this.o.now();
      if (lap - since > this.o.deviceRetryMs) {
        delete a.lostSince[role];
        a.chunker?.closeTrack(role);
        const info = a.rec.tracks.find((t) => t.track === role);
        if (info) info.closedAtFrame = a.chunker?.position ?? 0;
        const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
        this.events.emit("health", { kind: "device_lost", track: role, tMs });
        this.events.emit("error", new RecorderError("device_lost", `The ${role} microphone did not come back: this lesson continues with one track`));
        void this.queueMarker("device_change", `${role} microphone gone for the rest of the lesson`);
        if (a.chunker?.isClosed("teacher") && a.chunker?.isClosed("room")) this.serial(() => this.endCapture("device_lost"));
        continue;
      }
      if (lap - (a.lastReopenTry[role] ?? 0) < this.o.deviceRetryEveryMs) continue;
      a.lastReopenTry[role] = lap;
      const info = a.rec.tracks.find((t) => t.track === role);
      if (!info) continue;
      void this.o.source.reopen(role, info.deviceId).then((o) => {
        if (a.lostSince[role] === undefined) return;
        delete a.lostSince[role];
        const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
        a.rec.discontinuities.push({ t_ms: tMs, kind: "device_restored", wall_gap_ms: lap - since, track: role });
        info.appliedSettings = o.applied; info.notHonoured = o.notHonoured;
        this.events.emit("health", { kind: "device_restored", track: role, tMs });
        void this.queueMarker("device_change", `${role} microphone back`);
      }).catch(() => { /* still gone; next try in 2 s */ });
    }
  }

  private async queueMarker(kind: MarkerKind, label: string) {
    try { if (this.active?.rec.startedAtServer) await this.marker(kind, { label }); } catch { /* best effort */ }
  }

  private async sendMarkers(rec: LocalRecording) {
    if (!rec.startedAtServer) return;
    for (const m of await this.o.store.listMarkers(rec.id)) {
      if (m.sent || m.refusal) continue;
      try {
        await this.o.backend.insertMarker({ recording_id: m.recordingId, client_marker_id: m.clientMarkerId, kind: m.kind, t_ms: m.tMs, label: m.label, student_id: m.studentId });
        m.sent = true;
      } catch (e) {
        const err = toRecorderError(e);
        if (err.code === "offline") return;
        m.attempts += 1;
        if (err.code === "server_refused" && !err.retryable) m.refusal = err.message;
        this.events.emit("error", err);
      }
      await this.o.store.putMarker(m);
    }
  }

  // ------------------------------------------------------------ finalize

  private async finalize(rec: LocalRecording) {
    if (this.active?.rec.id === rec.id) this.setState("finalizing");
    const chunks = await this.o.store.listChunks(rec.id);
    const markers = await this.o.store.listMarkers(rec.id);
    if (markers.some((m) => !m.sent && !m.refusal)) return; // markers first: the manifest lists them
    for (const t of rec.tracks) {
      const registered = chunks.filter((c) => c.track === t.track && c.chunkId);
      const counted = countedChunks(chunks.filter((c) => c.state === "confirmed"), t.track, t.refusedFromSeq);
      if (registered.length !== counted.length) {
        this.events.emit("error", new RecorderError("server_refused", `The ${t.track} track has chunks the server registered but did not confirm: the recording cannot be completed, and its local copy is kept`, { refusal: "complete_refused" }));
        return;
      }
      await this.o.backend.setTrackCounts(rec.id, t.track, trackCounts(counted));
    }
    let saved = await this.o.store.getManifest(rec.id);
    if (!saved) {
      const bytes = manifestBytes(buildManifest(rec, chunks.filter((c) => c.state === "confirmed" || c.state === "refused"), markers));
      const sha = await sha256Hex(bytes);
      await this.o.store.putManifest(rec.id, bytes, sha);
      saved = { bytes, sha256: sha };
    }
    rec.phase = "finalized"; rec.manifestSha256 = saved.sha256;
    await this.saveRec(rec);
    const path = manifestPath(rec.classId, rec.id);
    await this.o.backend.upload(path, saved.bytes, "application/json");
    const back = await this.o.backend.download(path);
    if ((await sha256Hex(back)) !== saved.sha256) {
      this.events.emit("error", new RecorderError("server_refused", "The stored manifest is not the one this page wrote", { refusal: "readback_mismatch" }));
      return;
    }
    if (this.backupDir) void this.backup(rec, "manifest.json", saved.bytes);
    const row = await this.o.backend.complete(rec.id, path, saved.sha256);
    rec.serverStatus = row.status;
    if (row.status === "complete") {
      rec.phase = "complete";
      await this.saveRec(rec);
      // Only now: the server confirmed every chunk AND the recording is complete.
      await this.o.store.deleteConfirmedBytes(rec.id);
      if (this.active?.rec.id === rec.id) this.setState("complete");
    }
  }

  /**
   * Save the controller's copy of a recording WITHOUT undoing what the
   * uploader wrote meanwhile (a track ended by a permanent refusal): those
   * fields are merged in, never overwritten, and copied back into memory.
   */
  private async saveRec(rec: LocalRecording): Promise<void> {
    const stored = await this.o.store.getRecording(rec.id);
    if (stored) {
      for (const t of rec.tracks) {
        const s = stored.tracks.find((x) => x.track === t.track);
        if (s?.refusedFromSeq !== undefined && (t.refusedFromSeq === undefined || s.refusedFromSeq < t.refusedFromSeq)) {
          t.refusedFromSeq = s.refusedFromSeq; t.refusedReason = s.refusedReason;
        }
      }
    }
    await this.o.store.putRecording(rec);
  }

  // ------------------------------------------------------------ server

  async measureClock(): Promise<number | null> {
    try {
      const sent = this.o.now();
      const iso = await this.o.backend.serverTime();
      const got = this.o.now();
      const { offsetMs, rttMs } = clockOffset(iso, sent, got);
      this.offsetMs = offsetMs;
      this.lastOffsetAt = got;
      this.events.emit("clock", { offsetMs, rttMs, warning: Math.abs(offsetMs) > CLOCK_WARN_MS });
    } catch (e) {
      this.lastOffsetAt = this.o.now() - 9 * 60000; // retry in a minute
      this.events.emit("error", new RecorderError("clock_unknown", "The server's time could not be read", { detail: String((e as any)?.message ?? e) }));
    }
    return this.offsetMs;
  }

  private async pollServer() {
    const a = this.active;
    if (!a) return;
    const row = await this.o.backend.getRecording(a.rec.id).catch(() => null);
    if (!row) return;
    if (row.status === "abandoned" && (a.rec.phase === "armed" || a.capturing)) {
      // Switched off / consent withdrawn while armed: nothing was recorded.
      if (a.capturing) await this.endCapture("switch_off");
      a.rec.phase = "abandoned"; a.rec.serverStatus = "abandoned";
      await this.saveRec(a.rec);
      this.setState("abandoned");
      this.releaseWakeLock();
      return;
    }
    if (row.stop_requested_at && a.capturing && !a.rec.stopRequested) {
      a.rec.stopRequested = true;
      // Revision 2: the server says why (stop_request_reason); only that reason is accepted.
      let reason: "session_canceled" | "switch_off";
      if (row.stop_request_reason === "session_canceled" || row.stop_request_reason === "switch_off") reason = row.stop_request_reason;
      else {
        const st = a.rec.sessionId ? await this.o.backend.sessionStatus(a.rec.sessionId).catch(() => null) : null;
        reason = st === "Canceled" ? "session_canceled" : "switch_off";
      }
      this.events.emit("stop_requested", { recordingId: a.rec.id, reason });
      this.serial(() => this.endCapture(reason));
    }
  }

  private async checkStorage(force: boolean): Promise<{ usage: number; quota: number; free: number } | null> {
    this.lastStorageCheck = this.o.now();
    const sm = typeof navigator !== "undefined" ? (navigator as any).storage : null;
    if (!sm?.estimate) return null;
    try {
      const persisted = force && sm.persist ? await sm.persist().catch(() => null) : (sm.persisted ? await sm.persisted().catch(() => null) : null);
      const { usage = 0, quota = 0 } = await sm.estimate();
      const free = quota - usage;
      const warning = free < this.o.storageWarnBytes;
      this.events.emit("storage", { usage, quota, free, persisted, warning });
      if (warning) this.events.emit("error", new RecorderError("storage_low", `Only ${Math.round(free / 1e6)} MB of browser storage is free`, { detail: { usage, quota } }));
      return { usage, quota, free };
    } catch { return null; }
  }

  private async takeLock() {
    if (this.lockRelease || !this.o.useLocks) return;
    const locks = typeof navigator !== "undefined" ? (navigator as any).locks : null;
    if (!locks?.request) { this.lockRelease = () => {}; return; }
    await new Promise<void>((resolve, reject) => {
      locks.request("hec-recorder-upload", { ifAvailable: true }, (lock: any) => {
        if (!lock) { reject(new RecorderError("another_tab", "The recorder is open in another tab")); return; }
        return new Promise<void>((release) => { this.lockRelease = release; resolve(); });
      }).catch(reject);
    });
  }

  // ------------------------------------------------------------ page

  private watchPage() {
    if (typeof document === "undefined" || this.pageWatched) return;
    this.pageWatched = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { void this.acquireWakeLock(); this.tick(); }
    });
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => void this.kickUploads());
      window.addEventListener("beforeunload", (e) => {
        if (this.active && (this.active.capturing || this.active.rec.phase === "armed")) { e.preventDefault(); (e as any).returnValue = ""; }
      });
    }
  }

  private async acquireWakeLock() {
    const wl = typeof navigator !== "undefined" ? (navigator as any).wakeLock : null;
    if (!wl || this.wakeLock || !this.active || (this.active.rec.phase !== "armed" && !this.active.capturing)) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      this.wakeLock = await wl.request("screen");
      this.wakeLock.addEventListener?.("release", () => { this.wakeLock = null; });
    } catch { this.wakeLock = null; }
  }

  private releaseWakeLock() { try { this.wakeLock?.release(); } catch { /* */ } this.wakeLock = null; }

  private async backup(rec: LocalRecording, rel: string, bytes: Uint8Array) {
    try {
      let dir = await this.backupDir.getDirectoryHandle(rec.id, { create: true });
      const parts = rel.split("/");
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
      const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
      const w = await fh.createWritable();
      await w.write(bytes);
      await w.close();
    } catch (e) {
      this.events.emit("backup", { status: "needs_permission", detail: String((e as any)?.message ?? e) });
    }
  }

  private setState(s: RecorderState) {
    if (this._state === s) return;
    this._state = s;
    if (typeof document !== "undefined" && this.active) {
      const title = document.title.replace(/^(● RECORDING|◌ ARMED) - /, "");
      document.title = s === "recording" || s === "starting" ? `● RECORDING - ${title}` : s === "armed" ? `◌ ARMED - ${title}` : title;
    }
    this.events.emit("state", { state: s, recordingId: this.active?.rec.id ?? null });
  }
}
