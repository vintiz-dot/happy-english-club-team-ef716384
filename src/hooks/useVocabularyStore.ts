/**
 * useVocabularyStore — localStorage-backed personal word bank.
 * Scoped per-user via a key suffix so different students on the same browser
 * don't see each other's words.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export interface VocabularyWord {
  id: string;
  word: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  imageUrl: string;
  masteryLevel: number; // 0-5
  createdAt: number;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
  timesCorrect: number;
  timesWrong: number;
}

export interface NewVocabularyWord {
  word: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  imageUrl: string;
}

const STORAGE_PREFIX = "hec-vocabulary-v1";
// Spaced repetition intervals (ms) per mastery level 0..5
const DAY = 24 * 60 * 60 * 1000;
const REVIEW_INTERVALS = [0, 1 * DAY, 2 * DAY, 4 * DAY, 7 * DAY, 14 * DAY];

function storageKey(userId: string | undefined): string {
  return `${STORAGE_PREFIX}:${userId || "anon"}`;
}

function loadWords(userId: string | undefined): VocabularyWord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWords(userId: string | undefined, words: VocabularyWord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(words));
  } catch {
    /* quota or serialization issue — silently ignore */
  }
}

function nextReviewTime(masteryLevel: number, from = Date.now()): number {
  const idx = Math.max(0, Math.min(REVIEW_INTERVALS.length - 1, masteryLevel));
  return from + REVIEW_INTERVALS[idx];
}

export function useVocabularyStore(userId: string | undefined) {
  const [words, setWords] = useState<VocabularyWord[]>(() => loadWords(userId));

  // Reload when user changes
  useEffect(() => {
    setWords(loadWords(userId));
  }, [userId]);

  // Persist on every change
  useEffect(() => {
    saveWords(userId, words);
  }, [userId, words]);

  const addWord = useCallback((w: NewVocabularyWord) => {
    setWords((prev) => {
      // De-dupe by lowercase word
      const exists = prev.some((p) => p.word.trim().toLowerCase() === w.word.trim().toLowerCase());
      if (exists) return prev;
      const now = Date.now();
      const fresh: VocabularyWord = {
        id: (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `w_${now}_${Math.random().toString(36).slice(2, 9)}`,
        word: w.word.trim(),
        partOfSpeech: w.partOfSpeech || "other",
        meaning: w.meaning || "",
        example: w.example || "",
        imageUrl: w.imageUrl || "",
        masteryLevel: 0,
        createdAt: now,
        lastReviewedAt: null,
        nextReviewAt: now,
        timesCorrect: 0,
        timesWrong: 0,
      };
      return [fresh, ...prev];
    });
  }, []);

  const deleteWord = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const updateMastery = useCallback((id: string, correct: boolean) => {
    setWords((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const newLevel = correct
          ? Math.min(5, w.masteryLevel + 1)
          : Math.max(0, w.masteryLevel - 1);
        const now = Date.now();
        return {
          ...w,
          masteryLevel: newLevel,
          lastReviewedAt: now,
          nextReviewAt: nextReviewTime(newLevel, now),
          timesCorrect: w.timesCorrect + (correct ? 1 : 0),
          timesWrong: w.timesWrong + (correct ? 0 : 1),
        };
      }),
    );
  }, []);

  const getWordsForReview = useCallback((): VocabularyWord[] => {
    const now = Date.now();
    return words.filter((w) => (w.nextReviewAt ?? 0) <= now);
  }, [words]);

  const getStats = useCallback(() => {
    const total = words.length;
    const mastered = words.filter((w) => w.masteryLevel >= 5).length;
    const now = Date.now();
    const dueForReview = words.filter((w) => (w.nextReviewAt ?? 0) <= now).length;
    return { total, mastered, dueForReview };
  }, [words]);

  return useMemo(
    () => ({ words, addWord, deleteWord, updateMastery, getWordsForReview, getStats }),
    [words, addWord, deleteWord, updateMastery, getWordsForReview, getStats],
  );
}
