/**
 * Enrolment: turns a ~30 s reading and five "HEC" samples into a VoiceprintProfile.
 * Pure of the browser: the embedder is handed in (a worker in the app, plain
 * onnxruntime in the tests). Imports only listener modules and the profile types.
 */
import type { EnrolmentQuality, VoiceprintProfile } from "../listenerApi";
import { cosine, l2normalise } from "./dsp";
import { wakeScore } from "./dtw";
import type { Embedder } from "./embedding";
import { MFCC_HOP, mfccFrames, withDeltas } from "./mfcc";
import { speechBounds, speechFlags } from "./vad";

export const RATE = 16000;
const WINDOW = 3 * RATE, HOP = Math.floor(1.5 * RATE);
export const MIN_READING_SPEECH_S = 15;
export const MAX_WAKE_SAMPLE_S = 1.2;
const MIN_WAKE_SAMPLE_S = 0.15;
/** Cap 0.5, not 0.6: commands are short (1-3 s) and score lower than the 3 s windows of the reading. */
export const THRESHOLD_MIN = 0.35, THRESHOLD_MAX = 0.5;

/** A wake template is the cepstra + deltas of one trimmed "HEC", as plain arrays for storage. */
export function wakeTemplateOf(sample: Float32Array): { frames: Float32Array[]; seconds: number } | null {
  const b = speechBounds(sample);
  if (!b) return null;
  const from = Math.max(0, b.first - 1) * MFCC_HOP;
  const to = Math.min(sample.length, (b.last + 1) * MFCC_HOP + 240);
  const seg = sample.subarray(from, to);
  const frames = withDeltas(mfccFrames(seg));
  return { frames, seconds: (b.last - b.first + 1) * 0.01 };
}

const round = (a: Float32Array) => Array.from(a, (v) => Math.round(v * 1e4) / 1e4);
export const toStored = (t: Float32Array[]): number[][] => t.map(round);
export const fromStored = (t: number[][]): Float32Array[] => t.map((f) => Float32Array.from(f));

/** Best-2-of-4 style score of one template against the others (each used as a "segment"). */
function leaveOneOut(templates: Float32Array[][]): number[] {
  return templates.map((t, i) => {
    const others = templates.filter((_, j) => j !== i);
    return wakeScore(others.map((o) => o), t).score; // t as the sequence, the others as templates
  });
}

/**
 * Distances of every onset in the reading to the templates: what the wake word
 * must beat. An onset is a speech start after a pause of at least 200 ms;
 * the 1.2 s that follow are scored, as the live listener does.
 */
