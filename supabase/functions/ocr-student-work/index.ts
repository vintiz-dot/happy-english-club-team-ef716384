/**
 * ocr-student-work Edge Function — Workflow 1 (General Student Work Routing)
 * ==========================================================================
 * Teacher photographs physical student work (e.g. "Sun Class - Anna") and the
 * frontend: (1) uploads the image to the private `student-work` bucket under
 * `incoming/…`, (2) inserts a `student_work` row (status `processing`), then
 * (3) invokes this function with the row id.
 *
 * This function (service role):
 *   1. Downloads the image and runs Google Cloud Vision DOCUMENT_TEXT_DETECTION.
 *   2. Fuzzy-matches the extracted text against the class roster (or all
 *      active students when no class was chosen) to identify the student.
 *   3. Routes the file to `students/<student_id>/general/<file>` when matched.
 *   4. Updates the row → status `needs_review` (teacher approves in the UI;
 *      only `approved` rows are visible to the student, with teacher notes).
 *
 * Input:  { work_id: string }
 * Output: { success, work_id, student_id?, detected_student_name?,
 *           match_confidence?, ocr_preview?, status }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { visionDocumentOcr } from "../_lib/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip Vietnamese diacritics for matching
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how strongly a student name appears in the OCR text.
 * Full-name hit = 1.0; otherwise the fraction of name tokens present,
 * weighted toward matches near the top of the page (names are usually
 * written in the header/margin).
 */
function scoreNameMatch(ocrText: string, fullName: string): number {
  const text = normalizeName(ocrText);
  if (!text) return 0;
  const name = normalizeName(fullName);
  if (!name) return 0;

  if (text.includes(name)) return 1;

  const tokens = name.split(" ").filter((t) => t.length >= 2);
  if (!tokens.length) return 0;
  const textTokens = new Set(text.split(" "));
  const headTokens = new Set(text.split(" ").slice(0, 30)); // ~first lines

  let hits = 0;
  let headHits = 0;
  for (const t of tokens) {
    if (textTokens.has(t)) hits++;
    if (headTokens.has(t)) headHits++;
  }
  const base = hits / tokens.length;
  const headBonus = headHits > 0 ? 0.15 : 0;
  return Math.min(base * 0.85 + headBonus, 0.99);
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
    if (!workId) return respond({ success: false, error: "work_id is required" }, 400);

    const { data: work, error: workErr } = await sb
      .from("student_work")
      .select("id, storage_path, class_id, student_id, workflow, original_filename")
      .eq("id", workId)
      .single();
    if (workErr || !work) return respond({ success: false, error: "work row not found" }, 404);

    // ── 1. Download + OCR ────────────────────────────────────────────────
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

    // ── 2. Roster match ──────────────────────────────────────────────────
    let roster: Array<{ id: string; full_name: string }> = [];
    if (work.class_id) {
      const { data } = await sb
        .from("enrollments")
        .select("student_id, students(id, full_name)")
        .eq("class_id", work.class_id)
        .eq("status", "active");
      roster = (data || [])
        .map((r: any) => r.students)
        .filter((s: any) => s?.id && s?.full_name);
    }
    if (!roster.length) {
      const { data } = await sb
        .from("students")
        .select("id, full_name")
        .eq("is_active", true);
      roster = data || [];
    }

    let best: { id: string; name: string; score: number } | null = null;
    for (const s of roster) {
      const score = scoreNameMatch(ocrText, s.full_name);
      if (!best || score > best.score) best = { id: s.id, name: s.full_name, score };
    }

    // Pre-selected student (teacher chose one at upload) always wins.
    const matched = work.student_id
      ? { id: work.student_id, name: null as string | null, score: 1 }
      : best && best.score >= 0.6
        ? best
        : null;

    // ── 3. Route the file into the student's directory ───────────────────
    let finalPath = work.storage_path;
    if (matched && work.storage_path.startsWith("incoming/")) {
      const fileName = work.storage_path.split("/").pop()!;
      const target = `students/${matched.id}/${work.workflow}/${fileName}`;
      const { error: moveErr } = await sb.storage
        .from("student-work")
        .move(work.storage_path, target);
      if (!moveErr) finalPath = target;
      else console.warn("ocr-student-work: move failed, keeping incoming path:", moveErr.message);
    }

    // ── 4. Persist results, hand off to teacher review ───────────────────
    const { error: updErr } = await sb
      .from("student_work")
      .update({
        student_id: matched?.id ?? null,
        detected_student_name: best?.name ?? null,
        match_confidence: matched ? matched.score : best?.score ?? 0,
        ocr_text: ocrText,
        ocr_confidence: confidence,
        storage_path: finalPath,
        status: "needs_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", workId);
    if (updErr) throw updErr;

    return respond({
      success: true,
      work_id: workId,
      student_id: matched?.id ?? null,
      detected_student_name: best?.name ?? null,
      match_confidence: matched ? matched.score : best?.score ?? 0,
      ocr_preview: ocrText.slice(0, 400),
      status: "needs_review",
    });
  } catch (error) {
    console.error("ocr-student-work error:", error);
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
