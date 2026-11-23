// The phone link (23 Nov 2026): the class laptop (room track, Anker S500) and
// the teacher's phone (teacher track) start and stop TOGETHER.
//
// How the two find each other: not the Wi-Fi. Both are signed in as the same
// teacher, so both join one private Supabase Realtime broadcast channel,
// `recorder-link:<user id>` (RLS on realtime.messages, migration
// 20261123170000: only that account may listen or send). Each device sends a
// small beacon every few seconds (what it is doing); a beacon older than
// LINK_STALE_MS means "not connected". A button press is a COMMAND with an id;
// the laptop lists the ids it handled in its beacon, and the phone sends the
// command again every LINK_RESEND_MS until it sees its id there.
//
// Nothing depends on a message arriving. The phone also reads the recording
// row every few seconds (the fallback the phone page always had): it joins
// when the row says "recording" and finishes when it no longer does, whether
// or not a beacon said so. The channel only makes it quicker, and carries the
// one thing the row cannot: the phone's "start" and "stop" to the laptop.
//
// What "start" means on the laptop: the laptop records each lesson BY ITSELF
// in its window (session.ts armTick; the server refuses a start outside the
// window). So the phone's Record presses the laptop's "Ready for today" if
// it was not pressed, and the laptop then starts at the lesson's time, or at
// once when the window is already open. "Stop" stops the laptop's capture.
//
// The timeline rules are unchanged (phoneTrack.ts): the phone measures the
// server's clock and places its chunks against the room's first chunk; the
// laptop states pre_start_ms before any chunk. The link never moves a chunk.
//
// Pure: no DOM, no supabase import. The transport and every call are injected.

import type { ServerRecording } from "./types";
import { phoneMayJoin } from "./phoneTrack";

export const LINK_TOPIC_PREFIX = "recorder-link:";
export const linkTopic = (userId: string) => `${LINK_TOPIC_PREFIX}${userId}`;
/** A device sends its beacon this often. */
export const LINK_BEACON_MS = 3000;
/** An unacknowledged command is sent again this often. */
export const LINK_RESEND_MS = 3000;
/** No beacon for this long: the other device is not connected. */
export const LINK_STALE_MS = 15000;
/** After the phone's Stop, how long it waits for the laptop to stop before it finishes its own track anyway. */
export const PHONE_STOP_WAIT_MS = 20000;

export type LaptopPhase =
  | "no_recorder"   // signed in, but the recorder is not running on this laptop
  | "not_ready"     // "Ready for today" not pressed
  | "needs_click"   // the browser wants one click before sound
  | "waiting"       // ready; the next lesson records by itself at startsAt
  | "armed"         // armed; recording starts at startsAt
  | "recording"
  | "saving"        // stopped; sending the last pieces
  | "done"
  | "problem";      // the laptop says why it will not record (note)

export interface LaptopBeacon {
  role: "laptop"; device: string; at: number;
  phase: LaptopPhase; recordingId: string | null; className: string | null; startsAt: string | null; note: string | null;
  /** Ids of the commands this laptop has handled (the last few). */
  acks: string[];
}

export type PhonePhase = "idle" | "ready" | "waiting_for_laptop" | "recording" | "paused" | "finishing" | "done" | "stopped_by_server" | "error";

export interface PhoneBeacon {
  role: "phone"; device: string; at: number;
  phase: PhonePhase; recordingId: string | null; sentChunks: number; note: string | null; hidden: boolean;
  /** Recording with the iPhone app's own microphone (it keeps recording while the phone is locked). */
  native?: boolean;
}

export interface LinkCommand {
  role: "command"; id: string; from: string; kind: "start" | "stop"; recordingId: string | null; at: number;
}

export type LinkMessage = LaptopBeacon | PhoneBeacon | LinkCommand;

export type LinkStatus = "connecting" | "open" | "closed";

export interface LinkTransport {
  send(m: LinkMessage): Promise<void>;
  onMessage(fn: (m: LinkMessage) => void): () => void;
  status(): LinkStatus;
  close(): Promise<void>;
}

