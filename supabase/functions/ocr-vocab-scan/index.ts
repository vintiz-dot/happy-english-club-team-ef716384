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
 *   5. The proposed words wait, staff-only, in student_work_vocab_drafts and
 *      the page goes to needs_review (review N-8: nothing a model read off
 *      the page reaches the child before a teacher approves it).
 *   6. The teacher approves in Smart Upload ({ work_id, approve: true,
 *      words?: [kept words] }): only then are the words inserted into
 *      student_vocabulary_entries, +10 points awarded per word through the
 *      existing gamification engine (point_transactions type
 *      `vocabulary_quiz`, same shape as save-word), vocab_activity_log rows
 *      written, and grammar slips logged for the SRS deck.
 *
 * SECURITY — this function runs on the SERVICE ROLE and awards points, so it
 * must decide for itself who is allowed to call it. `verify_jwt` only proves
 * the caller is signed in; it says nothing about their role. Without an
 * explicit check, any logged-in user — including a student — could invoke it
 * with an arbitrary `student_id` and mint +10 points per word for anybody.
 * Teachers and admins only, identity from the JWT and never from the body.
 *
 * A student with no login account is NOT an error. `student_id` is the owner
 * of a word; `user_id` is an optional fast path stamped in later if the child
 * gets an account (see claim_vocab_for_student). Words are never discarded
 * for want of an auth account — that bug silently threw away whole pages.
 *
 * Input:  scan    { work_id: string, student_id: string, class_id?: string }
 *                 (student is chosen by the teacher at upload — handwriting
 *                  pages rarely carry a reliable name)
 *         approve { work_id: string, approve: true, words?: string[] }
 *                 (the child is the one the pending set was scanned for)
 * Output: scan    { success, pending_review: true, words: [{..., status:
 *                   "proposed"|"duplicate", images}], points_awarded: 0 }
 *         approve { success, words: [{..., status: "added"|"corrected"|
 *                   "duplicate"|"left_out"|"rejected"}], points_awarded, entry_ids }
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { downloadFile, fileStoreEnvFromDeno } from "../_lib/file-store.ts";
import { visionDocumentOcr, customSearchImages } from "../_lib/google.ts";
import { fireProfileRefresh } from "../_lib/profile.ts";
import { safeParseJson } from "../_lib/text.ts";
import { callerHoldsClass } from "../_lib/auth.ts";
import { requireSpender, STAFF_ROLES, type SpendGate } from "../_lib/ai-gate.ts";

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
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract vocabulary study entries from OCR text of a student's handwritten " +
            "notebook page. The page lists English words, each usually with a meaning (English " +
            "or Vietnamese) and sometimes an example sentence. OCR noise is common.\n\n" +
            "RULES — accuracy over quantity:\n" +
            "1. NEVER invent. Every word, meaning and example must come from the page. If a word " +
            "has no meaning or example written, return empty strings for those — do NOT make one up.\n" +
            "2. Fix only obvious character-level OCR mistakes (rn→m, 0→o, l→i) so the word is a real " +
            "English word. If OCR text is too garbled to be a real word, drop it.\n" +
            "3. Ignore anything that is NOT a vocabulary item: page headers, dates, the student's " +
            "name, unit/lesson titles, numbering ('1.', '2)'), decorations, scores, doodled notes.\n" +
            "4. One entry per distinct word — deduplicate repeats on the page. Use the lowercase " +
            "dictionary headword (singular, base form) as `word`, but keep the meaning/example as " +
            "written.\n" +
            "5. Keep Vietnamese meanings in Vietnamese — do not translate or 'improve' them.\n" +
            "6. Judge the example sentence: is_grammatical=false only for a genuine grammar error, " +
            "and then give the smallest correction that fixes it.\n\n" +
            'Return JSON: {"entries": [{"word": string (lowercase headword), ' +
            '"meaning": string, "example": string (the student\'s sentence, verbatim apart from OCR fixes), ' +
            '"is_grammatical": boolean, ' +
            '"corrected_example": string|null (minimal correction when is_grammatical=false)}]}.\n' +
            "Return an empty list rather than padding with uncertain guesses.",
        },
        { role: "user", content: `OCR text:\n\n${ocrText.slice(0, 8000)}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = safeParseJson(content || "{}");
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
  userId: string | null,
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

// Teachers and admins: one scan per photographed vocabulary page (Vision,
// OpenAI and an image search per word) and one approval of its words. The
// most pages in ten minutes so far: 6. No function calls this one, so the
// service key is refused.
const GATE: SpendGate = { name: "ocr-vocab-scan", roles: STAFF_ROLES, limit: 40, windowMs: 10 * 60_000 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;
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
  let approving = false;
  try {
    // ── Who is calling? Staff only: the gate above, from the JWT. ─────────
    const caller = spender;

    const body = await req.json().catch(() => ({}));
    workId = String(body.work_id ?? "").trim() || null;
    approving = body.approve === true;
    const classId = body.class_id ? String(body.class_id) : null;
    if (!workId) return respond({ success: false, error: "work_id is required" }, 400);

    const { data: work } = await sb
      .from("student_work")
      .select("id, storage_path, uploaded_by, class_id, status, workflow")
      .eq("id", workId)
      .single();
    if (!work) return respond({ success: false, error: "work row not found" }, 404);

    // The child: the teacher's choice at upload; on approval, the one the
    // pending set was read for (never the body's).
    let pending: any = null;
    if (approving) {
      const { data: d, error: dErr } = await sb
        .from("student_work_vocab_drafts").select("*").eq("work_id", workId).maybeSingle();
      if (dErr) return respond({ success: false, error: "The words waiting for review could not be read" }, 500);
      if (!d) return respond({ success: false, error: "No scanned words are waiting for review on this page" }, 409);
      pending = d;
    }
    const studentId = approving ? String(pending.student_id) : String(body.student_id ?? "").trim();
    if (!studentId) return respond({ success: false, error: "work_id and student_id are required" }, 400);

    // Staff of THIS work's class, about a child of that class (audit F-04).
    // The role alone let any teacher or TA award +10 points a word to any
    // student_id, in any class_id, from any work row. The class is the work
    // row's, not the body's; a body naming another class is refused. A row
    // with no class is an admin's. The child must have an enrollment in that
    // class (any date: a page scanned after a child left still counts).
    if (classId && work.class_id && classId !== work.class_id) {
      return respond({ success: false, error: "class_id does not match the work's class" }, 400);
    }
    if (!(await callerHoldsClass(sb, caller, work.class_id))) {
      return respond({ success: false, error: "Not a class you teach" }, 403);
    }
    if (work.class_id && !caller.isServiceRole && !caller.roles.has("admin")) {
      const { data: enr, error: enrErr } = await sb
        .from("enrollments").select("id").eq("student_id", studentId).eq("class_id", work.class_id).limit(1);
      if (enrErr || !enr || enr.length === 0) {
        return respond({ success: false, error: "That child is not in this class" }, 403);
      }
    }

    const { data: student } = await sb
      .from("students")
      .select("id, full_name, linked_user_id")
      .eq("id", studentId)
      .single();
    if (!student) return respond({ success: false, error: "student not found" }, 404);
    const linkedUserId = (student.linked_user_id as string | null) ?? null;
    const workClass = (work.class_id as string | null) ?? classId;

    if (approving) {
      const out = await approveScan(sb, caller, work, pending, student, linkedUserId, workClass, body.words);
      return respond(out.body, out.status);
    }

    // ── 1. OCR ───────────────────────────────────────────────────────────
    const file = await downloadFile(sb, fileStoreEnvFromDeno(), "student-work", work.storage_path);
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
    const existing = await wordsInBank(sb, student.id, linkedUserId, entries.map((e) => e.word));

    // ── 4. Images for the new words; the set waits for a teacher ─────────
    // Review N-8: nothing the model read off the page reaches the child -
    // no word, point, error-log entry or practice card - until a teacher
    // approves the words in Smart Upload (approve: true, below).
    const proposed: any[] = [];
    for (const entry of entries) {
      if (existing.has(entry.word)) {
        proposed.push({ ...entry, status: "duplicate", images: [] });
        continue;
      }
      const images = await customSearchImages(entry.word, IMAGES_PER_WORD).catch(() => []);
      proposed.push({ ...entry, status: "new", images });
    }

    const { error: draftErr } = await sb.from("student_work_vocab_drafts").upsert(
      {
        work_id: workId,
        student_id: student.id,
        class_id: workClass,
        entries: proposed,
        ocr_text: ocrText,
        generated_by: caller.userId || null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "work_id" },
    );
    if (draftErr) throw new Error(`the scanned words could not be saved for review: ${draftErr.message}`);

    await sb
      .from("student_work")
      .update({
        student_id: student.id,
        class_id: workClass,
        ocr_text: ocrText,
        ocr_confidence: confidence,
        // Waits for the teacher, like any other scanned page.
        status: "needs_review",
        approved_by: null,
        approved_at: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);

    return respond({
      success: true,
      pending_review: true,
      words: proposed.map((p) => ({ ...p, status: p.status === "duplicate" ? "duplicate" : "proposed" })),
      points_awarded: 0,
      entry_ids: [],
      ocr_preview: ocrText.slice(0, 300),
    });
  } catch (error) {
    console.error("ocr-vocab-scan error:", error);
    // A failed scan leaves the page retryable; a failed approval leaves it
    // as it was (the teacher can approve again).
    if (workId && !approving) {
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

/** Which of these words the child already has. */
async function wordsInBank(sb: SupabaseClient, studentId: string, linkedUserId: string | null, words: string[]): Promise<Set<string>> {
  if (!words.length) return new Set();
  // Match on the STUDENT first — that is the durable owner. Also match on
  // the linked account, because words the child saved themselves in the app
  // carry their account id and may predate any student_id stamping.
  const filters = [`student_id.eq.${studentId}`];
  if (linkedUserId) filters.push(`user_id.eq.${linkedUserId}`);
  const { data: rows, error: dupErr } = await sb
    .from("student_vocabulary_entries")
    .select("word")
    .or(filters.join(","))
    .in("word", words);
  if (dupErr) console.warn("duplicate check failed (treating all as new):", dupErr.message);
  return new Set((rows || []).map((r: any) => String(r.word).toLowerCase()));
}

/**
 * A teacher approves the scanned words (all of them, or the ones named in
 * `words`). Taking the pending set - a DELETE that returns it - is the
 * claim: a second approval finds nothing and commits nothing. Then exactly
 * what the scan used to do on its own: the word bank, +10 points a word,
 * the activity log, and the grammar slips into the error log and SRS deck.
 */
async function approveScan(
  sb: SupabaseClient,
  caller: { userId: string },
  work: any,
  pending: any,
  student: any,
  linkedUserId: string | null,
  classId: string | null,
  wordsKept: unknown,
) {
  const { data: taken, error: takeErr } = await sb
    .from("student_work_vocab_drafts").delete().eq("work_id", work.id).select("entries");
  if (takeErr) throw new Error(`the words could not be taken for approval: ${takeErr.message}`);
  if (!taken || taken.length === 0) {
    return { status: 409, body: { success: false, error: "These words have already been approved" } };
  }
  const entries: any[] = Array.isArray(taken[0].entries) ? taken[0].entries : (Array.isArray(pending.entries) ? pending.entries : []);
  const keep = Array.isArray(wordsKept) ? new Set(wordsKept.map((w) => String(w).toLowerCase())) : null;
  const chosen = entries.filter((e) => e.status === "new" && (!keep || keep.has(String(e.word).toLowerCase())));
  // Words added to the bank since the scan are not added twice.
  const existing = await wordsInBank(sb, student.id, linkedUserId, chosen.map((e) => String(e.word)));

  const awardedBy = caller.userId || (work.uploaded_by as string | null) || null;
  const results: any[] = [];
  const entryIds: string[] = [];
  let pointsAwarded = 0;

  for (const entry of entries) {
    if (!chosen.includes(entry)) {
      results.push({ ...entry, status: entry.status === "duplicate" ? "duplicate" : "left_out" });
      continue;
    }
    if (existing.has(String(entry.word))) {
      results.push({ ...entry, status: "duplicate" });
      continue;
    }
    const images = Array.isArray(entry.images) ? entry.images : [];
    const exampleToStore = entry.is_grammatical ? entry.example : entry.corrected_example || entry.example;

    const { data: inserted, error: insErr } = await sb
      .from("student_vocabulary_entries")
      .insert({
        // NULL when the child has no login yet — deliberate. student_id is
        // the owner; claim_vocab_for_student() stamps this in on linking.
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
          work_id: work.id,
          meaning: entry.meaning,
          original_example: entry.example,
          grammar_ok: entry.is_grammatical,
          corrected_example: entry.corrected_example,
          images,
          // The database refuses an ocr_scan word without this
          // (20261117160300): a teacher approved it.
          approved_by: caller.userId,
          approved_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    if (insErr) {
      results.push({ ...entry, status: "rejected", reason: insErr.message });
      continue;
    }
    entryIds.push(inserted.id);

    await awardVocabPoints(sb, student.id, classId, awardedBy, entry.word);
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
          source_id: work.id,
          error_text: entry.example,
          corrected_text: entry.corrected_example,
          error_type: "grammar",
          created_by: caller.userId || work.uploaded_by,
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

    results.push({ ...entry, status: entry.is_grammatical ? "added" : "corrected", entry_id: inserted.id });
  }

  // ── Close out the upload row: the teacher approved it ─────────────────
  await sb
    .from("student_work")
    .update({
      status: "approved",
      approved_by: caller.userId,
      approved_at: new Date().toISOString(),
      teacher_notes: `Vocab scan: ${entryIds.length} new word(s), ${results.filter((r) => r.status === "duplicate").length} duplicate(s).`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", work.id);

  // New vocabulary is journey evidence — refresh the living profile.
  if (entryIds.length > 0) fireProfileRefresh([student.id]);

  return { status: 200, body: { success: true, words: results, points_awarded: pointsAwarded, entry_ids: entryIds } };
}
