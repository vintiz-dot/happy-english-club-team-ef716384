/**
 * _lib/lesson-report-draft.ts - what lesson-report-draft asks Claude for, and
 * how the reply is checked before it is saved (docs/LESSON_REPORTS.md, "The
 * draft body").
 *
 * THE MODEL WRITES WORDS; THE RECORDS DECIDE FACTS. Attendance, points, the
 * homework set that day and which photos exist come from the app's records,
 * never from the reply. Anything in the reply that points at a record - a
 * child, a piece of work, a photo - is kept only if it is that record:
 *   - a child part only for a child enrolled in the class on the lesson's date;
 *   - a work id only if it is THAT child's own student_work from the lesson;
 *   - a photo id only if it is one of this lesson's photos;
 *   - a quoted transcript line (gap evidence, a name moment) only if the line
 *     is in the transcript, and it carries the line's own time, not the model's.
 * A name moment is a staff-only suggestion; with no transcript there are none.
 *
 * Imports nothing, so scripts/pgtest/lesson-report-approval.test.mjs runs it
 * in Node.
 */

export const DRAFT_SCHEMA_ID = "hec-lesson-report-draft/1";

/** m = the child the teacher tapped as speaking (lesson monitor lines only); unsure = the machine doubted the words. */
export interface TranscriptLine { t: number; text: string; teacher: boolean; m?: string; unsure?: boolean }
export interface DraftContext {
  enrolled: Set<string>;
  /** student_work id -> the child it belongs to (student_id), lesson window only. */
  workOwner: Map<string, string>;
  /** this lesson's photo ids -> their kind and the staff caption. */
  photos: Map<string, { kind: string; caption: string | null }>;
  attendance: Map<string, string>;
  points: Map<string, number>;
  homework: { homework_id: string; title: string; due_date: string | null }[];
  transcript: TranscriptLine[] | null;
  /** Why there is no transcript, for `sources` (null when there is one). */
  transcriptNote: string | null;
  workCount: number;
  /** The end-of-lesson speaking evidence (speakingEvidence), or null when there is none to grade. */
  speaking?: SpeakingEvidence | null;
}

const MET = ["yes", "partly", "no", "unknown"];
const GAP_KINDS = ["misconception", "gap", "grammar", "vocabulary", "pronunciation"];
const ATTENDANCE = ["Present", "Late", "Absent", "Excused"];
const QUIZ_KINDS = ["choice", "gap", "order"];
export const SPEAKING_CRITERIA = ["fluency", "accuracy", "vocabulary", "interaction"];
/** Photos a family may be shown by default: material, not children. The teacher decides. */
const SHARE_BY_DEFAULT = new Set(["screen", "whiteboard", "worksheet", "material"]);

const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const enVi = (v: unknown) => { const o = obj(v); return { en: str(o.en, 600), vi: str(o.vi, 600) }; };
const fold = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ").replace(/\s+/g, " ").trim();

// ------------------------------------------------------------------ the planned lesson

/** A curriculum_lessons row as the draft function reads it (the fields it uses). */
export interface CurriculumLessonRow {
  curriculum?: unknown; level?: unknown; unit_from?: unknown; unit_to?: unknown; lesson?: unknown; sb_page?: unknown;
  objectives?: unknown; vocabulary?: unknown; words_in_context?: unknown; reading_strategy?: unknown; grammar?: unknown;
  focus?: unknown; big_question?: unknown;
}

const strList = (v: unknown, n: number, max = 200) =>
  arr(v).map((x) => str(x, max)).filter(Boolean).slice(0, n);

/**
 * What the session's plan tells the model: the course book lesson(s) the
 * teacher said this lesson covered, trimmed to short, labelled facts. Rows
 * that are not a curriculum lesson are dropped; an empty plan is null, so the
 * evidence simply has no planned_lessons.
 */
