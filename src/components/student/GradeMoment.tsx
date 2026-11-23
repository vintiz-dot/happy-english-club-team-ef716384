/**
 * The moment a teacher's grade reaches a child (docs/EXPERIENCE_DESIGN_BRIEF.md G2 to G5, Phase 7 round 1).
 * ONE moment per visit: the newest grade the teacher marked. It shows only the teacher's own grade and, when the
 * data the page already holds has it, the teacher's words, unedited. Nothing here is computed or invented.
 *   early   Pip (celebrating), large, on the reward spring, in under 1.2 s
 *   young   Pip (excited) and up to 24 small paper pieces in brass and leaf that fall once and settle, under 1.2 s
 *   junior  a card on the reward spring, under 1 s, no falling pieces
 *   teen    a Seal and one serif line, no mascot, no emoji
 * Closes by a tap anywhere, Escape or the Close button; focus goes to Close and comes back. Motion level "calm" is
 * a fade only, "off" a still card.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Seal } from "@/components/fx/Seal";
import { Bi } from "@/components/student/band/Bi";
import { useAgeBand } from "@/hooks/useAgeBand";
import { useCopy } from "@/lib/copy/useCopy";
import { dur, ease, reward, useMotionLevel } from "@/components/fx/motion";
import { BUTTON, FOCUS } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";

export interface GradeMomentProps {
  grade: string;
  title: string;
  className: string;
  /** the teacher's own words from the submission the page already holds, shown unedited */
  feedback?: string | null;
  /** how many other grades were marked and wait behind this one */
  more: number;
  onClose: () => void;
}

// Paper pieces: fixed positions and colours (no randomness: the same every time), brass and leaf only.
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  x: ((i * 37) % 100) - 4,
  rest: 6 + ((i * 53) % 44),
  turn: ((i * 71) % 90) - 45,
  delay: (i % 8) * 0.035,
  tone: i % 3 === 0 ? "bg-hec-leaf" : "bg-hec-brass",
}));

export function GradeMoment({ grade, title, className, feedback, more, onClose }: GradeMomentProps) {
  const { band } = useAgeBand();
  const { en } = useCopy();
  const level = useMotionLevel();
  const closeRef = useRef<HTMLButtonElement>(null);
  const full = level === "full";
  const still = level === "off";

  // focus: to Close while it is up, and back to where it was
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (before && before.isConnected) before.focus({ preventScroll: true });
    };
  }, [onClose]);

  // one entrance per band; calm is a fade, off is none
  const cardMotion = still
    ? { initial: false as const, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0 } }
    : !full
      ? { initial: { opacity: 0 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: dur.reveal, ease } }
      : band === "teen"
        ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: dur.reveal, ease } }
        : { initial: { opacity: 0, y: 16, scale: 0.94 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: reward };

  const pip = band === "early" ? "/mascot/pip-celebrating.svg" : band === "young" ? "/mascot/pip-excited.svg" : null;
  const pipSize = band === "early" ? 168 : 112;
  const line = en("grade.line", { grade });

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${en("grade.marked")} ${line}`}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center p-4"
      onClick={onClose}
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: still ? 0 : dur.reveal, ease }}
    >
      <div className="absolute inset-0 bg-hec-scrim/60" />
      <motion.div
        className="relative z-10 w-full max-w-sm rounded-hec-lg border border-hec-line bg-hec-raised p-6 text-center shadow-hec-3 sm:p-8"
        {...cardMotion}
      >
        {band === "young" && full && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 h-24">
            {PIECES.map((p, i) => (
              <motion.span
                key={i}
                className={cn("absolute block h-3 w-1.5 rounded-[1px]", p.tone)}
                style={{ left: `${p.x}%` }}
                initial={{ y: -130, opacity: 0, rotate: p.turn * 3 }}
                animate={{ y: p.rest, opacity: 1, rotate: p.turn }}
                transition={{ duration: 0.8, delay: p.delay, ease }}
              />
            ))}
          </div>
        )}

        {pip && (
          <motion.img
            src={pip}
            width={pipSize}
            height={pipSize}
            alt=""
            draggable={false}
            className="mx-auto mb-3 block select-none"
            initial={full ? { y: 14 } : false}
            animate={{ y: 0 }}
            transition={full ? reward : { duration: 0 }}
          />
        )}
        {band === "teen" && <Seal show label={line} className="mx-auto mb-3" size={44} />}

        <p className="text-hec-small text-hec-ink-soft"><Bi k="grade.marked" /></p>
        <p className="mt-2 break-words font-display text-hec-h1 font-medium text-hec-ink">{line}</p>
        <p className="mt-1 whitespace-normal break-words text-hec-small text-hec-ink-soft">
          “{title}” · {className}
        </p>

        {feedback ? (
          <div className="mt-4 rounded-hec-md border border-hec-line bg-hec-paper p-3 text-left">
            <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft"><Bi k="grade.wrote" /></p>
            <p className="mt-1 whitespace-pre-wrap break-words text-hec-body text-hec-ink">{feedback}</p>
          </div>
        ) : null}

        {more > 0 && (
          <p className="mt-4 text-hec-small text-hec-ink-soft">
            {more === 1 ? <Bi k="grade.moreOne" /> : <Bi k="grade.moreMany" vars={{ n: more }} />}
          </p>
        )}

        <button
          ref={closeRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(BUTTON, "mt-5 w-full bg-hec-action text-hec-on-action hover:bg-hec-action/90", FOCUS)}
        >
          <Bi k="grade.close" />
        </button>
      </motion.div>
    </motion.div>
  );
}
