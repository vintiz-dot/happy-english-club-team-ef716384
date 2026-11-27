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
 *   • The family page (report.parent, English with Vietnamese) and the
 *     period's figures (report.facts, counted here, never by the model):
 *     see _lib/student-report.ts and docs/AI_PROGRESS_REPORT.md
 *
 * The frontend inserts a `student_reports` row (status `generating`) and
 * invokes this function with the row id. On success the report JSON +
 * narrative are stored, unpublished, and the model's CEFR estimate is saved
 * as a staff-only DRAFT (`cefr_assessment_drafts`). Nothing reaches the child
 * or the family until a teacher acts: the report when they publish it
 * (`student_reports.published`), the CEFR point when they approve it
 * (`approve_cefr_draft`, migration 20261117151000). A published report is
 * never regenerated in place (409).
 *
 * Input:  { report_id: string }
 * Output: { success, report_id, report, cefr_draft_id }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { callerHoldsClass } from "../_lib/auth.ts";
import { requireSpender, STAFF_ROLES, type SpendGate } from "../_lib/ai-gate.ts";
import { askClaudeJson } from "../_lib/claude-json.ts";
import {
  approvedLessonNotes, cleanReport, periodFacts, REPORT_JSON_SCHEMA, REPORT_SYSTEM,
} from "../_lib/student-report.ts";

