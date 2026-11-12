// The recorder: session control on top of the pieces. One instance per page.
//
// Life of a recording (server states in capitals):
//   arm(entry)        INSERT class_recordings -> ARMED (the server checked consent, switch, teacher, window)
//   window opens      open both mics, audio is held from the first Start request, UPDATE status -> RECORDING
//                     (server stamps started_at); t = 0 is anchored to the server's stamp; tracks described,
//                     chunks stream into IndexedDB and up to storage
//   stop / end+grace  capture stops, final partial chunks stored, UPDATE -> UPLOADING (server stamps ended_at)
//   all confirmed     track counts, manifest.json uploaded + read back, UPDATE -> COMPLETE
//   then              the local copy is purged (audio, chunk rows, markers, manifest)
//
// Clocks (C2 review B2). Lesson timing never uses the laptop's wall clock:
// "now" is the SERVER's time, measured once and carried forward on the
// monotonic clock (performance.now): serverAt + (perfNow() - perfAt). A
// wall-clock jump (Windows time sync, a wrong boot clock) is detected, logged
// in the manifest and triggers a re-measure; it neither ends a lesson nor
// moves a chunk. Date.now() only labels things.
//
// Heartbeat (B1). Decisions are taken in tick(), which runs on the worklet's
// ticks AND on a 1 s interval AND on visibilitychange / online. A watchdog in
// tick() notices when no audio has arrived for 3 s while capturing: the state
// becomes `stalled` (never `recording` while nothing is captured), a loud
// error is raised, the context is resumed and, if that does not bring audio
// back, re-made once with the open microphones. The missing wall time is
// written to the manifest as a `context_stall` discontinuity and a `gap`
// marker. A separate ledger (frames delivered vs monotonic time, minimum over
// 5 s) records shorter gaps without mistaking a busy main thread for one.

import type { ChunkMeta, LocalRecording, MarkerKind, MarkerRecord, RecorderFormat, RecorderState, ScheduleEntry, ServerRecording, StopReason, TrackInfo, TrackRole } from "./types";
import type { RecorderBackend } from "./backend";
import type { RecorderStore } from "./store";
import type { CaptureSource, TrackOpen } from "./captureSource";
import type { PcmBatch } from "./audioGraph";
import type { OpusBlob } from "./opusPipeline";
import { Emitter, type HeldAudio, type Listener, type RecorderEvents } from "./events";
import { RecorderError, toRecorderError, type ServerRefusal } from "./errors";
import { Chunker, type RawChunk, type RawSegment } from "./chunker";
import { inlineEncoder, type ChunkEncoder } from "./encoderClient";
import { sha256Hex, randomUuid } from "./hash";
import { floatToInt16, frameToMs, framesPerChunk, manifestPath, FORMAT_EXT, FORMAT_MIME } from "./chunkMath";
import { Uploader, type UploadProgress } from "./uploader";
import { buildManifest, countedChunks, manifestBytes, trackCounts } from "./manifest";
import { HealthMonitor } from "./health";
import { CLOCK_WARN_MS, plan, type WindowSettings, DEFAULT_WINDOW } from "./schedule";
import { resolveDevice, resolveProfile, type DeviceProfile } from "./devices";
import { backoffDelay } from "./backoff";

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
  /** Laptop wall clock: labels only (tests inject). */
  now?: () => number;
  /** Monotonic clock for every elapsed time and the server-time estimate (default performance.now; tests inject). */
  perfNow?: () => number;
  /** Start/stop the 1 s fallback interval (tests may drive tick() themselves). */
  autoTick?: boolean;
  window?: WindowSettings;
  /** Warn below this much free browser storage (default 4 GB). */
  storageWarnBytes?: number;
  /** Refuse to arm below this (default 2 GB, C1-architecture 1.3). */
  storageRefuseBytes?: number;
  /** While capturing, stop with a loud error below this much free storage (default 64 MB), before chunks are lost. */
  storageStopBytes?: number;
  /**
   * How long to try to get a lost microphone back before its track is closed
   * (default: never - it is sought for the rest of the lesson; field finding).
   */
  deviceRetryMs?: number;
  /** After this long without the lost microphone, say so again (default 60 s). */
  deviceLostAlertMs?: number;
  /** N-M3: a clock measurement with a slower round trip than this is not kept (default 2 s). */
  clockMaxRttMs?: number;
  /** N-M7: a re-open of a lost microphone that has not answered after this long is given up and tried again (default 10 s). */
  reopenTimeoutMs?: number;
  deviceRetryEveryMs?: number;
  /** Cross-tab single-uploader lock; default navigator.locks when present. */
  useLocks?: boolean;
  /** C2 revision (M6): where chunks are encoded. Default: inline; createRecorder passes the Worker encoder. */
  encoder?: ChunkEncoder;
  /** B1: no audio for this long while capturing = stalled (default 3000 ms). */
  stallAfterMs?: number;
  /** B3: the Start request is given up (and retried) after this long without an answer (default 10 s). */
  startTimeoutMs?: number;
  /** B3: audio held in memory while the Start has not been answered (default 2 min). */
  preStartHoldMs?: number;
  /** B3: a server stamp later than this after the Start was sent re-anchors t = 0 to it (default 5 s; the server's tolerance is 15 s). */
  startLeadOkMs?: number;
  /** M2: own unsent audio older than this is reported as stuck (default 14 days, the server's stale_upload_days). Never deleted. */
  stuckAfterMs?: number;
  /** M3: chunks held in memory while the browser will not store them, at most (default 150 MB); beyond it capture stops, loudly. */
  memoryHoldBytes?: number;
  /** m1: false when the store is not crash-safe (no IndexedDB). arm() refuses then. Default true. */
  durable?: boolean;
}

interface PreBatch { frame: number; t: Int16Array; r: Int16Array }

interface Active {
  rec: LocalRecording;
  chunker: Chunker | null;
  capturing: boolean;
  /** perfNow() of the latest Start request; its attempt number. */
  startSentAt: number | null;
  startInFlight: boolean;
  startAttempt: number;
  startErrors: number;
  /** B3: frame and server time of the FIRST Start request (t = 0 unless the server stamped much later). */
  firstSendFrame: number | null;
  firstSendServer: number | null;
  /** B3: audio captured while the Start is unanswered (in memory, oldest first). */
  pre: PreBatch[] | null;
  preFrames: number;
  preDroppedFrames: number;
  /** Server-time stop moment. */
  stopAt: number;
  lostSince: Partial<Record<TrackRole, number>>;
  lastReopenTry: Partial<Record<TrackRole, number>>;
  lostAlerted?: Partial<Record<TrackRole, boolean>>;
  /** N-B3: every microphone is lost: NOT recording. */
  noMics?: boolean;
  /** N-M1: when the context was last re-made (one per 30 s, as often as needed). */
  lastRebuildAt?: number;
  /** N-B2: backoff before the next Start attempt. */
  startRetryMs?: number;
  reopening?: Partial<Record<TrackRole, boolean>>;
  /** perfNow() of the last clipped batch per track (the meter's clipping warning). */
  lastClipPerf?: Partial<Record<TrackRole, number>>;
  clipAlertAt?: Partial<Record<TrackRole, number>>;
  opusSeqStartFrame: number;
  // B1 watchdog
  lastAudioPerf: number;
  stalled: boolean;
  stallSince: number;
  lastRecoverTry: number;
  rebuilt: boolean;
  // B1 ledger: frames delivered vs monotonic time
  ledgerPerf0: number | null;
  ledgerFrames: number;
  ledgerWin: { p: number; d: number }[];
  ledgerBase: number | null;
}

const ms = (iso: string) => Date.parse(iso);
/** The scheduled stop is sent this long before capture_closes_at, so it lands inside the window. */
export const STOP_MARGIN_MS = 5000;
/** Start refusals the server actually stated: final. Anything else is retried (N-B2). */
const FINAL_START_REFUSALS: ServerRefusal[] = ["window_closed", "switch_off", "consent_missing", "session_canceled", "not_teacher", "no_longer_teaching", "already_live", "recording_closed", "not_your_recording", "session_invalid"];
/** Stop refusals the server actually stated: final. Anything else is retried (B4). */
const FINAL_STOP_REFUSALS: ServerRefusal[] = ["window_closed", "recording_closed", "not_your_recording", "no_longer_teaching"];

export class Recorder {
  readonly events = new Emitter();
  private o: Required<Omit<RecorderOptions, "profile">> & { profile: DeviceProfile | null };
  private uploader: Uploader;
  private encoder: ChunkEncoder;
  private _state: RecorderState = "idle";
  private active: Active | null = null;
  private offsetMs: number | null = null;
  /** B2: the server's time at perfAt (monotonic), from the latest measurement. */
  private serverAt: number | null = null;
  private perfAt = 0;
  private lastOffsetAt = -1e15;
  private lastServerPoll = -1e15;
  private lastStorageCheck = -1e15;
  private lastUploadKick = -1e15;
  private lastParkedTry = -1e15;
  private lastAuthRefresh = -1e15;
  private lastClockErrorAt = -1e15;
  private interval: any = null;
  private work: Promise<unknown> = Promise.resolve();
  /** Chunk storing runs on its own queue, so a control step can wait for it. */
  private io: Promise<unknown> = Promise.resolve();
  private pageWatched = false;
  private lastBeginTry = -1e15;
  private health: HealthMonitor;
  private lastLevelAt = 0;
  private wakeLock: any = null;
  private lockRelease: (() => void) | null = null;
  private driving = new Map<string, Promise<void>>();
  private driveAgain = new Set<string>();
  private lastTickCall: number | null = null;
  private deferredOnce = false;
  private lastWall: number | null = null;
  private lastWallPerf = 0;
  /** M3: chunks the store would not take yet, per `${recording}|${track}`, oldest first. */
  private parked = new Map<string, { rec: LocalRecording; meta: ChunkMeta; bytes: Uint8Array }[]>();
  private parkedBytes = 0;
  private disposed = false;
  private startP: Promise<void> = Promise.resolve();

