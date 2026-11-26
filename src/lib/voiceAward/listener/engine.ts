/**
 * The listening state machine. Pure of the browser: it is fed 16 kHz samples and
 * calls the ListenerEvents; the speaker check is handed in as `embed`.
 *
 *   listening  every speech onset (speech after a pause of 200 ms) is scored against the
 *              teacher's "HEC" templates (subsequence DTW) once 1.2 s of it exists, or as
 *              soon as the speaker pauses
 *   recording  wake word heard: keep going until 800 ms of silence or 7 s, then cut the clip
 *              (200 ms before the wake word .. 200 ms after the last sound)
 *   checking   embed the clip, cosine against the profile, send or reject
 *
 * Imports only listener modules and types.
 */
import type { CommandClip, ListenerEvents, VoiceprintProfile } from "../listenerApi";
import { cosine, energyDb } from "./dsp";
import { wakeScore } from "./dtw";
import { fitForEmbedding } from "./embedding";
import { MFCC_FRAME, MFCC_HOP, mfccStatic, withDeltas } from "./mfcc";
import { OnlineVad } from "./vad";
import { floatToWavBase64 } from "./wav";
import { fromStored } from "./calibrate";

export const RATE = 16000;
export const PRE_ROLL_S = 0.2;
export const END_SILENCE_FRAMES = 80; // + the VAD hangover (8) = about 900 ms of quiet
export const MAX_CLIP_S = 7;
export const MIN_CLIP_S = 0.8;
export const MIN_AFTER_WAKE_FRAMES = 20; // speech needed after the wake word, or there is no command
const ONSET_GAP = 20; // frames of quiet before speech counts as a new onset
const ONSET_DEBOUNCE = 4; // frames of speech before an onset is believed
const CHECK_AFTER = 120; // frames of speech after the onset when it is scored regardless
const PAUSE_CHECK = 25; // frames of quiet after the onset that make it score early
const WINDOW_FRAMES = 130;
const RING_SECONDS = 20;
const FEAT_RING = 1000;

export interface EngineHooks {
  embed(wave: Float32Array): Promise<Float32Array>;
  /** Diagnostics only. */
  onWakeCheck?(info: { score: number; dists: number[]; heard: boolean; ms: number }): void;
}

type Phase = "listening" | "recording";

export class ListenerEngine {
  private readonly cap = RATE * RING_SECONDS;
  private ring = new Float32Array(this.cap);
  private total = 0;
  private feats: Float32Array[] = new Array(FEAT_RING);
  private nextFrame = 0;
  private vad = new OnlineVad();
  private phase: Phase = "listening";
  private paused = false;
  private stopped = false;
  private speechRun = 0;
  private silenceRun = 99; // quiet frames just before now
  private gapBeforeRun = 99;
  private pending: { frame: number }[] = [];
  private lastSpeechFrame = -1;
  private wakeFrame = 0;
  private wakeEnd = 0;
  private clipStart = 0;
  private levelAcc = 0;
  private levelN = 0;
  private checks = 0;
  private readonly templates: Float32Array[][];

  constructor(private readonly profile: VoiceprintProfile, private readonly events: ListenerEvents, private readonly hooks: EngineHooks) {
    this.templates = profile.wakeTemplates.map(fromStored);
  }

  /** Feed 16 kHz mono samples in [-1,1]. */
  push(x: Float32Array): void {
    if (this.paused || this.stopped || !x.length) return;
    // write to the ring
    for (let i = 0; i < x.length; i++) this.ring[(this.total + i) % this.cap] = x[i];
    this.total += x.length;
    // level meter: about 15 a second
    let s = 0;
    for (let i = 0; i < x.length; i++) s += x[i] * x[i];
    this.levelAcc += s; this.levelN += x.length;
    if (this.levelN >= RATE / 15) {
      const db = 10 * Math.log10(this.levelAcc / this.levelN + 1e-10);
      this.events.onLevel?.(Math.max(0, Math.min(1, (db + 60) / 50)));
      this.levelAcc = 0; this.levelN = 0;
    }
    while (this.total >= this.nextFrame * MFCC_HOP + MFCC_FRAME) this.frame(this.nextFrame++);
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.events.onState("paused");
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.phase = "listening";
    this.pending = [];
    this.vad.reset();
    this.speechRun = 0; this.silenceRun = 99; this.gapBeforeRun = 99;
    this.nextFrame = Math.ceil(this.total / MFCC_HOP);
    this.events.onState("listening");
  }

