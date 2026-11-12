/**
 * Class recorder - browser capture core (workstream C2).
 *
 * Records a lesson as TWO separate mono tracks on ONE laptop: `teacher` (the
 * lapel receiver) and `room` (the Anker S500), from 5 minutes before the
 * scheduled start to the scheduled end + grace. It captures only; nothing is
 * analysed here. Pure TypeScript, no React: C3 builds the screens on this.
 *
 * ---------------------------------------------------------------- for C3
 *
 *   import { createRecorder, loadProfile, getInstallId } from "@/lib/recorder";
 *
 *   // 1. In the teacher's "Ready for today" click (the AudioContext may need it):
 *   const rec = await createRecorder({ client: supabase, userId: user.id, profile: loadProfile(user.id) });
 *   const ready = await rec.prepare();          // { contextRunning, devices, offsetMs }
 *   await rec.recover();                         // finish anything a closed tab left behind
 *
 *   // 2. Arm today's lesson (the server checks switch, consent, teacher, time):
 *   await rec.arm(scheduleEntry, { stopAt });    // stopAt: back-to-back rule (schedule.backToBack)
 *   //    capture starts by itself at capture_opens_at and stops at closes_at (or stopAt).
 *
 *   // 3. While recording:
 *   rec.marker("roll_call_start");  rec.marker("student_name", { studentId });
 *   rec.extend(untilMs);                         // "Keep recording", never past the hard limit
 *   await rec.stop();                            // Stop never needs permission
 *
 *   // 4. Render state and events:
 *   rec.on("state",  ({ state, recordingId }) => ...)   // RecorderState
 *   rec.on("level",  ({ teacher, room }) => ...)        // rmsDb, peakDb, clipped, ~10/s
 *   rec.on("health", (e) => ...)   // clipping | silence | dead_mic | flat | recovered |
 *                                  // roles_maybe_swapped (with the measurement) |
 *                                  // device_unplugged | device_restored | device_lost
 *   rec.on("constraints", ({ track, requested, applied, notHonoured }) => ...)
 *   rec.on("upload", (p) => ...)   // total / confirmed / pending / refused / offline / bytesPending
 *   rec.on("error",  (e: RecorderError) => ...)  // e.code (RecorderErrorCode), e.refusal (ServerRefusal)
 *   rec.on("storage", ...)  rec.on("clock", ...)  rec.on("stop_requested", ...)
 *   rec.on("recovered", ...)  rec.on("backup", ...)
 *
 *   // Other calls:
 *   rec.enableLocalBackup()          // from a click: also write every chunk to a folder
 *   rec.discardLocal(id, "DISCARD")  // typed confirmation, abandoned/complete only
 *   rec.swapMeasurement()            // the "roles look swapped" numbers, for the UI to ask
 *   rec.uploadProgress(id)
 *
 *   Devices (the setup wizard): listInputs(), realInputs(), resolveProfile(),
 *   hintRole(), pairIsDistinct(), zeroLagCorrelation(), openBoth(), saveProfile(),
 *   profileRow() -> upsert into recorder_device_profiles (backend.upsertDeviceProfile).
 *
 * ---------------------------------------------------------------- rules kept here
 *
 *   - The supabase client is INJECTED and is the teacher's own session: no
 *     service role, RLS is the boundary. No signed URLs are made.
 *   - Register -> upload -> confirm per chunk; a chunk's local bytes are deleted
 *     only when the server confirmed it AND the recording reached `complete`.
 *   - Never falls back to the default microphone: exact deviceIds, or no arming.
 *   - Processing flags are requested OFF and READ BACK; what was not honoured is
 *     reported and stored with the track.
 *   - Positions come from the shared AudioContext frame counter, never Date.now().
 */

export * from "./types";
export * from "./errors";
export * from "./chunkMath";
export * from "./devices";
export * from "./capture";
export * from "./schedule";
export * from "./health";
export * from "./manifest";
export * from "./backoff";
export { encodeFlac, encodeWav } from "./flac";
export { encodePcmChunk } from "./encoders";
export { Chunker } from "./chunker";
export { MemoryStore, openIdbStore, type RecorderStore } from "./store";
export { supabaseBackend, BUCKET, type RecorderBackend, type SupabaseLike } from "./backend";
export { Uploader, type UploadProgress } from "./uploader";
export { Recorder, type RecorderOptions } from "./controller";
export { BrowserCaptureSource, type CaptureSource } from "./captureSource";
export { inlineEncoder, workerEncoder, type ChunkEncoder, type EncodedChunk, type WorkerLike } from "./encoderClient";
export type { RecorderEvents, HeldAudio } from "./events";

import { Recorder, type RecorderOptions } from "./controller";
import { BrowserCaptureSource } from "./captureSource";
import { supabaseBackend, type SupabaseLike, type RecorderBackend } from "./backend";
import { openIdbStore, MemoryStore, type RecorderStore } from "./store";
import { getInstallId, type DeviceProfile } from "./devices";
import { workerEncoder, type ChunkEncoder } from "./encoderClient";
import { RecorderError } from "./errors";

export interface CreateRecorderOptions extends Partial<Omit<RecorderOptions, "backend" | "store" | "source" | "userId" | "installId" | "profile">> {
  /** The app's supabase client (signed in as the teacher), or a ready backend. */
  client?: SupabaseLike;
  backend?: RecorderBackend;
  userId: string;
  profile: DeviceProfile | null;
  store?: RecorderStore;
  sampleRate?: number;
}

/** The encoder Worker (M6). Vite bundles `./encodeWorker.ts` from this exact expression. */
function defaultEncoder(onFallback: (why: string) => void): ChunkEncoder | undefined {
  if (typeof Worker === "undefined") return undefined;
  return workerEncoder(() => new Worker(new URL("./encodeWorker.ts", import.meta.url), { type: "module" }) as any, onFallback);
}

/** Build a recorder with the browser defaults. Call inside the teacher's click. */
export async function createRecorder(o: CreateRecorderOptions): Promise<Recorder> {
  const backend = o.backend ?? (o.client ? supabaseBackend(o.client) : null);
  if (!backend) throw new Error("createRecorder needs a client or a backend");
  let store = o.store;
  let durable = o.durable !== false;
  if (!store) {
    // m1: without IndexedDB there is no crash safety. The engine still runs
    // (a check screen needs it) but says so and refuses to arm.
    try { store = await openIdbStore(); }
    catch { store = new MemoryStore(); durable = false; }
  }
  const source = await BrowserCaptureSource.create(o.sampleRate ?? 48000);
  let rec: Recorder | null = null;
  const encoder = o.encoder ?? defaultEncoder((why) => rec?.events.emit("error", new RecorderError("internal", `Audio is encoded on the page itself (${why}): it may slow the page`)));
  rec = new Recorder({ ...o, backend, store, source, encoder, durable, userId: o.userId, installId: getInstallId(), profile: o.profile });
  return rec;
}
