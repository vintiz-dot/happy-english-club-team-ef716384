/**
 * Sets up the teacher's voiceprint for the voice points assistant (owner, 27 Nov 2026).
 *
 *   Step 1: read a short passage aloud (about 30 seconds): the voiceprint.
 *   Step 2: say "HEC" five times, one recording each: the wake word.
 *   Then the engine builds the profile on this computer and says how good it is.
 *
 * The voiceprint stays on this computer (IndexedDB, keyed by the teacher); it
 * is never uploaded. The WeSpeaker credit (CC BY 4.0) must stay visible here.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceAward } from "@/contexts/VoiceAwardContext";
import {
  VOICEPRINT_MODEL_CREDIT,
  type EnrolmentQuality,
  type ListenerModule,
} from "@/lib/voiceAward/listenerApi";

/** An original classroom passage, about 120 words: roughly 30 seconds read aloud at a calm pace. */
export const ENROL_PASSAGE =
  "Good morning, everyone. Please find your seat and take out your books. Today we are going to learn about animals and the places where they live. " +
  "Some animals live in the forest, some live in the ocean, and some live on a farm. First, we will listen to a short story. Then you will talk to your partner and tell them about your favourite animal. " +
  "Remember to speak clearly and use full sentences. If you do not know a word, ask me, and I will help you. After that, we will play a game, and the team with the most points will win a small prize. " +
  "Well done, everyone. Let us begin.";

const READ_MIN_S = 20;
const READ_MAX_S = 40;
const WAKE_COUNT = 5;
const WAKE_MS = 1500;

type Rec = { stop(): Promise<Float32Array>; level(): number };
type Step = "intro" | "reading" | "wake" | "building" | "done";

const importListener = async () => (await import("@/lib/voiceAward/listener")) as unknown as ListenerModule;

