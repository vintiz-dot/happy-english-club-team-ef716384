/**
 * _lib/student-report.ts - what generate-student-report counts, asks and keeps.
 *
 * Pure and imports nothing, so scripts/pgtest/student-report.test.mjs runs it
 * as is. The function reads the rows; this file decides:
 *
 *   periodFacts   the figures a family sees ("this period at a glance"),
 *                 counted here, never by the model: lessons by the LESSON's
 *                 date (not when a mark was typed), cancelled lessons left
 *                 out, words added in the period beside the bank's total.
 *   REPORT_SYSTEM the instructions, built on what research says keeps a
 *                 family informed and engaged (docs/AI_PROGRESS_REPORT.md):
 *                 specific can-do statements with evidence, at most two next
 *                 goals worded as what the school will do, short activities
 *                 at home and questions to ask the child, the work done made
 *                 visible, an opening and a closing worth remembering, and
 *                 English with Vietnamese for the family.
 *   cleanReport   keeps only fields of the right shape and length, so a
 *                 model that drifts cannot put a stray field, a lost
 *                 translation or a promise of a result on the family's page.
 *
 * The staff fields (cefr, skill_matrix, strengths, weaknesses,
 * learning_styles, recommendations, narrative) keep their old shape: the
 * dialog, the bulk export and the CEFR draft read them unchanged.
 */

export const CEFR_LEVELS = ["Pre-A1", "A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1"] as const;

export interface Bi { en: string; vi: string | null }

export interface PeriodFacts {
  lessons_held: number;
  lessons_attended: number;
  lessons_excused: number;
  lessons_absent: number;
  /** Attended of the lessons the child was expected at (excused left out); null with none. */
  attendance_rate: number | null;
  words_added: number;
  words_total: number;
  words_mastered: number;
  work_reviewed: number;
  homework_submitted: number;
  points_earned: number;
  lesson_reports: number;
  corrections: number;
}

type Row = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const inPeriod = (d: unknown, from: string, to: string) =>
  typeof d === "string" && d.slice(0, 10) >= from && d.slice(0, 10) <= to;

/**
 * The family's figures. `attendance` rows carry their lesson
 * (`sessions: {date, status}`); a lesson outside the period, cancelled, or
 * still in the future counts nowhere.
 */
export function periodFacts(input: {
  from: string;
  to: string;
  today: string;
  attendance: Row[];
  vocab: Row[];
  vocabTotal: number;
  workReviewed: number;
  homework: Row[];
  points: Row[];
  lessonReports: number;
  corrections: number;
}): PeriodFacts {
  const { from, to, today } = input;
  let attended = 0, excused = 0, absent = 0, held = 0;
  const seen = new Set<string>();
  for (const a of input.attendance ?? []) {
    const s = (a.sessions ?? null) as Row | null;
    const date = typeof s?.date === "string" ? s.date : null;
    if (!date || !inPeriod(date, from, to) || date > today) continue;
    if (s?.status === "Canceled") continue;
    const key = String(a.session_id ?? "");
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    held++;
    const st = String(a.status ?? "");
    if (st === "Present" || st === "Late") attended++;
    else if (st === "Excused") excused++;
    else if (st === "Absent") absent++;
  }
  const expected = attended + absent;
  const words = (input.vocab ?? []).filter((v) => inPeriod(v.created_at, from, to));
  const mastered = (input.vocab ?? []).filter((v) => num(v.mastery_level) >= 4).length;
  const homework = (input.homework ?? []).filter((h) => inPeriod(h.submitted_at, from, to)).length;
  const points = (input.points ?? []).reduce((t, p) => t + Math.max(0, num(p.points)), 0);
  return {
    lessons_held: held,
    lessons_attended: attended,
    lessons_excused: excused,
    lessons_absent: absent,
    attendance_rate: expected > 0 ? Math.round((attended / expected) * 100) / 100 : null,
    words_added: words.length,
    words_total: Math.max(num(input.vocabTotal), (input.vocab ?? []).length),
    words_mastered: mastered,
    work_reviewed: num(input.workReviewed),
    homework_submitted: homework,
    points_earned: points,
    lesson_reports: num(input.lessonReports),
    corrections: num(input.corrections),
  };
}

