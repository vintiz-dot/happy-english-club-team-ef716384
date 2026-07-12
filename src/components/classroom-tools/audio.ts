// Web Audio synthesised sounds. No bundled asset, no network call.
// One context is reused across the app to avoid the per-tab limit.

type Ctx = AudioContext | null;
let ctx: Ctx = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  // Mobile browsers suspend the context until a user gesture.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/**
 * Soft two-tone bell — "C5" then "G4" with exponential decay. Resonant
 * but not jarring; tested to be audible in a classroom without being
 * unpleasant when triggered repeatedly.
 */
export function playChime(): void {
  const c = getCtx();
  if (!c) return;

  const now = c.currentTime;
  const tones = [
    { freq: 523.25, start: 0, duration: 2.0 },    // C5
    { freq: 783.99, start: 0.10, duration: 2.2 },  // G5
    { freq: 659.25, start: 0.20, duration: 1.8 },  // E5 — adds richness
  ];

  const master = c.createGain();
  master.gain.value = 0.0001;
  master.connect(c.destination);

  for (const t of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = t.freq;

    // Quick attack, slow exponential release for a bell tone.
    const startTime = now + t.start;
    const endTime = startTime + t.duration;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.85, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    osc.connect(gain);
    gain.connect(master);
    osc.start(startTime);
    osc.stop(endTime + 0.05);
  }

  // Master envelope — louder and sustains longer.
  master.gain.exponentialRampToValueAtTime(1.0, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
}

/**
 * Lightweight click for spinner stops. Intentionally distinct from the
 * chime so it's never confused with the focus signal.
 */
export function playClick(): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = 1200;
  const now = c.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

/* ------------------------------------------------------------------ */
/*  iPhone-style repeating alarm                                       */
/* ------------------------------------------------------------------ */

// Plays a single alarm "burst" — a loud, attention-grabbing tri-tone
// pattern similar to iPhone timers: three ascending tones, brief pause,
// then two descending tones. Much louder than the chime.
function playAlarmBurst(): void {
  const c = getCtx();
  if (!c) return;

  const now = c.currentTime;

  // Tri-tone pattern: ascending then descending
  const pattern = [
    { freq: 880, start: 0, dur: 0.15 },       // A5
    { freq: 1108.73, start: 0.18, dur: 0.15 }, // C#6
    { freq: 1318.51, start: 0.36, dur: 0.20 }, // E6
    { freq: 1108.73, start: 0.70, dur: 0.15 }, // C#6
    { freq: 880, start: 0.88, dur: 0.15 },     // A5
    { freq: 1318.51, start: 1.10, dur: 0.20 }, // E6
  ];

  const master = c.createGain();
  master.gain.setValueAtTime(0.7, now); // Loud!
  master.connect(c.destination);

  for (const t of pattern) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "square"; // Harsh/buzzy — cuts through ambient noise
    osc.frequency.value = t.freq;

    const s = now + t.start;
    const e = s + t.dur;

    // Sharp attack and release for a punchy alert tone
    gain.gain.setValueAtTime(0.0001, s);
    gain.gain.linearRampToValueAtTime(0.6, s + 0.01);
    gain.gain.setValueAtTime(0.6, e - 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, e);

    osc.connect(gain);
    gain.connect(master);
    osc.start(s);
    osc.stop(e + 0.01);
  }
}

/** Handle for the currently running alarm loop, if any. */
let alarmIntervalId: number | null = null;

/**
 * Start a continuous, repeating alarm — plays an iPhone-style tri-tone
 * burst every ~1.8 seconds until `stopAlarm()` is called. Designed to
 * be impossible to ignore (loud, repeating, square-wave buzz).
 */
export function startAlarm(): void {
  // Prevent duplicate loops
  if (alarmIntervalId !== null) return;

  // Play immediately, then repeat
  playAlarmBurst();
  alarmIntervalId = window.setInterval(playAlarmBurst, 1800);
}

/**
 * Stop the repeating alarm.
 */
export function stopAlarm(): void {
  if (alarmIntervalId !== null) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}
