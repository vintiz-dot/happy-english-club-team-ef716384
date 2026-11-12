import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { requireSpender, type SpendGate } from "../_lib/ai-gate.ts";

// A signed-in account holding a role, and no more than 90 calls per
// account in each window: Sapling per checked sentence.
const GATE: SpendGate = { name: "sapling-grammar", limit: 90, windowMs: 5 * 60_000 };

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

  // Who is asking, before anything is read or spent (audit F-02).
  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;

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
