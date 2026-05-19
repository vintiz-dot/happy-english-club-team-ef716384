const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sentence } = await req.json();

    if (!sentence || typeof sentence !== "string") {
      return new Response(JSON.stringify({ error: "Missing sentence" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const apiKey = Deno.env.get("sapling_api");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing sapling_api secret" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const response = await fetch("https://api.sapling.ai/api/v1/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    return new Response(JSON.stringify({ error: String((error as any)?.message || error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
