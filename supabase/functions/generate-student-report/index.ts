/**
 * generate-student-report Edge Function — AI Report Generator & Profiling
 * ========================================================================
 * Aggregates everything the platform knows about a student over a period —
 * transcript metrics + flagged errors, vocabulary bank growth, OCR'd student
 * work, attendance, points/skills — packages it into a profiling prompt and
 * asks the LLM to produce a professional report:
 *
 *   • CEFR level estimate (with confidence + rationale)
 *   • Skill matrix (speaking/listening/reading/writing/grammar/vocabulary)
 *   • Personalized strengths & weaknesses matrix
 *   • Learning-style observations
 *   • Actionable recommendations + a polished narrative for parents
 *
 * The frontend inserts a `student_reports` row (status `generating`) and
 * invokes this function with the row id. On success the report JSON +
 * narrative are stored and a `cefr_assessments` trajectory point is added.
 *
 * Input:  { report_id: string }
 * Output: { success, report_id, report }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CEFR_SCORE: Record<string, number> = {
  "Pre-A1": 0, A1: 1, "A1+": 1.5, A2: 2, "A2+": 2.5,
  B1: 3, "B1+": 3.5, B2: 4, "B2+": 4.5, C1: 5, C2: 6,
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

  let reportId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    reportId = String(body.report_id ?? "").trim() || null;
    if (!reportId) return respond({ success: false, error: "report_id is required" }, 400);

    const { data: report, error: repErr } = await sb
      .from("student_reports")
      .select("id, student_id, class_id, period_start, period_end, generated_by")
      .eq("id", reportId)
      .single();
    if (repErr || !report) return respond({ success: false, error: "report row not found" }, 404);

    const since = report.period_start ?? new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const until = report.period_end ?? new Date().toISOString().slice(0, 10);
    const sid = report.student_id;

    // ── Aggregate every data source ──────────────────────────────────────
    const [
      { data: student },
      { data: metrics },
      { data: errors },
      { data: vocab },
      { data: work },
      { data: points },
      { data: attendance },
      { data: cefrHistory },
      { data: liveProfile },
    ] = await Promise.all([
      sb.from("students").select("id, full_name, date_of_birth, notes").eq("id", sid).single(),
      sb.from("transcript_speaker_metrics")
        .select("word_count, utterance_count, questions_asked, participation_share, vocabulary_richness, errors_count, cefr_estimate, highlights, created_at")
        .eq("student_id", sid)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),
      sb.from("student_error_log")
        .select("error_text, corrected_text, error_type, cefr_topic, source, created_at")
        .eq("student_id", sid)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(60),
      sb.from("student_vocabulary_entries")
        .select("word, cefr, created_at, times_reviewed, times_correct")
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(120),
      sb.from("student_work")
        .select("ocr_text, teacher_notes, workflow, created_at")
        .eq("student_id", sid)
        .eq("status", "approved")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10),
      sb.from("point_transactions")
        .select("type, points, date, notes")
        .eq("student_id", sid)
        .gte("date", since)
        .lte("date", until),
      sb.from("attendance")
        .select("status, session_id, created_at")
        .eq("student_id", sid)
        .gte("created_at", since),
      sb.from("cefr_assessments")
        .select("level, level_score, source, assessed_at")
        .eq("student_id", sid)
        .order("assessed_at", { ascending: true })
        .limit(50),
      sb.from("student_learning_profiles")
        .select("summary, strengths, struggles, cefr_estimate, version")
        .eq("student_id", sid)
        .maybeSingle(),
    ]);

    if (!student) return respond({ success: false, error: "student not found" }, 404);

    // Deterministic aggregates the LLM shouldn't have to compute.
    const pointsByType: Record<string, number> = {};
    for (const p of points ?? []) {
      pointsByType[p.type] = (pointsByType[p.type] || 0) + (p.points || 0);
    }
    const attendanceCounts: Record<string, number> = {};
    for (const a of attendance ?? []) {
      attendanceCounts[a.status] = (attendanceCounts[a.status] || 0) + 1;
    }
    const errorsByType: Record<string, number> = {};
    const errorsByTopic: Record<string, number> = {};
    for (const e of errors ?? []) {
      errorsByType[e.error_type] = (errorsByType[e.error_type] || 0) + 1;
      if (e.cefr_topic) errorsByTopic[e.cefr_topic] = (errorsByTopic[e.cefr_topic] || 0) + 1;
    }

    const sourceCounts = {
      transcript_metrics: metrics?.length ?? 0,
      logged_errors: errors?.length ?? 0,
      vocab_words: vocab?.length ?? 0,
      approved_work_samples: work?.length ?? 0,
      point_transactions: points?.length ?? 0,
      attendance_records: attendance?.length ?? 0,
      prior_cefr_points: cefrHistory?.length ?? 0,
    };

    // ── Package the profiling prompt ─────────────────────────────────────
    const dataPackage = {
      student: {
        name: student.full_name,
        date_of_birth: student.date_of_birth,
      },
      // The continuously-maintained journey summary — the richest signal.
      living_learning_profile: liveProfile ?? null,
      period: { from: since, to: until },
      attendance: attendanceCounts,
      points_by_type: pointsByType,
      speaking_metrics_recent: (metrics ?? []).slice(0, 12),
      error_summary: { by_type: errorsByType, by_topic: errorsByTopic },
      recent_errors: (errors ?? []).slice(0, 25).map((e) => ({
        said: e.error_text, correct: e.corrected_text, type: e.error_type, topic: e.cefr_topic,
      })),
      vocabulary: {
        total_words: vocab?.length ?? 0,
        recent_words: (vocab ?? []).slice(0, 40).map((v) => v.word),
        cefr_distribution: (vocab ?? []).reduce((acc: Record<string, number>, v) => {
          if (v.cefr) acc[v.cefr] = (acc[v.cefr] || 0) + 1;
          return acc;
        }, {}),
      },
      work_samples: (work ?? []).map((w) => ({
        excerpt: (w.ocr_text || "").slice(0, 600),
        teacher_notes: w.teacher_notes,
        date: w.created_at,
      })),
      cefr_history: cefrHistory ?? [],
    };

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a senior ESL assessor at an English club for Vietnamese school students. " +
              "You receive an evidence package (transcript metrics, logged errors, vocabulary bank, " +
              "OCR'd work samples, attendance, participation points) and produce a professional, " +
              "evidence-grounded progress report. Never invent evidence; when data is thin, say so " +
              "and lower confidence.\n\n" +
              'Return JSON: {"cefr": {"level": "Pre-A1"|"A1"|"A1+"|"A2"|"A2+"|"B1"|"B1+"|"B2"|"B2+"|"C1", ' +
              '"confidence": number 0-1, "rationale": string}, ' +
              '"skill_matrix": {"speaking": {"score": 1-5, "note": string}, "listening": {...}, ' +
              '"reading": {...}, "writing": {...}, "grammar": {...}, "vocabulary": {...}}, ' +
              '"strengths": [{"area": string, "evidence": string}] (3-5), ' +
              '"weaknesses": [{"area": string, "evidence": string, "recommendation": string}] (2-4), ' +
              '"learning_styles": [string] (observed patterns, e.g. "responds well to visual prompts"), ' +
              '"recommendations": [string] (3-5 concrete next steps for the teacher), ' +
              '"narrative": string (250-350 word warm, professional report for parents, plain language)}',
          },
          { role: "user", content: JSON.stringify(dataPackage) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    // ── Persist ──────────────────────────────────────────────────────────
    const { error: updErr } = await sb
      .from("student_reports")
      .update({
        status: "ready",
        model: MODEL,
        source_counts: sourceCounts,
        report: result,
        narrative: result.narrative ?? null,
      })
      .eq("id", reportId);
    if (updErr) throw updErr;

    const level = result?.cefr?.level;
    if (level && CEFR_SCORE[level] !== undefined) {
      await sb.from("cefr_assessments").insert({
        student_id: sid,
        class_id: report.class_id,
        source: "ai_report",
        level,
        level_score: CEFR_SCORE[level],
        confidence: typeof result.cefr.confidence === "number" ? result.cefr.confidence : null,
        evidence: result.cefr.rationale ? String(result.cefr.rationale).slice(0, 500) : null,
        created_by: report.generated_by,
        source_id: reportId,
      });
    }

    return respond({ success: true, report_id: reportId, report: result });
  } catch (error) {
    console.error("generate-student-report error:", error);
    if (reportId) {
      await sb
        .from("student_reports")
        .update({
          status: "failed",
          error_message: (error as Error).message?.slice(0, 500),
        })
        .eq("id", reportId);
    }
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
