import { useState, useMemo, useCallback } from "react";
import { Volume2, Eye, EyeOff, RotateCcw, ArrowRight, Trophy, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { VocabularyWord } from "@/hooks/useVocabularyStore";

interface Props {
  words: VocabularyWord[];
  wordsForReview: VocabularyWord[];
  onUpdateMastery: (id: string, correct: boolean) => void;
}

type SessionState = "idle" | "active" | "complete";

function speak(text: string, lang = "en-US", rate = 0.75) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function VocabularyPractice({ words, wordsForReview, onUpdateMastery }: Props) {
  const [session, setSession] = useState<SessionState>("idle");
  const [deck, setDeck] = useState<VocabularyWord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ correct: number; wrong: number }>({ correct: 0, wrong: 0 });
  const [mode, setMode] = useState<"en-to-vi" | "vi-to-en">("en-to-vi");

  const currentCard = deck[currentIdx] || null;
  const progress = deck.length > 0 ? ((currentIdx) / deck.length) * 100 : 0;

  const startSession = useCallback((wordList: VocabularyWord[]) => {
    if (wordList.length === 0) return;
    // Shuffle the deck
    const shuffled = [...wordList].sort(() => Math.random() - 0.5).slice(0, 20);
    setDeck(shuffled);
    setCurrentIdx(0);
    setFlipped(false);
    setResults({ correct: 0, wrong: 0 });
    setSession("active");
  }, []);

  const handleAnswer = (correct: boolean) => {
    if (!currentCard) return;
    onUpdateMastery(currentCard.id, correct);
    setResults(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));

    if (currentIdx + 1 >= deck.length) {
      setSession("complete");
    } else {
      setCurrentIdx(prev => prev + 1);
      setFlipped(false);
    }
  };

  // --- IDLE STATE ---
  if (session === "idle") {
    const dueCount = wordsForReview.length;
    const totalCount = words.length;

    if (totalCount === 0) {
      return (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl">🧠</div>
          <h3 className="text-xl font-bold">No Words to Practice</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Add words to your vocabulary bank first, then come back to practice them!
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-foreground">Practice Mode</h2>
          <p className="text-muted-foreground text-sm">
            Based on spaced repetition — you'll review words right when you need to.
          </p>
        </div>

        {/* Practice Mode Selector */}
        <div className="flex gap-3 justify-center">
          <Button
            variant={mode === "en-to-vi" ? "default" : "outline"}
            onClick={() => setMode("en-to-vi")}
            className="rounded-xl"
          >
            🇬🇧 → 🇻🇳 English to Vietnamese
          </Button>
          <Button
            variant={mode === "vi-to-en" ? "default" : "outline"}
            onClick={() => setMode("vi-to-en")}
            className="rounded-xl"
          >
            🇻🇳 → 🇬🇧 Vietnamese to English
          </Button>
        </div>

        {/* Session Options */}
        <div className="space-y-3">
          {dueCount > 0 && (
            <Card className="border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => startSession(wordsForReview)}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Words Due for Review</p>
                    <p className="text-sm text-muted-foreground">Spaced repetition — review these now!</p>
                  </div>
                </div>
                <Badge className="bg-violet-600 text-white text-lg px-3">{dueCount}</Badge>
              </CardContent>
            </Card>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => startSession(words)}>
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Practice All Words</p>
                  <p className="text-sm text-muted-foreground">Random selection from your entire bank</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3">{totalCount}</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- COMPLETE STATE ---
  if (session === "complete") {
    const total = results.correct + results.wrong;
    const pct = total > 0 ? Math.round((results.correct / total) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-7xl"
        >
          {pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚"}
        </motion.div>
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-600">{results.correct}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-red-500">{results.wrong}</p>
            <p className="text-sm text-muted-foreground">To Review</p>
          </div>
        </div>
        <Progress value={pct} className="h-3 rounded-full" />
        <p className="text-muted-foreground">
          {pct >= 80 ? "Outstanding! You're mastering these words! 🌟"
            : pct >= 50 ? "Good effort! Keep practicing and you'll get there! 💪"
            : "Every practice session makes you stronger. Don't give up! 🚀"}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => setSession("idle")} className="rounded-xl">
            <RotateCcw className="w-4 h-4 mr-2" /> New Session
          </Button>
        </div>
      </div>
    );
  }

  // --- ACTIVE STATE ---
  if (!currentCard) return null;

  const frontText = mode === "en-to-vi" ? currentCard.word : currentCard.meaning;
  const frontLabel = mode === "en-to-vi" ? "What does this word mean?" : "What is this word in English?";
  const backText = mode === "en-to-vi" ? currentCard.meaning : currentCard.word;
  const backLabel = mode === "en-to-vi" ? "Vietnamese Meaning" : "English Word";

  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2.5 rounded-full" />
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {currentIdx + 1} / {deck.length}
        </span>
      </div>

      {/* Flashcard */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id + (flipped ? "-back" : "-front")}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card
            className={cn(
              "min-h-[320px] cursor-pointer border-2 shadow-xl rounded-3xl transition-colors",
              flipped ? "border-emerald-200 dark:border-emerald-800" : "border-violet-200 dark:border-violet-800"
            )}
            onClick={() => { if (!flipped) setFlipped(true); }}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[320px] space-y-4">
              {/* Image (if available) */}
              {currentCard.imageUrl && (
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-md">
                  <img src={currentCard.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {!flipped ? (
                <>
                  <p className="text-sm text-muted-foreground">{frontLabel}</p>
                  <h2 className="text-4xl font-black text-foreground text-center capitalize">{frontText}</h2>
                  {mode === "en-to-vi" && (
                    <Button variant="ghost" size="sm" className="text-blue-600 gap-1" onClick={(e) => {
                      e.stopPropagation();
                      speak(currentCard.word, "en-US", 0.65);
                    }}>
                      <Volume2 className="w-4 h-4" /> Listen
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-4">
                    <Eye className="w-3 h-3" /> Tap to reveal answer
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{backLabel}</p>
                  <h2 className="text-3xl font-black text-foreground text-center">{backText}</h2>
                  {currentCard.example && (
                    <p className="text-sm text-muted-foreground italic text-center max-w-sm">
                      "{currentCard.example}"
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="text-blue-600 gap-1" onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.word, "en-US", 0.65);
                    setTimeout(() => speak(currentCard.example, "en-US", 0.85), 1500);
                  }}>
                    <Volume2 className="w-4 h-4" /> Listen to Word & Sentence
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Answer Buttons */}
      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <Button
            variant="outline"
            className="flex-1 h-14 text-base rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleAnswer(false)}
          >
            Still Learning 🔄
          </Button>
          <Button
            className="flex-1 h-14 text-base rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => handleAnswer(true)}
          >
            Got It! ✅
          </Button>
        </motion.div>
      )}
    </div>
  );
}
