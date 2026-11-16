import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, FileAudio, Loader2, Play, ShieldCheck, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  WORDING, chunkAt, duration, mmss, parseWords, toReportView, transcriptItems, type ReportView,
} from "@/lib/lessonMonitor";
import {
  downloadChunk, useDeleteReport, useFeedback, useMyLessons, useMyPilotClasses, useMyReports, useReport, useRoomChunks,
  useSetTargets, useStopPilot, type ReportRow,
} from "@/hooks/useLessonMonitor";

/**
 * /teacher/lesson-reports - the lesson monitor pilot (Option A, D-28). The
 * teacher of a pilot class reads the reports of HIS lessons, made overnight on
 * the school laptop. Read-only: the screen renders what the report says
 * (src/lib/lessonMonitor.ts) and shows every uncertainty in the design's
 * words. Nothing here is for families or children, and the database lets
 * nobody else read these rows.
 */
const card = "rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1";
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function TeacherLessonReports() {
  const classes = useMyPilotClasses();
  const reports = useMyReports();
  const [selected, setSelected] = useState<string | null>(null);
  const pilot = classes.data ?? [];

  return (
    <Layout title="Lesson reports">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <header className="flex flex-wrap items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-hec-lg bg-hec-sunken flex items-center justify-center">
            <FileAudio className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Lesson reports</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Pilot{pilot.length ? `: ${pilot.map((c) => c.class_name).join(", ")}` : ""}. What was said in your lesson, written by the school laptop overnight.
            </p>
          </div>
        </header>

        <p className="flex items-start gap-2 rounded-hec-md border border-hec-line bg-hec-sunken p-3 text-hec-small text-hec-ink-soft">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-hec-leaf" aria-hidden />
          <span>{WORDING.forYouOnly} {WORDING.deleted30}</span>
        </p>

        {classes.isLoading || reports.isLoading ? (
          <p className="text-hec-small text-hec-ink-soft flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
        ) : reports.error ? (
          <p className="rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-3 text-hec-small text-hec-danger">
            Lesson reports are not switched on yet. Ask the school's admin to apply the latest database update.
          </p>
        ) : !pilot.length && !(reports.data ?? []).length ? (
          <p className="rounded-hec-md border border-dashed border-hec-line-strong p-4 text-hec-small text-hec-ink-soft">
            The lesson monitor pilot is not on for any of your classes.
          </p>
        ) : selected ? (
          <ReportDetail id={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            <ReportList rows={reports.data ?? []} onOpen={setSelected} />
            {pilot.some((c) => c.enabled) && <TargetWords />}
            {pilot.filter((c) => c.enabled).map((c) => <StopPilot key={c.class_id} classId={c.class_id} name={c.class_name} />)}
          </>
        )}
      </div>
    </Layout>
  );
}

function ReportList({ rows, onOpen }: { rows: ReportRow[]; onOpen: (id: string) => void }) {
  if (!rows.length) {
    return <p className={cn(card, "text-hec-small text-hec-ink-soft")}>No reports yet. A report appears the morning after a recorded lesson.</p>;
  }
  return (
    <ul className="space-y-2" aria-label="Your lesson reports">
      {rows.map((r) => (
        <li key={r.id}>
          <button type="button" onClick={() => onOpen(r.id)}
            className="w-full min-h-hec-target text-left rounded-hec-lg border border-hec-line bg-hec-surface p-3 shadow-hec-1 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-hec-body text-hec-ink tabular-nums">Lesson of {r.session_date}</span>
              {!r.first_opened_at && <span className="rounded-hec-sm bg-hec-brass-fill px-2 py-0.5 text-hec-caption text-hec-on-brass">New</span>}
              {r.reading_minutes !== null && <span className="text-hec-caption text-hec-ink-soft">you noted {r.reading_minutes} min</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReportDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const q = useReport(id);
  const view = useMemo<ReportView | null>(() => (q.data ? toReportView(q.data.body) : null), [q.data]);
  const [showTranscript, setShowTranscript] = useState(false);
  const player = usePlayer(q.data?.recording_id ?? null, view?.offsetS ?? 0);

  if (q.isLoading) return <p className="text-hec-small text-hec-ink-soft flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Opening…</p>;
  if (!q.data || !view) return <p className={card}>This report is no longer there. <Button variant="link" onClick={onBack}>Back</Button></p>;

  return (
    <article className="space-y-4" aria-label={`Report for the lesson of ${q.data.session_date}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>All reports</Button>
        <h2 className="font-display text-hec-h2 text-hec-ink tabular-nums">Lesson of {q.data.session_date}</h2>
      </div>
      {!view.ok && <p className="rounded-hec-md border border-hec-warn/40 bg-hec-warn-tint p-3 text-hec-small text-hec-warn">This report is in a shape this screen does not know; some parts may be missing.</p>}

      <section className={cn(card, "space-y-3")} aria-label="Summary">
        <h3 className="font-medium text-hec-body text-hec-ink">Summary</h3>
        <ul className="list-disc pl-5 text-hec-small text-hec-ink-soft space-y-1">
          {view.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
        {view.flags.length > 0 && (
          <ul className="space-y-1" aria-label="Flags">
            {view.flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-hec-small text-hec-ink">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-hec-warn" aria-hidden />
                <span>{f.text}{f.t !== null && <PlayAt t={f.t} player={player} />}</span>
              </li>
            ))}
          </ul>
        )}
        {view.talk && (
          <div className="space-y-1">
            <p className="text-hec-small text-hec-ink">{WORDING.talkRange(view.talk.teacherPct, view.talk.othersPct)}.</p>
            <p className="text-hec-caption text-hec-ink-faint">{WORDING.others} A range, because the microphones cannot tell exactly.</p>
            <Timeline line={view.talk.timeline} />
          </div>
        )}
        <Words view={view} player={player} />
        {view.unwrittenSeconds > 0 && (
          <p className="text-hec-caption text-hec-ink-faint">About {duration(view.unwrittenSeconds)} of room speech was not written down (an estimate).</p>
        )}
        {view.uncertainCount > 0 && (
          <p className="text-hec-caption text-hec-ink-faint">{view.uncertainCount} line{view.uncertainCount === 1 ? "" : "s"} marked grey: {WORDING.uncertainLine.toLowerCase()}</p>
        )}
        <p className="text-hec-caption text-hec-ink-faint">{WORDING.readOnly}</p>
      </section>

      <Feedback row={q.data} />

      <section className={card} aria-label="Transcript">
        <button type="button" onClick={() => setShowTranscript((s) => !s)} aria-expanded={showTranscript}
          className="flex min-h-hec-target w-full items-center justify-between text-left font-medium text-hec-body text-hec-ink">
          Transcript ({view.lines.length} lines{view.durationS ? `, ${duration(view.durationS)}` : ""})
          {showTranscript ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {showTranscript && (
          <div className="mt-3 space-y-1">
            <p className="text-hec-caption text-hec-ink-faint">Grey: {WORDING.uncertainLine} Faded: {WORDING.fadedLine}{view.talk ? ` "${WORDING.teacherMic}": your microphone carried it.` : ""}</p>
            {player.error && <p className="text-hec-caption text-hec-danger">{player.error}</p>}
            <ol className="space-y-1">
              {transcriptItems(view).map((it, i) => it.kind === "band" ? (
                <li key={`b${i}`} className="rounded-hec-sm border border-dashed border-hec-line-strong px-2 py-1 text-hec-caption text-hec-ink-soft">
                  {mmss(it.band.t)}-{mmss(it.band.e)} · {WORDING.unwritten(duration(it.band.seconds))}
                </li>
              ) : (
                <li key={`l${i}`} className={cn("flex items-baseline gap-2 text-hec-small", it.line.uncertain ? "text-hec-ink-faint" : "text-hec-ink", it.line.faded && "opacity-60")}>
                  <button type="button" onClick={() => player.play(it.line.t)} aria-label={`Play ${mmss(it.line.t)}`}
                    className="shrink-0 tabular-nums text-hec-brass underline-offset-2 hover:underline min-w-[3.5rem] text-left">{mmss(it.line.t)}</button>
                  {it.line.teacher && <span className="shrink-0 font-medium" title="Your microphone carried this line">{WORDING.teacherMic}</span>}
                  <span>{it.line.text}{it.line.uncertain && <span className="sr-only"> ({WORDING.uncertainLine})</span>}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
      <audio ref={player.ref} className="sr-only" />
      <DeleteReport id={id} onDone={onBack} />
    </article>
  );
}

function Words({ view, player }: { view: ReportView; player: Player }) {
  if (!view.words.length && !view.structures.length) return <p className="text-hec-small text-hec-ink-soft">{WORDING.noTargets}</p>;
  return (
    <div className="space-y-1">
      <p className="text-hec-small text-hec-ink">Target words ({WORDING.sourceOf[view.targetSource] || "this lesson"}):</p>
      <ul className="flex flex-wrap gap-2">
        {view.words.map((w) => (
          <li key={w.word} className={cn("rounded-hec-sm px-2 py-1 text-hec-caption", w.heard ? "bg-hec-leaf-tint text-hec-leaf" : "bg-hec-sunken text-hec-ink-soft")}>
            {w.word}: {w.heard ? <>heard {w.times.slice(0, 3).map((t) => <PlayAt key={t} t={t} player={player} />)}
              {w.teacherMic !== null && w.room !== null && <span className="text-hec-ink-soft"> (your microphone {w.teacherMic}, room {w.room})</span>}</> : WORDING.notWritten}
          </li>
        ))}
      </ul>
      {view.structures.map((s) => <p key={s.name} className="text-hec-caption text-hec-ink-soft">"{s.name}": written {s.count} time{s.count === 1 ? "" : "s"}</p>)}
      <p className="text-hec-caption text-hec-ink-faint">{WORDING.notWrittenMeaning}</p>
    </div>
  );
}

function Timeline({ line }: { line: string }) {
  if (!line) return null;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-hec-sm bg-hec-sunken" role="img" aria-label="When you and others were speaking, in 10-second steps">
      {line.split("").map((c, i) => <span key={i} className={cn("h-full flex-1", c === "T" ? "bg-hec-brass" : c === "O" ? "bg-hec-leaf" : "bg-transparent")} />)}
    </div>
  );
}

type Player = ReturnType<typeof usePlayer>;
function usePlayer(recordingId: string | null, offsetS: number) {
  const ref = useRef<HTMLAudioElement>(null);
  const url = useRef<string | null>(null);
  const chunks = useRoomChunks(recordingId);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);
  const play = async (t: number) => {
    setError(null);
    const hit = chunkAt(chunks.data ?? [], offsetS, t);
    if (!hit || !ref.current) { setError("The recording of this moment is no longer kept."); return; }
    try {
      const blob = await downloadChunk(hit.path);
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(blob);
      ref.current.src = url.current;
      ref.current.currentTime = hit.at;
      await ref.current.play();
    } catch {
      setError("The recording of this moment could not be played (it may have been deleted after 30 days).");
    }
  };
  return { ref, play, error };
}

function PlayAt({ t, player }: { t: number; player: Player }) {
  return (
    <button type="button" onClick={() => player.play(t)} className="ml-1 inline-flex items-center gap-0.5 tabular-nums text-hec-brass hover:underline" aria-label={`Play ${mmss(t)}`}>
      <Play className="h-3 w-3" aria-hidden />{mmss(t)}
    </button>
  );
}

function Feedback({ row }: { row: ReportRow }) {
  const save = useFeedback();
  const [minutes, setMinutes] = useState(row.reading_minutes?.toString() ?? "");
  const [used, setUsed] = useState<string | null>(row.used_something);
  return (
    <section className={cn(card, "space-y-3")} aria-label="Your feedback">
      <h3 className="font-medium text-hec-body text-hec-ink">For the pilot (only the time and your answer are seen by the office, never the report)</h3>
      <label className="flex flex-wrap items-center gap-2 text-hec-small text-hec-ink">
        Minutes this report took you
        <Input type="number" inputMode="numeric" min={0} max={240} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-24" />
      </label>
      <fieldset className="flex flex-wrap items-center gap-2 text-hec-small text-hec-ink">
        <legend className="mb-1">Did you use anything from it?</legend>
        {[["yes", "Yes"], ["no", "No"], ["not_sure", "Not sure"]].map(([v, l]) => (
          <Button key={v} type="button" variant={used === v ? "default" : "outline"} aria-pressed={used === v} onClick={() => setUsed(v)}>{l}</Button>
        ))}
      </fieldset>
      <Button type="button" disabled={save.isPending} onClick={() => save.mutate({ id: row.id, minutes: minutes === "" ? null : Math.max(0, Math.min(240, Math.round(Number(minutes)))), used })}>
        {save.isPending ? "Saving…" : "Save"}
      </Button>
      {save.isSuccess && <p className="text-hec-caption text-hec-leaf">Saved. Thank you.</p>}
      {save.error && <p className="text-hec-caption text-hec-danger">Could not save: {(save.error as Error).message}</p>}
    </section>
  );
}

function DeleteReport({ id, onDone }: { id: string; onDone: () => void }) {
  const del = useDeleteReport();
  const [sure, setSure] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!sure ? (
        <Button variant="outline" onClick={() => setSure(true)}><Trash2 className="h-4 w-4" /> Delete this report now</Button>
      ) : (
        <>
          <span className="text-hec-small text-hec-ink">Delete it for good? It is not made again.</span>
          <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate(id, { onSuccess: onDone })}>Yes, delete</Button>
          <Button variant="outline" onClick={() => setSure(false)}>Cancel</Button>
        </>
      )}
      {del.error && <p className="text-hec-caption text-hec-danger">Could not delete: {(del.error as Error).message}</p>}
    </div>
  );
}

function TargetWords() {
  const today = new Date();
  const from = iso(today), to = iso(new Date(today.getTime() + 7 * 86400000));
  const lessons = useMyLessons(from, to, true);
  const save = useSetTargets();
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <section className={cn(card, "space-y-3")} aria-label="Target words for coming lessons">
      <h2 className="font-medium text-hec-body text-hec-ink">Target words for coming lessons (optional)</h2>
      <p className="text-hec-caption text-hec-ink-soft">Type the words you plan to teach, separated by commas. The report will say which were heard. English words only; no names.</p>
      {(lessons.data ?? []).length === 0 && <p className="text-hec-small text-hec-ink-soft">No pilot lessons in the next 7 days.</p>}
      <ul className="space-y-3">
        {(lessons.data ?? []).map((l) => {
          const value = draft[l.session_id] ?? l.words.join(", ");
          return (
            <li key={l.session_id} className="space-y-1">
              <label className="block text-hec-small text-hec-ink tabular-nums" htmlFor={`w-${l.session_id}`}>{l.class_name}, {l.lesson_date} {l.start_time.slice(0, 5)}</label>
              <div className="flex flex-wrap gap-2">
                <Input id={`w-${l.session_id}`} value={value} onChange={(e) => setDraft({ ...draft, [l.session_id]: e.target.value })} className="flex-1 min-w-[12rem]" placeholder="e.g. elephant, giraffe, zebra" />
                <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate({ sessionId: l.session_id, words: parseWords(value), structures: l.structures })}>Save</Button>
              </div>
            </li>
          );
        })}
      </ul>
      {save.error && <p className="text-hec-caption text-hec-danger">Could not save: {(save.error as Error).message}</p>}
    </section>
  );
}

function StopPilot({ classId, name }: { classId: string; name: string }) {
  const stop = useStopPilot();
  const [sure, setSure] = useState(false);
  return (
    <section className={cn(card, "space-y-2")} aria-label={`Stop the pilot for ${name}`}>
      <h2 className="font-medium text-hec-body text-hec-ink">Stop the pilot for {name}</h2>
      <p className="text-hec-caption text-hec-ink-soft">You can stop it at any time. No more reports are made until the office switches it on again. Your existing reports stay until you delete them or 30 days pass.</p>
      {!sure ? (
        <Button variant="outline" onClick={() => setSure(true)}>Stop the pilot</Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" disabled={stop.isPending} onClick={() => stop.mutate(classId)}>Yes, stop it</Button>
          <Button variant="outline" onClick={() => setSure(false)}>Cancel</Button>
        </div>
      )}
      {stop.error && <p className="text-hec-caption text-hec-danger">Could not stop: {(stop.error as Error).message}</p>}
    </section>
  );
}
