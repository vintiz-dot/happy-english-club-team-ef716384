/**
 * Lesson reports, stage A: reading the AI's draft for the review screen, and
 * turning the teacher's reviewed draft into the arguments of
 * approve_lesson_report (docs/LESSON_REPORTS.md, "What approval stores").
 *
 * WHAT MAY GO WHERE. Families read `class_part` and their own child's `part`
 * (stage B). So both are built by WHITELIST - only the fields the doc names,
 * copied field by field - and never contain gaps, name moments, objective
 * evidence or sources, whatever the draft holds. Those go to `staff_part`.
 * A child's `work_ids` keep only that child's own work; photos only this
 * lesson's, and only those the teacher ticked.
 *
 * Imports nothing: scripts/pgtest/lesson-report-approval.test.mjs runs it.
 */

export const CLASS_PART_SCHEMA = "hec-lesson-report/1";

export type Met = "yes" | "partly" | "no" | "unknown";
export type QuizKind = "choice" | "gap" | "order";
export interface EnVi { en: string; vi: string }
export interface Quote { t: number; quote: string }
export interface NameMoment { t: number; quote: string; why: string; decision?: "accepted" | "deleted" | null }
export interface DraftObjective { text: string; text_vi: string; met: Met; evidence: string }
export interface DraftGap { issue: string; kind: string; who: string; evidence: Quote[]; suggestion: string }
export interface DraftStudent {
  student_id: string; highlight: string; highlight_vi: string; focus_next: string; focus_next_vi: string;
  work_ids: string[]; points: number; attendance: string; name_moments: NameMoment[];
}
export interface DraftPhoto { photo_id: string; share: boolean; caption: string; caption_vi: string }
export interface QuizQuestion {
  id: string; kind: QuizKind; prompt: string; prompt_vi: string; options: string[]; answer: string;
  accept?: string[]; explain: string; explain_vi: string; objective: number;
}
export interface Draft {
  schema: string;
  lesson: { title: string; title_vi: string; summary: string; summary_vi: string };
  objectives: DraftObjective[];
  taught: { topic: string; detail: string; detail_vi: string }[];
  words: { en: string; vi: string; example: string }[];
  structures: { pattern: string; example: string }[];
  activities: { name: string; description: string; description_vi: string }[];
  gaps: DraftGap[];
  class_focus: EnVi[];
  students: DraftStudent[];
  parents: { tips: EnVi[]; ask_your_child: EnVi[]; next_lesson: EnVi };
  homework: { homework_id: string | null; title: string; due_date: string | null }[];
  photos: DraftPhoto[];
  quiz: { title: string; questions: QuizQuestion[] };
  sources: Record<string, unknown>;
}

/** The review screen's additions to the draft. */
export interface Review {
  /** student_id -> the teacher's own line for that child. */
  comments: Record<string, string>;
  /** Children left out of the report (e.g. absent); everyone else gets a part. */
  excluded: string[];
  quiz: { include: boolean; due_date: string | null; points: number | null; body: string | null };
}

export interface ApprovalRecords {
  sessionId: string;
  /** Children enrolled in the class on the lesson's date. */
  enrolled: string[];
  /** student_work id -> the child it belongs to. */
  workOwner: Record<string, string>;
  /** This lesson's photo ids. */
  lessonPhotoIds: string[];
  model: string | null;
}

export interface ApprovalArgs {
  p_session: string;
  p_class_part: Record<string, unknown>;
  p_staff_part: Record<string, unknown>;
  p_students: { student_id: string; part: Record<string, unknown> }[];
  p_photo_ids: string[];
  p_quiz: Record<string, unknown> | null;
}

// ------------------------------------------------------------------ reading

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const enVi = (v: unknown): EnVi => { const o = obj(v); return { en: str(o.en), vi: str(o.vi) }; };
const MET: Met[] = ["yes", "partly", "no", "unknown"];
const KINDS: QuizKind[] = ["choice", "gap", "order"];

