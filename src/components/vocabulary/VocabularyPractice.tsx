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
 *   4. Visual feedback: the right answer turns leaf with a check mark,
 *      gentle encouraging cues for wrong answers (A4.6: no confetti).
 */

import { useState, useCallback, useRef, useEffect } from "react";
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

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

/** A whole-card choice on the start screen (DS s.15 card that is a control). */
const PICK_CARD = `flex w-full min-h-hec-target items-center justify-between gap-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-left shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 sm:p-6 ${FOCUS}`;

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
  const correctDef = correctWord.englishMeaning || "No definition available";

  // Pull unique definitions from other words
  const otherDefs = allWords
    .filter((w) => w.id !== correctWord.id && w.englishMeaning && w.englishMeaning !== correctDef)
    .map((w) => w.englishMeaning);

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
            // No user_id: the function takes the student from the verified
            // JWT, so points can only ever be awarded to the signed-in user.
            body: {
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
        <div className="space-y-4 py-16 text-center">
          <div className="text-6xl" aria-hidden="true">🧠</div>
          <h3 className="font-display text-hec-h2 font-medium text-hec-ink">No Words to Practice</h3>
          <p className="mx-auto max-w-md text-hec-body text-hec-ink-soft">
            Add words to your vocabulary bank first, then come back to practice
            them!
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="mb-4 text-5xl" aria-hidden="true">🎯</div>
          <h2 className="font-display text-hec-h1 font-medium text-hec-ink">
            Multiple Choice Quiz
          </h2>
          <p className="text-hec-small text-hec-ink-soft">
            Test your knowledge! Pick the correct definition for each word.
          </p>
        </div>

        {/* Session Options */}
        <div className="space-y-4">
          {dueCount > 0 && (
            <button
              type="button"
              className={PICK_CARD}
              onClick={() => startSession(wordsForReview)}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken">
                  <Brain className="w-5 h-5 text-hec-brass" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-hec-ink">
                    Words Due for Review
                  </span>
                  <span className="block text-hec-small text-hec-ink-soft">
                    Spaced repetition — review these now!
                  </span>
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center rounded-full border border-hec-warn/30 bg-hec-warn-tint px-3 py-1 text-hec-caption font-medium tabular-nums text-hec-warn">
                {dueCount}
              </span>
            </button>
          )}

          <button
            type="button"
            className={PICK_CARD}
            onClick={() => startSession(words)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken">
                <Sparkles className="w-5 h-5 text-hec-brass" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-hec-ink">
                  Practice All Words
                </span>
                <span className="block text-hec-small text-hec-ink-soft">
                  Random selection from your entire bank
                </span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center rounded-full border border-hec-line bg-hec-sunken px-3 py-1 text-hec-caption font-medium tabular-nums text-hec-ink-soft">
              {totalCount}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // --- COMPLETE STATE ---
  if (session === "complete") {
    const total = results.correct + results.wrong;
    const pct = total > 0 ? Math.round((results.correct / total) * 100) : 0;
    return (
      <div className="mx-auto max-w-md space-y-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="text-7xl"
          aria-hidden="true"
        >
          {pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚"}
        </motion.div>
        <h2 className="font-display text-hec-h1 font-medium text-hec-ink">Session Complete!</h2>
        <div className="flex flex-wrap justify-center gap-8">
          <div className="text-center">
            <p className="text-hec-h1 font-semibold tabular-nums text-hec-leaf">
              {results.correct}
            </p>
            <p className="text-hec-small text-hec-ink-soft">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-hec-h1 font-semibold tabular-nums text-hec-warn">
              {results.wrong}
            </p>
            <p className="text-hec-small text-hec-ink-soft">To Review</p>
          </div>
          {results.points > 0 && (
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-hec-h1 font-semibold tabular-nums text-hec-brass">
                <Award className="w-6 h-6" aria-hidden="true" /> {results.points}
              </p>
              <p className="text-hec-small text-hec-ink-soft">Points earned</p>
            </div>
          )}
        </div>
        <Progress value={pct} aria-label="Score" className="h-2 rounded-full bg-hec-sunken" />
        <p className="text-hec-body text-hec-ink-soft">
          {pct >= 80
            ? "Outstanding! You're mastering these words! 🌟"
            : pct >= 50
              ? "Good effort! Keep practicing and you'll get there! 💪"
              : "Every practice session makes you stronger. Don't give up! 🚀"}
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => setSession("idle")}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> New Session
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
    <div className="mx-auto max-w-lg space-y-6 py-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress value={progress} aria-label="Quiz progress" className="h-2 flex-1 rounded-full bg-hec-sunken" />
        <span className="whitespace-nowrap text-hec-small font-medium tabular-nums text-hec-ink-soft">
          {currentIdx + 1} / {deck.length}
        </span>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="overflow-hidden">
            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Word display */}
              <div className="space-y-3 text-center">
                {currentCard.imageUrl && (
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-hec-lg shadow-hec-1">
                    <img
                      src={currentCard.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-hec-small font-medium text-hec-ink-soft">
                  What does this word mean?
                </p>
                <h2 className="break-words text-center font-display text-hec-display font-medium capitalize text-hec-ink">
                  {currentCard.word}
                </h2>
                {currentCard.cefr && (
                  <Badge variant="brass">
                    CEFR {currentCard.cefr}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(currentCard.word, "en-US", 0.65);
                  }}
                >
                  <Volume2 className="w-4 h-4" aria-hidden="true" /> Listen
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => handleOptionClick(idx)}
                      disabled={isInFeedback}
                      className={cn(
                        `flex min-h-hec-target w-full items-start gap-3 rounded-hec-md border p-4 text-left transition-colors duration-hec-1 ease-hec ${FOCUS}`,
                        // Default state
                        !isInFeedback &&
                          "cursor-pointer border-hec-line-strong bg-hec-raised hover:bg-hec-sunken",
                        // Correct answer highlight
                        showCorrectHighlight &&
                          "border-hec-leaf/30 bg-hec-leaf-tint",
                        // Wrong answer highlight
                        showWrongHighlight &&
                          "border-hec-danger/30 bg-hec-danger-tint",
                        // Non-selected in feedback mode
                        isInFeedback &&
                          !showCorrectHighlight &&
                          !showWrongHighlight &&
                          "border-hec-line bg-hec-raised opacity-50",
                      )}
                    >
                      {/* Option label (A, B, C, D) */}
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-hec-small font-semibold transition-colors duration-hec-1 ease-hec",
                          showCorrectHighlight
                            ? "bg-hec-leaf text-hec-paper"
                            : showWrongHighlight
                              ? "bg-hec-danger-fill text-hec-on-danger"
                              : "bg-hec-sunken text-hec-ink-soft",
                        )}
                      >
                        {showCorrectHighlight ? (
                          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                        ) : showWrongHighlight ? (
                          <XCircle className="w-5 h-5" aria-hidden="true" />
                        ) : (
                          String.fromCharCode(65 + idx) // A, B, C, D
                        )}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 break-words pt-1 text-hec-body font-medium",
                           showCorrectHighlight &&
                             "text-hec-leaf",
                           showWrongHighlight &&
                             "text-hec-danger",
                           !showCorrectHighlight &&
                             !showWrongHighlight &&
                             "text-hec-ink",
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div
                    className={cn(
                      "rounded-hec-md border p-4 text-center",
                      wasCorrect
                        ? "border-hec-leaf/30 bg-hec-leaf-tint"
                        : "border-hec-warn/30 bg-hec-warn-tint",
                    )}
                  >
                    <p
                      className={cn(
                        "text-hec-h3 font-semibold",
                        wasCorrect
                          ? "text-hec-leaf"
                          : "text-hec-warn",
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
                      <p className="mt-1 text-hec-small italic text-hec-ink-soft">
                        "{currentCard.example}"
                      </p>
                    )}
                  </div>

                  {/* Next Button */}
                  <Button
                    onClick={advance}
                    disabled={recording}
                    className="w-full"
                  >
                    {recording ? (
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="w-5 h-5" aria-hidden="true" />
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
