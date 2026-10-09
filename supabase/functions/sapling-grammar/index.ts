import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Declared here rather than in ../_shared/cors.ts: that folder does not exist
// in this project (shared helpers live in ../_lib/), so the old import made
// the whole function un-deployable.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sentence } = await req.json();

    if (!sentence) {
      return new Response(JSON.stringify({ error: "Missing sentence" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const apiKey = Deno.env.get("sapling_api");
    if (!apiKey) {
      throw new Error("Missing sapling_api secret");
    }

    const response = await fetch("https://api.sapling.ai/api/v1/edits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: apiKey,
        text: sentence,
        session_id: "happy-class-mate-user",
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Sapling API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
