/**
 * The recorder engine OUTLIVES the recorder page (C2 review 3, C3-a), and so
 * does the decision to arm (C2 review 4, R4-2).
 *
 * The engine lives here, at module level, above the router: the screen
 * attaches to it while mounted and detaches when it unmounts. Once a teacher
 * has pressed "Ready for today", THIS module arms and starts each of that
 * day's lessons by itself, wherever the teacher is in the app (`armTick`):
 * the lesson list, the class switch, the back-to-back stop and "already done
 * today" are worked out here, not in the page. Ready is that teacher's choice
 * for that day on this device: kept in localStorage under their own user id
 * (never another user's), so it survives navigation and a reload, and it is
 * cleared on sign-out. After a reload `boot` (RecorderBoot, mounted once in
 * App) brings the engine back on whatever page loads.
 *
 * While no recorder screen shows it - or a page is in full screen - a fixed
 * bar is drawn: "Ready for today", "armed, starts at HH:MM", then the
 * recording state, Stop (asked twice, in the bar itself: no browser dialog,
 * which would leave full screen) and "Open the recorder". In full screen the
 * bar is moved INTO the full-screen element (anything outside it is hidden
 * there: docs/evidence/A2.1-diagnosis.md M5) and back out when it ends.
 *
 * The engine is disposed only when it is idle, no lesson is waiting today,
 * nothing is still uploading and no screen holds it; on a change of user;
 * or on sign-out (through the guard below).
 *
 * The bar is plain DOM (no React tree above the router to render into), built
 * from `floatingBarModel`, which is pure and tested.
 */
import type { RecorderError, RecorderState } from "@/lib/recorder";
import { addMinutes, DEFAULT_MINUTES, hanoiDate, lessonPhase, lessonTimes, nextAfter, pickLesson, type LessonLike, type WindowMinutes } from "@/lib/recorderUi";
import type { RecorderLike } from "./engine";
import { registerSignOutHook } from "./signOutGuard";

export const CAPTURING_STATES: RecorderState[] = ["starting", "recording", "stalled"];
const SAVING_STATES: RecorderState[] = ["stopping", "uploading", "finalizing"];
const BUSY: RecorderState[] = [...CAPTURING_STATES, "armed", ...SAVING_STATES];
export const isBusy = (s: RecorderState) => BUSY.includes(s);
/** The engine can take the next lesson (its own arm() refuses while capturing). */
const CAN_ARM: RecorderState[] = ["ready", "complete", "abandoned", "error", "uploading", "finalizing"];

// ------------------------------------------------------------ "Ready for today", per teacher, per day, this device

export const READY_PREFIX = "hec-recorder-ready:";
export interface ReadyRecord { date: string; armed: string[]; capturing?: string | null }
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
let storageOverride: StorageLike | null | undefined;
/** Tests: a stand-in for localStorage (null = none). */
export function setStorageForTests(s: StorageLike | null | undefined) { storageOverride = s; }
function ls(): StorageLike | null {
  if (storageOverride !== undefined) return storageOverride;
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}
function readRaw(userId: string): ReadyRecord | null {
  try {
    const v = ls()?.getItem(READY_PREFIX + userId);
    const r = v ? JSON.parse(v) : null;
    return r && typeof r.date === "string" && Array.isArray(r.armed) ? r : null;
  } catch { return null; }
}
function writeRaw(userId: string, r: ReadyRecord) { try { ls()?.setItem(READY_PREFIX + userId, JSON.stringify(r)); } catch { /* private window: Ready lasts this page only */ } }

