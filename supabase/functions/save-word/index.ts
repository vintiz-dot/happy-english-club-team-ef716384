/**
 * save-word Edge Function
 * ========================
 * Persists a student's vocabulary entry through the full save-flow:
 *
 *   1. Anti-cheat: rejects any user-supplied example that is a near-copy
 *      of one of the AI's suggested examples (Jaccard similarity on token
 *      bag, >= 0.85 == copy). At least one valid user example is required.
 *   2. Identifies the student record via students.linked_user_id and
 *      auto-resolves the class — single enrollment is automatic, multiple
 *      enrollments require the caller to pass class_id (frontend prompts).
 *   3. Upserts into student_vocabulary_entries (the personal word bank).
 *   4. Updates the public vocab_cache for community lookup.
 *   5. Awards +10 participation_points to the picked class (idempotent on
 *      re-save of the same word for the same student).
 *   6. Logs to vocab_activity_log for the teacher monthly dashboard.
 *
 * Input: {
 *   user_id: string,                  // auth.users.id (passed by frontend)
 *   word: string,
 *   root_word?: string,
 *   payload: WordEnrichmentPayload,   // full AI payload (cefr, examples, etc.)
 *   user_examples: string[],          // student-written examples (1..4)
 *   image_url?: string,
 *   class_id?: string,                // required if student in multiple classes
 *   suggested_examples?: string[],    // english_sentence values from payload
 * }
 *
 * Output: {
 *   success: boolean,
 *   id?: string,
 *   reason?: "no_valid_examples"|"missing_class_choice"|"unknown_student"|...,
 *   rejected_examples?: number[],     // indices of user_examples that copied
 *   classes?: Array<{ id: string, name: string }>,  // when class choice needed
 *   points_awarded?: number,
 *   already_saved?: boolean,
 * }
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Anti-cheat: token-bag similarity ────────────────────────────────────

function tokenize(s: string): Set<string> {
  return new Set(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function isCopy(userText: string, suggested: string[]): boolean {
  const ut = tokenize(userText);
  if (ut.size < 3) return false; // too short to judge
  for (const s of suggested) {
    const st = tokenize(s);
    if (st.size === 0) continue;
    // Exact match (case-insensitive, ignoring punctuation) always rejected.
    if (userText.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "") ===
        s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "")) {
      return true;
    }
    if (jaccard(ut, st) >= 0.85) return true;
  }
  return false;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function currentMonthIso(): string {
  // student_points.month is typically YYYY-MM-01
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
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

async function awardParticipationPoints(
  sb: SupabaseClient,
  studentId: string,
  classId: string,
  delta: number,
): Promise<void> {
  const month = currentMonthIso();
  // Fetch existing row (or null) — student_points uses (student_id, class_id, month) as natural key.
  const { data: existing } = await sb
    .from("student_points")
    .select("id, participation_points")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("month", month)
    .maybeSingle();

  if (existing) {
    await sb
      .from("student_points")
      .update({
        participation_points: (existing.participation_points ?? 0) + delta,
      })
      .eq("id", existing.id);
  } else {
    await sb.from("student_points").insert({
      student_id: studentId,
      class_id: classId,
      month,
      participation_points: delta,
    });
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      user_id,
      word,
      root_word,
      payload,
      user_examples,
      image_url,
      class_id,
      suggested_examples,
    } = body;

    if (!user_id || typeof user_id !== "string") {
      return respond({ success: false, reason: "missing_user_id" }, 400);
    }
    if (!word || typeof word !== "string") {
      return respond({ success: false, reason: "missing_word" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return respond({ success: false, reason: "missing_payload" }, 400);
    }

    const cleanWord = word.trim().toLowerCase();
    const examples: string[] = Array.isArray(user_examples)
      ? user_examples.map((e: any) => String(e || "").trim()).filter(Boolean)
      : [];

    // ── Anti-cheat ──
    const suggestions: string[] = Array.isArray(suggested_examples)
      ? suggested_examples.filter((s: any) => typeof s === "string")
      : Array.isArray((payload as any)?.usages)
        ? (payload as any).usages.map((u: any) => String(u?.english_sentence || ""))
        : [];

    const rejectedExamples: number[] = [];
    const acceptedExamples: string[] = [];
    examples.forEach((ex, idx) => {
      if (isCopy(ex, suggestions)) {
        rejectedExamples.push(idx);
      } else {
        acceptedExamples.push(ex);
      }
    });

    if (acceptedExamples.length === 0) {
      return respond({
        success: false,
        reason: "no_valid_examples",
        rejected_examples: rejectedExamples,
        message: examples.length === 0
          ? "Please write at least one example sentence in your own words."
          : "Your example looks copied from the suggestions. Try writing it in your own words.",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return respond({ success: false, reason: "db_unconfigured" }, 503);
    }
    const sb = createClient(supabaseUrl, supabaseKey);

    // ── Resolve student + class ──
    const resolved = await resolveStudentAndClass(sb, user_id, class_id);
    if (resolved.kind === "need_class") {
      return respond({
        success: false,
        reason: "missing_class_choice",
        classes: resolved.classes,
        message: "You're in multiple classes. Pick which class earns the points.",
      });
    }
    if (resolved.kind === "unknown_student") {
      // Student record not linked yet — proceed without points, save still works.
      console.warn(`save-word: no student record for user ${user_id}`);
    }

    const studentId = resolved.kind === "ok" ? resolved.studentId : null;
    const chosenClassId = resolved.kind === "ok" ? resolved.classId : null;

    // ── Upsert per-student entry ──
    const cefr = (payload as any)?.cefr || null;
    const defEn = (payload as any)?.definition_en || null;
    const defVi = (payload as any)?.definition_vi || null;

    const { data: existingEntry } = await sb
      .from("student_vocabulary_entries")
      .select("id")
      .eq("user_id", user_id)
      .eq("word", cleanWord)
      .maybeSingle();

    let entryId: string | null = null;
    let alreadySaved = false;

    if (existingEntry) {
      alreadySaved = true;
      const { data: updated, error: updErr } = await sb
        .from("student_vocabulary_entries")
        .update({
          root_word: root_word || (payload as any)?.root_word || cleanWord,
          cefr,
          definition_en: defEn,
          definition_vi: defVi,
          user_examples: acceptedExamples,
          enrichment: payload,
          image_url: image_url || null,
          student_id: studentId,
          class_id: chosenClassId,
        })
        .eq("id", existingEntry.id)
        .select("id")
        .single();
      if (updErr) {
        console.error("entry update error:", updErr);
        return respond({ success: false, reason: "entry_update_failed", details: updErr.message }, 500);
      }
      entryId = updated.id;
    } else {
      const { data: inserted, error: insErr } = await sb
        .from("student_vocabulary_entries")
        .insert({
          user_id,
          student_id: studentId,
          class_id: chosenClassId,
          word: cleanWord,
          root_word: root_word || (payload as any)?.root_word || cleanWord,
          cefr,
          definition_en: defEn,
          definition_vi: defVi,
          user_examples: acceptedExamples,
          enrichment: payload,
          image_url: image_url || null,
        })
        .select("id")
        .single();
      if (insErr) {
        console.error("entry insert error:", insErr);
        return respond({ success: false, reason: "entry_insert_failed", details: insErr.message }, 500);
      }
      entryId = inserted.id;
    }

    // ── Refresh vocab_cache (community lookup) ──
    await sb
      .from("vocab_cache")
      .upsert(
        {
          word: cleanWord,
          root_word: root_word || (payload as any)?.root_word || cleanWord,
          payload,
          image_urls: image_url ? { picked: image_url } : null,
        },
        { onConflict: "word" },
      )
      .then(({ error }) => {
        if (error) console.warn("vocab_cache upsert:", error.message);
      });

    // ── Award points (only first save earns) ──
    let pointsAwarded = 0;
    if (!alreadySaved && studentId && chosenClassId) {
      try {
        await awardParticipationPoints(sb, studentId, chosenClassId, 10);
        pointsAwarded = 10;
      } catch (e) {
        console.error("award points failed:", e);
      }
    }

    // ── Activity log ──
    await sb.from("vocab_activity_log").insert({
      user_id,
      student_id: studentId,
      class_id: chosenClassId,
      word: cleanWord,
      activity_type: alreadySaved ? "edit" : "save",
      points_awarded: pointsAwarded,
    }).then(({ error }) => {
      if (error) console.warn("activity log:", error.message);
    });

    return respond({
      success: true,
      id: entryId,
      points_awarded: pointsAwarded,
      already_saved: alreadySaved,
      class_id: chosenClassId,
      rejected_examples: rejectedExamples,
    });
  } catch (error: any) {
    console.error("save-word error:", error);
    return respond({ success: false, reason: "internal_error", details: error?.message }, 500);
  }
});
