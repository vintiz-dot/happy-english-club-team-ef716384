/**
 * The on-device listener of the voice points assistant (see ../listenerApi.ts for the
 * contract and the profile type). Browser only: the pure parts (engine,
 * calibrate, dtw, fbank, ...) are in their own files and are tested in node by
 * scripts/pgtest/voice-listener.test.mjs.
 *
 * Needs a user gesture before startRecording / startListener (Chrome keeps an
 * AudioContext suspended otherwise); call them from a click handler.
 */
import type { ListenerEvents, ListenerHandle, VoiceprintProfile } from "../listenerApi";
import type { ListenerModule } from "../listenerApi";
import { openMic, recordUntilStopped } from "./capture";
import { buildProfileCore } from "./calibrate";
import { ListenerEngine } from "./engine";
import { getEmbedService } from "./embedClient";
import { deleteProfile, loadProfile, saveProfile } from "./profileStore";

const pct = (f: number) => Math.round(f * 100);

async function embedderWithProgress(report: (text: string) => void) {
  let last = -1;
  return getEmbedService((f) => {
    const p = pct(f);
    if (p !== last) { last = p; report(`Downloading voice model ${p}%`); }
  });
}

async function buildProfile(
  userId: string,
  reading: Float32Array,
  wakeSamples: Float32Array[],
  micLabel: string | null,
  onProgress?: (fraction: number) => void,
) {
  // The model download is the first 0-30% of the bar when it is not cached yet.
  const embedder = await getEmbedService((f) => onProgress?.(f * 0.3));
  return buildProfileCore(userId, reading, wakeSamples, micLabel, embedder, (f) => onProgress?.(0.3 + f * 0.7));
}

async function startListener(profile: VoiceprintProfile, events: ListenerEvents, opts?: { deviceId?: string }): Promise<ListenerHandle> {
  events.onState("loading", "Starting the microphone");
  // Open the microphone first, inside the click that asked for it (the model may take a while).
  const mic = await openMic(opts?.deviceId);
  let engine: ListenerEngine | null = null;
  let stopped = false;
  try {
    const embedder = await embedderWithProgress((text) => events.onState("loading", text));
    if (stopped) throw new Error("Stopped.");
    engine = new ListenerEngine(profile, events, { embed: (w) => embedder.embed(w) });
  } catch (e) {
    mic.close();
    events.onState("error", e instanceof Error ? e.message : String(e));
    throw e;
  }
  const eng = engine;
  mic.onSamples = (s) => eng.push(s);
  mic.onEnded = () => { if (!stopped) events.onState("error", "The microphone was disconnected."); };
  events.onState("listening");
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      eng.stop();
      mic.close();
    },
    pause() { eng.pause(); },
    resume() { eng.resume(); },
  };
}

export const listener: ListenerModule = {
  loadProfile,
  saveProfile,
  deleteProfile,
  startRecording: (opts) => recordUntilStopped(opts?.deviceId),
  buildProfile,
  startListener,
};

export { loadProfile, saveProfile, deleteProfile, buildProfile, startListener };
export const startRecording: ListenerModule["startRecording"] = (opts) => recordUntilStopped(opts?.deviceId);
/** Starts downloading the model ahead of time (e.g. when the enrolment dialog opens). */
export function preloadVoiceModel(onProgress?: (fraction: number) => void): Promise<void> {
  return getEmbedService(onProgress).then(() => undefined);
}