/** Is this a message of ours (a channel carries only what its own account sent, but check the shape anyway)? */
export function isLinkMessage(m: unknown): m is LinkMessage {
  const x = m as Record<string, unknown> | null;
  if (!x || typeof x !== "object" || typeof x.at !== "number") return false;
  if (x.role === "command") return typeof x.id === "string" && (x.kind === "start" || x.kind === "stop");
  return (x.role === "laptop" || x.role === "phone") && typeof x.phase === "string";
}

const newId = () => {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// ---------------------------------------------------------------- supabase-js

/**
 * The Realtime transport, with the INJECTED supabase-js client (the teacher's
 * own session; never a service key). A private channel: Realtime asks the
 * policies of 20261123170000 as this user before it lets the device join.
 */
export function supabaseLinkTransport(client: any, userId: string): LinkTransport {
  const fns = new Set<(m: LinkMessage) => void>();
  let state: LinkStatus = "connecting";
  try { void client.realtime?.setAuth?.(); } catch { /* the client sets it itself */ }
  const ch = client.channel(linkTopic(userId), { config: { private: true, broadcast: { self: false, ack: false } } });
  ch.on("broadcast", { event: "link" }, (msg: { payload?: unknown }) => {
    if (isLinkMessage(msg?.payload)) for (const f of fns) f(msg.payload);
  });
  ch.subscribe((s: string) => {
    if (s === "SUBSCRIBED") state = "open";
    else if (s === "CLOSED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") state = s === "CLOSED" ? "closed" : "connecting";
  });
  return {
    async send(m) {
      if (state !== "open") return; // not joined (yet): the row fallback and the next resend cover it
      try { await ch.send({ type: "broadcast", event: "link", payload: m }); } catch { /* sent again later */ }
    },
    onMessage(fn) { fns.add(fn); return () => { fns.delete(fn); }; },
    status: () => state,
    async close() { state = "closed"; fns.clear(); try { await client.removeChannel(ch); } catch { /* gone */ } },
  };
}

// ---------------------------------------------------------------- the phone

export type LinkRow = ServerRecording & { client_info?: Record<string, unknown> | null; classes?: { name?: string } | null };

export interface PhoneLinkDeps {
  transport: LinkTransport;
  device: string;
  now(): number;
  /** The newest recording of this teacher that is armed or recording (null: none). Throws when it cannot be read. */
  findRecording(): Promise<LinkRow | null>;
  /** One recording by id (null: not readable any more, e.g. complete). Throws when it cannot be read. */
  getRecording(id: string): Promise<LinkRow | null>;
  /** Open the teacher track on this recording (the microphone is already open). */
  join(row: LinkRow): Promise<void>;
  /** Finish the teacher track, trimmed at the laptop's Stop when there is one. */
  finish(endedAt: string | null): Promise<void>;
  onView?(v: PhoneLinkView): void;
}

export interface PhoneLinkView {
  linkOpen: boolean;
  laptop: LaptopBeacon | null;
  laptopConnected: boolean;
  /** The phone's microphone is open and waiting to join ("Record" pressed). */
  ready: boolean;
  joinedId: string | null;
  finishing: boolean;
  /** A command not yet acknowledged by the laptop. */
  pending: "start" | "stop" | null;
  /** The laptop is recording but this phone has not been told to join (a tap is needed: iOS wants it for the microphone). */
  canJoinNow: boolean;
  row: LinkRow | null;
  message: string;
  alert: boolean;
}

export class PhoneLink {
  private d: PhoneLinkDeps;
  private off: () => void;
  private ready = false;
  private joinedId: string | null = null;
  private finishing = false;
  private want: { kind: "start" | "stop"; id: string; since: number; sentAt: number } | null = null;
  private stopAskedAt: number | null = null;
  private laptop: LaptopBeacon | null = null;
  private laptopAt = -Infinity;
  private row: LinkRow | null = null;
  private me: Omit<PhoneBeacon, "role" | "device" | "at"> = { phase: "idle", recordingId: null, sentChunks: 0, note: null, hidden: false };
  private deciding: Promise<void> | null = null;
  private again = false;
  private gaveUpOnLaptop = false;
  private closed = false;

  constructor(d: PhoneLinkDeps) {
    this.d = d;
    this.off = d.transport.onMessage((m) => this.onMessage(m));
  }

  /** The page's own state, for the beacon the laptop shows. */
  setPhone(p: Partial<Omit<PhoneBeacon, "role" | "device" | "at">>) {
    const before = JSON.stringify(this.me);
    this.me = { ...this.me, ...p };
    if (JSON.stringify(this.me) !== before) void this.beacon();
  }

  /** "Record" pressed (the microphone is open): ask the laptop to start, and join as soon as it records. */
  async record(): Promise<void> {
    this.ready = true;
    this.stopAskedAt = null;
    this.gaveUpOnLaptop = false;
    if (!this.joinedId) this.command("start");
    await this.tick();
  }

  /** "Stop" pressed on the phone: stop the laptop too; the phone finishes when the laptop has stopped. */
  async stop(): Promise<void> {
    if (this.finishing) return;
    this.stopAskedAt = this.d.now();
    this.command("stop");
    await this.tick();
  }

  private command(kind: "start" | "stop") {
    this.want = { kind, id: newId(), since: this.d.now(), sentAt: -Infinity };
  }

  private onMessage(m: LinkMessage) {
    if (this.closed || m.role !== "laptop") return;
    const before = this.laptop;
    this.laptop = m;
    this.laptopAt = this.d.now();
    if (this.want && m.acks.includes(this.want.id)) this.want = null;
    // The row is read again only when the laptop's state changed (it started, stopped...): a beacon alone costs no query.
    const changed = !before || before.phase !== m.phase || before.recordingId !== m.recordingId;
    void this.decide(changed);
  }

  laptopConnected(): boolean { return this.d.now() - this.laptopAt <= LINK_STALE_MS; }

  /** Every few seconds: read the row (the fallback), resend what is not acknowledged, send the beacon, decide. */
  async tick(): Promise<void> {
    if (this.closed) return;
    await this.decide(true);
    const w = this.want;
    if (w && this.d.now() - w.sentAt >= LINK_RESEND_MS) {
      w.sentAt = this.d.now();
      await this.d.transport.send({ role: "command", id: w.id, from: this.d.device, kind: w.kind, recordingId: this.joinedId ?? this.row?.id ?? null, at: this.d.now() });
    }
    // A start nobody acknowledges is dropped once the laptop records anyway (the row says so).
    if (w && w.kind === "start" && this.joinedId) this.want = null;
    await this.beacon();
    this.view();
  }

  private async beacon() {
    if (this.closed) return;
    await this.d.transport.send({ role: "phone", device: this.d.device, at: this.d.now(), ...this.me, recordingId: this.joinedId ?? this.me.recordingId });
  }

  /** One decision at a time; a call while one runs asks for one more pass. */
  private decide(read: boolean): Promise<void> {
    if (this.deciding) { this.again = true; return this.deciding; }
    const run = (async () => {
      try {
        do {
          this.again = false;
          await this.decideOnce(read);
        } while (this.again && !this.closed);
      } finally { this.deciding = null; this.view(); }
    })();
    this.deciding = run;
    return run;
  }

  private async decideOnce(read: boolean) {
    if (read) {
      try {
        this.row = this.joinedId ? await this.d.getRecording(this.joinedId) : await this.d.findRecording();
      } catch { /* not readable now: decided on what we had, read again next tick */ }
    }
    const row = this.row;
    if (!this.joinedId) {
      if (this.ready && !this.finishing && row && row.status === "recording" && phoneMayJoin(row, null).ok) {
        this.joinedId = row.id;
        await this.d.join(row);
      }
      return;
    }
    if (this.finishing) return;
    // Finished only on the ROW's word (it holds the time of the Stop, for the trim); a laptop beacon
    // saying "saving" makes the row be read at once (onMessage), never stands in for it.
    const rowStopped = !row || row.id !== this.joinedId || row.status !== "recording";
    if (rowStopped) {
      this.finishing = true;
      this.want = null;
      await this.d.finish(row && row.id === this.joinedId ? row.ended_at ?? null : null);
      return;
    }
    if (this.stopAskedAt !== null && this.d.now() - this.stopAskedAt >= PHONE_STOP_WAIT_MS) {
      // The laptop did not stop (not connected, or it did not hear): this phone's track is finished anyway, and that is said.
      this.finishing = true;
      this.gaveUpOnLaptop = true;
      this.want = null;
      await this.d.finish(null);
    }
  }

  view(): PhoneLinkView {
    const v = phoneLinkView({
      linkOpen: this.d.transport.status() === "open", laptop: this.laptop, laptopConnected: this.laptopConnected(),
      ready: this.ready, joinedId: this.joinedId, finishing: this.finishing, pending: this.want?.kind ?? null,
      row: this.row, gaveUpOnLaptop: this.gaveUpOnLaptop,
    });
    this.d.onView?.(v);
    return v;
  }

  async close() {
    this.closed = true;
    this.off();
    await this.d.transport.close();
  }
}

/** The phone's one line about the link (pure, tested). */
export function phoneLinkView(s: {
  linkOpen: boolean; laptop: LaptopBeacon | null; laptopConnected: boolean; ready: boolean; joinedId: string | null;
  finishing: boolean; pending: "start" | "stop" | null; row: LinkRow | null; gaveUpOnLaptop?: boolean;
}): PhoneLinkView {
  const lap = s.laptopConnected ? s.laptop : null;
  const recordingNow = !!s.row && s.row.status === "recording" && phoneMayJoin(s.row, null).ok;
  const canJoinNow = !s.joinedId && !s.ready && recordingNow;
  let message = "", alert = false;
  const cls = lap?.className ?? s.row?.classes?.name ?? "the lesson";
  if (s.gaveUpOnLaptop) { message = "Your microphone stopped. The LAPTOP DID NOT STOP: stop it on the laptop."; alert = true; }
  else if (s.finishing) message = "Stopped on both. Sending the last pieces from this phone.";
  else if (s.joinedId) message = s.pending === "stop" ? "Stopping the laptop too..." : lap ? "Recording on both: this phone and the laptop." : "Recording. The laptop's link is quiet; this phone follows the recording through the server.";
  else if (canJoinNow) { message = "The laptop is recording now. Tap Record to join with this phone's microphone."; alert = true; }
  else if (!lap) {
    message = s.ready
      ? "Microphone ready. The laptop is not connected: open the class recorder on the laptop (same account). This phone joins by itself when the laptop records."
      : "The laptop is not connected. Open the class recorder on the laptop, signed in as you.";
    alert = s.ready;
  } else {
    const at = lap.startsAt ? ` at ${lap.startsAt}` : "";
    switch (lap.phase) {
      case "no_recorder": message = "The laptop is signed in but its recorder is not open: open the class recorder on the laptop."; alert = s.ready; break;
      case "not_ready": message = s.pending === "start" ? "Asking the laptop to get ready..." : "The laptop is connected. Press Record to get both ready."; break;
      case "needs_click": message = "The laptop needs ONE CLICK on its screen before it can record (the browser asks for it)."; alert = true; break;
      case "waiting": case "armed": message = `Both ready. ${cls} records by itself${at}${s.ready ? "; this phone joins then." : ". Press Record so this phone joins too."}`; break;
      case "recording": message = s.ready ? "The laptop is recording: joining..." : "The laptop is recording. Tap Record to join."; alert = !s.ready; break;
      case "saving": case "done": message = "The laptop's recording has stopped."; break;
      case "problem": message = `The laptop will not record: ${lap.note ?? "see the laptop"}.`; alert = true; break;
    }
  }
  return { linkOpen: s.linkOpen, laptop: lap, laptopConnected: s.laptopConnected, ready: s.ready, joinedId: s.joinedId, finishing: s.finishing,
    pending: s.pending, canJoinNow, row: s.row, message, alert };
}

// ---------------------------------------------------------------- the laptop

export interface LaptopSnapshot { phase: LaptopPhase; recordingId: string | null; className: string | null; startsAt: string | null; note: string | null }

export interface LaptopLinkDeps {
  transport: LinkTransport;
  device: string;
  now(): number;
  snapshot(): LaptopSnapshot;
  /** "Ready for today" (the recorder then arms and starts the lesson by itself). */
  pressReady(): void | Promise<void>;
  /** Stop the recording that is capturing. */
  stop(): Promise<void>;
  onPhone?(v: LaptopPhoneView): void;
}

export interface LaptopPhoneView { connected: boolean; phone: PhoneBeacon | null; line: string; alert: boolean }

export class LaptopLink {
  private d: LaptopLinkDeps;
  private off: () => void;
  private acks: string[] = [];
  private handled = new Set<string>();
  private phone: PhoneBeacon | null = null;
  private phoneAt = -Infinity;
  private closed = false;

  constructor(d: LaptopLinkDeps) {
    this.d = d;
    this.off = d.transport.onMessage((m) => { void this.onMessage(m); });
  }

  private async onMessage(m: LinkMessage) {
    if (this.closed) return;
    if (m.role === "phone") { this.phone = m; this.phoneAt = this.d.now(); this.view(); return; }
    if (m.role !== "command") return;
    if (!this.handled.has(m.id)) {
      this.handled.add(m.id);
      await this.handle(m).catch(() => { /* the laptop's own screen says what went wrong */ });
      this.acks = [...this.acks, m.id].slice(-10);
    }
    await this.beacon();
  }

  private async handle(c: LinkCommand) {
    const s = this.d.snapshot();
    if (c.kind === "start") {
      // Everything else needs nothing: armed or waiting starts by itself; a click or a problem is said in the beacon.
      if (s.phase === "not_ready" || s.phase === "no_recorder") await this.d.pressReady();
      return;
    }
    // Stop only a capture, and only the one the phone is in when it names one. An armed lesson is never given up from the phone.
    if (s.phase === "recording" && (!c.recordingId || !s.recordingId || c.recordingId === s.recordingId)) await this.d.stop();
  }

  async beacon() {
    if (this.closed) return;
    await this.d.transport.send({ role: "laptop", device: this.d.device, at: this.d.now(), ...this.d.snapshot(), acks: this.acks });
  }

  async tick() { await this.beacon(); this.view(); }

  view(): LaptopPhoneView {
    const v = laptopPhoneView(this.phone, this.d.now() - this.phoneAt <= LINK_STALE_MS, this.d.snapshot());
    this.d.onPhone?.(v);
    return v;
  }

  async close() { this.closed = true; this.off(); await this.d.transport.close(); }
}

/** The laptop's one line about the phone (pure, tested). */
export function laptopPhoneView(phone: PhoneBeacon | null, connected: boolean, me: Pick<LaptopSnapshot, "phase" | "recordingId">): LaptopPhoneView {
  const capturing = me.phase === "recording";
  // The HEC app keeps recording behind a locked screen while its page (and so its link) may be paused.
  if (!connected && phone?.native && (phone.phase === "recording" || phone.phase === "waiting_for_laptop")) {
    return { connected: false, phone, alert: false,
      line: "Phone locked: the HEC app keeps recording the teacher microphone. Its link is quiet until the phone is unlocked." };
  }
  if (!connected || !phone) {
    return { connected: false, phone: null, alert: capturing,
      line: capturing ? "Phone NOT connected: the teacher microphone may not be recording (phone screen locked, page closed or no internet). Unlock the phone and keep /teacher/recorder/phone open."
        : "Phone not connected. On the phone open /teacher/recorder/phone and press Record." };
  }
  const sent = phone.sentChunks ? ` (${phone.sentChunks} pieces sent)` : "";
  if ((phone.hidden && !phone.native) || phone.phase === "paused")
    return { connected: true, phone, alert: true, line: "Phone PAUSED: its screen is locked or the page is hidden. Unlock the phone and keep the recorder page open." };
  switch (phone.phase) {
    case "recording": return { connected: true, phone, alert: false, line: `Phone connected and recording${sent}.` };
    case "waiting_for_laptop": return { connected: true, phone, alert: false, line: "Phone connected; it starts sending with the laptop's first piece of room audio." };
    case "ready": return { connected: true, phone, alert: capturing, line: capturing ? "Phone connected, microphone ready, joining..." : "Phone connected, microphone ready: it joins when this laptop records." };
    case "finishing": return { connected: true, phone, alert: false, line: `Phone finishing: sending its last pieces${sent}.` };
    case "done": return { connected: true, phone, alert: false, line: `Phone done${sent}.` };
    case "stopped_by_server": case "error": return { connected: true, phone, alert: true, line: `Phone problem: ${phone.note ?? "see the phone"}.` };
    default: return { connected: true, phone, alert: capturing, line: capturing ? "Phone connected but NOT recording: press Record on the phone." : "Phone connected. Press Record on either device." };
  }
}
