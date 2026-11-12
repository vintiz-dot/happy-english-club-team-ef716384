/**
 * Class recorder screens (C3): the pure part. Wording, timing and status
 * rules the teacher and admin screens render, with no React and no browser,
 * so `bun test scripts/recorderUi.test.ts` checks them.
 *
 * The engine (src/lib/recorder) decides everything that matters; these only
 * turn what it reports into plain words. Imports are relative so the test
 * runner needs no path aliases.
 */

import type { RecorderErrorCode, ServerRefusal } from "./recorder/errors";
import type { SwapMeasurement } from "./recorder/health";
import type { InputDevice } from "./recorder/devices";
import { hintRole, realInputs, pairIsDistinct } from "./recorder/devices";
import type { TrackRole, ServerStatus } from "./recorder/types";

export type Tone = "ok" | "info" | "warn" | "error";

// ---------------------------------------------------------------- names

/** The two roles in the teacher's words. */
export function trackName(role: TrackRole): string {
  return role === "teacher" ? "My microphone" : "Room microphone";
}

/** The device each role is meant to be. */
export function trackDevice(role: TrackRole): string {
  return role === "teacher" ? "the lapel microphone you wear" : "the Anker PowerConf S500 on the table";
}

// ---------------------------------------------------------------- time

const MIN = 60_000;
const HANOI_MS = 7 * 3600 * 1000;

/** "09:00:00" -> "09:00". */
export function hhmm(time: string): string {
  const [h = "0", m = "0"] = (time || "").split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/** Add minutes to a wall-clock "HH:MM[:SS]", wrapping round midnight. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = hhmm(time).split(":").map(Number);
  let t = (h * 60 + m + minutes) % (24 * 60);
  if (t < 0) t += 24 * 60;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Hanoi date + time -> epoch ms (UTC+7, no daylight saving). */
export function hanoiMs(date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm, ss] = (time || "0:0").split(":").map(Number);
  return Date.UTC(y, mo - 1, d, hh || 0, mm || 0, ss || 0) - HANOI_MS;
}

/** Today's date in Hanoi for an epoch ms. */
export function hanoiDate(nowMs: number): string {
  return new Date(nowMs + HANOI_MS).toISOString().slice(0, 10);
}

export interface LessonLike {
  sessionId: string;
  classId: string;
  className: string;
  date: string;
  startTime: string;
  endTime: string;
  status?: string | null;
}

export interface WindowMinutes { preRoll: number; grace: number; armWindow: number }
export const DEFAULT_MINUTES: WindowMinutes = { preRoll: 5, grace: 10, armWindow: 20 };

export function lessonTimes(l: LessonLike, w: WindowMinutes = DEFAULT_MINUTES) {
  const start = hanoiMs(l.date, l.startTime);
  let end = hanoiMs(l.date, l.endTime);
  if (end <= start) end += 24 * 3600 * 1000;
  return { start, end, opens: start - w.preRoll * MIN, closes: end + w.grace * MIN, armFrom: start - w.armWindow * MIN };
}

/** "Starters 1 starts at 09:00 - recording from 08:55". */
export function lessonHeadline(l: LessonLike, w: WindowMinutes = DEFAULT_MINUTES): string {
  return `${l.className} starts at ${hhmm(l.startTime)} - recording from ${addMinutes(l.startTime, -w.preRoll)}`;
}

export type LessonPhase = "later" | "arming" | "capturing" | "over";

export function lessonPhase(l: LessonLike, nowMs: number, w: WindowMinutes = DEFAULT_MINUTES): LessonPhase {
  const t = lessonTimes(l, w);
  if (nowMs >= t.closes) return "over";
  if (nowMs >= t.opens) return "capturing";
  if (nowMs >= t.armFrom) return "arming";
  return "later";
}

const isCanceled = (s?: string | null) => /cancel/i.test(s || "");

/**
 * The lesson the screen is about: the one whose capture window holds `now`,
 * otherwise the next one today. Cancelled lessons are skipped. null = no
 * more lessons to record today.
 */
export function pickLesson<L extends LessonLike>(lessons: L[], nowMs: number, w: WindowMinutes = DEFAULT_MINUTES): L | null {
  const live = lessons
    .filter((l) => !isCanceled(l.status) && lessonPhase(l, nowMs, w) !== "over")
    .sort((a, b) => lessonTimes(a, w).start - lessonTimes(b, w).start);
  return live[0] ?? null;
}

