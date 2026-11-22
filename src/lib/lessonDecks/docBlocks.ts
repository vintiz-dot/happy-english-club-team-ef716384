// A deck, worksheet, check/test or homework sheet as the data of the HEC Docs
// `lesson-material` document (hec-docs/templates/lesson-material): plain text
// blocks, printed as a premium teacher's copy or student's copy.
//
// The student copy is built from data that audience.ts has already stripped of
// every answer, script, rubric and teacher note, so nothing for the teacher can
// reach that document whatever the template does. Imports nothing at run time.
import type { Assessment, CreativeTask, Deck, Slide, Unit, Worksheet } from "./types";
import type { Audience } from "./audience";

export type DocItem = { q: string; options?: string[]; answer?: string };
export type DocBlock = {
  heading: string;
  eyebrow?: string;
  chips?: string[];
  paragraphs?: string[];
  lists?: { title?: string; style: "steps" | "bullets" | "frames" | "checks"; items: string[] }[];
  questions?: { title?: string; instructions?: string; space: "line" | "box" | "none"; items: DocItem[] };
  tiers?: { level: "Support" | "Core" | "Stretch"; task: string; frames?: string[] }[];
  table?: { head: string[]; rows: string[][] };
  teacher?: { title: string; lines: string[] }[];
  writingLines?: number;
  breakBefore?: boolean;
};
export type LessonMaterial = {
  kind: "lesson" | "worksheet" | "assessment" | "homework";
  title: string;
  course: string;
  subtitle?: string;
  className?: string;
  bigQuestion?: string;
  objectives?: string[];
  nameLine?: boolean;
  studentName?: string;
  scoreOutOf?: number;
  blocks: DocBlock[];
};

const MODE: Record<string, string> = { whole: "Whole class", pairs: "Pairs", groups: "Groups", solo: "On your own" };
const nonEmpty = <T>(xs: (T | null | undefined | false)[]): T[] => xs.filter(Boolean) as T[];
const list = (style: "steps" | "bullets" | "frames" | "checks", items?: string[], title?: string) =>
  items && items.length ? { ...(title ? { title } : {}), style, items } : null;
const clean = <T extends Record<string, unknown>>(o: T): T => {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) delete o[k];
  }
  return o;
};
const item = (i: { q: string; options?: string[]; answer?: string }, teacher: boolean): DocItem =>
  clean({ q: i.q, options: i.options, answer: teacher && i.answer ? i.answer : undefined });
