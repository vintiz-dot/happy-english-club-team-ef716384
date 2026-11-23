// The iPhone app's microphone (23 Nov 2026; the app is ios-phone-mic/).
//
// Why: Safari, and a web page in an app's web view, lose the microphone when
// the screen locks (docs/RECORDER_RUNBOOK.md). The app records with iOS's own
// audio engine instead, which keeps running behind a locked screen once it
// was started in front (UIBackgroundModes audio). It is ONLY a microphone:
// the phone page, inside the app, still runs the one recorder there is -
// PhoneTeacherTrack, with the timeline rules, FLAC, register / upload / read
// back / confirm, all as the signed-in teacher. Nothing about the recording
// is decided in Swift.
//
// The plugin (HecPhoneMic, ios-phone-mic/ios-src/HecPhoneMicPlugin.swift):
//   start()  asks for the microphone, sets the audio session, starts capture;
//   read({ after, max }) returns the batches after `after` (16-bit, 48 kHz,
//            mono, base64) and lets go of the ones up to `after`. Batches wait
//            on the phone (memory, then files) until read, so a web view
//            paused while the phone is locked loses nothing: each batch
//            carries the wall-clock time its last sample was heard;
//   stop(), status().
// `NativeMicFeed` reads every quarter second and pushes into the track; an
// interruption (a call, Siri) or a hole in the batches breaks the stretch,
// so what follows is placed by the clock, as after any gap.
//
// Pure: the plugin and the sink are injected.

export interface NativeBatch {
  seq: number;
  /** Wall-clock ms (Date.now() scale) when the batch's LAST sample was heard. */
  endUnixMs: number;
  sampleRate: number;
  frames: number;
  /** Little-endian Int16, base64. */
  b64: string;
}

export interface NativeEvent { kind: "interrupted" | "resumed" | "route_changed" | "restarted" | "error"; atUnixMs: number; detail?: string | null }

export interface NativeReadResult {
  batches: NativeBatch[];
  /** Events since the last read. */
  events?: NativeEvent[];
  running: boolean;
  /** Batches still waiting after these. */
  waiting?: number;
}

export interface NativeMicStatus { running: boolean; permission: "granted" | "denied" | "undetermined"; waiting: number; lastError: string | null; sampleRate: number }

export interface NativeMicPlugin {
  start(o?: { keepScreenOn?: boolean }): Promise<NativeMicStatus>;
  stop(): Promise<NativeMicStatus>;
  read(o: { after: number; max?: number }): Promise<NativeReadResult>;
  status(): Promise<NativeMicStatus>;
}

/** The plugin, when this page runs inside the iPhone app (null in a browser). */
export function nativeMicPlugin(w: any = typeof window !== "undefined" ? window : undefined): NativeMicPlugin | null {
  const cap = w?.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) return null;
  if (typeof cap.isPluginAvailable === "function" && !cap.isPluginAvailable("HecPhoneMic")) return null;
  const p = cap.Plugins?.HecPhoneMic ?? (typeof cap.registerPlugin === "function" ? cap.registerPlugin("HecPhoneMic") : null);
  return p && typeof p.read === "function" ? (p as NativeMicPlugin) : null;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = (() => { const t = new Int16Array(256).fill(-1); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })();

/** base64 of little-endian Int16 -> Int16Array (no atob: also runs in Node and JavaScriptCore). */
export function int16FromBase64(b64: string): Int16Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let o = 0, acc = 0, bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = LOOKUP[clean.charCodeAt(i)];
    if (v < 0) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; bytes[o++] = (acc >> bits) & 0xff; }
  }
  const n = Math.floor(o / 2);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) { const u = bytes[2 * i] | (bytes[2 * i + 1] << 8); out[i] = u >= 0x8000 ? u - 0x10000 : u; }
  return out;
}

