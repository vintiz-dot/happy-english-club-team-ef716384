/**
 * _lib/word-images.ts - child-safe pictures for vocabulary words.
 *
 * WHY THIS EXISTS. The Google Custom Search JSON API this app used
 * (`customSearchImages` in google.ts) is closed to new customers (since
 * 20 Jan 2026) and is switched off for everyone on 1 Jan 2027. Our project
 * answers 403 PERMISSION_DENIED on every call, so scanned words were saved
 * with `images: []`. google.ts is kept only for its Vision OCR.
 *
 * SOURCES, tried in this order until `count` pictures are found:
 *   1. Pexels     secret `Pexels_API`   moderated library, stable CDN URLs.
 *   2. Unsplash   secret `unsplash_api` `content_filter=high`.
 *   3. Openverse  no key                `mature=false`; CC-licensed.
 *   4. Pixabay    secret `Pixabay_API`  `safesearch=true`. Last, because its
 *                 URLs are valid for 24 hours only and its terms forbid
 *                 permanent hotlinking, and these URLs are stored.
 * A source without its secret is skipped, not an error. Openverse needs
 * no secret, so a lookup can always be tried.
 *
 * ATTRIBUTION. Each image carries a `credit` line ("Photo by A on Pexels").
 * Screens that show these pictures should show it (Pexels, Unsplash,
 * Pixabay and the CC licences on Openverse all ask for it).
 *
 * The result keeps the `CseImage` shape ({url, thumb, alt, source}) so the
 * callers and screens keep working; `source` is wider and `credit` is new
 * and optional.
 *
 * FAILURES are logged ONCE per call to `fetchWordImages`, with the reason
 * per source - not once per word. A source that answers 401/403/429 is
 * left out for the rest of the call.
 */

export type WordImageSource = "pexels" | "unsplash" | "openverse" | "pixabay" | "google";

export interface WordImage {
  url: string;
  thumb: string;
  alt: string;
  source: WordImageSource;
  /** Attribution line to show next to the picture. */
  credit?: string;
}

type SourceName = Exclude<WordImageSource, "google">;
type Fetcher = (query: string, count: number, signal: AbortSignal) => Promise<WordImage[]>;

/** Thrown by a source for a non-2xx answer; carries the status for the log. */
class SourceHttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

const TIMEOUT_MS = 6000;
/** Statuses after which the source is not asked again in this call. */
const STOP_STATUSES = new Set([401, 403, 429]);

async function getJson(url: string, signal: AbortSignal, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers, signal });
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new SourceHttpError(res.status);
  }
  return await res.json();
}

const pexels: Fetcher = async (query, count, signal) => {
  const key = Deno.env.get("Pexels_API");
  if (!key) throw new Error("skipped: secret Pexels_API not set");
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}`;
  const data = await getJson(url, signal, { Authorization: key });
  const photos: any[] = Array.isArray(data?.photos) ? data.photos : [];
  return photos
    .map((p): WordImage => ({
      url: String(p?.src?.large || p?.src?.original || ""),
      thumb: String(p?.src?.small || p?.src?.tiny || p?.src?.large || ""),
      alt: String(p?.alt || query),
      source: "pexels",
      credit: p?.photographer ? `Photo by ${p.photographer} on Pexels` : "Photo from Pexels",
    }))
    .filter((r) => r.url);
};

const unsplash: Fetcher = async (query, count, signal) => {
  const key = Deno.env.get("unsplash_api");
  if (!key) throw new Error("skipped: secret unsplash_api not set");
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${count}&content_filter=high`;
  const data = await getJson(url, signal, { Authorization: `Client-ID ${key}` });
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((r): WordImage => ({
      url: String(r?.urls?.regular || r?.urls?.full || ""),
      thumb: String(r?.urls?.small || r?.urls?.thumb || r?.urls?.regular || ""),
      alt: String(r?.alt_description || r?.description || query),
      source: "unsplash",
      credit: r?.user?.name ? `Photo by ${r.user.name} on Unsplash` : "Photo from Unsplash",
    }))
    .filter((r) => r.url);
};

