import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Smartphone } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AudioGraph } from "@/lib/recorder/audioGraph";
import { supabaseBackend, type SupabaseLike } from "@/lib/recorder/backend";
import { PhoneTeacherTrack, phoneMayJoin, type PhoneStatus } from "@/lib/recorder/phoneTrack";
import type { ServerRecording } from "@/lib/recorder/types";

/**
 * /teacher/recorder/phone - the teacher's phone as the teacher microphone.
 *
 * The laptop runs the class recorder in "My microphone is my phone" mode (it
 * records the Anker only). This page, signed in as the same teacher, finds
 * that running recording and sends the teacher track into it
 * (`src/lib/recorder/phoneTrack.ts` holds every rule). Keep this page open
 * and the screen on for the whole lesson.
 */

const db = supabase as any;
const backend = supabaseBackend(supabase as unknown as SupabaseLike);
const COLS = "id,class_id,session_id,armed_session_id,session_date,scheduled_start,scheduled_end,capture_opens_at,capture_closes_at,status,format,chunk_ms,max_duration_ms,min_bytes_per_sec,clock_tolerance_ms,purpose,started_at,ended_at,stop_reason,stop_requested_at,late_after_ms,manifest_path,manifest_sha256,pre_start_ms,started_by,client_info,classes(name)";

type LiveRow = ServerRecording & { client_info?: Record<string, unknown> | null; classes?: { name?: string } | null };