export function plannedLessons(rows: unknown) {
  const out = arr(rows)
    .map((r) => obj(r) as CurriculumLessonRow)
    .filter((r) => str(r.lesson) && Number.isInteger(r.level) && Number.isInteger(r.unit_from))
    .slice(0, 4)
    .map((r) => {
      const from = r.unit_from as number;
      const to = Number.isInteger(r.unit_to) ? (r.unit_to as number) : from;
      const focus = Object.fromEntries(Object.entries(obj(r.focus)).map(([k, v]) => [k, str(v, 240)]).filter(([, v]) => v));
      return {
        book: str(r.curriculum) === "oxford-discover-2e" ? `Oxford Discover (2nd edition) Level ${r.level}`
          // Reach Higher splits a level into two books: Units 1-4 are "A", 5-8 "B".
          : str(r.curriculum) === "reach-higher" ? `Reach Higher ${r.level}${from <= 4 ? "A" : "B"}`
          : `${str(r.curriculum, 60)} Level ${r.level}`,
        unit: to > from ? `Units ${from} and ${to}` : `Unit ${from}`,
        lesson: str(r.lesson, 40),
        student_book_page: Number.isInteger(r.sb_page) ? r.sb_page : null,
        big_question: str(r.big_question, 160) || null,
        objectives: strList(r.objectives, 6, 300),
        vocabulary: strList(r.vocabulary, 20, 60),
        words_in_context: strList(r.words_in_context, 12, 60),
        reading_strategy: str(r.reading_strategy, 120) || null,
        grammar: str(r.grammar, 160) || null,
        focus,
      };
    });
  return out.length ? out : null;
}

// ------------------------------------------------------------------ the JSON schema

const S = { type: "string" };
const object = (props: Record<string, unknown>) => ({
  type: "object", additionalProperties: false, required: Object.keys(props), properties: props,
});
const list = (items: unknown) => ({ type: "array", items });
const pair = object({ en: S, vi: S });
const quote = object({ t: { type: "number" }, quote: S });

export const DRAFT_JSON_SCHEMA = object({
  lesson: object({ title: S, title_vi: S, summary: S, summary_vi: S }),
  objectives: list(object({ text: S, text_vi: S, met: { type: "string", enum: MET }, evidence: S })),
  taught: list(object({ topic: S, detail: S, detail_vi: S })),
  words: list(object({ en: S, vi: S, example: S })),
  structures: list(object({ pattern: S, example: S })),
  activities: list(object({ name: S, description: S, description_vi: S })),
  gaps: list(object({
    issue: S, kind: { type: "string", enum: GAP_KINDS }, who: { type: "string", enum: ["class", "some"] },
    evidence: list(quote), suggestion: S,
  })),
  class_focus: list(pair),
  speaking: list(object({
    student_id: S, comment: S,
    criteria: list(object({ criterion: { type: "string", enum: SPEAKING_CRITERIA }, score: { type: "integer" }, quote: S })),
  })),
  students: list(object({
    student_id: S, highlight: S, highlight_vi: S, focus_next: S, focus_next_vi: S,
    work_ids: list(S), name_moments: list(object({ t: { type: "number" }, quote: S, why: S })),
  })),
  parents: object({ tips: list(pair), ask_your_child: list(pair), next_lesson: pair }),
  photos: list(object({ photo_id: S, caption: S, caption_vi: S })),
  quiz: object({
    title: S,
    questions: list(object({
      id: S, kind: { type: "string", enum: QUIZ_KINDS }, prompt: S, prompt_vi: S, options: list(S),
      answer: S, accept: list(S), explain: S, explain_vi: S, objective: { type: "integer" },
    })),
  }),
});

// ------------------------------------------------------------------ the instructions

