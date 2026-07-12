// smart-dictation Edge Function
// Proxies requests to OpenAI gpt-4o-mini for ESL pronunciation correction.
// The OPENAI_API_KEY must be set in Supabase Dashboard → Edge Functions → Secrets.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText, targetLanguage } = await req.json();

    if (!rawText || typeof rawText !== "string") {
      return new Response(
        JSON.stringify({ error: "rawText is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vietnamese mode — return as-is, no AI needed
    if (targetLanguage !== "en") {
      return new Response(
        JSON.stringify({ correctedText: rawText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // English mode — polish via OpenAI
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("OPENAI_API_KEY is not configured in edge function secrets.");
      // Graceful fallback — return raw text instead of hard-failing
      return new Response(
        JSON.stringify({ correctedText: rawText, warning: "AI polishing unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt =
      "You are a supportive ESL teacher. A 7-year-old Vietnamese student learning English just spoke the following text. " +
      "1. Correct any obvious 'Viet-glish' phonetic mispronunciations. " +
      "2. Fix the grammar and spelling to a standard CEFR A1/A2 level while keeping their original meaning intact. " +
      "3. Output ONLY the corrected English sentence.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + openAiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI API error:", err);
      // Graceful fallback
      return new Response(
        JSON.stringify({ correctedText: rawText, warning: "AI polishing failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();

    return new Response(
      JSON.stringify({ correctedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("smart-dictation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
