/**
 * Has this child moved up a band since they were last here? (docs/EXPERIENCE_DESIGN_BRIEF.md F3)
 *
 * The band changes only on 1 September. The first visit after it does, one moment plays ("the page turns"), and
 * the band and school year are recorded per student id in localStorage so it plays once. The record is the band
 * word and a year, never a name. A child's first visit just records where they are. Look (Playful / Classic)
 * never triggers it: only the band that follows from the date of birth does.
 */
import { useCallback, useEffect, useState } from "react";
import { useAgeBand } from "@/hooks/useAgeBand";

export const bandSeenKey = (studentId: string) => `hec-band-seen:${studentId}`;

interface Seen {
  band: string;
  year: number;
}

function readSeen(id: string): Seen | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(bandSeenKey(id)) ?? "null");
    return parsed && typeof parsed.band === "string" && typeof parsed.year === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writeSeen(id: string, seen: Seen) {
  try {
    window.localStorage.setItem(bandSeenKey(id), JSON.stringify(seen));
  } catch {
    /* storage blocked: the moment may play again next visit */
  }
}

export function useMovingUp(): { due: boolean; done: () => void } {
  const { studentId, natural, schoolYear, banded } = useAgeBand();
  const [due, setDue] = useState(false);

  useEffect(() => {
    setDue(false);
    if (!studentId || !banded || !natural.known) return;
    const seen = readSeen(studentId);
    if (!seen) {
      writeSeen(studentId, { band: natural.band, year: schoolYear });
    } else if (seen.year < schoolYear && seen.band !== natural.band) {
      setDue(true);
    } else if (seen.band !== natural.band || seen.year !== schoolYear) {
      writeSeen(studentId, { band: natural.band, year: schoolYear }); // a corrected date of birth, or the same band in a new year
    }
  }, [studentId, banded, natural.known, natural.band, schoolYear]);

  const done = useCallback(() => {
    if (studentId) writeSeen(studentId, { band: natural.band, year: schoolYear });
    setDue(false);
  }, [studentId, natural.band, schoolYear]);

  return { due, done };
}
