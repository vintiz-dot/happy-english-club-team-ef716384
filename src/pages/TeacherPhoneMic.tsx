import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mic, Moon, Square, Smartphone, Wifi, WifiOff } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AudioGraph } from "@/lib/recorder/audioGraph";
import { supabaseBackend, type SupabaseLike } from "@/lib/recorder/backend";
import { PhoneTeacherTrack, type PhoneStatus } from "@/lib/recorder/phoneTrack";
import { PhoneLink, supabaseLinkTransport, type LinkRow, type PhoneLinkView, type PhonePhase } from "@/lib/recorder/deviceLink";
import { ScreenKeeper, captureHealth, type CaptureVerdict, type KeeperState } from "@/lib/recorder/phoneWake";

/**
 * /teacher/recorder/phone - the teacher's phone as the teacher microphone.
 *
 * The laptop runs the class recorder in "My microphone is my phone" mode (it
 * records the Anker only). This page, signed in as the same teacher, sends
 * the teacher track into the laptop's recording (`phoneTrack.ts` holds every
 * timeline rule). 23 Nov 2026: the two are linked (`deviceLink.ts`): Record
 * here gets the laptop ready and this phone joins the moment the laptop
 * records; Stop on either stops both; each shows whether the other is
 * connected. The screen is kept on (wake lock, dimmed view), and when iPhone
 * stops the microphone anyway (screen locked, page hidden, a call) it is
 * said loudly, here and on the laptop, and restarted as soon as it can be.
 */