/** This teacher pressed Ready for `date` on this device (null: not, or another day). */
export function readyFor(userId: string, date: string): ReadyRecord | null {
  const r = readRaw(userId);
  return r && r.date === date ? r : null;
}
/** "Ready for today" pressed. Keeps what was already armed today. */
export function pressReady(userId: string, date: string) {
  const r = readyFor(userId, date);
  writeRaw(userId, r ?? { date, armed: [] });
  if (current?.userId === userId) { void armTick(); redraw(); }
}
/** Sign-out (or a user change): Ready goes. No id: every teacher's on this device. */
export function clearReady(userId?: string) {
  const s = ls();
  if (!s) return;
  try {
    if (userId) { s.removeItem(READY_PREFIX + userId); return; }
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(READY_PREFIX)) keys.push(k); }
    for (const k of keys) s.removeItem(k);
  } catch { /* nothing to clear */ }
}
function updateReady(userId: string, date: string, fn: (r: ReadyRecord) => void) {
  const r = readyFor(userId, date);
  if (!r) return;
  fn(r);
  writeRaw(userId, r);
}

// ------------------------------------------------------------ the session

export interface DayDeps {
  lessons(date: string): Promise<LessonLike[]>;
  window(): Promise<WindowMinutes>;
  switchOn(classId: string): Promise<boolean>;
  now(): number;
  /** false in tests: armTick is called by hand. */
  timer?: boolean;
}
interface Day {
  deps: DayDeps;
  date: string;
  lessons: LessonLike[] | null;
  lessonsAt: number;
  w: WindowMinutes;
  switches: Map<string, { on: boolean; at: number }>;
  arming: boolean;
  retryAt: number;
  lastArmed: string | null;
  next: { sessionId: string; className: string; at: string } | null;
  problem: string | null;
  timer: ReturnType<typeof setInterval> | null;
  interrupted: boolean;
  prepareAt: number;
}

interface Session {
  userId: string; rec: RecorderLike; label: string; attached: number; state: RecorderState; offs: (() => void)[];
  pending: number; contextRunning: boolean | null; devicesOk: boolean | null; day: Day | null;
  /** boot: kept until the day is started (prepare() moves the state before the lessons are known). */
  holding: boolean;
}
let current: Session | null = null;
let unhookSignOut: (() => void) | null = null;

export interface BarExtra {
  /** Ready pressed and a lesson still to come today. */
  next?: { className: string; at: string } | null;
  /** Why the next lesson will NOT be armed (said loudly). */
  problem?: string | null;
  /** The browser wants one click before sound (after a reload). */
  needsClick?: boolean;
  /** A full-screen page hides the recorder screen's own bar: draw this one even then. */
  fullscreen?: boolean;
  /** The page was reloaded while capturing. */
  interrupted?: boolean;
}
export interface BarModel { show: boolean; text: string; redDot: boolean; alert: boolean; stop: boolean; allowSound: boolean }

/** What the floating bar says (show false = not drawn). Pure. */
export function floatingBarModel(state: RecorderState, label: string, attached: boolean, extra: BarExtra = {}): BarModel {
  const off: BarModel = { show: false, text: "", redDot: false, alert: false, stop: false, allowSound: false };
  if (attached && !extra.fullscreen) return off;
  const what = label ? ` - ${label}` : "";
  const bar = (text: string, o: Partial<BarModel> = {}): BarModel => ({ ...off, show: true, text, allowSound: !!extra.needsClick, ...o });
  switch (state) {
    case "recording": return bar(`Recording${what}`, { redDot: true, stop: true });
    case "stalled": return bar(`NOT RECORDING - the audio stopped${what}`, { alert: true, stop: true });
    case "starting": return bar(`Saving on this laptop - waiting for the school server${what}`, { stop: true });
    case "armed": return extra.needsClick
      ? bar(`NOT READY - click "Allow sound" or this lesson is not recorded${what}`, { alert: true })
      : bar(`Armed${what} - recording starts at ${extra.next?.at ?? "the lesson's start"} by itself`);
    case "stopping": case "uploading": case "finalizing":
      if (extra.next && extra.problem) return bar(`NOT armed: ${extra.problem} - open the recorder`, { alert: true });
      return bar(extra.interrupted ? "The page was reloaded during the lesson: the recording so far is being saved - keep this tab open" : "Saving the recording - keep this tab open");
    default:
      if (!extra.next) return off;
      if (extra.problem) return bar(`NOT armed: ${extra.problem} - open the recorder`, { alert: true });
      if (extra.needsClick) return bar(`Ready for today - click "Allow sound" so ${extra.next.className} can be recorded at ${extra.next.at}`, { alert: true });
      return bar(`Ready for today - ${extra.next.className} records from ${extra.next.at} by itself. Keep this tab open.`);
  }
}

