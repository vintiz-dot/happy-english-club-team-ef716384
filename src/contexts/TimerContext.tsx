import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { startAlarm, stopAlarm } from "@/components/classroom-tools/audio";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TimerState {
  totalSeconds: number;
  remaining: number;
  running: boolean;
  alarming: boolean;
  draftMin: string;
  draftSec: string;
  /** Derived */
  progress: number;
  isFinished: boolean;
  ringColor: string;
}

interface TimerActions {
  start: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  dismiss: () => void;
  applyDraft: () => void;
  setDraftMin: (v: string) => void;
  setDraftSec: (v: string) => void;
}

type TimerContextValue = TimerState & TimerActions;

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function TimerProvider({ children }: { children: ReactNode }) {
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);
  const [alarming, setAlarming] = useState(false);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [draftMin, setDraftMin] = useState("5");
  const [draftSec, setDraftSec] = useState("0");

  // ---- Tick ----------------------------------------------------------
  // Compute remaining off a wall-clock target so it stays accurate even
  // if the browser tab throttles the interval.
  useEffect(() => {
    if (!running || endedAt === null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = performance.now();
      const r = Math.max(0, Math.round((endedAt - now) / 1000));
      setRemaining(r);
      if (r <= 0) {
        setRunning(false);
        // Start the continuous alarm — it will loop until dismiss()
        setAlarming(true);
        startAlarm();
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, 200) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, endedAt]);

  // Clean up alarm on unmount (safety net)
  useEffect(() => {
    return () => {
      stopAlarm();
    };
  }, []);

  // ---- Actions -------------------------------------------------------
  const start = useCallback(
    (seconds?: number) => {
      const target = seconds ?? totalSeconds;
      if (target <= 0) return;
      // Stop any ongoing alarm when starting a new timer
      if (alarming) {
        stopAlarm();
        setAlarming(false);
      }
      setTotalSeconds(target);
      setRemaining(target);
      setEndedAt(performance.now() + target * 1000);
      setRunning(true);
    },
    [totalSeconds, alarming],
  );

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    setEndedAt(performance.now() + remaining * 1000);
    setRunning(true);
  }, [remaining]);

  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(totalSeconds);
    setEndedAt(null);
    // Stop alarm if it's ringing
    if (alarming) {
      stopAlarm();
      setAlarming(false);
    }
  }, [totalSeconds, alarming]);

  /** Dismiss the alarm — stops the sound and resets the timer. */
  const dismiss = useCallback(() => {
    stopAlarm();
    setAlarming(false);
    setRunning(false);
    setRemaining(totalSeconds);
    setEndedAt(null);
  }, [totalSeconds]);

  const applyDraft = useCallback(() => {
    const m = Math.max(0, Math.min(99, Number(draftMin) || 0));
    const s = Math.max(0, Math.min(59, Number(draftSec) || 0));
    const total = m * 60 + s;
    if (total === 0) return;
    // Stop alarm if it's ringing
    if (alarming) {
      stopAlarm();
      setAlarming(false);
    }
    setTotalSeconds(total);
    setRemaining(total);
    setRunning(false);
    setEndedAt(null);
  }, [draftMin, draftSec, alarming]);

  // ---- Derived -------------------------------------------------------
  const progress = totalSeconds === 0 ? 0 : remaining / totalSeconds;

  const ringColor = alarming
    ? "stroke-rose-500"
    : progress > 0.5
      ? "stroke-emerald-500"
      : progress > 0.2
        ? "stroke-amber-500"
        : "stroke-rose-500";

  const isFinished = !running && remaining === 0;

  // ---- Memoised value ------------------------------------------------
  const value = useMemo<TimerContextValue>(
    () => ({
      totalSeconds,
      remaining,
      running,
      alarming,
      draftMin,
      draftSec,
      progress,
      isFinished,
      ringColor,
      start,
      pause,
      resume,
      reset,
      dismiss,
      applyDraft,
      setDraftMin,
      setDraftSec,
    }),
    [
      totalSeconds,
      remaining,
      running,
      alarming,
      draftMin,
      draftSec,
      progress,
      isFinished,
      ringColor,
      start,
      pause,
      resume,
      reset,
      dismiss,
      applyDraft,
    ],
  );

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimer must be used within a <TimerProvider>");
  }
  return ctx;
}
