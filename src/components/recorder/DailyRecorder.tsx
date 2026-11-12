/**
 * The teacher's daily recorder screen. It opens on today's lesson from the
 * timetable, takes the one "Ready for today" click the browser needs for
 * sound, and from then on the engine arms and starts by itself at the
 * capture window. While capturing, a "Recording" bar is fixed to the screen
 * (and in the tab title); the teacher can add markers and Stop.
 *
 * The server decides whether a lesson may be recorded (class switch, consent,
 * teacher, time). This screen only reads the switch to say so calmly, and
 * renders the engine's own refusals in plain words.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleDot, Flag, ListChecks, Loader2, Mic, Settings2, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  clock, documentTitle, errorView, hanoiDate, hhmm, lessonHeadline, lessonPhase, lessonTimes, nextAfter, pickLesson, stopConfirmText,
  trackName, uploadMbps, uploadSpeedLine, uploadStatus, addMinutes, type ErrorView, type LessonLike,
} from "@/lib/recorderUi";
import type { ChunkMeta, DeviceProfile, Level, ProfileResolution, RecorderError, RecorderState, TrackRole, UploadProgress, MarkerKind } from "@/lib/recorder";
import { useRecorderDeps } from "./RecorderDeps";
import type { RecorderLike } from "./engine";
import { fetchClassSwitch, fetchEnrolled, fetchRecorderSettings, fetchTodayLessons } from "./data";
import { LevelMeter, MicTick, Notice, Status } from "./pieces";

const CAPTURING: RecorderState[] = ["starting", "recording"];
const SAVING: RecorderState[] = ["stopping", "uploading", "finalizing"];

interface MarkerNote { id: number; text: string; at: string }

function micDetail(res: ProfileResolution | null, role: TrackRole, profile: DeviceProfile | null): { ok: boolean; detail: string } {
  const label = profile?.[role]?.label ?? "";
  if (!res) return { ok: false, detail: "Press Ready for today to check." };
  if (res.status === "ok") return { ok: true, detail: (role === "teacher" ? res.teacher.label : res.room.label) || label };
  if (res.status === "same_device") return { ok: false, detail: "Both roles point at the same microphone. Run the microphone check." };
  if (res.roles.includes(role)) return { ok: false, detail: res.status === "missing" ? `Not plugged in: ${label || "the saved microphone"}` : "Two microphones look the same. Run the microphone check." };
  return { ok: true, detail: label };
}

export function DailyRecorder({ userId, onSetup, onActiveChange }: { userId: string; onSetup: () => void; onActiveChange?: (active: boolean) => void }) {
  const { client, engine, now } = useRecorderDeps();
  const [tick, setTick] = useState(() => now());
  useEffect(() => { const iv = setInterval(() => setTick(now()), 1000); return () => clearInterval(iv); }, [now]);
  const today = hanoiDate(tick);

  const settings = useQuery({ queryKey: ["recorder-settings"], queryFn: () => fetchRecorderSettings(client), staleTime: 5 * 60_000 });
  const lessons = useQuery({ queryKey: ["recorder-today", userId, today], queryFn: () => fetchTodayLessons(client, userId, today), staleTime: 60_000 });
  const w = settings.data ?? { preRoll: 5, grace: 10, armWindow: 20 };
  const lesson = useMemo(() => pickLesson(lessons.data ?? [], tick, w), [lessons.data, tick, w]);
  const switchQ = useQuery({ queryKey: ["recorder-switch", lesson?.classId], enabled: !!lesson, queryFn: () => fetchClassSwitch(client, lesson!.classId), refetchInterval: 60_000 });
  const kids = useQuery({ queryKey: ["recorder-kids", lesson?.classId, today], enabled: !!lesson, queryFn: () => fetchEnrolled(client, [lesson!.classId], today) });

  const [profile, setProfile] = useState<DeviceProfile | null>(() => engine.loadProfile(userId));
  const rec = useRef<RecorderLike | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<ProfileResolution | null>(null);
  const [levels, setLevels] = useState<{ teacher: Level; room: Level } | null>(null);
  const [upload, setUpload] = useState<UploadProgress | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [error, setError] = useState<{ view: ErrorView; code: string } | null>(null);
  const [unplugged, setUnplugged] = useState<Set<TrackRole>>(new Set());
  const [lost, setLost] = useState<Set<TrackRole>>(new Set());
  const [stopAsked, setStopAsked] = useState<string | null>(null);
  const [armedFor, setArmedFor] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [marks, setMarks] = useState<MarkerNote[]>([]);
  const [speed, setSpeed] = useState<number | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const samples = useRef<{ bytes: number; ms: number }[]>([]);
  const markSeq = useRef(0);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // The tab title says "Recording" while capturing, whatever is scrolled or focused.
  const capturing = CAPTURING.includes(state);
  useEffect(() => {
    const base = "Class recorder";
    document.title = documentTitle(base, capturing);
    return () => { document.title = base; };
  }, [capturing]);

  useEffect(() => () => { void rec.current?.dispose(); }, []);
  const active = state === "armed" || capturing || SAVING.includes(state);
  useEffect(() => { onActiveChange?.(active); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const showError = useCallback((e: RecorderError) => {
    if (e.code === "offline") return; // the upload line says it
    const track = (e.detail === "teacher" || e.detail === "room") ? e.detail as TrackRole : /room/.test(e.message) ? "room" : /teacher/.test(e.message) ? "teacher" : null;
    if (e.code === "constraint_not_honoured") return;
    setError({ view: errorView(e.code, e.refusal ?? null, track), code: e.code });
  }, []);

  const wire = (r: RecorderLike) => {
    r.on("state", ({ state: s }) => {
      setState(s);
      if (s === "recording") setStartedAt((v) => v ?? now());
    });
    r.on("level", (l) => setLevels({ teacher: l.teacher, room: l.room }));
    r.on("upload", (p) => setUpload(p));
    r.on("error", showError);
    r.on("stop_requested", ({ reason }) => setStopAsked(reason === "switch_off" ? "Recording was switched off for this class. It is finishing and saving." : "This lesson was cancelled. The recording is finishing and saving."));
    r.on("health", (h: any) => {
      if (h.kind === "device_unplugged") setUnplugged((s) => new Set(s).add(h.track));
      if (h.kind === "device_restored") { setUnplugged((s) => { const n = new Set(s); n.delete(h.track); return n; }); setError((e) => (e?.code === "device_unplugged" ? null : e)); }
      if (h.kind === "device_lost") { setUnplugged((s) => { const n = new Set(s); n.delete(h.track); return n; }); setLost((s) => new Set(s).add(h.track)); }
    });
    r.on("chunk", (c: ChunkMeta) => {
      if (c.state === "confirmed" && c.registeredAt && c.confirmedAt && c.confirmedAt - c.registeredAt < 60_000) {
        samples.current.push({ bytes: c.byteSize, ms: c.confirmedAt - c.registeredAt });
        if (samples.current.length > 20) samples.current.shift();
        setSpeed(uploadMbps(samples.current));
      }
    });
  };

  // Keep the first measured upload speed with this browser's profile (local only).
  useEffect(() => {
    if (speed === null || !profile || profile.checks?.upload_mbps) return;
    const p = { ...profile, checks: { ...profile.checks, upload_mbps: speed, upload_measured_at: new Date(now()).toISOString() } };
    engine.saveProfile(p); setProfile(p);
  }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = async () => {
    setBusy(true); setError(null);
    try {
      let r = rec.current;
      if (!r) {
        r = await engine.createRecorder({ client, userId, profile });
        rec.current = r;
        wire(r);
      }
      const p = await r.prepare();
      setDevices(p.devices);
      await r.recover();
      if (r.state === "ready" || r.state === "idle") setState(r.state);
    } catch (e: any) {
      showError(e?.code ? e : { code: "internal", message: String(e?.message ?? e) } as RecorderError);
    } finally { setBusy(false); }
  };

  // Arm the lesson once its arm window opens (the server refuses anything earlier anyway).
  const phase = lesson ? lessonPhase(lesson, tick, w) : null;
  const switchOn = switchQ.data === true;
  const devicesOk = devices?.status === "ok";
  useEffect(() => {
    const r = rec.current;
    if (!r || !lesson || !switchOn || !devicesOk || busy) return;
    if (armedFor === lesson.sessionId) return;
    if (phase !== "arming" && phase !== "capturing") return;
    if (r.state !== "ready" && r.state !== "complete" && r.state !== "abandoned") return;
    setArmedFor(lesson.sessionId);
    const next = nextAfter(lesson, lessons.data ?? [], w);
    const stopAt = next ? lessonTimes(next, w).start : undefined;
    setStartedAt(null); setMarks([]); setUpload(null); setUnplugged(new Set()); setLost(new Set()); setStopAsked(null); setError(null);
    r.arm({ sessionId: lesson.sessionId, classId: lesson.classId, className: lesson.className, date: lesson.date, startTime: lesson.startTime, endTime: lesson.endTime, status: lesson.status ?? undefined }, { stopAt })
      .catch((e: RecorderError) => showError(e));
  }, [lesson, switchOn, devicesOk, phase, armedFor, busy, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMarker = async (kind: MarkerKind, text: string, studentId?: string) => {
    const r = rec.current;
    if (!r) return;
    try {
      await r.marker(kind, { label: text, studentId: studentId ?? null });
      const at = startedAt ? clock(now() - startedAt) : "";
      setMarks((m) => [{ id: ++markSeq.current, text, at }, ...m].slice(0, 6));
    } catch (e) { showError(e as RecorderError); }
  };

  const stop = async () => {
    setConfirmStop(false);
    try { await rec.current?.stop("manual"); } catch (e) { showError(e as RecorderError); }
  };

  // ------------------------------------------------------------ render

  if (lessons.isLoading || settings.isLoading) {
    return <Status line={{ tone: "info", text: "Loading today's lessons..." }} live />;
  }

  const banner = capturing ? (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-destructive bg-destructive text-destructive-foreground shadow-lg"
      role="status"
      aria-live="polite"
      aria-label="Recording in progress"
    >
      <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-lg font-bold">
          <CircleDot className="h-5 w-5 motion-safe:animate-pulse" aria-hidden />
          {state === "starting" ? "Starting to record" : "Recording"}
        </span>
        <span className="tabular-nums text-lg">{startedAt ? clock(tick - startedAt) : "00:00"}</span>
        <span className="min-w-0 break-words">{lesson?.className}</span>
        <Button variant="secondary" className="ml-auto min-h-11 text-base" onClick={() => setConfirmStop(true)}>
          <Square className="h-4 w-4 mr-2" aria-hidden /> Stop
        </Button>
      </div>
    </div>
  ) : null;

  const errorBox = error ? (
    <Notice
      tone={error.view.tone}
      title={error.view.title}
      role="alert"
      action={error.view.actionLabel ? (
        <Button className="min-h-11" onClick={() => {
          if (error.view.action === "open_setup") onSetup();
          else if (error.view.action === "reload" || error.view.action === "sign_in") window.location.reload();
          else if (error.view.action === "plug_in") setError(null);
          else void ready();
        }}>{error.view.actionLabel}</Button>
      ) : undefined}
    >{error.view.body}</Notice>
  ) : null;

  if (!profile) {
    return (
      <Notice tone="info" title="Set up the microphones first" action={<Button size="lg" className="min-h-12 text-base" onClick={onSetup}><Settings2 className="h-5 w-5 mr-2" aria-hidden /> Set up the microphones</Button>}>
        You do this once on this laptop. It takes about five minutes.
      </Notice>
    );
  }

  if (!lesson && !capturing && !SAVING.includes(state)) {
    return (
      <div className="space-y-4">
        <Notice tone="info" title="No more lessons to record today">The recorder shows your next lesson here on the day.</Notice>
        {upload && upload.pending > 0 ? uploadStatus(upload, online).map((l) => <Status key={l.text} line={l} live />) : null}
      </div>
    );
  }

  const switchOff = switchQ.isSuccess && !switchOn;

  return (
    <div className={cn("space-y-5", capturing && "pb-28")}>
      {lesson ? (
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold break-words">{lessonHeadline(lesson, w)}</h2>
          <p className="text-muted-foreground">
            Lesson {hhmm(lesson.startTime)} - {hhmm(lesson.endTime)}. Recording stops by itself at {addMinutes(lesson.endTime, w.grace)}.
          </p>
        </header>
      ) : null}

      {switchOff ? (
        <Notice tone="info" title="Recording is off for this class">
          Nothing will be recorded in this lesson. Teach as usual. An admin can switch recording on once every family has given permission.
        </Notice>
      ) : (
        <>
          {errorBox}
          {stopAsked ? <Notice tone="info" title="The school stopped this recording" role="status">{stopAsked}</Notice> : null}

          <section aria-label="Microphones" className="rounded-xl border border-border p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["teacher", "room"] as TrackRole[]).map((role) => {
                const d = micDetail(devices, role, profile);
                const off = unplugged.has(role) ? { ok: false, detail: "Unplugged - plug it back in" } : lost.has(role) ? { ok: false, detail: "Gone for this lesson - the other microphone carries on" } : d;
                return <MicTick key={role} label={trackName(role)} ok={off.ok} detail={off.detail} />;
              })}
            </div>
            {devices && devices.status !== "ok" ? (
              <Button variant="outline" className="min-h-11" onClick={onSetup}><Settings2 className="h-4 w-4 mr-2" aria-hidden /> Check the microphones</Button>
            ) : null}
          </section>

          {state === "idle" ? (
            <div className="space-y-2">
              <Button size="lg" className="min-h-14 w-full sm:w-auto text-lg px-8" onClick={() => void ready()} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> : <Mic className="h-5 w-5 mr-2" aria-hidden />}
                Ready for today
              </Button>
              <p className="text-sm text-muted-foreground">One click lets the browser use sound. Then leave this page open; recording starts by itself.</p>
            </div>
          ) : null}

          {(state === "ready" || state === "armed") && lesson ? (
            <Status
              live
              line={{ tone: "ok", text: state === "armed"
                ? `Ready. Recording starts by itself at ${addMinutes(lesson.startTime, -w.preRoll)}. Keep this page open and the laptop plugged in.`
                : phase === "later" ? `Ready. The recorder gets this lesson ready at ${addMinutes(lesson.startTime, -w.armWindow)}.` : "Getting the lesson ready..." }}
            />
          ) : null}

          {capturing || SAVING.includes(state) || state === "complete" || state === "abandoned" ? (
            <section aria-label="Saving" className="space-y-1">
              {uploadStatus(upload, online).map((l) => <Status key={l.text} line={l} live />)}
              {capturing ? <Status line={uploadSpeedLine(speed)} /> : null}
            </section>
          ) : null}

          {capturing ? (
            <>
              <section aria-label="Levels" className="rounded-xl border border-border p-4 space-y-4">
                <LevelMeter label={trackName("teacher")} level={unplugged.has("teacher") || lost.has("teacher") ? null : levels?.teacher ?? null} />
                <LevelMeter label={trackName("room")} level={unplugged.has("room") || lost.has("room") ? null : levels?.room ?? null} />
              </section>

              <section aria-labelledby="mk-h" className="space-y-3">
                <h3 id="mk-h" className="text-lg font-semibold">Mark a moment</h3>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                  <Button variant="outline" className="min-h-16 text-base whitespace-normal" onClick={() => void addMarker("roll_call_start", "Roll-call start")}><ListChecks className="h-5 w-5 mr-2 shrink-0" aria-hidden /> Roll-call start</Button>
                  <Button variant="outline" className="min-h-16 text-base whitespace-normal" onClick={() => void addMarker("roll_call_end", "Roll-call end")}><ListChecks className="h-5 w-5 mr-2 shrink-0" aria-hidden /> Roll-call end</Button>
                  <Button variant="outline" className="min-h-16 text-base whitespace-normal" onClick={() => void addMarker("activity", "Activity")}><Flag className="h-5 w-5 mr-2 shrink-0" aria-hidden /> Activity</Button>
                </div>
                {kids.data && kids.data.length ? (
                  <details className="rounded-xl border border-border p-3">
                    <summary className="cursor-pointer min-h-11 flex items-center gap-2 font-medium"><Users className="h-5 w-5" aria-hidden /> Tap a child's name when they speak (optional)</summary>
                    <div className="flex flex-wrap gap-2 pt-3">
                      {kids.data.map((k) => (
                        <Button key={k.student_id} variant="secondary" className="min-h-11 h-auto py-2 whitespace-normal text-left break-words max-w-full" onClick={() => void addMarker("student_name", k.name, k.student_id)}>
                          {k.name}
                        </Button>
                      ))}
                    </div>
                  </details>
                ) : null}
                {marks.length ? (
                  <ul className="text-sm text-muted-foreground space-y-1" aria-live="polite">
                    {marks.map((m) => <li key={m.id} className="break-words">Marked: {m.text}{m.at ? ` at ${m.at}` : ""}</li>)}
                  </ul>
                ) : null}
              </section>
              <p className="text-sm text-muted-foreground">The {w.preRoll} minutes before the lesson and the {w.grace} minutes after it are recorded, but they do not count as lesson time.</p>
            </>
          ) : null}

          {SAVING.includes(state) ? (
            <Notice tone="info" title="Saving - keep this page open" role="status">The recording has stopped. The last pieces are going to the school's server.</Notice>
          ) : null}
          {state === "complete" ? (
            <Notice tone="ok" title="Saved" role="status">The whole recording is on the school's server. You can close this page.</Notice>
          ) : null}
          {state === "abandoned" && !error ? (
            <Notice tone="warn" title="This recording did not finish" role="status">Anything recorded is kept on this laptop. An admin can see what happened.</Notice>
          ) : null}
        </>
      )}

      {banner}

      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{stopConfirmText(lesson, tick)}</AlertDialogTitle>
            <AlertDialogDescription>What is recorded so far is kept and saved. This lesson's recording ends here.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep recording</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void stop()}>Stop recording</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type { LessonLike };