/** The engine this user already has (the screen re-attaches to it), or null. Another user's is ended first. */
export function sessionFor(userId: string): RecorderLike | null {
  if (current && current.userId !== userId) void endSession();
  return current?.rec ?? null;
}

/** A new engine for this user: owned here from now on. */
export function adopt(userId: string, rec: RecorderLike) {
  if (current && current.rec !== rec) void endSession();
  const s: Session = { userId, rec, label: "", attached: 0, state: rec.state, offs: [], pending: 0, contextRunning: null, devicesOk: null, day: null, holding: false };
  s.offs.push(rec.on("state", ({ state }) => { s.state = state; onState(s); redraw(); maybeEnd(); }));
  s.offs.push(rec.on("upload", (p) => { s.pending = p?.pending ?? 0; maybeEnd(); }));
  current = s;
  unhookSignOut?.();
  unhookSignOut = registerSignOutHook(async () => {
    if (!current) return true;
    if (CAPTURING_STATES.includes(current.state)) {
      if (typeof window !== "undefined") window.alert("A lesson is being recorded. Stop it before signing out.");
      return false;
    }
    const held = await current.rec.heldAudio().catch(() => []);
    if (held.length && typeof window !== "undefined" && !window.confirm(`${held.length} recording${held.length === 1 ? " has" : "s have"} not reached the school server yet. They stay on this laptop and are sent when you sign in here again. Sign out now?`)) return false;
    const uid = current.userId;
    await current.rec.signOut().catch(() => null);
    clearReady(uid);
    teardown();
    return true;
  });
}

/** What the last prepare() found (the screen's click, or boot after a reload). */
export function setPrepared(p: { contextRunning: boolean; devicesOk: boolean }) {
  if (!current) return;
  current.contextRunning = p.contextRunning;
  current.devicesOk = p.devicesOk;
  redraw();
  void armTick();
}

/** The day's lessons are armed from here. Idempotent: the screen and boot both call it. */
export function startDay(deps: DayDeps) {
  const s = current;
  if (!s) return;
  s.holding = false;
  if (s.day) { s.day.deps = deps; void armTick(); return; }
  const now = deps.now();
  const d: Day = {
    deps, date: hanoiDate(now), lessons: null, lessonsAt: 0, w: DEFAULT_MINUTES, switches: new Map(), arming: false, retryAt: 0,
    lastArmed: null, next: null, problem: null, timer: null, interrupted: false, prepareAt: 0,
  };
  // A page that died while a lesson was capturing: the rest of that lesson is armed again
  // (the engine finishes the part already recorded). One the teacher Stopped stays done.
  const r = readyFor(s.userId, d.date);
  if (r?.capturing && !CAPTURING_STATES.includes(s.state)) {
    const sid = r.capturing;
    updateReady(s.userId, d.date, (x) => { x.armed = x.armed.filter((a) => a !== sid); x.capturing = null; });
    d.interrupted = true;
  }
  s.day = d;
  if (deps.timer !== false && typeof setInterval !== "undefined") d.timer = setInterval(() => void armTick(), 5000);
  void armTick();
}

/**
 * One pass of the arming rule (every 5 s): the first lesson today that is not
 * over and not already armed today; armed once its arm window opens, with the
 * back-to-back stop at the next lesson's start. Exported for tests.
 */
