/**
 * WordDetailSheet — immersive breakdown of one word from the bank.
 *
 * Rich multimedia layout: the Google Custom Search image gallery fetched by
 * the pipelines, meaning (VI + EN), the student's example sentences with
 * per-sentence audio, slow/normal pronunciation, and an inline micro-quiz
 * (meaning → word multiple choice, then type-the-word spelling from audio).
 */
import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2, Turtle, Sparkles, CheckCircle2, XCircle, RotateCcw, Trophy,
} from "lucide-react";
import type { VocabularyWord } from "@/hooks/useVocabularyStore";

interface Props {
  word: VocabularyWord | null;
  bank: VocabularyWord[]; // used to build quiz distractors
  onClose: () => void;
}

function speak(text: string, rate = 0.85) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  speechSynthesis.speak(u);
}

type QuizStage = "idle" | "choice" | "spell" | "done";

export function WordDetailSheet({ word, bank, onClose }: Props) {
  const [stage, setStage] = useState<QuizStage>("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const [spelling, setSpelling] = useState("");
  const [spellResult, setSpellResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  const images: Array<{ url: string; alt?: string }> = useMemo(() => {
    if (!word) return [];
    const fromEnrichment: any[] = Array.isArray(word.enrichment?.images) ? word.enrichment.images : [];
    const all = [
      ...(word.imageUrl ? [{ url: word.imageUrl, alt: word.word }] : []),
      ...fromEnrichment.map((i: any) => ({ url: i.url || i.thumb, alt: i.alt })),
    ];
    const seen = new Set<string>();
    return all.filter((i) => i.url && !seen.has(i.url) && seen.add(i.url)).slice(0, 3);
  }, [word]);

  const choices = useMemo(() => {
    if (!word) return [];
    const distractors = bank
      .filter((w) => w.id !== word.id && w.word !== word.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.word);
    return [...distractors, word.word].sort(() => Math.random() - 0.5);
  }, [word, bank]);

  const resetQuiz = () => {
    setStage("idle");
    setPicked(null);
    setSpelling("");
    setSpellResult(null);
    setScore(0);
  };

  const handleClose = () => {
    resetQuiz();
    onClose();
  };

  if (!word) return null;

  const meaning = word.meaning || word.englishMeaning;

  return (
    <Sheet open={!!word} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-3xl font-bold capitalize">{word.word}</SheetTitle>
            {word.cefr && <Badge variant="outline">{word.cefr}</Badge>}
            {word.partOfSpeech && (
              <Badge variant="secondary" className="text-[10px]">{word.partOfSpeech}</Badge>
            )}
          </div>
          <SheetDescription className="sr-only">Word details and practice</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Pronunciation */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => speak(word.word, 0.8)}>
              <Volume2 className="h-4 w-4" />Say it
            </Button>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => speak(word.word, 0.45)}>
              <Turtle className="h-4 w-4" />Slowly
            </Button>
          </div>

          {/* Image gallery from Custom Search */}
          {images.length > 0 && (
            <div className={cn("grid gap-2", images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
              {images.map((img, i) => (
                <motion.img
                  key={img.url}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  src={img.url}
                  alt={img.alt || word.word}
                  loading="lazy"
                  className={cn(
                    "w-full object-cover rounded-2xl border",
                    images.length === 1 ? "h-44" : "h-28",
                  )}
                />
              ))}
            </div>
          )}

          {/* Meaning */}
          {meaning && (
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Meaning</p>
              <p className="text-base font-semibold mt-1">{meaning}</p>
              {word.englishMeaning && word.englishMeaning !== meaning && (
                <p className="text-sm text-muted-foreground mt-1">{word.englishMeaning}</p>
              )}
            </div>
          )}

          {/* Examples with audio */}
          {word.examples.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Your sentences</p>
              {word.examples.map((ex, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border p-3">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0 text-blue-500"
                    onClick={() => speak(ex, 0.85)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <p className="text-sm italic pt-1">"{ex}"</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Micro-quiz ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border-2 border-dashed border-violet-500/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />Quick quiz
              </p>
              {stage !== "idle" && (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={resetQuiz}>
                  <RotateCcw className="h-3 w-3" />Restart
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {stage === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    onClick={() => setStage(choices.length >= 2 ? "choice" : "spell")}
                  >
                    Test me on this word
                  </Button>
                </motion.div>
              )}

              {stage === "choice" && (
                <motion.div key="choice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  <p className="text-sm text-muted-foreground">Which word means: <span className="font-semibold text-foreground">"{meaning}"</span>?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {choices.map((c) => {
                      const isCorrect = c === word.word;
                      const isPicked = picked === c;
                      return (
                        <Button
                          key={c}
                          variant="outline"
                          disabled={!!picked}
                          className={cn(
                            "rounded-xl capitalize justify-start",
                            picked && isCorrect && "border-emerald-500 bg-emerald-500/10 text-emerald-600",
                            isPicked && !isCorrect && "border-red-500 bg-red-500/10 text-red-500",
                          )}
                          onClick={() => {
                            setPicked(c);
                            if (isCorrect) setScore((s) => s + 1);
                            setTimeout(() => setStage("spell"), 900);
                          }}
                        >
                          {picked && isCorrect && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                          {isPicked && !isCorrect && <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                          {c}
                        </Button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {stage === "spell" && (
                <motion.div key="spell" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Listen and type the word:</p>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => speak(word.word, 0.6)}>
                      <Volume2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const ok = spelling.trim().toLowerCase() === word.word.toLowerCase();
                      setSpellResult(ok);
                      if (ok) setScore((s) => s + 1);
                      setTimeout(() => setStage("done"), 900);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      autoFocus
                      value={spelling}
                      onChange={(e) => setSpelling(e.target.value)}
                      placeholder="Type what you hear…"
                      className={cn(
                        "rounded-xl",
                        spellResult === true && "border-emerald-500",
                        spellResult === false && "border-red-500",
                      )}
                      disabled={spellResult !== null}
                    />
                    <Button type="submit" className="rounded-xl" disabled={!spelling.trim() || spellResult !== null}>
                      Check
                    </Button>
                  </form>
                  {spellResult === false && (
                    <p className="text-xs text-red-500">It's spelled: <span className="font-bold">{word.word}</span></p>
                  )}
                </motion.div>
              )}

              {stage === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-3 space-y-1"
                >
                  <Trophy className={cn("h-8 w-8 mx-auto", score === 2 ? "text-amber-400" : "text-muted-foreground")} />
                  <p className="font-bold">{score}/2 correct</p>
                  <p className="text-xs text-muted-foreground">
                    {score === 2 ? "Perfect! This word is yours. 🎉" : "Keep practicing — you'll get it!"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
