/**
 * LiveDot - the breathing brass dot for "happening now" (Brass material).
 *
 * Opacity 0.55 to 1 over 2.4 s. It is a loop, so it asks for a slot from
 * useLoopSlot: it breathes only at motion level "full", only while it is on
 * screen and the tab is visible, and never as a third loop on a page. When it
 * does not breathe it is a steady dot. It always sits next to words that say
 * what is live ("In Progress"); pass `label` where it does not.
 */
import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLoopSlot } from "./motion";

export function LiveDot({ className, label }: { className?: string; label?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const breathing = useLoopSlot(ref);
  return (
    <span ref={ref} className={cn("inline-flex shrink-0", className)}>
      <motion.span
        aria-hidden="true"
        className="block h-2 w-2 rounded-full bg-hec-brass"
        animate={breathing ? { opacity: [0.55, 1, 0.55] } : { opacity: 1 }}
        transition={breathing ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