export async function armTick(): Promise<void> {
  const s = current, d = s?.day;
  if (!s || !d || d.arming) return;
  const now = d.deps.now();
  const date = hanoiDate(now);
  if (date !== d.date) { d.date = date; d.lessons = null; d.interrupted = false; }
  const ready = readyFor(s.userId, date);
  if (!ready) { if (d.next || d.problem) { d.next = null; d.problem = null; redraw(); } return; }
  d.arming = true;
  try {
    if (!d.lessons || now - d.lessonsAt > 60_000) {
      try { d.w = await d.deps.window(); d.lessons = await d.deps.lessons(date); d.lessonsAt = now; }
      catch { if (!d.lessons) return; }
    }
    if (current !== s) return;
    // The first lesson not over, not armed today, and not switched off (a switched-off class is skipped calmly).
    let todo = (d.lessons ?? []).filter((l) => !ready.armed.includes(l.sessionId));
    let lesson: LessonLike | null = null;
    for (;;) {
      lesson = pickLesson(todo, now, d.w);
      if (!lesson) break;
      let sw = d.switches.get(lesson.classId);
      if (!sw || now - sw.at > 60_000) {
        try { sw = { on: await d.deps.switchOn(lesson.classId), at: now }; d.switches.set(lesson.classId, sw); } catch { /* keep the last answer */ }
      }
      if (!sw || sw.on) break;
      const skip = lesson.sessionId;
      todo = todo.filter((l) => l.sessionId !== skip);
    }
    if (current !== s) return;
    d.next = lesson ? { sessionId: lesson.sessionId, className: lesson.className, at: addMinutes(lesson.startTime, -d.w.preRoll) } : null;
    d.problem = null;
    if (!lesson) return;
    if (!isBusy(s.state)) s.label = lesson.className;
    if (s.rec.durable === false) { d.problem = "this browser cannot keep recordings safely"; return; }
    const phase = lessonPhase(lesson, now, d.w);
    if (phase !== "arming" && phase !== "capturing") return;
    // Microphones and sound are checked again before arming, not trusted from the morning.
    if ((s.devicesOk !== true || s.contextRunning !== true) && now - d.prepareAt > 30_000) {
      d.prepareAt = now;
      try { const p = await s.rec.prepare(); s.contextRunning = p.contextRunning; s.devicesOk = p.devices.status === "ok"; } catch { /* said by the engine */ }
    }
    if (s.devicesOk === false) { d.problem = "a microphone is not plugged in"; return; }
    if (s.devicesOk !== true || s.contextRunning !== true) return;              // the bar asks for the click
    if (!CAN_ARM.includes(s.state) || now < d.retryAt) return;
    const next = nextAfter(lesson, d.lessons ?? [], d.w);
    const stopAt = next ? lessonTimes(next, d.w).start : undefined;
    try {
      await s.rec.arm({ sessionId: lesson.sessionId, classId: lesson.classId, className: lesson.className, date: lesson.date, startTime: lesson.startTime, endTime: lesson.endTime, status: lesson.status ?? undefined }, { stopAt });
      d.lastArmed = lesson.sessionId; d.retryAt = 0;
      s.label = lesson.className;
      updateReady(s.userId, date, (x) => { if (!x.armed.includes(lesson.sessionId)) x.armed.push(lesson.sessionId); });
    } catch (e) {
      const err = e as RecorderError;
      // A stated "no" (switched off, cancelled, not your class, window over): this lesson is done for today.
      if (err?.code === "server_refused" && !err.retryable) updateReady(s.userId, date, (x) => { if (!x.armed.includes(lesson.sessionId)) x.armed.push(lesson.sessionId); });
      else { d.retryAt = now + 30_000; d.problem = err?.code === "storage_low" || err?.code === "not_durable" ? String(err.message).replace(/^Not armed:\s*/i, "") : null; }
    }
  } finally {
    d.arming = false;
    redraw();
    maybeEnd();
  }
}

function onState(s: Session) {
  const d = s.day;
  if (!d) return;
  const date = d.date;
  if (CAPTURING_STATES.includes(s.state) && d.lastArmed) updateReady(s.userId, date, (x) => { x.capturing = d.lastArmed; });
  else if (SAVING_STATES.includes(s.state) || s.state === "complete" || s.state === "abandoned" || s.state === "error")
    updateReady(s.userId, date, (x) => { if (x.capturing) x.capturing = null; });
  if (!CAPTURING_STATES.includes(s.state) && s.state !== "armed") void armTick();   // back-to-back: the next lesson at once
}

