/**
 * The laptop's end of the phone link (23 Nov 2026; the rules are in
 * src/lib/recorder/deviceLink.ts).
 *
 * Runs beside the recorder session (session.ts), not in the recorder page:
 * the engine records the lesson wherever the teacher is in the app, so the
 * phone's Stop must reach it there too. Started by RecorderBoot for a teacher
 * or admin; it joins the channel only while THIS device's microphone profile
 * says "My microphone is my phone" (a phone, or a laptop with its own lapel
 * microphone, never joins).
 *
 * What it does with the phone's commands, through the session's own exports:
 *   start - presses "Ready for today" if it was not (and brings the engine up
 *           when it is not running); the session then arms and starts the
 *           lesson at its time, or at once when its window is open.
 *   stop  - stops the capture (never gives up an armed lesson).
 * It reads nothing and writes nothing in the database itself.
 */
import { LaptopLink, LINK_BEACON_MS, supabaseLinkTransport, type LaptopPhoneView, type LaptopSnapshot } from "@/lib/recorder/deviceLink";
import { loadProfile } from "@/lib/recorder/devices";
import { hanoiDate } from "@/lib/recorderUi";
import { barExtra, CAPTURING_STATES, pressReady, readyFor, sessionFor, sessionState } from "./session";

const SAVING = ["stopping", "uploading", "finalizing"];

let current: { userId: string; link: LaptopLink | null; timer: ReturnType<typeof setInterval> | null } | null = null;
let lastView: LaptopPhoneView | null = null;
const subs = new Set<(v: LaptopPhoneView | null) => void>();
const publish = (v: LaptopPhoneView | null) => { lastView = v; for (const f of subs) f(v); };

/** The laptop's state, as the phone is told it. Exported for the tests. */
export function laptopSnapshot(userId: string, nowMs = Date.now()): LaptopSnapshot {
  const ss = sessionState();
  const ready = !!readyFor(userId, hanoiDate(nowMs));
  const none: LaptopSnapshot = { phase: ready ? "no_recorder" : "not_ready", recordingId: null, className: null, startsAt: null, note: null };
  if (!ss || ss.userId !== userId) return none;
  const ex = barExtra();
  const recordingId = sessionFor(userId)?.recordingId ?? null;
  const className = ex.next?.className ?? null;
  if (CAPTURING_STATES.includes(ss.state)) return { phase: "recording", recordingId, className, startsAt: null, note: null };
  if (SAVING.includes(ss.state)) return { phase: "saving", recordingId, className, startsAt: null, note: null };
  if (ss.state === "armed") return { phase: "armed", recordingId, className, startsAt: ex.armedAt ?? ex.next?.at ?? null, note: null };
  if (!ready) return { ...none, phase: "not_ready" };
  if (ex.problem) return { phase: "problem", recordingId: null, className, startsAt: null, note: ex.problem };
  if (ex.needsClick) return { phase: "needs_click", recordingId: null, className, startsAt: ex.next?.at ?? null, note: null };
  if (ss.state === "complete" && recordingId && !ex.next) return { phase: "done", recordingId, className, startsAt: null, note: null };
  return { phase: "waiting", recordingId: null, className, startsAt: ex.next?.at ?? null, note: ex.next ? null : "no lesson left today" };
}

/**
 * Start the laptop link for this teacher. `bootEngine` brings the recorder
 * engine up (RecorderBoot's own boot) when the phone's Record finds it not
 * running. Returns the function that ends it.
 */
export function startLaptopLink(client: unknown, userId: string, bootEngine: () => void): () => void {
  stopLaptopLink();
  const me = { userId, link: null as LaptopLink | null, timer: null as ReturnType<typeof setInterval> | null };
  current = me;
  const device = `laptop-${Math.random().toString(36).slice(2, 10)}`;
  const step = () => {
    if (current !== me) return;
    const phoneMode = loadProfile(userId)?.teacherOnPhone === true;
    if (!phoneMode) {
      if (me.link) { void me.link.close(); me.link = null; publish(null); }
      return;
    }
    if (!me.link) {
      me.link = new LaptopLink({
        transport: supabaseLinkTransport(client, userId),
        device, now: () => Date.now(),
        snapshot: () => laptopSnapshot(userId),
        pressReady: () => {
          const had = sessionState();
          pressReady(userId, hanoiDate(Date.now()));
          if (!had || had.userId !== userId) bootEngine();
        },
        stop: async () => { await sessionFor(userId)?.stop("manual"); },
        onPhone: publish,
      });
    }
    void me.link.tick();
  };
  step();
  me.timer = setInterval(step, LINK_BEACON_MS);
  return () => { if (current === me) stopLaptopLink(); };
}

export function stopLaptopLink() {
  const c = current;
  current = null;
  if (!c) return;
  if (c.timer) clearInterval(c.timer);
  void c.link?.close();
  publish(null);
}

/** What the laptop knows of the phone (null: the link is not running on this device). */
export function phoneView(): LaptopPhoneView | null { return lastView; }
export function subscribePhoneView(fn: (v: LaptopPhoneView | null) => void): () => void { subs.add(fn); return () => { subs.delete(fn); }; }
