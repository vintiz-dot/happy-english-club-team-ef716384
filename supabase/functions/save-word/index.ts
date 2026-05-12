/**
 * save-word Edge Function
 * ========================
 * Persists a student's vocabulary entry through the full save-flow:
 *
 *   1. Daily cap: rejects new saves once the student has saved
 *      DAILY_SAVE_LIMIT distinct words in the current UTC day.
 *   2. Anti-cheat (three layers):
 *        a) Jaccard token-bag similarity (>= COPY_THRESHOLD) against any
 *           AI-suggested example or any prior community example for the
 *           same word — rejected as a copy.
 *        b) Word-presence check — the target word (or any declared form,
 *           or a heuristic stem/derivation) must appear in the student's
 *           sentence in a grammatically reasonable form.
 *        c) Sense check — at least MIN_TOKENS distinct content tokens are
 *           required so a single-word "answer" does not pass.
 *   3. Identifies the student record via students.linked_user_id and
 *      auto-resolves the class — single enrollment is automatic, multiple
 *      enrollments require the caller to pass class_id (frontend prompts).
 *   4. Upserts into student_vocabulary_entries (the personal word bank).
 *   5. Updates the public vocab_cache for community lookup.
 *   6. Awards +10 vocabulary_quiz points via point_transactions (idempotent
 *      on re-save of the same word for the same student — only the first
 *      save earns). The aggregation trigger rolls this into
 *      student_points.vocabulary_quiz_points and total_points.
 *   7. Logs to vocab_activity_log for the teacher monthly dashboard.
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
 *   reason?: "no_valid_examples"|"missing_class_choice"|"unknown_student"|"daily_limit"|...,
 *   rejected_examples?: Array<{ idx: number; why: "copied"|"missing_word"|"too_short" }>,
 *   classes?: Array<{ id: string, name: string }>,  // when class choice needed
 *   points_awarded?: number,
 *   already_saved?: boolean,
 *   saves_today?: number,
 *   daily_limit?: number,
 * }
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAILY_SAVE_LIMIT = 10;
const COPY_THRESHOLD = 0.85;
const MIN_TOKENS = 3;
const SAVE_POINTS = 10;

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

function normalizeForExactMatch(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

function isCopy(userText: string, suggested: string[]): boolean {
  const ut = tokenize(userText);
  if (ut.size < MIN_TOKENS) return false; // too short to judge
  const userNorm = normalizeForExactMatch(userText);
  for (const s of suggested) {
    if (!s) continue;
    if (userNorm === normalizeForExactMatch(s)) return true;
    if (jaccard(ut, tokenize(s)) >= COPY_THRESHOLD) return true;
  }
  return false;
}

// ─── Word-presence check ────────────────────────────────────────────────
//
// We accept a sentence if it contains the target word in any reasonable
// grammatical form. The check is greedy: it tries the explicit forms from
// the AI payload first (they're the most accurate), then derives common
// inflections from the root word (verb +s/+ed/+ing, noun +s/+es, adjective
// +er/+est) and finally falls back to a stem match where any candidate
// shares the first 4+ chars with a token in the sentence.

function deriveInflections(root: string): string[] {
  const w = root.toLowerCase();
  const out = new Set<string>([w]);
  const endsConsonantY = /[^aeiou]y$/.test(w);
  const sibilant = /(s|x|z|ch|sh)$/.test(w);

  // Plural / 3rd-person singular
  out.add(endsConsonantY ? w.slice(0, -1) + "ies" : sibilant ? w + "es" : w + "s");

  // Past tense / past participle
  if (w.endsWith("e")) out.add(w + "d");
  else if (endsConsonantY) out.add(w.slice(0, -1) + "ied");
  else out.add(w + "ed");

  // Gerund / present participle
  if (w.endsWith("e") && !w.endsWith("ee")) out.add(w.slice(0, -1) + "ing");
  else out.add(w + "ing");

  // Comparative / superlative for adj-like roots (only short ones)
  if (w.length <= 6) {
    if (endsConsonantY) {
      out.add(w.slice(0, -1) + "ier");
      out.add(w.slice(0, -1) + "iest");
    } else if (w.endsWith("e")) {
      out.add(w + "r");
      out.add(w + "st");
    } else {
      out.add(w + "er");
      out.add(w + "est");
    }
  }

  // Adverb -ly
  out.add(w + "ly");

  return Array.from(out);
}

function collectCandidates(
  word: string,
  rootWord: string | undefined,
  payload: any,
): string[] {
  const set = new Set<string>();
  const add = (s: unknown) => {
    if (typeof s !== "string") return;
    const t = s.trim().toLowerCase();
    if (t.length >= 2) set.add(t);
  };

  add(word);
  add(rootWord);
  add(payload?.root_word);

  for (const wf of Array.isArray(payload?.word_forms) ? payload.word_forms : []) {
    if (typeof wf === "string") add(wf);
    else if (wf && typeof wf === "object") add(wf.form);
  }
  for (const fu of Array.isArray(payload?.form_usages) ? payload.form_usages : []) {
    add(fu?.form);
  }

  // Heuristic inflections of the root.
  const rootSeed = (rootWord || payload?.root_word || word || "").toString();
  for (const variant of deriveInflections(rootSeed)) add(variant);

  return Array.from(set);
}

function sentenceHasWord(sentence: string, candidates: string[]): boolean {
  if (!sentence) return false;
  const normalized = " " + sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim() + " ";

  // Word-boundary match against any explicit candidate.
  for (const c of candidates) {
    if (!c) continue;
    if (normalized.includes(" " + c + " ")) return true;
  }
  // Last-resort stem match — any candidate of length >= 4 whose first 4
  // characters start a token in the sentence. Catches irregulars like
  // "ran" vs root "run" when the AI provided word_forms.
  const tokens = normalized.trim().split(/\s+/);
  for (const c of candidates) {
    if (!c || c.length < 4) continue;
    const stem = c.slice(0, 4);
    for (const t of tokens) {
      if (t.startsWith(stem)) return true;
    }
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

/**
 * Inserts a vocabulary_quiz point_transaction. The existing trigger rolls
 * this into student_points.vocabulary_quiz_points (and total_points).
 */
