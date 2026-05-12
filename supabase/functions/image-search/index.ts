/**
 * image-search Edge Function
 * ============================
 * Fan-out image search across every configured provider in parallel and
 * return an interleaved, deduplicated result set. The frontend renders the
 * returned images with strict lazy loading.
 *
 * Providers, in interleave priority:
 *   1. Pixabay     (kid-friendly stock photos + illustrations)
 *   2. Pexels      (high-quality stock photos)
 *   3. Wikimedia   (free, factual reference imagery)
 *   4. Google CSE  (broad coverage)
 *   5. Unsplash    (failure-tolerant — silenced)
 *
 * Each provider call has a 5s timeout. Individual failures never abort the
 * fan-out; we simply skip that provider. Unsplash errors are logged at info
 * level only, per product requirement.
 *
 * Input:  { query: string, count?: number, provider?: ProviderName }
 *         When `provider` is set we short-circuit to just that provider
 *         (legacy "test single provider" path).
 *
 * Output: { images: Array<{url, thumb, thumbnail, alt, source}>,
 *           source: "merged"|ProviderName|"none",
 *           counts: Record<ProviderName, number>,
 *           message?: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ProviderName = "pixabay" | "pexels" | "wikimedia" | "google" | "unsplash";

interface ImageResult {
  url: string;
  thumb: string;
  thumbnail: string;
  alt: string;
  source: ProviderName;
}

async function safeFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPixabay(query: string, perPage: number): Promise<ImageResult[]> {
  const key = Deno.env.get("Pixabay_API");
  if (!key) return [];
  const url =
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=photo,illustration&safesearch=true&per_page=${perPage}&lang=en`;
  const res = await safeFetch(url);
  if (!res) { console.warn("pixabay: failed or timed out"); return []; }
  try {
    const data = await res.json();
    const hits: any[] = Array.isArray(data.hits) ? data.hits : [];
    return hits.map((h) => ({
      url: h.webformatURL || h.largeImageURL || "",
      thumb: h.previewURL || h.webformatURL || "",
      thumbnail: h.previewURL || h.webformatURL || "",
      alt: String(h.tags || query),
      source: "pixabay" as const,
    })).filter((r) => r.url);
  } catch { return []; }
}

async function fetchPexels(query: string, perPage: number): Promise<ImageResult[]> {
  const key = Deno.env.get("Pexels_API");
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await safeFetch(url, { headers: { Authorization: key } });
  if (!res) { console.warn("pexels: failed or timed out"); return []; }
  try {
    const data = await res.json();
    const photos: any[] = Array.isArray(data.photos) ? data.photos : [];
    return photos.map((p) => ({
      url: p.src?.large || p.src?.original || "",
      thumb: p.src?.tiny || p.src?.small || "",
      thumbnail: p.src?.tiny || p.src?.small || "",
      alt: String(p.alt || query),
      source: "pexels" as const,
    })).filter((r) => r.url);
  } catch { return []; }
}

async function fetchWikimedia(query: string, perPage: number): Promise<ImageResult[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json` +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=${perPage}&prop=imageinfo&iiprop=url|mime&iiurlwidth=320&origin=*`;
  const res = await safeFetch(url);
  if (!res) { console.warn("wikimedia: failed or timed out"); return []; }
  try {
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages || typeof pages !== "object") return [];
    const allowedMime = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    return Object.values(pages as Record<string, any>)
      .map((p: any) => {
        const info = Array.isArray(p.imageinfo) ? p.imageinfo[0] : null;
        if (!info || !allowedMime.has(info.mime)) return null;
        return {
          url: info.url || "",
          thumb: info.thumburl || info.url || "",
          thumbnail: info.thumburl || info.url || "",
          alt: String(p.title || query).replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
          source: "wikimedia" as const,
        };
      })
      .filter((r): r is ImageResult => !!r && !!r.url);
  } catch { return []; }
}

async function fetchGoogleCSE(query: string, perPage: number): Promise<ImageResult[]> {
  const key = Deno.env.get("GOOGLE_CSE_API_KEY");
  const cx = Deno.env.get("GOOGLE_CSE_ID");
  if (!key || !cx) return [];
  const url =
    `https://www.googleapis.com/customsearch/v1` +
    `?q=${encodeURIComponent(query)}&searchType=image&num=${perPage}&safe=active` +
    `&cx=${encodeURIComponent(cx)}&key=${encodeURIComponent(key)}`;
  const res = await safeFetch(url);
  if (!res) { console.warn("google CSE: failed or timed out"); return []; }
  try {
    const data = await res.json();
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    return items.map((it) => ({
      url: it.link || "",
      thumb: it.image?.thumbnailLink || it.link || "",
      thumbnail: it.image?.thumbnailLink || it.link || "",
      alt: String(it.title || query),
      source: "google" as const,
    })).filter((r) => r.url);
  } catch { return []; }
}

async function fetchUnsplash(query: string, perPage: number): Promise<ImageResult[]> {
  // Silenced on any error per spec.
  const key = Deno.env.get("unsplash_api");
  if (!key) return [];
  try {
    const url =
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
      `&per_page=${perPage}&content_filter=high`;
    const res = await safeFetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res) { console.info("unsplash: failed or timed out (silenced)"); return []; }
    const data = await res.json();
    const results: any[] = Array.isArray(data.results) ? data.results : [];
    return results.map((r) => ({
      url: r.urls?.regular || r.urls?.full || "",
      thumb: r.urls?.thumb || r.urls?.small || "",
      thumbnail: r.urls?.thumb || r.urls?.small || "",
      alt: String(r.alt_description || r.description || query),
      source: "unsplash" as const,
    })).filter((r) => r.url);
  } catch (e) {
    console.info("unsplash: error (silenced):", (e as Error)?.message);
    return [];
  }
}

const PROVIDERS: Array<{
  name: ProviderName;
  fn: (q: string, n: number) => Promise<ImageResult[]>;
}> = [
  { name: "pixabay",   fn: fetchPixabay },
  { name: "pexels",    fn: fetchPexels },
  { name: "wikimedia", fn: fetchWikimedia },
  { name: "google",    fn: fetchGoogleCSE },
  { name: "unsplash",  fn: fetchUnsplash },
];

/**
 * Round-robin interleave so the carousel doesn't show 6 Pixabay photos
 * before any Pexels one. Order within each provider's slot is preserved.
 */
