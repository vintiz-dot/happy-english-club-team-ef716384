import { requireSpender, type SpendGate } from "../_lib/ai-gate.ts";

// A signed-in account holding a role, and no more than 30 calls per
// account in each window: a 10-minute Azure Speech token; the recorder asks once per take.
const GATE: SpendGate = { name: "get-speech-token", limit: 30, windowMs: 10 * 60_000 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Who is asking, before anything is read or spent (audit F-02).
  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;

  try {
    const speechKey = Deno.env.get("azure_key");
    const speechRegion = Deno.env.get("AZURE_SPEECH_REGION") || "southeastasia";

    if (!speechKey) {
      return new Response(
        JSON.stringify({ error: "Azure Speech not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenUrl = `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": speechKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.statusText}`);
    }

    const token = await response.text();

    return new Response(
      JSON.stringify({ token, region: speechRegion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Token error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