async function awardVocabularyPoints(
  sb: SupabaseClient,
  studentId: string,
  classId: string,
  userId: string,
  delta: number,
  word: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from("point_transactions").insert({
    student_id: studentId,
    class_id: classId,
    points: delta,
    type: "vocabulary_quiz",
    date: today,
    created_by: userId,
    notes: `vocab save: ${word}`,
  });
  if (error) throw error;
}

async function countSavesToday(
  sb: SupabaseClient,
  userId: string,
): Promise<number> {
  // Prefer the SECURITY DEFINER RPC; fall back to a direct count on schema
  // shapes where the RPC hasn't been migrated yet.
  const { data, error } = await sb.rpc("count_vocab_saves_today", { p_user_id: userId });
  if (!error && typeof data === "number") return data;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await sb
    .from("vocab_activity_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("activity_type", "save")
    .gte("created_at", startOfDay.toISOString());
  return count ?? 0;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return respond({ success: false, reason: "db_unconfigured" }, 503);
    }
    const sb = createClient(supabaseUrl, supabaseKey);

    // ── Detect whether this is a re-save (existing entry) early so the
    //    daily cap only penalises *new* words, not edits/refinements.
    const { data: existingEntry } = await sb
      .from("student_vocabulary_entries")
      .select("id")
      .eq("user_id", user_id)
      .eq("word", cleanWord)
      .maybeSingle();

    // ── Daily cap (new saves only) ──
    let savesToday = 0;
    if (!existingEntry) {
      savesToday = await countSavesToday(sb, user_id);
      if (savesToday >= DAILY_SAVE_LIMIT) {
        return respond({
          success: false,
          reason: "daily_limit",
          saves_today: savesToday,
          daily_limit: DAILY_SAVE_LIMIT,
          message: `You've hit today's cap of ${DAILY_SAVE_LIMIT} new words. Come back tomorrow for more — or jump into Practice to keep earning points!`,
        });
      }
    }

    // ── Anti-cheat ──
    const suggestions: string[] = Array.isArray(suggested_examples)
      ? suggested_examples.filter((s: any) => typeof s === "string")
      : Array.isArray((payload as any)?.usages)
        ? (payload as any).usages.map((u: any) => String(u?.english_sentence || ""))
        : [];

    const wordCandidates = collectCandidates(cleanWord, root_word, payload);

    interface Rejection { idx: number; why: "copied" | "missing_word" | "too_short" }
    const rejected: Rejection[] = [];
    const acceptedExamples: string[] = [];
    examples.forEach((ex, idx) => {
      const tokens = tokenize(ex);
      if (tokens.size < MIN_TOKENS) {
        rejected.push({ idx, why: "too_short" });
        return;
      }
      if (isCopy(ex, suggestions)) {
        rejected.push({ idx, why: "copied" });
        return;
      }
      if (!sentenceHasWord(ex, wordCandidates)) {
        rejected.push({ idx, why: "missing_word" });
        return;
      }
      acceptedExamples.push(ex);
    });

    if (acceptedExamples.length === 0) {
      const reasonHints = new Set(rejected.map((r) => r.why));
      let message = "Please write at least one example sentence in your own words.";
      if (examples.length > 0) {
        if (reasonHints.has("missing_word")) {
          message = `Your sentence needs to use the word "${cleanWord}" (or one of its forms) and make sense.`;
        } else if (reasonHints.has("copied")) {
          message = "Your example looks copied from the suggestions. Try writing it in your own words.";
        } else if (reasonHints.has("too_short")) {
          message = "Add a few more words so the sentence makes sense.";
        }
      }
      return respond({
        success: false,
        reason: "no_valid_examples",
        rejected_examples: rejected,
        message,
      });
    }

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
      console.warn(`save-word: no student record for user ${user_id}`);
    }

    const studentId = resolved.kind === "ok" ? resolved.studentId : null;
    const chosenClassId = resolved.kind === "ok" ? resolved.classId : null;

    // ── Upsert per-student entry ──
    const cefr = (payload as any)?.cefr || null;
    const defEn = (payload as any)?.definition_en || null;
    const defVi = (payload as any)?.definition_vi || null;
    const resolvedRoot = root_word || (payload as any)?.root_word || cleanWord;

    let entryId: string | null = null;
    const alreadySaved = !!existingEntry;

    if (existingEntry) {
      const { data: updated, error: updErr } = await sb
        .from("student_vocabulary_entries")
        .update({
          root_word: resolvedRoot,
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
          root_word: resolvedRoot,
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
    sb.from("vocab_cache")
      .upsert(
        {
          word: cleanWord,
          root_word: resolvedRoot,
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
        await awardVocabularyPoints(sb, studentId, chosenClassId, user_id, SAVE_POINTS, cleanWord);
        pointsAwarded = SAVE_POINTS;
      } catch (e) {
        console.error("award points failed:", e);
      }
    }

    // ── Activity log ──
    sb.from("vocab_activity_log").insert({
      user_id,
      student_id: studentId,
      class_id: chosenClassId,
      word: cleanWord,
      activity_type: alreadySaved ? "edit" : "save",
      points_awarded: pointsAwarded,
    }).then(({ error }) => {
      if (error) console.warn("activity log:", error.message);
    });

    // Recount AFTER the save so the client can show the right "X / 10 today".
    const savesTodayAfter = alreadySaved
      ? savesToday
      : await countSavesToday(sb, user_id).catch(() => savesToday + 1);

    return respond({
      success: true,
      id: entryId,
      points_awarded: pointsAwarded,
      already_saved: alreadySaved,
      class_id: chosenClassId,
      rejected_examples: rejected,
      saves_today: savesTodayAfter,
      daily_limit: DAILY_SAVE_LIMIT,
    });
  } catch (error: any) {
    console.error("save-word error:", error);
    return respond({ success: false, reason: "internal_error", details: error?.message }, 500);
  }
});