  stop(): void { this.stopped = true; }

  /** Number of wake checks run so far (for the tests). */
  get wakeChecks(): number { return this.checks; }

  private slice(a: number, b: number): Float32Array {
    const out = new Float32Array(b - a);
    for (let i = a; i < b; i++) out[i - a] = this.ring[i % this.cap];
    return out;
  }

  private frame(f: number): void {
    const o = f * MFCC_HOP;
    const samples = this.slice(o, o + MFCC_FRAME);
    this.feats[f % FEAT_RING] = mfccStatic(samples);
    const speech = this.vad.update(energyDb(samples));
    if (speech) {
      if (this.speechRun === 0) this.gapBeforeRun = this.silenceRun;
      this.speechRun++; this.silenceRun = 0; this.lastSpeechFrame = f;
    } else {
      this.speechRun = 0; this.silenceRun++;
    }

    if (this.phase === "recording") {
      const elapsed = (f * MFCC_HOP + MFCC_FRAME - this.wakeFrame * MFCC_HOP) / RATE;
      if (this.silenceRun >= END_SILENCE_FRAMES || elapsed >= MAX_CLIP_S) this.finishClip();
      return;
    }

    if (speech && this.speechRun === ONSET_DEBOUNCE && this.gapBeforeRun >= ONSET_GAP) {
      this.pending.push({ frame: f - ONSET_DEBOUNCE + 1 });
    }
    if (!this.pending.length) return;
    const p = this.pending[0];
    const age = f - p.frame;
    const spokeAndStopped = this.silenceRun >= PAUSE_CHECK && f - this.silenceRun > p.frame && age >= PAUSE_CHECK;
    if (age >= CHECK_AFTER || spokeAndStopped) {
      this.pending.shift();
      const end = this.checkWake(p.frame, f);
      if (end !== null) this.startRecording(p.frame, end);
    }
  }

  /** Returns the absolute frame where the wake word ended, or null when it was not heard. */
  private checkWake(onset: number, now: number): number | null {
    const t0 = performance.now();
    const from = Math.max(onset - 2, now - FEAT_RING + 1, 0);
    const to = Math.min(now, onset + WINDOW_FRAMES);
    const raw: Float32Array[] = [];
    for (let k = from; k <= to; k++) raw.push(this.feats[k % FEAT_RING]);
    const seq = withDeltas(raw);
    const { score, dists, end } = wakeScore(this.templates, seq);
    const heard = score <= this.profile.wakeThreshold;
    this.checks++;
    this.hooks.onWakeCheck?.({ score, dists, heard, ms: performance.now() - t0 });
    return heard ? from + Math.max(0, end) : null;
  }

  private startRecording(onset: number, wakeEnd: number): void {
    this.phase = "recording";
    this.wakeFrame = onset;
    this.wakeEnd = wakeEnd;
    this.pending = [];
    this.clipStart = Math.max(0, onset * MFCC_HOP - Math.round(PRE_ROLL_S * RATE), this.total - this.cap + 1);
    this.events.onState("recording");
  }

  private finishClip(): void {
    const end = Math.min(this.total, this.lastSpeechFrame * MFCC_HOP + MFCC_FRAME + Math.round(0.2 * RATE));
    const start = this.clipStart;
    this.phase = "listening";
    this.pending = [];
    this.speechRun = 0;
    const clip = this.slice(start, Math.max(start, end));
    const afterWake = this.lastSpeechFrame - this.wakeEnd;
    if (clip.length < MIN_CLIP_S * RATE || afterWake < MIN_AFTER_WAKE_FRAMES) {
      this.events.onRejected("too_short");
      this.events.onState("listening");
      return;
    }
    this.events.onState("checking");
    this.hooks.embed(fitForEmbedding(clip)).then(
      (emb) => {
        const score = cosine(emb, this.profile.embedding);
        if (score >= this.profile.threshold) {
          const wavBase64 = floatToWavBase64(clip, RATE);
          const c: CommandClip = { wavBase64, durationMs: Math.round((clip.length / RATE) * 1000), speakerScore: score };
          this.events.onCommand(c);
        } else this.events.onRejected("not_teacher", score);
        if (this.phase === "listening" && !this.paused) this.events.onState("listening");
      },
      (err) => {
        this.events.onState("error", err instanceof Error ? err.message : String(err));
        if (this.phase === "listening" && !this.paused) this.events.onState("listening");
      },
    );
  }
}
