import type { BookRef, Mode, Slide } from "@/lib/lessonDecks/types";
import { BookOpen, Clock, Users, User, UsersRound, Presentation, Mic, PenLine, Video, Lightbulb, AlertTriangle, CheckCircle2, Home, Target, Sparkles } from "lucide-react";

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

function BookChip({ b }: { b: BookRef }) {
  return (
    <Chip tone="accent">
      <BookOpen className="h-4 w-4" />
      {b.book === "SB" ? "Student Book" : "Workbook"} p. {b.pages}
      {b.activities?.length ? ` · Activity ${b.activities.join(", ")}` : ""}
    </Chip>
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

const List = ({ items, ordered }: { items: string[]; ordered?: boolean }) => {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-3 text-xl md:text-2xl text-hec-ink ${ordered ? "list-decimal" : "list-disc"} pl-8`}>
      {items.map((s, i) => <li key={i} className="leading-snug">{s}</li>)}
    </Tag>
  );
};

/** One slide, names already filled in. Big type: it is read from the back of the room. */
export function SlideView({ slide }: { slide: Slide }) {
  switch (slide.kind) {
    case "title":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <h1 className="font-display text-5xl md:text-7xl font-semibold text-hec-ink">{slide.title}</h1>
          {slide.subtitle && <p className="text-2xl md:text-3xl text-hec-ink-soft">{slide.subtitle}</p>}
          {slide.bigQuestion && (
            <div className="mt-4 rounded-2xl bg-amber-100 dark:bg-amber-900/40 px-8 py-5">
              <p className="text-sm uppercase tracking-widest text-amber-800 dark:text-amber-200">Big Question</p>
              <p className="text-2xl md:text-4xl font-medium text-amber-950 dark:text-amber-50">{slide.bigQuestion}</p>
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
              <List items={slide.prompts} />
            </div>
          ) : null}
          {slide.teacherNote && <p className="text-base text-hec-ink-soft italic">Teacher: {slide.teacherNote}</p>}
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
                <p className="text-2xl md:text-3xl font-semibold text-hec-ink">{w.word}</p>
                <p className="text-lg text-hec-ink-soft">{w.meaning}</p>
                <p className="mt-1 text-lg text-hec-ink">“{w.example}”</p>
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
                {e.text}
                {e.note && <span className="ml-2 text-base text-hec-ink-soft">— {e.note}</span>}
              </p>
            ))}
          </div>
          {slide.pitfalls?.length ? (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-4 space-y-2">
              <p className="flex items-center gap-2 text-sm uppercase tracking-widest text-rose-800 dark:text-rose-200"><AlertTriangle className="h-4 w-4" />Watch out</p>
              {slide.pitfalls.map((p, i) => (
                <p key={i} className="text-lg text-hec-ink">
                  <s className="text-rose-700 dark:text-rose-300">{p.wrong}</s> → <strong>{p.right}</strong>
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
          <Meta tag="Speaking" mode={slide.mode} minutes={slide.minutes} />
          {slide.steps?.length ? <List items={slide.steps} ordered /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-5">
              <p className="mb-2 text-sm uppercase tracking-widest text-emerald-800 dark:text-emerald-200">Say it like this</p>
              <List items={slide.frames} />
            </div>
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 p-5">
              <p className="mb-2 text-sm uppercase tracking-widest text-sky-800 dark:text-sky-200">Ask your partner</p>
              <List items={slide.prompts} />
            </div>
          </div>
          {slide.fluencyTip && <p className="text-xl text-hec-ink"><strong>Fluency tip:</strong> {slide.fluencyTip}</p>}
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
                <p className="text-2xl font-semibold text-hec-ink">{h.label}</p>
                <p className="text-lg text-hec-ink">{h.detail}</p>
                {h.book && <div className="mt-2"><BookChip b={h.book} /></div>}
              </div>
            ))}
          </div>
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
                <List items={slide.frames} />
              </div>
            ) : null}
          </div>
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
                <ul className="list-disc pl-5 space-y-1 text-lg text-hec-ink">{t.frames.map((f, i) => <li key={i}>{f}</li>)}</ul>
                {t.tips.length > 0 && <ul className="mt-2 space-y-1 text-base text-hec-ink-soft">{t.tips.map((f, i) => <li key={i}>✓ {f}</li>)}</ul>}
              </div>
            ))}
          </div>
        </div>
      );
    case "reflect":
      return (
        <div className="space-y-8">
          <H Icon={Lightbulb}>{slide.title ?? "Think back"}</H>
          <List items={slide.prompts} />
        </div>
      );
  }
}
