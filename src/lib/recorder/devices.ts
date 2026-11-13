// The two microphones: which input is the teacher's lapel receiver and which
// is the room's S500, found again on every arm.
//
// Rules (C1-architecture section 2):
//   - the Windows aliases "default" and "communications" are never used; they
//     share a groupId with the real endpoint, which is how we can say "this is
//     also your Windows default";
//   - a saved deviceId that is present wins; if it is gone (site data cleared,
//     another profile) the same label is looked for, and ONE match is required;
//     two candidates, or none, is "run the microphone check" - never a fallback
//     to the default microphone, which is how the laptop's built-in mic would
//     silently become a track;
//   - the two roles must be different deviceIds AND different groupIds.
//
// Labels are noisy on Windows: "Microphone (2- USB Audio Device)" becomes
// "Microphone (3- USB Audio Device)" when the receiver moves to another port,
// and the S500 shows as "Echo Cancelling Speakerphone (Anker PowerConf S500)".

import type { TrackRole } from "./types";
import { sha256Hex, randomUuid } from "./hash";

export interface InputDevice { deviceId: string; groupId: string; label: string; kind?: string }
export interface SavedDevice { deviceId: string; groupId: string; label: string }

export const PSEUDO_IDS = new Set(["default", "communications", ""]);

/** Strip the decorations Windows and Chrome add, so one physical device has one name. */
export function normalizeLabel(label: string): string {
  let s = (label || "").trim();
  s = s.replace(/^(default|communications)\s*-\s*/i, "");
  // "(2- USB Audio Device)" -> "(USB Audio Device)": the port number.
  s = s.replace(/\(\s*\d+\s*-\s*/g, "(");
  // A trailing USB vendor:product id, "(0b0e:24c8)".
  s = s.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, "");
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isPseudoDevice(d: InputDevice): boolean {
  return PSEUDO_IDS.has(d.deviceId) || /^(default|communications)\s*-/i.test(d.label || "");
}

/** Real audio inputs only (no aliases, no outputs). */
export function realInputs(devices: InputDevice[]): InputDevice[] {
  return devices.filter((d) => (d.kind === undefined || d.kind === "audioinput") && !isPseudoDevice(d));
}

/** Which aliases point at this device ("also your Windows default"). */
export function aliasesOf(device: InputDevice, devices: InputDevice[]): ("default" | "communications")[] {
  const out: ("default" | "communications")[] = [];
  for (const d of devices) {
    if ((d.kind === undefined || d.kind === "audioinput") && d.groupId && d.groupId === device.groupId) {
      if (d.deviceId === "default") out.push("default");
      if (d.deviceId === "communications") out.push("communications");
    }
  }
  return out;
}

export type RoleHint = TrackRole | null;

/** A hint from the label only. The wizard decides by the tap test, never by this. */
export function hintRole(label: string): RoleHint {
  const l = normalizeLabel(label);
  if (/speakerphone|powerconf|\bs500\b|anker|conference/.test(l)) return "room";
  if (/lapel|lavalier|wireless|usb audio device|boya|rode|hollyland|dji mic|saramonic|receiver/.test(l)) return "teacher";
  return null;
}

/** The S500 enumerates as an echo-cancelling speakerphone: its DSP is in firmware. */
export function hasHardwareDsp(label: string): boolean {
  return /echo cancel|speakerphone|powerconf/i.test(label || "");
}

export type Resolution =
  | { status: "ok"; device: InputDevice; how: "id" | "label" | "label+group" }
  | { status: "missing" }
  | { status: "ambiguous"; candidates: InputDevice[] };

export function resolveDevice(saved: SavedDevice | null | undefined, devices: InputDevice[]): Resolution {
  if (!saved || !saved.deviceId) return { status: "missing" };
  const inputs = realInputs(devices);
  const byId = inputs.find((d) => d.deviceId === saved.deviceId);
  if (byId) return { status: "ok", device: byId, how: "id" };
  const want = normalizeLabel(saved.label);
  if (!want) return { status: "missing" };
  const sameLabel = inputs.filter((d) => normalizeLabel(d.label) === want);
  if (sameLabel.length === 1) return { status: "ok", device: sameLabel[0], how: "label" };
  if (sameLabel.length > 1) {
    const sameGroup = sameLabel.filter((d) => d.groupId && d.groupId === saved.groupId);
    if (sameGroup.length === 1) return { status: "ok", device: sameGroup[0], how: "label+group" };
    return { status: "ambiguous", candidates: sameLabel };
  }
  return { status: "missing" };
}

export interface DeviceProfile {
  version: 1;
  installId: string;
  userId: string;
  teacher: SavedDevice;
  room: SavedDevice;
  /** Results of the wizard's checks (tap test, clap test, correlation). */
  checks: Record<string, unknown>;
  verifiedAt: string | null;
  /** The server row's id once uploaded. */
  serverId?: string | null;
}

export type ProfileResolution =
  | { status: "ok"; teacher: InputDevice; room: InputDevice; how: { teacher: string; room: string } }
  | { status: "missing"; roles: TrackRole[] }
  | { status: "ambiguous"; roles: TrackRole[] }
  | { status: "same_device" };

export function resolveProfile(profile: DeviceProfile | null, devices: InputDevice[]): ProfileResolution {
  if (!profile) return { status: "missing", roles: ["teacher", "room"] };
  const t = resolveDevice(profile.teacher, devices);
  const r = resolveDevice(profile.room, devices);
  const missing: TrackRole[] = [];
  const ambiguous: TrackRole[] = [];
  if (t.status === "missing") missing.push("teacher");
  if (r.status === "missing") missing.push("room");
  if (t.status === "ambiguous") ambiguous.push("teacher");
  if (r.status === "ambiguous") ambiguous.push("room");
  if (ambiguous.length) return { status: "ambiguous", roles: ambiguous };
  if (missing.length) return { status: "missing", roles: missing };
  const td = (t as any).device as InputDevice, rd = (r as any).device as InputDevice;
  if (!pairIsDistinct(td, rd)) return { status: "same_device" };
  return { status: "ok", teacher: td, room: rd, how: { teacher: (t as any).how, room: (r as any).how } };
}

/** Different deviceIds AND different groupIds (an alias of the same device fails here). */
export function pairIsDistinct(a: InputDevice, b: InputDevice): boolean {
  if (!a || !b) return false;
  if (a.deviceId === b.deviceId) return false;
  if (a.groupId && b.groupId && a.groupId === b.groupId) return false;
  return true;
}

/** Normalised cross-correlation at zero lag; >= 0.98 means "the same signal twice". */
export function zeroLagCorrelation(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += a[i] * b[i]; da += a[i] * a[i]; db += b[i] * b[i]; }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}
export const SAME_SIGNAL_THRESHOLD = 0.98;

