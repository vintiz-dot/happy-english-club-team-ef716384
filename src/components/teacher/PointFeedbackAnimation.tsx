import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";
import { claimToken, releaseToken } from "@/components/fx/flight";
import { dur, easeDraw, ease, useMotionLevel } from "@/components/fx/motion";

interface FeedbackItem {
  id: string;
  points: number;
  icon: LucideIcon;
  color: string;
  count?: number;
  /** the child the award is for (the token flies to their avatar) */
  studentId?: string;
  /** where the teacher tapped (viewport px); the token flies from here */
  origin?: { x: number; y: number } | null;
}

interface PointFeedbackAnimationProps {
  feedbacks: FeedbackItem[];
  onComplete: (id: string) => void;
}

const label = (f: FeedbackItem) => {
  const positive = f.points > 0;
  return f.count && f.count > 1 ? `${positive ? "+" : ""}${f.points} × ${f.count}` : `${positive ? "+" : ""}${f.points}`;
};

/**
 * One point token (docs/EXPERIENCE_DESIGN_BRIEF.md C4), drawn over the whole screen and never in the way of a tap.
 *   full   a brass token flies from the tapped skill to the child's avatar in 420 ms, and the avatar gives one soft
 *          pulse of light as it lands. Removing points: an ink token leaves the avatar and fades. No shake, no red.
 *   calm   the token appears at the avatar and fades (240 ms): no travel, no pulse.
 *   off    nothing is drawn; the child's total on the card is the news.
 * At most 6 tokens are in the air: beyond that the numbers update and the flight is skipped. The saved points and
 * the card's total do not depend on any of this; the token is the same state change the card already had.
 */
function Token({ feedback, onComplete }: { feedback: FeedbackItem; onComplete: (id: string) => void }) {
  const level = useMotionLevel();
  const Icon = feedback.icon;
  const positive = feedback.points > 0;
  const [plan, setPlan] = useState<{ from: { x: number; y: number }; to: { x: number; y: number }; ring: number } | null>(null);
  const done = useRef(false);
  const claimed = useRef(false);

  // Ends the token once: gives its place in the air back, then tells the card the feedback is over.
  const finish = () => {
    if (done.current) return;
    done.current = true;
    if (claimed.current) releaseToken();
    claimed.current = false;
    onComplete(feedback.id);
  };

  // A layout effect: the token's place is worked out before the first paint, so it appears on the very next frame.
  useLayoutEffect(() => {
    // Rapid awards never queue: a token that cannot be drawn at once is simply not drawn (the totals still update).
    if (level === "off" || !claimToken()) {
      finish();
      return;
    }
    claimed.current = true;
    const card = feedback.studentId ? document.querySelector<HTMLElement>(`[data-student-card="${feedback.studentId}"]`) : null;
    if (!card) {
      finish();
      return;
    }
    const avatar = card.querySelector<HTMLElement>('[class*="h-14"]') ?? card;
    const a = avatar.getBoundingClientRect();
    const to = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
    setPlan({ from: feedback.origin && level === "full" && positive ? feedback.origin : to, to, ring: Math.max(a.width, 40) });
    return () => {
      if (claimed.current) releaseToken();
      claimed.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan) return null;
  const full = level === "full";
  const travel = full && positive && !!feedback.origin;
  const pillClass = positive
    ? "bg-hec-brass-fill text-hec-on-brass"
    : "bg-hec-action text-hec-on-action";

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      {/* the brass pulse of light on the avatar: one soft 2 px edge, only when a positive token lands (full) */}
      {full && positive && (
        <motion.span
          className="absolute rounded-full border-2 border-hec-brass"
          style={{ left: plan.to.x - plan.ring / 2, top: plan.to.y - plan.ring / 2, width: plan.ring, height: plan.ring }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
          transition={{ delay: travel ? dur.page : 0, duration: dur.reveal, ease: easeDraw }}
        />
      )}
      <motion.div
        className={`absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-hec-small font-semibold tabular-nums shadow-hec-2 ${pillClass}`}
        style={{ translateX: "-50%", translateY: "-50%" }}
        initial={{ x: plan.from.x, y: plan.from.y, opacity: travel ? 1 : 0, scale: travel ? 0.9 : 1 }}
        animate={
          travel
            ? { x: plan.to.x, y: plan.to.y, opacity: [1, 1, 0], scale: 1 }
            : positive || !full
              ? { x: plan.to.x, y: plan.to.y, opacity: [0, 1, 0] }
              : { x: plan.to.x, y: plan.to.y - 20, opacity: [1, 1, 0] }
        }
        transition={
          travel
            ? { x: { duration: dur.page, ease }, y: { duration: dur.page, ease }, scale: { duration: dur.page, ease }, opacity: { duration: dur.page + dur.press, times: [0, dur.page / (dur.page + dur.press), 1] } }
            : { duration: full ? dur.page : dur.reveal, ease }
        }
        onAnimationComplete={finish}
      >
        <Icon className="h-4 w-4" />
        <span>{label(feedback)}</span>
      </motion.div>
    </div>,
    document.body,
  );
}

export function PointFeedbackAnimation({ feedbacks, onComplete }: PointFeedbackAnimationProps) {
  const ivory = useIvory();
  if (ivory) {
    return (
      <>
        {feedbacks.map((f) => (
          <Token key={f.id} feedback={f} onComplete={onComplete} />
        ))}
      </>
    );
  }
  return (
    <AnimatePresence>
      {feedbacks.map((feedback) => {
        const Icon = feedback.icon;
        const isPositive = feedback.points > 0;
        const displayText = label(feedback);

        return (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: -30 }}
            exit={{ opacity: 0, y: -80, scale: 0.8 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => onComplete(feedback.id)}
            className="absolute -top-2 left-0 right-0 flex justify-center pointer-events-none z-50"
          >
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-lg shadow-hec-2 ${
                isPositive
                  ? "bg-hec-leaf text-hec-paper"
                  : "bg-hec-danger-fill text-hec-on-danger"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{displayText}</span>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
