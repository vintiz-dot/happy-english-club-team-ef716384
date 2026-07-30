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
 *   defended = estimate reaches the claimed level. Feeds cefr_assessments.
 *
 * Anti-cheat: generated items (with answer keys) live only in the
 * `stages` JSONB, which students cannot SELECT (no RLS policy). This
 * function serves SANITIZED items and grades server-side.
 *
 * Input:  { action, ...params } — see handlers.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { safeParseJson } from "../_lib/text.ts";

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

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return respond({ success: false, error: "Unauthorized" }, 401);

    const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    const roles = new Set((roleRows || []).map((r: any) => r.role));
    const isStaff = roles.has("admin") || roles.has("teacher");

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return respond({ success: false, error: "OPENAI_API_KEY is not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

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
      const { data: claim, error } = await sb
        .from("cefr_level_claims")
        .upsert(
          {
            student_id: studentId,
            class_id: body.class_id || null,
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
      const { data: claim } = await sb
        .from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle();
      if (!claim) return respond({ success: false, error: "Set a level first" }, 404);

      const [{ data: metricsRows }, { data: errRows }, { data: vocabRows }, { data: histRows }, { data: profileRow }, { data: studentRow }] =
        await Promise.all([
          sb.from("transcript_speaker_metrics")
            .select("word_count, distinct_words, questions_asked, cefr_estimate, highlights, contribution, created_at")
            .eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
          sb.from("student_error_log")
            .select("error_text, corrected_text, error_type, created_at")
            .eq("student_id", studentId).order("created_at", { ascending: false }).limit(30),
          sb.from("student_vocabulary_entries")
            .select("word").eq("student_id", studentId).order("created_at", { ascending: false }).limit(60),
          sb.from("cefr_assessments")
            .select("level, source, assessed_at").eq("student_id", studentId)
            .order("assessed_at", { ascending: false }).limit(10),
          sb.from("student_learning_profiles")
            .select("journey_summary").eq("student_id", studentId).maybeSingle(),
          sb.from("students").select("full_name, date_of_birth").eq("id", studentId).maybeSingle(),
        ]);

      const dossier = [
        `CLAIMED LEVEL: ${claim.claimed_level}`,
        `Student: ${studentRow?.full_name || "unknown"}${studentRow?.date_of_birth ? `, born ${studentRow.date_of_birth}` : ""}`,
        (histRows || []).length
          ? `Assessment history: ${(histRows || []).map((h: any) => `${h.level} (${h.source}, ${String(h.assessed_at).slice(0, 10)})`).join("; ")}`
          : "Assessment history: none",
        (metricsRows || []).length
          ? `Recent lesson speech metrics:\n${(metricsRows || [])
              .map((m: any) => `- ${String(m.created_at).slice(0, 10)}: ${m.word_count} words, ${m.distinct_words} distinct, ${m.questions_asked} questions, AI est. ${m.cefr_estimate || "?"}. ${m.contribution ? String(m.contribution).slice(0, 150) : ""}`)
              .join("\n")}`
          : "No transcript speech data yet.",
        (errRows || []).length
          ? `Logged errors (verbatim → correction):\n${(errRows || [])
              .map((e: any) => `- [${e.error_type}] "${String(e.error_text).slice(0, 100)}" → "${String(e.corrected_text).slice(0, 100)}"`)
              .join("\n")}`
          : "No logged errors.",
        `Vocabulary bank: ${(vocabRows || []).length} recent words${(vocabRows || []).length ? ` — ${(vocabRows || []).slice(0, 40).map((v: any) => v.word).join(", ")}` : ""}`,
        profileRow?.journey_summary ? `Learning journey summary: ${String(profileRow.journey_summary).slice(0, 800)}` : "",
      ].filter(Boolean).join("\n\n").slice(0, 9000);

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
              "2. Weigh production evidence (their actual utterances/errors) above counts and above " +
              "any earlier AI estimate.\n" +
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

      // Feed the growth chart when the audit is conclusive.
      if (verdict.recommended_level && LEVELS.includes(verdict.recommended_level) && verdict.verdict !== "insufficient_evidence") {
        await sb.from("cefr_assessments").insert({
          student_id: studentId,
          class_id: claim.class_id,
          level: verdict.recommended_level,
          level_score: levelIdx(verdict.recommended_level),
          confidence: typeof verdict.confidence === "number" ? verdict.confidence : null,
          source: "level_defense_evidence",
          evidence: String(verdict.rationale || "").slice(0, 1000),
          created_by: user.id,
        });
      }

      return respond({ success: true, verdict, status });
    }

    // ── generate_test ────────────────────────────────────────────────────
    if (action === "generate_test") {
      if (!isStaff) return respond({ success: false, error: "Teachers/admins only" }, 403);
      const studentId = String(body.student_id || "");
      const { data: claim } = await sb
        .from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle();
      if (!claim) return respond({ success: false, error: "Set a level first" }, 404);

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

      return respond({ success: true, test: sanitizeTest(test) });
    }

    // ── get_state ────────────────────────────────────────────────────────
    if (action === "get_state") {
      const studentId = String(body.student_id || ownStudent?.id || "");
      if (!studentId) return respond({ success: false, error: "No student in scope" }, 400);
      if (!isStaff && ownStudent?.id !== studentId) {
        return respond({ success: false, error: "Not your record" }, 403);
      }
      const [{ data: claim }, { data: tests }] = await Promise.all([
        sb.from("cefr_level_claims").select("*").eq("student_id", studentId).maybeSingle(),
        sb.from("cefr_defense_tests").select("*").eq("student_id", studentId)
          .order("created_at", { ascending: false }).limit(3),
      ]);
      return respond({
        success: true,
        claim: claim
          ? {
              claimed_level: claim.claimed_level,
              status: claim.status,
              evidence: isStaff ? claim.evidence : (claim.evidence ? { verdict: claim.evidence.verdict, rationale: claim.evidence.rationale } : null),
              evidence_checked_at: claim.evidence_checked_at,
            }
          : null,
        tests: (tests || []).map(sanitizeTest),
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
      if (!isStaff && ownStudent?.id !== test.student_id) {
        return respond({ success: false, error: "Not your test" }, 403);
      }
      if (test.status === "graded") return respond({ success: false, error: "Already graded" }, 400);

      const stages: any[] = Array.isArray(test.stages) ? test.stages : [];
      const stage = stages[test.current_stage - 1];
      if (!stage) return respond({ success: false, error: "Stage missing" }, 500);

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
        return respond({ success: true, test: sanitizeTest(updated), stage_score: score });
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

      await sb.from("cefr_level_claims")
        .update({ status: defended ? "defended" : "not_defended", updated_at: new Date().toISOString() })
        .eq("id", test.claim_id);

      await sb.from("cefr_assessments").insert({
        student_id: test.student_id,
        class_id: test.class_id,
        level: estimate,
        level_score: levelIdx(estimate),
        confidence: typeof result.confidence === "number" ? result.confidence : null,
        source: "level_defense_test",
        source_id: testId,
        evidence: String(result.rationale || "").slice(0, 1000),
        created_by: user.id,
      });

      return respond({ success: true, test: sanitizeTest(graded), stage_score: score });
    }

    return respond({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("cefr-defense error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