function interleave(buckets: ImageResult[][]): ImageResult[] {
  const out: ImageResult[] = [];
  const seen = new Set<string>();
  let i = 0;
  let added = true;
  while (added) {
    added = false;
    for (const bucket of buckets) {
      const candidate = bucket[i];
      if (!candidate) continue;
      // De-dupe by URL.
      const k = candidate.url;
      if (seen.has(k)) { added = true; continue; }
      seen.add(k);
      out.push(candidate);
      added = true;
    }
    i++;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? body.word ?? "").trim();
    const requestedProvider = body.provider as ProviderName | undefined;
    const perProvider = Math.min(Math.max(Number(body.count) || 4, 1), 8);

    if (!query) {
      return respond({ error: "query is required", images: [], source: "none" }, 400);
    }

    // Single-provider short-circuit (admin diagnostic only — UI no longer uses it).
    if (requestedProvider) {
      const provider = PROVIDERS.find((p) => p.name === requestedProvider);
      if (!provider) {
        return respond({ images: [], source: "none", message: `unknown provider: ${requestedProvider}` });
      }
      const images = await provider.fn(query, perProvider);
      return respond({
        images,
        source: images.length ? provider.name : "none",
        counts: { [provider.name]: images.length },
      });
    }

    // Parallel fan-out across all providers.
    const settled = await Promise.allSettled(
      PROVIDERS.map((p) => p.fn(query, perProvider)),
    );
    const buckets = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
    const counts = Object.fromEntries(
      PROVIDERS.map((p, idx) => [p.name, buckets[idx].length]),
    ) as Record<ProviderName, number>;
    const images = interleave(buckets);

    return respond({
      images,
      source: images.length ? "merged" : "none",
      counts,
      ...(images.length ? {} : { message: "all image providers returned no results" }),
    });
  } catch (error) {
    console.error("image-search unexpected error:", error);
    return respond({ images: [], source: "none", message: "unexpected error" });
  }
});