/** Whatever is saved in lesson_report_drafts.body, as a complete Draft (missing parts empty). */
export function readDraft(body: unknown): Draft {
  const b = obj(body);
  const lesson = obj(b.lesson);
  const parents = obj(b.parents);
  const quiz = obj(b.quiz);
  return {
    schema: str(b.schema),
    lesson: { title: str(lesson.title), title_vi: str(lesson.title_vi), summary: str(lesson.summary), summary_vi: str(lesson.summary_vi) },
    objectives: arr(b.objectives).map((v) => {
      const o = obj(v);
      return { text: str(o.text), text_vi: str(o.text_vi), met: (MET.includes(o.met as Met) ? o.met : "unknown") as Met, evidence: str(o.evidence) };
    }),
    taught: arr(b.taught).map((v) => { const o = obj(v); return { topic: str(o.topic), detail: str(o.detail), detail_vi: str(o.detail_vi) }; }),
    words: arr(b.words).map((v) => { const o = obj(v); return { en: str(o.en), vi: str(o.vi), example: str(o.example) }; }),
    structures: arr(b.structures).map((v) => { const o = obj(v); return { pattern: str(o.pattern), example: str(o.example) }; }),
    activities: arr(b.activities).map((v) => { const o = obj(v); return { name: str(o.name), description: str(o.description), description_vi: str(o.description_vi) }; }),
    gaps: arr(b.gaps).map((v) => {
      const g = obj(v);
      return { issue: str(g.issue), kind: str(g.kind), who: str(g.who), suggestion: str(g.suggestion),
        evidence: arr(g.evidence).map((e) => ({ t: num(obj(e).t), quote: str(obj(e).quote) })) };
    }),
    class_focus: arr(b.class_focus).map(enVi),
    students: arr(b.students).map((v) => {
      const s = obj(v);
      return {
        student_id: str(s.student_id), highlight: str(s.highlight), highlight_vi: str(s.highlight_vi),
        focus_next: str(s.focus_next), focus_next_vi: str(s.focus_next_vi),
        work_ids: arr(s.work_ids).map(str).filter(Boolean), points: num(s.points), attendance: str(s.attendance) || "unknown",
        name_moments: arr(s.name_moments).map((m) => {
          const o = obj(m);
          const d: NameMoment["decision"] = o.decision === "accepted" || o.decision === "deleted" ? o.decision : null;
          return { t: num(o.t), quote: str(o.quote), why: str(o.why), decision: d };
        }),
      };
    }).filter((s) => s.student_id),
    parents: { tips: arr(parents.tips).map(enVi), ask_your_child: arr(parents.ask_your_child).map(enVi), next_lesson: enVi(parents.next_lesson) },
    homework: arr(b.homework).map((v) => {
      const h = obj(v);
      return { homework_id: str(h.homework_id) || null, title: str(h.title), due_date: str(h.due_date) || null };
    }),
    photos: arr(b.photos).map((v) => {
      const p = obj(v);
      return { photo_id: str(p.photo_id), share: p.share === true, caption: str(p.caption), caption_vi: str(p.caption_vi) };
    }).filter((p) => p.photo_id),
    quiz: {
      title: str(quiz.title) || "Lesson review",
      questions: arr(quiz.questions).map((v, i) => {
        const q = obj(v);
        return {
          id: str(q.id) || `q${i + 1}`, kind: (KINDS.includes(q.kind as QuizKind) ? q.kind : "choice") as QuizKind,
          prompt: str(q.prompt), prompt_vi: str(q.prompt_vi), options: arr(q.options).map(str), answer: str(q.answer),
          ...(Array.isArray(q.accept) ? { accept: arr(q.accept).map(str) } : {}),
          explain: str(q.explain), explain_vi: str(q.explain_vi), objective: num(q.objective),
        };
      }),
    },
    sources: obj(b.sources),
  };
}

// ------------------------------------------------------------------ checking before approval

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).sort().join(" ");

/** Why one question cannot be set as it stands (null: it can). */
export function questionProblem(q: QuizQuestion): string | null {
  if (!q.prompt.trim()) return "has no question";
  if (!q.answer.trim()) return "has no answer";
  const opts = q.options.map((o) => o.trim()).filter(Boolean);
  if (q.kind === "choice") {
    if (opts.length < 2) return "needs at least two choices";
    if (!opts.includes(q.answer.trim())) return "its answer is not one of the choices";
  }
  if (q.kind === "order") {
    if (opts.length < 2) return "needs at least two pieces";
    if (words(opts.join(" ")) !== words(q.answer)) return "its pieces do not make the answer";
  }
  return null;
}

/** What stops this review from being approved. Empty: it may be approved. */
export function approvalProblems(d: Draft, r: Review): string[] {
  const out: string[] = [];
  const objectives = d.objectives.filter((o) => o.text.trim());
  if (objectives.length < 2 || objectives.length > 4) out.push("Keep 2 to 4 objectives.");
  if (!d.lesson.summary.trim()) out.push("The lesson needs a summary.");
  const pending = d.students.filter((s) => !r.excluded.includes(s.student_id))
    .reduce((n, s) => n + s.name_moments.filter((m) => !m.decision).length, 0);
  if (pending) out.push(`Accept or delete ${pending} name suggestion${pending === 1 ? "" : "s"}.`);
  if (r.quiz.include) {
    if (d.quiz.questions.length < 1 || d.quiz.questions.length > 15) out.push("A review quiz has 1 to 15 questions.");
    d.quiz.questions.forEach((q, i) => { const p = questionProblem(q); if (p) out.push(`Question ${i + 1} ${p}.`); });
  }
  return out;
}