/** Int16Array -> base64 (the tests' fake plugin, and anything that needs to send PCM the plugin's way). */
export function int16ToBase64(s: Int16Array): string {
  const bytes = new Uint8Array(s.buffer, s.byteOffset, s.byteLength);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? B64[n & 63] : "=");
  }
  return out;
}

export interface NativeSink {
  /** 16-bit samples whose last one was heard at wall-clock `endUnixMs`. */
  pushInt16(s: Int16Array, endUnixMs: number): void;
  /** A break in the capture: what follows starts a new stretch, on the clock. */
  breakStretch(remeasure?: boolean): Promise<void> | void;
}

export interface NativeFeedView { running: boolean; read: number; waiting: number; lastBatchAt: number | null; interruptions: number; lastError: string | null }

/** Gaps between batches larger than this (ms of wall clock beyond their audio) break the stretch. */
export const NATIVE_HOLE_MS = 1000;

export class NativeMicFeed {
  private after = -1;
  private lastEnd: number | null = null;
  private sink: NativeSink | null = null;
  private reading: Promise<void> | null = null;
  private v: NativeFeedView = { running: false, read: 0, waiting: 0, lastBatchAt: null, interruptions: 0, lastError: null };
  /** Level of the last batch read (0..1), for the meter. */
  level = 0;

  constructor(private plugin: NativeMicPlugin, private onView?: (v: NativeFeedView) => void, private onAudio?: (s: Int16Array) => void) {}

  get view(): NativeFeedView { return this.v; }
  private set(p: Partial<NativeFeedView>) { this.v = { ...this.v, ...p }; this.onView?.(this.v); }

  async start(o?: { keepScreenOn?: boolean }) {
    const st = await this.plugin.start(o);
    this.set({ running: st.running, waiting: st.waiting, lastError: st.lastError });
  }

  /** Where batches go from now on (the teacher track, once joined). Before that, batches are read and let go. */
  attach(sink: NativeSink | null) { this.sink = sink; }

  /** Read what is waiting and push it, in order. One read at a time. */
  pull(max = 40): Promise<void> {
    if (this.reading) return this.reading;
    const run = (async () => {
      try {
        for (let rounds = 0; rounds < 50; rounds++) {
          const r = await this.plugin.read({ after: this.after, max });
          for (const e of r.events ?? []) {
            if (e.kind === "interrupted" || e.kind === "restarted" || e.kind === "route_changed") {
              this.set({ interruptions: this.v.interruptions + (e.kind === "interrupted" ? 1 : 0) });
              this.lastEnd = null;
              await this.sink?.breakStretch(true);
            }
            if (e.kind === "error") this.set({ lastError: e.detail ?? "the microphone failed" });
          }
          for (const b of r.batches) {
            if (b.seq <= this.after) continue; // read twice (a retried call): once is enough
            const s = int16FromBase64(b.b64);
            const durMs = s.length * 1000 / (b.sampleRate || 48000);
            // A hole between batches (frames lost in the engine, a restart the events did not say): a new stretch.
            if (this.lastEnd !== null && b.endUnixMs - durMs - this.lastEnd > NATIVE_HOLE_MS) await this.sink?.breakStretch(false);
            this.sink?.pushInt16(s, b.endUnixMs);
            this.onAudio?.(s);
            this.lastEnd = b.endUnixMs;
            this.after = b.seq;
            this.set({ read: this.v.read + 1, lastBatchAt: b.endUnixMs });
          }
          this.set({ running: r.running, waiting: r.waiting ?? 0 });
          if (!r.batches.length || !(r.waiting && r.waiting > 0)) break;
        }
      } catch (e: any) {
        this.set({ lastError: String(e?.message ?? e) });
      } finally { this.reading = null; }
    })();
    this.reading = run;
    return run;
  }

  async stop() {
    await this.pull().catch(() => {});
    const st = await this.plugin.stop().catch(() => null);
    this.set({ running: st?.running ?? false });
  }
}
