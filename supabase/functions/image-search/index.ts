/**
 * image-search Edge Function
 * ============================
 * Proxies image search requests to Pixabay (primary) with Pexels fallback.
 * Appends "isolated white background" to queries for kid-friendly clarity.
 *
 * Input:  { query: string, count?: number }
 * Output: { images: { url: string, thumbnail: string, alt: string, source: string }[] }
 *
 * Secrets required:
 *   Pixabay_API — Pixabay API key
 *   Pexels_API  — Pexels API key
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ImageResult {
  url: string;
  thumbnail: string;
  alt: string;
  source: "pixabay" | "pexels";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const rawQuery = (body.query || "").trim();
    const count = Math.min(Math.max(body.count || 8, 1), 20);

    if (!rawQuery) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Append kid-friendly search terms
    const query = rawQuery + " isolated white background";

    // ── Try Pixabay first ──
    const pixabayKey = Deno.env.get("Pixabay_API");
    if (pixabayKey) {
      try {
        const pixabayUrl =
          `https://pixabay.com/api/?key=${encodeURIComponent(pixabayKey)}` +
          `&q=${encodeURIComponent(query)}` +
          `&image_type=illustration&safesearch=true&per_page=${count}&lang=en`;

        const res = await fetch(pixabayUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.hits && data.hits.length > 0) {
            const images: ImageResult[] = data.hits.map((hit: any) => ({
              url: hit.webformatURL || hit.largeImageURL,
              thumbnail: hit.previewURL || hit.webformatURL,
              alt: hit.tags || rawQuery,
              source: "pixabay" as const,
            }));
            return new Response(
              JSON.stringify({ images, source: "pixabay" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (e) {
        console.error("Pixabay search failed:", e);
      }
    }

    // ── Fallback to Pexels ──
    const pexelsKey = Deno.env.get("Pexels_API");
    if (pexelsKey) {
      try {
        const pexelsUrl =
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(rawQuery)}` +
          `&per_page=${count}&size=small`;

        const res = await fetch(pexelsUrl, {
          headers: { Authorization: pexelsKey },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.photos && data.photos.length > 0) {
            const images: ImageResult[] = data.photos.map((photo: any) => ({
              url: photo.src?.medium || photo.src?.original,
              thumbnail: photo.src?.small || photo.src?.tiny,
              alt: photo.alt || rawQuery,
              source: "pexels" as const,
            }));
            return new Response(
              JSON.stringify({ images, source: "pexels" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch (e) {
        console.error("Pexels search failed:", e);
      }
    }

    // ── No results from either API ──
    return new Response(
      JSON.stringify({ images: [], source: "none", message: "No images found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("image-search error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
