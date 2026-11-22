// Every export of a deck, worksheet or test comes in two copies:
//   teacher: everything, with answers, listening scripts and teacher notes printed open;
//   student: the same pages with every answer, script, marking rubric and teacher note
//            taken OUT OF THE DATA before it is rendered.
// Stripping the data (not only hiding it in the renderer) means a student copy can
// never carry an answer by accident, whatever a slide's renderer does. Imports
// nothing at run time (scripts/pgtest/lesson-decks-lib.test.mjs loads it on its own).
import type { Assessment, Deck, Slide, Unit, Worksheet } from "./types";

export type Audience = "teacher" | "student";

// A step, prompt or frame written as the teacher's move ("Teacher: 'Say your
// partner's name...'", "T: model it twice") is for the teacher's copy only.
const TEACHER_LINE = /^\s*(teacher|t)\s*[:(]/i;
const pupilLines = (xs?: string[]) => (xs ? xs.filter((x) => !TEACHER_LINE.test(x)) : xs);

/** A slide as a student may see it on paper. */
export function studentSlide(s: Slide): Slide {
  switch (s.kind) {
    case "activity": {
      const { teacherNote: _note, ...rest } = s;
      return { ...rest, steps: pupilLines(rest.steps)!, ...(rest.prompts ? { prompts: pupilLines(rest.prompts) } : {}), ...(rest.frames ? { frames: pupilLines(rest.frames) } : {}) };
    }
    case "speaking": {
      const { teacherNote: _note, ...rest } = s;
      return { ...rest, frames: pupilLines(rest.frames)!, prompts: pupilLines(rest.prompts)!, ...(rest.steps ? { steps: pupilLines(rest.steps) } : {}) };
    }
    case "debate":
    case "check":
    case "book":
      return "steps" in s && s.steps ? ({ ...s, steps: pupilLines(s.steps) } as Slide) : s;
    case "project":
      return { ...s, steps: pupilLines(s.steps)! };
    case "listening": {
      // The questions stay; what was said and what the answers are do not. The
      // decoding chunks are lifted from the script (often an answer), so they go too.
      const { decoding: _chunks, ...rest } = s;
      return { ...rest, script: [], questions: { ...s.questions, items: s.questions.items.map((i) => ({ q: i.q, ...(i.options ? { options: i.options } : {}), answer: "" })) } };
    }
    case "exam":
      return { ...s, items: s.items.map((i) => ({ q: i.q, ...(i.options ? { options: i.options } : {}), answer: "" })) };
    default:
      return s;
  }
}

/** The paper a student sits: questions only; no answers, scripts or marking rubric. */
export function studentAssessment(a: Assessment): Assessment {
  return {
    ...a,
    sections: a.sections.map((sec) => {
      const { script: _script, ...rest } = sec;
      return { ...rest, items: sec.items.map((i) => ({ q: i.q, ...(i.options ? { options: i.options } : {}), answer: "" })) };
    }),
    ...(a.speaking ? { speaking: { task: a.speaking.task, prompts: a.speaking.prompts, rubric: [] } } : {}),
  };
}

export function studentWorksheet(w: Worksheet): Worksheet {
  return { ...w, tiers: w.tiers.map((t) => ({ ...t, items: t.items.map((i) => ({ q: i.q, ...(i.options ? { options: i.options } : {}), answer: "" })) })) };
}

/** A deck for students. Supplementary teacher links go too (they open the school's own account). */
export function studentDeck(d: Deck): Deck {
  const { resources: _links, ...rest } = d;
  return { ...rest, slides: d.slides.map(studentSlide) };
}

/** The unit a student copy renders against: its checks carry no answers, its worksheets no key. */
export function studentUnit(u: Unit): Unit {
  return {
    ...u,
    generalizations: [],
    decks: u.decks.map(studentDeck),
    ...(u.assessments ? { assessments: u.assessments.map(studentAssessment) } : {}),
    ...(u.worksheets ? { worksheets: u.worksheets.map(studentWorksheet) } : {}),
  };
}