// ------------------------------------------------------------------ the mapping

const pair = (p: EnVi) => ({ en: p.en, vi: p.vi });
const keep = <T>(xs: T[], has: (x: T) => boolean) => xs.filter(has);

function cleanQuestion(q: QuizQuestion, i: number) {
  const kind = q.kind;
  return {
    id: `q${i + 1}`, kind, prompt: q.prompt.trim(), prompt_vi: q.prompt_vi.trim(),
    options: kind === "gap" ? [] : q.options.map((o) => o.trim()).filter(Boolean),
    answer: q.answer.trim(),
    ...(kind === "gap" && q.accept?.length ? { accept: q.accept.map((a) => a.trim()).filter(Boolean) } : {}),
    explain: q.explain.trim(), explain_vi: q.explain_vi.trim(), objective: Math.max(0, Math.trunc(q.objective || 0)),
  };
}

/** approve_lesson_report's arguments, exactly as docs/LESSON_REPORTS.md says. */
export function buildApproval(d: Draft, r: Review, rec: ApprovalRecords): ApprovalArgs {
  const enrolled = new Set(rec.enrolled);
  const lessonPhotos = new Set(rec.lessonPhotoIds);
  const shared = d.photos.filter((p) => p.share && lessonPhotos.has(p.photo_id));

  const p_class_part = {
    schema: CLASS_PART_SCHEMA,
    lesson: { title: d.lesson.title, title_vi: d.lesson.title_vi, summary: d.lesson.summary, summary_vi: d.lesson.summary_vi },
    objectives: keep(d.objectives, (o) => !!o.text.trim()).map((o) => ({ text: o.text, text_vi: o.text_vi, met: o.met })),
    taught: d.taught.map((t) => ({ topic: t.topic, detail: t.detail, detail_vi: t.detail_vi })),
    words: d.words.map((w) => ({ en: w.en, vi: w.vi, example: w.example })),
    structures: d.structures.map((s) => ({ pattern: s.pattern, example: s.example })),
    activities: d.activities.map((a) => ({ name: a.name, description: a.description, description_vi: a.description_vi })),
    class_focus: d.class_focus.map(pair),
    parents: { tips: d.parents.tips.map(pair), ask_your_child: d.parents.ask_your_child.map(pair), next_lesson: pair(d.parents.next_lesson) },
    homework: d.homework.map((h) => ({ homework_id: h.homework_id, title: h.title, due_date: h.due_date })),
    photo_captions: Object.fromEntries(shared.map((p) => [p.photo_id, { caption: p.caption, caption_vi: p.caption_vi }])),
  };

  const included = d.students.filter((s) => enrolled.has(s.student_id) && !r.excluded.includes(s.student_id));
  const p_staff_part = {
    gaps: d.gaps.map((g) => ({ issue: g.issue, kind: g.kind, who: g.who, evidence: g.evidence.map((e) => ({ t: e.t, quote: e.quote })), suggestion: g.suggestion })),
    name_moments_accepted: included.flatMap((s) => s.name_moments.filter((m) => m.decision === "accepted")
      .map((m) => ({ student_id: s.student_id, t: m.t, quote: m.quote }))),
    sources: d.sources,
    model: rec.model,
  };

  const seen = new Set<string>();
  const p_students = included.filter((s) => (seen.has(s.student_id) ? false : (seen.add(s.student_id), true))).map((s) => ({
    student_id: s.student_id,
    part: {
      highlight: s.highlight, highlight_vi: s.highlight_vi, focus_next: s.focus_next, focus_next_vi: s.focus_next_vi,
      attendance: s.attendance, points: s.points,
      work_ids: [...new Set(s.work_ids)].filter((w) => rec.workOwner[w] === s.student_id),
      teacher_comment: (r.comments[s.student_id] ?? "").trim(),
    },
  }));

  const p_quiz = r.quiz.include && d.quiz.questions.length
    ? {
      title: d.quiz.title.trim() || "Lesson review",
      ...(r.quiz.body ? { body: r.quiz.body } : {}),
      ...(r.quiz.due_date ? { due_date: r.quiz.due_date } : {}),
      ...(r.quiz.points !== null && r.quiz.points !== undefined ? { points: r.quiz.points } : {}),
      questions: d.quiz.questions.map(cleanQuestion),
    }
    : null;

  return { p_session: rec.sessionId, p_class_part, p_staff_part, p_students, p_photo_ids: shared.map((p) => p.photo_id), p_quiz };
}
