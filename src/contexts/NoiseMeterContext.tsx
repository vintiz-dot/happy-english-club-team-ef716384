import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from "react";

interface NoiseMeterState {
  status: "idle" | "requesting" | "running" | "denied" | "error";
  level: number;
  error: string | null;
  start: () => void;
  stop: () => void;
}

const NoiseMeterContext = createContext<NoiseMeterState>({
  status: "idle",
  level: 0,
  error: null,
  start: () => {},
  stop: () => {},
});

export function useNoiseMeter() {
  return useContext(NoiseMeterContext);
}

export function NoiseMeterProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NoiseMeterState["status"]>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    analyserRef.current = null;
    setStatus("idle");
    setLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone API not available in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("AudioContext unavailable.");
      const ctx = new Ctor();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.fftSize);
      let smoothed = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buffer.length);
        const raw = Math.min(100, rms * 220);
        smoothed = smoothed * 0.7 + raw * 0.3;
        setLevel(Math.round(smoothed));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setStatus("running");
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (e?.name === "NotAllowedError" || msg.includes("Permission")) {
        setStatus("denied");
        setError("Microphone permission was denied. Allow it in your browser settings to use the meter.");
      } else if (e?.name === "NotFoundError") {
        setStatus("error");
        setError("No microphone detected.");
      } else {
        setStatus("error");
        setError(msg);
      }
    }
  }, []);

  return (
    <NoiseMeterContext.Provider value={{ status, level, error, start, stop }}>
      {children}
    </NoiseMeterContext.Provider>
  );
}