// Staff only. BulkReportExport generates a whole class one report after
// another; the biggest class had 10 active children on 17 Nov 2026 (read
// live), so 60 per account per 10 minutes is six such classes back to back.
// Nothing calls this with the service-role key, so that key is refused.
const GATE: SpendGate = { name: "generate-student-report", roles: STAFF_ROLES, limit: 60, windowMs: 10 * 60_000 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CEFR_SCORE: Record<string, number> = {
  "Pre-A1": 0, A1: 1, "A1+": 1.5, A2: 2, "A2+": 2.5,
  B1: 3, "B1+": 3.5, B2: 4, "B2+": 4.5, C1: 5, C2: 6,
};

// Claude writes the report (better Vietnamese for the family page); OpenAI
// is the fallback when Claude is not configured or fails.
const OPENAI_MODEL = "gpt-4o-mini";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // The spend gate comes first: a real staff session and a per-account
  // limit, before the body or any row is read.
  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let reportId: string | null = null;
  try {
    // Staff only (the gate above).
    //
    // This function runs on the SERVICE ROLE and compiles a complete language
    // profile of a child from transcripts, error logs, work samples and
    // attendance. `verify_jwt` only proves the caller is signed in. The
    // student_reports RLS insert check passes on `generated_by = auth.uid()`
    // alone, so without this gate ANY authenticated user could insert a row
    // naming another child, call this function, and then read the resulting
    // profile back through that same policy. Identity comes from the JWT.
    const caller = spender;

    const body = await req.json().catch(() => ({}));
    reportId = String(body.report_id ?? "").trim() || null;
    if (!reportId) return respond({ success: false, error: "report_id is required" }, 400);

    const { data: report, error: repErr } = await sb
      .from("student_reports")
      .select("id, student_id, class_id, period_start, period_end, generated_by, published")
      .eq("id", reportId)
      .single();
    if (repErr || !report) return respond({ success: false, error: "report row not found" }, 404);
    // Staff of the report's own class only (audit F-04): the role alone let
    // any teacher or TA rebuild, and read back, any child's report by id. A
    // report with no class (admin reports) is an admin's.
    if (!(await callerHoldsClass(sb, caller, report.class_id))) {
      return respond({ success: false, error: "Not a class you teach" }, 403);
    }
    // A published report is what the teacher approved for the child to read:
    // regenerating it in place would put new model text in front of them with
    // no teacher in between. Generate a new report instead (the screens do).
    if (report.published !== false) {
      return respond({ success: false, error: "This report is published. Unpublish it, or generate a new one." }, 409);
    }

    const since = report.period_start ?? new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const until = report.period_end ?? new Date().toISOString().slice(0, 10);
    const sid = report.student_id;

    // ── Aggregate every data source ──────────────────────────────────────
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // Hanoi
    const [
      { data: student },
      { data: klass },
      { data: metrics },
      { data: errors },
      { data: vocab },
      { count: vocabTotal },
      { data: work },
      { data: points },
      { data: attendance },
      { data: cefrHistory },
      { data: liveProfile },
      { data: lessonNotes },
      { data: homework },
    ] = await Promise.all([
      sb.from("students").select("id, full_name, date_of_birth").eq("id", sid).single(),
      report.class_id
        ? sb.from("classes").select("name, curriculum, age_range, default_teacher_id").eq("id", report.class_id).maybeSingle()
        : Promise.resolve({ data: null }),
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
        .select("word, cefr, created_at, mastery_level, times_reviewed, times_correct")
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(400),
      sb.from("student_vocabulary_entries").select("id", { count: "exact", head: true }).eq("student_id", sid),
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
      // By the LESSON's date: a mark's created_at is when the row was made
      // (often seeded ahead, or typed days later), not when the lesson was.
      sb.from("attendance")
        .select("status, session_id, sessions!inner(date, status)")
        .eq("student_id", sid)
        .gte("sessions.date", since)
        .lte("sessions.date", until),
      sb.from("cefr_assessments")
        .select("level, level_score, source, assessed_at")
        .eq("student_id", sid)
        .order("assessed_at", { ascending: true })
        .limit(50),
      sb.from("student_learning_profiles")
        .select("summary, strengths, struggles, cefr_estimate, version")
        .eq("student_id", sid)
        .maybeSingle(),
      // What teachers already approved for this family, lesson by lesson.
      sb.from("lesson_report_students")
        .select("part, lesson_reports!inner(class_part, approved_at, sessions(date))")
        .eq("student_id", sid)
        .gte("lesson_reports.approved_at", since)
        .limit(40),
      sb.from("homework_submissions")
        .select("submitted_at, status, grade, teacher_feedback")
        .eq("student_id", sid)
        .gte("submitted_at", since)
        .limit(200),
    ]);

    if (!student) return respond({ success: false, error: "student not found" }, 404);

    let teacherName: string | null = null;
    if (klass?.default_teacher_id) {
      const { data: t } = await sb.from("teachers").select("full_name").eq("id", klass.default_teacher_id).maybeSingle();
      teacherName = (t as { full_name?: string } | null)?.full_name ?? null;
    }

    // Deterministic aggregates the LLM shouldn't have to compute.
    const pointsByType: Record<string, number> = {};
    for (const p of points ?? []) {
      pointsByType[p.type] = (pointsByType[p.type] || 0) + (p.points || 0);
    }
    const attendanceCounts: Record<string, number> = {};
    for (const a of attendance ?? []) {
      if ((a as any).sessions?.status === "Canceled") continue;
      attendanceCounts[a.status] = (attendanceCounts[a.status] || 0) + 1;
    }
    const errorsByType: Record<string, number> = {};
    const errorsByTopic: Record<string, number> = {};
    for (const e of errors ?? []) {
      errorsByType[e.error_type] = (errorsByType[e.error_type] || 0) + 1;
      if (e.cefr_topic) errorsByTopic[e.cefr_topic] = (errorsByTopic[e.cefr_topic] || 0) + 1;
    }
    const notes = approvedLessonNotes((lessonNotes ?? []) as Record<string, unknown>[]);
    const facts = periodFacts({
      from: since, to: until, today,
      attendance: (attendance ?? []) as Record<string, unknown>[],
      vocab: (vocab ?? []) as Record<string, unknown>[],
      vocabTotal: vocabTotal ?? 0,
      workReviewed: work?.length ?? 0,
      homework: (homework ?? []) as Record<string, unknown>[],
      points: (points ?? []) as Record<string, unknown>[],
      lessonReports: (lessonNotes ?? []).length,
      corrections: errors?.length ?? 0,
    });
    const wordsInPeriod = (vocab ?? []).filter((v) => String(v.created_at).slice(0, 10) >= since);

    const sourceCounts = {
      transcript_metrics: metrics?.length ?? 0,
      logged_errors: errors?.length ?? 0,
      vocab_words: facts.words_total,
      approved_work_samples: work?.length ?? 0,
      point_transactions: points?.length ?? 0,
      attendance_records: facts.lessons_held,
      prior_cefr_points: cefrHistory?.length ?? 0,
      lesson_reports: (lessonNotes ?? []).length,
      homework_submitted: facts.homework_submitted,
    };

    // ── Package the profiling prompt ─────────────────────────────────────
    const dataPackage = {
      student: {
        name: student.full_name,
        // Vietnamese names put the given name last.
        first_name: String(student.full_name ?? "").trim().split(/\s+/).pop() ?? null,
        date_of_birth: student.date_of_birth,
      },
      class: klass ? { name: klass.name, course: klass.curriculum, age_range: klass.age_range, teacher: teacherName } : null,
      period: { from: since, to: until },
      // Counted by the school; the family page prints them beside the text.
      facts,
      // Teacher-approved lesson notes: the best evidence to quote.
      approved_lesson_notes: notes,
      // The continuously-maintained journey summary.
      living_learning_profile: liveProfile ?? null,
      attendance: attendanceCounts,
      points_by_type: pointsByType,
      speaking_metrics_recent: (metrics ?? []).slice(0, 12),
      error_summary: { by_type: errorsByType, by_topic: errorsByTopic },
      recent_errors: (errors ?? []).slice(0, 25).map((e) => ({
        said: e.error_text, correct: e.corrected_text, type: e.error_type, topic: e.cefr_topic,
      })),
      vocabulary: {
        words_added_this_period: wordsInPeriod.length,
        total_words: facts.words_total,
        words_this_period: wordsInPeriod.slice(0, 40).map((v) => v.word),
        cefr_distribution: (vocab ?? []).reduce((acc: Record<string, number>, v) => {
          if (v.cefr) acc[v.cefr] = (acc[v.cefr] || 0) + 1;
          return acc;
        }, {}),
      },
      homework: (homework ?? []).slice(0, 15).map((h) => ({
        date: h.submitted_at, grade: h.grade, feedback: h.teacher_feedback ? String(h.teacher_feedback).slice(0, 200) : null,
      })),
      work_samples: (work ?? []).map((w) => ({
        excerpt: (w.ocr_text || "").slice(0, 600),
        teacher_notes: w.teacher_notes,
        date: w.created_at,
      })),
      // Approved levels only (model levels are drafts elsewhere).
      cefr_history: cefrHistory ?? [],
    };

    let raw: unknown;
    let usedModel = OPENAI_MODEL;
    try {
      const reply = await askClaudeJson<unknown>({
        system: REPORT_SYSTEM,
        content: [
          { type: "text", text: `EVIDENCE (JSON):\n${JSON.stringify(dataPackage)}` },
          { type: "text", text: "Write the progress report now, as the schema says." },
        ],
        schema: REPORT_JSON_SCHEMA,
        // Checked field by field by cleanReport, so no grammar limit to meet.
        strict: false,
        maxTokens: 12000,
        effort: "medium",
      });
      raw = reply.data;
      usedModel = reply.model;
    } catch (claudeErr) {
      console.warn("generate-student-report: Claude unavailable, using OpenAI:", (claudeErr as Error).message);
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) throw claudeErr;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.3,
          max_tokens: 4500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `${REPORT_SYSTEM}\n\nReply with ONE JSON object shaped as this JSON schema:\n${JSON.stringify(REPORT_JSON_SCHEMA)}` },
            { role: "user", content: JSON.stringify(dataPackage) },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
      const data = await res.json();
      raw = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    }
    const result = cleanReport(raw, facts) as any;

    // ── Persist ──────────────────────────────────────────────────────────
    // Only while still unpublished (compare-and-set): a teacher who
    // published the row meanwhile keeps what they published.
    const { data: saved, error: updErr } = await sb
      .from("student_reports")
      .update({
        status: "ready",
        model: usedModel,
        source_counts: sourceCounts,
        report: result,
        narrative: result.narrative ?? null,
      })
      .eq("id", reportId)
      .eq("published", false)
      .select("id");
    if (updErr) throw updErr;
    if (!saved || saved.length !== 1) {
      return respond({ success: false, error: "This report was published while it was being written; nothing was changed." }, 409);
    }

    // The model's CEFR estimate is a staff-only draft until a teacher
    // approves it; never a cefr_assessments row (the database refuses one).
    let cefrDraftId: string | null = null;
    const level = result?.cefr?.level;
    if (level && CEFR_SCORE[level] !== undefined) {
      const { data: draft, error: draftErr } = await sb
        .from("cefr_assessment_drafts")
        .insert({
          student_id: sid,
          class_id: report.class_id,
          source: "ai_report",
          source_id: reportId,
          level,
          level_score: CEFR_SCORE[level],
          confidence: typeof result.cefr.confidence === "number" ? result.cefr.confidence : null,
          evidence: result.cefr.rationale ? String(result.cefr.rationale).slice(0, 500) : null,
          requested_by: caller.userId,
        })
        .select("id")
        .single();
      // The report stands without it; the draft is lost, nothing is shared.
      if (draftErr) console.error("generate-student-report: CEFR draft not saved:", draftErr.message);
      else cefrDraftId = draft?.id ?? null;
    }

    return respond({ success: true, report_id: reportId, report: result, cefr_draft_id: cefrDraftId });
  } catch (error) {
    console.error("generate-student-report error:", error);
    if (reportId) {
      await sb
        .from("student_reports")
        .update({
          status: "failed",
          error_message: (error as Error).message?.slice(0, 500),
        })
        .eq("id", reportId)
        .eq("published", false);
    }
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
