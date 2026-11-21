// Course book lessons (public.curriculum_lessons): their order through a level,
// how to name one, and which comes next. Imports nothing, so
// scripts/pgtest/curriculum-lessons.test.mjs loads it on its own.
//
// Oxford Discover runs in unit pairs: the pair's Big Question page, then each
// unit's Get Ready, Read, Understand, Communicate, then the pair's Wrap Up.

export type CurriculumLesson = {
  id: string;
  curriculum: string;
  level: number;
  unit_from: number;
  unit_to: number;
  lesson: string;
  sb_page: number | null;
  objectives: string[];
  vocabulary: string[];
  words_in_context: string[];
  reading_strategy: string | null;
  grammar: string | null;
  focus: Record<string, string>;
  big_question: string | null;
};

const IN_UNIT = ["Get Ready", "Read", "Understand", "Communicate"];

/** A number that puts lessons in book order within a level. */
export function lessonRank(l: Pick<CurriculumLesson, "unit_from" | "unit_to" | "lesson">): number {
  if (l.lesson === "Big Question") return l.unit_from * 10;
  if (l.lesson === "Wrap Up") return l.unit_to * 10 + 9;
  const i = IN_UNIT.indexOf(l.lesson);
  return l.unit_from * 10 + 1 + (i < 0 ? 4 : i);
}

export function sortLessons<T extends Pick<CurriculumLesson, "level" | "unit_from" | "unit_to" | "lesson">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.level - b.level || lessonRank(a) - lessonRank(b));
}

export function lessonLabel(l: Pick<CurriculumLesson, "unit_from" | "unit_to" | "lesson" | "sb_page">): string {
  const unit = l.unit_to > l.unit_from ? `Units ${l.unit_from}-${l.unit_to}` : `Unit ${l.unit_from}`;
  return `${unit} · ${l.lesson}${l.sb_page ? ` (SB p. ${l.sb_page})` : ""}`;
}

/** The lesson after `lastId` in the same level, or the level's first lesson when there is no last one. */
export function nextLesson<T extends Pick<CurriculumLesson, "id" | "level" | "unit_from" | "unit_to" | "lesson">>(rows: T[], lastId: string | null): T | null {
  const sorted = sortLessons(rows);
  if (!lastId) return sorted[0] ?? null;
  const i = sorted.findIndex((r) => r.id === lastId);
  if (i < 0) return sorted[0] ?? null;
  const next = sorted[i + 1];
  return next && next.level === sorted[i].level ? next : null;
}

/** The level a class is on, when its curriculum says so ("Oxford Discover 3", "OD3", "Level 3"). */
export function levelFromCurriculum(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(?:discover|od|level)\s*(\d{1,2})\b/i);
  return m ? Number(m[1]) : null;
}
