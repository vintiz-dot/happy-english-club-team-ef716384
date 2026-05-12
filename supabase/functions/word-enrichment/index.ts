/**
 * word-enrichment Edge Function
 * ================================
 * Receives a target English word + optional sentence context, returns
 * a rich JSON payload with root word, CEFR level, EN+VI definitions,
 * synonyms, antonyms, word forms (with POS), 3 usage examples per form,
 * and 3 root-word usages with Vietnamese explanations.
 *
 * DB-first: checks vocab_cache table before calling OpenAI to save costs.
 * Cache rows that pre-date the new fields (cefr/definition_en/form_usages)
 * are treated as misses and re-enriched.
 *
 * Input:  { word: string, context?: string, target_cefr?: "A1"|"A2"|"B1"|"B2" }
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

type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface UsageExample {
  english_sentence: string;
  vietnamese_translation: string;
  vietnamese_explanation: string;
}

interface FormExample {
  english_sentence: string;
  vietnamese_translation: string;
}

interface WordForm {
  form: string;
  pos: string;
}

interface FormUsage {
  form: string;
  examples: FormExample[];
}

interface WordEnrichmentPayload {
  root_word: string;
  level: string;
  cefr: CefrLevel;
  definition_en: string;
  definition_vi: string;
  synonyms: string[];
  antonyms: string[];
  word_forms: WordForm[];
  form_usages: FormUsage[];
  usages: UsageExample[];
}

function buildSystemPrompt(targetCefr: CefrLevel): string {
  return `You are an expert EAL teacher helping Vietnamese ESL learners. Your task is to receive a target English word and its sentence context, and return a strictly formatted JSON object.

Write definitions and examples that a CEFR ${targetCefr} Vietnamese ESL learner can understand. Keep definitions <=25 words. Use simple vocabulary.

Do not include markdown formatting or conversational text outside the JSON. Use simple language. When possible, prefer definitions and example words/places that a Vietnamese/Hanoi student would recognize.

Required JSON Structure:

{
  "root_word": "[The base lemma of the target word]",
  "level": "[Estimated CEFR Level: Pre-A1, A1, A2, B1, B2, C1, or C2]",
  "cefr": "[One of: A1, A2, B1, B2, C1, C2 — best single estimate]",
  "definition_en": "[A simple English definition, <=25 words, at the CEFR ${targetCefr} level]",
  "definition_vi": "[A Vietnamese translation/explanation of the word for a Vietnamese ESL learner]",
  "synonyms": ["[1-3 simple synonyms]"],
  "antonyms": ["[1-3 simple antonyms]"],
  "word_forms": [
    { "form": "[a form]", "pos": "[e.g. verb (base), verb (3rd person), verb (past), verb (gerund), noun (singular), noun (plural), adjective, adverb]" }
  ],
  "form_usages": [
    {
      "form": "[the same form text as in word_forms]",
      "examples": [
        { "english_sentence": "[simple example using this form]", "vietnamese_translation": "[VN translation]" },
        { "english_sentence": "[another simple example]", "vietnamese_translation": "[VN translation]" },
        { "english_sentence": "[third simple example]", "vietnamese_translation": "[VN translation]" }
      ]
    }
  ],
  "usages": [
    {
      "english_sentence": "[A simple sentence using the root word]",
      "vietnamese_translation": "[Accurate VN translation]",
      "vietnamese_explanation": "[A short VN explanation of the word's role in this sentence]"
    }
  ]
}

STRICT RULES:
1. Provide exactly 3 root-word usages in "usages".
2. Provide exactly 3 examples per form in "form_usages".
3. For each item in word_forms, there must be a matching entry in form_usages (same "form" string).
4. All sentences must be writable for a CEFR ${targetCefr} learner.
5. Vietnamese explanations should be natural and simple.
6. Synonyms and antonyms must be simple words at the learner's level.
7. The JSON must be valid: no trailing commas, no markdown fences, no extra text outside the JSON.
8. NEVER return null or omit any field. If a field is not applicable, return an empty array for it.`;
}

// ─── Server-side fallback helpers ────────────────────────────────────────

function detectPos(word: string, declaredLevel: string | undefined): string {
  // Cheap heuristic — relies on OpenAI being more accurate when it does respond.
  const w = word.toLowerCase();
  if (w.endsWith("ly")) return "adverb";
  if (w.endsWith("ing") || w.endsWith("ed") || w.endsWith("ate") || w.endsWith("ize")) return "verb";
  if (w.endsWith("ous") || w.endsWith("ful") || w.endsWith("ive") || w.endsWith("less") || w.endsWith("able") || w.endsWith("ible")) return "adjective";
  if (w.endsWith("tion") || w.endsWith("ness") || w.endsWith("ment") || w.endsWith("ity") || w.endsWith("ence") || w.endsWith("ance")) return "noun";
  return "noun";
}

function deriveWordForms(rootWord: string, pos: string): WordForm[] {
  const w = rootWord.toLowerCase();
  switch (pos) {
    case "verb": {
      const thirdSg = w.endsWith("s") || w.endsWith("x") || w.endsWith("z") || w.endsWith("ch") || w.endsWith("sh")
        ? w + "es"
        : w.endsWith("y") && !/[aeiou]y$/.test(w)
          ? w.slice(0, -1) + "ies"
          : w + "s";
      const past = w.endsWith("e")
        ? w + "d"
        : w.endsWith("y") && !/[aeiou]y$/.test(w)
          ? w.slice(0, -1) + "ied"
          : w + "ed";
      const ing = w.endsWith("e") && !w.endsWith("ee")
        ? w.slice(0, -1) + "ing"
        : w + "ing";
      return [
        { form: w, pos: "verb (base)" },
        { form: thirdSg, pos: "verb (3rd person)" },
        { form: past, pos: "verb (past)" },
        { form: ing, pos: "verb (gerund)" },
      ];
    }
    case "noun": {
      const plural = w.endsWith("s") || w.endsWith("x") || w.endsWith("z") || w.endsWith("ch") || w.endsWith("sh")
        ? w + "es"
        : w.endsWith("y") && !/[aeiou]y$/.test(w)
          ? w.slice(0, -1) + "ies"
          : w + "s";
      return [
        { form: w, pos: "noun (singular)" },
        { form: plural, pos: "noun (plural)" },
      ];
    }
    case "adjective": {
      const er = w.endsWith("e") ? w + "r" : w.endsWith("y") ? w.slice(0, -1) + "ier" : w + "er";
      const est = w.endsWith("e") ? w + "st" : w.endsWith("y") ? w.slice(0, -1) + "iest" : w + "est";
      return [
        { form: w, pos: "adjective" },
        { form: er, pos: "adjective (comparative)" },
        { form: est, pos: "adjective (superlative)" },
      ];
    }
    default:
      return [{ form: w, pos: pos || "word" }];
  }
}

const TEMPLATE_SENTENCES: Record<string, string[]> = {
  "verb (base)":         ["She {form} every day.", "We often {form} together.", "Please {form} carefully."],
  "verb (3rd person)":   ["He {form} every morning.", "It {form} quickly.", "She {form} well."],
  "verb (past)":         ["Yesterday I {form}.", "They {form} last week.", "We {form} before."],
  "verb (gerund)":       ["I am {form} now.", "She enjoys {form}.", "They keep {form}."],
  "noun (singular)":     ["The {form} is here.", "I have one {form}.", "This {form} is mine."],
  "noun (plural)":       ["I see two {form}.", "We have many {form}.", "These {form} are red."],
  "adjective":           ["The cat is {form}.", "This is a {form} day.", "She looks {form}."],
  "adjective (comparative)": ["This is {form} than before.", "Today feels {form}.", "It is {form} now."],
  "adjective (superlative)": ["That is the {form} one.", "She is the {form} student.", "This is the {form} day."],
  "adverb":              ["She speaks {form}.", "He runs {form}.", "They sing {form}."],
};

function templateExamples(form: string, pos: string): FormExample[] {
  const templates = TEMPLATE_SENTENCES[pos] || ["This is {form}.", "I like {form}.", "Use {form} every day."];
  return templates.map((t) => ({
    english_sentence: t.replace("{form}", form),
    vietnamese_translation: "[Vietnamese translation needed]",
  }));
}

function ensureFormUsages(forms: WordForm[], provided: FormUsage[]): FormUsage[] {
  const byForm = new Map(provided.map((f) => [f.form.toLowerCase(), f]));
  return forms.map((wf) => {
    const found = byForm.get(wf.form.toLowerCase());
    if (found && Array.isArray(found.examples) && found.examples.length > 0) {
      return {
        form: wf.form,
        examples: found.examples.slice(0, 3).map((e) => ({
          english_sentence: String(e.english_sentence || ""),
          vietnamese_translation: String(e.vietnamese_translation || "[Vietnamese translation needed]"),
        })),
      };
    }
    return { form: wf.form, examples: templateExamples(wf.form, wf.pos) };
  });
}

function hasNewFields(payload: any): boolean {
  return !!(
    payload &&
    typeof payload === "object" &&
    typeof payload.cefr === "string" &&
    typeof payload.definition_en === "string" &&
    Array.isArray(payload.word_forms) &&
    payload.word_forms.length > 0 &&
    (typeof payload.word_forms[0] === "object") &&
    Array.isArray(payload.form_usages)
  );
}

const VALID_CEFR: Set<CefrLevel> = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

function normalizeCefr(value: unknown, fallback: CefrLevel = "A1"): CefrLevel {
  if (typeof value === "string") {
    const v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (VALID_CEFR.has(v as CefrLevel)) return v as CefrLevel;
  }
  return fallback;
}

// ─── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, context, target_cefr } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanWord = word.trim().toLowerCase();
    const targetCefr = normalizeCefr(target_cefr, "A1");

    // ── Check vocab_cache DB first ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let sb: ReturnType<typeof createClient> | null = null;

    if (supabaseUrl && supabaseKey) {
      try {
        sb = createClient(supabaseUrl, supabaseKey);
        const { data: cached } = await sb
          .from("vocab_cache")
          .select("payload")
          .eq("word", cleanWord)
          .maybeSingle();

        if (cached?.payload && hasNewFields(cached.payload)) {
          console.log(`Cache hit for "${cleanWord}"`);
          return new Response(JSON.stringify(cached.payload), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (cached?.payload) {
          console.log(`Cache miss (stale shape) for "${cleanWord}" — re-enriching`);
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
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
          { role: "system", content: buildSystemPrompt(targetCefr) },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 1600,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty AI response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e, content);
      return new Response(
        JSON.stringify({ error: "Invalid AI response format", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Normalize word_forms — accept either string[] (legacy prompt style) or object[].
    let wordForms: WordForm[] = [];
    if (Array.isArray(parsed.word_forms) && parsed.word_forms.length > 0) {
      wordForms = parsed.word_forms.map((wf: any) => {
        if (typeof wf === "string") return { form: wf, pos: "" };
        if (wf && typeof wf === "object") {
          return { form: String(wf.form || ""), pos: String(wf.pos || "") };
        }
        return { form: "", pos: "" };
      }).filter((wf) => wf.form);
    }

    const detectedPos = wordForms[0]?.pos?.split(" ")[0] || detectPos(cleanWord, parsed.level);
    if (wordForms.length === 0) {
      wordForms = deriveWordForms(cleanWord, detectedPos);
    }

    const formUsages = ensureFormUsages(
      wordForms,
      Array.isArray(parsed.form_usages) ? parsed.form_usages : [],
    );

    const cefr = normalizeCefr(parsed.cefr ?? parsed.level, targetCefr);

    const result: WordEnrichmentPayload = {
      root_word: parsed.root_word || cleanWord,
      level: parsed.level || cefr,
      cefr,
      definition_en: String(parsed.definition_en || "").slice(0, 300),
      definition_vi: String(parsed.definition_vi || ""),
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 3) : [],
      antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms.slice(0, 3) : [],
      word_forms: wordForms.slice(0, 6),
      form_usages: formUsages.slice(0, 6),
      usages: Array.isArray(parsed.usages) ? parsed.usages.slice(0, 3) : [],
    };

    // Persist to vocab_cache (best-effort).
    if (sb) {
      try {
        await sb
          .from("vocab_cache")
          .upsert({ word: cleanWord, payload: result }, { onConflict: "word" });
      } catch (e) {
        console.error("vocab_cache upsert failed:", e);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("word-enrichment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