/**
 * What teachers already told the family, lesson by lesson (approved lesson
 * reports): the class part's summary and words, the child's highlight,
 * comment and next focus. Teacher-approved words are the best evidence a
 * report can quote.
 */
export function approvedLessonNotes(rows: Row[], limit = 12): Row[] {
  const out: Row[] = [];
  for (const r of rows ?? []) {
    const report = (r.lesson_reports ?? null) as Row | null;
    const part = (r.part ?? {}) as Row;
    const cls = (report?.class_part ?? {}) as Row;
    const session = (report?.sessions ?? null) as Row | null;
    const words = Array.isArray(cls.words)
      ? (cls.words as Row[]).map((w) => (typeof w?.en === "string" ? w.en : null)).filter(Boolean).slice(0, 8)
      : [];
    const taught = Array.isArray(cls.taught)
      ? (cls.taught as Row[]).map((t) => (typeof t?.topic === "string" ? t.topic : null)).filter(Boolean).slice(0, 4)
      : [];
    const note: Row = {
      date: session?.date ?? null,
      lesson_summary: typeof cls.summary === "string" ? cls.summary.slice(0, 300) : null,
      taught,
      words,
      child_highlight: typeof part.highlight === "string" ? part.highlight.slice(0, 300) : null,
      teacher_comment: typeof part.teacher_comment === "string" ? part.teacher_comment.slice(0, 300) : null,
      focus_next: typeof part.focus_next === "string" ? part.focus_next.slice(0, 200) : null,
      attendance: typeof part.attendance === "string" ? part.attendance : null,
    };
    if (note.lesson_summary || note.child_highlight || note.teacher_comment || taught.length) out.push(note);
  }
  out.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  return out.slice(0, limit);
}

export const REPORT_SYSTEM = `You are the senior teacher of Happy English Club, an English club in Hanoi for Vietnamese school children. You write the child's progress report for the period: a staff analysis, and the family's page.

EVIDENCE comes as JSON: the period's facts (counted by the school, exact), teachers' approved lesson notes, speaking metrics from recorded lessons, logged corrections, the word bank, approved work samples, points, earlier approved levels and a learning profile. Use only this evidence. Never invent a lesson, a quote, a score or an event. When evidence is thin, say so in the staff fields and keep the family page short and true rather than padded.

THE FAMILY PAGE ("parent") is what the family reads. Write it the way the research on school-family communication says works:
1. Open with ONE specific moment or achievement from the evidence (headline): a thing the child said, made or managed, with the lesson or topic. Not "is a good student".
2. "can_do": 3 or 4 things the child can now do in English, as plain can-do statements a parent understands (CEFR "can do" style, no jargon, no level codes), each with the evidence that shows it (a word, a sentence, a piece of work, a lesson).
3. Praise effort, strategies and progress, never fixed talent ("worked hard to", "is learning to", not "is clever").
4. "next_goals": at most 2. Each says what the child will learn next, why it matters, and what the TEACHER will do in class about it. Frame a difficulty as the next step, never as a fault of the child or the family.
5. "at_home": 2 or 3 activities a parent can do in 5-10 minutes, with no English needed by the parent and nothing to buy (for example: ask the child to teach you three words from the word list; let them retell a story in English while you listen; read the app's word cards together). Tie each to this period's words or topics.
6. "ask_your_child": 2 short questions the parent can ask at dinner, in Vietnamese and English, about something the class really did.
7. "next_period": one sentence on what the child is working towards next period, as a shared goal of child, family and teacher. It is a goal, never a promise of a result, a score, a band or a school place.
8. "teacher_note": 2-3 warm sentences that end the report on a real, specific positive, as the teacher who knows the child.
Every family text has "en" (simple English, short sentences) and "vi" (natural Vietnamese a Hanoi parent would write, not a word-for-word translation; call the child "con" and the parent "anh/chị" or "bố mẹ"). Use the child's first name in English. Do not repeat the facts' numbers in the text; the page shows them. No marketing, no discounts, no comparison with other children, no diagnosis, no word like "weak", "poor", "lazy", "behind" or "struggles".

THE STAFF FIELDS are for teachers: cefr {level, confidence 0-1, rationale}, skill_matrix (speaking, listening, reading, writing, grammar, vocabulary: score 1-5 and a note; leave a skill out when there is no evidence for it), strengths [{area, evidence}] 3-5, weaknesses [{area, evidence, recommendation}] 2-4, learning_styles (observed patterns), recommendations (3-5 next steps for the teacher), narrative (180-260 words in English for the parents, plain and warm, the same story as the family page).`;

