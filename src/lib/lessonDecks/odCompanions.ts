// The Oxford Discover 2nd edition companion books for each Student Book unit,
// Levels 1-3: the Grammar Book unit (and its module review) and the Writing &
// Spelling Book module (and its Spelling Master Class page). Page numbers come
// from the publisher's 2nd-edition answer keys for those books (owner's copies,
// 23 Nov 2026); the grammar labels are the school's own short wording.
//
// Both books follow the Student Book: Grammar Book Unit n goes with Student Book
// Unit n, and Writing & Spelling Module m with Units 2m-1 and 2m. Only page
// numbers and our labels live here: no book text, answers or audio.

export type CompanionRef = {
  book: "Grammar Book" | "Writing & Spelling Book" | "Student's Writing Resource";
  label: string; // "Unit 9" / "Module 5"
  pages: string; // "49-52"
  note: string; // what it is for, in the school's words
};

// Grammar Book point per unit, in our words. "also" = a point the Grammar Book
// adds that the unit's Grammar Champions lesson does not teach: a stretch.
const GRAMMAR: Record<number, { point: string; also?: string }[]> = {
  1: [
    { point: "be: I'm, he's, they're; isn't and aren't" },
    { point: "be in questions; this, that, these, those" },
    { point: "there is and there are" },
    { point: "in, on, under, next to" },
    { point: "Where is ...? Where are ...?" },
    { point: "What's this? Who's this?", also: "a and an" },
    { point: "he, she, it + verb-s, and doesn't" },
    { point: "I, you, we, they + verb, don't, and Do you ...?" },
    { point: "have and has, don't have" },
    { point: "Do you have ...? What do you have?" },
    { point: "present simple: every form" },
    { point: "Does he ...? What does she ...?" },
    { point: "owner + 's, and Is it ...'s?" },
    { point: "my, your, his, her, its, our, their" },
    { point: "am, is, are + -ing, and not" },
    { point: "Is she ...ing? What are they ...ing?" },
    { point: "can and can't, Can you ...?" },
    { point: "should and shouldn't, Should I ...?" },
  ],
  2: [
    { point: "I/me, he/him, they/them" },
    { point: "always, usually, sometimes, never" },
    { point: "was and were, wasn't and weren't" },
    { point: "Was it ...? Were they ...?" },
    { point: "past -ed verbs, and didn't" },
    { point: "Did you ...? with -ed verbs" },
    { point: "irregular past: went, saw, ate" },
    { point: "past questions, all together" },
    { point: "mine, yours, his, hers, ours, theirs" },
    { point: "Can I ...? May I ...?", also: "joining with and and but" },
    { point: "behind, between, in front of, across from" },
    { point: "Was there ...? Where were ...?" },
    { point: "in, on, at for time" },
    { point: "past + yesterday, last week, ago" },
    { point: "-er and more: comparing two" },
    { point: "-est and most: the top one" },
    { point: "count and non-count; some, any, a lot of" },
    { point: "How much ...? How many ...?" },
  ],
  3: [
    { point: "adjectives; -ed and -ing feelings" },
    { point: "verb + -ing as a thing (gerunds)" },
    { point: "can and could for ability" },
    { point: "if / when + present, present" },
    { point: "was / were + -ing" },
    { point: "past continuous and past simple with when / while" },
    { point: "will for future facts; time words" },
    { point: "going to for plans" },
    { point: "may and might" },
    { point: "count and non-count; a few, a little" },
    { point: "-er / -est and more / most" },
    { point: "(not) as ... as, and questions" },
    { point: "too and either", also: "so and neither" },
    { point: "adverbs; faster, more carefully, the fastest" },
    { point: "a bag of, a cup of: measure words" },
    { point: "adjective + preposition" },
    { point: "prepositions of movement", also: "commands (imperatives)" },
    { point: "present and past; want to, need to, have to" },
  ],
};

// Student's Writing Resource at the back of the Student Book (capitals,
// punctuation, the writing checklist).
const WRITING_RESOURCE: Record<number, string> = { 1: "164-167", 2: "164-167", 3: "173-176" };

const span = (a: number, b: number) => `${a}-${b}`;

/** Grammar Book Unit n: 4 pages from page 13, 9 pages a module (2 units + a 1-page review). */
export function grammarBookPages(unit: number): { pages: string; review: number } {
  const m = Math.ceil(unit / 2);
  const start = 13 + (m - 1) * 9 + (unit % 2 === 0 ? 4 : 0);
  return { pages: span(start, start + 3), review: 13 + (m - 1) * 9 + 8 };
}

/** Writing & Spelling Module m: Levels 1-2 4 pages from page 4, spelling page 39+m; Level 3 6 pages, spelling page 59+m. */
export function writingBookPages(level: number, unit: number): { module: number; pages: string; spelling: number } {
  const m = Math.ceil(unit / 2);
  const size = level >= 3 ? 6 : 4;
  const start = 4 + (m - 1) * size;
  return { module: m, pages: span(start, start + size - 1), spelling: (level >= 3 ? 59 : 39) + m };
}

/** The companion-book pages for an Oxford Discover 2e unit (Levels 1-3), or [] for any other. */
export function odCompanions(curriculum: string, level: number, unit: number): CompanionRef[] {
  const g = GRAMMAR[level]?.[unit - 1];
  if (curriculum !== "oxford-discover-2e" || !g) return [];
  const gb = grammarBookPages(unit);
  const ws = writingBookPages(level, unit);
  const out: CompanionRef[] = [
    {
      book: "Grammar Book",
      label: `Unit ${unit}`,
      pages: gb.pages,
      note: `${g.point}. Set the practice pages after the Grammar Champions lesson; the Module ${ws.module} Review (p. ${gb.review}) after the pair of units.${g.also ? ` Stretch: the book also covers ${g.also}.` : ""}`,
    },
    {
      book: "Writing & Spelling Book",
      label: `Module ${ws.module}`,
      pages: ws.pages,
      note: `The writing task for Units ${ws.module * 2 - 1}-${ws.module * 2}: read the model, plan, first draft, check, final draft. Spelling Master Class p. ${ws.spelling}.`,
    },
  ];
  if (unit % 2 === 1 && WRITING_RESOURCE[level]) {
    out.push({
      book: "Student's Writing Resource",
      label: "Student Book",
      pages: WRITING_RESOURCE[level],
      note: "Capitals, punctuation and the checklist children use before they hand in writing.",
    });
  }
  return out;
}
