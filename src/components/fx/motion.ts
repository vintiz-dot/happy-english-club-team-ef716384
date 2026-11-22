/**
 * The Signature tier's one place for durations, springs, the staggers and the
 * motion level (docs/DESIGN_SYSTEM.md s.9b, docs/EXPERIENCE_DESIGN_BRIEF.md B2-B4).
 *
 * Nothing else in the app writes a spring or a duration for these effects:
 * import it from here. Presentation only; it reads no data and imports no
 * query, no auth and no router, so the kit stays cheap and easy to preview.
 *
 * Motion level - `data-hec-motion="full" | "calm" | "off"` on <html>:
 *   default  off when the device asks for reduced motion; calm on a weak device
 *            (<= 4 cores, <= 4 GB, or data saver); otherwise full.
 *   choice   the person's, kept per signed-in user like the theme (themeKey in
 *            src/lib/ivoryScope.ts). A device that asks for reduced motion
 *            cannot be talked up to calm or full.
 */
import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";

// ---------------------------------------------------------------- springs and timings

/** paper settling, layout moves */
export const soft = { type: "spring", stiffness: 170, damping: 26 } as const;
/** press, toggle, tab marker */
export const snappy = { type: "spring", stiffness: 420, damping: 34 } as const;
/** visible overshoot: reward moments, and the two youngest student bands only */
export const reward = { type: "spring", stiffness: 300, damping: 18 } as const;

/** Seconds, for framer-motion. They mirror --hec-dur-1..5 in src/index.css. */
export const dur = { press: 0.14, reveal: 0.24, page: 0.42, signature: 0.7, reward: 1.2 } as const;
/** --hec-ease and --hec-ease-draw as cubic-bezier arrays for framer-motion. */
export const ease = [0.22, 1, 0.36, 1] as const;
export const easeDraw = [0.65, 0, 0.35, 1] as const;

/** --hec-stagger: the gap between siblings entering, in seconds. */
export const STAGGER_GAP = 0.04;
/** A group never takes more than this in all (delay of the last item plus its own duration). */
export const GROUP_BUDGET = 0.32;

/**
 * Delay for sibling number `index`. The delay is capped so that the last
 * sibling, entering over `itemDuration`, still finishes within GROUP_BUDGET:
 * with the usual 240 ms entrance the last delay is 80 ms.
 */
export function stagger(index: number, itemDuration: number = dur.reveal): number {
  const room = Math.max(0, GROUP_BUDGET - itemDuration);
  return Math.min(Math.max(0, index) * STAGGER_GAP, room);
}

// ---------------------------------------------------------------- motion level

export type MotionLevel = "full" | "calm" | "off";
export const MOTION_LEVELS: readonly MotionLevel[] = ["full", "calm", "off"];

/** Remembered per device AND per signed-in user, as the theme is. */
export const motionKey = (userId: string | null | undefined) => `hec-motion:${userId || "signed-out"}`;

export interface MotionEnv {
  reducedMotion: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  saveData?: boolean;
}

export function readMotionChoice(value: string | null | undefined): MotionLevel | null {
  return value === "full" || value === "calm" || value === "off" ? value : null;
}

/** The level with no choice made. Pure: the environment is passed in. */
export function defaultMotionLevel(env: MotionEnv): MotionLevel {
  if (env.reducedMotion) return "off";
  const weak =
    (env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 4) ||
    (env.deviceMemory !== undefined && env.deviceMemory <= 4) ||
    env.saveData === true;
  return weak ? "calm" : "full";
}

/** The level in force. A device that asks for reduced motion is never moved upward. */
export function resolveMotionLevel(choice: MotionLevel | null, env: MotionEnv): MotionLevel {
  if (env.reducedMotion) return "off";
  return choice ?? defaultMotionLevel(env);
}

function readEnv(): MotionEnv {
  if (typeof window === "undefined") return { reducedMotion: false };
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let reducedMotion = false;
  try {
    reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    /* no matchMedia: treat as no request */
  }
  return {
    reducedMotion,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    saveData: nav.connection?.saveData,
  };
}

