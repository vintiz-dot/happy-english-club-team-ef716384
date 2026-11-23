/**
 * The moment after homework has been handed in (docs/EXPERIENCE_DESIGN_BRIEF.md G2 to G5, Phase 7 round 1). Shown
 * only AFTER the submit succeeded (the caller sets `show` in the mutation's onSuccess), never on a failed submit and
 * never for the thank-you reaction. It replaces the old generic "Submitted" card and toast; the words are the same
 * for a screen reader (a status region).
 *   early, young  Pip with "Sent to your teacher!", the Vietnamese beneath, up to 1.2 s
 *   junior        an InkCheck and "Sent to your teacher."
 *   teen          the Seal, "Handed in"
 * It blocks taps while it is up (as the card it replaces did, so a second tap cannot send twice), then calls
 * onComplete, which closes the dialog and refetches as before. Calm = fade only; off = a still card.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { InkCheck } from "@/components/fx/InkCheck";
import { showSeal } from "@/components/fx/showSeal";
import { Bi } from "@/components/student/band/Bi";
import { useAgeBand } from "@/hooks/useAgeBand";
import { useCopy } from "@/lib/copy/useCopy";
import { dur, ease, reward, useMotionLevel } from "@/components/fx/motion";

const SHOW_MS = { early: 1200, young: 1200, junior: 1000, teen: 900 } as const;

export function HandInMoment({ show, onComplete }: { show: boolean; onComplete?: () => void }) {
  const { band } = useAgeBand();
  const { en } = useCopy();
  const level = useMotionLevel();
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    if (!show) return;
    if (band === "teen") showSeal(en("handin.teen"));
    const t = window.setTimeout(() => done.current?.(), SHOW_MS[band]);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, band]);

  const key = band === "early" || band === "young" ? "handin.sentExcl" : "handin.sent";
  const still = level === "off";
  const full = level === "full";

  // drawn on the page itself (not inside the dialog, whose transform would move a fixed layer)
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          // teen: no backdrop (the Seal is the moment); the layer stays, transparent, only so a second tap cannot send twice
          className={`fixed inset-0 z-[70] flex items-center justify-center p-4 ${band === "teen" ? "" : "bg-hec-scrim/60"}`}
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={still ? undefined : { opacity: 0 }}
          transition={{ duration: still ? 0 : dur.reveal, ease }}
        >
          {band !== "teen" && (
            <motion.div
              role="status"
              className="flex w-full max-w-xs flex-col items-center gap-3 rounded-hec-lg border border-hec-line bg-hec-raised px-6 py-6 text-center shadow-hec-3"
              initial={still || !full ? false : { y: 12, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              transition={full ? reward : { duration: 0 }}
            >
              {band === "junior" ? (
                <InkCheck size={44} className="text-hec-leaf" />
              ) : (
                <img src="/mascot/pip-happy.svg" width={band === "early" ? 128 : 96} height={band === "early" ? 128 : 96} alt="" draggable={false} className="block select-none" />
              )}
              <p className="font-display text-hec-h2 font-medium text-hec-ink">
                <Bi k={key} />
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
