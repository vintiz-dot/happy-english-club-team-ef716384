import { createContext, useContext } from "react";
import { ExamSlide } from "./ExamSlide";
import type { Assessment, BookRef, CreativeTask, Deck, Mode, ScriptLine, Slide, Tier, TierLevel, Unit } from "@/lib/lessonDecks/types";
import type { FlipTarget } from "@/lib/lessonDecks/bookPages";
import { RUBRIC, PEER_STEPS } from "@/lib/lessonDecks/ieltsRubric";
import type { Audience } from "@/lib/lessonDecks/audience";
import { BookOpen, Clock, Users, User, UsersRound, Presentation, Mic, PenLine, Video, Lightbulb, AlertTriangle, CheckCircle2, Home, Target, Sparkles, Volume2, Headphones, ExternalLink, FileText, ClipboardCheck, Trophy, Rocket, Scale, Play, Turtle } from "lucide-react";

/**
 * What a slide may use besides its own content. The player fills all of it; a
 * printed deck gets only `unit` and `deck` (no buttons on paper).
 */
export type SlideCtx = {
  unit?: Unit;
  deck?: Deck;
  speak?: (text: string) => void;
  speakScript?: (lines: ScriptLine[], opts?: { slow?: boolean }) => void;
  bookTarget?: (ref: BookRef) => FlipTarget;
  openBook?: (ref: BookRef) => void;
  openWorksheet?: (id: string, audience: Audience) => void;
  // Set only on paper (audience.ts). "teacher": answers, scripts and notes printed
  // open; "student": none of them (the data is stripped first as well). Unset on
  // screen, where answers stay folded until the teacher opens them.
  audience?: Audience;
};
export const SlideContext = createContext<SlideCtx>({});

/** Answers for the teacher: folded on screen, open on the teacher's copy, absent on the student's. */
function TeacherAnswers({ items, label = "Answers (teacher)" }: { items: { answer: string; why?: string }[]; label?: string }) {
  const { audience } = useContext(SlideContext);
  if (audience === "student" || !items.some((i) => i.answer)) return null;
  const list = <ol className="list-decimal pl-6">{items.map((it, i) => <li key={i}>{it.answer}{it.why ? <span className="text-hec-ink-soft"> ({it.why})</span> : null}</li>)}</ol>;
  if (audience === "teacher") return <div className="mt-2 rounded-xl border border-dashed border-hec-line p-2 text-base text-hec-ink"><p className="font-semibold">{label}</p>{list}</div>;
  return (
    <details className="mt-2 text-base text-hec-ink-soft print:hidden">
      <summary className="cursor-pointer">{label}</summary>
      {list}
    </details>
  );
}

const MODE: Record<Mode, { label: string; Icon: typeof Users }> = {
  whole: { label: "Whole class", Icon: Presentation },
  pairs: { label: "Pairs", Icon: Users },
  groups: { label: "Groups", Icon: UsersRound },
  solo: { label: "On your own", Icon: User },
};

function Chip({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "accent" | "warn" }) {
  const cls =
    tone === "accent"
      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
      : tone === "warn"
        ? "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100"
        : "bg-hec-paper text-hec-ink border border-hec-line";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cls}`}>{children}</span>;
}

/** A small speaker button; nothing at all when speech is not available (print). */
function Say({ text, label = "Listen" }: { text: string; label?: string }) {
  const { speak } = useContext(SlideContext);
  if (!speak) return null;
  return (
    <button type="button" onClick={() => speak(text)} title={`${label}: ${text}`} aria-label={`${label}: ${text}`}
      className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 align-middle text-sky-800 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-100 print:hidden">
      <Volume2 className="h-4 w-4" />
    </button>
  );
}

function BookChip({ b }: { b: BookRef }) {
  const { bookTarget, openBook } = useContext(SlideContext);
  const t = bookTarget?.(b);
  return (
    <>
      <Chip tone="accent">
        <BookOpen className="h-4 w-4" />
        {b.book === "SB" ? "Student Book" : "Workbook"} p. {b.pages}
        {b.activities?.length ? ` · Activity ${b.activities.join(", ")}` : ""}
      </Chip>
      {b.track && (
        <Chip><Headphones className="h-4 w-4" />Track {b.track} <span className="font-normal text-hec-ink-soft">(play from your own copy)</span></Chip>
      )}
      {t && openBook && (
        t.ok ? (
          <button type="button" onClick={() => openBook(b)} title={t.note ?? `Opens the class flipbook at ${t.label}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white hover:bg-amber-600 print:hidden">
            <ExternalLink className="h-4 w-4" />Show {t.label}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-hec-line px-3 py-1 text-sm text-hec-ink-soft print:hidden" title={"reason" in t ? t.reason : ""}>
            <BookOpen className="h-4 w-4" />{"reason" in t ? t.reason : ""}
          </span>
        )
      )}
    </>
  );
}

