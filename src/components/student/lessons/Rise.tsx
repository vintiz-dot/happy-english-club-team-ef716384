/**
 * Rise - one item of a page's first arrival of the day (docs/DESIGN_SYSTEM.md s.9b), inside <Arrive>.
 * full: opacity and an 8 px rise, staggered; calm: opacity only, all together; off: nothing. After the day's
 * first arrival, or past the eighth item of a long list, it renders as a plain div. Never blocks input.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useIsFirstArrival } from "@/components/fx/Arrive";
import { dur, ease, stagger, useMotionLevel } from "@/components/fx/motion";

export function Rise({ index = 0, className, children }: { index?: number; className?: string; children: ReactNode }) {
  const level = useMotionLevel();
  const first = useIsFirstArrival();
  if (!first || level === "off" || index >= 8) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={level === "full" ? { opacity: 0, y: 8 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.reveal, ease, delay: level === "full" ? stagger(index) : 0 }}
    >
      {children}
    </motion.div>
  );
}