const bi = { type: "object", required: ["en", "vi"], properties: { en: { type: "string" }, vi: { type: "string" } } };

export const REPORT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["cefr", "skill_matrix", "strengths", "weaknesses", "recommendations", "narrative", "parent"],
  properties: {
    cefr: {
      type: "object",
      required: ["level", "confidence", "rationale"],
      properties: { level: { type: "string", enum: [...CEFR_LEVELS] }, confidence: { type: "number" }, rationale: { type: "string" } },
    },
    skill_matrix: {
      type: "object",
      properties: Object.fromEntries(["speaking", "listening", "reading", "writing", "grammar", "vocabulary"].map((k) => [k, {
        type: "object", required: ["score", "note"], properties: { score: { type: "number" }, note: { type: "string" } },
      }])),
    },
    strengths: { type: "array", items: { type: "object", required: ["area", "evidence"], properties: { area: { type: "string" }, evidence: { type: "string" } } } },
    weaknesses: { type: "array", items: { type: "object", required: ["area", "evidence", "recommendation"], properties: { area: { type: "string" }, evidence: { type: "string" }, recommendation: { type: "string" } } } },
    learning_styles: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    narrative: { type: "string" },
    parent: {
      type: "object",
      required: ["headline", "can_do", "next_goals", "at_home", "ask_your_child", "next_period", "teacher_note"],
      properties: {
        headline: bi,
        can_do: { type: "array", items: { type: "object", required: ["text", "evidence"], properties: { text: bi, evidence: bi } } },
        next_goals: { type: "array", items: { type: "object", required: ["goal", "why", "in_class"], properties: { goal: bi, why: bi, in_class: bi } } },
        at_home: { type: "array", items: bi },
        ask_your_child: { type: "array", items: bi },
        next_period: bi,
        teacher_note: bi,
      },
    },
  },
};

// ---------------------------------------------------------------- cleaning

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
};

/** {en, vi}; null without English. A missing Vietnamese stays null (the page prints the English alone). */
export function cleanBi(v: unknown, max = 400): Bi | null {
  if (typeof v === "string") { const en = text(v, max); return en ? { en, vi: null } : null; }
  if (!v || typeof v !== "object") return null;
  const o = v as Row;
  const en = text(o.en, max);
  if (!en) return null;
  const vi = text(o.vi, max * 2);
  // A quote is the same in both languages: print it once.
  return { en, vi: vi && vi !== en ? vi : null };
}

/** Words the family page never carries: a promise of a result, or a label on the child. */
// English with word boundaries; Vietnamese without (\b does not see Vietnamese letters).
const PROMISE_EN = /\b(guarantee[sd]?|will (definitely )?(pass|get into|achieve|reach))\b/i;
const LABEL_EN = /\b(lazy|struggl\w*|slow learner)\b/i;
const BAD_VI = /(cam kết|đảm bảo|chắc chắn đỗ|lười|yếu kém|chậm hiểu)/i;
export const familySafe = (b: Bi | null): Bi | null =>
  b && !PROMISE_EN.test(b.en) && !LABEL_EN.test(b.en) && !(b.vi && BAD_VI.test(b.vi)) ? b : null;

