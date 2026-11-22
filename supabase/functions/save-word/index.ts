/**
 * save-word Edge Function
 * ========================
 * Persists a student's vocabulary entry through the full save-flow:
 *
 *   1. Daily cap: rejects new saves once the student has saved
 *      DAILY_SAVE_LIMIT distinct words on the current HANOI day. The cap is
 *      the database's (vocab_claim_daily_save, 20261122150000): it locks the
 *      account and claims a slot, so parallel taps cannot all pass a count
 *      taken before any of them saved. A cheap count first stops a capped
 *      child before any model call is paid for.
 *   2. Anti-cheat (three layers):
 *        a) Jaccard token-bag similarity (>= COPY_THRESHOLD) against any
 *           AI-suggested example or any prior community example for the
 *           same word — rejected as a copy.
 *        b) Word-presence check — the target word (or any declared form,
 *           or a heuristic stem/derivation) must appear in the student's
 *           sentence in a grammatically reasonable form.
 *        c) Sense check — at least MIN_TOKENS distinct content tokens are
 *           required so a single-word "answer" does not pass.
 *   2b. Claude check (one cheap call, `_lib/claude-cheap.ts`, Haiku): the
 *      word's CEFR level in the sense used, and whether each sentence uses the
 *      word with the right meaning. Only sentences that passed the free checks
 *      are sent. A NEW word outside the child's level band is rejected
 *      (`_lib/vocab-level.ts` decides, from the level; the model does not).
 *      The level is taken from the shared vocab_cache first, so a word whose
 *      level is already known and wrong for the child is refused without any
 *      call. If the checker is unavailable, the free checks alone decide.
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
 * AUTH: requires a signed-in user holding a role (requireSpender). The
 * student is the CALLER — identity is taken from the JWT, never from the
 * body. Passing a `user_id` field has no effect; it is ignored.
 *
 * Input: {
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
import { requireSpender, type SpendGate } from "../_lib/ai-gate.ts";
import { askClaudeCheap } from "../_lib/claude-cheap.ts";
import {
  baseLevel, CHECK_SCHEMA, CHECK_SYSTEM, checkPrompt, levelMessage, levelVerdict, readCheck,
  type BaseLevel, type CheckReading,
} from "../_lib/vocab-level.ts";

// Each save may cost one small Claude call; the day's cap holds new words to
// 10, and this holds edits and refused attempts to a sane rate per account.
const GATE: SpendGate = { name: "save-word", limit: 30, windowMs: 10 * 60_000 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAILY_SAVE_LIMIT = 10;
const COPY_THRESHOLD = 0.85;
const MIN_TOKENS = 3;
const SAVE_POINTS = 10;
const MAX_POINTS_PER_WORD = 30;

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

async function getWordPointsEarned(
  sb: SupabaseClient,
  studentId: string,
  word: string,
): Promise<number> {
  const { data } = await sb
    .from("point_transactions")
    .select("points")
    .eq("student_id", studentId)
    .eq("type", "vocabulary_quiz")
    .or(`notes.eq.vocab save: ${word},notes.eq.vocab practice: ${word}`);
  return (data || []).reduce((sum: number, r: any) => sum + (r.points || 0), 0);
}

async function countSavesToday(
  sb: SupabaseClient,
  userId: string,
): Promise<number> {
  // Reads the claims on the Hanoi day (20261122150000). Before that migration
  // the RPC read the activity log on the UTC day; either way a failure reads 0
  // here and the atomic claim below still holds the cap.
  const { data, error } = await sb.rpc("count_vocab_saves_today", { p_user_id: userId });
  if (!error && typeof data === "number") return data;
  return 0;
}

type Claim = { ok: boolean; saves_today: number; limit: number; reused?: boolean };

/**
 * Claims one of today's slots for this word, atomically. null when the
 * migration is not in yet (the function is missing): the caller then falls
 * back to the old count, so a deploy ahead of the paste still saves.
 */
