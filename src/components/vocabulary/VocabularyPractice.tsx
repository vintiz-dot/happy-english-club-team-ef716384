/**
 * VocabularyPractice — Multiple Choice Quiz Engine
 *
 * Pedagogical design:
 *   1. Pulls a target word from the student's Word Bank.
 *   2. Shows the word and 4 answer options: the correct definition + 3-4
 *      distractors pulled from OTHER saved words (with generic fallbacks
 *      if the bank is too small).
 *   3. One-time point award: points are only granted ONCE per word, ever.
 *      The `pointsAwarded` flag (tracked in point_transactions) prevents
 *      point-farming. Students can still practice any word for mastery,
 *      but repeat correct answers earn 0 pts.
 *   4. Engaging visual feedback: confetti burst for correct answers,
 *      gentle encouraging cues for wrong answers.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Volume2, RotateCcw, Brain, Sparkles, Award, CheckCircle2,
  XCircle, Trophy, ArrowRight, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { VocabularyWord } from "@/hooks/useVocabularyStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { ClassPointsPicker, type ClassOption } from "./ClassPointsPicker";

interface Props {
  words: VocabularyWord[];
  wordsForReview: VocabularyWord[];
  onUpdateMastery: (id: string, correct: boolean) => void;
}

type SessionState = "idle" | "active" | "feedback" | "complete";

// ─── Generic fallback distractors ────────────────────────────────────────
// Used when the student's Word Bank has fewer than 4 other words.
const GENERIC_DISTRACTORS = [
  "A type of large bird found in tropical forests",
  "The act of mixing two different liquids together",
  "A small tool used for measuring angles",
  "Something that moves very quickly through water",
  "A feeling of being very surprised",
  "A place where people go to rest and relax",
  "The process of growing bigger over time",
  "A sound that echoes in a large empty room",
  "A bright color often seen during sunset",
  "The way something feels when you touch it",
  "An object used to hold things together",
  "A special kind of dance from long ago",
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function speak(text: string, lang = "en-US", rate = 0.75) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Builds a set of 4 answer options with exactly 1 correct answer. */
function buildOptions(
  correctWord: VocabularyWord,
  allWords: VocabularyWord[],
): { text: string; isCorrect: boolean }[] {
  const correctDef = correctWord.meaning || "No definition available";

  // Pull unique definitions from other words
  const otherDefs = allWords
    .filter((w) => w.id !== correctWord.id && w.meaning && w.meaning !== correctDef)
    .map((w) => w.meaning);

  // Deduplicate
  const uniqueOtherDefs = [...new Set(otherDefs)];

  // We need 3 distractors
  const distractors: string[] = [];
  const shuffledOther = shuffle(uniqueOtherDefs);

  for (const d of shuffledOther) {
    if (distractors.length >= 3) break;
    distractors.push(d);
  }

  // If not enough distractors from the Word Bank, use generic fallbacks
  if (distractors.length < 3) {
    const usedSet = new Set([correctDef.toLowerCase(), ...distractors.map((d) => d.toLowerCase())]);
    const fallbacks = shuffle(GENERIC_DISTRACTORS).filter(
      (f) => !usedSet.has(f.toLowerCase()),
    );
    for (const f of fallbacks) {
      if (distractors.length >= 3) break;
      distractors.push(f);
    }
  }

  const options = [
    { text: correctDef, isCorrect: true },
    ...distractors.map((d) => ({ text: d, isCorrect: false })),
  ];

  return shuffle(options);
}

