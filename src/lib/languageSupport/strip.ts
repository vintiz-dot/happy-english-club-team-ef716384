/**
 * Language Support: a sentence becomes a strip of pictures laid over the
 * words they came from, for ESL readers in Grades 1-3.
 *
 * Ported from the language-support project's renderer (renderer/strip.py) and
 * its cell format, so a set saved there can be imported here unchanged. What
 * is NOT ported is its scene-graph parser: here a sentence is read word by
 * word (with the multi-word units the lexicon knows, like "look after"),
 * which is why the teacher is part of the loop. Nothing reaches a child until
 * a teacher has looked at the strip and saved it.
 *
 * Pure: no network, no React. Pictogram lookups for words the bundled lexicon
 * does not know are passed in as `lookup`, so this can be tested offline.
 * Imports nothing, like the other shared modules.
 */

export const ATTRIBUTION =
  "ARASAAC pictograms: author Sergio Palao, origin ARASAAC (https://arasaac.org), " +
  "owned by the Government of Aragon, licensed CC BY-NC-SA.";

const STATIC = "https://static.arasaac.org/pictograms/{id}/{id}_500.png";
const API = "https://api.arasaac.org/v1/pictograms/{id}";

/** How many copies stand for a plural with no count, and the most worth drawing. */
export const MANY = 3;
export const MAX_COPIES = 5;

export type MatchKind = "exact" | "fuzzy" | "chosen" | "unknown";

export interface Cell {
  tokens: number[];
  start: number;
  text: string;
  /** "word" is a bare word with no picture; anything else carries one. */
  kind: "word" | "entity" | "event";
  carried?: boolean;
  concept?: string;
  match?: MatchKind;
  overridden?: boolean;
  negated?: boolean;
  uncertain?: boolean;
  pictogram?: number;
  url?: string;
  repeat?: number;
  indefinite?: boolean;
  count?: number | null;
  /** Past or future, which ARASAAC draws itself. */
  action?: "past" | "future" | null;
  [extra: string]: unknown;
}

export interface Strip {
  text: string;
  tokens: string[];
  cells: Cell[];
  attribution?: string;
}

export interface LexiconEntry {
  /** The chosen pictogram. */
  p: number;
  /** 1 when ARASAAC has a symbol whose keyword is exactly the word. */
  m?: number;
  /** Alternatives for the picker. */
  a?: number[];
}
export type Lexicon = Record<string, LexiconEntry>;

export interface Lookup {
  pictogram: number;
  exact: boolean;
}
/** A word the bundled lexicon does not know: ask something else for a picture. */
export type LookupFn = (term: string) => Promise<Lookup | null>;

export function pictureUrl(pictogram: number, action?: string | null): string {
  if (action === "past" || action === "future") {
    return API.replace("{id}", String(pictogram)) + `?action=${action}&download=false`;
  }
  return STATIC.replace(/\{id\}/g, String(pictogram));
}

/** Copies to draw for a plural. Drawing the thing again needs no teaching; a "+" badge does. */
export function copies(plural: boolean, quantity: number | null): { repeat: number; indefinite: boolean; count: number | null } {
  if (quantity && quantity > 0) {
    if (quantity > MAX_COPIES) return { repeat: 1, indefinite: false, count: quantity };
    return { repeat: quantity, indefinite: false, count: null };
  }
  if (plural) return { repeat: MANY, indefinite: true, count: null };
  return { repeat: 1, indefinite: false, count: null };
}

// ---------------------------------------------------------------- tokens

