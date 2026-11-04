/**
 * Comparing a name in Pixel Pal with a name in HEC.
 *
 * Pixel Pal holds what the teacher calls a child - "Bin", "Apple", "Minh
 * Duc" - and HEC holds what the family wrote on the form, "Nguyễn Gia Bình".
 * So this does not ask "are these equal". It asks how much the name alone
 * suggests they are the same child, and says why in words a person can
 * check.
 *
 * A NAME IS ONLY EVER A SUGGESTION. Two children called Minh, or a nickname
 * that looks like somebody else's name, would otherwise silently hand one
 * child's register to another. Nothing here links anybody; an admin answers
 * every question (docs/STARS_SYNC_SPEC.md, decision 2).
 *
 * Imports nothing, so it can be tested directly: scripts/pgtest/stars-link.test.mjs.
 */

/** Lower case, no accents, đ as d. "Bình" and "binh" are the same word here. */
export function foldText(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

/** Said in front of a child's name, and not part of it: "Bé Na". */
const TITLES = new Set(["be", "em", "ban", "con", "chau"]);

/** Family names. Half the class can share one, so one alone says little. */
const FAMILY_NAMES = new Set([
  "nguyen", "tran", "le", "pham", "hoang", "huynh", "phan", "vu", "vo", "dang",
  "bui", "do", "ho", "ngo", "duong", "ly", "dinh", "truong", "dao", "doan",
  "luong", "lam", "cao", "ta", "thai", "trinh", "ha",
]);

/** Middle names that say almost nothing about who a child is. */
const FILLER_NAMES = new Set(["thi", "van"]);

interface Token {
  fold: string;
  text: string;
  /** How much this word says about who the child is, 0 to 1. */
  weight: number;
}

function tokenize(name: string | null | undefined): Token[] {
  const words = (name ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const kept = words.length > 1 && TITLES.has(foldText(words[0])) ? words.slice(1) : words;
  return kept.map((text, i) => {
    const fold = foldText(text);
    let weight = 1;
    if (FILLER_NAMES.has(fold)) weight = 0.2;
    else if (i === 0 && kept.length > 1 && FAMILY_NAMES.has(fold)) weight = 0.25;
    return { fold, text, weight };
  });
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * How alike two words are, 0 to 1. A nickname is usually the front of the
 * name it came from - Bin / Bình, Tom / Tommy - so a prefix counts for more
 * than the spelling alone would give it.
 */
function wordLikeness(a: string, b: string): number {
  if (a === b) return 1;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let best = 0;
  if (short.length >= 2 && long.startsWith(short)) {
    best = 0.6 + 0.3 * (short.length / long.length);
  }
  if (long.length >= 4) {
    const spelled = 1 - editDistance(a, b) / long.length;
    if (spelled >= 0.6) best = Math.max(best, spelled * 0.92);
  }
  return best;
}

export type NameMatchKind = "exact" | "contains" | "similar" | "none";

export interface NameMatch {
  /** 0 to 1. Compare it across candidates; on its own it is only a hint. */
  score: number;
  kind: NameMatchKind;
  /** Why, for a person to check. Empty when the names have nothing in common. */
  why: string;
}

const NO_MATCH: NameMatch = { score: 0, kind: "none", why: "" };

export function nameAffinity(pixelPalName: string | null | undefined, hecName: string | null | undefined): NameMatch {
  const allOurs = tokenize(pixelPalName);
  const theirs = tokenize(hecName);
  if (allOurs.length === 0 || theirs.length === 0) return NO_MATCH;

  const joinedOurs = allOurs.map((t) => t.fold).join("");
  const joinedTheirs = theirs.map((t) => t.fold).join("");
  if (joinedOurs === joinedTheirs) return { score: 1, kind: "exact", why: "The same name in both apps" };

  // "Bin Bin" is one word said twice.
  const seen = new Set<string>();
  const ours = allOurs.filter((t) => (seen.has(t.fold) ? false : (seen.add(t.fold), true)));

  // Pair the words, closest first, each used once.
  const pairs: { i: number; j: number; likeness: number }[] = [];
  ours.forEach((o, i) => theirs.forEach((t, j) => {
    const likeness = wordLikeness(o.fold, t.fold);
    if (likeness > 0) pairs.push({ i, j, likeness });
  }));
  pairs.sort((a, b) => b.likeness - a.likeness);

  const usedOurs = new Set<number>();
  const usedTheirs = new Set<number>();
  let gained = 0;
  let exactWords = 0;
  let closest: { i: number; j: number; likeness: number } | null = null;
  for (const pair of pairs) {
    if (usedOurs.has(pair.i) || usedTheirs.has(pair.j)) continue;
    usedOurs.add(pair.i);
    usedTheirs.add(pair.j);
    gained += ours[pair.i].weight * pair.likeness * Math.max(theirs[pair.j].weight, 0.3);
    if (pair.likeness === 1) exactWords += 1;
    if (!closest || theirs[pair.j].weight > theirs[closest.j].weight) closest = pair;
  }
  // Every word on both sides, in another order: "Binh Tran" and "Trần Bình".
  if (exactWords === ours.length && exactWords === theirs.length) {
    return { score: 0.99, kind: "exact", why: "The same name, in a different order" };
  }

  const possible = ours.reduce((sum, t) => sum + t.weight, 0);
  let score = possible > 0 ? gained / possible : 0;

  // People go by the last word of a Vietnamese name. A match only on an
  // earlier word is still worth something, just less.
  if (!usedTheirs.has(theirs.length - 1)) score *= 0.85;
  // Every word they typed is in the name, but the name has more in it.
  score = Math.min(score, 0.97);

  const spelled = 1 - editDistance(joinedOurs, joinedTheirs) / Math.max(joinedOurs.length, joinedTheirs.length);
  const wholeNameIsClose = spelled >= 0.8 && spelled * 0.95 > score;
  if (wholeNameIsClose) score = spelled * 0.95;
  if (score < 0.2) return NO_MATCH;

  if (exactWords === ours.length && !wholeNameIsClose) {
    return { score, kind: "contains", why: `“${ours.map((t) => t.text).join(" ")}” is in their full name` };
  }
  if (wholeNameIsClose || !closest) {
    return { score, kind: "similar", why: `“${pixelPalName}” is spelled almost like “${hecName}”` };
  }
  return { score, kind: "similar", why: `“${ours[closest.i].text}” looks like “${theirs[closest.j].text}”` };
}