/** The bar's "Allow sound" button, or the screen's click: resumes sound inside the click. */
export async function allowSound() {
  const s = current;
  if (!s) return;
  try { const p = await s.rec.prepare(); s.contextRunning = p.contextRunning; s.devicesOk = p.devices.status === "ok"; } catch { /* said by the engine */ }
  redraw();
  void armTick();
}

export function setLessonLabel(label: string) { if (current) { current.label = label; redraw(); } }

/** The recorder screen is showing this engine. */
export function attachScreen() { if (current) { current.attached += 1; redraw(); } }

/** The recorder screen went away: the engine carries on if it is busy or a lesson is waiting. */
export function detachScreen() {
  if (!current) return;
  current.attached = Math.max(0, current.attached - 1);
  redraw();
  maybeEnd();
}

/** For tests and the screen: what the session holds. */
export function sessionState(): { userId: string; state: RecorderState; attached: number; next: Day["next"]; problem: string | null; pending: number } | null {
  return current ? { userId: current.userId, state: current.state, attached: current.attached, next: current.day?.next ?? null, problem: current.day?.problem ?? null, pending: current.pending } : null;
}

export async function endSession() {
  const s = current;
  if (!s) return;
  teardown();
  await s.rec.dispose().catch(() => null);
}

function teardown() {
  const s = current;
  current = null;
  unhookSignOut?.(); unhookSignOut = null;
  for (const off of s?.offs ?? []) off();
  if (s?.day?.timer) clearInterval(s.day.timer);
  redraw();
}

/** Kept while busy, while uploads of any recording are pending, or while Ready waits for a lesson today. */
function keep(s: Session) {
  return s.holding || s.attached > 0 || isBusy(s.state) || s.pending > 0
    || !!(s.day && readyFor(s.userId, s.day.date) && (s.day.next || s.day.lessons === null));
}
function maybeEnd() {
  if (current && !keep(current)) void endSession();
}

// ------------------------------------------------------------ boot and the signed-in user

let lastUser: string | null = null;

/**
 * The signed-in user as the auth state says (RecorderBoot). A change of user
 * or a sign-out that bypassed the guard (expiry, another tab) ends the
 * previous teacher's session and clears their Ready.
 */
export function followUser(userId: string | null) {
  if (lastUser && lastUser !== userId) {
    clearReady(lastUser);
    // Another teacher: theirs is ended (dispose() ends a capture properly). Signed out: ended
    // unless a lesson is being captured or saved - an expired token must not cut a lesson; the
    // server refuses what it must, and the audio stays on this laptop under its owner.
    if (current && current.userId !== userId && (userId !== null || !isBusy(current.state))) void endSession();
  }
  lastUser = userId;
}

export interface BootDeps { userId: string; createRecorder(): Promise<RecorderLike>; day: DayDeps }
let booting: Promise<void> | null = null;

/**
 * A page loaded (any page) with this teacher's Ready set for today, or with
 * a recording that was capturing when the page went: the engine is brought
 * back here, so the day's lessons still arm and the interrupted one is saved.
 */
export async function boot(deps: BootDeps): Promise<void> {
  if (current?.userId === deps.userId) { startDay(deps.day); return; }
  const r = readyFor(deps.userId, hanoiDate(deps.day.now()));
  if (!r) return;
  if (booting) return booting;
  booting = (async () => {
    try {
      const rec = await deps.createRecorder();
      if (current && current.userId !== deps.userId) await endSession();
      adopt(deps.userId, rec);
      if (current) current.holding = true;
      try {
        const p = await rec.prepare();
        setPrepared({ contextRunning: p.contextRunning, devicesOk: p.devices.status === "ok" });
      } catch {
        // Another tab holds the recorder (it arms there), or this browser cannot: nothing is armed from this tab.
        await endSession();
        return;
      }
      await rec.recover().catch(() => null);
      startDay(deps.day);
    } catch { /* the engine could not be made here; the recorder page says why */ }
    finally { booting = null; }
  })();
  return booting;
}

