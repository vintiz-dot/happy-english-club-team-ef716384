/**
 * smart-dictionary Edge Function (v2 — LLM-powered ESL Dictionary)
 * =================================================================
 * Generates CEFR-calibrated dictionary entries via OpenAI gpt-4o-mini.
 *
 * Accepts TWO calling conventions for backwards compatibility:
 *
 *   v2 (preferred):
 *     { target_word: string, part_of_speech?: string, cefr_level: string }
 *
 *   v1 (legacy, auto-converted):
 *     { word: string, grade: number }
 *
 * Output (v2): a single ESLDictionaryEntry JSON object:
 *   {
 *     target_word, part_of_speech, cefr_level,
 *     vietnamese_translation, english_definition,
 *     usage_examples: string[2],
 *     synonyms: string[0-3],
 *     antonyms: string[0-2]
 *   }
 *
 * Output (v1 legacy): DictEntry[] matching the old frontend interface.
 *
 * Secrets required (Supabase Dashboard → Edge Functions → Secrets):
 *   OPENAI_API_KEY
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Grade → CEFR level quick-map (for v1 legacy callers) ──────────────

const GRADE_TO_CEFR: Record<number, string> = {
  1: "Pre-A1",
  2: "Pre-A1",
  3: "A1",
  4: "A1",
  5: "A2",
  6: "A2",
  7: "A2-B1",
  8: "B1",
};

function gradeToCEFR(grade: number): string {
  if (grade >= 1 && grade <= 8) return GRADE_TO_CEFR[grade];
  return "A1"; // safe fallback
}

// ─── CEFR level → prompt constraint description ────────────────────────

function getCEFRPromptConstraint(level: string): string {
  const constraints: Record<string, string> = {
    "Pre-A1":
      "Use only the 300-400 most common English words. " +
      "The definition must be 1 short sentence (max 8 words). " +
      "Example sentences must be 3-6 words using simple present tense only. " +
      "Synonyms and antonyms must be among the 400 most common English words. " +
      "Avoid abstract concepts; use concrete, visible things a 6-7 year old understands.",
    "A1":
      "Use only vocabulary within the A1 CEFR word list (~500-800 headwords). " +
      "The definition must be 1-2 simple sentences (max 12 words each). " +
      "Example sentences must be 5-10 words using simple present, present continuous, or simple past. " +
      "Synonyms and antonyms must be at A1 level or below. " +
      "Avoid idioms, phrasal verbs with non-literal meanings, or figurative language.",
    "A2":
      "Use vocabulary within the A2 CEFR word list (~1200-1500 headwords). " +
      "The definition should be 1-2 clear sentences (max 18 words each). " +
      "Example sentences should be 7-14 words. All basic tenses are acceptable. " +
      "Synonyms and antonyms must be at A2 level or below. " +
      "Common phrasal verbs (get up, look for) are fine but no idioms.",
    "A2-B1":
      "Use vocabulary within the B1 CEFR word list (~2000 headwords). " +
      "The definition can be 1-2 sentences of natural English. " +
      "Example sentences 8-16 words. All tenses, passive voice, and reported speech are fine. " +
      "Synonyms and antonyms must be at B1 level or below. " +
      "Moderate use of linking words (however, although) is acceptable.",
    "B1":
      "Use vocabulary within the B1 CEFR word list (~2500 headwords). " +
      "The definition should be precise and natural. " +
      "Example sentences can be full complex sentences (up to 18 words). " +
      "Synonyms and antonyms should be at B1 level or below. " +
      "All grammar structures, common idioms, and phrasal verbs are fine.",
  };
  return constraints[level] || constraints["A1"];
}

// ─── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ── Detect calling convention ──
    const isV2 = Boolean(body.target_word || body.cefr_level);

    if (isV2) {
      return await handleV2(body);
    } else {
      return await handleV1Legacy(body);
    }
  } catch (error) {
    console.error("smart-dictionary error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// V2 Handler — New ESL Dictionary payload
// ═══════════════════════════════════════════════════════════════════════════

interface ESLDictionaryEntry {
  target_word: string;
  part_of_speech: string;
  cefr_level: string;
  vietnamese_translation: string;
  english_definition: string;
  usage_examples: string[];
  synonyms: string[];
  antonyms: string[];
}

async function handleV2(body: {
  target_word?: string;
  part_of_speech?: string;
  cefr_level?: string;
  grade?: number;
}): Promise<Response> {
  const targetWord = (body.target_word || "").trim().toLowerCase();
  if (!targetWord) {
    return new Response(
      JSON.stringify({ error: "target_word is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Resolve CEFR level: explicit or from grade
  const cefrLevel =
    body.cefr_level || (body.grade ? gradeToCEFR(Number(body.grade)) : "A1");
  const partOfSpeech = (body.part_of_speech || "").trim() || "auto-detect";

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    console.error("OPENAI_API_KEY is not configured in edge function secrets.");
    return new Response(
      JSON.stringify({
        error: "AI service unavailable",
        fallback: true,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const constraint = getCEFRPromptConstraint(cefrLevel);

  // ── Build the ESL Dictionary system prompt ──
  const systemPrompt = `You are an expert ESL (English as a Second Language) dictionary designed for Vietnamese students.

ROLE: Act as a dictionary that produces entries strictly calibrated to CEFR level "${cefrLevel}".

LANGUAGE CONSTRAINTS — follow these strictly:
${constraint}

TASK:
Given a target English word${partOfSpeech !== "auto-detect" ? ` (used as a ${partOfSpeech})` : ""}, produce a dictionary entry.

Respond ONLY with a valid JSON object in this EXACT structure (no markdown, no commentary, no extra keys):
{
  "target_word": "<the word>",
  "part_of_speech": "<noun|verb|adjective|adverb|phrase|other>",
  "cefr_level": "${cefrLevel}",
  "vietnamese_translation": "<accurate Vietnamese translation of the word>",
  "english_definition": "<definition written using ONLY vocabulary at or below ${cefrLevel} level>",
  "usage_examples": [
    "<example sentence 1 — grammar and vocabulary must not exceed ${cefrLevel}>",
    "<example sentence 2 — grammar and vocabulary must not exceed ${cefrLevel}>"
  ],
  "synonyms": [
    "<synonym 1 at or below ${cefrLevel} — or omit if none exist>",
    "<synonym 2 at or below ${cefrLevel} — or omit if none exist>"
  ],
  "antonyms": [
    "<antonym 1 at or below ${cefrLevel} — or omit if none exist>"
  ]
}

STRICT RULES:
1. "vietnamese_translation" must be an accurate, natural Vietnamese translation.
2. You must ALWAYS return an "english_definition" using simple, easy-to-understand words, even for complex concepts. MUST use ONLY vocabulary at or below ${cefrLevel}. Do NOT use words the student hasn't learned yet.
3. "usage_examples" MUST contain exactly 2 sentences. You must ALWAYS return 2 usage examples using simple, easy-to-understand words, even for complex concepts. Both sentences must use grammar and vocabulary at or below ${cefrLevel}.
4. "synonyms" MUST contain 1-3 words. For synonyms, if perfect grade-level matches do not exist, provide the closest simple related words (e.g., for "environment", use "nature" or "world"). Each synonym should be at or below ${cefrLevel} when possible, but NEVER return an empty synonyms array — always provide at least one close related word.
5. "antonyms" MUST contain 0-2 words. Each antonym must be at or below ${cefrLevel}. If an antonym truly does not exist for the concept, return an empty array [], but DO NOT fail or omit the other fields.
6. ${partOfSpeech !== "auto-detect" ? `The part_of_speech MUST be "${partOfSpeech}".` : "Detect the most common part of speech for this word."}
7. The JSON must be valid. No trailing commas. No markdown fences. No extra text.
8. NEVER return null or omit any field. Every field in the schema MUST be present in the response.`;

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + openAiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: targetWord },
        ],
        temperature: 0.15,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI API error:", errText);
    return new Response(
      JSON.stringify({ error: "AI service error", details: errText }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return new Response(
      JSON.stringify({ error: "Empty AI response" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let parsed: ESLDictionaryEntry;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse AI JSON:", e, content);
    return new Response(
      JSON.stringify({ error: "Invalid AI response format", raw: content }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // ── Validate and normalize the response ──
  const result: ESLDictionaryEntry = {
    target_word: parsed.target_word || targetWord,
    part_of_speech: parsed.part_of_speech || partOfSpeech,
    cefr_level: cefrLevel,
    vietnamese_translation: parsed.vietnamese_translation || "",
    english_definition: parsed.english_definition || "",
    usage_examples: Array.isArray(parsed.usage_examples)
      ? parsed.usage_examples.slice(0, 2)
      : [],
    synonyms: Array.isArray(parsed.synonyms)
      ? parsed.synonyms.slice(0, 3)
      : [],
    antonyms: Array.isArray(parsed.antonyms)
      ? parsed.antonyms.slice(0, 2)
      : [],
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// V1 Legacy Handler — Preserves old DictEntry[] format for existing callers
// ═══════════════════════════════════════════════════════════════════════════

interface CEFRConstraint {
  level: string;
  vocabCeiling: number;
  prompt: string;
}

const CEFR_MAP: Record<number, CEFRConstraint> = {
  1: {
    level: "Pre-A1",
    vocabCeiling: 300,
    prompt:
      "Use only the 300 most common English words. " +
      "Definitions must be 1 short sentence (max 8 words). " +
      "Example sentences must be 3-6 words using simple present tense. " +
      "Avoid abstract concepts; use concrete, visible things a 6-year-old understands.",
  },
  2: {
    level: "Pre-A1",
    vocabCeiling: 400,
    prompt:
      "Use only the 400 most common English words. " +
      "Definitions must be 1 short sentence (max 10 words). " +
      "Example sentences must be 4-7 words using simple present tense. " +
      "Avoid abstract concepts; use concrete, visible things a 7-year-old understands.",
  },
  3: {
    level: "A1",
    vocabCeiling: 500,
    prompt:
      "Use only the 500 most common English words. " +
      "Definitions must be 1-2 simple sentences (max 12 words each). " +
      "Example sentences must be 5-8 words. " +
      "Use only simple present and present continuous tenses. " +
      "Avoid idioms or figurative language.",
  },
  4: {
    level: "A1",
    vocabCeiling: 800,
    prompt:
      "Use vocabulary within the A1 CEFR word list (~800 headwords). " +
      "Definitions should be 1-2 clear sentences (max 15 words each). " +
      "Example sentences should be 6-10 words. " +
      "Simple present, present continuous, simple past are acceptable. " +
      "No idioms or phrasal verbs with non-literal meanings.",
  },
  5: {
    level: "A2",
    vocabCeiling: 1200,
    prompt:
      "Use vocabulary within the A2 CEFR word list (~1200 headwords). " +
      "Definitions should be 1-2 sentences (max 18 words each). " +
      "Example sentences should be 7-12 words. " +
      "All basic tenses are acceptable. " +
      "May include common phrasal verbs (get up, look for) but no idioms.",
  },
  6: {
    level: "A2",
    vocabCeiling: 1500,
    prompt:
      "Use vocabulary within the A2-B1 CEFR word list (~1500 headwords). " +
      "Definitions should be concise (1-2 sentences, max 20 words each). " +
      "Example sentences 8-14 words. " +
      "All tenses including present perfect are acceptable. " +
      "Common phrasal verbs and collocations are fine.",
  },
  7: {
    level: "A2-B1",
    vocabCeiling: 2000,
    prompt:
      "Use vocabulary within the B1 CEFR word list (~2000 headwords). " +
      "Definitions can be 1-2 sentences of natural academic English. " +
      "Example sentences 8-16 words. " +
      "All tenses, passive voice, and reported speech are acceptable. " +
      "Moderate use of linking words (however, although).",
  },
  8: {
    level: "B1",
    vocabCeiling: 2500,
    prompt:
      "Use vocabulary within the B1 CEFR word list (~2500 headwords). " +
      "Definitions should be precise and natural. " +
      "Example sentences can be full complex sentences (up to 18 words). " +
      "All grammar structures are acceptable. " +
      "Common idioms and phrasal verbs are fine.",
  },
};

function getConstraint(grade: number): CEFRConstraint {
  if (grade >= 1 && grade <= 8) return CEFR_MAP[grade];
  return CEFR_MAP[3]; // fallback
}

async function handleV1Legacy(body: {
  word?: string;
  grade?: number;
}): Promise<Response> {
  const word = (body.word || "").trim().toLowerCase();
  if (!word) {
    return new Response(
      JSON.stringify({ error: "word is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const gradeNum = Number(body.grade) || 3;
  const cefr = getConstraint(gradeNum);

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) {
    console.error(
      "OPENAI_API_KEY is not configured in edge function secrets."
    );
    return await freeDictionaryFallback(word);
  }

  // ── Build the CEFR-calibrated system prompt (legacy format) ──
  const systemPrompt = `You are an expert ESL dictionary designed for Vietnamese public school students.
The student is in Grade ${gradeNum} (CEFR level: ${cefr.level}, vocabulary ceiling: ~${cefr.vocabCeiling} headwords).

LANGUAGE CONSTRAINTS — follow these strictly:
${cefr.prompt}

TASK:
Provide a dictionary entry for the word the user sends.
Each definition MUST include an example sentence.
Include IPA phonetic transcription.

Respond ONLY with a valid JSON object in this exact structure:
{
  "entries": [
    {
      "word": "the word",
      "phonetic": "/IPA phonetic/",
      "meanings": [
        {
          "partOfSpeech": "noun",
          "definitions": [
            {
              "definition": "CEFR-appropriate definition.",
              "example": "CEFR-appropriate example sentence."
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Include up to 2 parts of speech if the word is commonly used in multiple ways.
- Include up to 2 definitions per part of speech.
- Every definition MUST have an example sentence.
- The JSON must be valid. No markdown, no commentary.`;

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + openAiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: word },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI API error:", errText);
    return await freeDictionaryFallback(word);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return await freeDictionaryFallback(word);
  }

  let result;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      result = parsed;
    } else if (parsed?.entries && Array.isArray(parsed.entries)) {
      result = parsed.entries;
    } else {
      const arrayKey = Object.keys(parsed).find((k) =>
        Array.isArray(parsed[k])
      );
      result = arrayKey ? parsed[arrayKey] : [parsed];
    }
  } catch (e) {
    console.error("Failed to parse AI JSON:", e, content);
    return await freeDictionaryFallback(word);
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Fallback: Free Dictionary API (v1 legacy only) ─────────────────────

async function freeDictionaryFallback(word: string): Promise<Response> {
  try {
    const res = await fetch(
      "https://api.dictionaryapi.dev/api/v2/entries/en/" +
        encodeURIComponent(word.trim().toLowerCase())
    );
    if (res.ok) {
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    /* silent */
  }
  return new Response(
    JSON.stringify({ error: "Word not found" }),
    {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
