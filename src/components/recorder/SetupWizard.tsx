/**
 * One-time microphone setup, per browser. The teacher picks "My microphone"
 * (lapel receiver) and "Room microphone" (Anker S500), hears both on live
 * meters, records 10 seconds and plays it back, and the choice is saved on
 * this laptop and on the server (labels and hashes, never device ids).
 *
 * Labels only suggest; the meters and the playback decide. The engine's swap
 * measurement turns into "It looks like these are the other way round".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Mic, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  batteryLine, browserCheck, describeInputs, errorView, pairProblems, suggestRoles, swapWarning, trackName, uploadSpeedLine,
  type StatusLine,
} from "@/lib/recorderUi";
import type { DeviceProfile, InputDevice, Level, SwapMeasurement, TrackRole } from "@/lib/recorder";
import { useRecorderDeps } from "./RecorderDeps";
import type { Probe, ProbeResult } from "./engine";
import { HelpPanels } from "./HelpPanels";
import { LevelMeter, Notice, Status } from "./pieces";

const STEPS = ["Before you start", "Choose the microphones", "Check the levels", "Test recording", "Internet", "Save"] as const;
const TEST_SECONDS = 10;

function errOf(e: unknown) {
  const code = (e as any)?.code ?? "internal";
  return errorView(code, (e as any)?.refusal ?? null);
}

export function SetupWizard({ userId, onDone, onCancel }: { userId: string; onDone: (p: DeviceProfile) => void; onCancel?: () => void }) {
  const { engine, client } = useRecorderDeps();
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<InputDevice[] | null>(null);
  const [permErr, setPermErr] = useState<ReturnType<typeof errOf> | null>(null);
  const [busy, setBusy] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [battery, setBattery] = useState<StatusLine | null>(null);
  const probe = useRef<Probe | null>(null);
  const [probeErr, setProbeErr] = useState<ReturnType<typeof errOf> | null>(null);
  const [levels, setLevels] = useState<{ teacher: Level; room: Level } | null>(null);
  const [swap, setSwap] = useState<SwapMeasurement | null>(null);
  const [notHonoured, setNotHonoured] = useState<Record<TrackRole, string[]> | null>(null);
  const [recording, setRecording] = useState<number | null>(null);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const browser = useMemo(() => browserCheck(engine.userAgent()), [engine]);
  useEffect(() => { engine.battery().then((b) => setBattery(batteryLine(b))).catch(() => {}); }, [engine]);
  // Move focus to the step heading so keyboard and screen-reader users follow along.
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const refresh = useCallback(async () => {
    const list = await engine.listInputs();
    setInputs(list);
    return list;
  }, [engine]);

  useEffect(() => engine.watchDevices((list) => setInputs(list)), [engine]);

  const allow = async () => {
    setBusy(true); setPermErr(null);
    try {
      await engine.requestPermission();
      const list = await refresh();
      const s = suggestRoles(list);
      setTeacherId((v) => v ?? s.teacher);
      setRoomId((v) => v ?? s.room);
      setStep(1);
    } catch (e: any) {
      setPermErr(e?.name === "NotAllowedError" || e?.code === "permission_denied" ? errorView("permission_denied") : errOf(e));
    } finally { setBusy(false); }
  };

  // Both microphones stay open while steps 2-3 show (moving between them does
  // not reopen); a new pair or "Try again" reopens; leaving closes them.
  const listening = step === 2 || step === 3;
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!listening || !teacherId || !roomId) return;
    let cancelled = false;
    let mine: Probe | null = null;
    setProbeErr(null); setLevels(null); setSwap(null);
    engine.openProbe({ teacher: teacherId, room: roomId }).then((p) => {
      if (cancelled) { void p.close(); return; }
      mine = p; probe.current = p;
      setNotHonoured(p.notHonoured);
      p.onLevel(setLevels);
    }).catch((e) => { if (!cancelled) setProbeErr(errOf(e)); });
    const iv = setInterval(() => { if (mine) setSwap(mine.swapSoFar()); }, 1000);
    return () => {
      cancelled = true; clearInterval(iv);
      if (mine) { if (probe.current === mine) probe.current = null; void mine.close().catch(() => {}); }
    };
  }, [listening, teacherId, roomId, engine, attempt]);
  const openProbe = () => setAttempt((n) => n + 1);
  const closeProbe = async () => {
    const p = probe.current; probe.current = null;
    if (p) await p.close().catch(() => {});
  };

  const swapRoles = () => {
    setResult(null);
    setTeacherId(roomId); setRoomId(teacherId);
  };

  const runTest = async () => {
    if (!probe.current) return;
    setResult(null); setRecording(0);
    try {
      const r = await probe.current.record(TEST_SECONDS, (s) => setRecording(s));
      setResult(r); setSwap(r.swap.verdict === "not_enough_speech" ? probe.current?.swapSoFar() ?? r.swap : r.swap);
    } catch (e) { setProbeErr(errOf(e)); }
    finally { setRecording(null); }
  };

  const rows = useMemo(() => describeInputs(inputs ?? []), [inputs]);
  const problems = inputs ? pairProblems(inputs, teacherId, roomId) : [];
  const warning = swapWarning(swap);
  const connection = (navigator as any)?.connection as { downlink?: number } | undefined;

  const save = async () => {
    const t = rows.find((r) => r.device.deviceId === teacherId)?.device;
    const r = rows.find((x) => x.device.deviceId === roomId)?.device;
    if (!t || !r) return;
    setBusy(true); setSaveErr(null);
    const profile: DeviceProfile = {
      version: 1, installId: engine.getInstallId(), userId,
      teacher: { deviceId: t.deviceId, groupId: t.groupId, label: t.label },
      room: { deviceId: r.deviceId, groupId: r.groupId, label: r.label },
      checks: {
        swap_verdict: swap?.verdict ?? null, swap_median_db: swap?.medianTeacherMinusRoomDb ?? null,
        test_recorded: !!result, not_honoured: notHonoured ?? {}, browser: browser.name,
        upload_mbps: null, upload_measured: "at the first lesson",
      },
      verifiedAt: new Date().toISOString(),
    };
    engine.saveProfile(profile);
    try {
      const id = await engine.saveProfileToServer(client, profile);
      const withId = { ...profile, serverId: id };
      engine.saveProfile(withId);
      await closeProbe();
      onDone(withId);
    } catch (e: any) {
      setSaveErr("Saved on this laptop, but the school server did not answer. The recorder will still work; try saving again when the internet is back.");
    } finally { setBusy(false); }
  };

  const canNext = step === 0 ? false : step === 1 ? problems.length === 0 : step === 2 ? !!levels && !probeErr : step === 3 ? !!result : true;

  return (
    <section aria-labelledby="wiz-h" className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
        <h2 id="wiz-h" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">{STEPS[step]}</h2>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label={`Setup step ${step + 1} of ${STEPS.length}`} className="h-2" />
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-base">You do this once on this laptop. It takes about five minutes. You need:</p>
          <ul className="list-disc pl-6 space-y-1 text-base">
            <li>your clip-on lapel microphone and its small USB receiver,</li>
            <li>the round Anker PowerConf S500 and its USB cable.</li>
          </ul>
          {browser.message ? <Notice tone="warn" title={`You are using ${browser.name}`}>{browser.message}</Notice> : <Status line={{ tone: "ok", text: `${browser.name} works for recording.` }} />}
          {battery ? <Status line={battery} /> : null}
          <HelpPanels only={["lapel", "s500", "ankerApp", "windows"]} />
          {permErr ? (
            <Notice tone={permErr.tone} title={permErr.title} role="alert">{permErr.body}</Notice>
          ) : null}
          <Button size="lg" className="min-h-12 w-full sm:w-auto text-base" onClick={allow} disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> : <Mic className="h-5 w-5 mr-2" aria-hidden />}
            Allow the microphones and continue
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <p className="text-base">The list shows every microphone this laptop can hear. We guessed from the names; check them.</p>
          {(["teacher", "room"] as TrackRole[]).map((role) => (
            <fieldset key={role} className="space-y-2">
              <legend className="font-semibold text-lg mb-1">{role === "teacher" ? "Which is your microphone (the lapel)?" : "Which is the room microphone (the S500)?"}</legend>
              <RadioGroup value={(role === "teacher" ? teacherId : roomId) ?? ""} onValueChange={(v) => (role === "teacher" ? setTeacherId(v) : setRoomId(v))} className="space-y-2">
                {rows.map((r) => {
                  const id = `${role}-${r.device.deviceId}`;
                  return (
                    <Label key={id} htmlFor={id} className="flex items-start gap-3 rounded-xl border border-border p-3 min-h-12 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <RadioGroupItem id={id} value={r.device.deviceId} className="mt-1" />
                      <span className="space-y-1 min-w-0">
                        <span className="block text-base font-medium break-words">{r.device.label || "Unnamed microphone"}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {r.s500 ? <Badge variant="secondary">Looks like the Anker S500</Badge> : null}
                          {r.hint === "teacher" ? <Badge variant="secondary">Looks like a lapel receiver</Badge> : null}
                          {r.bluetooth ? <Badge variant="outline" className="border-destructive text-foreground">Bluetooth - use USB instead</Badge> : null}
                          {r.builtIn ? <Badge variant="outline">The laptop's own microphone</Badge> : null}
                        </span>
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </fieldset>
          ))}
          {rows.length < 2 ? (
            <Notice tone="warn" title="Fewer than two microphones found">Plug in both by USB, wait five seconds, then press Look again.</Notice>
          ) : null}
          {problems.length ? (
            <div className="space-y-1" role="status">{problems.map((p) => <Status key={p} line={{ tone: "warn", text: p }} />)}</div>
          ) : null}
          <Button variant="outline" className="min-h-11" onClick={() => void refresh()}><RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Look again</Button>
          <HelpPanels only={["s500"]} />
        </div>
      )}

      {(step === 2 || step === 3) && probeErr ? (
        <Notice tone={probeErr.tone} title={probeErr.title} role="alert" action={<Button className="min-h-11" onClick={() => void openProbe()}>{probeErr.actionLabel ?? "Try again"}</Button>}>{probeErr.body}</Notice>
      ) : null}

      {step === 2 && !probeErr && (
        <div className="space-y-5">
          <p className="text-base">Wear the lapel microphone and speak normally for a few seconds, as if you were teaching. <strong>My microphone</strong> should move more than <strong>Room microphone</strong>. Then clap near the S500: Room microphone should jump.</p>
          <div className="space-y-4 rounded-xl border border-border p-4">
            <LevelMeter label={trackName("teacher")} level={levels?.teacher ?? null} device={rows.find((r) => r.device.deviceId === teacherId)?.device.label} />
            <LevelMeter label={trackName("room")} level={levels?.room ?? null} device={rows.find((r) => r.device.deviceId === roomId)?.device.label} />
          </div>
          {!levels ? <Status line={{ tone: "info", text: "Opening the microphones..." }} live /> : null}
          {warning ? (
            <Notice tone="warn" title={warning} role="alert" action={<Button variant="outline" className="min-h-11" onClick={() => void swapRoles()}><ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden /> Swap them</Button>}>
              The room microphone was louder while you spoke. If the lapel is on your collar, press Swap them.
            </Notice>
          ) : swap?.verdict === "looks_right" ? <Status line={{ tone: "ok", text: "The microphones are the right way round." }} live /> : null}
          {notHonoured && (notHonoured.teacher.length || notHonoured.room.length) ? (
            <Notice tone="info" title="The browser kept some sound settings">Recording works. This is noted with every recording.</Notice>
          ) : null}
        </div>
      )}

      {step === 3 && !probeErr && (
        <div className="space-y-5">
          <p className="text-base">Press the button and talk for {TEST_SECONDS} seconds. Then listen to both. Your voice should be clear on My microphone; the room should sound like the room.</p>
          <Button size="lg" className="min-h-12 text-base" onClick={() => void runTest()} disabled={recording !== null || !levels}>
            {recording !== null ? <><Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> Recording... {Math.ceil(TEST_SECONDS - recording)} s</> : <><Mic className="h-5 w-5 mr-2" aria-hidden /> {result ? "Record again" : `Record ${TEST_SECONDS} seconds`}</>}
          </Button>
          {recording !== null ? <Progress value={(recording / TEST_SECONDS) * 100} aria-label="Test recording progress" className="h-2" /> : null}
          {result ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["teacher", "room"] as TrackRole[]).map((role) => (
                <div key={role} className="rounded-xl border border-border p-4 space-y-2">
                  <p className="font-semibold">{trackName(role)}</p>
                  <audio controls src={result[role].url} className="w-full" aria-label={`Play the ${trackName(role)} test`} />
                  {result[role].peakDb < -50 ? <Status line={{ tone: "warn", text: "Very quiet - is it switched on?" }} /> : null}
                </div>
              ))}
            </div>
          ) : null}
          {result && warning ? (
            <Notice tone="warn" title={warning} role="alert" action={<Button variant="outline" className="min-h-11" onClick={() => void swapRoles()}><ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden /> Swap them</Button>} />
          ) : null}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-base">Recordings are saved to the school's server in small pieces while you teach.</p>
          <Status line={uploadSpeedLine(null)} />
          <p className="text-sm text-muted-foreground">
            There is no test file to send: the server only accepts audio from a real lesson. During your first lesson the screen shows the measured speed.
            {connection?.downlink ? ` The browser's own guess for this connection is about ${connection.downlink} Mbit/s.` : ""}
          </p>
          <Status line={{ tone: "info", text: "If the internet drops, recording continues and the pieces wait on this laptop." }} />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4 space-y-2">
            <p><span className="text-muted-foreground">My microphone:</span> <span className="font-medium break-words">{rows.find((r) => r.device.deviceId === teacherId)?.device.label}</span></p>
            <p><span className="text-muted-foreground">Room microphone:</span> <span className="font-medium break-words">{rows.find((r) => r.device.deviceId === roomId)?.device.label}</span></p>
          </div>
          {battery?.tone === "warn" ? <Status line={battery} /> : null}
          {browser.message ? <Status line={{ tone: "warn", text: browser.message }} /> : null}
          {saveErr ? <Notice tone="warn" title="Saved on this laptop only" role="alert">{saveErr}</Notice> : null}
          <Button size="lg" className="min-h-12 text-base w-full sm:w-auto" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 mr-2 motion-safe:animate-spin" aria-hidden /> : null} Save and finish
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        {step > 0 ? (
          <Button variant="outline" className="min-h-11" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="h-4 w-4 mr-2" aria-hidden /> Back</Button>
        ) : onCancel ? (
          <Button variant="ghost" className="min-h-11" onClick={onCancel}>Cancel</Button>
        ) : null}
        {step > 0 && step < STEPS.length - 1 ? (
          <Button className="min-h-11 ml-auto" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>Next <ArrowRight className="h-4 w-4 ml-2" aria-hidden /></Button>
        ) : null}
      </div>
    </section>
  );
}
