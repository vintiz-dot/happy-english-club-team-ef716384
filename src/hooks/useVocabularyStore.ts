import { useState, useEffect, useCallback } from "react";

export interface VocabularyWord {
  id: string;
  word: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  imageUrl: string;
  masteryLevel: number; // 0=new, 1-2=learning, 3-4=familiar, 5=mastered
  nextReviewDate: string;
  timesReviewed: number;
  timesCorrect: number;
  createdAt: string;
  lastReviewedAt: string | null;
}

const STORAGE_KEY = "hec-vocab";
// Spaced repetition intervals (Leitner system) in days
const INTERVALS = [0, 1, 3, 7, 14, 30];

function getKey(userId?: string): string {
  return userId ? STORAGE_KEY + "-" + userId : STORAGE_KEY;
}

function loadWords(userId?: string): VocabularyWord[] {
  try {
    const raw = localStorage.getItem(getKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWords(words: VocabularyWord[], userId?: string) {
  localStorage.setItem(getKey(userId), JSON.stringify(words));
}

function getNextReviewDate(level: number): string {
  const days = INTERVALS[Math.min(level, INTERVALS.length - 1)];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function useVocabularyStore(userId?: string) {
  const [words, setWords] = useState<VocabularyWord[]>(() => loadWords(userId));

  useEffect(() => { saveWords(words, userId); }, [words, userId]);
  useEffect(() => { setWords(loadWords(userId)); }, [userId]);

  const addWord = useCallback((input: {
    word: string; partOfSpeech: string; meaning: string; example: string; imageUrl: string;
  }) => {
    const newWord: VocabularyWord = {
      ...input,
      id: crypto.randomUUID(),
      masteryLevel: 0,
      nextReviewDate: new Date().toISOString(),
      timesReviewed: 0,
      timesCorrect: 0,
      createdAt: new Date().toISOString(),
      lastReviewedAt: null,
    };
    setWords(prev => [newWord, ...prev]);
    return newWord;
  }, []);

  const deleteWord = useCallback((id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  }, []);

  const updateMastery = useCallback((id: string, correct: boolean) => {
    setWords(prev => prev.map(w => {
      if (w.id !== id) return w;
      const newLevel = correct
        ? Math.min(w.masteryLevel + 1, 5)
        : Math.max(w.masteryLevel - 1, 0);
      return {
        ...w,
        masteryLevel: newLevel,
        nextReviewDate: getNextReviewDate(newLevel),
        timesReviewed: w.timesReviewed + 1,
        timesCorrect: correct ? w.timesCorrect + 1 : w.timesCorrect,
        lastReviewedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const getWordsForReview = useCallback((): VocabularyWord[] => {
    const now = new Date();
    return words
      .filter(w => new Date(w.nextReviewDate) <= now)
      .sort((a, b) => a.masteryLevel - b.masteryLevel);
  }, [words]);

  const getStats = useCallback(() => {
    const total = words.length;
    const mastered = words.filter(w => w.masteryLevel >= 4).length;
    const learning = words.filter(w => w.masteryLevel > 0 && w.masteryLevel < 4).length;
    const newCount = words.filter(w => w.masteryLevel === 0).length;
    const dueForReview = words.filter(w => new Date(w.nextReviewDate) <= new Date()).length;
    return { total, mastered, learning, newCount, dueForReview };
  }, [words]);

  return { words, addWord, deleteWord, updateMastery, getWordsForReview, getStats };
}