async function claimDailySave(sb: SupabaseClient, userId: string, word: string): Promise<Claim | null> {
  const { data, error } = await sb.rpc("vocab_claim_daily_save", {
    p_user_id: userId, p_word: word, p_limit: DAILY_SAVE_LIMIT,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return null;
    throw new Error(`the daily cap could not be checked: ${error.message}`);
  }
  return data as Claim;
}

async function releaseDailySave(sb: SupabaseClient, userId: string, word: string) {
  const { error } = await sb.rpc("vocab_release_daily_save", { p_user_id: userId, p_word: word });
  if (error) console.warn("save-word: releasing the day's slot failed:", error.message);
}

/** The child's level: latest assessed level, else the profile's, else A1. */
async function studentLevel(sb: SupabaseClient, userId: string, studentId: string | null): Promise<BaseLevel> {
  if (studentId) {
    const { data } = await sb.from("cefr_assessments")
      .select("level").eq("student_id", studentId)
      .order("assessed_at", { ascending: false }).order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    const lv = baseLevel(data?.level);
    if (lv) return lv;
  }
  const { data: prof } = await sb.from("profiles").select("cefr_level").eq("id", userId).maybeSingle();
  return baseLevel(prof?.cefr_level) ?? "A1";
}

/** The shared, server-made enrichment for a plain look-up of this word, if any. */
async function cachedEnrichment(sb: SupabaseClient, word: string): Promise<any | null> {
  const { data } = await sb.from("vocab_cache").select("payload").eq("word", word).maybeSingle();
  const p = data?.payload;
  return p && typeof p === "object" && typeof p.definition_en === "string" ? p : null;
}

// ─── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Who is asking, before anything is read or spent. Identity comes from the
  // verified JWT, never the body: body.user_id is ignored entirely.
  const caller = await requireSpender(req, corsHeaders, GATE);
  if (caller instanceof Response) return caller;
  const user_id = caller.userId as string;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      word,
      root_word,
      payload,
      user_examples,
      image_url,
      class_id,
      suggested_examples,
    } = body;

    if (!word || typeof word !== "string") {
      return respond({ success: false, reason: "missing_word" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return respond({ success: false, reason: "missing_payload" }, 400);
    }

    const cleanWord = word.trim().toLowerCase();
    if (cleanWord.length > 60) {
      return respond({ success: false, reason: "missing_word", message: "A word is at most 60 letters." }, 400);
    }
    const examples: string[] = Array.isArray(user_examples)
      ? user_examples.slice(0, 4).map((e: any) => String(e || "").trim().slice(0, 300)).filter(Boolean)
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
      .select("id, root_word, cefr, definition_en, definition_vi, enrichment, student_id, class_id")
      .eq("user_id", user_id)
      .eq("word", cleanWord)
      .maybeSingle();

    // ── Daily cap, cheap first look (new saves only): a capped child is
    //    refused before any model call. The atomic claim below decides.
    let savesToday = 0;
    const capReply = (n: number) => respond({
      success: false,
      reason: "daily_limit",
      saves_today: n,
      daily_limit: DAILY_SAVE_LIMIT,
      message: `You've hit today's cap of ${DAILY_SAVE_LIMIT} new words. Come back tomorrow for more — or jump into Practice to keep earning points!`,
    });
    if (!existingEntry) {
      savesToday = await countSavesToday(sb, user_id);
      if (savesToday >= DAILY_SAVE_LIMIT) return capReply(savesToday);
    }

    // ── Anti-cheat (free checks) ──
    // An edit is checked against the entry's own stored enrichment.
    const formsFrom: any = existingEntry?.enrichment ?? payload;
    const suggestions: string[] = [
      ...(Array.isArray(suggested_examples) ? suggested_examples.filter((s: any) => typeof s === "string") : []),
      ...(Array.isArray(formsFrom?.usages) ? formsFrom.usages.map((u: any) => String(u?.english_sentence || "")) : []),
    ];

    const wordCandidates = collectCandidates(cleanWord, existingEntry?.root_word || root_word, formsFrom);

    interface Rejection { idx: number; why: "copied" | "missing_word" | "too_short" | "not_right"; reason?: string }
    const rejected: Rejection[] = [];
    const passedFree: Array<{ idx: number; text: string }> = [];
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
      passedFree.push({ idx, text: ex });
    });

    if (passedFree.length === 0) {
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
    if (resolved.kind === "need_class" && !existingEntry) {
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

    // An edit keeps the entry's own class when the child is in several.
    const studentId = resolved.kind === "ok" ? resolved.studentId : (existingEntry?.student_id ?? null);
    const chosenClassId = resolved.kind === "ok" ? resolved.classId : (existingEntry?.class_id ?? null);

    // ── What is stored about the word is the server's, not the browser's:
    //    an existing entry keeps its own; a new one takes the shared cache
    //    (made by word-enrichment) when there is one, else the payload sent.
    const serverPayload: any = existingEntry ? (existingEntry.enrichment ?? null) : await cachedEnrichment(sb, cleanWord);
    const storedPayload: any = serverPayload ?? payload;

    // ── Level, for a NEW word: refuse without any call when the shared cache
    //    already knows the word's level and it is outside the child's band.
    const childLevel: BaseLevel | null = existingEntry ? null : await studentLevel(sb, user_id, studentId);
    const levelRefusal = (wordLevel: BaseLevel) => {
      if (!childLevel) return null;
      const verdict = levelVerdict(wordLevel, childLevel);
      if (verdict === "ok") return null;
      return respond({
        success: false,
        reason: "word_level",
        level_verdict: verdict,
        word_level: wordLevel,
        student_level: childLevel,
        message: levelMessage(verdict, cleanWord, wordLevel, childLevel),
      });
    };
    const knownLevel = existingEntry ? null : (serverPayload ? baseLevel(serverPayload.cefr ?? serverPayload.level) : null);
    if (knownLevel) {
      const refused = levelRefusal(knownLevel);
      if (refused) return refused;
    }

    // ── Claude reads the sentences that passed the free checks (one call). ──
    let check: CheckReading | null = null;
    try {
      const res = await askClaudeCheap<unknown>({
        system: CHECK_SYSTEM,
        user: checkPrompt(cleanWord, passedFree.map((p) => p.text)),
        schema: CHECK_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 400,
      });
      check = readCheck(res.data, passedFree.length);
      console.log(`save-word: checked "${cleanWord}" (${res.model}, ${res.usage.input_tokens} in / ${res.usage.output_tokens} out)`);
    } catch (e) {
      // The free checks stand alone when the checker is down or declines.
      console.warn("save-word: sentence check unavailable, free checks only:", e instanceof Error ? e.message : e);
    }

    if (!existingEntry && !knownLevel && check?.wordLevel) {
      const refused = levelRefusal(check.wordLevel);
      if (refused) return refused;
    }

    const acceptedExamples: string[] = [];
    passedFree.forEach((p, i) => {
      const v = check?.sentences[i];
      if (check && v && !v.ok) {
        rejected.push({ idx: p.idx, why: "not_right", reason: v.reason });
        return;
      }
      acceptedExamples.push(p.text);
    });
    if (acceptedExamples.length === 0) {
      const first = rejected.find((r) => r.why === "not_right")?.reason;
      return respond({
        success: false,
        reason: "no_valid_examples",
        rejected_examples: rejected,
        message: `Your sentence needs to use "${cleanWord}" with its real meaning.${first ? ` ${first}` : ""}`,
      });
    }

    // ── Daily cap, the deciding claim (new saves only) ──
    let claimed = false;
    if (!existingEntry) {
      const claim = await claimDailySave(sb, user_id, cleanWord);
      if (claim) {
        if (!claim.ok) return capReply(claim.saves_today);
        savesToday = claim.saves_today;
        claimed = !claim.reused;
      }
    }

    // ── Write the entry ──
    let entryId: string | null = null;
    const alreadySaved = !!existingEntry;
    let storedLevel: string | null = existingEntry?.cefr ?? null;

    if (existingEntry) {
      // An edit changes the child's own sentences, picture and class only.
      const { data: updated, error: updErr } = await sb
        .from("student_vocabulary_entries")
        .update({
          user_examples: acceptedExamples,
          ...(typeof image_url === "string" ? { image_url: image_url || null } : {}),
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
      // The stored column holds A1..C2 (Pre-A1 is kept as A1).
      const lv = knownLevel ?? check?.wordLevel ?? baseLevel(storedPayload?.cefr);
      storedLevel = lv === "Pre-A1" ? "A1" : lv;
      const { data: inserted, error: insErr } = await sb
        .from("student_vocabulary_entries")
        .insert({
          user_id,
          student_id: studentId,
          class_id: chosenClassId,
          word: cleanWord,
          root_word: storedPayload?.root_word || root_word || cleanWord,
          cefr: storedLevel,
          definition_en: storedPayload?.definition_en || null,
          definition_vi: storedPayload?.definition_vi || null,
          user_examples: acceptedExamples,
          enrichment: storedPayload,
          image_url: image_url || null,
        })
        .select("id")
        .single();
      if (insErr) {
        console.error("entry insert error:", insErr);
        if (claimed) await releaseDailySave(sb, user_id, cleanWord);
        return respond({ success: false, reason: "entry_insert_failed", details: insErr.message }, 500);
      }
      entryId = inserted.id;
    }

    // vocab_cache is NOT written here any more (audit F-03, found in the S2
    // fix round): the payload is the caller's own request body, and the
    // shared cache is served to every child by word-enrichment - a saved
    // word would make one account's text everyone's definition. Only
    // word-enrichment fills the cache, from its own model answer.

    // ── Award points (only first save earns) ──
    let pointsAwarded = 0;
    if (!alreadySaved && studentId && chosenClassId) {
      try {
        const alreadyEarned = await getWordPointsEarned(sb, studentId, cleanWord);
        const budget = Math.max(0, MAX_POINTS_PER_WORD - alreadyEarned);
        const pointsToAward = Math.min(SAVE_POINTS, budget);
        if (pointsToAward > 0) {
          await awardVocabularyPoints(sb, studentId, chosenClassId, user_id, pointsToAward, cleanWord);
          pointsAwarded = pointsToAward;
        }
      } catch (e) {
        console.error("award points failed:", e);
      }
    }

    // ── Activity log (awaited: the teacher's dashboard reads it) ──
    const { error: logErr } = await sb.from("vocab_activity_log").insert({
      user_id,
      student_id: studentId,
      class_id: chosenClassId,
      word: cleanWord,
      activity_type: alreadySaved ? "edit" : "save",
      points_awarded: pointsAwarded,
    });
    if (logErr) console.warn("activity log:", logErr.message);

    // The count after the save, so the client can show the right "X / 10 today".
    const savesTodayAfter = Math.max(alreadySaved ? 0 : savesToday, await countSavesToday(sb, user_id));

    return respond({
      success: true,
      id: entryId,
      points_awarded: pointsAwarded,
      already_saved: alreadySaved,
      class_id: chosenClassId,
      rejected_examples: rejected,
      saves_today: savesTodayAfter,
      daily_limit: DAILY_SAVE_LIMIT,
      word_level: storedLevel,
      checked: !!check,
    });
  } catch (error: any) {
    console.error("save-word error:", error);
    return respond({ success: false, reason: "internal_error", details: error?.message }, 500);
  }
});