// ─── Confetti Component ──────────────────────────────────────────────────

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.3,
        color: ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899"][
          Math.floor(Math.random() * 6)
        ],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.x}vw`,
            y: "-10%",
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: "110vh",
            rotate: p.rotation + 720,
            opacity: [1, 1, 0.8, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            delay: p.delay,
            ease: "easeIn",
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────

export function VocabularyPractice({ words, wordsForReview, onUpdateMastery }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<SessionState>("idle");
  const [deck, setDeck] = useState<VocabularyWord[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [results, setResults] = useState<{
    correct: number;
    wrong: number;
    points: number;
  }>({ correct: 0, wrong: 0, points: 0 });
  const [classChoice, setClassChoice] = useState<{
    open: boolean;
    classes: ClassOption[];
    pending: { word: string; correct: boolean };
  } | null>(null);
  const [recording, setRecording] = useState(false);

  // Sticky class choice — once the student picks for this session, reuse it.
  const sessionClassRef = useRef<string | undefined>(undefined);

  const currentCard = deck[currentIdx] || null;
  const progress = deck.length > 0 ? (currentIdx / deck.length) * 100 : 0;

  // Generate options when current card changes
  useEffect(() => {
    if (currentCard && session === "active") {
      setOptions(buildOptions(currentCard, words));
      setSelectedIdx(null);
    }
  }, [currentCard, session, words]);

  const startSession = useCallback(
    (wordList: VocabularyWord[]) => {
      if (wordList.length === 0) return;
      const shuffled = shuffle(wordList).slice(0, 20);
      setDeck(shuffled);
      setCurrentIdx(0);
      setSelectedIdx(null);
      setResults({ correct: 0, wrong: 0, points: 0 });
      sessionClassRef.current = undefined;
      setSession("active");
    },
    [],
  );

  const recordPractice = useCallback(
    async (
      word: string,
      correct: boolean,
      classIdOverride?: string,
    ): Promise<{ resolved: boolean; pointsAwarded: number }> => {
      if (!user?.id) return { resolved: true, pointsAwarded: 0 };
      try {
        const { data, error } = await supabase.functions.invoke(
          "record-practice",
          {
            body: {
              user_id: user.id,
              word,
              correct,
              class_id: classIdOverride ?? sessionClassRef.current,
            },
          },
        );
        if (error) {
          console.warn("record-practice error:", error.message);
          return { resolved: true, pointsAwarded: 0 };
        }
        if (
          data?.success === false &&
          data.reason === "missing_class_choice" &&
          Array.isArray(data.classes)
        ) {
          setClassChoice({
            open: true,
            classes: data.classes,
            pending: { word, correct },
          });
          return { resolved: false, pointsAwarded: 0 };
        }
        if (data?.class_id) sessionClassRef.current = data.class_id;
        return {
          resolved: true,
          pointsAwarded: data?.points_awarded ?? 0,
        };
      } catch (e) {
        console.warn("record-practice exception:", e);
        return { resolved: true, pointsAwarded: 0 };
      }
    },
    [user?.id],
  );

  const advance = useCallback(() => {
    if (currentIdx + 1 >= deck.length) {
      setSession("complete");
    } else {
      setCurrentIdx((prev) => prev + 1);
      setSelectedIdx(null);
      setSession("active");
    }
  }, [currentIdx, deck.length]);

  const handleOptionClick = async (idx: number) => {
    if (selectedIdx !== null || !currentCard || recording) return; // Already answered
    setSelectedIdx(idx);
    setSession("feedback");

    const isCorrect = options[idx].isCorrect;

    onUpdateMastery(currentCard.id, isCorrect);

    if (isCorrect) {
      // Show confetti for correct answer
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }

    setRecording(true);
    const { resolved, pointsAwarded } = await recordPractice(
      currentCard.word,
      isCorrect,
    );
    setRecording(false);

    setResults((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
      points: prev.points + pointsAwarded,
    }));

    if (pointsAwarded > 0) {
      toast({
        title: `+${pointsAwarded} pts! 🎉`,
        description: "Points added to your class leaderboard!",
      });
    }

    // Don't auto-advance — let the student tap "Next"
    if (!resolved) {
      // Multi-class modal opens; advance after student picks.
    }
  };

  const handleClassChoice = async (classId: string) => {
    sessionClassRef.current = classId;
    if (!classChoice) return;
    const { word, correct } = classChoice.pending;
    setClassChoice(null);
    setRecording(true);
    const { pointsAwarded } = await recordPractice(word, correct, classId);
    setRecording(false);
    setResults((prev) => ({
      ...prev,
      points: prev.points + pointsAwarded,
    }));
    if (pointsAwarded > 0) {
      toast({
        title: `+${pointsAwarded} pts! 🎉`,
        description: "Points added to your class leaderboard!",
      });
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
            Add words to your vocabulary bank first, then come back to practice
            them!
          </p>
        </div>
      );
    }

    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-foreground">
            Multiple Choice Quiz
          </h2>
          <p className="text-muted-foreground text-sm">
            Test your knowledge! Pick the correct definition for each word.
          </p>
        </div>

        {/* Session Options */}
        <div className="space-y-3">
          {dueCount > 0 && (
            <Card
              className="border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => startSession(wordsForReview)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">
                      Words Due for Review
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Spaced repetition — review these now!
                    </p>
                  </div>
                </div>
                <Badge className="bg-violet-600 text-white text-lg px-3">
                  {dueCount}
                </Badge>
              </CardContent>
            </Card>
          )}

          <Card
            className="cursor-pointer hover:shadow-lg transition-all"
            onClick={() => startSession(words)}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    Practice All Words
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Random selection from your entire bank
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3">
                {totalCount}
              </Badge>
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
            <p className="text-3xl font-black text-emerald-600">
              {results.correct}
            </p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-red-500">
              {results.wrong}
            </p>
            <p className="text-sm text-muted-foreground">To Review</p>
          </div>
          {results.points > 0 && (
            <div className="text-center">
              <p className="text-3xl font-black text-amber-500 flex items-center justify-center gap-1">
                <Award className="w-7 h-7" /> {results.points}
              </p>
              <p className="text-sm text-muted-foreground">Points earned</p>
            </div>
          )}
        </div>
        <Progress value={pct} className="h-3 rounded-full" />
        <p className="text-muted-foreground">
          {pct >= 80
            ? "Outstanding! You're mastering these words! 🌟"
            : pct >= 50
              ? "Good effort! Keep practicing and you'll get there! 💪"
              : "Every practice session makes you stronger. Don't give up! 🚀"}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => setSession("idle")}
            className="rounded-xl"
          >
            <RotateCcw className="w-4 h-4 mr-2" /> New Session
          </Button>
        </div>
      </div>
    );
  }

  // --- ACTIVE / FEEDBACK STATE ---
  if (!currentCard) return null;

  const isInFeedback = session === "feedback";
  const wasCorrect =
    isInFeedback && selectedIdx !== null && options[selectedIdx]?.isCorrect;

  return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      {/* Confetti */}
      {showConfetti && <ConfettiBurst />}

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} className="flex-1 h-2.5 rounded-full" />
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {currentIdx + 1} / {deck.length}
        </span>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-violet-200 dark:border-violet-800 shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Word display */}
              <div className="text-center space-y-3">
                {currentCard.imageUrl && (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md mx-auto">
                    <img
                      src={currentCard.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-sm text-muted-foreground font-medium">
                  What does this word mean?
                </p>
                <h2 className="text-4xl font-black text-foreground text-center capitalize">
                  {currentCard.word}
                </h2>
                {currentCard.cefr && (
                  <Badge
                    variant="outline"
                    className="text-xs font-bold mx-auto"
                  >
                    CEFR {currentCard.cefr}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.word, "en-US", 0.65);
                  }}
                >
                  <Volume2 className="w-4 h-4" /> Listen
                </Button>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-3">
                {options.map((opt, idx) => {
                  const isSelected = selectedIdx === idx;
                  const showCorrectHighlight =
                    isInFeedback && opt.isCorrect;
                  const showWrongHighlight =
                    isInFeedback && isSelected && !opt.isCorrect;

                  return (
                    <motion.button
                      key={`${currentCard.id}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      onClick={() => handleOptionClick(idx)}
                      disabled={isInFeedback}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-3",
                        // Default state
                        !isInFeedback &&
                          "border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 hover:shadow-md cursor-pointer active:scale-[0.98]",
                        // Correct answer highlight
                        showCorrectHighlight &&
                          "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 shadow-md shadow-emerald-100 dark:shadow-emerald-900/20",
                        // Wrong answer highlight
                        showWrongHighlight &&
                          "border-red-400 bg-red-50 dark:bg-red-950/30 shadow-md shadow-red-100 dark:shadow-red-900/20",
                        // Non-selected in feedback mode
                        isInFeedback &&
                          !showCorrectHighlight &&
                          !showWrongHighlight &&
                          "opacity-50 border-slate-200 dark:border-slate-700",
                      )}
                    >
                      {/* Option label (A, B, C, D) */}
                      <span
                        className={cn(
                          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                          showCorrectHighlight
                            ? "bg-emerald-500 text-white"
                            : showWrongHighlight
                              ? "bg-red-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
                        )}
                      >
                        {showCorrectHighlight ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : showWrongHighlight ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          String.fromCharCode(65 + idx) // A, B, C, D
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-base font-medium pt-0.5 leading-snug",
                          showCorrectHighlight &&
                            "text-emerald-800 dark:text-emerald-200",
                          showWrongHighlight &&
                            "text-red-800 dark:text-red-200",
                          !showCorrectHighlight &&
                            !showWrongHighlight &&
                            "text-foreground",
                        )}
                      >
                        {opt.text}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback Message */}
              {isInFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div
                    className={cn(
                      "rounded-xl p-4 text-center",
                      wasCorrect
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                        : "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800",
                    )}
                  >
                    <p
                      className={cn(
                        "text-lg font-bold",
                        wasCorrect
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-orange-700 dark:text-orange-300",
                      )}
                    >
                      {wasCorrect
                        ? ["Fantastic! 🌟", "Brilliant! 🎯", "Amazing! 🏆", "You nailed it! ✨", "Super star! ⭐"][
                            Math.floor(Math.random() * 5)
                          ]
                        : ["Almost there! 💪", "Keep trying! 🚀", "You'll get it next time! 🌈", "Don't give up! 🎈"][
                            Math.floor(Math.random() * 4)
                          ]}
                    </p>
                    {!wasCorrect && currentCard.example && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        "{currentCard.example}"
                      </p>
                    )}
                  </div>

                  {/* Next Button */}
                  <Button
                    onClick={advance}
                    disabled={recording}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-bold text-base shadow-lg"
                  >
                    {recording ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="w-5 h-5 mr-2" />
                    )}
                    {currentIdx + 1 >= deck.length ? "See Results" : "Next Word"}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Multi-class points picker */}
      {classChoice && (
        <ClassPointsPicker
          open={classChoice.open}
          classes={classChoice.classes}
          onChoose={handleClassChoice}
          onClose={() => setClassChoice(null)}
        />
      )}
    </div>
  );
}