  constructor(opts: RecorderOptions) {
    this.o = {
      format: "flac", chunkMs: 30000, appVersion: "dev", userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "node",
      now: () => Date.now(), perfNow: () => performance.now(), autoTick: true, window: DEFAULT_WINDOW, storageWarnBytes: 4 * 1024 ** 3, storageRefuseBytes: 2 * 1024 ** 3,
      storageStopBytes: 64 * 1024 ** 2, deviceRetryMs: Infinity, deviceLostAlertMs: 60000, reopenTimeoutMs: 10000, clockMaxRttMs: 2000, deviceRetryEveryMs: 2000, useLocks: true, encoder: null as any,
      stallAfterMs: 3000, startTimeoutMs: 10000, preStartHoldMs: 120000, startLeadOkMs: 5000, stuckAfterMs: 14 * 86400000,
      memoryHoldBytes: 150 * 1024 ** 2, durable: true, ...opts,
    } as any;
    this.o.durable = opts.durable !== false;
    this.encoder = this.o.encoder ?? inlineEncoder();
    this.uploader = new Uploader(this.o.store, this.o.backend, {
      // B2: retries and the page's own "late" estimate run on server time, not the wall clock.
      now: () => this.serverNow(),
      onChunk: (c) => this.events.emit("chunk", c),
      onError: (e) => { this.events.emit("error", e); if (e.code === "not_signed_in") void this.refreshAuth(); },
      isHeld: (id, track, seq) => (this.parked.get(`${id}|${track}`) ?? []).some((p) => p.meta.seq <= seq),
    });
    this.health = new HealthMonitor({ sampleRate: this.o.source.sampleRate });
    this.o.source.onBatch = (b) => this.onBatch(b);
    this.o.source.onTick = (f, t) => this.onAudioTick(f, t);
    this.o.source.onTrackEnded = (r) => this.onTrackEnded(r);
    if ("onStateChange" in this.o.source || this.o.source.rebuild) this.o.source.onStateChange = (s) => this.onContextState(s);
    if ("onDeviceChange" in this.o.source) this.o.source.onDeviceChange = () => { void this.onDeviceChange(); };
  }

  // ------------------------------------------------------------ public

  get state(): RecorderState { return this._state; }
  get recordingId(): string | null { return this.active?.rec.id ?? null; }
  /** m1: false when this engine cannot keep audio across a crash (no IndexedDB). */
  get durable(): boolean { return this.o.durable; }
  /**
   * The server's time (B2): measured, then carried on the monotonic clock.
   * Before the first measurement: the laptop clock.
   */
  serverNow(): number {
    if (this.serverAt === null) return this.o.now() + (this.offsetMs ?? 0);
    return this.serverAt + (this.o.perfNow() - this.perfAt);
  }
  get serverOffsetMs(): number | null { return this.offsetMs; }

  on<K extends keyof RecorderEvents>(k: K, fn: Listener<K>) { return this.events.on(k, fn); }

  /**
   * "Ready for today". Call from the teacher's click: resumes the AudioContext,
   * asks for persistent storage, takes the one-uploader lock, measures the
   * server clock and resolves both microphones (without opening them).
   */
  async prepare(): Promise<{ contextRunning: boolean; devices: ReturnType<typeof resolveProfile>; offsetMs: number | null }> {
    if (!this.o.durable) this.events.emit("error", new RecorderError("not_durable", "This browser cannot keep recorded audio safely (no IndexedDB): a crash would lose it. Do not record a lesson here."));
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
    if (!this.o.durable) throw new RecorderError("not_durable", "Not armed: this browser cannot keep recorded audio safely (no IndexedDB)");
    if (this.offsetMs === null) await this.measureClock();
    if (this.offsetMs === null) throw new RecorderError("clock_unknown", "The server's time could not be read: the lesson is not armed");
    const st = await this.checkStorage(true);
    if (st && st.free < this.o.storageRefuseBytes)
      throw new RecorderError("storage_low", `Not armed: only ${Math.round(st.free / 1e6)} MB of browser storage is free (a lesson needs up to about 700 MB)`, { detail: st });
    const local = (await this.mine()).find((r) => r.sessionId === entry.sessionId && r.phase === "armed");
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
    this.active = this.newActive(rec, Math.min(opts.stopAt ?? Infinity, ms(row.capture_closes_at) - STOP_MARGIN_MS));
    void planned;
    this.setState("armed");
    await this.acquireWakeLock();
    this.tick();
    return row;
  }