export const DRAFT_SYSTEM = `You write the first draft of a daily lesson report for an English school for Vietnamese children.
A teacher checks and edits every word before any family sees it. Write only what the evidence shows.

Evidence you are given (some may be missing): the lesson's transcript (lines "[mm:ss] T: ..." are the teacher,
"[mm:ss] S: ..." anyone else; names in it may be in-class nicknames), photos staff took of the screen, whiteboard,
worksheets and materials, the children's work uploaded during the lesson (with OCR text), attendance, points given,
homework, target words, and the list of enrolled children with their ids.

Rules:
- Never invent. If something is not in the evidence, leave it out or mark an objective "unknown".
- Objectives: 2 to 4, what the lesson set out to teach, each with met = yes/partly/no/unknown and a short evidence note.
  When the evidence has planned_lessons (the course book's lesson the teacher said this lesson covered), start from
  those: turn the book's objectives, words, grammar point and skills focus into 2-4 child-friendly objectives and judge
  each against the transcript, photos and work. The plan says what was intended, never what happened: an objective
  with no evidence in the lesson is "unknown", not "yes". If the lesson clearly did something else, say so in the
  evidence note. Use the plan's words and grammar point for the quiz where the lesson practised them.
- Gaps and misconceptions (staff only): every one must quote the transcript line(s) that show it, copied exactly,
  with the line's time in seconds (t). A gap seen only in children's work quotes the work's text instead, with t = -1.
  who = "class" when many showed it, "some" otherwise. Never name a child in a gap.
- class_focus: the gaps, softened and positive, for families (no names, no blame).
- students: one entry per enrolled child you have evidence for, by student_id from the list. A highlight or focus
  comes ONLY from that child's own records (their work, their points, their attendance). If a child has no records
  beyond attendance, leave highlight and focus empty. work_ids: only that child's own work ids.
- name_moments (staff only): only where a transcript line names the child (by name or a nickname you can match
  to the list with confidence). Quote the line exactly with its t and say why it matters. Never guess.
- photos: a caption for each photo id you were shown (what it shows, for a parent).
- Parent-facing text is warm, plain English, with natural Vietnamese (not word-for-word) in every _vi field and vi.
- parents: 2-3 tips for home, 2-3 questions to ask your child, and what comes next if the evidence says.
- quiz: 5 to 8 questions for the children to review at home, from this lesson's words and structures and the class's
  gaps. kind "choice": options are 3-4 choices, answer is one of them exactly. kind "gap": prompt has "___" for the
  missing word(s), options empty, answer the text, accept other correct spellings. kind "order": options are the
  sentence's pieces shuffled, answer is the pieces in the right order joined by one space. objective = the index (0-based)
  of the objective it checks. Child-friendly English prompts, prompt_vi a short Vietnamese help line.
- ids in the quiz: q1, q2, ...
- speaking (staff only): ONLY for the children listed in evidence.speaking_end.children, which holds each child's own
  lines from the end of the lesson (the teacher tapped who was speaking). Score each of fluency, accuracy, vocabulary
  and interaction from 1 to 4 (1 = needs a lot of support, 2 = emerging, 3 = secure, 4 = strong for the child's
  grade). Every score needs a quote copied exactly from THAT child's lines. The transcript is text from a speech
  recogniser: never judge pronunciation or accent, and do not score a criterion the words do not show - leave it out.
  Never write about a child who is not in the list, and never compare children. comment: one plain sentence for the teacher.`;

// ------------------------------------------------------------------ checking the reply

function cleanQuestion(v: unknown, i: number, objectives: number) {
  const q = obj(v);
  const kind = QUIZ_KINDS.includes(str(q.kind)) ? str(q.kind) : "";
  const prompt = str(q.prompt, 400), answer = str(q.answer, 200);
  if (!kind || !prompt || !answer) return null;
  const options = arr(q.options).map((o) => str(o, 120)).filter(Boolean).slice(0, 8);
  if (kind === "choice" && (options.length < 2 || !options.includes(answer))) return null;
  if (kind === "order") {
    const words = (s: string) => s.split(/\s+/).filter(Boolean).sort().join(" ");
    if (options.length < 2 || words(options.join(" ")) !== words(answer)) return null;
  }
  const objective = Number.isInteger(q.objective) && (q.objective as number) >= 0 && (q.objective as number) < objectives
    ? (q.objective as number) : 0;
  return {
    id: `q${i + 1}`, kind, prompt, prompt_vi: str(q.prompt_vi, 400),
    options: kind === "gap" ? [] : options, answer,
    ...(kind === "gap" ? { accept: arr(q.accept).map((a) => str(a, 200)).filter(Boolean).slice(0, 6) } : {}),
    explain: str(q.explain, 400), explain_vi: str(q.explain_vi, 400), objective,
  };
}

