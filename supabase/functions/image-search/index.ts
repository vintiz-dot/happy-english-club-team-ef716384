/**
 * image-search Edge Function
 * ============================
 * Proxies image search requests to the Google Custom Search JSON API.
 *
 * Input:  { query: string, count?: number }  // `word` is also accepted
 * Output: { images: { url, thumbnail, thumb, alt, source }[] }
 *
 * The Google API key is hardcoded — it is already restricted at the GCP
 * project level to the Custom Search API only.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = "AIzaSyARsX7963ZTsMYkT0JSvfy_7p8hfmLkZ7U";
const GOOGLE_CX = "a412bc7b376e74fed";

interface ImageResult {
  url: string;
  thumbnail: string;
  thumb: string;
  alt: string;
  source: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const emptyOk = (extra: Record<string, unknown> = {}) =>
    new Response(
      JSON.stringify({ images: [], source: "google", ...extra }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = String(body.query ?? body.word ?? "").trim();
    const count = Math.min(Math.max(Number(body.count) || 8, 1), 10);

    if (!rawQuery) {
      return new Response(
        JSON.stringify({ error: "query is required", images: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url =
      `https://www.googleapis.com/customsearch/v1` +
      `?key=${encodeURIComponent(GOOGLE_API_KEY)}` +
      `&cx=${encodeURIComponent(GOOGLE_CX)}` +
      `&q=${encodeURIComponent(rawQuery)}` +
      `&searchType=image` +
      `&num=${count}` +
      `&safe=active`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error("Google CSE error", res.status, await res.text().catch(() => ""));
      return emptyOk({ message: `CSE upstream ${res.status}` });
    }

    const data = await res.json();
    const items: any[] = Array.isArray(data.items) ? data.items : [];

    const images: ImageResult[] = items
      .map((item) => {
        const fullUrl: string = item.link ?? "";
        const thumbUrl: string = item.image?.thumbnailLink || item.link || "";
        if (!fullUrl) return null;

        return {
          url: fullUrl,
          thumbnail: thumbUrl,
          thumb: thumbUrl,
          alt: String(item.title ?? rawQuery),
          source: String(item.displayLink ?? "google"),
        } satisfies ImageResult;
      })
      .filter((x): x is ImageResult => x !== null);

    return new Response(
      JSON.stringify({ images, source: "google" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("image-search error:", error);
    return emptyOk({ message: "unexpected error" });
  }
});
