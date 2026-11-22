/**
 * The page turns: paper slides away to reveal the new layout, with one line (docs/EXPERIENCE_DESIGN_BRIEF.md F3).
 * Plays once per student per school year (see useMovingUp). It is skippable by doing nothing, and a tap skips it
 * sooner. At motion level "off" it is not drawn at all (the moment is recorded as seen). Loaded lazily.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bi } from "@/components/student/band/Bi";
import { dur, ease, useMotionLevel } from "@/components/fx/motion";

const HOLD_MS = 1800;

export default function MovingUpMoment({ onDone }: { onDone: () => void }) {
  const level = useMotionLevel();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (level === "off") {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setLeaving(true), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [level, onDone]);

  if (level === "off") return null;
  return (
    <motion.div
      role="status"
      onClick={() => setLeaving(true)}
      initial={{ y: 0 }}
      animate={{ y: leaving ? "-100%" : 0 }}
      transition={{ duration: dur.page, ease }}
      onAnimationComplete={() => leaving && onDone()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-hec-paper px-8 text-center text-hec-ink"
    >
      <h2 className="max-w-md font-display text-hec-h1 font-medium">
        <Bi k="moving.line" />
      </h2>
    </motion.div>
  );
}