// ------------------------------------------------------------ the floating bar (DOM)

const BAR_ID = "hec-recorder-floating";
let stopAsk = 0;   // the Stop button asks again in the bar (no browser dialog)
let fsHooked = false;

function fullscreenEl(): Element | null {
  if (typeof document === "undefined") return null;
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

function hookFullscreen() {
  if (fsHooked || typeof document === "undefined") return;
  fsHooked = true;
  const on = () => redraw();
  document.addEventListener("fullscreenchange", on);
  document.addEventListener("webkitfullscreenchange", on);
}

export function barExtra(): BarExtra {
  const s = current;
  if (!s) return {};
  const d = s.day;
  const ready = d ? !!readyFor(s.userId, d.date) : false;
  return {
    next: ready && d?.next ? { className: d.next.className, at: d.next.at } : null,
    problem: d?.problem ?? null,
    needsClick: s.contextRunning === false,
    fullscreen: !!fullscreenEl(),
    interrupted: d?.interrupted ?? false,
  };
}

function redraw() {
  if (typeof document === "undefined") return;
  hookFullscreen();
  const m = current ? floatingBarModel(current.state, current.label, current.attached > 0, barExtra()) : floatingBarModel("idle", "", true);
  let el = document.getElementById(BAR_ID);
  if (!m.show) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = BAR_ID;
    el.className = "fixed inset-x-0 bottom-0 border-t-4 bg-foreground text-background shadow-lg";
    // Above any dialog or full-screen content, and clickable while a modal dialog disables the page.
    el.style.zIndex = "2147483647";
    el.style.pointerEvents = "auto";
    el.setAttribute("data-recorder-floating", "");
  }
  // In full screen only the full-screen element is visible: the bar goes inside it, and back to the body after.
  const host = fullscreenEl() ?? document.body;
  if (el.parentNode !== host) host.appendChild(el);
  el.setAttribute("role", m.alert ? "alert" : "status");
  el.setAttribute("aria-live", m.alert ? "assertive" : "polite");
  el.classList.toggle("border-destructive", m.redDot || m.alert);
  el.classList.toggle("border-warning", !m.redDot && !m.alert);
  el.replaceChildren();
  const row = document.createElement("div");
  row.className = "max-w-3xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3";
  const text = document.createElement("span");
  text.className = "text-lg font-bold break-words min-w-0";
  text.textContent = `${m.redDot ? "● " : "⚠ "}${m.text}`;
  row.appendChild(text);
  const button = (label: string, cls: string, fn: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `min-h-11 rounded-md px-4 font-semibold ${cls}`;
    b.textContent = label;
    b.onclick = fn;
    row.appendChild(b);
    return b;
  };
  if (m.allowSound) button("Allow sound", "bg-background text-foreground", () => { void allowSound(); });
  if (!fullscreenEl()) button("Open the recorder", "ml-auto border border-background", () => { window.history.pushState({}, "", "/teacher/recorder"); window.dispatchEvent(new PopStateEvent("popstate")); });
  if (m.stop) {
    const asking = Date.now() - stopAsk < 8000;
    if (asking) {
      button("Keep recording", "border border-background", () => { stopAsk = 0; redraw(); });
      button("Yes, stop recording", "bg-background text-foreground", () => { stopAsk = 0; if (current) void current.rec.stop("manual"); });
    } else {
      button("Stop", "bg-background text-foreground", () => { stopAsk = Date.now(); redraw(); setTimeout(redraw, 8100); });
    }
  }
  el.appendChild(row);
}

// Sign-out with no recorder on the page still clears every Ready on this device.
registerSignOutHook(async () => { if (!current) clearReady(); return true; });
