// The Plays tab of Lesson Decks: the unit's class plays, each fitted to the children
// in the room now (castPlay), with the cast on screen, a projected script and
// printed teacher and student copies. A play EXTENDS a lesson: its minutes are on
// top of the lesson's, never taken from it. docs/CLASS_PLAYS.md has the rules.
//
// The cast follows the class as it is: today's attendance when it has been taken,
// otherwise the children enrolled now. useLiveRoster rereads it the moment an
// enrolment or an attendance mark changes (Supabase realtime), every minute, and
// when the window regains focus, so a child who moves class is recast at once.
// Names go on screen and on paper only; nothing about a child is saved.
import { useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { castPlay, studentPlay, unitWord, type Cast, type Play } from "@/lib/lessonDecks/plays";
import { actorName, playMaterial } from "@/lib/lessonDecks/playDoc";
import { castFor } from "@/lib/lessonDecks/names";
import type { Audience } from "@/lib/lessonDecks/audience";
import { downloadBlob, tryMakeDocument } from "@/lib/hecDocs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drama, Minus, Plus, Printer, RotateCcw, Shuffle, Play as PlayIcon, X, Timer, Pause, ChevronLeft, ChevronRight, Users } from "lucide-react";

/** Reread the class roster as soon as an enrolment or attendance mark changes, every minute, and on focus. */
export function useLiveRoster(classId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!classId) return;
    const key = ["lesson-deck-roster", classId];
    const reread = () => void qc.invalidateQueries({ queryKey: key });
    const channel = supabase
      .channel(`plays-roster-${classId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments", filter: `class_id=eq.${classId}` }, reread)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, reread)
      .subscribe();
    const every = window.setInterval(reread, 60_000);
    window.addEventListener("focus", reread);
    return () => {
      window.clearInterval(every);
      window.removeEventListener("focus", reread);
      void supabase.removeChannel(channel);
    };
  }, [classId, qc]);
}

/** n names in a shuffled order (seeded); past the roster, stand-ins the teacher can fill. */
function namesFor(n: number, roster: string[], seed: number): string[] {
  const order = roster.length ? castFor(roster.length, roster, seed) : [];
  return Array.from({ length: n }, (_, i) => order[i] ?? (roster.length ? `Extra ${i - order.length + 1}` : `Student ${String.fromCharCode(65 + (i % 26))}`));
}

const STOP = new Set("a an the is am are was were be to of and or but in on at for with it its it's i you he she we they me my your his her our their this that these those do does did don't doesn't can can't will would have has had not no yes so very too".split(" "));
/** Round 2 of a rehearsal: only the words that carry the meaning; the children rebuild the grammar. */
export function keyWords(text: string): string {
  return text.split(/(\s+)/).map((w) => (/\s/.test(w) || !STOP.has(w.toLowerCase().replace(/[^a-z']/g, "")) ? w : "_")).join("").replace(/(?:_\s*){2,}/g, "_ ");
}

function printFallback(title: string, markup: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("\n");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "")}</title>${styles}<style>@page{size:A4;margin:12mm}body{background:#fff}</style></head><body>${markup}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function playMarkup(play: Play, cast: Cast, names: string[], audience: Audience) {
  const p = audience === "student" ? studentPlay(play) : play;
  return renderToStaticMarkup(
    <div className="bg-white p-8 text-gray-900">
      <h1 className="text-2xl font-semibold">{p.title} · Class play · {audience === "teacher" ? "Teacher copy" : "Student copy"}</h1>
      <p className="mb-2">{p.summary}</p>
      <table className="mb-4 w-full border-collapse text-sm">
        <thead><tr><th className="border p-1 text-left">Actor</th><th className="border p-1 text-left">Part</th><th className="border p-1">Lines</th></tr></thead>
        <tbody>{cast.byActor.map((a) => <tr key={a.actor}><td className="border p-1">{actorName(names, a.actor)}</td><td className="border p-1">{a.parts.join(" + ")}</td><td className="border p-1 text-center">{a.lines}</td></tr>)}</tbody>
      </table>
      {cast.scenes.map((s, i) => (
        <section key={i} className="mb-4">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          {s.lines.map((l, k) => l.kind === "stage"
            ? <p key={k} className="italic text-gray-600">({l.text})</p>
            : <p key={k}><strong>{l.actors.length > 3 ? l.labels.join(", ") : `${l.actors.map((a) => actorName(names, a)).join(" + ")} (${l.labels.join(", ")})`}:</strong> {l.text}{l.do ? <em className="text-gray-600"> [{l.do}]</em> : null}</p>)}
        </section>
      ))}
      {audience === "teacher" && (
        <section>
          <h2 className="text-xl font-semibold">Rehearsal</h2>
          <ol className="list-decimal pl-6">{p.rehearsal.map((r, i) => <li key={i}><strong>{r.round}</strong> ({r.minutes} min): {r.how}</li>)}</ol>
          <h3 className="mt-2 font-semibold">Fix between rounds</h3>
          <ul className="list-disc pl-6">{p.focusOnForm.map((f, i) => <li key={i}>{f}</li>)}</ul>
          {p.teacherNote && <p className="mt-2"><strong>Teacher note:</strong> {p.teacherNote}</p>}
          {p.encore && <p className="mt-2"><strong>Encore:</strong> {p.encore}</p>}
        </section>
      )}
    </div>,
  );
}

export async function printPlay(play: Play, cast: Cast, names: string[], audience: Audience, course?: string) {
  const p = audience === "student" ? studentPlay(play) : play;
  const doc = await tryMakeDocument("lesson-material", playMaterial(p, cast, names, audience, course) as unknown as Record<string, unknown>, { variant: audience });
  if (doc) { downloadBlob(doc.blob, doc.filename); return; }
  printFallback(`${play.title} · ${audience}`, playMarkup(play, cast, names, audience));
}

type Props = {
  plays: Play[]; // this class's plays, every unit of its course
  roster: string[]; // the children in the room now
  rosterNote: string;
  unit: number | null; // the unit open in the pacing guide, if it is this course's
  focusId?: string | null; // a play to open (from a lesson row's Play button)
  course?: string;
};

export function PlaysTab({ plays, roster, rosterNote, unit, focusId, course }: Props) {
  const units = useMemo(() => [...new Set(plays.map((p) => p.unit))].sort((a, b) => a - b), [plays]);
  const focusUnit = plays.find((p) => p.id === focusId)?.unit;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => { setShown(focusUnit ?? (unit !== null && units.includes(unit) ? unit : units[0] ?? null)); }, [focusUnit, unit, units.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!plays.length) {
    return (
      <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-6 text-center text-hec-ink-soft">
        <Drama className="mx-auto mb-2 h-7 w-7" />No class plays for this class's book yet.
      </div>
    );
  }
  const word = unitWord(plays[0].course);
  const list = plays.filter((p) => p.unit === shown);
  return (
    <div className="space-y-4">
      <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
        <h3 className="font-display text-hec-h3 text-hec-ink flex items-center gap-2"><Drama className="h-5 w-5" />Class plays</h3>
        <p className="text-hec-small text-hec-ink-soft">
          Each play extends a lesson: its minutes are added on top, so choose whether to run it today or in the next lesson. The cast fits the class as it is now
          ({rosterNote}) and changes as soon as a child joins, leaves or is marked absent.
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {units.map((u) => (
            <Button key={u} size="sm" variant={u === shown ? "default" : "outline"} onClick={() => setShown(u)}>
              {u === 0 ? "Intro" : `${word} ${u}`} <span className="ml-1 opacity-70">({plays.filter((p) => p.unit === u).length})</span>
            </Button>
          ))}
        </div>
      </div>
      {list.map((p) => <PlayCard key={p.id} play={p} roster={roster} open={p.id === focusId} course={course} />)}
    </div>
  );
}

function PlayCard({ play, roster, open, course }: { play: Play; roster: string[]; open?: boolean; course?: string }) {
  const [manual, setManual] = useState<number | null>(null);
  const [seed, setSeed] = useState(1);
  const [stage, setStage] = useState(false);
  const n = manual ?? (roster.length || 8);
  const cast = useMemo(() => castPlay(play, n), [play, n]);
  const names = useMemo(() => namesFor(n, roster, seed), [n, roster, seed]);
  return (
    <div id={`play-${play.id}`} className={`rounded-hec-lg border bg-hec-surface p-4 shadow-hec-1 ${open ? "border-amber-400 ring-2 ring-amber-200" : "border-hec-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg text-hec-ink">{play.title}</p>
          <p className="text-hec-small text-hec-ink-soft">After Lesson {play.afterLesson} · <strong>+{play.minutes} min</strong> on top of the lesson · ages {play.band}</p>
          <p className="mt-1 text-hec-ink">{play.summary}</p>
          <p className="mt-1 text-hec-small text-hec-ink-soft">Words: {play.targets.words.join(", ")} · Grammar: {play.targets.grammar.join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" onClick={() => setStage(true)}><PlayIcon className="h-4 w-4" />Present</Button>
          <Button size="sm" variant="outline" onClick={() => void printPlay(play, cast, names, "teacher", course)} title="Script with names, rehearsal rounds and the fixes between them"><Printer className="h-4 w-4" />Teacher</Button>
          <Button size="sm" variant="outline" onClick={() => void printPlay(play, cast, names, "student", course)} title="Script with names only"><Printer className="h-4 w-4" />Student</Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Users className="h-4 w-4 text-hec-ink-soft" />
        <span className="text-hec-small text-hec-ink">Actors</span>
        <Button size="icon" variant="outline" className="h-7 w-7" aria-label="One actor fewer" onClick={() => setManual(Math.max(1, n - 1))}><Minus className="h-3 w-3" /></Button>
        <span className="w-6 text-center font-semibold tabular-nums">{n}</span>
        <Button size="icon" variant="outline" className="h-7 w-7" aria-label="One actor more" onClick={() => setManual(Math.min(30, n + 1))}><Plus className="h-3 w-3" /></Button>
        {manual !== null && manual !== roster.length && roster.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setManual(null)}><RotateCcw className="h-3 w-3" />Back to the class ({roster.length})</Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setSeed((s) => s + 1)}><Shuffle className="h-3 w-3" />New parts</Button>
        {cast.doubled && <Badge variant="secondary">Small class: some children read two parts</Badge>}
        {cast.merged.length > 0 && <span className="text-xs text-hec-ink-soft">Read by others today: {cast.merged.map((m) => `${m.from} → ${m.into}`).join(", ")}</span>}
        {cast.cut.length > 0 && <span className="text-xs text-hec-ink-soft">Left out today: {cast.cut.join(", ")}</span>}
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {cast.byActor.map((a) => (
          <div key={a.actor} className="rounded border border-hec-line px-2 py-1 text-hec-small">
            <span className="font-medium text-hec-ink">{actorName(names, a.actor)}</span>
            <span className="text-hec-ink-soft"> · {a.parts.join(" + ")} · {a.lines} line{a.lines === 1 ? "" : "s"}</span>
          </div>
        ))}
      </div>
      {stage && <PlayStage play={play} cast={cast} names={names} onClose={() => setStage(false)} />}
    </div>
  );
}

type Mode = "script" | "keys" | "own";
const MODES: { mode: Mode; label: string; title: string }[] = [
  { mode: "script", label: "Script", title: "Every line in full" },
  { mode: "keys", label: "Key words", title: "Only the words that carry the meaning: the children rebuild the sentences" },
  { mode: "own", label: "Own words", title: "Who speaks and what they do; the children say it in their own words" },
];

/** What a rehearsal round shows, from its name; null (a fix, a discussion) keeps the screen as it is. */
export function roundMode(round: string): Mode | null {
  const r = round.toLowerCase();
  if (/key/.test(r)) return "keys";
  if (/own words|no script|without|from memory|improv|picture|number cards|the new|a new|swap|verdict/.test(r)) return "own";
  if (/fix|feedback|discuss/.test(r)) return null;
  return "script";
}

/** The play projected scene by scene, with the rehearsal round timers. */
export function PlayStage({ play, cast, names, onClose }: { play: Play; cast: Cast; names: string[]; onClose: () => void }) {
  const [scene, setScene] = useState(0);
  const [mode, setMode] = useState<Mode>("script");
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || left === null || left <= 0) { if (left !== null && left <= 0) setRunning(false); return; }
    const t = setTimeout(() => setLeft((l) => (l ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "PageDown") setScene((s) => Math.min(cast.scenes.length - 1, s + 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setScene((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cast.scenes.length, onClose]);
  const sc = cast.scenes[scene];
  const mm = left !== null ? `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, "0")}` : "";
  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-hec-paper" role="dialog" aria-label={play.title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hec-line bg-hec-surface px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-hec-ink">{play.title} · class play (+{play.minutes} min)</p>
          <p className="truncate text-xs text-hec-ink-soft">{cast.actors} actors · {sc.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {MODES.map((m) => <Button key={m.mode} size="sm" variant={mode === m.mode ? "default" : "outline"} title={m.title} onClick={() => setMode(m.mode)}>{m.label}</Button>)}
          {play.rehearsal.map((r, k) => (
            <Button key={k} size="sm" variant="ghost" title={r.how} onClick={() => { setLeft(r.minutes * 60); setRunning(true); const m = roundMode(r.round); if (m) setMode(m); }}>
              <Timer className="h-3 w-3" />{k + 1}. {r.round}
            </Button>
          ))}
          {left !== null && (
            <Button size="sm" variant={left <= 0 ? "destructive" : "outline"} onClick={() => setRunning((x) => !x)}>
              {running ? <Pause className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}{left <= 0 ? "Time!" : mm}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close (Esc)"><X className="h-5 w-5" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-3 p-6 md:p-10">
          <h2 className="font-display text-3xl text-hec-ink">{sc.title}</h2>
          {sc.lines.map((l, k) => l.kind === "stage" ? (
            <p key={k} className="text-xl italic text-hec-ink-soft">({l.text})</p>
          ) : (
            <div key={k} className="rounded-hec-lg border border-hec-line bg-hec-surface px-4 py-2">
              <p className="text-base font-semibold text-amber-700">
                {l.actors.length > 3 ? l.labels.join(", ") : `${l.actors.map((a) => actorName(names, a)).join(" + ")} · ${l.labels.join(", ")}`}
              </p>
              {mode !== "own" && <p className="text-2xl leading-snug text-hec-ink md:text-3xl">{mode === "keys" ? keyWords(l.text) : l.text}</p>}
              {l.do && <p className="text-lg text-hec-ink-soft">↳ {l.do}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-hec-line bg-hec-surface px-4 py-2 pr-20">
        <Button variant="outline" disabled={scene === 0} onClick={() => setScene((s) => s - 1)}><ChevronLeft className="h-5 w-5" />Back</Button>
        <span className="text-sm tabular-nums text-hec-ink">Scene {scene + 1} / {cast.scenes.length}</span>
        <Button disabled={scene === cast.scenes.length - 1} onClick={() => setScene((s) => s + 1)}>Next<ChevronRight className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