  private newActive(rec: LocalRecording, stopAt: number): Active {
    return {
      rec, chunker: null, capturing: false, startSentAt: null, startInFlight: false, startAttempt: 0, startErrors: 0,
      firstSendFrame: null, firstSendServer: null, pre: null, preFrames: 0, preDroppedFrames: 0,
      // Stop INSIDE the window (revision 2 refuses a later Stop): a margin for the request's own travel time.
      stopAt, lostSince: {}, lastReopenTry: {}, opusSeqStartFrame: 0,
      lastAudioPerf: this.o.perfNow(), stalled: false, stallSince: 0, lastRecoverTry: -1e15, rebuilt: false,
      ledgerPerf0: null, ledgerFrames: 0, ledgerWin: [], ledgerBase: null,
    };
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
    if (!a || !a.chunker?.started) throw new RecorderError("internal", "Markers can be added while recording");
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
   * On page load: find this user's unfinished recordings in IndexedDB and
   * carry on. A recording that was capturing when the tab died is finished
   * from its stored chunks and 5-second segments, as `crash_recovered`.
   * Another account's recordings are not touched (M1): they are counted in
   * the `recovered` event's `othersPending` so the UI can say so.
   */
  async recover(): Promise<string[]> {
    await this.takeLock();
    const ids: string[] = [];
    for (const rec of await this.mine()) {
      if (rec.phase === "complete") {
        // Older engines kept the local copy after complete: purge it now (M2).
        await this.o.store.purgeRecording(rec.id, { allowUnconfirmed: false }).catch(() => null);
        continue;
      }
      // B4: a Stop refusal recorded by an older pass is reconsidered; the
      // server's answer decides again.
      if (rec.stopRefused || rec.stopNextAt) { rec.stopRefused = undefined; rec.stopNextAt = 0; await this.saveRec(rec); }
      if (rec.phase === "capturing" && this.active?.rec.id !== rec.id) {
        await this.salvage(rec);
        rec.phase = "stopped"; rec.stopReason = "crash_recovered"; rec.stopPending = true;
        rec.clientEndedAt = new Date(this.o.now()).toISOString();
        rec.updatedAt = this.serverNow();
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
      if (rec.phase === "abandoned") {
        // M2: the server deleted it (retention or a deletion request): the
        // local copy goes too. Otherwise confirmed bytes are freed and the
        // unconfirmed audio stays until an explicit Discard.
        const row = await this.o.backend.getRecording(rec.id).catch(() => undefined);
        if (row && row.status === "deleted") { await this.o.store.purgeRecording(rec.id, { allowUnconfirmed: true }); continue; }
        await this.o.store.deleteConfirmedBytes(rec.id);
        await this.forgetLabels(rec.id);
        continue;
      }
      if (rec.phase === "stopped" || rec.phase === "finalized") { ids.push(rec.id); void this.drive(rec.id); }
    }
    const others = await this.othersPending();
    this.events.emit("recovered", { recordingIds: ids, othersPending: others });
    const stuck = (await this.heldAudio()).filter((h) => h.overLimit);
    if (stuck.length) this.events.emit("stuck", { recordings: stuck });
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
      if (!rec || !this.isMine(rec)) return;   // M1: never another account's recording
      // N-B1: a capture stopped before the server answered its Start.
      if (!rec.startedAtServer && (rec.phase === "stopped" || rec.phase === "finalized")) {
        if (!(await this.lateStart(rec))) return;
        rec = (await this.o.store.getRecording(recordingId))!;
      }
      if (!rec.startedAtServer) return;
      // N-B1: where the server's start sits on the timeline, before any chunk is registered.
      if (!(await this.sendPreStart(rec))) return;
      if (rec.stopPending && !rec.stopRefused) {
        // Ruling (b) / M4: a Stop this late would abandon the row and with it
        // every pending upload. Upload what can be uploaded FIRST.
        const tooLate = this.serverNow() > ms(rec.captureClosesAt) + (rec.lateAfterMs ?? 600000);
        let deferStop = false;
        if (tooLate) {
          const p0 = await this.uploader.run(recordingId);
          this.events.emit("upload", await this.decorate(p0, rec));
          const giveUpAt = ms(rec.captureClosesAt) + (rec.lateAfterMs ?? 600000) + 6 * 3600000;
          deferStop = p0.pending > 0 && !p0.halted && this.serverNow() < giveUpAt;
        }
        if (!deferStop && (rec.stopNextAt ?? 0) <= this.serverNow()) await this.sendStop(rec);
      }
      rec = (await this.o.store.getRecording(recordingId))!;
      await this.sendMarkers(rec);
      const p = await this.uploader.run(recordingId);
      rec = (await this.o.store.getRecording(recordingId))!;
      this.events.emit("upload", await this.decorate(p, rec));
      if (p.halted === "recording_closed") {
        const row = await this.o.backend.getRecording(rec.id).catch(() => null);
        if (row && (row.status === "abandoned" || row.status === "deleted")) {
          rec.serverStatus = row.status; rec.phase = "abandoned";
          await this.saveRec(rec);
          await this.afterAbandoned(rec.id);
          if (this.active?.rec.id === rec.id) this.setState("abandoned");
        }
      }
      rec = (await this.o.store.getRecording(recordingId))!;
      if (rec && (rec.phase === "stopped" || rec.phase === "finalized") && !rec.stopPending && rec.serverStatus === "uploading" && p.pending === 0 && !p.offline && !this.hasParked(rec.id)) {
        await this.finalize(rec);
      }
    } catch (e) {
      this.events.emit("error", toRecorderError(e));
    }
  }

  /** B4: send Stop; only a refusal the server stated is final, everything else is retried with backoff. */
  private async sendStop(rec: LocalRecording) {
    try {
      const row = await this.o.backend.stop(rec.id, rec.stopReason ?? "manual", rec.clientEndedAt ?? new Date(this.o.now()).toISOString());
      rec.serverStatus = row.status; rec.stopPending = false; rec.stopAttempts = 0; rec.stopNextAt = 0;
      // Revision 2: a Stop after capture_closes_at + late_after leaves the
      // row ABANDONED. Read back what the server did and say so.
      if (row.status === "abandoned") {
        rec.phase = "abandoned";
        this.events.emit("error", new RecorderError("server_refused", `The server did not accept this Stop: ${row.abandon_reason ?? "stopped after the lesson window"}. Audio that is not on the server is kept on this laptop.`, { refusal: "stopped_after_window" }));
        if (this.active?.rec.id === rec.id) this.setState("abandoned");
      }
      await this.saveRec(rec);
      if (rec.phase === "abandoned") await this.afterAbandoned(rec.id);
    } catch (e) {
      const err = toRecorderError(e);
      if (err.code === "not_signed_in") await this.refreshAuth();
      // Whatever the error: read what the server now says (the Stop may have
      // landed and only its answer was lost).
      const row = err.code === "offline" ? null : await this.o.backend.getRecording(rec.id).catch(() => null);
      if (row && row.status !== "recording") {
        rec.serverStatus = row.status; rec.stopPending = false; rec.stopAttempts = 0; rec.stopNextAt = 0;
        if (row.status === "abandoned" || row.status === "deleted") rec.phase = "abandoned";
      } else if (err.refusal && FINAL_STOP_REFUSALS.includes(err.refusal)) {
        rec.stopRefused = err.message;
      } else {
        rec.stopAttempts = (rec.stopAttempts ?? 0) + 1;
        rec.stopNextAt = this.serverNow() + backoffDelay(rec.stopAttempts, { maxMs: 60000 });
      }
      await this.saveRec(rec);
      if (rec.phase === "abandoned") {
        await this.afterAbandoned(rec.id);
        if (this.active?.rec.id === rec.id) this.setState("abandoned");
      }
      this.events.emit("error", err);
      if (rec.stopPending && !rec.stopRefused)
        this.events.emit("error", new RecorderError("stop_pending", `The Stop has not reached the server yet (${err.message}); it is tried again`, { retryable: true, detail: { attempts: rec.stopAttempts } }));
    }
  }

  private async decorate(p: UploadProgress, rec: LocalRecording | undefined): Promise<UploadProgress> {
    const held = [...this.parked.entries()].filter(([k]) => k.startsWith(`${p.recordingId}|`)).reduce((n, [, v]) => n + v.length, 0);
    return { ...p, stopPending: !!rec?.stopPending, stopRefused: rec?.stopRefused ?? null, heldInMemory: held };
  }

  /**
   * Local backup to a folder: REMOVED (C2 review M5). It wrote plain audio
   * of children outside every retention rule (Desktop, OneDrive, a USB
   * stick) and nothing could ever delete it. Kept as a no-op so callers
   * compile; it always answers false. Bring it back only when the owner has
   * decided where such copies may live and who deletes them.
   */
  async enableLocalBackup(): Promise<boolean> {
    this.events.emit("backup", { status: "off", detail: "The folder backup is switched off: copies outside the app are not allowed for lesson audio" });
    return false;
  }

  /**
   * The teacher's typed "Discard" for a recording that cannot finish
   * (abandoned, refused). `confirmation` must be the word DISCARD.
   */
  async discardLocal(recordingId: string, confirmation: string): Promise<void> {
    if (confirmation !== "DISCARD") throw new RecorderError("internal", "Type DISCARD to throw away audio that the server does not have");
    const rec = await this.o.store.getRecording(recordingId);
    if (rec && !this.isMine(rec)) throw new RecorderError("server_refused", "This audio was recorded by another account: only that teacher can discard it", { refusal: "not_your_recording" });
    if (rec && rec.phase !== "abandoned" && rec.phase !== "complete") throw new RecorderError("internal", "Only a finished or abandoned recording can be discarded");
    await this.o.store.purgeRecording(recordingId, { allowUnconfirmed: true });
  }

  async uploadProgress(recordingId: string): Promise<UploadProgress> {
    const rec = await this.o.store.getRecording(recordingId);
    if (rec && !this.isMine(rec)) throw new RecorderError("server_refused", "This recording belongs to another account", { refusal: "not_your_recording" });
    return this.decorate(await this.uploader.progress(recordingId), rec);
  }

  /** M1: another account's unsent audio on this laptop (that teacher must sign in to send it). */
  async othersPending(): Promise<{ recordings: number; bytes: number }> {
    let recordings = 0, bytes = 0;
    for (const r of await this.o.store.listRecordings()) {
      if (this.isMine(r)) continue;
      const open = (await this.o.store.listChunks(r.id)).filter((c) => c.state !== "confirmed");
      if (!open.length && r.phase === "complete") continue;
      recordings += 1;
      bytes += await this.o.store.bytesHeld(r.id);
    }
    return { recordings, bytes };
  }

  /** M2: this user's audio still held here and not on the server, with its age. */
  async heldAudio(): Promise<HeldAudio[]> {
    const out: HeldAudio[] = [];
    for (const r of await this.mine()) {
      if (r.phase === "complete") continue;
      const chunks = await this.o.store.listChunks(r.id);
      let bytes = 0;
      for (const c of chunks) if (c.state !== "confirmed") bytes += (await this.o.store.getBytes(r.id, c.track, c.seq))?.length ?? 0;
      if (!bytes) continue;
      const ageMs = Math.max(0, this.serverNow() - r.createdAt);
      out.push({ recordingId: r.id, sessionDate: r.sessionDate, phase: r.phase, serverStatus: r.serverStatus, bytes, ageMs, overLimit: ageMs > this.o.stuckAfterMs });
    }
    return out;
  }

  /**
   * M1/M2: the teacher signs out. Audio the server has confirmed is deleted
   * from this laptop; finished recordings are purged; audio that is NOT on
   * the server is kept (never deleted without the typed Discard) and
   * reported, so the UI can warn. The engine is disposed. Refused while
   * capturing: stop first.
   */
  async signOut(): Promise<{ unsentRecordings: number; unsentBytes: number }> {
    if (this.active?.capturing) throw new RecorderError("internal", "Stop the recording before signing out");
    await this.settle();
    for (const r of await this.mine()) {
      if (r.phase === "complete") { await this.o.store.purgeRecording(r.id, { allowUnconfirmed: false }).catch(() => null); continue; }
      await this.o.store.deleteConfirmedBytes(r.id);
    }
    const held = await this.heldAudio();
    await this.dispose();
    return { unsentRecordings: held.length, unsentBytes: held.reduce((n, h) => n + h.bytes, 0) };
  }

  /** Resolves when queued control steps and chunk writes have run (tests; a "Saving..." spinner). */
  async settle(): Promise<void> {
    for (let i = 0; i < 8; i++) {
      await this.work; await this.io;
      // A Start in flight is waited for briefly, never indefinitely (it may hang: B3).
      await Promise.race([this.startP, new Promise((r) => setTimeout(r, 0))]);
      await Promise.all([...this.driving.values()]);
    }
  }

  /** The local copy of the current recording (for the UI's details panel). After complete: the last state in memory. */
  async current(): Promise<LocalRecording | null> {
    if (!this.active) return null;
    return (await this.o.store.getRecording(this.active.rec.id)) ?? this.active.rec;
  }

  async dispose() {
    this.disposed = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.releaseWakeLock();
    this.lockRelease?.();
    this.lockRelease = null;
    this.o.source.onBatch = null; this.o.source.onTick = null; this.o.source.onTrackEnded = null;
    if (this.o.source.onStateChange !== undefined) this.o.source.onStateChange = null;
    if (this.o.source.onDeviceChange !== undefined) this.o.source.onDeviceChange = null;
  }

  // ------------------------------------------------------------ ownership (M1)

  private isMine(r: LocalRecording): boolean { return !!r.ownerUserId && r.ownerUserId === this.o.userId; }
  private async mine(): Promise<LocalRecording[]> { return (await this.o.store.listRecordings()).filter((r) => this.isMine(r)); }

  // ------------------------------------------------------------ heartbeat

  private onAudioTick(_frame: number, _ctxTime: number) {
    // The worklet's tick is the heartbeat. Stalls are judged by the watchdog
    // and the ledger, not by comparing this tick's delivery time with the
    // context clock: a busy main thread delays the delivery (M6's false stalls).
    this.tick();
  }

  private onContextState(s: string) {
    const a = this.active;
    if (!a || !a.capturing) return;
    if (s !== "running" && !a.stalled) this.enterStall(this.o.perfNow(), s);
  }

  /** Every decision that depends on time. Cheap; called often. */
  tick(): void {
    if (this.disposed) return;
    const perf = this.o.perfNow();
    const sinceLast = this.lastTickCall === null ? 0 : perf - this.lastTickCall;
    this.lastTickCall = perf;
    this.checkWallClock(perf);
    const a = this.active;
    const now = this.serverNow();
    if (perf - this.lastOffsetAt > 10 * 60000) void this.measureClock();
    if (perf - this.lastStorageCheck > 60000) void this.checkStorage(false);
    if (a) {
      const rec = a.rec;
      if (rec.phase === "armed" && !a.capturing && now >= ms(rec.captureOpensAt) && now < ms(rec.captureClosesAt) && perf - this.lastBeginTry > 2000) {
        this.lastBeginTry = perf;
        this.serial(() => this.beginCapture());
      }
      if (a.capturing && a.rec.startedAtServer && now >= a.stopAt) {
        this.serial(() => this.endCapture("scheduled_end"));
      }
      if (a.capturing && !a.rec.startedAtServer) {
        if (a.startInFlight && a.startSentAt !== null && perf - a.startSentAt > this.o.startTimeoutMs) {
          // B3: no answer: give this attempt up (it may still land; its answer is used if it does).
          a.startInFlight = false;
          this.events.emit("error", new RecorderError("server_unavailable", `The server has not answered the start for ${Math.round(this.o.startTimeoutMs / 1000)} s: the audio is kept and the start is sent again`, { retryable: true }));
        }
        if (!a.startInFlight && a.startSentAt !== null && perf - a.startSentAt > (a.startRetryMs ?? 2000)) this.startP = this.sendStart();
        // A capture that cannot start before the window closes is over.
        if (now >= ms(rec.captureClosesAt)) this.serial(() => this.endCapture("manual"));
      }
      if (a.capturing) { this.checkTracksLive(); this.retryLostDevices(); this.watchdog(perf, sinceLast); }
      if ((rec.phase === "armed" || a.capturing) && perf - this.lastServerPoll > 60000) {
        this.lastServerPoll = perf;
        void this.pollServer();
      }
      if (rec.phase === "armed" && !a.capturing && now >= ms(rec.captureClosesAt)) this.serial(() => this.stop("manual"));
    }
    if (this.parked.size && perf - this.lastParkedTry > 5000) {
      this.lastParkedTry = perf;
      this.chain(() => this.retryParked());
    }
    if (perf - this.lastUploadKick > 5000) {
      this.lastUploadKick = perf;
      void this.kickUploads();
    }
  }

  /** B2: the wall clock moved by more than the monotonic clock: log it and measure the server again. */
  private checkWallClock(perf: number) {
    const wall = this.o.now();
    if (this.lastWall !== null) {
      const jump = (wall - this.lastWall) - (perf - this.lastWallPerf);
      if (Math.abs(jump) > 5000) {
        const a = this.active;
        if (a && (a.capturing || a.rec.phase === "stopped")) {
          a.rec.discontinuities.push({ t_ms: a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0, kind: "clock_change", wall_gap_ms: Math.round(jump) });
          void this.saveRec(a.rec);
        }
        this.events.emit("clock", { offsetMs: this.offsetMs ?? 0, rttMs: 0, warning: true, jumpMs: Math.round(jump) });
        this.lastOffsetAt = -1e15; // re-measure on this tick
      }
    }
    this.lastWall = wall; this.lastWallPerf = perf;
  }

  /** B1: no audio while capturing -> stalled, loudly; try to bring it back. */
  private watchdog(perf: number, sinceLast: number) {
    const a = this.active;
    if (!a || !a.capturing) return;
    if (!a.stalled) {
      if (perf - a.lastAudioPerf <= this.o.stallAfterMs) { this.deferredOnce = false; return; }
      // This tick itself came late (the main thread was busy): audio may be
      // sitting in the queue. Judge on the next tick - but only once.
      if (sinceLast > 1500 && !this.deferredOnce) { this.deferredOnce = true; return; }
      this.deferredOnce = false;
      this.enterStall(perf, this.o.source.contextState);
      return;
    }
    if (perf - a.lastRecoverTry >= 2000) {
      a.lastRecoverTry = perf;
      void this.tryRecover(a, perf);
    }
  }

  private enterStall(perf: number, contextState: string) {
    const a = this.active;
    if (!a || a.stalled) return;
    a.stalled = true;
    a.stallSince = a.lastAudioPerf;
    a.lastRecoverTry = -1e15;
    const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
    this.setState("stalled");
    this.events.emit("health", { kind: "capture_stalled", tMs, gapMs: Math.round(perf - a.lastAudioPerf), contextState });
    this.events.emit("error", new RecorderError("capture_stalled", `NOT RECORDING: no audio has arrived for ${Math.round((perf - a.lastAudioPerf) / 1000)} s (the browser's audio is ${contextState}). Trying to restart it - if it does not come back, reload the page.`, { detail: { contextState } }));
    void this.tryRecover(a, perf);
  }

  private async tryRecover(a: Active, perf: number) {
    a.lastRecoverTry = perf;
    let running = false;
    try { running = await this.o.source.resume(); } catch { running = false; }
    if (!a.stalled || !a.capturing) return;
    const stuckFor = this.o.perfNow() - a.stallSince;
    // N-M1: a context may die more than once in a lesson: re-made again each
    // time, at most once per 30 s ("running" but silent counts: a dead worklet).
    if ((!running || stuckFor > 2 * this.o.stallAfterMs) && this.o.source.rebuild && this.o.perfNow() - (a.lastRebuildAt ?? -1e15) >= 30000) {
      a.rebuilt = true;
      a.lastRebuildAt = this.o.perfNow();
      try {
        const ok = await this.o.source.rebuild();
        if (!ok) this.events.emit("error", new RecorderError("capture_stalled", "The audio could not be restarted: reload the page (the audio recorded so far is kept)", { detail: { contextState: this.o.source.contextState } }));
      } catch (e) {
        this.events.emit("error", new RecorderError("capture_stalled", `The audio could not be restarted: ${String((e as any)?.message ?? e)}. Reload the page (the audio recorded so far is kept)`));
      }
    }
  }

  /** Audio arrived again after a stall: record the gap, back to recording. */
  private leaveStall(a: Active, perf: number) {
    a.stalled = false;
    a.rebuilt = false;
    const gap = Math.round(perf - a.stallSince);
    const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
    // N-M2: the gap is filled with silence on both tracks, so the audio
    // timeline stays on the server's clock and the chunks after it are not
    // "late" (the silence is stored below the byte floor: never evidence).
    const padded = this.padSilence(a, gap);
    a.rec.discontinuities.push({ t_ms: tMs, kind: "context_stall", wall_gap_ms: gap, padded_ms: padded });
    if (a.ledgerBase !== null) a.ledgerBase += gap;   // the ledger counts delivered frames only
    void this.queueMarker("gap", `no audio for ${Math.round(gap / 1000)} s`);
    this.events.emit("health", { kind: "capture_resumed", tMs, gapMs: gap });
    this.setState(this.capturingState(a));
  }

  /** Silence pushed onto the timeline for a gap (at most 30 min), 1 s at a time. Returns the ms padded. */
  private padSilence(a: Active, gapMs: number): number {
    const ch = a.chunker;
    if (!ch?.started || a.rec.format === "opus-webm" || gapMs < 1000) return 0;
    const sr = a.rec.sampleRate;
    let left = Math.round((Math.min(gapMs, 30 * 60000) * sr) / 1000);
    const total = left;
    const block = new Int16Array(sr);
    // Frame numbers continue from the chunker's position (the chunker only
    // compares them with t0, which is behind us).
    let f = (ch.t0Frame ?? 0) + ch.position;
    while (left > 0) {
      const n = Math.min(left, sr);
      const z = n === sr ? block : block.subarray(0, n);
      ch.push(f, z, z);
      f += n; left -= n;
    }
    for (const t of a.rec.tracks) t.framesCaptured = ch.captured[t.track];
    return Math.round((total * 1000) / sr);
  }

  /**
   * Ledger: wall time the frames do not account for. The minimum over 5 s
   * ignores a burst of batches that were only delivered late (busy main
   * thread); a lasting step up is a real gap (sleep, a context that ran slow).
   */
  private ledger(a: Active, perf: number, n: number) {
    const sr = this.o.source.sampleRate;
    if (a.ledgerPerf0 === null) { a.ledgerPerf0 = perf; a.ledgerFrames = n; return; }
    const d = (perf - a.ledgerPerf0) - (a.ledgerFrames * 1000) / sr;
    a.ledgerFrames += n;
    a.ledgerWin.push({ p: perf, d });
    let i = 0;
    while (i < a.ledgerWin.length && a.ledgerWin[i].p < perf - 5000) i++;
    if (i) a.ledgerWin.splice(0, i);
    if (!a.ledgerWin.length || perf - a.ledgerWin[0].p < 4000) return;
    let min = Infinity;
    for (const x of a.ledgerWin) if (x.d < min) min = x.d;
    if (a.ledgerBase === null || min < a.ledgerBase) { a.ledgerBase = min; return; }
    if (min - a.ledgerBase > 1000) {
      const gap = Math.round(min - a.ledgerBase);
      a.ledgerBase = min;
      const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
      a.rec.discontinuities.push({ t_ms: tMs, kind: "context_stall", wall_gap_ms: gap });
      void this.queueMarker("gap", `audio ran ${Math.round(gap / 1000)} s behind the clock`);
    }
  }

  private serial(fn: () => Promise<unknown>) {
    this.work = this.work.then(fn).catch((e) => this.events.emit("error", toRecorderError(e)));
  }

  private async kickUploads() {
    for (const rec of await this.mine()) {
      if (rec.phase === "capturing" && rec.startedAtServer || rec.phase === "stopped" || rec.phase === "finalized") void this.drive(rec.id);
    }
  }

  private async refreshAuth() {
    const perf = this.o.perfNow();
    if (!this.o.backend.refreshAuth || perf - this.lastAuthRefresh < 15000) return;
    this.lastAuthRefresh = perf;
    await this.o.backend.refreshAuth().catch(() => false);
  }

  // ------------------------------------------------------------ capture

  private newLocal(row: ServerRecording): LocalRecording {
    return {
      id: row.id, ownerUserId: this.o.userId, classId: row.class_id, sessionId: row.session_id ?? row.armed_session_id, format: row.format, chunkMs: row.chunk_ms,
      sampleRate: this.o.source.sampleRate, purpose: row.purpose, serverStatus: row.status, phase: "armed",
      scheduledStart: row.scheduled_start, scheduledEnd: row.scheduled_end, captureOpensAt: row.capture_opens_at,
      captureClosesAt: row.capture_closes_at, sessionDate: row.session_date, minBytesPerSec: row.min_bytes_per_sec,
      clockToleranceMs: row.clock_tolerance_ms, maxDurationMs: row.max_duration_ms, lateAfterMs: row.late_after_ms ?? 600000,
      tracks: [], anchors: [], discontinuities: [], deviceProfileId: this.o.profile?.serverId ?? null,
      installId: this.o.installId, appVersion: this.o.appVersion, userAgent: this.o.userAgent,
      createdAt: this.serverNow(), updatedAt: this.serverNow(),
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
    a.pre = null; a.preFrames = 0; a.preDroppedFrames = 0;
    a.lastAudioPerf = this.o.perfNow();
    // N-M8: a new lesson starts with a clean health monitor (a fault that
    // carried over from the last lesson is raised again).
    this.health.reset();
    // C2 round 3 (N-B1): t = 0 is the FIRST captured sample, now - not the
    // server's stamp. Every chunk and 5-s segment goes to IndexedDB at once,
    // whatever the server says or when; its start is recorded later as an
    // offset (pre_start_ms). No captured audio is ever thrown away.
    if (rec.format !== "opus-webm") {
      a.chunker.setT0(this.o.source.lastFrame);
      rec.firstSampleServer = this.serverNow();
      rec.phase = "capturing";
      await this.saveRec(rec);
    }
    this.o.source.forward(true);
    this.setState("starting");
    // Not awaited: a Start that hangs must not hold up the control queue
    // (a Stop, the window closing). tick() times it out and sends it again.
    this.startP = this.sendStart();
  }

  /**
   * Ask the server to start. The audio is already being stored from the first
   * sample (beginCapture); the server's stamp only fixes where its clock
   * meets that timeline (pre_start_ms). Each attempt has a timeout (tick());
   * a late answer to an older attempt is still used; after a failed attempt
   * the row is read back, because the start may have landed and only its
   * answer been lost. N-B2: only a refusal the server STATED is final;
   * anything else (429, 409, "no rows", an unknown text) is retried with
   * backoff while capture goes on.
   */
  private async sendStart() {
    const a = this.active;
    if (!a || !a.capturing || a.rec.startedAtServer || a.startInFlight) return;
    a.startInFlight = true;
    const attempt = ++a.startAttempt;
    a.startSentAt = this.o.perfNow();
    if (a.firstSendFrame === null) { a.firstSendFrame = this.o.source.lastFrame; a.firstSendServer = a.rec.firstSampleServer ?? this.serverNow(); }
    const clientIso = new Date(this.o.now()).toISOString();
    let row: ServerRecording | null = null;
    let failure: unknown = null;
    try { row = await this.o.backend.start(a.rec.id, clientIso); }
    catch (e) {
      failure = e;
      const back = toRecorderError(e).code === "offline" ? null : await this.o.backend.getRecording(a.rec.id).catch(() => null);
      if (back && back.status !== "armed" && back.started_at && (back.status === "recording" || back.status === "uploading")) { row = back; failure = null; }
    }
    if (this.active !== a) return;
    if (attempt === a.startAttempt) a.startInFlight = false;
    if (a.rec.startedAtServer) return;          // an earlier attempt's answer was used meanwhile
    if (row && row.started_at) { await this.adoptStart(a, row); return; }
    if (!a.capturing) return;
    const err = toRecorderError(failure ?? new Error("The server did not start the recording"));
    if (attempt !== a.startAttempt && (err.retryable || err.code === "offline")) return; // a newer attempt is on its way
    if (!(err.refusal && FINAL_START_REFUSALS.includes(err.refusal))) {
      a.startErrors += 1;
      a.startRetryMs = Math.min(30000, 2000 * 2 ** Math.min(4, a.startErrors - 1));
      if (err.code === "not_signed_in") await this.refreshAuth();
      // De-duplicated: the first failure, then every fifth (a long outage is hundreds).
      if (a.startErrors === 1 || a.startErrors % 5 === 0) {
        this.events.emit("error", err);
        this.events.emit("error", new RecorderError("server_unavailable", `The school server has not confirmed the start yet (${err.message}). The audio IS being saved on this laptop and will be sent once it does; the start is tried again.`, { retryable: true, detail: { attempts: a.startErrors, keptMs: this.capturedMs(a) } }));
      }
      return; // tick() tries again; capture goes on
    }
    await this.startFailed(a, err);
  }

  /** Audio captured so far in this capture (ms, per track). */
  private capturedMs(a: Active): number { return a.chunker?.started ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0; }

  /** The server's answer: anchor t = 0, cut the held audio, describe the tracks. */
  private async adoptStart(a: Active, row: ServerRecording) {
    if (a.rec.startedAtServer || !a.chunker) return;
    const chunker = a.chunker;
    if (a.rec.format === "opus-webm") {
      // MediaRecorder starts now: the opus timeline begins at the answer.
      chunker.reset();
      chunker.setT0(this.o.source.lastFrame);
      a.rec.firstSampleServer = this.serverNow();
    }
    a.stopAt = Math.min(a.stopAt, ms(row.capture_closes_at) - STOP_MARGIN_MS);
    await this.adoptServerStart(a.rec, row);
    if (row.format === "opus-webm" && this.o.source.startOpus) {
      a.opusSeqStartFrame = chunker.t0Frame ?? 0;
      this.o.source.startOpus(a.rec.chunkMs, (b) => this.onOpusBlob(b));
    }
    if (a.capturing) this.setState(this.capturingState(a));
    void this.drive(a.rec.id);
  }

  /**
   * The server's start, against the timeline that began at the first
   * captured sample: pre_start_ms = server stamp - first sample (server
   * time), never reaching back before capture_opens_at. Everything captured
   * is kept and sent; the part before the server's start is never evidence
   * (the server's rule). Tracks described.
   */
  private async adoptServerStart(rec: LocalRecording, row: ServerRecording) {
    const S = ms(row.started_at!);
    const first = rec.firstSampleServer ?? S;
    const maxBack = Math.max(0, S - ms(rec.captureOpensAt));
    const pre = Math.max(0, Math.min(Math.round(S - first), maxBack));
    rec.startedAtServer = row.started_at!;
    rec.clientStartedAt = rec.clientStartedAt ?? new Date(this.o.now()).toISOString();
    rec.serverStatus = row.status;
    rec.serverOffsetAtStart = this.offsetMs;
    rec.preStartMs = pre;
    rec.preStartAcked = pre === 0;
    if (pre > this.o.startLeadOkMs) {
      rec.discontinuities.push({ t_ms: 0, kind: "pre_start", wall_gap_ms: pre });
      this.events.emit("error", new RecorderError("start_delayed", `The school server started the recording ${Math.round(pre / 1000)} s after this laptop began recording. All of it is kept and sent; those first ${Math.round(pre / 1000)} s do not count as evidence that the lesson was recorded.`, { detail: { preStartMs: pre } }));
    }
    const ts = this.o.source.timestamp();
    rec.anchors.push({ t_ms: 0, context_time: ts.contextTime, performance_now: ts.performanceNow, date_now: this.o.now(), server_offset_ms: this.offsetMs });
    await this.saveRec(rec);
    for (const t of rec.tracks) {
      await this.o.backend.ensureTrack({
        recording_id: rec.id, track: t.track, device_label: t.deviceLabel, device_hash: t.deviceHash, sample_rate: rec.sampleRate,
        channel_count: 1, codec: rec.format === "opus-webm" ? "opus" : rec.format === "flac" ? "flac" : "pcm_s16le",
        bitrate: rec.format === "opus-webm" ? 128000 : null, applied_settings: { ...t.appliedSettings, not_honoured: t.notHonoured },
      }).catch((e) => this.events.emit("error", toRecorderError(e)));
    }
  }

  /** N-B1: tell the server where its start sits on the chunks' timeline, before any chunk. */
  private async sendPreStart(rec: LocalRecording): Promise<boolean> {
    if (rec.preStartAcked || !rec.preStartMs) return true;
    if (!this.o.backend.setPreStart) { rec.preStartAcked = true; await this.saveRec(rec); return true; }
    try {
      await this.o.backend.setPreStart(rec.id, rec.preStartMs);
      rec.preStartAcked = true;
    } catch (e) {
      const err = toRecorderError(e);
      const row = err.code === "offline" ? null : await this.o.backend.getRecording(rec.id).catch(() => null);
      if (row && (row as any).pre_start_ms === rec.preStartMs) rec.preStartAcked = true;
      else { this.events.emit("error", err); return false; }
    }
    await this.saveRec(rec);
    return true;
  }

  /**
   * A capture that ended (window closed, a reload) before the server started
   * it: start it now if the server still can, then the usual Stop. Its audio
   * was stored from the first sample, so all of it can still be sent.
   * Returns false while that is not possible yet.
   */
  private async lateStart(rec: LocalRecording): Promise<boolean> {
    let row: ServerRecording | null;
    try { row = await this.o.backend.getRecording(rec.id); } catch { return false; }
    if (row && row.started_at && (row.status === "recording" || row.status === "uploading")) { await this.adoptServerStart(rec, row); return true; }
    if (row && row.status === "armed") {
      try {
        const r = await this.o.backend.start(rec.id, rec.clientStartedAt ?? new Date(this.o.now()).toISOString());
        if (r.started_at) { await this.adoptServerStart(rec, r); return true; }
      } catch (e) {
        const err = toRecorderError(e);
        if (!(err.refusal && FINAL_START_REFUSALS.includes(err.refusal))) return false;
        await this.startNeverPossible(rec, err.message);
        return false;
      }
      return false;
    }
    if (row && row.status !== "armed") { await this.startNeverPossible(rec, `the recording is ${row.status} on the server`); return false; }
    return false;
  }

  private async startNeverPossible(rec: LocalRecording, why: string) {
    rec.phase = "abandoned"; rec.stopPending = false;
    await this.o.backend.abandon(rec.id, "the window closed before the server saw the start").catch(() => null);
    rec.serverStatus = "abandoned";
    await this.saveRec(rec);
    const kept = Math.round((await this.o.store.listChunks(rec.id)).filter((c) => c.track === "teacher").reduce((n, c) => n + c.tEndMs - c.tStartMs, 0) / 1000);
    this.events.emit("error", new RecorderError("start_failed", `The school server never started this recording (${why}). The ${kept} s recorded are kept on this laptop but cannot be sent; they stay until someone discards them.`, { detail: { keptMs: kept * 1000 } }));
    if (this.active?.rec.id === rec.id) this.setState("error");
  }

  /** What a capture shows: never `recording` while no audio is being kept (N-B3). */
  private capturingState(a: Active): RecorderState {
    if (a.stalled || a.noMics) return "stalled";
    return a.rec.startedAtServer ? "recording" : "starting";
  }

  /** The server will not take this recording: explicit failed state, the held audio kept locally. */
  private async startFailed(a: Active, err: RecorderError) {
    a.capturing = false;
    this.o.source.forward(false);
    if (a.chunker?.started) a.chunker.flush();   // everything captured is stored (never thrown away)
    this.o.source.closeTracks();
    await this.io;
    if (err.refusal === "window_closed") await this.o.backend.abandon(a.rec.id, "the window closed before capture started").catch(() => null);
    a.rec.phase = "abandoned"; a.rec.serverStatus = "abandoned";
    await this.saveRec(a.rec);
    const kept = Math.round((await this.o.store.listChunks(a.rec.id)).filter((c) => c.track === "teacher").reduce((n, c) => n + c.tEndMs - c.tStartMs, 0) / 1000);
    this.events.emit("error", new RecorderError("start_failed", `NOT RECORDED on the server: ${err.message}. The ${kept} s captured before that are kept on this laptop (they cannot be sent); recording has stopped.`, { refusal: err.refusal, detail: { keptMs: kept * 1000 } }));
    this.setState("error");
    this.releaseWakeLock();
  }

  private onBatch(b: PcmBatch) {
    const a = this.active;
    const n = b.teacher.length;
    const perf = this.o.perfNow();
    const tMs = a?.chunker ? frameToMs(a.chunker.position, this.o.source.sampleRate) : 0;
    const events = this.health.push(b.teacher, b.room, tMs);
    for (const e of events) {
      this.events.emit("health", e);
      // Ruling (a), client side: a silent / dead microphone is said at once.
      // The chunks are still sent; nothing is deleted.
      if (a?.capturing && e.kind === "clipping") {
        // Field finding: the lapel peaked at 0.0 dBFS. Shown on the meter (level.clipping) and, at most every 30 s, as a warning.
        const last = a.clipAlertAt?.[e.track] ?? -1e15;
        if (perf - last > 30000) {
          a.clipAlertAt = { ...(a.clipAlertAt ?? {}), [e.track]: perf };
          this.events.emit("error", new RecorderError("clipping", `The ${e.track} microphone is CLIPPING (its peaks reach 0 dBFS, the sound is distorted): turn its gain or volume down`, { detail: e }));
        }
      }
      if (a?.capturing && (e.kind === "flat" || e.kind === "dead_mic" || e.kind === "silence"))
        this.events.emit("error", new RecorderError("mic_silent", `The ${e.track} microphone is silent${e.kind === "flat" ? " (no signal at all)" : ""}: check that it is switched on and not muted`, { detail: e }));
    }
    if (a) for (const t of ["teacher", "room"] as TrackRole[]) if (this.health.last[t].clipped > 0) a.lastClipPerf = { ...(a.lastClipPerf ?? {}), [t]: perf };
    if (perf - this.lastLevelAt > 100) {
      this.lastLevelAt = perf;
      // clipping: a sample at full scale within the last 2 s, per track - the meter shows it.
      const clipping = { teacher: perf - (a?.lastClipPerf?.teacher ?? -1e15) < 2000, room: perf - (a?.lastClipPerf?.room ?? -1e15) < 2000 };
      this.events.emit("level", { teacher: this.health.last.teacher, room: this.health.last.room, tMs, clipping });
    }
    if (!a || !a.capturing || !a.chunker) return;
    a.lastAudioPerf = perf;
    if (a.stalled) this.leaveStall(a, perf);
    this.ledger(a, perf, n);
    if (a.rec.format === "opus-webm") { a.chunker.push(b.frame, new Int16Array(n), new Int16Array(n)); return; } // position only
    const t16 = new Int16Array(n), r16 = new Int16Array(n);
    floatToInt16(b.teacher, t16);
    floatToInt16(b.room, r16);
    a.chunker.push(b.frame, t16, r16);
    for (const t of a.rec.tracks) t.framesCaptured = a.chunker.captured[t.track];
  }

  private onSegment(s: RawSegment) {
    const a = this.active;
    if (!a) return;
    const id = a.rec.id;
    this.chain(() => this.o.store.putSegment({ recordingId: id, track: s.track, seq: s.seq, index: s.index, startFrame: s.startFrame, samples: s.samples }));
  }

  private onRawChunk(c: RawChunk) {
    const a = this.active;
    if (!a || a.rec.format === "opus-webm") return;
    const rec = a.rec;
    // M6: encoded in the worker; the job is posted now, so the order holds.
    const job = this.encoder.encode(rec.format, c.samples, rec.sampleRate);
    const startFrame = c.startFrame, endFrame = c.startFrame + c.samples.length;
    const ts = this.o.source.timestamp();
    rec.anchors.push({ t_ms: frameToMs(endFrame, rec.sampleRate), context_time: ts.contextTime, performance_now: ts.performanceNow, date_now: this.o.now(), server_offset_ms: this.offsetMs });
    const createdAt = this.serverNow();
    this.chain(async () => {
      const base = {
        recordingId: rec.id, track: c.track, seq: c.seq, startFrame, endFrame, sampleRate: rec.sampleRate,
        tStartMs: frameToMs(startFrame, rec.sampleRate), tEndMs: frameToMs(endFrame, rec.sampleRate),
        state: "captured" as const, attempts: 0, createdAt,
      };
      let enc;
      try { enc = await job; }
      catch (e) { await this.hole(rec, { ...base, byteSize: 0, sha256: "", mime: "", ext: "", encoding: "" }, e); return; }
      const meta: ChunkMeta = { ...base, byteSize: enc.bytes.length, sha256: enc.sha256, mime: enc.mime, ext: enc.ext, encoding: enc.encoding, encodeMs: Math.round(enc.encodeMs * 10) / 10 };
      if (await this.storeChunk(rec, meta, enc.bytes)) await this.o.store.deleteSegments(rec.id, c.track, c.seq);
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
    const createdAt = this.serverNow();
    this.chain(async () => {
      const meta: ChunkMeta = {
        recordingId: rec.id, track: b.track, seq: b.seq, startFrame, endFrame, sampleRate: rec.sampleRate,
        tStartMs: frameToMs(startFrame, rec.sampleRate), tEndMs: frameToMs(endFrame, rec.sampleRate),
        byteSize: b.bytes.length, sha256: await sha256Hex(b.bytes), mime: FORMAT_MIME["opus-webm"], ext: FORMAT_EXT["opus-webm"], encoding: "opus",
        state: "captured", attempts: 0, createdAt,
      };
      await this.storeChunk(rec, meta, b.bytes);
    });
  }

  // ------------------------------------------------------------ the local store (M3)

  /**
   * Store a chunk. A failed write never drops it silently (M3): on a quota
   * error the bytes of chunks the SERVER HAS CONFIRMED are freed first (they
   * are safe; this relaxes "only after complete" under pressure only) and it
   * is tried again; if it still fails it is HELD IN MEMORY and retried, with
   * later chunks of its track held behind it so the order holds. Beyond the
   * memory limit capture stops with a loud error. A write that can never
   * succeed is a hole: the track ends there and the manifest says so.
   * Returns true when the chunk is in the store.
   */
  private async storeChunk(rec: LocalRecording, meta: ChunkMeta, bytes: Uint8Array): Promise<boolean> {
    const k = `${rec.id}|${meta.track}`;
    if ((this.parked.get(k) ?? []).length) { this.park(rec, meta, bytes, null); return false; }
    const r = await this.tryStore(rec, meta, bytes);
    if (r === true) { await this.afterStored(rec, meta); return true; }
    if (r.permanent) { await this.hole(rec, meta, r.err); return false; }
    this.park(rec, meta, bytes, r.err);
    return false;
  }

  private async tryStore(rec: LocalRecording, meta: ChunkMeta, bytes: Uint8Array): Promise<true | { permanent: boolean; err: RecorderError }> {
    let last: RecorderError | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await this.o.store.addChunk(meta, bytes); return true; }
      catch (e: any) {
        const msg = String(e?.message ?? e);
        // m4: the store already holds DIFFERENT audio under this number: it can never succeed.
        if (/different audio/i.test(msg)) return { permanent: true, err: new RecorderError("local_store_failed", `The ${meta.track} chunk ${meta.seq} could not be stored: ${msg}`) };
        const quota = e?.name === "QuotaExceededError" || /quota/i.test(msg);
        last = quota ? new RecorderError("quota", "The browser refused to store more audio: making room", { detail: msg }) : new RecorderError("local_store_failed", `The browser did not store a chunk (${msg}): trying again`, { detail: msg });
        if (attempt === 0) this.events.emit("error", last);
        if (quota) await this.freeConfirmedBytes();
        else await new Promise((res) => setTimeout(res, 200 * (attempt + 1)));
      }
    }
    return { permanent: false, err: last! };
  }

  /** Free the local bytes of chunks the server has confirmed (own recordings only). */
  private async freeConfirmedBytes(): Promise<number> {
    let n = 0;
    for (const r of await this.mine()) n += await this.o.store.deleteConfirmedBytes(r.id).catch(() => 0);
    return n;
  }

  private park(rec: LocalRecording, meta: ChunkMeta, bytes: Uint8Array, err: RecorderError | null) {
    const k = `${rec.id}|${meta.track}`;
    const list = this.parked.get(k) ?? [];
    if (list.some((p) => p.meta.seq === meta.seq)) return;
    list.push({ rec, meta, bytes });
    this.parked.set(k, list);
    this.parkedBytes += bytes.length;
    if (err) this.events.emit("error", new RecorderError(err.code, `The browser would not store the audio: ${list.length} chunk(s) of the ${meta.track} track are held in memory and retried. Keep this page open.`, { detail: err.detail }));
    const a = this.active;
    if (this.parkedBytes > this.o.memoryHoldBytes && a?.rec.id === rec.id && a.capturing) {
      this.events.emit("error", new RecorderError("quota", "Recording STOPPED: the browser will not store more audio and memory is full. The audio held so far is kept; free disk space and keep this page open."));
      this.serial(() => this.endCapture("manual"));
    }
  }

  private hasParked(recordingId: string) { return [...this.parked.keys()].some((k) => k.startsWith(`${recordingId}|`) && this.parked.get(k)!.length > 0); }

  private async retryParked() {
    for (const [k, list] of [...this.parked.entries()]) {
      while (list.length) {
        const p = list[0];
        const r = await this.tryStore(p.rec, p.meta, p.bytes);
        if (r !== true && !r.permanent) break;
        list.shift();
        this.parkedBytes -= p.bytes.length;
        if (r === true) await this.afterStored(p.rec, p.meta);
        else await this.hole(p.rec, p.meta, r.err);
      }
      if (!list.length) this.parked.delete(k);
    }
  }

  private async afterStored(rec: LocalRecording, meta: ChunkMeta) {
    const t = rec.tracks.find((x) => x.track === meta.track);
    if (t) t.framesWritten = Math.max(t.framesWritten, meta.endFrame);
    rec.updatedAt = this.serverNow();
    await this.saveRec(rec);
    this.events.emit("chunk", meta);
    void this.drive(rec.id);
  }

  /** A chunk that cannot be stored: the track ends at it (the part before completes), said loudly and in the manifest. */
  private async hole(rec: LocalRecording, meta: ChunkMeta, e: unknown) {
    const t = rec.tracks.find((x) => x.track === meta.track);
    if (t && (t.refusedFromSeq === undefined || meta.seq < t.refusedFromSeq)) { t.refusedFromSeq = meta.seq; t.refusedReason = "local_store_failed"; }
    rec.discontinuities.push({ t_ms: meta.tStartMs, kind: "local_store_failed", wall_gap_ms: meta.tEndMs - meta.tStartMs, track: meta.track });
    await this.saveRec(rec);
    this.events.emit("error", new RecorderError("local_store_failed", `The ${meta.track} chunk ${meta.seq} could not be stored on this laptop (${String((e as any)?.message ?? e)}): the ${meta.track} track ends there; everything before it is kept and sent`, { detail: { track: meta.track, seq: meta.seq } }));
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
    if (a.chunker?.started) a.chunker.flush();
    this.o.source.closeTracks();
    await this.io; // every chunk stored (or held in memory)
    const rec = a.rec;
    if (!rec.startedAtServer && rec.format === "opus-webm") {
      // Opus records only from the server's answer: nothing was captured.
      await this.o.backend.abandon(rec.id, "stopped before the server saw the start").catch(() => null);
      rec.phase = "abandoned"; rec.serverStatus = "abandoned";
      await this.saveRec(rec);
      this.setState("abandoned");
      this.releaseWakeLock();
      return;
    }
    // N-B1: stopped before the server answered the Start: the audio is all
    // stored; driveOnce starts the recording late (if the server still can)
    // and then stops it, or says plainly that it never can.
    if (!rec.startedAtServer)
      this.events.emit("error", new RecorderError("server_unavailable", `Stopped before the school server confirmed the start. The ${Math.round(this.capturedMs(a) / 1000)} s recorded are kept on this laptop and will be sent if the server still accepts this recording.`, { retryable: true }));
    rec.phase = "stopped";
    rec.stopReason = reason;
    rec.stopPending = true;
    rec.clientEndedAt = new Date(this.o.now()).toISOString();
    rec.serverOffsetAtEnd = this.offsetMs;
    rec.updatedAt = this.serverNow();
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
      if (contiguous.length && (t.refusedFromSeq === undefined || next < t.refusedFromSeq)) {
        const total = contiguous.reduce((n, s) => n + s.samples.length, 0);
        const samples = new Int16Array(total);
        let off = 0;
        for (const s of contiguous) { samples.set(s.samples, off); off += s.samples.length; }
        const enc = await this.encoder.encode(rec.format, samples, rec.sampleRate);
        const startFrame = next * F, endFrame = startFrame + total;
        const meta: ChunkMeta = {
          recordingId: rec.id, track: t.track, seq: next, startFrame, endFrame, sampleRate: rec.sampleRate,
          tStartMs: frameToMs(startFrame, rec.sampleRate), tEndMs: frameToMs(endFrame, rec.sampleRate),
          byteSize: enc.bytes.length, sha256: enc.sha256, mime: enc.mime, ext: enc.ext, encoding: enc.encoding,
          state: "captured", attempts: 0, createdAt: this.serverNow(),
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

  /**
   * A microphone stopped (its track `ended`, it left the device list, or it
   * is no longer live). Field finding: the room S500 ended at 54:51 of a real
   * lesson and nothing brought it back. Now: said loudly AT ONCE, the other
   * microphone keeps recording (this track carries silence so both stay on
   * one timeline), a gap marker is written, and the same device is sought
   * again - by its id, then by its label (Windows gives a re-plugged device a
   * new id) - for the rest of the lesson unless `deviceRetryMs` says otherwise.
   */
  private onTrackEnded(role: TrackRole) {
    const a = this.active;
    if (!a || !a.capturing) return;
    if (a.lostSince[role] !== undefined || a.chunker?.isClosed(role)) return;
    a.lostSince[role] = this.o.perfNow();
    a.lastReopenTry[role] = -1e15;
    a.lostAlerted = { ...(a.lostAlerted ?? {}), [role]: false };
    const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
    a.rec.discontinuities.push({ t_ms: tMs, kind: "device_lost", wall_gap_ms: 0, track: role });
    const other = role === "teacher" ? "room" : "teacher";
    this.events.emit("health", { kind: "device_unplugged", track: role, tMs });
    this.events.emit("error", new RecorderError("device_unplugged", `The ${role} microphone STOPPED: check its cable / USB plug. The ${other} microphone is still recording; the ${role} one is being looked for again.`, { detail: role }));
    void this.queueMarker("device_change", `${role} microphone lost`);
    void this.queueMarker("gap", `${role} microphone stopped`);
    // N-B3: with EVERY microphone gone nothing is being recorded, whatever the
    // worklet still delivers (zeros): a distinct, loud state, never `recording`.
    const open = a.rec.tracks.filter((t) => !a.chunker?.isClosed(t.track));
    if (open.length && open.every((t) => a.lostSince[t.track] !== undefined) && !a.noMics) {
      a.noMics = true;
      this.setState("stalled");
      this.events.emit("health", { kind: "capture_stalled", tMs, contextState: "no microphone" });
      this.events.emit("error", new RecorderError("capture_stalled", "NOT RECORDING: both microphones are gone (a USB hub or the laptop's USB power?). Plug them back in - both are being looked for, and recording resumes by itself when one is found. Nothing recorded meanwhile counts.", { detail: { contextState: "no microphone" } }));
    }
    this.retryLostDevices();
  }

  /** The device list changed: a recording microphone that left it is lost now; a lost one may be back. */
  private async onDeviceChange() {
    const a = this.active;
    if (!a || !a.capturing) return;
    const devs = await this.o.source.listDevices().catch(() => null);
    if (!devs) return;
    for (const t of a.rec.tracks) {
      if (a.lostSince[t.track] !== undefined || a.chunker?.isClosed(t.track)) continue;
      if (!devs.some((d) => d.deviceId === t.deviceId)) this.onTrackEnded(t.track);
    }
    for (const role of Object.keys(a.lostSince) as TrackRole[]) a.lastReopenTry[role] = -1e15;
    this.retryLostDevices();
  }

  /** Reopen a lost microphone: the same id first, then the same device by its label (never another one). */
  private async reacquire(a: Active, role: TrackRole, info: TrackInfo): Promise<TrackOpen> {
    try { return await this.o.source.reopen(role, info.deviceId); }
    catch (first) {
      const devs = await this.o.source.listDevices();
      const r = resolveDevice({ deviceId: info.deviceId, groupId: "", label: info.deviceLabel }, devs);
      const other = a.rec.tracks.find((t) => t.track !== role);
      if (r.status !== "ok" || r.device.deviceId === info.deviceId || r.device.deviceId === other?.deviceId) throw first;
      const o = await this.o.source.reopen(role, r.device.deviceId);
      info.deviceId = r.device.deviceId;
      info.deviceHash = await sha256Hex(r.device.deviceId);
      return o;
    }
  }

  private retryLostDevices() {
    const a = this.active;
    if (!a) return;
    for (const role of Object.keys(a.lostSince) as TrackRole[]) {
      const since = a.lostSince[role]!;
      const lap = this.o.perfNow();
      if (lap - since > this.o.deviceLostAlertMs && !a.lostAlerted?.[role]) {
        a.lostAlerted = { ...(a.lostAlerted ?? {}), [role]: true };
        const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
        this.events.emit("health", { kind: "device_lost", track: role, tMs });
        this.events.emit("error", new RecorderError("device_lost", `The ${role} microphone has been gone for ${Math.round((lap - since) / 1000)} s: plug it back in - it is still being looked for, and recording resumes on it when it is found`));
      }
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
      // Every 2 s for the first minute, then every 10 s (a devicechange tries at once).
      const every = lap - since > 60000 ? Math.max(this.o.deviceRetryEveryMs, 10000) : this.o.deviceRetryEveryMs;
      if (lap - (a.lastReopenTry[role] ?? -1e15) < every) continue;
      if (a.reopening?.[role]) continue;
      a.lastReopenTry[role] = lap;
      const info = a.rec.tracks.find((t) => t.track === role);
      if (!info) continue;
      a.reopening = { ...(a.reopening ?? {}), [role]: true };
      // N-M7: a re-open that never answers (getUserMedia has no timeout) must not end the search.
      const attempt = new Promise<TrackOpen>((ok, no) => {
        const t = setTimeout(() => no(new Error("the microphone did not answer in 10 s")), this.o.reopenTimeoutMs);
        this.reacquire(a, role, info).then((o) => { clearTimeout(t); ok(o); }, (e) => { clearTimeout(t); no(e); });
      });
      void attempt.then(async (o) => {
        if (a.lostSince[role] === undefined) return;
        delete a.lostSince[role];
        const tMs = a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0;
        const gone = Math.round(this.o.perfNow() - since);
        a.rec.discontinuities.push({ t_ms: tMs, kind: "device_restored", wall_gap_ms: gone, track: role });
        info.appliedSettings = o.applied; info.notHonoured = o.notHonoured;
        info.deviceLabel = o.label || info.deviceLabel;
        this.events.emit("health", { kind: "device_restored", track: role, tMs });
        if (a.noMics) {
          a.noMics = false;
          this.events.emit("health", { kind: "capture_resumed", tMs, gapMs: gone });
          if (a.capturing) this.setState(this.capturingState(a));
        }
        void this.queueMarker("device_change", `${role} microphone back`);
        void this.queueMarker("gap", `${role} microphone back after ${Math.round(gone / 1000)} s`);
        // m2: the reopened microphone is read back and checked like the first time.
        this.events.emit("constraints", { track: role, requested: o.requested, applied: o.applied, notHonoured: o.notHonoured });
        if (o.notHonoured.some((x) => !x.startsWith("channelCount")))
          this.events.emit("error", new RecorderError("constraint_not_honoured", `The browser kept processing on for the reopened ${role} microphone: ${o.notHonoured.join(", ")}`, { detail: o.notHonoured }));
        const other = a.rec.tracks.find((t) => t.track !== role);
        if (other && o.groupId && (await sha256Hex(o.groupId)) === other.groupHash)
          this.events.emit("error", new RecorderError("same_device_twice", `The reopened ${role} microphone is the same device as the ${other.track} one: run the microphone check`));
        info.groupHash = await sha256Hex(o.groupId || "");
        if (a.rec.startedAtServer && this.o.backend.updateTrack)
          await this.o.backend.updateTrack(a.rec.id, role, { applied_settings: { ...o.applied, not_honoured: o.notHonoured } }).catch((e) => this.events.emit("error", toRecorderError(e)));
      }).catch(() => { /* still gone; tried again later */ })
        .finally(() => { if (a.reopening) a.reopening[role] = false; });
    }
  }

  /** A track that is no longer live although no `ended` reached the page. */
  private checkTracksLive() {
    const a = this.active;
    if (!a || !a.capturing || !this.o.source.trackLive) return;
    for (const t of a.rec.tracks) {
      if (a.lostSince[t.track] !== undefined || a.chunker?.isClosed(t.track) || a.reopening?.[t.track]) continue;
      if (!this.o.source.trackLive(t.track)) this.onTrackEnded(t.track);
    }
  }

  private async queueMarker(kind: MarkerKind, label: string) {
    try { if (this.active?.chunker?.started) await this.marker(kind, { label }); } catch { /* best effort */ }
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

  /** M2: an abandoned recording keeps no labels (children's names) and no audio the server has. */
  private async afterAbandoned(recordingId: string) {
    await this.o.store.deleteConfirmedBytes(recordingId).catch(() => 0);
    await this.forgetLabels(recordingId);
  }

  private async forgetLabels(recordingId: string) {
    for (const m of await this.o.store.listMarkers(recordingId)) {
      if (m.label === null && m.studentId === null) continue;
      await this.o.store.putMarker({ ...m, label: null, studentId: null });
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
    const row = await this.o.backend.complete(rec.id, path, saved.sha256);
    rec.serverStatus = row.status;
    if (row.status === "complete") {
      rec.phase = "complete";
      await this.saveRec(rec);
      // M2: the server confirmed every chunk AND the recording is complete:
      // the whole local copy goes - audio, chunk rows, markers (labels), manifest.
      await this.o.store.deleteConfirmedBytes(rec.id);
      await this.o.store.purgeRecording(rec.id, { allowUnconfirmed: false }).catch((e) => this.events.emit("error", toRecorderError(e)));
      if (this.active?.rec.id === rec.id) { this.active.rec.phase = "complete"; this.active.rec.serverStatus = "complete"; this.setState("complete"); }
    }
  }

  /**
   * Save the controller's copy of a recording WITHOUT undoing what the
   * uploader wrote meanwhile (a track ended by a permanent refusal or a
   * hole, and its discontinuity): those are merged in, never overwritten,
   * and copied back into memory.
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
      for (const d of stored.discontinuities ?? []) {
        if (!rec.discontinuities.some((x) => x.kind === d.kind && x.t_ms === d.t_ms && x.track === d.track && x.wall_gap_ms === d.wall_gap_ms)) rec.discontinuities.push(d);
      }
      if (!rec.ownerUserId && stored.ownerUserId) rec.ownerUserId = stored.ownerUserId;
    }
    await this.o.store.putRecording(rec);
  }

  // ------------------------------------------------------------ server

  async measureClock(): Promise<number | null> {
    try {
      const sentP = this.o.perfNow();
      const iso = await this.o.backend.serverTime();
      const gotP = this.o.perfNow();
      const rttMs = gotP - sentP;
      // The server's time is taken to be at the request's midpoint; carried to gotP on the monotonic clock.
      const server = Date.parse(iso) + rttMs / 2;
      if (!Number.isFinite(server)) throw new Error(`unreadable server time ${iso}`);
      // N-M3: a slow round trip says little about when the server answered
      // (up to rtt/2 wrong). Keep a measurement only when the trip was fast;
      // otherwise keep the one we have and try again in a minute. With none
      // yet, take it provisionally and re-measure soon.
      if (rttMs > this.o.clockMaxRttMs && this.serverAt !== null) {
        this.lastOffsetAt = gotP - 9 * 60000;
        return this.offsetMs;
      }
      const before = this.serverAt === null ? null : this.serverNow();
      this.serverAt = server; this.perfAt = gotP;
      const offsetMs = Math.round(server - this.o.now());
      this.offsetMs = offsetMs;
      this.lastOffsetAt = rttMs > this.o.clockMaxRttMs ? gotP - 9 * 60000 : gotP;
      const a = this.active;
      if (before !== null && Math.abs(server - before) > 5000 && a && (a.capturing || a.rec.phase === "stopped")) {
        // The monotonic estimate itself was off (a sleep the clock did not count): logged, now corrected.
        a.rec.discontinuities.push({ t_ms: a.chunker ? frameToMs(a.chunker.position, a.rec.sampleRate) : 0, kind: "clock_change", wall_gap_ms: Math.round(server - before) });
      }
      this.events.emit("clock", { offsetMs, rttMs, warning: Math.abs(offsetMs) > CLOCK_WARN_MS });
    } catch (e) {
      this.lastOffsetAt = this.o.perfNow() - 9 * 60000; // retry in a minute
      // De-duplicated: said once, then at most every 10 minutes (an outage is many retries).
      const p = this.o.perfNow();
      if (p - this.lastClockErrorAt > 10 * 60000) {
        this.lastClockErrorAt = p;
        this.events.emit("error", new RecorderError("clock_unknown", "The server's time could not be read", { detail: String((e as any)?.message ?? e) }));
      }
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
    this.lastStorageCheck = this.o.perfNow();
    const sm = typeof navigator !== "undefined" ? (navigator as any).storage : null;
    if (!sm?.estimate) return null;
    try {
      const persisted = force && sm.persist ? await sm.persist().catch(() => null) : (sm.persisted ? await sm.persisted().catch(() => null) : null);
      const { usage = 0, quota = 0 } = await sm.estimate();
      const free = quota - usage;
      const warning = free < this.o.storageWarnBytes;
      this.events.emit("storage", { usage, quota, free, persisted, warning });
      if (warning) this.events.emit("error", new RecorderError("storage_low", `Only ${Math.round(free / 1e6)} MB of browser storage is free`, { detail: { usage, quota } }));
      // M3: stop BEFORE the browser starts refusing chunks.
      const a = this.active;
      if (a?.capturing && free < this.o.storageStopBytes) {
        this.events.emit("error", new RecorderError("quota", `Recording STOPPED: only ${Math.round(free / 1e6)} MB of browser storage is left. The audio so far is kept and sent.`, { detail: { usage, quota } }));
        this.serial(() => this.endCapture("manual"));
      }
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
        if ((this.active && (this.active.capturing || this.active.rec.phase === "armed")) || this.parked.size) { e.preventDefault(); (e as any).returnValue = ""; }
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

  private setState(s: RecorderState) {
    if (this._state === s) return;
    this._state = s;
    if (typeof document !== "undefined" && this.active) {
      const title = document.title.replace(/^(● RECORDING|◌ ARMED|⚠ NOT RECORDING) - /, "");
      document.title = s === "recording" || s === "starting" ? `● RECORDING - ${title}` : s === "stalled" ? `⚠ NOT RECORDING - ${title}` : s === "armed" ? `◌ ARMED - ${title}` : title;
    }
    this.events.emit("state", { state: s, recordingId: this.active?.rec.id ?? null });
  }
}
