// Name slots in lesson decks. Imports nothing (scripts/pgtest/lesson-decks-lib
// loads it on its own).
//
// A slide's text may contain {s1} .. {s9}. castFor() picks that many different
// children from the roster, in an order fixed by a seed, so the same slide shows
// the same names until the teacher presses "new names" (a new seed). With fewer
// children than slots, names repeat only after every child has been used; with
// no roster at all, neutral stand-ins ("Student A") keep the sentence readable.

export const SLOT_RE = /\{s([1-9])\}/g;

/** The highest slot number used anywhere in these texts (0 when none). */
export function slotsIn(texts: (string | undefined | null)[]): number {
  let max = 0;
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(SLOT_RE)) max = Math.max(max, Number(m[1]));
  }
  return max;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable number for a string, so each slide gets its own order. */
export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Names for slots 1..count. */
export function castFor(count: number, roster: string[], seed: number): string[] {
  if (count <= 0) return [];
  const pool = [...new Set(roster.map((n) => n.trim()).filter(Boolean))];
  if (pool.length === 0) {
    return Array.from({ length: count }, (_, i) => `Student ${String.fromCharCode(65 + i)}`);
  }
  const next = rng(seed);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]);
}

/** Every string inside a slide (or any plain object) with its slots filled. */
export function fillDeep<T>(value: T, cast: string[]): T {
  if (typeof value === "string") return fillNames(value, cast) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, cast)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = fillDeep(v, cast);
    return out as T;
  }
  return value;
}

/** A slide ready to show: its own cast, chosen by deck, position and the teacher's shuffle count. */
export function castSlide<T>(slide: T, roster: string[], key: string, shuffle = 0): { slide: T; cast: string[] } {
  const count = slotsIn([JSON.stringify(slide)]);
  const cast = castFor(count, roster, (hashSeed(key) + Math.imul(shuffle, 2654435761)) >>> 0);
  return { slide: fillDeep(slide, cast), cast };
}

/** Replace {sN} with the cast; a slot past the cast keeps its stand-in. */
export function fillNames(text: string, cast: string[]): string {
  return text.replace(SLOT_RE, (_, d: string) => cast[Number(d) - 1] ?? `Student ${String.fromCharCode(64 + Number(d))}`);
}
