/**
 * Seal - the signature completion mark (DESIGN_SYSTEM s.9b).
 *
 * A brass ring closes clockwise (420 ms), an ink tick draws inside it (240 ms),
 * and the ring gives one soft pulse of light as it finishes: all done by 700 ms.
 * The label is real text for a screen reader (a polite live region), and
 * `visibleLabel` shows it too. It plays once each time `show` turns true;
 * at motion level "off" it appears finished, with no pulse. "calm" keeps it.
 *
 * Use it only for a real completion of the person's own work (design brief B8:
 * no more than one signature moment per screen visit). Never on money.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dur, easeDraw, useMotionLevel } from "./motion";

export interface SealProps {
  show: boolean;
  /** what was completed, e.g. "All graded" */
  label: string;
  /** px */
  size?: number;
  /** also draw the label as visible text beside the mark */
  visibleLabel?: boolean;
  className?: string;
}

const RING_S = 0.42;
const TICK_S = 0.24;
const PULSE_S = 0.26;

export function Seal({ show, label, size = 40, visibleLabel = false, className }: SealProps) {
  const instant = useMotionLevel() === "off";
  const c = 20;
  const r = 17;
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      {show && (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
          <g transform={`rotate(-90 ${c} ${c})`}>
            <circle cx={c} cy={c} r={r} strokeWidth={2} className="stroke-hec-line" />
            <motion.circle
              cx={c}
              cy={c}
              r={r}
              strokeWidth={2}
              strokeLinecap="round"
              className="stroke-hec-brass"
              initial={instant ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={instant ? { duration: 0 } : { duration: RING_S, ease: easeDraw }}
            />
            {!instant && (
              // one soft pulse of light: a 2 px brass edge that widens and fades, never a halo
              <motion.circle
                cx={c}
                cy={c}
                r={r}
                strokeWidth={2}
                className="stroke-hec-brass"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 1.28], opacity: [0.55, 0] }}
                transition={{ delay: dur.signature - PULSE_S, duration: PULSE_S, ease: easeDraw }}
              />
            )}
          </g>
          <motion.path
            d="M12.5 20.5l5 5 10-11"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-hec-ink"
            initial={instant ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={instant ? { duration: 0 } : { delay: RING_S, duration: TICK_S, ease: easeDraw }}
          />
        </svg>
      )}
      {show && (visibleLabel ? <span className="text-hec-small font-medium text-hec-ink">{label}</span> : <span className="sr-only">{label}</span>)}
    </span>
  );
}
