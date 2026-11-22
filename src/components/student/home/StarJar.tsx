/**
 * "My stars" (docs/EXPERIENCE_DESIGN_BRIEF.md G2): a jar that fills with the child's points as stars. At each level
 * the jar is sealed and put on a shelf, and a new jar begins. The figures are the points summary's: the fill is the
 * level's own progress and the shelf is the number of levels already finished. Stars drop in with weight
 * (the `reward` spring) at motion level "full" only; no sound is played (sound is off by default).
 */
import { motion } from "framer-motion";
import { Bi } from "@/components/student/band/Bi";
import { CARD, CARD_TITLE } from "@/components/student/nova/ivory";
import { reward, stagger, useMotionLevel } from "@/components/fx/motion";

// Where the stars sit in the jar, bottom row first (x, y in the 120 x 150 picture).
const SLOTS: [number, number][] = [
  [40, 128], [60, 130], [80, 128],
  [34, 108], [54, 110], [74, 108], [92, 110],
  [40, 88], [60, 90], [80, 88],
  [46, 68], [66, 70], [84, 68], [56, 50],
];
const STAR = "M0 -9 L2.6 -2.9 9 -2.9 3.9 1.1 5.6 7.6 0 3.8 -5.6 7.6 -3.9 1.1 -9 -2.9 -2.6 -2.9Z";

export function StarJar({ progress, totalXp, level }: { progress: number; totalXp: number; level: number }) {
  const full = useMotionLevel() === "full";
  const count = Math.max(0, Math.min(SLOTS.length, Math.round((progress / 100) * SLOTS.length)));
  const sealed = Math.max(0, Math.min(8, level - 1));
  return (
    <section aria-labelledby="stars-title" className={CARD}>
      <h2 id="stars-title" className={CARD_TITLE}>
        <Bi k="door.stars" />
      </h2>
      <div className="mt-3 flex items-end gap-6">
        <svg viewBox="0 0 120 150" width={120} height={150} role="img" aria-label={String(totalXp)} className="shrink-0">
          <rect x="30" y="8" width="60" height="14" rx="4" className="fill-hec-surface stroke-hec-ink" strokeWidth="2.5" />
          <path
            d="M34 22 C14 34 14 60 14 80 L14 128 C14 142 24 146 36 146 L84 146 C96 146 106 142 106 128 L106 80 C106 60 106 34 86 22Z"
            className="fill-hec-honey stroke-hec-ink"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {SLOTS.slice(0, count).map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <motion.path
                d={STAR}
                className="fill-hec-brass-fill stroke-hec-ink"
                strokeWidth="1.2"
                strokeLinejoin="round"
                initial={full ? { y: -60, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={full ? { ...reward, delay: stagger(i, 0.4) } : { duration: 0 }}
              />
            </g>
          ))}
        </svg>
        <div className="min-w-0 space-y-3">
          <p className="font-sans text-hec-h1 font-bold tabular-nums text-hec-ink">
            <Bi k="stars.count" vars={{ n: totalXp }} />
          </p>
          {sealed > 0 && (
            <div>
              <p className="text-hec-caption text-hec-ink-soft">
                <Bi k="stars.shelf" />
              </p>
              <ul className="mt-1 flex flex-wrap gap-1" aria-hidden>
                {Array.from({ length: sealed }, (_, i) => (
                  <li key={i} className="h-6 w-5 rounded-b-md rounded-t-sm border-2 border-hec-ink border-t-hec-leaf bg-hec-honey" />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
