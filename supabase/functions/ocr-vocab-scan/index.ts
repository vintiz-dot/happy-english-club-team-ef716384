/**
 * ocr-vocab-scan Edge Function — Workflow 2 (Vocab Work & Contextual Search)
 * ==========================================================================
 * Teacher photographs a page of handwritten vocabulary. Pipeline:
 *
 *   1. Google Cloud Vision DOCUMENT_TEXT_DETECTION extracts the raw text.
 *   2. OpenAI structures it into [word, meaning, example sentence] triples
 *      and validates grammatical correctness of each example.
 *   3. Duplicate check against the student's personal word bank.
 *   4. Google Custom Search (CUSTOMIMAGE credentials) fetches 2-3
 *      kid-safe, context-appropriate images per new word.
 *   5. New words are inserted into student_vocabulary_entries, +10 points
 *      are awarded per word through the existing gamification engine
 *      (point_transactions type `vocabulary_quiz`, same shape as save-word),
 *      and vocab_activity_log rows feed the teacher dashboard.
 *
 * Input:  { work_id: string, student_id: string, class_id?: string }
 *         (student is chosen by the teacher at upload — handwriting pages
 *          rarely carry a reliable name)
 * Output: { success, words: [{word, meaning, example, status:
 *           "added"|"duplicate"|"corrected"|"rejected", images, correction?}],
 *           points_awarded, entry_ids }
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { visionDocumentOcr, customSearchImages } from "../_lib/google.ts";
import { fireProfileRefresh } from "../_lib/profile.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const POINTS_PER_WORD = 10;
const MAX_WORDS_PER_SCAN = 20;
const IMAGES_PER_WORD = 3;

interface ParsedEntry {
  word: string;
  meaning: string;
  example: string;
  is_grammatical: boolean;
  corrected_example: string | null;
}

async function structureWithLLM(ocrText: string): Promise<ParsedEntry[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract vocabulary study entries from OCR text of a student's handwritten " +
            "notebook page. The page lists English words with meanings (English or Vietnamese) " +
            "and example sentences. OCR noise is common — fix obvious character-level OCR errors " +
            "but NEVER invent entries that are not on the page.\n\n" +
            'Return JSON: {"entries": [{"word": string (lowercase headword), ' +
            '"meaning": string, "example": string (the student\'s sentence, verbatim apart from OCR fixes), ' +
            '"is_grammatical": boolean (is the example sentence grammatically acceptable?), ' +
            '"corrected_example": string|null (minimal correction when is_grammatical=false)}]}.\n' +
            "If a word has no meaning or example on the page, still include it with empty strings.",
        },
        { role: "user", content: `OCR text:\n\n${ocrText.slice(0, 8000)}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content || "{}");
  const entries: any[] = Array.isArray(parsed.entries) ? parsed.entries : [];
  return entries
    .map((e) => ({
      word: String(e.word || "").toLowerCase().trim(),
      meaning: String(e.meaning || "").trim(),
      example: String(e.example || "").trim(),
      is_grammatical: e.is_grammatical !== false,
      corrected_example: e.corrected_example ? String(e.corrected_example).trim() : null,
    }))
    .filter((e) => /^[a-z][a-z' -]{1,40}$/.test(e.word))
    .slice(0, MAX_WORDS_PER_SCAN);
}

async function awardVocabPoints(
  sb: SupabaseClient,
  studentId: string,
  classId: string | null,
  userId: string,
  word: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("point_transactions").insert({
    student_id: studentId,
    class_id: classId,
    points: POINTS_PER_WORD,
    type: "vocabulary_quiz",
    date: today,
    created_by: userId,
    notes: `vocab save: ${word}`,
  });
  if (error) console.warn(`points insert failed for ${word}:`, error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let workId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    workId = String(body.work_id ?? "").trim() || null;
    const studentId = String(body.student_id ?? "").trim();
    const classId = body.class_id ? String(body.class_id) : null;
    if (!workId || !studentId) {
      return respond({ success: false, error: "work_id and student_id are required" }, 400);
    }

    const { data: work } = await sb
      .from("student_work")
      .select("id, storage_path, uploaded_by")
      .eq("id", workId)
      .single();
    if (!work) return respond({ success: false, error: "work row not found" }, 404);

    const { data: student } = await sb
      .from("students")
      .select("id, full_name, linked_user_id")
      .eq("id", studentId)
      .single();
    if (!student) return respond({ success: false, error: "student not found" }, 404);

    // ── 1. OCR ───────────────────────────────────────────────────────────
    const { data: file, error: dlErr } = await sb.storage
      .from("student-work")
      .download(work.storage_path);
    if (dlErr || !file) throw new Error(`storage download failed: ${dlErr?.message}`);
    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }
    const { text: ocrText, confidence } = await visionDocumentOcr(btoa(binary));
    if (!ocrText.trim()) throw new Error("Vision returned no text for this image");

    // ── 2. Structure + grammar-validate via LLM ──────────────────────────
    const entries = await structureWithLLM(ocrText);

    // ── 3. Duplicate check against the personal word bank ────────────────
    const linkedUserId = student.linked_user_id as string | null;
    let existing = new Set<string>();
    if (linkedUserId && entries.length) {
      const { data: rows } = await sb
        .from("student_vocabulary_entries")
        .select("word")
        .eq("user_id", linkedUserId)
        .in("word", entries.map((e) => e.word));
      existing = new Set((rows || []).map((r: any) => String(r.word).toLowerCase()));
    }

    // ── 4 + 5. Images, insert, points ────────────────────────────────────
    const results: any[] = [];
    const entryIds: string[] = [];
    let pointsAwarded = 0;

    for (const entry of entries) {
      if (existing.has(entry.word)) {
        results.push({ ...entry, status: "duplicate", images: [] });
        continue;
      }
      if (!linkedUserId) {
        results.push({ ...entry, status: "rejected", reason: "student_not_linked", images: [] });
        continue;
      }

      const images = await customSearchImages(entry.word, IMAGES_PER_WORD).catch(() => []);
      const exampleToStore = entry.is_grammatical
        ? entry.example
        : entry.corrected_example || entry.example;

      const { data: inserted, error: insErr } = await sb
        .from("student_vocabulary_entries")
        .insert({
          user_id: linkedUserId,
          student_id: student.id,
          class_id: classId,
          word: entry.word,
          root_word: entry.word,
          definition_en: entry.meaning || null,
          user_examples: exampleToStore ? [exampleToStore] : [],
          image_url: images[0]?.url ?? null,
          enrichment: {
            source: "ocr_scan",
            work_id: workId,
            meaning: entry.meaning,
            original_example: entry.example,
            grammar_ok: entry.is_grammatical,
            corrected_example: entry.corrected_example,
            images,
          },
        })
        .select("id")
        .single();

      if (insErr) {
        results.push({ ...entry, status: "rejected", reason: insErr.message, images });
        continue;
      }
      entryIds.push(inserted.id);

      await awardVocabPoints(sb, student.id, classId, work.uploaded_by, entry.word);
      pointsAwarded += POINTS_PER_WORD;

      await sb.from("vocab_activity_log").insert({
        user_id: linkedUserId,
        student_id: student.id,
        class_id: classId,
        word: entry.word,
        activity_type: "save",
        points_awarded: POINTS_PER_WORD,
      });

      // Grammar slips found on the page feed the error log → SRS deck.
      if (!entry.is_grammatical && entry.corrected_example) {
        const { data: errRow } = await sb
          .from("student_error_log")
          .insert({
            student_id: student.id,
            class_id: classId,
            source: "student_work",
            source_id: workId,
            error_text: entry.example,
            corrected_text: entry.corrected_example,
            error_type: "grammar",
            created_by: work.uploaded_by,
          })
          .select("id")
          .single();
        if (errRow) {
          await sb.from("srs_cards").insert({
            student_id: student.id,
            source: "error",
            error_log_id: errRow.id,
            front: `Fix this sentence:\n“${entry.example}”`,
            back: entry.corrected_example,
            hint: `Uses the word “${entry.word}”`,
          });
        }
      }

      results.push({
        ...entry,
        status: entry.is_grammatical ? "added" : "corrected",
        images,
        entry_id: inserted.id,
      });
    }

    // ── Close out the upload row ─────────────────────────────────────────
    await sb
      .from("student_work")
      .update({
        student_id: student.id,
        class_id: classId,
        ocr_text: ocrText,
        ocr_confidence: confidence,
        status: "approved", // vocab scans complete immediately; nothing to gate
        approved_by: work.uploaded_by,
        approved_at: new Date().toISOString(),
        teacher_notes: `Vocab scan: ${entryIds.length} new word(s), ${results.filter((r) => r.status === "duplicate").length} duplicate(s).`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);

    // New vocabulary is journey evidence — refresh the living profile.
    if (entryIds.length > 0) fireProfileRefresh([student.id]);

    return respond({
      success: true,
      words: results,
      points_awarded: pointsAwarded,
      entry_ids: entryIds,
      ocr_preview: ocrText.slice(0, 300),
    });
  } catch (error) {
    console.error("ocr-vocab-scan error:", error);
    if (workId) {
      await sb
        .from("student_work")
        .update({
          status: "failed",
          error_message: (error as Error).message?.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", workId);
    }
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
