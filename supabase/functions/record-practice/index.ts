/**
 * record-practice Edge Function
 * ===============================
 * Records a single practice answer for a vocabulary word. Awards +20
 * `vocabulary_quiz` points on a correct answer via point_transactions —
 * the aggregation trigger then rolls this into
 * student_points.vocabulary_quiz_points and student_points.total_points.
 *
 * Idempotency: practice attempts are append-only (the activity log is a
 * historical record). Points stack up across attempts.
 *
 * Input: {
 *   user_id: string,
 *   word: string,
 *   correct: boolean,
 *   class_id?: string,    // optional override for multi-class students
 * }
 *
 * Output: {
 *   success: boolean,
 *   points_awarded: number,
 *   class_id?: string,
 *   reason?: "missing_class_choice"|"unknown_student"|...,
 *   classes?: Array<{ id: string; name: string }>,
 * }
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CORRECT_POINTS = 20;

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function awardVocabularyPoints(
  sb: SupabaseClient,
  studentId: string,
  classId: string,
  userId: string,
  delta: number,
  word: string | null,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("point_transactions").insert({
    student_id: studentId,
    class_id: classId,
    points: delta,
    type: "vocabulary_quiz",
    date: today,
    created_by: userId,
    notes: word ? `vocab practice: ${word}` : "vocab practice",
  });
  if (error) throw error;
}

async function resolveStudentAndClass(
  sb: SupabaseClient,
  userId: string,
  classIdHint: string | undefined,
): Promise<
  | { kind: "ok"; studentId: string; classId: string | null; classes: Array<{ id: string; name: string }> }
  | { kind: "need_class"; classes: Array<{ id: string; name: string }> }
  | { kind: "unknown_student" }
> {
  const { data: student } = await sb
    .from("students")
    .select("id")
    .eq("linked_user_id", userId)
    .maybeSingle();
  if (!student) return { kind: "unknown_student" };

  const today = new Date().toISOString().slice(0, 10);
  const { data: enrolls } = await sb
    .from("enrollments")
    .select("class_id, classes!inner(id, name, is_active)")
    .eq("student_id", student.id)
    .or(`end_date.is.null,end_date.gte.${today}`);

  const activeClasses: Array<{ id: string; name: string }> = (enrolls || [])
    .map((e: any) => e.classes)
    .filter((c: any) => c && c.is_active)
    .map((c: any) => ({ id: c.id, name: c.name }));

  if (activeClasses.length === 0) {
    return { kind: "ok", studentId: student.id, classId: null, classes: [] };
  }
  if (activeClasses.length === 1) {
    return { kind: "ok", studentId: student.id, classId: activeClasses[0].id, classes: activeClasses };
  }
  if (classIdHint && activeClasses.some((c) => c.id === classIdHint)) {
    return { kind: "ok", studentId: student.id, classId: classIdHint, classes: activeClasses };
  }
  return { kind: "need_class", classes: activeClasses };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { user_id, word, correct, class_id } = await req.json().catch(() => ({}));

    if (!user_id || typeof user_id !== "string") {
      return respond({ success: false, reason: "missing_user_id" }, 400);
    }
    if (typeof correct !== "boolean") {
      return respond({ success: false, reason: "missing_correct" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return respond({ success: false, reason: "db_unconfigured" }, 503);
    }
    const sb = createClient(supabaseUrl, supabaseKey);

    const resolved = await resolveStudentAndClass(sb, user_id, class_id);
    if (resolved.kind === "need_class") {
      return respond({
        success: false,
        reason: "missing_class_choice",
        classes: resolved.classes,
        message: "You're in multiple classes. Pick which class earns the points.",
      });
    }

    const studentId = resolved.kind === "ok" ? resolved.studentId : null;
    const chosenClassId = resolved.kind === "ok" ? resolved.classId : null;
    const cleanWord = typeof word === "string" ? word.trim().toLowerCase() : null;

    let pointsAwarded = 0;
    if (correct && studentId && chosenClassId) {
      try {
        await awardVocabularyPoints(sb, studentId, chosenClassId, user_id, CORRECT_POINTS, cleanWord);
        pointsAwarded = CORRECT_POINTS;
      } catch (e) {
        console.error("award points failed:", e);
      }
    }

    sb.from("vocab_activity_log").insert({
      user_id,
      student_id: studentId,
      class_id: chosenClassId,
      word: cleanWord,
      activity_type: correct ? "practice_correct" : "practice_incorrect",
      points_awarded: pointsAwarded,
    }).then(({ error }) => {
      if (error) console.warn("activity log:", error.message);
    });

    return respond({
      success: true,
      points_awarded: pointsAwarded,
      class_id: chosenClassId,
    });
  } catch (error: any) {
    console.error("record-practice error:", error);
    return respond({ success: false, reason: "internal_error", details: error?.message }, 500);
  }
});
