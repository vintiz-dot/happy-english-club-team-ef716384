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
import { Flag, ListChecks, Loader2, Mic, Settings2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  boardAdd, boardClear, boardForScreen, clock, hanoiDate, type BoardEntry, hhmm, lessonHeadline, lessonPhase, pickLesson, stopConfirmText,
  trackName, uploadMbps, uploadSpeedLine, uploadStatus, addMinutes, type LessonLike,
} from "@/lib/recorderUi";
import type { ChunkMeta, DeviceProfile, HeldAudio, Level, ProfileResolution, RecorderError, RecorderState, TrackRole, UploadProgress, MarkerKind } from "@/lib/recorder";
import { useRecorderDeps } from "./RecorderDeps";
import type { RecorderLike } from "./engine";
import { dayDeps, fetchClassSwitch, fetchEnrolled, fetchRecorderSettings, fetchTodayLessons } from "./data";
import { LevelMeter, MicTick, Notice, Status } from "./pieces";
import { NotRecordedNotice, RecordingBar } from "./RecordingBar";
import { adopt, attachScreen, CAPTURING_STATES, detachScreen, pressReady, readyFor, sessionFor, sessionState, setLessonLabel, setPrepared, startDay } from "./session";

// `stalled` is a capturing state: Stop stays, the screen must not be left (C2 review 2, item 1).
const CAPTURING: RecorderState[] = CAPTURING_STATES;   // one list, shared with the floating bar (tested)
const TITLE_PREFIX = /^(● RECORDING|◌ ARMED|⚠ NOT RECORDING|◌ WAITING FOR THE SERVER) - /;
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
  // Errors by (code, track), by priority, de-duplicated (C2 review 2, item 6).
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [clipping, setClipping] = useState<{ teacher: boolean; room: boolean }>({ teacher: false, room: false });
  const [stuck, setStuck] = useState<HeldAudio[]>([]);
  const [others, setOthers] = useState<{ recordings: number; bytes: number } | null>(null);
  const [discardFor, setDiscardFor] = useState<HeldAudio | null>(null);
  const [discardWord, setDiscardWord] = useState("");
  const [startingSince, setStartingSince] = useState<number | null>(null);
  const [notDurable, setNotDurable] = useState(false);
  // C3-b: the page prepares by itself (uploads of earlier audio resume without a click); arming waits for the click.
  // R4-2: the click is kept for the day (session.ts readyFor): it survives leaving the page and a reload,
  // and the SESSION arms each lesson, wherever the teacher is in the app.
  const [clicked, setClicked] = useState(() => !!readyFor(userId, hanoiDate(now())));
  const [soundOk, setSoundOk] = useState(true);
  const autoPrep = useRef(false);
  const autoDone = useRef(false);
  const [unplugged, setUnplugged] = useState<Set<TrackRole>>(new Set());
  const [lost, setLost] = useState<Set<TrackRole>>(new Set());
  const [stopAsked, setStopAsked] = useState<string | null>(null);
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

  // The tab title: the ENGINE prefixes "● RECORDING - " / "◌ ARMED - " on every state change
  // (controller.ts setState), so this screen only sets the base title and never adds a second prefix.
  const capturing = CAPTURING.includes(state);
  useEffect(() => {
    const before = document.title;
    if (!TITLE_PREFIX.test(document.title)) document.title = "Class recorder";
    return () => { document.title = before.replace(TITLE_PREFIX, ""); };
  }, []);
  const capturingRef = useRef(false);
  capturingRef.current = capturing;

  // C2 review 3 (C3-a): the engine lives in ./session, above the router. This
  // screen attaches to it while mounted; leaving the page (any in-app link)
  // detaches it and, while it is busy, the session draws a recording bar with
  // Stop on every page. The sign-out guard lives there too (any page).
  const offs = useRef<(() => void)[]>([]);
  useEffect(() => {
    const have = sessionFor(userId);
    if (have) { rec.current = have; wire(have); setState(have.state); attachScreen(); }
    return () => { for (const off of offs.current) off(); offs.current = []; if (rec.current) detachScreen(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const active = state === "armed" || capturing || SAVING.includes(state);
  useEffect(() => { onActiveChange?.(active); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const showError = useCallback((e: RecorderError) => {
    const d: any = e.detail;
    const track = (d === "teacher" || d === "room") ? d as TrackRole : (d?.track === "teacher" || d?.track === "room") ? d.track as TrackRole : /room/.test(e.message) ? "room" : /teacher/.test(e.message) ? "teacher" : null;
    // While the page prepares by itself (no click yet) the "one click needed" for sound is not an error to show.
    if (autoPrep.current && e.code === "audio_context_suspended") return;
    setBoard((b) => boardAdd(b, { code: e.code, refusal: e.refusal ?? null, message: e.message, track }, Date.now(), capturingRef.current));
  }, []);
  const clearErrors = (codes: RecorderError["code"][], track?: TrackRole | null) => setBoard((b) => boardClear(b, codes, track));

  const wire = (r0: RecorderLike) => {
    // Every listener is removed when the screen goes (the engine may outlive it).
    const r = { on: ((k: any, fn: any) => { offs.current.push(r0.on(k, fn)); }) as unknown as RecorderLike["on"] };
    r.on("state", ({ state: s }) => {
      setState(s);
      // A new lesson armed (by the session): this screen's notes of the last one go.
      if (s === "armed") { setStartedAt(null); setMarks([]); setUpload(null); setUnplugged(new Set()); setLost(new Set()); setStopAsked(null); setBoard([]); setClipping({ teacher: false, room: false }); }
      if (s === "recording" || s === "starting") setStartedAt((v) => v ?? now());
      setStartingSince((v) => (s === "starting" ? v ?? now() : null));
      if (s === "recording") clearErrors(["capture_stalled", "server_unavailable"]);
    });
    r.on("level", (l) => { setLevels({ teacher: l.teacher, room: l.room }); if (l.clipping) setClipping(l.clipping); });
    r.on("stuck", ({ recordings }) => setStuck(recordings));
    r.on("recovered", ({ othersPending }) => setOthers(othersPending && othersPending.recordings > 0 ? othersPending : null));
    r.on("upload", (p) => setUpload(p));
    r.on("error", showError);
    r.on("stop_requested", ({ reason }) => setStopAsked(reason === "switch_off" ? "Recording was switched off for this class. It is finishing and saving." : "This lesson was cancelled. The recording is finishing and saving."));
    r.on("health", (h: any) => {
      if (h.kind === "device_unplugged") setUnplugged((s) => new Set(s).add(h.track));
      // device_lost now means "gone a minute, still being looked for"; device_restored ends both.
      if (h.kind === "device_restored") {
        setUnplugged((s) => { const n = new Set(s); n.delete(h.track); return n; });
        setLost((s) => { const n = new Set(s); n.delete(h.track); return n; });
        clearErrors(["device_unplugged", "device_lost"], h.track);
      }
      if (h.kind === "device_lost") { setUnplugged((s) => { const n = new Set(s); n.delete(h.track); return n; }); setLost((s) => new Set(s).add(h.track)); }
      // A silent microphone stays on the board until the engine hears it again.
      if (h.kind === "recovered") clearErrors(["mic_silent"], h.track);
      if (h.kind === "capture_resumed") clearErrors(["capture_stalled"]);
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

  const ready = async (byClick = true) => {
    setBusy(true);
    if (byClick) { setBoard([]); setClicked(true); pressReady(userId, today); }
    try {
      let r = rec.current;
      if (!r) {
        r = await engine.createRecorder({ client, userId, profile });
        rec.current = r;
        adopt(userId, r);
        attachScreen();
        wire(r);
      }
      const p = await r.prepare();
      setDevices(p.devices);
      setSoundOk(p.contextRunning);
      setPrepared({ contextRunning: p.contextRunning, devicesOk: p.devices.status === "ok" });
      startDay(dayDeps(client, userId, now));
      setNotDurable(r.durable === false);
      await r.recover();
      setStuck((await r.heldAudio().catch(() => [] as HeldAudio[])).filter((h) => h.overLimit || !!h.deleteAt));
      if (r.state === "ready" || r.state === "idle") setState(r.state);
    } catch (e: any) {
      showError(e?.code ? e : { code: "internal", message: String(e?.message ?? e) } as RecorderError);
    } finally { setBusy(false); }
  };

  // R4-2: arming lives in the session (session.ts armTick), not in this page.
  const phase = lesson ? lessonPhase(lesson, tick, w) : null;
  const switchOn = switchQ.data === true;

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

  // C3-b: prepare and recover by themselves when the page opens (uploads of
  // earlier audio need no click and resume even on a day without a lesson);
  // arming still waits for "Ready for today".
  useEffect(() => {
    if (autoDone.current || !profile || lessons.isLoading) return;
    autoDone.current = true;
    autoPrep.current = true;
    void ready(false).finally(() => { autoPrep.current = false; });
  }, [profile, lessons.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (lesson) setLessonLabel(lesson.className); }, [lesson?.className]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ render

  if (lessons.isLoading || settings.isLoading) {
    return <Status line={{ tone: "info", text: "Loading today's lessons..." }} live />;
  }

  // The red dot only for `recording` (C2 review 2, items 1-2): `starting` saves on this
  // laptop while the server has not confirmed; `stalled` is NOT recording.
  const startingLong = state === "starting" && startingSince !== null && tick - startingSince > 5000;
  const banner = capturing ? (
    <RecordingBar state={state} startingLong={startingLong} elapsed={startedAt ? clock(tick - startedAt) : "00:00"} className={lesson?.className}
      bothMicsGone={unplugged.size + lost.size >= 2} onStop={() => setConfirmStop(true)} />
  ) : null;

  // The start failure is said once, by the notice below, on the error screen (C2 review 5).
  const shown = boardForScreen(board, tick, state);
  const errorBox = shown.length ? (
    <div className="space-y-3">
      {shown.map((e) => (
        <Notice
          key={e.key}
          tone={e.view.tone}
          title={e.count > 1 ? `${e.view.title} (${e.count}x)` : e.view.title}
          role={e.view.tone === "error" ? "alert" : "status"}
          action={e.view.actionLabel ? (
            <Button className="min-h-11" onClick={() => {
              if (e.view.action === "open_setup") onSetup();
              else if ((e.view.action === "reload" || e.view.action === "sign_in") && !capturing) window.location.reload();
              else if (e.view.action === "plug_in") clearErrors([e.code], e.track);
              else if (!capturing) void ready();
            }}>{e.view.actionLabel}</Button>
          ) : undefined}
        >{e.view.body}</Notice>
      ))}
    </div>
  ) : null;

  const discard = async () => {
    const r = rec.current, h = discardFor;
    if (!r || !h) return;
    try {
      await r.discardLocal(h.recordingId, discardWord);
      setStuck((s) => s.filter((x) => x.recordingId !== h.recordingId));
      setDiscardFor(null); setDiscardWord("");
    } catch (e) { showError(e as RecorderError); }
  };
  const heldBox = (stuck.length || others) ? (
    <div className="space-y-3">
      {stuck.map((h) => (
        <Notice key={h.recordingId} tone="warn" title={`Audio from ${h.sessionDate} has not reached the school server`} role="status"
          action={<Button variant="outline" className="min-h-11" onClick={() => { setDiscardFor(h); setDiscardWord(""); }}>Discard it...</Button>}>
          {`It has been on this laptop for ${Math.floor(h.ageMs / 86_400_000)} days (${Math.round(h.bytes / 1e6)} MB). ${h.deleteAt ? `The server gave this recording up, so it can never be sent: it is deleted from this laptop by itself on ${new Date(h.deleteAt).toLocaleDateString()}.` : "It is sent as soon as the server can take it."} Discarding it earlier: ask an admin first.`}
        </Notice>
      ))}
      {others ? (
        <Notice tone="info" title="Another teacher has unsent audio on this laptop" role="status">
          {`${others.recordings} recording${others.recordings === 1 ? "" : "s"} (${Math.round(others.bytes / 1e6)} MB) belong to another account. That teacher must sign in on this laptop to send ${others.recordings === 1 ? "it" : "them"}.`}
        </Notice>
      ) : null}
    </div>
  ) : null;

  const discardDialog = (
    <AlertDialog open={!!discardFor} onOpenChange={(o) => { if (!o) { setDiscardFor(null); setDiscardWord(""); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Throw this audio away?</AlertDialogTitle>
          <AlertDialogDescription>
            It never reached the school server, so this cannot be undone. Type DISCARD to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={discardWord} onChange={(e) => setDiscardWord(e.target.value)} aria-label="Type DISCARD to confirm" className="min-h-11" autoComplete="off" />
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">Keep it</AlertDialogCancel>
          <AlertDialogAction className="min-h-11" disabled={discardWord !== "DISCARD"} onClick={() => void discard()}>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

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
        {/* C3-b: earlier unsent audio still goes up today (the page prepared by itself), and what is stuck is shown. */}
        {upload && upload.pending > 0 ? uploadStatus(upload, online).map((l) => <Status key={l.text} line={l} live />) : null}
        {errorBox}
        {heldBox}
        {discardDialog}
      </div>
    );
  }

  const switchOff = switchQ.isSuccess && !switchOn;
  const ss = sessionState();

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
          {notDurable ? (
            <Notice tone="error" title="This browser cannot keep recordings safely" role="alert">
              A crash would lose the audio. Open this page in Google Chrome or Microsoft Edge (not a private window). Lessons are not recorded here.
            </Notice>
          ) : null}
          {errorBox}
          {heldBox}
          {stopAsked ? <Notice tone="info" title="The school stopped this recording" role="status">{stopAsked}</Notice> : null}

          <section aria-label="Microphones" className="rounded-xl border border-border p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["teacher", "room"] as TrackRole[]).map((role) => {
                const d = micDetail(devices, role, profile);
                const off = unplugged.has(role) ? { ok: false, detail: "Unplugged - plug it back in" } : lost.has(role) ? { ok: false, detail: "Still missing - plug it back in; the recorder is looking for it" } : d;
                return <MicTick key={role} label={trackName(role)} ok={off.ok} detail={off.detail} />;
              })}
            </div>
            {devices && devices.status !== "ok" ? (
              <Button variant="outline" className="min-h-11" onClick={onSetup}><Settings2 className="h-4 w-4 mr-2" aria-hidden /> Check the microphones</Button>
            ) : null}
          </section>

          {(!clicked || !soundOk) && !capturing && !SAVING.includes(state) ? (
            <div className="space-y-2">
              <Button size="lg" className="min-h-14 w-full sm:w-auto text-lg px-8" onClick={() => void ready()} disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> : <Mic className="h-5 w-5 mr-2" aria-hidden />}
                {clicked ? "Allow sound" : "Ready for today"}
              </Button>
              <p className="text-sm text-muted-foreground">{clicked
                ? "The browser has not allowed sound yet: one more click lets it. Without it the next lesson is not recorded."
                : "One click lets the browser use sound. Then recording starts by itself for each of today's lessons, on any page of this tab."}</p>
            </div>
          ) : null}

          {/* R5-1: what the session found while arming (it arms on any page; the page only reads it, every second). */}
          {ss?.refusal ? (
            <Notice tone="error" title={`This lesson will NOT be recorded: ${ss.refusal.reason}`} role="alert">
              {`${ss.refusal.className}: the school's server refused to get it ready. Use the backup recorder for this lesson.`}
            </Notice>
          ) : null}
          {!ss?.refusal && ss?.notArmed && state === "ready" ? (
            <Notice tone="warn" title="Not armed yet - retrying" role="status">
              {`The recorder could not get the lesson ready (${ss.notArmed}). It keeps trying by itself. If this stays until the lesson starts, use the backup recorder.`}
            </Notice>
          ) : null}
          {clicked && (state === "ready" || state === "armed") && lesson && !ss?.refusal && !(ss?.notArmed && state === "ready") ? (
            <Status
              live
              line={{ tone: "ok", text: state === "armed"
                ? `Armed. Recording starts by itself at ${addMinutes(lesson.startTime, -w.preRoll)}. You can open other pages; keep this tab open and the laptop plugged in.`
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
                <LevelMeter label={trackName("teacher")} clipping={clipping.teacher} level={unplugged.has("teacher") || lost.has("teacher") ? null : levels?.teacher ?? null} />
                <LevelMeter label={trackName("room")} clipping={clipping.room} level={unplugged.has("room") || lost.has("room") ? null : levels?.room ?? null} />
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
          {state === "error" ? (
            <NotRecordedNotice body={board.find((b) => b.code === "start_failed")?.view.body} />
          ) : null}
          {state === "abandoned" && !board.length ? (
            <Notice tone="warn" title="This recording did not finish" role="status">Anything recorded is kept on this laptop. An admin can see what happened.</Notice>
          ) : null}
        </>
      )}

      {banner}

      {discardDialog}

      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{stopConfirmText(lesson, tick)}</AlertDialogTitle>
            <AlertDialogDescription>What is recorded so far is kept and saved. This lesson's recording ends here.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep recording</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-foreground text-background hover:bg-foreground/90" onClick={() => void stop()}>Stop recording</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type { LessonLike };
