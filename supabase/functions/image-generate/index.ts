/**
 * image-generate Edge Function
 * Uses OpenAI DALL·E 3 to generate a vocabulary illustration.
 * Returns { imageUrl: string } with OpenAI's temporary URL.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function buildPrompt(word: string): string {
  return `A simple, clear, colorful illustration of '${word}' on a plain white background, suitable for children learning English. No text, no labels.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();
    if (!word || typeof word !== "string") {
      return new Response(JSON.stringify({ error: "word is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: buildPrompt(word.trim()),
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("OpenAI image error", r.status, text);
      return new Response(
        JSON.stringify({ error: "OpenAI image generation failed", detail: text }),
        {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await r.json();
    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image URL returned from OpenAI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-generate fatal", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
