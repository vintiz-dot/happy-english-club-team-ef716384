/**
 * The level moment (docs/EXPERIENCE_DESIGN_BRIEF.md I3, Phase 9): shown when the child's level, from the points
 * engine the home already reads, is higher than the last level this device saw for this child. The record is the
 * student id and a number, in localStorage. Nothing is computed: the level is the one on the screen already.
 *
 * Today's StudentDashboard had a "level up" overlay whose switch was never turned on anywhere, so there was no
 * trigger to keep; this one is the data-true version of it. A child's first visit only records where they are.
 * One moment per visit: it asks momentGate first, and when another moment holds the slot it waits (nothing is
 * recorded) and plays on a later visit. The form by band is RewardMoment's.
 */
import { useEffect, useState } from "react";
import { RewardMoment } from "@/components/student/RewardMoment";
import { Bi } from "@/components/student/band/Bi";
import { useAgeBand } from "@/hooks/useAgeBand";
import { useCopy } from "@/lib/copy/useCopy";
import { claimMoment } from "@/lib/momentGate";
import { soundManager } from "@/lib/soundManager";

export const levelSeenKey = (studentId: string) => `hec-level-seen:${studentId}`;

function readLevel(studentId: string): number | null {
  try {
    const raw = window.localStorage.getItem(levelSeenKey(studentId));
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeLevel(studentId: string, level: number) {
  try {
    window.localStorage.setItem(levelSeenKey(studentId), String(level));
  } catch {
    /* storage blocked: the moment may play again next visit */
  }
}

function LevelMoment({ level, title, onClose }: { level: number; title?: string; onClose: () => void }) {
  const { band } = useAgeBand();
  const { en } = useCopy();
  useEffect(() => {
    soundManager.play("levelUp");
  }, []);
  return (
    <RewardMoment label={en("level.reached", { level })} onClose={onClose}>
      {band !== "teen" && (
        <p className="text-hec-small text-hec-ink-soft"><Bi k="level.moment" /></p>
      )}
      <p className="mt-2 break-words font-display text-hec-h1 font-medium text-hec-ink">
        <Bi k="level.reached" vars={{ level }} />
      </p>
      {title ? <p className="mt-1 break-words text-hec-small text-hec-ink-soft">{title}</p> : null}
    </RewardMoment>
  );
}

export function LevelGate({ studentId, level, ready, title }: { studentId: string; level: number; ready: boolean; title?: string }) {
  const [shownFor, setShownFor] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !studentId || !Number.isFinite(level) || level < 1) return;
    const seen = readLevel(studentId);
    if (seen === null) {
      writeLevel(studentId, level);
    } else if (level > seen) {
      if (claimMoment("level")) setShownFor(studentId);
    } else if (level < seen) {
      writeLevel(studentId, level); // a corrected figure: follow it, no moment
    }
  }, [ready, studentId, level]);

  if (shownFor !== studentId) return null;
  return (
    <LevelMoment
      level={level}
      title={title}
      onClose={() => {
        writeLevel(studentId, level);
        setShownFor(null);
      }}
    />
  );
}
