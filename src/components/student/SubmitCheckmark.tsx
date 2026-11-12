import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";

interface SubmitCheckmarkProps {
  show: boolean;
  onComplete?: () => void;
}

export function SubmitCheckmark({ show, onComplete }: SubmitCheckmarkProps) {
  const ivory = useIvory();

  // "Ivory" design system: one calm confirmation, a fade only (DS s.9), solid scrim.
  if (ivory) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-hec-scrim/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onAnimationComplete={() => {
              setTimeout(() => onComplete?.(), 800);
            }}
          >
            <div
              role="status"
              className="flex flex-col items-center gap-3 rounded-hec-lg border border-hec-line bg-hec-raised px-8 py-6 shadow-hec-3"
            >
              <CheckCircle2 className="h-12 w-12 text-hec-leaf" aria-hidden />
              <p className="font-display text-hec-h2 font-medium text-hec-ink">Submitted! ✨</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={() => {
            setTimeout(() => onComplete?.(), 800);
          }}
        >
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            </motion.div>
            <motion.p
              className="text-lg font-bold text-emerald-700 dark:text-emerald-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Submitted! ✨
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
