/**
 * save-word Edge Function
 * ========================
 * Upserts a word's enrichment payload and image URLs into the vocab_cache table.
 * This ensures subsequent lookups hit the DB first instead of the LLM.
 *
 * Input:  { word: string, root_word?: string, payload: object, image_urls?: object }
 * Output: { success: true, id: string }
 *
 * No external API keys required — uses Supabase service role.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, root_word, payload, image_urls } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "payload is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sb = createClient(supabaseUrl, supabaseKey);

    const cleanWord = word.trim().toLowerCase();

    const { data, error } = await sb
      .from("vocab_cache")
      .upsert(
        {
          word: cleanWord,
          root_word: root_word || payload.root_word || cleanWord,
          payload,
          image_urls: image_urls || null,
        },
        { onConflict: "word" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("DB upsert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save word", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("save-word error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