export function VoiceEnrolDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { profileState, refreshProfile, setEnrolling, setEnabled } = useVoiceAward();
  const [mod, setMod] = useState<ListenerModule | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [reading, setReading] = useState<Float32Array | null>(null);
  const [wake, setWake] = useState<Float32Array[]>([]);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<EnrolmentQuality | null>(null);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<Rec | null>(null);
  const meterRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  const stopTimers = useCallback(() => {
    if (meterRef.current !== null) window.clearInterval(meterRef.current);
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    meterRef.current = null;
    tickRef.current = null;
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      // Labels are only listed once the page has been allowed to use the microphone.
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {
      setError("The microphone is blocked. Allow it for this site in the browser, then try again.");
      return;
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = all.filter((d) => d.kind === "audioinput");
    setDevices(inputs);
    setDeviceId((cur) => cur || inputs[0]?.deviceId || "");
  }, []);

  // Open: stand the listener aside, load the engine and the microphones. Close: let go of everything.
  useEffect(() => {
    if (!open) return;
    setEnrolling(true);
    setStep("intro");
    setError(null);
    setReading(null);
    setWake([]);
    setQuality(null);
    setElapsed(0);
    void (async () => {
      try {
        setMod(await importListener());
      } catch {
        setError("The voice engine could not be loaded. Check the connection and try again.");
      }
      await loadDevices();
    })();
    return () => {
      stopTimers();
      const r = recRef.current;
      recRef.current = null;
      void r?.stop().catch(() => {});
      setRecording(false);
      setEnrolling(false);
    };
  }, [open, loadDevices, setEnrolling, stopTimers]);

  const begin = useCallback(
    async (onTick?: (seconds: number) => void) => {
      if (!mod) throw new Error("The voice engine is not ready yet.");
      const rec = await mod.startRecording(deviceId ? { deviceId } : undefined);
      recRef.current = rec;
      setRecording(true);
      setLevel(0);
      const t0 = Date.now();
      meterRef.current = window.setInterval(() => setLevel(Math.min(1, rec.level())), 70);
      tickRef.current = window.setInterval(() => {
        const s = (Date.now() - t0) / 1000;
        setElapsed(s);
        onTick?.(s);
      }, 200);
      return rec;
    },
    [mod, deviceId],
  );

  const end = useCallback(async (): Promise<Float32Array | null> => {
    stopTimers();
    const rec = recRef.current;
    recRef.current = null;
    setRecording(false);
    setLevel(0);
    if (!rec) return null;
    try {
      return await rec.stop();
    } catch {
      setError("The recording could not be finished. Please try again.");
      return null;
    }
  }, [stopTimers]);

  /* ------------------------------------------------------------ step 1 */
  const finishReading = useCallback(async () => {
    const data = await end();
    if (!data) {
      setStep("intro");
      return;
    }
    setReading(data);
    setStep("wake");
  }, [end]);

  const startReading = async () => {
    setError(null);
    setElapsed(0);
    try {
      setStep("reading");
      let finished = false;
      await begin((s) => {
        if (s >= READ_MAX_S && !finished) {
          finished = true;
          void finishReading();
        }
      });
    } catch (e) {
      setStep("intro");
      setError(e instanceof Error ? e.message : "The microphone could not be started.");
    }
  };

  /* ------------------------------------------------------------ step 2 */
  const recordWake = async () => {
    setError(null);
    try {
      let stopped = false;
      await begin((s) => {
        if (s * 1000 >= WAKE_MS && !stopped) {
          stopped = true;
          void (async () => {
            const data = await end();
            if (data) setWake((w) => [...w, data].slice(0, WAKE_COUNT));
          })();
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The microphone could not be started.");
    }
  };

  /* ------------------------------------------------------------ build */
  const build = async () => {
    if (!mod || !user || !reading) return;
    setStep("building");
    setProgress(0);
    setError(null);
    setBusy(true);
    try {
      const label = devices.find((d) => d.deviceId === deviceId)?.label || null;
      const { profile, quality: q } = await mod.buildProfile(user.id, reading, wake, label, setProgress);
      setQuality(q);
      if (profile) {
        await mod.saveProfile(profile);
        await refreshProfile();
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The voice could not be set up.");
      setStep("wake");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!mod || !user) return;
    setBusy(true);
    try {
      await setEnabled(false);
      await mod.deleteProfile(user.id);
      await refreshProfile();
      setQuality({ ok: true, message: "Your voiceprint was deleted from this computer." });
      setStep("done");
    } catch {
      setError("The voiceprint could not be deleted. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStep("intro");
    setReading(null);
    setWake([]);
    setQuality(null);
    setError(null);
  };

  const meter = (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && !recording && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Set up your voice</DialogTitle>
          <DialogDescription>
            Your voiceprint stays on this computer and is never uploaded; it only lets the assistant ignore other voices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <label className="block">
            <span className="mb-1 block font-medium">Microphone</span>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={recording || step === "building"}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              {devices.length === 0 && <option value="">Default microphone</option>}
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">Use the microphone you will use in class.</span>
          </label>

          {(step === "intro" || step === "reading" || step === "wake") && meter}

          {step === "intro" && (
            <div className="space-y-3">
              {profileState === "ready" && (
                <p className="rounded-md bg-muted px-3 py-2">A voiceprint is already saved on this computer. Recording again replaces it.</p>
              )}
              <p>Step 1 of 2: read this aloud in your normal teacher voice, for about 30 seconds.</p>
              <p className="rounded-md border bg-muted/40 p-3 text-base leading-relaxed">{ENROL_PASSAGE}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={startReading} disabled={!mod || busy}>
                  <Mic className="mr-2 h-4 w-4" aria-hidden /> Start reading
                </Button>
                {profileState === "ready" && (
                  <Button variant="outline" onClick={remove} disabled={busy}>
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Delete my voiceprint
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === "reading" && (
            <div className="space-y-3">
              <p className="rounded-md border bg-muted/40 p-3 text-base leading-relaxed">{ENROL_PASSAGE}</p>
              <p className="tabular-nums">
                Recording {Math.floor(elapsed)} s{elapsed < READ_MIN_S ? ` (keep going to ${READ_MIN_S} s)` : ""}
              </p>
              <Button onClick={() => void finishReading()} disabled={elapsed < READ_MIN_S}>
                Done reading
              </Button>
            </div>
          )}

          {step === "wake" && (
            <div className="space-y-3">
              <p>
                Step 2 of 2: press the button, then say <strong>&ldquo;HEC&rdquo;</strong> once, clearly. It stops by itself. Do it {WAKE_COUNT} times
                ({wake.length} of {WAKE_COUNT} done).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={recordWake} disabled={recording || wake.length >= WAKE_COUNT || busy}>
                  <Mic className="mr-2 h-4 w-4" aria-hidden /> {recording ? "Say HEC now…" : `Record HEC ${Math.min(wake.length + 1, WAKE_COUNT)}`}
                </Button>
                <Button variant="outline" onClick={() => setWake((w) => w.slice(0, -1))} disabled={recording || wake.length === 0}>
                  Redo the last one
                </Button>
                <Button variant="outline" onClick={restart} disabled={recording}>
                  Start again
                </Button>
              </div>
              {wake.length >= WAKE_COUNT && (
                <Button onClick={build} disabled={busy}>
                  Build my voiceprint
                </Button>
              )}
            </div>
          )}

          {step === "building" && (
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Building your voiceprint on this computer…
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">The first time, a voice model is downloaded once and kept on this computer.</p>
            </div>
          )}

          {step === "done" && quality && (
            <div className="space-y-3">
              <p className={quality.ok ? "rounded-md bg-emerald-50 px-3 py-2 text-emerald-900" : "rounded-md bg-amber-50 px-3 py-2 text-amber-900"}>
                {quality.message}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={restart}>
                  Do it again
                </Button>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </div>
          )}

          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">{error}</p>}

          <p className="border-t pt-3 text-xs text-muted-foreground">{VOICEPRINT_MODEL_CREDIT}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
