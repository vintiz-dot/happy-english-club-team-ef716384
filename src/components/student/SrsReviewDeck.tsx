/**
 * SrsReviewDeck — the "Fix-It" flashcard deck.
 *
 * Cards are generated automatically by the platform: every grammar error
 * flagged in class, found in a transcript, or caught on a scanned worksheet
 * becomes a card. Scheduling uses SuperMemo-2: rating a card updates its
 * ease factor, interval and due date, and every review is logged to
 * `srs_reviews` for the growth analytics.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Layers, RotateCcw, Lightbulb, Loader2,
} from "lucide-react";
import { InkCheck } from "@/components/fx/InkCheck";
import { dur, ease, useMotionLevel } from "@/components/fx/motion";
import { useAgeBand } from "@/hooks/useAgeBand";
import { fill } from "@/lib/copy/student";
import { studentVocabCopy, type VocabCopyKey } from "@/lib/copy/studentVocab";

interface SrsCard {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  student_id: string;
  source: string;
}

/** SuperMemo-2. quality: 0-5 (we use 2=Again, 3=Hard, 4=Good, 5=Easy). */
function sm2(card: SrsCard, quality: number) {
  let { ease_factor: ef, interval_days: interval, repetitions: reps, lapses } = card;
  if (quality >= 3) {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps += 1;
  } else {
    reps = 0;
    interval = 1;
    lapses += 1;
  }
  ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const due = new Date();
  due.setDate(due.getDate() + interval);
  return { ease_factor: ef, interval_days: interval, repetitions: reps, lapses, due_date: due.toISOString() };
}

// Calm for a miss: no danger or warning colour. Only the two passing grades carry the leaf colour.
const RATINGS = [
  { label: "Again", copy: "vocab.rate.again", quality: 2, className: "border-hec-line-strong text-hec-ink hover:bg-hec-sunken" },
  { label: "Hard", copy: "vocab.rate.hard", quality: 3, className: "border-hec-line-strong text-hec-ink hover:bg-hec-sunken" },
  { label: "Good", copy: "vocab.rate.good", quality: 4, className: "border-hec-leaf/30 text-hec-leaf hover:bg-hec-leaf-tint" },
  { label: "Easy", copy: "vocab.rate.easy", quality: 5, className: "border-hec-leaf/30 text-hec-leaf hover:bg-hec-leaf-tint" },
] as const satisfies readonly { label: string; copy: VocabCopyKey; quality: number; className: string }[];

/** How long the verdict (tick, or the calm answer) stays on the card before the next one: under 300 ms. */
const VERDICT_MS = 280;

