/**
 * The recorder engine OUTLIVES the recorder page (C2 review 3, C3-a).
 *
 * Before: leaving /teacher/recorder by any in-app link unmounted the screen,
 * which disposed the engine - the recording stopped silently and the
 * microphones stayed open. Now the engine lives here, at module level, above
 * the router: the screen attaches to it while mounted and detaches when it
 * unmounts. While the engine is busy (armed, capturing, saving) and no screen
 * is attached, a small fixed bar is drawn on whatever page the teacher is on:
 * what the recorder is doing, a Stop button (with a confirmation) and "Open
 * the recorder". The engine is disposed only when it is idle and no screen
 * holds it, on a change of user, or on sign-out (through the guard below).
 *
 * The bar is plain DOM (no React tree above the router to render into), built
 * from `floatingBarModel`, which is pure and tested.
 */
import type { RecorderState } from "@/lib/recorder";
import type { RecorderLike } from "./engine";
import { registerSignOutHook } from "./signOutGuard";

export const CAPTURING_STATES: RecorderState[] = ["starting", "recording", "stalled"];
const BUSY: RecorderState[] = [...CAPTURING_STATES, "armed", "stopping", "uploading", "finalizing"];
export const isBusy = (s: RecorderState) => BUSY.includes(s);

interface Session { userId: string; rec: RecorderLike; label: string; attached: number; state: RecorderState; offs: (() => void)[] }
let current: Session | null = null;
let unhookSignOut: (() => void) | null = null;

export interface BarModel { show: boolean; text: string; redDot: boolean; alert: boolean; stop: boolean }

/** What the floating bar says for a state (null = not drawn). Pure. */
export function floatingBarModel(state: RecorderState, label: string, attached: boolean): BarModel {
  const off: BarModel = { show: false, text: "", redDot: false, alert: false, stop: false };
  if (attached || !isBusy(state)) return off;
  const what = label ? ` - ${label}` : "";
  switch (state) {
    case "recording": return { show: true, text: `Recording${what}`, redDot: true, alert: false, stop: true };
    case "stalled": return { show: true, text: `NOT RECORDING - the audio stopped${what}`, redDot: false, alert: true, stop: true };
    case "starting": return { show: true, text: `Saving on this laptop - waiting for the school server${what}`, redDot: false, alert: false, stop: true };
    case "armed": return { show: true, text: `Ready to record${what} - it starts by itself`, redDot: false, alert: false, stop: false };
    default: return { show: true, text: "Saving the recording - keep this tab open", redDot: false, alert: false, stop: false };
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
  const s: Session = { userId, rec, label: "", attached: 0, state: rec.state, offs: [] };
  s.offs.push(rec.on("state", ({ state }) => { s.state = state; redraw(); maybeEnd(); }));
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
    await current.rec.signOut().catch(() => null);
    teardown();
    return true;
  });
}

export function setLessonLabel(label: string) { if (current) { current.label = label; redraw(); } }

/** The recorder screen is showing this engine. */
export function attachScreen() { if (current) { current.attached += 1; redraw(); } }

/** The recorder screen went away: the engine carries on if it is busy. */
export function detachScreen() {
  if (!current) return;
  current.attached = Math.max(0, current.attached - 1);
  redraw();
  maybeEnd();
}

/** For tests and the screen: what the session holds. */
export function sessionState(): { userId: string; state: RecorderState; attached: number } | null {
  return current ? { userId: current.userId, state: current.state, attached: current.attached } : null;
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
  redraw();
}

function maybeEnd() {
  if (current && current.attached === 0 && !isBusy(current.state)) void endSession();
}

// ------------------------------------------------------------ the floating bar (DOM)

const BAR_ID = "hec-recorder-floating";

function redraw() {
  if (typeof document === "undefined") return;
  const m = current ? floatingBarModel(current.state, current.label, current.attached > 0) : floatingBarModel("idle", "", true);
  let el = document.getElementById(BAR_ID);
  if (!m.show) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = BAR_ID;
    el.className = "fixed inset-x-0 bottom-0 z-50 border-t-4 bg-foreground text-background shadow-lg";
    document.body.appendChild(el);
  }
  el.setAttribute("role", m.alert ? "alert" : "status");
  el.setAttribute("aria-live", m.alert ? "assertive" : "polite");
  el.classList.toggle("border-destructive", m.redDot);
  el.classList.toggle("border-warning", !m.redDot);
  el.replaceChildren();
  const row = document.createElement("div");
  row.className = "max-w-3xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3";
  const text = document.createElement("span");
  text.className = "text-lg font-bold break-words min-w-0";
  text.textContent = `${m.redDot ? "● " : "⚠ "}${m.text}`;
  row.appendChild(text);
  const open = document.createElement("button");
  open.type = "button";
  open.className = "ml-auto min-h-11 rounded-md px-4 border border-background font-semibold";
  open.textContent = "Open the recorder";
  open.onclick = () => { window.history.pushState({}, "", "/teacher/recorder"); window.dispatchEvent(new PopStateEvent("popstate")); };
  row.appendChild(open);
  if (m.stop) {
    const stop = document.createElement("button");
    stop.type = "button";
    stop.className = "min-h-11 rounded-md px-4 bg-background text-foreground font-semibold";
    stop.textContent = "Stop";
    stop.onclick = () => {
      if (!current) return;
      if (window.confirm("Stop recording this lesson? What is recorded so far is kept and saved.")) void current.rec.stop("manual");
    };
    row.appendChild(stop);
  }
  el.appendChild(row);
}
