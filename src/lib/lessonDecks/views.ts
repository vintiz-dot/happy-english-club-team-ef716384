// Ways of looking at a unit besides "deck by deck". Imports nothing at run time
// (scripts/pgtest/lesson-decks-lib.test.mjs loads it on its own).
//
// - grammarDeck: a lesson's grammar on its own (the grammar slide, the activities
//   tagged Grammar and the speaking that practises it), for a short revision
//   lesson or a catch-up.
// - unitPlan: the order a class meets a unit in, with the end-of-unit test on the
//   class date after its lesson, so the pacing guide dates it like a lesson.
// - homeworkFor: which version of a creative homework a child gets.
// - classBook / bookLabel: the course book a class uses, kept in classes.curriculum
//   as a readable label (families may see it) that the app can still parse.
import type { Assessment, CreativeTask, Curriculum, Deck, Slide, Unit } from "./types";

type Creative = Extract<Slide, { kind: "creative" }>;

/** The grammar part of a deck, or null when the deck teaches no grammar point. */
export function grammarDeck(deck: Deck): Deck | null {
  const grammar = deck.slides.filter((s) => s.kind === "grammar");
  if (grammar.length === 0) return null;
  const point = (grammar[0] as Extract<Slide, { kind: "grammar" }>).title;
  const keep = deck.slides.filter(
    (s) =>
      s.kind === "grammar" ||
      (s.kind === "activity" && s.tag === "Grammar") ||
      (s.kind === "speaking" && /\bas\b.*\bas\b|its|it's/i.test(JSON.stringify(s.frames))),
  );
  return {
    ...deck,
    id: `${deck.id}-grammar`,
    title: `Grammar: ${point}`,
    minutes: Math.min(deck.minutes, keep.reduce((a, s) => a + ("minutes" in s && typeof s.minutes === "number" ? s.minutes : 0), 0) || 30),
    resources: (deck.resources ?? []).filter((r) => keep.some((s) => "title" in s && s.title === r.slide)),
    slides: [{ kind: "title", title: point, subtitle: `Grammar · from Lesson ${deck.lesson}` }, ...keep],
  };
}

export type PlanItem = { kind: "deck"; deck: Deck } | { kind: "test"; assessment: Assessment };

/** Decks in order, each summative test straight after the lesson it follows. */
export function unitPlan(unit: Unit): PlanItem[] {
  const out: PlanItem[] = [];
  const tests = (unit.assessments ?? []).filter((a) => a.kind === "summative");
  for (const deck of unit.decks) {
    out.push({ kind: "deck", deck });
    for (const t of tests) if (t.afterLesson === deck.lesson) out.push({ kind: "test", assessment: t });
  }
  for (const t of tests) if (!unit.decks.some((d) => d.lesson === t.afterLesson)) out.push({ kind: "test", assessment: t });
  return out;
}

/** Formative checks run inside a deck: which deck carries each one. */
export function checksIn(deck: Deck): string[] {
  return deck.slides.flatMap((s) => (s.kind === "check" ? [s.assessment] : []));
}

/**
 * The version of a creative homework for one child. `interests` maps an interest
 * ("football") to the student ids an admin or teacher chose for this class. A
 * child in more than one group gets the first variant the slide lists.
 */
export function homeworkFor(slide: Creative, studentId: string, interests: Record<string, string[]> | null | undefined): { task: CreativeTask; label: string | null; interest: string | null } {
  for (const v of slide.variants ?? []) {
    const ids = interests?.[v.interest];
    if (Array.isArray(ids) && ids.includes(studentId)) return { task: v.task, label: v.label, interest: v.interest };
  }
  return { task: slide.base, label: null, interest: null };
}

/** Interests a unit's homework has variants for, in first-seen order. */
export function unitInterests(unit: Unit): { interest: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const d of unit.decks) for (const s of d.slides) if (s.kind === "creative") for (const v of s.variants ?? []) if (!seen.has(v.interest)) seen.set(v.interest, v.label);
  return [...seen].map(([interest, label]) => ({ interest, label }));
}

/** Keep only well-formed interest groups (an object of string arrays), deduplicated. */
export function cleanInterests(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z][a-z0-9-]{0,30}$/.test(k) || !Array.isArray(v)) continue;
    const ids = [...new Set(v.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)))];
    if (ids.length) out[k] = ids;
  }
  return out;
}

// ---------------------------------------------------------------- class books

export type BookChoice = { curriculum: Curriculum; level: number };

// Names and level words match CURRICULA in curricula.ts (kept here as data so this
// file still imports nothing at run time).
export const BOOKS: { curriculum: Curriculum; name: string; levelWord: "Level" | "Year"; levels: number[] }[] = [
  { curriculum: "oxford-discover-2e", name: "Oxford Discover 2nd edition", levelWord: "Level", levels: [1, 2, 3, 4, 5, 6] },
  // One Reach Higher level is two books (3A: Units 1-4, 3B: Units 5-8); a class picks the level.
  { curriculum: "reach-higher", name: "Reach Higher", levelWord: "Level", levels: [1, 2, 3, 4, 5, 6] },
  { curriculum: "hec-ielts-sl", name: "HEC IELTS Speaking & Listening", levelWord: "Year", levels: [1, 2] },
];

/** The label stored in classes.curriculum: "Oxford Discover 2nd edition, Level 3", "HEC IELTS Speaking & Listening, Year 1". */
export function bookLabel(b: BookChoice): string {
  const book = BOOKS.find((x) => x.curriculum === b.curriculum);
  return `${book?.name ?? b.curriculum}, ${book?.levelWord ?? "Level"} ${b.level}`;
}

/** Read classes.curriculum back. Older free text ("Oxford Discover 2", "OD3") reads as null. */
export function classBook(curriculum: string | null | undefined): BookChoice | null {
  const text = (curriculum ?? "").trim().toLowerCase();
  for (const b of BOOKS) {
    const prefix = `${b.name}, ${b.levelWord}`.toLowerCase();
    if (!text.startsWith(prefix)) continue;
    const m = /^\s*(\d)\s*$/.exec(text.slice(prefix.length));
    const level = m ? Number(m[1]) : NaN;
    return b.levels.includes(level) ? { curriculum: b.curriculum, level } : null;
  }
  return null;
}
