// Keeping the phone's microphone alive (23 Nov 2026).
//
// What iOS does (docs/RECORDER_RUNBOOK.md, "The phone and the locked
// screen"): Safari, and a home-screen web app, stop microphone capture when
// the screen locks, when the page goes to the background, or when a call or
// Siri takes the audio. The MediaStreamTrack is muted or ended and the
// AudioContext goes "interrupted" or "suspended"; nothing a web page does
// keeps it running behind a locked screen. So the page:
//   1. holds a Screen Wake Lock (Safari 16.4+) and asks for it again every
//      time the page is visible, so the phone does not lock ON ITS OWN;
//   2. offers a dimmed black "recording" view to leave the screen on all
//      lesson at little battery cost;
//   3. watches the capture (`captureHealth`) and, when it stops, says so
//      loudly here and on the laptop, and restarts it the moment the page is
//      visible again, joining it onto the timeline (PhoneTeacherTrack.breakStretch).
//
// `ScreenKeeper` takes its navigator and document by injection (tests pass
// fakes); `captureHealth` is pure.

export interface WakeSentinelLike { released?: boolean; release(): Promise<void>; addEventListener?(t: "release", fn: () => void): void }
export interface WakeNavigatorLike { wakeLock?: { request(type: "screen"): Promise<WakeSentinelLike> } }
export interface VisibilityDocLike {
  visibilityState: string;
  addEventListener(t: "visibilitychange", fn: () => void): void;
  removeEventListener(t: "visibilitychange", fn: () => void): void;
}

export interface KeeperState { supported: boolean; held: boolean; error: string | null }

/** The Screen Wake Lock, asked for again whenever the page is visible and the lock was let go. */
export class ScreenKeeper {
  private sentinel: WakeSentinelLike | null = null;
  private want = false;
  private st: KeeperState;
  private onVis = () => { if (this.doc.visibilityState === "visible" && this.want) void this.acquire(); };
  constructor(private nav: WakeNavigatorLike, private doc: VisibilityDocLike, private onChange?: (s: KeeperState) => void) {
    this.st = { supported: !!nav.wakeLock?.request, held: false, error: null };
  }
  get state(): KeeperState { return this.st; }
  private set(p: Partial<KeeperState>) { this.st = { ...this.st, ...p }; this.onChange?.(this.st); }

  async start() {
    if (this.want) return;
    this.want = true;
    this.doc.addEventListener("visibilitychange", this.onVis);
    await this.acquire();
  }

  async acquire() {
    if (!this.want || !this.nav.wakeLock?.request) return;
    if (this.sentinel && !this.sentinel.released) return;
    if (this.doc.visibilityState !== "visible") return; // only a visible page may hold it; asked again on visibilitychange
    try {
      const s = await this.nav.wakeLock.request("screen");
      this.sentinel = s;
      s.addEventListener?.("release", () => { if (this.sentinel === s) { this.sentinel = null; this.set({ held: false }); } });
      this.set({ held: true, error: null });
    } catch (e: any) {
      this.set({ held: false, error: String(e?.message ?? e) });
    }
  }

  async stop() {
    this.want = false;
    this.doc.removeEventListener("visibilitychange", this.onVis);
    const s = this.sentinel; this.sentinel = null;
    try { await s?.release(); } catch { /* already let go */ }
    this.set({ held: false });
  }
}

export interface CaptureSignals {
  /** document.visibilityState === "visible" */
  visible: boolean;
  /** MediaStreamTrack.readyState */
  trackState: "live" | "ended" | null;
  /** MediaStreamTrack.muted (iOS mutes it when capture is interrupted) */
  trackMuted: boolean;
  /** AudioContext.state ("interrupted" is Safari's) */
  contextState: string | null;
  /** ms since the last batch of audio reached the page */
  sinceAudioMs: number;
}

/** ok, or why not: what stopped it, whether it can be restarted now, the words to show. */
export interface CaptureVerdict {
  ok: boolean;
  reason?: "hidden" | "track_ended" | "track_muted" | "context_stopped" | "no_audio";
  restart?: "now" | "when_visible";
  text?: string;
}

/** No audio for this long while visible: the capture has stopped even if nothing said so. */
export const PHONE_NO_AUDIO_MS = 3000;

/** Is the phone's capture running? If not, why, and can it be restarted now (pure, tested). */
export function captureHealth(s: CaptureSignals): CaptureVerdict {
  if (!s.visible) return { ok: false, reason: "hidden", restart: "when_visible", text: "The phone's screen is locked or this page is hidden: iPhone has stopped the microphone. Unlock the phone and open this page again." };
  if (s.trackState === "ended") return { ok: false, reason: "track_ended", restart: "now", text: "The microphone was stopped by the phone. Restarting it..." };
  if (s.contextState && s.contextState !== "running") return { ok: false, reason: "context_stopped", restart: "now", text: "The phone paused the sound. Restarting it..." };
  if (s.trackMuted) return { ok: false, reason: "track_muted", restart: "now", text: "The phone has muted the microphone (a call, Siri or another app). Restarting it..." };
  if (s.sinceAudioMs > PHONE_NO_AUDIO_MS) return { ok: false, reason: "no_audio", restart: "now", text: "No sound from the microphone for a few seconds. Restarting it..." };
  return { ok: true };
}
