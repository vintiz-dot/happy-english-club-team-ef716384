/**
 * The lesson review quiz (stage C of lesson reports): pure helpers for the
 * child's player and the teacher's read-only view. The DATABASE marks
 * (`submit_lesson_review`); nothing here decides a score. `normaliseAnswer`
 * mirrors the SQL rule only so the player can tell a child "you've written
 * something" and so the rule is tested in one place.
 */
export type QuizKind = "choice" | "gap" | "order";

export interface QuizQuestion {
  id: string;
  kind: QuizKind;
  prompt: string;
  prompt_vi?: string | null;
  options?: string[] | null;
}

export interface QuizQuestionResult {
  id: string;
  correct: boolean;
  your_answer: string | null;
  answer: string;
  explain?: string | null;
  explain_vi?: string | null;
}

export interface QuizSubmission {
  score: number;
  total: number;
  points_awarded: number;
  attempts: number;
  results: QuizQuestionResult[];
  can_retake: boolean;
}

export interface LessonQuiz {
  homework_id: string;
  title: string;
  due_date: string | null;
  points: number;
  questions: QuizQuestion[];
  submission: QuizSubmission | null;
}

/** The answers the player holds: choice/gap a string, order the tapped pieces in order. */
export type QuizAnswer = string | string[];
export type QuizAnswers = Record<string, QuizAnswer>;

/** Trimmed, case-folded, inner spaces collapsed, trailing . ! ? dropped (the SQL rule). */
export function normaliseAnswer(text: string | null | undefined): string {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .trim();
}

/** What the child has written or tapped, as one string (pieces joined by one space). */
export function answerText(a: QuizAnswer | undefined): string {
  if (Array.isArray(a)) return a.join(" ");
  return a ?? "";
}

export function isAnswered(q: QuizQuestion, a: QuizAnswer | undefined): boolean {
  if (q.kind === "order") return Array.isArray(a) && a.length === (q.options?.length ?? 0) && a.length > 0;
  return normaliseAnswer(answerText(a)) !== "";
}

/** Move a tapped piece (by its index in the shuffled options) in or out of the sentence being built. */
export function toggleOrderPiece(picked: number[], index: number): number[] {
  return picked.includes(index) ? picked.filter((i) => i !== index) : [...picked, index];
}

export function piecesFor(q: QuizQuestion, picked: number[]): string[] {
  return picked.map((i) => (q.options ?? [])[i]).filter((p) => p !== undefined);
}

export function unansweredCount(questions: QuizQuestion[], answers: QuizAnswers): number {
  return questions.filter((q) => !isAnswered(q, answers[q.id])).length;
}

/** What is sent: only the questions the child answered (a blank is simply wrong in SQL). */
export function answersPayload(questions: QuizQuestion[], answers: QuizAnswers): QuizAnswers {
  const out: QuizAnswers = {};
  for (const q of questions) if (isAnswered(q, answers[q.id])) out[q.id] = answers[q.id];
  return out;
}

export type ResultTone = "perfect" | "good" | "keep-going";

/** The headline a child sees, English first with Vietnamese under it. */
export function resultHeadline(score: number, total: number): { tone: ResultTone; en: string; vi: string; stars: number } {
  const ratio = total > 0 ? score / total : 0;
  if (ratio >= 1) return { tone: "perfect", en: "Perfect! Every answer right!", vi: "Tuyệt vời! Em đúng hết rồi!", stars: 3 };
  if (ratio >= 0.6) return { tone: "good", en: "Great job!", vi: "Giỏi lắm!", stars: 2 };
  return { tone: "keep-going", en: "Good try! Look at the answers and try again.", vi: "Cố gắng lắm! Xem đáp án rồi thử lại nhé.", stars: 1 };
}

/** "7/8" -> 7 of 8, for the teacher's list; null when it is not a quiz grade. */
export function parseQuizGrade(grade: string | null | undefined): { score: number; total: number } | null {
  const m = /^(\d+)\/(\d+)$/.exec(String(grade ?? "").trim());
  return m ? { score: Number(m[1]), total: Number(m[2]) } : null;
}