/** The transcript line a quote comes from: exact (folded) containment, nearest the model's time. */
function findLine(lines: TranscriptLine[], quoteText: string, t: number): TranscriptLine | null {
  const want = fold(quoteText);
  if (want.length < 2) return null;
  let best: TranscriptLine | null = null;
  for (const l of lines) {
    if (!fold(l.text).includes(want)) continue;
    if (!best || Math.abs(l.t - t) < Math.abs(best.t - t)) best = l;
  }
  return best;
}

/** The model's reply, checked against the records; the draft body as saved. */
export function cleanDraft(raw: unknown, ctx: DraftContext, workText: Map<string, string>) {
  const r = obj(raw);
  const lines = ctx.transcript ?? [];
  const lesson = obj(r.lesson);
  const objectives = arr(r.objectives).map((v) => {
    const o = obj(v);
    return { text: str(o.text, 300), text_vi: str(o.text_vi, 300),
      met: MET.includes(str(o.met)) ? str(o.met) : "unknown", evidence: str(o.evidence, 500) };
  }).filter((o) => o.text).slice(0, 4);

  const quoteOk = (e: Record<string, unknown>) => {
    const text = str(e.quote, 500);
    if (!text) return null;
    const line = findLine(lines, text, Number(e.t) || 0);
    if (line) return { t: line.t, quote: text };
    // Seen in children's work only: the quote must be in that work's OCR text.
    const f = fold(text);
    for (const w of workText.values()) if (f.length >= 2 && fold(w).includes(f)) return { t: -1, quote: text };
    return null;
  };
  const gaps = arr(r.gaps).map((v) => {
    const g = obj(v);
    const evidence = arr(g.evidence).map((e) => quoteOk(obj(e))).filter((e): e is { t: number; quote: string } => !!e).slice(0, 4);
    return { issue: str(g.issue, 400), kind: GAP_KINDS.includes(str(g.kind)) ? str(g.kind) : "gap",
      who: str(g.who) === "class" ? "class" : "some", evidence, suggestion: str(g.suggestion, 400) };
  }).filter((g) => g.issue && g.evidence.length > 0).slice(0, 10);

  const seen = new Set<string>();
  const byChild = new Map<string, Record<string, unknown>>();
  for (const v of arr(r.students)) {
    const s = obj(v);
    const id = str(s.student_id, 40);
    if (ctx.enrolled.has(id) && !seen.has(id)) { seen.add(id); byChild.set(id, s); }
  }
  // Every enrolled child gets a part: the records are theirs whatever the model said.
  const students = [...ctx.enrolled].map((id) => {
    const s = byChild.get(id) ?? {};
    const work_ids = [...new Set(arr(s.work_ids).map((w) => str(w, 40)))].filter((w) => ctx.workOwner.get(w) === id);
    for (const [w, owner] of ctx.workOwner) if (owner === id && !work_ids.includes(w)) work_ids.push(w);
    const name_moments = ctx.transcript ? arr(s.name_moments).flatMap((m) => {
      const o = obj(m);
      const text = str(o.quote, 500);
      const line = text ? findLine(lines, text, Number(o.t) || 0) : null;
      return line ? [{ t: line.t, quote: text, why: str(o.why, 300) }] : [];
    }).slice(0, 5) : [];
    const att = ctx.attendance.get(id);
    return {
      student_id: id,
      highlight: str(s.highlight, 600), highlight_vi: str(s.highlight_vi, 600),
      focus_next: str(s.focus_next, 600), focus_next_vi: str(s.focus_next_vi, 600),
      work_ids, points: ctx.points.get(id) ?? 0,
      attendance: att && ATTENDANCE.includes(att) ? att : "unknown",
      name_moments,
    };
  });

  const captions = new Map<string, Record<string, unknown>>();
  for (const v of arr(r.photos)) { const p = obj(v); const id = str(p.photo_id, 40); if (ctx.photos.has(id)) captions.set(id, p); }
  const photos = [...ctx.photos].map(([id, p]) => {
    const c = captions.get(id) ?? {};
    return { photo_id: id, share: SHARE_BY_DEFAULT.has(p.kind),
      caption: str(c.caption, 300) || (p.caption ?? ""), caption_vi: str(c.caption_vi, 300) };
  });

  const quiz = obj(r.quiz);
  const questions = arr(quiz.questions).map((q, i) => cleanQuestion(q, i, Math.max(1, objectives.length)))
    .filter((q): q is NonNullable<typeof q> => !!q).slice(0, 8).map((q, i) => ({ ...q, id: `q${i + 1}` }));
  const parents = obj(r.parents);

  return {
    schema: DRAFT_SCHEMA_ID,
    lesson: { title: str(lesson.title, 200), title_vi: str(lesson.title_vi, 200),
      summary: str(lesson.summary, 1500), summary_vi: str(lesson.summary_vi, 1500) },
    objectives,
    taught: arr(r.taught).map((v) => { const o = obj(v); return { topic: str(o.topic, 200), detail: str(o.detail, 600), detail_vi: str(o.detail_vi, 600) }; })
      .filter((o) => o.topic).slice(0, 10),
    words: arr(r.words).map((v) => { const o = obj(v); return { en: str(o.en, 80), vi: str(o.vi, 120), example: str(o.example, 200) }; })
      .filter((o) => o.en).slice(0, 25),
    structures: arr(r.structures).map((v) => { const o = obj(v); return { pattern: str(o.pattern, 160), example: str(o.example, 200) }; })
      .filter((o) => o.pattern).slice(0, 10),
    activities: arr(r.activities).map((v) => { const o = obj(v); return { name: str(o.name, 160), description: str(o.description, 600), description_vi: str(o.description_vi, 600) }; })
      .filter((o) => o.name).slice(0, 10),
    gaps,
    class_focus: arr(r.class_focus).map(enVi).filter((o) => o.en).slice(0, 6),
    students,
    parents: {
      tips: arr(parents.tips).map(enVi).filter((o) => o.en).slice(0, 4),
      ask_your_child: arr(parents.ask_your_child).map(enVi).filter((o) => o.en).slice(0, 4),
      next_lesson: enVi(parents.next_lesson),
    },
    homework: ctx.homework.map((h) => ({ homework_id: h.homework_id, title: h.title, due_date: h.due_date })),
    photos,
    quiz: { title: str(quiz.title, 200) || "Lesson review", questions },
    speaking: cleanSpeaking(arr(r.speaking), ctx.speaking ?? null),
    sources: {
      transcript: !!ctx.transcript, transcript_lines: lines.length, ...(ctx.transcriptNote ? { transcript_note: ctx.transcriptNote } : {}),
      photos: ctx.photos.size, works: ctx.workCount, attendance: ctx.attendance.size,
      points: [...ctx.points.values()].filter((p) => p !== 0).length,
    },
  };
}

