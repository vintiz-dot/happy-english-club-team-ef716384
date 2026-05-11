/**
 * image-search Edge Function
 * Primary:  Pixabay (illustrations, safesearch on)
 * Fallback: Pexels  (photos, kid-friendly hint)
 * Query strategy: bias toward concrete, isolated illustrations to
 * stop the abstract/unrelated results we were seeing on bare words.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { query, count = 12 } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const word = query.trim().toLowerCase();
    const pixabayQ = `${word} simple illustration isolated`;
    const pexelsQ  = `${word} simple illustration isolated kid friendly clear`;

    // ---------- Pixabay (primary) ----------
    const pixabayKey = Deno.env.get("Pixabay_API");
    let images: ImageResult[] = [];

    if (pixabayKey) {
      const url = new URL("https://pixabay.com/api/");
      url.searchParams.set("key", pixabayKey);
      url.searchParams.set("q", pixabayQ);
      url.searchParams.set("image_type", "illustration");
      url.searchParams.set("safesearch", "true");
      url.searchParams.set("per_page", String(Math.max(3, Math.min(count, 20))));
      url.searchParams.set("orientation", "horizontal");

      const r = await fetch(url.toString());
      if (r.ok) {
        const data = await r.json();
        images = (data.hits ?? []).map((h: any) => ({
          url: h.largeImageURL || h.webformatURL,
          thumbnail: h.previewURL || h.webformatURL,
          alt: h.tags || word,
          source: "pixabay" as const,
        }));
      } else {
        console.error("Pixabay error", r.status, await r.text());
      }
    }

    // ---------- Pexels (fallback) ----------
    if (images.length === 0) {
      const pexelsKey = Deno.env.get("Pexels_API");
      if (pexelsKey) {
        const url = new URL("https://api.pexels.com/v1/search");
        url.searchParams.set("query", pexelsQ);
        url.searchParams.set("per_page", String(count));
        url.searchParams.set("orientation", "landscape");

        const r = await fetch(url.toString(), {
          headers: { Authorization: pexelsKey },
        });
        if (r.ok) {
          const data = await r.json();
          images = (data.photos ?? []).map((p: any) => ({
            url: p.src?.large || p.src?.original,
            thumbnail: p.src?.medium || p.src?.small,
            alt: p.alt || word,
            source: "pexels" as const,
          }));
        } else {
          console.error("Pexels error", r.status, await r.text());
        }
      }
    }

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-search fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
