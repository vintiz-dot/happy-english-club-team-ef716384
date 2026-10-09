/**
 * Generative background music.
 *
 * Nothing here is a recording. Every note is synthesised on the spot from
 * a random walk over a scale, so the music genuinely never repeats and the
 * app ships no audio assets. That matters for a classroom: a looping track
 * becomes maddening by the third lesson, and a 4 MB mp3 is a 4 MB mp3 on
 * every page load.
 *
 * The graph, once:
 *
 *   voices ─┬─► dry ──────────────┐
 *           └─► reverb ─► wet ────┤
 *                                 ├─► bass ─► treble ─► width ─► master ─► out
 *                                 │                                  └─► analyser
 *
 * Bass and treble are shelving filters rather than a graphic EQ: one knob
 * each, and neither can produce a sound a cheap laptop speaker will rattle
 * on. `width` collapses to mono by summing the channels, which is what a
 * teacher wants when the room has one working speaker on the left wall.
 *
 * The engine is a module singleton deliberately. Closing the tools panel
 * should not stop the music — the teacher has moved on to the lesson.
 */
import { getAudioContext } from "./audio";

export type Mood = "calm" | "energetic" | "space";
export type Width = "stereo" | "mono";

export interface MusicSettings {
  /** 0–100. */
  volume: number;
  /** dB, −12…+12. */
  bass: number;
  /** dB, −12…+12. */
  treble: number;
  width: Width;
}

export interface MusicState extends MusicSettings {
  playing: boolean;
  mood: Mood;
  /** False when the browser gives us no Web Audio at all. */
  supported: boolean;
}

interface MoodSpec {
  /** Semitone offsets from the root, one octave. */
  scale: number[];
  /** Root note, Hz. */
  root: number;
  /** Seconds between notes, picked uniformly in this range. */
  gap: [number, number];
  /** Note attack / release, seconds. */
  env: [number, number];
  /** How far the walk may jump, in scale degrees. */
  stride: number;
  /** Octaves the walk may roam over. */
  octaves: number;
  wave: OscillatorType;
  /** Low-pass cutoff on the voice bus, Hz. */
  cutoff: number;
  /** Reverb send, 0–1. */
  wet: number;
  /** Sustained drone under the melody, or none. */
  drone: { interval: number[]; gain: number } | null;
  peak: number;
}

const MOODS: Record<Mood, MoodSpec> = {
  // Major pentatonic — no semitone clashes, so a random walk cannot
  // produce a sour interval no matter where it lands.
  calm: {
    scale: [0, 2, 4, 7, 9],
    root: 261.63, // C4
    gap: [1.9, 3.6],
    env: [0.9, 3.4],
    stride: 2,
    octaves: 2,
    wave: "sine",
    cutoff: 1500,
    wet: 0.42,
    drone: { interval: [-12, -5], gain: 0.055 },
    peak: 0.13,
  },
  // Mixolydian, quicker, plucked. Still no drums — a beat in a classroom
  // competes with the teacher's voice.
  energetic: {
    scale: [0, 2, 4, 5, 7, 9, 10],
    root: 293.66, // D4
    gap: [0.26, 0.5],
    env: [0.012, 0.52],
    stride: 3,
    octaves: 2,
    wave: "triangle",
    cutoff: 3200,
    wet: 0.22,
    drone: null,
    peak: 0.1,
  },
  // Lydian with a wide, slow walk and a long tail.
  space: {
    scale: [0, 2, 4, 6, 7, 9, 11],
    root: 174.61, // F3
    gap: [2.6, 5.4],
    env: [1.6, 5.5],
    stride: 4,
    octaves: 3,
    wave: "sine",
    cutoff: 1100,
    wet: 0.72,
    drone: { interval: [0, 7, 14], gain: 0.04 },
    peak: 0.11,
  },
};

const DEFAULTS: MusicSettings = { volume: 50, bass: -12, treble: -5, width: "stereo" };

