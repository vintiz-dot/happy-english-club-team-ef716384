import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, FileText, Loader2, Lock, Mic } from "lucide-react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSessionClassReport } from "@/hooks/useSessionClassReport";
import { lessonLabel } from "@/lib/curriculumLessons";
import { duration, mmss } from "@/lib/lessonMonitor";

/**
 * /class-report/:sessionId - opened from a lesson on the Schedule. Read-only: the
 * lesson's report, the plan, the talk-time split, a row for each child and the
 * transcript, for staff. Each part shows only what exists for THIS lesson and is
 * otherwise left empty; nothing is made up (see src/lib/sessionClassReport.ts).
 * Editing, building a report and approving stay on /teacher/lesson-report/:id.
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

export default function SessionClassReport() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { role } = useAuth() as any;
  const q = useSessionClassReport(sessionId);
  const [all, setAll] = useState(false);
  const d = q.data;
  const L = d?.lesson;
  const r = d?.report;

  return (
    <Layout title="Class report">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <Link to="/schedule" className="inline-flex items-center gap-1 text-sm text-hec-ink-soft hover:underline">
          <ArrowLeft className="h-4 w-4" /> Schedule
        </Link>

        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <h1 className="text-2xl font-semibold">{L?.class_name || "Class report"}</h1>
            <p className="text-sm text-hec-ink-soft">
              {L ? `${L.date} · ${String(L.start_time).slice(0, 5)}-${String(L.end_time).slice(0, 5)}${L.teacher_names.length ? ` · ${L.teacher_names.join(", ")}` : ""}${L.status === "Canceled" ? " · Cancelled" : ""}` : q.isLoading ? "Loading…" : "Lesson not found"}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm"><Link to="/transcript-matching">Match transcripts</Link></Button>
          {L && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/teacher/lesson-report/${L.id}`}><FileText className="h-4 w-4 mr-2" /> {d?.sources.approved ? "Open the report" : "Build or edit the report"}</Link>
            </Button>
          )}
        </header>

        {q.isLoading && <p className="flex items-center gap-2 text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" /> Loading the report…</p>}
        {q.error && <p className="text-hec-danger text-sm">This lesson's report could not be loaded. Reload the page to try again.</p>}

        {d && L && (
          <>
            <Section title="Lesson plan" note={d.plan.length ? "Course book lessons chosen for this lesson" : undefined}>
              {d.plan.length === 0 && !r?.materials.length && EMPTY}
              {d.plan.map((p) => (
                <div key={p.id} className="rounded-hec-md border p-3 space-y-1">
                  <p className="font-medium flex items-center gap-2"><BookOpen className="h-4 w-4 shrink-0" />Level {p.level} · {lessonLabel(p)}</p>
                  {p.big_question && <p className="text-xs text-hec-ink-soft">Big Question: {p.big_question}</p>}
                  <List items={p.objectives} />
                  {(p.grammar || p.vocabulary?.length > 0) && (
                    <p className="text-xs text-hec-ink-soft">{p.grammar ? `Grammar: ${p.grammar}. ` : ""}{p.vocabulary?.length ? `Words: ${p.vocabulary.join(", ")}` : ""}</p>
                  )}
                </div>
              ))}
              {r && r.materials.length > 0 && (
                <div><h3 className="text-sm font-medium">Materials used</h3><List items={r.materials} /></div>
              )}
            </Section>

            <Section title="Class report" note={d.reportNote}>
              {!r ? EMPTY : (
                <div className="space-y-3">
                  {(r.title || r.summary) && (
                    <div className="space-y-1">
                      {r.title && <p className="font-medium">{r.title}</p>}
                      {r.summary && <p className="text-sm whitespace-pre-line">{r.summary}</p>}
                    </div>
                  )}
                  {r.objectives.length > 0 && <div><h3 className="text-sm font-medium">Objectives</h3><List items={r.objectives.map((o) => (o.met ? `${o.text} (${o.met})` : o.text))} /></div>}
                  {r.chronology.length > 0 && <div><h3 className="text-sm font-medium">How the lesson went</h3><List items={r.chronology.map((c) => <span key={c.detail}><b>{c.phase}</b>{c.phase ? ": " : ""}{c.detail}</span>)} /></div>}
                  {r.taught.length > 0 && <div><h3 className="text-sm font-medium">What was taught</h3><List items={r.taught.map((t) => `${t.topic}${t.detail ? `: ${t.detail}` : ""}`)} /></div>}
                  {r.words.length > 0 && <div><h3 className="text-sm font-medium">Words</h3><p className="text-sm">{r.words.map((w) => (w.vi ? `${w.en} (${w.vi})` : w.en)).join(" · ")}</p></div>}
                  {r.structures.length > 0 && <div><h3 className="text-sm font-medium">Structures</h3><List items={r.structures.map((s) => `${s.pattern}${s.example ? ` - ${s.example}` : ""}`)} /></div>}
                  {r.activities.length > 0 && <div><h3 className="text-sm font-medium">Activities</h3><List items={r.activities.map((a) => `${a.name}${a.description ? `: ${a.description}` : ""}`)} /></div>}
                  {r.understanding && <div><h3 className="text-sm font-medium">Understanding</h3><p className="text-sm">{r.understanding}</p></div>}
                  {r.misconceptions.length > 0 && <div><h3 className="text-sm font-medium">Misconceptions</h3><List items={r.misconceptions} /></div>}
                  {r.homework.length > 0 && <div><h3 className="text-sm font-medium">Homework</h3><List items={r.homework} /></div>}
                  {r.nextSteps.length > 0 && <div><h3 className="text-sm font-medium">Next</h3><List items={r.nextSteps} /></div>}
                </div>
              )}
            </Section>

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
    </Layout>
  );
}
