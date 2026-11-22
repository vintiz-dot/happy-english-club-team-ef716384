/**
 * Pip, the HEC mascot, as a child meets him on the student home (docs/MASCOT.md, brief I2).
 *
 * - The picture is a finished pose file in public/mascot/ shown as an <img> (never redrawn or recoloured here):
 *   hello pip.svg, encouraging (homework waiting), celebrating (all done), excited, happy; under 64 px the badge.
 * - Size follows the child's band: early 144, young 112, junior 72, teen 40 (and only if chosen). Width and
 *   height are set, so nothing shifts while it loads.
 * - Motion is on the wrapper only: a 6 px breathing rise over 3.4 s at motion level "full" (one of the page's
 *   two loops, paused off screen), and a `reward` spring hop when the mood changes. Nothing at "calm" or "off".
 * - His lines come from pools by what is true today, picked by the day and the child. He is always pleased to
 *   see the child, praises what was done, and never says he missed them, that a streak is in danger, or asks them
 *   to come back (brief I2, I4).
 * - Pip is never drawn on a tuition, payment or destructive screen: this component is for the student home.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";
import { reward, useLoopSlot, useMotionLevel } from "@/components/fx/motion";
import { useAgeBand } from "@/hooks/useAgeBand";
import { useCopy } from "@/lib/copy/useCopy";
import { pipPools, type StudentCopyKey } from "@/lib/copy/student";
import { dayjs } from "@/lib/date";

type Mood = "hello" | "happy" | "encouraging" | "excited" | "celebrating" | "loving";

interface MascotCompanionProps {
  /** kept for older callers; Pip's lines do not use the name (the page greets the child by it) */
  studentName?: string;
  streak?: number;
  /** kept for older callers; Pip no longer wears the level */
  level?: number;
  /** null: not known yet (loading or a failed read) - Pip then says nothing about homework. */
  pendingHomework?: number | null;
  /** px; by default from the child's band */
  size?: number;
  /** Draw his line in this element (a row in the flow) instead of beside him. */
  messageSlot?: HTMLElement | null;
  /** Draw no line at all, only the picture. */
  silent?: boolean;
  className?: string;
}

const SIZE_OF = { early: 144, young: 112, junior: 72, teen: 40 } as const;

/** A small stable number from a string, so "the line of the day" does not change on every render. */
function seedOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

const poseUrl = (mood: Mood, size: number) =>
  size < 64 ? "/mascot/pip-badge.svg" : mood === "hello" ? "/mascot/pip.svg" : `/mascot/pip-${mood}.svg`;

export function MascotCompanion({ streak = 0, pendingHomework = 0, size, messageSlot, silent = false, className }: MascotCompanionProps) {
  const { band, studentId, showPip } = useAgeBand();
  const { en, vi, beneath } = useCopy();
  const level = useMotionLevel();
  const [bump, setBump] = useState(0);

  // What is true today decides the pool; the day and the child pick the line.
  const choice = useMemo(() => {
    const day = dayjs().tz().format("YYYY-MM-DD");
    let pool: readonly StudentCopyKey[];
    let mood: Mood;
    if (pendingHomework === null) {
      pool = pipPools.hello;
      mood = "hello";
    } else if (pendingHomework === 0) {
      pool = pipPools.done;
      mood = "celebrating";
    } else {
      pool = pipPools.homework;
      mood = "encouraging";
    }
    // Junior: a run of days is something he can be glad about. Never framed as something to lose.
    if (band === "junior" && streak >= 7 && pendingHomework !== 0) {
      pool = [...pool, ...pipPools.days];
    }
    const index = (seedOf(`${day}:${studentId ?? ""}`) + bump) % pool.length;
    const key = pool[index];
    return { key, mood: key === "pip.days.1" ? ("excited" as Mood) : mood };
  }, [pendingHomework, streak, band, studentId, bump]);

  const px = size ?? SIZE_OF[band];

  // A hop when the mood changes (not on first paint): the reward spring, on the wrapper.
  const hop = useAnimationControls();
  const lastMood = useRef<Mood | null>(null);
  useEffect(() => {
    const before = lastMood.current;
    lastMood.current = choice.mood;
    if (before !== null && before !== choice.mood && level === "full") {
      hop.start({ y: -14, transition: reward }).then(() => hop.start({ y: 0, transition: reward }));
    }
  }, [choice.mood, level, hop]);

  // The breathing rise: a loop, so it asks for a slot (full only, on screen, tab visible, at most two on a page).
  const frame = useRef<HTMLDivElement>(null);
  const breathing = useLoopSlot(frame);

  if (!showPip) return null;

  const line = (
    <p role="status" className="rounded-hec-md border border-hec-line bg-hec-paper px-4 py-3 text-hec-body text-hec-ink">
      {en(choice.key, { n: streak })}
      {beneath && (
        <span lang="vi" className="mt-1 block text-hec-small text-hec-ink-soft">
          {vi(choice.key, { n: streak })}
        </span>
      )}
    </p>
  );

  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-3", className)}>
      <motion.div ref={frame} animate={breathing ? { y: [0, -6, 0] } : { y: 0 }} transition={breathing ? { duration: 3.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}>
        <motion.button
          type="button"
          animate={hop}
          onClick={() => setBump((n) => n + 1)}
          aria-label={en(choice.key, { n: streak })}
          className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
        >
          <img src={poseUrl(choice.mood, px)} width={px} height={px} alt="" draggable={false} className="block select-none" />
        </motion.button>
      </motion.div>
      {!silent && (messageSlot ? createPortal(line, messageSlot) : line)}
    </div>
  );
}