function Meta({ mode, minutes, book, tag }: { mode?: Mode; minutes?: number; book?: BookRef; tag?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tag && <Chip>{tag}</Chip>}
      {mode && (() => { const { label, Icon } = MODE[mode]; return <Chip><Icon className="h-4 w-4" />{label}</Chip>; })()}
      {typeof minutes === "number" && <Chip><Clock className="h-4 w-4" />{minutes} min</Chip>}
      {book && <BookChip b={book} />}
    </div>
  );
}

function H({ children, Icon }: { children: React.ReactNode; Icon?: typeof Users }) {
  return (
    <h2 className="font-display text-3xl md:text-5xl font-semibold text-hec-ink leading-tight flex items-start gap-3">
      {Icon && <Icon className="h-9 w-9 md:h-12 md:w-12 shrink-0 text-amber-600 mt-1" />}
      <span>{children}</span>
    </h2>
  );
}

const List = ({ items, ordered, say }: { items: string[]; ordered?: boolean; say?: boolean }) => {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-3 text-xl md:text-2xl text-hec-ink ${ordered ? "list-decimal" : "list-disc"} pl-8`}>
      {items.map((s, i) => <li key={i} className="leading-snug">{s}{say && <Say text={s} />}</li>)}
    </Tag>
  );
};

/** The supplementary materials tied to this slide: Twinkl links and the school's own worksheets. */
function Extras({ slide }: { slide: Slide }) {
  const { deck, unit, openWorksheet, audience } = useContext(SlideContext);
  const title = "title" in slide ? slide.title : undefined;
  if (!title || !deck || audience === "student") return null;
  const links = (deck.resources ?? []).filter((r) => r.slide === title);
  const sheets = (unit?.worksheets ?? []).filter((w) => w.deckId === deck.id && w.slide === title);
  if (!links.length && !sheets.length) return null;
  return (
    <div className="rounded-2xl border border-hec-line bg-hec-surface p-4">
      <p className="mb-2 text-sm uppercase tracking-widest text-hec-ink-soft">Materials for this activity</p>
      <ul className="space-y-1 text-base text-hec-ink">
        {sheets.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-700" />
            <span className="font-medium">Worksheet: {w.title}</span>
            {openWorksheet && (
              <>
                <button type="button" onClick={() => openWorksheet(w.id, "teacher")} className="underline underline-offset-2 hover:no-underline">Teacher copy (with key)</button>
                <button type="button" onClick={() => openWorksheet(w.id, "student")} className="underline underline-offset-2 hover:no-underline">Student copy</button>
              </>
            )}
            <span className="text-hec-ink-soft">· Support / Core / Challenge</span>
          </li>
        ))}
        {links.map((r) => (
          <li key={r.url} className="flex flex-wrap items-center gap-2">
            <ExternalLink className="h-4 w-4 text-hec-ink-soft" />
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:no-underline">{r.source}: {r.title}</a>
            <span className="text-hec-ink-soft">· {r.use}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaskCard({ task, tone, label }: { task: CreativeTask; tone: "core" | "variant"; label: string }) {
  return (
    <div className={`rounded-2xl p-5 space-y-3 ${tone === "core" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40"}`}>
      <p className="text-sm uppercase tracking-widest text-hec-ink-soft">{label}</p>
      <p className="text-2xl font-semibold text-hec-ink">{task.title}<Say text={`${task.title}. ${task.task}`} /></p>
      <p className="text-lg text-hec-ink">{task.task}</p>
      <ol className="list-decimal pl-6 space-y-1 text-lg text-hec-ink">{task.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <div>
        <p className="text-sm font-semibold text-hec-ink">Sentence starters</p>
        <ul className="list-disc pl-6 text-lg text-hec-ink">{task.frames.map((f, i) => <li key={i}>{f}<Say text={f} /></li>)}</ul>
      </div>
      <div>
        <p className="text-sm font-semibold text-hec-ink">Check your writing</p>
        <ul className="space-y-0.5 text-base text-hec-ink">{task.success.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>
      </div>
      <p className="rounded-xl bg-amber-100 p-3 text-base text-amber-950 dark:bg-amber-900/40 dark:text-amber-50">
        <Rocket className="mr-1 inline h-4 w-4" /><strong>Challenge:</strong> {task.challenge}
      </p>
    </div>
  );
}

const TIER_TONE: Record<TierLevel, string> = {
  Support: "bg-sky-50 dark:bg-sky-950/40",
  Core: "bg-emerald-50 dark:bg-emerald-950/40",
  Stretch: "bg-amber-50 dark:bg-amber-950/40",
};

/** Support / Core / Stretch side by side. */
function Tiers({ tiers }: { tiers?: Tier[] }) {
  if (!tiers?.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {tiers.map((t) => (
        <div key={t.level} className={`rounded-2xl p-4 ${TIER_TONE[t.level]}`}>
          <p className="text-lg font-semibold text-hec-ink">{t.level === "Support" ? "★" : t.level === "Core" ? "★★" : "★★★"} {t.level}</p>
          <p className="text-base text-hec-ink">{t.task}</p>
          {t.frames?.length ? <ul className="mt-2 list-disc space-y-0.5 pl-5 text-base text-hec-ink">{t.frames.map((f, i) => <li key={i}>{f}<Say text={f} /></li>)}</ul> : null}
        </div>
      ))}
    </div>
  );
}

/** Play buttons for an original listening script: normal speed and slower (Support). */
function PlayScript({ lines }: { lines: ScriptLine[] }) {
  const { speakScript } = useContext(SlideContext);
  if (!speakScript) return null;
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={() => speakScript(lines, { slow: false })} className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-lg font-semibold text-white hover:bg-sky-700">
        <Play className="h-5 w-5" />Play the recording
      </button>
      <button type="button" onClick={() => speakScript(lines, { slow: true })} className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-lg font-medium text-sky-900 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-100">
        <Turtle className="h-5 w-5" />Slower (Support)
      </button>
    </div>
  );
}

/** A listening script: folded on screen, open on the teacher's copy, never on the student's. */
function Script({ lines, label = "Script (teacher)" }: { lines: ScriptLine[]; label?: string }) {
  const { audience } = useContext(SlideContext);
  if (audience === "student" || !lines.length) return null;
  const body = <div className="mt-2 space-y-1">{lines.map((l, i) => <p key={i}><strong>{l.speaker}:</strong> {l.text}</p>)}</div>;
  if (audience === "teacher") return <div className="rounded-xl border border-dashed border-hec-line p-3 text-base text-hec-ink"><p className="font-semibold">{label}</p>{body}</div>;
  return (
    <details className="rounded-xl border border-hec-line p-3 text-base text-hec-ink">
      <summary className="cursor-pointer text-hec-ink-soft">{label}</summary>
      {body}
    </details>
  );
}

/** The HEC peer rubric (a paraphrase of the public descriptors' shape, not the official text). Students use it, so both copies print it open. */
function PeerRubric() {
  const { audience } = useContext(SlideContext);
  return (
    <details open={!!audience} className="rounded-2xl border border-hec-line bg-hec-surface p-4">
      <summary className="cursor-pointer text-lg font-semibold text-hec-ink">Peer scoring: what each band sounds like</summary>
      <ol className="mt-2 list-decimal space-y-0.5 pl-6 text-base text-hec-ink">{PEER_STEPS.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <table className="mt-3 w-full border-collapse text-sm text-hec-ink">
        <thead><tr><th className="border border-hec-line p-1 text-left">Criterion</th>{RUBRIC[0].bands.map((b) => <th key={b.band} className="border border-hec-line p-1">Band {b.band}</th>)}</tr></thead>
        <tbody>
          {RUBRIC.map((r) => (
            <tr key={r.criterion}>
              <td className="border border-hec-line p-1 align-top"><strong>{r.criterion}</strong><br /><span className="text-hec-ink-soft">{r.listenFor}</span></td>
              {r.bands.map((b) => <td key={b.band} className="border border-hec-line p-1 align-top">{b.sounds}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-hec-ink-soft">HEC's own wording, based on the public IELTS Speaking band descriptors. A class estimate, not an official band.</p>
    </details>
  );
}

const mmss = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}` : `${s} s`);

function CheckItems({ a }: { a: Assessment }) {
  return (
    <div className="space-y-4">
      {a.sections.map((sec, si) => (
        <div key={si} className="rounded-2xl border border-hec-line bg-hec-surface p-4">
          <p className="text-lg font-semibold text-hec-ink">{sec.title}</p>
          <p className="mb-2 text-base text-hec-ink-soft">{sec.instructions}</p>
          {sec.script?.length ? <div className="mb-2 space-y-2"><PlayScript lines={sec.script} /><Script lines={sec.script} /></div> : null}
          <ol className="list-decimal pl-6 space-y-1 text-xl text-hec-ink">
            {sec.items.map((it, i) => (
              <li key={i}>{it.q}{it.options?.length ? <span className="text-hec-ink-soft"> ({it.options.join(" / ")})</span> : null}</li>
            ))}
          </ol>
          <TeacherAnswers items={sec.items} />
        </div>
      ))}
    </div>
  );
}

/** One slide, names already filled in. Big type: it is read from the back of the room. */
export function SlideView({ slide }: { slide: Slide }) {
  return (
    <div className="space-y-6">
      <SlideBody slide={slide} />
      <Extras slide={slide} />
    </div>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  const { unit, audience } = useContext(SlideContext);
  switch (slide.kind) {
    case "title":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <h1 className="font-display text-5xl md:text-7xl font-semibold text-hec-ink">{slide.title}</h1>
          {slide.subtitle && <p className="text-2xl md:text-3xl text-hec-ink-soft">{slide.subtitle}</p>}
          {slide.bigQuestion && (
            <div className="mt-4 rounded-2xl bg-amber-100 dark:bg-amber-900/40 px-8 py-5">
              <p className="text-sm uppercase tracking-widest text-amber-800 dark:text-amber-200">Big Question</p>
              <p className="text-2xl md:text-4xl font-medium text-amber-950 dark:text-amber-50">{slide.bigQuestion}<Say text={slide.bigQuestion} /></p>
            </div>
          )}
        </div>
      );
    case "objectives":
      return (
        <div className="space-y-8">
          <H Icon={Target}>{slide.title ?? "Today we will…"}</H>
          <List items={slide.items} />
        </div>
      );
    case "activity":
      return (
        <div className="space-y-6">
          <H>{slide.title}</H>
          <Meta tag={slide.tag} mode={slide.mode} minutes={slide.minutes} book={slide.book} />
          <List items={slide.steps} ordered />
          {slide.prompts?.length ? (
            <div className="rounded-2xl border-2 border-dashed border-hec-line p-5">
              <p className="mb-2 text-sm uppercase tracking-widest text-hec-ink-soft">Ask / say</p>
              <List items={slide.prompts} say />
            </div>
          ) : null}
          {slide.frames?.length ? (
            <div className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/40">
              <p className="mb-2 text-sm uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Sentence frames</p>
              <List items={slide.frames} />
            </div>
          ) : null}
          {slide.fluencyTip && <p className="text-xl text-hec-ink"><strong>Fluency tip:</strong> {slide.fluencyTip}</p>}
          <Tiers tiers={slide.tiers} />
          {slide.teacherNote && audience !== "student" && <p className="text-base text-hec-ink-soft italic">Teacher: {slide.teacherNote}</p>}
        </div>
      );
    case "vocab":
      return (
        <div className="space-y-6">
          <H Icon={Sparkles}>{slide.title ?? "Key words"}</H>
          {slide.book && <Meta book={slide.book} />}
          <div className="grid gap-4 md:grid-cols-2">
            {slide.words.map((w, i) => (
              <div key={i} className="rounded-2xl border border-hec-line bg-hec-surface p-4">
                <p className="text-2xl md:text-3xl font-semibold text-hec-ink">{w.word}<Say text={w.word} label="Say the word" /></p>
                <p className="text-lg text-hec-ink-soft">{w.meaning}</p>
                <p className="mt-1 text-lg text-hec-ink">“{w.example}”<Say text={w.example} /></p>
              </div>
            ))}
          </div>
        </div>
      );
    case "grammar":
      return (
        <div className="space-y-6">
          <H Icon={Lightbulb}>{slide.title}</H>
          {slide.book && <Meta book={slide.book} />}
          {slide.hook && <p className="text-2xl md:text-3xl font-medium text-amber-700 dark:text-amber-300">{slide.hook}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {slide.form.map((f, i) => (
              <div key={i} className="rounded-xl bg-hec-paper border border-hec-line p-4">
                <p className="text-sm uppercase tracking-widest text-hec-ink-soft">{f.label}</p>
                <p className="font-mono text-xl md:text-2xl text-hec-ink">{f.pattern}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-lg md:text-xl text-hec-ink leading-relaxed">
            {slide.explanation.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="space-y-2">
            {slide.examples.map((e, i) => (
              <p key={i} className="text-xl md:text-2xl text-hec-ink">
                <CheckCircle2 className="mr-2 inline h-6 w-6 text-emerald-600" />
                {e.text}<Say text={e.text} />
                {e.note && <span className="ml-2 text-base text-hec-ink-soft">— {e.note}</span>}
              </p>
            ))}
          </div>
          {slide.pitfalls?.length ? (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-4 space-y-2">
              <p className="flex items-center gap-2 text-sm uppercase tracking-widest text-rose-800 dark:text-rose-200"><AlertTriangle className="h-4 w-4" />Watch out</p>
              {slide.pitfalls.map((p, i) => (
                <p key={i} className="text-lg text-hec-ink">
                  <s className="text-rose-700 dark:text-rose-300">{p.wrong}</s> → <strong>{p.right}</strong><Say text={p.right} />
                  <span className="text-hec-ink-soft"> ({p.why})</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      );
    case "speaking":
      return (
        <div className="space-y-6">
          <H Icon={Mic}>{slide.title}</H>
          <Meta tag={slide.ielts ? `IELTS Speaking Part ${slide.ielts.part}` : "Speaking"} mode={slide.mode} minutes={slide.minutes} book={slide.book} />
          {slide.ielts && (slide.ielts.prepSeconds || slide.ielts.speakSeconds) ? (
            <div className="flex flex-wrap gap-2">
              {slide.ielts.prepSeconds ? <Chip tone="accent"><Clock className="h-4 w-4" />Prepare {mmss(slide.ielts.prepSeconds)}</Chip> : null}
              {slide.ielts.speakSeconds ? <Chip tone="accent"><Mic className="h-4 w-4" />Speak {mmss(slide.ielts.speakSeconds)}</Chip> : null}
            </div>
          ) : null}
          {slide.ielts?.cueCard && (
            <div className="rounded-2xl border-4 border-double border-hec-line bg-white p-5 text-gray-900 dark:bg-hec-surface dark:text-hec-ink">
              <p className="text-2xl font-semibold">{slide.ielts.cueCard.topic}<Say text={slide.ielts.cueCard.topic} /></p>
              <p className="mt-2 text-lg">You should say:</p>
              <ul className="list-disc pl-7 text-xl">{slide.ielts.cueCard.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {slide.steps?.length ? <List items={slide.steps} ordered /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-5">
              <p className="mb-2 text-sm uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Say it like this</p>
              <List items={slide.frames} say />
            </div>
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 p-5">
              <p className="mb-2 text-sm uppercase tracking-widest text-sky-800 dark:text-sky-200">Ask your partner</p>
              <List items={slide.prompts} say />
            </div>
          </div>
          {slide.fluencyTip && <p className="text-xl text-hec-ink"><strong>Fluency tip:</strong> {slide.fluencyTip}</p>}
          <Tiers tiers={slide.tiers} />
          {slide.ielts?.peerScore && <PeerRubric />}
          {slide.teacherNote && audience !== "student" && <p className="text-base text-hec-ink-soft italic">Teacher: {slide.teacherNote}</p>}
        </div>
      );
    case "book":
      return (
        <div className="space-y-6">
          <H Icon={BookOpen}>{slide.title ?? "Open your book"}</H>
          <Meta book={slide.ref} />
          {slide.ref.note && <p className="text-xl text-hec-ink">{slide.ref.note}</p>}
          {slide.steps?.length ? <List items={slide.steps} ordered /> : null}
        </div>
      );
    case "homework":
      return (
        <div className="space-y-6">
          <H Icon={Home}>{slide.title ?? "Homework"}</H>
          <div className="space-y-4">
            {slide.items.map((h, i) => (
              <div key={i} className="rounded-2xl border border-hec-line bg-hec-surface p-4">
                <p className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-hec-ink">
                  {h.label}
                  {h.tier && <Chip>{h.tier}</Chip>}
                  {h.minutes ? <Chip><Clock className="h-4 w-4" />{h.minutes} min a week</Chip> : null}
                </p>
                <p className="text-lg text-hec-ink">{h.detail}</p>
                {h.book && <div className="mt-2 flex flex-wrap gap-2"><BookChip b={h.book} /></div>}
              </div>
            ))}
          </div>
          {slide.items.some((h) => h.minutes) && (
            <p className="text-lg text-hec-ink-soft">
              Time this week:{" "}
              {(["Support", "Core", "Stretch"] as const).map((lv) => `${lv} ${slide.items.filter((h) => !h.tier || h.tier === lv).reduce((a, h) => a + (h.minutes ?? 0), 0)} min`).join(" · ")}
            </p>
          )}
        </div>
      );
    case "listening":
      return (
        <div className="space-y-5">
          <H Icon={Headphones}>{slide.title}</H>
          <Meta tag={`Listening Part ${slide.section}`} mode={slide.mode} minutes={slide.minutes} />
          <p className="text-xl text-hec-ink">{slide.context}</p>
          <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/40">
            <p className="mb-1 text-sm uppercase tracking-widest text-violet-800 dark:text-violet-200">Strategy: {slide.strategy.name}</p>
            <List items={slide.strategy.steps} ordered />
          </div>
          <PlayScript lines={slide.script} />
          <div className="rounded-2xl border border-hec-line bg-hec-surface p-4">
            <p className="text-lg font-semibold text-hec-ink">{slide.questions.type}</p>
            <p className="mb-2 text-base text-hec-ink-soft">{slide.questions.instructions}</p>
            <ol className="list-decimal space-y-1 pl-6 text-xl text-hec-ink">
              {slide.questions.items.map((it, i) => <li key={i}>{it.q}{it.options?.length ? <span className="text-hec-ink-soft"> ({it.options.join(" / ")})</span> : null}</li>)}
            </ol>
            <TeacherAnswers items={slide.questions.items} />
          </div>
          {slide.decoding?.length ? (
            <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-950/40">
              <p className="mb-1 text-sm uppercase tracking-widest text-rose-800 dark:text-rose-200">Decoding: how it sounds at speed</p>
              <ul className="space-y-1 text-lg text-hec-ink">{slide.decoding.map((d, i) => <li key={i}><strong>{d.phrase}</strong><Say text={d.phrase} /> → {d.sounds}</li>)}</ul>
            </div>
          ) : null}
          <Tiers tiers={slide.tiers} />
          <Script lines={slide.script} />
        </div>
      );
    case "debate":
      return (
        <div className="space-y-5">
          <H Icon={Scale}>{slide.title}</H>
          <Meta tag="Debate" mode={slide.mode} minutes={slide.minutes} />
          <Chip tone="accent">Stage {slide.stage}</Chip>
          <p className="rounded-2xl bg-amber-100 px-6 py-4 text-3xl font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-50">{slide.motion}<Say text={slide.motion} /></p>
          <List items={slide.steps} ordered />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-hec-line bg-hec-surface p-4">
              <p className="mb-2 text-sm uppercase tracking-widest text-hec-ink-soft">Running order</p>
              <ol className="list-decimal space-y-1 pl-6 text-lg text-hec-ink">{slide.speeches.map((s, i) => <li key={i}><strong>{s.role}</strong> ({mmss(s.seconds)}): {s.job}</li>)}</ol>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
              <p className="mb-2 text-sm uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Say it like this</p>
              <List items={slide.frames} say />
            </div>
          </div>
          <Tiers tiers={slide.tiers} />
          {slide.judging?.length ? (
            <div className="rounded-2xl border-2 border-dashed border-hec-line p-4">
              <p className="mb-1 text-sm uppercase tracking-widest text-hec-ink-soft">Judges listen for</p>
              <List items={slide.judging} />
            </div>
          ) : null}
        </div>
      );
    case "project":
      return (
        <div className="space-y-6">
          <H Icon={slide.project === "writing" ? PenLine : Mic}>{slide.title}</H>
          <Chip>{slide.project === "writing" ? "Writing project" : "Speaking project"}</Chip>
          <p className="text-2xl text-hec-ink">{slide.goal}</p>
          <List items={slide.steps} ordered />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-hec-paper border border-hec-line p-4">
              <p className="mb-2 text-sm uppercase tracking-widest text-hec-ink-soft">Success looks like</p>
              <List items={slide.criteria} />
            </div>
            {slide.frames?.length ? (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4">
                <p className="mb-2 text-sm uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Sentence frames</p>
                <List items={slide.frames} say />
              </div>
            ) : null}
          </div>
          {slide.model && (
            <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/40">
              <p className="mb-2 flex items-center text-sm uppercase tracking-widest text-sky-800 dark:text-sky-200">{slide.model.title}<Say text={slide.model.text} label="Listen to the model" /></p>
              <p className="text-xl leading-relaxed text-hec-ink">{slide.model.text}</p>
            </div>
          )}
          {slide.thinking && <p className="text-lg text-hec-ink-soft"><strong>Thinking:</strong> {slide.thinking}</p>}
          {slide.challenge && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-4">
              <p className="mb-1 text-sm uppercase tracking-widest text-amber-800 dark:text-amber-200">Challenge</p>
              <p className="text-xl text-hec-ink">{slide.challenge}</p>
            </div>
          )}
        </div>
      );
    case "vlog":
      return (
        <div className="space-y-6">
          <H Icon={Video}>{slide.title}</H>
          <Chip><Clock className="h-4 w-4" />{slide.length}</Chip>
          <p className="text-2xl text-hec-ink">{slide.prompt}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {slide.tiers.map((t) => (
              <div key={t.level} className={`rounded-2xl p-4 ${t.level === "Support" ? "bg-sky-50 dark:bg-sky-950/40" : t.level === "Core" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-amber-50 dark:bg-amber-950/40"}`}>
                <p className="text-xl font-semibold text-hec-ink">{t.level}</p>
                <p className="mb-2 text-sm text-hec-ink-soft">{t.who}</p>
                <ul className="list-disc pl-5 space-y-1 text-lg text-hec-ink">{t.frames.map((f, i) => <li key={i}>{f}<Say text={f} /></li>)}</ul>
                {t.tips.length > 0 && <ul className="mt-2 space-y-1 text-base text-hec-ink-soft">{t.tips.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>}
              </div>
            ))}
          </div>
        </div>
      );
    case "exam":
      return <ExamSlide slide={slide} audience={audience} />;
    case "reflect":
      return (
        <div className="space-y-8">
          <H Icon={Lightbulb}>{slide.title ?? "Think back"}</H>
          <List items={slide.prompts} />
        </div>
      );
    case "creative":
      return (
        <div className="space-y-6">
          <H Icon={PenLine}>Creative writing homework</H>
          <div className="flex flex-wrap gap-2">
            <Chip tone="accent">Thinking: {slide.thinking}</Chip>
            {slide.uses.grammar.map((g) => <Chip key={g}>{g}</Chip>)}
          </div>
          <p className="text-lg text-hec-ink"><strong>Use these words:</strong> {slide.uses.words.join(", ")}</p>
          <div className={`grid gap-4 ${slide.variants?.length ? "md:grid-cols-2" : ""}`}>
            <TaskCard task={slide.base} tone="core" label="Class version" />
            {(slide.variants ?? []).map((v) => <TaskCard key={v.interest} task={v.task} tone="variant" label={v.label} />)}
          </div>
        </div>
      );
    case "check": {
      const a = unit?.assessments?.find((x) => x.id === slide.assessment);
      return (
        <div className="space-y-6">
          <H Icon={ClipboardCheck}>{slide.title}</H>
          <Meta tag="Checkpoint" mode={slide.mode} minutes={slide.minutes} />
          <List items={slide.steps} ordered />
          {a ? <CheckItems a={a} /> : <p className="text-hec-ink-soft">The check's questions are printed from the Lesson Decks page.</p>}
        </div>
      );
    }
  }
}

/** Printable worksheet: the rule, three levels and the answer key on its own page. */
export function WorksheetView({ ws, answers }: { ws: NonNullable<Unit["worksheets"]>[number]; answers: boolean }) {
  return (
    <div className="space-y-5 text-hec-ink">
      <div className="flex items-baseline justify-between gap-4 border-b border-hec-line pb-2">
        <h2 className="font-display text-3xl font-semibold">{ws.title}{answers ? " · Answer key" : ""}</h2>
        {!answers && <p className="text-base">Name: ______________________ Date: __________</p>}
      </div>
      {!answers && <p className="rounded-xl bg-amber-50 p-3 text-lg">{ws.intro}</p>}
      {ws.tiers.map((t) => (
        <section key={t.level} className="space-y-2 break-inside-avoid">
          <h3 className="text-xl font-semibold">{t.level === "Support" ? "★" : t.level === "Core" ? "★★" : "★★★"} {t.level}</h3>
          {!answers && <p className="text-base">{t.instructions}</p>}
          {!answers && t.example && <p className="text-base italic text-hec-ink-soft">Example: {t.example}</p>}
          <ol className="list-decimal space-y-2 pl-7 text-lg">
            {t.items.map((it, i) => (
              <li key={i}>
                {answers ? <><span className="text-hec-ink-soft">{it.q}</span> <strong>→ {it.answer}</strong></> : (
                  <>
                    {it.q}
                    {it.options?.length ? <span className="ml-2">{it.options.map((o) => `☐ ${o}`).join("   ")}</span> : <div className="mt-1 border-b border-dotted border-gray-400 h-6" />}
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Printable assessment (check or test) with its speaking rubric; answers on separate pages. */
export function AssessmentView({ a, answers }: { a: Assessment; answers: boolean }) {
  const total = a.sections.reduce((n, s) => n + s.items.length * s.marksEach, 0);
  return (
    <div className="space-y-5 text-hec-ink">
      <div className="flex items-baseline justify-between gap-4 border-b border-hec-line pb-2">
        <h2 className="font-display text-3xl font-semibold flex items-center gap-2"><Trophy className="h-7 w-7" />{a.title}{answers ? " · Answer key" : ""}</h2>
        {!answers && <p className="text-base">Name: ______________________ Score: ____ / {total}</p>}
      </div>
      {a.sections.map((s, si) => (
        <section key={si} className="space-y-2 break-inside-avoid">
          <h3 className="text-xl font-semibold">{si + 1}. {s.title} <span className="text-base font-normal text-hec-ink-soft">({s.items.length * s.marksEach} marks)</span></h3>
          {!answers && <p className="text-base">{s.instructions}</p>}
          {!answers && s.passage && <p className="rounded-xl border border-hec-line p-3 text-lg leading-relaxed">{s.passage}</p>}
          {answers && s.script?.length ? (
            <div className="space-y-0.5 rounded-xl border border-hec-line p-3 text-sm">
              <p className="font-semibold">Recording script</p>
              {s.script.map((l, i) => <p key={i}><strong>{l.speaker}:</strong> {l.text}</p>)}
            </div>
          ) : null}
          <ol className="list-decimal space-y-2 pl-7 text-lg">
            {s.items.map((it, i) => (
              <li key={i}>
                {answers ? <><span className="text-hec-ink-soft">{it.q}</span> <strong>→ {it.answer}</strong></> : (
                  <>
                    {it.q}
                    {it.options?.length ? <span className="ml-2">{it.options.map((o) => `☐ ${o}`).join("   ")}</span> : (
                      <div className={`mt-1 border-b border-dotted border-gray-400 ${s.marksEach > 1 ? "h-40" : "h-6"}`} />
                    )}
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
      {a.speaking && (
        <section className="space-y-2 break-inside-avoid">
          <h3 className="text-xl font-semibold">{answers ? "Speaking (teacher marks, 1-4 per row)" : "Speaking"}</h3>
          <p className="text-lg">{a.speaking.task}</p>
          <ul className="list-disc pl-7 text-base">{a.speaking.prompts.map((p, i) => <li key={i}>{p}</li>)}</ul>
          {answers && a.speaking.rubric.length > 0 && <table className="w-full border-collapse text-sm">
            <thead><tr><th className="border p-1 text-left">Criterion</th>{[4, 3, 2, 1].map((n) => <th key={n} className="border p-1">{n}</th>)}</tr></thead>
            <tbody>
              {a.speaking.rubric.map((r) => (
                <tr key={r.criterion}><td className="border p-1 font-semibold">{r.criterion}</td>{r.bands.map((b, i) => <td key={i} className="border p-1 align-top">{b}</td>)}</tr>
              ))}
            </tbody>
          </table>}
        </section>
      )}
    </div>
  );
}