// ------------------------------------------------------------------ speaking at the end of the lesson
/* Owner, 26 Nov 2026: the class report grades each child's speaking toward the END of the lesson, only for
 * a child whose speech there was captured whole and can be tied to them. Three conditions, all checked here
 * from records and never from the model: (1) the recording is complete through the end (the room track runs
 * to within a minute of the lesson's end and the recorder marked no gap inside the window); (2) the child was
 * Present or Late; (3) the lines are THEIRS: the teacher tapped them as speaking, and the machine did not doubt
 * the words. A child with fewer than SPEAKING_MIN_LINES such lines / SPEAKING_MIN_WORDS words is "not graded"
 * with the reason, never given a grade from too little. The score is the mean of the criteria the model could
 * back with a quote from the child's own lines; the model's words are a comment, its numbers are checked. */

export const SPEAKING_WINDOW_S = 20 * 60;
export const SPEAKING_MIN_LINES = 3;
export const SPEAKING_MIN_WORDS = 20;
export const SPEAKING_COVERAGE_SLACK_S = 60;
export const SPEAKING_MIN_CRITERIA = 2;

export type NotGradedReason = "absent" | "recording_incomplete" | "not_identified" | "too_little_speech" | "not_enough_evidence";
export interface SpeakingEvidence {
  from_s: number;
  to_s: number;
  complete: boolean;
  /** Why the window is not whole (null when it is). */
  incomplete_reason: string | null;
  children: { student_id: string; words: number; lines: { t: number; text: string }[] }[];
  not_graded: { student_id: string; reason: NotGradedReason }[];
}

