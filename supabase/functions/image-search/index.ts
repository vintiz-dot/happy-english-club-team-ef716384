/**
 * image-search Edge Function
 * ============================
 * Multi-provider image search with a sequential fallback chain. Returns the
 * first provider that yields >= 1 image. Each provider call has a 5s timeout
 * and is wrapped so individual failures don't abort the chain.
 *
 * Input:  { query: string }
 *         (the legacy `provider` and `count` fields are still accepted for
 *          test-button compatibility but only `provider` short-circuits the
 *          chain to a single provider.)
 *
 * Output: { images: Array<{url, thumb, thumbnail, alt, source}>,
 *           source: "pixabay"|"pexels"|"wikimedia"|"google"|"unsplash"|"none",
 *           message?: string }
 *
 * Secrets used (set on the Supabase project):
 *   Pixabay_API, Pexels_API, GOOGLE_CSE_API_KEY, GOOGLE_CSE_ID, unsplash_api
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
  thumbnail: string; // back-compat alias for existing frontend
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
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPixabay(query: string): Promise<ImageResult[]> {
  const key = Deno.env.get("Pixabay_API");
  if (!key) return [];
  const url =
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=photo,illustration&safesearch=true&per_page=6&lang=en`;
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

async function fetchPexels(query: string): Promise<ImageResult[]> {
  const key = Deno.env.get("Pexels_API");
  if (!key) return [];
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6`;
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

async function fetchWikimedia(query: string): Promise<ImageResult[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json` +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=6&prop=imageinfo&iiprop=url|mime&iiurlwidth=320&origin=*`;
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
          alt: String(p.title || query).replace(/^File:/, ""),
          source: "wikimedia" as const,
        };
      })
      .filter((r): r is ImageResult => !!r && !!r.url);
  } catch { return []; }
}

async function fetchGoogleCSE(query: string): Promise<ImageResult[]> {
  const key = Deno.env.get("GOOGLE_CSE_API_KEY");
  const cx = Deno.env.get("GOOGLE_CSE_ID");
  if (!key || !cx) return [];
  const url =
    `https://www.googleapis.com/customsearch/v1` +
    `?q=${encodeURIComponent(query)}&searchType=image&num=6&safe=active` +
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

async function fetchUnsplash(query: string): Promise<ImageResult[]> {
  // Unsplash MUST fail silently per spec — never bubble errors, log as info.
  const key = Deno.env.get("unsplash_api");
  if (!key) return [];
  try {
    const url =
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
      `&per_page=6&content_filter=high`;
    const res = await safeFetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
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

const PROVIDER_ORDER: Array<{
  name: ProviderName;
  fn: (q: string) => Promise<ImageResult[]>;
}> = [
  { name: "pixabay",   fn: fetchPixabay },
  { name: "pexels",    fn: fetchPexels },
  { name: "wikimedia", fn: fetchWikimedia },
  { name: "google",    fn: fetchGoogleCSE },
  { name: "unsplash",  fn: fetchUnsplash },
];

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

    if (!query) {
      return respond({ error: "query is required", images: [], source: "none" }, 400);
    }

    // Legacy "test single provider" path used by the Vocabulary page test buttons.
    if (requestedProvider) {
      const provider = PROVIDER_ORDER.find((p) => p.name === requestedProvider);
      if (!provider) {
        return respond({ images: [], source: "none", message: `unknown provider: ${requestedProvider}` });
      }
      const images = await provider.fn(query);
      return respond({
        images,
        source: images.length ? provider.name : "none",
        ...(images.length ? {} : { message: `${provider.name} returned no images` }),
      });
    }

    // Sequential fallback chain — first non-empty wins.
    for (const { name, fn } of PROVIDER_ORDER) {
      const images = await fn(query);
      if (images.length > 0) {
        return respond({ images, source: name });
      }
    }

    return respond({ images: [], source: "none", message: "all image providers failed" });
  } catch (error) {
    console.error("image-search unexpected error:", error);
    return respond({ images: [], source: "none", message: "unexpected error" });
  }
});
