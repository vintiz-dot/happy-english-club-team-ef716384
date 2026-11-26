/**
 * Energy voice-activity detection with an adaptive noise floor and a hangover.
 * Frames are 10 ms hops of a 25 ms window (see mfcc.ts). Pure: imports only ./dsp.
 */
import { energyDb } from "./dsp";
import { MFCC_FRAME, MFCC_HOP } from "./mfcc";

export const VAD_ENTER_DB = 10; // above the floor: speech
export const VAD_STAY_DB = 6; // above the floor: speech goes on
export const VAD_ABS_DB = -62; // never speech below this (about 0.0008 rms)
export const VAD_HANGOVER = 8; // frames kept as speech after the energy drops

export class OnlineVad {
  floor: number;
  private hang = 0;
  private on = false;

  constructor(initialFloor = Number.NaN) {
    this.floor = initialFloor;
  }

  reset(): void {
    this.floor = Number.NaN;
    this.hang = 0;
    this.on = false;
  }

  /** Feed one frame's energy (dB); returns whether the frame counts as speech. */
  update(db: number): boolean {
    if (Number.isNaN(this.floor)) this.floor = Math.max(db, -80);
    if (db < this.floor) this.floor = this.floor * 0.7 + Math.max(db, -80) * 0.3;
    else this.floor += (this.on ? 0.002 : 0.01) * (db - this.floor);
    const hot = db > this.floor + (this.on ? VAD_STAY_DB : VAD_ENTER_DB) && db > VAD_ABS_DB;
    if (hot) { this.hang = VAD_HANGOVER; this.on = true; return true; }
    if (this.hang > 0) { this.hang--; return true; }
    this.on = false;
    return false;
  }
}

/** dB of every 10 ms frame of a wave. */
export function frameEnergies(wave: Float32Array): Float64Array {
  const n = wave.length < MFCC_FRAME ? 0 : 1 + Math.floor((wave.length - MFCC_FRAME) / MFCC_HOP);
  const out = new Float64Array(n);
  for (let f = 0; f < n; f++) out[f] = energyDb(wave, f * MFCC_HOP, f * MFCC_HOP + MFCC_FRAME);
  return out;
}

function percentile(a: ArrayLike<number>, p: number): number {
  const s = Array.from(a).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : -80;
}

/** Offline pass over a whole recording: the same decisions as the live one, floor seeded at the 10th percentile. */
export function speechFlags(wave: Float32Array): { flags: boolean[]; energies: Float64Array } {
  const energies = frameEnergies(wave);
  const vad = new OnlineVad(Math.max(percentile(energies, 0.1), -80));
  const flags: boolean[] = [];
  for (let f = 0; f < energies.length; f++) flags.push(vad.update(energies[f]));
  return { flags, energies };
}

/**
 * First and last frame that are really loud (no hangover), for trimming a short
 * sample such as one "HEC". Returns null when nothing is above the floor.
 */
export function speechBounds(wave: Float32Array): { first: number; last: number; frames: number } | null {
  const energies = frameEnergies(wave);
  if (!energies.length) return null;
  const floor = percentile(energies, 0.1);
  const hot = (f: number) => energies[f] > floor + 12 && energies[f] > VAD_ABS_DB;
  let first = -1, last = -1;
  for (let f = 0; f + 2 < energies.length; f++) if (hot(f) && hot(f + 1) && hot(f + 2)) { first = f; break; }
  if (first < 0) return null;
  for (let f = energies.length - 1; f >= first; f--) if (hot(f)) { last = f; break; }
  return { first, last, frames: energies.length };
}

/** Speech seconds in a recording (flagged frames x 10 ms). */
export function speechSeconds(wave: Float32Array): number {
  const { flags } = speechFlags(wave);
  let n = 0;
  for (const f of flags) if (f) n++;
  return n * 0.01;
}
