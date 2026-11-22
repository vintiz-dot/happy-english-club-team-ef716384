/**
 * useVocabularyStore — Supabase-backed personal word bank.
 *
 * The word bank used to live in localStorage; it now lives in the
 * `student_vocabulary_entries` table so:
 *   - it survives device changes
 *   - teachers can audit it
 *   - the rest of the platform (leaderboards, activity log) can hook into it
 *
 * Writes that originate from the Save flow (anti-cheat validated examples,
 * leaderboard award, etc.) go through the `save-word` edge function rather
 * than this hook, and so do edited sentences. Mastery updates, picture and
 * meaning edits, and deletes call the DB directly via RLS-protected queries.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VocabularyWord {
  id: string;
  word: string;
  rootWord: string;
  partOfSpeech: string;
  cefr: string | null;
  meaning: string;          // VI definition preferred, falls back to EN
  englishMeaning: string;   // EN definition preferred
  example: string;          // first user example (for legacy callers)
  examples: string[];       // student-written examples
  imageUrl: string;
  masteryLevel: number;
  nextReviewDate: string;
  timesReviewed: number;
  timesCorrect: number;
  createdAt: string;
  lastReviewedAt: string | null;
  classId: string | null;
  enrichment: any;
}

// Leitner-system intervals (days) used when computing next_review_date.
const INTERVALS = [0, 1, 3, 7, 14, 30];

function getNextReviewDate(level: number): string {
  const days = INTERVALS[Math.min(Math.max(level, 0), INTERVALS.length - 1)];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function mapRowToWord(row: any): VocabularyWord {
  const enrichment = row.enrichment || {};
  const examples: string[] = Array.isArray(row.user_examples) ? row.user_examples : [];
  const pos = (() => {
    const forms = enrichment.word_forms;
    if (Array.isArray(forms) && forms.length > 0) {
      const first = forms[0];
      if (typeof first === "object" && first?.pos) return String(first.pos);
    }
    return "";
  })();
  return {
    id: row.id,
    word: row.word,
    rootWord: row.root_word || row.word,
    partOfSpeech: pos,
    cefr: row.cefr || null,
    meaning: row.definition_vi || row.definition_en || enrichment.definition_vi || enrichment.definition_en || "",
    englishMeaning: row.definition_en || enrichment.definition_en || row.definition_vi || enrichment.definition_vi || "",
    example: examples[0] || "",
    examples,
    imageUrl: row.image_url || "",
    masteryLevel: row.mastery_level ?? 0,
    nextReviewDate: row.next_review_date || new Date().toISOString(),
    timesReviewed: row.times_reviewed ?? 0,
    timesCorrect: row.times_correct ?? 0,
    createdAt: row.created_at,
    lastReviewedAt: row.last_reviewed_at,
    classId: row.class_id,
    enrichment,
  };
}

export function useVocabularyStore(userId?: string) {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) { setWords([]); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("student_vocabulary_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("vocab fetch failed:", error.message);
      setWords([]);
    } else {
      setWords((data || []).map(mapRowToWord));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  /**
   * Adds a word to local state after a successful save-word edge call.
   * `entryId` is the row id returned by the edge function; we then refetch
   * that row's columns so we have a single source of truth.
   */
  const ingestSavedEntry = useCallback(async (entryId: string) => {
    const { data } = await (supabase as any)
      .from("student_vocabulary_entries")
      .select("*")
      .eq("id", entryId)
      .maybeSingle();
    if (data) {
      const word = mapRowToWord(data);
      setWords((prev) => {
        const without = prev.filter((w) => w.id !== word.id);
        return [word, ...without];
      });
    }
  }, []);

  const deleteWord = useCallback(async (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
    const { error } = await (supabase as any)
      .from("student_vocabulary_entries")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("vocab delete failed:", error.message);
      // Re-sync from DB on failure.
      refresh();
    }
  }, [refresh]);

  const updateWord = useCallback(async (
    id: string,
    patch: Partial<{ examples: string[]; imageUrl: string; meaning: string }>,
  ) => {
    // New sentences go through save-word, which checks them the way a first
    // save is checked (free checks + Claude). The table refuses a direct
    // change of user_examples from the browser (20261122150000). Picture and
    // meaning are the child's own notes and are written directly.
    const before = words.find((w) => w.id === id);
    const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
    if (patch.examples !== undefined && before
        && same(patch.examples.map((e) => e.trim()).filter(Boolean), before.examples)) {
      // Unchanged sentences: nothing to check, nothing to spend.
      const { examples: _unchanged, ...rest } = patch;
      patch = rest;
    }
    if (patch.examples !== undefined) {
      const target = before;
      if (!target) throw new Error("This word is not in your bank any more.");
      const { data, error } = await supabase.functions.invoke("save-word", {
        body: {
          word: target.word,
          root_word: target.rootWord,
          payload: target.enrichment || {},
          user_examples: patch.examples.map((e) => e.trim()).filter(Boolean),
        },
      });
      if (error) throw new Error(error.message || "Could not save your sentences.");
      if (data?.success === false) throw new Error(data.message || "Your sentences were not accepted.");
      const accepted: string[] = Array.isArray(data?.rejected_examples) && data.rejected_examples.length > 0
        ? patch.examples.map((e) => e.trim()).filter(Boolean)
            .filter((_, i) => !data.rejected_examples.some((r: { idx: number }) => r.idx === i))
        : patch.examples;
      patch = { ...patch, examples: accepted };
    }
    const dbPatch: Record<string, unknown> = {};
    if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
    if (patch.meaning !== undefined) dbPatch.definition_vi = patch.meaning;

    setWords((prev) => prev.map((w) => (w.id === id ? {
      ...w,
      examples: patch.examples ?? w.examples,
      example: patch.examples ? patch.examples[0] || "" : w.example,
      imageUrl: patch.imageUrl ?? w.imageUrl,
      meaning: patch.meaning ?? w.meaning,
    } : w)));

    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await (supabase as any)
      .from("student_vocabulary_entries")
      .update(dbPatch)
      .eq("id", id);
    if (error) {
      console.error("vocab update failed:", error.message);
      refresh();
    }
  }, [refresh, words]);

  const updateMastery = useCallback(async (id: string, correct: boolean) => {
    const target = words.find((w) => w.id === id);
    if (!target) return;

    const newLevel = correct
      ? Math.min(target.masteryLevel + 1, 5)
      : Math.max(target.masteryLevel - 1, 0);
    const next = {
      mastery_level: newLevel,
      next_review_date: getNextReviewDate(newLevel),
      times_reviewed: target.timesReviewed + 1,
      times_correct: target.timesCorrect + (correct ? 1 : 0),
      last_reviewed_at: new Date().toISOString(),
    };

    setWords((prev) => prev.map((w) =>
      w.id === id
        ? {
            ...w,
            masteryLevel: next.mastery_level,
            nextReviewDate: next.next_review_date,
            timesReviewed: next.times_reviewed,
            timesCorrect: next.times_correct,
            lastReviewedAt: next.last_reviewed_at,
          }
        : w,
    ));

    const { error } = await (supabase as any)
      .from("student_vocabulary_entries")
      .update(next)
      .eq("id", id);
    if (error) console.warn("mastery update failed:", error.message);
  }, [words]);

  const getWordsForReview = useCallback((): VocabularyWord[] => {
    const now = new Date();
    return words
      .filter((w) => new Date(w.nextReviewDate) <= now)
      .sort((a, b) => a.masteryLevel - b.masteryLevel);
  }, [words]);

  const getStats = useCallback(() => {
    const total = words.length;
    const mastered = words.filter((w) => w.masteryLevel >= 4).length;
    const learning = words.filter((w) => w.masteryLevel > 0 && w.masteryLevel < 4).length;
    const newCount = words.filter((w) => w.masteryLevel === 0).length;
    const dueForReview = words.filter((w) => new Date(w.nextReviewDate) <= new Date()).length;
    return { total, mastered, learning, newCount, dueForReview };
  }, [words]);

  return {
    words,
    loading,
    refresh,
    ingestSavedEntry,
    deleteWord,
    updateWord,
    updateMastery,
    getWordsForReview,
    getStats,
  };
}
