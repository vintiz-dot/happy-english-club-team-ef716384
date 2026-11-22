// The teacher's phone as the teacher microphone (22 Nov 2026).
//
// The laptop records the room (Anker S500) in "teacher mic on my phone" mode
// (DeviceProfile.teacherOnPhone): it arms and starts the recording as usual,
// describes and sends ONLY the room track, and waits before completing until
// this track is finished. The phone, signed in as the SAME teacher, joins that
// recording and sends the teacher track. The database already allows this: a
// recording's tracks and chunks are the recorder's (started_by = auth.uid()),
// whichever device sends them (20261112100000), so nothing new is trusted.
//
// The rules this file keeps, each because the server would otherwise refuse
// or the laptop would break:
//   - Nothing is registered before the laptop's FIRST room chunk is: the
//     laptop states pre_start_ms once, before any chunk of any track. A phone
//     chunk first would make that refused and end the laptop's recording.
//   - The timeline is the laptop's: t = 0 is started_at - pre_start_ms. The
//     phone measures the server's clock and places its first sample on it;
//     a chunk is at most chunk_ms; chunks of a stretch are contiguous by
//     sample count; after a gap (the phone slept, the tab was in the
//     background) the next chunk starts where the clock says, never earlier
//     (two chunks of one track may not overlap).
//   - Audio from before t = 0 is dropped; audio from after Stop is trimmed off.
//   - One chunk at a time: register, upload, read back, confirm. A chunk left
//     registered but unconfirmed would keep the laptop from completing.
//   - At the end the track's counts are stated, which lets the laptop finish.
//
// Pure: no DOM. The page feeds it PCM and the injected backend does the calls.

import type { RecorderBackend } from "./backend";
import type { ServerRecording } from "./types";
import { encodePcmChunk } from "./encoders";
import { floatToInt16, FORMAT_MIME } from "./chunkMath";
import { sha256Hex } from "./hash";
import { RecorderError, toRecorderError } from "./errors";

/** A gap of more than this between the clock and the samples starts a new stretch. */
export const PHONE_GAP_MS = 2000;

export interface PhoneJoinCheck { ok: boolean; reason?: string }

/**
 * May the phone join this recording as its teacher track? Only a recording
 * that is running, recorded by a laptop in phone mode (it says so in
 * client_info), in a lossless format, whose teacher track no laptop holds.
 */
export function phoneMayJoin(row: (ServerRecording & { client_info?: Record<string, unknown> | null }) | null,
  teacher: { exists: boolean; registered: number } | null): PhoneJoinCheck {
  if (!row) return { ok: false, reason: "No recording is running for you right now. Start the recorder on the laptop first." };
  if (row.status !== "recording") return { ok: false, reason: `The laptop's recording is ${row.status}: there is nothing to join.` };
  if (row.client_info?.teacher_on_phone !== true)
    return { ok: false, reason: "The laptop is recording your microphone itself. On the laptop, run Microphone check and choose \"My microphone is my phone\"." };
  if (row.format === "opus-webm") return { ok: false, reason: "This recording's format does not take a phone track." };
  void teacher;
  return { ok: true };
}

export interface PhoneStatus {
  phase: "waiting_for_laptop" | "recording" | "finishing" | "done" | "stopped_by_server" | "error";
  sentChunks: number;
  queued: number;
  sentMs: number;
  lastError: string | null;
}

interface Pending { seq: number; samples: Int16Array; tStartMs: number; tEndMs: number }

export interface PhoneTrackOptions {
  backend: RecorderBackend;
  recording: ServerRecording;
  sampleRate: number;
  deviceLabel: string;
  appliedSettings?: Record<string, unknown>;
  /** Monotonic clock (default performance.now). */
  perfNow?: () => number;
  /** Wait between retries (tests pass 0). */
  retryMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onStatus?: (s: PhoneStatus) => void;
}

