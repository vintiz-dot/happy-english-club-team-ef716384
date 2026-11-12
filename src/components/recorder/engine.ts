/**
 * The one door from the recorder screens to the capture engine
 * (src/lib/recorder). Screens never import the engine directly: they take an
 * `EngineApi` from RecorderDeps, and this file is the browser one. A preview
 * or a test swaps the whole object for a scripted stand-in.
 *
 * The probe below is the setup wizard's "test the microphones": it uses the
 * engine's own capture pieces (one AudioContext + worklet, exact deviceIds,
 * processing OFF, read back) so what the wizard hears is what a lesson
 * records. Nothing it captures is uploaded; the test clips live in memory as
 * blob: URLs and are dropped when the wizard closes.
 */

import {
  BrowserCaptureSource, createRecorder, encodeWav, floatToInt16, getInstallId, listInputs, loadProfile, measure,
  profileRow, saveProfile, supabaseBackend, swapVerdict, watchDevices,
  type DeviceProfile, type InputDevice, type Level, type Recorder, type SupabaseLike, type SwapMeasurement, type TrackRole,
} from "@/lib/recorder";

/** What the daily screen uses of a Recorder. */
export type RecorderLike = Pick<Recorder,
  "state" | "recordingId" | "on" | "prepare" | "recover" | "arm" | "marker" | "stop" | "swapMeasurement" | "extend" | "uploadProgress" | "dispose" | "serverNow" | "setProfile">;

export interface ProbeClip { url: string; seconds: number; peakDb: number }
export interface ProbeResult { teacher: ProbeClip; room: ProbeClip; swap: SwapMeasurement }

/** Both microphones open for the wizard: live levels, a short test recording. */
export interface Probe {
  onLevel(fn: (l: { teacher: Level; room: Level }) => void): () => void;
  /** Speech-weighted swap verdict over what was heard since the last reset. */
  swapSoFar(): SwapMeasurement;
  resetSwap(): void;
  record(seconds: number, onProgress?: (s: number) => void): Promise<ProbeResult>;
  notHonoured: Record<TrackRole, string[]>;
  close(): Promise<void>;
}

export interface EngineApi {
  createRecorder(o: { client: SupabaseLike; userId: string; profile: DeviceProfile | null }): Promise<RecorderLike>;
  loadProfile(userId: string): DeviceProfile | null;
  saveProfile(p: DeviceProfile): void;
  getInstallId(): string;
  /** Asks for the microphone permission once, so the list has labels. */
  requestPermission(): Promise<void>;
  listInputs(): Promise<InputDevice[]>;
  watchDevices(fn: (inputs: InputDevice[]) => void): () => void;
  openProbe(ids: { teacher: string; room: string }): Promise<Probe>;
  /** Saves the profile row (labels and hashes, never ids) to recorder_device_profiles as the signed-in teacher. */
  saveProfileToServer(client: SupabaseLike, p: DeviceProfile): Promise<string | null>;
  battery(): Promise<{ charging: boolean; level: number } | null>;
  userAgent(): string;
}

// The engine's swap test needs the louder track above this to count a window (health.ts default).
const SPEECH_DB = -40;

async function openBrowserProbe(ids: { teacher: string; room: string }): Promise<Probe> {
  const src = await BrowserCaptureSource.create(48000);
  await src.resume();
  let opened;
  try { opened = await src.openTracks(ids); }
  catch (e) { await src.close(); throw e; }
  const listeners = new Set<(l: { teacher: Level; room: Level }) => void>();
  let diffs: number[] = [];
  let sink: { teacher: Float32Array[]; room: Float32Array[] } | null = null;
  let lastEmit = 0;
  src.onBatch = (b) => {
    const t = measure(b.teacher), r = measure(b.room);
    if (Math.max(t.rmsDb, r.rmsDb) > SPEECH_DB) diffs.push(t.rmsDb - r.rmsDb);
    if (sink) { sink.teacher.push(b.teacher.slice()); sink.room.push(b.room.slice()); }
    const now = performance.now();
    if (now - lastEmit > 90) { lastEmit = now; for (const fn of listeners) fn({ teacher: t, room: r }); }
  };
  src.forward(true);
  const urls: string[] = [];
  const clip = (parts: Float32Array[]): ProbeClip => {
    const n = parts.reduce((k, p) => k + p.length, 0);
    const all = new Float32Array(n); let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    const pcm = new Int16Array(n); floatToInt16(all, pcm);
    const url = URL.createObjectURL(new Blob([encodeWav(pcm, src.sampleRate) as BlobPart], { type: "audio/wav" }));
    urls.push(url);
    return { url, seconds: n / src.sampleRate, peakDb: measure(all).peakDb };
  };
  return {
    onLevel(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    swapSoFar: () => swapVerdict(diffs, 20),
    resetSwap: () => { diffs = []; },
    async record(seconds, onProgress) {
      diffs = [];
      sink = { teacher: [], room: [] };
      const t0 = performance.now();
      await new Promise<void>((ok) => {
        const iv = setInterval(() => {
          const s = (performance.now() - t0) / 1000;
          onProgress?.(Math.min(seconds, s));
          if (s >= seconds) { clearInterval(iv); ok(); }
        }, 200);
      });
      const got = sink; sink = null;
      return { teacher: clip(got.teacher), room: clip(got.room), swap: swapVerdict(diffs, 20) };
    },
    notHonoured: { teacher: opened.teacher.notHonoured, room: opened.room.notHonoured },
    async close() {
      src.onBatch = null;
      for (const u of urls) URL.revokeObjectURL(u);
      await src.close();
    },
  };
}

export const browserEngine: EngineApi = {
  createRecorder: (o) => createRecorder(o),
  loadProfile,
  saveProfile,
  getInstallId,
  async requestPermission() {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    s.getTracks().forEach((t) => t.stop());
  },
  listInputs,
  watchDevices,
  openProbe: openBrowserProbe,
  async saveProfileToServer(client, p) {
    const row = await profileRow(p, navigator.userAgent);
    const { id } = await supabaseBackend(client).upsertDeviceProfile(row);
    return id ?? null;
  },
  async battery() {
    try {
      const b = await (navigator as any).getBattery?.();
      return b ? { charging: !!b.charging, level: Number(b.level) } : null;
    } catch { return null; }
  },
  userAgent: () => (typeof navigator !== "undefined" ? navigator.userAgent : ""),
};
