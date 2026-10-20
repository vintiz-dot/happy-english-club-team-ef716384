/**
 * refresh-student-profile Edge Function — the living learning profile.
 *
 * Re-synthesizes a student's language-journey summary whenever new evidence
 * lands. Reads the previous profile plus everything that arrived since the
 * last refresh (approved work + AI feedback, vocabulary saves, transcript
 * metrics/errors, CEFR points) and asks the LLM to merge it into a compact,
 * bounded profile: narrative, strengths, struggles, CEFR estimate.
 *
 * Called fire-and-forget by:
 *   • the Smart Upload review flow after a work is approved
 *   • ocr-vocab-scan after new words land
 *   • analyze-transcript for each matched student
 * …and on demand from the UI. Cheap by design: one gpt-4o-mini call with a
 * capped evidence window; the profile itself stays ≤ ~450 words so it can
 * ride along in every downstream prompt.
 *
 * Input:  { student_id: string }
 * Output: { success, student_id, version, summary }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

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
    const studentId = String(body.student_id ?? "").trim();
    if (!studentId) return respond({ success: false, error: "student_id is required" }, 400);

    const { data: student } = await sb
      .from("students")
      .select("id, full_name, date_of_birth")
      .eq("id", studentId)
      .single();
    if (!student) return respond({ success: false, error: "student not found" }, 404);

    const { data: profile } = await sb
      .from("student_learning_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    // Evidence window: everything since the last refresh (or last 60 days
    // on first build), capped per source so the prompt stays small.
    const since =
      profile?.last_event_at ??
      new Date(Date.now() - 60 * 86400_000).toISOString();

    const [worksRes, vocabRes, metricsRes, errorsRes, cefrRes, countsWork, countsVocab, countsTr] =
      await Promise.all([
        sb.from("student_work")
          .select("ocr_text, ai_feedback, teacher_notes, workflow, created_at")
          .eq("student_id", studentId).eq("status", "approved")
          .gt("created_at", since).order("created_at", { ascending: false }).limit(6),
        sb.from("student_vocabulary_entries")
          .select("word, cefr, created_at")
          .eq("student_id", studentId)
          .gt("created_at", since).order("created_at", { ascending: false }).limit(40),
        sb.from("transcript_speaker_metrics")
          .select("word_count, utterance_count, questions_asked, participation_share, cefr_estimate, highlights, contribution, teacher_feedback, created_at")
          .eq("student_id", studentId)
          .gt("created_at", since).order("created_at", { ascending: false }).limit(8),
        sb.from("student_error_log")
          .select("error_text, corrected_text, error_type, cefr_topic, created_at")
          .eq("student_id", studentId)
          .gt("created_at", since).order("created_at", { ascending: false }).limit(25),
        sb.from("cefr_assessments")
          .select("level, source, assessed_at")
          .eq("student_id", studentId)
          .order("assessed_at", { ascending: false }).limit(6),
        sb.from("student_work").select("id", { count: "exact", head: true })
          .eq("student_id", studentId).eq("status", "approved"),
        sb.from("student_vocabulary_entries").select("id", { count: "exact", head: true })
          .eq("student_id", studentId),
        sb.from("transcript_speaker_metrics").select("id", { count: "exact", head: true })
          .eq("student_id", studentId),
      ]);

    const newEvidence = {
      approved_work: (worksRes.data ?? []).map((w) => ({
        type: w.workflow,
        excerpt: (w.ocr_text || "").slice(0, 500),
        feedback_given: w.ai_feedback || w.teacher_notes || null,
      })),
      new_vocabulary: (vocabRes.data ?? []).map((v) => v.word),
      lesson_participation: metricsRes.data ?? [],
      flagged_errors: (errorsRes.data ?? []).map((e) => ({
        said: e.error_text, correct: e.corrected_text, type: e.error_type, topic: e.cefr_topic,
      })),
      cefr_history: cefrRes.data ?? [],
    };

    const hasNewEvidence =
      newEvidence.approved_work.length ||
      newEvidence.new_vocabulary.length ||
      newEvidence.lesson_participation.length ||
      newEvidence.flagged_errors.length;

    if (!hasNewEvidence && profile?.summary) {
      return respond({
        success: true,
        student_id: studentId,
        version: profile.version,
        summary: profile.summary,
        unchanged: true,
      });
    }

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You maintain a LIVING LEARNING PROFILE for a young English learner at a Vietnamese " +
              "English club. You receive the previous profile (may be empty) and new evidence since " +
              "the last update. Merge them: keep what is still true, update what changed, drop what " +
              "was resolved, and never lose durable facts (persistent struggles, long-term growth). " +
              "Be specific and evidence-grounded; never invent.\n\n" +
              'Return JSON: {"summary": string (<=400 words: the student\'s language journey — ' +
              "trajectory, current level, how they learn best, notable moments), " +
              '"strengths": [{"area": string, "evidence": string}] (3-5), ' +
              '"struggles": [{"area": string, "evidence": string, "focus": string (what to practice)}] (2-4), ' +
              '"cefr_estimate": "Pre-A1"|"A1"|"A1+"|"A2"|"A2+"|"B1"|"B1+"|"B2"|null}',
          },
          {
            role: "user",
            content: JSON.stringify({
              student: { name: student.full_name, date_of_birth: student.date_of_birth },
              previous_profile: profile
                ? { summary: profile.summary, strengths: profile.strengths, struggles: profile.struggles, cefr: profile.cefr_estimate }
                : null,
              new_evidence: newEvidence,
            }),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    const now = new Date().toISOString();
    const { error: upErr } = await sb.from("student_learning_profiles").upsert(
      {
        student_id: studentId,
        summary: String(result.summary || "").slice(0, 4000),
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        struggles: Array.isArray(result.struggles) ? result.struggles : [],
        cefr_estimate: result.cefr_estimate || profile?.cefr_estimate || null,
        works_analyzed: countsWork.count ?? 0,
        vocab_words: countsVocab.count ?? 0,
        transcripts_analyzed: countsTr.count ?? 0,
        version: (profile?.version ?? 0) + 1,
        last_event_at: now,
        updated_at: now,
      },
      { onConflict: "student_id" },
    );
    if (upErr) throw upErr;

    return respond({
      success: true,
      student_id: studentId,
      version: (profile?.version ?? 0) + 1,
      summary: result.summary,
    });
  } catch (error) {
    console.error("refresh-student-profile error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
