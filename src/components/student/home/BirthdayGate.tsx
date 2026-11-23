/**
 * The birthday (docs/EXPERIENCE_DESIGN_BRIEF.md I3, Phase 9). On the child's own home, when today's day and month
 * in Hanoi are the selected child's own date of birth (the value the age band's caches already hold: no request),
 * once per day per child: Pip with a loving look, "Happy birthday" and the first name, the Vietnamese beneath.
 * Never on a parent's screen (only /student pages are banded), never shown to classmates, nothing is sent anywhere;
 * the record is the student id and the day, in localStorage. Teen: one serif line, and Pip only if the child has
 * switched Pip on. One moment per visit: it asks momentGate first and, when another holds the slot, waits for a
 * later visit that same day (nothing is recorded until it is shown).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bi } from "@/components/student/band/Bi";
import { CARD, BUTTON_QUIET } from "@/components/student/nova/ivory";
import { useAgeBand } from "@/hooks/useAgeBand";
import { dur, ease, reward, useMotionLevel } from "@/components/fx/motion";
import { claimMoment, hidePagePip } from "@/lib/momentGate";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";

export const birthdayKey = (studentId: string) => `hec-birthday:${studentId}`;

const PIP_PX = { early: 120, young: 96, junior: 64, teen: 72 } as const;

export function BirthdayGate({ firstName }: { firstName: string }) {
  const { studentId, dateOfBirth, band, showPip, banded } = useAgeBand();
  const level = useMotionLevel();
  const [shownFor, setShownFor] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !banded || !dateOfBirth || !firstName) return;
    const today = dayjs().tz();
    // the day and month only: the year of birth never matters here
    if (dateOfBirth.slice(5, 10) !== today.format("MM-DD")) return;
    const day = today.format("YYYY-MM-DD");
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(birthdayKey(studentId));
    } catch {
      /* storage blocked: it may show again on the same day */
    }
    if (seen === day) return;
    if (!claimMoment("birthday")) return;
    try {
      window.localStorage.setItem(birthdayKey(studentId), day);
    } catch {
      /* storage blocked */
    }
    setShownFor(studentId);
  }, [studentId, banded, dateOfBirth, firstName]);

  const active = !!studentId && shownFor === studentId;
  const withPip = band !== "teen" || showPip;
  // the card draws its own Pip: the home's Pip steps out while it is up (one Pip per screen)
  useEffect(() => {
    if (active && withPip) return hidePagePip();
    return undefined;
  }, [active, withPip]);

  if (!active || !studentId) return null;

  const full = level === "full";
  const motionProps =
    level === "off"
      ? { initial: false as const, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0 } }
      : full
        ? { initial: { opacity: 0, y: 12, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: reward }
        : { initial: { opacity: 0 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: dur.reveal, ease } };
  const close = (
    <button type="button" onClick={() => setShownFor(null)} className={cn(BUTTON_QUIET, "shrink-0 px-3 text-hec-small text-hec-ink-soft hover:text-hec-ink")}>
      <Bi k="grade.close" />
    </button>
  );

  if (band === "teen") {
    return (
      <motion.div role="status" {...motionProps} className="mb-4 flex items-center gap-3">
        {withPip && <img src="/mascot/pip-loving.svg" width={PIP_PX.teen} height={PIP_PX.teen} alt="" draggable={false} className="block shrink-0 select-none" />}
        <p className="min-w-0 flex-1 break-words font-display text-hec-h2 font-medium text-hec-ink">
          <Bi k="birthday.title" vars={{ name: firstName }} />
        </p>
        {close}
      </motion.div>
    );
  }

  return (
    <motion.section role="status" {...motionProps} className={cn(CARD, "mb-6 flex items-center gap-4")}>
      <img src="/mascot/pip-loving.svg" width={PIP_PX[band]} height={PIP_PX[band]} alt="" draggable={false} className="block shrink-0 select-none" />
      <p className={cn("min-w-0 flex-1 break-words font-display font-medium text-hec-ink", band === "early" ? "text-hec-h1 font-bold" : "text-hec-h2")}>
        <Bi k="birthday.title" vars={{ name: firstName }} />
      </p>
      {close}
    </motion.section>
  );
}
