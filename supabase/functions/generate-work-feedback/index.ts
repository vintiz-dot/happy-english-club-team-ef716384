/**
 * generate-work-feedback Edge Function — personalized AI feedback on work.
 *
 * Given an uploaded piece of student work, sends the ACTUAL IMAGE
 * (gpt-4o-mini vision) together with the OCR text and the student's living
 * learning profile — so feedback is grounded in what's on the page AND in
 * the student's journey (their known struggles get gentle attention, their
 * strengths get recognized). The result lands in student_work.ai_feedback
 * and pre-fills the teacher-notes box, where the teacher can edit it
 * before approving.
 *
 * Input:  { work_id: string, student_id?: string }
 *         (student_id override for unassigned/low-confidence work — the
 *          teacher picks the student in the review UI first)
 * Output: { success, feedback, focus_points, celebrated }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

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

    const { data: work } = await sb
      .from("student_work")
      .select("id, student_id, storage_path, mime_type, ocr_text, workflow")
      .eq("id", workId)
      .single();
    if (!work) return respond({ success: false, error: "work row not found" }, 404);

    const studentId = String(body.student_id ?? "").trim() || work.student_id;
    if (!studentId) {
      return respond({ success: false, error: "Assign a student first so feedback can be personalized" }, 400);
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

    await sb
      .from("student_work")
      .update({ ai_feedback: composed, updated_at: new Date().toISOString() })
      .eq("id", workId);

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