/** A short, decaying noise burst used as a reverb impulse response. */
function buildImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private trebleNode: BiquadFilterNode | null = null;
  private voiceBus: BiquadFilterNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private widthSplit: ChannelSplitterNode | null = null;
  private widthSum: GainNode | null = null;
  private widthOut: GainNode | null = null;
  private drones: { osc: OscillatorNode; gain: GainNode }[] = [];

  analyser: AnalyserNode | null = null;

  private timer: number | null = null;
  private degree = 0;
  private octave = 0;

  private state: MusicState = {
    ...DEFAULTS,
    playing: false,
    mood: "calm",
    supported: true,
  };

  private listeners = new Set<(s: MusicState) => void>();

  /* ----------------------------------------------------------- plumbing */

  subscribe(fn: (s: MusicState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  getState(): MusicState {
    return this.state;
  }

  private build(): boolean {
    if (this.ctx) return true;
    const ctx = getAudioContext();
    if (!ctx) {
      this.emit({ supported: false });
      return false;
    }
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;

    // 512 gives ~94 Hz bins, which this material (130-700 Hz) needs: at
    // 128 the whole piece landed in the first three bins and the ribbon
    // was a spike at the left edge and flat everywhere else.
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;

    this.bassNode = ctx.createBiquadFilter();
    this.bassNode.type = "lowshelf";
    this.bassNode.frequency.value = 220;

    this.trebleNode = ctx.createBiquadFilter();
    this.trebleNode.type = "highshelf";
    this.trebleNode.frequency.value = 3200;

    // Mono fold-down: split, sum both channels at equal gain, feed the
    // result to both outputs. Bypassed in stereo.
    this.widthSplit = ctx.createChannelSplitter(2);
    this.widthSum = ctx.createGain();
    this.widthSum.gain.value = 0.5;
    this.widthOut = ctx.createGain();
    this.merger = ctx.createChannelMerger(2);

    this.voiceBus = ctx.createBiquadFilter();
    this.voiceBus.type = "lowpass";
    this.voiceBus.Q.value = 0.6;

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = buildImpulse(ctx, 3.4, 2.6);

    this.dry = ctx.createGain();
    this.wet = ctx.createGain();

    this.voiceBus.connect(this.dry);
    this.voiceBus.connect(this.reverb);
    this.reverb.connect(this.wet);

    this.dry.connect(this.bassNode);
    this.wet.connect(this.bassNode);
    this.bassNode.connect(this.trebleNode);
    this.trebleNode.connect(this.widthOut);

    this.widthOut.connect(this.master);
    this.master.connect(ctx.destination);
    this.master.connect(this.analyser);

    this.applySettings();
    return true;
  }

  private applySettings() {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.bassNode || !this.trebleNode) return;
    const now = ctx.currentTime;
    // Perceptual rather than linear: halfway up the slider should sound
    // like half as loud, which a linear gain does not.
    const target = this.state.playing
      ? Math.pow(this.state.volume / 100, 1.8) * 0.9
      : 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, 0.12);
    this.bassNode.gain.setTargetAtTime(this.state.bass, now, 0.08);
    this.trebleNode.gain.setTargetAtTime(this.state.treble, now, 0.08);
  }

  private applyWidth() {
    const { widthOut, widthSplit, widthSum, merger, master } = this;
    if (!widthOut || !widthSplit || !widthSum || !merger || !master) return;
    try {
      widthOut.disconnect();
      widthSplit.disconnect();
      widthSum.disconnect();
      merger.disconnect();
    } catch {
      /* a node that was never connected throws; nothing to undo */
    }
    if (this.state.width === "mono") {
      widthOut.connect(widthSplit);
      widthSplit.connect(widthSum, 0);
      widthSplit.connect(widthSum, 1);
      widthSum.connect(merger, 0, 0);
      widthSum.connect(merger, 0, 1);
      merger.connect(master);
    } else {
      widthOut.connect(master);
    }
  }

  /* -------------------------------------------------------------- notes */

  private freqFor(degree: number, octave: number): number {
    const spec = MOODS[this.state.mood];
    const semis = spec.scale[((degree % spec.scale.length) + spec.scale.length) % spec.scale.length];
    return spec.root * Math.pow(2, (semis + octave * 12) / 12);
  }

  private voice(freq: number, when: number, spec: MoodSpec, gain: number) {
    const ctx = this.ctx;
    if (!ctx || !this.voiceBus) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const pan = ctx.createStereoPanner?.();

    osc.type = spec.wave;
    osc.frequency.value = freq;
    // A few cents off true pitch per note stops the timbre sounding like a
    // test tone; it is the difference between "synth" and "instrument".
    osc.detune.value = (Math.random() - 0.5) * 9;

    const [attack, release] = spec.env;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);

    osc.connect(amp);
    if (pan) {
      // Spread notes across the field by pitch — high notes drift right.
      pan.pan.value = Math.max(-0.7, Math.min(0.7, (Math.random() - 0.5) * 1.1));
      amp.connect(pan);
      pan.connect(this.voiceBus);
    } else {
      amp.connect(this.voiceBus);
    }

    osc.start(when);
    osc.stop(when + attack + release + 0.1);
    osc.onended = () => {
      try {
        osc.disconnect();
        amp.disconnect();
        pan?.disconnect();
      } catch {
        /* already torn down */
      }
    };
  }

  /** One step of the random walk, then schedule the next. */
  private step = () => {
    const ctx = this.ctx;
    if (!ctx || !this.state.playing) return;
    const spec = MOODS[this.state.mood];

    const jump = Math.round((Math.random() * 2 - 1) * spec.stride);
    this.degree += jump || 1;
    // Let the walk change octave when it runs off the end of the scale,
    // instead of reflecting off a wall and sounding penned in.
    while (this.degree >= spec.scale.length) {
      this.degree -= spec.scale.length;
      this.octave += 1;
    }
    while (this.degree < 0) {
      this.degree += spec.scale.length;
      this.octave -= 1;
    }
    const half = Math.floor(spec.octaves / 2);
    if (this.octave > half) this.octave = half - 1;
    if (this.octave < -half) this.octave = -half + 1;

    const when = ctx.currentTime + 0.04;
    this.voice(this.freqFor(this.degree, this.octave), when, spec, spec.peak);

    // Occasional harmony a fifth up — rare enough to feel like a decision.
    if (Math.random() < 0.22) {
      this.voice(
        this.freqFor(this.degree + 2, this.octave),
        when + 0.06,
        spec,
        spec.peak * 0.55,
      );
    }

    const [lo, hi] = spec.gap;
    this.timer = window.setTimeout(this.step, (lo + Math.random() * (hi - lo)) * 1000);
  };

  private startDrone() {
    const ctx = this.ctx;
    const spec = MOODS[this.state.mood];
    if (!ctx || !this.voiceBus || !spec.drone) return;
    spec.drone.interval.forEach((semis) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = spec.root * Math.pow(2, semis / 12);
      osc.detune.value = (Math.random() - 0.5) * 6;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(spec.drone!.gain, ctx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(this.voiceBus!);
      osc.start();
      this.drones.push({ osc, gain });
    });
  }

  private stopDrone() {
    const ctx = this.ctx;
    this.drones.forEach(({ osc, gain }) => {
      if (ctx) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
        osc.stop(ctx.currentTime + 2);
      } else {
        try {
          osc.stop();
        } catch {
          /* never started */
        }
      }
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          /* already torn down */
        }
      };
    });
    this.drones = [];
  }

  /* ------------------------------------------------------------ control */

  play(mood?: Mood) {
    if (!this.build()) return;
    const nextMood = mood ?? this.state.mood;
    const moodChanged = nextMood !== this.state.mood;

    if (this.state.playing && !moodChanged) return;

    if (this.timer) window.clearTimeout(this.timer);
    this.timer = null;
    if (moodChanged) this.stopDrone();

    this.emit({ playing: true, mood: nextMood });

    const spec = MOODS[nextMood];
    if (this.voiceBus && this.ctx) {
      this.voiceBus.frequency.setTargetAtTime(spec.cutoff, this.ctx.currentTime, 0.3);
    }
    if (this.dry && this.wet && this.ctx) {
      this.dry.gain.setTargetAtTime(1 - spec.wet * 0.5, this.ctx.currentTime, 0.3);
      this.wet.gain.setTargetAtTime(spec.wet, this.ctx.currentTime, 0.3);
    }

    this.applySettings();
    this.applyWidth();
    if (this.drones.length === 0) this.startDrone();
    this.step();
  }

  stop() {
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = null;
    this.stopDrone();
    this.emit({ playing: false });
    this.applySettings();
  }

  toggle(mood?: Mood) {
    if (this.state.playing && (!mood || mood === this.state.mood)) this.stop();
    else this.play(mood);
  }

  set(patch: Partial<MusicSettings>) {
    this.emit(patch);
    if (!this.ctx) return;
    this.applySettings();
    if (patch.width) this.applyWidth();
  }
}

export const music = new MusicEngine();
export const MOOD_LABELS: Record<Mood, { name: string; blurb: string }> = {
  calm: { name: "Calm", blurb: "Tests and quiet work" },
  energetic: { name: "Energetic", blurb: "Games and tidy-up" },
  space: { name: "Space", blurb: "Focus and creativity" },
};