const db = supabase as any;
const backend = supabaseBackend(supabase as unknown as SupabaseLike);
const COLS = "id,class_id,session_id,armed_session_id,session_date,scheduled_start,scheduled_end,capture_opens_at,capture_closes_at,status,format,chunk_ms,max_duration_ms,min_bytes_per_sec,clock_tolerance_ms,purpose,started_at,ended_at,stop_reason,stop_requested_at,late_after_ms,manifest_path,manifest_sha256,pre_start_ms,started_by,client_info,classes(name)";
const TICK_MS = 3000;
const deviceId = (() => { try { const k = "hec-phone-link-device"; const v = localStorage.getItem(k) ?? `phone-${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem(k, v); return v; } catch { return `phone-${Math.random().toString(36).slice(2, 10)}`; } })();

const AUDIO: MediaStreamConstraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } };

async function readRow(q: PromiseLike<{ data: unknown; error: any }>): Promise<LinkRow | null> {
  const { data, error } = await q;
  if (error) throw error;
  return (data as LinkRow) ?? null;
}

export default function TeacherPhoneMic() {
  const { user } = useAuth();
  const [view, setView] = useState<PhoneLinkView | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [micErr, setMicErr] = useState<string | null>(null);
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [level, setLevel] = useState(0);
  const [keeper, setKeeper] = useState<KeeperState | null>(null);
  const [health, setHealth] = useState<CaptureVerdict>({ ok: true });
  const [needsTap, setNeedsTap] = useState(false);
  const [gaps, setGaps] = useState<{ at: string; seconds: number }[]>([]);
  const [dim, setDim] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const link = useRef<PhoneLink | null>(null);
  const engine = useRef<PhoneTeacherTrack | null>(null);
  const graph = useRef<AudioGraph | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const keep = useRef<ScreenKeeper | null>(null);
  const lastAudio = useRef(0);
  const pausedSince = useRef<number | null>(null);
  const restarting = useRef(false);
  const done = useRef(false);
  /** The microphone is open (a ref: listeners made at the tap read it later). */
  const micOn = useRef(false);

  const releaseMic = useCallback(async () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    await graph.current?.close().catch(() => {});
    graph.current = null;
    await keep.current?.stop();
    micOn.current = false;
    setMicReady(false);
    setDim(false);
  }, []);

  const finishTrack = useCallback(async (endedAt: string | null) => {
    const e = engine.current;
    graph.current?.forward(false);
    if (e) await e.finish(endedAt).catch((err) => setStatus({ ...e.state, phase: "error", lastError: String(err?.message ?? err) }));
    done.current = true;
    await releaseMic();
  }, [releaseMic]);

  // The link: made once per signed-in teacher, ticked every 3 s and whenever the page comes back.
  useEffect(() => {
    if (!user) return;
    const l = new PhoneLink({
      transport: supabaseLinkTransport(supabase, user.id),
      device: deviceId,
      now: () => Date.now(),
      findRecording: () => readRow(db.from("class_recordings").select(COLS).eq("started_by", user.id).in("status", ["armed", "recording"])
        .order("capture_opens_at", { ascending: false }).limit(1).maybeSingle()),
      getRecording: (id) => readRow(db.from("class_recordings").select(COLS).eq("id", id).maybeSingle()),
      join: async (row) => {
        const g = graph.current, s = stream.current;
        if (!g || !s) throw new Error("the microphone is not open");
        const track = s.getAudioTracks()[0];
        const e = new PhoneTeacherTrack({
          backend, recording: row, sampleRate: g.sampleRate,
          deviceLabel: track?.label || "phone microphone",
          appliedSettings: (track?.getSettings?.() ?? {}) as Record<string, unknown>,
          onStatus: setStatus,
        });
        await e.measureClock();
        engine.current = e;
        setStatus(e.state);
        await e.tryOrigin().catch(() => false);
      },
      finish: (endedAt) => finishTrack(endedAt),
      onView: setView,
    });
    link.current = l;
    void l.tick();
    let lastClock = Date.now();
    const t = setInterval(async () => {
      await l.tick().catch(() => {});
      const e = engine.current;
      if (!e || done.current) return;
      try {
        await e.tryOrigin();
        if (Date.now() - lastClock > 60000) { lastClock = Date.now(); await e.measureClock(); }
      } catch { /* tried again in 3 s */ }
    }, TICK_MS);
    return () => { clearInterval(t); link.current = null; void l.close(); };
  }, [user, finishTrack]);

  // What the laptop sees of this phone.
  useEffect(() => {
    const l = link.current;
    if (!l) return;
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    const phase: PhonePhase = !health.ok && micReady ? "paused" : status ? status.phase : micReady ? "ready" : "idle";
    l.setPhone({ phase, sentChunks: status?.sentChunks ?? 0, note: health.ok ? status?.lastError ?? null : health.text, hidden });
  }, [status, micReady, health, view?.linkOpen]);

  /** Open the microphone and the sound (inside a tap: iOS asks for it). */
  const openMic = async (): Promise<boolean> => {
    const s = await navigator.mediaDevices.getUserMedia(AUDIO);
    stream.current = s;
    let g = graph.current;
    if (!g) {
      try { g = await AudioGraph.create(48000); } catch { g = await AudioGraph.create(undefined as unknown as number); }
      graph.current = g;
      g.onBatch = (b) => {
        lastAudio.current = performance.now();
        engine.current?.push(b.teacher, performance.now());
        let sum = 0;
        for (let i = 0; i < b.teacher.length; i += 8) sum += b.teacher[i] * b.teacher[i];
        setLevel(Math.min(1, Math.sqrt(sum / Math.max(1, b.teacher.length / 8)) * 4));
      };
      g.onStateChange = () => { void check(); };
    }
    const running = await g.resume();
    g.connect("teacher", s);
    g.forward(true);
    lastAudio.current = performance.now();
    const track = s.getAudioTracks()[0];
    if (track) {
      track.addEventListener("ended", () => { void check(); });
      track.addEventListener("mute", () => { void check(); });
      track.addEventListener("unmute", () => { void check(); });
    }
    return running;
  };

  const record = async () => {
    setMicErr(null);
    setBusy(true);
    try {
      done.current = false;
      await openMic();
      micOn.current = true;
      setMicReady(true);
      if (!keep.current) keep.current = new ScreenKeeper(navigator as any, document, setKeeper);
      await keep.current.start();
      await link.current?.record();
    } catch (err: any) {
      await releaseMic();
      setMicErr(err?.name === "NotAllowedError" ? "The microphone was not allowed. Allow it in Settings > Safari > Microphone and try again." : String(err?.message ?? err));
    } finally { setBusy(false); }
  };

  /** Restart the capture after iPhone stopped it, and put what follows on the timeline after a break. */
  const restart = async (byTap: boolean) => {
    if (restarting.current || !micOn.current || done.current) return;
    restarting.current = true;
    try {
      const old = stream.current?.getAudioTracks()[0];
      const g = graph.current;
      if (!old || old.readyState === "ended" || old.muted || performance.now() - lastAudio.current > 3000) {
        stream.current?.getTracks().forEach((t) => t.stop());
        await openMic();
      } else if (g && g.state !== "running") {
        await g.resume();
      }
      const ok = graph.current?.state === "running";
      setNeedsTap(!ok);
      if (!ok && byTap) setMicErr("The phone did not give the sound back. Close other apps using the microphone and tap again.");
      await engine.current?.breakStretch(true);
      if (ok && pausedSince.current !== null) {
        const seconds = Math.round((Date.now() - pausedSince.current) / 1000);
        setGaps((x) => [{ at: new Date(pausedSince.current!).toLocaleTimeString(), seconds }, ...x].slice(0, 5));
        pausedSince.current = null;
      }
    } catch (err: any) {
      setNeedsTap(true);
      setMicErr(`The microphone could not be restarted: ${String(err?.message ?? err)}. Tap the red button.`);
    } finally { restarting.current = false; void check(false); }
  };

  /** Is the capture running? Said at once; restarted at once when the page is visible. */
  const check = async (mayRestart = true) => {
    if (!micOn.current || done.current) { setHealth({ ok: true }); return; }
    const track = stream.current?.getAudioTracks()[0] ?? null;
    const v = captureHealth({
      visible: document.visibilityState === "visible",
      trackState: (track?.readyState as "live" | "ended" | undefined) ?? null,
      trackMuted: !!track?.muted,
      contextState: graph.current?.state ?? null,
      sinceAudioMs: performance.now() - lastAudio.current,
    });
    setHealth(v);
    if (!v.ok) {
      if (pausedSince.current === null) pausedSince.current = Date.now();
      if (mayRestart && v.restart === "now") await restart(false);
    }
  };

  useEffect(() => {
    if (!micReady) return;
    const onVis = () => { void check(); void link.current?.tick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    const t = setInterval(() => { void check(); }, 1000);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pageshow", onVis); clearInterval(t); };
  }, [micReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { void releaseMic(); }, [releaseMic]);

  if (!user) return null;
  const joined = !!view?.joinedId;
  const finished = !!view?.finishing;
  const phaseText: Record<PhoneStatus["phase"], string> = {
    waiting_for_laptop: "Listening. Waiting for the laptop's first piece of room audio before sending.",
    recording: "Recording your voice into the laptop's recording.",
    finishing: "Sending the last pieces. Keep this page open.",
    done: "Done. Your microphone track is complete; the laptop finishes by itself.",
    stopped_by_server: "The server stopped taking audio from this phone.",
    error: "Something went wrong.",
  };
  const laptopOk = !!view?.laptopConnected;

  const stopButton = micReady && !finished ? (
    confirmStop ? (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="destructive" className="min-h-12" onClick={() => { setConfirmStop(false); void link.current?.stop(); }}>Yes, stop both</Button>
        <Button variant="outline" className="min-h-12" onClick={() => setConfirmStop(false)}>Keep recording</Button>
      </div>
    ) : (
      <Button variant="outline" className="w-full min-h-12" onClick={() => setConfirmStop(true)}>
        <Square className="h-4 w-4 mr-2" aria-hidden /> Stop (phone and laptop)
      </Button>
    )
  ) : null;

  return (
    <Layout title="Phone microphone">
      {/* The loud part: iPhone stopped the microphone. Over everything, the dimmed view too. */}
      {micReady && !health.ok && !finished ? (
        <div role="alert" className="fixed inset-0 z-[70] bg-red-700 text-white flex flex-col items-center justify-center gap-6 p-6 text-center">
          <AlertTriangle className="h-16 w-16" aria-hidden />
          <p className="text-2xl font-bold">YOUR MICROPHONE STOPPED</p>
          <p className="text-lg">{health.text}</p>
          <Button size="lg" variant="secondary" className="min-h-14 text-lg w-full max-w-sm" onClick={() => void restart(true)}>
            <Mic className="h-6 w-6 mr-2" aria-hidden /> Tap to restart the microphone
          </Button>
          {needsTap ? <p className="text-base">iPhone needs this tap to give the sound back.</p> : null}
        </div>
      ) : null}
      {dim && micReady && health.ok && !finished ? (
        <button type="button" className="fixed inset-0 z-[60] bg-black text-neutral-600 flex flex-col items-center justify-center gap-3 p-6 text-center"
          onClick={() => setDim(false)} aria-label="Show the controls">
          <span className="text-lg">● {joined ? "Recording" : "Ready"} - keep this screen open, do not lock the phone</span>
          <span className="text-sm">Tap to show the controls</span>
          <span className="h-1 w-40 rounded-full bg-neutral-900 overflow-hidden"><span className="block h-full bg-neutral-700" style={{ width: `${Math.round(level * 100)}%` }} /></span>
        </button>
      ) : null}

      <div className="max-w-xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Smartphone className="h-5 w-5" aria-hidden /> My phone is my microphone</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-base">
            <p className={`flex items-start gap-2 ${view?.alert ? "text-destructive font-medium" : ""}`} aria-live="polite" data-phone-link="">
              {laptopOk ? <Wifi className="h-5 w-5 shrink-0 mt-0.5" aria-hidden /> : <WifiOff className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />}
              <span><b>Laptop: {laptopOk ? "connected" : "not connected"}.</b> {view?.message ?? "Connecting..."}</span>
            </p>

            {!micReady && !finished ? (
              <>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>On the laptop: Class recorder, <b>Microphones</b>, choose <b>My microphone is my phone</b> and the Anker as the room microphone.</li>
                  <li>Press <b>Record</b> here (or Ready for today on the laptop). The laptop records the lesson at its time; this phone joins at the same moment.</li>
                  <li>Keep this page open and the screen on (the dimmed view saves battery). Plug the phone in for long lessons.</li>
                </ol>
                {micErr ? <p role="alert" className="text-destructive">{micErr}</p> : null}
                <Button size="lg" className="w-full min-h-14 text-lg" onClick={record} disabled={busy}>
                  {busy ? <Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> : <Mic className="h-5 w-5 mr-2" aria-hidden />}
                  {view?.canJoinNow ? "Record: join the laptop now" : "Record"}
                </Button>
              </>
            ) : null}

            {micReady || finished ? (
              <>
                <p aria-live="polite" className="font-medium">
                  {status ? phaseText[status.phase] : "Microphone open. Waiting for the laptop to record."}
                </p>
                <div className="h-3 rounded-full bg-muted overflow-hidden" aria-label="Microphone level">
                  <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} />
                </div>
                {status ? (
                  <p className="text-sm text-muted-foreground">
                    Sent {status.sentChunks} pieces ({Math.round(status.sentMs / 60000)} min){status.queued ? `, ${status.queued} waiting` : ""}.
                  </p>
                ) : null}
                {status?.lastError ? <p className="text-sm text-destructive" role="status">{status.lastError}</p> : null}
                {micErr ? <p role="alert" className="text-sm text-destructive">{micErr}</p> : null}
                {gaps.length ? (
                  <div role="status" className="rounded-md border border-destructive p-3 text-sm space-y-1">
                    <p className="font-medium text-destructive">The microphone was stopped by the phone:</p>
                    {gaps.map((g, i) => <p key={i}>{g.at}: {g.seconds} s missing from your track.</p>)}
                  </div>
                ) : null}
                {micReady ? (
                  <>
                    <p className="text-sm">
                      Do not lock the phone or switch apps: iPhone stops the microphone when the screen locks.
                      {keeper ? (keeper.held ? " The screen is kept on." : keeper.supported ? " The screen could not be kept on: set Auto-Lock to Never while you record." : " This browser cannot keep the screen on: set Settings > Display & Brightness > Auto-Lock to Never.") : ""}
                    </p>
                    <Button variant="secondary" className="w-full min-h-12" onClick={() => setDim(true)}>
                      <Moon className="h-4 w-4 mr-2" aria-hidden /> Dim the screen (keep it open)
                    </Button>
                  </>
                ) : null}
                {stopButton}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
