/**
 * cefr-defense Edge Function
 * ===========================
 * The CEFR Level Defense workflow:
 *
 *   1. A teacher DECLARES a student's working CEFR level (set_level).
 *   2. The AI MINES the platform's existing evidence — transcript speech
 *      metrics, the error log, vocabulary bank, work samples, assessment
 *      history — and judges the claim against CEFR descriptors
 *      (mine_evidence). Verdict + for/against evidence lands on the claim.
 *   3. Or the student DEFENDS the level in an adaptive test
 *      (generate_test → get_state → submit_stage ×3).
 *
 * Test design — multistage adaptive (MST), the format behind Linguaskill /
 * the Oxford Placement Test, chosen over item-by-item CAT because each stage
 * is a coherent, reviewable set and routing is transparent:
 *   Stage 1 "locator":    8 MCQ at the claimed level (grammar/vocab/reading).
 *   Stage 2 "routing":    8 MCQ one level up (≥75%), down (≤37.5%), or same.
 *   Stage 3 "performance": 2 short writing tasks + 4 confirmation MCQ at the
 *                          routed level; writing is graded against CEFR
 *                          writing descriptors.
 *   Result: synthesis of accuracy-at-level + writing bands → level estimate,
 *   defended = estimate reaches the claimed level. The estimate (and the
 *   evidence audit's recommended level) is saved as a staff-only DRAFT in
 *   cefr_assessment_drafts; it reaches the growth chart, the child and the
 *   family only when a teacher approves it (approve_cefr_draft, migration
 *   20261117151000). saveDraft below is the only write of a CEFR point here.
 *
 * What a child sees (privacy follow-ups round 2): only the teacher's level and
 * progress. get_state and submit_stage give a non-staff caller no AI verdict
 * - no estimate, no defended / not defended, no rationale, no evidence audit,
 * not even the routed stage level or the stage score - just "submitted, your
 * teacher will review it", and the level a teacher APPROVED once there is one
 * (a published level_defense_test point). Staff see everything. The child's
 * direct SELECT on cefr_level_claims is gone (20261117152000).
 *
 * Spend gate: requireSpender first (any signed-in role - the child takes the
 * test, staff run the rest; 60 calls per account per 10 minutes, get_state
 * included), and the three actions that call OpenAI (mine_evidence,
 * generate_test, submit_stage) share a tighter 20 per 10 minutes. A whole
 * test is 4 OpenAI calls (generate + 3 stages); 20 is five tests or audits in
 * ten minutes for one teacher, and a child needs 3. That limit is counted
 * just before the OpenAI call, after the action's own checks, so a refused
 * call ("Already graded", not your child) costs nothing (review N-4).
 *
 * After the test, the child's status moves on when a teacher acts (review
 * N-3): 'reviewed' with the approved level, 'reviewed' with none when the
 * teacher discarded the draft, 'set_by_teacher' when the teacher set a level
 * of their own afterwards (set_level, or a manual point - shown).
 *
 * Anti-cheat: generated items (with answer keys) live only in the
 * `stages` JSONB, which students cannot SELECT (no RLS policy). This
 * function serves SANITIZED items and grades server-side.
 *
 * The whole case (28 Nov 2026): the audit reads everything learnt here and
 * the child's STANDARDIZED results (loadEvidence); get_state sends staff the
 * facts, the standardized results and the combined case (_lib/level-defense-
 * case.ts), and a child the facts and standardized results only. Staff open
 * a child's defence (set_defense, Admin > Level Defence); while it is open
 * the child starts the test themselves (start_test).
 *
 * Input:  { action, ...params } — see handlers.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { safeParseJson } from "../_lib/text.ts";
import { callerHoldsClass, callerHoldsStudent } from "../_lib/auth.ts";
import { requireSpender, SIGNED_IN_ROLES, type SpendGate } from "../_lib/ai-gate.ts";
import { checkRateLimit, rateLimitResponse } from "../_lib/rate-limit.ts";
import { buildPortfolio, combineCase, portfolioLines, type Portfolio } from "../_lib/level-defense-case.ts";

const GATE: SpendGate = { name: "cefr-defense", roles: SIGNED_IN_ROLES, limit: 60, windowMs: 10 * 60_000 };
/** The actions that call OpenAI, per account. */
const SPEND = { limit: 20, windowMs: 10 * 60_000 };
const SPENDING_ACTIONS = new Set(["mine_evidence", "generate_test", "start_test", "submit_stage"]);
const CHILD_SUBMITTED = "Submitted - your teacher will review your test.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"] as const;
type Level = (typeof LEVELS)[number];

const levelIdx = (l: string) => LEVELS.indexOf(l as Level);
const clampLevel = (i: number) => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))];

/** Compact CEFR descriptor reference used by every prompt — keeps item
 *  writing and grading anchored to the standard instead of vibes. */
const CEFR_DESCRIPTORS = `
CEFR REFERENCE (Council of Europe global scale, compressed):
- Pre-A1: isolated words, memorised classroom phrases, names/numbers.
- A1: very basic everyday phrases; present simple; personal information; can interact if the other person talks slowly.
- A2: sentences on routine matters (family, shopping, school); simple past & going-to future; basic connectors (and/but/because); short simple descriptions.
- B1: connected discourse on familiar topics; opinions with brief reasons; narratives; most situations while travelling; comparatives, conditionals 1, present perfect.
- B2: clear detailed text on a wide range of subjects; argues pros and cons; interacts fluently; passive voice, conditionals 2-3, reported speech, hedging.
- C1: flexible, effective language for social and academic purposes; implicit meaning; well-structured complex text; wide idiomatic range.
`.trim();

const OPENAI_TIMEOUT_MS = 90_000;

