import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

interface CelebrationOverlayProps {
  show: boolean;
  type?: "level_up" | "streak" | "achievement" | "challenge_complete";
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
}

const celebrationConfig = {
  level_up: { emoji: "🎉", sound: "levelUp" },
  streak: { emoji: "🔥", sound: "streak" },
  achievement: { emoji: "🏆", sound: "achievement" },
  challenge_complete: { emoji: "✅", sound: "complete" },
};

/** One reward moment (DESIGN_SYSTEM s.9): a single card that fades in over 0.24 s, stays under 1.2 s in all,
 *  and is skippable by a tap anywhere or Escape. No confetti, no bursts, no loops. */
const SHOW_MS = 1100;

export function CelebrationOverlay({
  show,
  type = "level_up",
  title = "Amazing!",
  subtitle = "You did it!",
  onComplete
}: CelebrationOverlayProps) {
  const config = celebrationConfig[type];
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!show) return;
    // Auto-dismiss: the whole moment is under 1.2 s
    const timer = setTimeout(() => {
      onComplete?.();
    }, SHOW_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, onComplete]);

  const rise = reduced ? { opacity: 0 } : { opacity: 0, y: 8 };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center p-4"
          onClick={() => onComplete?.()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Scrim: solid, no blur */}
          <div className="absolute inset-0 bg-hec-scrim/60" />

          {/* The one card */}
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-hec-lg border border-hec-line bg-hec-raised p-8 text-center shadow-hec-3"
            initial={rise}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 text-6xl" aria-hidden="true">
              {config.emoji}
            </div>
            <h2 className="mb-2 font-display text-hec-h1 font-medium text-hec-ink">
              {title}
            </h2>
            <p className="text-hec-body text-hec-ink-soft">
              {subtitle}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