const list = <T>(v: unknown, max: number, f: (x: unknown) => T | null): T[] =>
  (Array.isArray(v) ? v : []).map(f).filter((x): x is T => x !== null).slice(0, max);

export interface ParentPage {
  headline: Bi | null;
  can_do: Array<{ text: Bi; evidence: Bi | null }>;
  next_goals: Array<{ goal: Bi; why: Bi | null; in_class: Bi | null }>;
  at_home: Bi[];
  ask_your_child: Bi[];
  next_period: Bi | null;
  teacher_note: Bi | null;
}

export function cleanParent(v: unknown): ParentPage | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Row;
  const fam = (x: unknown, max?: number) => familySafe(cleanBi(x, max));
  const page: ParentPage = {
    headline: fam(p.headline, 300),
    can_do: list(p.can_do, 4, (x) => {
      const o = (x ?? {}) as Row;
      const t = fam(o.text, 240);
      return t ? { text: t, evidence: fam(o.evidence, 300) } : null;
    }),
    next_goals: list(p.next_goals, 2, (x) => {
      const o = (x ?? {}) as Row;
      const g = fam(o.goal, 200);
      return g ? { goal: g, why: fam(o.why, 300), in_class: fam(o.in_class, 300) } : null;
    }),
    at_home: list(p.at_home, 3, (x) => fam(x, 300)),
    ask_your_child: list(p.ask_your_child, 2, (x) => fam(x, 200)),
    next_period: fam(p.next_period, 300),
    teacher_note: fam(p.teacher_note, 600),
  };
  const any = page.headline || page.can_do.length || page.next_goals.length || page.at_home.length || page.teacher_note;
  return any ? page : null;
}

/** The model's reply, kept to the shapes the screens and the PDF read. */
export function cleanReport(raw: unknown, facts: PeriodFacts): Record<string, unknown> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Row;
  const out: Record<string, unknown> = {};
  const c = (r.cefr ?? null) as Row | null;
  if (c && typeof c.level === "string" && (CEFR_LEVELS as readonly string[]).includes(c.level)) {
    const conf = typeof c.confidence === "number" && Number.isFinite(c.confidence) ? Math.min(1, Math.max(0, c.confidence)) : null;
    out.cefr = { level: c.level, confidence: conf, rationale: text(c.rationale, 1500) };
  }
  const sm = (r.skill_matrix ?? null) as Row | null;
  if (sm && typeof sm === "object") {
    const skills: Row = {};
    for (const k of ["speaking", "listening", "reading", "writing", "grammar", "vocabulary"]) {
      const s = (sm[k] ?? null) as Row | null;
      if (s && typeof s.score === "number" && Number.isFinite(s.score)) {
        skills[k] = { score: Math.min(5, Math.max(0, Math.round(s.score * 2) / 2)), note: text(s.note, 400) };
      }
    }
    if (Object.keys(skills).length) out.skill_matrix = skills;
  }
  out.strengths = list(r.strengths, 5, (x) => {
    const o = (x ?? {}) as Row; const area = text(o.area, 200);
    return area ? { area, evidence: text(o.evidence, 600) } : null;
  });
  out.weaknesses = list(r.weaknesses, 4, (x) => {
    const o = (x ?? {}) as Row; const area = text(o.area, 200);
    return area ? { area, evidence: text(o.evidence, 600), recommendation: text(o.recommendation, 600) } : null;
  });
  out.learning_styles = list(r.learning_styles, 6, (x) => text(x, 160));
  out.recommendations = list(r.recommendations, 5, (x) => text(x, 500));
  const narrative = typeof r.narrative === "string" ? r.narrative.trim().slice(0, 4000) : "";
  out.narrative = narrative || null;
  const parent = cleanParent(r.parent);
  if (parent) out.parent = parent;
  out.facts = facts;
  return out;
}