/** The lesson after `l` today, for the back-to-back rule. */
export function nextAfter<L extends LessonLike>(l: L, lessons: L[], w: WindowMinutes = DEFAULT_MINUTES): L | null {
  const s = lessonTimes(l, w).start;
  return lessons
    .filter((x) => x.sessionId !== l.sessionId && !isCanceled(x.status) && lessonTimes(x, w).start > s)
    .sort((a, b) => lessonTimes(a, w).start - lessonTimes(b, w).start)[0] ?? null;
}

/** Whole minutes until the scheduled end (never negative). */
export function minutesLeft(l: LessonLike, nowMs: number): number {
  return Math.max(0, Math.ceil((lessonTimes(l).end - nowMs) / MIN));
}

/** The Stop confirmation. */
export function stopConfirmText(l: LessonLike | null, nowMs: number): string {
  if (!l) return "Stop recording?";
  const left = minutesLeft(l, nowMs);
  if (left <= 0) return "Stop recording? The lesson has ended.";
  return `Stop recording? The lesson has ${left} ${left === 1 ? "minute" : "minutes"} left.`;
}

/** "mm:ss" or "h:mm:ss". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/** "1 h 32 min", "45 min", "under a minute". */
export function durationWords(ms: number | null | undefined): string {
  if (!ms || ms < MIN) return ms && ms > 0 ? "under a minute" : "0 min";
  const total = Math.round(ms / MIN);
  const h = Math.floor(total / 60), m = total % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

// ---------------------------------------------------------------- uploads

export interface UploadLike {
  total: number;
  confirmed: number;
  pending: number;
  refused: number;
  offline: boolean;
  late: number;
  lateMs: number;
}

export interface StatusLine { tone: Tone; text: string }

/** Plain upload status. The first line is the headline; a late line follows when there is one. */
export function uploadStatus(p: UploadLike | null, online = true): StatusLine[] {
  const out: StatusLine[] = [];
  const offline = !online || !!p?.offline;
  if (!p || p.total === 0) {
    out.push(offline
      ? { tone: "warn", text: "Offline - recording continues and will upload when the internet is back" }
      : { tone: "info", text: "Nothing to save yet" });
  } else if (offline && p.pending > 0) {
    out.push({ tone: "warn", text: "Offline - recording continues and will upload when the internet is back" });
  } else if (p.pending > 0) {
    out.push({ tone: "info", text: `Saving ${p.pending} ${p.pending === 1 ? "piece" : "pieces"}` });
  } else {
    out.push({ tone: "ok", text: "All saved" });
  }
  if (p && p.late > 0) {
    const minutes = Math.max(1, Math.ceil(p.lateMs / MIN));
    out.push({ tone: "warn", text: `Recorded offline too long - the last ${minutes} ${minutes === 1 ? "minute" : "minutes"} will not count` });
  }
  if (p && p.refused > 0) {
    out.push({ tone: "error", text: `The server would not take ${p.refused} ${p.refused === 1 ? "piece" : "pieces"}. They are kept on this laptop.` });
  }
  return out;
}

/** Upload speed in Mbit/s from chunk sizes and how long each took, or null. */
export function uploadMbps(samples: { bytes: number; ms: number }[]): number | null {
  const ok = samples.filter((s) => s.bytes > 0 && s.ms > 0);
  if (!ok.length) return null;
  const bytes = ok.reduce((n, s) => n + s.bytes, 0), ms = ok.reduce((n, s) => n + s.ms, 0);
  return Math.round(((bytes * 8) / (ms / 1000) / 1e6) * 10) / 10;
}

/** Two FLAC tracks at the measured rate (C2): about 0.75 Mbit/s. */
export const NEEDED_MBPS = 0.75;

export function uploadSpeedLine(mbps: number | null): StatusLine {
  if (mbps === null) return { tone: "info", text: "Upload speed is measured from the first pieces of your first lesson." };
  if (mbps < NEEDED_MBPS) return { tone: "warn", text: `Upload speed about ${mbps} Mbit/s - slower than the ${NEEDED_MBPS} Mbit/s a lesson needs. Pieces will wait on this laptop and catch up later.` };
  return { tone: "ok", text: `Upload speed about ${mbps} Mbit/s - fast enough (a lesson needs ${NEEDED_MBPS}).` };
}

// ---------------------------------------------------------------- errors

export type ErrorAction =
  | "allow_mic" | "open_setup" | "plug_in" | "retry" | "reload" | "sign_in" | "close_other_tab" | "free_space" | "ask_admin" | "none";

export interface ErrorView { tone: Tone; title: string; body: string; action: ErrorAction; actionLabel: string | null }

const ACTION_LABEL: Record<ErrorAction, string | null> = {
  allow_mic: "Allow the microphones",
  open_setup: "Check the microphones",
  plug_in: "I plugged it back in",
  retry: "Try again",
  reload: "Reload the page",
  sign_in: "Sign in again",
  close_other_tab: "Use this tab",
  free_space: "Check again",
  ask_admin: null,
  none: null,
};

const view = (tone: Tone, title: string, body: string, action: ErrorAction): ErrorView => ({ tone, title, body, action, actionLabel: ACTION_LABEL[action] });

/** Every engine error, in plain words with ONE action. `track` names the microphone when it is known. */
export function errorView(code: RecorderErrorCode, refusal?: ServerRefusal | null, track?: TrackRole | null): ErrorView {
  const mic = track ? trackName(track) : "A microphone";
  switch (code) {
    case "permission_denied":
      return view("error", "The browser is not allowed to use the microphones", "Click the microphone icon at the right of the address bar, choose Allow, then press the button.", "allow_mic");
    case "device_missing":
      return view("error", `${mic === "A microphone" ? "A microphone" : mic} is not plugged in`, "Plug it into the laptop by USB, wait five seconds, then press the button.", "open_setup");
    case "device_ambiguous":
      return view("warn", "Two microphones look the same", "Run the microphone check once so the recorder knows which is which.", "open_setup");
    case "same_device_twice":
      return view("error", "Both roles point at the same microphone", "Run the microphone check and choose two different microphones.", "open_setup");
    case "device_unplugged":
      return view("error", `${mic} was unplugged`, "Plug it back in now. The recording continues; the gap is marked.", "plug_in");
    case "device_lost":
      return view("warn", `${mic} did not come back`, "The lesson continues with the other microphone. Check the cable after class.", "none");
    case "constraint_not_honoured":
      return view("info", "The browser kept a sound setting on", "Recording works. The setting is noted with the recording.", "none");
    case "audio_context_suspended":
      return view("warn", "One click needed", "The browser wants one click before it can use sound. Press Ready for today.", "retry");
    case "unsupported":
      return view("error", "This browser cannot record", "Open this page in Google Chrome or Microsoft Edge.", "none");
    case "offline":
      return view("warn", "Offline", "Recording continues and will upload when the internet is back.", "none");
    case "not_signed_in":
      return view("error", "You were signed out", "Sign in again. Nothing recorded is lost: it waits on this laptop.", "sign_in");
    case "quota":
      return view("error", "The laptop is out of space for recordings", "Close other tabs and free some disk space, then check again.", "free_space");
    case "storage_low":
      return view("warn", "The laptop is low on space", "Free some disk space before the lesson so the recording fits.", "free_space");
    case "another_tab":
      return view("warn", "The recorder is open in another tab", "Close the other tab, then press the button here.", "close_other_tab");
    case "clock_unknown":
      return view("warn", "Cannot reach the school server", "Check the internet connection, then try again.", "retry");
    case "server_refused":
      return refusalView(refusal ?? "unknown");
    default:
      return view("error", "Something went wrong", "Reload the page. Anything already recorded stays on this laptop.", "reload");
  }
}

export function refusalView(r: ServerRefusal): ErrorView {
  switch (r) {
    case "switch_off":
      return view("info", "Recording is switched off for this class", "Nothing will be recorded. An admin can switch it on.", "ask_admin");
    case "consent_missing":
      return view("info", "Waiting for parents' permission", "Some children in this class have no recording permission on file yet. An admin will sort it out; nothing is recorded until then.", "ask_admin");
    case "too_early":
      return view("info", "Too early for this lesson", "The recorder gets ready by itself closer to the start time.", "none");
    case "window_closed":
    case "after_window":
      return view("info", "This lesson's recording time is over", "Recording can only happen from 5 minutes before the lesson to 10 minutes after it.", "none");
    case "not_teacher":
      return view("info", "This lesson is not yours to record", "Only a teacher of the class can record it.", "ask_admin");
    case "no_longer_teaching":
      return view("warn", "You no longer teach this lesson", "The audio already recorded is kept on this laptop. Ask an admin what to do with it.", "ask_admin");
    case "session_canceled":
      return view("info", "This lesson was cancelled", "Nothing will be recorded.", "none");
    case "already_live":
      return view("warn", "This lesson is already being recorded", "Another laptop or tab is recording it. Stop that one first.", "close_other_tab");
    case "stopped_after_window":
      return view("warn", "Stopped too late to count", "The server closed this recording. The audio is kept on this laptop.", "ask_admin");
    case "stop_requested":
      return view("info", "Recording was stopped by the school", "The recording is finishing and saving.", "none");
    case "ahead_of_server_clock":
    case "not_in_storage":
      return view("info", "Waiting for the server", "This sorts itself out in a moment.", "none");
    default:
      return view("error", "The server refused", "Reload the page. Anything already recorded stays on this laptop.", "reload");
  }
}

// ---------------------------------------------------------------- meters

/** 0..1 for a level bar: -60 dBFS empty, 0 dBFS full. */
export function meterFraction(rmsDb: number): number {
  if (!Number.isFinite(rmsDb)) return 0;
  return Math.max(0, Math.min(1, (rmsDb + 60) / 60));
}

/** A word for the level, so the meter never relies on colour alone. */
export function levelWord(rmsDb: number, clipped = 0): { word: string; tone: Tone } {
  if (clipped > 0 || rmsDb > -3) return { word: "Too loud", tone: "error" };
  if (rmsDb < -65) return { word: "Silent", tone: "warn" };
  if (rmsDb < -45) return { word: "Quiet", tone: "info" };
  return { word: "Good", tone: "ok" };
}

// ---------------------------------------------------------------- devices

/** A label that is the Bluetooth (hands-free) side of a headset or the S500. */
export function isBluetoothLabel(label: string): boolean {
  return /bluetooth|hands-?free|\bAG Audio\b|\bBT\b/i.test(label || "");
}

export function isS500Label(label: string): boolean {
  return /powerconf|\bs500\b/i.test(label || "");
}

/** The laptop's own microphone: never one of the two roles. */
export function isBuiltInLabel(label: string): boolean {
  return /microphone array|internal mic|built-?in|realtek|intel.*smart sound|integrated/i.test(label || "");
}

export interface DeviceRow { device: InputDevice; hint: TrackRole | null; bluetooth: boolean; builtIn: boolean; s500: boolean }

/** The input list for the wizard: aliases dropped, each with what it looks like. */
export function describeInputs(all: InputDevice[]): DeviceRow[] {
  return realInputs(all).map((d) => ({
    device: d,
    hint: hintRole(d.label),
    bluetooth: isBluetoothLabel(d.label),
    builtIn: isBuiltInLabel(d.label),
    s500: isS500Label(d.label),
  }));
}

/**
 * First guess for the two roles, from labels only; the teacher confirms with
 * the meters. A role is guessed only when exactly one input looks like it.
 * Bluetooth inputs are never guessed (the S500 must be on USB).
 */
export function suggestRoles(all: InputDevice[]): { teacher: string | null; room: string | null } {
  const rows = describeInputs(all).filter((r) => !r.bluetooth);
  const only = (role: TrackRole) => {
    const m = rows.filter((r) => r.hint === role);
    return m.length === 1 ? m[0].device.deviceId : null;
  };
  const teacher = only("teacher"), room = only("room");
  return { teacher, room: room && room !== teacher ? room : null };
}

/** Problems with a chosen pair, in plain words (empty = fine). */
export function pairProblems(all: InputDevice[], teacherId: string | null, roomId: string | null): string[] {
  const rows = describeInputs(all);
  const t = rows.find((r) => r.device.deviceId === teacherId), r = rows.find((x) => x.device.deviceId === roomId);
  const out: string[] = [];
  if (!t) out.push("Choose which microphone is yours.");
  if (!r) out.push("Choose which microphone is the room microphone.");
  if (t && r && !pairIsDistinct(t.device, r.device)) out.push("Choose two different microphones.");
  if (r?.bluetooth) out.push("The room microphone is connected by Bluetooth. Plug the S500 in with its USB cable instead.");
  if (t?.bluetooth) out.push("Your microphone is connected by Bluetooth. Use the USB receiver instead.");
  if (t?.builtIn) out.push("That is the laptop's own microphone. Choose the lapel receiver for your microphone.");
  if (r?.builtIn) out.push("That is the laptop's own microphone. Choose the S500 for the room microphone.");
  if (t?.s500) out.push("The S500 is chosen as your microphone. It should be the room microphone.");
  return out;
}

/** The engine's swap measurement, as the warning the teacher sees (or null). */
export function swapWarning(m: SwapMeasurement | null | undefined): string | null {
  if (!m || m.verdict !== "maybe_swapped") return null;
  return "It looks like these are the other way round - speak normally and check";
}

// ---------------------------------------------------------------- environment

export interface BrowserCheck { ok: boolean; name: string; message: string | null }

/** Chrome or Edge on a computer. Everything else is warned about, not blocked. */
export function browserCheck(ua: string): BrowserCheck {
  const u = ua || "";
  if (/Edg\//.test(u)) return { ok: true, name: "Microsoft Edge", message: null };
  if (/OPR\/|Opera/.test(u)) return { ok: false, name: "Opera", message: "Please use Google Chrome or Microsoft Edge for recording." };
  if (/coc_coc_browser/i.test(u)) return { ok: false, name: "Coc Coc", message: "Please use Google Chrome or Microsoft Edge for recording." };
  if (/SamsungBrowser/.test(u)) return { ok: false, name: "Samsung Internet", message: "Please use Google Chrome or Microsoft Edge on the laptop." };
  if (/Firefox\//.test(u)) return { ok: false, name: "Firefox", message: "Please use Google Chrome or Microsoft Edge for recording." };
  if (/Chrome\//.test(u) || /Chromium\//.test(u)) {
    if (/Android|iPhone|iPad|Mobile/.test(u)) return { ok: false, name: "Chrome on a phone", message: "Record on the classroom laptop, not a phone or tablet." };
    return { ok: true, name: "Google Chrome", message: null };
  }
  if (/Safari\//.test(u)) return { ok: false, name: "Safari", message: "Please use Google Chrome or Microsoft Edge for recording." };
  return { ok: false, name: "this browser", message: "Please use Google Chrome or Microsoft Edge for recording." };
}

export function batteryLine(b: { charging: boolean; level: number } | null): StatusLine | null {
  if (!b) return null;
  if (b.charging) return { tone: "ok", text: "The laptop is plugged in." };
  return { tone: "warn", text: `The laptop is on battery (${Math.round(b.level * 100)}%). Plug it in before the lesson: a lesson can be 90 minutes.` };
}

// ---------------------------------------------------------------- admin

export interface EnrolledChild { student_id: string; name: string }
export interface ConsentRow { student_id: string; status: string; wording_version: string }
export type ConsentGap = { student_id: string; name: string; reason: "none" | "withdrawn" | "old_wording"; wording?: string };

/** Children enrolled today without consent 'granted' under the CURRENT wording - the server's one count, with names. */
export function consentGaps(children: EnrolledChild[], consents: ConsentRow[], current: string | null): ConsentGap[] {
  const by = new Map(consents.map((c) => [c.student_id, c]));
  const seen = new Set<string>();
  const out: ConsentGap[] = [];
  for (const ch of children) {
    if (seen.has(ch.student_id)) continue;
    seen.add(ch.student_id);
    const c = by.get(ch.student_id);
    if (!current) { out.push({ ...ch, reason: "none" }); continue; }
    if (!c) out.push({ ...ch, reason: "none" });
    else if (c.status !== "granted") out.push({ ...ch, reason: "withdrawn", wording: c.wording_version });
    else if (c.wording_version !== current) out.push({ ...ch, reason: "old_wording", wording: c.wording_version });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function consentGapText(g: ConsentGap): string {
  if (g.reason === "withdrawn") return "Parents withdrew permission";
  if (g.reason === "old_wording") return `Permission is under the old wording (${g.wording})`;
  return "No permission on file";
}

export function recordingStatusLabel(status: ServerStatus | string, deletionRequested = false): string {
  if (deletionRequested && status !== "deleted") return "Deletion requested";
  switch (status) {
    case "armed": return "Waiting to start";
    case "recording": return "Recording";
    case "uploading": return "Saving";
    case "complete": return "Saved";
    case "abandoned": return "Not finished";
    case "deleted": return "Deleted";
    default: return String(status);
  }
}

const AUDIT: Record<string, string> = {
  switch_on: "Switched recording on",
  switch_off: "Switched recording off",
  switch_off_auto: "Recording switched off automatically",
  child_consent_granted: "Recorded a child's permission",
  child_consent_withdrawn: "Recorded a withdrawal of permission",
  armed: "Got a lesson ready",
  started: "Started recording",
  stopped: "Stopped recording",
  completed: "Recording saved",
  abandoned: "Recording not finished",
  stop_requested: "Asked a recording to stop",
  deletion_requested: "Asked for deletion",
  retention_changed: "Changed how long recordings are kept",
  audio_deleted: "Audio deleted",
  settings_changed: "Changed recorder settings",
};
export function auditActionLabel(action: string): string { return AUDIT[action] ?? action; }

/** The retention cell: when the audio goes, or that it has gone. */
export function retentionText(r: { delete_after: string | null; deletion_requested_at?: string | null; audio_deleted_at?: string | null }, fmt: (iso: string) => string): string {
  if (r.audio_deleted_at) return `Deleted ${fmt(r.audio_deleted_at)}`;
  if (r.deletion_requested_at) return "Deleted at the next nightly run";
  return r.delete_after ? `Kept until ${fmt(r.delete_after)}` : "";
}

/** The reason box: required, trimmed, a few words at least. */
export function validReason(text: string): boolean {
  return (text || "").trim().length >= 3;
}