export function negativeScores(reading: Float32Array, templates: Float32Array[][]): number[] {
  const { flags } = speechFlags(reading);
  const frames = withDeltas(mfccFrames(reading));
  const out: number[] = [];
  let silent = 99;
  for (let f = 0; f < flags.length; f++) {
    if (flags[f]) {
      if (silent >= 20) {
        const seq = frames.slice(Math.max(0, f - 2), Math.min(frames.length, f + 130));
        if (seq.length > 30) out.push(wakeScore(templates, seq).score);
      }
      silent = 0;
    } else silent++;
  }
  return out;
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

export interface WakeCalibration {
  ok: boolean;
  message: string;
  templates: Float32Array[][];
  threshold: number;
  detail: { loo: number[]; negMin: number | null; negCount: number };
}

export function calibrateWake(wakeSamples: Float32Array[], reading: Float32Array | null): WakeCalibration {
  const bad = (message: string): WakeCalibration => ({ ok: false, message, templates: [], threshold: 0, detail: { loo: [], negMin: null, negCount: 0 } });
  if (wakeSamples.length < 3) return bad("Say HEC at least three times.");
  const templates: Float32Array[][] = [];
  for (let i = 0; i < wakeSamples.length; i++) {
    const t = wakeTemplateOf(wakeSamples[i]);
    if (!t) return bad(`I could not hear HEC in sample ${i + 1}. Say it a little louder and closer to the microphone.`);
    if (t.seconds > MAX_WAKE_SAMPLE_S) return bad(`Sample ${i + 1} is too long. Say just the one word HEC, then stop.`);
    if (t.seconds < MIN_WAKE_SAMPLE_S) return bad(`Sample ${i + 1} is too short. Say HEC clearly.`);
    templates.push(t.frames);
  }
  const loo = leaveOneOut(templates);
  const med = median(loo);
  const worst = Math.max(...loo);
  if (worst > 1.8 * med && worst - med > 2) {
    const k = loo.indexOf(worst) + 1;
    return { ...bad(`Sample ${k} sounds different from the others. Say HEC the same way each time.`), templates, detail: { loo, negMin: null, negCount: 0 } };
  }
  // Threshold. A real HEC inside a sentence scores a little worse than one said on its own
  // (that is what the leave-one-out scores measure), so expect the worst leave-one-out plus 25%.
  // The reading is full of OTHER words: the lowest score among them is the closest false alarm.
  // With room between the two, sit 60% of the way up (a missed HEC is more annoying than an
  // extra clip, which the speaker check throws away anyway); without room, sit in the middle.
  const expected = worst * 1.25;
  let threshold = expected * 1.2;
  let negMin: number | null = null;
  let negCount = 0;
  if (reading) {
    const neg = negativeScores(reading, templates);
    negCount = neg.length;
    if (neg.length) {
      negMin = Math.min(...neg);
      threshold = negMin > expected ? Math.min(expected + 0.6 * (negMin - expected), negMin * 0.97) : (negMin + expected) / 2;
    }
  }
  return { ok: true, message: "", templates, threshold, detail: { loo, negMin, negCount } };
}

export async function buildProfileCore(
  userId: string,
  reading: Float32Array,
  wakeSamples: Float32Array[],
  micLabel: string | null,
  embedder: Embedder,
  onProgress?: (fraction: number) => void,
): Promise<{ profile: VoiceprintProfile | null; quality: EnrolmentQuality }> {
  const fail = (message: string) => ({ profile: null, quality: { ok: false, message } });
  const { flags } = speechFlags(reading);
  const speechS = flags.filter(Boolean).length * 0.01;
  if (speechS < MIN_READING_SPEECH_S) {
    return fail(`I only heard ${Math.round(speechS)} seconds of speech. Please read the whole text aloud, about 30 seconds, without long pauses.`);
  }
  const wake = calibrateWake(wakeSamples, reading);
  if (!wake.ok) return fail(wake.message);
  onProgress?.(0.05);

  // 3 s windows with a 1.5 s hop; skip windows that are mostly silence.
  const wins: number[] = [];
  for (let s = 0; s + WINDOW <= reading.length; s += HOP) {
    let sp = 0;
    for (let f = Math.floor(s / MFCC_HOP); f < Math.floor((s + WINDOW) / MFCC_HOP) && f < flags.length; f++) if (flags[f]) sp++;
    if (sp >= 0.6 * (WINDOW / MFCC_HOP)) wins.push(s);
  }
  if (wins.length < 5) return fail("The reading had too many pauses. Please read the text again, a little faster and without stopping.");
  const embs: Float32Array[] = [];
  for (let i = 0; i < wins.length; i++) {
    embs.push(await embedder.embed(reading.subarray(wins[i], wins[i] + WINDOW)));
    onProgress?.(0.05 + (0.9 * (i + 1)) / wins.length);
  }
  const mean = (list: Float32Array[]) => {
    const m = new Float32Array(list[0].length);
    for (const e of list) for (let k = 0; k < m.length; k++) m[k] += e[k];
    return l2normalise(m);
  };
  let kept = embs;
  let centre = mean(kept);
  // Drop the least typical windows (a cough, a pupil, a door): the lowest 20%, keeping at least 5.
  const order = embs.map((e, i) => ({ i, c: cosine(e, centre) })).sort((a, b) => a.c - b.c);
  const drop = Math.min(Math.floor(embs.length * 0.2), embs.length - 5);
  const dropped = new Set(order.slice(0, Math.max(0, drop)).map((o) => o.i));
  kept = embs.filter((_, i) => !dropped.has(i));
  centre = mean(kept);
  const selfScores = kept.map((e) => cosine(e, centre));
  const meanSelf = selfScores.reduce((a, b) => a + b, 0) / selfScores.length;
  const minSelf = Math.min(...selfScores);
  if (meanSelf < 0.6 || minSelf < 0.3) {
    return fail("The reading does not sound like one steady voice (a noisy room or more than one person talking). Try again in a quiet place.");
  }
  const threshold = Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, minSelf - 0.15));
  const profile: VoiceprintProfile = {
    version: 1,
    userId,
    createdAt: new Date().toISOString(),
    embedding: Array.from(centre, (v) => Math.round(v * 1e6) / 1e6),
    threshold,
    wakeTemplates: wake.templates.map(toStored),
    wakeThreshold: wake.threshold,
    micLabel,
  };
  onProgress?.(1);
  return { profile, quality: { ok: true, message: "Voice saved on this device." } };
}

