/**
 * generate-work-feedback Edge Function — personalized AI feedback on work.
 *
 * Given an uploaded piece of student work, sends the ACTUAL IMAGE
 * (gpt-4o-mini vision) together with the OCR text and the student's living
 * learning profile — so feedback is grounded in what's on the page AND in
 * the student's journey (their known struggles get gentle attention, their
 * strengths get recognized). The result is a STAFF-ONLY DRAFT in
 * student_work_ai_drafts (N-6, migration 20261117160000) and pre-fills the
 * teacher-notes box, where the teacher can edit it before approving. The
 * child reads only teacher_notes - what the teacher approved - never this.
 *
 * Only for work still waiting on the teacher (needs_review): approved or
 * rejected work keeps what the teacher decided, and the database refuses a
 * draft for it too.
 *
 * Input:  { work_id: string, student_id?: string }
 *         (student_id override for unassigned/low-confidence work — the
 *          teacher picks the student in the review UI first)
 * Output: { success, feedback, focus_points, celebrated }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { callerHoldsClass, callerHoldsStudent } from "../_lib/auth.ts";
import { requireSpender, STAFF_ROLES, type SpendGate } from "../_lib/ai-gate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

// One click per scanned page in the smart-upload review queue; the busiest
// teacher so far uploaded 25 pages in ten minutes.
const GATE: SpendGate = { name: "generate-work-feedback", roles: STAFF_ROLES, limit: 40, windowMs: 10 * 60_000 };

function toBase64(buf: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

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

  try {
    const body = await req.json().catch(() => ({}));
    const workId = String(body.work_id ?? "").trim();
    if (!workId) return respond({ success: false, error: "work_id is required" }, 400);

    // class_id and uploaded_by added to the select so the caller can be
    // scoped against the same two clauses student_work's RLS uses.
    const { data: work } = await sb
      .from("student_work")
      .select("id, student_id, class_id, uploaded_by, storage_path, mime_type, ocr_text, workflow, status")
      .eq("id", workId)
      .single();
    if (!work) return respond({ success: false, error: "work row not found" }, 404);

    // Staff only, and only for work that is theirs. This downloaded any
    // child's scanned work from storage, sent it to OpenAI and overwrote
    // the stored feedback, all from a work_id in the body with no check on
    // who asked.
    //
    // BOTH clauses, because student_work's RLS has both:
    //   uploaded_by = auth.uid() OR (class_id IS NOT NULL AND is_teacher_of_class(...))
    // class_id is nullable - it is ON DELETE SET NULL, and the smart-upload
    // review queue holds work that has not been assigned to a class yet -
    // so checking the class alone would lock a teacher out of feedback on
    // a scan they uploaded themselves. The aim is to match the policy, not
    // to be stricter than it. The role and the per-account limit are the
    // gate's, above.
    const ownUpload = !!spender.userId && work.uploaded_by === spender.userId;
    if (!ownUpload && !(await callerHoldsClass(sb, spender, work.class_id))) {
      return respond({ success: false, error: "This work belongs to a class you do not hold." }, 403);
    }

    // N-6: a teacher's decision stands. Approved or rejected work is not
    // re-drafted (and student_work_ai_drafts refuses it as well).
    if (work.status !== "needs_review") {
      return respond({ success: false, error: "This work has already been reviewed; its feedback is the teacher's." }, 409);
    }

    const studentId = String(body.student_id ?? "").trim() || work.student_id;
    if (!studentId) {
      return respond({ success: false, error: "Assign a student first so feedback can be personalized" }, 400);
    }
    // The override names whose learning profile goes into the prompt (and
    // so into the draft): only a child the caller may see.
    if (studentId !== work.student_id && !(await callerHoldsStudent(sb, spender, studentId))) {
      return respond({ success: false, error: "You do not teach this student." }, 403);
    }

    const [{ data: student }, { data: profile }] = await Promise.all([
      sb.from("students").select("full_name").eq("id", studentId).single(),
      sb.from("student_learning_profiles").select("summary, strengths, struggles, cefr_estimate").eq("student_id", studentId).maybeSingle(),
    ]);
    if (!student) return respond({ success: false, error: "student not found" }, 404);
    const firstName = student.full_name.split(" ").slice(-1)[0] || student.full_name;

    // The actual image, so the model sees handwriting, drawings, layout —
    // things OCR flattens away.
    let imageContent: any = null;
    const { data: file } = await sb.storage.from("student-work").download(work.storage_path);
    if (file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length <= 6 * 1024 * 1024) {
        imageContent = {
          type: "image_url",
          image_url: {
            url: `data:${work.mime_type || "image/jpeg"};base64,${toBase64(bytes)}`,
            detail: "low",
          },
        };
      }
    }

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const userContent: any[] = [
      {
        type: "text",
        text: JSON.stringify({
          student_first_name: firstName,
          learning_profile: profile
            ? { summary: profile.summary, strengths: profile.strengths, struggles: profile.struggles, cefr: profile.cefr_estimate }
            : "No profile yet — this may be one of their first collected works.",
          ocr_text: (work.ocr_text || "").slice(0, 3000),
          work_type: work.workflow,
        }),
      },
    ];
    if (imageContent) userContent.push(imageContent);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a warm, encouraging English teacher at a Vietnamese English club, writing " +
              "feedback ON a student's piece of physical work (photo + OCR text provided). You also " +
              "receive the student's learning profile — use it: celebrate progress on known struggles, " +
              "connect this work to their journey. Ground every remark in what is actually on the page. " +
              "Address the student by first name, in language matched to their CEFR level (short " +
              "sentences for A1-A2). 2-4 sentences of feedback + concrete focus points.\n\n" +
              'Return JSON: {"feedback": string (the note the student will read — warm, specific, ' +
              'level-appropriate), "focus_points": [string] (1-2 concrete things to practice next), ' +
              '"celebrated": string|null (a known struggle this work shows progress on, if any)}',
          },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    const feedback = String(result.feedback || "").trim();
    if (!feedback) throw new Error("model returned empty feedback");

    const focus: string[] = Array.isArray(result.focus_points) ? result.focus_points : [];
    const composed =
      feedback + (focus.length ? `\n\nNext: ${focus.join(" · ")}` : "");

    // Staff-only draft. The table's trigger refuses it if the work was
    // approved or rejected while the model was writing.
    const { error: draftErr } = await sb
      .from("student_work_ai_drafts")
      .upsert(
        { work_id: workId, feedback: composed, generated_by: spender.userId, generated_at: new Date().toISOString() },
        { onConflict: "work_id" },
      );
    if (draftErr) {
      return respond({ success: false, error: "The draft could not be saved: this work may have been reviewed meanwhile." }, 409);
    }

    return respond({
      success: true,
      feedback: composed,
      focus_points: focus,
      celebrated: result.celebrated ?? null,
    });
  } catch (error) {
    console.error("generate-work-feedback error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
