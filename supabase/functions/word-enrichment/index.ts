/**
 * word-enrichment Edge Function
 * ================================
 * Receives a target English word + optional sentence context, returns
 * a rich JSON payload with root word, CEFR level, synonyms, antonyms,
 * word forms, and 3 usage examples with Vietnamese translations.
 *
 * DB-first: checks vocab_cache table before calling OpenAI to save costs.
 *
 * Input:  { word: string, context?: string }
 * Output: WordEnrichmentPayload (see interface below)
 *
 * Secrets required:
 *   OPENAI_API_KEY — OpenAI API key
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UsageExample {
  english_sentence: string;
  vietnamese_translation: string;
  vietnamese_explanation: string;
}

interface WordEnrichmentPayload {
  root_word: string;
  level: string;
  synonyms: string[];
  antonyms: string[];
  word_forms: string[];
  usages: UsageExample[];
}

const SYSTEM_PROMPT = `You are an expert EAL teacher for Grade 1 to 5 students in Vietnam. Your task is to receive a target English word and its sentence context, and return a strictly formatted JSON object.

Do not include markdown formatting or conversational text outside the JSON. The language must be extremely simple, avoiding complex academic jargon, use definitions and words that have vietnamese/hanoi context if/when possible.

Required JSON Structure:

{
  "root_word": "[The base lemma of the target word]",
  "level": "[Estimated CEFR Level: Pre-A1, A1, A2, or B1]",
  "synonyms": ["[1-2 simple synonyms]"],
  "antonyms": ["[1-2 simple antonyms]"],
  "word_forms": ["[List of forms, e.g., run, running, ran, runs]"],
  "usages": [
    {
      "english_sentence": "[A simple Grade 1-5 level sentence using the word]",
      "vietnamese_translation": "[Accurate translation]",
      "vietnamese_explanation": "[A very short, simple explanation in Vietnamese of how the word acts in this specific sentence (e.g., 'Chỉ hành động di chuyển nhanh')]"
    }
  ]
}

STRICT RULES:
1. Provide exactly 3 distinct usages showing different contexts or parts of speech if applicable.
2. All example sentences must be at Grade 1-5 level (CEFR Pre-A1 to A2).
3. Vietnamese explanations should be natural and simple, as if a Vietnamese teacher is explaining to a young student in Hanoi.
4. Synonyms and antonyms must be simple words a Grade 1-5 student would know.
5. The JSON must be valid. No trailing commas. No markdown fences. No extra text outside the JSON.
6. NEVER return null or omit any field.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, context } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanWord = word.trim().toLowerCase();

    // ── Check vocab_cache DB first ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (supabaseUrl && supabaseKey) {
      try {
        const sb = createClient(supabaseUrl, supabaseKey);
        const { data: cached } = await sb
          .from("vocab_cache")
          .select("payload")
          .eq("word", cleanWord)
          .maybeSingle();

        if (cached?.payload) {
          console.log(`Cache hit for "${cleanWord}"`);
          return new Response(
            JSON.stringify(cached.payload),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (dbErr) {
        console.error("DB cache lookup failed (continuing to OpenAI):", dbErr);
      }
    }

    // ── Call OpenAI ──
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      console.error("OPENAI_API_KEY is not configured.");
      return new Response(
        JSON.stringify({ error: "AI service unavailable", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = context
      ? `Word: "${cleanWord}"\nSentence context: "${context}"`
      : `Word: "${cleanWord}"`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + openAiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty AI response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: WordEnrichmentPayload;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e, content);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize
    const result: WordEnrichmentPayload = {
      root_word: parsed.root_word || cleanWord,
      level: parsed.level || "A1",
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 3) : [],
      antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms.slice(0, 3) : [],
      word_forms: Array.isArray(parsed.word_forms) ? parsed.word_forms : [],
      usages: Array.isArray(parsed.usages) ? parsed.usages.slice(0, 3) : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("word-enrichment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
