/**
 * InkCheck - a tick that draws itself (Ink material, DESIGN_SYSTEM s.9b).
 *
 * The stroke is drawn with SVG pathLength in 240 ms on --hec-ease-draw. It
 * takes its colour from the text colour around it (`text-hec-leaf` for done,
 * `text-hec-warn` for late), so the state is never carried by the animation
 * alone: pass `label` where the tick is the only sign of a state. At motion
 * level "off" (which a reduced-motion device forces) it appears already drawn.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dur, easeDraw, useMotionLevel } from "./motion";

export interface InkCheckProps {
  /** true draws the tick; false leaves it undrawn (a toggle) */
  drawn?: boolean;
  /** px */
  size?: number;
  className?: string;
  /** words for a screen reader; without one the tick is decoration */
  label?: string;
}

export function InkCheck({ drawn = true, size = 20, className, label }: InkCheckProps) {
  const instant = useMotionLevel() === "off";
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          initial={instant ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
          transition={instant ? { duration: 0 } : { duration: dur.reveal, ease: easeDraw }}
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