export class PhoneTeacherTrack {
  private o: Required<Omit<PhoneTrackOptions, "appliedSettings" | "onStatus">> & Pick<PhoneTrackOptions, "appliedSettings" | "onStatus">;
  private rec: ServerRecording;
  /** server ms = perf ms + offset */
  private offset: number | null = null;
  /** t = 0 of the chunks, server ms; known once the laptop sent its first room chunk. */
  private origin: number | null = null;
  /** Samples not yet placed on the timeline (before the origin is known), with the server time of their first sample. */
  private held: { at: number; samples: Int16Array[]; n: number } | null = null;
  /** The current chunk being filled. */
  private cur: { tStartMs: number; parts: Int16Array[]; n: number } | null = null;
  /** End of the last chunk cut (ms on the timeline). */
  private lastEndMs = 0;
  private nextSeq = 0;
  private queue: Pending[] = [];
  private pumping: Promise<void> | null = null;
  private trackReady = false;
  private totalBytes = 0;
  private totalMs = 0;
  private sent = 0;
  private status: PhoneStatus = { phase: "waiting_for_laptop", sentChunks: 0, queued: 0, sentMs: 0, lastError: null };
  private finished = false;

  constructor(opts: PhoneTrackOptions) {
    this.o = {
      perfNow: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
      retryMs: 3000,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      ...opts,
    } as any;
    this.rec = opts.recording;
  }

  get chunkFrames(): number { return Math.round(this.rec.chunk_ms * this.o.sampleRate / 1000); }

  private say(patch: Partial<PhoneStatus>) {
    this.status = { ...this.status, ...patch, sentChunks: this.sent, queued: this.queue.length, sentMs: this.totalMs };
    this.o.onStatus?.(this.status);
  }

  /** The server's clock, measured over the round trip. */
  async measureClock(): Promise<void> {
    const sent = this.o.perfNow();
    const iso = await this.o.backend.serverTime();
    const got = this.o.perfNow();
    const server = Date.parse(iso) + (got - sent) / 2;
    if (!Number.isFinite(server)) throw new RecorderError("clock_unknown", `unreadable server time ${iso}`);
    this.offset = server - got;
  }

  serverNow(): number {
    if (this.offset === null) throw new RecorderError("clock_unknown", "The server's time has not been read yet");
    return this.o.perfNow() + this.offset;
  }

  /**
   * Is the laptop's timeline fixed yet (its first room chunk registered)? Then
   * read started_at / pre_start_ms and the next free seq of this track.
   */
  async tryOrigin(): Promise<boolean> {
    if (this.origin !== null) return true;
    const room = await this.o.backend.trackState!(this.rec.id, "room");
    if (room.registered < 1) return false;
    const row = await this.o.backend.getRecording(this.rec.id);
    if (!row || !row.started_at) return false;
    this.rec = row;
    this.origin = Date.parse(row.started_at) - (row.pre_start_ms ?? 0);
    const mine = await this.o.backend.trackState!(this.rec.id, "teacher");
    // A rejoin (the page was reloaded): carry on after what is there.
    this.nextSeq = mine.registered;
    this.lastEndMs = mine.lastEndMs;
    if (mine.exists) this.trackReady = true;
    this.say({ phase: "recording" });
    return true;
  }

  /** Feed captured audio: `samples` ended at perf time `perfAtEnd`. */
  push(samples: Float32Array, perfAtEnd = this.o.perfNow()) {
    if (this.finished || samples.length === 0) return;
    const i16 = new Int16Array(samples.length);
    floatToInt16(samples, i16);
    const msOf = (n: number) => n * 1000 / this.o.sampleRate;
    const startServer = perfAtEnd + (this.offset ?? 0) - msOf(i16.length);
    if (this.origin === null) {
      // Before the laptop's timeline is fixed: hold (contiguous), place later.
      if (!this.held) this.held = { at: startServer, samples: [], n: 0 };
      else if (startServer - (this.held.at + msOf(this.held.n)) > PHONE_GAP_MS) this.held = { at: startServer, samples: [], n: 0 };
      this.held.samples.push(i16); this.held.n += i16.length;
      // Never hold more than two minutes: older audio is dropped first.
      const max = this.o.sampleRate * 120;
      while (this.held.n > max && this.held.samples.length > 1) {
        const drop = this.held.samples.shift()!;
        this.held.n -= drop.length; this.held.at += msOf(drop.length);
      }
      return;
    }
    if (this.held) { const h = this.held; this.held = null; this.place(h.at, concat(h.samples, h.n)); }
    this.place(startServer, i16);
  }