// A tiny store: components subscribe through useSyncExternalStore, so a change in the
// account menu reaches every effect at once and nothing else re-renders.
const listeners = new Set<() => void>();
let storedFor: string | null = null; // the signed-in user whose choice is loaded; null = signed out
let choice: MotionLevel | null = null;
let current: MotionLevel = "full";
let locked = false;

function loadChoice(userId: string | null): MotionLevel | null {
  try {
    return readMotionChoice(window.localStorage.getItem(motionKey(userId)));
  } catch {
    return null; // private mode or blocked storage: the default stands
  }
}

function commit() {
  const env = readEnv();
  const next = resolveMotionLevel(choice, env);
  const changed = next !== current || env.reducedMotion !== locked;
  current = next;
  locked = env.reducedMotion;
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-hec-motion", current);
  if (changed) listeners.forEach((l) => l());
}

/** Load a user's remembered choice. Called by the shell when the signed-in person is known. */
export function syncMotionUser(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  storedFor = userId || null;
  choice = loadChoice(storedFor);
  commit();
}

/** Change the level for the signed-in person (the account menu). Remembered per user on this device. */
export function setMotionLevel(next: MotionLevel) {
  choice = next;
  try {
    window.localStorage.setItem(motionKey(storedFor), next);
  } catch {
    /* storage can be blocked; the choice then lasts for this visit only */
  }
  commit();
}

if (typeof window !== "undefined") {
  // First paint of the app: the attribute exists from the moment the kit is imported.
  choice = loadChoice(null);
  commit();
  try {
    window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", commit);
  } catch {
    /* older browsers: the level is read again on the next change of choice */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** The level in force: "full", "calm" or "off". */
export function useMotionLevel(): MotionLevel {
  return useSyncExternalStore(subscribe, () => current, () => "full" as MotionLevel);
}

/** True when the device itself asks for reduced motion: the menu then offers only Off. */
export function useMotionLocked(): boolean {
  return useSyncExternalStore(subscribe, () => locked, () => false);
}

/** Shell hook: loads the signed-in person's own choice (a shared tablet gives each person theirs). */
export function useSyncMotionLevel(userId: string | null | undefined) {
  useEffect(() => {
    syncMotionUser(userId);
  }, [userId]);
}

// ---------------------------------------------------------------- loops

const MAX_LOOPS = 2;
let loopsRunning = 0;

/**
 * Permission for ONE looping animation: true only while the motion level is
 * "full", the element is on screen and the tab is visible, and fewer than two
 * loops are already running on the page (B4). Everything that loops uses it;
 * when it answers false the element is drawn still.
 */
export function useLoopSlot(ref: RefObject<Element | null>): boolean {
  const level = useMotionLevel();
  const allowed = level === "full";
  const store = useRef<{ value: boolean; subs: Set<() => void> }>({ value: false, subs: new Set() }).current;

  useEffect(() => {
    let granted = false;
    let visible = false;
    let tabShown = typeof document === "undefined" ? true : document.visibilityState !== "hidden";
    const recompute = () => {
      const want = allowed && visible && tabShown;
      if (want && !granted && loopsRunning < MAX_LOOPS) {
        granted = true;
        loopsRunning++;
      } else if (!want && granted) {
        granted = false;
        loopsRunning--;
      }
      if (store.value !== granted) {
        store.value = granted;
        store.subs.forEach((f) => f());
      }
    };
    const onVisibility = () => {
      tabShown = document.visibilityState !== "hidden";
      recompute();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const el = ref.current;
    let io: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        visible = entries.some((e) => e.isIntersecting);
        recompute();
      });
      io.observe(el);
    } else {
      visible = true; // no observer: the element counts as on screen
    }
    recompute();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io?.disconnect();
      visible = false;
      recompute();
    };
  }, [allowed, ref, store]);

  return useSyncExternalStore(
    (l) => {
      store.subs.add(l);
      return () => {
        store.subs.delete(l);
      };
    },
    () => store.value,
    () => false,
  );
}
