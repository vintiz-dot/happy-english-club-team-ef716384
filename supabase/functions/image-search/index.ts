/**
 * image-search Edge Function
 * Primary:   OpenAI DALL·E 3 (kid-friendly illustration of the word)
 * Fallback1: Pixabay (illustrations, safesearch on)
 * Fallback2: Pexels  (photos, kid-friendly hint)
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
  source: "openai" | "pixabay" | "pexels";
}

async function tryOpenAI(word: string): Promise<ImageResult[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return [];
  try {
    const prompt = `A simple, clear, colorful illustration of '${word}' on a plain white background, suitable for children learning English. No text, no labels.`;
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
      }),
    });
    if (!r.ok) {
      console.error("OpenAI image error", r.status, await r.text());
      return [];
    }
    const data = await r.json();
    const url = data?.data?.[0]?.url;
    if (!url) return [];
    return [{ url, thumbnail: url, alt: word, source: "openai" }];
  } catch (e) {
    console.error("OpenAI fetch failed", e);
    return [];
  }
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

    // ---------- OpenAI (primary) ----------
    let images: ImageResult[] = await tryOpenAI(word);

    // ---------- Pixabay (fallback 1) ----------
    if (images.length === 0) {
      const pixabayKey = Deno.env.get("Pixabay_API");
      if (pixabayKey) {
        const url = new URL("https://pixabay.com/api/");
        url.searchParams.set("key", pixabayKey);
        url.searchParams.set("q", `${word} simple illustration isolated`);
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
    }

    // ---------- Pexels (fallback 2) ----------
    if (images.length === 0) {
      const pexelsKey = Deno.env.get("Pexels_API");
      if (pexelsKey) {
        const url = new URL("https://api.pexels.com/v1/search");
        url.searchParams.set(
          "query",
          `${word} simple illustration isolated kid friendly clear`,
        );
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