const TOKEN = /[A-Za-z]+(?:['’][A-Za-z]+)?|\d+|[^\sA-Za-z\d]/g;

export function tokenize(text: string): string[] {
  return (text || "").match(TOKEN) ?? [];
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};

/** Words that carry no picture: the grammar around the things and actions. */
const FUNCTION_WORDS = new Set([
  "a", "an", "the", "is", "are", "am", "was", "were", "be", "been", "being", "do", "does", "did",
  "to", "of", "and", "but", "or", "so", "if", "then", "that", "this", "these", "those", "it", "its",
  "there", "here", "for", "at", "will", "can", "could", "would", "should", "may", "might", "must",
  "shall", "has", "had", "have", "very", "too", "also", "just", "some", "any", "all", "every", "much",
  "many", "what", "who", "where", "when", "why", "how", "which", "than", "as", "he", "she", "they",
  "him", "her", "them", "his", "their", "we", "us", "our", "i", "me", "my", "you", "your", "not", "no",
  "never", "yes", "please", "let", "s", "t", "d", "ll", "re", "ve", "m",
]);

/** Pronouns that are drawn: the child and the person spoken to. */
const PRONOUN_CONCEPT: Record<string, string> = { i: "me", me: "me", my: "me", you: "you", your: "you" };

/** Prepositions worth a picture to a beginner: the words that tell in from on from under. */
const DRAWN_PREPOSITIONS = new Set([
  "in", "on", "under", "over", "above", "below", "behind", "between", "near", "into", "onto", "off",
  "up", "down", "through", "across", "around", "inside", "outside", "beside", "next to", "in front of",
  "out of", "on top of", "underneath",
]);
const PREPOSITION_ALIAS: Record<string, string> = {
  inside: "in", outside: "out", beside: "next to", "on top of": "on top", underneath: "under",
};

const IRREGULAR_PAST: Record<string, string> = {
  ate: "eat", went: "go", saw: "see", ran: "run", sat: "sit", came: "come", took: "take", gave: "give",
  made: "make", said: "say", told: "tell", got: "get", put: "put", read: "read", wrote: "write",
  drank: "drink", swam: "swim", sang: "sing", slept: "sleep", fell: "fall", flew: "fly", found: "find",
  bought: "buy", brought: "bring", thought: "think", knew: "know", grew: "grow", held: "hold",
  kept: "keep", left: "leave", met: "meet", rode: "ride", stood: "stand", wore: "wear", drew: "draw",
  built: "build", caught: "catch", taught: "teach", began: "begin", heard: "hear", lost: "lose",
  paid: "pay", sent: "send", spoke: "speak", woke: "wake", won: "win", had: "have", did: "do",
};
const IRREGULAR_PLURAL: Record<string, string> = {
  children: "child", men: "man", women: "woman", feet: "foot", teeth: "tooth", mice: "mouse",
  people: "person", sheep: "sheep", fish: "fish", geese: "goose", wolves: "wolf", leaves: "leaf",
};

/** Likely dictionary forms of a word, most likely first, with what the form says. */
export function forms(word: string): { lemma: string; plural: boolean; past: boolean; ing: boolean }[] {
  const w = word.toLowerCase().replace(/’/g, "'");
  const out: { lemma: string; plural: boolean; past: boolean; ing: boolean }[] = [
    { lemma: w, plural: false, past: false, ing: false },
  ];
  const push = (lemma: string, plural: boolean, past: boolean, ing = false) => {
    if (lemma.length >= 2 && !out.some((f) => f.lemma === lemma)) out.push({ lemma, plural, past, ing });
  };
  if (IRREGULAR_PAST[w]) push(IRREGULAR_PAST[w], false, true);
  if (IRREGULAR_PLURAL[w]) push(IRREGULAR_PLURAL[w], w !== "sheep" && w !== "fish", false);
  if (/ies$/.test(w)) push(w.slice(0, -3) + "y", true, false);
  if (/(ses|xes|zes|ches|shes)$/.test(w)) push(w.slice(0, -2), true, false);
  if (/s$/.test(w) && !/ss$/.test(w)) push(w.slice(0, -1), true, false);
  if (/ied$/.test(w)) push(w.slice(0, -3) + "y", false, true);
  if (/ed$/.test(w)) {
    push(w.slice(0, -2), false, true);
    push(w.slice(0, -1), false, true);
    if (/([^aeiou])\1ed$/.test(w)) push(w.slice(0, -3), false, true);
  }
  if (/ing$/.test(w)) {
    push(w.slice(0, -3), false, false, true);
    push(w.slice(0, -3) + "e", false, false, true);
    if (/([^aeiou])\1ing$/.test(w)) push(w.slice(0, -4), false, false, true);
  }
  return out;
}

// ---------------------------------------------------------------- the strip

interface Draft {
  start: number;
  end: number; // exclusive
  concept: string;
  term: string; // what to search for if the lexicon has nothing
  plural: boolean;
  past: boolean;
  quantity: number | null;
  negated: boolean;
  kind: "entity" | "event";
}

/** Describing words the lexicon draws: "the big cats" still reads as a plural. */
const ADJECTIVES = new Set([
  "big", "small", "little", "old", "new", "red", "blue", "black", "white", "brown", "green", "yellow",
  "happy", "sad", "hot", "cold", "warm", "long", "pretty", "funny", "fast", "heavy", "full", "hungry",
  "good", "kind", "lost", "tall", "short", "young", "fat", "thin", "pink", "orange", "purple", "grey", "gray",
]);
const VERBS = new Set([
  "ask", "bring", "buy", "call", "carry", "chase", "clean", "come", "cry", "cut", "draw", "drink", "eat", "enter",
  "fall", "find", "fly", "follow", "get", "give", "go", "grow", "have", "help", "hold", "hurt", "jump", "keep",
  "kick", "know", "laugh", "let", "like", "live", "look", "make", "pick", "play", "pull", "put", "read", "ride",
  "run", "say", "see", "show", "sing", "sit", "sleep", "stay", "stop", "swim", "take", "tell", "think", "try",
  "use", "walk", "want", "wash", "watch", "wish", "work", "write",
]);
const SUBJECT_PRONOUNS = new Set(["he", "she", "it", "who", "that", "which", "this"]);

/** Is a word ending in -s at position i a plural noun rather than a verb? */
function pluralReading(lower: string[], i: number, drafts: Draft[], quantity: number | null): boolean {
  if (quantity) return true;
  const prev = lower[i - 1];
  if (prev === undefined || !/^[a-z']+$/.test(prev)) return true; // sentence start, or after a comma
  if (SUBJECT_PRONOUNS.has(prev)) return false;
  const last = drafts[drafts.length - 1];
  // Directly after a drawn noun: that noun is the subject and this is its verb.
  if (last && last.end === i && last.kind === "entity" && !ADJECTIVES.has(last.concept) && !VERBS.has(last.concept) && !DRAWN_PREPOSITIONS.has(last.concept)) {
    return false;
  }
  return true;
}

/** Find what in the sentence could carry a picture, before any picture is chosen. */
export function plan(tokens: string[], lexicon: Lexicon): Draft[] {
  const drafts: Draft[] = [];
  let negate = false;
  let quantity: number | null = null;
  let i = 0;
  const lower = tokens.map((t) => t.toLowerCase().replace(/’/g, "'"));

  while (i < tokens.length) {
    const w = lower[i];
    if (!/^[a-z0-9']+$/.test(w)) { i++; continue; }

    if (/^\d+$/.test(w)) { quantity = parseInt(w, 10); i++; continue; }
    if (NUMBER_WORDS[w]) { quantity = NUMBER_WORDS[w]; i++; continue; }
    if (w === "not" || w === "never" || w === "no" || /n't$/.test(w)) { negate = true; i++; continue; }

    // Multi-word units first, longest first: "in front of", "look after", "put on".
    let matched = false;
    for (const len of [3, 2]) {
      if (i + len > tokens.length) continue;
      const window = lower.slice(i, i + len);
      if (!window.every((x) => /^[a-z']+$/.test(x))) continue;
      const candidates = forms(window[0]).map((f) => [f, ...window.slice(1)].join(" "));
      const phrase = [...candidates.map((c) => c), window.join(" ")].find((c) => lexicon[c] || DRAWN_PREPOSITIONS.has(c));
      if (phrase) {
        const f = forms(window[0]).find((x) => [x.lemma, ...window.slice(1)].join(" ") === phrase);
        const prep = DRAWN_PREPOSITIONS.has(phrase) && !lexicon[phrase];
        drafts.push({
          start: i, end: i + len, concept: PREPOSITION_ALIAS[phrase] ?? phrase, term: PREPOSITION_ALIAS[phrase] ?? phrase,
          plural: false, past: !!f?.past, quantity: null, negated: negate, kind: prep ? "entity" : "event",
        });
        negate = false; quantity = null; i += len; matched = true;
        break;
      }
    }
    if (matched) continue;

    if (PRONOUN_CONCEPT[w] && lexicon[PRONOUN_CONCEPT[w]]) {
      // "my" and "your" are possessives: leave them as words, draw only I / me / you.
      if (w === "my" || w === "your") { i++; continue; }
      drafts.push({ start: i, end: i + 1, concept: PRONOUN_CONCEPT[w], term: PRONOUN_CONCEPT[w], plural: false, past: false, quantity: null, negated: false, kind: "entity" });
      i++; continue;
    }

    if (DRAWN_PREPOSITIONS.has(w)) {
      const concept = PREPOSITION_ALIAS[w] ?? w;
      drafts.push({ start: i, end: i + 1, concept, term: concept, plural: false, past: false, quantity: null, negated: false, kind: "entity" });
      i++; continue;
    }
    if (FUNCTION_WORDS.has(w)) { i++; continue; }

    const fs = forms(w);
    const known = fs.find((f) => lexicon[f.lemma]);
    const chosen = known ?? fs.find((f) => !f.plural && !f.ing) ?? fs[0];
    // Without a lexicon entry, guess the dictionary form to search for: a likely
    // plural or past drops its ending, anything else is searched as typed.
    const guess = known ? known : fs.length > 1 && fs[1] && /(?:s|ed|ing)$/.test(w) && !/(ss|us|is)$/.test(w) ? fs[1] : chosen;
    // "runs" is a plural when "the cats" or "two dogs" leads into it, and a verb
    // when a noun or pronoun does: "the dog runs", "she sits". Only the first is
    // drawn more than once.
    const plural = guess.plural && pluralReading(lower, i, drafts, quantity);
    drafts.push({
      start: i, end: i + 1, concept: guess.lemma, term: guess.lemma,
      plural, past: guess.past, quantity, negated: negate,
      kind: guess.past ? "event" : "entity",
    });
    negate = false; quantity = null; i++;
  }
  return drafts;
}

/** Plan, then pick pictures: the teacher's own choices, the lexicon, then a lookup. */
export async function buildStrip(
  text: string,
  opts: { lexicon: Lexicon; overrides?: Record<string, number>; lookup?: LookupFn },
): Promise<Strip> {
  const { lexicon, overrides = {}, lookup } = opts;
  const tokens = tokenize(text);
  const drafts = plan(tokens, lexicon);
  const claimed = new Set<number>();
  const cells: Cell[] = [];

  const resolved = await Promise.all(
    drafts.map(async (d): Promise<{ pictogram: number; match: MatchKind; overridden: boolean } | null> => {
      if (overrides[d.concept]) return { pictogram: overrides[d.concept], match: "chosen", overridden: true };
      const e = lexicon[d.concept];
      if (e) return { pictogram: e.p, match: e.m ? "exact" : "fuzzy", overridden: false };
      if (!lookup) return null;
      const hit = await lookup(d.term).catch(() => null);
      return hit ? { pictogram: hit.pictogram, match: hit.exact ? "exact" : "fuzzy", overridden: false } : null;
    }),
  );

  drafts.forEach((d, n) => {
    const r = resolved[n];
    const span = Array.from({ length: d.end - d.start }, (_, k) => d.start + k);
    span.forEach((s) => claimed.add(s));
    const cell: Cell = {
      tokens: span, start: d.start, text: span.map((s) => tokens[s]).join(" "),
      kind: d.kind, concept: d.concept, match: r?.match ?? "unknown", overridden: r?.overridden ?? false,
      negated: d.negated, uncertain: false, action: d.past ? "past" : null,
    };
    if (r) {
      const c = copies(d.plural, d.quantity);
      cell.pictogram = r.pictogram;
      cell.url = pictureUrl(r.pictogram, d.past ? "past" : null);
      cell.repeat = c.repeat;
      cell.indefinite = c.indefinite;
      cell.count = c.count;
    }
    cells.push(cell);
  });

  tokens.forEach((t, index) => {
    if (!claimed.has(index)) cells.push({ tokens: [index], start: index, text: t, kind: "word", carried: true });
  });
  cells.sort((a, b) => a.start - b.start);
  return { text: text.trim(), tokens, cells, attribution: ATTRIBUTION };
}

/** The teacher picked a different picture for one cell. */
export function withPictogram(cell: Cell, pictogram: number): Cell {
  const repeat = cell.repeat ?? 1;
  return {
    ...cell, kind: cell.kind === "word" ? "entity" : cell.kind, carried: undefined,
    concept: cell.concept ?? cell.text.toLowerCase(), pictogram, url: pictureUrl(pictogram, cell.action),
    match: "chosen", overridden: true, repeat, indefinite: cell.indefinite ?? false, count: cell.count ?? null,
  };
}

/** The teacher took the picture off: the word stays as a word. */
export function withoutPicture(cell: Cell, tokens: string[]): Cell {
  return {
    tokens: cell.tokens, start: cell.start, text: cell.tokens.map((i) => tokens[i]).join(" "),
    kind: "word", carried: true,
  };
}

/** Everything a teacher was asked to check, so a set can say whether it is clean. */
export function flagsIn(sentence: { cells?: Cell[] }): string[] {
  const out: string[] = [];
  for (const cell of sentence.cells ?? []) {
    if (cell.kind === "word" || cell.continues) continue;
    if (cell.match === "fuzzy") out.push(`${cell.concept}: no exact symbol`);
    else if (!cell.url) out.push(`${cell.concept}: no symbol at all`);
    if (cell.uncertain) out.push(`${cell.concept}: the parser was unsure`);
  }
  return out;
}

/** Words a strip leaves bare that a Grade 1-3 reader might need a picture for. */
export function bareContentWords(strip: Strip): string[] {
  return strip.cells
    .filter((c) => c.kind === "word" && /^[A-Za-z]{3,}$/.test(c.text) && !FUNCTION_WORDS.has(c.text.toLowerCase()))
    .map((c) => c.text);
}

// ---------------------------------------------------------------- sets

export interface ApprovedSentence {
  text: string;
  tokens: string[];
  cells: Cell[];
  approved?: string;
}

export function approvedSentence(strip: Strip): ApprovedSentence {
  return {
    text: strip.text,
    tokens: strip.tokens,
    cells: strip.cells,
    approved: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Read a set exported by the language-support project (`sets/<name>.json`) or by
 * this app. Anything unusable is skipped and counted rather than guessed at.
 */
export function readImportedSet(raw: unknown): { title: string; sentences: ApprovedSentence[]; skipped: number } {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const list: any[] = Array.isArray(data.sentences) ? data.sentences : [];
  const sentences: ApprovedSentence[] = [];
  let skipped = 0;
  for (const s of list) {
    const cells: Cell[] = Array.isArray(s?.cells) ? s.cells.filter((c: any) => c && Array.isArray(c.tokens)) : [];
    if (!s || typeof s.text !== "string" || !s.text.trim() || !cells.length) { skipped++; continue; }
    const safe = cells.map((c) => {
      const out: Cell = { ...c, start: Number(c.start ?? c.tokens[0] ?? 0), text: String(c.text ?? "") };
      // Rebuild the url from the pictogram id so an import can never point a
      // child's browser at an address other than ARASAAC's.
      if (Number.isInteger(c.pictogram)) {
        // The language-support project keeps tense inside the url it saved.
        const saved = typeof c.url === "string" ? /[?&]action=(past|future)/.exec(c.url) : null;
        const action: string | null = c.action === "past" || c.action === "future" ? c.action : saved ? saved[1] : null;
        if (action === "past" || action === "future") out.action = action;
        out.url = pictureUrl(c.pictogram as number, action);
      }
      else delete out.url;
      return out;
    });
    sentences.push({
      text: s.text.trim(),
      tokens: Array.isArray(s.tokens) ? s.tokens.map(String) : tokenize(s.text),
      cells: safe,
      approved: typeof s.approved === "string" ? s.approved : undefined,
    });
  }
  return { title: typeof data.title === "string" && data.title ? data.title : "Imported set", sentences, skipped };
}
