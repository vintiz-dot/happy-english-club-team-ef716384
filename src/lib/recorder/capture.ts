// Opening the two microphones. Each one is a separate getUserMedia call,
// pinned with deviceId: { exact }, with every processing flag OFF, and what the
// browser actually applied is read back from track.getSettings() and compared:
// never assume a constraint was honoured.

import type { TrackRole } from "./types";
import { RecorderError } from "./errors";

/** The flags that must read back false. `voiceIsolation` only where the browser knows it. */
export const PROCESSING_FLAGS = ["echoCancellation", "noiseSuppression", "autoGainControl", "voiceIsolation"] as const;

export function buildConstraints(deviceId: string, supported: Record<string, boolean | undefined>): MediaTrackConstraints {
  const c: Record<string, unknown> = {
    deviceId: { exact: deviceId },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    // ideal, not exact: an exact 1 fails on devices that only offer stereo;
    // the worklet takes channel 0 whatever arrives, and the read-back says so.
    channelCount: { ideal: 1 },
  };
  if (supported.voiceIsolation) c.voiceIsolation = false;
  return c as MediaTrackConstraints;
}

/** Which requested values the browser did not apply (pure: tested without a browser). */
export function constraintsNotHonoured(requested: Record<string, unknown>, applied: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const f of PROCESSING_FLAGS) {
    if (!(f in requested)) continue;
    if (!(f in applied)) out.push(`${f}: not reported`);
    else if (applied[f] !== false) out.push(`${f}: ${String(applied[f])}`);
  }
  const want = requested.deviceId as { exact?: string } | undefined;
  if (want?.exact && applied.deviceId !== undefined && applied.deviceId !== want.exact) out.push(`deviceId: got another device`);
  if (applied.channelCount !== undefined && applied.channelCount !== 1) out.push(`channelCount: ${String(applied.channelCount)} (channel 0 is recorded)`);
  return out;
}

export interface OpenedTrack {
  role: TrackRole;
  stream: MediaStream;
  track: MediaStreamTrack;
  requested: Record<string, unknown>;
  applied: Record<string, unknown>;
  notHonoured: string[];
}

function settingsOf(t: MediaStreamTrack): Record<string, unknown> {
  try { return { ...(t.getSettings() as Record<string, unknown>) }; } catch { return {}; }
}

/** Open one input. Throws a RecorderError with a code the UI can render. */
export async function openInput(role: TrackRole, deviceId: string): Promise<OpenedTrack> {
  if (!navigator.mediaDevices?.getUserMedia) throw new RecorderError("unsupported", "This browser cannot record audio");
  const supported = (navigator.mediaDevices.getSupportedConstraints?.() ?? {}) as Record<string, boolean>;
  const requested = buildConstraints(deviceId, supported) as Record<string, unknown>;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: requested as MediaTrackConstraints, video: false });
  } catch (e: any) {
    const name = e?.name ?? "";
    if (name === "NotAllowedError" || name === "SecurityError") throw new RecorderError("permission_denied", "Microphone permission was refused", { detail: name });
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new RecorderError("device_missing", `The ${role} microphone is not connected`, { detail: name });
    if (name === "NotReadableError" || name === "AbortError") throw new RecorderError("device_missing", `The ${role} microphone is in use or failed to start`, { detail: name });
    throw new RecorderError("internal", String(e?.message ?? e), { detail: name });
  }
  const track = stream.getAudioTracks()[0];
  if (!track) throw new RecorderError("device_missing", `The ${role} microphone gave no audio track`);
  const applied = settingsOf(track);
  return { role, stream, track, requested, applied, notHonoured: constraintsNotHonoured(requested, applied) };
}

/**
 * Open BOTH inputs, concurrently, then read back both AFTER both are open
 * (a system-wide per-device effect could otherwise change after the second
 * open). Refuses one device twice.
 */
export async function openBoth(ids: { teacher: string; room: string }): Promise<{ teacher: OpenedTrack; room: OpenedTrack }> {
  if (ids.teacher === ids.room) throw new RecorderError("same_device_twice", "The same microphone was chosen for both roles");
  const results = await Promise.allSettled([openInput("teacher", ids.teacher), openInput("room", ids.room)]);
  const [t, r] = results;
  if (t.status === "rejected" || r.status === "rejected") {
    for (const x of results) if (x.status === "fulfilled") x.value.stream.getTracks().forEach((k) => k.stop());
    throw (t.status === "rejected" ? t.reason : (r as PromiseRejectedResult).reason);
  }
  for (const o of [t.value, r.value]) {
    o.applied = settingsOf(o.track);
    o.notHonoured = constraintsNotHonoured(o.requested, o.applied);
  }
  if (t.value.applied.groupId && t.value.applied.groupId === r.value.applied.groupId) {
    t.value.stream.getTracks().forEach((k) => k.stop());
    r.value.stream.getTracks().forEach((k) => k.stop());
    throw new RecorderError("same_device_twice", "Both roles opened the same physical device");
  }
  return { teacher: t.value, room: r.value };
}