const wordCount = (s: string) => (s.match(/[\p{L}\p{N}']+/gu) ?? []).length;

/**
 * Who can be graded, from the lesson monitor report's body (its lines, coverage, flags and duration).
 * Null when there is no monitor body (a pasted transcript has no tapped speakers or coverage to rely on).
 */
export function speakingEvidence(monitorBody: unknown, lines: TranscriptLine[], enrolled: Set<string>,
                                 attendance: Map<string, string>): SpeakingEvidence | null {
  const b = obj(monitorBody);
  if (!Object.keys(b).length) return null;
  const duration = Number(obj(b.lesson).duration_s);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const to = duration, from = Math.max(0, duration - SPEAKING_WINDOW_S);
  const roomUntil = obj(b.coverage).room_until_s;
  const gapInWindow = arr(b.flags).some((f) => {
    const o = obj(f);
    return o.kind === "recorder_gap" && typeof o.t === "number" && o.t >= from - 30 && o.t <= to;
  });
  let incomplete: string | null = null;
  if (typeof roomUntil !== "number") incomplete = "The room microphone has no recording for this lesson.";
  else if (roomUntil < duration - SPEAKING_COVERAGE_SLACK_S) incomplete = "The recording stops before the end of the lesson.";
  else if (gapInWindow) incomplete = "The recorder marked a gap in the last part of the lesson.";

  const children: SpeakingEvidence["children"] = [];
  const not_graded: SpeakingEvidence["not_graded"] = [];
  for (const id of enrolled) {
    const att = attendance.get(id);
    if (att === "Absent" || att === "Excused") { not_graded.push({ student_id: id, reason: "absent" }); continue; }
    if (incomplete) { not_graded.push({ student_id: id, reason: "recording_incomplete" }); continue; }
    const own = lines.filter((l) => !l.teacher && l.m === id && !l.unsure && l.t >= from && l.t <= to + 30);
    const tapped = lines.some((l) => !l.teacher && l.m === id && l.t >= from);
    if (!tapped) { not_graded.push({ student_id: id, reason: "not_identified" }); continue; }
    const words = own.reduce((n, l) => n + wordCount(l.text), 0);
    if (own.length < SPEAKING_MIN_LINES || words < SPEAKING_MIN_WORDS) { not_graded.push({ student_id: id, reason: "too_little_speech" }); continue; }
    children.push({ student_id: id, words, lines: own.slice(0, 40).map((l) => ({ t: Math.round(l.t), text: l.text })) });
  }
  return { from_s: Math.round(from), to_s: Math.round(to), complete: !incomplete, incomplete_reason: incomplete, children, not_graded };
}

/** The model's speaking scores, checked: a score counts only with a quote that is in THAT child's own lines. */
export function cleanSpeaking(raw: unknown[], ev: SpeakingEvidence | null) {
  if (!ev) return null;
  const byChild = new Map(ev.children.map((c) => [c.student_id, c]));
  const said = new Map<string, Record<string, unknown>>();
  for (const v of raw) { const o = obj(v); const id = str(o.student_id, 40); if (byChild.has(id) && !said.has(id)) said.set(id, o); }
  const graded: {
    student_id: string; average: number; score: number; words: number; comment: string;
    criteria: { criterion: string; score: number; t: number; quote: string }[];
  }[] = [];
  const not_graded = [...ev.not_graded];
  for (const c of ev.children) {
    const o = said.get(c.student_id) ?? {};
    const own: TranscriptLine[] = c.lines.map((l) => ({ t: l.t, text: l.text, teacher: false }));
    const seen = new Set<string>();
    const criteria = arr(o.criteria).flatMap((x) => {
      const k = obj(x);
      const name = str(k.criterion, 20), score = Number(k.score), text = str(k.quote, 400);
      if (!SPEAKING_CRITERIA.includes(name) || seen.has(name) || !Number.isInteger(score) || score < 1 || score > 4) return [];
      const line = text ? findLine(own, text, 0) : null;
      if (!line) return [];
      seen.add(name);
      return [{ criterion: name, score, t: line.t, quote: text }];
    });
    if (criteria.length < SPEAKING_MIN_CRITERIA) { not_graded.push({ student_id: c.student_id, reason: "not_enough_evidence" }); continue; }
    const average = Math.round((criteria.reduce((n, k) => n + k.score, 0) / criteria.length) * 10) / 10;
    graded.push({ student_id: c.student_id, average, score: Math.round((average / 4) * 100), words: c.words,
      comment: str(o.comment, 400), criteria });
  }
  return { from_s: ev.from_s, to_s: ev.to_s, complete: ev.complete, incomplete_reason: ev.incomplete_reason, graded, not_graded };
}

/** "[mm:ss] T: text" lines for the prompt. */
export function transcriptText(lines: TranscriptLine[]): string {
  const mmss = (s: number) => { const r = Math.max(0, Math.round(s)); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`; };
  return lines.map((l) => `[${mmss(l.t)} t=${Math.round(l.t)}] ${l.teacher ? "T" : "S"}: ${l.text}`).join("\n");
}

/** The lesson monitor report's lines, in order. */
export function readTranscript(body: unknown, maxLines = 2500): TranscriptLine[] {
  // A line is the teacher's only when the report says the teacher wore the "teacher" microphone
  // (owner, 28 Nov 2026: until then the lapels sat by the children, so who:"T" meant a child near a lapel).
  // Mirrors micRolesKnown in src/lib/lessonMonitor.ts.
  const micsKnown = obj(obj(body).mics).teacher_worn === true;
  return arr(obj(body).lines).flatMap((x) => {
    const l = obj(x);
    const t = typeof l.t === "number" && Number.isFinite(l.t) ? l.t : null;
    const text = str(l.text, 500);
    const m = str(l.m, 40);
    return t === null || !text ? [] : [{ t, text, teacher: micsKnown && l.who === "T", ...(m ? { m } : {}), ...(l.u === true || l.f === true ? { unsure: true } : {}) }];
  }).sort((a, b) => a.t - b.t).slice(0, maxLines);
}

/** Hanoi has no daylight saving: a lesson's local date and time is +07:00. */
export function lessonWindow(date: string, start: string, end: string, afterMinutes = 30) {
  const at = (t: string) => new Date(`${date}T${t.length === 5 ? t + ":00" : t.slice(0, 8)}+07:00`);
  const from = at(start), to = at(end);
  return { from: from.toISOString(), to: new Date(to.getTime() + afterMinutes * 60_000).toISOString() };
}

/* ------------------------------------------------------------------ a transcript the teacher pasted
 * Owner, 25 Nov 2026: a transcript pasted into Record & transcripts feeds the report exactly as the
 * lesson monitor's does: the same TranscriptLine[], the same prompt, the same quote checks. No name
 * rides along: a line is the teacher's ("T") or someone else's. Mirrors parseSpokenTranscript in
 * src/lib/sessionClassReport.ts (the browser's reading of the same text); this file imports nothing. */

const PT_TIME = /^\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?$/;
const PT_CUE = /^(\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d+)?\s*-->\s*(\d{1,2}:)?\d{2}:\d{2}(?:[.,]\d+)?/;
const PT_LABELLED = /^([A-Za-z\u00C0-\u1EF9][^:\n]{0,39}?):\s+(.*)$/;
const ptSeconds = (stamp: string): number | null => {
  const m = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:[.,](\d+))?/.exec(stamp.trim());
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + (m[4] ? Number(`0.${m[4]}`) : 0) : null;
};
const ptFold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Is this speaker label the lesson's teacher? "Teacher", or the teacher's own name (full, or two parts of it). */
export function pastedLabelIsTeacher(label: string, teacherNames: string[]): boolean {
  const a = ptFold(label);
  if (!a) return false;
  if (a === "teacher") return true;
  for (const n of teacherNames) {
    const b = ptFold(n);
    if (!b) continue;
    if (a === b) return true;
    const ap = a.split(" "), bp = b.split(" ");
    const shared = ap.filter((p) => bp.includes(p)).length;
    if (shared >= 2 || (ap.length === 1 && shared === 1 && bp.length >= 2)) return true;
  }
  return false;
}

/**
 * The lines of a pasted transcript (WebVTT, SRT, "Name: text" from Meet/Zoom, Otter, or plain text).
 * A line with no clock time gets its position as its time, so order is kept and a quote can still be found.
 * Plain text with no speaker labels is read line by line, every line someone else's.
 */
export function readPastedTranscript(raw: unknown, teacherNames: string[] = [], maxLines = 2500): TranscriptLine[] {
  const lines = String(typeof raw === "string" ? raw : "").split(/\r?\n/).map((l) => l.trim());
  const seen = new Map<string, number>();
  for (const line of lines) {
    const l = PT_LABELLED.exec(line);
    if (l && !/^https?$/i.test(l[1]) && !/\d{1,2}:\d{2}/.test(l[1])) seen.set(l[1].trim(), (seen.get(l[1].trim()) ?? 0) + 1);
  }
  const speakers = new Set([...seen].filter(([, n]) => n >= 3).map(([k]) => k));

  type Turn = { speaker: string | null; text: string; t: number | null };
  const turns: Turn[] = [];
  let clock: number | null = null;
  let last: Turn | null = null;
  let labelled = false;
  const start = (speaker: string | null, text: string) => { last = { speaker, text, t: clock }; if (speaker) labelled = true; if (text || speaker) turns.push(last); };
  for (const line of lines) {
    if (!line || line === "WEBVTT" || /^NOTE\b/.test(line) || /^\d+$/.test(line)) continue;
    if (PT_CUE.test(line)) { clock = ptSeconds(line); continue; }
    if (PT_TIME.test(line)) { clock = ptSeconds(line) ?? clock; continue; }
    const v = /^<v\s+([^>]+)>(.*?)(?:<\/v>)?$/.exec(line);
    if (v) { start(v[1].trim(), v[2].trim()); continue; }
    const o = /^([A-Za-z][\w .'-]{0,30}?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)$/.exec(line);
    if (o) { clock = ptSeconds(o[2]); labelled = true; last = { speaker: o[1].trim(), text: "", t: clock }; turns.push(last); continue; }
    const l = PT_LABELLED.exec(line);
    if (l && speakers.has(l[1].trim())) { start(l[1].trim(), l[2].trim()); continue; }
    if (last && labelled) { (last as Turn).text = `${(last as Turn).text} ${line}`.trim(); continue; }
    start(null, line); // plain text: one line, one turn
  }
  return turns
    .filter((t) => t.text)
    .slice(0, maxLines)
    .map((t, i) => ({ t: t.t ?? i, text: t.text.slice(0, 500), teacher: t.speaker ? pastedLabelIsTeacher(t.speaker, teacherNames) : false }));
}

export interface PastedRow { id: string; session_id?: string | null; transcript_date?: string | null; status?: string | null; raw_text?: string | null; analysis?: unknown }

/**
 * Which pasted transcript belongs to a lesson: one a person filed under it (stored session_id, or the
 * choice kept in analysis.session_match), else one dated that day when the class had exactly ONE lesson that
 * day and the transcript is not filed anywhere else. The fullest analysed text wins.
 */
export function pickPastedTranscript(rows: PastedRow[], sessionId: string, sessionDate: string, lessonsThatDay: number): PastedRow | null {
  const usable = rows.filter((r) => String(r.raw_text ?? "").trim().length >= 200).filter((r) => {
    const m = obj(obj(r.analysis).session_match);
    const chosen = "session_id" in m ? (typeof m.session_id === "string" ? m.session_id : null) : undefined;
    if (r.session_id) return r.session_id === sessionId;
    if (chosen !== undefined) return chosen === sessionId;
    return lessonsThatDay === 1 && r.transcript_date === sessionDate;
  });
  usable.sort((a, b) => (Number(b.status === "analyzed") - Number(a.status === "analyzed")) || (String(b.raw_text).length - String(a.raw_text).length));
  return usable[0] ?? null;
}
