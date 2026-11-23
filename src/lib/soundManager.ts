/**
 * Premium Sound Manager
 * Provides subtle audio feedback for user interactions
 * Respects user preferences and accessibility settings
 *
 * Rules (docs/EXPERIENCE_DESIGN_BRIEF.md J3):
 *  - Students keep sound on by default (unless the device asks for reduced motion); staff and parents are silent
 *    by default. The person's own choice (the `sound-enabled` setting) always wins over the default.
 *  - Nothing plays before a tap or a key press on this visit (a page load can never make a noise).
 *  - Nothing loops, and no tone is louder than the stored volume.
 */

type SoundType = 'click' | 'success' | 'error' | 'notification' | 'hover' | 'navigation' | 'checkin' | 'levelUp' | 'questComplete';

class SoundManager {
  private context: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;
  private sounds: Map<SoundType, () => void> = new Map();
  /** a tap or a key press has happened on this visit: only then may anything play (brief J3) */
  private tapped = false;
  /** the person has chosen on or off themselves; the role default no longer applies */
  private hasStoredChoice = false;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") {
      // Until the role is known (setRole) nothing is on; the person own stored choice, if any, wins.
      this.enabled = false;

      // Load preference from localStorage
      const storedEnabled = localStorage.getItem("sound-enabled");
      if (storedEnabled !== null) {
        this.enabled = storedEnabled === "true";
        this.hasStoredChoice = true;
      }

      // Nothing plays before a tap on this visit. The module may be loaded lazily, after the tap that caused the
      // sound, so the browser own record of a past tap counts too.
      const activation = (navigator as any).userActivation;
      if (activation && activation.hasBeenActive) this.tapped = true;
      const markTapped = () => {
        this.tapped = true;
      };
      window.addEventListener("pointerdown", markTapped, { capture: true, once: true });
      window.addEventListener("keydown", markTapped, { capture: true, once: true });

      const storedVolume = localStorage.getItem('sound-volume');
      if (storedVolume !== null) {
        this.volume = parseFloat(storedVolume);
      }
    }

    this.initContext();
    this.setupSounds();
  }

  private initContext() {
    if (typeof window !== 'undefined' && !this.context) {
      try {
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  private setupSounds() {
    this.sounds.set('click', () => this.playTone(800, 0.03, 'sine'));
    this.sounds.set('success', () => this.playChord([523.25, 659.25, 783.99], 0.15));
    this.sounds.set('error', () => this.playTone(200, 0.1, 'square'));
    this.sounds.set('notification', () => this.playChord([659.25, 783.99], 0.2));
    this.sounds.set('hover', () => this.playTone(1200, 0.02, 'sine'));
    this.sounds.set('navigation', () => this.playTone(600, 0.05, 'sine'));
    // New gamification sounds
    this.sounds.set('checkin', () => this.playChord([523.25, 659.25], 0.12));
    this.sounds.set('levelUp', () => this.playArpeggio([523.25, 659.25, 783.99, 1046.5], 0.18));
    this.sounds.set('questComplete', () => this.playChord([783.99, 987.77, 1174.66], 0.2));
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.enabled || !this.context) return;

    try {
      if (this.context.state === 'suspended') {
        this.context.resume();
      }

      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const now = this.context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      console.warn('Error playing sound:', e);
    }
  }

  private playChord(frequencies: number[], duration: number) {
    if (!this.enabled || !this.context) return;

    frequencies.forEach((freq, index) => {
      setTimeout(() => this.playTone(freq, duration * 0.8, 'sine'), index * 50);
    });
  }

  private playArpeggio(frequencies: number[], duration: number) {
    if (!this.enabled || !this.context) return;

    frequencies.forEach((freq, index) => {
      setTimeout(() => this.playTone(freq, duration, 'sine'), index * 100);
    });
  }

  play(soundType: SoundType) {
    if (!this.tapped) return; // never before a tap on this visit
    const soundFn = this.sounds.get(soundType);
    if (soundFn) {
      soundFn();
    }
  }

  /**
   * Who is signed in decides the DEFAULT: students hear sounds, staff and parents do not. A stored choice (the
   * speaker button, or the `sound-enabled` setting) always wins. Called once the role is known.
   */
  setRole(role: string | null | undefined) {
    if (this.hasStoredChoice || typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = role === 'student' && !reduced;
    if (next !== this.enabled) {
      this.enabled = next;
      this.notify();
    }
  }

  /** For a speaker button that must follow the setting (useSyncExternalStore). */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((l) => l());
  }

  enable() {
    this.enabled = true;
    this.hasStoredChoice = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound-enabled', 'true');
    }
    this.notify();
  }

  disable() {
    this.enabled = false;
    this.hasStoredChoice = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound-enabled', 'false');
    }
    this.notify();
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  setVolume(level: number) {
    this.volume = Math.max(0, Math.min(1, level));
    if (typeof window !== 'undefined') {
      localStorage.setItem('sound-volume', this.volume.toString());
    }
  }

  getVolume(): number {
    return this.volume;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