  /** Put samples that started at server time `at` onto the timeline. */
  private place(at: number, s: Int16Array) {
    const msOf = (n: number) => n * 1000 / this.o.sampleRate;
    let t = at - this.origin!;
    // Before t = 0: dropped.
    if (t < 0) {
      const skip = Math.min(s.length, Math.ceil(-t * this.o.sampleRate / 1000));
      s = s.subarray(skip); t += msOf(skip);
      if (!s.length) return;
    }
    if (this.cur) {
      const curEnd = this.cur.tStartMs + msOf(this.cur.n);
      if (t - curEnd > PHONE_GAP_MS) this.cut(); // a gap: this stretch ends; the next starts at the clock
    }
    if (!this.cur) {
      // Never before the last chunk's end (no overlap); contiguous when there was no gap.
      const start = Math.max(Math.round(t), this.lastEndMs);
      this.cur = { tStartMs: start, parts: [], n: 0 };
    }
    let off = 0;
    while (off < s.length) {
      const room = this.chunkFrames - this.cur!.n;
      const take = Math.min(room, s.length - off);
      this.cur!.parts.push(s.subarray(off, off + take)); this.cur!.n += take; off += take;
      if (this.cur!.n >= this.chunkFrames) {
        const end = this.cut();
        this.cur = { tStartMs: end, parts: [], n: 0 };
      }
    }
    if (this.cur && this.cur.n === 0) this.cur = null;
    void this.pump();
  }

  /** Close the current chunk; returns its end (ms). */
  private cut(trimToMs?: number): number {
    const c = this.cur;
    this.cur = null;
    if (!c || c.n === 0) return this.lastEndMs;
    let samples = concat(c.parts, c.n);
    if (trimToMs !== undefined) {
      const keep = Math.max(0, Math.floor((trimToMs - c.tStartMs) * this.o.sampleRate / 1000));
      samples = samples.subarray(0, Math.min(samples.length, keep));
    }
    if (samples.length === 0) return this.lastEndMs;
    const tEnd = c.tStartMs + Math.max(1, Math.round(samples.length * 1000 / this.o.sampleRate));
    this.queue.push({ seq: this.nextSeq++, samples, tStartMs: c.tStartMs, tEndMs: tEnd });
    this.lastEndMs = tEnd;
    this.say({});
    return tEnd;
  }

  private async describeTrack() {
    if (this.trackReady) return;
    await this.o.backend.ensureTrack({
      recording_id: this.rec.id, track: "teacher", device_label: `Phone: ${this.o.deviceLabel}`.slice(0, 200),
      device_hash: await sha256Hex(`phone:${this.o.deviceLabel}`), sample_rate: this.o.sampleRate, channel_count: 1,
      codec: this.rec.format === "flac" ? "flac" : "pcm_s16le", bitrate: null,
      applied_settings: { ...(this.o.appliedSettings ?? {}), source: "phone" },
    });
    this.trackReady = true;
  }