const openverse: Fetcher = async (query, count, signal) => {
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&page_size=${count}&mature=false`;
  const data = await getJson(url, signal);
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((r): WordImage => ({
      url: String(r?.url || ""),
      thumb: String(r?.thumbnail || r?.url || ""),
      alt: String(r?.title || query),
      source: "openverse",
      credit: String(r?.attribution || "") || "Image via Openverse",
    }))
    .filter((r) => r.url.startsWith("https://"));
};

const pixabay: Fetcher = async (query, count, signal) => {
  const key = Deno.env.get("Pixabay_API");
  if (!key) throw new Error("skipped: secret Pixabay_API not set");
  const url =
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(query)}&image_type=all&safesearch=true` +
    `&per_page=${Math.max(count, 3)}&lang=en`;
  const data = await getJson(url, signal);
  const hits: any[] = Array.isArray(data?.hits) ? data.hits : [];
  return hits
    .slice(0, count)
    .map((h): WordImage => ({
      url: String(h?.webformatURL || h?.largeImageURL || ""),
      thumb: String(h?.previewURL || h?.webformatURL || ""),
      alt: String(h?.tags || query),
      source: "pixabay",
      credit: h?.user ? `Image by ${h.user} on Pixabay` : "Image from Pixabay",
    }))
    .filter((r) => r.url);
};

const SOURCES: Array<{ name: SourceName; fn: Fetcher }> = [
  { name: "pexels", fn: pexels },
  { name: "unsplash", fn: unsplash },
  { name: "openverse", fn: openverse },
  { name: "pixabay", fn: pixabay },
];

function describe(e: unknown): string {
  if (e instanceof SourceHttpError) return `HTTP ${e.status}`;
  if (e instanceof DOMException && e.name === "AbortError") return "timed out";
  return e instanceof Error ? e.message : String(e);
}

/**
 * Pictures for each word, `count` per word at most. Never throws. Words
 * nobody could picture map to []. One summary line is logged when a source
 * failed or a word got no picture.
 */
export async function fetchWordImages(
  words: string[],
  count = 3,
  opts: { concurrency?: number } = {},
): Promise<Map<string, WordImage[]>> {
  const want = Math.min(Math.max(Math.floor(count) || 1, 1), 8);
  const unique = [...new Set(words.map((w) => String(w ?? "").trim()).filter(Boolean))];
  const out = new Map<string, WordImage[]>();

  const failures = new Map<SourceName, { reason: string; times: number }>();
  const stopped = new Set<SourceName>();
  const noteFailure = (name: SourceName, e: unknown) => {
    const reason = describe(e);
    const seen = failures.get(name);
    if (seen) seen.times++;
    else failures.set(name, { reason, times: 1 });
    if (e instanceof SourceHttpError && STOP_STATUSES.has(e.status)) stopped.add(name);
    if (reason.startsWith("skipped:")) stopped.add(name);
  };

  async function one(word: string): Promise<void> {
    const found: WordImage[] = [];
    const seen = new Set<string>();
    for (const src of SOURCES) {
      if (found.length >= want) break;
      if (stopped.has(src.name)) continue;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        for (const img of await src.fn(word, want - found.length, ctrl.signal)) {
          if (found.length >= want) break;
          if (seen.has(img.url)) continue;
          seen.add(img.url);
          found.push(img);
        }
      } catch (e) {
        noteFailure(src.name, e);
      } finally {
        clearTimeout(timer);
      }
    }
    out.set(word, found);
  }

  const limit = Math.max(1, opts.concurrency ?? 3);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, unique.length) }, async () => {
      while (next < unique.length) await one(unique[next++]);
    }),
  );

  const empty = unique.filter((w) => !(out.get(w)?.length)).length;
  if (failures.size || empty) {
    const parts = [...failures].map(([n, f]) => `${n}: ${f.reason}${f.times > 1 ? ` (x${f.times})` : ""}`);
    console.warn(
      `fetchWordImages: ${empty}/${unique.length} words got no picture` +
        (parts.length ? `; ${parts.join("; ")}` : ""),
    );
  }
  return out;
}
