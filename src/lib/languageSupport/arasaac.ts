/**
 * The ARASAAC pictogram search, for words the bundled lexicon does not know
 * and for the teacher's picture picker. The API allows any origin; results
 * are kept for the session so retyping a sentence costs nothing.
 */
import type { LookupFn } from "./strip";

const SEARCH = "https://api.arasaac.org/v1/pictograms/en";

export interface Pictogram {
  id: number;
  keywords: string[];
  /** The first keyword, which ARASAAC puts the pictogram's main meaning in. */
  label: string;
}

const searchCache = new Map<string, Promise<Pictogram[]>>();
const bestCache = new Map<string, Promise<Pictogram[]>>();

async function get(kind: "search" | "bestsearch", term: string): Promise<Pictogram[]> {
  const res = await fetch(`${SEARCH}/${kind}/${encodeURIComponent(term)}`, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`ARASAAC answered ${res.status}`);
  const rows = (await res.json()) as any[];
  return rows.slice(0, 40).map((r) => {
    const keywords = (r.keywords ?? []).map((k: any) => String(k.keyword ?? "").toLowerCase()).filter(Boolean);
    return { id: r._id as number, keywords, label: keywords[0] ?? term };
  });
}

function cached(cache: Map<string, Promise<Pictogram[]>>, kind: "search" | "bestsearch", term: string) {
  const key = term.trim().toLowerCase();
  let hit = cache.get(key);
  if (!hit) {
    hit = get(kind, key);
    cache.set(key, hit);
    // A failed request must not be remembered as "no pictures".
    hit.catch(() => cache.delete(key));
  }
  return hit;
}

export const searchPictograms = (term: string) => cached(searchCache, "search", term);

/** bestsearch ranks better than search, so use it to choose, and say whether the match was exact. */
export const lookupPictogram: LookupFn = async (term) => {
  const rows = await cached(bestCache, "bestsearch", term);
  if (!rows.length) return null;
  const t = term.trim().toLowerCase();
  const exact = rows.find((r) => r.keywords.includes(t));
  return { pictogram: (exact ?? rows[0]).id, exact: !!exact };
};