async function openaiJson(key: string, body: Record<string, unknown>, label: string): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${label} error (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return safeParseJson(data.choices?.[0]?.message?.content || "{}");
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error(`OpenAI ${label} timed out`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Generate one MST stage: MCQ items (and writing tasks for stage 3). */
async function generateStage(
  key: string,
  stageNo: number,
  level: string,
  studentAge: number | null,
  priorPrompts: string[],
): Promise<any> {
  const isPerformance = stageNo === 3;
  const parsed = await openaiJson(key, {
    model: "gpt-4o",
    temperature: 0.6,
    max_tokens: 3500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You write CEFR-aligned English test items for a placement/defense test at level ${level}. ` +
          `The test taker is a Vietnamese young learner${studentAge ? ` around ${studentAge} years old` : ""} — ` +
          "use age-appropriate, culturally neutral topics (school, friends, hobbies, animals, travel, food).\n\n" +
          CEFR_DESCRIPTORS +
          "\n\nRULES:\n" +
          `1. Every item must genuinely discriminate AT ${level}: a solid ${level} learner answers it correctly; ` +
          "a learner one level below usually cannot. Anchor each item to a specific descriptor.\n" +
          "2. MCQ: exactly 4 options, ONE unambiguously correct, distractors are plausible errors a learner " +
          "at the level below would make. No trick questions, no obscure trivia, no culture-bound knowledge.\n" +
          "3. Mix skills: grammar in context, vocabulary in context, and short reading comprehension " +
          "(a 2-4 sentence passage with a question). Reading passages must be self-contained.\n" +
          "4. Do NOT reuse or trivially rephrase these earlier prompts:\n" +
          (priorPrompts.length ? priorPrompts.map((p) => `- ${p}`).join("\n") : "(none)") +
          "\n\nReturn JSON: {\"items\": [" +
          '{"id": string (short unique), "type": "mcq", "skill": "grammar"|"vocabulary"|"reading", ' +
          '"descriptor": string (the CEFR descriptor this probes), "passage": string|null, ' +
          '"prompt": string, "options": [string,string,string,string], "correct_index": 0-3, ' +
          '"explanation": string (why the answer is right — shown AFTER grading)}' +
          (isPerformance
            ? '], "writing_tasks": [{"id": string, "prompt": string (a short writing task appropriate at ' +
              `${level}: e.g. a few sentences/short paragraph; state the expected length), ` +
              '"descriptor": string}]'
            : "]") +
          "}.\n" +
          `Produce exactly ${isPerformance ? "4 MCQ items and 2 writing_tasks" : "8 MCQ items"}.`,
      },
      { role: "user", content: `Generate stage ${stageNo} at ${level}.` },
    ],
  }, `stage-${stageNo} generation`);

  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((it: any) => it?.prompt && Array.isArray(it.options) && it.options.length === 4 &&
      Number.isInteger(it.correct_index) && it.correct_index >= 0 && it.correct_index <= 3)
    .map((it: any, i: number) => ({ ...it, id: String(it.id || `s${stageNo}q${i}`), type: "mcq" }));
  const writing = isPerformance
    ? (Array.isArray(parsed.writing_tasks) ? parsed.writing_tasks : [])
        .filter((w: any) => w?.prompt)
        .map((w: any, i: number) => ({ ...w, id: String(w.id || `s${stageNo}w${i}`), type: "writing" }))
        .slice(0, 2)
    : [];
  if (items.length < (isPerformance ? 3 : 6)) {
    throw new Error(`stage ${stageNo} generation produced too few valid items`);
  }
  return { stage: stageNo, level, items, writing_tasks: writing };
}

/** Strip answer keys before anything leaves the server. */
function sanitizeStage(stage: any) {
  if (!stage) return null;
  return {
    stage: stage.stage,
    level: stage.level,
    items: (stage.items || []).map((it: any) => ({
      id: it.id, type: it.type, skill: it.skill, passage: it.passage ?? null,
      prompt: it.prompt, options: it.options,
    })),
    writing_tasks: (stage.writing_tasks || []).map((w: any) => ({
      id: w.id, type: "writing", prompt: w.prompt,
    })),
  };
}

/** A model's CEFR point, as a staff-only draft for a teacher to approve.
 *  Never a cefr_assessments row: families read that table (and the database
 *  refuses a model-made row there). A failed save loses the draft and
 *  shares nothing. */
async function saveDraft(sb: any, row: {
  student_id: string; class_id: string | null; source: "level_defense_evidence" | "level_defense_test";
  source_id: string | null; level: string; confidence: unknown; evidence: unknown; requested_by: string;
}): Promise<string | null> {
  const { data, error } = await sb
    .from("cefr_assessment_drafts")
    .insert({
      student_id: row.student_id,
      class_id: row.class_id,
      source: row.source,
      source_id: row.source_id,
      level: row.level,
      level_score: levelIdx(row.level),
      confidence: typeof row.confidence === "number" ? row.confidence : null,
      evidence: String(row.evidence || "").slice(0, 1000),
      requested_by: row.requested_by,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`cefr-defense: CEFR draft (${row.source}) not saved:`, error.message);
    return null;
  }
  return data?.id ?? null;
}

const stripHtml = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const rowsOf = (r: { data: any; error: any }, what: string): any[] => {
  if (r.error) console.error(`cefr-defense: ${what} not read:`, r.error.message);
  return Array.isArray(r.data) ? r.data : [];
};

/**
 * Everything the school holds about a child's English (28 Nov 2026): the
 * facts (`portfolio`, no model output, safe for the child), the standardized
 * results and approved levels the case weighs, and - for the audit prompt
 * only - the teachers' own words (skill comments, homework feedback, exam
 * reports, approved video feedback, lesson-report parts, work notes).
 * A table that cannot be read is left out and logged, never fatal.
 */
async function loadEvidence(sb: any, studentId: string) {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const q = await Promise.all([
    sb.from("attendance").select("status, sessions!inner(status, date)").eq("student_id", studentId).limit(2000),
    sb.from("homework_submissions").select("status, grade, graded_at, teacher_feedback, submitted_at")
      .eq("student_id", studentId).order("submitted_at", { ascending: false }).limit(300),
    sb.from("skill_assessments").select("skill, score, date, teacher_comment")
      .eq("student_id", studentId).gte("date", since).order("date", { ascending: false }).limit(500),
    sb.from("video_submissions").select("id, status, video_analyses(final_score, final_grade, final_feedback_parent, approved_at)")
      .eq("student_id", studentId).eq("status", "approved").limit(50),
    sb.from("student_vocabulary_entries").select("word, mastery_level, cefr")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(1000),
    sb.from("srs_cards").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    sb.from("student_error_log").select("error_text, corrected_text, error_type, created_at")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(30),
    sb.from("student_error_log").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    sb.from("lesson_report_students").select("part").eq("student_id", studentId).limit(20),
    sb.from("exam_reports").select("title, exam_date, content_html")
      .eq("student_id", studentId).order("exam_date", { ascending: false }).limit(6),
    sb.from("student_standardized_tests").select("id, test_name, test_date, overall_score, score_label, skill_scores, cefr_level, certificate_ref, notes")
      .eq("student_id", studentId).order("test_date", { ascending: false }).limit(20),
    sb.from("cefr_assessments").select("level, source, assessed_at")
      .eq("student_id", studentId).order("assessed_at", { ascending: false }).limit(20),
    sb.from("student_work").select("teacher_notes, approved_at")
      .eq("student_id", studentId).not("approved_at", "is", null).not("teacher_notes", "is", null)
      .order("approved_at", { ascending: false }).limit(10),
    sb.from("transcript_speaker_metrics")
      .select("word_count, distinct_words, questions_asked, cefr_estimate, contribution, created_at")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
  ]);
  const [att, hw, skills, vids, vocab, srs, errs, errCount, lrs, exams, std, points, work, metrics] = q;
  const attendance = rowsOf(att, "attendance").filter((a: any) => a.sessions?.status !== "Canceled");
  const videos = rowsOf(vids, "videos").flatMap((v: any) =>
    (Array.isArray(v.video_analyses) ? v.video_analyses : v.video_analyses ? [v.video_analyses] : []));
  const standardized = rowsOf(std, "standardized tests");
  // Points on the growth chart are published: a teacher made or approved each.
  const approvedPoints = rowsOf(points, "cefr points");
  const examRows = rowsOf(exams, "exam reports");
  const portfolio: Portfolio = buildPortfolio({
    attendance,
    homework: rowsOf(hw, "homework"),
    skills: rowsOf(skills, "skill scores"),
    videos,
    vocabulary: rowsOf(vocab, "vocabulary"),
    srsCards: srs.count ?? 0,
    errors: errCount.count ?? 0,
    lessonReports: rowsOf(lrs, "lesson reports").length,
    examReports: examRows,
    standardized,
    approvedPoints,
  });

  const quote = (s: unknown, n: number) => stripHtml(s).slice(0, n);
  const teacherWords = [
    ...rowsOf(skills, "skill scores").filter((s: any) => s.teacher_comment).slice(0, 12)
      .map((s: any) => `- [${s.skill} ${s.score}, ${s.date}] ${quote(s.teacher_comment, 160)}`),
    ...rowsOf(hw, "homework").filter((h: any) => h.teacher_feedback).slice(0, 8)
      .map((h: any) => `- [homework ${h.grade ?? ""}] ${quote(h.teacher_feedback, 160)}`),
    ...videos.filter((v: any) => v.final_feedback_parent).slice(0, 4)
      .map((v: any) => `- [video ${v.final_score ?? ""}/100] ${quote(v.final_feedback_parent, 200)}`),
    ...rowsOf(work, "student work").slice(0, 5).map((w: any) => `- [class work] ${quote(w.teacher_notes, 160)}`),
    ...rowsOf(lrs, "lesson reports").slice(0, 6).map((l: any) => `- [lesson report] ${quote(JSON.stringify(l.part), 220)}`),
  ];
  const dossierParts = [
    ...portfolioLines(portfolio),
    standardized.length
      ? `Standardized test detail:\n${standardized.map((t: any) =>
          `- ${t.test_name} on ${t.test_date}: CEFR ${t.cefr_level}${t.score_label ? `, ${t.score_label}` : ""}${t.overall_score != null ? `, overall ${t.overall_score}` : ""}` +
          `${t.skill_scores && Object.keys(t.skill_scores).length ? `, skills ${JSON.stringify(t.skill_scores)}` : ""}${t.notes ? ` (${quote(t.notes, 120)})` : ""}`).join("\n")}`
      : "",
    examRows.length
      ? `School exam reports (teacher-written):\n${examRows.map((e: any) => `- ${e.title}${e.exam_date ? ` (${e.exam_date})` : ""}: ${quote(e.content_html, 400)}`).join("\n")}`
      : "",
    teacherWords.length ? `Teachers' own words about the child:\n${teacherWords.join("\n")}` : "",
    rowsOf(metrics, "speech metrics").length
      ? `Recent lesson speech metrics:\n${rowsOf(metrics, "speech metrics")
          .map((m: any) => `- ${String(m.created_at).slice(0, 10)}: ${m.word_count} words, ${m.distinct_words} distinct, ${m.questions_asked} questions, AI est. ${m.cefr_estimate || "?"}. ${m.contribution ? String(m.contribution).slice(0, 150) : ""}`)
          .join("\n")}`
      : "No transcript speech data yet.",
    rowsOf(errs, "errors").length
      ? `Recent logged errors (verbatim -> correction):\n${rowsOf(errs, "errors")
          .map((e: any) => `- [${e.error_type}] "${String(e.error_text).slice(0, 100)}" -> "${String(e.corrected_text).slice(0, 100)}"`)
          .join("\n")}`
      : "No logged errors.",
    `Recent vocabulary: ${rowsOf(vocab, "vocabulary").slice(0, 40).map((v: any) => v.word).join(", ") || "none"}`,
    approvedPoints.length
      ? `Growth-chart history: ${approvedPoints.map((h: any) => `${h.level} (${h.source}, ${String(h.assessed_at).slice(0, 10)})`).join("; ")}`
      : "",
  ].filter(Boolean);
  return { portfolio, standardized, approvedPoints, dossierParts };
}

/** The combined case for staff, from what is held now. */
function caseFor(claim: any, ev: { standardized: any[]; approvedPoints: any[] }, tests: any[]) {
  const graded = (tests || []).find((t: any) => t.status === "graded" && t.result?.level_estimate);
  return combineCase({
    claimed: claim.claimed_level,
    standardized: ev.standardized,
    approvedPoints: ev.approvedPoints.filter((p: any) => p.source !== "transcript"),
    testEstimate: graded ? { level: graded.result.level_estimate, date: String(graded.updated_at || graded.created_at).slice(0, 10) } : null,
    auditLevel: claim.evidence?.recommended_level && claim.evidence?.verdict !== "insufficient_evidence"
      ? { level: claim.evidence.recommended_level, date: claim.evidence_checked_at ? String(claim.evidence_checked_at).slice(0, 10) : null }
      : null,
  });
}

/** The child's own view of a standardized result: what the score report says. */
const childStandardized = (rows: any[]) =>
  rows.map((t: any) => ({ test_name: t.test_name, test_date: t.test_date, cefr_level: t.cefr_level, score_label: t.score_label }));

/** A child's view of a test: progress only. No result, no routed level. */
function childTest(test: any) {
  const stages = Array.isArray(test.stages) ? test.stages : [];
  const active = test.status === "graded" ? null : sanitizeStage(stages[test.current_stage - 1]);
  if (active) delete (active as any).level;
  return {
    id: test.id,
    status: test.status,
    target_level: test.target_level,     // the teacher's level
    current_stage: test.current_stage,
    total_stages: 3,
    active_stage: active,
    result: null,
    submitted: test.status === "graded",
    created_at: test.created_at,
    // What the child did, counted, never judged: right answers per stage
    // (graded by the key, not a model) and words written. No stage level,
    // no estimate, no verdict.
    summary: test.status === "graded" ? childSummary(test) : null,
  };
}

function childSummary(test: any) {
  const responses: any[] = Array.isArray(test.responses) ? test.responses : [];
  const stages = responses.map((r: any) => {
    const mcq: any[] = Array.isArray(r.mcq) ? r.mcq : [];
    const writing: any[] = Array.isArray(r.writing) ? r.writing : [];
    return {
      stage: Number(r.stage) || null,
      correct: mcq.filter((m) => m?.correct === true).length,
      total: mcq.length,
      writing_tasks: writing.length,
      words_written: writing.reduce((n, w) => n + String(w?.text || "").trim().split(/\s+/).filter(Boolean).length, 0),
    };
  });
  const last = responses[responses.length - 1];
  return {
    stages,
    correct: stages.reduce((n, x) => n + x.correct, 0),
    total: stages.reduce((n, x) => n + x.total, 0),
    words_written: stages.reduce((n, x) => n + x.words_written, 0),
    submitted_at: last?.submitted_at ?? test.updated_at ?? null,
  };
}

/** A child's view of the claim status: never an AI verdict. */
function childClaimStatus(tests: any[], seen: { approved: boolean; setByTeacher: boolean; discarded: boolean }): string {
  if (tests.some((t) => t.status !== "graded")) return "test_assigned";
  if (seen.approved) return "reviewed";
  if (seen.setByTeacher) return "set_by_teacher";
  if (seen.discarded) return "reviewed";
  if (tests.some((t) => t.status === "graded")) return "submitted";
  return "set_by_teacher";
}

function sanitizeTest(test: any) {
  const stages = Array.isArray(test.stages) ? test.stages : [];
  return {
    id: test.id,
    status: test.status,
    target_level: test.target_level,
    current_stage: test.current_stage,
    total_stages: 3,
    active_stage: test.status === "graded" ? null : sanitizeStage(stages[test.current_stage - 1]),
    result: test.result ?? null,
    created_at: test.created_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // The spend gate comes first: a real session with a role, and a
  // per-account limit, before the body or any row is read.
  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const user = { id: spender.userId };
    const roles = spender.roles;
    const isStaff = roles.has("admin") || roles.has("teacher");
    // A teacher acts only on children of their own classes (audit F-04):
    // the role alone let any teacher or TA set a level, send a child's error
    // log, vocabulary and date of birth to OpenAI, or set a test, for ANY
    // student id. Same predicate as the students row policy
    // (can_view_student_in_class); admins pass. Fails closed.
    const caller = spender;
    const staffHolds = async (studentId: string): Promise<boolean> =>
      isStaff && !!studentId && (await callerHoldsStudent(sb, caller, studentId));
    const notYours = () => respond({ success: false, error: "That child is not in one of your classes" }, 403);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return respond({ success: false, error: "OPENAI_API_KEY is not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    // The OpenAI actions' own limit, counted right before the model call.
    const overSpend = (): Response | null => {
      if (!SPENDING_ACTIONS.has(action)) return null;
      const rl = checkRateLimit(`cefr-defense:spend:${user.id}`, SPEND.limit, SPEND.windowMs, "user");
      return rl.limited ? rateLimitResponse(rl.resetAt, corsHeaders) : null;
    };

    /** The class of the child's current enrolment (the earliest-started), or null. */
    const currentClass = async (studentId: string): Promise<string | null> => {
      const { data } = await sb.from("enrollments").select("class_id, start_date")
        .eq("student_id", studentId).is("end_date", null).order("start_date", { ascending: true }).limit(1);
      return data?.[0]?.class_id ?? null;
    };

    /** Build stage 1 at the claimed level and assign the test. */
    const assignTest = async (claim: any, studentId: string) => {
      const { data: studentRow } = await sb
        .from("students").select("date_of_birth").eq("id", studentId).maybeSingle();
      const age = studentRow?.date_of_birth
        ? Math.floor((Date.now() - new Date(studentRow.date_of_birth).getTime()) / 31_557_600_000)
        : null;
      const stage1 = await generateStage(key, 1, claim.claimed_level, age, []);
      const { data: test, error } = await sb
        .from("cefr_defense_tests")
        .insert({
          claim_id: claim.id,
          student_id: studentId,
          class_id: claim.class_id,
          target_level: claim.claimed_level,
          status: "assigned",
          current_stage: 1,
          stages: [stage1],
          responses: [],
          created_by: user.id,
        })
        .select("*").single();
      if (error) throw error;
      await sb.from("cefr_level_claims")
        .update({ status: "test_assigned", updated_at: new Date().toISOString() })
        .eq("id", claim.id);
      return test;
    };

    // Resolve the acting student (for student-initiated actions).
    const { data: ownStudent } = await sb
      .from("students").select("id, full_name, date_of_birth")
      .eq("linked_user_id", user.id).maybeSingle();

    // ── set_level ────────────────────────────────────────────────────────
    if (action === "set_level") {
      if (!isStaff) return respond({ success: false, error: "Teachers/admins only" }, 403);
      const studentId = String(body.student_id || "");
      const level = String(body.level || "");
      if (!studentId || !LEVELS.includes(level as Level)) {
        return respond({ success: false, error: "student_id and a valid level are required" }, 400);
      }
      if (!(await staffHolds(studentId))) return notYours();
      if (body.class_id && !(await callerHoldsClass(sb, caller, String(body.class_id)))) return notYours();
      const { data: claim, error } = await sb
        .from("cefr_level_claims")
        .upsert(
          {
            student_id: studentId,
            class_id: body.class_id || (await currentClass(studentId)),
            claimed_level: level,
            set_by: user.id,
            status: "unverified",
            evidence: null,
            evidence_checked_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id" },
        )
        .select("*").single();
      if (error) throw error;
      return respond({ success: true, claim });
    }

    // ── mine_evidence ────────────────────────────────────────────────────
    if (action === "mine_evidence") {
      if (!isStaff) return respond({ success: false, error: "Teachers/admins only" }, 403);
      const studentId = String(body.student_id || "");
      if (!(await staffHolds(studentId))) return notYours();
      const { data: claim } = await sb
        .from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle();
      if (!claim) return respond({ success: false, error: "Set a level first" }, 404);
      { const limited = overSpend(); if (limited) return limited; }

      const [ev, { data: studentRow }] = await Promise.all([
        loadEvidence(sb, studentId),
        sb.from("students").select("full_name, date_of_birth").eq("id", studentId).maybeSingle(),
      ]);
      const { data: profileRow } = await sb.from("student_learning_profiles")
        .select("journey_summary").eq("student_id", studentId).maybeSingle();

      const dossier = [
        `CLAIMED LEVEL: ${claim.claimed_level}`,
        `Student: ${studentRow?.full_name || "unknown"}${studentRow?.date_of_birth ? `, born ${studentRow.date_of_birth}` : ""}`,
        ...ev.dossierParts,
        profileRow?.journey_summary ? `Learning journey summary: ${String(profileRow.journey_summary).slice(0, 800)}` : "",
      ].filter(Boolean).join("\n\n").slice(0, 14000);

      const verdict = await openaiJson(key, {
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a CEFR assessment specialist auditing a teacher's claimed level for a young " +
              "English learner against the school's collected evidence.\n\n" +
              CEFR_DESCRIPTORS +
              "\n\nRULES:\n" +
              "1. Judge ONLY from the evidence given — quote it. Never invent examples.\n" +
              "2. A STANDARDIZED test result (official score report, recorded by staff) is the strongest single " +
              "evidence when it is recent (under 18 months); then teacher-approved levels and the teachers' own words; " +
              "then production evidence (their actual utterances/errors); then counts; earlier AI estimates last.\n" +
              "3. Distinguish 'not enough evidence' from 'evidence contradicts the claim'.\n" +
              "4. Errors are informative both ways: an A2 learner attempting B1 structures (even with " +
              "slips) is evidence FOR growth; fossilized basic errors are evidence AGAINST a high claim.\n\n" +
              'Return JSON: {"verdict": "supported"|"partially_supported"|"not_supported"|"insufficient_evidence", ' +
              '"confidence": number 0-1, ' +
              '"recommended_level": one of ' + JSON.stringify(LEVELS) + ", " +
              '"evidence_for": [{"point": string, "source": string (which dataset it came from)}], ' +
              '"evidence_against": [{"point": string, "source": string}], ' +
              '"rationale": string (3-5 sentences, parent-readable), ' +
              '"suggest_defense_test": boolean (true when a test would settle it)}',
          },
          { role: "user", content: dossier },
        ],
      }, "evidence verdict");

      const status =
        verdict.verdict === "supported" ? "supported"
        : verdict.verdict === "partially_supported" ? "partially_supported"
        : verdict.verdict === "not_supported" ? "not_supported"
        : "unverified";

      await sb.from("cefr_level_claims")
        .update({ evidence: verdict, evidence_checked_at: new Date().toISOString(), status, updated_at: new Date().toISOString() })
        .eq("id", claim.id);
      // The facts and the case go in the columns 20261128200000 adds; before
      // that migration this write fails on its own and changes nothing else.
      {
        const { data: testsNow } = await sb.from("cefr_defense_tests").select("status, result, updated_at, created_at")
          .eq("student_id", studentId).order("created_at", { ascending: false }).limit(3);
        const theCase = caseFor({ ...claim, evidence: verdict, evidence_checked_at: new Date().toISOString() }, ev, testsNow || []);
        const { error: pErr } = await sb.from("cefr_level_claims")
          .update({ portfolio: ev.portfolio, case_summary: theCase }).eq("id", claim.id);
        if (pErr) console.error("cefr-defense: portfolio not saved:", pErr.message);
      }

      // A conclusive audit drafts a growth-chart point for a teacher to approve.
      let cefrDraftId: string | null = null;
      if (verdict.recommended_level && LEVELS.includes(verdict.recommended_level) && verdict.verdict !== "insufficient_evidence") {
        cefrDraftId = await saveDraft(sb, {
          student_id: studentId,
          class_id: claim.class_id,
          source: "level_defense_evidence",
          source_id: claim.id,
          level: verdict.recommended_level,
          confidence: verdict.confidence,
          evidence: verdict.rationale,
          requested_by: user.id,
        });
      }

      return respond({ success: true, verdict, status, cefr_draft_id: cefrDraftId });
    }

    // ── generate_test ────────────────────────────────────────────────────
    if (action === "generate_test") {
      if (!isStaff) return respond({ success: false, error: "Teachers/admins only" }, 403);
      const studentId = String(body.student_id || "");
      if (!(await staffHolds(studentId))) return notYours();
      const { data: claim } = await sb
        .from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle();
      if (!claim) return respond({ success: false, error: "Set a level first" }, 404);
      { const limited = overSpend(); if (limited) return limited; }
      const test = await assignTest(claim, studentId);
      return respond({ success: true, test: sanitizeTest(test) });
    }

    // ── set_defense ──────────────────────────────────────────────────────
    // Staff open (or close) a child's Level Defence: while open, the child
    // may start the adaptive test from Defend My Level. With `level` it also
    // sets the claimed level (creating the claim), like set_level.
    if (action === "set_defense") {
      if (!isStaff) return respond({ success: false, error: "Teachers/admins only" }, 403);
      const studentId = String(body.student_id || "");
      if (!(await staffHolds(studentId))) return notYours();
      const level = body.level ? String(body.level) : "";
      if (level && !LEVELS.includes(level as Level)) return respond({ success: false, error: "Not a valid level" }, 400);
      const open = body.open === true;
      const note = body.note == null ? null : String(body.note).trim().slice(0, 300) || null;
      const { data: existing } = await sb.from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle();
      if (!existing && !level) return respond({ success: false, error: "Choose the level to defend first" }, 400);
      const now = new Date().toISOString();
      let claim = existing;
      if (level && (!existing || existing.claimed_level !== level)) {
        const classId = existing?.class_id ?? (await currentClass(studentId));
        const { data: up, error } = await sb.from("cefr_level_claims").upsert({
          student_id: studentId, class_id: classId, claimed_level: level, set_by: user.id,
          status: "unverified", evidence: null, evidence_checked_at: null, updated_at: now,
        }, { onConflict: "student_id" }).select("*").single();
        if (error) throw error;
        claim = up;
      }
      const { data: upd, error: oErr } = await sb.from("cefr_level_claims").update({
        defense_open: open,
        defense_opened_by: open ? user.id : null,
        defense_opened_at: open ? now : null,
        defense_note: note,
        updated_at: now,
      }).eq("id", claim.id).select("*").single();
      if (oErr) {
        return respond({ success: false, error: `Opening a defence needs migration 20261128200000 (${oErr.message})` }, 409);
      }
      return respond({ success: true, claim: upd });
    }

    // ── start_test ───────────────────────────────────────────────────────
    // The child starts the adaptive test themselves, once staff opened the
    // defence for them. One test at a time; a graded test needs staff to
    // open the defence again (closing it on every start keeps it to one).
    if (action === "start_test") {
      if (!ownStudent?.id) return respond({ success: false, error: "Only a pupil can start their own test" }, 403);
      const studentId = ownStudent.id;
      const { data: claim } = await sb.from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle();
      if (!claim || claim.defense_open !== true) {
        return respond({ success: false, error: "Your teacher hasn't opened your Level Defence yet" }, 403);
      }
      const { data: active } = await sb.from("cefr_defense_tests").select("id")
        .eq("student_id", studentId).neq("status", "graded").limit(1);
      if (active && active.length) return respond({ success: false, error: "You already have a test to finish" }, 409);
      { const limited = overSpend(); if (limited) return limited; }
      // Close the door first so a double tap cannot start two tests.
      const { data: closed } = await sb.from("cefr_level_claims")
        .update({ defense_open: false, updated_at: new Date().toISOString() })
        .eq("id", claim.id).eq("defense_open", true).select("id");
      if (!closed || !closed.length) return respond({ success: false, error: "Your test is already being prepared" }, 409);
      try {
        const test = await assignTest(claim, studentId);
        return respond({ success: true, test: childTest(test) });
      } catch (e) {
        await sb.from("cefr_level_claims").update({ defense_open: true }).eq("id", claim.id);
        throw e;
      }
    }

    // ── get_state ────────────────────────────────────────────────────────
    if (action === "get_state") {
      const studentId = String(body.student_id || ownStudent?.id || "");
      if (!studentId) return respond({ success: false, error: "No student in scope" }, 400);
      const staffOk = await staffHolds(studentId);
      if (!staffOk && ownStudent?.id !== studentId) {
        return respond({ success: false, error: "Not your record" }, 403);
      }
      const [{ data: claim }, { data: tests }] = await Promise.all([
        sb.from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle(),
        sb.from("cefr_defense_tests").select("*").eq("student_id", studentId)
          .order("created_at", { ascending: false }).limit(3),
      ]);
      // The facts and standardized results, for both views (no model output).
      const ev = await loadEvidence(sb, studentId);
      const defense = claim
        ? { open: claim.defense_open === true, note: claim.defense_note ?? null, opened_at: claim.defense_opened_at ?? null }
        : { open: false, note: null, opened_at: null };
      if (staffOk) {
        return respond({
          success: true,
          claim: claim
            ? { claimed_level: claim.claimed_level, status: claim.status, evidence: claim.evidence, evidence_checked_at: claim.evidence_checked_at }
            : null,
          tests: (tests || []).map(sanitizeTest),
          defense,
          portfolio: ev.portfolio,
          standardized: ev.standardized,
          case: claim ? caseFor(claim, ev, tests || []) : null,
        });
      }
      // The child: the teacher's level, progress, and a level only once a
      // teacher approved it (published points only; fails closed to none).
      const testIds = (tests || []).map((t: any) => t.id);
      let approved: { level: string; assessed_at: string } | null = null;
      if (testIds.length) {
        const { data: pts, error: ptsErr } = await sb.from("cefr_assessments")
          .select("level, assessed_at, source_id")
          .eq("student_id", studentId)
          .eq("source", "level_defense_test")
          .in("source_id", testIds)
          .order("assessed_at", { ascending: false })
          .limit(1);
        if (!ptsErr && pts && pts[0]) approved = { level: pts[0].level, assessed_at: pts[0].assessed_at };
      }
      // After the latest graded test, has a teacher acted? (Fails closed: a
      // lookup error leaves the child at 'submitted', never shows a level.)
      const graded = (tests || []).filter((t: any) => t.status === "graded");
      let discarded = false, setByTeacher = false;
      let teacherLevel: { level: string; assessed_at: string } | null = null;
      if (!approved && graded.length) {
        const last = graded[0];
        const gradedAt = String(last.updated_at || last.created_at || "");
        const [{ data: dr, error: drErr }, { data: manual, error: mErr }] = await Promise.all([
          sb.from("cefr_assessment_drafts").select("status, source_id")
            .eq("student_id", studentId).eq("source", "level_defense_test").in("source_id", graded.map((t: any) => t.id)),
          sb.from("cefr_assessments").select("level, assessed_at, created_at")
            .eq("student_id", studentId).eq("source", "manual")
            .order("created_at", { ascending: false }).limit(5),
        ]);
        discarded = !drErr && (dr || []).some((d: any) => d.source_id === last.id && d.status === "discarded");
        const m = mErr ? null : (manual || []).find((p: any) => String(p.created_at) > gradedAt);
        if (m) teacherLevel = { level: m.level, assessed_at: m.assessed_at };
        const relevelled = !!claim && claim.status === "unverified" && String(claim.updated_at || "") > gradedAt;
        setByTeacher = !!m || relevelled;
      }
      // The child's current level: the latest level a teacher approved or
      // set (cefr_assessments holds approved points only; model drafts wait
      // in cefr_assessment_drafts). Fails closed to none.
      let currentLevel: { level: string; assessed_at: string; source: string } | null = null;
      {
        const { data: cur, error: curErr } = await sb.from("cefr_assessments")
          .select("level, assessed_at, source")
          .eq("student_id", studentId)
          .order("assessed_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);
        if (!curErr && cur && cur[0]) currentLevel = { level: cur[0].level, assessed_at: cur[0].assessed_at, source: cur[0].source };
      }
      return respond({
        success: true,
        current_level: currentLevel,
        claim: claim
          ? { claimed_level: claim.claimed_level, status: childClaimStatus(tests || [], { approved: !!approved, setByTeacher, discarded }), evidence: null, evidence_checked_at: null }
          : null,
        tests: (tests || []).map(childTest),
        approved_level: approved,
        teacher_level: teacherLevel,
        defense,
        portfolio: ev.portfolio,
        standardized: childStandardized(ev.standardized),
      });
    }

    // ── submit_stage ─────────────────────────────────────────────────────
    if (action === "submit_stage") {
      const testId = String(body.test_id || "");
      const answers: Array<{ item_id: string; answer: number | string }> =
        Array.isArray(body.answers) ? body.answers : [];
      const { data: test } = await sb
        .from("cefr_defense_tests").select("*").eq("id", testId).maybeSingle();
      if (!test) return respond({ success: false, error: "Test not found" }, 404);
      const staffView = await staffHolds(test.student_id);
      if (!staffView && ownStudent?.id !== test.student_id) {
        return respond({ success: false, error: "Not your test" }, 403);
      }
      if (test.status === "graded") return respond({ success: false, error: "Already graded" }, 400);

      const stages: any[] = Array.isArray(test.stages) ? test.stages : [];
      const stage = stages[test.current_stage - 1];
      if (!stage) return respond({ success: false, error: "Stage missing" }, 500);
      { const limited = overSpend(); if (limited) return limited; }

      // Grade the MCQs server-side.
      const answerMap = new Map(answers.map((a) => [String(a.item_id), a.answer]));
      let correct = 0;
      const itemResults = (stage.items || []).map((it: any) => {
        const given = Number(answerMap.get(it.id));
        const isCorrect = Number.isInteger(given) && given === it.correct_index;
        if (isCorrect) correct++;
        return { item_id: it.id, given: Number.isInteger(given) ? given : null, correct: isCorrect, skill: it.skill };
      });
      const score = (stage.items || []).length ? correct / stage.items.length : 0;
      const writingAnswers = (stage.writing_tasks || []).map((w: any) => ({
        task_id: w.id,
        prompt: w.prompt,
        text: String(answerMap.get(w.id) ?? "").slice(0, 3000),
      }));

      const responses = [...(Array.isArray(test.responses) ? test.responses : []), {
        stage: test.current_stage,
        level: stage.level,
        mcq: itemResults,
        score,
        writing: writingAnswers,
        submitted_at: new Date().toISOString(),
      }];

      // ── Route / finalize ───────────────────────────────────────────────
      if (test.current_stage < 3) {
        const cur = levelIdx(stage.level);
        const nextLevel =
          score >= 0.75 ? clampLevel(cur + 1) : score <= 0.375 ? clampLevel(cur - 1) : clampLevel(cur);
        const { data: studentRow } = await sb
          .from("students").select("date_of_birth").eq("id", test.student_id).maybeSingle();
        const age = studentRow?.date_of_birth
          ? Math.floor((Date.now() - new Date(studentRow.date_of_birth).getTime()) / 31_557_600_000)
          : null;
        const priorPrompts = stages.flatMap((s: any) => (s.items || []).map((i: any) => String(i.prompt).slice(0, 80)));
        const nextStage = await generateStage(key, test.current_stage + 1, nextLevel, age, priorPrompts);

        const { data: updated, error } = await sb
          .from("cefr_defense_tests")
          .update({
            stages: [...stages, nextStage],
            responses,
            current_stage: test.current_stage + 1,
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", testId).select("*").single();
        if (error) throw error;
        return staffView
          ? respond({ success: true, test: sanitizeTest(updated), stage_score: score })
          : respond({ success: true, test: childTest(updated) });
      }

      // Stage 3 submitted — grade writing + synthesize the final estimate.
      const performance = responses.map((r: any) =>
        `Stage ${r.stage} at ${r.level}: ${Math.round(r.score * 100)}% MCQ` +
        (r.writing?.length
          ? `\nWriting:\n${r.writing.map((w: any) => `PROMPT: ${w.prompt}\nSTUDENT WROTE: ${w.text || "(blank)"}`).join("\n---\n")}`
          : ""),
      ).join("\n\n");

      const result = await openaiJson(key, {
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are grading a multistage adaptive CEFR defense test.\n\n" + CEFR_DESCRIPTORS +
              "\n\nMETHOD:\n" +
              "1. Grade each writing sample against the CEFR writing descriptors for the stage's level: " +
              "range, accuracy, coherence, task fulfilment. Quote from the student's text.\n" +
              "2. Combine: the level where the student scored ~solidly (≥60%) on MCQs, adjusted by the " +
              "routing path (climbing = stronger; dropping = weaker), and the writing band. Writing " +
              "caps the estimate: nobody exceeds their writing band by more than one level.\n" +
              "3. Be honest — this defends (or not) a claimed level of " + `${test.target_level}.\n\n` +
              'Return JSON: {"level_estimate": one of ' + JSON.stringify(LEVELS) + ", " +
              '"defended": boolean (does the estimate reach the claimed level?), ' +
              '"confidence": number 0-1, ' +
              '"writing_assessment": [{"task_id": string, "band": string, "comment": string (with a quote)}], ' +
              '"skill_notes": {"grammar": string, "vocabulary": string, "reading": string, "writing": string}, ' +
              '"rationale": string (4-6 sentences, parent-readable), ' +
              '"next_steps": [string] (2-3 concrete study steps)}',
          },
          { role: "user", content: `Claimed level: ${test.target_level}\n\n${performance}` },
        ],
      }, "final grading");

      const estimate = LEVELS.includes(result.level_estimate) ? result.level_estimate : test.target_level;
      const defended = typeof result.defended === "boolean"
        ? result.defended
        : levelIdx(estimate) >= levelIdx(test.target_level);

      const { data: graded, error: gradeErr } = await sb
        .from("cefr_defense_tests")
        .update({ responses, result: { ...result, level_estimate: estimate, defended }, status: "graded", updated_at: new Date().toISOString() })
        .eq("id", testId).select("*").single();
      if (gradeErr) throw gradeErr;

      // The claim's status is the WHOLE case - standardized results, levels
      // teachers approved, this test, the evidence audit - not the test alone.
      let caseDefended = defended;
      try {
        const { data: claimNow } = await sb.from("cefr_level_claims").select("*").eq("id", test.claim_id).maybeSingle();
        if (claimNow) {
          const ev = await loadEvidence(sb, test.student_id);
          const theCase = caseFor(claimNow, ev, [graded]);
          if (typeof theCase.defended === "boolean") caseDefended = theCase.defended;
          const { error: cErr } = await sb.from("cefr_level_claims")
            .update({ portfolio: ev.portfolio, case_summary: theCase }).eq("id", test.claim_id);
          if (cErr) console.error("cefr-defense: case not saved:", cErr.message);
        }
      } catch (e) {
        console.error("cefr-defense: case not built:", (e as Error).message);
      }
      await sb.from("cefr_level_claims")
        .update({ status: caseDefended ? "defended" : "not_defended", updated_at: new Date().toISOString() })
        .eq("id", test.claim_id);

      await saveDraft(sb, {
        student_id: test.student_id,
        class_id: test.class_id,
        source: "level_defense_test",
        source_id: testId,
        level: estimate,
        confidence: result.confidence,
        evidence: result.rationale,
        requested_by: user.id,
      });

      return staffView
        ? respond({ success: true, test: sanitizeTest(graded), stage_score: score })
        : respond({ success: true, test: childTest(graded), message: CHILD_SUBMITTED });
    }

    return respond({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("cefr-defense error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