const note = (title: string, lines: (string | undefined)[]) => {
  const ls = lines.filter((l): l is string => !!l && !!l.trim());
  return ls.length ? { title, lines: ls } : null;
};
const mmss = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ""}` : `${s} s`);

function taskList(t: CreativeTask): DocBlock["lists"] {
  return nonEmpty([list("steps", t.steps), list("frames", t.frames, "Sentence starters"), list("checks", t.success, "Check your work")]);
}

/** One slide as a block. `teacher` is false for the student copy (whose data is already stripped). */
export function slideBlock(s: Slide, teacher: boolean): DocBlock | null {
  const chips = (minutes?: number, mode?: string) => nonEmpty([minutes ? `${minutes} min` : null, mode ? MODE[mode] ?? mode : null]);
  switch (s.kind) {
    case "title":
    case "objectives":
      return null; // they become the document's own title and objectives
    case "activity":
      return clean({
        heading: s.title, eyebrow: s.tag, chips: chips(s.minutes, s.mode),
        lists: nonEmpty([list("steps", s.steps), list("bullets", s.prompts, "Ask / say"), list("frames", s.frames, "Sentence frames")]),
        paragraphs: s.fluencyTip ? [`Fluency tip: ${s.fluencyTip}`] : undefined,
        tiers: s.tiers, teacher: teacher ? nonEmpty([note("Teacher note", [s.teacherNote])]) : undefined,
      });
    case "vocab":
      return { heading: s.title ?? "Words for today", eyebrow: "Vocabulary", table: { head: ["Word", "Meaning", "Example"], rows: s.words.map((w) => [w.word, w.meaning, w.example]) } };
    case "grammar":
      return clean({
        heading: s.title, eyebrow: "Grammar",
        paragraphs: nonEmpty([s.hook, ...s.explanation]),
        table: { head: ["", "Pattern"], rows: s.form.map((f) => [f.label, f.pattern]) },
        lists: nonEmpty([list("bullets", s.examples.map((e) => (e.note ? `${e.text} (${e.note})` : e.text)), "Examples"),
          list("bullets", (s.pitfalls ?? []).map((p) => `Not "${p.wrong}" but "${p.right}": ${p.why}`), "Watch out")]),
      });
    case "speaking":
      return clean({
        heading: s.title, eyebrow: s.ielts ? `IELTS Speaking · Part ${s.ielts.part}` : "Speaking",
        chips: nonEmpty([...chips(s.minutes, s.mode), s.ielts?.prepSeconds ? `Prepare ${mmss(s.ielts.prepSeconds)}` : null, s.ielts?.speakSeconds ? `Speak ${mmss(s.ielts.speakSeconds)}` : null]),
        paragraphs: s.ielts?.cueCard ? [`${s.ielts.cueCard.topic} You should say: ${s.ielts.cueCard.points.join("; ")}`] : undefined,
        lists: nonEmpty([list("steps", s.steps), list("frames", s.frames, "Say it like this"), list("bullets", s.prompts, "Ask your partner")]),
        tiers: s.tiers, teacher: teacher ? nonEmpty([note("Teacher note", [s.teacherNote])]) : undefined,
      });
    case "book":
      return clean({ heading: s.title ?? "Open your book", eyebrow: "Book", paragraphs: nonEmpty([`${s.ref.book} p. ${s.ref.pages}${s.ref.activities?.length ? `, activities ${s.ref.activities.join(", ")}` : ""}`, s.ref.note]), lists: nonEmpty([list("steps", s.steps)]) });
    case "homework":
      return clean({
        heading: s.title ?? "Homework", eyebrow: "Homework",
        table: s.items.some((h) => h.minutes) ? {
          head: ["Task", "Days", "Min / week", "What to do, and how it is checked"],
          rows: s.items.map((h) => [h.tier ? `${h.label} (${h.tier})` : h.label, (h.days ?? []).join(" "), h.minutes ? String(h.minutes) : "", h.check ? `${h.detail} Checked: ${h.check}` : h.detail]),
        } : undefined,
        lists: s.items.some((h) => h.minutes) ? undefined : nonEmpty([list("bullets", s.items.map((h) => `${h.label}: ${h.detail}`))]),
      });
    case "project":
      return clean({ heading: s.title, eyebrow: s.project === "writing" ? "Writing project" : "Speaking project", paragraphs: nonEmpty([s.goal, s.model ? `${s.model.title}: ${s.model.text}` : null, s.challenge ? `Challenge: ${s.challenge}` : null]), lists: nonEmpty([list("steps", s.steps), list("checks", s.criteria, "Success looks like"), list("frames", s.frames, "Sentence frames")]) });
    case "vlog":
      return { heading: s.title, eyebrow: `Video homework · ${s.length}`, paragraphs: [s.prompt], tiers: s.tiers.map((t) => ({ level: t.level, task: `${t.who}. ${t.tips.join(" ")}`.trim(), ...(t.frames.length ? { frames: t.frames } : {}) })) };
    case "reflect":
      return { heading: s.title ?? "Think back", eyebrow: "Reflection", lists: [{ style: "bullets", items: s.prompts }], writingLines: teacher ? undefined : 4 } as DocBlock;
    case "creative":
      return clean({ heading: s.base.title, eyebrow: `Creative homework · ${s.thinking}`, paragraphs: [s.base.task, `Use these words: ${s.uses.words.join(", ")}`, `Challenge: ${s.base.challenge}`], lists: taskList(s.base) });
    case "check":
      return clean({ heading: s.title, eyebrow: "Checkpoint", chips: chips(s.minutes, s.mode), lists: nonEmpty([list("steps", s.steps)]), paragraphs: ["The paper is printed on its own (teacher and student copies)."] });
    case "listening":
      return clean({
        heading: s.title, eyebrow: `Listening · Part ${s.section}`, chips: chips(s.minutes, s.mode),
        paragraphs: [s.context],
        lists: nonEmpty([list("steps", s.strategy.steps, `Strategy: ${s.strategy.name}`)]),
        questions: { title: s.questions.type, instructions: s.questions.instructions, space: "line", items: s.questions.items.map((i) => item(i, teacher)) },
        tiers: s.tiers,
        teacher: teacher ? nonEmpty([
          note("Recording script", s.script.map((l) => `${l.speaker}: ${l.text}`)),
          note("Decoding: how it sounds at speed", (s.decoding ?? []).map((d) => `${d.phrase} → ${d.sounds}`)),
        ]) : undefined,
      });
    case "debate":
      return clean({
        heading: s.title, eyebrow: `Debate · stage ${s.stage}`, chips: chips(s.minutes, s.mode),
        paragraphs: [`Motion: ${s.motion}`],
        lists: nonEmpty([list("steps", s.steps), list("bullets", s.speeches.map((p) => `${p.role} (${mmss(p.seconds)}): ${p.job}`), "Running order"), list("frames", s.frames, "Say it like this"), list("checks", s.judging, "Judges listen for")]),
        tiers: s.tiers,
      });
    case "exam":
      return clean({ heading: s.title, eyebrow: `Exam practice${s.school ? ` · ${s.school} format` : ""}`, chips: [`${s.minutes} min`], questions: { instructions: s.instructions, space: "line", items: s.items.map((i) => item(i, teacher)) } });
    default:
      return null;
  }
}

const courseOf = (u: Unit | undefined, label?: string) => label ?? (u ? `${u.curriculum} ${u.level}.${u.unit}` : "Lesson materials");

/** A deck. Pass the student copy (studentDeck) for the student audience. */
export function deckMaterial(d: Deck, audience: Audience, courseLabel?: string, unit?: Unit, className?: string): LessonMaterial {
  const teacher = audience === "teacher";
  const title = d.slides.find((s) => s.kind === "title") as Extract<Slide, { kind: "title" }> | undefined;
  const obj = d.slides.find((s) => s.kind === "objectives") as Extract<Slide, { kind: "objectives" }> | undefined;
  return clean({
    kind: "lesson" as const,
    title: d.title,
    course: courseOf(unit, courseLabel),
    subtitle: `Lesson ${d.lesson} · ${d.minutes} minutes`,
    className,
    bigQuestion: title?.bigQuestion,
    objectives: obj?.items,
    nameLine: !teacher,
    blocks: d.slides.map((s) => slideBlock(s, teacher)).filter((b): b is DocBlock => !!b),
  });
}

/** A check or test. Pass studentAssessment(a) for the student audience. */
export function assessmentMaterial(a: Assessment, audience: Audience, courseLabel?: string): LessonMaterial {
  const teacher = audience === "teacher";
  const blocks: DocBlock[] = a.sections.map((sec) => clean({
    heading: sec.title, eyebrow: sec.skill, chips: [`${sec.items.length * sec.marksEach} marks`],
    paragraphs: sec.passage ? [sec.passage] : undefined,
    questions: { instructions: sec.instructions, space: sec.marksEach > 1 ? "box" : "line", items: sec.items.map((i) => item(i, teacher)) },
    teacher: teacher ? nonEmpty([note("Recording script", (sec.script ?? []).map((l) => `${l.speaker}: ${l.text}`))]) : undefined,
  }));
  if (a.speaking) blocks.push(clean({
    heading: "Speaking", eyebrow: "Speaking",
    paragraphs: [a.speaking.task], lists: nonEmpty([list("bullets", a.speaking.prompts)]),
    table: teacher && a.speaking.rubric.length ? { head: ["Criterion", "4", "3", "2", "1"], rows: a.speaking.rubric.map((r) => [r.criterion, ...r.bands]) } : undefined,
  }));
  return clean({
    kind: "assessment" as const, title: a.title, course: courseLabel ?? "Lesson materials", subtitle: `${a.minutes} minutes`,
    nameLine: !teacher, scoreOutOf: a.sections.reduce((n, s) => n + s.items.length * s.marksEach, 0), blocks,
  });
}

/** A worksheet. Pass studentWorksheet(w) for the student audience. */
export function worksheetMaterial(w: Worksheet, audience: Audience, courseLabel?: string): LessonMaterial {
  const teacher = audience === "teacher";
  return {
    kind: "worksheet", title: w.title, course: courseLabel ?? "Lesson materials", subtitle: w.grammar, nameLine: !teacher,
    blocks: [{ heading: "The rule", eyebrow: "Grammar", paragraphs: [w.intro] }, ...w.tiers.map((t) => clean({
      heading: `${t.level === "Support" ? "★" : t.level === "Core" ? "★★" : "★★★"} ${t.level}`, eyebrow: "Worksheet",
      paragraphs: nonEmpty([t.instructions, t.example ? `Example: ${t.example}` : null]),
      questions: { space: "line" as const, items: t.items.map((i) => item(i, teacher)) },
    }))],
  };
}

/** One child's creative homework sheet (student), or the overview of every version (teacher). */
export function homeworkMaterial(d: Deck, task: CreativeTask, label: string, studentName: string | undefined, courseLabel?: string): LessonMaterial {
  const slide = d.slides.find((s) => s.kind === "creative") as Extract<Slide, { kind: "creative" }> | undefined;
  return clean({
    kind: "homework" as const, title: `${d.title} · Creative homework`, course: courseLabel ?? "Lesson materials", subtitle: label,
    studentName, nameLine: !studentName,
    blocks: [clean({
      heading: task.title, eyebrow: slide ? `Thinking: ${slide.thinking}` : undefined,
      paragraphs: nonEmpty([task.task, slide ? `Use these words: ${slide.uses.words.join(", ")}` : null, `Challenge: ${task.challenge}`]),
      lists: taskList(task), writingLines: 14,
    })],
  });
}
