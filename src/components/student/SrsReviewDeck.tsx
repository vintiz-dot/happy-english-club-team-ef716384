/**
 * SrsReviewDeck — the "Fix-It" flashcard deck.
 *
 * Cards are generated automatically by the platform: every grammar error
 * flagged in class, found in a transcript, or caught on a scanned worksheet
 * becomes a card. Scheduling uses SuperMemo-2: rating a card updates its
 * ease factor, interval and due date, and every review is logged to
 * `srs_reviews` for the growth analytics.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Layers, PartyPopper, RotateCcw, Lightbulb, Loader2,
} from "lucide-react";

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

const RATINGS = [
  { label: "Again", quality: 2, className: "border-red-500/40 text-red-500 hover:bg-red-500/10" },
  { label: "Hard", quality: 3, className: "border-amber-500/40 text-amber-600 hover:bg-amber-500/10" },
  { label: "Good", quality: 4, className: "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10" },
  { label: "Easy", quality: 5, className: "border-blue-500/40 text-blue-600 hover:bg-blue-500/10" },
] as const;

export function SrsReviewDeck() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        Your account isn't linked to a student profile yet — ask your teacher.
      </div>
    );
  }

  if (!current) {
    return (
      <div className="text-center py-16 space-y-3">
        <PartyPopper className="h-10 w-10 mx-auto text-amber-400" />
        <h3 className="text-lg font-bold">All caught up!</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {doneCount > 0
            ? `You reviewed ${doneCount} card${doneCount === 1 ? "" : "s"} today. New cards appear here automatically when your teacher flags something to practice.`
            : "No cards due. Cards are created automatically from things flagged in class — check back after your next lesson!"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-500" />Fix-It Deck
        </p>
        <Badge variant="secondary">{progressLabel}</Badge>
      </div>

      {/* Flip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + (flipped ? "-b" : "-f")}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="rounded-3xl border-2 bg-card shadow-md min-h-[220px] p-6 flex flex-col cursor-pointer select-none"
          onClick={() => !flipped && setFlipped(true)}
        >
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-[10px] uppercase">
              {flipped ? "Answer" : current.source === "vocab" ? "Vocabulary" : "Fix the error"}
            </Badge>
            {!flipped && current.hint && (
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs text-amber-600"
                onClick={(e) => { e.stopPropagation(); setShowHint((h) => !h); }}
              >
                <Lightbulb className="h-3.5 w-3.5" />Hint
              </Button>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center text-center">
            <p className={`whitespace-pre-line ${flipped ? "text-emerald-600 font-semibold text-lg" : "text-lg font-medium"}`}>
              {flipped ? current.back : current.front}
            </p>
          </div>

          {!flipped && showHint && current.hint && (
            <p className="text-xs text-amber-600 text-center mt-2">{current.hint}</p>
          )}
          {!flipped && (
            <p className="text-[11px] text-muted-foreground text-center mt-3">tap to reveal</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Ratings */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <Button
              key={r.label}
              variant="outline"
              disabled={reviewMutation.isPending}
              className={`rounded-xl font-semibold ${r.className}`}
              onClick={() => reviewMutation.mutate({ card: current, quality: r.quality })}
            >
              {r.label}
            </Button>
          ))}
        </div>
      ) : (
        <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => setFlipped(true)}>
          <RotateCcw className="h-4 w-4" />Show answer
        </Button>
      )}
    </div>
  );
}
