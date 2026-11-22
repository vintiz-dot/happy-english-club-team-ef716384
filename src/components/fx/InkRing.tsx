/**
 * InkRing - a progress ring whose stroke grows (Ink drawn in Leaf; Brass when
 * complete). It renders what it is given: `value` of `max`. Put the figure in
 * text beside it or as `children` (design system s.15: a bar or ring is never
 * alone). The ring is announced as "value of max".
 */
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dur, easeDraw, useMotionLevel } from "./motion";

export interface InkRingProps {
  value: number;
  max: number;
  /** px */
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** centred inside the ring, e.g. the figure */
  children?: ReactNode;
  /** overrides the spoken "value of max" */
  label?: string;
}

export function InkRing({ value, max, size = 48, strokeWidth = 4, className, children, label }: InkRingProps) {
  const instant = useMotionLevel() === "off";
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const complete = max > 0 && value >= max;
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  return (
    <span
      role="img"
      aria-label={label ?? `${value} of ${max}`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
        {/* the stroke starts at twelve o'clock and runs clockwise */}
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} strokeWidth={strokeWidth} className="stroke-hec-line" />
          <motion.circle
            cx={c}
            cy={c}
            r={r}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={complete ? "stroke-hec-brass" : "stroke-hec-leaf"}
            initial={instant ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: fraction, opacity: fraction === 0 ? 0 : 1 }}
            transition={instant ? { duration: 0 } : { duration: dur.page, ease: easeDraw }}
          />
        </g>
      </svg>
      {children != null && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-hec-caption tabular-nums text-hec-ink">
          {children}
        </span>
      )}
    </span>
  );
}