export default function TeacherPhoneMic() {
  const { user } = useAuth();
  const [live, setLive] = useState<LiveRow | null>(null);
  const [looked, setLooked] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [level, setLevel] = useState(0);
  const engine = useRef<PhoneTeacherTrack | null>(null);
  const graph = useRef<AudioGraph | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const wake = useRef<any>(null);

  const findLive = useCallback(async (): Promise<LiveRow | null> => {
    if (!user) return null;
    const { data } = await db.from("class_recordings").select(COLS)
      .eq("started_by", user.id).eq("status", "recording")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    setLooked(true);
    setLive((data as LiveRow) ?? null);
    return (data as LiveRow) ?? null;
  }, [user]);

  // Look for the laptop's recording every 5 s until joined.
  useEffect(() => {
    if (engine.current) return;
    void findLive();
    const t = setInterval(() => { if (!engine.current) void findLive(); }, 5000);
    return () => clearInterval(t);
  }, [findLive]);

  const release = useCallback(async () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    await graph.current?.close().catch(() => {});
    graph.current = null;
    try { await wake.current?.release?.(); } catch { /* */ }
    wake.current = null;
  }, []);

  const finish = useCallback(async (endedAt?: string | null) => {
    const e = engine.current;
    if (!e) return;
    graph.current?.forward(false);
    await e.finish(endedAt ?? null).catch((err) => setStatus({ ...e.state, phase: "error", lastError: String(err?.message ?? err) }));
    await release();
  }, [release]);

  // While joined: fix the timeline, keep the clock fresh, follow the laptop's Stop.
  useEffect(() => {
    if (!status || status.phase === "done" || status.phase === "error") return;
    let lastClock = Date.now();
    const t = setInterval(async () => {
      const e = engine.current;
      if (!e) return;
      try {
        await e.tryOrigin();
        if (Date.now() - lastClock > 60000) { lastClock = Date.now(); await e.measureClock(); }
        const row = await backend.getRecording(live!.id);
        // Stopped on the laptop (uploading), or no longer readable as an open recording of yours.
        if (!row || row.status !== "recording") await finish(row?.ended_at ?? null);
      } catch { /* tried again in 5 s */ }
    }, 5000);
    return () => clearInterval(t);
  }, [status?.phase, live, finish]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    setJoinErr(null);
    const row = await findLive();
    const verdict = phoneMayJoin(row, null);
    if (!verdict.ok || !row) { setJoinErr(verdict.reason ?? "Cannot join."); return; }
    setBusy(true);
    try {
      // The click is the gesture iOS needs for the microphone and the audio context.
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
      stream.current = s;
      let g: AudioGraph;
      try { g = await AudioGraph.create(48000); } catch { g = await AudioGraph.create(undefined as unknown as number); }
      graph.current = g;
      await g.resume();
      const track = s.getAudioTracks()[0];
      const e = new PhoneTeacherTrack({
        backend, recording: row, sampleRate: g.sampleRate,
        deviceLabel: track?.label || "phone microphone",
        appliedSettings: (track?.getSettings?.() ?? {}) as Record<string, unknown>,
        onStatus: setStatus,
      });
      await e.measureClock();
      engine.current = e;
      g.onBatch = (b) => {
        e.push(b.teacher, performance.now());
        let sum = 0;
        for (let i = 0; i < b.teacher.length; i += 8) sum += b.teacher[i] * b.teacher[i];
        setLevel(Math.min(1, Math.sqrt(sum / Math.max(1, b.teacher.length / 8)) * 4));
      };
      g.connect("teacher", s);
      g.forward(true);
      try { wake.current = await (navigator as any).wakeLock?.request?.("screen"); } catch { /* not offered */ }
      setStatus(e.state);
      await e.tryOrigin().catch(() => false);
    } catch (err: any) {
      await release();
      engine.current = null;
      setJoinErr(err?.name === "NotAllowedError" ? "The microphone was not allowed. Allow it in the browser settings and try again." : String(err?.message ?? err));
    } finally { setBusy(false); }
  };

  useEffect(() => () => { void release(); }, [release]);

  if (!user) return null;
  const joined = !!engine.current && !!status;
  const phaseText: Record<PhoneStatus["phase"], string> = {
    waiting_for_laptop: "Listening. Waiting for the laptop's first piece of room audio before sending.",
    recording: "Recording your voice into the laptop's recording.",
    finishing: "Sending the last pieces. Keep this page open.",
    done: "Done. Your microphone track is complete; the laptop finishes by itself.",
    stopped_by_server: "The server stopped taking audio from this phone.",
    error: "Something went wrong.",
  };

  return (
    <Layout title="Phone microphone">
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Smartphone className="h-5 w-5" aria-hidden /> My phone is my microphone</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-base">
            {!joined ? (
              <>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>On the laptop: Class recorder, <b>Microphones</b>, choose <b>My microphone is my phone</b> and the Anker as the room microphone.</li>
                  <li>Start the lesson's recording on the laptop as usual.</li>
                  <li>Here: press Join. Keep the phone in your pocket with this page open and the screen on.</li>
                </ol>
                {looked && !live ? <p className="text-muted-foreground">No recording of yours is running yet. This page looks again every 5 seconds.</p> : null}
                {live ? <p>Found: <b>{live.classes?.name ?? "your lesson"}</b>, recording since {live.started_at ? new Date(live.started_at).toLocaleTimeString() : "-"}.</p> : null}
                {joinErr ? <p role="alert" className="text-destructive">{joinErr}</p> : null}
                <Button size="lg" className="w-full min-h-12 text-base" onClick={join} disabled={busy || !live}>
                  {busy ? <Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> : <Mic className="h-5 w-5 mr-2" aria-hidden />}
                  Join as my microphone
                </Button>
              </>
            ) : (
              <>
                <p aria-live="polite" className="font-medium">{phaseText[status!.phase]}</p>
                <div className="h-3 rounded-full bg-muted overflow-hidden" aria-label="Microphone level">
                  <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Sent {status!.sentChunks} pieces ({Math.round(status!.sentMs / 60000)} min){status!.queued ? `, ${status!.queued} waiting` : ""}.
                </p>
                {status!.lastError ? <p className="text-sm text-destructive" role="status">{status!.lastError}</p> : null}
                <p className="text-sm">Do not lock the phone or switch apps: the browser stops the microphone when the page is hidden. Plug the phone in for long lessons. The recording stops here by itself when you press Stop on the laptop.</p>
                {status!.phase === "recording" || status!.phase === "waiting_for_laptop" ? (
                  <Button variant="outline" className="w-full min-h-12" onClick={() => finish(null)}>
                    <Square className="h-4 w-4 mr-2" aria-hidden /> Stop my microphone
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
