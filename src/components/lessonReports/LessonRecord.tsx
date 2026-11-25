import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSessionClassReport } from "@/hooks/useSessionClassReport";
import { duration, mmss } from "@/lib/lessonMonitor";

/**
 * What was recorded for a lesson, read-only, on the one lesson report page
 * (owner, 25 Nov 2026: the class report and the lesson report are one page):
 * talk-time split, a row for each child, and the transcript, whichever way it
 * arrived - the recorder's, or one the teacher pasted under Record & transcripts.
 * Each part shows only what exists for THIS lesson and is otherwise left
 * empty; nothing is made up (see src/lib/sessionClassReport.ts).
 */
const card = "rounded-hec-md border border-hec-line bg-hec-surface p-4 space-y-3";
const EMPTY = <p className="text-sm text-hec-ink-soft">Nothing recorded for this lesson.</p>;
const SHOWN = 300;

function Section({ title, staff, note, children }: { title: string; staff?: boolean; note?: string | null; children: ReactNode }) {
  return (
    <section className={card} aria-label={title}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{title}</h2>
        {staff && <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" /> Staff only</Badge>}
        {note && <span className="text-xs text-hec-ink-soft ml-auto">{note}</span>}
      </div>
      {children}
    </section>
  );
}

const Bar = ({ pct, tone = "bg-hec-ink" }: { pct: number; tone?: string }) => (
  <div className="h-2 w-full rounded-full bg-hec-sunken overflow-hidden" role="presentation">
    <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

const List = ({ items }: { items: ReactNode[] }) => (items.length ? <ul className="list-disc pl-5 text-sm space-y-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : null);


export default function LessonRecord({ sessionId, classId }: { sessionId: string; classId?: string | null }) {
  const { role } = useAuth() as any;
  const q = useSessionClassReport(sessionId);
  const [all, setAll] = useState(false);
  const d = q.data;
  const L = d?.lesson;
  const r = d?.report;
  const paste = `/teacher/recorder?tab=transcripts&lesson=${sessionId}${classId ?? L?.class_id ? `&class=${classId ?? L?.class_id}` : ""}`;

  return (
    <div className="space-y-4">
      {q.isLoading && <p className="flex items-center gap-2 text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading what was recorded…</p>}
      {q.error && <p className="text-hec-danger text-sm">What was recorded for this lesson could not be loaded. Reload the page to try again.</p>}
      {d && L && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link to={paste}>{d.transcript.kind === null ? "Paste a transcript" : "Paste another transcript"}</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/transcript-matching">Match transcripts</Link></Button>
          </div>
            <Section title="Share of talk time" staff
              note={d.talk.monitor ? "From the lesson monitor" : d.talk.share ? "Share of words, from the transcript" : d.talk.marks ? "From who's-speaking taps" : undefined}>
              {!d.talk.monitor && !d.talk.share && !d.talk.marks && EMPTY}
              {d.talk.monitor && (
                <div className="space-y-1 text-sm">
                  <p>Teacher about {d.talk.monitor.teacherPct[0]}-{d.talk.monitor.teacherPct[1]} % · others about {d.talk.monitor.othersPct[0]}-{d.talk.monitor.othersPct[1]} % of speaking time.</p>
                </div>
              )}
              {d.talk.share && (
                <div className="space-y-2">
                  {d.talk.share.teacherPct !== null && (
                    <div className="space-y-1">
                      <p className="text-sm">Teacher <b>{d.talk.share.teacherPct} %</b> · everyone else <b>{d.talk.share.othersPct} %</b> <span className="text-hec-ink-soft">of {d.talk.share.totalWords.toLocaleString()} words</span></p>
                      <Bar pct={d.talk.share.teacherPct} />
                    </div>
                  )}
                  <ul className="space-y-1">
                    {d.talk.share.speakers.slice(0, 12).map((s) => (
                      <li key={s.speaker} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-sm">
                        <span className="truncate" title={s.speaker}>{s.speaker}{s.isTeacher ? " (teacher)" : ""}</span>
                        <Bar pct={s.pct} tone={s.isTeacher ? "bg-hec-ink" : "bg-hec-leaf"} />
                        <span className="text-right tabular-nums">{s.pct} %</span>
                      </li>
                    ))}
                  </ul>
                  {d.talk.note && <p className="text-xs text-hec-ink-soft">{d.talk.note}</p>}
                </div>
              )}
              {d.talk.marks && (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2"><Mic className="h-4 w-4" aria-hidden /> By who's-speaking taps: teacher <b>{d.talk.marks.teacherPct} %</b> · children <b>{d.talk.marks.childrenPct} %</b> · whole class together <b>{d.talk.marks.chorusPct} %</b></p>
                  <p className="text-xs text-hec-ink-soft">Counted from the moments the teacher or assistant tapped who was talking; a gap of more than 90 seconds counts as 90.</p>
                </div>
              )}
            </Section>

            <Section title={`Each child${d.students.length ? ` (${d.students.length})` : ""}`} staff>
              {d.students.length === 0 && EMPTY}
              <div className="space-y-2">
                {d.students.map((s) => (
                  <div key={s.studentId ?? s.name} className="rounded-hec-md border p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.attendance && <Badge variant="outline">{s.attendance}</Badge>}
                      {s.points !== null && s.points !== 0 && <Badge variant="outline">{s.points} pts</Badge>}
                      {s.wordPct !== null && <Badge variant="secondary">{s.wordPct} % of the words</Badge>}
                      {s.tappedS !== null && <Badge variant="secondary">spoke about {duration(s.tappedS)} (taps)</Badge>}
                      {s.level && <Badge variant="outline">{s.level}</Badge>}
                      {s.errors ? <Badge variant="outline">{s.errors} errors noted</Badge> : null}
                    </div>
                    {s.contribution && <p className="text-sm">{s.contribution}</p>}
                    {s.highlight && <p className="text-sm"><span className="text-hec-ink-soft">Highlight: </span>{s.highlight}</p>}
                    {s.focusNext && <p className="text-sm"><span className="text-hec-ink-soft">Focus next: </span>{s.focusNext}</p>}
                    {s.teacherComment && <p className="text-sm"><span className="text-hec-ink-soft">Teacher: </span>{s.teacherComment}</p>}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Transcript" staff
              note={d.transcript.kind === "monitor" ? "Written by the lesson monitor. Words may be wrong or missing." : d.transcript.note ?? (d.transcript.kind === "spoken" ? "Saved transcript" : undefined)}>
              {d.transcript.kind === null && EMPTY}
              {d.transcript.kind === "monitor" && d.transcript.monitor && (
                <ul className="space-y-1 text-sm">
                  {(all ? d.transcript.monitor.lines : d.transcript.monitor.lines.slice(0, SHOWN)).map((l, i) => (
                    <li key={i} className={`flex gap-2 ${l.faded ? "opacity-50" : l.uncertain ? "text-hec-ink-soft" : ""}`}>
                      <span className="font-mono text-xs w-12 shrink-0 pt-0.5">{mmss(l.t)}</span>
                      <span>{l.teacher ? <b>T </b> : null}{l.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.transcript.kind === "spoken" && (
                <ul className="space-y-1 text-sm">
                  {(all ? d.transcript.turns : d.transcript.turns.slice(0, SHOWN)).map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-xs w-12 shrink-0 pt-0.5">{t.t !== null ? mmss(t.t) : ""}</span>
                      <span><b>{t.speaker}:</b> {t.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.transcript.kind === "text" && (
                <p className="text-sm whitespace-pre-line">{all ? d.transcript.text : d.transcript.text.slice(0, 4000)}{!all && d.transcript.text.length > 4000 ? "…" : ""}</p>
              )}
              {d.transcript.kind === "text" && d.transcript.text.length > 4000 && !all && (
                <Button variant="outline" size="sm" onClick={() => setAll(true)}>Show the whole transcript</Button>
              )}
              {(d.transcript.kind === "monitor" || d.transcript.kind === "spoken") && (d.transcript.monitor?.lines.length ?? d.transcript.turns.length) > SHOWN && !all && (
                <Button variant="outline" size="sm" onClick={() => setAll(true)}>Show the whole transcript</Button>
              )}
            </Section>


            {role === "admin" && (
              <p className="text-xs text-hec-ink-soft">
                Sources found for this lesson: approved report {d.sources.approved ? "yes" : "no"} · draft {d.sources.draft ? "yes" : "no"} · lesson monitor {d.sources.monitor ? "yes" : "no"} · saved transcript {d.sources.transcript ? "yes" : "no"} · who's-speaking taps {d.sources.taps ? "yes" : "no"}.
              </p>
            )}

        </>
      )}
    </div>
  );
}