export function SrsReviewDeck() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const motionLevel = useMotionLevel();
  const { band, viBeneath } = useAgeBand();
  // The card just rated, shown with its verdict until the next card is ready. Set only after the save succeeded.
  const [verdict, setVerdict] = useState<{ card: SrsCard; knew: boolean } | null>(null);
  const verdictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (verdictTimer.current) clearTimeout(verdictTimer.current); }, []);
  const words = (key: VocabCopyKey, vars?: Record<string, string | number>) => ({
    en: fill(studentVocabCopy[key].en, vars),
    vi: fill(studentVocabCopy[key].vi, vars),
  });

  const { data: studentId } = useQuery<string | null>({
    queryKey: ["srs-student-id", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("students").select("id").eq("linked_user_id", user!.id).maybeSingle();
      return data?.id ?? null;
    },
  });

  const { data: dueCards = [], isLoading } = useQuery<SrsCard[]>({
    queryKey: ["srs-due-cards", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("srs_cards")
        .select("*")
        .eq("student_id", studentId)
        .eq("suspended", false)
        .lte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(30);
      return data || [];
    },
  });

  const current = dueCards[0] ?? null;

  const reviewMutation = useMutation({
    mutationFn: async ({ card, quality }: { card: SrsCard; quality: number }) => {
      const next = sm2(card, quality);
      const { error } = await (supabase as any)
        .from("srs_cards")
        .update({ ...next, last_reviewed_at: new Date().toISOString() })
        .eq("id", card.id);
      if (error) throw error;
      await (supabase as any).from("srs_reviews").insert({
        card_id: card.id,
        student_id: card.student_id,
        rating: quality,
        interval_before: card.interval_days,
        interval_after: next.interval_days,
      });
      return next;
    },
    onSuccess: () => {
      setDoneCount((c) => c + 1);
      setFlipped(false);
      setShowHint(false);
      queryClient.invalidateQueries({ queryKey: ["srs-due-cards", studentId] });
    },
    onError: (e: any) => toast.error("Couldn't save review", { description: e.message }),
  });

  const progressLabel = useMemo(
    () => (dueCards.length ? `${doneCount} done · ${dueCards.length} to go` : `${doneCount} done`),
    [doneCount, dueCards.length],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-hec-ink-soft" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="text-center py-16 text-hec-small text-hec-ink-soft">
        Your account isn't linked to a student profile yet — ask your teacher.
      </div>
    );
  }

  // The finish: one calm sentence. No emoji; the teen band has no picture at all.
  if (!current && !verdict) {
    const line = words(`vocab.${doneCount > 0 ? "finish" : "none"}.${band}` as VocabCopyKey);
    return (
      <div className="text-center py-16 space-y-3" role="status">
        {band !== "teen" && <InkCheck size={36} className="mx-auto text-hec-leaf" />}
        <p className="font-display text-hec-h3 font-medium text-hec-ink max-w-sm mx-auto">{line.en}</p>
        {viBeneath && <p className="text-hec-small text-hec-ink-soft max-w-sm mx-auto">{line.vi}</p>}
      </div>
    );
  }

  const shown = verdict ? verdict.card : current!;

  // Paper turn: 240 ms in all (half out, half in). Calm: cross-fade only. Off: plain swap.
  const cardMotion =
    motionLevel === "off"
      ? { initial: false as const, animate: {}, exit: undefined, transition: { duration: 0 } }
      : motionLevel === "calm"
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: dur.reveal / 2, ease } }
        : {
            initial: { rotateY: -90 },
            animate: { rotateY: 0 },
            exit: { rotateY: 90 },
            transition: { duration: dur.reveal / 2, ease },
          };

  // The verdict is shown only once the review is saved, and the next card is never held back by more than VERDICT_MS.
  const rate = (quality: number) =>
    reviewMutation.mutate(
      { card: current!, quality },
      {
        onSuccess: () => {
          setVerdict({ card: current!, knew: quality >= 3 });
          if (verdictTimer.current) clearTimeout(verdictTimer.current);
          verdictTimer.current = setTimeout(() => setVerdict(null), VERDICT_MS);
        },
      },
    );

  const verdictLine = verdict ? words(verdict.knew ? "vocab.knew" : "vocab.again") : null;
  const reveal = words("vocab.tapToReveal");
  const showAnswer = words("vocab.showAnswer");

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-hec-small font-semibold text-hec-ink flex items-center gap-2">
          <Layers className="h-4 w-4 text-hec-brass" />Fix-It Deck
        </p>
        <Badge variant="secondary">{progressLabel}</Badge>
      </div>

      {/* Flip card */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={shown.id + (verdict ? "-v" : flipped ? "-b" : "-f")}
          {...cardMotion}
          style={motionLevel === "full" ? { transformPerspective: 900 } : undefined}
          className="rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1 min-h-[220px] p-6 flex flex-col cursor-pointer select-none"
          onClick={() => !verdict && !flipped && setFlipped(true)}
        >
          {verdict && verdictLine ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3" role="status">
              {verdict.knew && <InkCheck size={36} className="text-hec-leaf" label={verdictLine.en} />}
              <p className="whitespace-pre-line text-hec-h3 text-hec-ink font-medium">{verdict.card.back}</p>
              <p className="text-hec-small text-hec-ink-soft">
                {verdictLine.en}
                {viBeneath && <span className="block">{verdictLine.vi}</span>}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-hec-caption uppercase tracking-wider">
                  {flipped ? "Answer" : shown.source === "vocab" ? "Vocabulary" : "Fix the error"}
                </Badge>
                {!flipped && shown.hint && (
                  <Button
                    variant="ghost" size="sm" className="min-h-hec-target gap-1 text-hec-caption text-hec-warn"
                    onClick={(e) => { e.stopPropagation(); setShowHint((h) => !h); }}
                  >
                    <Lightbulb className="h-3.5 w-3.5" />Hint
                  </Button>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center text-center">
                <p className={`whitespace-pre-line text-hec-h3 ${flipped ? "text-hec-leaf font-semibold" : "text-hec-ink font-medium"}`}>
                  {flipped ? shown.back : shown.front}
                </p>
              </div>

              {!flipped && showHint && shown.hint && (
                <p className="text-hec-caption text-hec-warn text-center mt-2">{shown.hint}</p>
              )}
              {!flipped && (
                <p className="text-hec-caption text-hec-ink-soft text-center mt-3">
                  {reveal.en}
                  {viBeneath && <span className="block">{reveal.vi}</span>}
                </p>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Ratings */}
      {verdict ? null : flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => {
            const w = words(r.copy);
            return (
              <Button
                key={r.label}
                variant="outline"
                disabled={reviewMutation.isPending}
                className={`min-h-hec-target h-auto flex-col gap-0 whitespace-normal rounded-hec-md px-2 py-2 font-semibold ${r.className}`}
                onClick={() => rate(r.quality)}
              >
                {w.en}
                {viBeneath && <span className="text-hec-caption font-normal">{w.vi}</span>}
              </Button>
            );
          })}
        </div>
      ) : (
        <Button variant="outline" className="min-h-hec-target h-auto w-full whitespace-normal rounded-hec-md gap-2" onClick={() => setFlipped(true)}>
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span>
            {showAnswer.en}
            {viBeneath && <span className="block text-hec-caption font-normal">{showAnswer.vi}</span>}
          </span>
        </Button>
      )}
    </div>
  );
}
