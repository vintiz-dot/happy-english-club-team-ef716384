// Speaking & Writing Lab: a unit's fluency, writing and recorded-talk routines,
// kept in their own file (`src/content/lessonDecks/<unit>/lab.ts`) and put into
// the unit's decks here. The unit file wraps its export:
//
//   export const odL1U10: Unit = withLab(odL1U10Lab, { ...the unit as written... });
//
// so the lessons as their authors wrote them stay readable, and every reader of
// the unit (player, print, suites) sees the lessons with the Lab in them.
//
// A lesson stays a 90-minute lesson: the Lab makes room by shortening (`trim`) or
// leaving out (`drop`) named slides, never the book pages, the grammar, the checks
// or the homework. Anything a Lab names that the deck does not have is reported in
// `unit.lab.issues`, never thrown (a typo must not take the app down); the suites
// fail on it. Imports only types (scripts/pgtest/lesson-decks-lib.test.mjs loads it).

import type { Deck, Slide, Unit } from "./types";

type Vlog = Extract<Slide, { kind: "vlog" }>;

/** Where an added slide goes: after the slide with this title, or after the first slide of a kind ("@grammar", "@homework"). */
export type Anchor = string;

export type DeckLab = {
  /** Lines added to the objectives slide ("I can say ... without stopping."). */
  objectives?: string[];
  /** Slides added, in order; each goes after its anchor (an earlier added slide's title counts). */
  add?: { after: Anchor; slide: Slide }[];
  /** Slides made shorter: title -> new minutes (3 or more, less than now). */
  trim?: Record<string, number>;
  /** Slides left out to make room (games and repeats only), by title. */
  drop?: string[];
  /** The week's recorded talk, placed after the homework slide. */
  talk?: Vlog;
};

export type UnitLab = { decks: Record<string, DeckLab> };

// Kinds a Lab may never shorten or remove: what the book, the tests and the homework rest on.
const KEPT = new Set<Slide["kind"]>(["title", "objectives", "grammar", "book", "check", "exam", "homework", "creative", "reflect", "vocab"]);
const titleOf = (s: Slide): string | undefined => ("title" in s && typeof s.title === "string" ? s.title : undefined);
const minutesOf = (s: Slide): number | undefined => ("minutes" in s && typeof s.minutes === "number" ? s.minutes : undefined);

function findAnchor(slides: Slide[], anchor: Anchor): number {
  if (anchor.startsWith("@")) return slides.findIndex((s) => s.kind === anchor.slice(1));
  return slides.findIndex((s) => titleOf(s) === anchor);
}

/** One deck with its Lab, and what in the Lab did not fit. */
export function applyDeckLab(deck: Deck, lab: DeckLab): { deck: Deck; issues: string[]; added: number } {
  const issues: string[] = [];
  const where = (m: string) => issues.push(`${deck.id}: ${m}`);
  let slides = [...deck.slides];
  const dropped: string[] = [];

  for (const t of lab.drop ?? []) {
    const i = slides.findIndex((s) => titleOf(s) === t);
    if (i < 0) { where(`drop "${t}": no slide with that title`); continue; }
    if (KEPT.has(slides[i].kind) || (slides[i] as { book?: unknown }).book) { where(`drop "${t}": a ${slides[i].kind} slide${(slides[i] as { book?: unknown }).book ? " with book pages" : ""} is kept`); continue; }
    slides.splice(i, 1);
    dropped.push(t);
  }
  for (const [t, m] of Object.entries(lab.trim ?? {})) {
    const i = slides.findIndex((s) => titleOf(s) === t);
    if (i < 0) { where(`trim "${t}": no slide with that title`); continue; }
    const s = slides[i];
    const now = minutesOf(s);
    if (KEPT.has(s.kind) && s.kind !== "vocab") { where(`trim "${t}": a ${s.kind} slide keeps its time`); continue; }
    if (now === undefined || !Number.isInteger(m) || m < 3 || m >= now) { where(`trim "${t}": ${now ?? "untimed"} -> ${m} is not a shorter time of 3 minutes or more`); continue; }
    slides[i] = { ...s, minutes: m } as Slide;
  }
  let added = 0;
  for (const a of lab.add ?? []) {
    const i = findAnchor(slides, a.after);
    if (i < 0) { where(`add "${titleOf(a.slide) ?? a.slide.kind}": no slide "${a.after}" to put it after`); continue; }
    slides.splice(i + 1, 0, a.slide);
    added++;
  }
  if (lab.talk) {
    const i = slides.findIndex((s) => s.kind === "homework");
    if (i < 0) where(`talk "${lab.talk.title}": the deck has no homework slide`);
    else { slides.splice(i + 1, 0, lab.talk); added++; }
  }
  if (lab.objectives?.length) {
    const i = slides.findIndex((s) => s.kind === "objectives");
    if (i < 0) where("objectives: the deck has no objectives slide");
    else { const o = slides[i] as Extract<Slide, { kind: "objectives" }>; slides[i] = { ...o, items: [...o.items, ...lab.objectives] }; }
  }
  const timed = slides.reduce((n, s) => n + (minutesOf(s) ?? 0), 0);
  if (timed > deck.minutes) where(`with the Lab the timed slides add up to ${timed} of ${deck.minutes} minutes`);
  // A supplementary link tied to a slide the Lab left out goes with it.
  const resources = deck.resources?.filter((r) => !r.slide || !dropped.includes(r.slide));
  return { deck: { ...deck, slides, ...(resources ? { resources } : {}) }, issues, added };
}

/** The unit with its Lab in every deck the Lab names. */
export function withLab(lab: UnitLab | null | undefined, unit: Unit): Unit {
  if (!lab) return unit;
  const issues: string[] = [];
  let added = 0;
  for (const id of Object.keys(lab.decks)) if (!unit.decks.some((d) => d.id === id)) issues.push(`${id}: no such deck in the unit`);
  const decks = unit.decks.map((d) => {
    const l = lab.decks[d.id];
    if (!l) return d;
    const r = applyDeckLab(d, l);
    issues.push(...r.issues);
    added += r.added;
    return r.deck;
  });
  return { ...unit, decks, lab: { added, issues } };
}
