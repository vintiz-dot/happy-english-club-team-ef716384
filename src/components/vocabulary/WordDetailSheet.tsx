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
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="min-w-0 break-words font-display text-hec-display font-medium capitalize text-hec-ink">{word.word}</SheetTitle>
            {word.cefr && <Badge variant="outline">{word.cefr}</Badge>}
            {word.partOfSpeech && (
              <Badge variant="secondary">{word.partOfSpeech}</Badge>
            )}
          </div>
          <SheetDescription className="sr-only">Word details and practice</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Pronunciation */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => speak(word.word, 0.8)}>
              <Volume2 className="h-4 w-4" />Say it
            </Button>
            <Button variant="outline" size="sm" onClick={() => speak(word.word, 0.45)}>
              <Turtle className="h-4 w-4" />Slowly
            </Button>
          </div>

          {/* Image gallery from Custom Search */}
          {images.length > 0 && (
            <div className={cn("grid gap-2", images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
              {images.map((img) => (
                <motion.img
                  key={img.url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={img.url}
                  alt={img.alt || word.word}
                  loading="lazy"
                  className={cn(
                    "w-full rounded-hec-md border border-hec-line object-cover",
                    images.length === 1 ? "h-44" : "h-28",
                  )}
                />
              ))}
            </div>
          )}

          {/* Meaning */}
          {meaning && (
            <div className="rounded-hec-md bg-hec-sunken p-4">
              <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">Meaning</p>
              <p className="mt-1 text-hec-body font-medium text-hec-ink">{meaning}</p>
              {word.englishMeaning && word.englishMeaning !== meaning && (
                <p className="mt-1 text-hec-small text-hec-ink-soft">{word.englishMeaning}</p>
              )}
            </div>
          )}

          {/* Examples with audio */}
          {word.examples.length > 0 && (
            <div className="space-y-2">
              <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">Your sentences</p>
              {word.examples.map((ex, i) => (
                <div key={i} className="flex items-start gap-2 rounded-hec-md border border-hec-line p-2">
                  <Button
                    variant="ghost" size="icon"
                    className="shrink-0 text-hec-ink-soft"
                    onClick={() => speak(ex, 0.85)}
                    aria-label="Listen to this sentence"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  <p className="min-w-0 pt-2 text-hec-body italic text-hec-ink">"{ex}"</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Micro-quiz ─────────────────────────────────────────────── */}
          <div className="space-y-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-hec-body font-semibold text-hec-ink">
                <Sparkles className="h-4 w-4 text-hec-brass" />Quick quiz
              </p>
              {stage !== "idle" && (
                <Button variant="ghost" size="sm" onClick={resetQuiz}>
                  <RotateCcw className="h-4 w-4" />Restart
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {stage === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button
                    className="w-full"
                    onClick={() => setStage(choices.length >= 2 ? "choice" : "spell")}
                  >
                    Test me on this word
                  </Button>
                </motion.div>
              )}

              {stage === "choice" && (
                <motion.div key="choice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  <p className="text-hec-small text-hec-ink-soft">Which word means: <span className="font-semibold text-hec-ink">"{meaning}"</span>?</p>
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
                            "h-auto justify-start whitespace-normal text-left capitalize",
                            picked && isCorrect && "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf disabled:opacity-100",
                            isPicked && !isCorrect && "border-hec-danger/30 bg-hec-danger-tint text-hec-danger disabled:opacity-100",
                          )}
                          onClick={() => {
                            setPicked(c);
                            if (isCorrect) setScore((s) => s + 1);
                            setTimeout(() => setStage("spell"), 900);
                          }}
                        >
                          {picked && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                          {isPicked && !isCorrect && <XCircle className="h-4 w-4" />}
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
                    <p className="text-hec-small text-hec-ink-soft">Listen and type the word:</p>
                    <Button variant="outline" size="icon" onClick={() => speak(word.word, 0.6)} aria-label="Listen to the word">
                      <Volume2 className="h-4 w-4" />
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
                      aria-label="Type the word you hear"
                      className={cn(
                        "min-w-0",
                        spellResult === true && "border-hec-leaf",
                        spellResult === false && "border-hec-danger",
                      )}
                      disabled={spellResult !== null}
                    />
                    <Button type="submit" className="w-auto shrink-0" disabled={!spelling.trim() || spellResult !== null}>
                      Check
                    </Button>
                  </form>
                  {spellResult === false && (
                    <p className="text-hec-small text-hec-danger">It's spelled: <span className="font-bold">{word.word}</span></p>
                  )}
                </motion.div>
              )}

              {stage === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1 py-3 text-center"
                >
                  <Trophy className={cn("mx-auto h-8 w-8", score === 2 ? "text-hec-brass" : "text-hec-ink-faint")} />
                  <p className="text-hec-body font-semibold tabular-nums text-hec-ink">{score}/2 correct</p>
                  <p className="text-hec-small text-hec-ink-soft">
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