  /** Send queued chunks one at a time, in order, retrying what can be retried. */
  pump(): Promise<void> {
    if (this.pumping) return this.pumping;
    // Nothing to send: return before anything is marked running (an async body
    // that finishes synchronously would otherwise leave `pumping` set for good).
    if (!this.queue.length) return Promise.resolve();
    const run = (async () => {
      await Promise.resolve(); // `pumping` is assigned before the body runs

      try {
        while (this.queue.length) {
          const c = this.queue[0];
          try {
            await this.describeTrack();
            await this.sendOne(c);
            this.queue.shift();
            this.sent += 1; this.totalMs += c.tEndMs - c.tStartMs;
            this.say({ lastError: null });
          } catch (e) {
            const err = toRecorderError(e);
            if (!err.retryable && err.code === "server_refused") {
              // The server will never take this chunk (after Stop, after the window...): it is dropped, and so is the rest.
              this.queue = [];
              this.say({ phase: this.finished ? "done" : "stopped_by_server", lastError: err.message });
              return;
            }
            this.say({ lastError: err.message });
            await this.o.sleep(this.o.retryMs);
          }
        }
      } finally { if (this.pumping === run) this.pumping = null; }
    })();
    this.pumping = run;
    return run;
  }

  private async sendOne(c: Pending) {
    const enc = encodePcmChunk(this.rec.format, c.samples, this.o.sampleRate);
    const sha = await sha256Hex(enc.bytes);
    const reg = await this.o.backend.registerChunk({
      recording: this.rec.id, track: "teacher", seq: c.seq, byteSize: enc.bytes.length, sha256: sha, tStartMs: c.tStartMs, tEndMs: c.tEndMs,
    });
    if (!reg.confirmed) {
      await this.o.backend.upload(reg.storage_path, enc.bytes, FORMAT_MIME[this.rec.format]);
      const back = await this.o.backend.download(reg.storage_path);
      const backSha = await sha256Hex(back);
      if (backSha !== sha) throw new RecorderError("server_unavailable", "The stored copy did not read back the same: sent again", { retryable: true });
      const ok = await this.o.backend.confirmChunk(reg.chunk_id, backSha);
      if (!ok) throw new RecorderError("server_unavailable", "The server did not confirm the chunk yet", { retryable: true });
    }
    this.totalBytes += enc.bytes.length;
  }

  /**
   * The end: flush what is left (trimmed to the laptop's Stop when there is
   * one), send everything, state the track's counts so the laptop can finish.
   */
  async finish(endedAt?: string | null): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    this.say({ phase: "finishing" });
    if (this.origin !== null) {
      const trim = endedAt ? Date.parse(endedAt) - this.origin : undefined;
      this.cut(trim);
      if (trim !== undefined) {
        // Nothing after the laptop's Stop: a queued chunk past it is cut short or dropped.
        this.queue = this.queue.flatMap((c) => {
          if (c.tStartMs >= trim) return [];
          if (c.tEndMs <= trim) return [c];
          const keep = Math.floor((trim - c.tStartMs) * this.o.sampleRate / 1000);
          return keep > 0 ? [{ ...c, samples: c.samples.subarray(0, keep), tEndMs: c.tStartMs + Math.max(1, Math.round(keep * 1000 / this.o.sampleRate)) }] : [];
        });
        // Dropped chunks freed their numbers only if they were the last ones.
        const kept = this.queue.map((c) => c.seq);
        const firstQueued = kept.length ? Math.min(...kept) : this.nextSeq;
        if (kept.length === 0 || kept.every((s, i) => s === firstQueued + i)) this.nextSeq = firstQueued + kept.length;
      }
      await this.pump();
      if (this.trackReady && this.queue.length === 0) {
        // Counts from what the server holds (a rejoin sent part of it earlier).
        const st = await this.o.backend.trackState!(this.rec.id, "teacher");
        await this.o.backend.setTrackCounts(this.rec.id, "teacher", { chunk_count: st.registered, total_bytes: st.totalBytes, total_ms: st.totalMs });
      }
    }
    this.say({ phase: "done" });
  }

  get state(): PhoneStatus { return this.status; }
}

function concat(parts: Int16Array[], n: number): Int16Array {
  if (parts.length === 1 && parts[0].length === n) return parts[0];
  const out = new Int16Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
