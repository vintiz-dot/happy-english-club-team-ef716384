// What differs between the courses the decks are written for. Imports nothing
// (scripts/pgtest/lesson-decks-lib.test.mjs loads it on its own).
//
// A new course gets a row here, and the suite applies its rules to every deck of
// that course; units of the other courses keep theirs.

export type CurriculumRule = {
  name: string; // what the Unit menu and the class book picker show
  levelWord: string; // "Level" (a book level) or "Year" (a programme year)
  unitWord: string; // "Unit" or "Term"
  levels: number[];
  maxMinutes: number; // the longest a lesson may be planned for
  citesBook: boolean; // every deck names the Student Book / Workbook pages it covers
  coversBookLesson: boolean; // every deck says which curriculum_lessons row it teaches
  tiered: boolean; // every task slide offers Support, Core and Stretch
};

export const CURRICULA = {
  "oxford-discover-2e": {
    name: "Oxford Discover 2nd edition", levelWord: "Level", unitWord: "Unit", levels: [1, 2, 3, 4, 5, 6],
    maxMinutes: 90, citesBook: true, coversBookLesson: true, tiered: false,
  },
  "reach-higher": {
    name: "Reach Higher", levelWord: "Level", unitWord: "Unit", levels: [1, 2, 3, 4, 5, 6],
    maxMinutes: 90, citesBook: true, coversBookLesson: true, tiered: false,
  },
  "hec-ielts-sl": {
    name: "HEC IELTS Speaking & Listening", levelWord: "Year", unitWord: "Term", levels: [1, 2],
    maxMinutes: 120, citesBook: false, coversBookLesson: false, tiered: true,
  },
} satisfies Record<string, CurriculumRule>;

export type CurriculumId = keyof typeof CURRICULA;

export function ruleFor(curriculum: string): CurriculumRule | null {
  return (CURRICULA as Record<string, CurriculumRule>)[curriculum] ?? null;
}

/** "Oxford Discover 3 · Unit 12" / "HEC IELTS Speaking & Listening Year 1 · Term 1". */
export function unitLabel(u: { curriculum: string; level: number; unit: number; title: string }): string {
  if (u.curriculum === "oxford-discover-2e") return `Oxford Discover ${u.level} · Unit ${u.unit}: ${u.title}`;
  const r = ruleFor(u.curriculum);
  return r ? `${r.name} ${r.levelWord} ${u.level} · ${r.unitWord} ${u.unit}: ${u.title}` : `${u.curriculum} ${u.level}.${u.unit}: ${u.title}`;
}