// ---------------------------------------------------------------- persistence

const PROFILE_KEY = (userId: string) => `hec-recorder-profile-v1:${userId}`;
const INSTALL_KEY = "hec-recorder-install-id";

/** localStorage may throw (private mode, blocked site data): every access is guarded. */
function ls(): Storage | null {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

export function getInstallId(): string {
  const s = ls();
  try {
    const have = s?.getItem(INSTALL_KEY);
    if (have) return have;
    const id = randomUuid();
    s?.setItem(INSTALL_KEY, id);
    return id;
  } catch { return randomUuid(); }
}

export function loadProfile(userId: string): DeviceProfile | null {
  try {
    const raw = ls()?.getItem(PROFILE_KEY(userId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && p.version === 1 && p.teacher && p.room ? p : null;
  } catch { return null; }
}

export function saveProfile(p: DeviceProfile): void {
  try { ls()?.setItem(PROFILE_KEY(p.userId), JSON.stringify(p)); } catch { /* the server copy is the audit; local is a convenience */ }
}

/** The row for `recorder_device_profiles`: labels and HASHES of the ids, never the ids. */
export async function profileRow(p: DeviceProfile, userAgent: string) {
  return {
    user_id: p.userId,
    install_id: p.installId,
    teacher_label: p.teacher.label,
    teacher_device_hash: await sha256Hex(p.teacher.deviceId),
    teacher_group_hash: await sha256Hex(p.teacher.groupId || ""),
    room_label: p.room.label,
    room_device_hash: await sha256Hex(p.room.deviceId),
    room_group_hash: await sha256Hex(p.room.groupId || ""),
    user_agent: userAgent,
    checks: p.checks ?? {},
    verified_at: p.verifiedAt,
  };
}

// ---------------------------------------------------------------- browser

export async function microphonePermission(): Promise<PermissionState | "unknown"> {
  try {
    const st = await (navigator as any).permissions?.query({ name: "microphone" });
    return st?.state ?? "unknown";
  } catch { return "unknown"; }
}

export async function listInputs(): Promise<InputDevice[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "audioinput").map((d) => ({ deviceId: d.deviceId, groupId: d.groupId, label: d.label, kind: d.kind }));
}

/** Calls `fn` on every devicechange with the new input list; returns an unsubscribe. */
export function watchDevices(fn: (inputs: InputDevice[]) => void): () => void {
  const md = navigator.mediaDevices;
  const h = async () => { try { fn(await listInputs()); } catch { /* ignore */ } };
  md.addEventListener("devicechange", h);
  return () => md.removeEventListener("devicechange", h);
}
